/**
 * bot-test-check.mjs — prüft Wolfs Bot-Test-Bug am ECHTEN Beamer.
 *
 * SZENARIO (Wolfs Alltag): /moderator-test?arena=1&mega=1&run=1 OHNE gecachten
 * Dev-PIN. Erwartet: das Format schaltet trotzdem auf CozyArena.
 *
 * MESSGRÖSSE ist bewusst `data-qq-mega` am echten /beamer (= largeGroupMode im
 * Server-State), NICHT die sichtbare Bot-Zahl. Die Bot-Zahl ist nur ein Indiz und
 * hat schon einmal in die Irre geführt: sie stammte aus einem VORHERIGEN Lauf
 * (Backend hält Räume im RAM) → Test war kontaminiert, Ergebnis bedeutete das
 * Gegenteil. Siehe Memory feedback_red_before_green.
 *
 * WICHTIG: vor JEDEM Lauf das Backend frisch starten, sonst überleben Räume:
 *   taskkill //PID <pid-auf-4000> //T //F   (ts-node-dev überlebt sonst!)
 *   cd backend && env -u MONGODB_URI npm run dev
 *   → in /api/health die `uptime` prüfen (muss klein sein).
 */
import { chromium } from 'playwright';

const BASE = process.env.QQ_BASE ?? 'http://localhost:5173';
const WITH_PIN = process.argv.includes('--with-pin');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const h = await fetch(`${BASE.replace('5173', '4000')}/api/health`).then((r) => r.json()).catch(() => null);
if (!h?.ok) { console.error('Backend nicht erreichbar.'); process.exit(1); }
if (h.uptime > 300) console.log(`⚠️  WARNUNG: Backend-Uptime ${Math.round(h.uptime)}s — evtl. Räume aus früheren Läufen im RAM! Frisch starten.`);
console.log(`Backend ok (uptime ${Math.round(h.uptime)}s, db=${h.db})`);

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1760, height: 990 } });
// ⚠️ ZWEI VERSCHIEDENE PINs — hier lag der Fehler beim ersten Anlauf (2026-07-17):
//   sessionStorage['qq_admin_pin']  → geht an qq:joinModerator. OHNE ihn joint der
//     Socket READ-ONLY und die Mod-Auth-Middleware (Security-Audit 2026-06-13)
//     blockt JEDES qq:-Event still. Das sieht aus wie „Arena schaltet nicht" —
//     ist aber nur ein unauthentifizierter Socket. Setzt sonst das PinGate.
//   localStorage['qq-admin-pin']    → nur fuer /dev/fillTeams (getDevPin).
// Wolf hat beide (er tippt den PIN ins PinGate). Wer nur `qq_admin_unlocked`
// setzt, simuliert NICHT Wolf, sondern baut sich einen eigenen Fehler.
await ctx.addInitScript(([withPin]) => {
  try {
    sessionStorage.setItem('qq_admin_unlocked', '1');
    sessionStorage.setItem('qq_admin_pin', '2506');   // = Wolfs PinGate-Zustand
    if (withPin) localStorage.setItem('qq-admin-pin', '2506');
    else localStorage.removeItem('qq-admin-pin'); // nur der DEV-PIN fehlt
  } catch {}
}, [WITH_PIN]);

const beamer = await ctx.newPage();
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });

const mod = await ctx.newPage();
mod.on('dialog', async (d) => { console.log(`  DIALOG: "${d.message()}"`); await d.dismiss(); });
await mod.goto(`${BASE}/moderator-test?arena=1&mega=1&run=1`, { waitUntil: 'domcontentloaded' });

await sleep(9000);

// Ursächliche Grösse: largeGroupMode, gelesen am ECHTEN Beamer.
const mega = await beamer.evaluate(() => document.querySelector('[data-qq-mega]')?.getAttribute('data-qq-mega') ?? '(kein Anker)');
const phase = await beamer.evaluate(() => document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? '?');
const teams = await mod.evaluate(() => (document.body.innerText.match(/TEAMS \((\d+)\)/) || [])[1] ?? '0');

console.log(`\nPIN gesetzt      : ${WITH_PIN ? 'ja' : 'NEIN (Wolfs Fall)'}`);
console.log(`Beamer-Phase     : ${phase}`);
console.log(`largeGroupMode   : ${mega}   ← die Messgrösse (1 = CozyArena, 0 = CozyQuiz)`);
console.log(`Teams (Indiz)    : ${teams}`);
console.log(`\nURTEIL: ${mega === '1' ? '✅ Arena aktiv' : '❌ KEIN Arena-Modus — Bug reproduziert'}`);

await beamer.screenshot({ path: `.shots/bot-test-${WITH_PIN ? 'withpin' : 'nopin'}.png` });
await b.close();
