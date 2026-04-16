import { ROGUEJUMBLE_PUBKEY, ROGUE_HASHRATE_PUBKEY } from '@/constants'
import { getAmountFromInvoice } from '@/lib/lightning'
import { getZapInfoFromEvent } from '@/lib/event-metadata'
import { getDefaultRelayUrls } from '@/lib/relay'
import { TProfile } from '@/types'
import { init, launchPaymentModal } from '@getalby/bitcoin-connect-react'
import { Invoice } from '@getalby/lightning-tools'
import { bech32 } from '@scure/base'
import { WebLNProvider } from '@webbtc/webln-types'
import dayjs from 'dayjs'
import { Filter, kinds, NostrEvent } from 'nostr-tools'
import { SubCloser } from 'nostr-tools/abstract-pool'
import { makeZapRequest } from 'nostr-tools/nip57'
import { utf8Decoder } from 'nostr-tools/utils'
import client from './client.service'
import storage from './local-storage.service'

export type TRecentSupporter = { pubkey: string; amount: number; comment?: string }

export type TTransactionType = 'sent' | 'received'
export type TTransactionStatus = 'completed' | 'pending' | 'failed'

export type TTransaction = {
  id: string
  type: TTransactionType
  amount: number
  status: TTransactionStatus
  date: Date
  invoice?: string
  preimage?: string
  description?: string
  lightningAddress?: string
}

const OFFICIAL_PUBKEYS = [ROGUEJUMBLE_PUBKEY, ROGUE_HASHRATE_PUBKEY]

class LightningService {
  static instance: LightningService
  provider: WebLNProvider | null = null
  private recentSupportersCache: TRecentSupporter[] | null = null
  private transactionHistoryCache: TTransaction[] | null = null
  private pendingTransactions: TTransaction[] = []
  private onBalanceChangeCallbacks: Array<() => void> = []
  private onTransactionChangeCallbacks: Array<() => void> = []

  constructor() {
    if (!LightningService.instance) {
      LightningService.instance = this
      init({
        appName: 'RogueJumble',
        showBalance: true
      })
    }
    return LightningService.instance
  }

  onBalanceChange(callback: () => void): () => void {
    this.onBalanceChangeCallbacks.push(callback)
    return () => {
      this.onBalanceChangeCallbacks = this.onBalanceChangeCallbacks.filter((cb) => cb !== callback)
    }
  }

  onTransactionChange(callback: () => void): () => void {
    this.onTransactionChangeCallbacks.push(callback)
    return () => {
      this.onTransactionChangeCallbacks = this.onTransactionChangeCallbacks.filter(
        (cb) => cb !== callback
      )
    }
  }

  private notifyBalanceChange() {
    this.onBalanceChangeCallbacks.forEach((cb) => cb())
  }

  private notifyTransactionChange() {
    // Persist BEFORE clearing cache to ensure all data is saved
    this.persistTransactions()
    this.transactionHistoryCache = null
    this.onTransactionChangeCallbacks.forEach((cb) => cb())
  }

  private persistTransactions() {
    const allTransactions = [...this.pendingTransactions, ...(this.transactionHistoryCache || [])]
    
    // Deduplicate transactions before persisting
    const deduplicated = this.deduplicateTransactions(allTransactions)
    storage.setWalletTransactions(deduplicated)
  }

  private deduplicateTransactions(transactions: TTransaction[]): TTransaction[] {
    const seen = new Set<string>()
    const unique: TTransaction[] = []
    
    for (const tx of transactions) {
      const isDuplicate = seen.has(tx.id) || (tx.invoice && seen.has(tx.invoice))
      if (!isDuplicate) {
        unique.push(tx)
        seen.add(tx.id)
        if (tx.invoice) seen.add(tx.invoice)
      }
    }
    
    return unique
  }

  private recordTransaction(transaction: TTransaction) {
    this.pendingTransactions.unshift(transaction)
    this.onTransactionChangeCallbacks.forEach((cb) => cb())
  }

  private completePendingTransaction(pendingId: string, preimage?: string) {
    const index = this.pendingTransactions.findIndex((t) => t.id === pendingId)
    if (index !== -1) {
      const pending = this.pendingTransactions[index]
      this.pendingTransactions.splice(index, 1)
      const completed: TTransaction = {
        ...pending,
        status: 'completed',
        preimage
      }
      this.pendingTransactions.unshift(completed)
      this.onTransactionChangeCallbacks.forEach((cb) => cb())
    }
  }

  async zap(
    sender: string,
    recipientOrEvent: string | NostrEvent,
    sats: number,
    comment: string,
    closeOuterModel?: () => void
  ): Promise<{ preimage: string; invoice: string } | null> {
    if (!client.signer) {
      throw new Error('You need to be logged in to zap')
    }
    const { recipient, event } =
      typeof recipientOrEvent === 'string'
        ? { recipient: recipientOrEvent }
        : { recipient: recipientOrEvent.pubkey, event: recipientOrEvent }

    const [profile, receiptRelayList, senderRelayList] = await Promise.all([
      client.fetchProfile(recipient),
      client.fetchRelayList(recipient),
      sender
        ? client.fetchRelayList(sender)
        : Promise.resolve({ read: getDefaultRelayUrls(), write: getDefaultRelayUrls() })
    ])
    if (!profile) {
      throw new Error('Recipient not found')
    }
    const zapEndpoint = await this.getZapEndpoint(profile)
    if (!zapEndpoint) {
      throw new Error("Recipient's lightning address is invalid")
    }
    const { callback, lnurl } = zapEndpoint
    const amount = sats * 1000
    const zapRequestDraft = makeZapRequest({
      ...(event ? { event } : { pubkey: recipient }),
      amount,
      relays: receiptRelayList.read
        .slice(0, 4)
        .concat(senderRelayList.write.slice(0, 3))
        .concat(getDefaultRelayUrls()),
      comment
    })
    const zapRequest = await client.signer.signEvent(zapRequestDraft)

    const zapRequestUrl = new URL(callback)
    zapRequestUrl.searchParams.append('amount', amount.toString())
    zapRequestUrl.searchParams.append('nostr', JSON.stringify(zapRequest))
    zapRequestUrl.searchParams.append('lnurl', lnurl)

    const zapRequestRes = await fetch(zapRequestUrl.toString())
    const zapRequestResBody = await zapRequestRes.json()
    if (zapRequestResBody.error) {
      throw new Error(zapRequestResBody.message)
    }
    const { pr, verify, reason } = zapRequestResBody
    if (!pr) {
      throw new Error(reason ?? 'Failed to create invoice')
    }

    this.recordTransaction({
      id: pr,
      type: 'sent',
      amount: sats,
      status: 'pending',
      date: new Date(),
      invoice: pr,
      description: comment
    })

    if (this.provider) {
      const { preimage } = await this.provider.sendPayment(pr)
      closeOuterModel?.()
      this.completePendingTransaction(pr, preimage)
      this.notifyBalanceChange()
      this.notifyTransactionChange()
      return { preimage, invoice: pr }
    }

    return new Promise((resolve) => {
      closeOuterModel?.()
      let checkPaymentInterval: ReturnType<typeof setInterval> | undefined
      let subCloser: SubCloser | undefined
      const { setPaid } = launchPaymentModal({
        invoice: pr,
        onPaid: (response) => {
          clearInterval(checkPaymentInterval)
          subCloser?.close()
          this.completePendingTransaction(pr, response.preimage)
          this.notifyBalanceChange()
          this.notifyTransactionChange()
          resolve({ preimage: response.preimage, invoice: pr })
        },
        onCancelled: () => {
          clearInterval(checkPaymentInterval)
          subCloser?.close()
          resolve(null)
        }
      })

      if (verify) {
        checkPaymentInterval = setInterval(async () => {
          const invoice = new Invoice({ pr, verify })
          const paid = await invoice.verifyPayment()

          if (paid && invoice.preimage) {
            setPaid({
              preimage: invoice.preimage
            })
          }
        }, 1000)
      } else {
        const filter: Filter = {
          kinds: [kinds.Zap],
          '#p': [recipient],
          since: dayjs().subtract(1, 'minute').unix()
        }
        if (event) {
          filter['#e'] = [event.id]
        }
        subCloser = client.subscribe(
          senderRelayList.write.concat(getDefaultRelayUrls()).slice(0, 4),
          filter,
          {
            onevent: (evt) => {
              const info = getZapInfoFromEvent(evt)
              if (!info) return

              if (info.invoice === pr) {
                setPaid({ preimage: info.preimage ?? '' })
              }
            }
          }
        )
      }
    })
  }

  async payInvoice(
    invoice: string,
    closeOuterModel?: () => void
  ): Promise<{ preimage: string; invoice: string } | null> {
    let amount = 0
    try {
      const invoiceObj = new Invoice({ pr: invoice })
      amount = invoiceObj.satoshi
    } catch {
      amount = getAmountFromInvoice(invoice)
    }

    const pendingId = `pending-${Date.now()}`
    this.recordTransaction({
      id: pendingId,
      type: 'sent',
      amount,
      status: 'pending',
      date: new Date(),
      invoice,
      description: ''
    })

    if (this.provider) {
      const { preimage } = await this.provider.sendPayment(invoice)
      closeOuterModel?.()
      this.completePendingTransaction(invoice, preimage)
      this.notifyBalanceChange()
      this.notifyTransactionChange()
      return { preimage, invoice: invoice }
    }

    return new Promise((resolve) => {
      closeOuterModel?.()
      launchPaymentModal({
        invoice: invoice,
        onPaid: (response) => {
          this.completePendingTransaction(invoice, response.preimage)
          this.notifyBalanceChange()
          this.notifyTransactionChange()
          resolve({ preimage: response.preimage, invoice: invoice })
        },
        onCancelled: () => {
          const index = this.pendingTransactions.findIndex((t) => t.id === invoice)
          if (index !== -1) this.pendingTransactions.splice(index, 1)
          this.notifyTransactionChange()
          resolve(null)
        }
      })
    })
  }

  async fetchRecentSupporters() {
    if (this.recentSupportersCache) {
      return this.recentSupportersCache
    }
    const relayList = await client.fetchRelayList(ROGUE_HASHRATE_PUBKEY)
    const events = await client.fetchEvents(relayList.read.slice(0, 4), {
      authors: ['79f00d3f5a19ec806189fcab03c1be4ff81d18ee4f653c88fac41fe03570f432'], // alby
      kinds: [kinds.Zap],
      '#p': OFFICIAL_PUBKEYS,
      since: dayjs().subtract(1, 'month').unix()
    })
    events.sort((a, b) => b.created_at - a.created_at)
    const map = new Map<string, { pubkey: string; amount: number; comment?: string }>()
    events.forEach((event) => {
      const info = getZapInfoFromEvent(event)
      if (!info || !info.senderPubkey || OFFICIAL_PUBKEYS.includes(info.senderPubkey)) return

      const { amount, comment, senderPubkey } = info
      const item = map.get(senderPubkey)
      if (!item) {
        map.set(senderPubkey, { pubkey: senderPubkey, amount, comment })
      } else {
        item.amount += amount
        if (!item.comment && comment) item.comment = comment
      }
    })
    this.recentSupportersCache = Array.from(map.values())
      .filter((item) => item.amount >= 1000)
      .sort((a, b) => b.amount - a.amount)
    return this.recentSupportersCache
  }

  private async getZapEndpoint(profile: TProfile): Promise<null | {
    callback: string
    lnurl: string
  }> {
    try {
      let lnurl: string = ''

      // Some clients have incorrectly filled in the positions for lud06 and lud16
      if (!profile.lightningAddress) {
        console.warn('Profile has no lightning address', profile)
        return null
      }

      if (profile.lightningAddress.includes('@')) {
        const [name, domain] = profile.lightningAddress.split('@')
        lnurl = new URL(`/.well-known/lnurlp/${name}`, `https://${domain}`).toString()
      } else {
        const { words } = bech32.decode(profile.lightningAddress as any, 1000)
        const data = bech32.fromWords(words)
        lnurl = utf8Decoder.decode(data)
      }

      const res = await fetch(lnurl)
      const body = await res.json()

      console.log('Zap endpoint:', body)
      if (body.allowsNostr !== false && body.callback) {
        return {
          callback: body.callback,
          lnurl
        }
      }
    } catch (err) {
      console.error(err)
    }

    return null
  }

  async makeInvoice(amount: number, memo?: string): Promise<{ paymentRequest: string } | null> {
    if (!this.provider) {
      throw new Error('No wallet connected')
    }
    try {
      const response = await this.provider.makeInvoice({
        amount: amount.toString(),
        defaultMemo: memo || ''
      })
      return response
    } catch (error) {
      console.error('Failed to make invoice:', error)
      throw error
    }
  }

  async sendToAddress(
    address: string,
    amount: number,
    memo?: string
  ): Promise<{ preimage: string; invoice: string } | null> {
    if (!this.provider) {
      throw new Error('No wallet connected')
    }

    let lnurl: string
    if (address.includes('@')) {
      const [name, domain] = address.split('@')
      lnurl = new URL(`/.well-known/lnurlp/${name}`, `https://${domain}`).toString()
    } else {
      lnurl = address
    }

    try {
      const res = await fetch(lnurl)
      const body = await res.json()

      if (body.status === 'ERROR') {
        throw new Error(body.reason || 'Failed to fetch invoice')
      }

      const callbackUrl = new URL(body.callback)
      callbackUrl.searchParams.set('amount', (amount * 1000).toString())
      if (memo) {
        callbackUrl.searchParams.set('comment', memo)
      }

      const invoiceRes = await fetch(callbackUrl.toString())
      const invoiceBody = await invoiceRes.json()

      if (invoiceBody.status === 'ERROR') {
        throw new Error(invoiceBody.reason || 'Failed to create invoice')
      }

      const pr = invoiceBody.pr
      if (!pr) {
        throw new Error('No invoice returned')
      }

      this.recordTransaction({
        id: pr,
        type: 'sent',
        amount,
        status: 'pending',
        date: new Date(),
        invoice: pr,
        description: memo || ''
      })

      const { preimage } = await this.provider.sendPayment(pr)
      this.completePendingTransaction(pr, preimage)
      this.notifyBalanceChange()
      this.notifyTransactionChange()
      return { preimage, invoice: pr }
    } catch (error) {
      console.error('Failed to send to address:', error)
      throw error
    }
  }

  async getTransactionHistory(pubkey?: string): Promise<TTransaction[]> {
    if (!this.provider) {
      // Even if no provider, return cached transactions from localStorage
      const persisted = storage.getWalletTransactions()
      return persisted || []
    }

    if (this.transactionHistoryCache) {
      // Deduplicate pending + cached transactions
      return this.deduplicateTransactions([
        ...this.pendingTransactions,
        ...this.transactionHistoryCache
      ])
    }

    // Load persisted transactions
    const persistedTransactions = storage.getWalletTransactions()

    const transactions: TTransaction[] = [...this.pendingTransactions]
    const existingIds = new Set<string>()
    
    // Add all pending transaction IDs
    for (const t of this.pendingTransactions) {
      existingIds.add(t.id)
      if (t.invoice) existingIds.add(t.invoice)
    }

    // Add persisted transactions that aren't already in the list
    for (const persisted of persistedTransactions) {
      const isDuplicate = existingIds.has(persisted.id) || 
        (persisted.invoice && existingIds.has(persisted.invoice))
      if (!isDuplicate) {
        transactions.push(persisted as TTransaction)
        existingIds.add(persisted.id)
        if (persisted.invoice) existingIds.add(persisted.invoice)
      }
    }

    try {
      if (typeof this.provider.request === 'function') {
        const paymentsResponse = (await this.provider.request('request.listpayments')) as {
          payments: Array<{
            payment_hash: string
            value: string
            creation_date: string
            fee: string
            payment_preimage: string
            value_sat: string
            payment_request: string
            status: string
          }>
        }

        if (paymentsResponse.payments) {
          for (const payment of paymentsResponse.payments) {
            // Skip if already exists (could be in pendingTransactions or persisted)
            // Check both payment_hash and payment_request (invoice) for deduplication
            if (existingIds.has(payment.payment_hash) || existingIds.has(payment.payment_request)) {
              continue
            }

            const invoice = payment.payment_request
            let description = ''
            try {
              const invoiceObj = new Invoice({ pr: invoice })
              description = invoiceObj.description || ''
            } catch {
              // ignore
            }

            const transaction: TTransaction = {
              id: payment.payment_hash,
              type: 'sent',
              amount: parseInt(payment.value_sat) || Math.round(parseInt(payment.value) / 1000),
              status:
                payment.status === 'complete'
                  ? 'completed'
                  : payment.status === 'failed'
                    ? 'failed'
                    : 'pending',
              date: new Date(parseInt(payment.creation_date) * 1000),
              invoice: payment.payment_request,
              preimage: payment.payment_preimage,
              description
            }
            transactions.push(transaction)
            existingIds.add(payment.payment_hash)
            if (payment.payment_request) {
              existingIds.add(payment.payment_request)
            }
          }
        }

        const invoicesResponse = (await this.provider.request('request.listinvoices', {
          reversed: true
        })) as {
          invoices: Array<{
            memo: string
            r_preimage: string
            r_hash: string
            value: string
            value_sat: string
            settled: boolean
            creation_date: string
            payment_request: string
            state: string
          }>
        }

        if (invoicesResponse.invoices) {
          for (const invoice of invoicesResponse.invoices) {
            // Skip if already exists (could be in pendingTransactions or payments)
            if (existingIds.has(invoice.r_hash) || existingIds.has(invoice.payment_request)) {
              continue
            }

            if (invoice.r_preimage) {
              const transaction: TTransaction = {
                id: invoice.r_hash,
                type: 'received',
                amount: parseInt(invoice.value_sat) || Math.round(parseInt(invoice.value) / 1000),
                status:
                  invoice.state === 'SETTLED'
                    ? 'completed'
                    : invoice.state === 'CANCELED'
                      ? 'failed'
                      : 'pending',
                date: new Date(parseInt(invoice.creation_date) * 1000),
                invoice: invoice.payment_request,
                preimage: invoice.r_preimage,
                description: invoice.memo
              }
              transactions.push(transaction)
              existingIds.add(invoice.r_hash)
              if (invoice.payment_request) {
                existingIds.add(invoice.payment_request)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to get WebLN transaction history:', error)
    }

    if (pubkey) {
      try {
        const since = dayjs().subtract(3, 'month').unix()
        const zapFilter: Filter = {
          kinds: [kinds.Zap],
          since
        }

        const relayUrls = getDefaultRelayUrls()
        const receivedZaps = await client.fetchEvents(relayUrls.slice(0, 4), {
          ...zapFilter,
          '#p': [pubkey]
        })

        for (const zapEvent of receivedZaps) {
          const info = getZapInfoFromEvent(zapEvent)
          if (!info || !info.senderPubkey) continue

          if (existingIds.has(info.invoice || zapEvent.id)) continue

          transactions.push({
            id: info.invoice || zapEvent.id,
            type: 'received',
            amount: info.amount || 0,
            status: info.preimage ? 'completed' : 'pending',
            date: new Date(zapEvent.created_at * 1000),
            invoice: info.invoice,
            preimage: info.preimage,
            description: info.comment || ''
          })
          existingIds.add(info.invoice || zapEvent.id)
        }

        const sentZaps = await client.fetchEvents(relayUrls.slice(0, 4), {
          ...zapFilter,
          authors: [pubkey]
        })

        for (const zapEvent of sentZaps) {
          const info = getZapInfoFromEvent(zapEvent)
          if (!info || !info.recipientPubkey) continue

          // Check multiple identifiers for deduplication
          const zapId = info.invoice || zapEvent.id
          if (existingIds.has(zapId)) continue
          // Also check if we already have a transaction with this invoice
          if (info.invoice && existingIds.has(info.invoice)) continue

          transactions.push({
            id: zapId,
            type: 'sent',
            amount: info.amount || 0,
            status: info.preimage ? 'completed' : 'pending',
            date: new Date(zapEvent.created_at * 1000),
            invoice: info.invoice,
            preimage: info.preimage,
            description: info.comment || ''
          })
          existingIds.add(zapId)
          if (info.invoice) existingIds.add(info.invoice)
        }
      } catch (error) {
        console.error('Failed to fetch zap history:', error)
      }
    }

    transactions.sort((a, b) => b.date.getTime() - a.date.getTime())
    
    // Final deduplication before caching
    const deduplicated = this.deduplicateTransactions(transactions)
    this.transactionHistoryCache = deduplicated
    return deduplicated
  }

  clearTransactionCache() {
    this.transactionHistoryCache = null
    storage.clearWalletTransactions()
  }
}

const instance = new LightningService()
export default instance
