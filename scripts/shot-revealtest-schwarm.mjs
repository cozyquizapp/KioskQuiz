/**
 * shot-revealtest-schwarm.mjs — /reveal-test im Schwarm-Modus (CrowdEstimateReveal,
 * Wolfs Gummibaeren-Szene). OHNE Backend. Frontend 5173.
 * NUTZUNG: node scripts/shot-revealtest-schwarm.mjs [label]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = 'http://localhost:5173';
const NAME = process.argv[2] ?? 'revealtest-schwarm';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('.shots', { recursive: true });

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1760, height: 1200 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { sessionStorage.setItem('qq_admin_unlocked','1'); sessionStorage.setItem('qq_admin_pin','2506'); localStorage.setItem('qq-admin-pin','2506'); } catch {} });
const page = await ctx.newPage();
await page.goto(`${BASE}/reveal-test`, { waitUntil: 'domcontentloaded' });
await sleep(1200);
await page.getByRole('button', { name: /^Schwarm$/ }).click();
await sleep(500);
// Reveal-Dramaturgie abwarten (beat 0->4, Sieger-Beat)
await sleep(8000);
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
