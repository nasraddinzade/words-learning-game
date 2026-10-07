import { useCallback, useEffect, useRef } from 'react';
import { useNav } from '@/app/nav';
import { useProfile } from '@/app/profileStore';
import { useSpeed } from '@/app/speedStore';
import { TYPING_INPUT_ATTRS, useVisualViewportHeight } from '@/app/viewport';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Screen } from '@/components/Screen';
import { BALANCE } from '@/game/balance';
import { useDevStore } from '@/dev/devStore';

const FEEDBACK_MS = 900;

/** Speed check (SPEC §7): fast typing rounds for words below the start level. */
export function SpeedCheck() {
  const go = useNav((s) => s.go);
  const startLevel = useProfile((s) => s.profile.settings.startLevel);
  const phase = useSpeed((s) => s.phase);
  const state = useSpeed((s) => s.state);
  const typed = useSpeed((s) => s.typed);
  const last = useSpeed((s) => s.last);
  const levels = useSpeed((s) => s.levels);
  const error = useSpeed((s) => s.error);
  const { start, setTyped, submit, next, entry, reset } = useSpeed.getState();
  const devEnabled = useDevStore((s) => s.enabled);
  const currentId = state?.current ?? null;
  const vvHeight = useVisualViewportHeight();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase === 'idle') void start();
    return () => {
      if (useSpeed.getState().phase !== 'finished') reset();
    };
    // Start once on mount; the cleanup resets an abandoned session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === 'playing') inputRef.current?.focus();
  }, [phase, currentId]);

  useEffect(() => {
    if (phase !== 'feedback') return;
    const t = setTimeout(() => next(performance.now()), FEEDBACK_MS);
    return () => clearTimeout(t);
  }, [phase, next]);

  const elapsed = useCallback(() => {
    const { phase: ph, roundStartedAt } = useSpeed.getState();
    return ph === 'playing' ? performance.now() - roundStartedAt : null;
  }, []);
  const onMiss = useCallback(() => useSpeed.getState().submit(null), []);

  if (phase === 'idle' || phase === 'loading' || !state) {
    return (
      <Screen testId="screen-speed" title="Speed check" back>
        <p className="m-auto text-muted">{error ? `Could not start: ${error}` : 'Loading…'}</p>
      </Screen>
    );
  }

  if (phase === 'finished') {
    const total = state.learned.length + state.sentToQueue.length;
    return (
      <Screen testId="screen-speed" title="Speed check" back>
        {total === 0 ? (
          <div className="grid gap-4" data-testid="speed-empty">
            <p className="text-muted">
              {levels.length === 0
                ? `Your start level is ${startLevel}, the lowest one, so there is nothing below it to check.`
                : `No unseen words below ${startLevel} in the base yet (levels ${levels.join(', ')}).`}
            </p>
            <p className="text-sm text-muted">Speed check types words from levels below your start level and counts them as learned when you spell them right.</p>
            <Button onClick={() => go('settings')}>Change start level</Button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-5 py-2" data-testid="speed-summary">
            <h2 className="text-center text-3xl font-black">Done</h2>
            <dl className="grid gap-1 rounded-3xl border border-border bg-surface p-4">
              <div className="flex min-h-10 items-center justify-between">
                <dt className="text-muted">Learned</dt>
                <dd className="text-xl font-bold tabular-nums" data-testid="speed-learned">{state.learned.length}</dd>
              </div>
              <div className="flex min-h-10 items-center justify-between">
                <dt className="text-muted">Sent to the queue</dt>
                <dd className="text-xl font-bold tabular-nums" data-testid="speed-queued">{state.sentToQueue.length}</dd>
              </div>
            </dl>
            {state.sentToQueue.length > 0 && (
              <p className="text-sm text-muted">
                To the queue: {state.sentToQueue.map((id) => entry(id)?.word ?? id).join(', ')}
              </p>
            )}
            <div className="mt-auto grid gap-3">
              <Button variant="primary" size="lg" data-testid="speed-again" onClick={() => void start()}>Next 20</Button>
              <Button data-testid="go-home" onClick={() => go('home')}>Home</Button>
            </div>
          </div>
        )}
      </Screen>
    );
  }

  const current = state.current ? entry(state.current) : undefined;
  const done = state.learned.length + state.sentToQueue.length;
  const total = done + state.queue.length + (state.current ? 1 : 0);
  const lastEntry = last ? entry(last.wordId) : undefined;
  const round = state.current && current ? { wordId: state.current, kind: 'type' as const, fall: [{ id: state.current, lane: Math.floor(BALANCE.lanes / 2), spawnAt: 0 }], fallMs: state.fallMs, revealed: 0 } : null;

  return (
    <main data-testid="screen-speed" className="fixed inset-x-0 top-0 mx-auto flex w-full max-w-[480px] flex-col overflow-hidden bg-bg" style={{ height: vvHeight ?? '100dvh' }}>
      <header className="flex min-h-14 items-center gap-3 px-3 pt-[env(safe-area-inset-top)] text-sm font-semibold">
        <Button variant="ghost" aria-label="Back" className="-ml-2 min-w-12" onClick={() => go('home')}>←</Button>
        <span className="text-accent">Speed check</span>
        <span className="tabular-nums text-muted" data-testid="speed-progress">{done + 1} / {total}</span>
        <span className="ml-auto tabular-nums" data-testid="speed-learned-live">✓ {state.learned.length}</span>
      </header>

      <Field key={state.current ?? 'none'} round={phase === 'feedback' ? null : round} typed={typed} entry={entry} onTap={() => undefined} onMiss={onMiss} elapsed={elapsed} devEnabled={devEnabled} onFieldTap={() => inputRef.current?.focus()} />

      <footer data-testid="explanation" className="relative min-h-24 border-t border-border bg-surface px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        {phase === 'feedback' && last && lastEntry ? (
          <p className={`text-xl font-bold ${last.outcome === 'learned' ? 'text-ok' : 'text-warn'}`} data-testid="speed-feedback" data-outcome={last.outcome}>
            {last.outcome === 'learned' ? `Learned: ${lastEntry.word}` : `To the queue: ${lastEntry.word}`}
          </p>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Type the word, or skip</p>
            <p className="mt-1 text-xl leading-snug" data-testid="definition">{current?.definition ?? '…'}</p>
          </>
        )}
        <div className="mt-2 flex justify-end">
          <Button data-testid="speed-skip" disabled={phase !== 'playing'} onClick={() => submit(null)}>Skip</Button>
        </div>
        {phase === 'playing' && (
          <input
            ref={inputRef}
            data-testid="typing-input"
            aria-label="Type the word"
            className="pointer-events-none absolute left-2 top-2 h-px w-px opacity-0"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (typed.length > 0) submit(typed);
              }
            }}
            {...TYPING_INPUT_ATTRS}
          />
        )}
      </footer>
    </main>
  );
}
