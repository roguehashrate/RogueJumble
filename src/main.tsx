import './index.css'
import './polyfill'

import { StrictMode, useEffect, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { initI18n } from './i18n'

function VhProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const setVh = () => {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight}px`)
    }
    setVh()
    const ac = new AbortController()
    window.addEventListener('resize', setVh, { signal: ac.signal, passive: true })
    window.addEventListener('orientationchange', setVh, { signal: ac.signal, passive: true })
    return () => ac.abort()
  }, [])

  return <>{children}</>
}

// Render the app regardless of i18n state, so a failed locale fetch can never
// leave a blank screen. English is bundled (no network), other languages load
// lazily in the background and hot-swap once ready.
initI18n()
  .catch(console.error)
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <ErrorBoundary>
          <VhProvider>
            <App />
          </VhProvider>
        </ErrorBoundary>
      </StrictMode>
    )
  })