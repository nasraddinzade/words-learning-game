/**
 * Validates every word batch in src/content/words (SPEC §9.5) and, when everything is valid,
 * regenerates src/content/manifest.json (per-batch counts the app uses to find words).
 *
 * Run: npm run validate-words. Exits 1 on any problem.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TOPICS } from '../src/content/topics.ts';
import { LEVELS, POS } from '../src/content/types.ts';
import { buildManifest, validateEntries, type Problem } from './validate-words.lib.ts';

const root = resolve(import.meta.dirname, '..');
const dir = resolve(root, 'src/content/words');
const files = existsSync(dir) ? readdirSync(dir).filter((f) => /^\d{5}-\d{5}\.json$/.test(f)).sort() : [];

const simpleWords = new Set(
  readFileSync(resolve(root, 'scripts/data/simple-words.txt'), 'utf8')
    .split('\n')
    .map((w) => w.trim())
    .filter(Boolean),
);

const masterPath = resolve(root, 'docs/words/master-list.tsv');
let masterRanks: Map<string, number> | undefined;
if (existsSync(masterPath)) {
  masterRanks = new Map();
  for (const line of readFileSync(masterPath, 'utf8').split('\n').slice(1)) {
    const [word, pos, rank] = line.split('\t');
    if (word && pos && rank) masterRanks.set(`${word}|${pos}`, Number(rank));
  }
} else {
  console.log('validate-words: docs/words/master-list.tsv not found, rank check skipped (starter set has provisional ranks)');
}

const problems: Problem[] = [];
const all: Array<{ entry: unknown; file: string }> = [];
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
  for (const entry of parsed) {
    const e = entry as { rank?: unknown };
    const [from, to] = file.replace('.json', '').split('-').map(Number);
    if (typeof e.rank === 'number' && from !== undefined && to !== undefined && (e.rank < from || e.rank > to)) {
      problems.push({ file, id: String((entry as { id?: unknown }).id ?? '?'), message: `rank ${e.rank} is outside the file range ${from}-${to}` });
    }
    all.push({ entry, file });
  }
}

problems.push(...validateEntries(all, { topics: TOPICS, levels: LEVELS, pos: POS, simpleWords, masterRanks }));

if (problems.length > 0) {
  for (const p of problems) console.error(`${p.file} ${p.id}: ${p.message}`);
  console.error(`\nvalidate-words: ${problems.length} problem(s) in ${files.length} file(s)`);
  process.exit(1);
}

const manifest = buildManifest(all.map(({ entry, file }) => ({ file, level: (entry as { level: string }).level, rank: (entry as { rank: number }).rank })));
writeFileSync(resolve(root, 'src/content/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const index: Record<string, string> = {};
for (const { entry, file } of all) index[(entry as { id: string }).id] = file.replace(/\.json$/, '');
writeFileSync(resolve(root, 'src/content/word-index.json'), JSON.stringify(index) + '\n');
console.log(`validate-words: ok (${all.length} entries in ${files.length} file(s)), manifest and word index written`);
