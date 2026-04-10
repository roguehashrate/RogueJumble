import PostEditor from '@/components/PostEditor'
import { useNostr } from '@/providers/NostrProvider'
import { PencilLine } from 'lucide-react'
import { useState } from 'react'

export default function PostButton() {
  const { checkLogin } = useNostr()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className="group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-primary-foreground outline-none"
        style={{
          transform: 'translateY(-8px)',
          WebkitTapHighlightColor: 'transparent',
          backgroundColor: 'hsl(var(--primary))',
          boxShadow: '0 4px 12px hsl(var(--primary) / 0.4)',
          outline: 'none'
        }}
        onClick={() => {
          checkLogin(() => {
            setOpen(true)
          })
        }}
      >
        {/* Breathing glow effect */}
        <span className="absolute inset-0 animate-pulse rounded-full bg-primary opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-40" />
        <PencilLine className="relative z-10 size-5" />
      </button>
      <PostEditor open={open} setOpen={setOpen} />
    </>
  )
}
