/**
 * beamer-welcome.mjs — Screenshots der Willkommens-Einblendung.
 *
 * Warum eigens dafuer (2026-08-23): die Folie ist ein OVERLAY (BeamerOverlay,
 * zIndex 9990) und liegt damit AUSSERHALB des Phase-Roots. Die vorhandenen
 * Harnesses lesen `[data-qq-phase]`, sehen sie also gar nicht — im
 * Regel-Durchgang war der erste Schuss immer schon die erste Regelseite.
 *
 * Dazu ist sie das laengste Stueck Choreographie im Code (Untertitel-Kaskade,
 * Goldlinie, Lichtblitz, Titel Buchstabe fuer Buchstabe, Shimmer, Wolf-Auftritt
 * — zusammen etwa 4,4 s). Ein einzelner Schuss trifft davon irgendeinen Takt
 * und sagt nichts. Deshalb knipst dieses Skript eine SERIE ueber die ganze
 * Choreographie und haengt einen Schuss an, wenn alles ausgelaufen ist.
 *
 * NUTZUNG:
 *   QQ_CHROME=/opt/pw-browsers/chromium node scripts/beamer-welcome.mjs
 *
 * Vorher Backend frisch starten UND `rm -f backend/.qq-rooms/*.json`.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.QQ_BASE ?? 'http://localhost:5173';
const API = 'http://localhost:4000';
const PIN = process.env.ADMIN_PIN || '2506';
const OUT = '.shots';
// Zeitpunkte in ms nach dem ersten Erscheinen. Die ersten fuenf liegen auf den
// Takten aus der Choreographie-Doku in QQBeamerPage, der letzte deutlich
// danach = das Standbild, das im Raum wirklich stehen bleibt.
const TAKTE = [400, 1200, 1700, 2600, 3600, 5200, 7000];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const health = await fetch(`${API}/api/health`).then(r => r.json()).catch(() => null);
if (!health?.ok) { console.error('Backend nicht erreichbar auf 4000.'); process.exit(1); }
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ['--no-sandbox'],
  ...(process.env.QQ_CHROME ? { executablePath: process.env.QQ_CHROME } : {}),
});
const ctx = await browser.newContext({ viewport: { width: 1760, height: 990 }, deviceScaleFactor: 1 });
await ctx.addInitScript(({ pin }) => {
  try {
    sessionStorage.setItem('qq_admin_unlocked', '1');
    sessionStorage.setItem('qq_admin_pin', pin);
    localStorage.setItem('qq-admin-pin', pin);
  } catch { /* ignore */ }
}, { pin: PIN });

const beamer = await ctx.newPage();
beamer.on('pageerror', e => console.log('  [beamer PAGEERROR]', String(e).slice(0, 200)));
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });

const mod = await ctx.newPage();
mod.on('dialog', async d => { await d.dismiss(); });
await mod.goto(`${BASE}/moderator-test?run=1`, { waitUntil: 'domcontentloaded' });

// Auf das Overlay warten. Erkennung ueber den sichtbaren Text der GANZEN
// Seite, nicht ueber den Phase-Root — das Overlay liegt daneben.
const sichtbar = () => beamer.evaluate(() =>
  /HERZLICH WILLKOMMEN|A WARM WELCOME|WELCOME TO THE|WILLKOMMEN IN DER/i
    .test(document.body.innerText || '')).catch(() => false);

console.log('Warte auf die Willkommens-Einblendung …');
const bis = Date.now() + 120000;
while (Date.now() < bis && !(await sichtbar())) await sleep(250);
if (Date.now() >= bis) {
  console.error('Nicht erschienen. Lief der Raum schon ueber RULES hinaus?');
  await browser.close(); process.exit(1);
}

const t0 = Date.now();
console.log('Da. Knipse die Choreographie …');
for (const ms of TAKTE) {
  const warten = t0 + ms - Date.now();
  if (warten > 0) await sleep(warten);
  const name = `${OUT}/W${String(ms).padStart(5, '0')}ms-WELCOME.png`;
  writeFileSync(name, await beamer.screenshot());
  console.log(`  ✓ ${name}`);
}

await browser.close();
console.log(`\nfertig, ${TAKTE.length} Takte → ${OUT}/`);
