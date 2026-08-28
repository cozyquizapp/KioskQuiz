/* gewinnerkarte-unterkante — bleibt die Gewinnerkarte auf der Aufloesung im Bild?
 *
 * 2026-08-26 (Wolf, Bild einer MUCHO-Aufloesung): der Kasten ganz unten mit
 * dem Teamnamen „Fakt oder Fiktion" und „richtig!" ist an der Unterkante
 * abgeschnitten.
 *
 * ⚠️ Das ist kein neuer Ort. Im Code steht seit dem 10. Mai:
 *     „(Wolf-Live-Test L8 'Mu-Cho untere Card abgeschnitten'): Avatar 8vw→7cqw,
 *      font 5vw→4.2cqw, padding 2vh→1.6cqh ... damit Reveal bei Mu-Cho mit 4
 *      Optionen + Frage nicht den viewport-Bottom verlaesst"
 * Dieselbe Karte, dieselbe Kante. Damals war die Frage kleiner. Heute ist sie
 * auf mein Betreiben hin von 77-84 auf 109-117 px gewachsen - was oben waechst,
 * drueckt unten hinaus. Der Verdacht zeigt auf mich.
 *
 * ⚠️⚠️ Warum die bestehenden Werkzeuge geschwiegen haben: sie messen mit den
 * Fragen, die im Testentwurf stehen, und die sind kurz. Wolfs Frage („In
 * welcher Sportart wird der Begriff Birdie verwendet?") laeuft auf zwei
 * Zeilen. Eine zweite Zeile ist der ganze Unterschied. Also misst dieses
 * Werkzeug nicht EINE Frage, sondern die Reserve: wie viel Luft hat die
 * Gewinnerkarte noch nach unten, und wie viel frisst jede weitere Zeile Frage?
 *
 * Die Karte wird nicht ueber ihren Text gesucht (der wechselt je Kategorie),
 * sondern ueber ihre Auftrittsbewegung `revealWinner*` - die hat nur sie.
 *
 * NUTZUNG:
 *   node scripts/gewinnerkarte-unterkante.mjs
 */
import fs from 'node:fs';
import { buehneStarten, sleep } from './lib/buehne.mjs';

/** Fragen wachsender Laenge, jede mit dem Grad, den die Aufloesungs-Leiter
 *  (`qRevealFontSize` in CozyQuizQuestionView) fuer sie ausgibt. Der Text wird
 *  im Bild ausgetauscht UND auf diesen Grad gesetzt - zusammen ist das genau
 *  das, was React rendern wuerde, denn die Leiter macht nichts anderes. */
const FRAGEN = [
  { wie: 'kurz, 24 Z.',        px: null, text: 'Wer malte die Mona Lisa?' },
  { wie: 'Wolfs Frage, 55 Z.', px: 82,   text: 'In welcher Sportart wird der Begriff „Birdie" verwendet?' },
  { wie: 'Grenze 70 Z.',       px: 82,   text: 'Welcher deutsche Fussballverein hat die meisten Meisterschaften?' },
  { wie: 'lang, 103 Z.',       px: 62,   text: 'Welcher deutsche Fussballverein hat die meisten nationalen Meisterschaften gewonnen, und wie viele?' },
  { wie: 'sehr lang, 168 Z.',  px: 51,   text: 'Welcher deutsche Fussballverein hat im Verlauf seiner gesamten Vereinsgeschichte die meisten nationalen Meisterschaften gewonnen, und wie viele waren es genau?' },
];

/** Misst die Gewinnerkarte gegen die Unterkante der Buehne.
 *  Die Frage wird ueber ihre eigene Kennung `data-qq-frage` gefunden, nicht
 *  ueber „groesste Schrift auf der Folie" - bei kleinen Graden waere sonst
 *  irgendwann eine Antwortkarte die groesste, und das Werkzeug haette
 *  stillschweigend das falsche Element vermessen (2026-08-26 genau passiert).
 *  Die Gewinnerkarte traegt als einzige eine `revealWinner*`-Bewegung. */
const messen = ([text, px]) => {
  const buehne = document.querySelector('[data-qq-buehne]');
  if (!buehne) return { fehler: 'keine Buehne' };
  const frage = buehne.querySelector('[data-qq-frage]');
  if (frage && text) { frage.textContent = text; }
  if (frage && px) { frage.style.fontSize = px + 'px'; }
  if (frage) frage.getBoundingClientRect();

  let karte = null;
  for (const el of buehne.querySelectorAll('*')) {
    // ⚠️ Auf das PRAEFIX pruefen, nicht auf den vollen Namen. Seit dem
    // 2026-08-28 traegt die Sieger-Karte zwei getrennte Bewegungen
    // (`revealWinnerFade` fuer die Deckkraft, `revealWinnerRise` fuer den Weg,
    // Begruendung in qqShared.ts). Ein Werkzeug, das auf `revealWinnerIn`
    // besteht, meldet dann „keine Karte" und sieht aus wie ein Fehler im Code,
    // obwohl es sein eigener ist - genau so am selben Tag passiert.
    if (getComputedStyle(el).animationName.includes('revealWinner')) { karte = el; break; }
  }
  const br = buehne.getBoundingClientRect();
  const s = br.width / buehne.offsetWidth || 1;
  const fr = frage ? frage.getBoundingClientRect() : null;
  const grad = frage ? Math.round(parseFloat(getComputedStyle(frage).fontSize)) : null;
  if (!karte) return { frage: fr ? { px: grad, h: Math.round(fr.height / s) } : null, karte: null };
  const kr = karte.getBoundingClientRect();
  return {
    frage: { px: grad, h: Math.round(fr.height / s) },
    karte: { oben: Math.round((kr.top - br.top) / s), unten: Math.round((kr.bottom - br.top) / s) },
    buehneHoehe: Math.round(br.height / s),
    reserve: Math.round((br.bottom - kr.bottom) / s),
  };
};

const b = await buehneStarten({
  bots: 8, frisch: true, takt: () => {},
  kategorie: 'MUCHO', entwurf: 'qq-vol-1',
});
const h = b.helfer ?? b;
const seite = h.seite();
fs.mkdirSync('.shots', { recursive: true });

// `aufloesungUnten` ist die einzige Station, die die Gewinnerkarte wirklich
// aufdeckt: sie geht auf die zweite MUCHO-Frage (richtige Antwort unten links)
// und schickt danach die beiden `qq:muchoRevealStep`. Die Station `aufloesung`
// bleibt im Antwort-Zustand stehen - dort gibt es die Karte gar nicht.
await b.zurStation('aufloesungUnten');
await sleep(3200);

console.log('\n══ Gewinnerkarte auf der MUCHO-Aufloesung ══════════════════════');
const grund = await seite.evaluate(messen, [null, null]);
console.log('  wie sie steht:', JSON.stringify(grund));
await seite.screenshot({ path: '.shots/gewinnerkarte-grund.png' });

let schlimmste = null;
for (const f of FRAGEN) {
  const m = await seite.evaluate(messen, [f.text, f.px]);
  await sleep(160);
  const raus = m.karte ? -m.reserve : null;
  const marke = raus == null ? '?' : raus > 0 ? '✗' : '✓';
  console.log(`  ${marke} ${f.wie.padEnd(20)} Frage ${m.frage?.px ?? '?'}px h=${m.frage?.h ?? '?'}` +
    (m.karte ? `   Karte unten ${m.karte.unten} von ${m.buehneHoehe}   Reserve ${m.reserve}px` : '   keine Karte'));
  if (m.karte && (schlimmste == null || m.reserve < schlimmste)) schlimmste = m.reserve;
  await seite.screenshot({ path: `.shots/gewinnerkarte-${f.px ?? 'leiter'}.png` });
}

console.log('\n══ Urteil ══════════════════════════════════════════════════════');
if (schlimmste == null) console.log('  Keine Gewinnerkarte gefunden - Station passt nicht.');
else if (schlimmste < 0) console.log(`  Die Karte laeuft aus dem Bild: ${-schlimmste} px unter der Kante.`);
else console.log(`  Kleinste Reserve nach unten: ${schlimmste} px.` + (schlimmste < 40 ? '  ⚠️ unter 40 px ist auf einem Beamer mit Ueberscan zu wenig.' : ''));

await b.schliessen?.();
process.exit(schlimmste != null && schlimmste < 0 ? 1 : 0);
