/* ehrung-schuss — wie sieht die Ehrung eines ausscheidenden Teams aus?
 *
 * 2026-08-26 (Wolf: „Platz 8 soll mehr zelebriert werden, nicht nur eine
 * sekunde zack geskippt ... Grosses Fenster in der Mitte Team x ist mit y
 * punkten Platz Z"). Es gibt keine Station dafuer: die Ehrungen liegen hinter
 * dem Turm und hinter den Awards. Also takten, bis die Ansage steht.
 */
import fs from 'node:fs';
import { buehneStarten, sleep } from './lib/buehne.mjs';

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();
await b.zurStation('turmfinale');
await sleep(2000);

const daIst = () => seite.evaluate(() => !!document.querySelector('[data-qq-ansage]'));
// Das Fenster erscheint erst, wenn der Turm des Teams ABGESUNKEN ist - nicht
// schon beim Klick. Nach jedem Takt wird deshalb fein nachgesehen statt einmal
// grob gewartet; sonst faehrt man an der Ehrung vorbei, die man messen will.
let gefunden = false;
for (let i = 0; i < 30 && !gefunden; i++) {
  await h.emit('qq:nextQuestion');
  const bis = Date.now() + 7000;
  while (Date.now() < bis) {
    if (await daIst()) { gefunden = true; break; }
    await sleep(200);
  }
}
await sleep(1400);   // die Auftrittsbewegung ausklingen lassen
fs.mkdirSync('.shots', { recursive: true });
const mass = await seite.evaluate(() => {
  const el = document.querySelector('[data-qq-ansage]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const st = getComputedStyle(el);
  // Der Kasten allein sagt nicht, ob man ihn SIEHT. Deckkraft, Verschiebung
  // und Stapelhoehe gehoeren dazu - und der Text, damit klar ist, welches
  // Element hier ueberhaupt gemessen wird.
  return {
    b: Math.round(r.width), h: Math.round(r.height),
    oben: Math.round(r.top), links: Math.round(r.left),
    deck: st.opacity, transform: st.transform, z: st.zIndex,
    grund: st.backgroundImage.slice(0, 40) || st.backgroundColor,
    rand: `${st.borderTopWidth} ${st.borderTopColor}`,
    text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
  };
});
console.log('Ansage-Fenster:', mass ?? '(nicht gefunden)');
await seite.screenshot({ path: '.shots/EHRUNG.png' });
console.log('.shots/EHRUNG.png geschrieben');
await b.schliessen?.();
process.exit(0);
