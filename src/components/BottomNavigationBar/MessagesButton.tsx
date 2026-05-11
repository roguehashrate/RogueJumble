import { usePrimaryPage, useSecondaryPage } from '@/PageManager'
import { haptic } from '@/lib/haptic'
import { useNostr } from '@/providers/NostrProvider'
import { useDm } from '@/providers/DmProvider'
import { MessageCircle } from 'lucide-react'
import { useMemo } from 'react'
import BottomNavigationBarItem from './BottomNavigationBarItem'

export default function MessagesButton() {
  const { checkLogin } = useNostr()
  const { navigate, current, display } = usePrimaryPage()
  const { pop } = useSecondaryPage()
  const { conversations } = useDm()
  const isActive = current === 'dms' && display

  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0)
  }, [conversations])

  return (
    <BottomNavigationBarItem
      active={isActive}
      onClick={() => {
        haptic('click')
        checkLogin(() => {
          if (!display) {
            pop()
          }
          navigate('dms')
        })
      }}
    >
      <div className="relative">
        <MessageCircle />
        {totalUnreadCount > 0 && (
          <div className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary/90 text-center text-[8px] font-bold text-primary-foreground shadow-sm shadow-primary/50 ring-2 ring-primary/30">
            {totalUnreadCount >= 10 ? '9+' : totalUnreadCount}
          </div>
        )}
      </div>
    </BottomNavigationBarItem>
  )
}
