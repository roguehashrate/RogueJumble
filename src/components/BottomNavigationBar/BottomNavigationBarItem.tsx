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
    <button
      type="button"
      className={cn(
        'group relative m-0 flex h-12 w-full items-center justify-center rounded-none p-3 text-muted-foreground outline-none [&_svg]:size-6',
        active && 'text-primary',
        bouncing && '[&>svg]:animate-icon-bounce'
      )}
      style={{
        WebkitTapHighlightColor: 'transparent',
        backgroundColor: 'transparent',
        boxShadow: 'none',
        outline: 'none'
      }}
      onClick={handleClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      {children}
    </button>
  )
}
