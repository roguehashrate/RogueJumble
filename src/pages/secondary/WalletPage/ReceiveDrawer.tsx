import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useZap } from '@/providers/ZapProvider'
import lightningService from '@/services/lightning.service'
import { ArrowDownCircle, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import QRCodeStyling from 'qr-code-styling'
import { toast } from 'sonner'

interface ReceiveDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ReceiveDrawer({ open, onOpenChange }: ReceiveDrawerProps) {
  const { t } = useTranslation()
  const { balanceDisplayUnit, toSats } = useZap()
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [invoice, setInvoice] = useState<string | null>(null)
  const [qrElement, setQrElement] = useState<HTMLDivElement | null>(null)

  const qrRef = (node: HTMLDivElement | null) => {
    setQrElement(node)
  }

  useEffect(() => {
    if (!open) {
      setAmount('')
      setMemo('')
      setIsLoading(false)
      setInvoice(null)
    }
  }, [open])

  useEffect(() => {
    if (qrElement && invoice) {
      qrElement.innerHTML = ''
      const qrCode = new QRCodeStyling({
        width: 300,
        height: 300,
        data: invoice,
        dotsOptions: {
          color: '#000000'
        },
        backgroundOptions: {
          color: '#ffffff'
        }
      })
      qrCode.append(qrElement)
    }
  }, [qrElement, invoice])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handleGenerateInvoice = async () => {
    if (!amount) return
    setIsLoading(true)
    try {
      const satsAmount = toSats(parseFloat(amount) || 0)
      const result = await lightningService.makeInvoice(satsAmount, memo)
      if (result) {
        setInvoice(result.paymentRequest)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('Failed to generate invoice'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyInvoice = async () => {
    if (invoice) {
      await navigator.clipboard.writeText(invoice)
      toast.success(t('Invoice copied to clipboard'))
    }
  }

  const handleClose = () => {
    setInvoice(null)
    onOpenChange(false)
  }

  const handleNewInvoice = () => {
    setInvoice(null)
  }

  return (
    <>
      <Dialog open={!!invoice} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DialogContent
          hideOverlay
          className="flex h-dvh max-h-dvh flex-col gap-0 border-t border-border/20 bg-card/90 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <ArrowDownCircle className="size-5" />
              {t('Receive')}
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-4 py-8">
            <div className="rounded-xl bg-white p-6 shadow-lg">
              <div ref={qrRef} className="size-[300px]" />
            </div>

            {amount && (
              <div className="text-center text-2xl font-bold">
                {amount} {balanceDisplayUnit}
              </div>
            )}

            <div className="w-full max-w-md space-y-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" className="flex-1" onClick={handleCopyInvoice}>
                  <Copy className="mr-2 size-4" />
                  {t('Copy Invoice')}
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleNewInvoice}>
                  {t('New Invoice')}
                </Button>
              </div>

              <div className="w-full rounded-lg bg-muted/30 p-3">
                <div className="mb-1 text-xs text-muted-foreground">{t('Invoice')}</div>
                <div className="truncate font-mono text-sm">{invoice}</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Drawer
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleClose()
          }
        }}
      >
        <DrawerContent className="max-h-[100dvh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <ArrowDownCircle className="size-5" />
              {t('Receive')}
            </DrawerTitle>
          </DrawerHeader>

          <div
            className="overflow-y-auto overscroll-contain px-4 pb-4"
            style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receive-amount">
                  {t('Amount')} ({balanceDisplayUnit})
                </Label>
                <Input
                  id="receive-amount"
                  type="number"
                  placeholder={
                    balanceDisplayUnit === 'sats'
                      ? '100'
                      : balanceDisplayUnit === 'bits'
                        ? '1'
                        : '0.00000100'
                  }
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receive-memo">{t('Description (optional)')}</Label>
                <Input
                  id="receive-memo"
                  placeholder={t('What is this for?')}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleGenerateInvoice}
                disabled={!amount || isLoading}
              >
                {isLoading ? t('Generating...') : t('Generate Invoice')}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
