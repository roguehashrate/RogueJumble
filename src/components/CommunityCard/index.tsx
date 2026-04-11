import { useMemo } from 'react'
import { Event } from 'nostr-tools'
import { Shield } from 'lucide-react'
import { communityService } from '@/services/community.service'
import { useNostr } from '@/providers/NostrProvider'
import Image from '../Image'

export default function CommunityCard({
  event,
  onJoin,
  onClick,
  badge,
  showModeratorBadge = true,
  onModerate
}: {
  event: Event
  onJoin?: () => void
  onClick?: () => void
  badge?: string
  showModeratorBadge?: boolean
  onModerate?: () => void
}) {
  const { pubkey } = useNostr()
  const info = useMemo(() => communityService.extractCommunityInfo(event), [event])
  const joined = communityService.isJoined(info.coordinate)
  const isModerator = useMemo(
    () => pubkey && communityService.isModeratorOfEvent(event, pubkey),
    [event, pubkey]
  )

  return (
    <div
      className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/60"
      onClick={onClick}
    >
      {info.image ? (
        <Image
          image={{ url: info.image, pubkey: event.pubkey }}
          className="size-12 shrink-0 rounded-full object-cover"
          classNames={{
            wrapper: 'size-12 shrink-0 rounded-full overflow-hidden'
          }}
        />
      ) : (
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
          {info.name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-semibold">{info.name}</span>
          {showModeratorBadge && isModerator && (
            <span className="shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary flex items-center gap-0.5">
              <Shield className="size-2.5" />
              Mod
            </span>
          )}
        </div>
        {info.description && (
          <div className="line-clamp-1 truncate text-sm text-muted-foreground">
            {info.description}
          </div>
        )}
        {badge && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {badge}
          </div>
        )}
        {showModeratorBadge && isModerator && onModerate && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onModerate()
            }}
            className="mt-1 text-xs text-primary hover:text-primary-hover"
          >
            Moderate
          </button>
        )}
      </div>
      {!joined && onJoin && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onJoin()
          }}
          className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Join
        </button>
      )}
      {joined && (
        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Joined
        </span>
      )}
    </div>
  )
}
