import { usePrimaryPage, useSecondaryPage } from '@/PageManager'
import { Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import BottomNavigationBarItem from './BottomNavigationBarItem'

export default function WalletButton() {
  const { display } = usePrimaryPage()
  const { push } = useSecondaryPage()
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    const checkActive = () => {
      setIsActive(window.location.pathname === '/settings/wallet')
    }
    checkActive()
    window.addEventListener('popstate', checkActive)
    return () => window.removeEventListener('popstate', checkActive)
  }, [])

  return (
    <BottomNavigationBarItem active={isActive && !display} onClick={() => push('/settings/wallet')}>
      <Wallet className="size-4" />
    </BottomNavigationBarItem>
  )
}
