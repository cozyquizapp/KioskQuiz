/**
 * spanne-ablauf.mjs — die Spanne als ABLAUF, nicht als Zustand.
 *
 * 2026-08-29, Wolf: „zeigst erst die range und dann deckst du spannend auf?
 * ... und die range verschwindet wieder".
 *
 * Ein Standbild kann das nicht zeigen, also drei: kurz nach dem Aufdecken,
 * mittendrin, und am Ende. Genau daran haengt die Frage, ob die Folie zu voll
 * ist - Spannen und Wappen stehen nie gleichzeitig da.
 */
import fs from 'node:fs';
import { buehneStarten, sleep, API, PIN } from './lib/buehne.mjs';

const ZIEL = '.shots/ablauf';
fs.mkdirSync(ZIEL, { recursive: true });
const BOTS = 24;
const TAKTE = [700, 2100, 4600];   // ms nach `qq:revealAnswer`

const tipps = (ziel) => Array.from({ length: BOTS }, (_, i) =>
  String(Math.round(ziel * (1 + ((i % 8) - 4) * 0.035 + (Math.floor(i / 8) - 1) * 0.018))));

const b = await buehneStarten({
  grossformat: true, entwurf: 'crowd-vol-1', kategorie: 'SCHAETZCHEN',
  frisch: true, bots: BOTS, antworten: 0,
});
await b.seite.evaluate(() => {
  try { localStorage.setItem('qq-spanne', '2'); localStorage.setItem('qq-strahl', 'ruhig'); } catch { /* ignore */ }
});
await b.seite.reload({ waitUntil: 'domcontentloaded' });
await sleep(2000);
await b.aufbauen('spiel');
await b.helfer.zurFrage();

let da = false;
for (let i = 0; i < 12 && !da; i++) {
  const q = b.helfer.zustand()?.currentQuestion;
  if (q?.category === 'SCHAETZCHEN') {
    da = true;
    const ziel = Number(q.targetValue ?? 1000);
    const senden = () => fetch(`${API}/api/qq/${encodeURIComponent(b.roomCode)}/dev/simAnswers`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: PIN, stagger: false, texts: tipps(ziel) }),
    });
    await senden(); await sleep(600); await senden();
    const t0 = Date.now();
    await b.emit('qq:revealAnswer');
    for (const takt of TAKTE) {
      const warten = takt - (Date.now() - t0);
      if (warten > 0) await sleep(warten);
      await b.seite.screenshot({ path: `${ZIEL}/t${takt}.png` });
      const sicht = await b.seite.evaluate(() => {
        const kacheln = [...document.querySelectorAll('[data-qq-rand-kachel]')]
          .filter(el => Number(getComputedStyle(el).opacity) > 0.05).length;
        // Die Spannen sind die einzigen Elemente mit einem Schluessel `sp-`,
        // ueber die Hoehe erkennbar: 12 px, absolut, ohne Text.
        const spannen = [...document.querySelectorAll('div')].filter(el => {
          const st = getComputedStyle(el);
          return st.position === 'absolute' && Math.round(parseFloat(st.height)) === 12
            && Number(st.opacity) > 0.05 && !(el.textContent || '').trim();
        }).length;
        return { kacheln, spannen };
      });
      console.log(`  t=${String(takt).padStart(4)} ms · Spannen sichtbar ${sicht.spannen} · Wappen sichtbar ${sicht.kacheln}`);
    }
  }
  if (!da) await b.helfer.naechsteFrage();
}
if (!da) console.log('⚠️ Keine Schaetzchen-Frage erreicht.');
await b.schliessen();
process.exit(0);
