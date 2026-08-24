/**
 * kanten-entfringen.mjs — den schwarzen Saum von den Zeichen nehmen.
 *
 * WARUM (2026-08-24, Wolf: „raender vieler der neuen emojis teilweise sehr
 * schwarz und pixelig, wie loesen?").
 *
 * ── Der Befund, gemessen statt vermutet ────────────────────────────────────
 * Ein Querschnitt durch die linke Flanke von potion.png bei y=233:
 *
 *     x=0   RGB   0,  0,  0   a=  9
 *     x=1   RGB   0,  0, 19   a= 40
 *     x=2   RGB  19, 70, 83   a=119
 *     x=3   RGB  37,113,122   a=217
 *     x=4   RGB  52,143,150   a=255   <- die echte Objektfarbe (Tuerkis)
 *
 * Die Farbe laeuft nach SCHWARZ, waehrend die Deckkraft ausblendet. Auf
 * dunklem Grund faellt das nicht auf. Auf einer hellen Farbkachel - und genau
 * darauf sitzen die Team-Zeichen - liegt dadurch ein dunkler Saum um jedes
 * Objekt, und weil er nur ein bis zwei Pixel breit und sehr dunkel ist, liest
 * er sich als ausgefranste Kante.
 *
 * ── Was es NICHT ist ───────────────────────────────────────────────────────
 * Meine erste Vermutung war vormultipliziertes Alpha. Der Test widerlegt sie:
 * bei vormultiplizierten Daten kann kein Farbkanal groesser sein als Alpha,
 * hier ist das bei 19,7 Prozent der halbtransparenten Pixel aber der Fall.
 * Ein Entmultiplizieren waere also falsch gewesen.
 *
 * ── Und es ist auch kein Stilmittel ────────────────────────────────────────
 * Ueber alle 48 Objekt-Zeichen gemessen, Anteil dunkler Randpixel:
 *     knitted-sock   1 %   Median-Luminanz am Rand 193
 *     wizard-hat     4 %                           179
 *     alle uebrigen 51-89 %                       5-57
 * Zwei saubere Dateien, sechsundvierzig mit Saum. Eine Stilentscheidung waere
 * gleichmaessig - das hier ist ein Rest aus dem Freistellen.
 *
 * ── Die Loesung ────────────────────────────────────────────────────────────
 * Farbe nach aussen ausbluten lassen („alpha bleed"): jedes halbtransparente
 * Pixel bekommt die Farbe des naechsten deckenden Nachbarn, die DECKKRAFT
 * bleibt unangetastet. Die Kante behaelt damit ihre weiche Form, verliert aber
 * ihren schwarzen Kern. Das ist der Standardweg gegen dunkle Hoefe, und er ist
 * verlustfrei fuer alles, was deckend ist - kein einziges volles Pixel wird
 * angefasst.
 *
 * NUTZUNG:
 *   node scripts/kanten-entfringen.mjs --messen             Befund, aendert nichts
 *   node scripts/kanten-entfringen.mjs --probe potion.png   ein Vorher/Nachher
 *   node scripts/kanten-entfringen.mjs --lauf               alle, SCHREIBT
 */
import { createRequire } from 'node:module';
import { readdirSync, mkdirSync } from 'node:fs';

const sharp = createRequire(new URL('../frontend/package.json', import.meta.url))('sharp');

/** Ab hier gilt ein Pixel als deckend und liefert Farbe an seine Nachbarn. */
const DECKEND = 250;

/**
 * Farbe von innen nach aussen schieben. Iterative Dilatation: in jedem Durchgang
 * bekommen alle noch nicht versorgten Pixel mit mindestens einem versorgten
 * Nachbarn dessen Mittelwert. Nach wenigen Durchgaengen ist der ganze Saum
 * erreicht - er ist nur ein bis drei Pixel breit.
 */
function ausbluten(data, width, height, durchgaenge = 6) {
  const versorgt = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    if (data[i + 3] >= DECKEND) versorgt[p] = 1;
  }
  const nachbarn = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (let d = 0; d < durchgaenge; d++) {
    const neu = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = y * width + x;
        if (versorgt[p]) continue;
        if (data[p * 4 + 3] === 0) continue;   // voll transparent: egal
        let r = 0, g = 0, b = 0, n = 0;
        for (const [dx, dy] of nachbarn) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const q = ny * width + nx;
          if (!versorgt[q]) continue;
          r += data[q * 4]; g += data[q * 4 + 1]; b += data[q * 4 + 2]; n++;
        }
        if (n) neu.push([p, Math.round(r / n), Math.round(g / n), Math.round(b / n)]);
      }
    }
    if (!neu.length) break;
    for (const [p, r, g, b] of neu) {
      data[p * 4] = r; data[p * 4 + 1] = g; data[p * 4 + 2] = b;
      versorgt[p] = 1;
    }
  }
  return data;
}

/** Kennzahl fuer den Bericht: wie dunkel ist der Saum im Median? */
function randMedian(data) {
  const lum = [];
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0 || a === 255) continue;
    lum.push(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
  }
  lum.sort((a, b) => a - b);
  return lum.length ? Math.round(lum[Math.floor(lum.length / 2)]) : -1;
}

const ORDNER = ['frontend/public/avatars/cozyquiz', 'frontend/public/icons'];
const PROBE = process.argv.includes('--probe');
const LAUF = process.argv.includes('--lauf');
const MESSEN = process.argv.includes('--messen');

/** Anteil dunkler Randpixel - die Kennzahl, an der der Befund haengt. */
function randBefund(data) {
  let rand = 0, dunkel = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0 || a === 255) continue;
    rand++;
    if (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] < 60) dunkel++;
  }
  return { rand, anteil: rand ? Math.round((dunkel / rand) * 100) : 0 };
}

async function einzeln(pfad) {
  const roh = sharp(pfad).ensureAlpha();
  const { width, height } = await roh.metadata();
  const { data } = await roh.raw().toBuffer({ resolveWithObject: true });
  const vorher = randMedian(data);
  const kopie = Buffer.from(data);
  ausbluten(kopie, width, height);
  const nachher = randMedian(kopie);
  return { width, height, vorher, nachher, data, kopie };
}

if (PROBE) {
  const name = process.argv[process.argv.indexOf('--probe') + 1] ?? 'potion.png';
  const pfad = `frontend/public/avatars/cozyquiz/${name}`;
  const { width, height, vorher, nachher, data, kopie } = await einzeln(pfad);
  console.log(`${name}  ${width}x${height}`);
  console.log(`  Median-Luminanz am Rand:  vorher ${vorher}  ->  nachher ${nachher}`);
  mkdirSync('.shots', { recursive: true });
  // Beide Fassungen auf dieselbe helle Kachel legen, wie auf der Buehne.
  const KACHEL = 320;
  for (const [wie, buf] of [['VORHER', data], ['NACHHER', kopie]]) {
    const png = await sharp(buf, { raw: { width, height, channels: 4 } }).png().toBuffer();
    // Rohfassung mit Alpha zusaetzlich ablegen, damit ein Lupen-Vergleich
    // beide Staende auf denselben Grund legen kann.
    await sharp(png).toFile(`.shots/KANTE-${wie}-quelle-${name}`);
    await sharp({ create: { width: KACHEL, height: KACHEL, channels: 4, background: '#4C8DF6' } })
      .composite([{ input: await sharp(png).resize({ height: Math.round(KACHEL * 0.78), fit: 'inside' }).toBuffer(), gravity: 'center' }])
      .png().toFile(`.shots/KANTE-${wie}-${name}`);
  }
  console.log(`  -> .shots/KANTE-VORHER-${name} und .shots/KANTE-NACHHER-${name}`);
}

if (LAUF) {
  let n = 0;
  for (const ordner of ORDNER) {
    for (const f of readdirSync(ordner).filter(x => x.endsWith('.png'))) {
      const pfad = `${ordner}/${f}`;
      const { width, height, vorher, nachher, kopie } = await einzeln(pfad);
      if (nachher <= vorher + 2) continue;   // nichts gewonnen, Datei in Ruhe lassen
      await sharp(kopie, { raw: { width, height, channels: 4 } }).png().toFile(pfad);
      console.log(`  ${f.padEnd(26)} Rand-Luminanz ${String(vorher).padStart(3)} -> ${String(nachher).padStart(3)}`);
      n++;
    }
  }
  console.log(`\n${n} Dateien entfringt.`);
}

if (MESSEN) {
  const zeilen = [];
  for (const ordner of ORDNER) {
    for (const f of readdirSync(ordner).filter(x => x.endsWith('.png'))) {
      const roh = sharp(`${ordner}/${f}`).ensureAlpha();
      const { data } = await roh.raw().toBuffer({ resolveWithObject: true });
      const { rand, anteil } = randBefund(data);
      zeilen.push({ ordner, f, rand, anteil, median: randMedian(data) });
    }
  }
  zeilen.sort((a, b) => b.anteil - a.anteil);
  console.log('Datei                        dunkler Rand   Median-Luminanz');
  for (const z of zeilen) {
    console.log(`${(z.f).padEnd(30)} ${String(z.anteil).padStart(9)} %   ${String(z.median).padStart(14)}`);
  }
  const schlimm = zeilen.filter(z => z.anteil > 40).length;
  console.log(`\n${schlimm} von ${zeilen.length} Dateien mit mehr als 40 % dunklen Randpixeln.`);
}

if (!PROBE && !LAUF && !MESSEN) console.log('Nichts zu tun. --messen, --probe <datei> oder --lauf.');
