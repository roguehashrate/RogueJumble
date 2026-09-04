import { LONG_PRESS_THRESHOLD } from '@/constants'
import { useStuffStatsById } from '@/hooks/useStuffStatsById'
import { useStuff } from '@/hooks/useStuff'
import { getLightningAddressFromProfile } from '@/lib/lightning'
import { haptic } from '@/lib/haptic'
import { cn } from '@/lib/utils'
import { useNostr } from '@/providers/NostrProvider'
import { useZap } from '@/providers/ZapProvider'
import client from '@/services/client.service'
import lightning from '@/services/lightning.service'
import stuffStatsService from '@/services/stuff-stats.service'
import { Loader, Zap } from 'lucide-react'
import { Event } from 'nostr-tools'
import { MouseEvent, TouchEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import ZapDialog from '../ZapDialog'

export default function ZapButton({ stuff }: { stuff: Event | string }) {
  const { t } = useTranslation()
  const { checkLogin, pubkey } = useNostr()
  const { event, stuffKey } = useStuff(stuff)
  const noteStats = useStuffStatsById(stuffKey)
  const { defaultZapSats, defaultZapComment, quickZap, formatBalance, canSendZaps } = useZap()
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [openZapDialog, setOpenZapDialog] = useState(false)
  const [zapping, setZapping] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [lightningAvailable, setLightningAvailable] = useState(false)
  const { zapAmount, hasZapped } = useMemo(() => {
    return {
      zapAmount: noteStats?.zaps?.reduce((acc, zap) => acc + zap.amount, 0),
      hasZapped: pubkey ? noteStats?.zaps?.some((zap) => zap.pubkey === pubkey) : false
    }
  }, [noteStats, pubkey])
  // A post/user is always on-chain zappable: the recipient's Taproot address is
  // derived purely from their pubkey. The button is disabled only until a login
  // is established, never because the recipient lacks a lightning address.
  const [disable, setDisable] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPressRef = useRef(false)

  const triggerAnimation = () => {
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 700)
  }

  useEffect(() => {
    setDisable(!pubkey)
    if (!event) {
      setLightningAvailable(false)
      return
    }
    let active = true
    client.fetchProfile(event.pubkey).then((profile) => {
      if (!active) return
      setLightningAvailable(
        Boolean(profile && getLightningAddressFromProfile(profile)) && canSendZaps
      )
    })
    return () => {
      active = false
    }
  }, [event, pubkey, canSendZaps])

  const handleZap = async () => {
    try {
      if (!pubkey) {
        throw new Error('You need to be logged in to zap')
      }
      if (zapping || !event) return

      setZapping(true)
      const zapResult = await lightning.zap(pubkey, event, defaultZapSats, defaultZapComment)
      // user canceled
      if (!zapResult) {
        return
      }
      stuffStatsService.addZap(
        pubkey,
        event.id,
        zapResult.invoice,
        defaultZapSats,
        defaultZapComment
      )
      haptic('success')
      triggerAnimation()
    } catch (error) {
      toast.error(`${t('Zap failed')}: ${(error as Error).message}`)
    } finally {
      setZapping(false)
    }
  }

  const handleClickStart = (e: MouseEvent | TouchEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (disable) return

    isLongPressRef.current = false

    if ('touches' in e) {
      const touch = e.touches[0]
      setTouchStart({ x: touch.clientX, y: touch.clientY })
    }

    if (quickZap && lightningAvailable) {
      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true
        checkLogin(() => {
          setOpenZapDialog(true)
          setZapping(true)
        })
      }, LONG_PRESS_THRESHOLD)
    }
  }

  const handleClickEnd = (e: MouseEvent | TouchEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    if (disable) return

    if ('touches' in e) {
      setTouchStart(null)
      if (!touchStart) return
      const touch = e.changedTouches[0]
      const diffX = Math.abs(touch.clientX - touchStart.x)
      const diffY = Math.abs(touch.clientY - touchStart.y)
      if (diffX > 10 || diffY > 10) return
    }

    if (!quickZap) {
      checkLogin(() => {
        setOpenZapDialog(true)
        setZapping(true)
      })
    } else if (lightningAvailable && !isLongPressRef.current) {
      checkLogin(() => handleZap())
    } else {
      // No lightning (or this was a long-press) — open the dialog so the
      // on-chain Bitcoin method stays reachable.
      checkLogin(() => {
        setOpenZapDialog(true)
        setZapping(true)
      })
    }
    isLongPressRef.current = false
  }

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
  }

  return (
    <>
      <button
        className={cn(
          'relative flex h-full cursor-pointer select-none items-center gap-1 px-3 enabled:hover:text-zap disabled:cursor-default disabled:text-muted-foreground/40',
          hasZapped ? 'text-zap' : 'text-muted-foreground',
          isAnimating && 'animate-zap-pulse'
        )}
        title={t('Zap')}
        disabled={disable || zapping}
        onMouseDown={handleClickStart}
        onMouseUp={handleClickEnd}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleClickStart}
        onTouchEnd={handleClickEnd}
      >
        {isAnimating && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/2 top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 animate-spark-out bg-zap [--tw-translate-x:20px] [--tw-translate-y:-20px] rotate-[45deg]" />
            <div className="absolute left-1/2 top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 animate-spark-out bg-zap [--tw-translate-x:-20px] [--tw-translate-y:-20px] rotate-[-45deg] [animation-delay:0.1s]" />
            <div className="absolute left-1/2 top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 animate-spark-out bg-zap [--tw-translate-x:25px] [--tw-translate-y:0px] rotate-[90deg] [animation-delay:0.05s]" />
            <div className="absolute left-1/2 top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 animate-spark-out bg-zap [--tw-translate-x:-25px] [--tw-translate-y:0px] rotate-[-90deg] [animation-delay:0.15s]" />
            <div className="absolute left-1/2 top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 animate-spark-out bg-zap [--tw-translate-x:15px] [--tw-translate-y:25px] rotate-[135deg] [animation-delay:0.08s]" />
            <div className="absolute left-1/2 top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 animate-spark-out bg-zap [--tw-translate-x:-15px] [--tw-translate-y:25px] rotate-[-135deg] [animation-delay:0.12s]" />
            <div className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 animate-ripple rounded-full bg-zap/20" />
          </div>
        )}
        {zapping ? (
          <Loader className="animate-spin" />
        ) : (
          <Zap className={hasZapped ? 'fill-zap' : ''} />
        )}
        {!!zapAmount && <div className="text-sm">{formatBalance(zapAmount)}</div>}
      </button>
      {event && (
        <ZapDialog
          open={openZapDialog}
          setOpen={(open) => {
            setOpenZapDialog(open)
            setZapping(open)
          }}
          pubkey={event.pubkey}
          event={event}
          onSuccess={triggerAnimation}
        />
      )}
    </>
  )
}
