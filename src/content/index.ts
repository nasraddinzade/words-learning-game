import type { Level } from './types';

/**
 * How many words of each level exist in the base. Shown next to each level on the Setup
 * screen (SPEC §3). Stage 0 ships an empty base; stage 1 adds the 300-word B2 starter set and
 * this becomes a generated manifest.
 */
export const LEVEL_COUNTS: Record<Level, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0 };
