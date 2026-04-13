import { useSecondaryPage } from '@/PageManager'
import { haptic } from '@/lib/haptic'
import { useNostr } from '@/providers/NostrProvider'
import { useGroupChatContext } from '@/providers/GroupChatContextProvider'
import { Plus, MessageCircle, Send, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { useTranslation } from 'react-i18next'
import client from '@/services/client.service'
import { NIP29_GROUP_KINDS } from '@/constants'

export default function PostButton() {
  const { checkLogin } = useNostr()
  const { push } = useSecondaryPage()
  const { t } = useTranslation()
  const { groupId, onMessageSent } = useGroupChatContext()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!message.trim() || !groupId || sending) return
    
    setSending(true)
    try {
      const draftEvent = {
        kind: NIP29_GROUP_KINDS.GROUP_CHAT_MESSAGE,
        content: message.trim(),
        tags: [['h', groupId]],
        created_at: Math.floor(Date.now() / 1000)
      }

      await client.signAndPublish(draftEvent)
      setMessage('')
      setDrawerOpen(false)
      onMessageSent()
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSending(false)
    }
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
              <div className="flex gap-2">
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
                  className="flex-1 resize-none rounded-xl border border-border/20 bg-muted/20 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
                  disabled={sending}
                  autoFocus
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || sending}
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50 disabled:pointer-events-none"
                >
                  {sending ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Send className="size-5" />
                  )}
                </button>
              </div>
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
