// 2026-07-28 — Party 3D: Wolfs neutrale Party-Objekt-Avatare.
//
// 10 PNGs unter /avatars/party/<slug>.png (normalisiert via
// scripts/party-avatars-bake.py — nur trim+center, KEIN Tint). Render-Pfad
// exakt wie cozy3d: QQTeamAvatar / CountryFlagOrEmoji erkennen einen Party-Slug
// und rendern das neutrale Objekt auf der Slot-Farb-Disc. Team-Farbe kommt also
// von der Disc, das Objekt bleibt neutral → frei kombinierbar (10 Objekte × 8
// Farben), kein slot-binding.
//
// Wie bei cozy3d wird der Slug im freien String-Feld `team.emoji` gespeichert
// (kein Backend-Schema-Change). isPartySlug() unterscheidet Party-Objekt vs.
// echtes Emoji / cozy3d-Tier / Wappen.

export type PartyAvatar = { slug: string; label: string };

// Reihenfolge: die ersten 8 sind die Default-Belegung der 8 Farb-Slots
// (Discokugel/Sekt/Cocktail/Torte/Geschenk/Ballons/Konfetti/Wuerfel),
// danach die beiden Extra-Objekte (Partyhut, Mikrofon).
export const PARTY_AVATARS: PartyAvatar[] = [
  { slug: 'disco',     label: 'Discokugel' },
  { slug: 'champagne', label: 'Sekt' },
  { slug: 'martini',   label: 'Cocktail' },
  { slug: 'cake',      label: 'Torte' },
  { slug: 'gift',      label: 'Geschenk' },
  { slug: 'balloons',  label: 'Ballons' },
  { slug: 'popper',    label: 'Konfetti' },
  { slug: 'dice',      label: 'Würfel' },
  { slug: 'hat',       label: 'Partyhut' },
  { slug: 'mic',       label: 'Mikrofon' },
];

/** Alle Slugs als String-Array (= Picker-Pool + Set-`avatars`). */
export const PARTY_SLUGS: string[] = PARTY_AVATARS.map(a => a.slug);

/** Die 8 Default-Slugs für die 8 Farb-Slots (vor Spieler-Auswahl). */
export const PARTY_DEFAULTS: string[] = PARTY_SLUGS.slice(0, 8);

const SLUG_SET = new Set(PARTY_SLUGS);
const LABEL_BY_SLUG = new Map(PARTY_AVATARS.map(a => [a.slug, a.label]));

/** Ist der String ein Party-Objekt-Slug (vs. echtes Emoji / cozy3d / Wappen)? */
export function isPartySlug(s: string | undefined | null): s is string {
  return !!s && SLUG_SET.has(s);
}

/** Pfad zum Party-Objekt-PNG. */
export function partySrc(slug: string): string {
  return `/avatars/party/${slug}.png`;
}

/** Anzeige-Label (Objekt-Name) für einen Slug, Fallback = Slug selbst. */
export function partyLabel(slug: string): string {
  return LABEL_BY_SLUG.get(slug) ?? slug;
}
