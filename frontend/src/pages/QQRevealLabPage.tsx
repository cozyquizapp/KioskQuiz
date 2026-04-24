// QQ Reveal-Lab — Card-Grow-Transition-Prototypen
// ────────────────────────────────────────────────
// Problem: Reveal-Cards reservieren aktuell minHeight fuer Voter-Avatare,
// damit beim Reveal kein Layout-Shift passiert. Folge: die Card wirkt
// vor dem Reveal leer und zu gross.
//
// Entscheidung: Avatare bleiben IN der Card (klare Zuordnung), aber die
// minHeight-Reserve fliegt raus. Stattdessen waechst die Card beim Reveal
// smooth von kompakt auf expanded. Drei Transitionen zum Vergleich:
//
//   T1 ACCORDION — Voter-Slot klappt max-height 0 → 92 von oben rein
//   T2 GROW      — Card + Voter-Slot wachsen organisch (Padding mit)
//   T3 POP       — Card scale 0.97 → 1 + Voter-Slot bounce + Staggered-Drop

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QQTeamAvatar } from '../components/QQTeamAvatar';

// ── Mock-Teams (5 konsistent) ───────────────────────────────────────────────
type MockTeam = { id: string; name: string; color: string; avatarId: string };
const TEAMS: MockTeam[] = [
  { id: 't1', name: 'Maria',   color: '#266FD3', avatarId: 'panda'   },
  { id: 't2', name: 'Till',    color: '#68B4A5', avatarId: 'raccoon' },
  { id: 't3', name: 'Harald',  color: '#FA507F', avatarId: 'fox'     },
  { id: 't4', name: 'Sonja',   color: '#FEC814', avatarId: 'unicorn' },
  { id: 't5', name: 'Robin',   color: '#FF751F', avatarId: 'cow'     },
];
const teamById = (id: string) => TEAMS.find(t => t.id === id)!;

const CARD_BG = 'rgba(15,12,9,0.75)';

// Mu-Cho-Mock als repraesentatives Grid — Prinzip 1:1 auf Quizzichoice
// und Cheese uebertragbar, da alle drei dasselbe Card+Voter-Reserve-Problem haben.
const MUCHO_OPTS = [
  { label: 'A', text: 'Paris',  color: '#3B82F6', voters: ['t1', 't2'] },
  { label: 'B', text: 'Berlin', color: '#EF4444', voters: ['t3'] },
  { label: 'C', text: 'London', color: '#F59E0B', voters: [] },
  { label: 'D', text: 'Rom',    color: '#22C55E', voters: ['t4', 't5'], correct: true },
];

// ═════════════════════════════════════════════════════════════════════════════
// Primitives
// ═════════════════════════════════════════════════════════════════════════════

function Frame({ children, label, note }: { children: React.ReactNode; label: string; note: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(148,163,184,0.18)',
      borderRadius: 14,
      padding: 14,
      display: 'flex', flexDirection: 'column', gap: 10,
      minHeight: 380,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 900, color: '#f1f5f9' }}>{label}</span>
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.45, marginBottom: 4 }}>
        {note}
      </div>
      <div style={{
        flex: 1,
        background: 'linear-gradient(135deg,#0D0A06,#14100a)',
        borderRadius: 10,
        padding: 12,
        display: 'flex', flexDirection: 'column', gap: 8,
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  );
}

function QBadge({ text, accent }: { text: string; accent: string }) {
  return (
    <div style={{
      padding: '6px 12px', borderRadius: 8,
      background: `${accent}18`, border: `1.5px solid ${accent}44`,
      fontSize: 13, fontWeight: 900, color: '#F1F5F9',
      alignSelf: 'flex-start',
    }}>{text}</div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Transition-Varianten
// ═════════════════════════════════════════════════════════════════════════════

const TRANSITIONS = [
  {
    key: 'accordion',
    label: 'T1 · ACCORDION',
    desc: 'Voter-Slot klappt von oben rein (max-height 0 → 92px, 450ms cubic-bezier). Saubere Collapse-Mechanik, keine Card-Transformation. Voter faden versetzt rein.',
  },
  {
    key: 'grow',
    label: 'T2 · GROW',
    desc: 'Card + Voter-Slot wachsen organisch. Padding steigt mit, Voter faden mit kurzer Kaskade. Weichster Look, als würde die Card "atmen".',
  },
  {
    key: 'pop',
    label: 'T3 · POP',
    desc: 'Card skaliert kurz (scale 0.97 → 1) + Voter-Slot expandiert mit Bounce, Avatare droppen staggered von oben. Game-Show-Energie.',
  },
] as const;
type TransitionKey = typeof TRANSITIONS[number]['key'];

function TransitionCard({
  tKey, label, desc, autoLoop, replayKey,
}: {
  tKey: TransitionKey; label: string; desc: string; autoLoop: boolean; replayKey: number;
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
    const t1 = setTimeout(() => setExpanded(true), 800);
    if (!autoLoop) return () => clearTimeout(t1);
    const iv = setInterval(() => { setExpanded(v => !v); }, 5000);
    return () => { clearTimeout(t1); clearInterval(iv); };
  }, [autoLoop, replayKey]);

  return (
    <Frame label={label} note={desc}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 8px', borderRadius: 6,
          background: expanded ? 'rgba(34,197,94,0.1)' : 'rgba(148,163,184,0.05)',
          border: `1px solid ${expanded ? 'rgba(34,197,94,0.3)' : 'rgba(148,163,184,0.15)'}`,
          fontSize: 10, fontWeight: 900,
          color: expanded ? '#86efac' : '#94a3b8',
          letterSpacing: 0.5,
          transition: 'background 0.3s ease, border-color 0.3s ease, color 0.3s ease',
        }}>
          <span>{expanded ? '● REVEAL' : '○ ACTIVE'}</span>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              padding: '2px 8px', borderRadius: 4, border: 'none', cursor: 'pointer',
              background: 'rgba(59,130,246,0.25)', color: '#93c5fd',
              fontFamily: 'inherit', fontSize: 10, fontWeight: 800,
            }}
          >toggle</button>
        </div>
        <QBadge text="🅰️ Wo liegt der Eiffelturm?" accent="#3B82F6" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {MUCHO_OPTS.map((opt, i) => (
            <TransitionOptionCard
              key={opt.label}
              opt={opt}
              expanded={expanded}
              tKey={tKey}
              staggerIdx={i}
              replayKey={replayKey}
            />
          ))}
        </div>
      </div>
    </Frame>
  );
}

function TransitionOptionCard({
  opt, expanded, tKey, replayKey,
}: {
  opt: typeof MUCHO_OPTS[number]; expanded: boolean; tKey: TransitionKey; staggerIdx: number; replayKey: number;
}) {
  const isCorrect = expanded && opt.correct;
  const isWrong = expanded && !opt.correct;

  const padActive = tKey === 'grow' ? '4px 8px' : '6px 8px';
  const padRevealed = tKey === 'grow' ? '10px 10px 8px' : '8px 10px';
  const cardScale = tKey === 'pop' && expanded ? 'scale(1)' : (tKey === 'pop' ? 'scale(0.97)' : 'scale(1)');

  return (
    <div style={{
      padding: expanded ? padRevealed : padActive,
      borderRadius: 10,
      background: isCorrect ? 'rgba(34,197,94,0.22)' : CARD_BG,
      border: isCorrect ? '2px solid #22C55E' : `1.5px solid ${opt.color}55`,
      transform: cardScale,
      transformOrigin: 'center',
      transition: [
        'background 0.35s ease',
        'border-color 0.35s ease',
        'padding 0.45s cubic-bezier(0.34,1.35,0.64,1)',
        tKey === 'pop' ? 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)' : 'transform 0.3s ease',
      ].join(', '),
      display: 'flex', flexDirection: 'column', gap: 6,
      position: 'relative',
      opacity: isWrong ? 0.7 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          width: 22, height: 22, borderRadius: 5,
          background: isCorrect ? '#22C55E' : opt.color,
          color: '#fff', fontSize: 11, fontWeight: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>{opt.label}</span>
        <span style={{
          fontSize: 11, fontWeight: 800,
          color: isWrong ? '#475569' : '#f1f5f9', flex: 1,
          transition: 'color 0.3s ease',
        }}>{opt.text}</span>
      </div>
      <VoterSlot
        voters={opt.voters}
        expanded={expanded}
        tKey={tKey}
        isCorrect={!!opt.correct && expanded}
        replayKey={replayKey}
      />
    </div>
  );
}

function VoterSlot({
  voters, expanded, tKey, isCorrect, replayKey,
}: {
  voters: string[]; expanded: boolean; tKey: TransitionKey; isCorrect: boolean; replayKey: number;
}) {
  const maxH = expanded ? 60 : 0;
  const transitionEase = tKey === 'pop'
    ? 'max-height 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease 0.1s, margin-top 0.4s ease'
    : tKey === 'grow'
      ? 'max-height 0.55s cubic-bezier(0.22,1,0.36,1), opacity 0.35s ease 0.15s, margin-top 0.5s cubic-bezier(0.22,1,0.36,1)'
      : 'max-height 0.45s cubic-bezier(0.34,1.3,0.64,1), opacity 0.25s ease 0.1s';

  return (
    <div style={{
      maxHeight: maxH,
      marginTop: expanded ? 2 : 0,
      opacity: expanded ? 1 : 0,
      overflow: 'hidden',
      transition: transitionEase,
      display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
    }}>
      {voters.length === 0 && expanded && (
        <span style={{ fontSize: 9, color: '#475569', fontStyle: 'italic' }}>— niemand</span>
      )}
      {voters.map((id, i) => {
        const team = teamById(id);
        const dropAnim = tKey === 'pop' && expanded
          ? `voterSlotDrop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.15 + i * 0.08}s both`
          : undefined;
        const fadeAnim = tKey !== 'pop' && expanded
          ? `voterSlotFade 0.35s ease ${0.15 + i * 0.06}s both`
          : undefined;
        return (
          <div
            key={`${id}-${replayKey}-${expanded ? 'r' : 'a'}`}
            style={{ animation: dropAnim ?? fadeAnim }}
          >
            <div title={team.name} style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '1px 6px 1px 1px', borderRadius: 999,
              background: 'rgba(0,0,0,0.5)',
              border: `1.5px solid ${isCorrect ? '#FBBF24' : team.color}`,
              boxShadow: isCorrect ? '0 0 6px rgba(251,191,36,0.45)' : 'none',
            }}>
              <QQTeamAvatar avatarId={team.avatarId} size={18} />
              <span style={{
                fontSize: 9, fontWeight: 900,
                color: isCorrect ? '#FBBF24' : '#e2e8f0',
              }}>{team.name.slice(0,4)}</span>
            </div>
          </div>
        );
      })}
      <style>{`
        @keyframes voterSlotDrop {
          0%   { opacity: 0; transform: translateY(-14px) scale(0.7); }
          60%  { opacity: 1; transform: translateY(2px) scale(1.06); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes voterSlotFade {
          0%   { opacity: 0; transform: translateY(-6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Page
// ═════════════════════════════════════════════════════════════════════════════

export default function QQRevealLabPage() {
  const [autoLoop, setAutoLoop] = useState(true);
  const [replayKey, setReplayKey] = useState(0);

  return (
    <div style={{
      minHeight: '100vh', background: '#0b0d14', color: '#e2e8f0',
      padding: '20px 24px', fontFamily: "'Nunito', system-ui, sans-serif",
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <Link to="/menu" style={{
          padding: '6px 14px', borderRadius: 8,
          background: 'rgba(255,255,255,0.07)', color: '#cbd5e1',
          textDecoration: 'none', fontWeight: 700, fontSize: 13,
        }}>← Menü</Link>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>
          ✨ Reveal-Lab — Card-Grow-Transition
        </h1>
      </div>

      <div style={{
        fontSize: 13, color: '#94a3b8', marginBottom: 22, maxWidth: 1100, lineHeight: 1.5,
      }}>
        Avatare bleiben <b style={{ color: '#e2e8f0' }}>in</b> der Card (direkte Zuordnung = klar),
        aber die <b style={{ color: '#e2e8f0' }}>minHeight-Reserve fliegt raus</b>. Card startet
        kompakt (ohne Voter-Slot) und expandiert beim Reveal smooth.
        Drei Transition-Varianten zum Vergleichen — betrifft die drei Kategorien mit Card-Reserve-Problem:
        <b style={{ color: '#e2e8f0' }}> Mu-Cho, Quizzichoice, Cheese</b>.
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14,
      }}>
        <label style={{ fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={autoLoop} onChange={e => setAutoLoop(e.target.checked)} />
          Auto-Loop (5s Active / 5s Reveal)
        </label>
        <button
          onClick={() => setReplayKey(k => k + 1)}
          style={{
            padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: 800, fontSize: 13, background: '#22C55E', color: '#052e16',
          }}
        >▶ Alle replay</button>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14,
      }}>
        {TRANSITIONS.map(t => (
          <TransitionCard
            key={t.key}
            tKey={t.key}
            label={t.label}
            desc={t.desc}
            autoLoop={autoLoop}
            replayKey={replayKey}
          />
        ))}
      </div>

      <div style={{
        marginTop: 28, padding: 14, borderRadius: 12,
        background: 'rgba(251,191,36,0.08)',
        border: '1px solid rgba(251,191,36,0.3)',
        fontSize: 13, color: '#fde68a', lineHeight: 1.5,
      }}>
        💡 <b>Welche Transition gefällt?</b> Sag z.B. „T1 für alle drei" oder pro Kategorie gemischt —
        dann baue ich sie in QQBeamerPage ein und die minHeight-Reserven fliegen raus.
      </div>
    </div>
  );
}
