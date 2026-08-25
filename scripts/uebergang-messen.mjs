/* uebergang-messen — den Wechsel von der letzten Tipp-Folie zum Turm aufnehmen.
   Ein Standbild sagt ueber einen Uebergang nichts.

   NUTZUNG (aus dem Wurzelverzeichnis):
     node scripts/uebergang-messen.mjs          # Kontaktblatt .shots/UEBERGANG-NEU.png
     node scripts/uebergang-messen.mjs --alt    # dasselbe als …-ALT.png, zum Vergleichen
   Fuer ein Vorher-Bild den Stand vorher auschecken oder `git stash`, dann
   mit --alt laufen lassen.

   ERSTER ANLAUF, und der Fehler steht hier, weil er die Messung wertlos machte:
   ich habe mit `page.screenshot()` bei 0/120/240/400 ms abtasten wollen. Eine
   Aufnahme kostet auf dieser Buehne aber rund 900 ms. Herausgekommen sind
   Bilder bei 0/1071/1921/2825 ms - der ganze Uebergang lag zwischen den ersten
   beiden Marken und war nirgends zu sehen.

   Jetzt laeuft ein echter Bildstrom ueber das Chrome-Protokoll
   (`Page.startScreencast`). Der Browser schickt ein Bild, sobald sich etwas
   aendert, mit eigenem Zeitstempel. Danach wird ausgesucht, was den Marken am
   naechsten liegt, und daneben steht die tatsaechliche Zeit. */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const VOR = process.argv.includes('--alt') ? 'ALT' : 'NEU';
const MARKEN = [0, 100, 200, 320, 450, 620, 800, 1000, 1400, 2000];

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
await b.zurStation('turmfinale');
await sleep(1000);
await h.springe('final-reveal'); await sleep(900);
const seite = h.seite();

// ZWEITER FEHLER, auch der steht hier: ich habe die Klicks bis zum Turm
// gezaehlt und dann „einen weniger" gemacht. `springe('final-reveal')` landet
// aber nicht zuverlaessig auf Schritt 0, und die Zahl der Tipp-Folien haengt am
// Raum. Herausgekommen ist zweimal die falsche Stelle: einmal mitten im Turm,
// einmal ein Wechsel von Tipp 3 auf Tipp 4.
//
// Jetzt wird nicht mehr gerechnet. Der Bildstrom laeuft ueber ALLE Klicks mit,
// und der Zeitpunkt des LETZTEN Klicks - desjenigen, nach dem der Turm steht -
// ist die Null. Das kann per Konstruktion nicht danebenliegen.
const cdp = await seite.context().newCDPSession(seite);
const bilder = [];
cdp.on('Page.screencastFrame', async (f) => {
  bilder.push({ t: Date.now(), buf: Buffer.from(f.data, 'base64') });
  try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* Ende */ }
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 880, maxHeight: 495, everyNthFrame: 1 });
await sleep(400);

let t0 = 0;
let davor = '';
for (let i = 0; i < 24; i++) {
  const txt = await seite.evaluate(() => document.body.innerText);
  if (/höchsten Turm/.test(txt)) break;
  davor = txt.slice(0, 40).replace(/\n/g, ' | ');
  t0 = Date.now();
  await h.emit('qq:nextQuestion');
  await sleep(1100);
}
console.log('letzte Tipp-Folie war:', davor);
await sleep(1600);
await cdp.send('Page.stopScreencast');
for (const bd of bilder) bd.t -= t0;
console.log(`${bilder.length} Bilder, von ${bilder[0]?.t} bis ${bilder.at(-1)?.t} ms um den Klick herum`);

// Zu jeder Marke das naechstliegende Bild.
const gewaehlt = MARKEN.map(m => {
  let best = null;
  for (const bd of bilder) if (!best || Math.abs(bd.t - m) < Math.abs(best.t - m)) best = bd;
  return { m, bd: best };
}).filter(x => x.bd);

fs.mkdirSync('.shots', { recursive: true });
const SP = 3, BREIT = 440;
const kacheln = [];
for (const { m, bd } of gewaehlt) {
  const bild = await sharp(bd.buf).resize(BREIT).toBuffer();
  const meta = await sharp(bild).metadata();
  kacheln.push({ m, echt: bd.t, bild, h: meta.height });
}
const zh = Math.max(...kacheln.map(k => k.h));
const reihen = Math.ceil(kacheln.length / SP);
const beschriftung = 24;
const blatt = sharp({ create: { width: SP * BREIT + (SP + 1) * 8, height: reihen * (zh + beschriftung) + 8, channels: 3, background: '#111' } });
const teile = [];
const texte = [];
kacheln.forEach((k, i) => {
  const x = 8 + (i % SP) * (BREIT + 8);
  const y = 8 + Math.floor(i / SP) * (zh + beschriftung);
  teile.push({ input: k.bild, left: x, top: y + beschriftung });
  texte.push(`<text x="${x + 4}" y="${y + 17}" font-family="monospace" font-size="15" fill="#F6EFE6">${k.echt} ms</text>`);
});
const w = SP * BREIT + (SP + 1) * 8, hh = reihen * (zh + beschriftung) + 8;
teile.push({ input: Buffer.from(`<svg width="${w}" height="${hh}">${texte.join('')}</svg>`), left: 0, top: 0 });
await blatt.composite(teile).png().toFile(`.shots/UEBERGANG-${VOR}.png`);
console.log(`.shots/UEBERGANG-${VOR}.png geschrieben:`, kacheln.map(k => k.echt).join(', '), 'ms');
await b.schliessen?.();
process.exit(0);
