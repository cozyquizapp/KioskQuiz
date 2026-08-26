/* steuerpult-finale — wie sieht Wolfs Steuerpult waehrend des Finales aus?
 *
 * 2026-08-26 (offener Punkt: „Steuerpult im Finale an die Buehne angleichen").
 *
 * Das Steuerpult ist die einzige Ansicht, die Wolf den ganzen Abend vor sich
 * hat, und die einzige, die den Buehnen-Durchgang nie gesehen hat. Bevor man
 * daran etwas angleicht, muss man es nebeneinander sehen: was steht auf der
 * Wand, und was steht gleichzeitig auf seinem Laptop.
 *
 * ⚠️ Der Raum wird ueber den Socket in die gewuenschte Station gefahren
 * (scripts/lib/buehne.mjs), NICHT ueber /moderator-test ohne `run=1` - das
 * setzt den Raum zurueck. Das Steuerpult wird danach unter /moderator geoeffnet
 * und liest nur mit.
 *
 * NUTZUNG:  node scripts/steuerpult-finale.mjs [station]
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buehneStarten, sleep } from './lib/buehne.mjs';
const req = createRequire(new URL('../frontend/package.json', import.meta.url));
const sharp = req('sharp');

const STATION = process.argv[2] || 'turmfinale';

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
await b.zurStation(STATION);
await sleep(2000);

// Zweites Fenster: das Steuerpult, in Laptop-Groesse.
const ctx = h.seite().context();
const pult = await ctx.newPage();
await pult.setViewportSize({ width: 1512, height: 950 });
await pult.addInitScript(() => {
  try {
    sessionStorage.setItem('qq_admin_unlocked', '1');
    sessionStorage.setItem('qq_admin_pin', '2506');
    localStorage.setItem('qq-admin-pin', '2506');
  } catch { /* egal */ }
});
await pult.goto(`http://localhost:5173/moderator?room=${b.roomCode ?? 'default'}`, { waitUntil: 'domcontentloaded' });
await sleep(4000);

fs.mkdirSync('.shots', { recursive: true });
const pultBild = await pult.screenshot({ type: 'jpeg', quality: 84, fullPage: true });
const buehneBild = await h.seite().screenshot({ type: 'jpeg', quality: 84 });

// Nebeneinander, damit man vergleicht statt sich zu erinnern.
const BREITE = 860;
const a = await sharp(buehneBild).resize(BREITE).toBuffer();
const c = await sharp(pultBild).resize(BREITE).toBuffer();
const ha = (await sharp(a).metadata()).height, hc = (await sharp(c).metadata()).height;
const H = Math.max(ha, hc) + 26;
await sharp({ create: { width: BREITE * 2 + 18, height: H, channels: 3, background: '#111' } })
  .composite([
    { input: a, left: 6, top: 26 },
    { input: c, left: BREITE + 12, top: 26 },
    { input: Buffer.from(`<svg width="${BREITE * 2 + 18}" height="${H}">
        <text x="6" y="18" font-family="monospace" font-size="14" fill="#fff">Buehne (${STATION})</text>
        <text x="${BREITE + 12}" y="18" font-family="monospace" font-size="14" fill="#fff">Steuerpult</text>
      </svg>`), left: 0, top: 0 },
  ])
  .png().toFile('.shots/STEUERPULT.png');
console.log('.shots/STEUERPULT.png geschrieben');

await b.schliessen?.();
process.exit(0);
