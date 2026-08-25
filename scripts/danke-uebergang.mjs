/* danke-uebergang — der letzte Schnitt des Abends: Siegerfolie zu Danke.
 *
 * Der Leere-Durchlauf (scripts/leere-messen.mjs) hat hier 1757 ms gemeldet, in
 * denen praktisch nichts auf der Buehne steht. Das ist mit Abstand die groesste
 * Luecke des ganzen Abends und die einzige, die zaehlt.
 *
 * NUTZUNG:
 *   node scripts/danke-uebergang.mjs           # .shots/DANKE-NEU.png
 *   node scripts/danke-uebergang.mjs --alt     # .shots/DANKE-ALT.png
 *
 * Aufgenommen wird ueber CDP-Screencast, nicht ueber `page.screenshot()` in
 * einer Schleife: das kostet auf dieser Buehne rund 570 ms je Bild und der
 * Streifen zeigt dann zwoelfmal den Endzustand.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const VOR = process.argv.includes('--alt') ? 'ALT' : 'NEU';

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
await b.zurStation('cozydanach'); await sleep(700);
await h.springe('final-reveal'); await sleep(900);
const seite = h.seite();

// Bis auf die Siegerfolie vorfahren. Nach jedem Klick warten, BIS sie da ist -
// der Turm haengt an seinen eigenen Beats, und wer schneller taktet, laeuft ihm
// davon (dann steht der Zustand auf THANKS, waehrend der Beamer noch baut).
const daIst = async (muster, hoechstens = 9000) => {
  const bis = Date.now() + hoechstens;
  while (Date.now() < bis) {
    if (muster.test(await seite.evaluate(() => document.body.innerText))) return true;
    await sleep(170);
  }
  return false;
};
const SIEGERFOLIE = /SIEGER DES ABENDS|WINNER OF THE NIGHT/i;
for (let i = 0; i < 26; i++) {
  if (await daIst(SIEGERFOLIE, 300)) break;
  await h.emit('qq:nextQuestion');
  if (await daIst(SIEGERFOLIE)) break;
}
console.log('stehe bei:', await seite.evaluate(() => document.body.innerText.slice(0, 60).replace(/\n/g, ' | ')));
await sleep(1200);   // die Siegerfolie einmal ganz stehen lassen

// Parallel zur Aufnahme messen, WIE VIEL ueberhaupt zu sehen ist. Ein
// Kontaktblatt zeigt, dass es leer ist, aber nicht wie lange genau.
const spur = [];
const spurTakt = setInterval(async () => {
  try {
    const z = await seite.evaluate(() => {
      let kaesten = 0;
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width < 24 || r.height < 24) continue;
        const st = getComputedStyle(el);
        if (st.visibility === 'hidden' || st.display === 'none') continue;
        if (Number(st.opacity) < 0.12) continue;
        kaesten++;
      }
      return { kaesten, text: document.body.innerText.replace(/\s+/g, '').length };
    });
    spur.push({ t: Date.now(), ...z });
  } catch { /* Seite gerade beschaeftigt */ }
}, 60);

const cdp = await seite.context().newCDPSession(seite);
const bilder = [];
cdp.on('Page.screencastFrame', async (f) => {
  bilder.push({ t: Date.now(), buf: Buffer.from(f.data, 'base64') });
  try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* Ende */ }
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 82, maxWidth: 760, maxHeight: 428, everyNthFrame: 1 });
await sleep(500);
const t0 = Date.now();
bilder.length = 0; spur.length = 0;
await h.emit('qq:nextQuestion');   // DER Schnitt
await sleep(4600);
await cdp.send('Page.stopScreencast');
clearInterval(spurTakt);
for (const bd of bilder) bd.t -= t0;
console.log(`${bilder.length} Bilder bis ${bilder.at(-1)?.t} ms`);

const hoch = spur.reduce((a, s) => Math.max(a, s.kaesten), 0);
const grenze = hoch * 0.25;
let von = null, bis = null;
for (const s of spur) {
  if (s.kaesten <= grenze) { if (von === null) von = s.t; bis = s.t; }
  else if (von !== null && bis !== null) break;
}
console.log(`\nFuelle (Kaesten auf der Buehne), Hoechstwert ${hoch}, Grenze ${grenze.toFixed(0)}:`);
let vorher = null;
for (const s of spur) {
  if (s.kaesten === vorher) continue;
  vorher = s.kaesten;
  console.log(`  ${String(s.t - t0).padStart(6)} ms   ${String(s.kaesten).padStart(3)} Kaesten   ${s.text} Zeichen`);
}
console.log(von !== null
  ? `\nLEERE: ${bis - von} ms (ab ${von - t0} ms)`
  : '\nLEERE: keine');

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
// Dicht am Schnitt: die Luecke liegt in der ersten Sekunde.
await blatt([0, 160, 320, 480, 640, 800, 1000, 1200, 1450, 1700, 2000, 2400, 2900, 3500, 4200], 5, 380, `.shots/DANKE-${VOR}.png`);
await b.schliessen?.();
process.exit(0);
