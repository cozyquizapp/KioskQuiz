/**
 * qqCrowdTop — Bündelung + Tafel-Berechnung für das „Top-Antworten"-Format
 * (Family Feud, Cozy Arena). GETEILT zwischen Backend (autoritative Wertung) und
 * Frontend (Reveal-Tafel) — EINE Quelle, damit Anzeige und Punkte nie divergieren.
 *
 * Antwort-Modell „Vorgegeben + Auto-Surface" (Wolf-Entscheid 2026-07-04):
 *  - Der Autor gibt erwartbare Antworten + Synonyme vor → per Fuzzy-Match
 *    (similarityScore ≥ 0.8, wie Top5/CHEESE) gebündelt.
 *  - Unmatched Abgaben werden nach normalisiertem String gruppiert; ein
 *    Auto-Cluster mit genug Stimmen (autoSurfaceMin) erscheint ebenfalls auf der
 *    Tafel. So punktet auch eine nicht vorgesehene Antwort, die viele tippen.
 *  - Board = Top-5 nach Stimmen. Podium-Punkte 5/4/3/2/1; JEDE weitere gültige
 *    Antwort (tafel-fähiger Bucket jenseits Top-5) noch 1 — analog „alle richtigen
 *    +1" der übrigen Arena-Kategorien (Wolf-Entscheid B + Verfeinerung 2026-07-04).
 */
import { normalizeText, similarityScore } from './textNormalization';
import type { QQBunteTueteCrowdTop } from './quarterQuizTypes';

export const QQ_CROWDTOP_BOARD_POINTS = [5, 4, 3, 2, 1];
export const QQ_CROWDTOP_BOARD_SIZE = 5;
/** Min. identische Stimmen, damit eine NICHT vorgegebene Antwort auf die Tafel darf. */
export const QQ_CROWDTOP_AUTOSURFACE_MIN = 3;
const MATCH_THRESHOLD = 0.8;

export interface QQCrowdTopSubmission { teamId: string; text: string; submittedAt?: number }

export interface QQCrowdTopSlot {
  label: string;         // Anzeige auf der Tafel
  count: number;         // Stimmen
  teamIds: string[];     // Teams/Handys die hier landeten
  points: number;        // Board-Rang-Punkte (5/4/3/2/1), 0 jenseits der Tafel
  rank: number;          // 0-basierter Board-Rang
  autoSurfaced: boolean; // true = nicht vorgegeben, per Auto-Surface aufgetaucht
  seedIndex: number | null; // Index in def.answers, oder null (auto-surfaced)
}

export interface QQCrowdTopBoard {
  slots: QQCrowdTopSlot[];                     // Top-Slots (bis boardSize), nach Stimmen
  otherCount: number;                          // Stimmen die NICHT auf der Tafel sind
  otherTeamIds: string[];                       // Teams ohne Tafel-Platz
  boardPointsByTeam: Record<string, number>;    // teamId → Board-Punkte (0 wenn off-board)
  totalVotes: number;
}

interface Bucket {
  label: string;
  count: number;
  teamIds: string[];
  autoSurfaced: boolean;
  seedIndex: number | null;
  order: number; // deterministischer Tiebreak (kleiner = bevorzugt)
}

export function qqCrowdTopBoard(
  submissions: QQCrowdTopSubmission[],
  def: QQBunteTueteCrowdTop | undefined,
  opts?: { lang?: 'de' | 'en'; boardSize?: number; autoSurfaceMin?: number },
): QQCrowdTopBoard {
  const lang = opts?.lang ?? 'de';
  const boardSize = opts?.boardSize ?? QQ_CROWDTOP_BOARD_SIZE;
  const autoSurfaceMin = opts?.autoSurfaceMin ?? QQ_CROWDTOP_AUTOSURFACE_MIN;
  const answers = def?.answers ?? [];

  // Kandidaten-Strings pro vorgegebener Antwort (label + EN + Aliase).
  const candidates: string[][] = answers.map(a => {
    const list: string[] = [];
    if (a.label) list.push(a.label);
    if (a.labelEn) list.push(a.labelEn);
    if (a.aliases) list.push(...a.aliases);
    if (a.aliasesEn) list.push(...a.aliasesEn);
    return list.map(s => s.trim()).filter(Boolean);
  });

  const seedBuckets: Bucket[] = answers.map((a, i) => ({
    label: (lang === 'en' && a.labelEn ? a.labelEn : a.label) || a.label || '',
    count: 0, teamIds: [], autoSurfaced: false, seedIndex: i, order: i,
  }));

  const autoMap = new Map<string, Bucket>();
  let totalVotes = 0;

  submissions.forEach((sub, subIdx) => {
    const raw = (sub.text ?? '').trim();
    const norm = normalizeText(raw);
    if (norm.length < 1) return;
    totalVotes++;
    // Bester vorgegebener Match (höchste Similarity über alle Antworten/Kandidaten).
    let bestI = -1, bestScore = 0;
    for (let i = 0; i < candidates.length; i++) {
      for (const c of candidates[i]) {
        const s = similarityScore(raw, c);
        if (s > bestScore) { bestScore = s; bestI = i; }
      }
    }
    if (bestI >= 0 && bestScore >= MATCH_THRESHOLD) {
      const b = seedBuckets[bestI];
      b.count++; b.teamIds.push(sub.teamId);
    } else {
      let b = autoMap.get(norm);
      if (!b) { b = { label: raw, count: 0, teamIds: [], autoSurfaced: true, seedIndex: null, order: 1000 + subIdx }; autoMap.set(norm, b); }
      b.count++; b.teamIds.push(sub.teamId);
    }
  });

  // Tafel-fähig: vorgegebene mit Stimmen>0 + Auto-Cluster ab autoSurfaceMin.
  const eligible: Bucket[] = [
    ...seedBuckets.filter(b => b.count > 0),
    ...[...autoMap.values()].filter(b => b.count >= autoSurfaceMin),
  ];
  // Nach Stimmen absteigend; Tiebreak nach order (vorgegeben vor auto, stabil).
  eligible.sort((a, b) => (b.count - a.count) || (a.order - b.order));

  // Punkte (Wolf 2026-07-04): Podium 5/4/3/2/1 (sichtbare Tafel), und JEDE
  // weitere GÜLTIGE Antwort (tafel-fähiger Bucket jenseits Top-5) noch 1 — analog
  // „alle richtigen +1" der übrigen Arena-Kategorien. Nicht-fähig = 0 (unmatched
  // Einzeltipps / Auto-Cluster unter der Schwelle).
  const pointsForRank = (rank: number) =>
    rank < QQ_CROWDTOP_BOARD_POINTS.length ? QQ_CROWDTOP_BOARD_POINTS[rank] : 1;
  const boardPointsByTeam: Record<string, number> = {};
  eligible.forEach((b, rank) => {
    const pts = pointsForRank(rank);
    for (const tid of b.teamIds) boardPointsByTeam[tid] = pts;
  });

  const boardBuckets = eligible.slice(0, boardSize);
  const boardTeamIds = new Set<string>();
  const slots: QQCrowdTopSlot[] = boardBuckets.map((b, rank) => {
    for (const tid of b.teamIds) boardTeamIds.add(tid);
    return { label: b.label, count: b.count, teamIds: b.teamIds, points: pointsForRank(rank), rank, autoSurfaced: b.autoSurfaced, seedIndex: b.seedIndex };
  });

  const boardVotes = boardBuckets.reduce((s, b) => s + b.count, 0);
  const otherTeamIds: string[] = [];
  for (const sub of submissions) {
    if (normalizeText((sub.text ?? '').trim()).length < 1) continue;
    if (!boardTeamIds.has(sub.teamId)) otherTeamIds.push(sub.teamId);
  }

  return { slots, otherCount: totalVotes - boardVotes, otherTeamIds, boardPointsByTeam, totalVotes };
}
