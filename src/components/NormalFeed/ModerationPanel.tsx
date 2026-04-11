import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Event } from 'nostr-tools'
import { Loader2, Shield, Check, X, Eye } from 'lucide-react'
import { ExtendedKind } from '@/constants'
import client from '@/services/client.service'
import { communityService } from '@/services/community.service'
import { useNostr } from '@/providers/NostrProvider'
import { getDefaultRelayUrls } from '@/lib/relay'
import { Button } from '@/components/ui/button'
import Note from '@/components/Note'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

type TApprovalTab = 'pending' | 'approved'

export default function ModerationPanel({
  communityCoordinate,
  onClose
}: {
  communityCoordinate: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { pubkey, publish } = useNostr()
  const [activeTab, setActiveTab] = useState<TApprovalTab>('pending')
  const [communityPosts, setCommunityPosts] = useState<Event[]>([])
  const [approvalEvents, setApprovalEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    communityService.setPubkey(pubkey)
  }, [pubkey])

  useEffect(() => {
    const fetchPostsAndApprovals = async () => {
      setLoading(true)
      try {
        const relays = getDefaultRelayUrls()
        const closer = await client.subscribe(
          relays,
          [
            { kinds: [ExtendedKind.COMMUNITY_POST], '#a': [communityCoordinate], limit: 100 },
            { kinds: [ExtendedKind.COMMUNITY_APPROVAL], '#a': [communityCoordinate], limit: 100 }
          ],
          {
            oneose: () => {},
            onevent: (evt) => {
              if (evt.kind === ExtendedKind.COMMUNITY_POST) {
                setCommunityPosts((prev) => {
                  if (prev.some((p) => p.id === evt.id)) return prev
                  return [evt, ...prev]
                })
              } else if (evt.kind === ExtendedKind.COMMUNITY_APPROVAL) {
                setApprovalEvents((prev) => {
                  if (prev.some((a) => a.id === evt.id)) return prev
                  return [...prev, evt]
                })
              }
            }
          }
        )
        setTimeout(() => closer.close(), 15_000)
      } catch (e) {
        console.error('Failed to fetch moderation data:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchPostsAndApprovals()
  }, [communityCoordinate])

  // Get set of approved post IDs
  const approvedPostIds = useMemo(() => {
    const ids = new Set<string>()
    approvalEvents.forEach((approval) => {
      const eTag = approval.tags.find((t) => t[0] === 'e')?.[1]
      if (eTag) ids.add(eTag)
    })
    return ids
  }, [approvalEvents])

  const pendingPosts = useMemo(() => {
    return communityPosts.filter((p) => !approvedPostIds.has(p.id))
  }, [communityPosts, approvedPostIds])

  const approvedPosts = useMemo(() => {
    return communityPosts.filter((p) => approvedPostIds.has(p.id))
  }, [communityPosts, approvedPostIds])

  // Check if I've approved a specific post
  const myApprovedPostIds = useMemo(() => {
    const ids = new Set<string>()
    approvalEvents.forEach((approval) => {
      if (approval.pubkey === pubkey) {
        const eTag = approval.tags.find((t) => t[0] === 'e')?.[1]
        if (eTag) ids.add(eTag)
      }
    })
    return ids
  }, [approvalEvents, pubkey])

  const handleApprove = async (post: Event) => {
    if (!pubkey) return
    setProcessingId(post.id)
    try {
      const { createCommunityApprovalDraftEvent } = await import('@/lib/draft-event')
      const draftEvent = createCommunityApprovalDraftEvent(communityCoordinate, post, 'e')
      const approvalEvent = await publish(draftEvent)
      communityService.recordApproval(
        communityCoordinate,
        post.id,
        post.pubkey,
        approvalEvent
      )
      setApprovalEvents((prev) => [approvalEvent, ...prev])
    } catch (e) {
      console.error('Failed to approve post:', e)
    } finally {
      setProcessingId(null)
    }
  }

  const handleRevoke = async (post: Event) => {
    if (!pubkey) return
    setProcessingId(post.id)
    try {
      // Find my approval event for this post
      const myApproval = approvalEvents.find(
        (a) =>
          a.pubkey === pubkey &&
          a.tags.some((t) => t[0] === 'e' && t[1] === post.id)
      )
      if (myApproval) {
        // Delete the approval event (NIP-09)
        const { createDeletionRequestDraftEvent } = await import('@/lib/draft-event')
        const draftEvent = createDeletionRequestDraftEvent(myApproval)
        await publish(draftEvent)
        communityService.removeApproval(myApproval.id)
        setApprovalEvents((prev) => prev.filter((a) => a.id !== myApproval.id))
      }
    } catch (e) {
      console.error('Failed to revoke approval:', e)
    } finally {
      setProcessingId(null)
    }
  }

  const posts = activeTab === 'pending' ? pendingPosts : approvedPosts

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-primary" />
          <h3 className="text-lg font-semibold">{t('Moderation Panel')}</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          {t('Close')}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TApprovalTab)}>
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1">
            {t('Pending')} ({pendingPosts.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex-1">
            {t('Approved')} ({approvedPosts.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {activeTab === 'pending'
            ? t('No pending posts to review')
            : t('No approved posts yet')}
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const hasMyApproval = myApprovedPostIds.has(post.id)
            return (
              <div key={post.id} className="rounded-lg border bg-card">
                <div className="p-3">
                  <Note event={post} />
                </div>
                <div className="flex items-center justify-between border-t px-3 py-2">
                  {activeTab === 'pending' ? (
                    <>
                      <div className="flex items-center gap-2">
                        {hasMyApproval && (
                          <Badge variant="secondary" className="text-xs">
                            {t('You approved')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={() => {
                            // Scroll post into view / open detail
                          }}
                        >
                          <Eye className="mr-1 size-3" />
                          {t('View')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={processingId === post.id}
                          className="gap-1 border-destructive/50 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRevoke(post)}
                        >
                          <X className="size-3" />
                          {t('Reject')}
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          disabled={processingId === post.id}
                          className="gap-1"
                          onClick={() => handleApprove(post)}
                        >
                          <Check className="size-3" />
                          {t('Approve')}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs gap-1">
                        <Check className="size-2.5" />
                        {t('Approved')}
                      </Badge>
                      {hasMyApproval && (
                        <Badge variant="secondary" className="text-xs">
                          {t('You approved')}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto text-muted-foreground"
                      >
                        <Eye className="mr-1 size-3" />
                        {t('View')}
                      </Button>
                      {hasMyApproval && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={processingId === post.id}
                          className="gap-1 border-destructive/50 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRevoke(post)}
                        >
                          <X className="size-3" />
                          {t('Revoke')}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
