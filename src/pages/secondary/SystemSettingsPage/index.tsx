import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { DEFAULT_FAVICON_URL_TEMPLATE } from '@/constants'
import SecondaryPageLayout from '@/layouts/SecondaryPageLayout'
import { useContentPolicy } from '@/providers/ContentPolicyProvider'
import { useUserPreferences } from '@/providers/UserPreferencesProvider'
import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'

const SystemSettingsPage = forwardRef(({ index }: { index?: number }, ref) => {
  const { t } = useTranslation()
  const { faviconUrlTemplate, setFaviconUrlTemplate } = useContentPolicy()
  const {
    allowInsecureConnection,
    updateAllowInsecureConnection,
    enableTorMode,
    updateEnableTorMode
  } = useUserPreferences()

  return (
    <SecondaryPageLayout ref={ref} index={index} title={t('System')}>
      <div className="mt-3 space-y-4">
        <div className="space-y-2 px-4">
          <Label htmlFor="favicon-url" className="text-base font-normal">
            {t('Favicon URL')}
          </Label>
          <Input
            id="favicon-url"
            type="text"
            value={faviconUrlTemplate}
            onChange={(e) => setFaviconUrlTemplate(e.target.value)}
            placeholder={DEFAULT_FAVICON_URL_TEMPLATE}
          />
        </div>
        <div className="flex min-h-9 items-center justify-between px-4">
          <Label htmlFor="allow-insecure-connection" className="text-base font-normal">
            <div>{t('Allow insecure connections')}</div>
            <div className="text-muted-foreground">
              {t('Allow insecure connections description')}
            </div>
          </Label>
          <Switch
            id="allow-insecure-connection"
            checked={allowInsecureConnection}
            onCheckedChange={updateAllowInsecureConnection}
          />
        </div>
        <div className="flex min-h-9 items-center justify-between px-4">
          <Label htmlFor="enable-tor-mode" className="text-base font-normal">
            <div>{t('Enable Tor mode')}</div>
            <div className="text-muted-foreground">{t('Enable Tor mode description')}</div>
          </Label>
          <Switch
            id="enable-tor-mode"
            checked={enableTorMode}
            onCheckedChange={updateEnableTorMode}
          />
        </div>
      </div>
    </SecondaryPageLayout>
  )
})
SystemSettingsPage.displayName = 'SystemSettingsPage'
export default SystemSettingsPage
