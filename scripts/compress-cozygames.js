#!/usr/bin/env node
/**
 * Komprimiert die CozyGame-Icons (cg-*.png) in frontend/public/icons/.
 * Glossy-3D mit Gradienten -> KEIN Palette-Indexing (Banding), sondern
 * Resize auf 640px + maximale PNG-Kompression bei voller Farbtiefe.
 * Display max ~200 CSS-px, auf 4K-Beamer DPR=2 = ~400px -> 640 = 1.6x Oversampling.
 * Usage: node scripts/compress-cozygames.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DIR = path.join(__dirname, '..', 'frontend', 'public', 'icons');
const TARGET = 640;

async function main() {
  const files = fs.readdirSync(DIR).filter(f => /^cg-.*\.png$/i.test(f));
  console.log(`Found ${files.length} cg-*.png in ${DIR}\n`);
  let before = 0, after = 0;
  for (const file of files) {
    const p = path.join(DIR, file);
    const b = fs.statSync(p).size; before += b;
    const buf = await sharp(p)
      .resize(TARGET, TARGET, { fit: 'inside', withoutEnlargement: true })
      .png({ quality: 90, compressionLevel: 9, effort: 10 })
      .toBuffer();
    fs.writeFileSync(p, buf);
    const a = buf.length; after += a;
    console.log(`${file.padEnd(30)} ${(b/1024).toFixed(0).padStart(5)}KB -> ${(a/1024).toFixed(0).padStart(4)}KB`);
  }
  console.log(`\nTotal: ${(before/1024/1024).toFixed(1)}MB -> ${(after/1024/1024).toFixed(1)}MB`);
}
main().catch(e => { console.error(e); process.exit(1); });
