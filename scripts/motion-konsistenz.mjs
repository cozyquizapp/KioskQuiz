/* motion-konsistenz — faellt irgendeine Bewegung aus der Reihe?
 *
 * 2026-08-26 (Wolf): „Was wir im Hintergrund behalten müssen ist die app
 * Konsistenz von Anfang bis Ende, dass keine Motion völlig aus der Reihe
 * fällt."
 *
 * ⚠️ Ohne Pruefung ist das ein Vorsatz. Und es ist ein Vorsatz, der mit jeder
 * eingebauten Bewegung schwerer nachzuholen wird: wer am Ende dreissig Folien
 * hat, vergleicht sie nicht mehr von Hand.
 *
 * ── Wogegen gemessen wird, und warum das nichts Erfundenes ist ─────────────
 * Der Hausbestand steht seit dem 2026-07-12 in `frontend/src/main.css`, mit
 * Rollen UND Dauerbereichen, jeweils als Kommentar dahinter:
 *
 *   --qq-enter      cubic-bezier(0.22, 1, 0.36, 1)      Auftritte      480-680 ms
 *   --qq-exit       cubic-bezier(0.4, 0, 1, 1)          Verlassen      200-280 ms
 *   --qq-state      cubic-bezier(0.4, 0, 0.2, 1)        Hover/Farbe    160-240 ms
 *   --qq-carry      cubic-bezier(0.34, 1.05, 0.5, 1)    durch den Raum 700-800 ms
 *   --qq-celebrate  cubic-bezier(0.34, 1.56, 0.64, 1)   Hero-Beat      500-700 ms
 *   --qq-press      cubic-bezier(0.3, 0, 0.4, 1)        Tap            90 ms
 *
 * Dazu steht dort eine Regel, und sie ist die schaerfste, die das Haus hat:
 * „Overshoot (--qq-celebrate) nur fuer den EINEN Hero-Beat pro Screen."
 *
 * Dieses Werkzeug erfindet also keinen Standard, es haelt den vorhandenen an
 * das, was wirklich laeuft.
 *
 * ── Drei Fragen, drei Antworten ────────────────────────────────────────────
 * 1. Welche Kurven laufen ueberhaupt, und wie viele davon sind Hausbestand?
 * 2. Passen die Dauern zu der Rolle, deren Kurve sie benutzen?
 * 3. Wie viele Overshoot-BEWEGUNGEN laufen je Folie gleichzeitig? Eine ist die
 *    Regel. Endlose Bewegungen (Gluehwuermchen, Atmen) zaehlen nicht mit - die
 *    sind Atmosphaere, kein Beat.
 *
 * ⚠️⚠️ Gezaehlt werden BEWEGUNGEN, nicht Elemente. Der erste Durchgang hat
 * Elemente gezaehlt und meldete „36 Overshoot gleichzeitig" fuer das Brett -
 * das sind aber 36 Kacheln, die alle dieselbe Bewegung machen. Das ist EIN
 * Beat, gestaffelt ueber 36 Kacheln, und genau so ist er gemeint. Dieselbe
 * Verwechslung hat den Hausbestand als „9 Prozent" ausgewiesen, weil 220
 * Konfettischnipsel als 220 Verstoesse zaehlten.
 *
 * ── Und eine vierte Frage, die erst die Messung aufgeworfen hat ────────────
 * 4. Wie viele der eigenen Kurven sind BEINAHE eine Hauskurve? Gemessen laufen
 *    nebeneinander cubic-bezier(0.34, 1.46 / 1.5 / 1.56 / 1.6, 0.64, 1). Das
 *    ist keine Gestaltung, das ist Streuung: vier Kurven, die dasselbe wollen
 *    und sich um Hundertstel unterscheiden. Genau solche Nachbarn sind
 *    gemeint, wenn etwas „aus der Reihe faellt" - nicht die eine bewusst
 *    andere Kurve, sondern die dreissig fast gleichen.
 *
 * ⚠️ Die Zahlen schwanken zwischen zwei Laeufen um ein paar Bewegungen. Das
 * ist kein Fehler: gemessen wird, was in genau diesem Moment LAEUFT, und
 * einzelne Stationen sind je nach Entwurf und Zufall unterschiedlich weit.
 * Ein Unterschied von zwei oder drei ist Rauschen; eine neue Kurve oder eine
 * neue Folie in der Overshoot-Liste ist es nicht.
 *
 * NUTZUNG:
 *   node scripts/motion-konsistenz.mjs          # der Abend in 13 Stationen
 *   node scripts/motion-konsistenz.mjs --alle   # alle Stationen (dauert lange)
 */
import fs from 'node:fs';
import { buehneStarten, sleep, stationsNamen } from './lib/buehne.mjs';

/** Der Hausbestand, woertlich aus main.css. Die Bereiche stehen dort als
 *  Kommentar hinter der jeweiligen Zeile. */
const HAUS = [
  { rolle: 'enter',     kurve: 'cubic-bezier(0.22, 1, 0.36, 1)',    von: 480, bis: 680, was: 'Auftritte' },
  { rolle: 'exit',      kurve: 'cubic-bezier(0.4, 0, 1, 1)',        von: 200, bis: 280, was: 'Verlassen' },
  { rolle: 'state',     kurve: 'cubic-bezier(0.4, 0, 0.2, 1)',      von: 160, bis: 240, was: 'Hover/Farbe' },
  { rolle: 'carry',     kurve: 'cubic-bezier(0.34, 1.05, 0.5, 1)',  von: 700, bis: 800, was: 'durch den Raum' },
  { rolle: 'celebrate', kurve: 'cubic-bezier(0.34, 1.56, 0.64, 1)', von: 500, bis: 700, was: 'Hero-Beat' },
  { rolle: 'press',     kurve: 'cubic-bezier(0.3, 0, 0.4, 1)',      von: 60,  bis: 140, was: 'Tap' },
  // Zwei weitere Tokens stehen in main.css, ohne eigenen Dauerbereich.
  { rolle: 'bounce-soft', kurve: 'cubic-bezier(0.34, 1.4, 0.64, 1)', von: null, bis: null, was: 'weicher Overshoot' },
  { rolle: 'pop-fast',    kurve: 'cubic-bezier(0.2, 0.8, 0.3, 1)',   von: null, bis: null, was: 'kurzer Pop' },
  { rolle: 'smooth-out',  kurve: 'cubic-bezier(0.3, 0, 0.5, 1)',     von: null, bis: null, was: 'ruhiger Abgang' },
];

/**
 * ── Was BEWUSST so ist ────────────────────────────────────────────────────
 *
 * ⚠️ Ein Messwerkzeug, das entschiedene Fragen jedes Mal neu als Befund
 * meldet, erzieht dazu, seine Meldungen zu ueberlesen. Und in diesem Haus
 * gilt ohnehin: bewusste Design-Entscheidungen sind keine Bugs (CLAUDE.md).
 * Deshalb stehen die Entscheidungen hier, mit Datum und Zitat, und der Bericht
 * trennt sie von dem, was noch offen ist.
 *
 * Wer eine davon wieder aufmachen will, braucht einen neuen Grund - nicht die
 * blosse Tatsache, dass die Messung sie findet.
 */
const ENTSCHIEDEN = {
  /**
   * BESTANDSSCHUTZ, kein Freibrief.
   *
   * Wolfs Entscheidung war grundsaetzlich, nicht folienweise: der heutige Stand
   * ist abgenommen, die Regel gilt ab jetzt. Deshalb steht hier der Bestand vom
   * 2026-08-26, und das Werkzeug meldet nur noch, was NEU dazukommt. Genau so
   * bleibt die Regel fuer den restlichen Motion-Durchgang scharf, ohne dass
   * jemand rueckwirkend aufraeumen muss.
   *
   * Wer eine Folie hier eintraegt, ohne dass Wolf sie gesehen hat, hebelt genau
   * das aus. Neue Zeilen also nur mit Datum und Zitat.
   */
  overshoot: {
    stationen: ['aufloesungUnten', 'lobby', 'zwischenstand', 'cozygame', 'brett',
      'turmfinale', 'siegerehrung', 'teams'],
    am: '2026-08-26',
    zitat: 'Ich fands bisher überhaupt nicht unruhig, ich denke wir können es lassen '
      + 'anstatt kontext für das erstellen von alternativen zu verbrauchen, die vlt nicht besser sind',
    grund: 'Die Hausregel „ein Overshoot je Folie" bleibt als Richtwert stehen, aber sie '
      + 'wird nicht rueckwirkend durchgesetzt. Wolf sieht die Aufloesung seit Monaten '
      + 'jeden Abend; sein Urteil dazu wiegt mehr als eine Zahl aus einem Kommentar.',
  },
  nachbarn: {
    am: '2026-08-26',
    grund: 'Die 22 Kurven, die knapp neben einer Hauskurve liegen, bleiben. Der Unterschied '
      + 'liegt unter der Wahrnehmungsschwelle (naechste bei 0,05), das Zusammenlegen waere '
      + 'also Aufwand ohne sichtbaren Gewinn - mit einem kleinen Risiko, dass eine Bewegung '
      + 'danach anders wirkt.',
  },
  enterKurve: {
    am: '2026-08-26',
    grund: 'cubic-bezier(0.16, 1, 0.3, 1) und --qq-enter (0.22, 1, 0.36, 1) bleiben '
      + 'nebeneinander bestehen. ⚠️ Ich hatte behauptet, den Token umzuschreiben aendere '
      + 'nichts am Bild. Das war falsch: `var(--qq-enter)` steht an 16 Stellen, unter '
      + 'anderem im Szenenwechsel selbst. In beide Richtungen bewegt sich also etwas, und '
      + 'damit gilt dieselbe Abwaegung wie bei den Nachbarn.',
  },
};

/** Der Abend in 13 Stationen. Nicht willkuerlich: je eine je Folienart, die
 *  im normalen Ablauf wirklich vorkommt. */
const ABEND = ['lobby', 'willkommen', 'regeln', 'teams', 'rundenintro', 'frage',
  'aufloesungUnten', 'zwischenstand', 'cozygame', 'brett', 'turmfinale', 'siegerehrung', 'danke'];

const alle = process.argv.includes('--alle');
const STATIONEN = alle ? stationsNamen() : ABEND;

/** Zahlen in einer Kurve vereinheitlichen, damit „0.40" und „.4" gleich sind. */
const normal = (k) => (k || '').replace(/\s+/g, '').replace(/(\d*\.\d+|\d+)/g, (m) => String(Number(m)));
const HAUS_INDEX = new Map(HAUS.map(h => [normal(h.kurve), h]));

/** Overshoot heisst: die Kurve schiesst ueber ihr Ziel hinaus. Das ist keine
 *  Geschmacksfrage, sondern steht in den Zahlen - einer der beiden
 *  y-Stuetzpunkte liegt ueber 1. */
const istOvershoot = (k) => {
  const m = /cubic-bezier\(([^)]+)\)/.exec(k || '');
  if (!m) return false;
  const [, y1, , y2] = m[1].split(',').map(Number);
  return y1 > 1.001 || y2 > 1.001;
};

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();
fs.mkdirSync('.shots', { recursive: true });

/** Was gerade laeuft. Gelesen wie in motion.mjs: die echte Kurve haengt als
 *  `animation-timing-function` am Element, NICHT in `getTiming().easing` -
 *  dort steht die Vorgabe der Effekt-Ebene und die ist immer „linear". */
const laufend = () => seite.evaluate(() => {
  const kurveVom = (el, name) => {
    if (!el || !name) return '';
    const cs = getComputedStyle(el);
    const namen = (cs.animationName || '').split(',').map(s => s.trim());
    const kurven = (cs.animationTimingFunction || '').split(/,(?![^(]*\))/).map(s => s.trim());
    const i = namen.indexOf(name);
    return (i >= 0 ? kurven[i] : kurven[0]) ?? '';
  };
  // ⚠️ Bei UEBERGAENGEN dasselbe Problem wie bei Animationen: `transition-
  // property` und `transition-timing-function` sind zwei gleich lange Listen.
  // Wer die Kurvenliste am Stueck liest, bekommt „ease, ease" und vergleicht
  // eine Liste gegen eine einzelne Hauskurve - das faellt dann immer als
  // „eigene Kurve" durch, auch wenn die richtige Kurve drinsteht.
  const kurveVomUebergang = (el, eigenschaft) => {
    if (!el) return '';
    const cs = getComputedStyle(el);
    const eigen = (cs.transitionProperty || '').split(',').map(s => s.trim());
    const kurven = (cs.transitionTimingFunction || '').split(/,(?![^(]*\))/).map(s => s.trim());
    const i = eigen.indexOf(eigenschaft);
    return (i >= 0 ? kurven[i] : kurven[0]) ?? '';
  };
  return document.getAnimations().map(a => {
    const e = a.effect;
    const r = e?.getComputedTiming?.() ?? {};
    return {
      name: a.animationName ?? a.transitionProperty ?? 'Uebergang',
      dauer: Math.round(Number(r.duration) || 0),
      kurve: a.animationName
        ? kurveVom(e?.target, a.animationName)
        : kurveVomUebergang(e?.target, a.transitionProperty),
      endlos: r.iterations === Infinity,
    };
  });
});

// Nach BEWEGUNG buendeln (Name plus Kurve), nicht nach Element. Eine Bewegung
// ist eine Aussage; dass sie auf 36 Kacheln laeuft, ist ihre Staffelung.
const bewegungen = new Map(); // "name|kurve" -> { name, roh, stationen:Set, dauern:Set, teile }
const heroProStation = [];
const heroNamen = new Map();
const erreicht = [];

for (const st of STATIONEN) {
  try { await b.zurStation(st); } catch { console.log(`  ${st.padEnd(16)} nicht erreichbar`); continue; }
  // Zweimal schauen: direkt nach dem Auftritt laeuft die Einblendung, kurz
  // danach das, was steht. Wer nur einmal schaut, sieht nur die Haelfte.
  const proben = [];
  await sleep(300); proben.push(await laufend());
  await sleep(1400); proben.push(await laufend());
  erreicht.push(st);

  let heroMax = 0;
  for (const p of proben) {
    // Distinkte Bewegungen, nicht Elemente. Siehe Kopf dieser Datei.
    const hero = new Set(p.filter(z => !z.endlos && istOvershoot(z.kurve)).map(z => z.name));
    if (hero.size > heroMax) heroMax = hero.size;
    if (hero.size > 1) heroNamen.set(st, [...hero]);
    for (const z of p) {
      if (!z.kurve) continue;
      const schluessel = `${z.name}|${normal(z.kurve)}`;
      if (!bewegungen.has(schluessel)) {
        bewegungen.set(schluessel, { name: z.name, roh: z.kurve, stationen: new Set(), dauern: new Set(), teile: 0 });
      }
      const e = bewegungen.get(schluessel);
      e.stationen.add(st); e.teile++;
      if (!z.endlos && z.dauer > 0) e.dauern.add(z.dauer);
    }
  }
  heroProStation.push({ st, hero: heroMax });
  console.log(`  ${st.padEnd(16)} ${String(proben[0].length + proben[1].length).padStart(4)} laufende Teile, ${heroMax} Overshoot-Bewegungen`);
}

// ── 1. Der Bestand ────────────────────────────────────────────────────────
console.log('\n══ 1. Welche Bewegungen laufen, und auf welcher Kurve? ═════════');
const liste = [...bewegungen.values()].sort((a, z) => z.stationen.size - a.stationen.size || z.teile - a.teile);
let imHaus = 0, ausserHaus = 0;
const fremde = [];
for (const e of liste) {
  const haus = HAUS_INDEX.get(normal(e.roh));
  if (haus) imHaus++; else { ausserHaus++; fremde.push(e); }
}
console.log(`  ${liste.length} verschiedene Bewegungen ueber ${erreicht.length} Stationen.`);
console.log(`  Auf einer Hauskurve: ${imHaus}   auf einer eigenen: ${ausserHaus}`);
console.log(`  Hausbestand: ${Math.round(imHaus / Math.max(1, liste.length) * 100)} %`);

// ── 1b. Die Nachbarn ──────────────────────────────────────────────────────
// Der eigentliche Befund: nicht DASS es eigene Kurven gibt, sondern dass viele
// davon einer Hauskurve bis auf Hundertstel gleichen.
const punkte = (k) => {
  const m = /cubic-bezier\(([^)]+)\)/.exec(k || '');
  return m ? m[1].split(',').map(Number) : null;
};
const abstand = (a, z) => Math.sqrt(a.reduce((s, v, i) => s + (v - z[i]) ** 2, 0));
const nachbarn = [];
for (const e of fremde) {
  const p = punkte(e.roh);
  if (!p || p.length !== 4) continue;
  let beste = null;
  for (const haus of HAUS) {
    const q = punkte(haus.kurve);
    if (!q) continue;
    const d = abstand(p, q);
    if (!beste || d < beste.d) beste = { haus, d };
  }
  if (beste && beste.d < 0.2) nachbarn.push({ e, ...beste });
}
nachbarn.sort((a, z) => a.d - z.d);
console.log('\n══ 1b. Kurven, die BEINAHE eine Hauskurve sind ════════════════');
console.log('  Abstand unter 0,2 heisst: dieselbe Absicht, nur nicht dasselbe Mittel.');
console.log(`  ENTSCHIEDEN am ${ENTSCHIEDEN.nachbarn.am}: bleiben, wie sie sind.`);
console.log(`  ${ENTSCHIEDEN.nachbarn.grund.replace(/\s+/g, ' ')}`);
console.log(`  Dasselbe fuer die Auftrittskurve: ${ENTSCHIEDEN.enterKurve.grund.replace(/\s+/g, ' ')}`);
console.log('  Die Liste bleibt trotzdem stehen - sie ist die Landkarte, falls es doch');
console.log('  einmal zusammengelegt wird.');
if (!nachbarn.length) console.log('  Keine.');
for (const n of nachbarn.slice(0, 14)) {
  console.log(`  ${n.d.toFixed(3)}  ${n.e.name.padEnd(22)} ${n.e.roh}`);
  console.log(`         waere --qq-${n.haus.rolle} ${n.haus.kurve}`);
}
if (nachbarn.length > 14) console.log(`  ... und ${nachbarn.length - 14} weitere.`);

// ── 2. Dauer gegen Rolle ──────────────────────────────────────────────────
/**
 * ⚠️ EIN BLINDER FLECK, und er erzeugt Fehlalarme, keine Fehler.
 *
 * Die sechs Rollen in `main.css` sind ALIASSE auf die rohe Kurvenpalette:
 *
 *     --qq-celebrate: var(--qq-ease-bounce);
 *     --qq-enter:     var(--qq-ease-out-cubic);
 *     --qq-state:     var(--qq-ease-smooth);
 *
 * Nach dem Berechnen im Browser sind beide Schreibweisen dieselbe Zeichenkette.
 * Wer `var(--qq-ease-bounce)` schreibt, beansprucht damit NICHT den Hero-Beat
 * und seinen Bereich von 500-700 ms - er nimmt nur die Kurve. Von aussen sieht
 * das Werkzeug den Unterschied nicht und meldet einen Verstoss, wo keiner ist.
 *
 * 2026-08-27 waren ALLE DREI gemeldeten Dauern genau dieser Fall:
 *   phasePop   450 ms auf var(--qq-ease-bounce)      (kleine Kachel-Chips)
 *   langFadeIn 450 ms auf var(--qq-ease-out-cubic)   (Fragentext)
 *   opacity    900 ms auf var(--qq-ease-smooth)      (Anker-Ebene abdunkeln)
 *
 * Deshalb wird jetzt nachgesehen, was im QUELLTEXT wirklich steht. Das ist
 * bewusst der zweite Schritt und nicht der erste: gemessen wird weiter am
 * laufenden Bild, der Quelltext beantwortet nur die Anschlussfrage „welches
 * Token war gemeint". Und nur wenn dort das ROLLEN-Token steht, ist es ein
 * Verstoss gegen den Bereich dieser Rolle.
 */
const QUELLEN = ['frontend/src'];
const quellText = (() => {
  const teile = [];
  const lauf = (ordner) => {
    for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
      const pfad = `${ordner}/${e.name}`;
      if (e.isDirectory()) lauf(pfad);
      else if (/\.(tsx?|css)$/.test(e.name)) teile.push(fs.readFileSync(pfad, 'utf8'));
    }
  };
  for (const q of QUELLEN) { try { lauf(q); } catch { /* egal */ } }
  return teile.join('\n');
})();

/** Welches Token steht im Quelltext bei dieser Bewegung und dieser Dauer? */
function tokenImQuelltext(name, ms) {
  const sek = (ms / 1000).toString().replace(/^0\./, '0.');
  const muster = new RegExp(
    `${name}\\s+(?:${sek}s|${ms}ms)\\s+var\\(--qq-([a-z-]+)\\)`, 'g');
  const treffer = new Set();
  for (const m of quellText.matchAll(muster)) treffer.add(m[1]);
  // Auch die Schreibweise als `transition: opacity 900ms var(--qq-...)`.
  if (!treffer.size) {
    const m2 = new RegExp(`${name}\\s+(?:${sek}s|${ms}ms)\\s+var\\(--qq-([a-z-]+)\\)`, 'g');
    for (const m of quellText.matchAll(m2)) treffer.add(m[1]);
  }
  return [...treffer];
}

console.log('\n══ 2. Passen die Dauern zu ihrer Rolle? ════════════════════════');
let danebenGesamt = 0, rohGesamt = 0;
for (const e of liste) {
  const haus = HAUS_INDEX.get(normal(e.roh));
  if (!haus || haus.von == null || !e.dauern.size) continue;
  const daneben = [...e.dauern].filter(d => d < haus.von || d > haus.bis);
  if (!daneben.length) continue;
  for (const ms of daneben) {
    const tokens = tokenImQuelltext(e.name, ms);
    const rolle = `--qq-${haus.rolle}`;
    const beansprucht = tokens.length === 0 || tokens.includes(haus.rolle);
    if (beansprucht) {
      danebenGesamt++;
      console.log(`  ✗ ${e.name.padEnd(22)} ${ms} ms`);
      console.log(`      laeuft auf ${rolle}, und das soll ${haus.von}-${haus.bis} ms (${haus.was})`);
      if (!tokens.length) console.log('      (im Quelltext nicht gefunden - bitte von Hand nachsehen)');
    } else {
      rohGesamt++;
      console.log(`  · ${e.name.padEnd(22)} ${ms} ms auf var(--qq-${tokens.join('/')})`);
      console.log(`      Rohe Kurve, nicht die Rolle ${rolle}. Kein Verstoss gegen deren Bereich.`);
    }
  }
}
if (!danebenGesamt) console.log('  Keine Bewegung, die eine Rolle beansprucht, faellt aus deren Bereich.');
if (rohGesamt) {
  console.log(`\n  ⚠️ ${rohGesamt} Dauern laufen auf einer rohen Kurve statt auf dem Rollen-Token.`);
  console.log('     Das ist erlaubt und oft richtig (ein kleiner Akzent ist kein Hero-Beat),');
  console.log('     macht den Bereich der Rolle aber unpruefbar. Wer den Bereich meint,');
  console.log('     schreibt das Rollen-Token.');
}

// ── 3. Ein Hero-Beat je Folie ─────────────────────────────────────────────
console.log('\n══ 3. Ein Overshoot je Folie? ══════════════════════════════════');
console.log('  Regel aus main.css: „Overshoot nur fuer den EINEN Hero-Beat pro Screen."');
console.log('  Gezaehlt werden Bewegungen, nicht Elemente.');
const offen = [], entschieden = [];
for (const x of [...heroProStation].sort((a, z) => z.hero - a.hero)) {
  if (x.hero <= 1) continue;
  (ENTSCHIEDEN.overshoot.stationen.includes(x.st) ? entschieden : offen).push(x);
}
for (const { st, hero } of offen) {
  console.log(`  ✗ ${st.padEnd(16)} ${hero}: ${(heroNamen.get(st) ?? []).join(', ')}`);
}
if (!offen.length) console.log('  Keine offenen Faelle.');
if (entschieden.length) {
  console.log(`\n  Bewusst so, entschieden am ${ENTSCHIEDEN.overshoot.am}:`);
  console.log(`  Wolf: „${ENTSCHIEDEN.overshoot.zitat}"`);
  for (const { st, hero } of entschieden) {
    console.log(`    · ${st.padEnd(16)} ${hero}: ${(heroNamen.get(st) ?? []).join(', ')}`);
  }
}
const brav = heroProStation.filter(x => x.hero <= 1).length;
console.log(`\n  ${brav} von ${heroProStation.length} Stationen halten die Regel von sich aus.`);

console.log('\n══ Urteil ══════════════════════════════════════════════════════');
console.log(`  ${erreicht.length} Stationen gemessen.`);
console.log(`  ${ausserHaus} von ${liste.length} Bewegungen laufen auf einer eigenen Kurve.`);
console.log(`  davon ${nachbarn.length} nur knapp neben einer Hauskurve - bewusst so seit ${ENTSCHIEDEN.nachbarn.am}.`);
console.log(`  ${danebenGesamt} Dauern liegen ausserhalb des Bereichs ihrer eigenen Rolle.`);
console.log(`  ${rohGesamt} davon getrennt: Dauern auf einer rohen Kurve, die keine Rolle beansprucht.`);
console.log(`  ${offen.length} Stationen mit mehr als einem Overshoot, die NICHT entschieden sind.`);

await b.schliessen?.();
