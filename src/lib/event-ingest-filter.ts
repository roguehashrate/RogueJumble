import { NIP71_VIDEO_KINDS } from '@/constants'
import { Event, kinds } from 'nostr-tools'

export function shouldDropEventOnIngest(event: Event): boolean {
  if (!event || !event.id || !event.pubkey) return true

  if (event.kind === kinds.ShortTextNote) {
    const content = event.content ?? ''
    if (/^\[{/.test(content) || content.startsWith('【') || /^\{[^}]+\}$/.test(content)) {
      return true
    }
  }

  if (
    (event.kind === kinds.Reaction || event.kind === kinds.Repost) &&
    !event.tags.some((t) => t[0] === 'e' || t[0] === 'a')
  ) {
    return true
  }

  if (NIP71_VIDEO_KINDS.includes(event.kind)) {
    const hasUrl = event.tags.some((t) => t[0] === 'url' && t[1])
    const hasImeta = event.tags.some((t) => t[0] === 'imeta' && t[1])
    if (!hasUrl && !hasImeta) return true
  }

  return false
}
