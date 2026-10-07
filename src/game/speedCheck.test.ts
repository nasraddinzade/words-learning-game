import { describe, expect, it } from 'vitest';
import type { WordEntry } from '@/content/types';
import { answerSpeed, createSpeedCheck, nextSpeedWord } from './speedCheck';
import { BALANCE } from './balance';

const D = '2026-10-07';
const e = (word: string, accept?: string[]): WordEntry => ({
  id: `${word}-v`,
  word,
  pos: 'verb',
  rank: 1,
  level: 'A2',
  topic: 'actions',
  definition: 'd',
  sentence: `{${word}} a b c d e`,
  translation: 'п',
  avoid: [],
  ...(accept ? { accept } : {}),
});

describe('speed check', () => {
  it('learns typed words and queues the rest from step 1', () => {
    let s = createSpeedCheck(['go-v', 'run-v', 'colour-v'], 1);
    expect(s.fallMs).toBe(BALANCE.speedCheckFallMs);
    s = nextSpeedWord(s);
    expect(s.current).toBe('go-v');
    let r = answerSpeed(s, e('go'), 'GO', D);
    expect(r.outcome).toBe('learned');
    expect(r.progress.status).toBe('learned');
    expect(r.progress.dueDay).toBe('2026-10-28');
    s = nextSpeedWord(r.state);
    r = answerSpeed(s, e('run'), null, D);
    expect(r.outcome).toBe('queued');
    expect(r.progress.step).toBe(1);
    expect(r.progress.status).toBe('learning');
    expect(r.progress.dueDay).toBe(D);
    s = nextSpeedWord(r.state);
    r = answerSpeed(s, e('colour', ['color']), 'color', D);
    expect(r.outcome).toBe('learned');
    s = nextSpeedWord(r.state);
    expect(s.finished).toBe(true);
    expect(s.learned).toEqual(['go-v', 'colour-v']);
    expect(s.sentToQueue).toEqual(['run-v']);
  });

  it('is finished at once with no words', () => {
    expect(createSpeedCheck([]).finished).toBe(true);
  });
});
