import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { estimateFee } from '@/lib/esplora-api'
import { isValidPubkey } from '@/lib/pubkey'
import { useBitcoin } from '@/providers/BitcoinProvider'
import { useZap } from '@/providers/ZapProvider'
import useSendBitcoin from './useSendBitcoin'
import { onchainZap, resolveOnchainAddress } from '@/services/bitcoin-zap.service'
import { Bitcoin, Check, Loader2, AlertTriangle, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface SendBitcoinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type FeeSpeed = 'fastest' | 'halfHour' | 'economy' | 'custom'

const USD_PRESETS = [1, 5, 20, 50, 100]

const FEE_LABELS: Record<FeeSpeed, string> = {
  fastest: '~10 min',
  halfHour: '~30 min',
  economy: '~1 day',
  custom: 'Custom'
}

export default function SendBitcoinDialog({ open, onOpenChange }: SendBitcoinDialogProps) {
  const { t } = useTranslation()
  const { utxos, feeRates, btcPrice, refresh: refreshOnchain } = useBitcoin()
  const { formatBalance } = useZap()

  const [recipient, setRecipient] = useState('')
  const [usdAmount, setUsdAmount] = useState<number | string>(5)
  const [feeSpeed, setFeeSpeed] = useState<FeeSpeed>('halfHour')
  const [customFeeRate, setCustomFeeRate] = useState('')
  const [error, setError] = useState('')
  const [editingAmount, setEditingAmount] = useState(false)
  const [confirmArmed, setConfirmArmed] = useState(false)
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState<{ txid: string; amountSats: number } | null>(null)
  const amountInputRef = useRef<HTMLInputElement>(null)

  const totalBalance = useMemo(() => utxos?.reduce((s, u) => s + u.value, 0) ?? 0, [utxos])

  const currentFeeRate = useMemo(() => {
    if (feeSpeed === 'custom') {
      const parsed = Math.floor(Number(customFeeRate))
      return Number.isFinite(parsed) && parsed >= 1 ? parsed : 0
    }
    if (!feeRates) return 0
    switch (feeSpeed) {
      case 'fastest':
        return feeRates.fastestFee
      case 'economy':
        return feeRates.economyFee
      default:
        return feeRates.halfHourFee
    }
  }, [feeSpeed, feeRates, customFeeRate])

  const sendBitcoin = useSendBitcoin({ utxos: utxos ?? [], feeRate: currentFeeRate })

  const amountSats = useMemo(() => {
    if (!btcPrice) return 0
    const usd = typeof usdAmount === 'string' ? parseFloat(usdAmount) : usdAmount
    if (!Number.isFinite(usd) || usd <= 0) return 0
    return Math.round((usd / btcPrice) * 100_000_000)
  }, [usdAmount, btcPrice])

  const estimatedFeeSats = useMemo(() => {
    if (!utxos?.length || !currentFeeRate || !amountSats) return 0
    const fee2 = estimateFee(utxos.length, 2, currentFeeRate)
    const change = totalBalance - amountSats - fee2
    const numOutputs = change > 546 ? 2 : 1
    return estimateFee(utxos.length, numOutputs, currentFeeRate)
  }, [utxos, currentFeeRate, amountSats, totalBalance])

  const totalSats = amountSats + estimatedFeeSats
  const insufficient = totalBalance > 0 && totalSats > totalBalance && amountSats > 0
  const isLarge = btcPrice ? totalSats >= ((100 / btcPrice) * 100_000_000) : false

  useEffect(() => setConfirmArmed(false), [amountSats, currentFeeRate, recipient])

  useEffect(() => {
    if (editingAmount) {
      amountInputRef.current?.focus()
      amountInputRef.current?.select()
    }
  }, [editingAmount])

  const reset = () => {
    setRecipient('')
    setUsdAmount(5)
    setFeeSpeed('halfHour')
    setCustomFeeRate('')
    setError('')
    setSuccess(null)
    setConfirmArmed(false)
    setEditingAmount(false)
  }

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  const handleSend = async () => {
    setError('')
    const trimmed = recipient.trim()

    if (!trimmed) {
      setError(t('Enter a recipient address.'))
      return
    }
    if (amountSats <= 0) {
      setError(t('Enter an amount.'))
      return
    }
    if (!utxos?.length) {
      setError(t("You don't have any Bitcoin yet."))
      return
    }
    if (currentFeeRate < 1) {
      setError(t('Enter a fee rate of at least 1 sat/vB.'))
      return
    }
    if (insufficient) {
      setError(t('Not enough Bitcoin for this amount + network fee.'))
      return
    }

    if (isLarge && !confirmArmed) {
      setConfirmArmed(true)
      return
    }

    setPending(true)
    try {
      // If the recipient looks like a hex pubkey, publish a kind 8333 profile
      // zap after broadcast. Otherwise it's a raw bitcoin address.
      const isPubkey = isValidPubkey(trimmed)
      let txid: string
      if (isPubkey) {
        const address = resolveOnchainAddress(trimmed)
        if (!address) {
          throw new Error(t('Could not derive on-chain address.'))
        }
        const result = await onchainZap(trimmed, address, amountSats, utxos, currentFeeRate)
        txid = result.txid
      } else {
        txid = await sendBitcoin.send(trimmed, amountSats)
      }

      setSuccess({ txid, amountSats })
      setTimeout(() => refreshOnchain(), 600)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Failed to send'))
    } finally {
      setPending(false)
    }
  }

  const currentUsd = typeof usdAmount === 'string' ? parseFloat(usdAmount) : usdAmount

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent hideOverlay className="flex max-h-dvh flex-col gap-0 rounded-t-2xl border-t border-border/40 bg-card/90 p-0 backdrop-blur-xl sm:rounded-2xl">
        <div className="flex h-12 flex-shrink-0 items-center justify-between px-4">
          <DialogTitle className="flex items-center gap-1.5 text-base font-semibold">
            <Bitcoin className="size-5 text-zap" />
            {success ? t('Transaction sent') : t('Send Bitcoin')}
          </DialogTitle>
          <button
            onClick={handleClose}
            className="-mr-1.5 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-green-500/10">
                <Check className="size-6 text-green-500" />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-green-600">
                  +{formatBalance(success.amountSats)}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {success.txid.slice(0, 12)}…{success.txid.slice(-6)}
                </p>
              </div>
              <Button className="mt-2 w-full rounded-full" onClick={handleClose}>
                {t('Done')}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {/* Big editable USD amount */}
              <div className="flex flex-col items-center pt-1">
                {editingAmount ? (
                  <div className="flex items-baseline justify-center">
                    <span className={`text-4xl font-semibold ${insufficient ? 'text-destructive' : 'text-muted-foreground'}`}>
                      $
                    </span>
                    <input
                      ref={amountInputRef}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={usdAmount}
                      onChange={(e) => {
                        setUsdAmount(e.target.value)
                        setError('')
                      }}
                      onBlur={() => {
                        setEditingAmount(false)
                        if (typeof usdAmount === 'string' && usdAmount.trim() === '') setUsdAmount(0)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          setEditingAmount(false)
                        }
                      }}
                      aria-label="Amount in USD"
                      className={`bg-transparent text-center text-4xl font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                        insufficient ? 'text-destructive' : ''
                      }`}
                      style={{ width: `${Math.max(2, String(usdAmount).length + 1)}ch` }}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingAmount(true)}
                    aria-label="Edit amount"
                    className="-mx-2 rounded-md px-2 transition-colors hover:bg-muted/50 focus:outline-none"
                  >
                    <span className={`text-4xl font-semibold ${insufficient ? 'text-destructive' : 'text-muted-foreground'}`}>
                      $
                    </span>
                    <span className={`text-4xl font-semibold tabular-nums ${insufficient ? 'text-destructive' : ''}`}>
                      {Number.isFinite(currentUsd) && currentUsd > 0 ? currentUsd : 0}
                    </span>
                  </button>
                )}
                <span className="mt-1 text-xs text-muted-foreground">
                  ≈ {formatBalance(amountSats)}
                </span>
              </div>

              {/* Preset chips */}
              <div className="grid grid-cols-5 gap-1.5">
                {USD_PRESETS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setUsdAmount(v)
                      setEditingAmount(false)
                      setError('')
                    }}
                    className={`h-8 rounded-full text-xs font-semibold transition-colors ${
                      Number(usdAmount) === v
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-muted-foreground hover:bg-muted/70'
                    }`}
                  >
                    ${v}
                  </button>
                ))}
              </div>

              {/* Recipient */}
              <div className="space-y-1.5">
                <Label>{t('To')}</Label>
                <Input
                  placeholder="npub, hex pubkey, or bc1… address"
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value)
                    setError('')
                  }}
                  className="font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  {t('A hex pubkey or npub sends an on-chain zap (kind 8333).')}
                </p>
              </div>

              {/* Error */}
              {error && <p className="text-xs text-destructive">{error}</p>}

              {/* Send */}
              <Button
                onClick={handleSend}
                disabled={pending || amountSats <= 0 || insufficient || !recipient.trim() || currentFeeRate < 1}
                className="w-full rounded-full"
                variant={insufficient || isLarge ? 'destructive' : 'default'}
              >
                {pending ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                    {t('Sending...')}
                  </>
                ) : insufficient ? (
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="size-4" />
                    {t('Not enough Bitcoin')}
                  </span>
                ) : isLarge && confirmArmed ? (
                  `${t('Tap again to send')} $${currentUsd}`
                ) : (
                  `${t('Send')} $${Number.isFinite(currentUsd) && currentUsd > 0 ? currentUsd : 0}`
                )}
              </Button>

              {/* Fee line */}
              {amountSats > 0 && currentFeeRate > 0 && (
                <div className="flex flex-col items-center gap-1 text-xs">
                  <span className="text-muted-foreground">
                    {t('Fee')}{' '}
                    {estimatedFeeSats > 0 ? (
                      <>
                        ≈ ${btcPrice && totalUsd(estimatedFeeSats, btcPrice)}
                        <span className="opacity-60"> · {estimateText()}</span>
                      </>
                    ) : (
                      <span className="opacity-60">· {estimateText()}</span>
                    )}
                  </span>

                  {/* Fee speed pills */}
                  <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
                    {(['fastest', 'halfHour', 'economy'] as FeeSpeed[]).map((s) => {
                      const selected = feeSpeed === s
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setFeeSpeed(s)
                            setError('')
                          }}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            selected ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                          }`}
                        >
                          {FEE_LABELS[s]} · {rateFor(s)}
                        </button>
                      )
                    })}
                    {feeSpeed === 'custom' ? (
                      <span className="flex items-center gap-1">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={1}
                          value={customFeeRate}
                          onChange={(e) => setCustomFeeRate(e.target.value)}
                          placeholder="5"
                          className="h-7 w-16 text-xs"
                          aria-label="Custom fee rate in sat/vB"
                        />
                        <span className="text-muted-foreground">sat/vB</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setFeeSpeed('custom')}
                        className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/70"
                      >
                        {t('Custom')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )

  function rateFor(speed: FeeSpeed): string {
    if (!feeRates) return '…'
    switch (speed) {
      case 'fastest':
        return `${feeRates.fastestFee}`
      case 'economy':
        return `${feeRates.economyFee}`
      default:
        return `${feeRates.halfHourFee}`
    }
  }

  function estimateText(): string {
    if (feeSpeed === 'custom' && currentFeeRate >= 1) return `${currentFeeRate} sat/vB`
    return FEE_LABELS[feeSpeed]
  }
}

function totalUsd(sats: number, btcPrice: number): string {
  return ((sats / 100_000_000) * btcPrice).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  })
}