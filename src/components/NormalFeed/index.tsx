import NoteList, { TNoteListRef } from '@/components/NoteList'
import Tabs from '@/components/Tabs'
import TrustScoreFilter from '@/components/TrustScoreFilter'
import UserAggregationList, { TUserAggregationListRef } from '@/components/UserAggregationList'
import { ExtendedKind } from '@/constants'
import { getDefaultRelayUrls } from '@/lib/relay'
import { isTouchDevice } from '@/lib/utils'
import { useKindFilter } from '@/providers/KindFilterProvider'
import { useUserTrust } from '@/providers/UserTrustProvider'
import storage from '@/services/local-storage.service'
import { TFeedSubRequest, TNoteListMode } from '@/types'
import { useMemo, useRef, useState } from 'react'
import { kinds } from 'nostr-tools'
import KindFilter from '../KindFilter'
import { RefreshButton } from '../RefreshButton'

export default function NormalFeed({
  trustScoreFilterId,
  subRequests,
  areAlgoRelays = false,
  isMainFeed = false,
  showRelayCloseReason = false,
  disable24hMode = false,
  onRefresh,
  feedVariant = 'following',
  hideFollowingBadge = false
}: {
  trustScoreFilterId?: string
  subRequests: TFeedSubRequest[]
  areAlgoRelays?: boolean
  isMainFeed?: boolean
  showRelayCloseReason?: boolean
  disable24hMode?: boolean
  onRefresh?: () => void
  feedVariant?: 'following' | 'mediaFeed' | 'textFeed' | 'articleFeed'
  hideFollowingBadge?: boolean
}) {
  const { showKinds } = useKindFilter()
  const { getMinTrustScore } = useUserTrust()
  const [temporaryShowKinds, setTemporaryShowKinds] = useState(showKinds)
  const [listMode, setListMode] = useState<TNoteListMode>(() => storage.getNoteListMode())
  const [scope, setScope] = useState<'following' | 'global'>('following')
  const supportTouch = useMemo(() => isTouchDevice(), [])
  const noteListRef = useRef<TNoteListRef>(null)
  const userAggregationListRef = useRef<TUserAggregationListRef>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const showKindsFilter = useMemo(() => {
    return subRequests.every((req) => !req.filter.kinds?.length)
  }, [subRequests])
  const [trustFilterOpen, setTrustFilterOpen] = useState(false)
  const trustScoreThreshold = useMemo(() => {
    return trustScoreFilterId ? getMinTrustScore(trustScoreFilterId) : undefined
  }, [trustScoreFilterId, getMinTrustScore])

  const handleListModeChange = (mode: TNoteListMode) => {
    setListMode(mode)
    if (isMainFeed) {
      storage.setNoteListMode(mode)
    }
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleShowKindsChange = (newShowKinds: number[]) => {
    setTemporaryShowKinds(newShowKinds)
    noteListRef.current?.scrollToTop()
  }

  const handleTrustFilterOpenChange = (open: boolean) => {
    setTrustFilterOpen(open)
  }

  const isTextFeed = feedVariant === 'textFeed'
  const isArticleFeed = feedVariant === 'articleFeed'
  const isMediaFeed = feedVariant === 'mediaFeed'
  const isScopedFeed = isArticleFeed || isMediaFeed || isTextFeed

  // Global subRequests for broader feed
  const globalSubRequests = useMemo((): TFeedSubRequest[] => {
    const urls = getDefaultRelayUrls()
    if (isArticleFeed) {
      return [{ filter: { kinds: [kinds.LongFormArticle], limit: 50 }, urls }]
    }
    if (isMediaFeed) {
      return [
        {
          filter: {
            kinds: [ExtendedKind.PICTURE, ExtendedKind.VIDEO, ExtendedKind.SHORT_VIDEO],
            limit: 50
          },
          urls
        }
      ]
    }
    if (isTextFeed) {
      return [{ filter: { kinds: [kinds.ShortTextNote], limit: 50 }, urls }]
    }
    return subRequests
  }, [isArticleFeed, isMediaFeed, isTextFeed, subRequests])

  const activeSubRequests = scope === 'global' ? globalSubRequests : subRequests

  // Compute effective kinds filter based on feedVariant from dropdown
  const effectiveShowKinds = useMemo(() => {
    if (feedVariant === 'mediaFeed') {
      return [ExtendedKind.PICTURE, ExtendedKind.VIDEO, ExtendedKind.SHORT_VIDEO]
    }
    if (feedVariant === 'textFeed') {
      return [kinds.ShortTextNote]
    }
    if (feedVariant === 'articleFeed') {
      return [kinds.LongFormArticle]
    }
    return temporaryShowKinds
  }, [feedVariant, temporaryShowKinds])

  // Build tabs based on feed variant
  const tabs = useMemo(() => {
    if (isScopedFeed) {
      return [
        { value: 'following', label: 'Following' },
        { value: 'global', label: 'Global' }
      ]
    }
    return [
      { value: 'posts', label: 'Notes' },
      { value: 'postsAndReplies', label: 'Replies' },
      ...(!disable24hMode ? [{ value: '24h', label: '24h' }] : [])
    ]
  }, [isScopedFeed, disable24hMode])

  const activeTab = isScopedFeed
    ? scope
    : listMode === '24h' && disable24hMode
      ? 'posts'
      : listMode

  const handleTabChange = (value: string) => {
    if (isScopedFeed) {
      setScope(value as 'following' | 'global')
    } else {
      handleListModeChange(value as TNoteListMode)
    }
  }

  // Refresh handler
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh()
      return
    }
    if (!isScopedFeed && listMode === '24h') {
      userAggregationListRef.current?.refresh()
    } else {
      noteListRef.current?.refresh()
    }
  }

  return (
    <>
      <Tabs
        value={activeTab}
        tabs={tabs}
        onTabChange={handleTabChange}
        options={
          <>
            {!supportTouch && !isScopedFeed && (
              <RefreshButton onClick={handleRefresh} />
            )}
            {trustScoreFilterId && (
              <TrustScoreFilter
                filterId={trustScoreFilterId}
                onOpenChange={handleTrustFilterOpenChange}
              />
            )}
            {!isTextFeed && !isArticleFeed && !isScopedFeed && showKindsFilter && (
              <KindFilter
                showKinds={temporaryShowKinds}
                onShowKindsChange={handleShowKindsChange}
              />
            )}
          </>
        }
        active={trustFilterOpen}
      />
      <div ref={topRef} className="scroll-mt-[calc(6rem+1px)]" />

      {/* Scoped feed content (Articles/Media/Text) */}
      {isScopedFeed && (
        <NoteList
          ref={noteListRef}
          showKinds={effectiveShowKinds}
          subRequests={activeSubRequests}
          hideReplies={false}
          areAlgoRelays={areAlgoRelays}
          showRelayCloseReason={showRelayCloseReason}
          trustScoreThreshold={trustScoreThreshold}
          displayMode={isTextFeed ? 'textOnlyMode' : undefined}
          hideFollowingBadge={hideFollowingBadge}
        />
      )}

      {/* Following feed content */}
      {!isScopedFeed && (
        <>
          {listMode === '24h' && !disable24hMode ? (
            <UserAggregationList
              ref={userAggregationListRef}
              showKinds={temporaryShowKinds}
              subRequests={subRequests}
              areAlgoRelays={areAlgoRelays}
              showRelayCloseReason={showRelayCloseReason}
              trustScoreThreshold={trustScoreThreshold}
            />
          ) : (
            <NoteList
              ref={noteListRef}
              showKinds={effectiveShowKinds}
              subRequests={subRequests}
              hideReplies={listMode === 'posts'}
              areAlgoRelays={areAlgoRelays}
              showRelayCloseReason={showRelayCloseReason}
              trustScoreThreshold={trustScoreThreshold}
              displayMode={isTextFeed ? 'textOnlyMode' : undefined}
              hideFollowingBadge={hideFollowingBadge}
            />
          )}
        </>
      )}
    </>
  )
}
