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
import { isTouchDevice } from '@/lib/utils'

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
    <div className="py-2">
      {KIND_OPTIONS.map(({ key, icon: KindIcon, label }) => (
        <div
          key={key}
          className="clickable flex cursor-pointer items-center gap-3 px-4 py-3 text-sm"
          onClick={() => {
            onChange(key)
            setOpen(false)
          }}
        >
          <KindIcon className="size-4" />
          {t(label)} (kind:{key === 'text' ? '1' : key === 'picture' ? '20' : key === 'video' ? '21' : key === 'shortVideo' ? '22' : key === 'poll' ? '1068' : key === 'longForm' ? '30023' : '34551'})
        </div>
      ))}
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
          <DrawerContent>
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
          <DropdownMenuContent align="end">
            <KindList />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  )
}
