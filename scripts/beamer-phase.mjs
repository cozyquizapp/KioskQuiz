/**
 * beamer-phase.mjs — Screenshots von den SPAETEN Phasen des Abends.
 *
 * Warum es das gibt: `beamer-shot.mjs` faehrt einen normalen Durchlauf und
 * kommt damit nur bis zum Setzen. Pause, Danke, Siegerehrung und die
 * Final-Aufloesung erreicht es nie — die haengen an Moderator-Aktionen, die
 * in einem Testlauf niemand ausloest. Diese vier Folien waren deshalb bis
 * 2026-08-22 noch nie im Bild geprueft worden, und blind umgestalten ist
 * genau die Falle, in die man dabei laeuft.
 *
 * Das Skript oeffnet einen eigenen Moderator-Socket (PIN wie im Steuerpult),
 * faehrt das Spiel bis zu einem sinnvollen Punkt und schickt dann gezielt das
 * Ereignis, das die gewuenschte Phase ausloest.
 *
 * NUTZUNG:
 *   node scripts/beamer-phase.mjs [--secs=200] [pause] [thanks] [gameover]
 *   ohne Phasen-Argument: alle drei nacheinander
 *
 * Vorher Backend frisch starten UND `rm -f backend/.qq-rooms/*.json`, sonst
 * laeuft man gegen einen halb benutzten Raum (siehe CLAUDE.md).
 */
import { chromium } from 'playwright';
import { createRequire } from 'node:module';

// socket.io-client liegt in den Unterprojekten, nicht im Wurzel-node_modules.
// Von hier aus (scripts/) waere ein blankes `import` nicht aufloesbar, deshalb
// der Umweg ueber die package.json des Backends.
const req = createRequire(new URL('../backend/package.json', import.meta.url));
const { io } = req('socket.io-client');

const BASE = 'http://localhost:5173';
const API = 'http://localhost:4000';
const PIN = process.env.ADMIN_PIN || '2506';
const OUT = '.shots';
const SECS = Number((process.argv.find(a => a.startsWith('--secs=')) || '').split('=')[1] || 200);
const WANTED = process.argv.slice(2).filter(a => !a.startsWith('--'));
const PHASES = WANTED.length ? WANTED : ['pause', 'gameover', 'thanks'];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const health = await fetch(`${API}/api/health`).then(r => r.json()).catch(() => null);
if (!health) { console.error('Backend nicht erreichbar auf 4000.'); process.exit(1); }
console.log(`Backend ok (uptime ${Math.round(health.uptime ?? 0)}s)`);

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

// Raumcode vom Beamer holen — er steht als Attribut am Phase-Root.
const roomCode = await beamer.evaluate(() => {
  const el = document.querySelector('[data-qq-room]');
  return el?.getAttribute('data-qq-room') ?? 'default';
}).catch(() => 'default');
console.log(`Raum: ${roomCode}`);

// Eigener Moderator-Socket. Ohne qq:joinModerator mit PIN blockt die
// Auth-Middleware jedes Mod-Event still weg.
const sock = io(API, { transports: ['websocket'] });
await new Promise((res, rej) => {
  sock.on('connect', res);
  sock.on('connect_error', rej);
  setTimeout(() => rej(new Error('Socket-Timeout')), 8000);
});
await new Promise(res => sock.emit('qq:joinModerator', { roomCode, pin: PIN }, res));
console.log('Moderator-Socket verbunden');

// 2026-08-22: Fragedauer runterdrehen. Um die Siegerehrung zu sehen, muss das
// Spiel wirklich zu Ende gespielt werden — es gibt keine Abkuerzung dorthin.
// Mit den echten 26 s pro Frage sind 15 Fragen plus Aufloesungen plus
// Runden-Intros ueber zehn Minuten, und drei Anlaeufe sind daran gescheitert.
// `qq:setTimer` ist ein regulaeres Moderator-Ereignis (im Steuerpult stellt
// Wolf damit die Dauer). Auf wenige Sekunden gesetzt laeuft derselbe Ablauf
// in einem Bruchteil der Zeit, ohne dass am Spiel etwas anderes ist.
const FAST = Number(process.env.QQ_TIMER_SEC || 4);
await new Promise(res => sock.emit('qq:setTimer', { roomCode, durationSec: FAST }, res));
console.log(`Fragedauer auf ${FAST}s gesetzt (sonst dauert ein Durchlauf 10+ Minuten)`);

async function phaseNow() {
  return beamer.evaluate(() => document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? null).catch(() => null);
}

async function shoot(name) {
  await sleep(4000);   // Auftritts-Animationen voll auslaufen lassen
  await beamer.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  ✓ ${name}.png  (Phase ${await phaseNow()})`);
}

// Erst ein Stueck normal spielen, damit es Teams, Felder und Punkte gibt —
// eine leere Siegerehrung sagt ueber das Design nichts aus.
console.log(`\nSpiele ${SECS}s normal, damit die Folien echten Inhalt haben …`);
const t0 = Date.now();
while ((Date.now() - t0) / 1000 < SECS) {
  const p = await phaseNow();
  if (p === 'PLACEMENT' || p === 'QUESTION_REVEAL') break;
  await sleep(900);
}
await sleep(8000);

/**
 * 2026-08-22, zweiter Anlauf. Der erste Entwurf steuerte EINE Phase an und
 * wartete darauf. Das war falsch herum gedacht: ein Durchlauf kommt sowieso
 * an allen Folien vorbei, und gezielt anzusteuern kostet pro Folie einen
 * eigenen Lauf von mehreren Minuten. Jetzt wird EINMAL durchgespielt und
 * dabei jede Phase geknipst, die noch nicht im Kasten ist — Ernte statt Jagd.
 *
 * Der Pause-Bildschirm ist der Sonderfall: den erreicht kein Durchlauf von
 * selbst, er wird am Ende gezielt ausgeloest.
 */
const seen = new Set();
const t1 = Date.now();
const RUN_MS = Number(process.env.QQ_RUN_MS || 480000);
console.log(`\nErnte ${Math.round(RUN_MS / 1000)}s lang jede neue Phase …`);
while (Date.now() - t1 < RUN_MS) {
  const p = await phaseNow();
  if (p && !seen.has(p)) {
    seen.add(p);
    await shoot(`E${String(seen.size).padStart(2, '0')}-${p}`);
  }
  await sleep(800);
}

// Pause zuletzt: sie haelt das Spiel an, danach waere nichts mehr zu ernten.
if (PHASES.includes('pause')) {
  sock.emit('qq:pause', { roomCode });
  await shoot('E99-PAUSED');
}

sock.close();
await browser.close();
console.log(`\nfertig, ${seen.size} Phasen → ${OUT}/`);
console.log(`  ${[...seen].join(', ')}`);
