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
          <div className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary/90 text-center text-[8px] font-bold text-primary-foreground shadow-sm shadow-primary/50 ring-2 ring-primary/30">
            {unreadCount >= 10 ? '9+' : unreadCount}
          </div>
        )}
      </div>
    </BottomNavigationBarItem>
  )
}
