/* wagerschluss-messen — die Strecke der Wager-Aufloesung bis in den Turm.
 *
 * 2026-08-26 (Wolf: „leider ist auch nach den wager reveals nicht alles clean,
 * nach letztem reveal und punkte vergabe wechselt die view abrupt und
 * unclean").
 *
 * Gemessen werden BILDPUNKTE, nicht Kaesten im DOM - waehrend eines
 * Phasenwechsels ist das DOM vollstaendig, waehrend die Leinwand etwas anderes
 * zeigt. Fuer jeden Klick wird notiert, wie lange danach das Bild dunkel bleibt
 * und wie lange es braucht, bis es wieder steht.
 *
 * NUTZUNG:  node scripts/wagerschluss-messen.mjs [schritte]
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const SCHRITTE = Number(process.argv[2] || 8);
const PAUSE = 2600;      // wie lange nach jedem Klick gemessen wird

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();
await b.zurStation('finalaufloesung'); await sleep(1500);

const cdp = await seite.context().newCDPSession(seite);
let bilder = [];
cdp.on('Page.screencastFrame', async (f) => {
  bilder.push({ t: Date.now(), buf: Buffer.from(f.data, 'base64') });
  try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* Ende */ }
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 76, maxWidth: 560, maxHeight: 315, everyNthFrame: 1 });

async function helligkeit(buf) {
  const st = await sharp(buf).stats();
  const k = st.channels.slice(0, 3);
  return k.reduce((a, c) => a + c.mean, 0) / k.length;
}

const kopf = () => seite.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 46));

const zeilen = [];
let schlimmster = null;
for (let i = 1; i <= SCHRITTE; i++) {
  const vorher = await kopf();
  bilder = [];
  const t0 = Date.now();
  await h.emit('qq:nextQuestion');
  // Waehrend der Aufnahme mitlesen, OB ueberhaupt ein Wechsel laeuft. Ohne das
  // sieht man nur, dass es nicht schwarz ist - nicht, ob ueberblendet wird.
  let wechsel = 0;
  const bis = Date.now() + PAUSE;
  while (Date.now() < bis) {
    try {
      const n = await seite.evaluate(() => document.getAnimations()
        .filter(a => { const e = a.effect; const p = e && 'pseudoElement' in e ? e.pseudoElement : null;
          return !!p && p.startsWith('::view-transition'); }).length);
      if (n > wechsel) wechsel = n;
    } catch { /* Seite beschaeftigt */ }
    await sleep(45);
  }
  const nachher = await kopf();

  const werte = [];
  for (const bd of bilder) werte.push({ t: bd.t - t0, hell: await helligkeit(bd.buf), buf: bd.buf });
  if (!werte.length) { zeilen.push({ i, vorher, nachher, dunkel: null, luecke: null, wechsel }); continue; }

  const hoch = Math.max(...werte.map(w => w.hell));
  const grenze = hoch * 0.45;
  const dunkel = werte.filter(w => w.hell < grenze);
  // Groesste Luecke zwischen zwei Bildern: dort malt der Browser gar nichts.
  let luecke = 0, lueckeBei = 0;
  for (let k = 1; k < werte.length; k++) {
    const d = werte[k].t - werte[k - 1].t;
    if (d > luecke) { luecke = d; lueckeBei = werte[k - 1].t; }
  }
  const eintrag = {
    i, vorher, nachher,
    dunkel: dunkel.length ? { von: dunkel[0].t, bis: dunkel.at(-1).t, n: dunkel.length } : null,
    luecke, lueckeBei,
  };
  eintrag.wechsel = wechsel;
  zeilen.push(eintrag);
  const schwere = (eintrag.dunkel ? eintrag.dunkel.bis - eintrag.dunkel.von : 0) + luecke;
  if (!schlimmster || schwere > schlimmster.schwere) schlimmster = { schwere, werte, i };
}

console.log('\n── Die Strecke, Klick fuer Klick ─────────────────────────────────');
for (const z of zeilen) {
  const d = z.dunkel ? `dunkel ${z.dunkel.bis - z.dunkel.von} ms (ab ${z.dunkel.von})` : 'kein dunkles Bild';
  console.log(`  ${String(z.i).padStart(2)}  ${d.padEnd(28)} Wechsel-Ebenen ${z.wechsel ? 'JA' : 'nein'}   groesste Malpause ${String(z.luecke).padStart(4)} ms`);
  console.log(`      von «${z.vorher}»`);
  console.log(`      nach «${z.nachher}»`);
}

// Vom schlimmsten Schritt ein Kontaktblatt, damit man sieht, was passiert.
if (schlimmster) {
  fs.mkdirSync('.shots', { recursive: true });
  const marken = [0, 150, 300, 450, 600, 800, 1100, 1500, 2000, 2500];
  const gewaehlt = marken.map(m => {
    let best = null;
    for (const w of schlimmster.werte) if (!best || Math.abs(w.t - m) < Math.abs(best.t - m)) best = w;
    return best;
  }).filter(Boolean);
  const BREITE = 380, BES = 20;
  const kacheln = [];
  for (const w of gewaehlt) {
    const bild = await sharp(w.buf).resize(BREITE).toBuffer();
    kacheln.push({ t: w.t, bild, h: (await sharp(bild).metadata()).height });
  }
  const zh = Math.max(...kacheln.map(k => k.h));
  const spalten = 5, reihen = Math.ceil(kacheln.length / spalten);
  const W = spalten * BREITE + (spalten + 1) * 6, H = reihen * (zh + BES) + 6;
  const teile = [], texte = [];
  kacheln.forEach((k, idx) => {
    const sp = idx % spalten, re = Math.floor(idx / spalten);
    const x = 6 + sp * (BREITE + 6), y = 6 + re * (zh + BES);
    teile.push({ input: k.bild, left: x, top: y + BES });
    texte.push(`<text x="${x}" y="${y + 14}" font-family="monospace" font-size="13" fill="#fff">${k.t} ms</text>`);
  });
  const beschriftung = Buffer.from(`<svg width="${W}" height="${H}">${texte.join('')}</svg>`);
  await sharp({ create: { width: W, height: H, channels: 3, background: '#111' } })
    .composite([...teile, { input: beschriftung, left: 0, top: 0 }])
    .png().toFile('.shots/WAGERSCHLUSS.png');
  console.log(`\n.shots/WAGERSCHLUSS.png geschrieben (Schritt ${schlimmster.i})`);
}

await b.schliessen?.();
process.exit(0);
