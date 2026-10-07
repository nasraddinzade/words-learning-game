import { useProfile } from './profileStore';

/**
 * Synthesised sounds through the Web Audio API, no audio files (SPEC §8.4). The context is
 * created on the first call, which always follows a user gesture (a tap or a key).
 */
let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function enabled(): boolean {
  return useProfile.getState().profile.settings.sound;
}

interface Tone {
  freq: number;
  at: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
}

function play(tones: Tone[]): void {
  if (!enabled()) return;
  const c = context();
  if (!c) return;
  const t0 = c.currentTime;
  for (const t of tones) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = t.type ?? 'sine';
    osc.frequency.setValueAtTime(t.freq, t0 + t.at);
    if (t.slideTo) osc.frequency.exponentialRampToValueAtTime(t.slideTo, t0 + t.at + t.dur);
    const peak = t.gain ?? 0.12;
    g.gain.setValueAtTime(0.0001, t0 + t.at);
    g.gain.exponentialRampToValueAtTime(peak, t0 + t.at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + t.at + t.dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0 + t.at);
    osc.stop(t0 + t.at + t.dur + 0.02);
  }
}

/** Combo tier 0-3 raises the pitch (SPEC §8.1). */
export function playCorrect(tier: number): void {
  const base = 520 * Math.pow(1.25, Math.min(3, tier));
  play([
    { freq: base, at: 0, dur: 0.09, type: 'triangle' },
    { freq: base * 1.5, at: 0.07, dur: 0.14, type: 'triangle' },
  ]);
}

export function playWrong(): void {
  play([{ freq: 220, at: 0, dur: 0.25, type: 'sawtooth', gain: 0.08, slideTo: 110 }]);
}

export function playLearned(): void {
  play([
    { freq: 523, at: 0, dur: 0.1, type: 'triangle' },
    { freq: 659, at: 0.1, dur: 0.1, type: 'triangle' },
    { freq: 784, at: 0.2, dur: 0.1, type: 'triangle' },
    { freq: 1047, at: 0.3, dur: 0.35, type: 'triangle', gain: 0.14 },
  ]);
}

export function playCelebration(): void {
  const notes = [523, 659, 784, 1047, 784, 1047, 1319];
  play(notes.map((freq, i) => ({ freq, at: i * 0.11, dur: 0.16, type: 'square' as OscillatorType, gain: 0.06 })));
}

export function playRecord(): void {
  play([
    { freq: 880, at: 0, dur: 0.12, type: 'triangle' },
    { freq: 1175, at: 0.12, dur: 0.3, type: 'triangle', gain: 0.14 },
  ]);
}

export function playTick(): void {
  play([{ freq: 1400, at: 0, dur: 0.03, type: 'square', gain: 0.03 }]);
}
