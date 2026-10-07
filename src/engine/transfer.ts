import type { Profile, WordProgress } from '@/types/progress';
import { defaultProfile } from '@/types/progress';
import { LEVELS, NEW_PER_GAME_OPTIONS } from '@/content/types';
import { isValidDay } from './clock';

/** The export file (SPEC §10). Bump the version when the shape changes. */
export const EXPORT_VERSION = 1;

export interface ExportFile {
  app: 'words-learning-game';
  version: number;
  exportedAt: string;
  profile: Profile;
  progress: WordProgress[];
  /** Ids the player marked with Bad card (SPEC §9.6). */
  flagged: string[];
}

export function buildExport(profile: Profile, progress: readonly WordProgress[], exportedAt: string): ExportFile {
  return {
    app: 'words-learning-game',
    version: EXPORT_VERSION,
    exportedAt,
    profile,
    progress: progress.slice(),
    flagged: progress.filter((p) => p.flagged).map((p) => p.wordId).sort(),
  };
}

export type ParseResult = { ok: true; file: ExportFile; learnedInFile: number } | { ok: false; error: string };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isDayOrNull = (v: unknown) => v === null || isValidDay(v);

/** Validates an export file strictly enough that a wrong or broken file can never corrupt progress. */
export function parseImport(raw: unknown): ParseResult {
  if (!isRecord(raw)) return { ok: false, error: 'This is not a JSON object.' };
  if (raw.app !== 'words-learning-game') return { ok: false, error: 'This file was not exported by Words Learning Game.' };
  if (raw.version !== EXPORT_VERSION) return { ok: false, error: `Unsupported file version ${String(raw.version)} (expected ${EXPORT_VERSION}).` };
  if (!isRecord(raw.profile)) return { ok: false, error: 'The profile section is missing.' };
  if (!Array.isArray(raw.progress)) return { ok: false, error: 'The progress section is missing.' };

  const profile = parseProfile(raw.profile);
  if (!profile.ok) return profile;

  const progress: WordProgress[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < raw.progress.length; i++) {
    const row = parseProgress(raw.progress[i]);
    if (!row.ok) return { ok: false, error: `Progress row ${i + 1}: ${row.error}` };
    if (seen.has(row.value.wordId)) return { ok: false, error: `Progress row ${i + 1}: duplicate word ${row.value.wordId}.` };
    seen.add(row.value.wordId);
    progress.push(row.value);
  }
  const flagged = Array.isArray(raw.flagged) && raw.flagged.every(isStr) ? (raw.flagged as string[]) : progress.filter((p) => p.flagged).map((p) => p.wordId);
  const file: ExportFile = {
    app: 'words-learning-game',
    version: EXPORT_VERSION,
    exportedAt: isStr(raw.exportedAt) ? raw.exportedAt : '',
    profile: profile.value,
    progress,
    flagged,
  };
  return { ok: true, file, learnedInFile: profile.value.learnedCount };
}

function parseProfile(p: Record<string, unknown>): { ok: true; value: Profile } | { ok: false; error: string } {
  const base = defaultProfile();
  const settings = isRecord(p.settings) ? p.settings : {};
  const startLevel = (LEVELS as readonly string[]).includes(String(settings.startLevel)) ? (settings.startLevel as Profile['settings']['startLevel']) : base.settings.startLevel;
  const newPerGame = (NEW_PER_GAME_OPTIONS as readonly number[]).includes(Number(settings.newPerGame)) ? (settings.newPerGame as Profile['settings']['newPerGame']) : base.settings.newPerGame;
  if (!isInt(p.learnedCount) || p.learnedCount < 0) return { ok: false, error: 'learnedCount must be a whole number.' };
  if (!isInt(p.streak) || !isInt(p.freezes) || p.streak < 0 || p.freezes < 0) return { ok: false, error: 'streak and freezes must be whole numbers.' };
  if (!isDayOrNull(p.lastPlayedDay)) return { ok: false, error: 'lastPlayedDay is not a valid day.' };
  const value: Profile = {
    learnedCount: p.learnedCount,
    streak: p.streak,
    freezes: p.freezes,
    lastPlayedDay: (p.lastPlayedDay as string | null) ?? null,
    bestCombo: isInt(p.bestCombo) ? p.bestCombo : 0,
    bestScore: isInt(p.bestScore) ? p.bestScore : 0,
    unlockedThemes: Array.isArray(p.unlockedThemes) && p.unlockedThemes.every(isStr) ? (p.unlockedThemes as string[]) : base.unlockedThemes,
    theme: isStr(p.theme) ? p.theme : base.theme,
    settings: {
      startLevel,
      newPerGame,
      sound: typeof settings.sound === 'boolean' ? settings.sound : base.settings.sound,
      vibration: typeof settings.vibration === 'boolean' ? settings.vibration : base.settings.vibration,
      autoSpeak: typeof settings.autoSpeak === 'boolean' ? settings.autoSpeak : base.settings.autoSpeak,
      voice: isStr(settings.voice) ? settings.voice : null,
    },
  };
  return { ok: true, value };
}

function parseProgress(v: unknown): { ok: true; value: WordProgress } | { ok: false; error: string } {
  if (!isRecord(v)) return { ok: false, error: 'not an object.' };
  if (!isStr(v.wordId) || v.wordId.length === 0) return { ok: false, error: 'wordId missing.' };
  if (!isInt(v.step) || v.step < 0 || v.step > 4) return { ok: false, error: 'step must be 0-4.' };
  if (!['new', 'learning', 'learned', 'retired'].includes(String(v.status))) return { ok: false, error: 'bad status.' };
  if (!isDayOrNull(v.dueDay) || !isDayOrNull(v.lastAdvanceDay) || !isDayOrNull(v.learnedDay)) return { ok: false, error: 'a day field is not YYYY-MM-DD.' };
  if (!isInt(v.checksPassed) || v.checksPassed < 0 || v.checksPassed > 3) return { ok: false, error: 'checksPassed must be 0-3.' };
  if (!Array.isArray(v.confusedWith) || !v.confusedWith.every(isStr)) return { ok: false, error: 'confusedWith must be a list of ids.' };
  return {
    ok: true,
    value: {
      wordId: v.wordId,
      step: v.step as WordProgress['step'],
      status: v.status as WordProgress['status'],
      dueDay: (v.dueDay as string | null) ?? null,
      lastAdvanceDay: (v.lastAdvanceDay as string | null) ?? null,
      lapses: isInt(v.lapses) && v.lapses >= 0 ? v.lapses : 0,
      inDebt: v.inDebt === true,
      skipCandidate: v.skipCandidate === true,
      confusedWith: (v.confusedWith as string[]).slice(0, 5),
      learnedDay: (v.learnedDay as string | null) ?? null,
      checksPassed: v.checksPassed as WordProgress['checksPassed'],
      flagged: v.flagged === true,
    },
  };
}
