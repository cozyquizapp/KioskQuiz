/* kartoffel-platz — wer wird bei der Heissen Kartoffel abgeschnitten?
 *
 * 2026-08-28, Wolf: „heisse kartoffel (hier musst du aufpassen, weil entweder
 * der teamname oder die antwortmoeglichkeiten, mehrere reihen, abgeschnitten
 * waren) das ist tricky".
 *
 * ── Warum das eine Messung braucht und kein Auge ──────────────────────────
 * Die Ansicht hat zwei Bloecke, die sich denselben Platz teilen:
 *
 *   1. Der ANTWORT-BLOCK oben. Er hat einen eigenen Deckel
 *      (`maxHeight: clamp(120px, 30cqh, 297px)`) und `overflow: hidden`.
 *      Laeuft er ueber, verschwindet die unterste Reihe lautlos.
 *   2. Die HALBKREIS-REIHE unten mit „JETZT DRAN" und dem Teamnamen. Sie
 *      steht am Fuss und kann unter die Buehnenkante rutschen.
 *
 * Und beide haengen an der Zahl der abgegebenen Antworten. Deshalb ist es
 * „tricky": bei wenigen Antworten passt alles, bei vielen kippt mal das eine
 * und mal das andere, je nachdem wie lang die Antworten sind. Ein einzelner
 * Screenshot beweist hier gar nichts.
 *
 * Gemessen wird deshalb ueber MEHRERE Fuellstaende, und beide Bloecke
 * gleichzeitig:
 *   - laeuft der Antwort-Block ueber seinen Deckel? (dann fehlt eine Reihe)
 *   - wie weit reicht die Namenszeile nach unten, gegen 990?
 *
 * ⚠️ Gemessen wird in BUEHNEN-Pixeln (1760x990), nicht in Fensterpixeln. Die
 * Buehne wird skaliert auf den Beamer geworfen; wer die rohen Rechtecke nimmt,
 * misst den Zufall der Fenstergroesse.
 *
 * NUTZUNG:  node scripts/kartoffel-platz.mjs
 */
import { buehneStarten, sleep } from './lib/buehne.mjs';

/** Wie viele Antworten liegen sollen. Die Ansicht kippt nicht linear, deshalb
 *  mehrere Stufen bis deutlich ueber das, was ein Abend bringt. */
const STUFEN = [1, 8, 12, 20, 30];

/** Ab hier gilt es als angeschnitten. Ein Projektor zeigt die aeussersten
 *  Prozent nicht (dieselbe Begruendung wie LUFT in qqEinpassen.ts). */
const LUFT = 24;

const MESSEN = () => {
  const buehne = document.querySelector('[data-qq-buehne]') ?? document.body;
  const br = buehne.getBoundingClientRect();
  const s = br.height / 990;
  const inBuehne = (px) => Math.round(px / s);

  // Der Antwort-Block: das Element mit eigenem Deckel und overflow hidden,
  // das mehr Inhalt hat, als es zeigt.
  // ⚠️ ALLE Kandidaten sammeln, nicht nur den groessten. Der erste Anlauf nahm
  // den mit dem staerksten Ueberlauf und meldete schon bei EINER Antwort 12 px
  // verdeckt - das kann der Antwort-Block nicht sein. Es gibt mehrere Kaesten
  // mit Deckel und `overflow: hidden` in dieser Ansicht (auch die Namenszeile
  // hat einen), und ohne den Text daneben weiss man nicht, welcher gemeint ist.
  const deckel = [];
  for (const el of Array.from(buehne.querySelectorAll('div'))) {
    const st = getComputedStyle(el);
    if (st.overflow !== 'hidden' || !st.maxHeight || st.maxHeight === 'none') continue;
    if (el.clientHeight < 40) continue;
    deckel.push({
      ueber: Math.round(el.scrollHeight - el.clientHeight),
      hoehe: Math.round(el.clientHeight),
      deckelWert: st.maxHeight,
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 34),
    });
  }
  deckel.sort((a, b2) => b2.ueber - a.ueber);
  const chips = null, chipsUeber = deckel[0]?.ueber ?? 0;

  // Die Namenszeile: ueber den Text „Jetzt dran" gefunden, dann der Block,
  // der ihn traegt.
  let name = null;
  for (const el of Array.from(buehne.querySelectorAll('span'))) {
    const t = (el.textContent || '').trim().toLowerCase();
    if (t === 'jetzt dran' || t === 'your turn') { name = el.parentElement; break; }
  }

  // Und generell: was reicht am tiefsten in die Buehne?
  let tiefste = 0, tiefstesWer = '';
  for (const el of Array.from(buehne.querySelectorAll('*'))) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.offsetHeight < 4 || el.offsetWidth < 4) continue;
    // ⚠️ Container ueberspringen. Der erste Anlauf meldete als „tiefstes
    // Element" die ganze Buehne (y 990) samt Kopfzeile im Text - das ist kein
    // Befund, das ist der Rahmen.
    if (el.offsetWidth > buehne.clientWidth * 0.9) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 4) continue;
    const u = inBuehne(r.bottom - br.top);
    if (u > tiefste && u <= 1400) {
      tiefste = u;
      tiefstesWer = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 26) || el.tagName;
    }
  }

  void chips;
  return {
    deckel,
    chipsUeberlauf: Math.round(chipsUeber),
    chipsHoehe: deckel[0]?.hoehe ?? null,
    nameUnten: name ? inBuehne(name.getBoundingClientRect().bottom - br.top) : null,
    nameText: name ? (name.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30) : null,
    tiefste, tiefstesWer,
  };
};

const ergebnisse = [];
for (const stufe of STUFEN) {
  const b = await buehneStarten({
    bots: 8, frisch: true, takt: () => {},
    kategorie: 'hotPotato', entwurf: 'qq-vol-1', stufe,
  });
  await b.zurStation('kartoffel');
  await sleep(1800);
  const m = await b.seite.evaluate(MESSEN);
  ergebnisse.push({ stufe, ...m });
  await b.schliessen?.();
}

console.log('\n══ Heisse Kartoffel: wer wird abgeschnitten? ═══════════════════');
console.log('  Antw.  Antwort-Block            Namenszeile      tiefstes Element');
let schlecht = 0;
for (const e of ergebnisse) {
  const chipsOk = e.chipsUeberlauf <= 2;
  const nameOk = e.nameUnten != null && e.nameUnten <= 990 - LUFT;
  const tiefOk = e.tiefste <= 990 - LUFT;
  if (!chipsOk || !nameOk || !tiefOk) schlecht++;
  if (e.deckel?.length) {
    for (const d of e.deckel.slice(0, 3)) {
      console.log(`         Deckel ${String(d.hoehe).padStart(3)} px (${d.deckelWert}), `
        + `${d.ueber > 2 ? String(d.ueber).padStart(3) + ' px verdeckt' : 'passt        '}  „${d.text}"`);
    }
  }
  console.log(
    `  ${String(e.stufe).padStart(4)}   `
    + (chipsOk ? '✓ passt              ' : `✗ ${String(e.chipsUeberlauf).padStart(3)} px verdeckt   `)
    + (e.nameUnten == null ? '  (nicht da)     '
       : (nameOk ? '✓ ' : '✗ ') + `y ${String(e.nameUnten).padStart(4)}      `)
    + `y ${String(e.tiefste).padStart(4)}  „${e.tiefstesWer}"`
  );
}

console.log('\n══ Urteil ══════════════════════════════════════════════════════');
console.log(`  Grenze: alles muss ueber y ${990 - LUFT} enden (24 px gegen Ueberscan).`);
console.log(schlecht === 0
  ? '  ✓ Bei jedem Fuellstand sind Antworten UND Name vollstaendig im Bild.'
  : `  ✗ ${schlecht} von ${ergebnisse.length} Fuellstaenden schneiden etwas ab.`);
process.exit(schlecht === 0 ? 0 : 1);
