import { describe, expect, it } from 'vitest';
import { milestonesCrossed } from './milestones';

describe('milestonesCrossed', () => {
  it('reports a hundred when crossed', () => {
    expect(milestonesCrossed(99, 100)).toEqual({ hundred: 100, thousands: [] });
    expect(milestonesCrossed(100, 101)).toEqual({ hundred: null, thousands: [] });
    expect(milestonesCrossed(150, 199)).toEqual({ hundred: null, thousands: [] });
  });
  it('reports thousands and the theme they unlock, not the hundred inside', () => {
    expect(milestonesCrossed(999, 1000)).toEqual({ hundred: null, thousands: [1000] });
    expect(milestonesCrossed(0, 1234)).toEqual({ hundred: 1200, thousands: [1000] });
    expect(milestonesCrossed(950, 2050)).toEqual({ hundred: null, thousands: [1000, 2000] });
  });
  it('ignores decreases and clamps to the total', () => {
    expect(milestonesCrossed(100, 99)).toEqual({ hundred: null, thousands: [] });
    expect(milestonesCrossed(9999, 12000)).toEqual({ hundred: null, thousands: [10000] });
  });
});
