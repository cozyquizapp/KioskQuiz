/**
 * shot-quirks-teams.mjs — „Heute spielen" (TEAMS_REVEAL) mit Cozy-Quirks-Set.
 * Fährt LOBBY → advance via Space bis TEAMS_REVEAL, hält per ?hold nicht (Space
 * steuert). Screenshot mid + done. FRISCHES Backend (LOBBY) nötig.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = 'http://localhost:5173';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('.shots-quirks', { recursive: true });

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1760, height: 990 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { sessionStorage.setItem('qq_admin_unlocked','1'); sessionStorage.setItem('qq_admin_pin','2506'); localStorage.setItem('qq-admin-pin','2506'); } catch {} });
const beamer = await ctx.newPage();
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });
const mod = await ctx.newPage();
mod.on('dialog', async (d) => { await d.dismiss(); });
await mod.goto(`${BASE}/moderator-test?run=1&set=cozyQuirks`, { waitUntil: 'domcontentloaded' });
await sleep(8000);

const phase = () => beamer.evaluate(() => document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? '?');
let tries = 0;
while (tries++ < 30) {
  const p = await phase();
  if (p === 'TEAMS_REVEAL') break;
  await mod.keyboard.press('Space');
  await sleep(700);
}
const p = await phase();
if (p !== 'TEAMS_REVEAL') { console.error('TEAMS_REVEAL nicht erreicht (Phase=' + p + ')'); await b.close(); process.exit(1); }
console.log('TEAMS_REVEAL erreicht.');
await sleep(16000);
await beamer.screenshot({ path: `.shots-quirks/TEAMS-done.png` });
console.log('✓ .shots-quirks/TEAMS-done.png');
await b.close();
