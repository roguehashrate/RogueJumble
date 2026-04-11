import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Plus } from 'lucide-react'
import { communityService, TCommunityInfo } from '@/services/community.service'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { isTouchDevice } from '@/lib/utils'

export default function CommunityPicker({
  value,
  onChange,
  onCreateNew
}: {
  value: string
  onChange: (coordinate: string, info: TCommunityInfo) => void
  onCreateNew?: () => void
}) {
  const { t } = useTranslation()
  const isTouch = useMemo(() => isTouchDevice(), [])
  const [open, setOpen] = useState(false)
  const joinedCommunities = communityService.getJoinedCommunities()

  const selectedInfo = joinedCommunities.find((c) => c.coordinate === value)

  const CommunityList = () => (
    <div className="py-2">
      <div className="px-4 pb-2 text-sm font-semibold text-muted-foreground">
        {t('Post to community')}
      </div>
      {joinedCommunities.length === 0 ? (
        <div className="px-4 py-4 text-sm text-muted-foreground">
          {t('You haven\'t joined any communities yet.')}
        </div>
      ) : (
        joinedCommunities.map((info) => (
          <div
            key={info.coordinate}
            className="clickable flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
            onClick={() => {
              onChange(info.coordinate, info)
              setOpen(false)
            }}
          >
            {info.image ? (
              <img
                src={info.image}
                alt=""
                className="size-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {info.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 truncate">
              <div className="truncate text-sm font-medium">{info.name}</div>
            </div>
            {value === info.coordinate && (
              <div className="size-2 shrink-0 rounded-full bg-primary" />
            )}
          </div>
        ))
      )}
      {onCreateNew && (
        <div
          className="clickable flex cursor-pointer items-center gap-3 px-4 py-3 text-sm text-primary transition-colors hover:bg-primary/5"
          onClick={() => {
            onCreateNew()
            setOpen(false)
          }}
        >
          <Plus className="size-4" />
          {t('Create a new community')}
        </div>
      )}
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
            {selectedInfo ? (
              <>
                <span className="max-w-[120px] truncate">{selectedInfo.name}</span>
              </>
            ) : (
              <>{t('Community')}</>
            )}
            <ChevronDown className="size-3" />
          </Button>
          <DrawerContent>
            <CommunityList />
          </DrawerContent>
        </Drawer>
      ) : (
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              {selectedInfo ? (
                <span className="max-w-[120px] truncate">{selectedInfo.name}</span>
              ) : (
                <>{t('Community')}</>
              )}
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[300px] max-w-xs overflow-y-auto">
            <CommunityList />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  )
}
