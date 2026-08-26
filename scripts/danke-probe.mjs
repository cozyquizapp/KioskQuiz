/* danke-probe — laeuft auf der Danke-Folie eine Einblendung, die aus sein sollte?
 *
 * 2026-08-26. Die Aufnahme zeigt: Kasten ab 740 ms, Ueberschrift Buchstabe fuer
 * Buchstabe bis 1996 ms. Genau diese Einblendungen sind im Code fuer die Buehne
 * auf `none` gestellt. Also entweder ist `istBuehne` dort falsch, oder die
 * Regeln kommen woanders her. Diese Probe liest beides direkt aus dem Browser.
 */
import { buehneStarten, sleep } from './lib/buehne.mjs';

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();
await b.zurStation('cozydanach'); await sleep(700);
await h.springe('final-reveal'); await sleep(900);

const daIst = async (muster, hoechstens = 9000) => {
  const bis = Date.now() + hoechstens;
  while (Date.now() < bis) {
    if (muster.test(await seite.evaluate(() => document.body.innerText))) return true;
    await sleep(170);
  }
  return false;
};
const DANKE = /Danke fürs Spielen|Thanks for Playing/i;
for (let i = 0; i < 30; i++) {
  if (await daIst(DANKE, 300)) break;
  await h.emit('qq:nextQuestion');
  if (await daIst(DANKE)) break;
}
await sleep(1500);

const befund = await seite.evaluate(() => {
  const wurzel = document.documentElement;
  const danke = document.querySelector('[data-qq-danke-buehne]');
  const laeuft = [];
  for (const a of document.getAnimations()) {
    const e = a.effect;
    if (!e || !('target' in e) || !e.target) continue;
    const ziel = e.target;
    if (danke && !danke.contains(ziel)) continue;
    const n = a.animationName ?? '?';
    laeuft.push(n);
  }
  const zaehler = {};
  for (const n of laeuft) zaehler[n] = (zaehler[n] ?? 0) + 1;
  return {
    sceneMotion: wurzel.dataset.sceneMotion ?? '(nichts)',
    themeAttr: wurzel.dataset.qqTheme ?? wurzel.getAttribute('data-theme') ?? '(nichts)',
    dankeGefunden: !!danke,
    animationen: zaehler,
  };
});
console.log('\n── Was der Browser auf der Danke-Folie sagt ──────────────────');
console.log('  data-scene-motion :', befund.sceneMotion);
console.log('  Theme-Attribut    :', befund.themeAttr);
console.log('  Danke-Wurzel da   :', befund.dankeGefunden);
console.log('  laufende Animationen in der Folie:');
for (const [n, z] of Object.entries(befund.animationen).sort((a, c) => c[1] - a[1])) {
  console.log(`    ${String(z).padStart(3)}x  ${n}`);
}
await b.schliessen?.();
process.exit(0);
