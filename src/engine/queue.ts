import type { WordProgress } from '@/types/progress';
import { LEVELS, type Level } from '@/content/types';
import type { DayString } from './clock';
import { HALF_NEW_THRESHOLD, MAX_REVIEWS_PER_GAME, NO_NEW_THRESHOLD } from './rules';
import { playStep, roundKindFor } from './scheduler';

export interface QueuePlan {
  /** Ordered ids to play: debts, then reviews and new words interleaved. */
  ids: string[];
  debts: string[];
  reviews: string[];
  fresh: string[];
  /** Reviews that were due but did not fit into this game. */
  deferred: number;
  /** How many new words the regulator allowed. */
  newAllowed: number;
}

export function isDue(p: WordProgress, today: DayString): boolean {
  if (p.inDebt) return true;
  if (p.status === 'new' || p.status === 'retired') return false;
  return p.dueDay !== null && p.dueDay <= today;
}

/** Debts plus reviews due today: the number Home shows as "Due today". */
export function countDue(progress: Iterable<WordProgress>, today: DayString): number {
  let n = 0;
  for (const p of progress) if (isDue(p, today)) n += 1;
  return n;
}

/** The regulator from SPEC §6.6. */
export function allowedNew(dueCount: number, newPerGame: number): number {
  if (dueCount > NO_NEW_THRESHOLD) return 0;
  if (dueCount > HALF_NEW_THRESHOLD) return Math.floor(newPerGame / 2);
  return newPerGame;
}

/**
 * Builds the queue for one game (SPEC §6.6).
 * `freshCandidates` are ids the player has never seen, already in the order they should be
 * introduced (start level by rank, then the next levels).
 */
export function buildQueue(progress: Iterable<WordProgress>, today: DayString, newPerGame: number, freshCandidates: string[]): QueuePlan {
  const debts: WordProgress[] = [];
  const due: WordProgress[] = [];
  for (const p of progress) {
    if (p.inDebt) debts.push(p);
    else if (isDue(p, today)) due.push(p);
  }
  const byDue = (a: WordProgress, b: WordProgress) => (a.dueDay ?? '').localeCompare(b.dueDay ?? '') || a.wordId.localeCompare(b.wordId);
  debts.sort(byDue);
  due.sort(byDue);

  const dueTotal = debts.length + due.length;
  const reviewBudget = Math.max(0, MAX_REVIEWS_PER_GAME - debts.length);
  const reviews = due.slice(0, reviewBudget).map((p) => p.wordId);
  const deferred = due.length - reviews.length;
  const newAllowed = allowedNew(dueTotal, newPerGame);
  const fresh = freshCandidates.slice(0, newAllowed);

  const byId = new Map<string, WordProgress>();
  for (const p of due) byId.set(p.wordId, p);
  const kindOf = (id: string) => {
    const p = byId.get(id);
    return p ? roundKindFor(playStep(p)) : 'tap';
  };
  return {
    ids: [...debts.map((p) => p.wordId), ...alternateKinds(interleave(reviews, fresh), kindOf)],
    debts: debts.map((p) => p.wordId),
    reviews,
    fresh,
    deferred,
    newAllowed,
  };
}

/**
 * Reorders ids so tap and typing rounds alternate where possible (SPEC §6.6), keeping the
 * relative order inside each kind. When one kind runs out the rest follow unchanged.
 */
export function alternateKinds(ids: string[], kindOf: (id: string) => 'tap' | 'type'): string[] {
  const taps = ids.filter((id) => kindOf(id) === 'tap');
  const types = ids.filter((id) => kindOf(id) === 'type');
  if (taps.length === 0 || types.length === 0) return ids.slice();
  return interleave(taps, types);
}

/** Spreads the shorter list evenly through the longer one, keeping both orders. */
export function interleave<T>(a: T[], b: T[]): T[] {
  if (a.length === 0) return b.slice();
  if (b.length === 0) return a.slice();
  const [long, short] = a.length >= b.length ? [a, b] : [b, a];
  const out: T[] = [];
  const ratio = long.length / (short.length + 1);
  let si = 0;
  for (let i = 0; i < long.length; i++) {
    out.push(long[i] as T);
    while (si < short.length && i + 1 >= Math.round(ratio * (si + 1))) out.push(short[si++] as T);
  }
  while (si < short.length) out.push(short[si++] as T);
  return out;
}

/** Start level first, then the levels above it, then the ones below from the bottom (SPEC §3). */
export function levelOrder(start: Level): Level[] {
  const i = LEVELS.indexOf(start);
  return [...LEVELS.slice(i), ...LEVELS.slice(0, i)];
}
