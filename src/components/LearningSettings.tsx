import { LEVELS, NEW_PER_GAME_OPTIONS, type Level, type NewPerGame } from '@/content/types';
import { LEVEL_COUNTS } from '@/content';
import { useProfile } from '@/app/profileStore';
import { Segmented } from './Segmented';

/** Start level and new words per game. Shared by Setup and Settings (SPEC §3, §11). */
export function LearningSettings() {
  const settings = useProfile((s) => s.profile.settings);
  const updateSettings = useProfile((s) => s.updateSettings);
  return (
    <div className="grid gap-6">
      <section className="grid gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Start level</h2>
        <div role="radiogroup" aria-label="Start level" data-testid="start-level" className="grid gap-2">
          {LEVELS.map((level: Level) => {
            const selected = settings.startLevel === level;
            return (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => void updateSettings({ startLevel: level })}
                className={`flex min-h-12 items-center justify-between rounded-xl border px-4 text-left ${
                  selected ? 'border-accent bg-accent/15 text-accent' : 'border-border bg-surface'
                }`}
              >
                <span className="text-lg font-bold">{level}</span>
                <span className="text-sm text-muted">{LEVEL_COUNTS[level]} words in base</span>
              </button>
            );
          })}
        </div>
      </section>
      <section className="grid gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">New words per game</h2>
        <Segmented<NewPerGame>
          label="New words per game"
          testId="new-per-game"
          options={NEW_PER_GAME_OPTIONS}
          value={settings.newPerGame}
          onChange={(v) => void updateSettings({ newPerGame: v })}
        />
      </section>
    </div>
  );
}
