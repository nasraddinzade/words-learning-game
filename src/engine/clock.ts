/**
 * Calendar-day helpers. Everything that depends on "today" takes the day as a parameter,
 * so tests and the dev panel can move time (SPEC §6, §13).
 */

/** Local calendar day as YYYY-MM-DD. */
export type DayString = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toLocalDay(date: Date): DayString {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDay(day: DayString): Date {
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d) throw new Error(`Bad day string: ${day}`);
  return new Date(y, m - 1, d);
}

export function addDays(day: DayString, n: number): DayString {
  const date = parseDay(day);
  date.setDate(date.getDate() + n);
  return toLocalDay(date);
}

/** Whole days from a to b (positive when b is later). DST-safe because it rounds. */
export function daysBetween(a: DayString, b: DayString): number {
  const ms = parseDay(b).getTime() - parseDay(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function isValidDay(day: unknown): day is DayString {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  try {
    return toLocalDay(parseDay(day)) === day;
  } catch {
    return false;
  }
}

export interface Clock {
  /** Milliseconds, monotonic enough for game timing. */
  now(): number;
  /** Local calendar day, including any dev offset. */
  today(): DayString;
}

export interface ClockOptions {
  now?: () => number;
  wallClock?: () => Date;
  dayOffset?: () => number;
}

export function createClock(opts: ClockOptions = {}): Clock {
  const now = opts.now ?? (() => Date.now());
  const wall = opts.wallClock ?? (() => new Date());
  const offset = opts.dayOffset ?? (() => 0);
  return {
    now,
    today: () => addDays(toLocalDay(wall()), offset()),
  };
}
