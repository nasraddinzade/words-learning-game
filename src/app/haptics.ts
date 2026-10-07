import { useProfile } from './profileStore';

/** navigator.vibrate behind the Vibration setting (SPEC §8.4). Silently absent on iOS. */
export function vibrate(pattern: number | readonly number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  if (!useProfile.getState().profile.settings.vibration) return;
  try {
    navigator.vibrate(pattern as number | number[]);
  } catch {
    /* some browsers throw when the page is not visible */
  }
}

export const HAPTIC = {
  tap: 12,
  wrong: [40, 40, 60],
  learned: [20, 30, 20, 30, 60],
  celebration: [60, 60, 60, 60, 160],
  record: [30, 40, 90],
} as const;
