import { useDeepBrowsing } from '@/providers/DeepBrowsingProvider'
import { cn } from '@/lib/utils'

export function Titlebar({
  children,
  className,
  hideBottomBorder = false,
  autoHide = false,
  hideThreshold = 800
}: {
  children?: React.ReactNode
  className?: string
  hideBottomBorder?: boolean
  autoHide?: boolean
  hideThreshold?: number
}) {
  let deepBrowsing = false
  let lastScrollTop = 0
  try {
    const ctx = useDeepBrowsing()
    deepBrowsing = ctx.deepBrowsing
    lastScrollTop = ctx.lastScrollTop
  } catch {
    // Not inside a DeepBrowsingProvider — autoHide won't work
  }

  const shouldHide = autoHide && deepBrowsing && lastScrollTop > hideThreshold

  return (
    <div
      className={cn(
        'sticky top-0 z-40 h-12 w-full select-none bg-background/80 px-2 [&_svg]:size-5 [&_svg]:shrink-0',
        !hideBottomBorder && 'border-b',
        'transition-transform duration-300',
        shouldHide && '-translate-y-full',
        className
      )}
    >
      {children}
      {!hideBottomBorder && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
      )}
    </div>
  )
}
