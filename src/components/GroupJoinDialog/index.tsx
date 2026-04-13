import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer'
import { useScreenSize } from '@/providers/ScreenSizeProvider'
import { useNostr } from '@/providers/NostrProvider'
import { NIP29_GROUP_KINDS } from '@/constants'
import client from '@/services/client.service'
import { getDefaultRelayUrls } from '@/lib/relay'
import { normalizeUrl } from '@/lib/url'
import { Dispatch, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Globe, Link } from 'lucide-react'
import { toast } from 'sonner'
import { useSecondaryPage } from '@/PageManager'
import { toGroupChat } from '@/lib/link'
import { TGroupInfo } from '@/components/GroupsFeed'
import { kinds } from 'nostr-tools'

export default function GroupJoinDialog({
  open,
  setOpen,
  group
}: {
  open: boolean
  setOpen: Dispatch<boolean>
  group?: TGroupInfo | null
}) {
  const { isSmallScreen } = useScreenSize()
  const { t } = useTranslation()
  const { pubkey } = useNostr()
  const { push } = useSecondaryPage()

  const [groupId, setGroupId] = useState(group?.id || '')
  const [relayUrl, setRelayUrl] = useState(group?.relayUrl || '')
  const [joining, setJoining] = useState(false)

  const handleJoin = async () => {
    if (!groupId.trim()) {
      toast.error(t('Group ID is required'))
      return
    }

    if (!pubkey) {
      toast.error(t('You must be logged in to join a group'))
      return
    }

    setJoining(true)
    try {
      const normalizedRelayUrl = relayUrl ? normalizeUrl(relayUrl) : getDefaultRelayUrls()[0]
      
      // Fetch group metadata to verify it exists
      const metadataEvents = await client.fetchEvents(
        [normalizedRelayUrl],
        {
          kinds: [NIP29_GROUP_KINDS.GROUP_METADATA],
          '#d': [groupId],
          limit: 1
        } as any
      )

      let groupName = groupId
      let groupAbout: string | undefined
      let groupPicture: string | undefined

      if (metadataEvents.length > 0) {
        const metadataEvent = metadataEvents[0]
        metadataEvent.tags.forEach((tag) => {
          const [tagName, tagValue] = tag
          if (tagName === 'name' && tagValue) {
            groupName = tagValue
          } else if (tagName === 'about' && tagValue) {
            groupAbout = tagValue
          } else if (tagName === 'picture' && tagValue) {
            groupPicture = tagValue
          }
        })
      } else {
        toast.warning(t('Group metadata not found. The group may not exist on this relay.'))
      }

      // Add group to user's kind 10009 list
      const groupListEvents = await client.fetchEvents(
        getDefaultRelayUrls(),
        {
          kinds: [10009],
          authors: [pubkey],
          limit: 1
        }
      )

      let existingTags: string[][] = []
      if (groupListEvents.length > 0) {
        existingTags = groupListEvents[0].tags.filter(
          (tag) => tag[0] === 'group' || tag[0] === 'r'
        )
      }

      // Check if already in list
      const alreadyInList = existingTags.some(
        (tag) => tag[0] === 'group' && tag[1] === groupId && tag[2] === normalizedRelayUrl
      )

      if (alreadyInList) {
        toast.info(t('You are already a member of this group'))
        const relayDomain = normalizedRelayUrl.replace(/^wss?:\/\//, '').replace(/\/$/, '')
        push(toGroupChat(relayDomain, groupId, groupName))
        setOpen(false)
        return
      }

      // Create updated group list event
      const newGroupTag = ['group', groupId, normalizedRelayUrl, groupName]
      const updatedTags = [...existingTags, newGroupTag]

      // Add relay to r tags if not already there
      const hasRelayTag = updatedTags.some(
        (tag) => tag[0] === 'r' && tag[1] === normalizedRelayUrl
      )
      if (!hasRelayTag) {
        updatedTags.push(['r', normalizedRelayUrl])
      }

      const draftEvent = {
        kind: 10009,
        content: '',
        tags: updatedTags,
        created_at: Math.floor(Date.now() / 1000)
      }

      await client.signAndPublish(draftEvent)

      toast.success(t('Successfully joined the group!'))
      setOpen(false)

      // Navigate to the group chat
      const relayDomain = normalizedRelayUrl.replace(/^wss?:\/\//, '').replace(/\/$/, '')
      push(toGroupChat(relayDomain, groupId, groupName))

      // Reset form
      setGroupId('')
      setRelayUrl('')
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
      handleJoin()
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
              {t('Enter the group ID and the relay URL where the group is hosted. You can get this information from the group creator or an invite link.')}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="group-id">{t('Group ID')} *</Label>
        <Input
          id="group-id"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          placeholder={t('Enter group ID')}
          disabled={joining}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="relay-url">{t('Relay URL')}</Label>
        <Input
          id="relay-url"
          value={relayUrl}
          onChange={(e) => setRelayUrl(e.target.value)}
          placeholder={t('wss://relay.example.com')}
          disabled={joining}
        />
        <p className="text-xs text-muted-foreground">
          {t('The relay where the group is hosted. If unsure, try the default relays.')}
        </p>
      </div>

      {group && (
        <div className="rounded-lg border border-border/20 bg-muted/20 p-3">
          <div className="flex items-center gap-2">
            <Link className="size-4 text-muted-foreground" />
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
        disabled={joining}
        className="flex-1"
      >
        {t('Cancel')}
      </Button>
      <Button
        onClick={handleJoin}
        disabled={joining || !groupId.trim()}
        className="flex-1"
      >
        {joining ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            {t('Joining...')}
          </>
        ) : (
          <>
            <Globe className="mr-2 size-4" />
            {t('Join Group')}
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
