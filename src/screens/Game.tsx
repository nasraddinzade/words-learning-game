import { useCallback, useEffect, useRef, useState } from 'react';
import { useNav } from '@/app/nav';
import { useProfile } from '@/app/profileStore';
import { useGame } from '@/app/gameStore';
import { formatCount } from '@/app/format';
import { TYPING_INPUT_ATTRS, useVisualViewportHeight } from '@/app/viewport';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { WordCard, type CardVerdict } from '@/components/WordCard';
import { BALANCE, comboTier } from '@/game/balance';
import { isLastRound, type Round } from '@/game/session';
import { TOTAL_WORDS } from '@/content/types';
import { useDevStore } from '@/dev/devStore';

function hintFor(round: Round | null): string {
  if (!round) return '';
  if (round.isSkipCheck) return 'You knew it fast. Type it to learn it now';
  if (round.isCheck) return 'Still remember it? Type the word';
  if (round.kind === 'type') return round.revealed > 0 ? 'Type the word. First letter is shown' : 'Type the word';
  if (round.isDebtReturn) return 'It came back. Catch it this time';
  if (round.isNew) return 'New word. Tap the one that fits';
  return 'Tap the word that fits';
}

function verdictFor(correct: boolean, outcome: string, missed: boolean, kind: string, lifeLost: boolean): CardVerdict {
  if (correct) return outcome === 'learned' ? 'learned' : 'correct';
  if (!lifeLost) return 'skipFailed';
  if (missed) return 'missed';
  return kind === 'type' ? 'typo' : 'wrong';
}

/** How long the learned word flies before the card appears. */
const FLIGHT_MS = 800;

interface Flight {
  word: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

export function Game() {
  const go = useNav((s) => s.go);
  const learned = useProfile((s) => s.profile.learnedCount);
  const phase = useGame((s) => s.phase);
  const session = useGame((s) => s.session);
  const lastResult = useGame((s) => s.lastResult);
  const typed = useGame((s) => s.typed);
  const error = useGame((s) => s.error);
  const { tap, miss, continueRound, pause, resume, quit, entry, toggleFlag, setTyped, submitTyped } = useGame.getState();
  const devEnabled = useDevStore((s) => s.enabled);
  const vvHeight = useVisualViewportHeight();
  const inputRef = useRef<HTMLInputElement>(null);
  const learnedRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (phase === 'idle') go('setup');
    if (phase === 'finished') go('summary');
  }, [phase, go]);

  const round = session?.round ?? null;
  // During the card the round is already resolved, so the word comes from the result.
  const shownId = round?.wordId ?? lastResult?.wordId;
  const target = shownId ? entry(shownId) : undefined;
  const [shake, setShake] = useState(0);
  const [burst, setBurst] = useState<{ id: string; x: number; y: number } | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [scorePop, setScorePop] = useState(0);
  const [learnedPop, setLearnedPop] = useState(0);
  const isTyping = phase === 'playing' && round?.kind === 'type';
  const lastTapRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (isTyping) inputRef.current?.focus();
  }, [isTyping, round?.index]);

  const onTap = useCallback(
    (id: string, el: HTMLElement) => {
      if (useGame.getState().phase !== 'playing') return;
      const rect = el.getBoundingClientRect();
      lastTapRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      tap(id, performance.now());
    },
    [tap],
  );
  const onMiss = useCallback(() => miss(performance.now()), [miss]);
  const elapsed = useCallback(() => {
    const { phase: ph, roundStartedAt } = useGame.getState();
    return ph === 'playing' ? performance.now() - roundStartedAt : null;
  }, []);

  // Feedback on the store transition playing → card, once per answer (SPEC §8.1).
  useEffect(
    () =>
      useGame.subscribe((s, prev) => {
        const r = s.lastResult;
        if (s.phase !== 'card' || prev.phase !== 'playing' || !r) return;
        const chip = document.querySelector<HTMLElement>(r.typed !== null || r.missed ? '[data-testid="typing-word"], [data-testid="falling-word"][data-correct="true"]' : `[data-word-id="${r.wordId}"]`);
        const rect = chip?.getBoundingClientRect();
        const from = lastTapRef.current ?? (rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null);
        lastTapRef.current = null;
        if (r.correct && from) {
          setBurst({ id: `${r.wordId}-${s.session?.roundsPlayed ?? 0}`, x: from.x, y: from.y });
          setScorePop((n) => n + 1);
        }
        if (r.outcome === 'learned' && from) {
          const counter = learnedRef.current?.getBoundingClientRect();
          const word = useGame.getState().entry(r.wordId)?.word ?? '';
          if (counter) setFlight({ word, from, to: { x: counter.left + counter.width / 2, y: counter.top + counter.height / 2 } });
        }
        if (!r.correct && r.lifeLost) setShake((n) => n + 1);
      }),
    [],
  );

  // The learned word's flight ends with the counter ticking up.
  useEffect(() => {
    if (!flight) return;
    const t = setTimeout(() => {
      setFlight(null);
      setLearnedPop((n) => n + 1);
    }, FLIGHT_MS);
    return () => clearTimeout(t);
  }, [flight]);

  if (!session || phase === 'loading' || phase === 'idle') {
    return (
      <main data-testid="screen-game-loading" className="flex flex-1 flex-col">
        <p className="m-auto text-muted">{error ? `Could not start: ${error}` : 'Loading words…'}</p>
      </main>
    );
  }

  const lastRound = isLastRound(session) || session.finished !== null;
  const tier = comboTier(session.combo);
  const showCard = phase === 'card' && lastResult && target && !flight;

  return (
    <main
      data-testid="screen-game"
      className="fixed inset-x-0 top-0 mx-auto flex w-full max-w-[480px] flex-col overflow-hidden bg-bg"
      style={{ height: vvHeight ?? '100dvh' }}
    >
      <div className={`flex min-h-0 flex-1 flex-col ${shake ? 'animate-shake' : ''}`} key={`shake-${shake}`}>
        <header className="flex min-h-14 items-center gap-3 px-3 pt-[env(safe-area-inset-top)] text-sm font-semibold">
          <span data-testid="lives" data-lives={session.lives} aria-label={`${session.lives} lives`} className="flex text-lg tracking-tight">
            {Array.from({ length: BALANCE.lives }, (_, i) => (
              <span key={i} className={i < session.lives ? 'text-heart' : `text-muted/50 ${i === session.lives ? 'animate-crack' : ''}`}>
                {i < session.lives ? '♥' : '♡'}
              </span>
            ))}
          </span>
          <span
            data-testid="combo"
            data-tier={tier}
            className={`rounded-full px-2 py-0.5 transition-colors ${tier >= 2 ? 'bg-accent text-accent-ink shadow-glow' : tier === 1 ? 'bg-accent/20 text-accent' : 'bg-surface-2 text-muted'}`}
          >
            🔥 {session.combo}
          </span>
          <span key={scorePop} data-testid="score" className={`tabular-nums ${scorePop ? 'animate-pop' : ''}`}>
            {formatCount(session.score)}
          </span>
          <span ref={learnedRef} key={`learned-${learnedPop}`} data-testid="learned" className={`ml-auto tabular-nums ${learnedPop ? 'animate-pop text-accent' : 'text-muted'}`}>
            {formatCount(learned)}/{formatCount(TOTAL_WORDS)}
          </span>
          <Button variant="ghost" aria-label="Pause" data-testid="pause" className="min-w-12" onClick={() => pause(performance.now())}>
            ❚❚
          </Button>
        </header>

        <Field
          key={round?.index ?? 'none'}
          round={round}
          typed={typed}
          entry={entry}
          onTap={onTap}
          onMiss={onMiss}
          elapsed={elapsed}
          devEnabled={devEnabled}
          onFieldTap={() => inputRef.current?.focus()}
          comboTier={tier}
        />

        <footer data-testid="explanation" className="relative min-h-24 border-t border-border bg-surface px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted" data-testid="hint">{hintFor(round)}</p>
          <p className="mt-1 text-xl leading-snug" data-testid="definition">{target?.definition ?? '…'}</p>
          {round?.kind === 'type' && (
            <input
              ref={inputRef}
              data-testid="typing-input"
              aria-label="Type the word"
              className="pointer-events-none absolute left-2 top-2 h-px w-px opacity-0"
              value={typed}
              onChange={(e) => setTyped(e.target.value, performance.now())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submitTyped(performance.now());
                }
              }}
              {...TYPING_INPUT_ATTRS}
            />
          )}
        </footer>
      </div>

      {burst && <Burst key={burst.id} x={burst.x} y={burst.y} onDone={() => setBurst(null)} />}
      {flight && (
        <span
          data-testid="learned-flight"
          className="animate-fly pointer-events-none fixed z-30 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-accent px-4 py-2 text-xl font-black text-accent-ink shadow-glow"
          style={{ left: flight.from.x, top: flight.from.y, ['--dx' as string]: `${flight.to.x - flight.from.x}px`, ['--dy' as string]: `${flight.to.y - flight.from.y}px` }}
        >
          {flight.word}
        </span>
      )}

      {showCard && (
        <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto bg-bg/95" data-testid="card-overlay">
          <WordCard
            key={`${lastResult.wordId}-${session.roundsPlayed}`}
            entry={entry(lastResult.wordId) ?? target}
            verdict={verdictFor(lastResult.correct, lastResult.outcome, lastResult.missed, lastResult.typed !== null || round?.kind === 'type' ? 'type' : 'tap', lastResult.lifeLost)}
            chosen={lastResult.choiceId ? entry(lastResult.choiceId) : null}
            typed={lastResult.typed}
            flagged={session.progress[lastResult.wordId]?.flagged ?? false}
            onToggleFlag={() => void toggleFlag(lastResult.wordId)}
            onContinue={() => continueRound(performance.now())}
            continueLabel={lastRound ? 'See results' : 'Continue'}
          />
        </div>
      )}

      {phase === 'paused' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-bg/95 px-6" data-testid="pause-overlay">
          <h2 className="text-3xl font-black">Paused</h2>
          <Button variant="primary" size="lg" className="w-full" data-testid="resume" onClick={() => resume(performance.now())}>Resume</Button>
          <Button className="w-full" data-testid="quit" onClick={quit}>Quit game</Button>
        </div>
      )}
    </main>
  );
}

/** Particles that fly from the tapped word towards the score (SPEC §5.3), CSS only. */
export function Burst({ x, y, onDone }: { x: number; y: number; onDone(): void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 650);
    return () => clearTimeout(t);
  }, [onDone]);
  const parts = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    return { dx: Math.cos(angle) * 64, dy: Math.sin(angle) * 64 - 40, delay: i * 10 };
  });
  return (
    <div className="pointer-events-none fixed inset-0 z-30" aria-hidden>
      {parts.map((p, i) => (
        <span
          key={i}
          className="particle animate-particle absolute h-2.5 w-2.5 bg-accent"
          style={{ left: x, top: y, ['--dx' as string]: `${p.dx}px`, ['--dy' as string]: `${p.dy}px`, animationDelay: `${p.delay}ms` }}
        />
      ))}
    </div>
  );
}
