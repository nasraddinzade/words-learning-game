import { describe, expect, it } from 'vitest';
import { createRng, hashSeed } from './rng';

describe('rng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng('42');
    const b = createRng('42');
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('differs for different seeds', () => {
    expect(createRng('a').next()).not.toBe(createRng('b').next());
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
  });

  it('keeps int within bounds and covers the range', () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = rng.int(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect(seen.size).toBe(6);
  });

  it('shuffles without losing items', () => {
    const rng = createRng('shuffle');
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = rng.shuffle(items);
    expect(out).toHaveLength(8);
    expect([...out].sort((x, y) => x - y)).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
