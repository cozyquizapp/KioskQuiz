/**
 * probe-scene-transition.mjs — beweist, OB die View-Transition auf der Buehne
 * feuert (statt es aus einem Film-Streifen zu erraten).
 *
 * Patcht document.startViewTransition auf dem /beamer, treibt Phasenwechsel per
 * Space auf der Moderator-Seite und liest den Zaehler aus.
 * NUTZUNG: node scripts/probe-scene-transition.mjs [--theme=cozyKino] [--steps=6]
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const THEME = (process.argv.find((a) => a.startsWith('--theme=')) ?? '--theme=cozyKino').split('=')[1];
const STEPS = Number((process.argv.find((a) => a.startsWith('--steps=')) ?? '--steps=6').split('=')[1]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { setRoomTheme } = await import('./qqTheme-harness.mjs');
await setRoomTheme(THEME);
console.log('Theme gesetzt (Server bestaetigt):', THEME);

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
  // Zaehler VOR dem App-Start installieren.
  const w = window;
  w.__vtCalls = 0;
  w.__vtSupported = typeof document.startViewTransition === 'function';
  if (w.__vtSupported) {
    const orig = document.startViewTransition.bind(document);
    document.startViewTransition = (cb) => { w.__vtCalls++; return orig(cb); };
  }
});

const beamer = await ctx.newPage();
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });
const mod = await ctx.newPage();
mod.on('dialog', (d) => d.dismiss());
await mod.goto(`${BASE}/moderator-test?run=1`, { waitUntil: 'domcontentloaded' });
await sleep(9000);

const phases = [];
for (let i = 0; i < STEPS; i++) {
  await mod.keyboard.press('Space');
  await sleep(1600);
  phases.push(await beamer.evaluate(() => document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? '?'));
}

const probe = await beamer.evaluate(() => ({
  sceneMotion: document.documentElement.getAttribute('data-scene-motion'),
  quietMotion: document.documentElement.getAttribute('data-quiet-motion'),
  vtSupported: window.__vtSupported,
  vtCalls: window.__vtCalls,
}));
console.log('Phasen-Verlauf :', phases.join(' -> '));
console.log('data-scene-motion:', probe.sceneMotion);
console.log('startViewTransition vorhanden:', probe.vtSupported);
console.log('AUFRUFE der Transition:', probe.vtCalls);
const changes = phases.filter((p, i) => i > 0 && p !== phases[i - 1]).length;
console.log('Phasenwechsel im Fenster:', changes);
console.log(probe.vtCalls > 0 ? '✓ Transition feuert' : '✗ Transition feuert NICHT');
await b.close();
