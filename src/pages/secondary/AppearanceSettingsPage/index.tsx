import { Label } from '@/components/ui/label'
import { FONT, FONT_SIZE, THEME_COLORS, TThemeName } from '@/constants'
import SecondaryPageLayout from '@/layouts/SecondaryPageLayout'
import { cn } from '@/lib/utils'
import { useScreenSize } from '@/providers/ScreenSizeProvider'
import { useTheme } from '@/providers/ThemeProvider'
import { useUserPreferences } from '@/providers/UserPreferencesProvider'
import { ChevronDown, Columns2, LayoutList, List, PanelLeft, Type } from 'lucide-react'
import { forwardRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

const LAYOUTS = [
  { key: false, label: 'Two-column', icon: <Columns2 className="size-5" /> },
  { key: true, label: 'Single-column', icon: <PanelLeft className="size-5" /> }
] as const

const NOTIFICATION_STYLES = [
  { key: 'detailed', label: 'Detailed', icon: <LayoutList className="size-5" /> },
  { key: 'compact', label: 'Compact', icon: <List className="size-5" /> }
] as const

const FONTS = [
  { key: FONT.DEFAULT, label: 'Default', preview: <Type className="size-5" /> },
  {
    key: FONT.MONOSPACE,
    label: 'JetBrains Mono',
    preview: <span className="size-5 font-['JetBrains_Mono']">Aa</span>
  },
  {
    key: FONT.DYSLEXIC,
    label: 'Dyslexic',
    preview: <span className="size-5 font-['Comic_Neue']">Aa</span>
  },
  {
    key: FONT.SOURCESANS,
    label: 'Space Grotesk',
    preview: <span className="size-5 font-['Space_Grotesk']">Aa</span>
  }
] as const

const FONT_SIZES = [
  { key: FONT_SIZE.DEFAULT, label: '1', preview: <span className="text-xs">Aa</span> },
  { key: FONT_SIZE.MEDIUM, label: '2', preview: <span className="text-sm">Aa</span> },
  { key: FONT_SIZE.LARGE, label: '3', preview: <span className="text-base">Aa</span> }
] as const

const AppearanceSettingsPage = forwardRef(({ index }: { index?: number }, ref) => {
  const { t } = useTranslation()
  const { isSmallScreen } = useScreenSize()
  const { themeSetting, setThemeSetting } = useTheme()
  const {
    enableSingleColumnLayout,
    updateEnableSingleColumnLayout,
    notificationListStyle,
    updateNotificationListStyle,
    font,
    updateFont,
    fontSize,
    updateFontSize
  } = useUserPreferences()

  const [themesCollapsed, setThemesCollapsed] = useState(false)

  const themeEntries = Object.entries(THEME_COLORS) as [
    TThemeName,
    (typeof THEME_COLORS)[TThemeName]
  ][]

  return (
    <SecondaryPageLayout ref={ref} index={index} title={t('Appearance')}>
      <div className="my-3 space-y-4">
        <div className="flex flex-col gap-2 px-4">
          <button
            onClick={() => setThemesCollapsed(!themesCollapsed)}
            className="flex w-full items-center justify-between text-base font-medium transition-colors hover:text-foreground/80"
          >
            <Label className="text-base">{t('Theme')}</Label>
            <ChevronDown
              className={cn(
                'size-4 transition-transform duration-200',
                themesCollapsed ? 'rotate-0' : 'rotate-180'
              )}
            />
          </button>
          {!themesCollapsed && (
            <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-3">
              {themeEntries.map(([key, theme]) => (
                <OptionButton
                  key={key}
                  isSelected={themeSetting === key}
                  icon={
                    <div className="flex h-8 w-8 overflow-hidden rounded-full">
                      <div
                        className="h-full w-1/2"
                        style={{ background: `hsl(${theme.colors.background})` }}
                      />
                      <div
                        className="h-full w-1/2"
                        style={{ background: `hsl(${theme.colors.primary})` }}
                      />
                    </div>
                  }
                  label={t(theme.name)}
                  onClick={() => setThemeSetting(key)}
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 px-4">
          <Label className="text-base">{t('Font')}</Label>
          <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-4">
            {FONTS.map(({ key, label, preview }) => (
              <OptionButton
                key={key}
                isSelected={font === key}
                icon={preview}
                label={t(label)}
                onClick={() => updateFont(key)}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 px-4">
          <Label className="text-base">{t('Font size')}</Label>
          <div className="grid w-full grid-cols-3 gap-4">
            {FONT_SIZES.map(({ key, label, preview }) => (
              <OptionButton
                key={key}
                isSelected={fontSize === key}
                icon={preview}
                label={label}
                onClick={() => updateFontSize(key)}
              />
            ))}
          </div>
        </div>
        {!isSmallScreen && (
          <div className="flex flex-col gap-2 px-4">
            <Label className="text-base">{t('Layout')}</Label>
            <div className="grid w-full grid-cols-2 gap-4">
              {LAYOUTS.map(({ key, label, icon }) => (
                <OptionButton
                  key={key.toString()}
                  isSelected={enableSingleColumnLayout === key}
                  icon={icon}
                  label={t(label)}
                  onClick={() => updateEnableSingleColumnLayout(key)}
                />
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2 px-4">
          <Label className="text-base">{t('Notification list style')}</Label>
          <div className="grid w-full grid-cols-2 gap-4">
            {NOTIFICATION_STYLES.map(({ key, label, icon }) => (
              <OptionButton
                key={key}
                isSelected={notificationListStyle === key}
                icon={icon}
                label={t(label)}
                onClick={() => updateNotificationListStyle(key)}
              />
            ))}
          </div>
        </div>
      </div>
    </SecondaryPageLayout>
  )
})
AppearanceSettingsPage.displayName = 'AppearanceSettingsPage'
export default AppearanceSettingsPage

const OptionButton = ({
  isSelected,
  onClick,
  icon,
  label
}: {
  isSelected: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border-2 py-4 transition-all',
        isSelected ? 'border-primary' : 'border-border hover:border-muted-foreground/40'
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center">{icon}</div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}
