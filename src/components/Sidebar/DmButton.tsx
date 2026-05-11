import { usePrimaryPage } from '@/PageManager'
import { useNostr } from '@/providers/NostrProvider'
import { MessageCircle } from 'lucide-react'
import SidebarItem from './SidebarItem'
import { useDm } from '@/providers/DmProvider'
import { useMemo } from 'react'

export default function DmButton({ collapse, iconRail }: { collapse: boolean; iconRail?: boolean }) {
  const { checkLogin } = useNostr()
  const { navigate, current, display } = usePrimaryPage()
  const { conversations } = useDm()

  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0)
  }, [conversations])

  return (
    <SidebarItem
      title="Messages"
      onClick={() => checkLogin(() => navigate('dms'))}
      active={display && current === 'dms'}
      collapse={collapse}
      iconRail={iconRail}
    >
      <div className="relative">
        <MessageCircle />
        {totalUnreadCount > 0 && (
          <div className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary/90 text-center text-[8px] font-bold text-primary-foreground shadow-sm shadow-primary/50 ring-2 ring-primary/30">
            {totalUnreadCount >= 10 ? '9+' : totalUnreadCount}
          </div>
        )}
      </div>
    </SidebarItem>
  )
}
