import { cn } from '@/lib/utils'
import client from '@/services/client.service'
import { TPaymentMethod } from '@/types'
import { HandCoins } from 'lucide-react'
import { Event } from 'nostr-tools'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import TipDialog from '../TipDialog'
import { useStuff } from '@/hooks/useStuff'
import { getPaymentInfoFromEvent } from '@/lib/event-metadata'

export default function TipButton({ stuff }: { stuff: Event | string }) {
  const { t } = useTranslation()
  const { event } = useStuff(stuff)
  const [nonLightningMethods, setNonLightningMethods] = useState<TPaymentMethod[]>([])
  const [openDialog, setOpenDialog] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!event) {
      setNonLightningMethods([])
      setLoading(false)
      return
    }

    let cancelled = false
    const fetchPaymentInfo = async () => {
      try {
        const evt = await client.fetchPaymentInfoEvent(event.pubkey)
        if (!evt || cancelled) {
          if (!cancelled) setLoading(false)
          return
        }

        const info = getPaymentInfoFromEvent(evt)
        const methods = (info?.methods ?? []).filter(
          (m) => m.type !== 'lightning' && m.authority
        )

        if (!cancelled) {
          setNonLightningMethods(methods)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    fetchPaymentInfo()
    return () => { cancelled = true }
  }, [event])

  if (loading || nonLightningMethods.length === 0) return null

  return (
    <>
      <button
        className={cn(
          'relative flex h-full cursor-pointer select-none items-center gap-1 px-3 text-muted-foreground enabled:hover:text-primary'
        )}
        title={t('Tip')}
        onClick={(e) => {
          e.stopPropagation()
          setOpenDialog(true)
        }}
      >
        <HandCoins className="size-4 sm:size-5" />
      </button>
      <TipDialog open={openDialog} setOpen={setOpenDialog} methods={nonLightningMethods} />
    </>
  )
}
