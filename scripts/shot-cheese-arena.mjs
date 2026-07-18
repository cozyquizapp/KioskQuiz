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

// Autoplay so FRUEH wie moeglich + VERIFIZIERT pausieren — sonst rauscht es an
// p1-0 CHEESE vorbei. Button erscheint sobald testMode+joined+phase!=LOBBY.
// Idempotent: pausiert NUR wenn nicht schon pausiert (Button 'fortsetzen' = paused).
async function ensurePaused() {
  for (let i = 0; i < 40; i++) {
    if (await mod.$('button[title="Autoplay fortsetzen"]')) return true; // schon pausiert
    try { await mod.click('button[title="Autoplay pausieren"]', { timeout: 250 }); } catch { await sleep(250); continue; }
    await mod.evaluate(() => (document.activeElement instanceof HTMLElement) && document.activeElement.blur());
    await sleep(300);
  }
  return false;
}
console.log('pausiere Autoplay verifiziert...');
const paused = await ensurePaused();
console.log('Autoplay pausiert(stabil)?', paused, '| phase:', await phase());

// Fragen werden pro Runde gemischt -> CHEESE per TEXT suchen (nicht Position).
// Space steppt durch Nicht-CHEESE-Fragen bis die CHEESE-Frage aktiv ist.
let found = false;
for (let i = 0; i < 70; i++) {
  const ph = await phase();
  const txt = await bodyText();
  if (ph === 'QUESTION_ACTIVE' && /landmark|bauwerk|eiffel/.test(txt)) { found = true; break; }
  await mod.keyboard.press('Space'); await sleep(650);
}
if (!found) { console.error('CHEESE-Frage nicht gefunden. phase=' + await phase()); await b.close(); process.exit(2); }
console.log('CHEESE aktiv gefunden. Warte auf Bot-Abgaben...');
await sleep(4500);
await beamer.screenshot({ path: '.shots/cheese-arena-active.png' });
console.log('✓ .shots/cheese-arena-active.png (Abgabe-Raster live)');

if (!await reach('QUESTION_REVEAL')) { console.error('QUESTION_REVEAL nicht erreicht (' + await phase() + ')'); await b.close(); process.exit(1); }
console.log('QUESTION_REVEAL — erfasse letzten Reveal-Frame (vollste Wappen-Reihe vor Scoring)...');
// Solange QUESTION_REVEAL: alle 500ms ueberschreiben -> letzter Frame = fullste Reihe.
let frames = 0;
for (let t = 0; t < 20; t++) {
  if (await phase() !== 'QUESTION_REVEAL') break;
  await beamer.screenshot({ path: '.shots/cheese-arena-reveal.png' });
  frames++;
  await sleep(500);
}
console.log('Reveal-Frames erfasst:', frames);
const txt = await beamer.evaluate(() => (document.body.innerText || '').replace(/\s+/g,' ').slice(0,200));
console.log('✓ .shots/cheese-arena-reveal.png (nach Morph)');
console.log('Reveal-Text:', txt);
await b.close();
