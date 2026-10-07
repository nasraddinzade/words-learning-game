import { describe, expect, it } from 'vitest';
import { allowedNew, buildQueue, countDue, interleave, levelOrder } from './queue';
import { newProgress } from './scheduler';
import type { WordProgress } from '@/types/progress';

const D = '2026-10-07';
const learning = (id: string, dueDay: string, extra: Partial<WordProgress> = {}): WordProgress => ({
  ...newProgress(id),
  step: 2,
  status: 'learning',
  dueDay,
  ...extra,
});

describe('buildQueue', () => {
  it('puts debts first, then interleaves reviews and new words', () => {
    const progress = [learning('r1', D), learning('debt', D, { inDebt: true }), learning('later', '2026-10-09'), learning('r2', '2026-10-01')];
    const q = buildQueue(progress, D, 2, ['n1', 'n2', 'n3']);
    expect(q.debts).toEqual(['debt']);
    expect(q.reviews).toEqual(['r2', 'r1']);
    expect(q.fresh).toEqual(['n1', 'n2']);
    expect(q.ids[0]).toBe('debt');
    expect(q.ids).toHaveLength(5);
    expect(q.ids.slice(1).sort()).toEqual(['n1', 'n2', 'r1', 'r2']);
    expect(q.deferred).toBe(0);
  });

  it('caps reviews at 40 and defers the rest', () => {
    const progress = Array.from({ length: 50 }, (_, i) => learning(`r${i}`, D));
    const q = buildQueue(progress, D, 10, ['n1']);
    expect(q.reviews).toHaveLength(40);
    expect(q.deferred).toBe(10);
  });

  it('regulates new words by the number due', () => {
    expect(allowedNew(0, 10)).toBe(10);
    expect(allowedNew(30, 10)).toBe(10);
    expect(allowedNew(31, 10)).toBe(5);
    expect(allowedNew(31, 5)).toBe(2);
    expect(allowedNew(61, 10)).toBe(0);
    const many = Array.from({ length: 35 }, (_, i) => learning(`r${i}`, D));
    expect(buildQueue(many, D, 10, ['a', 'b', 'c', 'd', 'e', 'f']).fresh).toHaveLength(5);
    const tooMany = Array.from({ length: 70 }, (_, i) => learning(`r${i}`, D));
    expect(buildQueue(tooMany, D, 10, ['a']).fresh).toHaveLength(0);
  });

  it('ignores new, retired and future words when counting due', () => {
    const progress = [newProgress('x'), learning('ret', D, { status: 'retired' }), learning('future', '2099-01-01'), learning('today', D), learning('debt', null as unknown as string, { inDebt: true })];
    expect(countDue(progress, D)).toBe(2);
  });
});

describe('interleave', () => {
  it('spreads the short list through the long one', () => {
    expect(interleave(['a', 'b', 'c', 'd'], ['1', '2'])).toEqual(['a', '1', 'b', 'c', '2', 'd']);
    expect(interleave([], ['1'])).toEqual(['1']);
    expect(interleave(['a'], [])).toEqual(['a']);
    expect(interleave(['a', 'b'], ['1', '2', '3', '4'])).toEqual(['1', 'a', '2', '3', 'b', '4']);
  });
});

describe('levelOrder', () => {
  it('goes up from the start level, then wraps to the bottom', () => {
    expect(levelOrder('B2')).toEqual(['B2', 'C1', 'A1', 'A2', 'B1']);
    expect(levelOrder('A1')).toEqual(['A1', 'A2', 'B1', 'B2', 'C1']);
  });
});
