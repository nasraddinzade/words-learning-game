/**
 * Fixed topic list for the word base (SPEC §9.3). Do not extend without need.
 * 29 topics. Each WordEntry.topic must be one of these ids.
 */
export const TOPICS = [
  'people',
  'feelings',
  'health',
  'food',
  'home',
  'family',
  'work',
  'money',
  'education',
  'travel',
  'city',
  'nature',
  'weather',
  'animals',
  'time',
  'communication',
  'technology',
  'arts',
  'sport',
  'shopping',
  'clothes',
  'law',
  'society',
  'science',
  'thinking',
  'actions',
  'qualities',
  'quantity',
  'function',
] as const;

export type Topic = (typeof TOPICS)[number];

export function isTopic(value: string): value is Topic {
  return (TOPICS as readonly string[]).includes(value);
}
