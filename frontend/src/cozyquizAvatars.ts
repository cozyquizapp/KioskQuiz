// 2026-08-22 — CozyQuiz Avatar Set: Wolfs Objekt-Avatare zum Buehnen-Design 2a.
//
// 48 Motive unter /avatars/cozyquiz/. Seit 2026-08-25 der HD-Satz:
// 1024², RGBA, unveraendert so eingebaut, wie Wolf ihn geliefert hat — nicht
// getrimmt, nicht neu skaliert, nicht durch sharp gelaufen. Der Eigenschatten
// steckt im Alpha, deshalb setzt QQTeamAvatar auf diesen Satz KEINEN
// CSS-Schatten (`eigenerSchatten` in avatarSets.ts). Render-Pfad wie Party 3D:
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
  // 2026-08-27: der Wecker ist raus. In seinem Original war die Flaeche
  // INNERHALB des Tragegriffs nicht durchsichtig, sondern mit einem
  // eingebrannten Transparenz-Karo gefuellt (245/254 im Wechsel, Kachelbreite
  // ~24 px, alle mit Alpha 255) - auf jedem farbigen Grund ein heller Fleck.
  // Wolf hat die Waermflasche als Ersatz geliefert. Das Original liegt unter
  // `design-assets/avatare-v5-original/defekt/`, unberuehrt.
  { slug: 'hot-water-bottle', label: 'Wärmflasche', labelEn: 'Hot Water Bottle', group: 'cozy-home' },
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

/**
 * Altlasten: Slugs, die es nicht mehr gibt, aber noch irgendwo stehen.
 *
 * 2026-08-27. Der Slug wird im freien Feld `team.emoji` gespeichert - also im
 * `localStorage` jedes Handys, das ihn je gewaehlt hat, UND in der Raumdatei
 * unter `backend/.qq-rooms/`. Ein Slug einfach zu streichen genuegt deshalb
 * nicht: `isCozyQuizSlug` saehe ihn nicht mehr, der Zweig faellt auf „echtes
 * Emoji" durch, und auf der Buehne stuende dann woertlich `alarm-clock`.
 *
 * Die Weiche kostet nichts und faengt genau das ab. Alte Wecker-Teams sehen ab
 * sofort die Waermflasche. Im Picker taucht der alte Slug nicht auf, er steht
 * bewusst NICHT in COZYQUIZ_SLUGS.
 */
const ALTLASTEN: Record<string, string> = {
  'alarm-clock': 'hot-water-bottle',
};

/**
 * Motive, deren Bilddaten defekt sind (Stand 2026-08-27).
 *
 * Gefunden mit `node scripts/avatare-loecher.mjs`, jedes einzeln am Kontaktbogen
 * bestaetigt. Zwei Fehlerarten:
 *
 *   zu wenig Loch   deckendes Weiss, wo der Grund durchscheinen muesste
 *                   hot-air-balloon (zwischen den Seilen), houseplant
 *                   (zwischen Stiel und Blaettern), backpack (unter dem
 *                   Tragegriff), ringed-planet (zwischen Ring und Kugel)
 *   zu viel Loch    disco-ball: ZWOELF verstreute Loecher mitten im Ball
 *
 * ⚠️ Das ist KEINE Sperre. Die Motive stehen weiter im Picker - ob sie dort
 * bleiben, ist Wolfs Entscheidung, und er mag sie („schade ich finde den super
 * schoen"). Die Liste ist dafuer da, sie aus Flaechen herauszuhalten, auf denen
 * sie unaufgefordert und gross erscheinen wuerden, etwa der Ankommen-Folie.
 *
 * Sobald die neuen Exporte da sind (`docs/avatare-nachbestellung-2026-08-27.md`),
 * wird diese Liste leer.
 */
export const COZYQUIZ_DEFEKT: readonly string[] = [
  // 2026-08-27, zweite Runde. Wolf hat das Gaensebluemchen auf Pink gefunden:
  // aus fuenf Blaettern sind Stuecke HERAUSGEBISSEN. Bei der Wolke dasselbe,
  // oben rechts. Beide erst dann sichtbar, wenn sie auf einem gesaettigten
  // Grund stehen.
  //
  // ⚠️ Mein Werkzeug konnte das NICHT finden, und der Grund ist wichtig: die
  // Bisse beruehren den Aussenrand, sind also keine Innenloecher. Und ein
  // Messwert fuer „harte Kante" trennt auch nicht - nachgemessen liegen
  // Gaensebluemchen (60 %) und Wolke (57 %) UNTER dem Schnitt, weil der ganze
  // Satz freigestellt ist und jede Kante hart ist.
  //
  // Was stattdessen gilt, und das ist die eigentliche Erkenntnis: gefaehrdet
  // sind die HELLEN Motive. Ein weisses Objekt auf weissem Grund kann eine
  // Hintergrundentfernung nicht sauber trennen, also frisst sie mit. Dieselbe
  // Ursache wie bei der alten Discokugel. Das ist eine Beobachtungsliste, kein
  // Pruefwert - und die Kontrolle bleibt das Blatt auf Pink.
  // Beide am selben Abend neu ausgeleitet und wieder drin. Gegengeprueft auf
  // Teamrot und auf Weiss (`node scripts/avatare-auf-grund.mjs`): die
  // Blaetter des Gaensebluemchens sind vollstaendig, die Wolkenkante ist oben
  // rechts geschlossen. Die alten Dateien liegen unter
  // `design-assets/avatare-v5-original/defekt/`.
  //
  // 2026-08-27, erste Runde: Wolf hat alle fuenf neu ausgeleitet.
  // Gemessen mit `node scripts/avatare-loecher.mjs`, und die Lochzahlen passen
  // diesmal zu den Motiven statt zu Zufall:
  //   backpack 1 (unter dem Griff), hot-air-balloon 3 (die drei Zwischenraeume
  //   der vier Seile), disco-ball 1 (die Oese), ringed-planet 2 (die beiden
  //   Sicheln), houseplant 0. Keine deckende weisse Flaeche mehr.
  // Die alten Dateien liegen unberuehrt unter `avatare-v5-original/defekt/`.
];

/** Alle Slugs, deren Bild in Ordnung ist. */
export const COZYQUIZ_HEILE: string[] = COZYQUIZ_AVATARS
  .map(a => a.slug)
  .filter(slug => !COZYQUIZ_DEFEKT.includes(slug));

const SLUG_SET = new Set(COZYQUIZ_SLUGS);
const BY_SLUG = new Map(COZYQUIZ_AVATARS.map(a => [a.slug, a]));

/** Alter Slug -> heutiger Slug. Alles andere bleibt, wie es ist. */
export function heutigerSlug(s: string): string {
  return ALTLASTEN[s] ?? s;
}

/** Ist der String ein CozyQuiz-Objekt-Slug (vs. echtes Emoji / cozy3d / Wappen)? */
export function isCozyQuizSlug(s: string | undefined | null): s is string {
  return !!s && (SLUG_SET.has(s) || s in ALTLASTEN);
}

/**
 * Bildpfad zu einem Slug.
 *
 * 2026-08-25 (Wolf: „kannst hd satz komprimieren, solange die qualitaet so
 * bleibt"): ausgeliefert wird WebP, verlustfrei. Das ist woertlich zu nehmen -
 * gemessen ueber alle 48 Motive, auf dunklem und auf gesaettigtem Grund, bei
 * 828 px Anzeigegroesse: Abweichung 0 von 255. Kein einziges Pixel anders,
 * nur ein besser gepackter Behaelter. Spart 34 Prozent (31 MB auf 21 MB).
 *
 * Die PNG bleiben im selben Ordner liegen. Sie sind Wolfs Originallieferung
 * und die Grundlage, auf der die Mess-Skripte arbeiten
 * (measure-avatar-fill, pruef-avatar-ausrisse). Ausgeliefert wird davon nichts
 * mehr, es fragt sie niemand ab.
 *
 * Erzeugt mit `node scripts/avatare-packen.mjs --schreib`.
 */
/**
 * Der Pfad zum Avatarbild, grosse Fassung (640 px).
 *
 * 2026-08-26 (Avatarsatz V5). Bis heute stand hier `.webp`, und das war ein
 * Widerspruch zu Wolfs Asset-Regeln: „Nicht ueber JPEG, WebP oder ein anderes
 * verlustbehaftetes Format zwischenkonvertieren." Jetzt PNG, verlustfrei,
 * abgeleitet aus den Originalen mit `scripts/avatare-v5-ableiten.mjs`.
 *
 * 640 px, weil das der groesste Einsatzort verlangt: die Siegerkachel auf der
 * Danke-Folie steht bei `clamp(180px, 20cqw, 290px)`, und die Buehne wird als
 * festes 1760x990-Feld auf den Beamer hochskaliert - auf einem 4K-Projektor
 * sind das rund 630 echte Bildpunkte.
 */
export function cozyQuizSrc(slug: string): string {
  return `/avatars/cozyquiz/${heutigerSlug(slug)}.png`;
}

/**
 * Dasselbe Bild in klein (160 px). Fuer Stellen, an denen VIELE Avatare
 * gleichzeitig stehen.
 *
 * Der Grund ist gemessen: die Avatarwahl auf dem Handy zeigt alle 48 auf
 * einmal. In der grossen Fassung sind das 17,7 MB ueber ein Bar-WLAN, fuer
 * Kacheln von rund 72 Bildpunkten. In der kleinen sind es 1,3 MB. Vorher, als
 * WebP in voller Aufloesung, waren es 20,4 MB.
 *
 * ⚠️ Nicht fuer grosse Kacheln nehmen. Ab etwa 160 CSS-Punkten wird es weich,
 * und auf dem Beamer faellt das sofort auf.
 */
export function cozyQuizSrcKlein(slug: string): string {
  return `/avatars/cozyquiz/klein/${heutigerSlug(slug)}.png`;
}

/** Anzeige-Label, Fallback = Slug. */
export function cozyQuizLabel(slug: string, lang: 'de' | 'en' = 'de'): string {
  const a = BY_SLUG.get(heutigerSlug(slug));
  if (!a) return slug;
  return lang === 'en' ? a.labelEn : a.label;
}

/** Objekt zu einem Slug. */
export function cozyQuizBySlug(slug: string): CozyQuizAvatar | undefined {
  return BY_SLUG.get(heutigerSlug(slug));
}

// ── Optischer Ausgleich (erzeugt von scripts/measure-avatar-fill.mjs) ───────
// NICHT von Hand pflegen: neu erzeugen, wenn Motive dazukommen.
// FILL  = Anteil der Kachelkante, den das Motiv einnimmt (Groesse).
// NUDGE = Verschiebung in Prozent der Kachelkante (Sitz), nur fuer die
//         Motive, deren Schwerpunkt deutlich neben der Bounding-Box-Mitte
//         liegt. Begruendung und Messverfahren im Kopf des Skripts.
export const COZYQUIZ_FILL: Record<string, number> = {
  'acorn': 0.92,
  'armchair': 0.83,
  'autumn-leaf': 0.92,
  'backpack': 0.84,
  'binoculars': 0.81,
  'book': 0.87,
  'camera': 0.77,
  'candle': 0.92,
  'cassette': 0.80,
  'cheese': 0.82,
  'cloud': 0.92,
  'compass': 0.91,
  'controller': 0.89,
  'cookie': 0.77,
  'croissant': 0.90,
  'crystal-ball': 0.86,
  'cushion': 0.72,
  'daisy': 0.92,
  'disco-ball': 0.92,
  'donut': 0.78,
  'game-die': 0.75,
  'hot-air-balloon': 0.92,
  'hot-water-bottle': 0.92,
  'houseplant': 0.92,
  'key': 0.92,
  'knitted-sock': 0.92,
  'lemonade': 0.92,
  'light-bulb': 0.92,
  'magnet': 0.92,
  'mushroom': 0.87,
  'paint-palette': 0.83,
  'paper-boat': 0.92,
  'playing-card': 0.81,
  'popcorn': 0.92,
  'potion': 0.92,
  'puzzle': 0.85,
  'ringed-planet': 0.92,
  'rocket': 0.92,
  'seashell': 0.83,
  'snowflake': 0.92,
  'star': 0.91,
  'strawberry': 0.92,
  'sun': 0.92,
  'table-lamp': 0.92,
  'teapot': 0.92,
  'tent': 0.92,
  'treasure-chest': 0.80,
  'wizard-hat': 0.92,
};

export const COZYQUIZ_NUDGE: Record<string, [number, number]> = {
  'binoculars': [-2.5, -0.7],
  'candle': [-0.1, -3.9],
  'cloud': [0.1, -2.4],
  'compass': [-0.8, -2.6],
  'croissant': [2.8, 2.1],
  'disco-ball': [-0.9, -3.3],
  'hot-air-balloon': [0.1, 3.0],
  'hot-water-bottle': [-0.3, -2.0],
  'houseplant': [-0.4, -2.4],
  'knitted-sock': [-2.3, -1.2],
  'lemonade': [-0.1, -2.1],
  'light-bulb': [-0.1, 2.5],
  'paper-boat': [-0.1, -2.9],
  'potion': [-0.2, -3.0],
  'tent': [-0.8, -6.5],
  'wizard-hat': [-1.2, -4.2],
};
