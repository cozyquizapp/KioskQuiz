/* platz-unten — wie viel Luft hat die Fragefolie wirklich nach unten?
 *
 * 2026-08-28, Wolf: „wenn gewinner feld unten reinkommt noch zu harsch, text
 * rueckt ein und es wirkt sehr unruhig ausserdem waere unten noch mehr platz,
 * es koennte also reichen? bei mucho und 10 v 10".
 *
 * Das ist eine pruefbare Vermutung, und sie ist die beste, die es gibt: wenn
 * der Platz fuer die Sieger-Karte waehrend der Frage ohnehin frei steht, muss
 * beim Reveal nichts mehr wegruecken. Dann faellt die ganze Bewegung weg,
 * statt nur schoener zu werden.
 *
 * ── Was gemessen wird ─────────────────────────────────────────────────────
 * Waehrend der LAUFENDEN Frage, also bevor irgendetwas aufgeloest ist:
 *   1. Wo endet der Inhalt im Fluss (Offset-Rechnung, wie im Einpasser)?
 *   2. Wo beginnt die Sperre darunter (die Team-Leiste)?
 *   3. Wie viel liegt dazwischen?
 * Dagegen steht, was die Sieger-Karte braucht: `clamp(150px, 16cqh, 210px)`
 * plus 12 px Abstand, auf einer 990er Buehne also 170 px.
 *
 * ⚠️ Die Zahl schwankt mit der Fragelaenge und der Zahl der Antwortenden.
 * Deshalb misst das Werkzeug MEHRERE Fragen und nennt das Minimum - reservieren
 * laesst sich nur, was im schlechtesten Fall da ist.
 *
 * NUTZUNG:  node scripts/platz-unten.mjs
 */
import { buehneStarten, sleep } from './lib/buehne.mjs';

/** Was die Sieger-Karte im Fluss belegt: clamp(150px, 16cqh, 210px) + 12. */
const BEDARF = Math.round(990 * 0.16) + 12;

const FAELLE = [
  { kategorie: 'MUCHO', label: 'Mu-Cho' },
  { kategorie: 'ZEHN_VON_ZEHN', label: '10 von 10' },
];

const MESSEN = () => {
  const finde = () => {
    for (const el of Array.from(document.querySelectorAll('[style]')))
      if (el.style.getPropertyValue('--qq-fit') !== '') return el;
    return null;
  };
  const el = finde();
  if (!el) return null;
  // Dieselbe Rechnung wie im Einpasser: Lage im Layout, nicht auf dem Schirm.
  const eigen = el.getBoundingClientRect();
  const bezug = el.offsetTop;
  let tiefsteOffset = 0;
  for (const kind of Array.from(el.children)) {
    const st = getComputedStyle(kind);
    if (st.position === 'absolute' || st.position === 'fixed' || st.display === 'none') continue;
    if (kind.offsetHeight <= 1) continue;
    const unten = kind.offsetTop + kind.offsetHeight;
    if (unten > tiefsteOffset) tiefsteOffset = unten;
  }
  const skala = eigen.height / (el.offsetHeight || 1);
  const tiefste = eigen.top + (tiefsteOffset - bezug) * skala;
  const buehne = el.closest('[data-qq-buehne]') ?? document.body;
  const br = buehne.getBoundingClientRect();
  const s = br.height / 990;
  let sperreTop = br.bottom;
  for (const sp of Array.from(buehne.querySelectorAll('[data-qq-sperre]'))) {
    const r = sp.getBoundingClientRect();
    if (r.height < 1 || r.top < eigen.top) continue;
    if (r.top < sperreTop) sperreTop = r.top;
  }
  return {
    fit: Number(el.style.getPropertyValue('--qq-fit')) || 1,
    inhaltUnten: Math.round((tiefste - br.top) / s),
    sperreOben: Math.round((sperreTop - br.top) / s),
    frei: Math.round((sperreTop - tiefste) / s),
    containerFrei: Math.round((el.clientHeight - (tiefsteOffset - bezug))),
  };
};

const ergebnisse = [];
for (const fall of FAELLE) {
  const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {}, kategorie: fall.kategorie, entwurf: 'qq-vol-1' });
  await b.zurStation('frage');
  await sleep(1500);
  // Ein paar Fragen derselben Kategorie, damit die Textlaenge streut.
  for (let i = 0; i < 3; i++) {
    await sleep(900);
    const m = await b.seite.evaluate(MESSEN);
    if (m) ergebnisse.push({ label: fall.label, nr: i + 1, ...m });
    await b.helfer.naechsteFrage();
    await sleep(1800);
  }
  await b.schliessen?.();
}

console.log('\n══ Luft unter dem Inhalt waehrend der laufenden Frage ═══════════');
console.log(`  Die Sieger-Karte braucht ${BEDARF} px (clamp(150px, 16cqh, 210px) + 12).\n`);
console.log('  Folie                 fit    Inhalt endet  Sperre bei   frei');
for (const e of ergebnisse) {
  const ok = e.frei >= BEDARF ? '✓' : '✗';
  console.log(`  ${ok} ${(e.label + ' #' + e.nr).padEnd(18)} ${e.fit.toFixed(3)}`
    + `   y ${String(e.inhaltUnten).padStart(4)}`
    + `      y ${String(e.sperreOben).padStart(4)}`
    + `   ${String(e.frei).padStart(4)} px`);
}
const min = Math.min(...ergebnisse.map(e => e.frei));
console.log('\n══ Urteil ══════════════════════════════════════════════════════');
console.log(`  Kleinste gemessene Luft: ${min} px, gebraucht werden ${BEDARF} px.`);
console.log(min >= BEDARF
  ? '  ✓ Der Platz ist da. Die Sieger-Karte kann von Anfang an stehen,\n'
    + '    dann muss beim Reveal nichts mehr wegruecken.'
  : `  ✗ Es fehlen ${BEDARF - min} px. Von Anfang an reservieren ginge nur auf\n`
    + '    Kosten der Frage - genau das war im ersten Anlauf das Problem.');
process.exit(min >= BEDARF ? 0 : 1);
