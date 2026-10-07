import { useNav } from '@/app/nav';
import { useProfile } from '@/app/profileStore';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { BALANCE } from '@/game/balance';
import { TOTAL_WORDS } from '@/content/types';
import { formatCount } from '@/app/format';

/**
 * Stage 0 stub: the real layout (top bar, field with lanes, fixed explanation panel) with static
 * placeholder words. The loop, rounds and words arrive in stage 1.
 */
export function Game() {
  const go = useNav((s) => s.go);
  const learned = useProfile((s) => s.profile.learnedCount);
  const placeholder = ['stub', 'words', 'fall'];

  return (
    <Screen testId="screen-game" bare>
      <div className="flex flex-1 flex-col">
        <header className="flex min-h-14 items-center gap-3 px-3 pt-[env(safe-area-inset-top)] text-sm font-semibold">
          <span data-testid="lives" aria-label={`${BALANCE.lives} lives`} className="text-heart text-lg tracking-tight">
            {'♥'.repeat(BALANCE.lives)}
          </span>
          <span data-testid="combo" className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">×1</span>
          <span data-testid="score" className="tabular-nums">0</span>
          <span data-testid="learned" className="ml-auto tabular-nums text-muted">
            {formatCount(learned)}/{formatCount(TOTAL_WORDS)}
          </span>
          <Button variant="ghost" aria-label="Pause" data-testid="pause" className="min-w-12" onClick={() => go('home')}>
            ❚❚
          </Button>
        </header>

        <section data-testid="field" aria-label="Game field" className="relative flex-1 overflow-hidden bg-bg-2">
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${BALANCE.lanes}, minmax(0, 1fr))` }}>
            {placeholder.map((w, i) => (
              <div key={w} className="flex items-start justify-center border-r border-border/40 last:border-r-0">
                <span
                  className="mt-[clamp(1rem,10vh,6rem)] rounded-2xl bg-surface px-4 py-3 text-xl font-bold shadow-glow"
                  style={{ transform: `translateY(${i * 60}px)` }}
                >
                  {w}
                </span>
              </div>
            ))}
          </div>
        </section>

        <footer
          data-testid="explanation"
          className="min-h-28 border-t border-border bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
        >
          <p className="text-lg leading-snug">
            The game loop is not here yet. This panel will show the explanation of the hidden word.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button data-testid="stub-card" onClick={() => go('card')}>Show card (stub)</Button>
            <Button data-testid="stub-end" onClick={() => go('summary')}>End game (stub)</Button>
          </div>
        </footer>
      </div>
    </Screen>
  );
}
