/**
 * shot-placement.mjs — schneller Vorher/Nachher-Shot NUR des Gesamtstands.
 * ECHTER /beamer (kein Nachbau), aber per Space-Taste zum PLACEMENT vorgespult,
 * statt Minuten auf Autoplay-Timer zu warten. Fuer die Design-Schleife.
 *
 * VORAUSSETZUNG: Backend (4000, ohne MONGODB_URI) + Frontend (5173) laufen,
 * Raum frisch (rm -f backend/.qq-rooms/default.json vor dem Backend-Start).
 *
 * NUTZUNG: node scripts/shot-placement.mjs <name>
 *   erzeugt .shots/<name>-wertung.png und .shots/<name>-gesamtstand.png
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const NAME = process.argv[2] ?? 'placement';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('.shots', { recursive: true });

const health = await fetch('http://localhost:4000/api/health').then((r) => r.json()).catch(() => null);
if (!health?.ok) { console.error('Backend aus.'); process.exit(1); }
console.log(`Backend uptime ${Math.round(health.uptime)}s (frisch = klein)`);

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
await sleep(8000); // Bots + Start

const phase = () => beamer.evaluate(() => {
  const el = document.querySelector('[data-qq-phase]');
  return el ? { p: el.getAttribute('data-qq-phase'), s: el.getAttribute('data-qq-standings-revealed') } : null;
});

// Space auf der Mod-Seite spammen, bis der Beamer PLACEMENT zeigt.
let tries = 0;
while (tries++ < 60) {
  const st = await phase();
  if (st?.p === 'PLACEMENT') break;
  await mod.keyboard.press('Space');
  await sleep(900);
}
let st = await phase();
if (st?.p !== 'PLACEMENT') { console.error('PLACEMENT nicht erreicht (Phase=' + st?.p + ')'); await b.close(); process.exit(1); }

// Beat A: Wertung (standings-revealed = 0)
await sleep(4500); // Zeilen-Stagger auslaufen
await beamer.screenshot({ path: `.shots/${NAME}-wertung.png` });
console.log(`✓ .shots/${NAME}-wertung.png`);

// Ein Space weiter → Beat B: Gesamtstand (standings-revealed = 1)
for (let i = 0; i < 8; i++) {
  st = await phase();
  if (st?.s === '1') break;
  await mod.keyboard.press('Space');
  await sleep(900);
}
await sleep(4500);
await beamer.screenshot({ path: `.shots/${NAME}-gesamtstand.png` });
console.log(`✓ .shots/${NAME}-gesamtstand.png`);

await b.close();
