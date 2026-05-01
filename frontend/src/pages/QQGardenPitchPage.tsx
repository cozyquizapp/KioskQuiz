import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

/**
 * CozyWolf Garden — Pitch / Mockup-Page mit Walkthrough
 *
 * Zeigt das Konzept als Live-Demo mit ALLEN Specials in Sequenz:
 * intro → sun-zones → saisons → spotlight-question → schrumpfen → finale.
 * 10 Teams (skalierbar fuer Festivals: jeder joint einem der 10 Teams).
 * Pixel-Floodfill auf 160x90-Grid (HTML5 Canvas), langsamere Animation
 * fuer ruhigeren Pitch-Eindruck.
 */

// ── Konstanten ──────────────────────────────────────────────────────────────
const COLS = 160;
const ROWS = 90;
const TOTAL_CELLS = COLS * ROWS;
const TICK_MS = 130; // langsamer (vorher 80) fuer ruhigeren Pitch-Eindruck
const RESET_PAUSE_MS = 3500;

// Walkthrough-Phasen mit Tick-Bereichen
type PhaseId = 'intro' | 'sun' | 'seasons' | 'spotlight' | 'shrink' | 'finale';
const PHASES: Array<{
  id: PhaseId; from: number; to: number; emoji: string; title: string; desc: string;
}> = [
  { id: 'intro',     from: 0,   to: 60,  emoji: '🌱', title: 'Gärten beginnen zu wachsen', desc: 'Jedes Team startet mit 1 Pixel an seinem Spawn-Punkt. Pro richtiger Antwort breitet sich das Territorium um seinen Rand aus.' },
  { id: 'sun',       from: 60,  to: 130, emoji: '☀️', title: 'Sonnen-Zone erscheint', desc: 'Bonus-Mechanik: Pixel die innerhalb der Sonne wachsen, geben dem Team doppelte Wachstumsrate. Sonne wandert über die Karte — schnelle Teams nutzen sie.' },
  { id: 'seasons',   from: 130, to: 200, emoji: '🍂', title: 'Saisonwechsel: Herbst', desc: 'Spiel hat 4 Saisons (Frühling → Sommer → Herbst → Winter). Jede Saison verändert Farb-Stimmung + Gameplay-Modifier — z. B. „Herbst: schwächere Teams wachsen +50% schneller" (Aufholmechanik).' },
  { id: 'spotlight', from: 200, to: 270, emoji: '✨', title: 'Spotlight-Question — 3× Bonus!', desc: 'Alle 5 Fragen erscheint eine Spotlight-Question. Das Team mit der schnellsten richtigen Antwort bekommt 3× Wachstum. Hier holen die Wolfsrudel auf!' },
  { id: 'shrink',    from: 270, to: 340, emoji: '🌧️', title: 'Eulen werden inaktiv...', desc: 'Wenn ein Team 2 Fragen in Folge keine Antwort gibt, schrumpft das Territorium am Rand. Verhindert dass Führende „aussteigen" und hält alle bis zum Ende dabei.' },
  { id: 'finale',    from: 340, to: 420, emoji: '🏆', title: 'Finale — wer hat am meisten?', desc: 'Am Ende der Spielzeit wird das größte Territorium gefeiert. Die Karte ist ein lebendiges Mosaik aus dem gesamten Event.' },
];

// ── Demo-Teams (10 fuer Festival-Skalierung) ───────────────────────────────
type DemoTeam = {
  id: string; name: string; color: string;
  col: number; row: number; growth: number;
};

const DEMO_TEAMS: DemoTeam[] = [
  { id: 'a', name: 'Wolfsrudel', color: '#3B82F6', col: 12,  row: 14, growth: 3.0 },
  { id: 'b', name: 'Pinguine',   color: '#10B981', col: 148, row: 14, growth: 2.6 },
  { id: 'c', name: 'Faultiere',  color: '#F59E0B', col: 12,  row: 76, growth: 3.4 },
  { id: 'd', name: 'Koalas',     color: '#A855F7', col: 148, row: 76, growth: 2.4 },
  { id: 'e', name: 'Giraffen',   color: '#EC4899', col: 80,  row: 8,  growth: 2.8 },
  { id: 'f', name: 'Waschbären', color: '#06B6D4', col: 80,  row: 82, growth: 2.0 },
  { id: 'g', name: 'Füchse',     color: '#EF4444', col: 28,  row: 45, growth: 3.2 },
  { id: 'h', name: 'Eulen',      color: '#FBBF24', col: 132, row: 45, growth: 1.8 },
  { id: 'i', name: 'Bienen',     color: '#65A30D', col: 56,  row: 30, growth: 2.4 },
  { id: 'j', name: 'Otter',      color: '#FB7185', col: 104, row: 60, growth: 2.6 },
];

const SPOTLIGHT_TEAM_IDX = 0; // Wolfsrudel kriegt Spotlight
const SHRINK_TEAM_IDX = 7;    // Eulen schrumpfen

// ── Page ────────────────────────────────────────────────────────────────────
export default function QQGardenPitchPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<Uint8Array>(new Uint8Array(TOTAL_CELLS));
  const [tick, setTick] = useState(0);
  const [running, setRunning] = useState(true);
  const [teamCounts, setTeamCounts] = useState<number[]>(DEMO_TEAMS.map(() => 0));
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Phase basierend auf Tick ───────────────────────────────────────────
  const currentPhase = useMemo(() => {
    return PHASES.find(p => tick >= p.from && tick < p.to) ?? PHASES[PHASES.length - 1];
  }, [tick]);

  const finalTick = PHASES[PHASES.length - 1].to;

  // ── Init: Seed-Pixel pro Team setzen ───────────────────────────────────
  const resetGrid = useCallback(() => {
    const g = new Uint8Array(TOTAL_CELLS);
    DEMO_TEAMS.forEach((t, i) => {
      const idx = t.row * COLS + t.col;
      g[idx] = i + 1;
    });
    gridRef.current = g;
    setTeamCounts(DEMO_TEAMS.map(() => 1));
  }, []);

  useEffect(() => { resetGrid(); }, [resetGrid]);

  // ── Ticker ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setTick(t => t + 1), TICK_MS);
    return () => clearInterval(iv);
  }, [running]);

  // ── Reset-Loop fuer Demo ────────────────────────────────────────────────
  useEffect(() => {
    if (tick > finalTick) {
      const t = setTimeout(() => {
        resetGrid();
        setTick(0);
      }, RESET_PAUSE_MS);
      return () => clearTimeout(t);
    }
  }, [tick, finalTick, resetGrid]);

  // ── Sun-Zone-Position waehrend sun-Phase ───────────────────────────────
  const sunZone = useMemo(() => {
    if (currentPhase.id !== 'sun') return null;
    const localTick = tick - currentPhase.from;
    const angle = localTick * 0.05;
    const cx = 50 + Math.cos(angle) * 24;
    const cy = 50 + Math.sin(angle) * 18;
    return {
      x: cx, y: cy,
      // Pixel-Koordinaten fuer Growth-Boost
      pcol: Math.round((cx / 100) * COLS),
      prow: Math.round((cy / 100) * ROWS),
      pulse: Math.sin(tick * 0.18) * 0.3 + 0.7,
    };
  }, [tick, currentPhase]);

  // ── Per Tick: Wachstum + Phase-Modifier ─────────────────────────────────
  useEffect(() => {
    if (tick === 0) return;
    const g = gridRef.current;
    const newCounts = [...teamCounts];

    // SHRINK-Phase: Eulen verlieren Border-Pixel
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
        // Border-Cell = mind. 1 leerer Nachbar ODER mind. 1 fremder Nachbar
        const isBorder = neighs.some(n => g[n] === 0 || (g[n] !== 0 && g[n] !== teamId));
        if (isBorder) lossTargets.push(i);
      }
      // 4-6 Pixel pro Tick verlieren
      const lossCount = Math.min(5, lossTargets.length);
      for (let k = 0; k < lossCount; k++) {
        const idx = Math.floor(Math.random() * lossTargets.length);
        const cellIdx = lossTargets.splice(idx, 1)[0];
        if (g[cellIdx] === teamId) {
          g[cellIdx] = 0;
          newCounts[SHRINK_TEAM_IDX]--;
        }
      }
    }

    DEMO_TEAMS.forEach((team, ti) => {
      const teamId = ti + 1;
      // Phase-Modifier auf growth-rate
      let growthMul = 1;
      // Spotlight: Wolfsrudel waechst 3x
      if (currentPhase.id === 'spotlight' && ti === SPOTLIGHT_TEAM_IDX) growthMul = 3;
      // Saisons (Herbst): kleinere Teams +50% (catch-up)
      if (currentPhase.id === 'seasons') {
        const myCount = teamCounts[ti] ?? 0;
        const maxCount = Math.max(...teamCounts, 1);
        if (myCount < maxCount * 0.5) growthMul = 1.5;
      }

      // Border-Cells finden
      const borders: number[] = [];
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
          if (g[n] === 0) borders.push(n);
        }
      }
      const target = Math.round(team.growth * growthMul);
      const seen = new Set<number>();
      for (let k = 0; k < target && borders.length > 0; k++) {
        const idx = Math.floor(Math.random() * borders.length);
        const cellIdx = borders[idx];
        borders.splice(idx, 1);
        if (seen.has(cellIdx)) { k--; continue; }
        seen.add(cellIdx);
        if (g[cellIdx] === 0) {
          g[cellIdx] = teamId;
          newCounts[ti]++;
          // SUN-ZONE Bonus: extra Pixel wenn nahe Sonne
          if (sunZone) {
            const r = Math.floor(cellIdx / COLS);
            const c = cellIdx % COLS;
            const dx = c - sunZone.pcol;
            const dy = r - sunZone.prow;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 14) {
              // Doppeltes Wachstum: zusaetzlich noch 1 random border-cell
              if (borders.length > 0) {
                const idx2 = Math.floor(Math.random() * borders.length);
                const cell2 = borders.splice(idx2, 1)[0];
                if (g[cell2] === 0) {
                  g[cell2] = teamId;
                  newCounts[ti]++;
                }
              }
            }
          }
        }
      }
    });
    setTeamCounts(newCounts);
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
    // Saison-Tönung des Backgrounds
    let bg = '#0A1322';
    if (currentPhase.id === 'seasons') bg = '#1F1810'; // Herbst-warm
    if (currentPhase.id === 'shrink') bg = '#0E1F2A';  // Regen-blau
    if (currentPhase.id === 'finale') bg = '#160E26'; // Festlich-violett
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
    // Saison-Tint-Overlay
    if (currentPhase.id === 'seasons') {
      ctx.fillStyle = 'rgba(251,146,60,0.10)'; // Herbst-orange-Schleier
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (currentPhase.id === 'shrink') {
      ctx.fillStyle = 'rgba(56,189,248,0.06)'; // Kühler blauer Schleier
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    // Subtle vignette
    const grad = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, canvas.width / 2,
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [tick, currentPhase]);

  // ── Team-Labels: Centroid pro Team ────────────────────────────────────
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
        isShrinking: currentPhase.id === 'shrink' && ti === SHRINK_TEAM_IDX,
      };
    }).filter(Boolean) as Array<DemoTeam & { x: number; y: number; cells: number; isSpotlight: boolean; isShrinking: boolean }>;
  }, [tick, teamCounts, currentPhase]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Rendering ──────────────────────────────────────────────────────────
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
            10 Teams, beliebige Spielerzahl. Jeder joint einem Team — pro richtiger Antwort
            wachsen Pixel um den Spawn-Punkt. Demo zeigt alle 6 Phasen nacheinander.
          </p>
        </div>

        {/* Live-Demo Canvas */}
        <div
          ref={containerRef}
          style={{
            position: 'relative', maxWidth: isFullscreen ? '100%' : 1200, margin: '0 auto 20px',
            aspectRatio: isFullscreen ? undefined : '16/9',
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

          {/* Sun-Zone Overlay */}
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

          {/* Team-Labels */}
          {teamLabels.map(t => (
            <div key={t.id} style={{
              position: 'absolute',
              left: `${t.x}%`, top: `${t.y}%`,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none', zIndex: 4,
              textAlign: 'center',
              transition: 'left 0.5s ease, top 0.5s ease',
              opacity: t.isShrinking ? 0.6 : 1,
            }}>
              <div style={{
                fontSize: t.isSpotlight ? 'clamp(20px, 2vw, 26px)' : 'clamp(15px, 1.5vw, 20px)',
                fontWeight: 900, color: '#fff',
                textShadow: '0 2px 8px rgba(0,0,0,0.85), 0 0 12px rgba(0,0,0,0.7)',
                letterSpacing: '0.02em',
                animation: t.isSpotlight ? 'spotlightGlow 1.2s ease-in-out infinite' : undefined,
              }}>
                {t.isSpotlight && '✨ '}
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

          {/* HUD top-right: Teams */}
          <div style={{
            position: 'absolute', top: 14, right: 18, zIndex: 5,
            padding: '8px 16px', borderRadius: 999,
            background: 'rgba(13,10,6,0.78)', border: '1.5px solid rgba(255,255,255,0.18)',
            fontSize: 12, fontWeight: 800, color: '#cbd5e1',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            backdropFilter: 'blur(8px)',
          }}>
            👥 10 Teams · ∞ Spieler
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

          {/* Fullscreen-spezifische Phase-Progress-Bar oben */}
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

        {/* Demo-Controls (nicht im Fullscreen, da sind Buttons in Canvas) */}
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
          <Section title="🎬 Was du gerade siehst (Walkthrough)" delay="0.2s">
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

        {/* Pro/Con */}
        {!isFullscreen && (
          <Section title="⚖️ Pro / Con" delay="0.4s">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              <ProConCard tone="pro" title="Pro" items={[
                'Skaliert von 30 bis 500+ Personen ohne Architekturänderung',
                'Visuell wow — pixelartige Territorien fühlen sich satisfying an',
                'Cozy-Brand: friedlich + ästhetisch statt aggressiv-kompetitiv',
                'Jede einzelne Antwort zählt sichtbar (Pixel)',
                'Festival-tauglich: 10 fixe Teams, jeder joint einem',
              ]} />
              <ProConCard tone="con" title="Con" items={[
                'Weniger Strategie als das klassische Grid (Kein Klauen, Stapeln, Joker)',
                'Risiko: Führendes Team baut Vorsprung aus → Schluss-Spannung leidet',
                'Bedarf neuem Mod-Panel + Beamer-View (mittlerer Dev-Aufwand)',
                'Balancing zwischen "Quantität (mehr Spieler)" vs "Qualität (% richtig)" muss stimmen',
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
              Diese Seite zeigt nur das KONZEPT mit Walkthrough aller Specials.
              Geschätzter Dev-Aufwand: <b style={{ color: '#FDE68A' }}>~5-7 Tage</b> für Backend
              (Team-Score, Floodfill, Sun-Zones, Spotlight-Logik, Schrumpfen) + Beamer-Canvas
              + Team-Page-Anpassung.
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
