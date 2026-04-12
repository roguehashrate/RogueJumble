import { usePrimaryPage } from '@/PageManager'
import { Compass } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import SidebarItem from './SidebarItem'

export default function RelaysButton({ collapse, iconRail }: { collapse: boolean; iconRail?: boolean }) {
  const { t } = useTranslation()
  const { navigate, current, display } = usePrimaryPage()

  return (
    <SidebarItem
      title={t('Explore')}
      onClick={() => navigate('explore')}
      active={display && current === 'explore'}
      collapse={collapse}
      iconRail={iconRail}
    >
      <Compass />
    </SidebarItem>
  )
}
