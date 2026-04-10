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

// ── Timer loop ────────────────────────────────────────────────────────────────

let loopActive = false;
let loopScheduleTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Starts a looping game-show timer music while the question is active.
 * 120 BPM, C-major bass pulse + ascending melody arpeggio.
 */
export function startTimerLoop() {
  const ac = getCtx();
  if (!ac || loopActive) return;
  loopActive = true;
  scheduleLoopPattern(ac, ac.currentTime, 0);
}

function scheduleLoopPattern(ac: AudioContext, t: number, step: number) {
  if (!loopActive) return;

  const beat = 0.5; // 120 BPM

  // Bass pulse on every beat — short sine thump
  const bass = ac.createOscillator();
  const bassGain = ac.createGain();
  bass.connect(bassGain);
  bassGain.connect(ac.destination);
  bass.type = 'sine';
  bass.frequency.setValueAtTime(65, t); // C2
  bassGain.gain.setValueAtTime(0, t);
  bassGain.gain.linearRampToValueAtTime(0.18 * masterVolume, t + 0.01);
  bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  bass.start(t);
  bass.stop(t + 0.25);

  // Melody: 8-step C-major arpeggio pattern (C5 E5 G5 C6 G5 E5 C5 rest)
  const melody = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 523.25, 0];
  const freq = melody[step % 8];
  if (freq > 0) {
    tone(freq, 'triangle', t, beat * 0.65, 0.10, 0.008, 0.12, ac);
  }

  // Schedule next beat ~50ms early for tight timing
  const nextT = t + beat;
  const delayMs = (nextT - ac.currentTime) * 1000 - 50;
  loopScheduleTimeout = setTimeout(
    () => scheduleLoopPattern(ac, nextT, step + 1),
    Math.max(0, delayMs)
  );
}

export function stopTimerLoop() {
  loopActive = false;
  if (loopScheduleTimeout !== null) {
    clearTimeout(loopScheduleTimeout);
    loopScheduleTimeout = null;
  }
}

// ── One-shot sounds ───────────────────────────────────────────────────────────

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

/** Short high tick — timer countdown tick (10–6 s) */
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

/** Time's up — game-show buzzer: descending sawtooth sting */
export function playTimesUp() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // Main buzzer: descending sawtooth
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(380, t);
  osc.frequency.exponentialRampToValueAtTime(110, t + 0.45);
  gain.gain.setValueAtTime(0.32 * masterVolume, t);
  gain.gain.linearRampToValueAtTime(0, t + 0.5);
  osc.start(t);
  osc.stop(t + 0.55);
  // Low impact punch
  tone(75, 'sine', t + 0.05, 0.28, 0.22, 0.004, 0.22, ac);
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

/**
 * Field placed on the grid — satisfying "stamp" thunk with bright ring.
 * Plays when a territory cell is claimed.
 */
export function playFieldPlaced() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // Low thud
  tone(110, 'sine', t, 0.12, 0.28, 0.004, 0.1, ac);
  // Mid body
  tone(220, 'sine', t, 0.1, 0.2, 0.004, 0.08, ac);
  // Bright ring overtone
  tone(660, 'sine', t + 0.04, 0.2, 0.14, 0.005, 0.16, ac);
  // Shimmer
  tone(1320, 'triangle', t + 0.06, 0.18, 0.07, 0.004, 0.14, ac);
}

/**
 * Steal sound — mischievous whoosh-down + triumphant sting.
 * Plays when a CHEESE answer reveals / territory is stolen.
 */
export function playSteal() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // Descending whoosh
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1400, t);
  osc.frequency.exponentialRampToValueAtTime(280, t + 0.28);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.22 * masterVolume, t + 0.02);
  gain.gain.linearRampToValueAtTime(0, t + 0.32);
  osc.start(t);
  osc.stop(t + 0.35);
  // Triumphant two-note sting
  tone(440, 'triangle', t + 0.28, 0.1,  0.2,  0.005, 0.08, ac);
  tone(880, 'triangle', t + 0.36, 0.18, 0.18, 0.005, 0.14, ac);
}

/**
 * Lobby welcome chime — warm ascending notes when teams join.
 */
export function playLobbyWelcome() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  notes.forEach((f, i) =>
    tone(f, 'sine', t + i * 0.13, 0.45, 0.16 - i * 0.02, 0.01, 0.32, ac)
  );
}
