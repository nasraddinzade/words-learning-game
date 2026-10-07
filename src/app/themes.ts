/** Ten themes, one unlocked per 1 000 learned words (SPEC §8.2, §12). CSS lives in index.css. */
export interface Theme {
  id: string;
  name: string;
  unlockAt: number;
}

export const THEMES: readonly Theme[] = [
  { id: 'neon', name: 'Neon', unlockAt: 0 },
  { id: 'ember', name: 'Ember', unlockAt: 1_000 },
  { id: 'ocean', name: 'Ocean', unlockAt: 2_000 },
  { id: 'violet', name: 'Violet', unlockAt: 3_000 },
  { id: 'forest', name: 'Forest', unlockAt: 4_000 },
  { id: 'sunset', name: 'Sunset', unlockAt: 5_000 },
  { id: 'candy', name: 'Candy', unlockAt: 6_000 },
  { id: 'mono', name: 'Mono', unlockAt: 7_000 },
  { id: 'gold', name: 'Gold', unlockAt: 8_000 },
  { id: 'aurora', name: 'Aurora', unlockAt: 9_000 },
];

export function themeFor(threshold: number): Theme | undefined {
  return THEMES.find((t) => t.unlockAt === threshold);
}

export function isThemeId(id: string): boolean {
  return THEMES.some((t) => t.id === id);
}
