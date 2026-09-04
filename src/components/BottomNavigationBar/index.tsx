import BackgroundAudio from '../BackgroundAudio'
import HomeButton from './HomeButton'
import NotificationsButton from './NotificationsButton'
import PostButton from './PostButton'
import ProfileButton from './ProfileButton'
import WalletButton from './WalletButton'

export default function BottomNavigationBar() {
  return (
    <div
      className="fixed bottom-0 z-40 w-full px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-1"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Floating glass dock */}
      <div
        className="mx-auto max-w-md overflow-hidden"
        style={{
          borderRadius: '2.25rem',
          background: 'linear-gradient(160deg, hsl(var(--card) / 0.9) 0%, hsl(var(--card) / 0.72) 100%)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: '1px solid hsl(var(--border) / 0.25)',
          boxShadow: '0 8px 32px hsl(var(--primary) / 0.12), 0 2px 8px hsl(0 0% 0% / 0.18)',
        }}
      >
        {/* Top highlight */}
        <div className="relative h-px w-3/5 mx-auto bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        <BackgroundAudio className="rounded-none border-x-0 border-b border-t-0 bg-transparent" />

        <div
          className="flex w-full items-center justify-between gap-1 px-3 py-2 [&_svg]:shrink-0"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <HomeButton />
          <WalletButton />
          <PostButton />
          <NotificationsButton />
          <ProfileButton />
        </div>
      </div>
    </div>
  )
}
