/**
 * qqDistanceScore — exakte Nachbildung der Backend-Wertung fuer die Distanz-
 * Kategorien (Schaetzchen, Schwarm/crowdEstimate) fuers Reveal-Frontend.
 *
 * ⚠️ MUSS `qqMegaEventScore` in backend/src/quarterQuiz/qqRooms.ts SPIEGELN:
 *   - pro Handy `nearScore(dist, rangeAbs * QQ_MEGA_DIST_K)` (100 am Ziel, linear
 *     runter auf 0 bei dist = K*range)
 *   - Fraktion = Summe der Handy-Punkte / Anzahl VERBUNDENER Handys der Fraktion
 *     (per-capita-Fairness: nicht-antwortende/tote Handys zaehlen im Nenner mit 0)
 *   - range = qqEstimateRangeAbs (= backend schaetzchenRangeAbs, logisch identisch)
 *
 * So matchen Reveal-Punkte + Sieger 1:1 das Standing (Wolf 2026-07-14). Das ALTE
 * Median-Modell (qqSwarm-Doc) ist fuer die Wertung ueberholt — qqSwarm bleibt nur
 * fuer die Zahlenstrahl-Positionen (Median-Tick pro Fraktion).
 *
 * Parser-Hinweis: Backend nutzt fuer SCHAETZCHEN `Number(replace)` und fuer
 * crowdEstimate `qqParseEstimate` — daher wird die Parse-Funktion reingereicht.
 */
import { qqEstimateRangeAbs, qqParseEstimate } from './qqSwarm';

// MUSS backend QQ_MEGA_DIST_K (qqRooms.ts) spiegeln.
export const QQ_MEGA_DIST_K = 3;

export function qqNearScore(dist: number, maxErr: number): number {
  return maxErr > 0 ? 100 * Math.max(0, 1 - dist / maxErr) : 0;
}

/** Backend-SCHAETZCHEN-Parser (qqRooms.ts): non-numerisch weg, erstes Komma → Punkt. */
export function qqSchaetzchenParse(text: string | null | undefined): number {
  return Number(String(text ?? '').replace(/[^0-9.,\-]/g, '').replace(',', '.'));
}

export { qqParseEstimate };

export interface QQDistFactionScore {
  avatarId: string;
  points: number;     // 0–100, Ø der Handy-Nähe-Punkte über VERBUNDENE Handys
  validCount: number; // # Handys mit gültigem Tipp (fuer „X/Y"-Anzeige)
  total: number;      // # verbundene Handys der Fraktion (Nenner)
}

interface MiniTeam { id: string; avatarId: string; connected?: boolean }
interface MiniAnswer { teamId: string; text: string }

/**
 * Exakte Fraktions-Punkte wie das Backend. `parseFn` = der zur Kategorie passende
 * Backend-Parser. Rueckgabe: Map avatarId → {points, validCount, total}.
 */
export function qqDistanceFactionScores(
  answers: MiniAnswer[],
  target: number,
  unit: string | undefined,
  teams: MiniTeam[],
  parseFn: (t: string) => number | null,
): Map<string, QQDistFactionScore> {
  const rangeAbs = qqEstimateRangeAbs(target, unit);
  const maxErr = rangeAbs * QQ_MEGA_DIST_K;
  const out = new Map<string, QQDistFactionScore>();
  const avatarOf = new Map<string, string>();

  // Nenner = verbundene Handys pro Fraktion.
  for (const t of teams) {
    avatarOf.set(t.id, t.avatarId);
    if (t.connected === false) continue;
    let g = out.get(t.avatarId);
    if (!g) { g = { avatarId: t.avatarId, points: 0, validCount: 0, total: 0 }; out.set(t.avatarId, g); }
    g.total++;
  }

  // Zaehler = Summe der Handy-Nähe-Punkte.
  const sumByAvatar = new Map<string, number>();
  for (const a of answers) {
    const av = avatarOf.get(a.teamId);
    const g = av ? out.get(av) : undefined;
    if (!g) continue; // Fraktion ohne verbundene Handys → ignorieren (Backend: score 0)
    const v = parseFn(a.text);
    if (v == null || !Number.isFinite(v)) continue;
    sumByAvatar.set(av!, (sumByAvatar.get(av!) ?? 0) + qqNearScore(Math.abs(v - target), maxErr));
    g.validCount++;
  }

  for (const g of out.values()) {
    const sum = sumByAvatar.get(g.avatarId) ?? 0;
    g.points = g.total > 0 ? sum / g.total : 0;
  }
  return out;
}
