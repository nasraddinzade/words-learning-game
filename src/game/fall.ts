import type { Rng } from '@/engine/rng';
import { BALANCE } from './balance';

export interface FallWord {
  id: string;
  lane: number;
  /** ms after the round start when the word appears at the top. */
  spawnAt: number;
}

export interface FallPosition {
  id: string;
  lane: number;
  /** 0 = top of the field, 1 = reached the explanation panel. null = not spawned yet. */
  y: number | null;
  fallen: boolean;
}

/**
 * Assigns lanes and spawn times so words in the same lane never overlap: options are dealt
 * round-robin into lanes and spawn one after another within `spawnSpread` of the fall time.
 */
export function planFall(optionIds: readonly string[], fallMs: number, rng: Rng, lanes = BALANCE.lanes): FallWord[] {
  const n = optionIds.length;
  const stagger = n > 1 ? (fallMs * BALANCE.spawnSpread) / (n - 1) : 0;
  const laneStart = rng.int(0, lanes - 1);
  return optionIds.map((id, i) => ({ id, lane: (laneStart + i) % lanes, spawnAt: Math.round(i * stagger) }));
}

export function positionsAt(words: readonly FallWord[], elapsedMs: number, fallMs: number): FallPosition[] {
  return words.map((w) => {
    const t = elapsedMs - w.spawnAt;
    if (t < 0) return { id: w.id, lane: w.lane, y: null, fallen: false };
    const y = t / fallMs;
    return { id: w.id, lane: w.lane, y: Math.min(1, y), fallen: y >= 1 };
  });
}

/** Share of the fall time used before the tap: 0 = tapped instantly, 1 = at the bottom. */
export function elapsedFraction(word: FallWord, elapsedMs: number, fallMs: number): number {
  return Math.max(0, Math.min(1, (elapsedMs - word.spawnAt) / fallMs));
}
