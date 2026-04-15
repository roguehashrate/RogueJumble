import { Skeleton } from '@/components/ui/skeleton'
import { NSFW_DISPLAY_POLICY } from '@/constants'
import { isMentioningMutedUsers, isNsfwEvent } from '@/lib/event'
import { cn } from '@/lib/utils'
import { useContentPolicy } from '@/providers/ContentPolicyProvider'
import { useMuteList } from '@/providers/MuteListProvider'
import { Event, kinds } from 'nostr-tools'
import { useMemo } from 'react'
import MainNoteCard from './MainNoteCard'
import RepostNoteCard from './RepostNoteCard'

export type TDisplayMode = 'imageMode' | 'textOnlyMode' | undefined

export default function NoteCard({
  event,
  className,
  filterMutedNotes = true,
  pinned = false,
  reposters,
  displayMode,
  hideFollowingBadge = false
}: {
  event: Event
  className?: string
  filterMutedNotes?: boolean
  pinned?: boolean
  reposters?: string[]
  displayMode?: TDisplayMode
  hideFollowingBadge?: boolean
}) {
  const { mutePubkeySet } = useMuteList()
  const { hideContentMentioningMutedUsers, nsfwDisplayPolicy } = useContentPolicy()
  const shouldHide = useMemo(() => {
    if (filterMutedNotes && mutePubkeySet.has(event.pubkey)) {
      return true
    }
    if (hideContentMentioningMutedUsers && isMentioningMutedUsers(event, mutePubkeySet)) {
      return true
    }
    if (nsfwDisplayPolicy === NSFW_DISPLAY_POLICY.HIDE && isNsfwEvent(event)) {
      return true
    }
    return false
  }, [event, filterMutedNotes, mutePubkeySet, nsfwDisplayPolicy])
  if (shouldHide) return null

  if (event.kind === kinds.Repost || event.kind === kinds.GenericRepost) {
    return (
      <RepostNoteCard
        event={event}
        className={className}
        filterMutedNotes={filterMutedNotes}
        pinned={pinned}
        reposters={reposters}
        displayMode={displayMode}
        hideFollowingBadge={hideFollowingBadge}
      />
    )
  }
  return (
    <MainNoteCard
      event={event}
      className={className}
      pinned={pinned}
      reposters={reposters}
      displayMode={displayMode}
      hideFollowingBadge={hideFollowingBadge}
    />
  )
}

export function NoteCardLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('mx-2 my-1 rounded-2xl bg-muted/30 px-4 py-5', className)}>
      <div className="flex items-center space-x-3">
        <Skeleton className="h-11 w-11 rounded-full" />
        <div className={`w-0 flex-1`}>
          <div className="py-1">
            <Skeleton className="h-4 w-20 rounded-lg" />
          </div>
          <div className="py-0.5">
            <Skeleton className="h-3.5 w-16 rounded-lg" />
          </div>
        </div>
      </div>
      <div className="pt-3">
        <div className="my-1.5">
          <Skeleton className="my-1.5 mt-3 h-4 w-full rounded-lg" />
        </div>
        <div className="my-1.5">
          <Skeleton className="my-1.5 h-4 w-3/4 rounded-lg" />
        </div>
        <div className="my-1.5">
          <Skeleton className="my-1.5 h-4 w-1/2 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
