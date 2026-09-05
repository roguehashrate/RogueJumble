import { usePrimaryPage, useSecondaryPage } from '@/PageManager'
import { Home } from 'lucide-react'
import SidebarItem from './SidebarItem'

export default function HomeButton({ collapse, iconRail }: { collapse: boolean; iconRail?: boolean }) {
  const { navigate, current, display } = usePrimaryPage()
  const { resetToRoot } = useSecondaryPage()

  return (
    <SidebarItem
      title="Home"
      onClick={() => {
        resetToRoot()
        navigate('home')
      }}
      active={display && current === 'home'}
      collapse={collapse}
      iconRail={iconRail}
    >
      <Home />
    </SidebarItem>
  )
}
