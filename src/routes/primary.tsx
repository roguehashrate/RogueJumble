import type { TPageRef } from '@/types'
import { createRef, lazy, Suspense } from 'react'

export type TPrimaryPageName =
  | 'home'
  | 'explore'
  | 'following'
  | 'notifications'
  | 'me'
  | 'profile'
  | 'relay'
  | 'search'
  | 'bookmark'
  | 'settings'

// Skeleton fallback for lazy-loaded pages
const PageSkeleton = () => null

// Lazy-loaded page components — only downloaded when rendered
const LazyNoteListPage = lazy(() => import('@/pages/primary/NoteListPage'))
const LazyExplorePage = lazy(() => import('@/pages/primary/ExplorePage'))
const LazyFollowingPage = lazy(() => import('@/pages/primary/FollowingPage'))
const LazyNotificationListPage = lazy(() => import('@/pages/primary/NotificationListPage'))
const LazyMePage = lazy(() => import('@/pages/primary/MePage'))
const LazyProfilePage = lazy(() => import('@/pages/primary/ProfilePage'))
const LazyRelayPage = lazy(() => import('@/pages/primary/RelayPage'))
const LazySearchPage = lazy(() => import('@/pages/primary/SearchPage'))
const LazyBookmarkPage = lazy(() => import('@/pages/primary/BookmarkPage'))
const LazySettingsPage = lazy(() => import('@/pages/primary/SettingsPage'))

export const PRIMARY_PAGE_REF_MAP: Record<TPrimaryPageName, React.RefObject<TPageRef>> = {
  home: createRef<TPageRef>(),
  explore: createRef<TPageRef>(),
  following: createRef<TPageRef>(),
  notifications: createRef<TPageRef>(),
  me: createRef<TPageRef>(),
  profile: createRef<TPageRef>(),
  relay: createRef<TPageRef>(),
  search: createRef<TPageRef>(),
  bookmark: createRef<TPageRef>(),
  settings: createRef<TPageRef>()
}

// Map of lazy components — PageManager renders these with <Suspense>
export const PRIMARY_PAGE_MAP: Record<
  TPrimaryPageName,
  React.ComponentType<{ ref?: React.Ref<TPageRef> } & Record<string, unknown>>
> = {
  home: LazyNoteListPage,
  explore: LazyExplorePage,
  following: LazyFollowingPage,
  notifications: LazyNotificationListPage,
  me: LazyMePage,
  profile: LazyProfilePage,
  relay: LazyRelayPage,
  search: LazySearchPage,
  bookmark: LazyBookmarkPage,
  settings: LazySettingsPage
}

// Renders a lazy page component with Suspense
export function LazyPage({
  Component,
  pageKey,
  props
}: {
  Component: React.ComponentType<{ ref?: React.Ref<TPageRef> } & Record<string, unknown>>
  pageKey: TPrimaryPageName
  props?: Record<string, unknown>
}) {
  const ref = PRIMARY_PAGE_REF_MAP[pageKey]
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Component ref={ref} {...(props || {})} />
    </Suspense>
  )
}

