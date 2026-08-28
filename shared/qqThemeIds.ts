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

/**
 * Welcher Avatar-Satz gilt, wenn der Raum keinen gesetzt hat?
 *
 * 2026-08-28. Dieselbe Falle wie beim Design, eine Zeile weiter: die
 * Raumanlage setzt 'cozyquiz' (qqRooms.ts), die beiden Broadcast-Bauer fielen
 * auf 'all' zurueck - den gewuerfelten Emoji-Mix. Ein gespeicherter Raum ohne
 * das Feld hat also einen Satz gezeigt, den niemand gewaehlt hat.
 *
 * ⚠️ Und die Vorgabe haengt am FORMAT, nicht nur am Raum. Wolf 2026-08-28:
 * „bei den emojis sollst du aber keine cozyquiz nehmen, crowdquiz hat
 * spezifische emojis neu fuer die fraktionen die auch fest sind in namen und
 * farbe". Genau so ist es gebaut: die acht CrowdQuiz-Wappen
 * (frontend/src/cozyArenaCrests.ts) sind an die acht Farb-Slots gebunden,
 * Bauchgefuehl ist orange, Risiko ist rot, das ist keine freie Kombination.
 * Der CozyQuiz-Satz dagegen ist frei kombinierbar. Wer beide Formate auf
 * denselben Satz stellt, nimmt CrowdQuiz seine Fraktionen weg.
 *
 * Dieselbe Zuordnung trifft der Wizard bei der Formatwahl (QQSetupFlow); hier
 * steht sie fuer den Fall, dass gar nichts gesetzt ist.
 */
export function qqDefaultAvatarSetId(grossformat: boolean | undefined): string {
  return grossformat ? 'cozyArena' : 'cozyquiz';
}

/** Server-Gate: alte IDs werden umgeleitet, unbekannte fallen auf den Default. */
export function coerceQQThemeId(id: unknown): QQThemeId {
  const s = String(id ?? '');
  if (QQ_THEME_ID_ALIAS[s]) return QQ_THEME_ID_ALIAS[s];
  return (QQ_ALLOWED_THEME_IDS as readonly string[]).includes(s) ? (s as QQThemeId) : QQ_DEFAULT_THEME_ID;
}
