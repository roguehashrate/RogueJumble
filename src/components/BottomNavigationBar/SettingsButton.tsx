import { usePrimaryPage } from '@/PageManager'
import { Settings } from 'lucide-react'
import BottomNavigationBarItem from './BottomNavigationBarItem'

export default function SettingsButton() {
  const { navigate, current, display } = usePrimaryPage()
  const isActive = current === 'settings' && display

  return (
    <BottomNavigationBarItem
      active={isActive}
      onClick={() => navigate('settings')}
    >
      <Settings />
    </BottomNavigationBarItem>
  )
}
