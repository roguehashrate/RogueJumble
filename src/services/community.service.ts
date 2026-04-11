import { Event, kinds } from 'nostr-tools'

const STORAGE_KEY = 'joinedCommunities'
const APPROVALS_STORAGE_KEY = 'communityApprovals'

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

export type TCommunityApproval = {
  communityCoordinate: string
  postEventId: string
  postAuthorPubkey: string
  approvalEventId: string
  approvalEvent: Event
}

class CommunityService {
  private joinedMap: Map<string, TCommunityInfo> = new Map()
  private approvalsMap: Map<string, TCommunityApproval> = new Map()
  private currentPubkey: string | null = null

  private getStorageKey(): string {
    return this.currentPubkey ? `${STORAGE_KEY}_${this.currentPubkey}` : STORAGE_KEY
  }

  private getApprovalsStorageKey(): string {
    return this.currentPubkey ? `${APPROVALS_STORAGE_KEY}_${this.currentPubkey}` : APPROVALS_STORAGE_KEY
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
    this.loadApprovalsFromStorage()
  }

  private saveToStorage() {
    const data = Array.from(this.joinedMap.values())
    localStorage.setItem(this.getStorageKey(), JSON.stringify(data))
  }

  private loadApprovalsFromStorage() {
    try {
      const raw = localStorage.getItem(this.getApprovalsStorageKey())
      if (raw) {
        const data = JSON.parse(raw) as TCommunityApproval[]
        this.approvalsMap = new Map(data.map((a) => [a.approvalEventId, a]))
      } else {
        this.approvalsMap.clear()
      }
    } catch {
      this.approvalsMap.clear()
    }
  }

  private saveApprovalsToStorage() {
    const data = Array.from(this.approvalsMap.values())
    localStorage.setItem(this.getApprovalsStorageKey(), JSON.stringify(data))
  }

  setPubkey(pubkey: string | null) {
    this.currentPubkey = pubkey
    this.loadFromStorage()
  }

  clear() {
    this.currentPubkey = null
    this.joinedMap.clear()
    this.approvalsMap.clear()
  }

  /**
   * Check if the current user is a moderator of a community.
   */
  isModerator(communityCoordinate: string): boolean {
    const community = this.joinedMap.get(communityCoordinate)
    if (!community || !community.moderators) return false
    return community.moderators.includes(this.currentPubkey ?? '')
  }

  /**
   * Check if a community event lists the given pubkey as a moderator.
   */
  isModeratorOfEvent(event: Event, pubkey: string): boolean {
    const moderators = event.tags
      .filter((t) => t[0] === 'moderators')
      .map((t) => t[1])
      .filter(Boolean)
    return moderators.includes(pubkey)
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

  // Approval tracking methods

  /**
   * Record an approval event.
   */
  recordApproval(communityCoordinate: string, postEventId: string, postAuthorPubkey: string, approvalEvent: Event) {
    const approval: TCommunityApproval = {
      communityCoordinate,
      postEventId,
      postAuthorPubkey,
      approvalEventId: approvalEvent.id,
      approvalEvent
    }
    this.approvalsMap.set(approval.approvalEventId, approval)
    this.saveApprovalsToStorage()
  }

  /**
   * Check if a post has been approved by the current user in a community.
   */
  hasApproved(communityCoordinate: string, postEventId: string): boolean {
    return Array.from(this.approvalsMap.values()).some(
      (a) => a.communityCoordinate === communityCoordinate && a.postEventId === postEventId
    )
  }

  /**
   * Get all approvals for a community.
   */
  getApprovalsForCommunity(communityCoordinate: string): TCommunityApproval[] {
    return Array.from(this.approvalsMap.values()).filter(
      (a) => a.communityCoordinate === communityCoordinate
    )
  }

  /**
   * Get all post event IDs that have been approved in a community.
   */
  getApprovedPostIds(communityCoordinate: string): Set<string> {
    const approvals = this.getApprovalsForCommunity(communityCoordinate)
    return new Set(approvals.map((a) => a.postEventId))
  }

  /**
   * Check if a post has any approval in a community.
   */
  isPostApproved(communityCoordinate: string, postEventId: string): boolean {
    return this.getApprovedPostIds(communityCoordinate).has(postEventId)
  }

  /**
   * Remove an approval (e.g. when revoked).
   */
  removeApproval(approvalEventId: string) {
    this.approvalsMap.delete(approvalEventId)
    this.saveApprovalsToStorage()
  }
}

export const communityService = new CommunityService()
