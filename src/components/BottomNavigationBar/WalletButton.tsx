import { usePrimaryPage, useSecondaryPage } from '@/PageManager'
import { haptic } from '@/lib/haptic'
import { Wallet } from 'lucide-react'
import BottomNavigationBarItem from './BottomNavigationBarItem'

export default function WalletButton() {
  const { display } = usePrimaryPage()
  const { push, currentUrl } = useSecondaryPage()
  const isActive = currentUrl === '/settings/wallet'

  return (
    <BottomNavigationBarItem
      active={isActive && !display}
      onClick={() => {
        haptic('click')
        push('/settings/wallet')
      }}
    >
      <Wallet />
    </BottomNavigationBarItem>
  )
}
