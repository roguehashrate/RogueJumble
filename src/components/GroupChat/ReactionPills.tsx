import { useCallback, useMemo } from 'react'
import { useNostr } from '@/providers/NostrProvider'
import customEmojiService from '@/services/custom-emoji.service'
import Emoji from '@/components/Emoji'
import { cn } from '@/lib/utils'
import type { TEmoji } from '@/types'

type TReaction = {
  emoji: string
  emojiInfo?: TEmoji
  pubkey: string
  eventId: string
}

type TReactionMap = Map<string, TReaction[]>

export function ReactionPills({
  messageId,
  reactions,
  onReact
}: {
  messageId: string
  reactions: TReactionMap
  onReact: (messageId: string, emoji: string) => void
}) {
  const { pubkey } = useNostr()

  const groupedReactions = useMemo(() => {
    const msgReactions = reactions.get(messageId) || []
    const map = new Map<string, { reactions: TReaction[]; emojiInfo?: TEmoji }>()

    msgReactions.forEach((r) => {
      if (!map.has(r.emoji)) map.set(r.emoji, { reactions: [], emojiInfo: r.emojiInfo })
      map.get(r.emoji)!.reactions.push(r)
    })

    return Array.from(map.entries())
      .map(([emoji, { reactions: items, emojiInfo }]) => ({
        emoji,
        emojiInfo,
        count: items.length,
        hasActed: items.some((r) => r.pubkey === pubkey)
      }))
      .sort((a, b) => {
        if (a.hasActed && !b.hasActed) return -1
        if (!a.hasActed && b.hasActed) return 1
        return b.count - a.count
      })
  }, [messageId, reactions, pubkey])

  const handleToggle = useCallback(
    (emoji: string) => {
      if (!pubkey) return
      onReact(messageId, emoji)
    },
    [messageId, pubkey, onReact]
  )

  if (groupedReactions.length === 0) {
    return null
  }

  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {groupedReactions.map(({ emoji, emojiInfo, count, hasActed }) => {
        // Try to get custom emoji - priority: emojiInfo from reaction event, then lookup by shortcode
        let customEmoji: TEmoji | undefined = emojiInfo
        if (!customEmoji) {
          // Try to get from custom emoji service
          customEmoji = customEmojiService.getEmojiById(emoji)
        }

        return (
          <button
            key={emoji}
            onClick={() => handleToggle(emoji)}
            className={cn(
              'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
              hasActed ? 'border-primary/50 bg-primary/10' : 'border-border/30 hover:border-border'
            )}
          >
            {customEmoji ? (
              <Emoji emoji={customEmoji} classNames={{ img: 'size-4' }} />
            ) : (
              <span className="text-sm">{emoji}</span>
            )}
            <span
              className={cn('font-medium', hasActed ? 'text-primary' : 'text-muted-foreground')}
            >
              {count}
            </span>
          </button>
        )
      })}
      <button
        onClick={() => onReact(messageId, '😊')}
        className="flex items-center rounded-full px-1.5 py-0.5 text-xs text-muted-foreground/50 transition-colors hover:text-foreground"
      >
        +
      </button>
    </div>
  )
}
