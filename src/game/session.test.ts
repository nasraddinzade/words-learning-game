import { describe, expect, it } from 'vitest';
import type { WordEntry } from '@/content/types';
import { createRng } from '@/engine/rng';
import { newProgress } from '@/engine/scheduler';
import { BALANCE } from './balance';
import { answer, createSession, startRound, unresolvedDebts, type SessionContext, type SessionState } from './session';

const D = '2026-10-07';
const words = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima'];
const entries = new Map<string, WordEntry>(
  words.map((w, i) => [
    `${w}-v`,
    { id: `${w}-v`, word: w, pos: 'verb', rank: 4001 + i, level: 'B2', topic: 'actions', definition: 'd', sentence: `{${w}} a b c d e`, translation: 'п', avoid: [] },
  ]),
);
const ctx = (seed = 1): SessionContext => ({ entries, pool: [...entries.values()], rng: createRng(seed), speed: 1 });

function play(state: SessionState, c: SessionContext, correct: boolean, elapsed = 0.5) {
  const s = startRound(state, c);
  const round = s.round!;
  const choice = correct ? round.wordId : (round.options.find((o) => o !== round.wordId) as string);
  return answer(s, c, { choiceId: choice, elapsedFraction: elapsed, today: D, rng: c.rng });
}

describe('session', () => {
  it('starts a tap round with the right number of options and the target inside', () => {
    const s = startRound(createSession(['alpha-v', 'bravo-v'], []), ctx());
    expect(s.round?.wordId).toBe('alpha-v');
    expect(s.round?.options).toHaveLength(BALANCE.ladder[0]!.words);
    expect(s.round?.options).toContain('alpha-v');
    expect(s.round?.fall.map((f) => f.id).sort()).toEqual([...s.round!.options].sort());
    expect(s.round?.isNew).toBe(true);
    expect(s.queue).toEqual(['bravo-v']);
  });

  it('a mistake costs a life, resets combo and brings the word back within 3-5 rounds', () => {
    const c = ctx(5);
    let s = createSession(words.map((w) => `${w}-v`), []);
    const r = play(s, c, false);
    s = r.state;
    expect(r.result.correct).toBe(false);
    expect(s.lives).toBe(BALANCE.lives - 1);
    expect(s.combo).toBe(0);
    expect(r.result.returnsAfter).toBeGreaterThanOrEqual(3);
    expect(r.result.returnsAfter).toBeLessThanOrEqual(5);
    expect(s.stats.mistakes).toEqual(['alpha-v']);
    expect(s.progress['alpha-v']?.inDebt).toBe(true);

    const wait = r.result.returnsAfter as number;
    for (let i = 0; i < wait; i++) {
      s = startRound(s, c);
      expect(s.round?.wordId).not.toBe('alpha-v');
      s = answer(s, c, { choiceId: s.round!.wordId, elapsedFraction: 0.5, today: D, rng: c.rng }).state;
    }
    s = startRound(s, c);
    expect(s.round?.wordId).toBe('alpha-v');
    expect(s.round?.isDebtReturn).toBe(true);
    const cleared = answer(s, c, { choiceId: 'alpha-v', elapsedFraction: 0.5, today: D, rng: c.rng });
    expect(cleared.result.outcome).toBe('debtCleared');
    expect(cleared.state.progress['alpha-v']?.inDebt).toBe(false);
    expect(cleared.state.progress['alpha-v']?.step).toBe(1);
  });

  it('a debt still comes back when the queue runs out', () => {
    const c = ctx(2);
    let s = createSession(['alpha-v', 'bravo-v'], []);
    s = play(s, c, false).state; // alpha wrong, returns after 3-5
    s = play(s, c, true).state; // bravo
    s = startRound(s, c);
    expect(s.finished).toBeNull();
    expect(s.round?.wordId).toBe('alpha-v');
    s = answer(s, c, { choiceId: 'alpha-v', elapsedFraction: 0.1, today: D, rng: c.rng }).state;
    s = startRound(s, c);
    expect(s.finished).toBe('complete');
  });

  it('records what the player tapped instead', () => {
    const c = ctx(3);
    const r = play(createSession(['alpha-v'], []), c, false);
    expect(r.state.progress['alpha-v']?.confusedWith).toEqual([r.result.choiceId]);
  });

  it('ends with game over when lives run out and keeps the debts for the next game', () => {
    const c = ctx(4);
    let s = createSession(words.map((w) => `${w}-v`), []);
    for (let i = 0; i < BALANCE.lives; i++) s = play(s, c, false).state;
    expect(s.finished).toBe('gameover');
    expect(unresolvedDebts(s).sort()).toEqual(['alpha-v', 'bravo-v', 'charlie-v']);
    expect(startRound(s, c).round).toBeNull();
  });

  it('raises difficulty after a streak and lowers it after a mistake', () => {
    const c = ctx(6);
    let s = createSession(words.map((w) => `${w}-v`), []);
    for (let i = 0; i < BALANCE.stepUpEvery; i++) s = play(s, c, true).state;
    expect(s.difficulty).toBe(1);
    s = play(s, c, false).state;
    expect(s.difficulty).toBe(0);
    s = play(s, c, false).state;
    expect(s.difficulty).toBe(0);
  });

  it('scores more with combo and speed', () => {
    const c = ctx(8);
    let s = createSession(words.map((w) => `${w}-v`), []);
    const slow = play(s, c, true, 1);
    s = slow.state;
    const fast = play(s, c, true, 0);
    expect(fast.result.scoreGained).toBeGreaterThan(slow.result.scoreGained);
    expect(s.score).toBe(slow.result.scoreGained);
  });

  it('a missed word (null choice) counts as a mistake without a confusion entry', () => {
    const c = ctx(9);
    let s = startRound(createSession(['alpha-v'], []), c);
    const r = answer(s, c, { choiceId: null, elapsedFraction: 1, today: D, rng: c.rng });
    s = r.state;
    expect(r.result.correct).toBe(false);
    expect(s.lives).toBe(BALANCE.lives - 1);
    expect(s.progress['alpha-v']?.confusedWith).toEqual([]);
  });

  it('uses existing progress to choose the step and counts moved-up words', () => {
    const c = ctx(10);
    const p = { ...newProgress('alpha-v'), step: 2 as const, status: 'learning' as const, dueDay: D };
    let s = startRound(createSession(['alpha-v'], [p]), c);
    expect(s.round?.step).toBe(2);
    expect(s.round?.isNew).toBe(false);
    s = answer(s, c, { choiceId: 'alpha-v', elapsedFraction: 0.3, today: D, rng: c.rng }).state;
    expect(s.stats.movedUp).toBe(1);
    expect(s.progress['alpha-v']?.step).toBe(3);
  });
});

describe('typing rounds, skip checks and control checks', () => {
  const typed = (s: SessionState, c: SessionContext, text: string | null, elapsed = 0.5) =>
    answer(s, c, { typed: text, elapsedFraction: elapsed, today: D, rng: c.rng });

  it('plays step 3 as typing with the first letter and step 4 hidden', () => {
    const c = ctx(11);
    const p3 = { ...newProgress('alpha-v'), step: 3 as const, status: 'learning' as const, dueDay: D };
    const p4 = { ...newProgress('bravo-v'), step: 4 as const, status: 'learning' as const, dueDay: D };
    let s = startRound(createSession(['alpha-v', 'bravo-v'], [p3, p4]), c);
    expect(s.round?.kind).toBe('type');
    expect(s.round?.revealed).toBe(1);
    expect(s.round?.options).toEqual(['alpha-v']);
    expect(s.round?.fallMs).toBe(Math.round(BALANCE.ladder[0]!.fallMs * BALANCE.typeFallFactor));
    const r = typed(s, c, 'Alpha ');
    expect(r.result.correct).toBe(true);
    expect(r.state.progress['alpha-v']?.step).toBe(4);
    s = startRound(r.state, c);
    expect(s.round?.kind).toBe('type');
    expect(s.round?.revealed).toBe(0);
    const learned = typed(s, c, 'bravo');
    expect(learned.result.outcome).toBe('learned');
    expect(learned.result.learnedDelta).toBe(1);
    expect(learned.state.stats.learned).toBe(1);
  });

  it('a typo or a fallen typing word costs a life and the word comes back', () => {
    const c = ctx(12);
    const p3 = { ...newProgress('alpha-v'), step: 3 as const, status: 'learning' as const, dueDay: D };
    let s = startRound(createSession(['alpha-v', 'bravo-v'], [p3]), c);
    const r = typed(s, c, 'alpah');
    expect(r.result.correct).toBe(false);
    expect(r.result.lifeLost).toBe(true);
    expect(r.state.lives).toBe(BALANCE.lives - 1);
    expect(r.state.progress['alpha-v']?.step).toBe(2);
    expect(r.state.pendingDebts).toHaveLength(1);
    s = startRound(r.state, c);
    const fell = typed(s, c, null, 1);
    expect(fell.result.missed).toBe(true);
    expect(fell.state.lives).toBe(BALANCE.lives - 2);
  });

  it('accepts spelling variants from accept', () => {
    const c = ctx(13);
    const e = entries.get('alpha-v')!;
    const withAccept = new Map(entries);
    withAccept.set('alpha-v', { ...e, accept: ['alfa'] });
    const cc = { ...c, entries: withAccept };
    const p3 = { ...newProgress('alpha-v'), step: 3 as const, status: 'learning' as const, dueDay: D };
    const s = startRound(createSession(['alpha-v'], [p3]), cc);
    expect(typed(s, cc, 'alfa').result.correct).toBe(true);
  });

  it('a fast first tap earns a skip check; typing it learns the word at once', () => {
    const c = ctx(14);
    let s = createSession(words.map((w) => `${w}-v`), []);
    s = startRound(s, c);
    const first = answer(s, c, { choiceId: s.round!.wordId, elapsedFraction: 0.1, today: D, rng: c.rng });
    expect(first.result.skipCheckAfter).toBeGreaterThanOrEqual(3);
    expect(first.result.skipCheckAfter).toBeLessThanOrEqual(5);
    expect(first.state.progress['alpha-v']?.skipCandidate).toBe(true);
    s = first.state;
    const wait = first.result.skipCheckAfter as number;
    for (let i = 0; i < wait; i++) {
      s = startRound(s, c);
      expect(s.round?.isSkipCheck).toBe(false);
      s = play(s, c, true, 0.9).state;
    }
    s = startRound(s, c);
    expect(s.round?.wordId).toBe('alpha-v');
    expect(s.round?.isSkipCheck).toBe(true);
    expect(s.round?.kind).toBe('type');
    expect(s.round?.revealed).toBe(0);
    const r = typed(s, c, 'alpha');
    expect(r.result.outcome).toBe('learned');
    expect(r.state.progress['alpha-v']?.status).toBe('learned');
    expect(r.state.stats.learned).toBe(1);
  });

  it('a failed skip check costs nothing and the word keeps its normal path', () => {
    const c = ctx(15);
    let s = startRound(createSession(['alpha-v', 'bravo-v', 'charlie-v', 'delta-v', 'echo-v', 'foxtrot-v'], []), c);
    s = answer(s, c, { choiceId: 'alpha-v', elapsedFraction: 0, today: D, rng: c.rng }).state;
    for (let guard = 0; guard < 8; guard++) {
      s = startRound(s, c);
      if (s.round?.isSkipCheck) break;
      s = play(s, c, true, 0.9).state;
    }
    expect(s.round?.isSkipCheck).toBe(true);
    const r = typed(s, c, null, 1);
    expect(r.result.lifeLost).toBe(false);
    expect(r.state.lives).toBe(BALANCE.lives);
    expect(r.state.progress['alpha-v']?.step).toBe(2);
    expect(r.state.progress['alpha-v']?.skipCandidate).toBe(false);
    expect(r.state.pendingDebts).toHaveLength(0);
  });

  it('a slow tap on a new word earns no skip check', () => {
    const c = ctx(16);
    const s = startRound(createSession(['alpha-v'], []), c);
    const r = answer(s, c, { choiceId: 'alpha-v', elapsedFraction: 0.6, today: D, rng: c.rng });
    expect(r.result.skipCheckAfter).toBeNull();
    expect(r.state.pendingSkips).toHaveLength(0);
  });

  it('runs control checks as hidden typing rounds', () => {
    const c = ctx(17);
    const learned = { ...newProgress('alpha-v'), step: 4 as const, status: 'learned' as const, learnedDay: '2026-09-16', dueDay: D };
    let s = startRound(createSession(['alpha-v'], [learned]), c);
    expect(s.round?.isCheck).toBe(true);
    expect(s.round?.kind).toBe('type');
    expect(s.round?.revealed).toBe(0);
    const fail = typed(s, c, 'alpah');
    expect(fail.result.outcome).toBe('failedCheck');
    expect(fail.result.learnedDelta).toBe(-1);
    expect(fail.state.progress['alpha-v']?.step).toBe(3);
    expect(fail.state.stats.cameBack).toBe(1);
    s = startRound(createSession(['alpha-v'], [learned]), c);
    const pass = typed(s, c, 'alpha');
    expect(pass.result.outcome).toBe('passedCheck');
    expect(pass.state.progress['alpha-v']?.checksPassed).toBe(1);
  });
});
