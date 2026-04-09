import storage from '@/services/local-storage.service'
import { TEmoji, TFont, TFontSize, TNotificationStyle } from '@/types'
import { createContext, useContext, useEffect, useState } from 'react'
import { useScreenSize } from './ScreenSizeProvider'

type TUserPreferencesContext = {
  notificationListStyle: TNotificationStyle
  updateNotificationListStyle: (style: TNotificationStyle) => void

  font: TFont
  updateFont: (font: TFont) => void

  fontSize: TFontSize
  updateFontSize: (fontSize: TFontSize) => void

  advancedMode: boolean
  updateAdvancedMode: (enabled: boolean) => void

  muteMedia: boolean
  updateMuteMedia: (mute: boolean) => void

  sidebarCollapse: boolean
  updateSidebarCollapse: (collapse: boolean) => void

  enableSingleColumnLayout: boolean
  updateEnableSingleColumnLayout: (enable: boolean) => void

  quickReaction: boolean
  updateQuickReaction: (enable: boolean) => void

  quickReactionEmoji: string | TEmoji
  updateQuickReactionEmoji: (emoji: string | TEmoji) => void

  allowInsecureConnection: boolean
  updateAllowInsecureConnection: (allow: boolean) => void
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
  const { isSmallScreen } = useScreenSize()
  const [notificationListStyle, setNotificationListStyle] = useState(
    storage.getNotificationListStyle()
  )
  const [font, setFont] = useState<TFont>(storage.getFont())
  const [fontSize, setFontSize] = useState<TFontSize>(storage.getFontSize())
  const [advancedMode, setAdvancedMode] = useState<boolean>(storage.getAdvancedMode())
  const [muteMedia, setMuteMedia] = useState(true)
  const [sidebarCollapse, setSidebarCollapse] = useState(storage.getSidebarCollapse())
  const [enableSingleColumnLayout, setEnableSingleColumnLayout] = useState(
    storage.getEnableSingleColumnLayout()
  )
  const [quickReaction, setQuickReaction] = useState(storage.getQuickReaction())
  const [quickReactionEmoji, setQuickReactionEmoji] = useState(storage.getQuickReactionEmoji())

  const [allowInsecureConnection, setAllowInsecureConnection] = useState(
    storage.getAllowInsecureConnection()
  )

  useEffect(() => {
    if (!isSmallScreen && enableSingleColumnLayout) {
      document.documentElement.style.setProperty('overflow-y', 'scroll')
    } else {
      document.documentElement.style.removeProperty('overflow-y')
    }
  }, [enableSingleColumnLayout, isSmallScreen])

  const updateNotificationListStyle = (style: TNotificationStyle) => {
    setNotificationListStyle(style)
    storage.setNotificationListStyle(style)
  }

  const updateSidebarCollapse = (collapse: boolean) => {
    setSidebarCollapse(collapse)
    storage.setSidebarCollapse(collapse)
  }

  const updateEnableSingleColumnLayout = (enable: boolean) => {
    setEnableSingleColumnLayout(enable)
    storage.setEnableSingleColumnLayout(enable)
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

  const updateFont = (font: TFont) => {
    setFont(font)
    storage.setFont(font)
    const root = document.documentElement
    root.classList.remove('font-default', 'font-monospace', 'font-opendyslexic', 'font-sourcesans')
    root.classList.add(`font-${font}`)
    // Also set inline style for highest specificity
    const fontFamilies: Record<TFont, string> = {
      default:
        'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      monospace:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      opendyslexic: '"OpenDyslexicRegular", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      sourcesans:
        '"Nunito", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }
    root.style.setProperty('font-family', fontFamilies[font], 'important')
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

  const updateAdvancedMode = (enabled: boolean) => {
    setAdvancedMode(enabled)
    storage.setAdvancedMode(enabled)
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
        advancedMode,
        updateAdvancedMode,
        muteMedia,
        updateMuteMedia: setMuteMedia,
        sidebarCollapse,
        updateSidebarCollapse,
        enableSingleColumnLayout: isSmallScreen ? true : enableSingleColumnLayout,
        updateEnableSingleColumnLayout,
        quickReaction,
        updateQuickReaction,
        quickReactionEmoji,
        updateQuickReactionEmoji,
        allowInsecureConnection,
        updateAllowInsecureConnection
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  )
}
