/**
 * shot-pause-board.mjs — reproduziert die Pause-„Aktuelles Brett"-Folie
 * (Beamer-Findings #3/#7 'grid versetzt'). Startet ein Spiel, laesst Bots
 * Felder setzen, pausiert (Taste P), wartet bis das Board-Panel im Rotations-
 * Karussell aktiv ist, und knipst. FRISCHES Backend noetig.
 *
 * NUTZUNG: QQ_BASE=http://localhost:5174 node scripts/shot-pause-board.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.QQ_BASE ?? 'http://localhost:5173';
const OUT = '.shots-quirks';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1760, height: 990 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { sessionStorage.setItem('qq_admin_unlocked','1'); sessionStorage.setItem('qq_admin_pin','2506'); localStorage.setItem('qq-admin-pin','2506'); } catch {} });

const beamer = await ctx.newPage();
beamer.on('pageerror', (e) => console.log('[beamer ERR]', String(e).slice(0, 140)));
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });

const mod = await ctx.newPage();
mod.on('dialog', async (d) => { await d.dismiss(); });
await mod.goto(`${BASE}/moderator-test?run=1&set=cozyQuirks`, { waitUntil: 'domcontentloaded' });
console.log('run gestartet, warte auf Spielphasen …');
await sleep(9000);

const phase = () => beamer.evaluate(() => document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? '?');

// In eine Spielphase (nicht LOBBY/RULES) treiben, damit Felder gesetzt werden.
let tries = 0;
while (tries++ < 22) {
  const p = await phase();
  console.log('phase:', p);
  if (p === 'PLACEMENT' || p === 'QUESTION_ACTIVE' || p === 'QUESTION_REVEAL') break;
  await mod.keyboard.press('Space');
  await sleep(900);
}
// Ein paar Felder setzen lassen (Bots antworten → PLACEMENT).
await sleep(6000);

// Pause ausloesen (Taste P auf der Moderator-Seite).
await mod.bringToFront();
await mod.keyboard.press('p');
await sleep(2500);
console.log('nach Pause, phase:', await phase());

// Board-Panel im Rotations-Karussell abwarten (Titel „Aktuelles Brett"/„Current Board").
const hasBoard = () => beamer.evaluate(() => {
  const txt = document.body.innerText || '';
  return txt.includes('Aktuelles Brett') || txt.includes('Current Board');
});
let found = false;
for (let i = 0; i < 40; i++) {
  if (await hasBoard()) { found = true; break; }
  await sleep(1000);
}
console.log('Board-Panel sichtbar:', found);
await sleep(600);
await beamer.screenshot({ path: `${OUT}/PAUSE-board.png` });
console.log(`✓ ${OUT}/PAUSE-board.png`);
await b.close();
