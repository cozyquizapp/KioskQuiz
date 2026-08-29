/**
 * crowd-zeremonie.mjs — die Siegerehrung von CrowdQuiz Takt fuer Takt knipsen.
 *
 * 2026-08-29, Wolf: „die crowd quiz zeremonie muss bleiben! dort funktioniert
 * die cozyquiz bar race nicht".
 *
 * Der Zuruf kam, nachdem ich in CozyQuizLargeGroupView fuenfzehn Eckenradien
 * und einen Aussenschein angefasst habe. Behaupten kann ich, dass davon nichts
 * an der Zeremonie haengt. Zeigen ist besser. Also: alle Takte durchfahren und
 * jeden einzeln aufnehmen.
 *
 * ⚠️ Die Zeremonie ist NICHT die Station `siegerehrung`. Die faehrt
 * `springe('final-reveal')` an und gehoert CozyQuiz. Die CrowdQuiz-Zeremonie
 * liegt in GAME_OVER und laeuft ueber `qq:awardStep`:
 *   Takt 0 .. n-1   die Awards, einer je Takt (qqMegaAwardKeys)
 *   Takt n          die Kroenung („Wer kroent sich?", das Fraktions-Roulette)
 *   Takt n+1        der Endstand
 * Der Server klemmt bei n+1 ab (qqRooms.ts, qqAwardStep) und verlangt
 * ausdruecklich `largeGroupMode` - was praktisch ist: laeuft der Aufbau als
 * CozyQuiz, wirft das Ereignis einen Fehler, statt ein falsches Bild zu
 * liefern. Genau daran waere der Formatfehler von heute frueh aufgefallen.
 *
 * Aufruf:  node scripts/crowd-zeremonie.mjs
 */
import fs from 'node:fs';
import { buehneStarten, sleep } from './lib/buehne.mjs';

const ZIEL = '.shots/crowd-zeremonie';
fs.mkdirSync(ZIEL, { recursive: true });

const b = await buehneStarten({
  bots: 12, frisch: true, takt: () => {}, entwurf: 'qq-vol-1', grossformat: true,
});
await b.emit('qq:setTheme', { themeId: 'buehne' });
await sleep(600);
await b.zurStation('spielende');
await sleep(3500);

// Was steht auf der Folie? Nur zur Beschriftung der Datei; das Urteil faellt
// am Bild.
const TITEL = () => {
  let best = '', px = 0;
  for (const el of document.querySelectorAll('div, span, h1, h2')) {
    if (el.children.length > 0) continue;
    const t = (el.textContent || '').trim();
    if (!t || t.length > 48) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 30 || r.height < 10) continue;
    const s = parseFloat(getComputedStyle(el).fontSize) || 0;
    if (s > px) { px = s; best = t.replace(/\s+/g, ' '); }
  }
  return best;
};

const MAX = 8; // Awards (bis 5) + Kroenung + Endstand, mit Reserve
let letzter = '';
for (let i = 0; i <= MAX; i++) {
  const t = await b.seite.evaluate(TITEL).catch(() => '');
  const kurz = (t || 'ohne-titel').replace(/[^\wäöüÄÖÜß ]/g, '').trim().replace(/\s+/g, '-').slice(0, 26);
  const datei = `${ZIEL}/takt-${String(i).padStart(2, '0')}-${kurz || 'ohne-titel'}.png`;
  await b.seite.screenshot({ path: datei });
  console.log(`  Takt ${i}  ${t}`);
  // Zweimal derselbe Titel am Ende heisst: der Server klemmt ab, wir sind durch.
  if (i > 0 && t === letzter) { console.log('  (abgeklemmt, Zeremonie durch)'); break; }
  letzter = t;
  const ack = await b.emit('qq:awardStep', { dir: 1 });
  if (ack && ack.ok === false) {
    console.log('  ⚠️ qq:awardStep abgelehnt:', JSON.stringify(ack).slice(0, 120));
    console.log('     Das ist KEIN Design-Befund, sondern einer ueber den Aufbau:');
    console.log('     der Server nimmt den Schritt nur in GAME_OVER und nur im');
    console.log('     Grossformat an (qqRooms.ts, qqAwardStep).');
    break;
  }
  await sleep(2600);
}

await b.schliessen?.();
process.exit(0);
