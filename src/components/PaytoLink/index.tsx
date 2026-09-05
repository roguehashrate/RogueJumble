import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  parsePaytoUri,
  buildPaytoUri,
  getCanonicalPaytoType,
  getPaytoTypeInfo,
  getPaytoIconChar,
  getPaytoLogoPath,
  getPaytoProfileUrl,
  isKnownPaytoType,
  isLightningPaytoType
} from '@/lib/payto'
import PaytoDialog from '@/components/PaytoDialog'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function PaytoLink({
  paytoUri,
  type: typeProp,
  authority: authorityProp,
  pubkey,
  onOpenZap,
  className,
  children,
  linkTitle,
  iconOnly
}: {
  paytoUri?: string
  type?: string
  authority?: string
  pubkey?: string
  onOpenZap?: (pubkey: string) => void
  className?: string
  children?: React.ReactNode
  linkTitle?: string
  iconOnly?: boolean
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

  const displayLabel = info?.label ?? type
  const categoryLabel = (() => {
    const c = info?.category
    if (!c) return ''
    if (c === 'bitcoin-layer') return 'Bitcoin layer'
    return c.charAt(0).toUpperCase() + c.slice(1)
  })()
  const logoPath = getPaytoLogoPath(type)
  const iconChar = getPaytoIconChar(type)
  const profileUrl = getPaytoProfileUrl(type, authority)
  const content = children ?? (iconOnly ? null : <span className="break-all">{authority}</span>)
  const overrideTip = linkTitle?.trim()

  const baseTip = (() => {
    if (profileUrl) {
      return categoryLabel
        ? `${displayLabel} (${categoryLabel}): ${t('Open on website')}`
        : `${displayLabel}: ${t('Open on website')}`
    }
    return known && categoryLabel
      ? `${displayLabel} (${categoryLabel}): ${t('Click to open payment options')}`
      : known
        ? `${displayLabel}: ${t('Click to open payment options')}`
        : t('Click to copy address')
  })()
  const tipText = overrideTip ?? (iconOnly ? `${authority} — ${baseTip}` : baseTip)

  const iconEl = (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center',
        iconOnly
          ? 'size-8 rounded-lg border border-border/60 bg-card/70 text-lg'
          : 'h-4 w-4 text-[1rem] leading-none'
      )}
      aria-hidden
    >
      {logoPath ? (
        <img
          src={logoPath}
          alt=""
          loading="lazy"
          className={iconOnly ? 'size-5 object-contain' : 'size-4 object-contain'}
        />
      ) : iconChar != null ? (
        <span
          className={cn(
            'inline-flex items-center justify-center',
            isLightning && 'text-yellow-400'
          )}
        >
          {iconChar}
        </span>
      ) : (
        <HelpCircle className={cn('text-muted-foreground', iconOnly ? 'size-5' : 'size-3.5')} />
      )}
    </span>
  )

  if (profileUrl) {
    return (
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'inline-flex cursor-pointer items-center gap-1.5 break-words text-left text-primary hover:underline',
          className
        )}
        title={tipText}
        aria-label={iconOnly ? authority : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {iconEl}
        {content}
      </a>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'inline-flex cursor-pointer items-center gap-1.5 break-words text-left text-primary hover:underline',
          className
        )}
        title={tipText}
        aria-label={iconOnly ? authority : undefined}
      >
        {iconEl}
        {content}
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
