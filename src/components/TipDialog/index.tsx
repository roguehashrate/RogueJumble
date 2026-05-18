import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  DrawerTitle
} from '@/components/ui/drawer'
import { useScreenSize } from '@/providers/ScreenSizeProvider'
import { TPaymentMethod } from '@/types'
import { Copy } from 'lucide-react'
import { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  buildPaytoUri,
  getPaytoActionUri,
  getPaytoIconChar,
  getPaytoLogoPath,
  getPaytoTypeInfo
} from '@/lib/payto'

export default function TipDialog({
  open,
  setOpen,
  methods
}: {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
  methods: TPaymentMethod[]
}) {
  const { t } = useTranslation()
  const { isSmallScreen } = useScreenSize()

  const handleOpen = (method: TPaymentMethod) => {
    const actionUri = getPaytoActionUri(method.type, method.authority)
    if (actionUri) {
      window.open(actionUri, '_blank', 'noopener noreferrer')
    } else {
      navigator.clipboard.writeText(method.authority)
      toast.success(t('Copied to Clipboard'))
    }
    setOpen(false)
  }

  const handleCopy = (method: TPaymentMethod) => {
    const paytoUri = method.payto ?? buildPaytoUri(method.type, method.authority)
    navigator.clipboard.writeText(paytoUri)
    toast.success(t('Copied to Clipboard'))
    setOpen(false)
  }

  const content = (
    <div className="flex flex-col gap-3">
      <DialogDescription className="sr-only">
        {t('Select a payment method to send a tip')}
      </DialogDescription>
      {methods.map((method, i) => {
        const info = getPaytoTypeInfo(method.type)
        const iconChar = getPaytoIconChar(method.type)
        const logoPath = getPaytoLogoPath(method.type)
        const label = info?.label ?? method.displayType ?? method.type

        return (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-border/20 bg-card p-3"
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              onClick={() => handleOpen(method)}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                {logoPath ? (
                  <img src={logoPath} alt="" loading="lazy" className="size-5 object-contain" />
                ) : (
                  <span className="text-lg">{iconChar ?? '?'}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{label}</div>
                <div className="truncate text-xs text-muted-foreground">{method.authority}</div>
              </div>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              title={t('Copy')}
              onClick={() => handleCopy(method)}
            >
              <Copy className="size-4" />
            </Button>
          </div>
        )
      })}
    </div>
  )

  if (isSmallScreen) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerOverlay onClick={() => setOpen(false)} />
        <DrawerContent className="mb-4 max-h-[85vh] border-t border-border/20 bg-card/90 backdrop-blur-xl">
          <div
            className="flex-1 overflow-y-auto overscroll-contain px-4 py-4"
            style={{
              touchAction: 'pan-y',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <DrawerHeader className="px-0">
              <DrawerTitle>{t('Send a tip')}</DrawerTitle>
            </DrawerHeader>
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('Send a tip')}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}
