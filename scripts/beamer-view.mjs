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
 * Optionen:
 *   --serie=2800,4200      mehrere Zeitpunkte je Ansicht (Bewegung pruefen)
 *   --sprache=de|en|both   Vorgabe de, damit kein DE/EN-Wechsel ins Bild faellt
 *   --kategorie=MUCHO      zieht diese Kategorie nach vorn statt zu wuerfeln
 *   --dom="h1, .x"         Kaesten/Farben aus dem DOM statt aus dem Bild
 *   --zeiten               wo die Zeit hingeht
 *   --bots=8               Zahl der Bot-Teams
 *   --bild=hoch|quer       Testfoto fuer Schau mal (Hochkant/Querformat)
 *   --antworten=0.6        Quote richtiger Bot-Antworten vor einer Aufloesung
 *   --entwurf=qq-vol-1     Entwurf per Teil-Id waehlen
 *   --ruhe=15000           Ruhezeit ueberschreiben (lange Kaskaden)
 *
 * MEHRERE ANSICHTEN IN EINEM AUFRUF. Browser, Raum und Spielaufbau kosten
 * zusammen rund 12 s und fallen dann EINMAL an; jede weitere Ansicht kostet nur
 * noch ihre eigene Ruhezeit. Einzeln aufgerufen zahlt man die 12 s jedes Mal.
 *
 * Voraussetzung wie immer: Backend frisch, `rm -f backend/.qq-rooms/*.json`.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';

import { createRequire } from 'node:module';

const req = createRequire(new URL('../backend/package.json', import.meta.url));
const { io } = req('socket.io-client');
const sharp = createRequire(new URL('../frontend/package.json', import.meta.url))('sharp');
// Die CozyGame-Ids aus dem Repo-Seed - ohne Datenbank.
const COZY_SEED_IDS = (await import('../shared/cozyGameTypes.ts').catch(() => null))?.COZY_GAME_V1_SEED_IDS
  ?? ['cg-ringwurf', 'cg-stift-fang', 'cg-muenz-kante', 'cg-karten-haus',
      'cg-ballon-puste', 'cg-bierdeckel-muenzen', 'cg-waescheklammer-glas', 'cg-tt-ball-sammeln'];

const BASE = process.env.QQ_BASE ?? 'http://localhost:5173';
const API = 'http://localhost:4000';
const PIN = process.env.ADMIN_PIN || '2506';
const OUT = '.shots';
const BOTS = Number((process.argv.find(a => a.startsWith('--bots=')) || '--bots=8').split('=')[1]);
// 2026-08-23: Aufnahmen laufen in EINER Sprache, nicht im DE/EN-Wechsel.
// Der Wechsel kommt alle 12 s, und zwischen Seiten- und Element-Aufnahme liegt
// gut eine Sekunde: faellt der Wechsel dazwischen, steht im Bild die halbe
// alte Zeile neben der neuen („Ma        Get comfy, here we go!"). Das sah aus
// wie ein Fehler auf der Buehne und war keiner.
const SPRACHE = (process.argv.find(a => a.startsWith('--sprache=')) || '--sprache=de').split('=')[1];
// --kategorie=MUCHO  sortiert die Fragen so, dass die gewuenschte Kategorie
// zuerst drankommt. 2026-08-23 (Wolf: „momentan dauert es zu lange"): ohne das
// wuerfelt jeder Lauf eine andere Kategorie, und ich habe drei Laeufe gebraucht,
// bis endlich die gewuenschte kam. Drei Laeufe sind zwei Minuten.
const KATEGORIE = (process.argv.find(a => a.startsWith('--kategorie=')) || '=').split('=')[1] || null;
// --dom="sel,sel"  liest Kasten und Farben direkt aus dem DOM, statt sie
// hinterher im Bild zu suchen. Beim Willkommen-Wolf war das um ein Vielfaches
// schneller UND genauer (das Bild kann eine Ebene veraltet zeigen, das DOM nie).
const DOM = (process.argv.find(a => a.startsWith('--dom=')) || '=').split('=').slice(1).join('=') || null;
// --bild=hoch|quer  legt allen Schau-mal-Fragen ein Testfoto unter, damit sich
// beide Layouts (Hochkant/Querformat) gezielt anschauen lassen.
const BILD = (process.argv.find(a => a.startsWith('--bild=')) || '=').split('=')[1] || null;
// --antworten=0.6  Quote der richtigen Bot-Antworten vor einer Aufloesung.
const ANTWORTEN = Number((process.argv.find(a => a.startsWith('--antworten=')) || '--antworten=0.6').split('=')[1]);
// --entwurf=qq-vol-1  waehlt den Entwurf per Teil-Id.
const ENTWURF = (process.argv.find(a => a.startsWith('--entwurf=')) || '=').split('=')[1] || null;
// --ruhe=15000  ueberschreibt die Ruhezeit. Einzelne Kaskaden laufen laenger
// als die Vorgabe der Ansicht (Top 5 braucht 5 x 2400 ms plus Siegerband).
// --stufe=3  welcher Schritt der Final-Aufloesung geknipst wird.
const STUFE = Number((process.argv.find(a => a.startsWith('--stufe=')) || '--stufe=1').split('=')[1]);
// Setzt der Aufruf eine Ansicht mit `nurReihum`, bekommt der Pool nur Spiele
// mit `parallel: false` - sonst entscheidet der Zufall am Rad, ob die
// Reihum-Ansicht ueberhaupt drankommt.
const NUR_REIHUM = process.argv.some(a => a === 'cozyseq');
const RUHE = process.argv.find(a => a.startsWith('--ruhe='))
  ? Number(process.argv.find(a => a.startsWith('--ruhe=')).split('=')[1]) : null;
const QUELLE_HOCH = '/images/Johannes.jpeg';
const QUELLE_QUER = '/images/quiz-lounge-host-bg.png';
// --zeiten  schreibt auf, wo die Zeit hingeht.
const ZEITEN = process.argv.includes('--zeiten');
const t0Lauf = Date.now();
const takt = (was) => { if (ZEITEN) console.log(`  ⏱  ${String(Date.now() - t0Lauf).padStart(6)} ms  ${was}`); };

/**
 * 2026-08-23: zweimal an derselben Falle verloren. Der Harness hat „fertig"
 * gemeldet, aber gar nichts geschrieben - einmal weil das Frontend tot war,
 * einmal weil das Browser-Profil mitten im Lauf geloescht wurde. Beide Male
 * lag noch eine ALTE Datei mit demselben Namen da, ich habe sie angesehen und
 * fast einen veralteten Stand als aktuellen gemeldet.
 *
 * Deshalb: nach jedem Schreiben pruefen, ob die Datei wirklich aus DIESEM Lauf
 * stammt. Eine Aufnahme, die es nicht gibt, muss laut sein.
 */
const LAUF_START = Date.now();
function schreibenUndPruefen(datei, daten) {
  writeFileSync(datei, daten);
  const st = statSync(datei);
  if (st.mtimeMs < LAUF_START || st.size < 1000) {
    throw new Error(`Aufnahme ${datei} ist nicht aus diesem Lauf (mtime ${new Date(st.mtimeMs).toISOString()}, ${st.size} Bytes).`);
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
// Der 4x4-Satz des gewaehlten Entwurfs, gefuellt beim Spielaufbau.
let verbindungen = null;

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
  ablauf:     { ruhe: 1500, aufbau: 'spiel', weg: async (h) => { await h.zuRegelIndex(1); } },
  joker:      { ruhe: 1200, aufbau: 'spiel', weg: async (h) => { await h.zuRegelIndex(2); } },
  regel4:     { ruhe: 1200, aufbau: 'spiel', weg: async (h) => { await h.zuRegelIndex(3); } },
  // Der Team-Auftritt braucht bei acht Teams rund 18 s, bis er steht.
  teams:      { ruhe: 18000, aufbau: 'spiel', weg: async (h) => { await h.zuRegelIndex(0); await h.emit('qq:rulesFinish'); } },
  // Das Runden-Intro hat drei Stufen, der Moderator schaltet mit Space weiter
  // (`qq:activateQuestion`): 0 = ganzer Abend im Blick, 1 = Kamera faehrt auf
  // die laufende Runde, 2 = Baum blendet aus, Kategorie kommt.
  rundenintro:{ ruhe: 4000,  aufbau: 'spiel', weg: async (h) => { await h.zumRundenIntro(); } },
  rundenintro2:{ruhe: 3000,  aufbau: 'spiel', weg: async (h) => { await h.zumRundenIntro(); await sleep(1800); await h.emit('qq:activateQuestion'); } },
  rundenintro3:{ruhe: 3000,  aufbau: 'spiel', weg: async (h) => { await h.zumRundenIntro(); await sleep(1800); await h.emit('qq:activateQuestion'); await sleep(900); await h.emit('qq:activateQuestion'); } },
  // Ab hier der eigentliche Abend. `zurFrage` steppt durch das Runden-Intro
  // bis die Frage steht; danach reicht ein Ereignis pro Station.
  frage:      { ruhe: 2500, aufbau: 'spiel', weg: async (h) => { await h.zurFrage(); } },
  // frage2..frage5 bauen AUF der vorigen Ansicht auf: in einem Aufruf
  // (`frage frage2 frage3 frage4 frage5`) laeuft eine Runde durch und man sieht
  // alle fuenf Kategorien, ohne fuenfmal ein Spiel aufzusetzen. Mit
  // abgeschaltetem Mischen ist die Reihenfolge die des Entwurfs.
  frage2:     { ruhe: 2500, aufbau: 'spiel', weg: async (h) => { await h.naechsteFrage(); } },
  frage3:     { ruhe: 2500, aufbau: 'spiel', weg: async (h) => { await h.naechsteFrage(); } },
  frage4:     { ruhe: 2500, aufbau: 'spiel', weg: async (h) => { await h.naechsteFrage(); } },
  frage5:     { ruhe: 2500, aufbau: 'spiel', weg: async (h) => { await h.naechsteFrage(); } },
  // Die Auflösung hat zwei Bilder: erst zeigt sie, WER was getippt hat, dann
  // markiert sie die richtige Antwort. Der zweite Schritt haengt an einem
  // kategorie-eigenen Ereignis (`qq:muchoRevealStep`, `qq:zvzRevealStep`,
  // `qq:cheeseRevealStep`) — ohne das sieht man nur das halbe Bild.
  aufloesung: { ruhe: 6000, aufbau: 'spiel', weg: async (h) => { await h.zurFrage(); await h.antworten(); await sleep(600); await h.emit('qq:revealAnswer'); } },
  aufloesung2:{ ruhe: 6000, aufbau: 'spiel', weg: async (h) => {
    await h.zurFrage(); await h.antworten(); await sleep(600); await h.emit('qq:revealAnswer'); await sleep(1600);
    for (const ev of ['qq:muchoRevealStep', 'qq:zvzRevealStep', 'qq:cheeseRevealStep', 'qq:mapRevealStep']) {
      await h.emit(ev); await sleep(200); await h.emit(ev); await sleep(200);
    }
  } },
  // Ab hier der Abend NACH dem Brett. Diese Stationen liegen weit hinten,
  // deshalb springt der Harness ueber `dev/skipTo` dorthin, statt vier Runden
  // nachzuspielen. Das fuellt das Brett mit, sonst stehen die Endfolien auf
  // einem leeren Spielfeld und zeigen nicht, was sie am Abend zeigen.
  pause:      { ruhe: 2500, aufbau: 'spiel', weg: async (h) => { await h.zurFrage(); await h.emit('qq:pause'); } },
  // CozyGame hat fuenf Stufen: INTRO, Rad dreht, Rad steht (Spiel-Karte),
  // Spiel laeuft (Timer), Sieger waehlen. `--stufe=n` waehlt den Schritt.
  //
  // 2026-08-23: hier lag ein Fehler, der drei Aufnahmen still gefaelscht hat.
  // Die Schleife hat einfach n mal `qq:cozyGameAdvance` im Abstand von 1,2
  // Sekunden geschickt. Das Rad LANDET aber nicht auf Zuruf: der Server setzt
  // beim Verlassen von INTRO einen Timer auf 6,5 Sekunden (passend zur
  // CSS-Dauer im WheelView) und schaltet erst dann auf WHEEL_RESULT. Jedes
  // Advance, das waehrend WHEEL_SPIN ankommt, faellt im Handler durch alle
  // Zweige und tut nichts. Ergebnis: --stufe=2, 3 und 4 zeigten alle dasselbe
  // drehende Rad, und es sah aus wie „die Aufnahmen kommen nicht".
  // Deshalb jetzt eine echte Treppe, die auf das Landen wartet.
  // 2026-08-23: acht der achtzehn Spiele laufen REIHUM statt gleichzeitig
  // (`parallel: false`), und die haben eine eigene Ansicht mit Warteschlange.
  // Das Rad wuerfelt, welches Spiel kommt - deshalb bekommt der Pool hier nur
  // Reihum-Spiele, sonst braucht man mehrere Laeufe, bis eines davon faellt.
  cozyseq:    { ruhe: 3500, aufbau: 'spiel', nurReihum: true, weg: async (h) => {
    await h.zurFrage(); await h.emit('qq:cozyGameStart', { slotKind: 'roundPause' });
    await sleep(600); await h.emit('qq:cozyGameAdvance');   // INTRO -> Rad dreht
    await sleep(7200);                                       // Server landet selbst
    await h.emit('qq:cozyGameAdvance'); await sleep(900);    // -> Spiel laeuft
  } },
  cozygame:   { ruhe: 3000, aufbau: 'spiel', weg: async (h) => {
    await h.zurFrage(); await h.emit('qq:cozyGameStart', { slotKind: 'roundPause' });
    if (STUFE >= 2) { await sleep(600); await h.emit('qq:cozyGameAdvance'); }  // INTRO -> Rad dreht
    if (STUFE >= 3) await sleep(7200);                                          // Server landet selbst
    if (STUFE >= 4) { await h.emit('qq:cozyGameAdvance'); await sleep(600); }   // -> Spiel laeuft
    if (STUFE >= 5) { await h.emit('qq:cozyGameAdvance'); await sleep(600); }   // -> Sieger waehlen
  } },
  // 2026-08-23: die Ansichten `connections` / `connections2` sind wieder raus.
  // Das 4x4-Finale („Grosses Finale") ist abgeschaltet - siehe
  // QQ_CONNECTIONS_ENABLED in shared/quarterQuizTypes.ts. Eine Aufnahme davon
  // waere eine Aufnahme von etwas, das am Abend niemand sieht.
  // Die Wetten-Phase hat zwei Bilder: erst die Titelkarte („Final-Tipp"), dann
  // die Tafel, auf der die Teams setzen. Der Wechsel haengt an
  // `qq:finishFinalBettingIntro`.
  finalwette: { ruhe: 3500, aufbau: 'spiel', weg: async (h) => { await h.springe('final-bet'); } },
  finalwette2:{ ruhe: 4000, aufbau: 'spiel', weg: async (h) => {
    await h.springe('final-bet'); await sleep(900); await h.emit('qq:finishFinalBettingIntro');
  } },
  finalaufloesung: { ruhe: 4000, aufbau: 'spiel', weg: async (h) => { await h.springe('final-reveal'); } },
  // Die Siegerehrung ist NICHT die Phase GAME_OVER. 2026-08-23 im Code
  // nachgelesen: der letzte Schritt der Final-Aufloesung geht direkt auf THANKS
  // („kein GAME_OVER mehr - Wolfs Wunsch, die Punkte nicht wieder und wieder
  // zeigen"). GAME_OVER erreicht man nur ueber das 4x4-Finale oder das Stechen.
  // Die Ehrung selbst laeuft also als Schritt-Folge INNERHALB von FINAL_REVEAL:
  // Brett, Wetten, Auszeichnungen, Rangliste. `--stufe=n` waehlt den Schritt.
  siegerehrung: { ruhe: 4000, aufbau: 'spiel', weg: async (h) => {
    await h.springe('final-reveal'); await sleep(900);
    for (let i = 0; i < STUFE; i++) { await h.emit('qq:nextQuestion'); await sleep(950); }
  } },
  // 2026-08-23: Spielende und Stechen. Beide waren bis dahin NIE aufgenommen,
  // weil sie im echten Ablauf nur ueber einen Gleichstand am Spielende
  // erreichbar sind - und den kann man nicht bestellen. `dev/skipTo` kennt
  // dafuer jetzt zwei eigene Ziele. Beim Stechen schaltet `--stufe=2` auf die
  // Aufloesung (Zahlen + Sieger) weiter, `--stufe=3` von dort auf das
  // Spielende, genau wie Wolfs Leertaste es tut.
  spielende:  { ruhe: 3500, aufbau: 'spiel', weg: async (h) => { await h.springe('game-over'); } },
  stechen:    { ruhe: 3500, aufbau: 'spiel', weg: async (h) => {
    await h.springe('stechen');
    for (let i = 1; i < STUFE; i++) { await sleep(1400); await h.emit('qq:nextQuestion'); }
  } },
  danke:      { ruhe: 3000, aufbau: 'spiel', weg: async (h) => {
    await h.springe('final-reveal'); await sleep(900);
    for (let i = 0; i < 20; i++) {
      await h.emit('qq:nextQuestion');
      await sleep(950);
      if (await phase() === 'THANKS') break;
    }
  } },
  brett:      { ruhe: 3000, aufbau: 'spiel', weg: async (h) => {
    await h.zurFrage(); await sleep(600); await h.emit('qq:revealAnswer'); await sleep(900);
    await h.emit('qq:startPlacement');
  } },
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

takt('Backend geprueft');
// 2026-08-23 gemessen: das erste `goto` kostete 15 s. Nicht der Server (ein
// `curl` auf dieselbe Seite braucht 15 ms), sondern der Browser, der bei Vite
// im Entwicklungsmodus mehrere hundert Module einzeln holt. Ein frischer
// Kontext hat jedes Mal einen leeren Zwischenspeicher.
// Also ein Profil auf der Platte, das ueber Laeufe hinweg bestehen bleibt.
const PROFIL = '.shots/.browser-profil';
const ctx = await chromium.launchPersistentContext(PROFIL, {
  args: ['--no-sandbox'],
  ...(process.env.QQ_CHROME ? { executablePath: process.env.QQ_CHROME } : {}),
  viewport: { width: 1760, height: 990 },
  deviceScaleFactor: 1,
});
const browser = ctx.browser() ?? { close: () => ctx.close() };
await ctx.addInitScript(({ pin }) => {
  try {
    sessionStorage.setItem('qq_admin_unlocked', '1');
    sessionStorage.setItem('qq_admin_pin', pin);
    localStorage.setItem('qq-admin-pin', pin);
  } catch { /* ignore */ }
}, { pin: PIN });

takt('Browser gestartet');
const beamer = ctx.pages()[0] ?? await ctx.newPage();
beamer.on('pageerror', e => console.log('  [beamer PAGEERROR]', String(e).slice(0, 160)));
await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });
takt('goto zurueck');
// Warten, bis der Raum wirklich steht, statt pauschal zwei Sekunden.
await beamer.waitForSelector('[data-qq-room]', { timeout: 20000 }).catch(() => {});

takt('Seite geladen');
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
takt('Socket verbunden');

const phase = () => beamer.evaluate(() =>
  document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? null).catch(() => null);

/** Regel-Index anfahren. Der Server kennt nur weiter/zurueck, also zaehlen wir
 *  von einem bekannten Ende aus: `rulesFinish` setzt auf 0, davor liegen -1
 *  (Regel-Intro) und -2 (Willkommen). */
// 2026-08-23, sonst laufen mehrere Ansichten in einem Durchgang auseinander:
// der Stand muss mitgezaehlt werden. Vorher rechnete jede Ansicht von -2 los,
// also landete `regeln` nach `regelintro` auf Index 1 statt 0 — und ich habe
// zweimal die falsche Folie angeschaut, ohne es zu merken.
let regelStand = -2;
const helfer = {
  emit,
  /** Weit nach hinten springen, ohne vier Runden nachzuspielen.
   *  `dev/skipTo` fuellt dabei das Brett mit Besitz, damit die Endfolien nicht
   *  auf einem leeren Spielfeld stehen. Ziele: phase-2/3/4, final-bet,
   *  final-reveal. */
  async springe(ziel) {
    const r = await fetch(`${API}/api/qq/${encodeURIComponent(roomCode)}/dev/skipTo`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: ziel, pin: PIN }),
    });
    if (!r.ok) console.log('  skipTo:', r.status, (await r.text()).slice(0, 140));
    await sleep(900);
  },
  /** Antworten der Bots erzwingen, statt auf den Zufall zu hoffen.
   *  2026-08-23: die Aufloesung zeigt Siegerband, Zeit-Pillen und Sieger-Rahmen
   *  nur, wenn ueberhaupt jemand richtig lag. Drei Laeufe hintereinander hatte
   *  kein einziges Bot-Team die richtige Antwort, also war die halbe Folie im
   *  Bild gar nicht zu sehen. `dev/simAnswers` setzt eine Quote, damit die
   *  Aufnahme zeigt, was auf der Buehne wirklich steht. */
  async antworten(quote = ANTWORTEN) {
    if (quote <= 0) return;
    const r = await fetch(`${API}/api/qq/${encodeURIComponent(roomCode)}/dev/simAnswers`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correctRate: quote, stagger: true, pin: PIN }),
    });
    if (!r.ok) console.log('  simAnswers:', r.status, (await r.text()).slice(0, 120));
    await sleep(700);
  },
  /** Eine Frage weiter. Der Server verlangt erst `nextQuestion`, danach
   *  fuehrt `activateQuestion` durch das kurze Zwischenbild (Kategorie) bis
   *  die Frage steht. Wie viele Schritte das sind, haengt daran, ob die
   *  Kategorie schon dran war — also wird gefragt statt geraten. */
  async naechsteFrage() {
    // `qq:nextQuestion` verlangt PLACEMENT oder QUESTION_REVEAL. Aus der
    // laufenden Frage heraus muss also erst aufgeloest werden, sonst passiert
    // nichts und man knipst dreimal dieselbe Folie (2026-08-23 genau so
    // passiert, der Fragezaehler stand dreimal auf 01/15).
    if (await phase() === 'QUESTION_ACTIVE') { await emit('qq:revealAnswer'); await sleep(600); }
    await emit('qq:nextQuestion');
    await sleep(700);
    for (let i = 0; i < 4; i++) {
      if (await phase() === 'QUESTION_ACTIVE') break;
      await emit('qq:activateQuestion');
      await sleep(800);
    }
  },
  /** Bis die Frage wirklich sichtbar ist. Das Runden-Intro hat drei Stufen,
   *  jede kostet ein `qq:activateQuestion`; das vierte startet die Frage. */
  async zurFrage() {
    await this.zumRundenIntro();
    await sleep(1600);
    for (let i = 0; i < 3; i++) { await emit('qq:activateQuestion'); await sleep(700); }
  },
  async zumRundenIntro() {
    await this.zuRegelIndex(0);
    await emit('qq:rulesFinish');
    await sleep(400);
    await emit('qq:teamsRevealFinish');
  },
  async zuRegelIndex(ziel) {
    while (regelStand > ziel) { await emit('qq:rulesPrev'); regelStand--; await sleep(120); }
    while (regelStand < ziel) { await emit('qq:rulesNext'); regelStand++; await sleep(120); }
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
    takt('  fillTeams');
    await emit('qq:setSetupDone', { value: true });
    takt('  setSetupDone');
    aufbauStand = 'lobby';
    await sleep(800);
  }
  if (stufe === 'spiel' && aufbauStand === 'lobby') {
    const drafts = await fetch(`${API}/api/qq/drafts`).then(r => r.json());
    takt('  Entwuerfe geladen');
    // 2026-08-23: --entwurf waehlt gezielt einen Entwurf. Ohne das nimmt der
    // Harness den ersten Nicht-Arena-Entwurf, und der hat nicht jedes
    // Bunte-Tuete-Unterspiel. Fuer Top 5, Fix It und Pin It braucht man einen
    // Entwurf, in dem sie ueberhaupt vorkommen (qq-vol-1 hat alle vier).
    const d = (ENTWURF ? drafts.find(x => x.id.includes(ENTWURF)) : null)
      ?? drafts.find(x => !/arena/i.test(x.id)) ?? drafts[0];
    if (ENTWURF && !d.id.includes(ENTWURF)) console.log(`  Entwurf „${ENTWURF}" nicht gefunden, nehme ${d.id}`);
    // 2026-08-23: der Raum mischt die fuenf Fragen einer Runde standardmaessig
    // (`shuffleQuestionsInRound`, Vorgabe true). Deshalb wuerfelte jeder Lauf
    // eine andere Kategorie, und mein Vorziehen lief ins Leere. Fuer eine
    // Aufnahme will man das Gegenteil von Zufall.
    await emit('qq:setQuizOptions', { shuffleQuestionsInRound: false });
    let fragen = d.questions;
    if (KATEGORIE) {
      // Nicht filtern, sondern VORZIEHEN: der Spielplan braucht weiterhin alle
      // Fragen, sonst stimmen Rundenlaenge und Baum nicht mehr.
      const passt = (q) => (q.bunteTuete?.kind ?? q.category) === KATEGORIE || q.category === KATEGORIE;
      const vorn = fragen.filter(passt);
      if (!vorn.length) console.log(`  Kategorie „${KATEGORIE}" kommt im Entwurf nicht vor.`);
      else fragen = [...vorn, ...fragen.filter(q => !passt(q))];
    }
    if (BILD) {
      // 2026-08-23: Schau mal hat zwei Layouts, und welches laeuft, entscheidet
      // das Seitenverhaeltnis des Fotos. In den Test-Entwuerfen haengen an den
      // Schau-mal-Fragen entweder gar keine Bilder oder Wikimedia-URLs, und
      // Wikimedia ist von hier aus gesperrt (403 ueber den Proxy). Also legen
      // wir fuer die Aufnahme ein Bild aus dem eigenen Ordner unter, hochkant
      // oder quer, und setzen `cheeseLayout` mit — die Auto-Erkennung misst
      // sonst erst nach dem Laden und das Layout springt im Bild.
      const quelle = BILD === 'hoch' ? QUELLE_HOCH : QUELLE_QUER;
      let n = 0;
      fragen = fragen.map(q => {
        if (q.category !== 'CHEESE') return q;
        n++;
        return { ...q, image: { ...(q.image ?? {}), url: quelle, layout: 'fullscreen', cheeseLayout: BILD === 'hoch' ? 'portrait' : 'landscape' } };
      });
      console.log(`  ${n} Schau-mal-Fragen auf ${quelle} gesetzt (${BILD})`);
    }
    await emit('qq:setTestMode', { value: true });
    takt('  Testmodus');
    await emit('qq:startGame', {
      questions: fragen, language: SPRACHE, phases: d.phases ?? 4,
      draftId: d.id, draftTitle: d.title,
    });
    // 2026-08-23: CozyGame und das 4x4-Finale sind pro Raum schaltbar und im
    // Testentwurf aus - `qq:cozyGameStart` lief deshalb in einen Fehler
    // („Pool ist leer") und die Folien waren gar nicht erreichbar.
    // WICHTIG: erst NACH `startGame` setzen. `startGame` schreibt die Optionen
    // aus seinem eigenen Payload und wuerde ein vorher gesetztes Flag wieder
    // ueberschreiben; genau daran lief mein erster Versuch ins Leere.
    // 2026-08-23 (Wolf: „man kann die CozyGames im Moderator-Panel
    // aktivieren"). Stimmt - der Schalter fuellt den Pool aber aus MongoDB, und
    // hier laeuft der In-Memory-Fallback, also blieb er leer. Der Ausweg stand
    // die ganze Zeit im Repo: `COZY_GAME_V1_SEED_IDS` in shared/cozyGameTypes.
    // Die Ids gehen direkt als Pool mit, dann braucht der Aufbau keine
    // Datenbank.
    await emit('qq:setQuizOptions', {
      cozyGamesEnabled: true,
      cozyGamesPool: NUR_REIHUM
        ? ['cg-ballon-puste', 'cg-muenz-kante', 'cg-karten-haus', 'cg-sport-stacking',
           'cg-bierdeckel-muenzen', 'cg-ringwurf', 'cg-gummi-pyramide', 'cg-getraenk-halbieren']
        : COZY_SEED_IDS.slice(0, 8),
    });
    // Den 4x4-Satz aus dem Entwurf merken, die Ansicht braucht ihn als Payload.
    verbindungen = d.connections ?? null;
    console.log(`Spiel gestartet mit „${d.title}"`);
    takt('Spiel gestartet');
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
// gemessen 11,8 s (Schriften, erster Anstrich, sharp kalt), jede weitere gut
// eine. Ohne dieses Aufwaermen faellt der ganze Aufschlag auf die erste Marke
// einer Serie, und alles danach liegt hinter dem Ende der Bewegung.
// 2026-08-23: nur noch BEI EINER SERIE. Fuer eine einzelne Aufnahme ist die
// Zeit egal, da wird nur ein Endzustand geknipst — und 11,8 s waren fast ein
// Drittel jedes Laufs.
if (marken) { await knipsen(beamer); takt('aufgewaermt'); }

/** Kaesten und Farben direkt aus dem DOM lesen. Schneller und ehrlicher als
 *  im Bild suchen: das Bild kann eine Compositing-Ebene veraltet zeigen, das
 *  DOM nie. */
async function messen(page, selektoren) {
  const werte = await page.evaluate((sel) => sel.split(',').flatMap(s0 => {
    const s = s0.trim();
    if (!s) return [];
    // Alle Treffer, nicht nur den ersten: fuer Layout-Fragen („wo kommt der
    // leere Streifen her?") braucht man die Geschwister, nicht ein Element.
    const treffer = Array.from(document.querySelectorAll(s)).slice(0, 12);
    if (!treffer.length) return [{ sel: s, fehlt: true }];
    return treffer.map((e, i) => {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return {
        sel: treffer.length > 1 ? `${s} #${i}` : s,
        kasten: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
        farbe: cs.color,
        grund: cs.backgroundImage !== 'none' ? cs.backgroundImage.slice(0, 40) : cs.backgroundColor,
        schrift: cs.fontSize,
        text: (e.textContent || '').trim().slice(0, 40),
        stil: (e.getAttribute('style') || '').slice(0, 120),
      };
    });
  }), selektoren);
  for (const w of werte) {
    if (w.fehlt) { console.log(`     ${w.sel}: nicht da`); continue; }
    console.log(`     ${w.sel}: x${w.kasten[0]} y${w.kasten[1]} ${w.kasten[2]}x${w.kasten[3]}  Schrift ${w.schrift}  Farbe ${w.farbe}  Grund ${w.grund}${w.text ? '  Text „' + w.text + '"' : '  (leer)'}${w.stil ? '\n        stil: ' + w.stil : ''}`);
  }
}

for (const name of liste) {
  const a = ANSICHTEN[name];
  await aufbauen(a.aufbau);
  await a.weg(helfer);
  takt(`${name}: Ereignisse geschickt`);
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
      schreibenUndPruefen(datei, await knipsen(beamer));
      console.log(`  ✓ ${datei}   (Wunsch ${ms} ms)`);
    }
  } else {
    await sleep(RUHE ?? a.ruhe);
    const datei = `${OUT}/V-${name}.png`;
    schreibenUndPruefen(datei, await knipsen(beamer));
    console.log(`  ✓ ${datei}   (Phase ${await phase()})`);
  }
  if (DOM) await messen(beamer, DOM);
  takt(`${name}: fertig`);
}

sock.close();
await ctx.close();
console.log(`\nfertig, ${liste.length} Ansichten → ${OUT}/`);
