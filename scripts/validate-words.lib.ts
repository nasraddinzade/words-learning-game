export interface Problem {
  file: string;
  id: string;
  message: string;
}

export interface Rules {
  topics: readonly string[];
  levels: readonly string[];
  pos: readonly string[];
  /** Lower-case words counted as "simple" in definitions (top 2000 by frequency). */
  simpleWords?: ReadonlySet<string>;
  /** Minimum share of simple tokens in a definition. */
  simpleRatio?: number;
  /** word+pos → rank from docs/words/master-list.tsv, when it exists. */
  masterRanks?: ReadonlyMap<string, number>;
  /** Minimum distractor supply per word. */
  minDistractors?: number;
  /** Rank window for distractors. */
  rankWindow?: number;
}

export interface ParsedEntry {
  id: string;
  word: string;
  pos: string;
  rank: number;
  avoid: string[];
  file: string;
}

const SENTENCE_MIN_WORDS = 6;
const SENTENCE_MAX_WORDS = 14;
const DEFINITION_MAX_WORDS = 15;
export const DEFAULT_SIMPLE_RATIO = 0.7;
export const DEFAULT_MIN_DISTRACTORS = 5;
export const DEFAULT_RANK_WINDOW = 300;

const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const isStrArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

/** Pure checker over already-parsed entries so it can be unit-tested. */
export function validateEntries(items: Array<{ entry: unknown; file: string }>, rules: Rules): Problem[] {
  const problems: Problem[] = [];
  const ids = new Map<string, string>();
  const wordPos = new Map<string, string>();
  const parsed: ParsedEntry[] = [];

  for (const { entry, file } of items) {
    const e = entry as Record<string, unknown>;
    const id = isStr(e.id) ? e.id : '?';
    const add = (message: string) => problems.push({ file, id, message });

    if (typeof entry !== 'object' || entry === null) {
      add('entry is not an object');
      continue;
    }
    if (!isStr(e.id)) add('missing id');
    if (!isStr(e.word)) add('missing word');
    else if (e.word !== e.word.toLowerCase()) add('word must be lower case');
    if (!isStr(e.pos) || !rules.pos.includes(e.pos)) add(`bad pos: ${String(e.pos)}`);
    if (typeof e.rank !== 'number' || !Number.isInteger(e.rank) || e.rank < 1 || e.rank > 10_000) add(`bad rank: ${String(e.rank)}`);
    if (!isStr(e.level) || !rules.levels.includes(e.level)) add(`bad level: ${String(e.level)}`);
    if (!isStr(e.topic) || !rules.topics.includes(e.topic)) add(`unknown topic: ${String(e.topic)}`);
    if (!isStrArray(e.avoid)) add('avoid must be a string array (may be empty)');
    if (e.accept !== undefined && !isStrArray(e.accept)) add('accept must be a string array');

    if (isStr(e.id) && isStr(e.word) && isStr(e.pos)) {
      const expected = `${e.word}-${posSuffix(e.pos)}`;
      if (e.id !== expected) add(`id should be "${expected}"`);
    }

    if (isStr(e.definition)) {
      const words = e.definition.trim().split(/\s+/);
      if (words.length > DEFINITION_MAX_WORDS) add(`definition has ${words.length} words (max ${DEFINITION_MAX_WORDS})`);
      if (isStr(e.word) && containsStem(e.definition, e.word)) add('definition contains the word itself or its stem');
      if (rules.simpleWords) {
        const ratio = simpleRatio(e.definition, rules.simpleWords);
        const min = rules.simpleRatio ?? DEFAULT_SIMPLE_RATIO;
        if (ratio < min) add(`definition simple-word ratio ${ratio.toFixed(2)} < ${min} (${hardTokens(e.definition, rules.simpleWords).join(', ')})`);
      }
    } else add('missing definition');

    if (isStr(e.sentence)) {
      const braces = e.sentence.match(/\{[^{}]+\}/g) ?? [];
      if (braces.length !== 1) add(`sentence must contain exactly one {word}, found ${braces.length}`);
      const count = e.sentence.replace(/[{}]/g, '').trim().split(/\s+/).length;
      if (count < SENTENCE_MIN_WORDS || count > SENTENCE_MAX_WORDS) add(`sentence has ${count} words (${SENTENCE_MIN_WORDS}–${SENTENCE_MAX_WORDS})`);
    } else add('missing sentence');

    if (isStr(e.translation)) {
      if (!/[А-Яа-яЁё]/.test(e.translation)) add('translation must be in Cyrillic');
    } else add('missing translation');

    if (isStr(e.id)) {
      const prev = ids.get(e.id);
      if (prev) add(`duplicate id (also in ${prev})`);
      ids.set(e.id, file);
    }
    if (isStr(e.word) && isStr(e.pos)) {
      const key = `${e.word}|${e.pos}`;
      const prev = wordPos.get(key);
      if (prev) add(`duplicate word+pos (also in ${prev})`);
      wordPos.set(key, file);

      if (rules.masterRanks) {
        const expected = rules.masterRanks.get(key);
        if (expected === undefined) add('word+pos is not in master-list');
        else if (expected !== e.rank) add(`rank ${String(e.rank)} differs from master-list ${expected}`);
      }
    }

    if (isStr(e.id) && isStr(e.word) && isStr(e.pos) && typeof e.rank === 'number' && isStrArray(e.avoid)) {
      parsed.push({ id: e.id, word: e.word, pos: e.pos, rank: e.rank, avoid: e.avoid, file });
    }
  }

  problems.push(...validateRelations(parsed, rules));
  return problems;
}

/** Cross-entry checks: avoid words exist with the same pos, every word has enough distractors. */
export function validateRelations(entries: ParsedEntry[], rules: Rules): Problem[] {
  const problems: Problem[] = [];
  const byWordPos = new Map<string, ParsedEntry>();
  for (const e of entries) byWordPos.set(`${e.word}|${e.pos}`, e);
  const byPos = new Map<string, ParsedEntry[]>();
  for (const e of entries) {
    const list = byPos.get(e.pos) ?? [];
    list.push(e);
    byPos.set(e.pos, list);
  }
  const min = rules.minDistractors ?? DEFAULT_MIN_DISTRACTORS;
  const window = rules.rankWindow ?? DEFAULT_RANK_WINDOW;

  for (const e of entries) {
    for (const a of e.avoid) {
      if (a === e.word) problems.push({ file: e.file, id: e.id, message: 'avoid contains the word itself' });
      else if (!byWordPos.has(`${a}|${e.pos}`)) problems.push({ file: e.file, id: e.id, message: `avoid word "${a}" does not exist as ${e.pos}` });
    }
    const avoid = new Set(e.avoid);
    const supply = (byPos.get(e.pos) ?? []).filter((o) => o.id !== e.id && !avoid.has(o.word) && Math.abs(o.rank - e.rank) <= window).length;
    if (supply < min) problems.push({ file: e.file, id: e.id, message: `only ${supply} distractors available (min ${min})` });
  }
  return problems;
}

export function posSuffix(pos: string): string {
  return { noun: 'n', verb: 'v', adj: 'adj', adv: 'adv', prep: 'prep', conj: 'conj', pron: 'pron', det: 'det', interj: 'interj' }[pos] ?? pos;
}

/** True when the definition uses the word or an obvious derivative (run / runs / running / runner). */
export function containsStem(definition: string, word: string): boolean {
  const stem = word.length > 4 ? word.slice(0, -1) : word;
  const re = new RegExp(`\\b${escapeRe(stem)}\\w*`, 'i');
  return re.test(definition);
}

const tokenize = (text: string) => text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];

/** Crude lemmatiser: enough to map "wanting", "tries", "bigger", "quickly" onto list words. */
export function isSimpleToken(token: string, simple: ReadonlySet<string>): boolean {
  const t = token.replace(/'(s|t|re|ve|ll|d|m)$/, '');
  if (t.length <= 2 || simple.has(t)) return true;
  const candidates = new Set<string>();
  for (const [suffix, repl] of [
    ['ies', 'y'], ['ied', 'y'], ['ier', 'y'], ['iest', 'y'], ['ily', 'y'], ['iness', 'y'],
    ['es', ''], ['s', ''], ['ed', ''], ['ed', 'e'], ['ing', ''], ['ing', 'e'], ['er', ''], ['er', 'e'],
    ['est', ''], ['ly', ''], ['ness', ''], ['ful', ''], ['less', ''], ['ment', ''], ['ation', 'e'], ['tion', 't'], ['al', ''], ['able', ''], ['able', 'e'], ['ous', ''],
  ] as const) {
    if (t.endsWith(suffix) && t.length - suffix.length >= 2) candidates.add(t.slice(0, -suffix.length) + repl);
  }
  // doubled consonant: running → run, bigger → big
  const m = t.match(/^(.+?)([bdglmnprt])\2(ing|ed|er|est)$/);
  if (m) candidates.add(m[1]! + m[2]!);
  for (const c of candidates) if (simple.has(c)) return true;
  return false;
}

export function simpleRatio(definition: string, simple: ReadonlySet<string>): number {
  const tokens = tokenize(definition);
  if (tokens.length === 0) return 1;
  const ok = tokens.filter((t) => isSimpleToken(t, simple)).length;
  return ok / tokens.length;
}

export function hardTokens(definition: string, simple: ReadonlySet<string>): string[] {
  return tokenize(definition).filter((t) => !isSimpleToken(t, simple));
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Manifest entry per batch file: what the app needs to find words without loading everything. */
export interface BatchManifest {
  file: string;
  from: number;
  to: number;
  count: number;
  levels: Record<string, number>;
}

export function buildManifest(entries: Array<{ file: string; level: string; rank: number }>): BatchManifest[] {
  const byFile = new Map<string, BatchManifest>();
  for (const e of entries) {
    const name = e.file.replace(/\.json$/, '');
    const [from, to] = name.split('-').map(Number);
    const m = byFile.get(name) ?? { file: name, from: from ?? 0, to: to ?? 0, count: 0, levels: {} };
    m.count += 1;
    m.levels[e.level] = (m.levels[e.level] ?? 0) + 1;
    byFile.set(name, m);
  }
  return [...byFile.values()].sort((a, b) => a.from - b.from);
}
