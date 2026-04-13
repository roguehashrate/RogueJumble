import { usePrimaryPage } from '@/PageManager'
import { Settings } from 'lucide-react'
import SidebarItem from './SidebarItem'

export default function SettingsButton({ collapse, iconRail }: { collapse: boolean; iconRail?: boolean }) {
  const { current, navigate, display } = usePrimaryPage()

  return (
    <SidebarItem
      title="Settings"
      onClick={() => navigate('settings')}
      collapse={collapse}
      active={display && current === 'settings'}
      iconRail={iconRail}
    >
      <Settings />
    </SidebarItem>
  )
}
