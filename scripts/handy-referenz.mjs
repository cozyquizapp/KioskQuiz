/* handy-referenz — spricht /team dieselbe Sprache wie die Buehne?
 *
 * 2026-08-29, Wolf: „wir muessen die cozyquiz/crowdquiz teamseite an das
 * neue design anpassen".
 *
 * Dasselbe Verfahren wie scripts/design-referenz.mjs, nur mit einem anderen
 * Paar: dort CrowdQuiz gegen CozyQuiz, hier das HANDY gegen die BUEHNE. Und
 * derselbe Grund, es nicht am Bild zu machen: /team sieht zwangslaeufig anders
 * aus als /beamer. Die Buehne ist Anzeige, das Handy ist Bedienflaeche - sie
 * teilen keine einzige Ansicht. Ein Bildvergleich meldete lauter echte
 * Unterschiede und keinen einzigen Fehler.
 *
 * Verglichen wird der WORTSCHATZ (lib/designsprache.mjs): die Menge der
 * benutzten Schriften, Textfarben, Flaechen, Raender, Ecken, Schatten.
 *
 * ── ⚠️ Was auf dem Handy AUSDRUECKLICH anders sein DARF ────────────────────
 * Anders als bei CrowdQuiz ist hier nicht jeder Fund ein Fehler, und das steht
 * so im Quelltext der Buehne selbst. `main.css`, Scope `[data-qq-stage='2a']`:
 *
 *   „Eine 34-%-Karte ohne Schatten ist auf 2,8 m Bildbreite richtig und auf
 *    einem Handy in der Hand falsch: dort steht das Geraet in Umgebungslicht,
 *    und die Karte braucht ihre Kante."
 *
 *   „NICHT betroffen: das Handy. Dort ist die Teammarke Avatar, also
 *    Identitaet, und bleibt rund. Dieser Scope gilt nur fuer die Projektion."
 *
 * Der Buehnen-Scope ist also KEINE Vorlage zum Abschreiben. Was in ihm steht,
 * ist fuer die Projektion entschieden worden - Kasten weg, Schatten weg, Ecke
 * eckig - und zwar mit Gruenden, die auf einem Handy nicht gelten.
 *
 * Was dagegen fuer die GANZE App entschieden ist, steht in `:root`, nicht im
 * Scope. Die Tinte zum Beispiel, `--qq-text: #F6EFE6`, mit dem Kommentar:
 * „Gilt fuer die ganze App, nicht nur die Buehne: das Handy zeigt dieselben
 * Texte, und zwei Weisstoene nebeneinander sind schlechter als einer."
 *
 * Deshalb teilt dieser Bericht die Funde in zwei Listen:
 *
 *   BEFUND   — ein Wort, das die Buehne nirgends kennt, und fuer das es keinen
 *              Handy-Grund gibt. Das ist die Liste, die kuerzer werden soll.
 *   GEDECKT  — ein Unterschied, der im Quelltext der Buehne als Handy-Ausnahme
 *              begruendet ist. Steht mit dem Grund da, nicht versteckt.
 *
 * Die Liste GEDECKT unten ist von Hand gepflegt, mit Quelle. Wer sie
 * verlaengert, ohne eine Fundstelle im Repo zu nennen, macht aus dem Werkzeug
 * eine Ausrede.
 *
 * ── Was das Werkzeug NICHT kann ───────────────────────────────────────────
 * Es findet fremde WOERTER, nicht falsche SAETZE. Ob der Aufbau einer
 * Handy-Ansicht stimmt, ob ein Knopf zu klein ist, ob etwas ins Bild passt -
 * nichts davon steht hier. Fuer Kontrast und Tap-Ziele gibt es
 * scripts/design-audit-cozyquiz.mjs.
 *
 * VORAUSSETZUNG: Backend (4000, frisch) + Frontend (5173).
 * NUTZUNG:
 *   node scripts/handy-referenz.mjs             # der ganze Abend
 *   node scripts/handy-referenz.mjs --secs=200
 */
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { WORTSCHATZ, TOEPFE, vereinen } from './lib/designsprache.mjs';

const req = createRequire(new URL('../backend/package.json', import.meta.url));
const { io } = req('socket.io-client');
const API = 'http://localhost:4000';
const PIN = process.env.ADMIN_PIN || '2506';

const BASE = 'http://localhost:5173';
const SECS = Number((process.argv.find(a => a.startsWith('--secs=')) ?? '--secs=190').split('=')[1]);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* Ab welcher Groesse ein Element mitzaehlt. Dieselben Werte wie in
 * design-referenz.mjs - darunter sind es Trennlinien, Punkte und
 * Rundungsreste. Die Buehne rechnet in Buehnen-Pixeln (1760x990 zurueck-
 * gerechnet), das Handy in echten CSS-Pixeln. */
const MIN_TEXT = 10, MIN_FLAECHE = 24;

/**
 * Farben, die sich per Definition wegkuerzen: die Team- und Kategoriepalette.
 * Dieselbe Liste und derselbe Grund wie in design-referenz.mjs - dass ein Team
 * pink ist, ist keine Design-Entscheidung dieser Ansicht.
 *
 * Auf dem Handy wiegt das schwerer als auf der Buehne: dort laufen acht
 * Teamfarben nebeneinander, hier nur die EINE des eigenen Teams. Die beiden
 * Seiten treffen also nie dieselben Slots, und ohne diese Liste waere die
 * eigene Teamfarbe in jedem Lauf ein Befund.
 * Quelle: QQ_TEAM_PALETTE und QQ_CATEGORY_COLORS in shared/quarterQuizTypes.ts.
 */
const PALETTE_HEX = [
  // Teamfarben: QQ_TEAM_PALETTE (= QQ_AVATARS[].color).
  '#F97316', '#22C55E', '#14B8A6', '#A855F7', '#FACC15', '#3B82F6', '#EC4899', '#EF4444',
  // Kategorien, alter Satz: QQ_CATEGORY_COLORS.
  '#F59E0B', '#8B5CF6',
];
/*
 * ⚠️ Und der NEUE Satz, aus shared/qqCategoryTheme.ts gelesen statt abgetippt.
 *
 * Der erste brauchbare Lauf hat `155,107,255` als Fund gemeldet, mit dem
 * Beispiel „Picture This". Das ist #9B6BFF, der Kategorie-Ton von CHEESE aus
 * docs/BUEHNEN_DESIGN.md Abschnitt 6 - also genau eine Farbe, die per
 * Definition erlaubt ist. Kein Fund, eine Luecke im Werkzeug: die Liste oben
 * kannte nur die Tailwind-Werte von vor dem Farbdurchgang.
 *
 * Deshalb wird die zweite Haelfte gelesen und nicht gepflegt. Ein Import geht
 * nicht (Node laedt kein TypeScript), also aus dem Quelltext geholt - was
 * grob aussieht, aber die Eigenschaft hat, die zaehlt: aendert jemand einen
 * Kategorie-Ton, zieht das Werkzeug mit, ohne dass es jemand merken muss.
 *
 * Dieselbe Luecke hat scripts/design-referenz.mjs (feste Liste im Kopf). Dort
 * ist sie nie aufgefallen, weil beide verglichenen Formate dieselben
 * Kategorie-Toene benutzen und sie sich deshalb wegkuerzen.
 */
const { readFileSync } = await import('node:fs');
const KATEGORIE_HEX = (() => {
  try {
    const quelle = readFileSync(new URL('../shared/qqCategoryTheme.ts', import.meta.url), 'utf8');
    return [...quelle.matchAll(/accent:\s*'(#[0-9A-Fa-f]{6})'/g)].map(m => m[1]);
  } catch { return []; }
})();
if (!KATEGORIE_HEX.length) console.log('⚠️  Keine Kategorie-Toene gelesen - Funde koennen Kategoriefarben sein.');

const PALETTE_RGB = new Set([...PALETTE_HEX, ...KATEGORIE_HEX].map(h => {
  const n = parseInt(h.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}));
const istPalette = (wort) => {
  for (const m of String(wort).matchAll(/(\d{1,3}),(\d{1,3}),(\d{1,3})/g)) {
    if (PALETTE_RGB.has(`${+m[1]},${+m[2]},${+m[3]}`)) return true;
  }
  return false;
};

/**
 * Unterschiede, die auf dem Handy begruendet sind. Jeder Eintrag nennt die
 * Fundstelle - ohne die gehoert er hier nicht hin.
 *
 * ⚠️ Diese Liste deckt WOERTER, nicht Ansichten. „Der Schatten ist erlaubt"
 * heisst nicht „dieser Schatten ist gut gewaehlt".
 */
/* Die abgeleitete Handy-Tinte (shared/qqColors.ts, Block „Handy-Tinte").
 * Sie steht hier, weil sie sonst als Fremdwort gemeldet wuerde - zu Recht,
 * denn die Buehne kennt genau zwei Tintenstufen und das Handy fuenf. Der
 * Unterschied ist gewollt und begruendet; die WERTE sind aber nicht frei
 * gewaehlt, sondern aus den beiden Buehnenankern abgeleitet
 * (scripts/handy-tinte.mjs). Wer hier einen Wert eintraegt, der dort nicht
 * herauskommt, macht die Leiter wieder zu Geschmack. */
const HANDY_TINTE = ['243,239,231', '235,231,226', '215,210,215', '164,158,177',
  '117,111,129', '86,81,97', '66,61,77'];

const GEDECKT = [
  {
    topf: 'textfarbe', trifft: (w) => HANDY_TINTE.includes(String(w).split('@')[0]),
    grund: 'Stufe der abgeleiteten Handy-Tinte. Das Handy fuehrt fuenf Tintenstufen, '
      + 'weil es fuenf Rollen hat (Ueberschrift, Wert, Beschriftung, Hilfstext, '
      + 'Abgeschaltetes); die Buehne fuehrt zwei. Die Werte sind aus den beiden '
      + 'Buehnenankern abgeleitet, siehe scripts/handy-tinte.mjs.',
  },
  {
    topf: 'schatten', trifft: () => true,
    grund: 'Die Buehne loescht Schatten, weil Weichzeichnung auf Projektionsdistanz '
      + 'keine Tiefe erzeugt, sondern die Kante frisst. Das Handy steht in '
      + 'Umgebungslicht und braucht seine Kante (main.css, Scope 2a).',
  },
  {
    topf: 'radius', trifft: (w) => w === 'Pille/Kreis' || w === '50% (Anteil)',
    grund: 'Die Teammarke ist auf dem Handy Avatar, also Identitaet, und bleibt rund '
      + '(main.css: „NICHT betroffen: das Handy … Dieser Scope gilt nur fuer die '
      + 'Projektion").',
  },
];
const deckung = (topf, wort) => GEDECKT.find(g => g.topf === topf && g.trifft(wort))?.grund ?? null;

/* ── Aufbau: Buehne und Handy im selben Raum, wie in e2e-beamer-team.mjs ──── */
const health = await fetch('http://localhost:4000/api/health').then(r => r.json()).catch(() => null);
if (!health?.ok) { console.error('Backend nicht erreichbar (4000).'); process.exit(1); }
console.log(`Backend ok (uptime ${Math.round(health.uptime)}s, build ${health.build ?? '?'})`);

mkdirSync('.shots/handy', { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
});

const ctxMain = await browser.newContext({ viewport: { width: 1760, height: 990 }, deviceScaleFactor: 1 });
await ctxMain.addInitScript(() => {
  try {
    sessionStorage.setItem('qq_admin_unlocked', '1');
    sessionStorage.setItem('qq_admin_pin', '2506');
    localStorage.setItem('qq-admin-pin', '2506');
  } catch { /* ignore */ }
});
const ctxTeam = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
await ctxTeam.addInitScript(() => {
  try {
    localStorage.setItem('qq_teamName', 'Testtrupp');
    localStorage.setItem('qq_avatarId', 'fox');
  } catch { /* ignore */ }
});

const beamer = await ctxMain.newPage();
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });
await beamer.waitForSelector('[data-qq-room]', { timeout: 20000 }).catch(() => {});

/* Frischer Raum, VOR dem Handy-Beitritt.
 *
 * Ohne das misst der zweite Lauf einen Raum, in dem das Spiel schon laeuft:
 * das Handy bekommt dann „Quiz laeuft bereits" statt der Spielansicht, und der
 * Bericht meldet den Wortschatz einer Sperrseite als den des Handys. Genau so
 * ist der erste Probelauf ausgegangen.
 *
 * Warum ueber den Socket und nicht per `rm backend/.qq-rooms/*.json`: der
 * Server schreibt seine offenen Speicherungen beim Herunterfahren noch einmal
 * weg - dieselbe Falle wie im Kopf von scripts/moderator-view.mjs.
 * Und `qq:resetRoom` allein reicht nicht: es setzt das SPIEL zurueck, behaelt
 * die Teams. Ohne `clearBots` erbt jeder Lauf die Teams des ersten. */
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

/**
 * Erst beitreten, DANN den Abend starten.
 *
 * ⚠️ Die Reihenfolge ist der ganze Punkt. Die erste Fassung hat den Moderator
 * sofort geoeffnet und das Handy nebenher beitreten lassen - ein Wettlauf, den
 * das Handy in einem von zwei Laeufen verloren hat. Danach zeigte es „Quiz
 * laeuft schon", und der Bericht mass sechsmal eine Sperrseite.
 *
 * `qq:resetRoom` + `clearBots` loeschen auch das gespeicherte Team, der
 * Auto-Wiedereinstieg aus dem localStorage greift also nicht - das Handy muss
 * wirklich durch den Beitritt. Deshalb wird hier geklickt, bis die Lobby-
 * Ansicht steht, und nicht bis eine Frist abgelaufen ist.
 *
 * Geprueft wird am BILD des Handys, nicht am Serverzustand: einen Socket-
 * Aufruf „gib mir den Zustand" gibt es nicht (der Server schickt von sich aus,
 * `qq:stateUpdate`), und ein erfundener Ereignisname faellt nirgends auf - der
 * Socket-Vertrag ist untypisiert, siehe CLAUDE.md.
 */
let beigetreten = false;
for (let i = 0; i < 20 && !beigetreten; i++) {
  const btn = team.locator('button', { hasText: /Wieder einsteigen|Spiel beitreten|Rejoin|Join game|Los geht|einsteigen|Beitreten/i }).first();
  if (await btn.count().catch(() => 0)) {
    await btn.click({ timeout: 2000 }).catch(() => {});
    await sleep(1800);
  } else {
    await sleep(1200);
  }
  const text = await team.evaluate(() => document.body.innerText || '').catch(() => '');
  beigetreten = /READY|BEREIT|Waiting for opponents|Warte auf/i.test(text);
}
console.log(beigetreten ? 'Handy beigetreten.' : '⚠️  Handy nicht sichtbar beigetreten - Lauf laeuft weiter, Reissleine faengt es ab.');

const mod = await ctxMain.newPage();
mod.on('dialog', async (d) => { await d.dismiss(); });
await mod.goto(`${BASE}/moderator-test?run=1`, { waitUntil: 'domcontentloaded' });
await sleep(6000);

/**
 * Sperrseite erkennen. Das Handy zeigt „Quiz laeuft schon! / Du bist nicht
 * angemeldet", wenn es einen laufenden Raum betritt, in dem sein Team fehlt.
 *
 * ⚠️ Das ist die Reissleine dieses Werkzeugs, und sie ist aus Schaden gebaut:
 * ein Lauf vom 2026-08-29 hat sechs Stationen sauber gemeldet und dabei
 * SECHSMAL dieselbe Sperrseite gemessen. Der Bericht sah gut aus - 21 Befunde
 * auf 6 gefallen - und war wertlos, weil das Handy die Spielansicht nie
 * gezeigt hat. Ein Werkzeug, das in diesem Fall schweigt, ist schlimmer als
 * keines: es beweist scheinbar, dass eine Aenderung gewirkt hat.
 */
const gesperrt = () => team.evaluate(() =>
  /Quiz läuft schon|Quiz already running|nicht angemeldet|not registered/i.test(document.body.innerText || ''))
  .catch(() => false);

if (await gesperrt()) {
  console.error('\n⚠️  ABBRUCH: das Handy haengt auf der Sperrseite („Quiz laeuft schon").');
  console.error('    Der Raum lief schon, als das Handy kam. Backend frisch starten:');
  console.error('    pkill -f "src/server.ts"; rm -f backend/.qq-rooms/*.json; npm run start:backend');
  await browser.close();
  process.exit(1);
}

/* ── Messen: jede neue Phase einmal, beide Seiten im selben Moment ───────── */
const buehneWorte = {}, handyWorte = {};
const gesehen = new Set();
const stationen = [];
const bis = Date.now() + SECS * 1000;

while (Date.now() < bis) {
  const phase = await beamer.evaluate(() =>
    document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? null).catch(() => null);
  if (phase && !gesehen.has(phase)) {
    gesehen.add(phase);
    // Faellt das Handy MITTEN im Abend auf die Sperrseite (Verbindung weg,
    // Team entfernt), zaehlt die Station nicht mit - sonst faerbt eine
    // Sperrseite den Wortschatz aller folgenden Stationen ein.
    if (await gesperrt()) { console.log(`  – ${phase} (Sperrseite, nicht gezaehlt)`); continue; }
    // Der Auftritt einer Ansicht laeuft bis zu 2 s; waehrend er laeuft misst
    // man Zwischenwerte (halbe Deckkraft = andere Farbe). Erst ruhen lassen.
    await sleep(2600);
    const b = await beamer.evaluate(WORTSCHATZ, { minText: MIN_TEXT, minFlaeche: MIN_FLAECHE })
      .catch(() => null);
    const h = await team.evaluate(WORTSCHATZ, {
      minText: MIN_TEXT, minFlaeche: MIN_FLAECHE, wurzel: 'body', bezug: 0,
    }).catch(() => null);
    if (b && !b.fehler) vereinen(buehneWorte, b);
    if (h && !h.fehler) {
      vereinen(handyWorte, h);
      for (const [topf] of TOEPFE) for (const e of h[topf] ?? []) {
        handyWorte[topf].get(e.wort).wo.add(phase);
      }
    }
    await team.screenshot({ path: `.shots/handy/${String(stationen.length + 1).padStart(2, '0')}-${phase}.png` });
    stationen.push(phase);
    console.log(`  ✓ ${phase}`);
  }
  await sleep(1500);
}
await browser.close();
sock.close();

/* ── Bericht ──────────────────────────────────────────────────────────────── */
let befunde = 0, gedeckte = 0;
const zeilen = [`# Spricht /team die Sprache der Buehne?`, '',
  `Gemessen am ${new Date().toISOString().slice(0, 10)} ueber ${stationen.length} Stationen`,
  `(${stationen.join(', ')}).`, '',
  'Erzeugt von `node scripts/handy-referenz.mjs`. Der Kopf des Werkzeugs erklaert,',
  'warum nicht jeder Unterschied ein Fehler ist.', ''];

const gedecktListe = [];
for (const [topf, titel] of TOEPFE) {
  const buehne = buehneWorte[topf] ?? new Map();
  const handy = handyWorte[topf] ?? new Map();
  const fremd = [];
  for (const [wort, v] of handy) {
    if (buehne.has(wort) || istPalette(wort)) continue;
    const grund = deckung(topf, wort);
    if (grund) { gedecktListe.push({ titel, wort, v, grund }); gedeckte++; continue; }
    fremd.push({ wort, v });
  }
  if (!fremd.length) continue;
  befunde += fremd.length;
  zeilen.push(`## ${titel}`, '');
  for (const { wort, v } of fremd.sort((a, b) => b.v.n - a.v.n)) {
    const wo = Array.from(v.wo ?? []).join(', ');
    zeilen.push(`* \`${wort}\` — ${v.n}x${v.bsp ? ` (z.B. „${v.bsp}")` : ''}${wo ? ` — ${wo}` : ''}`);
  }
  zeilen.push('');
}

if (!befunde) zeilen.push('Keine fremden Woerter. Das Handy benutzt nur Werte, die die Buehne kennt.', '');

if (gedecktListe.length) {
  zeilen.push('## Gedeckte Unterschiede', '',
    'Kein Fund: fuer diese Woerter steht der Handy-Grund im Quelltext der Buehne.', '');
  for (const g of gedecktListe) zeilen.push(`* ${g.titel}: \`${g.wort}\` (${g.v.n}x) — ${g.grund}`);
  zeilen.push('');
}

const text = zeilen.join('\n');
writeFileSync('.shots/handy/BERICHT.md', text);
console.log('\n' + text);
console.log(`${befunde} Befunde, ${gedeckte} gedeckt. Bericht: .shots/handy/BERICHT.md`);
