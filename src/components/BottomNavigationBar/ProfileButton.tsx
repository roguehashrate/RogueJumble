import { usePrimaryPage, useSecondaryPage } from '@/PageManager'
import { haptic } from '@/lib/haptic'
import { useNostr } from '@/providers/NostrProvider'
import { SimpleUserAvatar } from '../UserAvatar'
import BottomNavigationBarItem from './BottomNavigationBarItem'

export default function ProfileButton() {
  const { checkLogin, pubkey } = useNostr()
  const { navigate, current, display } = usePrimaryPage()
  const { resetToRoot } = useSecondaryPage()
  const isActive = current === 'profile' && display

  return (
    <BottomNavigationBarItem
      active={isActive}
      onClick={() => {
        haptic('click')
        if (pubkey) {
          if (!display) {
            resetToRoot()
          }
          navigate('profile')
        } else {
          checkLogin()
        }
      }}
    >
      <div className="pointer-events-none">
        {pubkey ? (
          <SimpleUserAvatar userId={pubkey} size="small" className="size-6 rounded-full" />
        ) : (
          <div className="flex size-6 items-center justify-center rounded-full border border-muted-foreground/40 text-xs font-semibold text-muted-foreground">
            ?
          </div>
        )}
      </div>
    </BottomNavigationBarItem>
  )
}