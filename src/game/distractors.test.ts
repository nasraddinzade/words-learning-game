import { describe, expect, it } from 'vitest';
import type { WordEntry } from '@/content/types';
import { createRng } from '@/engine/rng';
import { levenshtein, pickDistractors } from './distractors';

const mk = (word: string, pos: WordEntry['pos'], rank: number, topic = 'actions', avoid: string[] = []): WordEntry => ({
  id: `${word}-${pos}`,
  word,
  pos,
  rank,
  level: 'B2',
  topic,
  definition: 'd',
  sentence: `{${word}} x y z a b`,
  translation: 'п',
  avoid,
});

const target = mk('decline', 'verb', 4100, 'communication', ['reject']);
const pool = [
  target,
  mk('reject', 'verb', 4101, 'communication'), // in avoid
  mk('refuse', 'verb', 4102, 'communication'),
  mk('declare', 'verb', 4103, 'law'), // spelling close
  mk('decide', 'verb', 4104, 'thinking'),
  mk('assemble', 'verb', 4105, 'home'),
  mk('grumble', 'verb', 4106, 'actions'),
  mk('far', 'verb', 9000, 'actions'), // out of rank window
  mk('decline', 'noun', 4107, 'communication'), // same word, other pos
  mk('anxiety', 'noun', 4108, 'feelings'),
];

describe('pickDistractors', () => {
  it('keeps the same pos, skips avoid and the target, prefers close ranks', () => {
    const out = pickDistractors({ target, pool, count: 5, step: 1, confusedWith: [], weak: new Set(), rng: createRng(1) });
    const ids = out.map((e) => e.id);
    expect(ids).toHaveLength(5);
    expect(ids).not.toContain('decline-verb');
    expect(ids).not.toContain('decline-noun');
    expect(ids).not.toContain('reject-verb');
    expect(ids).not.toContain('anxiety-noun');
    expect(ids).not.toContain('far-verb');
  });

  it('falls back to the whole pos when the rank window is too small', () => {
    const out = pickDistractors({ target, pool, count: 6, step: 1, confusedWith: [], weak: new Set(), rng: createRng(1) });
    expect(out.map((e) => e.id)).toContain('far-verb');
  });

  it('puts the confusion list first, then look-alikes on step 2', () => {
    const out = pickDistractors({ target, pool, count: 3, step: 2, confusedWith: ['assemble-verb'], weak: new Set(), rng: createRng(7) });
    const ids = out.map((e) => e.id);
    expect(ids[0]).toBe('assemble-verb');
    // look-alikes: refuse (same topic), declare and decide (levenshtein 2)
    for (const id of ids.slice(1)) expect(['declare-verb', 'refuse-verb', 'decide-verb']).toContain(id);
  });

  it('prefers weak words on step 1', () => {
    const out = pickDistractors({ target, pool, count: 1, step: 1, confusedWith: [], weak: new Set(['grumble-verb']), rng: createRng(3) });
    expect(out[0]?.id).toBe('grumble-verb');
  });

  it('is deterministic for a seed', () => {
    const a = pickDistractors({ target, pool, count: 4, step: 1, confusedWith: [], weak: new Set(), rng: createRng('s') }).map((e) => e.id);
    const b = pickDistractors({ target, pool, count: 4, step: 1, confusedWith: [], weak: new Set(), rng: createRng('s') }).map((e) => e.id);
    expect(a).toEqual(b);
  });
});

describe('levenshtein', () => {
  it('counts edits', () => {
    expect(levenshtein('decline', 'declare')).toBe(2);
    expect(levenshtein('odd', 'add')).toBe(1);
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('same', 'same')).toBe(0);
  });
});
