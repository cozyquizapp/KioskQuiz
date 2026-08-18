/**
 * mark-carrier-study.mjs — Traegerform-Studie fuer die CozyQuiz-Team-Marken.
 *
 * Anlass (Wolf 2026-08-18): eigene Marken fuer CozyQuiz. Die Arena-Wappen
 * bestehen die Distanz-Probe, gehoeren aber zur Bildsprache des Kolosseums.
 * CozyQuiz braucht eine eigene Form, die dieselbe Regel erfuellt.
 *
 * DIE REGEL, empirisch aus scripts/avatar-contact-sheet.mjs:
 *   EINE einfache Form mit hohem Hell-Dunkel-Kontrast pro Marke.
 *   Nicht die Aussen-Silhouette entscheidet (die Wappen teilen sich alle das
 *   Schild und funktionieren trotzdem), sondern dass das Motiv gross, klar und
 *   kontrastreich auf dem Grund sitzt. Kleinteile unter ~1/6 der Marke
 *   verschwinden auf Beamer-Distanz zuerst — daran scheitern die Gesichter in
 *   Blockz/Quirks und die Tierdetails in Cozy 3D.
 *
 * Diese Studie vergleicht drei TRAEGER bei IDENTISCHEN Platzhalter-Motiven,
 * damit die Entscheidung ueber die Form faellt und nicht ueber die Zeichnung.
 * Die Motive sind bewusst grobe Geometrie, KEIN Gestaltungsvorschlag.
 *
 * NUTZUNG: node scripts/mark-carrier-study.mjs   -> .shots/avatare/traeger-*.png
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = require('sharp');

const OUT = '.shots/avatare';
mkdirSync(OUT, { recursive: true });

const BG = '#0A0814';
const CREAM = '#F5ECD8';
const SIZE_STAGE = 68, SIZE_PHONE = 32, SIZE_FAR = 22;
const SLOT_COLORS = ['#F97316', '#22C55E', '#14B8A6', '#A855F7', '#FACC15', '#3B82F6', '#EC4899', '#EF4444'];

// Platzhalter-Motive in einem 100x100-Feld, bewusst grob und gross.
const MOTIFS = {
  mond:  'M64 22a34 34 0 1 0 0 56 27 27 0 1 1 0-56z',
  krug:  'M26 30h38v44a8 8 0 0 1-8 8H34a8 8 0 0 1-8-8zM66 40h6a12 12 0 0 1 0 24h-6z',
  blitz: 'M58 18 32 56h16l-8 28 28-40H52z',
  stern: 'M50 16 61 40l26 3-19 18 5 26-23-13-23 13 5-26-19-18 26-3z',
};
const MOTIF_KEYS = Object.keys(MOTIFS);

/** Traeger A — Aufnaeher: weiche Kachel mit Stickrand. Vereinsabzeichen-Ton. */
const patch = (color, d) => `
  <rect x="6" y="6" width="88" height="88" rx="26" fill="${color}"/>
  <rect x="6" y="6" width="88" height="88" rx="26" fill="none" stroke="${CREAM}" stroke-width="7"/>
  <rect x="15" y="15" width="70" height="70" rx="19" fill="none" stroke="${CREAM}"
        stroke-width="2.5" stroke-dasharray="5 5" opacity="0.75"/>
  <path d="${d}" fill="${CREAM}" transform="translate(50 50) scale(0.62) translate(-50 -50)"/>`;

/** Traeger B — Deckel: Kreis mit Rand, Bierdeckel/Stempel. Bar-Ton. */
const coaster = (color, d) => `
  <circle cx="50" cy="50" r="45" fill="${color}"/>
  <circle cx="50" cy="50" r="45" fill="none" stroke="${CREAM}" stroke-width="6"/>
  <circle cx="50" cy="50" r="36" fill="none" stroke="${CREAM}" stroke-width="2.5" opacity="0.75"/>
  <path d="${d}" fill="${CREAM}" transform="translate(50 50) scale(0.6) translate(-50 -50)"/>`;

/** Traeger C — freie Marke: kein Traeger, das Motiv IST die Marke. */
const free = (color, d) => `
  <path d="${d}" fill="${color}" stroke="${CREAM}" stroke-width="5" stroke-linejoin="round"
        transform="translate(50 50) scale(0.95) translate(-50 -50)"/>`;

const CARRIERS = [
  { id: 'aufnaeher', label: 'A — Aufnaeher', note: 'Kachel mit Stickrand. Ton: Verein, Crew, Abzeichen.', fn: patch },
  { id: 'deckel',    label: 'B — Deckel',    note: 'Kreis mit Rand, wie Bierdeckel. Ton: Bar, Abend, Runde.', fn: coaster },
  { id: 'frei',      label: 'C — freie Marke', note: 'Kein Traeger, das Motiv ist die Marke. Ton: leicht, modern.', fn: free },
];

async function render(svgInner, size) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">${svgInner}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
async function far(buf, size) {
  const small = await sharp(buf).resize(SIZE_FAR, SIZE_FAR, { kernel: 'lanczos3' }).png().toBuffer();
  return sharp(small).resize(size, size, { kernel: 'nearest' }).png().toBuffer();
}

const PAD = 26, GAP = 22, ROW_LBL = 22, COLS = 4;
for (const c of CARRIERS) {
  const rowW = COLS * SIZE_STAGE + (COLS - 1) * GAP;
  const W = rowW + PAD * 2;
  const H = PAD + 54 + 3 * (SIZE_STAGE + ROW_LBL) + PAD;
  const layers = [];
  let y = PAD + 54;

  const rows = [
    { size: SIZE_STAGE, label: 'BUEHNE 68px', far: false },
    { size: SIZE_STAGE, label: 'BUEHNE aus ~10 Metern', far: true },
    { size: SIZE_PHONE, label: 'HANDY 32px (Nahsicht)', far: false },
  ];
  for (const row of rows) {
    for (let i = 0; i < COLS; i++) {
      let buf = await render(c.fn(SLOT_COLORS[i], MOTIFS[MOTIF_KEYS[i]]), row.size);
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
      <text x="0" y="24" font-family="DejaVu Sans, sans-serif" font-size="20" font-weight="bold" fill="#ffffff">${c.label}</text>
      <text x="0" y="45" font-family="DejaVu Sans, sans-serif" font-size="13" fill="#94a3b8">${c.note}</text></svg>`),
    left: PAD, top: PAD,
  });

  await sharp({ create: { width: W, height: H, channels: 4, background: BG } })
    .composite(layers).png().toFile(`${OUT}/traeger-${c.id}.png`);
  console.log(`✓ ${OUT}/traeger-${c.id}.png`);
}
console.log('\nMotive sind Platzhalter. Verglichen wird die TRAEGERFORM, nicht die Zeichnung.');
