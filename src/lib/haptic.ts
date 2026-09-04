/**
 * Haptic feedback utility.
 *
 * Uses the Vibration API where available (Android / desktop mobile-emulation)
 * and falls back to an AudioContext-based "tap" via Web Audio on iOS Safari,
 * which does not expose `navigator.vibrate`.
 */

const VIBRATION_PATTERNS: Record<string, number | number[]> = {
  light: 8,
  medium: 16,
  heavy: 36,
  success: 20,
  warning: [50, 30, 50],
  error: 90,
  click: 4,
  press: 12
}

export type HapticType = keyof typeof VIBRATION_PATTERNS

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (audioCtx) return audioCtx
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  try {
    audioCtx = new Ctor()
  } catch {
    return null
  }
  return audioCtx
}

/**
 * Play a short, low-amplitude impulse using Web Audio.
 * Long enough to feel like a tap, short enough to not sound like a beep.
 */
function playAudioTap(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
    const duration = 0.03
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 220
    gain.gain.setValueAtTime(0.02, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  } catch {
    // Silently fail on unsupported environments
  }
}

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return true
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
  return mobileRegex.test(navigator.userAgent || '')
}

/**
 * Trigger haptic feedback.
 * @param type - The type of haptic feedback to trigger.
 */
export function haptic(type: HapticType = 'click'): void {
  if (!isMobileDevice()) return

  // 1) Preferred path: the Vibration API (Android, Chrome, etc.)
  if ('vibrate' in navigator) {
    try {
      const pattern = VIBRATION_PATTERNS[type]
      navigator.vibrate(pattern as number | number[])
      return
    } catch {
      // fall through to audio tap
    }
  }

  // 2) iOS fallback: Web Audio tap. Skip the richer patterns that don't map
  //    to a tactile tap (warning/error are still fine as a single muted tap).
  playAudioTap()
}