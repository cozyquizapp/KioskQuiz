// AnimationsLabPage — /animations
// 2026-05-07: 7 Animation-Demos zum Anschauen + Re-Triggern. Jede Demo hat
// einen Replay-Button, kurze Beschreibung, und zeigt das Pattern visuell.
// Self-contained, keine externen Libraries (alles CSS-Keyframes + vanilla JS).
// 2026-05-08: + 5 Quiz-Realistic Showreels (D/C/B/A/H) als zweite Section unten.
//             Groessere Sandboxes, echte Card-Kontexte aus dem Beamer.
import React, { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

// ─── Demo-Card-Wrapper ──────────────────────────────────────────────────────
function DemoCard({
  num, title, blurb, children, replay, onReplay, keepAlive = false,
  replayLabel = '▶ Replay', minHeight = 380,
}: {
  num: number | string;
  title: string;
  blurb: string;
  children: React.ReactNode;
  replay: number;
  onReplay: () => void;
  /** 2026-05-07: Wenn true, kein key={replay} auf dem inner-Wrapper —
   *  Demo behaelt seinen State (z. B. View-Transitions-Demo braucht
   *  round-state ueber Replays hinweg). Default: false (remount-on-replay
   *  damit CSS-keyframes neu feuern). */
  keepAlive?: boolean;
  /** Custom-Label fuer den Top-Right-Button (z. B. „↺ Reset" fuer Toggle-Demos). */
  replayLabel?: string;
  /** Outer-Card-Hoehe — Showreels brauchen mehr Platz als Pattern-Stanzen. */
  minHeight?: number;
}) {
  const innerKey = keepAlive ? undefined : replay;
  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(30,41,59,0.55), rgba(15,23,42,0.45))',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 18,
      padding: 22,
      boxShadow:
        'inset 0 1px 0 rgba(255,255,255,0.18), ' +
        '0 24px 64px rgba(0,0,0,0.35)',
      display: 'flex', flexDirection: 'column',
      gap: 12,
      minHeight,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{
            fontSize: 24, fontWeight: 900,
            color: '#94a3b8', fontFamily: 'monospace',
            letterSpacing: '-0.02em',
          }}>{String(num).padStart(2, '0')}</span>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', margin: 0, letterSpacing: '-0.01em' }}>{title}</h3>
        </div>
        <button onClick={onReplay} style={{
          padding: '6px 14px', borderRadius: 8,
          border: '1px solid rgba(245,158,11,0.4)',
          background: 'rgba(245,158,11,0.10)',
          color: '#fbbf24', fontSize: 12, fontWeight: 800, cursor: 'pointer',
          transition: 'all 0.18s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.22)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.10)'; }}
        >{replayLabel}</button>
      </div>
      <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.4 }}>{blurb}</div>
      <div key={innerKey} style={{
        marginTop: 'auto',
        flex: 1,
        background: 'rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: 16,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 180,
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── 1. Slide-Off + Push ────────────────────────────────────────────────────
function SlideOffPushDemo({ replay }: { replay: number }) {
  // Auto-toggle bei replay → wechselt zwischen 'A' (Frage) und 'B' (Antwort)
  const isAnswer = replay % 2 === 1;
  return (
    <div style={{ position: 'relative', width: '100%', height: 140, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: isAnswer
          ? 'slideOutLeft 0.35s cubic-bezier(0.4, 0, 0.2, 1) both'
          : 'slideInLeft 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      }}>
        <Card title="❓ Frage" tint="#3B82F6">
          Wie viele Bundesländer hat Deutschland?
        </Card>
      </div>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: isAnswer
          ? 'slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both'
          : 'slideOutRight 0.35s cubic-bezier(0.4, 0, 0.2, 1) both',
      }}>
        <Card title="✓ Antwort" tint="#22C55E">
          16 Bundesländer
        </Card>
      </div>
    </div>
  );
}
function Card({ title, tint, children }: { title: string; tint: string; children: React.ReactNode }) {
  return (
    <div style={{
      padding: '16px 22px', borderRadius: 12,
      background: `linear-gradient(180deg, ${tint}25, ${tint}10)`,
      border: `2px solid ${tint}`,
      boxShadow: `0 10px 30px ${tint}33`,
      maxWidth: 320, textAlign: 'center',
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: tint, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{children}</div>
    </div>
  );
}

// ─── 2. Line-Mask Reveal ────────────────────────────────────────────────────
function LineMaskRevealDemo() {
  const lines = [
    'In welchem Jahr eröffnete der',
    'Kölner Dom seine Pforten erstmals',
    'für Besucher?',
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      {lines.map((line, i) => (
        <div key={i} style={{
          overflow: 'hidden',
          height: 30,
          display: 'flex', alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            fontSize: 18, fontWeight: 700, color: '#f1f5f9',
            transform: 'translateY(100%)',
            animation: `lineReveal 0.55s cubic-bezier(0.16, 1, 0.3, 1) ${0.08 * i}s both`,
          }}>{line}</div>
        </div>
      ))}
    </div>
  );
}

// ─── 3. Spring Pop-Scale ────────────────────────────────────────────────────
function SpringPopScaleDemo() {
  return (
    <div style={{
      padding: '24px 32px', borderRadius: 14,
      background: 'linear-gradient(180deg, rgba(168,85,247,0.22), rgba(139,92,246,0.10))',
      border: '2px solid #A78BFA',
      boxShadow: '0 14px 40px rgba(168,85,247,0.28)',
      animation: 'springPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 32, lineHeight: 1, marginBottom: 8 }}>🎯</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Card erschienen</div>
      <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>scale 0.85 → 1.02 → 1</div>
    </div>
  );
}

// ─── 4. Slot-Machine Score-Update ───────────────────────────────────────────
function SlotMachineDemo({ replay }: { replay: number }) {
  // Zaehlt alternierend zwischen 7 und 12
  const target = replay % 2 === 0 ? 7 : 12;
  const prev = replay % 2 === 0 ? 12 : 7;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <div style={{
        fontSize: 13, fontWeight: 800, color: '#94a3b8',
        letterSpacing: '0.12em', textTransform: 'uppercase',
      }}>Punkte</div>
      <div style={{
        position: 'relative', width: 80, height: 64,
        background: 'rgba(0,0,0,0.5)',
        border: '2px solid rgba(245,158,11,0.4)',
        borderRadius: 10,
        overflow: 'hidden',
        perspective: 600,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 38, fontWeight: 900, color: '#fbbf24',
          fontFamily: 'monospace',
          animation: 'slotOut 0.35s cubic-bezier(0.4, 0, 0.6, 1) both',
        }}>{prev}</div>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 38, fontWeight: 900, color: '#fbbf24',
          fontFamily: 'monospace',
          animation: 'slotIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.25s both',
        }}>{target}</div>
      </div>
      <div style={{ fontSize: 11, color: '#64748b', maxWidth: 100 }}>3D-Walze rotiert in Y-Achse</div>
    </div>
  );
}

// ─── 5. View Transitions API ────────────────────────────────────────────────
function ViewTransitionsDemo({ replay }: { replay: number }) {
  const [round, setRound] = useState(1);
  const supports = typeof document !== 'undefined' && 'startViewTransition' in document;
  // Replay triggert toggle. Component wird via DemoCard.keepAlive=true
  // NICHT remountet, deshalb behaelt round seinen State ueber replays.
  const lastReplayRef = useRef(replay);
  useEffect(() => {
    if (replay === lastReplayRef.current) return;
    lastReplayRef.current = replay;
    const next = round === 1 ? 2 : 1;
    if (supports) {
      // flushSync: React 18+ batcht setState normalerweise async — VT-API
      // braucht aber synchronen DOM-Update zwischen den beiden Snapshots,
      // sonst verpasst sie den new-state.
      (document as any).startViewTransition(() => {
        flushSync(() => setRound(next));
      });
    } else {
      setRound(next);
    }
  }, [replay, round, supports]);
  return (
    <div style={{
      width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
    }}>
      {/* viewTransitionName aufs eigentlich wechselnde Element, nicht den
          Wrapper — sonst captured VT-API einen Container der sich nicht
          aendert und animiert nichts visuell. */}
      <div
        key={round}
        style={{
          padding: '12px 22px', borderRadius: 10,
          background: round === 1
            ? 'linear-gradient(180deg, rgba(59,130,246,0.30), rgba(37,99,235,0.18))'
            : 'linear-gradient(180deg, rgba(245,158,11,0.30), rgba(217,119,6,0.18))',
          border: round === 1 ? '2px solid #3B82F6' : '2px solid #F59E0B',
          fontSize: 24, fontWeight: 900, color: '#fff',
          letterSpacing: '0.05em',
          ['viewTransitionName' as any]: 'demo-round-pill',
        }}
      >Runde {round}</div>
      <div style={{
        fontSize: 11, color: supports ? '#22C55E' : '#EF4444',
        textAlign: 'center', fontWeight: 700,
      }}>
        {supports ? '✓ Browser unterstützt View Transitions API' : '✗ Browser unterstützt kein View Transitions (Fallback aktiv)'}
      </div>
      <div style={{
        fontSize: 10, color: '#64748b',
        textAlign: 'center', maxWidth: 240,
      }}>
        Klick mehrfach auf Replay → Pill wechselt mit Cross-Fade + Scale via nativer Browser-API
      </div>
    </div>
  );
}

// ─── 6. Word Stagger Fade-Up ────────────────────────────────────────────────
function WordStaggerDemo() {
  const sentence = 'Welches Tier brachte das Trojanische Pferd zu Fall?';
  const words = sentence.split(' ');
  return (
    <div style={{
      fontSize: 16, fontWeight: 600, color: '#f1f5f9',
      lineHeight: 1.5, textAlign: 'center', maxWidth: '90%',
    }}>
      {words.map((w, i) => (
        <span key={i} style={{
          display: 'inline-block',
          opacity: 0,
          transform: 'translateY(12px)',
          animation: `wordFadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${0.05 * i}s both`,
          marginRight: 6,
        }}>{w}</span>
      ))}
    </div>
  );
}

// ─── 7. Bonus: 3D Card-Flip ─────────────────────────────────────────────────
function CardFlipDemo({ replay }: { replay: number }) {
  const isFlipped = replay % 2 === 1;
  return (
    <div style={{ perspective: 1000, width: 200, height: 130 }}>
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        transformStyle: 'preserve-3d',
        animation: isFlipped
          ? 'cardFlipFwd 0.8s cubic-bezier(0.4, 0, 0.2, 1) both'
          : 'cardFlipBack 0.8s cubic-bezier(0.4, 0, 0.2, 1) both',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, #1f2937, #0f172a)',
          border: '2px solid #FBBF24',
          borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
          backfaceVisibility: 'hidden',
          fontSize: 36,
        }}>
          🎴
          <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 6, fontWeight: 700 }}>Vorderseite</div>
        </div>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, #FF2D7B, #C026D3)',
          border: '2px solid #FBBF24',
          borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          fontSize: 18, fontWeight: 900, color: '#fff',
        }}>
          ✨ REVEAL ✨
          <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>Hearthstone-Style</div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// QUIZ-REALISTIC SHOWREELS (2026-05-08)
// Groessere Demos mit echtem Card-/View-Kontext aus dem Beamer.
// Slot D: Background-Layer-Toggle — Wolf entscheidet welche BG-Layer ins
// Standard-Theme. Toggle-State, kein Replay (Reset-Button setzt alle auf an).
// ════════════════════════════════════════════════════════════════════════════

function FirefliesLayer() {
  // 8 hardcoded Positionen/Delays — deterministisches Layout, kein Mount-Jitter.
  const ffs = [
    { l: 12, t: 18, d: 6.0, dl: 0.0 },
    { l: 88, t: 22, d: 7.5, dl: 1.4 },
    { l: 35, t: 70, d: 5.5, dl: 0.8 },
    { l: 75, t: 60, d: 8.0, dl: 2.2 },
    { l: 22, t: 45, d: 6.5, dl: 3.0 },
    { l: 60, t: 30, d: 7.0, dl: 0.4 },
    { l: 90, t: 80, d: 5.8, dl: 1.8 },
    { l: 8,  t: 85, d: 8.4, dl: 2.6 },
  ];
  return (
    <>
      {ffs.map((f, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${f.l}%`, top: `${f.t}%`,
          width: 4, height: 4, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(251,191,36,0.95), rgba(251,191,36,0) 70%)',
          filter: 'blur(0.6px)',
          animation: `ffDriftSm ${f.d}s ease-in-out ${f.dl}s infinite`,
          pointerEvents: 'none',
        }} />
      ))}
    </>
  );
}

// ─── B. 8-Team Score-Cascade mit Position-Swap ──────────────────────────────
// Teams werden mit Stagger 200 ms hochgeticked (lowest-rank zuerst), dann
// schiebt der Position-Swap alle 8 Zeilen auf ihre neue Rank-Position. Letztens
// kriegt der neue #1 (= Kraken nach +28 Punkten Sprung) den Winner-Glow.
const SCORE_TEAMS = [
  { id: 1, name: 'Wolfsbande', hue: 230, before: 78, delta:  0 },
  { id: 2, name: 'Tigerteam',  hue: 30,  before: 71, delta:  5 },
  { id: 3, name: 'Eulenchor',  hue: 130, before: 68, delta:  9 },
  { id: 4, name: 'Kraken',     hue: 280, before: 64, delta: 28 }, // LEAP-Team
  { id: 5, name: 'Foxtrott',   hue: 0,   before: 60, delta: 14 },
  { id: 6, name: 'Bärenherz',  hue: 200, before: 55, delta: 18 },
  { id: 7, name: 'Schwalben',  hue: 90,  before: 49, delta:  6 },
  { id: 8, name: 'Igelpost',   hue: 320, before: 42, delta: 20 },
];

function ScoreTickup({ from, to, delayMs, durationMs }: {
  from: number; to: number; delayMs: number; durationMs: number;
}) {
  const [val, setVal] = useState(from);
  useEffect(() => {
    setVal(from);
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed < delayMs) { frame = requestAnimationFrame(tick); return; }
      const t = Math.min(1, (elapsed - delayMs) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out-cubic
      setVal(Math.round(from + (to - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [from, to, delayMs, durationMs]);
  const showDelta = to > from && val > from && val < to;
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 84, justifyContent: 'flex-end' }}>
      {showDelta && (
        <span style={{ fontSize: 10, color: '#22C55E', fontWeight: 800 }}>+{to - from}</span>
      )}
      <span style={{ fontSize: 18, fontWeight: 900, color: '#fbbf24', fontFamily: 'monospace' }}>{val}</span>
    </div>
  );
}

function ScoreCascadeDemo({ replay }: { replay: number }) {
  const teams = SCORE_TEAMS;
  const ROW_H = 36;
  const STAGGER_MS = 200;
  const TICKUP_MS = 600;
  const SWAP_DELAY_MS = STAGGER_MS * teams.length + 200; // erst alle Tickups, dann Swap
  const SWAP_MS = 800;
  const GLOW_DELAY_MS = SWAP_DELAY_MS + SWAP_MS - 100;
  // Sortierte Listen fuer Rank-Berechnung
  const beforeOrder = [...teams].sort((a, b) => b.before - a.before).map(t => t.id);
  const afterOrder  = [...teams].sort((a, b) => (b.before + b.delta) - (a.before + a.delta)).map(t => t.id);

  return (
    <div key={replay} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        flex: 1, position: 'relative',
        background: 'linear-gradient(180deg, #1a1410, #0f0a06)',
        borderRadius: 12,
        border: '1px solid rgba(245,158,11,0.18)',
        padding: '12px 14px',
        minHeight: 340, overflow: 'hidden',
      }}>
        <div style={{ position: 'relative', width: '100%', height: teams.length * ROW_H }}>
          {teams.map((t) => {
            const beforeRank = beforeOrder.indexOf(t.id);
            const afterRank = afterOrder.indexOf(t.id);
            const isWinner = afterRank === 0;
            const tickupDelay = (teams.length - 1 - beforeRank) * STAGGER_MS; // unten zuerst
            const swapDiffPx = (afterRank - beforeRank) * ROW_H;
            return (
              <div key={t.id} style={{
                position: 'absolute',
                left: 0, right: 0, top: beforeRank * ROW_H,
                height: ROW_H - 4,
                ['--swapDiff' as any]: `${swapDiffPx}px`,
                animation: `rowSwap ${SWAP_MS}ms cubic-bezier(0.34, 1.18, 0.64, 1) ${SWAP_DELAY_MS}ms both${
                  isWinner ? `, rowWinnerGlow 0.8s ease-out ${GLOW_DELAY_MS}ms both` : ''
                }`,
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6,
                padding: '0 10px',
                willChange: 'transform',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: `hsl(${t.hue}, 64%, 52%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, color: '#fff',
                  flexShrink: 0,
                }}>{beforeRank + 1}</div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.005em' }}>{t.name}</div>
                <ScoreTickup from={t.before} to={t.before + t.delta} delayMs={tickupDelay} durationMs={TICKUP_MS} />
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center' }}>
        Stagger 200 ms · Tickup 600 ms · Position-Swap 800 ms · Kraken springt #4→#1 mit +28
      </div>
    </div>
  );
}

// ─── C. CHEESE Winner-Avatar-Drop-Cascade ───────────────────────────────────
function CheeseWinnerCascadeDemo({ replay }: { replay: number }) {
  // 4 Winner-Teams als simple farbige Avatare. 850 ms Stagger pro Drop,
  // letzter Avatar bekommt Climax-Glow-Pulse (transform-locked auf scale 1
  // vom Drop, Pulse nutzt nur box-shadow → kein Anim-Conflict).
  const winners = [
    { name: 'Tigerteam',  hue: 30,  emoji: '🐯' },
    { name: 'Wolfsbande', hue: 230, emoji: '🐺' },
    { name: 'Kraken',     hue: 280, emoji: '🐙' },
    { name: 'Eulenchor',  hue: 130, emoji: '🦉' },
  ];
  const STAGGER_S = 0.85;

  return (
    <div key={replay} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Pseudo-CHEESE-Frage mit Bild + korrekter Antwort */}
      <div style={{
        flex: 1, position: 'relative',
        borderRadius: 12,
        background: 'linear-gradient(180deg, #1a1410, #0f0a06)',
        border: '1px solid rgba(245,158,11,0.18)',
        overflow: 'hidden',
        minHeight: 280,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px 80px',
      }}>
        {/* Pseudo-Subject-Card (Cheese-Visual) */}
        <div style={{
          width: '78%', maxWidth: 360, aspectRatio: '4/3',
          borderRadius: 14,
          background: 'linear-gradient(135deg, #fde68a, #fbbf24 60%, #d97706)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 96, color: '#7c2d12',
          boxShadow: '0 14px 44px rgba(217,119,6,0.32)',
          position: 'relative',
        }}>
          🧀
          {/* Korrekte-Antwort-Badge poppt zuerst rein */}
          <div style={{
            position: 'absolute', top: 10, right: 12,
            padding: '4px 10px', borderRadius: 999,
            background: 'rgba(34,197,94,0.94)', color: '#fff',
            fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
            animation: 'cheeseAnswerBadge 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both',
          }}>RICHTIG: GOUDA</div>
        </div>
        {/* Winner-Avatare am unteren Rand, droppen ueber das Bild */}
        <div style={{
          position: 'absolute', bottom: 14, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: 18, padding: '0 16px',
        }}>
          {winners.map((w, i) => {
            const isLast = i === winners.length - 1;
            const dropDelay = 0.6 + i * STAGGER_S; // 0.6 s Pause damit Badge zuerst landet
            return (
              <div key={i} style={{
                position: 'relative',
                animation: `cheeseAvatarDrop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${dropDelay}s both`,
                willChange: 'transform',
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: `hsl(${w.hue}, 68%, 56%)`,
                  border: isLast ? '3px solid #fbbf24' : '2px solid rgba(255,255,255,0.45)',
                  boxShadow: isLast
                    ? '0 0 24px rgba(251,191,36,0.7), 0 8px 20px rgba(0,0,0,0.4)'
                    : '0 6px 16px rgba(0,0,0,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26,
                  // Climax-Pulse NUR auf box-shadow → kein transform-Conflict
                  // mit dem Drop-Wrapper.
                  animation: isLast
                    ? `cheeseClimaxPulse 0.85s ease-out ${dropDelay + 0.7}s both`
                    : undefined,
                }}>
                  {w.emoji}
                </div>
                <div style={{
                  position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 10, fontWeight: 800, color: '#f1f5f9',
                  whiteSpace: 'nowrap',
                  textShadow: '0 2px 6px rgba(0,0,0,0.8)',
                  opacity: 0,
                  animation: `cheeseLabelFade 0.4s ease-out ${dropDelay + 0.5}s both`,
                }}>{w.name}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center' }}>
        4 Teams richtig · Stagger 850 ms · letzter Avatar = Climax-Glow-Pulse
      </div>
    </div>
  );
}

// ─── D. Background-Layer Toggle Showcase ────────────────────────────────────
function BgLayerShowcaseDemo({ replay }: { replay: number }) {
  const allOn = { aurora: true, mesh: true, grain: true, fireflies: true, heartbeat: true };
  const [layers, setLayers] = useState(allOn);
  const lastReplay = useRef(replay);
  useEffect(() => {
    if (replay !== lastReplay.current) {
      lastReplay.current = replay;
      setLayers(allOn);
    }
  }, [replay]);
  const toggle = (k: keyof typeof allOn) => setLayers(s => ({ ...s, [k]: !s[k] }));

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Preview-Stage = Mini-Beamer */}
      <div style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        borderRadius: 10, background: '#0d0a06',
        minHeight: 260,
      }}>
        {layers.aurora && (
          <div style={{
            position: 'absolute', inset: '-20%',
            background:
              'radial-gradient(ellipse 60% 45% at 30% 30%, rgba(245,158,11,0.22) 0%, transparent 60%),' +
              'radial-gradient(ellipse 55% 50% at 70% 75%, rgba(168,85,247,0.22) 0%, transparent 65%)',
            animation: 'showAuroraDrift 22s ease-in-out infinite',
            pointerEvents: 'none',
            filter: 'blur(20px)',
          }} />
        )}
        {layers.mesh && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(99,102,241,0.16) 0%, transparent 28%),' +
              'radial-gradient(circle at 80% 30%, rgba(244,114,182,0.14) 0%, transparent 28%),' +
              'radial-gradient(circle at 60% 80%, rgba(34,197,94,0.14) 0%, transparent 32%)',
            animation: 'showMeshDrift 14s ease-in-out infinite alternate',
            pointerEvents: 'none',
          }} />
        )}
        {layers.grain && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.16 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
            opacity: 0.45,
            mixBlendMode: 'overlay',
            pointerEvents: 'none',
          }} />
        )}
        {layers.fireflies && <FirefliesLayer />}
        {/* Mock-Card (heartbeat nur wenn an) */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          padding: '22px 32px', borderRadius: 16,
          background: 'linear-gradient(180deg, #1f1610, #150e08)',
          border: '1px solid rgba(245,158,11,0.30)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(245,158,11,0.18)',
          color: '#f1f5f9',
          textAlign: 'center', maxWidth: '72%',
          animation: layers.heartbeat ? 'showCardHeartbeat 3.2s ease-in-out infinite' : 'none',
          willChange: 'transform',
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', color: '#fbbf24', marginBottom: 8 }}>STANDARD-THEME PREVIEW</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Welche Layer kommen ins echte /beamer?</div>
        </div>
      </div>
      {/* Toggle-Pillen */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
        {(['aurora','mesh','grain','fireflies','heartbeat'] as const).map(k => (
          <button key={k} onClick={() => toggle(k)} style={{
            padding: '5px 11px', borderRadius: 999,
            border: layers[k] ? '1px solid rgba(245,158,11,0.5)' : '1px solid rgba(255,255,255,0.10)',
            background: layers[k] ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.04)',
            color: layers[k] ? '#fbbf24' : '#64748b',
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
            textTransform: 'capitalize',
            transition: 'all 0.18s ease',
            fontFamily: 'inherit',
          }}>{layers[k] ? '✓' : '○'} {k}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function AnimationsLabPage() {
  const [replays, setReplays] = useState<number[]>(() => Array(7).fill(0));
  const replay = (i: number) => setReplays(r => r.map((v, j) => j === i ? v + 1 : v));
  // 2026-05-08: zweiter Counter-Set fuer Showreels (D/C/B/A/H = 5 Slots).
  const [showreelReplays, setShowreelReplays] = useState<number[]>(() => Array(5).fill(0));
  const replayShowreel = (i: number) => setShowreelReplays(r => r.map((v, j) => j === i ? v + 1 : v));

  const demos = [
    { title: 'Slide-Off + Push', blurb: 'Outgoing slidet links raus, Incoming kommt rechts rein mit Spring-Settle. 0.15 s Overlap → nie leerer Bildschirm.', keepAlive: false, render: (r: number) => <SlideOffPushDemo replay={r} /> },
    { title: 'Line-Mask Reveal', blurb: 'Quiz-Frage erscheint zeilenweise von unten in overflow:hidden-Maske, stagger 0.08 s. Drama ohne Cringe.', keepAlive: false, render: (_r: number) => <LineMaskRevealDemo /> },
    { title: 'Spring Pop-Scale', blurb: 'scale 0.85 → 1.02 → 1, opacity 0 → 1. Spring-Easing 260/22. Default-Mount für ALLE Cards.', keepAlive: false, render: (_r: number) => <SpringPopScaleDemo /> },
    { title: 'Slot-Machine Score', blurb: 'Alte Zahl rollt 3D-vertikal raus, neue rollt rein. Feiert Punkte statt nur Update zu zeigen.', keepAlive: false, render: (r: number) => <SlotMachineDemo replay={r} /> },
    // VT-Demo MUSS keepAlive=true — sonst remountet DemoCard die Component und round-state geht verloren.
    { title: 'View Transitions API', blurb: 'Native Browser-API für sanfte Cross-Fade zwischen Views. Baseline seit Oktober 2025 (Chrome/FF/Safari).', keepAlive: true,  render: (r: number) => <ViewTransitionsDemo replay={r} /> },
    { title: 'Word Stagger Fade-Up', blurb: 'Wörter erscheinen einzeln, stagger 0.05 s. Lesefluss bleibt, Optionen kommen sequenziell.', keepAlive: false, render: (_r: number) => <WordStaggerDemo /> },
    { title: '🎴 Bonus: 3D Card-Flip', blurb: 'Hearthstone-Style: Y-Rotate 180°, Vorder- und Rückseite. Sparsam — 1× pro Game = magisch, 5× = Cringe.', keepAlive: false, render: (r: number) => <CardFlipDemo replay={r} /> },
  ];

  // Quiz-Realistic Showreels (echtes Beamer-Card-Format, groessere Sandboxes).
  // Reihenfolge im Lab folgt Wolfs Build-Reihenfolge: D zuerst (kuerzester Build),
  // dann C, B, A, H. Zukuenftige Slots werden hier ergaenzt.
  const showreels: Array<{
    label: string; title: string; blurb: string; keepAlive: boolean;
    replayLabel?: string; minHeight?: number;
    render: (r: number) => React.ReactNode;
  }> = [
    {
      label: 'D', title: 'Background-Layer Toggle',
      blurb: 'Die 5 Kandidaten-Layer fuer den Standard-Beamer-Background — einzeln an/aus. Reset-Button setzt alle auf an. Hier siehst du was Aurora vs Mesh vs Grain visuell beitraegt.',
      keepAlive: true, replayLabel: '↺ Reset', minHeight: 460,
      render: (r) => <BgLayerShowcaseDemo replay={r} />,
    },
    {
      label: 'C', title: 'CHEESE Winner-Avatar-Drop-Cascade',
      blurb: '4 Teams hatten richtig — Avatare droppen mit Spring-Easing und 850 ms Stagger ueber das Subject-Bild. Letzter Avatar = Climax-Glow-Pulse. Spannungs-Hoehepunkt jeder CHEESE-Frage.',
      keepAlive: false, minHeight: 460,
      render: (r) => <CheeseWinnerCascadeDemo replay={r} />,
    },
    {
      label: 'B', title: '8-Team Score-Cascade + Position-Swap',
      blurb: 'Volles 8-Team-Grid. Stagger-Tickup von unten nach oben (200 ms), dann gestaffelter Position-Swap mit Spring-Bounce. Kraken springt von #4 auf #1 (+28 Punkte) — neuer Spitzenreiter kriegt Winner-Glow.',
      keepAlive: false, minHeight: 500,
      render: (r) => <ScoreCascadeDemo replay={r} />,
    },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background:
        'radial-gradient(ellipse 60% 50% at 20% 10%, rgba(245,158,11,0.10), transparent 60%),' +
        'radial-gradient(ellipse 60% 50% at 80% 90%, rgba(168,85,247,0.10), transparent 60%),' +
        '#0a0a10',
      color: '#f1f5f9',
      fontFamily: "'Nunito', system-ui, sans-serif",
      padding: '32px 28px 48px',
    }}>
      <style>{`
        @keyframes slideOutLeft {
          0%   { transform: translateX(0)        scale(1);    opacity: 1; }
          100% { transform: translateX(-110%)    scale(0.92); opacity: 0; }
        }
        @keyframes slideInLeft {
          0%   { transform: translateX(-110%)    scale(0.92); opacity: 0; }
          100% { transform: translateX(0)        scale(1);    opacity: 1; }
        }
        @keyframes slideOutRight {
          0%   { transform: translateX(0)        scale(1);    opacity: 1; }
          100% { transform: translateX(110%)     scale(0.92); opacity: 0; }
        }
        @keyframes slideInRight {
          0%   { transform: translateX(110%)     scale(0.92); opacity: 0; }
          100% { transform: translateX(0)        scale(1);    opacity: 1; }
        }
        @keyframes lineReveal {
          0%   { transform: translateY(100%); opacity: 0; }
          100% { transform: translateY(0);    opacity: 1; }
        }
        @keyframes springPop {
          0%   { transform: scale(0.85); opacity: 0; }
          70%  { transform: scale(1.04); opacity: 1; }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes slotOut {
          0%   { transform: rotateX(0deg)   translateY(0);    opacity: 1; }
          100% { transform: rotateX(-90deg) translateY(-30%); opacity: 0; }
        }
        @keyframes slotIn {
          0%   { transform: rotateX(90deg)  translateY(30%);  opacity: 0; }
          100% { transform: rotateX(0deg)   translateY(0);    opacity: 1; }
        }
        @keyframes wordFadeUp {
          0%   { transform: translateY(12px); opacity: 0; }
          100% { transform: translateY(0);    opacity: 1; }
        }
        @keyframes cardFlipFwd {
          0%   { transform: rotateY(0deg);   filter: brightness(1); }
          50%  { transform: rotateY(90deg);  filter: brightness(1.6); }
          100% { transform: rotateY(180deg); filter: brightness(1); }
        }
        @keyframes cardFlipBack {
          0%   { transform: rotateY(180deg); filter: brightness(1); }
          50%  { transform: rotateY(90deg);  filter: brightness(1.6); }
          100% { transform: rotateY(0deg);   filter: brightness(1); }
        }
        ::view-transition-old(demo-round-pill) { animation: vtOut 0.35s ease-out both; }
        ::view-transition-new(demo-round-pill) { animation: vtIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes vtOut { to { opacity: 0; transform: scale(0.9); } }
        @keyframes vtIn  { from { opacity: 0; transform: scale(1.05); } }

        /* ─── Quiz-Showreels Keyframes (Slot D / C / B / A / H) ─── */
        @keyframes showAuroraDrift {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50%      { transform: translate(-3%, 2%) rotate(8deg); }
        }
        @keyframes showMeshDrift {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-2%, 2%) scale(1.04); }
        }
        @keyframes showCardHeartbeat {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50%      { transform: translate(-50%, -50%) scale(1.012); }
        }
        @keyframes ffDriftSm {
          0%, 100% { transform: translate(0, 0); opacity: 0.4; }
          50%      { transform: translate(8px, -16px); opacity: 1; }
        }
        @keyframes cheeseAvatarDrop {
          0%   { transform: translateY(-58px) scale(0.45); opacity: 0; }
          60%  { transform: translateY(6px)   scale(1.08); opacity: 1; }
          100% { transform: translateY(0)     scale(1);    opacity: 1; }
        }
        @keyframes cheeseClimaxPulse {
          0%   { box-shadow: 0 0 24px rgba(251,191,36,0.7), 0 8px 20px rgba(0,0,0,0.4); }
          40%  { box-shadow: 0 0 56px rgba(251,191,36,1.0), 0 8px 20px rgba(0,0,0,0.4); }
          100% { box-shadow: 0 0 24px rgba(251,191,36,0.7), 0 8px 20px rgba(0,0,0,0.4); }
        }
        @keyframes cheeseAnswerBadge {
          0%   { transform: scale(0.4); opacity: 0; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes cheeseLabelFade {
          0%   { opacity: 0; transform: translateX(-50%) translateY(4px); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes rowSwap {
          0%   { transform: translateY(0); }
          100% { transform: translateY(var(--swapDiff)); }
        }
        @keyframes rowWinnerGlow {
          0%   { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.06); box-shadow: none; }
          100% {
            background: linear-gradient(90deg, rgba(251,191,36,0.20), rgba(251,191,36,0.04));
            border-color: rgba(251,191,36,0.45);
            box-shadow: 0 0 24px rgba(251,191,36,0.35);
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ maxWidth: 1280, margin: '0 auto 32px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
            🎬 Animation Demos
          </h1>
          <span style={{ fontSize: 13, color: '#64748b', fontFamily: 'monospace' }}>/animations</span>
        </div>
        <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 8, maxWidth: 820, lineHeight: 1.5 }}>
          Die 6 Top-Patterns aus der Animations-Recherche + Bonus 3D Card-Flip. Jede Demo hat einen Replay-Button —
          kannst beliebig oft re-triggern. Easing/Timing entspricht den 2026-Empfehlungen aus
          <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4, fontSize: 12, marginLeft: 4 }}>ANIMATION_PATTERNS.md</code>.
        </p>
      </div>

      {/* Grid */}
      <div style={{
        maxWidth: 1280, margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: 18,
      }}>
        {demos.map((d, i) => (
          <DemoCard key={i}
            num={i + 1}
            title={d.title}
            blurb={d.blurb}
            replay={replays[i]}
            onReplay={() => replay(i)}
            keepAlive={d.keepAlive}
          >
            {d.render(replays[i])}
          </DemoCard>
        ))}
      </div>

      {/* ─── Quiz-Realistic Showreels Section (2026-05-08) ─── */}
      <div style={{ maxWidth: 1280, margin: '56px auto 24px' }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap',
          paddingBottom: 14,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <h2 style={{ fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
            🎯 Quiz-Realistic Showreels
          </h2>
          <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>echtes Card-Format</span>
        </div>
        <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 12, maxWidth: 820, lineHeight: 1.5 }}>
          Im Gegensatz zu den Pattern-Stanzen oben zeigen diese Demos die Patterns im
          echten Beamer-Card-/View-Kontext. Hier triffst du die Auswahl was tatsaechlich
          ins Live-Quiz uebernommen wird — picken statt raten.
        </p>
      </div>
      <div style={{
        maxWidth: 1280, margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
        gap: 18,
      }}>
        {showreels.map((d, i) => (
          <DemoCard key={i}
            num={d.label}
            title={d.title}
            blurb={d.blurb}
            replay={showreelReplays[i]}
            onReplay={() => replayShowreel(i)}
            keepAlive={d.keepAlive}
            replayLabel={d.replayLabel}
            minHeight={d.minHeight ?? 460}
          >
            {d.render(showreelReplays[i])}
          </DemoCard>
        ))}
      </div>

      {/* Footer-Tipp */}
      <div style={{
        maxWidth: 1280, margin: '32px auto 0',
        padding: 20,
        background: 'rgba(245,158,11,0.06)',
        border: '1px solid rgba(245,158,11,0.18)',
        borderRadius: 12,
        fontSize: 13, color: '#cbd5e1', lineHeight: 1.5,
      }}>
        <strong style={{ color: '#fbbf24' }}>💡 Pro-Tipp:</strong> klick mehrere Replays nacheinander um zu sehen wie die Animation in echter Quiz-Frequenz wirkt
        (alle ~3-5 s eine neue Frage). Die Slide-Off-Push und Slot-Machine-Demos togglen zwischen zwei States — du
        siehst sowohl Eingang als auch Ausgang. View Transitions ist nur in modernen Browsern unterstützt — Demo zeigt Status oben.
      </div>
    </div>
  );
}
