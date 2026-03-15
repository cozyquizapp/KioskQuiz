/**
 * sounds.ts — Web Audio API synth sounds, no external dependencies.
 * All sounds are generated programmatically.
 */

let ctx: AudioContext | null = null;
let masterVolume = 0.8;

export function setVolume(v: number) {
  masterVolume = Math.max(0, Math.min(1, v));
}
export function getVolume() {
  return masterVolume;
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx || ctx.state === 'closed') {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return ctx;
}

/** Resume context after user gesture (browsers require interaction first). */
export function resumeAudio() {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume();
}

function tone(
  freq: number,
  type: OscillatorType,
  startTime: number,
  duration: number,
  gainPeak: number,
  attack = 0.01,
  release = 0.1,
  c?: AudioContext
) {
  const ac = c ?? getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  const peak = gainPeak * masterVolume;
  gain.gain.linearRampToValueAtTime(peak, startTime + attack);
  gain.gain.setValueAtTime(peak, startTime + duration - release);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

/** Plays a happy major chord arpeggio — correct answer / win */
export function playCorrect() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  freqs.forEach((f, i) => tone(f, 'sine', t + i * 0.07, 0.35, 0.22, 0.01, 0.12, ac));
}

/** Low buzz — wrong answer */
export function playWrong() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(180, 'sawtooth', t, 0.18, 0.18, 0.005, 0.14, ac);
  tone(140, 'sawtooth', t + 0.09, 0.18, 0.14, 0.005, 0.12, ac);
}

/** Short high tick — timer countdown tick */
export function playTick() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(880, 'square', t, 0.055, 0.09, 0.004, 0.04, ac);
}

/** Urgent double-tick — last 5 seconds of timer */
export function playUrgentTick() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(1100, 'square', t, 0.06, 0.13, 0.003, 0.04, ac);
  tone(1100, 'square', t + 0.1, 0.06, 0.13, 0.003, 0.04, ac);
}

/** Time's up — low gong-like descend */
export function playTimesUp() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(440, 'sine', t, 0.55, 0.28, 0.01, 0.4, ac);
  tone(220, 'sine', t + 0.1, 0.6, 0.18, 0.01, 0.45, ac);
}

/** Fanfare — quiz start / new question intro */
export function playFanfare() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const pattern: [number, number, number][] = [
    [523.25, 0.0, 0.12],
    [659.25, 0.12, 0.12],
    [783.99, 0.24, 0.12],
    [1046.5, 0.36, 0.28],
  ];
  pattern.forEach(([f, offset, dur]) => tone(f, 'sine', t + offset, dur, 0.2, 0.01, 0.08, ac));
}

/** Reveal whoosh — answer revealed */
export function playReveal() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(800, t + 0.35);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.2 * masterVolume, t + 0.05);
  gain.gain.linearRampToValueAtTime(0, t + 0.4);
  osc.start(t);
  osc.stop(t + 0.45);
}

/** Score points pop — when team gets points */
export function playScoreUp() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(880, 'sine', t, 0.12, 0.18, 0.005, 0.08, ac);
  tone(1108.73, 'sine', t + 0.1, 0.14, 0.15, 0.005, 0.1, ac);
}
