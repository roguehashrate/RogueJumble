import { cn } from '@/lib/utils'
import { Event } from 'nostr-tools'
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
  
  // Find the nonce tag - this is only present when PoW was intentionally mined
  const nonceTag = event.tags.find(tag => tag[0] === 'nonce' && tag.length >= 3)
  
  // Only show if nonce tag exists (meaning PoW was intentionally applied)
  if (!nonceTag) return null
  
  // The difficulty is the third element in the nonce tag
  const pow = parseInt(nonceTag[2], 10)
  
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
