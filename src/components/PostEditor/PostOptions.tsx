import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { StorageKey } from '@/constants'
import { Dispatch, SetStateAction, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function PostOptions({
  posting,
  addClientTag,
  setAddClientTag,
  isNsfw,
  setIsNsfw,
  minPow,
  setMinPow
}: {
  posting: boolean
  addClientTag: boolean
  setAddClientTag: Dispatch<SetStateAction<boolean>>
  isNsfw: boolean
  setIsNsfw: Dispatch<SetStateAction<boolean>>
  minPow: number
  setMinPow: Dispatch<SetStateAction<number>>
}) {
  const { t } = useTranslation()

  useEffect(() => {
    const cached = window.localStorage.getItem(StorageKey.ADD_CLIENT_TAG)
    if (cached === null) {
      window.localStorage.setItem(StorageKey.ADD_CLIENT_TAG, 'true')
      setAddClientTag(true)
    } else {
      setAddClientTag(cached === 'true')
    }
  }, [])

  const poWEnabled = minPow > 0

  const onAddClientTagChange = (checked: boolean) => {
    setAddClientTag(checked)
    window.localStorage.setItem(StorageKey.ADD_CLIENT_TAG, checked.toString())
  }

  const onNsfwChange = (checked: boolean) => {
    setIsNsfw(checked)
  }

  const onPoWToggle = (checked: boolean) => {
    const difficulty = window.localStorage.getItem(StorageKey.POW_POST_DIFFICULTY)
    setMinPow(checked ? (difficulty ? parseInt(difficulty, 10) : 16) : 0)
    window.localStorage.setItem(StorageKey.POW_ENABLED, checked.toString())
  }

  useEffect(() => {
    const cached = window.localStorage.getItem(StorageKey.POW_ENABLED)
    if (cached === null) {
      window.localStorage.setItem(StorageKey.POW_ENABLED, 'true')
      setMinPow(16)
    }
  }, [])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Label htmlFor="add-client-tag">{t('Add client tag')}</Label>
          <Switch
            id="add-client-tag"
            checked={addClientTag}
            onCheckedChange={onAddClientTagChange}
            disabled={posting}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {t('Show others this was sent via Jumble')}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Label htmlFor="add-nsfw-tag">{t('NSFW')}</Label>
        <Switch
          id="add-nsfw-tag"
          checked={isNsfw}
          onCheckedChange={onNsfwChange}
          disabled={posting}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Label htmlFor="pow-toggle">{t('Proof of Work')}</Label>
        <Switch
          id="pow-toggle"
          checked={poWEnabled}
          onCheckedChange={onPoWToggle}
          disabled={posting}
        />
      </div>
    </div>
  )
}
