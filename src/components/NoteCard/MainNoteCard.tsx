import { toNote } from '@/lib/link'
import { cn } from '@/lib/utils'
import { useSecondaryPage } from '@/PageManager'
import { Event } from 'nostr-tools'
import Collapsible from '../Collapsible'
import Note from '../Note'
import StuffStats from '../StuffStats'
import { TDisplayMode } from '../NoteCard'
import PinnedButton from './PinnedButton'
import RepostDescription from './RepostDescription'

export default function MainNoteCard({
  event,
  className,
  reposters,
  embedded,
  originalNoteId,
  pinned = false,
  displayMode
}: {
  event: Event
  className?: string
  reposters?: string[]
  embedded?: boolean
  originalNoteId?: string
  pinned?: boolean
  displayMode?: TDisplayMode
}) {
  const { push } = useSecondaryPage()

  return (
    <div
      className={className}
      onClick={(e) => {
        e.stopPropagation()
        push(toNote(originalNoteId ?? event))
      }}
    >
      <div
        className={cn(
          'clickable transition-colors duration-200',
          embedded
            ? 'rounded-2xl glass-card p-3 sm:p-4'
            : 'rounded-2xl mx-2 mb-2 glass-card px-4 py-4'
        )}
      >
        <Collapsible alwaysExpand={embedded}>
          {pinned && <PinnedButton event={event} />}
          <RepostDescription className={embedded ? '' : ''} reposters={reposters} />
          <Note
            className={embedded ? '' : ''}
            size={embedded ? 'small' : 'normal'}
            event={event}
            originalNoteId={originalNoteId}
            displayMode={displayMode}
          />
        </Collapsible>
        {!embedded && <StuffStats className="mt-3" stuff={event} />}
      </div>
      {!embedded && <div className="h-px" />}
    </div>
  )
}
