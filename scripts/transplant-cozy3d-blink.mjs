// scripts/transplant-cozy3d-blink.mjs
// Erzeugt <slug>-blink.png per AUTO-DIFF-TRANSPLANT aus einem Augen-auf/zu-Paar.
// Idee (Wolf): nicht das ganze zu-Bild swappen (springt bei Schieflage), sondern
//   1. auf+zu identisch rahmen (trim + 480 contain),
//   2. PIXEL-DIFF rechnen → die 2 größten Unterschiede sind die AUGEN,
//   3. nur diese Augen-Regionen (weich gefedert) aus dem zu-Bild aufs auf-Bild
//      transplantieren → echtes Lid/Wimpern, nahtlos (gleiches Tier = Fell matcht).
// Vorteil: keine Augen-Koordinaten nötig, und das zu-Bild muss nur an den Augen
// stimmen (globale Schieflage egal). Schlecht ausgerichtete Paare werden gewarnt
// (→ manuell pruefen), nicht blind gebacken.
//
// Aufruf:  node scripts/transplant-cozy3d-blink.mjs "<ordner-mit-auf-zu-pngs>"

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const DIR = 'frontend/public/avatars/cozy3d';
const SRC = process.argv[2];
const SIZE = 480;
if (!SRC) { console.error('SRC_DIR fehlt'); process.exit(1); }

function slugify(name) {
  return name.normalize('NFC').replace(/\.[^.]+$/, '').trim().toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
const SLUG_OVERRIDE = { eulen: 'eule', hirsch: 'elch' };
const toSlug = (b) => { const s = slugify(b); return SLUG_OVERRIDE[s] ?? s; };

const proc = (p) => sharp(p).ensureAlpha().trim({ threshold: 1 })
  .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
const raw = async (buf) => { const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, W: info.width, H: info.height }; };

function components(mask, W, H) {
  const lab = new Int32Array(W * H).fill(-1); const comps = []; let c = 0;
  for (let s = 0; s < W * H; s++) {
    if (lab[s] !== -1 || !mask[s]) continue;
    const st = [s]; lab[s] = c; const px = [];
    while (st.length) { const p = st.pop(); px.push(p); const x = p % W, y = (p - x) / W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const np = ny * W + nx;
        if (lab[np] === -1 && mask[np]) { lab[np] = c; st.push(np); } } }
    comps.push(px); c++;
  }
  return comps;
}
const centroid = (comp, W) => { let sx = 0, sy = 0; for (const p of comp) { sx += p % W; sy += (p - p % W) / W; } return [sx / comp.length, sy / comp.length]; };

async function bakePair(slug, aufPath, zuPath) {
  const openB = await proc(aufPath), closedB = await proc(zuPath);
  // 1) optimiertes offenes Bild als Ruhe-Frame schreiben
  await sharp(openB).png({ quality: 86, compressionLevel: 9, palette: true, effort: 8 }).toFile(path.join(DIR, `${slug}.png`));

  const o = await raw(openB), c = await raw(closedB); const W = o.W, H = o.H, N = W * H;
  // 2) Diff-Maske
  const mask = new Uint8Array(N);
  for (let p = 0; p < N; p++) { const i = p * 4;
    if (o.data[i + 3] < 200 || c.data[i + 3] < 200) continue;
    const d = Math.abs(o.data[i] - c.data[i]) + Math.abs(o.data[i + 1] - c.data[i + 1]) + Math.abs(o.data[i + 2] - c.data[i + 2]);
    if (d > 70) mask[p] = 1;
  }
  // 3) Augen = bestes SYMMETRISCHES Blob-Paar — NICHT einfach die 2 größten,
  //    sonst klaut ein Mund-/Nasen-Diff in der Gesichtsmitte einen Augen-Slot
  //    → „Zwinkern" (ein Auge bleibt offen). Augenpaar = gegenüberliegende
  //    Seiten, ähnliche Höhe + Größe, in der oberen Gesichtshälfte.
  const all = components(mask, W, H).filter(c => c.length >= 200).sort((a, b) => b.length - a.length);
  const cand = all.slice(0, 8).map(c => ({ c, n: c.length, ctr: centroid(c, W) }));
  const cx0 = W / 2;
  let pair = null, best = -1;
  for (let i = 0; i < cand.length; i++) for (let j = i + 1; j < cand.length; j++) {
    const A = cand[i], B = cand[j]; const [ax, ay] = A.ctr, [bx, by] = B.ctr;
    if ((ax - cx0) * (bx - cx0) >= 0) continue;       // gleiche Seite → kein Augenpaar
    if (ay > H * 0.72 || by > H * 0.72) continue;       // zu tief (Mund/Kinn)
    const sep = Math.abs(ax - bx); if (sep < W * 0.12 || sep > W * 0.78) continue;
    const sizeRatio = Math.min(A.n, B.n) / Math.max(A.n, B.n);
    const yClose = 1 - Math.min(1, Math.abs(ay - by) / (H * 0.22));
    const score = sizeRatio * 0.55 + yClose * 0.45;
    if (score > best) { best = score; pair = [A.c, B.c]; }
  }
  const warn = [];
  let eyes;
  if (pair) eyes = pair;
  else { eyes = all.slice(0, 2); warn.push('kein symmetrisches Augenpaar — Fallback: 2 größte Blobs'); }
  if (eyes.length < 2) warn.push('weniger als 2 Diff-Blobs');

  const eyeMask = new Uint8Array(N); for (const comp of eyes) for (const p of comp) eyeMask[p] = 1;
  // Dilatation
  const R = 6; const dil = new Uint8Array(eyeMask);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!eyeMask[y * W + x]) continue;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H && dx * dx + dy * dy <= R * R) dil[ny * W + nx] = 1; } }
  const mbuf = Buffer.alloc(N * 4); for (let p = 0; p < N; p++) { mbuf[p * 4] = mbuf[p * 4 + 1] = mbuf[p * 4 + 2] = 255; mbuf[p * 4 + 3] = dil[p] ? 255 : 0; }
  const maskPng = await sharp(mbuf, { raw: { width: W, height: H, channels: 4 } }).blur(4).png().toBuffer();
  const discs = await sharp(closedB).composite([{ input: maskPng, blend: 'dest-in' }]).png().toBuffer();
  await sharp(openB).composite([{ input: discs }]).png({ quality: 86, compressionLevel: 9, palette: true, effort: 8 }).toFile(path.join(DIR, `${slug}-blink.png`));
  return warn;
}

// Paare einsammeln
const files = fs.readdirSync(SRC).filter(f => /\.png$/i.test(f));
const pairs = {};
for (const f of files) { const m = f.match(/^(.*?)\s+augen\s+(auf|zu)\.png$/i); if (!m) continue;
  (pairs[toSlug(m[1])] ??= {})[m[2].toLowerCase()] = path.join(SRC, f); }

const ok = [], flagged = [];
for (const [slug, fr] of Object.entries(pairs).sort()) {
  if (!fr.auf || !fr.zu) { console.warn(`skip ${slug}: fehlt ${!fr.auf ? 'auf' : 'zu'}`); continue; }
  const warn = await bakePair(slug, fr.auf, fr.zu);
  if (warn.length) { flagged.push(slug); console.log(`⚠️  ${slug.padEnd(16)} ${warn.join(', ')}`); }
  else { ok.push(slug); console.log(`✅ ${slug}`); }
}
console.log(`\n=== SAUBER (${ok.length}) ===\n${JSON.stringify(ok.sort())}`);
console.log(`\n=== MANUELL PRUEFEN (${flagged.length}) ===\n${flagged.join(', ')}`);
