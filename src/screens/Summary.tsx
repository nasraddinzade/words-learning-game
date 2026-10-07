import { useNav } from '@/app/nav';
import { useProfile } from '@/app/profileStore';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';

export function Summary() {
  const go = useNav((s) => s.go);
  const profile = useProfile((s) => s.profile);
  const rows: Array<[string, number]> = [
    ['Learned today', 0],
    ['Moved up', 0],
    ['Came back', 0],
    ['Best combo', 0],
    ['Score', 0],
    ['Streak', profile.streak],
  ];
  return (
    <Screen testId="screen-summary">
      <div className="flex flex-1 flex-col justify-center gap-6 py-6">
        <h1 className="text-center text-4xl font-black">Round complete</h1>
        <dl className="grid gap-2 rounded-3xl border border-border bg-surface p-4">
          {rows.map(([label, value]) => (
            <div key={label} className="flex min-h-10 items-center justify-between">
              <dt className="text-muted">{label}</dt>
              <dd className="text-xl font-bold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-center text-sm text-muted">Mistakes list arrives with the engine in stage 1.</p>
        <div className="grid gap-3">
          <Button variant="primary" size="lg" data-testid="play-again" onClick={() => go('game')}>Play again</Button>
          <Button data-testid="go-home" onClick={() => go('home')}>Home</Button>
        </div>
      </div>
    </Screen>
  );
}
