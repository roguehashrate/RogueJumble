import BackgroundAudio from '../BackgroundAudio'
import HomeButton from './HomeButton'
import NotificationsButton from './NotificationsButton'
import PostButton from './PostButton'
import SettingsButton from './SettingsButton'
import WalletButton from './WalletButton'

export default function BottomNavigationBar() {
  return (
    <div
      className="fixed bottom-0 z-40 w-full px-4 pb-4 pt-1"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Floating glass dock */}
      <div
        className="mx-auto max-w-md overflow-hidden"
        style={{
          borderRadius: '2rem',
          background: 'linear-gradient(135deg, hsl(var(--card) / 0.75) 0%, hsl(var(--card) / 0.55) 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid hsl(var(--border) / 0.2)',
          boxShadow: '0 4px 24px hsl(var(--primary) / 0.08)',
        }}
      >
        {/* Subtle top highlight */}
        <div className="relative h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <BackgroundAudio className="rounded-none border-x-0 border-b border-t-0 bg-transparent" />

        <div
          className="flex w-full items-center justify-around px-1 py-1.5 [&_svg]:size-5 [&_svg]:shrink-0"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <HomeButton />
          <WalletButton />
          <PostButton />
          <SettingsButton />
          <NotificationsButton />
        </div>
      </div>
    </div>
  )
}
