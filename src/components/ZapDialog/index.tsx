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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useNostr } from '@/providers/NostrProvider'
import { useScreenSize } from '@/providers/ScreenSizeProvider'
import { useZap } from '@/providers/ZapProvider'
import lightning from '@/services/lightning.service'
import stuffStatsService from '@/services/stuff-stats.service'
import { Loader } from 'lucide-react'
import { NostrEvent } from 'nostr-tools'
import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import UserAvatar from '../UserAvatar'
import Username from '../Username'

export default function ZapDialog({
  open,
  setOpen,
  pubkey,
  event,
  defaultAmount,
  defaultComment
}: {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
  pubkey: string
  event?: NostrEvent
  defaultAmount?: number
  defaultComment?: string
}) {
  const { t } = useTranslation()
  const { isSmallScreen } = useScreenSize()
  const drawerContentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleResize = () => {
      if (drawerContentRef.current) {
        drawerContentRef.current.style.setProperty('bottom', `env(safe-area-inset-bottom)`)
      }
    }

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize)
      handleResize() // Initial call in case the keyboard is already open
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize)
      }
    }
  }, [])

  if (isSmallScreen) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerOverlay onClick={() => setOpen(false)} />
        <DrawerContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          ref={drawerContentRef}
          className="mb-4 max-h-[85vh] border-t border-border/20 bg-card/90 backdrop-blur-xl"
        >
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <div className="shrink-0">{t('Zap to')}</div>
              <UserAvatar size="small" userId={pubkey} />
              <Username userId={pubkey} className="h-5 w-0 flex-1 truncate text-start" />
            </DrawerTitle>
            <DialogDescription></DialogDescription>
          </DrawerHeader>
          <ZapDialogContent
            open={open}
            setOpen={setOpen}
            recipient={pubkey}
            event={event}
            defaultAmount={defaultAmount}
            defaultComment={defaultComment}
          />
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="shrink-0">{t('Zap to')}</div>
            <UserAvatar size="small" userId={pubkey} />
            <Username userId={pubkey} className="h-5 max-w-fit flex-1 truncate text-start" />
          </DialogTitle>
        </DialogHeader>
        <ZapDialogContent
          open={open}
          setOpen={setOpen}
          recipient={pubkey}
          event={event}
          defaultAmount={defaultAmount}
          defaultComment={defaultComment}
        />
      </DialogContent>
    </Dialog>
  )
}

function ZapDialogContent({
  setOpen,
  recipient,
  event,
  defaultAmount,
  defaultComment
}: {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
  recipient: string
  event?: NostrEvent
  defaultAmount?: number
  defaultComment?: string
}) {
  const { t, i18n } = useTranslation()
  const { pubkey } = useNostr()
  const { defaultZapSats, defaultZapComment, balanceDisplayUnit, toSats, formatBalance } = useZap()

  const toDisplayUnit = (sats: number): number => {
    switch (balanceDisplayUnit) {
      case 'sats':
        return sats
      case 'bits':
        return sats / 100
      case 'btc':
        return sats / 100000000
    }
  }

  const [amount, setAmount] = useState(defaultAmount ? toDisplayUnit(defaultAmount) : toDisplayUnit(defaultZapSats))
  const [amountInput, setAmountInput] = useState(
    defaultAmount ? toDisplayUnit(defaultAmount).toString() : toDisplayUnit(defaultZapSats).toString()
  )
  const [comment, setComment] = useState(defaultComment ?? defaultZapComment)
  const isSelfZap = useMemo(() => pubkey === recipient, [pubkey, recipient])
  const [zapping, setZapping] = useState(false)

  const handleAmountChange = (value: string) => {
    // Allow empty string
    if (value === '') {
      setAmountInput('')
      setAmount(0)
      return
    }
    
    // Allow just a decimal point or numbers with one decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setAmountInput(value)
      const num = parseFloat(value)
      if (!isNaN(num) && num >= 0) {
        setAmount(num)
      }
    }
  }

  const presetAmounts = useMemo(() => {
    const basePresets = i18n.language.startsWith('zh')
      ? [21, 66, 210, 666, 1000, 2100, 6666, 10000, 21000, 66666, 100000, 210000]
      : [21, 42, 210, 420, 1000, 2100, 4200, 10000, 21000, 42000, 100000, 210000]

    return basePresets.map((sats) => {
      switch (balanceDisplayUnit) {
        case 'sats':
          return { display: sats >= 1000 ? `${(sats / 1000).toFixed(0)}k` : sats.toString(), val: sats }
        case 'bits': {
          const bits = sats / 100
          return { display: bits < 10 ? bits.toFixed(1) : bits.toFixed(0), val: bits }
        }
        case 'btc': {
          const btc = sats / 100000000
          return { display: btc < 0.001 ? btc.toFixed(6) : btc.toFixed(4), val: btc }
        }
      }
    })
  }, [i18n.language, balanceDisplayUnit])

  const handleZap = async () => {
    try {
      if (!pubkey) {
        throw new Error('You need to be logged in to zap')
      }
      const satsAmount = toSats(amount)
      setZapping(true)
      const zapResult = await lightning.zap(pubkey, event ?? recipient, satsAmount, comment, () =>
        setOpen(false)
      )
      // user canceled
      if (!zapResult) {
        return
      }
      if (event) {
        stuffStatsService.addZap(pubkey, event.id, zapResult.invoice, satsAmount, comment)
      }
    } catch (error) {
      toast.error(`${t('Zap failed')}: ${(error as Error).message}`)
    } finally {
      setZapping(false)
    }
  }

  return (
    <>
      {/* Amount input */}
      <div className="flex flex-col items-center">
        <div className="flex w-full justify-center">
          <input
            id="amount"
            value={amountInput}
            onChange={(e) => handleAmountChange(e.target.value)}
            onFocus={(e) => {
              requestAnimationFrame(() => {
                const val = e.target.value
                e.target.setSelectionRange(val.length, val.length)
              })
            }}
            className="w-full bg-transparent p-0 text-center text-6xl font-bold focus-visible:outline-none"
          />
        </div>
        <Label htmlFor="amount">{balanceDisplayUnit.charAt(0).toUpperCase() + balanceDisplayUnit.slice(1)}</Label>
      </div>

      {/* Self-zap easter egg warning */}
      {isSelfZap && (
        <div className="rounded-md border border-zap/30 bg-zap/10 px-4 py-2 text-center text-sm text-zap">
          {t('selfZapWarning')}
        </div>
      )}

      {/* Preset amount buttons */}
      <div className="grid grid-cols-6 gap-2">
        {presetAmounts.map(({ display, val }) => (
          <Button variant="secondary" key={val} onClick={() => {
            setAmount(val)
            setAmountInput(val.toString())
          }}>
            {display}
          </Button>
        ))}
      </div>

      {/* Comment input */}
      <div>
        <Label htmlFor="comment">{t('zapComment')}</Label>
        <Input id="comment" value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>

      <Button onClick={handleZap}>
        {zapping && <Loader className="animate-spin" />} {t('Zap {{amount}}', { amount: formatBalance(toSats(amount)) })}
      </Button>
    </>
  )
}
