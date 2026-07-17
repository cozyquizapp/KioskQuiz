/**
 * record-wertung.mjs — filmt den Beat-A-Auftritt der Arena-Wertung (per-Frage-
 * Punkte, MegaQuestionRanking) auf dem echten /beamer. Wolf 2026-07-17 Motion-Pass:
 * Zeilen sollen sich aus der Tiefe SETZEN statt von links reinzurutschen (brRankIn).
 *
 * Spult per Space bis Phase PLACEMENT (dort mountet Beat A = Zeilen-Reveal) und
 * loggt die Video-Sekunde, in der PLACEMENT erscheint (dort sitzt der Auftritt).
 *
 * VORAUSSETZUNG: Backend (4000, FRISCH) + Frontend (5173) laufen.
 * NUTZUNG: node scripts/record-wertung.mjs [label]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const LABEL = process.argv[2] ?? 'wertung';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('.shots/video', { recursive: true });

const health = await fetch('http://localhost:4000/api/health').then((r) => r.json()).catch(() => null);
if (!health?.ok) { console.error('Backend aus.'); process.exit(1); }
console.log(`[${LABEL}] Backend uptime ${Math.round(health.uptime)}s (frisch = klein)`);

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
const vt0 = Date.now();
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });
const mod = await ctx.newPage();
mod.on('dialog', async (d) => { await d.dismiss(); });
await mod.goto(`${BASE}/moderator-test?arena=1&mega=1&run=1`, { waitUntil: 'domcontentloaded' });

await sleep(8000); // Bots + Start

const phase = () => beamer.evaluate(() => document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? '?');
const marks = [];
const mark = async (label) => {
  const sec = ((Date.now() - vt0) / 1000).toFixed(1);
  marks.push(`  t=${sec}s  ${label}  (phase=${await phase()})`);
};

// Space bis PLACEMENT (Beat A mountet dort). Marke setzen SOBALD PLACEMENT erscheint.
let tries = 0, hit = false;
while (tries++ < 40) {
  const p = await phase();
  if (p === 'PLACEMENT') { await mark('PLACEMENT erreicht (Beat A Zeilen treten auf)'); hit = true; break; }
  await mod.keyboard.press('Space');
  await sleep(850);
}
if (!hit) { console.error('PLACEMENT nicht erreicht'); await b.close(); process.exit(1); }
await sleep(4000); // volles Zeilen-Reveal auslaufen (8 Fraktionen x 0.32s Stagger)
await mark('Beat A ausgelaufen');

await ctx.close();
await b.close();
console.log(`[${LABEL}] VIDEO: .shots/video/ (neueste .webm)`);
console.log('MARKEN (Video-Sekunde -> Phase):');
console.log(marks.join('\n'));
