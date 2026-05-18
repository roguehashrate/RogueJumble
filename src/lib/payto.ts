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
  { label: string; symbol?: string; category: 'bitcoin' | 'crypto' | 'fiat' | 'tip' }
> = {
  bitcoin: { label: 'Bitcoin', symbol: '₿', category: 'bitcoin' },
  lightning: { label: 'Lightning Network', symbol: '⚡', category: 'bitcoin' },
  monero: { label: 'Monero', symbol: 'ɱ', category: 'crypto' },
  ethereum: { label: 'Ethereum', symbol: 'Ξ', category: 'crypto' },
  nano: { label: 'Nano', symbol: 'Ӿ', category: 'crypto' },
  cashme: { label: 'Cash App', symbol: '$', category: 'fiat' },
  'bitcoin-cash': { label: 'Bitcoin Cash', symbol: '₿', category: 'crypto' },
  dogecoin: { label: 'Dogecoin', symbol: 'Ð', category: 'crypto' },
  litecoin: { label: 'Litecoin', symbol: 'Ł', category: 'crypto' },
  usdt: { label: 'Tether', symbol: '₮', category: 'crypto' },
  usdc: { label: 'USD Coin', symbol: '◎', category: 'crypto' },
  solana: { label: 'Solana', symbol: '◎', category: 'crypto' },
  paypal: { label: 'PayPal', symbol: '💙', category: 'fiat' },
  buymeacoffee: { label: 'Buy Me a Coffee', symbol: '☕', category: 'tip' },
  'ko-fi': { label: 'Ko-fi', symbol: '☕', category: 'tip' },
  patreon: { label: 'Patreon', symbol: '🎭', category: 'tip' },
  github: { label: 'GitHub Sponsors', symbol: '🐙', category: 'tip' }
}

const PAYTO_TYPE_ALIASES: Record<string, string> = {
  btc: 'bitcoin',
  xmr: 'monero',
  eth: 'ethereum',
  doge: 'dogecoin',
  ltc: 'litecoin',
  xno: 'nano',
  sol: 'solana',
  bch: 'bitcoin-cash'
}

export function getCanonicalPaytoType(type: string): string {
  const key = type.toLowerCase().trim()
  return PAYTO_TYPE_ALIASES[key] ?? key
}

export function getPaytoIconChar(type: string): string | null {
  const info = getPaytoTypeInfo(type)
  return info?.symbol ?? null
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
    default:
      return null
  }
}
