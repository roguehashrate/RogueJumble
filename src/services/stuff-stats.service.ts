import { ExtendedKind } from '@/constants'
import {
  getEventKey,
  getNoteBech32Id,
  getReplaceableCoordinateFromEvent,
  isReplaceableEvent
} from '@/lib/event'
import { getZapInfoFromEvent } from '@/lib/event-metadata'
import { getDefaultRelayUrls } from '@/lib/relay'
import { getEmojiInfosFromEmojiTags, tagNameEquals } from '@/lib/tag'
import client from '@/services/client.service'
import indexedDb from '@/services/indexed-db.service'
import { TEmoji } from '@/types'
import dayjs from 'dayjs'
import { Event, Filter, kinds } from 'nostr-tools'

export type TStuffStats = {
  likeIdSet: Set<string>
  likes: {
    id: string
    eventId: string
    pubkey: string
    created_at: number
    emoji: TEmoji | string
  }[]
  repostPubkeySet: Set<string>
  reposts: { id: string; pubkey: string; created_at: number }[]
  zapPrSet: Set<string>
  zaps: { pr: string; pubkey: string; amount: number; created_at: number; comment?: string }[]
  updatedAt?: number
}

type TStuffStatsDbFormat = {
  likeIdSet: string[]
  likes: TStuffStats['likes']
  repostPubkeySet: string[]
  reposts: TStuffStats['reposts']
  zapPrSet: string[]
  zaps: TStuffStats['zaps']
  updatedAt?: number
}

class StuffStatsService {
  static instance: StuffStatsService
  private stuffStatsMap: Map<string, Partial<TStuffStats>> = new Map()
  private stuffStatsSubscribers = new Map<string, Set<() => void>>()
  private initialized = false

  constructor() {
    if (!StuffStatsService.instance) {
      StuffStatsService.instance = this
    }
    return StuffStatsService.instance
  }

  private async init() {
    if (this.initialized) return
    this.initialized = true
  }

  private serializeForDb(stats: Partial<TStuffStats>): TStuffStatsDbFormat | null {
    if (!stats) return null
    return {
      likeIdSet: Array.from(stats.likeIdSet || []),
      likes: stats.likes || [],
      repostPubkeySet: Array.from(stats.repostPubkeySet || []),
      reposts: stats.reposts || [],
      zapPrSet: Array.from(stats.zapPrSet || []),
      zaps: stats.zaps || [],
      updatedAt: stats.updatedAt
    }
  }

  private deserializeFromDb(data: TStuffStatsDbFormat): Partial<TStuffStats> {
    return {
      likeIdSet: new Set(data.likeIdSet),
      likes: data.likes,
      repostPubkeySet: new Set(data.repostPubkeySet),
      reposts: data.reposts,
      zapPrSet: new Set(data.zapPrSet),
      zaps: data.zaps,
      updatedAt: data.updatedAt
    }
  }

  private async loadFromCache(key: string) {
    await this.init()
    const cached = await indexedDb.getStuffStats(key)
    if (cached) {
      const stats = this.deserializeFromDb(cached as TStuffStatsDbFormat)
      this.stuffStatsMap.set(key, stats)
    }
  }

  private async saveToCache(key: string) {
    const stats = this.stuffStatsMap.get(key)
    if (stats) {
      const serialized = this.serializeForDb(stats)
      if (serialized) {
        await indexedDb.putStuffStats(key, serialized)
      }
    }
  }

  async fetchStuffStats(stuff: Event | string, pubkey?: string | null) {
    await this.init()
    const { event, externalContent } =
      typeof stuff === 'string'
        ? { event: undefined, externalContent: stuff }
        : { event: stuff, externalContent: undefined }
    const key = event ? getEventKey(event) : externalContent

    if (!this.stuffStatsMap.has(key)) {
      await this.loadFromCache(key)
    }

    const oldStats = this.stuffStatsMap.get(key)
    let since: number | undefined
    if (oldStats?.updatedAt) {
      since = oldStats.updatedAt
    }
    const [relayList, authorProfile] = event
      ? await Promise.all([client.fetchRelayList(event.pubkey), client.fetchProfile(event.pubkey)])
      : []

    const replaceableCoordinate =
      event && isReplaceableEvent(event.kind) ? getReplaceableCoordinateFromEvent(event) : undefined

    const filters: Filter[] = []

    if (event) {
      filters.push(
        {
          '#e': [event.id],
          kinds: [kinds.Reaction],
          limit: 500
        },
        {
          '#e': [event.id],
          kinds: [kinds.Repost, kinds.GenericRepost],
          limit: 100
        }
      )
    } else {
      filters.push({
        '#i': [externalContent],
        kinds: [ExtendedKind.EXTERNAL_CONTENT_REACTION],
        limit: 500
      })
    }

    if (replaceableCoordinate) {
      filters.push(
        {
          '#a': [replaceableCoordinate],
          kinds: [kinds.Reaction],
          limit: 500
        },
        {
          '#a': [replaceableCoordinate],
          kinds: [kinds.Repost, kinds.GenericRepost],
          limit: 100
        }
      )
    }

    if (event && authorProfile?.lightningAddress) {
      filters.push({
        '#e': [event.id],
        kinds: [kinds.Zap],
        limit: 500
      })

      if (replaceableCoordinate) {
        filters.push({
          '#a': [replaceableCoordinate],
          kinds: [kinds.Zap],
          limit: 500
        })
      }
    }

    if (pubkey) {
      filters.push(
        event
          ? {
              '#e': [event.id],
              authors: [pubkey],
              kinds:
                event.kind === kinds.ShortTextNote
                  ? [kinds.Reaction, kinds.Repost]
                  : [kinds.Reaction, kinds.Repost, kinds.GenericRepost]
            }
          : {
              '#i': [externalContent],
              authors: [pubkey],
              kinds: [ExtendedKind.EXTERNAL_CONTENT_REACTION]
            }
      )

      if (replaceableCoordinate) {
        filters.push({
          '#a': [replaceableCoordinate],
          authors: [pubkey],
          kinds: [kinds.Reaction, kinds.Repost, kinds.GenericRepost]
        })
      }

      if (event && authorProfile?.lightningAddress) {
        filters.push({
          '#e': [event.id],
          '#P': [pubkey],
          kinds: [kinds.Zap]
        })

        if (replaceableCoordinate) {
          filters.push({
            '#a': [replaceableCoordinate],
            '#P': [pubkey],
            kinds: [kinds.Zap]
          })
        }
      }
    }

    if (since) {
      filters.forEach((filter) => {
        filter.since = since
      })
    }

    const relays = relayList
      ? relayList.read.concat(getDefaultRelayUrls()).slice(0, 5)
      : getDefaultRelayUrls()

    const events: Event[] = []
    await client.fetchEvents(relays, filters, {
      onevent: (evt) => {
        this.updateStuffStatsByEvents([evt])
        events.push(evt)
      }
    })
    this.stuffStatsMap.set(key, {
      ...(this.stuffStatsMap.get(key) ?? {}),
      updatedAt: dayjs().unix()
    })
    await this.saveToCache(key)
    return this.stuffStatsMap.get(key) ?? {}
  }

  subscribeStuffStats(stuffKey: string, callback: () => void) {
    let set = this.stuffStatsSubscribers.get(stuffKey)
    if (!set) {
      set = new Set()
      this.stuffStatsSubscribers.set(stuffKey, set)
    }
    set.add(callback)
    return () => {
      set?.delete(callback)
      if (set?.size === 0) this.stuffStatsSubscribers.delete(stuffKey)
    }
  }

  private notifyStuffStats(stuffKey: string) {
    const set = this.stuffStatsSubscribers.get(stuffKey)
    if (set) {
      set.forEach((cb) => cb())
    }
  }

  getStuffStats(stuffKey: string): Partial<TStuffStats> | undefined {
    return this.stuffStatsMap.get(stuffKey)
  }

  async addZap(
    pubkey: string,
    eventId: string,
    pr: string,
    amount: number,
    comment?: string,
    created_at: number = dayjs().unix(),
    notify: boolean = true
  ) {
    await this.init()
    if (!this.stuffStatsMap.has(eventId)) {
      await this.loadFromCache(eventId)
    }
    const old = this.stuffStatsMap.get(eventId) || {}
    const zapPrSet = old.zapPrSet || new Set()
    const zaps = old.zaps || []
    if (zapPrSet.has(pr)) return

    zapPrSet.add(pr)
    zaps.push({ pr, pubkey, amount, comment, created_at })
    this.stuffStatsMap.set(eventId, { ...old, zapPrSet, zaps })
    await this.saveToCache(eventId)
    if (notify) {
      this.notifyStuffStats(eventId)
    }
    return eventId
  }

  async updateStuffStatsByEvents(events: Event[]) {
    await this.init()
    const targetKeySet = new Set<string>()
    for (const evt of events) {
      let targetKey: string | undefined
      if (evt.kind === kinds.Reaction) {
        targetKey = await this.addLikeByEvent(evt)
      } else if (evt.kind === ExtendedKind.EXTERNAL_CONTENT_REACTION) {
        targetKey = await this.addExternalContentLikeByEvent(evt)
      } else if (evt.kind === kinds.Repost || evt.kind === kinds.GenericRepost) {
        targetKey = await this.addRepostByEvent(evt)
      } else if (evt.kind === kinds.Zap) {
        targetKey = await this.addZapByEvent(evt)
      }
      if (targetKey) {
        targetKeySet.add(targetKey)
      }
    }
    targetKeySet.forEach((targetKey) => {
      this.notifyStuffStats(targetKey)
    })
  }

  private async addLikeByEvent(evt: Event) {
    let targetEventKey
    targetEventKey = evt.tags.findLast(tagNameEquals('a'))?.[1]
    if (!targetEventKey) {
      targetEventKey = evt.tags.findLast(tagNameEquals('e'))?.[1]
    }

    if (!targetEventKey) {
      return
    }

    if (!this.stuffStatsMap.has(targetEventKey)) {
      await this.loadFromCache(targetEventKey)
    }

    const old = this.stuffStatsMap.get(targetEventKey) || {}
    const likeIdSet = old.likeIdSet || new Set()
    const likes = old.likes || []
    if (likeIdSet.has(evt.id)) return

    let emoji: TEmoji | string = evt.content.trim()
    if (!emoji) return

    if (emoji.startsWith(':') && emoji.endsWith(':')) {
      const emojiInfos = getEmojiInfosFromEmojiTags(evt.tags)
      const shortcode = emoji.split(':')[1]
      const emojiInfo = emojiInfos.find((info) => info.shortcode === shortcode)
      if (emojiInfo) {
        emoji = emojiInfo
      } else {
        emoji = '+'
      }
    }

    likeIdSet.add(evt.id)
    likes.push({
      id: evt.id,
      eventId: getNoteBech32Id(evt),
      pubkey: evt.pubkey,
      created_at: evt.created_at,
      emoji
    })
    this.stuffStatsMap.set(targetEventKey, { ...old, likeIdSet, likes })
    await this.saveToCache(targetEventKey)
    return targetEventKey
  }

  private async addExternalContentLikeByEvent(evt: Event) {
    const target = evt.tags.findLast(tagNameEquals('i'))?.[1]
    if (!target) return

    if (!this.stuffStatsMap.has(target)) {
      await this.loadFromCache(target)
    }

    const old = this.stuffStatsMap.get(target) || {}
    const likeIdSet = old.likeIdSet || new Set()
    const likes = old.likes || []
    if (likeIdSet.has(evt.id)) return

    let emoji: TEmoji | string = evt.content.trim()
    if (!emoji) return

    if (emoji.startsWith(':') && emoji.endsWith(':')) {
      const emojiInfos = getEmojiInfosFromEmojiTags(evt.tags)
      const shortcode = emoji.split(':')[1]
      const emojiInfo = emojiInfos.find((info) => info.shortcode === shortcode)
      if (emojiInfo) {
        emoji = emojiInfo
      } else {
        emoji = '+'
      }
    }

    likeIdSet.add(evt.id)
    likes.push({
      id: evt.id,
      eventId: getNoteBech32Id(evt),
      pubkey: evt.pubkey,
      created_at: evt.created_at,
      emoji
    })
    this.stuffStatsMap.set(target, { ...old, likeIdSet, likes })
    await this.saveToCache(target)
    return target
  }

  private async addRepostByEvent(evt: Event) {
    let targetEventKey
    targetEventKey = evt.tags.find(tagNameEquals('a'))?.[1]
    if (!targetEventKey) {
      targetEventKey = evt.tags.find(tagNameEquals('e'))?.[1]
    }

    if (!targetEventKey) {
      return
    }

    if (!this.stuffStatsMap.has(targetEventKey)) {
      await this.loadFromCache(targetEventKey)
    }

    const old = this.stuffStatsMap.get(targetEventKey) || {}
    const repostPubkeySet = old.repostPubkeySet || new Set()
    const reposts = old.reposts || []
    if (repostPubkeySet.has(evt.pubkey)) return

    repostPubkeySet.add(evt.pubkey)
    reposts.push({ id: evt.id, pubkey: evt.pubkey, created_at: evt.created_at })
    this.stuffStatsMap.set(targetEventKey, { ...old, repostPubkeySet, reposts })
    await this.saveToCache(targetEventKey)
    return targetEventKey
  }

  private async addZapByEvent(evt: Event) {
    const info = getZapInfoFromEvent(evt)
    if (!info) return
    const { originalEventId, senderPubkey, invoice, amount, comment } = info
    if (!originalEventId || !senderPubkey || amount <= 0) return

    return this.addZap(
      senderPubkey,
      originalEventId,
      invoice,
      amount,
      comment,
      evt.created_at,
      false
    )
  }
}

const instance = new StuffStatsService()

export default instance
