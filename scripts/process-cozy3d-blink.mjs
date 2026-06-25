// scripts/process-cozy3d-blink.mjs
// Verarbeitet Wolfs Augen-auf/zu-Paare (für Blinzel-Animation) analog
// process-cozy3d.mjs, ABER:
//   - pro Tier ZWEI Frames: "<Name> augen auf.png" + "<Name> augen zu.png"
//   - die Trim-Box wird EINMAL aus dem auf-Frame berechnet und auf BEIDE
//     Frames identisch angewandt → kein Versatz/Springen beim Blinzeln.
//   - auf  → cozy3d/<slug>.png        (ersetzt den Ruhezustand, neue optimierte Version)
//   - zu   → cozy3d/<slug>-blink.png  (Blink-Frame)
// Am Ende: JSON-Liste der fertigen Slugs (für COZY3D_BLINK_SLUGS im Frontend).
//
// Aufruf:  node scripts/process-cozy3d-blink.mjs "<SRC_DIR>"

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const DEST = 'frontend/public/avatars/cozy3d';
const SRC = process.argv[2];
const SIZE = 480;
if (!SRC) { console.error('SRC_DIR fehlt'); process.exit(1); }

function slugify(name) {
  return name
    .normalize('NFC')
    .replace(/\.[^.]+$/, '')
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
// Namens-Sonderfälle → bestehende Roster-Slugs
const SLUG_OVERRIDE = { eulen: 'eule', hirsch: 'elch' };
const toSlug = (base) => { const s = slugify(base); return SLUG_OVERRIDE[s] ?? s; };

// Paare einsammeln: slug → { auf, zu }
const files = fs.readdirSync(SRC).filter(f => /\.png$/i.test(f));
const pairs = {};
for (const f of files) {
  const m = f.match(/^(.*?)\s+augen\s+(auf|zu)\.png$/i);
  if (!m) continue;
  const slug = toSlug(m[1]);
  (pairs[slug] ??= {})[m[2].toLowerCase()] = path.join(SRC, f);
}

const done = [];
const missingRoster = [];

for (const [slug, fr] of Object.entries(pairs).sort()) {
  if (!fr.auf || !fr.zu) { console.warn(`skip ${slug}: fehlt ${!fr.auf ? 'auf' : 'zu'}`); continue; }
  if (!fs.existsSync(path.join(DEST, `${slug}.png`))) missingRoster.push(slug);

  // 1. Trim-Box aus dem auf-Frame.
  const opened = await sharp(fr.auf).ensureAlpha().trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  const { trimOffsetLeft = 0, trimOffsetTop = 0, width: tw, height: th } = opened.info;
  const region = { left: -trimOffsetLeft, top: -trimOffsetTop, width: tw, height: th };

  // 2. Dieselbe Box aus dem zu-Frame extrahieren (identische Ausrichtung).
  let closedBuf;
  try {
    closedBuf = await sharp(fr.zu).ensureAlpha().extract(region).toBuffer();
  } catch {
    // Fallback: zu-Frame eigenständig trimmen (falls Maße abweichen).
    closedBuf = (await sharp(fr.zu).ensureAlpha().trim({ threshold: 1 }).toBuffer());
  }

  const finish = (buf) => sharp(buf)
    .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 86, compressionLevel: 9, palette: true, effort: 8 })
    .toBuffer();

  const [aufOut, zuOut] = await Promise.all([finish(opened.data), finish(closedBuf)]);
  fs.writeFileSync(path.join(DEST, `${slug}.png`), aufOut);
  fs.writeFileSync(path.join(DEST, `${slug}-blink.png`), zuOut);
  done.push(slug);
  console.log(`${slug.padEnd(16)} auf ${(aufOut.length/1024).toFixed(0)}KB · zu ${(zuOut.length/1024).toFixed(0)}KB`);
}

console.log('\n=== DONE SLUGS (' + done.length + ') ===');
console.log(JSON.stringify(done.sort()));
if (missingRoster.length) console.log('\n⚠️ NICHT im Roster (neuer Slug nötig):', missingRoster.join(', '));
