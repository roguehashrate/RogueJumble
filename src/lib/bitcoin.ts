import * as btc from '@scure/btc-signer'
import { hexToBytes, bytesToHex } from '@noble/hashes/utils'
import { DUST_LIMIT, estimateFee, type UTXO } from './esplora-api'

function isValidPubkeyHex(s: string): boolean {
  return typeof s === 'string' && /^[0-9a-fA-F]{64}$/.test(s)
}

export function nostrPubkeyToBitcoinAddress(pubkeyHex: string): string {
  if (!isValidPubkeyHex(pubkeyHex)) return ''

  try {
    const internalPubkey = hexToBytes(pubkeyHex)
    const payment = btc.p2tr(internalPubkey, undefined, btc.NETWORK)
    return payment.address || ''
  } catch (error) {
    console.error('Error generating Bitcoin address:', error)
    return ''
  }
}

export interface UnsignedPsbt {
  psbtHex: string
  fee: number
}

export interface PsbtRecipient {
  address: string
  amountSats: number
}

export function buildUnsignedPsbtMulti(
  senderPubkeyHex: string,
  recipients: PsbtRecipient[],
  utxos: UTXO[],
  feeRate: number
): UnsignedPsbt {
  if (recipients.length === 0) throw new Error('At least one recipient is required.')

  for (const r of recipients) {
    if (!Number.isFinite(r.amountSats) || r.amountSats < DUST_LIMIT) {
      throw new Error(
        `Each recipient must receive at least ${DUST_LIMIT} sats (dust limit). Got ${r.amountSats}.`
      )
    }
  }

  const internalPubkey = hexToBytes(senderPubkeyHex)

  const senderPayment = btc.p2tr(internalPubkey, undefined, btc.NETWORK)
  const changeAddress = senderPayment.address
  if (!changeAddress) throw new Error('Failed to derive change address')
  const senderScript = senderPayment.script

  const tx = new btc.Transaction()
  let totalInput = 0

  for (const utxo of utxos) {
    tx.addInput({
      txid: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: senderScript,
        amount: BigInt(utxo.value)
      },
      tapInternalKey: internalPubkey
    })
    totalInput += utxo.value
  }

  const totalOut = recipients.reduce((s, r) => s + r.amountSats, 0)

  const numRecipients = recipients.length
  const feeWithChange = estimateFee(utxos.length, numRecipients + 1, feeRate)
  const changeWithBoth = totalInput - totalOut - feeWithChange
  const hasChange = changeWithBoth >= DUST_LIMIT
  const numOutputs = hasChange ? numRecipients + 1 : numRecipients
  const fee = estimateFee(utxos.length, numOutputs, feeRate)
  const change = totalInput - totalOut - fee

  if (change < 0) {
    throw new Error(
      `Insufficient funds. Need ${(totalOut + fee).toLocaleString()} sats, have ${totalInput.toLocaleString()} sats.`
    )
  }

  for (const r of recipients) {
    tx.addOutputAddress(r.address, BigInt(r.amountSats), btc.NETWORK)
  }

  if (hasChange) {
    tx.addOutputAddress(changeAddress, BigInt(change), btc.NETWORK)
  }

  return { psbtHex: bytesToHex(tx.toPSBT()), fee }
}

export function buildUnsignedPsbt(
  senderPubkeyHex: string,
  toAddress: string,
  amountSats: number,
  utxos: UTXO[],
  feeRate: number
): UnsignedPsbt {
  return buildUnsignedPsbtMulti(senderPubkeyHex, [{ address: toAddress, amountSats }], utxos, feeRate)
}

export function signPsbtLocal(psbtHex: string, privateKeyHex: string): string {
  const tx = btc.Transaction.fromPSBT(hexToBytes(psbtHex))
  const privKey = hexToBytes(privateKeyHex)

  const signedCount = tx.sign(privKey)

  if (signedCount === 0) {
    throw new Error('No inputs in this PSBT are owned by the signer.')
  }

  return bytesToHex(tx.toPSBT())
}

export function finalizePsbt(psbtHex: string): string {
  const tx = btc.Transaction.fromPSBT(hexToBytes(psbtHex))
  tx.finalize()
  return bytesToHex(tx.extract())
}

export function createBitcoinTransaction(
  privateKeyHex: string,
  toAddress: string,
  amountSats: number,
  utxos: UTXO[],
  feeRate: number
): { txHex: string; fee: number } {
  const internalPubkey = btc.utils.pubSchnorr(hexToBytes(privateKeyHex))
  const senderPubkeyHex = bytesToHex(internalPubkey)

  const { psbtHex, fee } = buildUnsignedPsbt(senderPubkeyHex, toAddress, amountSats, utxos, feeRate)
  const signedHex = signPsbtLocal(psbtHex, privateKeyHex)
  const txHex = finalizePsbt(signedHex)

  return { txHex, fee }
}