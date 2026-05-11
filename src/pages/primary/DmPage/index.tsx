import DmList from '@/components/DmList'
import DmRelayConfig from '@/components/DmRelayConfig'
import NewDeviceKeySync from '@/components/NewDeviceKeySync'
import ResetEncryptionKeyButton from '@/components/ResetEncryptionKeyButton'
import SearchInput from '@/components/SearchInput'
import { Button } from '@/components/ui/button'
import UserItem, { UserItemSkeleton } from '@/components/UserItem'
import { useSearchProfiles } from '@/hooks'
import PrimaryPageLayout from '@/layouts/PrimaryPageLayout'
import { toDmConversation } from '@/lib/link'
import { isValidPubkey, userIdToPubkey } from '@/lib/pubkey'
import { cn } from '@/lib/utils'
import { usePrimaryPage, useSecondaryPage } from '@/PageManager'
import { useNostr } from '@/providers/NostrProvider'
import dmService from '@/services/dm.service'
import encryptionKeyService from '@/services/encryption-key.service'
import indexedDb from '@/services/indexed-db.service'
import { TPageRef } from '@/types'
import { Download, Key, Loader2, MessageCircle, Settings, Upload, UserPlus } from 'lucide-react'
import { Event, kinds, nip19 } from 'nostr-tools'
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

type TSetupState =
  | 'loading'
  | 'need_login'
  | 'need_relays'
  | 'need_encryption_key'
  | 'need_sync'
  | 'ready'

const DmPage = forwardRef<TPageRef>((_, ref) => {
  const { t } = useTranslation()
  const { pubkey, signEvent } = useNostr()
  const { current } = usePrimaryPage()
  const [setupState, setSetupState] = useState<TSetupState>('loading')
  const [showRelayConfig, setShowRelayConfig] = useState(false)

  const checkSetup = useCallback(async () => {
    setShowRelayConfig(false)

    if (!pubkey) {
      setSetupState('need_login')
      return
    }

    const localKeypair = encryptionKeyService.getEncryptionKeypair(pubkey)
    if (localKeypair) {
      setSetupState('ready')
      dmService
        .checkDmSupport(pubkey)
        .then(({ encryptionPubkey }) => {
          if (encryptionPubkey && encryptionPubkey !== localKeypair.pubkey) {
            encryptionKeyService.removeEncryptionKey(pubkey)
            dmService.resetEncryption()
            setSetupState('need_sync')
          }
        })
        .catch(() => {})
      return
    }

    setSetupState('loading')

    try {
      const { hasDmRelays, hasEncryptionKey } = await dmService.checkDmSupport(pubkey)
      if (!hasDmRelays) {
        setSetupState('need_relays')
        return
      }

      if (hasEncryptionKey) {
        setSetupState('need_sync')
        return
      }

      setSetupState('need_encryption_key')
    } catch {
      setSetupState('need_relays')
    }
  }, [pubkey])

  useEffect(() => {
    if (current === 'dms') {
      checkSetup()
    }
  }, [current, pubkey, checkSetup])

  useEffect(() => {
    if (!pubkey) return

    const unsub = dmService.onEncryptionKeyChanged(() => {
      encryptionKeyService.removeEncryptionKey(pubkey)
      dmService.resetEncryption()
      setSetupState('need_sync')
    })

    return unsub
  }, [pubkey])

  const handlePublishEncryptionKey = async () => {
    if (!pubkey) return

    try {
      encryptionKeyService.generateEncryptionKey(pubkey)
      const signer = {
        getPublicKey: async () => pubkey,
        signEvent
      }
      await encryptionKeyService.publishEncryptionKeyAnnouncement(signer as any, pubkey)
      toast.success(t('Encryption key published'))
      setSetupState('ready')
      const encryptionKeypair = encryptionKeyService.getEncryptionKeypair(pubkey)
      if (encryptionKeypair) {
        dmService.resetEncryption()
        dmService.init(pubkey, encryptionKeypair)
      }
    } catch {
      toast.error(t('Failed to publish encryption key'))
    }
  }

  const handleKeySyncComplete = () => {
    setSetupState('ready')
    if (pubkey) {
      const encryptionKeypair = encryptionKeyService.getEncryptionKeypair(pubkey)
      if (encryptionKeypair) {
        dmService.resetEncryption()
        dmService.init(pubkey, encryptionKeypair)
      }
    }
  }

  const handleResetEncryptionKey = async () => {
    if (!pubkey) return

    try {
      encryptionKeyService.removeEncryptionKey(pubkey)
      dmService.resetEncryption()
      encryptionKeyService.generateEncryptionKey(pubkey)
      const signer = {
        getPublicKey: async () => pubkey,
        signEvent
      }
      await encryptionKeyService.publishEncryptionKeyAnnouncement(signer as any, pubkey)
      toast.success(t('Encryption key has been reset'))
      const encryptionKeypair = encryptionKeyService.getEncryptionKeypair(pubkey)
      if (encryptionKeypair) {
        dmService.init(pubkey, encryptionKeypair)
      }
    } catch (err) {
      console.error('[DmPage] handleResetEncryptionKey failed:', err)
      toast.error((err as Error).message || t('Failed to reset encryption key'))
    }
  }

  return (
    <PrimaryPageLayout
      ref={ref}
      pageName="dms"
      titlebar={
        <DmPageTitlebar
          showSettings={setupState === 'ready'}
          isSettingsActive={showRelayConfig}
          onSettingsClick={() => setShowRelayConfig((prev) => !prev)}
        />
      }
    >
      {setupState === 'loading' && (
        <div className="flex items-center justify-center p-8 pt-[30vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary shadow-lg shadow-primary/10" />
            <p className="text-sm text-muted-foreground animate-pulse">{t('Setting up messages...')}</p>
          </div>
        </div>
      )}
      {setupState === 'need_login' && <NeedLoginView />}
      {setupState === 'need_relays' && <DmRelayConfig onComplete={checkSetup} />}
      {setupState === 'need_encryption_key' && (
        <NeedEncryptionKeyView onPublish={handlePublishEncryptionKey} />
      )}
      {setupState === 'need_sync' && <NewDeviceKeySync onComplete={handleKeySyncComplete} />}
      {setupState === 'ready' && (
        <>
          {showRelayConfig && (
            <>
              <DmRelayConfig />
              <ChatHistorySection accountPubkey={pubkey!} />
              <ResetEncryptionKeySection onReset={handleResetEncryptionKey} />
            </>
          )}
          <DmList />
        </>
      )}
    </PrimaryPageLayout>
  )
})
DmPage.displayName = 'DmPage'
export default DmPage

function DmPageTitlebar({
  showSettings,
  isSettingsActive,
  onSettingsClick
}: {
  showSettings: boolean
  isSettingsActive: boolean
  onSettingsClick: () => void
}) {
  const { t } = useTranslation()
  const { push } = useSecondaryPage()
  const [searching, setSearching] = useState(false)
  const [input, setInput] = useState('')
  const [debouncedInput, setDebouncedInput] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedInput(input)
    }, 400)
    return () => clearTimeout(handler)
  }, [input])

  const directPubkey = useMemo(() => {
    const trimmed = input.trim()
    if (!trimmed) return null

    if (/^[0-9a-f]{64}$/.test(trimmed) && isValidPubkey(trimmed)) {
      return trimmed
    }

    try {
      const id = trimmed.startsWith('nostr:') ? trimmed.slice(6) : trimmed
      const { type } = nip19.decode(id)
      if (type === 'npub' || type === 'nprofile') {
        return userIdToPubkey(id)
      }
    } catch {
      // Invalid nip19 identifier
    }

    return null
  }, [input])

  const { profiles, isFetching } = useSearchProfiles(directPubkey ? '' : debouncedInput, 10)

  const handleSelect = (pubkey: string) => {
    push(toDmConversation(pubkey))
    closeSearch()
  }

  const openSearch = () => {
    searchInputRef.current?.focus()
    setSearching(true)
  }

  const closeSearch = () => {
    setSearching(false)
    setInput('')
    setDebouncedInput('')
    searchInputRef.current?.blur()
  }

  const displayList = searching && !!input.trim()
  const hasResults = directPubkey || profiles.length > 0 || isFetching

  return (
    <div className="relative flex h-full w-full items-center gap-1">
      {displayList && hasResults && (
        <>
          <div
            className={cn(
              'bg-surface-background z-50 rounded-b-lg shadow-lg',
              'absolute inset-x-0 top-full -translate-y-2 border px-1 pt-3.5 pb-1'
            )}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="h-fit max-h-80 overflow-y-auto">
              {directPubkey && (
                <div
                  className="hover:bg-accent cursor-pointer rounded-md px-2"
                  onClick={() => handleSelect(directPubkey)}
                >
                  <UserItem
                    userId={directPubkey}
                    className="pointer-events-none"
                    hideFollowButton
                    showFollowingBadge
                  />
                </div>
              )}
              {!directPubkey &&
                profiles.map((profile) => (
                  <div
                    key={profile.pubkey}
                    className="hover:bg-accent cursor-pointer rounded-md px-2"
                    onClick={() => handleSelect(profile.pubkey)}
                  >
                    <UserItem
                      userId={profile.npub}
                      className="pointer-events-none"
                      hideFollowButton
                      showFollowingBadge
                    />
                  </div>
                ))}
              {!directPubkey && isFetching && (
                <div className="px-2">
                  <UserItemSkeleton hideFollowButton />
                </div>
              )}
            </div>
          </div>
          <div className="fixed inset-0 h-full w-full" onClick={closeSearch} />
        </>
      )}
      <SearchInput
        ref={searchInputRef}
        className={cn(
          'bg-surface-background h-full border-transparent shadow-inner',
          searching ? 'absolute inset-0' : 'pointer-events-none absolute inset-0 opacity-0',
          displayList ? 'z-50' : ''
        )}
        placeholder={t('npub, hex key, or username')}
        value={input}
        onChange={(e) => setInput((e.target as HTMLInputElement).value)}
        onFocus={() => setSearching(true)}
        onBlur={() => {
          if (!input.trim()) closeSearch()
        }}
      />
      {!searching && (
        <>
          <div className="flex items-center gap-2 ps-3">
            <MessageCircle className="h-5 w-5" />
            <div className="text-lg font-semibold">{t('Messages')}</div>
          </div>
          <div className="ms-auto flex items-center">
            {showSettings && (
              <>
                <Button variant="ghost" size="titlebar-icon" onClick={openSearch}>
                  <UserPlus className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="titlebar-icon"
                  onClick={onSettingsClick}
                  className={isSettingsActive ? 'bg-muted/40' : ''}
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function NeedLoginView() {
  const { t } = useTranslation()
  const { startLogin } = useNostr()

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-secondary shadow-xl shadow-primary/5">
        <MessageCircle className="h-12 w-12 text-primary" />
      </div>
      <div className="space-y-2 max-w-sm">
        <h3 className="text-xl font-semibold">{t('Sign in to use Messages')}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {t('You need to be signed in to send and receive direct messages.')}
        </p>
      </div>
      <Button
        onClick={startLogin}
        className="rounded-full px-8 shadow-lg shadow-primary/20 transition-shadow hover:shadow-xl hover:shadow-primary/30"
      >
        {t('Sign In')}
      </Button>
    </div>
  )
}

function NeedEncryptionKeyView({ onPublish }: { onPublish: () => Promise<void> }) {
  const { t } = useTranslation()
  const [isPublishing, setIsPublishing] = useState(false)

  const handlePublish = useCallback(async () => {
    setIsPublishing(true)
    try {
      await onPublish()
    } finally {
      setIsPublishing(false)
    }
  }, [onPublish])

  useEffect(() => {
    handlePublish()
  }, [])

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-purple-500/10 shadow-xl shadow-primary/5">
        <Key className="h-12 w-12 text-primary" />
      </div>
      <div className="space-y-2 max-w-sm">
        <h3 className="text-xl font-semibold">{t('Enable Direct Messages')}</h3>
        <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
          {t(
            'Direct messages are end-to-end encrypted with a dedicated key pair, separate from your Nostr identity key. Only the public portion is published so others can send you encrypted messages.'
          )}
        </p>
      </div>
      <Button
        onClick={handlePublish}
        disabled={isPublishing}
        className="rounded-full px-8 shadow-lg shadow-primary/20 transition-shadow hover:shadow-xl hover:shadow-primary/30"
      >
        {isPublishing ? (
          <>
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
            {t('Publishing...')}
          </>
        ) : (
          t('Publish Encryption Key')
        )}
      </Button>
    </div>
  )
}

function ChatHistorySection({ accountPubkey }: { accountPubkey: string }) {
  const { t } = useTranslation()
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const messages = await indexedDb.getAllDmMessagesForAccount(accountPubkey)
      if (messages.length === 0) {
        toast.info(t('No messages to export'))
        return
      }

      const lines = messages.map((msg) => JSON.stringify(msg.decryptedRumor))
      const blob = new Blob([lines.join('\n')], { type: 'application/jsonl' })

      const date = new Date().toISOString().slice(0, 10)
      const filename = `jumble-dm-${date}.jsonl`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)

      toast.success(t('Exported {{count}} messages', { count: messages.length }))
    } catch {
      toast.error(t('Failed to export chat history'))
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter((line) => line.trim())
      const rumors: Event[] = []
      const errors: number[] = []

      for (let i = 0; i < lines.length; i++) {
        try {
          const parsed = JSON.parse(lines[i])
          if (parsed.kind !== 14 && parsed.kind !== 15 && parsed.kind !== kinds.Reaction) {
            errors.push(i + 1)
            continue
          }
          if (
            !parsed.id ||
            !parsed.pubkey ||
            !parsed.created_at ||
            !parsed.tags ||
            parsed.content === undefined
          ) {
            errors.push(i + 1)
            continue
          }
          rumors.push(parsed as Event)
        } catch {
          errors.push(i + 1)
        }
      }

      if (rumors.length === 0) {
        toast.error(t('No valid messages found in file'))
        return
      }

      const count = await dmService.importMessages(accountPubkey, rumors)

      if (errors.length > 0) {
        toast.warning(
          t('Imported {{count}} messages, {{errors}} lines skipped', {
            count,
            errors: errors.length
          })
        )
      } else {
        toast.success(t('Imported {{count}} messages', { count }))
      }
    } catch {
      toast.error(t('Failed to import chat history'))
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/50 bg-card/30 p-4 mx-4 my-2 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Upload className="h-4 w-4 text-primary" />
        {t('Chat History')}
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {t(
          'Export your chat history as a backup file, or import a previously exported file to restore messages.'
        )}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting} className="rounded-xl">
          {isExporting ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="me-2 h-4 w-4" />
          )}
          {t('Export')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="rounded-xl"
        >
          {isImporting ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="me-2 h-4 w-4" />
          )}
          {t('Import')}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jsonl"
          className="hidden"
          onChange={handleImport}
        />
      </div>
    </div>
  )
}

function ResetEncryptionKeySection({ onReset }: { onReset: () => Promise<void> }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-4 mx-4 my-2">
      <div className="flex items-center gap-2 text-sm font-medium text-destructive">
        <Key className="h-4 w-4" />
        {t('Encryption Key')}
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {t(
          'Your encryption key is a dedicated key pair used to encrypt and decrypt direct messages. It is separate from your Nostr identity key and stored locally on your device.'
        )}
      </p>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {t(
          'Resetting will generate a new key. You will no longer be able to read old messages. Please export and backup your chat history before proceeding.'
        )}
      </p>
      <ResetEncryptionKeyButton onConfirm={onReset} />
    </div>
  )
}
