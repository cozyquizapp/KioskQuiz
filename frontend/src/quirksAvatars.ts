// 2026-07-28 — Cozy Quirks: Wolfs animiertes, slot-gebundenes Avatar-Set.
//
// 8 Charaktere, EINER je Farb-Slot (Farbe ist ins Motiv gebacken → slot-gebunden
// wie Cozy Pack). Jeder Charakter hat DREI transparente Frames:
//   <color>-open.png   Ruhe (Augen offen)
//   <color>-closed.png Blink (Augen zu)
//   <color>-action.png individueller Quirk (wink/glance/waveblink/talk/squint)
// gebacken via scripts/quirks-avatars-bake.py (uniform 512², kein per-Frame-Trim
// → Overlays alignen pixelgenau).
//
// Render (QuirkAvatar in QQTeamAvatar): App rendert eine ECKIGE Team-Kachel
// (nicht die runde Disc), Charakter inset; open-Basis + closed/action als
// Opacity-Overlays + dezentes Breathe. Timings pro Avatar aus Wolfs
// animated-grid.html (fix → die 8 laufen desynchron, ruhig). reduced-motion aus.
//
// Slug wird im freien String-Feld `team.emoji` gespeichert (kein Backend-Schema-
// Change). isQuirkSlug() unterscheidet Quirk vs. Emoji/cozy3d/Wolf/Wappen.

/** Set-ID des Cozy-Quirks-Sets. Quirks sind slot-gebunden → wenn dieses Set aktiv
 *  ist, sind ALLE Avatare Quirks (eckige Kachel). Render-Stellen mit einem runden
 *  farbigen Wrapper/Ring nutzen `useAvatarSet() === QUIRK_SET_ID`, um die runde
 *  Umrandung fuer Quirks wegzulassen (Wolf 2026-07-28). */
export const QUIRK_SET_ID = 'cozyQuirks';

export type QuirkActionType = 'short' | 'hold' | 'talk';

export type QuirkAvatar = {
  slug: string;            // in team.emoji gespeichert, z.B. 'quirk-orange'
  color: string;           // Farb-Slug (Dateiname-Basis), z.B. 'orange'
  label: string;           // Anzeige-Label (DE)
  action: QuirkActionType; // Quirk-Bewegungstyp → Keyframe
  // Wolfs Timings (Sekunden). delay = Breathe-Phasenversatz.
  delay: number;
  blink: number;
  actionTime: number;
  actionDelay: number;
};

// Reihenfolge = QQ_AVATARS-Slots (0 orange … 7 rot). Timings 1:1 aus
// animated-grid.html. Der Render leitet den Charakter IMMER aus dem Farb-Slot ab
// (slot-gebunden), daher ist die Reihenfolge autoritativ.
export const QQ_QUIRKS: QuirkAvatar[] = [
  { slug: 'quirk-orange', color: 'orange', label: 'Orange',  action: 'short', delay: -1.4, blink: 8.3,  actionTime: 16.8, actionDelay: -2.2 },
  { slug: 'quirk-green',  color: 'green',  label: 'Grün',    action: 'hold',  delay: -3.8, blink: 10.7, actionTime: 19.6, actionDelay: -5.1 },
  { slug: 'quirk-teal',   color: 'teal',   label: 'Teal',    action: 'short', delay: -2.1, blink: 9.4,  actionTime: 17.9, actionDelay: -3.4 },
  { slug: 'quirk-violet', color: 'violet', label: 'Violett', action: 'talk',  delay: -4.7, blink: 11.6, actionTime: 21.3, actionDelay: -1.7 },
  { slug: 'quirk-yellow', color: 'yellow', label: 'Gelb',    action: 'short', delay: -0.8, blink: 7.8,  actionTime: 15.4, actionDelay: -6.3 },
  { slug: 'quirk-blue',   color: 'blue',   label: 'Blau',    action: 'hold',  delay: -3.1, blink: 10.1, actionTime: 18.7, actionDelay: -4.2 },
  { slug: 'quirk-pink',   color: 'pink',   label: 'Pink',    action: 'talk',  delay: -5.2, blink: 12.0, actionTime: 22.0, actionDelay: -2.8 },
  { slug: 'quirk-red',    color: 'red',    label: 'Rot',     action: 'hold',  delay: -2.9, blink: 8.9,  actionTime: 20.2, actionDelay: -7.2 },
];

/** Alle Slugs als String-Array (= Set-`avatars`, index-aligned zu QQ_AVATARS). */
export const QUIRK_SLUGS: string[] = QQ_QUIRKS.map(q => q.slug);

const BY_SLUG = new Map(QQ_QUIRKS.map(q => [q.slug, q]));

/** Ist der String ein Cozy-Quirks-Slug? */
export function isQuirkSlug(s: string | undefined | null): s is string {
  return !!s && BY_SLUG.has(s);
}

/** Voller Charakter-Datensatz (inkl. Timings) für einen Slug. */
export function quirkBySlug(slug: string): QuirkAvatar | undefined {
  return BY_SLUG.get(slug);
}

/** Slug des Charakters für einen Farb-Slot-Index (0..7). */
export function quirkSlugForSlot(slotIdx: number): string {
  return QQ_QUIRKS[Math.max(0, Math.min(QQ_QUIRKS.length - 1, slotIdx))].slug;
}

/** Anzeige-Label (Farb-Name) für einen Slug, Fallback = Slug. */
export function quirkLabel(slug: string): string {
  return BY_SLUG.get(slug)?.label ?? slug;
}

/** Pfade zu den 3 Frames. */
export function quirkOpenSrc(color: string): string   { return `/avatars/quirks/${color}-open.png`; }
export function quirkClosedSrc(color: string): string { return `/avatars/quirks/${color}-closed.png`; }
export function quirkActionSrc(color: string): string { return `/avatars/quirks/${color}-action.png`; }
