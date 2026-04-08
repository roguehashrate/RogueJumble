import { ROGUE_HASHRATE_PUBKEY } from '@/constants'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import ZapDialog from '../ZapDialog'
import { SimpleUserAvatar } from '../UserAvatar'
import { SimpleUsername } from '../Username'

export default function Donation({ className }: { className?: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <div className={cn('space-y-3 rounded-lg border p-4', className)}>
      <div className="text-center text-sm text-muted-foreground">
        {t('Donations are greatly appreciated :)')}
      </div>
      <div className="flex items-center gap-3">
        <SimpleUserAvatar userId={ROGUE_HASHRATE_PUBKEY} size="medium" />
        <div className="w-0 flex-1">
          <SimpleUsername
            userId={ROGUE_HASHRATE_PUBKEY}
            className="text-base font-semibold"
            skeletonClassName="h-4 w-28"
          />
        </div>
        <button
          className="rounded-md px-2 py-1 text-sm font-medium text-zap hover:text-zap/80"
          onClick={() => setOpen(true)}
        >
          {t('Zap')}
        </button>
      </div>
      <ZapDialog open={open} setOpen={setOpen} pubkey={ROGUE_HASHRATE_PUBKEY} />
    </div>
  )
}
