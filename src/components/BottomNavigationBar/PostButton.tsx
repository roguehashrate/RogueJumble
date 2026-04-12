import { useSecondaryPage } from '@/PageManager'
import { haptic } from '@/lib/haptic'
import { useNostr } from '@/providers/NostrProvider'
import { Plus } from 'lucide-react'

export default function PostButton() {
  const { checkLogin } = useNostr()
  const { push } = useSecondaryPage()

  return (
    <button
      type="button"
      className="group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-primary-foreground outline-none transition-all duration-200 hover:scale-105"
      style={{
        WebkitTapHighlightColor: 'transparent',
        background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-hover)))',
        boxShadow: '0 2px 12px hsl(var(--primary) / 0.35)',
        outline: 'none'
      }}
      onClick={() => {
        checkLogin(() => {
          haptic('click')
          push('/compose')
        })
      }}
    >
      <Plus className="relative z-10 size-5 transition-transform duration-200 group-hover:rotate-90" />
    </button>
  )
}
