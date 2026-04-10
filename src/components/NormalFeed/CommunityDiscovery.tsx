import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Event, kinds } from 'nostr-tools'
import { Loader2, Plus, Search } from 'lucide-react'
import client from '@/services/client.service'
import { useNostr } from '@/providers/NostrProvider'
import { communityService } from '@/services/community.service'
import { SecondaryPageLink } from '@/PageManager'
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

export default function CommunityDiscovery() {
  const { t } = useTranslation()
  const { pubkey, publish } = useNostr()
  const [communities, setCommunities] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  // Create community form state
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newImage, setNewImage] = useState('')
  const [newRelays, setNewRelays] = useState('')
  const [creating, setCreating] = useState(false)

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
      const { createCommunityJoinDraftEvent, createCommunityLeaveDraftEvent } = await import('@/lib/draft-event')
      const draftEvent = communityService.isJoined(info.coordinate)
        ? createCommunityLeaveDraftEvent(info.coordinate)
        : createCommunityJoinDraftEvent(info.coordinate)
      await publish(draftEvent)
      if (communityService.isJoined(info.coordinate)) {
        communityService.leaveCommunity(info.coordinate)
      } else {
        communityService.joinCommunity(info)
      }
    } catch (e) {
      console.error('Failed to join/leave community:', e)
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
          {filteredCommunities.map((evt) => {
            const info = communityService.extractCommunityInfo(evt)
            return (
              <SecondaryPageLink
                key={evt.id}
                to={`/communities/${info.coordinate}`}
              >
                <CommunityCard
                  event={evt}
                  onJoin={() => handleJoin(evt)}
                />
              </SecondaryPageLink>
            )
          })}
        </div>
      )}
    </div>
  )
}
