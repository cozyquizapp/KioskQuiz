// 2026-07-28 — Cozy Quirks: Wolfs animiertes Avatar-Set, FREI kombinierbar.
//
// Modell (V2, Wolf-Matrix „80 Kombinationen"): 10 Quirk-DESIGNS × 8 Team-Farben
// = 80 frei kombinierbare Varianten. Die Farbe ist NICHT ins Design gebacken-
// slug-gebunden, sondern kommt vom Farb-Slot (wie cozy3d/Party) → Spieler wählt
// Design UND Farbe unabhängig. „Alle Formen bleiben unabhängig von der Teamfarbe."
//
// Assets: /avatars/quirks/<color>/<design>-<state>.webp (512², transparent).
//   color ∈ orange|green|teal|violet|yellow|blue|pink|red (= Slot-Farb-Token)
//   design ∈ flux|bento|trio|tilt|mono|scan|echo|shift|orbit|nook
//   state ∈ open (Ruhe) | closed (Blink) | action (individueller Quirk)
//
// Render (QuirkAvatar in QQTeamAvatar): ECKIGE Team-Kachel (nicht runde Disc);
// open-Basis + closed/action als Opacity-Overlays + dezentes Breathe. Timings pro
// Design (desynchron). reduced-motion aus.
//
// Slug (im freien Feld team.emoji) = DESIGN, z.B. 'quirk-flux'. isQuirkSlug()
// unterscheidet Quirk-Design vs. Emoji/cozy3d/Wolf/Wappen.

/** Set-ID des Cozy-Quirks-Sets. Render-Stellen mit rundem Wrapper nutzen
 *  `useAvatarSet() === QUIRK_SET_ID`, um die runde Umrandung wegzulassen. */
export const QUIRK_SET_ID = 'cozyQuirks';

export type QuirkActionType = 'short' | 'hold' | 'talk';

/** 8 Team-Farb-Tokens, index-aligned zu QQ_AVATARS (= Ordnernamen der WebP). */
export const QUIRK_COLOR_TOKENS = ['orange', 'green', 'teal', 'violet', 'yellow', 'blue', 'pink', 'red'] as const;

export type QuirkDesign = {
  slug: string;            // in team.emoji gespeichert, z.B. 'quirk-flux'
  design: string;          // Datei-Basis, z.B. 'flux'
  label: string;           // Anzeige-Label
  action: QuirkActionType; // Bewegungstyp des action-Frames → Keyframe
  // Timings (Sekunden) pro Design → die Designs laufen desynchron, ruhig.
  delay: number;
  blink: number;
  actionTime: number;
  actionDelay: number;
};

// 10 Designs (Wolf-Matrix-Reihenfolge). action-Typ aus dem Bewegungscharakter
// (split/wink → short, glance/squint → hold, talk/mouth → talk). Orbit & Nook
// (Cozy-Pass, wärmer) = short (kurzer Blick).
export const QQ_QUIRKS: QuirkDesign[] = [
  { slug: 'quirk-flux',  design: 'flux',  label: 'Flux',  action: 'short', delay: -1.4, blink: 8.3,  actionTime: 16.8, actionDelay: -2.2 },
  { slug: 'quirk-bento', design: 'bento', label: 'Bento', action: 'hold',  delay: -3.8, blink: 10.7, actionTime: 19.6, actionDelay: -5.1 },
  { slug: 'quirk-trio',  design: 'trio',  label: 'Trio',  action: 'short', delay: -2.1, blink: 9.4,  actionTime: 17.9, actionDelay: -3.4 },
  { slug: 'quirk-tilt',  design: 'tilt',  label: 'Tilt',  action: 'talk',  delay: -4.7, blink: 11.6, actionTime: 21.3, actionDelay: -1.7 },
  { slug: 'quirk-mono',  design: 'mono',  label: 'Mono',  action: 'short', delay: -0.8, blink: 7.8,  actionTime: 15.4, actionDelay: -6.3 },
  { slug: 'quirk-scan',  design: 'scan',  label: 'Scan',  action: 'hold',  delay: -3.1, blink: 10.1, actionTime: 18.7, actionDelay: -4.2 },
  { slug: 'quirk-echo',  design: 'echo',  label: 'Echo',  action: 'talk',  delay: -5.2, blink: 12.0, actionTime: 22.0, actionDelay: -2.8 },
  { slug: 'quirk-shift', design: 'shift', label: 'Shift', action: 'hold',  delay: -2.9, blink: 8.9,  actionTime: 20.2, actionDelay: -7.2 },
  { slug: 'quirk-orbit', design: 'orbit', label: 'Orbit', action: 'short', delay: -1.9, blink: 9.9,  actionTime: 16.1, actionDelay: -3.9 },
  { slug: 'quirk-nook',  design: 'nook',  label: 'Nook',  action: 'short', delay: -4.3, blink: 11.1, actionTime: 18.2, actionDelay: -5.6 },
];

/** Alle Design-Slugs (= Set-`avatars` + Picker-Pool). Die ersten 8 sind die
 *  Default-Belegung der 8 Farb-Slots (frei änderbar). */
export const QUIRK_SLUGS: string[] = QQ_QUIRKS.map(q => q.slug);

const BY_SLUG = new Map(QQ_QUIRKS.map(q => [q.slug, q]));

/** Ist der String ein Quirk-Design-Slug? */
export function isQuirkSlug(s: string | undefined | null): s is string {
  return !!s && BY_SLUG.has(s);
}

/** Voller Design-Datensatz (inkl. Timings) für einen Slug. */
export function quirkBySlug(slug: string): QuirkDesign | undefined {
  return BY_SLUG.get(slug);
}

/** Anzeige-Label für einen Design-Slug, Fallback = Slug. */
export function quirkLabel(slug: string): string {
  return BY_SLUG.get(slug)?.label ?? slug;
}

/** Farb-Token für einen Farb-Slot-Index (0..7) — bestimmt den WebP-Ordner. */
export function quirkColorForSlot(slotIdx: number): string {
  return QUIRK_COLOR_TOKENS[Math.max(0, Math.min(QUIRK_COLOR_TOKENS.length - 1, slotIdx))];
}

/** Default-Design-Slug je Slot (vor Auswahl): die ersten 8 Designs. */
export function quirkDefaultSlugForSlot(slotIdx: number): string {
  return QQ_QUIRKS[Math.max(0, Math.min(QQ_QUIRKS.length - 1, slotIdx))].slug;
}

/** Pfad zu einem Frame: (Farb-Token, Design, Zustand) → WebP. */
export function quirkSrc(color: string, design: string, state: 'open' | 'closed' | 'action'): string {
  return `/avatars/quirks/${color}/${design}-${state}.webp`;
}
