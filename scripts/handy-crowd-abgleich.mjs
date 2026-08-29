/* handy-crowd-abgleich — was macht /team in CrowdQuiz anders als in CozyQuiz?
 *
 * 2026-08-29, Wolf: „ok checke crowdquiz team bitte, schau dir dazu an welche
 * unterschiede crowd zu cozy hat bitte."
 *
 * Dasselbe Verfahren wie scripts/design-referenz.mjs, nur eine Ebene tiefer:
 * dort werden die beiden BUEHNEN verglichen, hier die beiden HANDYS.
 *
 * ── Warum Wortschatz und nicht Bild ───────────────────────────────────────
 * CrowdQuiz SOLL auf dem Handy anders aussehen, und die Liste dessen, was
 * anders sein muss, steht in CLAUDE.md und docs/UEBERGABE_TEAM.md: acht feste
 * Fraktionswappen statt freier Avatarwahl, kein Teamname, kein Spielbrett,
 * bis 40 Teams, eigene Bunte-Tuete-Mechaniken. Ein Bildvergleich meldet lauter
 * echte Unterschiede und keinen einzigen Fehler.
 *
 * Verglichen wird deshalb der WORTSCHATZ: welche Schriften, Textfarben,
 * Flaechen, Raender, Ecken und Schatten benutzt jede Seite. Zwei Formate
 * duerfen voellig verschieden aussehen und trotzdem dieselbe Sprache sprechen.
 *
 * ⚠️ Was hier NIE ein Fund sein kann - und das ist der wichtigste Satz:
 * Wolf 2026-08-28, in CLAUDE.md festgehalten: „crowdquiz hat spezifische
 * kategorien und views die cozyquiz nicht hat und das muss bei 40 geraeten
 * auch so sein … das hat mit font und eckige formen und farbe nichts zu tun,
 * aber darf nicht kaputt gemacht werden."
 *
 * Layout und Inhalt werden gar nicht gemessen. Wer aus diesem Werkzeug je ein
 * „mach die Ansichten gleich" macht, nimmt CrowdQuiz sein Format weg.
 *
 * VORAUSSETZUNG: Backend (4000, frisch) + Frontend (5173).
 * NUTZUNG: node scripts/handy-crowd-abgleich.mjs [--secs=200] [--nur=cozy|crowd]
 *
 * ⚠️ Zwei volle Abende in einem Aufruf dauern laenger als manche Werkzeug-
 * Zeitgrenze erlaubt (2026-08-29 genau daran gescheitert). Deshalb `--nur=`:
 * jede Seite laesst sich einzeln fahren, das Ergebnis landet als JSON unter
 * .shots/crowd/roh-<seite>.json, und der naechste Aufruf ohne `--nur=` nimmt
 * gefundene Dateien statt neu zu messen. Loeschen = neu messen.
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { handyStarten } from './lib/handy.mjs';
import { WORTSCHATZ, TOEPFE, vereinen } from './lib/designsprache.mjs';

const SECS = Number((process.argv.find(a => a.startsWith('--secs=')) ?? '--secs=200').split('=')[1]);
const MIN_TEXT = 10, MIN_FLAECHE = 24;
const NUR = (process.argv.find(a => a.startsWith('--nur=')) ?? '--nur=').split('=')[1];

/**
 * Farben, die sich per Definition wegkuerzen.
 *
 * ⚠️ Hier ist der Vorbehalt groesser als bei den Buehnen: CozyQuiz zieht sein
 * Team aus 48 Objekten x 8 Farben, CrowdQuiz aus acht festen Fraktionen. Die
 * beiden Seiten treffen also NIE dieselben Farb-Slots, und ohne diese Liste
 * waere jede Team- und Fraktionsfarbe ein Fund.
 * Quellen: QQ_TEAM_PALETTE, QQ_CATEGORY_COLORS (shared/quarterQuizTypes.ts),
 * die Kategorie-Toene aus shared/qqCategoryTheme.ts und die Wappenfarben aus
 * frontend/src/cozyArenaCrests.ts - die letzten beiden GELESEN, nicht
 * abgetippt.
 */
const PALETTE_RGB = (() => {
  const hex = new Set([
    '#F97316', '#22C55E', '#14B8A6', '#A855F7', '#FACC15', '#3B82F6', '#EC4899', '#EF4444',
    '#F59E0B', '#8B5CF6',
  ]);
  for (const [datei] of [['../shared/qqCategoryTheme.ts'], ['../frontend/src/cozyArenaCrests.ts']]) {
    try {
      const quelle = readFileSync(new URL(datei, import.meta.url), 'utf8');
      for (const m of quelle.matchAll(/'(#[0-9A-Fa-f]{6})'/g)) hex.add(m[1]);
    } catch { /* Datei fehlt: dann eben ohne */ }
  }
  return new Set([...hex].map(h => {
    const n = parseInt(h.slice(1), 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }));
})();
const istPalette = (wort) => {
  for (const m of String(wort).matchAll(/(\d{1,3}),(\d{1,3}),(\d{1,3})/g)) {
    if (PALETTE_RGB.has(`${+m[1]},${+m[2]},${+m[3]}`)) return true;
  }
  return false;
};
console.log(`${PALETTE_RGB.size} Palettenfarben gelesen (Teams, Kategorien, Wappen).`);

/**
 * Einen ganzen Abend am Handy messen, den Wortschatz PRO STATION.
 *
 * ⚠️ Pro Station und nicht als Summe, und das ist keine Feinheit. Der erste
 * Lauf hat CozyQuiz an sieben Stationen erwischt und CrowdQuiz an vier - der
 * Autoplay braucht unterschiedlich lange, und CrowdQuiz hat keine
 * Setzen-Phase. Die Liste „nur CozyQuiz" war damit zur Haelfte kein
 * Unterschied zwischen den Formaten, sondern einer zwischen den Laeufen.
 *
 * Verglichen werden deshalb nur Stationen, die BEIDE Seiten gezeigt haben.
 * Dieselbe Vorsichtsmassnahme steht in design-referenz.mjs als feste Liste
 * GEMEINSAM; hier wird sie aus dem Lauf abgeleitet, weil die Phasennamen vom
 * Format abhaengen.
 */
async function abendMessen(mega) {
  const b = await handyStarten({ mega, secs: SECS });
  const proStation = new Map();
  await b.abendMitfahren(async (phase) => {
    const w = await b.handy.evaluate(WORTSCHATZ, {
      minText: MIN_TEXT, minFlaeche: MIN_FLAECHE, wurzel: 'body', bezug: 0,
    }).catch(() => null);
    if (!w || w.fehler) return;
    proStation.set(phase, w);
    console.log(`  ✓ ${phase}`);
  });
  await b.schliessen();
  return proStation;
}

/** Die Wortschaetze der genannten Stationen zu einem zusammenlegen. */
function nurDiese(proStation, stationen) {
  const worte = {};
  for (const st of stationen) vereinen(worte, proStation.get(st));
  return worte;
}

mkdirSync('.shots/crowd', { recursive: true });

/** Eine Seite messen - oder die Messung vom letzten Lauf lesen. */
async function seite(name, mega) {
  const datei = `.shots/crowd/roh-${name}.json`;
  if (NUR && NUR !== name) {
    try {
      const roh = JSON.parse(readFileSync(datei, 'utf8'));
      console.log(`\n── ${name}: ${Object.keys(roh).length} Stationen aus ${datei}`);
      return neuAufbauen(roh);
    } catch {
      console.error(`\n⚠️  ${datei} fehlt. Erst \`--nur=${name}\` fahren.`);
      process.exit(1);
    }
  }
  console.log(`\n── ${name} ────────────────────────────────────────────────`);
  const proStation = await abendMessen(mega);
  writeFileSync(datei, JSON.stringify(alsJson(proStation)));
  return proStation;
}

/* Nur die aeussere Map wandeln. WORTSCHATZ kommt aus page.evaluate und ist
 * deshalb schon reines JSON ({ topf: [{wort,n,bsp}] }) - erst `vereinen` macht
 * daraus Maps. Wer hier zusaetzlich `new Map(...)` einsetzt, uebergibt
 * `vereinen` eine Map statt der erwarteten Liste; die Schleife laeuft dann ins
 * Leere und die Seite erscheint im Bericht als `undefined - NaNx`
 * (2026-08-29 genau so passiert). */
const alsJson = (proStation) => Object.fromEntries(proStation);
const neuAufbauen = (roh) => new Map(Object.entries(roh));

const cozyRoh = await seite('cozy', false);
const crowdRoh = await seite('crowd', true);
if (NUR === 'cozy' || NUR === 'crowd') {
  console.log(`\nSeite „${NUR}" gemessen und abgelegt. Der Bericht unten benutzt fuer die`);
  console.log('andere Seite die gespeicherte Messung - ein `--nur=` ohne Seitennamen');
  console.log('(z.B. `--nur=bericht`) baut ihn allein aus beiden Dateien neu.');
}

const gemeinsam = [...cozyRoh.keys()].filter(st => crowdRoh.has(st));
const nurCozySt = [...cozyRoh.keys()].filter(st => !crowdRoh.has(st));
const nurCrowdSt = [...crowdRoh.keys()].filter(st => !cozyRoh.has(st));
if (!gemeinsam.length) {
  console.error('\n⚠️  ABBRUCH: keine gemeinsame Station. Ohne die vergleicht man zwei Abende.');
  process.exit(1);
}
const cozy = { worte: nurDiese(cozyRoh, gemeinsam), stationen: gemeinsam };
const crowd = { worte: nurDiese(crowdRoh, gemeinsam), stationen: gemeinsam };

/* ── Bericht ──────────────────────────────────────────────────────────────── */
const z = [`# /team: CrowdQuiz gegen CozyQuiz`, '',
  `Gemessen am ${new Date().toISOString().slice(0, 10)}.`, '',
  `Verglichen werden nur Stationen, die BEIDE Seiten gezeigt haben:`,
  `**${gemeinsam.join(', ')}**.`, '',
  ...(nurCozySt.length || nurCrowdSt.length ? [
    '⚠️ Nicht verglichen, weil nur eine Seite sie hatte:',
    ...(nurCozySt.length ? [`* nur CozyQuiz: ${nurCozySt.join(', ')}`] : []),
    ...(nurCrowdSt.length ? [`* nur CrowdQuiz: ${nurCrowdSt.join(', ')}`] : []),
    '',
    'Manche davon sind echte Formatunterschiede (CrowdQuiz hat kein Spielbrett,',
    'also kein PLACEMENT), andere nur Zufall des Autoplays. Beide Faelle taugen',
    'nicht zum Vergleich - deshalb stehen sie hier und nicht in der Liste unten.',
    '',
  ] : []),
  'Erzeugt von `node scripts/handy-crowd-abgleich.mjs`. Verglichen wird der',
  'WORTSCHATZ, nicht das Bild. Der Kopf des Werkzeugs erklaert, warum - und',
  'welche Unterschiede hier per Definition nie auftauchen koennen.', ''];

let nurCrowd = 0, nurCozy = 0;
for (const [topf, titel] of TOEPFE) {
  const a = cozy.worte[topf] ?? new Map();
  const c = crowd.worte[topf] ?? new Map();
  const c_only = [...c].filter(([w]) => !a.has(w) && !istPalette(w));
  const a_only = [...a].filter(([w]) => !c.has(w) && !istPalette(w));
  if (!c_only.length && !a_only.length) continue;
  z.push(`## ${titel}`, '');
  if (c_only.length) {
    nurCrowd += c_only.length;
    z.push('**Nur CrowdQuiz** — Woerter, die CozyQuiz auf dem Handy nirgends benutzt:', '');
    for (const [w, v] of c_only.sort((x, y) => y[1].n - x[1].n)) {
      z.push(`* \`${w}\` — ${v.n}x${v.bsp ? ` (z.B. „${v.bsp}")` : ''}`);
    }
    z.push('');
  }
  if (a_only.length) {
    nurCozy += a_only.length;
    z.push('**Nur CozyQuiz** — meist Mechanik, die es in CrowdQuiz nicht gibt:', '');
    for (const [w, v] of a_only.sort((x, y) => y[1].n - x[1].n)) {
      z.push(`* \`${w}\` — ${v.n}x${v.bsp ? ` (z.B. „${v.bsp}")` : ''}`);
    }
    z.push('');
  }
}

if (!nurCrowd && !nurCozy) z.push('Beide Formate benutzen denselben Wortschatz.', '');
else z.push('---', '',
  `${nurCrowd} Woerter nur in CrowdQuiz, ${nurCozy} nur in CozyQuiz.`, '',
  '⚠️ Erst recht bei kleinen Zahlen: ein Wort, das nur zwei- oder dreimal',
  'auftaucht, kann schlicht Aufnahmezeitpunkt sein. Beide Seiten animieren',
  '(Auren, Pop-Effekte), und ein Lauf trifft die Zwischenbilder mal und mal',
  'nicht. 2026-08-29 sah es so aus, als benutze CozyQuiz runde Ecken (50%) und',
  'CrowdQuiz kleine; `scripts/handy-ecken-probe.mjs` hat dann Element fuer',
  'Element gezeigt, dass beide Seiten dieselben Radien tragen (22/6/14/24/16px).',
  'Wer hier etwas aendern will, misst das fragliche Wort vorher einzeln nach.',
  '',
  '⚠️ Ein Wort in dieser Liste ist ein VERDACHT, kein Fehler. Was CrowdQuiz',
  'eigen gehoert - Fraktionen, Wappen, Bar-Race, eigene Mechaniken - steht in',
  'CLAUDE.md und darf hier auftauchen, ohne dass etwas zu tun waere. Zu',
  'entscheiden ist nur: sagt die Farbe etwas ueber die MECHANIK, oder ist sie',
  'ein Rest aus der Zeit vor dem Standarddesign?', '');

const text = z.join('\n');
writeFileSync('.shots/crowd/ABGLEICH.md', text);
console.log('\n' + text);
