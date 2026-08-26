/* award-rad-messen — steht der goldene Rahmen ueber der grossen Kachel?
 *
 * 2026-08-26 (Wolf, Bild der Underdog-Karte), zwei Saetze:
 *
 *   „bisschen verwirrend bei den awards ist, dass schon am anfang eine
 *    teamkachel eines teams drin steht, da sollte eine neutrale drin stehen
 *    wenns losdreht"
 *   „leider immer noch der bug - siehe screenshot"
 *
 * ⚠️ Der Rahmen war der DRITTE Anlauf, und die ersten beiden sind aus einem
 * Grund gescheitert, der hier festgehalten gehoert: ich habe im STANDBILD
 * gemessen. Im Standbild war immer alles richtig. Der Fehler lebt nur im
 * schnellen Teil der Bewegung, und dort habe ich nie hingesehen.
 *
 * Was tatsaechlich los war, in zwei Schichten:
 *
 *   1. Die Ruck-Bewegung des Streifens stand fest auf 160 ms, die Takte des
 *      Rades sind aber 95, 95, 98, 104, 112, 124, 140, 162, 192, 232, 288,
 *      360, 460, 600 ms lang. Acht von vierzehn sind kuerzer als die Bewegung.
 *   2. Und darunter das Eigentliche: die VERGROESSERTE Kachel haengt an einem
 *      INDEX, der goldene Rahmen an einer POSITION. Der Streifen faehrt aber
 *      bei jedem Takt eine ganze Zelle weit. Gemessen stand er auf
 *      `matrix(1,0,0,1,160,0)`, die Zelle mit dem Index MITTE also bei x 960
 *      bis 1120, der Rahmen fest bei 798 bis 962. Eine ganze Zelle daneben,
 *      und systematisch immer nach rechts.
 *
 * Punkt 2 laesst sich mit keiner Dauer heilen. Ein Spielautomat macht es
 * andersherum, und so ist es jetzt: alle Symbole laufen gleich gross durch,
 * der Rahmen markiert die Gewinnlinie, und erst wenn das Rad steht, waechst
 * das Symbol darin.
 *
 * ── Was dieses Werkzeug misst ──────────────────────────────────────────────
 * Waehrend der Fahrt: sind alle Kacheln gleich gross? (Sobald eine an einem
 * Index haengt, ist der Fehler wieder da.) Am Ende: landet der Sieger genau
 * auf der Linie, die der Rahmen die ganze Zeit markiert hat?
 *
 * Nebenbei beantwortet es Wolfs andere Frage: steht beim Losdrehen schon ein
 * Team im Fenster, oder eine neutrale Kachel?
 *
 * NUTZUNG:  node scripts/award-rad-messen.mjs
 */
import fs from 'node:fs';
import { buehneStarten, sleep } from './lib/buehne.mjs';

/** Wie weit Rahmen und grosse Kachel auseinanderstehen duerfen. Zwei
 *  Bildpunkte sind Rundung; alles darueber sieht man. */
const TOLERANZ = 3;

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();
fs.mkdirSync('.shots', { recursive: true });

await b.zurStation('turmfinale');
await sleep(2500);

const radLesen = () => {
  const buehne = document.querySelector('[data-qq-buehne]');
  const karte = document.querySelector('[data-qq-awardkarte]');
  if (!buehne || !karte) return null;
  const br = buehne.getBoundingClientRect();
  const s = br.width / buehne.offsetWidth || 1;
  const mitteX = (el) => (el.getBoundingClientRect().left + el.getBoundingClientRect().right) / 2;

  // Das Rad ist der Kasten mit der Maske. Seine Kinder: der Streifen und,
  // solange nichts entschieden ist, der atmende Rahmen.
  let rad = null;
  for (const el of karte.querySelectorAll('*')) {
    const st = getComputedStyle(el);
    if (st.maskImage && st.maskImage !== 'none' && st.overflow === 'hidden') { rad = el; break; }
  }
  if (!rad) return { fehler: 'kein Rad' };
  const kinder = [...rad.children];
  const streifen = kinder[0];
  const rahmen = kinder.find(c => getComputedStyle(c).borderTopWidth !== '0px') ?? null;

  // ALLE Kacheln, nicht nur die vermeintlich mittlere. Der Denkfehler der
  // ersten beiden Anlaeufe war, den Index fuer den Ort zu halten.
  const kacheln = [];
  for (const zelle of streifen.children) {
    const kind = zelle.firstElementChild?.firstElementChild ?? zelle.firstElementChild;
    if (!kind) continue;
    const r = kind.getBoundingClientRect();
    kacheln.push({ el: kind, b: Math.round(r.width / s), x: Math.round((mitteX(kind) - br.left) / s) });
  }
  if (!kacheln.length) return { fehler: 'keine Kachel' };
  const gross = kacheln.reduce((a, z) => z.b > a.b ? z : a, kacheln[0]);
  const klein = kacheln.reduce((a, z) => z.b < a.b ? z : a, kacheln[0]);
  const gst = getComputedStyle(gross.el);

  return {
    breiten: kacheln.map(k => k.b),
    spanne: gross.b - klein.b,
    grossB: gross.b,
    grossX: gross.x,
    rahmenX: rahmen ? Math.round((mitteX(rahmen) - br.left) / s) : null,
    rahmenB: rahmen ? Math.round(rahmen.getBoundingClientRect().width / s) : null,
    ring: gst.outlineStyle === 'none' ? null : `${gst.outlineWidth} +${gst.outlineOffset}`,
    // Woran man ein echtes Team erkennt: die Teammarke traegt die Klasse.
    // Die neutrale Kachel traegt sie nicht und zeigt ein Fragezeichen.
    neutral: (gross.el.textContent || '').trim() === '?',
    text: (karte.innerText || '').replace(/\s+/g, ' ').trim(),
  };
};

// ── Bis zur ersten Award-Karte vorfahren ──────────────────────────────────
let da = false;
for (let i = 0; i < 14; i++) {
  da = await seite.evaluate(() => !!document.querySelector('[data-qq-awardkarte]'));
  if (da) break;
  await h.emit('qq:nextQuestion');
  await sleep(700);
}
if (!da) { console.log('Keine Award-Karte erreicht.'); await b.schliessen?.(); process.exit(2); }

// ── Den ganzen Auftritt abtasten ──────────────────────────────────────────
const t0 = Date.now();
const proben = [];
while (Date.now() - t0 < 13000) {
  const m = await seite.evaluate(radLesen);
  if (m && !m.fehler) proben.push({ ms: Date.now() - t0, m });
  // Zwei Belegbilder: eins mitten in der Fahrt, eins im Standbild.
  if (m?.rahmenX != null && !fs.existsSync('.shots/award-rad-faehrt.png')) {
    await seite.screenshot({ path: '.shots/award-rad-faehrt.png' });
  }
  await sleep(55);
}
await seite.screenshot({ path: '.shots/award-rad-steht.png' });

// Der Rahmen markiert die Gewinnlinie und steht fest. Waehrend das Rad faehrt,
// duerfen deshalb ALLE Kacheln nur gleich gross sein - sonst haengt eine
// Vergroesserung an einem Index, waehrend der Rahmen an einer Position haengt,
// und die beiden laufen genau um die Fahrstrecke auseinander.
const mitRahmen = proben.filter(p => p.m.rahmenX != null);
const ungleich = mitRahmen.filter(p => p.m.spanne > 2);
const letzte = proben[proben.length - 1]?.m ?? null;
const erste = proben[0]?.m ?? null;
// Der Rahmen stand die ganze Fahrt ueber hier; dort muss der Sieger landen.
const linie = mitRahmen.length ? mitRahmen[mitRahmen.length - 1].m.rahmenX : null;

console.log('\n══ Waehrend das Rad faehrt ═════════════════════════════════════');
console.log(`  ${mitRahmen.length} Proben mit Rahmen, ${proben.length} insgesamt.`);
console.log(ungleich.length === 0
  ? '  ✓ Alle Kacheln gleich gross, keine haengt an einem Index.'
  : `  ✗ ${ungleich.length} Proben mit ungleichen Kacheln, z.B. ${JSON.stringify(ungleich[0].m.breiten)}`);

console.log('\n══ Was steht im Fenster, bevor es losdreht? ════════════════════');
console.log(erste
  ? (erste.neutral ? '  ✓ Eine neutrale Kachel.' : '  ✗ Schon ein Team.')
  : '  nichts gemessen');

console.log('\n══ Und am Ende? ═══════════════════════════════════════════════');
let ende = false;
if (letzte) {
  const versatz = linie != null ? Math.abs(letzte.grossX - linie) : null;
  ende = !!letzte.ring && letzte.grossB > 100 && versatz != null && versatz <= TOLERANZ;
  console.log(`  Sieger ${letzte.grossB}px bei x ${letzte.grossX}, Gewinnlinie war x ${linie} → ${versatz} px Versatz`);
  console.log(`  Ring: ${letzte.ring ?? 'keiner'}`);
  console.log(`  Zeile: ${letzte.text.slice(-46)}`);
}

const gut = ungleich.length === 0 && erste?.neutral && ende;
console.log(`\n${gut ? '✓ Alles in Ordnung.' : '✗ Noch nicht in Ordnung.'}`);
await b.schliessen?.();
process.exit(gut ? 0 : 1);
