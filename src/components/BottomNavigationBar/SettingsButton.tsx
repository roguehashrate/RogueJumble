import { usePrimaryPage, useSecondaryPage } from '@/PageManager'
import { haptic } from '@/lib/haptic'
import { Settings } from 'lucide-react'
import BottomNavigationBarItem from './BottomNavigationBarItem'

export default function SettingsButton() {
  const { navigate, current, display } = usePrimaryPage()
  const { pop } = useSecondaryPage()
  const isActive = current === 'settings' && display

  return (
    <BottomNavigationBarItem
      active={isActive}
      onClick={() => {
        haptic('click')
        if (!display) {
          pop()
        }
        navigate('settings')
      }}
    >
      <Settings />
    </BottomNavigationBarItem>
  )
}
