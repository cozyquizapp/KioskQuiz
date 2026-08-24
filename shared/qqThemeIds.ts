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
  'buehne',     // „CozyQuiz" — der Standard seit 2026-08-24 (Uebergabe 2a)
  'cozy',       // der alte Look (Pink/Navy)
  'cozyKino',   // wie cozy, aber Szenenwechsel blenden ineinander (Motion-Variante)
  'studioMono', // editorial, hell (Corporate)
  'softPop',    // warm, pastellig
  'neoBrutal',  // lila, knallig
] as const;

export type QQThemeId = typeof QQ_ALLOWED_THEME_IDS[number];

/**
 * 2026-08-24: das Buehnen-Design hiess bis heute 'quirks'. Der Name stammt vom
 * 29.07., als das Theme noch zu genau einem Avatar-Set gehoerte („Cozy Quirks
 * 2.0"). Inzwischen ist es der Standard des ganzen Produkts und heisst im
 * Moderator „CozyQuiz".
 *
 * Die alte Id bleibt als Umleitung stehen, sonst verlieren gespeicherte Raeume
 * ihr Design: `themeId` liegt auf Platte und in Mongo. Loeschen wuerde heissen,
 * dass ein Raum von letzter Woche beim Oeffnen auf Pink/Navy zurueckspringt.
 *
 * Warum die interne Id NICHT auch 'cozyquiz' heisst: so heisst bereits das
 * Avatar-Set. Zwei verschiedene Felder mit demselben Wert bedeuten, dass ein
 * verwechselter Vergleich zufaellig funktioniert statt aufzufallen - genau die
 * Fehlerklasse, die in diesem Repo schon mehrfach Zeit gekostet hat
 * (isThemed, isCozyLook, quirkSet). Sichtbarer Name und interner Bezeichner
 * duerfen auseinandergehen; ein stiller Treffer darf es nicht.
 */
const QQ_THEME_ID_ALIAS: Record<string, QQThemeId> = {
  quirks: 'buehne',
};

export const QQ_DEFAULT_THEME_ID: QQThemeId = 'buehne';

/** Server-Gate: alte IDs werden umgeleitet, unbekannte fallen auf den Default. */
export function coerceQQThemeId(id: unknown): QQThemeId {
  const s = String(id ?? '');
  if (QQ_THEME_ID_ALIAS[s]) return QQ_THEME_ID_ALIAS[s];
  return (QQ_ALLOWED_THEME_IDS as readonly string[]).includes(s) ? (s as QQThemeId) : QQ_DEFAULT_THEME_ID;
}
