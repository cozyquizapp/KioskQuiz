/* kategoriefarben-blatt — alle fuenf Kategorie-Intros nebeneinander.
 *
 * 2026-08-26. Offener Beamer-Check-Punkt, seit Wochen: „Kategorie-Intro-Farben
 * — jede Kategorie in ihrer Eigenfarbe, NUR Progress-Tree pink?"
 *
 * Das ist eine Frage, die man nur beantworten kann, wenn man die fuenf Folien
 * NEBENEINANDER sieht. Nacheinander durch einen Abend zu klicken und sich an
 * die vorige Farbe zu erinnern, ist genau der Grund, warum der Punkt so lange
 * offen liegt. Also: einmal durch den Abend, jedes Kategorie-Intro abgreifen,
 * ein Blatt daraus.
 *
 * Zusaetzlich zur Ansicht die Zahlen: welche Farbe traegt der Titel wirklich,
 * welche der Grund, welche der Fortschrittsbaum. QQ_CATEGORY_COLORS sagt, was
 * es sein SOLLTE - das Blatt sagt, was es IST.
 *
 * NUTZUNG:  node scripts/kategoriefarben-blatt.mjs
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const SOLL = {
  'Schätzchen':  '#F59E0B',
  'Mu-Cho':      '#3B82F6',
  'Bunte Tüte':  '#EF4444',
  '10 von 10':   '#22C55E',
  'Schau mal!':  '#8B5CF6',
};

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();
fs.mkdirSync('.shots', { recursive: true });

/** Was steht gerade auf der Buehne, und in welchen Farben? */
const lage = () => seite.evaluate((sollNamen) => {
  const buehne = document.querySelector('[data-qq-buehne]') ?? document.body;
  const text = (buehne.textContent ?? '').replace(/\s+/g, ' ');
  // Welche Kategorie ist zu sehen? Die Intro-Folie nennt sie beim Namen.
  const treffer = sollNamen.find(n => text.includes(n)) ?? null;
  // Die groesste farbige Textzeile: das ist der Titel der Folie.
  let groesster = null;
  for (const el of buehne.querySelectorAll('*')) {
    const eigen = [...el.childNodes].filter(n => n.nodeType === 3)
      .map(n => n.textContent.trim()).join('').trim();
    if (!eigen || eigen.length < 2) continue;
    const s = getComputedStyle(el);
    const px = parseFloat(s.fontSize);
    if (!groesster || px > groesster.px) groesster = { text: eigen.slice(0, 28), px: Math.round(px), farbe: s.color };
  }
  // Der Fortschrittsbaum: seine Marke ist der Punkt, um den es in der Frage geht.
  const baum = document.querySelector('[data-qq-baum], .qq-progress-tree');
  let baumFarbe = null;
  if (baum) {
    for (const el of baum.querySelectorAll('*')) {
      const s = getComputedStyle(el);
      const bg = s.backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') { baumFarbe = bg; break; }
    }
  }
  return { kategorie: treffer, titel: groesster, baumFarbe, hatBaum: !!baum };
}, Object.keys(SOLL));

// ── Durch den Abend fahren und jedes Kategorie-Intro abgreifen ──────────────
// Wichtig ist die REIHENFOLGE, und die stand schon in scripts/lib/buehne.mjs:
// `qq:nextQuestion` fuehrt ins Kategorie-Intro, und erst drei `activateQuestion`
// spaeter steht die Frage. Der erste Anlauf hier hat beide Ereignisse blind
// hintereinander geschickt und damit genau das Bild uebersprungen, um das es
// geht - eine Kategorie gefunden statt fuenf. Also: nach jedem nextQuestion im
// Intro stehenbleiben und JEDE Stufe ansehen.
// Zweiter Anlauf: `frage` faehrt schon DURCH das erste Kategorie-Intro
// hindurch bis zur Frage, damit war Kategorie 1 weg, bevor die Aufnahme begann
// (gefunden: drei von fuenf). Start ist deshalb `rundenintro`, also der Punkt
// VOR der ersten Frage, und die Schleife beginnt mit dem Ansehen, nicht mit
// dem Weiterschalten.
await b.zurStation('rundenintro');
await sleep(2500);

const gefunden = new Map();
for (let frage = 0; frage < 8 && gefunden.size < 5; frage++) {
  // Die Stufen des Intros einzeln ansehen, dann erst die Frage starten.
  for (let stufe = 0; stufe < 4; stufe++) {
    const l = await lage();
    if (l.kategorie && l.titel && l.titel.px > 40) {
      const vorher = gefunden.get(l.kategorie);
      if (!vorher || l.titel.px > vorher.titel.px) {
        const datei = `.shots/KAT-${l.kategorie.replace(/[^A-Za-z0-9]/g, '')}.png`;
        await seite.screenshot({ path: datei });
        gefunden.set(l.kategorie, { ...l, datei });
        console.log(`  ${l.kategorie.padEnd(12)} Titel ${l.titel.px}px in ${l.titel.farbe}`);
      }
    }
    await h.emit('qq:activateQuestion');
    await sleep(900);
  }
  // Weiter zur naechsten Frage: erst aufloesen, dann umblaettern.
  await h.emit('qq:revealAnswer'); await sleep(700);
  await h.emit('qq:nextQuestion'); await sleep(1400);
}

console.log('\n── Was gefunden wurde ────────────────────────────────────────');
if (!gefunden.size) console.log('  keine Kategorie-Intros erreicht');
for (const [name, l] of gefunden) {
  console.log(`\n  ${name}`);
  console.log(`    Soll (QQ_CATEGORY_COLORS) : ${SOLL[name]}`);
  console.log(`    Titel auf der Buehne      : ${l.titel?.farbe} (${l.titel?.px} px)`);
  console.log(`    Fortschrittsbaum          : ${l.baumFarbe ?? '(nicht gefunden)'}`);
}

// ── Das Blatt ──────────────────────────────────────────────────────────────
if (gefunden.size) {
  const BREITE = 620, BES = 26, kacheln = [];
  for (const [name, l] of gefunden) {
    const bild = await sharp(l.datei).resize(BREITE).toBuffer();
    kacheln.push({ name, bild, h: (await sharp(bild).metadata()).height });
  }
  const zh = Math.max(...kacheln.map(k => k.h));
  const spalten = Math.min(3, kacheln.length);
  const reihen = Math.ceil(kacheln.length / spalten);
  const W = spalten * BREITE + (spalten + 1) * 8;
  const H = reihen * (zh + BES) + 8;
  const teile = [], texte = [];
  kacheln.forEach((k, i) => {
    const sp = i % spalten, re = Math.floor(i / spalten);
    const x = 8 + sp * (BREITE + 8), y = 8 + re * (zh + BES);
    teile.push({ input: k.bild, left: x, top: y + BES });
    texte.push(`<text x="${x}" y="${y + 18}" font-family="monospace" font-size="15" fill="#fff">${k.name}</text>`);
  });
  await sharp({ create: { width: W, height: H, channels: 3, background: '#111' } })
    .composite([...teile, { input: Buffer.from(`<svg width="${W}" height="${H}">${texte.join('')}</svg>`), left: 0, top: 0 }])
    .png().toFile('.shots/KATEGORIEFARBEN.png');
  console.log('\n.shots/KATEGORIEFARBEN.png geschrieben');
}

await b.schliessen?.();
process.exit(0);
