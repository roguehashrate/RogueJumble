import { usePrimaryPage } from '@/PageManager'
import { Settings } from 'lucide-react'
import BottomNavigationBarItem from './BottomNavigationBarItem'

export default function SettingsButton() {
  const { navigate, current, display } = usePrimaryPage()

  return (
    <BottomNavigationBarItem
      active={current === 'settings' && display}
      onClick={() => navigate('settings')}
    >
      <Settings />
    </BottomNavigationBarItem>
  )
}
