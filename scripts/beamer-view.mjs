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
const sharp = createRequire(new URL('../frontend/package.json', import.meta.url))('sharp');

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

/**
 * Aufnahme, die auch laufende Videos richtig zeigt.
 *
 * EINSCHRAENKUNG, die man kennen muss: zwischen Seiten- und Element-Aufnahme
 * liegt rund eine Sekunde. Faellt in dieses Fenster der DE/EN-Wechsel (alle
 * 12 s), zeigt das zusammengesetzte Bild im Videokasten schon die neue Sprache
 * und daneben noch die alte. Das ist ein Aufnahme-Artefakt, kein Fehler auf
 * der Buehne.
 *
 * 2026-08-23, zweimal reingefallen: `page.screenshot()` liefert bei einem
 * Video, das in einer eigenen Compositing-Ebene liegt, hartnaeckig das ERSTE
 * Bild, waehrend `currentTime` weiterlaeuft. Gemessen im Wolf-Bereich: 0,2 bis
 * 0,6 % Aenderung ueber die ganze Folie, obwohl das Video bei 4,0 s stand.
 * `--disable-gpu-compositing` half beim Wolf im Textfluss, nicht mehr, sobald
 * er `position: absolute` bekam; `--disable-gpu` half gar nicht.
 * Was zuverlaessig funktioniert, ist die Aufnahme des ELEMENTS: dieselbe
 * Messung ergab dort 55 % und 23 %. Also beides knipsen und das Element an
 * seiner gemessenen Stelle ueber die Seitenaufnahme legen. Die Element-
 * Aufnahme enthaelt den Hintergrund hinter dem Video mit, der Zusammenbau ist
 * damit deckungsgleich und nicht geraten.
 */
async function knipsen(page) {
  const seite = await page.screenshot();
  const videos = await page.locator('video').all();
  if (!videos.length) return seite;
  const { width: BW, height: BH } = await sharp(seite).metadata();
  const stellen = [];
  for (const v of videos) {
    const box = await v.boundingBox();
    if (!box || box.width < 2 || box.height < 2) continue;
    const roh = await v.screenshot();
    // `elementHandle.screenshot()` ruft intern `scrollIntoViewIfNeeded`. Der
    // Willkommen-Wolf haengt absichtlich unter die Buehnenkante, also gilt er
    // als „nicht ganz sichtbar" — und Playwright scrollt dafuer das Overlay,
    // obwohl das `overflow: hidden` hat (per Skript geht das trotzdem).
    // Gemessen: `boundingBox().y` sprang durch die Aufnahme von 531 auf 462,
    // und die NAECHSTE Aufnahme zeigte dann die um 69 px verschobene Seite.
    // Die Buehne selbst bleibt dabei sauber (scrollHeight 990 = clientHeight
    // 990, scrollY 0), es ist rein die Aufnahme, die den Zustand verbiegt.
    // Also hinterher aufraeumen.
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      for (const e of document.querySelectorAll('*')) {
        if (e.scrollTop) e.scrollTop = 0;
        if (e.scrollLeft) e.scrollLeft = 0;
      }
    });
    const rm = await sharp(roh).metadata();
    // 2026-08-23, genau hier reingefallen: der Willkommen-Wolf haengt absichtlich
    // ueber die untere Buehnenkante hinaus. Die Element-Aufnahme umfasst das
    // GANZE Element, also auch den Teil unter der Kante. Legt man sie bei
    // `top = box.y` auf, schneidet sharp unten ab — und damit sieht man im Bild
    // den oberen Teil des Wolfs, wo in Wirklichkeit der untere steht. Der Wolf
    // schien 30 px ueber der Kante zu enden, obwohl er sie im Browser beruehrt.
    // Also erst auf den sichtbaren Ausschnitt beschneiden, dann auflegen.
    const l = Math.max(0, Math.round(box.x));
    const t = Math.max(0, Math.round(box.y));
    const r = Math.min(BW, Math.round(box.x + box.width));
    const b = Math.min(BH, Math.round(box.y + box.height));
    if (r - l < 2 || b - t < 2) continue;
    const sx = Math.max(0, Math.min(rm.width - 1, l - Math.round(box.x)));
    const sy = Math.max(0, Math.min(rm.height - 1, t - Math.round(box.y)));
    const sw = Math.min(r - l, rm.width - sx);
    const sh = Math.min(b - t, rm.height - sy);
    const input = await sharp(roh).extract({ left: sx, top: sy, width: sw, height: sh }).png().toBuffer();
    stellen.push({ input, left: l, top: t });
  }
  if (!stellen.length) return seite;
  return sharp(seite).composite(stellen).png().toBuffer();
}

// Einmal leer knipsen und wegwerfen. Die ERSTE Aufnahme einer Sitzung kostet
// rund sieben Sekunden (Schriften, erster Anstrich, sharp kalt), jede weitere
// gut eine. Ohne dieses Aufwaermen faellt der ganze Aufschlag auf die erste
// Marke einer Serie, und alles danach liegt hinter dem Ende der Bewegung.
await knipsen(beamer);

for (const name of liste) {
  const a = ANSICHTEN[name];
  await aufbauen(a.aufbau);
  await a.weg(helfer);
  if (marken) {
    // Gegen die echte Uhr, nicht gegen die Summe der Pausen: eine Aufnahme
    // dauert selbst ueber eine Sekunde (Seite + Videoelement + Zusammenbau).
    // Mit `sleep(ms - vorheriges_ms)` verschieben sich die spaeteren Marken
    // um genau diese Zeit, und man knipst ein Video, das laengst zu Ende ist.
    // Die Datei traegt die ECHTE Zeit, nicht die gewuenschte. Eine Aufnahme
    // kostet selbst gut eine Sekunde (Seite + Videoelement + Zusammenbau), eng
    // gesetzte Marken sind also gar nicht erreichbar. Sie als „4300" zu
    // beschriften, obwohl es 6453 waren, waere eine Luege im Dateinamen.
    const t0 = Date.now();
    for (const ms of marken) {
      await sleep(Math.max(0, ms - (Date.now() - t0)));
      const echt = Date.now() - t0;
      const datei = `${OUT}/V-${name}-${echt}.png`;
      writeFileSync(datei, await knipsen(beamer));
      console.log(`  ✓ ${datei}   (Wunsch ${ms} ms)`);
    }
  } else {
    await sleep(a.ruhe);
    const datei = `${OUT}/V-${name}.png`;
    writeFileSync(datei, await knipsen(beamer));
    console.log(`  ✓ ${datei}   (Phase ${await phase()})`);
  }
}

sock.close();
await browser.close();
console.log(`\nfertig, ${liste.length} Ansichten → ${OUT}/`);
