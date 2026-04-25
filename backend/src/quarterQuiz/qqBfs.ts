// ── Quarter Quiz — BFS territory computation ──────────────────────────────────
// Pure functions, no I/O, no side effects.

import { QQGrid, QQCell } from '../../../shared/quarterQuizTypes';

export interface TerritoryResult {
  total: number;          // total cells owned by this team
  largest: number;        // largest single connected component
}

/**
 * Compute total + largest-connected territory for every team on the grid.
 * Uses 4-connectivity (no diagonals).
 * Returns an empty object if no cells are claimed.
 */
export function computeTerritories(
  grid: QQGrid,
  gridSize: number
): Record<string, TerritoryResult> {
  const visited: boolean[][] = Array.from(
    { length: gridSize },
    () => Array(gridSize).fill(false)
  );

  const results: Record<string, TerritoryResult> = {};

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (visited[r][c]) continue;
      const cell = grid[r][c];
      if (cell.ownerId === null) { visited[r][c] = true; continue; }

      const teamId = cell.ownerId;
      const componentSize = bfsComponent(grid, gridSize, visited, r, c, teamId);

      if (!results[teamId]) results[teamId] = { total: 0, largest: 0 };
      results[teamId].total   += componentSize;
      results[teamId].largest  = Math.max(results[teamId].largest, componentSize);
    }
  }

  return results;
}

function bfsComponent(
  grid: QQGrid,
  gridSize: number,
  visited: boolean[][],
  startR: number,
  startC: number,
  teamId: string
): number {
  const queue: [number, number][] = [[startR, startC]];
  visited[startR][startC] = true;
  let size = 0;

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    // Stuck cells count as 2 points
    size += grid[r][c].stuck ? 2 : 1;

    const neighbors: [number, number][] = [
      [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]
    ];

    for (const [nr, nc] of neighbors) {
      if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) continue;
      if (visited[nr][nc]) continue;
      if (grid[nr][nc].ownerId !== teamId) continue;
      visited[nr][nc] = true;
      queue.push([nr, nc]);
    }
  }

  return size;
}

/**
 * Find the teamId with the smallest largestConnected score.
 * Tie-break: smallest total → then first in joinOrder array.
 * Returns null if no teams have any cells yet.
 */
export function findLastPlace(
  territories: Record<string, TerritoryResult>,
  joinOrder: string[]  // teamIds in join order (first joined = index 0)
): string | null {
  const teams = joinOrder.filter(id => territories[id] !== undefined);
  if (teams.length === 0) {
    // No cells placed yet — return last team in join order
    return joinOrder[joinOrder.length - 1] ?? null;
  }

  let last = teams[0];
  for (const id of teams) {
    const t = territories[id] ?? { total: 0, largest: 0 };
    const l = territories[last] ?? { total: 0, largest: 0 };
    if (
      t.largest < l.largest ||
      (t.largest === l.largest && t.total < l.total) ||
      (t.largest === l.largest && t.total === l.total && joinOrder.indexOf(id) > joinOrder.indexOf(last))
    ) {
      last = id;
    }
  }
  return last;
}

/**
 * Detect all newly completed 2×2 blocks for a given team that haven't been
 * flagged yet (jokerFormed === false on all 4 cells).
 *
 * Returns array of top-left corners [r, c] of each new 2×2 block.
 * The caller is responsible for:
 *   1. Marking those cells jokerFormed = true
 *   2. Awarding one bonus field per block (up to QQ_MAX_JOKERS_PER_GAME)
 */
export type JokerBlock = {
  kind: '2x2' | '4line';
  cells: Array<{ r: number; c: number }>;
};

export function detectNewJokers(
  grid: QQGrid,
  gridSize: number,
  teamId: string
): JokerBlock[] {
  const newBlocks: JokerBlock[] = [];
  const ownedAndFresh = (r: number, c: number): boolean => {
    const cell = grid[r]?.[c];
    return !!cell && cell.ownerId === teamId && !cell.jokerFormed;
  };

  // 2x2 squares
  for (let r = 0; r <= gridSize - 2; r++) {
    for (let c = 0; c <= gridSize - 2; c++) {
      if (
        ownedAndFresh(r, c) && ownedAndFresh(r, c + 1) &&
        ownedAndFresh(r + 1, c) && ownedAndFresh(r + 1, c + 1)
      ) {
        newBlocks.push({
          kind: '2x2',
          cells: [{ r, c }, { r, c: c + 1 }, { r: r + 1, c }, { r: r + 1, c: c + 1 }],
        });
      }
    }
  }

  // 4-in-a-row horizontal
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c <= gridSize - 4; c++) {
      if (
        ownedAndFresh(r, c) && ownedAndFresh(r, c + 1) &&
        ownedAndFresh(r, c + 2) && ownedAndFresh(r, c + 3)
      ) {
        newBlocks.push({
          kind: '4line',
          cells: [{ r, c }, { r, c: c + 1 }, { r, c: c + 2 }, { r, c: c + 3 }],
        });
      }
    }
  }

  // 4-in-a-row vertical
  for (let c = 0; c < gridSize; c++) {
    for (let r = 0; r <= gridSize - 4; r++) {
      if (
        ownedAndFresh(r, c) && ownedAndFresh(r + 1, c) &&
        ownedAndFresh(r + 2, c) && ownedAndFresh(r + 3, c)
      ) {
        newBlocks.push({
          kind: '4line',
          cells: [{ r, c }, { r: r + 1, c }, { r: r + 2, c }, { r: r + 3, c }],
        });
      }
    }
  }

  return newBlocks;
}

/**
 * Mark all cells of a joker block as jokerFormed.
 * Generischer als die alte 2x2-Variante — nimmt jetzt die Cells-Liste vom
 * detected Block (funktioniert fuer 2x2 und 4x1 Linien gleichermassen).
 * Mutates the grid in place.
 */
export function markJokerCells(
  grid: QQGrid,
  cells: Array<{ r: number; c: number }>
): void {
  for (const { r, c } of cells) {
    if (grid[r]?.[c]) grid[r][c].jokerFormed = true;
  }
}

/**
 * Detect all valid Stucken candidates for a team in Phase 4.
 * A candidate is a cell NOT owned by the team (free or enemy) whose
 * 4 orthogonal neighbors are ALL owned by the team.
 * Returns array of center-cell coordinates.
 */
export function detectPlusForStuck(
  grid: QQGrid,
  gridSize: number,
  teamId: string
): Array<{ r: number; c: number }> {
  const candidates: Array<{ r: number; c: number }> = [];
  for (let r = 1; r < gridSize - 1; r++) {
    for (let c = 1; c < gridSize - 1; c++) {
      const center = grid[r][c];
      // Center must NOT already be owned by the team or stuck
      if (center.ownerId === teamId || center.stuck) continue;
      // All 4 orthogonal neighbors must be owned by team
      const up    = grid[r - 1][c];
      const down  = grid[r + 1][c];
      const left  = grid[r][c - 1];
      const right = grid[r][c + 1];
      if (
        up.ownerId === teamId &&
        down.ownerId === teamId &&
        left.ownerId === teamId &&
        right.ownerId === teamId
      ) {
        candidates.push({ r, c });
      }
    }
  }
  return candidates;
}

/**
 * Build a fresh empty grid of the given size.
 */
export function buildEmptyGrid(gridSize: number): QQGrid {
  return Array.from({ length: gridSize }, (_, r) =>
    Array.from({ length: gridSize }, (_, c): QQCell => ({
      row: r,
      col: c,
      ownerId: null,
      jokerFormed: false,
    }))
  );
}
