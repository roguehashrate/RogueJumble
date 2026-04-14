import { toGroupChat } from '@/lib/link'
import { normalizeUrl } from '@/lib/url'
import { useSecondaryPage } from '@/PageManager'
import { Users } from 'lucide-react'
import { Event } from 'nostr-tools'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Notification from './Notification'

export function GroupMentionNotification({
  notification,
  isNew = false
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
      push(toGroupChat('default', groupId))
    }
  }, [groupId, groupRelayUrl, push])

  return (
    <div onClick={handleClick} className="cursor-pointer">
      <Notification
        notificationId={notification.id}
        icon={<Users size={24} className="text-primary" />}
        sender={notification.pubkey}
        sentAt={notification.created_at}
        targetEvent={notification}
        middle={null}
        description={t('in group chat')}
        isNew={isNew}
        showStats
      />
    </div>
  )
}
