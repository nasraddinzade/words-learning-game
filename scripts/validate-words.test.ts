import { describe, expect, it } from 'vitest';
import { containsStem, validateEntries } from './validate-words.lib';
import { TOPICS } from '../src/content/topics';
import { LEVELS, POS } from '../src/content/types';

const rules = { topics: TOPICS, levels: LEVELS, pos: POS, minDistractors: 0 };
const good = {
  id: 'reluctant-adj',
  word: 'reluctant',
  pos: 'adj',
  rank: 4321,
  level: 'B2',
  topic: 'feelings',
  definition: 'not wanting to do something, slow to agree',
  sentence: 'I was {reluctant} to tell him the truth.',
  translation: 'Мне не хотелось говорить ему правду.',
  avoid: ['unwilling'],
};

describe('validateEntries', () => {
  it('accepts a good entry', () => {
    expect(validateEntries([{ entry: { ...good, avoid: [] }, file: 'a.json' }], rules)).toEqual([]);
    expect(validateEntries([{ entry: good, file: 'a.json' }], rules).map((p) => p.message)).toEqual(['avoid word "unwilling" does not exist as adj']);
  });

  it('reports schema problems', () => {
    const bad = { ...good, id: 'wrong', pos: 'nope', rank: 0, topic: 'space', translation: 'no cyrillic', avoid: 'x' };
    const msgs = validateEntries([{ entry: bad, file: 'a.json' }], rules).map((p) => p.message);
    expect(msgs).toContain('bad pos: nope');
    expect(msgs).toContain('bad rank: 0');
    expect(msgs).toContain('unknown topic: space');
    expect(msgs).toContain('translation must be in Cyrillic');
    expect(msgs).toContain('avoid must be a string array (may be empty)');
  });

  it('checks id convention and braces', () => {
    const msgs = validateEntries([{ entry: { ...good, id: 'reluctant-a', sentence: 'I was reluctant to tell him the truth.' }, file: 'a.json' }], rules).map(
      (p) => p.message,
    );
    expect(msgs).toContain('id should be "reluctant-adj"');
    expect(msgs).toContain('sentence must contain exactly one {word}, found 0');
  });

  it('rejects the word inside its own definition', () => {
    const msgs = validateEntries([{ entry: { ...good, definition: 'being reluctantly slow' }, file: 'a.json' }], rules).map((p) => p.message);
    expect(msgs).toContain('definition contains the word itself or its stem');
    expect(containsStem('a person who runs', 'run')).toBe(true);
    expect(containsStem('to move fast on foot', 'run')).toBe(false);
  });

  it('finds duplicates across files', () => {
    const msgs = validateEntries(
      [
        { entry: good, file: 'a.json' },
        { entry: { ...good, rank: 4322 }, file: 'b.json' },
      ],
      rules,
    ).map((p) => p.message);
    expect(msgs).toContain('duplicate id (also in a.json)');
    expect(msgs).toContain('duplicate word+pos (also in a.json)');
  });
});

import { buildManifest, isSimpleToken, simpleRatio, validateRelations } from './validate-words.lib';

describe('simple-word ratio', () => {
  const simple = new Set(['to', 'want', 'do', 'something', 'big', 'run', 'quick', 'happy', 'try', 'not']);
  it('maps inflected forms onto list words', () => {
    for (const t of ['wanting', 'wanted', 'wants', 'bigger', 'biggest', 'running', 'quickly', 'happiness', 'tries', 'tried']) {
      expect(isSimpleToken(t, simple), t).toBe(true);
    }
    expect(isSimpleToken('reluctant', simple)).toBe(false);
  });
  it('computes the ratio', () => {
    expect(simpleRatio('not wanting to do something', simple)).toBe(1);
    expect(simpleRatio('reluctant to do something', simple)).toBe(0.75);
  });
});

describe('validateRelations', () => {
  const mk = (word: string, pos: string, rank: number, avoid: string[] = []) => ({ id: `${word}-${pos}`, word, pos, rank, avoid, file: 'f.json' });
  it('requires avoid words to exist with the same pos', () => {
    const msgs = validateRelations([mk('a', 'verb', 1, ['b']), mk('b', 'noun', 2)], { ...rules, minDistractors: 0 }).map((p) => p.message);
    expect(msgs).toContain('avoid word "b" does not exist as verb');
  });
  it('requires a minimum distractor supply within the rank window', () => {
    const entries = [mk('a', 'verb', 1, ['b']), mk('b', 'verb', 2), mk('c', 'verb', 3), mk('d', 'verb', 900)];
    const msgs = validateRelations(entries, { ...rules, minDistractors: 2 }).map((p) => p.message);
    expect(msgs).toContain('only 1 distractors available (min 2)');
    expect(validateRelations(entries, { ...rules, minDistractors: 1 }).map((p) => p.id)).toEqual(['d-verb']);
  });
});

describe('buildManifest', () => {
  it('counts entries per file and level', () => {
    const m = buildManifest([
      { file: '04001-04500.json', level: 'B2', rank: 4001 },
      { file: '04001-04500.json', level: 'B1', rank: 4002 },
      { file: '00001-00500.json', level: 'A1', rank: 1 },
    ]);
    expect(m).toEqual([
      { file: '00001-00500', from: 1, to: 500, count: 1, levels: { A1: 1 } },
      { file: '04001-04500', from: 4001, to: 4500, count: 2, levels: { B2: 1, B1: 1 } },
    ]);
  });
});
