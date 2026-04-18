/**
 * Bake-Skript: erzeugt avatar-{slug}-wolf.png für alle 8 Teams.
 *
 * Input:  frontend/public/avatars/cozy-cast/avatar-{slug}-trans.png
 *         (transparenter BG, team-farbiger Ring schon eingebrannt)
 * Output: frontend/public/avatars/cozy-cast/avatar-{slug}-wolf.png
 *
 * Pipeline pro Avatar:
 *   1) Trans-PNG laden (2000×2000)
 *   2) Inner-Content (Charakter, alles innerhalb 0.85·OUTER_R) maskieren
 *      → BBox-Mittelpunkt davon vs. Bildmitte = Offset
 *   3) Inner-Content um diesen Offset shiften → Charakter sitzt mittig
 *   4) Original-Ring (alles außerhalb 0.85·OUTER_R) bleibt am Originalplatz
 *   5) Composite: dunkel-getönter Inner-BG → shifted Charakter → Original-Ring
 *
 * Das Ergebnis: Charakter mittig im Ring, Ring bleibt sauber zentriert,
 * Inner-BG ist ein dunkles Ton-in-Ton der Team-Farbe (statt schwarz).
 *
 * Run:  node scripts/bakeWolfAvatars.mjs
 * Dep:  sharp (npm install --no-save sharp)
 */

import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AVATAR_DIR = resolve(__dirname, '../frontend/public/avatars/cozy-cast');

// slug → Team-Ring-Farbe (matcht QQ_AVATARS in shared/quarterQuizTypes.ts).
const TEAMS = [
  { slug: 'waschbaer', color: '#14B8A6' },
  { slug: 'faultier',  color: '#84CC16' },
  { slug: 'pinguin',   color: '#2563EB' },
  { slug: 'kuh',       color: '#F97316' },
  { slug: 'koala',     color: '#8B5CF6' },
  { slug: 'giraffe',   color: '#EAB308' },
  { slug: 'capybara',  color: '#DC2626' },
  { slug: 'shiba',     color: '#EC4899' },
];

const SIZE = 2000;
const OUTER_R = SIZE / 2 - 8;          // 992
const BG_R = OUTER_R * 0.92;           // ≈ 912.64 — sitzt hinter dem Ring
const INNER_R = OUTER_R * 0.85;        // alles innerhalb davon = Charakter (Ring ausschließen)
const CX = SIZE / 2;
const CY = SIZE / 2;

const TINT_FACTOR = 0.16;              // 16% der Team-Farbe → dunkles Ton-in-Ton
const ALPHA_THRESHOLD = 32;            // ab welcher Alpha-Stärke ein Pixel als "voll" zählt

function hexToTintedRgb(hex, factor) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return {
    r: Math.round(r * factor),
    g: Math.round(g * factor),
    b: Math.round(b * factor),
  };
}

function tintedCirclePng(rgb) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
      <circle cx="${CX}" cy="${CY}" r="${BG_R}" fill="rgb(${rgb.r},${rgb.g},${rgb.b})"/>
    </svg>
  `;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Maske: weißer Disc bei radius=INNER_R, sonst transparent. */
function innerDiscMaskPng() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
      <circle cx="${CX}" cy="${CY}" r="${INNER_R}" fill="#fff"/>
    </svg>
  `;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Maske: weißer Annulus (alles AUSSERHALB INNER_R innerhalb der Canvas). */
function ringAnnulusMaskPng() {
  // SVG path mit fill-rule:evenodd → äußeres Rechteck minus innerer Kreis = Annulus
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
      <path fill="#fff" fill-rule="evenodd"
        d="M0,0 H${SIZE} V${SIZE} H0 Z
           M${CX},${CY - INNER_R}
           a${INNER_R},${INNER_R} 0 1,0 0,${INNER_R * 2}
           a${INNER_R},${INNER_R} 0 1,0 0,-${INNER_R * 2} Z"/>
    </svg>
  `;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Berechnet den BBox-Mittelpunkt der opaquen Pixel innerhalb des Inner-Discs.
 * Liefert Offset relativ zur Bildmitte (positiv = nach rechts/unten).
 */
async function computeInnerOffset(transBuffer) {
  const { data, info } = await sharp(transBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  const innerR2 = INNER_R * INNER_R;

  let minX = w, minY = h, maxX = 0, maxY = 0, count = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * ch + 3];
      if (a < ALPHA_THRESHOLD) continue;
      const dx = x - CX;
      const dy = y - CY;
      if (dx * dx + dy * dy > innerR2) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      count++;
    }
  }
  if (count === 0) return { dx: 0, dy: 0 };
  const bboxCx = (minX + maxX) / 2;
  const bboxCy = (minY + maxY) / 2;
  return { dx: Math.round(bboxCx - CX), dy: Math.round(bboxCy - CY) };
}

/**
 * Verschiebt einen SIZE×SIZE PNG-Buffer um (dx, dy) Pixel.
 * dx > 0 → Inhalt wandert nach LINKS (trim left, pad right). dy > 0 analog für oben.
 * Negative Werte spiegelverkehrt.
 */
async function shiftCanvas(buffer, dx, dy) {
  if (dx === 0 && dy === 0) return buffer;
  const trimLeft = Math.max(0, dx);
  const trimTop = Math.max(0, dy);
  const trimRight = Math.max(0, -dx);
  const trimBottom = Math.max(0, -dy);
  return sharp(buffer)
    .extract({
      left: trimLeft,
      top: trimTop,
      width: SIZE - trimLeft - trimRight,
      height: SIZE - trimTop - trimBottom,
    })
    .extend({
      left: trimRight,
      top: trimBottom,
      right: trimLeft,
      bottom: trimTop,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function bakeOne(slug, color) {
  const inputPath = resolve(AVATAR_DIR, `avatar-${slug}-trans.png`);
  const outputPath = resolve(AVATAR_DIR, `avatar-${slug}-wolf.png`);
  const bgRgb = hexToTintedRgb(color, TINT_FACTOR);

  // 1) Trans-PNG → SIZE×SIZE bringen
  const meta = await sharp(inputPath).metadata();
  const scale = SIZE / Math.max(meta.width, meta.height);
  const dw = Math.round(meta.width * scale);
  const dh = Math.round(meta.height * scale);

  let transPipeline = sharp(inputPath);
  if (dw !== meta.width || dh !== meta.height) {
    transPipeline = transPipeline.resize(dw, dh, { fit: 'fill', kernel: 'lanczos3' });
  }
  const transOnCanvas = await transPipeline
    .extend({
      top: Math.floor((SIZE - dh) / 2),
      bottom: Math.ceil((SIZE - dh) / 2),
      left: Math.floor((SIZE - dw) / 2),
      right: Math.ceil((SIZE - dw) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  // 2) Inner-Content Offset berechnen
  const { dx, dy } = await computeInnerOffset(transOnCanvas);

  // 3) Inner-Disc + Ring-Annulus Masken
  const innerMask = await innerDiscMaskPng();
  const ringMask = await ringAnnulusMaskPng();

  // 4) Inner-Content extrahieren (alles außerhalb INNER_R wird transparent)
  const innerOnly = await sharp(transOnCanvas)
    .composite([{ input: innerMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // 5) Ring-Annulus extrahieren (alles INNERHALB INNER_R wird transparent)
  const ringOnly = await sharp(transOnCanvas)
    .composite([{ input: ringMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // 6) Inner-Content zentrieren (um -dx, -dy verschieben → Charakter wandert zur Mitte)
  const innerCentered = await shiftCanvas(innerOnly, dx, dy);

  // 7) Composite: dunkel-getönter BG → zentrierter Charakter → Original-Ring
  const bg = await tintedCirclePng(bgRgb);
  const final = await sharp(bg)
    .composite([
      { input: innerCentered, top: 0, left: 0 },
      { input: ringOnly,      top: 0, left: 0 },
    ])
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
    .toBuffer();

  await writeFile(outputPath, final);
  return { slug, bytes: final.length, bgRgb, dx, dy };
}

async function main() {
  console.log(`▶ Bake start — output: ${AVATAR_DIR}`);
  for (const { slug, color } of TEAMS) {
    try {
      const { bytes, bgRgb, dx, dy } = await bakeOne(slug, color);
      const bgHex = '#' + [bgRgb.r, bgRgb.g, bgRgb.b].map(c => c.toString(16).padStart(2, '0')).join('');
      const shift = dx === 0 && dy === 0 ? 'kein shift' : `shift(${dx >= 0 ? '+' : ''}${dx},${dy >= 0 ? '+' : ''}${dy})`;
      console.log(`  ✓ ${slug.padEnd(10)} ring=${color} bg=${bgHex} ${shift.padEnd(20)} → ${(bytes / 1024).toFixed(1)} KB`);
    } catch (err) {
      console.error(`  ✗ ${slug}: ${err.message}`);
    }
  }
  console.log('▶ Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
