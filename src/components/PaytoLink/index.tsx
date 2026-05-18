import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  parsePaytoUri,
  buildPaytoUri,
  getCanonicalPaytoType,
  getPaytoTypeInfo,
  getPaytoIconChar,
  isKnownPaytoType,
  isLightningPaytoType
} from '@/lib/payto'
import PaytoDialog from '@/components/PaytoDialog'
import { HelpCircle, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function PaytoLink({
  paytoUri,
  type: typeProp,
  authority: authorityProp,
  pubkey,
  onOpenZap,
  className,
  children
}: {
  paytoUri?: string
  type?: string
  authority?: string
  pubkey?: string
  onOpenZap?: (pubkey: string) => void
  className?: string
  children?: React.ReactNode
}) {
  const { t } = useTranslation()
  const [dialogOpen, setDialogOpen] = useState(false)

  const parsed = paytoUri
    ? parsePaytoUri(paytoUri)
    : typeProp && authorityProp
      ? {
          type: getCanonicalPaytoType(typeProp),
          authority: authorityProp,
          raw: buildPaytoUri(typeProp, authorityProp)
        }
      : null

  if (!parsed) {
    return children ? <span className={className}>{children}</span> : null
  }

  const { type, authority, raw } = parsed
  const info = getPaytoTypeInfo(type)
  const known = isKnownPaytoType(type)
  const isLightning = isLightningPaytoType(type)
  const canZap = isLightning && !!pubkey && !!onOpenZap

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (canZap) {
      onOpenZap(pubkey!)
      return
    }
    if (!known) {
      navigator.clipboard.writeText(raw)
      toast.success(t('Copied to clipboard'))
      return
    }
    setDialogOpen(true)
  }

  const iconChar = getPaytoIconChar(type)
  const content = children ?? <span className="break-all">{authority}</span>

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'text-primary hover:underline cursor-pointer text-left break-words inline-flex items-center gap-1.5',
          className
        )}
        title={known ? t('Click to open payment options') : t('Click to copy address')}
      >
        <span className="shrink-0 flex items-center justify-center w-4 h-4 text-[1rem] leading-none" aria-hidden>
          {iconChar != null ? (
            <span className={cn('inline-flex items-center justify-center', isLightning && 'text-yellow-400')}>
              {iconChar}
            </span>
          ) : (
            <HelpCircle className="size-3.5 text-muted-foreground" />
          )}
        </span>
        {content}
        {known && !canZap && <ExternalLink className="ml-0.5 size-3 shrink-0 opacity-50" />}
      </button>
      {known && (
        <PaytoDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          type={type}
          authority={authority}
          paytoUri={raw}
        />
      )}
    </>
  )
}
