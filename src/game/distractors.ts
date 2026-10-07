import type { WordEntry } from '@/content/types';
import type { Rng } from '@/engine/rng';

export const RANK_WINDOW = 300;
export const SIMILAR_LEVENSHTEIN = 2;

export interface DistractorInput {
  target: WordEntry;
  pool: readonly WordEntry[];
  count: number;
  /** Step 2 and up: distractors should look like the target (SPEC §5.1). */
  step: 1 | 2 | 3 | 4;
  /** Ids the player tapped instead of the target before (SPEC §6.4). */
  confusedWith: readonly string[];
  /** Ids of words the player is still learning: preferred as distractors. */
  weak: ReadonlySet<string>;
  rng: Rng;
}

/**
 * Picks wrong options for a tap round (SPEC §5.1).
 * Always: same part of speech, never a word from the target's `avoid`, close rank when possible.
 * Priority: confusion list, then (step ≥ 2) look-alikes by topic or spelling, then weak words.
 */
export function pickDistractors(input: DistractorInput): WordEntry[] {
  const { target, pool, count, step, confusedWith, weak, rng } = input;
  const avoid = new Set(target.avoid);
  const base = pool.filter((e) => e.pos === target.pos && e.id !== target.id && e.word !== target.word && !avoid.has(e.word));
  const near = base.filter((e) => Math.abs(e.rank - target.rank) <= RANK_WINDOW);
  const candidates = near.length >= count ? near : base;

  const confused = new Set(confusedWith);
  const tiers: WordEntry[][] = [[], [], [], []];
  for (const e of candidates) {
    const similar = e.topic === target.topic || levenshtein(e.word, target.word) <= SIMILAR_LEVENSHTEIN;
    let tier: number;
    if (confused.has(e.id)) tier = 0;
    else if (step >= 2) tier = similar ? 1 : weak.has(e.id) ? 2 : 3;
    else tier = weak.has(e.id) ? 1 : similar ? 2 : 3;
    tiers[tier]!.push(e);
  }
  const ordered = tiers.flatMap((tier) => rng.shuffle(tier));
  return ordered.slice(0, count);
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min((prev[j] as number) + 1, (cur[j - 1] as number) + 1, (prev[j - 1] as number) + cost);
    }
    prev = cur;
  }
  return prev[b.length] as number;
}
