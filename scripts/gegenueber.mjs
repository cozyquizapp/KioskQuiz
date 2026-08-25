/* gegenueber — zwei Kontaktblaetter zu einem Vorher-Nachher stapeln.
   Damit man denselben Moment vergleicht und nicht zwei Blaetter nebeneinander
   legen und im Kopf ausrichten muss.

   NUTZUNG:
     node scripts/gegenueber.mjs .shots/X-ALT.png .shots/X-NEU.png \
       --spalten=4 --breite=340 --hoehe=382 --kacheln=0,1,2,3 \
       --ziel=.shots/X-vergleich.png

   `spalten`, `breite` und `hoehe` sind die Masse der Kacheln IM Blatt, also
   genau die Werte, mit denen das messende Skript es gebaut hat. Sie stehen
   dort als Konstanten (SP, BREIT, und die Hoehe ergibt sich aus dem
   Seitenverhaeltnis der Aufnahme). `kacheln` sind die Positionen, die
   uebernommen werden sollen, gezaehlt ab null. */
import { createRequire } from 'node:module';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const [altDatei, neuDatei] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const flagge = (n, s) => {
  const v = process.argv.find(a => a.startsWith(`--${n}=`))?.split('=')[1];
  return v === undefined ? s : v;
};
const SP = Number(flagge('spalten', 4));
const B = Number(flagge('breite', 340));
const H = Number(flagge('hoehe', 382));
const RAND = 8, BES = 24;
const kacheln = String(flagge('kacheln', '0,1,2,3')).split(',').map(Number);
const ziel = flagge('ziel', '.shots/vergleich.png');

// Mitgeschnitten wird die Beschriftungszeile DARUEBER, nicht nur das Bild.
// Die beiden Laeufe treffen die Marken nie auf die Millisekunde genau, und ein
// Vergleich, bei dem nicht dabeisteht, wann welches Bild entstand, laedt genau
// zu dem Fehlschluss ein, den er ausraeumen soll.
const schnitt = (datei, i) => sharp(datei).extract({
  left: RAND + (i % SP) * (B + RAND),
  top: RAND + Math.floor(i / SP) * (H + BES),
  width: B, height: H + BES,
}).toBuffer();

const ZB = 74;   // Platz links fuer die Beschriftung der beiden Reihen
const w = ZB + kacheln.length * (B + RAND);
const hh = 2 * (H + BES) + 2 * RAND + 8;
const teile = [], texte = [];
for (let s = 0; s < kacheln.length; s++) {
  const i = kacheln[s];
  teile.push({ input: await schnitt(altDatei, i), left: ZB + s * (B + RAND), top: RAND });
  teile.push({ input: await schnitt(neuDatei, i), left: ZB + s * (B + RAND), top: RAND + H + BES + 8 });
}
texte.push(`<text x="8" y="${RAND + BES + H / 2}" font-family="system-ui" font-size="20" font-weight="800" fill="#8A7FA8">vorher</text>`);
texte.push(`<text x="8" y="${RAND + BES + H + BES + 8 + H / 2}" font-family="system-ui" font-size="20" font-weight="800" fill="#F6EFE6">nachher</text>`);
teile.push({ input: Buffer.from(`<svg width="${w}" height="${hh}">${texte.join('')}</svg>`), left: 0, top: 0 });
await sharp({ create: { width: w, height: hh, channels: 3, background: '#0E0C16' } })
  .composite(teile).png().toFile(ziel);
console.log('->', ziel, w, hh);
