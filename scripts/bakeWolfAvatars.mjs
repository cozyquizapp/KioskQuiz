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

const SLUGS = [
  'waschbaer', 'faultier', 'pinguin', 'kuh',
  'koala', 'giraffe', 'capybara', 'shiba',
];

// Source-PNGs sind 2000×2000 — wir bleiben auf nativer Auflösung,
// damit nichts hochskaliert / runterskaliert werden muss (= keine Pixeligkeit).
const SIZE = 2000;
const OUTER_R = SIZE / 2 - 8;          // 992
const BG_R = OUTER_R * 0.92;           // ≈ 912.64 — sitzt hinter dem Ring
const CX = SIZE / 2;
const CY = SIZE / 2;
const BG_COLOR = { r: 0, g: 0, b: 0 }; // wirklich schwarz

/**
 * Erzeugt einen schwarzen Kreis als PNG-Buffer (1024×1024, sonst transparent).
 * Wir bauen das per SVG → sharp rastert es sauber mit anti-aliased edge.
 */
function blackCirclePng() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
      <circle cx="${CX}" cy="${CY}" r="${BG_R}" fill="rgb(${BG_COLOR.r},${BG_COLOR.g},${BG_COLOR.b})"/>
    </svg>
  `;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function bakeOne(slug) {
  const inputPath = resolve(AVATAR_DIR, `avatar-${slug}-trans.png`);
  const outputPath = resolve(AVATAR_DIR, `avatar-${slug}-wolf.png`);

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

  // 2) Schwarzen Kreis auf SIZE×SIZE-Canvas erzeugen
  const bg = await blackCirclePng();

  // 3) Composite: schwarzer Kreis unten, Trans-Charakter darüber
  const final = await sharp(bg)
    .composite([{ input: transOnCanvas, top: 0, left: 0 }])
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
    .toBuffer();

  await writeFile(outputPath, final);
  return { slug, bytes: final.length };
}

async function main() {
  console.log(`▶ Bake start — output: ${AVATAR_DIR}`);
  for (const slug of SLUGS) {
    try {
      const { bytes } = await bakeOne(slug);
      console.log(`  ✓ ${slug.padEnd(10)} → avatar-${slug}-wolf.png (${(bytes / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`  ✗ ${slug}: ${err.message}`);
    }
  }
  console.log('▶ Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
