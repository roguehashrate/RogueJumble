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
        'group relative flex h-12 w-12 flex-none items-center justify-center outline-none',
        'text-muted-foreground transition-colors duration-200',
        active && 'text-primary',
        bouncing && '[&>span:last-child]:animate-icon-bounce'
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
      {/* iOS-style active bubble behind the icon */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-1 inset-y-1 rounded-2xl transition-all duration-200',
          active ? 'bg-primary/12 opacity-100' : 'opacity-0'
        )}
      />
      <span
        className={cn(
          'relative z-10 flex size-[26px] items-center justify-center transition-transform duration-150 ease-out group-active:scale-90 [&_svg]:size-[24px] [&_svg]:shrink-0',
          active && 'scale-100 translate-y-0'
        )}
      >
        {children}
      </span>
    </button>
  )
}