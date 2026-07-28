/**
 * shot-quirks-lobby.mjs — hält die LOBBY mit Cozy-Quirks-Set (kein Autostart)
 * und knipst sie stabil. Setzt ?set=cozyQuirks (Test-Param), füllt Bots per REST,
 * wartet, Screenshot vom echten /beamer.
 *
 * NUTZUNG: node scripts/shot-quirks-lobby.mjs [--set cozyQuirks]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.QQ_BASE ?? 'http://localhost:5173';
const API = 'http://localhost:4000/api';
const OUT = '.shots-quirks';
const STAGE = { width: 1760, height: 990 };
const SET = (process.argv.find((a) => a.startsWith('--set=')) ?? '--set=cozyQuirks').split('=')[1];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const health = await fetch(`${API}/health`).then((r) => r.json()).catch(() => null);
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
beamer.on('pageerror', (e) => console.log('  [beamer PAGEERROR]', String(e).slice(0, 160)));
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });

const mod = await ctx.newPage();
mod.on('dialog', async (d) => { console.log(`  [mod DIALOG] ${d.message()}`); await d.dismiss(); });
await mod.goto(`${BASE}/moderator-test?run=1&set=${SET}&hold=1`, { waitUntil: 'domcontentloaded' });
console.log('Mod-Seite offen (run+hold), warte auf Setup+Bots …');
await sleep(9000);
const phase = await beamer.evaluate(() => document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? 'none').catch(() => 'err');
console.log('Beamer-Phase:', phase);
await beamer.screenshot({ path: `${OUT}/LOBBY-hold.png` });
console.log(`✓ ${OUT}/LOBBY-hold.png`);
await browser.close();
