import { usePrimaryPage } from '@/PageManager'
import { haptic } from '@/lib/haptic'
import { Home } from 'lucide-react'
import BottomNavigationBarItem from './BottomNavigationBarItem'

export default function HomeButton() {
  const { navigate, current, display } = usePrimaryPage()
  const isActive = current === 'home' && display

  return (
    <BottomNavigationBarItem
      active={isActive}
      onClick={() => {
        haptic('click')
        navigate('home')
      }}
    >
      <Home />
    </BottomNavigationBarItem>
  )
}
