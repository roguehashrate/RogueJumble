import { StorageKey } from '@/constants'
import storage from '@/services/local-storage.service'

export function getArchiveMaxBytes(): number {
  const userMb = storage.get(StorageKey.EVENT_ARCHIVE_MAX_MB)
  if (userMb != null && typeof userMb === 'number' && userMb > 0) {
    return userMb * 1024 * 1024
  }
  return 2048 * 1024 * 1024
}

export function getArchiveMaxEvents(): number {
  const userMax = storage.get(StorageKey.EVENT_ARCHIVE_MAX_EVENTS)
  if (userMax != null && typeof userMax === 'number' && userMax > 0) {
    return userMax
  }
  return 80_000
}
