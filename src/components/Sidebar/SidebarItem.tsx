import { cn } from '@/lib/utils'
import { forwardRef, MouseEventHandler, useState } from 'react'
import { useTranslation } from 'react-i18next'

const SidebarItem = forwardRef<
  HTMLButtonElement,
  {
    children: React.ReactNode
    title: string
    collapse: boolean
    iconRail?: boolean
    description?: string
    active?: boolean
    onClick?: MouseEventHandler
    className?: string
    variant?: string
  }
>(({ children, title, description, className, active, collapse, iconRail, onClick, ...props }, ref) => {
  const { t } = useTranslation()
  const [bouncing, setBouncing] = useState(false)

  const handleClick: MouseEventHandler = (e) => {
    if (!bouncing) {
      setBouncing(true)
      setTimeout(() => setBouncing(false), 300)
    }
    onClick?.(e)
  }

  // Icon rail / collapsed mode: simple icon button like mobile
  if (iconRail || collapse) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'group relative m-0 flex size-14 items-center justify-center rounded-none p-3 text-muted-foreground outline-none [&_svg]:size-6',
          active && 'text-primary',
          bouncing && '[&>svg]:animate-icon-bounce',
          className
        )}
        title={t(title)}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    )
  }

  // Expanded mode: icon + text label
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'm-0 flex h-auto w-full items-center justify-start gap-4 rounded-full bg-transparent px-4 py-2.5 text-lg font-semibold shadow-none transition-all duration-500 [&_svg]:size-5',
        active
          ? 'relative bg-primary/10 text-primary'
          : 'hover:bg-primary/8 hover:text-primary',
        className
      )}
      title={t(title)}
      onClick={handleClick}
      {...props}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
      )}
      {children}
      <div>{t(description ?? title)}</div>
    </button>
  )
})
SidebarItem.displayName = 'SidebarItem'
export default SidebarItem
