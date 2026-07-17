/**
 * measure-tree.mjs — misst am ECHTEN /beamer, ob der Progress-Tree im Round-Intro
 * (bild 1) horizontal mittig zur Viewport-Mitte sitzt. Statt aus Screenshots zu
 * raten (Wolf: schon mehrfach angefasst) → exakte getBoundingClientRect-Messung.
 *
 * VORAUSSETZUNG: Backend (4000, FRISCH) + Frontend (5173).
 * NUTZUNG: node scripts/measure-tree.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('.shots', { recursive: true });

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1760, height: 990 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem('qq_admin_unlocked', '1');
    sessionStorage.setItem('qq_admin_pin', '2506');
    localStorage.setItem('qq-admin-pin', '2506');
  } catch {}
});

const beamer = await ctx.newPage();
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });
const mod = await ctx.newPage();
mod.on('dialog', async (d) => { await d.dismiss(); });
await mod.goto(`${BASE}/moderator-test?arena=1&mega=1&run=1`, { waitUntil: 'domcontentloaded' });
await sleep(8000);

const phase = () => beamer.evaluate(() => document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? '?');

// bis PHASE_INTRO
let tries = 0;
while (tries++ < 40) {
  if ((await phase()) === 'PHASE_INTRO') break;
  await mod.keyboard.press('Space');
  await sleep(850);
}
if ((await phase()) !== 'PHASE_INTRO') { console.error('PHASE_INTRO nicht erreicht'); await b.close(); process.exit(1); }
console.log('PHASE_INTRO erreicht — messe Tree ueber die ersten ~3s (Step 0 -> Zoom):');

const measure = () => beamer.evaluate(() => {
  const vpW = window.innerWidth, vpH = window.innerHeight;
  const els = Array.from(document.querySelectorAll('[data-qq-tree]'));
  const stage = document.querySelector('[data-qq-phase]');
  const stageRect = stage ? stage.getBoundingClientRect() : null;
  return {
    vpW, vpH,
    stage: stageRect ? { l: Math.round(stageRect.left), w: Math.round(stageRect.width), midX: Math.round(stageRect.left + stageRect.width / 2) } : null,
    trees: els.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        variant: el.getAttribute('data-qq-tree'),
        totalWidth: el.getAttribute('data-qq-tree-totalwidth'),
        left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width),
        midX: Math.round(r.left + r.width / 2),
      };
    }),
  };
});

let shot = false;
for (let i = 0; i < 20; i++) {
  const m = await measure();
  const vpMid = Math.round(m.vpW / 2);
  const line = m.trees.map((t) => `  tree[${t.variant} tw=${t.totalWidth}] midX=${t.midX} (l=${t.left} r=${t.right} w=${t.width}) vs vpMid=${vpMid} -> DELTA ${t.midX - vpMid}px`).join('\n');
  console.log(`t+${(i * 0.15).toFixed(2)}s  vp=${m.vpW}x${m.vpH} stageMidX=${m.stage?.midX}\n${line || '  (kein [data-qq-tree] sichtbar)'}`);
  if (!shot && m.trees.length > 0) { await beamer.screenshot({ path: '.shots/measure-phaseintro.png' }); shot = true; console.log('  -> Screenshot .shots/measure-phaseintro.png'); }
  await sleep(150);
}

await b.close();
