import { Label } from '@/components/ui/label'
import { THEME_COLORS, TThemeName } from '@/constants'
import SecondaryPageLayout from '@/layouts/SecondaryPageLayout'
import { cn } from '@/lib/utils'
import { useScreenSize } from '@/providers/ScreenSizeProvider'
import { useTheme } from '@/providers/ThemeProvider'
import { useUserPreferences } from '@/providers/UserPreferencesProvider'
import { Columns2, LayoutList, List, PanelLeft } from 'lucide-react'
import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'

const LAYOUTS = [
  { key: false, label: 'Two-column', icon: <Columns2 className="size-5" /> },
  { key: true, label: 'Single-column', icon: <PanelLeft className="size-5" /> }
] as const

const NOTIFICATION_STYLES = [
  { key: 'detailed', label: 'Detailed', icon: <LayoutList className="size-5" /> },
  { key: 'compact', label: 'Compact', icon: <List className="size-5" /> }
] as const

const AppearanceSettingsPage = forwardRef(({ index }: { index?: number }, ref) => {
  const { t } = useTranslation()
  const { isSmallScreen } = useScreenSize()
  const { themeSetting, setThemeSetting } = useTheme()
  const {
    enableSingleColumnLayout,
    updateEnableSingleColumnLayout,
    notificationListStyle,
    updateNotificationListStyle
  } = useUserPreferences()

  const themeEntries = Object.entries(THEME_COLORS) as [
    TThemeName,
    (typeof THEME_COLORS)[TThemeName]
  ][]

  return (
    <SecondaryPageLayout ref={ref} index={index} title={t('Appearance')}>
      <div className="my-3 space-y-4">
        <div className="flex flex-col gap-2 px-4">
          <Label className="text-base">{t('Theme')}</Label>
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
