import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

/**
 * CozyWolf Garden — Pitch / Mockup-Page
 *
 * Konzept-Demo fuer Mass-Quiz-Modus (100+ Personen). Statt 8x8-Grid
 * mit Felder-Setzen ein lebendiger "Garten" auf einem geteilten Canvas:
 * jedes Team hat einen Seed-Pixel, das per Floodfill um sich herum waechst.
 * Pro richtige Antwort gewinnt das Team weitere Pixel an seinem Rand.
 *
 * Visualisiert als Cellular Automaton (HTML5 Canvas) — diskrete Pixel
 * statt schwammiger Gradients. User-Feedback 2026-05-01: 'pixel zu fuellen
 * immer wieder um den startpunkt herum, breitet sich das gebiet aus'.
 */

// ── Konstanten ──────────────────────────────────────────────────────────────
const COLS = 160;
const ROWS = 90; // 16:9
const TOTAL_CELLS = COLS * ROWS;
const TICK_MS = 80;
const RESET_AT_TICK = 320;
const RESET_PAUSE_MS = 2200;

// ── Demo-Teams (Mock) ──────────────────────────────────────────────────────
type DemoTeam = {
  id: string;
  name: string;
  color: string;
  // Seed-Position als Index (col, row)
  col: number;
  row: number;
  // Wachstumsrate: Cells pro Tick
  growth: number;
};

const DEMO_TEAMS: DemoTeam[] = [
  { id: 'a', name: 'Wolfsrudel', color: '#3B82F6', col: 12,  row: 14, growth: 5.2 },
  { id: 'b', name: 'Pinguine',   color: '#10B981', col: 148, row: 14, growth: 4.6 },
  { id: 'c', name: 'Faultiere',  color: '#F59E0B', col: 12,  row: 76, growth: 6.4 },
  { id: 'd', name: 'Koalas',     color: '#A855F7', col: 148, row: 76, growth: 3.8 },
  { id: 'e', name: 'Giraffen',   color: '#EC4899', col: 80,  row: 8,  growth: 5.0 },
  { id: 'f', name: 'Waschbären', color: '#06B6D4', col: 80,  row: 82, growth: 3.2 },
  { id: 'g', name: 'Füchse',     color: '#EF4444', col: 28,  row: 45, growth: 5.8 },
  { id: 'h', name: 'Eulen',      color: '#FBBF24', col: 132, row: 45, growth: 2.6 },
];

// ── Page ────────────────────────────────────────────────────────────────────
export default function QQGardenPitchPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Grid: Uint8Array, value = teamIndex+1 (0 = leer)
  const gridRef = useRef<Uint8Array>(new Uint8Array(TOTAL_CELLS));
  const [tick, setTick] = useState(0);
  const [running, setRunning] = useState(true);
  const [teamCounts, setTeamCounts] = useState<number[]>(DEMO_TEAMS.map(() => 0));

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
    if (tick > RESET_AT_TICK) {
      const t = setTimeout(() => {
        resetGrid();
        setTick(0);
      }, RESET_PAUSE_MS);
      return () => clearTimeout(t);
    }
  }, [tick, resetGrid]);

  // ── Per Tick: jedes Team waechst um N Cells ─────────────────────────────
  useEffect(() => {
    if (tick === 0) return;
    const g = gridRef.current;
    const newCounts = [...teamCounts];
    DEMO_TEAMS.forEach((team, ti) => {
      const teamId = ti + 1;
      // Border-Cells finden: eigene mit min. 1 leerem Nachbarn
      const borders: number[] = [];
      for (let i = 0; i < g.length; i++) {
        if (g[i] !== teamId) continue;
        const r = Math.floor(i / COLS);
        const c = i % COLS;
        // 4-Nachbarschaft
        const neighs: number[] = [];
        if (r > 0)        neighs.push((r - 1) * COLS + c);
        if (r < ROWS - 1) neighs.push((r + 1) * COLS + c);
        if (c > 0)        neighs.push(r * COLS + (c - 1));
        if (c < COLS - 1) neighs.push(r * COLS + (c + 1));
        for (const n of neighs) {
          if (g[n] === 0) borders.push(n);
        }
      }
      // Pick N random borders (deduped) und fuellen
      const target = Math.round(team.growth);
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
    // Skalieren auf devicePixelRatio fuer scharfes Pixelart
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
    }
    ctx.imageSmoothingEnabled = false;
    // Clear
    ctx.fillStyle = '#0A1322';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Cell-Size in Pixeln
    const cellW = (cssW * dpr) / COLS;
    const cellH = (cssH * dpr) / ROWS;
    const g = gridRef.current;
    // Render per Cell
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
    // Subtle gradient overlay fuer Cozy-Look
    const grad = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, canvas.width / 2,
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [tick]);

  // ── Sun-Zone (Bonus-Multiplier-Animation) ──────────────────────────────
  const sunZone = useMemo(() => {
    if (tick < 90 || tick > 240) return null;
    const angle = (tick - 90) * 0.035;
    return {
      x: 50 + Math.cos(angle) * 24,
      y: 50 + Math.sin(angle) * 20,
      pulse: Math.sin(tick * 0.18) * 0.3 + 0.7,
    };
  }, [tick]);

  // ── Team-Name-Overlays: Centroid pro Team ─────────────────────────────
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
      if (count < 5) return null; // zu klein, label haengt sonst irgendwo
      const cellCount = teamCounts[ti] ?? count;
      return {
        ...team,
        x: (sumC / count / COLS) * 100,
        y: (sumR / count / ROWS) * 100,
        cells: cellCount,
      };
    }).filter(Boolean) as Array<DemoTeam & { x: number; y: number; cells: number }>;
  }, [tick, teamCounts]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      minHeight: '100vh', background: 'radial-gradient(ellipse at center, #0F1B2A 0%, #060A12 70%)',
      color: '#F1F5F9', fontFamily: 'Nunito, system-ui, sans-serif',
      padding: '40px 20px',
    }}>
      <style>{`
        @keyframes pitchFadeIn { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }
        @keyframes pitchPulse  { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 36, animation: 'pitchFadeIn 0.6s ease both' }}>
          <div style={{
            display: 'inline-block', padding: '6px 18px', borderRadius: 999,
            background: 'rgba(34,197,94,0.15)', border: '1.5px solid rgba(34,197,94,0.4)',
            fontSize: 13, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase',
            color: '#86EFAC', marginBottom: 14,
          }}>
            🌱 Pitch · Variante A · Mass-Mode
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
            Mass-Quiz-Modus für 100+ Personen. Jedes Team startet mit einem Pixel und breitet
            sich pro richtiger Antwort um den Startpunkt herum aus. Am Ende ein lebendiges
            Mosaik — wer mehr Antworten landet, erobert mehr Territorium.
          </p>
        </div>

        {/* Live-Demo Canvas (Pixel-Floodfill) */}
        <div style={{
          position: 'relative', maxWidth: 1100, margin: '0 auto 28px',
          aspectRatio: '16/9',
          borderRadius: 24,
          background: '#0A1322',
          border: '2px solid rgba(34,197,94,0.18)',
          boxShadow: '0 0 80px rgba(34,197,94,0.10), 0 20px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          animation: 'pitchFadeIn 0.7s ease 0.1s both',
        }}>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }}
          />

          {/* Sun-Zone Overlay (Bonus-Multiplier) */}
          {sunZone && (
            <div style={{
              position: 'absolute',
              left: `${sunZone.x}%`, top: `${sunZone.y}%`,
              width: 120, height: 120,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(251,191,36,${0.35 * sunZone.pulse}) 0%, rgba(251,191,36,${0.15 * sunZone.pulse}) 40%, transparent 75%)`,
              pointerEvents: 'none', zIndex: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 38,
              animation: 'pitchPulse 1.6s ease-in-out infinite',
            }}>
              ☀️
            </div>
          )}

          {/* Team-Labels (Centroid-positioniert) */}
          {teamLabels.map(t => (
            <div key={t.id} style={{
              position: 'absolute',
              left: `${t.x}%`, top: `${t.y}%`,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none', zIndex: 4,
              textAlign: 'center',
              transition: 'left 0.4s ease, top 0.4s ease',
            }}>
              <div style={{
                fontSize: 18, fontWeight: 900, color: '#fff',
                textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 12px rgba(0,0,0,0.6)',
                letterSpacing: '0.02em',
              }}>{t.name}</div>
              <div style={{
                fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
                textShadow: '0 1px 4px rgba(0,0,0,0.85)',
                marginTop: 2,
              }}>{t.cells} Felder</div>
            </div>
          ))}

          {/* HUD top-left */}
          <div style={{
            position: 'absolute', top: 14, left: 18, zIndex: 5,
            padding: '6px 14px', borderRadius: 999,
            background: 'rgba(13,10,6,0.7)', border: '1.5px solid rgba(34,197,94,0.35)',
            fontSize: 12, fontWeight: 800, color: '#86EFAC',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            backdropFilter: 'blur(6px)',
          }}>
            🌱 Garden · Runde {Math.floor(tick / 30) + 1}
          </div>

          {/* HUD top-right */}
          <div style={{
            position: 'absolute', top: 14, right: 18, zIndex: 5,
            padding: '6px 14px', borderRadius: 999,
            background: 'rgba(13,10,6,0.7)', border: '1.5px solid rgba(255,255,255,0.18)',
            fontSize: 12, fontWeight: 800, color: '#cbd5e1',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            backdropFilter: 'blur(6px)',
          }}>
            👥 8 Teams · 102 Spieler
          </div>

          {/* Sun-Bonus-Hint */}
          {sunZone && (
            <div style={{
              position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 5,
              padding: '6px 16px', borderRadius: 999,
              background: 'rgba(251,191,36,0.18)', border: '1.5px solid rgba(251,191,36,0.5)',
              fontSize: 12, fontWeight: 800, color: '#FDE68A',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              animation: 'pitchPulse 1.2s ease-in-out infinite',
            }}>
              ☀️ Sonnen-Bonus aktiv — Bereich um Sonne wächst doppelt!
            </div>
          )}
        </div>

        {/* Demo-Controls */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
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
            ▶ Demo neu starten
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
        </div>

        {/* Wie es funktioniert */}
        <Section title="🌱 Wie es funktioniert" delay="0.2s">
          <BulletList items={[
            '8-12 Teams (10-20 Personen pro Team) — jeder Mitspieler tippt eigenständig auf seinem Handy',
            'Jedes Team startet mit 1 Pixel an einer Ecke der Karte',
            'Pro richtiger Antwort eines Team-Mitglieds wächst das Territorium um 1 Pixel — Floodfill rund um den Rand',
            'Engagement zählt: bei 10/10 richtig wachsen 10 Pixel, bei 1/10 nur 1 Pixel',
            'Am Ende: das Team mit den meisten Pixeln hat das größte Territorium → gewonnen',
          ]} />
        </Section>

        {/* Tension-Mechaniken */}
        <Section title="🎭 Tension-Mechaniken (gegen Langeweile)" delay="0.3s">
          <div style={{ display: 'grid', gap: 12 }}>
            <Card emoji="☀️" title="Sonnen-Zonen (Bonus-Multiplier)" desc="Periodisch erscheint eine Sonnen-Zone an Random-Position. Pixel die innerhalb der Zone wachsen, geben dem Team doppelte Wachstumsrate bis zur nächsten Frage. Belohnt schnelles Reagieren und Glück." />
            <Card emoji="🌗" title="Saisons" desc="Spiel hat 4 Phasen (Frühling → Sommer → Herbst → Winter). Jede Saison verändert Look + Gameplay-Modifier (z. B. 'Winter: nur Top-3-Teams wachsen weiter')." />
            <Card emoji="✨" title="Spotlight-Question" desc="Alle 5 Fragen eine 'Doppelte Wachstums-Frage' mit Drama-Build-up. Macht den Sieg umkämpft bis zur letzten Sekunde." />
            <Card emoji="🌧️" title="Schrumpfen bei Inaktivität" desc="Wenn ein Team 2 Fragen in Folge keine Antworten gibt, schrumpft das Territorium leicht (Pixel am Rand werden frei). Verhindert dass führende Teams 'aussteigen'." />
          </div>
        </Section>

        {/* Pro/Con */}
        <Section title="⚖️ Pro / Con" delay="0.4s">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            <ProConCard tone="pro" title="Pro" items={[
              'Skaliert bis 200+ Personen ohne Architekturänderung',
              'Visuell wow — pixelartige Territorien fühlen sich satisfying an',
              'Cozy-Brand: friedlich + ästhetisch statt aggressiv-kompetitiv',
              'Jede einzelne Antwort zählt sichtbar (1 Pixel = 1 richtige Antwort)',
              'Neuer USP — kaum andere Quiz-Apps haben sowas',
            ]} />
            <ProConCard tone="con" title="Con" items={[
              'Weniger Strategie als das klassische Grid (Kein Klauen, Stapeln, Joker)',
              'Risiko: Führendes Team baut Vorsprung aus → Schluss-Spannung leidet',
              'Bedarf neuem Mod-Panel + Beamer-View (mittlerer Dev-Aufwand)',
              'Balancing zwischen "Quantität (mehr Spieler)" vs "Qualität (% richtig)" muss stimmen',
            ]} />
          </div>
        </Section>

        {/* Verwendungs-Szenarien */}
        <Section title="🎪 Wo CozyWolf Garden glänzt" delay="0.5s">
          <BulletList items={[
            'Hochzeiten / Geburtstage mit 80-150 Gästen (statt klassisches Pub-Quiz)',
            'Firmen-Galas + Weihnachtsfeiern (200+ Personen, kein 8-Teams-Cap)',
            'Schul-Events (Klassen-Battle, Schulfest, Abi-Ball)',
            'Vereinsabende (Sport-Saisonabschluss, Feuerwehr, Karneval)',
            'Festivals / Pre-Show-Entertainment (Warmup-Mode für Events)',
          ]} />
        </Section>

        {/* CTA */}
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
            Diese Seite zeigt nur das KONZEPT. Die Mechanik existiert noch nicht im Code.
            Geschätzter Dev-Aufwand: <b style={{ color: '#FDE68A' }}>~5-7 Tage</b> für Backend
            (Team-Score-Tracking, Floodfill-Pixel-Logik, Sun-Zones), Beamer-Canvas-View,
            Team-Page-Anpassung (gleiches UI, aber Mass-Mode).
          </div>
        </div>
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

function BulletList({ items }: { items: string[] }) {
  return (
    <ul style={{
      listStyle: 'none', padding: 0, margin: 0,
      display: 'grid', gap: 8,
    }}>
      {items.map((it, i) => (
        <li key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '10px 16px', borderRadius: 12,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          fontSize: 14, lineHeight: 1.5, color: '#cbd5e1',
        }}>
          <span style={{ color: '#86EFAC', fontWeight: 900, flexShrink: 0 }}>›</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function Card({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div style={{
      padding: '14px 18px', borderRadius: 14,
      background: 'rgba(34,197,94,0.06)',
      border: '1.5px solid rgba(34,197,94,0.18)',
      display: 'flex', gap: 14, alignItems: 'flex-start',
    }}>
      <div style={{ fontSize: 28, flexShrink: 0 }}>{emoji}</div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#86EFAC', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>{desc}</div>
      </div>
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
