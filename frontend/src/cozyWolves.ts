// 2026-07-19 — CozyWölfe: Wolfs illustriertes 8-Wolf-Avatar-Set (ein Wolf je
// Farb-Slot). Analog zu cozy3dAvatars.ts, aber ein FESTES 8er-Set (wie die
// CozyArena-Wappen) — die Wölfe sind bereits pro Slot eingefärbt (orange/grün/…),
// daher slot-gebunden, nicht frei mischbar.
//
// 16 PNGs unter /avatars/cozywolves/wolf-<farbe>[-blink].png (per Magenta-Chroma-
// Key aus Wolfs Rudel-Lieferung freigestellt). Render wie cozy3d: der Slug steht
// im freien String-Feld team.emoji; isCozyWolfSlug() erkennt ihn; ImageAvatar
// rendert das Wolf-PNG auf der Slot-Farb-Disc, mit 2-Frame-Blinzeln (open/blink).

export type CozyWolf = { slug: string; label: string; color: string };

// Reihenfolge = die 8 Farb-Slots (slot01..slot08 aus der Lieferung). Namen = Wolfs
// Wolf-Namen aus den Reference-Crops. `color` nur informativ (Slot-Farbe autoritativ).
export const COZY_WOLVES: CozyWolf[] = [
  { slug: 'wolf-orange', label: 'Mika',  color: 'orange' },
  { slug: 'wolf-green',  label: 'Nuri',  color: 'green'  },
  { slug: 'wolf-teal',   label: 'Ari',   color: 'teal'   },
  { slug: 'wolf-violet', label: 'Ylva',  color: 'violet' },
  { slug: 'wolf-yellow', label: 'Jori',  color: 'yellow' },
  { slug: 'wolf-blue',   label: 'Levin', color: 'blue'   },
  { slug: 'wolf-pink',   label: 'Maja',  color: 'pink'   },
  { slug: 'wolf-red',    label: 'Rurik', color: 'red'    },
];

/** Alle Slugs (= die 8 Set-`avatars`, in Slot-Reihenfolge). */
export const COZY_WOLF_SLUGS: string[] = COZY_WOLVES.map(w => w.slug);

const SLUG_SET = new Set(COZY_WOLF_SLUGS);
const LABEL_BY_SLUG = new Map(COZY_WOLVES.map(w => [w.slug, w.label]));

/** Ist der String ein CozyWolf-Slug (vs. Emoji / cozy3d / Wappen)? */
export function isCozyWolfSlug(s: string | undefined | null): s is string {
  return !!s && SLUG_SET.has(s);
}

/** Pfad zum offenen (Ruhe-)Frame. */
export function cozyWolfSrc(slug: string): string {
  return `/avatars/cozywolves/${slug}.png`;
}

/** Pfad zum Blink-Frame (geschlossene Augen). */
export function cozyWolfBlinkSrc(slug: string): string {
  return `/avatars/cozywolves/${slug}-blink.png`;
}

/** Anzeige-Label (Wolf-Name), Fallback = Slug. */
export function cozyWolfLabel(slug: string): string {
  return LABEL_BY_SLUG.get(slug) ?? slug;
}
