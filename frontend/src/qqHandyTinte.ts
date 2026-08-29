/**
 * qqHandyTinte — die Tintenleiter des Handys, abgeleitet aus dem AKTIVEN Design.
 *
 * 2026-08-29, Wolf: „natuerlich soll das handydesign auch je nachdem welche
 * design in /moderation gewaehlt wird."
 *
 * ── Der Befund ────────────────────────────────────────────────────────────
 * `/team` schrieb in Slate, also kaltem Blaugrau, waehrend die Buehne seit dem
 * 22.08. in Creme auf warmem Grund schreibt. `148,163,184` (Slate-400) stand
 * auf ALLEN sieben gemessenen Stationen (scripts/handy-referenz.mjs).
 *
 * ── Warum eine Leiter und keine zwei Werte ───────────────────────────────
 * Ein Design liefert zwei Tinten: `surface.text` und `surface.textMuted`. Das
 * reicht der Buehne, sie zeigt Ueberschrift und Beiwerk. Das Handy ist eine
 * Bedienflaeche und unterscheidet fuenf Rollen - Ueberschrift, Fliesstext,
 * Sekundaertext, Beschriftung, Abgeschaltetes - und hatte dafuer die
 * Slate-Leiter. Die Stufen sind richtig, nur die Farbe war es nicht.
 *
 * ── Warum abgeleitet und nicht eingetragen ───────────────────────────────
 * Der erste Anlauf hat die Buehnenwerte fest eingetragen (#F3EFE7 / #B9B3C6).
 * Das war derselbe Fehler mit neuer Farbe, und Wolfs Satz oben hat ihn
 * aufgedeckt: `QQ_THEMES` enthaelt unter anderem ein HELLES Design
 * (`pageBg: '#F3F2EC', text: '#0B0B0B'`). Eine fest eingetragene Creme-Tinte
 * waere dort weiss auf weiss. Wer eine Farbe eintraegt, entscheidet fuer alle
 * Designs mit - auch fuer die, die er nicht vor Augen hat.
 *
 * Deshalb: die Leiter entsteht bei jedem Designwechsel neu aus den zwei
 * Tinten des Designs plus seinem Grund. Sie funktioniert auf Dunkel wie auf
 * Hell, weil sie nirgends eine Richtung annimmt - sie geht immer von der
 * Tinte weg, in Richtung Grund.
 *
 * ── Woher die Anteile kommen ─────────────────────────────────────────────
 * Nicht geraten, sondern aus dem Bestand gerechnet (`scripts/handy-tinte.mjs`
 * und die Messung dahinter). Jede alte Slate-Stufe wurde in OKLab auf die
 * Strecke Tinte → gedaempft → Grund projiziert; heraus kam, wie weit sie auf
 * dieser Strecke liegt. Genau diese Anteile stehen unten. Damit behaelt das
 * Handy die Rangfolge, die es hatte, und wechselt nur den Ton.
 *
 * Zwei Stufen sind dabei auf einen Anker eingerastet:
 * * Slate-100 lag mit t = -0,09 knapp OBERHALB der Tinte, also praktisch auf
 *   ihr. Zusammen mit Reinweiss (17x im Bestand) faellt es auf `text`. Das
 *   deckt sich mit der Entscheidung vom 22.08. in main.css: „zwei Weisstoene
 *   nebeneinander sind schlechter als einer".
 * * Slate-400 lag mit u = 0,11 knapp unterhalb von `textMuted` und rastet
 *   darauf ein. Es ist die haeufigste Stufe des Handys; sie und die gedaempfte
 *   Tinte der Buehne sollten EIN Wort sein, nicht zwei fast gleiche.
 *
 * ⚠️ Diese Datei gehoert dem Handy. `main.css` und `qqTheme.ts` gehoeren der
 * Buehnen-Sitzung (docs/UEBERGABE_TEAM.md, Abschnitt 0) - sie werden hier
 * gelesen, nie geschrieben. Fehlt dem Handy ein Wert dort, wird er gemeldet,
 * nicht eingetragen.
 */
import type { CSSProperties } from 'react';
import { getActiveTheme, type ResolvedTheme } from './qqTheme';

/* ── sRGB <-> OKLab, Formeln aus Bjoern Ottossons Herleitung ──────────────── */
const zuLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const zuSrgb = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

type Lab = { L: number; a: number; b: number };

/**
 * Liest `#rgb`, `#rrggbb` und `rgb()/rgba()`. Alles andere ergibt null.
 * Die Deckkraft kommt als vierter Wert mit - sie wird gebraucht, siehe
 * `aufGrund` weiter unten.
 */
function zuRgb(farbe: string): [number, number, number, number] | null {
  const s = farbe.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split('').map(c => c + c).join('') : hex[1];
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const fn = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?/i.exec(s);
  if (fn) {
    const roh = fn[4];
    const a = roh === undefined ? 1 : (roh.endsWith('%') ? parseFloat(roh) / 100 : parseFloat(roh));
    return [+fn[1], +fn[2], +fn[3], Number.isFinite(a) ? a : 1];
  }
  return null;
}

/**
 * Eine halbdurchsichtige Farbe auf den Grund rechnen.
 *
 * ⚠️ Aus Schaden gebaut, gefunden am 2026-08-29 beim Durchmessen ALLER
 * Designs: `neoBrutal` fuehrt `textMuted: 'rgba(255,255,255,0.78)'`. Die erste
 * Fassung hat die Deckkraft weggeworfen und damit `#ffffff` als gedaempfte
 * Tinte gelesen - also denselben Wert wie die normale Tinte. Ergebnis: vier
 * der sieben Stufen waren identisch weiss, die Rangfolge des Handys war in
 * diesem Design weg.
 *
 * Ein halbdurchsichtiges Weiss auf dunklem Grund IST ein helles Grau; erst
 * wenn man es ausrechnet, steht es an der richtigen Stelle der Leiter.
 */
function aufGrund(
  farbe: [number, number, number, number],
  grund: [number, number, number, number],
): [number, number, number] {
  const a = farbe[3];
  if (a >= 0.999) return [farbe[0], farbe[1], farbe[2]];
  return [0, 1, 2].map(i => farbe[i] * a + grund[i] * (1 - a)) as [number, number, number];
}

function nachLab([r, g, b]: [number, number, number]): Lab {
  const [lr, lg, lb] = [r, g, b].map(v => zuLinear(v / 255));
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  };
}

function nachHex({ L, a, b }: Lab): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const kanal = (v: number) => {
    const n = Math.round(Math.min(255, Math.max(0, zuSrgb(v) * 255)));
    return n.toString(16).padStart(2, '0');
  };
  return '#' + kanal(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)
    + kanal(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)
    + kanal(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
}

const mischen = (x: Lab, y: Lab, t: number): Lab => ({
  L: x.L + t * (y.L - x.L), a: x.a + t * (y.a - x.a), b: x.b + t * (y.b - x.b),
});

/**
 * Der Grund eines Designs als EINE Farbe.
 *
 * `surface.pageBg` ist bei mehreren Designs ein Verlauf
 * (`radial-gradient(circle at 50% -5%, #1A1526 0%, …)`). Fuer die Leiter wird
 * nur eine Richtung gebraucht - „wohin wird es leiser" - dafuer genuegt die
 * erste Farbe des Verlaufs. Findet sich gar keine, faellt es auf einen Ton
 * zurueck, der die Richtung aus der Tinte selbst nimmt: ist die Tinte hell,
 * liegt der Grund dunkel, und umgekehrt.
 */
function grundRgb(theme: ResolvedTheme, hellTinte: boolean): [number, number, number, number] {
  const roh = theme.surface.pageBg ?? '';
  const treffer = roh.match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|rgba?\([^)]+\)/i);
  const rgb = treffer ? zuRgb(treffer[0]) : zuRgb(roh);
  if (rgb) return [rgb[0], rgb[1], rgb[2], 1];
  // Kein lesbarer Grund: Richtung aus der Tinte nehmen. Helle Tinte steht auf
  // dunklem Grund, dunkle auf hellem.
  return hellTinte ? [18, 16, 24, 1] : [244, 243, 238, 1];
}

export type HandyTinte = {
  ink: string; inkBody: string; inkSoft: string; inkMuted: string;
  inkQuiet: string; inkDim: string; inkEdge: string;
  /** „r,g,b" der Tinte - fuer `rgba(var(--qq-ink-rgb), 0.06)`-Flaechen. */
  inkRgb: string;
};

/**
 * Anteile auf der Strecke Tinte → gedaempft (`t`) bzw. gedaempft → Grund (`u`).
 * Gerechnet, nicht gewaehlt: siehe Kopf dieser Datei.
 */
const T_BODY = 0.138;   // war Slate-200
const T_SOFT = 0.479;   // war Slate-300
const U_QUIET = 0.358;  // war Slate-500
const U_DIM = 0.532;    // war Slate-600
const U_EDGE = 0.650;   // war Slate-700

export function handyTinte(theme: ResolvedTheme = getActiveTheme()): HandyTinte {
  const tinteRoh = zuRgb(theme.surface.text) ?? [243, 239, 231, 1];
  // Grob, aber ausreichend: entscheidet nur, in welche Richtung der Ersatz-
  // Grund liegt, wenn `pageBg` keine lesbare Farbe hergibt.
  const hellTinte = (tinteRoh[0] + tinteRoh[1] + tinteRoh[2]) / 3 > 127;
  const grundRoh = grundRgb(theme, hellTinte);

  const tinteRgb = aufGrund(tinteRoh, grundRoh);
  const tinte = nachLab(tinteRgb);
  const gedaempft = nachLab(aufGrund(zuRgb(theme.surface.textMuted) ?? [185, 179, 198, 1], grundRoh));
  const grund = nachLab([grundRoh[0], grundRoh[1], grundRoh[2]]);

  return {
    ink: nachHex(tinte),
    inkBody: nachHex(mischen(tinte, gedaempft, T_BODY)),
    inkSoft: nachHex(mischen(tinte, gedaempft, T_SOFT)),
    inkMuted: nachHex(gedaempft),
    inkQuiet: nachHex(mischen(gedaempft, grund, U_QUIET)),
    inkDim: nachHex(mischen(gedaempft, grund, U_DIM)),
    inkEdge: nachHex(mischen(gedaempft, grund, U_EDGE)),
    inkRgb: tinteRgb.map(Math.round).join(','),
  };
}

/**
 * Die Leiter als CSS-Variablen, zum Setzen auf den Wurzel-Knoten von /team.
 *
 * ⚠️ Bewusst NICHT auf `documentElement`: dort schreibt `applyThemeVars` die
 * gemeinsamen Token, und diese Datei gehoert dem Handy. Eine Variable, die
 * auf dem Wurzelelement der Seite steht, faerbt auch Steuerpult und Buehne
 * mit - genau die Vermischung, die die Uebergabe vermeiden will.
 */
export function handyTinteVars(theme?: ResolvedTheme): CSSProperties {
  const t = handyTinte(theme);
  return {
    '--qq-ink': t.ink,
    '--qq-ink-body': t.inkBody,
    '--qq-ink-soft': t.inkSoft,
    '--qq-ink-muted': t.inkMuted,
    '--qq-ink-quiet': t.inkQuiet,
    '--qq-ink-dim': t.inkDim,
    '--qq-ink-edge': t.inkEdge,
    '--qq-ink-rgb': t.inkRgb,
  } as CSSProperties;
}
