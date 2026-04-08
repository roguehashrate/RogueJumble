import { Skeleton } from '@/components/ui/skeleton'
import { LONG_PRESS_THRESHOLD } from '@/constants'
import { cn } from '@/lib/utils'
import { usePrimaryPage } from '@/PageManager'
import { useNostr } from '@/providers/NostrProvider'
import { UserRound } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import LoginDialog from '../LoginDialog'
import { SimpleUserAvatar } from '../UserAvatar'

export default function TitlebarProfileButton() {
  const { navigate, current, display } = usePrimaryPage()
  const { pubkey, profile } = useNostr()
  const [loginDialogOpen, setLoginDialogOpen] = useState(false)
  const active = useMemo(() => current === 'me' && display, [display, current])
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handlePointerDown = () => {
    pressTimerRef.current = setTimeout(() => {
      setLoginDialogOpen(true)
      pressTimerRef.current = null
    }, LONG_PRESS_THRESHOLD)
  }

  const handlePointerUp = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      navigate('me')
      pressTimerRef.current = null
    }
  }

  return (
    <>
      <button
        className={cn(
          'flex size-8 items-center justify-center rounded-full transition-opacity hover:opacity-80',
          active ? 'ring-2 ring-primary' : ''
        )}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        aria-label="Profile"
      >
        {pubkey ? (
          profile ? (
            <SimpleUserAvatar userId={pubkey} className="size-6" />
          ) : (
            <Skeleton className="size-6 rounded-full" />
          )
        ) : (
          <UserRound className="size-5" />
        )}
      </button>
      <LoginDialog open={loginDialogOpen} setOpen={setLoginDialogOpen} />
    </>
  )
}
