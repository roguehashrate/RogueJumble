import { usePrimaryPage } from '@/PageManager'
import { Search } from 'lucide-react'
import SidebarItem from './SidebarItem'

export default function SearchButton({ collapse, iconRail }: { collapse: boolean; iconRail?: boolean }) {
  const { navigate, current, display } = usePrimaryPage()

  return (
    <SidebarItem
      title="Search"
      onClick={() => navigate('search')}
      active={current === 'search' && display}
      collapse={collapse}
      iconRail={iconRail}
    >
      <Search />
    </SidebarItem>
  )
}
