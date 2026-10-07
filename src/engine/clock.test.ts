import { describe, expect, it } from 'vitest';
import { addDays, createClock, daysBetween, isValidDay, toLocalDay } from './clock';

describe('clock', () => {
  it('formats local days', () => {
    expect(toLocalDay(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toLocalDay(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-01-01', 180)).toBe('2026-06-30');
  });

  it('counts days between', () => {
    expect(daysBetween('2026-01-01', '2026-01-22')).toBe(21);
    expect(daysBetween('2026-01-22', '2026-01-01')).toBe(-21);
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31);
  });

  it('validates day strings', () => {
    expect(isValidDay('2026-02-28')).toBe(true);
    expect(isValidDay('2026-02-30')).toBe(false);
    expect(isValidDay('26-02-28')).toBe(false);
    expect(isValidDay(null)).toBe(false);
  });

  it('applies a day offset', () => {
    let offset = 0;
    const clock = createClock({ wallClock: () => new Date(2026, 9, 7, 12), dayOffset: () => offset });
    expect(clock.today()).toBe('2026-10-07');
    offset = 7;
    expect(clock.today()).toBe('2026-10-14');
  });
});
