import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer'
import { useScreenSize } from '@/providers/ScreenSizeProvider'
import { useNostr } from '@/providers/NostrProvider'
import { NIP29_GROUP_KINDS } from '@/constants'
import client from '@/services/client.service'
import { Dispatch, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Loader2, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useSecondaryPage } from '@/PageManager'
import { toGroupChat } from '@/lib/link'

export default function GroupCreatorDialog({
  open,
  setOpen
}: {
  open: boolean
  setOpen: Dispatch<boolean>
}) {
  const { isSmallScreen } = useScreenSize()
  const { t } = useTranslation()
  const { pubkey } = useNostr()
  const { push } = useSecondaryPage()

  const [groupName, setGroupName] = useState('')
  const [groupAbout, setGroupAbout] = useState('')
  const [groupPicture, setGroupPicture] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [isRestricted, setIsRestricted] = useState(false)
  const [relayUrl, setRelayUrl] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error(t('Group name is required'))
      return
    }

    if (!pubkey) {
      toast.error(t('You must be logged in to create a group'))
      return
    }

    setCreating(true)
    try {
      // Generate a unique group ID
      const groupId = crypto.randomUUID().slice(0, 12)

      // Create group metadata event (kind 39000)
      const draftEvent = {
        kind: NIP29_GROUP_KINDS.GROUP_METADATA,
        content: '',
        tags: [
          ['d', groupId],
          ['name', groupName.trim()],
          ...(groupAbout.trim() ? ['about', groupAbout.trim()] : []),
          ...(groupPicture.trim() ? ['picture', groupPicture.trim()] : []),
          ['private', isPrivate.toString()],
          ['restricted', isRestricted.toString()]
        ],
        created_at: Math.floor(Date.now() / 1000)
      }

      // Sign and publish
      const signedEvent = await client.signAndPublish(draftEvent)

      toast.success(t('Group created successfully!'))
      setOpen(false)

      // Navigate to the new group chat
      push(toGroupChat(relayUrl || 'default', groupId, groupName.trim()))

      // Reset form
      setGroupName('')
      setGroupAbout('')
      setGroupPicture('')
      setIsPrivate(false)
      setIsRestricted(false)
      setRelayUrl('')
    } catch (error) {
      console.error('Failed to create group:', error)
      toast.error(t('Failed to create group. Please try again.'))
    } finally {
      setCreating(false)
    }
  }

  const content = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="group-name">{t('Group Name')} *</Label>
        <Input
          id="group-name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder={t('Enter group name')}
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="group-about">{t('Description')}</Label>
        <Textarea
          id="group-about"
          value={groupAbout}
          onChange={(e) => setGroupAbout(e.target.value)}
          placeholder={t('What is this group about?')}
          maxLength={500}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="group-picture">{t('Picture URL')}</Label>
        <Input
          id="group-picture"
          value={groupPicture}
          onChange={(e) => setGroupPicture(e.target.value)}
          placeholder={t('https://example.com/group.jpg')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="relay-url">{t('Relay URL')}</Label>
        <Input
          id="relay-url"
          value={relayUrl}
          onChange={(e) => setRelayUrl(e.target.value)}
          placeholder={t('wss://relay.example.com (optional)')}
        />
        <p className="text-xs text-muted-foreground">
          {t('The relay where this group will be hosted. Leave empty to use default relays.')}
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>{t('Private Group')}</Label>
            <p className="text-xs text-muted-foreground">
              {t('Only members can see this group')}
            </p>
          </div>
          <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>{t('Restricted')}</Label>
            <p className="text-xs text-muted-foreground">
              {t('Only admins can post to this group')}
            </p>
          </div>
          <Switch checked={isRestricted} onCheckedChange={setIsRestricted} />
        </div>
      </div>
    </div>
  )

  const footer = (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={() => setOpen(false)}
        disabled={creating}
        className="flex-1"
      >
        {t('Cancel')}
      </Button>
      <Button
        onClick={handleCreate}
        disabled={creating || !groupName.trim()}
        className="flex-1"
      >
        {creating ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            {t('Creating...')}
          </>
        ) : (
          <>
            <MessageCircle className="mr-2 size-4" />
            {t('Create Group')}
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
            <DrawerTitle>{t('Create New Group')}</DrawerTitle>
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
          <DialogTitle>{t('Create New Group')}</DialogTitle>
        </DialogHeader>
        {content}
        <DialogFooter className="sm:justify-start">{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
