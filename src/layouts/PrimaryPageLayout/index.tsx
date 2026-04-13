import ScrollToTopButton from '@/components/ScrollToTopButton'
import { Titlebar } from '@/components/Titlebar'
import { usePrimaryPage } from '@/PageManager'
import { DeepBrowsingProvider } from '@/providers/DeepBrowsingProvider'
import { useNostr } from '@/providers/NostrProvider'
import { PageActiveContext } from '@/providers/PageActiveProvider'
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
      // Reset scroll position when pubkey changes
      window.scrollTo({ top: 0, behavior: 'instant' })
    }, [pubkey])

    return (
      <PageActiveContext.Provider value={current === pageName && display}>
        <DeepBrowsingProvider active={current === pageName && display}>
          <div
            ref={scrollAreaRef}
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
