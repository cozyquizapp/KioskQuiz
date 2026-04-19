/**
 * Komprimiert + verkleinert alle Avatar-PNGs in
 * frontend/public/avatars/cozy-cast/ auf max 1024×1024, palettiert.
 * Run:  node scripts/compressAvatars.mjs
 */
import sharp from 'sharp';
import { readdir, stat, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AVATAR_DIR = resolve(__dirname, '../frontend/public/avatars/cozy-cast');
const MAX = 1024;

const files = (await readdir(AVATAR_DIR)).filter(f => f.endsWith('.png'));
const SKIP_UNDER_BYTES = 500 * 1024; // Bereits komprimierte Palette-PNGs überspringen

for (const file of files) {
  const path = join(AVATAR_DIR, file);
  const before = (await stat(path)).size;
  if (before < SKIP_UNDER_BYTES) {
    console.log(`  ${file.padEnd(32)}  ${(before/1024).toFixed(1).padStart(7)} KB  (skip, bereits komprimiert)`);
    continue;
  }
  const input = await readFile(path);
  const output = await sharp(input)
    .resize(MAX, MAX, { fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
    .toBuffer();
  await writeFile(path, output);
  const after = output.length;
  const pct = Math.round((1 - after / before) * 100);
  console.log(`  ${file.padEnd(32)}  ${(before/1024/1024).toFixed(2).padStart(6)} MB → ${(after/1024).toFixed(1).padStart(7)} KB  (−${pct}%)`);
}
