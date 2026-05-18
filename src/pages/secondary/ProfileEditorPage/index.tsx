import Uploader from '@/components/PostEditor/Uploader'
import ProfileBanner from '@/components/ProfileBanner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import SecondaryPageLayout from '@/layouts/SecondaryPageLayout'
import { createPaymentInfoDraftEvent, createProfileDraftEvent, createUserStatusDraftEvent } from '@/lib/draft-event'
import { getPaymentInfoFromEvent, getUserStatusFromEvent } from '@/lib/event-metadata'
import { formatError } from '@/lib/error'
import client from '@/services/client.service'
import { generateImageByPubkey } from '@/lib/pubkey'
import { isEmail } from '@/lib/utils'
import { useSecondaryPage } from '@/PageManager'
import { useNostr } from '@/providers/NostrProvider'
import { TPaymentMethod } from '@/types'
import { Loader, Plus, Trash2, Upload } from 'lucide-react'
import dayjs from 'dayjs'
import { forwardRef, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

const ProfileEditorPage = forwardRef(({ index }: { index?: number }, ref) => {
  const { t } = useTranslation()
  const { pop } = useSecondaryPage()
  const { account, profile, profileEvent, publish, updateProfileEvent, updateUserStatusEvent } =
    useNostr()
  const [banner, setBanner] = useState<string>('')
  const [avatar, setAvatar] = useState<string>('')
  const [username, setUsername] = useState<string>('')
  const [about, setAbout] = useState<string>('')
  const [website, setWebsite] = useState<string>('')
  const [nip05, setNip05] = useState<string>('')
  const [nip05Error, setNip05Error] = useState<string>('')
  const [paymentTargets, setPaymentTargets] = useState<TPaymentMethod[]>([])
  const [status, setStatus] = useState<string>('')
  const [expireEnabled, setExpireEnabled] = useState(false)
  const [expireDurationKey, setExpireDurationKey] = useState<string>('15m')
  const [hasChanged, setHasChanged] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const defaultImage = useMemo(
    () => (account ? generateImageByPubkey(account.pubkey) : undefined),
    [account]
  )

  useEffect(() => {
    if (profile) {
      setBanner(profile.banner ?? '')
      setAvatar(profile.avatar ?? '')
      setUsername(profile.original_username ?? '')
      setAbout(profile.about ?? '')
      setWebsite(profile.website ?? '')
      setNip05(profile.nip05 ?? '')
      const targets: TPaymentMethod[] = [...(profile.payto || [])]
      if (!targets.some((t) => t.type === 'lightning') && profile.lightningAddress) {
        targets.push({ type: 'lightning', authority: profile.lightningAddress })
      }
      if (!targets.some((t) => t.type === 'bitcoin') && profile.sp) {
        targets.push({ type: 'bitcoin', authority: profile.sp })
      }
      setPaymentTargets(targets)
    } else {
      setBanner('')
      setAvatar('')
      setUsername('')
      setAbout('')
      setWebsite('')
      setNip05('')
      setPaymentTargets([])
    }

    const loadPaymentInfo = async () => {
      if (!account) return
      try {
        const evt = await client.fetchPaymentInfoEvent(account.pubkey)
        if (evt) {
          const info = getPaymentInfoFromEvent(evt)
          if (info?.methods && info.methods.length > 0) {
            setPaymentTargets(info.methods)
          }
        }
      } catch {
        // ignore
      }
    }
    loadPaymentInfo()

    const loadUserStatus = async () => {
      if (!account) return
      try {
        const statusEvent = await client.fetchUserStatus(account.pubkey)
        if (statusEvent) {
          const userStatus = getUserStatusFromEvent(statusEvent)
          if (userStatus) {
            setStatus(userStatus.content)
            if (userStatus.expiration) {
              setExpireEnabled(true)
              const now = dayjs().unix()
              const diff = userStatus.expiration - now
              const durations: Record<string, number> = {
                '5m': 5 * 60,
                '15m': 15 * 60,
                '1h': 60 * 60,
                '4h': 4 * 60 * 60,
                '1d': 24 * 60 * 60,
                '1w': 7 * 24 * 60 * 60,
                '1mo': 30 * 24 * 60 * 60,
                '3mo': 90 * 24 * 60 * 60,
                '6mo': 180 * 24 * 60 * 60,
                '1y': 365 * 24 * 60 * 60
              }
              let closestKey = '15m'
              let closestDiff = Infinity
              for (const [key, seconds] of Object.entries(durations)) {
                const delta = Math.abs(seconds - diff)
                if (delta < closestDiff) {
                  closestDiff = delta
                  closestKey = key
                }
              }
              setExpireDurationKey(closestKey)
            } else {
              setExpireEnabled(false)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load user status:', error)
      }
    }
    loadUserStatus()
  }, [profile, account])

  if (!account || !profile) return null

  const save = async () => {
    if (nip05 && !isEmail(nip05)) {
      setNip05Error(t('Invalid NIP-05 address'))
      return
    }

    const oldProfileContent = profileEvent ? JSON.parse(profileEvent.content) : {}
    const newProfileContent: Record<string, unknown> = {
      ...oldProfileContent,
      display_name: username,
      displayName: username,
      name: username,
      about,
      website,
      nip05,
      banner,
      picture: avatar
    }

    const lightningEntry = paymentTargets.find((t) => t.type === 'lightning')
    if (lightningEntry?.authority) {
      if (isEmail(lightningEntry.authority)) {
        newProfileContent.lud16 = lightningEntry.authority
      } else {
        newProfileContent.lud06 = lightningEntry.authority
      }
    } else {
      delete newProfileContent.lud16
      delete newProfileContent.lud06
    }

    if (lightningEntry?.authority && !isEmail(lightningEntry.authority) && !lightningEntry.authority.startsWith('lnurl')) {
      delete newProfileContent.lud16
      delete newProfileContent.lud06
    }

    const bitcoinEntry = paymentTargets.find((t) => t.type === 'bitcoin')
    if (bitcoinEntry?.authority?.startsWith('sp1')) {
      newProfileContent.sp = bitcoinEntry.authority
    } else {
      delete newProfileContent.sp
    }

    setSaving(true)
    setHasChanged(false)
    const profileDraftEvent = createProfileDraftEvent(
      JSON.stringify(newProfileContent),
      profileEvent?.tags
    )
    try {
      const newProfileEvent = await publish(profileDraftEvent)
      await updateProfileEvent(newProfileEvent)

      const paymentInfoDraftEvent = createPaymentInfoDraftEvent(profile, paymentTargets)
      const paymentInfoEvent = await publish(paymentInfoDraftEvent)
      await client.publishPaymentInfoEvent(paymentInfoEvent)

      let statusExpiration: number | undefined
      if (expireEnabled) {
        const durations: Record<string, number> = {
          '5m': 5 * 60,
          '15m': 15 * 60,
          '1h': 60 * 60,
          '4h': 4 * 60 * 60,
          '1d': 24 * 60 * 60,
          '1w': 7 * 24 * 60 * 60,
          '1mo': 30 * 24 * 60 * 60,
          '3mo': 90 * 24 * 60 * 60,
          '6mo': 180 * 24 * 60 * 60,
          '1y': 365 * 24 * 60 * 60
        }
        statusExpiration = dayjs()
          .add(durations[expireDurationKey] || 15 * 60, 'second')
          .unix()
      }
      const statusDraftEvent = createUserStatusDraftEvent(status, undefined, statusExpiration)
      const statusEvent = await publish(statusDraftEvent)
      await client.updateProfileEventCache(statusEvent)
      await updateUserStatusEvent(statusEvent)

      setSaving(false)
      pop()
    } catch (error) {
      const errors = formatError(error)
      errors.forEach((err) => {
        toast.error(`${t('Failed to save profile')}: ${err}`, { duration: 10_000 })
      })
    }
  }

  const onBannerUploadSuccess = ({ url }: { url: string }) => {
    setBanner(url)
    setHasChanged(true)
  }

  const onAvatarUploadSuccess = ({ url }: { url: string }) => {
    setAvatar(url)
    setHasChanged(true)
  }

  const controls = (
    <div className="pr-3">
      <Button className="w-16 rounded-full" onClick={save} disabled={saving || !hasChanged}>
        {saving ? <Loader className="animate-spin" /> : t('Save')}
      </Button>
    </div>
  )

  return (
    <SecondaryPageLayout ref={ref} index={index} title={profile.username} controls={controls}>
      <div className="relative mb-2 bg-cover bg-center">
        <Uploader
          onUploadSuccess={onBannerUploadSuccess}
          onUploadStart={() => setUploadingBanner(true)}
          onUploadEnd={() => setUploadingBanner(false)}
          className="relative w-full cursor-pointer"
        >
          <ProfileBanner banner={banner} pubkey={account.pubkey} className="aspect-[3/1] w-full" />
          <div className="absolute top-0 flex h-full w-full flex-col items-center justify-center bg-muted/30">
            {uploadingBanner ? <Loader size={36} className="animate-spin" /> : <Upload size={36} />}
          </div>
        </Uploader>
        <Uploader
          onUploadSuccess={onAvatarUploadSuccess}
          onUploadStart={() => setUploadingAvatar(true)}
          onUploadEnd={() => setUploadingAvatar(false)}
          className="absolute bottom-0 left-4 h-24 w-24 translate-y-1/2 cursor-pointer rounded-full border-4 border-background"
        >
          <Avatar className="h-full w-full">
            <AvatarImage src={avatar} className="object-cover object-center" />
            <AvatarFallback>
              <img src={defaultImage} />
            </AvatarFallback>
          </Avatar>
          <div className="absolute top-0 flex h-full w-full flex-col items-center justify-center rounded-full bg-muted/30">
            {uploadingAvatar ? <Loader className="animate-spin" /> : <Upload />}
          </div>
        </Uploader>
      </div>
      <div className="flex flex-col gap-4 px-4 pb-32 pt-14">
        <Item>
          <Label htmlFor="profile-username-input">{t('Display Name')}</Label>
          <Input
            id="profile-username-input"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              setHasChanged(true)
            }}
          />
        </Item>
        <Item>
          <Label htmlFor="profile-about-textarea">{t('Bio')}</Label>
          <Textarea
            id="profile-about-textarea"
            className="h-20"
            value={about}
            onChange={(e) => {
              setAbout(e.target.value)
              setHasChanged(true)
            }}
          />
        </Item>
        <Item>
          <Label htmlFor="profile-website-input">{t('Website')}</Label>
          <Input
            id="profile-website-input"
            value={website}
            onChange={(e) => {
              setWebsite(e.target.value)
              setHasChanged(true)
            }}
          />
        </Item>
        <Item>
          <Label htmlFor="profile-nip05-input">{t('Nostr Address (NIP-05)')}</Label>
          <Input
            id="profile-nip05-input"
            value={nip05}
            onChange={(e) => {
              setNip05Error('')
              setNip05(e.target.value)
              setHasChanged(true)
            }}
            className={nip05Error ? 'border-destructive' : ''}
          />
          {nip05Error && <div className="pl-3 text-xs text-destructive">{nip05Error}</div>}
        </Item>
        <Item>
          <Label>{t('Payment Methods')}</Label>
          <div className="flex flex-col gap-2">
            {paymentTargets.map((target, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-sm">{target.authority}</div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 size-8"
                  onClick={() => {
                    const next = paymentTargets.filter((_, j) => j !== i)
                    setPaymentTargets(next)
                    setHasChanged(true)
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Input
                className="flex-1 font-mono text-sm"
                placeholder={t('payto://lightning/user@domain.com')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const val = e.currentTarget.value.trim()
                    let type = 'lightning'
                    let authority = val
                    if (val.startsWith('payto://')) {
                      const rest = val.slice(8)
                      const slashIdx = rest.indexOf('/')
                      if (slashIdx > 0) {
                        type = rest.slice(0, slashIdx)
                        authority = decodeURIComponent(rest.slice(slashIdx + 1))
                      }
                    }
                    setPaymentTargets([...paymentTargets, { type, authority }])
                    e.currentTarget.value = ''
                    setHasChanged(true)
                  }
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                className="shrink-0 gap-1"
                onClick={() => {
                  setPaymentTargets([...paymentTargets, { type: 'lightning', authority: '' }])
                  setHasChanged(true)
                }}
              >
                <Plus className="size-4" />
                {t('Add')}
              </Button>
            </div>
          </div>
        </Item>
        <Item>
          <Label htmlFor="profile-status-input">{t('User status')}</Label>
          <Input
            id="profile-status-input"
            value={status}
            maxLength={280}
            placeholder={t('Set a status...')}
            onChange={(e) => {
              setStatus(e.target.value)
              setHasChanged(true)
            }}
          />
        </Item>
        <Item>
          <div className="flex items-center justify-between">
            <Label htmlFor="status-expire-toggle">{t('Expires')}</Label>
            <Switch
              id="status-expire-toggle"
              checked={expireEnabled}
              onCheckedChange={(checked) => {
                setExpireEnabled(checked)
                setHasChanged(true)
              }}
            />
          </div>
          {expireEnabled && (
            <div className="flex flex-wrap gap-2">
              {[
                { key: '5m', label: t('5 minutes') },
                { key: '15m', label: t('15 minutes') },
                { key: '1h', label: t('1 hour') },
                { key: '4h', label: t('4 hours') },
                { key: '1d', label: t('1 day') },
                { key: '1w', label: t('1 week') },
                { key: '1mo', label: t('1 month') },
                { key: '3mo', label: t('3 months') },
                { key: '6mo', label: t('6 months') },
                { key: '1y', label: t('1 year') }
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    expireDurationKey === option.key
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/20 bg-muted/30 text-foreground hover:border-primary/30 hover:bg-muted/40'
                  }`}
                  onClick={() => {
                    setExpireDurationKey(option.key)
                    setHasChanged(true)
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </Item>
      </div>
    </SecondaryPageLayout>
  )
})
ProfileEditorPage.displayName = 'ProfileEditorPage'
export default ProfileEditorPage

function Item({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-2">{children}</div>
}
