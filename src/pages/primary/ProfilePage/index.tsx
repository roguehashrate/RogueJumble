import Profile from '@/components/Profile'
import PrimaryPageLayout from '@/layouts/PrimaryPageLayout'
import { useNostr } from '@/providers/NostrProvider'
import { TPageRef } from '@/types'
import { Loader2, UserRound } from 'lucide-react'
import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'

const ProfilePage = forwardRef<TPageRef>((_, ref) => {
  const { pubkey } = useNostr()

  return (
    <PrimaryPageLayout
      pageName="profile"
      titlebar={<ProfilePageTitlebar />}
      displayScrollToTopButton
      ref={ref}
    >
      {pubkey ? (
        <Profile id={pubkey} />
      ) : (
        <div className="flex items-center justify-center p-8 pt-[30vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
    </PrimaryPageLayout>
  )
})
ProfilePage.displayName = 'ProfilePage'
export default ProfilePage

function ProfilePageTitlebar() {
  const { t } = useTranslation()

  return (
    <div className="flex h-full items-center gap-2 pl-3">
      <UserRound />
      <div className="text-lg font-semibold">{t('Profile')}</div>
    </div>
  )
}
