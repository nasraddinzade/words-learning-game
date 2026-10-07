import type { Level, NewPerGame } from '@/content/types';

/** Per-word learning state (SPEC §10). */
export interface WordProgress {
  wordId: string;
  step: 0 | 1 | 2 | 3 | 4; // 0 = never seen
  status: 'new' | 'learning' | 'learned' | 'retired';
  dueDay: string | null; // YYYY-MM-DD, local day
  lastAdvanceDay: string | null;
  lapses: number;
  inDebt: boolean;
  skipCandidate: boolean;
  confusedWith: string[]; // up to 5
  learnedDay: string | null;
  checksPassed: 0 | 1 | 2 | 3;
  flagged: boolean;
}

export interface Settings {
  startLevel: Level;
  newPerGame: NewPerGame;
  sound: boolean;
  vibration: boolean;
  autoSpeak: boolean;
  voice: string | null;
}

export interface Profile {
  learnedCount: number;
  streak: number;
  freezes: number;
  lastPlayedDay: string | null;
  bestCombo: number;
  bestScore: number;
  unlockedThemes: string[];
  theme: string;
  settings: Settings;
}

export const DEFAULT_THEME = 'neon';

export function defaultProfile(): Profile {
  return {
    learnedCount: 0,
    streak: 0,
    freezes: 0,
    lastPlayedDay: null,
    bestCombo: 0,
    bestScore: 0,
    unlockedThemes: [DEFAULT_THEME],
    theme: DEFAULT_THEME,
    settings: {
      startLevel: 'B2',
      newPerGame: 10,
      sound: true,
      vibration: true,
      autoSpeak: true,
      voice: null,
    },
  };
}
