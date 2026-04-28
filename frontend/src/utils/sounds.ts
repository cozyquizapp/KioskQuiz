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
 *  übersprungen, der Player nimmt dann automatisch den nächsten Track.
 *  Hauptdatei lobby-welcome.mp3 bleibt als Fallback wenn keine der 1-4 da ist. */
const LOBBY_TRACK_POOL = [
  '/sounds/lobby-welcome-1.mp3',
  '/sounds/lobby-welcome-2.mp3',
  '/sounds/lobby-welcome-3.mp3',
  '/sounds/lobby-welcome-4.mp3',
  '/sounds/lobby-welcome.mp3', // Legacy/Fallback
];

/** Startet die Lobby-Loop (Lobby / Welcome-Folie / Pause). Idempotent.
 *  Picked random track from pool. Wenn die Datei nicht existiert, fällt
 *  HTMLAudioElement auf error → wir versuchen den nächsten Track. */
export function startLobbyLoop() {
  if (lobbyLoopActive) return;
  if (!isSlotEnabled('lobbyWelcome')) return;
  // Custom-URL aus soundConfig hat Priorität (Mod hat eigene Datei hochgeladen)
  const customUrl = soundConfig.lobbyWelcome;
  if (typeof customUrl === 'string' && customUrl.length > 0) {
    startLobbyTrackFromUrl(customUrl);
    return;
  }
  // Sonst: zufälligen Track aus Pool wählen, mit Fallback-Kette bei 404
  const shuffled = [...LOBBY_TRACK_POOL].sort(() => Math.random() - 0.5);
  tryStartLobbyTrackFromPool(shuffled, 0);
}

function tryStartLobbyTrackFromPool(pool: string[], idx: number): void {
  if (idx >= pool.length) return; // alle durch — Lobby bleibt still
  const url = pool[idx];
  const audio = new Audio(url);
  audio.addEventListener('error', () => {
    // Diese Datei nicht da — nächste probieren
    if (lobbyAudioEl === audio) lobbyAudioEl = null;
    tryStartLobbyTrackFromPool(pool, idx + 1);
  }, { once: true });
  audio.addEventListener('canplay', () => {
    // Nur einrasten wenn noch nichts anderes läuft
    if (lobbyLoopActive) return;
    lobbyLoopActive = true;
    lobbyAudioEl = audio;
    audio.volume = masterVolume * musicDuckFactor;
    audio.currentTime = 0;
    audio.loop = true;
    audio.play().catch(() => {});
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

export function playQuestionStart() { playSlotOneShot('questionStart'); }
export function playRoundStart()    { playSlotOneShot('roundStart'); }
export function playGameOver()      { playSlotOneShot('gameOver'); }

// ── Nice-to-Have Aktions-Sounds (D1-D3 + F1). ──────────────────────────────
// Alle mit Synth-Fallback, damit sie ohne Custom-Upload funktionieren.
export function playShieldActivate() {
  if (!isSlotEnabled('shieldActivate')) return;
  const url = resolveSlotUrl('shieldActivate');
  if (url) { playUrlOneShot(url); return; }
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // Metallisches "wumm": tiefer Sweep hoch, Brass-Anschlag.
  tone(180, 'sawtooth', t, 0.22, 0.18, 0.01, 0.15, ac);
  tone(360, 'triangle', t + 0.04, 0.18, 0.12, 0.008, 0.10, ac);
  tone(720, 'sine',     t + 0.06, 0.16, 0.06, 0.005, 0.05, ac);
}
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
export function playSanduhrFlip() {
  if (!isSlotEnabled('sanduhrFlip')) return;
  const url = resolveSlotUrl('sanduhrFlip');
  if (url) { playUrlOneShot(url); return; }
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // Glassy Ding-Tik + subtiles Rieseln (triangle highs).
  tone(1760, 'triangle', t,         0.10, 0.25, 0.003, 0.04, ac);
  tone(2640, 'sine',     t + 0.05,  0.08, 0.20, 0.002, 0.03, ac);
  tone(3520, 'sine',     t + 0.12,  0.05, 0.14, 0.001, 0.03, ac);
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
export function playSwapActivate() {
  if (!isSlotEnabled('swapActivate')) return;
  const url = resolveSlotUrl('swapActivate');
  if (url) { playUrlOneShot(url); return; }
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // Tausch: zwei Ton-Paare, kreuzend (einer fällt, einer steigt).
  tone(880,    'triangle', t,         0.20, 0.12, 0.008, 0.06, ac);
  tone(440,    'triangle', t,         0.20, 0.12, 0.008, 0.06, ac);
  tone(587.33, 'triangle', t + 0.12,  0.18, 0.10, 0.008, 0.05, ac);
  tone(659.25, 'triangle', t + 0.12,  0.18, 0.10, 0.008, 0.05, ac);
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
