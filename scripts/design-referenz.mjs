/* design-referenz — spricht CrowdQuiz dieselbe Sprache wie CozyQuiz?
 *
 * 2026-08-28, Wolf: „gaebe es denn ein gutes tool um das zu ueberpruefen,
 * quasi cozyquiz default + designbible mit den pages in crowdquiz abgleichen?"
 *
 * Die Idee ist seine, und sie ist besser als das, was ich vorher gebaut hatte
 * (scripts/crowd-abgleich.mjs prueft zwei von Hand gesetzte Regeln). Hier ist
 * die REFERENZ die laufende CozyQuiz-Buehne, kein Dokument.
 *
 * Warum das Dokument nicht taugt: docs/BUEHNE_2A.md ist die Design-Bibel,
 * aber vom 23.08. Die Schrift-Entscheidung (Bricolage) und die Trennung
 * Rahmen/Feld sind vom 26. und stehen nicht drin. Eine handgepflegte Bibel
 * laeuft der Buehne hinterher und wird trotzdem geglaubt. Die laufende Buehne
 * kann nicht veralten.
 *
 * ── Was verglichen wird ───────────────────────────────────────────────────
 * Nicht das Bild, sondern der WORTSCHATZ (siehe lib/designsprache.mjs):
 * die Menge der benutzten Schriften, Textfarben, Flaechen, Raender, Ecken und
 * Schatten. CrowdQuiz DARF anders aussehen - Fraktionen statt Teams, Bar-Race
 * statt Brett. Es darf nur keine Woerter benutzen, die CozyQuiz nirgends
 * kennt.
 *
 * Team- und Kategoriefarben kommen in beiden Formaten aus derselben Palette
 * und kuerzen sich deshalb weg. Was uebrig bleibt, ist der Verdacht.
 *
 * ⚠️ WAS DIESES WERKZEUG AUSDRUECKLICH NICHT VERLANGT ─────────────────────
 * Wolf 2026-08-28: „crowdquiz hat spezifische kategorien und views die
 * cozyquiz nicht hat und das muss bei 40 geraeten auch so sein … das hat mit
 * font und eckige formen und farbe nichts zu tun, aber darf nicht kaputt
 * gemacht werden."
 *
 * Ein leerer Bericht heisst „gleiche Woerter", nicht „gleiche Folien".
 * CrowdQuiz SOLL andere Ansichten haben: Fraktionen statt Teams, Bar-Race
 * statt Brett, Umfrage und Schwarmintelligenz als eigene Mechaniken, eine
 * eigene Siegerehrung. Nichts davon taucht hier je als Befund auf, weil
 * Layout und Inhalt gar nicht gemessen werden - nur die verwendeten Werte.
 * Wer aus diesem Werkzeug je ein „mach die Ansichten gleich" macht, nimmt
 * CrowdQuiz sein Format weg. Die Liste steht in CLAUDE.md.
 *
 * ── Was das Werkzeug NICHT kann ───────────────────────────────────────────
 * Es findet fremde WOERTER, nicht falsche SAETZE. Der Arena-Emoji ueber der
 * Wortmarke war ein Bild in einer erlaubten Groesse an einer Stelle, an der
 * CozyQuiz nichts hat - kein fremdes Wort. Wolf musste ihn ansagen. Fuer
 * diese Klasse gibt es den Kontaktbogen aus crowd-abgleich.mjs.
 *
 * NUTZUNG:
 *   node scripts/design-referenz.mjs            # der ganze Abend, beide Formate
 *   node scripts/design-referenz.mjs frage pause
 *   node scripts/design-referenz.mjs --bibel    # nur CozyQuiz messen und
 *                                               # docs/DESIGNSPRACHE.md schreiben
 */
import fs from 'node:fs';
import { buehneStarten, sleep } from './lib/buehne.mjs';
import { WORTSCHATZ, TOEPFE, vereinen } from './lib/designsprache.mjs';

/**
 * Team- und Kategoriefarben zaehlen nicht mit.
 *
 * 2026-08-28, erster Probelauf: gemeldet wurde `59,130,246` auf der
 * Danke-Folie von CrowdQuiz - die Fraktionsfarbe von Improvisation. Kein
 * Fund, sondern Zufall: die Bot-Namen und damit die Farb-Slots werden pro
 * Lauf gewuerfelt, also erwischt CozyQuiz mit acht Teams nicht dieselben
 * acht Farben wie CrowdQuiz mit zwoelf. Die Annahme „Teamfarben kuerzen sich
 * gegenseitig weg" stimmt nur, wenn beide Seiten dieselben Slots ziehen.
 *
 * Statt das jedes Mal zu erklaeren, fliegen die beiden Paletten raus. Sie
 * sind per Definition erlaubt: dass ein Team pink ist, ist keine
 * Design-Entscheidung dieser Folie.
 * Quelle: QQ_TEAM_PALETTE und QQ_CATEGORY_COLORS in shared/quarterQuizTypes.ts.
 */
const PALETTE = [
  '#F97316', '#22C55E', '#14B8A6', '#A855F7', '#FACC15', '#3B82F6', '#EC4899', '#EF4444',
  '#F59E0B', '#8B5CF6',
];
const PALETTE_RGB = new Set(PALETTE.map(h => {
  const n = parseInt(h.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}));
/** Traegt dieses Wort eine Palettenfarbe? Deckkraft egal - eine getoente
 *  Teamfarbe ist immer noch die Teamfarbe. */
const istPalette = (wort) => {
  for (const m of String(wort).matchAll(/(\d{1,3}),(\d{1,3}),(\d{1,3})/g)) {
    if (PALETTE_RGB.has(`${+m[1]},${+m[2]},${+m[3]}`)) return true;
  }
  return false;
};

/** Stationen, die es in BEIDEN Formaten gibt. `brett` ist nur CozyQuiz
 *  (CrowdQuiz hat kein Gitter), `kartoffel` laeuft in beiden. */
const GEMEINSAM = [
  'lobby', 'willkommen', 'regeln', 'teams', 'rundenintro',
  'frage', 'aufloesung', 'kartoffel', 'pause', 'zwischenstand',
  'finalwette', 'finalaufloesung', 'siegerehrung', 'spielende', 'danke',
];

/** Ab welcher Groesse ein Element ueberhaupt mitzaehlt (Buehnen-Pixel).
 *  Darunter sind es Trennlinien, Punkte und Rundungsreste. */
const MIN_TEXT = 10;
const MIN_FLAECHE = 24;

const args = process.argv.slice(2);
const nurBibel = args.includes('--bibel');
const stationen = args.filter(a => !a.startsWith('--'));
const ABEND = stationen.length ? stationen : GEMEINSAM;

/** Ein Versprechen mit Frist. Laeuft es ab, wirft es - und die Station gilt
 *  als UNGEPRUEFT statt den Lauf anzuhalten. */
function mitFrist(versprechen, ms, was) {
  let uhr;
  const frist = new Promise((_, weg) => { uhr = setTimeout(() => weg(new Error(`Frist abgelaufen (${ms / 1000}s) - ${was}`)), ms); });
  return Promise.race([versprechen, frist]).finally(() => clearTimeout(uhr));
}

/** Zwei Messungen derselben Folie schneiden: nur was in BEIDEN steht.
 *  Fuer die geprueefte Seite - ein Wort, das nur einen Wimpernschlag lang da
 *  war, ist kein Wort der Sprache, sondern ein Zwischenbild. */
function schneiden(a, b) {
  const raus = {};
  for (const [topf] of TOEPFE) {
    const zweit = new Set((b[topf] ?? []).map(e => e.wort));
    raus[topf] = (a[topf] ?? []).filter(e => zweit.has(e.wort));
  }
  return raus;
}

/** Zwei Messungen vereinigen. Fuer die REFERENZ - sie soll alles kennen, was
 *  CozyQuiz irgendwann zeigt, auch mitten in einer Bewegung. */
function vereinenRoh(a, b) {
  const raus = {};
  for (const [topf] of TOEPFE) {
    const m = new Map();
    for (const e of [...(a[topf] ?? []), ...(b[topf] ?? [])]) {
      const bis = m.get(e.wort) ?? { wort: e.wort, n: 0, bsp: e.bsp };
      bis.n += e.n; if (!bis.bsp) bis.bsp = e.bsp;
      m.set(e.wort, bis);
    }
    raus[topf] = Array.from(m.values());
  }
  return raus;
}

/** Einen ganzen Abend in einem Format messen. Frischer Raum pro Station:
 *  der Zustand haengt am WEG dorthin, nicht nur an der Station. */
async function abendMessen(mega) {
  const gesamt = {};
  const fehler = [];
  for (const st of ABEND) {
    const b = await buehneStarten({ bots: mega ? 12 : 8, frisch: true, takt: () => {}, entwurf: 'qq-vol-1' });
    // Grossformat VOR dem Aufbau: largeGroupMode baut die Teams um und leert
    // den Raum. Und das Design ausdruecklich setzen - es bleibt auf Platte
    // stehen, `frisch` raeumt den Raum, nicht das Design.
    await b.emit('qq:setQuizOptions', { largeGroupMode: mega, nestedTeams: mega });
    await b.emit('qq:setTheme', { themeId: 'buehne' });
    await sleep(600);
    try {
      // ⚠️ Jede Station bekommt eine Reissleine.
      //
      // 2026-08-28, Wolf: „wenn das tool lange nichts gemacht hat obwohl es
      // lief, muss es wohl optimiert werden". Er hat recht, und die Ursache war
      // nicht Langsamkeit: die Server sind unter dem Lauf weggestorben, und der
      // Harness hat auf eine Seite gewartet, die nie mehr kommt. Eine Stunde
      // lang lebte der Prozess und tat nichts.
      //
      // Ein Werkzeug, das haengen kann, ist ein Werkzeug, dem man nicht beim
      // Laufen zusehen kann. Lieber eine Station als UNGEPRUEFT melden - die
      // zaehlt ohnehin nicht als sauber - als den ganzen Abend blockieren.
      await mitFrist(b.zurStation(st), 180000, `${st}: Station nicht erreicht`);
      await sleep((b.stationen[st]?.ruhe ?? 2500) + 800);
      // ⚠️ ZWEIMAL messen, mit Abstand.
      //
      // 2026-08-28, erster voller Lauf: 19 fremde Woerter, achtzehn davon auf
      // der Danke-Folie. Beim Nachmessen derselben Station: null. Die Folie
      // hat die laengste Auftrittsbewegung des Abends und einen variablen Weg
      // dorthin (der Harness schaltet weiter, BIS die Phase steht, und wie oft
      // das noetig ist, haengt an den gesetzten Tipps). Beide Seiten wurden
      // also an verschiedenen Punkten derselben Choreographie erwischt, und
      // was CozyQuiz gerade nicht zeigte, galt als „kennt CozyQuiz nicht".
      //
      // Der Ausweg kostet fast nichts: der teure Teil ist der Raumaufbau, nicht
      // das Ablesen. Zwei Messungen im selben Raum, 1,6 s auseinander.
      // CozyQuiz vereinigt beide (die Referenz soll VOLLSTAENDIG sein),
      // CrowdQuiz schneidet sie (gemeldet wird nur, was STEHEN BLEIBT).
      const w1 = await mitFrist(b.seite.evaluate(WORTSCHATZ, { minText: MIN_TEXT, minFlaeche: MIN_FLAECHE }), 30000, `${st}: erste Messung`);
      await sleep(1600);
      const w2 = await mitFrist(b.seite.evaluate(WORTSCHATZ, { minText: MIN_TEXT, minFlaeche: MIN_FLAECHE }), 30000, `${st}: zweite Messung`);
      if (w1.fehler || w2.fehler) { fehler.push(`${st}: ${w1.fehler ?? w2.fehler}`); }
      else {
        const w = mega ? schneiden(w1, w2) : vereinenRoh(w1, w2);
        vereinen(gesamt, w);
        for (const [topf] of TOEPFE) for (const e of w[topf] ?? []) gesamt[topf].get(e.wort)?.wo.add(st);
      }
      process.stdout.write(`  ${mega ? 'CrowdQuiz' : 'CozyQuiz '} ${st} ✓\n`);
    } catch (e) {
      fehler.push(`${st}: ${String(e).slice(0, 70)}`);
      process.stdout.write(`  ${mega ? 'CrowdQuiz' : 'CozyQuiz '} ${st} FEHLER\n`);
    }
    await b.schliessen?.();
  }
  return { gesamt, fehler };
}

console.log('\nMesse CozyQuiz (die Referenz) ...');
const cozy = await abendMessen(false);

// ── Bibel schreiben ────────────────────────────────────────────────────────
// Abgeleitet, nicht getippt. Das ist der Punkt.
const zeilen = [
  '# Die Designsprache der Buehne (gemessen)',
  '',
  'Diese Datei wird NICHT von Hand gepflegt. Sie entsteht aus einer Messung',
  'der laufenden CozyQuiz-Buehne: `node scripts/design-referenz.mjs --bibel`.',
  '',
  'Der Grund steht im Kopf des Werkzeugs. Kurz: `docs/BUEHNE_2A.md` ist die',
  'Design-Bibel mit den Begruendungen, aber vom 23.08.2026 - die',
  'Schrift-Entscheidung und die Trennung Rahmen/Feld vom 26. stehen dort nicht.',
  'Eine handgepflegte Liste von Werten laeuft der Buehne hinterher und wird',
  'trotzdem geglaubt. Diese hier kann nicht veralten, sie kann nur alt sein -',
  'und dann steht das Datum daneben.',
  '',
  '⚠️ Die BEGRUENDUNGEN stehen weiter in `docs/BUEHNE_2A.md`. Hier stehen nur',
  'die Werte. Wer wissen will, WARUM die Tinte warm ist, liest dort.',
  '',
  `Gemessen am ${new Date().toISOString().slice(0, 10)} ueber ${ABEND.length} Stationen.`,
  '',
];
for (const [topf, titel] of TOEPFE) {
  const m = cozy.gesamt[topf];
  if (!m || !m.size) continue;
  zeilen.push(`## ${titel}`, '');
  const sortiert = Array.from(m.entries()).sort((a, b) => b[1].n - a[1].n);
  for (const [wort, v] of sortiert) {
    // ⚠️ markiert Einzelgaenger: ein Wert auf genau EINER Folie ist kein
    // Hausstil, sondern ein Rest oder eine bewusste Ausnahme. Wer die Bibel
    // liest, soll den Unterschied sehen, statt beides fuer gesetzt zu halten.
    const einzeln = v.wo.size === 1 && ABEND.length >= 5;
    zeilen.push(`* ${einzeln ? '⚠️ ' : ''}\`${wort}\` — ${v.n}x, ${v.wo.size} Station${v.wo.size === 1 ? '' : 'en'}`
      + `${einzeln ? ` (**nur ${Array.from(v.wo)[0]}**)` : ''}${v.bsp ? ` (z.B. „${v.bsp}")` : ''}`);
  }
  zeilen.push('');
}
fs.writeFileSync('docs/DESIGNSPRACHE.md', zeilen.join('\n'));
console.log('\n  Bibel geschrieben: docs/DESIGNSPRACHE.md');

// ── Einzelgaenger IN der Referenz ─────────────────────────────────────────
// 2026-08-28, Wolf: „wirklich hat cozyquiz noch keine konsistenten fonts?
// Dann musst du die tools entsprechend optimieren!"
//
// Der Einwand trifft das Werkzeug, nicht nur die Antwort. Bis eben galt alles
// als erlaubt, was CozyQuiz irgendwo tut. Fredoka steht auf genau EINER von
// fuenfzehn Stationen (die Schaetzchen-Zahlen, Entscheidung vom 12.07., aelter
// als die Schrift-Entscheidung vom 26.08.) - und damit haette CrowdQuiz
// Fredoka benutzen duerfen, ohne dass hier je etwas auffaellt. Die Referenz
// wuescht ihren eigenen Ausrutscher.
//
// Ein Wort, das die Hausschrift ist, steht auf vielen Folien. Eines, das auf
// genau einer steht, ist entweder ein Rest oder eine bewusste Ausnahme - und
// beides gehoert vor Augen, nicht in die Referenz hinein.
//
// ⚠️ Das ist ein HINWEIS, kein Urteil. Manche Einzelgaenger sind richtig: die
// Wortmarke steht nur in der Lobby, ein Kategorie-Ton nur auf seiner Folie.
// Deshalb wird nur gelistet, und nur wenn ueberhaupt genug Stationen gemessen
// wurden, dass „eine von vielen" etwas heisst.
if (ABEND.length >= 5) {
  const einzel = [];
  for (const [topf, titel] of TOEPFE) {
    for (const [wort, v] of cozy.gesamt[topf] ?? []) {
      if (v.wo.size === 1 && !istPalette(wort)) einzel.push({ titel, wort, v });
    }
  }
  console.log(`\n${'─'.repeat(74)}`);
  console.log(`Einzelgaenger in der Referenz (nur EINE von ${ABEND.length} Stationen)`);
  console.log('─'.repeat(74));
  // ⚠️ Je kuerzer der Lauf, desto laenger diese Liste: bei sechs Stationen ist
  // „nur eine" schwach, bei fuenfzehn ist es ein Befund. Wer sie ernst nimmt,
  // faehrt den ganzen Abend.
  if (ABEND.length < GEMEINSAM.length) {
    console.log(`  (Teillauf ueber ${ABEND.length} von ${GEMEINSAM.length} Stationen - die Liste ist`
      + '\n   dadurch laenger als sie sein muesste. Aussagekraeftig erst im vollen Lauf.)');
  }
  if (!einzel.length) console.log('  ✓ keine - jeder Wert kommt auf mehr als einer Folie vor.');
  for (const e of einzel.sort((a, b) => b.v.n - a.v.n)) {
    console.log(`  ${e.titel.padEnd(11)} ${String(e.v.n).padStart(3)}x  ${Array.from(e.v.wo)[0].padEnd(14)} ${e.wort}${e.v.bsp ? `   („${e.v.bsp}")` : ''}`);
  }
}

if (nurBibel) {
  if (cozy.fehler.length) console.log(`  ⚠ ${cozy.fehler.length} Stationen UNGEPRUEFT: ${cozy.fehler.join('; ')}`);
  process.exit(0);
}

console.log('\nMesse CrowdQuiz ...');
const crowd = await abendMessen(true);

// ── Abgleich ───────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(74));
console.log('Woerter, die CrowdQuiz benutzt und CozyQuiz nirgends kennt');
console.log('─'.repeat(74));
let fremd = 0;
for (const [topf, titel] of TOEPFE) {
  const nur = Array.from(crowd.gesamt[topf]?.entries() ?? [])
    .filter(([w]) => !cozy.gesamt[topf]?.has(w) && !istPalette(w))
    .sort((a, b) => b[1].n - a[1].n);
  if (!nur.length) { console.log(`\n  ${titel.padEnd(12)} ✓ keine`); continue; }
  fremd += nur.length;
  console.log(`\n  ${titel}`);
  for (const [wort, v] of nur) {
    console.log(`     ${String(v.n).padStart(4)}x  ${Array.from(v.wo).join(', ')}`);
    console.log(`           ${wort}${v.bsp ? `   („${v.bsp}")` : ''}`);
  }
}

const kaputt = cozy.fehler.length + crowd.fehler.length;
console.log('\n' + '─'.repeat(74));
console.log(fremd === 0
  ? '  ✓ CrowdQuiz benutzt kein Wort, das CozyQuiz nicht auch benutzt.'
  : `  ${fremd} fremde Woerter. Jedes ist ein VERDACHT, kein Urteil - manche`
    + '\n    gehoeren zum Format (Wappen, Fraktionsband). Das entscheidet das Auge.');
if (kaputt) {
  console.log(`  ⚠ ${kaputt} Stationen UNGEPRUEFT, die zaehlen nicht als sauber:`);
  for (const f of [...cozy.fehler, ...crowd.fehler]) console.log(`      ${f}`);
}
process.exit(fremd === 0 && kaputt === 0 ? 0 : 1);
