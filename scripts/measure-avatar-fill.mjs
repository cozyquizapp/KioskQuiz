/**
 * measure-avatar-fill.mjs — misst, wie schwer jedes Avatar-Motiv optisch wiegt,
 * und schreibt daraus die Fuell-Tabelle fuer cozyquizAvatars.ts.
 *
 * WARUM (Wolf 2026-08-23: „wuerfel wirkt zu gross, wie machen wir das?" /
 * „einzeln einmal alle avatare in den kacheln anschauen und positionieren?"):
 *
 * Die PNGs sind alle auf ihre Alpha-Box beschnitten. In einer quadratischen
 * Kachel mit `objectFit: contain` skaliert das Bild nach der GROESSEREN Seite.
 * Ein Wuerfel ist quadratisch und fuellt die Kachel damit voll; ein Schluessel
 * ist schmal und hoch, wird auf dieselbe Hoehe gebracht und belegt dabei nur
 * einen Streifen. Gemessen ueber 48 Motive: 21.6 % bis 87.1 % der Kachelflaeche.
 * Faktor 4. Genau das sieht man als „der Wuerfel ist zu gross".
 *
 * Von Hand nachjustieren waere 48 Einzelentscheidungen, die niemand nachvollziehen
 * kann und die beim naechsten Nachschub wieder anfangen. Stattdessen: die
 * tatsaechlich gedeckte Flaeche messen (Alpha-Summe, nicht Bounding-Box, sonst
 * zaehlt bei einem Ring das Loch mit) und jedes Motiv so skalieren, dass alle
 * ungefaehr gleich viel Flaeche belegen.
 *
 *   fill = sqrt(ZIEL / gemessene Flaeche), gedeckelt auf [MIN, MAX]
 *
 * Der Deckel ist wichtig: darueber wuerde das Motiv aus der Kachel ragen. Sehr duenne Motive (Schluessel, Limonade) erreichen die Zielflaeche
 * deshalb nicht ganz — das ist richtig so, ein Schluessel DARF leichter wirken
 * als ein Kissen, er soll nur nicht viermal leichter wirken.
 *
 * NUTZUNG:
 *   node scripts/measure-avatar-fill.mjs           # Tabelle ausgeben
 *   node scripts/measure-avatar-fill.mjs --write   # in cozyquizAvatars.ts schreiben
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const DIR = 'frontend/public/avatars/cozyquiz';
const TARGET = 0.45;   // Zielflaeche, Anteil der Kachel
const MIN_FILL = 0.70; // darunter wird selbst ein Kissen zu klein
// Deckel unter 1.0: das Motiv soll die Kachelkante NIE beruehren, sonst liest
// es sich als angeschnitten.
// 2026-08-23, am Kontaktblatt korrigiert: 0.96 war zu scharf. Schneeflocke,
// Schluessel, Limonade und Gaensebluemchen sassen damit bis 2 % an die Kante
// und wirkten eingezwaengt — ein sichtbarer Fehler, waehrend „etwas leichter
// als das Kissen" gar keiner ist. Duenne Gegenstaende DUERFEN leichter wirken.
// 0.92 ist der alte Einheitswert 0.90 plus ein Hauch.
const MAX_FILL = 0.92;
const PROBE = 128;     // Messaufloesung; 512 waere genauer und 16x langsamer,
                       // der Unterschied liegt unter 0.5 % (nachgerechnet).

const rows = [];
for (const file of fs.readdirSync(DIR).filter(f => f.endsWith('.png')).sort()) {
  const { data, info } = await sharp(path.join(DIR, file))
    .ensureAlpha().resize(PROBE, PROBE, { fit: 'inside' })
    .raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  let covered = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * c + 3];
      if (a > 16) {
        covered += a / 255;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  const box = Math.max(x1 - x0 + 1, y1 - y0 + 1);
  const areaInTile = covered / (box * box);       // Anteil der Kachelflaeche
  const fill = Math.min(MAX_FILL, Math.max(MIN_FILL, Math.sqrt(TARGET / areaInTile)));
  rows.push({ slug: file.replace('.png', ''), area: areaInTile, fill: Math.round(fill * 100) / 100 });
}

const w1 = Math.max(...rows.map(r => r.slug.length));
console.log('Motiv'.padEnd(w1), 'Flaeche  ->  Fuellung  (danach)');
for (const r of [...rows].sort((a, b) => b.area - a.area)) {
  const after = r.area * r.fill * r.fill;
  console.log(r.slug.padEnd(w1), (r.area * 100).toFixed(1).padStart(5) + ' %', ' ->', r.fill.toFixed(2), ' ', (after * 100).toFixed(1).padStart(5) + ' %');
}
const after = rows.map(r => r.area * r.fill * r.fill);
console.log(`\nvorher  ${(Math.min(...rows.map(r => r.area)) * 100).toFixed(1)} bis ${(Math.max(...rows.map(r => r.area)) * 100).toFixed(1)} %  (Faktor ${(Math.max(...rows.map(r => r.area)) / Math.min(...rows.map(r => r.area))).toFixed(1)})`);
console.log(`nachher ${(Math.min(...after) * 100).toFixed(1)} bis ${(Math.max(...after) * 100).toFixed(1)} %  (Faktor ${(Math.max(...after) / Math.min(...after)).toFixed(1)})`);

if (process.argv.includes('--write')) {
  const target = 'frontend/src/cozyquizAvatars.ts';
  const src = fs.readFileSync(target, 'utf8');
  const body = rows.map(r => `  '${r.slug}': ${r.fill.toFixed(2)},`).join('\n');
  const block = `// ── Optischer Ausgleich (erzeugt von scripts/measure-avatar-fill.mjs) ───────\n`
    + `// NICHT von Hand pflegen: neu erzeugen, wenn Motive dazukommen.\n`
    + `// Wert = Anteil der Kachelkante, den das Motiv einnimmt. Begruendung und\n`
    + `// Messverfahren stehen im Kopf des Skripts.\n`
    + `export const COZYQUIZ_FILL: Record<string, number> = {\n${body}\n};\n`;
  const marker = '// ── Optischer Ausgleich';
  const next = src.includes(marker)
    ? src.slice(0, src.indexOf(marker)) + block + src.slice(src.indexOf('\n};\n', src.indexOf(marker)) + 4)
    : src.trimEnd() + '\n\n' + block;
  fs.writeFileSync(target, next);
  console.log(`\n${rows.length} Werte -> ${target}`);
}
