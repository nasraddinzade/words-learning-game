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

function play(state: SessionState, c: SessionContext, correct: boolean, elapsed = 0.2) {
  const s = startRound(state, c);
  const round = s.round!;
  const choice = correct ? round.wordId : (round.options.find((o) => o !== round.wordId) as string);
  return answer(s, { choiceId: choice, elapsedFraction: elapsed, today: D, rng: c.rng });
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
      s = answer(s, { choiceId: s.round!.wordId, elapsedFraction: 0.5, today: D, rng: c.rng }).state;
    }
    s = startRound(s, c);
    expect(s.round?.wordId).toBe('alpha-v');
    expect(s.round?.isDebtReturn).toBe(true);
    const cleared = answer(s, { choiceId: 'alpha-v', elapsedFraction: 0.5, today: D, rng: c.rng });
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
    s = answer(s, { choiceId: 'alpha-v', elapsedFraction: 0.1, today: D, rng: c.rng }).state;
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
    const r = answer(s, { choiceId: null, elapsedFraction: 1, today: D, rng: c.rng });
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
    s = answer(s, { choiceId: 'alpha-v', elapsedFraction: 0.3, today: D, rng: c.rng }).state;
    expect(s.stats.movedUp).toBe(1);
    expect(s.progress['alpha-v']?.step).toBe(3);
  });
});
