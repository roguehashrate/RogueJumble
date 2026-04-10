import { getUserStatusFromEvent } from '@/lib/event-metadata'
import client from '@/services/client.service'
import { useEffect, useState } from 'react'

export default function UserStatusBubble({ pubkey }: { pubkey: string }) {
  const [status, setStatus] = useState<string | null>(null)
  const [expiration, setExpiration] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true

    const fetchStatus = async () => {
      try {
        const event = await client.fetchUserStatus(pubkey)
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
  }, [pubkey])

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
    <div className="absolute -top-20 left-[123px] z-10 max-w-[240px]">
      <div className="relative rounded-2xl bg-card/70 px-4 py-3 text-sm backdrop-blur-sm">
        <div className="relative">
          <p className="line-clamp-3 leading-snug text-foreground">
            {status}
          </p>
          {expiration && (
            <span className="mt-1 block text-[10px] font-medium text-muted-foreground">
              {formatTimeRemaining(expiration)}
            </span>
          )}
        </div>
        {/* Thought bubble dots — trail toward profile picture */}
        <div className="absolute -left-2 bottom-2">
          <div className="h-2 w-2 rounded-full bg-card/70" />
          <div className="absolute -bottom-2 -left-2 h-1.5 w-1.5 rounded-full bg-card/70" />
        </div>
      </div>
    </div>
  )
}
