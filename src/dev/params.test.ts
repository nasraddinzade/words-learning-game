import { describe, expect, it } from 'vitest';
import { parseDevParams } from './params';

describe('parseDevParams', () => {
  it('returns defaults without params', () => {
    expect(parseDevParams('', true)).toEqual({ seed: null, speed: 1 });
  });
  it('reads seed and speed', () => {
    expect(parseDevParams('?seed=42&speed=0.5', true)).toEqual({ seed: '42', speed: 0.5 });
  });
  it('clamps speed and ignores garbage', () => {
    expect(parseDevParams('?speed=0', true).speed).toBe(1);
    expect(parseDevParams('?speed=abc', true).speed).toBe(1);
    expect(parseDevParams('?speed=100', true).speed).toBe(5);
    expect(parseDevParams('?speed=0.001', true).speed).toBe(0.05);
  });
  it('ignores everything when dev tools are off', () => {
    expect(parseDevParams('?seed=42&speed=0.5', false)).toEqual({ seed: null, speed: 1 });
  });
});
