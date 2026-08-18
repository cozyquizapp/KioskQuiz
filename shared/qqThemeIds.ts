// ─────────────────────────────────────────────────────────────────────────────
// Erlaubte Buehnen-Design-IDs (Skins) — EINE Quelle fuer Frontend und Backend.
//
// Warum diese Datei existiert (2026-08-18): der Handler `qq:setTheme` hatte seine
// eigene, handgepflegte Liste. Ein im Frontend registriertes Theme, das dort
// fehlte, wurde vom Server STILL auf 'cozy' zurueckgesetzt: kein Fehler, kein
// Log, der Knopf tat einfach nichts. Genau das Muster, das STRUKTUR_PLAN.md als
// R1 beschreibt (untypisierter Socket-Vertrag).
//
// Regel: neues Theme in `frontend/src/qqTheme.ts` (QQ_THEMES) UND hier eintragen.
// Der Test `tests/qqThemeIds.test.ts` schlaegt fehl, wenn beides auseinanderlaeuft.
// ─────────────────────────────────────────────────────────────────────────────

export const QQ_ALLOWED_THEME_IDS = [
  'cozy',       // Standard (Pink/Navy) — der heutige Look
  'cozyKino',   // wie cozy, aber Szenenwechsel blenden ineinander (Motion-Variante)
  'studioMono', // editorial, hell (Corporate)
  'softPop',    // warm, pastellig
  'neoBrutal',  // lila, knallig
  'quirks',     // In-Quiz-Theme der Cozy-Quirks-Sets
  'holz',       // warme Nussbaum-Buehne fuer das Holz-Avatarset
] as const;

export type QQThemeId = typeof QQ_ALLOWED_THEME_IDS[number];

export const QQ_DEFAULT_THEME_ID: QQThemeId = 'cozy';

/** Server-Gate: unbekannte IDs fallen auf den Default zurueck. */
export function coerceQQThemeId(id: unknown): QQThemeId {
  const s = String(id ?? '');
  return (QQ_ALLOWED_THEME_IDS as readonly string[]).includes(s) ? (s as QQThemeId) : QQ_DEFAULT_THEME_ID;
}
