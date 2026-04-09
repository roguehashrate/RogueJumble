import { usePrimaryPage } from '@/PageManager'
import { Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import BottomNavigationBarItem from './BottomNavigationBarItem'

export default function WalletButton() {
  const { display } = usePrimaryPage()
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    const checkActive = () => {
      setIsActive(window.location.pathname === '/settings/wallet')
    }
    checkActive()
    window.addEventListener('popstate', checkActive)
    return () => window.removeEventListener('popstate', checkActive)
  }, [])

  const handleClick = () => {
    window.location.href = '/settings/wallet'
  }

  return (
    <BottomNavigationBarItem active={isActive && !display} onClick={handleClick}>
      <Wallet className="size-4" />
    </BottomNavigationBarItem>
  )
}
