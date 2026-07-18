/** repro-staleroom.mjs — Hypothese: geteilter Raum laeuft im RAM weiter.
 * 1) /moderator-test?run=1 startet Quiz (Bots) bis > LOBBY.
 * 2) Neuer plain /moderator-test Tab -> zeigt er das laufende Quiz? */
import { chromium } from 'playwright';
const BASE = 'http://localhost:5173';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1760, height: 990 } });
await ctx.addInitScript(() => { try { sessionStorage.setItem('qq_admin_unlocked','1'); sessionStorage.setItem('qq_admin_pin','2506'); localStorage.setItem('qq-admin-pin','2506'); } catch {} });
const beamer = await ctx.newPage();
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });
const phase = () => beamer.evaluate(() => document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? 'NONE');

const run = await ctx.newPage();
run.on('dialog', async (d) => { await d.dismiss(); });
await run.goto(`${BASE}/moderator-test?arena=1&mega=1&run=1`, { waitUntil: 'domcontentloaded' });
process.stdout.write('starte Quiz via run=1 ...');
for (let i = 0; i < 20; i++) { await sleep(1000); const p = await phase(); if (p !== 'LOBBY' && p !== 'NONE') { console.log(' -> Phase', p, 'nach', i+1, 's'); break; } }
const running = await phase();
console.log('Quiz-Phase jetzt:', running);

// Realistisch: Vorgaenger-Session schliessen (Wolf hat den run-Tab zu, nur der
// RAM-Raum am Backend bleibt mid-Quiz). Beamer bleibt als passiver Phase-Leser.
await run.close();
await sleep(500);
console.log('run=1-Tab geschlossen. Raum-Phase bleibt:', await phase());

// Zweiter, plain Tab (wie Wolf ihn "neu oeffnet")
const plain = await ctx.newPage();
plain.on('console', (m) => { const t = m.text(); if (t.includes('[test-reset]')) console.log('  PLAIN-CONSOLE:', t); });
plain.on('dialog', async (d) => { await d.dismiss(); });
await plain.goto(`${BASE}/moderator-test`, { waitUntil: 'domcontentloaded' });
for (let i = 1; i <= 7; i++) { await sleep(1000); process.stdout.write(` ${i}s:${await phase()}`); }
console.log('');
const seenByPlain = await phase();
console.log('Plain-Tab sieht Phase:', seenByPlain);
console.log((seenByPlain !== 'LOBBY' && seenByPlain !== 'NONE')
  ? 'BUG REPRODUZIERT: plain /moderator-test landet direkt im laufenden Quiz (' + seenByPlain + ').'
  : 'nicht reproduziert (Phase ' + seenByPlain + ').');
await b.close();
