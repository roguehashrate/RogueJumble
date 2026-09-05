import dayjs from 'dayjs'
import i18n, { Resource } from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import en from './locales/en'

// English is bundled with the app so it renders instantly. The other locale
// bundles are fetched on demand — only the active language is ever downloaded,
// instead of all 18 at startup.
const languageModules = {
  ar: () => import('./locales/ar'),
  de: () => import('./locales/de'),
  es: () => import('./locales/es'),
  fa: () => import('./locales/fa'),
  fr: () => import('./locales/fr'),
  hi: () => import('./locales/hi'),
  hu: () => import('./locales/hu'),
  it: () => import('./locales/it'),
  ja: () => import('./locales/ja'),
  ko: () => import('./locales/ko'),
  pl: () => import('./locales/pl'),
  'pt-BR': () => import('./locales/pt-BR'),
  'pt-PT': () => import('./locales/pt-PT'),
  ru: () => import('./locales/ru'),
  th: () => import('./locales/th'),
  zh: () => import('./locales/zh'),
  'zh-TW': () => import('./locales/zh-TW')
} as const

export type TLanguage = 'en' | keyof typeof languageModules

export const LocalizedLanguageNames: Record<TLanguage, string> = {
  ar: 'العربية',
  de: 'Deutsch',
  en: 'English',
  es: 'Español',
  fa: 'فارسی',
  fr: 'Français',
  hi: 'हिन्दी',
  hu: 'Magyar',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
  pl: 'Polski',
  'pt-BR': 'Português (Brasil)',
  'pt-PT': 'Português (Portugal)',
  ru: 'Русский',
  th: 'ไทย',
  zh: '简体中文',
  'zh-TW': '繁體中文'
}

export const supportedLanguages = ['en', ...Object.keys(languageModules)] as TLanguage[]

const loadedBundles = new Set<TLanguage>()

function convertDetectedLanguage(lng: string): TLanguage | null {
  if (lng.startsWith('zh')) {
    return ['zh', 'zh-CN', 'zh-SG'].includes(lng) ? 'zh' : 'zh-TW'
  }
  const supported = supportedLanguages.find((supported) => lng.startsWith(supported))
  return supported || null
}

// Match the language detector's persistence key so first-load language matches
// what i18next will end up detecting during init.
function detectLanguage(): TLanguage {
  try {
    const stored = window.localStorage.getItem('i18nextLng')
    if (stored) {
      const lng = convertDetectedLanguage(stored)
      if (lng) return lng
    }
  } catch {
    // ignore
  }
  const candidates = navigator.languages?.length ? navigator.languages : navigator.language ? [navigator.language] : []
  for (const candidate of candidates) {
    const lng = convertDetectedLanguage(candidate)
    if (lng) return lng
  }
  return 'en'
}

async function loadLocale(lng: TLanguage) {
  if (loadedBundles.has(lng) || lng === 'en') return
  loadedBundles.add(lng)
  const module = await languageModules[lng as keyof typeof languageModules]()
  const bundle = module.default as Resource
  i18n.addResourceBundle(lng, 'translation', bundle.translation, true, true)
}

// English is always available (bundled), so the app can render immediately
// without waiting for any locale fetch.
const enBundle = en as unknown as Resource
i18n.addResourceBundle('en', 'translation', enBundle.translation, true, true)
loadedBundles.add('en')

/**
 * Initialize i18n, fetching only the bundles that are actually needed: English
 * is bundled and the detected language is fetched lazily when it differs.
 */
export async function initI18n(): Promise<typeof i18n> {
  const primary = detectLanguage()
  if (primary !== 'en') {
    await loadLocale(primary)
  }

  i18n.on('languageChanged', (lng) => {
    const lang = convertDetectedLanguage(String(lng))
    if (lang) loadLocale(lang)
  })

  await i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: 'en',
      resources: {},
      interpolation: {
        escapeValue: false // react already safes from xss
      },
      react: {
        useSuspense: false
      },
      detection: {
        convertDetectedLanguage: (lng) => convertDetectedLanguage(lng) || 'en'
      }
    })

  return i18n
}

i18n.services.formatter?.add('date', (timestamp, lng) => {
  switch (lng) {
    case 'zh':
    case 'zh-TW':
    case 'ja':
      return dayjs(timestamp).format('YYYY年MM月DD日')
    case 'pl':
    case 'de':
    case 'ru':
      return dayjs(timestamp).format('DD.MM.YYYY')
    case 'fa':
    case 'hu':
      return dayjs(timestamp).format('YYYY/MM/DD')
    case 'it':
    case 'es':
    case 'fr':
    case 'pt-BR':
    case 'pt-PT':
    case 'ar':
    case 'hi':
    case 'th':
      return dayjs(timestamp).format('DD/MM/YYYY')
    case 'ko':
      return dayjs(timestamp).format('YYYY년 MM월 DD일')
    default:
      return dayjs(timestamp).format('MMM D, YYYY')
  }
})

export default i18n