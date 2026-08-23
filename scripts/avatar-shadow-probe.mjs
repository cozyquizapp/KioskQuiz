/**
 * avatar-shadow-probe.mjs — Probe: Motiv MIT Schlagschatten auf der Kachel.
 *
 * Anlass (Wolf 2026-08-23, mit einem Bild aus ChatGPT): „die 5 beispielavatare
 * wurden einzeln erstellt, sind hd und haben schoene schatten etc, das ist
 * nicht bei allen avataren so, wie ist deine einschaetzung? ich habs
 * allerdings jetzt auch noch nie als beispiel auf dem beamer gesehen."
 *
 * Die Frage dahinter ist nicht „sind unsere Bilder gut genug", sondern
 * „traegt der Look auch mit den schwaecheren Motiven". Deshalb stehen hier
 * bewusst Wolfs fuenf Beispiele NEBEN fuenf der schwierigsten aus dem Set.
 * Wenn die schwierigen mithalten, ist der Look sicher; wenn nicht, weiss man
 * genau, welche Dateien eine Neuausgabe brauchen, statt das ganze Set
 * anzuzweifeln.
 *
 * Der Schatten ist NICHT gemalt, er kommt aus der Silhouette des Motivs (im
 * Browser waere das `filter: drop-shadow`, hier dieselbe Rechnung mit sharp:
 * Alphakanal versetzen, weichzeichnen, dunkel einfaerben, dahinterlegen).
 * Wichtig: das geht erst, seit die Alpha-Reparatur durch ist — vorher haette
 * der Schatten durch die Flecken hindurch geworfen.
 *
 * Drei Zeilen, damit man die Entscheidung sieht statt sie zu erraten:
 *   1) flach        — heutiger Stand, Motiv liegt auf der Kachel
 *   2) Schatten     — derselbe Stand plus Schlagschatten
 *   3) Buehnengroesse — Zeile 2 auf die echte Lobby-Groesse (96 px)
 *
 * NUTZUNG: node scripts/avatar-shadow-probe.mjs -> .shots/avatar-schatten.png
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const DIR = 'frontend/public/avatars/cozyquiz';
const OUT = '.shots/avatar-schatten.png';

// Links Wolfs fuenf aus dem ChatGPT-Bild, rechts fuenf, die im Set als
// schwierig aufgefallen sind (Gestrick durchbrochen, viel Teil-Alpha, flache
// Farbe, duenne Silhouette).
const WOLF = ['teapot', 'mushroom', 'knitted-sock', 'table-lamp', 'cassette'];
const HART = ['compass', 'paint-palette', 'seashell', 'wizard-hat', 'key'];
const LISTE = [...WOLF, ...HART];

const TILE = 200;        // Kachel in der grossen Ansicht
const TILE_KLEIN = 96;   // exakt die Lobby-Groesse
const PAD = 18;
const KOPF = 34;

const src = readFileSync('frontend/src/cozyquizAvatars.ts', 'utf8');
const fillBlock = src.slice(src.indexOf('COZYQUIZ_FILL'), src.indexOf('COZYQUIZ_NUDGE'));
const FILL = Object.fromEntries(
  [...fillBlock.matchAll(/'([a-z0-9-]+)':\s*([0-9.]+),/g)].map(m => [m[1], Number(m[2])])
);
const nudgeBlock = src.slice(src.indexOf('COZYQUIZ_NUDGE'));
const NUDGE = Object.fromEntries(
  [...nudgeBlock.matchAll(/'([a-z0-9-]+)':\s*\[(-?[0-9.]+),\s*(-?[0-9.]+)\]/g)]
    .map(m => [m[1], [Number(m[2]), Number(m[3])]])
);
const COLORS = ['#3B82F6', '#F97316', '#22C55E', '#A855F7', '#FACC15', '#EC4899', '#14B8A6', '#EF4444', '#F97316', '#3B82F6'];

/** Eine Kachel bauen. `schatten` = Versatz/Weichzeichnung in Kachel-Prozent. */
async function kachel(slug, farbe, kante, schatten) {
  const fill = FILL[slug] ?? 0.9;
  const nu = NUDGE[slug] ?? [0, 0];
  const innen = Math.round(kante * fill);
  const motiv = await sharp(path.join(DIR, `${slug}.png`))
    .resize(innen, innen, { fit: 'inside' }).png().toBuffer();
  const mm = await sharp(motiv).metadata();
  const left = Math.round((kante - mm.width) / 2 + nu[0] / 100 * kante);
  const top = Math.round((kante - mm.height) / 2 + nu[1] / 100 * kante);

  const ebenen = [];
  if (schatten) {
    // Silhouette = Alphakanal des Motivs, weichgezeichnet und dunkel gefaerbt.
    const alpha = await sharp(motiv).extractChannel('alpha')
      .blur(Math.max(0.4, kante * schatten.blur)).toBuffer();
    const dunkel = await sharp({
      create: { width: mm.width, height: mm.height, channels: 3, background: '#0B0710' },
    }).joinChannel(alpha).png().toBuffer();
    ebenen.push({
      input: await sharp(dunkel).ensureAlpha()
        .composite([{
          input: Buffer.from([0, 0, 0, Math.round(255 * schatten.staerke)]),
          raw: { width: 1, height: 1, channels: 4 }, tile: true, blend: 'dest-in',
        }]).png().toBuffer(),
      left: Math.max(0, left + Math.round(kante * schatten.dx)),
      top: Math.max(0, top + Math.round(kante * schatten.dy)),
    });
  }
  ebenen.push({ input: motiv, left: Math.max(0, left), top: Math.max(0, top) });

  const flaeche = await sharp({
    create: { width: kante, height: kante, channels: 4, background: farbe },
  }).composite(ebenen).png().toBuffer();
  const r = Math.round(kante * 0.16);
  const maske = Buffer.from(
    `<svg width="${kante}" height="${kante}"><rect width="${kante}" height="${kante}" rx="${r}" ry="${r}" fill="#fff"/></svg>`
  );
  return sharp(flaeche).composite([{ input: maske, blend: 'dest-in' }]).png().toBuffer();
}

const SCHATTEN = { dx: 0.02, dy: 0.035, blur: 0.045, staerke: 0.42 };

const breite = PAD + LISTE.length * (TILE + PAD);
const hoehe = KOPF + PAD + TILE + 30 + TILE + 30 + TILE_KLEIN + PAD + 40;
const ebenen = [];

const zeile = async (y, schatten, kante, titel) => {
  ebenen.push({
    input: Buffer.from(`<svg width="${breite}" height="26"><text x="${PAD}" y="19" font-family="sans-serif" font-size="17" font-weight="700" fill="#F6EFE6">${titel}</text></svg>`),
    left: 0, top: y - 28,
  });
  for (let i = 0; i < LISTE.length; i++) {
    ebenen.push({
      input: await kachel(LISTE[i], COLORS[i], kante, schatten),
      left: PAD + i * (TILE + PAD) + Math.round((TILE - kante) / 2),
      top: y,
    });
  }
};

let y = KOPF + 24;
await zeile(y, null, TILE, 'heute: flach auf der Kachel');
y += TILE + 46;
await zeile(y, SCHATTEN, TILE, 'Vorschlag: mit Schlagschatten aus der Silhouette');
y += TILE + 46;
await zeile(y, SCHATTEN, TILE_KLEIN, 'derselbe Vorschlag in Buehnengroesse (96 px, wie in der Lobby)');

ebenen.unshift({
  input: Buffer.from(`<svg width="${breite}" height="${KOPF}"><text x="${PAD}" y="24" font-family="sans-serif" font-size="19" font-weight="700" fill="#B9B3C6">links Wolfs fuenf Beispiele  ·  rechts fuenf schwierige aus dem Set</text></svg>`),
  left: 0, top: 4,
});

mkdirSync('.shots', { recursive: true });
writeFileSync(OUT, await sharp({
  create: { width: breite, height: hoehe, channels: 4, background: '#120F18' },
}).composite(ebenen).png().toBuffer());
console.log(`-> ${OUT} (${breite} x ${hoehe})`);
