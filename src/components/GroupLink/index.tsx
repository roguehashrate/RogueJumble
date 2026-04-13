import { useSecondaryPage } from '@/PageManager'
import { useNostr } from '@/providers/NostrProvider'
import { NIP29_GROUP_KINDS } from '@/constants'
import client from '@/services/client.service'
import { getDefaultRelayUrls } from '@/lib/relay'
import { normalizeUrl } from '@/lib/url'
import { toGroupChat } from '@/lib/link'
import { MessageCircle, Loader2, Check } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export default function GroupLink({
  groupId,
  relayUrl,
  name
}: {
  groupId: string
  relayUrl: string
  name?: string
}) {
  const { t } = useTranslation()
  const { pubkey } = useNostr()
  const { push } = useSecondaryPage()
  const [loading, setLoading] = useState(false)
  const [joined, setJoined] = useState(false)

  const displayName = name || groupId

  const handleJoinAndOpen = async () => {
    if (!pubkey) {
      toast.error(t('You must be logged in to join'))
      return
    }

    setLoading(true)
    try {
      const normalizedUrl = normalizeUrl(relayUrl)
      
      // Verify group exists
      const metadataEvents = await client.fetchEvents(
        [normalizedUrl],
        {
          kinds: [NIP29_GROUP_KINDS.GROUP_METADATA],
          '#d': [groupId],
          limit: 1
        } as any
      )

      if (metadataEvents.length === 0) {
        toast.error(t('Group not found on this relay'))
        return
      }

      let groupName = displayName
      metadataEvents[0].tags.forEach((tag) => {
        if (tag[0] === 'name' && tag[1]) groupName = tag[1]
      })

      // Add to user's group list
      const groupListEvents = await client.fetchEvents(
        getDefaultRelayUrls(),
        { kinds: [10009], authors: [pubkey], limit: 1 }
      )

      let existingTags: string[][] = []
      if (groupListEvents.length > 0) {
        existingTags = groupListEvents[0].tags.filter(
          (tag) => tag[0] === 'group' || tag[0] === 'r'
        )
      }

      const alreadyInList = existingTags.some(
        (tag) => tag[0] === 'group' && tag[1] === groupId
      )

      if (!alreadyInList) {
        const newGroupTag = ['group', groupId, normalizedUrl, groupName]
        const updatedTags = [...existingTags, newGroupTag]
        
        const hasRelayTag = updatedTags.some(
          (tag) => tag[0] === 'r' && tag[1] === normalizedUrl
        )
        if (!hasRelayTag) {
          updatedTags.push(['r', normalizedUrl])
        }

        const draftEvent = {
          kind: 10009,
          content: '',
          tags: updatedTags,
          created_at: Math.floor(Date.now() / 1000)
        }
        await client.signAndPublish(draftEvent)
      }

      setJoined(true)
      toast.success(t('Joined group!'))
      
      // Open the group chat
      const relayDomain = normalizedUrl.replace(/^wss?:\/\//, '').replace(/\/$/, '')
      push(toGroupChat(relayDomain, groupId, groupName))
    } catch (error) {
      console.error('Failed to join group:', error)
      toast.error(t('Failed to join group'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="my-2 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <MessageCircle className="size-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{displayName}</p>
        <p className="truncate text-xs text-muted-foreground">{relayUrl}</p>
      </div>
      <button
        onClick={handleJoinAndOpen}
        disabled={loading || joined}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="size-3 animate-spin" />
            {t('Joining...')}
          </>
        ) : joined ? (
          <>
            <Check className="size-3" />
            {t('Joined')}
          </>
        ) : (
          <>
            <MessageCircle className="size-3" />
            {t('Join')}
          </>
        )}
      </button>
    </div>
  )
}
