/** Splits "I {ran} into him" into before / hit / after. */
export function splitSentence(sentence: string): { before: string; hit: string; after: string } {
  const m = sentence.match(/^(.*?)\{([^{}]+)\}(.*)$/s);
  if (!m) return { before: sentence, hit: '', after: '' };
  return { before: m[1] ?? '', hit: m[2] ?? '', after: m[3] ?? '' };
}

export function plainSentence(sentence: string): string {
  return sentence.replace(/[{}]/g, '');
}
