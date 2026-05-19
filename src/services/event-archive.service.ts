import { ExtendedKind, NIP71_VIDEO_KINDS } from '@/constants'
import { isNip18RepostKind, isNip25ReactionKind } from '@/lib/event'
import { getArchiveMaxBytes, getArchiveMaxEvents } from '@/lib/event-archive-config'
import { shouldDropEventOnIngest } from '@/lib/event-ingest-filter'
import indexedDb from './indexed-db.service'
import type { Event } from 'nostr-tools'

const ARCHIVE_QUEUE_MAX = 4000
const ARCHIVE_FLUSH_MS = 450
const ARCHIVE_BATCH_SIZE = 150

const TIER_REACTION_ZAP_REPOST = 0
const TIER_OTHER = 1
const TIER_CORE_FEED = 2

const SEEN_IDS = new Set<string>()
const pendingQueue: Event[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function getTier(event: Event): number {
  if (isNip25ReactionKind(event.kind) || isNip18RepostKind(event.kind)) return TIER_REACTION_ZAP_REPOST
  if (
    event.kind === ExtendedKind.PICTURE ||
    event.kind === ExtendedKind.VIDEO ||
    event.kind === ExtendedKind.SHORT_VIDEO ||
    NIP71_VIDEO_KINDS.includes(event.kind) ||
    event.kind === ExtendedKind.POLL ||
    event.kind === ExtendedKind.COMMENT ||
    event.kind === ExtendedKind.VOICE ||
    event.kind === ExtendedKind.VOICE_COMMENT ||
    event.kind === ExtendedKind.GROUP_METADATA ||
    event.kind === ExtendedKind.RELAY_REVIEW ||
    event.kind === ExtendedKind.ADDRESSABLE_NORMAL_VIDEO ||
    event.kind === ExtendedKind.ADDRESSABLE_SHORT_VIDEO
  ) {
    return TIER_OTHER
  }
  return TIER_CORE_FEED
}

function makeArchiveKey(event: Event): string {
  return `${event.id}`
}

async function flushPending(): Promise<void> {
  if (!pendingQueue.length) return
  const batch = pendingQueue.splice(0, ARCHIVE_BATCH_SIZE)
  const maxBytes = getArchiveMaxBytes()
  const maxEvents = getArchiveMaxEvents()

  for (const event of batch) {
    if (shouldDropEventOnIngest(event)) continue
    if (SEEN_IDS.has(event.id)) continue
    SEEN_IDS.add(event.id)

    const footprint = await indexedDb.getArchiveFootprint()
    if (footprint.totalEvents >= maxEvents || footprint.totalBytes >= maxBytes) {
      await indexedDb.deleteNextEvictionArchiveCandidate()
    }

    const tier = getTier(event)
    await indexedDb.putArchivedEventRow({
      key: makeArchiveKey(event),
      event,
      tier,
      pubkey: event.pubkey,
      kind: event.kind,
      accessedAt: Date.now(),
      createdAt: event.created_at
    })
  }
}

function scheduleFlush(): void {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    flushPending().catch(() => {})
  }, ARCHIVE_FLUSH_MS)
}

export function queuePersistSeenEvent(event: Event): void {
  if (pendingQueue.length >= ARCHIVE_QUEUE_MAX) return
  pendingQueue.push(event)
  scheduleFlush()
}

export async function loadArchivedEventForFetch(id: string): Promise<Event | undefined> {
  return indexedDb.getArchivedEventById(id)
}

export async function prefetchArchivedEvents(ids: string[]): Promise<Map<string, Event>> {
  return indexedDb.getArchivedEventsByIds(ids)
}
