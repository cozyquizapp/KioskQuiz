/* handy-look-gegenueber — die beiden CrowdQuiz-Looks Ansicht fuer Ansicht
 * nebeneinander.
 *
 * 2026-08-29, Wolf: „zeig mir bitte einmal beide looks nebeneinander?"
 *
 * Der Wizard bietet in CrowdQuiz zwei Looks an (QQSetupFlow.tsx, Schritt
 * „Look"): CozyQuiz Standard und Mit Kolosseum. Beide sind gueltige Abende,
 * und die einzige ehrliche Art, sie zu vergleichen, ist dieselbe Station
 * nebeneinander - nicht zwei Bogen hintereinander, zwischen denen man blaettert.
 *
 * ⚠️ Dieses Werkzeug MISST nichts und faehrt auch nichts. Es setzt zusammen,
 * was scripts/handy-kontaktbogen.mjs vorher aufgenommen hat. Zwei Abende in
 * einem Aufruf sprengen die Zeitgrenze, und ein Bogen, der die Haelfte seiner
 * Bilder aus einem alten Lauf nimmt, luegt lautlos - deshalb prueft es das
 * Alter der Ordner und sagt es dazu.
 *
 * VORHER (je einmal, in beliebiger Reihenfolge):
 *   node scripts/handy-kontaktbogen.mjs --mega
 *   node scripts/handy-kontaktbogen.mjs --mega --look=kolosseum
 * DANN:
 *   node scripts/handy-look-gegenueber.mjs
 */
import { readdirSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const LINKS = '.shots/kontaktbogen-crowd';
const RECHTS = '.shots/kontaktbogen-crowd-kolosseum';
const OUT = '.shots/look-gegenueber';

const NAME = {
  SETUP: 'Beitreten', LOBBY: 'Lobby', RULES: 'Regeln', MENUE: 'Menue',
  TEAMS_REVEAL: 'Team-Vorstellung', PHASE_INTRO: 'Runden-Intro',
  QUESTION_ACTIVE: 'Frage laeuft', QUESTION_REVEAL: 'Aufloesung',
};

/* Der Kontaktbogen legt seine Bilder als `NN-STATION.png` ab; ANSICHTEN.json
 * daneben ist nur die Reihenfolge, nicht die Pfade. Gelesen wird deshalb der
 * Ordner selbst - dann kann hier auch nichts auseinanderlaufen. */
const lesen = (ordner, titel) => {
  const datei = `${ordner}/ANSICHTEN.json`;
  if (!existsSync(datei)) {
    console.error(`\n⚠️  ${datei} fehlt. Erst den Kontaktbogen fuer „${titel}" fahren (Kopf dieser Datei).`);
    process.exit(1);
  }
  const alter = Math.round((Date.now() - statSync(datei).mtimeMs) / 60000);
  const bilder = readdirSync(ordner)
    .filter(f => /^\d\d-.+\.png$/.test(f))
    .sort()
    .map(f => ({ name: f.replace(/^\d\d-/, '').replace(/\.png$/, ''), pfad: `${ordner}/${f}` }));
  console.log(`${titel}: ${ordner} (${bilder.length} Ansichten, vor ${alter} min aufgenommen)`);
  return { bilder, alter };
};

const a = lesen(LINKS, 'CozyQuiz Standard');
const b = lesen(RECHTS, 'Mit Kolosseum');
if (Math.abs(a.alter - b.alter) > 90) {
  console.log('\n⚠️  Die beiden Aufnahmen liegen mehr als 90 Minuten auseinander.');
  console.log('   Was dazwischen im Code passiert ist, sieht man auf diesem Blatt als');
  console.log('   Look-Unterschied. Im Zweifel beide Bogen neu fahren.');
}

/* Nur Stationen, die BEIDE Seiten haben - dieselbe Regel wie in
 * handy-crowd-abgleich.mjs, und aus demselben Grund. */
const idx = (l) => new Map(l.map(bi => [bi.name, bi.pfad]));
const A = idx(a.bilder), B = idx(b.bilder);
const gemeinsam = [...A.keys()].filter(n => B.has(n));
const nurEine = [...new Set([...A.keys(), ...B.keys()])].filter(n => !gemeinsam.includes(n));
if (!gemeinsam.length) { console.error('\n⚠️  Keine gemeinsame Station.'); process.exit(1); }

const BREITE = 250;
const HOEHE = Math.round(BREITE * 844 / 390);
const RAND = 26, LUFT = 16, PAAR = 46, KOPF = 30;
const blattB = RAND * 2 + gemeinsam.length * (BREITE * 2 + LUFT) + (gemeinsam.length - 1) * PAAR;
const blattH = RAND * 2 + 92 + HOEHE + KOPF;

const GRUND = '#0F0817', TINTE = '#F3EFE7', LEISE = '#B9B3C6';
const schutz = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const teile = [], text = [];
gemeinsam.forEach((n, i) => {
  const x = RAND + i * (BREITE * 2 + LUFT + PAAR);
  const y = RAND + 92;
  teile.push({ pfad: A.get(n), x, y }, { pfad: B.get(n), x: x + BREITE + LUFT, y });
  text.push(
    `<text x="${x}" y="${y - 10}" fill="${TINTE}" font-family="sans-serif" font-size="15" font-weight="700">${schutz(NAME[n] ?? n)}</text>`,
    `<text x="${x + BREITE / 2}" y="${y + HOEHE + 20}" text-anchor="middle" fill="${LEISE}" font-family="sans-serif" font-size="12">Standard</text>`,
    `<text x="${x + BREITE + LUFT + BREITE / 2}" y="${y + HOEHE + 20}" text-anchor="middle" fill="${LEISE}" font-family="sans-serif" font-size="12">Kolosseum</text>`,
  );
});

const kopf = `
  <text x="${RAND}" y="${RAND + 26}" fill="${TINTE}" font-family="sans-serif" font-size="24" font-weight="800">/team &#183; die beiden CrowdQuiz-Looks</text>
  <text x="${RAND}" y="${RAND + 50}" fill="${LEISE}" font-family="sans-serif" font-size="14">links CozyQuiz Standard &#183; rechts Mit Kolosseum &#183; ${gemeinsam.length} Stationen &#183; 390x844 &#183; ${new Date().toISOString().slice(0, 10)}</text>
  <text x="${RAND}" y="${RAND + 70}" fill="${LEISE}" font-family="sans-serif" font-size="12">Die Fraktion wird pro Lauf neu gezogen &#8211; unterschiedliche Wappen und Farben sind kein Look-Unterschied.${nurEine.length ? ` &#183; nicht gezeigt, weil nur eine Seite sie hatte: ${schutz(nurEine.join(', '))}` : ''}</text>`;

const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${blattB}" height="${blattH}">${kopf}${text.join('')}</svg>`);

mkdirSync(OUT, { recursive: true });
const lagen = await Promise.all(teile.map(async t => ({
  input: await sharp(t.pfad).resize(BREITE, HOEHE).toBuffer(), left: t.x, top: t.y,
})));
await sharp({ create: { width: blattB, height: blattH, channels: 4, background: GRUND } })
  .composite([...lagen, { input: svg, left: 0, top: 0 }])
  .png().toFile(`${OUT}/LOOKS.png`);
console.log(`\n${OUT}/LOOKS.png  (${blattB}x${blattH}, ${gemeinsam.length} Stationen)`);
