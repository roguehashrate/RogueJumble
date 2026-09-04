import { Button } from '@/components/ui/button'
import { useZap } from '@/providers/ZapProvider'
import { Zap, Share2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function WalletSplash() {
  const { t } = useTranslation()
  const { setZapChoice } = useZap()

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
        <Zap className="size-7 text-primary" />
      </div>
      <h2 className="text-lg font-semibold">{t('Do you want to use Zaps?')}</h2>
      <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
        {t(
          'Zaps let you send sats to other Nostr users. You can also skip sending and just share payment methods so people can pay you.'
        )}
      </p>
      <div className="mt-2 w-full max-w-sm space-y-2.5">
        <Button className="w-full gap-2" onClick={() => setZapChoice('yes')}>
          <Zap className="size-4" />
          {t('Yes, use Zaps')}
        </Button>
        <Button variant="outline" className="w-full gap-2" onClick={() => setZapChoice('no')}>
          <Share2 className="size-4" />
          {t('No, just receive payments')}
        </Button>
      </div>
    </div>
  )
}