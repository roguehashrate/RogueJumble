import { toGroupChat } from '@/lib/link'
import { useSecondaryPage } from '@/PageManager'
import { Lock, ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import Image from '../Image'
import { TGroupInfo } from './index'

export default function GroupCard({ group }: { group: TGroupInfo }) {
  const { push } = useSecondaryPage()

  const handleClick = () => {
    push(toGroupChat(group.relayDomain, group.id, group.name))
  }

  const groupInitials = useMemo(() => {
    return group.name
      .split(' ')
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }, [group.name])

  return (
    <button
      onClick={handleClick}
      className="w-full rounded-xl border border-border/20 bg-card/50 p-4 text-left transition-colors hover:border-primary/30 hover:bg-muted/20"
    >
      <div className="flex gap-3">
        {/* Group Avatar */}
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
          {group.picture ? (
            <Image
              image={{ url: group.picture, pubkey: '' }}
              className="size-full object-cover"
              hideIfError
            />
          ) : (
            <span className="text-lg font-semibold text-primary">{groupInitials}</span>
          )}
        </div>

        {/* Group Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium">{group.name}</h3>
            {group.private && (
              <Lock className="size-3.5 text-muted-foreground" />
            )}
          </div>

          {group.about && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {group.about}
            </p>
          )}

          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            {group.restricted && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                Restricted
              </span>
            )}
            {group.closed && (
              <span className="rounded bg-muted/30 px-1.5 py-0.5 text-xs">
                Closed
              </span>
            )}
          </div>
        </div>

        {/* Message Icon */}
        <div className="flex items-center">
          <ArrowRight className="size-5 text-primary/50" />
        </div>
      </div>
    </button>
  )
}
