import SecondaryPageLayout from '@/layouts/SecondaryPageLayout'
import { StorageKey } from '@/constants'
import { Pickaxe } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import MediaUploadServiceSetting from './MediaUploadServiceSetting'

const DEFAULT_POST_DIFFICULTY = 16
const DEFAULT_REACTION_DIFFICULTY = 12

const PostSettingsPage = forwardRef(({ index }: { index?: number }, ref) => {
  const { t } = useTranslation()
  const [postDifficulty, setPostDifficulty] = useState(DEFAULT_POST_DIFFICULTY)
  const [reactionDifficulty, setReactionDifficulty] = useState(DEFAULT_REACTION_DIFFICULTY)

  useEffect(() => {
    const cachedPost = localStorage.getItem(StorageKey.POW_POST_DIFFICULTY)
    setPostDifficulty(cachedPost ? parseInt(cachedPost, 10) : DEFAULT_POST_DIFFICULTY)
    const cachedReaction = localStorage.getItem(StorageKey.POW_REACTION_DIFFICULTY)
    setReactionDifficulty(cachedReaction ? parseInt(cachedReaction, 10) : DEFAULT_REACTION_DIFFICULTY)
  }, [])

  const updatePostDifficulty = (value: number) => {
    setPostDifficulty(value)
    localStorage.setItem(StorageKey.POW_POST_DIFFICULTY, value.toString())
  }

  const updateReactionDifficulty = (value: number) => {
    setReactionDifficulty(value)
    localStorage.setItem(StorageKey.POW_REACTION_DIFFICULTY, value.toString())
  }

  return (
    <SecondaryPageLayout ref={ref} index={index} title={t('Post settings')}>
      <div className="space-y-4 px-4 pt-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Pickaxe className="size-4" />
            <h3 className="text-sm font-medium">{t('Proof of Work')}</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">
                  {t('Posts & comments difficulty')}
                </label>
                <span className="text-sm font-mono">{postDifficulty} bits</span>
              </div>
              <input
                type="range"
                min={0}
                max={32}
                step={4}
                value={postDifficulty}
                onChange={(e) => updatePostDifficulty(parseInt(e.target.value, 10))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('Off')}</span>
                <span>{t('Strong')}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">
                  {t('Likes & reactions difficulty')}
                </label>
                <span className="text-sm font-mono">{reactionDifficulty} bits</span>
              </div>
              <input
                type="range"
                min={0}
                max={32}
                step={4}
                value={reactionDifficulty}
                onChange={(e) => updateReactionDifficulty(parseInt(e.target.value, 10))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('Off')}</span>
                <span>{t('Strong')}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t" />
        <MediaUploadServiceSetting />
      </div>
    </SecondaryPageLayout>
  )
})
PostSettingsPage.displayName = 'PostSettingsPage'
export default PostSettingsPage
