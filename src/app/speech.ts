/** Text-to-speech via the browser's speechSynthesis (SPEC §5.3). No audio files, no network. */

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

export function listEnglishVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported()) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
}

/** Speaks the texts one after another. Cancels anything still playing. */
export function speak(texts: string[], voiceName: string | null): void {
  if (!speechSupported()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const voice = voiceName ? synth.getVoices().find((v) => v.name === voiceName) ?? null : null;
  for (const text of texts) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    if (voice) u.voice = voice;
    u.rate = 0.95;
    synth.speak(u);
  }
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}
