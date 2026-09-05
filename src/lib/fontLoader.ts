const FONT_URLS: Record<string, { 400: string; 700: string }> = {
  ComicNeue: {
    400: 'https://fonts.gstatic.com/s/comicneue/v9/4UaHrEJDsxBrF37olUeDx60.ttf',
    700: 'https://fonts.gstatic.com/s/comicneue/v9/4UaErEJDsxBrF37olUeD_xHMwps.ttf'
  },
  JetBrainsMono: {
    400: 'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPQ.ttf',
    700: 'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8L6tjPQ.ttf'
  },
  SpaceGrotesk: {
    400: 'https://fonts.gstatic.com/s/spacegrotesk/v22/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj7oUUsj.ttf',
    700: 'https://fonts.gstatic.com/s/spacegrotesk/v22/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj4PVksj.ttf'
  },
  Caveat: {
    400: 'https://fonts.gstatic.com/s/caveat/v23/Wnz6HAc5bAfYB2Q7ZjYY.woff2',
    700: 'https://fonts.gstatic.com/s/caveat/v23/Wnz6HAc5bAfYB2Q7ZjYY.woff2'
  },
  Orbitron: {
    400: 'https://fonts.gstatic.com/s/orbitron/v35/yMJRMIlzdpvBhQQL_Qq7dy0.woff2',
    700: 'https://fonts.gstatic.com/s/orbitron/v35/yMJRMIlzdpvBhQQL_Qq7dy0.woff2'
  }
}

const FONT_FAMILY_TO_LOAD: Record<string, string | null> = {
  default: null,
  monospace: 'JetBrainsMono',
  dyslexic: 'ComicNeue',
  sourcesans: 'SpaceGrotesk',
  caveat: 'Caveat',
  orbitron: 'Orbitron'
}

let styleEl: HTMLStyleElement | null = null

// Webfonts that have already been requested (dedupes concurrent loads)
const loadedFonts = new Set<string>()

function applyFont(fontName: string) {
  const families: Record<string, string> = {
    default:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    monospace: '"JetBrains Mono", monospace',
    dyslexic: '"Comic Neue", sans-serif',
    sourcesans: '"Space Grotesk", sans-serif',
    caveat: '"Caveat", cursive',
    orbitron: '"Orbitron", sans-serif'
  }

  const family = families[fontName] || families.default

  // Remove old style
  if (styleEl) styleEl.remove()

  // Create style at the very end of <head> (last rule wins)
  styleEl = document.createElement('style')
  styleEl.setAttribute('data-app-font', 'true')
  styleEl.textContent = `*, *::before, *::after { font-family: ${family} !important; }`
  document.head.appendChild(styleEl)

  // Make sure the webfont (if any) is available for the chosen font
  const fontKey = FONT_FAMILY_TO_LOAD[fontName]
  if (fontKey) {
    loadFontFromKey(fontKey)
  }
}

async function loadFontFromKey(fontKey: string) {
  if (loadedFonts.has(fontKey)) return
  loadedFonts.add(fontKey)
  const urls = FONT_URLS[fontKey]
  if (!urls) return
  try {
    await Promise.all([
      loadFontFromURL(fontKey, '400', urls[400]),
      loadFontFromURL(fontKey, '700', urls[700])
    ])
  } catch {
    // Ignore — the browser will use a fallback family
  }
}

async function loadFontFromURL(family: string, weight: string, url: string) {
  try {
    const face = new FontFace(family, `url(${url})`, {
      weight,
      style: 'normal',
      display: 'swap'
    })
    const loaded = await face.load()
    document.fonts.add(loaded)
  } catch (e) {
    console.warn(`Font load failed: ${family} ${weight}`, e)
  }
}

/**
 * Load only the webfont needed for the selected font preference (no-op for the
 * default system font). Called after first render so it never blocks startup.
 */
export function initFonts(fontName: string) {
  const fontKey = FONT_FAMILY_TO_LOAD[fontName] || ''
  if (!fontKey) return
  loadFontFromKey(fontKey)
}

export { applyFont }
