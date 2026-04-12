import { useSecondaryPage } from '@/PageManager'
import { cn } from '@/lib/utils'
import { useNostr } from '@/providers/NostrProvider'
import { PencilLine } from 'lucide-react'
import SidebarItem from './SidebarItem'

export default function PostButton({ collapse }: { collapse: boolean }) {
  const { checkLogin } = useNostr()
  const { push } = useSecondaryPage()

  return (
    <div className="pt-4">
      <SidebarItem
        title="New post"
        description="Post"
        onClick={(e) => {
          e.stopPropagation()
          checkLogin(() => {
            push('/compose')
          })
        }}
        variant="default"
        className={cn('gap-2 bg-primary', !collapse && 'justify-center')}
        collapse={collapse}
      >
        <PencilLine />
      </SidebarItem>
    </div>
  )
}
