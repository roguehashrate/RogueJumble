import { IS_COMMUNITY_MODE, COMMUNITY_RELAY_SETS, COMMUNITY_RELAYS } from '@/constants'
import { toRelaySettings } from '@/lib/link'
import { simplifyUrl } from '@/lib/url'
import { cn } from '@/lib/utils'
import { SecondaryPageLink } from '@/PageManager'
import { useFavoriteRelays } from '@/providers/FavoriteRelaysProvider'
import { useFeed } from '@/providers/FeedProvider'
import { useNostr } from '@/providers/NostrProvider'
import { Image, BookOpen, Globe, Settings2, UsersRound, MessageCircle } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import RelayIcon from '../RelayIcon'
import RelaySetCard from '../RelaySetCard'

export default function FeedSwitcher({ close }: { close?: () => void }) {
  const { t } = useTranslation()
  const { pubkey } = useNostr()
  const { relaySets, favoriteRelays } = useFavoriteRelays()
  const { feedInfo, switchFeed } = useFeed()
  const filteredRelaySets = useMemo(() => {
    return relaySets.filter((set) => set.relayUrls.length > 0)
  }, [relaySets])
  const hasRelays = filteredRelaySets.length > 0 || favoriteRelays.length > 0

  if (IS_COMMUNITY_MODE) {
    return (
      <div className="space-y-1.5">
        {COMMUNITY_RELAY_SETS.map((set) => (
          <RelaySetCard
            key={set.id}
            relaySet={set}
            select={feedInfo?.feedType === 'relays' && set.id === feedInfo.id}
            onSelectChange={(select) => {
              if (!select) return
              switchFeed('relays', { activeRelaySetId: set.id })
              close?.()
            }}
          />
        ))}
        {COMMUNITY_RELAYS.map((relay) => (
          <FeedSwitcherItem
            key={relay}
            isActive={feedInfo?.feedType === 'relay' && feedInfo.id === relay}
            onClick={() => {
              switchFeed('relay', { relay })
              close?.()
            }}
          >
            <div className="flex w-full items-center gap-3">
              <RelayIcon url={relay} className="shrink-0" />
              <div className="w-0 flex-1 truncate">{simplifyUrl(relay)}</div>
            </div>
          </FeedSwitcherItem>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Personal Feeds Section */}
      <div className="space-y-2">
        <SectionHeader title={t('Personal Feeds')} />
        <div className="space-y-1.5">
          <FeedSwitcherItem
            isActive={feedInfo?.feedType === 'following'}
            disabled={!pubkey}
            onClick={() => {
              if (!pubkey) return
              switchFeed('following', { pubkey })
              close?.()
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex size-6 shrink-0 items-center justify-center">
                <UsersRound className="size-5" />
              </div>
              <div className="flex-1">{t('Following')}</div>
            </div>
          </FeedSwitcherItem>

          <FeedSwitcherItem
            isActive={feedInfo?.feedType === 'mediaFeed'}
            disabled={!pubkey}
            onClick={() => {
              if (!pubkey) return
              switchFeed('mediaFeed', { pubkey })
              close?.()
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex size-6 shrink-0 items-center justify-center">
                <Image className="size-5" />
              </div>
              <div className="flex-1">{t('Media Feed')}</div>
            </div>
          </FeedSwitcherItem>

          <FeedSwitcherItem
            isActive={feedInfo?.feedType === 'textFeed'}
            disabled={!pubkey}
            onClick={() => {
              if (!pubkey) return
              switchFeed('textFeed', { pubkey })
              close?.()
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex size-6 shrink-0 items-center justify-center">
                <UsersRound className="size-5" />
              </div>
              <div className="flex-1">{t('Text Only')}</div>
            </div>
          </FeedSwitcherItem>

          <FeedSwitcherItem
            isActive={feedInfo?.feedType === 'articleFeed'}
            disabled={!pubkey}
            onClick={() => {
              if (!pubkey) return
              switchFeed('articleFeed', { pubkey })
              close?.()
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex size-6 shrink-0 items-center justify-center">
                <BookOpen className="size-5" />
              </div>
              <div className="flex-1">{t('Articles')}</div>
            </div>
          </FeedSwitcherItem>

          <FeedSwitcherItem
            isActive={feedInfo?.feedType === 'communityFeed'}
            disabled={!pubkey}
            onClick={() => {
              if (!pubkey) return
              switchFeed('communityFeed', { pubkey })
              close?.()
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex size-6 shrink-0 items-center justify-center">
                <Globe className="size-5" />
              </div>
              <div className="flex-1">{t('Communities')}</div>
            </div>
          </FeedSwitcherItem>

          <FeedSwitcherItem
            isActive={feedInfo?.feedType === 'groups'}
            disabled={!pubkey}
            onClick={() => {
              if (!pubkey) return
              switchFeed('groups', { pubkey })
              close?.()
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex size-6 shrink-0 items-center justify-center">
                <MessageCircle className="size-5" />
              </div>
              <div className="flex-1">{t('Groups')}</div>
            </div>
          </FeedSwitcherItem>
        </div>
      </div>

      {/* Relay Feeds Section */}
      {hasRelays && (
        <div className="space-y-2">
          <SectionHeader
            title={t('Relay Feeds')}
            action={
              <SecondaryPageLink
                to={toRelaySettings()}
                className="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary-hover"
                onClick={() => close?.()}
              >
                <Settings2 className="size-3" />
                {t('edit')}
              </SecondaryPageLink>
            }
          />
          <div className="space-y-1.5">
            {filteredRelaySets.map((set) => (
              <RelaySetCard
                key={set.id}
                relaySet={set}
                select={feedInfo?.feedType === 'relays' && set.id === feedInfo.id}
                onSelectChange={(select) => {
                  if (!select) return
                  switchFeed('relays', { activeRelaySetId: set.id })
                  close?.()
                }}
              />
            ))}
            {favoriteRelays.map((relay) => (
              <FeedSwitcherItem
                key={relay}
                isActive={feedInfo?.feedType === 'relay' && feedInfo.id === relay}
                onClick={() => {
                  switchFeed('relay', { relay })
                  close?.()
                }}
              >
                <div className="flex w-full items-center gap-3">
                  <RelayIcon url={relay} className="shrink-0" />
                  <div className="w-0 flex-1 truncate">{simplifyUrl(relay)}</div>
                </div>
              </FeedSwitcherItem>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1 py-1">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {action}
    </div>
  )
}

function FeedSwitcherItem({
  children,
  isActive,
  disabled,
  onClick
}: {
  children: React.ReactNode
  isActive: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <div
      className={cn(
        'group relative w-full rounded-xl border px-3.5 py-3 transition-colors duration-200',
        disabled && 'pointer-events-none opacity-50',
        isActive
          ? 'border-primary/40 bg-primary/5'
          : 'clickable border-border/20 hover:border-primary/30 hover:bg-muted/20'
      )}
      onClick={() => {
        if (disabled) return
        onClick()
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1 font-medium">{children}</div>
      </div>
    </div>
  )
}
