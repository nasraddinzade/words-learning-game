import type { WordEntry } from '@/content/types';
import type { WordProgress } from '@/types/progress';
import type { DayString } from '@/engine/clock';
import type { Rng } from '@/engine/rng';
import { DEBT_RETURN_ROUNDS } from '@/engine/rules';
import {
  addConfusion,
  applyAnswer,
  applySkipCheck,
  markSkipCandidate,
  matchesTyped,
  newProgress,
  playStep,
  revealedLettersFor,
  roundKindFor,
  type AnswerOutcome,
  type PlayStep,
  type RoundKind,
} from '@/engine/scheduler';
import { BALANCE, difficultyAt, scoreFor } from './balance';
import { pickDistractors } from './distractors';
import { planFall, type FallWord } from './fall';

export type { RoundKind };

export interface Round {
  index: number;
  wordId: string;
  step: PlayStep;
  kind: RoundKind;
  /** Option ids in display order (tap rounds): the correct one plus distractors. Typing rounds: just the word. */
  options: string[];
  fall: FallWord[];
  fallMs: number;
  /** Typing rounds: how many leading letters are shown. */
  revealed: number;
  isDebtReturn: boolean;
  isNew: boolean;
  /** The §6.3 skip check: typing without hints, no life lost on failure. */
  isSkipCheck: boolean;
  /** A §6.5 control check of a learned word. */
  isCheck: boolean;
}

export interface PendingReturn {
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
  pendingDebts: PendingReturn[];
  pendingSkips: PendingReturn[];
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
  /** Tap rounds: tapped option id; null when the correct word reached the bottom. */
  choiceId?: string | null;
  /** Typing rounds: what was typed; null when the word reached the bottom. */
  typed?: string | null;
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
  typed: string | null;
  /** True when nothing was tapped or typed before the word fell. */
  missed: boolean;
  progress: WordProgress;
  learnedDelta: -1 | 0 | 1;
  scoreGained: number;
  /** The mistaken word will return after this many rounds (wrong answers only). */
  returnsAfter: number | null;
  /** A fast first tap: the word will get a skip check after this many rounds. */
  skipCheckAfter: number | null;
  /** Mistake cost a life (false for a failed skip check). */
  lifeLost: boolean;
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
    pendingSkips: [],
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

interface Next {
  wordId: string;
  source: 'debt' | 'skip' | 'queue';
  queue: string[];
  pendingDebts: PendingReturn[];
  pendingSkips: PendingReturn[];
}

/** Picks the next word: a debt or skip check whose wait is over, else the queue, else whatever is still waiting. */
function takeNext(state: SessionState): Next | null {
  const base = { queue: state.queue, pendingDebts: state.pendingDebts, pendingSkips: state.pendingSkips };
  const readyDebt = state.pendingDebts.findIndex((d) => d.returnAfter <= 0);
  if (readyDebt >= 0) {
    const debt = state.pendingDebts[readyDebt] as PendingReturn;
    return { ...base, wordId: debt.wordId, source: 'debt', pendingDebts: state.pendingDebts.filter((_, i) => i !== readyDebt) };
  }
  const readySkip = state.pendingSkips.findIndex((d) => d.returnAfter <= 0);
  if (readySkip >= 0) {
    const skip = state.pendingSkips[readySkip] as PendingReturn;
    return { ...base, wordId: skip.wordId, source: 'skip', pendingSkips: state.pendingSkips.filter((_, i) => i !== readySkip) };
  }
  if (state.queue.length > 0) {
    const [wordId, ...queue] = state.queue as [string, ...string[]];
    return { ...base, wordId, source: 'queue', queue };
  }
  if (state.pendingDebts.length > 0) {
    const soonest = state.pendingDebts.reduce((a, b) => (b.returnAfter < a.returnAfter ? b : a));
    return { ...base, wordId: soonest.wordId, source: 'debt', pendingDebts: state.pendingDebts.filter((d) => d !== soonest) };
  }
  if (state.pendingSkips.length > 0) {
    const soonest = state.pendingSkips.reduce((a, b) => (b.returnAfter < a.returnAfter ? b : a));
    return { ...base, wordId: soonest.wordId, source: 'skip', pendingSkips: state.pendingSkips.filter((d) => d !== soonest) };
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
    return startRound({ ...state, queue: next.queue, pendingDebts: next.pendingDebts, pendingSkips: next.pendingSkips }, ctx);
  }
  const p = progressOf(state, next.wordId);
  const step = playStep(p);
  const isSkipCheck = next.source === 'skip';
  const isCheck = p.status === 'learned';
  const kind: RoundKind = isSkipCheck ? 'type' : roundKindFor(step);
  const level = difficultyAt(state.difficulty);
  const tick = (list: PendingReturn[]) => list.map((d) => ({ ...d, returnAfter: d.returnAfter - 1 }));

  let options: string[];
  let fallMs: number;
  if (kind === 'tap') {
    const weak = new Set(Object.values(state.progress).filter((x) => x.status === 'learning').map((x) => x.wordId));
    const distractors = pickDistractors({ target: entry, pool: ctx.pool, count: level.words - 1, step, confusedWith: p.confusedWith, weak, rng: ctx.rng });
    options = ctx.rng.shuffle([entry.id, ...distractors.map((d) => d.id)]);
    fallMs = Math.round(level.fallMs / ctx.speed);
  } else {
    options = [entry.id];
    fallMs = Math.round((level.fallMs * BALANCE.typeFallFactor) / ctx.speed);
  }

  const round: Round = {
    index: state.roundsPlayed,
    wordId: entry.id,
    step,
    kind,
    options,
    fall: kind === 'tap' ? planFall(options, fallMs, ctx.rng) : [{ id: entry.id, lane: Math.floor(BALANCE.lanes / 2), spawnAt: 0 }],
    fallMs,
    revealed: isSkipCheck || isCheck ? 0 : revealedLettersFor(step),
    // A debt carried over from the last game arrives through the queue but is still a return.
    isDebtReturn: next.source === 'debt' || p.inDebt,
    isNew: p.status === 'new',
    isSkipCheck,
    isCheck,
  };
  // Every round that starts brings the waiting returns one step closer.
  return { ...state, queue: next.queue, pendingDebts: tick(next.pendingDebts), pendingSkips: tick(next.pendingSkips), round };
}

/** Resolves the current round. Progress for the word is updated; the caller persists it. */
export function answer(state: SessionState, ctx: SessionContext, input: AnswerInput): { state: SessionState; result: AnswerResult } {
  const round = state.round;
  if (!round) throw new Error('answer() without an active round');
  const entry = ctx.entries.get(round.wordId);
  const choiceId = input.choiceId ?? null;
  const typed = input.typed ?? null;
  const missed = round.kind === 'tap' ? choiceId === null : typed === null;
  const correct = round.kind === 'tap' ? choiceId === round.wordId : typed !== null && matchesTyped(typed, entry?.word ?? '', entry?.accept ?? []);

  let p = progressOf(state, round.wordId);
  const applied = round.isSkipCheck ? applySkipCheck(p, correct, input.today) : applyAnswer(p, correct, input.today);
  p = applied.progress;
  if (!correct && round.kind === 'tap' && choiceId) p = addConfusion(p, choiceId);

  // A fast correct first tap on a new word earns a skip check later in this game (SPEC §6.3).
  let skipCheckAfter: number | null = null;
  if (correct && round.isNew && round.kind === 'tap' && input.elapsedFraction <= BALANCE.fastTapFraction) {
    p = markSkipCandidate(p);
    const [min, max] = DEBT_RETURN_ROUNDS;
    skipCheckAfter = input.rng.int(min, max);
  }

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
  const lifeLost = !correct && !round.isSkipCheck;

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
      pendingSkips: skipCheckAfter === null ? next.pendingSkips : [...next.pendingSkips, { wordId: round.wordId, returnAfter: skipCheckAfter }],
    };
  } else if (round.isSkipCheck) {
    // Not typed: no penalty, the combo simply does not grow (SPEC §6.3).
    next = { ...next, streak: 0 };
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
      // A word that lapsed no longer deserves its pending skip check.
      pendingSkips: next.pendingSkips.filter((s) => s.wordId !== round.wordId),
      finished: lives <= 0 ? 'gameover' : null,
    };
  }

  return {
    state: next,
    result: {
      correct,
      outcome: applied.outcome,
      wordId: round.wordId,
      choiceId,
      typed,
      missed,
      progress: p,
      learnedDelta: applied.learnedDelta,
      scoreGained,
      returnsAfter,
      skipCheckAfter,
      lifeLost,
    },
  };
}

/** True when nothing is left to play after the current round. */
export function isLastRound(state: SessionState): boolean {
  return state.queue.length === 0 && state.pendingDebts.length === 0 && state.pendingSkips.length === 0;
}

/** Ids still in debt when the game ends: they open the next game (SPEC §6.2). */
export function unresolvedDebts(state: SessionState): string[] {
  return Object.values(state.progress).filter((p) => p.inDebt).map((p) => p.wordId);
}
