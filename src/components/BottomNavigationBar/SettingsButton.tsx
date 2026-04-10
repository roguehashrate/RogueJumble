import { usePrimaryPage } from '@/PageManager'
import { haptic } from '@/lib/haptic'
import { Settings } from 'lucide-react'
import BottomNavigationBarItem from './BottomNavigationBarItem'

export default function SettingsButton() {
  const { navigate, current, display } = usePrimaryPage()
  const isActive = current === 'settings' && display

  return (
    <BottomNavigationBarItem
      active={isActive}
      onClick={() => {
        haptic('click')
        navigate('settings')
      }}
    >
      <Settings />
    </BottomNavigationBarItem>
  )
}
