/**
 * mucho-probe.mjs — laeuft die MUCHO-Folie bei langen Antworten ineinander?
 *
 * 2026-08-29, Wolf mit zwei Bildern: „die mucho seite ist an zwei stellen
 * buggy, das haengt mit der ganzen schriftgroessen verschiebung zusammen ...
 * (kleiner hinweis, es wurde schon 5x versucht zu fixen, also du muesstest
 * behutsam dran und sorgfaeltig arbeiten und ueberpruefen?)"
 *
 * Genau deshalb zuerst ein Werkzeug und noch keine Zeile im Bauteil. Fuenf
 * Anlaeufe scheitern nicht an fehlenden Ideen, sondern daran, dass niemand den
 * Fall auf Ansage rot bekommt: in den Test-Entwuerfen sind die Optionen KURZ,
 * also passiert dort gar nichts. Der Harness legt jetzt die vier langen aus
 * Wolfs Bild unter (`optionen` in lib/buehne.mjs).
 *
 * Gemessen werden die beiden Stellen aus seinen Bildern:
 *   1. Frage laeuft   - liegt eine Antwortkarte unter der Abgabe-Leiste?
 *   2. Aufloesung     - liegt etwas unter der Sieger-Leiste, oder wird der
 *                       Inhalt unten abgeschnitten?
 * Dazu der Einpass-Faktor `--qq-fit`: ist er 1, hat der Einpasser die Enge gar
 * nicht bemerkt; ist er 0.5, ist er am Anschlag und die Enge bleibt trotzdem.
 *
 * Aufruf:  node scripts/mucho-probe.mjs        (CozyQuiz)
 *          QQ_GROSS=1 node scripts/mucho-probe.mjs   (CrowdQuiz)
 */
import fs from 'node:fs';
import { buehneStarten, sleep } from './lib/buehne.mjs';

const ZIEL = '.shots/mucho';
fs.mkdirSync(ZIEL, { recursive: true });
const GROSS = process.env.QQ_GROSS === '1';
const NAME = GROSS ? 'crowd' : 'cozy';

/** Die vier aus Wolfs Bild. Zwei davon brechen auf zwei Zeilen um. */
const LANGE_OPTIONEN = [
  'Krimi & Thriller',
  'Fantasy & Science-Fiction',
  'Romance / Liebesroman',
  'Historischer Roman',
];

/** Was steht wo, und ueberlappt es? Liefert nur harte Zahlen. */
const messen = () => ({
  fit: (() => {
    const el = document.querySelector('[style*="--qq-fit"]');
    return el ? getComputedStyle(el).getPropertyValue('--qq-fit').trim() || '(leer)' : '(nirgends gesetzt)';
  })(),
  karten: [...document.querySelectorAll('[data-qq-mucho-karte]')].map(el => {
    const r = el.getBoundingClientRect();
    return { t: (el.textContent || '').trim().slice(0, 26), oben: Math.round(r.top), unten: Math.round(r.bottom) };
  }),
  sperren: [...document.querySelectorAll('[data-qq-sperre]')].map(el => {
    const r = el.getBoundingClientRect();
    return { oben: Math.round(r.top), unten: Math.round(r.bottom), hoch: Math.round(r.height) };
  }),
  // Ueberlappungen: welcher sichtbare Text liegt hinter einer Sperre?
  ueberlappt: (() => {
    const sperrEls = [...document.querySelectorAll('[data-qq-sperre]')];
    const sperren = sperrEls.map(el => el.getBoundingClientRect()).filter(r => r.height > 4);
    const treffer = [];
    for (const el of document.querySelectorAll('*')) {
      const t = (el.textContent || '').trim();
      if (!t || t.length > 40 || el.children.length > 0) continue;
      // ⚠️ Was IN der Sperre steht, ueberlappt sie nicht - es gehoert ihr.
      // Der erste Lauf meldete „8/24 Abgaben" und drei Zaehler-Badges als
      // Ueberlappung; das ist der Inhalt der Team-Leiste selbst.
      if (sperrEls.some(sp => sp.contains(el))) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 20 || r.height < 12) continue;
      for (const s of sperren) {
        if (r.bottom > s.top + 2 && r.top < s.bottom - 2 && r.right > s.left + 2 && r.left < s.right - 2) {
          treffer.push(`„${t}" ${Math.round(r.top)}..${Math.round(r.bottom)} hinter Sperre ${Math.round(s.top)}..${Math.round(s.bottom)}`);
          break;
        }
      }
    }
    return [...new Set(treffer)];
  })(),
  // Die Geometrie, an der der Einpasser rechnet. Ohne sie raet man.
  fluss: (() => {
    const el = document.querySelector('[style*="--qq-fit"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const kinder = [...el.children].map(k => {
      const st = getComputedStyle(k);
      const kr = k.getBoundingClientRect();
      return {
        pos: st.position,
        oben: Math.round(kr.top), unten: Math.round(kr.bottom),
        offUnten: k.offsetTop + k.offsetHeight,
        t: (k.textContent || '').trim().slice(0, 22),
      };
    }).filter(k => k.unten - k.oben > 2);
    return {
      oben: Math.round(r.top), unten: Math.round(r.bottom),
      clientHeight: el.clientHeight, scrollHeight: el.scrollHeight,
      offsetTop: el.offsetTop, kinder,
    };
  })(),
  // Abgeschnitten: ragt etwas unter die Buehnenkante?
  unterKante: [...document.querySelectorAll('*')].filter(el => {
    const t = (el.textContent || '').trim();
    if (!t || t.length > 40 || el.children.length > 0) return false;
    const r = el.getBoundingClientRect();
    return r.height > 12 && r.width > 20 && r.bottom > 991;
  }).map(el => `„${(el.textContent || '').trim()}" bis ${Math.round(el.getBoundingClientRect().bottom)}`),
});

const b = await buehneStarten({
  grossformat: GROSS, entwurf: 'qq-vol-1', kategorie: 'MUCHO',
  // ⚠️ QQ_KURZ=1 laesst die Optionen des Entwurfs stehen. Das ist die
  // Gegenprobe, die bei so einem Eingriff wichtiger ist als der Fix selbst:
  // der NORMALE Abend mit kurzen Antworten darf sich nicht veraendern, der
  // Einpassfaktor muss dort 1 bleiben.
  optionen: process.env.QQ_KURZ === '1' ? null : LANGE_OPTIONEN,
  // ⚠️ Die Teamzahl gehoert zum Fall. Wolfs Bild zeigt drei Handys, ein
  // voller Abend hat bis zu acht - und bei der Aufloesung haengen die
  // Waehler-Marken unter den Karten, dort kostet jede zusaetzliche Reihe Hoehe.
  frisch: true, bots: Number(process.env.QQ_BOTS) || (GROSS ? 24 : 3), antworten: 0.6,
});
await b.aufbauen('spiel');
await b.helfer.zurFrage();

let da = false;
for (let i = 0; i < 12 && !da; i++) {
  if (b.helfer.zustand()?.currentQuestion?.category === 'MUCHO') {
    da = true;
    await b.helfer.antworten();
    await sleep(1200);
    await b.seite.screenshot({ path: `${ZIEL}/${NAME}-frage.png` });
    const a = await b.seite.evaluate(messen);
    console.log(`\n── ${NAME} · FRAGE LAEUFT · --qq-fit = ${a.fit}`);
    console.log(`   Sperren: ${a.sperren.map(s => `${s.oben}..${s.unten}`).join(' · ') || 'keine'}`);
    if (a.fluss) { console.log(`   Fluss ${a.fluss.oben}..${a.fluss.unten} · client ${a.fluss.clientHeight} scroll ${a.fluss.scrollHeight}`); for (const k of a.fluss.kinder) console.log(`     ${k.pos.padEnd(8)} ${String(k.oben).padStart(4)}..${String(k.unten).padStart(4)} offUnten ${k.offUnten} „${k.t}"`); }
    console.log(a.ueberlappt.length ? `   ⚠️ ROT, ueberlappt:\n     ${a.ueberlappt.join('\n     ')}` : '   ✓ nichts liegt hinter einer Sperre');
    console.log(a.unterKante.length ? `   ⚠️ ROT, unter der Kante: ${a.unterKante.join(' · ')}` : '   ✓ nichts unter der Kante');

    await b.emit('qq:revealAnswer');
    await sleep(1500);
    // Die MUCHO-Aufloesung laeuft in Takten, jeder braucht einen Klick.
    for (let k = 0; k < 6; k++) { await b.emit('qq:muchoRevealStep'); await sleep(900); }
    await sleep(1500);
    await b.seite.screenshot({ path: `${ZIEL}/${NAME}-aufloesung.png` });
    const r = await b.seite.evaluate(messen);
    console.log(`\n── ${NAME} · AUFLOESUNG · --qq-fit = ${r.fit}`);
    console.log(`   Sperren: ${r.sperren.map(s => `${s.oben}..${s.unten}`).join(' · ') || 'keine'}`);
    if (r.fluss) { console.log(`   Fluss ${r.fluss.oben}..${r.fluss.unten} · client ${r.fluss.clientHeight} scroll ${r.fluss.scrollHeight}`); for (const k of r.fluss.kinder) console.log(`     ${k.pos.padEnd(8)} ${String(k.oben).padStart(4)}..${String(k.unten).padStart(4)} offUnten ${k.offUnten} „${k.t}"`); }
    console.log(r.ueberlappt.length ? `   ⚠️ ROT, ueberlappt:\n     ${r.ueberlappt.join('\n     ')}` : '   ✓ nichts liegt hinter einer Sperre');
    console.log(r.unterKante.length ? `   ⚠️ ROT, unter der Kante: ${r.unterKante.join(' · ')}` : '   ✓ nichts unter der Kante');
  }
  if (!da) await b.helfer.naechsteFrage();
}
if (!da) console.log('⚠️ Keine MUCHO-Frage erreicht.');
await b.schliessen();
process.exit(0);
