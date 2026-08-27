/* avatare-loecher — die zwei Fehler, die im Avatarsatz wirklich vorkommen.
 *
 * 2026-08-27, Wolf zum Heissluftballon: „hier ist auch noch ein bug... schade
 * ich finde den super schoen".
 *
 * ── Warum es diesmal ein Werkzeug gibt und beim Wecker nicht ───────────────
 * Am 26.8. habe ich vier Detektoren gebaut und alle wieder weggeworfen, weil
 * jeder unschuldige Motive gemeldet hat. Der Fehler war, nach dem falschen
 * Merkmal zu suchen: nach „farblos und hell". Ein weisses Objekt IST farblos
 * und hell.
 *
 * Beim Ballon ist ein besseres Merkmal aufgefallen, und zwar durch Hinsehen,
 * nicht durch Rechnen. Der Satz hat GENAU ZWEI Fehlerarten, und die zweite ist
 * ohne jede Heuristik pruefbar:
 *
 *   A. Zu wenig Loch. Eine Flaeche, durch die der Grund scheinen muesste, ist
 *      mit deckenden, fast weissen Pixeln gefuellt. Beim Wecker als
 *      eingebranntes Transparenz-Karo, beim Ballon zwischen den Seilen, beim
 *      Rucksack unter dem Tragegriff, beim Planeten zwischen Ring und Kugel.
 *      → nur ein HINWEIS moeglich (eine weisse Wolke ist auch weiss), deshalb
 *        wird hier eine Kandidatenliste ausgegeben und nicht geurteilt.
 *
 *   B. Zu viel Loch. Mitten in einer geschlossenen Flaeche fehlen Pixel, der
 *      Grund scheint durch die Discokugel. Das ist EXAKT pruefbar: durchsichtige
 *      Pixel, die vom Bildrand aus nicht erreichbar sind, sind Innenloecher.
 *      Kein Schwellwert, keine Heuristik, kein Falschalarm.
 *
 * ── Und ein Urteil, das ich einmal korrigieren musste ─────────────────────
 * Der erste Anlauf sagte: „ein absichtliches Loch ist EINS". Das stimmte fuer
 * Schluessel, Donut, Teekanne und Kompass, und es hat die kaputte Discokugel
 * mit ihren zwoelf Loechern zuverlaessig gefunden.
 *
 * Es war trotzdem falsch. Wolfs neuer Heissluftballon hat DREI Loecher (die
 * Zwischenraeume zwischen vier Seilen), der neue Ringplanet ZWEI (die beiden
 * Sicheln zwischen Ring und Kugel). Beide sind einwandfrei, das Werkzeug hat
 * sie gemeldet.
 *
 * Der richtige Unterschied ist nicht die ANZAHL, sondern die REGELMAESSIGKEIT.
 * Loecher, die zum Motiv gehoeren, sind wenige und aehnlich gross:
 *     Ballon        7466 / 6942 / 6577   Spanne 1,13
 *     Ringplanet    3436 / 3044          Spanne 1,13
 * Schaden ist viel und ungleich:
 *     alte Discokugel  11168 / 9116 / 8408 / 4543 / 2788 / ...  zwoelf Stueck,
 *                      Spanne ueber 4
 *
 * Auch das bleibt ein Hinweis und kein Beweis - aber ein Hinweis, der die
 * heilen Motive in Ruhe laesst.
 *
 * ⚠️ Ersetzt NICHT `avatare-auf-grund.mjs`. Das legt alle 48 auf sechs Gruende
 * und ist die Kontrolle, die Wolfs Asset-Regeln verlangen. Dieses Werkzeug
 * sagt, WO man auf dem Blatt hinsehen soll.
 *
 * ⚠️ Die Originale werden nur GELESEN. Es wird nichts geschrieben und nichts
 * freigestellt - das schliessen die Asset-Regeln aus.
 *
 * NUTZUNG:  node scripts/avatare-loecher.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const QUELLE = 'design-assets/avatare-v5-original';
/** Ab hier gilt ein Pixel als durchsichtig. 40 statt 0, damit die weiche Kante
 *  nicht als Loch zaehlt. */
const DURCH = 40;
/** Kleiner als das sind Einzelpixel aus der Kantenglaettung, kein Loch. */
const MINDESTLOCH = 20;
/** Ein waagerechter Lauf farblos-weisser deckender Pixel ab dieser Breite ist
 *  ein Kandidat fuer Fehler A. Beim Ballon sind es 99 px. */
const MINDESTLAUF = 40;

if (!fs.existsSync(QUELLE)) { console.error(`Originale fehlen: ${QUELLE}`); process.exit(1); }
const dateien = fs.readdirSync(QUELLE).filter(f => f.endsWith('.png')).sort();

/** Innenloecher: durchsichtige Pixel, die vom Rand aus nicht erreichbar sind. */
function innenLoecher(data, W, H) {
  const durch = (i) => data[i * 4 + 3] < DURCH;
  const gesehen = new Uint8Array(W * H);
  const stapel = [];
  const start = (i) => { if (durch(i) && !gesehen[i]) { gesehen[i] = 1; stapel.push(i); } };
  for (let x = 0; x < W; x++) { start(x); start((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { start(y * W); start(y * W + W - 1); }
  while (stapel.length) {
    const i = stapel.pop(); const x = i % W, y = (i - x) / W;
    if (x > 0) start(i - 1);
    if (x < W - 1) start(i + 1);
    if (y > 0) start(i - W);
    if (y < H - 1) start(i + W);
  }
  // Zusammenhaengende Loecher einsammeln.
  const mark = new Uint8Array(W * H);
  const loecher = [];
  for (let i0 = 0; i0 < W * H; i0++) {
    if (!durch(i0) || gesehen[i0] || mark[i0]) continue;
    let n = 0, x0 = W, y0 = H, x1 = -1, y1 = -1;
    const st = [i0]; mark[i0] = 1;
    while (st.length) {
      const i = st.pop(); const x = i % W, y = (i - x) / W; n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (j >= 0 && durch(j) && !gesehen[j] && !mark[j]) { mark[j] = 1; st.push(j); }
      }
    }
    if (n >= MINDESTLOCH) loecher.push({ n, x0, y0, x1, y1 });
  }
  return loecher.sort((a, b) => b.n - a.n);
}

/** Kandidaten fuer Fehler A: breite Laeufe farblos-weisser DECKENDER Pixel. */
function weisseFlaechen(data, W, H) {
  // Farblos heisst: die drei Kanaele liegen dicht beieinander. Die Creme-
  // Streifen des Ballons sind 234/169/116 und fallen damit heraus, die
  // Fuellung zwischen den Seilen ist 247/247/247 und faellt hinein.
  const weiss = (x, y) => {
    const i = (y * W + x) * 4;
    if (data[i + 3] < 250) return false;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return r > 245 && g > 245 && b > 240 && Math.max(r, g, b) - Math.min(r, g, b) < 12;
  };
  let zeilen = 0, breitester = 0, y0 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    let best = 0, cur = 0;
    for (let x = 0; x < W; x++) { if (weiss(x, y)) { cur++; if (cur > best) best = cur; } else cur = 0; }
    if (best >= MINDESTLAUF) { zeilen++; if (y0 < 0) y0 = y; y1 = y; if (best > breitester) breitester = best; }
  }
  return { zeilen, breitester, y0, y1 };
}

const A = [], B = [];
for (const datei of dateien) {
  const name = datei.replace(/^[a-z-]+--/, '').replace('.png', '');
  const { data, info } = await sharp(path.join(QUELLE, datei)).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const loecher = innenLoecher(data, info.width, info.height);
  const weiss = weisseFlaechen(data, info.width, info.height);
  if (loecher.length) B.push({ name, loecher });
  if (weiss.zeilen) A.push({ name, ...weiss });
}

console.log('\n══ B · Zu viel Loch ════════════════════════════════════════════');
console.log('   Durchsichtige Pixel mitten in der Flaeche. Exakt gemessen.');
console.log('   Wenige und aehnlich gross = zum Motiv gehoerend.');
console.log('   Viele und ungleich = Schaden. (Hinweis, kein Beweis - ansehen.)\n');
for (const m of B) {
  // Spanne zwischen groesstem und kleinstem Loch. Bei einem Loch ist sie 1.
  const gr = m.loecher[0].n, kl = m.loecher[m.loecher.length - 1].n;
  const spanne = kl > 0 ? gr / kl : 1;
  const marke = (m.loecher.length <= 3 && spanne <= 2.5) ? '✓' : '⚠';
  console.log(`  ${marke} ${m.name.padEnd(20)} ${String(m.loecher.length).padStart(2)} Loch/Loecher` +
    `   Spanne ${spanne.toFixed(2)}` +
    `   groesstes ${String(m.loecher[0].n).padStart(6)} px bei ${m.loecher[0].x0},${m.loecher[0].y0}`);
  if (m.loecher.length > 1) {
    for (const l of m.loecher.slice(1, 4)) console.log(`      auch: ${String(l.n).padStart(6)} px bei ${l.x0},${l.y0}`);
    if (m.loecher.length > 4) console.log(`      ... und ${m.loecher.length - 4} weitere`);
  }
}
if (!B.length) console.log('  Keine.');

console.log('\n══ A · Zu wenig Loch (Kandidaten) ══════════════════════════════');
console.log('   Breite Flaechen aus deckendem, FARBLOSEM Weiss.');
console.log('   ⚠️ Kein Urteil: eine weisse Wolke ist auch weiss. Ansehen.\n');
for (const m of A.sort((x, y) => y.zeilen - x.zeilen)) {
  console.log(`    ${m.name.padEnd(20)} ${String(m.zeilen).padStart(4)} Zeilen, breitester Lauf ` +
    `${String(m.breitester).padStart(4)} px, y ${m.y0}..${m.y1}`);
}
if (!A.length) console.log('  Keine.');

console.log('\n  Danach: `node scripts/avatare-auf-grund.mjs` und auf dem Blatt nachsehen.');
