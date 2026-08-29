/**
 * paarung-probe.mjs — was passiert, wenn der Fragensatz zum falschen Format gehoert?
 *
 * 2026-08-29. Ich hatte Wolf gemeldet, gegen die falsche Paarung schuetze in
 * keine Richtung etwas: „ein CrowdQuiz-Satz in CozyQuiz wuerde Umfrage und
 * Schwarmintelligenz ausspielen, obwohl das Register sagt, dass sie dort nicht
 * hingehoeren." Das war eine Behauptung aus einer LISTE, nicht aus einer
 * Messung - derselbe Fehler wie bei der Heissen Kartoffel am selben Tag.
 *
 * Denn im Code stehen zwei Kommentare, die das Gegenteil sagen:
 *   qqRooms.ts:1830  crowdTop      „im Grid-Modus platzieren alle Board-Teams"
 *   qqRooms.ts:1845  crowdEstimate „Hier nur der Grid-Modus-Fallback: Winner =
 *                                   naechstes Team (wie Schaetzchen closest)"
 * Beide Unterspiele haben also ausdruecklich einen CozyQuiz-Zweig. Ob der
 * Zweig auch am Bildschirm ankommt, entscheidet kein Kommentar, sondern ein
 * Durchlauf: CozyQuiz-Raum, CrowdQuiz-Fragensatz, beide Folien knipsen.
 *
 * Aufruf:  node scripts/paarung-probe.mjs
 */
import fs from 'node:fs';
import { buehneStarten, sleep } from './lib/buehne.mjs';

const ZIEL = '.shots/paarung';
// Die Probe taugt nur im PAAR. Ein leeres Brett in CozyQuiz beweist nichts,
// solange dieselbe Stelle in CrowdQuiz nicht danebenliegt - es koennte am
// Harness liegen (dev/simAnswers tippt keine Woerter). QQ_GROSS=1 fuer den
// Gegenlauf, die Bilder tragen das Format im Namen.
const GROSS = process.env.QQ_GROSS === '1';
fs.mkdirSync(ZIEL, { recursive: true });
const GESUCHT = [process.env.QQ_KIND ?? 'crowdTop'];

const b = await buehneStarten({
  grossformat: GROSS,          // ⚠️ das ist der Punkt: CozyQuiz, nicht CrowdQuiz
  entwurf: process.env.QQ_ENTWURF ?? 'crowd-vol-1',
  // ⚠️ Ein Unterspiel je Lauf, per QQ_KIND. Der erste Anlauf zog nur crowdTop
  // nach vorn und suchte crowdEstimate dann ueber die Schleife - in CrowdQuiz
  // lag es auf Frage 18, in CozyQuiz war es auch nach 34 Durchgaengen nicht
  // erreichbar (dort liegt zwischen den Fragen das Brett, und hinten die
  // Final-Phasen). Vorziehen kostet einen zweiten Lauf und keine Raterei.
  kategorie: process.env.QQ_KIND ?? 'crowdTop',
  frisch: true, bots: 8, antworten: 0.6,
});
const { helfer, seite, emit, phase } = b;

const kind = () => {
  const q = helfer.zustand()?.currentQuestion;
  return q?.category === 'BUNTE_TUETE' ? (q.bunteTuete?.kind ?? null) : null;
};

// ⚠️ Ohne `aufbauen('spiel')` laeuft gar kein Spiel: buehneStarten richtet nur
// Browser, Socket und Raum ein. Der erste Anlauf hat deshalb null Fragen
// erreicht und dabei largeGroupMode=true gemeldet - der Rest des vorigen
// Laufs, weil das Format erst beim Spielstart gesetzt wird.
await b.aufbauen('spiel');

// Gegenprobe, dass wirklich CozyQuiz laeuft. Kostet nichts und haette am 29.08.
// einen ganzen Kontaktbogen gerettet (CLAUDE.md, „Falle darunter").
const gross = helfer.zustand()?.largeGroupMode;
console.log(`\nFormat im Raum: largeGroupMode=${gross} ${gross === GROSS ? '✓ wie verlangt' : '⚠️ FALSCH'}`);

await helfer.zurFrage();
const gefunden = [];
// ⚠️ 22 Durchgaenge reichen nur in CrowdQuiz. In CozyQuiz liegt zwischen zwei
// Fragen zusaetzlich das Brett, also kostet dieselbe Frage mehr Schritte - der
// erste Lauf hat crowdEstimate deshalb NUR im Grossformat gefunden und das sah
// aus wie ein Formatunterschied. Es war die Schleife.
for (let i = 0; i < 34 && gefunden.length < GESUCHT.length; i++) {
  const k = kind();
  if (k && GESUCHT.includes(k) && !gefunden.includes(k)) {
    console.log(`\n  Frage ${i + 1}: ${k}`);
    await helfer.antworten();
    await seite.screenshot({ path: `${ZIEL}/${k}-${GROSS ? 'crowd' : 'cozy'}-frage.png` });
    await emit('qq:revealAnswer');
    await sleep(2600);
    await seite.screenshot({ path: `${ZIEL}/${k}-${GROSS ? 'crowd' : 'cozy'}-aufloesung.png` });
    // Was steht auf der Folie? Leere Flaeche waere der Befund, den ich
    // behauptet hatte.
    const text = await seite.evaluate(() => (document.body.innerText || '').replace(/\n+/g, ' | ').slice(0, 240));
    const flaechen = await seite.evaluate(() => document.querySelectorAll('[data-qq-team], [data-qq-slot]').length);
    console.log(`    Phase ${await phase()} · ${flaechen} Team-Flaechen · ${text}`);
    // Laeuft etwas aus dem Bild? Die Buehne ist fix 1760x990 und bekommt nie
    // eine Scrollbar - was rechts hinausragt, sieht am Beamer niemand.
    const raus = await seite.evaluate(() => [...document.querySelectorAll('*')]
      .map(el => ({ r: el.getBoundingClientRect(), t: (el.textContent || '').trim().slice(0, 30) }))
      .filter(x => x.r.width > 8 && x.r.height > 8 && (x.r.right > 1761 || x.r.left < -1))
      .slice(0, 6)
      .map(x => `${Math.round(x.r.left)}..${Math.round(x.r.right)} „${x.t}"`));
    console.log(raus.length ? `    ⚠️ ${raus.length} Element(e) ausserhalb: ${raus.join(' · ')}` : '    Nichts laeuft aus dem Bild ✓');
    gefunden.push(k);
  }
  await helfer.naechsteFrage();
}
for (const g of GESUCHT) if (!gefunden.includes(g)) console.log(`  ⚠️ ${g} im Satz nicht erreicht.`);
await b.schliessen();
process.exit(0);
