/* naht-lobby-willkommen — traegt die Wortmarke ueber den Wechsel?
 *
 * 2026-08-26 (Wolf: „Probier mal K2"). K2 aus der Motion-Werkstatt ist
 * B11 + B8, Grundblende mit Anker: die Wortmarke ueberlebt den Wechsel Lobby →
 * Willkommen, sie wird nicht abgebaut und neu aufgebaut, sie waechst nur an
 * ihren neuen Platz.
 *
 * ── Der Befund, der das ausgeloest hat ─────────────────────────────────────
 * Gemessen mit `scripts/motion.mjs willkommen --film`:
 *
 *     365 ms   die alte Szene ist weg
 *    1200 ms   erstes Element der neuen Szene
 *    4154 ms   Folie steht
 *
 * Im Code waren die 835 ms dazwischen zwei Zeilen: der Inhalts-Block der
 * Willkommen-Folie trug `opacity: 0` und wartete 1,2 Sekunden.
 *
 * ── ⚠️ Zwei Fallen, die hier je einen Anlauf gekostet haben ────────────────
 *
 * 1. NICHT mit `getComputedStyle(...).opacity` messen. Die Buehne wechselt die
 *    Szene ueber die View-Transition-API (siehe main.css, „SZENENWECHSEL —
 *    Skin Cozy Kino"). Waehrend die laeuft, liegt das echte DOM hinter
 *    Schnappschuessen, und die Deckkraft am Element meldet 0, obwohl das Bild
 *    ueberblendet. Genau so kamen „457 ms Leere" heraus, die es nie gab.
 *
 * 2. NICHT von aussen im Takt abtasten. Ein Abtaster alle 55 ms haengt genau
 *    dann, wenn der Browser den Teilbaum austauscht - im Protokoll fehlten die
 *    Bilder zwischen 376 und 1180 ms komplett, und die Luecke sah nach einer
 *    Sekunde Leere aus, obwohl dort die Ueberblendung lief.
 *
 * Was bleibt, ist das Ehrlichste: BILDER, so wie der Saal sie sieht, an festen
 * Zeitpunkten nach dem Wechsel. Dazu die gerechnete Uebergabe aus der App
 * selbst.
 *
 * NUTZUNG:  node scripts/naht-lobby-willkommen.mjs
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

/** Wann nach dem Wechsel ein Bild gezogen wird. */
const MARKEN = [120, 260, 420, 600, 900, 1400];

const b = await buehneStarten({ bots: 6, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();
fs.mkdirSync('.shots', { recursive: true });

// ⚠️ Sechs Sekunden Lobby, nicht drei. Gemessen haengt sich die Lobby erst nach
// rund 3 s ein, und die Wortmarke merkt sich ihren Platz 1,2 s spaeter. Wer
// nach 3 s liest, liest NICHTS und haelt es faelschlich fuer einen Codefehler.
await b.zurStation('lobby');
await sleep(6000);

const gemerkt = await seite.evaluate(() => globalThis.__qqWillkommenQuelle ?? null);
console.log('\n══ Lobby ═══════════════════════════════════════════════════════');
console.log('  Wortmarke gemerkt:', gemerkt
  ? `Mitte ${gemerkt.mx.toFixed(3)} / ${gemerkt.my.toFixed(3)} der Buehne, Hoehe ${(gemerkt.hoehe * 990).toFixed(0)} px`
  : 'NICHTS - die Uebergabe wird ausfallen');
await seite.screenshot({ path: '.shots/k2-lobby.png' });

// ── Wechsel ausloesen und Bilder ziehen ───────────────────────────────────
const lauf = b.zurStation('willkommen');
const t0 = Date.now();
for (const ziel of MARKEN) {
  while (Date.now() - t0 < ziel) await sleep(12);
  await seite.screenshot({ path: `.shots/k2-${ziel}.png` });
}
await lauf.catch(() => {});

const flug = await seite.evaluate(() => globalThis.__qqWillkommenFlug ?? null);
console.log('\n══ Die Uebergabe ═══════════════════════════════════════════════');
console.log(flug
  ? `  Die Marke startet ${Math.abs(Math.round(flug.dy))} px hoeher und beim ${flug.skala.toFixed(2)}-fachen\n  ihrer Groesse, also genau dort, wo sie in der Lobby stand.`
  : '  AUSGEFALLEN - keine frische Quelle beim Sichtbarwerden.');

// ── Kontaktbogen ──────────────────────────────────────────────────────────
const breite = 440;
const hoehe = Math.round(breite * 990 / 1760);
const teile = [];
for (const z of MARKEN) teile.push(await sharp(`.shots/k2-${z}.png`).resize(breite).toBuffer());
await sharp({ create: { width: breite * 3, height: hoehe * 2, channels: 3, background: '#111' } })
  .composite(teile.map((input, i) => ({ input, left: (i % 3) * breite, top: Math.floor(i / 3) * hoehe })))
  .toFile('.shots/K2-KONTAKTBOGEN.png');

console.log('\n══ Kontaktbogen ════════════════════════════════════════════════');
console.log(`  .shots/K2-KONTAKTBOGEN.png  (${MARKEN.join(', ')} ms nach dem Wechsel)`);
console.log('  Was dort zu sehen sein muss: bei 120 ms steht die Wortmarke noch');
console.log('  auf ihrem Lobby-Platz, bei 260 ms ist sie unterwegs, ab 600 ms');
console.log('  sitzt sie. In keinem Bild eine leere Buehne.');

await b.schliessen?.();
process.exit(flug ? 0 : 1);
