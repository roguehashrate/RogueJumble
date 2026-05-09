import AboutInfoDialog from '@/components/AboutInfoDialog'
import Donation from '@/components/Donation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import {
  toAppearanceSettings,
  toEmojiPackSettings,
  toGeneralSettings,
  toPostSettings,
  toRelaySettings,
  toSystemSettings
} from '@/lib/link'
import { cn } from '@/lib/utils'
import { useSecondaryPage } from '@/PageManager'
import { useNostr } from '@/providers/NostrProvider'
import { Check, ChevronRight, Cog, Copy, Info, KeyRound, Palette, PencilLine, Server, Settings2, Smile } from 'lucide-react'
import { forwardRef, HTMLProps, useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function Settings() {
  const { t } = useTranslation()
  const { pubkey, nsec, ncryptsec } = useNostr()
  const { push } = useSecondaryPage()
  const [copiedNsec, setCopiedNsec] = useState(false)
  const [copiedNcryptsec, setCopiedNcryptsec] = useState(false)

  return (
    <div>
      <SectionHeader>{t('Content')}</SectionHeader>
      <SettingItem className="clickable" onClick={() => push(toGeneralSettings())}>
        <div className="flex items-center gap-4">
          <Settings2 />
          <div>{t('General')}</div>
        </div>
        <ChevronRight />
      </SettingItem>
      <SettingItem className="clickable" onClick={() => push(toAppearanceSettings())}>
        <div className="flex items-center gap-4">
          <Palette />
          <div>{t('Appearance')}</div>
        </div>
        <ChevronRight />
      </SettingItem>
      {!!pubkey && (
        <SettingItem className="clickable" onClick={() => push(toPostSettings())}>
          <div className="flex items-center gap-4">
            <PencilLine />
            <div>{t('Post settings')}</div>
          </div>
          <ChevronRight />
        </SettingItem>
      )}

      <Separator className="my-2" />

      <SectionHeader>{t('Network')}</SectionHeader>
      <SettingItem className="clickable" onClick={() => push(toRelaySettings())}>
        <div className="flex items-center gap-4">
          <Server />
          <div>{t('Relays')}</div>
        </div>
        <ChevronRight />
      </SettingItem>

      {(!!pubkey || !!nsec || !!ncryptsec) && (
        <>
          <Separator className="my-2" />
          <SectionHeader>{t('Account')}</SectionHeader>
        </>
      )}
      {!!pubkey && (
        <SettingItem className="clickable" onClick={() => push(toEmojiPackSettings())}>
          <div className="flex items-center gap-4">
            <Smile />
            <div>{t('Emoji Packs')}</div>
          </div>
          <ChevronRight />
        </SettingItem>
      )}
      {!!nsec && (
        <CopyPrivateKeyItem
          label={`${t('Copy private key')} (nsec)`}
          value={nsec}
          copied={copiedNsec}
          onCopy={() => {
            setCopiedNsec(true)
            setTimeout(() => setCopiedNsec(false), 2000)
          }}
        />
      )}
      {!!ncryptsec && (
        <CopyPrivateKeyItem
          label={`${t('Copy private key')} (ncryptsec)`}
          value={ncryptsec}
          copied={copiedNcryptsec}
          onCopy={() => {
            setCopiedNcryptsec(true)
            setTimeout(() => setCopiedNcryptsec(false), 2000)
          }}
        />
      )}

      <Separator className="my-2" />

      <SectionHeader>{t('Advanced')}</SectionHeader>
      <SettingItem className="clickable" onClick={() => push(toSystemSettings())}>
        <div className="flex items-center gap-4">
          <Cog />
          <div>{t('System')}</div>
        </div>
        <ChevronRight />
      </SettingItem>

      <Separator className="my-2" />

      <SectionHeader>{t('Info')}</SectionHeader>
      <AboutInfoDialog>
        <SettingItem className="clickable">
          <div className="flex items-center gap-4">
            <Info />
            <div>{t('About')}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">
              v{import.meta.env.APP_VERSION} ({import.meta.env.GIT_COMMIT})
            </div>
            <ChevronRight />
          </div>
        </SettingItem>
      </AboutInfoDialog>
      <div className="px-4 py-2">
        <Donation />
      </div>
    </div>
  )
}

function CopyPrivateKeyItem({
  label,
  value,
  copied,
  onCopy
}: {
  label: string
  value: string
  copied: boolean
  onCopy: () => void
}) {
  const { t } = useTranslation()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <SettingItem className="clickable text-destructive hover:bg-destructive/10">
          <div className="flex items-center gap-4">
            <KeyRound />
            <div>{label}</div>
          </div>
          {copied ? <Check className="text-destructive" /> : <Copy className="text-destructive" />}
        </SettingItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('Copy private key')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              'Are you sure you want to copy your private key to the clipboard? Anyone with access to this key can control your account.'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={async () => {
              await navigator.clipboard.writeText(value)
              onCopy()
            }}
          >
            {t('Copy anyway')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  )
}

const SettingItem = forwardRef<HTMLDivElement, HTMLProps<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        className={cn(
          'flex h-[52px] select-none items-center justify-between rounded-lg px-4 py-2 [&_svg]:size-4 [&_svg]:shrink-0',
          className
        )}
        {...props}
        ref={ref}
      >
        {children}
      </div>
    )
  }
)
SettingItem.displayName = 'SettingItem'
