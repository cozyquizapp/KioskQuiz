/* rennen-messen — das Ausscheidungsrennen am Ende des Turm-Finales aufnehmen.
   Wer steht wann noch, wo, und wie hoch?

   NUTZUNG:  node scripts/rennen-messen.mjs

   Gemessen wird am Baum, nicht auf dem Kontaktblatt: `data-qq-turm` und
   `data-qq-platz` haengen an den Turm-Kaesten, dazu die Zahl im Sockel. Auf
   einem 300-Pixel-Bild sieht man weder, ob ein Turm absinkt, noch ob die
   anderen nachruecken. Das Kontaktblatt kommt trotzdem mit - es zeigt, ob das
   Bild als Ganzes stimmt. */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
await b.zurStation('turmfinale'); await sleep(900);
const seite = h.seite();

// Bis zum ersten Renn-Beat vorfahren. Nach jedem Klick warten, BIS die Folie
// da ist - der Turm haengt an seinen eigenen Beats, und wer schneller taktet,
// laeuft ihm davon.
const wartetAuf = async (muster, hoechstens = 5000) => {
  const bis = Date.now() + hoechstens;
  while (Date.now() < bis) {
    if (muster.test(await seite.evaluate(() => document.body.innerText))) return true;
    await sleep(180);
  }
  return false;
};
const RENNEN = /jetzt die Tipps|now the bets/;
for (let i = 0; i < 30; i++) {
  if (await wartetAuf(RENNEN, 300)) break;
  await h.emit('qq:nextQuestion');
  if (await wartetAuf(RENNEN)) break;
}
console.log('stehe bei:', await seite.evaluate(() => document.body.innerText.slice(0, 60).replace(/\n/g, ' | ')));

// Alle 80 ms ablesen, wer noch steht, wo und wie hoch.
const spur = [];
const spurTakt = setInterval(async () => {
  try {
    const z = await seite.evaluate(() => Array.from(document.querySelectorAll('[data-qq-turm]')).map(el => {
      const r = el.getBoundingClientRect();
      const zahl = el.querySelector('div:last-child > div:first-child')?.textContent?.trim() ?? '';
      return {
        platz: Number(el.getAttribute('data-qq-platz')),
        x: Math.round(r.left + r.width / 2),
        deck: Number(getComputedStyle(el).opacity).toFixed(2),
        hoch: zahl,
      };
    }));
    spur.push({ t: Date.now(), z });
  } catch { /* Seite gerade beschaeftigt */ }
}, 80);

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
// Vier Renn-Beats, danach die Siegerfolie. Grosszuegig getaktet, damit jeder
// Beat wirklich durchlaeuft.
for (let i = 0; i < 5; i++) { await h.emit("qq:nextQuestion"); await sleep(7000); }
await cdp.send('Page.stopScreencast');
clearInterval(spurTakt);
for (const bd of bilder) bd.t -= t0;
console.log(`${bilder.length} Bilder bis ${bilder.at(-1)?.t} ms`);

console.log('\nWer steht noch, und wie hoch (nur Zeilen, in denen sich etwas aendert):');
let vorher = null;
for (const s of spur) {
  const sichtbar = s.z.filter(e => Number(e.deck) > 0.05).sort((a, c) => a.platz - c.platz);
  const zeile = sichtbar.map(e => `${e.platz}:${e.hoch}@${e.x}`).join(' ');
  if (zeile === vorher) continue;
  vorher = zeile;
  console.log(`  ${String(s.t - t0).padStart(6)} ms  (${sichtbar.length})  ${zeile}`);
}

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
await blatt(Array.from({ length: 24 }, (_, i) => i * 1500), 6, 300, '.shots/RENNEN.png');
await b.schliessen?.();
process.exit(0);
