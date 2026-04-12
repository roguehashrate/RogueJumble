import Icon from '@/assets/Icon'
import { IS_COMMUNITY_MODE } from '@/constants'
import { cn } from '@/lib/utils'
import { usePrimaryPage } from '@/PageManager'
import { useNostr } from '@/providers/NostrProvider'
import { useScreenSize } from '@/providers/ScreenSizeProvider'
import { useUserPreferences } from '@/providers/UserPreferencesProvider'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import AccountButton from './AccountButton'
import BookmarkButton from './BookmarkButton'
import RelaysButton from './ExploreButton'
import FollowingButton from './FollowingButton'
import HomeButton from './HomeButton'
import LayoutSwitcher from './LayoutSwitcher'
import NotificationsButton from './NotificationButton'
import PostButton from './PostButton'
import ProfileButton from './ProfileButton'
import SearchButton from './SearchButton'
import SettingsButton from './SettingsButton'

function SidebarLogo({ size }: { size: 'small' | 'normal' }) {
  const dim = size === 'small' ? 'size-10' : 'h-12 w-12'
  return (
    <div className={cn('overflow-hidden rounded-full', dim)}>
      <img
        src="/roguejumble-96x96.png"
        alt="RogueJumble"
        className="size-full object-contain transition-opacity hover:opacity-80"
      />
    </div>
  )
}

export default function PrimaryPageSidebar({ iconRail = false }: { iconRail?: boolean }) {
  const { isSmallScreen } = useScreenSize()
  const { sidebarCollapse, updateSidebarCollapse, enableSingleColumnLayout } = useUserPreferences()
  const { pubkey } = useNostr()
  const { navigate } = usePrimaryPage()

  if (isSmallScreen) return null

  // Icon rail mode: permanent narrow sidebar, no collapse toggle
  const collapse = iconRail ? true : sidebarCollapse
  const showToggle = !iconRail

  return (
    <div
      className={cn(
        'relative flex h-full shrink-0 flex-col justify-between',
        'bg-background',
        'border-r',
        iconRail
          ? 'w-[72px] px-2 py-4'
          : collapse
            ? 'w-16 px-2 pb-2 pt-3'
            : 'w-52 px-4 pb-2 pt-3'
      )}
    >
      <div className={cn('space-y-2', iconRail && 'space-y-3')}>
        <button
          className={cn(
            'flex w-full items-center justify-center transition-opacity hover:opacity-80',
            iconRail ? 'mb-6 px-2 py-1' : collapse ? 'mb-4 px-3 py-1' : 'mb-4 px-4'
          )}
          onClick={() => navigate('home')}
          aria-label="Go to home"
        >
          <SidebarLogo size={iconRail ? 'small' : 'normal'} />
        </button>
        <HomeButton collapse={collapse} iconRail={iconRail} />
        {!IS_COMMUNITY_MODE && <RelaysButton collapse={collapse} iconRail={iconRail} />}
        {IS_COMMUNITY_MODE && <FollowingButton collapse={collapse} iconRail={iconRail} />}
        <NotificationsButton collapse={collapse} iconRail={iconRail} />
        <SearchButton collapse={collapse} iconRail={iconRail} />
        <ProfileButton collapse={collapse} iconRail={iconRail} />
        {pubkey && <BookmarkButton collapse={collapse} iconRail={iconRail} />}
        <SettingsButton collapse={collapse} iconRail={iconRail} />
        <PostButton collapse={collapse} iconRail={iconRail} />
      </div>
      <div className={cn('space-y-4', iconRail && 'space-y-3')}>
        {iconRail ? (
          <div className="flex flex-col items-center space-y-3">
            <AccountButton collapse />
          </div>
        ) : (
          <>
            <LayoutSwitcher collapse={collapse} />
            <AccountButton collapse={collapse} />
          </>
        )}
      </div>
      {showToggle && (
        <button
          className={cn(
            'absolute flex h-6 w-5 flex-col items-center justify-center rounded-l-md p-0 text-muted-foreground transition-colors hover:bg-background hover:text-foreground hover:shadow-md [&_svg]:size-4',
            enableSingleColumnLayout ? 'right-0 top-3' : '-right-0.5 top-5'
          )}
          onClick={(e) => {
            e.stopPropagation()
            updateSidebarCollapse(!sidebarCollapse)
          }}
        >
          {sidebarCollapse ? <ChevronsRight /> : <ChevronsLeft />}
        </button>
      )}
    </div>
  )
}
