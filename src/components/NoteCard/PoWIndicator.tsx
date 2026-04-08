import { cn } from '@/lib/utils'
import { Event } from 'nostr-tools'
import { getPow } from 'nostr-tools/nip13'
import { useTranslation } from 'react-i18next'
import { Pickaxe } from 'lucide-react'

export default function PoWIndicator({
  event,
  className
}: {
  event: Event
  className?: string
}) {
  const { t } = useTranslation()

  // Only show if nonce tag exists (meaning PoW was intentionally applied)
  const nonceTag = event.tags.find(tag => tag[0] === 'nonce' && tag.length >= 3)
  if (!nonceTag) return null

  // Calculate the actual achieved difficulty from the event ID
  const pow = getPow(event.id)

  return (
    <span
      className={cn(
        'flex shrink-0 items-center gap-1 text-sm text-primary',
        className
      )}
      title={t('Proof of Work (difficulty {{minPow}})', { minPow: pow })}
    >
      <Pickaxe size={12} className="shrink-0" />
      <span>{pow}</span>
    </span>
  )
}
