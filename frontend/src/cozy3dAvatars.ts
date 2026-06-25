// 2026-06-23 — cozy3d: Wolfs 3D-Fluent-Tier-Avatare als neuer Standard-Look.
//
// 80 PNGs unter /avatars/cozy3d/<slug>.png (getrimmt + komprimiert via
// scripts/process-cozy3d.mjs). Render-Pfad: QQTeamAvatar / CountryFlagOrEmoji
// erkennen einen cozy3d-Slug und rendern das Bild auf der Slot-Farb-Disc
// (statt eines OS-Emoji-Glyphs). Slot-Farbe = Team-Farbe bleibt unangetastet.
//
// WICHTIG: Der Slug wird im freien String-Feld `team.emoji` gespeichert
// (kein Backend-Schema-Change). Wer prüfen will „ist das ein cozy3d-Avatar
// oder ein echtes Emoji" nutzt isCozy3dSlug().

export type Cozy3dAvatar = { slug: string; label: string };

// Reihenfolge: die ersten 8 sind die Default-Belegung der 8 Farb-Slots
// (spiegeln die bisherigen QQ_AVATARS-Tiere für visuelle Kontinuität),
// danach alphabetisch der ganze Pool.
export const COZY3D_AVATARS: Cozy3dAvatar[] = [
  { slug: 'hund', label: 'Hund' },
  { slug: 'faultier', label: 'Faultier' },
  { slug: 'pinguin', label: 'Pinguin' },
  { slug: 'koala', label: 'Koala' },
  { slug: 'giraffe', label: 'Giraffe' },
  { slug: 'waschbaer', label: 'Waschbär' },
  { slug: 'kuh', label: 'Kuh' },
  { slug: 'capybara', label: 'Capybara' },
  { slug: 'adler', label: 'Adler' },
  { slug: 'alligator', label: 'Alligator' },
  { slug: 'axolotl', label: 'Axolotl' },
  { slug: 'baer', label: 'Bär' },
  { slug: 'biber', label: 'Biber' },
  { slug: 'biene', label: 'Biene' },
  { slug: 'bison', label: 'Bison' },
  { slug: 'chamaeleon', label: 'Chamäleon' },
  { slug: 'clownfisch', label: 'Clownfisch' },
  { slug: 'dachs', label: 'Dachs' },
  { slug: 'delfin', label: 'Delfin' },
  { slug: 'dino', label: 'Dino' },
  { slug: 'dodo', label: 'Dodo' },
  { slug: 'drache', label: 'Drache' },
  { slug: 'eichhoernchen', label: 'Eichhörnchen' },
  { slug: 'einhorn', label: 'Einhorn' },
  { slug: 'elch', label: 'Elch' },
  { slug: 'elefant', label: 'Elefant' },
  { slug: 'ente', label: 'Ente' },
  { slug: 'eule', label: 'Eule' },
  { slug: 'flamingo', label: 'Flamingo' },
  { slug: 'fledermaus', label: 'Fledermaus' },
  { slug: 'fuchs', label: 'Fuchs' },
  { slug: 'gecko', label: 'Gecko' },
  { slug: 'gorilla', label: 'Gorilla' },
  { slug: 'hahn', label: 'Hahn' },
  { slug: 'hai', label: 'Hai' },
  { slug: 'hamster', label: 'Hamster' },
  { slug: 'hase', label: 'Hase' },
  { slug: 'hummer', label: 'Hummer' },
  { slug: 'igel', label: 'Igel' },
  { slug: 'kamel', label: 'Kamel' },
  { slug: 'kaenguruh', label: 'Känguru' },
  { slug: 'katze', label: 'Katze' },
  { slug: 'krabbe', label: 'Krabbe' },
  { slug: 'kueken', label: 'Küken' },
  { slug: 'lama', label: 'Lama' },
  { slug: 'loewe', label: 'Löwe' },
  { slug: 'marienkaefer', label: 'Marienkäfer' },
  { slug: 'maulwurf', label: 'Maulwurf' },
  { slug: 'maus', label: 'Maus' },
  { slug: 'muschel', label: 'Muschel' },
  { slug: 'nashorn', label: 'Nashorn' },
  { slug: 'nilpferd', label: 'Nilpferd' },
  { slug: 'oktopus', label: 'Oktopus' },
  { slug: 'orang-utan', label: 'Orang-Utan' },
  { slug: 'orca', label: 'Orca' },
  { slug: 'otter', label: 'Otter' },
  { slug: 'panda', label: 'Panda' },
  { slug: 'papagei', label: 'Papagei' },
  { slug: 'pfau', label: 'Pfau' },
  { slug: 'pferd', label: 'Pferd' },
  { slug: 'phoenix', label: 'Phönix' },
  { slug: 'platypus', label: 'Platypus' },
  { slug: 'pufffisch', label: 'Kugelfisch' },
  { slug: 'qualle', label: 'Qualle' },
  { slug: 'red-panda', label: 'Roter Panda' },
  { slug: 'robbe', label: 'Robbe' },
  { slug: 'schlange', label: 'Schlange' },
  { slug: 'schmetterling', label: 'Schmetterling' },
  { slug: 'schwan', label: 'Schwan' },
  { slug: 'seehkuh', label: 'Seekuh' },
  { slug: 'spinne', label: 'Spinne' },
  { slug: 'stinktier', label: 'Stinktier' },
  { slug: 'tiger', label: 'Tiger' },
  { slug: 'trizeratops', label: 'Triceratops' },
  { slug: 'wal', label: 'Wal' },
  { slug: 'walross', label: 'Walross' },
  { slug: 'wasserbueffel', label: 'Wasserbüffel' },
  { slug: 'wildschwein', label: 'Wildschwein' },
  { slug: 'zebra', label: 'Zebra' },
  { slug: 'ziege', label: 'Ziege' },
];

/** Alle Slugs als String-Array (= Picker-Pool + Set-`avatars`). */
export const COZY3D_SLUGS: string[] = COZY3D_AVATARS.map(a => a.slug);

/** Die 8 Default-Slugs für die 8 Farb-Slots (vor Spieler-Auswahl). */
export const COZY3D_DEFAULTS: string[] = COZY3D_SLUGS.slice(0, 8);

const SLUG_SET = new Set(COZY3D_SLUGS);
const LABEL_BY_SLUG = new Map(COZY3D_AVATARS.map(a => [a.slug, a.label]));

/** Ist der String ein cozy3d-Avatar-Slug (vs. echtes Emoji / Flagge)? */
export function isCozy3dSlug(s: string | undefined | null): s is string {
  return !!s && SLUG_SET.has(s);
}

/** Pfad zum Avatar-PNG. */
export function cozy3dSrc(slug: string): string {
  return `/avatars/cozy3d/${slug}.png`;
}

/** Anzeige-Label (Tier-Name) für einen Slug, Fallback = Slug selbst. */
export function cozy3dLabel(slug: string): string {
  return LABEL_BY_SLUG.get(slug) ?? slug;
}

// ─── Blinzeln (2026-06-25) ────────────────────────────────────────────────
// Wolf hat optimierte Augen-auf/zu-Paare geliefert. Mechanik = 2-Frame-Swap:
//   - Ruhezustand = OFFENE Augen  → /avatars/cozy3d/<slug>.png        (neu optimiert)
//   - Blink-Frame  = GESCHLOSSENE Augen → /avatars/cozy3d/<slug>-blink.png
// Beide Frames stammen aus demselben optimierten Set + werden identisch
// getrimmt (scripts/process-cozy3d-blink.mjs) → kein Versatz beim Blinzeln.
// Ein Tier blinzelt NUR, wenn sein Slug hier steht (= ein -blink-Asset existiert).
// Die restlichen Tiere bleiben statisch (offen), bis Wolf die Paare nachliefert.
// → neue Paare verarbeiten: node scripts/process-cozy3d-blink.mjs "<zip-ordner>"
//   und die ausgegebene Slug-Liste hier ergaenzen.
export const COZY3D_BLINK_SLUGS = new Set<string>([
  'adler', 'alligator', 'axolotl', 'baer', 'biene', 'bison', 'capybara',
  'chamaeleon', 'clownfisch', 'dachs', 'delfin', 'dino', 'dodo', 'drache',
  'eichhoernchen', 'einhorn', 'elch', 'elefant', 'ente', 'eule', 'faultier',
  'flamingo', 'fledermaus', 'fuchs', 'gecko', 'giraffe', 'gorilla', 'hahn',
  'hai', 'hamster', 'hase', 'hummer', 'hund', 'igel', 'kaenguruh', 'kamel',
  'katze', 'koala', 'krabbe', 'kueken', 'kuh',
]);

/** Pfad zum GESCHLOSSENE-Augen-PNG (Blink-Frame). */
export function cozy3dBlinkSrc(slug: string): string {
  return `/avatars/cozy3d/${slug}-blink.png`;
}

/** Hat dieser Slug ein -blink-Asset → soll blinzeln? */
export function cozy3dHasBlink(slug: string | undefined | null): boolean {
  return !!slug && COZY3D_BLINK_SLUGS.has(slug);
}
