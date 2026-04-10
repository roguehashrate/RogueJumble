import { useMemo } from 'react'
import { Event } from 'nostr-tools'
import { communityService } from '@/services/community.service'
import Image from '../Image'

export default function CommunityCard({
  event,
  onJoin,
  onClick
}: {
  event: Event
  onJoin?: () => void
  onClick?: () => void
}) {
  const info = useMemo(() => communityService.extractCommunityInfo(event), [event])
  const joined = communityService.isJoined(info.coordinate)

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
        <div className="truncate font-semibold">{info.name}</div>
        {info.description && (
          <div className="line-clamp-1 truncate text-sm text-muted-foreground">
            {info.description}
          </div>
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
