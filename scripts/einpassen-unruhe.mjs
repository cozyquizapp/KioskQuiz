/* einpassen-unruhe — was bewegt sich waehrend einer Aufloesung, und wie weit?
 *
 * 2026-08-28, Wolf: „mir ist auf den active questions zu den reveals
 * aufgefallen, dass die motions sehr unruhig sind aktuell, springt viel und
 * aendert die groesse, das ist seit der aenderungen mit der schrift. ich
 * glaube vorallem bei 10 v 10 und mucho".
 *
 * Zwei Beschwerden, zwei Ursachen. Das Werkzeug misst beide getrennt.
 *
 * ── „aendert die groesse" ─────────────────────────────────────────────────
 * `useEinpassen` (qqEinpassen.ts) setzt EINEN Faktor `--qq-fit`, mit dem Frage
 * UND Antworten multipliziert werden. Aendert er sich, aendert sich alles
 * gleichzeitig, ohne Uebergang.
 *
 * ── „springt" ─────────────────────────────────────────────────────────────
 * Die Aufloesung aendert die Groesse von Bloecken IM FLUSS (der Sieger-Slot
 * faehrt von 0 auf 210 px auf, die Frage wechselt ihre Schriftleiter). Alles
 * darunter und darueber rueckt nach. Gemessen wird deshalb der GESAMTWEG jedes
 * Elements, das im Bild bleibt.
 *
 * ── Drei Irrtuemer, die dieses Werkzeug ausgeraeumt hat ───────────────────
 * ⚠️ 1. Erste Fassung sah nur `--qq-fit` an und meldete bei 10 von 10 NICHTS,
 *       obwohl Wolf genau die nennt. „Springt" ist Lage, nicht Groesse.
 * ⚠️ 2. Zweite Fassung verglich alle Kinder als Zeichenkette und meldete jedes
 *       EINFLIEGEN als Sprung - 26 Stueck, die meisten davon gewollt. Gezaehlt
 *       wird nur, was im Bild BLEIBT und sich dabei bewegt.
 * ⚠️ 3. `Math.abs` auf den Deltas verwischte „waechst weich" und „schwingt
 *       nach". Vorzeichen bleiben jetzt erhalten.
 *
 * ── Wo der spaete Sprung wirklich herkommt ───────────────────────────────
 * Bei +3,5 s waechst ein Block im Fluss um ACHT Pixel (die Sieger-Karte,
 * Akt 3). Das kippt die Folie ueber die Sperre - und weil `--qq-fit` nur
 * SCHRIFT skaliert und keine Abstaende, kostet dieser eine Schritt 14 bis
 * 20 Prozent Schriftgroesse. Die MUCHO-Aufloesung steht also haarscharf am
 * Rand, und alles, was spaet noch dazukommt, wird teuer bezahlt.
 *
 * Warum es mal auftritt und mal nicht: die Bots antworten pro Lauf anders,
 * also ist die Folie mal ein paar Pixel unter und mal ueber der Grenze.
 * ⚠️ Wer hier etwas aendert, misst DREI Laeufe. Ein einzelner gruener Lauf
 * beweist nichts - genau darauf bin ich am 28.08. einmal hereingefallen.
 *
 * ── Fuenf Sackgassen, alle am 2026-08-28 gemessen und zurueckgenommen ─────
 * Sie stehen hier, damit sie niemand ein zweites Mal geht.
 *
 * ⚠️ 1. Uebergang auf `height` raus (CozyQuizQuestionView.tsx:3567).
 *       Gesamtweg UNVERAENDERT (261 statt 260 px). Der Uebergang verteilt die
 *       Bewegung nur auf mehr Bilder, er verursacht sie nicht.
 * ⚠️ 2. Sieger-Slot von Anfang an voll reserviert.
 *       Weg halbiert (260 -> 128 px), ABER der Einpasser verkleinert dann
 *       waehrend der laufenden Frage (10 von 10 auf fit 0.500) und springt bei
 *       der Aufloesung nach OBEN. Ein Fehler gegen einen schlimmeren getauscht.
 * ⚠️ 3. Platz fuer die Marken an `revealed` statt an den Kaskadenschritt.
 *       Wirkungslos: der Schritt steht beim Reveal ohnehin schon auf 1.
 * ⚠️ 4. `transitionend`-Horcher im Einpasser, damit er Aenderungen an
 *       `row-gap` ueberhaupt bemerkt (die sieht weder ResizeObserver noch
 *       MutationObserver, weil weder Container noch Kinder ihre Groesse
 *       aendern). Ergebnis: er feuert nach jeder eigenen Korrektur erneut und
 *       vergroessert zurueck - 72 -> 65 -> 62 -> 68 -> 72 px in fuenf Sekunden.
 *       Schrift, die unter dem Blick wieder waechst, ist das schlechteste
 *       Ergebnis von allen.
 * ⚠️ 5. Ratsche (innerhalb einer Folie nur noch kleiner werden).
 *       Ein kurzer Ueberlauf beim Aufbau friert die Frage dauerhaft kleiner
 *       ein (105 -> 94 px) und beim Reveal springt sie wieder hoch.
 * ⚠️ 6. Markenabstand mit `--qq-fit` skalieren und die gemessene Luft (8 px je
 *       Abstand) herausnehmen. Zu wenig: 2 von 3 Laeufen sprangen weiter.
 *
 * ── Was daraus folgt ──────────────────────────────────────────────────────
 * Am Einpasser laesst sich das nicht reparieren, und mit ein paar Pixeln
 * Abstand auch nicht. Die Sieger-Karte darf beim Auftauchen SCHLICHT KEINE
 * Fluss-Hoehe hinzufuegen; ihr Platz muss ab dem ersten Bild der Aufloesung
 * stehen. Das ist ein Umbau an der Aufloesung, keine Stellschraube.
 *
 * ⚠️ Was diese Messung NICHT sagt: ob die Endgroesse richtig ist. Ein Werkzeug,
 * das nur die Zahl der Spruenge kleiner macht, koennte einfach zu klein
 * anfangen. Deshalb steht die Endgroesse mit in der Ausgabe.
 *
 * NUTZUNG:
 *   node scripts/einpassen-unruhe.mjs            # MUCHO und 10 von 10
 *   node scripts/einpassen-unruhe.mjs mucho      # nur eine Kategorie
 */
import { buehneStarten, sleep } from './lib/buehne.mjs';

/** Erlaubt: so viele Groessenspruenge darf eine Aufloesung haben.
 *  Einer ist in Ordnung - er sitzt im Uebergang, wo ohnehin alles neu kommt.
 *  Ab zwei sieht man ein Zucken mitten im Bild. */
const ERLAUBT_SPRUENGE = 1;
/** Und ein Sprung nach OBEN ist immer falsch: die Schrift wird wieder groesser,
 *  waehrend der Saal schon liest. */
const ERLAUBT_HOCH = 0;

const FAELLE = {
  mucho: { kategorie: 'MUCHO', entwurf: 'qq-vol-1', mega: false, label: 'Mu-Cho' },
  zehn:  { kategorie: 'ZEHN_VON_ZEHN', entwurf: 'qq-vol-1', mega: false, label: '10 von 10' },
};

const gewuenscht = process.argv.slice(2).filter(a => !a.startsWith('-'));
const namen = gewuenscht.length ? gewuenscht : Object.keys(FAELLE);

/** Im Browser: jeden Bildschirm-Takt Groesse UND Lage lesen.
 *
 * ⚠️ Der erste Anlauf hat nur `--qq-fit` beobachtet und bei 10 von 10 NICHTS
 * gemeldet - obwohl Wolf genau die als eine der unruhigsten nennt. „Springt"
 * ist eben Lage, nicht Groesse, und die beiden haben verschiedene Ursachen.
 *
 * ⚠️ Gemessen wird ueber `offsetTop`/`offsetHeight`, nicht ueber
 * `getBoundingClientRect`. Auftritts-Bewegungen laufen ueber `transform`, und
 * ein Rechteck misst die mit. Ein Werkzeug, das sie mitzaehlt, meldet jede
 * gewollte Einblendung als Sprung und ist damit wertlos. Offsets kennen keine
 * Transforms: was sie melden, ist eine echte Verschiebung im Fluss - genau
 * das, was der Saal als Zucken sieht.
 */
const AUFZEICHNER = () => {
  const w = window;
  w.__log = [];
  const start = performance.now();
  let vorher = null;
  const finde = () => {
    // Der Fluss-Container ist das einzige Element, auf dem `--qq-fit` als
    // Inline-Eigenschaft steht (useEinpassen setzt es per style.setProperty).
    for (const el of Array.from(document.querySelectorAll('[style]'))) {
      if (el.style.getPropertyValue('--qq-fit') !== '') return el;
    }
    return null;
  };
  /** Die Frage ist das groesste Schriftbild im Fluss. Kein Ratespiel ueber
   *  Klassennamen, die sich aendern koennen. */
  const frageGrad = (el) => {
    let max = 0;
    for (const k of Array.from(el.querySelectorAll('*'))) {
      if (!k.textContent || !k.textContent.trim()) continue;
      const px = parseFloat(getComputedStyle(k).fontSize) || 0;
      if (px > max) max = px;
    }
    return Math.round(max);
  };
  // ⚠️ Ein neu eingeblendetes Element ist KEIN Sprung, das ist die Aufloesung.
  // Der erste Anlauf hat alle Kinder als eine Zeichenkette verglichen und
  // deshalb jedes Einfliegen als „Lageverschiebung" gemeldet: 26 Stueck bei
  // 10 von 10, und die meisten davon waren gewollt. Gezaehlt wird jetzt nur,
  // was im Bild BLEIBT und sich dabei bewegt - das ist es, was der Saal als
  // Zucken sieht.
  const zuletzt = new WeakMap();
  const takt = () => {
    const el = finde();
    if (el) {
      const bewegt = [];
      for (const k of Array.from(el.querySelectorAll('*'))) {
        if (k.offsetHeight <= 1 || !k.textContent?.trim()) continue;
        const jetztLage = { o: k.offsetTop, h: k.offsetHeight, l: k.offsetLeft, b: k.offsetWidth };
        const alt = zuletzt.get(k);
        zuletzt.set(k, jetztLage);
        if (!alt) continue;                              // neu: gewollt
        const dy = jetztLage.o - alt.o;
        const dh = jetztLage.h - alt.h;
        // 2026-08-28, Wolf: „text rueckt ein". Waagerecht war bis dahin gar
        // nicht gemessen - ein Werkzeug, das nur Hoehen kennt, kann eine
        // seitliche Verschiebung grundsaetzlich nicht finden.
        const dx = jetztLage.l - alt.l;
        const db = jetztLage.b - alt.b;
        // ⚠️ Vorzeichen BEHALTEN. Der erste Anlauf hat `Math.abs` genommen und
        // dadurch eine weiche Bewegung („waechst 700 ms lang") nicht von einem
        // Nachschwingen („waechst und schrumpft") unterscheiden koennen. Das
        // sind zwei ganz verschiedene Fehler mit zwei verschiedenen Ursachen.
        if (Math.abs(dy) > 2 || Math.abs(dh) > 2 || Math.abs(dx) > 2 || Math.abs(db) > 2) {
          const t = (k.textContent || '').trim().slice(0, 24);
          bewegt.push({ dy, dh, dx, db, t });
          // Gesamtweg je Element ueber die ganze Aufloesung. Das ist die Zahl,
          // die zaehlt: nicht wie oft es zuckt, sondern wie weit es wandert.
          const w2 = (window.__weg ??= {});
          const e = (w2[t] ??= { hoch: 0, hoehe: 0, n: 0 });
          e.hoch += Math.abs(dy); e.hoehe += dh; e.quer = (e.quer ?? 0) + Math.abs(dx); e.n++;
        }
      }
      const jetzt = {
        fit: Number(el.style.getPropertyValue('--qq-fit')) || 1,
        px: frageGrad(el),
      };
      const fitAnders = !vorher || Math.abs(jetzt.fit - vorher.fit) > 0.001;
      const pxAnders = !vorher || jetzt.px !== vorher.px;
      if (!vorher || fitAnders || pxAnders || bewegt.length) {
        // Der groesste Versatz dieses Bildes steht stellvertretend fuer alle.
        const schlimmster = bewegt.sort((a, b) => (b.dy + b.dh) - (a.dy + a.dh))[0];
        w.__log.push({ t: Math.round(performance.now() - start), ...jetzt,
          n: bewegt.length,
          dy: schlimmster?.dy ?? 0, dh: schlimmster?.dh ?? 0,
          dx: schlimmster?.dx ?? 0, wer: schlimmster?.t ?? '',
          was: !vorher ? 'start'
            : [fitAnders ? 'fit' : null, pxAnders ? 'schrift' : null,
               bewegt.length ? 'lage' : null].filter(Boolean).join('+') });
        vorher = jetzt;
      }
    }
    w.__raf = requestAnimationFrame(takt);
  };
  takt();
};

async function messen(name) {
  const fall = FAELLE[name];
  if (!fall) { console.log(`  ? Unbekannter Fall: ${name}`); return null; }

  const b = await buehneStarten({
    bots: 8, frisch: true, takt: () => {},
    kategorie: fall.kategorie, entwurf: fall.entwurf,
  });
  const seite = b.seite;
  const h = b.helfer;

  // ⚠️ Der Harness baut FAUL auf. Ein direktes `h.zurFrage()` laeuft ins Leere:
  // der erste Anlauf meldete „simAnswers 400 Nur bei aktiver Frage" und
  // „Bots entfernt: 0" - es gab schlicht noch kein Spiel. Erst aufbauen.
  await b.zurStation('frage');
  await sleep(1200);
  await h.antworten();
  await sleep(1500);

  await seite.evaluate(AUFZEICHNER);
  await sleep(400);

  // Jetzt die Aufloesung, so wie am Abend.
  await b.emit('qq:revealAnswer');
  await sleep(1800);
  const schritt = fall.kategorie === 'MUCHO' ? 'qq:muchoRevealStep' : 'qq:zvzRevealStep';
  for (let i = 0; i < 8; i++) { await b.emit(schritt); await sleep(700); }
  await sleep(2500);

  const { log, weg } = await seite.evaluate(() => {
    if (window.__raf) cancelAnimationFrame(window.__raf);
    return { log: window.__log ?? [], weg: window.__weg ?? {} };
  });
  await b.schliessen?.();
  return { fall, log, weg };
}

const ergebnisse = [];
for (const n of namen) {
  const r = await messen(n);
  if (r) ergebnisse.push(r);
}

console.log('\n══ Unruhe waehrend der Aufloesung ══════════════════════════════');
let schlecht = 0;
for (const { fall, log, weg } of ergebnisse) {
  console.log(`\n  ${fall.label}`);
  if (!log.length) { console.log('    (kein Einpasser aktiv - laeuft die Buehne im Buehnen-Thema?)'); schlecht++; continue; }
  const spruenge = log.slice(1);
  const schrift = spruenge.filter(e => e.was.includes('schrift') || e.was.includes('fit'));
  const lage = spruenge.filter(e => e.was.includes('lage'));
  const hoch = spruenge.filter((e, i) => e.fit > log[i].fit);
  console.log(`    Ausgangswert          Frage ${log[0].px} px, fit ${log[0].fit.toFixed(3)}`);
  for (const e of schrift) {
    console.log(`    +${String(e.t).padStart(5)} ms  Schrift ${String(e.px).padStart(3)} px`
      + `  (fit ${e.fit.toFixed(3)})`);
  }
  console.log(`    ${schrift.length} Schriftwechsel (${hoch.length} nach OBEN)`
    + `, ${lage.length} Bilder mit Bewegung im Bestand`
    + `   Endgroesse ${log[log.length - 1].px} px`);
  // Zeitleiste: WANN wird bewegt? 2026-08-28, Wolf nach dem ersten Fix:
  // „nach timer springt es kurz, wenn gewinnerteam unten reinkommt ist es auch
  // eher ein harter sprung, sonst gut". Die Summe je Element beantwortet das
  // nicht - zwei Momente von je 20 px lesen sich voellig anders als eine
  // Bewegung von 40 px am Stueck. Also die Bilder mit Bewegung auflisten.
  if (lage.length) {
    console.log('    Zeitleiste der Bewegung (jedes Bild mit Versatz im Bestand):');
    for (const e of lage) {
      console.log(`      +${String(e.t).padStart(5)} ms   ${String(e.n).padStart(2)} Elemente,`
        + ` groesster Versatz ${e.dy > 0 ? '+' : ''}${e.dy} px hoch/runter`
        + (e.dx ? `, ${e.dx > 0 ? '+' : ''}${e.dx} px seitlich` : '')
        + `   „${e.wer}"`);
    }
  }
  const wandert = Object.entries(weg).sort((a, b) => b[1].hoch - a[1].hoch).slice(0, 5);
  if (wandert.length) {
    console.log('    Gesamtweg je Element (nur was im Bild BLIEB):');
    for (const [t, e] of wandert) {
      console.log(`      ${String(Math.round(e.hoch)).padStart(5)} px gewandert,`
        + ` ${(e.hoehe >= 0 ? '+' : '') + Math.round(e.hoehe)} px Hoehe,`
        + (e.quer ? `, ${Math.round(e.quer)} px seitlich` : '')
        + ` ueber ${e.n} Bilder   „${t}"`);
    }
  }
  if (schrift.length > ERLAUBT_SPRUENGE || hoch.length > ERLAUBT_HOCH) schlecht++;
}

console.log('\n══ Urteil ══════════════════════════════════════════════════════');
console.log(schlecht === 0
  ? `  ✓ Hoechstens ${ERLAUBT_SPRUENGE} Schriftwechsel je Aufloesung, keiner nach oben.`
  : `  ✗ ${schlecht} von ${ergebnisse.length} Kategorien sind unruhig.`
    + '\n    Genau das meldet Wolf: waehrend der Saal schon liest, aendert die'
    + '\n    Folie noch Schriftgroesse und Lage.');
process.exit(schlecht === 0 ? 0 : 1);
