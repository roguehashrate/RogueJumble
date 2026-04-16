import { applyFont } from '@/lib/fontLoader'
import { isTorBrowser } from '@/lib/utils'
import storage from '@/services/local-storage.service'
import { TEmoji, TFont, TFontSize, TNotificationStyle } from '@/types'
import { createContext, useContext, useEffect, useState } from 'react'

type TUserPreferencesContext = {
  notificationListStyle: TNotificationStyle
  updateNotificationListStyle: (style: TNotificationStyle) => void

  font: TFont
  updateFont: (font: TFont) => void

  fontSize: TFontSize
  updateFontSize: (fontSize: TFontSize) => void

  muteMedia: boolean
  updateMuteMedia: (mute: boolean) => void

  sidebarCollapse: boolean
  updateSidebarCollapse: (collapse: boolean) => void

  quickReaction: boolean
  updateQuickReaction: (enable: boolean) => void

  quickReactionEmoji: string | TEmoji
  updateQuickReactionEmoji: (emoji: string | TEmoji) => void

  allowInsecureConnection: boolean
  updateAllowInsecureConnection: (allow: boolean) => void

  enableTorMode: boolean
  updateEnableTorMode: (enable: boolean) => void
}

const UserPreferencesContext = createContext<TUserPreferencesContext | undefined>(undefined)

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext)
  if (!context) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider')
  }
  return context
}

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [notificationListStyle, setNotificationListStyle] = useState(
    storage.getNotificationListStyle()
  )
  const [font, setFont] = useState<TFont>(storage.getFont())
  const [fontSize, setFontSize] = useState<TFontSize>(storage.getFontSize())
  const [muteMedia, setMuteMedia] = useState(true)
  const [sidebarCollapse, setSidebarCollapse] = useState(storage.getSidebarCollapse())
  const [quickReaction, setQuickReaction] = useState(storage.getQuickReaction())
  const [quickReactionEmoji, setQuickReactionEmoji] = useState(storage.getQuickReactionEmoji())

  const [allowInsecureConnection, setAllowInsecureConnection] = useState(
    storage.getAllowInsecureConnection()
  )
  // Auto-enable Tor mode when Tor Browser is detected
  const [enableTorMode, setEnableTorMode] = useState(storage.getEnableTorMode() || isTorBrowser())

  const updateNotificationListStyle = (style: TNotificationStyle) => {
    setNotificationListStyle(style)
    storage.setNotificationListStyle(style)
  }

  const updateSidebarCollapse = (collapse: boolean) => {
    setSidebarCollapse(collapse)
    storage.setSidebarCollapse(collapse)
  }

  const updateQuickReaction = (enable: boolean) => {
    setQuickReaction(enable)
    storage.setQuickReaction(enable)
  }

  const updateQuickReactionEmoji = (emoji: string | TEmoji) => {
    setQuickReactionEmoji(emoji)
    storage.setQuickReactionEmoji(emoji)
  }

  const updateAllowInsecureConnection = (allow: boolean) => {
    setAllowInsecureConnection(allow)
    storage.setAllowInsecureConnection(allow)
  }

  const updateEnableTorMode = (enable: boolean) => {
    setEnableTorMode(enable)
    storage.setEnableTorMode(enable)
  }

  const updateFont = (font: TFont) => {
    setFont(font)
    storage.setFont(font)
    applyFont(font)
  }

  const updateFontSize = (fontSize: TFontSize) => {
    setFontSize(fontSize)
    storage.setFontSize(fontSize)
    const fontSizes: Record<TFontSize, string> = {
      default: '100%',
      medium: '112.5%',
      large: '125%'
    }
    document.documentElement.style.setProperty('font-size', fontSizes[fontSize])
  }

  useEffect(() => {
    updateFont(font)
    updateFontSize(fontSize)
  }, [])

  return (
    <UserPreferencesContext.Provider
      value={{
        notificationListStyle,
        updateNotificationListStyle,
        font,
        updateFont,
        fontSize,
        updateFontSize,
        muteMedia,
        updateMuteMedia: setMuteMedia,
        sidebarCollapse,
        updateSidebarCollapse,
        quickReaction,
        updateQuickReaction,
        quickReactionEmoji,
        updateQuickReactionEmoji,
        allowInsecureConnection,
        updateAllowInsecureConnection,
        enableTorMode,
        updateEnableTorMode
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  )
}
