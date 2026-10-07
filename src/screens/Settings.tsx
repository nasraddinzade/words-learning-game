import { useEffect, useState } from 'react';
import { useProfile } from '@/app/profileStore';
import { listEnglishVoices, speechSupported } from '@/app/speech';
import { Button } from '@/components/Button';
import { LearningSettings } from '@/components/LearningSettings';
import { Screen } from '@/components/Screen';
import { Toggle } from '@/components/Toggle';

const THEMES = [{ id: 'neon', name: 'Neon' }];

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
          <select
            aria-label="Theme"
            className="min-h-12 rounded-xl border border-border bg-surface px-3"
            value={profile.theme}
            onChange={(e) => void update({ theme: e.target.value })}
          >
            {THEMES.map((t) => (
              <option key={t.id} value={t.id} disabled={!profile.unlockedThemes.includes(t.id)}>
                {t.name}
              </option>
            ))}
          </select>
          <p className="text-sm text-muted">More themes unlock every 1 000 learned words (stage 3).</p>
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
