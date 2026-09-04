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
import { Skeleton } from '@/components/ui/skeleton'
import QrCode from '@/components/QrCode'
import SecondaryPageLayout from '@/layouts/SecondaryPageLayout'
import { toRizful, toWalletHistory } from '@/lib/link'
import { useNostr } from '@/providers/NostrProvider'
import { useZap } from '@/providers/ZapProvider'
import { useScreenSize } from '@/providers/ScreenSizeProvider'
import { useBitcoin } from '@/providers/BitcoinProvider'
import { disconnect, launchModal } from '@getalby/bitcoin-connect-react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bitcoin,
  Check,
  Copy,
  RefreshCw,
  Send,
  Settings,
  Wallet,
  Zap
} from 'lucide-react'
import { forwardRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import SendDrawer from './SendDrawer'
import ReceiveDrawer from './ReceiveDrawer'
import TransactionItem from './TransactionItem'
import PaymentTargetsPanel from './PaymentTargetsPanel'
import WalletSplash from './WalletSplash'
import SendBitcoinDialog from './SendBitcoinDialog'

interface WalletPageProps {
  index?: number
}

const WalletPage = forwardRef(({ index }: WalletPageProps, ref) => {
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
    refreshTransactionHistory,
    zapChoice
  } = useZap()
  const { isSupported, address, addressData, btcPrice, transactions, loadingAddress, error, refresh } =
    useBitcoin()
  const { pubkey } = useNostr()
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false)
  const [sendDrawerOpen, setSendDrawerOpen] = useState(false)
  const [receiveDrawerOpen, setReceiveDrawerOpen] = useState(false)
  const [sendOnchainOpen, setSendOnchainOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [txOpen, setTxOpen] = useState(true)

  const balanceSats = addressData?.totalBalance ?? 0
  const pendingSats = addressData?.pendingBalance ?? 0
  const truncatedAddress = address ? `${address.slice(0, 12)}...${address.slice(-8)}` : ''

  const copyAddress = async () => {
    if (!address) return
    await navigator.clipboard.writeText(address)
    setCopiedAddress(true)
    setTimeout(() => setCopiedAddress(false), 2000)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([refresh(), refreshTransactionHistory()])
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
        丰({t('Sats')}) {balanceDisplayUnit === 'sats' && ' ✓'}
      </div>
      <div
        className="clickable flex items-center px-4 py-3 text-sm"
        onClick={() => {
          setBalanceDisplayUnit('bits')
          setSettingsDrawerOpen(false)
        }}
      >
        μ₿({t('Bits')}) {balanceDisplayUnit === 'bits' && ' ✓'}
      </div>
      <div
        className="clickable flex items-center px-4 py-3 text-sm"
        onClick={() => {
          setBalanceDisplayUnit('btc')
          setSettingsDrawerOpen(false)
        }}
      >
        ₿({t('BTC')}) {balanceDisplayUnit === 'btc' && ' ✓'}
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
          丰({t('Sats')}) {balanceDisplayUnit === 'sats' && '✓'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setBalanceDisplayUnit('bits')}>
          μ₿({t('Bits')}) {balanceDisplayUnit === 'bits' && '✓'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setBalanceDisplayUnit('btc')}>
          ₿({t('BTC')}) {balanceDisplayUnit === 'btc' && '✓'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  // ── Lightning section helpers (gated by zapChoice) ────────────
  const LightningSection = () => {
    if (zapChoice === 'undecided') return <WalletSplash />
    if (zapChoice === 'no') {
      return (
        <div className="rounded-2xl border border-border/40 bg-card/40 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <Zap className="size-5 text-muted-foreground/60" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{t('Lightning zaps are off')}</p>
              <p className="text-xs text-muted-foreground">
                {t('You can still receive on-chain and share payment methods.')}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full rounded-full"
            onClick={() => launchModal()}
          >
            <Zap className="mr-1.5 size-3.5" />
            {t('Turn on Lightning')}
          </Button>
        </div>
      )
    }
    if (!isWalletConnected) {
      return (
        <div className="flex items-center gap-2 px-4 pt-3">
          <Button className="bg-foreground hover:bg-foreground/90" onClick={() => push(toRizful())}>
            {t('Start with a Rizful Vault')}
          </Button>
          <Button
            variant="link"
            className="px-0 text-muted-foreground hover:text-foreground"
            onClick={() => launchModal()}
          >
            {t('or other wallets')}
          </Button>
        </div>
      )
    }
    return (
      <div className="space-y-4 pt-3">
        <div className="rounded-2xl border border-border/40 bg-card/40 p-4 backdrop-blur-sm">
          {walletInfo?.node.alias && (
            <div className="mb-2 text-xs text-muted-foreground">{walletInfo.node.alias}</div>
          )}
          <div className="flex items-center gap-2 text-2xl font-bold">
            <Zap className="size-5 text-zap" />
            {balance !== null ? formatBalance(balance) : <Skeleton className="h-6 w-20" />}
          </div>
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
                <Button variant="ghost" size="sm" className="flex-1">
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
            className="flex h-20 flex-col gap-1.5 rounded-2xl py-4"
            onClick={() => setSendDrawerOpen(true)}
          >
            <ArrowUpRight className="size-6" />
            <span className="text-sm font-medium">{t('Send')}</span>
          </Button>
          <Button
            variant="outline"
            className="flex h-20 flex-col gap-1.5 rounded-2xl py-4"
            onClick={() => setReceiveDrawerOpen(true)}
          >
            <ArrowDownLeft className="size-6" />
            <span className="text-sm font-medium">{t('Receive')}</span>
          </Button>
        </div>

        {recentTransactions.length > 0 && (
          <div className="rounded-2xl border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Zap className="size-4 text-zap" />
                {t('Recent Transactions')}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground"
                onClick={() => push(toWalletHistory())}
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
      </div>
    )
  }

  return (
    <>
      <SecondaryPageLayout ref={ref} index={index} title={t('Wallet')} controls={controls}>
        {!pubkey ? (
          <div className="flex items-center gap-2 px-4 pt-3">
            <Button className="bg-foreground hover:bg-foreground/90" onClick={() => push(toRizful())}>
              {t('Start with a Rizful Vault')}
            </Button>
            <Button
              variant="link"
              className="px-0 text-muted-foreground hover:text-foreground"
              onClick={() => launchModal()}
            >
              {t('or other wallets')}
            </Button>
          </div>
        ) : (
          <div className="mb-4 flex flex-col items-center space-y-6 px-4 pt-6">
            {/* ── On-chain wallet (always present) ─────────────── */}
            {pubkey && address ? (
              <div className="flex w-full max-w-sm flex-col items-center space-y-5">
                {loadingAddress ? (
                  <div className="flex flex-col items-center space-y-2">
                    <Skeleton className="h-10 w-40 rounded-lg" />
                    <Skeleton className="h-4 w-24 rounded" />
                  </div>
                ) : error ? (
                  <div className="text-center">
                    <p className="text-sm text-destructive">{t('Failed to load balance')}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 rounded-full"
                      onClick={refresh}
                    >
                      <RefreshCw className="mr-1.5 size-3.5" />
                      {t('Retry')}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-1">
                    <span className="flex items-center gap-2 text-4xl font-bold tracking-tight">
                      <Bitcoin className="size-7 text-zap" />
                      {btcPrice ? (
                        <>
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            maximumFractionDigits: 2
                          }).format((balanceSats / 100_000_000) * btcPrice)}
                        </>
                      ) : (
                        '---'
                      )}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatBalance(balanceSats)}
                    </span>

                    {pendingSats !== 0 && (
                      <span className="flex items-center gap-1 pt-1 text-xs text-orange-500">
                        <RefreshCw className="size-3 animate-spin" />
                        {btcPrice
                          ? `${new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              maximumFractionDigits: 2
                            }).format((pendingSats / 100_000_000) * btcPrice)} pending`
                          : `${formatBalance(pendingSats)} pending`}
                      </span>
                    )}
                    <span className="mt-1 text-xs font-medium text-muted-foreground/80">
                      {t('On-chain wallet from your Nostr identity')}
                    </span>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-full"
                  onClick={() => setSendOnchainOpen(true)}
                  disabled={loadingAddress || !!error || balanceSats === 0 || !isSupported}
                >
                  <Send className="mr-1.5 size-3.5" />
                  {t('Send Bitcoin')}
                </Button>

                <div className="rounded-2xl bg-card/60 p-3 backdrop-blur-sm">
                  <QrCode value={address} size={188} />
                </div>

                <button
                  onClick={copyAddress}
                  className="flex cursor-pointer items-center gap-2 rounded-full border bg-card/40 px-4 py-2 font-mono text-sm text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted/50"
                >
                  <Wallet className="size-3.5" />
                  {truncatedAddress}
                  {copiedAddress ? (
                    <Check className="size-3.5 text-green-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </button>

                {transactions.length > 0 && (
                  <div className="w-full">
                    <button
                      onClick={() => setTxOpen((o) => !o)}
                      className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {t('On-chain transactions')}
                      <span className={`transition-transform duration-200 ${txOpen ? 'rotate-180' : ''}`}>
                        ▾
                      </span>
                    </button>
                    {txOpen && (
                      <div className="mt-2 w-full divide-y rounded-2xl border bg-card/60 px-4 backdrop-blur-sm">
                        {transactions.map((tx) => (
                          <OnchainTxRow
                            key={tx.txid}
                            txid={tx.txid}
                            type={tx.type}
                            amount={tx.amount}
                            formatBalance={formatBalance}
                            btcPrice={btcPrice}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : !isSupported ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                  <Bitcoin className="size-7 text-primary" />
                </div>
                <p className="max-w-xs text-sm text-muted-foreground">
                  {t('Sign in with a secret key to view and manage your on-chain Bitcoin.')}
                </p>
              </div>
            ) : null}

            {pubkey && address && !isSupported && (
              <p className="text-xs text-muted-foreground">
                {t('Read-only balance. Sign in with a secret key to send on-chain.')}
              </p>
            )}

            {/* ── Payment targets (always present) ─────────────── */}
            <div className="w-full" data-blur>
              <PaymentTargetsPanel pubkey={pubkey} />
            </div>

            {/* ── Lightning zaps (gated by zapChoice) ──────────── */}
            <div className="w-full">
              <LightningSection />
            </div>
          </div>
        )}
      </SecondaryPageLayout>

      <SendDrawer open={sendDrawerOpen} onOpenChange={setSendDrawerOpen} />
      <ReceiveDrawer open={receiveDrawerOpen} onOpenChange={setReceiveDrawerOpen} />
      <SendBitcoinDialog open={sendOnchainOpen} onOpenChange={setSendOnchainOpen} />
    </>
  )
})

interface OnchainTxRowProps {
  txid: string
  type: 'receive' | 'send'
  amount: number
  formatBalance: (sats: number) => string
  btcPrice: number | null
}

function OnchainTxRow({ txid, type, amount, formatBalance, btcPrice }: OnchainTxRowProps) {
  const { t } = useTranslation()
  const isReceive = type === 'receive'
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div
          className={`flex size-8 items-center justify-center rounded-full ${
            isReceive
              ? 'bg-green-500/10 text-green-600'
              : 'bg-red-500/10 text-red-600'
          }`}
        >
          {isReceive ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
        </div>
        <div>
          <p className="text-sm font-medium">
            {isReceive ? t('Received') : t('Sent')}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            {txid.slice(0, 10)}…{txid.slice(-4)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-sm font-medium ${isReceive ? 'text-green-600' : 'text-red-600'}`}>
          {isReceive ? '+' : '-'}
          {formatBalance(amount)}
        </div>
        {btcPrice && btcPrice > 0 && (
          <div className="text-xs text-muted-foreground">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 2
            }).format((amount / 100_000_000) * btcPrice)}
          </div>
        )}
      </div>
    </div>
  )
}

WalletPage.displayName = 'WalletPage'
export default WalletPage