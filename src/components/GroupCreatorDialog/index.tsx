import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer'
import { useScreenSize } from '@/providers/ScreenSizeProvider'
import { useNostr } from '@/providers/NostrProvider'
import { NIP29_GROUP_KINDS, BIG_RELAY_URLS } from '@/constants'
import client from '@/services/client.service'
import mediaUpload, { UPLOAD_ABORTED_ERROR_MSG } from '@/services/media-upload.service'
import { Dispatch, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Loader2, MessageCircle, Upload, X, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useSecondaryPage } from '@/PageManager'
import { toGroupChat } from '@/lib/link'

const SUGGESTED_RELAYS = [
  { value: 'wss://groups.0xchat.com/', label: '0xChat Groups (Recommended)' },
  { value: 'default', label: 'Default Relays' },
  { value: 'wss://relay.primal.net/', label: 'Primal Relay' },
  { value: 'wss://relay.damus.io/', label: 'Damus Relay' },
  { value: 'wss://nos.lol/', label: 'nos.lol' },
  { value: 'wss://relay.snort.social/', label: 'Snort Relay' },
  { value: 'custom', label: 'Custom Relay...' }
]

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
  const [relaySelection, setRelaySelection] = useState('')
  const [customRelayUrl, setCustomRelayUrl] = useState('')
  const [creating, setCreating] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getRelayUrl = () => {
    if (relaySelection === 'custom') return customRelayUrl
    if (relaySelection === 'default') return ''
    return relaySelection
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setUploadProgress(0)
    try {
      const result = await mediaUpload.upload(file, {
        onProgress: (p) => setUploadProgress(p)
      })
      setGroupPicture(result.url)
      toast.success(t('Image uploaded successfully'))
    } catch (error) {
      const message = (error as Error).message
      if (message !== UPLOAD_ABORTED_ERROR_MSG) {
        toast.error(`Failed to upload image: ${message}`)
      }
    } finally {
      setUploadingImage(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

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
      const relayUrl = getRelayUrl()

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

      // Add to user's group list (kind 10009)
      const groupListEvents = await client.fetchEvents(
        relayUrl ? [relayUrl] : undefined,
        { kinds: [10009], authors: [pubkey], limit: 1 }
      )

      let existingTags: string[][] = []
      if (groupListEvents.length > 0) {
        existingTags = groupListEvents[0].tags.filter(
          (tag) => tag[0] === 'group' || tag[0] === 'r'
        )
      }

      const newGroupTag = ['group', groupId, relayUrl || 'default', groupName.trim()]
      const updatedTags = [...existingTags, newGroupTag]

      if (relayUrl) {
        const hasRelayTag = updatedTags.some(
          (tag) => tag[0] === 'r' && tag[1] === relayUrl
        )
        if (!hasRelayTag) {
          updatedTags.push(['r', relayUrl])
        }
      }

      const listEvent = {
        kind: 10009,
        content: '',
        tags: updatedTags,
        created_at: Math.floor(Date.now() / 1000)
      }

      await client.signAndPublish(listEvent)

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
      setRelaySelection('')
      setCustomRelayUrl('')
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
        <Label>{t('Group Picture')}</Label>
        <div className="flex gap-2">
          {groupPicture ? (
            <div className="relative flex-1">
              <div className="flex items-center gap-2 rounded-lg border border-border/20 bg-muted/20 p-2">
                <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-xs text-muted-foreground">{groupPicture}</span>
                <button
                  onClick={() => setGroupPicture('')}
                  className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/30"
                >
                  <X className="size-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1">
              {uploadingImage ? (
                <div className="flex items-center gap-2 rounded-lg border border-border/20 bg-muted/20 p-3">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  <div className="flex-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">{uploadProgress}%</p>
                  </div>
                </div>
              ) : (
                <Input
                  value={groupPicture}
                  onChange={(e) => setGroupPicture(e.target.value)}
                  placeholder={t('Paste URL or upload an image...')}
                  className="pr-20"
                />
              )}
            </div>
          )}
          {!groupPicture && !uploadingImage && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0"
              >
                <Upload className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="relay-select">{t('Host Relay')}</Label>
        <Select value={relaySelection} onValueChange={setRelaySelection}>
          <SelectTrigger id="relay-select">
            <SelectValue placeholder={t('Select a relay')} />
          </SelectTrigger>
          <SelectContent>
            {SUGGESTED_RELAYS.map((relay) => (
              <SelectItem key={relay.value} value={relay.value}>
                {relay.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {relaySelection === 'custom' && (
          <Input
            value={customRelayUrl}
            onChange={(e) => setCustomRelayUrl(e.target.value)}
            placeholder={t('wss://relay.example.com')}
            className="mt-2"
          />
        )}
        <p className="text-xs text-muted-foreground">
          {t('The relay where this group will be hosted. Default relays are recommended for best availability.')}
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
