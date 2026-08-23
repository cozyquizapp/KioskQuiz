/**
 * repair-avatar-alpha.mjs — repariert zwei Fehler in den Avatar-PNGs.
 *
 * Anlass (Wolf 2026-08-23): „bei rot kamera und wizard hut haben die emojis
 * auch Flecken" und „bei candle ist irgendwas links im bild, rueckstaende
 * eines alten nachbaremojis vermute ich".
 *
 * Beides bestaetigt, beides messbar:
 *
 * 1) FLECKEN = halbdurchsichtige Stellen MITTEN im Motiv. Der Alphakanal hat
 *    dort Loecher, wo volle Deckung sein muesste. Auf einer Kachel scheint die
 *    Kachelfarbe durch, also sieht man auf Rot rote Flecken, auf Gruen gruene.
 *    Deshalb faellt es genau dann auf, wenn Motiv und Kachel sich beissen.
 *    Gemessen: 21 von 48 Motiven betroffen, Kamera 14.8 % der Motivflaeche,
 *    Kassette 9.5 %, Fernglas 9.0 %, Wuerfel 6.6 %.
 *
 *    Reparatur: von den Bildraendern durch alles fluten, was nicht voll deckt.
 *    Was danach NICHT geflutet ist, liegt innen. Innenliegende Pixel mit
 *    Teil-Alpha werden voll deckend gemacht.
 *    Zwei Dinge bleiben dabei ausdruecklich unangetastet:
 *      * die Kante selbst (sie ist von aussen erreichbar) — sonst waere das
 *        Motiv hart ausgeschnitten und flimmert beim Skalieren;
 *      * echte Loecher (Kaeseloecher, Donutloch, Daumenloch der Palette).
 *        Die sind VOLL transparent, nicht teilweise, und werden per
 *        `ALPHA_LOCH` verschont.
 *
 * 2) RUECKSTAENDE = losgeloeste Splitter von einem Nachbarmotiv, die beim
 *    Zerschneiden der Liefer-Tafel mitgekommen sind. Erkennbar an: winzig
 *    gegen das Hauptmotiv UND entweder sehr schmal-lang ODER am Bildrand
 *    klebend.
 *    Die Signatur ist bewusst eng: das Motiv-Set hat auch LEGITIME abgeloeste
 *    Teile (die untere Wolkenlage 329x67, ein Sonnen-Element 93x93, die
 *    Zipfel von Socke und Schneeflocke). Die duerfen nicht mit weg.
 *    Gemessen greift die Regel bei genau zwei Dateien: candle (5x37 am linken
 *    Rand) und paint-palette (4x21, klebt an x=0).
 *
 * Die Originale liegen in Git. Wer zurueck will: `git checkout` auf den Ordner.
 *
 * NUTZUNG:
 *   node scripts/repair-avatar-alpha.mjs           # nur berichten
 *   node scripts/repair-avatar-alpha.mjs --write   # reparieren
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const DIR = 'frontend/public/avatars/cozyquiz';
const WRITE = process.argv.includes('--write');

const ALPHA_VOLL = 240;   // ab hier gilt ein Pixel als deckend
const ALPHA_LOCH = 20;    // darunter gilt es als echtes Loch und bleibt
// Grenze fuer die Flutung von aussen.
//
// 2026-08-23, ZWEIMAL falsch gemacht und deshalb ausfuehrlich:
// Der Reiz ist, sie zu senken (ich hatte 60), weil dann auch breitflaechige
// Durchsicht als „innen" gilt und gefuellt wird — Hutfalte und Gestrick gehen
// damit zu. Der Preis ist aber der EIGENSCHATTEN: ein weicher Schatten hat
// einen Kern mit Alpha weit ueber 60, der von aussen dann nicht mehr
// erreichbar ist. Er wird mitgefuellt und aus dem Verlauf wird eine harte
// dunkle Kante. Gemessen an der Socke: von 35 141 Pixeln, die dabei deckend
// wurden, waren 33 764 dunkel — 96 % Schatten.
// Also zurueck auf 240: gefuellt wird nur, was RINGSUM von deckendem Material
// eingeschlossen ist. Das erwischt die 21 Motive mit echten Alpha-Loechern und
// laesst Schatten und Kanten in Ruhe.
// Was dadurch NICHT repariert wird (Gestrick der Socke, Falte im Hut), ist im
// Motiv so GEZEICHNET und gehoert in eine neue Ausgabe der Datei, nicht in ein
// Skript.
const ALPHA_FLUT = 240;
const SPLITTER_ANTEIL = 0.005;  // Rueckstand ist winzig gegen das Hauptmotiv
const SPLITTER_SCHLANK = 4;     // ... und deutlich schmal-lang
// 2026-08-23, am Probelauf nachgezogen: ohne Untergrenze griff die Regel bei
// 44 von 48 Dateien und fasste 1x3- und 3x1-Kruemel an. Das sind Reste der
// Kantenglaettung, kein Nachbarmotiv. Sie zu loeschen waere harmlos, sie als
// „Rueckstand" zu melden waere gelogen. Untergrenze 60 px, und Schlankheit 4
// statt 3 — damit bleibt z.B. der 22x6-Strich im Papierboot (Verhaeltnis 3.7)
// unangetastet, der plausibel zum Motiv gehoert.
const SPLITTER_MIN = 60;

let repariert = 0;
for (const file of fs.readdirSync(DIR).filter(f => f.endsWith('.png')).sort()) {
  const p = path.join(DIR, file);
  const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const A = (i) => data[i * c + 3];

  // ── 1) Flecken ────────────────────────────────────────────────────────────
  const aussen = new Uint8Array(w * h);
  const stack = [];
  const start = (i) => { if (!aussen[i] && A(i) < ALPHA_FLUT) { aussen[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) { start(x); start((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { start(y * w); start(y * w + w - 1); }
  while (stack.length) {
    const q = stack.pop(); const x = q % w, y = (q / w) | 0;
    if (x > 0) start(q - 1);
    if (x < w - 1) start(q + 1);
    if (y > 0) start(q - w);
    if (y < h - 1) start(q + w);
  }
  let flecken = 0;
  for (let i = 0; i < w * h; i++) {
    const a = A(i);
    if (a < ALPHA_VOLL && a > ALPHA_LOCH && !aussen[i]) { data[i * c + 3] = 255; flecken++; }
  }

  // 2026-08-23, zweite Stufe — WIEDER RAUS, siehe unten.
  //
  // Sie hat die Deckungsmaske morphologisch geschlossen, um haarfeine
  // Durchsicht-Kanaele zuzumachen. Das hat funktioniert, aber einen sichtbaren
  // Schaden angerichtet (Wolf: „aber jetzt sind dicke schwarze raender hinter
  // den items?"): das Schliessen weitet die Maske um den Radius, und damit
  // wurden die ersten 5 px des weichen EIGENSCHATTENS voll deckend. Aus einem
  // Verlauf wird so eine harte dunkle Kante um das Motiv.
  // Gebraucht wird sie ohnehin nicht mehr: seit die Flutgrenze bei 60 statt
  // 240 liegt, erwischt schon die erste Stufe die Hutfalte. Zwei Werkzeuge
  // fuer dasselbe Problem, eines davon mit Nebenwirkung — also das eine weg.

  // ── 2) Rueckstaende ───────────────────────────────────────────────────────
  const gesehen = new Uint8Array(w * h);
  const teile = [];
  for (let i = 0; i < w * h; i++) {
    if (gesehen[i] || A(i) <= ALPHA_LOCH) continue;
    let n = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;
    const st = [i]; gesehen[i] = 1; const px = [];
    while (st.length) {
      const q = st.pop(); const x = q % w, y = (q / w) | 0;
      n++; px.push(q);
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const r = ny * w + nx;
        if (!gesehen[r] && A(r) > ALPHA_LOCH) { gesehen[r] = 1; st.push(r); }
      }
    }
    teile.push({ n, x0, y0, x1, y1, px });
  }
  teile.sort((a, b) => b.n - a.n);
  const haupt = teile[0];
  let splitter = 0;
  for (const t of teile.slice(1)) {
    const bw = t.x1 - t.x0 + 1, bh = t.y1 - t.y0 + 1;
    const winzig = t.n >= SPLITTER_MIN && t.n < haupt.n * SPLITTER_ANTEIL;
    const schlank = Math.max(bw, bh) / Math.min(bw, bh) >= SPLITTER_SCHLANK;
    const amRand = t.x0 === 0 || t.y0 === 0 || t.x1 === w - 1 || t.y1 === h - 1;
    if (winzig && (schlank || amRand)) {
      for (const q of t.px) data[q * c + 3] = 0;
      splitter += t.n;
      console.log(`  ${file}: Rueckstand ${bw}x${bh} (${t.n} px) bei x ${t.x0} y ${t.y0} entfernt`);
    }
  }

  if (flecken || splitter) {
    repariert++;
    console.log(`${file.padEnd(20)} Flecken ${String(flecken).padStart(6)} px   Rueckstand ${String(splitter).padStart(5)} px`);
    if (WRITE) {
      await sharp(data, { raw: { width: w, height: h, channels: c } }).png().toFile(p);
    }
  }
}
console.log(`\n${repariert} von 48 Dateien betroffen${WRITE ? ' und geschrieben' : ' (Probelauf, nichts geschrieben)'}`);
