/**
 * avatar-contact-sheet.mjs — Vergleichstafel der Team-Marken in den GEMESSENEN
 * Groessen, plus Distanz-Probe.
 *
 * Anlass (Wolf 2026-08-18): neue Team-Avatare, „Jackbox-Stil ging nach hinten
 * los". Der Kern des Problems ist nicht die Zeichnung, sondern die Zuordnung:
 * bei Jackbox vertritt eine Figur EINEN Menschen an EINEM Handy, bei CozyQuiz
 * sitzen mehrere an einem Geraet. Eine Gruppe wird nicht von einem Gesicht
 * vertreten, sondern von einem Wappen.
 *
 * Diese Tafel prueft das nicht mit Meinung, sondern mit den Zahlen aus
 * scripts/measure-avatar-sizes.mjs:
 *   Buehne  : groesste Marke 108px, KLEINSTE 68px
 *   Handy   : groesste  48px, KLEINSTE 32px
 *
 * Drei Zeilen je Satz:
 *   1) 68px  — kleinste Groesse auf der Buehne
 *   2) 32px  — kleinste Groesse auf dem Handy
 *   3) Distanz-Probe: 68px auf 22px heruntergerechnet und zurueck (die Buehne
 *      wird auf ~560px Breite skaliert betrachtet = 10-Meter-Simulation, das
 *      Verfahren aus HANDOFF_DESIGN_MOTION.md). Was hier noch unterscheidbar
 *      ist, traegt im Raum. Was zu einem Farbfleck wird, traegt nicht.
 *
 * NUTZUNG: node scripts/avatar-contact-sheet.mjs   -> .shots/avatare/*.png
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = require('sharp');

const PUB = new URL('../frontend/public/avatars/', import.meta.url).pathname;
const OUT = '.shots/avatare';
mkdirSync(OUT, { recursive: true });

// Slot-Farben aus shared/quarterQuizTypes.ts (QQ_AVATARS[].color).
const SLOT_COLORS = ['#F97316', '#22C55E', '#14B8A6', '#A855F7', '#FACC15', '#3B82F6', '#EC4899', '#EF4444'];
const BG = '#0A0814';        // Buehnen-Grund
const SIZE_STAGE = 68;       // gemessen: kleinste Marke auf der Buehne
const SIZE_PHONE = 32;       // gemessen: kleinste Marke auf dem Handy
const SIZE_FAR = 22;         // 68px * (560/1760) = 10-Meter-Simulation

const SETS = [
  {
    id: 'cozy3d', label: 'Cozy 3D (Standard im Raum)',
    note: 'Tierfigur auf Farb-Disc. Charakter = Tier.',
    files: ['hund', 'faultier', 'pinguin', 'koala', 'giraffe', 'waschbaer', 'kuh', 'capybara']
      .map((s) => `${PUB}cozy3d/${s}.png`),
    disc: true,
  },
  {
    id: 'blockz', label: 'Blockz',
    note: 'Kachel mit Gesicht, Farbe gebacken, eigener Schnitt je Motiv.',
    files: ['solo', 'trio', 'tetra', 'bands', 'sash', 'seam', 'slash', 'oval']
      .map((s) => `${PUB}blockz/${s}-base.webp`),
    disc: false,
  },
  {
    id: 'quirks2', label: 'Cozy Quirks 2.0',
    note: 'Kachel mit Gesicht, Farbe gebacken.',
    files: ['duo', 'orbit', 'prisma', 'quad', 'ripple', 'split', 'stack', 'wink']
      .map((s) => `${PUB}quirks2/${s}-open.webp`),
    disc: false,
  },
  {
    id: 'cozyarena', label: 'CozyArena-Wappen (Gegenprobe: Emblem statt Gesicht)',
    note: 'Wappenform, eigene Silhouette je Fraktion. Vertritt eine GRUPPE.',
    files: ['allwissen', 'bauchgefuehl', 'einspruch', 'feierabend', 'glueckstreffer', 'improvisation', 'letztesekunde', 'risiko']
      .map((s) => `${PUB}cozyarena/${s}-emblem.png`),
    disc: false,
  },
];

/** Eine Marke in Zielgroesse rendern, optional auf Farb-Disc (wie die App). */
async function mark(file, size, color, disc) {
  const inner = disc ? Math.round(size * 0.9) : size;
  const img = await sharp(file).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  if (!disc) return sharp(img).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const circle = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${color}"/></svg>`,
  );
  return sharp(circle)
    .composite([{ input: img, gravity: 'center' }])
    .png().toBuffer();
}

/** Distanz-Probe: klein rechnen, wieder gross ziehen. Simuliert 10 Meter. */
async function far(buf, size) {
  const small = await sharp(buf).resize(SIZE_FAR, SIZE_FAR, { kernel: 'lanczos3' }).png().toBuffer();
  return sharp(small).resize(size, size, { kernel: 'nearest' }).png().toBuffer();
}

const PAD = 26, GAP = 22, ROW_LBL = 22;
for (const set of SETS) {
  const cols = set.files.length;
  const rowW = cols * SIZE_STAGE + (cols - 1) * GAP;
  const W = rowW + PAD * 2;
  const H = PAD + 54 + (SIZE_STAGE + ROW_LBL) + (SIZE_STAGE + ROW_LBL) + (SIZE_STAGE + ROW_LBL) + PAD;

  const layers = [];
  let y = PAD + 54;

  const rows = [
    { size: SIZE_STAGE, label: `68px — kleinste Marke auf der BUEHNE`, far: false },
    { size: SIZE_PHONE, label: `32px — kleinste Marke auf dem HANDY`, far: false },
    { size: SIZE_STAGE, label: `Distanz-Probe: dasselbe aus ~10 Metern`, far: true },
  ];

  for (const row of rows) {
    for (let i = 0; i < cols; i++) {
      let buf = await mark(set.files[i], row.size, SLOT_COLORS[i % 8], set.disc);
      if (row.far) buf = await far(buf, row.size);
      layers.push({
        input: buf,
        left: PAD + i * (SIZE_STAGE + GAP) + Math.round((SIZE_STAGE - row.size) / 2),
        top: y + Math.round((SIZE_STAGE - row.size) / 2),
      });
    }
    layers.push({
      input: Buffer.from(`<svg width="${rowW}" height="${ROW_LBL}"><text x="0" y="15" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#94a3b8">${row.label}</text></svg>`),
      left: PAD, top: y + SIZE_STAGE + 2,
    });
    y += SIZE_STAGE + ROW_LBL;
  }

  layers.push({
    input: Buffer.from(`<svg width="${rowW}" height="54">
      <text x="0" y="24" font-family="DejaVu Sans, sans-serif" font-size="20" font-weight="bold" fill="#ffffff">${set.label}</text>
      <text x="0" y="45" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#94a3b8">${set.note}</text></svg>`),
    left: PAD, top: PAD,
  });

  await sharp({ create: { width: W, height: H, channels: 4, background: BG } })
    .composite(layers).png().toFile(`${OUT}/${set.id}.png`);
  console.log(`✓ ${OUT}/${set.id}.png  (${W}x${H})`);
}
console.log('\nFertig. Massgeblich ist die dritte Zeile je Tafel.');
