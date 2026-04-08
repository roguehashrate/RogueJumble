import PostEditor from '@/components/PostEditor'
import { useNostr } from '@/providers/NostrProvider'
import { PencilLine } from 'lucide-react'
import { useState } from 'react'
import BottomNavigationBarItem from './BottomNavigationBarItem'

export default function PostButton() {
  const { checkLogin } = useNostr()
  const [open, setOpen] = useState(false)

  return (
    <>
      <BottomNavigationBarItem
        onClick={() => {
          checkLogin(() => {
            setOpen(true)
          })
        }}
      >
        <PencilLine className="size-4" />
      </BottomNavigationBarItem>
      <PostEditor open={open} setOpen={setOpen} />
    </>
  )
}
