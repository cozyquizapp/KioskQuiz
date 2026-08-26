/* schrift-probe — dieselbe Folie in mehreren Schriften, nebeneinander.
 *
 * 2026-08-26. „Schrift entscheiden" steht seit dem 18.08. in todo.md und heisst
 * dort „groesster Einzelhebel, bisher Platzhalter". Der Platzhalter ist Nunito
 * (`--font-game` in main.css). League Spartan daneben ist NICHT gemeint: die
 * ist am 2026-07-08 als Wortmarke entschieden und deckungsgleich mit
 * cozywolf.de.
 *
 * Warum der Punkt so lange lag: eine Schriftentscheidung trifft niemand aus
 * einer Liste von Namen. Man muss sie auf der eigenen Folie sehen, in der
 * eigenen Groesse, auf dem eigenen Grund. Genau das macht dieses Werkzeug.
 *
 * ── Wie es arbeitet ────────────────────────────────────────────────────────
 * Es aendert NICHTS am Repo. Die Kandidatenschriften werden als Datei
 * eingelesen, in die laufende Seite als @font-face eingespritzt (data-URI) und
 * `--font-game` darauf umgebogen. Danach ein Bild. Beim naechsten Kandidaten
 * dasselbe. Der Ist-Zustand laeuft als erster Durchgang ohne Eingriff mit,
 * damit es einen ehrlichen Vergleichspunkt gibt.
 *
 * ⚠️ Kandidaten liegen NICHT im Repo. Sie werden vorher heruntergeladen und
 * per --pfad uebergeben. Erst wenn eine gewaehlt ist, kommt sie als woff2
 * nach frontend/public/fonts/ - so wie League Spartan dort liegt.
 *
 * NUTZUNG:
 *   node scripts/schrift-probe.mjs --pfad=/tmp/schrift [--station=frage]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { buehneStarten, sleep } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const arg = (n, s) => process.argv.find(a => a.startsWith(`--${n}=`))?.split('=')[1] ?? s;
const ORDNER = arg('pfad', '');
const STATION = arg('station', 'frage');

// Die Kandidaten. Der Name ist das, was auf dem Blatt steht.
const KANDIDATEN = [
  { datei: null,               name: 'HEUTE (Nunito)',                     richtung: 'Platzhalter' },
  { datei: 'familjen.woff2',   name: 'Familjen Grotesk',                   richtung: 'geometrisch, klar' },
  { datei: 'bricolage.woff2',  name: 'Bricolage Grotesque',                richtung: 'warm mit Kante' },
  { datei: 'fraunces.woff2',   name: 'Fraunces',                           richtung: 'redaktionell, Serif' },
];

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();
fs.mkdirSync('.shots', { recursive: true });

await b.zurStation(STATION);
await sleep(2600);

const bilder = [];
for (const k of KANDIDATEN) {
  if (k.datei) {
    const p = path.join(ORDNER, k.datei);
    if (!fs.existsSync(p)) { console.log(`  ${k.name}: Datei fehlt (${p})`); continue; }
    const b64 = fs.readFileSync(p).toString('base64');
    await seite.evaluate(({ b64, name }) => {
      // Alten Versuch entfernen, sonst stapeln sich die Regeln.
      document.getElementById('qq-schriftprobe')?.remove();
      const s = document.createElement('style');
      s.id = 'qq-schriftprobe';
      s.textContent = `
        @font-face {
          font-family: 'QQProbe';
          src: url(data:font/woff2;base64,${b64}) format('woff2');
          font-weight: 100 900;
          font-display: block;
        }
        /* Nur die Spielschrift tauschen. Die Wortmarke (--font-brand,
           League Spartan) bleibt, die ist entschieden. */
        :root, [data-qq-stage='2a'] {
          --font-game: 'QQProbe', 'Nunito', system-ui, sans-serif !important;
          --qq-font:   'QQProbe', 'Nunito', system-ui, sans-serif !important;
          --font:      'QQProbe', 'Nunito', system-ui, sans-serif !important;
        }
      `;
      document.head.appendChild(s);
      void name;
    }, { b64, name: k.name });
    // Auf die Schrift warten, sonst faellt das Bild auf den Fallback zurueck.
    await seite.evaluate(() => document.fonts.load('900 96px QQProbe').then(() => document.fonts.ready));
    await sleep(900);
  } else {
    await seite.evaluate(() => document.getElementById('qq-schriftprobe')?.remove());
    await sleep(600);
  }

  const roh = await seite.screenshot({ type: 'png' });
  const datei = `.shots/SCHRIFT-${k.name.replace(/[^A-Za-z0-9]/g, '')}.png`;
  fs.writeFileSync(datei, roh);
  bilder.push({ ...k, roh });
  console.log(`  ${k.name.padEnd(22)} ${k.richtung}`);
}

// ── Das Blatt ─────────────────────────────────────────────────────────────
if (bilder.length) {
  const BREITE = 840, BES = 30, kacheln = [];
  for (const bd of bilder) {
    const bild = await sharp(bd.roh).resize(BREITE).toBuffer();
    kacheln.push({ ...bd, bild, h: (await sharp(bild).metadata()).height });
  }
  const zh = Math.max(...kacheln.map(k => k.h));
  const spalten = 2, reihen = Math.ceil(kacheln.length / spalten);
  const W = spalten * BREITE + (spalten + 1) * 10;
  const H = reihen * (zh + BES) + 10;
  const teile = [], texte = [];
  kacheln.forEach((k, i) => {
    const sp = i % spalten, re = Math.floor(i / spalten);
    const x = 10 + sp * (BREITE + 10), y = 10 + re * (zh + BES);
    teile.push({ input: k.bild, left: x, top: y + BES });
    texte.push(
      `<text x="${x}" y="${y + 20}" font-family="monospace" font-size="17" fill="#fff">${k.name}</text>`
      + `<text x="${x + 260}" y="${y + 20}" font-family="monospace" font-size="14" fill="#9c8fae">${k.richtung}</text>`,
    );
  });
  await sharp({ create: { width: W, height: H, channels: 3, background: '#111' } })
    .composite([...teile, { input: Buffer.from(`<svg width="${W}" height="${H}">${texte.join('')}</svg>`), left: 0, top: 0 }])
    .png().toFile('.shots/SCHRIFTPROBE.png');
  console.log('\n.shots/SCHRIFTPROBE.png geschrieben');
}

await b.schliessen?.();
process.exit(0);
