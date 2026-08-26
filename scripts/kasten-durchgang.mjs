/* kasten-durchgang — ein Kontaktblatt ueber die Folien, auf denen der Kasten sass.
 *
 * 2026-08-26 (Wolf: „wenn du den kasten rausnimmst musst du es aber auch bei
 * lobby und pause machen, da ist er auch noch. und wo er sonst ist").
 *
 * Der Kasten steht nicht zehnmal im Code, sondern EINMAL im Buehnen-Design
 * (frontend/src/qqTheme.ts, die vier --qq-card-* Werte). Eine Aenderung dort
 * trifft also alle Folien gleichzeitig - und genau deshalb muss man sie auch
 * alle ansehen, bevor man sie behaelt. Dieses Werkzeug faehrt die Stationen ab
 * und legt sie nebeneinander.
 *
 * NUTZUNG:
 *   node scripts/kasten-durchgang.mjs                    # der uebliche Satz
 *   node scripts/kasten-durchgang.mjs lobby pause frage  # nur diese
 *   node scripts/kasten-durchgang.mjs --datei ALT        # .shots/KASTEN-ALT.png
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const argv = process.argv.slice(2);
const dIdx = argv.indexOf('--datei');
const NAME = dIdx >= 0 ? argv[dIdx + 1] : 'NEU';
const gewuenscht = argv.filter((a, i) => !a.startsWith('--') && i !== dIdx + 1);
const STATIONEN = gewuenscht.length ? gewuenscht
  : ['lobby', 'regeln', 'frage', 'aufloesung', 'pause', 'zwischenstand', 'cozygame', 'danke'];

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();

const BREITE = 430, BES = 22;
const kacheln = [];
for (const st of STATIONEN) {
  try {
    await b.zurStation(st);
    await sleep(2200);   // Auftritts-Bewegung ausklingen lassen
    // Harte Regel: der Beamer bekommt NIE eine Scrollbar (CLAUDE.md). Wer
    // feste Hoehen entfernt, muss das pruefen und nicht hoffen.
    const ueber = await seite.evaluate(() => ({
      b: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      h: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    }));
    if (ueber.b > 1 || ueber.h > 1) console.log(`    ⚠️ laeuft ueber: ${ueber.b} px breit, ${ueber.h} px hoch`);
    const roh = await seite.screenshot({ type: 'jpeg', quality: 82 });
    const bild = await sharp(roh).resize(BREITE).toBuffer();
    kacheln.push({ name: st, bild, h: (await sharp(bild).metadata()).height });
    console.log(`  ${st}: aufgenommen`);
  } catch (e) {
    console.log(`  ${st}: uebersprungen (${e.message.slice(0, 60)})`);
  }
}

if (kacheln.length) {
  fs.mkdirSync('.shots', { recursive: true });
  const zh = Math.max(...kacheln.map(k => k.h));
  const spalten = 4, reihen = Math.ceil(kacheln.length / spalten);
  const W = spalten * BREITE + (spalten + 1) * 6, H = reihen * (zh + BES) + 6;
  const teile = [], texte = [];
  kacheln.forEach((k, i) => {
    const sp = i % spalten, re = Math.floor(i / spalten);
    const x = 6 + sp * (BREITE + 6), y = 6 + re * (zh + BES);
    teile.push({ input: k.bild, left: x, top: y + BES });
    texte.push(`<text x="${x}" y="${y + 15}" font-family="monospace" font-size="14" fill="#fff">${k.name}</text>`);
  });
  const beschriftung = Buffer.from(`<svg width="${W}" height="${H}">${texte.join('')}</svg>`);
  await sharp({ create: { width: W, height: H, channels: 3, background: '#111' } })
    .composite([...teile, { input: beschriftung, left: 0, top: 0 }])
    .png().toFile(`.shots/KASTEN-${NAME}.png`);
  console.log(`\n.shots/KASTEN-${NAME}.png geschrieben`);
}
await b.schliessen?.();
process.exit(0);
