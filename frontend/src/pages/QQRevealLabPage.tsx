// QQ Reveal-Lab — Card-Grow-Transition-Prototypen
// ────────────────────────────────────────────────
// Pro Kategorie (Mu-Cho, Quizzichoice, Cheese) 3 Transitionen zum Vergleichen:
//   T1 ACCORDION — Slot klappt max-height 0 → X von oben rein
//   T2 GROW      — Card + Slot wachsen organisch (Padding mit)
//   T3 POP       — scale 0.97 → 1 + Slot bounce + Staggered-Drop

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QQTeamAvatar } from '../components/QQTeamAvatar';

// ── Mock-Teams ──────────────────────────────────────────────────────────────
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

// ═════════════════════════════════════════════════════════════════════════════
// Transition-Keys + globale Easing-Picker
// ═════════════════════════════════════════════════════════════════════════════

const TRANSITIONS = [
  {
    key: 'accordion',
    label: 'T1 · ACCORDION',
    desc: 'Slot klappt von oben rein (max-height 0 → X, 450ms cubic-bezier). Saubere Collapse, keine Card-Transformation.',
  },
  {
    key: 'grow',
    label: 'T2 · GROW',
    desc: 'Card + Slot wachsen organisch. Padding steigt mit, Fade mit kurzer Kaskade. Weichster "Atem"-Look.',
  },
  {
    key: 'pop',
    label: 'T3 · POP',
    desc: 'scale 0.97 → 1 + Slot expand mit Bounce + Staggered-Drop pro Avatar. Game-Show-Energie.',
  },
] as const;
type TransitionKey = typeof TRANSITIONS[number]['key'];

function slotTransition(tKey: TransitionKey): string {
  if (tKey === 'pop')  return 'max-height 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease 0.1s, margin-top 0.4s ease';
  if (tKey === 'grow') return 'max-height 0.55s cubic-bezier(0.22,1,0.36,1), opacity 0.35s ease 0.15s, margin-top 0.5s cubic-bezier(0.22,1,0.36,1)';
  return 'max-height 0.45s cubic-bezier(0.34,1.3,0.64,1), opacity 0.25s ease 0.1s';
}
function itemAnim(tKey: TransitionKey, i: number, expanded: boolean): string | undefined {
  if (!expanded) return undefined;
  if (tKey === 'pop') return `voterSlotDrop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.15 + i * 0.08}s both`;
  return `voterSlotFade 0.35s ease ${0.15 + i * 0.06}s both`;
}
function cardPadding(tKey: TransitionKey, expanded: boolean): string {
  if (tKey === 'grow') return expanded ? '10px 10px 8px' : '4px 8px';
  return expanded ? '8px 10px' : '6px 8px';
}
function cardScale(tKey: TransitionKey, expanded: boolean): string {
  return tKey === 'pop' ? (expanded ? 'scale(1)' : 'scale(0.97)') : 'scale(1)';
}
function cardTransition(tKey: TransitionKey): string {
  return [
    'background 0.35s ease',
    'border-color 0.35s ease',
    'padding 0.45s cubic-bezier(0.34,1.35,0.64,1)',
    tKey === 'pop' ? 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)' : 'transform 0.3s ease',
  ].join(', ');
}

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
      minHeight: 360,
    }}>
      <div style={{ fontSize: 13, fontWeight: 900, color: '#f1f5f9' }}>{label}</div>
      <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.45 }}>{note}</div>
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
      fontSize: 12, fontWeight: 900, color: '#F1F5F9',
      alignSelf: 'flex-start',
    }}>{text}</div>
  );
}

function StateBar({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
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
        onClick={onToggle}
        style={{
          padding: '2px 8px', borderRadius: 4, border: 'none', cursor: 'pointer',
          background: 'rgba(59,130,246,0.25)', color: '#93c5fd',
          fontFamily: 'inherit', fontSize: 10, fontWeight: 800,
        }}
      >toggle</button>
    </div>
  );
}

function useExpandLoop(autoLoop: boolean, replayKey: number) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    setExpanded(false);
    const t1 = setTimeout(() => setExpanded(true), 800);
    if (!autoLoop) return () => clearTimeout(t1);
    const iv = setInterval(() => setExpanded(v => !v), 5000);
    return () => { clearTimeout(t1); clearInterval(iv); };
  }, [autoLoop, replayKey]);
  return [expanded, setExpanded] as const;
}

// ═════════════════════════════════════════════════════════════════════════════
// MU-CHO — 4 ABCD-Options mit Voter-Chips
// ═════════════════════════════════════════════════════════════════════════════

const MUCHO_OPTS = [
  { label: 'A', text: 'Paris',  color: '#3B82F6', voters: ['t1', 't2'] },
  { label: 'B', text: 'Berlin', color: '#EF4444', voters: ['t3'] },
  { label: 'C', text: 'London', color: '#F59E0B', voters: [] },
  { label: 'D', text: 'Rom',    color: '#22C55E', voters: ['t4', 't5'], correct: true },
];

function MuchoTransitionCard({ tKey, label, desc, autoLoop, replayKey }: {
  tKey: TransitionKey; label: string; desc: string; autoLoop: boolean; replayKey: number;
}) {
  const [expanded, setExpanded] = useExpandLoop(autoLoop, replayKey);
  return (
    <Frame label={label} note={desc}>
      <StateBar expanded={expanded} onToggle={() => setExpanded(v => !v)} />
      <QBadge text="🅰️ Wo liegt der Eiffelturm?" accent="#3B82F6" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {MUCHO_OPTS.map(opt => {
          const isCorrect = expanded && opt.correct;
          const isWrong = expanded && !opt.correct;
          return (
            <div key={opt.label} style={{
              padding: cardPadding(tKey, expanded),
              borderRadius: 10,
              background: isCorrect ? 'rgba(34,197,94,0.22)' : CARD_BG,
              border: isCorrect ? '2px solid #22C55E' : `1.5px solid ${opt.color}55`,
              transform: cardScale(tKey, expanded),
              transformOrigin: 'center',
              transition: cardTransition(tKey),
              display: 'flex', flexDirection: 'column', gap: 6,
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
              {/* Voter-Slot */}
              <div style={{
                maxHeight: expanded ? 60 : 0,
                marginTop: expanded ? 2 : 0,
                opacity: expanded ? 1 : 0,
                overflow: 'hidden',
                transition: slotTransition(tKey),
                display: 'flex', flexWrap: 'wrap', gap: 4,
              }}>
                {opt.voters.length === 0 && expanded && (
                  <span style={{ fontSize: 9, color: '#475569', fontStyle: 'italic' }}>— niemand</span>
                )}
                {opt.voters.map((id, i) => {
                  const team = teamById(id);
                  return (
                    <div key={`${id}-${replayKey}-${expanded ? 'r' : 'a'}`} style={{ animation: itemAnim(tKey, i, expanded) }}>
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
              </div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// QUIZZICHOICE (ZvZ) — 3 Options mit Top-Bet-Chips
// ═════════════════════════════════════════════════════════════════════════════

const ZVZ_OPTS = [
  { num: 1, text: 'Mercedes', color: '#3B82F6', top: [{ teamId: 't1', pts: 6 }] },
  { num: 2, text: 'VW',       color: '#22C55E', top: [{ teamId: 't4', pts: 7 }, { teamId: 't2', pts: 7 }] },
  { num: 3, text: 'BMW',      color: '#EF4444', top: [{ teamId: 't3', pts: 8 }], correct: true },
];

function ZvzTransitionCard({ tKey, label, desc, autoLoop, replayKey }: {
  tKey: TransitionKey; label: string; desc: string; autoLoop: boolean; replayKey: number;
}) {
  const [expanded, setExpanded] = useExpandLoop(autoLoop, replayKey);
  return (
    <Frame label={label} note={desc}>
      <StateBar expanded={expanded} onToggle={() => setExpanded(v => !v)} />
      <QBadge text="🎰 Deutsche Autohersteller" accent="#22C55E" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        {ZVZ_OPTS.map(opt => {
          const isCorrect = expanded && opt.correct;
          const isWrong = expanded && !opt.correct;
          return (
            <div key={opt.num} style={{
              padding: cardPadding(tKey, expanded),
              borderRadius: 10,
              background: isCorrect ? 'rgba(34,197,94,0.22)' : CARD_BG,
              border: isCorrect ? '2px solid #22C55E' : `1.5px solid ${opt.color}55`,
              transform: cardScale(tKey, expanded),
              transformOrigin: 'center',
              transition: cardTransition(tKey),
              display: 'flex', flexDirection: 'column', gap: 5,
              opacity: isWrong ? 0.7 : 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 4,
                  background: isCorrect ? '#22C55E' : opt.color,
                  color: '#fff', fontSize: 9, fontWeight: 900,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>{opt.num}</span>
                <span style={{
                  fontSize: 10, fontWeight: 800,
                  color: isWrong ? '#475569' : '#f1f5f9', flex: 1,
                }}>{opt.text}</span>
              </div>
              {/* Highbet-Slot: grosse Avatare mit Punkten */}
              <div style={{
                maxHeight: expanded ? 76 : 0,
                marginTop: expanded ? 2 : 0,
                opacity: expanded ? 1 : 0,
                overflow: 'hidden',
                transition: slotTransition(tKey),
                display: 'flex', flexWrap: 'wrap', gap: 4,
              }}>
                {opt.top.map((b, i) => {
                  const team = teamById(b.teamId);
                  return (
                    <div key={`${b.teamId}-${replayKey}-${expanded ? 'r' : 'a'}`} style={{ animation: itemAnim(tKey, i, expanded) }}>
                      <div title={team.name} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px 2px 2px', borderRadius: 999,
                        background: 'rgba(0,0,0,0.55)',
                        border: `1.5px solid ${team.color}`,
                        boxShadow: `0 0 6px ${team.color}55`,
                      }}>
                        <QQTeamAvatar avatarId={team.avatarId} size={22} />
                        <span style={{
                          fontSize: 11, fontWeight: 900,
                          color: '#FBBF24',
                        }}>{b.pts}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CHEESE — Lösungstext + Avatar-Speed-Reihe
// ═════════════════════════════════════════════════════════════════════════════

const CHEESE_ANS = 'Eiffelturm';
const CHEESE_HITS = [
  { teamId: 't1', time: 0.0 },
  { teamId: 't5', time: 3.6 },
  { teamId: 't4', time: 5.1 },
  { teamId: 't3', time: 6.9 },
  { teamId: 't2', time: 8.8 },
];

function CheeseTransitionCard({ tKey, label, desc, autoLoop, replayKey }: {
  tKey: TransitionKey; label: string; desc: string; autoLoop: boolean; replayKey: number;
}) {
  const [expanded, setExpanded] = useExpandLoop(autoLoop, replayKey);
  return (
    <Frame label={label} note={desc}>
      <StateBar expanded={expanded} onToggle={() => setExpanded(v => !v)} />
      <QBadge text="📸 Welches Bauwerk?" accent="#8B5CF6" />
      {/* Bild-Platzhalter */}
      <div style={{
        height: 60, borderRadius: 10,
        background: 'linear-gradient(135deg, rgba(139,92,246,0.18), rgba(139,92,246,0.04))',
        border: '1.5px solid rgba(139,92,246,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, color: '#c4b5fd', fontWeight: 800, letterSpacing: 0.5,
      }}>[ Bild ]</div>
      {/* Lösungs-Card — waechst mit beim Reveal */}
      <div style={{
        padding: cardPadding(tKey, expanded),
        borderRadius: 10,
        background: expanded ? 'rgba(34,197,94,0.2)' : CARD_BG,
        border: `1.5px solid ${expanded ? 'rgba(34,197,94,0.55)' : 'rgba(148,163,184,0.18)'}`,
        transform: cardScale(tKey, expanded),
        transformOrigin: 'center',
        transition: cardTransition(tKey),
        display: 'flex', flexDirection: 'column', gap: 6,
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: expanded ? 20 : 14, fontWeight: 900,
          color: expanded ? '#4ade80' : '#64748b',
          transition: 'font-size 0.4s cubic-bezier(0.34,1.35,0.64,1), color 0.35s ease',
        }}>
          {expanded ? CHEESE_ANS : '? ? ?'}
        </div>
        {/* Avatar-Slot innerhalb der Lösungs-Card */}
        <div style={{
          maxHeight: expanded ? 70 : 0,
          marginTop: expanded ? 4 : 0,
          opacity: expanded ? 1 : 0,
          overflow: 'hidden',
          transition: slotTransition(tKey),
          display: 'flex', justifyContent: 'center', gap: 8,
        }}>
          {CHEESE_HITS.map((h, i) => {
            const team = teamById(h.teamId);
            const isFastest = i === 0;
            return (
              <div key={`${h.teamId}-${replayKey}-${expanded ? 'r' : 'a'}`} style={{ animation: itemAnim(tKey, i, expanded) }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <QQTeamAvatar avatarId={team.avatarId} size={30} style={{
                    border: isFastest ? '2px solid #FBBF24' : 'none',
                    boxShadow: isFastest ? '0 0 8px rgba(251,191,36,0.5)' : `0 0 4px ${team.color}55`,
                  }} />
                  <span style={{
                    fontSize: 9, fontWeight: 900,
                    padding: '1px 5px', borderRadius: 999,
                    background: isFastest ? 'rgba(251,191,36,0.18)' : 'rgba(0,0,0,0.4)',
                    color: isFastest ? '#FBBF24' : '#cbd5e1',
                  }}>{h.time.toFixed(1)}s</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Frame>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Page
// ═════════════════════════════════════════════════════════════════════════════

type SectionConfig = {
  id: string;
  title: string;
  accent: string;
  render: (tKey: TransitionKey, label: string, desc: string, autoLoop: boolean, replayKey: number) => React.ReactNode;
};

const SECTIONS: SectionConfig[] = [
  {
    id: 'mucho',
    title: '🅰️ Mu-Cho (4 ABCD + Voter-Chips)',
    accent: '#3B82F6',
    render: (t, l, d, a, r) => <MuchoTransitionCard tKey={t} label={l} desc={d} autoLoop={a} replayKey={r} />,
  },
  {
    id: 'zvz',
    title: '🎰 Quizzichoice (3 Options + Highbet-Chips)',
    accent: '#22C55E',
    render: (t, l, d, a, r) => <ZvzTransitionCard tKey={t} label={l} desc={d} autoLoop={a} replayKey={r} />,
  },
  {
    id: 'cheese',
    title: '📸 Cheese (Lösung + Avatar-Speed-Reihe)',
    accent: '#8B5CF6',
    render: (t, l, d, a, r) => <CheeseTransitionCard tKey={t} label={l} desc={d} autoLoop={a} replayKey={r} />,
  },
];

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
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <label style={{ fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={autoLoop} onChange={e => setAutoLoop(e.target.checked)} />
            Auto-Loop
          </label>
          <button
            onClick={() => setReplayKey(k => k + 1)}
            style={{
              padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 800, fontSize: 13, background: '#22C55E', color: '#052e16',
            }}
          >▶ Alle replay</button>
        </div>
      </div>

      <div style={{
        fontSize: 13, color: '#94a3b8', marginBottom: 22, maxWidth: 1100, lineHeight: 1.5,
      }}>
        Avatare bleiben <b style={{ color: '#e2e8f0' }}>in</b> der Card, minHeight-Reserve fliegt raus.
        Card startet kompakt, expandiert beim Reveal smooth. Pro Kategorie die drei Transitionen im Vergleich —
        entscheide pro Kategorie welche passt.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {SECTIONS.map(sec => (
          <section key={sec.id}>
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10,
              borderBottom: `1px solid ${sec.accent}33`, paddingBottom: 6,
            }}>
              <h2 style={{ fontSize: 17, fontWeight: 900, margin: 0, color: sec.accent }}>
                {sec.title}
              </h2>
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14,
            }}>
              {TRANSITIONS.map(t => (
                <div key={t.key}>
                  {sec.render(t.key, t.label, t.desc, autoLoop, replayKey)}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div style={{
        marginTop: 28, padding: 14, borderRadius: 12,
        background: 'rgba(251,191,36,0.08)',
        border: '1px solid rgba(251,191,36,0.3)',
        fontSize: 13, color: '#fde68a', lineHeight: 1.5,
      }}>
        💡 <b>Sag pro Kategorie eine Transition</b>, z.B. „Mu-Cho POP, Quizzichoice ACCORDION, Cheese GROW" —
        dann baue ich sie in QQBeamerPage ein und die minHeight-Reserven fliegen raus.
      </div>

      {/* Globale Keyframes */}
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
