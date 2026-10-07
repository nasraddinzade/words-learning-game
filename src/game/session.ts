import type { WordEntry } from '@/content/types';
import type { WordProgress } from '@/types/progress';
import type { DayString } from '@/engine/clock';
import type { Rng } from '@/engine/rng';
import { DEBT_RETURN_ROUNDS } from '@/engine/rules';
import { addConfusion, applyAnswer, newProgress, playStep, type AnswerOutcome, type PlayStep } from '@/engine/scheduler';
import { BALANCE, difficultyAt, scoreFor } from './balance';
import { pickDistractors } from './distractors';
import { planFall, type FallWord } from './fall';

export type RoundKind = 'tap' | 'type';

export interface Round {
  index: number;
  wordId: string;
  step: PlayStep;
  kind: RoundKind;
  /** Option ids in display order (tap rounds): the correct one plus distractors. */
  options: string[];
  fall: FallWord[];
  fallMs: number;
  isDebtReturn: boolean;
  isNew: boolean;
}

export interface PendingDebt {
  wordId: string;
  /** Rounds to wait before the word comes back. */
  returnAfter: number;
}

export interface SessionStats {
  learned: number;
  movedUp: number;
  cameBack: number;
  /** Ids the player got wrong at least once, in order of first mistake. */
  mistakes: string[];
  answered: number;
  correct: number;
}

export interface SessionState {
  queue: string[];
  pendingDebts: PendingDebt[];
  round: Round | null;
  roundsPlayed: number;
  lives: number;
  score: number;
  combo: number;
  bestCombo: number;
  difficulty: number;
  streak: number;
  progress: Record<string, WordProgress>;
  stats: SessionStats;
  finished: null | 'complete' | 'gameover';
}

export interface AnswerInput {
  /** Tapped option id; null when the correct word reached the bottom. */
  choiceId: string | null;
  /** 0 = instant, 1 = at the bottom. */
  elapsedFraction: number;
  today: DayString;
  rng: Rng;
}

export interface AnswerResult {
  correct: boolean;
  outcome: AnswerOutcome;
  wordId: string;
  choiceId: string | null;
  progress: WordProgress;
  learnedDelta: -1 | 0 | 1;
  scoreGained: number;
  /** The mistaken word will return after this many rounds (wrong answers only). */
  returnsAfter: number | null;
}

export interface SessionContext {
  entries: ReadonlyMap<string, WordEntry>;
  /** Distractor pool: every loaded entry. */
  pool: readonly WordEntry[];
  rng: Rng;
  /** Multiplier on fall time, from ?speed=. 0.5 = twice as slow. */
  speed: number;
}

export function createSession(queueIds: readonly string[], progress: Iterable<WordProgress>): SessionState {
  const map: Record<string, WordProgress> = {};
  for (const p of progress) map[p.wordId] = p;
  return {
    queue: queueIds.slice(),
    pendingDebts: [],
    round: null,
    roundsPlayed: 0,
    lives: BALANCE.lives,
    score: 0,
    combo: 0,
    bestCombo: 0,
    difficulty: 0,
    streak: 0,
    progress: map,
    stats: { learned: 0, movedUp: 0, cameBack: 0, mistakes: [], answered: 0, correct: 0 },
    finished: null,
  };
}

export function progressOf(state: SessionState, wordId: string): WordProgress {
  return state.progress[wordId] ?? newProgress(wordId);
}

/** Picks the next word: a debt whose wait is over, else the queue, else a debt still waiting. */
function takeNext(state: SessionState): { wordId: string; isDebtReturn: boolean; queue: string[]; pendingDebts: PendingDebt[] } | null {
  const ready = state.pendingDebts.findIndex((d) => d.returnAfter <= 0);
  if (ready >= 0) {
    const debt = state.pendingDebts[ready] as PendingDebt;
    return { wordId: debt.wordId, isDebtReturn: true, queue: state.queue, pendingDebts: state.pendingDebts.filter((_, i) => i !== ready) };
  }
  if (state.queue.length > 0) {
    const [wordId, ...queue] = state.queue as [string, ...string[]];
    return { wordId, isDebtReturn: false, queue, pendingDebts: state.pendingDebts };
  }
  if (state.pendingDebts.length > 0) {
    const soonest = state.pendingDebts.reduce((a, b) => (b.returnAfter < a.returnAfter ? b : a));
    return { wordId: soonest.wordId, isDebtReturn: true, queue: [], pendingDebts: state.pendingDebts.filter((d) => d !== soonest) };
  }
  return null;
}

/** Starts the next round or marks the game complete. Lives are checked by `answer`. */
export function startRound(state: SessionState, ctx: SessionContext): SessionState {
  if (state.finished || state.round) return state;
  const next = takeNext(state);
  if (!next) return { ...state, finished: 'complete' };

  const entry = ctx.entries.get(next.wordId);
  if (!entry) {
    // Content missing for this id (e.g. the batch was not loaded): skip it rather than crash.
    return startRound({ ...state, queue: next.queue, pendingDebts: next.pendingDebts }, ctx);
  }
  const p = progressOf(state, next.wordId);
  const step = playStep(p);
  const level = difficultyAt(state.difficulty);
  const weak = new Set(Object.values(state.progress).filter((x) => x.status === 'learning').map((x) => x.wordId));
  const distractors = pickDistractors({ target: entry, pool: ctx.pool, count: level.words - 1, step, confusedWith: p.confusedWith, weak, rng: ctx.rng });
  const options = ctx.rng.shuffle([entry.id, ...distractors.map((d) => d.id)]);
  const fallMs = Math.round(level.fallMs / ctx.speed);
  const round: Round = {
    index: state.roundsPlayed,
    wordId: entry.id,
    step,
    kind: 'tap',
    options,
    fall: planFall(options, fallMs, ctx.rng),
    fallMs,
    // A debt carried over from the last game arrives through the queue but is still a return.
    isDebtReturn: next.isDebtReturn || p.inDebt,
    isNew: p.status === 'new',
  };
  // Every round that starts brings the waiting debts one step closer.
  const pendingDebts = next.pendingDebts.map((d) => ({ ...d, returnAfter: d.returnAfter - 1 }));
  return { ...state, queue: next.queue, pendingDebts, round };
}

/** Resolves the current round. Progress for the word is updated; the caller persists it. */
export function answer(state: SessionState, input: AnswerInput): { state: SessionState; result: AnswerResult } {
  const round = state.round;
  if (!round) throw new Error('answer() without an active round');
  const correct = input.choiceId === round.wordId;
  let p = progressOf(state, round.wordId);
  const applied = applyAnswer(p, correct, input.today);
  p = applied.progress;
  if (!correct && input.choiceId) p = addConfusion(p, input.choiceId);

  const stats: SessionStats = { ...state.stats, answered: state.stats.answered + 1, mistakes: state.stats.mistakes.slice() };
  if (correct) stats.correct += 1;
  if (applied.outcome === 'advanced') stats.movedUp += 1;
  if (applied.outcome === 'learned') stats.learned += 1;
  if (applied.outcome === 'lapsed' || applied.outcome === 'failedCheck') {
    stats.cameBack += 1;
    if (!stats.mistakes.includes(round.wordId)) stats.mistakes.push(round.wordId);
  }

  let next: SessionState = { ...state, round: null, roundsPlayed: state.roundsPlayed + 1, progress: { ...state.progress, [round.wordId]: p }, stats };
  let scoreGained = 0;
  let returnsAfter: number | null = null;

  if (correct) {
    const combo = state.combo + 1;
    scoreGained = scoreFor(state.combo, input.elapsedFraction);
    const streak = state.streak + 1;
    const stepUp = streak % BALANCE.stepUpEvery === 0;
    next = {
      ...next,
      combo,
      bestCombo: Math.max(state.bestCombo, combo),
      score: state.score + scoreGained,
      streak,
      difficulty: stepUp ? Math.min(BALANCE.ladder.length - 1, state.difficulty + 1) : state.difficulty,
    };
  } else {
    const [min, max] = DEBT_RETURN_ROUNDS;
    returnsAfter = input.rng.int(min, max);
    const lives = state.lives - 1;
    next = {
      ...next,
      combo: 0,
      streak: 0,
      lives,
      difficulty: Math.max(0, state.difficulty - 1),
      pendingDebts: [...state.pendingDebts, { wordId: round.wordId, returnAfter: returnsAfter }],
      finished: lives <= 0 ? 'gameover' : null,
    };
  }

  return {
    state: next,
    result: {
      correct,
      outcome: applied.outcome,
      wordId: round.wordId,
      choiceId: input.choiceId,
      progress: p,
      learnedDelta: applied.learnedDelta,
      scoreGained,
      returnsAfter,
    },
  };
}

/** True when nothing is left to play after the current round. */
export function isLastRound(state: SessionState): boolean {
  return state.queue.length === 0 && state.pendingDebts.length === 0;
}

/** Ids still in debt when the game ends: they open the next game (SPEC §6.2). */
export function unresolvedDebts(state: SessionState): string[] {
  return Object.values(state.progress).filter((p) => p.inDebt).map((p) => p.wordId);
}
