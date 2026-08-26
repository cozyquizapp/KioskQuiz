/* finale-zwei-messen — was passiert eigentlich zwischen Platz 2 und Platz 1?
 *
 * 2026-08-26 (Wolf: „das finale zwischen platz 1 und 2 ist etwas langweilig").
 *
 * Bevor daran etwas gebaut wird, muss man es sehen. Das Rennen kippt Team fuer
 * Team von hinten heraus; die letzten beiden Beats sind der Grund, warum
 * ueberhaupt jemand bis zum Ende zuschaut - und sie laufen bisher nach genau
 * demselben Muster wie Platz 8: Fenster auf, Turm sinkt, weiter.
 *
 * Aufgenommen wird deshalb nicht das Ergebnis, sondern der WEG dorthin:
 *
 *   1. Ab wann stehen nur noch zwei Tuerme? (`data-qq-turm` zaehlen)
 *   2. Was aendert sich in den beiden letzten Beats ueberhaupt am Bild?
 *      Bild gegen Bild, mittlere Abweichung je Bildpunkt. Ein Beat, in dem
 *      sich nichts bewegt, ist der gemessene Ausdruck von „langweilig".
 *   3. Ein Kontaktblatt, damit man die Beats nebeneinander sieht statt sich
 *      an sie zu erinnern.
 *
 * NUTZUNG:  node scripts/finale-zwei-messen.mjs
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();
await b.zurStation('turmfinale');
await sleep(2000);

const lage = () => seite.evaluate(() => ({
  tuerme: document.querySelectorAll('[data-qq-turm]').length,
  ansage: document.querySelector('[data-qq-ansage]')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
  krone: !!document.querySelector('[data-qq-krone]'),
  text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 60),
}));

// ── Bis kurz vor Schluss vorfahren ────────────────────────────────────────
console.log('\n── Der Weg bis zu den letzten beiden ─────────────────────────');
let vorher = null;
for (let i = 0; i < 30; i++) {
  const l = await lage();
  if (JSON.stringify(l) !== JSON.stringify(vorher)) {
    console.log(`  Beat ${String(i).padStart(2)}: ${l.tuerme} Tuerme` +
      (l.ansage ? `  · Fenster: ${l.ansage}` : '') +
      (l.krone ? '  · KRONE' : ''));
    vorher = l;
  }
  if (l.tuerme > 0 && l.tuerme <= 3) break;
  await h.emit('qq:nextQuestion');
  await sleep(1300);
}

// ── Ab hier mitschneiden ──────────────────────────────────────────────────
const cdp = await seite.context().newCDPSession(seite);
const bilder = [];
cdp.on('Page.screencastFrame', async (f) => {
  bilder.push({ t: Date.now(), buf: Buffer.from(f.data, 'base64') });
  try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* Ende */ }
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 76, maxWidth: 700, maxHeight: 394, everyNthFrame: 1 });
await sleep(400);

const t0 = Date.now();
bilder.length = 0;
const marken = [];
// Drei Beats: Platz 3 raus, Platz 2 raus, Kroenung. Jeder bekommt Zeit zum
// Stehen, damit die Messung nicht die Wartezeit des naechsten Klicks misst.
for (let k = 0; k < 3; k++) {
  const l = await lage();
  marken.push({ t: Date.now() - t0, was: `Beat ${k}: ${l.tuerme} Tuerme${l.ansage ? ' · ' + l.ansage : ''}${l.krone ? ' · KRONE' : ''}` });
  await h.emit('qq:nextQuestion');
  await sleep(4200);
}
const l = await lage();
marken.push({ t: Date.now() - t0, was: `Ende: ${l.tuerme} Tuerme${l.krone ? ' · KRONE' : ''} · ${l.text}` });
await cdp.send('Page.stopScreencast');
for (const bd of bilder) bd.t -= t0;

console.log('\n── Die Beats ─────────────────────────────────────────────────');
for (const m of marken) console.log(`  ${String(m.t).padStart(6)} ms  ${m.was}`);

// ── Wie viel bewegt sich? ─────────────────────────────────────────────────
const grau = [];
for (const bd of bilder) {
  const { data } = await sharp(bd.buf).greyscale().resize(150).raw().toBuffer({ resolveWithObject: true });
  grau.push({ t: bd.t, data });
}
console.log('\n── Bewegung im Bild (mittlere Abweichung je Bildpunkt) ───────');
console.log('   Ein Balken je 200 ms. Leere Zeilen sind Stillstand.');
const eimer = new Map();
for (let i = 1; i < grau.length; i++) {
  const a = grau[i - 1].data, c = grau[i].data;
  let s = 0;
  for (let k = 0; k < c.length; k++) s += Math.abs(c[k] - a[k]);
  const d = s / c.length;
  const eimerNr = Math.floor(grau[i].t / 200);
  eimer.set(eimerNr, Math.max(eimer.get(eimerNr) ?? 0, d));
}
const nummern = [...eimer.keys()].sort((a, z) => a - z);
for (const n of nummern) {
  const d = eimer.get(n);
  const ms = n * 200;
  const marke = marken.find(m => Math.abs(m.t - ms) < 200);
  const balken = '█'.repeat(Math.min(52, Math.round(d * 1.6)));
  console.log(`  ${String(ms).padStart(6)} ms  ${d.toFixed(1).padStart(5)}  ${balken}${marke ? '   ← ' + marke.was : ''}`);
}

// ── Kontaktblatt ──────────────────────────────────────────────────────────
if (bilder.length) {
  fs.mkdirSync('.shots', { recursive: true });
  const wunsch = [];
  for (let ms = 0; ms <= (bilder.at(-1)?.t ?? 0); ms += 1300) wunsch.push(ms);
  const gewaehlt = wunsch.map(m => {
    let best = null;
    for (const bd of bilder) if (!best || Math.abs(bd.t - m) < Math.abs(best.t - m)) best = bd;
    return best;
  }).filter(Boolean);
  const BREITE = 400, BES = 20, kacheln = [];
  for (const bd of gewaehlt) {
    const bild = await sharp(bd.buf).resize(BREITE).toBuffer();
    kacheln.push({ t: bd.t, bild, h: (await sharp(bild).metadata()).height });
  }
  const zh = Math.max(...kacheln.map(k => k.h));
  const spalten = 4, reihen = Math.ceil(kacheln.length / spalten);
  const W = spalten * BREITE + (spalten + 1) * 6, H = reihen * (zh + BES) + 6;
  const teile = [], texte = [];
  kacheln.forEach((k, i) => {
    const sp = i % spalten, re = Math.floor(i / spalten);
    const x = 6 + sp * (BREITE + 6), y = 6 + re * (zh + BES);
    teile.push({ input: k.bild, left: x, top: y + BES });
    texte.push(`<text x="${x}" y="${y + 14}" font-family="monospace" font-size="13" fill="#fff">${k.t} ms</text>`);
  });
  await sharp({ create: { width: W, height: H, channels: 3, background: '#111' } })
    .composite([...teile, { input: Buffer.from(`<svg width="${W}" height="${H}">${texte.join('')}</svg>`), left: 0, top: 0 }])
    .png().toFile('.shots/FINALE-ZWEI.png');
  console.log('\n.shots/FINALE-ZWEI.png geschrieben');
}

await b.schliessen?.();
process.exit(0);
