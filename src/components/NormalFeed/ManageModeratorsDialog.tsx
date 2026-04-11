import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Event } from 'nostr-tools'
import { X, UserPlus, Search, Check } from 'lucide-react'
import client from '@/services/client.service'
import { communityService } from '@/services/community.service'
import { useNostr } from '@/providers/NostrProvider'
import { getDefaultRelayUrls } from '@/lib/relay'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatError } from '@/lib/error'

type TModeratorTab = 'current' | 'add'

export default function ManageModeratorsDialog({
  event,
  open,
  onOpenChange
}: {
  event: Event | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const { pubkey, publish } = useNostr()
  const [activeTab, setActiveTab] = useState<TModeratorTab>('current')
  const [currentMods, setCurrentMods] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchProfiles, setSearchProfiles] = useState<Event[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedPubkey, setSelectedPubkey] = useState<string>('')

  useEffect(() => {
    if (event && open) {
      const info = communityService.extractCommunityInfo(event)
      setCurrentMods(info.moderators ?? [])
      setActiveTab('current')
      setSearchQuery('')
      setSelectedPubkey('')
      setSearchProfiles([])
    }
  }, [event, open])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearchProfiles([])

    try {
      const trimmed = searchQuery.trim()

      if (trimmed.startsWith('npub1')) {
        try {
          const { decode } = await import('nostr-tools/nip19')
          const decoded = decode(trimmed)
          if (decoded.type === 'npub') {
            setSearchProfiles([{ pubkey: decoded.data, content: '{}', tags: [], created_at: 0, kind: 0, id: '', sig: '' } as unknown as Event])
            setSearching(false)
            return
          }
        } catch { /* skip */ }
      } else if (/^[a-f0-9]{64}$/.test(trimmed)) {
        setSearchProfiles([{ pubkey: trimmed, content: '{}', tags: [], created_at: 0, kind: 0, id: '', sig: '' } as unknown as Event])
        setSearching(false)
        return
      }

      const relays = getDefaultRelayUrls()
      const closer = await client.subscribe(
        relays,
        [{ kinds: [0], limit: 20 }],
        {
          oneose: () => {},
          onevent: (evt) => {
            try {
              const content = JSON.parse(evt.content)
              const name = content.name?.toLowerCase() ?? ''
              const displayName = content.display_name?.toLowerCase() ?? ''
              const query = trimmed.toLowerCase()
              if (name.includes(query) || displayName.includes(query) || trimmed === evt.pubkey) {
                setSearchProfiles((prev) => {
                  if (prev.some((p) => p.pubkey === evt.pubkey)) return prev
                  return [...prev, evt]
                })
              }
            } catch { /* skip */ }
          }
        }
      )
      setTimeout(() => closer.close(), 8_000)
    } catch (e) {
      console.error('Failed to search profiles:', e)
    } finally {
      setSearching(false)
    }
  }

  const handleAddModerator = () => {
    if (!selectedPubkey) return
    if (currentMods.includes(selectedPubkey)) {
      toast.warning(t('Already a moderator'))
      return
    }
    setCurrentMods((prev) => [...prev, selectedPubkey])
    setSelectedPubkey('')
    setSearchQuery('')
    setSearchProfiles([])
  }

  const handleRemoveModerator = (pk: string) => {
    setCurrentMods((prev) => prev.filter((m) => m !== pk))
  }

  const handleSave = async () => {
    if (!event || !pubkey) return
    setSaving(true)
    try {
      const info = communityService.extractCommunityInfo(event)
      const { createCommunityDefinitionDraftEvent } = await import('@/lib/draft-event')
      const draftEvent = createCommunityDefinitionDraftEvent(
        info.name,
        info.description ?? '',
        info.image ?? '',
        info.relays ?? [],
        currentMods
      )
      await publish(draftEvent)
      onOpenChange(false)
      toast.success(t('Moderators updated'))
    } catch (error) {
      const errors = formatError(error)
      errors.forEach((err) => {
        toast.error(`${t('Failed to update moderators')}: ${err}`, { duration: 10_000 })
      })
    } finally {
      setSaving(false)
    }
  }

  if (!event) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Manage Moderators')}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TModeratorTab)}>
          <TabsList className="w-full">
            <TabsTrigger value="current" className="flex-1">
              {t('Current')} ({currentMods.length})
            </TabsTrigger>
            <TabsTrigger value="add" className="flex-1">
              {t('Add Moderator')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === 'current' && (
          <div className="space-y-3">
            {currentMods.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t('No moderators yet')}
              </p>
            ) : (
              <div className="space-y-2">
                {currentMods.map((pk) => (
                  <div
                    key={pk}
                    className="flex items-center justify-between rounded-lg border bg-card px-3 py-2"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {pk.slice(0, 2)}
                      </div>
                      <code className="truncate text-xs text-muted-foreground">
                        {pk.slice(0, 8)}...{pk.slice(-4)}
                      </code>
                      {pk === pubkey && (
                        <Badge variant="secondary" className="text-[10px]">
                          {t('Owner')}
                        </Badge>
                      )}
                    </div>
                    {pk !== pubkey && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 shrink-0 text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveModerator(pk)}
                      >
                        <X className="mr-1 size-3" />
                        {t('Remove')}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'add' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('Search by name or pubkey...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9"
                />
              </div>
              <Button size="sm" onClick={handleSearch} disabled={searching}>
                {searching ? '...' : t('Search')}
              </Button>
            </div>

            {selectedPubkey && (
              <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
                <Check className="size-4 text-primary" />
                <code className="truncate text-xs text-muted-foreground">
                  {selectedPubkey.slice(0, 8)}...{selectedPubkey.slice(-4)}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7 shrink-0"
                  onClick={() => setSelectedPubkey('')}
                >
                  <X className="size-3" />
                </Button>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleAddModerator}
              disabled={!selectedPubkey}
            >
              <UserPlus className="mr-2 size-4" />
              {t('Add to Moderators')}
            </Button>

            {searchProfiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('Search Results')}
                </p>
                {searchProfiles.map((profile) => {
                  let content: { name?: string; display_name?: string } = {}
                  try { content = JSON.parse(profile.content) } catch { /* skip */ }
                  return (
                    <button
                      key={profile.pubkey}
                      onClick={() => setSelectedPubkey(profile.pubkey)}
                      className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                        selectedPubkey === profile.pubkey
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/60'
                      }`}
                    >
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {profile.pubkey.slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {content.display_name || content.name || profile.pubkey.slice(0, 12)}
                        </div>
                        <div className="truncate text-[10px] text-muted-foreground">
                          {profile.pubkey.slice(0, 8)}...{profile.pubkey.slice(-4)}
                        </div>
                      </div>
                      {selectedPubkey === profile.pubkey && (
                        <Check className="size-4 text-primary shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'current' && currentMods.length > 0 && (
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? t('Saving...') : t('Save Changes')}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
