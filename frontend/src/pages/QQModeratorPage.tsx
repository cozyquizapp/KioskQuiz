import { useState, useEffect } from 'react';
import { useQQSocket } from '../hooks/useQQSocket';
import {
  QQ_AVATARS, QQQuestion, QQLanguage, QQ_CATEGORY_LABELS, QQ_CATEGORY_COLORS,
  qqGetAvatar, QQStateUpdate,
} from '../../../shared/quarterQuizTypes';

function getRoomCode(): string {
  if (typeof window === 'undefined') return 'qq-test';
  const params = new URLSearchParams(window.location.search);
  return params.get('room') || localStorage.getItem('qq-moderatorRoom') || 'qq-test';
}

export default function QQModeratorPage() {
  const [roomCode] = useState(getRoomCode);
  const [language, setLanguage] = useState<QQLanguage>('both');
  const [joined, setJoined]     = useState(false);
  const { state, connected, emit } = useQQSocket(roomCode);

  // Auto-join as moderator once connected
  useEffect(() => {
    if (!connected || joined) return;
    emit('qq:joinModerator', { roomCode }).then(ack => {
      if (ack.ok) setJoined(true);
    });
  }, [connected]);

  // Persist room code
  useEffect(() => {
    localStorage.setItem('qq-moderatorRoom', roomCode);
  }, [roomCode]);

  async function startGame() {
    const res = await fetch(`/api/qq/questions/default`);
    const questions: QQQuestion[] = await res.json();
    await emit('qq:startGame', { roomCode, questions, language });
  }

  const s = state;
  const teamList = s?.teams ?? [];

  return (
    <div style={page}>
      {/* ── Header ── */}
      <div style={header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={badge('#3B82F6')}>Quartier Quiz</span>
          <span style={{ fontWeight: 900, fontSize: 18 }}>Moderator</span>
          {s?.phase && <span style={phasePill(s.phase)}>{s.phase}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {s && (
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Raum: <b style={{ color: '#94a3b8' }}>{roomCode}</b>
            </span>
          )}
          <span style={{ fontSize: 13, fontWeight: 800, color: connected ? '#22C55E' : '#EF4444' }}>
            {connected ? '● Verbunden' : '○ Getrennt'}
          </span>
        </div>
      </div>

      {!joined && connected && (
        <div style={card}>
          <div style={{ color: '#64748b', fontSize: 14 }}>Verbinde als Moderator…</div>
        </div>
      )}

      {joined && s && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14 }}>

          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Status pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Pill label={`Phase ${s.gamePhaseIndex}/3`} color="#3B82F6" />
              <Pill label={`Frage ${(s.questionIndex % 5) + 1}/5`} color="#6366f1" />
              <Pill label={`Global ${s.questionIndex + 1}/15`} color="#475569" />
              {s.pendingFor && (
                <Pill label={`⏳ ${teamList.find(t => t.id === s.pendingFor)?.name ?? s.pendingFor}`} color="#F59E0B" />
              )}
            </div>

            {/* Action controls */}
            <div style={card}>
              <div style={sectionLabel}>Spielsteuerung</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>

                {s.phase === 'LOBBY' && (
                  <>
                    <select value={language} onChange={e => setLanguage(e.target.value as QQLanguage)} style={selectStyle}>
                      <option value="both">DE + EN</option>
                      <option value="de">Deutsch</option>
                      <option value="en">English</option>
                    </select>
                    <Btn color="#22C55E" onClick={startGame}>▶ Spiel starten</Btn>
                  </>
                )}

                {s.phase === 'PHASE_INTRO' && (
                  <Btn color="#22C55E" onClick={() => emit('qq:activateQuestion', { roomCode })}>
                    ▶ Frage aktivieren
                  </Btn>
                )}

                {s.phase === 'QUESTION_ACTIVE' && (
                  <Btn color="#F59E0B" onClick={() => emit('qq:revealAnswer', { roomCode })}>
                    Antwort aufdecken
                  </Btn>
                )}

                {s.phase === 'QUESTION_REVEAL' && !s.correctTeamId && (
                  <>
                    {teamList.map(t => (
                      <Btn key={t.id} color={t.color} onClick={() => emit('qq:markCorrect', { roomCode, teamId: t.id })}>
                        <span style={{ marginRight: 4 }}>{qqGetAvatar(t.avatarId).emoji}</span>
                        ✓ {t.name}
                      </Btn>
                    ))}
                    <Btn color="#475569" onClick={() => emit('qq:markWrong', { roomCode })}>
                      ✗ Niemand
                    </Btn>
                  </>
                )}

                {s.phase === 'PLACEMENT' && s.pendingAction && (
                  <PlacementControls state={s} roomCode={roomCode} emit={emit} />
                )}

                {s.phase === 'QUESTION_REVEAL' && s.correctTeamId && !s.pendingFor && (
                  <Btn color="#22C55E" onClick={() => emit('qq:nextQuestion', { roomCode })}>
                    → Nächste Frage
                  </Btn>
                )}

                {s.phase === 'COMEBACK_CHOICE' && (
                  <ComebackControls state={s} roomCode={roomCode} emit={emit} />
                )}

                {s.phase === 'GAME_OVER' && (
                  <div style={{ fontSize: 14, color: '#64748b' }}>🏆 Spiel beendet</div>
                )}

                <Btn color="#EF4444" outline onClick={() => emit('qq:resetRoom', { roomCode })}>
                  ↺ Reset
                </Btn>
              </div>
            </div>

            {/* Current question */}
            {s.currentQuestion && (
              <div style={{ ...card, borderColor: `${QQ_CATEGORY_COLORS[s.currentQuestion.category]}44` }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 999,
                    background: `${QQ_CATEGORY_COLORS[s.currentQuestion.category]}22`,
                    color: QQ_CATEGORY_COLORS[s.currentQuestion.category],
                    border: `1px solid ${QQ_CATEGORY_COLORS[s.currentQuestion.category]}44`,
                  }}>
                    {QQ_CATEGORY_LABELS[s.currentQuestion.category].emoji} {QQ_CATEGORY_LABELS[s.currentQuestion.category].de}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    Phase {s.currentQuestion.phaseIndex} · #{s.currentQuestion.questionIndexInPhase + 1}
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6, color: '#e2e8f0' }}>
                  {s.currentQuestion.text}
                </div>
                {s.currentQuestion.textEn && (
                  <div style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>
                    {s.currentQuestion.textEn}
                  </div>
                )}
                {s.revealedAnswer && (
                  <div style={{
                    marginTop: 8, padding: '8px 12px', borderRadius: 8,
                    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                    color: '#4ade80', fontWeight: 800,
                  }}>
                    ✓ {s.revealedAnswer}
                  </div>
                )}
              </div>
            )}

            {/* Teams */}
            <div style={card}>
              <div style={sectionLabel}>Teams ({teamList.length})</div>
              {teamList.length === 0 && (
                <div style={{ color: '#475569', fontSize: 13 }}>Noch keine Teams beigetreten</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {teamList.map(t => {
                  const stats = s.teamPhaseStats[t.id];
                  return (
                    <div key={t.id} style={{
                      padding: '10px 12px', borderRadius: 10,
                      border: `2px solid ${s.pendingFor === t.id ? t.color : 'rgba(255,255,255,0.07)'}`,
                      background: s.correctTeamId === t.id ? `${t.color}18` : 'rgba(255,255,255,0.03)',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <span style={{ fontSize: 22 }}>{qqGetAvatar(t.avatarId).emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 800, color: t.color }}>{t.name}</span>
                          <span style={{ fontSize: 11, color: t.connected ? '#22C55E' : '#EF4444' }}>
                            {t.connected ? '●' : '○'}
                          </span>
                          {s.correctTeamId === t.id && (
                            <span style={{ fontSize: 11, color: '#4ade80' }}>✓ richtig</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                          {t.largestConnected} verbunden · {t.totalCells} Felder
                          {stats?.stealsUsed > 0 && ` · ⚡${stats.stealsUsed}/2`}
                          {stats?.jokersEarned > 0 && ` · ⭐${stats.jokersEarned}`}
                        </div>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: t.color }}>
                        {t.largestConnected}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Right column: Grid ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {s.grid && (
              <div style={card}>
                <div style={sectionLabel}>Grid {s.gridSize}×{s.gridSize}</div>
                <MiniGrid state={s} />
              </div>
            )}

            {/* Phase stats summary */}
            <div style={card}>
              <div style={sectionLabel}>Rangliste</div>
              {[...teamList].sort((a, b) => b.largestConnected - a.largestConnected).map((t, i) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#475569', width: 16 }}>#{i + 1}</span>
                  <span>{qqGetAvatar(t.avatarId).emoji}</span>
                  <span style={{ flex: 1, fontWeight: 800, color: t.color, fontSize: 13 }}>{t.name}</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{t.largestConnected}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PlacementControls({ state: s, roomCode, emit }: any) {
  const team = s.teams.find((t: any) => t.id === s.pendingFor);
  if (!team) return null;
  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'center',
      padding: '8px 12px', borderRadius: 10,
      background: `${team.color}18`, border: `1px solid ${team.color}44`,
    }}>
      <span style={{ fontSize: 18 }}>{qqGetAvatar(team.avatarId).emoji}</span>
      <span style={{ fontWeight: 800, color: team.color }}>{team.name}</span>
      <span style={{ fontSize: 12, color: '#94a3b8' }}>{actionLabel(s.pendingAction, s.teamPhaseStats[team.id])}</span>
      {s.gamePhaseIndex === 2 && s.pendingAction === 'PLACE_2' && (
        <Btn small color="#EF4444" onClick={() => emit('qq:chooseFreeAction', { roomCode, teamId: team.id, action: 'STEAL' })}>
          → Klauen
        </Btn>
      )}
      {s.gamePhaseIndex >= 2 && s.pendingAction === 'STEAL_1' && (
        <Btn small color="#3B82F6" onClick={() => emit('qq:chooseFreeAction', { roomCode, teamId: team.id, action: 'PLACE' })}>
          → Setzen
        </Btn>
      )}
    </div>
  );
}

function ComebackControls({ state: s, roomCode, emit }: any) {
  const team = s.teams.find((t: any) => t.id === s.comebackTeamId);
  if (!team || s.comebackAction) return null;
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 18 }}>{qqGetAvatar(team.avatarId).emoji}</span>
      <span style={{ fontWeight: 800, color: team.color }}>{team.name} — Comeback:</span>
      <Btn small color="#22C55E" onClick={() => emit('qq:comebackChoice', { roomCode, teamId: team.id, action: 'PLACE_2' })}>📍 2 Felder</Btn>
      <Btn small color="#EF4444" onClick={() => emit('qq:comebackChoice', { roomCode, teamId: team.id, action: 'STEAL_1' })}>⚡ Klauen</Btn>
      <Btn small color="#8B5CF6" onClick={() => emit('qq:comebackChoice', { roomCode, teamId: team.id, action: 'SWAP_2' })}>🔄 Tauschen</Btn>
    </div>
  );
}

function MiniGrid({ state: s }: { state: QQStateUpdate }) {
  const cellSize = Math.min(44, Math.floor(296 / s.gridSize));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${s.gridSize}, ${cellSize}px)`, gap: 3 }}>
      {s.grid.flatMap((row, r) =>
        row.map((cell, c) => {
          const team = s.teams.find(t => t.id === cell.ownerId);
          return (
            <div key={`${r}-${c}`} style={{
              width: cellSize, height: cellSize, borderRadius: 5,
              background: team ? `${team.color}99` : 'rgba(255,255,255,0.05)',
              border: cell.jokerFormed
                ? '1px solid rgba(251,191,36,0.7)'
                : `1px solid ${team ? `${team.color}44` : 'rgba(255,255,255,0.06)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: Math.max(9, cellSize * 0.36),
            }}>
              {cell.jokerFormed ? '⭐' : (team ? qqGetAvatar(team.avatarId).emoji : '')}
            </div>
          );
        })
      )}
    </div>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <div style={{
      padding: '4px 12px', borderRadius: 999,
      background: `${color}18`, border: `1px solid ${color}44`,
      color, fontSize: 12, fontWeight: 800,
    }}>
      {label}
    </div>
  );
}

function Btn({ children, color, onClick, outline = false, small = false }: {
  children: React.ReactNode; color: string; onClick: () => void;
  outline?: boolean; small?: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      padding: small ? '5px 12px' : '8px 18px',
      borderRadius: 8,
      border: `1px solid ${color}`,
      background: outline ? 'transparent' : `${color}22`,
      color,
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontWeight: 800,
      fontSize: small ? 12 : 13,
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {children}
    </button>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function actionLabel(action: string, stats: any): string {
  if (action === 'PLACE_1') return '1 Feld setzen';
  if (action === 'PLACE_2') return `2 Felder (${stats?.placementsLeft ?? 2} übrig)`;
  if (action === 'STEAL_1') return '1 Feld klauen';
  if (action === 'FREE')    return 'Setzen oder Klauen';
  return action;
}

function phasePill(phase: string): React.CSSProperties {
  const colors: Record<string, string> = {
    LOBBY: '#475569', PHASE_INTRO: '#3B82F6', QUESTION_ACTIVE: '#22C55E',
    QUESTION_REVEAL: '#F59E0B', PLACEMENT: '#EF4444', COMEBACK_CHOICE: '#8B5CF6',
    GAME_OVER: '#64748b',
  };
  const c = colors[phase] ?? '#475569';
  return {
    padding: '3px 10px', borderRadius: 999,
    background: `${c}22`, border: `1px solid ${c}44`,
    color: c, fontSize: 11, fontWeight: 800,
    textTransform: 'uppercase', letterSpacing: '0.06em',
  };
}

function badge(color: string): React.CSSProperties {
  return {
    padding: '4px 12px', borderRadius: 999,
    background: `${color}18`, border: `1px solid ${color}44`,
    color, fontSize: 11, fontWeight: 800,
    textTransform: 'uppercase', letterSpacing: '0.08em',
  };
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const page: React.CSSProperties = {
  minHeight: '100vh', background: '#0D0A06', color: '#e2e8f0',
  fontFamily: "'Nunito', system-ui, sans-serif",
  padding: 20,
};

const header: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  marginBottom: 18,
};

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 14, padding: 16,
};

const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, color: '#475569',
  textTransform: 'uppercase', letterSpacing: '0.07em',
  marginBottom: 10,
};

const selectStyle: React.CSSProperties = {
  padding: '7px 12px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.15)',
  background: '#1a1a2e', color: '#e2e8f0',
  fontFamily: 'inherit', fontSize: 13,
};
