/* Zwischenstand Final-Phase: wieviel Platz hat die Liste wirklich?
 * Argument: Anzahl Teams. Misst Wurzel, Kopf und Liste in Buehnen-Pixeln. */
import { buehneStarten, sleep } from '/home/claude/kioskquiz/scripts/lib/buehne.mjs';
const bots = Number(process.argv[2] ?? 12);
const mega = process.argv[3] !== 'nomega';
const b = await buehneStarten({ bots, frisch: true, takt: () => {}, entwurf: 'qq-vol-1' });
if (mega) { await b.emit('qq:setQuizOptions', { largeGroupMode: true, nestedTeams: true }); await sleep(500); }
await b.zurStation('zwischenstand');
await sleep(6000);
const r = await b.seite.evaluate(() => {
  const buehne = document.querySelector('[data-qq-buehne]');
  const br = buehne.getBoundingClientRect();
  const s = br.height / 990;
  const y = (px) => Math.round((px - br.top) / s);
  // Die Liste: der Kasten, dessen Kinder absolut sitzen und breit sind.
  let liste = null;
  for (const el of Array.from(buehne.querySelectorAll('div'))) {
    const k = Array.from(el.children);
    if (k.length < 3) continue;
    if (!k.every(c => getComputedStyle(c).position === 'absolute')) continue;
    const rr = el.getBoundingClientRect();
    if (rr.width / s < 800) continue;
    liste = el; break;
  }
  if (!liste) return { fehler: 'Liste nicht gefunden' };
  const wurzel = liste.parentElement;
  const wr = wurzel.getBoundingClientRect();
  const cs = getComputedStyle(wurzel);
  const lr = liste.getBoundingClientRect();
  const kopf = [];
  for (const k of Array.from(wurzel.children)) {
    if (k === liste) break;
    const kr = k.getBoundingClientRect();
    if (kr.height < 2) continue;
    kopf.push({ oben: y(kr.top), unten: y(kr.bottom), text: (k.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30) });
  }
  return {
    wurzel: { oben: y(wr.top), unten: y(wr.bottom),
      padTop: Math.round(parseFloat(cs.paddingTop) / s), padBottom: Math.round(parseFloat(cs.paddingBottom) / s),
      ov: cs.overflow },
    kopf,
    liste: { oben: y(lr.top), unten: y(lr.bottom), h: Math.round(lr.height / s), n: liste.children.length },
  };
});
console.log(`\n══ ${bots} Teams${mega ? ' (CrowdQuiz)' : ''} ═══════════════════════════════`);
if (r.fehler) { console.log('  ' + r.fehler); }
else {
  console.log(`  Wurzel   y ${r.wurzel.oben}..${r.wurzel.unten}  Polster ${r.wurzel.padTop}/${r.wurzel.padBottom}  overflow ${r.wurzel.ov}`);
  for (const k of r.kopf) console.log(`  Kopf     y ${k.oben}..${k.unten}  „${k.text}"`);
  console.log(`  Liste    y ${r.liste.oben}..${r.liste.unten}  Hoehe ${r.liste.h}  Zeilen ${r.liste.n}`);
  const platz = (r.wurzel.unten - r.wurzel.padBottom) - r.liste.oben;
  console.log(`  Platz unter der Listenoberkante: ${platz}   gebraucht ${r.liste.h}`
    + (r.liste.h > platz ? `   ✗ ${r.liste.h - platz} px zuviel` : '   ✓ passt'));
  console.log(`  Unterkante ${r.liste.unten} gegen 990 (Luft 24 → 966)`
    + (r.liste.unten > 966 ? `   ✗ ${r.liste.unten - 966} px im Ueberscan` : '   ✓'));
}
await b.schliessen?.();
