/* turmsprung-messen — springen die Tuerme, nachdem die Kacheln angekommen sind?
 *
 * 2026-08-26 (Wolf: „wenn die kacheln vom grid auf die tuerme springen gibts
 * einmal so einen sprung von allen tuermen, nachdem alle angekommen sind").
 *
 * Gemessen wird die Lage JEDES Turms (`data-qq-turm`) ueber die ganze Strecke:
 * Oberkante, Hoehe, Mitte. Ein Sprung ist ein Bild, in dem sich alle Tuerme
 * gleichzeitig um mehr als ein paar Bildpunkte verschieben - das unterscheidet
 * ihn vom Wachsen einzelner Tuerme, das ja gewollt ist.
 *
 * NUTZUNG:  node scripts/turmsprung-messen.mjs
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const FENSTER = 6000;
const TAKT = 55;

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();
await b.zurStation('turmfinale');
await sleep(2000);

// Die Station landet auf der Tipp-Aufloesung. Bis zum Turm weiterfahren: der
// Beat, in dem die Kacheln vom Brett auf die Tuerme fliegen, ist der ERSTE
// nach dem Turm-Titel.
const text = () => seite.evaluate(() => document.body.innerText || '');
const TURMTITEL = /Wer baut den höchsten Turm|Who builds the tallest/i;
for (let i = 0; i < 20; i++) {
  if (TURMTITEL.test(await text())) break;
  await h.emit('qq:nextQuestion');
  await sleep(1400);
}
console.log('stehe bei:', (await text()).replace(/\s+/g, ' ').slice(0, 60));
await sleep(1500);

const lesen = () => seite.evaluate(() => {
  const raus = {};
  for (const el of document.querySelectorAll('[data-qq-turm]')) {
    const r = el.getBoundingClientRect();
    raus[el.getAttribute('data-qq-turm') || '?'] = {
      oben: Math.round(r.top), hoehe: Math.round(r.height),
      x: Math.round(r.left + r.width / 2),
    };
  }
  const brett = document.querySelector('[data-qq-brett]');
  const br = brett ? brett.getBoundingClientRect() : null;
  return {
    tuerme: raus,
    brett: br ? { oben: Math.round(br.top), h: Math.round(br.height), o: Number(getComputedStyle(brett).opacity).toFixed(2) } : null,
  };
});

const cdp = await seite.context().newCDPSession(seite);
const bilder = [];
cdp.on('Page.screencastFrame', async (f) => {
  bilder.push({ t: Date.now(), buf: Buffer.from(f.data, 'base64') });
  try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* Ende */ }
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: 620, maxHeight: 349, everyNthFrame: 1 });
await sleep(400);

// ── Der Browser schreibt selbst mit ────────────────────────────────────────
// Jede Ablesung von aussen kostet einen Umweg ueber die Seite, gemessen rund
// 300 ms. Damit lassen sich Spruenge von zwei, drei Bildern gar nicht sehen -
// genau die, um die es hier geht. Also laeuft die Aufzeichnung IN der Seite,
// je Bild, und wird am Ende in einem Stueck abgeholt.
await seite.evaluate(() => {
  const w = globalThis;
  w.__qqTurmSpur = [];
  const t0 = performance.now();
  const schritt = () => {
    const tuerme = {};
    for (const el of document.querySelectorAll('[data-qq-turm]')) {
      const r = el.getBoundingClientRect();
      tuerme[el.getAttribute('data-qq-turm') || '?'] = { oben: Math.round(r.top), hoehe: Math.round(r.height) };
    }
    // Der eigentliche Zeuge: wie viele Lande-Blitze und Fall-Bewegungen laufen
    // in DIESEM Bild gleichzeitig? Blitzen alle Tuerme zusammen, steht hier die
    // Zahl der Tuerme - und genau das ist der Fehler, den Wolf sieht.
    let blitze = 0, faelle = 0;
    for (const a of document.getAnimations()) {
      const n = a.animationName || '';
      if (a.playState !== 'running') continue;
      if (n === 'qqT2Spark') blitze++;
      if (n === 'qqT2Drop') faelle++;
    }
    w.__qqTurmSpur.push({ t: Math.round(performance.now() - t0), tuerme, blitze, faelle });
    if (performance.now() - t0 < 7000) requestAnimationFrame(schritt);
  };
  requestAnimationFrame(schritt);
});

const t0 = Date.now();
bilder.length = 0;
await h.emit('qq:nextQuestion');   // der Beat, in dem die Kacheln fliegen
await sleep(FENSTER);
const spur = await seite.evaluate(() => (globalThis).__qqTurmSpur ?? []);

await cdp.send('Page.stopScreencast');
for (const bd of bilder) bd.t -= t0;

console.log('\n── Die Tuerme, Ablesung fuer Ablesung ────────────────────────');
let vorher = null;
const spruenge = [];
for (const s of spur) {
  const ids = Object.keys(s.tuerme).sort();
  if (!ids.length) continue;
  const zeile = ids.map(id => `${s.tuerme[id].oben}/${s.tuerme[id].hoehe}`).join(' ');
  if (vorher) {
    // Wie viele Tuerme haben sich GLEICHZEITIG bewegt, und um wie viel?
    let bewegt = 0, groesste = 0;
    for (const id of ids) {
      const a = vorher.tuerme[id], c = s.tuerme[id];
      if (!a || !c) continue;
      // Oberkante UND Hoehe: ein Turm, der waechst, verschiebt beides. Ein
      // Sprung des ganzen Feldes verschiebt die Oberkanten gemeinsam, ohne
      // dass die Hoehen sich aendern - daran sind die beiden zu trennen.
      const dOben = Math.abs(c.oben - a.oben);
      const dHoch = Math.abs(c.hoehe - a.hoehe);
      if (dOben > 3 && dHoch <= 3) { bewegt++; groesste = Math.max(groesste, dOben); }
    }
    if (bewegt >= ids.length - 1 && groesste > 4) {
      spruenge.push({ t: s.t, bewegt, groesste, von: ids.length });
    }
  }
  if (zeile !== (vorher ? Object.keys(vorher.tuerme).sort().map(id => `${vorher.tuerme[id].oben}/${vorher.tuerme[id].hoehe}`).join(' ') : null)) {
    console.log(`  ${String(s.t).padStart(5)} ms  ${zeile}`);
  }
  vorher = s;
}

// ── Wo springt das BILD? ──────────────────────────────────────────────────
// Die Turm-Kaesten (`data-qq-turm`) schnappen sofort auf ihre Endhoehe, das
// Wachsen macht eine Animation darin. Wer sie misst, misst also nicht das, was
// auf der Wand passiert. Der Sprung ist etwas, das man SIEHT - deshalb hier
// der Vergleich Bild gegen Bild: mittlere Abweichung je Bildpunkt. Ein Sprung
// ist ein Ausschlag, nachdem die Bewegung zur Ruhe gekommen ist.
{
  const graustufen = [];
  for (const bd of bilder) {
    const { data, info } = await sharp(bd.buf).greyscale().resize(160).raw().toBuffer({ resolveWithObject: true });
    graustufen.push({ t: bd.t, data, n: info.width * info.height });
  }
  const diffs = [];
  for (let i = 1; i < graustufen.length; i++) {
    const a = graustufen[i - 1].data, c = graustufen[i].data;
    let summe = 0;
    for (let k = 0; k < c.length; k++) summe += Math.abs(c[k] - a[k]);
    diffs.push({ t: graustufen[i].t, d: summe / c.length });
  }
  console.log('\n── Bewegung im Bild (mittlere Abweichung je Bildpunkt) ───────');
  for (const d of diffs) {
    const balken = '█'.repeat(Math.min(60, Math.round(d.d * 2)));
    console.log(`  ${String(d.t).padStart(5)} ms  ${d.d.toFixed(2).padStart(6)}  ${balken}`);
  }
}

{
  let maxB = 0, maxBt = 0, maxF = 0, maxFt = 0;
  for (const p of spur) {
    if ((p.blitze ?? 0) > maxB) { maxB = p.blitze; maxBt = p.t; }
    if ((p.faelle ?? 0) > maxF) { maxF = p.faelle; maxFt = p.t; }
  }
  console.log('\n── Gleichzeitige Lande-Bewegungen ────────────────────────────');
  console.log(`  hoechstens ${maxB} Blitze gleichzeitig (bei ${maxBt} ms)`);
  console.log(`  hoechstens ${maxF} Faelle gleichzeitig (bei ${maxFt} ms)`);
  console.log('  Zum Vergleich: acht Tuerme. Alles ab 4 ist ein gemeinsames Blitzen.');
}

console.log('\n── Gemeinsame Spruenge ───────────────────────────────────────');
if (!spruenge.length) console.log('  keiner gefunden');
for (const s of spruenge) {
  console.log(`  ${String(s.t).padStart(5)} ms   ${s.bewegt} von ${s.von} Tuermen bewegen sich gleichzeitig, groesste Verschiebung ${s.groesste} px`);
}

// Kontaktblatt um den ersten Sprung herum.
if (bilder.length) {
  fs.mkdirSync('.shots', { recursive: true });
  // Der Sprung kommt NACH der Landung. Aufgenommen wird deshalb das Fenster
  // dahinter: bei 1775 ms fliegen die Kacheln noch, bei 2429 stehen die ersten
  // Tuerme.
  const marken = spruenge[0]
    ? [-260, -120, -60, 0, 60, 120, 260, 500, 900, 1400].map(d => Math.max(0, spruenge[0].t + d))
    : [2200, 2600, 3000, 3300, 3600, 3900, 4200, 4600, 5100, 5700];
  const gewaehlt = marken.map(m => {
    let best = null;
    for (const bd of bilder) if (!best || Math.abs(bd.t - m) < Math.abs(best.t - m)) best = bd;
    return best;
  }).filter(Boolean);
  const BREITE = 380, BES = 20, kacheln = [];
  for (const bd of gewaehlt) {
    const bild = await sharp(bd.buf).resize(BREITE).toBuffer();
    kacheln.push({ t: bd.t, bild, h: (await sharp(bild).metadata()).height });
  }
  const zh = Math.max(...kacheln.map(k => k.h));
  const spalten = 5, reihen = Math.ceil(kacheln.length / spalten);
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
    .png().toFile('.shots/TURMSPRUNG.png');
  console.log('\n.shots/TURMSPRUNG.png geschrieben');
}
await b.schliessen?.();
process.exit(0);
