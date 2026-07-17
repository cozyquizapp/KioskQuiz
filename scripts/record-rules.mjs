/**
 * record-rules.mjs — filmt gezielt die REGEL-Karten-Uebergaenge des echten /beamer,
 * damit man Vorher/Nachher des Auftritts (Karte kommt rein) beurteilen kann.
 * Wolf 2026-07-17: Regel-Wechsel fuehlt sich „wie PowerPoint" an.
 *
 * Faehrt bis Phase RULES, macht dann N Space-Advances in festem Abstand und loggt
 * die Video-Sekunde jedes Advances (dort sitzt der Karten-Auftritt).
 *
 * VORAUSSETZUNG: Backend (4000, FRISCH) + Frontend (5173) laufen.
 * NUTZUNG: node scripts/record-rules.mjs [label]  -> .shots/video/<...>.webm + Marken
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const LABEL = process.argv[2] ?? 'rules';
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

await sleep(8000); // Bots + Start (Lobby)

const phase = () => beamer.evaluate(() => document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? '?');
const marks = [];
const mark = async (label) => {
  const sec = ((Date.now() - vt0) / 1000).toFixed(1);
  const p = await phase();
  marks.push(`  t=${sec}s  ${label}  (phase=${p})`);
};

// Bis RULES vorspulen (Space auf Mod-Seite)
let tries = 0;
while (tries++ < 20) {
  if ((await phase()) === 'RULES') break;
  await mod.keyboard.press('Space');
  await sleep(1000);
}
await sleep(1500);
await mark('RULES erreicht (Slide 1 steht)');

// 5 Regel-Advances in festem Abstand — jeder Advance = Karten-Auftritt
for (let i = 0; i < 5; i++) {
  await mod.keyboard.press('Space');
  await sleep(120);
  await mark(`Space #${i + 1} (Karte tritt auf)`);
  await sleep(2600);
}

await ctx.close();
await b.close();
console.log(`[${LABEL}] VIDEO: .shots/video/ (neueste .webm)`);
console.log('MARKEN (Video-Sekunde -> Phase):');
console.log(marks.join('\n'));
