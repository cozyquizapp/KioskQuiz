/**
 * Liest die echte Ring-Farbe aus jedem trans-PNG.
 * Sampelt 32 Pixel auf einem Kreis mit Radius 0.95·OUTER_R (mittendrin im Ring),
 * gewichteter Median pro Kanal → dominante Ring-Farbe.
 */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AVATAR_DIR = resolve(__dirname, '../frontend/public/avatars/cozy-cast');

const SLUGS = ['waschbaer', 'faultier', 'pinguin', 'kuh', 'koala', 'giraffe', 'capybara', 'shiba'];
const SAMPLES = 64;

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('').toUpperCase();
}

async function sample(slug) {
  const path = resolve(AVATAR_DIR, `avatar-${slug}-trans.png`);
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, ch = info.channels;
  const cx = w / 2, cy = h / 2;
  const ringR = (Math.min(w, h) / 2 - 8) * 0.95;
  const rs = [];
  const gs = [];
  const bs = [];
  for (let i = 0; i < SAMPLES; i++) {
    const a = (i / SAMPLES) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * ringR);
    const y = Math.round(cy + Math.sin(a) * ringR);
    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    const idx = (y * w + x) * ch;
    const alpha = data[idx + 3];
    if (alpha < 128) continue;
    rs.push(data[idx]);
    gs.push(data[idx + 1]);
    bs.push(data[idx + 2]);
  }
  rs.sort((a, b) => a - b);
  gs.sort((a, b) => a - b);
  bs.sort((a, b) => a - b);
  const med = arr => arr[Math.floor(arr.length / 2)];
  return { slug, samples: rs.length, hex: rgbToHex(med(rs), med(gs), med(bs)) };
}

console.log('▶ Sampling ring colors from trans-PNGs');
console.log('');
console.log('  slug        samples  painted-ring-color');
console.log('  ─────────── ───────  ──────────────────');
for (const slug of SLUGS) {
  const r = await sample(slug);
  console.log(`  ${slug.padEnd(11)} ${r.samples.toString().padStart(7)}  ${r.hex}`);
}
