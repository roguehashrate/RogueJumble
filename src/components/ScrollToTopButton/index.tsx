import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useDeepBrowsing } from '@/providers/DeepBrowsingProvider'
import { useScreenSize } from '@/providers/ScreenSizeProvider'
import { hasBackgroundAudioAtom } from '@/services/media-manager.service'
import { useAtomValue } from 'jotai'
import { ChevronUp } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export default function ScrollToTopButton({
  scrollAreaRef,
  className
}: {
  scrollAreaRef?: React.RefObject<HTMLDivElement>
  className?: string
}) {
  const { deepBrowsing, lastScrollTop } = useDeepBrowsing()
  const { isSmallScreen } = useScreenSize()
  const hasBackgroundAudio = useAtomValue(hasBackgroundAudioAtom)
  const visible = useMemo(() => !deepBrowsing && lastScrollTop > 800, [deepBrowsing, lastScrollTop])
  const [justClicked, setJustClicked] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleScrollToTop = useCallback(() => {
    setJustClicked(true)
    buttonRef.current?.blur()
    if (!scrollAreaRef) {
      // scroll to top with custom animation
      const startPosition = window.pageYOffset || document.documentElement.scrollTop
      const duration = 500
      const startTime = performance.now()

      const easeInOutQuad = (t: number) => {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      }

      const scroll = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        const ease = easeInOutQuad(progress)

        const position = startPosition * (1 - ease)
        window.scrollTo(0, position)

        if (progress < 1) {
          requestAnimationFrame(scroll)
        }
      }

      requestAnimationFrame(scroll)
      return
    }
    scrollAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [scrollAreaRef])

  useEffect(() => {
    if (!visible) {
      setJustClicked(false)
    }
  }, [visible])

  useEffect(() => {
    if (justClicked) {
      const timer = setTimeout(() => setJustClicked(false), 300)
      return () => clearTimeout(timer)
    }
  }, [justClicked])

  return (
    <div
      className={cn(
        'pointer-events-none sticky z-50 flex w-full justify-end pr-3 transition-all duration-700',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        className
      )}
      style={{
        bottom: isSmallScreen
          ? `calc(env(safe-area-inset-bottom) + ${hasBackgroundAudio ? 8.5 : 5}rem)`
          : `calc(env(safe-area-inset-bottom) + 1.5rem)`
      }}
    >
      <Button
        key={visible ? 'visible' : 'hidden'}
        ref={buttonRef}
        variant="outline"
        className={cn(
          'pointer-events-auto size-12 rounded-full p-0 backdrop-blur-md transition-all duration-200 disabled:pointer-events-none [&_svg]:size-5 focus-visible:ring-0',
          justClicked
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border/30 bg-card/60 text-foreground hover:bg-primary/20 hover:border-primary/40'
        )}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        onClick={handleScrollToTop}
        disabled={!visible}
      >
        <ChevronUp />
      </Button>
    </div>
  )
}
