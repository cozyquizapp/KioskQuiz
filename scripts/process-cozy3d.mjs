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

// EXPLIZITE Allow-Liste fehlerhafter Exporte (schwarze Galerie-Kachel
// mit-exportiert). NUR diese Dateien werden geheilt — eine allgemeine
// Heuristik fraesse sonst echt-dunkle Tiere (Spinne/Stinktier/Marienkaefer)
// kaputt, deren Koerper selbst die groesste dunkle Flaeche ist.
const HEAL_BG = new Set(['Dino.png']);

// Macht die GRÖSSTE zusammenhängende dunkel-opake Flaeche (= die Kachel)
// transparent. Augen/Mund/Outline sind kleine separate Komponenten → bleiben.
// Sicherung: greift nur wenn die Flaeche > BG_THRESHOLD ausmacht.
const BG_THRESHOLD = 0.18;
async function stripDarkBg(srcPath) {
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels, N = W * H;
  const lum = (p) => { const i = p * C; return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; };
  const dark = (p) => data[p * C + 3] > 40 && lum(p) < 85;
  const label = new Int32Array(N).fill(-1);
  let best = -1, bestSize = 0, cur = 0;
  for (let s = 0; s < N; s++) {
    if (label[s] !== -1 || !dark(s)) continue;
    const stack = [s]; label[s] = cur; let size = 0;
    while (stack.length) {
      const p = stack.pop(); size++; const x = p % W, y = (p - x) / W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const np = ny * W + nx; if (label[np] === -1 && dark(np)) { label[np] = cur; stack.push(np); }
      }
    }
    if (size > bestSize) { bestSize = size; best = cur; } cur++;
  }
  if (bestSize / N < BG_THRESHOLD) return null;   // kein Tile → Original unveraendert lassen
  for (let p = 0; p < N; p++) if (label[p] === best) data[p * C + 3] = 0;
  // Feather: opake Pixel neben entfernten, lum<120 → weicher Alpha-Verlauf gegen Halo.
  const out = Uint8Array.from(data);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x; if (label[p] === best || data[p * C + 3] < 8) continue;
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < W && ny < H && label[ny * W + nx] === best;
    });
    if (nb) { const l = lum(p); if (l < 120) out[p * C + 3] = Math.round(data[p * C + 3] * Math.min(1, l / 120)); }
  }
  return await sharp(Buffer.from(out), { raw: { width: W, height: H, channels: C } }).png().toBuffer();
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
  // 0. Schwarze Galerie-Kachel heilen — nur fuer bekannte Fehl-Exporte.
  const healed = HEAL_BG.has(file) ? await stripDarkBg(srcPath) : null;
  const base = healed ? sharp(healed) : sharp(srcPath).ensureAlpha();
  // 1. Trim transparente Ränder → reine Bounding-Box des Tieres.
  const trimmed = await base.clone().trim({ threshold: 1 }).toBuffer({ resolveWithObject: true })
    .catch(() => null);
  const body = trimmed ? sharp(trimmed.data) : (healed ? sharp(healed) : sharp(srcPath));

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
