import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Download, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function InstallPrompt() {
  const { t } = useTranslation()
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (isStandalone) {
      setIsInstalled(true)
      return
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Show prompt after a short delay to not be intrusive
      setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowPrompt(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
  }

  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 p-4 transition-all duration-300',
        'animate-[slideUp_0.3s_ease-out]',
        'md:inset-x-auto md:left-4 md:right-auto md:bottom-4 md:max-w-sm'
      )}
    >
      <div className="rounded-2xl border bg-card p-4 shadow-xl shadow-black/10">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Smartphone className="size-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{t('Install RogueJumble')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('Install for a native app experience with offline support')}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleInstall}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                <Download className="size-3.5" />
                {t('Install')}
              </button>
              <button
                onClick={handleDismiss}
                className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {t('Later')}
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
