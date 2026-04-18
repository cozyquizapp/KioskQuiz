/**
 * Analysiert avatar-{slug}-trans.png und ermittelt:
 *  - Bounding-Box aller opaquen Pixel (= Ring + Charakter)
 *  - Bounding-Box NUR der Pixel innerhalb von 0.85*OUTER_R (= ohne Ring,
 *    nur Inner-Content = Charakter / Hoodie / Kopf)
 *
 * Der Inner-BBox-Mittelpunkt sollte idealerweise bei (SIZE/2, SIZE/2) sein.
 * Abweichung davon = Offset, den der Bake ausgleichen müsste.
 *
 * Run:  node scripts/analyzeAvatarCenters.mjs
 */

import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AVATAR_DIR = resolve(__dirname, '../frontend/public/avatars/cozy-cast');

const SLUGS = [
  'waschbaer', 'faultier', 'pinguin', 'kuh',
  'koala', 'giraffe', 'capybara', 'shiba',
];

const SIZE = 2000;
const OUTER_R = SIZE / 2 - 8;
const INNER_R = OUTER_R * 0.85;       // alles innerhalb davon = Charakter (Ring ausschließen)
const ALPHA_THRESHOLD = 32;            // "opaque genug"
const CX = SIZE / 2;
const CY = SIZE / 2;

async function analyze(slug) {
  const path = resolve(AVATAR_DIR, `avatar-${slug}-trans.png`);
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const channels = info.channels; // sollte 4 sein
  const innerR2 = INNER_R * INNER_R;

  // Source kann andere Größe haben als SIZE — wir rechnen relativ
  const cx = w / 2;
  const cy = h / 2;
  const innerR = (Math.min(w, h) / 2 - 8) * 0.85;
  const innerR2_src = innerR * innerR;

  let allMinX = w, allMinY = h, allMaxX = 0, allMaxY = 0, allCount = 0;
  let inMinX = w, inMinY = h, inMaxX = 0, inMaxY = 0, inCount = 0;
  let inSumX = 0, inSumY = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * channels + 3];
      if (a < ALPHA_THRESHOLD) continue;

      // alle opaquen Pixel
      if (x < allMinX) allMinX = x;
      if (y < allMinY) allMinY = y;
      if (x > allMaxX) allMaxX = x;
      if (y > allMaxY) allMaxY = y;
      allCount++;

      // nur innerhalb des Inner-Discs
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= innerR2_src) {
        if (x < inMinX) inMinX = x;
        if (y < inMinY) inMinY = y;
        if (x > inMaxX) inMaxX = x;
        if (y > inMaxY) inMaxY = y;
        inCount++;
        inSumX += x;
        inSumY += y;
      }
    }
  }

  // Inner-Pixel: bbox-Mittelpunkt + gewichteter Schwerpunkt
  const inBboxCx = (inMinX + inMaxX) / 2;
  const inBboxCy = (inMinY + inMaxY) / 2;
  const inCentroidX = inSumX / inCount;
  const inCentroidY = inSumY / inCount;

  // Offset relativ zur Bildmitte (in source px) → später auf SIZE skalieren
  const scale = SIZE / Math.max(w, h);
  const offBboxX = Math.round((inBboxCx - cx) * scale);
  const offBboxY = Math.round((inBboxCy - cy) * scale);
  const offCentroidX = Math.round((inCentroidX - cx) * scale);
  const offCentroidY = Math.round((inCentroidY - cy) * scale);

  return {
    slug,
    src: `${w}×${h}`,
    innerCount: inCount,
    bboxOffset: { x: offBboxX, y: offBboxY },
    centroidOffset: { x: offCentroidX, y: offCentroidY },
  };
}

async function main() {
  console.log(`▶ Analysiere ${SLUGS.length} trans-PNGs (Inner-Content Mittelpunkt vs. Bildmitte)`);
  console.log(`  (Werte in 2000×2000-Koordinaten — pos x = nach rechts, pos y = nach unten)`);
  console.log('');
  console.log(`  ${'slug'.padEnd(11)} ${'src'.padEnd(12)} ${'inner-px'.padStart(9)}  ${'bbox-offset'.padEnd(18)} ${'centroid-offset'.padEnd(18)}`);
  console.log(`  ${'─'.repeat(11)} ${'─'.repeat(12)} ${'─'.repeat(9)}  ${'─'.repeat(18)} ${'─'.repeat(18)}`);
  for (const slug of SLUGS) {
    try {
      const r = await analyze(slug);
      const bx = `(${r.bboxOffset.x.toString().padStart(5)},${r.bboxOffset.y.toString().padStart(5)})`;
      const cn = `(${r.centroidOffset.x.toString().padStart(5)},${r.centroidOffset.y.toString().padStart(5)})`;
      console.log(`  ${slug.padEnd(11)} ${r.src.padEnd(12)} ${r.innerCount.toString().padStart(9)}  ${bx.padEnd(18)} ${cn.padEnd(18)}`);
    } catch (err) {
      console.error(`  ✗ ${slug}: ${err.message}`);
    }
  }
  console.log('');
  console.log('Faustregel: |offset| > ~60px in 2000×2000 = sichtbar schief.');
  console.log('bbox = umgebendes Rechteck Mittelpunkt; centroid = gewichteter Pixel-Schwerpunkt.');
  console.log('Der bbox-Wert ist meist robuster für "wo sitzt die Form".');
}

main().catch(err => { console.error(err); process.exit(1); });
