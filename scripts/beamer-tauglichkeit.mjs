/**
 * beamer-tauglichkeit.mjs — prueft Entwuerfe gegen die BEAMER-Bedingungen.
 *
 * Anlass (Wolf 2026-08-18, zu zehn Design-Entwuerfen): „es sieht nice aus, aber
 * erfuellt es die Beamer-Bedingungen?" Genau die Frage, und sie ist messbar.
 *
 * ZWEI PRUEFUNGEN, beide noetig, eine allein genuegt nicht:
 *
 * 1. LICHTABGABE. Ein Bild mit hoher mittlerer Leuchtdichte blendet in einem
 *    dunklen Raum koerperlich, egal wie gut es lesbar ist. Gemessen wird die
 *    mittlere relative Leuchtdichte des ganzen Bildes.
 *
 * 2. LESBARKEIT AUS DISTANZ, und zwar der ANTWORTEN, nicht der Frage. Die Frage
 *    ist ueberall gross. Entschieden wird an den Antworten, weil dort die
 *    Entwuerfe leise werden.
 *    Optik wie in scripts/avatar-contact-sheet.mjs: Bild 2.8m breit, Abstand
 *    10m, Aufloesungsvermoegen 1.7 Bogenminuten. Daraus folgt, wie viele
 *    Design-Pixel auf eine gerade noch aufloesbare Stufe fallen.
 *
 * FALLE, die mich 2026-08-18 einmal erwischt hat: den Kontrast NICHT ueber den
 * ganzen Antwortbereich mitteln. Schrift belegt dort nur wenige Prozent der
 * Flaeche, der Rest ist Grund. Gemittelt kommt fuer jeden Entwurf „faellt durch"
 * heraus, auch fuer offensichtlich gut lesbare. Deshalb Extremwert (1./99.
 * Perzentil) gegen den Median, und beide Richtungen pruefen, weil es helle
 * Schrift auf dunklem Grund und dunkle auf hellem gibt.
 *
 * NUTZUNG: node scripts/beamer-tauglichkeit.mjs <bild.png> <x,y,w,h> [name]
 *   Der Bereich ist der ANTWORTBEREICH in Design-Pixeln (1760x990).
 */
import { createRequire } from 'node:module';
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = require('sharp');

const BILD_BREITE_M = Number(process.env.BILD_BREITE_M ?? 2.8);
const ABSTAND_M = Number(process.env.ABSTAND_M ?? 10);
const AUGE_BOGENMIN = Number(process.env.AUGE_BOGENMIN ?? 1.7);
const DESIGN_W = 1760;
const PX_PRO_STUFE = (ABSTAND_M * 1000 * (AUGE_BOGENMIN / 60) * (Math.PI / 180)) / ((BILD_BREITE_M * 1000) / DESIGN_W);
const STUFEN_W = Math.round(DESIGN_W / PX_PRO_STUFE);

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const leucht = (d, p) => 0.2126 * lin(d[p]) + 0.7152 * lin(d[p + 1]) + 0.0722 * lin(d[p + 2]);

const [datei, bereich, name = datei] = process.argv.slice(2);
if (!datei || !bereich) {
  console.error('Nutzung: node scripts/beamer-tauglichkeit.mjs <bild.png> <x,y,w,h> [name]');
  process.exit(1);
}
const [bx, by, bw, bh] = bereich.split(',').map(Number);

// 1) Lichtabgabe
const { data: d1, info: i1 } = await sharp(datei).resize(440).raw().toBuffer({ resolveWithObject: true });
let summe = 0, n = 0;
for (let p = 0; p < d1.length; p += i1.channels) { summe += leucht(d1, p); n++; }
const mittel = summe / n;

// 2) Distanz-Probe, dann Kontrast im Antwortbereich
const klein = await sharp(datei).resize(STUFEN_W, null, { kernel: 'lanczos3' }).png().toBuffer();
const fern = await sharp(klein).resize(DESIGN_W, null, { kernel: 'cubic' })
  .blur(Math.max(0.5, DESIGN_W / STUFEN_W / 2.2)).png().toBuffer();

// Die Distanz-Simulation kann durch das Runden beim Skalieren um einen Pixel
// abweichen. Bereich deshalb auf die echte Bildgroesse klemmen, sonst bricht
// extract() ab (2026-08-18 an S4/P2 passiert).
const fernInfo = await sharp(fern).metadata();
const cx = Math.max(0, Math.min(bx, fernInfo.width - 1));
const cy = Math.max(0, Math.min(by, fernInfo.height - 1));
const cw = Math.max(1, Math.min(bw, fernInfo.width - cx));
const chh = Math.max(1, Math.min(bh, fernInfo.height - cy));
const { data: d2, info: i2 } = await sharp(fern)
  .extract({ left: cx, top: cy, width: cw, height: chh }).raw().toBuffer({ resolveWithObject: true });
const L = [];
for (let p = 0; p < d2.length; p += i2.channels) L.push(leucht(d2, p));
L.sort((a, b) => a - b);
const q = (f) => L[Math.min(L.length - 1, Math.floor(L.length * f))];
const med = q(0.5);
const kontrast = Math.max((q(0.99) + 0.05) / (med + 0.05), (med + 0.05) / (q(0.01) + 0.05));

const blendet = mittel > 0.22 ? 'BLENDET' : mittel > 0.12 ? 'grenzwertig' : 'ok';
const lesbar = kontrast >= 4.5 ? 'traegt sicher' : kontrast >= 3 ? 'traegt' : kontrast >= 2 ? 'grenzwertig' : 'zu schwach';

console.log(`${name}`);
console.log(`  Lichtabgabe   ${(mittel * 100).toFixed(1)}%   ${blendet}`);
console.log(`  Antworten     ${kontrast.toFixed(2)}:1   ${lesbar}   (aus ${ABSTAND_M}m, Bild ${BILD_BREITE_M}m breit)`);
