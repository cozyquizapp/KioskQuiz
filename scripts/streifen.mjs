/* streifen — mehrere Aufnahmen zu einem beschrifteten Kontaktblatt legen.
   NUTZUNG: node scripts/streifen.mjs .shots/ziel.png .shots/a.png .shots/b.png … */
import { createRequire } from 'node:module';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');
const ziel = process.argv[2];
const bilder = process.argv.slice(3);
const B = 586, H = 330, spalten = 2;
const zeilen = Math.ceil(bilder.length / spalten);
const teile = [];
for (let i = 0; i < bilder.length; i++) {
  const buf = await sharp(bilder[i]).resize(B, H, { fit: 'contain', background: '#000' }).toBuffer();
  teile.push({ input: buf, left: (i % spalten) * (B + 8), top: Math.floor(i / spalten) * (H + 26) + 22 });
  teile.push({ input: Buffer.from(`<svg width="${B}" height="22"><text x="4" y="16" font-family="system-ui" font-size="14" font-weight="700" fill="#F6EFE6">${bilder[i].split('/').pop()}</text></svg>`),
               left: (i % spalten) * (B + 8), top: Math.floor(i / spalten) * (H + 26) });
}
await sharp({ create: { width: spalten * (B + 8), height: zeilen * (H + 26) + 4, channels: 3, background: '#12101A' } })
  .composite(teile).png().toFile(ziel);
console.log('->', ziel);
