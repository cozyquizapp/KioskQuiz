/* awardkarte-schuss — ein Bild der Award-Karte im Turm-Finale.
 *
 * 2026-08-26 (Wolf: „hier auch immernoch bug um gewinner team"). Es gibt keine
 * Station fuer die Award-Zeremonie; sie liegt ein paar Takte hinter dem Turm.
 * Also: bis zum Turm fahren, dann takten, bis eine Award-Karte steht.
 */
import fs from 'node:fs';
import { buehneStarten, sleep } from './lib/buehne.mjs';

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();
await b.zurStation('turmfinale');
await sleep(2000);

const text = () => seite.evaluate(() => document.body.innerText || '');
const AWARD = /AWARD/;
for (let i = 0; i < 24; i++) {
  if (AWARD.test(await text())) break;
  await h.emit('qq:nextQuestion');
  await sleep(1600);
}
await sleep(2600);   // die Zeremonie einrasten lassen
console.log('stehe bei:', (await text()).replace(/\s+/g, ' ').slice(0, 70));
fs.mkdirSync('.shots', { recursive: true });
await seite.screenshot({ path: '.shots/AWARDKARTE.png' });
console.log('.shots/AWARDKARTE.png geschrieben');
await b.schliessen?.();
process.exit(0);
