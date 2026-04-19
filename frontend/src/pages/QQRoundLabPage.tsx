// QQ Round-Transition Lab — Wolf-Trail Prototypen
// ────────────────────────────────────────────────
// Ein konsistentes Motion-Vokabular: der CozyWolf wandert den Tree entlang.
// Drei Magnituden derselben Bewegung für unterschiedliche Anlässe:
//
//   A) Innerhalb Runde (Frage → Frage) — kleiner Hop, alter Dot wird ✓
//   B) Zwischen Runden (Runde-Ende → Runde-Start) — Hero-Moment: Tree zoomt
//      groß, Wolf macht weiten Bogen über den Phase-Connector, zoomt zurück
//   C) Reveal / Placement — Wolf bleibt sitzen, reagiert mit sympathischem
//      Bounce, wenn ein Team ein Feld platziert

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// ═════════════════════════════════════════════════════════════════════════════
// Shared Tree-Rail
// ═════════════════════════════════════════════════════════════════════════════

const ROUND_COUNT = 3;
const DOTS_PER_ROUND = 5;
const TOTAL_DOTS = ROUND_COUNT * DOTS_PER_ROUND;

/** Horizontale Position (in %) eines Dots im Rail.
 *  3 Cluster à 5 Dots, Lücke zwischen den Runden macht den Phase-Connector. */
function dotLeftPct(idx: number): number {
  const r = Math.floor(idx / DOTS_PER_ROUND);
  const i = idx % DOTS_PER_ROUND;
  return 5 + r * 32 + i * 6; // Round1: 5-29%, Round2: 37-61%, Round3: 69-93%
}

const CATEGORY_EMOJI = ['🎯', '🅰️', '🎁', '🎰', '📸'];

type DotState = 'done' | 'current' | 'upcoming';

function Dot({ state, emoji }: { state: DotState; emoji: string }) {
  if (state === 'done') {
    return (
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: 'rgba(148,163,184,0.22)',
        border: '2px solid rgba(148,163,184,0.38)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 18, fontWeight: 900,
        transition: 'all 320ms ease',
      }}>✓</div>
    );
  }
  if (state === 'current') {
    return (
      <div style={{
        width: 46, height: 46, borderRadius: '50%',
        background: '#fff',
        border: '3px solid #f59e0b',
        boxShadow: '0 0 0 4px rgba(245,158,11,0.22), 0 6px 14px rgba(245,158,11,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22,
        transition: 'all 320ms ease',
      }}>{emoji}</div>
    );
  }
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: '#fff',
      border: '2px solid rgba(148,163,184,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 15, opacity: 0.85,
      transition: 'all 320ms ease',
    }}>{emoji}</div>
  );
}

function Wolf({ size = 54, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: '#fff',
        border: '3px solid #3b82f6',
        boxShadow: '0 6px 18px rgba(59,130,246,0.45), 0 0 0 4px rgba(59,130,246,0.18)',
        backgroundImage: 'url(/logo.png)',
        backgroundSize: '88%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        position: 'absolute',
        // Wolf wird per top/left (center-Punkt) positioniert → mit translate(-50%,-50%) zentrieren
        transform: 'translate(-50%, -50%)',
        zIndex: 5,
        ...style,
      }}
    />
  );
}

/** Tree-Rail mit Dots, Fortschrittslinie, Round-Labels und Wolf-Overlay.
 *  Das Container-Koordinatensystem ist % horizontal (dotLeftPct) und px vertikal.
 *  Der Wolf sitzt bei top=58px (Mittel-Höhe der Dot-Reihe im 180px-Rail). */
function TreeRail({
  currentDot,
  doneThrough,
  highlightRound,
  railHeight = 180,
  wolfNode,
}: {
  currentDot: number;
  doneThrough: number;
  highlightRound?: number;
  railHeight?: number;
  wolfNode?: React.ReactNode;
}) {
  const dotsTop = railHeight * 0.5;
  const labelTop = railHeight * 0.18;

  return (
    <div style={{
      position: 'relative', width: '100%', height: railHeight,
      background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
      borderRadius: 14, border: '1px solid #e2e8f0',
      boxShadow: '0 6px 20px rgba(15,23,42,0.25)',
      overflow: 'visible',
    }}>
      {[1, 2, 3].map(r => {
        const firstIdx = (r - 1) * DOTS_PER_ROUND;
        const lastIdx = firstIdx + DOTS_PER_ROUND - 1;
        const cx = (dotLeftPct(firstIdx) + dotLeftPct(lastIdx)) / 2;
        const active = highlightRound === r;
        const past = highlightRound !== undefined && r < highlightRound;
        return (
          <div key={r} style={{
            position: 'absolute', top: labelTop, left: `${cx}%`, transform: 'translateX(-50%)',
            fontSize: 13, fontWeight: 900, letterSpacing: '0.1em',
            color: active ? '#f59e0b' : past ? '#94a3b8' : '#64748b',
            textShadow: active ? '0 0 12px rgba(245,158,11,0.45)' : 'none',
            transition: 'color 500ms ease, text-shadow 500ms ease',
          }}>RUNDE {r}</div>
        );
      })}

      <div style={{
        position: 'absolute', top: dotsTop, left: '3%', right: '3%', height: 3,
        background: 'rgba(148,163,184,0.22)', transform: 'translateY(-50%)',
      }} />
      <div style={{
        position: 'absolute', top: dotsTop, left: `${dotLeftPct(0)}%`,
        width: `${Math.max(0, dotLeftPct(Math.max(0, doneThrough)) - dotLeftPct(0))}%`,
        height: 3, background: '#f59e0b', transform: 'translateY(-50%)',
        transition: 'width 500ms cubic-bezier(0.4,0,0.2,1)',
        boxShadow: '0 0 8px rgba(245,158,11,0.4)',
      }} />

      {Array.from({ length: TOTAL_DOTS }).map((_, idx) => {
        const state: DotState =
          idx <= doneThrough ? 'done' : idx === currentDot ? 'current' : 'upcoming';
        return (
          <div key={idx} style={{
            position: 'absolute', top: dotsTop, left: `${dotLeftPct(idx)}%`,
            transform: 'translate(-50%, -50%)',
          }}>
            <Dot state={state} emoji={CATEGORY_EMOJI[idx % DOTS_PER_ROUND]} />
          </div>
        );
      })}

      {wolfNode}
    </div>
  );
}

// Shared stage
const STAGE_STYLE: React.CSSProperties = {
  position: 'relative',
  width: '100%', aspectRatio: '16/9',
  borderRadius: 16,
  background: '#020617',
  border: '1px solid rgba(148,163,184,0.15)',
  overflow: 'hidden',
  padding: '4%',
};

// ═════════════════════════════════════════════════════════════════════════════
// VARIANT A — Innerhalb Runde (Wolf hopst zum nächsten Dot)
// ═════════════════════════════════════════════════════════════════════════════
function VariantA({ playKey }: { playKey: number }) {
  // Timeline:
  //   0ms:  Wolf auf Dot 1 (Runde 1, Frage 2), Dot 0 ✓
  //  80ms:  Hop startet — Arc über Dot 1→2, 500ms
  // 340ms:  Mitten im Arc: Dot 1 wechselt → ✓, Dot 2 wird current
  // 580ms:  Wolf landet auf Dot 2

  const [progress, setProgress] = useState(0);
  useEffect(() => {
    setProgress(0);
    const t = setTimeout(() => setProgress(1), 340);
    return () => clearTimeout(t);
  }, [playKey]);

  const currentDot = progress === 0 ? 1 : 2;
  const doneThrough = progress === 0 ? 0 : 1;
  const startL = dotLeftPct(1);
  const endL = dotLeftPct(2);
  const midL = (startL + endL) / 2;

  return (
    <div key={playKey} style={{ ...STAGE_STYLE, display: 'flex', alignItems: 'center' }}>
      <style>{`
        @keyframes vaWolfHop_${playKey} {
          0%   { left: ${startL}%; top: 50%; transform: translate(-50%,-50%) scale(1) rotate(0deg); }
          50%  { left: ${midL}%;  top: 22%; transform: translate(-50%,-50%) scale(1.12) rotate(-8deg); }
          100% { left: ${endL}%;  top: 50%; transform: translate(-50%,-50%) scale(1) rotate(0deg); }
        }
      `}</style>
      <TreeRail
        currentDot={currentDot}
        doneThrough={doneThrough}
        highlightRound={1}
        wolfNode={
          <Wolf
            size={52}
            style={{
              left: `${startL}%`, top: '50%',
              animation: `vaWolfHop_${playKey} 520ms cubic-bezier(0.4,0,0.2,1) 80ms both`,
            }}
          />
        }
      />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// VARIANT B — Zwischen Runden (Hero-Zoom + großer Wolf-Sprung)
// ═════════════════════════════════════════════════════════════════════════════
function VariantB({ playKey }: { playKey: number }) {
  // Timeline:
  //   0ms:   Alt-Folie sichtbar, Tree klein unten als Header
  // 300ms:   Alt-Folie fadet + schiebt leicht hoch, Tree zoomt in Hero-Größe (scale 1→1.35)
  // 900ms:   Tree zentriert. Wolf auf Dot 4 (Runde 1 letzte Frage), Hero-Phase beginnt
  // 1100ms:  Großer Wolf-Sprung, Arc über Phase-Connector, 1100ms
  // 1700ms:  Mid-Air: alle Runde-1-Dots kippen auf ✓, Label Runde 2 glüht
  // 2200ms:  Wolf landet auf Dot 5 (Runde 2 Frage 1)
  // 2500ms:  Tree zoomt zurück auf Header-Größe
  // 2900ms:  Neu-Folie fadet rein
  // 3400ms:  Fertig

  const [phase, setPhase] = useState<'pre' | 'jumping' | 'post'>('pre');
  useEffect(() => {
    setPhase('pre');
    const t1 = setTimeout(() => setPhase('jumping'), 1700);
    const t2 = setTimeout(() => setPhase('post'), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [playKey]);

  const currentDot = phase === 'post' ? 5 : 4;
  const doneThrough = phase === 'pre' ? 3 : phase === 'jumping' ? 3 : 4;
  const highlightRound = phase === 'post' ? 2 : 1;

  const startL = dotLeftPct(4);
  const endL = dotLeftPct(5);
  const midL = (startL + endL) / 2;

  return (
    <div key={playKey} style={STAGE_STYLE}>
      <style>{`
        @keyframes vbOldSlideOut {
          0%, 8%  { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          30%     { opacity: 0; transform: translateY(-24px) scale(0.92); filter: blur(6px); }
          100%    { opacity: 0; transform: translateY(-24px) scale(0.92); filter: blur(6px); }
        }
        @keyframes vbNewSlideIn {
          0%, 82%   { opacity: 0; transform: translateY(24px) scale(0.92); filter: blur(6px); }
          95%       { opacity: 1; transform: translateY(-4px) scale(1.02); filter: blur(0); }
          100%      { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes vbTreeZoom {
          0%, 8%    { transform: translate(-50%, 0) scale(0.6); top: 78%; opacity: 0.85; }
          25%       { transform: translate(-50%, -50%) scale(1.25); top: 50%; opacity: 1; }
          70%       { transform: translate(-50%, -50%) scale(1.25); top: 50%; opacity: 1; }
          85%       { transform: translate(-50%, 0) scale(0.6); top: 78%; opacity: 0.9; }
          100%      { transform: translate(-50%, 0) scale(0.6); top: 78%; opacity: 0.85; }
        }
        @keyframes vbWolfJump_${playKey} {
          0%        { left: ${startL}%; top: 50%; transform: translate(-50%,-50%) scale(1) rotate(0deg); }
          50%       { left: ${midL}%;  top: -35%; transform: translate(-50%,-50%) scale(1.35) rotate(-14deg); }
          100%      { left: ${endL}%;  top: 50%; transform: translate(-50%,-50%) scale(1) rotate(0deg); }
        }
        @keyframes vbSlideDown { /* Wolf sinkt mit dem Tree-Zoom-Out zurück nach unten */
          0%, 70%   { opacity: 1; }
          100%      { opacity: 0.95; }
        }
      `}</style>

      {/* Alt-Folie */}
      <div style={{
        position: 'absolute', top: '6%', left: '8%', right: '8%', bottom: '35%',
        borderRadius: 16,
        background: 'radial-gradient(ellipse at 30% 50%, #1e3a8a 0%, #0b1220 70%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 60px rgba(59,130,246,0.3)',
        animation: 'vbOldSlideOut 3400ms ease both',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#fde68a', letterSpacing: '0.1em',
            background: 'rgba(0,0,0,0.4)', padding: '3px 10px', borderRadius: 999, display: 'inline-block', marginBottom: 10 }}>
            RUNDE 1 · FRAGE 5
          </div>
          <div style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', fontWeight: 900, color: '#93c5fd' }}>
            Letzte Frage dieser Runde!
          </div>
        </div>
      </div>

      {/* Neu-Folie */}
      <div style={{
        position: 'absolute', top: '6%', left: '8%', right: '8%', bottom: '35%',
        borderRadius: 16,
        background: 'radial-gradient(ellipse at 30% 50%, #92400e 0%, #1c1208 70%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 60px rgba(245,158,11,0.3)',
        animation: 'vbNewSlideIn 3400ms ease both',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#fde68a', letterSpacing: '0.1em',
            background: 'rgba(0,0,0,0.4)', padding: '3px 10px', borderRadius: 999, display: 'inline-block', marginBottom: 10 }}>
            RUNDE 2 · FRAGE 1
          </div>
          <div style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', fontWeight: 900, color: '#fcd34d' }}>
            Angriff & Verteidigung!
          </div>
        </div>
      </div>

      {/* Tree-Container (zoomt, schwebt, schrumpft zurück) */}
      <div style={{
        position: 'absolute', left: '50%', top: '78%',
        width: '88%', height: 170,
        transform: 'translate(-50%, 0) scale(0.6)',
        transformOrigin: 'center',
        animation: 'vbTreeZoom 3400ms cubic-bezier(0.4,0,0.2,1) both',
      }}>
        <TreeRail
          currentDot={currentDot}
          doneThrough={doneThrough}
          highlightRound={highlightRound}
          railHeight={170}
          wolfNode={
            <Wolf
              size={58}
              style={{
                left: `${startL}%`, top: '50%',
                animation: `vbWolfJump_${playKey} 1100ms cubic-bezier(0.3,0,0.2,1) 1100ms both`,
              }}
            />
          }
        />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// VARIANT C — Reveal / Placement (Wolf bleibt sitzen, bouncet sympathisch)
// ═════════════════════════════════════════════════════════════════════════════
function VariantC({ playKey }: { playKey: number }) {
  // Tree oben mit Wolf auf Dot 7 (Runde 2, Frage 3). Unten ein Mini-Grid.
  // Ein Team platziert ein Feld → Flash + Avatar pulsiert rein.
  // Wolf reagiert mit Bounce-Nod (springt 8px hoch, Kopf-Tilt, landet wieder).
  //
  //   0ms:  Stage still, Wolf auf Dot 7
  // 200ms:  Feld glüht auf (Vorbereitung)
  // 500ms:  Feld-Avatar scale 0→1.1→1 (Platzieren-Pop)
  // 500ms:  Wolf-Bounce startet, 500ms
  // 1000ms: alles ruhig

  const DOT = 7;
  const [placed, setPlaced] = useState(false);
  useEffect(() => {
    setPlaced(false);
    const t = setTimeout(() => setPlaced(true), 400);
    return () => clearTimeout(t);
  }, [playKey]);

  const wolfL = dotLeftPct(DOT);

  return (
    <div key={playKey} style={STAGE_STYLE}>
      <style>{`
        @keyframes vcWolfCheer {
          0%   { transform: translate(-50%,-50%) scale(1) rotate(0deg); }
          25%  { transform: translate(-50%,-80%) scale(1.18) rotate(-10deg); }
          50%  { transform: translate(-50%,-60%) scale(1.08) rotate(8deg); }
          75%  { transform: translate(-50%,-70%) scale(1.12) rotate(-4deg); }
          100% { transform: translate(-50%,-50%) scale(1) rotate(0deg); }
        }
        @keyframes vcFieldGlow {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0); background: #f1f5f9; }
          40%  { box-shadow: 0 0 0 6px rgba(34,197,94,0.45), 0 0 40px rgba(34,197,94,0.6); background: #dcfce7; }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); background: #22c55e; }
        }
        @keyframes vcAvatarPop {
          0%   { opacity: 0; transform: scale(0.2) rotate(-20deg); }
          55%  { opacity: 1; transform: scale(1.25) rotate(8deg); }
          80%  { transform: scale(0.95) rotate(-2deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes vcSparkle {
          0%   { opacity: 0; transform: translate(-50%,-50%) scale(0.4); }
          40%  { opacity: 1; transform: translate(-50%,-50%) scale(1.4); }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(2); }
        }
      `}</style>

      {/* Tree oben (kompakt) */}
      <div style={{ height: 140, marginBottom: 14 }}>
        <TreeRail
          currentDot={DOT}
          doneThrough={DOT - 1}
          highlightRound={2}
          railHeight={140}
          wolfNode={
            <Wolf
              size={48}
              style={{
                left: `${wolfL}%`, top: '50%',
                animation: placed ? 'vcWolfCheer 520ms cubic-bezier(0.3,0,0.2,1) both' : 'none',
              }}
            />
          }
        />
      </div>

      {/* Mini-Grid */}
      <div style={{
        height: 'calc(100% - 160px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40,
      }}>
        <div style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700, textAlign: 'right', flex: '0 0 auto' }}>
          <div style={{ color: '#94a3b8', fontSize: 11, letterSpacing: '0.08em', marginBottom: 4 }}>TEAM IM ZUG</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#22c55e' }}>🦊 Füchse</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>setzen Feld D3 ein</div>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 46px)', gridTemplateRows: 'repeat(3, 46px)',
          gap: 6,
        }}>
          {Array.from({ length: 12 }).map((_, i) => {
            const isTarget = i === 6;
            const occupied = [0, 1, 4, 8, 11].includes(i);
            const occupantColor = ['#3b82f6', '#ef4444', '#f97316', '#8b5cf6', '#22c55e'][i % 5];
            if (isTarget) {
              return (
                <div key={i} style={{
                  width: 46, height: 46, borderRadius: 8,
                  background: '#f1f5f9',
                  border: '2px dashed #cbd5e1',
                  position: 'relative',
                  animation: placed ? 'vcFieldGlow 520ms ease-out 120ms both' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'visible',
                }}>
                  {placed && (
                    <>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: '#22c55e',
                        border: '2px solid #fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18,
                        animation: 'vcAvatarPop 520ms cubic-bezier(0.3,0,0.2,1) 300ms both',
                      }}>🦊</div>
                      <div style={{
                        position: 'absolute', left: '50%', top: '50%',
                        width: 70, height: 70, borderRadius: '50%',
                        border: '3px solid rgba(34,197,94,0.7)',
                        pointerEvents: 'none',
                        animation: 'vcSparkle 700ms ease-out 200ms both',
                      }} />
                    </>
                  )}
                </div>
              );
            }
            return (
              <div key={i} style={{
                width: 46, height: 46, borderRadius: 8,
                background: occupied ? occupantColor : '#f1f5f9',
                border: occupied ? `2px solid ${occupantColor}` : '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 11, fontWeight: 800, opacity: occupied ? 0.75 : 1,
              }}>
                {occupied ? ['🐺','🦁','🐻','🦅','🐯'][i % 5] : ''}
              </div>
            );
          })}
        </div>
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

  useEffect(() => {
    if (!autoLoop) return;
    const id = setInterval(() => {
      setKeyA(k => k + 1);
      setKeyB(k => k + 1);
      setKeyC(k => k + 1);
    }, 3800);
    return () => clearInterval(id);
  }, [autoLoop]);

  return (
    <div style={{
      minHeight: '100vh', background: '#0b0d14', color: '#f1f5f9',
      fontFamily: "'Nunito', system-ui, sans-serif",
      padding: '20px 28px 80px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        borderBottom: '1px solid rgba(148,163,184,0.14)', paddingBottom: 14, marginBottom: 24,
      }}>
        <Link to="/menu" style={{
          padding: '6px 14px', borderRadius: 8,
          background: 'rgba(255,255,255,0.07)', color: '#cbd5e1',
          textDecoration: 'none', fontWeight: 700, fontSize: 13,
        }}>← Menü</Link>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>🐺 Wolf-Trail Lab</h1>
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
        fontSize: 14, color: '#94a3b8', marginBottom: 20, maxWidth: 900, lineHeight: 1.5,
      }}>
        Ein konsistentes Motion-Vokabular: der <b style={{ color: '#e2e8f0' }}>CozyWolf</b> wandert den Tree entlang.
        Drei Magnituden derselben Bewegung — kleiner Hop im Alltag, Hero-Sprung zwischen Runden, sympathisches Bouncen bei Team-Events.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <VariantCard
          title="A · Innerhalb Runde 🐾"
          desc="Kleiner Hop von Frage zu Frage. Der Wolf springt in einem kurzen Bogen zum nächsten Dot. Der vorherige Dot wird ✓, der neue glüht amber. Dauer ~500ms, unaufdringlich — soll als Mikro-Feedback in jede QQProgressTree-Instanz."
          onPlay={() => setKeyA(k => k + 1)}
        >
          <VariantA playKey={keyA} />
        </VariantCard>

        <VariantCard
          title="B · Zwischen Runden 🚀"
          desc="Hero-Moment. Alt-Folie fadet weg, der Tree zoomt zentral in Vogelperspektive, der Wolf macht einen weiten Bogen über den Phase-Connector (alle 5 alten Dots kippen auf ✓, neues Runde-Label glüht). Tree zoomt zurück, neue Folie kommt. ~3,4s."
          onPlay={() => setKeyB(k => k + 1)}
        >
          <VariantB playKey={keyB} />
        </VariantCard>

        <VariantCard
          title="C · Reveal / Placement 🎉"
          desc="Wolf bleibt auf seinem Dot, reagiert aber sympathisch. Wenn ein Team ein Feld platziert (unten), springt der Wolf kurz hoch + nickt mit Kopf-Tilt. Der Wolf wird zum Schiedsrichter-Avatar — er bezeugt jede Platzierung. Dauer ~500ms."
          onPlay={() => setKeyC(k => k + 1)}
        >
          <VariantC playKey={keyC} />
        </VariantCard>
      </div>
    </div>
  );
}

function VariantCard({ title, desc, children, onPlay }: {
  title: string; desc: string; onPlay: () => void; children: React.ReactNode;
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
