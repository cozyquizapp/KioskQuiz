// 2026-05-10 CozyBuilder Audit #15: Sound-Layer fürs Schreib-Erlebnis.
// Drei subtile Beats, ALLE kurz (<300ms), Volume gedeckelt auf 0.15 (Wolf
// soll Builder neben Musik laufen lassen können). Mute-Toggle in localStorage
// `qq-builder-sound-muted` — Default = ON (User aktiv opt-out wenn störend).
//
// Bewusst NICHT die Game-Sounds wiederverwenden:
// - Game-Sounds sind laut + dramatisch (Beamer-tauglich).
// - Builder will Mikro-Feedback, kein Schauspiel.
// - Game-Mute ist ein anderer State (Game kann muted sein, Builder soll
//   trotzdem subtle Audio liefern → eigener State sauberer).

const MUTE_KEY = 'qq-builder-sound-muted';
const BASE_VOLUME = 0.15;

function isMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}

export function getBuilderMuted(): boolean { return isMuted(); }

export function setBuilderMuted(muted: boolean): void {
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch {}
}

let _ctx: AudioContext | null = null;
function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (_ctx) return _ctx;
  try {
    const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    _ctx = new Ctor();
    return _ctx;
  } catch { return null; }
}

function tone(freq: number, type: OscillatorType, startOffset: number, attack: number, hold: number, release: number) {
  if (isMuted()) return;
  const ac = ctx();
  if (!ac) return;
  // Resume falls suspended (Browser-Autoplay-Policy)
  if (ac.state === 'suspended') { ac.resume().catch(() => {}); }
  const t0 = ac.currentTime + startOffset;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(BASE_VOLUME, t0 + attack);
  gain.gain.linearRampToValueAtTime(BASE_VOLUME * 0.7, t0 + attack + hold);
  gain.gain.linearRampToValueAtTime(0, t0 + attack + hold + release);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + attack + hold + release + 0.02);
}

/** Add-Question / Slot-Wechsel — sehr kurzer Click (~60ms, 440Hz Triangle). */
export function playCozyClick(): void {
  tone(440, 'triangle', 0, 0.005, 0.03, 0.025);
}

/** Save-Success — sanfte 2-Ton-Bell (C5 → E5, je 100ms). */
export function playCozySave(): void {
  tone(523.25, 'sine', 0,    0.01, 0.06, 0.06); // C5
  tone(659.25, 'sine', 0.08, 0.01, 0.06, 0.10); // E5
}

/** Upload-Complete — 3-Ton-Chime (C5 → E5 → G5, ascending). */
export function playCozyUpload(): void {
  tone(523.25, 'sine', 0,    0.01, 0.05, 0.05); // C5
  tone(659.25, 'sine', 0.08, 0.01, 0.05, 0.05); // E5
  tone(783.99, 'sine', 0.16, 0.01, 0.08, 0.10); // G5
}

/** Milestone — kleine Fanfare (G5 → C6 → E6, ascending, slightly longer). */
export function playCozyMilestone(): void {
  tone(783.99, 'sine', 0,    0.02, 0.08, 0.08); // G5
  tone(1046.5, 'sine', 0.10, 0.02, 0.08, 0.08); // C6
  tone(1318.5, 'sine', 0.20, 0.02, 0.12, 0.15); // E6
}
