import { useState } from 'react';
import { appClock } from '@/app/clock';
import { useProfile } from '@/app/profileStore';
import { useDevStore } from './devStore';

/**
 * Dev-only panel (SPEC §13): move the day forward, reset progress, set the learned counter.
 * Rendered only when dev tools are enabled; see src/dev/enabled.ts.
 */
export function DevPanel() {
  const [open, setOpen] = useState(false);
  const [shiftN, setShiftN] = useState('1');
  const [learnedN, setLearnedN] = useState('100');
  const { params, dayOffset, shiftDay, setDayOffset } = useDevStore();
  const profile = useProfile((s) => s.profile);
  const setLearnedCount = useProfile((s) => s.setLearnedCount);
  const resetEverything = useProfile((s) => s.resetEverything);
  const today = appClock.today();

  const field = 'min-h-10 w-20 rounded-lg border border-border bg-bg px-2 text-text';
  const btn = 'min-h-10 rounded-lg border border-border bg-surface-2 px-3 text-sm font-semibold';

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 mx-auto max-w-[480px]">
      <button
        type="button"
        data-testid="dev-toggle"
        onClick={() => setOpen((o) => !o)}
        className="pointer-events-auto absolute right-0 top-[38vh] min-h-10 rounded-l-xl border border-r-0 border-warn/60 bg-bg/90 px-2 text-[11px] font-bold text-warn"
      >
        DEV
      </button>
      {open && (
        <div
          data-testid="dev-panel"
          className="pointer-events-auto mx-2 mt-[max(0.5rem,env(safe-area-inset-top))] grid gap-3 rounded-2xl border border-warn/50 bg-bg/95 p-3 text-sm shadow-xl"
        >
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted">
            <span>seed</span>
            <span data-testid="dev-seed" className="text-text">{params.seed ?? 'random'}</span>
            <span>speed</span>
            <span data-testid="dev-speed" className="text-text">×{params.speed}</span>
            <span>today</span>
            <span data-testid="dev-today" className="text-text">
              {today} <span className="text-muted">(offset {dayOffset >= 0 ? '+' : ''}{dayOffset})</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={btn} data-testid="dev-day-plus-1" onClick={() => shiftDay(1)}>+1 day</button>
            <button type="button" className={btn} data-testid="dev-day-plus-7" onClick={() => shiftDay(7)}>+7 days</button>
            <input aria-label="Days to shift" data-testid="dev-day-n" className={field} inputMode="numeric" value={shiftN} onChange={(e) => setShiftN(e.target.value)} />
            <button type="button" className={btn} data-testid="dev-day-shift" onClick={() => shiftDay(Number(shiftN) || 0)}>Shift</button>
            <button type="button" className={btn} data-testid="dev-day-reset" onClick={() => setDayOffset(0)}>Reset day</button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input aria-label="Learned count" data-testid="dev-learned-n" className={field} inputMode="numeric" value={learnedN} onChange={(e) => setLearnedN(e.target.value)} />
            <button type="button" className={btn} data-testid="dev-learned-set" onClick={() => void setLearnedCount(Number(learnedN) || 0)}>
              Set learned
            </button>
            <span className="text-muted">now {profile.learnedCount}</span>
          </div>

          <button
            type="button"
            className={`${btn} border-danger/50 text-danger`}
            data-testid="dev-reset"
            onClick={() => {
              if (window.confirm('Reset all progress and settings?')) void resetEverything();
            }}
          >
            Reset progress
          </button>
        </div>
      )}
    </div>
  );
}
