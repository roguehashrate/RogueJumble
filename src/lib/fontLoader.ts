const FONT_URLS = {
  Andika: {
    400: 'https://fonts.gstatic.com/s/andika/v27/mem_Ya6iyW-LwqgAbQ.ttf',
    700: 'https://fonts.gstatic.com/s/andika/v27/mem8Ya6iyW-Lwqg40ZM1Ug.ttf'
  },
  Ubuntu: {
    400: 'https://fonts.gstatic.com/s/ubuntu/v21/4iCs6KVjbNBYlgo6eA.ttf',
    500: 'https://fonts.gstatic.com/s/ubuntu/v21/4iCv6KVjbNBYlgoCjC3Ttw.ttf',
    700: 'https://fonts.gstatic.com/s/ubuntu/v21/4iCv6KVjbNBYlgoCxCvTtw.ttf'
  }
}

let styleEl: HTMLStyleElement | null = null

function applyFont(fontName: string) {
  const families: Record<string, string> = {
    default: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    monospace: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    opendyslexic: '"Andika", sans-serif',
    sourcesans: '"Ubuntu", sans-serif'
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
    loadFontFromURL('Andika', '400', FONT_URLS.Andika[400]),
    loadFontFromURL('Andika', '700', FONT_URLS.Andika[700]),
    loadFontFromURL('Ubuntu', '400', FONT_URLS.Ubuntu[400]),
    loadFontFromURL('Ubuntu', '700', FONT_URLS.Ubuntu[700])
  ])
}

export { applyFont }
