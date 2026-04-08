import lightningService from '@/services/lightning.service'
import storage from '@/services/local-storage.service'
import { onConnected, onDisconnected } from '@getalby/bitcoin-connect-react'
import { GetInfoResponse, WebLNProvider } from '@webbtc/webln-types'
import { createContext, useContext, useEffect, useState } from 'react'

type TWalletDisplayUnit = 'sats' | 'bits' | 'btc'

type TZapContext = {
  isWalletConnected: boolean
  provider: WebLNProvider | null
  walletInfo: GetInfoResponse | null
  balance: number | null
  balanceDisplayUnit: TWalletDisplayUnit
  setBalanceDisplayUnit: (unit: TWalletDisplayUnit) => void
  formatBalance: (sats: number) => string
  defaultZapSats: number
  updateDefaultSats: (sats: number) => void
  defaultZapComment: string
  updateDefaultComment: (comment: string) => void
  quickZap: boolean
  updateQuickZap: (quickZap: boolean) => void
}

const ZapContext = createContext<TZapContext | undefined>(undefined)

export const useZap = () => {
  const context = useContext(ZapContext)
  if (!context) {
    throw new Error('useZap must be used within a ZapProvider')
  }
  return context
}

export function ZapProvider({ children }: { children: React.ReactNode }) {
  const [defaultZapSats, setDefaultZapSats] = useState<number>(storage.getDefaultZapSats())
  const [defaultZapComment, setDefaultZapComment] = useState<string>(storage.getDefaultZapComment())
  const [quickZap, setQuickZap] = useState<boolean>(storage.getQuickZap())
  const [balanceDisplayUnit, setBalanceDisplayUnitState] = useState<'sats' | 'bits' | 'btc'>(
    storage.getWalletDisplayUnit()
  )
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [provider, setProvider] = useState<WebLNProvider | null>(null)
  const [walletInfo, setWalletInfo] = useState<GetInfoResponse | null>(null)
  const [balance, setBalance] = useState<number | null>(null)

  const formatBalance = (sats: number): string => {
    switch (balanceDisplayUnit) {
      case 'sats':
        return `${sats.toLocaleString()} sats`
      case 'bits':
        return `${(sats / 100).toFixed(2)} μ`
      case 'btc':
        return `${(sats / 100000000).toFixed(8)} ₿`
    }
  }

  const setBalanceDisplayUnit = (unit: 'sats' | 'bits' | 'btc') => {
    storage.setWalletDisplayUnit(unit)
    setBalanceDisplayUnitState(unit)
  }

  useEffect(() => {
    const unSubOnConnected = onConnected(async (provider) => {
      setIsWalletConnected(true)
      setWalletInfo(null)
      setBalance(null)
      setProvider(provider)
      lightningService.provider = provider
      const info = await provider.getInfo()
      setWalletInfo(info)
      try {
        if (typeof provider.getBalance === 'function') {
          const balanceResponse = await provider.getBalance()
          if (balanceResponse?.balance !== undefined) {
            setBalance(balanceResponse.balance)
          }
        }
      } catch (e) {
        console.warn('Failed to get balance:', e)
      }
    })
    const unSubOnDisconnected = () => {
      setIsWalletConnected(false)
      setProvider(null)
      setWalletInfo(null)
      setBalance(null)
      lightningService.provider = null
    }
    onDisconnected(unSubOnDisconnected)

    return () => {
      unSubOnConnected()
      unSubOnDisconnected()
    }
  }, [])

  const updateDefaultSats = (sats: number) => {
    storage.setDefaultZapSats(sats)
    setDefaultZapSats(sats)
  }

  const updateDefaultComment = (comment: string) => {
    storage.setDefaultZapComment(comment)
    setDefaultZapComment(comment)
  }

  const updateQuickZap = (quickZap: boolean) => {
    storage.setQuickZap(quickZap)
    setQuickZap(quickZap)
  }

  return (
    <ZapContext.Provider
      value={{
        isWalletConnected,
        provider,
        walletInfo,
        balance,
        balanceDisplayUnit,
        setBalanceDisplayUnit,
        formatBalance,
        defaultZapSats,
        updateDefaultSats,
        defaultZapComment,
        updateDefaultComment,
        quickZap,
        updateQuickZap
      }}
    >
      {children}
    </ZapContext.Provider>
  )
}
