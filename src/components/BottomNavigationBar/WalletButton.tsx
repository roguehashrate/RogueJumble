import { Wallet } from 'lucide-react'
import BottomNavigationBarItem from './BottomNavigationBarItem'

export default function WalletButton() {
  const handleClick = () => {
    window.location.href = '/settings/wallet'
  }

  return (
    <BottomNavigationBarItem onClick={handleClick}>
      <Wallet className="size-4" />
    </BottomNavigationBarItem>
  )
}
