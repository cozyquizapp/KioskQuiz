/**
 * beamer-view.mjs — direkt zu einer Ansicht springen und sie knipsen.
 *
 * WARUM (Wolf 2026-08-23: „du musst diese aufnahme optimieren, die kostet zeit
 * und kontingent"): berechtigt. Die bisherigen Harnesses spielen den ABEND
 * nach und warten, bis die gewuenschte Folie vorbeikommt. Fuer die Lobby waren
 * das 40 s, fuer die Regeln zwei Minuten, fuer die Siegerehrung frueher ueber
 * zehn. Bei zwanzig Ansichten im Durchgang ist das die Hauptkostenstelle, und
 * es ist reine Wartezeit.
 *
 * Der Denkfehler war, den Autoplay als Antrieb zu benutzen. Der Autoplay lebt
 * im MODERATOR-Frontend, nicht im Server: wer die Moderatorseite gar nicht
 * oeffnet, bei dem laeuft nichts von selbst weiter. Der Server dagegen nimmt
 * jedes Ereignis einzeln entgegen. Also: Spiel einmal starten, dann gezielt
 * genau die Ereignisse schicken, die zur gewuenschten Ansicht fuehren, und
 * sofort knipsen. Kein Warten, kein Zufall, reproduzierbar.
 *
 * Ein Browser und ein Raum bedienen dabei beliebig viele Ansichten
 * hintereinander — der teuerste Teil (Browser starten, Spiel aufsetzen) faellt
 * einmal an statt pro Bild.
 *
 * NUTZUNG:
 *   node scripts/beamer-view.mjs willkommen regeln teams brett
 *   node scripts/beamer-view.mjs --liste
 *
 * Voraussetzung wie immer: Backend frisch, `rm -f backend/.qq-rooms/*.json`.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const req = createRequire(new URL('../backend/package.json', import.meta.url));
const { io } = req('socket.io-client');

const BASE = process.env.QQ_BASE ?? 'http://localhost:5173';
const API = 'http://localhost:4000';
const PIN = process.env.ADMIN_PIN || '2506';
const OUT = '.shots';
const BOTS = Number((process.argv.find(a => a.startsWith('--bots=')) || '--bots=8').split('=')[1]);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Die Ansichten. `weg` bekommt einen Helfer und schickt die Ereignisse, die
 * zur Ansicht fuehren. `ruhe` ist die Zeit, die die Auftritts-Bewegung danach
 * noch braucht — bewusst pro Ansicht, weil sie sehr verschieden lang sind
 * (Willkommen hat 4,4 s Choreographie, ein Regelblatt 0,6 s).
 */
const ANSICHTEN = {
  vorsetup:   { ruhe: 1500, aufbau: 'roh',   weg: async () => {} },
  lobby:      { ruhe: 2500, aufbau: 'lobby', weg: async () => {} },
  willkommen: { ruhe: 5200, aufbau: 'spiel', weg: async (h) => { await h.zuRegelIndex(-2); } },
  regelintro: { ruhe: 1200, aufbau: 'spiel', weg: async (h) => { await h.zuRegelIndex(-1); } },
  regeln:     { ruhe: 1200, aufbau: 'spiel', weg: async (h) => { await h.zuRegelIndex(0); } },
  teams:      { ruhe: 3500, aufbau: 'spiel', weg: async (h) => { await h.emit('qq:rulesFinish'); } },
};

if (process.argv.includes('--liste')) {
  console.log('Ansichten:', Object.keys(ANSICHTEN).join(', '));
  process.exit(0);
}
const wunsch = process.argv.slice(2).filter(a => !a.startsWith('--'));
const liste = wunsch.length ? wunsch : ['willkommen'];
for (const n of liste) if (!ANSICHTEN[n]) { console.error(`Unbekannt: ${n}`); process.exit(1); }

const health = await fetch(`${API}/api/health`).then(r => r.json()).catch(() => null);
if (!health?.ok) { console.error('Backend nicht erreichbar auf 4000.'); process.exit(1); }
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  // 2026-08-23: `--disable-gpu-compositing` ist noetig, seit auf der
  // Willkommen-Folie ein Video laeuft. Ohne den Schalter liegt das Video in
  // einer eigenen, hardwarebeschleunigten Ebene; `page.screenshot()` bekommt
  // davon immer nur das ERSTE Bild zu sehen, waehrend `currentTime` munter
  // weiterlaeuft. Gemessen: der Wolf-Bereich aenderte sich ueber fuenf
  // Aufnahmen um 0,09 bis 0,20 %, obwohl das Video bei 3,3 s stand.
  args: ['--no-sandbox', '--disable-gpu-compositing'],
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
beamer.on('pageerror', e => console.log('  [beamer PAGEERROR]', String(e).slice(0, 160)));
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });
await sleep(2000);

const roomCode = await beamer.evaluate(() =>
  document.querySelector('[data-qq-room]')?.getAttribute('data-qq-room') ?? 'default').catch(() => 'default');

const sock = io(API, { transports: ['websocket'] });
await new Promise((res, rej) => {
  sock.on('connect', res); sock.on('connect_error', rej);
  setTimeout(() => rej(new Error('Socket-Timeout')), 8000);
});
const emit = (ev, extra = {}) =>
  new Promise(res => sock.emit(ev, { roomCode, ...extra }, res));
await emit('qq:joinModerator', { pin: PIN });
console.log(`Raum ${roomCode} verbunden`);

const phase = () => beamer.evaluate(() =>
  document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? null).catch(() => null);

/** Regel-Index anfahren. Der Server kennt nur weiter/zurueck, also zaehlen wir
 *  von einem bekannten Ende aus: `rulesFinish` setzt auf 0, davor liegen -1
 *  (Regel-Intro) und -2 (Willkommen). */
const helfer = {
  emit,
  async zuRegelIndex(ziel) {
    // Vom Spielstart aus steht der Index auf -2. Von dort nur vorwaerts.
    const schritte = ziel - (-2);
    for (let i = 0; i < schritte; i++) { await emit('qq:rulesNext'); await sleep(120); }
    // Ziel -2 heisst: gar nicht weiter, aber die Einblendung neu ausloesen,
    // damit die Choreographie frisch abspielt statt im Endzustand zu haengen.
    if (ziel === -2) { await emit('qq:rulesNext'); await sleep(200); await emit('qq:rulesPrev'); }
  },
};

let aufbauStand = 'roh';
async function aufbauen(stufe) {
  if (stufe === 'roh' || aufbauStand === stufe) return;
  if (aufbauStand === 'roh' && (stufe === 'lobby' || stufe === 'spiel')) {
    const r = await fetch(`${API}/api/qq/${encodeURIComponent(roomCode)}/dev/fillTeams`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: BOTS, pin: PIN }),
    });
    if (!r.ok) console.log('  fillTeams:', r.status, await r.text());
    await emit('qq:setSetupDone', { value: true });
    aufbauStand = 'lobby';
    await sleep(800);
  }
  if (stufe === 'spiel' && aufbauStand === 'lobby') {
    const drafts = await fetch(`${API}/api/qq/drafts`).then(r => r.json());
    const d = drafts.find(x => !/arena/i.test(x.id)) ?? drafts[0];
    await emit('qq:setTestMode', { value: true });
    await emit('qq:startGame', {
      questions: d.questions, language: d.language ?? 'both', phases: d.phases ?? 4,
      draftId: d.id, draftTitle: d.title,
    });
    console.log(`Spiel gestartet mit „${d.title}"`);
    aufbauStand = 'spiel';
    await sleep(1200);
  }
}

// --serie=800,2000,3400  knipst mehrere Zeitpunkte NACH dem Auftritt statt nur
// den Endzustand. Fuer Bewegung ist ein einzelnes Bild nutzlos, und ein Video
// pro Durchgang waere wieder teuer — eine Handvoll Marken reicht.
const SERIE = (process.argv.find(a => a.startsWith('--serie=')) || '').split('=')[1];
const marken = SERIE ? SERIE.split(',').map(Number) : null;

for (const name of liste) {
  const a = ANSICHTEN[name];
  await aufbauen(a.aufbau);
  await a.weg(helfer);
  if (marken) {
    let stand = 0;
    for (const ms of marken) {
      await sleep(Math.max(0, ms - stand)); stand = ms;
      const datei = `${OUT}/V-${name}-${ms}.png`;
      writeFileSync(datei, await beamer.screenshot());
      console.log(`  ✓ ${datei}`);
    }
  } else {
    await sleep(a.ruhe);
    const datei = `${OUT}/V-${name}.png`;
    writeFileSync(datei, await beamer.screenshot());
    console.log(`  ✓ ${datei}   (Phase ${await phase()})`);
  }
}

sock.close();
await browser.close();
console.log(`\nfertig, ${liste.length} Ansichten → ${OUT}/`);
