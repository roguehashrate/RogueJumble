import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
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
import { getUserStatusFromEvent } from '@/lib/event-metadata'
import { formatError } from '@/lib/error'
import client from '@/services/client.service'
import { generateImageByPubkey } from '@/lib/pubkey'
import { isEmail } from '@/lib/utils'
import { useSecondaryPage } from '@/PageManager'
import { useNostr } from '@/providers/NostrProvider'
import { ChevronDown, Loader, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import type { Event } from 'nostr-tools'
import dayjs from 'dayjs'
import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react'
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
  const [lud16, setLud16] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [expireEnabled, setExpireEnabled] = useState(false)
  const [expireDurationKey, setExpireDurationKey] = useState<string>('15m')
  const [hasChanged, setHasChanged] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [paymentInfoEvent, setPaymentInfoEvent] = useState<Event | null>(null)
  const [paymentInfoEditOpen, setPaymentInfoEditOpen] = useState(false)
  const [paymentInfoEditContent, setPaymentInfoEditContent] = useState('')
  const [paymentInfoEditMethods, setPaymentInfoEditMethods] = useState<Array<{ type: string; authority: string }>>([])
  const [paymentInfoShowFullJson, setPaymentInfoShowFullJson] = useState(false)
  const [savingPaymentInfo, setSavingPaymentInfo] = useState(false)
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
      setLud16(profile.lud16 ?? '')
    } else {
      setBanner('')
      setAvatar('')
      setUsername('')
      setAbout('')
      setWebsite('')
      setNip05('')
      setLud16('')
    }

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

  // Fetch payment info (kind 10133)
  useEffect(() => {
    if (!account?.pubkey) { setPaymentInfoEvent(null); return }
    let cancelled = false
    client
      .fetchPaymentInfoEvent(account.pubkey)
      .then((evt) => { if (!cancelled) setPaymentInfoEvent(evt ?? null) })
      .catch(() => { if (!cancelled) setPaymentInfoEvent(null) })
    return () => { cancelled = true }
  }, [account?.pubkey])

  // ─── Payment info dialog ──────────────────────────────────────────────────────

  const openPaymentInfoEditor = useCallback(() => {
    if (paymentInfoEvent) {
      setPaymentInfoEditContent(
        typeof paymentInfoEvent.content === 'string'
          ? paymentInfoEvent.content
          : JSON.stringify(paymentInfoEvent.content ?? '', null, 2)
      )
      const paytoTags = (paymentInfoEvent.tags ?? []).filter(
        (tag) => Array.isArray(tag) && tag[0] === 'payto' && tag[1] != null
      )
      setPaymentInfoEditMethods(
        paytoTags.length > 0
          ? paytoTags.map((tag) => ({
              type: (tag[1] as string) || 'lightning',
              authority: (tag[2] as string) || ''
            }))
          : [{ type: 'lightning', authority: '' }]
      )
    } else {
      setPaymentInfoEditContent('{}')
      setPaymentInfoEditMethods([{ type: 'lightning', authority: '' }])
    }
    setPaymentInfoShowFullJson(false)
    setPaymentInfoEditOpen(true)
  }, [paymentInfoEvent])

  const savePaymentInfo = useCallback(async () => {
    const tags: string[][] = paymentInfoEditMethods
      .filter((m) => m.authority.trim())
      .map((m) => ['payto', (m.type.trim() || 'lightning').toLowerCase(), m.authority.trim()])
    setSavingPaymentInfo(true)
    try {
      const contentStr = paymentInfoEditContent.trim() || '{}'
      try { JSON.parse(contentStr) } catch {
        toast.error(t('Invalid content JSON'))
        setSavingPaymentInfo(false)
        return
      }
      const draft = createPaymentInfoDraftEvent(contentStr, tags)
      const published = await publish(draft)
      await client.updatePaymentInfoEventCache(published)
      setPaymentInfoEvent(published)
      setPaymentInfoEditOpen(false)
      toast.success(t('Payment info updated'))
    } catch {
      toast.error(t('Failed to publish payment info'))
    } finally {
      setSavingPaymentInfo(false)
    }
  }, [paymentInfoEditContent, paymentInfoEditMethods, publish, t])

  if (!account || !profile) return null

  // ─── Save profile ─────────────────────────────────────────────────────────────

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

    if (lud16.trim()) {
      newProfileContent.lud16 = lud16.trim()
    } else {
      delete newProfileContent.lud16
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
          <Label htmlFor="profile-lud16-input">{t('Lightning Address')}</Label>
          <Input
            id="profile-lud16-input"
            value={lud16}
            placeholder="user@getalby.com"
            onChange={(e) => {
              setLud16(e.target.value)
              setHasChanged(true)
            }}
          />
        </Item>
        <Item>
          <div className="flex items-center justify-between gap-2">
            <Label>{t('Payment info')}</Label>
            <Button variant="outline" size="sm" onClick={openPaymentInfoEditor} className="shrink-0">
              <Pencil className="h-3.5 w-3.5 mr-1" />
              {paymentInfoEvent ? t('Edit payment info') : t('Add payment info')}
            </Button>
          </div>
          {paymentInfoEvent ? (
            <details className="text-sm text-muted-foreground mt-1">
              <summary className="flex items-center gap-2 cursor-pointer">
                <ChevronDown className="h-4 w-4" />
                {t('Raw payment info event')}
              </summary>
              <div className="pt-2 space-y-2">
                <div>
                  <p className="text-xs font-medium">{t('Content (JSON)')}</p>
                  <pre className="mt-1 p-3 rounded-md bg-muted text-xs overflow-auto max-h-48 break-all whitespace-pre-wrap">
                    {paymentInfoEvent.content || '{}'}
                  </pre>
                </div>
                <div>
                  <p className="text-xs font-medium">{t('Tags')}</p>
                  <pre className="mt-1 p-3 rounded-md bg-muted text-xs overflow-auto max-h-48">
                    {JSON.stringify(paymentInfoEvent.tags ?? [], null, 2)}
                  </pre>
                </div>
              </div>
            </details>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">
              {t('No payment info event yet. Click "Add payment info" to create one.')}
            </p>
          )}
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

      {/* Edit payment info dialog */}
      <Dialog open={paymentInfoEditOpen} onOpenChange={setPaymentInfoEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('Edit payment info')}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto space-y-4">
            <Item>
              <Label>{t('Payment methods')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('Type (e.g. lightning) and authority (e.g. user@domain.com).')}
              </p>
              <div className="space-y-2">
                {paymentInfoEditMethods.map((row, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      placeholder={t('Type')}
                      value={row.type}
                      onChange={(e) => {
                        const next = [...paymentInfoEditMethods]
                        next[idx] = { ...next[idx], type: e.target.value }
                        setPaymentInfoEditMethods(next)
                      }}
                      className="flex-1 max-w-[140px] font-mono text-sm"
                    />
                    <Input
                      placeholder={t('Authority')}
                      value={row.authority}
                      onChange={(e) => {
                        const next = [...paymentInfoEditMethods]
                        next[idx] = { ...next[idx], authority: e.target.value }
                        setPaymentInfoEditMethods(next)
                      }}
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        setPaymentInfoEditMethods(paymentInfoEditMethods.filter((_, i) => i !== idx))
                      }
                      aria-label={t('Remove')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() =>
                    setPaymentInfoEditMethods([
                      ...paymentInfoEditMethods,
                      { type: 'lightning', authority: '' }
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('Add payment method')}
                </Button>
              </div>
            </Item>
            <Item>
              <Label htmlFor="payment-info-content">{t('Additional content (JSON)')}</Label>
              <Input
                id="payment-info-content"
                className="font-mono text-sm"
                value={paymentInfoEditContent}
                onChange={(e) => setPaymentInfoEditContent(e.target.value)}
                placeholder='{}'
              />
            </Item>
            <Item>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setPaymentInfoShowFullJson((v) => !v)}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${paymentInfoShowFullJson ? 'rotate-180' : ''}`}
                />
                {t('Show full event JSON')}
              </Button>
              {paymentInfoShowFullJson && (
                <pre className="mt-2 p-3 rounded-md bg-muted text-xs overflow-auto max-h-48 break-all whitespace-pre-wrap border">
                  {JSON.stringify(
                    createPaymentInfoDraftEvent(
                      paymentInfoEditContent.trim() || '{}',
                      paymentInfoEditMethods
                        .filter((m) => m.authority.trim())
                        .map((m) => [
                          'payto',
                          (m.type.trim() || 'lightning').toLowerCase(),
                          m.authority.trim()
                        ])
                    ),
                    null,
                    2
                  )}
                </pre>
              )}
            </Item>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentInfoEditOpen(false)}>
              {t('Cancel')}
            </Button>
            <Button onClick={savePaymentInfo} disabled={savingPaymentInfo} className="gap-2">
              {savingPaymentInfo && <Loader className="size-4 animate-spin" />}
              {savingPaymentInfo ? t('Saving…') : t('Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SecondaryPageLayout>
  )
})
ProfileEditorPage.displayName = 'ProfileEditorPage'
export default ProfileEditorPage

function Item({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-2">{children}</div>
}
