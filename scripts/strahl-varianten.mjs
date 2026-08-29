/**
 * strahl-varianten.mjs — vier Fassungen derselben Schaetzchen-Aufloesung.
 *
 * 2026-08-29, Wolf: „spanne ist aus entfernung nicht wirklich sichtbar ... wie
 * saehe das aus wenn du das untere drittel mehr nutzt ich befuerchte nicht mehr
 * schoen mittig? kannst du es mir zeigen"
 *
 * Zwei Fragen, also vier Bilder:
 *   bestand      wie heute
 *   leise        Spanne wie im ersten Entwurf (4 px)
 *   lesbar       Spanne 12 px, deckend - fuer zehn Meter
 *   tief         lesbar + Schiene hoeher, Wappen groesser, damit die untere
 *                Bahn den leeren Streifen fuellt
 *
 * ⚠️ Der Lauf spielt das Spiel EINMAL bis zur Aufloesung und laedt danach nur
 * die Seite neu. Vier volle Durchlaeufe waeren viermal so teuer und wuerden
 * ausserdem viermal andere Bot-Tipps wuerfeln - dann vergleicht man zwei
 * Layouts an zwei Datensaetzen und weiss am Ende nichts.
 *
 * Dazu wird gemessen, wo die Flaeche wirklich benutzt wird: obere und untere
 * Leere in Pixeln. „Mittig" ist damit eine Zahl und keine Ansichtssache.
 */
import fs from 'node:fs';
import { buehneStarten, sleep, API, PIN } from './lib/buehne.mjs';

const ZIEL = '.shots/strahl';
fs.mkdirSync(ZIEL, { recursive: true });
const BOTS = 24;
const FASSUNGEN = (process.env.QQ_NUR ? process.env.QQ_NUR.split(',') : null)
  ? [
      { name: 'bestand', spanne: null, strahl: 'alt' },
      { name: 'luft', spanne: '2', strahl: 'luft' },
      { name: 'ruhig', spanne: null, strahl: null },
    ].filter(f => process.env.QQ_NUR.split(',').includes(f.name))
  : [
      { name: 'bestand', spanne: null, strahl: null },
      { name: 'leise', spanne: '1', strahl: null },
      { name: 'lesbar', spanne: '2', strahl: null },
      { name: 'tief', spanne: '2', strahl: 'tief' },
      { name: 'luft', spanne: '2', strahl: 'luft' },
      { name: 'ruhig', spanne: '2', strahl: 'ruhig' },
    ];

const tipps = (ziel) => Array.from({ length: BOTS }, (_, i) =>
  String(Math.round(ziel * (1 + ((i % 8) - 4) * 0.035 + (Math.floor(i / 8) - 1) * 0.018))));

const b = await buehneStarten({
  grossformat: true, entwurf: 'crowd-vol-1', kategorie: 'SCHAETZCHEN',
  frisch: true, bots: BOTS, antworten: 0,
});
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
    await b.emit('qq:revealAnswer');
    console.log(`Aufloesung steht, Ziel ${ziel}\n`);
  }
  if (!da) await b.helfer.naechsteFrage();
}
if (!da) { console.log('⚠️ Keine Schaetzchen-Frage erreicht.'); await b.schliessen(); process.exit(1); }

for (const f of FASSUNGEN) {
  await b.seite.evaluate((cfg) => {
    try {
      cfg.spanne ? localStorage.setItem('qq-spanne', cfg.spanne) : localStorage.removeItem('qq-spanne');
      cfg.strahl ? localStorage.setItem('qq-strahl', cfg.strahl) : localStorage.removeItem('qq-strahl');
    } catch { /* ignore */ }
  }, f);
  await b.seite.reload({ waitUntil: 'domcontentloaded' });
  // ⚠️ 4200 ms reichten nur VOR dem Ablauf. Seit die Spanne einen Vorlauf hat
  // und der Takt langsamer ist, endet die Choreographie erst rund 5 s nach dem
  // Aufbau der Seite - ein Bild bei 4,2 s zeigt den Tausch mittendrin und nicht
  // das Endbild, das hier verglichen werden soll.
  await sleep(8000);   // Seite laden + Aufdeck-Choreographie
  await b.seite.screenshot({ path: `${ZIEL}/${f.name}.png` });

  // Wo steht der Inhalt wirklich? Oberste und unterste Kante aller sichtbaren
  // Elemente mit Text oder Bild, gegen die 990 der Buehne.
  // ⚠️ Nicht „alles mit Inhalt" messen. Der erste Anlauf tat das und meldete
  // fuer alle vier Fassungen dieselbe Zahl - weil die Achsen-Beschriftungen
  // ganz unten und die Kategorie-Pille ganz oben immer mitgezaehlt wurden.
  // Interessant ist der BLOCK: die Kacheln und der Antwort-Kasten.
  const mass = await b.seite.evaluate(() => {
    const kacheln = [...document.querySelectorAll('[data-qq-rand-kachel]')].map(el => el.getBoundingClientRect());
    const antwort = [...document.querySelectorAll('*')]
      .filter(el => /Antwort/i.test((el.previousElementSibling?.textContent || '')))
      .map(el => el.getBoundingClientRect())[0];
    const oben = Math.min(...kacheln.map(r => r.top));
    const unten = Math.max(...kacheln.map(r => r.bottom));
    return {
      oben: Math.round(oben), unten: Math.round(unten),
      antwortUnten: antwort ? Math.round(antwort.bottom) : null,
      groesstesWappen: Math.round(Math.max(...[...document.querySelectorAll('[data-qq-rand-kachel] img')].map(i => i.getBoundingClientRect().height))),
      // Wie viel steht ueberhaupt auf der Folie? Zahlen und Woerter in den
      // Kacheln, das ist es, was auf zehn Meter gelesen werden muss.
      zeichen: [...document.querySelectorAll('[data-qq-rand-kachel]')]
        .map(el => (el.textContent || '').replace(/\s+/g, '')).join('').length,
    };
  });
  console.log(`  ${f.name.padEnd(8)} Kacheln ${mass.oben}..${mass.unten} · Luft ueber der obersten Kachel ${mass.antwortUnten != null ? mass.oben - mass.antwortUnten : '?'} · unter der untersten ${990 - mass.unten} · groesstes Wappen ${mass.groesstesWappen}px · Zeichen in den Kacheln ${mass.zeichen}`);
}
await b.schliessen();
process.exit(0);
