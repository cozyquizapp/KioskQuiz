/* farbwelten-probe — die Kategoriefarben von heute gegen den Vorschlag.
 *
 * 2026-08-26. Offener Punkt aus dem Vorlauf vom 18.08.: „Kategoriefarben
 * nachziehen (Tabelle in BUEHNEN_DESIGN.md, Abschnitt 6)". Der Brief begruendet
 * es so: die heutigen Werte sind Tailwind-Standardfarben und wirken in einem
 * gehobenen System beliebig, weil sie in tausend Produkten stecken.
 *
 * ── Was heute wirklich laeuft ──────────────────────────────────────────────
 * ⚠️ Die Spalte „heute" im Brief nennt QQ_CATEGORY_COLORS (#3B82F6 usw.). Die
 * BUEHNE benutzt die aber gar nicht - sie liest QQ_CATEGORY_THEME.accent
 * (#60A5FA usw.) und baut den Grund mit `qqCategoryStageBg`:
 *
 *     radial-gradient(circle at 50% -8%,
 *       rgba(accent,0.42) 0%, deep 46%, #120F18 100%)
 *
 * Die aeussere Stufe ist also bei ALLEN Kategorien dieselbe. Der Vorschlag im
 * Brief gibt jeder Kategorie drei eigene Stufen, auch aussen, und geht dort
 * deutlich dunkler. Das ist der eigentliche Unterschied, nicht der Akzent.
 *
 * ── Warum gemessen wird ────────────────────────────────────────────────────
 * Der Brief nennt selbst zwei Bedingungen (Abschnitt 7): Lichtabgabe unter
 * 12 Prozent, sonst blendet es im dunklen Raum koerperlich. Ein Farbvorschlag
 * ist deshalb keine reine Geschmacksfrage - er hat eine Zahl. Diese Probe
 * liefert Bild UND Zahl, je Kategorie, fuer beide Fassungen.
 *
 * NUTZUNG:  node scripts/farbwelten-probe.mjs
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

/** Der Vorschlag aus docs/BUEHNEN_DESIGN.md, Abschnitt 6. */
const VORSCHLAG = {
  'Schätzchen':  { akzent: '#FFB03A', stufen: ['#2A1B06', '#1A1004', '#0B0702'] },
  'Mu-Cho':      { akzent: '#4C8DFF', stufen: ['#101A33', '#0A1122', '#05080F'] },
  'Bunte Tüte':  { akzent: '#F2543D', stufen: ['#2B0D0A', '#1A0705', '#0A0302'] },
  '10 von 10':   { akzent: '#3ED67F', stufen: ['#0B2418', '#071609', '#030A05'] },
  'Schau mal!':  { akzent: '#9B6BFF', stufen: ['#1A1030', '#100A1E', '#06040C'] },
};

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();
fs.mkdirSync('.shots', { recursive: true });

/** Mittlere relative Leuchtdichte in Prozent - dieselbe Rechnung wie in
 *  scripts/beamer-tauglichkeit.mjs, damit die Zahlen vergleichbar sind. */
async function licht(roh) {
  const { data, info } = await sharp(roh).resize(440).raw().toBuffer({ resolveWithObject: true });
  const k = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  let summe = 0, n = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    summe += 0.2126 * k(data[i]) + 0.7152 * k(data[i + 1]) + 0.0722 * k(data[i + 2]);
    n++;
  }
  return (summe / n) * 100;
}

// ⚠️ Ohne Ruecksicht auf Gross- und Kleinschreibung vergleichen. Die
// Kategorie-Pille auf der Fragefolie steht per CSS in Grossbuchstaben, und der
// erste Anlauf hat mit exakter Schreibweise gesucht und keine einzige
// Kategorie gefunden.
const welcheKategorie = () => seite.evaluate((namen) => {
  const t = (document.querySelector('[data-qq-buehne]')?.textContent ?? '')
    .replace(/\s+/g, ' ').toLowerCase();
  return namen.find(n => t.includes(n.toLowerCase())) ?? null;
}, Object.keys(VORSCHLAG));

const gefunden = new Map();

await b.zurStation('rundenintro');
await sleep(2500);

for (let frage = 0; frage < 9 && gefunden.size < 5; frage++) {
  for (let stufe = 0; stufe < 4; stufe++) {
    await h.emit('qq:activateQuestion');
    await sleep(800);
  }
  await sleep(700);
  const kat = await welcheKategorie();
  if (kat && !gefunden.has(kat)) {
    // 1) Der Ist-Zustand.
    const heute = await seite.screenshot({ type: 'png' });
    // 2) Der Vorschlag, eingespritzt. Nur Akzent und Grund - alles andere
    //    bleibt, sonst vergleicht man zwei Dinge auf einmal.
    const v = VORSCHLAG[kat];
    await seite.evaluate(({ akzent, stufen }) => {
      document.getElementById('qq-farbprobe')?.remove();
      const s = document.createElement('style');
      s.id = 'qq-farbprobe';
      s.textContent = `
        [data-qq-stage='2a'] {
          --qq-stage-accent: ${akzent} !important;
          background: radial-gradient(circle at 50% -8%,
            ${stufen[0]} 0%, ${stufen[1]} 46%, ${stufen[2]} 100%) !important;
        }
      `;
      document.head.appendChild(s);
    }, v);
    await sleep(700);
    const neu = await seite.screenshot({ type: 'png' });
    await seite.evaluate(() => document.getElementById('qq-farbprobe')?.remove());
    await sleep(400);

    const lHeute = await licht(heute), lNeu = await licht(neu);
    gefunden.set(kat, { heute, neu, lHeute, lNeu });
    console.log(`  ${kat.padEnd(12)} Licht heute ${lHeute.toFixed(1)} %  ->  Vorschlag ${lNeu.toFixed(1)} %`);
  }
  await h.emit('qq:revealAnswer'); await sleep(700);
  await h.emit('qq:nextQuestion'); await sleep(1300);
}

console.log('\n══ Lichtabgabe ═════════════════════════════════════════════════');
console.log('  Grenze aus docs/BUEHNEN_DESIGN.md, Abschnitt 7: unter 12 Prozent.');
console.log('  Ueber 22 Prozent blendet es im dunklen Raum koerperlich.');
for (const [k, v] of gefunden) {
  const ok = (x) => (x < 12 ? '✓' : x < 22 ? '!' : '✗');
  console.log(`  ${k.padEnd(12)} heute ${ok(v.lHeute)} ${v.lHeute.toFixed(1)} %   Vorschlag ${ok(v.lNeu)} ${v.lNeu.toFixed(1)} %`);
}

// ── Das Blatt: je Kategorie eine Zeile, links heute, rechts Vorschlag ──────
if (gefunden.size) {
  const BREITE = 700, BES = 26, zeilen = [];
  for (const [k, v] of gefunden) {
    const a = await sharp(v.heute).resize(BREITE).toBuffer();
    const c = await sharp(v.neu).resize(BREITE).toBuffer();
    zeilen.push({ k, a, c, h: (await sharp(a).metadata()).height, v });
  }
  const zh = Math.max(...zeilen.map(z => z.h));
  const W = BREITE * 2 + 24, H = zeilen.length * (zh + BES) + 8;
  const teile = [], texte = [];
  zeilen.forEach((z, i) => {
    const y = 8 + i * (zh + BES);
    teile.push({ input: z.a, left: 8, top: y + BES });
    teile.push({ input: z.c, left: BREITE + 16, top: y + BES });
    texte.push(
      `<text x="8" y="${y + 18}" font-family="monospace" font-size="15" fill="#fff">${z.k} — heute (${z.v.lHeute.toFixed(1)} % Licht)</text>`
      + `<text x="${BREITE + 16}" y="${y + 18}" font-family="monospace" font-size="15" fill="#ffd08a">${z.k} — Vorschlag (${z.v.lNeu.toFixed(1)} % Licht)</text>`,
    );
  });
  await sharp({ create: { width: W, height: H, channels: 3, background: '#111' } })
    .composite([...teile, { input: Buffer.from(`<svg width="${W}" height="${H}">${texte.join('')}</svg>`), left: 0, top: 0 }])
    .png().toFile('.shots/FARBWELTEN.png');
  console.log('\n.shots/FARBWELTEN.png geschrieben');
}

await b.schliessen?.();
process.exit(0);
