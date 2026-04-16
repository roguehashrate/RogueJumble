import { getUserStatusFromEvent } from '@/lib/event-metadata'
import client from '@/services/client.service'
import { useNostr } from '@/providers/NostrProvider'
import { useEffect, useState } from 'react'

export default function UserStatusBadge({
  pubkey,
  className
}: {
  pubkey: string
  className?: string
}) {
  const { pubkey: myPubkey, userStatusEvent } = useNostr()
  const [status, setStatus] = useState<string | null>(null)
  const [expiration, setExpiration] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true

    const fetchStatus = async () => {
      try {
        let event = null

        if (myPubkey && pubkey === myPubkey && userStatusEvent) {
          event = userStatusEvent
        } else {
          event = await client.fetchUserStatus(pubkey)
        }

        if (!mounted || !event) return

        const userStatus = getUserStatusFromEvent(event)
        if (!userStatus) return

        setStatus(userStatus.content)
        setExpiration(userStatus.expiration ?? null)
      } catch (error) {
        console.error('Failed to fetch user status:', error)
      }
    }

    fetchStatus()

    return () => {
      mounted = false
    }
  }, [pubkey, myPubkey, userStatusEvent])

  if (!status) return null

  const now = Math.floor(Date.now() / 1000)
  const isExpired = expiration && expiration < now

  if (isExpired) return null

  const formatTimeRemaining = (exp: number) => {
    const diff = exp - now
    if (diff < 60) return '<1m'
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
  }

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs ${className}`}
    >
      <span className="max-w-[150px] truncate">{status}</span>
      {expiration && (
        <span className="shrink-0 text-muted-foreground">({formatTimeRemaining(expiration)})</span>
      )}
    </div>
  )
}
