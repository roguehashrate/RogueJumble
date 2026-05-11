import { createContext, useContext, useState, useCallback } from 'react'

type TDmContext = {
  recipientPubkey: string | null
  registerConversation: (pubkey: string) => void
  unregisterConversation: () => void
  onMessageSent: () => void
  refreshMessages: number
}

const DmContext = createContext<TDmContext | undefined>(undefined)

export const useDmContext = () => {
  const context = useContext(DmContext)
  if (!context) {
    throw new Error('useDmContext must be used within a DmContextProvider')
  }
  return context
}

export function DmContextProvider({ children }: { children: React.ReactNode }) {
  const [recipientPubkey, setRecipientPubkey] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const registerConversation = useCallback((pubkey: string) => {
    setRecipientPubkey(pubkey)
  }, [])

  const unregisterConversation = useCallback(() => {
    setRecipientPubkey(null)
  }, [])

  const onMessageSent = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  return (
    <DmContext.Provider
      value={{
        recipientPubkey,
        registerConversation,
        unregisterConversation,
        onMessageSent,
        refreshMessages: refreshTrigger
      }}
    >
      {children}
    </DmContext.Provider>
  )
}
