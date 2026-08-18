/**
 * stilprobe-auf-buehne.mjs — stellt die Stilproben auf die ECHTE Buehne.
 *
 * Anlass (Wolf 2026-08-18, zu den fuenf generierten Stilrichtungen): „ich denke
 * bei einigen muesste man das Design des Quizzes anpassen." Genau das wird hier
 * geprueft statt behauptet: alle Proben leben in einer warmen Erdwelt (beiger
 * Grund, gedaempftes Orange, Oliv), die Buehne ist fast schwarzes Navy mit Pink
 * und Glow. Die Frage ist, wie hart der Zusammenprall wirklich ist.
 *
 * Das Script schneidet die Motive aus den generierten Reihen frei, setzt sie in
 * den gemessenen Groessen auf die Slot-Farb-Disc und zeigt jede Richtung auf
 * ZWEI Gruenden nebeneinander:
 *   links  — der heutige Buehnengrund (#0A0814)
 *   rechts — ein waermerer Grund, wie er zu den Marken passen wuerde
 *
 * VORAUSSETZUNG: die fuenf Reihen liegen als Dateien in .shots/stilprobe/:
 *   A-ton.png  B-filz.png  C-papier.png  D-holz.png  E-vinyl.png
 * (Reihenfolge der Motive in jeder Reihe: Fuchs, Daumen, Herz, Krug, Drache.)
 *
 * NUTZUNG: node scripts/stilprobe-auf-buehne.mjs
 */
import { mkdirSync, existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = require('sharp');

const IN = '.shots/stilprobe';
const OUT = '.shots/stilprobe/auf-buehne';
if (!existsSync(IN)) {
  console.error(`Ordner ${IN} fehlt. Lege dort die fuenf Reihen ab (A-ton.png ... E-vinyl.png).`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

// Gemessene Darstellungsgroessen (scripts/measure-avatar-sizes.mjs).
const SIZE_STAGE = 92;   // typische Marke auf der Buehne
const SIZE_SMALL = 68;   // kleinste Marke auf der Buehne
const SIZE_PHONE = 48;   // Handy
const SLOT_COLORS = ['#F97316', '#22C55E', '#EC4899', '#FACC15', '#22C55E'];
const MOTIV = ['Fuchs', 'Daumen', 'Herz', 'Krug', 'Drache'];

const GRUND_HEUTE = { name: 'heutige Buehne', hex: '#0A0814' };
const GRUND_WARM = { name: 'waermerer Grund', hex: '#241A17' };

/**
 * Hintergrund freistellen: die Proben haben einen flachen einfarbigen Grund.
 * Die Farbe wird aus der linken oberen Ecke genommen, alles was ihr nahe genug
 * kommt, wird transparent. Toleranz bewusst grosszuegig, weil die Modelle einen
 * leichten Verlauf in den Grund rechnen.
 */
async function freistellen(file) {
  const img = sharp(file).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const bg = [data[0], data[1], data[2]];
  const TOL = 34;
  for (let i = 0; i < data.length; i += ch) {
    const d = Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]);
    if (d < TOL * 3) data[i + 3] = 0;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: ch } }).png().toBuffer();
}

/** Die fuenf Motive einer Reihe finden: Spalten mit Deckkraft suchen. */
async function motiveTrennen(buf) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const spalteVoll = new Array(info.width).fill(false);
  for (let x = 0; x < info.width; x++) {
    for (let y = 0; y < info.height; y++) {
      if (data[(y * info.width + x) * ch + 3] > 24) { spalteVoll[x] = true; break; }
    }
  }
  const bloecke = [];
  let start = -1;
  for (let x = 0; x < info.width; x++) {
    if (spalteVoll[x] && start < 0) start = x;
    if ((!spalteVoll[x] || x === info.width - 1) && start >= 0) {
      const breite = x - start;
      if (breite > info.width * 0.03) bloecke.push({ start, breite });
      start = -1;
    }
  }
  // Zeilenbereich je Block bestimmen und eng zuschneiden.
  const out = [];
  for (const b of bloecke) {
    let oben = info.height, unten = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = b.start; x < b.start + b.breite; x++) {
        if (data[(y * info.width + x) * ch + 3] > 24) { if (y < oben) oben = y; if (y > unten) unten = y; break; }
      }
    }
    if (unten <= oben) continue;
    out.push(await sharp(buf).extract({ left: b.start, top: oben, width: b.breite, height: unten - oben + 1 }).png().toBuffer());
  }
  return out;
}

/** Motiv auf die Slot-Farb-Disc setzen, so wie die App es tut. */
async function aufDisc(motiv, size, color) {
  const inner = Math.round(size * 0.86);
  const bild = await sharp(motiv).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const disc = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${color}"/></svg>`);
  return sharp(disc).composite([{ input: bild, gravity: 'center' }]).png().toBuffer();
}

const dateien = readdirSync(IN).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort();
if (!dateien.length) {
  console.error(`Keine Bilder in ${IN}. Erwartet: A-ton.png, B-filz.png, C-papier.png, D-holz.png, E-vinyl.png`);
  process.exit(1);
}

const PAD = 28, GAP = 26, LBL = 22;
for (const datei of dateien) {
  const name = datei.replace(/\.[^.]+$/, '');
  const frei = await freistellen(`${IN}/${datei}`);
  const motive = await motiveTrennen(frei);
  if (motive.length < 3) {
    console.log(`⚠️  ${datei}: nur ${motive.length} Motive erkannt — Freistellung pruefen (Grund nicht einfarbig?).`);
    continue;
  }
  const n = Math.min(motive.length, 5);
  const spaltenW = SIZE_STAGE;
  const halbW = PAD + n * spaltenW + (n - 1) * GAP + PAD;
  const W = halbW * 2;
  const H = PAD + 34 + (SIZE_STAGE + LBL) + (SIZE_SMALL + LBL) + (SIZE_PHONE + LBL) + PAD;

  const layers = [];
  // Zwei Gruende nebeneinander
  layers.push({ input: Buffer.from(`<svg width="${halbW}" height="${H}"><rect width="${halbW}" height="${H}" fill="${GRUND_HEUTE.hex}"/></svg>`), left: 0, top: 0 });
  layers.push({ input: Buffer.from(`<svg width="${halbW}" height="${H}"><rect width="${halbW}" height="${H}" fill="${GRUND_WARM.hex}"/></svg>`), left: halbW, top: 0 });

  for (const [gi, grund] of [GRUND_HEUTE, GRUND_WARM].entries()) {
    const ox = gi * halbW;
    let y = PAD + 34;
    for (const size of [SIZE_STAGE, SIZE_SMALL, SIZE_PHONE]) {
      for (let i = 0; i < n; i++) {
        layers.push({
          input: await aufDisc(motive[i], size, SLOT_COLORS[i]),
          left: ox + PAD + i * (spaltenW + GAP) + Math.round((spaltenW - size) / 2),
          top: y,
        });
      }
      layers.push({
        input: Buffer.from(`<svg width="${halbW - PAD * 2}" height="${LBL}"><text x="0" y="15" font-family="DejaVu Sans, sans-serif" font-size="12" fill="#8b93a7">${size}px</text></svg>`),
        left: ox + PAD, top: y + size + 2,
      });
      y += size + LBL;
    }
    layers.push({
      input: Buffer.from(`<svg width="${halbW - PAD * 2}" height="34"><text x="0" y="20" font-family="DejaVu Sans, sans-serif" font-size="16" font-weight="bold" fill="#ffffff">${name} — ${grund.name} (${grund.hex})</text></svg>`),
      left: ox + PAD, top: PAD,
    });
  }

  await sharp({ create: { width: W, height: H, channels: 4, background: '#000000' } })
    .composite(layers).png().toFile(`${OUT}/${name}-auf-buehne.png`);
  console.log(`✓ ${OUT}/${name}-auf-buehne.png  (${n} Motive: ${MOTIV.slice(0, n).join(', ')})`);
}
console.log('\nLinks der heutige Grund, rechts der waermere. Die Frage ist nicht,');
console.log('welches Motiv schoener ist, sondern auf welchem Grund es SITZT statt aufzuliegen.');
