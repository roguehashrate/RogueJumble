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

const hslToHex = (hsl: string): string => {
  const m = hsl.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/)
  if (!m) return '#000000'
  const h = (parseFloat(m[1]) % 360 + 360) % 360
  const s = Math.min(100, Math.max(0, parseFloat(m[2]))) / 100
  const l = Math.min(100, Math.max(0, parseFloat(m[3]))) / 100

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const r = hue2rgb(p, q, h / 360 + 1 / 3)
  const g = hue2rgb(p, q, h / 360)
  const b = hue2rgb(p, q, h / 360 - 1 / 3)
  const toHex = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const applyTheme = (themeName: TThemeName) => {
  const root = window.document.documentElement
  const theme = THEME_COLORS[themeName]
  if (!theme) return
  const colors = theme.colors
  const style = theme.style

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

  // Style variables
  root.style.setProperty('--theme-radius', style.radius)
  root.style.setProperty('--theme-scanline', style.scanlineOpacity)
  root.style.setProperty('--theme-bg-gradient', style.bgGradient)
  root.style.setProperty('--theme-text-shadow', style.textShadow)
  root.style.setProperty('--theme-font', style.fontFamily)
  root.style.setProperty('--theme-mesh-opacity', style.meshOpacity)
  root.style.setProperty('--theme-card-border-width', style.cardBorderWidth)

  root.classList.remove(
    'light',
    'dark',
    'ember',
    'emerald',
    'sapphire',
    'amethyst',
    'hackerman',
    'phosphor',
    'midnight'
  )
  root.classList.add(themeName)

  // Keep the PWA theme-color / status-bar tint in sync with the active theme
  const themeColor = hslToHex(colors.background)
  window.document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute('content', themeColor))
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeSetting, setThemeSettingState] = useState<TThemeName>(() => {
    const stored = localStorage.getItem(StorageKey.THEME_SETTING)
    return stored && stored in THEME_COLORS ? (stored as TThemeName) : 'sapphire'
  })
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
