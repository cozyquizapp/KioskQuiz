/**
 * Bake-Skript: erzeugt avatar-{slug}-wolf.png für alle 8 Teams.
 *
 * Input:  frontend/public/avatars/cozy-cast/avatar-{slug}-trans.png
 *         (transparenter BG, team-farbiger Ring schon eingebrannt)
 * Output: frontend/public/avatars/cozy-cast/avatar-{slug}-wolf.png
 *         (gleicher Charakter + Ring, aber mit schwarzem Innenkreis hinter
 *          dem Charakter — entspricht 1:1 dem Wolf-Mode aus dem Design Lab)
 *
 * Logik (matcht composeWolfBadge() in frontend/public/design-lab.html):
 *   - Canvas 1024×1024
 *   - Schwarzer Kreis bei Radius (outerR - 4) * 0.92, gefüllt
 *   - Trans-PNG drüber gezeichnet (skaliert auf max-Kante = 1024)
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
// Inner-BG wird per TINT_FACTOR sehr dunkel getönt, damit das Badge "farbig dunkel"
// statt komplett schwarz wirkt — Hoodie/Charakter bleiben gut lesbar.
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

// Source-PNGs sind 2000×2000 — wir bleiben auf nativer Auflösung,
// damit nichts hochskaliert / runterskaliert werden muss (= keine Pixeligkeit).
const SIZE = 2000;
const OUTER_R = SIZE / 2 - 8;          // 992
const BG_R = OUTER_R * 0.92;           // ≈ 912.64 — sitzt hinter dem Ring
const CX = SIZE / 2;
const CY = SIZE / 2;

// 0.16 = 16% der Team-Sättigung gemischt mit Schwarz → dunkles Ton-in-Ton.
const TINT_FACTOR = 0.16;

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

/**
 * Erzeugt einen Kreis im übergebenen RGB als PNG-Buffer (SIZE×SIZE, sonst transparent).
 * Wir bauen das per SVG → sharp rastert es sauber mit anti-aliased edge.
 */
function tintedCirclePng(rgb) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
      <circle cx="${CX}" cy="${CY}" r="${BG_R}" fill="rgb(${rgb.r},${rgb.g},${rgb.b})"/>
    </svg>
  `;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function bakeOne(slug, color) {
  const inputPath = resolve(AVATAR_DIR, `avatar-${slug}-trans.png`);
  const outputPath = resolve(AVATAR_DIR, `avatar-${slug}-wolf.png`);
  const bgRgb = hexToTintedRgb(color, TINT_FACTOR);

  // 1) Trans-PNG laden, ggf. auf SIZE×SIZE bringen (max-Kante = SIZE, "contain")
  //    Source ist 2000×2000 → bei SIZE=2000 wird nichts skaliert (1:1, keine Pixeligkeit).
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
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  // 2) Dunkel-getönten Kreis (Team-Farbe × TINT_FACTOR) auf SIZE×SIZE-Canvas
  const bg = await tintedCirclePng(bgRgb);

  // 3) Composite: getönter Kreis unten, Trans-Charakter darüber
  const final = await sharp(bg)
    .composite([{ input: transOnCanvas, top: 0, left: 0 }])
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
    .toBuffer();

  await writeFile(outputPath, final);
  return { slug, bytes: final.length, bgRgb };
}

async function main() {
  console.log(`▶ Bake start — output: ${AVATAR_DIR}`);
  for (const { slug, color } of TEAMS) {
    try {
      const { bytes, bgRgb } = await bakeOne(slug, color);
      const bgHex = '#' + [bgRgb.r, bgRgb.g, bgRgb.b].map(c => c.toString(16).padStart(2, '0')).join('');
      console.log(`  ✓ ${slug.padEnd(10)} ring=${color} bg=${bgHex} → avatar-${slug}-wolf.png (${(bytes / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`  ✗ ${slug}: ${err.message}`);
    }
  }
  console.log('▶ Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
