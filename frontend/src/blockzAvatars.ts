// 2026-07-31 — Blockz: Wolfs Kachel-Set, SLOT-GEBUNDEN.
//
// Modell wie cozyQuirks2: 8 Designs, jedes mit EINER fest ins Motiv gebackenen
// Teamfarbe → EINER je Farb-Slot (wie Cozy Pack/cozyWolves). 2 Frames pro
// Design (base/mid), KEINE Action-Geste.
//
// Jedes Design hat einen eigenen SCHNITT (glatt, Diagonale, Oval, Dreiteilung,
// Mittelnaht, Bänder, Schärpe, Viertelung). Das ist kein Zierrat: auf Beamer-
// Distanz, bei schwachem Projektor-Gamma oder bei rot-grün-Schwäche trägt die
// Farbe allein nicht, die Silhouette schon. Beim Nachliefern neuer Designs
// deshalb die Formen unterscheidbar halten, nicht nur die Farben.
//
// Assets: /avatars/blockz/<id>-<state>.webp (512², transparent, Farbe gebacken).
//   id ∈ solo|slash|oval|trio|seam|bands|sash|tetra  (Reihenfolge = Slot 0..7)
//   state ∈ base | peak
//
// `peak` ist der HÖHEPUNKT der Signature-Geste, kein Blinzeln. Deshalb rendert
// QuirkAvatar Blockz mit `pose: true`: weich einblenden, kurz halten, weich
// ausblenden (qqQuirkPose), statt des 180-ms-Blinzelns der Quirks 2.0.
//
// Gebaked mit `node scripts/bake-blockz.mjs` aus Wolfs transparenten PNG-Quellen.
// ⚠️ NICHT aus den `final/*.webm` daneben: das sind Videos ohne Alphakanal
// (schwarzer Hintergrund eingebacken, Eckpixel #000000 bei allen acht).
//
// Render (QuirkAvatar in QQTeamAvatar, kind 'quirk'): eckige Team-Kachel ohne
// action-Layer. Der Charakter wird IMMER aus dem Farb-Slot abgeleitet.
//
// Slug (team.emoji) = DESIGN, z.B. 'blockz-solo'. isBlockzSlug() unterscheidet.

/** Set-ID von Blockz. */
export const BLOCKZ_SET_ID = 'blockz';

export type BlockzDesign = {
  slug: string;    // in team.emoji gespeichert, z.B. 'blockz-solo'
  id: string;      // Datei-Basis, z.B. 'solo'
  label: string;   // sprachneutral (DE+EN gleich), daher keine Farbnamen
  color: string;   // fest gebackene Teamfarbe (index-aligned zu QQ_AVATARS-Slots)
  blink: number;   // Periode der Signature-Geste (s), desynchron
  delay: number;   // Anim-Start-Offset (s)
};

// 8 Designs, Reihenfolge = Slot 0..7 (orange, green, teal, violet, yellow, blue,
// pink, red). Labels sind sprachneutral gewählt, weil die UI zweisprachig ist
// und Farbnamen sonst übersetzt werden müssten.
// Blink/Delay desynchron, damit die 8 Kacheln nicht im Gleichtakt wechseln.
export const QQ_BLOCKZ: BlockzDesign[] = [
  { slug: 'blockz-solo',  id: 'solo',  label: 'Solo',  color: '#F97316', blink: 9.1,  delay: -0.9 },
  { slug: 'blockz-slash', id: 'slash', label: 'Slash', color: '#22C55E', blink: 11.2, delay: -4.1 },
  { slug: 'blockz-oval',  id: 'oval',  label: 'Oval',  color: '#14B8A6', blink: 8.6,  delay: -2.5 },
  { slug: 'blockz-trio',  id: 'trio',  label: 'Trio',  color: '#A855F7', blink: 12.4, delay: -5.3 },
  { slug: 'blockz-seam',  id: 'seam',  label: 'Seam',  color: '#FACC15', blink: 7.7,  delay: -1.6 },
  { slug: 'blockz-bands', id: 'bands', label: 'Bands', color: '#3B82F6', blink: 10.3, delay: -3.4 },
  { slug: 'blockz-sash',  id: 'sash',  label: 'Sash',  color: '#EC4899', blink: 9.8,  delay: -0.3 },
  { slug: 'blockz-tetra', id: 'tetra', label: 'Tetra', color: '#EF4444', blink: 11.7, delay: -2.2 },
];

/** Alle Slugs (= Set-`avatars`, Slot 0..7). */
export const BLOCKZ_SLUGS: string[] = QQ_BLOCKZ.map(b => b.slug);

const BY_SLUG = new Map(QQ_BLOCKZ.map(b => [b.slug, b]));

/** Ist der String ein Blockz-Design-Slug? */
export function isBlockzSlug(s: string | undefined | null): s is string {
  return !!s && BY_SLUG.has(s);
}

/** Design-Objekt zu einem Slug. */
export function blockzBySlug(slug: string): BlockzDesign | undefined {
  return BY_SLUG.get(slug);
}

/** Anzeige-Label, Fallback = Slug. */
export function blockzLabel(slug: string): string {
  return BY_SLUG.get(slug)?.label ?? slug;
}

/** Slot-gebundener Design-Slug je Farb-Slot-Index (0..7). */
export function blockzForSlot(slotIdx: number): string {
  return QQ_BLOCKZ[Math.max(0, Math.min(QQ_BLOCKZ.length - 1, slotIdx))].slug;
}

/** Pfad zu einem Frame: (id, Zustand) → WebP. */
export function blockzSrc(id: string, state: 'base' | 'peak'): string {
  return `/avatars/blockz/${id}-${state}.webp`;
}
