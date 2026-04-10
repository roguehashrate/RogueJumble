import BackgroundAudio from '../BackgroundAudio'
import HomeButton from './HomeButton'
import NotificationsButton from './NotificationsButton'
import PostButton from './PostButton'
import SettingsButton from './SettingsButton'
import WalletButton from './WalletButton'

export default function BottomNavigationBar() {
  return (
    <div
      className="fixed bottom-0 z-40 w-full"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -2px 12px hsl(var(--primary) / 0.06)',
        WebkitTapHighlightColor: 'transparent',
        backgroundColor: 'hsl(var(--background))'
      }}
    >
      <div className="pointer-events-none absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <BackgroundAudio className="rounded-none border-x-0 border-b border-t-0 bg-background" />
      <div
        className="flex w-full items-center justify-around [&_svg]:size-4 [&_svg]:shrink-0"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <HomeButton />
        <WalletButton />
        <PostButton />
        <SettingsButton />
        <NotificationsButton />
      </div>
    </div>
  )
}
