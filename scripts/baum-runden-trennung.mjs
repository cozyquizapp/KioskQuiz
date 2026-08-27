/* baum-runden-trennung — sieht man im Fortschrittsbaum, wo eine Runde endet?
 *
 * 2026-08-27, Wolf zum Runden-Intro von Runde 2: „bei den symbolen im progress
 * tree wird nicht klar was runde 1 und runde 2 etc ist, die trennung ist nicht
 * so eindeutig?"
 *
 * ── Meine erste Vermutung war falsch, und das ist der Wert dieses Werkzeugs ─
 * Ich hatte auf die Abstaende getippt: im Code steht `gruppenGap = dotGap * 2`,
 * also nur Faktor 2, und unter Faktor 2 bis 3 liest sich eine Gruppierung
 * nicht. Gemessen kommt aber heraus:
 *
 *     innerhalb einer Runde    13 px
 *     zwischen den Runden     138 px im Mittel
 *     Faktor                   10,6
 *
 * (Der Grund: zwischen den Runden stehen zusaetzlich die CozyGame- und
 * Bieten-Knoten, und die bringen ihre eigene Breite mit.)
 *
 * An der Naehe liegt es also nicht. Es liegt am GLEIS. Der Strich wurde
 * zwischen jedem Paar benachbarter Stationen gezogen, auch ueber die
 * Rundengrenze - und weil die Luecke dort am groessten ist, war der Strich
 * dort am laengsten. Die Stelle, die trennen soll, hatte damit die
 * auffaelligste Verbindung im Bild. Eine Linie, die verbindet, schlaegt einen
 * Abstand, der trennt: das Auge folgt der Kontur, bevor es Luecken zaehlt.
 *
 * Deshalb misst dieses Werkzeug BEIDES: die Abstaende und ob im Zwischenraum
 * ein Strich liegt. Die zweite Zahl ist die, auf die es ankommt.
 *
 * ⚠️ Gemessen wird an der Ansicht, die Wolf fotografiert hat: dem Runden-Intro
 * von Runde 2 im UEBERBLICK (Station `rundenintroR2`). Nicht `rundenintro2` -
 * die heisst so, zeigt aber Runde 1 und ist schon einen Schritt weiter, im
 * Zoom auf die einzelne Runde. Dort gibt es die Frage gar nicht, es stehen nur
 * fuenf Kacheln da. Der erste Anlauf hat genau das gemessen und „0
 * Rundengrenzen" gemeldet.
 *
 * NUTZUNG:  node scripts/baum-runden-trennung.mjs
 */
import fs from 'node:fs';
import { buehneStarten, sleep } from './lib/buehne.mjs';

/** Liest alle Kacheln des Baums der Reihe nach und berechnet die Luecken. */
const messen = () => {
  const buehne = document.querySelector('[data-qq-buehne]');
  if (!buehne) return { fehler: 'keine Buehne' };
  const kacheln = [...buehne.querySelectorAll('[data-qq-baum-punkt]')];
  if (!kacheln.length) return { fehler: 'keine Baum-Kacheln (data-qq-baum-punkt fehlt)' };

  const br = buehne.getBoundingClientRect();
  const s = br.width / buehne.offsetWidth || 1;
  const px = (v) => Math.round(v / s);

  const reihe = kacheln.map(k => {
    const r = k.getBoundingClientRect();
    return {
      phase: k.getAttribute('data-qq-baum-phase'),
      art: k.getAttribute('data-qq-baum-punkt'),
      links: px(r.left - br.left),
      rechts: px(r.right - br.left),
      breite: px(r.width),
    };
  }).sort((a, b) => a.links - b.links);

  // Luecken zwischen benachbarten Kacheln, mit der Angabe, ob die Grenze
  // zwischen zwei Runden liegt.
  const luecken = [];
  for (let i = 1; i < reihe.length; i++) {
    const links = reihe[i - 1], rechts = reihe[i];
    const mitteX = (links.rechts + rechts.links) / 2;
    // Liegt im Zwischenraum ein Gleis-Abschnitt? Gesucht wird nicht per
    // `elementFromPoint` (das trifft je nach Stapelreihenfolge irgendetwas),
    // sondern ueber die Abschnitte selbst: flache, breite Kaesten auf der Hoehe
    // der Kachelmitte.
    const kr0 = kacheln[0].getBoundingClientRect();
    const mitteY = kr0.top + kr0.height / 2;
    // ⚠️ Seit dem 2026-08-27 gibt es ZWEI Arten Strich: das Gleis innerhalb einer
    // Runde und die schwache Bruecke darueber hinweg (Wolf: „jetzt sieht es
    // nicht mehr wie ein tree aus"). Von aussen sind beide flache Kaesten.
    // Ohne Kennung haette diese Pruefung die Bruecke als Gleis gezaehlt und
    // gemeldet, die Rundengrenze traege wieder einen Strich - also genau das
    // Gegenteil dessen, was gebaut wurde. Deshalb wird nach der Kennung gesucht.
    const deckt = (d) => {
      const r = d.getBoundingClientRect();
      // ⚠️ Untergrenze 0.4, nicht 1. Der Baum laeuft im Runden-Intro unter einem
      // Zoom; eine 1-px-Bruecke misst sich dort als 0,7 px und faellt sonst
      // durch. Genau so ist beim ersten Anlauf „nur 1 von 3 Bruecken" heraus-
      // gekommen, obwohl alle drei da waren.
      if (r.height > 8 || r.height < 0.4 || r.width < 6) return false;        // nur flache Striche
      if (r.top > mitteY || r.bottom < mitteY) return false;                  // auf Kachelhoehe
      const l = px(r.left - br.left), re = px(r.right - br.left);
      return l < mitteX + 2 && re > mitteX - 2;                               // deckt die Luecke
    };
    // ⚠️ Zwei Fragen, zwei Messpunkte, und das ist kein Versehen.
    //
    // Das GLEIS wird an der Mitte der Luecke geprueft: laeuft eine durchgehende
    // Linie ueber die Rundengrenze? Genau dort waere sie am auffaelligsten.
    //
    // Die BRUECKE dagegen darf irgendwo in der Luecke liegen, und muss es sogar:
    // seit der CozyGame-Knoten an seiner Runde haengt (2026-08-27), sitzt er
    // links in der Luecke, und die Bruecke laeuft rechts von ihm zur naechsten
    // Runde. Die Mitte der Luecke liegt dann AUF dem Knoten - dort ist weder
    // Gleis noch Bruecke. Der erste Anlauf hat genau deshalb „nur 1 von 3
    // Bruecken" gemeldet, obwohl alle drei im Bild stehen; die einzige, die er
    // fand, war die an der breiteren Bieten-Grenze.
    const inDerLuecke = (d) => {
      const r = d.getBoundingClientRect();
      if (r.height > 8 || r.height < 0.4 || r.width < 6) return false;
      if (r.top > mitteY || r.bottom < mitteY) return false;
      const l = px(r.left - br.left), re = px(r.right - br.left);
      return re > links.rechts + 1 && l < rechts.links - 1;
    };
    const gefuellt = [...buehne.querySelectorAll('[data-qq-baum-gleis]')].some(deckt);
    const bruecke = [...buehne.querySelectorAll('[data-qq-baum-bruecke]')].some(inDerLuecke);
    luecken.push({
      nach: i - 1,
      vonPhase: links.phase, zuPhase: rechts.phase,
      grenze: links.phase !== rechts.phase,
      luecke: rechts.links - links.rechts,
      gefuellt, bruecke,
    });
  }
  // ── Und: sieht der CozyGame-Knoten aus wie eine Kategorie? ───────────────
  // 2026-08-27 (Wolf: „das cozygame logo ist zu gross und nicht umrandet
  // obwohl es teil der kategorien ist wenn aktiviert").
  // Der Knoten traegt keine eigene Kennung, ist aber der einzige runde/eckige
  // Kasten zwischen den Kacheln, der kein `data-qq-baum-punkt` hat und auf
  // derselben Hoehe sitzt.
  const kr = kacheln[0].getBoundingClientRect();
  const kMitte = kr.top + kr.height / 2;
  // ⚠️ Ueber die Kennung, nicht ueber Groesse und Lage. Der erste Anlauf hat
  // „alle quadratischen Kaesten auf Kachelhoehe" genommen und dabei Huellen,
  // Abstandhalter und den Bieten-Knoten mitgezaehlt - zehn Treffer fuer drei
  // Knoten, und kein Wort darueber, welcher welcher ist.
  const kandidaten = [...buehne.querySelectorAll('[data-qq-baum-knoten]')].map(d => {
    const r = d.getBoundingClientRect();
    const cs = getComputedStyle(d);
    return {
      art: d.getAttribute('data-qq-baum-knoten'),
      breite: px(r.width),
      rand: parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none'
        && !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.borderTopColor),
    };
  });

  return { anzahl: reihe.length, kachelBreite: px(kr.width), reihe, luecken, kandidaten };
};

const b = await buehneStarten({
  bots: 8, frisch: true, takt: () => {},
  entwurf: 'qq-vol-1',
});
const seite = b.seite;
fs.mkdirSync('.shots', { recursive: true });

// Genau Wolfs Ansicht: das Runden-Intro von Runde 2, ERSTER Schritt.
//
// ⚠️ Nicht `rundenintro2`. Die Station heisst so, zeigt aber Runde 1 und ist
// schon einen Schritt weiter: der Journey-Zoom hat dann laengst auf die
// einzelne Runde gezoomt, und man sieht fuenf grosse Kacheln statt des ganzen
// Abends. Beim ersten Anlauf kam genau deshalb „5 Kacheln, 0 Rundengrenzen"
// heraus - gemessen war eine Ansicht, in der es die Frage gar nicht gibt.
// `rundenintroR2` springt auf Phase 2 und bleibt im Ueberblick stehen.
await b.zurStation('rundenintroR2');
await sleep(2600);
await seite.screenshot({ path: '.shots/baum-trennung-vorher.png' });

const m = await seite.evaluate(messen);
if (m.fehler) { console.log('\n  ' + m.fehler); await b.schliessen?.(); process.exit(1); }

console.log(`\n══ ${m.anzahl} Kacheln, je ${m.kachelBreite} px breit ═══════════════════`);
const innen = m.luecken.filter(l => !l.grenze).map(l => l.luecke);
const aussen = m.luecken.filter(l => l.grenze).map(l => l.luecke);
const mittel = (a) => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null;

console.log('\n  Luecke der Reihe nach (| = Rundengrenze):');
console.log('   ' + m.luecken.map(l => `${l.grenze ? '|' : ' '}${String(l.luecke).padStart(3)}`).join(''));

console.log(`\n  innerhalb einer Runde : ${mittel(innen)} px  (${innen.length} Stellen)`);
console.log(`  zwischen den Runden   : ${mittel(aussen)} px  (${aussen.length} Stellen)`);
const faktor = mittel(innen) ? (mittel(aussen) / mittel(innen)) : null;
console.log(`  Faktor                : ${faktor ? faktor.toFixed(2) : '?'}`);

console.log('\n  Strich im Zwischenraum (▬ = Gleis, ┄ = Bruecke, · = nichts):');
console.log('   ' + m.luecken.map(l =>
  `${l.grenze ? '|' : ' '}  ${l.gefuellt ? '▬' : l.bruecke ? '┄' : '·'}`).join(''));

const gefuellteGrenzen = m.luecken.filter(l => l.grenze && l.gefuellt).length;
const gefuellteInnen = m.luecken.filter(l => !l.grenze && l.gefuellt).length;

// ── Der CozyGame-Knoten neben den Kategorie-Kacheln ──────────────────────────
// Der CozyGame gehoert zur Runde (Wolf 2026-08-24), er ist also eine Station wie
// die anderen und muss aussehen wie eine. Bieten und Finale gehoeren zu KEINER
// Runde, sie stehen bewusst frei - dort ist eine andere Groesse richtig.
const cgKnoten = (m.kandidaten ?? []).filter(k => k.art === 'cozygame');
const cgFremd = cgKnoten.filter(k => Math.abs(k.breite - m.kachelBreite) > 2 || !k.rand);
console.log(`\n══ Knoten zwischen den Kacheln ═════════════════════════════════`);
console.log(`  Kategorie-Kachel : ${m.kachelBreite} px, mit Rand`);
if (!m.kandidaten?.length) console.log('  (keine Knoten mit Kennung gefunden)');
for (const k of m.kandidaten ?? []) {
  console.log(`  ${String(k.art).padEnd(16)} : ${k.breite} px, ${k.rand ? 'mit' : 'OHNE'} Rand`);
}

console.log('\n══ Urteil ══════════════════════════════════════════════════════');
console.log(cgFremd.length === 0
  ? `  ✓ Die ${cgKnoten.length} CozyGame-Knoten sehen aus wie eine Kategorie-Kachel.`
  : `  ✗ ${cgFremd.length} von ${cgKnoten.length} CozyGame-Knoten weichen ab (Groesse oder Rand).`);
if (faktor != null && faktor < 2) {
  console.log(`  ✗ Faktor ${faktor.toFixed(2)}: schon die Abstaende trennen nicht.`);
} else {
  console.log(`  ✓ Abstaende: Faktor ${faktor.toFixed(2)}, das reicht mehr als aus.`);
}
if (gefuellteGrenzen) {
  console.log(`  ✗ ${gefuellteGrenzen} von ${aussen.length} Rundengrenzen tragen einen Strich.`);
  console.log('    Und weil die Luecke dort am groessten ist, ist er dort am laengsten -');
  console.log('    die Stelle, die trennen soll, hat die auffaelligste Verbindung im Bild.');
} else {
  console.log(`  ✓ Keine der ${aussen.length} Rundengrenzen traegt ein GLEIS.`);
  const mitBruecke = m.luecken.filter(l => l.grenze && l.bruecke).length;
  console.log(mitBruecke === aussen.length
    ? `  ✓ Alle ${aussen.length} tragen die schwache Bruecke - der Weg geht durch,`
      + '\n    die Trennung bleibt, weil die Bruecke im Rang darunter liegt.'
    : `  ⚠ Nur ${mitBruecke} von ${aussen.length} tragen die Bruecke.`);
  console.log(`    Innerhalb der Runden laeuft er weiter (${gefuellteInnen} von ${innen.length} Stellen),`);
  console.log('    das Gleis bindet also die Runde zusammen statt den Abend.');
}

await b.schliessen?.();
