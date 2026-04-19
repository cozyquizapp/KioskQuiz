// QQ Round-Transition Lab
// ───────────────────────
// Testplatz für Rundenwechsel-Animationen. Zeigt 3 Varianten nebeneinander,
// jede mit eigenem Replay-Button. Mock-State wird lokal gehalten — keine
// Socket-Verbindung nötig.
//
// Varianten:
//   A) Domino-Victory — Tree flutscht rein, 5 Dots der alten Runde zünden
//                       nacheinander ihr ✓, Amber-Linie wächst mit, Label
//                       wechselt, Tree fliegt raus.
//   B) Metro-Fahrt    — Kamera pant über den Rail: vom letzten Dot der alten
//                       Runde smooth rüber durch die Phase-Lücke zum ersten
//                       Dot der neuen.
//   C) Zoom-Out Overview — Alt-Folie schrumpft, Tree zoomt auf Vogelperspektive,
//                       Runde 1 blitzt grün, Runde 2 glüht auf, Zoom in Richtung
//                       Runde 2, Neu-Folie kommt.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import QQProgressTree from '../components/QQProgressTree';
import type { QQStateUpdate, QQCategory, QQScheduleEntry } from '../../../shared/quarterQuizTypes';

// ── Mock-State ────────────────────────────────────────────────────────────────
const MOCK_CATEGORIES: QQCategory[] = ['SCHAETZCHEN', 'MUCHO', 'BUNTE_TUETE', 'ZEHN_VON_ZEHN', 'CHEESE'];
function buildSchedule(): QQScheduleEntry[] {
  const out: QQScheduleEntry[] = [];
  for (let p = 1; p <= 3; p++) {
    for (let i = 0; i < 5; i++) {
      out.push({ phase: p as 1 | 2 | 3, category: MOCK_CATEGORIES[i] });
    }
  }
  return out;
}

function mockState(phase: 1 | 2 | 3, questionIdx: number): QQStateUpdate {
  return {
    phase: 'PHASE_INTRO',
    gamePhaseIndex: phase,
    totalPhases: 3,
    questionIndex: questionIdx,
    schedule: buildSchedule(),
    teams: [],
    language: 'de',
    answers: [],
    grid: [],
    teamsRevealStartedAt: undefined,
    currentQuestion: undefined,
    sfxMuted: true,
    musicMuted: true,
    volume: 0,
    rulesSlideIndex: 0,
    setupDone: true,
    gridSize: 6,
    totalQuestions: 15,
    // Rest darf null/undefined bleiben — QQProgressTree liest nur schedule/questionIndex/gamePhaseIndex/totalPhases/language
  } as any;
}

// ── Mock-Slides (alt / neu) ───────────────────────────────────────────────────
function MockSlide({ round, palette }: { round: number; palette: { bg: string; glow: string; accent: string } }) {
  return (
    <div style={{
      width: '100%', height: '100%', borderRadius: 18,
      background: palette.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 16, position: 'relative', overflow: 'hidden',
      boxShadow: `0 0 60px ${palette.glow}`,
    }}>
      <div style={{
        position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.45)', color: '#fde68a',
        padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 900,
        letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>Runde {round} von 3</div>
      <div style={{
        fontSize: 'clamp(46px, 5.6vw, 96px)', fontWeight: 900, color: palette.accent,
        letterSpacing: '0.04em',
        textShadow: `0 4px 20px ${palette.glow}`,
      }}>
        Runde {round}
      </div>
      <div style={{ fontSize: 'clamp(18px, 2vw, 26px)', fontWeight: 800, color: '#f8fafc' }}>
        {round === 1 ? 'Erobert das Spielfeld!' : round === 2 ? 'Angriff & Verteidigung!' : 'Finale Schlacht!'}
      </div>
    </div>
  );
}

const PALETTES = [
  { bg: 'radial-gradient(ellipse at 30% 50%, #1e3a8a 0%, #0b1220 70%)', glow: 'rgba(59,130,246,0.4)', accent: '#93c5fd' },
  { bg: 'radial-gradient(ellipse at 30% 50%, #92400e 0%, #1c1208 70%)', glow: 'rgba(245,158,11,0.4)', accent: '#fcd34d' },
  { bg: 'radial-gradient(ellipse at 30% 50%, #7f1d1d 0%, #1a0b0b 70%)', glow: 'rgba(239,68,68,0.4)', accent: '#fca5a5' },
];

// ═════════════════════════════════════════════════════════════════════════════
// Shared styles for a preview stage
// ═════════════════════════════════════════════════════════════════════════════
const STAGE_STYLE: React.CSSProperties = {
  position: 'relative',
  width: '100%', aspectRatio: '16/9',
  borderRadius: 16,
  background: '#020617',
  border: '1px solid rgba(148,163,184,0.15)',
  overflow: 'hidden',
};

// ═════════════════════════════════════════════════════════════════════════════
// VARIANT A — Domino-Victory
// ═════════════════════════════════════════════════════════════════════════════
function VariantA({ playKey }: { playKey: number }) {
  // Timeline (ms):  0 — alt-Slide sichtbar
  //              300 — alt-Slide slidet links raus, Tree slidet von rechts rein
  //              700 — Tree zentriert, Domino startet
  //              700+5*120 = 1300 — Domino fertig, Phase-Label wechselt
  //              1500 — Tree slidet links raus, neue Folie kommt von rechts
  //              2000 — fertig
  const oldS = useMemo(() => mockState(1, 4), []);  // last Q von Phase 1
  const newS = useMemo(() => mockState(2, 5), []);  // first Q von Phase 2

  return (
    <div key={playKey} style={STAGE_STYLE}>
      <style>{`
        @keyframes vaOldOut   { 0%{transform:translateX(0)}  100%{transform:translateX(-110%)} }
        @keyframes vaNewIn    { 0%{transform:translateX(110%)} 100%{transform:translateX(0)} }
        @keyframes vaTreeInOut{
          0%  { transform:translateX(110%) scale(0.88); opacity:0; }
          22% { transform:translateX(0)    scale(1);    opacity:1; }
          78% { transform:translateX(0)    scale(1);    opacity:1; }
          100%{ transform:translateX(-110%) scale(0.88); opacity:0; }
        }
        @keyframes vaDominoFlash {
          0%  { box-shadow: 0 0 0 rgba(34,197,94,0); transform: scale(1); }
          40% { box-shadow: 0 0 0 8px rgba(34,197,94,0.5), 0 0 30px rgba(34,197,94,0.9); transform: scale(1.25); }
          100%{ box-shadow: 0 0 0 rgba(34,197,94,0); transform: scale(1); }
        }
      `}</style>
      {/* Alt-Slide */}
      <div style={{
        position: 'absolute', inset: '6%',
        animation: 'vaOldOut 400ms cubic-bezier(0.6,0,0.8,0.2) 300ms both',
      }}>
        <MockSlide round={1} palette={PALETTES[0]} />
      </div>
      {/* Neu-Slide */}
      <div style={{
        position: 'absolute', inset: '6%',
        animation: 'vaNewIn 500ms cubic-bezier(0.2,0.8,0.2,1) 1500ms both',
      }}>
        <MockSlide round={2} palette={PALETTES[1]} />
      </div>
      {/* Tree-Overlay */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        animation: 'vaTreeInOut 1800ms cubic-bezier(0.4,0,0.2,1) 300ms both',
        pointerEvents: 'none',
      }}>
        <div style={{
          background: 'rgba(2,6,23,0.82)',
          backdropFilter: 'blur(8px)',
          padding: '20px 28px', borderRadius: 20,
          border: '2px solid rgba(251,191,36,0.4)',
          boxShadow: '0 0 80px rgba(251,191,36,0.3)',
        }}>
          <DominoTree oldState={oldS} newState={newS} playKey={playKey} />
        </div>
      </div>
    </div>
  );
}

// Domino variant of the tree: runs ✓ flashes on the last 5 dots before swapping
// to the new state. Visually the amber line grows through all 5 in a wave.
function DominoTree({ oldState, newState, playKey }: { oldState: QQStateUpdate; newState: QQStateUpdate; playKey: number }) {
  const [treeState, setTreeState] = useState(oldState);
  useMemo(() => {
    // Schedule the state-swap at ~1000ms into the tree-visible window so the
    // CSS-transition in the tree lights up the new amber section smoothly.
    setTreeState(oldState);
    const t = setTimeout(() => setTreeState(newState), 900);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playKey]);

  return (
    <div style={{ position: 'relative' }}>
      <QQProgressTree state={treeState} variant="hero" title="🏁 Runde 1 geschafft!" />
      {/* Domino-Flash-Dots über den 5 ersten Dots der Phase 1 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
        {[0,1,2,3,4].map(i => (
          <div
            key={i}
            style={{
              position: 'absolute',
              // Grobe Positions-Schätzung — Domino-Dots liegen am Tree-Rail. Tree
              // rendert sie selbst, dieser Overlay nur für den Glow-Flash.
              top: '52%', left: `calc(${12 + i * 11}% + 0px)`,
              width: 28, height: 28, borderRadius: '50%',
              animation: `vaDominoFlash 360ms ease-out ${300 + i * 120}ms both`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// VARIANT B — Metro-Fahrt
// ═════════════════════════════════════════════════════════════════════════════
function VariantB({ playKey }: { playKey: number }) {
  // Horizontale Kamera-Fahrt. Ein langer Rail-Strip scrollt von rechts nach
  // links vorbei. Oben: alt-Slide als „Bahnhofsschild", in der Mitte Rail,
  // rechts kommt der neue Bahnhof mit neu-Slide rein.
  const fullS = useMemo(() => mockState(2, 5), []);

  return (
    <div key={playKey} style={STAGE_STYLE}>
      <style>{`
        @keyframes vbPan { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes vbSignFade {
          0%, 20% { opacity: 1; transform: translateY(0) scale(1); }
          30%, 40% { opacity: 0.6; transform: translateY(-6px) scale(0.96); filter: blur(2px); }
          60%, 100% { opacity: 0; transform: translateY(-14px) scale(0.85); filter: blur(6px); }
        }
        @keyframes vbSignArrive {
          0%, 55% { opacity: 0; transform: translateY(14px) scale(0.85); filter: blur(6px); }
          75% { opacity: 1; transform: translateY(-2px) scale(1.04); filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
      `}</style>
      {/* Pan-Viewport: zwei Slides + Tree in der Mitte, Breite 200%, scrollt */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        animation: 'vbPan 2000ms cubic-bezier(0.5,0,0.3,1) 0ms both',
        width: '200%',
      }}>
        <div style={{
          flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 24, padding: '6%',
        }}>
          {/* Bahnhofsschild alt: Slide 1 */}
          <div style={{ animation: 'vbSignFade 2000ms ease both', transformOrigin: 'center' }}>
            <MockSlide round={1} palette={PALETTES[0]} />
          </div>
          {/* Bahnhofsschild neu: Slide 2 */}
          <div style={{ animation: 'vbSignArrive 2000ms ease both', transformOrigin: 'center' }}>
            <MockSlide round={2} palette={PALETTES[1]} />
          </div>
        </div>
        {/* Rail unterhalb — die ganze Breite, mitscrollend */}
        <div style={{
          position: 'absolute', bottom: '6%', left: 0, right: 0,
          display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            transform: 'scale(0.88)', transformOrigin: 'center',
          }}>
            <QQProgressTree state={fullS} variant="hero" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// VARIANT C — Zoom-Out Overview
// ═════════════════════════════════════════════════════════════════════════════
function VariantC({ playKey }: { playKey: number }) {
  // Alt-Slide zoomt weg (top-right), Tree zoomt in Vogelperspektive, Runde 1
  // blitzt grün, Runde 2 glüht auf, dann zoomt Kamera Richtung Runde 2,
  // Neu-Slide slidet aus bottom-left rein.
  const oldS = useMemo(() => mockState(1, 4), []);
  const newS = useMemo(() => mockState(2, 5), []);
  const [treeState, setTreeState] = useState(oldS);
  useMemo(() => {
    setTreeState(oldS);
    const t = setTimeout(() => setTreeState(newS), 1200);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playKey]);

  return (
    <div key={playKey} style={STAGE_STYLE}>
      <style>{`
        @keyframes vcOldShrink {
          0%  { transform: scale(1) translate(0,0); opacity: 1; filter: blur(0); }
          100%{ transform: scale(0.25) translate(140%, -140%); opacity: 0; filter: blur(4px); }
        }
        @keyframes vcTreeIn {
          0%  { transform: scale(0.4); opacity: 0; filter: blur(6px); }
          55% { transform: scale(1.02); opacity: 1; filter: blur(0); }
          100%{ transform: scale(1); opacity: 1; filter: blur(0); }
        }
        @keyframes vcTreeOut {
          0%  { transform: scale(1); opacity: 1; }
          100%{ transform: scale(1.8) translate(-20%, 0); opacity: 0; filter: blur(4px); }
        }
        @keyframes vcNewArrive {
          0%   { transform: scale(0.4) translate(-140%, 140%); opacity: 0; filter: blur(4px); }
          60%  { opacity: 1; }
          100% { transform: scale(1) translate(0,0); opacity: 1; filter: blur(0); }
        }
        @keyframes vcRoundFlash {
          0%, 100% { box-shadow: inset 0 0 0 0 rgba(34,197,94,0); }
          50%      { box-shadow: inset 0 0 80px 8px rgba(34,197,94,0.45); }
        }
      `}</style>
      {/* Alt-Slide */}
      <div style={{
        position: 'absolute', inset: '6%',
        animation: 'vcOldShrink 700ms cubic-bezier(0.5,0,0.7,0.3) 0ms both',
        transformOrigin: 'top right',
      }}>
        <MockSlide round={1} palette={PALETTES[0]} />
      </div>
      {/* Grüner Victory-Flash der Runde-1-Section */}
      <div style={{
        position: 'absolute', inset: 0,
        animation: 'vcRoundFlash 800ms ease 900ms',
        pointerEvents: 'none',
      }} />
      {/* Tree zentriert */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        animation: 'vcTreeIn 700ms cubic-bezier(0.2,0.9,0.2,1.1) 400ms both, vcTreeOut 500ms ease-in 1700ms both',
      }}>
        <div style={{
          background: 'rgba(2,6,23,0.85)',
          padding: '26px 34px', borderRadius: 22,
          border: '2px solid rgba(34,197,94,0.35)',
          boxShadow: '0 0 80px rgba(34,197,94,0.25)',
        }}>
          <QQProgressTree state={treeState} variant="hero" title="🗺 Gesamt-Fortschritt" />
        </div>
      </div>
      {/* Neu-Slide */}
      <div style={{
        position: 'absolute', inset: '6%',
        animation: 'vcNewArrive 700ms cubic-bezier(0.2,0.9,0.2,1) 1700ms both',
        transformOrigin: 'bottom left',
      }}>
        <MockSlide round={2} palette={PALETTES[1]} />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Page
// ═════════════════════════════════════════════════════════════════════════════
export default function QQRoundLabPage() {
  const [keyA, setKeyA] = useState(0);
  const [keyB, setKeyB] = useState(0);
  const [keyC, setKeyC] = useState(0);
  const [autoLoop, setAutoLoop] = useState(false);

  // Auto-loop: alle 2.5s replay jede Variante
  useMemo(() => {
    if (!autoLoop) return;
    const id = setInterval(() => {
      setKeyA(k => k + 1);
      setKeyB(k => k + 1);
      setKeyC(k => k + 1);
    }, 2600);
    return () => clearInterval(id);
  }, [autoLoop]);

  return (
    <div style={{
      minHeight: '100vh', background: '#0b0d14', color: '#f1f5f9',
      fontFamily: "'Nunito', system-ui, sans-serif",
      padding: '20px 28px 80px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        borderBottom: '1px solid rgba(148,163,184,0.14)', paddingBottom: 14, marginBottom: 24,
      }}>
        <Link to="/menu" style={{
          padding: '6px 14px', borderRadius: 8,
          background: 'rgba(255,255,255,0.07)', color: '#cbd5e1',
          textDecoration: 'none', fontWeight: 700, fontSize: 13,
        }}>← Menü</Link>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>🎬 Round-Transition Lab</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={autoLoop} onChange={e => setAutoLoop(e.target.checked)} />
            Auto-Loop
          </label>
          <button
            onClick={() => { setKeyA(k=>k+1); setKeyB(k=>k+1); setKeyC(k=>k+1); }}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 800, fontSize: 13, background: '#3B82F6', color: '#fff',
            }}
          >▶ Alle replay</button>
        </div>
      </div>

      <div style={{
        fontSize: 14, color: '#94a3b8', marginBottom: 20, maxWidth: 900,
      }}>
        Alle 3 Varianten zeigen den Übergang <b>Runde 1 → Runde 2</b>. Dauer je ~2s.
        Die Varianten lösen die 5-Dots-Sprung-Frage unterschiedlich.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <VariantCard
          title="A · Domino-Victory ✓"
          desc="Tree fliegt rein, die 5 Dots der alten Runde zünden nacheinander ihr ✓ (Domino, ~100ms je Dot). Amber-Linie wächst durch, Label wechselt auf Runde 2, Tree fliegt links raus, Neu-Folie kommt von rechts."
          play={keyA}
          onPlay={() => setKeyA(k => k + 1)}
        >
          <VariantA playKey={keyA} />
        </VariantCard>

        <VariantCard
          title="B · Metro-Fahrt 🚉"
          desc='Kamera pant horizontal. Alt-Folie als „Bahnhofsschild" fadet weg, Rail scrollt durch die Phase-Lücke, Neu-Folie erscheint am nächsten Bahnhof. Ein einziger smoother Slide.'
          play={keyB}
          onPlay={() => setKeyB(k => k + 1)}
        >
          <VariantB playKey={keyB} />
        </VariantCard>

        <VariantCard
          title="C · Zoom-Out Overview 🔭"
          desc="Alt-Folie schrumpft in die obere rechte Ecke, Tree zoomt in Vogelperspektive rein. Runde 1 blitzt grün (✓), Runde 2 glüht auf. Dann zoomt die Kamera Richtung Runde 2 und Neu-Folie fährt rein."
          play={keyC}
          onPlay={() => setKeyC(k => k + 1)}
        >
          <VariantC playKey={keyC} />
        </VariantCard>
      </div>
    </div>
  );
}

function VariantCard({ title, desc, children, onPlay }: {
  title: string; desc: string; play: number; onPlay: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(148,163,184,0.14)',
      borderRadius: 18, padding: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>{title}</div>
        <button
          onClick={onPlay}
          style={{
            marginLeft: 'auto',
            padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: 800, fontSize: 13, background: '#22C55E', color: '#052e16',
          }}
        >▶ Replay</button>
      </div>
      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14, lineHeight: 1.5 }}>{desc}</div>
      {children}
    </div>
  );
}
