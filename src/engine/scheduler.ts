import type { WordProgress } from '@/types/progress';
import { addDays, type DayString } from './clock';
import { CHECK_INTERVAL_DAYS, MAX_CONFUSED_WITH, STEP_INTERVAL_DAYS } from './rules';

export type PlayStep = 1 | 2 | 3 | 4;

export type AnswerOutcome =
  | 'advanced' // moved up one step
  | 'learned' // correct on step 4
  | 'repeated' // correct, but already advanced today or shown again
  | 'debtCleared' // correct on a debt return
  | 'lapsed' // wrong: down one step, in debt
  | 'passedCheck' // learned word passed a control check
  | 'retired' // passed the last control check
  | 'failedCheck' // learned word failed a control check
  | 'skipFailed'; // skip check not typed: no penalty, normal path continues

export interface AnswerResult {
  progress: WordProgress;
  outcome: AnswerOutcome;
  /** +1 when the word became learned, -1 when a learned word failed a check. */
  learnedDelta: -1 | 0 | 1;
}

export function newProgress(wordId: string): WordProgress {
  return {
    wordId,
    step: 0,
    status: 'new',
    dueDay: null,
    lastAdvanceDay: null,
    lapses: 0,
    inDebt: false,
    skipCandidate: false,
    confusedWith: [],
    learnedDay: null,
    checksPassed: 0,
    flagged: false,
  };
}

/** The step whose format the next round uses. Never-seen words play as step 1, learned words as 4. */
export function playStep(p: WordProgress): PlayStep {
  if (p.status === 'learned' || p.status === 'retired') return 4;
  if (p.step === 0) return 1;
  return p.step as PlayStep;
}

export type RoundKind = 'tap' | 'type';

/** Steps 1-2 are tap rounds, 3-4 (and control checks) are typing rounds (SPEC §5, §6.1). */
export function roundKindFor(step: PlayStep): RoundKind {
  return step >= 3 ? 'type' : 'tap';
}

/** How many leading letters a typing round reveals: step 3 shows the first one (SPEC §5.2). */
export function revealedLettersFor(step: PlayStep): number {
  return step === 3 ? 1 : 0;
}

/** Case-insensitive match against the word or one of its accepted spellings (SPEC §5.2). */
export function matchesTyped(typed: string, word: string, accept: readonly string[] = []): boolean {
  const t = typed.trim().toLowerCase();
  if (t.length === 0) return false;
  return t === word.toLowerCase() || accept.some((a) => a.toLowerCase() === t);
}

/** A new word tapped correctly within the first third of its fall becomes a skip candidate (SPEC §6.3). */
export function markSkipCandidate(p: WordProgress): WordProgress {
  return { ...p, skipCandidate: true };
}

/**
 * The skip check (SPEC §6.3): a typing round without hints a few rounds after a fast tap.
 * Typed correctly → learned at once. Otherwise no life is lost and the word follows the normal
 * path from step 2 (which the fast tap already set up for tomorrow).
 */
export function applySkipCheck(p: WordProgress, correct: boolean, today: DayString): AnswerResult {
  if (!correct) return { progress: { ...p, skipCandidate: false }, outcome: 'skipFailed', learnedDelta: 0 };
  return {
    progress: { ...p, step: 4, status: 'learned', skipCandidate: false, inDebt: false, learnedDay: today, lastAdvanceDay: today, dueDay: addDays(today, CHECK_INTERVAL_DAYS[0]), checksPassed: 0 },
    outcome: 'learned',
    learnedDelta: 1,
  };
}

/**
 * Applies one answer (SPEC §6.1, §6.2, §6.5). Pure: `today` is the local calendar day.
 * - at most one step up per calendar day
 * - a mistake moves one step down (never below 1) and puts the word in debt
 * - clearing a debt never advances; the word is due tomorrow
 */
export function applyAnswer(p: WordProgress, correct: boolean, today: DayString): AnswerResult {
  if (p.status === 'learned') return applyCheck(p, correct, today);

  if (!correct) {
    const step = Math.max(1, p.step - 1) as WordProgress['step'];
    return {
      progress: { ...p, step: p.step === 0 ? 1 : step, status: 'learning', lapses: p.lapses + 1, inDebt: true, dueDay: today, skipCandidate: false },
      outcome: 'lapsed',
      learnedDelta: 0,
    };
  }

  if (p.inDebt) {
    return { progress: { ...p, inDebt: false, dueDay: addDays(today, 1), status: 'learning', skipCandidate: false }, outcome: 'debtCleared', learnedDelta: 0 };
  }

  if (p.lastAdvanceDay === today) {
    return { progress: { ...p, dueDay: addDays(today, 1), status: 'learning' }, outcome: 'repeated', learnedDelta: 0 };
  }

  const step = playStep(p);
  if (step === 4) {
    return {
      progress: { ...p, step: 4, status: 'learned', learnedDay: today, lastAdvanceDay: today, dueDay: addDays(today, CHECK_INTERVAL_DAYS[0]), checksPassed: 0 },
      outcome: 'learned',
      learnedDelta: 1,
    };
  }
  return {
    progress: { ...p, step: (step + 1) as WordProgress['step'], status: 'learning', lastAdvanceDay: today, dueDay: addDays(today, STEP_INTERVAL_DAYS[step]) },
    outcome: 'advanced',
    learnedDelta: 0,
  };
}

function applyCheck(p: WordProgress, correct: boolean, today: DayString): AnswerResult {
  if (!correct) {
    return {
      progress: { ...p, step: 3, status: 'learning', lapses: p.lapses + 1, inDebt: true, dueDay: today, learnedDay: null, checksPassed: 0 },
      outcome: 'failedCheck',
      learnedDelta: -1,
    };
  }
  const passed = Math.min(3, p.checksPassed + 1) as WordProgress['checksPassed'];
  if (passed >= CHECK_INTERVAL_DAYS.length) {
    return { progress: { ...p, checksPassed: passed, status: 'retired', dueDay: null }, outcome: 'retired', learnedDelta: 0 };
  }
  const next = (CHECK_INTERVAL_DAYS as readonly number[])[passed] ?? 180;
  const base = p.learnedDay ?? today;
  const due = addDays(base, next) > today ? addDays(base, next) : addDays(today, 1);
  return { progress: { ...p, checksPassed: passed, dueDay: due }, outcome: 'passedCheck', learnedDelta: 0 };
}

/** Records a wrong tap on `otherId` while `p` was the hidden word (SPEC §6.4). */
export function addConfusion(p: WordProgress, otherId: string): WordProgress {
  if (otherId === p.wordId) return p;
  const confusedWith = [otherId, ...p.confusedWith.filter((id) => id !== otherId)].slice(0, MAX_CONFUSED_WITH);
  return { ...p, confusedWith };
}
