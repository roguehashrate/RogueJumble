import { useSecondaryPage } from '@/PageManager'
import { cn } from '@/lib/utils'
import { useNostr } from '@/providers/NostrProvider'
import { PencilLine } from 'lucide-react'
import SidebarItem from './SidebarItem'

export default function PostButton({ collapse, iconRail }: { collapse: boolean; iconRail?: boolean }) {
  const { checkLogin } = useNostr()
  const { push } = useSecondaryPage()

  return (
    <div className={cn('pt-2', iconRail && 'pt-1')}>
      <SidebarItem
        title="New post"
        description="Post"
        onClick={(e) => {
          e.stopPropagation()
          checkLogin(() => {
            push('/compose')
          })
        }}
        className={cn(
          'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
          iconRail && 'rounded-full'
        )}
        collapse={collapse}
        iconRail={iconRail}
      >
        <PencilLine />
      </SidebarItem>
    </div>
  )
}
