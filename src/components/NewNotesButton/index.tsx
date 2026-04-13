import { Button } from '@/components/ui/button'
import { SimpleUserAvatar } from '@/components/UserAvatar'
import { cn } from '@/lib/utils'
import { useScreenSize } from '@/providers/ScreenSizeProvider'
import { hasBackgroundAudioAtom } from '@/services/media-manager.service'
import { useAtomValue } from 'jotai'
import { ArrowUp } from 'lucide-react'
import { Event } from 'nostr-tools'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export default function NewNotesButton({
  newEvents = [],
  onClick
}: {
  newEvents?: Event[]
  onClick?: () => void
}) {
  const { t } = useTranslation()
  const { isSmallScreen } = useScreenSize()
  const hasBackgroundAudio = useAtomValue(hasBackgroundAudioAtom)
  const pubkeys = useMemo(() => {
    const arr: string[] = []
    for (const event of newEvents) {
      if (!arr.includes(event.pubkey)) {
        arr.push(event.pubkey)
      }
      if (arr.length >= 3) break
    }
    return arr
  }, [newEvents])

  return (
    <>
      {newEvents.length > 0 && (
        <div
          className={cn('pointer-events-none z-50 flex w-full justify-center', 'sticky')}
          style={{
            bottom: isSmallScreen
              ? `calc(env(safe-area-inset-bottom) + ${hasBackgroundAudio ? 9.9 : 6.5}rem)`
              : `calc(env(safe-area-inset-bottom) + 3.25rem)`
          }}
        >
          <Button
            onClick={onClick}
            className="group pointer-events-auto h-fit rounded-full py-2 pl-2 pr-3 hover:bg-primary-hover"
          >
            {pubkeys.length > 0 && (
              <div className="flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background *:data-[slot=avatar]:grayscale">
                {pubkeys.map((pubkey) => (
                  <SimpleUserAvatar key={pubkey} userId={pubkey} size="small" />
                ))}
              </div>
            )}
            <div className="text-md font-medium">
              {t('Show n new notes', { n: newEvents.length > 99 ? '99+' : newEvents.length })}
            </div>
            <ArrowUp />
          </Button>
        </div>
      )}
    </>
  )
}
