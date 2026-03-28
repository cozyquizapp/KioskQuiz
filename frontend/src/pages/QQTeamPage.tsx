import { useState, useEffect, useRef } from 'react';
import { useQQSocket } from '../hooks/useQQSocket';
import {
  QQ_AVATARS, QQStateUpdate, QQ_CATEGORY_COLORS, QQ_CATEGORY_LABELS,
  QQTeam, qqGetAvatar,
} from '../../../shared/quarterQuizTypes';

// ── CSS for animations ────────────────────────────────────────────────────────
const TEAM_CSS = `
  @keyframes tcfloat  { 0%,100%{transform:translateY(0) rotate(var(--r,0deg))} 50%{transform:translateY(-8px) rotate(var(--r,0deg))} }
  @keyframes tcpop    { from{opacity:0;transform:scale(0.7) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes tcpulse  { 0%,100%{box-shadow: 0 0 0 0 var(--c,rgba(255,255,255,0.2))} 50%{box-shadow: 0 0 0 6px transparent} }
  @keyframes tcspin   { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
  @keyframes tcreveal { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes tctimer  { from{width:100%} to{width:0%} }
  @keyframes tcwobble { 0%,100%{transform:rotate(-3deg)} 50%{transform:rotate(3deg)} }
`;

const QQ_ROOM = 'default';

type SetupStep = 'AVATAR' | 'NAME';

export default function QQTeamPage() {
  const roomCode = QQ_ROOM;
  const [step, setStep]         = useState<SetupStep>('AVATAR');
  const [avatarId, setAvatarId] = useState('fox');
  const [teamName, setTeamName] = useState('');
  const [teamId]                = useState(`team-${Math.random().toString(36).slice(2, 8)}`);
  const [joined, setJoined]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const { state, connected, emit } = useQQSocket(roomCode);

  async function joinRoom() {
    if (!teamName.trim()) return;
    setError(null);
    const ack = await emit('qq:joinTeam', { roomCode, teamId, teamName: teamName.trim(), avatarId });
    if (ack.ok) setJoined(true);
    else setError(ack.error ?? 'Fehler beim Beitreten');
  }

  if (!joined) {
    return <SetupFlow step={step} setStep={setStep}
      avatarId={avatarId} setAvatarId={setAvatarId} teamName={teamName} setTeamName={setTeamName}
      connected={connected} error={error} onJoin={joinRoom} />;
  }
  if (!state) {
    return <WaitingScreen roomCode={roomCode} connected={connected} />;
  }
  const myTeam = state.teams.find(t => t.id === teamId);
  return <TeamGameView state={state} myTeam={myTeam ?? null} myTeamId={teamId}
    emit={emit} roomCode={roomCode} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETUP FLOW
// ═══════════════════════════════════════════════════════════════════════════════

function SetupFlow({ step, setStep, avatarId, setAvatarId,
  teamName, setTeamName, connected, error, onJoin }: any) {
  return (
    <div style={darkPage}>
      <style>{TEAM_CSS}</style>
      {/* Grain */}
      <div style={grainOverlay} />

      <div style={{ width: '100%', maxWidth: 440, margin: '0 auto', padding: '32px 20px', position: 'relative', zIndex: 5 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 17, color: 'rgba(234,179,8,0.55)', marginBottom: 4 }}>
            Quartier Quiz
          </div>
          <div style={{ fontSize: 38, fontWeight: 900, color: '#F1F5F9', letterSpacing: '-0.02em' }}>
            Quarter Quiz
          </div>
        </div>

        {/* AVATAR step */}
        {step === 'AVATAR' && (
          <CozyCard anim>
            <StepLabel>Wähle deinen Avatar</StepLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
              {QQ_AVATARS.map((a, i) => {
                const sel = avatarId === a.id;
                return (
                  <button key={a.id} onClick={() => setAvatarId(a.id)} style={{
                    padding: '12px 4px', borderRadius: 14, cursor: 'pointer',
                    background: sel ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${sel ? '#3B82F6' : 'rgba(255,255,255,0.07)'}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    fontFamily: 'inherit', transition: 'all 0.15s',
                    boxShadow: sel ? '0 0 16px rgba(59,130,246,0.3)' : 'none',
                    ['--r' as string]: `${(i % 2 === 0 ? -1 : 1) * (5 + i * 2)}deg`,
                    animation: sel ? `tcfloat ${3.5 + i * 0.3}s ease-in-out infinite` : 'none',
                  }}>
                    <span style={{ fontSize: 34, lineHeight: 1 }}>{a.emoji}</span>
                    <span style={{ fontSize: 11, color: sel ? '#3B82F6' : '#475569', fontWeight: 800 }}>{a.label}</span>
                  </button>
                );
              })}
            </div>
            <CozyBtn color="#3B82F6" onClick={() => setStep('NAME')}>Weiter →</CozyBtn>
          </CozyCard>
        )}

        {/* NAME step */}
        {step === 'NAME' && (
          <CozyCard anim>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 64, lineHeight: 1, display: 'block',
                animation: 'tcfloat 3s ease-in-out infinite' }}>
                {qqGetAvatar(avatarId).emoji}
              </span>
            </div>
            <StepLabel>Team-Name</StepLabel>
            <input
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              placeholder="z.B. Die Wilden"
              style={cozyInput}
              autoFocus
              maxLength={20}
              onKeyDown={e => e.key === 'Enter' && teamName.trim() && onJoin()}
            />
            {error && (
              <div style={{ color: '#F87171', fontSize: 13, marginBottom: 8, fontWeight: 700 }}>{error}</div>
            )}
            <CozyBtn color="#22C55E" onClick={onJoin} disabled={!teamName.trim()}>
              ▶ Spiel beitreten
            </CozyBtn>
          </CozyCard>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function TeamGameView({ state: s, myTeam, myTeamId, emit, roomCode }: {
  state: QQStateUpdate; myTeam: QQTeam | null;
  myTeamId: string; emit: any; roomCode: string;
}) {
  const isMyTurn      = s.pendingFor === myTeamId;
  const isComebackTeam = s.comebackTeamId === myTeamId;
  const teamColor     = myTeam?.color ?? '#3B82F6';

  return (
    <div style={{ ...darkPage, background: `radial-gradient(ellipse at 50% 0%, ${teamColor}18 0%, transparent 60%), #0D0A06` }}>
      <style>{TEAM_CSS}</style>
      <div style={grainOverlay} />

      <div style={{ width: '100%', maxWidth: 440, margin: '0 auto', padding: '12px 16px 24px', position: 'relative', zIndex: 5 }}>

        {/* Team header */}
        {myTeam && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
            padding: '10px 14px', borderRadius: 16,
            background: '#1B1510', border: `1px solid ${teamColor}44`,
            boxShadow: `0 4px 16px rgba(0,0,0,0.4), 0 0 20px ${teamColor}18`,
          }}>
            <span style={{ fontSize: 34, lineHeight: 1 }}>{qqGetAvatar(myTeam.avatarId).emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 17, color: teamColor, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {myTeam.name}
              </div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>
                {myTeam.largestConnected} verbunden · {myTeam.totalCells} gesamt
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#94a3b8' }}>
                P{s.gamePhaseIndex}/{s.totalPhases}
              </div>
              <div style={{ fontSize: 11, color: '#475569' }}>
                F{(s.questionIndex % 5) + 1}/5
              </div>
            </div>
          </div>
        )}

        {/* Phase content */}
        {s.phase === 'LOBBY'           && <LobbyCard state={s} myTeam={myTeam} />}
        {s.phase === 'PHASE_INTRO'     && <PhaseIntroCard state={s} />}
        {(s.phase === 'QUESTION_ACTIVE' || s.phase === 'QUESTION_REVEAL') && (
          <QuestionCard state={s} myTeamId={myTeamId} emit={emit} roomCode={roomCode} />
        )}
        {s.phase === 'PLACEMENT' && (
          <PlacementCard state={s} myTeamId={myTeamId} isMyTurn={isMyTurn} emit={emit} roomCode={roomCode} />
        )}
        {s.phase === 'COMEBACK_CHOICE' && (
          <ComebackCard state={s} myTeamId={myTeamId} isMine={isComebackTeam} emit={emit} roomCode={roomCode} />
        )}
        {s.phase === 'GAME_OVER' && <GameOverCard state={s} myTeamId={myTeamId} />}

        {/* Phase stats */}
        {myTeam && s.teamPhaseStats[myTeamId] && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {s.teamPhaseStats[myTeamId].stealsUsed > 0 && (
              <StatChip label={`⚡ ${s.teamPhaseStats[myTeamId].stealsUsed} geklaut`} color="#EF4444" />
            )}
            {s.teamPhaseStats[myTeamId].jokersEarned > 0 && (
              <StatChip label={`⭐ ${s.teamPhaseStats[myTeamId].jokersEarned} Joker`} color="#FBBF24" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Phase cards
// ═══════════════════════════════════════════════════════════════════════════════

function LobbyCard({ state: s, myTeam }: { state: QQStateUpdate; myTeam: QQTeam | null }) {
  return (
    <CozyCard>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 44, marginBottom: 10, animation: 'tcwobble 2s ease-in-out infinite' }}>🎮</div>
        <div style={{ fontWeight: 900, fontSize: 20, color: '#F1F5F9', marginBottom: 6 }}>
          {myTeam ? 'Bereit!' : 'Warteraum'}
        </div>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 16, color: '#64748b', marginBottom: 16 }}>
          {s.teams.length} Team{s.teams.length !== 1 ? 's' : ''} · Warte auf Moderator
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {s.teams.map(t => (
            <div key={t.id} style={{
              padding: '6px 14px', borderRadius: 999,
              background: `${t.color}22`, border: `2px solid ${t.color}55`,
              fontSize: 14, fontWeight: 800, color: t.color,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {qqGetAvatar(t.avatarId).emoji} {t.name}
            </div>
          ))}
        </div>
      </div>
    </CozyCard>
  );
}

function PhaseIntroCard({ state: s }: { state: QQStateUpdate }) {
  const colors = ['#3B82F6', '#F59E0B', '#EF4444', '#A855F7'];
  const color  = colors[(s.gamePhaseIndex - 1) % 4];
  const names  = ['', 'Runde 1', 'Runde 2', 'Runde 3', 'Finale'];
  const descs  = ['', '1 Feld pro Sieg', '2 Felder oder klauen', 'Comeback-Phase', 'Alles auf Spiel'];
  return (
    <CozyCard>
      <div style={{ textAlign: 'center', padding: '8px 0', animation: 'tcreveal 0.5s ease both' }}>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 14, color: '#475569', marginBottom: 6 }}>
          Nächste Phase
        </div>
        <div style={{ fontSize: 52, fontWeight: 900, color, textShadow: `0 0 30px ${color}44`,
          animation: 'tcfloat 3s ease-in-out infinite' }}>
          {names[s.gamePhaseIndex] ?? `Runde ${s.gamePhaseIndex}`}
        </div>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 17, color: `${color}88`, marginTop: 8 }}>
          {descs[s.gamePhaseIndex] ?? ''}
        </div>
      </div>
    </CozyCard>
  );
}

function QuestionCard({ state: s, myTeamId, emit, roomCode }: {
  state: QQStateUpdate; myTeamId: string; emit: any; roomCode: string;
}) {
  const q = s.currentQuestion;
  if (!q) return null;
  const catColor = QQ_CATEGORY_COLORS[q.category];
  const catLabel = QQ_CATEGORY_LABELS[q.category];
  const isRevealed = s.phase === 'QUESTION_REVEAL';
  const iWon = s.correctTeamId === myTeamId;

  return (
    <CozyCard key={q.id}>
      {/* Category pill */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 14,
        padding: '6px 16px', borderRadius: 999,
        background: `${catColor}22`, border: `2px solid ${catColor}55`,
        color: catColor, fontSize: 13, fontWeight: 900, letterSpacing: '0.06em',
        boxShadow: `0 0 16px ${catColor}22`,
      }}>
        <span style={{ fontSize: 16 }}>{catLabel.emoji}</span>
        {s.language === 'en' ? catLabel.en : catLabel.de}
        {s.language === 'both' && catLabel.en !== catLabel.de && (
          <span style={{ opacity: 0.5, fontSize: 11 }}>· {catLabel.en}</span>
        )}
      </div>

      {/* Timer bar */}
      {s.timerEndsAt && !isRevealed && (
        <TeamTimerBar endsAt={s.timerEndsAt} durationSec={s.timerDurationSec} accentColor={catColor} />
      )}

      {/* Question text */}
      <div style={{
        fontSize: 'clamp(17px, 4.5vw, 22px)', fontWeight: 900, lineHeight: 1.3,
        color: '#F1F5F9', marginBottom: 12,
      }}>
        {q.text}
      </div>
      {q.textEn && s.language !== 'de' && (
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 15, color: '#475569', marginBottom: 12 }}>
          {q.textEn}
        </div>
      )}

      {/* Answer input (active only) */}
      {!isRevealed && s.hotPotatoActiveTeamId === myTeamId && (
        <div style={{
          padding: '12px 16px', borderRadius: 14, textAlign: 'center',
          background: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.4)',
          fontSize: 18, fontWeight: 900, color: '#f87171',
          animation: 'tcpulse 1.5s ease-in-out infinite',
          marginBottom: 8,
        }}>
          🥔 Du bist dran!
        </div>
      )}
      {!isRevealed && s.hotPotatoActiveTeamId && s.hotPotatoActiveTeamId !== myTeamId && (
        <div style={{
          padding: '8px 14px', borderRadius: 12, textAlign: 'center',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          fontSize: 14, color: '#64748b', marginBottom: 8,
        }}>
          🥔 {s.teams.find(t => t.id === s.hotPotatoActiveTeamId)?.name ?? '?'} ist dran
        </div>
      )}
      {!isRevealed && s.hotPotatoEliminated.includes(myTeamId) && (
        <div style={{
          padding: '8px 14px', borderRadius: 12, textAlign: 'center',
          background: 'rgba(239,68,68,0.1)', fontSize: 14, color: '#f87171', marginBottom: 8,
        }}>
          ❌ Du bist raus
        </div>
      )}
      {!isRevealed && (
        <AnswerInput state={s} myTeamId={myTeamId} emit={emit} roomCode={roomCode} catColor={catColor} />
      )}

      {/* Revealed answer */}
      {isRevealed && s.revealedAnswer && (
        <div style={{
          marginTop: 8, padding: '12px 16px', borderRadius: 14,
          background: 'rgba(34,197,94,0.08)', border: '2px solid rgba(34,197,94,0.3)',
          fontSize: 20, fontWeight: 900, color: '#4ade80',
          animation: 'tcreveal 0.4s ease both',
        }}>
          ✓ {s.revealedAnswer}
        </div>
      )}

      {iWon && isRevealed && (
        <div style={{
          marginTop: 8, padding: '10px 14px', borderRadius: 12,
          background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
          fontSize: 15, fontWeight: 800, color: '#60a5fa', textAlign: 'center',
          animation: 'tcreveal 0.4s ease 0.2s both',
        }}>
          🎉 Richtig! Du darfst ein Feld wählen
        </div>
      )}
    </CozyCard>
  );
}

function AnswerInput({ state: s, myTeamId, emit, roomCode, catColor }: {
  state: QQStateUpdate; myTeamId: string; emit: any; roomCode: string; catColor: string;
}) {
  const [answer, setAnswer] = useState('');
  const myAnswer = s.answers.find(a => a.teamId === myTeamId);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAnswer('');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [s.currentQuestion?.id]);

  async function submit() {
    if (!answer.trim()) return;
    await emit('qq:submitAnswer', { roomCode, teamId: myTeamId, answer: answer.trim() });
  }

  if (myAnswer) {
    return (
      <div style={{
        padding: '12px 16px', borderRadius: 14, textAlign: 'center',
        background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.3)',
        fontSize: 15, fontWeight: 800, color: '#4ade80',
        animation: 'tcreveal 0.3s ease both',
      }}>
        ✓ Abgegeben: „{myAnswer.text}"
      </div>
    );
  }

  return (
    <div style={{ marginTop: 4 }}>
      <input
        ref={inputRef}
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Antwort eingeben…"
        style={{
          width: '100%', padding: '14px 16px', borderRadius: 14, boxSizing: 'border-box',
          border: `2px solid ${answer ? catColor + '66' : 'rgba(255,255,255,0.1)'}`,
          background: `${answer ? catColor + '10' : 'rgba(255,255,255,0.05)'}`,
          color: '#F1F5F9', fontFamily: 'inherit', fontSize: 19, fontWeight: 700,
          marginBottom: 10, outline: 'none', transition: 'all 0.2s',
        }}
        autoComplete="off"
      />
      <button onClick={submit} disabled={!answer.trim()} style={{
        width: '100%', padding: '14px', borderRadius: 14,
        border: `2px solid ${answer.trim() ? catColor : 'rgba(255,255,255,0.08)'}`,
        background: answer.trim() ? `${catColor}25` : 'rgba(255,255,255,0.03)',
        color: answer.trim() ? catColor : '#334155',
        cursor: answer.trim() ? 'pointer' : 'default',
        fontFamily: 'inherit', fontWeight: 900, fontSize: 17,
        boxShadow: answer.trim() ? `0 0 20px ${catColor}33` : 'none',
        transition: 'all 0.2s',
      }}>
        ✓ Abschicken
      </button>
    </div>
  );
}

function TeamTimerBar({ endsAt, durationSec, accentColor }: { endsAt: number; durationSec: number; accentColor: string }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, (endsAt - Date.now()) / 1000));

  useEffect(() => {
    const iv = setInterval(() => {
      const r = Math.max(0, (endsAt - Date.now()) / 1000);
      setRemaining(r);
      if (r === 0) clearInterval(iv);
    }, 100);
    return () => clearInterval(iv);
  }, [endsAt]);

  const pct = Math.min(100, (remaining / durationSec) * 100);
  const urgent = remaining <= 5;
  const color = urgent ? '#EF4444' : accentColor;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>Timer</span>
        <span style={{ fontSize: 15, fontWeight: 900, color,
          textShadow: urgent ? '0 0 10px rgba(239,68,68,0.6)' : 'none' }}>
          {Math.ceil(remaining)}s
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 4, background: color,
          width: `${pct}%`, transition: 'width 0.1s linear',
          boxShadow: `0 0 8px ${color}88`,
        }} />
      </div>
    </div>
  );
}

function PlacementCard({ state: s, myTeamId, isMyTurn, emit, roomCode }: {
  state: QQStateUpdate; myTeamId: string; isMyTurn: boolean; emit: any; roomCode: string;
}) {
  const [selecting, setSelecting] = useState(false);
  const pendingTeam = s.teams.find(t => t.id === s.pendingFor);
  const isSteal = s.pendingAction === 'STEAL_1';
  const cellSize = Math.min(52, Math.floor(300 / s.gridSize));

  useEffect(() => { if (!isMyTurn) setSelecting(false); }, [isMyTurn]);

  async function handleCell(r: number, c: number) {
    if (!isMyTurn || !selecting) return;
    const cell = s.grid[r][c];
    if (isSteal) {
      if (!cell.ownerId || cell.ownerId === myTeamId) return;
      await emit('qq:stealCell', { roomCode, teamId: myTeamId, row: r, col: c });
    } else {
      if (cell.ownerId) return;
      await emit('qq:placeCell', { roomCode, teamId: myTeamId, row: r, col: c });
    }
    setSelecting(false);
  }

  if (!isMyTurn) {
    return (
      <CozyCard>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          {pendingTeam && (
            <>
              <div style={{ fontSize: 40, marginBottom: 8, animation: 'tcfloat 2s ease-in-out infinite' }}>
                {qqGetAvatar(pendingTeam.avatarId).emoji}
              </div>
              <div style={{ fontWeight: 800, color: pendingTeam.color, fontSize: 17 }}>{pendingTeam.name}</div>
              <div style={{ fontFamily: "'Caveat', cursive", fontSize: 15, color: '#64748b', marginTop: 4 }}>
                wählt ein Feld…
              </div>
            </>
          )}
        </div>
      </CozyCard>
    );
  }

  const actionColor = isSteal ? '#EF4444' : '#22C55E';

  return (
    <CozyCard borderColor={actionColor}>
      <div style={{ fontWeight: 900, fontSize: 18, color: actionColor, marginBottom: 12, textAlign: 'center' }}>
        {isSteal ? '⚡ Klau ein fremdes Feld!' : '📍 Wähle ein Feld!'}
      </div>

      {!selecting ? (
        <CozyBtn color={actionColor} onClick={() => setSelecting(true)}>
          {isSteal ? '⚡ Klauen' : '📍 Feld wählen'}
        </CozyBtn>
      ) : (
        <>
          <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 12 }}>
            {isSteal ? 'Tippe auf ein fremdes Feld' : 'Tippe auf ein freies Feld'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${s.gridSize}, ${cellSize}px)`, gap: 4, justifyContent: 'center' }}>
            {s.grid.flatMap((row, r) =>
              row.map((cell, c) => {
                const team = s.teams.find(t => t.id === cell.ownerId);
                const clickable = isSteal ? (!!cell.ownerId && cell.ownerId !== myTeamId) : !cell.ownerId;
                return (
                  <div key={`${r}-${c}`} onClick={() => handleCell(r, c)} style={{
                    width: cellSize, height: cellSize, borderRadius: 6,
                    background: team ? `${team.color}88` : 'rgba(255,255,255,0.05)',
                    border: clickable ? `2px solid ${actionColor}` : '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: Math.max(10, cellSize * 0.38),
                    cursor: clickable ? 'pointer' : 'default',
                    opacity: clickable ? 1 : 0.35,
                    transition: 'all 0.15s',
                    boxShadow: clickable ? `0 0 8px ${actionColor}44` : 'none',
                  }}>
                    {team ? qqGetAvatar(team.avatarId).emoji : ''}
                  </div>
                );
              })
            )}
          </div>
          <button onClick={() => setSelecting(false)} style={{
            marginTop: 12, width: '100%', padding: '8px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
            color: '#475569', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
          }}>Abbrechen</button>
        </>
      )}
    </CozyCard>
  );
}

function ComebackCard({ state: s, myTeamId, isMine, emit, roomCode }: {
  state: QQStateUpdate; myTeamId: string; isMine: boolean; emit: any; roomCode: string;
}) {
  const comebackTeam = s.teams.find(t => t.id === s.comebackTeamId);

  if (!isMine) {
    return (
      <CozyCard>
        <div style={{ textAlign: 'center', padding: '4px 0' }}>
          {comebackTeam && (
            <>
              <div style={{ fontSize: 40, animation: 'tcfloat 2s ease-in-out infinite' }}>
                {qqGetAvatar(comebackTeam.avatarId).emoji}
              </div>
              <div style={{ fontWeight: 800, color: comebackTeam.color, marginTop: 6 }}>{comebackTeam.name}</div>
            </>
          )}
          <div style={{ fontSize: 14, color: '#F59E0B', fontWeight: 700, marginTop: 8 }}>⚡ Comeback-Aktion läuft…</div>
        </div>
      </CozyCard>
    );
  }

  if (s.comebackAction) {
    return (
      <CozyCard borderColor="#F59E0B">
        <div style={{ fontWeight: 800, color: '#e2e8f0', textAlign: 'center', fontSize: 17 }}>
          {s.comebackAction === 'PLACE_2' && '📍 Wähle 2 freie Felder'}
          {s.comebackAction === 'STEAL_1' && '⚡ Klau ein fremdes Feld'}
          {s.comebackAction === 'SWAP_2'  && '🔄 Felder werden getauscht'}
        </div>
      </CozyCard>
    );
  }

  return (
    <CozyCard borderColor="#F59E0B">
      <div style={{ fontWeight: 900, fontSize: 18, color: '#F59E0B', marginBottom: 16, textAlign: 'center' }}>
        ⚡ Deine Comeback-Chance!
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { action: 'PLACE_2', icon: '📍', label: '2 Felder setzen', desc: 'Platziere 2 freie Felder', color: '#22C55E' },
          { action: 'STEAL_1', icon: '⚡', label: '1 Feld klauen',   desc: 'Nimm ein fremdes Feld',   color: '#EF4444' },
          { action: 'SWAP_2',  icon: '🔄', label: '2 Felder tauschen', desc: 'Tausche je 1 Feld zweier Gegner', color: '#8B5CF6' },
        ].map(opt => (
          <button key={opt.action} onClick={() => emit('qq:comebackChoice', { roomCode, teamId: myTeamId, action: opt.action })}
            style={{
              padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
              background: '#1B1510', border: `2px solid ${opt.color}44`,
              textAlign: 'left', fontFamily: 'inherit',
              display: 'flex', gap: 12, alignItems: 'center',
              transition: 'all 0.15s',
            }}>
            <span style={{ fontSize: 28, lineHeight: 1 }}>{opt.icon}</span>
            <div>
              <div style={{ fontWeight: 800, color: opt.color, fontSize: 15 }}>{opt.label}</div>
              <div style={{ fontFamily: "'Caveat', cursive", fontSize: 13, color: '#475569', marginTop: 2 }}>{opt.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </CozyCard>
  );
}

function GameOverCard({ state: s, myTeamId }: { state: QQStateUpdate; myTeamId: string }) {
  const sorted  = [...s.teams].sort((a, b) => b.largestConnected - a.largestConnected);
  const myRank  = sorted.findIndex(t => t.id === myTeamId) + 1;
  const myTeam  = sorted.find(t => t.id === myTeamId);
  const winner  = sorted[0];

  return (
    <CozyCard>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        {myRank === 1 ? (
          <>
            <div style={{ fontSize: 56, marginBottom: 6, animation: 'tcfloat 2s ease-in-out infinite' }}>🏆</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: myTeam?.color }}>Gewonnen!</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 48, marginBottom: 6 }}>{qqGetAvatar(winner.avatarId).emoji}</div>
            <div style={{ fontWeight: 800, color: winner.color, fontSize: 20 }}>{winner.name} gewinnt!</div>
            <div style={{ fontFamily: "'Caveat', cursive", fontSize: 16, color: '#64748b', marginTop: 4 }}>
              Platz {myRank} für dich
            </div>
          </>
        )}
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.map((t, i) => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12,
              background: t.id === myTeamId ? `${t.color}18` : 'rgba(255,255,255,0.03)',
              border: t.id === myTeamId ? `2px solid ${t.color}44` : '1px solid rgba(255,255,255,0.06)',
              animation: `tcreveal 0.5s ease ${i * 0.1}s both`,
            }}>
              <span style={{ fontSize: 14, width: 22, color: i === 0 ? '#EAB308' : '#475569', fontWeight: 800 }}>#{i + 1}</span>
              <span style={{ fontSize: 24, lineHeight: 1 }}>{qqGetAvatar(t.avatarId).emoji}</span>
              <span style={{ fontWeight: 900, color: t.color, flex: 1 }}>{t.name}</span>
              <span style={{ fontSize: 12, color: '#475569' }}>{t.largestConnected} verbunden</span>
            </div>
          ))}
        </div>
      </div>
    </CozyCard>
  );
}

// ─── Waiting screen ────────────────────────────────────────────────────────────
function WaitingScreen({ roomCode, connected }: { roomCode: string; connected: boolean }) {
  return (
    <div style={{ ...darkPage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{TEAM_CSS}</style>
      <div style={{ textAlign: 'center', color: '#e2e8f0', position: 'relative', zIndex: 5 }}>
        <div style={{ fontSize: 42, marginBottom: 12, animation: 'tcspin 3s linear infinite', display: 'inline-block' }}>⏳</div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Quarter Quiz</div>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 15, color: '#475569', margin: '8px 0' }}>Raum: {roomCode}</div>
        <div style={{ fontSize: 12, color: connected ? '#22C55E' : '#EF4444', fontWeight: 700 }}>
          {connected ? '● Verbunden, lade Spielzustand…' : '○ Verbinde…'}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Shared UI primitives
// ═══════════════════════════════════════════════════════════════════════════════

function CozyCard({ children, anim, borderColor }: { children: React.ReactNode; anim?: boolean; borderColor?: string }) {
  return (
    <div style={{
      background: '#1B1510',
      border: `1px solid ${borderColor ? borderColor + '55' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 20, padding: '18px 18px', marginBottom: 12,
      boxShadow: `0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)${borderColor ? `, 0 0 20px ${borderColor}18` : ''}`,
      animation: anim ? 'tcreveal 0.4s ease both' : undefined,
    }}>
      {children}
    </div>
  );
}

function CozyBtn({ children, color, onClick, disabled }: { children: React.ReactNode; color: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '14px', borderRadius: 14, fontFamily: 'inherit', fontWeight: 900, fontSize: 16,
      border: `2px solid ${disabled ? 'rgba(255,255,255,0.08)' : color}`,
      background: disabled ? 'rgba(255,255,255,0.04)' : `${color}22`,
      color: disabled ? '#334155' : color,
      cursor: disabled ? 'default' : 'pointer',
      boxShadow: disabled ? 'none' : `0 0 20px ${color}22`,
      transition: 'all 0.15s',
    }}>
      {children}
    </button>
  );
}

function StepLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
      {children}
    </div>
  );
}

function StatChip({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ padding: '3px 10px', borderRadius: 999, background: `${color}18`, border: `1px solid ${color}33`, fontSize: 11, fontWeight: 800, color }}>
      {label}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const darkPage: React.CSSProperties = {
  minHeight: '100vh', background: '#0D0A06', color: '#e2e8f0',
  fontFamily: "'Nunito', system-ui, sans-serif",
};
const grainOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
  opacity: 0.04, mixBlendMode: 'overlay',
};
const cozyInput: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: 12, marginBottom: 12,
  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)',
  color: '#F1F5F9', fontFamily: 'inherit', fontSize: 16, fontWeight: 700,
  boxSizing: 'border-box', outline: 'none',
};
