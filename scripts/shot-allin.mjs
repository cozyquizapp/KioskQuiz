/**
 * shot-allin.mjs — echter /beamer All-In (ZEHN_VON_ZEHN) Kategorie-Intro mit Beispiel.
 * Pollt die Beamer-DOM auf den Beispiel-Text und schiesst, sobald sichtbar.
 * VORAUSSETZUNG: Backend (4000 FRISCH) + Frontend (5173).
 * NUTZUNG: node scripts/shot-allin.mjs [label]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = 'http://localhost:5173';
const NAME = process.argv[2] ?? 'allin';
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

const hasExample = () => beamer.evaluate(() => {
  const t = document.body.innerText || '';
  return t.includes('Spread 10 points') || t.includes('Verteilt 10 Punkte');
});
const phase = () => beamer.evaluate(() => document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? '?');

// Schritt fuer Schritt vorwaerts; nach jedem Space kurz pollen (Beispiel kann
// mitten in einer Phase per introStep erscheinen). Sofort schiessen + stoppen.
let shot = false;
for (let i = 0; i < 60; i++) {
  // nach jedem Advance mehrfach checken (Intro-Anim braucht Zeit)
  for (let j = 0; j < 6; j++) {
    if (await hasExample()) {
      await sleep(1500);
      await beamer.screenshot({ path: `.shots/${NAME}-intro.png` });
      console.log(`✓ .shots/${NAME}-intro.png (All-In Beispiel, phase=${await phase()})`);
      shot = true; break;
    }
    await sleep(300);
  }
  if (shot) break;
  await mod.keyboard.press('Space');
  await sleep(300);
}
if (!shot) console.error(`All-In Beispiel nicht gefunden (letzte phase=${await phase()})`);
await b.close();
