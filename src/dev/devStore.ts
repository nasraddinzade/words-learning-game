import { create } from 'zustand';
import { isDevToolsEnabled } from './enabled';
import { parseDevParams, type DevParams } from './params';

const DAY_OFFSET_KEY = 'wlg.dev.dayOffset';

function readDayOffset(): number {
  if (!isDevToolsEnabled()) return 0;
  try {
    const raw = localStorage.getItem(DAY_OFFSET_KEY);
    const n = raw === null ? 0 : Number(raw);
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  } catch {
    return 0;
  }
}

interface DevState {
  enabled: boolean;
  params: DevParams;
  /** Days added to the real calendar day. Persists across reloads so e2e can move time. */
  dayOffset: number;
  shiftDay(n: number): void;
  setDayOffset(n: number): void;
}

export const useDevStore = create<DevState>((set, get) => ({
  enabled: isDevToolsEnabled(),
  params: parseDevParams(typeof window === 'undefined' ? '' : window.location.search, isDevToolsEnabled()),
  dayOffset: readDayOffset(),
  shiftDay: (n) => get().setDayOffset(get().dayOffset + n),
  setDayOffset: (n) => {
    const value = Math.trunc(n);
    try {
      localStorage.setItem(DAY_OFFSET_KEY, String(value));
    } catch {
      /* storage unavailable */
    }
    set({ dayOffset: value });
  },
}));
