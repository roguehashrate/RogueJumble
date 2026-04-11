import { StorageKey, THEME_COLORS, TThemeName } from '@/constants'
import storage from '@/services/local-storage.service'
import { TTheme } from '@/types'
import { createContext, useContext, useEffect, useState } from 'react'

type ThemeProviderState = {
  theme: TTheme
  themeSetting: TThemeName
  setThemeSetting: (themeSetting: TThemeName) => void
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined)

const applyTheme = (themeName: TThemeName) => {
  const root = window.document.documentElement
  const theme = THEME_COLORS[themeName]
  const colors = theme.colors

  root.style.setProperty('--background', colors.background)
  root.style.setProperty('--foreground', colors.foreground)
  root.style.setProperty('--card', colors.card)
  root.style.setProperty('--card-foreground', colors.cardForeground)
  root.style.setProperty('--popover', colors.popover)
  root.style.setProperty('--popover-foreground', colors.popoverForeground)
  root.style.setProperty('--primary', colors.primary)
  root.style.setProperty('--primary-hover', colors.primaryHover)
  root.style.setProperty('--primary-foreground', colors.primaryForeground)
  root.style.setProperty('--secondary', colors.secondary)
  root.style.setProperty('--secondary-foreground', colors.secondaryForeground)
  root.style.setProperty('--muted', colors.muted)
  root.style.setProperty('--muted-foreground', colors.mutedForeground)
  root.style.setProperty('--accent', colors.accent)
  root.style.setProperty('--accent-foreground', colors.accentForeground)
  root.style.setProperty('--destructive', colors.destructive)
  root.style.setProperty('--destructive-foreground', colors.destructiveForeground)
  root.style.setProperty('--border', colors.border)
  root.style.setProperty('--input', colors.input)
  root.style.setProperty('--ring', colors.ring)
  root.style.setProperty('--surface-background', colors.surfaceBackground)
  root.style.setProperty('--zap', colors.zap)
  root.style.setProperty('--repost', colors.repost)
  root.style.setProperty('--bookmark', colors.bookmark)
  root.style.setProperty('--comment', colors.comment)
  root.style.setProperty('--note-hover', colors.noteHover)

  root.classList.remove('light', 'dark', 'rogue', 'emerald', 'sapphire', 'amethyst', 'ditto')
  root.classList.add(themeName)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeSetting, setThemeSettingState] = useState<TThemeName>(
    (localStorage.getItem(StorageKey.THEME_SETTING) as TThemeName) ?? 'rogue'
  )
  const [theme, setTheme] = useState<TTheme>(themeSetting)

  useEffect(() => {
    applyTheme(themeSetting)
    setTheme(themeSetting)
  }, [themeSetting])

  const updateThemeSetting = (newTheme: TThemeName) => {
    storage.setThemeSetting(newTheme)
    setThemeSettingState(newTheme)
  }

  return (
    <ThemeProviderContext.Provider
      value={{
        theme,
        themeSetting,
        setThemeSetting: updateThemeSetting
      }}
    >
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider')

  return context
}
