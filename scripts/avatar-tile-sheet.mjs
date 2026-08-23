/**
 * avatar-tile-sheet.mjs — alle Team-Motive in ihrer Kachel, nebeneinander,
 * vorher und nachher.
 *
 * Anlass (Wolf 2026-08-23): „wuerfel wirkt zu gross, wie machen wir das?" und
 * „einzeln einmal alle avatare in den kacheln anschauen und positionieren?"
 *
 * Das Kontaktblatt beantwortet genau diese Frage in einem Bild: links die alte
 * einheitliche Fuellung (0.90 fuer alle), rechts die gemessene aus
 * COZYQUIZ_FILL. Wer die beiden Haelften nebeneinander legt, sieht sofort,
 * welche Motive vorher aus der Reihe fielen.
 *
 * Die Kachelfarbe kommt aus der Slot-Palette und rotiert nur zur Anschauung —
 * im Spiel haengt sie am Team-Slot, nicht am Motiv.
 *
 * NUTZUNG: node scripts/avatar-tile-sheet.mjs  ->  .shots/avatar-kacheln.png
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const DIR = 'frontend/public/avatars/cozyquiz';
const OUT = '.shots/avatar-kacheln.png';
const TILE = 132;      // Kachelkante im Blatt
const PAD = 14;        // Luft zwischen den Kacheln
const COLS = 8;
const LABEL_H = 20;
const OLD_FILL = 0.90; // was vor dem Ausgleich fuer ALLE galt

// Slot-Farben aus shared/quarterQuizTypes.ts (QQ_AVATARS), nur zur Anschauung.
const COLORS = ['#F97316', '#22C55E', '#14B8A6', '#A855F7', '#FACC15', '#3B82F6', '#EC4899', '#EF4444'];

// Die gemessene Tabelle direkt aus der Quelle lesen, damit das Blatt nicht
// gegen eine veraltete Kopie prueft.
const src = readFileSync('frontend/src/cozyquizAvatars.ts', 'utf8');
const table = Object.fromEntries(
  [...src.matchAll(/'([a-z0-9-]+)':\s*([0-9.]+),/g)].map(m => [m[1], Number(m[2])])
);

const files = readdirSync(DIR).filter(f => f.endsWith('.png')).sort();
const rows = Math.ceil(files.length / COLS);
const halfW = COLS * TILE + (COLS + 1) * PAD;
const H = rows * (TILE + LABEL_H + PAD) + PAD + 40;

async function half(fillFor, title) {
  const layers = [];
  for (let i = 0; i < files.length; i++) {
    const slug = files[i].replace('.png', '');
    const fill = fillFor(slug);
    const inner = Math.round(TILE * fill);
    const col = i % COLS, row = (i / COLS) | 0;
    const x = PAD + col * (TILE + PAD);
    const y = 40 + PAD + row * (TILE + LABEL_H + PAD);
    const tile = await sharp({
      create: { width: TILE, height: TILE, channels: 4, background: COLORS[i % COLORS.length] },
    }).composite([{
      input: await sharp(path.join(DIR, files[i]))
        .resize(inner, inner, { fit: 'inside' }).toBuffer(),
      gravity: 'centre',
    }]).png().toBuffer();
    // Ecken abrunden wie die echte Kachel (16 %).
    const r = Math.round(TILE * 0.16);
    const mask = Buffer.from(
      `<svg width="${TILE}" height="${TILE}"><rect width="${TILE}" height="${TILE}" rx="${r}" ry="${r}" fill="#fff"/></svg>`
    );
    const rounded = await sharp(tile)
      .composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
    layers.push({ input: rounded, left: x, top: y });
    layers.push({
      input: Buffer.from(
        `<svg width="${TILE}" height="${LABEL_H}"><text x="${TILE / 2}" y="14" font-family="sans-serif" font-size="11" fill="#B9B3C6" text-anchor="middle">${slug} ${fill.toFixed(2)}</text></svg>`
      ),
      left: x, top: y + TILE + 2,
    });
  }
  layers.unshift({
    input: Buffer.from(
      `<svg width="${halfW}" height="40"><text x="${halfW / 2}" y="26" font-family="sans-serif" font-size="20" font-weight="700" fill="#F6EFE6" text-anchor="middle">${title}</text></svg>`
    ),
    left: 0, top: 0,
  });
  return sharp({ create: { width: halfW, height: H, channels: 4, background: '#120F18' } })
    .composite(layers).png().toBuffer();
}

mkdirSync('.shots', { recursive: true });
const links = await half(() => OLD_FILL, 'vorher: 0.90 fuer alle');
const rechts = await half(s => table[s] ?? OLD_FILL, 'nachher: gemessener Ausgleich');
const sheet = await sharp({ create: { width: halfW * 2 + PAD, height: H, channels: 4, background: '#120F18' } })
  .composite([{ input: links, left: 0, top: 0 }, { input: rechts, left: halfW + PAD, top: 0 }])
  .png().toBuffer();
writeFileSync(OUT, sheet);
console.log(`${files.length} Motive, vorher/nachher -> ${OUT}  (${halfW * 2 + PAD} x ${H})`);
