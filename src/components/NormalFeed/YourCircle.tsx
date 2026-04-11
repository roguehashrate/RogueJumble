import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Event, kinds } from 'nostr-tools'
import { Loader2, Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Globe, Users } from 'lucide-react'
import Image from '@/components/Image'
import client from '@/services/client.service'
import { communityService } from '@/services/community.service'
import { useNostr } from '@/providers/NostrProvider'
import { useFollowList } from '@/providers/FollowListProvider'
import { getDefaultRelayUrls } from '@/lib/relay'
import CommunityCard from '@/components/CommunityCard'
import ModerationPanel from './ModerationPanel'

export default function YourCircle() {
  const { t } = useTranslation()
  const { pubkey, publish } = useNostr()
  const { followingSet } = useFollowList()
  const [communities, setCommunities] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [detailEvent, setDetailEvent] = useState<Event | null>(null)
  const [moderateCoordinate, setModerateCoordinate] = useState<string | null>(null)

  useEffect(() => {
    communityService.setPubkey(pubkey)
  }, [pubkey])

  useEffect(() => {
    if (followingSet.size === 0) {
      setLoading(false)
      return
    }

    const fetchCommunities = async () => {
      setLoading(true)
      try {
        const relays = getDefaultRelayUrls()

        // Fetch all community definitions
        const closer = await client.subscribe(
          relays,
          [{ kinds: [kinds.CommunityDefinition], limit: 100 }],
          {
            oneose: () => {},
            onevent: (evt) => {
              setCommunities((prev) => {
                const dTag = evt.tags.find((t) => t[0] === 'd')?.[1]
                if (dTag && !prev.some((e) => e.tags.find((t) => t[0] === 'd')?.[1] === dTag)) {
                  return [...prev, evt]
                }
                return prev
              })
            }
          }
        )
        setTimeout(() => closer.close(), 10_000)
      } catch (e) {
        console.error('Failed to fetch communities:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchCommunities()
  }, [followingSet])

  // Filter communities where followed users are moderators
  const circleCommunities = useMemo(() => {
    return communities.filter((evt) => {
      const mods = evt.tags
        .filter((t) => t[0] === 'moderators')
        .map((t) => t[1])
        .filter(Boolean)
      return mods.some((modPubkey) => followingSet.has(modPubkey))
    })
  }, [communities, followingSet])

  // Get count of followed users in each community
  const followedUserCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    circleCommunities.forEach((evt) => {
      const mods = evt.tags
        .filter((t) => t[0] === 'moderators')
        .map((t) => t[1])
        .filter(Boolean)
      counts[evt.id] = mods.filter((m) => followingSet.has(m)).length
    })
    return counts
  }, [circleCommunities, followingSet])

  const filteredCommunities = useMemo(() => {
    if (!searchQuery.trim()) return circleCommunities
    const q = searchQuery.toLowerCase()
    return circleCommunities.filter((evt) => {
      const name = evt.tags.find((t) => t[0] === 'name')?.[1]?.toLowerCase() ?? ''
      const desc = evt.tags.find((t) => t[0] === 'description')?.[1]?.toLowerCase() ?? ''
      return name.includes(q) || desc.includes(q)
    })
  }, [circleCommunities, searchQuery])

  const handleJoin = async (event: Event) => {
    if (!pubkey) return
    const info = communityService.extractCommunityInfo(event)
    try {
      const { createCommunityJoinDraftEvent } = await import('@/lib/draft-event')
      const draftEvent = createCommunityJoinDraftEvent(info.coordinate)
      await publish(draftEvent)
      communityService.joinCommunity(info)
    } catch (e) {
      console.error('Failed to join community:', e)
    }
  }

  if (followingSet.size === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        {t('Follow people to see which communities they\'re in')}
      </div>
    )
  }

  if (moderateCoordinate) {
    return (
      <div className="px-4 pt-4 pb-4">
        <ModerationPanel
          communityCoordinate={moderateCoordinate}
          onClose={() => setModerateCoordinate(null)}
        />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4 px-4 pt-4 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('Search communities...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCommunities.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {searchQuery
              ? t('No communities found')
              : t('None of the people you follow are moderators of any communities yet')}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCommunities.map((evt) => (
              <CommunityCard
                key={evt.id}
                event={evt}
                onJoin={() => handleJoin(evt)}
                onClick={() => setDetailEvent(evt)}
                badge={
                  followedUserCounts[evt.id] > 0
                    ? `${followedUserCounts[evt.id]} ${followedUserCounts[evt.id] === 1 ? t('person you follow') : t('people you follow')}`
                    : undefined
                }
                onModerate={() => {
                  const info = communityService.extractCommunityInfo(evt)
                  setModerateCoordinate(info.coordinate)
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Community Detail Dialog */}
      <Dialog open={!!detailEvent} onOpenChange={(open) => !open && setDetailEvent(null)}>
        {detailEvent && <CommunityDetailDialog event={detailEvent} onClose={() => setDetailEvent(null)} />}
      </Dialog>
    </>
  )
}

function CommunityDetailDialog({ event, onClose }: { event: Event; onClose: () => void }) {
  const { t } = useTranslation()
  const { publish } = useNostr()
  const info = useMemo(() => communityService.extractCommunityInfo(event), [event])
  const joined = communityService.isJoined(info.coordinate)

  const handleJoin = async () => {
    try {
      const { createCommunityJoinDraftEvent } = await import('@/lib/draft-event')
      const draftEvent = createCommunityJoinDraftEvent(info.coordinate)
      await publish(draftEvent)
      communityService.joinCommunity(info)
    } catch (e) {
      console.error('Failed to join community:', e)
    }
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          {info.image ? (
            <Image
              image={{ url: info.image, pubkey: event.pubkey }}
              className="size-12 rounded-full object-cover"
              classNames={{ wrapper: 'size-12 shrink-0 rounded-full overflow-hidden' }}
            />
          ) : (
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {info.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="truncate">{info.name}</span>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {info.description && (
          <p className="text-sm text-muted-foreground">{info.description}</p>
        )}

        {info.relays && info.relays.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Globe className="size-4 text-muted-foreground" />
              {t('Relays')}
            </div>
            <div className="flex flex-col gap-1">
              {info.relays.map((relay, i) => (
                <div key={i} className="truncate text-xs text-muted-foreground">{relay}</div>
              ))}
            </div>
          </div>
        )}

        {info.moderators && info.moderators.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="size-4 text-muted-foreground" />
              {t('Moderators')} ({info.moderators.length})
            </div>
          </div>
        )}

        <Button
          className="w-full"
          variant={joined ? 'secondary' : 'default'}
          onClick={() => {
            if (!joined) handleJoin()
            onClose()
          }}
        >
          {joined ? t('Joined') : t('Join Community')}
        </Button>
      </div>
    </DialogContent>
  )
}
