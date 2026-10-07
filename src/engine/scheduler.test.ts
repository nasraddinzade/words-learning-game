import { describe, expect, it } from 'vitest';
import { addConfusion, applyAnswer, newProgress, playStep } from './scheduler';
import { addDays } from './clock';
import type { WordProgress } from '@/types/progress';

const D0 = '2026-10-07';

describe('applyAnswer', () => {
  it('walks a word through steps 1-4 on different days', () => {
    let p = newProgress('w');
    expect(playStep(p)).toBe(1);
    let r = applyAnswer(p, true, D0);
    expect(r.outcome).toBe('advanced');
    expect(r.progress.step).toBe(2);
    expect(r.progress.dueDay).toBe(addDays(D0, 1));
    p = r.progress;

    r = applyAnswer(p, true, addDays(D0, 1));
    expect(r.progress.step).toBe(3);
    expect(r.progress.dueDay).toBe(addDays(D0, 3));
    p = r.progress;

    r = applyAnswer(p, true, addDays(D0, 3));
    expect(r.progress.step).toBe(4);
    expect(r.progress.dueDay).toBe(addDays(D0, 7));
    p = r.progress;

    r = applyAnswer(p, true, addDays(D0, 7));
    expect(r.outcome).toBe('learned');
    expect(r.learnedDelta).toBe(1);
    expect(r.progress.status).toBe('learned');
    expect(r.progress.learnedDay).toBe(addDays(D0, 7));
    expect(r.progress.dueDay).toBe(addDays(D0, 28));
  });

  it('raises at most one step per calendar day', () => {
    const first = applyAnswer(newProgress('w'), true, D0);
    const second = applyAnswer(first.progress, true, D0);
    expect(second.outcome).toBe('repeated');
    expect(second.progress.step).toBe(2);
    expect(second.progress.dueDay).toBe(addDays(D0, 1));
  });

  it('drops one step on a mistake, never below 1, and puts the word in debt', () => {
    const p3 = { ...newProgress('w'), step: 3 as const, status: 'learning' as const };
    const r = applyAnswer(p3, false, D0);
    expect(r.outcome).toBe('lapsed');
    expect(r.progress.step).toBe(2);
    expect(r.progress.inDebt).toBe(true);
    expect(r.progress.lapses).toBe(1);
    expect(r.progress.dueDay).toBe(D0);

    const fresh = applyAnswer(newProgress('n'), false, D0);
    expect(fresh.progress.step).toBe(1);
    const again = applyAnswer(fresh.progress, false, D0);
    expect(again.progress.step).toBe(1);
    expect(again.progress.lapses).toBe(2);
  });

  it('clears debt without advancing and schedules for tomorrow', () => {
    const lapsed = applyAnswer({ ...newProgress('w'), step: 2, status: 'learning' }, false, D0).progress;
    const r = applyAnswer(lapsed, true, D0);
    expect(r.outcome).toBe('debtCleared');
    expect(r.progress.step).toBe(1);
    expect(r.progress.inDebt).toBe(false);
    expect(r.progress.dueDay).toBe(addDays(D0, 1));
    expect(r.progress.lastAdvanceDay).toBeNull();
    // tomorrow it can advance again
    const next = applyAnswer(r.progress, true, addDays(D0, 1));
    expect(next.outcome).toBe('advanced');
    expect(next.progress.step).toBe(2);
  });

  it('runs control checks at 21, 60 and 180 days and retires after three', () => {
    const learnedDay = D0;
    let p: WordProgress = { ...newProgress('w'), step: 4, status: 'learned', learnedDay, dueDay: addDays(D0, 21) };
    let r = applyAnswer(p, true, addDays(D0, 21));
    expect(r.outcome).toBe('passedCheck');
    expect(r.progress.checksPassed).toBe(1);
    expect(r.progress.dueDay).toBe(addDays(D0, 60));
    p = r.progress;
    r = applyAnswer(p, true, addDays(D0, 60));
    expect(r.progress.checksPassed).toBe(2);
    expect(r.progress.dueDay).toBe(addDays(D0, 180));
    p = r.progress;
    r = applyAnswer(p, true, addDays(D0, 180));
    expect(r.outcome).toBe('retired');
    expect(r.progress.status).toBe('retired');
    expect(r.progress.dueDay).toBeNull();
  });

  it('a failed check returns the word to step 3 and takes one from the learned counter', () => {
    const p = { ...newProgress('w'), step: 4 as const, status: 'learned' as const, learnedDay: D0, dueDay: addDays(D0, 21) };
    const r = applyAnswer(p, false, addDays(D0, 21));
    expect(r.outcome).toBe('failedCheck');
    expect(r.learnedDelta).toBe(-1);
    expect(r.progress.step).toBe(3);
    expect(r.progress.status).toBe('learning');
    expect(r.progress.inDebt).toBe(true);
    expect(playStep(r.progress)).toBe(3);
  });
});

describe('addConfusion', () => {
  it('keeps the five most recent distinct ids', () => {
    let p = newProgress('w');
    for (const id of ['a', 'b', 'c', 'a', 'd', 'e', 'f']) p = addConfusion(p, id);
    expect(p.confusedWith).toEqual(['f', 'e', 'd', 'a', 'c']);
    expect(addConfusion(p, 'w').confusedWith).toEqual(p.confusedWith);
  });
});
