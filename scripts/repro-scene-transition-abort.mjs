/**
 * repro-scene-transition-abort.mjs — Wolfs Live-Fund vom 2026-08-18:
 * „Client error: Transition was aborted because of invalid state", auf dem
 * BEAMER, ausgeloest durch einen TAB-WECHSEL.
 *
 * URSACHE: ist das Dokument nicht sichtbar, bricht startViewTransition ab und
 * lehnt seine Zusagen (ready/finished/updateCallbackDone) ab. Ohne Fang landet
 * das im unhandledrejection-Listener aus main.tsx — und der legt ein
 * bildschirmfuellendes Fehler-Overlay ueber die Buehne.
 *
 * WARUM NICHT „Tab wechseln" NACHGESTELLT WIRD: der Container bekommt eine Seite
 * nicht auf hidden (headless meldet immer visible, CDP-Override existiert nicht
 * mehr, unter Xvfb bleiben beide Tabs visible). Nachgestellt wird deshalb nicht
 * die URSACHE, sondern die WIRKUNG: startViewTransition wird durch eine Attrappe
 * ersetzt, die exakt so abbricht wie im Live-Fall. Das ist die Fehlerkette, um
 * die es geht, und sie ist damit deterministisch pruefbar.
 *
 * VORAUSSETZUNG: Backend (4000) + Frontend (5173).
 * NUTZUNG: node scripts/repro-scene-transition-abort.mjs
 * EXIT: 0 = kein Overlay (gruen), 2 = Overlay bzw. unbehandelte Ablehnung (rot).
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
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
  // Attrappe: verhaelt sich wie eine Transition, die beim Tab-Wechsel abbricht.
  // Der Update-Callback laeuft (die neue Szene wird also committet), die drei
  // Zusagen werden abgelehnt — exakt Wolfs Meldung.
  w.__vtStarts = 0;
  if (typeof document.startViewTransition === 'function') {
    document.startViewTransition = (cb) => {
      w.__vtStarts++;
      try { cb?.(); } catch {}
      const abort = () => Promise.reject(new DOMException(
        'Transition was aborted because of invalid state', 'InvalidStateError'));
      return { ready: abort(), finished: abort(), updateCallbackDone: abort(), skipTransition() {} };
    };
  }
});

const beamer = await ctx.newPage();
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });
const mod = await ctx.newPage();
mod.on('dialog', (d) => d.dismiss());
await mod.goto(`${BASE}/moderator-test?run=1`, { waitUntil: 'domcontentloaded' });
await sleep(9000);

for (let i = 0; i < 10; i++) {
  await mod.keyboard.press('Space');
  await sleep(900);
}
await sleep(2000);

const res = await beamer.evaluate(() => {
  const el = document.getElementById('cozy-global-error');
  return {
    overlayVisible: !!el && el.style.display !== 'none',
    overlayText: (el?.textContent ?? '').slice(0, 120),
    rejections: window.__rejections ?? [],
    vtStarts: window.__vtStarts ?? 0,
    phase: document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? '?',
    sceneMotion: document.documentElement.getAttribute('data-scene-motion'),
  };
});

console.log('data-scene-motion  :', res.sceneMotion);
console.log('Transitionen gestartet:', res.vtStarts);
console.log('Phase am Ende      :', res.phase);
console.log('unhandledrejection :', res.rejections.length, res.rejections.slice(0, 2));
console.log('Fehler-Overlay     :', res.overlayVisible ? `SICHTBAR -> "${res.overlayText}"` : 'nicht sichtbar');
await b.close();

if (res.vtStarts === 0) {
  console.log('⚠️ Es wurde keine einzige Transition gestartet — Lauf aussagelos (Theme/Phasen pruefen).');
  process.exit(3);
}
if (res.overlayVisible || res.rejections.length > 0) {
  console.log('✗ ROT — der Abbruch schlaegt bis auf die Buehne durch');
  process.exit(2);
}
console.log('✓ GRUEN — Abbruch wird abgefangen, Buehne bleibt sauber');
