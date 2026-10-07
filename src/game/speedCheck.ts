import type { WordEntry } from '@/content/types';
import type { WordProgress } from '@/types/progress';
import type { DayString } from '@/engine/clock';
import { CHECK_INTERVAL_DAYS } from '@/engine/rules';
import { matchesTyped, newProgress } from '@/engine/scheduler';
import { addDays } from '@/engine/clock';
import { BALANCE } from './balance';

/**
 * Speed check (SPEC §7): typing rounds without hints or lives for words below the start level.
 * Typed correctly → learned. Not typed or skipped → the normal queue from step 1.
 */
export interface SpeedState {
  queue: string[];
  current: string | null;
  fallMs: number;
  learned: string[];
  sentToQueue: string[];
  finished: boolean;
}

export type SpeedOutcome = 'learned' | 'queued';

export function createSpeedCheck(ids: readonly string[], speed = 1): SpeedState {
  return {
    queue: ids.slice(),
    current: null,
    fallMs: Math.round(BALANCE.speedCheckFallMs / speed),
    learned: [],
    sentToQueue: [],
    finished: ids.length === 0,
  };
}

export function nextSpeedWord(state: SpeedState): SpeedState {
  if (state.current || state.finished) return state;
  const [current, ...queue] = state.queue;
  if (!current) return { ...state, finished: true };
  return { ...state, current, queue };
}

/** `typed` null means the word fell or the player pressed Skip. */
export function answerSpeed(
  state: SpeedState,
  entry: WordEntry,
  typed: string | null,
  today: DayString,
  existing?: WordProgress,
): { state: SpeedState; outcome: SpeedOutcome; progress: WordProgress } {
  if (state.current !== entry.id) throw new Error('answerSpeed() for a word that is not current');
  const base = existing ?? newProgress(entry.id);
  const correct = typed !== null && matchesTyped(typed, entry.word, entry.accept ?? []);
  const progress: WordProgress = correct
    ? { ...base, step: 4, status: 'learned', inDebt: false, skipCandidate: false, learnedDay: today, lastAdvanceDay: today, dueDay: addDays(today, CHECK_INTERVAL_DAYS[0]), checksPassed: 0 }
    : { ...base, step: 1, status: 'learning', dueDay: today, skipCandidate: false };
  const next: SpeedState = {
    ...state,
    current: null,
    learned: correct ? [...state.learned, entry.id] : state.learned,
    sentToQueue: correct ? state.sentToQueue : [...state.sentToQueue, entry.id],
  };
  return { state: next, outcome: correct ? 'learned' : 'queued', progress };
}
