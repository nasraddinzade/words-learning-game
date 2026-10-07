import { useEffect, useState } from 'react';
import { useNav } from '@/app/nav';
import { useProfile } from '@/app/profileStore';
import { useGame } from '@/app/gameStore';
import { formatCount } from '@/app/format';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { WordCard } from '@/components/WordCard';
import { playRecord } from '@/app/sound';
import { HAPTIC, vibrate } from '@/app/haptics';

export function Summary() {
  const go = useNav((s) => s.go);
  const profile = useProfile((s) => s.profile);
  const session = useGame((s) => s.session);
  const quitEarly = useGame((s) => s.quitEarly);
  const records = useGame((s) => s.records);
  const lastStreak = useProfile((s) => s.lastStreak);
  const { entry, toggleFlag, start } = useGame.getState();
  const [open, setOpen] = useState<string | null>(null);
  const anyRecord = Boolean(records?.newBestScore || records?.newBestCombo);
  useEffect(() => {
    if (anyRecord) {
      playRecord();
      vibrate(HAPTIC.record);
    }
  }, [anyRecord]);

  if (!session) {
    return (
      <Screen testId="screen-summary" title="Summary" back>
        <p className="text-muted">No game played yet.</p>
      </Screen>
    );
  }

  const title = session.finished === 'gameover' ? 'Game over' : quitEarly ? 'Game stopped' : 'Round complete';
  const rows: Array<[string, string, boolean]> = [
    ['Learned today', String(session.stats.learned), false],
    ['Moved up', String(session.stats.movedUp), false],
    ['Came back', String(session.stats.cameBack), false],
    ['Best combo', `×${session.bestCombo}`, records?.newBestCombo ?? false],
    ['Score', formatCount(session.score), records?.newBestScore ?? false],
    ['Streak', `${profile.streak} ${profile.streak === 1 ? 'day' : 'days'}${profile.freezes > 0 ? ` · ${profile.freezes} ❄` : ''}`, false],
  ];
  const streakNote = lastStreak?.freezeEarned
    ? 'Seven days in a row: you earned a freeze ❄'
    : lastStreak?.freezesUsed
      ? `A freeze covered ${lastStreak.freezesUsed === 1 ? 'a missed day' : `${lastStreak.freezesUsed} missed days`}`
      : lastStreak?.restarted
        ? 'New streak started today'
        : null;
  const openEntry = open ? entry(open) : undefined;

  return (
    <Screen testId="screen-summary">
      <div className="flex flex-1 flex-col gap-5 py-4">
        <h1 className="text-center text-4xl font-black" data-testid="summary-title">{title}</h1>
        <dl className="grid gap-1 rounded-3xl border border-border bg-surface p-4" data-testid="summary-stats">
          {rows.map(([label, value, record]) => (
            <div key={label} className="flex min-h-10 items-center justify-between">
              <dt className="text-muted">{label}</dt>
              <dd className="flex items-center gap-2 text-xl font-bold tabular-nums" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
                {record && (
                  <span className="animate-pop rounded-full bg-accent px-2 py-0.5 text-xs font-black uppercase text-accent-ink" data-testid="record-badge">
                    New record
                  </span>
                )}
                {value}
              </dd>
            </div>
          ))}
        </dl>
        {streakNote && (
          <p className="text-center text-sm text-muted" data-testid="streak-note">{streakNote}</p>
        )}

        {session.stats.mistakes.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Words you missed</h2>
            <ul className="grid gap-2" data-testid="mistakes">
              {session.stats.mistakes.map((id) => {
                const e = entry(id);
                if (!e) return null;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      data-testid="mistake"
                      onClick={() => setOpen(id)}
                      className="flex min-h-12 w-full items-center justify-between rounded-xl border border-border bg-surface px-4 text-left"
                    >
                      <span className="font-bold">{e.word}</span>
                      <span className="text-sm text-muted">{session.progress[id]?.inDebt ? 'still owed' : 'cleared'}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <div className="mt-auto grid gap-3 pt-4">
          <Button
            variant="primary"
            size="lg"
            data-testid="play-again"
            onClick={() => {
              void start();
              go('game');
            }}
          >
            Play again
          </Button>
          <Button data-testid="go-home" onClick={() => go('home')}>Home</Button>
        </div>
      </div>

      {openEntry && (
        <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto bg-bg/95">
          <WordCard
            key={openEntry.id}
            entry={openEntry}
            verdict="review"
            flagged={session.progress[openEntry.id]?.flagged ?? false}
            onToggleFlag={() => void toggleFlag(openEntry.id)}
            onContinue={() => setOpen(null)}
            continueLabel="Close"
          />
        </div>
      )}
    </Screen>
  );
}
