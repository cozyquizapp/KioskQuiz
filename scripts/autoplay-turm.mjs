/* autoplay-turm — den Turmbau so aufnehmen, wie der Autoplay ihn spielt.
   Wolf: „im autoplay wird turmbauen geskipped".

   Der Harness taktet sonst selbst ueber den Socket. Der Autoplay ist aber
   etwas anderes: er sitzt im MODERATOR und schickt `qq:nextQuestion` nach
   festen Wartezeiten (Turm-Beat 0 bekommt sechs Sekunden). Ein Lauf, der von
   Hand taktet, kann den Fehler also gar nicht zeigen.

   Deshalb: Raum wie ueblich aufbauen und zur Final-Aufloesung springen, dann
   eine zweite Seite als Moderator dazuhaengen, dort den Autoplay einschalten
   und ihn ab da allein weiterschalten lassen. Aufgenommen wird der Beamer.

   NUTZUNG: node scripts/autoplay-turm.mjs
*/
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep, BASE } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
await b.zurStation('turmfinale'); await sleep(900);
await h.springe('final-reveal'); await sleep(900);
const seite = h.seite();

// Zweite Seite: der Moderator mit eingeschaltetem Autoplay.
//
// ⚠️ NICHT `/moderator-test` nehmen. Der Test-Modus setzt den Raum beim Oeffnen
// EINMAL auf LOBBY zurueck, wenn kein `run=1` in der Adresse steht (bewusst so,
// damit ein Reload nicht in einem halben Spiel landet). Der Raum, den man
// gerade aufgebaut hat, ist damit weg. `/moderator` laesst ihn stehen und hat
// denselben Autoplay.
// Ohne `run=1`, denn
// das wuerde das Spiel von vorne aufsetzen - wir wollen genau hier weiterlaufen.
const mod = await b.ctx.newPage();
await mod.addInitScript(() => { try { localStorage.setItem('qqAutoplayMode', '1'); } catch { /* egal */ } });
await mod.goto(`${BASE}/moderator`, { waitUntil: 'domcontentloaded' });
await sleep(4000);
console.log('Moderator steht bei Phase', await mod.evaluate(() => document.body.innerText.slice(0, 40).replace(/\n/g, ' ')));

const cdp = await seite.context().newCDPSession(seite);
const bilder = [];
cdp.on('Page.screencastFrame', async (f) => {
  bilder.push({ t: Date.now(), buf: Buffer.from(f.data, 'base64') });
  try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch { /* Ende */ }
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: 660, maxHeight: 371, everyNthFrame: 1 });

// Warten, bis der Autoplay die Tipp-Folien durch hat und der Turm auftaucht.
let turmAb = 0;
for (let i = 0; i < 120; i++) {
  const txt = await seite.evaluate(() => document.body.innerText);
  if (/höchsten Turm/.test(txt)) { turmAb = Date.now(); break; }
  await sleep(500);
}
if (!turmAb) { console.error('Turm kam nie.'); process.exit(1); }
// 2026-08-25: aus 14 s wurden 80 s. Das Finale ist seit dem Rennen und der
// laengeren Award-Zeremonie deutlich laenger, und genau die Beats am Ende sind
// die, die zuletzt verlorengingen. Parallel wird die Ueberschrift mitgelesen -
// ein Kontaktblatt zeigt, WIE es aussieht, aber nicht, ob eine Stufe fehlt.
console.log('Turm ist da. Jetzt 80 Sekunden mitschneiden.');
const folge = [];
const folgeTakt = setInterval(async () => {
  try {
    const txt = await seite.evaluate(() => document.body.innerText.split('\n').filter(Boolean).slice(0, 2).join(' | '));
    if (folge.at(-1)?.txt !== txt) folge.push({ t: Date.now(), txt });
  } catch { /* Seite beschaeftigt */ }
}, 250);
await sleep(80000);
clearInterval(folgeTakt);
await cdp.send('Page.stopScreencast');
const zeit = [];
for (const bd of bilder) { bd.t -= turmAb; if (bd.t >= -600) zeit.push(bd); }
console.log(`${zeit.length} Bilder von ${zeit[0]?.t} bis ${zeit.at(-1)?.t} ms`);
console.log('\nWas der Autoplay zeigt, Stufe fuer Stufe:');
for (const f of folge) console.log(`  ${String(f.t - turmAb).padStart(7)} ms  ${f.txt}`);

// Alle 600 ms ein Bild, damit man den ganzen Ablauf sieht statt eines Ausschnitts.
fs.mkdirSync('.shots', { recursive: true });
const MARKEN = Array.from({ length: 30 }, (_, i) => i * 2700);
const gewaehlt = MARKEN.map(m => {
  let best = null;
  for (const bd of zeit) if (!best || Math.abs(bd.t - m) < Math.abs(best.t - m)) best = bd;
  return best;
}).filter(Boolean);

const SP = 6, B = 300, BES = 22;
const kacheln = [];
for (const bd of gewaehlt) {
  const bild = await sharp(bd.buf).resize(B).toBuffer();
  kacheln.push({ t: bd.t, bild, h: (await sharp(bild).metadata()).height });
}
const zh = Math.max(...kacheln.map(k => k.h));
const reihen = Math.ceil(kacheln.length / SP);
const w = SP * B + (SP + 1) * 6, hh = reihen * (zh + BES) + 6;
const teile = [], texte = [];
kacheln.forEach((k, i) => {
  const x = 6 + (i % SP) * (B + 6);
  const y = 6 + Math.floor(i / SP) * (zh + BES);
  teile.push({ input: k.bild, left: x, top: y + BES });
  texte.push(`<text x="${x + 3}" y="${y + 16}" font-family="monospace" font-size="14" fill="#F6EFE6">${k.t} ms</text>`);
});
teile.push({ input: Buffer.from(`<svg width="${w}" height="${hh}">${texte.join('')}</svg>`), left: 0, top: 0 });
await sharp({ create: { width: w, height: hh, channels: 3, background: '#111' } })
  .composite(teile).png().toFile('.shots/AUTOPLAY-TURM.png');
console.log('.shots/AUTOPLAY-TURM.png geschrieben');
await b.schliessen?.();
process.exit(0);
