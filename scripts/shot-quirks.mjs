/**
 * shot-quirks.mjs — Cozy-Quirks-Set am echten Beamer knipsen (Lobby + Heute-
 * Spielen + Reveals). Nutzt ?set=cozyQuirks (Test-Harness-Param) + normalen
 * CozyQuiz-Lauf (kein Arena). Pro Phase wird das LETZTE Frame behalten (überschreibt),
 * damit die Lobby MIT Teams (nicht das leere Erst-Frame) gespeichert wird.
 *
 * NUTZUNG: node scripts/shot-quirks.mjs [--secs 80]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.QQ_BASE ?? 'http://localhost:5173';
const OUT = '.shots-quirks';
const STAGE = { width: 1760, height: 990 };
const SECS = Number((process.argv.find((a) => a.startsWith('--secs=')) ?? '--secs=80').split('=')[1]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const health = await fetch('http://localhost:4000/api/health').then((r) => r.json()).catch(() => null);
if (!health?.ok) { console.error('Backend nicht erreichbar (Port 4000).'); process.exit(1); }
console.log(`Backend ok (uptime ${Math.round(health.uptime)}s, db=${health.db})`);

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: STAGE, deviceScaleFactor: 1 });
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem('qq_admin_unlocked', '1');
    sessionStorage.setItem('qq_admin_pin', '2506');
    localStorage.setItem('qq-admin-pin', '2506');
  } catch {}
});

const beamer = await ctx.newPage();
beamer.on('pageerror', (e) => console.log('  [beamer PAGEERROR]', String(e).slice(0, 200)));
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });

const mod = await ctx.newPage();
mod.on('dialog', async (d) => { console.log(`  [mod DIALOG] ${d.message()}`); await d.dismiss(); });
await mod.goto(`${BASE}/moderator-test?run=1&set=cozyQuirks`, { waitUntil: 'domcontentloaded' });

const t0 = Date.now();
const counts = {};
console.log(`\nVerfolge Beamer ${SECS}s (überschreibe je Phase das letzte Frame) …`);
while ((Date.now() - t0) / 1000 < SECS) {
  const st = await beamer.evaluate(() => {
    const el = document.querySelector('[data-qq-phase]');
    if (!el) return null;
    // Team-Anzahl grob (für Lobby: erst knipsen wenn Teams da sind).
    return { phase: el.getAttribute('data-qq-phase') };
  }).catch(() => null);
  if (st?.phase) {
    counts[st.phase] = (counts[st.phase] ?? 0) + 1;
    // je Phase max ~6 Frames sichern (früh + spät), damit Lobby-mit-Teams dabei ist.
    const n = counts[st.phase];
    if (n <= 6) {
      await beamer.screenshot({ path: `${OUT}/${st.phase}-${n}.png` });
    }
  }
  await sleep(500);
}
console.log('\nPhasen:', Object.entries(counts).map(([k, v]) => `${k}:${v}`).join('  '));
console.log(`→ ${OUT}/`);
await browser.close();
