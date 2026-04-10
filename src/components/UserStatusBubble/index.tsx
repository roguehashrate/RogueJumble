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
    <div className="absolute -top-20 left-[80px] z-10 max-w-[240px]">
      <div className="relative">
        {/* Colored glow behind the entire speech bubble */}
        <div
          className="absolute -bottom-4 left-[10px] -right-1 -top-1 rounded-xl bg-primary/30 blur-md"
          aria-hidden="true"
        />
        <div className="relative px-3 py-2.5 text-sm" style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
          {/* SVG speech bubble — single continuous shape with round corners */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 240 78"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M22 2H218C229 2,238 11,238 22V48C238 59,229 68,218 68H98L74 80L56 68H22C11 68,2 59,2 48V22C2 11,11 2,22 2Z"
              fill="hsl(var(--card) / 0.7)"
              stroke="hsl(var(--border))"
              strokeWidth="1"
            />
          </svg>
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
        </div>
      </div>
    </div>
  )
}
