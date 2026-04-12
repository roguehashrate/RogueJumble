import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { toWallet } from '@/lib/link'
import { cn } from '@/lib/utils'
import { useSecondaryPage } from '@/PageManager'
import { useNostr } from '@/providers/NostrProvider'
import { LogIn, LogOut, Plus, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import LoginDialog from '../LoginDialog'
import LogoutDialog from '../LogoutDialog'
import SignerTypeBadge from '../SignerTypeBadge'
import { SimpleUserAvatar } from '../UserAvatar'
import { SimpleUsername } from '../Username'
import SidebarItem from './SidebarItem'

export default function AccountButton({ collapse, iconRail }: { collapse: boolean; iconRail?: boolean }) {
  const { pubkey } = useNostr()

  if (pubkey) {
    return <ProfileButton collapse={collapse} iconRail={iconRail} />
  } else {
    return <LoginButton collapse={collapse} iconRail={iconRail} />
  }
}

function ProfileButton({ collapse, iconRail }: { collapse: boolean; iconRail?: boolean }) {
  const { t } = useTranslation()
  const { account, accounts, switchAccount } = useNostr()
  const pubkey = account?.pubkey
  const { push } = useSecondaryPage()
  const [loginDialogOpen, setLoginDialogOpen] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  if (!pubkey) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'clickable flex items-center justify-start rounded-lg bg-transparent text-foreground shadow-none hover:text-accent-foreground',
            iconRail
              ? 'h-14 w-14 p-2'
              : collapse
                ? 'h-12 w-12 p-2'
                : 'h-auto w-full gap-4 p-2 text-lg font-semibold'
          )}
        >
          <div className={cn('flex items-center', iconRail || collapse ? '' : 'w-0 flex-1 gap-2')}>
            <SimpleUserAvatar size="medium" userId={pubkey} />
            {!collapse && !iconRail && (
              <SimpleUsername className="truncate text-lg font-semibold" userId={pubkey} />
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" className="w-72">
        <DropdownMenuItem onClick={() => push(toWallet())}>
          <Wallet />
          {t('Wallet')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t('Switch account')}</DropdownMenuLabel>
        {accounts.map((act) => (
          <DropdownMenuItem
            className={act.pubkey === pubkey ? 'cursor-default focus:bg-background' : ''}
            key={`${act.pubkey}:${act.signerType}`}
            onClick={() => {
              if (act.pubkey !== pubkey) {
                switchAccount(act)
              }
            }}
          >
            <div className="flex flex-1 items-center gap-2">
              <SimpleUserAvatar userId={act.pubkey} />
              <div className="w-0 flex-1">
                <SimpleUsername
                  userId={act.pubkey}
                  className="truncate font-medium"
                  skeletonClassName="h-3"
                />
                <SignerTypeBadge signerType={act.signerType} />
              </div>
            </div>
            <div
              className={cn(
                'size-3.5 rounded-full border border-muted-foreground',
                act.pubkey === pubkey && 'size-4 border-4 border-primary'
              )}
            />
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          onClick={() => setLoginDialogOpen(true)}
          className="m-2 border border-dashed focus:border-muted-foreground focus:bg-background"
        >
          <div className="flex w-full items-center justify-center gap-2 py-2">
            <Plus />
            {t('Add an Account')}
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => setLogoutDialogOpen(true)}
        >
          <LogOut />
          <span className="shrink-0">{t('Logout')}</span>
          <SimpleUsername
            userId={pubkey}
            className="truncate rounded-md border border-muted-foreground px-1 text-xs text-muted-foreground"
          />
        </DropdownMenuItem>
      </DropdownMenuContent>
      <LoginDialog open={loginDialogOpen} setOpen={setLoginDialogOpen} />
      <LogoutDialog open={logoutDialogOpen} setOpen={setLogoutDialogOpen} />
    </DropdownMenu>
  )
}

function LoginButton({ collapse, iconRail }: { collapse: boolean; iconRail?: boolean }) {
  const { checkLogin } = useNostr()

  return (
    <SidebarItem onClick={() => checkLogin()} title="Login" collapse={collapse} iconRail={iconRail}>
      <LogIn />
    </SidebarItem>
  )
}
