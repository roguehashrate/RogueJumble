import client from '@/services/client.service'
import { useNostr } from '@/providers/NostrProvider'
import { nostrPubkeyToBitcoinAddress } from '@/lib/bitcoin'
import {
  fetchAddressData,
  fetchTransactions,
  fetchUTXOs,
  fetchBtcPrice,
  getFeeRates,
  type AddressData,
  type FeeRates,
  type Transaction,
  type UTXO
} from '@/lib/esplora-api'
import { DEFAULT_ESPLORA_APIS } from '@/lib/esplora'
import { createContext, useContext, useEffect, useRef, useState } from 'react'

type TBitcoinContext = {
  isSupported: boolean
  address: string
  addressData: AddressData | null
  utxos: UTXO[]
  feeRates: FeeRates | null
  btcPrice: number | null
  transactions: Transaction[]
  loadingAddress: boolean
  error: string | null
  refresh: () => Promise<void>
}

const BitcoinContext = createContext<TBitcoinContext | undefined>(undefined)

export const useBitcoin = () => {
  const context = useContext(BitcoinContext)
  if (!context) {
    throw new Error('useBitcoin must be used within a BitcoinProvider')
  }
  return context
}

export function BitcoinProvider({ children }: { children: React.ReactNode }) {
  const { pubkey } = useNostr()
  const [address, setAddress] = useState('')
  const [addressData, setAddressData] = useState<AddressData | null>(null)
  const [utxos, setUtxos] = useState<UTXO[]>([])
  const [feeRates, setFeeRates] = useState<FeeRates | null>(null)
  const [btcPrice, setBtcPrice] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingAddress, setLoadingAddress] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  // The on-chain address is derived from the pubkey alone, so a balance is
  // always viewable/sendable-to whenever a user is logged in. Only *signing* a
  // transaction (spending) additionally needs an in-app private key, which is
  // what `isSupported` signals.
  const isSupported = Boolean(pubkey && client.signer?.getPrivateKeyByteArray)

  useEffect(() => {
    if (!pubkey) {
      setAddress('')
      setAddressData(null)
      setUtxos([])
      setBtcPrice(null)
      setTransactions([])
      setError(null)
      return
    }

    const btcAddress = nostrPubkeyToBitcoinAddress(pubkey)
    setAddress(btcAddress)
    setLoadingAddress(true)
    setError(null)

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const urls = [...DEFAULT_ESPLORA_APIS]

    async function load() {
      try {
        const [data, utxoList, fees, price, txs] = await Promise.all([
          fetchAddressData(btcAddress, urls, controller.signal),
          fetchUTXOs(btcAddress, urls, controller.signal),
          getFeeRates(urls, controller.signal),
          fetchBtcPrice(urls, controller.signal),
          fetchTransactions(btcAddress, urls, controller.signal)
        ])
        if (controller.signal.aborted) return
        setAddressData(data)
        setUtxos(utxoList)
        setFeeRates(fees)
        setBtcPrice(price)
        setTransactions(txs)
      } catch (e) {
        if ((e as Error)?.name === 'AbortError' || controller.signal.aborted) return
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!controller.signal.aborted) setLoadingAddress(false)
      }
    }

    load()

    return () => controller.abort()
  }, [pubkey])

  const refresh = async () => {
    if (!address) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setLoadingAddress(true)
    setError(null)
    const urls = [...DEFAULT_ESPLORA_APIS]
    try {
      const [data, utxoList, fees, price, txs] = await Promise.all([
        fetchAddressData(address, urls, controller.signal),
        fetchUTXOs(address, urls, controller.signal),
        getFeeRates(urls, controller.signal),
        fetchBtcPrice(urls, controller.signal),
        fetchTransactions(address, urls, controller.signal)
      ])
      if (controller.signal.aborted) return
      setAddressData(data)
      setUtxos(utxoList)
      setFeeRates(fees)
      setBtcPrice(price)
      setTransactions(txs)
    } catch (e) {
      if ((e as Error)?.name === 'AbortError' || controller.signal.aborted) return
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (!controller.signal.aborted) setLoadingAddress(false)
    }
  }

  return (
    <BitcoinContext.Provider
      value={{
        isSupported,
        address,
        addressData,
        utxos,
        feeRates,
        btcPrice,
        transactions,
        loadingAddress,
        error,
        refresh
      }}
    >
      {children}
    </BitcoinContext.Provider>
  )
}