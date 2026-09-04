import client from '@/services/client.service'
import { nostrPubkeyToBitcoinAddress } from '@/lib/bitcoin'
import { broadcastTransaction, type UTXO } from '@/lib/esplora-api'
import { DEFAULT_ESPLORA_APIS } from '@/lib/esplora'
import { createBitcoinTransaction } from '@/lib/bitcoin'
import { ExtendedKind } from '@/constants'
import { getDefaultRelayUrls } from '@/lib/relay'

export function resolveOnchainAddress(
  pubkey: string,
  methods?: Array<{ type: string; authority: string }>
): string | null {
  // A declared `bc1…` on-chain target is honored (kind 8333 still attributes
  // the payment to the recipient via the `p` tag). An `sp1…` silent-payment
  // target is NOT used for on-chain zaps: sending a plain P2TR tx to an
  // `sp1…` code is invalid, and BIP-352 silent-payment sending is not
  // supported here (it also publishes no kind 8333). Fall back to the
  // recipient's derived Taproot address, which kind 8333 verification
  // matches against.
  const bitcoinMethod = methods?.find((m) => m.type.toLowerCase() === 'bitcoin')
  const declared = bitcoinMethod?.authority?.trim()
  if (declared && /^bc1/.test(declared)) {
    return declared
  }
  return nostrPubkeyToBitcoinAddress(pubkey) || null
}

export class BitcoinZapError extends Error {}

export interface OnchainZapResult {
  txid: string
  address: string
}

export async function onchainZap(
  recipientPubkey: string,
  recipientAddress: string,
  sats: number,
  utxos: UTXO[],
  feeRate: number,
  comment?: string,
  event?: { id: string; kind: number; tags: string[][] }
): Promise<OnchainZapResult> {
  const privateKey = client.signer?.getPrivateKeyByteArray?.()
  if (!privateKey) {
    throw new BitcoinZapError('This wallet requires a private key to send on-chain Bitcoin.')
  }

  if (utxos.length === 0) {
    throw new BitcoinZapError('No on-chain funds available to send.')
  }

  const { bytesToHex } = await import('@noble/hashes/utils')
  const privateKeyHex = bytesToHex(privateKey)
  const { txHex } = createBitcoinTransaction(privateKeyHex, recipientAddress, sats, utxos, feeRate)

  const txid = await broadcastTransaction(txHex, [...DEFAULT_ESPLORA_APIS])

  await publishOnchainReceipt(recipientPubkey, sats, comment, event, txid)

  return { txid, address: recipientAddress }
}

async function publishOnchainReceipt(
  recipientPubkey: string,
  sats: number,
  comment?: string,
  event?: { id: string; kind: number; tags?: string[][] },
  txid?: string
): Promise<void> {
  if (!client.signer) {
    throw new BitcoinZapError('You need to be logged in to send zaps')
  }

  const tags: string[][] = [
    ['i', `bitcoin:tx:${txid ?? ''}`],
    ['p', recipientPubkey],
    ['amount', sats.toString()]
  ]

  if (event) {
    if (event.kind >= 30000 && event.kind < 40000 && event.tags) {
      const dTag = event.tags.find(([n]) => n === 'd')?.[1] ?? ''
      tags.push(['a', `${event.kind}:${recipientPubkey}:${dTag}`])
    }
    tags.push(['e', event.id])
  }
  tags.push(['alt', `Bitcoin zap: ${sats.toLocaleString()} sats`])

  const signedEvent = await client.signer.signEvent({
    kind: ExtendedKind.ONCHAIN_ZAP,
    content: comment ?? '',
    created_at: Math.floor(Date.now() / 1000),
    tags
  })

  let relayList: { read: string[]; write: string[] }
  try {
    relayList = await client.fetchRelayList(recipientPubkey)
  } catch {
    relayList = { read: [], write: [] }
  }

  const targets = [...relayList.read.slice(0, 4), ...getDefaultRelayUrls()].filter(
    (u, i, a) => a.indexOf(u) === i
  )

  await client.publishEvent(targets.slice(0, 8), signedEvent)
}