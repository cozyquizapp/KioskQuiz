/**
 * Team-Ranking-Comparator: Standard-Sortierung fuer Sieger-Listen, Standings,
 * Treppchen, ScoreBar etc.
 *
 * Sortier-Regel (Wolf-Spec 2026-05-13):
 *   1. largestConnected DESC (meiste verbundene Felder gewinnt)
 *   2. totalCells DESC (Tiebreaker bei gleicher largestConnected)
 *   3. stable (JavaScript's sort behaelt insertion order bei equality)
 *
 * VORHER war an 8 Stellen im Code `(a, b) => b.largestConnected - a.largestConnected`
 * ohne Tiebreaker — bei tie konnte das Team mit weniger gesamt-Feldern gewinnen
 * (z.B. Live-Test: Wolfsrudel 12-verbunden/10-gesamt schlug Gluehbirnen
 * 12-verbunden/16-gesamt). Drift-Bug ueber 8 inline-Definitionen.
 *
 * Single-source-of-truth — bei Wolf-Spec-Aenderung nur HIER aendern. Generic
 * auf nur die 2 benoetigten Felder (statt voller QQTeam-Type) damit auch
 * SummaryTeam und andere Subset-Types passen.
 */
export function compareTeamsForRanking(
  a: { largestConnected: number; totalCells: number },
  b: { largestConnected: number; totalCells: number },
): number {
  if (b.largestConnected !== a.largestConnected) {
    return b.largestConnected - a.largestConnected;
  }
  if (b.totalCells !== a.totalCells) {
    return b.totalCells - a.totalCells;
  }
  return 0;
}
