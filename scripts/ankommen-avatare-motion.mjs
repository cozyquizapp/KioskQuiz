/* ankommen-avatare-motion — wandert die Kombination aus Objekt und Farbe?
 *
 * 2026-08-27, zwei Saetze von Wolf zur Avatar-Karte:
 *   „wenn du die avatare vorstellen willst machs satisfyinger mit etwas motion,
 *    zb dass sie durchwechseln oder so"
 *   „und die aktuelle darstellung koennte als missverstaendnis sagen, dass ein
 *    emoji nur mit einer bestimmten farbe kombiniert werden kann"
 *
 * Der zweite Satz ist der wichtigere. Der Avatarsatz ist farbneutral gebaut:
 * 48 Objekte MAL 8 Farben, kein Slot-Binding. Eine Folie, auf der jedes Objekt
 * immer auf demselben Grund sitzt, lehrt genau die Regel, die es nicht gibt.
 *
 * ── Was hier geprueft wird, und warum es drei Dinge sind ───────────────────
 *   1. Wechselt ueberhaupt etwas?             (sonst ist es keine Bewegung)
 *   2. Wechselt immer nur EINE Kachel?        (alles zugleich waere Flackern)
 *   3. Sieht man dasselbe OBJEKT auf mehr als einer FARBE?
 *      Das ist Wolfs Punkt, und nur das beweist, dass die Kombination frei ist.
 *
 * Gemessen wird aus der Seite heraus, Bild fuer Bild: welcher Dateiname steht
 * in welcher Kachel, und welchen Grund hat sie. Von aussen abzufotografieren
 * wuerde nur zeigen, DASS sich etwas bewegt, nicht WAS sich paart.
 *
 * NUTZUNG:  node scripts/ankommen-avatare-motion.mjs
 */
import { buehneStarten, sleep } from './lib/buehne.mjs';

const DAUER = 14000;   // gut zwei volle Durchlaeufe (16 x 420 ms)

const b = await buehneStarten({
  bots: 8, frisch: true, takt: () => {},
  entwurf: 'qq-vol-1',
});
const seite = b.seite;

await b.aufbauen('lobby');
await sleep(900);
await b.emit('qq:setQuizOptions', { formatSelected: true });
await b.emit('qq:setLobbyOpen', { value: false });

// Auf die Avatar-Karte warten. Sie ist die vierte im Umlauf, also bis zu
// 4 x 2 x 8 s entfernt - deshalb wird gewartet statt geraten.
let da = false;
for (let i = 0; i < 90; i++) {
  await sleep(1000);
  da = await seite.evaluate(() => /Sucht euch einen aus|Pick your avatar/.test(document.body.innerText || ''));
  if (da) break;
}
if (!da) { console.log('\n  Avatar-Karte kam nicht. Umlauf zu lang oder Karte fehlt.'); await b.schliessen?.(); process.exit(1); }

// Mitschrift: je Abtastung die Paare aus Objekt und Grundfarbe.
const lesen = () => {
  const bilder = [...document.querySelectorAll('img[src*="/avatars/cozyquiz/klein/"]')];
  return bilder.map(img => {
    const slug = (img.getAttribute('src') || '').split('/').pop().replace('.png', '');
    const kachel = img.parentElement;
    const bg = kachel ? getComputedStyle(kachel).backgroundColor : '';
    // Die Kachelflaeche ist ein Verlauf PLUS Farbe; die Farbe steht im
    // background-color, der Verlauf im background-image.
    return `${slug}|${bg}`;
  });
};

const bilderFolge = [];
const t0 = Date.now();
while (Date.now() - t0 < DAUER) {
  bilderFolge.push(await seite.evaluate(lesen));
  await sleep(210);   // halber Takt, damit kein Wechsel uebersehen wird
}

// ── Auswertung ────────────────────────────────────────────────────────────
// ⚠️ Fuer „wie viele Kacheln aendern sich gleichzeitig" darf NUR das Objekt
// verglichen werden, nicht die Farbe. Die Farbe blendet ueber 420 ms um, und
// abgetastet wird alle 210 ms - eine Kachel mitten im Farbwechsel liest sich
// dann zweimal hintereinander als „geaendert", ohne dass ein neuer Schritt
// passiert waere. Der erste Anlauf hat genau das gemeldet: 28 von 64 Schritten
// angeblich mehrfach, in Wahrheit war es die laufende Blende.
// Das Objekt dagegen springt (neuer `key`, neues Element), da gibt es keinen
// Zwischenzustand.
const nurObjekt = (bild) => bild.map(p => p.split('|')[0]);
let wechselSchritte = 0, mehrfach = 0;
for (let i = 1; i < bilderFolge.length; i++) {
  const vorher = nurObjekt(bilderFolge[i - 1]), jetzt = nurObjekt(bilderFolge[i]);
  if (vorher.length !== jetzt.length) continue;
  let n = 0;
  for (let k = 0; k < jetzt.length; k++) if (vorher[k] !== jetzt[k]) n++;
  if (n > 0) wechselSchritte++;
  if (n > 1) mehrfach++;
}

// Welche Objekte hat man auf wie vielen verschiedenen Gruenden gesehen?
const gruende = new Map();
for (const bild of bilderFolge) {
  for (const paar of bild) {
    const [slug, bg] = paar.split('|');
    if (!gruende.has(slug)) gruende.set(slug, new Set());
    gruende.get(slug).add(bg);
  }
}
const mehrfarbig = [...gruende.entries()].filter(([, s]) => s.size > 1);

console.log(`\n══ ${bilderFolge.length} Abtastungen ueber ${DAUER / 1000} s ═══════════════════════`);
console.log(`  Schritte mit einer Aenderung : ${wechselSchritte}`);
console.log(`  davon mit MEHR als einer     : ${mehrfach}`);
console.log(`  verschiedene Objekte gesehen : ${gruende.size}`);
console.log(`  davon auf mehr als einer Farbe: ${mehrfarbig.length}`);

console.log('\n══ Urteil ══════════════════════════════════════════════════════');
console.log(wechselSchritte > 0
  ? '  ✓ Es bewegt sich etwas.'
  : '  ✗ Nichts wechselt.');
console.log(mehrfach === 0
  ? '  ✓ Immer nur eine Kachel auf einmal, kein Flackern.'
  : `  ⚠ ${mehrfach} Schritte aendern mehrere Kacheln gleichzeitig.`);
// Und: steht irgendwann ein Motiv doppelt im Bild? Die alte Garantie („48
// durch 16 teilbar") gilt nicht mehr, seit Motive aus dem Satz fallen koennen.
let doppel = 0;
for (const bild of bilderFolge) {
  const slugs = bild.map(p => p.split('|')[0]);
  if (new Set(slugs).size !== slugs.length) doppel++;
}
console.log(doppel === 0
  ? '  ✓ Nie zwei gleiche Motive gleichzeitig im Bild.'
  : `  ✗ In ${doppel} Bildern steht ein Motiv doppelt.`);
console.log(mehrfarbig.length > 0
  ? `  ✓ ${mehrfarbig.length} Objekte standen auf mehr als einer Farbe.`
    + '\n    Damit zeigt die Folie, dass die Kombination frei ist.'
  : '  ✗ Jedes Objekt klebt an einer Farbe - genau das Missverstaendnis,'
    + '\n    das Wolf gemeldet hat.');
if (mehrfarbig.length) {
  console.log('\n  Beispiele:');
  for (const [slug, s] of mehrfarbig.slice(0, 4)) {
    console.log(`    ${slug.padEnd(18)} auf ${s.size} Gruenden`);
  }
}

await b.schliessen?.();
process.exit(mehrfarbig.length > 0 && wechselSchritte > 0 ? 0 : 1);
