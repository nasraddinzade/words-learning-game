import { describe, expect, it } from 'vitest';
import { recordPlay } from './streak';
import { addDays } from './clock';

const D = '2026-10-07';

describe('recordPlay', () => {
  it('starts at 1 and grows day by day', () => {
    let s = recordPlay({ streak: 0, freezes: 0, lastPlayedDay: null }, D);
    expect(s.streak).toBe(1);
    expect(s.extended).toBe(true);
    s = recordPlay(s, addDays(D, 1));
    expect(s.streak).toBe(2);
    expect(recordPlay(s, addDays(D, 1)).extended).toBe(false);
    expect(recordPlay(s, addDays(D, 1)).streak).toBe(2);
  });

  it('earns a freeze every 7 days', () => {
    let s = recordPlay({ streak: 0, freezes: 0, lastPlayedDay: null }, D);
    for (let i = 1; i < 7; i++) s = recordPlay(s, addDays(D, i));
    expect(s.streak).toBe(7);
    expect(s.freezes).toBe(1);
    expect(s.freezeEarned).toBe(true);
    s = recordPlay(s, addDays(D, 7));
    expect(s.freezeEarned).toBe(false);
    for (let i = 8; i < 14; i++) s = recordPlay(s, addDays(D, i));
    expect(s.streak).toBe(14);
    expect(s.freezes).toBe(2);
  });

  it('a freeze covers a missed day; without one the streak restarts', () => {
    const withFreeze = recordPlay({ streak: 7, freezes: 1, lastPlayedDay: D }, addDays(D, 2));
    expect(withFreeze.streak).toBe(8);
    expect(withFreeze.freezes).toBe(0);
    expect(withFreeze.freezesUsed).toBe(1);
    expect(withFreeze.restarted).toBe(false);

    const twoMissed = recordPlay({ streak: 7, freezes: 1, lastPlayedDay: D }, addDays(D, 3));
    expect(twoMissed.streak).toBe(1);
    expect(twoMissed.restarted).toBe(true);
    expect(twoMissed.freezes).toBe(1);

    const none = recordPlay({ streak: 3, freezes: 0, lastPlayedDay: D }, addDays(D, 2));
    expect(none.streak).toBe(1);
    expect(none.restarted).toBe(true);
  });

  it('keeps the streak when the clock goes backwards', () => {
    const s = recordPlay({ streak: 4, freezes: 0, lastPlayedDay: D }, addDays(D, -1));
    expect(s.streak).toBe(4);
    expect(s.lastPlayedDay).toBe(addDays(D, -1));
  });
});
