/**
 * record-run.mjs — nimmt einen echten /beamer-Durchlauf als VIDEO auf, damit man
 * MOTION beurteilen kann (Standbilder koennen das nicht). Wolf 2026-07-17: die
 * Uebergaenge fuehlen sich „wie PowerPoint" an, weil jede neue Folie gleich reinkommt.
 *
 * Treibt die Phasen per Space in bekannten Abstaenden, damit die Uebergaenge zu
 * vorhersehbaren Video-Zeiten passieren (Log unten = Sekunde im Video).
 *
 * VORAUSSETZUNG: Backend (4000, frisch) + Frontend (5173) laufen.
 * NUTZUNG: node scripts/record-run.mjs   -> .shots/video/<...>.webm + Marken-Log
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('.shots/video', { recursive: true });

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({
  viewport: { width: 1760, height: 990 },
  deviceScaleFactor: 1,
  recordVideo: { dir: '.shots/video', size: { width: 1760, height: 990 } },
});
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem('qq_admin_unlocked', '1');
    sessionStorage.setItem('qq_admin_pin', '2506');
    localStorage.setItem('qq-admin-pin', '2506');
  } catch {}
});

const beamer = await ctx.newPage();
const vt0 = Date.now(); // Video startet ~jetzt (Kontext-Erstellung)
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });
const mod = await ctx.newPage();
mod.on('dialog', async (d) => { await d.dismiss(); });
await mod.goto(`${BASE}/moderator-test?arena=1&mega=1&run=1`, { waitUntil: 'domcontentloaded' });

await sleep(8000); // Bots + Start (Lobby)

const phase = () => beamer.evaluate(() => document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? '?');
const marks = [];
const mark = async (label) => {
  const sec = ((Date.now() - vt0) / 1000).toFixed(1);
  const p = await phase();
  marks.push(`  t=${sec}s  ${label}  (phase=${p})`);
};

await mark('vor 1. Advance (Lobby/Rules)');
// 14 Advances in 3s-Abstand: deckt Rules -> Intro -> Frage -> Reveal -> Placement
for (let i = 0; i < 14; i++) {
  await mod.keyboard.press('Space');
  await sleep(300);
  await mark(`Space #${i + 1}`);
  await sleep(2400);
}

await ctx.close(); // schreibt das Video
await b.close();
console.log('VIDEO: .shots/video/  (neueste .webm)');
console.log('MARKEN (Video-Sekunde -> Phase):');
console.log(marks.join('\n'));
