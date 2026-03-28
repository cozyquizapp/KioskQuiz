import { useState } from 'react';
import { useQQSocket } from '../hooks/useQQSocket';
import {
  QQ_AVATARS, QQStateUpdate, QQ_CATEGORY_COLORS, QQ_CATEGORY_LABELS,
  QQ_TEAM_PALETTE, qqGetAvatar
} from '../../../shared/quarterQuizTypes';

const DEFAULT_ROOM = 'qq-test';

export default function QQBeamerPage() {
  const [roomCode, setRoomCode] = useState(DEFAULT_ROOM);
  const [joined, setJoined]     = useState(false);
  const { state, connected, emit } = useQQSocket(joined ? roomCode : '');

  async function join() {
    const ack = await emit('qq:joinBeamer', { roomCode });
    if (ack.ok) setJoined(true);
  }

  if (!joined) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0A06', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito', system-ui, sans-serif" }}>
        <div style={{ textAlign: 'center', color: '#e2e8f0' }}>
          <div style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>Quarter Quiz</div>
          <div style={{ color: '#64748b', marginBottom: 20 }}>Beamer-Ansicht</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <input value={roomCode} onChange={e => setRoomCode(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 14 }} />
            <button onClick={join} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #3B82F6', background: 'rgba(59,130,246,0.15)', color: '#3B82F6', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800 }}>Verbinden</button>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: connected ? '#22C55E' : '#EF4444' }}>{connected ? '● Verbunden' : '○ Getrennt'}</div>
        </div>
      </div>
    );
  }

  if (!state) {
    return <LoadingScreen roomCode={roomCode} connected={connected} />;
  }

  return <BeamerView state={state} />;
}

// ── Main Beamer View ─────────────────────────────────────────────────────────

function BeamerView({ state: s }: { state: QQStateUpdate }) {
  return (
    <div style={{
      minHeight: '100vh', width: '100vw', background: '#0D0A06',
      fontFamily: "'Nunito', system-ui, sans-serif",
      color: '#e2e8f0', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* Grain overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9990,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        opacity: 0.04, mixBlendMode: 'overlay',
      }} />

      {s.phase === 'LOBBY'           && <LobbyView state={s} />}
      {s.phase === 'PHASE_INTRO'     && <PhaseIntroView state={s} />}
      {s.phase === 'QUESTION_ACTIVE' && <QuestionView state={s} />}
      {s.phase === 'QUESTION_REVEAL' && <QuestionView state={s} revealed />}
      {s.phase === 'PLACEMENT'       && <PlacementView state={s} />}
      {s.phase === 'COMEBACK_CHOICE' && <ComebackView state={s} />}
      {s.phase === 'GAME_OVER'       && <GameOverView state={s} />}
    </div>
  );
}

// ── LOBBY ────────────────────────────────────────────────────────────────────

function LobbyView({ state: s }: { state: QQStateUpdate }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 32 }}>
      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Quartier Quiz</div>
        <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1.05, background: 'linear-gradient(135deg, #e2e8f0 60%, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Quarter Quiz
        </div>
        <div style={{ marginTop: 12, fontSize: 18, color: '#64748b' }}>Raum: <span style={{ color: '#e2e8f0', fontWeight: 800 }}>{s.roomCode}</span></div>
      </div>

      {/* Teams */}
      {s.teams.length === 0 ? (
        <div style={{ color: '#475569', fontSize: 16 }}>Warte auf Teams…</div>
      ) : (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          {s.teams.map(t => (
            <div key={t.id} style={{
              padding: '16px 24px', borderRadius: 18,
              background: `${t.color}18`, border: `2px solid ${t.color}66`,
              textAlign: 'center', minWidth: 120,
            }}>
              <div style={{ fontSize: 42, marginBottom: 6 }}>{qqGetAvatar(t.avatarId).emoji}</div>
              <div style={{ fontWeight: 900, fontSize: 18, color: t.color }}>{t.name}</div>
              <div style={{ fontSize: 12, color: t.connected ? '#22C55E' : '#64748b', marginTop: 4 }}>
                {t.connected ? '● verbunden' : '○ wartend'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Start hint */}
      <div style={{ color: '#334155', fontSize: 14, fontWeight: 700 }}>
        {s.teams.length < 2 ? 'Mindestens 2 Teams benötigt' : 'Moderator startet das Spiel'}
      </div>
    </div>
  );
}

// ── PHASE INTRO ──────────────────────────────────────────────────────────────

function PhaseIntroView({ state: s }: { state: QQStateUpdate }) {
  const phaseColors = ['#3B82F6', '#F59E0B', '#EF4444'];
  const color = phaseColors[(s.gamePhaseIndex - 1) % 3];
  const phaseNames = ['', 'Runde 1', 'Runde 2', 'Runde 3 — Finale'];
  const phaseDescs = ['', 'Felder besetzen', 'Setzen oder Klauen', 'Alles auf Spiel'];

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em',
          color: color, marginBottom: 16, opacity: 0.8,
        }}>Phase {s.gamePhaseIndex} / 3</div>
        <div style={{
          fontSize: 96, fontWeight: 900, lineHeight: 1,
          color,
          textShadow: `0 0 80px ${color}55`,
        }}>{phaseNames[s.gamePhaseIndex]}</div>
        <div style={{ fontSize: 22, color: '#94a3b8', marginTop: 16 }}>{phaseDescs[s.gamePhaseIndex]}</div>

        {/* Grid preview tiny */}
        <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center', opacity: 0.6 }}>
          <MiniGridCompact state={s} size={120} />
        </div>
      </div>
    </div>
  );
}

// ── QUESTION VIEW ────────────────────────────────────────────────────────────

function QuestionView({ state: s, revealed = false }: { state: QQStateUpdate; revealed?: boolean }) {
  const q = s.currentQuestion;
  if (!q) return null;
  const catColor = QQ_CATEGORY_COLORS[q.category];
  const catLabel = QQ_CATEGORY_LABELS[q.category];

  return (
    <div style={{ flex: 1, display: 'flex', gap: 0 }}>

      {/* Left: question area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 40px', justifyContent: 'center' }}>

        {/* Category badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20,
          padding: '7px 20px', borderRadius: 999,
          background: `${catColor}22`, border: `1px solid ${catColor}55`,
          color: catColor, fontSize: 14, fontWeight: 900, letterSpacing: '0.1em',
          textTransform: 'uppercase', alignSelf: 'flex-start',
        }}>
          <span>{catLabel.emoji}</span>
          <span>{s.language === 'en' ? catLabel.en : catLabel.de}</span>
          {s.language === 'both' && catLabel.en !== catLabel.de && (
            <span style={{ opacity: 0.6 }}>· {catLabel.en}</span>
          )}
        </div>

        {/* Phase + question counter */}
        <div style={{ fontSize: 13, color: '#475569', fontWeight: 700, marginBottom: 16 }}>
          Phase {s.gamePhaseIndex} · Frage {(s.questionIndex % 5) + 1}/5
        </div>

        {/* Question text */}
        <div style={{
          fontSize: 'clamp(28px, 3.8vw, 60px)', fontWeight: 900, lineHeight: 1.2,
          color: '#e2e8f0', marginBottom: 16,
        }}>{q.text}</div>

        {/* English subtitle */}
        {q.textEn && s.language !== 'de' && (
          <div style={{ fontSize: 'clamp(16px, 2vw, 28px)', color: '#64748b', fontStyle: 'italic' }}>
            {q.textEn}
          </div>
        )}

        {/* Answer reveal */}
        {revealed && s.revealedAnswer && (
          <div style={{
            marginTop: 28, padding: '16px 24px', borderRadius: 14,
            background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.4)',
            fontSize: 'clamp(22px, 2.8vw, 42px)', fontWeight: 900, color: '#4ade80',
            animation: 'fadeIn 0.4s ease',
          }}>
            ✓ {s.revealedAnswer}
          </div>
        )}

        {/* Correct team highlight */}
        {revealed && s.correctTeamId && (() => {
          const team = s.teams.find(t => t.id === s.correctTeamId);
          if (!team) return null;
          return (
            <div style={{
              marginTop: 16, display: 'flex', alignItems: 'center', gap: 12,
              fontSize: 20, fontWeight: 800,
            }}>
              <span style={{ fontSize: 28 }}>{qqGetAvatar(team.avatarId).emoji}</span>
              <span style={{ color: team.color }}>{team.name}</span>
              <span style={{ color: '#64748b' }}>antwortet!</span>
            </div>
          );
        })()}
      </div>

      {/* Right: live grid + scoreboard */}
      <div style={{
        width: 360, flexShrink: 0, padding: '32px 28px 32px 16px',
        display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center',
      }}>
        <GridDisplay state={s} />
        <ScoreBar teams={s.teams} />
      </div>
    </div>
  );
}

// ── PLACEMENT VIEW ───────────────────────────────────────────────────────────

function PlacementView({ state: s }: { state: QQStateUpdate }) {
  const team = s.teams.find(t => t.id === s.pendingFor);

  return (
    <div style={{ flex: 1, display: 'flex', gap: 0 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 40px', justifyContent: 'center' }}>

        {team && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, color: '#475569', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {actionVerb(s.pendingAction)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 64 }}>{qqGetAvatar(team.avatarId).emoji}</span>
              <div>
                <div style={{ fontSize: 'clamp(28px, 4vw, 56px)', fontWeight: 900, color: team.color, lineHeight: 1 }}>{team.name}</div>
                <div style={{ fontSize: 16, color: '#64748b', marginTop: 6 }}>{actionDesc(s.pendingAction, s.teamPhaseStats[team.id])}</div>
              </div>
            </div>
          </div>
        )}

        {/* Last question reminder */}
        {s.currentQuestion && s.revealedAnswer && (
          <div style={{
            padding: '12px 18px', borderRadius: 12,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            fontSize: 15, color: '#94a3b8',
          }}>
            <span style={{ color: '#4ade80', fontWeight: 800 }}>✓</span> {s.revealedAnswer}
          </div>
        )}
      </div>

      <div style={{
        width: 420, flexShrink: 0, padding: '32px 28px 32px 16px',
        display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center',
      }}>
        <GridDisplay state={s} highlightTeam={s.pendingFor} />
        <ScoreBar teams={s.teams} />
      </div>
    </div>
  );
}

// ── COMEBACK VIEW ─────────────────────────────────────────────────────────────

function ComebackView({ state: s }: { state: QQStateUpdate }) {
  const team = s.teams.find(t => t.id === s.comebackTeamId);

  return (
    <div style={{ flex: 1, display: 'flex', gap: 0 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 40px', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: '#F59E0B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 20 }}>
          ⚡ Comeback-Chance
        </div>
        {team && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
              <span style={{ fontSize: 64 }}>{qqGetAvatar(team.avatarId).emoji}</span>
              <div style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 900, color: team.color }}>{team.name}</div>
            </div>
            <div style={{ fontSize: 18, color: '#94a3b8', marginBottom: 24 }}>
              Wähle deine Comeback-Aktion:
            </div>
          </>
        )}

        {!s.comebackAction ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ComebackOption icon="📍" label="2 Felder setzen" desc="Platziere 2 freie Felder deiner Wahl" color="#22C55E" />
            <ComebackOption icon="⚡" label="1 Feld klauen" desc="Nimm ein fremdes Feld" color="#EF4444" />
            <ComebackOption icon="🔄" label="2 Felder tauschen" desc="Tausche je ein Feld von zwei Gegnern" color="#8B5CF6" />
          </div>
        ) : (
          <div style={{ fontSize: 22, fontWeight: 800, color: '#e2e8f0' }}>
            {s.comebackAction === 'PLACE_2' && '📍 2 Felder werden gesetzt…'}
            {s.comebackAction === 'STEAL_1' && '⚡ 1 Feld wird geklaut…'}
            {s.comebackAction === 'SWAP_2'  && '🔄 Felder werden getauscht…'}
          </div>
        )}
      </div>

      <div style={{
        width: 420, flexShrink: 0, padding: '32px 28px 32px 16px',
        display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center',
      }}>
        <GridDisplay state={s} highlightTeam={s.comebackTeamId} />
        <ScoreBar teams={s.teams} />
      </div>
    </div>
  );
}

// ── GAME OVER ────────────────────────────────────────────────────────────────

function GameOverView({ state: s }: { state: QQStateUpdate }) {
  const sorted = [...s.teams].sort((a, b) => b.largestConnected - a.largestConnected);
  const winner = sorted[0];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 28 }}>

      <div style={{ fontSize: 13, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
        Spielende
      </div>

      {winner && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 80, marginBottom: 8 }}>{qqGetAvatar(winner.avatarId).emoji}</div>
          <div style={{ fontSize: 72, fontWeight: 900, color: winner.color, lineHeight: 1, textShadow: `0 0 60px ${winner.color}44` }}>
            {winner.name}
          </div>
          <div style={{ fontSize: 22, color: '#94a3b8', marginTop: 10 }}>
            {winner.largestConnected} Felder verbunden
          </div>
        </div>
      )}

      {/* Final ranking */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {sorted.map((t, i) => (
          <div key={t.id} style={{
            padding: '12px 20px', borderRadius: 14,
            background: `${t.color}18`, border: `2px solid ${i === 0 ? t.color : `${t.color}44`}`,
            textAlign: 'center', minWidth: 100,
          }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 4 }}>#{i + 1}</div>
            <div style={{ fontSize: 28 }}>{qqGetAvatar(t.avatarId).emoji}</div>
            <div style={{ fontWeight: 800, color: t.color, fontSize: 15, marginTop: 4 }}>{t.name}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{t.largestConnected} verbunden</div>
          </div>
        ))}
      </div>

      <GridDisplay state={s} />
    </div>
  );
}

// ── SHARED GRID DISPLAY ───────────────────────────────────────────────────────

function GridDisplay({ state: s, highlightTeam }: { state: QQStateUpdate; highlightTeam?: string | null }) {
  const maxSize = 320;
  const cellSize = Math.floor((maxSize - (s.gridSize - 1) * 4) / s.gridSize);

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        Grid {s.gridSize}×{s.gridSize}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${s.gridSize}, ${cellSize}px)`,
        gap: 4,
      }}>
        {s.grid.flatMap((row, r) =>
          row.map((cell, c) => {
            const team = s.teams.find(t => t.id === cell.ownerId);
            const isHighlighted = highlightTeam && team?.id === highlightTeam;
            return (
              <div key={`${r}-${c}`} style={{
                width: cellSize, height: cellSize, borderRadius: 6,
                background: team ? `${team.color}${isHighlighted ? 'ff' : '88'}` : 'rgba(255,255,255,0.05)',
                border: cell.jokerFormed
                  ? '2px solid rgba(251,191,36,0.9)'
                  : team
                    ? `1px solid ${team.color}99`
                    : '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: Math.max(10, cellSize * 0.38),
                transition: 'all 0.3s',
                boxShadow: cell.jokerFormed ? '0 0 8px rgba(251,191,36,0.4)' : 'none',
              }}>
                {cell.jokerFormed && '⭐'}
                {!cell.jokerFormed && team && (qqGetAvatar(team.avatarId).emoji)}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── MINI GRID (tiny, for phase intro) ────────────────────────────────────────

function MiniGridCompact({ state: s, size }: { state: QQStateUpdate; size: number }) {
  const cellSize = Math.floor((size - (s.gridSize - 1) * 2) / s.gridSize);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${s.gridSize}, ${cellSize}px)`, gap: 2 }}>
      {s.grid.flatMap((row, r) =>
        row.map((cell, c) => {
          const team = s.teams.find(t => t.id === cell.ownerId);
          return (
            <div key={`${r}-${c}`} style={{
              width: cellSize, height: cellSize, borderRadius: 3,
              background: team ? team.color : 'rgba(255,255,255,0.05)',
            }} />
          );
        })
      )}
    </div>
  );
}

// ── SCORE BAR ────────────────────────────────────────────────────────────────

function ScoreBar({ teams }: { teams: QQStateUpdate['teams'] }) {
  const sorted = [...teams].sort((a, b) => b.largestConnected - a.largestConnected);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {sorted.map(t => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{qqGetAvatar(t.avatarId).emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: t.color }}>{t.name}</span>
              <span style={{ fontSize: 11, color: '#64748b' }}>{t.largestConnected} / {t.totalCells}</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3, background: t.color,
                width: `${Math.min(100, t.largestConnected * 10)}%`,
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── COMEBACK OPTION ROW ───────────────────────────────────────────────────────

function ComebackOption({ icon, label, desc, color }: { icon: string; label: string; desc: string; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 12,
      background: `${color}12`, border: `1px solid ${color}33`,
    }}>
      <span style={{ fontSize: 28 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 800, color, fontSize: 17 }}>{label}</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{desc}</div>
      </div>
    </div>
  );
}

// ── LOADING SCREEN ────────────────────────────────────────────────────────────

function LoadingScreen({ roomCode, connected }: { roomCode: string; connected: boolean }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#0D0A06', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: "'Nunito', system-ui, sans-serif", color: '#e2e8f0',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Quarter Quiz</div>
        <div style={{ color: '#475569', marginBottom: 12 }}>Raum: {roomCode}</div>
        <div style={{ fontSize: 12, color: connected ? '#22C55E' : '#EF4444' }}>
          {connected ? '● Warte auf Spielzustand…' : '○ Verbinde…'}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function actionVerb(action: string | null): string {
  if (action === 'STEAL_1') return '⚡ Klauen';
  if (action === 'COMEBACK') return '⚡ Comeback';
  return '📍 Setzen';
}

function actionDesc(action: string | null, stats: any): string {
  if (action === 'PLACE_1') return '1 Feld wählen';
  if (action === 'PLACE_2') return `2 Felder wählen (${stats?.placementsLeft ?? 2} übrig)`;
  if (action === 'STEAL_1') return '1 fremdes Feld klauen';
  if (action === 'FREE')    return 'Setzen oder Klauen';
  return '';
}
