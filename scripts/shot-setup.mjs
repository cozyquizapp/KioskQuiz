import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = 'http://localhost:5173';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const ARENA = process.argv[2] !== 'normal';
const tag = ARENA ? 'arena' : 'normal';
mkdirSync('.shots', { recursive: true });
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1512, height: 950 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { sessionStorage.setItem('qq_admin_unlocked', '1'); sessionStorage.setItem('qq_admin_pin', '2506'); localStorage.setItem('qq-admin-pin', '2506'); } catch {} });
const page = await ctx.newPage();
page.on('dialog', async d => { console.log('DIALOG:', d.message().slice(0, 70)); await d.accept().catch(() => {}); });
// no run=1 -> bleibt im Setup (Lobby/Cockpit)
const url = ARENA ? `${BASE}/moderator-test?arena=1` : `${BASE}/moderator-test`;
await page.goto(url, { waitUntil: 'domcontentloaded' });
await sleep(6000);
await page.screenshot({ path: `.shots/setup-${tag}-1-cockpit.png`, fullPage: true });
// Einstellungen oeffnen
try {
  const btn = page.getByRole('button', { name: /Einstellungen/ }).first();
  if (await btn.isVisible()) { await btn.click(); console.log('clicked Einstellungen'); }
} catch (e) { console.log('no Einstellungen btn', e.message); }
await sleep(2500);
await page.screenshot({ path: `.shots/setup-${tag}-2-panel.png`, fullPage: true });
// Zurueck
try {
  const back = page.getByRole('button', { name: /Zurück/ }).first();
  if (await back.isVisible()) { await back.click(); console.log('clicked Zurück'); }
} catch (e) { console.log('no back', e.message); }
await sleep(2000);
await page.screenshot({ path: `.shots/setup-${tag}-3-back.png`, fullPage: true });
console.log('done');
await b.close();
