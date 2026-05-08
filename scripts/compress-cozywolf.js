#!/usr/bin/env node
/**
 * Komprimiert alle cozywolf-PNGs UND erzeugt zusaetzlich AVIF+WebP-Versionen:
 *   - Resize -> 1536x1536 (4K-Beamer-Oversampling, siehe TARGET_SIZE).
 *   - PNG mit Palette/Indexed-Color (max 256 Farben). Cartoon-flat-color-Stil
 *     verliert visuell nichts, Filesize aber dramatisch.
 *   - WebP (quality 80) als Fallback fuer Browser ohne AVIF-Support
 *     (Safari < 16, alte Android-WebViews).
 *   - AVIF (quality 50, effort 6) als primaeres Format. ~50-70 % kleiner als PNG
 *     bei vergleichbarer Wahrnehmungsqualitaet.
 *
 *   Resultat: 22 Posen × 3 Formate = 66 Files. Browser laedt automatisch
 *   die kleinste unterstuetzte Variante via <picture>-Tag in <CozyWolfImage>.
 *
 * Usage: node scripts/compress-cozywolf.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC_DIR = path.join(__dirname, '..', 'frontend', 'public', 'avatars', 'cozywolf');
// 1536x1536: Display max 240 CSS-px, auf 4K-Beamer mit DPR=2 = 480 px,
// 1536 source = 3.2x Oversampling. Crisp auch bei extremem Zoom.
const TARGET_SIZE = 1536;

async function main() {
  const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.png'));
  console.log(`Found ${files.length} PNGs in ${SRC_DIR}\n`);

  const totals = { png: { before: 0, after: 0 }, webp: 0, avif: 0 };

  for (const file of files) {
    const pngPath = path.join(SRC_DIR, file);
    const webpPath = pngPath.replace(/\.png$/i, '.webp');
    const avifPath = pngPath.replace(/\.png$/i, '.avif');
    const beforePng = fs.statSync(pngPath).size;
    totals.png.before += beforePng;

    // Pipeline einmal vorbereiten, dann auf 3 Formate fanout. Sharp resize ist
    // teuer (~80 ms pro Pose) — einmal in den Buffer reicht.
    const resized = sharp(pngPath)
      .resize(TARGET_SIZE, TARGET_SIZE, { fit: 'inside', withoutEnlargement: true });

    const [pngBuf, webpBuf, avifBuf] = await Promise.all([
      resized.clone().png({ palette: true, quality: 90, compressionLevel: 9 }).toBuffer(),
      resized.clone().webp({ quality: 80 }).toBuffer(),
      resized.clone().avif({ quality: 50, effort: 6 }).toBuffer(),
    ]);

    fs.writeFileSync(pngPath, pngBuf);
    fs.writeFileSync(webpPath, webpBuf);
    fs.writeFileSync(avifPath, avifBuf);

    const afterPng = pngBuf.length;
    totals.png.after += afterPng;
    totals.webp += webpBuf.length;
    totals.avif += avifBuf.length;

    const kb = (b) => (b / 1024).toFixed(0).padStart(4);
    console.log(
      `  ${file.padEnd(45)} png ${kb(afterPng)} KB · webp ${kb(webpBuf.length)} KB · avif ${kb(avifBuf.length)} KB`
    );
  }

  const mb = (b) => (b / 1024 / 1024).toFixed(2);
  console.log(`\nTotal PNG  : ${mb(totals.png.before)} MB -> ${mb(totals.png.after)} MB`);
  console.log(`Total WebP : ${mb(totals.webp)} MB`);
  console.log(`Total AVIF : ${mb(totals.avif)} MB  <-- primaeres Format fuer moderne Browser`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
