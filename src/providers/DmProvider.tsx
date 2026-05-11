import { useNostr } from '@/providers/NostrProvider'
import { TDmConversation, TDmMessage, TEncryptionKeypair } from '@/types'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import dmService from '@/services/dm.service'
import encryptionKeyService from '@/services/encryption-key.service'

type TDmContext = {
  conversations: TDmConversation[]
  loading: boolean
  isInitialized: boolean
  sendMessage: (
    recipientPubkey: string,
    content: string,
    replyTo?: { id: string; content: string; senderPubkey: string }
  ) => Promise<TDmMessage | null>
  getMessages: (
    otherPubkey: string,
    options?: { limit?: number; before?: number }
  ) => Promise<TDmMessage[]>
  markAsRead: (otherPubkey: string) => Promise<void>
  deleteConversation: (otherPubkey: string) => Promise<void>
  setActiveConversation: (otherPubkey: string) => void
  clearActiveConversation: (otherPubkey: string) => void
  hasEncryptionKey: boolean
  generateEncryptionKey: () => TEncryptionKeypair | null
  getEncryptionKeypair: () => TEncryptionKeypair | null
}

const DmContext = createContext<TDmContext | undefined>(undefined)

export const useDm = () => {
  const context = useContext(DmContext)
  if (!context) throw new Error('useDm must be used within a DmProvider')
  return context
}

export function DmProvider({ children }: { children: React.ReactNode }) {
  const { pubkey } = useNostr()
  const [conversations, setConversations] = useState<TDmConversation[]>([])
  const [loading, setLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const initRef = useRef(false)

  useEffect(() => {
    if (!pubkey) {
      dmService.destroy()
      setConversations([])
      setIsInitialized(false)
      initRef.current = false
      return
    }

    if (initRef.current) return
    initRef.current = true

    const init = async () => {
      const keypair = encryptionKeyService.getEncryptionKeypair(pubkey) ||
        encryptionKeyService.generateEncryptionKey(pubkey)
      if (!keypair) return

      setLoading(true)
      try {
        await dmService.init(pubkey, keypair)
        setIsInitialized(true)
        const convs = await dmService.getConversations(pubkey)
        setConversations(convs)
      } catch (err) {
        console.error('Failed to init DM service:', err)
      } finally {
        setLoading(false)
      }
    }

    init()

    const unsubData = dmService.onDataChanged(async () => {
      if (!pubkey) return
      const convs = await dmService.getConversations(pubkey)
      setConversations(convs)
    })

    const unsubLoading = dmService.onLoadingChanged((isLoading) => {
      setLoading(isLoading)
    })

    return () => {
      unsubData()
      unsubLoading()
    }
  }, [pubkey])

  const sendMessage = useCallback(
    async (
      recipientPubkey: string,
      content: string,
      replyTo?: { id: string; content: string; senderPubkey: string }
    ) => {
      if (!pubkey) throw new Error('Not logged in')
      return dmService.sendMessage(pubkey, recipientPubkey, content, replyTo)
    },
    [pubkey]
  )

  const getMessages = useCallback(
    async (otherPubkey: string, options?: { limit?: number; before?: number }) => {
      if (!pubkey) throw new Error('Not logged in')
      return dmService.getMessages(pubkey, otherPubkey, options)
    },
    [pubkey]
  )

  const markAsRead = useCallback(
    async (otherPubkey: string) => {
      if (!pubkey) return
      await dmService.markConversationAsRead(pubkey, otherPubkey)
    },
    [pubkey]
  )

  const deleteConversation = useCallback(
    async (otherPubkey: string) => {
      if (!pubkey) return
      await dmService.deleteConversation(pubkey, otherPubkey)
      const convs = await dmService.getConversations(pubkey)
      setConversations(convs)
    },
    [pubkey]
  )

  const setActiveConversation = useCallback(
    (otherPubkey: string) => {
      if (!pubkey) return
      dmService.setActiveConversation(pubkey, otherPubkey)
    },
    [pubkey]
  )

  const clearActiveConversation = useCallback(
    (otherPubkey: string) => {
      if (!pubkey) return
      dmService.clearActiveConversation(pubkey, otherPubkey)
    },
    [pubkey]
  )

  const hasEncryptionKey = !!pubkey && encryptionKeyService.hasEncryptionKey(pubkey)

  const generateEncryptionKey = useCallback(() => {
    if (!pubkey) return null
    return encryptionKeyService.generateEncryptionKey(pubkey)
  }, [pubkey])

  const getEncryptionKeypair = useCallback(() => {
    if (!pubkey) return null
    return encryptionKeyService.getEncryptionKeypair(pubkey)
  }, [pubkey])

  return (
    <DmContext.Provider
      value={{
        conversations,
        loading,
        isInitialized,
        sendMessage,
        getMessages,
        markAsRead,
        deleteConversation,
        setActiveConversation,
        clearActiveConversation,
        hasEncryptionKey,
        generateEncryptionKey,
        getEncryptionKeypair
      }}
    >
      {children}
    </DmContext.Provider>
  )
}
