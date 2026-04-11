import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useDeepBrowsing } from '@/providers/DeepBrowsingProvider'
import { ReactNode, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

type TabDefinition = {
  value: string
  label: string
}

export default function Tabs({
  tabs,
  value,
  onTabChange,
  threshold = 800,
  options = null,
  active = false
}: {
  tabs: TabDefinition[]
  value: string
  onTabChange?: (tab: string) => void
  threshold?: number
  options?: ReactNode
  active?: boolean
}) {
  const { t } = useTranslation()
  const { deepBrowsing, lastScrollTop } = useDeepBrowsing()
  const tabRefs = useRef<(HTMLDivElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 })

  const updateIndicatorPosition = () => {
    const activeIndex = tabs.findIndex((tab) => tab.value === value)
    if (activeIndex >= 0 && tabRefs.current[activeIndex]) {
      const activeTab = tabRefs.current[activeIndex]
      const { offsetWidth, offsetLeft } = activeTab
      const padding = 16 // 8px padding on each side
      setIndicatorStyle({
        width: offsetWidth - padding,
        left: offsetLeft + padding / 2
      })
    }
  }

  useEffect(() => {
    const animationId = requestAnimationFrame(() => {
      updateIndicatorPosition()
    })

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [tabs, value])

  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver(() => {
      updateIndicatorPosition()
    })

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            requestAnimationFrame(() => {
              updateIndicatorPosition()
            })
          }
        })
      },
      { threshold: 0 }
    )

    intersectionObserver.observe(containerRef.current)

    tabRefs.current.forEach((tab) => {
      if (tab) resizeObserver.observe(tab)
    })

    return () => {
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
    }
  }, [tabs, value])

  return (
    <div
      ref={containerRef}
      className={cn(
        'sticky top-12 z-30 flex w-full justify-between bg-background/60 px-2 backdrop-blur-2xl transition-all duration-300',
        'border-b border-border/10',
        deepBrowsing && lastScrollTop > threshold && !active
          ? '-translate-y-[calc(100%+12rem)]'
          : ''
      )}
    >
      <div className="relative w-0 flex-1 overflow-hidden">
        <ScrollArea className="w-full">
          <div className="relative flex w-fit items-center pb-2 pt-2">
            {tabs.map((tab, index) => (
              <div
                key={tab.value}
                ref={(el) => (tabRefs.current[index] = el)}
                className={cn(
                  `clickable my-0.5 w-fit cursor-pointer whitespace-nowrap rounded-full px-5 py-2 text-center text-sm font-semibold transition-colors duration-200`,
                  value === tab.value
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                )}
                onClick={() => {
                  onTabChange?.(tab.value)
                }}
              >
                {t(tab.label)}
              </div>
            ))}
            {/* Active indicator — inside the container bounds */}
            <div
              className="absolute bottom-0 h-0.5 rounded-full bg-primary transition-all duration-200"
              style={{
                width: `${indicatorStyle.width}px`,
                left: `${indicatorStyle.left}px`
              }}
            />
          </div>
          <ScrollBar orientation="horizontal" className="pointer-events-none opacity-0" />
        </ScrollArea>
      </div>
      {options && (
        <div className="flex items-center gap-1 py-1">
          <Separator orientation="vertical" className="h-8" />
          {options}
        </div>
      )}
    </div>
  )
}
