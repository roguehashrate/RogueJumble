import './index.css'
import './polyfill'

import { StrictMode, useEffect, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { initI18n } from './i18n'
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

// Only the active language (plus English fallback) is fetched, then render.
// Fonts load in the background (font-display: swap) so the UI is interactive fast.
initI18n().then(() => {
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

// Only fetch the webfont the user actually selected (default = system font, nothing to load)
let selectedFont = 'default'
try {
  selectedFont = window.localStorage.getItem('font') || 'default'
} catch {
  // ignore
}
initFonts(selectedFont)
