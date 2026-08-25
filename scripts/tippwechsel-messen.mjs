/* tippwechsel-messen — den Wechsel von einer Tipp-Karte zur naechsten aufnehmen.
   Das ist die Folge, die im Finale bis zu acht Mal hintereinander laeuft.

   NUTZUNG (aus dem Wurzelverzeichnis):
     node scripts/tippwechsel-messen.mjs         # .shots/TIPPWECHSEL-NEU.png
     node scripts/tippwechsel-messen.mjs --alt   # .shots/TIPPWECHSEL-ALT.png

   Aufgenommen wird als Bildstrom ueber das Chrome-Protokoll, nicht mit
   `page.screenshot()`: eine Aufnahme kostet auf der Buehne rund 900 ms, und
   der ganze Wechsel dauert weniger als das.

   Die Null ist NICHT der Klick. Zwischen Klick und erstem veraenderten Bild
   liegen Socket und React, gemessen 300 bis 450 ms, und die schwanken von Lauf
   zu Lauf. Zwei Laeufe waeren damit nicht vergleichbar. Deshalb wird die Null
   aus den Bildern selbst bestimmt: das erste Bild, das sich vom Stand vor dem
   Klick deutlich unterscheidet. */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const VOR = process.argv.includes('--alt') ? 'ALT' : 'NEU';
const MARKEN = [0, 80, 160, 240, 330, 420, 520, 640, 800, 1000, 1300];

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
await b.zurStation('turmfinale'); await sleep(900);
await h.springe('final-reveal'); await sleep(900);
const seite = h.seite();

// Bis zur ersten Tipp-Karte mit einer echten Karte darauf. Die Nullgruppe
// („alle ohne Tipp") ist eine andere Folie und nicht der Wechsel, um den es geht.
for (let i = 0; i < 24; i++) {
  const txt = await seite.evaluate(() => document.body.innerText);
  if (/TIPP \d+ VON/.test(txt) && /TIPPTE AUF/.test(txt)) break;
  await h.emit('qq:nextQuestion'); await sleep(1000);
}
console.log('stehe bei:', await seite.evaluate(() => document.body.innerText.slice(0, 60).replace(/\n/g, ' | ')));

const cdp = await seite.context().newCDPSession(seite);
const bilder = [];
cdp.on('Page.screencastFrame', async (f) => {
  bilder.push({ t: Date.now(), buf: Buffer.from(f.data, 'base64') });
  try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* Ende */ }
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 880, maxHeight: 495, everyNthFrame: 1 });
await sleep(700);
const vorherBild = bilder.at(-1);
fs.mkdirSync('.shots', { recursive: true });
// Der Stand VOR dem Klick, einzeln. Nur damit sieht man, ob die abgehende
// Karte vorher schon eingerastet war - und also im Weggehen neu anfaengt.
fs.writeFileSync(`.shots/TIPPWECHSEL-${VOR}-vorher.jpg`, vorherBild.buf);
bilder.length = 0;
await h.emit('qq:nextQuestion');
await sleep(2200);
await cdp.send('Page.stopScreencast');

/** Grobes Grau, 64x36, zum Vergleichen. Genauer muss es nicht sein. */
const fingerabdruck = async (buf) => sharp(buf).greyscale().resize(64, 36, { fit: 'fill' }).raw().toBuffer();
const grund = await fingerabdruck(vorherBild.buf);
let null_ = null;
for (const bd of bilder) {
  const f = await fingerabdruck(bd.buf);
  let summe = 0;
  for (let i = 0; i < f.length; i++) summe += Math.abs(f[i] - grund[i]);
  if (summe / f.length > 3) { null_ = bd.t; break; }
}
if (null_ === null) { console.error('Kein veraendertes Bild gefunden.'); process.exit(1); }
for (const bd of bilder) bd.t -= null_;
console.log(`${bilder.length} Bilder, Bewegung von ${bilder[0].t} bis ${bilder.at(-1).t} ms`);

const gewaehlt = MARKEN.map(m => {
  let best = null;
  for (const bd of bilder) if (bd.t >= -40 && (!best || Math.abs(bd.t - m) < Math.abs(best.t - m))) best = bd;
  return { m, bd: best };
}).filter(x => x.bd);

fs.mkdirSync('.shots', { recursive: true });
// Nur die rechte Haelfte: dort steht die Karte, links steht unveraendert das Brett.
const SP = 4, BREIT = 340, BES = 24;
const kacheln = [];
for (const { bd } of gewaehlt) {
  const m = await sharp(bd.buf).metadata();
  const bild = await sharp(bd.buf)
    .extract({ left: Math.round(m.width * 0.5), top: 0, width: Math.round(m.width * 0.5), height: m.height })
    .resize(BREIT).toBuffer();
  kacheln.push({ echt: bd.t, bild, h: (await sharp(bild).metadata()).height });
}
const zh = Math.max(...kacheln.map(k => k.h));
const reihen = Math.ceil(kacheln.length / SP);
const w = SP * BREIT + (SP + 1) * 8, hh = reihen * (zh + BES) + 8;
const teile = [], texte = [];
kacheln.forEach((k, i) => {
  const x = 8 + (i % SP) * (BREIT + 8);
  const y = 8 + Math.floor(i / SP) * (zh + BES);
  teile.push({ input: k.bild, left: x, top: y + BES });
  texte.push(`<text x="${x + 4}" y="${y + 17}" font-family="monospace" font-size="15" fill="#F6EFE6">${k.echt} ms</text>`);
});
teile.push({ input: Buffer.from(`<svg width="${w}" height="${hh}">${texte.join('')}</svg>`), left: 0, top: 0 });
await sharp({ create: { width: w, height: hh, channels: 3, background: '#111' } })
  .composite(teile).png().toFile(`.shots/TIPPWECHSEL-${VOR}.png`);
console.log(`.shots/TIPPWECHSEL-${VOR}.png geschrieben:`, kacheln.map(k => k.echt).join(', '), 'ms');
await b.schliessen?.();
process.exit(0);
