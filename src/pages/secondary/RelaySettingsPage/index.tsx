import DefaultRelaysSetting from '@/components/DefaultRelaysSetting'
import FavoriteRelaysSetting from '@/components/FavoriteRelaysSetting'
import MailboxSetting from '@/components/MailboxSetting'
import SearchRelaysSetting from '@/components/SearchRelaysSetting'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import SecondaryPageLayout from '@/layouts/SecondaryPageLayout'
import { forwardRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import storage from '@/services/local-storage.service'

const RelaySettingsPage = forwardRef(({ index }: { index?: number }, ref) => {
  const { t } = useTranslation()
  const [tabValue, setTabValue] = useState('favorite-relays')
  const [filterOutOnionRelays, setFilterOutOnionRelays] = useState(
    storage.getFilterOutOnionRelays()
  )

  useEffect(() => {
    switch (window.location.hash) {
      case '#mailbox':
        setTabValue('mailbox')
        break
      case '#favorite-relays':
        setTabValue('favorite-relays')
        break
    }
  }, [])

  return (
    <SecondaryPageLayout ref={ref} index={index} title={t('Relay settings')}>
      <div className="space-y-4 px-4 py-3">
        <Tabs value={tabValue} onValueChange={setTabValue} className="space-y-4">
          <TabsList>
            <TabsTrigger value="favorite-relays">{t('Favorite Relays')}</TabsTrigger>
            <TabsTrigger value="mailbox">{t('Read & Write Relays')}</TabsTrigger>
          </TabsList>
          <TabsContent value="favorite-relays">
            <FavoriteRelaysSetting />
          </TabsContent>
          <TabsContent value="mailbox">
            <MailboxSetting />
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />
        <SectionHeader>{t('Relay filtering')}</SectionHeader>
        <div className="flex min-h-9 items-center justify-between">
          <label className="text-base font-normal">{t('Filter out onion relays')}</label>
          <Switch
            checked={filterOutOnionRelays}
            onCheckedChange={(checked) => {
              storage.setFilterOutOnionRelays(checked)
              setFilterOutOnionRelays(checked)
            }}
          />
        </div>

        <Separator className="my-4" />
        <DefaultRelaysSetting />
        <div className="pt-4">
          <SearchRelaysSetting />
        </div>
      </div>
    </SecondaryPageLayout>
  )
})
RelaySettingsPage.displayName = 'RelaySettingsPage'

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  )
}

export default RelaySettingsPage
