/**
 * record-beamer-team.mjs — nimmt /beamer UND /team GLEICHZEITIG als Video auf.
 *
 * Zweck (Wolf 2026-08-18: „/team und /beamer auf Hochglanz"): Motion laesst sich
 * an Standbildern nicht beurteilen. Dieses Script liefert zwei Videos derselben
 * Session, damit Buehne und Handy nebeneinander bewertet werden koennen — nicht
 * nur die Buehne wie in record-run.mjs.
 *
 * Team joint per localStorage-Auto-Rejoin in der Lobby (Muster aus
 * e2e-beamer-team.mjs), danach treibt moderator-test?run=1 den Ablauf.
 *
 * VORAUSSETZUNG: Backend (4000, frisch) + Frontend (5173) laufen.
 * NUTZUNG: node scripts/record-beamer-team.mjs [--arena] [--steps=16] [--gap=2400]
 *   -> .shots/video/beamer/<...>.webm + .shots/video/team/<...>.webm + Marken-Log
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const ARENA = process.argv.includes('--arena');
const arg = (name, def) => Number((process.argv.find((a) => a.startsWith(`--${name}=`)) ?? `--${name}=${def}`).split('=')[1]);
const STEPS = arg('steps', 16);
const GAP = arg('gap', 2400);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const health = await fetch('http://localhost:4000/api/health').then((r) => r.json()).catch(() => null);
if (!health?.ok) { console.error('Backend nicht erreichbar (4000).'); process.exit(1); }
if (health.uptime > 900) console.log('⚠️  Backend-Uptime hoch — Raum evtl. aus altem Lauf. Frisch starten!');

mkdirSync('.shots/video/beamer', { recursive: true });
mkdirSync('.shots/video/team', { recursive: true });

// PW_CHROMIUM erlaubt ein vorinstalliertes Chromium (CI-/Container-Umgebungen,
// in denen `playwright install` nicht laufen soll).
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
});

// Buehne: exakt die Beamer-Groesse.
const ctxMain = await browser.newContext({
  viewport: { width: 1760, height: 990 },
  deviceScaleFactor: 1,
  recordVideo: { dir: '.shots/video/beamer', size: { width: 1760, height: 990 } },
});
await ctxMain.addInitScript(() => {
  try {
    sessionStorage.setItem('qq_admin_unlocked', '1');
    sessionStorage.setItem('qq_admin_pin', '2506');
    localStorage.setItem('qq-admin-pin', '2506');
  } catch {}
});

// Handy: echtes Mobil-Viewport + vorbelegte Team-Session fuer den Auto-Rejoin.
const ctxTeam = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  recordVideo: { dir: '.shots/video/team', size: { width: 390, height: 844 } },
});
await ctxTeam.addInitScript(() => {
  try {
    localStorage.setItem('qq_teamName', 'Testtrupp');
    localStorage.setItem('qq_avatarId', 'fox');
    localStorage.setItem('qq_emoji', '🦊');
  } catch {}
});

const vt0 = Date.now(); // beide Videos starten ~mit der Kontext-Erstellung
const errors = [];
const beamer = await ctxMain.newPage();
beamer.on('pageerror', (e) => errors.push('[beamer] ' + String(e).slice(0, 160)));
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });

const team = await ctxTeam.newPage();
team.on('pageerror', (e) => errors.push('[team] ' + String(e).slice(0, 160)));
team.on('dialog', async (d) => { await d.dismiss(); });
await team.goto(`${BASE}/team`, { waitUntil: 'domcontentloaded' });
await sleep(6000); // Auto-Rejoin in der Lobby, VOR dem Spielstart

const mod = await ctxMain.newPage();
mod.on('pageerror', (e) => errors.push('[mod] ' + String(e).slice(0, 160)));
mod.on('dialog', async (d) => { await d.dismiss(); });
await mod.goto(`${BASE}/moderator-test?run=1${ARENA ? '&arena=1&mega=1' : ''}`, { waitUntil: 'domcontentloaded' });
await sleep(6000);

// Rejoin-/Join-Prompt wegklicken, damit die ECHTE Spielansicht rendert.
for (let i = 0; i < 3; i++) {
  try {
    const btn = team.locator('button', { hasText: /Wieder einsteigen|Spiel beitreten|Rejoin|Join game|einsteigen/i }).first();
    if (await btn.count()) { await btn.click({ timeout: 2000 }); await sleep(2500); } else break;
  } catch { break; }
}
const joined = await team.evaluate(() => !/Spiel beitreten|Join game|Wähle deinen Avatar|Choose your avatar/.test(document.body.innerText || ''));
console.log('Team-Join:', joined ? 'gejoint' : '⚠️ NOCH IM SETUP');

const phase = () => beamer.evaluate(() => document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? '?');
const marks = [];
const mark = async (label) => {
  marks.push(`  t=${((Date.now() - vt0) / 1000).toFixed(1)}s  ${label}  (phase=${await phase()})`);
};

// Buehne fokussieren ist NICHT noetig: Space geht an die Moderator-Seite.
await mark('Start');
for (let i = 0; i < STEPS; i++) {
  await mod.keyboard.press('Space');
  await sleep(300);
  await mark(`Space #${i + 1}`);
  await sleep(GAP);
}

const beamerVideo = await beamer.video()?.path();
const teamVideo = await team.video()?.path();
await ctxMain.close();
await ctxTeam.close();
await browser.close();

console.log('\nVIDEO Buehne:', beamerVideo);
console.log('VIDEO Handy :', teamVideo);
console.log('\nMARKEN (Video-Sekunde -> Phase):');
console.log(marks.join('\n'));
if (errors.length) console.log('\n⚠️ Pageerrors:\n' + errors.join('\n'));
