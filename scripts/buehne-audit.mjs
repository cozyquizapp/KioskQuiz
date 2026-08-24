/**
 * buehne-audit.mjs — prueft die Regeln aus docs/BUEHNE_2A.md pro Ansicht.
 *
 * WARUM (2026-08-23, Wolf: „kannst du beim bewerten bitte auch ueberpruefen wie
 * gut die design bible auf den folien umgesetzt wurde, pro folie"): eine
 * Bewertung nach Gefuehl ist keine Bewertung. Ein grosser Teil der Bibel
 * besteht aus Regeln, die man ZAEHLEN kann.
 *
 * ── Warum die zweite Fassung ───────────────────────────────────────────────
 * Die erste zaehlte zeilenweise und hat dabei so viel Unsinn gemeldet, dass die
 * Zahlen wertlos waren (44 „Verstoesse" in einer Datei, beim Nachsehen fast
 * alles Kommentare). Ein Zaehler mit Fehlalarmen ist schlimmer als keiner: man
 * glaubt ihm dann auch die echten Treffer nicht mehr. Drei Konstruktionsfehler
 * lagen zugrunde, alle drei sind hier behoben:
 *
 *   1. KOMMENTARE zaehlten mit. In diesem Repo stehen die Begruendungen im
 *      Code, oft mit genau den Woertern und Zeichen, nach denen gesucht wird
 *      („der Wolf 🐺 ist raus", „kein Gold mehr"). Jetzt werden Block- und
 *      Zeilenkommentare vorher ausgeblendet - zeichenweise durch Leerzeichen
 *      ersetzt, damit Zeilennummern und Offsets stimmen bleiben.
 *
 *   2. GATING wurde pro ZEILE geprueft. Ein Stil-Ausdruck laeuft aber oft ueber
 *      mehrere Zeilen:
 *          boxShadow: istBuehne
 *            ? 'none'
 *            : `0 0 40px ${c}`,
 *      Die dritte Zeile kennt `istBuehne` nicht und galt als Verstoss, obwohl
 *      sie die Regel korrekt umsetzt. Jetzt wird die ganze EIGENSCHAFT um den
 *      Treffer herum gelesen (Klammer-Tiefe rueckwaerts und vorwaerts) und
 *      darin nach dem Buehnen-Zweig gesucht.
 *
 *   3. Der Zaehler auf `isThemed()` mass etwas anderes, als er behauptete.
 *      `isThemed()` ist kein Fehler, es ist nur kein Buehnen-Test. Ob eine
 *      Datei die Buehne ueberhaupt kennt, steht jetzt als eigene Spalte.
 *
 * ── Was das Werkzeug NICHT kann ────────────────────────────────────────────
 * Layout, Leseordnung, Rhythmus, Gewichtung, ob eine Folie ueberhaupt etwas
 * erzaehlt. Eine 0 heisst „hier klemmt nichts ZAEHLBARES", nicht „gut".
 *
 * ── Selbsttest ────────────────────────────────────────────────────────────
 * `--selbsttest` faehrt die Regeln gegen eingebaute Beispiele mit bekanntem
 * Ergebnis. Wer eine Regel aendert, faehrt ihn vorher.
 *
 * NUTZUNG:
 *   node scripts/buehne-audit.mjs
 *   node scripts/buehne-audit.mjs --details        Fundstellen mit Zeilennummer
 *   node scripts/buehne-audit.mjs --json
 *   node scripts/buehne-audit.mjs --selbsttest
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ALS_JSON = process.argv.includes('--json');
const DETAILS = process.argv.includes('--details');
const SELBSTTEST = process.argv.includes('--selbsttest');

/** Die Ansichten, die auf der Buehne wirklich laufen, in Ablauf-Reihenfolge. */
const ANSICHTEN = [
  ['Lobby',              'frontend/src/components/CozyQuizLobbyView.tsx',
    'Kennt die Buehne nicht beim Namen.'],
  ['Regeln',             'frontend/src/components/CozyQuizRulesView.tsx',
    'Kennt die Buehne nicht beim Namen: alles laeuft ueber Flaechen-Tokens. Funktioniert, macht aber jede Ausnahme unmoeglich.'],
  ['Team-Auftritt',      'frontend/src/components/CozyQuizTeamsRevealView.tsx',
    'Kennt die Buehne nicht beim Namen.'],
  ['Runden-Intro',       'frontend/src/components/CozyQuizPhaseIntroView.tsx'],
  ['Frage + Aufloesung', 'frontend/src/components/CozyQuizQuestionView.tsx'],
  ['Brett / Setzen',     'frontend/src/components/CozyQuizPlacementView.tsx'],
  ['Punkteleiste',       'frontend/src/components/CozyQuizScoreBar.tsx'],
  ['Brett-Anzeige',      'frontend/src/components/CozyQuizGridDisplay.tsx'],
  ['Top 5',              'frontend/src/components/reveals/Top5Reveal.tsx'],
  ['Fix It',             'frontend/src/components/reveals/OrderReveal.tsx'],
  ['Pin It',             'frontend/src/components/reveals/CozyGuessrReveal.tsx'],
  ['Schaetzchen',        'frontend/src/components/reveals/SchaetzchenReveal.tsx'],
  ['Pause',              'frontend/src/components/CozyQuizPausedView.tsx',
    'Enthaelt auch den CozyArena-Aufbau (Fraktionen), der nur im Arena-Modus laeuft.'],
  ['CozyGame',           'frontend/src/components/CozyGameView.tsx'],
  ['Final-Tipp',         'frontend/src/components/CozyQuizFinalBettingView.tsx'],
  ['Final-Aufloesung',   'frontend/src/components/CozyQuizFinalRevealView.tsx',
    'Datei enthaelt VIER Finale-Varianten (Eurovision, Podium, Turm, Race). Auf der Buehne laeuft nur das Turm-Finale; ein grosser Teil der Treffer steht in Varianten, die niemand sieht.'],
  ['Turm-Finale',        'frontend/src/components/CozyQuizTowerFinaleV2.tsx'],
  ['Stechen',            'frontend/src/components/CozyQuizTieBreakerView.tsx'],
  ['Spielende',          'frontend/src/components/CozyQuizGameOverView.tsx'],
  ['Danke',              'frontend/src/components/CozyQuizThanksView.tsx'],
];

// ── Vorbereitung: Kommentare ausblenden, Offsets erhalten ────────────────────

/**
 * Ersetzt den INHALT von Kommentaren durch Leerzeichen. Laenge und Zeilenumbrueche
 * bleiben erhalten, damit Zeilennummern und Offsets weiter stimmen.
 * Beruecksichtigt Strings und Template-Literale, damit ein `//` in einer URL
 * nicht den Rest der Datei ausblendet.
 */
export function ohneKommentare(src) {
  const out = src.split('');
  let i = 0;
  const N = src.length;
  const leeren = (von, bis) => { for (let k = von; k < bis; k++) if (out[k] !== '\n') out[k] = ' '; };
  while (i < N) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { let j = i; while (j < N && src[j] !== '\n') j++; leeren(i, j); i = j; continue; }
    if (c === '/' && d === '*') { let j = i + 2; while (j < N && !(src[j] === '*' && src[j + 1] === '/')) j++; leeren(i, Math.min(j + 2, N)); i = j + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; let j = i + 1;
      while (j < N) { if (src[j] === '\\') { j += 2; continue; } if (src[j] === q) break; j++; }
      i = j + 1; continue;
    }
    i++;
  }
  return out.join('');
}

/**
 * Der Bereich, in dem ein Buehnen-Zweig fuer einen Treffer stehen kann.
 *
 * 2026-08-23, im zweiten Pruefdurchgang gefunden: die erste Fassung lief
 * zeichenweise rueckwaerts und blieb an der naechsten oeffnenden Klammer
 * haengen. Bei
 *     boxShadow: istBuehne ? 'none' : (isQuietMotion() ? 'a' : `0 0 28px …`)
 * war das die Klammer der INNEREN Verzweigung - der Bereich endete also VOR
 * `istBuehne`, und eine korrekt verdrahtete Zeile wurde als Verstoss gemeldet.
 *
 * Jetzt zeilenweise, und das aus zwei Gruenden zuverlaessiger:
 *   a) Der Eigenschafts-Block laeuft von der naechsten Zeile darueber, die eine
 *      Eigenschaft eroeffnet (`name:`), bis die Klammern wieder aufgehen.
 *   b) Dazu die naechste umschliessende JSX-Bedingung. Ein Element kann auch
 *      von aussen gegatet sein - `{!istBuehneG() && <span …>}` - und das steht
 *      nicht in der Eigenschaft, sondern eine Ebene darueber.
 */
export function eigenschaftUm(src, index) {
  const zeilen = src.split('\n');
  const zi = src.slice(0, index).split('\n').length - 1;

  // (a) Eigenschafts-Block: hoch bis zur Zeile, die eine Eigenschaft eroeffnet.
  let von = zi;
  for (let k = zi; k >= 0 && zi - k < 12; k--) {
    if (/^\s*[A-Za-z_$][\w$-]*\s*:/.test(zeilen[k]) || /^\s*(const|let|return|<)/.test(zeilen[k])) { von = k; break; }
    von = k;
  }
  // Nach unten, bis die in diesem Block geoeffneten Klammern wieder zu sind.
  let bis = zi, tiefe = 0;
  for (let k = von; k < zeilen.length && k - von < 14; k++) {
    for (const c of zeilen[k]) {
      if ('([{'.includes(c)) tiefe++;
      else if (')]}'.includes(c)) tiefe--;
    }
    bis = k;
    if (k >= zi && tiefe <= 0) break;
  }
  let bereich = zeilen.slice(von, bis + 1).join('\n');

  // (b) Naechste umschliessende JSX-Bedingung darueber.
  let offen = 0;
  for (let k = zi; k >= 0 && zi - k < 40; k--) {
    const z = zeilen[k];
    for (let i = z.length - 1; i >= 0; i--) {
      if (z[i] === '}') offen++;
      else if (z[i] === '{') { if (offen === 0) { bereich += '\n' + z; k = -1; break; } offen--; }
    }
  }
  return bereich;
}

const BUEHNE_TEST = /istBuehne|istBuehneG|QUIRKS_THEME_ID|qqIstBuehne/;

/**
 * Steht der Treffer im SONST-Zweig einer Theme-Bedingung, also dort, wo die
 * Buehne gar nicht hinkommt?
 *
 * 2026-08-23, vierter Pruefdurchgang. Gemeldet wurde:
 *     textShadow: themed ? 'none' : isEsc ? 'none' : `0 0 24px …`
 * Das ist KEIN Verstoss. Die Buehne laeuft im Quirks-Theme, `themed` ist dort
 * wahr, sie nimmt also 'none'. Der Schein im letzten Zweig ist fuer sie
 * unerreichbar. Mein erster Gate-Test kannte nur `istBuehne` und hat solche
 * Stellen alle gemeldet - allein in der Danke-Folie ein Drittel der Treffer.
 *
 * Wichtig ist die RICHTUNG: `isThemed() ? '#FBBF24' : …` waere sehr wohl ein
 * Verstoss, denn dort nimmt die Buehne den GOLDENEN Zweig. Deshalb wird nicht
 * geprueft, ob eine Theme-Bedingung vorkommt, sondern ob der Treffer HINTER
 * ihrem Doppelpunkt liegt.
 */
function imSonstZweig(bereich, treffer) {
  const davor = bereich.slice(0, bereich.indexOf(treffer) + 1);
  if (davor.length < 2) return false;
  return /(isThemed\(\)|[^\w.]themed\b|isCozyLook\(\))[\s\S]*\?[\s\S]*:/.test(davor);
}
const zeileVon = (src, index) => src.slice(0, index).split('\n').length;

// ── Die Regeln ──────────────────────────────────────────────────────────────
//
// Jede Regel: ein globaler Ausdruck auf der kommentarfreien Quelle, plus eine
// optionale Zusatzpruefung. Ein Treffer zaehlt nur, wenn die umgebende
// Eigenschaft KEINEN Buehnen-Zweig hat.

const REGELN = [
  {
    key: 'zeichen',
    titel: 'Rohe Systemzeichen',
    bibel: 'Marken und Zeichen: keine rohen Systemzeichen',
    // Emoji ausserhalb von QQEmojiIcon/QQIcon. Innerhalb ist es nur das
    // Argument, aus dem der Slug gezogen wird - der erlaubte Weg.
    finde: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,
    zusatz: (src, m) => {
      const um = src.slice(Math.max(0, m.index - 160), m.index + 60);
      if (/QQEmojiIcon|QQIcon|FALLBACK_EMOJI|EMOJI_TO_SLUG|qqEmojiSlug/.test(um)) return false;
      // 2026-08-23, zweiter Pruefdurchgang: `{ icon: '📱', title: … }` wurde
      // gemeldet, obwohl die Liste weiter unten ueber
      // `<QQEmojiIcon emoji={it.icon} />` gerendert wird. Ein Zeichen in einem
      // DATENFELD ist das Argument, aus dem der Slug gezogen wird - genau der
      // erlaubte Weg. Gerendert wird es dort nicht.
      const zeilenAnfang = src.lastIndexOf('\n', m.index) + 1;
      const davor = src.slice(zeilenAnfang, m.index);
      if (/\b(icon|emoji|fallback|glyph|zeichen)\s*:\s*['"`]?$/.test(davor)) return false;
      return true;
    },
  },
  {
    key: 'schein',
    unterdrueckend: true,   // Wert, den die Buehne NICHT sehen soll
    titel: 'Schein ohne Buehnen-Zweig',
    bibel: 'Schein und Rahmen: ein Schein, der nur schmueckt, geht',
    // Nur der Hof RINGS um etwas (Versatz 0 0). Ein Schatten mit Versatz
    // (`0 8px 24px`) setzt auf den Grund und ist ausdruecklich erlaubt.
    finde: /\b0 0 (\d+)px\b/g,
    zusatz: (src, m) => {
      const um = src.slice(Math.max(0, m.index - 220), m.index);
      if (!/box-?[Ss]hadow|text-?[Ss]hadow|drop-shadow|filter/.test(um)) return false;
      return Number(m[1]) >= 8;   // unter 8px ist eine Kante, kein Hof
    },
  },
  {
    key: 'teamfarbe',
    unterdrueckend: true,   // Wert, den die Buehne NICHT sehen soll
    titel: 'Teamfarbe als Schriftfarbe',
    bibel: 'Farbe: Teamfarbe lebt auf der Kachel, nie in der Schrift',
    finde: /\bcolor:\s*([^,;}\n]{0,80})/g,
    zusatz: (_src, m) => /\b(t|team|winner|recip|entry\.team|teamColor|colr)\.?color\b/.test(m[1])
                      && !/var\(/.test(m[1]),
  },
  {
    key: 'klein',
    titel: 'Textgrad unter 20px',
    bibel: 'Regel null: kleinster sinnvoller Grad rund 26px',
    // Bewusst 20 statt 26: zwischen 20 und 26 liegt Ermessen (Beschriftungen
    // an Pillen), unter 20 ist es auf acht Metern sicher weg. Ein Werkzeug soll
    // das Unstrittige melden, nicht das Verhandelbare.
    finde: /fontSize:\s*(?:'clamp\([^)]*?,\s*(\d+)px\)'|(\d+)\b)/g,
    zusatz: (_src, m) => Number(m[1] ?? m[2]) < 20,
  },
  {
    key: 'gold',
    unterdrueckend: true,   // Wert, den die Buehne NICHT sehen soll
    titel: 'Gold, Medaillen, Krone',
    bibel: 'Farbe: kein Gold, keine Medaillen, keine Kronen',
    finde: /#FBBF24|#F9C87A|#E0A94E|#FCD34D|SPEED_GOLD|🥇|🥈|🥉|👑/g,
  },
  {
    key: 'gestrichelt',
    unterdrueckend: true,   // Wert, den die Buehne NICHT sehen soll
    titel: 'Gestrichelte Raender',
    bibel: 'Schein und Rahmen: keine gestrichelten Raender',
    finde: /\bdashed\b/g,
  },
  {
    key: 'emdash',
    titel: 'Em-Dash in UI-Text',
    bibel: 'Harte Regel im Repo: keine Em-Dashes',
    // Nur in Zeichenketten - im Kommentar ist er schon ausgeblendet, und ein
    // Trennstrich in einer Rechnung ist keiner.
    finde: /—/g,
    // 2026-08-23, dritter Pruefdurchgang: dieser Zaehler lief zuerst auf der
    // ROHEN Quelle, weil ich dachte, der Fundort seien ja die Strings. Ergebnis
    // waren 138 Treffer - fast alle aus Kommentaren und aus den Trennlinien am
    // Abschnittsanfang. `ohneKommentare` blendet Kommentare aus und laesst
    // Strings stehen, ist also genau die richtige Grundlage. Zusaetzlich muss
    // der Strich WIRKLICH in einer Zeichenkette stehen, nicht irgendwo auf
    // einer Zeile, auf der auch ein Anfuehrungszeichen vorkommt.
    zusatz: (src, m) => {
      const zeilenAnfang = src.lastIndexOf('\n', m.index) + 1;
      const davor = src.slice(zeilenAnfang, m.index);
      // Ungerade Zahl von Anfuehrungszeichen davor = wir stehen mittendrin.
      for (const q of ['\'', '"', '`']) {
        const n = (davor.match(new RegExp(q === '\'' ? "'" : q, 'g')) || []).length;
        if (n % 2 === 1) return true;
      }
      return false;
    },
  },
];

// ── Auswertung ──────────────────────────────────────────────────────────────

/**
 * Der EINE Zaehlweg. Selbsttest und Echtlauf gehen beide hier durch.
 *
 * 2026-08-23, vierter Pruefdurchgang: vorher hatte der Selbsttest eine eigene
 * Schleife. Als ich Sonst-Zweig-Erkennung und Entdopplung in den Echtlauf
 * einbaute, meldete der Selbsttest prompt Fehler fuer Faelle, die im Echtlauf
 * laengst richtig liefen - er testete schlicht anderen Code. Ein Selbsttest,
 * der einen anderen Weg prueft als der Echtlauf, prueft gar nichts.
 */
export function zaehle(roh, regel, gesehen = new Set()) {
  const heuhaufen = ohneKommentare(roh);
  const fundstellen = [];
  for (const m of heuhaufen.matchAll(regel.finde)) {
    if (regel.zusatz && !regel.zusatz(heuhaufen, m)) continue;
    const bereich = eigenschaftUm(heuhaufen, m.index);
    if (BUEHNE_TEST.test(bereich)) continue;
    if (regel.unterdrueckend && imSonstZweig(bereich, m[0])) continue;
    // Eine EIGENSCHAFT zaehlt einmal, auch wenn sie zwei Schein-Ebenen traegt.
    // Sonst wiegt ein doppelter Schatten doppelt so schwer wie ein Verstoss an
    // ganz anderer Stelle, und die Summen werden unvergleichbar.
    const zeile = zeileVon(heuhaufen, m.index);
    const marke = `${regel.key}:${bereich.slice(0, 60)}`;
    if (gesehen.has(marke)) continue;
    gesehen.add(marke);
    fundstellen.push({ zeile, text: (roh.split('\n')[zeile - 1] || '').trim().slice(0, 100) });
  }
  return fundstellen;
}

function pruefeDatei(datei) {
  const roh = readFileSync(path.resolve(datei), 'utf8');
  const treffer = {}, belege = {};
  const gesehen = new Set();
  for (const r of REGELN) {
    const f = zaehle(roh, r, gesehen);
    treffer[r.key] = f.length;
    belege[r.key] = f.slice(0, 8);
  }
  return {
    zeilen: roh.split('\n').length,
    benannt: BUEHNE_TEST.test(roh),
    treffer,
    belege,
    summe: Object.values(treffer).reduce((a, b) => a + b, 0),
  };
}

// ── Selbsttest ──────────────────────────────────────────────────────────────

const FAELLE = [
  ['Schein ohne Zweig zaehlt',      `x = { boxShadow: '0 0 40px red' }`,                      'schein', 1],
  ['Schein mit Zweig zaehlt nicht', `x = { boxShadow: istBuehne ? 'none' : '0 0 40px red' }`, 'schein', 0],
  ['Schein ueber drei Zeilen',      `x = {\n boxShadow: istBuehne\n  ? 'none'\n  : '0 0 40px red',\n}`, 'schein', 0],
  ['Schatten mit Versatz ist ok',   `x = { boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }`,        'schein', 0],
  ['Kante unter 8px ist ok',        `x = { boxShadow: '0 0 4px red' }`,                       'schein', 0],
  ['Emoji im Kommentar zaehlt nicht', `// der Wolf 🐺 ist raus\nconst a = 1;`,                'zeichen', 0],
  ['Emoji im Block-Kommentar',      `/* Krone 👑 raus */\nconst a = 1;`,                      'zeichen', 0],
  ['Emoji im JSX zaehlt',           `const a = <span>🐺</span>;`,                             'zeichen', 1],
  ['Emoji in QQEmojiIcon zaehlt nicht', `const a = <QQEmojiIcon emoji="🏆" size="1em" />;`,   'zeichen', 0],
  ['Teamfarbe als Schrift zaehlt',  `x = { color: t.color }`,                                 'teamfarbe', 1],
  ['Teamfarbe gegated zaehlt nicht',`x = { color: istBuehne ? 'var(--qq-text)' : t.color }`,  'teamfarbe', 0],
  ['Token-Farbe zaehlt nicht',      `x = { color: 'var(--qq-text)' }`,                        'teamfarbe', 0],
  ['Kleiner Grad zaehlt',           `x = { fontSize: 'clamp(10px, 1cqw, 13px)' }`,            'klein', 1],
  ['Grosser Grad zaehlt nicht',     `x = { fontSize: 'clamp(18px, 2cqw, 30px)' }`,            'klein', 0],
  ['Gold zaehlt',                   `const GOLD = '#FBBF24';`,                                'gold', 1],
  ['Gold gegated zaehlt nicht',     `x = { color: istBuehne ? 'var(--qq-text)' : '#FBBF24' }`,'gold', 0],
  ['Em-Dash im String zaehlt',      `const t = 'a — b';`,                                     'emdash', 1],
  ['Em-Dash im Kommentar zaehlt nicht', `// a — b\nconst a = 1;`,                             'emdash', 0],
  ['Schein im themed-Sonst-Zweig zaehlt nicht', `x = { textShadow: themed ? 'none' : '0 0 24px red' }`, 'schein', 0],
  ['Gold im themed-JA-Zweig zaehlt',           `x = { color: isThemed() ? '#FBBF24' : 'red' }`,        'gold',   1],
  ['Zwei Schein-Ebenen zaehlen als eine',      `x = { boxShadow: '0 0 30px red, 0 0 64px blue' }`,     'schein', 1],
];

function selbsttest() {
  let ok = 0, fehler = 0;
  for (const [name, quelle, key, erwartet] of FAELLE) {
    const r = REGELN.find(x => x.key === key);
    const n = zaehle(quelle, r).length;
    if (n === erwartet) { ok++; console.log(`  ok    ${name}`); }
    else { fehler++; console.log(`  FEHLT ${name}: erwartet ${erwartet}, gezaehlt ${n}`); }
  }
  console.log(`\n${ok} von ${ok + fehler} Faellen richtig.`);
  return fehler === 0;
}

// ── Hauptlauf ───────────────────────────────────────────────────────────────

if (SELBSTTEST) {
  process.exit(selbsttest() ? 0 : 1);
}

const berichte = [];
for (const [name, datei, hinweis] of ANSICHTEN) {
  try { berichte.push({ name, datei, hinweis, ...pruefeDatei(datei) }); }
  catch { berichte.push({ name, datei, hinweis, fehlt: true }); }
}

if (ALS_JSON) {
  console.log(JSON.stringify(berichte, null, 2));
} else {
  const spalten = REGELN.map(r => r.key);
  const kopf = ['Ansicht'.padEnd(20), 'Zeilen'.padStart(7), 'benannt'.padStart(9),
                ...spalten.map(k => k.slice(0, 11).padStart(12)), 'Summe'.padStart(7)];
  console.log(kopf.join(''));
  console.log('-'.repeat(kopf.join('').length));
  for (const b of berichte) {
    if (b.fehlt) { console.log(`${b.name.padEnd(20)}  DATEI FEHLT: ${b.datei}`); continue; }
    console.log([
      b.name.padEnd(20), String(b.zeilen).padStart(7), (b.benannt ? 'ja' : 'NEIN').padStart(9),
      ...spalten.map(k => String(b.treffer[k] || '·').padStart(12)),
      String(b.summe).padStart(7),
    ].join(''));
  }
  const gesamt = {};
  for (const k of spalten) gesamt[k] = berichte.reduce((a, b) => a + (b.treffer?.[k] ?? 0), 0);
  console.log('-'.repeat(kopf.join('').length));
  console.log(['SUMME'.padEnd(20), ''.padStart(7), ''.padStart(9),
    ...spalten.map(k => String(gesamt[k]).padStart(12)),
    String(Object.values(gesamt).reduce((a, b) => a + b, 0)).padStart(7)].join(''));

  const mitHinweis = berichte.filter(b => b.hinweis);
  if (mitHinweis.length) {
    console.log('\nEinschraenkungen, ohne die die Zahlen luegen:');
    for (const b of mitHinweis) console.log(`  ${b.name}: ${b.hinweis}`);
  }

  console.log('\nRegeln:');
  for (const r of REGELN) console.log(`  ${r.key.padEnd(13)} ${r.titel.padEnd(26)} ${r.bibel}`);
  console.log('\nGezaehlt wird nur, was die BUEHNE trifft. Eine Eigenschaft mit');
  console.log('istBuehne-Zweig gilt als korrekt verdrahtet. Kommentare zaehlen nie.');
  console.log('Eine 0 heisst „nichts Zaehlbares", nicht „gut" - Layout, Leseordnung');
  console.log('und Rhythmus sieht dieses Werkzeug nicht.');

  if (DETAILS) {
    for (const b of berichte) {
      if (b.fehlt || b.summe === 0) continue;
      console.log(`\n=== ${b.name}  (${b.datei})`);
      for (const r of REGELN) {
        const bs = b.belege[r.key];
        if (!bs?.length) continue;
        console.log(`  ${r.titel} (${b.treffer[r.key]}):`);
        for (const x of bs) console.log(`    ${String(x.zeile).padStart(5)}: ${x.text}`);
        if (b.treffer[r.key] > bs.length) console.log(`    … und ${b.treffer[r.key] - bs.length} weitere`);
      }
    }
  }
}
