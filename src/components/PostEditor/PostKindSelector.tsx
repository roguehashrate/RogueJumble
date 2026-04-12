import { ChevronDown, FileText, ImageUp, ListChecks, PencilLine, Tv, Video, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { cn, isTouchDevice } from '@/lib/utils'

type TPostKind = 'text' | 'picture' | 'video' | 'shortVideo' | 'poll' | 'communityPost' | 'longForm'

const KIND_OPTIONS: { key: TPostKind; icon: React.ComponentType<{ className?: string }>; label: string; shortLabel: string }[] = [
  { key: 'text', icon: PencilLine, label: 'Text Post', shortLabel: 'Text' },
  { key: 'picture', icon: ImageUp, label: 'Picture Post', shortLabel: 'Picture' },
  { key: 'video', icon: Tv, label: 'Video Post', shortLabel: 'Video' },
  { key: 'shortVideo', icon: Video, label: 'Short Video Post', shortLabel: 'Short Video' },
  { key: 'poll', icon: ListChecks, label: 'Poll', shortLabel: 'Poll' },
  { key: 'longForm', icon: FileText, label: 'Long Form Article', shortLabel: 'Long Form' },
  { key: 'communityPost', icon: Users, label: 'Community Post', shortLabel: 'Community' }
]

export default function PostKindSelector({
  value,
  onChange
}: {
  value: TPostKind
  onChange: (kind: TPostKind) => void
}) {
  const { t } = useTranslation()
  const isTouch = useMemo(() => isTouchDevice(), [])
  const [open, setOpen] = useState(false)

  const current = KIND_OPTIONS.find((k) => k.key === value)
  const Icon = current?.icon ?? PencilLine

  const KindList = () => (
    <div className="space-y-1.5 p-2">
      {KIND_OPTIONS.map(({ key, icon: KindIcon, label }) => {
        const isActive = key === value
        return (
          <div
            key={key}
            className={cn(
              'group relative w-full rounded-xl border px-3.5 py-3 transition-colors duration-200',
              isActive
                ? 'border-primary/40 bg-primary/5'
                : 'clickable border-border/20 hover:border-primary/30 hover:bg-muted/20'
            )}
            onClick={() => {
              onChange(key)
              setOpen(false)
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex size-6 shrink-0 items-center justify-center">
                <KindIcon className="size-5" />
              </div>
              <div className="flex-1 font-medium">{t(label)}</div>
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <>
      {isTouch ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => setOpen(true)}
          >
            <Icon className="size-3.5" />
            {t(current?.shortLabel ?? 'Text')}
            <ChevronDown className="size-3" />
          </Button>
          <DrawerContent className="border-t border-border/20 bg-card/90 backdrop-blur-xl">
            <div className="px-4 py-3 text-sm font-semibold">{t('Post Type')}</div>
            <KindList />
          </DrawerContent>
        </Drawer>
      ) : (
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              <Icon className="size-3.5" />
              {t(current?.shortLabel ?? 'Text')}
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-border/20">
            <KindList />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  )
}
