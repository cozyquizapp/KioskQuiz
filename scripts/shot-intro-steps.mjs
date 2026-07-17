/**
 * shot-intro-steps.mjs — echter /beamer PHASE_INTRO Step 0 (Übersicht) + Step 1
 * (Cluster-Zoom = bild 3). introStep schaltet per Moderator-Space hoch.
 * VORAUSSETZUNG: Backend (4000 FRISCH) + Frontend (5173).
 * NUTZUNG: node scripts/shot-intro-steps.mjs [label]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = 'http://localhost:5173';
const NAME = process.argv[2] ?? 'intro';
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
while (tries++ < 30) { if ((await phase()) === 'PHASE_INTRO') break; await mod.keyboard.press('Space'); await sleep(800); }
if ((await phase()) !== 'PHASE_INTRO') { console.error('PHASE_INTRO nicht erreicht'); await b.close(); process.exit(1); }

await sleep(2500);
await beamer.screenshot({ path: `.shots/${NAME}-step0.png` });
console.log(`✓ .shots/${NAME}-step0.png (Übersicht)`);

// eine Stufe weiter -> Step 1 (Cluster-Zoom)
await mod.keyboard.press('Space');
await sleep(2200); // Kamera-Zoom (1.4s transition) + settle
await beamer.screenshot({ path: `.shots/${NAME}-step1.png` });
console.log(`✓ .shots/${NAME}-step1.png (Cluster-Zoom = bild 3)`);

// Track-Linie messen: rechtes Ende der grauen Linie vs Icon-Cluster
const m = await beamer.evaluate(() => {
  const vpW = window.innerWidth;
  return { vpW };
});
console.log(`vp=${m.vpW}`);
await b.close();
