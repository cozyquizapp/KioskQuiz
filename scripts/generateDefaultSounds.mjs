// Generiert Default-WAV-Dateien für die QQ-Sound-Slots.
// Rein deterministisch, keine externen Deps. Läuft mit: node scripts/generateDefaultSounds.mjs
//
// Die Sounds sind bewusst kurz und "chiptune-artig" — das ist der Default,
// der Moderator kann im Sound-Panel eigene Dateien hochladen.
//
// Output: frontend/public/sounds/<slot>.wav

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const OUT_DIR    = join(__dirname, '..', 'frontend', 'public', 'sounds');
mkdirSync(OUT_DIR, { recursive: true });

const SR = 44100; // sample rate

// ── WAV encoding ─────────────────────────────────────────────────────────────

function encodeWav(samples) {
  const numSamples = samples.length;
  const bytesPerSample = 2;
  const dataSize = numSamples * bytesPerSample;
  const buf = Buffer.alloc(44 + dataSize);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);        // fmt chunk size
  buf.writeUInt16LE(1, 20);          // PCM
  buf.writeUInt16LE(1, 22);          // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * bytesPerSample, 28); // byte rate
  buf.writeUInt16LE(bytesPerSample, 32);      // block align
  buf.writeUInt16LE(16, 34);                  // bits per sample
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}

// ── Synth primitives ─────────────────────────────────────────────────────────

function newBuffer(durationSec) {
  return new Float32Array(Math.ceil(durationSec * SR));
}

function oscValue(type, phase) {
  // phase in [0, 1)
  switch (type) {
    case 'sine':     return Math.sin(phase * 2 * Math.PI);
    case 'square':   return phase < 0.5 ? 1 : -1;
    case 'sawtooth': return 2 * phase - 1;
    case 'triangle': return 4 * Math.abs(phase - 0.5) - 1;
    default:         return Math.sin(phase * 2 * Math.PI);
  }
}

// Adds a tone with linear attack/release envelope into buf starting at startSec.
function addTone(buf, startSec, freq, type, durationSec, peak, attack = 0.01, release = 0.1) {
  const startIdx = Math.floor(startSec * SR);
  const lenIdx = Math.floor(durationSec * SR);
  const attackIdx = Math.max(1, Math.floor(attack * SR));
  const releaseIdx = Math.max(1, Math.floor(release * SR));
  let phase = 0;
  const phaseInc = freq / SR;
  for (let i = 0; i < lenIdx; i++) {
    const idx = startIdx + i;
    if (idx >= buf.length) break;
    let env;
    if (i < attackIdx) env = i / attackIdx;
    else if (i > lenIdx - releaseIdx) env = Math.max(0, (lenIdx - i) / releaseIdx);
    else env = 1;
    buf[idx] += oscValue(type, phase) * peak * env;
    phase += phaseInc;
    if (phase >= 1) phase -= 1;
  }
}

// Adds a frequency-swept tone (pitch glide).
function addSweep(buf, startSec, fromHz, toHz, type, durationSec, peak) {
  const startIdx = Math.floor(startSec * SR);
  const lenIdx = Math.floor(durationSec * SR);
  let phase = 0;
  for (let i = 0; i < lenIdx; i++) {
    const idx = startIdx + i;
    if (idx >= buf.length) break;
    const t = i / lenIdx;
    // exponential sweep feels more musical
    const freq = fromHz * Math.pow(toHz / fromHz, t);
    const env = Math.sin(Math.PI * t); // smooth bell
    buf[idx] += oscValue(type, phase) * peak * env;
    phase += freq / SR;
    if (phase >= 1) phase -= 1;
  }
}

// Adds white noise (short) into buf.
function addNoise(buf, startSec, durationSec, peak) {
  const startIdx = Math.floor(startSec * SR);
  const lenIdx = Math.floor(durationSec * SR);
  for (let i = 0; i < lenIdx; i++) {
    const idx = startIdx + i;
    if (idx >= buf.length) break;
    const t = i / lenIdx;
    const env = Math.pow(1 - t, 2);
    buf[idx] += (Math.random() * 2 - 1) * peak * env;
  }
}

// Final limiter to avoid clipping if tones overlap.
function normalize(buf, targetPeak = 0.9) {
  let max = 0;
  for (let i = 0; i < buf.length; i++) {
    const a = Math.abs(buf[i]);
    if (a > max) max = a;
  }
  if (max <= targetPeak) return;
  const k = targetPeak / max;
  for (let i = 0; i < buf.length; i++) buf[i] *= k;
}

function save(name, buf) {
  normalize(buf);
  const path = join(OUT_DIR, name);
  writeFileSync(path, encodeWav(buf));
  console.log(`  ✓ ${name} (${(buf.length / SR).toFixed(2)}s)`);
}

// ── Individual sounds ────────────────────────────────────────────────────────

// Correct: bright 4-note arpeggio (C-E-G-C)
function correct() {
  const buf = newBuffer(0.8);
  const freqs = [523.25, 659.25, 783.99, 1046.5];
  freqs.forEach((f, i) => addTone(buf, i * 0.07, f, 'sine', 0.35, 0.25, 0.01, 0.12));
  save('correct.wav', buf);
}

// Wrong: two descending sawtooth growls
function wrong() {
  const buf = newBuffer(0.5);
  addTone(buf, 0.00, 180, 'sawtooth', 0.22, 0.30, 0.01, 0.16);
  addTone(buf, 0.10, 140, 'sawtooth', 0.22, 0.26, 0.01, 0.14);
  save('wrong.wav', buf);
}

// Times up: descending sweep + low thud
function timesUp() {
  const buf = newBuffer(0.9);
  addSweep(buf, 0.00, 380, 110, 'sawtooth', 0.55, 0.38);
  addTone (buf, 0.05, 75,  'sine',      0.35, 0.28, 0.01, 0.22);
  save('times-up.wav', buf);
}

// Field placed: satisfying low thunk + shimmer
function fieldPlaced() {
  const buf = newBuffer(0.5);
  addTone(buf, 0.00, 110,  'sine',     0.15, 0.34, 0.005, 0.10);
  addTone(buf, 0.00, 220,  'sine',     0.13, 0.24, 0.005, 0.08);
  addTone(buf, 0.04, 660,  'sine',     0.22, 0.18, 0.005, 0.16);
  addTone(buf, 0.06, 1320, 'triangle', 0.20, 0.10, 0.005, 0.14);
  save('field-placed.wav', buf);
}

// Steal: high-to-low whoosh + double ping
function steal() {
  const buf = newBuffer(0.7);
  addSweep(buf, 0.00, 1400, 280, 'sine', 0.32, 0.30);
  addTone (buf, 0.28, 440,  'triangle', 0.12, 0.24, 0.005, 0.08);
  addTone (buf, 0.36, 880,  'triangle', 0.20, 0.22, 0.005, 0.14);
  save('steal.wav', buf);
}

// Reveal: upward mystery sweep
function reveal() {
  const buf = newBuffer(0.6);
  addSweep(buf, 0.00, 200, 800, 'sine', 0.4, 0.28);
  save('reveal.wav', buf);
}

// Fanfare: rising C-major triad + held tonic
function fanfare() {
  const buf = newBuffer(1.0);
  const pattern = [
    [523.25, 0.00, 0.14],
    [659.25, 0.12, 0.14],
    [783.99, 0.24, 0.14],
    [1046.5, 0.36, 0.34],
  ];
  for (const [f, offset, dur] of pattern) addTone(buf, offset, f, 'sine', dur, 0.28, 0.01, 0.10);
  save('fanfare.wav', buf);
}

// Game over: extended triumphant fanfare
function gameOver() {
  const buf = newBuffer(1.8);
  const pattern = [
    [523.25, 0.00, 0.18, 0.28],
    [659.25, 0.15, 0.18, 0.28],
    [783.99, 0.30, 0.18, 0.28],
    [1046.5, 0.45, 0.42, 0.32],
    [783.99, 0.80, 0.14, 0.26],
    [1046.5, 0.92, 0.60, 0.34],
  ];
  for (const [f, offset, dur, peak] of pattern) addTone(buf, offset, f, 'sine', dur, peak, 0.01, 0.12);
  // add a triangle overlay on the last note for shimmer
  addTone(buf, 0.92, 1318.5, 'triangle', 0.55, 0.14, 0.01, 0.40);
  save('game-over.wav', buf);
}

// Lobby welcome: soft rising penta
function lobbyWelcome() {
  const buf = newBuffer(1.1);
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  notes.forEach((f, i) => addTone(buf, i * 0.13, f, 'sine', 0.48, 0.18 - i * 0.02, 0.01, 0.32));
  save('lobby-welcome.wav', buf);
}

// Timer loop: 4-second loopable arpeggio with bass pulse (120 BPM, 8 beats)
// Simple arpeggio that loops cleanly.
function timerLoop() {
  const beat = 0.5; // 120 BPM
  const steps = 8;
  const totalSec = beat * steps;
  const buf = newBuffer(totalSec);
  const melody = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 523.25, 0];
  for (let step = 0; step < steps; step++) {
    const t = step * beat;
    // bass pulse every beat
    addTone(buf, t, 65, 'sine', 0.22, 0.22, 0.005, 0.15);
    const f = melody[step];
    if (f > 0) addTone(buf, t, f, 'triangle', beat * 0.65, 0.14, 0.008, 0.12);
  }
  save('timer-loop.wav', buf);
}

// ── Run ──────────────────────────────────────────────────────────────────────

console.log(`Generating default sounds → ${OUT_DIR}`);
correct();
wrong();
timesUp();
fieldPlaced();
steal();
reveal();
fanfare();
gameOver();
lobbyWelcome();
timerLoop();
console.log('Done. 10 files written.');
