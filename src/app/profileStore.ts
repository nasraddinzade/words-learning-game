import { create } from 'zustand';
import { loadProfile, resetAllData, saveProfile } from '@/db/db';
import { defaultProfile, type Profile, type Settings } from '@/types/progress';
import { TOTAL_WORDS } from '@/content/types';

interface ProfileState {
  profile: Profile;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  init(): Promise<void>;
  update(patch: Partial<Profile>): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  setLearnedCount(n: number): Promise<void>;
  resetEverything(): Promise<void>;
}

export const useProfile = create<ProfileState>((set, get) => ({
  profile: defaultProfile(),
  status: 'loading',
  error: null,

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

  setLearnedCount: async (n) => {
    const learnedCount = Math.max(0, Math.min(TOTAL_WORDS, Math.trunc(n)));
    await get().update({ learnedCount });
  },

  resetEverything: async () => {
    await resetAllData();
    set({ profile: defaultProfile(), error: null });
  },
}));
