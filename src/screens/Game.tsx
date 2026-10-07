import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNav } from '@/app/nav';
import { useProfile } from '@/app/profileStore';
import { useGame } from '@/app/gameStore';
import { formatCount } from '@/app/format';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { WordCard } from '@/components/WordCard';
import { BALANCE } from '@/game/balance';
import { positionsAt } from '@/game/fall';
import { TOTAL_WORDS } from '@/content/types';
import { useDevStore } from '@/dev/devStore';
import type { WordEntry } from '@/content/types';
import { isLastRound, type Round } from '@/game/session';

/** Chip height in px, used to keep the whole chip above the panel when y = 1. */
const CHIP_H = 56;

function fontClass(word: string): string {
  if (word.length <= 7) return 'text-xl';
  if (word.length <= 10) return 'text-lg';
  if (word.length <= 13) return 'text-base';
  return 'text-sm';
}

export function Game() {
  const go = useNav((s) => s.go);
  const learned = useProfile((s) => s.profile.learnedCount);
  const phase = useGame((s) => s.phase);
  const session = useGame((s) => s.session);
  const lastResult = useGame((s) => s.lastResult);
  const error = useGame((s) => s.error);
  const { tap, miss, continueRound, pause, resume, quit, entry, toggleFlag } = useGame.getState();
  const devEnabled = useDevStore((s) => s.enabled);

  useEffect(() => {
    if (phase === 'idle') go('setup');
    if (phase === 'finished') go('summary');
  }, [phase, go]);

  const round = session?.round ?? null;
  // During the card the round is already resolved, so the word comes from the result.
  const shownId = round?.wordId ?? lastResult?.wordId;
  const target = shownId ? entry(shownId) : undefined;
  const livesLost = session ? BALANCE.lives - session.lives : 0;
  const [shake, setShake] = useState(0);
  const [burst, setBurst] = useState<{ id: string; x: number; y: number } | null>(null);

  const onTap = useCallback(
    (id: string, el: HTMLElement) => {
      if (useGame.getState().phase !== 'playing') return;
      const now = performance.now();
      const r = useGame.getState().session?.round;
      if (r && id === r.wordId) {
        const rect = el.getBoundingClientRect();
        setBurst({ id, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      } else {
        setShake((n) => n + 1);
      }
      tap(id, now);
    },
    [tap],
  );

  if (!session || phase === 'loading' || phase === 'idle') {
    return (
      <Screen testId="screen-game-loading">
        <p className="m-auto text-muted">{error ? `Could not start: ${error}` : 'Loading words…'}</p>
      </Screen>
    );
  }

  return (
    <Screen testId="screen-game" bare>
      <div className={`flex flex-1 flex-col ${shake ? 'animate-shake' : ''}`} key={`shake-${shake}`}>
        <header className="flex min-h-14 items-center gap-3 px-3 pt-[env(safe-area-inset-top)] text-sm font-semibold">
          <span data-testid="lives" data-lives={session.lives} aria-label={`${session.lives} lives`} className="text-lg tracking-tight">
            {Array.from({ length: BALANCE.lives }, (_, i) => (
              <span key={i} className={i < session.lives ? 'text-heart' : 'text-muted/50'}>
                {i < session.lives ? '♥' : '♡'}
              </span>
            ))}
          </span>
          <span data-testid="combo" className={`rounded-full px-2 py-0.5 ${session.combo >= 5 ? 'bg-accent/20 text-accent' : 'bg-surface-2 text-muted'}`}>
            🔥 {session.combo}
          </span>
          <span data-testid="score" className="tabular-nums">{formatCount(session.score)}</span>
          <span data-testid="learned" className="ml-auto tabular-nums text-muted">
            {formatCount(learned)}/{formatCount(TOTAL_WORDS)}
          </span>
          <Button variant="ghost" aria-label="Pause" data-testid="pause" className="min-w-12" onClick={() => pause(performance.now())}>
            ❚❚
          </Button>
        </header>

        <Field key={round?.index ?? 'none'} round={round} entry={entry} onTap={onTap} onMiss={() => miss(performance.now())} active={phase === 'playing'} devEnabled={devEnabled} livesLost={livesLost} />

        <footer data-testid="explanation" className="min-h-28 border-t border-border bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {round?.isDebtReturn ? 'It came back. Catch it this time' : round?.step === 1 && round.isNew ? 'New word. Tap the one that fits' : 'Tap the word that fits'}
          </p>
          <p className="mt-1 text-xl leading-snug" data-testid="definition">{target?.definition ?? '…'}</p>
        </footer>
      </div>

      {burst && <Burst key={burst.id} x={burst.x} y={burst.y} onDone={() => setBurst(null)} />}

      {phase === 'card' && lastResult && target && (
        <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto bg-bg/95" data-testid="card-overlay">
          <WordCard
            key={`${lastResult.wordId}-${session.roundsPlayed}`}
            entry={entry(lastResult.wordId) ?? target}
            verdict={lastResult.correct ? 'correct' : lastResult.choiceId ? 'wrong' : 'missed'}
            chosen={lastResult.choiceId ? entry(lastResult.choiceId) : null}
            flagged={session.progress[lastResult.wordId]?.flagged ?? false}
            onToggleFlag={() => void toggleFlag(lastResult.wordId)}
            onContinue={() => continueRound(performance.now())}
            continueLabel={session.finished || isLastRound(session) ? 'See results' : 'Continue'}
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
    </Screen>
  );
}

interface FieldProps {
  round: Round | null;
  entry(id: string): WordEntry | undefined;
  onTap(id: string, el: HTMLElement): void;
  onMiss(): void;
  active: boolean;
  devEnabled: boolean;
  livesLost: number;
}

/**
 * The falling field. Positions are written straight to the DOM from a requestAnimationFrame
 * loop; React only renders when the round changes.
 */
function Field({ round, entry, onTap, onMiss, active, devEnabled }: FieldProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());
  const [height, setHeight] = useState(0);
  const missedRef = useRef(false);

  useLayoutEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    setHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!round || !active || height === 0) return;
    let raf = 0;
    const travel = Math.max(0, height - CHIP_H);
    const frame = () => {
      const { roundStartedAt, phase } = useGame.getState();
      if (phase !== 'playing') return;
      const elapsed = performance.now() - roundStartedAt;
      const positions = positionsAt(round.fall, elapsed, round.fallMs);
      for (const p of positions) {
        const el = chipRefs.current.get(p.id);
        if (!el) continue;
        if (p.y === null) {
          el.style.transform = `translateY(-${CHIP_H + 8}px)`;
          el.style.opacity = '0';
          continue;
        }
        el.style.opacity = p.fallen ? '0' : '1';
        el.style.pointerEvents = p.fallen ? 'none' : 'auto';
        el.style.transform = `translateY(${(p.y * travel).toFixed(1)}px)`;
        if (p.fallen && p.id === round.wordId && !missedRef.current) {
          missedRef.current = true;
          onMiss();
          return;
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [round, active, height, onMiss]);

  const laneWidth = 100 / BALANCE.lanes;
  return (
    <section ref={fieldRef} data-testid="field" aria-label="Game field" className="relative flex-1 overflow-hidden bg-bg-2">
      <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${BALANCE.lanes}, minmax(0, 1fr))` }}>
        {Array.from({ length: BALANCE.lanes }, (_, i) => (
          <div key={i} className="border-r border-border/30 last:border-r-0" />
        ))}
      </div>
      {round?.fall.map((f) => {
        const e = entry(f.id);
        if (!e) return null;
        const correct = f.id === round.wordId;
        return (
          <button
            key={f.id}
            ref={(el) => {
              if (el) chipRefs.current.set(f.id, el);
              else chipRefs.current.delete(f.id);
            }}
            type="button"
            data-testid="falling-word"
            data-word-id={f.id}
            data-lane={f.lane}
            {...(devEnabled && correct ? { 'data-correct': 'true' } : {})}
            onPointerDown={(ev) => {
              ev.preventDefault();
              onTap(f.id, ev.currentTarget);
            }}
            className={`absolute top-0 flex min-h-14 items-center justify-center rounded-2xl bg-surface px-1 font-bold text-text shadow-glow will-change-transform select-none ${fontClass(e.word)}`}
            style={{ left: `calc(${f.lane * laneWidth}% + 4px)`, width: `calc(${laneWidth}% - 8px)`, opacity: 0, transform: `translateY(-${CHIP_H + 8}px)` }}
          >
            <span className="px-1 leading-tight break-words">{e.word}</span>
          </button>
        );
      })}
    </section>
  );
}

/** Particles that fly from the tapped word towards the score (SPEC §5.3), CSS only. */
function Burst({ x, y, onDone }: { x: number; y: number; onDone(): void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 650);
    return () => clearTimeout(t);
  }, [onDone]);
  const parts = Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * Math.PI * 2;
    return { dx: Math.cos(angle) * 60, dy: Math.sin(angle) * 60 - 40, delay: i * 12 };
  });
  return (
    <div className="pointer-events-none fixed inset-0 z-30" aria-hidden>
      {parts.map((p, i) => (
        <span
          key={i}
          className="animate-particle absolute h-2.5 w-2.5 rounded-full bg-accent"
          style={{ left: x, top: y, ['--dx' as string]: `${p.dx}px`, ['--dy' as string]: `${p.dy}px`, animationDelay: `${p.delay}ms` }}
        />
      ))}
    </div>
  );
}
