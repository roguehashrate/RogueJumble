import ContentPreviewContent from '@/components/ContentPreview/Content'
import Emoji from '@/components/Emoji'
import EmojiPicker from '@/components/EmojiPicker'
import EncryptedFileMessage from '@/components/EncryptedFileMessage'
import ExternalLink from '@/components/ExternalLink'
import ImageGallery from '@/components/ImageGallery'
import MediaPlayer from '@/components/MediaPlayer'
import SuggestedEmojis from '@/components/SuggestedEmojis'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { SimpleUsername } from '@/components/Username'
import XEmbeddedPost from '@/components/XEmbeddedPost'
import YoutubeEmbeddedPlayer from '@/components/YoutubeEmbeddedPlayer'
import { EMOJI_REGEX, ExtendedKind } from '@/constants'
import {
  EmbeddedEmojiParser,
  EmbeddedEventParser,
  EmbeddedHashtagParser,
  EmbeddedLNInvoiceParser,
  EmbeddedMentionParser,
  EmbeddedUrlParser,
  EmbeddedWebsocketUrlParser,
  TEmbeddedNode,
  parseContent
} from '@/lib/content-parser'
import { getEmojiInfosFromEmojiTags } from '@/lib/tag'
import { cn } from '@/lib/utils'
import { useContentPolicy } from '@/providers/ContentPolicyProvider'
import { useNostr } from '@/providers/NostrProvider'
import { usePageActive } from '@/providers/PageActiveProvider'
import dmService from '@/services/dm.service'
import { TDmMessage, TEmoji, TImetaInfo } from '@/types'
import lightning from '@/services/lightning.service'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import {
  AlertCircle,
  ArrowDown,
  Check,
  Clock,
  Copy,
  Loader2,
  Reply,
  SmilePlus,
  Zap
} from 'lucide-react'
import { kinds } from 'nostr-tools'
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

function formatTime(timestamp: number): string {
  return dayjs.unix(timestamp).format('HH:mm')
}

function formatDateSeparator(timestamp: number, t: ReturnType<typeof useTranslation>['t']): string {
  const msgTime = dayjs.unix(timestamp)
  const now = dayjs()

  if (msgTime.isSame(now, 'day')) return t('Today')
  if (msgTime.isSame(now.subtract(1, 'day'), 'day')) return t('Yesterday')
  return msgTime.format('MMMM D, YYYY')
}

export default function DmMessageList({
  otherPubkey,
  onReply
}: {
  otherPubkey: string
  onReply?: (message: TDmMessage) => void
}) {
  const { t } = useTranslation()
  const { pubkey } = useNostr()
  const { autoLoadProfilePicture } = useContentPolicy()
  const active = usePageActive()
  const [messages, setMessages] = useState<TDmMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [, setStatusVersion] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const messageRefsMap = useRef<Map<string, HTMLDivElement>>(new Map())
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [elevatedId, setElevatedId] = useState<string | null>(null)
  const pendingMessagesRef = useRef<TDmMessage[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [reactionsMap, setReactionsMap] = useState<Map<string, TDmMessage[]>>(new Map())
  const [zapsMap, setZapsMap] = useState<Map<string, { amount: number; senderPubkey: string }[]>>(new Map())
  const loadMoreScrollRestoreRef = useRef(0)
  const hasScrolledToBottomRef = useRef(false)

  const checkIsAtBottom = useCallback(() => {
    const container = containerRef.current
    const bottom = bottomRef.current
    if (!container || !bottom) return true
    const containerRect = container.getBoundingClientRect()
    const bottomRect = bottom.getBoundingClientRect()
    return bottomRect.top - containerRect.bottom < 100
  }, [])

  const scrollToMessage = useCallback((id: string) => {
    const el = messageRefsMap.current.get(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedId(id)
      setElevatedId(id)
      setTimeout(() => setHighlightedId(null), 1500)
      setTimeout(() => setElevatedId(null), 2000)
    }
  }, [])

  const loadMessages = useCallback(async () => {
    if (!pubkey) return

    try {
      const allMsgs = await dmService.getMessages(pubkey, otherPubkey, { limit: 50 })
      const reactions: TDmMessage[] = []
      const regularMsgs: TDmMessage[] = []
      for (const msg of allMsgs) {
        if (msg.decryptedRumor?.kind === kinds.Reaction) {
          reactions.push(msg)
        } else {
          regularMsgs.push(msg)
        }
      }
      const newMap = new Map<string, TDmMessage[]>()
      for (const r of reactions) {
        const targetId = r.decryptedRumor?.tags?.find((t: string[]) => t[0] === 'e')?.[1]
        if (targetId) {
          const existing = newMap.get(targetId) ?? []
          existing.push(r)
          newMap.set(targetId, existing)
        }
      }
      setReactionsMap(newMap)
      const pendingIds = new Set(pendingMessagesRef.current.map((m) => m.id))
      setMessages(
        pendingIds.size > 0 ? regularMsgs.filter((m) => !pendingIds.has(m.id)) : regularMsgs
      )
      setHasMore(allMsgs.length >= 50)
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setIsLoading(false)
    }
  }, [pubkey, otherPubkey])

  const loadMoreMessages = useCallback(async () => {
    if (!pubkey || isLoadingMore || !hasMore || messages.length === 0) return

    const container = containerRef.current
    if (container) {
      loadMoreScrollRestoreRef.current = container.scrollHeight
    }
    setIsLoadingMore(true)
    try {
      const oldestMessage = messages[0]
      const olderMsgs = await dmService.getMessages(pubkey, otherPubkey, {
        limit: 50,
        before: oldestMessage.createdAt
      })
      if (olderMsgs.length < 50) {
        setHasMore(false)
      }
      const reactions: TDmMessage[] = []
      const regularMsgs: TDmMessage[] = []
      for (const msg of olderMsgs) {
        if (msg.decryptedRumor?.kind === kinds.Reaction) {
          reactions.push(msg)
        } else {
          regularMsgs.push(msg)
        }
      }
      if (reactions.length > 0) {
        setReactionsMap((prev) => {
          const updated = new Map(prev)
          for (const r of reactions) {
            const targetId = r.decryptedRumor?.tags?.find((t: string[]) => t[0] === 'e')?.[1]
            if (targetId) {
              const existing = updated.get(targetId) ?? []
              if (!existing.some((e) => e.id === r.id)) {
                existing.push(r)
                updated.set(targetId, existing)
              }
            }
          }
          return updated
        })
      }
      setMessages((prev) => [...regularMsgs, ...prev])
    } catch (error) {
      console.error('Failed to load more messages:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [pubkey, otherPubkey, messages, isLoadingMore, hasMore])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (!pubkey) return

    if (active) {
      dmService.setActiveConversation(pubkey, otherPubkey)
      dmService.markConversationAsRead(pubkey, otherPubkey)
    } else {
      dmService.clearActiveConversation(pubkey, otherPubkey)
    }

    return () => {
      dmService.clearActiveConversation(pubkey, otherPubkey)
    }
  }, [pubkey, otherPubkey, active])

  useEffect(() => {
    if (!pubkey) return

    const participantsKey = dmService.getParticipantsKey(pubkey, otherPubkey)

    const unsubMessage = dmService.onNewMessage((message: TDmMessage) => {
      if (message.participantsKey === participantsKey) {
        const atBottom = checkIsAtBottom()
        const isOwn = message.senderPubkey === pubkey

        if (isOwn || atBottom) {
          const pending = pendingMessagesRef.current
          pendingMessagesRef.current = []
          setPendingCount(0)

          setMessages((prev) => {
            const existing = new Set(prev.map((m) => m.id))
            const newMsgs = [...pending, message].filter((m) => !existing.has(m.id))
            return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev
          })
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
            })
          })
        } else {
          if (!pendingMessagesRef.current.some((m) => m.id === message.id)) {
            pendingMessagesRef.current.push(message)
            setPendingCount((c) => c + 1)
          }
        }

        if (dmService.isActiveConversation(pubkey, otherPubkey)) {
          dmService.markConversationAsRead(pubkey, otherPubkey)
        }
      }
    })

    const unsubReaction = dmService.onNewReaction((reaction: TDmMessage) => {
      if (reaction.participantsKey === participantsKey) {
        const targetId = reaction.decryptedRumor?.tags?.find((t: string[]) => t[0] === 'e')?.[1]
        if (targetId) {
          setReactionsMap((prev) => {
            const updated = new Map(prev)
            const existing = updated.get(targetId) ?? []
            if (!existing.some((e) => e.id === reaction.id)) {
              updated.set(targetId, [...existing, reaction])
            }
            return updated
          })
        }
      }
    })

    const unsubData = dmService.onDataChanged(() => {
      loadMessages()
    })

    const unsubStatus = dmService.onSendingStatusChanged(() => {
      setStatusVersion((v) => v + 1)
    })

    return () => {
      unsubMessage()
      unsubReaction()
      unsubData()
      unsubStatus()
    }
  }, [pubkey, otherPubkey, loadMessages, checkIsAtBottom])

  useLayoutEffect(() => {
    if (loadMoreScrollRestoreRef.current > 0) {
      const el = containerRef.current
      if (el) {
        el.scrollTop = el.scrollHeight - loadMoreScrollRestoreRef.current
      }
      loadMoreScrollRestoreRef.current = 0
    }
  })

  useEffect(() => {
    if (!isLoading && !hasScrolledToBottomRef.current && messages.length > 0) {
      hasScrolledToBottomRef.current = true
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView()
      })
    }
  }, [isLoading])

  const flushPendingMessages = useCallback(() => {
    if (pendingMessagesRef.current.length === 0) return
    const pending = pendingMessagesRef.current
    pendingMessagesRef.current = []
    setPendingCount(0)
    setMessages((prev) => {
      const existing = new Set(prev.map((m) => m.id))
      const newMsgs = pending.filter((m) => !existing.has(m.id))
      return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev
    })
  }, [])

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return

    if (checkIsAtBottom()) {
      flushPendingMessages()
    }

    if (el.scrollTop < 100 && el.scrollHeight > el.clientHeight && !isLoadingMore && hasMore) {
      loadMoreMessages()
    }
  }, [loadMoreMessages, isLoadingMore, hasMore, flushPendingMessages, checkIsAtBottom])

  const scrollToBottom = useCallback(() => {
    flushPendingMessages()
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
  }, [flushPendingMessages])

  const handleReact = useCallback(
    async (messageId: string, emoji: string | TEmoji) => {
      if (!pubkey) return
      const emojiContent = typeof emoji === 'string' ? emoji : `:${emoji.shortcode}:`
      const emojiTag = typeof emoji !== 'string' ? ['emoji', emoji.shortcode, emoji.url] : undefined
      try {
        await dmService.sendReaction(pubkey, otherPubkey, messageId, emojiContent, emojiTag)
      } catch (error) {
        console.error('Failed to send reaction:', error)
      }
    },
    [pubkey, otherPubkey]
  )

  const zapsStorageKey = useMemo(() => {
    if (!pubkey) return null
    return `dm_zaps_${dmService.getParticipantsKey(pubkey, otherPubkey)}`
  }, [pubkey, otherPubkey])

  useEffect(() => {
    if (!zapsStorageKey) return
    try {
      const stored = localStorage.getItem(zapsStorageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        setZapsMap(new Map(Object.entries(parsed)))
      }
    } catch {}
  }, [zapsStorageKey])

  useEffect(() => {
    if (!zapsStorageKey) return
    const obj: Record<string, { amount: number; senderPubkey: string }[]> = {}
    zapsMap.forEach((v, k) => { obj[k] = v })
    localStorage.setItem(zapsStorageKey, JSON.stringify(obj))
  }, [zapsMap, zapsStorageKey])

  const handleZap = useCallback(async (messageId: string, amount: number): Promise<boolean> => {
    if (!pubkey) return false
    const message = messages.find((m) => m.id === messageId)
    if (!message) return false

      try {
      const recipientPubkey = message.senderPubkey === pubkey ? pubkey : message.senderPubkey
      const result = await lightning.zap(pubkey, recipientPubkey, amount, '')
      if (!result) return false
      setZapsMap((prev) => {
        const updated = new Map(prev)
        const existing = updated.get(messageId) ?? []
        updated.set(messageId, [...existing, { amount, senderPubkey: pubkey }])
        return updated
      })
      toast.success(t('Zap sent!'))
      return true
    } catch (error) {
      toast.error(`${t('Zap failed')}: ${(error as Error).message}`)
      return false
    }
  }, [pubkey, messages, t])

  if (isLoading) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center p-8">
        <p className="text-muted-foreground">{t('No messages yet. Send one!')}</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 flex-1 select-text flex-col overflow-y-auto px-3 py-2"
      onScroll={handleScroll}
    >
      <div>
          {isLoadingMore && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {(() => {
            const groups: {
              isOwn: boolean
              items: TDmMessage[]
            }[] = []

            let lastDate: string | null = null
            const dateSeparators: { date: string; index: number }[] = []

            messages.forEach((message, index) => {
              const msgDate = dayjs.unix(message.createdAt).format('YYYY-MM-DD')
              if (msgDate !== lastDate) {
                dateSeparators.push({ date: msgDate, index: groups.length })
                lastDate = msgDate
              }

              const isOwn = message.senderPubkey === pubkey
              const prevMsg = index > 0 ? messages[index - 1] : null
              const isGroupStart = !prevMsg || prevMsg.senderPubkey !== message.senderPubkey

              if (isGroupStart) {
                groups.push({ isOwn, items: [] })
              }
              groups[groups.length - 1].items.push(message)
            })

            let dateIdx = 0
            return groups.map((group, gi) => {
              const showDateSep = dateIdx < dateSeparators.length && dateSeparators[dateIdx].index === gi
              if (showDateSep) dateIdx++

              return (
                <Fragment key={group.items[0].id}>
                  {showDateSep && (
                    <div className="flex justify-center py-3">
                      <span className="rounded-full bg-muted/60 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                        {formatDateSeparator(group.items[0].createdAt, t)}
                      </span>
                    </div>
                  )}
                  <div className={cn('flex', group.isOwn ? 'flex-row-reverse' : 'flex-row')}>
                    {autoLoadProfilePicture && (
                      <div className="w-9 shrink-0 self-end" />
                    )}
                    <div
                      className={cn(
                        'flex min-w-0 flex-1 flex-col max-w-[75%]',
                        group.isOwn ? 'items-end' : 'items-start'
                      )}
                    >
                      {group.items.map((message, mi) => (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          isOwn={group.isOwn}
                          isFirstInGroup={mi === 0}
                          sendingStatus={dmService.getSendingStatus(message.id)}
                          onReply={onReply}
                          onReact={handleReact}
                          onZap={handleZap}
                          reactions={reactionsMap.get(message.id)}
                          zaps={zapsMap.get(message.id)}
                          currentUserPubkey={pubkey ?? undefined}
                          onScrollToMessage={scrollToMessage}
                          isHighlighted={highlightedId === message.id}
                          isElevated={elevatedId === message.id}
                          refCallback={(el) => {
                            if (el) {
                              messageRefsMap.current.set(message.id, el)
                            } else {
                              messageRefsMap.current.delete(message.id)
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </Fragment>
              )
            })
          })()}
          <div ref={bottomRef} />
        </div>
      {pendingCount > 0 && (
        <div className="pointer-events-none absolute bottom-3 flex w-full justify-center">
          <button
            onClick={scrollToBottom}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary-hover"
          >
            <ArrowDown className="h-4 w-4" />
            {t('{{n}} new messages', { n: pendingCount > 99 ? '99+' : pendingCount })}
          </button>
        </div>
      )}
    </div>
  )
}

function MessageBubble({
  message,
  isOwn,
  isFirstInGroup,
  sendingStatus,
  onReply,
  onReact,
  onZap,
  reactions,
  zaps,
  currentUserPubkey,
  onScrollToMessage,
  isHighlighted,
  isElevated,
  refCallback
}: {
  message: TDmMessage
  isOwn: boolean
  isFirstInGroup?: boolean
  sendingStatus?: 'sending' | 'sent' | 'failed' | null
  onReply?: (message: TDmMessage) => void
  onReact?: (messageId: string, emoji: string | TEmoji) => void
  onZap?: (messageId: string, amount: number) => Promise<boolean>
  reactions?: TDmMessage[]
  zaps?: { amount: number; senderPubkey: string }[]
  currentUserPubkey?: string
  onScrollToMessage?: (id: string) => void
  isHighlighted?: boolean
  isElevated?: boolean
  refCallback?: (el: HTMLDivElement | null) => void
}) {
  const { t } = useTranslation()
  const isFileMessage = message.decryptedRumor?.kind === ExtendedKind.RUMOR_FILE
  const hasBlocks =
    isFileMessage ||
    /https?:\/\/|nostr:n(?:ote|event|addr)1|note1|nevent1|lnbc/i.test(message.content)
  const [copied, setCopied] = useState(false)
  const [isEmojiOpen, setIsEmojiOpen] = useState(false)
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  useEffect(() => {
    setTimeout(() => setIsPickerOpen(false), 100)
  }, [isEmojiOpen])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [message.content])

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const longPressTriggeredRef = useRef(false)
  const actionDrawerOpenTimeRef = useRef(0)
  const [isActionDrawerOpen, setIsActionDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'actions' | 'emoji' | 'zap'>('actions')
  const [zapAmount, setZapAmount] = useState('21')
  const [zapping, setZapping] = useState(false)

  const handleTouchStart = useCallback(() => {
    longPressTriggeredRef.current = false
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true
      actionDrawerOpenTimeRef.current = Date.now()
      setDrawerMode('actions')
      setIsActionDrawerOpen(true)
    }, 500)
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    clearTimeout(longPressTimerRef.current)
    if (longPressTriggeredRef.current) {
      e.preventDefault()
    }
  }, [])

  const handleTouchMove = useCallback(() => {
    clearTimeout(longPressTimerRef.current)
  }, [])

  const handleEmojiSelect = useCallback(
    (emoji: string | TEmoji) => {
      setIsEmojiOpen(false)
      onReact?.(message.id, emoji)
    },
    [message.id, onReact]
  )

  const handleZapSend = useCallback(async () => {
    const amount = parseInt(zapAmount)
    if (!amount || amount <= 0 || !onZap) return
    setZapping(true)
    const success = await onZap(message.id, amount)
    setZapping(false)
    if (success) {
      setIsActionDrawerOpen(false)
      setDrawerMode('actions')
      setZapAmount('21')
    }
  }, [zapAmount, onZap, message.id])

  const chipLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [chipLongPressing, setChipLongPressing] = useState<string | null>(null)
  const [chipCompleted, setChipCompleted] = useState<string | null>(null)

  const handleChipMouseDown = useCallback((emoji: string) => {
    setChipLongPressing(emoji)
    chipLongPressTimerRef.current = setTimeout(() => {
      setChipCompleted(emoji)
      setChipLongPressing(null)
    }, 800)
  }, [])

  const handleChipMouseUp = useCallback(() => {
    if (chipLongPressTimerRef.current) {
      clearTimeout(chipLongPressTimerRef.current)
      chipLongPressTimerRef.current = null
    }
    if (chipCompleted) {
      onReact?.(message.id, chipCompleted)
    }
    setChipLongPressing(null)
    setChipCompleted(null)
  }, [chipCompleted, message.id, onReact])

  const handleChipMouseLeave = useCallback(() => {
    if (chipLongPressTimerRef.current) {
      clearTimeout(chipLongPressTimerRef.current)
      chipLongPressTimerRef.current = null
    }
    setChipLongPressing(null)
    setChipCompleted(null)
  }, [])

  const handleChipTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0]
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const isInside =
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom
      if (!isInside) {
        handleChipMouseLeave()
      }
    },
    [handleChipMouseLeave]
  )

  const groupedReactions = useMemo(() => {
    if (!reactions || reactions.length === 0) return []
    const groups = new Map<
      string,
      { emoji: string; count: number; hasOwn: boolean; emojiTag?: string[] }
    >()
    for (const r of reactions) {
      const content = r.content || '+'
      const existing = groups.get(content)
      const isMine = r.senderPubkey === currentUserPubkey
      if (existing) {
        existing.count++
        if (isMine) existing.hasOwn = true
      } else {
        const emojiTag = r.decryptedRumor?.tags?.find((t: string[]) => t[0] === 'emoji')
        groups.set(content, { emoji: content, count: 1, hasOwn: isMine, emojiTag })
      }
    }
    return Array.from(groups.values())
  }, [reactions, currentUserPubkey])

  const reactButton = (
    <button
      onClick={() => setIsEmojiOpen(true)}
      className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-secondary"
    >
      <SmilePlus className="h-4 w-4" />
    </button>
  )

  const hasReactions = groupedReactions.length > 0

  const bubbleClass = cn(
    'overflow-hidden break-words [word-break:break-word] rounded-xl px-4 py-2',
    'w-fit min-w-[3rem] max-w-full',
    isOwn
      ? 'bg-primary text-primary-foreground'
      : 'bg-secondary'
  )

  return (
    <div
      ref={refCallback}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      className={cn(
        'group/msg flex w-full max-w-full select-none flex-col',
        isOwn ? 'items-end' : 'items-start',
        isFirstInGroup ? 'mt-2' : 'mt-0.5',
        isElevated && 'relative z-10'
      )}
    >
      {message.replyTo && (
        <button
          onClick={() => onScrollToMessage?.(message.replyTo!.id)}
          className={cn(
            'mb-0.5 flex min-w-0 max-w-[85%] items-center overflow-hidden rounded-lg py-1 ps-2 pe-3 text-xs',
            isOwn ? 'bg-primary/10' : 'bg-secondary/50'
          )}
        >
          <span className={cn('me-1.5 self-stretch border-s-2', isOwn ? 'border-primary/60' : 'border-muted-foreground/50')} />
          {message.replyTo.senderPubkey ? (
            <SimpleUsername
              userId={message.replyTo.senderPubkey}
              className="me-1 shrink-0 font-medium"
              withoutSkeleton
            />
          ) : null}
          <ContentPreviewContent
            content={message.replyTo.content || '...'}
            className="truncate"
            emojiInfos={getEmojiInfosFromEmojiTags(message.replyTo.tags)}
          />
        </button>
      )}
      <div
        className={cn(
          'flex min-w-0 max-w-full items-end gap-1',
          hasBlocks && !isOwn && 'w-full',
          isFileMessage && 'justify-end',
          isOwn ? 'flex-row' : 'flex-row-reverse'
        )}
      >
        <div
          className={cn(
            'hidden shrink-0 items-center gap-1 px-1 [@media(hover:hover)]:pointer-events-none [@media(hover:hover)]:flex [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/msg:pointer-events-auto [@media(hover:hover)]:group-hover/msg:opacity-100',
            isOwn ? 'flex-row' : 'flex-row-reverse'
          )}
        >
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-secondary"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
          {onReact && (
            <Popover open={isEmojiOpen} onOpenChange={setIsEmojiOpen}>
              <PopoverAnchor asChild>{reactButton}</PopoverAnchor>
              <PopoverContent side="top" className="w-fit overflow-hidden border-0 p-0 shadow-lg">
                {isPickerOpen ? (
                  <EmojiPicker
                    onEmojiClick={(emoji) => {
                      if (!emoji) return
                      handleEmojiSelect(emoji)
                    }}
                  />
                ) : (
                  <SuggestedEmojis
                    onEmojiClick={handleEmojiSelect}
                    onMoreButtonClick={() => setIsPickerOpen(true)}
                  />
                )}
              </PopoverContent>
            </Popover>
          )}
          {onReply && (
            <button
              onClick={() => onReply(message)}
              className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-secondary"
            >
              <Reply className="h-4 w-4" />
            </button>
          )}
        </div>
        <Drawer open={isActionDrawerOpen} onOpenChange={setIsActionDrawerOpen}>
          <DrawerContent>
            {drawerMode === 'actions' ? (
              <div className="flex flex-col pb-2">
                {onReply && (
                  <button
                    onClick={() => {
                      if (Date.now() - actionDrawerOpenTimeRef.current < 400) return
                      setIsActionDrawerOpen(false)
                      onReply(message)
                    }}
                    className="flex items-center gap-3 px-4 py-3 text-base active:bg-secondary"
                  >
                    <Reply className="h-5 w-5 text-muted-foreground" />
                    {t('Reply')}
                  </button>
                )}
                {onReact && (
                  <button
                    onClick={() => {
                      if (Date.now() - actionDrawerOpenTimeRef.current < 400) return
                      setDrawerMode('emoji')
                    }}
                    className="flex items-center gap-3 px-4 py-3 text-base active:bg-secondary"
                  >
                    <SmilePlus className="h-5 w-5 text-muted-foreground" />
                    {t('React')}
                  </button>
                )}
                {onZap && (
                  <button
                    onClick={() => {
                      if (Date.now() - actionDrawerOpenTimeRef.current < 400) return
                      setDrawerMode('zap')
                      setZapAmount('21')
                    }}
                    className="flex items-center gap-3 px-4 py-3 text-base active:bg-secondary"
                  >
                    <Zap className="h-5 w-5 text-muted-foreground" />
                    {t('Zap')}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (Date.now() - actionDrawerOpenTimeRef.current < 400) return
                    handleCopy()
                    setIsActionDrawerOpen(false)
                  }}
                  className="flex items-center gap-3 px-4 py-3 text-base active:bg-secondary"
                >
                  <Copy className="h-5 w-5 text-muted-foreground" />
                  {t('Copy')}
                </button>
              </div>
            ) : drawerMode === 'zap' ? (
              <div className="flex flex-col gap-4 px-4 py-6 pb-8">
                <div className="flex items-center justify-center gap-2 text-lg font-semibold">
                  <Zap className="h-5 w-5 text-zap" />
                  {t('Zap')}
                </div>
                <div className="flex flex-col items-center">
                  <input
                    value={zapAmount}
                    onChange={(e) => setZapAmount(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-transparent p-0 text-center text-5xl font-bold focus:outline-hidden"
                    autoFocus
                  />
                  <span className="text-sm text-muted-foreground">Sats</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[21, 42, 210, 420, 1000].map((n) => (
                    <button
                      key={n}
                      onClick={() => setZapAmount(n.toString())}
                      className="rounded-md bg-secondary py-1.5 text-sm font-medium transition-colors hover:bg-secondary/80"
                    >
                      {n >= 1000 ? `${n / 1000}k` : n}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsActionDrawerOpen(false)
                      setDrawerMode('actions')
                    }}
                    className="flex-1 rounded-md bg-secondary py-3 font-medium transition-colors hover:bg-secondary/80"
                  >
                    {t('Cancel')}
                  </button>
                  <button
                    onClick={handleZapSend}
                    disabled={zapping || !zapAmount || parseInt(zapAmount) <= 0}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {zapping ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        {t('Zap')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <EmojiPicker
                onEmojiClick={(emoji) => {
                  if (!emoji) return
                  handleEmojiSelect(emoji)
                  setIsActionDrawerOpen(false)
                }}
              />
            )}
          </DrawerContent>
        </Drawer>
        <div className={cn('relative flex flex-col min-w-0 max-w-full', isOwn ? 'items-end' : 'items-start', hasBlocks && !isFileMessage && 'flex-1')}>
          {isFileMessage ? (
            <EncryptedFileMessage message={message} isOwn={isOwn} isHighlighted={isHighlighted} />
          ) : (
            <div className={bubbleClass}>
              <DmContent
                content={message.content}
                isOwn={isOwn}
                isHighlighted={isHighlighted}
                tags={message.decryptedRumor?.tags}
              />
              <div className={cn('mt-0.5 flex items-center gap-1', isOwn ? 'justify-end' : 'justify-start')}>
                <span className={cn(
                  'text-[11px] leading-none',
                  isOwn ? 'text-primary-foreground/55' : 'text-muted-foreground/65'
                )}>
                  {formatTime(message.createdAt)}
                </span>
                {isOwn && sendingStatus && (
                  <SendingStatusIcon
                    status={sendingStatus}
                    onRetry={
                      sendingStatus === 'failed' ? () => dmService.resendMessage(message.id) : undefined
                    }
                  />
                )}
              </div>
            </div>
          )}
          {hasReactions && (
            <div
              className={cn(
                'z-1 mt-1 flex flex-wrap gap-1',
                isOwn ? 'justify-end' : 'justify-start'
              )}
            >
              {groupedReactions.map((r) => (
                <div
                  key={r.emoji}
                  className={cn(
                    'relative flex h-6 cursor-pointer select-none items-center gap-1 overflow-hidden rounded-full border px-1.5 text-sm shadow-xs transition-all duration-200',
                    r.hasOwn
                      ? 'border-primary/50 bg-primary/10 hover:border-primary hover:bg-primary/20'
                      : 'border-border bg-background hover:border-primary/30 hover:bg-primary/5',
                    (chipLongPressing === r.emoji || chipCompleted === r.emoji) &&
                      (r.hasOwn
                        ? 'border-primary bg-primary/20'
                        : 'border-foreground/30 bg-secondary')
                  )}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={() => handleChipMouseDown(r.emoji)}
                  onMouseUp={handleChipMouseUp}
                  onMouseLeave={handleChipMouseLeave}
                  onTouchStart={() => handleChipMouseDown(r.emoji)}
                  onTouchMove={handleChipTouchMove}
                  onTouchEnd={handleChipMouseUp}
                  onTouchCancel={handleChipMouseLeave}
                >
                  {(chipLongPressing === r.emoji || chipCompleted === r.emoji) && (
                    <div className="absolute inset-0 overflow-hidden rounded-full">
                      <div
                        className="h-full bg-linear-to-r from-primary/40 via-primary/60 to-primary/80"
                        style={{
                          width: chipCompleted === r.emoji ? '100%' : '0%',
                          animation:
                            chipLongPressing === r.emoji
                              ? 'progressFill 1000ms ease-out forwards'
                              : 'none'
                        }}
                      />
                    </div>
                  )}
                  <div className="relative z-10 flex items-center gap-1">
                    <div
                      style={{
                        animation:
                          chipCompleted === r.emoji ? 'shake 0.5s ease-in-out infinite' : undefined
                      }}
                    >
                      {r.emojiTag ? (
                        <img
                          src={r.emojiTag[2]}
                          alt={r.emojiTag[1]}
                          className="inline-block size-4"
                        />
                      ) : (
                        <Emoji
                          emoji={r.emoji}
                          classNames={{ img: 'size-4', text: 'text-sm leading-none' }}
                        />
                      )}
                    </div>
                    {r.count > 1 && (
                      <span className="text-xs text-muted-foreground">{r.count}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {zaps && zaps.length > 0 && (
            <div className={cn('z-1 mt-1 flex flex-wrap gap-1', isOwn ? 'justify-end' : 'justify-start')}>
              {zaps.map((zapInfo, i) => (
                <div
                  key={i}
                  className="flex h-6 cursor-default items-center gap-1 rounded-full border border-zap/50 bg-zap/10 px-1.5 text-sm shadow-xs"
                >
                  <span className="text-xs">⚡</span>
                  <span className="text-xs font-medium text-zap">{zapInfo.amount >= 1000 ? `${(zapInfo.amount / 1000).toFixed(1)}k` : zapInfo.amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type TDmSegment = { kind: 'text'; nodes: TEmbeddedNode[] } | { kind: 'block'; node: TEmbeddedNode }

const BLOCK_TYPES = new Set(['image', 'images', 'media', 'event', 'youtube', 'x-post', 'invoice'])

function segmentDmContent(nodes: TEmbeddedNode[]): TDmSegment[] {
  const segments: TDmSegment[] = []
  let inlineAcc: TEmbeddedNode[] = []

  const flushInline = () => {
    if (inlineAcc.length === 0) return
    const first = inlineAcc[0]
    if (first.type === 'text' && typeof first.data === 'string') {
      const trimmed = first.data.replace(/^\s+/, '')
      if (trimmed) {
        inlineAcc[0] = { type: 'text', data: trimmed }
      } else {
        inlineAcc = inlineAcc.slice(1)
      }
    }
    if (inlineAcc.length > 0) {
      const last = inlineAcc[inlineAcc.length - 1]
      if (last.type === 'text' && typeof last.data === 'string') {
        const trimmed = last.data.replace(/\s+$/, '')
        if (trimmed) {
          inlineAcc[inlineAcc.length - 1] = { type: 'text', data: trimmed }
        } else {
          inlineAcc = inlineAcc.slice(0, -1)
        }
      }
    }
    const hasContent = inlineAcc.some(
      (n) => n.type !== 'text' || (typeof n.data === 'string' && n.data.trim() !== '')
    )
    if (hasContent) {
      segments.push({ kind: 'text', nodes: inlineAcc })
    }
    inlineAcc = []
  }

  for (const node of nodes) {
    if (BLOCK_TYPES.has(node.type)) {
      flushInline()
      segments.push({ kind: 'block', node })
    } else {
      inlineAcc.push(node)
    }
  }
  flushInline()

  return segments
}

function DmContent({
  content,
  isOwn,
  isHighlighted,
  tags
}: {
  content: string
  isOwn: boolean
  isHighlighted?: boolean
  tags?: string[][]
}) {
  const { allImages, segments, isEmojiOnly } = useMemo(() => {
    if (!content) return { allImages: [], segments: [], isEmojiOnly: false }

    const nodes = parseContent(content, [
      EmbeddedEventParser,
      EmbeddedMentionParser,
      EmbeddedUrlParser,
      EmbeddedLNInvoiceParser,
      EmbeddedWebsocketUrlParser,
      EmbeddedHashtagParser,
      EmbeddedEmojiParser
    ])

    const allImages = nodes
      .map((node) => {
        if (node.type === 'image') return { url: node.data } as TImetaInfo
        if (node.type === 'images') {
          const urls = Array.isArray(node.data) ? node.data : [node.data]
          return urls.map((url) => ({ url }) as TImetaInfo)
        }
        return null
      })
      .filter(Boolean)
      .flat() as TImetaInfo[]

    const segments = segmentDmContent(nodes)

    const nonWhitespace = nodes.filter(
      (node) => !(node.type === 'text' && /^\s*$/.test(node.data))
    )
    let emojiCount = 0
    let emojiOnly = true
    for (const node of nonWhitespace) {
      if (node.type === 'emoji') {
        emojiCount++
      } else if (node.type === 'text') {
        const matches = node.data.match(new RegExp(EMOJI_REGEX.source, 'gu'))
        if (!matches || node.data.replace(new RegExp(EMOJI_REGEX.source, 'gu'), '').trim() !== '') {
          emojiOnly = false
          break
        }
        emojiCount += matches.length
      } else {
        emojiOnly = false
        break
      }
    }
    const isEmojiOnly = emojiOnly && emojiCount > 0 && emojiCount <= 3

    return { allImages, segments, isEmojiOnly }
  }, [content])

  const emojiInfos = useMemo(() => getEmojiInfosFromEmojiTags(tags), [tags])

  if (segments.length === 0) return null

  let imageIndex = 0

  return (
    <div
      className={cn(
        'flex min-w-0 max-w-full flex-col gap-0.5 rounded-lg transition-all duration-500',
        segments.some((s) => s.kind === 'block') && 'flex-1',
        isOwn ? 'items-end' : 'items-start',
        isHighlighted && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      {segments.map((seg, si) => {
        if (seg.kind === 'text') {
          if (isEmojiOnly) {
            return (
              <div key={si} className="flex items-end gap-1">
                {seg.nodes.map((node, ni) => {
                  if (node.type === 'text')
                    return <span key={ni} className="text-7xl leading-none">{node.data}</span>
                  if (node.type === 'emoji') {
                    const shortcode = node.data.split(':')[1]
                    const emoji = emojiInfos.find((e) => e.shortcode === shortcode)
                    if (!emoji) return node.data
                    return <Emoji classNames={{ img: 'size-20' }} emoji={emoji} key={ni} />
                  }
                  return null
                })}
              </div>
            )
          }
          return (
            <div
              dir="auto"
              className={cn(
                'whitespace-pre-wrap break-words [word-break:break-word] text-base leading-relaxed',
                isOwn &&
                  '[&>div]:text-foreground [&_.text-primary]:text-primary-foreground [&_.text-primary]:underline [&_.text-primary]:decoration-primary-foreground/50',
                '[&_.bg-card:hover]:bg-accent'
              )}
            >
              {seg.nodes.map((node, ni) => {
                if (node.type === 'text') return node.data
                if (node.type === 'url') return <ExternalLink url={node.data} key={ni} />
                if (node.type === 'mention')
                  return <span key={ni}>@{node.data.split(':')[1]?.slice(0, 12)}</span>
                if (node.type === 'hashtag')
                  return <span key={ni}>#{node.data}</span>
                if (node.type === 'websocket-url')
                  return <span key={ni}>{node.data}</span>
                if (node.type === 'emoji') {
                  const shortcode = node.data.split(':')[1]
                  const emoji = emojiInfos.find((e) => e.shortcode === shortcode)
                  if (!emoji) return node.data
                  return <Emoji classNames={{ img: 'mb-1' }} emoji={emoji} key={ni} />
                }
                return null
              })}
            </div>
          )
        }

        const { node } = seg
        if (node.type === 'image' || node.type === 'images') {
          const start = imageIndex
          const end = imageIndex + (Array.isArray(node.data) ? node.data.length : 1)
          imageIndex = end
          return <ImageGallery key={si} images={allImages} start={start} end={end} />
        }
        if (node.type === 'media') {
          return <MediaPlayer key={si} src={node.data} />
        }
        if (node.type === 'youtube') {
          return <YoutubeEmbeddedPlayer key={si} url={node.data} />
        }
        if (node.type === 'x-post') {
          return <XEmbeddedPost key={si} url={node.data} />
        }
        if (node.type === 'event') {
          return <span key={si} className="text-primary">[Event]</span>
        }
        if (node.type === 'invoice') {
          return <span key={si} className="text-primary">[Invoice]</span>
        }
        return null
      })}
    </div>
  )
}

function SendingStatusIcon({
  status,
  onRetry
}: {
  status: 'sending' | 'sent' | 'failed'
  onRetry?: () => void
}) {
  switch (status) {
    case 'sending':
      return <Clock className="h-3 w-3 text-muted-foreground" />
    case 'sent':
      return <Check className="h-3 w-3 text-muted-foreground" />
    case 'failed':
      return (
        <button onClick={onRetry} className="flex items-center">
          <AlertCircle className="h-3 w-3 text-destructive" />
        </button>
      )
  }
}
