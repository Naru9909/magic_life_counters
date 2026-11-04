/**
 * Small device capability helpers. Every function degrades silently when the
 * underlying API is missing so the app never breaks on unsupported browsers.
 */

export function vibrate(pattern: number | number[] = 12): void {
  if (typeof navigator === 'undefined') return;
  if (typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Vibration is a nice-to-have, never surface failures to the user.
  }
}

export function supportsWakeLock(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

export async function requestWakeLock(): Promise<WakeLockSentinel | null> {
  if (!supportsWakeLock()) return null;
  try {
    return await navigator.wakeLock.request('screen');
  } catch {
    return null;
  }
}

export function supportsHaptics(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}
