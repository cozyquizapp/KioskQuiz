#!/usr/bin/env node
/**
 * Komprimiert alle cozywolf-PNGs:
 *   - Resize 3000x3000 -> 1024x1024 (Display-Max 240px, 4x Retina = 960px)
 *   - PNG mit Palette/Indexed-Color (max 256 Farben) — Cartoon-flat-color-Stil
 *     verliert visuell nichts, Filesize aber dramatisch (5 MB -> ~300 KB).
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

  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of files) {
    const fullPath = path.join(SRC_DIR, file);
    const before = fs.statSync(fullPath).size;
    totalBefore += before;

    // Read into buffer first, then write back — sharp can't read & write the
    // same path in one chain.
    const buf = await sharp(fullPath)
      .resize(TARGET_SIZE, TARGET_SIZE, { fit: 'inside', withoutEnlargement: true })
      .png({ palette: true, quality: 90, compressionLevel: 9 })
      .toBuffer();

    fs.writeFileSync(fullPath, buf);
    const after = fs.statSync(fullPath).size;
    totalAfter += after;

    const beforeKB = (before / 1024).toFixed(0);
    const afterKB = (after / 1024).toFixed(0);
    const pct = ((1 - after / before) * 100).toFixed(0);
    console.log(`  ${file.padEnd(45)} ${beforeKB.padStart(5)} KB -> ${afterKB.padStart(4)} KB (-${pct}%)`);
  }

  const totalBeforeMB = (totalBefore / 1024 / 1024).toFixed(1);
  const totalAfterMB = (totalAfter / 1024 / 1024).toFixed(1);
  const totalPct = ((1 - totalAfter / totalBefore) * 100).toFixed(0);
  console.log(`\nTotal: ${totalBeforeMB} MB -> ${totalAfterMB} MB (-${totalPct}%)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
