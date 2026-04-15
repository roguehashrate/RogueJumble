import { ROGUEJUMBLE_PUBKEY, ROGUE_HASHRATE_PUBKEY } from '@/constants'
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

    if (this.provider) {
      const { preimage } = await this.provider.sendPayment(pr)
      closeOuterModel?.()
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
    if (this.provider) {
      const { preimage } = await this.provider.sendPayment(invoice)
      closeOuterModel?.()
      return { preimage, invoice: invoice }
    }

    return new Promise((resolve) => {
      closeOuterModel?.()
      launchPaymentModal({
        invoice: invoice,
        onPaid: (response) => {
          resolve({ preimage: response.preimage, invoice: invoice })
        },
        onCancelled: () => {
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

      const { preimage } = await this.provider.sendPayment(pr)
      return { preimage, invoice: pr }
    } catch (error) {
      console.error('Failed to send to address:', error)
      throw error
    }
  }

  async getTransactionHistory(): Promise<TTransaction[]> {
    if (!this.provider) {
      return []
    }

    if (this.transactionHistoryCache) {
      return this.transactionHistoryCache
    }

    const transactions: TTransaction[] = []

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
            const invoice = payment.payment_request
            let description = ''
            try {
              const invoiceObj = new Invoice({ pr: invoice })
              description = invoiceObj.description || ''
            } catch {
              // ignore
            }

            transactions.push({
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
            })
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
            if (invoice.r_preimage) {
              transactions.push({
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
              })
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to get transaction history:', error)
    }

    transactions.sort((a, b) => b.date.getTime() - a.date.getTime())
    this.transactionHistoryCache = transactions
    return transactions
  }

  clearTransactionCache() {
    this.transactionHistoryCache = null
  }
}

const instance = new LightningService()
export default instance
