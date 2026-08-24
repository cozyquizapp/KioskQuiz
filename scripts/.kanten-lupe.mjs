import { createRequire } from 'node:module';
const sharp = createRequire(new URL('../frontend/package.json', import.meta.url))('sharp');
const name = process.argv[2] ?? 'potion.png';
const p = `frontend/public/avatars/cozyquiz/${name}`;
const { width, height } = await sharp(p).metadata();
// Linke Flanke auf halber Hoehe: dort ist die Kante am ehesten senkrecht.
const y = Math.round(height * 0.62);
const { data } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const at = (x, yy) => { const i = (yy * width + x) * 4; return [data[i], data[i+1], data[i+2], data[i+3]]; };
let x0 = 0;
for (let x = 0; x < width; x++) { if (at(x, y)[3] > 200) { x0 = x; break; } }
console.log(`${name} ${width}x${height} · Schnitt bei y=${y}, erste deckende Spalte x=${x0}`);
console.log('  x    R   G   B   A');
for (let x = Math.max(0, x0 - 6); x < x0 + 10; x++) {
  const [r,g,b,a] = at(x, y);
  console.log(`  ${String(x).padStart(3)}  ${String(r).padStart(3)} ${String(g).padStart(3)} ${String(b).padStart(3)} ${String(a).padStart(3)}`);
}
// Ausschnitt gross herausschreiben, damit man es ANSIEHT.
const w = Math.min(70, width - Math.max(0, x0 - 20));
await sharp({ create: { width: 300, height: 300, channels: 4, background: '#4C8DF6' } })
  .composite([{ input: await sharp(p).extract({ left: Math.max(0, x0 - 20), top: Math.max(0, y - 35), width: w, height: 70 }).png().toBuffer(), left: 0, top: 0 }])
  .resize(300, 300, { kernel: 'nearest' })
  .png().toFile(`.shots/LUPE-${name}`);
console.log(`  -> .shots/LUPE-${name}`);
