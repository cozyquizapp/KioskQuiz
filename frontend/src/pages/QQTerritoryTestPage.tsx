// ── QQ Territory Test — Score-Modell A (kontinuierliches Territorium) ─────────
// Brainstorm-Prototyp 2026-07-01 (Wolf): Testet das große-Gruppen-Score-Modell
// „Territorium kontinuierlich" für bis zu 100 Personen / 25 Teams.
//
// Idee: Der Grid-Score `largestConnected` (größtes zusammenhängendes Imperium)
// wird auf einen fein aufgelösten Pixel-Canvas übertragen. Richtige Antworten
// lassen die Team-Farbe organisch wachsen; „Klauen" = angrenzende Gegner-Pixel
// überstreichen. Der Score bleibt DIE zusammenhängende Fläche — nicht die
// Gesamtzahl der Felder. Kein Mod-Platzieren, alles emergent → skaliert.
//
// Route: /territory-test (PinGate). Reiner Test — keine Socket-/Backend-Anbindung.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QQ_TEAM_PALETTE } from '@shared/quarterQuizTypes';

const CANVAS_PX = 620;

// ── Reine Board-Helfer ───────────────────────────────────────────────────────

/** Frisches Board: alle Zellen leer (-1), pro Team ein zufälliger Seed-Pixel. */
function initBoard(teamCount: number, gridN: number): Int16Array {
  const area = gridN * gridN;
  const b = new Int16Array(area).fill(-1);
  const seeds = new Set<number>();
  while (seeds.size < Math.min(teamCount, area)) {
    seeds.add((Math.random() * area) | 0);
  }
  let t = 0;
  for (const s of seeds) b[s] = t++;
  return b;
}

/** Lässt ein Team um `count` Pixel wachsen — organisch vom eigenen Rand aus.
 *  Bevorzugt leere Nachbarn; wenn keine frei sind und `steal`, überstreicht es
 *  angrenzende Gegner-Pixel. Voll umschlossen → Wachstum stoppt. */
function grow(board: Int16Array, gridN: number, team: number, count: number, steal: boolean): void {
  const area = gridN * gridN;
  for (let k = 0; k < count; k++) {
    const empties: number[] = [];
    const enemies: number[] = [];
    for (let i = 0; i < area; i++) {
      if (board[i] !== team) continue;
      const r = (i / gridN) | 0;
      const c = i % gridN;
      if (r > 0)         { const n = i - gridN; if (board[n] < 0) empties.push(n); else if (board[n] !== team) enemies.push(n); }
      if (r < gridN - 1) { const n = i + gridN; if (board[n] < 0) empties.push(n); else if (board[n] !== team) enemies.push(n); }
      if (c > 0)         { const n = i - 1;     if (board[n] < 0) empties.push(n); else if (board[n] !== team) enemies.push(n); }
      if (c < gridN - 1) { const n = i + 1;     if (board[n] < 0) empties.push(n); else if (board[n] !== team) enemies.push(n); }
    }
    let pick = -1;
    if (empties.length)               pick = empties[(Math.random() * empties.length) | 0];
    else if (steal && enemies.length) pick = enemies[(Math.random() * enemies.length) | 0];
    if (pick < 0) break;
    board[pick] = team;
  }
}

function shuffledIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type TeamScore = { team: number; largest: number; total: number };

// ── Component ────────────────────────────────────────────────────────────────

export default function QQTerritoryTestPage() {
  const [teamCount, setTeamCount] = useState(12);
  const [gridN, setGridN] = useState(48);
  const [pixelsPerAnswer, setPixelsPerAnswer] = useState(4);
  const [maxAnswersPerRound, setMaxAnswersPerRound] = useState(6);
  const [stealAllowed, setStealAllowed] = useState(true);
  const [onlyLargest, setOnlyLargest] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [round, setRound] = useState(0);
  const [board, setBoard] = useState<Int16Array>(() => initBoard(12, 48));

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Team-Farben: 8 Brand-Farben + goldener-Winkel-HSL für den Rest.
  const colors = useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i < teamCount; i++) {
      if (i < QQ_TEAM_PALETTE.length) arr.push(QQ_TEAM_PALETTE[i]);
      else arr.push(`hsl(${((i * 137.508) % 360).toFixed(0)} 68% 56%)`);
    }
    return arr;
  }, [teamCount]);

  // Reset bei Team-/Auflösungs-Wechsel (Board-Größe/Seeds ändern sich).
  useEffect(() => {
    setBoard(initBoard(teamCount, gridN));
    setRound(0);
  }, [teamCount, gridN]);

  // Scores: pro Team größte zusammenhängende Komponente (4er-Nachbarschaft) +
  // Gesamtzahl. `inLargest` markiert Zellen, die zum jeweils größten Gebiet
  // gehören (für die „nur größtes Gebiet"-Ansicht).
  const { ranking, inLargest, claimed } = useMemo(() => {
    const area = gridN * gridN;
    const visited = new Uint8Array(area);
    const mask = new Uint8Array(area);
    const totals = new Array<number>(teamCount).fill(0);
    const bestSize = new Array<number>(teamCount).fill(0);
    const bestCells: number[][] = Array.from({ length: teamCount }, () => []);
    let claimedTotal = 0;

    for (let i = 0; i < area; i++) {
      const t = board[i];
      if (t >= 0 && t < teamCount) { totals[t]++; claimedTotal++; }
    }
    for (let i = 0; i < area; i++) {
      const t = board[i];
      if (t < 0 || t >= teamCount || visited[i]) continue;
      const stack = [i];
      visited[i] = 1;
      const cells = [i];
      while (stack.length) {
        const cur = stack.pop() as number;
        const r = (cur / gridN) | 0;
        const c = cur % gridN;
        const nbs: number[] = [];
        if (r > 0) nbs.push(cur - gridN);
        if (r < gridN - 1) nbs.push(cur + gridN);
        if (c > 0) nbs.push(cur - 1);
        if (c < gridN - 1) nbs.push(cur + 1);
        for (const n of nbs) {
          if (!visited[n] && board[n] === t) { visited[n] = 1; stack.push(n); cells.push(n); }
        }
      }
      if (cells.length > bestSize[t]) { bestSize[t] = cells.length; bestCells[t] = cells; }
    }
    for (let t = 0; t < teamCount; t++) for (const ci of bestCells[t]) mask[ci] = 1;

    const rank: TeamScore[] = Array.from({ length: teamCount }, (_, t) => ({
      team: t, largest: bestSize[t], total: totals[t],
    })).sort((a, b) => b.largest - a.largest || b.total - a.total);

    return { ranking: rank, inLargest: mask, claimed: claimedTotal };
  }, [board, gridN, teamCount]);

  // Canvas zeichnen.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const cell = CANVAS_PX / gridN;
    ctx.clearRect(0, 0, CANVAS_PX, CANVAS_PX);
    ctx.fillStyle = '#141d3a';
    ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);
    for (let i = 0; i < gridN * gridN; i++) {
      const t = board[i];
      if (t < 0 || t >= teamCount) continue;
      const r = (i / gridN) | 0;
      const c = i % gridN;
      ctx.globalAlpha = onlyLargest && !inLargest[i] ? 0.14 : 1;
      ctx.fillStyle = colors[t];
      ctx.fillRect(c * cell, r * cell, cell + 0.6, cell + 0.6);
    }
    ctx.globalAlpha = 1;
  }, [board, gridN, teamCount, colors, onlyLargest, inLargest]);

  const runRound = useCallback(() => {
    setBoard(prev => {
      const b = prev.slice();
      for (const t of shuffledIndices(teamCount)) {
        const answers = (Math.random() * (maxAnswersPerRound + 1)) | 0;
        grow(b, gridN, t, answers * pixelsPerAnswer, stealAllowed);
      }
      return b;
    });
    setRound(r => r + 1);
  }, [teamCount, gridN, pixelsPerAnswer, maxAnswersPerRound, stealAllowed]);

  const stepOne = useCallback(() => {
    setBoard(prev => {
      const b = prev.slice();
      grow(b, gridN, (Math.random() * teamCount) | 0, pixelsPerAnswer, stealAllowed);
      return b;
    });
  }, [teamCount, gridN, pixelsPerAnswer, stealAllowed]);

  const reset = useCallback(() => {
    setBoard(initBoard(teamCount, gridN));
    setRound(0);
    setAutoPlay(false);
  }, [teamCount, gridN]);

  // Auto-Play.
  useEffect(() => {
    if (!autoPlay) return;
    const id = window.setInterval(runRound, 850);
    return () => window.clearInterval(id);
  }, [autoPlay, runRound]);

  const area = gridN * gridN;
  const fillPct = Math.round((claimed / area) * 100);
  const maxLargest = ranking[0]?.largest || 1;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.h1}>🗺️ Territorium-Score — Test (Modell A)</h1>
        <p style={S.sub}>
          Score-Idee für große Gruppen (bis 100 Personen / 25 Teams): Richtige Antworten lassen die
          Team-Farbe organisch wachsen. Der Score ist das <b>größte zusammenhängende Gebiet</b>{' '}
          (<code>largestConnected</code>) — nicht die Gesamtzahl der Felder. „Klauen" = angrenzende
          Gegner-Pixel überstreichen. Alles emergent, kein Mod-Platzieren.
        </p>
      </div>

      <div style={S.body}>
        {/* Canvas */}
        <div style={S.canvasCard}>
          <canvas ref={canvasRef} width={CANVAS_PX} height={CANVAS_PX} style={S.canvas} />
          <div style={S.canvasMeta}>
            <span>Runde <b>{round}</b></span>
            <span>Auflösung <b>{gridN}×{gridN}</b> = {area} Pixel</span>
            <span>Gefüllt <b>{fillPct}%</b></span>
          </div>
        </div>

        {/* Controls + Leaderboard */}
        <div style={S.side}>
          <div style={S.controls}>
            <div style={S.btnRow}>
              <button style={S.btnPrimary} onClick={runRound}>▶ Runde simulieren</button>
              <button style={S.btn} onClick={stepOne}>+1 Antwort</button>
              <button
                style={{ ...S.btn, ...(autoPlay ? S.btnActive : null) }}
                onClick={() => setAutoPlay(a => !a)}
              >
                {autoPlay ? '⏸ Auto stop' : '⏩ Auto-Play'}
              </button>
              <button style={S.btnGhost} onClick={reset}>↺ Reset</button>
            </div>

            <Slider label="Teams" value={teamCount} min={2} max={25} onChange={setTeamCount} />
            <Slider label="Auflösung (N×N)" value={gridN} min={24} max={80} step={4} onChange={setGridN} />
            <Slider label="Pixel pro Antwort" value={pixelsPerAnswer} min={1} max={12} onChange={setPixelsPerAnswer} />
            <Slider label="Max Antworten / Runde" value={maxAnswersPerRound} min={1} max={12} onChange={setMaxAnswersPerRound} />

            <div style={S.toggleRow}>
              <Toggle label="Klauen erlaubt" checked={stealAllowed} onChange={setStealAllowed} />
              <Toggle label="Nur größtes Gebiet zeigen" checked={onlyLargest} onChange={setOnlyLargest} />
            </div>
          </div>

          <div style={S.board}>
            <div style={S.boardHead}>
              <span style={{ width: 26 }}>#</span>
              <span style={{ flex: 1 }}>Team</span>
              <span style={{ width: 62, textAlign: 'right' }} title="Größtes zusammenhängendes Gebiet = Score">Gebiet</span>
              <span style={{ width: 48, textAlign: 'right', opacity: 0.6 }} title="Gesamtzahl Felder (nicht Score)">Felder</span>
            </div>
            {ranking.map((rk, idx) => (
              <div key={rk.team} style={{ ...S.boardRow, ...(idx === 0 ? S.boardRowLead : null) }}>
                <span style={{ width: 26, fontWeight: 800, opacity: idx === 0 ? 1 : 0.5 }}>
                  {idx === 0 ? '👑' : idx + 1}
                </span>
                <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ ...S.swatch, background: colors[rk.team] }} />
                  T{rk.team + 1}
                </span>
                <span style={{ width: 62, textAlign: 'right', position: 'relative' }}>
                  <span style={{
                    position: 'absolute', right: 0, top: -3, height: 3, borderRadius: 2,
                    width: `${(rk.largest / maxLargest) * 56}px`, background: colors[rk.team], opacity: 0.7,
                  }} />
                  <b>{rk.largest}</b>
                </span>
                <span style={{ width: 48, textAlign: 'right', opacity: 0.55, fontSize: 13 }}>{rk.total}</span>
              </div>
            ))}
          </div>

          <p style={S.legend}>
            <b>Gebiet</b> = größte zusammenhängende Fläche einer Farbe (= Score). <b>Felder</b> =
            alle Pixel des Teams. Der Unterschied macht die Mechanik: viele verstreute Pixel sind
            weniger wert als ein kompaktes Imperium. „Nur größtes Gebiet zeigen" blendet die
            verstreuten Reste aus — dann siehst du den echten Score.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── kleine UI-Bausteine ──────────────────────────────────────────────────────

function Slider(props: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <label style={S.sliderRow}>
      <span style={S.sliderLabel}>{props.label}<b style={S.sliderVal}>{props.value}</b></span>
      <input
        type="range" min={props.min} max={props.max} step={props.step ?? 1} value={props.value}
        onChange={e => props.onChange(Number(e.target.value))}
        style={S.range}
      />
    </label>
  );
}

function Toggle(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={S.toggle}>
      <input type="checkbox" checked={props.checked} onChange={e => props.onChange(e.target.checked)} />
      <span>{props.label}</span>
    </label>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', background: 'radial-gradient(1200px 800px at 20% 0%, #1e2a5a 0%, #0e1530 60%, #0a0f24 100%)',
    color: '#f4f6ff', fontFamily: "'Nunito', system-ui, sans-serif", padding: '28px 32px 60px',
  },
  header: { maxWidth: 1180, margin: '0 auto 22px' },
  h1: { margin: '0 0 6px', fontSize: 28, fontWeight: 900, letterSpacing: -0.5 },
  sub: { margin: 0, fontSize: 15, lineHeight: 1.5, opacity: 0.82, maxWidth: 820 },
  body: { maxWidth: 1180, margin: '0 auto', display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' },
  canvasCard: {
    background: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 16,
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)',
  },
  canvas: { width: CANVAS_PX, height: CANVAS_PX, display: 'block', borderRadius: 12, background: '#141d3a' },
  canvasMeta: { display: 'flex', gap: 18, justifyContent: 'space-between', marginTop: 12, fontSize: 13, opacity: 0.75, padding: '0 4px' },
  side: { flex: 1, minWidth: 340, display: 'flex', flexDirection: 'column', gap: 18 },
  controls: {
    background: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: 18,
    border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 12,
  },
  btnRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  btn: { background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 14px', fontWeight: 800, fontSize: 14, cursor: 'pointer' },
  btnPrimary: { background: '#EC4899', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 16px', fontWeight: 900, fontSize: 14, cursor: 'pointer' },
  btnGhost: { background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '10px 14px', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  btnActive: { background: '#A21247', boxShadow: '0 0 0 2px rgba(236,72,153,0.4)' },
  sliderRow: { display: 'flex', flexDirection: 'column', gap: 4 },
  sliderLabel: { display: 'flex', justifyContent: 'space-between', fontSize: 13, opacity: 0.85, fontWeight: 700 },
  sliderVal: { color: '#EC4899', fontSize: 15 },
  range: { width: '100%', accentColor: '#EC4899' },
  toggleRow: { display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 2 },
  toggle: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, opacity: 0.9, cursor: 'pointer' },
  board: {
    background: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: '12px 16px 16px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  boardHead: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, opacity: 0.5, padding: '4px 0 8px', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  boardRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', fontSize: 15, borderBottom: '1px solid rgba(255,255,255,0.05)' },
  boardRowLead: { background: 'rgba(236,72,153,0.09)', borderRadius: 8, padding: '7px 8px', margin: '2px -8px' },
  swatch: { width: 15, height: 15, borderRadius: 4, display: 'inline-block', boxShadow: '0 0 0 1px rgba(255,255,255,0.15)' },
  legend: { fontSize: 12.5, lineHeight: 1.5, opacity: 0.6, margin: 0, padding: '0 4px' },
};
