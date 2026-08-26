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
    // Welche Elemente malen ueberhaupt eine FLAECHE oder KANTE? Nach Groesse
    // sortiert. So findet man den Kasten, statt ihn zu suchen.
    flaechen: (() => {
      const raus = [];
      const wurzel2 = document.querySelector('[data-qq-danke-buehne]') || document.body;
      for (const el of wurzel2.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width < 300 || r.height < 200) continue;
        const st = getComputedStyle(el);
        const bg = st.backgroundColor, bi = st.backgroundImage;
        const hatBg = (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') || (bi && bi !== 'none');
        const hatRand = st.borderTopWidth !== '0px' && st.borderTopStyle !== 'none';
        const hatSchatten = st.boxShadow && st.boxShadow !== 'none';
        if (!hatBg && !hatRand && !hatSchatten) continue;
        raus.push({
          tag: el.tagName.toLowerCase(),
          gr: `${Math.round(r.width)}x${Math.round(r.height)}`,
          bg: hatBg ? (bi !== 'none' ? bi.slice(0, 42) : bg) : '-',
          rand: hatRand ? `${st.borderTopWidth} ${st.borderTopColor}` : '-',
          schatten: hatSchatten ? st.boxShadow.slice(0, 38) : '-',
        });
      }
      return raus.slice(0, 8);
    })(),
    endstand: (() => {
      const sp = document.querySelector('[data-qq-endstand]');
      if (!sp) return null;
      const r = sp.getBoundingClientRect();
      // Der Beamer skaliert die feste 1760x990-Flaeche. getBoundingClientRect
      // liefert BILDPUNKTE AUF DEM SCHIRM, also schon skaliert - genau das,
      // was zaehlt, wenn man fragt, ob es aus zehn Metern lesbar ist.
      const zeilen = [...sp.children].slice(1);
      const erste = zeilen[0];
      const name = erste ? erste.querySelector('span:nth-child(2), div') : null;
      return {
        breite: Math.round(r.width), hoehe: Math.round(r.height),
        zeilen: zeilen.length,
        zeilenhoehe: erste ? Math.round(erste.getBoundingClientRect().height) : 0,
        schrift: name ? Math.round(parseFloat(getComputedStyle(name).fontSize)) : 0,
        buehne: (() => { const b = document.querySelector('[data-qq-buehne]'); return b ? Math.round(b.getBoundingClientRect().width) : 0; })(),
      };
    })(),
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
console.log('\n── Wer malt eine Flaeche oder Kante ───────────────────────────');
for (const f of befund.flaechen ?? []) {
  console.log(`  ${f.gr.padEnd(10)} ${f.tag.padEnd(4)} bg=${String(f.bg).padEnd(44)} rand=${f.rand}  schatten=${f.schatten}`);
}
console.log('\n── Endstand-Spalte ───────────────────────────────────────────');
if (!befund.endstand) console.log('  (nicht vorhanden)');
else {
  const e = befund.endstand;
  console.log(`  Buehnenbreite auf dem Schirm : ${e.buehne} px`);
  console.log(`  Spalte                       : ${e.breite} x ${e.hoehe} px`);
  console.log(`  ${e.zeilen} Zeilen, je ${e.zeilenhoehe} px hoch, Name ${e.schrift} px`);
}
await b.schliessen?.();
process.exit(0);
