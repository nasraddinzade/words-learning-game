import { create } from 'zustand';
import type { WordEntry } from '@/content/types';
import { LEVELS } from '@/content/types';
import { loadEntriesFor, pickUnseenOfLevels } from '@/content/loader';
import { db } from '@/db/db';
import { useProfile } from './profileStore';
import { playLearned } from './sound';
import { HAPTIC, vibrate } from './haptics';
import { appClock } from './clock';
import { useDevStore } from '@/dev/devStore';
import { BALANCE } from '@/game/balance';
import { answerSpeed, createSpeedCheck, nextSpeedWord, type SpeedOutcome, type SpeedState } from '@/game/speedCheck';

export type SpeedPhase = 'idle' | 'loading' | 'playing' | 'feedback' | 'finished';

interface SpeedStore {
  phase: SpeedPhase;
  state: SpeedState | null;
  entries: Map<string, WordEntry>;
  typed: string;
  roundStartedAt: number;
  /** Levels the pool was taken from (for the empty-state message). */
  levels: string[];
  last: { wordId: string; outcome: SpeedOutcome; typed: string | null } | null;
  error: string | null;
  start(): Promise<void>;
  setTyped(text: string): void;
  submit(typed: string | null): void;
  next(now: number): void;
  entry(id: string): WordEntry | undefined;
  reset(): void;
}

export const useSpeed = create<SpeedStore>((set, get) => ({
  phase: 'idle',
  state: null,
  entries: new Map(),
  typed: '',
  roundStartedAt: 0,
  levels: [],
  last: null,
  error: null,

  start: async () => {
    set({ phase: 'loading', error: null, last: null, typed: '' });
    try {
      const { profile } = useProfile.getState();
      const dev = useDevStore.getState();
      const below = LEVELS.slice(0, LEVELS.indexOf(profile.settings.startLevel));
      const progress = await db.progress.toArray();
      const seen = new Set(progress.filter((p) => p.status !== 'new').map((p) => p.wordId));
      const ids = await pickUnseenOfLevels(below, seen, BALANCE.speedCheckBatch);
      const { entries } = await loadEntriesFor(ids);
      if (ids.length > 0) await useProfile.getState().recordPlay(appClock.today());
      const state = nextSpeedWord(createSpeedCheck(ids, dev.params.speed));
      set({ state, entries, levels: below.slice(), phase: state.finished ? 'finished' : 'playing', roundStartedAt: performance.now(), typed: '' });
    } catch (e) {
      set({ phase: 'idle', error: e instanceof Error ? e.message : String(e) });
    }
  },

  setTyped: (text) => {
    const { state, phase, entries } = get();
    if (!state?.current || phase !== 'playing') return;
    const clean = text.replace(/[^a-z'-]/gi, '').toLowerCase();
    set({ typed: clean });
    const word = entries.get(state.current)?.word ?? '';
    if (word && clean.length >= word.length) get().submit(clean);
  },

  submit: (typed) => {
    const { state, phase, entries } = get();
    if (!state?.current || phase !== 'playing') return;
    const entry = entries.get(state.current);
    if (!entry) return;
    const today = appClock.today();
    const existing = undefined;
    const { state: next, outcome, progress } = answerSpeed(state, entry, typed, today, existing);
    set({ state: next, phase: 'feedback', last: { wordId: entry.id, outcome, typed } });
    void db.progress.put(progress).catch((e: unknown) => console.error('progress save failed', e));
    if (outcome === 'learned') {
      playLearned();
      vibrate(HAPTIC.learned);
      void useProfile.getState().addLearned(1);
    }
  },

  next: (now) => {
    const { state, phase } = get();
    if (!state || phase !== 'feedback') return;
    const advanced = nextSpeedWord(state);
    set({ state: advanced, phase: advanced.finished ? 'finished' : 'playing', roundStartedAt: now, typed: '', last: null });
  },

  entry: (id) => get().entries.get(id),
  reset: () => set({ phase: 'idle', state: null, last: null, typed: '' }),
}));
