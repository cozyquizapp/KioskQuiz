/* ueberlauf-finden — WELCHES Element kippt die Aufloesung ueber die Kante?
 *
 * 2026-08-28, Wolf: „die motions sind sehr unruhig aktuell, springt viel und
 * aendert die groesse ... vorallem bei 10 v 10 und mucho".
 *
 * `scripts/einpassen-unruhe.mjs` hat gezeigt DASS die Folie kippt und was es
 * kostet (14 bis 20 Prozent Schriftgroesse, Frage 72 -> 60 px). Es hat aber
 * nicht gezeigt WER kippt - und ohne das laesst sich der Umbau nicht bauen,
 * sondern nur raten. Sechs geratene Stellschrauben stehen im Kopf des anderen
 * Werkzeugs, alle sechs waren falsch.
 *
 * ── Was hier gemessen wird ────────────────────────────────────────────────
 * Jeden Bildschirm-Takt: `scrollHeight` des Fluss-Containers gegen seine
 * `clientHeight`, und die Hoehe JEDES Nachfahren. Gesucht ist das erste Bild,
 * in dem der Fluss ueberlaeuft, und die Frage: welche Elemente sind in genau
 * diesem Bild hoeher geworden?
 *
 * ⚠️ Der Einpasser wird fuer die Messung STILLGELEGT (`--qq-fit` fest auf 1).
 * Sonst korrigiert er den Ueberlauf weg, waehrend man ihn sucht, und man misst
 * die Reaktion statt der Ursache. Genau dieser Fehler hat vorher zwei Anlaeufe
 * gekostet: die Aenderungen bei +3,5 s waren samt und sonders Folgen der
 * Verkleinerung, nicht ihr Ausloeser.
 *
 * NUTZUNG:  node scripts/ueberlauf-finden.mjs [mucho|zehn]
 */
import { buehneStarten, sleep } from './lib/buehne.mjs';

const FAELLE = {
  mucho: { kategorie: 'MUCHO', schritt: 'qq:muchoRevealStep', label: 'Mu-Cho' },
  zehn: { kategorie: 'ZEHN_VON_ZEHN', schritt: 'qq:zvzRevealStep', label: '10 von 10' },
};
const name = process.argv[2] ?? 'mucho';
const fall = FAELLE[name] ?? FAELLE.mucho;

const b = await buehneStarten({
  bots: 8, frisch: true, takt: () => {},
  kategorie: fall.kategorie, entwurf: 'qq-vol-1',
});
await b.zurStation('frage');
await sleep(1200);
await b.helfer.antworten();
await sleep(1500);

await b.seite.evaluate(() => {
  window.__u = [];
  const t0 = performance.now();
  const finde = () => {
    for (const el of Array.from(document.querySelectorAll('[style]')))
      if (el.style.getPropertyValue('--qq-fit') !== '') return el;
    return null;
  };
  /** Kurzer, wiedererkennbarer Name fuer ein Element. */
  const kennung = (k) => {
    const daten = Array.from(k.attributes).find(a => a.name.startsWith('data-qq'));
    if (daten) return `[${daten.name}]`;
    const t = (k.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28);
    return t ? `„${t}"` : `<${k.tagName.toLowerCase()}>`;
  };
  const vor = new WeakMap();
  const vorAbstand = new WeakMap();
  // ⚠️ Abstaende stecken NICHT in `offsetHeight`. Der erste Anlauf hat nur
  // Hoehen verglichen und im Kippbild „nichts" gemeldet - obwohl die Folie
  // genau dort 17 px zu hoch wurde. Raender, Innenabstaende und Luecken
  // gehoeren also mitgemessen, sonst sucht man den Ausloeser dort, wo er
  // grundsaetzlich nicht sein kann.
  const abstand = (st) => [
    st.marginTop, st.marginBottom, st.paddingTop, st.paddingBottom,
    st.rowGap, st.gap, st.height, st.minHeight,
  ].join('|');
  const takt = () => {
    const el = finde();
    if (el) {
      // ⚠️ Stilllegen. Sonst misst man die Korrektur, nicht die Ursache.
      el.style.setProperty('--qq-fit', '1');
      const gewachsen = [];
      for (const k of Array.from(el.querySelectorAll('*'))) {
        const h = k.offsetHeight;
        const alt = vor.get(k);
        vor.set(k, h);
        if (alt !== undefined && h - alt > 1) gewachsen.push({ n: kennung(k), von: alt, nach: h });
        // ⚠️ NEU aufgetauchte Elemente gehoeren hier dazu. Im Schwester-
        // Werkzeug werden sie ausgefiltert (dort sind sie die gewollte
        // Aufloesung) - und genau diesen Filter habe ich hier zuerst
        // uebernommen. Ergebnis: das Kippbild meldete „nichts ist gewachsen",
        // obwohl die Folie in genau diesem Bild 17 px zu hoch wurde. Was neu
        // in den Fluss kommt, bringt seine Hoehe mit.
        else if (alt === undefined && h > 1) gewachsen.push({ n: kennung(k), neu: true, nach: h });
        const st = window.getComputedStyle(k);
        const a = abstand(st);
        const altA = vorAbstand.get(k);
        vorAbstand.set(k, a);
        if (altA !== undefined && altA !== a) {
          gewachsen.push({ n: kennung(k), abstandVon: altA, abstandNach: a });
        }
      }
      window.__u.push({
        t: Math.round(performance.now() - t0),
        scroll: el.scrollHeight, client: el.clientHeight,
        ueber: el.scrollHeight - el.clientHeight,
        gewachsen,
      });
    }
    window.__ur = requestAnimationFrame(takt);
  };
  takt();
});
await sleep(400);
await b.emit('qq:revealAnswer');
await sleep(1800);
for (let i = 0; i < 8; i++) { await b.emit(fall.schritt); await sleep(700); }
await sleep(2500);

const log = await b.seite.evaluate(() => { cancelAnimationFrame(window.__ur); return window.__u; });
await b.schliessen?.();

console.log(`\n══ ${fall.label}: wann laeuft der Fluss ueber? ═══════════════════`);
const erstes = log.findIndex(e => e.ueber > 1);
if (erstes < 0) {
  console.log('  Kein Ueberlauf in diesem Lauf. Die Bots haben kurz geantwortet -');
  console.log('  noch einmal laufen lassen, die Folie steht haarscharf an der Kante.');
  process.exit(0);
}
const e = log[erstes];
console.log(`  Erstes Bild mit Ueberlauf: +${e.t} ms   ${e.scroll} von ${e.client} px, also ${e.ueber} px zu viel`);
console.log('\n  In genau diesem Bild hoeher geworden:');
if (!e.gewachsen.length) console.log('    (nichts - der Ueberlauf kommt aus einem Abstand, nicht aus einem Element)');
for (const g of e.gewachsen) {
  if (g.neu) {
    console.log(`    NEU im Fluss, ${g.nach} px hoch   ${g.n}`);
  } else if (g.abstandNach) {
    console.log(`    ${g.n}`);
    console.log(`      Abstaende vorher : ${g.abstandVon}`);
    console.log(`      Abstaende nachher: ${g.abstandNach}`);
  } else {
    console.log(`    ${String(g.von).padStart(4)} -> ${String(g.nach).padStart(4)} px   ${g.n}`);
  }
}

console.log('\n  Die fuenf Bilder davor:');
for (let i = Math.max(0, erstes - 5); i < erstes; i++) {
  const v = log[i];
  const w = v.gewachsen.map(g => g.neu ? `${g.n} NEU ${g.nach}px` : g.abstandNach ? `${g.n} Abstand` : `${g.n} +${g.nach - g.von}`).join(', ');
  console.log(`    +${String(v.t).padStart(5)} ms  ueber ${String(v.ueber).padStart(4)} px  ${w || '-'}`);
}

// Wer hat ueber den ganzen Lauf am meisten Hoehe beigesteuert?
const summe = new Map();
for (const bild of log) for (const g of bild.gewachsen) {
  if (g.abstandNach || g.neu) continue;
  summe.set(g.n, (summe.get(g.n) ?? 0) + (g.nach - g.von));
}
console.log('\n  Groesste Hoehen-Zuwaechse ueber den ganzen Lauf:');
for (const [n, px] of [...summe.entries()].sort((a, b2) => b2[1] - a[1]).slice(0, 8)) {
  console.log(`    +${String(Math.round(px)).padStart(4)} px   ${n}`);
}
