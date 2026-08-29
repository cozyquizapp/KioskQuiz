/* crowd-abgleich — spricht CrowdQuiz die Sprache des Standarddesigns?
 *
 * 2026-08-28, Wolf: „heisst das fuer den Umbau ich sollte jede einzelne Seite
 * ueberpruefen, oder vergleichst du cozyquiz mit crowd und passt an? es
 * muesste auch so design regeln geben an die du dich halten kannst?"
 *
 * Ja, die gibt es, und sie stehen geschrieben. Dieses Werkzeug prueft die
 * Regeln, die MASCHINELL entscheidbar sind, ueber alle CrowdQuiz-Stationen und
 * legt daneben einen Kontaktbogen, damit der Rest in EINEM Blick geht statt
 * Folie fuer Folie.
 *
 * ── Was geprueft wird, und woher die Regel kommt ──────────────────────────
 *
 * 1. SCHRIFT. Die Buehne faehrt Bricolage Grotesque (`--qq-font`, qqTheme.ts,
 *    entschieden 2026-08-26 „ja die isses bricolage") und League Spartan fuer
 *    die Wortmarke (`--font-brand`, 2026-07-08, deckungsgleich mit
 *    cozywolf.de). Alles andere auf der Buehne ist ein Rest: Nunito ist die
 *    alte Cozy-Schrift, Cinzel die Kolosseum-Schrift.
 *
 * 2. SCHEIN. Uebergabe 2a hat das Gluehen ueberall abgeschafft (Timer,
 *    Sieger-Zeile, Zwischenstand). Begruendung im Code: auf 2,8 m ist ein
 *    Schein kein Leuchten, sondern ein Hof, der die Kante auffrisst. Gesucht
 *    werden Schatten mit grosser Streuung in einer Buntfarbe.
 *
 * ── Und was ausdruecklich nur ein HINWEIS ist ─────────────────────────────
 * Zwei Dinge sehen nach Regel aus und sind keine. Sie werden gelistet, damit
 * das Auge sie prueft, und zaehlen NICHT ins Urteil:
 *
 * A. PINK ausserhalb des Timers. Die Regel dahinter stimmt (Wolf 2026-08-24:
 *    „pinke schrift passt hier nicht mehr so gut ins design"; Pink bedeutet auf
 *    der Buehne „unter zehn Sekunden"). Maschinell entscheidbar ist sie
 *    trotzdem nicht: `#EC4899` ist GLEICHZEITIG die Markenfarbe UND die
 *    Fraktionsfarbe des Slots `cow`, in CrowdQuiz also „Einspruch"
 *    (shared/quarterQuizTypes.ts:1836). Der erste Lauf am 28.08. hat genau das
 *    gemeldet: zwei Treffer, beide Fehlalarm, beide einfach das Team, das nun
 *    mal pink heisst. Ein Werkzeug, das die Teamfarbe anmeckert, wird nach dem
 *    zweiten Lauf ignoriert.
 *
 * B. FLAECHE MIT RAND. `[data-qq-stage='2a']` in main.css setzt
 *    `--qq-card-bg: transparent` und `--qq-card-border: none`. Wer trotzdem
 *    beides traegt, hat es hart hingeschrieben - so waren die
 *    CrowdQuiz-Fraktionskarten zu finden. Aber main.css unterscheidet zwei
 *    Rollen, die gleich aussehen: RAHMEN (ein Fenster um eine Folie, soll weg)
 *    und FELD (die Form eines einzelnen Gegenstands, soll bleiben, siehe
 *    `--qq-feld-*`). Welche von beiden vorliegt, entscheidet die Bedeutung,
 *    nicht die Groesse: der erste Lauf hat die 284x54-Pille „Ein Handy pro
 *    Gruppe" gemeldet, und die ist ein Feld. Deshalb Liste, kein Urteil.
 *
 * ⚠️ EHRLICHE GRENZE. Das Werkzeug findet Regelverstoesse, nicht „sieht alt
 * aus". Der Arena-Emoji ueber der Wortmarke war KEIN Verstoss - er verletzte
 * keine geschriebene Regel, Wolf musste ihn ansagen. Deshalb der Kontaktbogen:
 * was die Regeln nicht fangen, faengt ein Blick auf alle Folien nebeneinander.
 *
 * NUTZUNG:
 *   node scripts/crowd-abgleich.mjs                 # alle Stationen
 *   node scripts/crowd-abgleich.mjs frage zwischenstand
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

/**
 * Der CrowdQuiz-Abend.
 *
 * ⚠️ 2026-08-29, Wolf beim Mitlesen eines Messbildes: „warte finalphase? es
 * gibt kein wager in crowd quiz?" Er hatte recht, und der Fehler stand HIER.
 * Vier der siebzehn Stationen sind CozyQuiz-Mechanik und in CrowdQuiz
 * unerreichbar:
 *
 *   zwischenstand    faehrt `final-bet` von Hand an und schaltet die Wette
 *                    durch (`finishFinalBettingIntro`, `finishFinalBetting`).
 *   finalwette       dasselbe, nur frueher angehalten.
 *   finalaufloesung  die Aufloesung ebendieser Wette.
 *   kartoffel        Heisse Kartoffel, laeuft reihum mit Ausscheiden.
 *
 * Alle vier sind im Grossformat abgeschaltet, und zwar hart: der Final-Wager
 * samt Connections und Comeback in qqRooms.ts (`if (room.largeGroupMode)`),
 * die Heisse Kartoffel als Filter auf dem Fragensatz beim Spielstart
 * (QQ_BUNTE_TUETE_COZY_ONLY). Der Harness hat diese Riegel umgangen, weil er
 * per `springe` mitten in die Phase faehrt, statt sie sich ergeben zu lassen.
 *
 * Ergebnis: das Werkzeug hat CrowdQuiz durch Ansichten geschickt, die es an
 * keinem Abend zeigt, und ich habe die Bilder fuer bare Muenze genommen.
 * Dieselbe Falle wie am 28.08., als der erste Abgleich ein CrowdQuiz mass,
 * das es nicht gab. Merksatz fuer das naechste Mal: eine Station ist kein
 * Beweis, dass es die Ansicht gibt - `springe` glaubt alles.
 *
 * Kein `brett`: im Grossformat gibt es kein Gitter, die Wertung laeuft als
 * Bar-Race. Dessen Ansichten haengen an `spielende` und `siegerehrung`.
 */
// ⚠️ Zweiter Fund desselben Laufs, und wieder das Werkzeug: `frage2` stand
// hier und zeigte den Willkommens-Schirm statt einer Frage
// (.shots/crowd-abgleich/frage2.png). Der Grund steht in der Stationstabelle
// von lib/buehne.mjs: „frage2..frage5 bauen AUF der vorigen Ansicht auf" - ihr
// Weg ist nur `naechsteFrage()`. Dieses Werkzeug baut aber pro Station einen
// FRISCHEN Raum (siehe die Schleife weiter unten, aus gutem Grund), also
// schaltet der Schritt von nichts weiter und landet im Vor-Spiel-Zustand.
//
// Merksatz: aufbauende Stationen und frischer Raum je Station schliessen sich
// aus. Betroffen waeren ausserdem frage3..frage5, aufloesung2, rundenintro2,
// rundenintro3 und rundenintroR2b.
const ABEND = [
  'lobby', 'willkommen', 'regeln', 'ablauf', 'teams',
  'rundenintro', 'frage', 'aufloesung',
  'pause', 'spielende', 'danke',
];

/** Stationen, die auf ihrer Vorgaengerin aufbauen. Mit frischem Raum je
 *  Station liefern sie ein Bild aus einem ganz anderen Teil des Abends. */
const AUFBAUEND = ['frage2', 'frage3', 'frage4', 'frage5', 'aufloesung2',
  'rundenintro2', 'rundenintro3', 'rundenintroR2b'];

/** Was hier steht, gibt es in CrowdQuiz nicht. Wer es trotzdem auf der
 *  Aufrufzeile mitgibt, bekommt eine Warnung statt eines stillen Bildes. */
const NUR_COZYQUIZ = {
  zwischenstand:   'Final-Wager, in CrowdQuiz aus (qqRooms.ts, largeGroupMode)',
  finalwette:      'Final-Wager, in CrowdQuiz aus (qqRooms.ts, largeGroupMode)',
  finalaufloesung: 'Final-Wager, in CrowdQuiz aus (qqRooms.ts, largeGroupMode)',
  kartoffel:       'Heisse Kartoffel, in CrowdQuiz herausgefiltert (QQ_BUNTE_TUETE_COZY_ONLY)',
  turmbau:         'Turm-Finale, CrowdQuiz hat eine eigene Siegerehrung',
  brett:           'Spielbrett, CrowdQuiz hat keins',
  // ⚠️ 2026-08-29, von Wolf am Kontaktbogen gefunden, nicht von den Regeln:
  // „tipps abgegeben, das duerfte es in CrowdQuiz nicht geben". Er hatte recht,
  // und es war der VIERTE CozyQuiz-Pfad in dieser Liste, den ich uebersehen
  // hatte. `siegerehrung` faehrt `springe('final-reveal')` an, also FINAL_REVEAL
  // - eine Phase, die CrowdQuiz nie erreicht (qqRooms.ts: „Spielverlauf: Runden
  // → GAME_OVER"). Das Bild zeigte prompt ein Spielbrett mit 64 Kacheln und
  // „Tipp 1 von 5".
  //
  // Das ist der Grund, warum es den Kontaktbogen gibt: die Regeln haben diese
  // Station dreizehnmal als „✓" durchgewunken, weil Schrift und Schein darauf
  // stimmten. Was falsch war, war die ganze Folie.
  //
  // Die Siegerehrung von CrowdQuiz liegt in GAME_OVER und laeuft ueber
  // `qq:awardStep`. Sie hat ein eigenes Werkzeug: scripts/crowd-zeremonie.mjs.
  siegerehrung:    'FINAL_REVEAL, in CrowdQuiz unerreichbar. Die eigene Zeremonie: scripts/crowd-zeremonie.mjs',
};

/**
 * Stationen, fuer die CrowdQuiz einen EIGENEN Weg braucht.
 *
 * ⚠️ 2026-08-29, dritter Fund derselben Sorte an einem Tag. Die Station
 * `danke` in lib/buehne.mjs faehrt `springe('final-reveal')` an und drueckt
 * danach zwanzigmal `qq:nextQuestion`, bis die Phase THANKS ist. In CozyQuiz
 * fuehrt das durch das Turm-Finale ans Ziel. In CrowdQuiz gibt es kein
 * Turm-Finale, also haengt die Kette dort - und weil sie haengt, hing sie mal
 * hier und mal da: einmal kam die richtige Danke-Folie heraus, einmal ein
 * Standbild aus dem Turm („Nur noch zwei, Platz 2").
 *
 * Der Weg, den CrowdQuiz am Abend wirklich geht, ist kurz: GAME_OVER, und von
 * dort `qq:showThanks`. Der Server laesst das Ereignis ausdruecklich nur aus
 * GAME_OVER zu (qqSocketHandlers.ts), es kann also gar nicht in einer fremden
 * Phase landen.
 *
 * Merksatz, jetzt zum dritten Mal: eine Station der gemeinsamen Tabelle ist
 * fuer CozyQuiz gebaut. Bevor sie in einer CrowdQuiz-Liste steht, muss ihr WEG
 * geprueft werden, nicht nur ihr Ziel.
 */
const EIGENER_WEG = {
  danke: async (b) => {
    await b.helfer.springe('game-over');
    await sleep(1200);
    await b.emit('qq:showThanks');
    await sleep(1500);
  },
};

const ZIEL = '.shots/crowd-abgleich';

/** Erlaubte Schriften auf der Buehne. Alles andere ist ein Rest. */
const SCHRIFTEN = ['Bricolage Grotesque', 'League Spartan'];

/** Die Messung laeuft IM Browser. Alle Schwellen kommen als Argument herein -
 *  `page.evaluate` sieht keine Node-Konstanten (daran ist die erste Fassung
 *  von anschnitt-suche.mjs an jeder Station gestorben, und das Urteil sagte
 *  trotzdem „alles gut"). */
const MESSEN = ({ schriften }) => {
  const buehne = document.querySelector('[data-qq-buehne]');
  if (!buehne) return { fehler: 'keine Buehne' };
  const br = buehne.getBoundingClientRect();
  const s = br.height / 990;
  const y = (px) => Math.round((px - br.top) / s);

  /** Text, der wirklich diesem Element gehoert - `<style>`-Inhalte zaehlen
   *  nicht (die Buehne traegt ihr CSS als Kind-Element mit sich). */
  const eigenerText = (el) => Array.from(el.childNodes)
    .filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();

  const zahl = (c) => {
    const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
    return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
  };
  /** Pink der Marke: #EC4899 = 236,72,153. Toleranz grosszuegig, es geht um
   *  „ist das der Pink-Ton", nicht um den exakten Wert. */
  const istPink = (c) => { const v = zahl(c); return !!v && v.a > 0.3
    && Math.abs(v.r - 236) < 40 && Math.abs(v.g - 72) < 55 && Math.abs(v.b - 153) < 45; };
  /** Bunt heisst: die Kanaele liegen weit auseinander. Creme und Grau nicht. */
  const istBunt = (c) => { const v = zahl(c); if (!v || v.a < 0.25) return false;
    return Math.max(v.r, v.g, v.b) - Math.min(v.r, v.g, v.b) > 60; };

  const funde = { schrift: [], pink: [], schein: [], rahmen: [] };
  const gesehen = new Set();

  for (const el of Array.from(buehne.querySelectorAll('*'))) {
    if (!(el instanceof HTMLElement)) continue;
    const tag = el.tagName.toLowerCase();
    if (tag === 'style' || tag === 'script' || tag === 'svg') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity < 0.05) continue;
    const txt = eigenerText(el);
    const kurz = txt.replace(/\s+/g, ' ').slice(0, 28);
    const wo = `y ${y(r.top)}`;

    if (txt) {
      // 1 Schrift
      //
      // ⚠️ Nicht einfach den ERSTEN Namen im Stapel nehmen. `--font-game`
      // beginnt mit 'Twemoji Country Flags', und die Schrift hat ueberhaupt
      // keine lateinischen Zeichen - sie liefert nur Flaggen und ist genau
      // dafuer nach vorn gestellt. Der Text darunter wird also von der
      // ZWEITEN Familie gemalt, Bricolage. Der erste Volldurchlauf am
      // 29.08. hat deshalb „Wer kroent sich?" als Schriftverstoss gemeldet,
      // und das war der einzige Verstoss auf dreizehn Stationen. Ein
      // Werkzeug, dessen einziger Fund ein Fehlalarm ist, kostet mehr Zeit
      // als es spart.
      const DURCHSICHTIG = ['Twemoji Country Flags'];
      const stapel = cs.fontFamily.split(',').map(x => x.replace(/["']/g, '').trim());
      const fam = stapel.find(x => !DURCHSICHTIG.includes(x)) ?? stapel[0];
      if (!schriften.includes(fam)) {
        const k = `f|${fam}|${kurz}`;
        if (!gesehen.has(k)) { gesehen.add(k); funde.schrift.push({ fam, kurz, wo }); }
      }
      // 2 Pink. Der Timer darf: dort BEDEUTET Pink etwas.
      const imTimer = !!el.closest('[data-qq-timer]');
      if (!imTimer && istPink(cs.color)) {
        const k = `p|${kurz}`;
        if (!gesehen.has(k)) { gesehen.add(k); funde.pink.push({ farbe: cs.color, kurz, wo }); }
      }
    }
    // 3 Schein: grosse Streuung in einer Buntfarbe.
    for (const [art, wert] of [['text', cs.textShadow], ['kasten', cs.boxShadow]]) {
      if (!wert || wert === 'none') continue;
      const streu = Math.max(0, ...(wert.match(/(\d+(?:\.\d+)?)px/g) ?? []).map(v => parseFloat(v)));
      if (streu >= 20 && istBunt(wert)) {
        const k = `s|${art}|${kurz}|${Math.round(streu)}`;
        if (!gesehen.has(k)) { gesehen.add(k); funde.schein.push({ art, streu: Math.round(streu), kurz, wo }); }
      }
    }
    // 4 Rahmen: Flaeche UND Rand, obwohl die Buehne beides auf leer setzt.
    const hatFlaeche = zahl(cs.backgroundColor)?.a > 0.02;
    const randBreit = Math.max(parseFloat(cs.borderTopWidth) || 0, parseFloat(cs.borderLeftWidth) || 0);
    const randDa = randBreit > 0 && cs.borderTopStyle !== 'none' && (zahl(cs.borderTopColor)?.a ?? 0) > 0.02;
    // Nur Flaechen, in denen etwas DRIN steht (mehrere Element-Kinder). Eine
    // Pille mit Zeichen und Wort ist ein Feld, kein Rahmen - Groesse allein
    // trennt die beiden nicht.
    const kinder = Array.from(el.children).filter(k => k.tagName.toLowerCase() !== 'style').length;
    if (hatFlaeche && randDa && kinder >= 2 && r.width / s > 200 && r.height / s > 60) {
      const inhalt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28);
      const k = `r|${inhalt}|${Math.round(r.width / s)}`;
      if (!gesehen.has(k)) {
        gesehen.add(k);
        funde.rahmen.push({ b: Math.round(r.width / s), h: Math.round(r.height / s), kurz: inhalt, wo });
      }
    }
  }
  return funde;
};

// ── Lauf ──────────────────────────────────────────────────────────────────
const gewuenscht = process.argv.slice(2).length ? process.argv.slice(2) : ABEND;
const verboten = gewuenscht.filter(s => s in NUR_COZYQUIZ);
for (const s of verboten) {
  console.log(`  ⚠️ ${s}: gibt es in CrowdQuiz nicht (${NUR_COZYQUIZ[s]}). Uebersprungen.`);
}
for (const s of gewuenscht.filter(s => AUFBAUEND.includes(s))) {
  console.log(`  ⚠️ ${s}: baut auf der Vorgaengerin auf, hier bekommt aber jede`);
  console.log('     Station einen frischen Raum. Das Bild waere aus dem Vor-Spiel.');
}
const stationen = gewuenscht.filter(s => !(s in NUR_COZYQUIZ) && !AUFBAUEND.includes(s));
if (!stationen.length) { console.log('  Keine gueltige CrowdQuiz-Station uebrig.'); process.exit(1); }
fs.mkdirSync(ZIEL, { recursive: true });

const bericht = [];
const bilder = [];
for (const st of stationen) {
  // ⚠️ Pro Station ein frischer Raum. Der Zustand des Abends haengt am WEG
  // dorthin, und eine Station, die auf einer halb gespielten Runde sitzt,
  // zeigt etwas anderes als dieselbe Station frisch (2026-08-28 gemessen).
  const b = await buehneStarten({ bots: 12, frisch: true, takt: () => {}, entwurf: 'qq-vol-1', grossformat: true });
  // Grossformat VOR dem Aufbau: `largeGroupMode` baut die Teams um und leert
  // den Raum. Wer es danach schickt, misst eine leere Lobby.
  await b.emit('qq:setQuizOptions', { largeGroupMode: true, nestedTeams: true });
  // Und das Design ausdruecklich setzen: es bleibt auf Platte stehen, `frisch`
  // raeumt den Raum, nicht das Design.
  await b.emit('qq:setTheme', { themeId: 'buehne' });
  await sleep(600);
  try {
    if (EIGENER_WEG[st]) {
      // Der Aufbau bis zum Spiel bleibt der gemeinsame, nur der letzte Schritt
      // ist formatabhaengig.
      await b.aufbauen('spiel');
      await EIGENER_WEG[st](b);
    } else {
      await b.zurStation(st);
    }
    await sleep((b.stationen[st]?.ruhe ?? 2500) + 800);
    // ⚠️ Und dann warten, bis die Folie STEHT, nicht nur bis eine Zahl
    // abgelaufen ist. 2026-08-29 am Kontaktbogen aufgefallen: die Danke-Folie
    // erschien als „Allwissen - Sieger des Abends", also mitten in ihrer
    // Uebergabe (der Sieger steht erst gross, faehrt dann nach links und der
    // Endstand kommt daneben). Die feste `ruhe` traf je nach Lauf mal davor und
    // mal danach, und das Bild sah dann wie eine andere Folie aus.
    //
    // Wie viele Schritte eine Station bis zu ihrem Ziel braucht, haengt an den
    // Bots und ist nicht konstant - eine groessere feste Zahl waere also nur
    // eine bessere Wette. Stattdessen: den sichtbaren Text lesen, bis er sich
    // zweimal hintereinander nicht mehr aendert. Dann ist die Choreographie
    // durch. Deckel bei acht Sekunden, damit eine Dauerschleife (Konfetti,
    // Zaehler) den Lauf nicht anhaelt.
    {
      const lies = () => b.seite.evaluate(() =>
        (document.body.innerText || '').replace(/\s+/g, ' ')).catch(() => '');
      // ⚠️ KURZ deckeln. Der erste Anlauf wartete bis zu acht Sekunden auf
      // Stillstand - und lief damit Stationen HINTERHER, die von selbst
      // weiterschalten. Die Startaufstellung zum Beispiel geht danach in die
      // erste Frage ueber; das Werkzeug hat brav gewartet, bis auch die stand,
      // und ein Bild vom Spielbrett geliefert. Ein Wartemechanismus, der das
      // Ziel verlassen kann, ist schlimmer als gar keiner: er sieht aus wie
      // Sorgfalt und liefert die falsche Folie.
      //
      // Zweieinhalb Sekunden reichen fuer das, wofuer die Wartezeit gedacht
      // war: eine laufende Uebergabe zu Ende gehen lassen (die Danke-Folie
      // braucht rund eine Sekunde). Laenger darf sie nicht, denn die
      // Choreographie einer Station steckt schon in ihrer `ruhe`.
      let vorher = await lies();
      for (let i = 0; i < 5; i++) {
        await sleep(500);
        const jetzt = await lies();
        if (jetzt === vorher) break;
        vorher = jetzt;
      }
    }
    const f = await b.seite.evaluate(MESSEN, { schriften: SCHRIFTEN });
    const datei = `${ZIEL}/${st}.png`;
    await b.seite.screenshot({ path: datei });
    bilder.push({ st, datei });
    bericht.push({ st, ...f });
  } catch (e) {
    bericht.push({ st, fehler: String(e).slice(0, 90) });
  }
  await b.schliessen?.();
}

// ── Urteil ────────────────────────────────────────────────────────────────
const zeile = (n) => '─'.repeat(n);
console.log(`\n${zeile(72)}\nCrowdQuiz gegen die Regeln des Standarddesigns\n${zeile(72)}`);
let verstoesse = 0, kaputt = 0;
for (const r of bericht) {
  if (r.fehler) { kaputt++; console.log(`\n  ${r.st.padEnd(16)} UNGEPRUEFT: ${r.fehler}`); continue; }
  // Urteil: nur die beiden Regeln, die eindeutig sind.
  const n = r.schrift.length + r.schein.length;
  const hinweise = r.pink.length + r.rahmen.length;
  verstoesse += n;
  if (!n && !hinweise) { console.log(`  ${r.st.padEnd(16)} ✓`); continue; }
  console.log(`\n  ${r.st.padEnd(16)} ${n} Verstoss${n === 1 ? '' : 'e'}, ${hinweise} Hinweis${hinweise === 1 ? '' : 'e'}`);
  for (const x of r.schrift) console.log(`      ✗ Schrift  ${x.fam.padEnd(20)} ${x.wo}  „${x.kurz}"`);
  for (const x of r.schein)  console.log(`      ✗ Schein   ${x.art} ${String(x.streu).padStart(3)}px      ${x.wo}  „${x.kurz}"`);
  for (const x of r.pink)    console.log(`      · Pink     ${x.farbe.padEnd(20)} ${x.wo}  „${x.kurz}"  (Teamfarbe? siehe Kopf)`);
  for (const x of r.rahmen)  console.log(`      · Flaeche  ${String(x.b).padStart(4)}x${String(x.h).padEnd(4)}       ${x.wo}  „${x.kurz}"  (Rahmen oder Feld?)`);
}

// ── Kontaktbogen ──────────────────────────────────────────────────────────
// Was die Regeln nicht fangen, faengt ein Blick auf alles nebeneinander.
if (bilder.length) {
  const SP = 3, BREIT = 560, HOCH = Math.round(BREIT * 990 / 1760);
  const reihen = Math.ceil(bilder.length / SP);
  const kacheln = [];
  for (let i = 0; i < bilder.length; i++) {
    kacheln.push({
      input: await sharp(bilder[i].datei).resize(BREIT, HOCH).toBuffer(),
      left: (i % SP) * BREIT, top: Math.floor(i / SP) * HOCH,
    });
  }
  // ⚠️ Ein TEILLAUF darf den Bogen des ganzen Abends nicht ueberschreiben.
  // 2026-08-29 genau so passiert: nach dem Volldurchlauf lief ein Nachtest
  // ueber zwei Stationen, und danach lagen unter demselben Namen zwei Kacheln
  // statt dreizehn. Ich habe die Datei anschliessend als „der Abend" an Wolf
  // geschickt. Ein Bild traegt sein Zustandekommen nicht mit sich, also muss
  // der Dateiname es tun.
  const vollstaendig = stationen.length === ABEND.length
    && ABEND.every(s => stationen.includes(s));
  const bogen = vollstaendig
    ? `${ZIEL}/kontaktbogen.png`
    : `${ZIEL}/kontaktbogen-teil-${stationen.length}.png`;
  await sharp({ create: { width: BREIT * SP, height: HOCH * reihen, channels: 3, background: '#0B0912' } })
    .composite(kacheln).png().toFile(bogen);
  console.log(`\n  Kontaktbogen: ${bogen}  (${bilder.map(b2 => b2.st).join(', ')})`);
}

console.log(`\n${zeile(72)}`);
console.log(verstoesse === 0
  ? '  ✓ Kein Regelverstoss (Schrift, Schein). Der Rest steht als Hinweis da'
    + '\n    und entscheidet sich am Kontaktbogen, nicht hier.'
  : `  ✗ ${verstoesse} Regelverstoesse auf ${bericht.filter(r => !r.fehler).length} Stationen.`);
if (kaputt) console.log(`  ⚠ ${kaputt} Stationen UNGEPRUEFT - die zaehlen nicht als sauber.`);
process.exit(verstoesse === 0 && kaputt === 0 ? 0 : 1);
