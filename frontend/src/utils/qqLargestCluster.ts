/**
 * qqLargestCluster — welche KACHELN bilden das groesste Gebiet eines Teams.
 *
 * WARUM (2026-08-24, Wolf: „wir hatten besprochen nach der bewertung eine
 * motion zu machen, bei der die felder aus dem grid auf die tuerme fallen"):
 * fuer diese Bewegung reicht die ZAHL `largestConnected` nicht. Man braucht die
 * Koordinaten, sonst weiss man nicht, welche Kachel losfliegen soll.
 *
 * Und man braucht genau die des GROESSTEN GEBIETS, nicht alle Kacheln des
 * Teams. Der Turm ist so hoch wie das groesste zusammenhaengende Gebiet - wenn
 * alle Kacheln fliegen wuerden, waere der Turm am Ende niedriger als die Zahl
 * der geflogenen Kacheln, und die Bewegung wuerde luegen. So herum erzaehlt sie
 * sogar die Regel mit: die verstreuten Felder bleiben liegen und verblassen,
 * nur das zusammenhaengende Gebiet wird zum Turm.
 *
 * Das Zaehlwerk ist absichtlich dieselbe 4er-Nachbarschaft wie im Backend
 * (backend/src/quarterQuiz/qqBfs.ts). Faende diese Funktion ein anderes Gebiet
 * als der Server, waere die Bewegung schoen und falsch.
 *
 * Unterschied zum Backend, bewusst: der Server ZAEHLT festgeklebte Kacheln
 * doppelt (`stuck` = 2 Punkte), es bleibt aber EINE Kachel. Hier zaehlen wir
 * Kacheln, nicht Punkte - die Differenz faellt im Turm-Finale als normaler
 * Baustein nach, zusammen mit dem Final-Tipp-Bonus.
 */
import type { QQGrid } from '../../../shared/quarterQuizTypes';

export type ClusterKachel = { r: number; c: number; stuck: boolean };

/**
 * Pro Team die Kacheln seines groessten zusammenhaengenden Gebiets.
 * Bei Gleichstand zwischen zwei gleich grossen Gebieten gewinnt das zuerst
 * gefundene - dieselbe Regel wie `Math.max` im Backend, nur sichtbar gemacht.
 */
export function qqLargestClusterCells(grid: QQGrid, gridSize: number): Record<string, ClusterKachel[]> {
  if (!grid?.length) return {};
  const gesehen: boolean[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
  const bestes: Record<string, ClusterKachel[]> = {};
  // Der Server wertet Gebiete nach PUNKTEN (stuck zaehlt doppelt), also muss
  // der Vergleich hier auch nach Punkten gehen - sonst waehlen wir bei zwei
  // Gebieten das falsche aus.
  const bestPunkte: Record<string, number> = {};

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (gesehen[r][c]) continue;
      const zelle = grid[r]?.[c];
      const id = zelle?.ownerId ?? null;
      if (!id) { gesehen[r][c] = true; continue; }

      const schlange: Array<[number, number]> = [[r, c]];
      gesehen[r][c] = true;
      const kacheln: ClusterKachel[] = [];
      let punkte = 0;
      while (schlange.length) {
        const [zr, zc] = schlange.shift()!;
        const stuck = !!grid[zr][zc].stuck;
        kacheln.push({ r: zr, c: zc, stuck });
        punkte += stuck ? 2 : 1;
        for (const [nr, nc] of [[zr - 1, zc], [zr + 1, zc], [zr, zc - 1], [zr, zc + 1]] as Array<[number, number]>) {
          if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) continue;
          if (gesehen[nr][nc]) continue;
          if (grid[nr][nc].ownerId !== id) continue;
          gesehen[nr][nc] = true;
          schlange.push([nr, nc]);
        }
      }
      if (punkte > (bestPunkte[id] ?? 0)) { bestPunkte[id] = punkte; bestes[id] = kacheln; }
    }
  }
  return bestes;
}
