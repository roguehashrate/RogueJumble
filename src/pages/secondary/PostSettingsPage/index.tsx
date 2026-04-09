import SecondaryPageLayout from '@/layouts/SecondaryPageLayout'
import { StorageKey } from '@/constants'
import { Pickaxe } from 'lucide-react'
import { forwardRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUserPreferences } from '@/providers/UserPreferencesProvider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ChevronDown } from 'lucide-react'
import MediaUploadServiceSetting from './MediaUploadServiceSetting'

const DEFAULT_POST_DIFFICULTY = 16
const DEFAULT_REACTION_DIFFICULTY = 12

function PowSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const percentage = (value / 32) * 100
  return (
    <div className="relative w-full">
      <div className="relative flex h-6 items-center">
        <input
          type="range"
          min={0}
          max={32}
          step={4}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="absolute z-10 h-2 w-full cursor-pointer appearance-none bg-transparent focus:outline-none [&::-moz-range-thumb]:z-20 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:shadow-primary/40 [&::-webkit-slider-thumb]:z-20 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-primary/40 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
        />
        <div className="pointer-events-none absolute h-2 w-full rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-150"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}

const PostSettingsPage = forwardRef(({ index }: { index?: number }, ref) => {
  const { t } = useTranslation()
  const { advancedMode, updateAdvancedMode } = useUserPreferences()
  const [postDifficulty, setPostDifficulty] = useState(DEFAULT_POST_DIFFICULTY)
  const [reactionDifficulty, setReactionDifficulty] = useState(DEFAULT_REACTION_DIFFICULTY)
  const [advancedExpanded, setAdvancedExpanded] = useState(false)

  useEffect(() => {
    const cachedPost = localStorage.getItem(StorageKey.POW_POST_DIFFICULTY)
    setPostDifficulty(cachedPost ? parseInt(cachedPost, 10) : DEFAULT_POST_DIFFICULTY)
    const cachedReaction = localStorage.getItem(StorageKey.POW_REACTION_DIFFICULTY)
    setReactionDifficulty(
      cachedReaction ? parseInt(cachedReaction, 10) : DEFAULT_REACTION_DIFFICULTY
    )
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
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Pickaxe className="size-4 text-primary" />
            <h3 className="text-sm font-medium">{t('Proof of Work')}</h3>
          </div>
          <div className="space-y-5">
            <div className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{t('Posts & comments difficulty')}</label>
                <span className="font-mono text-xs text-muted-foreground">
                  {postDifficulty} bits
                </span>
              </div>
              <PowSlider value={postDifficulty} onChange={updatePostDifficulty} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('Off')}</span>
                <span>{t('Strong')}</span>
              </div>
            </div>
            <div className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{t('Reactions difficulty')}</label>
                <span className="font-mono text-xs text-muted-foreground">
                  {reactionDifficulty} bits
                </span>
              </div>
              <PowSlider value={reactionDifficulty} onChange={updateReactionDifficulty} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('Off')}</span>
                <span>{t('Strong')}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t" />
        <div className="space-y-2">
          <button
            className="flex w-full items-center justify-between"
            onClick={() => setAdvancedExpanded(!advancedExpanded)}
          >
            <span className="text-base font-medium">{t('Advanced')}</span>
            <ChevronDown
              className={`size-5 text-muted-foreground transition-transform ${
                advancedExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>
          {advancedExpanded && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between rounded-lg border bg-card p-4">
                <div className="space-y-1">
                  <Label className="text-sm">{t('Post type selector')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('Shows post kind dropdown when creating posts')}
                  </p>
                </div>
                <Switch checked={advancedMode} onCheckedChange={updateAdvancedMode} />
              </div>
            </div>
          )}
        </div>
        <div className="border-t" />
        <MediaUploadServiceSetting />
      </div>
    </SecondaryPageLayout>
  )
})
PostSettingsPage.displayName = 'PostSettingsPage'
export default PostSettingsPage
