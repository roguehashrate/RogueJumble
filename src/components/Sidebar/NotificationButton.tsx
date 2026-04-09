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
          <div className="absolute -top-1 -right-1 flex min-w-[14px] items-center justify-center rounded-full bg-primary px-0.5 text-[7px] font-bold text-primary-foreground ring-2 ring-background">
            {unreadCount >= 10 ? '9+' : unreadCount}
          </div>
        )}
      </div>
    </SidebarItem>
  )
}
