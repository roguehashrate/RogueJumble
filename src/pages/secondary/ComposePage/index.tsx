import SecondaryPageLayout from '@/layouts/SecondaryPageLayout'
import PostContent from '@/components/PostEditor/PostContent'
import BackgroundOrbs from '@/components/BackgroundOrbs'
import { forwardRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSecondaryPage } from '@/PageManager'

const ComposePage = forwardRef(({ index }: { index?: number }, ref) => {
  const { t } = useTranslation()
  const { pop } = useSecondaryPage()

  const content = useMemo(() => {
    return (
      <PostContent
        defaultContent=""
        parentStuff={undefined}
        close={() => pop()}
        openFrom={undefined}
        highlightedText={undefined}
      />
    )
  }, [pop])

  return (
    <SecondaryPageLayout
      ref={ref}
      index={index}
      title={t('New Note')}
      hideBackButton={false}
    >
      <BackgroundOrbs />
      <div className="relative mx-auto max-w-2xl px-4 py-4">
        {content}
      </div>
    </SecondaryPageLayout>
  )
})
ComposePage.displayName = 'ComposePage'
export default ComposePage
