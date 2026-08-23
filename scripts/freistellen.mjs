/**
 * freistellen.mjs — gelieferte Zeichen vom weissen Grund befreien und auf
 * 512x512 bringen.
 *
 * WARUM (2026-08-23): Bildmodelle liefern Transparenz unzuverlaessig, reines
 * Weiss dagegen zuverlaessig. Die Bestellung (docs/ASSET_BESTELLUNG_2a.md)
 * fragt deshalb bewusst nach weissem Grund, und das Freistellen passiert hier
 * in einem Rutsch.
 *
 * Der Trick ist derselbe wie beim Willkommen-Wolf: NICHT jedes helle Pixel
 * loeschen, sondern von den Raendern her fluten. Sonst reisst es weisse
 * Flaechen INNERHALB des Motivs mit weg - das Weiss einer Spielkarte, die
 * Creme-Flaeche eines Bechers, das Glanzlicht auf einer Muenze.
 *
 * NUTZUNG:
 *   node scripts/freistellen.mjs eingang/ ausgang/
 *   node scripts/freistellen.mjs eingang/ ausgang/ --pruefen
 *
 * `--pruefen` schreibt zusaetzlich ein Kontaktblatt, auf dem alle Ergebnisse
 * auf dem echten Buehnen-Grund liegen. Ein Zeichen, das dort einen hellen Hof
 * hat, ist nicht sauber freigestellt.
 */
import { readdirSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const [ein, aus] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const PRUEFEN = process.argv.includes('--pruefen');
if (!ein || !aus) {
  console.error('Aufruf: node scripts/freistellen.mjs <eingang> <ausgang> [--pruefen]');
  process.exit(1);
}
if (!existsSync(ein)) { console.error(`Eingang gibt es nicht: ${ein}`); process.exit(1); }
mkdirSync(aus, { recursive: true });

// Ab hier gilt ein Pixel von aussen als „weiss genug". 244 hat sich beim
// Wolf-Video bewaehrt: hoch genug, dass helle Motivflaechen stehen bleiben,
// niedrig genug, dass die uebliche Kompressions-Unruhe im Grund mitgeht.
const FLUT = 244;
// So weit reicht der weiche Verlauf nach innen. Ohne den bekommt jede Kante
// eine harte Treppe, die auf der Projektion als Fransen sichtbar wird.
const BAND = 3;
const RAMPE_OBEN = 250;
const RAMPE_UNTEN = 150;
const ZIEL = 512;

/**
 * 2026-08-23, an der ersten echten Lieferung gelernt: „hell genug" reicht als
 * Regel nicht.
 *
 * Zwei Faelle sind aufgelaufen, die beide daran scheitern:
 *   1. Ein WEISSES Motiv auf weissem Grund (der Tischtennisball, der
 *      Wattebausch). Mit einer festen Schwelle frisst die Flut das Motiv mit.
 *   2. Ein eingebrannter Karo-Grund statt echter Transparenz - zwei feste
 *      Werte, 244 und 254. Eine Schwelle, die beide erwischt, erwischt auch
 *      helle Motivflaechen.
 *
 * Die Loesung liest den Grund aus dem Bild selbst: welche neutralen Werte
 * kommen am RAND vor? Genau die sind Hintergrund, alles andere ist Motiv.
 * Bei weissem Grund ist das {255}, beim Karo {244, 254} - und ein schattierter
 * weisser Ball hat einen Verlauf ueber viele Werte und faellt nicht darunter.
 */
function grundwerteLesen(d, W, H, K) {
  const zaehler = new Map();
  const merke = (x, y) => {
    const o = (y * W + x) * K;
    const r = d[o], g = d[o + 1], b = d[o + 2];
    if (Math.max(r, g, b) - Math.min(r, g, b) > 4) return;   // nicht neutral
    if (Math.max(r, g, b) < 200) return;                      // zu dunkel fuer Grund
    const v = Math.round((r + g + b) / 3);
    zaehler.set(v, (zaehler.get(v) ?? 0) + 1);
  };
  for (let x = 0; x < W; x++) { merke(x, 0); merke(x, H - 1); }
  for (let y = 0; y < H; y++) { merke(0, y); merke(W - 1, y); }
  // Nur Werte behalten, die wirklich haeufig sind - Ausreisser am Rand
  // (Kompressions-Unruhe) sollen den Grund nicht aufweichen.
  const rand = 2 * (W + H);
  return [...zaehler.entries()].filter(([, n]) => n > rand * 0.02).map(([v]) => v);
}

const TOLERANZ = 3;
function machHell(grundwerte) {
  return (d, o) => {
    const r = d[o], g = d[o + 1], b = d[o + 2];
    if (Math.max(r, g, b) - Math.min(r, g, b) > 6) return false;
    const v = (r + g + b) / 3;
    return grundwerte.some(w => Math.abs(v - w) <= TOLERANZ);
  };
}

// 2026-08-23, beim ersten Testlauf im Kontaktblatt gesehen: unter jedem Zeichen
// blieb ein grauer Schmier stehen. Das ist der weiche Schlagschatten, den das
// Bild auf dem weissen Grund hat - er ist zu dunkel fuer die erste Flut und
// gehoert trotzdem zum Hintergrund.
// Zweite Flut: von dem, was schon Grund ist, weiter ueber Pixel, die
// NEUTRALGRAU und hell sind. Neutral heisst, dass Rot, Gruen und Blau dicht
// beieinander liegen - genau das trifft einen Schatten auf Weiss und verschont
// jede farbige Motivflaeche, auch eine helle wie Creme oder Gelb.
const SCHATTEN_HELL = 196;   // ab hier gilt ein grauer Pixel als Schatten
const SCHATTEN_BUNT = 16;    // groesster erlaubter Abstand zwischen den Kanaelen
const schattig = (d, o) => {
  const r = d[o], g = d[o + 1], b = d[o + 2];
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max >= SCHATTEN_HELL && (max - min) <= SCHATTEN_BUNT;
};

async function einsFreistellen(datei) {
  const roh = sharp(path.join(ein, datei)).ensureAlpha();
  const { data, info } = await roh.raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: K } = info;
  const grund = new Uint8Array(W * H);      // 1 = gehoert zum Hintergrund
  const grundwerte = grundwerteLesen(data, W, H, K);
  const hell = grundwerte.length ? machHell(grundwerte)
    : (d, o) => d[o] >= FLUT && d[o + 1] >= FLUT && d[o + 2] >= FLUT;
  const stapel = [];

  // Von allen vier Raendern starten.
  for (let x = 0; x < W; x++) { stapel.push(x, (H - 1) * W + x); }
  for (let y = 0; y < H; y++) { stapel.push(y * W, y * W + W - 1); }

  while (stapel.length) {
    const p = stapel.pop();
    if (grund[p]) continue;
    const o = p * K;
    if (!hell(data, o)) continue;
    grund[p] = 1;
    const x = p % W, y = (p - x) / W;
    if (x > 0) stapel.push(p - 1);
    if (x < W - 1) stapel.push(p + 1);
    if (y > 0) stapel.push(p - W);
    if (y < H - 1) stapel.push(p + W);
  }

  // Zweite Flut fuer den weichen Schatten (siehe Kommentar bei `schattig`).
  // Startpunkte sind alle Nachbarn der bereits gefundenen Grundflaeche.
  const stapel2 = [];
  for (let p = 0; p < W * H; p++) {
    if (!grund[p]) continue;
    const x = p % W, y = (p - x) / W;
    if (x > 0) stapel2.push(p - 1);
    if (x < W - 1) stapel2.push(p + 1);
    if (y > 0) stapel2.push(p - W);
    if (y < H - 1) stapel2.push(p + W);
  }
  while (stapel2.length) {
    const p = stapel2.pop();
    if (grund[p]) continue;
    const o = p * K;
    if (!schattig(data, o)) continue;
    grund[p] = 1;
    const x = p % W, y = (p - x) / W;
    if (x > 0) stapel2.push(p - 1);
    if (x < W - 1) stapel2.push(p + 1);
    if (y > 0) stapel2.push(p - W);
    if (y < H - 1) stapel2.push(p + W);
  }

  // Eingeschlossene Grundflaechen. 2026-08-23 am Karten-Pin gesehen: sein Loch
  // ist optisch Hintergrund, wird von der Flut aber nie erreicht, weil es
  // ringsum vom Motiv umschlossen ist. Also alle Flaechen mitnehmen, die
  // dieselben Grundwerte tragen und gross genug sind, um kein Glanzlicht zu
  // sein.
  const MIN_LOCH = 60;
  const gesehen = new Uint8Array(W * H);
  for (let start = 0; start < W * H; start++) {
    if (grund[start] || gesehen[start]) continue;
    if (!hell(data, start * K)) continue;
    const flaeche = [];
    const st = [start];
    gesehen[start] = 1;
    while (st.length) {
      const p = st.pop();
      flaeche.push(p);
      const x = p % W, y = (p - x) / W;
      const nb = [];
      if (x > 0) nb.push(p - 1);
      if (x < W - 1) nb.push(p + 1);
      if (y > 0) nb.push(p - W);
      if (y < H - 1) nb.push(p + W);
      for (const q of nb) {
        if (gesehen[q] || grund[q]) continue;
        if (!hell(data, q * K)) continue;
        gesehen[q] = 1; st.push(q);
      }
    }
    if (flaeche.length >= MIN_LOCH) for (const p of flaeche) grund[p] = 1;
  }

  // Alpha setzen: Grund weg, Rest bleibt. In einem schmalen Band an der Kante
  // wird die Deckung aus der Helligkeit abgeleitet, damit der Uebergang weich
  // ist statt gezackt.
  const out = Buffer.from(data);
  for (let p = 0; p < W * H; p++) {
    const o = p * K;
    if (grund[p]) { out[o + 3] = 0; continue; }
    // Liegt das Pixel nah an einem Grund-Pixel? Dann Kantenband.
    let nah = false;
    const x = p % W, y = (p - x) / W;
    for (let dy = -BAND; dy <= BAND && !nah; dy++) {
      for (let dx = -BAND; dx <= BAND; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (grund[ny * W + nx]) { nah = true; break; }
      }
    }
    if (!nah) continue;
    const l = (data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114);
    const t = Math.min(1, Math.max(0, (RAMPE_OBEN - l) / (RAMPE_OBEN - RAMPE_UNTEN)));
    out[o + 3] = Math.round(255 * t);
  }

  // Auf das Motiv zuschneiden, dann mittig in ein 512er Quadrat mit etwas Luft.
  // Ohne das steht jedes Zeichen anders gross im Raster, obwohl alle Dateien
  // gleich gross sind - genau der Fehler, den man auf der Buehne sofort sieht.
  const mitAlpha = sharp(out, { raw: { width: W, height: H, channels: K } }).png();
  const zug = await mitAlpha.trim({ threshold: 1 }).toBuffer();
  const m = await sharp(zug).metadata();
  const innen = Math.round(ZIEL * 0.86);   // 7% Luft je Seite
  const skaliert = await sharp(zug)
    .resize(innen, innen, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const fertig = await sharp({
    create: { width: ZIEL, height: ZIEL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite([{ input: skaliert, gravity: 'center' }]).png({ compressionLevel: 9 }).toBuffer();

  await sharp(fertig).toFile(path.join(aus, datei.replace(/\.[^.]+$/, '.png')));

  const gesetzt = out.reduce((n, _, i) => (i % K === 3 && out[i] > 16 ? n + 1 : n), 0);
  return { datei, quelle: `${W}x${m.width ? '' : ''}${H}`, motiv: `${m.width}x${m.height}`, deckung: +(100 * gesetzt / (W * H)).toFixed(1) };
}

const dateien = readdirSync(ein).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f));
if (!dateien.length) { console.error(`Keine Bilder in ${ein}`); process.exit(1); }

const berichte = [];
for (const f of dateien) {
  try { berichte.push(await einsFreistellen(f)); }
  catch (e) { console.log(`  ✗ ${f}: ${String(e).slice(0, 90)}`); }
}

console.log(`\n${berichte.length} von ${dateien.length} freigestellt → ${aus}\n`);
console.log('Datei'.padEnd(34), 'Motiv'.padEnd(12), 'Deckung');
for (const b of berichte) {
  console.log(b.datei.padEnd(34), b.motiv.padEnd(12), String(b.deckung).padStart(5) + '%');
}
// Sehr niedrige Deckung heisst meist: das Motiv war selbst fast weiss und ist
// mit weggeflutet. Sehr hohe heisst: der Grund war nicht rein weiss.
const auffaellig = berichte.filter(b => b.deckung < 8 || b.deckung > 92);
if (auffaellig.length) {
  console.log('\nBitte diese von Hand ansehen:');
  for (const b of auffaellig) console.log('  -', b.datei, `(${b.deckung}%)`);
}

if (PRUEFEN) {
  // Kontaktblatt auf echtem Buehnen-Grund: was hier einen hellen Hof hat, ist
  // nicht sauber freigestellt.
  const Z = 150, COLS = 6;
  const rows = Math.ceil(berichte.length / COLS);
  const comp = [];
  for (let i = 0; i < berichte.length; i++) {
    const b = await sharp(path.join(aus, berichte[i].datei.replace(/\.[^.]+$/, '.png')))
      .resize(Z - 16, Z - 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
    comp.push({ input: b, left: (i % COLS) * Z + 8, top: Math.floor(i / COLS) * Z + 8 });
  }
  const blatt = path.join(aus, '_kontaktblatt.png');
  await sharp({ create: { width: COLS * Z, height: rows * Z, channels: 3, background: { r: 22, g: 18, b: 32 } } })
    .composite(comp).toFile(blatt);
  console.log(`\nKontaktblatt: ${blatt}`);
}
