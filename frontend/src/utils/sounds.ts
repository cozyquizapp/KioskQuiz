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
  const def = QQ_SOUND_DEFAULT_URLS[slot];
  // Leerer String = absichtlich kein Default (synth-only bis Moderator Datei lädt).
  return def && def.length > 0 ? def : null;
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
 * Starts a looping music track while the question is active.
 * Priority:
 *   1. preferredSlot (z.B. catMusicMucho) wenn URL gesetzt UND enabled
 *   2. timerLoop-Slot (Default-WAV oder Custom-Upload)
 *   3. Synth-Fallback (120-BPM C-Dur Arpeggio)
 * Der timerLoop-Master-Mute deaktiviert ALLES (auch Kategorie-Musik),
 * damit der Moderator weiterhin einen Single-Toggle fuer Frage-Musik hat.
 */
export function startTimerLoop(preferredSlot?: QQSoundSlot) {
  if (loopActive) return;
  if (!isSlotEnabled('timerLoop')) return;
  loopActive = true;

  // 1. Kategorie-spezifische URL?
  let url: string | null = null;
  if (preferredSlot && preferredSlot !== 'timerLoop' && isSlotEnabled(preferredSlot)) {
    url = resolveSlotUrl(preferredSlot);
  }
  // 2. Fallback timerLoop URL
  if (!url) url = resolveSlotUrl('timerLoop');

  if (url) {
    loopAudioEl = getOrCreateAudio(url);
    loopAudioEl.volume = masterVolume * musicDuckFactor;
    loopAudioEl.currentTime = 0;
    loopAudioEl.loop = true;
    loopAudioEl.play().catch(() => {});
    return;
  }

  // 3. Synth-Fallback
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

// ── Synth preset registry ────────────────────────────────────────────────────
// Pro One-Shot-Slot mehrere Synth-Varianten. Moderator wählt eine per
// soundConfig.preset[slot] im SoundPanel. Wenn kein Preset gesetzt und keine
// Custom-URL da → Default-WAV. Wenn Preset gesetzt → dieser Synth (statt WAV).

type SynthVariant = { label: string; play: (ac: AudioContext, t: number) => void };
type SlotPresets = Record<string, SynthVariant>;

export const SYNTH_PRESETS: Partial<Record<QQSoundSlot, SlotPresets>> = {
  correct: {
    classic: {
      label: 'Klassisch — Arpeggio',
      play: (ac, t) => {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          tone(f, 'sine', t + i * 0.07, 0.35, 0.22, 0.01, 0.12, ac));
      },
    },
    chime: {
      label: 'Chime — Glocke',
      play: (ac, t) => {
        tone(1046.5, 'sine', t,        0.5, 0.22, 0.005, 0.4, ac);
        tone(1567.98,'sine', t + 0.02, 0.5, 0.14, 0.005, 0.4, ac);
        tone(2093.0, 'sine', t + 0.04, 0.4, 0.08, 0.005, 0.35, ac);
      },
    },
    arcade: {
      label: 'Arcade — 8-Bit Ding',
      play: (ac, t) => {
        tone(880,  'square', t,        0.08, 0.14, 0.004, 0.04, ac);
        tone(1320, 'square', t + 0.08, 0.08, 0.14, 0.004, 0.04, ac);
        tone(1760, 'square', t + 0.16, 0.14, 0.14, 0.004, 0.08, ac);
      },
    },
  },
  wrong: {
    classic: {
      label: 'Klassisch — Sawtooth',
      play: (ac, t) => {
        tone(180, 'sawtooth', t,        0.18, 0.18, 0.005, 0.14, ac);
        tone(140, 'sawtooth', t + 0.09, 0.18, 0.14, 0.005, 0.12, ac);
      },
    },
    buzzer: {
      label: 'Buzzer — Hart',
      play: (ac, t) => {
        tone(110, 'square', t,        0.28, 0.24, 0.004, 0.08, ac);
        tone(82,  'square', t + 0.04, 0.28, 0.20, 0.004, 0.08, ac);
      },
    },
    sadTrombone: {
      label: 'Sad Trombone',
      play: (ac, t) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(392, t);
        osc.frequency.linearRampToValueAtTime(349.23, t + 0.18);
        osc.frequency.linearRampToValueAtTime(329.63, t + 0.36);
        osc.frequency.linearRampToValueAtTime(261.63, t + 0.6);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.22 * masterVolume, t + 0.02);
        gain.gain.linearRampToValueAtTime(0, t + 0.7);
        osc.start(t);
        osc.stop(t + 0.75);
      },
    },
  },
  timesUp: {
    classic: {
      label: 'Klassisch — Swoop',
      play: (ac, t) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(380, t);
        osc.frequency.exponentialRampToValueAtTime(110, t + 0.45);
        gain.gain.setValueAtTime(0.32 * masterVolume, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.5);
        osc.start(t); osc.stop(t + 0.55);
        tone(75, 'sine', t + 0.05, 0.28, 0.22, 0.004, 0.22, ac);
      },
    },
    alarm: {
      label: 'Alarm — Beep',
      play: (ac, t) => {
        for (let i = 0; i < 3; i++) {
          tone(880, 'square', t + i * 0.15, 0.1, 0.2, 0.004, 0.04, ac);
        }
      },
    },
    gong: {
      label: 'Gong — Tief',
      play: (ac, t) => {
        tone(65,  'sine',     t, 0.9, 0.3,  0.005, 0.7, ac);
        tone(130, 'sine',     t, 0.8, 0.2,  0.005, 0.6, ac);
        tone(195, 'triangle', t, 0.6, 0.1,  0.005, 0.4, ac);
      },
    },
  },
  fanfare: {
    classic: {
      label: 'Klassisch — 4-Ton',
      play: (ac, t) => {
        const pattern: [number, number, number][] = [
          [523.25, 0.0,  0.12],
          [659.25, 0.12, 0.12],
          [783.99, 0.24, 0.12],
          [1046.5, 0.36, 0.28],
        ];
        pattern.forEach(([f, o, d]) => tone(f, 'sine', t + o, d, 0.2, 0.01, 0.08, ac));
      },
    },
    trumpet: {
      label: 'Trompete',
      play: (ac, t) => {
        tone(523.25, 'sawtooth', t,        0.14, 0.18, 0.006, 0.06, ac);
        tone(523.25, 'sawtooth', t + 0.16, 0.14, 0.18, 0.006, 0.06, ac);
        tone(783.99, 'sawtooth', t + 0.32, 0.18, 0.2,  0.006, 0.08, ac);
        tone(1046.5, 'sawtooth', t + 0.52, 0.4,  0.22, 0.006, 0.16, ac);
      },
    },
    celebration: {
      label: 'Feier — Lang',
      play: (ac, t) => {
        [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.5].forEach((f, i) =>
          tone(f, 'sine', t + i * 0.08, 0.35, 0.18, 0.01, 0.2, ac));
        tone(1975.5, 'triangle', t + 0.4, 0.5, 0.1, 0.01, 0.4, ac);
      },
    },
  },
  reveal: {
    classic: {
      label: 'Klassisch — Sweep',
      play: (ac, t) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.35);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.2 * masterVolume, t + 0.05);
        gain.gain.linearRampToValueAtTime(0, t + 0.4);
        osc.start(t); osc.stop(t + 0.45);
      },
    },
    curtain: {
      label: 'Vorhang — Slow',
      play: (ac, t) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.8);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18 * masterVolume, t + 0.1);
        gain.gain.linearRampToValueAtTime(0, t + 0.9);
        osc.start(t); osc.stop(t + 0.95);
      },
    },
    drumroll: {
      label: 'Drumroll + Ding',
      play: (ac, t) => {
        for (let i = 0; i < 12; i++) {
          tone(120 + Math.random() * 40, 'square', t + i * 0.04, 0.03, 0.08, 0.002, 0.02, ac);
        }
        tone(1046.5, 'sine',     t + 0.55, 0.3, 0.22, 0.01, 0.2, ac);
        tone(1567.98,'triangle', t + 0.55, 0.3, 0.12, 0.01, 0.2, ac);
      },
    },
  },
  fieldPlaced: {
    classic: {
      label: 'Klassisch — Thump',
      play: (ac, t) => {
        tone(110, 'sine', t,        0.12, 0.28, 0.004, 0.1,  ac);
        tone(220, 'sine', t,        0.1,  0.2,  0.004, 0.08, ac);
        tone(660, 'sine', t + 0.04, 0.2,  0.14, 0.005, 0.16, ac);
        tone(1320,'triangle', t + 0.06, 0.18, 0.07, 0.004, 0.14, ac);
      },
    },
    satisfying: {
      label: 'Snap — Knackig',
      play: (ac, t) => {
        tone(180, 'sine',   t,        0.08, 0.26, 0.003, 0.06, ac);
        tone(880, 'triangle', t + 0.02, 0.12, 0.2,  0.003, 0.09, ac);
        tone(1760,'sine',   t + 0.04, 0.18, 0.1,  0.003, 0.14, ac);
      },
    },
    stamp: {
      label: 'Stempel — Bass',
      play: (ac, t) => {
        tone(55,  'sine', t, 0.3, 0.35, 0.004, 0.22, ac);
        tone(110, 'sine', t, 0.2, 0.25, 0.004, 0.14, ac);
        tone(440, 'triangle', t + 0.04, 0.12, 0.12, 0.004, 0.08, ac);
      },
    },
  },
  teamReveal: {
    classic: {
      label: 'Klassisch — Thump',
      play: (ac, t) => {
        tone(110, 'sine', t,        0.12, 0.28, 0.004, 0.1,  ac);
        tone(220, 'sine', t,        0.1,  0.2,  0.004, 0.08, ac);
        tone(660, 'sine', t + 0.04, 0.2,  0.14, 0.005, 0.16, ac);
        tone(1320,'triangle', t + 0.06, 0.18, 0.07, 0.004, 0.14, ac);
      },
    },
    slam: {
      label: 'Slam — Hart',
      play: (ac, t) => {
        tone(50,  'sine',     t, 0.4, 0.4, 0.003, 0.32, ac);
        tone(100, 'sine',     t, 0.3, 0.3, 0.003, 0.24, ac);
        tone(800, 'triangle', t + 0.05, 0.2, 0.14, 0.003, 0.14, ac);
      },
    },
    drumHit: {
      label: 'Drum + Ring',
      play: (ac, t) => {
        tone(65,  'sine',     t, 0.25, 0.32, 0.003, 0.2, ac);
        tone(1760,'sine',     t + 0.02, 0.45, 0.12, 0.005, 0.38, ac);
        tone(2637,'triangle', t + 0.02, 0.4,  0.06, 0.005, 0.34, ac);
      },
    },
  },
  steal: {
    classic: {
      label: 'Klassisch — Whoosh',
      play: (ac, t) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, t);
        osc.frequency.exponentialRampToValueAtTime(280, t + 0.28);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.22 * masterVolume, t + 0.02);
        gain.gain.linearRampToValueAtTime(0, t + 0.32);
        osc.start(t); osc.stop(t + 0.35);
        tone(440, 'triangle', t + 0.28, 0.1,  0.2,  0.005, 0.08, ac);
        tone(880, 'triangle', t + 0.36, 0.18, 0.18, 0.005, 0.14, ac);
      },
    },
    zap: {
      label: 'Zap — Elektrisch',
      play: (ac, t) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(2400, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.18);
        gain.gain.setValueAtTime(0.24 * masterVolume, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.22);
        osc.start(t); osc.stop(t + 0.25);
      },
    },
    laser: {
      label: 'Laser — Sci-Fi',
      play: (ac, t) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1800, t);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.22);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.2 * masterVolume, t + 0.01);
        gain.gain.linearRampToValueAtTime(0, t + 0.26);
        osc.start(t); osc.stop(t + 0.28);
        tone(110, 'sine', t + 0.22, 0.1, 0.18, 0.004, 0.08, ac);
      },
    },
  },
  lobbyWelcome: {
    classic: {
      label: 'Klassisch — Aufsteigend',
      play: (ac, t) => {
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
          tone(f, 'sine', t + i * 0.13, 0.45, 0.16 - i * 0.02, 0.01, 0.32, ac));
      },
    },
    warm: {
      label: 'Warm — Chord',
      play: (ac, t) => {
        [261.63, 329.63, 392.0, 523.25].forEach(f =>
          tone(f, 'sine', t, 1.2, 0.12, 0.2, 0.8, ac));
      },
    },
    cheerful: {
      label: 'Cheerful — Bell',
      play: (ac, t) => {
        [523.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) =>
          tone(f, 'triangle', t + i * 0.09, 0.55, 0.15, 0.005, 0.4, ac));
      },
    },
  },
  questionStart: {
    classic: {
      label: 'Klassisch — Sparkle',
      play: (ac, t) => {
        tone(783.99, 'triangle', t,        0.14, 0.16, 0.006, 0.10, ac);
        tone(1046.5, 'triangle', t + 0.09, 0.22, 0.18, 0.006, 0.14, ac);
        tone(1567.98,'sine',     t + 0.09, 0.18, 0.08, 0.006, 0.14, ac);
      },
    },
    ping: {
      label: 'Ping — Einfach',
      play: (ac, t) => {
        tone(1318.5, 'sine',     t, 0.3, 0.22, 0.004, 0.24, ac);
        tone(1975.5, 'triangle', t, 0.3, 0.08, 0.004, 0.24, ac);
      },
    },
    pop: {
      label: 'Pop — Kurz',
      play: (ac, t) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.08);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.2 * masterVolume, t + 0.01);
        gain.gain.linearRampToValueAtTime(0, t + 0.12);
        osc.start(t); osc.stop(t + 0.15);
      },
    },
  },
  roundStart: {
    classic: {
      label: 'Klassisch — Bass+3-Ton',
      play: (ac, t) => {
        tone(110,     'sine',     t,        0.20, 0.28, 0.004, 0.14, ac);
        tone(587.33,  'triangle', t + 0.05, 0.18, 0.18, 0.006, 0.12, ac);
        tone(880.00,  'triangle', t + 0.18, 0.18, 0.18, 0.006, 0.12, ac);
        tone(1174.66, 'triangle', t + 0.31, 0.30, 0.20, 0.006, 0.18, ac);
        tone(1760.00, 'sine',     t + 0.31, 0.28, 0.08, 0.006, 0.18, ac);
      },
    },
    bells: {
      label: 'Triple Bell',
      play: (ac, t) => {
        for (let i = 0; i < 3; i++) {
          tone(1046.5, 'sine',     t + i * 0.18, 0.5, 0.18, 0.006, 0.4, ac);
          tone(1567.98,'triangle', t + i * 0.18, 0.5, 0.1,  0.006, 0.4, ac);
        }
      },
    },
    intro: {
      label: 'Intro — Whoosh+Fanfare',
      play: (ac, t) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.35);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18 * masterVolume, t + 0.05);
        gain.gain.linearRampToValueAtTime(0, t + 0.4);
        osc.start(t); osc.stop(t + 0.45);
        tone(523.25, 'triangle', t + 0.38, 0.2, 0.2, 0.006, 0.14, ac);
        tone(1046.5, 'triangle', t + 0.55, 0.4, 0.22, 0.006, 0.2, ac);
      },
    },
  },
  gameOver: {
    classic: {
      label: 'Klassisch — Extended Fanfare',
      play: (ac, t) => {
        const pattern: [number, number, number][] = [
          [523.25, 0.0,  0.15],
          [659.25, 0.15, 0.15],
          [783.99, 0.30, 0.15],
          [1046.5, 0.45, 0.35],
          [783.99, 0.80, 0.12],
          [1046.5, 0.92, 0.5],
        ];
        pattern.forEach(([f, o, d]) => tone(f, 'sine', t + o, d, 0.22, 0.01, 0.08, ac));
      },
    },
    victory: {
      label: 'Victory — Major',
      play: (ac, t) => {
        tone(523.25, 'sine', t,       0.2, 0.22, 0.008, 0.08, ac);
        tone(659.25, 'sine', t + 0.2, 0.2, 0.22, 0.008, 0.08, ac);
        tone(783.99, 'sine', t + 0.4, 0.2, 0.22, 0.008, 0.08, ac);
        // Final chord
        [523.25, 659.25, 783.99, 1046.5].forEach(f =>
          tone(f, 'sine', t + 0.6, 1.0, 0.18, 0.01, 0.7, ac));
      },
    },
    epic: {
      label: 'Epic — Bass-Hit',
      play: (ac, t) => {
        tone(55,  'sine', t, 1.2, 0.4, 0.01, 0.9, ac);
        tone(110, 'sine', t, 1.0, 0.3, 0.01, 0.8, ac);
        [523.25, 659.25, 783.99].forEach((f, i) =>
          tone(f, 'sawtooth', t + 0.2 + i * 0.15, 0.3, 0.2, 0.01, 0.14, ac));
        [1046.5, 1318.5, 1567.98].forEach((f, i) =>
          tone(f, 'sine', t + 0.65 + i * 0.05, 1.1, 0.18, 0.01, 0.8, ac));
      },
    },
  },
};

// ── Slot dispatch ────────────────────────────────────────────────────────────
// Kanal-Auflösung pro Slot:
//   1. enabled[slot] === false      → stumm
//   2. soundConfig[slot] = Custom-URL → File abspielen (Upload gewinnt immer)
//   3. preset[slot] gesetzt         → Synth-Variante (überspringt Default-WAV)
//   4. Default-WAV existiert        → File abspielen
//   5. sonst                        → classic-Synth als letzter Fallback

function playSlotOneShot(slot: QQSoundSlot) {
  if (!isSlotEnabled(slot)) return;
  const custom = soundConfig[slot];
  if (typeof custom === 'string' && custom.length > 0) {
    playAudioFile(custom);
    return;
  }
  const presetKey = soundConfig.preset?.[slot];
  const presets = SYNTH_PRESETS[slot];
  if (presetKey && presets?.[presetKey]) {
    const ac = getCtx();
    if (!ac) return;
    presets[presetKey].play(ac, ac.currentTime);
    return;
  }
  const defUrl = QQ_SOUND_DEFAULT_URLS[slot];
  if (defUrl && defUrl.length > 0) {
    playAudioFile(defUrl);
    return;
  }
  if (presets?.classic) {
    const ac = getCtx();
    if (!ac) return;
    presets.classic.play(ac, ac.currentTime);
  }
}

/** Einmalig einen bestimmten Preset direkt abspielen (für Live-Preview im Panel). */
export function playSynthPreset(slot: QQSoundSlot, presetKey: string) {
  const presets = SYNTH_PRESETS[slot];
  const variant = presets?.[presetKey];
  if (!variant) return;
  const ac = getCtx();
  if (!ac) return;
  variant.play(ac, ac.currentTime);
}

// ── One-shot sounds ───────────────────────────────────────────────────────────

// Basis-Play-Funktionen — direkte Slot-Aufrufe.
export function playCorrect()      { playSlotOneShot('correct'); }
export function playWrong()        { playSlotOneShot('wrong'); }
export function playTimesUp()      { playSlotOneShot('timesUp'); }
export function playFanfare()      { playSlotOneShot('fanfare'); }
export function playReveal()       { playSlotOneShot('reveal'); }
export function playFieldPlaced()  { playSlotOneShot('fieldPlaced'); }
export function playTeamReveal()   { playSlotOneShot('teamReveal'); }
export function playSteal()        { playSlotOneShot('steal'); }
export function playLobbyWelcome() { playSlotOneShot('lobbyWelcome'); }

// Kategorie-aware Wrapper: wenn ein kategorie-spezifischer Slot eine URL hat,
// wird er gespielt — sonst Fallback auf generic. Das erlaubt pro Kategorie
// individuelle MP3s ohne dass alle generischen Calls gebrochen werden.
const CAT_SLOT_SUFFIX: Record<string, string> = {
  SCHAETZCHEN:   'Schaetzchen',
  MUCHO:         'Mucho',
  BUNTE_TUETE:   'BunteTuete',
  ZEHN_VON_ZEHN: 'ZehnVonZehn',
  CHEESE:        'Cheese',
};
function playSlotForCategoryOrFallback(baseSlot: QQSoundSlot, category?: string | null): void {
  if (category && CAT_SLOT_SUFFIX[category]) {
    const specific = `${baseSlot}${CAT_SLOT_SUFFIX[category]}` as QQSoundSlot;
    const url = resolveSlotUrl(specific);
    if (url && isSlotEnabled(specific)) {
      playSlotOneShot(specific);
      return;
    }
  }
  playSlotOneShot(baseSlot);
}
export function playCorrectFor(category?: string | null)       { playSlotForCategoryOrFallback('correct', category); }
export function playWrongFor(category?: string | null)         { playSlotForCategoryOrFallback('wrong', category); }
export function playRevealFor(category?: string | null)        { playSlotForCategoryOrFallback('reveal', category); }
export function playQuestionStartFor(category?: string | null) { playSlotForCategoryOrFallback('questionStart', category); }

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

export function playScoreUp() {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(880, 'sine', t, 0.12, 0.18, 0.005, 0.08, ac);
  tone(1108.73, 'sine', t + 0.1, 0.14, 0.15, 0.005, 0.1, ac);
}

/** Pool von Lobby-Musik-Tracks. Beim Start wird einer zufällig gewählt
 *  (User-Wunsch 2026-04-28: 4 MP3s shuffle). Die Files müssen in
 *  /frontend/public/sounds/ liegen — fehlende Dateien werden bei Load-Fehler
 *  übersprungen, der Player nimmt dann automatisch den nächsten Track. */
const LOBBY_TRACK_POOL = [
  '/sounds/lobby-welcome-1.mp3',
  '/sounds/lobby-welcome-2.mp3',
  '/sounds/lobby-welcome-3.mp3',
  '/sounds/lobby-welcome-4.mp3',
];

/** True wenn die Custom-URL einer der eingebauten Pool-Tracks oder die
 *  Legacy-Default-URL ist. In dem Fall ignorieren wir die Custom-URL und
 *  spielen den vollen 4er-Pool — verhindert dass „Sounds auf alle Quizze
 *  uebernehmen" mit einer Pool-URL-Default den Pool defacto auf 1 Track
 *  reduziert. */
function isPoolTrackUrl(url: string): boolean {
  if (LOBBY_TRACK_POOL.includes(url)) return true;
  if (url === '/sounds/lobby-welcome.mp3') return true; // Legacy-Default
  // Auch die absolute Variante (z.B. von resolveBackendUrl normalisiert)
  return LOBBY_TRACK_POOL.some(p => url.endsWith(p));
}

/** Startet die Lobby-Loop. Mode bestimmt was abgespielt wird:
 *  - 'pool-only' (Setup + Lobby-Phase): IMMER der 4er-Pool, geshuffelt.
 *    Custom-Upload im lobbyWelcome-Slot wird ignoriert. User-Wunsch
 *    2026-04-30: 'lobby-welcome-1..4 liefen immer während setup und lobby'.
 *  - 'custom-or-pool' (Rules / Pause / Finale): Custom-Upload aus
 *    lobbyWelcome bevorzugt, Pool als Fallback. User-Wunsch:
 *    'während regeln lief dann LOBBY (vom moderator soundboard)'.
 *  Idempotent — bereits laufender Loop wird nicht unterbrochen. */
export function startLobbyLoop(mode: 'pool-only' | 'custom-or-pool' = 'custom-or-pool') {
  if (lobbyLoopActive) return;
  if (!isSlotEnabled('lobbyWelcome')) return;
  // Im 'custom-or-pool'-Mode: Custom-URL bevorzugt, Pool als Fallback.
  // Pool-Tracks und Legacy-Default-URL gelten NICHT als echter Custom-Upload.
  if (mode === 'custom-or-pool') {
    const customUrl = soundConfig.lobbyWelcome;
    if (typeof customUrl === 'string' && customUrl.length > 0 && !isPoolTrackUrl(customUrl)) {
      startLobbyTrackFromUrl(customUrl);
      return;
    }
  }
  // 'pool-only' oder Custom-Fallback: geshuffelten Pool starten.
  lobbyLoopActive = true;
  const shuffled = shuffleLobbyPool(null);
  playLobbyTrackAtIndex(shuffled, 0);
}

function shuffleLobbyPool(lastUrl: string | null): string[] {
  const arr = [...LOBBY_TRACK_POOL];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Anti-Repeat: erster Track der neuen Runde darf nicht der letzte
  // Track der alten Runde sein (sonst hoert man dasselbe Lied 2x in Folge).
  if (lastUrl && arr.length > 1 && arr[0] === lastUrl) {
    const [first, ...rest] = arr;
    return [...rest, first];
  }
  return arr;
}

function playLobbyTrackAtIndex(pool: string[], idx: number): void {
  if (!lobbyLoopActive) return;
  // Pool durch? → neu shuffeln und von vorn.
  if (idx >= pool.length) {
    const lastUrl = pool[pool.length - 1] ?? null;
    const next = shuffleLobbyPool(lastUrl);
    playLobbyTrackAtIndex(next, 0);
    return;
  }
  const url = pool[idx];
  const audio = new Audio(url);
  audio.addEventListener('error', () => {
    // Diese Datei nicht da — nächste probieren (skip ueber den 404er)
    if (lobbyAudioEl === audio) lobbyAudioEl = null;
    if (lobbyLoopActive) playLobbyTrackAtIndex(pool, idx + 1);
  }, { once: true });
  audio.addEventListener('canplay', () => {
    // Bug-Fix 2026-04-30: vorher hat hier `lobbyAudioEl !== audio` die Chain
    // gestoppt — der vorige Track-Eintrag war noch in lobbyAudioEl, also
    // wurden Folge-Tracks nie gestartet. Jetzt: ueberschreiben statt blocken.
    if (!lobbyLoopActive) return;
    lobbyAudioEl = audio;
    audio.volume = masterVolume * musicDuckFactor;
    audio.currentTime = 0;
    audio.loop = false; // KEIN auto-loop — wir wechseln per ended-Event zum nächsten
    audio.play().catch(() => {});
  }, { once: true });
  audio.addEventListener('ended', () => {
    // Nur weitermachen wenn das hier noch der aktive Track ist (sonst wurde gestoppt/gewechselt)
    if (lobbyAudioEl !== audio) return;
    if (!lobbyLoopActive) return;
    // Reference clearen, damit der naechste Track in canplay durchkommt.
    lobbyAudioEl = null;
    playLobbyTrackAtIndex(pool, idx + 1);
  }, { once: true });
  audio.preload = 'auto';
  audio.load();
}

function startLobbyTrackFromUrl(url: string): void {
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

/** 2026-04-30 v3 round 6 (User-Wunsch eigener Slot fuer Finale-Musik):
 *  Startet einen Loop aus dem 'finaleMusic'-Slot (Mod-Panel-konfigurierbar).
 *  Fallback bei keinem Custom-Upload: lobbyWelcome (custom-or-pool), damit
 *  Finale nie still ist. Reuse der lobby-Loop-Infrastruktur. */
export function startFinaleLoop() {
  if (lobbyLoopActive) return;
  if (!isSlotEnabled('finaleMusic')) {
    // Slot deaktiviert → trotzdem fallback, damit Finale nicht still ist.
    startLobbyLoop('custom-or-pool');
    return;
  }
  const customUrl = soundConfig.finaleMusic;
  if (typeof customUrl === 'string' && customUrl.length > 0) {
    startLobbyTrackFromUrl(customUrl);
    return;
  }
  // Kein Custom-Upload → fallback auf lobbyWelcome.
  startLobbyLoop('custom-or-pool');
}

/** 2026-04-30 v3 round 6 (User-Wunsch BG-Musik fuers Comeback): analog
 *  Finale-Loop, eigener Slot 'comebackMusic'. Fallback lobbyWelcome. */
export function startComebackLoop() {
  if (lobbyLoopActive) return;
  if (!isSlotEnabled('comebackMusic')) {
    startLobbyLoop('custom-or-pool');
    return;
  }
  const customUrl = soundConfig.comebackMusic;
  if (typeof customUrl === 'string' && customUrl.length > 0) {
    startLobbyTrackFromUrl(customUrl);
    return;
  }
  startLobbyLoop('custom-or-pool');
}

export function playQuestionStart() { playSlotOneShot('questionStart'); }
export function playRoundStart()    { playSlotOneShot('roundStart'); }
export function playGameOver()      { playSlotOneShot('gameOver'); }

// ── Aktions-Sounds (Trinity: Place/Steal/Stapel) ──────────────────────────
// Alle mit Synth-Fallback, damit sie ohne Custom-Upload funktionieren.
// 2026-04-30: SHIELD/SANDUHR/SWAP entfernt — Mechaniken seit Trinity-Cut tot.
export function playStapelStamp() {
  if (!isSlotEnabled('stapelStamp')) return;
  const url = resolveSlotUrl('stapelStamp');
  if (url) { playUrlOneShot(url); return; }
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // Kurzer Bass-Thud + sharper Click, wie ein echter Stempel-Stempeldruck.
  tone(120, 'sine',   t,         0.26, 0.10, 0.003, 0.04, ac);
  tone(80,  'sine',   t + 0.015, 0.24, 0.18, 0.001, 0.06, ac);
  tone(2400, 'square', t + 0.02, 0.06, 0.03, 0.001, 0.02, ac);
}
export function playTeamJoin() {
  if (!isSlotEnabled('teamJoin')) return;
  const url = resolveSlotUrl('teamJoin');
  if (url) { playUrlOneShot(url); return; }
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // Hallo-Wink: kleine aufsteigende Terz, freundlich.
  tone(523.25, 'sine', t,         0.16, 0.10, 0.01, 0.06, ac);
  tone(659.25, 'sine', t + 0.08,  0.18, 0.10, 0.01, 0.06, ac);
  tone(783.99, 'sine', t + 0.18,  0.20, 0.08, 0.01, 0.05, ac);
}

/** 2026-04-30: Avatar-Cascade-Tonleiter — pro Avatar ein Ton, aufsteigend.
 *  rank: 0..total-1, total: Anzahl Avatare insgesamt.
 *  Skala: C-Dur-Pentatonik (C-D-E-G-A) — angenehm, kein dissonanter Ton.
 *  Bei <= 5 Avataren spielt eine Oktave; bei mehr klimmt's in die naechste hoch.
 *  Cozy-warmer Sine-Wave statt grellem Synth, kurzer Decay damit Cascade flowt. */
export function playAvatarCascadeNote(rank: number, total: number): void {
  const ac = getCtx();
  if (!ac) return;
  // C-Dur-Pentatonik: C4=261.63, D4=293.66, E4=329.63, G4=392.00, A4=440.00.
  // Wir nutzen 8 Stufen ueber 1.5 Oktaven (max 8 Teams).
  const scale = [
    261.63, 293.66, 329.63, 392.00, 440.00,           // C4 D4 E4 G4 A4
    523.25, 587.33, 659.25,                            // C5 D5 E5
  ];
  const safeTotal = Math.max(1, Math.min(total, scale.length));
  const safeRank = Math.max(0, Math.min(rank, safeTotal - 1));
  // Bei wenig Teams die Skala spreizen (Rank scaled) statt nur die ersten N Toene.
  const idx = Math.round((safeRank / Math.max(safeTotal - 1, 1)) * (scale.length - 1));
  const freq = scale[Math.min(idx, scale.length - 1)];
  const t = ac.currentTime;
  // Warmer Sine-Tone mit kurzer Bell-Note-Form.
  tone(freq, 'sine',     t,         0.18, 0.18, 0.005, 0.06, ac);
  tone(freq * 2, 'sine', t + 0.005, 0.06, 0.10, 0.003, 0.04, ac); // Oktav-Sparkle obenauf
}

/** 2026-04-30: Sieger-Card erscheint unten — warmer Krönungs-Akkord
 *  (Drei-Klang aufwaerts, 'Trommelwirbel zu Bell'-Gefuehl). */
export function playWinnerCardReveal() {
  if (!isSlotEnabled('winnerCardReveal')) return;
  const url = resolveSlotUrl('winnerCardReveal');
  if (url) { playUrlOneShot(url); return; }
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // Warmer Krönungs-Akkord: G3 → C4 → E4 → G4 leicht versetzt, weicher Sine.
  tone(196.0, 'sine',     t,         0.18, 0.20, 0.02, 0.10, ac);
  tone(261.6, 'sine',     t + 0.08,  0.20, 0.22, 0.02, 0.10, ac);
  tone(329.6, 'triangle', t + 0.16,  0.22, 0.30, 0.02, 0.12, ac);
  tone(392.0, 'sine',     t + 0.24,  0.20, 0.40, 0.02, 0.15, ac);
  // High-Bell-Sparkle obenauf
  tone(1568,  'sine',     t + 0.30,  0.10, 0.30, 0.005, 0.08, ac);
}

/** 2026-04-30: Grid erscheint in PLACEMENT-Phase — softer Slam-Down-Thud
 *  (tiefe Holz-Note + leichter Hall-Klick). Differenziert sich vom
 *  'gruen-faerben'-Sound (correct/reveal). */
export function playGridReveal() {
  if (!isSlotEnabled('gridReveal')) return;
  const url = resolveSlotUrl('gridReveal');
  if (url) { playUrlOneShot(url); return; }
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // Tiefer Holz-Whoom + heller Click-Top-Layer
  tone(110, 'sine',     t,         0.28, 0.18, 0.005, 0.08, ac);
  tone(82,  'sine',     t + 0.02,  0.24, 0.28, 0.003, 0.10, ac);
  tone(440, 'triangle', t + 0.04,  0.10, 0.06, 0.002, 0.04, ac);
  tone(880, 'sine',     t + 0.05,  0.06, 0.05, 0.001, 0.03, ac);
}

/** 2026-04-30 v3 round 5 (User-Bug 'höre keinen Sound bei VIEL GLÜCK mehr'):
 *  Eigener dedizierter Slot fuer das Teams-Reveal-Outro 'VIEL GLÜCK!'.
 *  Vorher feuerte playFanfare (generischer Slot, default-Synth recht leise).
 *  Jetzt eigenstaendiger Slot 'goodLuckFanfare' im Mod-Panel ueberschreibbar
 *  + lauter Layered-Synth als Default: Fanfare-Pattern + Bell-Triade-Stack
 *  obenauf. Klingt nach 'Wettkampf-Beginn / Spotlight an'. */
export function playGoodLuckFanfare() {
  if (!isSlotEnabled('goodLuckFanfare')) return;
  const url = resolveSlotUrl('goodLuckFanfare');
  if (url) { playUrlOneShot(url); return; }
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // Layer 1: Fanfaren-Pattern (4 Toene aufsteigend, C-Dur Triade)
  tone(523.25, 'triangle', t,         0.32, 0.18, 0.01, 0.10, ac); // C5
  tone(659.25, 'triangle', t + 0.10,  0.34, 0.20, 0.01, 0.10, ac); // E5
  tone(783.99, 'triangle', t + 0.20,  0.36, 0.22, 0.01, 0.12, ac); // G5
  tone(1046.5, 'triangle', t + 0.30,  0.40, 0.45, 0.01, 0.18, ac); // C6 — Hauptton
  // Layer 2: Warm-Bass (Octave drunter, langer Sustain fuer „Hall")
  tone(261.63, 'sine',     t + 0.05,  0.28, 0.65, 0.02, 0.25, ac); // C4
  tone(392.00, 'sine',     t + 0.15,  0.26, 0.70, 0.02, 0.25, ac); // G4
  // Layer 3: Sparkle-Bells obenauf (hoehere Octave bei finalem Ton)
  tone(1568.0, 'sine',     t + 0.40,  0.22, 0.55, 0.005, 0.22, ac); // G6
  tone(2093.0, 'sine',     t + 0.50,  0.18, 0.65, 0.005, 0.28, ac); // C7
  tone(2637.0, 'sine',     t + 0.60,  0.14, 0.75, 0.005, 0.35, ac); // E7
}

/** 2026-04-30 v3 round 4 (User-Wunsch differenzieren): Reveal-Highlight —
 *  leichter, kuerzerer Auflösungs-Akkord wenn das gruene Antwortfeld
 *  erscheint. Vorbereiteter Ton zum Climax — markiert „die Loesung ist
 *  da", aber LASST den eigentlichen Krönungs-Akkord der WinnerCard noch
 *  Raum (1.0s sustain vs 2.5s bei climaxFinish). */
export function playRevealHighlight() {
  if (!isSlotEnabled('revealHighlight')) return;
  const url = resolveSlotUrl('revealHighlight');
  if (url) { playUrlOneShot(url); return; }
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // Heller Auflösungs-Akkord: G-Dur Triade (G4-B4-D5) + Sparkle obenauf.
  // Kuerzer (~1s), heller, nicht so dramatisch wie der Krönungs-Akkord.
  tone(392.00, 'sine',     t,         0.26, 0.20, 0.01, 0.10, ac); // G4
  tone(493.88, 'triangle', t + 0.04,  0.28, 0.28, 0.01, 0.12, ac); // B4
  tone(587.33, 'sine',     t + 0.08,  0.28, 0.40, 0.01, 0.14, ac); // D5
  // Heller Sparkle-Top
  tone(987.77, 'sine',     t + 0.14,  0.18, 0.45, 0.005, 0.18, ac); // B5
  tone(1318.5, 'sine',     t + 0.20,  0.12, 0.55, 0.005, 0.25, ac); // E6
}

/** 2026-04-30 v3 (User-Wunsch): Climax-Finish — lange warme Krönungs-Glocke
 *  fuer die WinnerCard (Sieger-Card-Pop). Layered Chord (perfect 4th + 5th
 *  + Octave) mit Sparkle-Top, ~2.5s sustain. Spielt SYNCHRON zu Cascade-
 *  Top-Note auf der WinnerCard.
 *  v3 round 4 (User-Wunsch differenzieren): kommt jetzt NUR noch beim
 *  WinnerCard-Pop, nicht mehr beim grünen Antwortfeld (das hat seinen
 *  eigenen leichteren Slot 'revealHighlight'). */
export function playClimaxFinish() {
  if (!isSlotEnabled('climaxFinish')) return;
  const url = resolveSlotUrl('climaxFinish');
  if (url) { playUrlOneShot(url); return; }
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // Krönungs-Akkord: C-Dur Octave-Stack (C4-G4-C5-E5) mit warmer Bell-Form.
  // ADSR: schneller Attack 0.02s, sustained ~2s mit langem decay.
  tone(261.63, 'sine',     t,         0.32, 0.45, 0.02, 0.18, ac); // C4
  tone(392.00, 'sine',     t + 0.05,  0.30, 0.55, 0.02, 0.20, ac); // G4
  tone(523.25, 'triangle', t + 0.10,  0.34, 0.70, 0.02, 0.22, ac); // C5 — Hauptton
  tone(659.25, 'sine',     t + 0.15,  0.28, 0.85, 0.02, 0.25, ac); // E5
  // Sparkle-Top (high octave bell decay)
  tone(1046.5, 'sine',     t + 0.20,  0.20, 1.10, 0.01, 0.30, ac); // C6
  tone(1568.0, 'sine',     t + 0.30,  0.14, 1.40, 0.01, 0.40, ac); // G6
}

/** 2026-04-30 v2/v3: Action-Card erscheint („eure aktion diese runde…") —
 *  Bell-Triade, klar hoerbar damit User es ueber Hintergrund-Musik wahrnimmt.
 *  v3: Volumes 0.20-0.22 → 0.34-0.40, Decay laenger fuer praesentere Bell.
 *  Dreiklang aufwaerts mit Sparkle obenauf — feiert das Tactical-Moment. */
export function playActionMenuReveal() {
  if (!isSlotEnabled('actionMenuReveal')) return;
  const url = resolveSlotUrl('actionMenuReveal');
  if (url) { playUrlOneShot(url); return; }
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // Aufsteigender Mini-Triade D5-F#5-A5 (D-Dur), Bell-artig — boosted.
  tone(587.33, 'triangle', t,         0.36, 0.35, 0.008, 0.14, ac);
  tone(739.99, 'sine',     t + 0.07,  0.36, 0.40, 0.008, 0.16, ac);
  tone(880.00, 'sine',     t + 0.14,  0.40, 0.55, 0.008, 0.20, ac);
  // Sparkle-Top
  tone(1760,   'sine',     t + 0.18,  0.22, 0.40, 0.005, 0.12, ac);
  tone(2349.32,'sine',     t + 0.24,  0.16, 0.55, 0.005, 0.18, ac);
}

/** URL-One-Shot (kein Slot-Check) — fuer interne Reuse in den Synth-Pfaden. */
function playUrlOneShot(url: string): void {
  const el = new Audio(url);
  el.volume = masterVolume;
  el.play().catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────
// WOW-Sounds — Cozy-Soundscape statt generic Beeps
// ─────────────────────────────────────────────────────────────────────────

/** Wolf-Howl: warmer ansteigender Ton, leicht vibrato, lange Fading-Tail.
 *  Statt klassischer Fanfare beim Game-Over (oder als zusätzlicher Stinger). */
export function playWolfHowl(): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // Tiefer warmer Grundton, langsam ansteigend
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(330, t + 0.4);
  osc.frequency.exponentialRampToValueAtTime(440, t + 1.6);
  osc.frequency.exponentialRampToValueAtTime(310, t + 2.6);
  // Vibrato für "Howl"-Charakter
  const lfo = ac.createOscillator();
  const lfoGain = ac.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 5.5;
  lfoGain.gain.value = 8;
  lfo.connect(lfoGain).connect(osc.frequency);
  // Hülle (Attack/Sustain/Release)
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.18, t + 0.5);
  gain.gain.exponentialRampToValueAtTime(0.14, t + 1.6);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
  // Sub-Bass-Layer für Wärme
  const sub = ac.createOscillator();
  const subGain = ac.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(110, t);
  sub.frequency.exponentialRampToValueAtTime(165, t + 1.5);
  subGain.gain.setValueAtTime(0.0001, t);
  subGain.gain.exponentialRampToValueAtTime(0.08, t + 0.4);
  subGain.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
  osc.connect(gain).connect(ac.destination);
  sub.connect(subGain).connect(ac.destination);
  osc.start(t); lfo.start(t); sub.start(t);
  osc.stop(t + 2.9); lfo.stop(t + 2.9); sub.stop(t + 2.7);
}

/** Wood-Klick: warmer dumpfer „Klack" auf Holztisch — alternative für
 *  Field-Placed/Cell-Tap. Kürzer und wärmer als der bestehende Synth. */
export function playWoodKnock(): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // Dumpfer Burst (low-freq sine + noise)
  tone(160, 'sine', t, 0.04, 0.18, 0.001, 0.04, ac);
  tone(280, 'triangle', t + 0.005, 0.05, 0.10, 0.001, 0.04, ac);
  // Schneller Noise-Burst für „Klack"-Anschlag
  const buf = ac.createBuffer(1, ac.sampleRate * 0.05, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / data.length);
  }
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  const noiseGain = ac.createGain();
  noiseGain.gain.value = 0.06 * masterVolume;
  // Lowpass für Holz-Charakter
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 800;
  noise.connect(lp).connect(noiseGain).connect(ac.destination);
  noise.start(t);
  noise.stop(t + 0.05);
}

/** Pro Avatar ein eigenes Mini-Jingle beim Joinen — ~0.6-0.9s.
 *  Charakter-Mapping: jeder Avatar kriegt sein eigenes Timbre.
 *  Unterscheidet sich vom generischen playTeamJoin (das bleibt für alle Teams).
 */
export function playAvatarJingle(avatarId: string): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  switch (avatarId) {
    case 'fox': // Hund — freundlich, aufgeregt, 3 schnelle Bell-Notes
      tone(659, 'triangle', t,        0.10, 0.10, 0.005, 0.05, ac);
      tone(880, 'triangle', t + 0.10, 0.10, 0.10, 0.005, 0.05, ac);
      tone(1175, 'triangle', t + 0.20, 0.16, 0.12, 0.005, 0.06, ac);
      break;
    case 'frog': // Faultier — gemächlich, tief, langsam ansteigend
      tone(220, 'sine', t,        0.30, 0.12, 0.04, 0.10, ac);
      tone(330, 'sine', t + 0.20, 0.40, 0.10, 0.05, 0.15, ac);
      break;
    case 'panda': // Pinguin — niedlich, hoch trillernd
      tone(1320, 'square', t,        0.06, 0.06, 0.001, 0.04, ac);
      tone(1568, 'square', t + 0.06, 0.06, 0.06, 0.001, 0.04, ac);
      tone(1760, 'square', t + 0.12, 0.06, 0.06, 0.001, 0.04, ac);
      tone(1976, 'square', t + 0.18, 0.10, 0.08, 0.001, 0.05, ac);
      break;
    case 'rabbit': // Koala — sanft, holzig, mid-range
      tone(523, 'triangle', t,        0.20, 0.10, 0.008, 0.08, ac);
      tone(659, 'triangle', t + 0.15, 0.20, 0.09, 0.008, 0.08, ac);
      tone(784, 'triangle', t + 0.30, 0.30, 0.08, 0.008, 0.10, ac);
      break;
    case 'unicorn': // Giraffe — elegant, slide upward
      tone(440, 'sine', t,        0.15, 0.10, 0.01, 0.06, ac);
      tone(554, 'sine', t + 0.10, 0.15, 0.10, 0.01, 0.06, ac);
      tone(659, 'sine', t + 0.20, 0.15, 0.10, 0.01, 0.06, ac);
      tone(880, 'sine', t + 0.30, 0.30, 0.12, 0.01, 0.10, ac);
      break;
    case 'raccoon': // Waschbär — neugierig, 4 schnelle Klicks
      tone(880, 'square', t,        0.05, 0.08, 0.001, 0.03, ac);
      tone(988, 'square', t + 0.07, 0.05, 0.08, 0.001, 0.03, ac);
      tone(1175, 'square', t + 0.14, 0.05, 0.08, 0.001, 0.03, ac);
      tone(1320, 'square', t + 0.22, 0.10, 0.10, 0.001, 0.05, ac);
      break;
    case 'cow': // Kuh — warm, breit, brummiges Mid-Range
      tone(165, 'sawtooth', t,        0.40, 0.08, 0.04, 0.15, ac);
      tone(247, 'triangle', t + 0.10, 0.30, 0.10, 0.02, 0.10, ac);
      break;
    case 'cat': // Capybara — entspannt, leise zwei Töne
      tone(330, 'sine', t,        0.25, 0.08, 0.03, 0.10, ac);
      tone(415, 'sine', t + 0.18, 0.30, 0.08, 0.03, 0.12, ac);
      break;
    default: // Fallback: generisches Hi
      tone(523, 'sine', t,         0.16, 0.10, 0.01, 0.06, ac);
      tone(659, 'sine', t + 0.08,  0.18, 0.10, 0.01, 0.06, ac);
      tone(784, 'sine', t + 0.18,  0.20, 0.08, 0.01, 0.05, ac);
  }
}

/** Sanfter Lagerfeuer-Knister-Loop als Atmosphäre-Layer.
 *  Brown-Noise-basiert mit sporadischen Pop-Bursts. Sehr leise (~0.04
 *  master volume). Idempotent: Doppel-Start startet nicht zweimal.
 *  Wird in Lobby/Pause/Phase-Intro mitlaufen — komplementär zu lobbyLoop. */
let campfireActive = false;
let campfireSource: AudioBufferSourceNode | null = null;
let campfireGain: GainNode | null = null;
let campfirePopTimer: number | null = null;

export function startCampfireLoop(): void {
  if (campfireActive) return;
  const ac = getCtx();
  if (!ac) return;
  campfireActive = true;
  // Brown-Noise-Buffer (1.5s loop)
  const len = Math.floor(ac.sampleRate * 1.5);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  // Lowpass-Filter für „weiches Knistern" + Bandpass für Mid-Crackle
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 600;
  const gain = ac.createGain();
  gain.gain.value = 0.04 * masterVolume; // sehr leise
  src.connect(lp).connect(gain).connect(ac.destination);
  src.start();
  campfireSource = src;
  campfireGain = gain;
  // Sporadische Pop-Bursts (kurzes high-freq tick) alle 1-3s
  const schedulePop = () => {
    if (!campfireActive) return;
    const popDelay = 1000 + Math.random() * 2500;
    campfirePopTimer = window.setTimeout(() => {
      if (!campfireActive) return;
      const ac2 = getCtx();
      if (ac2) {
        const t2 = ac2.currentTime;
        tone(2200 + Math.random() * 800, 'square', t2, 0.025, 0.018, 0.001, 0.02, ac2);
      }
      schedulePop();
    }, popDelay);
  };
  schedulePop();
}

export function stopCampfireLoop(): void {
  if (!campfireActive) return;
  campfireActive = false;
  if (campfirePopTimer !== null) {
    clearTimeout(campfirePopTimer);
    campfirePopTimer = null;
  }
  if (campfireSource && campfireGain) {
    const ac = getCtx();
    if (ac) {
      try {
        campfireGain.gain.setValueAtTime(campfireGain.gain.value, ac.currentTime);
        campfireGain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.6);
        const src = campfireSource;
        setTimeout(() => { try { src.stop(); } catch {} }, 700);
      } catch { try { campfireSource.stop(); } catch {} }
    }
  }
  campfireSource = null;
  campfireGain = null;
}
