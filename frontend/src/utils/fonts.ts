// ── Google Font loader (idempotent) ───────────────────────────────────────────

export interface FontOption {
  value: string;       // CSS font-family string
  label: string;       // human-readable name
  googleName: string | null; // Google Fonts URL slug (null = system font)
}

export const FONT_OPTIONS: FontOption[] = [
  { value: "'Nunito', sans-serif",        label: 'Nunito',           googleName: 'Nunito' },
  { value: "'Space Grotesk', sans-serif", label: 'Space Grotesk',    googleName: 'Space+Grotesk' },
  { value: "'Bebas Neue', cursive",       label: 'Bebas Neue',       googleName: 'Bebas+Neue' },
  { value: "'Bangers', cursive",          label: 'Bangers',          googleName: 'Bangers' },
  { value: "'Pacifico', cursive",         label: 'Pacifico',         googleName: 'Pacifico' },
  { value: "'Righteous', cursive",        label: 'Righteous',        googleName: 'Righteous' },
  { value: "'Fredoka One', cursive",      label: 'Fredoka One',      googleName: 'Fredoka+One' },
  { value: "'Press Start 2P', monospace", label: 'Press Start 2P',   googleName: 'Press+Start+2P' },
  { value: "'Orbitron', sans-serif",      label: 'Orbitron',         googleName: 'Orbitron' },
  { value: "'Caveat', cursive",           label: 'Caveat',           googleName: 'Caveat' },
  { value: "'Permanent Marker', cursive", label: 'Permanent Marker', googleName: 'Permanent+Marker' },
  { value: "'Lobster', cursive",          label: 'Lobster',          googleName: 'Lobster' },
  { value: 'Georgia, serif',             label: 'Georgia',           googleName: null },
  { value: "'Impact', sans-serif",        label: 'Impact',           googleName: null },
  { value: "'Courier New', monospace",    label: 'Courier New',      googleName: null },
];

export function loadGoogleFont(googleName: string) {
  const id = `gf-${googleName}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${googleName}:wght@400;700;900&display=swap`;
  document.head.appendChild(link);
}

/** Pre-load every Google Font in FONT_OPTIONS */
export function loadAllFonts() {
  FONT_OPTIONS.forEach(f => { if (f.googleName) loadGoogleFont(f.googleName); });
}

/** Load only the fonts actually used in a set of font-family strings */
export function loadUsedFonts(fontFamilies: (string | undefined)[]) {
  for (const ff of fontFamilies) {
    if (!ff) continue;
    const match = FONT_OPTIONS.find(o => o.value === ff);
    if (match?.googleName) loadGoogleFont(match.googleName);
  }
}
