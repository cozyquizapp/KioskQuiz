/* handy-vorher-nachher — dieselbe Ansicht zweimal, alte und neue Tinte.
 *
 * 2026-08-29, Wolf: „hast du schon was geaendert? zeig mir gerne mal vorher
 * nacher? dann ueberpruefe ich einmal, dass nichts „kaputt" geht?"
 *
 * ── Warum nicht einfach zwei Laeufe vergleichen ───────────────────────────
 * Der naheliegende Weg waere: einmal vor der Aenderung knipsen, einmal danach.
 * Das ergibt aber keinen Vergleich, sondern zwei verschiedene Abende. Die
 * Bot-Namen, die Fragen und damit die KATEGORIE werden pro Lauf gewuerfelt -
 * und die Kategorie faerbt die halbe Ansicht. Auf den ersten beiden Laeufen
 * von heute stand links „Picture This" in Violett und rechts „Hive Mind" in
 * Rot. Wer das nebeneinanderlegt, sieht vor allem Zufall.
 *
 * ── Was stattdessen passiert ──────────────────────────────────────────────
 * EIN Lauf, EIN Bild, zwei Aufnahmen. Die ganze Tinte des Handys laeuft seit
 * heute ueber acht CSS-Variablen (`--qq-ink*`, siehe qqHandyTinte.ts). Hier
 * werden auf demselben stehenden Bild einmal die ALTEN Slate-Werte in genau
 * diese Variablen geschrieben und geknipst, dann wieder die neuen. Alles
 * andere - Frage, Kategorie, Team, Uhr - bleibt identisch.
 *
 * ⚠️ Was der Vergleich NICHT zeigt: die zweite Aenderung des Tages, der
 * Akzent fuer Folien ohne Kategorie (`#F9A8D4` fest → Akzent des aktiven
 * Designs, QQTeamPage.tsx). Der haengt nicht an einer Variablen, sondern wird
 * beim Rendern berechnet. Er ist auf den Lobby- und Regel-Bildern zu sehen,
 * aber nicht durch Umschalten im stehenden Bild.
 *
 * VORAUSSETZUNG: Backend (4000, frisch) + Frontend (5173).
 * NUTZUNG: node scripts/handy-vorher-nachher.mjs [--secs=200]
 */
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

const req = createRequire(new URL('../backend/package.json', import.meta.url));
const { io } = req('socket.io-client');
const API = 'http://localhost:4000';
const BASE = 'http://localhost:5173';
const PIN = process.env.ADMIN_PIN || '2506';
const SECS = Number((process.argv.find(a => a.startsWith('--secs=')) ?? '--secs=200').split('=')[1]);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Die Leiter, wie sie VOR dem 2026-08-29 aussah.
 *
 * Das sind die Tailwind-Slate-Stufen, die /team an rund 360 Stellen benutzt
 * hat, plus Reinweiss als hellste Tinte. Sie stehen hier als Sprungmarke
 * zurueck, nicht als Vorschlag - im Code ist die Leiter ersetzt.
 */
const ALT = {
  '--qq-ink': '#ffffff',        // Reinweiss + Slate-50/100
  '--qq-ink-body': '#e2e8f0',   // Slate-200
  '--qq-ink-soft': '#cbd5e1',   // Slate-300
  '--qq-ink-muted': '#94a3b8',  // Slate-400
  '--qq-ink-quiet': '#64748b',  // Slate-500
  '--qq-ink-dim': '#475569',    // Slate-600
  '--qq-ink-edge': '#334155',   // Slate-700
  '--qq-ink-rgb': '255,255,255',
};

const health = await fetch(`${API}/api/health`).then(r => r.json()).catch(() => null);
if (!health?.ok) { console.error('Backend nicht erreichbar (4000).'); process.exit(1); }
mkdirSync('.shots/vergleich', { recursive: true });

const browser = await chromium.launch({
  headless: true,
  ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
});
const ctxMain = await browser.newContext({ viewport: { width: 1760, height: 990 } });
await ctxMain.addInitScript(() => {
  try {
    sessionStorage.setItem('qq_admin_unlocked', '1');
    sessionStorage.setItem('qq_admin_pin', '2506');
    localStorage.setItem('qq-admin-pin', '2506');
  } catch { /* ignore */ }
});
const ctxTeam = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
});
await ctxTeam.addInitScript(() => {
  try {
    localStorage.setItem('qq_teamName', 'Testtrupp');
    localStorage.setItem('qq_avatarId', 'fox');
  } catch { /* ignore */ }
});

const beamer = await ctxMain.newPage();
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });
await beamer.waitForSelector('[data-qq-room]', { timeout: 20000 }).catch(() => {});
const roomCode = await beamer.evaluate(() =>
  document.querySelector('[data-qq-room]')?.getAttribute('data-qq-room') ?? 'default').catch(() => 'default');

const sock = io(API, { transports: ['websocket'] });
await new Promise((res, rej) => {
  sock.on('connect', res); sock.on('connect_error', rej);
  setTimeout(() => rej(new Error('Socket-Timeout')), 8000);
});
const emit = (ev, extra = {}) => new Promise(res => sock.emit(ev, { roomCode, ...extra }, res));
await emit('qq:joinModerator', { pin: PIN });
await emit('qq:resetRoom', { confirm: true });
await sleep(900);
await fetch(`${API}/api/qq/${encodeURIComponent(roomCode)}/dev/clearBots`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pin: PIN }),
}).catch(() => {});
await sleep(500);
console.log(`Raum ${roomCode} frisch.`);

const team = await ctxTeam.newPage();
team.on('dialog', async (d) => { await d.dismiss(); });
await team.goto(`${BASE}/team`, { waitUntil: 'domcontentloaded' });
await sleep(6000);

let beigetreten = false;
for (let i = 0; i < 20 && !beigetreten; i++) {
  const btn = team.locator('button', { hasText: /Wieder einsteigen|Spiel beitreten|Rejoin|Join game|Los geht|einsteigen|Beitreten/i }).first();
  if (await btn.count().catch(() => 0)) { await btn.click({ timeout: 2000 }).catch(() => {}); await sleep(1800); }
  else await sleep(1200);
  const text = await team.evaluate(() => document.body.innerText || '').catch(() => '');
  beigetreten = /READY|BEREIT|Waiting for opponents|Warte auf/i.test(text);
}
console.log(beigetreten ? 'Handy beigetreten.' : '⚠️  Handy nicht sichtbar beigetreten.');

const mod = await ctxMain.newPage();
mod.on('dialog', async (d) => { await d.dismiss(); });
await mod.goto(`${BASE}/moderator-test?run=1`, { waitUntil: 'domcontentloaded' });
await sleep(6000);

const gesperrt = () => team.evaluate(() =>
  /Quiz läuft schon|Quiz already running|nicht angemeldet|not registered/i.test(document.body.innerText || ''))
  .catch(() => false);
if (await gesperrt()) {
  console.error('\n⚠️  ABBRUCH: Sperrseite. Backend frisch starten.');
  await browser.close(); process.exit(1);
}

/**
 * Was steht gerade auf dem Handy? Text plus die Groessen der Karten.
 *
 * ⚠️ Das ist die Pruefung, an der dieses Werkzeug beim ersten Versuch
 * gescheitert ist, und zwar still. Es hat behauptet, beide Haelften zeigten
 * dieselbe Ansicht - „ein Lauf, ein stehendes Bild, zwei Aufnahmen". Wolf hat
 * am 2026-08-29 zwei Paare nebeneinandergelegt, in denen links das
 * Ten-Chips-Intro und rechts das Spielbrett stand: „das ist unlogisch."
 *
 * Er hatte recht, und die Ursache ist banal. Zwischen den beiden Aufnahmen
 * liegen rund 700 ms, und in denen laeuft der Abend weiter. Trifft das einen
 * Ansichtswechsel, zeigt die eine Haelfte die Karte davor und die andere die
 * danach. Der Vergleich sieht dann nach einer riesigen Aenderung aus, die
 * niemand gemacht hat - und im schlimmeren Fall nach einem Fehler, den es
 * nicht gibt.
 *
 * Ein Werkzeug darf so etwas nicht annehmen. Es vergleicht jetzt den Zustand
 * VOR und NACH dem Paar; sind sie verschieden, faellt das Paar weg.
 */
const zustand = () => team.evaluate(() => ({
  text: (document.body.innerText || '').replace(/\s+/g, ' ').trim(),
  // Der Text allein reicht nicht: eine Uhr, die von 26 auf 25 springt, ist
  // kein Ansichtswechsel. Deshalb die Ziffern raus und zusaetzlich die
  // Kartengeometrie, die sich bei einem Wechsel immer aendert.
  form: Array.from(document.querySelectorAll('div'))
    .map(e => e.getBoundingClientRect())
    .filter(r => r.width > 200 && r.height > 40)
    .map(r => `${Math.round(r.width)}x${Math.round(r.height)}@${Math.round(r.top)}`).join('|'),
})).catch(() => null);

const gleich = (a, z) => {
  if (!a || !z) return false;
  const ohneZiffern = (t) => t.replace(/\d+/g, '#');
  return ohneZiffern(a.text) === ohneZiffern(z.text) && a.form === z.form;
};

/** Die alte Leiter auf `body` schreiben bzw. wieder entfernen. Entfernen
 *  genuegt, weil die echten Werte dort von React gesetzt werden - sie kommen
 *  beim naechsten Rendern von selbst zurueck. Deshalb wird nach dem Entfernen
 *  neu gesetzt statt auf ein Rendern zu hoffen. */
const alteTinte = (an) => team.evaluate(({ alt, an }) => {
  const s = document.body.style;
  if (an) {
    window.__neu ??= Object.fromEntries(Object.keys(alt).map(k => [k, s.getPropertyValue(k)]));
    for (const [k, v] of Object.entries(alt)) s.setProperty(k, v);
  } else {
    for (const [k, v] of Object.entries(window.__neu ?? {})) s.setProperty(k, v);
  }
}, { alt: ALT, an });

const paare = [];
const verworfen = [];
const gesehen = new Set();
const bis = Date.now() + SECS * 1000;
while (Date.now() < bis) {
  const phase = await beamer.evaluate(() =>
    document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? null).catch(() => null);
  if (phase && !gesehen.has(phase)) {
    gesehen.add(phase);
    await sleep(2600);
    if (await gesperrt()) { console.log(`  – ${phase} (Sperrseite)`); continue; }
    const nr = String(paare.length + 1).padStart(2, '0');

    /* Zwei Anlaeufe. Faellt der erste in einen Ansichtswechsel, ist der
     * zweite eine Sekunde spaeter fast immer ruhig. Klappt auch der nicht,
     * faellt die Station weg - lieber ein Paar weniger als ein Paar, das
     * etwas zeigt, das nie passiert ist. */
    let gelungen = false;
    for (let versuch = 0; versuch < 4 && !gelungen; versuch++) {
      if (versuch) await sleep(1800);
      const vorZustand = await zustand();
      // Erst NACHHER (der echte Stand), dann umschalten - so ist ein
      // misslungenes Umschalten an einem fehlenden Vorher-Bild zu erkennen
      // und nicht an einem stillschweigend falschen Nachher-Bild.
      //
      // ⚠️ Das Fenster zwischen den beiden Aufnahmen ist so klein wie moeglich
      // gehalten. Es lag zuerst bei 700 ms, und genau darin ist der Abend
      // weitergelaufen (siehe `zustand` oben). Eine Farbaenderung an CSS-
      // Variablen braucht EIN Bild, nicht 400 ms; zwei Bilder Puffer sind
      // reichlich. Damit fallen Setzen und Runden-Intro nicht mehr weg -
      // Ansichten, die von sich aus nie ganz stillstehen.
      await team.screenshot({ path: `.shots/vergleich/${nr}-${phase}-nachher.png` });
      await alteTinte(true); await sleep(40);
      await team.screenshot({ path: `.shots/vergleich/${nr}-${phase}-vorher.png` });
      await alteTinte(false);
      gelungen = gleich(vorZustand, await zustand());
      if (!gelungen && versuch === 3) break;
    }

    if (!gelungen) {
      rmSync(`.shots/vergleich/${nr}-${phase}-nachher.png`, { force: true });
      rmSync(`.shots/vergleich/${nr}-${phase}-vorher.png`, { force: true });
      verworfen.push(phase);
      console.log(`  ✗ ${phase} verworfen: die Ansicht hat sich zwischen den Aufnahmen geaendert`);
    } else {
      paare.push({ nr, phase });
      console.log(`  ✓ ${phase}`);
    }
  }
  await sleep(1500);
}
await browser.close();
sock.close();

writeFileSync('.shots/vergleich/PAARE.json', JSON.stringify(paare, null, 2));
console.log(`\n${paare.length} Paare in .shots/vergleich/`);
if (verworfen.length) {
  console.log(`${verworfen.length} verworfen (Ansichtswechsel zwischen den Aufnahmen): ${verworfen.join(', ')}`);
  console.log('Das ist kein Fehler im Spiel, sondern eine Station, die zu unruhig war.');
}
