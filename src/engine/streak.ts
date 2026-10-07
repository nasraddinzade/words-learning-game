import { daysBetween, type DayString } from './clock';

/** Days in a row that earn one freeze (SPEC §8.2). */
export const FREEZE_EVERY_DAYS = 7;

export interface StreakState {
  streak: number;
  freezes: number;
  lastPlayedDay: DayString | null;
}

export interface StreakResult extends StreakState {
  /** The streak grew (or started) with this play. */
  extended: boolean;
  /** Days that freezes covered this time. */
  freezesUsed: number;
  /** The gap was too long for the freezes; the streak restarted at 1. No blame attached. */
  restarted: boolean;
  /** A freeze was earned with this play. */
  freezeEarned: boolean;
}

/**
 * Records that the player played today (SPEC §8.2). A missed day costs a freeze; without
 * enough freezes the streak simply starts again at 1. Every 7 days in a row earn a freeze.
 */
export function recordPlay(state: StreakState, today: DayString): StreakResult {
  const base: StreakResult = { ...state, extended: false, freezesUsed: 0, restarted: false, freezeEarned: false };
  if (state.lastPlayedDay === today) return base;

  let streak: number;
  let freezes = state.freezes;
  let freezesUsed = 0;
  let restarted = false;

  if (state.lastPlayedDay === null) {
    streak = 1;
  } else {
    const gap = daysBetween(state.lastPlayedDay, today);
    const missed = Math.max(0, gap - 1);
    if (gap <= 0) {
      // Clock moved backwards (device time changed): keep the streak, just record the day.
      streak = Math.max(1, state.streak);
    } else if (missed === 0) {
      streak = state.streak + 1;
    } else if (freezes >= missed) {
      freezes -= missed;
      freezesUsed = missed;
      streak = state.streak + 1;
    } else {
      streak = 1;
      restarted = true;
    }
  }

  const freezeEarned = streak > 0 && streak % FREEZE_EVERY_DAYS === 0 && streak !== state.streak;
  if (freezeEarned) freezes += 1;

  return { streak, freezes, lastPlayedDay: today, extended: true, freezesUsed, restarted, freezeEarned };
}
