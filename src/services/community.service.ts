import { Event, kinds } from 'nostr-tools'

const STORAGE_KEY = 'joinedCommunities'

export type TCommunityInfo = {
  coordinate: string
  pubkey: string
  dTag: string
  name: string
  description?: string
  image?: string
  relays?: string[]
  moderators?: string[]
}

class CommunityService {
  private joinedMap: Map<string, TCommunityInfo> = new Map()
  private currentPubkey: string | null = null

  private getStorageKey(): string {
    return this.currentPubkey ? `${STORAGE_KEY}_${this.currentPubkey}` : STORAGE_KEY
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(this.getStorageKey())
      if (raw) {
        const data = JSON.parse(raw) as TCommunityInfo[]
        this.joinedMap = new Map(data.map((c) => [c.coordinate, c]))
      } else {
        this.joinedMap.clear()
      }
    } catch {
      this.joinedMap.clear()
    }
  }

  private saveToStorage() {
    const data = Array.from(this.joinedMap.values())
    localStorage.setItem(this.getStorageKey(), JSON.stringify(data))
  }

  setPubkey(pubkey: string | null) {
    this.currentPubkey = pubkey
    this.loadFromStorage()
  }

  clear() {
    this.currentPubkey = null
    this.joinedMap.clear()
  }

  getJoinedCommunities(): TCommunityInfo[] {
    return Array.from(this.joinedMap.values())
  }

  isJoined(coordinate: string): boolean {
    return this.joinedMap.has(coordinate)
  }

  joinCommunity(info: TCommunityInfo) {
    this.joinedMap.set(info.coordinate, info)
    this.saveToStorage()
  }

  leaveCommunity(coordinate: string) {
    this.joinedMap.delete(coordinate)
    this.saveToStorage()
  }

  getCommunityCoordinate(event: Event): string {
    return `${kinds.CommunityDefinition}:${event.pubkey}:${event.tags.find((t) => t[0] === 'd')?.[1] ?? ''}`
  }

  extractCommunityInfo(event: Event): TCommunityInfo {
    const dTag = event.tags.find((t) => t[0] === 'd')?.[1] ?? ''
    const name = event.tags.find((t) => t[0] === 'name')?.[1] ?? 'Unnamed'
    const description = event.tags.find((t) => t[0] === 'description')?.[1] ?? ''
    const image = event.tags.find((t) => t[0] === 'image')?.[1] ?? ''
    const relays = event.tags
      .filter((t) => t[0] === 'relays')
      .map((t) => t[1])
      .filter(Boolean) as string[]
    const moderators = event.tags
      .filter((t) => t[0] === 'moderators')
      .map((t) => t[1])
      .filter(Boolean) as string[]

    return {
      coordinate: `${kinds.CommunityDefinition}:${event.pubkey}:${dTag}`,
      pubkey: event.pubkey,
      dTag,
      name,
      description,
      image,
      relays,
      moderators
    }
  }
}

export const communityService = new CommunityService()
