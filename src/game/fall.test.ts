import { describe, expect, it } from 'vitest';
import { createRng } from '@/engine/rng';
import { elapsedFraction, planFall, positionsAt } from './fall';

describe('planFall', () => {
  it('deals lanes round-robin and spreads spawns inside the first part of the fall', () => {
    const plan = planFall(['a', 'b', 'c', 'd', 'e', 'f'], 10_000, createRng(1), 3);
    const lanes = plan.map((w) => w.lane);
    expect(new Set(lanes.slice(0, 3)).size).toBe(3);
    expect(lanes[3]).toBe(lanes[0]);
    expect(plan[0]?.spawnAt).toBe(0);
    expect(plan[5]?.spawnAt).toBe(3000);
    // same-lane neighbours are three spawns apart: 1800 ms = 18% of the field, more than a chip
    expect((plan[3]?.spawnAt ?? 0) - (plan[0]?.spawnAt ?? 0)).toBe(1800);
  });

  it('handles a single word', () => {
    expect(planFall(['a'], 5000, createRng(1))).toEqual([{ id: 'a', lane: expect.any(Number), spawnAt: 0 }]);
  });
});

describe('positionsAt', () => {
  const words = [
    { id: 'a', lane: 0, spawnAt: 0 },
    { id: 'b', lane: 1, spawnAt: 2000 },
  ];
  it('reports unspawned, moving and fallen words', () => {
    expect(positionsAt(words, 1000, 4000)).toEqual([
      { id: 'a', lane: 0, y: 0.25, fallen: false },
      { id: 'b', lane: 1, y: null, fallen: false },
    ]);
    expect(positionsAt(words, 4000, 4000)[0]).toEqual({ id: 'a', lane: 0, y: 1, fallen: true });
    expect(positionsAt(words, 4000, 4000)[1]).toEqual({ id: 'b', lane: 1, y: 0.5, fallen: false });
  });
  it('computes the elapsed fraction for a tap', () => {
    expect(elapsedFraction(words[1]!, 3000, 4000)).toBe(0.25);
    expect(elapsedFraction(words[1]!, 1000, 4000)).toBe(0);
    expect(elapsedFraction(words[0]!, 9000, 4000)).toBe(1);
  });
});
