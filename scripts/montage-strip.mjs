/**
 * montage-strip.mjs — stitcht .shots/frames/<prefix>_*.png zu EINEM horizontalen
 * Film-Streifen mit Titel + Frame-Nummern. Fuer Motion-Vorher/Nachher.
 * NUTZUNG (aus frontend/, wegen sharp):
 *   node ../scripts/montage-strip.mjs <prefix> "<Titel>" <out.png> [maxFrames]
 */
import sharp from 'sharp';
import { readdirSync } from 'node:fs';

const [prefix, title, out, maxStr] = process.argv.slice(2);
const MAX = Number(maxStr ?? 6);
const DIR = '../.shots/frames';
const files = readdirSync(DIR).filter((f) => f.startsWith(prefix + '_') && f.endsWith('.png')).sort();
// gleichmaessig MAX auswaehlen
const pick = [];
const step = Math.max(1, (files.length - 1) / (MAX - 1));
for (let i = 0; i < MAX && files.length; i++) pick.push(files[Math.min(files.length - 1, Math.round(i * step))]);
const uniq = [...new Set(pick)];

const meta = await sharp(`${DIR}/${uniq[0]}`).metadata();
const fw = meta.width, fh = meta.height;
const gap = 6, padTop = 34, n = uniq.length;
const W = fw * n + gap * (n - 1);
const H = fh + padTop;

const svgTitle = Buffer.from(
  `<svg width="${W}" height="${padTop}"><rect width="100%" height="100%" fill="#0b0b0f"/>` +
  `<text x="8" y="23" font-family="Arial" font-size="18" font-weight="bold" fill="#fff">${title}</text></svg>`
);
const labels = uniq.map((_, i) => {
  const x = i * (fw + gap);
  const svg = Buffer.from(
    `<svg width="30" height="22"><rect width="100%" height="100%" rx="4" fill="#000" opacity="0.6"/>` +
    `<text x="6" y="16" font-family="Arial" font-size="14" font-weight="bold" fill="#8fe">${i + 1}</text></svg>`
  );
  return { input: svg, left: x + 4, top: padTop + 4 };
});

const composites = [
  { input: svgTitle, left: 0, top: 0 },
  ...uniq.map((f, i) => ({ input: `${DIR}/${f}`, left: i * (fw + gap), top: padTop })),
  ...labels,
];

await sharp({ create: { width: W, height: H, channels: 3, background: '#0b0b0f' } })
  .composite(composites)
  .png()
  .toFile(`../.shots/${out}`);
console.log(`✓ .shots/${out}  (${uniq.length} frames, ${W}x${H})`);
