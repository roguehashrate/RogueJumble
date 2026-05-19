import { StorageKey } from '@/constants'

export function getArchiveMaxBytes(): number {
  const raw = window.localStorage.getItem(StorageKey.EVENT_ARCHIVE_MAX_MB)
  if (raw != null) {
    const userMb = Number(raw)
    if (!isNaN(userMb) && userMb > 0) {
      return userMb * 1024 * 1024
    }
  }
  return 2048 * 1024 * 1024
}

export function getArchiveMaxEvents(): number {
  const raw = window.localStorage.getItem(StorageKey.EVENT_ARCHIVE_MAX_EVENTS)
  if (raw != null) {
    const userMax = Number(raw)
    if (!isNaN(userMax) && userMax > 0) {
      return userMax
    }
  }
  return 80_000
}
