/**
 * sounds.ts — Web Audio API synth sounds + custom audio file support.
 *
 * Each exported play* function checks for a custom URL first.
 * If set, it plays the audio file via HTMLAudioElement.
 * Otherwise it falls back to the built-in Web Audio synth.
 *
 * The timer loop also supports a custom URL (loops the file instead of synth).
 *
 * Usage:
 *   setSoundConfig({ fieldPlaced: 'https://...', steal: 'https://...' })
 *   playFieldPlaced()  // uses custom URL if set
 */

import type { QQSoundConfig, QQSoundSlot } from '../../../shared/quarterQuizTypes';
import { QQ_SOUND_DEFAULT_URLS } from '../../../shared/quarterQuizTypes';

// ── State ─────────────────────────────────────────────────────────────────────

let ctx: AudioContext | null = null;
let masterVolume = 0.8;
let soundConfig: QQSoundConfig = {};

// Music-Duck: globaler Faktor (0..1) der auf Loop-Musik multipliziert wird.
// 1.0 = normal, 0.2 = gedämpft (z.B. während PAUSE).
// Die setMusicDucked-API ist weiter unten definiert (nach loopAudioEl).
let musicDuckFactor = 1;
let musicDuckTarget = 1;
let duckRafHandle: number | null = null;

/** true wenn der Slot nicht per `enabled[slot] === false` stumm geschaltet wurde. */
function isSlotEnabled(slot: QQSoundSlot): boolean {
  return soundConfig.enabled?.[slot] !== false;
}

/** custom URL → default-WAV-URL → null (fall through to synth). */
function resolveSlotUrl(slot: QQSoundSlot): string | null {
  const custom = soundConfig[slot];
  if (typeof custom === 'string' && custom.length > 0) return custom;
  return QQ_SOUND_DEFAULT_URLS[slot] ?? null;
}

// Cache of preloaded HTMLAudioElement instances per URL
const audioCache: Map<string, HTMLAudioElement> = new Map();

/**
 * Fade ein HTMLAudioElement smooth aus und pausiere es danach.
 * Verhindert abrupte Abbrüche beim Timer-Stopp oder Question-Ende.
 *
 * @param el Audio-Element
 * @param durationMs Fade-Dauer (Default 500ms)
 * @param resetAfter currentTime auf 0 setzen nach dem Fade (für Loops sinnvoll)
 */
export function fadeOutAudio(
  el: HTMLAudioElement,
  durationMs = 500,
  resetAfter = false
) {
  if (el.paused || el.volume === 0) {
    el.pause();
    if (resetAfter) el.currentTime = 0;
    return;
  }
  const startVol = el.volume;
  const startTime = performance.now();
  const step = () => {
    const progress = (performance.now() - startTime) / durationMs;
    if (progress >= 1) {
      el.pause();
      el.volume = startVol;
      if (resetAfter) el.currentTime = 0;
      return;
    }
    el.volume = startVol * (1 - progress);
    window.setTimeout(step, 16);
  };
  step();
}

export function setVolume(v: number) {
  masterVolume = Math.max(0, Math.min(1, v));
  // Update any playing audio elements
  audioCache.forEach(el => { el.volume = masterVolume; });
}
export function getVolume() {
  return masterVolume;
}

/** Set custom sound URLs. Call this when the draft/game starts. */
export function setSoundConfig(config: QQSoundConfig | undefined) {
  soundConfig = config ?? {};
}

export function getSoundConfig(): QQSoundConfig {
  return soundConfig;
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

// ── Audio file playback ───────────────────────────────────────────────────────

function getOrCreateAudio(url: string): HTMLAudioElement {
  let el = audioCache.get(url);
  if (!el) {
    el = new Audio(url);
    el.preload = 'auto';
    audioCache.set(url, el);
  }
  return el;
}

// Spam-Guard: gleicher Sound darf erst nach X ms erneut getriggert werden.
// Schützt vor Endlos-Retrigger-Loops (Buggy Effect / React-Re-render-Storm).
const lastPlayAt: Map<string, number> = new Map();
const PLAY_COOLDOWN_MS = 200;

/** Play a one-shot audio file. Resets to start if already playing. */
function playAudioFile(url: string) {
  const now = Date.now();
  const last = lastPlayAt.get(url) ?? 0;
  if (now - last < PLAY_COOLDOWN_MS) return; // spam-guard
  lastPlayAt.set(url, now);
  const el = getOrCreateAudio(url);
  el.volume = masterVolume;
  el.currentTime = 0;
  el.loop = false;
  el.play().catch(() => {/* autoplay blocked — needs user gesture first */});
}

// ── Synth helpers ─────────────────────────────────────────────────────────────

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
let loopAudioEl: HTMLAudioElement | null = null;

let lobbyLoopActive = false;
let lobbyAudioEl: HTMLAudioElement | null = null;

function applyDuckToLoop() {
  if (loopAudioEl) loopAudioEl.volume = masterVolume * musicDuckFactor;
  // Lobby-Loop wird nicht geduckt — sie IST die Pausen-/Lobby-Musik.
  if (lobbyAudioEl) lobbyAudioEl.volume = masterVolume;
}

/** Ziel-Duck setzen (500ms smooth fade). true = auf 0.2 dämpfen, false = auf 1 zurück. */
export function setMusicDucked(ducked: boolean) {
  musicDuckTarget = ducked ? 0.2 : 1;
  if (duckRafHandle !== null) return;
  const stepMs = 16;
  const durMs = 500;
  const tick = () => {
    const delta = musicDuckTarget - musicDuckFactor;
    const maxChange = stepMs / durMs;
    if (Math.abs(delta) <= maxChange) {
      musicDuckFactor = musicDuckTarget;
      applyDuckToLoop();
      duckRafHandle = null;
      return;
    }
    musicDuckFactor += Math.sign(delta) * maxChange;
    applyDuckToLoop();
    duckRafHandle = window.setTimeout(tick, stepMs);
  };
  duckRafHandle = window.setTimeout(tick, stepMs);
}

/** Aktueller Duck-Faktor, nützlich für externe Audio-Elemente (question musicUrl). */
export function getMusicDuckFactor(): number {
  return musicDuckFactor;
}

/**
 * Starts a looping timer sound while the question is active.
 * Uses custom URL if set in soundConfig.timerLoop, else synth.
 */
export function startTimerLoop() {
  if (loopActive) return;
  if (!isSlotEnabled('timerLoop')) return;
  loopActive = true;

  const url = resolveSlotUrl('timerLoop');
  if (url) {
    loopAudioEl = getOrCreateAudio(url);
    loopAudioEl.volume = masterVolume * musicDuckFactor;
    loopAudioEl.currentTime = 0;
    loopAudioEl.loop = true;
    loopAudioEl.play().catch(() => {});
    return;
  }

  const ac = getCtx();
  if (!ac) return;
  scheduleLoopPattern(ac, ac.currentTime, 0);
}

function scheduleLoopPattern(ac: AudioContext, t: number, step: number) {
  if (!loopActive) return;

  const beat = 0.5; // 120 BPM

  // Bass pulse on every beat
  const bass = ac.createOscillator();
  const bassGain = ac.createGain();
  bass.connect(bassGain);
  bassGain.connect(ac.destination);
  bass.type = 'sine';
  bass.frequency.setValueAtTime(65, t);
  bassGain.gain.setValueAtTime(0, t);
  bassGain.gain.linearRampToValueAtTime(0.18 * masterVolume, t + 0.01);
  bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  bass.start(t);
  bass.stop(t + 0.25);

  // Melody: 8-step C-major arpeggio
  const melody = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 523.25, 0];
  const freq = melody[step % 8];
  if (freq > 0) {
    tone(freq, 'triangle', t, beat * 0.65, 0.10, 0.008, 0.12, ac);
  }

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
  if (loopAudioEl) {
    // Smoother Abgang: ~450ms fade statt hartem pause().
    const el = loopAudioEl;
    loopAudioEl = null;
    fadeOutAudio(el, 450, true);
  }
}

// ── One-shot sounds ───────────────────────────────────────────────────────────

export function playCorrect() {
  if (!isSlotEnabled('correct')) return;
  const url = resolveSlotUrl('correct');
  if (url) { playAudioFile(url); return; }
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const freqs = [523.25, 659.25, 783.99, 1046.5];
  freqs.forEach((f, i) => tone(f, 'sine', t + i * 0.07, 0.35, 0.22, 0.01, 0.12, ac));
}

export function playWrong() {
  if (!isSlotEnabled('wrong')) return;
  const url = resolveSlotUrl('wrong');
  if (url) { playAudioFile(url); return; }
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(180, 'sawtooth', t, 0.18, 0.18, 0.005, 0.14, ac);
  tone(140, 'sawtooth', t + 0.09, 0.18, 0.14, 0.005, 0.12, ac);
}

export function playTick() {
  // Ticks never have custom overrides — they're too frequent
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(880, 'square', t, 0.055, 0.09, 0.004, 0.04, ac);
}

export function playUrgentTick() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(1100, 'square', t, 0.06, 0.13, 0.003, 0.04, ac);
  tone(1100, 'square', t + 0.1, 0.06, 0.13, 0.003, 0.04, ac);
}

export function playTimesUp() {
  if (!isSlotEnabled('timesUp')) return;
  const url = resolveSlotUrl('timesUp');
  if (url) { playAudioFile(url); return; }
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
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
  tone(75, 'sine', t + 0.05, 0.28, 0.22, 0.004, 0.22, ac);
}

export function playFanfare() {
  if (!isSlotEnabled('fanfare')) return;
  const url = resolveSlotUrl('fanfare');
  if (url) { playAudioFile(url); return; }
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

export function playReveal() {
  if (!isSlotEnabled('reveal')) return;
  const url = resolveSlotUrl('reveal');
  if (url) { playAudioFile(url); return; }
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

export function playScoreUp() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(880, 'sine', t, 0.12, 0.18, 0.005, 0.08, ac);
  tone(1108.73, 'sine', t + 0.1, 0.14, 0.15, 0.005, 0.1, ac);
}

export function playFieldPlaced() {
  if (!isSlotEnabled('fieldPlaced')) return;
  const url = resolveSlotUrl('fieldPlaced');
  if (url) { playAudioFile(url); return; }
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(110, 'sine', t, 0.12, 0.28, 0.004, 0.1, ac);
  tone(220, 'sine', t, 0.1, 0.2, 0.004, 0.08, ac);
  tone(660, 'sine', t + 0.04, 0.2, 0.14, 0.005, 0.16, ac);
  tone(1320, 'triangle', t + 0.06, 0.18, 0.07, 0.004, 0.14, ac);
}

export function playSteal() {
  if (!isSlotEnabled('steal')) return;
  const url = resolveSlotUrl('steal');
  if (url) { playAudioFile(url); return; }
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
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
  tone(440, 'triangle', t + 0.28, 0.1, 0.2, 0.005, 0.08, ac);
  tone(880, 'triangle', t + 0.36, 0.18, 0.18, 0.005, 0.14, ac);
}

export function playLobbyWelcome() {
  if (!isSlotEnabled('lobbyWelcome')) return;
  const url = resolveSlotUrl('lobbyWelcome');
  if (url) { playAudioFile(url); return; }
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  notes.forEach((f, i) =>
    tone(f, 'sine', t + i * 0.13, 0.45, 0.16 - i * 0.02, 0.01, 0.32, ac)
  );
}

/** Startet die Lobby-Loop (Lobby / Welcome-Folie / Pause). Idempotent. */
export function startLobbyLoop() {
  if (lobbyLoopActive) return;
  if (!isSlotEnabled('lobbyWelcome')) return;
  const url = resolveSlotUrl('lobbyWelcome');
  if (!url) return; // kein Synth-Fallback für Loop
  lobbyLoopActive = true;
  lobbyAudioEl = getOrCreateAudio(url);
  lobbyAudioEl.volume = masterVolume * musicDuckFactor;
  lobbyAudioEl.currentTime = 0;
  lobbyAudioEl.loop = true;
  lobbyAudioEl.play().catch(() => {});
}

export function stopLobbyLoop() {
  if (!lobbyLoopActive && !lobbyAudioEl) return;
  lobbyLoopActive = false;
  if (lobbyAudioEl) {
    const el = lobbyAudioEl;
    lobbyAudioEl = null;
    fadeOutAudio(el, 450, true);
  }
}

export function playGameOver() {
  if (!isSlotEnabled('gameOver')) return;
  const url = resolveSlotUrl('gameOver');
  if (url) { playAudioFile(url); return; }
  // Default: extended fanfare (synth fallback)
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const pattern: [number, number, number][] = [
    [523.25, 0.0,  0.15],
    [659.25, 0.15, 0.15],
    [783.99, 0.30, 0.15],
    [1046.5, 0.45, 0.35],
    [783.99, 0.80, 0.12],
    [1046.5, 0.92, 0.5],
  ];
  pattern.forEach(([f, offset, dur]) => tone(f, 'sine', t + offset, dur, 0.22, 0.01, 0.08, ac));
}
