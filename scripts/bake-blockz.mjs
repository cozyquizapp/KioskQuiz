/**
 * bake-blockz.mjs — Wolfs Blockz-Lieferung in Avatar-Frames baken.
 *
 * Quelle: "Desktop/für claude/neues avatarset/quirks-v2/<NN>-<farbe>-<state>-transparent.png"
 *         (1254², echtes Alpha). Die `final/*.webm` daneben sind Videos OHNE
 *         Alphakanal (schwarzer Hintergrund eingebacken) und deshalb NICHT die
 *         Quelle. Siehe Session 2026-07-31.
 *
 * Normalisierung (gemessen, nicht geschätzt):
 *   - Die zwei Frames einer Farbe sind vom Generator pixelgenau registriert
 *     (Alpha-BBox weicht um max. 1 px ab) → Paar braucht keine Korrektur.
 *   - QUER über die Farben schwanken die BBoxen aber von 989² (orange) bis
 *     1179² (rot), also ~19 %. Ungetreckt sähe ein Team kleiner aus als das
 *     andere. Deshalb: je Farbe die VEREINIGTE BBox beider Frames nehmen,
 *     auf 92 % der Kachel skalieren und mittig setzen. Beide Frames einer
 *     Farbe bekommen die IDENTISCHE Transform (Lehre aus cozyWolves).
 *
 * Ziel: frontend/public/avatars/blockz/<id>-<base|peak>.webp (512², Alpha).
 *
 * Lauf: node scripts/bake-blockz.mjs [--src <ordner>] [--dry]
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(path.join(process.cwd(), 'frontend', 'package.json'));
const sharp = require('sharp');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_SRC = 'C:/Users/hornu/Desktop/für claude/neues avatarset/quirks-v2';
const OUT = path.join(ROOT, 'frontend', 'public', 'avatars', 'blockz');

const CANVAS = 512;
const FILL = 0.92;              // Anteil der Kachelbreite, den das Motiv einnimmt
const ALPHA_THRESHOLD = 16;     // ab hier zählt ein Pixel als sichtbar

/**
 * Slot 0..7 → Datei-Präfix der Lieferung, Ziel-ID und Quelle des zweiten Frames.
 *
 * Zum zweiten Frame: die Lieferung nennt den Höhepunkt der Geste bei orange und
 * grün `signature`, bei den anderen sechs `peak`. Das ist DASSELBE Konzept unter
 * zwei Namen, zusammen decken sie alle acht ab. `mid` ist nur ein Zwischenbild
 * der Animation und bewegt sich kaum: gemessen 5,4 % geänderte Pixel bei orange
 * und 5,8 % bei rot gegenüber 21,0 % und 9,8 % beim Höhepunkt. Mit `mid` sähen
 * ausgerechnet zwei der acht praktisch statisch aus.
 */
const DESIGNS = [
  { slot: 0, srcPrefix: '00-orange', id: 'solo',  peak: 'signature-source' },
  { slot: 1, srcPrefix: '01-green',  id: 'slash', peak: 'signature-source' },
  { slot: 2, srcPrefix: '02-teal',   id: 'oval',  peak: 'peak-source' },
  { slot: 3, srcPrefix: '03-violet', id: 'trio',  peak: 'peak-source' },
  { slot: 4, srcPrefix: '04-yellow', id: 'seam',  peak: 'peak-source' },
  { slot: 5, srcPrefix: '05-blue',   id: 'bands', peak: 'peak-source' },
  { slot: 6, srcPrefix: '06-pink',   id: 'sash',  peak: 'peak-source' },
  { slot: 7, srcPrefix: '07-red',    id: 'tetra', peak: 'peak-source' },
];

/** Ziel-Zustände je Design (die Quelle des zweiten kommt aus DESIGNS.peak). */
const statesFor = d => [
  { src: 'master', out: 'base' },
  { src: d.peak,   out: 'peak' },
];

const args = process.argv.slice(2);
const SRC = args.includes('--src') ? args[args.indexOf('--src') + 1] : DEFAULT_SRC;
const DRY = args.includes('--dry');

/** Sichtbare Bounding-Box eines RGBA-Buffers. */
function alphaBBox(data, width, height, channels) {
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3] > ALPHA_THRESHOLD) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

const srcFile = (prefix, state) => path.join(SRC, `${prefix}-${state}-transparent.png`);

async function main() {
  const missing = DESIGNS.flatMap(d => statesFor(d).map(s => srcFile(d.srcPrefix, s.src)))
    .filter(f => !fs.existsSync(f));
  if (missing.length) {
    console.error('Fehlende Quelldateien:\n  ' + missing.join('\n  '));
    process.exit(1);
  }
  if (!DRY) fs.mkdirSync(OUT, { recursive: true });

  for (const d of DESIGNS) {
    // 1) BBox beider Frames messen und vereinigen → EINE Transform je Farbe.
    const frames = [];
    for (const st of statesFor(d)) {
      const { data, info } = await sharp(srcFile(d.srcPrefix, st.src))
        .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      frames.push({ st, box: alphaBBox(data, info.width, info.height, info.channels) });
    }
    const u = frames.reduce((a, f) => ({
      x0: Math.min(a.x0, f.box.x0), y0: Math.min(a.y0, f.box.y0),
      x1: Math.max(a.x1, f.box.x1), y1: Math.max(a.y1, f.box.y1),
    }), { x0: 1e9, y0: 1e9, x1: -1, y1: -1 });
    const uw = u.x1 - u.x0 + 1;
    const uh = u.y1 - u.y0 + 1;

    // 2) Auf FILL der Kachel skalieren, Seitenverhältnis halten, mittig setzen.
    const target = Math.round(CANVAS * FILL);
    const scale = target / Math.max(uw, uh);
    const rw = Math.max(1, Math.round(uw * scale));
    const rh = Math.max(1, Math.round(uh * scale));
    const left = Math.round((CANVAS - rw) / 2);
    const top = Math.round((CANVAS - rh) / 2);

    console.log(
      `${d.srcPrefix} → ${d.id}`.padEnd(24),
      `bbox ${uw}x${uh}`.padEnd(14),
      `scale ${scale.toFixed(3)}`.padEnd(14),
      `→ ${rw}x${rh} @ ${left},${top}`
    );

    for (const f of frames) {
      const outFile = path.join(OUT, `${d.id}-${f.st.out}.webp`);
      if (DRY) continue;
      const motif = await sharp(srcFile(d.srcPrefix, f.st.src))
        .ensureAlpha()
        .extract({ left: u.x0, top: u.y0, width: uw, height: uh })
        .resize(rw, rh, { fit: 'fill', kernel: 'lanczos3' })
        .toBuffer();
      await sharp({
        create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
      })
        .composite([{ input: motif, left, top }])
        .webp({ quality: 90, alphaQuality: 100, effort: 6 })
        .toFile(outFile);
      const kb = (fs.statSync(outFile).size / 1024).toFixed(1);
      console.log(`   ${path.basename(outFile).padEnd(18)} ${kb} KB`);
    }
  }
  console.log(DRY ? '\n(dry run, nichts geschrieben)' : `\nFertig → ${OUT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
