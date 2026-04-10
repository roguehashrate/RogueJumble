import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { kinds } from 'nostr-tools'
import { getDefaultRelayUrls } from '@/lib/relay'
import { communityService, TCommunityInfo } from '@/services/community.service'
import { useNostr } from '@/providers/NostrProvider'
import NoteList, { TNoteListRef } from '@/components/NoteList'
import { ExtendedKind } from '@/constants'

export default function MyCommunities() {
  const { t } = useTranslation()
  const { pubkey } = useNostr()
  const [communities, setCommunities] = useState<TCommunityInfo[]>([])
  const [selectedCommunity, setSelectedCommunity] = useState<TCommunityInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const noteListRef = useMemo(() => {
    const ref = { current: null } as { current: TNoteListRef | null }
    return ref
  }, [])

  useEffect(() => {
    const joined = communityService.getJoinedCommunities()
    setCommunities(joined)
    if (joined.length === 1) {
      setSelectedCommunity(joined[0])
    }
    setLoading(false)
  }, [pubkey])

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
      {/* Community selector */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-2">
        {communities.map((c) => (
          <button
            key={c.coordinate}
            onClick={() => setSelectedCommunity(c)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
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
        <div className="px-4">
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
