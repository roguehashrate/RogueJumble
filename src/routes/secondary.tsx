import { TPageRef } from '@/types'
import { createRef, lazy, Suspense } from 'react'
import { match } from 'path-to-regexp'

const PageSkeleton = () => null

// Lazy-loaded secondary page components
const LazyNoteListPage = lazy(() => import('@/pages/secondary/NoteListPage'))
const LazyNotePage = lazy(() => import('@/pages/secondary/NotePage'))
const LazyProfileListPage = lazy(() => import('@/pages/secondary/ProfileListPage'))
const LazyProfilePage = lazy(() => import('@/pages/secondary/ProfilePage'))
const LazyFollowingListPage = lazy(() => import('@/pages/secondary/FollowingListPage'))
const LazyOthersRelaySettingsPage = lazy(() => import('@/pages/secondary/OthersRelaySettingsPage'))
const LazyRelayPage = lazy(() => import('@/pages/secondary/RelayPage'))
const LazyRelayReviewsPage = lazy(() => import('@/pages/secondary/RelayReviewsPage'))
const LazySearchPage = lazy(() => import('@/pages/secondary/SearchPage'))
const LazyExternalContentPage = lazy(() => import('@/pages/secondary/ExternalContentPage'))
const LazySettingsPage = lazy(() => import('@/pages/secondary/SettingsPage'))
const LazyRelaySettingsPage = lazy(() => import('@/pages/secondary/RelaySettingsPage'))
const LazyWalletPage = lazy(() => import('@/pages/secondary/WalletPage'))
const LazyPostSettingsPage = lazy(() => import('@/pages/secondary/PostSettingsPage'))
const LazyGeneralSettingsPage = lazy(() => import('@/pages/secondary/GeneralSettingsPage'))
const LazyAppearanceSettingsPage = lazy(() => import('@/pages/secondary/AppearanceSettingsPage'))
const LazyTranslationPage = lazy(() => import('@/pages/secondary/TranslationPage'))
const LazyEmojiPackSettingsPage = lazy(() => import('@/pages/secondary/EmojiPackSettingsPage'))
const LazySystemSettingsPage = lazy(() => import('@/pages/secondary/SystemSettingsPage'))
const LazyProfileEditorPage = lazy(() => import('@/pages/secondary/ProfileEditorPage'))
const LazyMuteListPage = lazy(() => import('@/pages/secondary/MuteListPage'))
const LazyRizfulPage = lazy(() => import('@/pages/secondary/RizfulPage'))
const LazyBookmarkPage = lazy(() => import('@/pages/secondary/BookmarkPage'))
const LazyFollowPackPage = lazy(() => import('@/pages/secondary/FollowPackPage'))
const LazyUserAggregationDetailPage = lazy(
  () => import('@/pages/secondary/UserAggregationDetailPage')
)

// Route configs with lazy component types instead of pre-created elements
const SECONDARY_ROUTE_CONFIGS = [
  { path: '/notes', Component: LazyNoteListPage },
  { path: '/notes/:id', Component: LazyNotePage },
  { path: '/users', Component: LazyProfileListPage },
  { path: '/users/:id', Component: LazyProfilePage },
  { path: '/users/:id/following', Component: LazyFollowingListPage },
  { path: '/users/:id/relays', Component: LazyOthersRelaySettingsPage },
  { path: '/relays/:url', Component: LazyRelayPage },
  { path: '/relays/:url/reviews', Component: LazyRelayReviewsPage },
  { path: '/search', Component: LazySearchPage },
  { path: '/external-content', Component: LazyExternalContentPage },
  { path: '/settings', Component: LazySettingsPage },
  { path: '/settings/relays', Component: LazyRelaySettingsPage },
  { path: '/settings/wallet', Component: LazyWalletPage },
  { path: '/settings/posts', Component: LazyPostSettingsPage },
  { path: '/settings/general', Component: LazyGeneralSettingsPage },
  { path: '/settings/appearance', Component: LazyAppearanceSettingsPage },
  { path: '/settings/translation', Component: LazyTranslationPage },
  { path: '/settings/emoji-packs', Component: LazyEmojiPackSettingsPage },
  { path: '/settings/system', Component: LazySystemSettingsPage },
  { path: '/profile-editor', Component: LazyProfileEditorPage },
  { path: '/mutes', Component: LazyMuteListPage },
  { path: '/rizful', Component: LazyRizfulPage },
  { path: '/bookmarks', Component: LazyBookmarkPage },
  { path: '/follow-packs/:id', Component: LazyFollowPackPage },
  { path: '/user-aggregation/:feedId/:npub', Component: LazyUserAggregationDetailPage }
]

// Build routes with matchers; element is a function that creates a lazy-wrapped element
export const SECONDARY_ROUTES = SECONDARY_ROUTE_CONFIGS.map(
  ({ path, Component }) => ({
    path,
    matcher: match(path),
    // Returns a lazy-wrapped element; PageManager wraps it in Suspense
    createLazyElement: (params: Record<string, unknown>, index: number, ref: React.RefObject<TPageRef>) => {
      const LazyElement = ({ ...props }: Record<string, unknown>) => (
        <Suspense fallback={<PageSkeleton />}>
          <Component ref={ref} index={index} {...params} {...props} />
        </Suspense>
      )
      return LazyElement
    }
  })
)

// Helper for PageManager's findAndCloneElement — creates a lazy-wrapped element
export function createSecondaryLazyElement(
  url: string,
  index: number
): { element: React.ComponentType | null; ref: React.RefObject<TPageRef> | null } {
  const path = url.split('?')[0].split('#')[0]
  for (const { matcher, createLazyElement } of SECONDARY_ROUTES) {
    const m = matcher(path)
    if (!m) continue

    const ref = createRef<TPageRef>()
    const LazyEl = createLazyElement(m.params as Record<string, unknown>, index, ref)
    return { element: LazyEl, ref }
  }
  return { element: null, ref: null }
}
