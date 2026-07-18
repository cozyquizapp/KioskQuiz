/**
 * shot-cheese-arena.mjs — echter /beamer Arena CHEESE (bild 10, p1-0 Portrait).
 * Erfasst QUESTION_ACTIVE (Abgabe-Raster) + QUESTION_REVEAL (nach Morph: EINE
 * gerankte Wappen-Reihe, kein Doppel).
 * VORAUSSETZUNG: Backend 4000 FRISCH (neuer All-Kategorien-Draft) + Frontend 5173.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = 'http://localhost:5173';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('.shots', { recursive: true });

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1760, height: 990 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { sessionStorage.setItem('qq_admin_unlocked','1'); sessionStorage.setItem('qq_admin_pin','2506'); localStorage.setItem('qq-admin-pin','2506'); } catch {} });
const beamer = await ctx.newPage();
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });
const mod = await ctx.newPage();
mod.on('dialog', async (d) => { await d.dismiss(); });
await mod.goto(`${BASE}/moderator-test?arena=1&mega=1&run=1`, { waitUntil: 'domcontentloaded' });

const phase = () => beamer.evaluate(() => document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? '?');
const bodyText = () => beamer.evaluate(() => (document.body.innerText || '').toLowerCase());
const step = async () => { await mod.keyboard.press('Space'); await sleep(500); };
async function reach(target, max = 40) {
  for (let i = 0; i < max; i++) { if (await phase() === target) return true; await step(); }
  return false;
}

// Autoplay so FRUEH wie moeglich pausieren (poll ab 2s) — sonst rauscht es an
// p1-0 CHEESE vorbei. Button erscheint sobald testMode+joined+phase!=LOBBY.
let paused = false;
for (let i = 0; i < 24; i++) {
  await sleep(500);
  try { await mod.click('button[title="Autoplay pausieren"]', { timeout: 300 }); paused = true; break; } catch {}
}
// WICHTIG: Fokus vom Pause-Button nehmen, sonst togglet der naechste Space den
// Button (unpause) statt das Quiz zu steppen.
await mod.evaluate(() => (document.activeElement instanceof HTMLElement) && document.activeElement.blur());
console.log('Autoplay pausiert?', paused, '| phase:', await phase());
await sleep(400);

if (!await reach('QUESTION_ACTIVE')) { console.error('QUESTION_ACTIVE nicht erreicht (' + await phase() + ')'); await b.close(); process.exit(1); }
const isCheese = (await bodyText()).match(/bauwerk|landmark|eiffel/);
console.log('QUESTION_ACTIVE — CHEESE erkannt?', !!isCheese, '| Warte auf Bot-Abgaben...');
await sleep(4500);
await beamer.screenshot({ path: '.shots/cheese-arena-active.png' });
console.log('✓ .shots/cheese-arena-active.png (Abgabe-Raster live)');

if (!await reach('QUESTION_REVEAL')) { console.error('QUESTION_REVEAL nicht erreicht (' + await phase() + ')'); await b.close(); process.exit(1); }
console.log('QUESTION_REVEAL erreicht. Morph-Moment direkt erfassen...');
await sleep(700);
await beamer.screenshot({ path: '.shots/cheese-arena-reveal-early.png' });
// NICHT steppen (sonst Scoring-Beat) — die Wappen-Cascade fuellt sich auto.
await sleep(7000);
await beamer.screenshot({ path: '.shots/cheese-arena-reveal.png' });
const txt = await beamer.evaluate(() => (document.body.innerText || '').replace(/\s+/g,' ').slice(0,200));
console.log('✓ .shots/cheese-arena-reveal.png (nach Morph)');
console.log('Reveal-Text:', txt);
await b.close();
