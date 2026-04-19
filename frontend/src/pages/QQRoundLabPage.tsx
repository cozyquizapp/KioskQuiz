// QQ Round-Transition Lab — Wolf-Trail Prototypen
// ────────────────────────────────────────────────
// Ein konsistentes Motion-Vokabular: der CozyWolf wandert den Tree entlang.
// Zwei Magnituden derselben Bewegung für unterschiedliche Anlässe:
//
//   A) Innerhalb Runde (Frage → Frage) — kleiner Hop, alter Dot wird ✓
//      Angezeigt wird nur die aktuelle Runde (5 Dots, nahe Kamera).
//   B) Zwischen Runden (Runde-Ende → Runde-Start) — Hero-Moment: Tree zoomt,
//      Wolf macht weiten Bogen über den Phase-Connector, zoomt zurück.
//      Angezeigt werden nur die beiden beteiligten Runden (10 Dots).

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// ═════════════════════════════════════════════════════════════════════════════
// Design-Tokens — gespiegelt aus QQProgressTree / shared/quarterQuizTypes
// ═════════════════════════════════════════════════════════════════════════════

const DOTS_PER_ROUND = 5;

/** Kategorien-Reihenfolge wie im echten Schedule. */
const CATEGORIES = [
  { emoji: '🎯', color: '#F59E0B' }, // SCHAETZCHEN
  { emoji: '🅰️', color: '#3B82F6' }, // MUCHO
  { emoji: '🎁', color: '#EF4444' }, // BUNTE_TUETE
  { emoji: '🎰', color: '#22C55E' }, // ZEHN_VON_ZEHN
  { emoji: '📸', color: '#8B5CF6' }, // CHEESE
] as const;

/** Horizontale Position (in %) eines Dots, abhängig davon wie viele Runden
 *  sichtbar sind. Bei 1 Runde voll-gespreizt, bei 2 Runden mit klarer Lücke. */
function dotLeftPct(idx: number, visibleRounds: number[]): number {
  const roundOfDot = Math.floor(idx / DOTS_PER_ROUND) + 1;
  const clusterIdx = visibleRounds.indexOf(roundOfDot);
  if (clusterIdx < 0) return -999;
  const inRound = idx % DOTS_PER_ROUND;
  const n = visibleRounds.length;
  const gap = n > 1 ? 10 : 0;
  const span = (90 - (n - 1) * gap) / n; // Gesamt-Nutzbreite 90 %, 5 % Rand je Seite
  const clusterStart = 5 + clusterIdx * (span + gap);
  const perDot = span / (DOTS_PER_ROUND - 1);
  return clusterStart + inRound * perDot;
}

// ═════════════════════════════════════════════════════════════════════════════
// Dot + Wolf
// ═════════════════════════════════════════════════════════════════════════════

type DotState = 'done' | 'current' | 'upcoming';

function Dot({
  state, emoji, color, size = 44,
}: { state: DotState; emoji: string; color: string; size?: number }) {
  if (state === 'done') {
    // Ausgegraut: Kategorie-Emoji bleibt lesbar (man sieht *was* gespielt wurde),
    // aber desaturiert + reduzierte Deckkraft → aktuelles Amber-Dot bekommt die Bühne.
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: '#f1f5f9',
        border: '2px solid #e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.55), fontWeight: 800,
        filter: 'grayscale(1)',
        opacity: 0.55,
        transition: 'all 320ms ease',
      }}>{emoji}</div>
    );
  }
  if (state === 'current') {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: color,
        border: '3px solid #fff',
        boxShadow: `0 0 0 4px ${color}55, 0 6px 14px ${color}66`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: Math.round(size * 0.55), fontWeight: 800,
        transform: 'scale(1.15)',
        transition: 'all 320ms ease',
      }}>{emoji}</div>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: '#f1f5f9',
      border: '2px solid #e2e8f0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#64748b', fontSize: Math.round(size * 0.55), fontWeight: 800,
      transition: 'all 320ms ease',
    }}>{emoji}</div>
  );
}

function Wolf({ size = 56, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: '#fff',
      border: '3px solid #fff',
      boxShadow: '0 0 0 4px rgba(245,158,11,0.35), 0 8px 20px rgba(245,158,11,0.45)',
      backgroundImage: 'url(/logo.png)',
      backgroundSize: '92%',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      position: 'absolute',
      transform: 'translate(-50%, -50%)',
      zIndex: 5,
      ...style,
    }} />
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TreeRail — gefiltert auf visibleRounds, Design im QQProgressTree-Stil
// ═════════════════════════════════════════════════════════════════════════════

function TreeRail({
  visibleRounds,
  currentDot,
  doneThrough,
  highlightRound,
  railHeight = 200,
  dotSize = 44,
  title,
  wolfNode,
}: {
  visibleRounds: number[]; // z.B. [1] oder [1,2]
  currentDot: number;
  doneThrough: number;
  highlightRound?: number;
  railHeight?: number;
  dotSize?: number;
  title?: string;
  wolfNode?: React.ReactNode;
}) {
  const dotLeft = (idx: number) => dotLeftPct(idx, visibleRounds);
  const labelTop = title ? railHeight * 0.48 : railHeight * 0.28;
  const dotsTop = title ? railHeight * 0.74 : railHeight * 0.6;

  return (
    <div style={{
      position: 'relative', width: '100%', height: railHeight,
      background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.94))',
      borderRadius: 20, border: '2px solid #e2e8f0',
      boxShadow: '0 10px 32px rgba(15,23,42,0.18)',
      overflow: 'visible',
      fontFamily: "'Nunito', system-ui, sans-serif",
    }}>
      {title && (
        <div style={{
          position: 'absolute', top: railHeight * 0.14, left: 0, right: 0,
          textAlign: 'center',
          fontSize: Math.round(railHeight * 0.16), fontWeight: 900, letterSpacing: 0.5,
          color: '#0f172a',
        }}>
          {title}
        </div>
      )}

      {visibleRounds.map(r => {
        const firstIdx = (r - 1) * DOTS_PER_ROUND;
        const lastIdx = firstIdx + DOTS_PER_ROUND - 1;
        const cx = (dotLeft(firstIdx) + dotLeft(lastIdx)) / 2;
        const active = highlightRound === r;
        return (
          <div key={r} style={{
            position: 'absolute', top: labelTop, left: `${cx}%`, transform: 'translateX(-50%)',
            fontSize: 15, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase',
            color: active ? '#b45309' : '#64748b',
            transition: 'color 500ms ease',
            whiteSpace: 'nowrap',
          }}>RUNDE {r}</div>
        );
      })}

      {/* Pro Cluster: grauer Base-Rail + amber Fortschrittslinie */}
      {visibleRounds.map(r => {
        const firstIdx = (r - 1) * DOTS_PER_ROUND;
        const lastIdx = firstIdx + DOTS_PER_ROUND - 1;
        const lastDone = Math.min(lastIdx, doneThrough);
        const hasProgress = lastDone >= firstIdx;
        return (
          <div key={`rail-${r}`}>
            <div style={{
              position: 'absolute', top: dotsTop,
              left: `${dotLeft(firstIdx)}%`,
              width: `${dotLeft(lastIdx) - dotLeft(firstIdx)}%`,
              height: 3, background: 'rgba(148,163,184,0.35)',
              transform: 'translateY(-50%)', borderRadius: 2,
            }} />
            {hasProgress && (
              <div style={{
                position: 'absolute', top: dotsTop,
                left: `${dotLeft(firstIdx)}%`,
                width: `${Math.max(0, dotLeft(lastDone) - dotLeft(firstIdx))}%`,
                height: 3,
                background: 'linear-gradient(90deg, #FBBF24, #F59E0B)',
                transform: 'translateY(-50%)', borderRadius: 2,
                boxShadow: '0 0 10px rgba(251,191,36,0.6)',
                transition: 'width 600ms cubic-bezier(0.4,0,0.2,1)',
              }} />
            )}
          </div>
        );
      })}

      {/* Dots — nur die, deren Runde sichtbar ist */}
      {Array.from({ length: 15 }).map((_, idx) => {
        const roundOfDot = Math.floor(idx / DOTS_PER_ROUND) + 1;
        if (!visibleRounds.includes(roundOfDot)) return null;
        const state: DotState =
          idx <= doneThrough ? 'done' : idx === currentDot ? 'current' : 'upcoming';
        const cat = CATEGORIES[idx % DOTS_PER_ROUND];
        return (
          <div key={idx} style={{
            position: 'absolute', top: dotsTop, left: `${dotLeft(idx)}%`,
            transform: 'translate(-50%, -50%)',
          }}>
            <Dot state={state} emoji={cat.emoji} color={cat.color} size={dotSize} />
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
  background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
  border: '1px solid rgba(148,163,184,0.15)',
  overflow: 'hidden',
  padding: '5%',
};

// ═════════════════════════════════════════════════════════════════════════════
// VARIANT A — Innerhalb Runde (nur Runde 1 sichtbar)
// ═════════════════════════════════════════════════════════════════════════════
function VariantA({ playKey }: { playKey: number }) {
  // Timeline:
  //   0ms:   Wolf auf Dot 1 (Runde 1, Frage 2), Dot 0 ist ✓
  // 120ms:   Hop startet — Arc über Dot 1→2, 520ms
  // 360ms:   Mitte im Flug: Dot 1 wechselt auf ✓, Dot 2 wird current (amber-Puls)
  // 640ms:   Wolf landet auf Dot 2
  const VISIBLE = [1];
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    setProgress(0);
    const t = setTimeout(() => setProgress(1), 360);
    return () => clearTimeout(t);
  }, [playKey]);

  const currentDot = progress === 0 ? 1 : 2;
  const doneThrough = progress === 0 ? 0 : 1;
  const startL = dotLeftPct(1, VISIBLE);
  const endL = dotLeftPct(2, VISIBLE);
  const midL = (startL + endL) / 2;

  return (
    <div key={playKey} style={{ ...STAGE_STYLE, display: 'flex', alignItems: 'center' }}>
      <style>{`
        @keyframes vaWolfHop_${playKey} {
          0%   { left: ${startL}%; top: 74%; transform: translate(-50%,-50%) scale(1) rotate(0deg); }
          50%  { left: ${midL}%;  top: 44%; transform: translate(-50%,-50%) scale(1.15) rotate(-8deg); }
          100% { left: ${endL}%;  top: 74%; transform: translate(-50%,-50%) scale(1) rotate(0deg); }
        }
      `}</style>
      <TreeRail
        visibleRounds={VISIBLE}
        currentDot={currentDot}
        doneThrough={doneThrough}
        highlightRound={1}
        railHeight={220}
        dotSize={56}
        title="Runde 1"
        wolfNode={
          <Wolf
            size={68}
            style={{
              left: `${startL}%`, top: '74%',
              animation: `vaWolfHop_${playKey} 560ms cubic-bezier(0.4,0,0.2,1) 120ms both`,
            }}
          />
        }
      />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// VARIANT B — Zwischen Runden (nur Runde 1 + Runde 2 sichtbar)
// ═════════════════════════════════════════════════════════════════════════════
function VariantB({ playKey }: { playKey: number }) {
  // Timeline (Gesamt ~4,4s, Prozente beziehen sich auf 4400ms):
  //    0 ms  (  0 %): Alt-Folie stabil, Tree tiny unten
  //   100 ms (  2 %): "Runde 1 geschafft!" Stempel knallt auf Alt-Folie
  //   500 ms ( 11 %): Stempel sitzt (leicht gekippt -6°)
  //   900 ms ( 20 %): Alt-Folie + Stempel faden + driften gemeinsam weg
  //   800 ms ( 18 %): Tree zoomt zur Hero-Position hoch
  //  1300 ms ( 30 %): Tree in Hero
  //  1900 ms ( 43 %): Wolf-Sprung startet
  //  2450 ms ( 56 %): Mid-Air — Runde-1-Dots kippen auf ✓, Runde-2-Label glüht
  //  3000 ms ( 68 %): Wolf gelandet auf Runde-2-Dot 1
  //  3100 ms ( 70 %): Tree zoomt zurück nach unten
  //  3350 ms ( 76 %): Neu-Folie BG fadet rein
  //  3750 ms ( 85 %): "Runde 2" Mega-Stempel knallt in Mitte der Neu-Folie
  //  4100 ms ( 93 %): Stempel sitzt groß
  //  4400 ms (100 %): Stempel schrumpft + rutscht als Badge nach oben, Tagline fadet rein
  const VISIBLE = [1, 2];
  const [phase, setPhase] = useState<'pre' | 'jumping' | 'post'>('pre');
  useEffect(() => {
    setPhase('pre');
    const t1 = setTimeout(() => setPhase('jumping'), 2450);
    const t2 = setTimeout(() => setPhase('post'), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [playKey]);

  const currentDot = phase === 'pre' ? 4 : 5;
  const doneThrough = phase === 'pre' ? 3 : 4;
  const highlightRound = phase === 'pre' ? 1 : 2;

  const startL = dotLeftPct(4, VISIBLE);
  const endL = dotLeftPct(5, VISIBLE);
  const midL = (startL + endL) / 2;

  return (
    <div key={playKey} style={STAGE_STYLE}>
      <style>{`
        /* — Alt-Folie — */
        @keyframes vbOldSlideOut {
          0%, 20%  { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          29%      { opacity: 0; transform: translateY(-30px) scale(0.92); filter: blur(6px); }
          100%     { opacity: 0; transform: translateY(-30px) scale(0.92); filter: blur(6px); }
        }
        @keyframes vbOldStamp {
          0%, 2.2%  { opacity: 0; transform: translate(-50%,-50%) scale(2.4) rotate(-16deg); }
          6%        { opacity: 1; transform: translate(-50%,-50%) scale(0.88) rotate(-4deg); }
          9%        { transform: translate(-50%,-50%) scale(1.1) rotate(-9deg); }
          12%, 22%  { transform: translate(-50%,-50%) scale(1) rotate(-6deg); opacity: 1; }
          29%       { opacity: 0; transform: translate(-50%,-50%) scale(0.96) rotate(-6deg); }
          100%      { opacity: 0; }
        }
        /* — Neu-Folie — */
        @keyframes vbNewBgIn {
          0%, 76%   { opacity: 0; transform: translateY(24px) scale(0.92); filter: blur(6px); }
          88%       { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          100%      { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes vbNewStamp_${playKey} {
          0%, 80%   { opacity: 0; top: 50%; transform: translate(-50%,-50%) scale(3) rotate(10deg); }
          86%       { opacity: 1; top: 50%; transform: translate(-50%,-50%) scale(0.9) rotate(-3deg); }
          89%       { opacity: 1; top: 50%; transform: translate(-50%,-50%) scale(1.12) rotate(2deg); }
          93%       { opacity: 1; top: 50%; transform: translate(-50%,-50%) scale(1) rotate(0deg); }
          96%       { opacity: 1; top: 50%; transform: translate(-50%,-50%) scale(1) rotate(0deg); }
          100%      { opacity: 1; top: 16%; transform: translate(-50%,-50%) scale(0.32) rotate(0deg); }
        }
        @keyframes vbNewTagline_${playKey} {
          0%, 93%   { opacity: 0; transform: translateY(18px); }
          100%      { opacity: 1; transform: translateY(0); }
        }
        /* — Tree & Wolf — */
        @keyframes vbTreeZoom {
          0%, 18%   { transform: translate(-50%, 0) scale(0.62); top: 82%; opacity: 0.55; }
          28%       { transform: translate(-50%, -50%) scale(1.2); top: 50%; opacity: 1; }
          70%       { transform: translate(-50%, -50%) scale(1.2); top: 50%; opacity: 1; }
          80%       { transform: translate(-50%, 0) scale(0.62); top: 82%; opacity: 0.35; }
          100%      { transform: translate(-50%, 0) scale(0.62); top: 82%; opacity: 0; }
        }
        @keyframes vbWolfJump_${playKey} {
          0%        { left: ${startL}%; top: 74%; transform: translate(-50%,-50%) scale(1) rotate(0deg); }
          50%       { left: ${midL}%;  top: -12%; transform: translate(-50%,-50%) scale(1.38) rotate(-14deg); }
          100%      { left: ${endL}%;  top: 74%; transform: translate(-50%,-50%) scale(1) rotate(0deg); }
        }
      `}</style>

      {/* Alt-Folie */}
      <div style={{
        position: 'absolute', top: '6%', left: '8%', right: '8%', bottom: '38%',
        borderRadius: 16,
        background: 'radial-gradient(ellipse at 30% 50%, #1e3a8a 0%, #0b1220 70%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 60px rgba(59,130,246,0.3)',
        animation: 'vbOldSlideOut 4400ms ease both',
        overflow: 'hidden',
      }}>
        <div style={{ textAlign: 'center', padding: '0 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#fde68a', letterSpacing: '0.1em',
            background: 'rgba(0,0,0,0.4)', padding: '3px 10px', borderRadius: 999, display: 'inline-block', marginBottom: 10 }}>
            RUNDE 1 · FRAGE 5
          </div>
          <div style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', fontWeight: 900, color: '#93c5fd' }}>
            Letzte Frage dieser Runde!
          </div>
        </div>
        {/* Alt-Stempel — "Runde 1 geschafft!" */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          padding: '14px 32px',
          background: '#dc2626',
          color: '#fff',
          fontWeight: 900,
          fontSize: 'clamp(18px, 2.4vw, 34px)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          border: '4px double rgba(255,255,255,0.9)',
          borderRadius: 6,
          boxShadow: '0 10px 28px rgba(0,0,0,0.55), 0 0 0 2px #dc2626 inset',
          whiteSpace: 'nowrap',
          opacity: 0,
          animation: 'vbOldStamp 4400ms ease-out both',
          pointerEvents: 'none',
        }}>
          🏁 Runde 1 geschafft!
        </div>
      </div>

      {/* Neu-Folie */}
      <div style={{
        position: 'absolute', top: '6%', left: '8%', right: '8%', bottom: '38%',
        borderRadius: 16,
        background: 'radial-gradient(ellipse at 30% 50%, #92400e 0%, #1c1208 70%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 60px rgba(245,158,11,0.3)',
        animation: 'vbNewBgIn 4400ms ease both',
        overflow: 'hidden',
      }}>
        <div style={{
          textAlign: 'center',
          marginTop: '7%', // Platz für den schrumpfenden Stempel oben
          opacity: 0,
          animation: `vbNewTagline_${playKey} 4400ms ease both`,
        }}>
          <div style={{ fontSize: 'clamp(26px, 3.2vw, 44px)', fontWeight: 900, color: '#fcd34d' }}>
            Angriff & Verteidigung!
          </div>
        </div>
        {/* Neu-Stempel — "Runde 2" */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          padding: '16px 40px',
          background: '#f59e0b',
          color: '#1c1208',
          fontWeight: 900,
          fontSize: 'clamp(22px, 3vw, 44px)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          border: '4px double rgba(28,18,8,0.85)',
          borderRadius: 8,
          boxShadow: '0 12px 32px rgba(0,0,0,0.6), 0 0 0 2px #f59e0b inset',
          whiteSpace: 'nowrap',
          opacity: 0,
          animation: `vbNewStamp_${playKey} 4400ms cubic-bezier(0.3,0,0.2,1) both`,
          pointerEvents: 'none',
        }}>
          Runde 2
        </div>
      </div>

      {/* Tree — zoomt rein, hält, zoomt zurück, fadet weg */}
      <div style={{
        position: 'absolute', left: '50%', top: '82%',
        width: '88%',
        transform: 'translate(-50%, 0) scale(0.62)',
        transformOrigin: 'center',
        animation: 'vbTreeZoom 4400ms cubic-bezier(0.4,0,0.2,1) both',
      }}>
        <TreeRail
          visibleRounds={VISIBLE}
          currentDot={currentDot}
          doneThrough={doneThrough}
          highlightRound={highlightRound}
          railHeight={200}
          dotSize={50}
          wolfNode={
            <Wolf
              size={62}
              style={{
                left: `${startL}%`, top: '74%',
                animation: `vbWolfJump_${playKey} 1100ms cubic-bezier(0.3,0,0.2,1) 1900ms both`,
              }}
            />
          }
        />
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
  const [autoLoop, setAutoLoop] = useState(false);

  useEffect(() => {
    if (!autoLoop) return;
    const id = setInterval(() => {
      setKeyA(k => k + 1);
      setKeyB(k => k + 1);
    }, 5000);
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
            onClick={() => { setKeyA(k=>k+1); setKeyB(k=>k+1); }}
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
        Es werden nur die <b style={{ color: '#e2e8f0' }}>gerade relevanten Runden</b> gezeigt — näher dran, weniger Clutter.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <VariantCard
          title="A · Innerhalb Runde 🐾"
          desc="Nur die aktuelle Runde ist sichtbar (5 Dots). Der Wolf springt in einem kurzen Bogen zum nächsten Dot. Der vorherige Dot wird ✓, der neue zeigt die Kategorie-Farbe mit Puls. ~560ms — Mikro-Feedback zwischen Fragen."
          onPlay={() => setKeyA(k => k + 1)}
        >
          <VariantA playKey={keyA} />
        </VariantCard>

        <VariantCard
          title="B · Zwischen Runden 🚀"
          desc='Drei klare Momente: 1) „Runde 1 geschafft!"-Stempel knallt auf Alt-Folie (roter Stamp, leicht gekippt), beide faden weg. 2) Tree zoomt in Vogelperspektive, Wolf macht weiten Bogen über den Phase-Connector — Runde-1-Dots kippen, Runde-2-Label glüht, Tree zoomt zurück. 3) „Runde 2"-Mega-Stempel bangt auf neue Folie, schrumpft als Badge nach oben, Tagline fadet drunter rein. ~4,4s.'
          onPlay={() => setKeyB(k => k + 1)}
        >
          <VariantB playKey={keyB} />
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
