import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.env.QQ_BASE ?? 'http://localhost:5174';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('.shots-quirks', { recursive: true });
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { sessionStorage.setItem('qq_admin_unlocked','1'); sessionStorage.setItem('qq_admin_pin','2506'); localStorage.setItem('qq-admin-pin','2506'); } catch {} });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('[ERR]', String(e).slice(0,140)));
await p.goto(`${BASE}/reveal-test`, { waitUntil: 'domcontentloaded' });
await sleep(2000);
// Grid-Teams-Modus (nicht Arena) fuer klaren Einzel-Team-Look
try { await p.getByText('Grid · Teams').click({ timeout: 3000 }); } catch {}
await sleep(1500);
try { await p.getByText('▶ Reveal abspielen').click({ timeout: 3000 }); } catch {}
await sleep(7000);
await p.screenshot({ path: '.shots-quirks/REVEAL-schaetzchen.png' });
console.log('✓ .shots-quirks/REVEAL-schaetzchen.png');
await b.close();
