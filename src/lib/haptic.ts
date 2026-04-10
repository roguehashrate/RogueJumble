/**
 * Haptic feedback utility using the Vibration API.
 * Provides native-like tactile feedback on mobile devices.
 * Gracefully falls back on devices that don't support vibration.
 */

const VIBRATION_PATTERNS = {
  light: 10,
  medium: 20,
  heavy: 40,
  success: [30] as number[],
  warning: [50, 30, 50] as number[],
  error: [100] as number[],
  click: 5,
  press: 15
} as const

type VibrationType = keyof typeof VIBRATION_PATTERNS

/**
 * Trigger haptic feedback.
 * @param type - The type of haptic feedback to trigger
 */
export function haptic(type: VibrationType = 'click'): void {
  // Feature detection: Vibration API
  if (!('vibrate' in navigator)) return

  // Only vibrate on mobile devices (desktop browsers may not support it)
  if (!isMobileDevice()) return

  try {
    const vibrationPattern = VIBRATION_PATTERNS[type]
    navigator.vibrate(vibrationPattern as number | number[])
  } catch {
    // Silently fail on unsupported browsers
  }
}

/**
 * Check if the current device is likely a mobile device.
 */
function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false

  // Check for touch support
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    return true
  }

  // Check user agent for mobile devices
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
  return mobileRegex.test(navigator.userAgent)
}
