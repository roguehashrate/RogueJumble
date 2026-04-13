import { NIP29_GROUP_KINDS } from '@/constants'
import { getDefaultRelayUrls } from '@/lib/relay'
import client from '@/services/client.service'
import { TFeedSubRequest } from '@/types'
import { Event, kinds } from 'nostr-tools'
import { MessageCircle, Plus, Loader2, Globe } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNostr } from '@/providers/NostrProvider'
import GroupCard from './GroupCard'
import GroupCreatorDialog from '../GroupCreatorDialog'
import GroupJoinDialog from '../GroupJoinDialog'

export type TGroupInfo = {
  id: string
  relayDomain: string
  relayUrl: string
  name: string
  about?: string
  picture?: string
  private?: boolean
  restricted?: boolean
  closed?: boolean
  lastActivity?: number
}

export default function GroupsFeed() {
  const { t } = useTranslation()
  const { pubkey } = useNostr()
  const [groups, setGroups] = useState<TGroupInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [subRequests, setSubRequests] = useState<TFeedSubRequest[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<TGroupInfo | null>(null)

  // Load user's group list from kind 10009
  useEffect(() => {
    if (!pubkey) return

    const loadGroups = async () => {
      setLoading(true)
      try {
        // Fetch kind 10009 (groups list) event for the user
        const events = await client.fetchEvents(
          getDefaultRelayUrls(),
          {
            kinds: [10009],
            authors: [pubkey],
            limit: 1
          }
        )

        if (events.length === 0) {
          setGroups([])
          setLoading(false)
          return
        }

        const groupListEvent = events[0]
        const groupInfos: TGroupInfo[] = []

        // Extract group tags from the event
        // Format: ["group", "<group_id>", "<relay_url>", "<optional_name>"]
        groupListEvent.tags.forEach((tag) => {
          if (tag[0] === 'group' && tag.length >= 3) {
            const [, groupId, relayUrl, groupName] = tag
            
            groupInfos.push({
              id: groupId,
              relayDomain: relayUrl.replace(/^wss?:\/\//, '').replace(/\/$/, ''),
              relayUrl,
              name: groupName || groupId,
              private: false,
              restricted: false,
              closed: false
            })
          }
        })

        // Now fetch metadata (kind 39000) for each group
        const relayUrls = [...new Set(groupInfos.map((g) => g.relayUrl))]
        
        if (groupInfos.length > 0) {
          const metadataEvents = await client.fetchEvents(
            relayUrls.length > 0 ? relayUrls : getDefaultRelayUrls(),
            {
              kinds: [39000],
              limit: 100
            }
          )

          // Merge metadata into group infos
          metadataEvents.forEach((metadataEvent: Event) => {
            const dTag = metadataEvent.tags.find((t) => t[0] === 'd')
            if (!dTag) return

            const groupId = dTag[1]
            const group = groupInfos.find((g) => g.id === groupId)
            if (!group) return

            metadataEvent.tags.forEach((tag) => {
              const [tagName, tagValue] = tag
              if (tagName === 'name' && tagValue) {
                group.name = tagValue
              } else if (tagName === 'about' && tagValue) {
                group.about = tagValue
              } else if (tagName === 'picture' && tagValue) {
                group.picture = tagValue
              } else if (tagName === 'private') {
                group.private = tagValue === 'true'
              } else if (tagName === 'restricted') {
                group.restricted = tagValue === 'true'
              } else if (tagName === 'closed') {
                group.closed = tagValue === 'true'
              }
            })
          })
        }

        setGroups(groupInfos)
      } catch (error) {
        console.error('Failed to load groups:', error)
      } finally {
        setLoading(false)
      }
    }

    loadGroups()
  }, [pubkey])

  const handleCreateGroup = useCallback(() => {
    setShowCreateDialog(true)
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">{t('Loading groups...')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 px-4 py-4">
      {/* Header with Create Group button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-5 text-primary" />
          {groups.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {groups.length}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowJoinDialog(true)}
            className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <Globe className="size-4" />
            {t('Join')}
          </button>
          <button
            onClick={handleCreateGroup}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Plus className="size-4" />
            {t('Create')}
          </button>
        </div>
      </div>

      {/* Groups List */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border/20 bg-card/50 py-16 text-center">
          <MessageCircle className="mb-4 size-12 text-muted-foreground/50" />
          <h3 className="mb-2 text-lg font-semibold">{t('No groups yet')}</h3>
          <p className="mb-4 max-w-sm text-sm text-muted-foreground">
            {t('Create a group or join one to start chatting with others.')}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowJoinDialog(true)}
              className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <Globe className="size-4" />
              {t('Join a Group')}
            </button>
            <button
              onClick={handleCreateGroup}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              <Plus className="size-4" />
              {t('Create Your First Group')}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((group) => (
            <GroupCard key={`${group.relayDomain}-${group.id}`} group={group} />
          ))}
        </div>
      )}

      <GroupCreatorDialog open={showCreateDialog} setOpen={setShowCreateDialog} />
      <GroupJoinDialog 
        open={showJoinDialog} 
        setOpen={setShowJoinDialog}
        group={selectedGroup}
      />
    </div>
  )
}
