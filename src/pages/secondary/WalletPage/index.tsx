import { useSecondaryPage } from '@/PageManager'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import SecondaryPageLayout from '@/layouts/SecondaryPageLayout'
import { toRizful, toWalletHistory } from '@/lib/link'
import { useZap } from '@/providers/ZapProvider'
import { useScreenSize } from '@/providers/ScreenSizeProvider'
import { disconnect, launchModal } from '@getalby/bitcoin-connect-react'
import { ArrowDownCircle, ArrowUpCircle, History, RefreshCw, Settings } from 'lucide-react'
import { forwardRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import SendDrawer from './SendDrawer'
import ReceiveDrawer from './ReceiveDrawer'
import TransactionItem from './TransactionItem'
import { toast } from 'sonner'

const WalletPage = forwardRef(({ index }: { index?: number }, ref) => {
  const { t } = useTranslation()
  const { push } = useSecondaryPage()
  const { isSmallScreen } = useScreenSize()
  const {
    isWalletConnected,
    walletInfo,
    balance,
    balanceDisplayUnit,
    setBalanceDisplayUnit,
    formatBalance,
    transactionHistory,
    refreshTransactionHistory
  } = useZap()
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false)
  const [sendDrawerOpen, setSendDrawerOpen] = useState(false)
  const [receiveDrawerOpen, setReceiveDrawerOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (isWalletConnected) {
      refreshTransactionHistory()
    }
  }, [isWalletConnected])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshTransactionHistory()
      toast.success(t('History refreshed'))
    } catch {
      toast.error(t('Failed to refresh history'))
    } finally {
      setIsRefreshing(false)
    }
  }

  const recentTransactions = transactionHistory.slice(0, 5)

  const BalanceUnitOptions = () => (
    <>
      <div
        className="clickable flex items-center px-4 py-3 text-sm"
        onClick={() => {
          setBalanceDisplayUnit('sats')
          setSettingsDrawerOpen(false)
        }}
      >
        {t('Sats')} {balanceDisplayUnit === 'sats' && ' ✓'}
      </div>
      <div
        className="clickable flex items-center px-4 py-3 text-sm"
        onClick={() => {
          setBalanceDisplayUnit('bits')
          setSettingsDrawerOpen(false)
        }}
      >
        μ {t('Bits')} {balanceDisplayUnit === 'bits' && ' ✓'}
      </div>
      <div
        className="clickable flex items-center px-4 py-3 text-sm"
        onClick={() => {
          setBalanceDisplayUnit('btc')
          setSettingsDrawerOpen(false)
        }}
      >
        ₿ {t('BTC')} {balanceDisplayUnit === 'btc' && ' ✓'}
      </div>
    </>
  )

  const controls = isSmallScreen ? (
    <Drawer open={settingsDrawerOpen} onOpenChange={setSettingsDrawerOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={() => setSettingsDrawerOpen(true)}
      >
        <Settings className="size-4" />
      </Button>
      <DrawerContent className="max-h-[85vh] border-t border-border/20 bg-card/90 backdrop-blur-xl">
        <div
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-4"
          style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
        >
          <div className="px-4 py-3 text-sm font-semibold">{t('Balance Display Unit')}</div>
          <BalanceUnitOptions />
        </div>
      </DrawerContent>
    </Drawer>
  ) : (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7">
          <Settings className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setBalanceDisplayUnit('sats')}>
          {t('Sats')} {balanceDisplayUnit === 'sats' && '✓'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setBalanceDisplayUnit('bits')}>
          μ {t('Bits')} {balanceDisplayUnit === 'bits' && '✓'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setBalanceDisplayUnit('btc')}>
          ₿ {t('BTC')} {balanceDisplayUnit === 'btc' && '✓'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <>
      <SecondaryPageLayout ref={ref} index={index} title={t('Wallet')} controls={controls}>
        {isWalletConnected ? (
          <div className="space-y-4 px-4 pt-3">
            <div className="rounded-xl border bg-card p-5">
              {walletInfo?.node.alias && (
                <div className="mb-3 text-sm text-muted-foreground">{walletInfo.node.alias}</div>
              )}
              {balance !== null && (
                <div className="text-3xl font-bold">{formatBalance(balance)}</div>
              )}
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`mr-2 size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {t('Refresh')}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="flex-1">
                      {t('Disconnect')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('Are you absolutely sure?')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('You will not be able to send zaps to others.')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" onClick={() => disconnect()}>
                        {t('Disconnect')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="flex h-24 flex-col gap-2 py-4"
                onClick={() => setSendDrawerOpen(true)}
              >
                <ArrowUpCircle className="size-8" />
                <span className="text-sm font-medium">{t('Send')}</span>
              </Button>
              <Button
                variant="outline"
                className="flex h-24 flex-col gap-2 py-4"
                onClick={() => setReceiveDrawerOpen(true)}
              >
                <ArrowDownCircle className="size-8" />
                <span className="text-sm font-medium">{t('Receive')}</span>
              </Button>
            </div>

            {transactionHistory.length > 0 && (
              <div className="rounded-xl border bg-card">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <History className="size-4" />
                    {t('Recent Transactions')}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-muted-foreground"
                    onClick={() => {
                      push(toWalletHistory())
                    }}
                  >
                    {t('View All')}
                  </Button>
                </div>
                <div className="divide-y px-4">
                  {recentTransactions.map((tx) => (
                    <TransactionItem key={tx.id} transaction={tx} />
                  ))}
                </div>
              </div>
            )}

            {transactionHistory.length === 0 && (
              <div className="rounded-xl border bg-card p-8 text-center">
                <History className="mx-auto mb-3 size-10 text-muted-foreground/50" />
                <div className="text-sm text-muted-foreground">{t('No transactions yet')}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 pt-3">
            <Button
              className="bg-foreground hover:bg-foreground/90"
              onClick={() => push(toRizful())}
            >
              {t('Start with a Rizful Vault')}
            </Button>
            <Button
              variant="link"
              className="px-0 text-muted-foreground hover:text-foreground"
              onClick={() => {
                launchModal()
              }}
            >
              {t('or other wallets')}
            </Button>
          </div>
        )}
      </SecondaryPageLayout>

      <SendDrawer open={sendDrawerOpen} onOpenChange={setSendDrawerOpen} />
      <ReceiveDrawer open={receiveDrawerOpen} onOpenChange={setReceiveDrawerOpen} />
    </>
  )
})
WalletPage.displayName = 'WalletPage'
export default WalletPage
