import { TOTAL_WORDS } from '@/content/types';

export const HUNDRED = 100;
export const THOUSAND = 1_000;

export interface Milestones {
  /** Hundreds crossed, e.g. [300] (only the highest is kept when several are crossed at once). */
  hundred: number | null;
  /** Every thousand crossed, e.g. [1000, 2000]. Each unlocks a theme (SPEC §8.2). */
  thousands: number[];
}

/** Which celebrations a change of the learned counter earns (SPEC §8.2). */
export function milestonesCrossed(prev: number, next: number): Milestones {
  const lo = Math.max(0, Math.min(prev, TOTAL_WORDS));
  const hi = Math.max(0, Math.min(next, TOTAL_WORDS));
  if (hi <= lo) return { hundred: null, thousands: [] };
  const thousands: number[] = [];
  for (let t = Math.floor(lo / THOUSAND) * THOUSAND + THOUSAND; t <= hi; t += THOUSAND) thousands.push(t);
  const lastHundred = Math.floor(hi / HUNDRED) * HUNDRED;
  const hundred = lastHundred > lo && lastHundred % THOUSAND !== 0 ? lastHundred : null;
  return { hundred, thousands };
}
