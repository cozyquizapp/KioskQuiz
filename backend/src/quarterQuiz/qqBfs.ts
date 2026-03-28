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
    size++;

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
 *   2. Awarding one bonus field per block (up to QQ_MAX_JOKERS_PER_PHASE)
 */
export function detectNewJokers(
  grid: QQGrid,
  gridSize: number,
  teamId: string
): Array<{ r: number; c: number }> {
  const newBlocks: Array<{ r: number; c: number }> = [];

  for (let r = 0; r <= gridSize - 2; r++) {
    for (let c = 0; c <= gridSize - 2; c++) {
      const tl = grid[r][c];
      const tr = grid[r][c + 1];
      const bl = grid[r + 1][c];
      const br = grid[r + 1][c + 1];

      // All 4 must be owned by this team
      if (
        tl.ownerId !== teamId || tr.ownerId !== teamId ||
        bl.ownerId !== teamId || br.ownerId !== teamId
      ) continue;

      // None of the 4 cells should already be part of a triggered joker
      if (tl.jokerFormed || tr.jokerFormed || bl.jokerFormed || br.jokerFormed) continue;

      newBlocks.push({ r, c });
    }
  }

  return newBlocks;
}

/**
 * Mark all 4 cells of a 2×2 block as jokerFormed.
 * Mutates the grid in place — call after awarding the joker.
 */
export function markJokerCells(
  grid: QQGrid,
  topLeftR: number,
  topLeftC: number
): void {
  grid[topLeftR][topLeftC].jokerFormed         = true;
  grid[topLeftR][topLeftC + 1].jokerFormed     = true;
  grid[topLeftR + 1][topLeftC].jokerFormed     = true;
  grid[topLeftR + 1][topLeftC + 1].jokerFormed = true;
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
