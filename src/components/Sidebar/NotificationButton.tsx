import { usePrimaryPage } from '@/PageManager'
import { useNostr } from '@/providers/NostrProvider'
import { useNotification } from '@/providers/NotificationProvider'
import { Bell } from 'lucide-react'
import SidebarItem from './SidebarItem'

export default function NotificationsButton({ collapse }: { collapse: boolean }) {
  const { checkLogin } = useNostr()
  const { navigate, current, display } = usePrimaryPage()
  const { unreadCount } = useNotification()

  return (
    <SidebarItem
      title="Notifications"
      onClick={() => checkLogin(() => navigate('notifications'))}
      active={display && current === 'notifications'}
      collapse={collapse}
    >
      <div className="relative">
        <Bell />
        {unreadCount > 0 && (
          <div className="absolute -right-1 -top-1 size-4 rounded-full bg-primary/90 text-center text-[8px] font-bold text-primary-foreground">
            {unreadCount >= 10 ? '9+' : unreadCount}
          </div>
        )}
      </div>
    </SidebarItem>
  )
}
