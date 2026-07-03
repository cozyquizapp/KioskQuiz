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

/** 2026-05-01 (Sound-Audit): Belt-and-Suspender Mute-Gate.
 * QQBeamerPage gated alle play*-Aufrufe via `if (s.sfxMuted) return`.
 * Falls ein Pfad das vergisst, blockt diese globale Flag den Sound trotzdem.
 * Wird via setSfxMuted(s.sfxMuted) im Beamer synchronisiert. */
let _sfxMuted = false;
export function setSfxMuted(muted: boolean) { _sfxMuted = !!muted; }
export function isSfxMuted() { return _sfxMuted; }

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

/**
 * 2026-05-12 (Sound-Audit P0 #4): Preload aller Default-Sound-URLs in den
 * audioCache. Vorher hatte der erste Sound der Session 150-400ms Latenz
 * (Browser musste WAV synchron laden) → SFX ploppte deutlich NACH dem
 * Visual-Cue beim Phase-Wechsel LOBBY→PHASE_INTRO.
 * Call this once beim Mount der Beamer-Page (Lobby-Phase).
 */
export function preloadSoundDefaults() {
  for (const url of Object.values(QQ_SOUND_DEFAULT_URLS)) {
    if (typeof url === 'string' && url.length > 0) {
      getOrCreateAudio(url);  // populates audioCache + triggers preload='auto'
    }
  }
}

/** Play a one-shot audio file. Resets to start if already playing. */
// 2026-05-25 (Wolf-Sound-Audit): Diagnose-Log + Fallback-Callback. Vorher
// schluckte el.play().catch() jeden Fehler silent — Custom-Upload mit 404
// URL fuehrte zu kompletter Stille ohne jeden Hinweis (Mod sah nichts in
// der Console, kein Fallback-Synth lief, Action war stumm).
// Jetzt: ein einmaliger console.warn pro fehlerhafter URL (Dedupe via
// loggedFileErrors-Set) + optional onError-Callback fuer Synth-Fallback.
const loggedFileErrors = new Set<string>();
function playAudioFile(url: string, onError?: () => void) {
  const now = Date.now();
  const last = lastPlayAt.get(url) ?? 0;
  if (now - last < PLAY_COOLDOWN_MS) return; // spam-guard
  lastPlayAt.set(url, now);
  const el = getOrCreateAudio(url);
  el.volume = masterVolume;
  el.currentTime = 0;
  el.loop = false;
  const handleError = (reason: string) => {
    if (!loggedFileErrors.has(url)) {
      loggedFileErrors.add(url);
      console.warn(`[Sound] Custom URL failed (${reason}): ${url} — falling back to synth.`);
    }
    if (onError) onError();
  };
  // play()-Failure (z.B. autoplay-blocked oder URL-fehler) UND element-level
  // 'error'-Event (z.B. MEDIA_ERR_NETWORK / 404) beide abfangen.
  el.play().catch((err) => {
    // Autoplay-blocked ist kein „echter" Fehler — der Browser braucht eine
    // User-Gesture. NotAllowedError = autoplay-block, kein Fallback noetig.
    if (err?.name === 'NotAllowedError') return;
    handleError(err?.name ?? 'play-rejected');
  });
  el.addEventListener('error', () => handleError('media-error'), { once: true });
}

// ── Synth helpers ─────────────────────────────────────────────────────────────

// 2026-05-07 (Wolf 'mach cozy'): Cozy-Warm-Bus statt direkt zu destination.
// Alle Synth-Toene routen jetzt durch:
//   Source → [Lowpass 3.5kHz, Q=0.5] → Destination  (dry path)
//                       └→ [Reverb-Send 12%] → [Convolver, 0.4s IR] → Destination  (wet path)
// Effekt: weicher, leicht raumig, glockenspiel-artig statt mechanisch-trocken.
// IR ist synthetisch generiert (exponentially-decaying white noise), keine
// externe File-Dependency. Per-Context-Cache verhindert Mehrfach-Aufbau.
let warmBusInput: GainNode | null = null;
let warmBusAcRef: AudioContext | null = null;

function getWarmBus(ac: AudioContext): GainNode {
  if (warmBusInput && warmBusAcRef === ac) return warmBusInput;
  warmBusAcRef = ac;

  const input = ac.createGain();

  // 2026-05-08 (Wolf 'sounds zu mechanisch/KI/schrill'): warm-bus
  // weicher gemacht. Vorher 3500 Hz Lowpass + 0.5 Q + 12 % Reverb-Send +
  // 0.4s IR — Synth-Sounds klangen trotzdem dünn/schrill bei Live-Vorführung.
  // Jetzt: 2400 Hz Lowpass (dämpft mehr Höhen), 0.7 Q (sanfterer Roll-off),
  // 22 % Reverb-Send (mehr Raumklang), 0.6s IR mit 0.18s Decay (längeres,
  // weicheres Ausklingen). Resultat: Synth wirkt eher „warm-room" als
  // „cold-laptop".
  // Dry path: input → lowpass → destination
  const lowpass = ac.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 2400;  // schneidet harsche Höhen (war 3500)
  lowpass.Q.value = 0.7;            // sanfterer Roll-off (war 0.5)
  input.connect(lowpass);
  lowpass.connect(ac.destination);

  // Wet path: input → reverbSend → convolver → reverbReturn → destination
  // Synthetic IR: white noise mit ~0.6s exponential decay → mehr Raum.
  const irLength = Math.floor(ac.sampleRate * 0.6);  // war 0.4
  const ir = ac.createBuffer(2, irLength, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < irLength; i++) {
      const decay = Math.exp(-i / (ac.sampleRate * 0.18));  // war 0.12
      data[i] = (Math.random() * 2 - 1) * decay;
    }
  }
  const convolver = ac.createConvolver();
  convolver.buffer = ir;
  const reverbSend = ac.createGain();
  reverbSend.gain.value = 0.22;  // 22 % wet (war 12 %) — spürbarer Raum
  const reverbReturn = ac.createGain();
  reverbReturn.gain.value = 0.55;  // attenuate output after IR (war 0.45)

  input.connect(reverbSend);
  reverbSend.connect(convolver);
  convolver.connect(reverbReturn);
  reverbReturn.connect(ac.destination);

  warmBusInput = input;
  return input;
}

function tone(
  freq: number,
  type: OscillatorType,
  startTime: number,
  duration: number,
  gainPeak: number,
  // 2026-05-07 (Wolf 'mach cozy'): Default-Hüllkurve sanfter — vorher 0.01s
  // Attack + 0.1s Release wirkte klick-artig, jetzt 0.018s + 0.18s laesst
  // Toene flowen statt poppen. Cascade/Reveal/Fanfare profitieren am
  // staerksten; Tick bleibt durch eigene kuerzere Werte schnell genug.
  attack = 0.018,
  release = 0.18,
  c?: AudioContext
) {
  const ac = c ?? getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  // Cozy-Warm-Bus statt direkt zu destination → Lowpass + dezenter Reverb.
  gain.connect(getWarmBus(ac));
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
  // 2026-05-05 (Phase-6 Bucket-1 BC-2): lobbyAudioEl wird AUCH gedreht.
  // Vorher: nur loopAudioEl. Lücke: Finale/Comeback/GameOver teilen sich
  // lobbyAudioEl mit der Lobby-Musik, also war Ducking dort nicht aktiv —
  // Fanfare/Reveal/ClimaxFinish konnten von voller Musik überlagert werden.
  // Jetzt: Ducking betrifft alle Music-Loops konsistent.
  if (lobbyAudioEl) lobbyAudioEl.volume = masterVolume * musicDuckFactor;
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

// 2026-05-12 (Sound-Audit P0 #2): Refcount-Duck. Vorher konkurrierten
// mehrere Klimax-Sounds um setMusicDucked(true/false) — kürzester Timeout
// gewann und schaltete Music wieder hoch obwohl länger laufender Sound noch
// im Climax war (z.B. fanfare 2000ms + climaxFinish 3000ms simultan).
// Refcount: pushDuck(N) schiebt Release-Zeitpunkt auf max(currentRelease, now+N).
// Music geht erst hoch wenn ALLE pushed-Durations abgelaufen sind.
let _duckReleaseAt = 0;
let _duckReleaseTimer: number | null = null;
export function pushDuck(durationMs: number) {
  const newRelease = Date.now() + durationMs;
  _duckReleaseAt = Math.max(_duckReleaseAt, newRelease);
  setMusicDucked(true);
  if (_duckReleaseTimer !== null) clearTimeout(_duckReleaseTimer);
  const wait = _duckReleaseAt - Date.now();
  _duckReleaseTimer = window.setTimeout(() => {
    _duckReleaseTimer = null;
    _duckReleaseAt = 0;
    setMusicDucked(false);
  }, wait);
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
    // 2026-05-07 (Sound-Audit P1.2): 450ms → 600ms — vereinheitlicht mit
    // questionMusicUrl-fadeOut (auch 600ms) und glaettet die Stille beim
    // Phase-Wechsel QUESTION_ACTIVE → QUESTION_REVEAL psychoakustisch.
    const el = loopAudioEl;
    loopAudioEl = null;
    fadeOutAudio(el, 600, true);
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
  if (_sfxMuted) return;
  if (!isSlotEnabled(slot)) return;
  // 2026-05-25 (Wolf-Sound-Audit Fix #1+#4): Fallback-Helper. Wenn Custom-
  // URL oder Default-URL fehlt/404, faellt der Slot auf den klassischen
  // Synth-Preset zurueck statt stumm zu sein.
  const playSynthFallback = () => {
    const presets = SYNTH_PRESETS[slot];
    const variant = presets?.classic ?? (presets ? Object.values(presets)[0] : null);
    if (!variant) return;
    const ac = getCtx();
    if (!ac) return;
    variant.play(ac, ac.currentTime);
  };
  const custom = soundConfig[slot];
  if (typeof custom === 'string' && custom.length > 0) {
    playAudioFile(custom, playSynthFallback);
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
    playAudioFile(defUrl, playSynthFallback);
    return;
  }
  playSynthFallback();
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
// 2026-05-05 (Phase-6 BC-2): Fanfare/Reveal sind grosse SFX, ducken die
// Music-Loops kurz weg damit die Phase-Cues nicht von Lobby/Finale-Musik
// uebertoent werden. 500ms Fade down → SFX → 500ms Fade up nach durMs.
export function playFanfare()      { playWithDuck('fanfare', 2000); }
export function playReveal()       { playWithDuck('reveal',  1500); }
export function playFieldPlaced()  { playSlotOneShot('fieldPlaced'); }
export function playTeamReveal()   { playSlotOneShot('teamReveal'); }
export function playSteal()        { playSlotOneShot('steal'); }
// 2026-05-23 (Wolf): playLobbyWelcome entfernt — wurde nirgends im React-Code
// aufgerufen. Slot 'lobbyWelcome' bleibt in QQSoundConfig erhalten, falls
// in Zukunft wieder gewollt + Wolfs etwaige MP3-Uploads bleiben sicher.

/** Spielt einen One-Shot-SFX und ducked Music-Loops für die geschätzte
 *  Sound-Dauer + 500ms Fade-In/Out (siehe setMusicDucked).
 *  Phase-6 Bucket-1 BC-2: vorher lief Music auf voller Lautstaerke ueber
 *  grossen SFX-Momenten (Fanfare/Reveal/GridReveal/ClimaxFinish/GameOver) —
 *  fuehrte zu Kakophonie. Ducking dimmt Music auf 20% waehrend des SFX. */
function playWithDuck(slot: QQSoundSlot, durationMs: number) {
  // 2026-05-12 (Sound-Audit P0 #2): pushDuck statt direkter setMusicDucked.
  // Verhindert dass kürzerer Klimax-Sound die Music wieder hochschiebt
  // während längerer Climax noch läuft.
  pushDuck(durationMs);
  playSlotOneShot(slot);
}

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
// 2026-05-23 (Wolf): playCorrectFor entfernt — nirgends aufgerufen. Generic
// playCorrect() reicht. Kategorie-Slots correct{Cat} bleiben erhalten.
export function playWrongFor(category?: string | null)         { playSlotForCategoryOrFallback('wrong', category); }
export function playRevealFor(category?: string | null)        { playSlotForCategoryOrFallback('reveal', category); }
export function playQuestionStartFor(category?: string | null) { playSlotForCategoryOrFallback('questionStart', category); }

export function playTick() {
  if (_sfxMuted) return;
  // 2026-05-07 (Sound-Audit P2.1): timerTick als customizable Slot.
  if (!isSlotEnabled('timerTick')) return;
  const url = resolveSlotUrl('timerTick');
  if (url) { playUrlOneShot(url); return; }
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // 2026-05-07 (Wolf 'mach cozy'): Square → Triangle. Square hat scharfe
  // ungeradzahlige Obertoene (klingt "harsch"), Triangle ist weicher aber
  // immer noch klar abgrenzbar als Tick. Pitch 880 → 760 leicht runter, das
  // sitzt komfortabler im warmen Filter-Bus.
  tone(760, 'triangle', t, 0.055, 0.13, 0.004, 0.04, ac);
}

/** 2026-05-05 (Phase-7 Bucket-1 BC-1): Audio-Feedback für Mod-Hotkey-Press.
 *  Wolf moderiert mit Streamdeck und schaut nicht zwingend auf den Screen —
 *  er braucht eine sofortige Audio-Bestaetigung dass der Tastatur-Event
 *  registriert wurde. Klar erkennbar von Timer-Tick (880Hz Square) durch
 *  tieferen Pitch (440Hz Triangle, weicher) und kuerzere Dauer.
 *  Nicht-blockend, nicht laut — soll sich nicht in Live-Show drücken. */
export function playHotkeyFeedback() {
  if (_sfxMuted) return;
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(440, 'triangle', t, 0.04, 0.05, 0.002, 0.025, ac);
}

export function playUrgentTick() {
  if (_sfxMuted) return;
  // 2026-05-07 (Sound-Audit P2.1): timerUrgent als customizable Slot.
  if (!isSlotEnabled('timerUrgent')) return;
  const url = resolveSlotUrl('timerUrgent');
  if (url) { playUrlOneShot(url); return; }
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // 2026-05-07 (Wolf 'mach cozy'): Square → Triangle, Pitch 1100 → 950 leicht
  // runter. UrgentTick bleibt Doppel-Hit fuers Endspurt-Drama, klingt aber
  // weniger schrill mit dem warmen Filter.
  tone(950, 'triangle', t, 0.06, 0.18, 0.003, 0.04, ac);
  tone(950, 'triangle', t + 0.1, 0.06, 0.18, 0.003, 0.04, ac);
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
    // 2026-05-07 (Sound-Audit P1.2): 450ms → 600ms (siehe stopTimerLoop).
    const el = lobbyAudioEl;
    lobbyAudioEl = null;
    fadeOutAudio(el, 600, true);
  }
}

/** 2026-05-07 (Sound-Audit P1.3): Einheitliches Loop-Fallback-Pattern.
 *  Vorher: Finale/Comeback fielen auf Lobby-Pool zurueck, GameOver auf
 *  hardcoded `/sounds/game-over.wav`, Slot-deaktiviert-Verhalten unter-
 *  schiedlich. Jetzt: alle drei Loops folgen derselben Hierarchie:
 *    1. Slot enabled? Wenn nein → Lobby-Pool-Fallback (statt Stille)
 *    2. resolveSlotUrl liefert custom-URL → fallback Default-URL → null
 *    3. URL vorhanden → abspielen, sonst Lobby-Pool-Fallback
 *  GameOver hat seine `/sounds/game-over.wav` als Default-URL via
 *  QQ_SOUND_DEFAULT_URLS — wenn die fehlt oder Slot leer ist, kommt
 *  Lobby-Musik statt Stille. */
function startContextLoop(slot: QQSoundSlot) {
  if (lobbyLoopActive) return;
  if (!isSlotEnabled(slot)) {
    startLobbyLoop('custom-or-pool');
    return;
  }
  const url = resolveSlotUrl(slot);
  if (url) {
    startLobbyTrackFromUrl(url);
    return;
  }
  startLobbyLoop('custom-or-pool');
}

/** Finale-Loop: 'finaleMusic'-Slot oder Lobby-Fallback. */
export function startFinaleLoop() { startContextLoop('finaleMusic'); }

/** GAME_OVER-Loop: 'gameOver'-Slot (Default-URL `/sounds/game-over.wav`)
 *  oder Lobby-Fallback. */
export function startGameOverLoop() { startContextLoop('gameOver'); }

/** Comeback-Loop: 'comebackMusic'-Slot oder Lobby-Fallback. */
export function startComebackLoop() { startContextLoop('comebackMusic'); }

/** 2026-05-13 (Wolf 'race phase: eigene mp3 slots fuer countdown, rennen,
 *  treppchen'): Race-Sound-Trio. Alle drei haben Fallback-Verhalten wenn
 *  kein Custom-Upload gesetzt ist — Wolf kann die Slots schrittweise
 *  befuellen ohne dass der bisherige Sound-Stack still wird.
 */

/** Race-Countdown (3-2-1-GO Stinger). Returns true wenn Custom-Upload
 *  vorhanden und gespielt — Caller (RaceCountdownOverlay) ueberspringt
 *  dann die einzelnen Tick-Cues, damit Wolfs MP3 alleine wirkt. */
export function playRaceCountdown(): boolean {
  if (!isSlotEnabled('raceCountdown')) return false;
  const url = resolveSlotUrl('raceCountdown');
  if (!url) return false;
  playUrlOneShot(url);
  return true;
}

/** Race-Hauptsound (waehrend Avatare rennen + gestaffelt fallen). One-Shot
 *  statt Loop, weil die Race-Phase Choreo ~15-25s dauert — Wolfs MP3 sollte
 *  in dieser Range liegen. Wenn kein Custom: stumm (existierende WoodKnocks
 *  pro Fall + Lobby-Background-Loop bleiben).
 *
 *  2026-05-13 v2 (Wolf 'racing sound muss nach gewinner entschieden aufhoeren,
 *  dann muss ein neuer sound anfangen'): Race-Loop ist jetzt ein echter Loop
 *  mit Modul-Level-Reference, damit er bei stopRaceLoop() hart abgebrochen
 *  werden kann (statt One-Shot wie v1). Wolfs MP3-Laenge ist damit egal —
 *  loop'd bis zum Stop. */
let raceLoopAudioEl: HTMLAudioElement | null = null;
export function startRaceLoop(): void {
  if (raceLoopAudioEl) return; // bereits laufend
  if (!isSlotEnabled('raceLoop')) return;
  const url = resolveSlotUrl('raceLoop');
  if (!url) return;
  try {
    const el = new Audio(url);
    el.loop = true;
    el.volume = masterVolume;
    el.play().catch(() => {});
    raceLoopAudioEl = el;
  } catch {}
}
export function stopRaceLoop(): void {
  if (!raceLoopAudioEl) return;
  try { raceLoopAudioEl.pause(); raceLoopAudioEl.currentTime = 0; } catch {}
  raceLoopAudioEl = null;
}

/** Sound pro Team-Fall in der Race-Phase. Fallback auf playWoodKnock (das
 *  bisherige Synth-Klack), damit der Sound nie ganz still ist. */
export function playRaceTeamFall(): void {
  if (!isSlotEnabled('raceTeamFall')) { playWoodKnock(); return; }
  const url = resolveSlotUrl('raceTeamFall');
  if (!url) { playWoodKnock(); return; }
  playUrlOneShot(url);
}

/** Cozy Arena: Bar-Race/Gesamtwertung erscheint (PLACEMENT in largeGroupMode).
 *  Leer = Fallback auf den bisherigen gridReveal-Cue; Moderator kann eine
 *  eigene MP3 im Sound-Panel hinterlegen (Slot 'arenaStandings'). */
export function playArenaStandings(): void {
  if (_sfxMuted) return;
  if (!isSlotEnabled('arenaStandings')) { playGridReveal(); return; }
  const url = resolveSlotUrl('arenaStandings');
  if (!url) { playGridReveal(); return; }
  playUrlOneShot(url);
}

/** Cozy Arena: eine Fraktion ueberholt an die Spitze (Bar-Race-Ueberhol-Blitz).
 *  Leer = Fallback auf den aufsteigenden scoreUp-Cue; ersetzbar via Slot
 *  'arenaLeadChange'. */
export function playArenaLeadChange(): void {
  if (_sfxMuted) return;
  if (!isSlotEnabled('arenaLeadChange')) { playScoreUp(); return; }
  const url = resolveSlotUrl('arenaLeadChange');
  if (!url) { playScoreUp(); return; }
  playUrlOneShot(url);
}

/** Sound sobald der Sieger entschieden ist (= nach letztem Team-Fall, vor
 *  Treppchen-Aufstieg). Ersetzt die bisherige playFanfare-Stelle in der
 *  Winner-Slow-Mo-Phase. Fallback auf playFanfare wenn kein Custom-Upload. */
export function playRaceWinner(): void {
  if (!isSlotEnabled('raceWinner')) { playFanfare(); return; }
  const url = resolveSlotUrl('raceWinner');
  if (!url) { playFanfare(); return; }
  playUrlOneShot(url);
}

/** Legacy-Alias: alte playRaceLoop ruft jetzt startRaceLoop, damit alte
 *  Caller weiter funktionieren. Wird in CozyQuizFinalRevealView durch
 *  startRaceLoop+stopRaceLoop ersetzt. */
export function playRaceLoop(): void { startRaceLoop(); }

/** 2026-05-13 (Wolf 'special awards: 1 sound slot reicht, 3x hintereinander
 *  mit gutem timing als drumroll, fuelle ich ein'): wird pro Award-Card-Flip
 *  einmal getriggert (= 3x ueber die Awards-Reveal-Sequenz). Fallback auf
 *  playWinnerCardReveal damit der Cue ohne Custom-MP3 nicht stumm ist. */
export function playSpecialAwardReveal(): void {
  if (!isSlotEnabled('specialAwardReveal')) { playWinnerCardReveal(); return; }
  const url = resolveSlotUrl('specialAwardReveal');
  if (!url) { playWinnerCardReveal(); return; }
  playUrlOneShot(url);
}

/** Race-Podium (Whoosh beim Treppchen-Aufstieg).
 *  2026-05-19 (Wolf 'nach race kommt zweimal ein winning sound'): Fallback
 *  war playWinnerCardReveal (Coronation-Akkord) — kollidierte mit dem
 *  Winner-Sound 1.5s spaeter (playRaceWinner → playFanfare). Jetzt
 *  dedicated Synth: rising whoosh ohne Bell-Charakter, fuegt sich als
 *  Animations-Akzent statt als Doppel-Sieger-Fanfare ein.
 *
 *  2026-05-24 (Wolf): Race-Final ist seit Eurovision-Refactor deaktiviert
 *  — diese Funktion ist Dead-Code, bleibt fuer Restore-Pfad.
 *  2026-05-25 (Wolf-Sound-Audit Fix #2): _sfxMuted-Gate ergaenzt, sonst
 *  spielte der Synth-Fallback selbst bei SFX-Mute (tone() prueft Flag nicht). */
export function playRacePodium(): void {
  if (_sfxMuted) return;
  if (!isSlotEnabled('racePodium')) return;
  const url = resolveSlotUrl('racePodium');
  if (url) { playUrlOneShot(url); return; }
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // Rising whoosh: aufsteigender Slide ohne Tonika — wirkt wie
  // „Etwas-bewegt-sich-hoch", nicht wie „Sieg".
  tone(180, 'triangle', t,        0.10, 0.20, 0.04, 0.10, ac);
  tone(280, 'triangle', t + 0.18, 0.10, 0.20, 0.02, 0.10, ac);
  tone(420, 'triangle', t + 0.36, 0.10, 0.22, 0.02, 0.12, ac);
  tone(620, 'sine',     t + 0.54, 0.08, 0.30, 0.02, 0.16, ac);
}

export function playQuestionStart() { playSlotOneShot('questionStart'); }
export function playRoundStart()    { playSlotOneShot('roundStart'); }

// 2026-05-17 (P1 #5): CozyGames Sound-Trigger.
// Tick = kurzer pointer-Klick. Stop = Final-Snap (Bell/Chime). Start = Cue.
// Slot-Custom-Upload via QQSoundConfig hat Vorrang, sonst Synth-Fallback.

export function playCozyGameIntro(): void {
  if (!isSlotEnabled('cozyGameIntro')) return;
  const url = resolveSlotUrl('cozyGameIntro');
  if (url) { playUrlOneShot(url); return; }
  // 2026-05-19 (Wolf): Anticipation-Chime beim 🪅-Pinata-Mount. Soll Lust
  // auf das Mini-Spiel machen ohne den eigentlichen Spin-Moment zu klauen.
  // Charakter: warmer Wood-Knock ("Pinata wackelt") + zarter aufsteigender
  // Bell-Glissando — F4 → A4 → C5 → F5-Sparkle. Bewusst leiser als wheel-
  // stop/card-reveal, damit Choreo gestaffelt wirkt: leise → laut → laut.
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // Wood-Knock (kurzer Bass-Thud)
  tone(180, 'sine',     t,        0.18, 0.12, 0.004, 0.05, ac);
  // Bell-Glissando aufsteigend
  tone(349.23, 'triangle', t + 0.10, 0.08, 0.22, 0.01, 0.10, ac); // F4
  tone(440.00, 'triangle', t + 0.20, 0.08, 0.24, 0.01, 0.10, ac); // A4
  tone(523.25, 'sine',     t + 0.30, 0.10, 0.30, 0.01, 0.14, ac); // C5
  // High-Bell-Sparkle obenauf
  tone(1396.9, 'sine',     t + 0.40, 0.06, 0.30, 0.005, 0.16, ac); // F6
}

export function playCozyGameWheelTick(): void {
  if (!isSlotEnabled('cozyGameWheelTick')) return;
  const url = resolveSlotUrl('cozyGameWheelTick');
  if (url) { playUrlOneShot(url); return; }
  // 2026-05-17: triangle 360Hz mit weichem Decay (satter Wood-Click).
  // 2026-05-19 (Wolf 'spinning wheel sound?'): gain 0.015 war nahezu lautlos
  // gegenueber Confetti/Voice. Auf 0.05 (3.3x) + leichte Pitch-Variation pro
  // Tick (350-380Hz) damit Spin-Sequenz lebendiger wirkt statt monoton.
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  const pitch = 350 + Math.random() * 30;
  tone(pitch, 'triangle', t, 0.05, 0.055, 0.001, 0.02, ac);
}

export function playCozyGameWheelStop(): void {
  if (!isSlotEnabled('cozyGameWheelStop')) { playWinnerCardReveal(); return; }
  const url = resolveSlotUrl('cozyGameWheelStop');
  if (url) { playUrlOneShot(url); return; }
  // 2026-05-17 (Wolf): Triade reicht — die zusätzliche playFanfare-Layerung
  // im CozyGameView ist raus (siehe dort). Triade selbst leicht warmer/voller
  // mit längerem Decay für „angekommen"-Feeling.
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // Aufsteigende Triade D-F#-A (Wolf-Brand-Sound) mit längerem Tail
  tone(587, 'triangle', t,        0.10, 0.32, 0.008, 0.12, ac);
  tone(740, 'triangle', t + 0.06, 0.10, 0.30, 0.008, 0.12, ac);
  tone(880, 'sine',     t + 0.12, 0.12, 0.28, 0.008, 0.16, ac);
}

export function playCozyGameStart(): void {
  if (!isSlotEnabled('cozyGameStart')) { playFanfare(); return; }
  const url = resolveSlotUrl('cozyGameStart');
  if (url) { playUrlOneShot(url); return; }
  // 2026-05-17 (Wolf): Doppel-Bell wirkte zu zart für „GO!"-Moment. Jetzt
  // 3-Ton-Arpeggio C-E-G aufsteigend (positiver Start-Cue) mit triangle-
  // Wave für warm-energetisches „Spiel los"-Gefühl.
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  tone(523, 'triangle', t,        0.10, 0.20, 0.008, 0.10, ac); // C5
  tone(659, 'triangle', t + 0.08, 0.10, 0.22, 0.008, 0.10, ac); // E5
  tone(784, 'sine',     t + 0.16, 0.14, 0.26, 0.008, 0.14, ac); // G5 (sine = bell-tail)
}
// BC-2: Music-Ducking fuer Game-Over-Cue (laut + dramatisch).
// 2026-05-23 (Wolf): playGameOver entfernt — nirgends aufgerufen (startGameOverLoop
// im Music-Effect übernimmt die GameOver-Beschallung). Slot 'gameOver' bleibt.

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
  if (_sfxMuted) return;
  const ac = getCtx();
  if (!ac) return;
  // C-Dur-Pentatonik: C4=261.63, D4=293.66, E4=329.63, G4=392.00, A4=440.00.
  // Wir nutzen 8 Stufen ueber 1.5 Oktaven (max 8 Teams).
  const scale = [
    261.63, 293.66, 329.63, 392.00, 440.00,           // C4 D4 E4 G4 A4
    523.25, 587.33, 659.25,                            // C5 D5 E5
  ];
  // 2026-05-07 (Wolf 'cascade klingt rhythmisch off, cleane tonleiter?'):
  // Vorher wurde die Skala auf die Team-Anzahl SKALIERT — bei 3 Teams sprang
  // sie C4 → A4 → E5 (riesige unmusikalische Spruenge). Jetzt linear: rank 0
  // = C4, rank 1 = D4, ... bis 8.
  // 2026-05-23 (Wolf 'wenn synth muss es nice sein'): Polish-Pass.
  // - Release 60ms → 140ms = smootherer Tail zwischen Teams
  // - Tail-Layer (zweite Sine 80ms später, 35% vol, lowpass-charakter via
  //   Triangle) = dezenter Reverb-Wash für Beamer-Speakers, ohne FX-Chain
  // - Octav-Sparkle leicht später (5ms → 15ms) = klingt weniger metallisch
  void total;
  const safeRank = Math.max(0, Math.min(rank, scale.length - 1));
  const freq = scale[safeRank];
  const t = ac.currentTime;
  // Warmer Bell-Note (Sine-Grundton, längerer Release).
  tone(freq, 'sine',     t,         0.18, 0.18, 0.005, 0.14, ac);
  // Oktav-Sparkle obenauf (leicht verzögert für natürliche Bell-Stack-Optik).
  tone(freq * 2, 'sine', t + 0.015, 0.06, 0.10, 0.003, 0.08, ac);
  // Reverb-Wash-Layer: gedämpfte Triangle ~80ms später, klingt wie Raum-Echo.
  tone(freq, 'triangle', t + 0.08,  0.06, 0.22, 0.012, 0.18, ac);
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
  // BC-2: Music-Ducking fuer den 9-Grid-Slam.
  // 2026-05-12 (Sound-Audit P0 #2): pushDuck statt direkter setMusicDucked.
  pushDuck(1500);
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
  // BC-2: Music-Ducking fuer Wettkampf-Beginn-Fanfare.
  pushDuck(2500);
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
  // BC-2: Music-Ducking fuer den Kroenungs-Akkord (~2.5s sustain).
  pushDuck(3000);
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

// 2026-05-23 (Wolf): playActionMenuReveal entfernt — nirgends aufgerufen.
// Action-Card-Reveal nutzt heute playWoodKnock (Slam) + playFieldPlaced/
// playSteal/playStapelStamp (Flip). Slot 'actionMenuReveal' bleibt.

/** URL-One-Shot (kein Slot-Check) — fuer interne Reuse in den Synth-Pfaden.
 *  2026-05-12 (Sound-Audit P0 #1+#3): vorher `new Audio(url)` jedes Mal frisch
 *  → Memory-Leak (Audio-Elemente sammelten sich, bei rem≤5s/playUrgentTick
 *  pro Sekunde +1 Element ungefreed). Plus: ignorierte `_sfxMuted` → Custom-
 *  Uploads spielten weiter trotz Mod-Mute.
 *  Fix: Delegation an `playAudioFile` (nutzt audioCache + Cooldown +
 *  masterVolume — masterVolume=0 bei Mute via setVolume). */
function playUrlOneShot(url: string): void {
  if (_sfxMuted) return;
  playAudioFile(url);
}

// ─────────────────────────────────────────────────────────────────────────
// WOW-Sounds — Cozy-Soundscape statt generic Beeps
// ─────────────────────────────────────────────────────────────────────────

/** Wolf-Howl: warmer ansteigender Ton, leicht vibrato, lange Fading-Tail.
 *  Statt klassischer Fanfare beim Game-Over (oder als zusätzlicher Stinger). */
export function playWolfHowl(): void {
  if (_sfxMuted) return;
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // 2026-05-19 (Wolf-Audit P1.5 'wolfHowl zu leise fuer Beamer'):
  // Lautstaerke-Boost gain 0.18 → 0.36 (2x) + sub-Layer 0.08 → 0.18.
  // Audio-Context-Master-Volume bleibt unangetastet, nur dieser Sound.
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
  // Hülle (Attack/Sustain/Release) — gain verdoppelt fuer Beamer-Praesenz
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.36, t + 0.5);
  gain.gain.exponentialRampToValueAtTime(0.28, t + 1.6);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
  // Sub-Bass-Layer für Wärme — auch lauter
  const sub = ac.createOscillator();
  const subGain = ac.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(110, t);
  sub.frequency.exponentialRampToValueAtTime(165, t + 1.5);
  subGain.gain.setValueAtTime(0.0001, t);
  subGain.gain.exponentialRampToValueAtTime(0.18, t + 0.4);
  subGain.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
  osc.connect(gain).connect(ac.destination);
  sub.connect(subGain).connect(ac.destination);
  osc.start(t); lfo.start(t); sub.start(t);
  osc.stop(t + 2.9); lfo.stop(t + 2.9); sub.stop(t + 2.7);
}

/** Wood-Klick: warmer dumpfer „Klack" auf Holztisch — alternative für
 *  Field-Placed/Cell-Tap. Kürzer und wärmer als der bestehende Synth. */
export function playWoodKnock(): void {
  if (_sfxMuted) return;
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  // 2026-05-23 (Wolf 'wenn synth muss es nice sein'): Polish-Pass.
  // - Body-Tones länger (40/50ms → 80/70ms) + Pitch-Drop für „echtes Holz"-Feel
  // - Noise stärker (0.06 → 0.11) + Lowpass wärmer (800Hz → 580Hz)
  // - Mini Mid-Tap (sine 220Hz) für mehr „Card-meets-Holz"-Charakter
  // Dumpfer Burst (low-freq sine + triangle) — basis-Hit.
  tone(160, 'sine',     t,         0.05, 0.25, 0.001, 0.08, ac);
  tone(280, 'triangle', t + 0.005, 0.06, 0.18, 0.001, 0.07, ac);
  // Mid-Tap: zusätzlicher 220Hz-Akzent ~10ms später = mehr Card-Snap.
  tone(220, 'sine',     t + 0.012, 0.04, 0.10, 0.001, 0.05, ac);
  // Noise-Burst für „Klack"-Anschlag — voller + wärmer als vorher.
  const buf = ac.createBuffer(1, ac.sampleRate * 0.06, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / data.length);
  }
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  const noiseGain = ac.createGain();
  noiseGain.gain.value = 0.11 * masterVolume;
  // Lowpass für warmen Holz-Charakter (580Hz statt 800Hz = weniger Klack, mehr Body).
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 580;
  noise.connect(lp).connect(noiseGain).connect(ac.destination);
  noise.start(t);
  noise.stop(t + 0.06);
}

/** Pro Avatar ein eigenes Mini-Jingle beim Joinen — ~0.6-0.9s.
 *  Charakter-Mapping: jeder Avatar kriegt sein eigenes Timbre.
 *  Unterscheidet sich vom generischen playTeamJoin (das bleibt für alle Teams).
 */
export function playAvatarJingle(avatarId: string): void {
  if (_sfxMuted) return;
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
      // 2026-05-07 (Wolf 'mach cozy'): square → triangle. Hohe Pitches bleiben
      // (Pinguin-Charakter), aber Obertoene weicher statt 8-bit-grell.
      tone(1320, 'triangle', t,        0.06, 0.07, 0.002, 0.04, ac);
      tone(1568, 'triangle', t + 0.06, 0.06, 0.07, 0.002, 0.04, ac);
      tone(1760, 'triangle', t + 0.12, 0.06, 0.07, 0.002, 0.04, ac);
      tone(1976, 'triangle', t + 0.18, 0.12, 0.09, 0.002, 0.06, ac);
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
      // 2026-05-07: square → triangle. Tempo + Cluster bleibt ('neugierig'),
      // aber sanfter im warmen Filter-Bus.
      tone(880, 'triangle', t,        0.05, 0.09, 0.002, 0.04, ac);
      tone(988, 'triangle', t + 0.07, 0.05, 0.09, 0.002, 0.04, ac);
      tone(1175, 'triangle', t + 0.14, 0.05, 0.09, 0.002, 0.04, ac);
      tone(1320, 'triangle', t + 0.22, 0.12, 0.11, 0.002, 0.06, ac);
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
 *  Wird in Lobby/Pause/Phase-Intro mitlaufen — komplementär zu lobbyLoop.
 *
 *  2026-05-25 (Wolf-Sound-Audit): DEAD CODE. startCampfireLoop wird nirgendwo
 *  im React-Code aufgerufen (nur stopCampfireLoop defensiv beim Mount in
 *  QQBeamerPage:1015). Funktion bleibt fuer ggf. Reaktivierung als
 *  Lobby/Pause-Atmosphaere — Wolf-Entscheidung steht aus ob es zurueckkommt
 *  oder ganz raus kann. Bis dahin: Music-Duck-Refactor unnoetig. */
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
