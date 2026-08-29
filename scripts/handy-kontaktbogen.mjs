/* handy-kontaktbogen — die ganze Team-View auf einem Blatt.
 *
 * 2026-08-29, Wolf: „gib mir nach allen aenderungen einen kontaktbogen der
 * ganzen team view im default design."
 *
 * Ein Kontaktbogen zeigt alle Ansichten NEBENEINANDER und in gleicher Groesse.
 * Das ist etwas anderes als eine Reihe von Einzelbildern: nebeneinander sieht
 * man, was zusammengehoert und was aus der Reihe faellt - eine Karte, die
 * anders sitzt, eine Ueberschrift, die anders gross ist, eine Farbe, die nur
 * an einer Stelle vorkommt. Genau dafuer gibt es das Format.
 *
 * ⚠️ Der Bogen zeigt jede Ansicht in voller Hoehe (390x844), nicht
 * beschnitten. Ein Beschnitt waere bequemer zu lesen und wuerde genau das
 * verstecken, wofuer der Bogen da ist: wieviel Leerraum unter dem Inhalt
 * steht und ob eine Ansicht ueber die Kante laeuft.
 *
 * Gefahren wird das STANDARDDESIGN (`buehne`), also das, was am Abend laeuft.
 * Fuer CrowdQuiz `--mega`, fuer die Kolosseum-Kulisse `--look=kolosseum`.
 *
 * VORAUSSETZUNG: Backend (4000, frisch) + Frontend (5173).
 * NUTZUNG:
 *   node scripts/handy-kontaktbogen.mjs
 *   node scripts/handy-kontaktbogen.mjs --mega
 */
import { mkdirSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { handyStarten, sleep, HANDY } from './lib/handy.mjs';

const mega = process.argv.includes('--mega');
/* Look wie im Wizard: 'standard' (CozyQuiz-Standarddesign, der Default seit
 * 2026-08-28) oder 'kolosseum' (die waehlbare CrowdQuiz-Kulisse). */
const look = (process.argv.find(a => a.startsWith('--look=')) ?? '--look=standard').split('=')[1];
const SECS = Number((process.argv.find(a => a.startsWith('--secs=')) ?? '--secs=210').split('=')[1]);
const OUT = `.shots/kontaktbogen${mega ? '-crowd' : ''}${look === 'kolosseum' ? '-kolosseum' : ''}`;

const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const NAME = {
  SETUP: 'Beitreten', LOBBY: 'Lobby', RULES: 'Regeln', MENUE: 'Menue',
  TEAMS_REVEAL: 'Team-Vorstellung', PHASE_INTRO: 'Runden-Intro',
  QUESTION_ACTIVE: 'Frage laeuft', QUESTION_REVEAL: 'Aufloesung',
  PLACEMENT: 'Setzen', PAUSED: 'Pause', GAME_OVER: 'Spielende',
  FINAL_BETTING: 'Finalwette', FINAL_REVEAL: 'Finalaufloesung',
};

/* Ordner leeren, nicht nur anlegen. Ein kuerzerer Lauf laesst sonst die Bilder
 * des laengeren stehen: am 2026-08-29 lagen im Standard-Ordner neun Ansichten
 * aus zwei Laeufen, drei davon aus der Zeit vor einer Aenderung. Ein Bogen, der
 * Altes und Neues mischt, luegt lautlos. */
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (/\.png$/.test(f)) rmSync(`${OUT}/${f}`);
const bilder = [];
const merke = async (seite, name) => {
  const pfad = `${OUT}/${String(bilder.length + 1).padStart(2, '0')}-${name}.png`;
  await seite.screenshot({ path: pfad });
  bilder.push({ name, pfad });
  console.log(`  ✓ ${name}`);
};

const b = await handyStarten({
  mega, secs: SECS, look,
  vorBeitritt: async (seite) => { await merke(seite, 'SETUP'); },
});
await b.abendMitfahren(async (phase) => { await merke(b.handy, phase); });

/* Menue zum Schluss - mittendrin geoeffnet laesst es den Abend stehen
 * (siehe scripts/handy-bedienung.mjs, derselbe Fund). */
if (await b.oeffnen('menue')) { await merke(b.handy, 'MENUE'); await b.schliessen('menue'); }
await b.schliessen();

/* ── Das Blatt ────────────────────────────────────────────────────────────── */
const SPALTEN = Math.min(5, Math.max(3, Math.ceil(Math.sqrt(bilder.length))));
const ZEILEN = Math.ceil(bilder.length / SPALTEN);
const BREITE = 300;                                   // Kachelbreite auf dem Bogen
const HOEHE = Math.round(BREITE * HANDY.height / HANDY.width);
const KOPF = 34;                                      // Platz fuer die Beschriftung
const RAND = 26, LUFT = 20;
const blattB = RAND * 2 + SPALTEN * BREITE + (SPALTEN - 1) * LUFT;
const blattH = RAND * 2 + 72 + ZEILEN * (HOEHE + KOPF) + (ZEILEN - 1) * LUFT;

/* Die Farben des Bogens sind die der Buehne, nicht frei gewaehlt: der Bogen
 * soll wie ein Blatt aus demselben Haus aussehen wie das, was er zeigt. */
const GRUND = '#0F0817', TINTE = '#F3EFE7', LEISE = '#B9B3C6';

const schutz = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const beschriftung = bilder.map((bi, i) => {
  const sp = i % SPALTEN, ze = Math.floor(i / SPALTEN);
  const x = RAND + sp * (BREITE + LUFT);
  const y = RAND + 72 + ze * (HOEHE + KOPF + LUFT);
  // ⚠️ Der technische Name steht RECHTSBUENDIG an der Kachelkante, nicht mit
  // einem gerechneten Abstand hinter dem lesbaren. Die erste Fassung schob ihn
  // um `Laenge * 8,4 px` weiter - eine geschaetzte Zeichenbreite, und bei
  // „Team-Vorstellung" lagen beide uebereinander. Textbreite laesst sich in
  // einem SVG ohne Schriftmetrik nicht rechnen; also gar nicht rechnen.
  return `<text x="${x}" y="${y + HOEHE + 21}" fill="${TINTE}" font-family="sans-serif" font-size="15" font-weight="700">${schutz(NAME[bi.name] ?? bi.name)}</text>`
    + `<text x="${x + BREITE}" y="${y + HOEHE + 21}" text-anchor="end" fill="${LEISE}" font-family="monospace" font-size="11">${schutz(bi.name)}</text>`;
}).join('');

const kopf = `
  <text x="${RAND}" y="${RAND + 26}" fill="${TINTE}" font-family="sans-serif" font-size="24" font-weight="800">
    /team &#183; ${mega ? 'CrowdQuiz' : 'CozyQuiz'} ${look === 'kolosseum' ? 'im Kolosseum-Look' : 'im Standarddesign'}
  </text>
  <text x="${RAND}" y="${RAND + 50}" fill="${LEISE}" font-family="sans-serif" font-size="14">
    ${bilder.length} Ansichten &#183; ${HANDY.width}x${HANDY.height} &#183; ${new Date().toISOString().slice(0, 10)}
  </text>`;

const svg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${blattB}" height="${blattH}">`
  + `<rect width="${blattB}" height="${blattH}" fill="${GRUND}"/>${kopf}${beschriftung}</svg>`);

const kacheln = [];
for (let i = 0; i < bilder.length; i++) {
  const sp = i % SPALTEN, ze = Math.floor(i / SPALTEN);
  kacheln.push({
    input: await sharp(bilder[i].pfad).resize(BREITE, HOEHE, { fit: 'fill' }).png().toBuffer(),
    left: RAND + sp * (BREITE + LUFT),
    top: RAND + 72 + ze * (HOEHE + KOPF + LUFT),
  });
}

const ziel = `${OUT}/KONTAKTBOGEN.png`;
await sharp(svg).composite(kacheln).png({ compressionLevel: 9 }).toFile(ziel);
writeFileSync(`${OUT}/ANSICHTEN.json`, JSON.stringify(bilder.map(b => b.name), null, 2));
console.log(`\nKontaktbogen: ${ziel}  (${blattB}x${blattH}, ${bilder.length} Ansichten)`);
