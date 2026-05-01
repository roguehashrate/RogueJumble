const FONT_URLS = {
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

let styleEl: HTMLStyleElement | null = null

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

export async function initFonts() {
  // Preload Google Fonts
  await Promise.all([
    loadFontFromURL('Comic Neue', '400', FONT_URLS.ComicNeue[400]),
    loadFontFromURL('Comic Neue', '700', FONT_URLS.ComicNeue[700]),
    loadFontFromURL('JetBrains Mono', '400', FONT_URLS.JetBrainsMono[400]),
    loadFontFromURL('JetBrains Mono', '700', FONT_URLS.JetBrainsMono[700]),
    loadFontFromURL('Space Grotesk', '400', FONT_URLS.SpaceGrotesk[400]),
    loadFontFromURL('Space Grotesk', '700', FONT_URLS.SpaceGrotesk[700]),
    loadFontFromURL('Caveat', '400', FONT_URLS.Caveat[400]),
    loadFontFromURL('Caveat', '700', FONT_URLS.Caveat[700]),
    loadFontFromURL('Orbitron', '400', FONT_URLS.Orbitron[400]),
    loadFontFromURL('Orbitron', '700', FONT_URLS.Orbitron[700])
  ])
}

export { applyFont }
