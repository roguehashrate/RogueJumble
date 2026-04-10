import { usePrimaryPage } from '@/PageManager'
import { useNostr } from '@/providers/NostrProvider'
import { useNotification } from '@/providers/NotificationProvider'
import { Bell } from 'lucide-react'
import BottomNavigationBarItem from './BottomNavigationBarItem'

export default function NotificationsButton() {
  const { checkLogin } = useNostr()
  const { navigate, current, display } = usePrimaryPage()
  const { unreadCount } = useNotification()
  const isActive = current === 'notifications' && display

  return (
    <BottomNavigationBarItem
      active={isActive}
      onClick={() => checkLogin(() => navigate('notifications'))}
    >
      <div className="relative">
        <Bell />
        {unreadCount > 0 && (
          <div className="absolute -right-0.5 -top-0.5 min-w-[16px] rounded-full bg-primary/90 px-1 py-0.5 text-center text-[9px] font-bold text-primary-foreground">
            {unreadCount >= 10 ? '9+' : unreadCount}
          </div>
        )}
      </div>
    </BottomNavigationBarItem>
  )
}
