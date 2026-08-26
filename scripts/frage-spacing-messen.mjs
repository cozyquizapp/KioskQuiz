/* frage-spacing-messen — wie gross darf die Frage wirklich werden?
 *
 * 2026-08-26 (Wolf: „das spacing in fragen darf optimiert sein, der text auf
 * beamer darf nicht zu klein sein? einfach nach optimiertem spacing").
 *
 * Nach dem Wechsel auf Bricolage Grotesque ist Platz frei geworden: gemessen
 * stand die Frage mit 83 px auf einer Buehne von 990 px Hoehe und liess je nach
 * Kategorie 697 bis 774 Bildpunkte darunter ungenutzt. Die Groesse haengt an
 * einer Leiter in CozyQuizQuestionView (`qFontSize`), und dort ist der
 * BINDENDE Wert der Hoehen-Term (cqh), nicht die Breite - die haette 109 px
 * erlaubt, die Hoehe hat auf 83 gedeckelt. Diese Leiter wurde fuer eine
 * breitere Schrift eingestellt.
 *
 * Statt einen neuen Faktor zu raten, sucht dieses Werkzeug die Obergrenze:
 * es setzt die Schriftgroesse Schritt fuer Schritt hoch und prueft nach jedem
 * Schritt, ob etwas ueberlaeuft. Der letzte Wert, bei dem nichts ueberlaeuft,
 * ist die Wahrheit fuer diese Station. Ueber alle Stationen zaehlt der
 * kleinste davon, denn die Leiter gilt fuer alle Kategorien.
 *
 * ⚠️ Geprueft wird nicht nur die Buehne, sondern auch der eigene Kasten der
 * Frage. Eine Frage kann laengst ueber ihren Block hinauslaufen und die
 * Antwortfelder verdecken, waehrend die Buehne selbst noch keine Scrollbar
 * hat - das faellt sonst erst am Beamer auf.
 *
 * NUTZUNG:  node scripts/frage-spacing-messen.mjs
 */
import { buehneStarten, sleep } from './lib/buehne.mjs';

const STATIONEN = ['frage', 'frage2', 'frage3', 'frage4', 'frage5'];
const SCHRITT = 4;
const OBERGRENZE = 190;

const b = await buehneStarten({ bots: 8, frisch: true, takt: () => {} });
const h = b.helfer ?? b;
const seite = h.seite();

const ergebnisse = [];

for (const st of STATIONEN) {
  try { await b.zurStation(st); await sleep(2300); }
  catch (e) { console.log(`  ${st}: nicht erreichbar`); continue; }

  const mass = await seite.evaluate(({ schritt, obergrenze }) => {
    const buehne = document.querySelector('[data-qq-buehne]');
    if (!buehne) return null;
    // Die Frage ist die groesste Textzeile der Folie.
    let frage = null, groesste = 0;
    for (const el of buehne.querySelectorAll('*')) {
      const eigen = [...el.childNodes].filter(n => n.nodeType === 3)
        .map(n => n.textContent.trim()).join(' ').trim();
      if (!eigen || eigen.length < 6) continue;
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (px > groesste) { groesste = px; frage = el; }
    }
    if (!frage) return null;

    const text = (frage.textContent ?? '').trim();
    const start = Math.round(groesste);
    const eltern = [];
    for (let p = frage.parentElement; p && p !== document.body; p = p.parentElement) eltern.push(p);

    // ⚠️ Gegen den AUSGANGSZUSTAND messen, nicht gegen null. Erster Anlauf
    // meldete auf jeder Station „Kasten laeuft ueber" schon bei der aktuellen
    // Groesse, also 0 Prozent Spielraum - und widersprach damit der Messung
    // davor, die 697 bis 774 freie Bildpunkte unter der Frage gezeigt hatte.
    // Der Grund: mehrere Eltern haben von Haus aus mehr Inhalt als Kasten und
    // schneiden ihn bewusst ab (Zierebenen, Verlaeufe). Das ist kein Ueberlauf,
    // das ist der Bauplan. Gezaehlt wird deshalb nur, was VORHER nicht
    // uebergelaufen ist.
    const schonVorher = new Set();
    for (const p of eltern) {
      if (p.scrollHeight - p.clientHeight > 2 || p.scrollWidth - p.clientWidth > 2) schonVorher.add(p);
    }

    /** Laeuft etwas ueber, das vorher nicht ueberlief? */
    const laeuftUeber = () => {
      const d = document.documentElement;
      if (d.scrollWidth - d.clientWidth > 1) return 'Seite breiter';
      if (d.scrollHeight - d.clientHeight > 1) return 'Seite hoeher';
      const br = buehne.getBoundingClientRect();
      const fr = frage.getBoundingClientRect();
      if (fr.left < br.left - 1 || fr.right > br.right + 1) return 'Frage aus der Buehne (seitlich)';
      if (fr.top < br.top - 1 || fr.bottom > br.bottom + 1) return 'Frage aus der Buehne (hoch)';
      for (const p of eltern) {
        if (schonVorher.has(p)) continue;
        if (p.scrollHeight - p.clientHeight > 2) return `Kasten <${p.tagName.toLowerCase()}> laeuft ueber`;
        if (p.scrollWidth - p.clientWidth > 2) return `Kasten <${p.tagName.toLowerCase()}> zu schmal`;
      }
      return null;
    };

    const vorher = frage.style.fontSize;
    let letzteGute = start, grund = null, zeilenBei = {};
    for (let px = start; px <= obergrenze; px += schritt) {
      frage.style.fontSize = `${px}px`;
      void frage.offsetHeight;                       // Layout erzwingen
      const lh = parseFloat(getComputedStyle(frage).lineHeight) || px * 1.2;
      zeilenBei[px] = Math.max(1, Math.round(frage.getBoundingClientRect().height / lh));
      const fehler = laeuftUeber();
      if (fehler) { grund = `${fehler} bei ${px} px`; break; }
      letzteGute = px;
    }
    frage.style.fontSize = vorher;
    void frage.offsetHeight;

    return {
      text: text.slice(0, 44), laenge: text.length,
      jetzt: start, moeglich: letzteGute, grund,
      zeilenJetzt: zeilenBei[start] ?? 1,
      zeilenDann: zeilenBei[letzteGute] ?? 1,
    };
  }, { schritt: SCHRITT, obergrenze: OBERGRENZE });

  if (!mass) { console.log(`  ${st}: keine Frage gefunden`); continue; }
  ergebnisse.push({ station: st, ...mass });
  console.log(`  ${st.padEnd(8)} „${mass.text}" (${mass.laenge} Zeichen)`);
  console.log(`           jetzt ${mass.jetzt} px (${mass.zeilenJetzt} Zeile(n))`
    + `  ->  moeglich ${mass.moeglich} px (${mass.zeilenDann} Zeile(n))`
    + `  = ${Math.round((mass.moeglich / mass.jetzt - 1) * 100)} % mehr`);
  if (mass.grund) console.log(`           Grenze: ${mass.grund}`);
}

console.log('\n══ Was die Leiter hergeben muss ════════════════════════════════');
if (ergebnisse.length) {
  const engste = ergebnisse.reduce((a, z) => (z.moeglich / z.jetzt < a.moeglich / a.jetzt ? z : a));
  const faktor = Math.min(...ergebnisse.map(e => e.moeglich / e.jetzt));
  console.log(`  Engster Fall: ${engste.station} (${engste.jetzt} -> ${engste.moeglich} px)`);
  console.log(`  Gemeinsamer Spielraum: Faktor ${faktor.toFixed(2)}`);
  console.log('  ⚠️ Das ist die OBERGRENZE, nicht der Zielwert. Ein Wert direkt an');
  console.log('     der Kante bricht beim ersten laengeren Fragetext. Mit Reserve');
  console.log(`     rechnen: rund Faktor ${(faktor * 0.88).toFixed(2)}.`);
}

await b.schliessen?.();
process.exit(0);
