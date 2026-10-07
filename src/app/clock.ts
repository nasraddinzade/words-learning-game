import { createClock } from '@/engine/clock';
import { useDevStore } from '@/dev/devStore';

/** The app-wide clock: real time plus the dev-panel day offset. */
export const appClock = createClock({
  dayOffset: () => useDevStore.getState().dayOffset,
});
