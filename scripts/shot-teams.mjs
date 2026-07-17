/**
 * shot-teams.mjs — echter /beamer TEAMS_REVEAL (Starting Lineup, bild 2).
 * Screenshot mid-Einzug + Done-Zustand (alle 8 im Roster).
 * VORAUSSETZUNG: Backend (4000, FRISCH) + Frontend (5173).
 * NUTZUNG: node scripts/shot-teams.mjs [label]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = 'http://localhost:5173';
const NAME = process.argv[2] ?? 'teams';
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
await sleep(8000);

const phase = () => beamer.evaluate(() => document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? '?');
let tries = 0;
while (tries++ < 30) {
  if ((await phase()) === 'TEAMS_REVEAL') break;
  await mod.keyboard.press('Space');
  await sleep(800);
}
if ((await phase()) !== 'TEAMS_REVEAL') { console.error('TEAMS_REVEAL nicht erreicht (Phase=' + (await phase()) + ')'); await b.close(); process.exit(1); }
console.log('TEAMS_REVEAL erreicht.');

await sleep(6000);
await beamer.screenshot({ path: `.shots/${NAME}-mid.png` });
console.log(`✓ .shots/${NAME}-mid.png (mid-Einzug)`);

// bis Done: Einzug ~8x1.9s. Warten, bis "Los geht's/Let's go" oder ~18s.
await sleep(15000);
await beamer.screenshot({ path: `.shots/${NAME}-done.png` });
console.log(`✓ .shots/${NAME}-done.png (Startaufstellung)`);
await b.close();
