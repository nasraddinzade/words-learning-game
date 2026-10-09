import { describe, expect, it } from 'vitest';
import { displayWord, formatCount } from './format';

describe('formatCount', () => {
  it('groups thousands with a space', () => {
    expect(formatCount(10000)).toBe('10 000');
    expect(formatCount(42)).toBe('42');
  });
});

describe('displayWord', () => {
  it('capitalises the pronoun I and leaves every other word alone', () => {
    expect(displayWord('i')).toBe('I');
    expect(displayWord('in')).toBe('in');
    expect(displayWord('ice')).toBe('ice');
  });
});
