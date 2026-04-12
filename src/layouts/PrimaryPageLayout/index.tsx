import ScrollToTopButton from '@/components/ScrollToTopButton'
import { Titlebar } from '@/components/Titlebar'
import { usePrimaryPage } from '@/PageManager'
import { DeepBrowsingProvider } from '@/providers/DeepBrowsingProvider'
import { useNostr } from '@/providers/NostrProvider'
import { PageActiveContext } from '@/providers/PageActiveProvider'
import { useUserPreferences } from '@/providers/UserPreferencesProvider'
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
    const smallScreenScrollAreaRef = useRef<HTMLDivElement>(null)
    const smallScreenLastScrollTopRef = useRef(0)
    const { enableSingleColumnLayout } = useUserPreferences()
    const { current, display } = usePrimaryPage()

    useImperativeHandle(
      ref,
      () => ({
        scrollToTop: (behavior: ScrollBehavior = 'smooth') => {
          window.scrollTo({ top: 0, behavior })
        }
      }),
      []
    )

    useEffect(() => {
      if (!enableSingleColumnLayout) return

      const isVisible = () => {
        return smallScreenScrollAreaRef.current?.checkVisibility
          ? smallScreenScrollAreaRef.current?.checkVisibility()
          : false
      }

      if (isVisible()) {
        window.scrollTo({ top: smallScreenLastScrollTopRef.current, behavior: 'instant' })
      }
      const handleScroll = () => {
        if (isVisible()) {
          smallScreenLastScrollTopRef.current = window.scrollY
        }
      }
      window.addEventListener('scroll', handleScroll)
      return () => {
        window.removeEventListener('scroll', handleScroll)
      }
    }, [current, enableSingleColumnLayout, display])

    useEffect(() => {
      smallScreenLastScrollTopRef.current = 0
    }, [pubkey])

    // Mobile single-column layout (PWA) - uses window scrolling
    if (enableSingleColumnLayout) {
      return (
        <PageActiveContext.Provider value={current === pageName && display}>
          <DeepBrowsingProvider active={current === pageName && display}>
            <div
              ref={smallScreenScrollAreaRef}
              style={{
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 3rem)'
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

    // Desktop layout - uses window scrolling for spacious feel
    return (
      <PageActiveContext.Provider value={current === pageName && display}>
        <DeepBrowsingProvider active={current === pageName && display}>
          <div ref={smallScreenScrollAreaRef}>
            <PrimaryPageTitlebar hideBottomBorder={hideTitlebarBottomBorder}>
              {titlebar}
            </PrimaryPageTitlebar>
            {children}
            <div className="h-8" />
          </div>
          {displayScrollToTopButton && <ScrollToTopButton />}
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
    <Titlebar className="py-1 px-3" hideBottomBorder={hideBottomBorder} autoHide>
      {children}
    </Titlebar>
  )
}
