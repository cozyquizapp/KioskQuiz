/**
 * lib/buehne.mjs — die Buehne aufsetzen und ansteuern. Gemeinsame Grundlage.
 *
 * WARUM (Wolf 2026-08-24: „optimiere die tools das zu capturen"): der
 * Bewegungs-Durchgang braucht dieselbe Maschine wie der Bild-Durchgang - Raum
 * aufsetzen, Spiel starten, gezielt zu einer Station fahren. Das lag bis eben
 * komplett in scripts/beamer-view.mjs, also haette ein zweites Werkzeug es
 * kopieren muessen. Zwei Kopien derselben Ablaufsteuerung waeren nach einer
 * Sitzung auseinandergelaufen, und dann misst man zwei verschiedene Abende.
 *
 * Was hier liegt: Browser, Socket, Raumaufbau, die Stationen des Abends und die
 * Helfer, die dorthin fahren. Was NICHT hier liegt: alles, was mit dem Bild
 * passiert (knipsen, messen, Grade, Kontaktbogen). Das gehoert den Werkzeugen.
 *
 * Benutzt von: scripts/beamer-view.mjs (Standbilder), scripts/motion.mjs
 * (Bewegung).
 */
import { chromium } from 'playwright';
import { createRequire } from 'node:module';

const req = createRequire(new URL('../../backend/package.json', import.meta.url));
const { io } = req('socket.io-client');

export const API = 'http://localhost:4000';
export const BASE = process.env.QQ_BASE ?? 'http://localhost:5173';
export const PIN = process.env.ADMIN_PIN || '2506';
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Die Kuerzel des Standard-Avatar-Sets (CozyQuiz). Der Moderator schickt sie
// beim Bot-Fuellen mit; ohne sie testet der Harness einen anderen Avatar-Pfad
// als der Abend (siehe Kommentar an `dev/fillTeams` weiter unten).
const SET_AVATARS = (await import('../../frontend/src/cozyquizAvatars.ts').catch(() => null))?.COZYQUIZ_SLUGS ?? [];
// Die CozyGame-Ids aus dem Repo-Seed - ohne Datenbank.
const COZY_SEED_IDS = (await import('../../shared/cozyGameTypes.ts').catch(() => null))?.COZY_GAME_V1_SEED_IDS
  ?? ['cg-ringwurf', 'cg-stift-fang', 'cg-muenz-kante', 'cg-karten-haus',
      'cg-ballon-puste', 'cg-bierdeckel-muenzen', 'cg-waescheklammer-glas', 'cg-tt-ball-sammeln'];

const QUELLE_HOCH = '/images/Johannes.jpeg';
const QUELLE_QUER = '/images/quiz-lounge-host-bg.png';

/** Vorgaben fuer alles, was die Stationen brauchen. Ein Werkzeug ueberschreibt
 *  nur, was seine Aufrufzeile hergibt. */
export const VORGABE = {
  bots: 8, sprache: 'de', kategorie: null, entwurf: null, bild: null,
  stufe: 1, antworten: 0.6, nurReihum: false, frisch: false,
  fenster: { width: 1760, height: 990 }, profil: '.shots/.browser-profil',
  takt: () => {},
};

/** Nur die Namen der Stationen - ohne Browser, fuer `--liste`. */
export function stationsNamen() {
  return Object.keys(bauStationen({ ...VORGABE }, {}));
}

/** Die Stationen des Abends. `weg` bekommt den Helfer und schickt die
 *  Ereignisse, die dorthin fuehren. `ruhe` ist die Zeit, die die
 *  Auftritts-Bewegung danach noch braucht. */
function bauStationen(cfg, umfeld) {
  const { verbindungenLesen } = umfeld;
/**
 * Die Ansichten. `weg` bekommt einen Helfer und schickt die Ereignisse, die
 * zur Ansicht fuehren. `ruhe` ist die Zeit, die die Auftritts-Bewegung danach
 * noch braucht — bewusst pro Ansicht, weil sie sehr verschieden lang sind
 * (Willkommen hat 4,4 s Choreographie, ein Regelblatt 0,6 s).
 */
return {
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
    if (cfg.stufe >= 2) { await sleep(600); await h.emit('qq:cozyGameAdvance'); }  // INTRO -> Rad dreht
    if (cfg.stufe >= 3) await sleep(7200);                                          // Server landet selbst
    if (cfg.stufe >= 4) { await h.emit('qq:cozyGameAdvance'); await sleep(600); }   // -> Spiel laeuft
    if (cfg.stufe >= 5) { await h.emit('qq:cozyGameAdvance'); await sleep(600); }   // -> Sieger waehlen
  } },
  // 2026-08-23: die Ansichten `connections` / `connections2` sind wieder raus.
  // Das 4x4-Finale („Grosses Finale") ist abgeschaltet - siehe
  // QQ_CONNECTIONS_ENABLED in shared/quarterQuizTypes.ts. Eine Aufnahme davon
  // waere eine Aufnahme von etwas, das am Abend niemand sieht.
  // Die Wetten-Phase hat zwei Bilder: erst die Titelkarte („Final-Tipp"), dann
  // die Tafel, auf der die Teams setzen. Der Wechsel haengt an
  // `qq:finishFinalBettingIntro`.
  // 2026-08-24 (Wolf: „hier auch der rahmen unten und oben", Screenshot der
  // Zwischenstand-Folie). Die Folie liegt ZWISCHEN zwei Fragen der Finalrunde
  // und ist nur ueber einen zweiten `nextQuestion` erreichbar: der erste setzt
  // finalRecapStep auf 1 (Recap zeigt), der zweite raeumt sie wieder weg.
  // 2026-08-24 v2: der erste Anlauf sprang auf `phase-3` und landete im
  // Runden-Intro. Die Folie haengt an drei Bedingungen gleichzeitig
  // (QQBeamerPage.tsx:2175): Final-Wette an, gamePhaseIndex === totalPhases
  // und finalRecapStep === 1. Nur die Finalrunde erfuellt das, und
  // finalLastSnapshot wird erst in qqStartFinalBetting gesetzt - ohne den
  // Umweg ueber die Wetten-Phase kommt der Recap-Zweig gar nicht in Frage.
  zwischenstand: { ruhe: 2500, aufbau: 'spiel', weg: async (h) => {
    await h.springe('final-bet'); await sleep(900);
    await h.emit('qq:finishFinalBettingIntro'); await sleep(2600); // Bots setzen gestaffelt
    await h.emit('qq:finishFinalBetting'); await sleep(900);       // -> PHASE_INTRO der Finalrunde
    for (let i = 0; i < 4; i++) {
      if (await h.phase() === 'QUESTION_ACTIVE') break;
      await h.emit('qq:activateQuestion'); await sleep(700);
    }
    await h.antworten(); await sleep(400);
    await h.emit('qq:revealAnswer'); await sleep(900);
    await h.platziere();
    await h.emit('qq:nextQuestion'); await sleep(900);
  } },
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
    for (let i = 0; i < cfg.stufe; i++) { await h.emit('qq:nextQuestion'); await sleep(950); }
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
    for (let i = 1; i < cfg.stufe; i++) { await sleep(1400); await h.emit('qq:nextQuestion'); }
  } },
  // 2026-08-24: der Turmbau selbst. Er liegt nicht auf einem festen Schritt -
  // vor ihm liegen so viele Wett-Slots, wie Teams gesetzt haben. Deshalb wird
  // weitergeschaltet, BIS der Turm da ist, und nicht n mal blind. Danach setzt
  // eine Serie sofort an, ohne Wartezeit: die Bewegung faengt an, sobald die
  // Folie steht, und eine feste Ruhezeit haette sie halb verpasst.
  turmfinale: { ruhe: 500, aufbau: 'spiel', weg: async (h) => {
    await h.springe('final-reveal'); await sleep(700);
    for (let i = 0; i < 24; i++) {
      const da = await h.seite().evaluate(() => !!document.body.innerText.match(/höchsten Turm|tallest tower/));
      if (da) return;
      await h.emit('qq:nextQuestion');
      await sleep(700);
    }
    console.log('  Turm-Finale nicht erreicht.');
  } },
  danke:      { ruhe: 3000, aufbau: 'spiel', weg: async (h) => {
    await h.springe('final-reveal'); await sleep(900);
    for (let i = 0; i < 20; i++) {
      await h.emit('qq:nextQuestion');
      await sleep(950);
      if (await h.phase() === 'THANKS') break;
    }
  } },
  brett:      { ruhe: 3000, aufbau: 'spiel', weg: async (h) => {
    await h.zurFrage(); await sleep(600); await h.emit('qq:revealAnswer'); await sleep(900);
    await h.emit('qq:startPlacement');
  } },
};
}

/**
 * Buehne hochfahren. Liefert Seite, Socket, Helfer und die Stationen.
 * Der Aufrufer entscheidet, was er mit dem Bild macht.
 */
export async function buehneStarten(teilCfg = {}) {
  const cfg = { ...VORGABE, ...teilCfg };
  const health = await fetch(`${API}/api/health`).then(r => r.json()).catch(() => null);
  if (!health?.ok) throw new Error('Backend nicht erreichbar auf 4000.');
  cfg.takt('Backend geprueft');

  // 2026-08-23 gemessen: das erste `goto` kostete 15 s. Nicht der Server (ein
  // `curl` auf dieselbe Seite braucht 15 ms), sondern der Browser, der bei Vite
  // im Entwicklungsmodus mehrere hundert Module einzeln holt. Ein frischer
  // Kontext hat jedes Mal einen leeren Zwischenspeicher. Also ein Profil auf
  // der Platte, das ueber Laeufe hinweg bestehen bleibt.
  const ctx = await chromium.launchPersistentContext(cfg.profil, {
    args: ['--no-sandbox'],
    ...(process.env.QQ_CHROME ? { executablePath: process.env.QQ_CHROME } : {}),
    viewport: cfg.fenster,
    deviceScaleFactor: 1,
  });
  await ctx.addInitScript(({ pin }) => {
    try {
      sessionStorage.setItem('qq_admin_unlocked', '1');
      sessionStorage.setItem('qq_admin_pin', pin);
      localStorage.setItem('qq-admin-pin', pin);
    } catch { /* ignore */ }
  }, { pin: PIN });
  cfg.takt('Browser gestartet');

  const beamer = ctx.pages()[0] ?? await ctx.newPage();
  beamer.on('pageerror', e => console.log('  [beamer PAGEERROR]', String(e).slice(0, 160)));
  await beamer.goto(`${BASE}/beamer`, { waitUntil: 'domcontentloaded' });
  cfg.takt('goto zurueck');
  await beamer.waitForSelector('[data-qq-room]', { timeout: 20000 }).catch(() => {});
  cfg.takt('Seite geladen');

  const roomCode = await beamer.evaluate(() =>
    document.querySelector('[data-qq-room]')?.getAttribute('data-qq-room') ?? 'default').catch(() => 'default');

  const sock = io(API, { transports: ['websocket'] });
  await new Promise((res, rej) => {
    sock.on('connect', res); sock.on('connect_error', rej);
    setTimeout(() => rej(new Error('Socket-Timeout')), 8000);
  });
  const emit = (ev, extra = {}) => new Promise(res => sock.emit(ev, { roomCode, ...extra }, res));
  await emit('qq:joinModerator', { pin: PIN });
  console.log(`Raum ${roomCode} verbunden`);
  cfg.takt('Socket verbunden');

  // Frischer Raum. MUSS ueber den Socket laufen, nicht ueber
  // `rm backend/.qq-rooms/*.json`: der Server schreibt seine offenen
  // Speicherungen beim Herunterfahren noch einmal weg (Kommentarkopf von
  // scripts/moderator-view.mjs).
  if (cfg.frisch) {
    console.log('reset:', JSON.stringify(await emit('qq:resetRoom', { confirm: true })));
    await sleep(900);
    // 2026-08-24, zweiter Fund am selben Tag: `qq:resetRoom` setzt das SPIEL
    // zurueck, behaelt die Teams aber. `dev/fillTeams` fuegt dann nichts mehr
    // hinzu („added: 0, total: 8") und meldet trotzdem 200 - jeder Lauf erbte
    // stillschweigend die Teams des allerersten Laufs, samt deren Avataren.
    const rc = await fetch(`${API}/api/qq/${encodeURIComponent(roomCode)}/dev/clearBots`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: PIN }),
    });
    console.log('  Bots entfernt:', rc.status, (await rc.text()).slice(0, 60));
    await sleep(400);
  }

  const phase = () => beamer.evaluate(() =>
    document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? null).catch(() => null);

  // Der 4x4-Satz des gewaehlten Entwurfs, gefuellt beim Spielaufbau.
  let verbindungen = null;
  let aufbauStand = 'roh';

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
    phase,
    // 2026-08-24, Nachtrag zum Umzug hierher: zwei Stationen griffen direkt auf
    // `beamer` und `phase()` aus dem alten Modul-Sichtbereich zu. Nach dem Umzug
    // lagen beide ausserhalb, `turmfinale` und `danke` brachen ab - und weil sie
    // die LETZTEN Stationen des Abends sind, war der Schluss des Abends
    // unmessbar, ohne dass ein Lauf das deutlich gemeldet haette. Die Stationen
    // bekommen die Seite jetzt ueber den Helfer, wie alles andere auch.
    seite: () => beamer,
    /** Offene Platzierungen wegraeumen. `qq:nextQuestion` wirft sonst
     *  PLACEMENT_PENDING (qqRooms.ts:4205) und der Lauf bleibt still auf der
     *  Frage stehen - ohne Fehlermeldung im Bild. */
    async platziere() {
      for (let i = 0; i < 8; i++) {
        if (await phase() !== 'PLACEMENT') return;
        const r = await fetch(`${API}/api/qq/${encodeURIComponent(roomCode)}/dev/autoPlace`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: PIN }),
        });
        if (!r.ok) { console.log('  autoPlace:', r.status, (await r.text()).slice(0, 120)); return; }
        await sleep(700);
      }
    },
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
    async antworten(quote = cfg.antworten) {
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

  async function aufbauen(stufe) {
    if (stufe === 'roh' || aufbauStand === stufe) return;
    if (aufbauStand === 'roh' && (stufe === 'lobby' || stufe === 'spiel')) {
      // 2026-08-24 (Wolf: „heute spielen text statt avatar, es waren alle 1-8
      // teams"): genau hier lag der blinde Fleck des Harness. `setAvatars` kommt
      // im echten Ablauf vom Moderator-Frontend und enthaelt die Kuerzel des
      // AKTIVEN Sets. Der Harness hat das Feld nie mitgeschickt, der Bot-Pool war
      // damit leer, und die Bots bekamen den Fallback statt der echten Kuerzel.
      // Ergebnis: jede Aufnahme zeigte einen Avatar-Pfad, den am Abend niemand
      // sieht - und der Fehler, den Wolf gemeldet hat, war hier nicht ausloesbar.
      const r = await fetch(`${API}/api/qq/${encodeURIComponent(roomCode)}/dev/fillTeams`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: cfg.bots, pin: PIN, setAvatars: SET_AVATARS }),
      });
      if (!r.ok) console.log('  fillTeams:', r.status, await r.text());
      cfg.takt('  fillTeams');
      await emit('qq:setSetupDone', { value: true });
      cfg.takt('  setSetupDone');
      aufbauStand = 'lobby';
      await sleep(800);
    }
    if (stufe === 'spiel' && aufbauStand === 'lobby') {
      const drafts = await fetch(`${API}/api/qq/drafts`).then(r => r.json());
      cfg.takt('  Entwuerfe geladen');
      // 2026-08-23: --entwurf waehlt gezielt einen Entwurf. Ohne das nimmt der
      // Harness den ersten Nicht-Arena-Entwurf, und der hat nicht jedes
      // Bunte-Tuete-Unterspiel. Fuer Top 5, Fix It und Pin It braucht man einen
      // Entwurf, in dem sie ueberhaupt vorkommen (qq-vol-1 hat alle vier).
      const d = (cfg.entwurf ? drafts.find(x => x.id.includes(cfg.entwurf)) : null)
        ?? drafts.find(x => !/arena/i.test(x.id)) ?? drafts[0];
      if (cfg.entwurf && !d.id.includes(cfg.entwurf)) console.log(`  Entwurf „${cfg.entwurf}" nicht gefunden, nehme ${d.id}`);
      // 2026-08-23: der Raum mischt die fuenf Fragen einer Runde standardmaessig
      // (`shuffleQuestionsInRound`, Vorgabe true). Deshalb wuerfelte jeder Lauf
      // eine andere Kategorie, und mein Vorziehen lief ins Leere. Fuer eine
      // Aufnahme will man das Gegenteil von Zufall.
      await emit('qq:setQuizOptions', { shuffleQuestionsInRound: false });
      // 2026-08-24 (Wolf: „cozygames nicht im autoplay"): CozyGames sind im Raum
      // per Vorgabe AUS und kein Entwurf schaltet sie an. Ohne diese Zeile fehlt
      // im Harness die CozyGame-Regelfolie und die ganze CozyGame-Phase - man
      // prueft dann eine Folie, die es im Lauf gar nicht gibt.
      await emit('qq:setQuizOptions', { cozyGamesEnabled: true });
      let fragen = d.questions;
      if (cfg.kategorie) {
        // Nicht filtern, sondern VORZIEHEN: der Spielplan braucht weiterhin alle
        // Fragen, sonst stimmen Rundenlaenge und Baum nicht mehr.
        const passt = (q) => (q.bunteTuete?.kind ?? q.category) === cfg.kategorie || q.category === cfg.kategorie;
        const vorn = fragen.filter(passt);
        if (!vorn.length) console.log(`  Kategorie „${cfg.kategorie}" kommt im Entwurf nicht vor.`);
        else fragen = [...vorn, ...fragen.filter(q => !passt(q))];
      }
      if (cfg.bild) {
        // 2026-08-23: Schau mal hat zwei Layouts, und welches laeuft, entscheidet
        // das Seitenverhaeltnis des Fotos. In den Test-Entwuerfen haengen an den
        // Schau-mal-Fragen entweder gar keine Bilder oder Wikimedia-URLs, und
        // Wikimedia ist von hier aus gesperrt (403 ueber den Proxy). Also legen
        // wir fuer die Aufnahme ein Bild aus dem eigenen Ordner unter, hochkant
        // oder quer, und setzen `cheeseLayout` mit — die Auto-Erkennung misst
        // sonst erst nach dem Laden und das Layout springt im Bild.
        const quelle = cfg.bild === 'hoch' ? QUELLE_HOCH : QUELLE_QUER;
        let n = 0;
        fragen = fragen.map(q => {
          if (q.category !== 'CHEESE') return q;
          n++;
          return { ...q, image: { ...(q.image ?? {}), url: quelle, layout: 'fullscreen', cheeseLayout: cfg.bild === 'hoch' ? 'portrait' : 'landscape' } };
        });
        console.log(`  ${n} Schau-mal-Fragen auf ${quelle} gesetzt (${cfg.bild})`);
      }
      await emit('qq:setTestMode', { value: true });
      cfg.takt('  Testmodus');
      await emit('qq:startGame', {
        questions: fragen, language: cfg.sprache, phases: d.phases ?? 4,
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
        cozyGamesPool: cfg.nurReihum
          ? ['cg-ballon-puste', 'cg-muenz-kante', 'cg-karten-haus', 'cg-sport-stacking',
             'cg-bierdeckel-muenzen', 'cg-ringwurf', 'cg-gummi-pyramide', 'cg-getraenk-halbieren']
          : COZY_SEED_IDS.slice(0, 8),
      });
      // Den 4x4-Satz aus dem Entwurf merken, die Ansicht braucht ihn als Payload.
      verbindungen = d.connections ?? null;
      console.log(`Spiel gestartet mit „${d.title}"`);
      cfg.takt('Spiel gestartet');
      aufbauStand = 'spiel';
      await sleep(1200);
    }
  }

  const stationen = bauStationen(cfg, { verbindungenLesen: () => verbindungen });

  /** Zu einer Station fahren (Aufbau + Ereignisse). Gibt die Station zurueck,
   *  damit der Aufrufer ihre `ruhe` kennt. */
  async function zurStation(name) {
    const st = stationen[name];
    if (!st) throw new Error(`Unbekannte Station: ${name}`);
    await aufbauen(st.aufbau);
    await st.weg(helfer);
    cfg.takt(`${name}: Ereignisse geschickt`);
    return st;
  }

  async function schliessen() {
    sock.close();
    await ctx.close();
  }

  return { cfg, ctx, seite: beamer, sock, emit, phase, helfer, stationen, zurStation, aufbauen, roomCode, schliessen };
}
