/**
 * danke-vergleich.mjs — die Danke-Folie beider Formate nebeneinander.
 *
 * 2026-08-29, Wolf zur CrowdQuiz-Danke-Folie: „die danke fuers spielen seite
 * wirkt etwas leer und der avatar deplaziert? ausserdem ist es eine runde
 * kachel, was zeigt couchquiz da noch?"
 *
 * Die letzte Frage laesst sich nicht aus dem Code beantworten, ohne sich zu
 * irren - die Folie hat mehrere Zweige (Sieger einzeln oder Fraktion, QR an
 * oder aus, Statistiken je nach Datenlage). Also beide Formate aufnehmen und
 * nebeneinander legen. Was auf CozyQuiz steht und auf CrowdQuiz fehlt, sieht
 * man dann in einem Blick.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const ZIEL = '.shots/danke';
fs.mkdirSync(ZIEL, { recursive: true });

for (const gross of [false, true]) {
  const name = gross ? 'crowdquiz' : 'cozyquiz';
  const b = await buehneStarten({
    bots: gross ? 12 : 8, frisch: true, takt: () => {},
    entwurf: 'qq-vol-1', grossformat: gross,
  });
  await b.emit('qq:setTheme', { themeId: 'buehne' });
  await sleep(600);
  await b.zurStation('danke');
  await sleep(3200);
  await b.seite.screenshot({ path: `${ZIEL}/${name}.png` });
  // Was steht ueberhaupt drauf? Fuer die Textliste daneben.
  const text = await b.seite.evaluate(() =>
    (document.body.innerText || '').split('\n').map(x => x.trim()).filter(Boolean));
  console.log(`\n  ${name}:`);
  for (const z of text) console.log('    · ' + z);
  await b.schliessen?.();
}

// Nebeneinander, damit der Unterschied auffaellt statt beschrieben zu werden.
const B = 880, H = Math.round(B * 990 / 1760);
await sharp({ create: { width: B * 2, height: H, channels: 3, background: '#0B0912' } })
  .composite([
    { input: await sharp(`${ZIEL}/cozyquiz.png`).resize(B, H).toBuffer(), left: 0, top: 0 },
    { input: await sharp(`${ZIEL}/crowdquiz.png`).resize(B, H).toBuffer(), left: B, top: 0 },
  ]).png().toFile(`${ZIEL}/nebeneinander.png`);
console.log(`\n  links CozyQuiz, rechts CrowdQuiz -> ${ZIEL}/nebeneinander.png`);
process.exit(0);
