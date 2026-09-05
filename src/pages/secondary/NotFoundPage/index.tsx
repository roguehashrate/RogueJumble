import NotFound from '@/components/NotFound'
import { Button } from '@/components/ui/button'
import SecondaryPageLayout from '@/layouts/SecondaryPageLayout'
import { usePrimaryPage, useSecondaryPage } from '@/PageManager'
import { Home } from 'lucide-react'
import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'

const NotFoundPage = forwardRef(({ index }: { index?: number }, ref) => {
  const { t } = useTranslation()
  const { navigate } = usePrimaryPage()
  const { resetToRoot } = useSecondaryPage()

  return (
    <SecondaryPageLayout ref={ref} index={index} title="404">
      <NotFound />
      <div className="flex justify-center pb-8">
        <Button variant="outline" onClick={() => {
          resetToRoot()
          navigate('home')
        }}>
          <Home className="size-4" />
          {t('Back to home')}
        </Button>
      </div>
    </SecondaryPageLayout>
  )
})
NotFoundPage.displayName = 'NotFoundPage'
export default NotFoundPage