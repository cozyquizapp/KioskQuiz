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
  inkDeep:    '#1F3A5F',   // tiefes Indigo-Blau (Nachthimmel)
  inkSoft:    '#3D5A80',   // gedämpftes Mittel-Blau
  sage:       '#7A9E7E',   // gedämpftes Salbei-Grün
  sageLight:  '#B8CDB1',   // helles Salbei
  cream:      '#F2EAD3',   // warmes Papier-Cremeweiß
  paper:      '#EAE0C8',   // Papier-BG Basis
  terracotta: '#E07A5F',   // warme Akzent-Erde
  ochre:      '#D9A05B',   // Ocker für Sterne/Akzente
  charcoal:   '#2D2A26',   // dunkler Tinte-Ton
} as const;

export type GouachePaletteKey = keyof typeof PALETTE;

// Font-Stacks. Die echten Schriften (Caveat, Lora) lädst du über
// usePaintFonts(). Fallbacks sind absichtlich systemnah, damit beim
// Initial-Render nicht alles nackt aussieht bis Google Fonts da sind.
export const F_HAND = "'Caveat', 'Kalam', 'Patrick Hand', cursive";
export const F_BODY = "'Lora', 'Cormorant Garamond', Georgia, serif";

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
export const PAPER_GRAIN_BG =
  `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>` +
  `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/>` +
  `<feColorMatrix values='0 0 0 0 0.92  0 0 0 0 0.86  0 0 0 0 0.74  0 0 0 0.16 0'/></filter>` +
  `<rect width='200' height='200' filter='url(%23n)'/></svg>")`;

// Größeres, weicheres Paper-Pattern für Page-Backgrounds.
export const PAPER_BG =
  `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>` +
  `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='2'/>` +
  `<feColorMatrix values='0 0 0 0 0.85  0 0 0 0 0.78  0 0 0 0 0.65  0 0 0 0.18 0'/></filter>` +
  `<rect width='400' height='400' filter='url(%23n)'/></svg>")`;

// ─────────────────────────────────────────────────────────────────────────
// Team-Farben — sanfte Gouache-Variante.
// Mapping per QQ_AVATARS.id (nicht per slug!) — der Code nutzt id für
// alle Team-Operationen.
// ─────────────────────────────────────────────────────────────────────────
export const SOFT_TEAM_COLORS: Record<string, string> = {
  fox:     '#E68099',  // Hund (Shiba)   — Rose
  frog:    '#B4CC78',  // Faultier       — Sage-Limette
  panda:   '#5B85C2',  // Pinguin        — Staubig-Blau
  rabbit:  '#B393D1',  // Koala          — Lavendel
  unicorn: '#F0CC5F',  // Giraffe        — Honig
  raccoon: '#88B5AB',  // Waschbär       — Stein-Teal
  cow:     '#E89561',  // Kuh            — Terracotta-Orange
  cat:     '#DB6A55',  // Capybara       — Backstein
};

// Hoodie-Farben — finale Variante (2026-04-26) ohne Doppelungen,
// abgestimmt auf den realen Aquarell-Look der gemalten Avatare.
// Vorherige Empfehlung hatte zu schwere Töne (Indigo/Holzkohle); jetzt
// alle aus dem mittleren Aquarell-Sat-Bereich, plus Dusty-Rose + Stone-
// Grey als neue Akzente.
// Mapping per QQ_AVATARS.id.
export const HOODIE_COLORS: Record<string, string> = {
  fox:     '#88B5AB',  // Hund (Shiba)   — Mint teal
  frog:    '#A89B8E',  // Faultier        — Stone Grey
  panda:   '#CA8FA4',  // Pinguin         — Dusty Rose
  rabbit:  '#E07A5F',  // Koala           — Terracotta
  unicorn: '#B393D1',  // Giraffe         — Lavendel
  raccoon: '#D9A05B',  // Waschbär        — Mustard Ocker
  cow:     '#5B85C2',  // Kuh             — Dusty blue
  cat:     '#7A9E7E',  // Capybara        — Sage green
};

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
