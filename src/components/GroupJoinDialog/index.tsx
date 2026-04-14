import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer'
import { useScreenSize } from '@/providers/ScreenSizeProvider'
import { useNostr } from '@/providers/NostrProvider'
import { NIP29_GROUP_KINDS } from '@/constants'
import client from '@/services/client.service'
import { getDefaultRelayUrls } from '@/lib/relay'
import { Dispatch, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Globe, Search, Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useSecondaryPage } from '@/PageManager'
import { toGroupChat } from '@/lib/link'

// Known group-supporting relays to auto-search
const GROUP_RELAYS = [
  'wss://groups.0xchat.com/',
  'wss://relay.nos.social/',
  'wss://relay.primal.net/',
  'wss://relay.damus.io/'
]

export default function GroupJoinDialog({
  open,
  setOpen,
  group
}: {
  open: boolean
  setOpen: Dispatch<boolean>
  group?: { id: string; relayUrl?: string; name?: string } | null
}) {
  const { isSmallScreen } = useScreenSize()
  const { t } = useTranslation()
  const { pubkey, publish } = useNostr()
  const { push } = useSecondaryPage()

  const [groupId, setGroupId] = useState(group?.id || '')
  const [searching, setSearching] = useState(false)
  const [joining, setJoining] = useState(false)
  const [foundGroup, setFoundGroup] = useState<{ id: string; name: string; relayUrl: string } | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)

  // Auto-search when dialog opens with a pre-filled group ID
  useEffect(() => {
    if (open && group?.id && !group.relayUrl) {
      handleSearch()
    }
  }, [open])

  const handleSearch = async () => {
    if (!groupId.trim()) {
      setSearchError(t('Please enter a group ID'))
      return
    }

    setSearching(true)
    setSearchError(null)
    setFoundGroup(null)

    try {
      // Try each group relay to find the group
      for (const relay of GROUP_RELAYS) {
        try {
          const metadataEvents = await client.fetchEvents(
            [relay],
            {
              kinds: [NIP29_GROUP_KINDS.GROUP_METADATA],
              '#d': [groupId.trim()],
              limit: 1
            } as any
          )

          if (metadataEvents.length > 0) {
            const metadataEvent = metadataEvents[0]
            let name = groupId
            metadataEvent.tags.forEach((tag) => {
              if (tag[0] === 'name' && tag[1]) {
                name = tag[1]
              }
            })
            setFoundGroup({ id: groupId.trim(), name, relayUrl: relay })
            return
          }
        } catch {
          // Continue to next relay
        }
      }

      setSearchError(t('Group not found on any known group relays. Please check the group ID.'))
    } catch (error) {
      setSearchError(t('Failed to search for group'))
    } finally {
      setSearching(false)
    }
  }

  const handleJoin = async () => {
    if (!foundGroup && !groupId.trim()) {
      toast.error(t('Group ID is required'))
      return
    }

    if (!pubkey) {
      toast.error(t('You must be logged in to join a group'))
      return
    }

    const targetGroup = foundGroup || { id: groupId.trim(), name: groupId.trim(), relayUrl: '' }
    
    setJoining(true)
    try {
      // Add group to user's kind 10009 list
      // Fetch existing list from user's write relays (where it was published)
      const userRelayList = await client.fetchRelayList(pubkey)
      const listFetchRelays = userRelayList.write.length > 0
        ? userRelayList.write.slice(0, 3)
        : getDefaultRelayUrls()
      const groupListEvents = await client.fetchEvents(
        listFetchRelays,
        { kinds: [10009], authors: [pubkey], limit: 1 }
      )

      let existingTags: string[][] = []
      if (groupListEvents.length > 0) {
        existingTags = groupListEvents[0].tags.filter(
          (tag) => tag[0] === 'group' || tag[0] === 'r'
        )
      }

      // Check if already in list
      const alreadyInList = existingTags.some(
        (tag) => tag[0] === 'group' && tag[1] === targetGroup.id
      )

      if (alreadyInList) {
        toast.info(t('You are already a member of this group'))
        const relayDomain = targetGroup.relayUrl.replace(/^wss?:\/\//, '').replace(/\/$/, '')
        push(toGroupChat(relayDomain || 'default', targetGroup.id, targetGroup.name))
        setOpen(false)
        return
      }

      // Create updated group list event
      const newGroupTag = ['group', targetGroup.id, targetGroup.relayUrl || 'default', targetGroup.name]
      const updatedTags = [...existingTags, newGroupTag]

      if (targetGroup.relayUrl) {
        const hasRelayTag = updatedTags.some(
          (tag) => tag[0] === 'r' && tag[1] === targetGroup.relayUrl
        )
        if (!hasRelayTag) {
          updatedTags.push(['r', targetGroup.relayUrl])
        }
      }

      const draftEvent = {
        kind: 10009,
        content: '',
        tags: updatedTags,
        created_at: Math.floor(Date.now() / 1000)
      }

      await publish(draftEvent)

      toast.success(t('Successfully joined the group!'))
      setOpen(false)

      // Navigate to the group chat
      const relayDomain = targetGroup.relayUrl.replace(/^wss?:\/\//, '').replace(/\/$/, '')
      push(toGroupChat(relayDomain || 'default', targetGroup.id, targetGroup.name))

      // Reset form
      setGroupId('')
      setFoundGroup(null)
      setSearchError(null)
    } catch (error) {
      console.error('Failed to join group:', error)
      toast.error(t('Failed to join group. Please try again.'))
    } finally {
      setJoining(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!foundGroup) {
        handleSearch()
      } else {
        handleJoin()
      }
    }
  }

  const content = (
    <div className="space-y-4" onKeyDown={handleKeyDown}>
      <div className="rounded-lg bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Globe className="mt-0.5 size-5 text-primary" />
          <div>
            <h4 className="font-medium">{t('How to join a group')}</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('Enter the group ID. We\'ll automatically search known group relays to find it.')}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="group-id">{t('Group ID')} *</Label>
        <div className="flex gap-2">
          <Input
            id="group-id"
            value={groupId}
            onChange={(e) => {
              setGroupId(e.target.value)
              setFoundGroup(null)
              setSearchError(null)
            }}
            placeholder={t('Enter group ID')}
            disabled={joining || searching}
            className="flex-1"
          />
          {!foundGroup && (
            <Button
              onClick={handleSearch}
              disabled={searching || !groupId.trim()}
              variant="outline"
              size="icon"
            >
              {searching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Search result */}
      {foundGroup && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <Check className="size-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{foundGroup.name}</p>
            <p className="text-xs text-muted-foreground">{foundGroup.relayUrl}</p>
          </div>
        </div>
      )}

      {searchError && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <AlertCircle className="size-5 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{searchError}</p>
        </div>
      )}

      {group && (
        <div className="rounded-lg border border-border/20 bg-muted/20 p-3">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {t('Pre-filled from group card')}
            </span>
          </div>
        </div>
      )}
    </div>
  )

  const footer = (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={() => setOpen(false)}
        disabled={joining || searching}
        className="flex-1"
      >
        {t('Cancel')}
      </Button>
      <Button
        onClick={foundGroup ? handleJoin : handleSearch}
        disabled={joining || searching || !groupId.trim()}
        className="flex-1"
      >
        {joining ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            {t('Joining...')}
          </>
        ) : foundGroup ? (
          <>
            <Check className="mr-2 size-4" />
            {t('Join Group')}
          </>
        ) : (
          <>
            <Search className="mr-2 size-4" />
            {searching ? t('Searching...') : t('Search')}
          </>
        )}
      </Button>
    </div>
  )

  if (isSmallScreen) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{t('Join a Group')}</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-auto p-4">{content}</div>
          <DrawerFooter>{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] w-[520px] overflow-auto">
        <DialogHeader>
          <DialogTitle>{t('Join a Group')}</DialogTitle>
        </DialogHeader>
        {content}
        <DialogFooter className="sm:justify-start">{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
