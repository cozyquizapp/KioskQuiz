/**
 * beamer-lobby.mjs — Screenshots von der LOBBY.
 *
 * Warum es das gibt: `beamer-shot.mjs` und `beamer-phase.mjs` fahren beide den
 * Autoplay-Durchlauf, und der laesst die Lobby nach wenigen Sekunden hinter
 * sich. Was dabei im Kasten landet, ist ein Standbild aus der Willkommens-
 * Animation ("COZYQUI z", Buchstaben noch im Anflug) — nicht die Ansicht, die
 * das Publikum beim Reinkommen minutenlang sieht. Genau so ist die Lobby am
 * 2026-08-23 fast falsch beurteilt worden.
 *
 * Dieses Skript startet also KEINEN Durchlauf. Es fuellt nur Bots in den Raum
 * (`/dev/fillTeams`, derselbe Weg wie der Knopf im Steuerpult) und knipst die
 * Lobby danach an mehreren Zeitpunkten. Die Lobby rotiert naemlich zwischen
 * Willkommen, QR-Block und Team-Liste; ein einzelner Schuss zeigt einen Takt
 * und behauptet, das sei die Ansicht.
 *
 * NUTZUNG:
 *   QQ_CHROME=/opt/pw-browsers/chromium node scripts/beamer-lobby.mjs [--secs=90]
 *
 * Vorher Backend frisch starten UND `rm -f backend/.qq-rooms/*.json`
 * (siehe CLAUDE.md), sonst ist der Raum schon ueber die Lobby hinaus.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';

// socket.io-client liegt in den Unterprojekten, nicht im Wurzel-node_modules.
const req = createRequire(new URL('../backend/package.json', import.meta.url));
const { io } = req('socket.io-client');

const BASE = process.env.QQ_BASE ?? 'http://localhost:5173';
const API = 'http://localhost:4000';
const PIN = process.env.ADMIN_PIN || '2506';
const OUT = '.shots';
const SECS = Number((process.argv.find(a => a.startsWith('--secs=')) || '--secs=90').split('=')[1]);
const BOTS = Number((process.argv.find(a => a.startsWith('--bots=')) || '--bots=6').split('=')[1]);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const health = await fetch(`${API}/api/health`).then(r => r.json()).catch(() => null);
if (!health?.ok) { console.error('Backend nicht erreichbar auf 4000.'); process.exit(1); }
console.log(`Backend ok (uptime ${Math.round(health.uptime ?? 0)}s)`);

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
await sleep(2500);

const roomCode = await beamer.evaluate(() => {
  const el = document.querySelector('[data-qq-room]');
  return el?.getAttribute('data-qq-room') ?? 'default';
}).catch(() => 'default');
console.log(`Raum: ${roomCode}`);

// 2026-08-23: Reihenfolge zaehlt. `/dev/fillTeams` antwortet mit 404 „Raum
// nicht gefunden", solange nur der Beamer verbunden ist — den Raum legt erst
// der Moderator-Join an. Also erst joinen, dann fuellen.
const sock = io(API, { transports: ['websocket'] });
await new Promise((res, rej) => {
  sock.on('connect', res);
  sock.on('connect_error', rej);
  setTimeout(() => rej(new Error('Socket-Timeout')), 8000);
});
await new Promise(res => sock.emit('qq:joinModerator', { roomCode, pin: PIN }, res));
await sleep(800);

const r = await fetch(`${API}/api/qq/${encodeURIComponent(roomCode)}/dev/fillTeams`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ count: BOTS, pin: PIN }),
});
console.log(`fillTeams: ${r.status} ${r.ok ? 'ok' : await r.text()}`);
await sleep(1500);

// Ohne `setupDone` haengt der Beamer im Vor-Setup-Bild („Das Event wird
// vorbereitet") und die eigentliche Lobby mit QR-Block und Team-Liste bekommt
// man nie zu sehen. Beides ist Phase LOBBY, nur mit unterschiedlichen Flags —
// das ist Wolfs Unterscheidung „pre setup" vs. „wenn quizart gewaehlt".
if (!process.argv.includes('--presetup')) {
  await new Promise(res => sock.emit('qq:setSetupDone', { roomCode, value: true }, res));
  console.log('setupDone gesetzt (--presetup laesst den Vor-Setup-Screen stehen)');
}
await sleep(2000);

// Wie in beamer-phase.mjs ueber den sichtbaren TEXT entdoppeln: die
// Gluehwuermchen animieren, ueber die Bild-Pruefsumme waere jedes Bild neu.
const hashes = new Set();
let n = 0;
const until = Date.now() + SECS * 1000;
console.log(`\nKnipse ${SECS}s lang jeden neuen Takt der Lobby …`);
while (Date.now() < until) {
  const phase = await beamer.evaluate(() =>
    document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? null).catch(() => null);
  if (phase !== 'LOBBY') { await sleep(1000); continue; }
  const txt = await beamer.evaluate(() =>
    (document.querySelector('[data-qq-phase]')?.innerText ?? '')
      .replace(/\s+/g, ' ').trim().slice(0, 400)).catch(() => '');
  const h = crypto.createHash('md5').update(txt).digest('hex');
  if (!hashes.has(h)) {
    // Auslaufen lassen und danach pruefen, ob es noch derselbe Takt ist —
    // sonst knipst man mitten in die Willkommens-Animation.
    await sleep(2500);
    const txt2 = await beamer.evaluate(() =>
      (document.querySelector('[data-qq-phase]')?.innerText ?? '')
        .replace(/\s+/g, ' ').trim().slice(0, 400)).catch(() => '');
    if (txt2 !== txt) continue;
    const buf = await beamer.screenshot();
    hashes.add(h); n++;
    const name = `${OUT}/L${String(n).padStart(2, '0')}-LOBBY.png`;
    writeFileSync(name, buf);
    console.log(`  ✓ ${name}`);
    console.log(`      „${txt.slice(0, 110)}…"`);
  }
  await sleep(1200);
}

sock.close();
await browser.close();
console.log(`\nfertig, ${n} Takte → ${OUT}/`);
