/* pausenfolien-pruefen — traegt jede wechselnde Folie ein eigenes Bild?
 *
 * 2026-08-27, Wolf zum „Schnellste Minute"-Bild: „nicht alle wechselnden slides
 * wirken gleich (gut) ... bitte das design einheitlicher und auf fehler pruefen
 * (alte emojis zb oder fehlende)".
 *
 * ── Warum am QUELLTEXT und nicht an der laufenden Buehne ───────────────────
 * Mein erster Anlauf hat die Buehne abgetastet und dabei genau EINE Folie
 * gesehen. Zwei Gruende, beide grundsaetzlich:
 *
 *   1. Die meisten Folien haengen an Verlauf (Bestenliste, Rekorde, Rivalen).
 *      Ein frischer Raum hat den nicht, also kommen sie gar nicht vor. Ein
 *      Raum MIT Verlauf laesst sich hier nicht herstellen.
 *   2. Jede Folie steht acht Sekunden. Zwanzig Folien sind knapp drei Minuten
 *      Abtasten fuer eine Frage, die der Quelltext vollstaendig beantwortet.
 *
 * Die Frage „traegt die Ueberschrift ein eigenes Bild" ist statisch: jede Folie
 * ruft `statTitle(zeichen, ...)` auf, und ob ein Zeichen ein Bild hat, steht in
 * der Zuordnungstabelle von `QQIcon.tsx`. Was dort fehlt, bleibt ein rohes
 * Systemzeichen - und das wird auf jedem Rechner anders gezeichnet.
 *
 * ⚠️ Diese Pruefung ersetzt das Hinsehen nicht. Sie sagt, welche Folie ein
 * fremdes Zeichen traegt, nicht ob eine Folie schoen ist.
 *
 * NUTZUNG:  node scripts/pausenfolien-pruefen.mjs
 */
import fs from 'node:fs';

const ANSICHT = 'frontend/src/components/CozyQuizPausedView.tsx';
const SATZ = 'frontend/src/components/QQIcon.tsx';

const src = fs.readFileSync(ANSICHT, 'utf8');
const icons = fs.readFileSync(SATZ, 'utf8');

/** Welche Zeichen haben ein Bild? (Zeile: `'⚡': 'fx-lightning',`) */
const bekannt = new Set();
for (const m of icons.matchAll(/^\s*'([^']*?)':\s*'(fx-[a-z0-9-]+)',/gm)) bekannt.add(m[1]);

/** Alle Aufrufe: entweder ein Zeichen in Anfuehrungszeichen oder eine
 *  Komponente. Danach der deutsche und der englische Titel. */
const rufe = [...src.matchAll(
  /statTitle\(\s*(?:'([^']*)'|<([A-Za-z]+))[^)]*?'([^']+)'\s*,\s*'([^']+)'/g,
)];

console.log(`\n══ ${rufe.length} wechselnde Folien ═══════════════════════════════════`);
let roh = 0;
for (const r of rufe) {
  const [, zeichen, komponente, de] = r;
  if (komponente) { console.log(`  ✓ <${komponente}>`.padEnd(26) + de); continue; }
  const ok = bekannt.has(zeichen);
  if (!ok) roh++;
  console.log(`  ${ok ? '✓' : '✗'} ${(zeichen + '  ').padEnd(22)}${de}` +
    (ok ? '' : '   <- kein Bild im Satz, bleibt ein rohes Systemzeichen'));
}

// Und dieselbe Frage fuer die Ankommen-Karten, die ueber `QQEmojiIcon` laufen.
const direkt = [...src.matchAll(/<QQEmojiIcon emoji="([^"]+)"/g)].map(m => m[1]);
const rohDirekt = direkt.filter(z => !bekannt.has(z));

console.log('\n══ Urteil ══════════════════════════════════════════════════════');
console.log(roh === 0
  ? '  ✓ Jede Folien-Ueberschrift traegt ein eigenes Bild.'
  : `  ✗ ${roh} von ${rufe.length} Ueberschriften bleiben ein rohes Zeichen.`);
console.log(rohDirekt.length === 0
  ? `  ✓ Auch die ${direkt.length} direkten Zeichen haben alle ein Bild.`
  : `  ✗ ${rohDirekt.length} direkte Zeichen ohne Bild: ${rohDirekt.join(' ')}`);

process.exit(roh === 0 && rohDirekt.length === 0 ? 0 : 1);
