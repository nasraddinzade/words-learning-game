/**
 * Every tuning number of the arcade lives here (SPEC §5.5). Expect to adjust after live play.
 */
export interface DifficultyLevel {
  /** Falling words in a tap round (one correct + distractors). */
  words: number;
  /** Time for a word to fall through the field in a tap round, ms. */
  fallMs: number;
}

export const BALANCE = {
  lanes: 3,
  lives: 3,
  /**
   * Difficulty ladder. Start at index 0: three words, slow. Every `stepUpEvery` correct answers
   * in a row move one level up; a mistake moves one level down (SPEC §5.5).
   */
  ladder: [
    { words: 3, fallMs: 10_000 },
    { words: 3, fallMs: 8_500 },
    { words: 4, fallMs: 8_500 },
    { words: 4, fallMs: 7_400 },
    { words: 5, fallMs: 7_400 },
    { words: 5, fallMs: 6_400 },
    { words: 6, fallMs: 6_400 },
    { words: 6, fallMs: 5_600 },
  ] as readonly DifficultyLevel[],
  stepUpEvery: 3,
  /** Typing rounds get this much more time than tap rounds (SPEC §5.2). */
  typeFallFactor: 1.6,
  /** Speed check (SPEC §7): fast typing rounds, one fixed fall time. */
  speedCheckFallMs: 7_000,
  /** Words per Speed check session. */
  speedCheckBatch: 20,
  /** All words of a round spawn within this share of the fall time. */
  spawnSpread: 0.3,
  /** Points. */
  scoreBase: 100,
  /** Extra points for a fast answer: up to this many, scaled by how early the tap came. */
  speedBonusMax: 50,
  /** Combo multiplier grows by this every `comboStep` answers in a row. */
  comboStep: 5,
  comboMultiplierStep: 0.5,
  /** A correct tap within this share of the fall time marks a new word as a skip candidate (§6.3). */
  fastTapFraction: 1 / 3,
} as const;

export function difficultyAt(level: number): DifficultyLevel {
  const i = Math.max(0, Math.min(BALANCE.ladder.length - 1, level));
  return BALANCE.ladder[i] as DifficultyLevel;
}

/** 0 below 5 in a row, then 1, 2, 3 at 5, 10 and 20 (SPEC §8.1). */
export function comboTier(combo: number): number {
  if (combo >= 20) return 3;
  if (combo >= 10) return 2;
  if (combo >= 5) return 1;
  return 0;
}

export function comboMultiplier(combo: number): number {
  return 1 + Math.floor(combo / BALANCE.comboStep) * BALANCE.comboMultiplierStep;
}

export function scoreFor(combo: number, elapsedFraction: number): number {
  const bonus = Math.round(BALANCE.speedBonusMax * Math.max(0, 1 - elapsedFraction));
  return Math.round((BALANCE.scoreBase + bonus) * comboMultiplier(combo));
}
