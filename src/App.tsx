import { lazy, Suspense, useEffect } from 'react';
import { useNav, type Screen } from '@/app/nav';
import { useProfile } from '@/app/profileStore';
import { useDevStore } from '@/dev/devStore';

// Dev tools are a separate chunk. The flag is a build-time constant, so the production build
// drops the import entirely (SPEC §13).
const DEV_TOOLS = import.meta.env.DEV || import.meta.env.VITE_DEV_TOOLS === '1';
const DevPanel = DEV_TOOLS ? lazy(() => import('@/dev/DevPanel').then((m) => ({ default: m.DevPanel }))) : null;
import { Home } from '@/screens/Home';
import { Setup } from '@/screens/Setup';
import { Game } from '@/screens/Game';
import { Summary } from '@/screens/Summary';
import { ProgressMap } from '@/screens/ProgressMap';
import { SpeedCheck } from '@/screens/SpeedCheck';
import { Settings } from '@/screens/Settings';

const SCREEN_COMPONENTS: Record<Screen, () => React.JSX.Element> = {
  home: Home,
  setup: Setup,
  game: Game,
  summary: Summary,
  map: ProgressMap,
  speed: SpeedCheck,
  settings: Settings,
};

export default function App() {
  const screen = useNav((s) => s.screen);
  const status = useProfile((s) => s.status);
  const init = useProfile((s) => s.init);
  const theme = useProfile((s) => s.profile.theme);
  const devEnabled = useDevStore((s) => s.enabled);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  if (status === 'loading') {
    return (
      <div className="app-shell items-center justify-center text-muted" data-testid="loading">
        Loading…
      </div>
    );
  }

  const Current = SCREEN_COMPONENTS[screen];
  return (
    <div className="app-shell">
      <Current />
      {devEnabled && DevPanel && (
        <Suspense fallback={null}>
          <DevPanel />
        </Suspense>
      )}
    </div>
  );
}
