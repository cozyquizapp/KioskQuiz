/**
 * zahlenstrahl-probe.mjs — laufen die Wappen am Zahlenstrahl aus dem Bild?
 *
 * 2026-08-29. Auf EINEM Bild der Schwarmintelligenz stand eine Team-Kachel
 * halb ausserhalb („Google s…" abgeschnitten), im naechsten Lauf war nichts
 * mehr zu sehen. Ein Befund, der vom Zufall der Tippwerte abhaengt, ist keiner
 * - also werden die Tipps hier GESETZT statt gewuerfelt (`texts` in
 * dev/simAnswers, am selben Tag dafuer eingebaut).
 *
 * Zwei Ansichten teilen dieselbe Mechanik, und beide muessen durch:
 *   SCHAETZCHEN          → SchaetzchenReveal.tsx      (jeder normale Abend)
 *   BUNTE_TUETE/Schwarm  → CrowdEstimateReveal.tsx    (CrowdQuiz)
 *
 * Der Verdacht steht in beiden Dateien fast wortgleich:
 *   if (lo < LO) { … } else if (hi > HI) { … }
 * Steht eine Bahn auf BEIDEN Seiten ueber, wird nur links korrigiert. Und
 * geklemmt wird die MITTE des Wappens in Prozent - wie breit die Kachel
 * darunter ist, weiss die Rechnung nicht. Ein langer Teamname waechst nach
 * rechts ueber seine Mitte hinaus.
 *
 * Aufruf:  node scripts/zahlenstrahl-probe.mjs
 *          QQ_FALL=schaetzchen|schwarm  (Vorgabe: beide)
 */
import fs from 'node:fs';
import { buehneStarten, sleep, API, PIN } from './lib/buehne.mjs';

const ZIEL = '.shots/zahlenstrahl';
fs.mkdirSync(ZIEL, { recursive: true });
const BREITE = 1760;

/** Zwei Verteilungen, weil die erste Vermutung falsch war.
 *
 *  „eng" war mein Verdacht: alle Tipps dicht beieinander, das Entzerren
 *  schiebt die Bahn auseinander. Ergebnis: gruen, in beiden Ansichten. Bei
 *  einem dichten Cluster bleibt naemlich alles in der Mitte.
 *
 *  „breit" ist der Fall aus dem Bild: ein Team weit daneben. `axisPct` legt
 *  den Aeussersten per Bauart auf 96 Prozent, und 96 Prozent von 1760 sind
 *  1690 - fuer die MITTE der Kachel. Was rechts davon noch kommt, Name und
 *  Zahl, steht ausserhalb. Genau das ist der Verdacht: geklemmt wird die
 *  Mitte, die Breite kennt die Rechnung nicht. */
const VERTEILUNG = {
  eng: (ziel) => Array.from({ length: 8 }, (_, i) => String(Math.round(ziel * (1 + (i - 4) * 0.004)))),
  breit: (ziel) => Array.from({ length: 8 }, (_, i) => String(Math.round(ziel * (1 + (i - 4) * 0.06)))),
  // Der Fall aus dem Bild: sieben Teams nah dran, EINES weit darueber. Damit
  // legt axisPct genau eine Kachel ans rechte Ende und alle anderen in die
  // Mitte - das Entzerren hat dann nichts zu tun und die Aussenkachel bleibt,
  // wo die Rechnung sie hinlegt.
  // ⚠️ DREI Ausreisser, nicht einer. Mit einem einzigen war der Lauf nicht
  // reproduzierbar: die Bots antworten mit Verzoegerung von selbst, und ein
  // nachzuegelnder Bot ueberschreibt die Abgabe SEINES Teams. Viermal in Folge
  // hat das genau den Ausreisser erwischt und den Fall unsichtbar gemacht.
  // Drei gleiche Werte ueberleben eine einzelne Ueberschreibung.
  ausreisser: (ziel) => [
    ...Array.from({ length: 5 }, (_, i) => String(Math.round(ziel * (1 + (i - 2) * 0.004)))),
    ...Array(3).fill(String(Math.round(ziel * 1.065))),
  ],
};

const FAELLE = {
  schaetzchen: { entwurf: 'qq-vol-1', kategorie: 'SCHAETZCHEN', treffer: (q) => q?.category === 'SCHAETZCHEN' },
  schwarm: { entwurf: 'crowd-vol-1', kategorie: 'crowdEstimate', treffer: (q) => q?.bunteTuete?.kind === 'crowdEstimate' },
};
const gewuenscht = process.env.QQ_FALL ? [process.env.QQ_FALL] : Object.keys(FAELLE);
const streuung = process.env.QQ_STREUUNG ?? 'breit';
const tipps = VERTEILUNG[streuung] ?? VERTEILUNG.breit;

for (const name of gewuenscht) {
  const fall = FAELLE[name];
  if (!fall) { console.log(`  Unbekannter Fall „${name}"`); continue; }
  const b = await buehneStarten({
    grossformat: false, entwurf: fall.entwurf, kategorie: fall.kategorie,
    frisch: true, bots: 8, antworten: 0,
  });
  await b.aufbauen('spiel');
  console.log(`\n── ${name} · ${streuung} · largeGroupMode=${b.helfer.zustand()?.largeGroupMode}`);
  await b.helfer.zurFrage();

  let da = false;
  for (let i = 0; i < 12 && !da; i++) {
    const q = b.helfer.zustand()?.currentQuestion;
    if (fall.treffer(q)) {
      da = true;
      const ziel = Number(q.targetValue ?? q.bunteTuete?.targetValue ?? 1000);
      const r = await fetch(`${API}/api/qq/${encodeURIComponent(b.roomCode)}/dev/simAnswers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: PIN, stagger: false, texts: tipps(ziel) }),
      });
      console.log(`  Frage ${i + 1}, Ziel ${ziel}, Tipps gesetzt: ${r.status}`);
      await sleep(600);
      // ⚠️ Noch einmal setzen, unmittelbar vor dem Aufdecken. Die Bots
      // antworten von selbst und mit Verzoegerung; im ersten Anlauf war der
      // Ausreisser danach wieder weg und durch einen gewuerfelten Wert
      // ersetzt. Der zweite Aufruf leert die Tafel und schreibt sie neu.
      await fetch(`${API}/api/qq/${encodeURIComponent(b.roomCode)}/dev/simAnswers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: PIN, stagger: false, texts: tipps(ziel) }),
      });
      // Ohne Pause weiter: jede Millisekunde zwischen Setzen und Aufdecken ist
      // eine Gelegenheit fuer einen nachzuegelnden Bot, seinen Wert wieder
      // draufzuschreiben. Genau so ist der Ausreisser dreimal verschwunden.
      await b.emit('qq:revealAnswer');
      console.log(`  abgegeben: ${(b.helfer.zustand()?.answers ?? []).map(a => a.text).join(' ')}`);
      await sleep(3000);
      await b.seite.screenshot({ path: `${ZIEL}/${name}-${streuung}.png` });

      // Nur die Wappen-Kacheln messen, nicht die Hintergrundflaechen: die sind
      // absichtlich groesser als das Bild und wuerden jede Messung zumuellen
      // (am 29.08. schon einmal fuer einen Befund gehalten).
      const raus = await b.seite.evaluate((BR) => {
        const treffer = [];
        for (const el of document.querySelectorAll('*')) {
          const t = (el.textContent || '').trim();
          if (!t || t.length > 40) continue;
          if (el.children.length > 3) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 20 || r.height < 12) continue;
          if (r.right > BR + 1 || r.left < -1) treffer.push(`„${t}" ${Math.round(r.left)}..${Math.round(r.right)}`);
        }
        return [...new Set(treffer)];
      }, BREITE);
      console.log(raus.length
        ? `  ⚠️ ROT: ${raus.length} Element(e) ausserhalb 0..${BREITE}\n     ${raus.join('\n     ')}`
        : `  ✓ GRUEN: alles innerhalb 0..${BREITE}`);
      // Auch wenn nichts herausragt: WIE KNAPP war es? Ein Lauf, der nur
      // „gruen" sagt, verraet nicht, ob zwei Pixel oder zweihundert Luft
      // waren - und genau daran haengt hier alles.
      const knapp = await b.seite.evaluate(() => [...document.querySelectorAll('*')]
        .filter(el => {
          const t = (el.textContent || '').trim();
          return t && t.length <= 40 && el.children.length <= 3
            && el.getBoundingClientRect().width >= 20 && el.getBoundingClientRect().height >= 12;
        })
        .map(el => { const r = el.getBoundingClientRect(); return { t: (el.textContent || '').trim(), l: Math.round(r.left), r: Math.round(r.right) }; })
        .sort((a, b2) => b2.r - a.r).slice(0, 3)
        .map(x => `„${x.t}" ${x.l}..${x.r}`));
      console.log(`     rechteste Kacheln: ${knapp.join(' · ')}`);
    }
    if (!da) await b.helfer.naechsteFrage();
  }
  if (!da) console.log('  ⚠️ Die Frage wurde nicht erreicht.');
  await b.schliessen();
}
process.exit(0);
