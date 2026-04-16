import lightningService, { TTransaction } from '@/services/lightning.service'
import client from '@/services/client.service'
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
  toSats: (value: number) => number
  defaultZapSats: number
  updateDefaultSats: (sats: number) => void
  defaultZapComment: string
  updateDefaultComment: (comment: string) => void
  quickZap: boolean
  updateQuickZap: (quickZap: boolean) => void
  transactionHistory: TTransaction[]
  refreshTransactionHistory: () => Promise<void>
  clearTransactionHistory: () => void
  refreshBalance: () => Promise<void>
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
  const [transactionHistory, setTransactionHistory] = useState<TTransaction[]>([])

  const refreshTransactionHistory = async () => {
    if (lightningService.provider) {
      const pubkey = client.pubkey
      const history = await lightningService.getTransactionHistory(pubkey)
      
      // Deduplicate before setting state
      const seen = new Set<string>()
      const unique = history.filter((tx) => {
        const key = tx.id || tx.invoice || ''
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      
      setTransactionHistory(unique)
    }
  }

  const clearTransactionHistory = () => {
    lightningService.clearTransactionCache()
    setTransactionHistory([])
  }

  const refreshBalance = async () => {
    if (lightningService.provider) {
      try {
        if (typeof lightningService.provider.getBalance === 'function') {
          const balanceResponse = await lightningService.provider.getBalance()
          if (balanceResponse?.balance !== undefined) {
            setBalance(balanceResponse.balance)
          }
        }
      } catch (e) {
        console.warn('Failed to refresh balance:', e)
      }
    }
  }

  const formatBalance = (sats: number): string => {
    switch (balanceDisplayUnit) {
      case 'sats':
        return `${sats.toLocaleString()} sats`
      case 'bits':
        return `${(sats / 100).toFixed(2)} bits`
      case 'btc':
        return `${(sats / 100000000).toFixed(8)} BTC`
    }
  }

  const toSats = (value: number): number => {
    switch (balanceDisplayUnit) {
      case 'sats':
        return value
      case 'bits':
        return Math.round(value * 100)
      case 'btc':
        return Math.round(value * 100000000)
    }
  }

  const setBalanceDisplayUnit = (unit: 'sats' | 'bits' | 'btc') => {
    storage.setWalletDisplayUnit(unit)
    setBalanceDisplayUnitState(unit)
  }

  useEffect(() => {
    // Load persisted transactions on init
    const persistedTransactions = storage.getWalletTransactions()
    if (persistedTransactions.length > 0) {
      setTransactionHistory(persistedTransactions)
    }

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
      const history = await lightningService.getTransactionHistory()
      setTransactionHistory(history)
    })
    const unSubOnDisconnected = () => {
      setIsWalletConnected(false)
      setProvider(null)
      setWalletInfo(null)
      setTransactionHistory([])
      lightningService.clearTransactionCache()
      setBalance(null)
      lightningService.provider = null
    }
    onDisconnected(unSubOnDisconnected)

    const unSubBalance = lightningService.onBalanceChange(refreshBalance)
    const unSubTransactions = lightningService.onTransactionChange(refreshTransactionHistory)

    return () => {
      unSubOnConnected()
      unSubOnDisconnected()
      unSubBalance()
      unSubTransactions()
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
        toSats,
        defaultZapSats,
        updateDefaultSats,
        defaultZapComment,
        updateDefaultComment,
        quickZap,
        updateQuickZap,
        transactionHistory,
        refreshTransactionHistory,
        clearTransactionHistory,
        refreshBalance
      }}
    >
      {children}
    </ZapContext.Provider>
  )
}
