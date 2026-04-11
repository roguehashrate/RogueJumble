import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { useState } from 'react'

export default function FloatingPostButton({
  onClick,
  className
}: {
  onClick: () => void
  className?: string
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className={cn('fixed right-6 bottom-24 z-50', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Button
        onClick={onClick}
        className={cn(
          'h-14 w-14 rounded-full shadow-lg transition-all duration-300',
          'bg-primary hover:bg-primary-hover',
          'hover:shadow-xl hover:scale-110',
          isHovered && 'animate-pulse-glow'
        )}
        size="icon"
        aria-label="Create new post"
      >
        <Plus className={cn(
          'h-6 w-6 text-primary-foreground transition-transform duration-300',
          isHovered && 'rotate-90'
        )} />
      </Button>
    </div>
  )
}
