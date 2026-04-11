import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, LogOut, Shield, Filter } from 'lucide-react'
import { kinds } from 'nostr-tools'
import { getDefaultRelayUrls } from '@/lib/relay'
import client from '@/services/client.service'
import { communityService, TCommunityInfo } from '@/services/community.service'
import { useNostr } from '@/providers/NostrProvider'
import NoteList, { TNoteListRef } from '@/components/NoteList'
import { ExtendedKind } from '@/constants'
import { Button } from '@/components/ui/button'
import ModerationPanel from './ModerationPanel'

export default function MyCommunities() {
  const { t } = useTranslation()
  const { pubkey, publish } = useNostr()
  const [communities, setCommunities] = useState<TCommunityInfo[]>([])
  const [selectedCommunity, setSelectedCommunity] = useState<TCommunityInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [moderateCoordinate, setModerateCoordinate] = useState<string | null>(null)
  const [showOnlyApproved, setShowOnlyApproved] = useState(false)
  const [approvedPostIds, setApprovedPostIds] = useState<Set<string>>(new Set())
  const noteListRef = useMemo(() => {
    const ref = { current: null } as { current: TNoteListRef | null }
    return ref
  }, [])

  useEffect(() => {
    communityService.setPubkey(pubkey)
    const joined = communityService.getJoinedCommunities()
    setCommunities(joined)
    if (joined.length === 1) {
      setSelectedCommunity(joined[0])
    }
    setLoading(false)

    // Refresh community definition events to get updated mod lists
    const refreshCommunityDefs = async () => {
      try {
        const relays = getDefaultRelayUrls()
        const closer = await client.subscribe(
          relays,
          [
            {
              kinds: [kinds.CommunityDefinition],
              authors: [...new Set(joined.map((c) => c.pubkey))],
              limit: joined.length * 10
            }
          ],
          {
            oneose: () => {},
            onevent: (evt) => {
              const evtDTag = evt.tags.find((t) => t[0] === 'd')?.[1]
              if (evtDTag) {
                const matchingJoined = joined.find((c) => c.dTag === evtDTag)
                if (matchingJoined) {
                  // Update the community in storage with fresh data
                  const info = communityService.extractCommunityInfo(evt)
                  communityService.joinCommunity(info)
                  setCommunities(communityService.getJoinedCommunities())
                  setSelectedCommunity((prev) =>
                    prev?.coordinate === info.coordinate ? info : prev
                  )
                }
              }
            }
          }
        )
        setTimeout(() => closer.close(), 10_000)
      } catch (e) {
        console.error('Failed to refresh community definitions:', e)
      }
    }

    if (joined.length > 0) {
      refreshCommunityDefs()
    }
  }, [pubkey])

  // Fetch approval events when a community is selected
  useEffect(() => {
    if (!selectedCommunity) return
    setApprovedPostIds(new Set())

    const fetchApprovals = async () => {
      try {
        const relays = getDefaultRelayUrls()
        const closer = await client.subscribe(
          relays,
          [
            {
              kinds: [ExtendedKind.COMMUNITY_APPROVAL],
              '#a': [selectedCommunity.coordinate],
              limit: 200
            }
          ],
          {
            oneose: () => {},
            onevent: (evt) => {
              if (evt.kind === ExtendedKind.COMMUNITY_APPROVAL) {
                const eTag = evt.tags.find((t) => t[0] === 'e')?.[1]
                if (eTag) {
                  setApprovedPostIds((prev) => new Set(prev).add(eTag))
                }
              }
            }
          }
        )
        setTimeout(() => closer.close(), 15_000)
      } catch (e) {
        console.error('Failed to fetch approvals:', e)
      }
    }

    fetchApprovals()
  }, [selectedCommunity])

  const handleLeave = async () => {
    if (!selectedCommunity) return
    try {
      const { createCommunityLeaveDraftEvent } = await import('@/lib/draft-event')
      const draftEvent = createCommunityLeaveDraftEvent(selectedCommunity.coordinate)
      await publish(draftEvent)
      communityService.leaveCommunity(selectedCommunity.coordinate)
      setSelectedCommunity(null)
      setCommunities(communityService.getJoinedCommunities())
    } catch (e) {
      console.error('Failed to leave community:', e)
    }
  }

  if (loading) {
    return (
      <div className="mx-2 mt-2 rounded-2xl glass-card border-border/20 p-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (communities.length === 0) {
    return (
      <div className="mx-2 mt-2 rounded-2xl glass-card border-border/20 p-4">
        <div className="py-12 text-center text-muted-foreground">
          {t('You haven\'t joined any communities yet.')}
        </div>
      </div>
    )
  }

  if (moderateCoordinate) {
    return (
      <div className="mx-2 mt-2 rounded-2xl glass-card border-border/20 p-4">
        <ModerationPanel
          communityCoordinate={moderateCoordinate}
          onClose={() => setModerateCoordinate(null)}
        />
      </div>
    )
  }

  return (
    <div className="mx-2 mt-2 rounded-2xl glass-card border-border/20 p-4">
      {/* Community selector - horizontally scrollable */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {communities.map((c) => (
          <button
            key={c.coordinate}
            onClick={() => setSelectedCommunity(c)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCommunity?.coordinate === c.coordinate
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'glass-subtle text-muted-foreground hover:bg-muted/60'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Posts from selected community */}
      {selectedCommunity && (
        <div className="space-y-3 pt-3">
          <div className="flex gap-2">
            {communityService.isModerator(selectedCommunity.coordinate) && (
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => setModerateCoordinate(selectedCommunity.coordinate)}
              >
                <Shield className="size-4" />
                {t('Moderate')}
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1 gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleLeave}
            >
              <LogOut className="size-4" />
              {t('Leave')} {selectedCommunity.name}
            </Button>
          </div>

          {approvedPostIds.size > 0 && (
            <Button
              variant={showOnlyApproved ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={() => setShowOnlyApproved(!showOnlyApproved)}
            >
              <Filter className="size-3" />
              {showOnlyApproved ? t('Show all posts') : t('Show approved only')} ({approvedPostIds.size})
            </Button>
          )}

          <NoteList
            ref={noteListRef}
            showKinds={[kinds.CommunityDefinition, ExtendedKind.COMMUNITY_POST]}
            subRequests={[
              {
                filter: {
                  kinds: [ExtendedKind.COMMUNITY_POST],
                  '#a': [selectedCommunity.coordinate],
                  limit: 50
                },
                urls: getDefaultRelayUrls()
              }
            ]}
            hideReplies={false}
          />
        </div>
      )}
    </div>
  )
}
