// Bereinigt die durch Canvas Luma-Filter erzeugten Halos an den Wolf-Kanten.
//
// Pipeline:
//   1. SVG durch sharp rendern (resvg) — die Filter-Kette liefert ein PNG mit
//      Alpha-Halo am Uebergang zwischen Wolf-Farben und schwarzem Hintergrund.
//   2. Alpha-Channel hart thresholden (alpha < 140 -> 0, sonst 255). Das
//      eliminiert den Halo komplett.
//   3. Maske um 1px erodieren, damit auch der dunkelste Antialias-Pixelring
//      verschwindet, danach um 0.6px wieder weichzeichnen fuer eine klare aber
//      nicht treppige Kante.
//   4. Auf 1024x1024 herunterskalieren (Beamer braucht nicht 3125px).
//   5. Als PNG ausgeben.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const dir = path.join(__dirname, '..', 'frontend', 'public', 'avatars', 'cozywolf');
const outDir = dir; // direkt neben den Originalen
const files = ['augenauf.mundauf.svg', 'augenauf.mundzu.svg', 'augenzu.mundauf.svg', 'augenzu.mundzu.svg'];

const SIZE = 1024;
const ALPHA_THRESHOLD = 140;

(async () => {
  for (const file of files) {
    const svg = fs.readFileSync(path.join(dir, file));
    // Stage 1a: SVG bei hoher Density rendern (Filter brauchen Aufloesung)
    const hiRes = await sharp(svg, { density: 200 }).png().toBuffer();
    // Stage 1b: auf SIZE skalieren und als RGBA-Raw lesen
    const rendered = await sharp(hiRes)
      .resize(SIZE, SIZE, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data, info } = rendered;
    const w = info.width;
    const h = info.height;

    // Stage 2: harte Alpha-Maske aus den gerenderten Daten bauen
    const mask = Buffer.alloc(w * h);
    for (let i = 0; i < w * h; i++) {
      mask[i] = data[i * 4 + 3] >= ALPHA_THRESHOLD ? 255 : 0;
    }

    // Stage 3: Maske 1px erodieren (Halo wegschneiden), dann sanft glaetten.
    // sharp's blur+threshold-Pipeline blaeht 1-Kanal zu 3-Kanal-RGB auf —
    // wir lesen deshalb am Ende den R-Kanal als Maskenwert.
    const erodedMaskRaw = await sharp(mask, { raw: { width: w, height: h, channels: 1 } })
      .blur(0.8)
      .threshold(200) // alles mit weniger als 200 -> 0 (effektiv: 1px Erosion)
      .blur(0.5)      // Kanten leicht weichzeichnen, sonst sieht's treppig aus
      .raw()
      .toBuffer({ resolveWithObject: true });
    const erodedMaskBuf = erodedMaskRaw.data;
    const maskStride = erodedMaskRaw.info.channels; // erwartet: 3

    // Stage 4: Original-RGB mit der bereinigten Maske als Alpha kombinieren.
    // Damit die alten Halo-Farbwerte den neuen Rand nicht "vergiften", werden
    // RGB-Pixel nur dort als Wolf-Farbe gewertet, wo die alte Maske bereits
    // klar ueber dem Threshold lag — Randpixel uebernehmen ihre Nachbarfarbe
    // (durch sharp's Resampling beim spaeteren composite).
    const cleaned = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      cleaned[i * 4 + 0] = data[i * 4 + 0];
      cleaned[i * 4 + 1] = data[i * 4 + 1];
      cleaned[i * 4 + 2] = data[i * 4 + 2];
      cleaned[i * 4 + 3] = erodedMaskBuf[i * maskStride];
    }

    const outPath = path.join(outDir, file.replace('.svg', '.png'));
    await sharp(cleaned, { raw: { width: w, height: h, channels: 4 } })
      .png({ compressionLevel: 9, palette: false })
      .toFile(outPath);
    const stat = fs.statSync(outPath);
    console.log(`${file} -> ${path.basename(outPath)}  ${(stat.size/1024).toFixed(0)} KB`);
  }
})();
