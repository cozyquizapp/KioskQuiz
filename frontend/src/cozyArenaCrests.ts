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

/** Pfad zum vollen Wappen-PNG (Schild + Farbe + Emblem).
 *  2026-07-17 (Wolf): Kolosseum-Wappen (Gold-Rahmen, Glut-Rand, gemeisselter Stein)
 *  statt der alten glossy-Variante — passen zur Arena-Material-Sprache. Freigestellt
 *  aus `<slug> colloseum.png` (schwarzer BG) nach `<slug>-colosseum.png` (transparent,
 *  Glow erhalten). Alte glossy `<slug>.png` bleiben liegen (Rueckkehr = eine Zeile). */
export function crestSrc(slug: string): string {
  return `/avatars/cozyarena/${slug}-colosseum.png`;
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
