/* handy-tinte — die warme Tinte des Handys ABLEITEN statt raten.
 *
 * 2026-08-29. Der Bericht von scripts/handy-referenz.mjs hatte genau EINEN
 * Befund, nur an zwanzig Stellen: /team schreibt in Slate (kaltes Blaugrau),
 * die Buehne in Creme auf warmem Grund. `148,163,184` (Slate-400) stand auf
 * allen sieben Stationen.
 *
 * Die Buehne fuehrt dafuer eine Leiter aus ZWEI Stufen, gemessen in
 * docs/DESIGNSPRACHE.md:
 *
 *   Tinte      #F3EFE7   98x
 *   gedaempft  #B9B3C6   30x
 *
 * Das Handy fuehrt fuenf (Slate 100/200/300/400/500 plus Reinweiss). Es hat
 * mehr Stufen, weil es mehr Rollen hat: eine Bedienflaeche unterscheidet
 * Ueberschrift, Wert, Beschriftung, Hilfstext und Abgeschaltetes, eine
 * Projektionsfolie nicht.
 *
 * ── Warum nicht einfach zusammenlegen ─────────────────────────────────────
 * Der naheliegende Weg waere, alles auf die zwei Buehnenwerte zu ziehen. Das
 * waere kein Sprachwechsel mehr, sondern ein Umbau: die Rangfolge auf dem
 * Handy haengt an diesen Stufen, und drei davon einzuebnen macht aus
 * Beschriftung, Hilfstext und Abgeschaltetem dasselbe. In todo.md steht fuer
 * /team ausdruecklich „nur Einzelheiten, nicht der Aufbau".
 *
 * ── Was stattdessen passiert ──────────────────────────────────────────────
 * Die Leiter behaelt ihre Stufen und wechselt den Ton. Jede Slate-Stufe
 * behaelt ihre HELLIGKEIT (OKLab L) und bekommt Buntheit und Farbton der
 * Buehnenleiter, linear ueber L interpoliert zwischen den beiden gemessenen
 * Ankern und darueber hinaus fortgesetzt.
 *
 * Der Gewinn daran ist nicht Geschmack, sondern Nachpruefbarkeit: gleiche
 * Helligkeit heisst gleicher Kontrast. Die Umstellung kann die Lesbarkeit
 * also gar nicht verschlechtern, und das steht unten als Zahl da, nicht als
 * Behauptung.
 *
 * NUTZUNG: node scripts/handy-tinte.mjs
 */

/* ── sRGB <-> OKLab. Formeln aus Bjoern Ottossons Herleitung. ─────────────── */
const zuLinear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const zuSrgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

function hexZuRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgbZuHex = ([r, g, b]) =>
  '#' + [r, g, b].map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase();

function oklab(hex) {
  const [r, g, b] = hexZuRgb(hex).map(v => zuLinear(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  };
}

function zuHex({ L, a, b }) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return rgbZuHex([
    zuSrgb(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) * 255,
    zuSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) * 255,
    zuSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s) * 255,
  ]);
}

/* ── Kontrast (WCAG 2.1) ──────────────────────────────────────────────────── */
const leuchte = (hex) => {
  const [r, g, b] = hexZuRgb(hex).map(v => zuLinear(v / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const kontrast = (v, h) => {
  const a = leuchte(v), b = leuchte(h);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

/* ── Die beiden gemessenen Anker der Buehne ───────────────────────────────── */
const TINTE = '#F3EFE7';      // docs/DESIGNSPRACHE.md, 98x ueber 6 Stationen
const GEDAEMPFT = '#B9B3C6';  // docs/DESIGNSPRACHE.md, 30x ueber 4 Stationen

/* Der Grund, auf dem das Handy schreibt. GEMESSEN, nicht aus dem Stylesheet
 * gelesen: `getComputedStyle(document.body).backgroundColor` auf /team. Die
 * Karten liegen als halbdurchsichtige Flaechen darauf, sind also nie dunkler
 * als er - wer gegen den Grund prueft, prueft den schlechtesten Fall. */
const GRUND = '#0F0817';

/* Die Slate-Stufen, die /team heute benutzt, mit ihrer Rolle aus
 * shared/qqColors.ts und der gemessenen Haeufigkeit im Handy-Bestand. */
const LEITER = [
  { name: 'slate100', hex: '#f1f5f9', rolle: 'Ueberschrift / heller Wert' },
  { name: 'slate200', hex: '#e2e8f0', rolle: 'Fliesstext auf dunklem Grund' },
  { name: 'slate300', hex: '#cbd5e1', rolle: 'Sekundaertext' },
  { name: 'slate400', hex: '#94a3b8', rolle: 'Beschriftung, Raender' },
  { name: 'slate500', hex: '#64748b', rolle: 'leise Raender, Abgeschaltetes' },
  { name: 'slate600', hex: '#475569', rolle: 'dunkel-leise' },
  { name: 'slate700', hex: '#334155', rolle: 'Kartenrand' },
];

/* Wieviel Kontrastverlust noch als „gleich" durchgeht. Die Umstellung haelt
 * die Helligkeit jeder Stufe fest, also kann das Verhaeltnis nur ueber die
 * Gewichtung der Kanaele wandern (Gruen zaehlt in der WCAG-Formel schwerer als
 * Blau). Gemessen bleiben die Abweichungen unter 0.15 bei Werten zwischen 1.8
 * und 18 - das ist Rechenrest, keine sichtbare Aenderung. Der Wert steht hier
 * als Zahl, damit ein echter Einbruch trotzdem auffaellt. */
const TOLERANZ = 0.2;

const a1 = oklab(TINTE), a2 = oklab(GEDAEMPFT);
/**
 * Buntheit und Farbton der Buehnenleiter bei einer gegebenen Helligkeit.
 * Linear ueber L zwischen den beiden Ankern - und AUSSERHALB geklemmt.
 *
 * ⚠️ Die erste Fassung hat fortgesetzt statt geklemmt, und das Werkzeug hat
 * seinen eigenen Fehler gemeldet: Slate-600 kam als #564885 heraus, Slate-700
 * als #433176. Beides saftiges Violett. Der Grund ist arithmetisch, nicht
 * geschmacklich - zwei Anker sind eine Gerade, und eine Gerade durch zwei
 * Punkte gewinnt unterhalb davon immer weiter Buntheit dazu. Die Buehne hat
 * dort keinen Messwert, weil sie unter „gedaempft" ueberhaupt keine Tinte
 * fuehrt; die dunklen Stufen des Handys sind Raender und Abgeschaltetes, also
 * eine Rolle, die es auf einer Folie nicht gibt.
 *
 * Geklemmt heisst: unterhalb des gedaempften Ankers behalten die Stufen dessen
 * Buntheit und werden nur dunkler. Sie werden warm, statt bunt zu werden.
 */
const tonBei = (L) => {
  const roh = (L - a1.L) / (a2.L - a1.L);
  const t = Math.min(1, Math.max(0, roh));
  return { a: a1.a + t * (a2.a - a1.a), b: a1.b + t * (a2.b - a1.b) };
};

console.log(`Anker: Tinte ${TINTE} · gedaempft ${GEDAEMPFT} · Grund ${GRUND}\n`);
console.log('Stufe      alt       neu       ΔL      Kontrast alt → neu   Rolle');
console.log('─'.repeat(92));
const raus = [];
for (const st of LEITER) {
  const o = oklab(st.hex);
  const neu = zuHex({ L: o.L, ...tonBei(o.L) });
  const n = oklab(neu);
  const kAlt = kontrast(st.hex, GRUND), kNeu = kontrast(neu, GRUND);
  raus.push({ ...st, neu, kAlt, kNeu });
  console.log(
    `${st.name.padEnd(10)} ${st.hex.toUpperCase()}   ${neu}   ` +
    `${(n.L - o.L >= 0 ? '+' : '') + (n.L - o.L).toFixed(4)}  ` +
    `${kAlt.toFixed(2).padStart(5)} → ${kNeu.toFixed(2).padStart(5)}  ` +
    `${kNeu >= kAlt - TOLERANZ ? '✓' : '⚠'}   ${st.rolle}`);
}

/* Reinweiss steht 17x im Handy-Bestand und ist der einzige Wert, der KEINE
 * eigene Stufe ist, sondern eine ueber der Tinte. Die Entscheidung dazu ist
 * vom 2026-08-22 und steht in main.css: „Reinweiss dreht die Lampe auf
 * Anschlag … Gilt fuer die ganze App, nicht nur die Buehne: das Handy zeigt
 * dieselben Texte, und zwei Weisstoene nebeneinander sind schlechter als
 * einer." Es faellt also auf die Tinte, ohne Ableitung. */
console.log('─'.repeat(92));
console.log(`#FFFFFF    #FFFFFF   ${TINTE}   ${(oklab(TINTE).L - oklab('#ffffff').L).toFixed(4)}  ` +
  `${kontrast('#ffffff', GRUND).toFixed(2)} → ${kontrast(TINTE, GRUND).toFixed(2)}  ` +
  `—   entschieden 2026-08-22 (main.css), keine Ableitung`);

const schlechter = raus.filter(r => r.kNeu < r.kAlt - TOLERANZ);
console.log(`\n${schlechter.length
  ? '⚠ ' + schlechter.length + ' Stufe(n) verlieren sichtbar Kontrast (mehr als ' + TOLERANZ + ')'
  : '✓ keine Stufe verliert sichtbar Kontrast (Toleranz ' + TOLERANZ + ')'}`);
console.log('\nAls Tabelle fuer shared/qqColors.ts:');
for (const r of raus) console.log(`  ${r.name} ${r.hex.toUpperCase()} -> ${r.neu}`);
