export interface DevParams {
  /** Fixed RNG seed, or null for a random game. */
  seed: string | null;
  /** Fall-speed multiplier: 0.25 means words fall four times slower. */
  speed: number;
}

export const SPEED_MIN = 0.05;
export const SPEED_MAX = 5;

/** Pure parser so it can be unit-tested. `enabled=false` ignores everything. */
export function parseDevParams(search: string, enabled: boolean): DevParams {
  const none: DevParams = { seed: null, speed: 1 };
  if (!enabled) return none;
  const params = new URLSearchParams(search);
  const seedRaw = params.get('seed');
  const seed = seedRaw && seedRaw.trim() !== '' ? seedRaw.trim() : null;
  const speedRaw = Number(params.get('speed'));
  const speed = Number.isFinite(speedRaw) && speedRaw > 0 ? Math.min(SPEED_MAX, Math.max(SPEED_MIN, speedRaw)) : 1;
  return { seed, speed };
}
