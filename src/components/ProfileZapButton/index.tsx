import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useNostr } from '@/providers/NostrProvider'
import { Zap } from 'lucide-react'
import { useState } from 'react'
import ZapDialog from '../ZapDialog'

export default function ProfileZapButton({ pubkey }: { pubkey: string }) {
  const { checkLogin } = useNostr()
  const [open, setOpen] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const triggerAnimation = () => {
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 700)
  }

  return (
    <>
      <Button
        variant="secondary"
        size="icon"
        className={cn('relative rounded-full', isAnimating && 'animate-zap-pulse')}
        onClick={() => checkLogin(() => setOpen(true))}
      >
        {isAnimating && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/2 top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 animate-spark-out bg-zap [--tw-translate-x:15px] [--tw-translate-y:-15px] rotate-[45deg]" />
            <div className="absolute left-1/2 top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 animate-spark-out bg-zap [--tw-translate-x:-15px] [--tw-translate-y:-15px] rotate-[-45deg] [animation-delay:0.1s]" />
            <div className="absolute left-1/2 top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 animate-spark-out bg-zap [--tw-translate-x:20px] [--tw-translate-y:0px] rotate-[90deg] [animation-delay:0.05s]" />
            <div className="absolute left-1/2 top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 animate-spark-out bg-zap [--tw-translate-x:-20px] [--tw-translate-y:0px] rotate-[-90deg] [animation-delay:0.15s]" />
            <div className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 animate-ripple rounded-full bg-zap/20" />
          </div>
        )}
        <Zap className="text-zap" />
      </Button>
      <ZapDialog open={open} setOpen={setOpen} pubkey={pubkey} onSuccess={triggerAnimation} />
    </>
  )
}
