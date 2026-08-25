/* award-zeichen-messen — passen die Award-Zeichen zueinander?
   Wolf: „die awardemojis muessen glaub ich ueberarbeitet werden, sie passen
   nicht zueinander?"

   „Passt zueinander" ist keine Meinung, sondern vier Zahlen: wie gross das
   Motiv auf der Leinwand steht, wie mittig es sitzt, wie viel Flaeche es
   ausfuellt und wie hell und bunt es ist. Ein Satz wirkt uneinheitlich, wenn
   diese Zahlen auseinanderlaufen - nicht, weil die Motive verschieden sind.

   NUTZUNG: node scripts/award-zeichen-messen.mjs [datei ...] */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const ORDNER = 'frontend/public/icons';
const VORGABE = ['award-speedy.png', 'award-thief.png', 'award-underdog.png',
                 'award-heart.png', 'award-anchor.png', 'award-sharpshooter.png',
                 'award-participation.png', 'cg-cozygames.png', 'fx-crown.png'];
const dateien = process.argv.slice(2).filter(a => !a.startsWith('--'));
const liste = (dateien.length ? dateien : VORGABE).filter(f => fs.existsSync(path.join(ORDNER, f)));

console.log('Datei                    Groesse    Motiv (Alpha-Kasten)   Fuellung  Mitte-Versatz  Helligkeit  Buntheit');
const zeilen = [];
for (const f of liste) {
  const p = path.join(ORDNER, f);
  const bild = sharp(p);
  const meta = await bild.metadata();
  const { data, info } = await bild.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, K = info.channels;
  let x0 = W, y0 = H, x1 = -1, y1 = -1, deckend = 0;
  let summeL = 0, summeS = 0, n = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * K;
      const a = data[i + 3];
      if (a < 24) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      deckend++;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      summeL += (max + min) / 2;
      summeS += max === 0 ? 0 : (max - min) / max;
      n++;
    }
  }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const laengste = Math.max(bw, bh) / W;
  const fuellung = deckend / (bw * bh);
  const mx = (x0 + x1) / 2 - W / 2, my = (y0 + y1) / 2 - H / 2;
  const versatz = Math.round(Math.hypot(mx, my));
  const hell = Math.round(summeL / n);
  const bunt = +(summeS / n).toFixed(2);
  zeilen.push({ f, laengste, fuellung, versatz, hell, bunt });
  console.log(
    `${f.padEnd(24)} ${String(meta.width + 'x' + meta.height).padEnd(10)} ` +
    `${String(bw + 'x' + bh).padEnd(22)} ${(fuellung * 100).toFixed(0).padStart(5)} %   ` +
    `${String(versatz).padStart(9)} px  ${String(hell).padStart(8)}    ${bunt.toFixed(2).padStart(7)}`,
  );
}
const spanne = (k, name, einheit = '') => {
  const w = zeilen.map(z => z[k]);
  const min = Math.min(...w), max = Math.max(...w);
  console.log(`  ${name.padEnd(28)} ${min.toFixed(2)} bis ${max.toFixed(2)}${einheit}   Spanne ${(max - min).toFixed(2)}`);
};
console.log('\nWie weit laufen die Zahlen auseinander?');
spanne('laengste', 'laengste Kante der Leinwand');
spanne('fuellung', 'Fuellung im eigenen Kasten');
spanne('hell', 'Helligkeit');
spanne('bunt', 'Buntheit');
