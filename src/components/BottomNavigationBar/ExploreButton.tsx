import { usePrimaryPage, useSecondaryPage } from '@/PageManager'
import { Compass } from 'lucide-react'
import BottomNavigationBarItem from './BottomNavigationBarItem'

export default function ExploreButton() {
  const { navigate, current, display } = usePrimaryPage()
  const { pop } = useSecondaryPage()

  return (
    <BottomNavigationBarItem
      active={current === 'explore' && display}
      onClick={() => {
        if (!display) {
          pop()
        }
        navigate('explore')
      }}
    >
      <Compass />
    </BottomNavigationBarItem>
  )
}
