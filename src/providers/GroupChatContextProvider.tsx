import { createContext, useContext, useState, useCallback } from 'react'

type TGroupChatContext = {
  groupId: string | null
  registerGroupChat: (groupId: string) => void
  unregisterGroupChat: () => void
  onMessageSent: () => void
  refreshMessages: number
}

const GroupChatContext = createContext<TGroupChatContext | undefined>(undefined)

export const useGroupChatContext = () => {
  const context = useContext(GroupChatContext)
  if (!context) {
    throw new Error('useGroupChatContext must be used within a GroupChatContextProvider')
  }
  return context
}

export function GroupChatContextProvider({ children }: { children: React.ReactNode }) {
  const [groupId, setGroupId] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const registerGroupChat = useCallback((id: string) => {
    setGroupId(id)
  }, [])

  const unregisterGroupChat = useCallback(() => {
    setGroupId(null)
  }, [])

  const onMessageSent = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  return (
    <GroupChatContext.Provider
      value={{
        groupId,
        registerGroupChat,
        unregisterGroupChat,
        onMessageSent,
        refreshMessages: refreshTrigger
      }}
    >
      {children}
    </GroupChatContext.Provider>
  )
}
