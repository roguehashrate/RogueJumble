import { usePrimaryPage, useSecondaryPage } from '@/PageManager'
import { haptic } from '@/lib/haptic'
import { Home } from 'lucide-react'
import BottomNavigationBarItem from './BottomNavigationBarItem'

export default function HomeButton() {
  const { navigate, current, display } = usePrimaryPage()
  const { pop } = useSecondaryPage()
  const isActive = current === 'home' && display

  return (
    <BottomNavigationBarItem
      active={isActive}
      onClick={() => {
        haptic('click')
        if (!display) {
          pop()
        }
        navigate('home')
      }}
    >
      <Home />
    </BottomNavigationBarItem>
  )
}
