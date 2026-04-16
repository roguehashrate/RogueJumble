import { cn } from '@/lib/utils'
import { useNostr } from '@/providers/NostrProvider'
import { useZap } from '@/providers/ZapProvider'
import { Zap } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

type TZap = {
  pubkey: string
  amount: number
  invoice: string
  created_at: number
  comment?: string
  eventId: string
}

type TZapMap = Map<string, TZap[]>

export function ZapPills({
  messageId,
  zaps,
  onZap
}: {
  messageId: string
  zaps: TZapMap
  onZap: () => void
}) {
  const { pubkey } = useNostr()
  const { formatBalance } = useZap()
  const { t } = useTranslation()

  const { totalAmount, hasZapped, count } = useMemo(() => {
    const msgZaps = zaps.get(messageId) || []
    return {
      totalAmount: msgZaps.reduce((acc, z) => acc + z.amount, 0),
      hasZapped: pubkey ? msgZaps.some((z) => z.pubkey === pubkey) : false,
      count: msgZaps.length
    }
  }, [messageId, zaps, pubkey])

  const handleClick = useCallback(() => {
    if (!pubkey) return
    onZap()
  }, [messageId, pubkey, onZap])

  if (count === 0) {
    return null
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'mt-1.5 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors',
        hasZapped ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-border/30 hover:border-border'
      )}
      title={t('Zap this message')}
    >
      <Zap
        className={cn(
          'size-3.5',
          hasZapped ? 'fill-yellow-500 text-yellow-500' : 'text-yellow-500'
        )}
      />
      <span className={cn('font-medium', hasZapped ? 'text-yellow-500' : 'text-muted-foreground')}>
        {formatBalance(totalAmount)}
      </span>
    </button>
  )
}
