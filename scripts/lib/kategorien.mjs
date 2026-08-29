/* kategorien — die Kategorienamen aus shared/quarterQuizTypes.ts LESEN.
 *
 * 2026-08-29. Abgetippte Listen veralten still: „10 von 10" heisst auf
 * Englisch seit dem 28.08. „Ten Chips", und eine Kopie davon in einem Werkzeug
 * haette den Wechsel nicht mitbekommen - das Werkzeug haette dann gemeldet,
 * die Kategorie sei „nicht lesbar", statt sie zu vergleichen.
 *
 * Gelesen wird die Tabelle QQ_CATEGORY_LABELS mit einem Regexp und nicht mit
 * einem TS-Parser: die Tabelle ist ein flaches Objektliteral, und ein Parser
 * waere eine Abhaengigkeit fuer eine Zeile.
 */
import { readFileSync } from 'node:fs';

const quelle = readFileSync(new URL('../../shared/quarterQuizTypes.ts', import.meta.url), 'utf8');
const block = /QQ_CATEGORY_LABELS[^=]*=\s*\{([\s\S]*?)\n\};/.exec(quelle);
if (!block) throw new Error('QQ_CATEGORY_LABELS in shared/quarterQuizTypes.ts nicht gefunden.');

/** Alle Kategorienamen, deutsch und englisch, in der Reihenfolge der Tabelle. */
export const QQ_CATEGORY_LABELS = [...block[1].matchAll(/de:\s*'([^']+)',\s*en:\s*'([^']+)'/g)]
  .flatMap(m => [m[1], m[2]]);

if (QQ_CATEGORY_LABELS.length < 6) {
  throw new Error(`Nur ${QQ_CATEGORY_LABELS.length} Kategorienamen gelesen - die Tabelle hat sich geaendert.`);
}

/* ── Fraktionen ──────────────────────────────────────────────────────────────
 * Aus demselben Grund gelesen und nicht abgetippt. Die Namen sind der Kern der
 * Teamnamen-Regel in handy-gleichlauf.mjs: dieselbe Fraktion heisst je nach
 * Sprache anders, und genau daran erkennt man, ob zwei Seiten dieselbe Sprache
 * sprechen - `Bauchgefühl` auf der Wand und `Gut Feeling` in der Hand sind
 * dieselbe Fraktion mit zwei Namen. */
const fblock = /QQ_MEGA_FACTIONS\s*=\s*\[([\s\S]*?)\n\];/.exec(quelle);
if (!fblock) throw new Error('QQ_MEGA_FACTIONS in shared/quarterQuizTypes.ts nicht gefunden.');

/** [{ de, en }] je Fraktion, in der Reihenfolge der Tabelle. */
export const QQ_FRAKTIONEN = [...fblock[1].matchAll(/nameDe:\s*'([^']+)',\s*nameEn:\s*'([^']+)'/g)]
  .map(m => ({ de: m[1], en: m[2] }));

if (QQ_FRAKTIONEN.length !== 8) {
  throw new Error(`${QQ_FRAKTIONEN.length} Fraktionen gelesen, erwartet 8 - die Tabelle hat sich geaendert.`);
}

/** Alle Fraktionsnamen in beiden Sprachen, flach. */
export const QQ_FRAKTION_NAMEN = QQ_FRAKTIONEN.flatMap(f => [f.de, f.en]);
