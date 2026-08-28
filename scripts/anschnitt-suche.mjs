/* anschnitt-suche — wird irgendwo auf der Buehne Text abgeschnitten?
 *
 * 2026-08-28, Wolf, nach dem Kartoffel-Fund: „siehst du ob es noch
 * abgeschnittene windows gibt so wie in heisse kartoffel? da das ein random
 * fund war, haettest du dann auch sonst abgeschnittene gefunden?"
 *
 * Die ehrliche Antwort war NEIN. Die Kartoffel fiel auf, weil ich aus einem
 * anderen Grund einen Screenshot gemacht habe. Es gab kein Werkzeug, das
 * systematisch sucht - und ein Fehler, der nur bei zufaelligem Hinsehen
 * auffaellt, ist ein Fehler, den man am Abend findet und nicht davor.
 *
 * ── Wonach gesucht wird ───────────────────────────────────────────────────
 * Zwei Arten von Anschnitt, und die erste ist die heimtueckische:
 *
 *   1. STILL VERDECKT. Ein Kasten mit `overflow: hidden`, dessen Inhalt
 *      hoeher ist als er selbst. Nichts ragt heraus, nichts sieht kaputt aus -
 *      die letzte Zeile ist einfach weg. Genau das war die Heisse Kartoffel:
 *      101 px Kasten, 182 px Inhalt, drei Reihen unsichtbar.
 *   2. UEBER DIE KANTE. Ein Element, das unter y 990 oder neben x 1760
 *      hinausreicht. Das sieht man wenigstens.
 *
 * ── Warum das nicht trivial ist ───────────────────────────────────────────
 * ⚠️ `overflow: hidden` ist auf der Buehne der Normalfall, nicht die Ausnahme:
 * runde Avatare, beschnittene Bilder, Verlaufskanten. Ein Werkzeug, das jeden
 * Treffer meldet, meldet Hunderte und wird nach dem ersten Lauf ignoriert.
 * Deshalb wird gefiltert:
 *   - nur Kaesten, die TEXT enthalten (ein beschnittenes Bild ist Absicht)
 *   - nur Ueberlauf ueber 6 px (darunter sind es Rundungen und Schatten)
 *   - keine Bilder, Leinwaende, SVG
 *
 * ⚠️ Und es wird gewartet, bis die Auftrittsbewegung durch ist. Waehrend einer
 * Animation steht vieles kurz woanders; wer da misst, misst die Bewegung.
 *
 * NUTZUNG:
 *   node scripts/anschnitt-suche.mjs                 # der CozyQuiz-Abend
 *   node scripts/anschnitt-suche.mjs frage aufloesung
 */
import { buehneStarten, sleep } from './lib/buehne.mjs';

/** Die Stationen eines normalen CozyQuiz-Abends, in der Reihenfolge des Abends.
 *  Arena-eigene Stationen sind absichtlich nicht dabei - Wolf 2026-08-28:
 *  „lass erst die to dos machen die wirklich die aktive cozyquiz praesentation
 *  auf dem beamer betreffen". */
const ABEND = [
  'lobby', 'willkommen', 'regeln', 'ablauf', 'joker', 'fairplay', 'teams',
  'rundenintro', 'rundenintro2',
  'frage', 'frage2', 'frage3', 'frage4', 'frage5',
  'aufloesung', 'aufloesung2',
  'kartoffel', 'kartoffelraus',
  'pause', 'zwischenstand', 'brett',
  'finalwette', 'finalaufloesung', 'siegerehrung', 'spielende', 'danke',
];

/** Ab so vielen Pixeln gilt Inhalt als verdeckt. Darunter sind es Rundungen. */
const SCHWELLE = 6;
/** Luft zur Buehnenkante (dieselbe Begruendung wie LUFT in qqEinpassen.ts). */
const LUFT = 24;

// ⚠️ Die Schwellen kommen als ARGUMENT herein, nicht aus dem Modul. Der erste
// Lauf hat sie als Node-Konstanten benutzt und ist an jeder Station mit
// „SCHWELLE is not defined" gestorben - `page.evaluate` laeuft im Browser und
// kennt den Node-Bereich nicht.
const SUCHE = ({ SCHWELLE, LUFT }) => {
  const buehne = document.querySelector('[data-qq-buehne]') ?? document.body;
  const br = buehne.getBoundingClientRect();
  const s = br.height / 990;
  const nachBuehne = (px) => Math.round(px / s);
  /** Text OHNE die eingebetteten Stylesheets.
   *  ⚠️ Die Buehne traegt ihr CSS als `<style>`-Kind im Baum (qqShared.ts).
   *  `textContent` eines Vorfahren enthaelt damit die kompletten Keyframes -
   *  und genau das hat zwei Laeufe lang wie ein Fund ausgesehen. Der Filter
   *  auf das `<style>`-Element selbst half nicht: gemeldet wurde der ELTERN-
   *  Kasten, nicht das Stylesheet. */
  const echterText = (el) => {
    let t = '';
    for (const k of Array.from(el.childNodes)) {
      if (k.nodeType === 3) { t += k.textContent || ''; continue; }
      if (k.nodeType !== 1) continue;
      const kt = k.tagName.toLowerCase();
      if (kt === 'style' || kt === 'script' || kt === 'noscript') continue;
      t += echterText(k);
    }
    return t;
  };
  const kurz = (el) => echterText(el).trim().replace(/\s+/g, ' ').slice(0, 40);

  const verdeckt = [];
  const ueberKante = [];

  for (const el of Array.from(buehne.querySelectorAll('*'))) {
    if (!(el instanceof HTMLElement)) continue;
    const tag = el.tagName.toLowerCase();
    if (tag === 'img' || tag === 'canvas' || tag === 'svg' || tag === 'video') continue;
    // ⚠️ `<style>` hat textContent. Der erste Lauf hat auf zwei Stationen
    // Keyframe-Definitionen als „still verdeckten Text" gemeldet - beides
    // Fehlalarme, und beide sahen auf den ersten Blick nach einem Fund aus.
    if (tag === 'style' || tag === 'script' || tag === 'noscript') continue;
    if (el.closest('style, script')) continue;
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) < 0.05) continue;

    const text = kurz(el);

    // 1. Still verdeckt: eigener Deckel, mehr Inhalt als Platz.
    if ((st.overflow === 'hidden' || st.overflowY === 'hidden') && text) {
      const ueber = el.scrollHeight - el.clientHeight;
      if (ueber > SCHWELLE && el.clientHeight > 20) {
        // ⚠️ WAS verdeckt wird, nicht nur DASS etwas verdeckt wird. Ohne diese
        // Angabe ist der Befund nicht zu beurteilen: auf der Danke-Folie sah
        // das Bild einwandfrei aus, gemeldet waren trotzdem 32 px - dann muss
        // man wissen, ob dort eine Zeile fehlt oder nur ein Innenabstand
        // beschnitten ist. Das eine ist ein Fehler, das andere nicht.
        const grenze = el.getBoundingClientRect().bottom;
        let opfer = '', tiefsteKante = grenze;
        for (const k of Array.from(el.querySelectorAll('*'))) {
          if (!(k instanceof HTMLElement)) continue;
          const kt = k.tagName.toLowerCase();
          if (kt === 'style' || kt === 'script') continue;
          const t2 = kurz(k);
          if (!t2) continue;
          const eigen = Array.from(k.childNodes).some(x => x.nodeType === 3 && (x.textContent || '').trim());
          if (!eigen) continue;
          const kr = k.getBoundingClientRect();
          if (kr.bottom > tiefsteKante + 1) { tiefsteKante = kr.bottom; opfer = t2; }
        }
        verdeckt.push({
          ueber: nachBuehne(ueber * s), hoehe: nachBuehne(el.clientHeight * s), text,
          opfer, opferUeber: opfer ? nachBuehne((tiefsteKante - grenze) * s) : 0,
        });
      }
    }

    // 2. Ueber die Kante. Nur Elemente mit eigenem Text und ohne Kinder, die
    //    denselben Text tragen - sonst meldet jeder Wrapper dasselbe noch mal.
    if (!text) continue;
    const eigenerText = Array.from(el.childNodes).some(k => k.nodeType === 3 && (k.textContent || '').trim());
    if (!eigenerText) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 4) continue;
    const unten = nachBuehne(r.bottom - br.top);
    const rechts = nachBuehne(r.right - br.left);
    const links = nachBuehne(r.left - br.left);
    const oben = nachBuehne(r.top - br.top);
    // ⚠️ Der OBERE Rand wird nicht geprueft. Ein Rechteck umfasst die
    // ZEILENBOX, und die reicht bei den grossen Graden der Buehne weit ueber
    // die Oberkante der Buchstaben hinaus - der Schriftzug „COZYQUIZ" meldete
    // sich mit y 9, die Buchstaben von „Heute spielen" mit y 3, und beide
    // stehen in Wahrheit sauber. Zwei Laeufe lang habe ich stattdessen die
    // Schwelle nachgezogen; das war Symptomkur. Unten und seitlich bleibt die
    // Pruefung: dort liegt die Schrift enger an ihrer Box, und dort ist bisher
    // jeder echte Fund aufgetreten.
    void oben;
    if (unten > 990 - LUFT || rechts > 1760 - LUFT || links < LUFT) {
      ueberKante.push({ oben, unten, links, rechts, text });
    }
  }

  // Doppelte zusammenfassen (verschachtelte Kaesten mit demselben Text).
  const eindeutig = (liste, schluessel) => {
    const m = new Map();
    for (const e of liste) { const k = schluessel(e); if (!m.has(k)) m.set(k, e); }
    return [...m.values()];
  };
  return {
    verdeckt: eindeutig(verdeckt, e => e.text).slice(0, 6),
    ueberKante: eindeutig(ueberKante, e => e.text).slice(0, 6),
  };
};

const gewuenscht = process.argv.slice(2).filter(a => !a.startsWith('-'));
const stationen = gewuenscht.length ? gewuenscht : ABEND;

const befunde = [];
const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {}, entwurf: 'qq-vol-1' });
for (const name of stationen) {
  try {
    await b.zurStation(name);
    // ⚠️ Warten, bis der Auftritt durch ist. Waehrend einer Bewegung steht
    // vieles kurz woanders, und ein Treffer daraus ist ein Fehlalarm.
    await sleep(1200);
    const r = await b.seite.evaluate(SUCHE, { SCHWELLE, LUFT });
    befunde.push({ name, ...r });
    process.stdout.write(r.verdeckt.length || r.ueberKante.length ? '!' : '.');
  } catch (e) {
    befunde.push({ name, fehler: String(e).slice(0, 60), verdeckt: [], ueberKante: [] });
    process.stdout.write('?');
  }
}
await b.schliessen?.();
console.log('');

console.log('\n══ Anschnitt-Suche ueber den CozyQuiz-Abend ════════════════════');
// ⚠️ Ein Kasten, der nur LEERRAUM beschneidet, ist kein Fehler. Auf der
// Danke-Folie und beim Team-Auftritt meldete das Werkzeug 32 und 21 px, und
// beide Bilder waren einwandfrei: beschnitten wurde ein Innenabstand, kein
// Wort. Wer das als Fehler fuehrt, hat nach drei Laeufen ein Werkzeug, das
// niemand mehr liest - genau davor warnt der Kopf dieser Datei.
// Gezaehlt wird deshalb nur, wo TEXT verloren geht.
let treffer = 0;
for (const f of befunde) {
  if (f.fehler) { console.log(`\n  ${f.name.padEnd(16)} ? nicht erreichbar: ${f.fehler}`); continue; }
  const echteVerdeckte = f.verdeckt.filter(v => v.opfer);
  const nurLeerraum = f.verdeckt.filter(v => !v.opfer);
  if (!echteVerdeckte.length && !f.ueberKante.length) {
    if (nurLeerraum.length) {
      console.log(`\n  ${f.name}`);
      for (const v of nurLeerraum) {
        console.log(`    (nur Leerraum)  ${String(v.ueber).padStart(4)} px beschnitten, kein Text betroffen`);
      }
    }
    continue;
  }
  treffer++;
  console.log(`\n  ${f.name}`);
  for (const v of f.verdeckt) {
    console.log(`    STILL VERDECKT  ${String(v.ueber).padStart(4)} px von ${v.hoehe} px   „${v.text}"`);
    console.log(v.opfer
      ? `        davon Text: „${v.opfer}" ragt ${v.opferUeber} px darueber hinaus`
      : '        KEIN Text darunter - beschnitten wird nur Leerraum oder Abstand.');
  }
  for (const k of f.ueberKante) {
    console.log(`    UEBER DIE KANTE y ${k.oben}..${k.unten}, x ${k.links}..${k.rechts}   „${k.text}"`);
  }
}

// ⚠️ Fehlgeschlagene Stationen sind KEIN gruenes Ergebnis. Der erste Lauf hat
// „0 mit Befund, alles gut" gemeldet, obwohl jede einzelne Station mit einem
// Fehler abgebrochen war. Ein Werkzeug, das beim eigenen Versagen gruen zeigt,
// ist schlimmer als keins.
const kaputt = befunde.filter(f => f.fehler).length;
console.log('\n══ Urteil ══════════════════════════════════════════════════════');
console.log(`  ${befunde.length} Stationen abgesucht, ${treffer} mit Befund, ${kaputt} nicht erreichbar.`);
if (kaputt) console.log('  ⚠️ Nicht erreichbare Stationen sind UNGEPRUEFT, nicht sauber.');
console.log(treffer === 0 && !kaputt
  ? '  ✓ Nirgends wird Text still verdeckt oder ueber die Kante geschoben.'
  : '  ✗ Siehe oben. „STILL VERDECKT" ist der gefaehrliche Fall: da sieht man\n'
    + '    nichts, es fehlt einfach etwas.');
process.exit(treffer === 0 && !kaputt ? 0 : 1);
