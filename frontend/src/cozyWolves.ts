// 2026-07-19 — CozyWölfe: Wolfs illustriertes 8-Wolf-Avatar-Set (ein Wolf je
// Farb-Slot). Analog zu cozy3dAvatars.ts, aber ein FESTES 8er-Set (wie die
// CozyArena-Wappen) — die Wölfe sind bereits pro Slot eingefärbt (orange/grün/…),
// daher slot-gebunden, nicht frei mischbar.
//
// 16 PNGs unter /avatars/cozywolves/wolf-<farbe>[-blink].png (per Magenta-Chroma-
// Key aus Wolfs Rudel-Lieferung freigestellt). Render wie cozy3d: der Slug steht
// im freien String-Feld team.emoji; isCozyWolfSlug() erkennt ihn; ImageAvatar
// rendert das Wolf-PNG auf der Slot-Farb-Disc, mit 2-Frame-Blinzeln (open/blink).

import { QQ_COZY_WOLVES } from '../../shared/quarterQuizTypes';

export type CozyWolf = { slug: string; label: string; color: string };

// Reihenfolge = die 8 Farb-Slots (QQ_AVATARS-Index-aligned). Kanonische Quelle für
// Slug+Name ist QQ_COZY_WOLVES in shared/quarterQuizTypes (damit Backend-Bot-Fill
// und Frontend-Render dieselben Namen nutzen). `color` aus dem Slug abgeleitet,
// nur informativ (Slot-Farbe via QQ_AVATARS[i].color ist autoritativ).
export const COZY_WOLVES: CozyWolf[] = QQ_COZY_WOLVES.map(w => ({
  slug: w.slug,
  label: w.name,
  color: w.slug.replace('wolf-', ''),
}));

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
