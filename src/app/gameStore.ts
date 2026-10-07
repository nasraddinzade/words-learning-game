import { create } from 'zustand';
import type { WordEntry } from '@/content/types';
import { loadEntriesFor, pickFreshCandidates } from '@/content/loader';
import { db } from '@/db/db';
import { useProfile } from './profileStore';
import { appClock } from './clock';
import { useDevStore } from '@/dev/devStore';
import { createRng, randomSeed } from '@/engine/rng';
import { buildQueue, levelOrder, type QueuePlan } from '@/engine/queue';
import { elapsedFraction } from '@/game/fall';
import { answer, createSession, startRound, type AnswerResult, type SessionContext, type SessionState } from '@/game/session';

export type GamePhase = 'idle' | 'loading' | 'playing' | 'card' | 'paused' | 'finished';

interface GameStore {
  phase: GamePhase;
  session: SessionState | null;
  ctx: SessionContext | null;
  seed: string;
  /** The queue the current game was built from (shown in the dev panel). */
  plan: QueuePlan | null;
  /** performance.now() when the current round started (shifted while paused). */
  roundStartedAt: number;
  pausedAt: number | null;
  lastResult: AnswerResult | null;
  /** Mistakes the player made this game, for the summary list. */
  quitEarly: boolean;
  error: string | null;

  start(): Promise<void>;
  tap(optionId: string, now: number): void;
  miss(now: number): void;
  continueRound(now: number): void;
  pause(now: number): void;
  resume(now: number): void;
  quit(): void;
  entry(id: string): WordEntry | undefined;
  toggleFlag(wordId: string): Promise<void>;
}

export const useGame = create<GameStore>((set, get) => ({
  phase: 'idle',
  session: null,
  ctx: null,
  seed: '',
  plan: null,
  roundStartedAt: 0,
  pausedAt: null,
  lastResult: null,
  quitEarly: false,
  error: null,

  start: async () => {
    set({ phase: 'loading', error: null, lastResult: null, quitEarly: false });
    try {
      const { profile } = useProfile.getState();
      const dev = useDevStore.getState();
      const today = appClock.today();
      const progress = await db.progress.toArray();
      const seen = new Set(progress.map((p) => p.wordId));
      const candidates = await pickFreshCandidates(levelOrder(profile.settings.startLevel), seen, profile.settings.newPerGame);
      const plan = buildQueue(progress, today, profile.settings.newPerGame, candidates);
      const { entries, pool } = await loadEntriesFor(plan.ids);
      const seed = dev.params.seed ?? String(randomSeed());
      const ctx: SessionContext = { entries, pool, rng: createRng(seed), speed: dev.params.speed };
      const session = startRound(createSession(plan.ids, progress), ctx);
      set({ session, ctx, seed, plan, phase: session.finished ? 'finished' : 'playing', roundStartedAt: performance.now(), pausedAt: null });
    } catch (e) {
      set({ phase: 'idle', error: e instanceof Error ? e.message : String(e) });
    }
  },

  tap: (optionId, now) => resolve(get, set, optionId, now),
  miss: (now) => resolve(get, set, null, now),

  continueRound: (now) => {
    const { session, ctx, phase } = get();
    if (!session || !ctx || phase !== 'card') return;
    if (session.finished) {
      set({ phase: 'finished' });
      return;
    }
    const next = startRound(session, ctx);
    set({ session: next, phase: next.finished ? 'finished' : 'playing', roundStartedAt: now, lastResult: null });
  },

  pause: (now) => {
    if (get().phase !== 'playing') return;
    set({ phase: 'paused', pausedAt: now });
  },

  resume: (now) => {
    const { phase, pausedAt, roundStartedAt } = get();
    if (phase !== 'paused') return;
    set({ phase: 'playing', pausedAt: null, roundStartedAt: roundStartedAt + (now - (pausedAt ?? now)) });
  },

  quit: () => {
    const { session } = get();
    if (!session) return;
    set({ phase: 'finished', quitEarly: true, session: { ...session, round: null } });
  },

  entry: (id) => get().ctx?.entries.get(id),

  toggleFlag: async (wordId) => {
    const { session } = get();
    if (!session) return;
    const current = session.progress[wordId];
    if (!current) return;
    const updated = { ...current, flagged: !current.flagged };
    set({ session: { ...session, progress: { ...session.progress, [wordId]: updated } } });
    await db.progress.put(updated);
  },
}));

function resolve(get: () => GameStore, set: (s: Partial<GameStore>) => void, choiceId: string | null, now: number): void {
  const { session, ctx, phase, roundStartedAt } = get();
  if (!session || !ctx || phase !== 'playing' || !session.round) return;
  const round = session.round;
  const word = round.fall.find((f) => f.id === round.wordId);
  const fraction = word ? elapsedFraction(word, now - roundStartedAt, round.fallMs) : 1;
  const { state, result } = answer(session, { choiceId, elapsedFraction: choiceId ? fraction : 1, today: appClock.today(), rng: ctx.rng });
  set({ session: state, lastResult: result, phase: 'card' });

  // Persist after every answer (SPEC §5.6). Failures are logged, never block play.
  void db.progress.put(result.progress).catch((e: unknown) => console.error('progress save failed', e));
  if (result.learnedDelta !== 0) {
    const profile = useProfile.getState();
    void profile.update({ learnedCount: Math.max(0, profile.profile.learnedCount + result.learnedDelta) });
  }
}
