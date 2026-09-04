import { Button } from '@/components/ui/button'
import PaytoLink from '@/components/PaytoLink'
import { useFetchPaymentInfo } from '@/hooks/useFetchPaymentInfo'
import { toProfileEditor } from '@/lib/link'
import { useSecondaryPage } from '@/PageManager'
import { useNostr } from '@/providers/NostrProvider'
import { TPaymentMethod } from '@/types'
import { Loader2, Pencil } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export default function PaymentTargetsPanel({ pubkey }: { pubkey: string }) {
  const { t } = useTranslation()
  const { push } = useSecondaryPage()
  const { profile } = useNostr()
  const { paymentInfo, isFetching } = useFetchPaymentInfo(pubkey)

  const methods = useMemo(() => {
    const list: TPaymentMethod[] = [...(paymentInfo?.methods ?? [])]
    if (!list.some((m) => m.type === 'lightning') && profile?.lightningAddress) {
      list.push({ type: 'lightning', authority: profile.lightningAddress })
    }
    return list
  }, [paymentInfo, profile?.lightningAddress])

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card p-4">
        <div className="text-sm font-semibold">{t('Accept Donations')}</div>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          {t('Let supporters send you crypto and tips. Share these details with anyone who wants to pay you.')}
        </p>

        <div className="mt-3 space-y-2">
          {isFetching ? (
            <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              {t('Loading…')}
            </div>
          ) : methods.length > 0 ? (
            methods.map((m, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 rounded-lg border bg-card/50 px-3 py-2.5"
              >
                <PaytoLink type={m.type} authority={m.authority} className="text-sm" />
              </div>
            ))
          ) : (
            <p className="py-2 text-xs text-muted-foreground">
              {t("You haven't added any payment methods yet.")}
            </p>
          )}
        </div>
      </div>

      <Button variant="outline" className="w-full gap-2" onClick={() => push(toProfileEditor())}>
        <Pencil className="size-4" />
        {t('Edit payment methods')}
      </Button>
    </div>
  )
}