// Design-Tokens für den parallelen Aquarell-/Gouache-Stil.
//
// WICHTIG: Diese Tokens sind komplett separat vom bestehenden Cozy-Dark-
// Theme. Der alte Stil bleibt unverändert — der neue Gouache-Stil wird
// parallel aufgebaut. Wenn du das fertige Quiz mal in Aquarell sehen
// willst, dann nur über die /...-gouache-Routen, nicht im Live-Quiz-
// Code-Pfad.
//
// Wenn du Tokens hier änderst → ändert sich der gesamte Gouache-Stil.
// Stelle bei Änderungen sicher, dass /gouache (Stilstudie) und alle
// gouache-Subseiten konsistent aussehen.

export const PALETTE = {
  // Basis-Tinten
  inkDeep:    '#1F3A5F',   // tiefes Indigo-Blau (Nachthimmel)
  inkSoft:    '#3D5A80',   // gedämpftes Mittel-Blau
  sage:       '#7A9E7E',   // gedämpftes Salbei-Grün
  sageLight:  '#B8CDB1',   // helles Salbei
  cream:      '#F2EAD3',   // warmes Papier-Cremeweiß
  paper:      '#EAE0C8',   // Papier-BG Basis
  terracotta: '#E07A5F',   // warme Akzent-Erde
  ochre:      '#D9A05B',   // Ocker für Sterne/Akzente
  charcoal:   '#2D2A26',   // dunkler Tinte-Ton

  // Bilderbuch-Inspiration (aus Aquarell-Reference-Sheet) — gedämpfte,
  // tiefe Pastell-Töne mit „Pfirsich-Himmel"- und „Mitternachts-Türkis"-Vibes.
  peach:        '#F2D9B5',   // sandiger Pfirsich-Himmel
  peachWarm:    '#E8B695',   // warmer Pfirsich-Übergang
  dusk:         '#2B4A5D',   // tiefes Mitternachts-Türkis (Unterwasser)
  mist:         '#4F7B7E',   // Türkis-Nebel (atmosph. Wash)
  amberGlow:    '#F4A93C',   // warmer Goldglow (Lampen-Halo)
  lavenderDusk: '#6E5878',   // Lila Berg-Schatten
} as const;

export type GouachePaletteKey = keyof typeof PALETTE;

// Font-Stacks. Die echten Schriften (Caveat, Patrick Hand SC, Lora) lädst du
// über usePaintFonts(). Fallbacks sind absichtlich systemnah, damit beim
// Initial-Render nicht alles nackt aussieht bis Google Fonts da sind.
//
// F_HAND      — flowy Cursive für Marke + persönliche Elemente (CozyQuiz, Team-Namen)
// F_HAND_CAPS — Block-Caps-Hand-Schrift für Slogan-Headings im Bilderbuch-Stil
//               (z.B. „BALD GEHT'S LOS", „RICHTIG!", „SPIELREGELN").
//               Nutze immer mit text-transform: uppercase + leichtem letter-spacing.
// F_BODY      — warmer Serif für Lese-Text
export const F_HAND      = "'Caveat', 'Kalam', 'Patrick Hand', cursive";
export const F_HAND_CAPS = "'Patrick Hand SC', 'Architects Daughter', 'Caveat', cursive";
export const F_BODY      = "'Lora', 'Cormorant Garamond', Georgia, serif";

// Wieder­verwendbare Schatten-Layer für PaperCards / Buttons / Avatare.
export const SHADOWS = {
  card:   '0 14px 40px rgba(31,58,95,0.12), 0 2px 6px rgba(31,58,95,0.06)',
  cardLg: '0 18px 44px rgba(31,58,95,0.18), 0 4px 10px rgba(31,58,95,0.08)',
  button: '0 8px 22px rgba(224,122,95,0.4), inset 0 -3px 0 rgba(0,0,0,0.12)',
  avatar: '0 12px 24px rgba(31,58,95,0.22)',
} as const;

// Standard-Radien für Cards / Buttons / Pills.
export const RADIUS = {
  card: 14,
  cardLg: 18,
  pill: 999,
} as const;

// SVG-Data-URI für Paper-Grain. Wird per CSS background-image auf Papier-
// flächen gelegt. Kein externes Asset nötig.
//
// baseFrequency 0.45 (gröber) + opacity 0.32 (sichtbarer) → der Papier-Korn
// wird zur prägenden Textur statt nur subtilem Overlay (passt zu Bilderbuch-
// Aquarell-Inspiration).
export const PAPER_GRAIN_BG =
  `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>` +
  `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.45' numOctaves='3' seed='5'/>` +
  `<feColorMatrix values='0 0 0 0 0.92  0 0 0 0 0.86  0 0 0 0 0.74  0 0 0 0.32 0'/></filter>` +
  `<rect width='240' height='240' filter='url(%23n)'/></svg>")`;

// Größeres, weicheres Paper-Pattern für Page-Backgrounds.
// Lange Wellen (0.35) + 3 Oktaven → tiefes Aquarell-Wash-Gefühl.
export const PAPER_BG =
  `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='480' height='480'>` +
  `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.35' numOctaves='3' seed='9'/>` +
  `<feColorMatrix values='0 0 0 0 0.85  0 0 0 0 0.78  0 0 0 0 0.65  0 0 0 0.28 0'/></filter>` +
  `<rect width='480' height='480' filter='url(%23n)'/></svg>")`;

// Canvas-Cross-Hatch-Pattern — feines Leinwand-Geflecht für „rauer Papier"-
// Look auf großen Hintergrundflächen. Kombiniert mit PAPER_BG ergibt das
// eine zweischichtige Textur (Wash + Hatch) wie auf rauem Aquarellpapier.
export const CANVAS_HATCH_BG =
  `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'>` +
  `<path d='M0 0L8 8M8 0L0 8' stroke='%232D2A26' stroke-opacity='0.06' stroke-width='0.4'/></svg>")`;

// ─────────────────────────────────────────────────────────────────────────
// Team-Farben — exakte Hoodie-Hex aus den gemalten Aquarell-Avataren.
// Jeder Hex wurde aus dem Hoodie-Bereich des jeweiligen Bildes extrahiert
// (extract-hoodie-colors-Script, Sample-Region unten Mitte 85-97% Höhe).
// Hoodie-Farbe = Team-Farbe → eine Identität pro Team statt zwei
// konkurrierende Farben.
// Mapping per QQ_AVATARS.id (nicht per slug!).
// ─────────────────────────────────────────────────────────────────────────
export const SOFT_TEAM_COLORS: Record<string, string> = {
  fox:     '#9D9387',  // Hund (Shiba)   — Stone Grey
  frog:    '#B79EAC',  // Faultier        — Lavender
  panda:   '#E99E9D',  // Pinguin         — Dusty Rose
  rabbit:  '#F35357',  // Koala           — Coral Red
  unicorn: '#9EA7C8',  // Giraffe         — Periwinkel-Blau
  raccoon: '#E9BF53',  // Waschbär        — Mustard Yellow
  cow:     '#D26631',  // Kuh             — Burnt Orange
  cat:     '#B4B677',  // Capybara        — Sage Olive
};

// Hoodie-Farben = Team-Farben (siehe oben) — die Avatare sind so gemalt,
// dass jeder genau seine Team-Farbe trägt. Auf eigenem Feld verschmilzt
// der Hoodie mit der Cell, das Tier-Gesicht (warmer Pelz) wird zum
// fokalen Pop. Auf fremdem Feld (Klau-Phase) kontrastiert der Hoodie
// klar gegen die andere Team-Farbe.
export const HOODIE_COLORS: Record<string, string> = SOFT_TEAM_COLORS;

// Helpers — geben Defaults zurück falls die ID nicht in der Map ist.
export function softTeamColor(avatarId: string, fallback = PALETTE.terracotta): string {
  return SOFT_TEAM_COLORS[avatarId] ?? fallback;
}

export function hoodieColor(avatarId: string, fallback = PALETTE.sage): string {
  return HOODIE_COLORS[avatarId] ?? fallback;
}

// ─────────────────────────────────────────────────────────────────────────
// Avatar-URLs
// ─────────────────────────────────────────────────────────────────────────
export const GOUACHE_AVATAR_PATH = '/avatars/gouache';
export const COZY_CAST_AVATAR_PATH = '/avatars/cozy-cast';

export function gouacheAvatarUrl(slug: string): string {
  return `${GOUACHE_AVATAR_PATH}/avatar-${slug}.png`;
}

export function cozyCastAvatarUrl(slug: string): string {
  return `${COZY_CAST_AVATAR_PATH}/avatar-${slug}.png`;
}
