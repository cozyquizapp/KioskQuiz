/* handy-gleichlauf — sagen Buehne und Handy im selben Moment dasselbe?
 *
 * 2026-08-29, Wolf: „geh den gleichlauf beamer/handy systematisch durch".
 *
 * ── Was hier NICHT gemessen wird ──────────────────────────────────────────
 * Nicht das Bild. Buehne und Handy SOLLEN verschieden aussehen: 1760x990 aus
 * zehn Metern gegen 390x844 in der Hand, alle Teams gegen mein Team. Ein
 * Bildvergleich meldete lauter Unterschiede und keinen einzigen Fehler.
 *
 * Auch nicht der Server. Beide Seiten lesen dasselbe `QQStateUpdate`, ein
 * Vergleich der Socket-Daten mit sich selbst geht immer auf. Die Frage ist,
 * ob am ENDE der beiden Rendering-Wege dasselbe steht.
 *
 * ── Was gemessen wird ─────────────────────────────────────────────────────
 * Sieben Tatsachen, die auf beiden Seiten SICHTBAR sind und uebereinstimmen
 * muessen, weil sie derselbe Gegenstand sind:
 *
 *   1 Phase       die Buehne meldet ihre Phase in `data-qq-phase`. Sie darf
 *                 nicht hinter dem Abend herhinken.
 *   2 Frage       derselbe Wortlaut, Zeichen fuer Zeichen.
 *   3 Kategorie   derselbe Name (Gross-/Kleinschreibung ist Gestaltung).
 *   4 Timer       dieselbe Restzeit. Beide rechnen aus der Serverzeit; eine
 *                 Abweichung ist echt und keine Messungenauigkeit. Toleranz
 *                 2 s, weil die beiden Aufnahmen nacheinander passieren.
 *   5 Teamname    wie das Handy meine Fraktion nennt, muss die Buehne sie
 *                 auch nennen. Zwei Namen fuer dieselbe Sache sind schlimmer
 *                 als ein falscher.
 *   6 Sprache     keine Mischung. Steht die eine Seite auf Englisch und die
 *                 andere schreibt deutsch, ist der Abend zweisprachig statt
 *                 die App.
 *   7 Bedienung   was die Buehne fuer beendet erklaert, darf das Handy nicht
 *                 mehr anbieten. Das war der Fund vom 29.08.: nach dem Reveal
 *                 blieb das Eingabefeld offen.
 *
 * ── Warum keine Test-Attribute im Produktivcode ───────────────────────────
 * Verlockend waere, beiden Seiten `data-qq-frage` usw. mitzugeben. Dann
 * pruefte das Werkzeug aber, ob zwei Attribute gleich sind, die aus derselben
 * Zeile kommen - und genau das geht immer auf. Gelesen wird deshalb der
 * SICHTBARE Text, so wie ihn auch ein Gast liest.
 *
 * ── Der Selbsttest ────────────────────────────────────────────────────────
 * Ein Werkzeug, das „0 Befunde" meldet, kann heissen: alles gut, oder: es
 * misst nichts. `--selbsttest` baut nacheinander sechs Fehler in die Seiten
 * ein und prueft, dass jeder gemeldet wird. Erst danach ist ein leerer
 * Bericht eine Aussage. (2026-08-29 hat genau diese Sorge dreimal gestimmt:
 * handy-bedienung.mjs meldete „0 Befunde" und mass fast nichts.)
 *
 * VORAUSSETZUNG: Backend (4000) + Frontend (5173).
 * NUTZUNG:
 *   node scripts/handy-gleichlauf.mjs [--mega] [--look=kolosseum] [--secs=200]
 *   node scripts/handy-gleichlauf.mjs --selbsttest
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { handyStarten } from './lib/handy.mjs';

const mega = process.argv.includes('--mega');
const selbsttest = process.argv.includes('--selbsttest');
const look = (process.argv.find(a => a.startsWith('--look=')) ?? '--look=standard').split('=')[1];
const SECS = Number((process.argv.find(a => a.startsWith('--secs=')) ?? '--secs=200').split('=')[1]);
/* Der Raum wird auf EINE Sprache gestellt, bevor gemessen wird.
 *
 * Bei 'both' flippt die Buehne alle 12 s und das Handy haengt an seinem
 * eigenen Fahnen-Schalter: die beiden Seiten stehen dann mit Absicht zeitweise
 * in verschiedenen Sprachen, und die Sprach-Regel meldete lauter Befunde, die
 * keine sind. Wer das ZWEISPRACHIGE Verhalten pruefen will, nimmt
 * --sprache=both und liest die Sprach-Befunde als Beobachtung, nicht als
 * Fehler. */
const SPRACHE = (process.argv.find(a => a.startsWith('--sprache=')) ?? '--sprache=en').split('=')[1];

const TIMER_TOLERANZ = 2;   // Sekunden; die beiden Aufnahmen liegen nacheinander

/* ── Tatsachen von einer Seite lesen ───────────────────────────────────────
 *
 * Laeuft im Browser, auf Buehne und Handy identisch. Was hier nicht sicher
 * erkannt wird, wird NICHT geraten, sondern bleibt null - und ein null-Wert
 * fuehrt nie zu einem Befund, sondern zu einer Zeile „nicht gelesen" im
 * Bericht. Ein Werkzeug, das im Zweifel meldet, wird abgeschaltet.
 */
const TATSACHEN = ({ kategorien }) => {
  /* ZWEI Sammlungen, und der Unterschied hat mich einen Lauf gekostet.
   *
   * `eigen` sind Elemente mit einem EIGENEN Textknoten. Daraus laesst sich
   * ablesen, was eine Seite als einzelne Aussage zeigt - die Frage, ein Titel.
   *
   * `ganz` ist der volle Textinhalt kleiner Behaelter. Noetig, weil die Buehne
   * Ueberschriften BUCHSTABENWEISE in eigene Spans legt (fuer die Anlauf-
   * Animation). „CROWDQUIZ" steht dort als C,R,O,W,D,Q,U,I,Z, und in `eigen`
   * taucht das Wort deshalb nie auf. Ein Vergleich „steht X auf der Buehne?"
   * gegen `eigen` haette dort immer nein gesagt.
   *
   * Gesucht wird deshalb in `ganz`, entschieden wird aus `eigen`. */
  const eigen = [], ganz = [], groessen = [];
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const voll = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (voll && voll.length <= 300) ganz.push(voll);
    if ([...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) {
      eigen.push(voll);
      groessen.push({ t: voll, px: parseFloat(cs.fontSize) || 0 });
    }
  }
  const steht = (t) => !!t && ganz.some(g => g.includes(t));

  /* Frage: der GROESSTE Satz, nicht der laengste.
   *
   * Zuerst stand hier „laengster Text ab 40 Zeichen". Das ging schief, sobald
   * eine Frage kurz ist: „Which landmark is shown here?" hat 29 Zeichen, und
   * die Regel meldete an sieben von sieben Stationen „nichts zu messen" -
   * schlimmer als ein falscher Befund, weil es wie Ruhe aussieht.
   *
   * Die Buehne setzt die Frage in 83 px, alles andere ist kleiner. Die
   * Schriftgroesse ist damit das verlaessliche Merkmal, und 15 Zeichen
   * Mindestlaenge halten Zahlen und Rundennamen draussen. Die Regel selbst
   * fragt ausserdem nur waehrend der Frage - sonst waere das groesste Element
   * irgendein Titel. */
  const kandidaten = groessen.filter(g => g.t.length >= 15 && g.t.length <= 400);
  const frage = kandidaten.length ? kandidaten.sort((a, b) => b.px - a.px)[0].t : null;

  /* Kategorie: gegen die Liste aus shared/quarterQuizTypes.ts, nicht geraten.
   * Gesucht wird in `ganz`, weil die Buehne den Namen gesperrt setzt und dabei
   * in Spans zerlegt. */
  const kategorie = kategorien.find(k => ganz.some(g => g.toLowerCase() === k.toLowerCase())) ?? null;

  /* Zahlen, die ALLEIN in einem Element stehen. Was davon ein Timer ist,
   * entscheidet die Regel, nicht diese Funktion: in der Lobby steht hier auch
   * die Zahl der beigetretenen Teams, im PLACEMENT der Rang. */
  const zahlen = [...new Set(eigen
    .map(t => /^(\d{1,3})\s*s?$/.exec(t))
    .filter(Boolean).map(m => Number(m[1])).filter(n => n > 0 && n <= 300))];

  return {
    phase: document.querySelector('[data-qq-phase]')?.getAttribute('data-qq-phase') ?? null,
    frage, kategorie, zahlen,
    /* Nur was gebraucht wird, nicht die ganze Seite: ein Roh-Abzug von zwei
     * Seiten mal sieben Stationen ist ein Megabyte, das niemand liest. */
    hatText: null, ganz, eigen,
    eingaben: [...document.querySelectorAll('input, textarea')]
      .filter(el => !el.disabled && el.type !== 'hidden' && el.getBoundingClientRect().width > 8).length,
  };
};

/* ── Sprache ───────────────────────────────────────────────────────────────
 * Kein Sprachmodell, eine Wortliste. Sie muss nicht vollstaendig sein, nur
 * eindeutig: jedes Wort darin kommt in der anderen Sprache nicht vor. */
const DE = /\b(und|nicht|jetzt|bitte|dein|deine|euer|eure|warten|antworten|antwort|punkte|runde|frage|regeln|sekunden|spiel|gewonnen|richtig|falsch|naechste|weiter|zurueck|los)\b/i;
const EN = /\b(and|not|now|please|your|waiting|answer|points|round|question|rules|seconds|game|won|correct|wrong|next|back|go)\b/i;
const UMLAUT = /[äöüßÄÖÜ]/;

function sprache(texte, ausnahmen = []) {
  let de = 0, en = 0;
  const deutsch = [], englisch = [];
  for (const t of texte) {
    if (ausnahmen.some(a => a && t.includes(a))) continue;
    const istDe = DE.test(t) || UMLAUT.test(t);
    const istEn = EN.test(t);
    if (istDe && !istEn) { de++; deutsch.push(t); }
    else if (istEn && !istDe) { en++; englisch.push(t); }
  }
  return { de, en, deutsch, englisch, seite: de > en ? 'de' : en > de ? 'en' : null };
}

/* ── Die sieben Regeln ─────────────────────────────────────────────────────
 *
 * Eine Regel meldet einen Befund, oder sie meldet, dass sie nichts zu
 * vergleichen hatte. Das zweite steht getrennt im Bericht, damit „keine
 * Befunde" nicht mit „nichts gemessen" verwechselt wird.
 *
 * ⚠️ Wo eine Regel eine QUELLE braucht, ist es die Buehne. Sie zeigt Frage,
 * Kategorie und Teamliste vollstaendig; das Handy zeigt meinen Ausschnitt
 * davon. Zwei Ausschnitte gegeneinander zu halten hat im ersten Lauf vier
 * Fehlmeldungen erzeugt.
 */
function pruefen(phase, B, H, teamName, fraktionen) {
  const funde = [], ungelesen = [];
  const merke = (regel, text) => funde.push({ phase, regel, text });
  const stehtAuf = (seite, t) => !!t && seite.ganz.some(g => g.includes(t));

  // 1 Phase - die Buehne meldet sie selbst.
  if (!B.phase) ungelesen.push('Phase (Buehne meldet kein data-qq-phase)');
  else if (B.phase !== phase) merke('Phase', `Abend ist bei ${phase}, die Buehne zeigt ${B.phase}`);

  // 2 Frage - Buehne ist die Quelle, das Handy muss sie tragen.
  if (!/^QUESTION/.test(phase)) ungelesen.push('Frage (in dieser Phase steht keine auf der Wand)');
  else if (B.frage) {
    if (!stehtAuf(H, B.frage)) {
      merke('Frage', `die Buehne fragt „${B.frage.slice(0, 70)}", das Handy zeigt diesen Wortlaut nicht`);
    }
  } else ungelesen.push('Frage (die Buehne zeigt keinen Satz ab 15 Zeichen)');

  // 3 Kategorie - ebenso.
  //
  // ⚠️ Ein Befund ist nur der WIDERSPRUCH, nicht das Fehlen. Zeigt eine Seite
  // die Kategorie und die andere nicht, ist das eine Gestaltungsfrage - das
  // Handy traegt sie dauerhaft in der Kopfzeile, die Buehne blendet sie bei
  // der Aufloesung aus, damit die Antwort allein steht. Der erste Lauf hat
  // daraus einen Befund gemacht, der keiner war.
  if (B.kategorie && H.kategorie) {
    if (B.kategorie.toLowerCase() !== H.kategorie.toLowerCase()) {
      merke('Kategorie', `Buehne „${B.kategorie}", Handy „${H.kategorie}"`);
    }
  } else ungelesen.push('Kategorie (nur eine Seite oder keine nennt eine)');

  // 4 Timer - NUR waehrend die Frage laeuft.
  //
  // ⚠️ Ausserhalb steht auf beiden Seiten allerlei allein stehende Zahl: die
  // Zahl beigetretener Teams in der Lobby, der Rang im PLACEMENT. Der erste
  // Lauf hat daraus drei Befunde gemacht, alle falsch. Und auch hier wird
  // nicht behauptet, welche Zahl der Buehne der Timer IST - gefragt wird, ob
  // ueberhaupt eine davon zur Restzeit des Handys passt. Das findet einen
  // auseinandergelaufenen Timer und erfindet keinen.
  if (phase === 'QUESTION_ACTIVE') {
    const h = H.zahlen.length ? Math.max(...H.zahlen) : null;
    if (h == null) ungelesen.push('Timer (das Handy zeigt keine Restzeit)');
    else if (!B.zahlen.length) merke('Timer', `das Handy zeigt ${h}s, die Buehne gar keine Zahl`);
    else if (!B.zahlen.some(n => Math.abs(n - h) <= TIMER_TOLERANZ)) {
      merke('Timer', `Handy ${h}s, auf der Buehne steht keine Zahl in Reichweite (dort: ${B.zahlen.join(', ')})`);
    }
  } else ungelesen.push('Timer (laeuft in dieser Phase keiner)');

  // 5 Teamname - nur wo die Buehne ueberhaupt Fraktionen nennt.
  //
  // Sonst waere jede Regel-Folie ein Befund: dort steht kein einziger Team-
  // name, und das ist richtig so. Interessant ist der Fall, in dem die Buehne
  // Fraktionen zeigt und meine nicht darunter ist - besonders, wenn sie sie
  // in der ANDEREN Sprache nennt. Zwei Namen fuer dieselbe Fraktion sind
  // schlimmer als ein falscher.
  if (!teamName) ungelesen.push('Teamname (das Handy nennt keinen)');
  else {
    //
    // ⚠️ Mindestens DREI, nicht eine. Die Team-Vorstellung zeigt die Fraktionen
    // nacheinander im Scheinwerfer; wer genau dann misst, sieht eine - und
    // „meine ist nicht dabei" waere dort immer wahr und nie ein Fehler. Erst ab
    // drei gleichzeitig ist es eine LISTE, und erst dann besagt ein Fehlen etwas.
    const aufBuehne = fraktionen.filter(f => stehtAuf(B, f.de) || stehtAuf(B, f.en));
    if (aufBuehne.length < 3) ungelesen.push('Teamname (die Buehne zeigt in dieser Phase keine Fraktionsliste)');
    else if (!stehtAuf(B, teamName)) {
      const meine = fraktionen.find(f => f.de === teamName || f.en === teamName);
      const anders = meine && (stehtAuf(B, meine.de) ? meine.de : stehtAuf(B, meine.en) ? meine.en : null);
      merke('Teamname', anders
        ? `dieselbe Fraktion heisst auf dem Handy „${teamName}" und auf der Buehne „${anders}"`
        : `das Handy nennt die Fraktion „${teamName}", die Buehne zeigt ${aufBuehne.length} andere`);
    }
  }

  // 6 Sprache - Fraktions- und Kategorienamen ausgenommen, die pruefen 3 und 5.
  const ausnahmen = [...fraktionen.flatMap(f => [f.de, f.en]), B.kategorie, H.kategorie].filter(Boolean);
  const sB = sprache(B.eigen, ausnahmen), sH = sprache(H.eigen, ausnahmen);
  if (sB.seite && sH.seite && sB.seite !== sH.seite) {
    const fremd = sH.seite === 'de' ? sH.deutsch : sH.englisch;
    merke('Sprache', `Buehne ${sB.seite.toUpperCase()}, Handy ${sH.seite.toUpperCase()} — auf dem Handy z.B. „${fremd[0]}"`);
  } else if (!sB.seite || !sH.seite) ungelesen.push('Sprache (eine Seite hat zu wenig Text zum Einordnen)');

  // 7 Bedienung - was die Buehne fuer beendet erklaert, bietet das Handy nicht an.
  if (phase === 'QUESTION_REVEAL' && H.eingaben > 0) {
    merke('Bedienung', `die Buehne loest auf, das Handy laesst ${H.eingaben} Eingabefeld(er) offen`);
  } else if (phase !== 'QUESTION_REVEAL') ungelesen.push('Bedienung (nur bei der Aufloesung gepruft)');

  return { funde, ungelesen };
}

/* ── Selbsttest ────────────────────────────────────────────────────────────
 * Sechs Faelle, jeder baut EINEN Fehler in die gelesenen Tatsachen und
 * erwartet genau die eine Regel. Laeuft ohne Browser: die Regeln arbeiten auf
 * einfachen Objekten, also lassen sie sich auch mit welchen fuettern. */
function selbsttestLaufen(fraktionen) {
  const FRAGE = 'Wie viele Tasten hat eine Standard-Tastatur ohne Ziffernblock?';
  const seite = (t, extra = {}) => ({
    phase: 'QUESTION_ACTIVE', frage: null, kategorie: 'Close Call', zahlen: [27],
    eigen: t, ganz: t, eingaben: 0, ...extra,
  });
  const gut = () => ({
    // Drei Fraktionen, weil die Teamnamen-Regel erst ab drei von einer LISTE
    // ausgeht (siehe dort). Mit zweien meldete der Fall nichts - der
    // Selbsttest hat die Verschaerfung sofort bemerkt.
    B: seite(['Gut Feeling', 'Lucky Guess', 'Happy Hour', 'Close Call', FRAGE, 'and your points'], { frage: FRAGE }),
    H: seite(['Gut Feeling', 'Close Call', FRAGE, 'answer your question now'], { phase: null }),
  });

  /* Jeder Fall baut GENAU einen Fehler ein und erwartet GENAU eine Regel.
   * Meldet ein Fall zusaetzlich eine andere, ist der Fall schlecht gebaut -
   * dann sagt der Selbsttest nicht mehr, welche Regel er geprueft hat. */
  const faelle = [
    ['Phase',     g => { g.B.phase = 'RULES'; }, 'QUESTION_ACTIVE'],
    ['Frage',     g => { g.H.eigen = g.H.ganz = g.H.ganz.filter(t => t !== FRAGE); }, 'QUESTION_ACTIVE'],
    ['Kategorie', g => { g.H.eigen = g.H.ganz = g.H.ganz.map(t => t === 'Close Call' ? 'Ten Chips' : t); g.H.kategorie = 'Ten Chips'; }, 'QUESTION_ACTIVE'],
    ['Timer',     g => { g.B.zahlen = [19]; }, 'QUESTION_ACTIVE'],
    ['Teamname',  g => { g.B.eigen = g.B.ganz = g.B.ganz.map(t => t === 'Gut Feeling' ? 'Bauchgefühl' : t); }, 'QUESTION_ACTIVE'],
    ['Sprache',   g => { g.H.eigen = g.H.ganz = ['Gut Feeling', 'Close Call', FRAGE, 'Jetzt antworten und Punkte holen']; }, 'QUESTION_ACTIVE'],
    ['Bedienung', g => { g.B.phase = 'QUESTION_REVEAL'; g.H.eingaben = 1; }, 'QUESTION_REVEAL'],
  ];

  console.log('\n── Selbsttest ─────────────────────────────────────────────');
  let ok = 0;

  /* Erst der saubere Fall. Ein Werkzeug, das immer meldet, ist so nutzlos wie
   * eines, das nie meldet. */
  const rein = pruefen('QUESTION_ACTIVE', gut().B, gut().H, 'Gut Feeling', fraktionen);
  const reinOk = rein.funde.length === 0;
  console.log(`${reinOk ? '✓' : '✗'} sauberer Fall meldet nichts`
    + (reinOk ? '' : `  — gemeldet: ${rein.funde.map(f => `${f.regel} (${f.text})`).join(' | ')}`));
  if (reinOk) ok++;

  for (const [regel, brechen, phase] of faelle) {
    const g = gut();
    if (phase === 'QUESTION_REVEAL') g.B.phase = 'QUESTION_REVEAL';
    brechen(g);
    const r = pruefen(phase, g.B, g.H, 'Gut Feeling', fraktionen);
    const getroffen = r.funde.some(f => f.regel === regel);
    const daneben = r.funde.filter(f => f.regel !== regel).map(f => f.regel);
    const sauber = getroffen && !daneben.length;
    console.log(`${sauber ? '✓' : getroffen ? '~' : '✗'} ${regel.padEnd(10)} wird gemeldet`
      + (daneben.length ? `  ⚠️ zusaetzlich: ${daneben.join(', ')}` : '')
      + (getroffen ? '' : `  — gemeldet wurde: ${r.funde.map(f => f.regel).join(', ') || 'nichts'}`));
    if (sauber) ok++;
  }

  /* Und ein Fall gegen die Selbsttaeuschung: eine Regel, die nichts zu lesen
   * bekommt, darf NICHT als bestanden durchgehen. */
  const nichts = (extra = {}) => seite([], { frage: null, kategorie: null, zahlen: [], ...extra });
  const leer = pruefen('QUESTION_ACTIVE', nichts(), nichts({ phase: null }), null, fraktionen);
  const leerOk = leer.funde.length === 0 && leer.ungelesen.length >= 5;
  console.log(`${leerOk ? '✓' : '✗'} leere Seiten melden nichts, aber ${leer.ungelesen.length} mal „nicht gemessen"`);
  if (leerOk) ok++;

  const gesamt = faelle.length + 2;
  console.log(`\n${ok}/${gesamt} bestanden.`);
  return ok === gesamt;
}

const { QQ_CATEGORY_LABELS, QQ_FRAKTIONEN } = await import('./lib/kategorien.mjs');
if (selbsttest) process.exit(selbsttestLaufen(QQ_FRAKTIONEN) ? 0 : 1);

/* ── Der Abend ─────────────────────────────────────────────────────────────── */
const b = await handyStarten({ mega, secs: SECS, look, sprache: SPRACHE });
const alleFunde = [], alleUngelesen = new Map(), stationen = [];

await b.abendMitfahren(async (phase) => {
  /* Beide Seiten so kurz hintereinander wie moeglich - der Timer laeuft. */
  const t0 = Date.now();
  const B = await b.buehne.evaluate(TATSACHEN, { kategorien: QQ_CATEGORY_LABELS }).catch(() => null);
  const H = await b.handy.evaluate(TATSACHEN, { kategorien: QQ_CATEGORY_LABELS }).catch(() => null);
  const abstand = Date.now() - t0;
  if (!B || !H) return;

  /* Der Teamname steht in der Kopfzeile des Handys - das erste Element mit
   * eigenem Text, das kein Knopf ist. */
  const teamName = await b.handy.evaluate(() => {
    const kopf = document.querySelector('header, .qq-team-page header');
    if (!kopf) return null;
    for (const el of kopf.querySelectorAll('*')) {
      const t = (el.textContent ?? '').trim();
      if (t && t.length < 40 && !el.closest('button')) return t;
    }
    return null;
  }).catch(() => null);

  const { funde, ungelesen } = pruefen(phase, B, H, teamName, QQ_FRAKTIONEN);
  alleFunde.push(...funde);
  for (const u of ungelesen) alleUngelesen.set(u, (alleUngelesen.get(u) ?? 0) + 1);
  stationen.push({ phase, abstand, teamName, B, H, funde: funde.length });
  console.log(`  ${funde.length ? '⚠️' : '✓ '} ${phase.padEnd(16)} ${funde.length} Befund(e)`
    + `  [Aufnahmeabstand ${abstand} ms]`);
});
await b.schliessen();

/* ── Bericht ──────────────────────────────────────────────────────────────── */
mkdirSync('.shots/gleichlauf', { recursive: true });
const REGELN = ['Phase', 'Frage', 'Kategorie', 'Timer', 'Teamname', 'Sprache', 'Bedienung'];
const z = [`# Gleichlauf Buehne / Handy`, '',
  `${mega ? 'CrowdQuiz' : 'CozyQuiz'} · ${look === 'kolosseum' ? 'Kolosseum-Look' : 'Standarddesign'} · Sprache ${SPRACHE} · ${new Date().toISOString().slice(0, 10)}`,
  `${stationen.length} Stationen: ${stationen.map(s => s.phase).join(', ')}.`, '',
  'Verglichen wird der SICHTBARE Text beider Seiten im selben Moment, nicht das',
  'Bild und nicht der Socket. Der Kopf des Werkzeugs erklaert, warum.', '',
  '## Was jede Regel gefunden hat', '',
  '| Regel | Befunde | Stationen ohne Messung |', '|---|---:|---:|'];
for (const r of REGELN) {
  const n = alleFunde.filter(f => f.regel === r).length;
  const u = [...alleUngelesen].filter(([k]) => k.startsWith(r)).reduce((s, [, v]) => s + v, 0);
  z.push(`| ${r} | ${n} | ${u} |`);
}
z.push('', alleFunde.length ? `## ${alleFunde.length} Befunde` : '## Keine Befunde', '');
for (const f of alleFunde) z.push(`* **${f.phase} · ${f.regel}** — ${f.text}`);
if (!alleFunde.length) z.push('Beide Seiten sagen an jeder gemessenen Station dasselbe.', '');

z.push('', '## Was nicht gemessen werden konnte', '',
  'Wichtiger als die Befunde: eine Regel, die nie etwas zu lesen bekam, hat',
  'auch nichts geprueft.', '');
if (alleUngelesen.size) for (const [k, v] of alleUngelesen) z.push(`* ${k} — an ${v} von ${stationen.length} Stationen`);
else z.push('Jede Regel hatte an jeder Station etwas zu vergleichen.');

z.push('', '## Aufnahmeabstand', '',
  'Buehne und Handy werden nacheinander gelesen. Der Abstand begrenzt, wie',
  'genau der Timer verglichen werden kann.', '',
  `Groesster Abstand: ${Math.max(...stationen.map(s => s.abstand))} ms, `
  + `Toleranz der Timer-Regel: ${TIMER_TOLERANZ * 1000} ms.`, '');

const text = z.join('\n');
writeFileSync(`.shots/gleichlauf/BERICHT${mega ? '-CROWD' : ''}.md`, text);
writeFileSync(`.shots/gleichlauf/ROH${mega ? '-CROWD' : ''}.json`, JSON.stringify(stationen, null, 1));
console.log('\n' + text);
