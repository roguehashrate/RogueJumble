import ContentPreview from '@/components/ContentPreview'
import { FormattedTimestamp } from '@/components/FormattedTimestamp'
import UserAvatar from '@/components/UserAvatar'
import Username from '@/components/Username'
import { toGroupChat } from '@/lib/link'
import { normalizeUrl } from '@/lib/url'
import { useSecondaryPage } from '@/PageManager'
import { Event } from 'nostr-tools'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageCircle } from 'lucide-react'

export function GroupMentionNotification({
  notification,
  isNew
}: {
  notification: Event
  isNew?: boolean
}) {
  const { t } = useTranslation()
  const { push } = useSecondaryPage()

  // Extract group info from the 'h' tag and 'relay' tag
  const groupId = notification.tags.find((tag) => tag[0] === 'h')?.[1]
  const groupRelayUrl = notification.tags.find((tag) => tag[0] === 'relay')?.[1]

  const handleClick = useCallback(() => {
    if (groupId && groupRelayUrl) {
      const relayDomain = normalizeUrl(groupRelayUrl).replace(/^wss?:\/\//, '').replace(/\/$/, '')
      push(toGroupChat(relayDomain, groupId))
    } else if (groupId) {
      // Fallback if no relay URL is present
      push(toGroupChat('default', groupId))
    }
  }, [groupId, groupRelayUrl, push])

  return (
    <div
      className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
      onClick={handleClick}
    >
      <div className="relative">
        <UserAvatar userId={notification.pubkey} size="small" />
        <div className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-primary/20">
          <MessageCircle className="size-2.5 text-primary" />
        </div>
        {isNew && (
          <div className="absolute -left-1 -top-1 size-2.5 rounded-full bg-primary ring-2 ring-card" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Username userId={notification.pubkey} className="text-sm font-semibold" />
          <span className="text-sm text-muted-foreground">
            {t('in group chat')}
          </span>
          <span className="text-xs text-muted-foreground">
            <FormattedTimestamp timestamp={notification.created_at} />
          </span>
        </div>
        <ContentPreview
          event={notification}
          className="mt-0.5 line-clamp-2 text-sm text-muted-foreground"
        />
      </div>
    </div>
  )
}
