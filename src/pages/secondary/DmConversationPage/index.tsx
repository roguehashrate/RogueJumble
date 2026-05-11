import DmInput from '@/components/DmInput'
import DmMessageList from '@/components/DmMessageList'
import UserAvatar from '@/components/UserAvatar'
import { SimpleUsername } from '@/components/Username'
import SecondaryPageLayout from '@/layouts/SecondaryPageLayout'
import { usePrimaryPage, useSecondaryPage } from '@/PageManager'
import { useDmContext } from '@/providers/DmContextProvider'
import { useNostr } from '@/providers/NostrProvider'
import encryptionKeyService from '@/services/encryption-key.service'
import { TDmMessage } from '@/types'
import { ChevronLeft } from 'lucide-react'
import { nip19 } from 'nostr-tools'
import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const DmConversationPage = forwardRef(
  ({ id: pubkeyOrNpub, index }: { id?: string; index?: number }, ref) => {
    const { t } = useTranslation()
    const { pubkey: accountPubkey } = useNostr()
    const { navigate: navigatePrimary } = usePrimaryPage()
    const { pop } = useSecondaryPage()
    const { registerConversation, unregisterConversation } = useDmContext()
    const [replyTo, setReplyTo] = useState<{
      id: string
      content: string
      senderPubkey: string
      tags?: string[][]
    } | null>(null)

    const pubkey = useMemo(() => {
      if (pubkeyOrNpub?.startsWith('npub')) {
        try {
          const decoded = nip19.decode(pubkeyOrNpub)
          if (decoded.type === 'npub') {
            return decoded.data
          }
        } catch {
          // Invalid npub, keep original
        }
      }
      return pubkeyOrNpub
    }, [pubkeyOrNpub])

    useEffect(() => {
      if (!accountPubkey) return
      if (!encryptionKeyService.hasEncryptionKey(accountPubkey)) {
        navigatePrimary('dms')
      }
    }, [accountPubkey, navigatePrimary])

    useEffect(() => {
      if (pubkey) {
        registerConversation(pubkey)
      }
      return () => {
        unregisterConversation()
      }
    }, [pubkey, registerConversation, unregisterConversation])

    const handleReply = useCallback((message: TDmMessage) => {
      setReplyTo({
        id: message.id,
        content: message.content,
        senderPubkey: message.senderPubkey,
        tags: message.decryptedRumor?.tags
      })
    }, [])

    if (!pubkey) {
      return (
        <SecondaryPageLayout index={index} title={t('Conversation')} ref={ref}>
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">{t('Invalid user')}</p>
          </div>
        </SecondaryPageLayout>
      )
    }

    return (
      <SecondaryPageLayout
        index={index}
        titlebar={
          <div className="flex h-full items-center gap-3">
            <button onClick={() => pop()} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted/60">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <UserAvatar userId={pubkey} size="small" />
            <SimpleUsername userId={pubkey} className="truncate font-semibold text-base" withoutSkeleton />
          </div>
        }
        ref={ref}
      >
        <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 8rem)' }}>
          <div className="flex flex-col flex-1 min-h-0">
            <DmMessageList otherPubkey={pubkey} onReply={handleReply} />
          </div>
          <div className="border-t bg-background shrink-0">
            <DmInput
              recipientPubkey={pubkey}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              onSent={() => setReplyTo(null)}
            />
          </div>
        </div>
      </SecondaryPageLayout>
    )
  }
)
DmConversationPage.displayName = 'DmConversationPage'
export default DmConversationPage
