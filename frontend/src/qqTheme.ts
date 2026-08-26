/**
 * QQ Theme-Runtime — umschaltbare „Grunddesigns" (Skins) für die gesamte App.
 *
 * 2026-06-23 (Wolf): nicht Event-Kostüme (Weihnachten/Halloween), sondern
 * subtile Grunddesigns je Location/Setting (Café · Bar · Corporate · Glass).
 * Gleiche App, anderes Gewand — per Klick.
 *
 * MECHANIK (bewusst risikoarm, Proof-tauglich):
 *   - Ein modulweites `activeThemeId` (Default 'cozy' = der heutige Look).
 *   - `getBrandColors()` (Beamer-Chokepoint) delegiert hierher, WENN ein
 *     anderes Theme als 'cozy' aktiv ist. Bei 'cozy' bleibt das alte Verhalten
 *     inkl. Eurovision-Zweig → **zero-visual-change** in der Live-App.
 *   - Komponenten abonnieren via `useActiveThemeId()` (useSyncExternalStore),
 *     damit ein Theme-Wechsel ein Re-Render auslöst.
 *
 * ROLLOUT (später, graduell wie bei qqColors): Flächen-Tokens (cardBg/heroBorder)
 * an den Hauptscreens auf `resolveTheme().surface` umstellen. Erstmal liefert die
 * Foundation die Palette über getBrandColors — das deckt schon die meisten
 * Akzent-Flächen ab.
 */
import { useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import { QQ_COLORS } from '../../shared/qqColors';
import { isQuirkTileSet } from './quirks2Avatars';

/** Exakt das Shape, das getBrandColors zurückgibt. */
export type ThemeBrand = {
  accentHex: string;
  accentRgb: string;
  accentSoft: string;
  accentWarm: string;
  magenta: string;
  gradientPill: string;
};

/** Flächen-/Oberflächen-Stil (für den graduellen Rollout). */
export type ThemeSurface = {
  pageBg: string;     // --qq-bg  (Seiten-/Bühnen-Hintergrund)
  text: string;       // --qq-text  (Primärtext auf BG)
  textMuted: string;  // --qq-text-muted
  cardText: string;   // --qq-card-text  (Text AUF Karten; getrennt von text!)
  cardBg: string;     // --qq-card-bg
  cardBorder: string; // --qq-card-border  (volles Shorthand)
  cardRadius: string; // --qq-card-radius
  pillRadius: string; // --qq-pill-radius (Pills/Badges/Chips: Cozy/SoftPop rund, Mono eckig)
  cardShadow: string; // --qq-card-shadow
  hairline: string;   // --qq-hairline  (dezente Linien/Divider)
  surface: string;    // --qq-surface  (Sub-Karten/Chips)
  overlay: string;    // --qq-overlay  (dunkle Inset-Overlays)
  font: string;       // --qq-font
  title: string;      // --qq-title  (Hero-/Wortmark-Farbe AUF dem BG, kontrast+brand)
};

export type ResolvedTheme = {
  id: string;
  label: string;
  brand: ThemeBrand;
  surface: ThemeSurface;
};

// ── Skin-Bibliothek ─────────────────────────────────────────────────────────
// 'cozy' spiegelt 1:1 die heutigen Default-Werte (getBrandColors non-eurovision
// + die COZY_HERO_*/CARD-Konstanten) → Adoption ist visual-neutral.
const COZY: ResolvedTheme = {
  id: 'cozy',
  label: 'Cozy',
  brand: {
    accentHex:  QQ_COLORS.brandPink,
    accentRgb:  '236,72,153',
    accentSoft: QQ_COLORS.brandPinkSoft,
    accentWarm: '#F9A8D4',
    magenta:    '#A21247',
    gradientPill: 'linear-gradient(135deg, #F472B6 0%, #EC4899 50%, #A21247 100%)',
  },
  surface: {
    pageBg: 'radial-gradient(circle at 50% 0%, #1E2A5A 0%, #0F1530 60%, #0A0E22 100%)',
    text: '#ffffff',
    textMuted: '#94a3b8',
    cardText: '#ffffff',
    cardBg: 'linear-gradient(180deg, #1F1A2E, #14101F)',
    cardBorder: '1px solid rgba(255,255,255,0.10)',
    cardRadius: '20px',
    pillRadius: '999px',
    cardShadow: '0 16px 50px rgba(0,0,0,0.45)',
    hairline: 'rgba(255,255,255,0.10)', surface: 'rgba(255,255,255,0.04)', overlay: 'rgba(0,0,0,0.28)',
    font: "'Nunito', 'Geist', system-ui, sans-serif",
    title: QQ_COLORS.brandPink, // (cozy nutzt eigenen Branch — Fallback)
  },
};

// ── Studio Mono — editorial, hell, scharf (Hard-Shadow + Lime-Akzent) ──────
const STUDIO_MONO: ResolvedTheme = {
  id: 'studioMono', label: 'Studio Mono',
  brand: {
    accentHex: '#111111', accentRgb: '17,17,17', accentSoft: '#E9E7DD',
    accentWarm: '#C9F227', magenta: '#111111',
    gradientPill: 'linear-gradient(135deg, #111 0%, #111 100%)',
  },
  surface: {
    pageBg: '#F3F2EC', text: '#0B0B0B', textMuted: '#6B6B66', cardText: '#0B0B0B',
    cardBg: '#FFFFFF', cardBorder: '2px solid #111111', cardRadius: '4px', pillRadius: '3px',
    cardShadow: '6px 6px 0 #111111', hairline: 'rgba(0,0,0,0.12)', surface: 'rgba(0,0,0,0.035)', overlay: 'rgba(0,0,0,0.05)',
    font: "'Bricolage Grotesque', 'Inter', sans-serif",
    title: '#0B0B0B', // editorial: schwarze Hero-Titel
  },
};

// ── Soft Pop — warm-hell, runde bunte Pillen, weiche Schatten ──────────────
const SOFT_POP: ResolvedTheme = {
  id: 'softPop', label: 'Soft Pop',
  brand: {
    accentHex: '#F472A0', accentRgb: '244,114,160', accentSoft: '#FFE3EF',
    accentWarm: '#FBBF24', magenta: '#3B2E7E',
    gradientPill: 'linear-gradient(135deg, #FBBF24 0%, #F472A0 50%, #60A5FA 100%)',
  },
  surface: {
    pageBg: 'radial-gradient(120% 90% at 50% -10%, #FFFBF4 0%, #FFF1E6 55%, #FFE6D3 100%)',
    text: '#2D2A55', textMuted: '#9B8E84', cardText: '#2D2A55',
    cardBg: '#FFFFFF', cardBorder: '1px solid rgba(45,42,85,0.10)', cardRadius: '26px', pillRadius: '999px',
    cardShadow: '0 8px 0 rgba(59,46,126,0.14)', hairline: 'rgba(45,42,85,0.10)', surface: 'rgba(45,42,85,0.04)', overlay: 'rgba(45,42,85,0.05)',
    font: "'Nunito', system-ui, sans-serif",
    title: '#2D2A55', // dunkles Indigo (= Primärtext), gut auf warmem BG
  },
};

// ── Neo-Brutalism — lila BG, weiße Karten, dicke schwarze Ränder + Hard-Shadow
const NEO_BRUTAL: ResolvedTheme = {
  id: 'neoBrutal', label: 'Neo-Brutalism',
  brand: {
    accentHex: '#2D4BFF', accentRgb: '45,75,255', accentSoft: '#DCE3FF',
    accentWarm: '#FDE047', magenta: '#FB7185',
    gradientPill: 'linear-gradient(135deg, #2D4BFF 0%, #6D28D9 100%)',
  },
  surface: {
    pageBg: 'linear-gradient(155deg, #9B6DFF 0%, #7C3AED 55%, #6D28D9 100%)',
    text: '#FFFFFF', textMuted: 'rgba(255,255,255,0.78)', cardText: '#16121F',
    cardBg: '#FFFFFF', cardBorder: '3px solid #16121F', cardRadius: '18px', pillRadius: '10px',
    cardShadow: '6px 6px 0 #16121F', hairline: 'rgba(22,18,31,0.16)', surface: 'rgba(255,255,255,0.16)', overlay: 'rgba(22,18,31,0.07)',
    font: "'Nunito', system-ui, sans-serif",
    title: '#FDE047', // Gelb — knallt auf Lila, sehr „neo" (Wolf-Wunsch)
  },
};

// ── Quirks — In-Quiz-Theme für die Cozy-Quirks-Sets (Wolf 2026-07-29) ─────────
// Stilrichtung „Creme-Bühne": der Akzent ist bewusst FARBLOS-WARM (Creme), damit
// die bunten Quirk-/Team-/Kategorie-Farben die einzigen bedeutungstragenden Farben
// bleiben (Farbe = Bedeutung, Akzent = neutral). Gold NUR im Finale (separate
// Krönungs-Ausnahme, nicht hier als Dauer-Akzent). Font = Fredoka global (verspielt,
// runde CozyWolf-DNA) — via den Phase-Root (--qq-font) kaskadiert das auf ALLE Views
// zugleich, keine Einzel-Verdrahtung noetig (Phase 1b, Webfont in index.html geladen).
// Dunkle, leicht warme Plum-Bühne, damit die bunten Kacheln leuchten.
/**
 * Das Buehnen-Design. Sichtbar heisst es „CozyQuiz", intern `buehne`.
 *
 * 2026-08-24, Wolf: „hae aber wieso quirks? das war irgendein waehlbares set,
 * warum wurde darauf gebaut? ich wollte es als zusaetzliches standard set".
 * Der Einwand trifft den NAMEN, nicht die Sache. Am 29.07. hat Wolf ein
 * durchgaengiges In-Quiz-Theme bestellt; dabei entstand dieses Theme mit der
 * Entscheidung, auf der die ganze Uebergabe 2a spaeter aufbaut - der Akzent ist
 * absichtlich farblos-warm, damit Team-, Kategorie- und Phasenfarben die
 * einzigen Farben mit Bedeutung bleiben. Die Tokens hier sind seit 2a
 * neugeschrieben. Uebrig war nur die Id aus einer Zeit, in der das Theme zu
 * genau einem Avatar-Set gehoerte.
 *
 * Warum die Id nicht 'cozyquiz' lautet, obwohl das Label es tut: so heisst
 * bereits das Avatar-Set. Zwei Felder mit demselben Wert heissen, dass ein
 * verwechselter Vergleich zufaellig stimmt. Siehe shared/qqThemeIds.ts.
 */
export const BUEHNE_THEME_ID = 'buehne';
/** Abstand der Buehne zur Kante. EIN Wert, EIN Bezug, alle vier Seiten.
 *
 *  2026-08-24: genau daran ist an einem Tag zweimal etwas schief gegangen. Am
 *  Schau-mal-Rahmen kamen die Seiten aus `cqw` und oben/unten aus `cqh` - zwei
 *  Bezugsgroessen, also drei verschiedene Raender (gemessen links/rechts 28,
 *  oben 32, unten 14). Und auf derselben Folie sass die Statuszeile auf 16, der
 *  Rahmen auf 28 und `--qq-safe-margin` auf 24.
 *
 *  Hergeleitet ist der Wert aus der Zeitleiste: 12 px Leiste plus 16 px Luft,
 *  Oberkante bei 28. Steht hier und nicht in einer der Ansichten, weil ihn
 *  inzwischen mehrere brauchen (Fragefolie, Schaetzchen-Aufloesung). */
export const QQ_BUEHNE_RAND = 'clamp(20px, 1.6cqw, 28px)';
const BUEHNE: ResolvedTheme = {
  id: BUEHNE_THEME_ID, label: 'CozyQuiz',
  brand: {
    accentHex: '#F5ECD8', accentRgb: '245,236,216', accentSoft: '#EAD9B0',
    accentWarm: '#FBF3E2',          // accent-light: helles Creme (NICHT Gold → kein Leak)
    magenta: '#C9B78A',             // tiefes Sand als Sekundär/Gradient-Ende
    gradientPill: 'linear-gradient(135deg, #FBF3E2 0%, #F5ECD8 50%, #E3D2A8 100%)',
  },
  surface: {
    pageBg: 'radial-gradient(circle at 50% -5%, #1A1526 0%, #120E1C 58%, #0B0912 100%)',
    text: '#F3EFE7', textMuted: '#B9B3C6', cardText: '#F3EFE7',
    // ⚠️ Diese vier Werte gelten NUR ausserhalb der Buehne (Testseiten,
    // Showroom). Auf der Buehne selbst gewinnt der Block
    // `[data-qq-stage='2a']` in main.css, weil er auf dem Buehnen-Wurzel-
    // element sitzt und damit alles darin uebersteuert. Wer die Karten-
    // sprache der Buehne aendern will, aendert sie DORT.
    //
    // 2026-08-26 am eigenen Leib gelernt: hier stand zuerst die Aenderung
    // „kein Kasten mehr", und auf der Danke-Folie blieb der Rahmen trotzdem
    // stehen. Gefunden mit scripts/danke-probe.mjs, das die Flaechen und
    // Kanten der Folie nach Groesse auflistet: ein 1500x594 Kasten mit
    // rgba(18,15,24,0.34) und 2px Rand - exakt die Werte aus main.css.
    cardBg: 'linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02))',
    cardBorder: '1px solid rgba(255,255,255,0.10)', cardRadius: '24px', pillRadius: '999px',
    cardShadow: '0 16px 44px rgba(0,0,0,0.48)',
    hairline: 'rgba(255,255,255,0.10)', surface: 'rgba(255,255,255,0.05)', overlay: 'rgba(0,0,0,0.30)',
    // 2026-08-26 (Wolf: „ja die isses bricolage"). Hier stand Fredoka, und
    // DAS war der eigentliche Platzhalter der Buehne - nicht Nunito. Der
    // Phase-Root setzt diesen Wert auf `--qq-font`, und `--qq-font` traegt die
    // grossen Zeilen: die Frage mit 83 px kam von hier, nicht aus --font-game.
    // Wer die Buehnenschrift wechseln will und nur main.css anfasst, wechselt
    // deshalb alles ausser dem, was man zuerst sieht.
    //
    // Entschieden wurde am Bild (`scripts/schrift-probe.mjs`, vier Fassungen
    // derselben Fragefolie). Bricolage war die einzige mit einem Grund, der
    // nicht Geschmack ist: bei gleicher Groesse passt die Frage auf eine Zeile
    // statt auf zwei. Auf 1760 fixen Bildpunkten ist das Platz, den man in
    // Groesse zurueckverwandeln kann.
    //
    // Die Wortmarke bleibt League Spartan (--font-brand), entschieden
    // 2026-07-08, deckungsgleich mit cozywolf.de. Fredoka steht als Auffangnetz
    // dahinter: faellt die Schrift aus, sieht die Buehne aus wie vorher.
    font: "'Bricolage Grotesque', 'Fredoka', 'Nunito', 'Geist', system-ui, sans-serif", // global via Phase-Root
    title: '#F3EFE7',               // warm-weißer Hero/Wortmark auf der Bühne
  },
};

// ── Cozy Kino — gleicher Look wie Cozy, andere BEWEGUNG (Wolf 2026-08-18) ────
// Wolf: „wenn ich mir anschaue was motion und designtechnisch so alles geht,
// wuensche ich mir da mitzuhalten." Befund aus dem Video-Mitschnitt derselben
// Session: zwischen zwei Szenen liegt auf der Buehne ein LEERBILD (bis ~250ms
// Schwarz beim Wechsel Frage→Aufloesung), die alte Szene geht nicht ab, die neue
// blendet als ein Block auf. Das ist das „wie PowerPoint"-Gefuehl aus Wolfs
// Notiz vom 2026-07-17 (scripts/record-run.mjs).
//
// Cozy Kino ist deshalb KEIN neues Farbkleid, sondern eine Bewegungs-Variante:
// Farben, Flaechen, Schrift sind byte-identisch mit Cozy (`isCozyLook` behandelt
// beide gleich → alle 347 `isThemed()`-Stellen sehen weiterhin „cozy"). Der
// Unterschied liegt allein im Szenenwechsel. So kann Wolf am ECHTEN Beamer
// A/B vergleichen, ohne dass ein Live-Abend das Neue ungefragt faehrt.
const COZY_KINO: ResolvedTheme = { ...COZY, id: 'cozyKino', label: 'Cozy Kino' };

export const QQ_THEMES: Record<string, ResolvedTheme> = {
  // Der Standard steht vorn: die Reihenfolge hier ist die Reihenfolge der
  // Kacheln im Moderator.
  buehne: BUEHNE,
  cozy: COZY,
  cozyKino: COZY_KINO,
  studioMono: STUDIO_MONO,
  softPop: SOFT_POP,
  neoBrutal: NEO_BRUTAL,
};

/**
 * Welches Bühnen-Design zeigt der Raum? Ein gesetztes Design gewinnt immer.
 *
 * 2026-08-24: dieser Kopf beschrieb bis eben noch das ALTE Verhalten
 * („Default-Kopplung Avatar-Set → Theme … kommt ohne Extra-Klick"). Genau die
 * Kopplung ist weg — sie hat das Design aus dem Avatar-Set abgeleitet, auch
 * gegen ein ausdrücklich gewähltes, und dadurch stand im Moderator „Cozy"
 * angehakt, während der Beamer die Bühne zeigte.
 *
 * Ein Kommentar, der das Gegenteil des Codes behauptet, ist schlimmer als
 * keiner: er wird geglaubt. Deshalb hier neu und knapp.
 *
 * Reihenfolge:
 *   1. alte Id 'quirks' → 'buehne' (gespeicherte Räume, siehe qqThemeIds.ts)
 *   2. ein gesetztes, bekanntes Design gewinnt
 *   3. NUR wenn gar nichts gesetzt ist, entscheidet noch das Kachelset
 *   4. sonst die Bühne
 */
export function themeIdForState(themeId: string | undefined, avatarSetId: string | undefined): string {
  // Alte Raeume tragen die Id von vor dem 24.08. noch auf Platte.
  if (themeId === 'quirks') return BUEHNE_THEME_ID;
  if (themeId && QQ_THEMES[themeId]) return themeId;
  // 2026-08-24: die Ableitung „Quirk-Kachelset laeuft, also Buehne" greift nur
  // noch, wenn GAR KEIN Design gesetzt ist. Vorher gewann sie auch gegen ein
  // ausdruecklich gewaehltes 'cozy', und damit waren Design und Avatar-Set
  // aneinandergekettet: das Design erschien, ohne dass jemand es gewaehlt hat,
  // und im Moderator stand trotzdem „Cozy" angehakt.
  // Wolf wollte beides als eigenen Standard, nicht eines aus dem anderen
  // abgeleitet - jetzt sind es zwei freie Schalter. Die Buehne laeuft damit
  // auch mit dem Halloween-Set, und das CozyQuiz-Set laeuft auch unter Cozy.
  if (!themeId && isQuirkTileSet(avatarSetId)) return BUEHNE_THEME_ID;
  return themeId ?? BUEHNE_THEME_ID;
}

export const QQ_THEME_IDS = Object.keys(QQ_THEMES);

// ── Runtime-State (modulweit, abonnierbar) ──────────────────────────────────
let _activeId = 'cozy';
const _listeners = new Set<() => void>();

export function getActiveThemeId(): string {
  return _activeId;
}

export function getActiveTheme(): ResolvedTheme {
  return QQ_THEMES[_activeId] ?? COZY;
}

/** #RRGGBB -> "r,g,b" (fuer rgba(var(--…-rgb), a)). Abgeleitet aus vorhandenem
 *  Hex → zero-change fuer bestehende Themes. */
function hexToRgbTriple(hex: string): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

/** Schreibt die Akzent-CSS-Vars des Themes auf :root → alle auf
 *  `var(--qq-accent*)` migrierten Flaechen ziehen sofort mit. */
export function applyThemeVars(theme: ResolvedTheme = getActiveTheme()): void {
  if (typeof document === 'undefined') return;
  const r = document.documentElement.style;
  const b = theme.brand;
  const s = theme.surface;
  // Akzent
  r.setProperty('--qq-accent', b.accentHex);
  r.setProperty('--qq-accent-rgb', b.accentRgb);
  r.setProperty('--qq-accent-soft', b.accentSoft);
  r.setProperty('--qq-accent-light', b.accentWarm);
  r.setProperty('--qq-accent-magenta', b.magenta);
  r.setProperty('--qq-accent-magenta-rgb', hexToRgbTriple(b.magenta));
  // Flächen (Lackierung — Layout bleibt unangetastet)
  r.setProperty('--qq-bg', s.pageBg);
  r.setProperty('--qq-text', s.text);
  r.setProperty('--qq-text-muted', s.textMuted);
  r.setProperty('--qq-card-text', s.cardText);
  r.setProperty('--qq-card-bg', s.cardBg);
  r.setProperty('--qq-card-border', s.cardBorder);
  r.setProperty('--qq-card-radius', s.cardRadius);
  r.setProperty('--qq-pill-radius', s.pillRadius);
  r.setProperty('--qq-card-shadow', s.cardShadow);
  r.setProperty('--qq-hairline', s.hairline);
  r.setProperty('--qq-surface', s.surface);
  r.setProperty('--qq-overlay', s.overlay);
  r.setProperty('--qq-font', s.font);
  r.setProperty('--qq-title', s.title);
  // Quiet Motion (Mono): data-Attribut am <html> → eine zentrale CSS-Regel killt
  // die dekorativen Dauer-Waves (qqCatNameWave) auf allen Hero-Titeln zugleich,
  // ohne jede Stelle einzeln zu gaten. SoftPop/Neo behalten die cozy-Motion.
  document.documentElement.setAttribute('data-quiet-motion', theme.id === 'studioMono' ? 'true' : 'false');
  // Szenenwechsel-Sprache: 'kino' aktiviert die View-Transition-Ebene auf dem
  // Beamer (QQBeamerPage), 'cut' ist das heutige harte Umschalten.
  // 2026-08-24 (Bewegungs-Einschaetzung, Baustein B2): die Buehne bekommt
  // denselben Szenenwechsel wie Cozy Kino. Die Mechanik lag seit dem 18.08.
  // fertig da (hooks/useSceneTransition.ts plus die Choreografie in main.css),
  // war aber nur fuer EINEN Skin freigeschaltet - waehrend genau der Befund,
  // fuer den sie gebaut wurde („fuehlt sich wie PowerPoint an", Leerbild
  // zwischen zwei Szenen), auf der Buehne unveraendert bestand.
  // Eigener Wert statt `kino`, weil die Buehne ihre eigene Laenge fahren darf.
  document.documentElement.setAttribute(
    'data-scene-motion',
    theme.id === 'cozyKino' ? 'kino' : theme.id === BUEHNE_THEME_ID ? 'buehne' : 'cut',
  );
}

export function setActiveThemeId(id: string): void {
  if (!QQ_THEMES[id] || id === _activeId) return;
  _activeId = id;
  applyThemeVars(QQ_THEMES[id]);
  _listeners.forEach((l) => l());
}

export function resolveTheme(id?: string): ResolvedTheme {
  return (id && QQ_THEMES[id]) || COZY;
}

function subscribe(cb: () => void): () => void {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}

/** Hook: aktive Theme-ID; löst Re-Render bei Wechsel aus. */
export function useActiveThemeId(): string {
  return useSyncExternalStore(subscribe, getActiveThemeId, getActiveThemeId);
}

/** Traegt diese Theme-ID den Cozy-LOOK? (Cozy + Cozy Kino: gleiche Farben/
 *  Flaechen/Schrift, nur andere Bewegung.) Zentral, damit die 347 `isThemed()`-
 *  Stellen und die zwei direkten `=== 'cozy'`-Vergleiche nicht auseinanderlaufen. */
export function isCozyLook(id: string = _activeId): boolean {
  return id === 'cozy' || id === 'cozyKino';
}

/** Ist gerade ein anderes Theme als der Cozy-Default aktiv? */
export function isThemed(): boolean {
  return !isCozyLook(_activeId);
}

/** Kino-Motion aktiv? (Szenenwechsel als Wechsel statt als Schnitt.) */
export function isKinoMotion(): boolean {
  return _activeId === 'cozyKino';
}

// ── Bewegungs-Sprache pro Skin ──────────────────────────────────────────────
// 2026-06-25 (Wolf): cozy-Effekte (Title-Wave, Shimmer-Balken, Schockwellen-
// Ringe, Wobble/Bounce) wirken im editorialen Studio-Mono fehl am Platz. In
// „Quiet Motion"-Skins werden dekorative Spiel-Animationen durch ruhige Fades
// ersetzt; funktionale Bewegung (Reveal-Reihenfolge, Timer-Dringlichkeit)
// bleibt. Aktuell NUR Mono — SoftPop/Neo behalten die verspielte cozy-Motion.
export function isQuietMotion(): boolean {
  return _activeId === 'studioMono';
}

// ── Semantische „Status"-Karten pro Skin ────────────────────────────────────
// Direction A (Wolf 2026-06-24): grün=Lösung / rot=Leer bleiben als Semantik,
// werden aber in der Karten-Sprache des aktiven Skins gerendert (Mono: Hard-
// Shadow, Soft Pop: weicher Bottom-Shadow, Neo: flacher Block + schwarzer Rand)
// — statt überall dieselbe Cozy-Glow-Box. Zentral hier, damit alle Reveals
// (Schätzchen, OnlyConnect, …) dieselbe „Lösung"-Optik teilen (drift-sicher).
export type StatusCardStyle = { bg: string; border: string; radius: string | number; shadow: string; fg: string };

/** „Lösung/richtig"-Card (grüne Semantik) im Karten-Stil des aktiven Skins. */
export function getSolveCardStyle(): StatusCardStyle {
  switch (_activeId) {
    case 'studioMono':
      return { bg: '#F1FBF4', border: '2px solid #15803D', radius: 4, shadow: '6px 6px 0 #15803D', fg: '#15803D' };
    case 'softPop':
      return { bg: '#EAF9EF', border: '1px solid rgba(22,163,74,0.30)', radius: 26, shadow: '0 8px 0 rgba(22,163,74,0.18)', fg: '#15803D' };
    case 'neoBrutal':
      return { bg: '#34D399', border: '3px solid #16121F', radius: 18, shadow: '6px 6px 0 #16121F', fg: '#0A2E1C' };
    default: // cozy — heutige Werte, visual-neutral
      return {
        bg: 'radial-gradient(circle at 50% 35%, rgba(34,197,94,0.18), rgba(22,163,74,0.04) 70%)',
        border: '3px solid rgba(34,197,94,0.6)', radius: 24,
        shadow: '0 0 50px rgba(34,197,94,0.25), inset 0 0 26px rgba(34,197,94,0.08)',
        fg: '#86efac',
      };
  }
}

/** „Leer/kein Treffer"-Card (rote Semantik) im Karten-Stil des aktiven Skins. */
export function getEmptyCardStyle(): StatusCardStyle {
  switch (_activeId) {
    case 'studioMono':
      return { bg: '#FBF2F2', border: '2px solid #DC2626', radius: 4, shadow: '6px 6px 0 #DC2626', fg: '#B91C1C' };
    case 'softPop':
      return { bg: '#FDEEF0', border: '1px solid rgba(220,38,38,0.28)', radius: 26, shadow: '0 8px 0 rgba(220,38,38,0.16)', fg: '#DC2626' };
    case 'neoBrutal':
      return { bg: '#FB7185', border: '3px solid #16121F', radius: 18, shadow: '6px 6px 0 #16121F', fg: '#3A0A12' };
    default: // cozy — heutige Werte, visual-neutral
      return { bg: 'transparent', border: '2px solid rgba(239,68,68,0.4)', radius: 24, shadow: 'none', fg: '#f87171' };
  }
}

// ── Generische Skin-Helper (DRY-Layer für „immer mehr Designs einbauen") ─────
// Zweck (Wolf 2026-06-24): NICHT mehr jedes „Fenster" einzeln mit
// `isThemed() ? 'var(--qq-card-bg)' : …` von Hand theme'n. Stattdessen EIN
// Helper, der im Skin IMMER die Skin-Card-Tokens liefert → Radius/Rand/Schatten
// sind über ALLE Fenster garantiert einheitlich (keine „manche rund, manche
// eckig"-Drift mehr). Bei cozy gibt der Helper `null` zurück → der Caller
// behält seinen heutigen Look (byte-identisch).
//
// Pattern am Call-Site:
//   style={{ ...layout, ...cozyLook, ...(themedWindow({ emphasis }) ?? {}) }}
// Cozy-Werte stehen normal da; im Skin überschreibt der Spread bg/border/
// radius/shadow/color in einem Rutsch. Neues Fenster = eine Zeile mehr.
// Neues Design = NUR ein Theme-Objekt in QQ_THEMES (kein Touch an Komponenten).

export interface ThemedWindowOpts {
  /** Akzent-Rand statt neutralem Card-Rand (z.B. Sieger/Top-Row). */
  emphasis?: boolean;
  /** Grüner „richtig/Treffer"-Rand (semantisches Spielsignal, skin-unabhängig). */
  ok?: boolean;
}

/** Skin-Card-Frame für ein „Fenster" (Card/Panel/Listen-Row). `null` bei cozy. */
export function themedWindow(opts: ThemedWindowOpts = {}): CSSProperties | null {
  if (!isThemed()) return null;
  const border = opts.ok
    ? '2px solid #22C55E'
    : opts.emphasis
      ? '2px solid var(--qq-accent)'
      : 'var(--qq-card-border)';
  return {
    background: 'var(--qq-card-bg)',
    border,
    borderRadius: 'var(--qq-card-radius)',
    boxShadow: 'var(--qq-card-shadow)',
    color: 'var(--qq-card-text)',
  };
}

/** Skin-Chip/Pill (Sub-Element auf BG/Card). `null` bei cozy. */
export function themedChip(opts: { emphasis?: boolean } = {}): CSSProperties | null {
  if (!isThemed()) return null;
  return {
    background: 'var(--qq-surface)',
    border: opts.emphasis ? '1.5px solid var(--qq-accent)' : '1.5px solid var(--qq-hairline)',
    color: 'var(--qq-card-text)',
  };
}
