import { PAYTO_LOGO_URL_BY_FILENAME } from '@/lib/payto-logos'

export const PAYTO_URI_REGEX = /payto:\/\/([a-z0-9-]+)\/([^\s\]"']+)/gi

export interface ParsedPayto {
  type: string
  authority: string
  raw: string
}

export function parsePaytoUri(uri: string): ParsedPayto | null {
  const trimmed = uri.trim()
  const m = /^payto:\/\/([a-z0-9-]+)\/(.+)$/i.exec(trimmed)
  if (!m) return null
  const typeRaw = m[1].toLowerCase()
  const authority = decodeURIComponent(m[2].replace(/\+/g, ' '))
  if (!typeRaw || !authority) return null
  const type = getCanonicalPaytoType(typeRaw)
  return { type, authority, raw: trimmed }
}

export function buildPaytoUri(type: string, authority: string): string {
  const t = type.toLowerCase().replace(/[^a-z0-9-]/g, '')
  const a = encodeURIComponent(authority.trim())
  return `payto://${t}/${a}`
}

export const PAYTO_KNOWN_TYPES: Record<
  string,
  { label: string; symbol?: string; category: 'bitcoin' | 'bitcoin-layer' | 'crypto' | 'stablecoin' | 'fiat' | 'tip' }
> = {
  bitcoin: { label: 'Bitcoin', symbol: '₿', category: 'bitcoin' },
  lightning: { label: 'Lightning Network', symbol: '⚡', category: 'bitcoin-layer' },
  liquid: { label: 'Liquid', symbol: '⛓', category: 'bitcoin-layer' },
  lbtc: { label: 'Liquid Bitcoin', symbol: '₿', category: 'bitcoin-layer' },
  sats: { label: 'Satoshis', symbol: '丰', category: 'bitcoin' },
  monero: { label: 'Monero', symbol: 'ɱ', category: 'crypto' },
  ethereum: { label: 'Ethereum', symbol: 'Ξ', category: 'crypto' },
  nano: { label: 'Nano', symbol: 'Ӿ', category: 'crypto' },
  cashme: { label: 'Cash App', symbol: '$', category: 'fiat' },
  'bitcoin-cash': { label: 'Bitcoin Cash', symbol: '₿', category: 'crypto' },
  dogecoin: { label: 'Dogecoin', symbol: 'Ð', category: 'crypto' },
  litecoin: { label: 'Litecoin', symbol: 'Ł', category: 'crypto' },
  usdt: { label: 'Tether', symbol: '₮', category: 'stablecoin' },
  usdc: { label: 'USD Coin', symbol: '◎', category: 'stablecoin' },
  dai: { label: 'Dai', symbol: '◈', category: 'crypto' },
  solana: { label: 'Solana', symbol: '◎', category: 'crypto' },
  bnb: { label: 'BNB', category: 'crypto' },
  tron: { label: 'Tron', category: 'crypto' },
  xrp: { label: 'XRP', category: 'crypto' },
  venmo: { label: 'Venmo', symbol: '$', category: 'fiat' },
  revolut: { label: 'Revolut', symbol: '💳', category: 'fiat' },
  paypal: { label: 'PayPal', symbol: '💙', category: 'fiat' },
  buymeacoffee: { label: 'Buy Me a Coffee', symbol: '☕', category: 'tip' },
  'ko-fi': { label: 'Ko-fi', symbol: '☕', category: 'tip' },
  kofi: { label: 'Ko-fi', symbol: '☕', category: 'tip' },
  patreon: { label: 'Patreon', symbol: '🎭', category: 'tip' },
  github: { label: 'GitHub Sponsors', symbol: '🐙', category: 'tip' },
  geyser: { label: 'Geyser Fund', symbol: '⛲', category: 'tip' },
  gofundme: { label: 'GoFundMe', symbol: '🎯', category: 'tip' },
  kickstarter: { label: 'Kickstarter', symbol: '🚀', category: 'tip' },
  zcash: { label: 'Zcash', symbol: 'ⓩ', category: 'crypto' }
}

const PAYTO_TYPE_ALIASES: Record<string, string> = {
  btc: 'bitcoin',
  xmr: 'monero',
  eth: 'ethereum',
  doge: 'dogecoin',
  ltc: 'litecoin',
  xno: 'nano',
  sol: 'solana',
  bch: 'bitcoin-cash',
  zec: 'zcash'
}

export function getCanonicalPaytoType(type: string): string {
  const key = type.toLowerCase().trim()
  return PAYTO_TYPE_ALIASES[key] ?? key
}

export function getPaytoIconChar(type: string): string | null {
  const info = getPaytoTypeInfo(type)
  return info?.symbol ?? null
}

const PAYTO_LOGO_FILES: Record<string, string> = {
  bitcoin: 'bitcoin.svg',
  liquid: 'LBTC.svg',
  lbtc: 'LBTC.svg',
  ethereum: 'ethereum-eth-logo.svg',
  monero: 'Monero.png',
  litecoin: 'Litecoin.png',
  dogecoin: 'dogecoin-doge-logo.svg',
  usdt: 'tether-usdt-logo.svg',
  usdc: 'usd-coin-usdc-logo.svg',
  dai: 'multi-collateral-dai-dai-logo.svg',
  solana: 'solana.png',
  bnb: 'BNB.png',
  tron: 'Tron.png',
  xrp: 'XRP.gif',
  'bitcoin-cash': 'bitcoin-cash-bch-logo.svg',
  cashme: 'cashapp.webp',
  venmo: 'venmo.png',
  paypal: 'paypal.webp',
  revolut: 'revolut.webp',
  buymeacoffee: 'buymeacoffee.png',
  'ko-fi': 'ko-fi.png',
  kofi: 'ko-fi.png',
  patreon: 'patreon.png',
  github: 'github_sponsors.png',
  geyser: 'geyser_fund.webp',
  gofundme: 'gofundme.jpeg',
  kickstarter: 'kickstarter.webp',
  zcash: 'Zcash.png'
}

const PAYTO_PROFILE_URL_TEMPLATES: Record<string, string> = {
  paypal: 'https://paypal.me/{authority}',
  venmo: 'https://venmo.com/{authority}',
  revolut: 'https://revolut.me/{authority}',
  buymeacoffee: 'https://buymeacoffee.com/{authority}',
  'ko-fi': 'https://ko-fi.com/{authority}',
  kofi: 'https://ko-fi.com/{authority}',
  patreon: 'https://patreon.com/{authority}',
  github: 'https://github.com/sponsors/{authority}',
  geyser: 'https://geyser.fund/project/{authority}',
  gofundme: 'https://www.gofundme.com/f/{authority}',
  kickstarter: 'https://www.kickstarter.com/projects/{authority}',
  cashme: 'https://cash.app/{authority}'
}

export function getPaytoProfileUrl(type: string, authority: string): string | null {
  const key = getCanonicalPaytoType(type)
  const template = PAYTO_PROFILE_URL_TEMPLATES[key]
  if (!template || !authority) return null
  return template.replace('{authority}', encodeURIComponent(authority.trim()))
}

export function getPaytoLogoPath(type: string): string | null {
  const key = getCanonicalPaytoType(type)
  const file = PAYTO_LOGO_FILES[key]
  if (!file) return null
  return PAYTO_LOGO_URL_BY_FILENAME[file] ?? null
}

export function getPaytoTypeInfo(type: string): (typeof PAYTO_KNOWN_TYPES)[string] | undefined {
  return PAYTO_KNOWN_TYPES[getCanonicalPaytoType(type)]
}

export function isKnownPaytoType(type: string): boolean {
  return getCanonicalPaytoType(type) in PAYTO_KNOWN_TYPES
}

export function isLightningPaytoType(type: string): boolean {
  return getCanonicalPaytoType(type) === 'lightning'
}

export function getPaytoActionUri(type: string, authority: string): string | null {
  const canonical = getCanonicalPaytoType(type)
  switch (canonical) {
    case 'bitcoin':
    case 'bitcoin-cash':
    case 'litecoin':
    case 'dogecoin':
      return `${canonical}:${authority}`
    case 'monero':
      return `monero:${authority}`
    case 'ethereum':
      return `ethereum:${authority}`
    case 'solana':
      return `solana:${authority}`
    case 'nano':
      return `nano:${authority}`
    case 'usdt':
    case 'usdc':
      return `ethereum:${authority}`
    case 'paypal':
      return `https://paypal.me/${authority.replace(/^@/, '')}`
    case 'cashme':
      return `https://cash.app/${authority.replace(/^\$?@?/, '')}`
    case 'buymeacoffee':
      return `https://buymeacoffee.com/${authority.replace(/^@/, '')}`
    case 'ko-fi':
      return `https://ko-fi.com/${authority.replace(/^@/, '')}`
    case 'patreon':
      return `https://patreon.com/${authority.replace(/^@/, '')}`
    case 'github':
      return `https://github.com/sponsors/${authority.replace(/^@/, '')}`
    case 'zcash':
      return `zcash:${authority}`
    default:
      return null
  }
}
