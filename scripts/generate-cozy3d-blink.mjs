// scripts/generate-cozy3d-blink.mjs
// Erzeugt <slug>-blink.png (geschlossene Augen) DIREKT aus dem offenen
// <slug>.png — KEINE separaten ChatGPT-Bilder nötig (die waren oft nicht
// deckungsgleich). Methode pro Auge:
//   1. lokale Fellfarbe an der Aussen-Schläfe sampeln (sauberes Fell, nicht
//      die dunklen Augen-Schatten),
//   2. das Auge mit einer weich gefederten Ellipse in Fellfarbe „wegmalen",
//   3. eine schwarze ‿-Linie (geschlossenes Happy-Auge) zeichnen.
// Garantiert deckungsgleich, weil aus demselben Bild abgeleitet.
//
// Augen-Koordinaten pro Slug im 480×480-Raum (EYE_COORDS). Neue Tiere:
// Bild ansehen, cx/cy/rx/ry + side(-1 links / +1 rechts) eintragen, Skript laufen.
//
// Aufruf:  node scripts/generate-cozy3d-blink.mjs [slug1 slug2 …]   (leer = alle bekannten)

import sharp from 'sharp';
import path from 'path';

const DIR = 'frontend/public/avatars/cozy3d';

// cx,cy = Augen-Mittelpunkt; rx,ry = Augen-Halbachsen; side = Schläfen-Richtung.
const EYE_COORDS = {
  fuchs: [{ cx: 160, cy: 270, rx: 38, ry: 30, side: -1 }, { cx: 320, cy: 270, rx: 38, ry: 30, side: 1 }],
  eule:  [{ cx: 165, cy: 255, rx: 42, ry: 42, side: -1 }, { cx: 320, cy: 255, rx: 42, ry: 42, side: 1 }],
  katze: [{ cx: 150, cy: 237, rx: 40, ry: 36, side: -1 }, { cx: 320, cy: 237, rx: 40, ry: 36, side: 1 }],
  hund:  [{ cx: 163, cy: 265, rx: 37, ry: 36, side: -1 }, { cx: 312, cy: 265, rx: 37, ry: 36, side: 1 }],
};

const px = (data, W, x, y) => { x = Math.round(x); y = Math.round(y); const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };
const medianCol = (samples) => {
  const ch = [0, 1, 2].map(c => { const v = samples.map(s => s[c]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)] ?? 180; });
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
};

async function bake(slug, eyes) {
  const open = path.join(DIR, `${slug}.png`);
  const base = await sharp(open).resize(480, 480, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const { data, info } = await sharp(base).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  let defs = '', parts = '';
  eyes.forEach((e, idx) => {
    // Ring aus 12 Punkten knapp AUSSERHALB des Auges (1.35×). Median = lokale
    // Fellfarbe, robust gegen die dunklen Augen-Schatten (helle UND dunkle Felle).
    // Pro-Tier-Overrides moeglich: fillScale, lineCurve, lineLift, furShift.
    const ring = [];
    for (let a = 0; a < 12; a++) { const ang = a / 12 * Math.PI * 2; ring.push(px(data, W, e.cx + Math.cos(ang) * e.rx * 1.35, e.cy + Math.sin(ang) * e.ry * 1.35)); }
    const fur = medianCol(ring.filter(s => s[3] > 200));
    const fs = e.fillScale ?? 1.06;     // Ellipsen-Größe relativ zum Auge
    const curve = e.lineCurve ?? 0.5;   // ‿-Kurventiefe (0=flach, 1=tief)
    const lift = e.lineLift ?? 3;       // Linie nach oben versetzen
    defs += `<filter id="b${idx}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>`;
    parts += `<ellipse cx="${e.cx}" cy="${e.cy}" rx="${(e.rx * fs).toFixed(1)}" ry="${(e.ry * (fs + 0.02)).toFixed(1)}" fill="${fur}" filter="url(#b${idx})"/>`;
    const lr = e.rx * 0.85;
    parts += `<path d="M ${e.cx - lr} ${e.cy - lift} Q ${e.cx} ${e.cy + e.ry * curve} ${e.cx + lr} ${e.cy - lift}" fill="none" stroke="#3a2a20" stroke-width="${Math.max(5, e.ry * 0.22).toFixed(1)}" stroke-linecap="round"/>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480"><defs>${defs}</defs>${parts}</svg>`;
  const out = await sharp(base).composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png({ quality: 86, compressionLevel: 9, palette: true, effort: 8 }).toBuffer();
  await sharp(out).toFile(path.join(DIR, `${slug}-blink.png`));
  return out.length / 1024;
}

const want = process.argv.slice(2);
const slugs = want.length ? want : Object.keys(EYE_COORDS);
for (const slug of slugs) {
  const eyes = EYE_COORDS[slug];
  if (!eyes) { console.warn(`skip ${slug}: keine EYE_COORDS`); continue; }
  const kb = await bake(slug, eyes);
  console.log(`${slug.padEnd(16)} -blink.png ${kb.toFixed(0)}KB`);
}
console.log(`\nfertig: ${slugs.filter(s => EYE_COORDS[s]).length} Tiere`);
