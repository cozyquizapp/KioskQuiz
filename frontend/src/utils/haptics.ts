// Haptik-Helper für die Team-Phone-View. Mappt Spiel-Events auf Vibration-
// Patterns, sodass das Phone physisch ans Geschehen am Beamer angekoppelt
// ist. Patterns sind bewusst kurz und „erkennbar" — der Spieler soll nach
// dem 2. Spiel wissen welche Vibration was bedeutet.
//
// API: navigator.vibrate akzeptiert number (ms) ODER number[] (alternierend
// Vibration/Pause). Beispiel [50, 30, 50] = 50ms Vibration, 30ms Pause,
// 50ms Vibration.
//
// Defensiv: Browser ohne `navigator.vibrate` (Desktop, iOS Safari) → silent
// no-op. Kein Throw, kein Console-Spam.

type Pattern = 'tap' | 'submit' | 'correct' | 'fastest' | 'wrong'
  | 'jokerEarned' | 'stolen' | 'placed' | 'win' | 'turn';

const PATTERNS: Record<Pattern, number | number[]> = {
  // Generic UI feedback — kurz, knapp
  tap:         20,
  submit:      40,

  // Antwort-Feedback
  correct:     [40, 30, 40],         // 2 short pulses (gut!)
  fastest:     [30, 30, 30, 30, 60], // 4 fast + 1 lang (Crescendo: schnellster)
  wrong:       60,                   // 1 dumpfer pulse (oof)

  // Game-Events (kraftvoller)
  jokerEarned: [80, 40, 120],        // 1 mittel, kurze Pause, 1 lang (Eureka)
  stolen:      [60, 50, 60],         // 2× kurz mit Lücke ("autsch — autsch")
  placed:      40,                   // 1× kurzer Klick beim Setzen

  // Du bist dran
  turn:        [50, 80, 50],         // ruhiger 2-Pulse („deine Runde")

  // Game-Over
  win:         [80, 60, 120, 60, 200], // ansteigend, langes Final = Triumph
};

/** Vibrates the device if supported. No-op on platforms without Vibration API. */
export function haptic(pattern: Pattern): void {
  try {
    if (typeof navigator === 'undefined') return;
    if (typeof navigator.vibrate !== 'function') return;
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // Some platforms throw if vibrate is called outside user gesture — silent ok.
  }
}

/** Direkter custom-pattern Zugriff für Spezialfälle. */
export function hapticPattern(p: number | number[]): void {
  try {
    if (typeof navigator === 'undefined') return;
    if (typeof navigator.vibrate !== 'function') return;
    navigator.vibrate(p);
  } catch {}
}
