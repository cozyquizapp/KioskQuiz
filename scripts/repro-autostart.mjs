/**
 * repro-autostart.mjs — reproduziert Wolfs Bug "moderator-test startet sofort ein Quiz".
 * Oeffnet /moderator-test OHNE run-Param auf frischem Raum, wartet ohne Eingabe,
 * prueft ob die Phase ueber LOBBY hinauslaeuft.
 * VORAUSSETZUNG: Backend 4000 FRISCH + Frontend 5173.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = 'http://localhost:5173';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('.shots', { recursive: true });

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1760, height: 990 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { sessionStorage.setItem('qq_admin_unlocked','1'); sessionStorage.setItem('qq_admin_pin','2506'); localStorage.setItem('qq-admin-pin','2506'); } catch {} });

// Beamer zum Phase-Lesen
const beamer = await ctx.newPage();
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });
const phase = () => beamer.evaluate(() => document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? 'NONE');

// Moderator-Test OHNE run-Param
const mod = await ctx.newPage();
const dialogs = [];
mod.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss(); });
await mod.goto(`${BASE}/moderator-test`, { waitUntil: 'domcontentloaded' });

console.log('geoeffnet /moderator-test (ohne run). Beobachte 9s OHNE Eingabe...');
for (let i = 1; i <= 9; i++) { await sleep(1000); process.stdout.write(` ${i}s:${await phase()}`); }
console.log('');
const finalPhase = await phase();
await mod.screenshot({ path: '.shots/repro-autostart-mod.png' });
await beamer.screenshot({ path: '.shots/repro-autostart-beamer.png' });
console.log('Final Beamer-Phase:', finalPhase);
console.log('Dialoge:', JSON.stringify(dialogs));
console.log(finalPhase === 'LOBBY' || finalPhase === 'NONE'
  ? 'KEIN Autostart auf frischem Raum (Bug = Stale-Room oder run=1-Bookmark).'
  : 'AUTOSTART REPRODUZIERT! Phase ohne Eingabe = ' + finalPhase);
await b.close();
