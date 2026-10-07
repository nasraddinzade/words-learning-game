/** Learning-logic constants (SPEC §6). Game-feel numbers live in src/game/balance.ts. */
export const STEP_INTERVAL_DAYS: Record<1 | 2 | 3, number> = { 1: 1, 2: 2, 3: 4 };
/** Days after "learned" at which a word is checked again (SPEC §6.5). */
export const CHECK_INTERVAL_DAYS = [21, 60, 180] as const;
export const MAX_REVIEWS_PER_GAME = 40;
export const HALF_NEW_THRESHOLD = 30;
export const NO_NEW_THRESHOLD = 60;
export const MAX_CONFUSED_WITH = 5;
/** A mistaken word comes back after this many rounds in the same game (SPEC §6.2). */
export const DEBT_RETURN_ROUNDS: [number, number] = [3, 5];
