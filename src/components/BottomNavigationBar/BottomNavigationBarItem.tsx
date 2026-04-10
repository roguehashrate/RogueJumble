import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MouseEventHandler, useState } from 'react'

export default function BottomNavigationBarItem({
  children,
  active = false,
  onClick,
  onPointerDown,
  onPointerUp
}: {
  children: React.ReactNode
  active?: boolean
  onClick?: MouseEventHandler
  onPointerDown?: MouseEventHandler
  onPointerUp?: MouseEventHandler
}) {
  const [bouncing, setBouncing] = useState(false)

  const handleClick: MouseEventHandler = (e) => {
    if (!bouncing) {
      setBouncing(true)
      setTimeout(() => setBouncing(false), 300)
    }
    onClick?.(e)
  }

  return (
    <Button
      className={cn(
        'group relative m-0 flex h-12 w-full items-center justify-center rounded-none bg-transparent p-3 text-muted-foreground shadow-none transition-colors hover:text-primary active:scale-95 [&_svg]:size-6',
        active && 'text-primary',
        bouncing && '[&>svg]:animate-icon-bounce',
        'navbar-btn'
      )}
      variant="ghost"
      onClick={handleClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      {children}
    </Button>
  )
}
