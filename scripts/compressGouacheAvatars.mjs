/**
 * Komprimiert die 16 Aquarell-Avatare in
 * frontend/public/avatars/gouache/ auf max 1024×1024 + WebP-Variante.
 * Source-Backup landet in frontend/public/avatars/gouache/.source/
 * (gitignored — siehe .gitignore-Eintrag).
 *
 * Run:  node scripts/compressGouacheAvatars.mjs
 *
 * Strategie:
 *   - Erstes mal: Originale (9-13 MB) werden in .source/ verschoben,
 *     komprimierte Variante (PNG ~ 200-500 KB + WebP ~ 100-300 KB)
 *     ins ursprüngliche Verzeichnis geschrieben.
 *   - Beim erneuten Lauf: schon komprimierte PNGs werden ge-skippt.
 *
 * PNG-Settings: 1024×1024 (fit inside), palette: true (256 Farben),
 *               quality 90, effort 10 — optimiert für Aquarell-Avatare
 *               die viel Pastell-Farbverlauf haben.
 * WebP-Settings: quality 80, effort 6 — ähnliche Bild-Qualität bei ~50%
 *                der PNG-Größe.
 */
import sharp from 'sharp';
import {
  readdir, stat, readFile, writeFile, rename, mkdir, access,
} from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AVATAR_DIR = resolve(__dirname, '../frontend/public/avatars/gouache');
// Source-Backup ausserhalb von public/, sonst kopiert Vite es ins Build.
const SOURCE_DIR = resolve(__dirname, '../frontend/avatars-source-gouache');
const MAX = 1024;
const SKIP_UNDER_BYTES = 700 * 1024; // unter 700 KB: bereits komprimiert

await mkdir(SOURCE_DIR, { recursive: true });

const files = (await readdir(AVATAR_DIR)).filter(f => f.endsWith('.png'));

let totalBefore = 0;
let totalAfterPng = 0;
let totalAfterWebp = 0;

for (const file of files) {
  const path = join(AVATAR_DIR, file);
  const sizeBefore = (await stat(path)).size;
  totalBefore += sizeBefore;

  if (sizeBefore < SKIP_UNDER_BYTES) {
    console.log(`  ${file.padEnd(34)}  ${(sizeBefore/1024).toFixed(1).padStart(7)} KB  (skip, bereits komprimiert)`);
    totalAfterPng += sizeBefore;
    continue;
  }

  // Backup Original ins .source/ falls noch nicht da
  const sourcePath = join(SOURCE_DIR, file);
  let sourceExists = false;
  try { await access(sourcePath); sourceExists = true; } catch {}
  if (!sourceExists) {
    await rename(path, sourcePath);
  }
  const input = await readFile(sourceExists ? sourcePath : sourcePath);

  // Komprimierte PNG
  const png = await sharp(input)
    .resize(MAX, MAX, { fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
    .toBuffer();
  await writeFile(path, png);
  totalAfterPng += png.length;

  // WebP-Variante
  const webp = await sharp(input)
    .resize(MAX, MAX, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80, effort: 6 })
    .toBuffer();
  const webpPath = path.replace(/\.png$/, '.webp');
  await writeFile(webpPath, webp);
  totalAfterWebp += webp.length;

  const pctPng = Math.round((1 - png.length / sizeBefore) * 100);
  console.log(
    `  ${file.padEnd(34)}  ${(sizeBefore/1024/1024).toFixed(2).padStart(6)} MB → ` +
    `PNG ${(png.length/1024).toFixed(1).padStart(7)} KB (−${pctPng}%)  ` +
    `WebP ${(webp.length/1024).toFixed(1).padStart(7)} KB`
  );
}

console.log('\n────────────────────────────────────────────────────────────');
console.log(`  Total:  ${(totalBefore/1024/1024).toFixed(1)} MB → ` +
            `PNG ${(totalAfterPng/1024/1024).toFixed(1)} MB  ` +
            `+ WebP ${(totalAfterWebp/1024/1024).toFixed(1)} MB`);
console.log(`  Originale gesichert in: ${SOURCE_DIR}`);
