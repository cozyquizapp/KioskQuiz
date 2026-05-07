// AnimationsLabPage — /animations
// 2026-05-07: 7 Animation-Demos zum Anschauen + Re-Triggern. Jede Demo hat
// einen Replay-Button, kurze Beschreibung, und zeigt das Pattern visuell.
// Self-contained, keine externen Libraries (alles CSS-Keyframes + vanilla JS).
import React, { useEffect, useRef, useState } from 'react';

// ─── Demo-Card-Wrapper ──────────────────────────────────────────────────────
function DemoCard({
  num, title, blurb, children, replay, onReplay,
}: {
  num: number | string;
  title: string;
  blurb: string;
  children: React.ReactNode;
  replay: number;
  onReplay: () => void;
}) {
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
      minHeight: 380,
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
        >▶ Replay</button>
      </div>
      <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.4 }}>{blurb}</div>
      <div key={replay} style={{
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
  // Replay triggert toggle
  const lastReplayRef = useRef(replay);
  useEffect(() => {
    if (replay === lastReplayRef.current) return;
    lastReplayRef.current = replay;
    const next = round === 1 ? 2 : 1;
    if (supports) {
      (document as any).startViewTransition(() => setRound(next));
    } else {
      setRound(next);
    }
  }, [replay, round, supports]);
  return (
    <div style={{
      width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      ['viewTransitionName' as any]: 'demo-round',
    }}>
      <div style={{
        padding: '12px 22px', borderRadius: 10,
        background: round === 1
          ? 'linear-gradient(180deg, rgba(59,130,246,0.30), rgba(37,99,235,0.18))'
          : 'linear-gradient(180deg, rgba(245,158,11,0.30), rgba(217,119,6,0.18))',
        border: round === 1 ? '2px solid #3B82F6' : '2px solid #F59E0B',
        fontSize: 24, fontWeight: 900, color: '#fff',
        letterSpacing: '0.05em',
      }}>Runde {round}</div>
      <div style={{
        fontSize: 11, color: supports ? '#22C55E' : '#EF4444',
        textAlign: 'center', fontWeight: 700,
      }}>
        {supports ? '✓ Browser unterstützt View Transitions API' : '✗ Browser unterstützt kein View Transitions (Fallback aktiv)'}
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

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function AnimationsLabPage() {
  const [replays, setReplays] = useState<number[]>(() => Array(7).fill(0));
  const replay = (i: number) => setReplays(r => r.map((v, j) => j === i ? v + 1 : v));

  const demos = [
    { title: 'Slide-Off + Push', blurb: 'Outgoing slidet links raus, Incoming kommt rechts rein mit Spring-Settle. 0.15 s Overlap → nie leerer Bildschirm.', render: (r: number) => <SlideOffPushDemo replay={r} /> },
    { title: 'Line-Mask Reveal', blurb: 'Quiz-Frage erscheint zeilenweise von unten in overflow:hidden-Maske, stagger 0.08 s. Drama ohne Cringe.', render: (r: number) => <LineMaskRevealDemo /> },
    { title: 'Spring Pop-Scale', blurb: 'scale 0.85 → 1.02 → 1, opacity 0 → 1. Spring-Easing 260/22. Default-Mount für ALLE Cards.', render: (r: number) => <SpringPopScaleDemo /> },
    { title: 'Slot-Machine Score', blurb: 'Alte Zahl rollt 3D-vertikal raus, neue rollt rein. Feiert Punkte statt nur Update zu zeigen.', render: (r: number) => <SlotMachineDemo replay={r} /> },
    { title: 'View Transitions API', blurb: 'Native Browser-API für sanfte Cross-Fade zwischen Views. Baseline seit Oktober 2025 (Chrome/FF/Safari).', render: (r: number) => <ViewTransitionsDemo replay={r} /> },
    { title: 'Word Stagger Fade-Up', blurb: 'Wörter erscheinen einzeln, stagger 0.05 s. Lesefluss bleibt, Optionen kommen sequenziell.', render: (r: number) => <WordStaggerDemo /> },
    { title: '🎴 Bonus: 3D Card-Flip', blurb: 'Hearthstone-Style: Y-Rotate 180°, Vorder- und Rückseite. Sparsam — 1× pro Game = magisch, 5× = Cringe.', render: (r: number) => <CardFlipDemo replay={r} /> },
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
        ::view-transition-old(demo-round) { animation: vtOut 0.35s ease-out both; }
        ::view-transition-new(demo-round) { animation: vtIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes vtOut { to { opacity: 0; transform: scale(0.9); } }
        @keyframes vtIn  { from { opacity: 0; transform: scale(1.05); } }
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
          >
            {d.render(replays[i])}
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
