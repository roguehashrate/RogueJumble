import ScrollToTopButton from '@/components/ScrollToTopButton'
import { Titlebar } from '@/components/Titlebar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePrimaryPage } from '@/PageManager'
import { DeepBrowsingProvider } from '@/providers/DeepBrowsingProvider'
import { useNostr } from '@/providers/NostrProvider'
import { PageActiveContext } from '@/providers/PageActiveProvider'
import { useScreenSize } from '@/providers/ScreenSizeProvider'
import { TPrimaryPageName } from '@/routes/primary'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

const PrimaryPageLayout = forwardRef(
  (
    {
      children,
      titlebar,
      pageName,
      displayScrollToTopButton = false,
      hideTitlebarBottomBorder = false
    }: {
      children?: React.ReactNode
      titlebar: React.ReactNode
      pageName: TPrimaryPageName
      displayScrollToTopButton?: boolean
      hideTitlebarBottomBorder?: boolean
    },
    ref
  ) => {
    const { pubkey } = useNostr()
    const scrollAreaRef = useRef<HTMLDivElement>(null)
    const { isSmallScreen } = useScreenSize()
    const { current, display } = usePrimaryPage()

    useImperativeHandle(
      ref,
      () => ({
        scrollToTop: (behavior: ScrollBehavior = 'smooth') => {
          if (isSmallScreen) {
            window.scrollTo({ top: 0, behavior })
            return
          }
          scrollAreaRef.current?.scrollTo({ top: 0, behavior })
        }
      }),
      [isSmallScreen]
    )

    useEffect(() => {
      if (isSmallScreen) {
        window.scrollTo({ top: 0, behavior: 'instant' })
      } else {
        scrollAreaRef.current?.scrollTo({ top: 0 })
      }
      // Reset scroll position when pubkey changes
    }, [pubkey, isSmallScreen])

    if (isSmallScreen) {
      return (
        <PageActiveContext.Provider value={current === pageName && display}>
          <DeepBrowsingProvider active={current === pageName && display}>
            <div
              style={{
                paddingTop: 'env(safe-area-inset-top, 0px)',
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 5rem)'
              }}
            >
              <PrimaryPageTitlebar hideBottomBorder={hideTitlebarBottomBorder}>
                {titlebar}
              </PrimaryPageTitlebar>
              {children}
            </div>
            {displayScrollToTopButton && <ScrollToTopButton />}
          </DeepBrowsingProvider>
        </PageActiveContext.Provider>
      )
    }

    return (
      <PageActiveContext.Provider value={current === pageName && display}>
        <DeepBrowsingProvider
          active={current === pageName && display}
          scrollAreaRef={scrollAreaRef}
        >
          <ScrollArea
            className="h-full overflow-auto"
            scrollBarClassName="z-30 pt-12"
            ref={scrollAreaRef}
          >
            <PrimaryPageTitlebar hideBottomBorder={hideTitlebarBottomBorder}>
              {titlebar}
            </PrimaryPageTitlebar>
            {children}
            <div className="h-4" />
          </ScrollArea>
          {displayScrollToTopButton && <ScrollToTopButton scrollAreaRef={scrollAreaRef} />}
        </DeepBrowsingProvider>
      </PageActiveContext.Provider>
    )
  }
)
PrimaryPageLayout.displayName = 'PrimaryPageLayout'
export default PrimaryPageLayout

export type TPrimaryPageLayoutRef = {
  scrollToTop: (behavior?: ScrollBehavior) => void
}

function PrimaryPageTitlebar({
  children,
  hideBottomBorder = false
}: {
  children?: React.ReactNode
  hideBottomBorder?: boolean
}) {
  return (
    <Titlebar className="px-3 py-1" hideBottomBorder={hideBottomBorder} autoHide>
      {children}
    </Titlebar>
  )
}
