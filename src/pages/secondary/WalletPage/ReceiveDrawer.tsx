import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useZap } from '@/providers/ZapProvider'
import lightningService from '@/services/lightning.service'
import { ArrowDownCircle, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import QRCodeStyling from 'qr-code-styling'
import { toast } from 'sonner'

interface ReceiveDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ReceiveDrawer({ open, onOpenChange }: ReceiveDrawerProps) {
  const { t } = useTranslation()
  const { formatBalance } = useZap()
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [invoice, setInvoice] = useState<string | null>(null)
  const qrRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      setAmount('')
      setMemo('')
      setIsLoading(false)
      setInvoice(null)
    }
  }, [open])

  useEffect(() => {
    if (invoice && qrRef.current) {
      qrRef.current.innerHTML = ''
      const qrCode = new QRCodeStyling({
        width: 200,
        height: 200,
        data: invoice,
        dotsOptions: {
          color: '#000000'
        },
        backgroundOptions: {
          color: '#ffffff'
        }
      })
      qrCode.append(qrRef.current)
    }
  }, [invoice])

  const handleGenerateInvoice = async () => {
    if (!amount) return
    setIsLoading(true)
    try {
      const result = await lightningService.makeInvoice(parseInt(amount), memo)
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

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
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
          {!invoice ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receive-amount">{t('Amount (sats)')}</Label>
                <Input
                  id="receive-amount"
                  type="number"
                  placeholder="100"
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
          ) : (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="rounded-lg bg-white p-4">
                <div ref={qrRef} className="size-[200px]" />
              </div>

              <div className="w-full space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                  <div className="flex-1 truncate text-sm font-medium">
                    {amount && formatBalance(parseInt(amount))}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => {
                      navigator.clipboard.writeText(amount)
                      toast.success(t('Amount copied'))
                    }}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleCopyInvoice}>
                    <Copy className="mr-2 size-4" />
                    {t('Copy Invoice')}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setInvoice(null)
                    }}
                  >
                    {t('New Invoice')}
                  </Button>
                </div>
              </div>

              <div className="w-full rounded-lg bg-muted/30 p-3">
                <div className="mb-1 text-xs text-muted-foreground">{t('Invoice')}</div>
                <div className="truncate text-sm">{invoice}</div>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
