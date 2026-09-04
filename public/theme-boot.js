;(function () {
  try {
    var themeHex = {
      ember: '#000000',
      emerald: '#0a0f0d',
      sapphire: '#0b0e13',
      amethyst: '#0f0c12',
      hackerman: '#000000',
      phosphor: '#000000',
      midnight: '#08090d',
      nord: '#14161f'
    }
    var stored = null
    try {
      stored = window.localStorage.getItem('themeSetting')
    } catch (e) {}
    var color = themeHex[stored] || '#0b0e13'
    document.documentElement.style.backgroundColor = color
    document.documentElement.style.colorScheme = 'dark'
  } catch (e) {}
})()