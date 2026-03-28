import { useState } from 'react';
import { useQQSocket } from '../hooks/useQQSocket';
import { QQ_AVATARS, QQQuestion, QQLanguage, QQ_CATEGORIES, QQ_CATEGORY_LABELS, QQ_CATEGORY_COLORS } from '../../../shared/quarterQuizTypes';

const DEFAULT_ROOM = 'qq-test';

export default function QQModeratorPage() {
  const [roomCode, setRoomCode]   = useState(DEFAULT_ROOM);
  const [joined, setJoined]       = useState(false);
  const [language, setLanguage]   = useState<QQLanguage>('both');
  const { state, connected, emit } = useQQSocket(joined ? roomCode : '');

  async function joinRoom() {
    const ack = await emit('qq:joinModerator', { roomCode });
    if (ack.ok) setJoined(true);
  }

  async function startGame() {
    // Load default seed questions for testing
    const res = await fetch(`/api/qq/questions/default`);
    const questions: QQQuestion[] = await res.json();
    await emit('qq:startGame', { roomCode, questions, language });
  }

  const s = state;
  const teamList = s?.teams ?? [];

  return (
    <div style={{ minHeight: '100vh', background: '#0D0A06', color: '#e2e8f0', fontFamily: "'Nunito', system-ui, sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ padding: '4px 14px', borderRadius: 999, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#3B82F6', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Quartier Quiz
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>Moderator</h1>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: connected ? '#22C55E' : '#EF4444', fontWeight: 700 }}>
            {connected ? '● Verbunden' : '○ Getrennt'}
          </div>
        </div>

        {/* Room join */}
        {!joined && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 20, marginBottom: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>Raum beitreten</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                value={roomCode}
                onChange={e => setRoomCode(e.target.value)}
                placeholder="Raum-Code"
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 14 }}
              />
              <button onClick={joinRoom} style={btnStyle('#3B82F6')}>Beitreten</button>
            </div>
          </div>
        )}

        {joined && (
          <>
            {/* Phase + question indicator */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <Pill label={`Phase ${s?.gamePhaseIndex ?? '—'}/3`} color="#3B82F6" />
              <Pill label={`Frage ${(s?.questionIndex ?? 0) + 1}/15`} color="#6366f1" />
              <Pill label={s?.phase ?? 'LOBBY'} color="#475569" />
              {s?.pendingFor && (
                <Pill label={`⏳ ${teamList.find(t => t.id === s.pendingFor)?.name ?? s.pendingFor}`} color="#F59E0B" />
              )}
            </div>

            {/* Main control row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {s?.phase === 'LOBBY' && (
                <>
                  <select value={language} onChange={e => setLanguage(e.target.value as QQLanguage)}
                    style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: '#1a1a2e', color: '#e2e8f0', fontFamily: 'inherit' }}>
                    <option value="both">DE + EN</option>
                    <option value="de">Deutsch</option>
                    <option value="en">English</option>
                  </select>
                  <button onClick={startGame} style={btnStyle('#22C55E')}>▶ Spiel starten</button>
                </>
              )}
              {(s?.phase === 'PHASE_INTRO') && (
                <button onClick={() => emit('qq:activateQuestion', { roomCode })} style={btnStyle('#22C55E')}>▶ Frage aktivieren</button>
              )}
              {s?.phase === 'QUESTION_ACTIVE' && (
                <button onClick={() => emit('qq:revealAnswer', { roomCode })} style={btnStyle('#F59E0B')}>Antwort aufdecken</button>
              )}
              {s?.phase === 'QUESTION_REVEAL' && !s.correctTeamId && (
                <>
                  {teamList.map(t => (
                    <button key={t.id} onClick={() => emit('qq:markCorrect', { roomCode, teamId: t.id })}
                      style={{ ...btnStyle(t.color), minWidth: 80 }}>✓ {t.name}</button>
                  ))}
                  <button onClick={() => emit('qq:markWrong', { roomCode })} style={btnStyle('#475569')}>✗ Niemand</button>
                </>
              )}
              {s?.phase === 'PLACEMENT' && s.pendingAction && (
                <PlacementControls state={s} roomCode={roomCode} emit={emit} />
              )}
              {s?.phase === 'QUESTION_REVEAL' && s.correctTeamId && !s.pendingFor && (
                <button onClick={() => emit('qq:nextQuestion', { roomCode })} style={btnStyle('#22C55E')}>→ Nächste Frage</button>
              )}
              {s?.phase === 'COMEBACK_CHOICE' && (
                <ComebackControls state={s} roomCode={roomCode} emit={emit} />
              )}
              <button onClick={() => emit('qq:resetRoom', { roomCode })} style={btnStyle('#EF4444', true)}>↺ Reset</button>
            </div>

            {/* Current question */}
            {s?.currentQuestion && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${QQ_CATEGORY_COLORS[s.currentQuestion.category]}44`, borderRadius: 14, padding: 18, marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: `${QQ_CATEGORY_COLORS[s.currentQuestion.category]}22`, color: QQ_CATEGORY_COLORS[s.currentQuestion.category], border: `1px solid ${QQ_CATEGORY_COLORS[s.currentQuestion.category]}44` }}>
                    {QQ_CATEGORY_LABELS[s.currentQuestion.category].emoji} {QQ_CATEGORY_LABELS[s.currentQuestion.category].de}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Phase {s.currentQuestion.phaseIndex} · #{s.currentQuestion.questionIndexInPhase + 1}</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{s.currentQuestion.text}</div>
                {s.currentQuestion.textEn && <div style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>{s.currentQuestion.textEn}</div>}
                {s.revealedAnswer && (
                  <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', fontWeight: 800 }}>
                    ✓ {s.revealedAnswer}
                  </div>
                )}
              </div>
            )}

            {/* Teams + grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Teams</div>
                {teamList.map(t => {
                  const stats = s?.teamPhaseStats[t.id];
                  return (
                    <div key={t.id} style={{ padding: '10px 12px', borderRadius: 10, border: `2px solid ${s?.pendingFor === t.id ? t.color : 'rgba(255,255,255,0.07)'}`, background: 'rgba(255,255,255,0.03)', marginBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: t.color }} />
                        <span style={{ fontWeight: 800, color: t.color }}>{t.name}</span>
                        <span style={{ fontSize: 12, color: t.connected ? '#22C55E' : '#EF4444' }}>{t.connected ? '●' : '○'}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>{QQ_AVATARS.find(a => a.id === t.avatarId)?.emoji ?? '?'}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                        {t.largestConnected} verbunden · {t.totalCells} total
                        {stats && stats.stealsUsed > 0 && ` · ⚡${stats.stealsUsed}/2`}
                        {stats && stats.jokersEarned > 0 && ` · 🃏${stats.jokersEarned}`}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mini grid preview */}
              {s?.grid && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Grid ({s.gridSize}×{s.gridSize})</div>
                  <MiniGrid state={s} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PlacementControls({ state: s, roomCode, emit }: any) {
  const team = s.teams.find((t: any) => t.id === s.pendingFor);
  if (!team) return null;
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', borderRadius: 10, background: `${team.color}18`, border: `1px solid ${team.color}44` }}>
      <span style={{ fontWeight: 800, color: team.color }}>{team.name}</span>
      <span style={{ fontSize: 12, color: '#94a3b8' }}>{actionLabel(s.pendingAction, s.teamPhaseStats[team.id])}</span>
      {s.gamePhaseIndex === 2 && s.pendingAction === 'PLACE_2' && (
        <button onClick={() => emit('qq:chooseFreeAction', { roomCode, teamId: team.id, action: 'STEAL' })} style={btnStyle('#EF4444', false, true)}>→ Klauen</button>
      )}
      {s.gamePhaseIndex >= 2 && s.pendingAction === 'STEAL_1' && (
        <button onClick={() => emit('qq:chooseFreeAction', { roomCode, teamId: team.id, action: 'PLACE' })} style={btnStyle('#3B82F6', false, true)}>→ Setzen</button>
      )}
    </div>
  );
}

function ComebackControls({ state: s, roomCode, emit }: any) {
  const team = s.teams.find((t: any) => t.id === s.comebackTeamId);
  if (!team) return null;
  if (s.comebackAction) return null;
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontWeight: 800, color: team.color }}>{team.name} — Comeback:</span>
      <button onClick={() => emit('qq:comebackChoice', { roomCode, teamId: team.id, action: 'PLACE_2' })} style={btnStyle('#22C55E', false, true)}>2 Felder</button>
      <button onClick={() => emit('qq:comebackChoice', { roomCode, teamId: team.id, action: 'STEAL_1' })} style={btnStyle('#EF4444', false, true)}>1 Klauen</button>
      <button onClick={() => emit('qq:comebackChoice', { roomCode, teamId: team.id, action: 'SWAP_2' })} style={btnStyle('#8B5CF6', false, true)}>Tauschen</button>
    </div>
  );
}

function MiniGrid({ state: s }: any) {
  const cellSize = Math.min(48, Math.floor(220 / s.gridSize));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${s.gridSize}, ${cellSize}px)`, gap: 3 }}>
      {s.grid.flatMap((row: any[], r: number) =>
        row.map((cell: any, c: number) => {
          const team = s.teams.find((t: any) => t.id === cell.ownerId);
          return (
            <div key={`${r}-${c}`} style={{
              width: cellSize, height: cellSize, borderRadius: 5,
              background: team ? team.color : 'rgba(255,255,255,0.05)',
              border: cell.jokerFormed ? '1px solid rgba(251,191,36,0.6)' : '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: Math.max(10, cellSize * 0.35),
            }}>
              {team ? (QQ_AVATARS.find(a => a.id === team.avatarId)?.emoji ?? '') : ''}
            </div>
          );
        })
      )}
    </div>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ padding: '4px 12px', borderRadius: 999, background: `${color}18`, border: `1px solid ${color}44`, color, fontSize: 12, fontWeight: 800 }}>
      {label}
    </div>
  );
}

function actionLabel(action: string, stats: any): string {
  if (action === 'PLACE_1')  return '1 Feld setzen';
  if (action === 'PLACE_2')  return `2 Felder setzen (${stats?.placementsLeft ?? 2} übrig)`;
  if (action === 'STEAL_1')  return '1 Feld klauen';
  if (action === 'FREE')     return 'Setzen oder Klauen';
  if (action === 'COMEBACK') return 'Comeback-Aktion';
  return action;
}

function btnStyle(color: string, outline = false, small = false): React.CSSProperties {
  return {
    padding: small ? '6px 12px' : '8px 18px',
    borderRadius: 8,
    border: `1px solid ${color}`,
    background: outline ? 'transparent' : `${color}22`,
    color,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: 800,
    fontSize: small ? 12 : 13,
    transition: 'all 0.12s',
  };
}
