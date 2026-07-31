// 2026-07-29 — Cozy Quirks 2.0: Wolfs zweites Quirk-Set, SLOT-GEBUNDEN.
//
// Modell (anders als das freie V2-cozyQuirks!): 8 Designs, jedes mit EINER fest
// ins Motiv gebackenen Teamfarbe → EINER je Farb-Slot (wie Cozy Pack/cozyWolves).
// Nur 2 Frames pro Design (base/blink), KEINE Action/Quirk-Geste.
//
// Assets: /avatars/quirks2/<id>-<state>.webp (512², transparent, Farbe gebacken).
//   id ∈ prisma|orbit|wink|split|duo|stack|ripple|quad  (Reihenfolge = Slot 0..7)
//   state ∈ open (base) | closed (blink)
//
// Render (QuirkAvatar in QQTeamAvatar, kind 'quirk'): ECKIGE Team-Kachel wie
// cozyQuirks, aber ohne action-Layer (actionSrc fehlt → Gate). Der Charakter wird
// IMMER aus dem Farb-Slot abgeleitet (slug im team.emoji = Design, matcht den Slot).
//
// Slug (team.emoji) = DESIGN, z.B. 'quirk2-prisma'. isQuirk2Slug() unterscheidet.

import { BLOCKZ_SET_ID } from './blockzAvatars';

/** Set-ID von Cozy Quirks 2.0. */
export const QUIRK2_SET_ID = 'cozyQuirks2';

/** True für die eckigen Kachel-Sets (cozyQuirks2, Blockz). Render-Stellen mit
 *  rundem Wrapper lassen dafür die runde Umrandung weg (Radius 18%).
 *
 *  2026-07-31: Blockz kam dazu. Die Funktion wird an 12 Stellen importiert,
 *  deshalb hier erweitert statt eine zweite Prüfung überall einzubauen. Wer ein
 *  weiteres Kachel-Set anlegt, ergänzt nur diese Zeile. */
export function isQuirkTileSet(setId: string | undefined | null): boolean {
  return setId === QUIRK2_SET_ID || setId === BLOCKZ_SET_ID;
}

export type Quirk2Design = {
  slug: string;    // in team.emoji gespeichert, z.B. 'quirk2-prisma'
  id: string;      // Datei-Basis, z.B. 'prisma'
  label: string;
  color: string;   // fest gebackene Teamfarbe (index-aligned zu QQ_AVATARS-Slots)
  blink: number;   // Blink-Periode (s), desynchron
  delay: number;   // Anim-Start-Offset (s)
};

// 8 Designs, Reihenfolge = Slot 0..7 (orange, green, teal, violet, yellow, blue,
// pink, red). Farbe fest je Design (Wolf-Lieferung quirk-editor-webapp-v1).
// Blink/Delay desynchron, damit die 8 Kacheln nicht im Gleichtakt blinzeln.
export const QQ_QUIRKS2: Quirk2Design[] = [
  { slug: 'quirk2-prisma', id: 'prisma', label: 'Prisma', color: '#F97316', blink: 8.4,  delay: -1.2 },
  { slug: 'quirk2-orbit',  id: 'orbit',  label: 'Orbit',  color: '#22C55E', blink: 10.6, delay: -3.7 },
  { slug: 'quirk2-wink',   id: 'wink',   label: 'Wink',   color: '#14B8A6', blink: 9.3,  delay: -2.1 },
  { slug: 'quirk2-split',  id: 'split',  label: 'Split',  color: '#A855F7', blink: 11.5, delay: -4.6 },
  { slug: 'quirk2-duo',    id: 'duo',    label: 'Duo',    color: '#FACC15', blink: 7.9,  delay: -0.7 },
  { slug: 'quirk2-stack',  id: 'stack',  label: 'Stack',  color: '#3B82F6', blink: 10.1, delay: -3.0 },
  { slug: 'quirk2-ripple', id: 'ripple', label: 'Ripple', color: '#EC4899', blink: 12.0, delay: -5.1 },
  { slug: 'quirk2-quad',   id: 'quad',   label: 'Quad',   color: '#EF4444', blink: 8.9,  delay: -2.8 },
];

/** Alle Slugs (= Set-`avatars`, Slot 0..7). */
export const QUIRK2_SLUGS: string[] = QQ_QUIRKS2.map(q => q.slug);

const BY_SLUG = new Map(QQ_QUIRKS2.map(q => [q.slug, q]));

/** Ist der String ein Quirks-2.0-Design-Slug? */
export function isQuirk2Slug(s: string | undefined | null): s is string {
  return !!s && BY_SLUG.has(s);
}

/** Design-Objekt zu einem Slug. */
export function quirk2BySlug(slug: string): Quirk2Design | undefined {
  return BY_SLUG.get(slug);
}

/** Anzeige-Label, Fallback = Slug. */
export function quirk2Label(slug: string): string {
  return BY_SLUG.get(slug)?.label ?? slug;
}

/** Slot-gebundener Design-Slug je Farb-Slot-Index (0..7). */
export function quirk2ForSlot(slotIdx: number): string {
  return QQ_QUIRKS2[Math.max(0, Math.min(QQ_QUIRKS2.length - 1, slotIdx))].slug;
}

/** Pfad zu einem Frame: (id, Zustand) → WebP. */
export function quirk2Src(id: string, state: 'open' | 'closed'): string {
  return `/avatars/quirks2/${id}-${state}.webp`;
}
