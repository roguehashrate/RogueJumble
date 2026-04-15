import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useZap } from '@/providers/ZapProvider'
import lightningService from '@/services/lightning.service'
import { getAmountFromInvoice } from '@/lib/lightning'
import { Invoice } from '@getalby/lightning-tools'
import { ArrowUpCircle, QrCode, ScanLine } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import QrScanner from 'qr-scanner'

interface SendDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SendDrawer({ open, onOpenChange }: SendDrawerProps) {
  const { t } = useTranslation()
  const { formatBalance, balanceDisplayUnit, toSats } = useZap()
  const [mode, setMode] = useState<'address' | 'invoice'>('address')
  const [lightningAddress, setLightningAddress] = useState('')
  const [invoice, setInvoice] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [parsedAmount, setParsedAmount] = useState<number | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [scannedInvoice, setScannedInvoice] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScanner | null>(null)

  useEffect(() => {
    if (!open) {
      setLightningAddress('')
      setInvoice('')
      setAmount('')
      setMemo('')
      setIsLoading(false)
      setParsedAmount(null)
      setShowScanner(false)
      setScannedInvoice(null)
    }
  }, [open])

  useEffect(() => {
    if (invoice) {
      try {
        const invoiceObj = new Invoice({ pr: invoice })
        setParsedAmount(invoiceObj.satoshi)
      } catch {
        const parsed = getAmountFromInvoice(invoice)
        setParsedAmount(parsed)
      }
    } else {
      setParsedAmount(null)
    }
  }, [invoice])

  const handlePayInvoice = async () => {
    if (!invoice && !scannedInvoice) return
    const invoiceToPay = scannedInvoice || invoice
    setIsLoading(true)
    try {
      const result = await lightningService.payInvoice(invoiceToPay)
      if (result) {
        toast.success(t('Payment sent successfully'))
        onOpenChange(false)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('Payment failed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handlePayAddress = async () => {
    if (!lightningAddress || !amount) return
    setIsLoading(true)
    try {
      const satsAmount = toSats(parseFloat(amount) || 0)
      const result = await lightningService.sendToAddress(lightningAddress, satsAmount, memo)
      if (result) {
        toast.success(t('Payment sent successfully'))
        onOpenChange(false)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('Payment failed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleScan = useCallback(
    async (result: QrScanner.ScanResult) => {
      if (result.data) {
        setScannedInvoice(result.data)
        setShowScanner(false)
        toast.success(t('Invoice scanned'))
      }
    },
    [t]
  )

  const startScanner = async () => {
    try {
      if (videoRef.current) {
        scannerRef.current = new QrScanner(videoRef.current, handleScan, {
          returnDetailedScanResult: true
        })
        await scannerRef.current.start()
        setShowScanner(true)
      }
    } catch (error) {
      console.error('Failed to start scanner:', error)
      toast.error(t('Failed to access camera'))
    }
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop()
      scannerRef.current = null
    }
    setShowScanner(false)
  }

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <ArrowUpCircle className="size-5" />
            {t('Send')}
          </DrawerTitle>
        </DrawerHeader>

        <div
          className="overflow-y-auto overscroll-contain px-4 pb-4"
          style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
        >
          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as 'address' | 'invoice')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="address">{t('Lightning Address')}</TabsTrigger>
              <TabsTrigger value="invoice">{t('Invoice')}</TabsTrigger>
            </TabsList>

            <TabsContent value="address" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lightning-address">{t('Lightning Address')}</Label>
                <div className="relative">
                  <Input
                    id="lightning-address"
                    placeholder="satoshi@bitcoin.org"
                    value={lightningAddress}
                    onChange={(e) => setLightningAddress(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="send-amount">{t('Amount')} ({balanceDisplayUnit})</Label>
                <Input
                  id="send-amount"
                  type="number"
                  placeholder={balanceDisplayUnit === 'sats' ? '100' : balanceDisplayUnit === 'bits' ? '1' : '0.00000100'}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="send-memo">{t('Memo (optional)')}</Label>
                <Input
                  id="send-memo"
                  placeholder={t('Description')}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={handlePayAddress}
                disabled={!lightningAddress || !amount || parseFloat(amount) <= 0 || isLoading}
              >
                {isLoading
                  ? t('Sending...')
                  : t('Send {{amount}}', { amount: formatBalance(toSats(parseFloat(amount) || 0)) })}
              </Button>
            </TabsContent>

            <TabsContent value="invoice" className="mt-4 space-y-4">
              {showScanner ? (
                <div className="relative">
                  <video ref={videoRef} className="w-full rounded-lg" />
                  <Button
                    variant="destructive"
                    className="absolute right-2 top-2"
                    onClick={stopScanner}
                  >
                    {t('Close')}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="invoice">{t('Invoice')}</Label>
                    <div className="relative">
                      <Input
                        id="invoice"
                        placeholder={t('Paste invoice or scan QR')}
                        value={scannedInvoice || invoice}
                        onChange={(e) => {
                          setScannedInvoice(null)
                          setInvoice(e.target.value)
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 size-8 -translate-y-1/2"
                        onClick={() => {
                          if (scannedInvoice) {
                            setScannedInvoice(null)
                          } else {
                            startScanner()
                          }
                        }}
                      >
                        {scannedInvoice ? (
                          <QrCode className="size-4" />
                        ) : (
                          <ScanLine className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {parsedAmount !== null && (
                    <div className="rounded-lg bg-muted/30 p-3 text-center">
                      <div className="text-sm text-muted-foreground">{t('Amount')}</div>
                      <div className="text-xl font-bold">{formatBalance(parsedAmount)}</div>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={handlePayInvoice}
                    disabled={(!invoice && !scannedInvoice) || isLoading}
                  >
                    {isLoading ? t('Sending...') : t('Pay Invoice')}
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
