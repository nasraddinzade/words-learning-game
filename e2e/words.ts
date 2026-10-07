import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { WordEntry } from '../src/content/types';

/** All word entries in the base, read from disk (the tests check the game against the data). */
export function loadWords(): WordEntry[] {
  const dir = resolve(import.meta.dirname, '../src/content/words');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .flatMap((f) => JSON.parse(readFileSync(resolve(dir, f), 'utf8')) as WordEntry[]);
}
