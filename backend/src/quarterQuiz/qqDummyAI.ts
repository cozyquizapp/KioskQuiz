// ── Quarter Quiz — Dummy AI ────────────────────────────────────────────────
// Evaluiert mögliche Aktionen durch Simulation auf einem geklonten Grid.
// Score = (eigenes largest cluster) - (max gegner-largest), + kleiner Total-Tiebreak.
// Wählt mit 80% die beste Aktion, mit 20% zufällig aus den Top-3 —
// "meistens logisch, nicht optimal".

import { QQGrid, QQCell } from '../../../shared/quarterQuizTypes';
import { computeTerritories } from './qqBfs';

export type DummyActionKind = 'PLACE' | 'STEAL' | 'SHIELD' | 'STAPEL' | 'SWAP' | 'SANDUHR';

export interface DummyActionChoice {
  kind: DummyActionKind;
  target?: { row: number; col: number };       // PLACE/STEAL/SANDUHR/STAPEL
  ownTarget?: { row: number; col: number };    // SWAP step 1
  enemyTarget?: { row: number; col: number };  // SWAP step 2
  score: number;
}

export interface DummyEnumerateOpts {
  availableKinds: DummyActionKind[];
  phase: number;
  shieldsUsed?: number;
  // Beschränkt STEAL/COMEBACK auf bestimmte Zielzellen (z.B. nur Leader-Team)
  stealFilter?: (cell: QQCell, row: number, col: number) => boolean;
}

function cloneGrid(grid: QQGrid): QQGrid {
  return grid.map(row => row.map(cell => ({ ...cell })));
}

/** Score = own.largest - max(opp.largest), mit kleinem own.total-Tiebreak. */
function scoreFor(grid: QQGrid, gridSize: number, teamId: string): number {
  const territories = computeTerritories(grid, gridSize);
  const own = territories[teamId] ?? { total: 0, largest: 0 };
  let maxOpp = 0;
  for (const [id, t] of Object.entries(territories)) {
    if (id === teamId) continue;
    if (t.largest > maxOpp) maxOpp = t.largest;
  }
  return (own.largest - maxOpp) + own.total * 0.05;
}

function enumerateActions(
  grid: QQGrid,
  gridSize: number,
  teamId: string,
  opts: DummyEnumerateOpts,
): DummyActionChoice[] {
  const baseline = scoreFor(grid, gridSize, teamId);
  const choices: DummyActionChoice[] = [];
  const kinds = opts.availableKinds;

  const empty: Array<{ row: number; col: number }> = [];
  const ownCells: Array<{ row: number; col: number }> = [];
  const ownStapable: Array<{ row: number; col: number }> = [];
  const oppSteal: Array<{ row: number; col: number }> = [];
  const oppBombable: Array<{ row: number; col: number }> = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = grid[r][c];
      if (cell.ownerId === null) {
        empty.push({ row: r, col: c });
      } else if (cell.ownerId === teamId) {
        ownCells.push({ row: r, col: c });
        if (!cell.stuck) ownStapable.push({ row: r, col: c });
      } else {
        if (!cell.frozen && !cell.stuck && !cell.shielded) oppSteal.push({ row: r, col: c });
        if (!cell.stuck && !cell.shielded) oppBombable.push({ row: r, col: c });
      }
    }
  }

  const stealPool = opts.stealFilter
    ? oppSteal.filter(cc => opts.stealFilter!(grid[cc.row][cc.col], cc.row, cc.col))
    : oppSteal;

  if (kinds.includes('PLACE')) {
    for (const t of empty) {
      const g = cloneGrid(grid);
      g[t.row][t.col].ownerId = teamId;
      choices.push({ kind: 'PLACE', target: t, score: scoreFor(g, gridSize, teamId) - baseline });
    }
  }

  if (kinds.includes('STEAL')) {
    for (const t of stealPool) {
      const g = cloneGrid(grid);
      g[t.row][t.col].ownerId = teamId;
      g[t.row][t.col].jokerFormed = false;
      choices.push({ kind: 'STEAL', target: t, score: scoreFor(g, gridSize, teamId) - baseline });
    }
  }

  if (kinds.includes('SANDUHR') && opts.phase === 3) {
    // Bann (intern SANDUHR): gegnerisches ODER leeres Feld neutralisieren + 3 Fragen blockieren.
    // Frei wählbar pro Frage (kein Budget). Score-Modell: sofortiger Cluster-Schaden,
    // zusätzlich kleiner Defensiv-Bonus bei leeren Feldern.
    for (const t of oppBombable) {
      if (grid[t.row][t.col].sandLockTtl) continue;
      const g = cloneGrid(grid);
      g[t.row][t.col].ownerId = null;
      g[t.row][t.col].jokerFormed = false;
      choices.push({ kind: 'SANDUHR', target: t, score: scoreFor(g, gridSize, teamId) - baseline });
    }
    for (const t of empty) {
      if (grid[t.row][t.col].sandLockTtl) continue;
      // Leeres Feld sperren: kein direkter Score-Gain (own.largest unverändert),
      // aber Gegner kann's nicht setzen → kleiner Defensiv-Bonus.
      choices.push({ kind: 'SANDUHR', target: t, score: 0.3 });
    }
  }

  if (kinds.includes('SHIELD') && opts.phase === 3 && (opts.shieldsUsed ?? 0) < 2) {
    const territories = computeTerritories(grid, gridSize);
    const ownLargest = territories[teamId]?.largest ?? 0;
    // Nur sinnvoll ab 3er-Cluster; Wert = 0.5 * largest (defensiver Nutzen,
    // konkurriert realistisch mit +1/+2-Aktionen). Mit Lifetime "bis Spielende"
    // ist der Wert eigentlich höher, aber wir bleiben konservativ damit Bots nicht
    // beide Schilde sofort verbraten.
    if (ownLargest >= 3) {
      choices.push({ kind: 'SHIELD', score: ownLargest * 0.5 });
    }
  }

  if (kinds.includes('STAPEL') && opts.phase >= 4) {
    // Stapel ändert die Cluster-Größe nicht → naive scoreFor-Diff wäre 0.
    // Stattdessen: "Was verliere ich, wenn jemand mir dieses Feld wegnimmt?"
    // Wir simulieren Klau (ownerId=null) und messen den Cluster-Verlust.
    // Stapeln verhindert das. Multiplikator 0.6 dämpft (nicht jeder Klau passiert).
    // Bonus-Faktor 0.15 für Total-Felder, damit der Bot nicht ein Single-Tile
    // stapelt (das schützt nichts Wertvolles).
    for (const t of ownStapable) {
      const g = cloneGrid(grid);
      g[t.row][t.col].ownerId = null;
      g[t.row][t.col].jokerFormed = false;
      const lossIfStolen = baseline - scoreFor(g, gridSize, teamId); // ≥0 normalerweise
      const protectionValue = Math.max(0, lossIfStolen) * 0.6;
      choices.push({ kind: 'STAPEL', target: t, score: protectionValue });
    }
  }

  if (kinds.includes('SWAP') && opts.phase >= 4) {
    // Alle (eigenes, gegner) Paare. Cap bei 5×5 Grid = max 625 Kombinationen — vertretbar.
    for (const own of ownCells) {
      for (const opp of stealPool) {
        const g = cloneGrid(grid);
        const oppOwner = grid[opp.row][opp.col].ownerId;
        const wasStuck = !!grid[own.row][own.col].stuck;
        g[own.row][own.col].ownerId = oppOwner;
        g[own.row][own.col].stuck = false;
        g[own.row][own.col].jokerFormed = false;
        g[opp.row][opp.col].ownerId = teamId;
        g[opp.row][opp.col].stuck = wasStuck; // stuck zieht mit (Design-Vereinfachung)
        g[opp.row][opp.col].jokerFormed = false;
        choices.push({
          kind: 'SWAP', ownTarget: own, enemyTarget: opp,
          score: scoreFor(g, gridSize, teamId) - baseline,
        });
      }
    }
  }

  return choices;
}

/**
 * Wählt eine Aktion. 80% beste, 20% zufällig aus den Top-3.
 * Gibt null zurück, wenn gar keine Aktion möglich ist.
 */
export function pickDummyAction(
  grid: QQGrid,
  gridSize: number,
  teamId: string,
  opts: DummyEnumerateOpts,
  randomnessPct: number = 0.2,
): DummyActionChoice | null {
  const choices = enumerateActions(grid, gridSize, teamId, opts);
  if (choices.length === 0) return null;
  // Tie-Break randomisieren: ohne diesen Schritt würden Optionen mit identischem
  // Score die Insertion-Reihenfolge (row-major) behalten und der Bot würde
  // immer top-left bevorzugen → Felder hängen oben/links zusammen.
  choices.sort((a, b) => {
    const diff = b.score - a.score;
    if (Math.abs(diff) < 1e-9) return Math.random() - 0.5;
    return diff;
  });
  if (Math.random() < randomnessPct) {
    const topN = choices.slice(0, Math.min(3, choices.length));
    return topN[Math.floor(Math.random() * topN.length)];
  }
  return choices[0];
}
