/**
 * key-white-video.mjs — ein Video mit weissem Grund freistellen.
 *
 * Anlass (Wolf 2026-08-23): der gelieferte 3D-Wolf fuer die Willkommen-Seite.
 * Erst kam ein Bild mit Gruenwand, dann „du bekommst es gleich als webM
 * format, falls du es brauchst".
 *
 * GEMESSEN, bevor gebaut wurde:
 *   Codec vp9, 768x768, 30 fps, 5,19 s (156 Bilder), dazu eine Opus-Tonspur.
 *   Der Container traegt zwar `alpha_mode: 1`, aber das ist nur Metadata aus
 *   dem Export: dekodiert man mit libvpx-vp9 nach rgba, sind 0,0 % der Pixel
 *   durchsichtig. Es ist auch KEINE Gruenwand mehr (Gruenanteil 0,0 %),
 *   sondern schlicht WEISS (Ecken 254-255).
 *   Auf der dunklen Buehne waere das ein weisser Kasten. Also freistellen.
 *
 * WIE, und warum nicht anders:
 *   Ein reiner Farbschluessel („alles Weisse weg") wuerde die Zaehne und das
 *   Augenweiss mit durchlöchern. Deshalb entscheidet nicht die Farbe, sondern
 *   die ERREICHBARKEIT: von den Bildraendern durch alles Weisse fluten. Was
 *   danach nicht geflutet ist, liegt innen und bleibt — genau die Regel, die
 *   schon bei den Avatar-PNGs die echten Loecher von den Flecken trennt.
 *
 *   Die Kante ist gemessen 2 bis 4 px weich, davor liegt ein sehr blasser
 *   Hof (Werte um 250-254). Ein harter Schnitt liesse den Hof als hellen Rand
 *   stehen. Deshalb bekommt nur ein schmales Band am geschluteten Bereich
 *   einen weichen Verlauf, und die Farbe wird dort gegen Weiss
 *   zurueckgerechnet (unpremultiply), damit die Kante auf dunklem Grund nicht
 *   milchig wird.
 *
 * NUTZUNG:
 *   node scripts/key-white-video.mjs <quelle.webm> <ziel.webm> [--ton]
 */
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');
const reqRoot = createRequire(new URL('../package.json', import.meta.url));
const FFMPEG = reqRoot('@ffmpeg-installer/ffmpeg').path;

const QUELLE = process.argv[2];
const ZIEL = process.argv[3];
const MIT_TON = process.argv.includes('--ton');
if (!QUELLE || !ZIEL) {
  console.error('Nutzung: node scripts/key-white-video.mjs <quelle> <ziel> [--ton]');
  process.exit(1);
}

const FLUT = 244;       // ab hier gilt ein Pixel von aussen als „weiss genug"
const BAND = 4;         // nur so weit reicht der weiche Verlauf nach innen
const RAMPE_OBEN = 250; // hier ist die Kante ganz durchsichtig
const RAMPE_UNTEN = 120;// ... und hier ganz deckend

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wolfkey-'));
const roh = path.join(tmp, 'roh');
const frei = path.join(tmp, 'frei');
fs.mkdirSync(roh); fs.mkdirSync(frei);

const ff = (args) => execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });

console.log('Bilder herausziehen ...');
ff(['-vcodec', 'libvpx-vp9', '-i', QUELLE, '-pix_fmt', 'rgba', path.join(roh, 'f%04d.png')]);
const bilder = fs.readdirSync(roh).filter(f => f.endsWith('.png')).sort();
console.log(`${bilder.length} Bilder`);

let summeFrei = 0;
for (const [n, file] of bilder.entries()) {
  const { data, info } = await sharp(path.join(roh, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const mn = (i) => Math.min(data[i * c], data[i * c + 1], data[i * c + 2]);

  // ── von aussen durch alles Weisse fluten ───────────────────────────────────
  const aussen = new Uint8Array(w * h);
  const stack = [];
  const start = (i) => { if (!aussen[i] && mn(i) >= FLUT) { aussen[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) { start(x); start((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { start(y * w); start(y * w + w - 1); }
  while (stack.length) {
    const q = stack.pop(); const x = q % w, y = (q / w) | 0;
    if (x > 0) start(q - 1);
    if (x < w - 1) start(q + 1);
    if (y > 0) start(q - w);
    if (y < h - 1) start(q + w);
  }

  // ── Abstand zum geschluteten Bereich, nur bis BAND ─────────────────────────
  const dist = new Uint8Array(w * h).fill(255);
  let welle = [];
  for (let i = 0; i < w * h; i++) if (aussen[i]) { dist[i] = 0; welle.push(i); }
  for (let d = 1; d <= BAND && welle.length; d++) {
    const naechste = [];
    for (const q of welle) {
      const x = q % w, y = (q / w) | 0;
      for (const r of [x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1, y > 0 ? q - w : -1, y < h - 1 ? q + w : -1]) {
        if (r >= 0 && dist[r] === 255) { dist[r] = d; naechste.push(r); }
      }
    }
    welle = naechste;
  }

  // ── Deckung setzen ─────────────────────────────────────────────────────────
  let durchsichtig = 0;
  for (let i = 0; i < w * h; i++) {
    if (aussen[i]) { data[i * c + 3] = 0; durchsichtig++; continue; }
    if (dist[i] > BAND) { data[i * c + 3] = 255; continue; }
    const m = mn(i);
    const a = Math.max(0, Math.min(1, (RAMPE_OBEN - m) / (RAMPE_OBEN - RAMPE_UNTEN)));
    data[i * c + 3] = Math.round(a * 255);
    if (a > 0.004) {
      // Farbe gegen Weiss zurueckrechnen: C = a*F + (1-a)*255
      for (let k = 0; k < 3; k++) {
        const f = (data[i * c + k] - (1 - a) * 255) / a;
        data[i * c + k] = Math.max(0, Math.min(255, Math.round(f)));
      }
    }
  }
  summeFrei += durchsichtig / (w * h);

  await sharp(data, { raw: { width: w, height: h, channels: c } })
    .png().toFile(path.join(frei, file));
  if (n % 30 === 0) process.stdout.write(`  ${n}/${bilder.length}\r`);
}
console.log(`\nDurchschnittlich ${(summeFrei / bilder.length * 100).toFixed(1)} % der Flaeche freigestellt`);

console.log('Neu zusammensetzen (VP9 mit Alpha) ...');
fs.mkdirSync(path.dirname(ZIEL), { recursive: true });
const args = [
  '-y', '-framerate', '30', '-i', path.join(frei, 'f%04d.png'),
  ...(MIT_TON ? ['-i', QUELLE, '-map', '0:v', '-map', '1:a', '-c:a', 'libopus', '-b:a', '96k'] : ['-an']),
  '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '30',
  '-auto-alt-ref', '0', '-row-mt', '1',
  ZIEL,
];
ff(args);
fs.rmSync(tmp, { recursive: true, force: true });
const kb = (fs.statSync(ZIEL).size / 1024).toFixed(0);
console.log(`fertig: ${ZIEL}  (${kb} kB)`);
