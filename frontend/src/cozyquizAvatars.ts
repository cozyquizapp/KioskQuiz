// 2026-08-22 — CozyQuiz Avatar Set: Wolfs Objekt-Avatare zum Buehnen-Design 2a.
//
// 48 PNGs unter /avatars/cozyquiz/<slug>.png (512², transparent, getrimmt und
// zentriert via sharp aus Wolfs Lieferung). Render-Pfad exakt wie Party 3D:
// QQTeamAvatar erkennt einen Slug und rendert das neutrale Objekt auf der
// Slot-Farb-Kachel. Die Teamfarbe kommt also von der Kachel, das Objekt bleibt
// farbneutral → frei kombinierbar (48 Objekte × 8 Farben), KEIN Slot-Binding.
//
// Das ist der Unterschied zu Blockz und Quirks 2.0, wo die Farbe ins Motiv
// gebacken ist und das Design deshalb aus dem Slot abgeleitet werden MUSS.
// Wolfs README zum Set sagt es ausdruecklich: „Use the UI tile or team badge as
// a separate layer." Genau dafuer ist der Party-Pfad gebaut.
//
// Warum das Set der neue Default ist (2026-08-22, Wolf: „sie passen am besten
// zum neuen Design"): die Uebergabe 2a macht die Teammarke zur eckigen Kachel in
// Teamfarbe — dieselbe Form, die auf dem Brett gesetzt wird. Ein farbneutrales
// Objekt auf dieser Kachel traegt die Teamfarbe unverfaelscht, waehrend ein
// Tier mit eigener Fellfarbe zwei Farben ins Bild bringt. Ausserdem sind
// Objekte auf 2,8 m Bildbreite als Silhouette schneller zu unterscheiden als
// Tiergesichter, die sich alle auf dieselbe Grundform reduzieren.
//
// Wie bei cozy3d und Party wird der Slug im freien String-Feld `team.emoji`
// gespeichert (kein Backend-Schema-Change). isCozyQuizSlug() unterscheidet
// Objekt-Slug vs. echtes Emoji / cozy3d-Tier / Wappen.

export type CozyQuizAvatar = {
  slug: string;
  label: string;
  labelEn: string;
  /** Themengruppe aus Wolfs manifest.json — gruppiert den Picker. */
  group: 'food-drink' | 'cozy-home' | 'nature' | 'games-hobbies' | 'adventure' | 'magic-curious';
};

/** Set-ID. */
export const COZYQUIZ_SET_ID = 'cozyquiz';

// Reihenfolge: die ersten acht sind die Default-Belegung der acht Farb-Slots,
// danach der Rest gruppenweise. Die acht sind bewusst aus verschiedenen Gruppen
// gewaehlt und haben klar verschiedene Silhouetten — rund, hoch, spitz, flach —
// damit die Teams sich auch dann unterscheiden, wenn der Projektor die Farben
// verwaescht oder jemand rot-gruen-schwach ist. Dieselbe Ueberlegung steht im
// Blockz-Modul: auf Distanz traegt die Silhouette, nicht die Farbe.
export const COZYQUIZ_AVATARS: CozyQuizAvatar[] = [
  // ── Die acht Slot-Defaults ────────────────────────────────────────────────
  { slug: 'teapot',        label: 'Teekanne',      labelEn: 'Teapot',        group: 'food-drink' },
  { slug: 'mushroom',      label: 'Pilz',          labelEn: 'Mushroom',      group: 'nature' },
  { slug: 'rocket',        label: 'Rakete',        labelEn: 'Rocket',        group: 'adventure' },
  { slug: 'crystal-ball',  label: 'Kristallkugel', labelEn: 'Crystal Ball',  group: 'magic-curious' },
  { slug: 'game-die',      label: 'Würfel',        labelEn: 'Die',           group: 'games-hobbies' },
  { slug: 'table-lamp',    label: 'Lampe',         labelEn: 'Table Lamp',    group: 'cozy-home' },
  { slug: 'strawberry',    label: 'Erdbeere',      labelEn: 'Strawberry',    group: 'food-drink' },
  { slug: 'compass',       label: 'Kompass',       labelEn: 'Compass',       group: 'adventure' },

  // ── Essen & Trinken ───────────────────────────────────────────────────────
  { slug: 'croissant',     label: 'Croissant',     labelEn: 'Croissant',     group: 'food-drink' },
  { slug: 'cookie',        label: 'Keks',          labelEn: 'Cookie',        group: 'food-drink' },
  { slug: 'donut',         label: 'Donut',         labelEn: 'Donut',         group: 'food-drink' },
  { slug: 'popcorn',       label: 'Popcorn',       labelEn: 'Popcorn',       group: 'food-drink' },
  { slug: 'cheese',        label: 'Käse',          labelEn: 'Cheese',        group: 'food-drink' },
  { slug: 'lemonade',      label: 'Limonade',      labelEn: 'Lemonade',      group: 'food-drink' },

  // ── Zuhause ───────────────────────────────────────────────────────────────
  { slug: 'knitted-sock',  label: 'Wollsocke',     labelEn: 'Knitted Sock',  group: 'cozy-home' },
  { slug: 'cushion',       label: 'Kissen',        labelEn: 'Cushion',       group: 'cozy-home' },
  { slug: 'candle',        label: 'Kerze',         labelEn: 'Candle',        group: 'cozy-home' },
  { slug: 'alarm-clock',   label: 'Wecker',        labelEn: 'Alarm Clock',   group: 'cozy-home' },
  { slug: 'key',           label: 'Schlüssel',     labelEn: 'Key',           group: 'cozy-home' },
  { slug: 'houseplant',    label: 'Zimmerpflanze', labelEn: 'Houseplant',    group: 'cozy-home' },
  { slug: 'armchair',      label: 'Sessel',        labelEn: 'Armchair',      group: 'cozy-home' },

  // ── Natur ─────────────────────────────────────────────────────────────────
  { slug: 'daisy',         label: 'Gänseblümchen', labelEn: 'Daisy',         group: 'nature' },
  { slug: 'autumn-leaf',   label: 'Herbstblatt',   labelEn: 'Autumn Leaf',   group: 'nature' },
  { slug: 'acorn',         label: 'Eichel',        labelEn: 'Acorn',         group: 'nature' },
  { slug: 'cloud',         label: 'Wolke',         labelEn: 'Cloud',         group: 'nature' },
  { slug: 'sun',           label: 'Sonne',         labelEn: 'Sun',           group: 'nature' },
  { slug: 'seashell',      label: 'Muschel',       labelEn: 'Seashell',      group: 'nature' },
  { slug: 'snowflake',     label: 'Schneeflocke',  labelEn: 'Snowflake',     group: 'nature' },

  // ── Spiel & Hobby ─────────────────────────────────────────────────────────
  { slug: 'puzzle',        label: 'Puzzleteil',    labelEn: 'Puzzle Piece',  group: 'games-hobbies' },
  { slug: 'playing-card',  label: 'Spielkarte',    labelEn: 'Playing Card',  group: 'games-hobbies' },
  { slug: 'controller',    label: 'Controller',    labelEn: 'Controller',    group: 'games-hobbies' },
  { slug: 'book',          label: 'Buch',          labelEn: 'Book',          group: 'games-hobbies' },
  { slug: 'camera',        label: 'Kamera',        labelEn: 'Camera',        group: 'games-hobbies' },
  { slug: 'cassette',      label: 'Kassette',      labelEn: 'Cassette',      group: 'games-hobbies' },
  { slug: 'paint-palette', label: 'Farbpalette',   labelEn: 'Paint Palette', group: 'games-hobbies' },

  // ── Abenteuer ─────────────────────────────────────────────────────────────
  { slug: 'backpack',      label: 'Rucksack',      labelEn: 'Backpack',      group: 'adventure' },
  { slug: 'tent',          label: 'Zelt',          labelEn: 'Tent',          group: 'adventure' },
  { slug: 'binoculars',    label: 'Fernglas',      labelEn: 'Binoculars',    group: 'adventure' },
  { slug: 'paper-boat',    label: 'Papierboot',    labelEn: 'Paper Boat',    group: 'adventure' },
  { slug: 'hot-air-balloon', label: 'Heißluftballon', labelEn: 'Hot Air Balloon', group: 'adventure' },
  { slug: 'treasure-chest', label: 'Schatztruhe',  labelEn: 'Treasure Chest', group: 'adventure' },

  // ── Magisch & Kurios ──────────────────────────────────────────────────────
  { slug: 'wizard-hat',    label: 'Zauberhut',     labelEn: 'Wizard Hat',    group: 'magic-curious' },
  { slug: 'potion',        label: 'Zaubertrank',   labelEn: 'Potion',        group: 'magic-curious' },
  { slug: 'ringed-planet', label: 'Ringplanet',    labelEn: 'Ringed Planet', group: 'magic-curious' },
  { slug: 'star',          label: 'Stern',         labelEn: 'Star',          group: 'magic-curious' },
  { slug: 'light-bulb',    label: 'Glühbirne',     labelEn: 'Light Bulb',    group: 'magic-curious' },
  { slug: 'magnet',        label: 'Magnet',        labelEn: 'Magnet',        group: 'magic-curious' },
  { slug: 'disco-ball',    label: 'Discokugel',    labelEn: 'Disco Ball',    group: 'magic-curious' },
];

/** Alle Slugs (= Picker-Pool). */
export const COZYQUIZ_SLUGS: string[] = COZYQUIZ_AVATARS.map(a => a.slug);

/** Die acht Default-Slugs für die acht Farb-Slots (vor Spieler-Auswahl). */
export const COZYQUIZ_DEFAULTS: string[] = COZYQUIZ_SLUGS.slice(0, 8);

const SLUG_SET = new Set(COZYQUIZ_SLUGS);
const BY_SLUG = new Map(COZYQUIZ_AVATARS.map(a => [a.slug, a]));

/** Ist der String ein CozyQuiz-Objekt-Slug (vs. echtes Emoji / cozy3d / Wappen)? */
export function isCozyQuizSlug(s: string | undefined | null): s is string {
  return !!s && SLUG_SET.has(s);
}

/** Bildpfad zu einem Slug. */
export function cozyQuizSrc(slug: string): string {
  return `/avatars/cozyquiz/${slug}.png`;
}

/** Anzeige-Label, Fallback = Slug. */
export function cozyQuizLabel(slug: string, lang: 'de' | 'en' = 'de'): string {
  const a = BY_SLUG.get(slug);
  if (!a) return slug;
  return lang === 'en' ? a.labelEn : a.label;
}

/** Objekt zu einem Slug. */
export function cozyQuizBySlug(slug: string): CozyQuizAvatar | undefined {
  return BY_SLUG.get(slug);
}

// ── Optischer Ausgleich (erzeugt von scripts/measure-avatar-fill.mjs) ───────
// NICHT von Hand pflegen: neu erzeugen, wenn Motive dazukommen.
// FILL  = Anteil der Kachelkante, den das Motiv einnimmt (Groesse).
// NUDGE = Verschiebung in Prozent der Kachelkante (Sitz), nur fuer die
//         Motive, deren Schwerpunkt deutlich neben der Bounding-Box-Mitte
//         liegt. Begruendung und Messverfahren im Kopf des Skripts.
export const COZYQUIZ_FILL: Record<string, number> = {
  'acorn': 0.92,
  'alarm-clock': 0.92,
  'armchair': 0.82,
  'autumn-leaf': 0.92,
  'backpack': 0.85,
  'binoculars': 0.81,
  'book': 0.88,
  'camera': 0.81,
  'candle': 0.92,
  'cassette': 0.79,
  'cheese': 0.82,
  'cloud': 0.89,
  'compass': 0.92,
  'controller': 0.87,
  'cookie': 0.89,
  'croissant': 0.92,
  'crystal-ball': 0.86,
  'cushion': 0.72,
  'daisy': 0.92,
  'disco-ball': 0.80,
  'donut': 0.82,
  'game-die': 0.74,
  'hot-air-balloon': 0.92,
  'houseplant': 0.92,
  'key': 0.92,
  'knitted-sock': 0.92,
  'lemonade': 0.92,
  'light-bulb': 0.92,
  'magnet': 0.92,
  'mushroom': 0.88,
  'paint-palette': 0.91,
  'paper-boat': 0.92,
  'playing-card': 0.87,
  'popcorn': 0.92,
  'potion': 0.92,
  'puzzle': 0.92,
  'ringed-planet': 0.92,
  'rocket': 0.92,
  'seashell': 0.85,
  'snowflake': 0.92,
  'star': 0.92,
  'strawberry': 0.92,
  'sun': 0.92,
  'table-lamp': 0.92,
  'teapot': 0.90,
  'tent': 0.92,
  'treasure-chest': 0.80,
  'wizard-hat': 0.92,
};

export const COZYQUIZ_NUDGE: Record<string, [number, number]> = {
  'acorn': [4.2, -0.4],
  'backpack': [1.8, -1.4],
  'binoculars': [-2.3, -0.9],
  'book': [-3.5, 0.8],
  'candle': [-0.1, -3.7],
  'compass': [-0.9, -2.8],
  'cookie': [-3.9, 0.6],
  'croissant': [-1.8, 1.8],
  'crystal-ball': [4.2, -0.5],
  'hot-air-balloon': [-1.6, 3.8],
  'houseplant': [3.1, -3.0],
  'key': [-5.0, 1.2],
  'lemonade': [0.1, -2.0],
  'light-bulb': [-0.1, 2.5],
  'magnet': [3.0, 0.1],
  'paint-palette': [-3.2, -0.8],
  'paper-boat': [-0.8, -2.2],
  'playing-card': [3.8, -0.1],
  'potion': [-0.3, -2.5],
  'puzzle': [1.1, -1.8],
  'seashell': [-4.0, 0.3],
  'star': [-2.8, -1.2],
  'tent': [-0.6, -6.3],
  'wizard-hat': [-0.3, -4.0],
};
