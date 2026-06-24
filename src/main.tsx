import './i18n'
import './index.css'
import './polyfill'

import { StrictMode, useEffect, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { initFonts } from './lib/fontLoader'

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

// Preload fonts before rendering
initFonts().then(() => {
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
