export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
export type Level = (typeof LEVELS)[number];

export const POS = ['noun', 'verb', 'adj', 'adv', 'prep', 'conj', 'pron', 'det', 'interj'] as const;
export type Pos = (typeof POS)[number];

/** One record of the word base (SPEC §9.1). */
export interface WordEntry {
  id: string; // "run-v"
  word: string; // lemma, lower case
  pos: Pos;
  rank: number; // 1..10000 by frequency
  level: Level;
  topic: string; // one of TOPICS (src/content/topics.ts)
  definition: string; // simple English, never contains the word itself
  sentence: string; // the word in braces: "I {ran} into an old friend."
  translation: string; // Russian translation of the sentence
  accept?: string[]; // accepted spelling variants
  avoid: string[]; // synonyms that would also fit the definition
}

export const NEW_PER_GAME_OPTIONS = [5, 10, 15, 20] as const;
export type NewPerGame = (typeof NEW_PER_GAME_OPTIONS)[number];

export const TOTAL_WORDS = 10_000;
