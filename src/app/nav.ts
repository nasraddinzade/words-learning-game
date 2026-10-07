import { create } from 'zustand';

export const SCREENS = ['home', 'setup', 'game', 'card', 'summary', 'map', 'speed', 'settings'] as const;
export type Screen = (typeof SCREENS)[number];

function isScreen(value: string): value is Screen {
  return (SCREENS as readonly string[]).includes(value);
}

function screenFromHash(hash: string): Screen {
  const name = hash.replace(/^#\/?/, '');
  return isScreen(name) ? name : 'home';
}

interface NavState {
  screen: Screen;
  go(screen: Screen): void;
}

/**
 * Minimal hash router: `#/settings`. Keeps the phone's back button meaningful and lets e2e
 * open a screen directly. No library needed for eight screens.
 */
export const useNav = create<NavState>((set) => ({
  screen: typeof window === 'undefined' ? 'home' : screenFromHash(window.location.hash),
  go: (screen) => {
    if (typeof window !== 'undefined') {
      const hash = screen === 'home' ? '#/' : `#/${screen}`;
      if (window.location.hash !== hash) {
        window.location.hash = hash;
        return; // hashchange listener updates the store
      }
    }
    set({ screen });
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    useNav.setState({ screen: screenFromHash(window.location.hash) });
  });
}
