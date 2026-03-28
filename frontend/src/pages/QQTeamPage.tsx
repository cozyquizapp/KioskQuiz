import { useState, useEffect } from 'react';
import { useQQSocket } from '../hooks/useQQSocket';
import {
  QQ_AVATARS, QQStateUpdate, QQ_CATEGORY_COLORS, QQ_CATEGORY_LABELS,
  QQTeam, qqGetAvatar,
} from '../../../shared/quarterQuizTypes';

function getRoomCode(): string {
  if (typeof window === 'undefined') return 'qq-test';
  const params = new URLSearchParams(window.location.search);
  return params.get('room') || localStorage.getItem('qq-moderatorRoom') || 'qq-test';
}

type SetupStep = 'ROOM' | 'AVATAR' | 'NAME';

export default function QQTeamPage() {
  const [roomCode, setRoomCode]   = useState(getRoomCode);
  // Skip ROOM step if room code came from URL
  const hasRoomFromUrl = typeof window !== 'undefined' && !!new URLSearchParams(window.location.search).get('room');
  const [step, setStep]           = useState<SetupStep>(hasRoomFromUrl ? 'AVATAR' : 'ROOM');
  const [avatarId, setAvatarId]   = useState('fox');
  const [teamName, setTeamName]   = useState('');
  const [teamId, setTeamId]       = useState<string | null>(null);
  const [joined, setJoined]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const { state, connected, emit } = useQQSocket(joined ? roomCode : '');

  // Generate teamId once
  useEffect(() => {
    setTeamId(`team-${Math.random().toString(36).slice(2, 8)}`);
  }, []);

  async function joinRoom() {
    if (!teamId || !teamName.trim()) return;
    setError(null);
    const ack = await emit('qq:joinTeam', { roomCode, teamId, teamName: teamName.trim(), avatarId });
    if (ack.ok) {
      setJoined(true);
    } else {
      setError(ack.error ?? 'Fehler beim Beitreten');
    }
  }

  // Setup screens
  if (!joined) {
    return (
      <SetupFlow
        step={step} setStep={setStep}
        roomCode={roomCode} setRoomCode={setRoomCode}
        avatarId={avatarId} setAvatarId={setAvatarId}
        teamName={teamName} setTeamName={setTeamName}
        connected={connected} error={error}
        onJoin={joinRoom}
      />
    );
  }

  if (!state) {
    return <WaitingScreen roomCode={roomCode} connected={connected} />;
  }

  const myTeam = state.teams.find(t => t.id === teamId);

  return (
    <TeamGameView
      state={state}
      myTeam={myTeam ?? null}
      myTeamId={teamId!}
      emit={emit}
      roomCode={roomCode}
    />
  );
}

// ── Setup Flow ────────────────────────────────────────────────────────────────

function SetupFlow({
  step, setStep, roomCode, setRoomCode,
  avatarId, setAvatarId, teamName, setTeamName,
  connected, error, onJoin,
}: any) {
  return (
    <div style={pageStyle}>
      <div style={{ width: '100%', maxWidth: 420, margin: '0 auto', padding: '40px 20px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 13, color: '#475569', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Quartier Quiz</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#e2e8f0' }}>Quarter Quiz</div>
        </div>

        {step === 'ROOM' && (
          <Card>
            <Label>Raum-Code</Label>
            <input
              value={roomCode}
              onChange={e => setRoomCode(e.target.value)}
              placeholder="z.B. qq-test"
              style={inputStyle}
              autoFocus
            />
            <BigButton color="#3B82F6" onClick={() => setStep('AVATAR')}>
              Weiter →
            </BigButton>
            <ConnStatus connected={connected} />
          </Card>
        )}

        {step === 'AVATAR' && (
          <Card>
            <Label>Wähle deinen Avatar</Label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
              {QQ_AVATARS.map(a => (
                <button key={a.id} onClick={() => setAvatarId(a.id)} style={{
                  padding: '12px 4px', borderRadius: 12, cursor: 'pointer',
                  background: avatarId === a.id ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                  border: avatarId === a.id ? '2px solid #3B82F6' : '2px solid rgba(255,255,255,0.08)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 32 }}>{a.emoji}</span>
                  <span style={{ fontSize: 11, color: avatarId === a.id ? '#3B82F6' : '#64748b', fontWeight: 700 }}>{a.label}</span>
                </button>
              ))}
            </div>
            <BigButton color="#3B82F6" onClick={() => setStep('NAME')}>
              Weiter →
            </BigButton>
          </Card>
        )}

        {step === 'NAME' && (
          <Card>
            <div style={{ textAlign: 'center', fontSize: 52, marginBottom: 12 }}>
              {qqGetAvatar(avatarId).emoji}
            </div>
            <Label>Team-Name</Label>
            <input
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              placeholder="z.B. Die Wilden"
              style={inputStyle}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && teamName.trim() && onJoin()}
              maxLength={20}
            />
            {error && <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 8 }}>{error}</div>}
            <BigButton color="#22C55E" onClick={onJoin} disabled={!teamName.trim()}>
              ▶ Spiel beitreten
            </BigButton>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── In-game Team View ─────────────────────────────────────────────────────────

function TeamGameView({ state: s, myTeam, myTeamId, emit, roomCode }: {
  state: QQStateUpdate;
  myTeam: QQTeam | null;
  myTeamId: string;
  emit: (event: string, payload?: unknown) => Promise<any>;
  roomCode: string;
}) {
  const isMyTurn = s.pendingFor === myTeamId;
  const isComebackTeam = s.comebackTeamId === myTeamId;

  return (
    <div style={pageStyle}>
      <div style={{ width: '100%', maxWidth: 420, margin: '0 auto', padding: 16 }}>

        {/* Header */}
        {myTeam && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
            padding: '10px 14px', borderRadius: 12,
            background: `${myTeam.color}18`, border: `1px solid ${myTeam.color}33`,
          }}>
            <span style={{ fontSize: 28 }}>{qqGetAvatar(myTeam.avatarId).emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, color: myTeam.color }}>{myTeam.name}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {myTeam.largestConnected} verbunden · {myTeam.totalCells} total
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#475569' }}>Phase {s.gamePhaseIndex}/3</div>
              <div style={{ fontSize: 11, color: '#475569' }}>F {(s.questionIndex % 5) + 1}/5</div>
            </div>
          </div>
        )}

        {/* Phase / state content */}
        {s.phase === 'LOBBY' && <LobbyCard state={s} myTeam={myTeam} />}

        {s.phase === 'PHASE_INTRO' && <PhaseIntroCard state={s} />}

        {(s.phase === 'QUESTION_ACTIVE' || s.phase === 'QUESTION_REVEAL') && (
          <QuestionCard state={s} myTeamId={myTeamId} emit={emit} roomCode={roomCode} />
        )}

        {s.phase === 'PLACEMENT' && (
          <PlacementCard
            state={s} myTeamId={myTeamId} isMyTurn={isMyTurn}
            emit={emit} roomCode={roomCode}
          />
        )}

        {s.phase === 'COMEBACK_CHOICE' && (
          <ComebackCard
            state={s} myTeamId={myTeamId} isMine={isComebackTeam}
            emit={emit} roomCode={roomCode}
          />
        )}

        {s.phase === 'GAME_OVER' && <GameOverCard state={s} myTeamId={myTeamId} />}

        {/* Phase stats */}
        {myTeam && s.teamPhaseStats[myTeamId] && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {s.teamPhaseStats[myTeamId].stealsUsed > 0 && (
              <StatPill label={`⚡ ${s.teamPhaseStats[myTeamId].stealsUsed}/2 geklaut`} />
            )}
            {s.teamPhaseStats[myTeamId].jokersEarned > 0 && (
              <StatPill label={`⭐ ${s.teamPhaseStats[myTeamId].jokersEarned} Joker`} color="#FBBF24" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Phase sub-cards ───────────────────────────────────────────────────────────

function LobbyCard({ state: s, myTeam }: { state: QQStateUpdate; myTeam: QQTeam | null }) {
  return (
    <Card>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 42, marginBottom: 8 }}>🎮</div>
        <div style={{ fontWeight: 800, fontSize: 18, color: '#e2e8f0', marginBottom: 6 }}>
          {myTeam ? 'Erfolgreich beigetreten!' : 'Warteraum'}
        </div>
        <div style={{ fontSize: 14, color: '#64748b' }}>
          {s.teams.length} Team{s.teams.length !== 1 ? 's' : ''} · Warte auf Moderator
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {s.teams.map(t => (
            <div key={t.id} style={{
              padding: '6px 12px', borderRadius: 999,
              background: `${t.color}22`, border: `1px solid ${t.color}55`,
              fontSize: 13, fontWeight: 800, color: t.color,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>{qqGetAvatar(t.avatarId).emoji}</span>
              <span>{t.name}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function PhaseIntroCard({ state: s }: { state: QQStateUpdate }) {
  const phaseColors = ['#3B82F6', '#F59E0B', '#EF4444'];
  const color = phaseColors[(s.gamePhaseIndex - 1) % 3];
  const phaseNames = ['', 'Runde 1', 'Runde 2', 'Runde 3'];
  return (
    <Card>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 13, color: '#64748b', fontWeight: 700, marginBottom: 8 }}>Nächste Phase</div>
        <div style={{ fontSize: 48, fontWeight: 900, color }}>{phaseNames[s.gamePhaseIndex]}</div>
        <div style={{ fontSize: 14, color: '#64748b', marginTop: 8 }}>
          {s.gamePhaseIndex === 1 && '1 Feld pro Sieg'}
          {s.gamePhaseIndex === 2 && '2 Felder setzen oder 1 klauen'}
          {s.gamePhaseIndex === 3 && 'Alles auf Spiel — freie Wahl'}
        </div>
      </div>
    </Card>
  );
}

function QuestionCard({ state: s, myTeamId, emit, roomCode }: {
  state: QQStateUpdate; myTeamId: string;
  emit: any; roomCode: string;
}) {
  const q = s.currentQuestion;
  if (!q) return null;
  const catColor = QQ_CATEGORY_COLORS[q.category];
  const catLabel = QQ_CATEGORY_LABELS[q.category];
  const isRevealed = s.phase === 'QUESTION_REVEAL';
  const iWonThis = s.correctTeamId === myTeamId;

  return (
    <Card>
      {/* Category */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12,
        padding: '5px 14px', borderRadius: 999,
        background: `${catColor}22`, border: `1px solid ${catColor}44`,
        color: catColor, fontSize: 13, fontWeight: 800,
      }}>
        {catLabel.emoji} {s.language === 'en' ? catLabel.en : catLabel.de}
      </div>

      {/* Timer */}
      {s.timerEndsAt && !isRevealed && (
        <TeamTimerBar endsAt={s.timerEndsAt} durationSec={s.timerDurationSec} />
      )}

      {/* Question text */}
      <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.3, color: '#e2e8f0', marginBottom: 10 }}>
        {q.text}
      </div>
      {q.textEn && s.language !== 'de' && (
        <div style={{ fontSize: 14, color: '#64748b', fontStyle: 'italic', marginBottom: 10 }}>{q.textEn}</div>
      )}

      {/* Answer input */}
      {!isRevealed && (
        <AnswerInput
          state={s} myTeamId={myTeamId}
          emit={emit} roomCode={roomCode}
        />
      )}

      {isRevealed && s.revealedAnswer && (
        <>
          <div style={{
            marginTop: 10, padding: '10px 14px', borderRadius: 10,
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
            fontSize: 18, fontWeight: 800, color: '#4ade80',
          }}>
            ✓ {s.revealedAnswer}
          </div>
          {iWonThis && (
            <div style={{
              marginTop: 8, padding: '8px 14px', borderRadius: 10,
              background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
              fontSize: 15, fontWeight: 800, color: '#60a5fa', textAlign: 'center',
            }}>
              🎉 Richtig! Du darfst ein Feld wählen
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function AnswerInput({ state: s, myTeamId, emit, roomCode }: {
  state: QQStateUpdate; myTeamId: string; emit: any; roomCode: string;
}) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const myAnswer = s.answers.find(a => a.teamId === myTeamId);

  // Reset when new question starts
  useEffect(() => {
    setAnswer('');
    setSubmitted(false);
  }, [s.currentQuestion?.id]);

  async function submit() {
    if (!answer.trim()) return;
    await emit('qq:submitAnswer', { roomCode, teamId: myTeamId, answer: answer.trim() });
    setSubmitted(true);
  }

  if (myAnswer) {
    return (
      <div style={{
        marginTop: 10, padding: '12px 14px', borderRadius: 12, textAlign: 'center',
        background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
        fontSize: 15, fontWeight: 800, color: '#4ade80',
      }}>
        ✓ Abgegeben: „{myAnswer.text}"
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10 }}>
      <input
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Antwort eingeben…"
        style={{
          width: '100%', padding: '14px', borderRadius: 12, boxSizing: 'border-box',
          border: '2px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)',
          color: '#e2e8f0', fontFamily: 'inherit', fontSize: 18, fontWeight: 700,
          marginBottom: 8,
        }}
        autoFocus
      />
      <button
        onClick={submit}
        disabled={!answer.trim()}
        style={{
          width: '100%', padding: '14px', borderRadius: 12,
          border: `2px solid ${answer.trim() ? '#22C55E' : 'rgba(255,255,255,0.1)'}`,
          background: answer.trim() ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.04)',
          color: answer.trim() ? '#22C55E' : '#475569',
          cursor: answer.trim() ? 'pointer' : 'default',
          fontFamily: 'inherit', fontWeight: 900, fontSize: 17,
        }}>
        ✓ Abschicken
      </button>
    </div>
  );
}

function TeamTimerBar({ endsAt, durationSec }: { endsAt: number; durationSec: number }) {
  const [remaining, setRemaining] = useState(Math.max(0, (endsAt - Date.now()) / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      const r = Math.max(0, (endsAt - Date.now()) / 1000);
      setRemaining(r);
      if (r === 0) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [endsAt]);

  const pct = Math.min(100, (remaining / durationSec) * 100);
  const urgent = remaining <= 5;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Timer</span>
        <span style={{ fontSize: 13, fontWeight: 900, color: urgent ? '#EF4444' : '#FBBF24' }}>
          {Math.ceil(remaining)}s
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 3,
          background: urgent ? '#EF4444' : '#FBBF24',
          width: `${pct}%`, transition: 'width 0.1s linear',
        }} />
      </div>
    </div>
  );
}

function PlacementCard({ state: s, myTeamId, isMyTurn, emit, roomCode }: {
  state: QQStateUpdate; myTeamId: string; isMyTurn: boolean;
  emit: any; roomCode: string;
}) {
  const [selecting, setSelecting] = useState(false);
  const pendingTeam = s.teams.find(t => t.id === s.pendingFor);
  const isSteal = s.pendingAction === 'STEAL_1';

  async function handleCellClick(row: number, col: number) {
    if (!isMyTurn || !selecting) return;
    const cell = s.grid[row][col];
    if (isSteal) {
      if (!cell.ownerId || cell.ownerId === myTeamId) return;
      await emit('qq:stealCell', { roomCode, teamId: myTeamId, row, col });
    } else {
      if (cell.ownerId) return;
      await emit('qq:placeCell', { roomCode, teamId: myTeamId, row, col });
    }
    setSelecting(false);
  }

  const cellSize = Math.min(56, Math.floor(340 / s.gridSize));

  return (
    <Card>
      {!isMyTurn ? (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          {pendingTeam && (
            <>
              <div style={{ fontSize: 36, marginBottom: 6 }}>{qqGetAvatar(pendingTeam.avatarId).emoji}</div>
              <div style={{ fontWeight: 800, color: pendingTeam.color }}>{pendingTeam.name}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>wählt ein Feld…</div>
            </>
          )}
        </div>
      ) : (
        <>
          <div style={{ fontWeight: 800, fontSize: 17, color: '#e2e8f0', marginBottom: 12, textAlign: 'center' }}>
            {isSteal ? '⚡ Klau ein fremdes Feld!' : '📍 Wähle ein Feld!'}
          </div>
          {!selecting ? (
            <BigButton color={isSteal ? '#EF4444' : '#22C55E'} onClick={() => setSelecting(true)}>
              {isSteal ? '⚡ Klauen' : '📍 Feld wählen'}
            </BigButton>
          ) : (
            <>
              <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 10 }}>
                {isSteal ? 'Tippe auf ein fremdes Feld' : 'Tippe auf ein freies Feld'}
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${s.gridSize}, ${cellSize}px)`,
                gap: 4, justifyContent: 'center',
              }}>
                {s.grid.flatMap((row, r) =>
                  row.map((cell, c) => {
                    const team = s.teams.find(t => t.id === cell.ownerId);
                    const isClickable = isSteal
                      ? (!!cell.ownerId && cell.ownerId !== myTeamId)
                      : !cell.ownerId;
                    return (
                      <div key={`${r}-${c}`}
                        onClick={() => handleCellClick(r, c)}
                        style={{
                          width: cellSize, height: cellSize, borderRadius: 6,
                          background: team ? `${team.color}88` : 'rgba(255,255,255,0.05)',
                          border: isClickable
                            ? `2px solid ${isSteal ? '#EF4444' : '#22C55E'}`
                            : `1px solid rgba(255,255,255,0.07)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: Math.max(10, cellSize * 0.4),
                          cursor: isClickable ? 'pointer' : 'default',
                          opacity: isClickable ? 1 : 0.4,
                          transition: 'all 0.15s',
                        }}>
                        {team ? qqGetAvatar(team.avatarId).emoji : ''}
                      </div>
                    );
                  })
                )}
              </div>
              <button onClick={() => setSelecting(false)} style={{
                marginTop: 10, width: '100%', padding: '8px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                color: '#64748b', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
              }}>Abbrechen</button>
            </>
          )}
        </>
      )}
    </Card>
  );
}

function ComebackCard({ state: s, myTeamId, isMine, emit, roomCode }: {
  state: QQStateUpdate; myTeamId: string; isMine: boolean;
  emit: any; roomCode: string;
}) {
  const [swapStep, setSwapStep] = useState<'first' | 'second'>('first');
  const [swapFirst, setSwapFirst] = useState<{row: number; col: number} | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const comebackTeam = s.teams.find(t => t.id === s.comebackTeamId);

  if (!isMine) {
    return (
      <Card>
        <div style={{ textAlign: 'center' }}>
          {comebackTeam && (
            <>
              <div style={{ fontSize: 36, marginBottom: 6 }}>{qqGetAvatar(comebackTeam.avatarId).emoji}</div>
              <div style={{ fontWeight: 800, color: comebackTeam.color, marginBottom: 4 }}>{comebackTeam.name}</div>
            </>
          )}
          <div style={{ fontSize: 14, color: '#F59E0B', fontWeight: 700 }}>⚡ wählt Comeback-Aktion…</div>
        </div>
      </Card>
    );
  }

  if (s.comebackAction) {
    return (
      <Card>
        <div style={{ fontWeight: 800, color: '#e2e8f0', textAlign: 'center', marginBottom: 12 }}>
          {s.comebackAction === 'PLACE_2' && '📍 Wähle 2 freie Felder'}
          {s.comebackAction === 'STEAL_1' && '⚡ Klau ein fremdes Feld'}
          {s.comebackAction === 'SWAP_2'  && '🔄 Tausche Felder'}
        </div>
        {/* Grid for PLACE_2/STEAL_1/SWAP_2 handled via PLACEMENT phase */}
        <div style={{ fontSize: 13, color: '#64748b', textAlign: 'center' }}>Warte auf Grid…</div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ fontWeight: 900, fontSize: 17, color: '#F59E0B', marginBottom: 16, textAlign: 'center' }}>
        ⚡ Deine Comeback-Chance!
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { action: 'PLACE_2', icon: '📍', label: '2 Felder setzen', desc: 'Platziere 2 freie Felder', color: '#22C55E' },
          { action: 'STEAL_1', icon: '⚡', label: '1 Feld klauen',   desc: 'Nimm ein fremdes Feld',   color: '#EF4444' },
          { action: 'SWAP_2',  icon: '🔄', label: '2 Felder tauschen', desc: 'Tausche ein Feld von je 2 Gegnern', color: '#8B5CF6' },
        ].map(opt => (
          <button key={opt.action} onClick={async () => {
            await emit('qq:comebackChoice', { roomCode, teamId: myTeamId, action: opt.action });
          }} style={{
            padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
            background: `${opt.color}15`, border: `2px solid ${opt.color}44`,
            textAlign: 'left', fontFamily: 'inherit', display: 'flex', gap: 12, alignItems: 'center',
          }}>
            <span style={{ fontSize: 28 }}>{opt.icon}</span>
            <div>
              <div style={{ fontWeight: 800, color: opt.color, fontSize: 15 }}>{opt.label}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{opt.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}

function GameOverCard({ state: s, myTeamId }: { state: QQStateUpdate; myTeamId: string }) {
  const sorted = [...s.teams].sort((a, b) => b.largestConnected - a.largestConnected);
  const myRank = sorted.findIndex(t => t.id === myTeamId) + 1;
  const myTeam = sorted.find(t => t.id === myTeamId);
  const winner = sorted[0];

  return (
    <Card>
      <div style={{ textAlign: 'center', padding: '4px 0' }}>
        {myRank === 1 ? (
          <>
            <div style={{ fontSize: 52, marginBottom: 6 }}>🏆</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: myTeam?.color }}>Gewonnen!</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 52, marginBottom: 6 }}>{qqGetAvatar(winner.avatarId).emoji}</div>
            <div style={{ fontWeight: 800, color: winner.color, fontSize: 20 }}>{winner.name} gewinnt!</div>
            <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>Du bist Platz {myRank}</div>
          </>
        )}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.map((t, i) => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
              borderRadius: 10,
              background: t.id === myTeamId ? `${t.color}18` : 'rgba(255,255,255,0.03)',
              border: t.id === myTeamId ? `1px solid ${t.color}44` : '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: 16, width: 20, color: '#64748b' }}>#{i + 1}</span>
              <span style={{ fontSize: 22 }}>{qqGetAvatar(t.avatarId).emoji}</span>
              <span style={{ fontWeight: 800, color: t.color, flex: 1 }}>{t.name}</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>{t.largestConnected} verbunden</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ── Waiting Screen ────────────────────────────────────────────────────────────

function WaitingScreen({ roomCode, connected }: { roomCode: string; connected: boolean }) {
  return (
    <div style={{ ...pageStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#e2e8f0' }}>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Quarter Quiz</div>
        <div style={{ color: '#475569', marginBottom: 12 }}>Raum: {roomCode}</div>
        <div style={{ fontSize: 12, color: connected ? '#22C55E' : '#EF4444' }}>
          {connected ? '● Verbunden, lade Spielzustand…' : '○ Verbinde…'}
        </div>
      </div>
    </div>
  );
}

// ── Shared UI primitives ─────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#1B1510', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 18, padding: '18px 16px', marginBottom: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
      {children}
    </div>
  );
}

function BigButton({ children, color, onClick, disabled }: {
  children: React.ReactNode; color: string;
  onClick: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '14px', borderRadius: 12,
      border: `2px solid ${disabled ? 'rgba(255,255,255,0.1)' : color}`,
      background: disabled ? 'rgba(255,255,255,0.04)' : `${color}22`,
      color: disabled ? '#475569' : color,
      cursor: disabled ? 'default' : 'pointer',
      fontFamily: 'inherit', fontWeight: 900, fontSize: 16,
      transition: 'all 0.15s',
    }}>
      {children}
    </button>
  );
}

function StatPill({ label, color = '#94a3b8' }: { label: string; color?: string }) {
  return (
    <div style={{
      padding: '3px 10px', borderRadius: 999,
      background: `${color}18`, border: `1px solid ${color}33`,
      fontSize: 11, fontWeight: 800, color,
    }}>
      {label}
    </div>
  );
}

function ConnStatus({ connected }: { connected: boolean }) {
  return (
    <div style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: connected ? '#22C55E' : '#EF4444' }}>
      {connected ? '● Verbunden' : '○ Getrennt'}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: '100vh', background: '#0D0A06', color: '#e2e8f0',
  fontFamily: "'Nunito', system-ui, sans-serif",
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
  color: '#e2e8f0', fontFamily: 'inherit', fontSize: 16,
  marginBottom: 12, boxSizing: 'border-box',
};
