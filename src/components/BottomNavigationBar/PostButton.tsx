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
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/40 transition-transform active:scale-95 hover:bg-primary-hover"
        style={{ transform: 'translateY(-8px)' }}
        onClick={() => {
          checkLogin(() => {
            setOpen(true)
          })
        }}
      >
        <PencilLine className="size-5" />
      </button>
      <PostEditor open={open} setOpen={setOpen} />
    </>
  )
}
