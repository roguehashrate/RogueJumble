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
import { Loader2, MessageCircle, LogOut, MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import Image from '@/components/Image'
import UserAvatar from '@/components/UserAvatar'
import { FormattedTimestamp } from '@/components/FormattedTimestamp'
import { useFetchProfile } from '@/hooks'
import { toProfile } from '@/lib/link'
import { SecondaryPageLink } from '@/PageManager'
import Content from '@/components/Content'
import MessageActions from '@/components/GroupChat/MessageActions'
import { ReactionPills } from '@/components/GroupChat/ReactionPills'
import type { TGroupMessage as TGroupMessageType } from '@/components/GroupChat/MessageActions'
import ZapDialog from '@/components/ZapDialog'
import EmojiPicker from '@/components/EmojiPicker'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

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
    <SecondaryPageLink to={toProfile(pubkey)} onClick={(e) => e.stopPropagation()}>
      <span className="cursor-pointer text-xs font-semibold hover:underline" style={{ color }}>
        {displayName}
      </span>
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
    const { pubkey, publish } = useNostr()
    const { registerGroupChat, unregisterGroupChat } = useGroupChatContext()
    const [messages, setMessages] = useState<TGroupMessage[]>([])
    const [groupName, setGroupName] = useState<string>('Group')
    const [groupAbout, setGroupAbout] = useState<string>()
    const [groupPicture, setGroupPicture] = useState<string>()
    const [loading, setLoading] = useState(true)
    const [zapTarget, setZapTarget] = useState<TGroupMessageType | null>(null)
    const [reactTarget, setReactTarget] = useState<TGroupMessageType | null>(null)
    const [reactions, setReactions] = useState<
      Map<string, { emoji: string; pubkey: string; eventId: string }[]>
    >(new Map())
    const [repliedEvents, setRepliedEvents] = useState<
      Map<string, { event: Event; pubkey: string }>
    >(new Map())
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const hasScrolledOnLoadRef = useRef(false)
    const messagesRef = useRef<TGroupMessage[]>([])
    messagesRef.current = messages

    // Register this group chat with the context
    useEffect(() => {
      const normalizedRelay = relayDomain ? normalizeUrl(relayDomain) : null
      if (normalizedRelay) {
        registerGroupChat(groupId, normalizedRelay)
      }
      return () => {
        unregisterGroupChat()
      }
    }, [groupId, relayDomain, registerGroupChat, unregisterGroupChat])

    const handleLeaveGroup = async () => {
      if (!pubkey) return
      try {
        const draftEvent = {
          kind: NIP29_GROUP_KINDS.GROUP_LEAVE_REQUEST,
          content: '',
          tags: [['h', groupId]],
          created_at: Math.floor(Date.now() / 1000)
        }
        await publish(draftEvent)

        const groupListEvents = await client.fetchEvents(getDefaultRelayUrls(), {
          kinds: [10009],
          authors: [pubkey],
          limit: 1
        })

        if (groupListEvents.length > 0) {
          const existingTags = groupListEvents[0].tags.filter(
            (tag) => tag[0] !== 'group' || tag[1] !== groupId
          )
          const updatedEvent = {
            kind: 10009,
            content: '',
            tags: existingTags,
            created_at: Math.floor(Date.now() / 1000)
          }
          await publish(updatedEvent)
        }

        toast.success(t('Left the group'))
        pop()
      } catch (error) {
        console.error('Failed to leave group:', error)
        toast.error(t('Failed to leave group'))
      }
    }

    const handleReply = (message: TGroupMessageType) => {
      window.dispatchEvent(
        new CustomEvent('groupchat-set-reply', {
          detail: {
            eventId: message.event.id,
            authorPubkey: message.pubkey
          }
        })
      )
      window.dispatchEvent(new CustomEvent('groupchat-open-drawer'))
    }

    const handleReact = (message: TGroupMessageType) => {
      setReactTarget(message)
    }

    const handleToggleReaction = async (messageId: string, emoji: string) => {
      if (!pubkey) return
      const msgReactions = reactions.get(messageId) || []
      const existingReaction = msgReactions.find((r) => r.pubkey === pubkey && r.emoji === emoji)
      if (existingReaction) {
        const draftEvent = {
          kind: kinds.Reaction,
          content: '',
          tags: [
            ['e', existingReaction.eventId],
            ['p', pubkey]
          ] as [string, string][],
          created_at: Math.floor(Date.now() / 1000)
        }
        await publish(draftEvent)
        setReactions((prev) => {
          const newMap = new Map(prev)
          const newReactions = newMap.get(messageId) || []
          newMap.set(
            messageId,
            newReactions.filter((r) => r.eventId !== existingReaction.eventId)
          )
          return newMap
        })
      } else {
        const draftEvent = {
          kind: kinds.Reaction,
          content: emoji,
          tags: [['e', messageId]] as [string, string][],
          created_at: Math.floor(Date.now() / 1000)
        }
        await publish(draftEvent)
      }
    }

    const handleEmojiSelect = async (
      emoji: string | { shortcode: string; url: string } | undefined
    ) => {
      if (!reactTarget || !emoji) return
      let emojiContent: string
      const tags: string[][] = [
        ['e', reactTarget.event.id],
        ['p', reactTarget.pubkey]
      ]
      if (typeof emoji === 'string') {
        emojiContent = emoji
      } else {
        emojiContent = `:${emoji.shortcode}:`
        tags.push(['emoji', emoji.shortcode, emoji.url])
      }
      try {
        const draftEvent = {
          kind: kinds.Reaction,
          content: emojiContent,
          tags,
          created_at: Math.floor(Date.now() / 1000)
        }
        await publish(draftEvent)
        toast.success(t('Reacted with {{emoji}}', { emoji: emojiContent }))
        setReactTarget(null)
      } catch (error) {
        console.error('Failed to react:', error)
        toast.error(t('Failed to react'))
      }
    }

    const handleZap = (message: TGroupMessageType) => {
      setZapTarget(message)
    }

    // Fetch initial messages + subscribe to live updates
    useEffect(() => {
      const relayUrls = relayDomain ? [normalizeUrl(relayDomain)] : getDefaultRelayUrls()
      let isMounted = true

      const init = async () => {
        try {
          const messageEvents = await client.fetchEvents(relayUrls, {
            kinds: [NIP29_GROUP_KINDS.GROUP_CHAT_MESSAGE, 10], // kind 9 = chat, kind 10 = threaded reply
            '#h': [groupId],
            limit: 100
          })

          if (isMounted) {
            const sortedMessages = messageEvents
              .map((event: Event) => ({
                event,
                content: event.content,
                pubkey: event.pubkey,
                created_at: event.created_at
              }))
              .sort((a, b) => a.created_at - b.created_at)

            setMessages(sortedMessages)
            setLoading(false)

            // Fetch replied events for initial messages + also check p tags for replies
            const newRepliedMap = new Map<string, { event: Event; pubkey: string }>()

            for (const msg of sortedMessages) {
              // Check for "e" tags - NIP-10 can have multiple (root + reply markers)
              const eTags = msg.event.tags.filter((t: string[]) => t[0] === 'e')
              const pTag = msg.event.tags.find((t: string[]) => t[0] === 'p')

              let foundReply = false

              // Try each e-tag to find a message we already have
              for (const eTag of eTags) {
                const repliedId = eTag[1]
                if (!repliedId) continue

                const originalMsg = sortedMessages.find((m) => m.event.id === repliedId)
                if (originalMsg) {
                  newRepliedMap.set(msg.event.id, {
                    event: originalMsg.event,
                    pubkey: originalMsg.pubkey
                  })
                  foundReply = true
                  break
                }
              }

              // If not found locally, try fetching from relay (try all e-tags)
              if (!foundReply) {
                for (const eTag of eTags) {
                  const repliedId = eTag[1]
                  if (!repliedId) continue
                  try {
                    const repliedEvent = await client.fetchEvent(repliedId)
                    if (repliedEvent) {
                      newRepliedMap.set(msg.event.id, {
                        event: repliedEvent,
                        pubkey: repliedEvent.pubkey
                      })
                      foundReply = true
                      break
                    }
                  } catch {
                    /* skip */
                  }
                }
              }

              // Fallback: show p-tag if no e-tag worked
              if (!foundReply && pTag && pTag[1]) {
                const emptyEvent = {
                  id: '',
                  content: '',
                  tags: [],
                  pubkey: '',
                  created_at: 0,
                  sig: '',
                  kind: 0
                } as unknown as Event
                newRepliedMap.set(msg.event.id, {
                  event: emptyEvent,
                  pubkey: pTag[1]
                })
              }
            }
            if (newRepliedMap.size > 0) setRepliedEvents(newRepliedMap)
          }
        } catch (error) {
          console.error('Failed to fetch messages:', error)
          if (isMounted) setLoading(false)
        }

        const closer = client.subscribe(
          relayUrls,
          {
            kinds: [NIP29_GROUP_KINDS.GROUP_CHAT_MESSAGE, 10],
            '#h': [groupId]
          },
          {
            onevent: async (event: Event) => {
              if (!isMounted) return

              // If this is a reply, fetch the replied event - try ALL e-tags
              const eTags = event.tags.filter((t: string[]) => t[0] === 'e')
              const pTag = event.tags.find((t: string[]) => t[0] === 'p')
              let foundReply = false

              for (const replyTag of eTags) {
                if (!replyTag[1]) continue
                const replyId = replyTag[1]

                // First check if we already have this message locally
                const existingMsg = messagesRef.current.find((m) => m.event.id === replyId)
                if (existingMsg) {
                  setRepliedEvents((prev) => {
                    const newMap = new Map(prev)
                    newMap.set(event.id, { event: existingMsg.event, pubkey: existingMsg.pubkey })
                    return newMap
                  })
                  foundReply = true
                  break
                }

                // Try fetching from relay
                try {
                  const repliedEvent = await client.fetchEvent(replyId)
                  if (repliedEvent) {
                    setRepliedEvents((prev) => {
                      const newMap = new Map(prev)
                      newMap.set(event.id, { event: repliedEvent, pubkey: repliedEvent.pubkey })
                      return newMap
                    })
                    foundReply = true
                    break
                  }
                } catch {
                  /* skip */
                }
              }

              // Fallback to p-tag if no e-tag worked
              if (!foundReply && pTag && pTag[1]) {
                const emptyEvent = {
                  id: '',
                  content: '',
                  tags: [],
                  pubkey: '',
                  created_at: 0,
                  sig: '',
                  kind: 0
                } as unknown as Event
                setRepliedEvents((prev) => {
                  const newMap = new Map(prev)
                  newMap.set(event.id, { event: emptyEvent, pubkey: pTag[1] })
                  return newMap
                })
              }

              setMessages((prev) => {
                if (prev.some((m) => m.event.id === event.id)) return prev
                return [
                  ...prev,
                  {
                    event,
                    content: event.content,
                    pubkey: event.pubkey,
                    created_at: event.created_at
                  }
                ].sort((a, b) => a.created_at - b.created_at)
              })
            }
          }
        )

        return closer
      }

      init()

      return () => {
        isMounted = false
      }
    }, [groupId, relayDomain])

    // Subscribe to reactions
    useEffect(() => {
      const relayUrls = relayDomain ? [normalizeUrl(relayDomain)] : getDefaultRelayUrls()
      client
        .fetchEvents(relayUrls, {
          kinds: [NIP29_GROUP_KINDS.GROUP_METADATA],
          '#d': [groupId],
          limit: 1
        } as any)
        .then((events) => {
          if (events.length > 0) {
            const metadataEvent = events[0]
            metadataEvent.tags.forEach((tag) => {
              const [tagName, tagValue] = tag
              if (tagName === 'name' && tagValue) setGroupName(tagValue)
              else if (tagName === 'about' && tagValue) setGroupAbout(tagValue)
              else if (tagName === 'picture' && tagValue) setGroupPicture(tagValue)
            })
          }
        })
        .catch(console.error)
    }, [groupId, relayDomain])

    // Subscribe to reactions
    useEffect(() => {
      const relayUrls = relayDomain ? [normalizeUrl(relayDomain)] : getDefaultRelayUrls()

      // Fetch existing reactions filtered by group (h tag)
      client
        .fetchEvents(relayUrls, {
          kinds: [kinds.Reaction],
          '#h': [groupId],
          limit: 500
        })
        .then((reactionEvents) => {
          const msgIds = new Set(messagesRef.current.map((m) => m.event.id))
          const newMap = new Map(reactions)
          reactionEvents.forEach((event: Event) => {
            const eTag = event.tags.find((t: string[]) => t[0] === 'e')
            if (!eTag) return

            const messageId = eTag[1]
            if (!msgIds.has(messageId)) return

            const emoji = event.content || '👍'
            const existing = newMap.get(messageId) || []
            if (!existing.some((r) => r.eventId === event.id)) {
              newMap.set(messageId, [
                ...existing,
                { emoji, pubkey: event.pubkey, eventId: event.id }
              ])
            }
          })
          setReactions(newMap)
        })
        .catch(console.error)

      // Subscribe to new reactions filtered by group (h tag)
      const closer = client.subscribe(
        relayUrls,
        { kinds: [kinds.Reaction], '#h': [groupId] },
        {
          onevent: (event: Event) => {
            const eTag = event.tags.find((t: string[]) => t[0] === 'e')
            if (!eTag) return

            const messageId = eTag[1]
            const emoji = event.content || '👍'

            setReactions((prev) => {
              const newMap = new Map(prev)
              const existing = newMap.get(messageId) || []
              if (existing.some((r) => r.eventId === event.id)) return prev
              newMap.set(messageId, [
                ...existing,
                { emoji, pubkey: event.pubkey, eventId: event.id }
              ])
              return newMap
            })
          }
        }
      )

      return () => {
        closer?.close()
      }
    }, [groupId, relayDomain])

    // Scroll to bottom on initial load
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
      <SecondaryPageLayout ref={ref} index={index} title={t('Groups')} hideBackButton={false}>
        <div className="flex h-full flex-col">
          {/* Group Info Subheader - Sticky below titlebar */}
          <div className="sticky top-[3rem] z-10 flex items-center gap-3 border-b border-border/20 bg-card/95 p-4 backdrop-blur-xl">
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
              {groupAbout && <p className="truncate text-xs text-muted-foreground">{groupAbout}</p>}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/30">
                  <MoreVertical className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={handleLeaveGroup}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 size-4" />
                  {t('Leave Group')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Messages List */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">{t('Loading messages...')}</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircle className="mb-4 size-12 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {t('No messages yet. Start the conversation!')}
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const repliedMsg = repliedEvents.get(message.event.id)

                return (
                  <div
                    key={message.event.id}
                    className={`flex gap-2 ${message.pubkey === pubkey ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    <div className="shrink-0">
                      <UserAvatar userId={message.pubkey} className="size-8" />
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`relative max-w-[70%] rounded-xl px-3 py-2 ${
                        message.pubkey === pubkey
                          ? 'bg-primary/30 text-white backdrop-blur-sm'
                          : 'bg-muted/20'
                      }`}
                    >
                      {/* Replied message shown above the bubble - Discord/Telegram style */}
                      {repliedMsg && (
                        <div className="mb-2">
                          <div className="flex items-start gap-2">
                            <div className="h-full min-h-[20px] w-0.5 rounded-full bg-foreground/30" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <MessageCircle
                                  className="size-3 shrink-0"
                                  style={{ color: deriveColorFromPubkey(repliedMsg.pubkey) }}
                                />
                                <span
                                  className="text-xs font-bold"
                                  style={{ color: deriveColorFromPubkey(repliedMsg.pubkey) }}
                                >
                                  <ColoredUsername pubkey={repliedMsg.pubkey} />
                                </span>
                              </div>
                              {repliedMsg.event.content && (
                                <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap break-words text-[11px] font-normal opacity-60">
                                  {repliedMsg.event.content}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      <MessageActions
                        message={message}
                        onReply={handleReply}
                        onReact={handleReact}
                        onZap={handleZap}
                      />
                      <div
                        className={`mb-1 flex items-center gap-1 ${message.pubkey === pubkey ? 'justify-end' : ''}`}
                      >
                        <ColoredUsername pubkey={message.pubkey} />
                        <span
                          className={
                            message.pubkey === pubkey ? 'text-white/50' : 'text-muted-foreground'
                          }
                        >
                          &bull;
                        </span>
                        <FormattedTimestamp
                          timestamp={message.created_at}
                          className={`text-[10px] ${
                            message.pubkey === pubkey ? 'text-white/50' : 'text-muted-foreground'
                          }`}
                        />
                      </div>
                      <Content
                        event={message.event}
                        className={`text-sm ${message.pubkey === pubkey ? 'text-white' : ''}`}
                      />
                      <ReactionPills
                        messageId={message.event.id}
                        reactions={reactions}
                        onReact={(msgId, emoji) => {
                          const msgReactions = reactions.get(msgId) || []
                          const existing = msgReactions.find(
                            (r) => r.pubkey === pubkey && r.emoji === emoji
                          )
                          if (existing) {
                            setReactTarget(message)
                          } else {
                            handleToggleReaction(msgId, emoji)
                          }
                        }}
                      />
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Zap Dialog for group messages */}
        {zapTarget && (
          <ZapDialog
            open={!!zapTarget}
            setOpen={(open) => {
              if (!open) setZapTarget(null)
            }}
            pubkey={zapTarget.pubkey}
            event={zapTarget.event}
          />
        )}

        {/* Emoji Picker for reactions */}
        {reactTarget && (
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center"
            onClick={() => setReactTarget(null)}
          >
            <div
              className="w-full max-w-md rounded-t-2xl bg-card/95 p-4 backdrop-blur-xl sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-center text-lg font-semibold">{t('React to message')}</h3>
                <button
                  onClick={() => setReactTarget(null)}
                  className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/30"
                >
                  <span className="text-sm">✕</span>
                </button>
              </div>
              <EmojiPicker onEmojiClick={handleEmojiSelect} />
            </div>
          </div>
        )}
      </SecondaryPageLayout>
    )
  }
)

GroupChatPage.displayName = 'GroupChatPage'
export default GroupChatPage
