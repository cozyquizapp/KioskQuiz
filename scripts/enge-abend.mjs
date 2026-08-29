/**
 * enge-abend.mjs — die drei Regeln aus lib/enge.mjs ueber den ganzen Abend.
 *
 * 2026-08-29. Das ist die kleine Fassung des Pruefwerkzeugs, um das Wolf
 * gebeten hat. Sie kostet fast nichts, weil sie auf denselben Stationen laeuft,
 * die der Kontaktbogen ohnehin anfaehrt - nur dass jetzt jemand HINSIEHT.
 *
 * Der Anlass: der MUCHO-Fehler stand seit Wochen auf jeder Folie mit langen
 * Antworten, wurde fuenfmal erfolglos gesucht, und der Kontaktbogen ist ueber
 * den ganzen Abend gelaufen, ohne ihn zu melden. Nicht weil er schwer zu sehen
 * war, sondern weil niemand die Frage gestellt hat.
 *
 * ⚠️ Der Inhalt entscheidet mit. Mit den kurzen Antworten aus den Entwuerfen
 * ist alles gruen, auch wenn ein Fehler da ist - genau daran sind die fuenf
 * Anlaeufe gescheitert. Deshalb laeuft dieses Werkzeug per Vorgabe mit LANGEN
 * Optionen (QQ_KURZ=1 schaltet sie ab). Die naechste Ausbaustufe waere, die
 * laengsten Texte aus der Fragenbibliothek zu holen statt sie hier zu tippen.
 *
 * NUTZUNG: node scripts/enge-abend.mjs [station ...]
 *          QQ_GROSS=1  CrowdQuiz statt CozyQuiz
 *          QQ_KURZ=1   Optionen des Entwurfs statt der langen
 */
import { buehneStarten, sleep } from './lib/buehne.mjs';
import { engePruefen, engeZeile } from './lib/enge.mjs';

const GROSS = process.env.QQ_GROSS === '1';
// ⚠️ Dieselbe Liste wie in crowd-abgleich: Stationen, die es in CrowdQuiz
// nicht gibt oder die auf ihrer Vorgaengerin aufbauen, fliegen dort raus.
const NUR_COZY = ['zwischenstand', 'finalwette', 'finalaufloesung', 'kartoffel', 'turmbau', 'brett', 'siegerehrung'];
const ABEND = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['lobby', 'regeln', 'ablauf', 'teams', 'rundenintro', 'frage', 'aufloesung', 'pause', 'spielende', 'danke']
    .filter(s => !(GROSS && NUR_COZY.includes(s)));

/** Vier lange Antworten, an denen der MUCHO-Fehler haengt (Wolfs Bild). */
const LANGE_OPTIONEN = [
  'Krimi & Thriller', 'Fantasy & Science-Fiction',
  'Romance / Liebesroman', 'Historischer Roman',
];

console.log(`\n${'─'.repeat(70)}`);
console.log(`${GROSS ? 'CrowdQuiz' : 'CozyQuiz'}: liegt etwas ineinander?  (${process.env.QQ_KURZ === '1' ? 'kurze' : 'lange'} Antworten)`);
console.log(`${'─'.repeat(70)}`);

let stellen = 0, ungeprueft = 0;
for (const st of ABEND) {
  const b = await buehneStarten({
    bots: GROSS ? 24 : 8, frisch: true, takt: () => {}, entwurf: 'qq-vol-1',
    // ⚠️ Die langen Optionen wirken nur auf MUCHO-Fragen - ohne diese Zeile
    // zeigt die Station „frage" irgendeine Kategorie, und der Fall kommt gar
    // nicht vor. Der erste Anlauf meldete deshalb gruen, OBWOHL der Fehler im
    // Code stand (zur Probe zurueckgebaut). Ein Pruefer, der nie rot wird,
    // ist schlimmer als keiner.
    kategorie: process.env.QQ_KAT ?? 'MUCHO',
    grossformat: GROSS,
    optionen: process.env.QQ_KURZ === '1' ? null : LANGE_OPTIONEN,
  });
  try {
    await b.zurStation(st);
    await sleep((b.stationen[st]?.ruhe ?? 2500) + 700);
    const r = await engePruefen(b.seite);
    stellen += r.verdeckt.length + r.ausserhalb.length + r.abgeschnitten.length;
    console.log(engeZeile(st, r));
  } catch (e) {
    ungeprueft++;
    console.log(`  ${st.padEnd(16)} UNGEPRUEFT: ${String(e).slice(0, 60)}`);
  }
  await b.schliessen?.();
}

console.log(`\n  ${stellen} Stelle(n) auf ${ABEND.length - ungeprueft} von ${ABEND.length} Stationen.`);
// ⚠️ „0 Stellen" heisst NICHT „alles gut". Es heisst: keine der drei Regeln
// ist verletzt. Geschmack, Lesbarkeit auf zehn Metern und die Frage, ob die
// Folie das Richtige erzaehlt, stehen hier nicht drin.
process.exit(stellen > 0 ? 1 : 0);
