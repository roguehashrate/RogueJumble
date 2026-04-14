import { useSecondaryPage } from '@/PageManager'
import { haptic } from '@/lib/haptic'
import { useNostr } from '@/providers/NostrProvider'
import { useGroupChatContext } from '@/providers/GroupChatContextProvider'
import { Plus, Send, Loader2, X, Paperclip } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { useTranslation } from 'react-i18next'
import mediaUpload, { UPLOAD_ABORTED_ERROR_MSG } from '@/services/media-upload.service'
import { NIP29_GROUP_KINDS } from '@/constants'
import { getDefaultRelayUrls } from '@/lib/relay'
import { toast } from 'sonner'
import client from '@/services/client.service'
import UserAvatar from '@/components/UserAvatar'
import Username from '@/components/Username'

type TUploadItem = {
  file: File
  url: string | null
  progress: number
  uploading: boolean
  error?: string
  abortController: AbortController
}

type TReplyInfo = {
  eventId: string
  authorPubkey: string
  content: string
  event: any
}

export default function PostButton() {
  const { checkLogin, publish } = useNostr()
  const { push } = useSecondaryPage()
  const { t } = useTranslation()
  const { groupId, relayUrl, onMessageSent } = useGroupChatContext()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [uploads, setUploads] = useState<TUploadItem[]>([])
  const [replyingTo, setReplyingTo] = useState<TReplyInfo | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Expose setReplyingTo to parent via window event
  useEffect(() => {
    const handleSetReply = async (e: Event) => {
      const detail = (e as CustomEvent).detail
      const { eventId, authorPubkey } = detail
      // Fetch the full event
      const event = await client.fetchEvent(eventId)
      if (event) {
        setReplyingTo({
          eventId,
          authorPubkey,
          content: event.content,
          event
        })
        // Open drawer after reply info is ready
        setDrawerOpen(true)
      }
    }
    const handleClearReply = () => {
      setReplyingTo(null)
    }
    window.addEventListener('groupchat-set-reply', handleSetReply)
    window.addEventListener('groupchat-clear-reply', handleClearReply)
    return () => {
      window.removeEventListener('groupchat-set-reply', handleSetReply)
      window.removeEventListener('groupchat-clear-reply', handleClearReply)
    }
  }, [])

  const handleSend = async () => {
    const hasContent = message.trim() || uploads.some((u) => u.url)
    console.log('[PostButton] handleSend called', { hasContent, groupId, relayUrl, messageLength: message.length })
    if (!hasContent) {
      toast.error(t('Message cannot be empty'))
      return
    }
    if (!groupId) {
      toast.error(t('Not in a group chat'))
      return
    }
    if (sending) return

    const uploadingFiles = uploads.filter((u) => u.uploading)
    if (uploadingFiles.length > 0) {
      toast.error(t('Please wait for uploads to finish'))
      return
    }

    setSending(true)
    try {
      const mediaUrls = uploads.filter((u) => u.url).map((u) => u.url!)
      const content = message.trim() + (mediaUrls.length > 0 ? '\n\n' + mediaUrls.join('\n\n') : '')

      const tags: string[][] = [['h', groupId]]
      if (replyingTo) {
        tags.push(['e', replyingTo.eventId, '', 'reply'])
        tags.push(['p', replyingTo.authorPubkey])
      }

      const draftEvent = {
        kind: NIP29_GROUP_KINDS.GROUP_CHAT_MESSAGE,
        content: content.trim(),
        tags,
        created_at: Math.floor(Date.now() / 1000)
      }

      console.log('[PostButton] Publishing with relayUrl:', relayUrl)
      // For group messages, publish to the group relay AND default relays for redundancy
      if (relayUrl) {
        const publishRelays = [relayUrl, ...getDefaultRelayUrls().slice(0, 4)]
        await publish(draftEvent, { specifiedRelayUrls: publishRelays })
      } else {
        await publish(draftEvent)
      }
      console.log('[PostButton] Message published successfully')
      setMessage('')
      setUploads([])
      setReplyingTo(null)
      setDrawerOpen(false)
      onMessageSent()
    } catch (error) {
      console.error('[PostButton] Failed to send message:', error)
      toast.error(t('Failed to send message: ') + (error as Error).message)
    } finally {
      setSending(false)
    }
  }

  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return

    const files = Array.from(event.target.files)
    const newUploads: TUploadItem[] = files.map((file) => ({
      file,
      url: null,
      progress: 0,
      uploading: true,
      abortController: new AbortController()
    }))

    setUploads((prev) => [...prev, ...newUploads])

    for (const upload of newUploads) {
      try {
        const result = await mediaUpload.upload(upload.file, {
          onProgress: (p) => {
            setUploads((prev) =>
              prev.map((u) => (u.file === upload.file ? { ...u, progress: p } : u))
            )
          },
          signal: upload.abortController.signal
        })
        setUploads((prev) =>
          prev.map((u) => (u.file === upload.file ? { ...u, url: result.url, uploading: false } : u))
        )
      } catch (error) {
        const message = (error as Error).message
        if (message !== UPLOAD_ABORTED_ERROR_MSG) {
          setUploads((prev) =>
            prev.map((u) =>
              u.file === upload.file ? { ...u, uploading: false, error: message } : u
            )
          )
          toast.error(`Failed to upload: ${message}`)
        }
      }
    }
  }

  const removeUpload = (file: File) => {
    setUploads((prev) => {
      const upload = prev.find((u) => u.file === file)
      if (upload?.uploading) {
        upload.abortController.abort()
      }
      return prev.filter((u) => u.file !== file)
    })
  }

  const handleClick = () => {
    haptic('click')
    if (groupId) {
      setDrawerOpen(true)
    } else {
      checkLogin(() => push('/compose'))
    }
  }

  const isInGroupChat = !!groupId

  if (isInGroupChat) {
    return (
      <>
        <button
          type="button"
          className="group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-primary-foreground outline-none transition-all duration-200 hover:scale-105"
          style={{
            WebkitTapHighlightColor: 'transparent',
            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-hover)))',
            boxShadow: '0 2px 12px hsl(var(--primary) / 0.35)',
            outline: 'none'
          }}
          onClick={handleClick}
        >
          <Send className="relative z-10 size-5 transition-transform duration-200 group-hover:scale-110" />
        </button>
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="max-h-[85vh] border-t border-border/20 bg-card/90 backdrop-blur-xl">
            <div className="flex flex-col gap-4 overflow-auto p-4">
              <h3 className="text-center text-lg font-semibold">{t('Send Message')}</h3>

              {/* Upload previews */}
              {uploads.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {uploads.map((upload, idx) => (
                    <div key={idx} className="relative rounded-lg border border-border/20 overflow-hidden bg-muted/20">
                      {upload.url ? (
                        <>
                          <img
                            src={upload.url}
                            alt={upload.file.name}
                            className="aspect-square w-full object-cover"
                          />
                          <button
                            onClick={() => removeUpload(upload.file)}
                            className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                          >
                            <X className="size-3" />
                          </button>
                        </>
                      ) : upload.error ? (
                        <div className="flex aspect-square items-center justify-center p-2 text-center text-xs text-destructive">
                          {upload.error}
                          <button
                            onClick={() => removeUpload(upload.file)}
                            className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex aspect-square flex-col items-center justify-center gap-2 p-2">
                          <Loader2 className="size-6 animate-spin text-muted-foreground" />
                          <div className="w-full">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${upload.progress}%` }}
                              />
                            </div>
                            <p className="mt-1 truncate text-[10px] text-muted-foreground">
                              {upload.file.name}
                            </p>
                          </div>
                          <button
                            onClick={() => removeUpload(upload.file)}
                            className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Reply preview */}
              {replyingTo && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 pl-3 pr-2 py-2">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 h-5 w-0.5 shrink-0 rounded-full bg-primary/50" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <UserAvatar userId={replyingTo.authorPubkey} className="size-4" />
                        <Username
                          userId={replyingTo.authorPubkey}
                          className="text-xs font-semibold"
                          withoutSkeleton
                        />
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {replyingTo.content}
                      </p>
                    </div>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Message input with attach button */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder={t('Type a message...')}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-border/20 bg-muted/20 px-3 py-2 pr-10 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
                    disabled={sending}
                    autoFocus
                  />
                  <button
                    onClick={handleFileSelect}
                    className="absolute bottom-2 right-2 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-primary"
                    type="button"
                  >
                    <Paperclip className="size-4" />
                  </button>
                </div>
                <button
                  onClick={handleSend}
                  disabled={(!message.trim() && uploads.every((u) => !u.url)) || sending || uploads.some((u) => u.uploading)}
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50 disabled:pointer-events-none"
                >
                  {sending ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Send className="size-5" />
                  )}
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                accept="image/*,video/*"
                multiple
              />
            </div>
          </DrawerContent>
        </Drawer>
      </>
    )
  }

  return (
    <button
      type="button"
      className="group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-primary-foreground outline-none transition-all duration-200 hover:scale-105"
      style={{
        WebkitTapHighlightColor: 'transparent',
        background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-hover)))',
        boxShadow: '0 2px 12px hsl(var(--primary) / 0.35)',
        outline: 'none'
      }}
      onClick={() => {
        checkLogin(() => {
          haptic('click')
          push('/compose')
        })
      }}
    >
      <Plus className="relative z-10 size-5 transition-transform duration-200 group-hover:rotate-90" />
    </button>
  )
}
