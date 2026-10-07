import { useNav } from '@/app/nav';
import { useProfile } from '@/app/profileStore';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TOTAL_WORDS } from '@/content/types';
import { formatCount as fmt } from '@/app/format';

export function Home() {
  const go = useNav((s) => s.go);
  const profile = useProfile((s) => s.profile);
  // Due-today count arrives with the engine in stage 1.
  const dueToday = 0;

  return (
    <Screen testId="screen-home">
      <div className="flex flex-1 flex-col justify-between py-4">
        <header className="pt-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-accent">Arcade</p>
          <h1 className="mt-1 text-5xl font-black tracking-tight">Words</h1>
        </header>

        <section className="my-8 grid gap-3">
          <div className="rounded-3xl border border-border bg-surface p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Learned</p>
            <p className="mt-1 text-4xl font-black tabular-nums" data-testid="learned-count">
              {fmt(profile.learnedCount)} <span className="text-xl font-semibold text-muted">/ {fmt(TOTAL_WORDS)}</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-surface p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Due today</p>
              <p className="mt-1 text-2xl font-bold tabular-nums" data-testid="due-today">{dueToday}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Streak</p>
              <p className="mt-1 text-2xl font-bold tabular-nums" data-testid="streak">
                {profile.streak} <span className="text-base font-medium text-muted">days</span>
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-3">
          <Button variant="primary" size="lg" data-testid="play" onClick={() => go('setup')}>
            Play
          </Button>
          <div className="grid grid-cols-3 gap-3">
            <Button data-testid="nav-map" onClick={() => go('map')}>Map</Button>
            <Button data-testid="nav-speed" onClick={() => go('speed')}>Speed</Button>
            <Button data-testid="nav-settings" onClick={() => go('settings')}>Settings</Button>
          </div>
        </div>
      </div>
    </Screen>
  );
}
