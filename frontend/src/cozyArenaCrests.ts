// 2026-07-03 — CozyArena: Fraktions-Wappen (Wolf).
//
// 8 3D-Wappen (Schild + Farbe + Emblem komplett gebacken) unter
// /avatars/cozyarena/<slug>.png. Ersetzen im Groß-Modus (largeGroupMode) den
// cozy3d-Tier-Avatar als Fraktions-Identität. Anders als cozy3d haben die
// Wappen ihre eigene Schild-Form + Farbe → sie werden FLACH gerendert (keine
// Farb-Disc dahinter, siehe QQTeamAvatar CrestAvatar).
//
// Der Slug lebt — wie cozy3d — im freien String-Feld `team.emoji` bzw. als
// Set-Eintrag. isCrestSlug() unterscheidet Wappen von Emoji/cozy3d-Slug.

export type CozyArenaCrest = { slug: string; label: string };

// Reihenfolge = QQ_AVATARS-Slots (fox,frog,panda,rabbit,unicorn,raccoon,cow,cat)
// → Farb-Zuordnung passt 1:1 (Wolf 2026-07-03, per Bild-Messung verifiziert).
export const COZY_ARENA_CRESTS: CozyArenaCrest[] = [
  { slug: 'bauchgefuehl',  label: 'Bauchgefühl' },   // fox     — Orange, Spirale
  { slug: 'glueckstreffer', label: 'Glückstreffer' }, // frog    — Grün, Kleeblatt
  { slug: 'feierabend',    label: 'Feierabend' },     // panda   — Teal, Bierkrug
  { slug: 'letztesekunde', label: 'Letzte Sekunde' }, // rabbit  — Violett, Sanduhr
  { slug: 'allwissen',     label: 'Allwissen' },      // unicorn — Gelb, Lorbeer+Stern
  { slug: 'improvisation', label: 'Improvisation' },  // raccoon — Blau, Würfel
  { slug: 'einspruch',     label: 'Einspruch' },      // cow     — Pink, Hammer
  { slug: 'risiko',        label: 'Risiko' },         // cat     — Rot, Flamme
];

export const COZY_ARENA_CREST_SLUGS: string[] = COZY_ARENA_CRESTS.map(c => c.slug);

const CREST_SET = new Set(COZY_ARENA_CREST_SLUGS);
const CREST_LABEL = new Map(COZY_ARENA_CRESTS.map(c => [c.slug, c.label]));

export function isCrestSlug(s: string | undefined | null): s is string {
  return !!s && CREST_SET.has(s);
}

/** Pfad zum vollen Wappen-PNG (Schild + Emblem).
 *
 *  2026-08-27 (Wolf: „neue arena wappen passend zum neuen design"): cremefarbenes
 *  Schild mit farbigem Zeichen, im selben Knet-Look wie der Team-Avatarsatz V5.
 *  Loest die Kolosseum-Wappen vom 2026-07-17 ab (farbiges Schild mit Gold-Rahmen)
 *  - die stammten noch aus der Arena-Material-Sprache und standen im neuen
 *  Design allein.
 *
 *  ⚠️ Die Fraktionsfarbe steckt jetzt NICHT mehr im Wappen. Sie kommt von der
 *  Flaeche darunter, genau wie beim Avatarsatz V5. Wo ein Wappen ohne farbigen
 *  Grund steht, unterscheiden die Fraktionen sich nur noch am Zeichen.
 *
 *  Originale unveraendert unter `design-assets/arena-wappen-original/`, von dort
 *  in EINEM Schritt auf 512 px (Lanczos, PNG, RGBA) - dieselbe Regel wie beim
 *  Avatarsatz. */
export function crestSrc(slug: string): string {
  return `/avatars/cozyarena/${slug}-wappen.png`;
}

/** Pfad zum freigestellten Emblem-PNG (nur cremefarbenes Symbol, ohne Schild) —
 *  für flache/Grid-Kontexte, wo die Zelle/Disc bereits die Fraktions-Farbe trägt. */
export function crestEmblemSrc(slug: string): string {
  return `/avatars/cozyarena/${slug}-emblem.png`;
}

/** Anzeige-Label (Fraktions-Name) für einen Wappen-Slug, Fallback = Slug. */
export function crestLabel(slug: string): string {
  return CREST_LABEL.get(slug) ?? slug;
}
