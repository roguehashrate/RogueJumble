import { usePrimaryPage, useSecondaryPage } from '@/PageManager'
import { UsersRound } from 'lucide-react'
import BottomNavigationBarItem from './BottomNavigationBarItem'

export default function FollowingButton() {
  const { navigate, current, display } = usePrimaryPage()
  const { pop } = useSecondaryPage()

  return (
    <BottomNavigationBarItem
      active={current === 'following' && display}
      onClick={() => {
        if (!display) {
          pop()
        }
        navigate('following')
      }}
    >
      <UsersRound />
    </BottomNavigationBarItem>
  )
}
