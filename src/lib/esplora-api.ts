import { esploraFetch } from './esplora'

export const DUST_LIMIT = 546
export const VBYTES_PER_INPUT = 57.5
export const VBYTES_PER_OUTPUT = 43
export const VBYTES_OVERHEAD = 10.5

export interface AddressData {
  balance: number
  pendingBalance: number
  totalBalance: number
  totalReceived: number
  totalSent: number
  txCount: number
  pendingTxCount: number
}

export async function fetchAddressData(
  address: string,
  baseUrls: string[],
  signal?: AbortSignal
): Promise<AddressData> {
  const response = await esploraFetch(baseUrls, `/address/${address}`, {
    signal,
    retryStatuses: [404]
  })

  if (!response.ok) {
    throw new Error('Failed to fetch balance')
  }

  const data = await response.json()

  const confirmedBalance = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum
  const pendingBalance = data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum

  return {
    balance: confirmedBalance,
    pendingBalance,
    totalBalance: confirmedBalance + pendingBalance,
    totalReceived: data.chain_stats.funded_txo_sum,
    totalSent: data.chain_stats.spent_txo_sum,
    txCount: data.chain_stats.tx_count,
    pendingTxCount: data.mempool_stats.tx_count
  }
}

export interface Transaction {
  txid: string
  amount: number
  type: 'receive' | 'send'
  confirmed: boolean
  timestamp?: number
}

export async function fetchTransactions(
  address: string,
  baseUrls: string[],
  signal?: AbortSignal
): Promise<Transaction[]> {
  const response = await esploraFetch(baseUrls, `/address/${address}/txs`, {
    signal,
    retryStatuses: [404]
  })

  if (!response.ok) {
    throw new Error('Failed to fetch transactions')
  }

  const txs = await response.json()

  return txs.map((tx: Record<string, unknown>) => {
    const vin = tx.vin as Array<{ prevout: { scriptpubkey_address?: string; value: number } | null }>
    const vout = tx.vout as Array<{ scriptpubkey_address?: string; value: number }>
    const status = tx.status as { confirmed: boolean; block_time?: number }

    const totalIn = vin.reduce((sum, input) => {
      if (input.prevout?.scriptpubkey_address === address) {
        return sum + input.prevout.value
      }
      return sum
    }, 0)

    const totalOut = vout.reduce((sum, output) => {
      if (output.scriptpubkey_address === address) {
        return sum + output.value
      }
      return sum
    }, 0)

    const net = totalOut - totalIn

    return {
      txid: tx.txid as string,
      amount: Math.abs(net),
      type: net >= 0 ? 'receive' : 'send',
      confirmed: status.confirmed,
      timestamp: status.block_time
    } satisfies Transaction
  })
}

export interface UTXO {
  txid: string
  vout: number
  value: number
  status: {
    confirmed: boolean
    block_height?: number
    block_hash?: string
    block_time?: number
  }
}

export async function fetchUTXOs(
  address: string,
  baseUrls: string[],
  signal?: AbortSignal
): Promise<UTXO[]> {
  const response = await esploraFetch(baseUrls, `/address/${address}/utxo`, {
    signal,
    retryStatuses: [404]
  })
  if (!response.ok) throw new Error('Failed to fetch UTXOs')
  return response.json()
}

export interface FeeRates {
  fastestFee: number
  halfHourFee: number
  hourFee: number
  economyFee: number
  minimumFee: number
}

export async function getFeeRates(baseUrls: string[], signal?: AbortSignal): Promise<FeeRates> {
  const response = await esploraFetch(baseUrls, `/fee-estimates`, {
    signal,
    retryStatuses: [404]
  })
  if (!response.ok) throw new Error('Failed to fetch fee estimates')

  const data = await response.json()

  return {
    fastestFee: sanitizeFeeRate(data?.['1']),
    halfHourFee: sanitizeFeeRate(data?.['3']),
    hourFee: sanitizeFeeRate(data?.['6']),
    economyFee: sanitizeFeeRate(data?.['144']),
    minimumFee: sanitizeFeeRate(data?.['504'])
  }
}

const MAX_PLAUSIBLE_FEE_RATE = 5_000

function sanitizeFeeRate(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1
  if (value < 1) return 1
  if (value > MAX_PLAUSIBLE_FEE_RATE) return MAX_PLAUSIBLE_FEE_RATE
  return Math.ceil(value)
}

export function estimateFee(numInputs: number, numOutputs: number, feeRate: number): number {
  if (!Number.isFinite(feeRate) || feeRate < 1) {
    throw new Error(`Invalid fee rate: ${feeRate} sat/vB.`)
  }
  const vBytes = numInputs * VBYTES_PER_INPUT + numOutputs * VBYTES_PER_OUTPUT + VBYTES_OVERHEAD
  return Math.ceil(vBytes * feeRate)
}

export interface ParsedBitcoinUri {
  address: string
  sp?: string
  amountSats?: number
}

export function parseBitcoinUri(input: string): ParsedBitcoinUri | null {
  const trimmed = input.trim()
  if (!/^bitcoin:/i.test(trimmed)) return null

  const payload = trimmed.slice('bitcoin:'.length)
  const qIdx = payload.indexOf('?')
  const address = (qIdx === -1 ? payload : payload.slice(0, qIdx)).trim()

  let sp: string | undefined
  let amountSats: number | undefined
  if (qIdx !== -1) {
    const params = new URLSearchParams(payload.slice(qIdx + 1))
    sp = params.get('sp')?.trim() || undefined

    const amountRaw = params.get('amount')?.trim()
    if (amountRaw) {
      const btc = Number(amountRaw)
      if (Number.isFinite(btc) && btc > 0) {
        amountSats = Math.floor(btc * 100_000_000)
      }
    }
  }

  return { address, sp, amountSats }
}

export async function broadcastTransaction(
  txHex: string,
  baseUrls: string[],
  signal?: AbortSignal
): Promise<string> {
  const response = await esploraFetch(baseUrls, `/tx`, {
    method: 'POST',
    body: txHex,
    signal,
    retryStatuses: [404]
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Broadcast failed: ${body}`)
  }

  return response.text()
}

export function maxSendable(totalBalance: number, numInputs: number, feeRate: number): number {
  const fee = estimateFee(numInputs, 1, feeRate)
  return Math.max(0, totalBalance - fee)
}

/**
 * Fetch the current BTC/USD price.
 *
 * Note: the `/v1/prices` endpoint is a mempool.space extension to the standard
 * Esplora REST surface. Backends like Blockstream's Esplora do not expose it —
 * those return `404` and `esploraFetch` (via `skipStatuses`) silently advances
 * to the next URL without penalising the endpoint.
 */
export async function fetchBtcPrice(baseUrls: string[], signal?: AbortSignal): Promise<number> {
  const response = await esploraFetch(baseUrls, `/v1/prices`, {
    skipStatuses: [404],
    signal
  })

  if (!response.ok) {
    throw new Error('Failed to fetch BTC price')
  }

  const data = await response.json()
  return data.USD
}