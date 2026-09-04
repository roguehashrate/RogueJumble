import { useState } from 'react'
import { bytesToHex } from '@noble/hashes/utils'
import client from '@/services/client.service'
import { createBitcoinTransaction } from '@/lib/bitcoin'
import { broadcastTransaction, estimateFee, type UTXO } from '@/lib/esplora-api'
import { DEFAULT_ESPLORA_APIS } from '@/lib/esplora'

interface UseSendBitcoinParams {
  utxos: UTXO[]
  feeRate: number
}

export default function useSendBitcoin({ utxos, feeRate }: UseSendBitcoinParams) {
  const [isSending, setIsSending] = useState(false)

  const estimateFeeFor = () => estimateFee(utxos.length, 1, feeRate)

  const send = async (toAddress: string, amountSats: number) => {
    const privateKey = client.signer?.getPrivateKeyByteArray?.()
    if (!privateKey) {
      throw new Error('This wallet requires a private key to send on-chain Bitcoin.')
    }
    if (utxos.length === 0) {
      throw new Error('No funds available to send.')
    }

    setIsSending(true)
    try {
      const privateKeyHex = bytesToHex(privateKey)
      const { txHex } = createBitcoinTransaction(privateKeyHex, toAddress, amountSats, utxos, feeRate)
      const txid = await broadcastTransaction(txHex, [...DEFAULT_ESPLORA_APIS])
      return txid
    } finally {
      setIsSending(false)
    }
  }

  return { isSending, send, estimateFeeFor }
}