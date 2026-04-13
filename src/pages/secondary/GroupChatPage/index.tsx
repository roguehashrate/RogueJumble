import SecondaryPageLayout from '@/layouts/SecondaryPageLayout'
import { NIP29_GROUP_KINDS } from '@/constants'
import { getDefaultRelayUrls } from '@/lib/relay'
import { normalizeUrl } from '@/lib/url'
import client from '@/services/client.service'
import { useNostr } from '@/providers/NostrProvider'
import { useGroupChatContext } from '@/providers/GroupChatContextProvider'
import { useSecondaryPage } from '@/PageManager'
import { Event, kinds } from 'nostr-tools'
import { forwardRef, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, MessageCircle } from 'lucide-react'
import Image from '@/components/Image'
import UserAvatar from '@/components/UserAvatar'
import { FormattedTimestamp } from '@/components/FormattedTimestamp'
import { useFetchProfile } from '@/hooks'
import { toProfile } from '@/lib/link'
import { SecondaryPageLink } from '@/PageManager'
import Content from '@/components/Content'

// Derive a consistent HSL color from a pubkey
function deriveColorFromPubkey(pubkey: string): string {
  let hash = 0
  for (let i = 0; i < pubkey.length; i++) {
    hash = pubkey.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 70%, 65%)`
}

// Get a short display name from pubkey
function getShortName(pubkey: string): string {
  return pubkey.slice(0, 8)
}

// Colored username component that always shows
function ColoredUsername({ pubkey }: { pubkey: string }) {
  const { profile } = useFetchProfile(pubkey)
  const displayName = profile?.username || getShortName(pubkey)
  const color = deriveColorFromPubkey(pubkey)

  return (
    <SecondaryPageLink
      to={toProfile(pubkey)}
      className="cursor-pointer hover:underline"
      style={{ color }}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="text-xs font-semibold" style={{ color }}>{displayName}</span>
    </SecondaryPageLink>
  )
}

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
    const { registerGroupChat, unregisterGroupChat, refreshMessages } = useGroupChatContext()
    const [messages, setMessages] = useState<TGroupMessage[]>([])
    const [groupName, setGroupName] = useState<string>('Group')
    const [groupAbout, setGroupAbout] = useState<string>()
    const [groupPicture, setGroupPicture] = useState<string>()
    const [loading, setLoading] = useState(true)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const hasScrolledOnLoadRef = useRef(false)

    // Register this group chat with the context
    useEffect(() => {
      registerGroupChat(groupId)
      return () => unregisterGroupChat()
    }, [groupId, registerGroupChat, unregisterGroupChat])

    // Refresh messages when a new message is sent from the PostButton
    useEffect(() => {
      if (refreshMessages > 0) {
        // Re-fetch messages to include the new one
        const fetchNewMessages = async () => {
          try {
            const relayUrls = relayDomain ? [normalizeUrl(relayDomain)] : getDefaultRelayUrls()
            const messageEvents = await client.fetchEvents(
              relayUrls,
              {
                kinds: [NIP29_GROUP_KINDS.GROUP_CHAT_MESSAGE],
                '#h': [groupId],
                limit: 100
              }
            )
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
            console.error('Failed to refresh messages:', error)
          }
        }
        fetchNewMessages()
      }
    }, [refreshMessages])

    // Fetch group metadata and messages
    useEffect(() => {
      const fetchGroupData = async () => {
        setLoading(true)
        hasScrolledOnLoadRef.current = false
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

    // Scroll to bottom on initial load (instant)
    useEffect(() => {
      if (!loading && messages.length > 0 && !hasScrolledOnLoadRef.current) {
        hasScrolledOnLoadRef.current = true
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' })
        })
      }
    }, [loading, messages.length])

    // Scroll to bottom smoothly when new messages arrive
    useEffect(() => {
      if (hasScrolledOnLoadRef.current && messages.length > 0) {
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
        })
      }
    }, [messages.length])

    const groupInitials = groupName
      .split(' ')
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()

    return (
      <SecondaryPageLayout ref={ref} index={index} title={groupName} hideBackButton={false}>
        <div className="flex h-full flex-col pb-20">
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
                        ? 'bg-primary/30 text-white backdrop-blur-sm'
                        : 'bg-muted/20'
                    }`}
                  >
                    <div className={`mb-1 flex items-center gap-1 ${message.pubkey === pubkey ? 'justify-end' : ''}`}>
                      <ColoredUsername pubkey={message.pubkey} />
                      <span className={message.pubkey === pubkey ? 'text-white/50' : 'text-muted-foreground'}>&bull;</span>
                      <FormattedTimestamp
                        timestamp={message.created_at}
                        className={`text-[10px] ${
                          message.pubkey === pubkey ? 'text-white/50' : 'text-muted-foreground'
                        }`}
                      />
                    </div>
                    <Content
                      event={message.event}
                      className="text-sm text-white"
                    />
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </SecondaryPageLayout>
    )
  }
)

GroupChatPage.displayName = 'GroupChatPage'
export default GroupChatPage
