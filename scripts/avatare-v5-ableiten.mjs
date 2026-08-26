/* avatare-v5-ableiten — aus den Originalen zwei kleinere Fassungen, sonst nichts.
 *
 * 2026-08-26. Wolf hat den finalen Team-Avatarsatz V5 geliefert, 48 PNG,
 * 1024x1024, RGBA, transparent. Seine Regeln sind eindeutig, und sie stehen
 * hier, weil dieses Skript die einzige Stelle ist, an der ueberhaupt etwas mit
 * den Bilddaten passiert:
 *
 *   * Nur die gelieferten PNG verwenden.
 *   * Nicht erneut freistellen, keine automatische Hintergrundentfernung.
 *   * Nicht zuschneiden, nicht nachschaerfen, nicht ueber ein Canvas neu
 *     exportieren.
 *   * Keine Schatten, Konturen, Glow, Kachelfarben oder Hintergruende
 *     einrechnen.
 *   * Transparente Pixel und RGB-Randinformationen unveraendert lassen.
 *   * Nicht ueber JPEG, WebP oder ein anderes verlustbehaftetes Format.
 *   * Beim Verkleinern hochwertiges Resampling, idealerweise Lanczos.
 *   * Seitenverhaeltnis 1:1, volles Canvas, nicht auf die Silhouette trimmen.
 *   * Originale niemals ersetzen oder bearbeiten.
 *
 * ── Warum ueberhaupt abgeleitet wird ───────────────────────────────────────
 * Weil sonst 32 MB an jedes Handy gehen. Die Avatarwahl zeigt alle 48 Bilder
 * auf einmal; bei 676 KB im Schnitt sind das 32 MB ueber ein Bar-WLAN, fuer
 * Kacheln von 72 Bildpunkten. Wolfs Regeln sehen genau dafuer einen Weg vor:
 * „Wenn eine kleinere optimierte Version benoetigt wird: vom originalen PNG
 * ausgehen, pro Zielgroesse nur einmal skalieren, RGBA beibehalten, keine
 * Farbmattes." Genau das, und nichts darueber hinaus.
 *
 * ⚠️ Kein WebP. Der Satz lief bis heute als WebP aus (`cozyQuizSrc`), also
 * ueber ein verlustbehaftetes Format - genau das, was die Regeln ausschliessen.
 * Deshalb liefert dieses Skript PNG, und die App liest ab sofort PNG.
 *
 * ── Was NICHT passiert ─────────────────────────────────────────────────────
 * Kein `trim`, kein `sharpen`, kein `flatten`, kein `background`, kein
 * `palette` (das waere eine Farbreduktion, also verlustbehaftet), kein zweiter
 * Skalierschritt. Jede Zielgroesse entsteht in genau einem Schritt aus dem
 * Original.
 *
 * NUTZUNG:
 *   node scripts/avatare-v5-ableiten.mjs             # schreibt beide Groessen
 *   node scripts/avatare-v5-ableiten.mjs --pruefen   # nur messen, nichts schreiben
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const NUR_PRUEFEN = process.argv.includes('--pruefen');

/**
 * ZWEI Groessen, und das ist der eigentliche Gewinn.
 *
 * 640 (gross): der groesste Einsatzort ist die Siegerkachel auf der Danke-Folie
 * mit `clamp(180px, 20cqw, 290px)`. Die Buehne ist ein festes 1760x990-Feld,
 * das auf den Beamer hochskaliert wird - auf einem 4K-Projektor sind aus 290
 * CSS-Punkten rund 630 echte Bildpunkte. 512 waere dort sichtbar weich.
 * An einem Abend laedt der Beamer davon acht Stueck, eins je Team.
 *
 * 160 (klein): die Avatarwahl auf dem Handy zeigt ALLE 48 auf einmal, als
 * Kacheln von rund 72 Bildpunkten. Genau dort entscheidet sich, ob die
 * Anmeldung im Bar-WLAN zaeh wird. Gemessen:
 *
 *   heute (WebP, 1024)  20,4 MB
 *   nur 640 px           17,7 MB
 *   160 px               1,33 MB   <- fuer die Wahl
 *
 * Wolfs Regeln sehen genau das vor: „pro Zielgroesse nur einmal skalieren".
 * Jede Groesse entsteht in EINEM Schritt aus dem Original, nie eine aus der
 * anderen.
 */
const GROESSEN = [
  { px: 640, ordner: '' },
  { px: 160, ordner: 'klein' },
];

const QUELLE = 'design-assets/avatare-v5-original';
const ZIEL   = 'frontend/public/avatars/cozyquiz';

if (!fs.existsSync(QUELLE)) {
  console.error(`Originale fehlen: ${QUELLE}`);
  process.exit(1);
}

const dateien = fs.readdirSync(QUELLE).filter(f => f.endsWith('.png')).sort();
console.log(`\n${dateien.length} Originale in ${QUELLE}`);
console.log(`Zielgroessen: ${GROESSEN.map(g => g.px).join(', ')} px. Lanczos, PNG, RGBA erhalten.\n`);

for (const g of GROESSEN) {
  const ziel = path.join(ZIEL, g.ordner);
  if (!NUR_PRUEFEN) fs.mkdirSync(ziel, { recursive: true });
}

let summeQuelle = 0;
const summeZiel = Object.fromEntries(GROESSEN.map(g => [g.px, 0]));
const auffaellig = [];

for (const datei of dateien) {
  const von = path.join(QUELLE, datei);
  // Der Dateiname im Satz ist der reine Slug. Das Kategorie-Praefix aus der
  // Lieferung (`nature--acorn.png`) gehoert in die Ordnung der Lieferung,
  // nicht in die URL - der Code kennt die Objekte seit jeher als `acorn`.
  const slug = datei.replace(/^[a-z-]+--/, '');

  const m = await sharp(von).metadata();
  if (m.width !== 1024 || m.height !== 1024 || !m.hasAlpha) {
    auffaellig.push(`${datei}: ${m.width}x${m.height} alpha=${m.hasAlpha}`);
    continue;
  }
  summeQuelle += fs.statSync(von).size;

  if (NUR_PRUEFEN) continue;

  for (const g of GROESSEN) {
    const nach = path.join(ZIEL, g.ordner, slug);
    // ⚠️ IMMER vom Original. Nie die 160er aus der 640er ableiten - das waere
    // der zweite Skalierschritt, den die Regeln ausschliessen, und man saehe
    // es an den Kanten.
    await sharp(von)
      // EIN Skalierschritt. `fit: 'fill'` ist hier kein Verzerren: die Quelle
      // ist exakt quadratisch und das Ziel auch, also bleibt 1:1 erhalten - und
      // es gibt weder Rand noch Hintergrundfarbe, die `contain` einrechnen
      // wuerde.
      .resize(g.px, g.px, { kernel: 'lanczos3', fit: 'fill' })
      // `palette: false` ist wichtig: eine Palette waere eine Farbreduktion und
      // damit verlustbehaftet. `compressionLevel` ist verlustfrei, es kostet
      // nur Rechenzeit beim Packen.
      .png({ compressionLevel: 9, effort: 10, palette: false })
      .toFile(nach);
    summeZiel[g.px] += fs.statSync(nach).size;
  }
}

if (auffaellig.length) {
  console.log('⚠️ Nicht verarbeitet (entsprechen nicht der Zusage):');
  for (const a of auffaellig) console.log(`   ${a}`);
}

const mb = (b) => (b / 1024 / 1024).toFixed(1);
if (NUR_PRUEFEN) {
  console.log(`Originale zusammen: ${mb(summeQuelle)} MB (nichts geschrieben).`);
} else {
  console.log(`Originale zusammen : ${mb(summeQuelle)} MB`);
  for (const g of GROESSEN) {
    const ort = g.ordner ? `${ZIEL}/${g.ordner}` : ZIEL;
    console.log(`${String(g.px).padStart(4)} px           : ${mb(summeZiel[g.px])} MB   -> ${ort}`);
  }
  console.log(`\nDie Originale sind unberuehrt.`);
}
