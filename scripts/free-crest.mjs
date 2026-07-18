import sharp from '../frontend/node_modules/sharp/lib/index.js';
// Schwarzen BG freistellen ohne die dunklen Schild-Bereiche zu fressen:
// niedrige max-channel-Schwelle (nur nahe-Schwarz weg), weiche Kante durch Glow.
export async function free(srcPath, outPath, {t0=6, t1=26}={}) {
  const trimmed = await sharp(srcPath).trim({ background: '#000000', threshold: 10 }).toBuffer();
  const { data, info } = await sharp(trimmed).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const m = Math.max(data[i], data[i+1], data[i+2]);
    let a = (m - t0) / (t1 - t0);
    a = a < 0 ? 0 : a > 1 ? 1 : a;
    data[i+3] = Math.round(a * 255);
  }
  await sharp(data, { raw: { width, height, channels } }).webp({ quality: 92 }).toFile(outPath);
  return { width, height };
}
// CLI: node free-crest.mjs <src> <out> [t0] [t1]
if (process.argv[2]) {
  const [,, src, out, a, b] = process.argv;
  const r = await free(src, out, { t0: a?+a:6, t1: b?+b:26 });
  console.log('✓', out, r.width+'x'+r.height);
}
