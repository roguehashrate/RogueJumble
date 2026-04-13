import SecondaryPageLayout from '@/layouts/SecondaryPageLayout'
import { NIP29_GROUP_KINDS } from '@/constants'
import { getDefaultRelayUrls } from '@/lib/relay'
import { normalizeUrl } from '@/lib/url'
import client from '@/services/client.service'
import { useNostr } from '@/providers/NostrProvider'
import { useSecondaryPage } from '@/PageManager'
import { Event, kinds } from 'nostr-tools'
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, Loader2, MessageCircle } from 'lucide-react'
import Image from '@/components/Image'
import UserAvatar from '@/components/UserAvatar'
import { FormattedTimestamp } from '@/components/FormattedTimestamp'
import Username from '@/components/Username'
import Content from '@/components/Content'

type TGroupMessage = {
  event: Event
  content: string
  pubkey: string
  created_at: number
}

const GroupChatPage = forwardRef(
  (
    {
      index,
      relayDomain,
      groupId
    }: {
      index?: number
      relayDomain: string
      groupId: string
    },
    ref
  ) => {
    const { t } = useTranslation()
    const { pop } = useSecondaryPage()
    const { pubkey } = useNostr()
    const [messages, setMessages] = useState<TGroupMessage[]>([])
    const [groupName, setGroupName] = useState<string>('Group')
    const [groupAbout, setGroupAbout] = useState<string>()
    const [groupPicture, setGroupPicture] = useState<string>()
    const [newMessage, setNewMessage] = useState('')
    const [sending, setSending] = useState(false)
    const [loading, setLoading] = useState(true)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // Fetch group metadata and messages
    useEffect(() => {
      const fetchGroupData = async () => {
        setLoading(true)
        try {
          const relayUrls = relayDomain ? [normalizeUrl(relayDomain)] : getDefaultRelayUrls()

          // Fetch group metadata (kind 39000)
          const metadataEvents = await client.fetchEvents(
            relayUrls,
            {
              kinds: [NIP29_GROUP_KINDS.GROUP_METADATA],
              '#d': [groupId],
              limit: 1
            } as any
          )

          if (metadataEvents.length > 0) {
            const metadataEvent = metadataEvents[0]
            metadataEvent.tags.forEach((tag) => {
              const [tagName, tagValue] = tag
              if (tagName === 'name' && tagValue) {
                setGroupName(tagValue)
              } else if (tagName === 'about' && tagValue) {
                setGroupAbout(tagValue)
              } else if (tagName === 'picture' && tagValue) {
                setGroupPicture(tagValue)
              }
            })
          }

          // Fetch group messages (kind 9 with h tag)
          const messageEvents = await client.fetchEvents(
            relayUrls,
            {
              kinds: [NIP29_GROUP_KINDS.GROUP_CHAT_MESSAGE],
              '#h': [groupId],
              limit: 100
            }
          )

          // Sort by creation time
          const sortedMessages = messageEvents
            .map((event: Event) => ({
              event,
              content: event.content,
              pubkey: event.pubkey,
              created_at: event.created_at
            }))
            .sort((a, b) => a.created_at - b.created_at)

          setMessages(sortedMessages)
        } catch (error) {
          console.error('Failed to fetch group data:', error)
        } finally {
          setLoading(false)
        }
      }

      fetchGroupData()
    }, [relayDomain, groupId])

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSendMessage = useCallback(async () => {
      if (!newMessage.trim() || !pubkey || sending) return

      setSending(true)
      try {
        // Create group message event
        const draftEvent = {
          kind: NIP29_GROUP_KINDS.GROUP_CHAT_MESSAGE,
          content: newMessage.trim(),
          tags: [
            ['h', groupId], // Group ID tag (required for NIP-29)
            ...(messages.length > 0
              ? [
                  [
                    'previous',
                    messages[messages.length - 1].event.id.slice(0, 16) // First 16 chars of previous event ID
                  ]
                ]
              : [])
          ],
          created_at: Math.floor(Date.now() / 1000)
        }

        const signedEvent = await client.signAndPublish(draftEvent)

        // Add to local messages immediately
        setMessages((prev) => [
          ...prev,
          {
            event: signedEvent,
            content: signedEvent.content,
            pubkey: signedEvent.pubkey,
            created_at: signedEvent.created_at
          }
        ])

        setNewMessage('')
      } catch (error) {
        console.error('Failed to send message:', error)
      } finally {
        setSending(false)
      }
    }, [newMessage, pubkey, sending, groupId, messages])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSendMessage()
      }
    }

    const groupInitials = groupName
      .split(' ')
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()

    return (
      <SecondaryPageLayout ref={ref} index={index} title={groupName} hideBackButton={false}>
        <div className="flex h-full flex-col">
          {/* Group Header */}
          <div className="flex shrink-0 items-center gap-3 border-b border-border/20 bg-card/50 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
              {groupPicture ? (
                <Image
                  image={{ url: groupPicture, pubkey: '' }}
                  className="size-full object-cover"
                  hideIfError
                />
              ) : (
                <span className="text-sm font-semibold text-primary">{groupInitials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-semibold">{groupName}</h2>
              {groupAbout && (
                <p className="truncate text-xs text-muted-foreground">{groupAbout}</p>
              )}
            </div>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">{t('Loading messages...')}</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircle className="mb-4 size-12 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">{t('No messages yet. Start the conversation!')}</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.event.id}
                  className={`flex gap-2 ${
                    message.pubkey === pubkey ? 'flex-row-reverse' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="shrink-0">
                    <UserAvatar
                      userId={message.pubkey}
                      className="size-8"
                    />
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[70%] rounded-xl px-3 py-2 ${
                      message.pubkey === pubkey
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/30'
                    }`}
                  >
                    {message.pubkey !== pubkey && (
                      <div className="mb-1 flex items-center gap-2">
                        <Username
                          pubkey={message.pubkey}
                          className="text-xs font-semibold"
                        />
                        <FormattedTimestamp
                          timestamp={message.created_at}
                          className="text-[10px] text-muted-foreground"
                        />
                      </div>
                    )}
                    <Content
                      event={message.event}
                      className={`text-sm ${
                        message.pubkey === pubkey ? 'text-primary-foreground' : ''
                      }`}
                    />
                    {message.pubkey === pubkey && (
                      <div className="mt-1 text-right">
                        <FormattedTimestamp
                          timestamp={message.created_at}
                          className="text-[10px] opacity-70"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="shrink-0 border-t border-border/20 bg-card/50 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('Type a message...')}
                rows={1}
                className="flex-1 resize-none rounded-xl border border-border/20 bg-muted/20 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
                disabled={sending}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
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
        </div>
      </SecondaryPageLayout>
    )
  }
)

GroupChatPage.displayName = 'GroupChatPage'
export default GroupChatPage
