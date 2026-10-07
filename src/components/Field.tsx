import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { WordEntry } from '@/content/types';
import { BALANCE } from '@/game/balance';
import { positionsAt, type FallWord } from '@/game/fall';
import type { RoundKind } from '@/engine/scheduler';

/** Chip height in px, used to keep the whole chip above the panel when y = 1. */
export const CHIP_H = 56;

export interface FieldRound {
  wordId: string;
  kind: RoundKind;
  fall: FallWord[];
  fallMs: number;
  /** Typing rounds: leading letters shown. */
  revealed: number;
}

interface Props {
  round: FieldRound | null;
  /** Typing rounds: letters typed so far. */
  typed?: string;
  entry(id: string): WordEntry | undefined;
  onTap(id: string, el: HTMLElement): void;
  onMiss(): void;
  /** ms since the round started, or null while paused / not playing. */
  elapsed(): number | null;
  devEnabled: boolean;
  /** Tapping the empty field (typing rounds) should refocus the input. */
  onFieldTap?(): void;
  /** 0-3, raises the glow and the background drift (SPEC §8.1). */
  comboTier?: number;
}

function fontClass(word: string): string {
  if (word.length <= 7) return 'text-xl';
  if (word.length <= 10) return 'text-lg';
  if (word.length <= 13) return 'text-base';
  return 'text-sm';
}

/**
 * The falling field. Positions are written straight to the DOM from a requestAnimationFrame
 * loop; React only renders when the round or the typed letters change.
 */
export function Field({ round, typed = '', entry, onTap, onMiss, elapsed, devEnabled, onFieldTap, comboTier = 0 }: Props) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef(new Map<string, HTMLElement>());
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
    missedRef.current = false;
  }, [round]);

  useEffect(() => {
    if (!round || height === 0) return;
    let raf = 0;
    const travel = Math.max(0, height - CHIP_H);
    const frame = () => {
      const t = elapsed();
      if (t === null) {
        raf = requestAnimationFrame(frame);
        return;
      }
      const positions = positionsAt(round.fall, t, round.fallMs);
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
  }, [round, height, onMiss, elapsed]);

  const laneWidth = 100 / BALANCE.lanes;
  const target = round ? entry(round.wordId) : undefined;

  return (
    <section
      ref={fieldRef}
      data-testid="field"
      aria-label="Game field"
      data-combo-tier={comboTier}
      className="field-combo relative flex-1 overflow-hidden bg-bg-2"
      onPointerDown={round?.kind === 'type' ? onFieldTap : undefined}
    >
      <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${BALANCE.lanes}, minmax(0, 1fr))` }}>
        {Array.from({ length: BALANCE.lanes }, (_, i) => (
          <div key={i} className="border-r border-border/30 last:border-r-0" />
        ))}
      </div>

      {round?.kind === 'tap' &&
        round.fall.map((f) => {
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

      {round?.kind === 'type' && target && (
        <div
          ref={(el) => {
            if (el) chipRefs.current.set(round.wordId, el);
            else chipRefs.current.delete(round.wordId);
          }}
          data-testid="typing-word"
          {...(devEnabled ? { 'data-word-id': round.wordId } : {})}
          className="absolute top-0 left-1/2 flex min-h-14 -translate-x-1/2 items-center justify-center rounded-2xl bg-surface px-3 shadow-glow will-change-transform"
          style={{ opacity: 0, transform: `translateY(-${CHIP_H + 8}px)` }}
        >
          <TypingSlots word={target.word} revealed={round.revealed} typed={typed} />
        </div>
      )}
    </section>
  );
}

/** `c _ _ _ _` with typed letters filling in (SPEC §5.2). */
export function TypingSlots({ word, revealed, typed }: { word: string; revealed: number; typed: string }) {
  const letters = word.split('');
  const size = letters.length > 11 ? 'h-7 w-4 text-base' : letters.length > 8 ? 'h-8 w-5 text-lg' : 'h-9 w-6 text-xl';
  return (
    <span className="flex items-end gap-1 py-2" aria-label={`${word.length} letters`} data-testid="typing-slots">
      {letters.map((ch, i) => {
        const shown = i < typed.length ? typed[i] : i < revealed ? ch : null;
        const hint = i < revealed && i >= typed.length;
        return (
          <span
            key={i}
            className={`flex items-center justify-center border-b-2 font-bold ${size} ${
              shown ? (hint ? 'border-accent/60 text-accent' : 'border-text text-text') : 'border-muted/60 text-transparent'
            }`}
          >
            {shown ?? '·'}
          </span>
        );
      })}
    </span>
  );
}
