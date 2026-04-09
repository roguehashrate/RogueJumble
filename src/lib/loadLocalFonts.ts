export function loadLocalFonts() {
  // Get base path from current URL (works with GitHub Pages subpaths)
  const basePath = window.location.pathname.replace(/\/[^/]*$/, '/').replace(/\/$/, '')
  const fontBaseUrl = `${basePath}/fonts`

  const fonts = [
    {
      family: 'Andika',
      weight: '400',
      url: `${fontBaseUrl}/Andika-Regular.ttf`
    },
    {
      family: 'Andika',
      weight: '700',
      url: `${fontBaseUrl}/Andika-Bold.ttf`
    },
    {
      family: 'Nunito',
      weight: '400',
      url: `${fontBaseUrl}/Nunito-Regular.ttf`
    }
  ]

  // Load fonts via FontFace API for reliable loading
  fonts.forEach(({ family, weight, url }) => {
    const fontFace = new FontFace(family, `url('${url}') format('truetype')`, {
      weight,
      style: 'normal',
      display: 'swap'
    })
    
    fontFace.load().then((loadedFace) => {
      document.fonts.add(loadedFace)
      console.log(`Font loaded: ${family} ${weight}`)
    }).catch((error) => {
      console.error(`Failed to load font: ${family} ${weight}`, error)
    })
  })
}
