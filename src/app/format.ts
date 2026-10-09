/** 10000 → "10 000". One format for every counter on every screen. */
export function formatCount(n: number): string {
  return n.toLocaleString('en-US').replace(/,/g, ' ');
}

/**
 * The word as the player should see it. Entries are stored in lower case (validate-words
 * insists), but the pronoun "I" is always capitalised in English, so it is the one exception.
 */
export function displayWord(word: string): string {
  return word === 'i' ? 'I' : word;
}
