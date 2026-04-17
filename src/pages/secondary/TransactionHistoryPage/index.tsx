import SecondaryPageLayout from '@/layouts/SecondaryPageLayout'
import { useZap } from '@/providers/ZapProvider'
import { forwardRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import TransactionItem from '../WalletPage/TransactionItem'

const TransactionHistoryPage = forwardRef(({ index }: { index?: number }, ref) => {
  const { t } = useTranslation()
  const { transactionHistory, refreshTransactionHistory } = useZap()
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    refreshTransactionHistory()
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshTransactionHistory()
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <SecondaryPageLayout ref={ref} index={index} title={t('Transaction History')}>
      <div className="space-y-4 px-4 pt-3">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="w-full rounded-lg border bg-card px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {isRefreshing ? t('Refreshing...') : t('Refresh')}
        </button>

        {transactionHistory.length > 0 ? (
          <div className="rounded-xl border bg-card">
            <div className="divide-y px-4">
              {transactionHistory.map((tx) => (
                <TransactionItem key={tx.id} transaction={tx} />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-8 text-center">
            <div className="text-sm text-muted-foreground">{t('No transactions yet')}</div>
          </div>
        )}
      </div>
    </SecondaryPageLayout>
  )
})

TransactionHistoryPage.displayName = 'TransactionHistoryPage'

export default TransactionHistoryPage
