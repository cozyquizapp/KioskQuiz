/**
 * install-avatar-set.mjs — Avatar-Lieferung sauber in den Ordner uebernehmen.
 *
 * Anlass (Wolf 2026-08-23): „die originalbilder von chatgpt sind noch da,
 * sonst nimm sie und pack sie auf die kacheln? sie haben einen schatten und
 * sind farblich gut."
 *
 * Beim Vergleich kam heraus, dass sich der Einbau nicht nur lohnt, sondern
 * einen Fehler behebt: die Dateien im Repo waren 125-%-HOCHSKALIERUNGEN der
 * Lieferung (gemessen an fuenf Motiven, alle exakt 125 %). Jemand hat sie auf
 * die Motivkante beschnitten und dann wieder auf 512 aufgeblasen. Das fuegt
 * keine Details hinzu, es macht das Bild nur weich — und weil auf der Buehne
 * die Marke bis 276 px gross wird (Team-Reveal), sieht man das.
 *
 * Was dieses Skript tut, in dieser Reihenfolge:
 *   1. Namen abbilden: `kategorie--slug.png` aus der Lieferung -> `slug.png`.
 *   2. Auf die Alpha-Box beschneiden, aber NICHT skalieren. Das Beschneiden
 *      ist noetig, weil `objectFit: contain` das ganze BILD in die Kachel
 *      passt, nicht das Motiv: mit Rand herum bliebe das Motiv kleiner, und
 *      die gemessene Fuell-Tabelle rechnet mit Kante = Motivkante.
 *      Nicht zu skalieren ist der eigentliche Gewinn.
 *   3. Bestand melden, der in der Lieferung fehlt, statt ihn still zu
 *      ueberschreiben oder still liegen zu lassen.
 *
 * Danach gehoeren zwei Schritte dazu, die hier bewusst NICHT mitlaufen, damit
 * jeder einzeln pruefbar bleibt:
 *   node scripts/repair-avatar-alpha.mjs --write
 *   node scripts/measure-avatar-fill.mjs --write
 *
 * NUTZUNG:
 *   node scripts/install-avatar-set.mjs <entpackter-ordner> [--write]
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const QUELLE = process.argv[2];
const ZIEL = 'frontend/public/avatars/cozyquiz';
const WRITE = process.argv.includes('--write');
if (!QUELLE || !fs.existsSync(QUELLE)) {
  console.error('Bitte den entpackten Lieferordner angeben.');
  process.exit(1);
}

const vorhanden = new Set(fs.readdirSync(ZIEL).filter(f => f.endsWith('.png')));
const geliefert = fs.readdirSync(QUELLE).filter(f => f.endsWith('.png'));
const neu = new Set();

for (const file of geliefert.sort()) {
  // `kategorie--slug.png` -> `slug.png`. Ohne Kategorie-Praefix (spaetere
  // Lieferungen koennten anders heissen) bleibt der Name wie er ist.
  const slug = file.includes('--') ? file.split('--').slice(1).join('--') : file;
  neu.add(slug);

  const roh = await sharp(path.join(QUELLE, file)).ensureAlpha();
  const { data, info } = await roh.raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * c + 3] > 16) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const alt = vorhanden.has(slug)
    ? (await sharp(path.join(ZIEL, slug)).metadata())
    : null;
  console.log(`${slug.padEnd(20)} ${w}x${h} -> beschnitten ${bw}x${bh}`
    + (alt ? `   (bisher ${alt.width}x${alt.height})` : '   NEU'));

  if (WRITE) {
    await sharp(path.join(QUELLE, file)).ensureAlpha()
      .extract({ left: x0, top: y0, width: bw, height: bh })
      .png().toFile(path.join(ZIEL, slug));
  }
}

const fehlend = [...vorhanden].filter(f => !neu.has(f));
if (fehlend.length) {
  console.log(`\nIm Ordner, aber NICHT in der Lieferung (bleibt unangetastet):`);
  for (const f of fehlend) console.log('  ' + f);
}
console.log(`\n${geliefert.length} Motive${WRITE ? ' uebernommen' : ' (Probelauf, nichts geschrieben)'}`);
console.log('Danach: repair-avatar-alpha.mjs --write  und  measure-avatar-fill.mjs --write');
