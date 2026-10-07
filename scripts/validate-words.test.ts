import { describe, expect, it } from 'vitest';
import { containsStem, validateEntries } from './validate-words.lib';
import { TOPICS } from '../src/content/topics';
import { LEVELS, POS } from '../src/content/types';

const rules = { topics: TOPICS, levels: LEVELS, pos: POS };
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
    expect(validateEntries([{ entry: good, file: 'a.json' }], rules)).toEqual([]);
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
