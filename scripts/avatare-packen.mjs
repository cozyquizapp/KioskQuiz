/**
 * avatare-packen — den HD-Satz kleiner machen, ohne dass man es sieht.
 *
 * 2026-08-25 (Wolf: „kannst hd satz komprimieren, solange die qualitaet so
 * bleibt"). Der Satz wiegt 30,3 MB gegen 10,9 MB beim alten.
 *
 * ERSTER VERSUCH, gescheitert und deshalb hier notiert: PNG verlustfrei neu
 * packen (compressionLevel 9, effort 10). Ergebnis 0,0 % gespart, einzelne
 * Dateien wurden sogar 0,2 % groesser. Der Bildgenerator hat also bereits
 * sauber gepackt. Die Bytes sind echt: 1024² mal vier Kanaele mit weichen
 * fotografischen Verlaeufen sind nun mal viel Information.
 *
 * WAS WIRKLICH ZIEHT, und warum in dieser Reihenfolge:
 *
 *   1. WebP verlustfrei. Andere Container, exakt dieselben Pixel. Wolfs
 *      Spezifikation verbietet „WebP mit Qualitaetsverlust", nicht WebP.
 *   2. WebP mit Qualitaetsstufe. Erlaubt nur, wenn der Unterschied bei der
 *      Groesse, in der das Bild WIRKLICH auf der Wand steht, unter der
 *      Wahrnehmungsschwelle liegt.
 *
 * Und darum geht es beim Messen: nicht 1:1 vergleichen, sondern bei der
 * ECHTEN Anzeigegroesse. Der groesste Auftritt im Produkt ist
 * `clamp(200px, 26vw, 380px)` auf der CozyGame-Siegerfolie. Die Buehne ist ein
 * fester 1760er Rahmen, den der Beamer hochskaliert: auf 1080p Faktor 1,09
 * (macht 414 Bildpunkte), auf einem 4K-Panel Faktor 2,18 (macht 828). Deshalb
 * wird gegen 828 gemessen, den ungefaehrlichsten aller schlimmen Faelle.
 *
 * Ausdruecklich NICHT gemacht: herunterskalieren. Bei 828 gebrauchten Punkten
 * ist 1024 nur 24 % Reserve, und 512 waere auf einem 4K-Panel sichtbar weich.
 *
 * NUTZUNG:
 *   node scripts/avatare-packen.mjs            # messen, alle Varianten
 *   node scripts/avatare-packen.mjs --schreib  # WebP schreiben
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const ORDNER = process.argv.slice(2).find(a => !a.startsWith('--')) ?? 'frontend/public/avatars/cozyquiz';
const SCHREIB = process.argv.includes('--schreib');
/** Die Groesse, bei der geurteilt wird. Siehe Kopf. */
const ANZEIGE = 828;

const dateien = fs.readdirSync(ORDNER).filter(f => f.endsWith('.png')).sort();

/**
 * Wie weit liegen zwei Fassungen auseinander, wenn beide so aussehen wie auf
 * der Wand? Also: auf die Teamfarbe gelegt, dann auf Anzeigegroesse gebracht,
 * dann verglichen.
 *
 * ERSTER ANLAUF WAR FALSCH, und der Fehler ist lehrreich: ich habe direkt die
 * RGBA-Werte verglichen und dem verlustfreien WebP damit einen groessten
 * Fehler von 52/255 angehaengt. Verlustfrei kann keinen Fehler haben. Beim
 * Nachsehen 1:1 ohne Skalierung: wo Alpha ueber 8 liegt, ist der Unterschied
 * exakt null - aber UNTER voelliger Durchsichtigkeit schreibt WebP beliebige
 * RGB-Werte hin, weil man sie nicht sieht und sie sich so besser packen. Beim
 * Verkleinern mischt sich dieses unsichtbare RGB in die halbdurchsichtigen
 * Randpixel und erzeugt eine Abweichung, die es auf dem Schirm nie gibt.
 *
 * Deshalb wird jetzt zuerst auf einen Grund gelegt. Danach gibt es keine
 * Durchsichtigkeit mehr, und was verglichen wird, ist genau das, was ein
 * Zuschauer sieht.
 */
async function abstand(a, b, grund) {
  // ZWEI Durchgaenge, und das ist kein Schoenheitsfehler: sharp legt die
  // Reihenfolge seiner Schritte selbst fest, nicht die Aufrufreihenfolge.
  // In einer Kette laeuft `resize` VOR `flatten`, also wieder auf dem Bild mit
  // Alpha - und dann mischt sich das unsichtbare RGB genau so ein wie vorher.
  // Gemessen: in einer Kette 35/255 Unterschied beim verlustfreien WebP, in
  // zwei Durchgaengen 0. Also erst platt machen, Puffer schreiben, dann in
  // einem neuen Durchgang verkleinern.
  const roh = async (q) => {
    const platt = await sharp(q).flatten({ background: grund }).png().toBuffer();
    return sharp(platt)
      .resize(ANZEIGE, ANZEIGE, { fit: 'inside', kernel: 'lanczos3' })
      .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  };
  const [x, y] = await Promise.all([roh(a), roh(b)]);
  const dx = x.data, dy = y.data;
  let max = 0, summe = 0;
  for (let i = 0; i < dx.length; i++) {
    const d = Math.abs(dx[i] - dy[i]);
    if (d > max) max = d;
    summe += d;
  }
  return { max, mittel: +(summe / dx.length).toFixed(3) };
}

// Zwei Gruende, weil die Kachel im Produkt beides sein kann: der dunkle
// Buehnengrund und eine gesaettigte Teamfarbe. Auf Dunkel faellt fast nichts
// auf, auf Farbe am meisten - gemessen wird der schlechtere Fall.
const GRUENDE = [
  { name: 'dunkel',     rgb: { r: 0x1A, g: 0x15, b: 0x26 } },
  { name: 'gesaettigt', rgb: { r: 0xE8, g: 0x47, b: 0x1F } },
];

const varianten = [
  { name: 'webp verlustfrei', endung: '.webp', opt: { lossless: true, effort: 6 } },
  { name: 'webp q95',         endung: '.webp', opt: { quality: 95, alphaQuality: 100, effort: 6 } },
  { name: 'webp q90',         endung: '.webp', opt: { quality: 90, alphaQuality: 100, effort: 6 } },
];

const summen = new Map(varianten.map(v => [v.name, { bytes: 0, max: 0, mittel: 0 }]));
let vorher = 0;
const tmpDir = fs.mkdtempSync('/tmp/packtest-');

for (const f of dateien) {
  const p = path.join(ORDNER, f);
  vorher += fs.statSync(p).size;
  for (const v of varianten) {
    const buf = await sharp(p).webp(v.opt).toBuffer();
    const tmp = path.join(tmpDir, f.replace('.png', '') + v.name.replace(/\W/g, '') + v.endung);
    fs.writeFileSync(tmp, buf);
    const s = summen.get(v.name);
    s.bytes += buf.length;
    for (const g of GRUENDE) {
      const d = await abstand(p, tmp, g.rgb);
      s.max = Math.max(s.max, d.max);
      s.mittel = Math.max(s.mittel, d.mittel);
    }
    fs.unlinkSync(tmp);
  }
}
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(`${dateien.length} Dateien, ${(vorher / 1048576).toFixed(2)} MB als PNG.`);
console.log(`Beurteilt bei ${ANZEIGE} px, der groessten echten Anzeigegroesse.\n`);
console.log('Gemessen wird der schlechtere der beiden Gruende, dunkel und gesaettigt.\n');
console.log('Variante            Groesse   gespart   groesster Fehler   schlimmster Schnitt');
for (const v of varianten) {
  const s = summen.get(v.name);
  console.log(
    `${v.name.padEnd(18)} ${(s.bytes / 1048576).toFixed(2).padStart(6)} MB` +
    `  ${((1 - s.bytes / vorher) * 100).toFixed(1).padStart(6)} %` +
    `  ${String(s.max).padStart(14)}/255` +
    `  ${s.mittel.toFixed(3).padStart(14)}/255`,
  );
}
console.log('\nZur Einordnung: ein Unterschied von 1/255 pro Kanal ist auf einem');
console.log('Beamer in einem dunklen Raum nicht sichtbar. Ab etwa 3/255 faengt es an.');

if (SCHREIB) {
  const wahl = process.argv.find(a => a.startsWith('--variante='))?.split('=')[1] ?? 'webp verlustfrei';
  const v = varianten.find(x => x.name === wahl);
  if (!v) { console.error(`Unbekannte Variante: ${wahl}`); process.exit(1); }
  for (const f of dateien) {
    const p = path.join(ORDNER, f);
    const buf = await sharp(p).webp(v.opt).toBuffer();
    fs.writeFileSync(p.replace(/\.png$/, '.webp'), buf);
  }
  console.log(`\n${dateien.length} WebP geschrieben (${wahl}). Die PNG bleiben liegen.`);
}
