import { useCallback, useMemo } from 'react'
import { useNostr } from '@/providers/NostrProvider'
import { cn } from '@/lib/utils'

type TReaction = {
  emoji: string
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
    const map = new Map<string, TReaction[]>()
    
    msgReactions.forEach((r) => {
      if (!map.has(r.emoji)) map.set(r.emoji, [])
      map.get(r.emoji)!.push(r)
    })

    return Array.from(map.entries())
      .map(([emoji, items]) => ({
        emoji,
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

  if (groupedReactions.length === 0) return null

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {groupedReactions.map(({ emoji, count, hasActed }) => (
        <button
          key={emoji}
          onClick={() => handleToggle(emoji)}
          className={cn(
            'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
            hasActed
              ? 'border-primary/40 bg-primary/10'
              : 'border-border/20 hover:border-primary/30 hover:bg-muted/20'
          )}
        >
          <span>{emoji}</span>
          <span className={cn('font-medium', hasActed ? 'text-primary' : 'text-muted-foreground')}>
            {count}
          </span>
        </button>
      ))}
    </div>
  )
}
