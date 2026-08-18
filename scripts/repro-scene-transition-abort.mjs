/**
 * repro-scene-transition-abort.mjs — reproduziert den Live-Fund von Wolf
 * (2026-08-18): „Client error: Transition was aborted because of invalid state".
 *
 * URSACHE: die Zusagen (ready/finished/updateCallbackDone) einer View-Transition
 * werden REGULAER abgelehnt, wenn ein Wechsel abgebrochen wird — etwa weil der
 * naechste Phasenwechsel kommt, bevor der laufende fertig ist. Ohne Fang landet
 * das im `unhandledrejection`-Listener aus main.tsx, und der legt ein
 * bildschirmfuellendes Fehler-Overlay ueber die BUEHNE.
 *
 * REPRO: schnell hintereinander steppen (kuerzer als die 520ms Transition) und
 * einmal mit versteckter Buehne durchsteppen.
 *
 * ⚠️ EHRLICHER STAND (2026-08-18): dieses Script hat Wolfs Meldung im Container
 * NICHT rot bekommen — headless meldet Chromium das Dokument immer als sichtbar
 * und lehnt die Zusagen nicht ab. Es ist damit KEIN Nachweis des Fixes, sondern
 * eine Wache: schnelles Steppen und versteckte Buehne duerfen NIE eine
 * unbehandelte Ablehnung oder das Fehler-Overlay erzeugen. Wer den Fall am
 * echten Geraet reproduziert bekommt, traegt das hier nach.
 *
 * VORAUSSETZUNG: Backend (4000) + Frontend (5173).
 * NUTZUNG: node scripts/repro-scene-transition-abort.mjs [--gap=140] [--steps=24]
 * EXIT: 0 = kein Overlay (gruen), 2 = Overlay erschienen (rot).
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const num = (n, d) => Number((process.argv.find((a) => a.startsWith(`--${n}=`)) ?? `--${n}=${d}`).split('=')[1]);
const GAP = num('gap', 140);
const STEPS = num('steps', 24);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { setRoomTheme } = await import('./qqTheme-harness.mjs');
await setRoomTheme('cozyKino');
console.log('Theme gesetzt (Server bestaetigt): cozyKino');

const b = await chromium.launch({
  headless: true,
  ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
});
const ctx = await b.newContext({ viewport: { width: 1760, height: 990 } });
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem('qq_admin_unlocked', '1');
    sessionStorage.setItem('qq_admin_pin', '2506');
    localStorage.setItem('qq-admin-pin', '2506');
  } catch {}
  const w = window;
  w.__rejections = [];
  window.addEventListener('unhandledrejection', (e) => {
    w.__rejections.push(String(e?.reason?.message ?? e?.reason ?? 'unknown'));
  });
});

const beamer = await ctx.newPage();
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });
const mod = await ctx.newPage();
mod.on('dialog', (d) => d.dismiss());
await mod.goto(`${BASE}/moderator-test?run=1`, { waitUntil: 'domcontentloaded' });
await sleep(9000);

// Fall A — schnell steppen: kuerzer als die Transition (520ms), der laufende
// Wechsel wird vom naechsten abgebrochen.
await beamer.bringToFront();
for (let i = 0; i < STEPS; i++) {
  await mod.keyboard.press('Space');
  await sleep(GAP);
}
await sleep(1500);

// Fall B — Buehne NICHT im Vordergrund. Das ist der Fall aus Wolfs Meldung
// („invalid state"): das Dokument ist versteckt, startViewTransition bricht ab.
// Am echten Abend passiert das, sobald das Beamer-Fenster nicht das aktive ist
// (Fensterwechsel am Laptop, zweiter Bildschirm im Hintergrund).
await mod.bringToFront();
for (let i = 0; i < STEPS; i++) {
  await mod.keyboard.press('Space');
  await sleep(GAP * 3);
}
await sleep(2000);
await beamer.bringToFront();
await sleep(500);

const res = await beamer.evaluate(() => {
  const el = document.getElementById('cozy-global-error');
  return {
    overlayVisible: !!el && el.style.display !== 'none',
    overlayText: el?.textContent ?? '',
    rejections: window.__rejections ?? [],
    phase: document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? '?',
    sceneMotion: document.documentElement.getAttribute('data-scene-motion'),
  };
});

console.log('data-scene-motion :', res.sceneMotion);
console.log('Phase am Ende    :', res.phase);
console.log('unhandledrejection:', res.rejections.length, res.rejections.slice(0, 3));
console.log('Fehler-Overlay    :', res.overlayVisible ? `SICHTBAR -> "${res.overlayText}"` : 'nicht sichtbar');
await b.close();

if (res.overlayVisible || res.rejections.length > 0) {
  console.log('✗ ROT — der Abbruch schlaegt bis auf die Buehne durch');
  process.exit(2);
}
console.log('✓ GRUEN — Abbruch wird abgefangen, Buehne bleibt sauber');
