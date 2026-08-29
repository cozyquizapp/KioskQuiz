/**
 * lineup-vergleich.mjs — die Startaufstellung als 1x8 und als 2x4.
 *
 * 2026-08-29, Wolf: „bei los gehts machen 2x4 wohl mehr sinn als 1x8 kannst du
 * mal den unterschied zeigen?"
 *
 * Beide Fassungen sind in CozyQuizTeamsRevealView gebaut und haengen an
 * localStorage `qqLineupRaster`. Dieses Werkzeug setzt den Schalter, faehrt
 * zweimal zur Station `teams` und legt die Bilder uebereinander - untereinander,
 * genauer, weil beide Folien selbst schon breit sind.
 *
 * ⚠️ Der Schalter ist temporaer. Sobald entschieden ist, faellt er raus und nur
 * eine Fassung bleibt stehen.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const ZIEL = '.shots/lineup';
fs.mkdirSync(ZIEL, { recursive: true });

for (const raster of ['1x8', '2x4']) {
  const b = await buehneStarten({
    bots: 12, frisch: true, takt: () => {}, entwurf: 'qq-vol-1', grossformat: true,
  });
  // Der Schalter muss VOR dem Rendern stehen, also als Init-Script, und danach
  // ein Neuladen - sonst hat die Ansicht ihn beim Aufbau nicht gesehen.
  await b.ctx.addInitScript((r) => {
    try { window.localStorage.setItem('qqLineupRaster', r); } catch { /* egal */ }
  }, raster);
  await b.emit('qq:setTheme', { themeId: 'buehne' });
  await sleep(400);
  await b.seite.reload({ waitUntil: 'domcontentloaded' });
  await sleep(1200);
  await b.zurStation('teams');
  // ⚠️ Nicht auf eine Zahl warten, sondern auf die Folie. Die Station `teams`
  // hat 18 s Choreographie: erst laufen die Fraktionen EINZELN ein („Die
  // Fraktionen treten an"), erst danach steht die Startaufstellung mit dem
  // Ruf „Los geht's!". Der erste Anlauf schlief 3 s und fotografierte den
  // Einlauf - also die falsche Folie, und die haette man beim Vergleich fuer
  // das Ergebnis gehalten.
  await b.seite.waitForFunction(
    () => /Los geht|Let.s go/.test(document.body.innerText || ''),
    { timeout: 40000 },
  ).catch(() => console.log('    (Los geht\'s nie erschienen)'));
  await sleep(2500);
  await b.seite.screenshot({ path: `${ZIEL}/${raster}.png` });
  // Nachmessen statt schaetzen: wie breit ist ein Wappen, wie gross die Luecke
  // dazwischen, und beruehrt das aeusserste die Bildkante?
  const mass = await b.seite.evaluate(() => {
    const buehne = document.querySelector('[data-qq-buehne]');
    const br = buehne.getBoundingClientRect();
    const sk = br.height / 990;
    const marken = Array.from(document.querySelectorAll('.qq-team-mark'))
      .map(el => el.getBoundingClientRect())
      .filter(r => r.width > 40)
      .sort((a, b2) => (a.top - b2.top) || (a.left - b2.left));
    if (marken.length < 2) return null;
    const b1 = Math.round(marken[0].width / sk);
    // Luecke zwischen den ersten beiden derselben Reihe.
    const reihe = marken.filter(r => Math.abs(r.top - marken[0].top) < 20);
    const luecke = reihe.length > 1 ? Math.round((reihe[1].left - reihe[0].right) / sk) : 0;
    const linksRand = Math.round((Math.min(...marken.map(r => r.left)) - br.left) / sk);
    const rechtsRand = Math.round((br.right - Math.max(...marken.map(r => r.right))) / sk);
    return { n: marken.length, breite: b1, luecke, linksRand, rechtsRand, reihen: new Set(marken.map(r => Math.round(r.top / 40))).size };
  });
  console.log(`  ${raster}: ${mass.n} Wappen in ${mass.reihen} Reihe(n), je ${mass.breite}px, `
    + `Luecke ${mass.luecke}px, Rand links ${mass.linksRand}px / rechts ${mass.rechtsRand}px`);
  await b.schliessen?.();
}

const B = 1400, H = Math.round(B * 990 / 1760);
await sharp({ create: { width: B, height: H * 2, channels: 3, background: '#0B0912' } })
  .composite([
    { input: await sharp(`${ZIEL}/1x8.png`).resize(B, H).toBuffer(), left: 0, top: 0 },
    { input: await sharp(`${ZIEL}/2x4.png`).resize(B, H).toBuffer(), left: 0, top: H },
  ]).png().toFile(`${ZIEL}/vergleich.png`);
console.log(`\n  oben 1x8, unten 2x4 -> ${ZIEL}/vergleich.png`);
process.exit(0);
