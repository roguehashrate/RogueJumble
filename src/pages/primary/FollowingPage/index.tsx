import TitlebarProfileButton from '@/components/TitlebarProfileButton'
import FollowingFeed from '@/components/FollowingFeed'
import PrimaryPageLayout from '@/layouts/PrimaryPageLayout'
import { TPageRef } from '@/types'
import { UsersRound } from 'lucide-react'
import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'

const FollowingPage = forwardRef<TPageRef>((_, ref) => {
  return (
    <PrimaryPageLayout
      pageName="following"
      titlebar={<FollowingPageTitlebar />}
      displayScrollToTopButton
      ref={ref}
    >
      <FollowingFeed />
    </PrimaryPageLayout>
  )
})
FollowingPage.displayName = 'FollowingPage'
export default FollowingPage

function FollowingPageTitlebar() {
  const { t } = useTranslation()

  return (
    <div className="flex h-full w-full items-center">
      <TitlebarProfileButton />
      <div className="flex flex-1 items-center justify-center gap-2">
        <UsersRound />
        <div className="text-lg font-semibold">{t('Following')}</div>
      </div>
      <div className="w-8" />
    </div>
  )
}
