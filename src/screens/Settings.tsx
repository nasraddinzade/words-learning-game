import { useEffect, useState } from 'react';
import { useProfile } from '@/app/profileStore';
import { listEnglishVoices, speechSupported } from '@/app/speech';
import { Button } from '@/components/Button';
import { LearningSettings } from '@/components/LearningSettings';
import { Screen } from '@/components/Screen';
import { Toggle } from '@/components/Toggle';
import { THEMES } from '@/app/themes';
import { formatCount } from '@/app/format';

export function Settings() {
  const profile = useProfile((s) => s.profile);
  const update = useProfile((s) => s.update);
  const updateSettings = useProfile((s) => s.updateSettings);
  const { settings } = profile;
  const [voices, setVoices] = useState<string[]>([]);
  useEffect(() => {
    if (!speechSupported()) return;
    const refresh = () => setVoices(listEnglishVoices().map((v) => v.name));
    refresh();
    window.speechSynthesis.addEventListener('voiceschanged', refresh);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh);
  }, []);

  return (
    <Screen testId="screen-settings" title="Settings" back>
      <div className="grid gap-8 pb-6">
        <LearningSettings />

        <section className="grid gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Theme</h2>
          <div role="radiogroup" aria-label="Theme" data-testid="themes" className="grid grid-cols-2 gap-2">
            {THEMES.map((t) => {
              const unlocked = profile.unlockedThemes.includes(t.id);
              const selected = profile.theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-disabled={!unlocked}
                  data-theme-id={t.id}
                  data-unlocked={unlocked}
                  disabled={!unlocked}
                  onClick={() => void update({ theme: t.id })}
                  className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-left ${
                    selected ? 'border-accent bg-accent/15' : 'border-border bg-surface'
                  } disabled:opacity-50`}
                >
                  <span data-theme={t.id} className="flex h-7 w-7 shrink-0 overflow-hidden rounded-full border border-border" aria-hidden>
                    <span className="h-full w-1/2" style={{ background: 'var(--accent)' }} />
                    <span className="h-full w-1/2" style={{ background: 'var(--accent-2)' }} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{t.name}</span>
                    <span className="block text-xs text-muted">{unlocked ? (t.unlockAt === 0 ? 'Default' : 'Unlocked') : `${formatCount(t.unlockAt)} words`}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-sm text-muted">A new theme unlocks every 1 000 learned words.</p>
        </section>

        <section className="grid">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">Feedback</h2>
          <Toggle label="Sound" testId="toggle-sound" checked={settings.sound} onChange={(v) => void updateSettings({ sound: v })} />
          <Toggle label="Vibration" testId="toggle-vibration" checked={settings.vibration} onChange={(v) => void updateSettings({ vibration: v })} />
          <Toggle label="Auto speak" testId="toggle-autospeak" checked={settings.autoSpeak} onChange={(v) => void updateSettings({ autoSpeak: v })} />
          <label className="flex min-h-12 items-center justify-between gap-4 py-1">
            <span>Voice</span>
            <select
              aria-label="Voice"
              data-testid="voice"
              className="min-h-12 max-w-[55%] rounded-xl border border-border bg-surface px-3"
              value={settings.voice ?? ''}
              onChange={(e) => void updateSettings({ voice: e.target.value || null })}
              disabled={!speechSupported()}
            >
              <option value="">{speechSupported() ? 'System default' : 'No speech on this device'}</option>
              {voices.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="grid gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Progress</h2>
          <div className="grid grid-cols-2 gap-3">
            <Button disabled>Export progress</Button>
            <Button disabled>Import progress</Button>
          </div>
          <p className="text-sm text-muted">Transfer between devices arrives in stage 4.</p>
        </section>
      </div>
    </Screen>
  );
}
