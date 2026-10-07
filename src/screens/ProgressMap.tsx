import { useProfile } from '@/app/profileStore';
import { Screen } from '@/components/Screen';
import { TOTAL_WORDS } from '@/content/types';
import { formatCount } from '@/app/format';

const CELLS = 100;
const PER_CELL = TOTAL_WORDS / CELLS;

/** 10×10 grid, one cell per 100 learned words (SPEC §8.2). */
export function ProgressMap() {
  const learned = useProfile((s) => s.profile.learnedCount);
  const full = Math.floor(learned / PER_CELL);
  const partial = (learned % PER_CELL) / PER_CELL;

  return (
    <Screen testId="screen-map" title="Progress map" back>
      <p className="mb-4 text-muted">
        <span className="font-bold text-text tabular-nums">{formatCount(learned)}</span> of {formatCount(TOTAL_WORDS)} words. Each cell is 100 words.
      </p>
      <div data-testid="map-grid" className="grid grid-cols-10 gap-1.5" aria-label="Progress map">
        {Array.from({ length: CELLS }, (_, i) => {
          const state = i < full ? 'full' : i === full && partial > 0 ? 'partial' : 'empty';
          return (
            <div
              key={i}
              data-cell={state}
              className={`aspect-square rounded-md ${
                state === 'full' ? 'bg-accent shadow-glow' : state === 'partial' ? 'bg-accent/40' : 'bg-surface border border-border'
              }`}
              style={state === 'partial' ? { opacity: 0.35 + partial * 0.65 } : undefined}
            />
          );
        })}
      </div>
    </Screen>
  );
}
