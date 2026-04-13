import ScrollToTopButton from '@/components/ScrollToTopButton'
import { Titlebar } from '@/components/Titlebar'
import { Button } from '@/components/ui/button'
import { useSecondaryPage } from '@/PageManager'
import { DeepBrowsingProvider } from '@/providers/DeepBrowsingProvider'
import { PageActiveContext } from '@/providers/PageActiveProvider'
import { ChevronLeft } from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useTranslation } from 'react-i18next'

const SecondaryPageLayout = forwardRef(
  (
    {
      children,
      index,
      title,
      controls,
      hideBackButton = false,
      hideTitlebarBottomBorder = false,
      displayScrollToTopButton = false,
      titlebar
    }: {
      children?: React.ReactNode
      index?: number
      title?: React.ReactNode
      controls?: React.ReactNode
      hideBackButton?: boolean
      hideTitlebarBottomBorder?: boolean
      displayScrollToTopButton?: boolean
      titlebar?: React.ReactNode
    },
    ref
  ) => {
    const { currentIndex } = useSecondaryPage()

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
      setTimeout(() => window.scrollTo({ top: 0 }), 10)
    }, [])

    return (
      <PageActiveContext.Provider value={currentIndex === index}>
        <DeepBrowsingProvider active={currentIndex === index}>
          <div
            style={{
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 3rem)'
            }}
          >
            <SecondaryPageTitlebar
              title={title}
              controls={controls}
              hideBackButton={hideBackButton}
              hideBottomBorder={hideTitlebarBottomBorder}
              titlebar={titlebar}
            />
            {children}
          </div>
          {displayScrollToTopButton && <ScrollToTopButton />}
        </DeepBrowsingProvider>
      </PageActiveContext.Provider>
    )
  }
)
SecondaryPageLayout.displayName = 'SecondaryPageLayout'
export default SecondaryPageLayout

export function SecondaryPageTitlebar({
  title,
  controls,
  hideBackButton = false,
  hideBottomBorder = false,
  titlebar
}: {
  title?: React.ReactNode
  controls?: React.ReactNode
  hideBackButton?: boolean
  hideBottomBorder?: boolean
  titlebar?: React.ReactNode
}): JSX.Element {
  if (titlebar) {
    return (
      <Titlebar className="py-1 px-3" hideBottomBorder={hideBottomBorder}>
        {titlebar}
      </Titlebar>
    )
  }
  return (
    <Titlebar
      className="flex items-center justify-between gap-1 p-1 font-semibold"
      hideBottomBorder={hideBottomBorder}
    >
      {hideBackButton ? (
        <div className="flex w-fit items-center gap-2 truncate pl-3 text-lg font-semibold">
          {title}
        </div>
      ) : (
        <div className="flex w-0 flex-1 items-center">
          <BackButton>{title}</BackButton>
        </div>
      )}
      <div className="flex-shrink-0">{controls}</div>
    </Titlebar>
  )
}

function BackButton({ children }: { children?: React.ReactNode }) {
  const { t } = useTranslation()
  const { pop } = useSecondaryPage()

  return (
    <Button
      className="flex w-fit max-w-full items-center justify-start gap-1 pl-2 pr-3"
      variant="ghost"
      size="titlebar-icon"
      title={t('back')}
      onClick={() => pop()}
    >
      <ChevronLeft />
      <div className="truncate text-lg font-semibold">{children}</div>
    </Button>
  )
}
