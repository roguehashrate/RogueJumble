export const DEFAULT_ESPLORA_APIS: readonly string[] = [
  'https://mempool.space/api',
  'https://mempool.emzy.de/api',
  'https://blockstream.info/api'
]

const INITIAL_COOLDOWN_MS = 30_000
const MAX_COOLDOWN_MS = 300_000
const DEFAULT_TIMEOUT_MS = 15_000

const RETRYABLE_STATUS = new Set<number>([
  408,
  425,
  429,
  500,
  502,
  503,
  504
])

interface EndpointState {
  retryAt: number
  failures: number
}

const state = new Map<string, EndpointState>()

function isAvailable(url: string, now: number): boolean {
  const s = state.get(url)
  return !s || s.retryAt <= now
}

function markFailure(url: string, now: number): void {
  const prev = state.get(url)
  const failures = (prev?.failures ?? 0) + 1
  const backoff = Math.min(INITIAL_COOLDOWN_MS * 2 ** (failures - 1), MAX_COOLDOWN_MS)
  state.set(url, { retryAt: now + backoff, failures })
}

function markSuccess(url: string): void {
  if (state.has(url)) state.delete(url)
}

function normalize(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

export interface EsploraFetchOptions extends Omit<RequestInit, 'signal'> {
  signal?: AbortSignal
  timeoutMs?: number
  skipStatuses?: number[]
  retryStatuses?: number[]
}

export class EsploraAllEndpointsFailedError extends Error {
  constructor(
    public readonly urls: string[],
    public readonly causes: Array<{ url: string; reason: string }>
  ) {
    const summary = causes.map((c) => `${c.url} → ${c.reason}`).join('; ')
    super(`All Esplora endpoints failed: ${summary || '(none available)'}`)
    this.name = 'EsploraAllEndpointsFailedError'
  }
}

function buildAttemptSignal(
  callerSignal: AbortSignal | undefined,
  timeoutMs: number
): { signal: AbortSignal; cleanup: () => void; timedOut: () => boolean } {
  const timeoutController = new AbortController()
  let didTimeout = false
  const timer =
    timeoutMs > 0
      ? setTimeout(() => {
          didTimeout = true
          timeoutController.abort()
        }, timeoutMs)
      : undefined

  const signals: AbortSignal[] = [timeoutController.signal]
  if (callerSignal) signals.push(callerSignal)

  let signal: AbortSignal
  let removeListener: (() => void) | undefined
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function') {
    signal = AbortSignal.any(signals)
  } else if (callerSignal) {
    const onAbort = () => timeoutController.abort()
    if (callerSignal.aborted) {
      timeoutController.abort()
    } else {
      callerSignal.addEventListener('abort', onAbort, { once: true })
      removeListener = () => callerSignal.removeEventListener('abort', onAbort)
    }
    signal = timeoutController.signal
  } else {
    signal = timeoutController.signal
  }

  return {
    signal,
    cleanup: () => {
      if (timer !== undefined) clearTimeout(timer)
      removeListener?.()
    },
    timedOut: () => didTimeout
  }
}

export async function esploraFetch(
  baseUrls: string[],
  path: string,
  options: EsploraFetchOptions = {}
): Promise<Response> {
  if (baseUrls.length === 0) {
    throw new EsploraAllEndpointsFailedError([], [])
  }

  const {
    skipStatuses = [],
    retryStatuses = [],
    signal: callerSignal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    ...fetchInit
  } = options

  if (callerSignal?.aborted) {
    throw callerSignal.reason instanceof Error
      ? callerSignal.reason
      : new DOMException('Aborted', 'AbortError')
  }

  const skip = new Set(skipStatuses)
  const retry = new Set(retryStatuses)
  const causes: Array<{ url: string; reason: string }> = []
  const now = Date.now()

  const normalized = baseUrls.map(normalize)
  const available = normalized.filter((u) => isAvailable(u, now))
  const cooling = normalized.filter((u) => !isAvailable(u, now))
  const attemptOrder = available.length > 0 ? [...available, ...cooling] : cooling

  for (const baseUrl of attemptOrder) {
    const fullUrl = `${baseUrl}${path}`
    const attempt = buildAttemptSignal(callerSignal, timeoutMs)

    let response: Response
    try {
      response = await fetch(fullUrl, { ...fetchInit, signal: attempt.signal })
    } catch (err) {
      attempt.cleanup()

      if (callerSignal?.aborted) {
        throw err
      }

      if (attempt.timedOut()) {
        markFailure(baseUrl, Date.now())
        causes.push({ url: baseUrl, reason: `timeout after ${timeoutMs}ms` })
        continue
      }

      markFailure(baseUrl, Date.now())
      causes.push({ url: baseUrl, reason: err instanceof Error ? err.message : String(err) })
      continue
    }
    attempt.cleanup()

    if (response.ok) {
      markSuccess(baseUrl)
      return response
    }

    if (skip.has(response.status)) {
      causes.push({ url: baseUrl, reason: `HTTP ${response.status} (skipped)` })
      continue
    }

    if (RETRYABLE_STATUS.has(response.status) || retry.has(response.status)) {
      markFailure(baseUrl, Date.now())
      causes.push({ url: baseUrl, reason: `HTTP ${response.status}` })
      continue
    }

    markSuccess(baseUrl)
    return response
  }

  throw new EsploraAllEndpointsFailedError(baseUrls, causes)
}

export function _resetEsploraStateForTests(): void {
  state.clear()
}