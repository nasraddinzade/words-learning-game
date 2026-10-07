/**
 * Validates every word batch in src/content/words (SPEC §9.5).
 * Stage 0: schema, ids, duplicates, sentence/translation shape, topic list.
 * Stage 1 adds: master-list rank check, definition simplicity threshold, avoid existence, distractor supply.
 *
 * Run: npm run validate-words. Exits 1 on any problem.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { TOPICS } from '../src/content/topics.ts';
import { LEVELS, POS } from '../src/content/types.ts';
import { validateEntries, type Problem } from './validate-words.lib.ts';

const dir = resolve(import.meta.dirname, '..', 'src/content/words');
const files = existsSync(dir) ? readdirSync(dir).filter((f) => /^\d{5}-\d{5}\.json$/.test(f)).sort() : [];

const problems: Problem[] = [];
const all: unknown[] = [];
for (const file of files) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(resolve(dir, file), 'utf8'));
  } catch (e) {
    problems.push({ file, id: '-', message: `invalid JSON: ${e instanceof Error ? e.message : String(e)}` });
    continue;
  }
  if (!Array.isArray(parsed)) {
    problems.push({ file, id: '-', message: 'batch file must be a JSON array' });
    continue;
  }
  all.push(...parsed.map((entry) => ({ entry, file })));
}

problems.push(...validateEntries(all as Array<{ entry: unknown; file: string }>, { topics: TOPICS, levels: LEVELS, pos: POS }));

if (problems.length > 0) {
  for (const p of problems) console.error(`${p.file} ${p.id}: ${p.message}`);
  console.error(`\nvalidate-words: ${problems.length} problem(s) in ${files.length} file(s)`);
  process.exit(1);
}
console.log(`validate-words: ok (${all.length} entries in ${files.length} file(s))`);
