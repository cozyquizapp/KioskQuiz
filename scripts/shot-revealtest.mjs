/**
 * shot-revealtest.mjs — /reveal-test (SchaetzchenReveal, bild 9) deterministisch,
 * OHNE Backend. Wartet die Reveal-Dramaturgie ab und schiesst den Endzustand.
 * VORAUSSETZUNG: Frontend (5173).
 * NUTZUNG: node scripts/shot-revealtest.mjs [label]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = 'http://localhost:5173';
const NAME = process.argv[2] ?? 'revealtest';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('.shots', { recursive: true });

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1760, height: 1200 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { sessionStorage.setItem('qq_admin_unlocked','1'); sessionStorage.setItem('qq_admin_pin','2506'); localStorage.setItem('qq-admin-pin','2506'); } catch {} });
const page = await ctx.newPage();
await page.goto(`${BASE}/reveal-test`, { waitUntil: 'domcontentloaded' });
await sleep(1500);
// Reveal-Dramaturgie (beat 0->3, Sieger-Beat) abwarten
await sleep(6500);
// Nur die 16:9-Stage clippen
const stage = await page.$('[style*="aspect-ratio"]') || await page.$('div');
const el = await page.evaluateHandle(() => {
  const all = [...document.querySelectorAll('div')];
  return all.find(d => getComputedStyle(d).containerType === 'size') || document.body;
});
try {
  const box = await el.asElement().boundingBox();
  if (box) { await page.screenshot({ path: `.shots/${NAME}.png`, clip: box }); }
  else { await page.screenshot({ path: `.shots/${NAME}.png` }); }
} catch { await page.screenshot({ path: `.shots/${NAME}.png` }); }
console.log(`✓ .shots/${NAME}.png`);
await b.close();
