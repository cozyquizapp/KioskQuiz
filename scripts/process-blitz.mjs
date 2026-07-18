import sharp from '../frontend/node_modules/sharp/lib/index.js';
const SRC = 'C:/Users/hornu/Desktop/für claude/blitz.png';
const OUT = 'frontend/public/fx-blitz.png';
// 1) eng trimmen (schwarzer Rand weg)
const trimmed = await sharp(SRC).trim({ background: '#000000', threshold: 18 }).toBuffer();
// 2) Luminanz -> Alpha (schwarz transparent, weiche Kante), dunkle Gold-Schatten bleiben
const img = sharp(trimmed).ensureAlpha();
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const t0 = 22, t1 = 74; // max-channel Schwellen
for (let i = 0; i < data.length; i += channels) {
  const m = Math.max(data[i], data[i + 1], data[i + 2]);
  let a = (m - t0) / (t1 - t0);
  a = a < 0 ? 0 : a > 1 ? 1 : a;
  data[i + 3] = Math.round(a * 255);
}
await sharp(data, { raw: { width, height, channels } }).png().toFile(OUT);
console.log(`✓ ${OUT}  ${width}x${height}`);
