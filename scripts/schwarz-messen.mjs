/* schwarz-messen — wie hell ist die Buehne waehrend eines Phasenwechsels?
 *
 * 2026-08-26 (Wolf: „der uebergang von sieger zu danke seite ist nicht clean?").
 *
 * Warum es dieses Werkzeug braucht, obwohl es schon `leere-messen.mjs` gibt:
 * jenes zaehlt KAESTEN IM DOM. Waehrend einer View Transition ist das DOM aber
 * vollstaendig - der Browser zeigt in dieser Zeit nur nicht das DOM, sondern
 * zwei Schnappschuss-Ebenen. Ein DOM-Zaehler meldet dort „alles da", waehrend
 * auf der Leinwand nichts steht. Genau dieser blinde Fleck hat den Befund
 * „nur die Danke-Folie ist betroffen" erzeugt.
 *
 * Deshalb misst dieses Werkzeug BILDPUNKTE: mittlere Helligkeit je Bild aus
 * dem CDP-Screencast. Schwarz ist schwarz, egal was das DOM behauptet.
 *
 * NUTZUNG:
 *   node scripts/schwarz-messen.mjs                  # ein paar Wechsel quer durch den Abend
 *   node scripts/schwarz-messen.mjs frageaufloesung  # nur eine Station
 */
import { createRequire } from 'node:module';
import { buehneStarten, sleep } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

/** Stationen, an denen je ein Schritt weitergeschaltet und gemessen wird. */
const STRECKE = process.argv[2]
  ? [process.argv[2]]
  : ['rundenintro', 'frage', 'frageaufloesung', 'zwischenstand', 'cozydanach'];

const FENSTER = 1600;   // wie lange nach dem Klick aufgenommen wird

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();
const cdp = await seite.context().newCDPSession(seite);

let bilder = [];
cdp.on('Page.screencastFrame', async (f) => {
  bilder.push({ t: Date.now(), buf: Buffer.from(f.data, 'base64') });
  try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* Ende */ }
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: 480, maxHeight: 270, everyNthFrame: 1 });

/** Mittlere Helligkeit 0..255 ueber alle Kanaele. */
async function helligkeit(buf) {
  const st = await sharp(buf).stats();
  const k = st.channels.slice(0, 3);
  return k.reduce((a, c) => a + c.mean, 0) / k.length;
}

for (const station of STRECKE) {
  await b.zurStation(station);
  await sleep(1400);
  bilder = [];
  const t0 = Date.now();
  await h.emit('qq:nextQuestion');
  await sleep(FENSTER);

  const werte = [];
  for (const bd of bilder) werte.push({ t: bd.t - t0, hell: await helligkeit(bd.buf) });
  if (!werte.length) { console.log(`\n${station}: keine Bilder`); continue; }

  // Bezug ist das hellste Bild des Fensters - jede Szene hat ihren eigenen
  // Grundton, ein fester Schwellwert waere auf einer dunklen Folie falsch.
  const hoch = Math.max(...werte.map(w => w.hell));
  const grenze = hoch * 0.45;
  const dunkel = werte.filter(w => w.hell < grenze);
  const von = dunkel[0]?.t ?? null;
  const bis = dunkel.at(-1)?.t ?? null;

  console.log(`\n── ${station} ${'─'.repeat(Math.max(0, 40 - station.length))}`);
  console.log(`  ${werte.length} Bilder, hellstes ${hoch.toFixed(1)}, Grenze ${grenze.toFixed(1)}`);
  console.log('  ' + werte.map(w => `${w.t}:${w.hell.toFixed(0)}`).join('  '));
  console.log(von === null
    ? '  DUNKEL: keine Phase unter der Grenze'
    : `  DUNKEL: ${bis - von} ms (von ${von} bis ${bis} ms)`);
}

await b.schliessen?.();
process.exit(0);
