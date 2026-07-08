/**
 * qqFinalScore — Single-Source-of-Truth für den FINALEN Gesamt-Score am Spielende.
 *
 * 2026-07-09 (Wolf-Livetest 'Handy und Beamer zeigen unterschiedliche Sieger!'):
 * Drift-Bug. Der Beamer-Finale rankte nach `largestConnected + Final-Wetten-Bonus
 * + Award-Punkte`, die Handy-GameOverCard nur nach `largestConnected` (compare-
 * TeamsForRanking). → verschiedene Sieger auf den zwei Geräten.
 *
 * Ab jetzt berechnen BEIDE Seiten den Sieger über diese Helfer. Bei Spec-Änderung
 * am Endscore NUR HIER anfassen.
 *
 * Wichtig: compareTeamsForRanking (qqTeamRanking.ts) bleibt für IN-GAME-Standings/
 * ScoreBar (dort gibt es noch keine Wetten/Awards). Diese Helfer sind NUR fürs
 * Spielende (GameOver / Finale-Reveal), wo finalBetResolution + endAwards vorliegen.
 */
import type { QQStateUpdate, QQTeam } from '../../../shared/quarterQuizTypes';

/** Award-Punkte pro Team am Spielende: Underdog +2, Meisterklauer +1, Speedy +1. */
export function qqAwardPoints(s: QQStateUpdate): Record<string, number> {
  const awards = s.endAwards;
  const pts: Record<string, number> = {};
  for (const t of s.teams) pts[t.id] = 0;
  if (awards?.underdog) pts[awards.underdog] = (pts[awards.underdog] ?? 0) + 2;
  if (awards?.meisterklauer) pts[awards.meisterklauer] = (pts[awards.meisterklauer] ?? 0) + 1;
  if (awards?.speedy) pts[awards.speedy] = (pts[awards.speedy] ?? 0) + 1;
  return pts;
}

/**
 * Finaler Gesamt-Score eines Teams = largestConnected + Final-Wetten-Bonus +
 * Award-Punkte. `awardPts` optional zum Wiederverwenden (Perf).
 */
export function qqFinalTotal(s: QQStateUpdate, teamId: string, awardPts?: Record<string, number>): number {
  const t = s.teams.find(x => x.id === teamId);
  if (!t) return 0;
  const ap = awardPts ?? qqAwardPoints(s);
  return (t.largestConnected ?? 0)
    + (s.finalBetResolution?.[teamId]?.totalBonus ?? 0)
    + (ap[teamId] ?? 0);
}

/** Teams nach finalem Gesamt-Score sortiert (Sieger zuerst). Tiebreak: totalCells DESC. */
export function qqFinalSortedTeams(s: QQStateUpdate): QQTeam[] {
  const ap = qqAwardPoints(s);
  return [...s.teams].sort((a, b) => {
    const ta = qqFinalTotal(s, a.id, ap);
    const tb = qqFinalTotal(s, b.id, ap);
    if (tb !== ta) return tb - ta;
    return (b.totalCells ?? 0) - (a.totalCells ?? 0);
  });
}
