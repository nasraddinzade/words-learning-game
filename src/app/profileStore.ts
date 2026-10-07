import { create } from 'zustand';
import { loadProfile, resetAllData, saveProfile } from '@/db/db';
import { defaultProfile, type Profile, type Settings } from '@/types/progress';
import { TOTAL_WORDS } from '@/content/types';
import { milestonesCrossed } from '@/engine/milestones';
import { recordPlay, type StreakResult } from '@/engine/streak';
import type { DayString } from '@/engine/clock';
import { themeFor, THEMES } from './themes';

export type Celebration = { kind: 'hundred'; value: number } | { kind: 'thousand'; value: number; themeId: string; themeName: string };

export interface GameRecords {
  newBestScore: boolean;
  newBestCombo: boolean;
}

interface ProfileState {
  profile: Profile;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  /** Full-screen celebrations waiting to be shown, oldest first (SPEC §8.2). */
  celebrations: Celebration[];
  /** What the last recordPlay changed, for the summary line. */
  lastStreak: StreakResult | null;
  init(): Promise<void>;
  update(patch: Partial<Profile>): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  /** Changes the learned counter and queues the celebrations it earns. */
  addLearned(delta: number): Promise<void>;
  setLearnedCount(n: number): Promise<void>;
  dismissCelebration(): void;
  recordPlay(today: DayString): Promise<StreakResult>;
  recordGameEnd(score: number, bestCombo: number): Promise<GameRecords>;
  resetEverything(): Promise<void>;
}

export const useProfile = create<ProfileState>((set, get) => ({
  profile: defaultProfile(),
  status: 'loading',
  error: null,
  celebrations: [],
  lastStreak: null,

  init: async () => {
    try {
      const profile = await loadProfile();
      set({ profile, status: 'ready', error: null });
    } catch (e) {
      // IndexedDB can be unavailable (private mode, storage blocked). Play with defaults.
      set({ profile: defaultProfile(), status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  },

  update: async (patch) => {
    const profile = { ...get().profile, ...patch };
    set({ profile });
    try {
      await saveProfile(profile);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  updateSettings: async (patch) => {
    await get().update({ settings: { ...get().profile.settings, ...patch } });
  },

  addLearned: async (delta) => {
    const prev = get().profile.learnedCount;
    await get().setLearnedCount(prev + delta);
  },

  setLearnedCount: async (n) => {
    const { profile, celebrations } = get();
    const prev = profile.learnedCount;
    const learnedCount = Math.max(0, Math.min(TOTAL_WORDS, Math.trunc(n)));
    const crossed = milestonesCrossed(prev, learnedCount);
    const queued: Celebration[] = [];
    const unlockedThemes = profile.unlockedThemes.slice();
    for (const t of crossed.thousands) {
      const theme = themeFor(t);
      if (!theme) continue;
      if (!unlockedThemes.includes(theme.id)) unlockedThemes.push(theme.id);
      queued.push({ kind: 'thousand', value: t, themeId: theme.id, themeName: theme.name });
    }
    if (crossed.hundred !== null) queued.unshift({ kind: 'hundred', value: crossed.hundred });
    // Themes below the counter are always available (e.g. after an import).
    for (const theme of THEMES) if (theme.unlockAt <= learnedCount && !unlockedThemes.includes(theme.id)) unlockedThemes.push(theme.id);
    set({ celebrations: [...celebrations, ...queued] });
    await get().update({ learnedCount, unlockedThemes });
  },

  dismissCelebration: () => set({ celebrations: get().celebrations.slice(1) }),

  recordPlay: async (today) => {
    const { profile } = get();
    const result = recordPlay({ streak: profile.streak, freezes: profile.freezes, lastPlayedDay: profile.lastPlayedDay }, today);
    set({ lastStreak: result });
    if (result.extended) await get().update({ streak: result.streak, freezes: result.freezes, lastPlayedDay: result.lastPlayedDay });
    return result;
  },

  recordGameEnd: async (score, bestCombo) => {
    const { profile } = get();
    const newBestScore = score > profile.bestScore;
    const newBestCombo = bestCombo > profile.bestCombo;
    if (newBestScore || newBestCombo) {
      await get().update({ bestScore: Math.max(profile.bestScore, score), bestCombo: Math.max(profile.bestCombo, bestCombo) });
    }
    return { newBestScore, newBestCombo };
  },

  resetEverything: async () => {
    await resetAllData();
    set({ profile: defaultProfile(), error: null, celebrations: [], lastStreak: null });
  },
}));
