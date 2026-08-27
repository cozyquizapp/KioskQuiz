/* avatare-auf-grund — den Avatarsatz auf allen Gruenden ansehen.
 *
 * Das ist keine Erfindung, sondern Wolfs eigene Regel aus der Lieferung des
 * V5-Satzes:
 *
 *   „Das Ergebnis anschließend auf Schwarz, Weiß sowie Orange, Grün und Blau
 *    kontrollieren. Besonders auf dunkle oder helle Pixelränder, Löcher in
 *    geschlossenen Flächen und abgeschnittene Außenkanten achten."
 *
 * Bis heute gab es dafuer kein Werkzeug, und genau der Fall, den die Regel
 * benennt, ist durchgerutscht: beim Wecker (`cozy-home--alarm-clock.png`) ist
 * die Flaeche INNERHALB des Tragegriffs nicht durchsichtig, sondern mit
 * deckenden, fast weissen Pixeln gefuellt - ein eingebranntes
 * Transparenz-Karo, 245 und 254 im Wechsel, Kachelbreite rund 24 px. Auf
 * einem farbigen Grund liest sich das als heller Fleck ueber der Uhr.
 *
 * ── ⚠️ Warum das ein BLATT ist und keine Pruefzahl ─────────────────────────
 * Ich habe vier automatische Detektoren dafuer gebaut, und jeder hat andere
 * unschuldige Motive gemeldet:
 *
 *   1. „farblos und hell"          → meldet jede weisse Wolke und Spielkarte
 *   2. Raster 8/16/32 px           → trifft die Kachelbreite 24 nicht
 *   3. beides zusammen             → loescht sich gegenseitig aus
 *   4. zwei Helligkeitsspitzen     → meldet Heissluftballon und Rucksack mit
 *
 * Der Grund ist grundsaetzlich: ein weisses Objekt IST farblos und hell, und
 * eine schwach kontrastierte Kachelung ist von einer weichen Schattierung
 * numerisch kaum zu trennen. Das Auge trennt es in einer Sekunde, wenn die
 * Motive nebeneinander auf demselben Grund liegen - der Schluessel zeigt Rot
 * durch seine Oese, der Wecker nicht.
 *
 * Also liefert dieses Werkzeug kein Urteil, sondern das Blatt, auf dem das
 * Urteil in einer Sekunde faellt. Das ist ehrlicher als eine Zahl, der man
 * nicht trauen kann.
 *
 * NUTZUNG:  node scripts/avatare-auf-grund.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

/** Die fuenf Gruende aus Wolfs Regel, plus das Rot der Teamkachel - dort ist
 *  der Fehler aufgefallen. */
const GRUENDE = [
  ['schwarz', '#000000'],
  ['weiss',   '#FFFFFF'],
  ['orange',  '#E8862A'],
  ['gruen',   '#2E9E5B'],
  ['blau',    '#2F6FE0'],
  ['teamrot', '#E4483F'],
];

const QUELLE = 'design-assets/avatare-v5-original';
const ZIEL = '.shots/avatare-grund';
const S = 150, SP = 8, KOL = 8;

if (!fs.existsSync(QUELLE)) { console.error(`Originale fehlen: ${QUELLE}`); process.exit(1); }
fs.mkdirSync(ZIEL, { recursive: true });

const dateien = fs.readdirSync(QUELLE).filter(f => f.endsWith('.png')).sort();
const ZEI = Math.ceil(dateien.length / KOL);

// Einmal verkleinern, dann auf jeden Grund legen. Die Originale werden dabei
// nur GELESEN - hier entsteht ein Kontaktbogen, keine abgeleitete Fassung.
const motive = [];
for (const f of dateien) {
  motive.push(await sharp(path.join(QUELLE, f)).resize(S, S, { kernel: 'lanczos3' }).toBuffer());
}

for (const [name, farbe] of GRUENDE) {
  const teile = [];
  for (let i = 0; i < motive.length; i++) {
    const kachel = await sharp({ create: { width: S, height: S, channels: 4, background: farbe } })
      .composite([{ input: motive[i] }]).png().toBuffer();
    teile.push({ input: kachel, left: (i % KOL) * (S + SP), top: Math.floor(i / KOL) * (S + SP) });
  }
  // Der Zwischenraum in einem Ton, der weder Grund noch Motiv ist, damit die
  // Kachelkante sichtbar bleibt.
  await sharp({ create: { width: KOL * (S + SP), height: ZEI * (S + SP), channels: 3, background: '#7A7A7A' } })
    .composite(teile).toFile(`${ZIEL}/${name}.png`);
  console.log(`  ${ZIEL}/${name}.png`);
}

console.log('\nReihenfolge, acht je Zeile:');
for (let z = 0; z < ZEI; z++) {
  console.log(`  ${z + 1}: ` + dateien.slice(z * KOL, (z + 1) * KOL)
    .map(f => f.replace(/^[a-z-]+--/, '').replace('.png', '')).join(', '));
}
console.log('\nWorauf zu achten ist (aus den Asset-Regeln):');
console.log('  * Loecher in geschlossenen Flaechen: scheint der Grund durch Griffe,');
console.log('    Oesen und Henkel? Der Schluessel ist die Probe aufs Exempel.');
console.log('  * helle oder dunkle Pixelraender auf Schwarz und auf Weiss.');
console.log('  * abgeschnittene Aussenkanten an den Kachelraendern.');
