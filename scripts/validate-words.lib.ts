export interface Problem {
  file: string;
  id: string;
  message: string;
}

export interface Rules {
  topics: readonly string[];
  levels: readonly string[];
  pos: readonly string[];
}

const SENTENCE_MIN_WORDS = 6;
const SENTENCE_MAX_WORDS = 14;
const DEFINITION_MAX_WORDS = 15;

const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const isStrArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

/** Pure checker over already-parsed entries so it can be unit-tested. */
export function validateEntries(items: Array<{ entry: unknown; file: string }>, rules: Rules): Problem[] {
  const problems: Problem[] = [];
  const ids = new Map<string, string>();
  const wordPos = new Map<string, string>();

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
    }
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

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
