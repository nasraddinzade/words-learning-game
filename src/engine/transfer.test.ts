import { describe, expect, it } from 'vitest';
import { buildExport, parseImport } from './transfer';
import { defaultProfile } from '@/types/progress';
import { newProgress } from './scheduler';

const profile = { ...defaultProfile(), learnedCount: 42, streak: 3 };
const rows = [
  { ...newProgress('a-v'), step: 2 as const, status: 'learning' as const, dueDay: '2026-10-08', flagged: true },
  { ...newProgress('b-n'), step: 4 as const, status: 'learned' as const, learnedDay: '2026-10-01', dueDay: '2026-10-22' },
];

describe('export / import', () => {
  it('round-trips and lists flagged ids', () => {
    const file = buildExport(profile, rows, '2026-10-07T10:00:00Z');
    expect(file.flagged).toEqual(['a-v']);
    const parsed = parseImport(JSON.parse(JSON.stringify(file)));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.learnedInFile).toBe(42);
    expect(parsed.file.progress).toEqual(rows);
    expect(parsed.file.profile).toEqual(profile);
  });

  it('rejects foreign, broken and future files with a readable reason', () => {
    expect(parseImport('x')).toEqual({ ok: false, error: 'This is not a JSON object.' });
    expect(parseImport({ hello: 1 }).ok).toBe(false);
    expect(parseImport({ app: 'words-learning-game', version: 99, profile: {}, progress: [] })).toMatchObject({ ok: false, error: expect.stringContaining('version 99') });
    expect(parseImport({ app: 'words-learning-game', version: 1, profile: profile, progress: [{ wordId: 'x', step: 9 }] })).toMatchObject({ ok: false, error: expect.stringContaining('row 1') });
    expect(parseImport({ app: 'words-learning-game', version: 1, profile: { ...profile, learnedCount: -1 }, progress: [] })).toMatchObject({ ok: false });
    expect(parseImport({ app: 'words-learning-game', version: 1, profile, progress: [rows[0], rows[0]] })).toMatchObject({ ok: false, error: expect.stringContaining('duplicate') });
  });

  it('fills missing optional fields with defaults', () => {
    const parsed = parseImport({
      app: 'words-learning-game',
      version: 1,
      profile: { learnedCount: 1, streak: 0, freezes: 0, lastPlayedDay: null, settings: { startLevel: 'ZZ', newPerGame: 7 } },
      progress: [{ wordId: 'a-v', step: 1, status: 'learning', dueDay: null, lastAdvanceDay: null, learnedDay: null, checksPassed: 0, confusedWith: [] }],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.file.profile.settings.startLevel).toBe('B2');
    expect(parsed.file.profile.settings.newPerGame).toBe(10);
    expect(parsed.file.profile.theme).toBe('neon');
    expect(parsed.file.progress[0]?.lapses).toBe(0);
    expect(parsed.file.progress[0]?.flagged).toBe(false);
  });
});
