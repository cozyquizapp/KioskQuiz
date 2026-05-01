import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

/**
 * CozyWolf Garden — Pitch / Mockup-Page mit Walkthrough
 *
 * Live-Demo aller Specials in Sequenz:
 * intro → sun-zones → saisons → spotlight → steal → shrink → finale.
 * 10 Teams nach Farben benannt (festival-tauglich).
 * Adaptive Map-Size je nach Spielerzahl-Preset.
 */

// ── Map-Size Presets ───────────────────────────────────────────────────────
type SizePreset = 'small' | 'medium' | 'large';
const SIZE_PRESETS: Record<SizePreset, { cols: number; rows: number; players: string; label: string }> = {
  small:  { cols: 100, rows: 56, players: '20–60 Spieler',   label: 'Klein' },
  medium: { cols: 160, rows: 90, players: '60–200 Spieler',  label: 'Mittel' },
  large:  { cols: 220, rows: 124, players: '200–500+ Spieler', label: 'Groß' },
};

const TICK_MS = 130;
const RESET_PAUSE_MS = 4000;
const FULL_THRESHOLD = 0.92; // 92% gefüllt = "voll" → Endgame

// Walkthrough-Phasen
type PhaseId = 'intro' | 'sun' | 'seasons' | 'spotlight' | 'steal' | 'shrink' | 'full' | 'finale';
const PHASES: Array<{
  id: PhaseId; from: number; to: number; emoji: string; title: string; desc: string;
}> = [
  { id: 'intro',     from: 0,   to: 60,  emoji: '🌱', title: 'Gärten beginnen zu wachsen', desc: 'Jedes Team startet mit 1 Pixel am Spawn-Punkt. Pro richtiger Antwort wachsen Pixel um den Rand des eigenen Territoriums.' },
  { id: 'sun',       from: 60,  to: 120, emoji: '☀️', title: 'Sonnen-Zone', desc: 'Bonus-Mechanik: Pixel innerhalb der wandernden Sonne wachsen mit doppelter Rate. Teams, die schnell antworten, profitieren.' },
  { id: 'seasons',   from: 120, to: 180, emoji: '🍂', title: 'Saisonwechsel: Herbst', desc: 'Spiel hat 4 Saisons. Jede verändert Stimmung + Modifier. Herbst: kleinere Teams wachsen +50% schneller (Catch-up gegen Runaway-Leader).' },
  { id: 'spotlight', from: 180, to: 240, emoji: '✨', title: 'Spotlight-Question · 3× Bonus', desc: 'Alle 5 Fragen erscheint eine Spotlight-Question. Schnellste richtige Antwort = 3× Wachstum für eine Runde.' },
  { id: 'steal',     from: 240, to: 320, emoji: '⚔️', title: 'Steal · Territorium übernehmen', desc: 'Wenn Pixel zweier Teams sich berühren, können sie geklaut werden. Pro richtiger Antwort gibt es eine Chance, Border-Pixel des Nachbarn zu erobern statt nur leeres Land zu nehmen.' },
  { id: 'shrink',    from: 320, to: 380, emoji: '🌧️', title: 'Inaktive Teams schrumpfen', desc: 'Wenn ein Team 2 Fragen in Folge keine Antwort gibt, verliert es Pixel am Rand. Verhindert dass Führende „aussteigen" und hält alle bis zum Ende dabei.' },
  { id: 'full',      from: 380, to: 440, emoji: '🌍', title: 'Karte fast voll · Endgame', desc: 'Sobald 92% gefüllt ist, wird Wachstum gestoppt. Das einzige was noch zählt: Steal. Wer in der Schluss-Phase am aggressivsten antwortet, übernimmt Territorium der Nachbarn.' },
  { id: 'finale',    from: 440, to: 520, emoji: '🏆', title: 'Finale — Sieger-Team', desc: 'Größtes Territorium gewinnt. Die Karte ist ein lebendiges Mosaik des gesamten Events.' },
];

// ── Demo-Teams: 10 nach Farben ─────────────────────────────────────────────
type DemoTeam = {
  id: string; name: string; color: string;
  // Spawn als 0..1-Anteil von Cols/Rows (skaliert mit Map-Größe)
  cx: number; cy: number;
  growth: number;
};

const DEMO_TEAMS: DemoTeam[] = [
  { id: 'a', name: 'Blau',    color: '#3B82F6', cx: 0.075, cy: 0.16, growth: 3.0 },
  { id: 'b', name: 'Grün',    color: '#10B981', cx: 0.925, cy: 0.16, growth: 2.6 },
  { id: 'c', name: 'Gelb',    color: '#F59E0B', cx: 0.075, cy: 0.84, growth: 3.2 },
  { id: 'd', name: 'Lila',    color: '#A855F7', cx: 0.925, cy: 0.84, growth: 2.4 },
  { id: 'e', name: 'Pink',    color: '#EC4899', cx: 0.5,   cy: 0.10, growth: 2.8 },
  { id: 'f', name: 'Türkis',  color: '#06B6D4', cx: 0.5,   cy: 0.90, growth: 2.0 },
  { id: 'g', name: 'Rot',     color: '#EF4444', cx: 0.18,  cy: 0.50, growth: 3.0 },
  { id: 'h', name: 'Orange',  color: '#FB923C', cx: 0.82,  cy: 0.50, growth: 1.8 },
  { id: 'i', name: 'Limette', color: '#84CC16', cx: 0.35,  cy: 0.33, growth: 2.4 },
  { id: 'j', name: 'Koralle', color: '#FB7185', cx: 0.65,  cy: 0.66, growth: 2.6 },
];

const SPOTLIGHT_TEAM_IDX = 0; // Blau bekommt Spotlight
const STEAL_TEAM_IDX = 6;     // Rot ist der Stealer
const SHRINK_TEAM_IDX = 7;    // Orange schrumpft

// ── Page ────────────────────────────────────────────────────────────────────
export default function QQGardenPitchPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sizePreset, setSizePreset] = useState<SizePreset>('medium');
  const { cols: COLS, rows: ROWS } = SIZE_PRESETS[sizePreset];
  const TOTAL_CELLS = COLS * ROWS;

  const gridRef = useRef<Uint8Array>(new Uint8Array(TOTAL_CELLS));
  const [tick, setTick] = useState(0);
  const [running, setRunning] = useState(true);
  const [teamCounts, setTeamCounts] = useState<number[]>(DEMO_TEAMS.map(() => 0));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [stealEvents, setStealEvents] = useState<number>(0);

  const currentPhase = useMemo(() => {
    return PHASES.find(p => tick >= p.from && tick < p.to) ?? PHASES[PHASES.length - 1];
  }, [tick]);

  const finalTick = PHASES[PHASES.length - 1].to;
  const totalFilled = teamCounts.reduce((a, b) => a + b, 0);
  const fillPct = totalFilled / TOTAL_CELLS;

  // ── Init Grid ───────────────────────────────────────────────────────────
  const resetGrid = useCallback(() => {
    const g = new Uint8Array(TOTAL_CELLS);
    DEMO_TEAMS.forEach((t, i) => {
      const col = Math.round(t.cx * (COLS - 1));
      const row = Math.round(t.cy * (ROWS - 1));
      const idx = row * COLS + col;
      g[idx] = i + 1;
    });
    gridRef.current = g;
    setTeamCounts(DEMO_TEAMS.map(() => 1));
    setStealEvents(0);
  }, [COLS, ROWS, TOTAL_CELLS]);

  useEffect(() => { resetGrid(); }, [resetGrid]);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setTick(t => t + 1), TICK_MS);
    return () => clearInterval(iv);
  }, [running]);

  useEffect(() => {
    if (tick > finalTick) {
      const t = setTimeout(() => {
        resetGrid();
        setTick(0);
      }, RESET_PAUSE_MS);
      return () => clearTimeout(t);
    }
  }, [tick, finalTick, resetGrid]);

  // ── Sun-Zone ────────────────────────────────────────────────────────────
  const sunZone = useMemo(() => {
    if (currentPhase.id !== 'sun') return null;
    const localTick = tick - currentPhase.from;
    const angle = localTick * 0.05;
    const cx = 50 + Math.cos(angle) * 24;
    const cy = 50 + Math.sin(angle) * 18;
    return {
      x: cx, y: cy,
      pcol: Math.round((cx / 100) * COLS),
      prow: Math.round((cy / 100) * ROWS),
      pulse: Math.sin(tick * 0.18) * 0.3 + 0.7,
    };
  }, [tick, currentPhase, COLS, ROWS]);

  // ── Per-Tick: Wachstum + Phase-Mechaniken ──────────────────────────────
  useEffect(() => {
    if (tick === 0) return;
    const g = gridRef.current;
    const newCounts = [...teamCounts];
    let stealsThisTick = 0;

    // SHRINK: Orange verliert Border-Pixel
    if (currentPhase.id === 'shrink') {
      const teamId = SHRINK_TEAM_IDX + 1;
      const lossTargets: number[] = [];
      for (let i = 0; i < g.length; i++) {
        if (g[i] !== teamId) continue;
        const r = Math.floor(i / COLS);
        const c = i % COLS;
        const neighs: number[] = [];
        if (r > 0)        neighs.push((r - 1) * COLS + c);
        if (r < ROWS - 1) neighs.push((r + 1) * COLS + c);
        if (c > 0)        neighs.push(r * COLS + (c - 1));
        if (c < COLS - 1) neighs.push(r * COLS + (c + 1));
        const isBorder = neighs.some(n => g[n] !== teamId);
        if (isBorder) lossTargets.push(i);
      }
      const lossCount = Math.min(6, lossTargets.length);
      for (let k = 0; k < lossCount; k++) {
        const idx = Math.floor(Math.random() * lossTargets.length);
        const cellIdx = lossTargets.splice(idx, 1)[0];
        if (g[cellIdx] === teamId) {
          g[cellIdx] = 0;
          newCounts[SHRINK_TEAM_IDX]--;
        }
      }
    }

    // FULL-Phase: nur noch Steal-Mechanik aktiv (kein Wachstum auf leere Felder)
    const isFullPhase = currentPhase.id === 'full' || fillPct >= FULL_THRESHOLD;
    // Steal-Phase oder Full-Phase: Steal aktiviert
    const stealActive = currentPhase.id === 'steal' || isFullPhase;
    // Im Full-Phase stealen alle Teams ein bisschen
    const allTeamsCanSteal = isFullPhase;

    DEMO_TEAMS.forEach((team, ti) => {
      const teamId = ti + 1;
      let growthMul = 1;

      if (currentPhase.id === 'spotlight' && ti === SPOTLIGHT_TEAM_IDX) growthMul = 3;
      if (currentPhase.id === 'seasons') {
        const myCount = teamCounts[ti] ?? 0;
        const maxCount = Math.max(...teamCounts, 1);
        if (myCount < maxCount * 0.5) growthMul = 1.5;
      }

      // STEAL-Phase: Rot wird aggressiv (steht für jemand der gerade hot ist)
      const canStealAggressive = stealActive && (allTeamsCanSteal || ti === STEAL_TEAM_IDX);

      // Sammle Border-Pixel: leere Nachbarn = grow, fremde Nachbarn = steal-target
      const growBorders: number[] = [];
      const stealTargets: number[] = [];
      for (let i = 0; i < g.length; i++) {
        if (g[i] !== teamId) continue;
        const r = Math.floor(i / COLS);
        const c = i % COLS;
        const neighs: number[] = [];
        if (r > 0)        neighs.push((r - 1) * COLS + c);
        if (r < ROWS - 1) neighs.push((r + 1) * COLS + c);
        if (c > 0)        neighs.push(r * COLS + (c - 1));
        if (c < COLS - 1) neighs.push(r * COLS + (c + 1));
        for (const n of neighs) {
          if (g[n] === 0) growBorders.push(n);
          else if (g[n] !== teamId) stealTargets.push(n);
        }
      }

      // Im Full-Phase kein normales Wachstum mehr
      const target = isFullPhase ? 0 : Math.round(team.growth * growthMul);

      // Normales Wachstum auf leere Felder
      const seen = new Set<number>();
      for (let k = 0; k < target && growBorders.length > 0; k++) {
        const idx = Math.floor(Math.random() * growBorders.length);
        const cellIdx = growBorders[idx];
        growBorders.splice(idx, 1);
        if (seen.has(cellIdx)) { k--; continue; }
        seen.add(cellIdx);
        if (g[cellIdx] === 0) {
          g[cellIdx] = teamId;
          newCounts[ti]++;
          // Sun-Bonus
          if (sunZone) {
            const r = Math.floor(cellIdx / COLS);
            const c = cellIdx % COLS;
            const dx = c - sunZone.pcol;
            const dy = r - sunZone.prow;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 14 && growBorders.length > 0) {
              const idx2 = Math.floor(Math.random() * growBorders.length);
              const cell2 = growBorders.splice(idx2, 1)[0];
              if (g[cell2] === 0) {
                g[cell2] = teamId;
                newCounts[ti]++;
              }
            }
          }
        }
      }

      // STEAL: erobere fremde Border-Pixel
      if (canStealAggressive && stealTargets.length > 0) {
        const stealCount = isFullPhase
          ? Math.min(2, stealTargets.length)        // alle Teams stealen 2/Tick im Endgame
          : Math.min(4, stealTargets.length);       // Rot stealt 4/Tick in Steal-Phase
        for (let k = 0; k < stealCount; k++) {
          const idx = Math.floor(Math.random() * stealTargets.length);
          const cellIdx = stealTargets.splice(idx, 1)[0];
          const oldTeam = g[cellIdx];
          if (oldTeam !== 0 && oldTeam !== teamId) {
            g[cellIdx] = teamId;
            newCounts[ti]++;
            newCounts[oldTeam - 1]--;
            stealsThisTick++;
          }
        }
      }
    });
    setTeamCounts(newCounts);
    if (stealsThisTick > 0) setStealEvents(s => s + stealsThisTick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  // ── Canvas-Render ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
    }
    ctx.imageSmoothingEnabled = false;
    let bg = '#0A1322';
    if (currentPhase.id === 'seasons') bg = '#1F1810';
    if (currentPhase.id === 'shrink')  bg = '#0E1F2A';
    if (currentPhase.id === 'steal')   bg = '#1A0E14';
    if (currentPhase.id === 'full')    bg = '#1A1208';
    if (currentPhase.id === 'finale')  bg = '#160E26';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cellW = (cssW * dpr) / COLS;
    const cellH = (cssH * dpr) / ROWS;
    const g = gridRef.current;
    for (let i = 0; i < g.length; i++) {
      const v = g[i];
      if (v === 0) continue;
      const team = DEMO_TEAMS[v - 1];
      const r = Math.floor(i / COLS);
      const c = i % COLS;
      ctx.fillStyle = team.color;
      ctx.fillRect(
        Math.floor(c * cellW),
        Math.floor(r * cellH),
        Math.ceil(cellW) + 1,
        Math.ceil(cellH) + 1,
      );
    }
    if (currentPhase.id === 'seasons') {
      ctx.fillStyle = 'rgba(251,146,60,0.10)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (currentPhase.id === 'shrink') {
      ctx.fillStyle = 'rgba(56,189,248,0.06)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (currentPhase.id === 'steal') {
      ctx.fillStyle = 'rgba(239,68,68,0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const grad = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, canvas.width / 2,
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [tick, currentPhase, COLS, ROWS]);

  // ── Team-Labels ────────────────────────────────────────────────────────
  const teamLabels = useMemo(() => {
    const g = gridRef.current;
    return DEMO_TEAMS.map((team, ti) => {
      const teamId = ti + 1;
      let sumC = 0, sumR = 0, count = 0;
      for (let i = 0; i < g.length; i++) {
        if (g[i] !== teamId) continue;
        sumC += i % COLS;
        sumR += Math.floor(i / COLS);
        count++;
      }
      if (count < 5) return null;
      const cellCount = teamCounts[ti] ?? count;
      return {
        ...team,
        x: (sumC / count / COLS) * 100,
        y: (sumR / count / ROWS) * 100,
        cells: cellCount,
        isSpotlight: currentPhase.id === 'spotlight' && ti === SPOTLIGHT_TEAM_IDX,
        isStealer:   currentPhase.id === 'steal'     && ti === STEAL_TEAM_IDX,
        isShrinking: currentPhase.id === 'shrink'    && ti === SHRINK_TEAM_IDX,
      };
    }).filter(Boolean) as Array<DemoTeam & { x: number; y: number; cells: number; isSpotlight: boolean; isStealer: boolean; isShrinking: boolean }>;
  }, [tick, teamCounts, currentPhase, COLS, ROWS]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fullscreen ─────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────
  const sortedTeams = [...teamLabels].sort((a, b) => b.cells - a.cells);

  return (
    <div style={{
      minHeight: '100vh', background: 'radial-gradient(ellipse at center, #0F1B2A 0%, #060A12 70%)',
      color: '#F1F5F9', fontFamily: 'Nunito, system-ui, sans-serif',
      padding: '40px 20px',
    }}>
      <style>{`
        @keyframes pitchFadeIn { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }
        @keyframes pitchPulse  { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
        @keyframes spotlightGlow { 0%,100% { text-shadow: 0 0 12px rgba(255,255,255,0.5); } 50% { text-shadow: 0 0 24px rgba(255,255,255,0.95), 0 0 8px rgba(255,255,255,0.7); } }
        @keyframes stealShake { 0%,100% { transform: translate(-50%, -50%); } 25% { transform: translate(-52%, -49%); } 75% { transform: translate(-48%, -51%); } }
      `}</style>

      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 28, animation: 'pitchFadeIn 0.6s ease both' }}>
          <div style={{
            display: 'inline-block', padding: '6px 18px', borderRadius: 999,
            background: 'rgba(34,197,94,0.15)', border: '1.5px solid rgba(34,197,94,0.4)',
            fontSize: 13, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase',
            color: '#86EFAC', marginBottom: 14,
          }}>
            🌱 Pitch · Variante A · Mass-Mode mit Walkthrough
          </div>
          <h1 style={{
            fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 900, margin: '0 0 10px',
            background: 'linear-gradient(135deg, #86EFAC, #6EE7B7, #34D399)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}>
            CozyWolf Garden
          </h1>
          <p style={{
            fontSize: 'clamp(15px, 1.5vw, 19px)', color: '#94A3B8', margin: '0 auto', maxWidth: 760,
            lineHeight: 1.5,
          }}>
            10 Farb-Teams, beliebige Spielerzahl. Pixel wachsen pro richtiger Antwort, können
            sich gegenseitig erobern (Steal), und das Endgame triggert sobald die Karte fast voll ist.
          </p>
        </div>

        {/* Map-Size Picker */}
        {!isFullscreen && (
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20,
            animation: 'pitchFadeIn 0.6s ease 0.05s both',
          }}>
            {(Object.keys(SIZE_PRESETS) as SizePreset[]).map(key => {
              const preset = SIZE_PRESETS[key];
              const active = sizePreset === key;
              return (
                <button
                  key={key}
                  onClick={() => { setSizePreset(key); setTick(0); }}
                  style={{
                    padding: '9px 18px', borderRadius: 12,
                    background: active ? 'rgba(34,197,94,0.20)' : 'rgba(255,255,255,0.04)',
                    border: active ? '1.5px solid rgba(34,197,94,0.55)' : '1.5px solid rgba(255,255,255,0.10)',
                    color: active ? '#86EFAC' : '#cbd5e1',
                    fontSize: 13, fontWeight: 800, cursor: 'pointer',
                    letterSpacing: '0.04em',
                    transition: 'all 0.2s',
                  }}
                >
                  {preset.label} · {preset.cols}×{preset.rows} <span style={{ opacity: 0.7, fontWeight: 600 }}>· {preset.players}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Live-Demo Canvas */}
        <div
          ref={containerRef}
          style={{
            position: 'relative', maxWidth: isFullscreen ? '100%' : 1200, margin: '0 auto 20px',
            aspectRatio: isFullscreen ? undefined : `${COLS}/${ROWS}`,
            width: isFullscreen ? '100vw' : undefined,
            height: isFullscreen ? '100vh' : undefined,
            borderRadius: isFullscreen ? 0 : 24,
            background: '#0A1322',
            border: isFullscreen ? 'none' : '2px solid rgba(34,197,94,0.18)',
            boxShadow: isFullscreen ? 'none' : '0 0 80px rgba(34,197,94,0.10), 0 20px 60px rgba(0,0,0,0.6)',
            overflow: 'hidden',
            animation: 'pitchFadeIn 0.7s ease 0.1s both',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }}
          />

          {sunZone && (
            <div style={{
              position: 'absolute',
              left: `${sunZone.x}%`, top: `${sunZone.y}%`,
              width: '15%', height: '26%',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(251,191,36,${0.40 * sunZone.pulse}) 0%, rgba(251,191,36,${0.18 * sunZone.pulse}) 35%, transparent 70%)`,
              pointerEvents: 'none', zIndex: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'clamp(36px, 5vw, 60px)',
              animation: 'pitchPulse 1.6s ease-in-out infinite',
            }}>
              ☀️
            </div>
          )}

          {teamLabels.map(t => (
            <div key={t.id} style={{
              position: 'absolute',
              left: `${t.x}%`, top: `${t.y}%`,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none', zIndex: 4,
              textAlign: 'center',
              transition: 'left 0.5s ease, top 0.5s ease',
              opacity: t.isShrinking ? 0.55 : 1,
              animation: t.isStealer ? 'stealShake 0.4s ease-in-out infinite' : undefined,
            }}>
              <div style={{
                fontSize: t.isSpotlight || t.isStealer ? 'clamp(20px, 2vw, 26px)' : 'clamp(15px, 1.5vw, 20px)',
                fontWeight: 900, color: '#fff',
                textShadow: '0 2px 8px rgba(0,0,0,0.85), 0 0 12px rgba(0,0,0,0.7)',
                letterSpacing: '0.02em',
                animation: t.isSpotlight ? 'spotlightGlow 1.2s ease-in-out infinite' : undefined,
              }}>
                {t.isSpotlight && '✨ '}
                {t.isStealer && '⚔️ '}
                {t.name}
                {t.isShrinking && ' 🌧️'}
              </div>
              <div style={{
                fontSize: 'clamp(11px, 1.1vw, 14px)', fontWeight: 700,
                color: 'rgba(255,255,255,0.92)',
                textShadow: '0 1px 4px rgba(0,0,0,0.85)',
                marginTop: 2,
              }}>{t.cells} Felder</div>
            </div>
          ))}

          {/* HUD top-left: Phase */}
          <div style={{
            position: 'absolute', top: 14, left: 18, zIndex: 5,
            padding: '8px 16px', borderRadius: 999,
            background: 'rgba(13,10,6,0.78)', border: '1.5px solid rgba(34,197,94,0.4)',
            fontSize: 12, fontWeight: 800, color: '#86EFAC',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            backdropFilter: 'blur(8px)',
          }}>
            {currentPhase.emoji} {currentPhase.title}
          </div>

          {/* HUD top-right: Fill % + Steals */}
          <div style={{
            position: 'absolute', top: 14, right: 18, zIndex: 5,
            display: 'flex', gap: 8,
          }}>
            <div style={{
              padding: '8px 14px', borderRadius: 999,
              background: 'rgba(13,10,6,0.78)', border: '1.5px solid rgba(255,255,255,0.18)',
              fontSize: 12, fontWeight: 800, color: '#cbd5e1',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              backdropFilter: 'blur(8px)',
            }}>
              🌍 {(fillPct * 100).toFixed(0)}% voll
            </div>
            {stealEvents > 0 && (
              <div style={{
                padding: '8px 14px', borderRadius: 999,
                background: 'rgba(239,68,68,0.18)', border: '1.5px solid rgba(239,68,68,0.45)',
                fontSize: 12, fontWeight: 800, color: '#FCA5A5',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                backdropFilter: 'blur(8px)',
              }}>
                ⚔️ {stealEvents} Steals
              </div>
            )}
          </div>

          {/* Phase-Beschreibung Bottom */}
          <div style={{
            position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
            zIndex: 5, maxWidth: '80%',
            padding: '10px 22px', borderRadius: 16,
            background: 'rgba(13,10,6,0.85)', border: '1.5px solid rgba(255,255,255,0.18)',
            fontSize: 'clamp(12px, 1.3vw, 16px)', fontWeight: 700, color: '#cbd5e1',
            lineHeight: 1.45, textAlign: 'center',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.4s ease',
          }}>
            {currentPhase.desc}
          </div>

          {/* Fullscreen-Button */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Fullscreen verlassen' : 'Fullscreen'}
            style={{
              position: 'absolute', bottom: 14, right: 18, zIndex: 6,
              width: 42, height: 42, borderRadius: 12,
              background: 'rgba(13,10,6,0.85)', border: '1.5px solid rgba(255,255,255,0.18)',
              fontSize: 18, color: '#cbd5e1', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.22)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(13,10,6,0.85)')}
          >
            {isFullscreen ? '✕' : '⛶'}
          </button>

          {isFullscreen && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 4,
              background: 'rgba(0,0,0,0.4)', zIndex: 5,
            }}>
              <div style={{
                width: `${Math.min(100, (tick / finalTick) * 100)}%`, height: '100%',
                background: 'linear-gradient(90deg, #86EFAC, #34D399)',
                transition: 'width 0.13s linear',
              }} />
            </div>
          )}
        </div>

        {/* Live-Leaderboard */}
        {!isFullscreen && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 6,
            marginBottom: 28, animation: 'pitchFadeIn 0.6s ease 0.15s both',
          }}>
            {sortedTeams.map((t, rank) => (
              <div key={t.id} style={{
                padding: '8px 12px', borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${t.color}40`,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{
                  width: 14, height: 14, borderRadius: 4,
                  background: t.color, flexShrink: 0,
                  boxShadow: `0 0 8px ${t.color}80`,
                }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#F1F5F9' }}>
                    {rank === 0 && '🥇 '}{rank === 1 && '🥈 '}{rank === 2 && '🥉 '}{t.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700 }}>{t.cells} Felder</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Demo-Controls */}
        {!isFullscreen && (
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <button
              onClick={() => { resetGrid(); setTick(0); setRunning(true); }}
              style={{
                padding: '10px 22px', borderRadius: 999,
                background: 'rgba(34,197,94,0.18)',
                border: '1.5px solid rgba(34,197,94,0.5)',
                color: '#86EFAC', fontSize: 14, fontWeight: 800,
                cursor: 'pointer', letterSpacing: '0.06em',
              }}
            >
              ▶ Walkthrough neu starten
            </button>
            <button
              onClick={() => setRunning(r => !r)}
              style={{
                marginLeft: 10,
                padding: '10px 22px', borderRadius: 999,
                background: 'rgba(255,255,255,0.05)',
                border: '1.5px solid rgba(255,255,255,0.18)',
                color: '#cbd5e1', fontSize: 14, fontWeight: 800,
                cursor: 'pointer', letterSpacing: '0.06em',
              }}
            >
              {running ? '⏸ Pause' : '▶ Weiter'}
            </button>
            <button
              onClick={toggleFullscreen}
              style={{
                marginLeft: 10,
                padding: '10px 22px', borderRadius: 999,
                background: 'rgba(168,85,247,0.18)',
                border: '1.5px solid rgba(168,85,247,0.5)',
                color: '#C4B5FD', fontSize: 14, fontWeight: 800,
                cursor: 'pointer', letterSpacing: '0.06em',
              }}
            >
              ⛶ Fullscreen
            </button>
          </div>
        )}

        {/* Phasen-Uebersicht */}
        {!isFullscreen && (
          <Section title="🎬 Walkthrough-Phasen" delay="0.2s">
            <div style={{ display: 'grid', gap: 8 }}>
              {PHASES.map(p => {
                const active = currentPhase.id === p.id;
                return (
                  <div key={p.id} style={{
                    padding: '10px 16px', borderRadius: 12,
                    background: active ? 'rgba(34,197,94,0.14)' : 'rgba(255,255,255,0.03)',
                    border: active ? '1.5px solid rgba(34,197,94,0.55)' : '1px solid rgba(255,255,255,0.08)',
                    fontSize: 14, lineHeight: 1.45, color: active ? '#fff' : '#cbd5e1',
                    transition: 'all 0.3s ease',
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                  }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{p.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 900, color: active ? '#86EFAC' : '#F1F5F9', marginBottom: 2 }}>
                        {p.title}
                      </div>
                      <div style={{ fontSize: 13, opacity: 0.85 }}>{p.desc}</div>
                    </div>
                    {active && (
                      <span style={{
                        marginLeft: 'auto', padding: '3px 10px', borderRadius: 999,
                        background: 'rgba(134,239,172,0.18)', border: '1px solid rgba(134,239,172,0.5)',
                        fontSize: 10, fontWeight: 900, color: '#86EFAC',
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        flexShrink: 0, alignSelf: 'center',
                      }}>läuft</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* FAQ — direkte Antworten auf Kern-Designfragen */}
        {!isFullscreen && (
          <Section title="❓ Was du wissen willst" delay="0.3s">
            <div style={{ display: 'grid', gap: 10 }}>
              <FaqCard
                q="Was passiert, wenn die Karte voll ist?"
                a="Sobald 92% gefüllt sind, schaltet das Spiel ins Endgame: kein normales Wachstum mehr, nur noch Steal. Wer im Endgame am meisten richtig antwortet, übernimmt die Pixel der Nachbarn. Das hält Spannung bis zur letzten Sekunde — auch volle Karten haben Bewegung."
              />
              <FaqCard
                q="Gibt es sowas wie Steal?"
                a="Ja — Steal ist Kernmechanik, nicht Special. Wenn Pixel zweier Teams sich berühren, kann jede richtige Antwort statt Wachstum eine Eroberung auslösen. Im normalen Spiel ist Steal-Chance niedrig (~20%), in der dedizierten Steal-Phase und im Endgame steigt sie auf ~80%."
              />
              <FaqCard
                q="Passt sich das Feld an die Spielerzahl an?"
                a="Ja — 3 Presets oben wählbar. Klein 100×56 (5.600 Pixel) für 20–60 Spieler, Mittel 160×90 (14.400) für 60–200, Groß 220×124 (27.280) für 200–500+. Faustregel: ~50–100 Pixel pro Spieler über die ganze Spielzeit, damit die Karte am Ende wirklich voll wird."
              />
              <FaqCard
                q="Wie viele Teams sind sinnvoll?"
                a="10 Farb-Teams als Standard. Jeder Spieler joint einem Team (eigene Auswahl oder zufällig zugewiesen für Balance). Mit weniger Teams (4–6) wird es übersichtlicher aber langweiliger. Mehr als 10 Farben sind visuell schwer zu unterscheiden auf dem Beamer."
              />
              <FaqCard
                q="Wie wird verhindert, dass starke Teams alles dominieren?"
                a="Drei Catch-up-Mechaniken: (1) Saisonwechsel — kleinere Teams kriegen +50% Wachstum. (2) Spotlight-Question alle 5 Fragen mit 3× Bonus. (3) Schrumpfen — wer aussteigt verliert Pixel, hält Führende aktiv. Plus: Steal verhindert dass ein Team uneinholbar wird."
              />
            </div>
          </Section>
        )}

        {/* Pro/Con */}
        {!isFullscreen && (
          <Section title="⚖️ Pro / Con" delay="0.4s">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              <ProConCard tone="pro" title="Pro" items={[
                'Skaliert von 20 bis 500+ Spielern via Map-Preset',
                'Visuell wow — pixelartige Territorien wirken satisfying',
                'Cozy-Brand: friedlich-ästhetisch statt aggressiv',
                'Jede Antwort zählt sichtbar (1 Pixel = 1 Antwort)',
                'Steal + Endgame halten Spannung bis zum Schluss',
                '10 Farb-Teams = sofort verständlich, kein Branding nötig',
              ]} />
              <ProConCard tone="con" title="Con" items={[
                'Weniger Strategie als klassisches Grid (kein Joker-System)',
                'Balancing zwischen Wachstum/Steal/Catchup muss stimmen',
                'Bedarf neuem Mod-Panel + Beamer-View (mittlerer Aufwand)',
                'Bei <20 Spielern wirkt selbst die kleine Map zu leer',
              ]} />
            </div>
          </Section>
        )}

        {/* CTA */}
        {!isFullscreen && (
          <div style={{
            marginTop: 40, padding: '24px 32px', borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))',
            border: '1.5px solid rgba(34,197,94,0.3)',
            textAlign: 'center', animation: 'pitchFadeIn 0.6s ease 0.6s both',
          }}>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.16em', color: '#86EFAC', textTransform: 'uppercase', marginBottom: 8 }}>
              Status · Pitch / Mockup
            </div>
            <div style={{ fontSize: 16, color: '#cbd5e1', lineHeight: 1.6, maxWidth: 720, margin: '0 auto' }}>
              Diese Seite zeigt nur das KONZEPT. Geschätzter Dev-Aufwand:{' '}
              <b style={{ color: '#FDE68A' }}>~5–7 Tage</b> für Backend (Team-Score, Floodfill,
              Steal-Logik, Sun-Zones, Endgame-Trigger) + Beamer-Canvas + Team-Page.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helper-Komponenten ─────────────────────────────────────────────────────
function Section({ title, delay, children }: { title: string; delay: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28, animation: `pitchFadeIn 0.6s ease ${delay} both` }}>
      <h2 style={{
        fontSize: 'clamp(20px, 2vw, 28px)', fontWeight: 900,
        margin: '0 0 14px', color: '#F1F5F9',
        letterSpacing: '-0.01em',
      }}>{title}</h2>
      {children}
    </div>
  );
}

function FaqCard({ q, a }: { q: string; a: string }) {
  return (
    <div style={{
      padding: '14px 18px', borderRadius: 14,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{
        fontSize: 15, fontWeight: 900, color: '#F1F5F9', marginBottom: 6,
        letterSpacing: '-0.005em',
      }}>{q}</div>
      <div style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.55 }}>{a}</div>
    </div>
  );
}

function ProConCard({ tone, title, items }: { tone: 'pro' | 'con'; title: string; items: string[] }) {
  const isPro = tone === 'pro';
  const accent = isPro ? '#86EFAC' : '#FCA5A5';
  const bg = isPro ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.06)';
  const border = isPro ? 'rgba(34,197,94,0.30)' : 'rgba(239,68,68,0.25)';
  return (
    <div style={{
      padding: '16px 20px', borderRadius: 16,
      background: bg, border: `1.5px solid ${border}`,
    }}>
      <div style={{
        fontSize: 14, fontWeight: 900, letterSpacing: '0.16em',
        textTransform: 'uppercase', color: accent, marginBottom: 12,
      }}>
        {isPro ? '✓ ' : '✕ '}{title}
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
        {items.map((it, i) => (
          <li key={i} style={{
            fontSize: 13, color: '#cbd5e1', lineHeight: 1.5,
            paddingLeft: 14, position: 'relative',
          }}>
            <span style={{
              position: 'absolute', left: 0, color: accent, fontWeight: 900,
            }}>•</span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
