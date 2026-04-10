import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, LogOut } from 'lucide-react'
import { kinds } from 'nostr-tools'
import { getDefaultRelayUrls } from '@/lib/relay'
import { communityService, TCommunityInfo } from '@/services/community.service'
import { useNostr } from '@/providers/NostrProvider'
import NoteList, { TNoteListRef } from '@/components/NoteList'
import { ExtendedKind } from '@/constants'
import { Button } from '@/components/ui/button'

export default function MyCommunities() {
  const { t } = useTranslation()
  const { pubkey, publish } = useNostr()
  const [communities, setCommunities] = useState<TCommunityInfo[]>([])
  const [selectedCommunity, setSelectedCommunity] = useState<TCommunityInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const noteListRef = useMemo(() => {
    const ref = { current: null } as { current: TNoteListRef | null }
    return ref
  }, [])

  useEffect(() => {
    communityService.setPubkey(pubkey)
    const joined = communityService.getJoinedCommunities()
    setCommunities(joined)
    if (joined.length === 1) {
      setSelectedCommunity(joined[0])
    }
    setLoading(false)
  }, [pubkey])

  const handleLeave = async () => {
    if (!selectedCommunity) return
    try {
      const { createCommunityLeaveDraftEvent } = await import('@/lib/draft-event')
      const draftEvent = createCommunityLeaveDraftEvent(selectedCommunity.coordinate)
      await publish(draftEvent)
      communityService.leaveCommunity(selectedCommunity.coordinate)
      setSelectedCommunity(null)
      setCommunities(communityService.getJoinedCommunities())
    } catch (e) {
      console.error('Failed to leave community:', e)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (communities.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        {t('You haven\'t joined any communities yet.')}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Community selector - horizontally scrollable */}
      <div className="flex gap-2 overflow-x-auto px-4 pt-2 pb-2 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {communities.map((c) => (
          <button
            key={c.coordinate}
            onClick={() => setSelectedCommunity(c)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCommunity?.coordinate === c.coordinate
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Posts from selected community */}
      {selectedCommunity && (
        <div className="space-y-3 px-4 pt-2">
          {/* Leave community button */}
          <Button
            variant="outline"
            className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleLeave}
          >
            <LogOut className="size-4" />
            {t('Leave')} {selectedCommunity.name}
          </Button>

          <NoteList
            ref={noteListRef}
            showKinds={[kinds.CommunityDefinition, ExtendedKind.COMMUNITY_POST]}
            subRequests={[
              {
                filter: {
                  kinds: [ExtendedKind.COMMUNITY_POST],
                  '#a': [selectedCommunity.coordinate],
                  limit: 50
                },
                urls: getDefaultRelayUrls()
              }
            ]}
            hideReplies={false}
          />
        </div>
      )}
    </div>
  )
}
