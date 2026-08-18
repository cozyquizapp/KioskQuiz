/**
 * stilprobe-ausschneiden.mjs — schneidet die Motive aus den Stilproben-Reihen
 * frei und legt sie als quadratische PNGs mit transparentem Grund ab.
 *
 * Anlass (Wolf 2026-08-18): „ich hab die Avatare noch gar nicht ausgeschnitten
 * und ins Quiz gepackt gesehen." Genau das ist der Zweck: aus der generierten
 * Reihe werden einzelne Marken, wie sie die App spaeter laedt.
 *
 * Der Zuschnitt teilt NICHT nach zusammenhaengenden Bloecken (dabei verschmelzen
 * beruehrende Motive, so ist bei E-vinyl aus 5 Motiven eines geworden), sondern
 * sucht die Spaltentaeler in der Naehe der erwarteten Grenzen. Bei fuenf gleich
 * verteilten Motiven ist das robust.
 *
 * STAND 2026-08-18: Wolf stellt in Canva frei („canva regelt"), und das Ergebnis
 * ist sauber besser als dieses Skript. Zwei Stellen, an denen der automatische
 * Weg verliert: der Bierschaum liegt farblich so nah am Grund, dass er entweder
 * mitgeht oder ein Halo behaelt, und der eingebrannte Kontaktschatten bleibt als
 * heller Fleck stehen, der auf der dunklen Farb-Disc auffaellt. Das Skript
 * bleibt fuer schnelle Zwischenstaende, die Lieferdateien kommen aus Canva.
 *
 * NUTZUNG: node scripts/stilprobe-ausschneiden.mjs [ziel-ordner]
 */
import { mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = require('sharp');

const IN = 'design-assets/stilprobe';
const OUT = process.argv[2] ?? '.shots/stilprobe-motive';
const ANZAHL = 5;
const SLUGS = ['fuchs', 'daumen', 'herz', 'krug', 'drache'];
const KANTE = 512;   // Liefergroesse laut docs/AVATAR_BRIEF.md
const FUELL = 0.86;  // Motiv fuellt ~86% der Kante

mkdirSync(OUT, { recursive: true });

/**
 * Flachen Grund entfernen — per FLUTFUELLUNG vom Bildrand, nicht global nach
 * Farbe. Der globale Weg hat helle Innenflaechen mitgenommen: der Bierschaum
 * und die hellen Daumen bekamen Loecher, weil sie der Grundfarbe zu nahe sind.
 * Die Flutfuellung erreicht nur, was mit dem Rand zusammenhaengt.
 */
async function freistellen(datei) {
  const { data, info } = await sharp(datei).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels, W = info.width, H = info.height;
  const bg = [data[0], data[1], data[2]];
  const TOL = Number(process.env.TOL ?? 16) * 3;
  const nah = (i) =>
    Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]) < TOL;

  const gesehen = new Uint8Array(W * H);
  const stapel = [];
  for (let x = 0; x < W; x++) { stapel.push(x, (H - 1) * W + x); }
  for (let y = 0; y < H; y++) { stapel.push(y * W, y * W + W - 1); }
  while (stapel.length) {
    const p = stapel.pop();
    if (gesehen[p]) continue;
    if (!nah(p * ch)) continue;
    gesehen[p] = 1;
    const x = p % W, y = (p - x) / W;
    if (x > 0) stapel.push(p - 1);
    if (x < W - 1) stapel.push(p + 1);
    if (y > 0) stapel.push(p - W);
    if (y < H - 1) stapel.push(p + W);
  }
  for (let p = 0; p < W * H; p++) if (gesehen[p]) data[p * ch + 3] = 0;
  return { data, info };
}

/** Deckkraft je Spalte zaehlen. */
function spaltenDichte({ data, info }) {
  const ch = info.channels;
  const dichte = new Array(info.width).fill(0);
  for (let x = 0; x < info.width; x++) {
    let n = 0;
    for (let y = 0; y < info.height; y++) if (data[(y * info.width + x) * ch + 3] > 24) n++;
    dichte[x] = n;
  }
  return dichte;
}

/** Die ANZAHL-1 Schnittstellen: leerste Spalte nahe der erwarteten Grenze. */
function schnitte(dichte, breite) {
  const feld = breite / ANZAHL;
  const fenster = Math.round(feld * 0.3);
  const out = [];
  for (let k = 1; k < ANZAHL; k++) {
    const mitte = Math.round(k * feld);
    let bestX = mitte, best = Infinity;
    for (let x = Math.max(1, mitte - fenster); x < Math.min(breite - 1, mitte + fenster); x++) {
      if (dichte[x] < best) { best = dichte[x]; bestX = x; }
    }
    out.push(bestX);
  }
  return out;
}

for (const datei of readdirSync(IN).filter((f) => /\.(png|jpe?g|webp)$/i.test(f))) {
  const stil = datei.replace(/\.[^.]+$/, '');
  const roh = await freistellen(`${IN}/${datei}`);
  const png = await sharp(roh.data, { raw: { width: roh.info.width, height: roh.info.height, channels: roh.info.channels } })
    .png().toBuffer();
  const grenzen = [0, ...schnitte(spaltenDichte(roh), roh.info.width), roh.info.width];

  mkdirSync(`${OUT}/${stil}`, { recursive: true });
  for (let i = 0; i < ANZAHL; i++) {
    const left = grenzen[i], width = grenzen[i + 1] - grenzen[i];
    const streifen = await sharp(png).extract({ left, top: 0, width, height: roh.info.height }).png().toBuffer();
    // Eng auf das Motiv trimmen, dann quadratisch mit Rand zentrieren.
    const eng = await sharp(streifen).trim({ threshold: 1 }).png().toBuffer();
    const innen = Math.round(KANTE * FUELL);
    const marke = await sharp(eng)
      .resize(innen, innen, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png().toBuffer();
    await sharp({ create: { width: KANTE, height: KANTE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: marke, gravity: 'center' }])
      .png().toFile(`${OUT}/${stil}/${SLUGS[i]}.png`);
  }
  console.log(`✓ ${OUT}/${stil}/ — ${SLUGS.join(', ')}`);
}
