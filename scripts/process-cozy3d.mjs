// scripts/process-cozy3d.mjs
// Verarbeitet die rohen cozy3d-Avatar-PNGs (Wolfs 3D-Fluent-Tier-Set):
//   1. Trim transparenter Ränder  → jeder Avatar füllt seine Disc maximal,
//      egal ob Kopf- oder Ganzkörper-Motiv (löst „wirkt zu klein"-Problem).
//   2. Recompress (palette, quality)  → 80×~260 KB ≈ 20 MB → mobil-tauglich.
//   3. ASCII-Slug-Dateinamen  → Umlaut/Leerzeichen-Namen sind URL-untauglich.
//
// Quelle: SRC (pristine Backup), Ziel: DEST (public, served).
// Gibt am Ende ein Manifest [{slug,label,w,h,kb}] als JSON aus → fürs Registry.
//
// Aufruf:  node scripts/process-cozy3d.mjs <SRC_DIR>
// Default SRC = DEST (in-place), aber für sauberes Reprocessing besser Backup.

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const DEST = 'frontend/public/avatars/cozy3d';
const SRC = process.argv[2] || DEST;
const SIZE = 480;           // quadratische Ziel-Leinwand (Source ist 500)

function slugify(name) {
  return name
    .normalize('NFC')
    .replace(/\.[^.]+$/, '')        // Extension
    .replace(/\s*\(\d+\)\s*$/, '')  // " (2)"
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function labelize(name) {
  const base = name.replace(/\.[^.]+$/, '').replace(/\s*\(\d+\)\s*$/, '').trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
}

const files = fs.readdirSync(SRC).filter(f => /\.png$/i.test(f));
if (!files.length) { console.error('Keine PNGs in', SRC); process.exit(1); }

fs.mkdirSync(DEST, { recursive: true });

const manifest = [];
let totalKb = 0;

for (const file of files) {
  const slug = slugify(file);
  const label = labelize(file);
  const srcPath = path.join(SRC, file);

  // Trim transparente Ränder, dann in MAX-Box einpassen (kein Upscale),
  // mit kleinem transparenten Pad damit der Avatar nicht hart an der Disc klebt.
  const img = sharp(srcPath).ensureAlpha();
  // 1. Trim transparente Ränder → reine Bounding-Box des Tieres.
  const trimmed = await img.clone().trim({ threshold: 1 }).toBuffer({ resolveWithObject: true })
    .catch(() => null);
  const body = trimmed ? sharp(trimmed.data) : sharp(srcPath);

  // 2. In eine QUADRATISCHE Leinwand zentrieren (fit:contain → längste Kante
  //    des Tieres füllt die Leinwand, zentriert, transparent gepaddet).
  //    Ergebnis: alle 80 PNGs sind SIZE×SIZE → in der runden Disc füllt jede
  //    längste Kante denselben Anteil → einheitliche Größe + gleicher Rand.
  const out = await body
    .resize(SIZE, SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ quality: 86, compressionLevel: 9, palette: true, effort: 8 })
    .toBuffer({ resolveWithObject: true });

  fs.writeFileSync(path.join(DEST, `${slug}.png`), out.data);
  const kb = out.data.length / 1024;
  totalKb += kb;
  manifest.push({ slug, label, w: out.info.width, h: out.info.height, kb: +kb.toFixed(1) });
}

// Wenn in-place (SRC===DEST): alte Umlaut/Space-Originale entfernen, die NICHT
// schon ein gültiger Slug sind.
const slugSet = new Set(manifest.map(m => `${m.slug}.png`));
for (const file of fs.readdirSync(DEST)) {
  if (/\.png$/i.test(file) && !slugSet.has(file)) {
    fs.unlinkSync(path.join(DEST, file));
  }
}

manifest.sort((a, b) => a.label.localeCompare(b.label, 'de'));
console.log(JSON.stringify({ count: manifest.length, totalKb: +totalKb.toFixed(0), avatars: manifest }, null, 2));
