// QQ Reveal-Lab — Avatar-Layout-Prototypen pro Kategorie
// ───────────────────────────────────────────────────────
// Problem: Reveal-Cards reservieren aktuell Hoehe fuer Voter-Avatare, damit
// kein Layout-Shift passiert wenn sie reinkommen. Folge: die Card wirkt vor
// dem Reveal leer und zu gross. Alternative: Avatare AUSSERHALB der Card
// rendern → Card bleibt kompakt, keine Reserve-Hoehe noetig.
//
// Diese Lab-Page zeigt pro Kategorie 3 Layout-Prinzipien zur Entscheidung:
//   V1 „Unter"  — Avatare in separater Zeile unter dem Options-Grid
//   V2 „Ecke"   — Avatare als Floating-Chip an der Aussen-Ecke der Card
//   V3 „Seite"  — dedizierte Voter-Sidebar rechts neben dem Grid

import { Link } from 'react-router-dom';
import { QQTeamAvatar } from '../components/QQTeamAvatar';

// ── Mock-Teams (5 konsistent ueber alle Kategorien) ──────────────────────────
type MockTeam = { id: string; name: string; color: string; avatarId: string };
const TEAMS: MockTeam[] = [
  { id: 't1', name: 'Maria',   color: '#266FD3', avatarId: 'panda'   }, // Pinguin
  { id: 't2', name: 'Till',    color: '#68B4A5', avatarId: 'raccoon' }, // Waschbaer
  { id: 't3', name: 'Harald',  color: '#FA507F', avatarId: 'fox'     }, // Hund
  { id: 't4', name: 'Sonja',   color: '#FEC814', avatarId: 'unicorn' }, // Giraffe
  { id: 't5', name: 'Robin',   color: '#FF751F', avatarId: 'cow'     }, // Kuh
];

const teamById = (id: string) => TEAMS.find(t => t.id === id)!;

// Page-level Tokens
const CARD_BG = 'rgba(15,12,9,0.75)';

// ═════════════════════════════════════════════════════════════════════════════
// Gemeinsame Primitives
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
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 10,
      }}>
        <span style={{ fontSize: 13, fontWeight: 900, color: '#f1f5f9' }}>{label}</span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{note}</span>
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

function VoterChip({ team, hi }: { team: MockTeam; hi?: boolean }) {
  return (
    <div title={team.name} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px 2px 2px', borderRadius: 999,
      background: 'rgba(0,0,0,0.55)',
      border: `1.5px solid ${hi ? '#FBBF24' : team.color}`,
      boxShadow: hi ? '0 0 8px rgba(251,191,36,0.5)' : `0 0 6px ${team.color}44`,
    }}>
      <QQTeamAvatar avatarId={team.avatarId} size={20} />
      <span style={{ fontSize: 10, fontWeight: 900, color: hi ? '#FBBF24' : '#e2e8f0' }}>
        {team.name.slice(0, 4)}
      </span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MUCHO — 4 ABCD-Antworten, Voter pro Option
// ═════════════════════════════════════════════════════════════════════════════

const MUCHO_OPTS = [
  { label: 'A', text: 'Paris',     color: '#3B82F6', voters: ['t1', 't2'] },
  { label: 'B', text: 'Berlin',    color: '#EF4444', voters: ['t3'] },
  { label: 'C', text: 'London',    color: '#F59E0B', voters: [] },
  { label: 'D', text: 'Rom',       color: '#22C55E', voters: ['t4', 't5'], correct: true },
];

function MuchoCard({ opt, compact, showGreen }: { opt: typeof MUCHO_OPTS[number]; compact: boolean; showGreen: boolean }) {
  const isCorrect = showGreen && opt.correct;
  return (
    <div style={{
      padding: compact ? '6px 8px' : '8px 10px',
      borderRadius: 10,
      background: isCorrect ? 'rgba(34,197,94,0.22)' : CARD_BG,
      border: isCorrect ? '2px solid #22C55E' : `1.5px solid ${opt.color}55`,
      display: 'flex', alignItems: 'center', gap: 6,
      minHeight: compact ? 28 : 44,
      position: 'relative',
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: 5,
        background: isCorrect ? '#22C55E' : opt.color,
        color: '#fff', fontSize: 11, fontWeight: 900,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>{opt.label}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#f1f5f9', flex: 1 }}>{opt.text}</span>
    </div>
  );
}

function MuchoV1Below({ showAvatars }: { showAvatars: boolean }) {
  // Card KOMPAKT. Unter dem 2x2-Grid eine separate Avatar-Zeile gruppiert nach Option.
  return (
    <>
      <QBadge text="🅰️ Wo liegt der Eiffelturm?" accent="#3B82F6" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {MUCHO_OPTS.map(opt => <MuchoCard key={opt.label} opt={opt} compact showGreen={showAvatars} />)}
      </div>
      {showAvatars && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4,
          padding: '6px 8px', borderRadius: 10,
          background: 'rgba(148,163,184,0.05)',
          border: '1px dashed rgba(148,163,184,0.2)',
        }}>
          {MUCHO_OPTS.map(opt => (
            <div key={opt.label} style={{
              display: 'flex', alignItems: 'center', gap: 4, minHeight: 26,
              paddingLeft: 4, borderLeft: `2px solid ${opt.correct ? '#22C55E' : opt.color}88`,
            }}>
              <span style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', minWidth: 10 }}>{opt.label}</span>
              {opt.voters.length === 0
                ? <span style={{ fontSize: 9, color: '#475569', fontStyle: 'italic' }}>—</span>
                : opt.voters.map(id => <VoterChip key={id} team={teamById(id)} hi={opt.correct} />)}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function MuchoV2Corner({ showAvatars }: { showAvatars: boolean }) {
  // Avatare schweben als kleiner Chip-Stack AUSSERHALB der Card, oben-rechts.
  return (
    <>
      <QBadge text="🅰️ Wo liegt der Eiffelturm?" accent="#3B82F6" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, paddingTop: 16 }}>
        {MUCHO_OPTS.map(opt => (
          <div key={opt.label} style={{ position: 'relative' }}>
            <MuchoCard opt={opt} compact showGreen={showAvatars} />
            {showAvatars && opt.voters.length > 0 && (
              <div style={{
                position: 'absolute', top: -14, right: 4,
                display: 'flex', gap: -6,
              }}>
                {opt.voters.map((id, i) => (
                  <div key={id} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 10 - i }}>
                    <QQTeamAvatar avatarId={teamById(id).avatarId} size={26} style={{
                      border: `2px solid ${opt.correct ? '#FBBF24' : '#0D0A06'}`,
                      boxShadow: `0 0 6px ${teamById(id).color}88`,
                    }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function MuchoV3Sidebar({ showAvatars }: { showAvatars: boolean }) {
  // Links: Cards-Grid. Rechts: separate Voter-Liste (Label + Avatare pro Option).
  return (
    <>
      <QBadge text="🅰️ Wo liegt der Eiffelturm?" accent="#3B82F6" />
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {MUCHO_OPTS.map(opt => <MuchoCard key={opt.label} opt={opt} compact showGreen={showAvatars} />)}
        </div>
        <div style={{
          padding: 6, borderRadius: 8,
          background: 'rgba(148,163,184,0.05)',
          border: '1px dashed rgba(148,163,184,0.2)',
          display: 'flex', flexDirection: 'column', gap: 4,
          opacity: showAvatars ? 1 : 0.3,
        }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', letterSpacing: 0.5 }}>WER WÄHLTE?</div>
          {MUCHO_OPTS.map(opt => (
            <div key={opt.label} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              minHeight: 22,
            }}>
              <span style={{
                width: 14, height: 14, borderRadius: 3,
                background: opt.correct ? '#22C55E' : opt.color,
                color: '#fff', fontSize: 9, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>{opt.label}</span>
              {showAvatars && opt.voters.map(id => (
                <QQTeamAvatar key={id} avatarId={teamById(id).avatarId} size={18} style={{
                  border: opt.correct ? '1.5px solid #FBBF24' : 'none',
                }} />
              ))}
              {showAvatars && opt.voters.length === 0 && (
                <span style={{ fontSize: 9, color: '#475569', fontStyle: 'italic' }}>—</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// QUIZZICHOICE (ZEHN_VON_ZEHN) — 3 Antworten, Teams verteilen 10 Punkte
// ═════════════════════════════════════════════════════════════════════════════

const ZVZ_OPTS = [
  { num: 1, text: 'Mercedes',  color: '#3B82F6', top: [{ teamId: 't1', pts: 6 }], others: [{ teamId: 't2', pts: 3 }, { teamId: 't3', pts: 2 }] },
  { num: 2, text: 'VW',        color: '#22C55E', top: [{ teamId: 't4', pts: 7 }, { teamId: 't2', pts: 7 }], others: [{ teamId: 't5', pts: 4 }] },
  { num: 3, text: 'BMW',       color: '#EF4444', top: [{ teamId: 't3', pts: 8 }], others: [], correct: true },
];

function ZvzCard({ opt, showTop, showGreen }: { opt: typeof ZVZ_OPTS[number]; showTop: boolean; showGreen: boolean }) {
  const isCorrect = showGreen && opt.correct;
  return (
    <div style={{
      padding: '6px 8px', borderRadius: 10,
      background: isCorrect ? 'rgba(34,197,94,0.22)' : CARD_BG,
      border: isCorrect ? '2px solid #22C55E' : `1.5px solid ${opt.color}55`,
      display: 'flex', flexDirection: 'column', gap: 4,
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          width: 20, height: 20, borderRadius: 5,
          background: isCorrect ? '#22C55E' : opt.color,
          color: '#fff', fontSize: 10, fontWeight: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>{opt.num}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#f1f5f9' }}>{opt.text}</span>
      </div>
    </div>
  );
}

function ZvzV1Below({ showAvatars }: { showAvatars: boolean }) {
  return (
    <>
      <QBadge text="🎰 Deutsche Autohersteller" accent="#22C55E" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        {ZVZ_OPTS.map(opt => <ZvzCard key={opt.num} opt={opt} showTop={false} showGreen={showAvatars} />)}
      </div>
      {showAvatars && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6,
          padding: '6px 8px', borderRadius: 10,
          background: 'rgba(148,163,184,0.05)',
          border: '1px dashed rgba(148,163,184,0.2)',
          marginTop: 4,
        }}>
          {ZVZ_OPTS.map(opt => (
            <div key={opt.num} style={{
              display: 'flex', flexDirection: 'column', gap: 3, minHeight: 40,
              paddingLeft: 4, borderLeft: `2px solid ${opt.correct ? '#22C55E' : opt.color}88`,
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {opt.top.map(b => (
                  <VoterChip key={b.teamId + 't'} team={teamById(b.teamId)} hi />
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, opacity: 0.75 }}>
                {opt.others.map(b => <VoterChip key={b.teamId + 'o'} team={teamById(b.teamId)} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ZvzV2Corner({ showAvatars }: { showAvatars: boolean }) {
  // Top-Bet als goldener Chip schwebt oben-rechts AUSSERHALB der Card.
  return (
    <>
      <QBadge text="🎰 Deutsche Autohersteller" accent="#22C55E" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, paddingTop: 18 }}>
        {ZVZ_OPTS.map(opt => (
          <div key={opt.num} style={{ position: 'relative' }}>
            <ZvzCard opt={opt} showTop={false} showGreen={showAvatars} />
            {showAvatars && opt.top.length > 0 && (
              <div style={{
                position: 'absolute', top: -16, right: 2,
                display: 'flex', alignItems: 'center', gap: 3,
                padding: '2px 6px 2px 2px', borderRadius: 999,
                background: 'linear-gradient(135deg,rgba(251,191,36,0.18),rgba(251,191,36,0.05))',
                border: '1.5px solid #FBBF24',
                boxShadow: '0 0 10px rgba(251,191,36,0.5)',
              }}>
                {opt.top.map(b => (
                  <QQTeamAvatar key={b.teamId} avatarId={teamById(b.teamId).avatarId} size={20} />
                ))}
                <span style={{ fontSize: 10, fontWeight: 900, color: '#FBBF24' }}>
                  +{opt.top[0].pts}
                </span>
              </div>
            )}
            {showAvatars && opt.others.length > 0 && (
              <div style={{
                position: 'absolute', bottom: -12, left: 6,
                display: 'flex', gap: 2, opacity: 0.7,
              }}>
                {opt.others.map(b => (
                  <QQTeamAvatar key={b.teamId} avatarId={teamById(b.teamId).avatarId} size={14} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function ZvzV3Sidebar({ showAvatars }: { showAvatars: boolean }) {
  return (
    <>
      <QBadge text="🎰 Deutsche Autohersteller" accent="#22C55E" />
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {ZVZ_OPTS.map(opt => <ZvzCard key={opt.num} opt={opt} showTop={false} showGreen={showAvatars} />)}
        </div>
        <div style={{
          padding: 6, borderRadius: 8,
          background: 'rgba(148,163,184,0.05)',
          border: '1px dashed rgba(148,163,184,0.2)',
          display: 'flex', flexDirection: 'column', gap: 4,
          opacity: showAvatars ? 1 : 0.3,
        }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8' }}>TOP-TIPPS</div>
          {ZVZ_OPTS.map(opt => (
            <div key={opt.num} style={{ display: 'flex', alignItems: 'center', gap: 4, minHeight: 22 }}>
              <span style={{
                width: 14, height: 14, borderRadius: 3,
                background: opt.correct ? '#22C55E' : opt.color,
                fontSize: 8, color: '#fff', fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>{opt.num}</span>
              {showAvatars && opt.top.map(b => (
                <div key={b.teamId} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <QQTeamAvatar avatarId={teamById(b.teamId).avatarId} size={18} style={{ border: '1.5px solid #FBBF24' }} />
                  <span style={{ fontSize: 9, fontWeight: 900, color: '#FBBF24' }}>+{b.pts}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CHEESE — Bild-Raten, korrekter Lösungstext + Team-Treffer mit Zeiten
// ═════════════════════════════════════════════════════════════════════════════

const CHEESE_ANS = 'Eiffelturm';
const CHEESE_HITS = [
  { teamId: 't1', time: 0.0 },
  { teamId: 't5', time: 3.6 },
  { teamId: 't4', time: 5.1 },
  { teamId: 't3', time: 6.9 },
  { teamId: 't2', time: 8.8 },
];

function CheeseV1Below({ showAvatars }: { showAvatars: boolean }) {
  // Lösung in Card oben. Avatar-Reihe darunter in separatem Frame.
  return (
    <>
      <QBadge text="📸 Welches Bauwerk?" accent="#8B5CF6" />
      <div style={{
        padding: 10, borderRadius: 12,
        background: showAvatars ? 'rgba(34,197,94,0.18)' : CARD_BG,
        border: `2px solid ${showAvatars ? 'rgba(34,197,94,0.5)' : 'rgba(148,163,184,0.25)'}`,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: showAvatars ? '#4ade80' : '#64748b' }}>
          {showAvatars ? CHEESE_ANS : '? ? ?'}
        </div>
      </div>
      {showAvatars && (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap',
          padding: '8px 6px', borderRadius: 10,
          background: 'rgba(148,163,184,0.05)',
          border: '1px dashed rgba(148,163,184,0.2)',
          marginTop: 4,
        }}>
          {CHEESE_HITS.map((h, i) => {
            const team = teamById(h.teamId);
            const isFastest = i === 0;
            return (
              <div key={h.teamId} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
                <QQTeamAvatar avatarId={team.avatarId} size={28} style={{
                  border: isFastest ? '2px solid #FBBF24' : 'none',
                  boxShadow: isFastest ? '0 0 8px rgba(251,191,36,0.5)' : `0 0 4px ${team.color}55`,
                }} />
                <span style={{
                  fontSize: 9, fontWeight: 900,
                  color: isFastest ? '#FBBF24' : '#cbd5e1',
                  padding: '1px 5px', borderRadius: 999,
                  background: isFastest ? 'rgba(251,191,36,0.15)' : 'rgba(0,0,0,0.4)',
                }}>{h.time.toFixed(1)}s</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function CheeseV2Corner({ showAvatars }: { showAvatars: boolean }) {
  // Lösung in Card. Avatare schweben drumherum: Fastest oben-links, Rest seitlich.
  return (
    <>
      <QBadge text="📸 Welches Bauwerk?" accent="#8B5CF6" />
      <div style={{ position: 'relative', paddingTop: 18 }}>
        <div style={{
          padding: 16, borderRadius: 12,
          background: showAvatars ? 'rgba(34,197,94,0.18)' : CARD_BG,
          border: `2px solid ${showAvatars ? 'rgba(34,197,94,0.5)' : 'rgba(148,163,184,0.25)'}`,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: showAvatars ? '#4ade80' : '#64748b' }}>
            {showAvatars ? CHEESE_ANS : '? ? ?'}
          </div>
        </div>
        {showAvatars && CHEESE_HITS.map((h, i) => {
          const team = teamById(h.teamId);
          const isFastest = i === 0;
          // Avatare verteilen: 0=top-left, 1=top-right, 2=right, 3=bottom-right, 4=bottom-left
          const positions = [
            { top: -12, left: -8 },
            { top: -12, right: -8 },
            { bottom: 18, right: -20 },
            { bottom: -12, right: 20 },
            { bottom: -12, left: 8 },
          ];
          const pos = positions[i] ?? { top: 0, left: 0 };
          return (
            <div key={h.teamId} style={{
              position: 'absolute', ...pos,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
            }}>
              <QQTeamAvatar avatarId={team.avatarId} size={isFastest ? 32 : 24} style={{
                border: isFastest ? '2px solid #FBBF24' : 'none',
                boxShadow: isFastest ? '0 0 10px rgba(251,191,36,0.6)' : `0 0 4px ${team.color}66`,
              }} />
              <span style={{
                fontSize: 8, fontWeight: 900,
                color: isFastest ? '#FBBF24' : '#cbd5e1',
              }}>{h.time.toFixed(1)}s</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function CheeseV3Sidebar({ showAvatars }: { showAvatars: boolean }) {
  // Lösung links gross, Speed-Ranking rechts als vertikale Liste.
  return (
    <>
      <QBadge text="📸 Welches Bauwerk?" accent="#8B5CF6" />
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 8 }}>
        <div style={{
          padding: 14, borderRadius: 12,
          background: showAvatars ? 'rgba(34,197,94,0.18)' : CARD_BG,
          border: `2px solid ${showAvatars ? 'rgba(34,197,94,0.5)' : 'rgba(148,163,184,0.25)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: showAvatars ? '#4ade80' : '#64748b', textAlign: 'center' }}>
            {showAvatars ? CHEESE_ANS : '? ? ?'}
          </div>
        </div>
        <div style={{
          padding: 6, borderRadius: 8,
          background: 'rgba(148,163,184,0.05)',
          border: '1px dashed rgba(148,163,184,0.2)',
          display: 'flex', flexDirection: 'column', gap: 3,
          opacity: showAvatars ? 1 : 0.3,
        }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8' }}>SPEED</div>
          {CHEESE_HITS.map((h, i) => {
            const team = teamById(h.teamId);
            const isFastest = i === 0;
            return (
              <div key={h.teamId} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '2px 4px', borderRadius: 6,
                background: isFastest ? 'rgba(251,191,36,0.1)' : 'transparent',
                border: isFastest ? '1px solid rgba(251,191,36,0.4)' : '1px solid transparent',
              }}>
                <QQTeamAvatar avatarId={team.avatarId} size={20} style={{
                  border: isFastest ? '1.5px solid #FBBF24' : 'none',
                }} />
                <span style={{ fontSize: 9, fontWeight: 800, color: team.color, flex: 1 }}>{team.name}</span>
                <span style={{ fontSize: 9, fontWeight: 900, color: isFastest ? '#FBBF24' : '#94a3b8' }}>{h.time.toFixed(1)}s</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SCHÄTZCHEN — Zielzahl + Team-Schätzungen mit Distanz
// ═════════════════════════════════════════════════════════════════════════════

const SCHAETZ_TARGET = 108;
const SCHAETZ = [
  { teamId: 't3', guess: 108, delta: 0   }, // Harald = genau
  { teamId: 't1', guess: 108, delta: 0   }, // Maria   = genau
  { teamId: 't4', guess: 104, delta: 4   },
  { teamId: 't5', guess: 113, delta: 5   },
  { teamId: 't2', guess: 103, delta: 5   },
];

function SchaetzSolutionBox({ revealed }: { revealed: boolean }) {
  return (
    <div style={{
      padding: 12, borderRadius: 12,
      background: revealed ? 'rgba(34,197,94,0.18)' : CARD_BG,
      border: `2px solid ${revealed ? 'rgba(34,197,94,0.5)' : 'rgba(148,163,184,0.25)'}`,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 10, fontWeight: 900, color: '#86efac', letterSpacing: 1 }}>LÖSUNG</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: revealed ? '#4ade80' : '#64748b' }}>
        {revealed ? SCHAETZ_TARGET : '?'}
      </div>
    </div>
  );
}

function SchaetzV1Below({ showAvatars }: { showAvatars: boolean }) {
  // Lösung oben, Ranking als Liste darunter, Avatare INTEGRIERT (aktuelles Layout).
  return (
    <>
      <QBadge text="🎯 Messi Tore für Argentinien?" accent="#EAB308" />
      <SchaetzSolutionBox revealed={showAvatars} />
      {showAvatars && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
          {SCHAETZ.slice(0, 4).map((r, i) => {
            const team = teamById(r.teamId);
            const isTop = i === 0;
            return (
              <div key={r.teamId} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '3px 6px', borderRadius: 6,
                background: isTop ? `${team.color}22` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isTop ? team.color + '66' : 'rgba(148,163,184,0.15)'}`,
              }}>
                <span style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', minWidth: 14 }}>#{i+1}</span>
                <QQTeamAvatar avatarId={team.avatarId} size={18} />
                <span style={{ fontSize: 10, fontWeight: 900, color: team.color, flex: 1 }}>{team.name}</span>
                <span style={{ fontSize: 10, fontWeight: 900, color: '#fde68a' }}>{r.guess}</span>
                <span style={{ fontSize: 9, color: '#64748b' }}>Δ{r.delta}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function SchaetzV2Corner({ showAvatars }: { showAvatars: boolean }) {
  // Zahlenstrahl: Avatare schweben als Pins AUSSERHALB der Strahl-Card.
  const values = [100, 103, 104, 108, 113];
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  const pctOf = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <>
      <QBadge text="🎯 Messi Tore für Argentinien?" accent="#EAB308" />
      <div style={{ position: 'relative', paddingTop: 26, paddingBottom: 22 }}>
        {/* Strahl-Card */}
        <div style={{
          height: 28, borderRadius: 999,
          background: CARD_BG,
          border: '1.5px solid rgba(148,163,184,0.25)',
          position: 'relative',
        }}>
          {showAvatars && (
            <div style={{
              position: 'absolute', top: '50%',
              left: `${pctOf(SCHAETZ_TARGET)}%`,
              transform: 'translate(-50%,-50%)',
              width: 22, height: 22, borderRadius: '50%',
              background: '#22C55E', color: '#fff', fontSize: 9, fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 10px rgba(34,197,94,0.6)',
            }}>{SCHAETZ_TARGET}</div>
          )}
        </div>
        {/* Avatare oben und unten alternierend ausserhalb */}
        {showAvatars && SCHAETZ.map((r, i) => {
          const team = teamById(r.teamId);
          const above = i % 2 === 0;
          return (
            <div key={r.teamId} style={{
              position: 'absolute',
              left: `${pctOf(r.guess)}%`,
              top: above ? 0 : 44,
              transform: 'translateX(-50%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
            }}>
              <QQTeamAvatar avatarId={team.avatarId} size={i === 0 ? 24 : 18} style={{
                border: i === 0 ? '2px solid #FBBF24' : 'none',
              }} />
              <span style={{ fontSize: 8, color: team.color, fontWeight: 900 }}>{r.guess}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function SchaetzV3Sidebar({ showAvatars }: { showAvatars: boolean }) {
  // Lösung links, Ranking rechts (aktuelle Struktur, hier kompakter).
  return (
    <>
      <QBadge text="🎯 Messi Tore für Argentinien?" accent="#EAB308" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 8 }}>
        <SchaetzSolutionBox revealed={showAvatars} />
        <div style={{
          padding: 6, borderRadius: 8,
          background: 'rgba(148,163,184,0.05)',
          border: '1px dashed rgba(148,163,184,0.2)',
          display: 'flex', flexDirection: 'column', gap: 3,
          opacity: showAvatars ? 1 : 0.3,
        }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8' }}>AM NÄCHSTEN DRAN</div>
          {SCHAETZ.slice(0, 4).map((r, i) => {
            const team = teamById(r.teamId);
            const isTop = i === 0;
            return (
              <div key={r.teamId} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '2px 4px', borderRadius: 6,
                background: isTop ? `${team.color}22` : 'transparent',
              }}>
                <span style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', minWidth: 10 }}>{i+1}</span>
                <QQTeamAvatar avatarId={team.avatarId} size={18} />
                <span style={{ fontSize: 9, fontWeight: 900, color: team.color, flex: 1 }}>{team.name}</span>
                <span style={{ fontSize: 9, fontWeight: 900, color: '#fde68a' }}>{r.guess}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// BUNTE TÜTE (Hot Potato) — Antwort-Chips + Autor-Avatare
// ═════════════════════════════════════════════════════════════════════════════

const HP_ANSWERS = [
  { text: 'Berlin',   authorId: 't1' },
  { text: 'Hamburg',  authorId: 't2' },
  { text: 'München',  authorId: 't3' },
  { text: 'Köln',     authorId: 't4' },
  { text: 'Frankfurt', authorId: null }, // nicht genannt
  { text: 'Stuttgart', authorId: null },
];

function HpChip({ text, authorId, compact }: { text: string; authorId: string | null; compact: boolean }) {
  const named = authorId !== null;
  const team = authorId ? teamById(authorId) : null;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: compact ? '3px 8px' : '4px 10px 4px 4px',
      borderRadius: 999,
      background: named ? 'rgba(34,197,94,0.18)' : 'rgba(15,23,42,0.5)',
      border: `1.5px solid ${team ? team.color : (named ? '#22C55E' : 'rgba(148,163,184,0.25)')}`,
      color: named ? '#86efac' : '#94a3b8',
      fontSize: 10, fontWeight: 800,
    }}>
      {!compact && team && <QQTeamAvatar avatarId={team.avatarId} size={18} />}
      <span>{named ? '✓ ' : ''}{text}</span>
    </div>
  );
}

function HpV1Below({ showAvatars }: { showAvatars: boolean }) {
  // Chips NUR mit Text, Autor-Avatare in separater Author-Zeile darunter.
  return (
    <>
      <QBadge text="🥔 10 größte Städte Deutschlands" accent="#EF4444" />
      <div style={{
        padding: 8, borderRadius: 10,
        background: 'rgba(34,197,94,0.08)',
        border: '1.5px solid rgba(34,197,94,0.3)',
        display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center',
      }}>
        {HP_ANSWERS.map(a => <HpChip key={a.text} text={a.text} authorId={showAvatars ? null : null} compact />)}
      </div>
      {showAvatars && (
        <div style={{
          padding: '8px', borderRadius: 10,
          background: 'rgba(148,163,184,0.05)',
          border: '1px dashed rgba(148,163,184,0.2)',
          display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4,
        }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8' }}>WER HAT WAS GENANNT?</div>
          {HP_ANSWERS.filter(a => a.authorId).map(a => {
            const team = teamById(a.authorId!);
            return (
              <div key={a.text} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <QQTeamAvatar avatarId={team.avatarId} size={18} />
                <span style={{ fontSize: 9, fontWeight: 800, color: team.color }}>{team.name}</span>
                <span style={{ fontSize: 9, color: '#64748b' }}>→</span>
                <span style={{ fontSize: 9, fontWeight: 800, color: '#e2e8f0' }}>{a.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function HpV2Corner({ showAvatars }: { showAvatars: boolean }) {
  // Chips mit INTEGRIERTEM Avatar (aktuelle Variante) — "Corner" = Avatar vor Text.
  return (
    <>
      <QBadge text="🥔 10 größte Städte Deutschlands" accent="#EF4444" />
      <div style={{
        padding: 10, borderRadius: 10,
        background: 'rgba(34,197,94,0.08)',
        border: '1.5px solid rgba(34,197,94,0.3)',
        display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center',
      }}>
        {HP_ANSWERS.map(a => <HpChip key={a.text} text={a.text} authorId={showAvatars ? a.authorId : null} compact={false} />)}
      </div>
    </>
  );
}

function HpV3Sidebar({ showAvatars }: { showAvatars: boolean }) {
  return (
    <>
      <QBadge text="🥔 10 größte Städte Deutschlands" accent="#EF4444" />
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 8 }}>
        <div style={{
          padding: 8, borderRadius: 10,
          background: 'rgba(34,197,94,0.08)',
          border: '1.5px solid rgba(34,197,94,0.3)',
          display: 'flex', flexWrap: 'wrap', gap: 4, alignContent: 'flex-start',
        }}>
          {HP_ANSWERS.map(a => <HpChip key={a.text} text={a.text} authorId={null} compact />)}
        </div>
        <div style={{
          padding: 6, borderRadius: 8,
          background: 'rgba(148,163,184,0.05)',
          border: '1px dashed rgba(148,163,184,0.2)',
          display: 'flex', flexDirection: 'column', gap: 3,
          opacity: showAvatars ? 1 : 0.3,
        }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8' }}>AUTOR</div>
          {showAvatars && HP_ANSWERS.filter(a => a.authorId).map(a => {
            const team = teamById(a.authorId!);
            return (
              <div key={a.text} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <QQTeamAvatar avatarId={team.avatarId} size={16} />
                <span style={{ fontSize: 9, fontWeight: 800, color: team.color, flex: 1 }}>{a.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Page
// ═════════════════════════════════════════════════════════════════════════════

type CategoryBlock = {
  id: string;
  title: string;
  accent: string;
  note: string;
  variants: Array<{
    key: 'below' | 'corner' | 'sidebar';
    render: (showAvatars: boolean) => React.ReactNode;
  }>;
};

const BLOCKS: CategoryBlock[] = [
  {
    id: 'MUCHO', title: '🅰️ Mu-Cho (4 ABCD-Antworten)',
    accent: '#3B82F6',
    note: 'Voter erscheinen beim Reveal pro Option — Problem: Voter-Slot reserviert 92 px Höhe in jeder Card.',
    variants: [
      { key: 'below',   render: s => <MuchoV1Below   showAvatars={s} /> },
      { key: 'corner',  render: s => <MuchoV2Corner  showAvatars={s} /> },
      { key: 'sidebar', render: s => <MuchoV3Sidebar showAvatars={s} /> },
    ],
  },
  {
    id: 'ZVZ', title: '🎰 Quizzichoice (3 Antworten, Bets verteilen)',
    accent: '#22C55E',
    note: 'Top-Bets + niedrigere Bets. Card reserviert ~240 px für Highbet-Slot.',
    variants: [
      { key: 'below',   render: s => <ZvzV1Below   showAvatars={s} /> },
      { key: 'corner',  render: s => <ZvzV2Corner  showAvatars={s} /> },
      { key: 'sidebar', render: s => <ZvzV3Sidebar showAvatars={s} /> },
    ],
  },
  {
    id: 'CHEESE', title: '📸 Cheese (Bild-Raten, Speed-Ranking)',
    accent: '#8B5CF6',
    note: 'Lösungstext + Avatar-Reihe mit Sekunden. Reserviert Höhe für Avatar-Row.',
    variants: [
      { key: 'below',   render: s => <CheeseV1Below   showAvatars={s} /> },
      { key: 'corner',  render: s => <CheeseV2Corner  showAvatars={s} /> },
      { key: 'sidebar', render: s => <CheeseV3Sidebar showAvatars={s} /> },
    ],
  },
  {
    id: 'SCHAETZCHEN', title: '🎯 Schätzchen (Ziel + Distanz-Ranking)',
    accent: '#EAB308',
    note: 'Zielwert + bis zu 5 Team-Schätzungen. Eher Panel-Layout als Cards.',
    variants: [
      { key: 'below',   render: s => <SchaetzV1Below   showAvatars={s} /> },
      { key: 'corner',  render: s => <SchaetzV2Corner  showAvatars={s} /> },
      { key: 'sidebar', render: s => <SchaetzV3Sidebar showAvatars={s} /> },
    ],
  },
  {
    id: 'HP', title: '🥔 Bunte Tüte (Hot Potato Beispiel)',
    accent: '#EF4444',
    note: 'Antwort-Chips + Autor-Avatare. Avatar-Integration in den Chip aktuell.',
    variants: [
      { key: 'below',   render: s => <HpV1Below   showAvatars={s} /> },
      { key: 'corner',  render: s => <HpV2Corner  showAvatars={s} /> },
      { key: 'sidebar', render: s => <HpV3Sidebar showAvatars={s} /> },
    ],
  },
];

const VARIANT_META = {
  below:   { label: 'V1 · UNTER',  desc: 'Card bleibt kompakt, Avatare in separater Zeile darunter, pro Option gruppiert' },
  corner:  { label: 'V2 · ECKE',   desc: 'Avatare schweben als Chip-Stack an der Außen-Ecke der Card' },
  sidebar: { label: 'V3 · SEITE',  desc: 'Dedizierte Voter-Spalte rechts neben dem Options-Grid' },
} as const;

export default function QQRevealLabPage() {
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
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>👥 Reveal-Lab — Avatar-Layout-Prototypen</h1>
      </div>

      <div style={{
        fontSize: 13, color: '#94a3b8', marginBottom: 22, maxWidth: 1100, lineHeight: 1.5,
      }}>
        Aktuell reservieren Reveal-Cards Höhe für Voter-Avatare, damit beim Reveal kein Layout-Shift passiert.
        Folge: Cards wirken vor dem Reveal zu groß / leer.<br/>
        Hier sind pro Kategorie drei Alternativen, die die Avatare <b style={{ color: '#e2e8f0' }}>außerhalb</b> der Card
        anordnen — die Card bleibt konstant, kein Platzhalter nötig.
        Jede Variante zeigt links den <b style={{ color: '#64748b' }}>Pre-Reveal-Zustand</b> (ohne Avatare) und rechts das <b style={{ color: '#86efac' }}>Post-Reveal-Layout</b>.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {BLOCKS.map(block => (
          <section key={block.id}>
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10,
              borderBottom: `1px solid ${block.accent}33`, paddingBottom: 6,
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: block.accent }}>
                {block.title}
              </h2>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{block.note}</span>
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14,
            }}>
              {block.variants.map(v => {
                const meta = VARIANT_META[v.key];
                return (
                  <Frame key={v.key} label={meta.label} note={meta.desc}>
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                      flex: 1, alignContent: 'start',
                    }}>
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: 6,
                        padding: 8, borderRadius: 8,
                        background: 'rgba(148,163,184,0.03)',
                        border: '1px dotted rgba(148,163,184,0.15)',
                      }}>
                        <div style={{ fontSize: 9, fontWeight: 900, color: '#64748b', letterSpacing: 0.5 }}>
                          VORHER (Active)
                        </div>
                        {v.render(false)}
                      </div>
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: 6,
                        padding: 8, borderRadius: 8,
                        background: 'rgba(34,197,94,0.04)',
                        border: '1px solid rgba(34,197,94,0.2)',
                      }}>
                        <div style={{ fontSize: 9, fontWeight: 900, color: '#86efac', letterSpacing: 0.5 }}>
                          NACHHER (Reveal)
                        </div>
                        {v.render(true)}
                      </div>
                    </div>
                  </Frame>
                );
              })}
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
        💡 <b>Welche Variante gefällt?</b> Sag einfach z.B. „Mu-Cho ECKE, Quizzichoice SEITE, Cheese UNTER, Schätzchen SEITE, Bunte Tüte ECKE" —
        dann baue ich die echten Beamer-Layouts entsprechend um.
      </div>
    </div>
  );
}
