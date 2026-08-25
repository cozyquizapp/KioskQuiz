/* award-zeremonie-messen — die Award-Zeremonie im Turm-Finale aufnehmen.
   Frage, rollendes Rad, Einrasten, Baustein.

   NUTZUNG:  node scripts/award-zeremonie-messen.mjs

   Dicht getaktet: die drei Takte dauern zusammen rund 6,8 s, und ob das Rad
   wirklich BREMST oder nur blinkt, entscheidet sich in Abstaenden von unter
   einer halben Sekunde. Ein Kontaktblatt mit einem Bild pro Sekunde saehe
   ueberall gleich aus. */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
// ⚠️ NICHT die Station `turmfinale` nehmen: die faehrt schon ueber den
// Zwischenstand hinaus, und der Lauf landete beim ersten Anlauf auf der
// Danke-Folie. Von `final-reveal` aus selbst vorfahren.
await b.zurStation('cozydanach'); await sleep(700);
await h.springe('final-reveal'); await sleep(900);
const seite = h.seite();

// Bis zum Zwischenstand vorfahren, der Beat danach ist der erste Award.
const wartetAuf = async (muster, hoechstens = 6000) => {
  const bis = Date.now() + hoechstens;
  while (Date.now() < bis) {
    if (muster.test(await seite.evaluate(() => document.body.innerText))) return true;
    await sleep(160);
  }
  return false;
};
const ZWISCHEN = /Zwischenstand|Standings/;
for (let i = 0; i < 20; i++) {
  if (await wartetAuf(ZWISCHEN, 300)) break;
  await h.emit('qq:nextQuestion');
  if (await wartetAuf(ZWISCHEN)) break;
}
console.log('stehe bei:', await seite.evaluate(() => document.body.innerText.slice(0, 50).replace(/\n/g, ' | ')));

const cdp = await seite.context().newCDPSession(seite);
const bilder = [];
cdp.on('Page.screencastFrame', async (f) => {
  bilder.push({ t: Date.now(), buf: Buffer.from(f.data, 'base64') });
  try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* Ende */ }
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 82, maxWidth: 880, maxHeight: 495, everyNthFrame: 1 });
await sleep(400);
const t0 = Date.now();
bilder.length = 0;
await h.emit('qq:nextQuestion');   // erster Award-Beat
await sleep(11000);
await cdp.send('Page.stopScreencast');
for (const bd of bilder) bd.t -= t0;
console.log(`${bilder.length} Bilder bis ${bilder.at(-1)?.t} ms`);

fs.mkdirSync('.shots', { recursive: true });
async function blatt(marken, spalten, breite, datei) {
  const gewaehlt = marken.map(m => {
    let best = null;
    for (const bd of bilder) if (!best || Math.abs(bd.t - m) < Math.abs(best.t - m)) best = bd;
    return best;
  }).filter(Boolean);
  const BES = 22, kacheln = [];
  for (const bd of gewaehlt) {
    const bild = await sharp(bd.buf).resize(breite).toBuffer();
    kacheln.push({ t: bd.t, bild, h: (await sharp(bild).metadata()).height });
  }
  const zh = Math.max(...kacheln.map(k => k.h));
  const reihen = Math.ceil(kacheln.length / spalten);
  const w = spalten * breite + (spalten + 1) * 6, hh = reihen * (zh + BES) + 6;
  const teile = [], texte = [];
  kacheln.forEach((k, i) => {
    const x = 6 + (i % spalten) * (breite + 6);
    const y = 6 + Math.floor(i / spalten) * (zh + BES);
    teile.push({ input: k.bild, left: x, top: y + BES });
    texte.push(`<text x="${x + 3}" y="${y + 16}" font-family="monospace" font-size="14" fill="#F6EFE6">${k.t} ms</text>`);
  });
  teile.push({ input: Buffer.from(`<svg width="${w}" height="${hh}">${texte.join('')}</svg>`), left: 0, top: 0 });
  await sharp({ create: { width: w, height: hh, channels: 3, background: '#111' } }).composite(teile).png().toFile(datei);
  console.log(`${datei} geschrieben`);
}
// Der ganze Bogen, und die Bremsphase des Rades gross.
await blatt([0, 400, 900, 1500, 2000, 2300, 2700, 3200, 3800, 4300, 4700, 5000,
             5300, 5600, 5900, 6300, 6900, 7400, 8000, 8800, 9600, 10400], 6, 380, '.shots/AWARD.png');
// Das Einrasten dicht: zwischen 5,4 und 6,6 s entscheidet sich, ob das Rad
// sauber stehenbleibt. Im Uebersichtsblatt war bei 5886 ms gar keine Marke zu
// sehen - das kann ein Zwischenbild sein oder ein Loch. Hier wird es sichtbar.
await blatt([5400, 5560, 5700, 5840, 5980, 6120, 6260, 6400], 4, 700, '.shots/AWARD-raste.png');
await b.schliessen?.();
process.exit(0);
