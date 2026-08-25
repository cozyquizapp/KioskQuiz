/* duell-messen — die Schluss-Choreo des Turm-Finales aufnehmen.
   Podest, Wettklettern, Abtritt des Dritten, Duell, Kroenung.

   NUTZUNG:
     node scripts/duell-messen.mjs         # .shots/DUELL-NEU.png
     node scripts/duell-messen.mjs --alt   # .shots/DUELL-ALT.png

   Aufgenommen wird als Bildstrom ueber das Chrome-Protokoll. `page.screenshot`
   kostet auf dieser Buehne rund 900 ms und ist fuer Bewegung unbrauchbar.
   Getaktet wird von Hand mit festem Abstand, damit beide Laeufe vergleichbar
   sind - der Autoplay haette je nach Brett andere Wartezeiten. */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const VOR = process.argv.includes('--alt') ? 'ALT' : 'NEU';
const TAKT = 4200;   // Abstand zwischen zwei Beats
const BEATS = 5;     // Podest, Platz 3, Platz 2, Sieger, Kroenung

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
await b.zurStation('turmfinale'); await sleep(900);
await h.springe('final-reveal'); await sleep(900);
const seite = h.seite();

// Bis zum Podest-Beat vorfahren („Die Top 3 stehen fest…").
//
// ⚠️ NICHT schnell durchklicken. Der Turm haengt an seinen eigenen Beats: eine
// Award-Zeremonie braucht rund drei Sekunden, und wer schneller taktet, laeuft
// dem Turm davon - der Zustand stand beim ersten Anlauf schon auf THANKS,
// waehrend der Beamer noch Bausteine setzte. Deshalb nach jedem Klick warten,
// BIS die Folie da ist, und nicht eine feste Zeit.
const wartetAuf = async (muster, hoechstens = 4000) => {
  const bis = Date.now() + hoechstens;
  while (Date.now() < bis) {
    if (muster.test(await seite.evaluate(() => document.body.innerText))) return true;
    await sleep(180);
  }
  return false;
};
const PODEST = /Top 3 stehen fest|Top 3 are set/;
for (let i = 0; i < 30; i++) {
  if (await wartetAuf(PODEST, 300)) break;
  await h.emit('qq:nextQuestion');
  if (await wartetAuf(PODEST)) break;
}
console.log('stehe bei:', await seite.evaluate(() => document.body.innerText.slice(0, 44).replace(/\n/g, ' | ')));

// ── Die Messung am Baum ───────────────────────────────────────────────────
// Ein Kontaktblatt zeigt, DASS ein Turm verschwindet, nicht WIE. Deshalb wird
// parallel zur Aufnahme alle 60 ms abgelesen, wo die Kaesten der Finalisten
// stehen und wie durchsichtig sie sind. Die Kennungen dafuer haengen am
// Turm-Kasten (`data-qq-turm`, `data-qq-platz`).
const spur = [];
const spurTakt = setInterval(async () => {
  try {
    const z = await seite.evaluate(() => Array.from(document.querySelectorAll('[data-qq-turm]')).map(el => {
      const r = el.getBoundingClientRect();
      return {
        platz: Number(el.getAttribute('data-qq-platz')),
        y: Math.round(r.bottom),
        deck: Number(getComputedStyle(el).opacity).toFixed(2),
      };
    }));
    spur.push({ t: Date.now(), z });
  } catch { /* Seite gerade beschaeftigt */ }
}, 60);

const cdp = await seite.context().newCDPSession(seite);
const bilder = [];
cdp.on('Page.screencastFrame', async (f) => {
  bilder.push({ t: Date.now(), buf: Buffer.from(f.data, 'base64') });
  try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* Ende */ }
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: 660, maxHeight: 371, everyNthFrame: 1 });
await sleep(500);
const t0 = Date.now();
bilder.length = 0;
for (let i = 0; i < BEATS; i++) { await h.emit('qq:nextQuestion'); await sleep(TAKT); }
await cdp.send('Page.stopScreencast');
clearInterval(spurTakt);
for (const bd of bilder) bd.t -= t0;
console.log(`${bilder.length} Bilder bis ${bilder.at(-1)?.t} ms`);

// Der Abtritt des Dritten in Zahlen: Unterkante und Deckkraft ueber die Zeit.
// Nur die Zeilen, in denen sich etwas aendert.
console.log('\nPlatz 3 (Unterkante in Bildpunkten, Deckkraft):');
let vorher = null;
for (const s of spur) {
  const e = s.z.find(x => x.platz === 2);
  if (!e) continue;
  const zeile = `${e.y} ${e.deck}`;
  if (zeile === vorher) continue;
  vorher = zeile;
  console.log(`  ${String(s.t - t0).padStart(6)} ms   unten ${String(e.y).padStart(4)}   Deckkraft ${e.deck}`);
}

fs.mkdirSync('.shots', { recursive: true });

/** Ein Kontaktblatt aus den Bildern, die den Marken am naechsten liegen. */
async function blatt(marken, spalten, breite, datei) {
  const gewaehlt = marken.map(m => {
    let best = null;
    for (const bd of bilder) if (!best || Math.abs(bd.t - m) < Math.abs(best.t - m)) best = bd;
    return best;
  }).filter(Boolean);
  const BES = 22;
  const kacheln = [];
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
  await sharp({ create: { width: w, height: hh, channels: 3, background: '#111' } })
    .composite(teile).png().toFile(datei);
  console.log(`${datei} geschrieben`);
}

// Zwei Blaetter: der ganze Ablauf im Ueberblick, und der Abtritt des Dritten
// gross. Auf 300 px erkennt man nicht, ob ein Turm absinkt oder ausblendet.
await blatt(Array.from({ length: 21 }, (_, i) => i * 1000), 7, 300, `.shots/DUELL-${VOR}.png`);
// Der Abtritt selbst, dicht: er dauert unter einer Sekunde, und ob ein Turm
// absinkt oder einfach verschwindet, entscheidet sich in diesen Bildern.
await blatt([4400, 4700, 4900, 5100, 5300, 5500, 5700, 6100], 4, 520, `.shots/DUELL-${VOR}-lupe.png`);
await b.schliessen?.();
process.exit(0);
