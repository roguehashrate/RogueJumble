export function satsToBTC(sats: number): string {
  return (sats / 100_000_000).toFixed(8)
}

export function formatBTC(sats: number): string {
  return satsToBTC(sats).replace(/\.?0+$/, '')
}

export function formatSats(sats: number): string {
  return sats.toLocaleString()
}

export function btcToSats(btc: number): number {
  return Math.round(btc * 100_000_000)
}

export const LARGE_AMOUNT_USD_THRESHOLD = 100

export function isLargeAmount(sats: number, btcPrice: number | undefined): boolean {
  if (!btcPrice || !Number.isFinite(btcPrice) || btcPrice <= 0) return false
  if (!Number.isFinite(sats) || sats <= 0) return false
  const usd = (sats / 100_000_000) * btcPrice
  return usd >= LARGE_AMOUNT_USD_THRESHOLD
}

export function satsToUSD(sats: number, btcPrice: number): string {
  const btc = sats / 100_000_000
  return (btc * btcPrice).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}