import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Event, kinds } from 'nostr-tools'
import { Loader2, Plus, Search, Users, Globe } from 'lucide-react'
import client from '@/services/client.service'
import { useNostr } from '@/providers/NostrProvider'
import { communityService } from '@/services/community.service'
import { getDefaultRelayUrls } from '@/lib/relay'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import CommunityCard from '@/components/CommunityCard'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import Image from '@/components/Image'

export default function CommunityDiscovery() {
  const { t } = useTranslation()
  const { pubkey, publish } = useNostr()
  const [communities, setCommunities] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [detailEvent, setDetailEvent] = useState<Event | null>(null)

  // Create community form state
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newImage, setNewImage] = useState('')
  const [newRelays, setNewRelays] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    communityService.setPubkey(pubkey)
  }, [pubkey])

  useEffect(() => {
    const fetchCommunities = async () => {
      setLoading(true)
      try {
        const relays = getDefaultRelayUrls()
        const closer = await client.subscribe(
          relays,
          [{ kinds: [kinds.CommunityDefinition], limit: 50 }],
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
  }, [])

  const filteredCommunities = useMemo(() => {
    if (!searchQuery.trim()) return communities
    const q = searchQuery.toLowerCase()
    return communities.filter((evt) => {
      const name = evt.tags.find((t) => t[0] === 'name')?.[1]?.toLowerCase() ?? ''
      const desc = evt.tags.find((t) => t[0] === 'description')?.[1]?.toLowerCase() ?? ''
      return name.includes(q) || desc.includes(q)
    })
  }, [communities, searchQuery])

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

  const handleCreate = async () => {
    if (!pubkey || !newName.trim()) return
    setCreating(true)
    try {
      const relays = newRelays
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean)
      const { createCommunityDefinitionDraftEvent } = await import('@/lib/draft-event')
      const draftEvent = createCommunityDefinitionDraftEvent(
        newName.trim(),
        newDescription.trim(),
        newImage.trim(),
        relays,
        [pubkey] // Creator is first moderator
      )
      const event = await publish(draftEvent)
      const info = communityService.extractCommunityInfo(event)
      communityService.joinCommunity(info)
      setCreateOpen(false)
      setNewName('')
      setNewDescription('')
      setNewImage('')
      setNewRelays('')
    } catch (e) {
      console.error('Failed to create community:', e)
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <div className="space-y-4 px-4 pt-4 pb-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('Search communities...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="outline" title={t('Create Community')}>
              <Plus className="size-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('Create Community')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('Name')}</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t('Community name...')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Description')}</Label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder={t('What is this community about?')}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Image URL')} ({t('optional')})</Label>
                <Input
                  value={newImage}
                  onChange={(e) => setNewImage(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Relay URLs')} ({t('one per line, optional')})</Label>
                <Textarea
                  value={newRelays}
                  onChange={(e) => setNewRelays(e.target.value)}
                  placeholder={'wss://relay1.example\nwss://relay2.example'}
                  rows={3}
                />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={creating || !newName.trim()}>
                {creating ? t('Creating...') : t('Create Community')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredCommunities.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {searchQuery ? t('No communities found') : t('No communities yet')}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCommunities.map((evt) => (
            <CommunityCard
              key={evt.id}
              event={evt}
              onJoin={() => handleJoin(evt)}
              onClick={() => setDetailEvent(evt)}
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
    <DialogContent className="sm:max-w-md flex flex-col max-h-[80vh]">
      <DialogHeader className="shrink-0">
        <DialogTitle className="flex items-center gap-3">
          {info.image ? (
            <Image
              image={{ url: info.image, pubkey: event.pubkey }}
              className="size-10 shrink-0 rounded-full object-cover"
              classNames={{ wrapper: 'size-10 shrink-0 rounded-full overflow-hidden' }}
            />
          ) : (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
              {info.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="break-all text-base leading-snug">{info.name}</span>
        </DialogTitle>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto space-y-4">
        {info.description && (
          <p className="break-all text-sm text-muted-foreground">{info.description}</p>
        )}

        {info.relays && info.relays.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Globe className="size-4 shrink-0 text-muted-foreground" />
              {t('Relays')}
            </div>
            <div className="space-y-1">
              {info.relays.map((relay, i) => (
                <div key={i} className="rounded bg-muted px-2 py-1.5 text-xs font-mono text-muted-foreground break-all leading-snug">
                  {relay}
                </div>
              ))}
            </div>
          </div>
        )}

        {info.moderators && info.moderators.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="size-4 shrink-0 text-muted-foreground" />
              {t('Moderators')} ({info.moderators.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {info.moderators.map((mod, i) => (
                <div key={i} className="rounded bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">
                  {mod.slice(0, 8)}...{mod.slice(-4)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Button
        className="w-full shrink-0"
        variant={joined ? 'secondary' : 'default'}
        onClick={() => {
          if (!joined) handleJoin()
          onClose()
        }}
      >
        {joined ? t('Joined') : t('Join Community')}
      </Button>
    </DialogContent>
  )
}
