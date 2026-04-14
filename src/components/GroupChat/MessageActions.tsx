import { LONG_PRESS_THRESHOLD } from '@/constants'
import { MessageCircle, Smile, Zap, X } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Event } from 'nostr-tools'

export type TGroupMessage = {
  event: Event
  pubkey: string
  created_at: number
}

type TMessageActionsProps = {
  message: TGroupMessage
  onReply?: (message: TGroupMessage) => void
  onReact?: (message: TGroupMessage, emoji: string) => void
  onZap?: (message: TGroupMessage) => void
}

export default function MessageActions({
  message,
  onReply,
  onReact,
  onZap
}: TMessageActionsProps) {
  const { t } = useTranslation()
  const [showActions, setShowActions] = useState(false)
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startXRef = useRef(0)
  const startYRef = useRef(0)

  const handlePointerDown = (e: React.PointerEvent) => {
    startXRef.current = e.clientX
    startYRef.current = e.clientY
    pressTimerRef.current = setTimeout(() => {
      setShowActions(true)
      pressTimerRef.current = null
    }, LONG_PRESS_THRESHOLD)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pressTimerRef.current) {
      const dx = Math.abs(e.clientX - startXRef.current)
      const dy = Math.abs(e.clientY - startYRef.current)
      if (dx > 10 || dy > 10) {
        clearTimeout(pressTimerRef.current)
        pressTimerRef.current = null
      }
    }
  }

  const handlePointerUp = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }

  const handlePointerLeave = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }

  const handleAction = useCallback(
    (action: 'reply' | 'react' | 'zap') => {
      setShowActions(false)
      if (action === 'reply' && onReply) onReply(message)
      if (action === 'react' && onReact) onReact(message, '⚡')
      if (action === 'zap' && onZap) onZap(message)
    },
    [message, onReply, onReact, onZap]
  )

  return (
    <>
      <div
        className="absolute inset-0 z-0 cursor-pointer touch-pan-y"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      />

      {showActions && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
          onClick={() => setShowActions(false)}
        >
          <div
            className="mx-4 w-full max-w-xs overflow-hidden rounded-2xl bg-card/95 backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col">
              <button
                onClick={() => handleAction('reply')}
                className="flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/30"
              >
                <MessageCircle className="size-5 text-primary" />
                <span className="font-medium">{t('Reply')}</span>
              </button>
              <button
                onClick={() => handleAction('react')}
                className="flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/30"
              >
                <Smile className="size-5 text-primary" />
                <span className="font-medium">{t('React')}</span>
              </button>
              <button
                onClick={() => handleAction('zap')}
                className="flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/30"
              >
                <Zap className="size-5 text-yellow-500" />
                <span className="font-medium">{t('Zap')}</span>
              </button>
            </div>
            <div className="border-t border-border/20">
              <button
                onClick={() => setShowActions(false)}
                className="flex w-full items-center justify-center gap-2 px-4 py-3.5 font-medium text-muted-foreground transition-colors hover:bg-muted/30"
              >
                <X className="size-4" />
                {t('Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
