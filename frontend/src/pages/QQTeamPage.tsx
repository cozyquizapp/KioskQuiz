import { useState, useEffect, useRef, useCallback } from 'react';
import { useQQSocket } from '../hooks/useQQSocket';
import {
  QQ_AVATARS, QQStateUpdate, QQ_CATEGORY_COLORS, QQ_CATEGORY_LABELS,
  QQTeam, qqGetAvatar, QQ_BUNTE_TUETE_LABELS,
} from '../../../shared/quarterQuizTypes';

// ── CSS for animations ────────────────────────────────────────────────────────
const TEAM_CSS = `
  @keyframes tcfloat   { 0%,100%{transform:translateY(0) rotate(var(--r,0deg))} 50%{transform:translateY(-8px) rotate(var(--r,0deg))} }
  @keyframes tcpop     { from{opacity:0;transform:scale(0.7) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes tcpulse   { 0%,100%{box-shadow: 0 0 0 0 var(--c,rgba(255,255,255,0.2))} 50%{box-shadow: 0 0 0 6px transparent} }
  @keyframes tcspin    { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
  @keyframes tcreveal  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes tctimer   { from{width:100%} to{width:0%} }
  @keyframes tcwobble  { 0%,100%{transform:rotate(-3deg)} 50%{transform:rotate(3deg)} }
  @keyframes tcbtnpop  { 0%{transform:scale(0.96)} 60%{transform:scale(1.04)} 100%{transform:scale(1)} }
  @keyframes tcsuccess { 0%{transform:scale(1)} 30%{transform:scale(1.06)} 60%{transform:scale(0.98)} 100%{transform:scale(1)} }
  @keyframes tcoptIn   { from{opacity:0;transform:translateY(18px) scale(0.94)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes tcwheelslide { from{transform:translateY(var(--from,0px));opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes tccheckpop { from{transform:scale(0)} to{transform:scale(1)} }
`;

const QQ_ROOM = 'default';

type SetupStep = 'AVATAR' | 'NAME';

function getOrCreateTeamId(): string {
  const key = 'qq_teamId';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `team-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

export default function QQTeamPage() {
  const roomCode = QQ_ROOM;
  const [step, setStep]         = useState<SetupStep>('AVATAR');
  const [avatarId, setAvatarId] = useState(() => sessionStorage.getItem('qq_avatarId') ?? 'fox');
  const [teamName, setTeamName] = useState(() => sessionStorage.getItem('qq_teamName') ?? '');
  const [teamId]                = useState(getOrCreateTeamId);
  const [joined, setJoined]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const { state, connected, emit } = useQQSocket(roomCode);

  // Auto-rejoin if we have a stored session
  useEffect(() => {
    if (joined || !connected) return;
    const storedName = sessionStorage.getItem('qq_teamName');
    if (storedName) {
      emit('qq:joinTeam', { roomCode, teamId, teamName: storedName, avatarId }).then((ack: any) => {
        if (ack.ok) setJoined(true);
      });
    }
  }, [connected]);

  async function joinRoom() {
    if (!teamName.trim()) return;
    setError(null);
    sessionStorage.setItem('qq_teamName', teamName.trim());
    sessionStorage.setItem('qq_avatarId', avatarId);
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
  const [lang, setLang] = useState<'de' | 'en'>(() => (sessionStorage.getItem('qq_lang') as 'de' | 'en') ?? 'de');

  return (
    <div style={{ ...darkPage, background: `radial-gradient(ellipse at 50% 0%, ${teamColor}18 0%, transparent 60%), #0D0A06` }}>
      <style>{TEAM_CSS}</style>
      <div style={grainOverlay} />

      <div style={{ width: '100%', maxWidth: 520, margin: '0 auto', padding: '12px 12px 28px', position: 'relative', zIndex: 5 }}>

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
            {/* Language selector */}
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              {(['de', 'en'] as const).map(l => {
                const active = lang === l;
                return (
                  <button key={l} onClick={() => { setLang(l); sessionStorage.setItem('qq_lang', l); }}
                    style={{
                      padding: '4px 8px', borderRadius: 8, cursor: 'pointer',
                      fontFamily: 'inherit', fontWeight: 800, fontSize: 11,
                      border: `1px solid ${active ? teamColor : 'rgba(255,255,255,0.08)'}`,
                      background: active ? `${teamColor}22` : 'transparent',
                      color: active ? teamColor : '#475569',
                      transition: 'all 0.15s',
                    }}>
                    {l.toUpperCase()}
                  </button>
                );
              })}
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
          <QuestionCard state={s} myTeamId={myTeamId} emit={emit} roomCode={roomCode} lang={lang} />
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

function QuestionCard({ state: s, myTeamId, emit, roomCode, lang }: {
  state: QQStateUpdate; myTeamId: string; emit: any; roomCode: string; lang: 'de' | 'en';
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
        {lang === 'en' ? catLabel.en : catLabel.de}
      </div>

      {/* Timer bar */}
      {s.timerEndsAt && !isRevealed && (
        <TeamTimerBar endsAt={s.timerEndsAt} durationSec={s.timerDurationSec} accentColor={catColor} />
      )}

      {/* Question text */}
      <div style={{
        fontSize: 'clamp(18px, 5vw, 24px)', fontWeight: 900, lineHeight: 1.3,
        color: '#F8FAFC', marginBottom: 14,
      }}>
        {lang === 'en' && q.textEn ? q.textEn : q.text}
      </div>

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
        <AnswerInput state={s} myTeamId={myTeamId} emit={emit} roomCode={roomCode} catColor={catColor} lang={lang} />
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
          {lang === 'en' && q.answerEn && q.answerEn !== s.revealedAnswer && (
            <div style={{ fontFamily: "'Caveat', cursive", fontSize: 14, color: 'rgba(74,222,128,0.5)', marginTop: 4 }}>
              {q.answerEn}
            </div>
          )}
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

// ── Submit button (shared) ────────────────────────────────────────────────────
function SubmitBtn({ onSubmit, canSubmit, submitted, catColor, label = 'Abschicken' }: {
  onSubmit: () => void; canSubmit: boolean; submitted: boolean; catColor: string; label?: string;
}) {
  const bg = submitted ? '#16a34a' : canSubmit ? `${catColor}28` : 'rgba(255,255,255,0.04)';
  const border = submitted ? '#16a34a' : canSubmit ? catColor : 'rgba(255,255,255,0.08)';
  const color = submitted ? '#fff' : canSubmit ? catColor : '#334155';
  return (
    <button
      onClick={onSubmit}
      disabled={!canSubmit || submitted}
      style={{
        width: '100%', padding: '15px', borderRadius: 14, marginTop: 10,
        border: `2px solid ${border}`, background: bg, color,
        cursor: canSubmit && !submitted ? 'pointer' : 'default',
        fontFamily: 'inherit', fontWeight: 900, fontSize: 17,
        boxShadow: canSubmit && !submitted ? `0 4px 0 ${catColor}55, 0 0 20px ${catColor}22` : submitted ? '0 4px 0 #15803d' : 'none',
        transition: 'all 0.2s',
        animation: submitted ? 'tcsuccess 0.45s cubic-bezier(0.34,1.56,0.64,1) both' : canSubmit ? 'tcbtnpop 0.35s cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}
    >
      {submitted
        ? <><span style={{ animation: 'tccheckpop 0.4s cubic-bezier(0.34,1.56,0.64,1) both', display: 'inline-block', fontSize: 20 }}>✓</span> Abgeschickt</>
        : label}
    </button>
  );
}

// ── Submitted state ───────────────────────────────────────────────────────────
function SubmittedBadge({ text }: { text: string }) {
  return (
    <div style={{
      padding: '12px 16px', borderRadius: 14, textAlign: 'center',
      background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.3)',
      fontSize: 15, fontWeight: 800, color: '#4ade80',
      animation: 'tcreveal 0.3s ease both',
    }}>
      ✓ Abgegeben: „{text}"
    </div>
  );
}

// ── Main AnswerInput router ───────────────────────────────────────────────────
function AnswerInput({ state: s, myTeamId, emit, roomCode, catColor, lang }: {
  state: QQStateUpdate; myTeamId: string; emit: any; roomCode: string; catColor: string; lang: 'de' | 'en';
}) {
  const q = s.currentQuestion;
  const myAnswer = s.answers.find(a => a.teamId === myTeamId);

  async function submitText(text: string) {
    if (!text.trim()) return;
    if (navigator.vibrate) navigator.vibrate(40);
    await emit('qq:submitAnswer', { roomCode, teamId: myTeamId, answer: text.trim() });
  }

  if (myAnswer) return <SubmittedBadge text={myAnswer.text} />;
  if (!q) return null;

  // Hot Potato — no input needed
  if (q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato') return null;

  // Route by category
  if (q.category === 'MUCHO') return <MuchoInput question={q} catColor={catColor} onSubmit={submitText} lang={lang} />;
  if (q.category === 'ZEHN_VON_ZEHN') return <AllInInput question={q} catColor={catColor} onSubmit={submitText} lang={lang} />;
  if (q.category === 'SCHAETZCHEN') return <TextInput catColor={catColor} onSubmit={submitText} numeric placeholder={q.unit ? `Zahl (${lang === 'en' && q.unitEn ? q.unitEn : q.unit}) eingeben…` : 'Zahl eingeben…'} />;
  if (q.category === 'CHEESE') return <TextInput catColor={catColor} onSubmit={submitText} placeholder="Antwort eingeben…" />;
  if (q.category === 'BUNTE_TUETE') {
    const kind = q.bunteTuete?.kind;
    if (kind === 'top5') return <Top5Input catColor={catColor} onSubmit={submitText} lang={lang} />;
    if (kind === 'oneOfEight') return <ImposterInput question={q} catColor={catColor} onSubmit={submitText} usedIds={s.answers.map(a => a.text)} lang={lang} />;
    if (kind === 'order') return <FixItInput question={q} catColor={catColor} onSubmit={submitText} lang={lang} />;
    if (kind === 'map') return <PinItInput catColor={catColor} onSubmit={submitText} />;
  }
  // Fallback
  return <TextInput catColor={catColor} onSubmit={submitText} placeholder="Antwort eingeben…" />;
}

// ── Text input (Schätzchen + Picture This fallback) ───────────────────────────
function TextInput({ catColor, onSubmit, placeholder, numeric }: {
  catColor: string; onSubmit: (v: string) => void; placeholder?: string; numeric?: boolean;
}) {
  const [val, setVal] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 120); }, []);
  return (
    <div style={{ marginTop: 4 }}>
      <input
        ref={ref}
        type={numeric ? 'number' : 'text'}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && val.trim() && onSubmit(val)}
        placeholder={placeholder ?? 'Antwort eingeben…'}
        autoComplete="off"
        style={{
          width: '100%', padding: '15px 16px', borderRadius: 14, boxSizing: 'border-box',
          border: `2px solid ${val ? catColor + '66' : 'rgba(255,255,255,0.1)'}`,
          background: val ? `${catColor}10` : 'rgba(255,255,255,0.05)',
          color: '#F1F5F9', fontFamily: 'inherit', fontSize: 20, fontWeight: 700,
          outline: 'none', transition: 'all 0.2s',
          boxShadow: val ? `0 0 0 3px ${catColor}22` : 'none',
        }}
      />
      <SubmitBtn onSubmit={() => onSubmit(val)} canSubmit={!!val.trim()} submitted={false} catColor={catColor} />
    </div>
  );
}

// ── Mu-Cho: A/B/C/D buttons ───────────────────────────────────────────────────
const MUCHO_COLORS = ['#3B82F6','#22C55E','#EF4444','#F97316'];
const MUCHO_LABELS = ['A','B','C','D'];

function MuchoInput({ question: q, catColor, onSubmit, lang }: { question: any; catColor: string; onSubmit: (v: string) => void; lang: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const opts: string[] = q.options ?? [];
  const optsEn: string[] = q.optionsEn ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
      {opts.map((opt: string, i: number) => {
        const color = MUCHO_COLORS[i] ?? catColor;
        const isSelected = selected === i;
        const label = lang === 'en' && optsEn[i] ? optsEn[i] : opt;
        return (
          <button
            key={i}
            onClick={() => setSelected(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 0,
              borderRadius: 14, overflow: 'hidden', border: 'none', cursor: 'pointer',
              background: isSelected ? `${color}30` : 'rgba(255,255,255,0.04)',
              boxShadow: isSelected ? `0 4px 0 ${color}55` : '0 3px 0 rgba(0,0,0,0.4)',
              transform: isSelected ? 'translateY(-2px)' : 'none',
              transition: 'all 0.15s cubic-bezier(0.34,1.56,0.64,1)',
              animation: `tcoptIn 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.07}s both`,
              outline: isSelected ? `2px solid ${color}` : `1px solid ${color}33`,
            }}
          >
            {/* Letter badge */}
            <div style={{
              width: 48, height: 52, flexShrink: 0,
              background: isSelected ? color : `${color}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 900, color: isSelected ? '#fff' : color,
              borderRight: `1px solid ${color}44`,
              transition: 'all 0.15s',
            }}>
              {isSelected ? '✓' : MUCHO_LABELS[i]}
            </div>
            {/* Option text */}
            <div style={{
              flex: 1, padding: '14px 16px', textAlign: 'left',
              fontSize: 'clamp(15px,4vw,18px)', fontWeight: 700,
              color: isSelected ? '#fff' : '#CBD5E1', fontFamily: 'inherit',
            }}>
              {label}
            </div>
          </button>
        );
      })}
      <SubmitBtn
        onSubmit={() => selected !== null && onSubmit(opts[selected])}
        canSubmit={selected !== null}
        submitted={false}
        catColor={catColor}
      />
    </div>
  );
}

// ── All In: 1/2/3 betting ─────────────────────────────────────────────────────
const ALLIN_COLORS = ['#3B82F6','#22C55E','#EF4444'];
const POOL = 10;

function AllInInput({ question: q, catColor, onSubmit, lang }: { question: any; catColor: string; onSubmit: (v: string) => void; lang: string }) {
  const [bets, setBets] = useState([0, 0, 0]);
  const opts: string[] = q.options ?? [];
  const optsEn: string[] = q.optionsEn ?? [];
  const remaining = POOL - bets.reduce((a, b) => a + b, 0);

  function updateBet(i: number, delta: number) {
    setBets(prev => {
      const next = [...prev];
      const newVal = Math.max(0, Math.min(prev[i] + delta, prev[i] + remaining + (delta < 0 ? 0 : 0)));
      if (delta > 0 && remaining <= 0) return prev;
      next[i] = newVal;
      return next;
    });
  }

  const pillColor = remaining === 0 ? '#22C55E' : remaining < POOL ? '#F59E0B' : '#475569';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
      {/* Remaining */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Punkte verteilen</span>
        <div style={{
          padding: '3px 12px', borderRadius: 999, fontSize: 13, fontWeight: 900,
          background: `${pillColor}22`, border: `1px solid ${pillColor}55`, color: pillColor,
        }}>
          {remaining} übrig
        </div>
      </div>

      {opts.map((opt: string, i: number) => {
        const color = ALLIN_COLORS[i] ?? catColor;
        const label = lang === 'en' && optsEn[i] ? optsEn[i] : opt;
        const pts = bets[i];
        return (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr auto auto auto',
            alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 14,
            background: pts > 0 ? `${color}12` : 'rgba(255,255,255,0.04)',
            border: `2px solid ${pts > 0 ? color + '55' : 'rgba(255,255,255,0.08)'}`,
            transition: 'all 0.15s',
            borderLeft: `4px solid ${color}`,
            animation: `tcoptIn 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.08}s both`,
          }}>
            <div style={{ fontSize: 'clamp(14px,3.5vw,17px)', fontWeight: 700, color: pts > 0 ? '#F1F5F9' : '#64748b' }}>
              <span style={{ fontSize: 12, fontWeight: 900, color, marginRight: 6 }}>{i + 1}</span>
              {label}
            </div>
            {/* − */}
            <button onClick={() => updateBet(i, -1)} disabled={pts <= 0} style={{
              width: 40, height: 40, borderRadius: 10, border: `1px solid ${pts > 0 ? color + '55' : 'rgba(255,255,255,0.1)'}`,
              background: pts > 0 ? `${color}18` : 'transparent', color: pts > 0 ? color : '#334155',
              cursor: pts > 0 ? 'pointer' : 'default', fontFamily: 'inherit', fontSize: 20, fontWeight: 900,
            }}>−</button>
            {/* Points */}
            <div style={{ width: 32, textAlign: 'center', fontWeight: 900, fontSize: 18, color: pts > 0 ? color : '#475569', fontVariantNumeric: 'tabular-nums' }}>
              {pts}
            </div>
            {/* + */}
            <button onClick={() => updateBet(i, 1)} disabled={remaining <= 0} style={{
              width: 40, height: 40, borderRadius: 10, border: `1px solid ${remaining > 0 ? color + '55' : 'rgba(255,255,255,0.1)'}`,
              background: remaining > 0 ? `${color}18` : 'transparent', color: remaining > 0 ? color : '#334155',
              cursor: remaining > 0 ? 'pointer' : 'default', fontFamily: 'inherit', fontSize: 20, fontWeight: 900,
            }}>+</button>
          </div>
        );
      })}
      <SubmitBtn
        onSubmit={() => onSubmit(bets.join(','))}
        canSubmit={remaining === 0}
        submitted={false}
        catColor={catColor}
        label={remaining === 0 ? 'Abschicken' : `Noch ${remaining} Punkt${remaining === 1 ? '' : 'e'} verteilen`}
      />
    </div>
  );
}

// ── Top 5 ─────────────────────────────────────────────────────────────────────
function Top5Input({ catColor, onSubmit, lang }: { catColor: string; onSubmit: (v: string) => void; lang: string }) {
  const [vals, setVals] = useState(['','','','','']);
  const filled = vals.filter(v => v.trim()).length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4 }}>
      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, marginBottom: 2 }}>
        {lang === 'en' ? 'Enter up to 5 answers (order doesn\'t matter)' : 'Bis zu 5 Antworten eingeben (Reihenfolge egal)'}
      </div>
      {vals.map((v, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: `${catColor}22`, border: `1px solid ${catColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: catColor, flexShrink: 0 }}>{i+1}</div>
          <input
            value={v}
            onChange={e => { const a = [...vals]; a[i] = e.target.value; setVals(a); }}
            placeholder={lang === 'en' ? `Answer ${i+1}…` : `Antwort ${i+1}…`}
            style={{
              flex: 1, padding: '11px 14px', borderRadius: 12, boxSizing: 'border-box',
              border: `1.5px solid ${v ? catColor+'55' : 'rgba(255,255,255,0.08)'}`,
              background: v ? `${catColor}0d` : 'rgba(255,255,255,0.04)',
              color: '#F1F5F9', fontFamily: 'inherit', fontSize: 16, fontWeight: 700,
              outline: 'none', transition: 'all 0.15s',
            }}
          />
        </div>
      ))}
      <SubmitBtn onSubmit={() => onSubmit(vals.filter(v=>v.trim()).join('|'))} canSubmit={filled >= 1} submitted={false} catColor={catColor} />
    </div>
  );
}

// ── Imposter: Drum-Wheel Carousel ─────────────────────────────────────────────
function ImposterInput({ question: q, catColor, onSubmit, usedIds, lang }: {
  question: any; catColor: string; onSubmit: (v: string) => void; usedIds: string[]; lang: string;
}) {
  const bt = q.bunteTuete;
  const stmts: string[] = (lang === 'en' && bt?.statementsEn?.some((s:string)=>s) ? bt.statementsEn : bt?.statements) ?? [];
  // Filter out already submitted
  const remaining = stmts.map((s: string, i: number) => ({ text: s, idx: i })).filter(x => x.text && !usedIds.includes(String(x.idx)));
  const [idx, setIdx] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const touchStartY = useRef(0);

  const clamped = Math.max(0, Math.min(idx, remaining.length - 1));
  const current = remaining[clamped];
  const canUp = clamped > 0;
  const canDown = clamped < remaining.length - 1;

  const SLOT_H = 100;

  function handleConfirm() {
    if (!current || submitted) return;
    if (navigator.vibrate) navigator.vibrate(40);
    setSubmitted(true);
    onSubmit(String(current.idx));
  }

  const handleTouchStart = useCallback((e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (delta > 30) setIdx(i => Math.min(i + 1, remaining.length - 1));
    if (delta < -30) setIdx(i => Math.max(i - 1, 0));
  }, [remaining.length]);

  if (!remaining.length) return <div style={{ color: '#475569', fontSize: 14, textAlign: 'center', padding: 12 }}>Alle Optionen gewählt</div>;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
        🕵️ {lang === 'en' ? 'Which statement is false?' : 'Welche Aussage ist falsch?'}
      </div>

      {/* Drum wheel */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          borderRadius: 16, height: SLOT_H * 3, overflow: 'hidden', position: 'relative',
          background: 'rgba(10,15,35,0.97)', border: '1.5px solid rgba(148,163,184,0.15)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          userSelect: 'none',
        }}
      >
        {/* Top slot (blurred) */}
        <div
          onClick={() => canUp && setIdx(i => i - 1)}
          style={{
            height: SLOT_H, padding: '0 40px 0 16px', display: '-webkit-box', alignItems: 'center',
            filter: 'blur(2px)', opacity: 0.3, cursor: canUp ? 'pointer' : 'default',
            fontSize: 14, color: '#94a3b8', overflow: 'hidden',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          } as any}
        >
          {canUp ? remaining[clamped - 1]?.text : ''}
        </div>

        {/* Center slot (active) */}
        <div key={clamped} style={{
          height: SLOT_H, padding: '0 48px 0 16px', display: 'flex', alignItems: 'center',
          background: 'rgba(148,45,89,0.18)',
          borderTop: '1.5px solid rgba(148,45,89,0.5)',
          borderBottom: '1.5px solid rgba(148,45,89,0.5)',
          fontSize: 'clamp(14px,3.8vw,17px)', fontWeight: 800, color: '#ffe4f2',
          lineHeight: 1.35,
          animation: 'tcwheelslide 0.22s ease both',
        }}>
          {current?.text}
        </div>

        {/* Bottom slot (blurred) */}
        <div
          onClick={() => canDown && setIdx(i => i + 1)}
          style={{
            height: SLOT_H, padding: '0 40px 0 16px', display: 'flex', alignItems: 'center',
            filter: 'blur(2px)', opacity: 0.3, cursor: canDown ? 'pointer' : 'default',
            fontSize: 14, color: '#94a3b8', overflow: 'hidden',
          }}
        >
          {canDown ? remaining[clamped + 1]?.text : ''}
        </div>

        {/* Arrow buttons */}
        {canUp && <div onClick={() => setIdx(i => i - 1)} style={{ position: 'absolute', top: 8, right: 12, color: '#64748b', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>▲</div>}
        {canDown && <div onClick={() => setIdx(i => i + 1)} style={{ position: 'absolute', bottom: 8, right: 12, color: '#64748b', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>▼</div>}
      </div>

      {/* Counter */}
      <div style={{ textAlign: 'center', fontSize: 12, color: '#475569', fontWeight: 700, marginTop: 6 }}>
        {clamped + 1} / {remaining.length}
      </div>

      <SubmitBtn onSubmit={handleConfirm} canSubmit={!!current && !submitted} submitted={submitted} catColor="#942d59" label={lang === 'en' ? 'Choose' : 'Wählen'} />
    </div>
  );
}

// ── Fix It: sortable list (no dnd-kit dep, manual reorder via buttons) ─────────
function FixItInput({ question: q, catColor, onSubmit, lang }: { question: any; catColor: string; onSubmit: (v: string) => void; lang: string }) {
  const bt = q.bunteTuete;
  const srcItems: string[] = (lang === 'en' && bt?.itemsEn?.some((s:string)=>s) ? bt.itemsEn : bt?.items) ?? [];
  // Shuffle on mount for challenge
  const [items, setItems] = useState(() => [...srcItems].sort(() => Math.random() - 0.5));
  const criteria = lang === 'en' ? (bt?.criteriaEn || bt?.criteria) : bt?.criteria;

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
      {criteria && (
        <div style={{ fontSize: 12, color: catColor, fontWeight: 800, textAlign: 'center', padding: '5px 12px', borderRadius: 8, background: `${catColor}12`, border: `1px solid ${catColor}33` }}>
          🔀 {criteria}
        </div>
      )}
      <div style={{ fontSize: 12, color: '#475569', textAlign: 'center' }}>
        {lang === 'en' ? 'Tap ▲▼ to reorder' : '▲▼ zum Sortieren tippen'}
      </div>
      {items.map((item, i) => (
        <div key={item + i} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', borderRadius: 14,
          background: 'rgba(26,32,53,0.9)', border: `1.5px solid ${catColor}22`,
          animation: `tcoptIn 0.3s ease ${i * 0.05}s both`,
        }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: `${catColor}22`, border: `1px solid ${catColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: catColor }}>
            {i + 1}
          </div>
          <div style={{ flex: 1, fontSize: 'clamp(14px,3.8vw,16px)', fontWeight: 700, color: '#F1F5F9' }}>{item}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button onClick={() => move(i, -1)} disabled={i === 0} style={{ width: 28, height: 26, borderRadius: 6, border: `1px solid ${i > 0 ? catColor+'44' : 'rgba(255,255,255,0.06)'}`, background: 'transparent', color: i > 0 ? catColor : '#334155', cursor: i > 0 ? 'pointer' : 'default', fontSize: 13, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▲</button>
            <button onClick={() => move(i, 1)} disabled={i === items.length - 1} style={{ width: 28, height: 26, borderRadius: 6, border: `1px solid ${i < items.length-1 ? catColor+'44' : 'rgba(255,255,255,0.06)'}`, background: 'transparent', color: i < items.length-1 ? catColor : '#334155', cursor: i < items.length-1 ? 'pointer' : 'default', fontSize: 13, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▼</button>
          </div>
        </div>
      ))}
      <SubmitBtn onSubmit={() => onSubmit(items.join('|'))} canSubmit={items.length > 0} submitted={false} catColor={catColor} />
    </div>
  );
}

// ── Pin It: simple coordinate input (no leaflet dep needed for basic version) ──
function PinItInput({ catColor, onSubmit }: { catColor: string; onSubmit: (v: string) => void }) {
  // Simple lat/lng text entry as fallback (full map would need react-leaflet)
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const valid = lat !== '' && lng !== '' && !isNaN(Number(lat)) && !isNaN(Number(lng));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
      <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 12, color: '#64748b', textAlign: 'center' }}>
        📍 Gib die Koordinaten ein (z.B. von Google Maps)
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, marginBottom: 4 }}>Breitengrad (Lat)</div>
          <input value={lat} onChange={e => setLat(e.target.value)} type="number" step="0.0001" placeholder="53.5503"
            style={{ width: '100%', padding: '11px 12px', borderRadius: 10, boxSizing: 'border-box', border: `1.5px solid ${lat ? catColor+'55':'rgba(255,255,255,0.08)'}`, background: 'rgba(255,255,255,0.04)', color: '#F1F5F9', fontFamily: 'inherit', fontSize: 15, outline: 'none' }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, marginBottom: 4 }}>Längengrad (Lng)</div>
          <input value={lng} onChange={e => setLng(e.target.value)} type="number" step="0.0001" placeholder="9.9922"
            style={{ width: '100%', padding: '11px 12px', borderRadius: 10, boxSizing: 'border-box', border: `1.5px solid ${lng ? catColor+'55':'rgba(255,255,255,0.08)'}`, background: 'rgba(255,255,255,0.04)', color: '#F1F5F9', fontFamily: 'inherit', fontSize: 15, outline: 'none' }} />
        </div>
      </div>
      {valid && <div style={{ fontSize: 12, color: catColor, textAlign: 'center', fontWeight: 700 }}>📍 {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}</div>}
      <SubmitBtn onSubmit={() => onSubmit(`${lat},${lng}`)} canSubmit={valid} submitted={false} catColor={catColor} />
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
  const [freeMode, setFreeMode] = useState<'PLACE' | 'STEAL' | null>(null);
  const [swapFirst, setSwapFirst] = useState<{ r: number; c: number } | null>(null);
  const pendingTeam = s.teams.find(t => t.id === s.pendingFor);
  const isFree = s.pendingAction === 'FREE';
  const isSwap = s.comebackAction === 'SWAP_2' && s.pendingAction === 'COMEBACK';
  const isSteal = s.pendingAction === 'STEAL_1' || (isFree && freeMode === 'STEAL');
  const cellSize = Math.min(60, Math.floor(340 / s.gridSize));

  useEffect(() => { if (!isMyTurn) { setSelecting(false); setFreeMode(null); setSwapFirst(null); } }, [isMyTurn]);

  async function chooseFree(action: 'PLACE' | 'STEAL') {
    setFreeMode(action);
    await emit('qq:chooseFreeAction', { roomCode, teamId: myTeamId, action });
  }

  async function handleCell(r: number, c: number) {
    if (!isMyTurn || !selecting) return;
    const cell = s.grid[r][c];
    if (isSwap) {
      // SWAP_2: select two opponent cells from different teams
      if (!cell.ownerId || cell.ownerId === myTeamId) return;
      if (!swapFirst) {
        setSwapFirst({ r, c });
        return;
      }
      if (r === swapFirst.r && c === swapFirst.c) return;
      const firstCell = s.grid[swapFirst.r][swapFirst.c];
      if (firstCell.ownerId === cell.ownerId) return; // must be different teams
      await emit('qq:swapCells', { roomCode, teamId: myTeamId, rowA: swapFirst.r, colA: swapFirst.c, rowB: r, colB: c });
      setSelecting(false);
      setSwapFirst(null);
      return;
    }
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

  const actionColor = isSwap ? '#8B5CF6' : isSteal ? '#EF4444' : '#22C55E';

  return (
    <CozyCard borderColor={actionColor}>
      <div style={{ fontWeight: 900, fontSize: 18, color: actionColor, marginBottom: 12, textAlign: 'center' }}>
        {isSwap ? '🔄 Tausche 2 gegnerische Felder!' : isSteal ? '⚡ Klau ein fremdes Feld!' : '📍 Wähle ein Feld!'}
      </div>

      {/* Phase 3 FREE action choice */}
      {isFree && !freeMode && !selecting && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <CozyBtn color="#22C55E" onClick={() => chooseFree('PLACE')}>📍 Setzen</CozyBtn>
          <CozyBtn color="#EF4444" onClick={() => chooseFree('STEAL')}>⚡ Klauen</CozyBtn>
        </div>
      )}

      {(!isFree || freeMode) && !selecting ? (
        <CozyBtn color={actionColor} onClick={() => setSelecting(true)}>
          {isSwap ? '🔄 Felder wählen' : isSteal ? '⚡ Klauen' : '📍 Feld wählen'}
        </CozyBtn>
      ) : (
        <>
          <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 12 }}>
            {isSwap
              ? (swapFirst ? 'Jetzt das 2. Feld (anderes Team) wählen' : 'Tippe auf ein gegnerisches Feld (1/2)')
              : isSteal ? 'Tippe auf ein fremdes Feld' : 'Tippe auf ein freies Feld'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${s.gridSize}, ${cellSize}px)`, gap: 4, justifyContent: 'center' }}>
            {s.grid.flatMap((row, r) =>
              row.map((cell, c) => {
                const team = s.teams.find(t => t.id === cell.ownerId);
                const isSwapFirst = swapFirst && swapFirst.r === r && swapFirst.c === c;
                const clickable = isSwap
                  ? (!!cell.ownerId && cell.ownerId !== myTeamId && (!swapFirst || (cell.ownerId !== s.grid[swapFirst.r][swapFirst.c].ownerId)))
                  : isSteal ? (!!cell.ownerId && cell.ownerId !== myTeamId) : !cell.ownerId;
                return (
                  <div key={`${r}-${c}`} onClick={() => handleCell(r, c)} style={{
                    width: cellSize, height: cellSize, borderRadius: 6,
                    background: isSwapFirst ? `${actionColor}66` : team ? `${team.color}88` : 'rgba(255,255,255,0.05)',
                    border: isSwapFirst ? `3px solid ${actionColor}` : clickable ? `2px solid ${actionColor}` : '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: Math.max(10, cellSize * 0.38),
                    cursor: clickable || isSwapFirst ? 'pointer' : 'default',
                    opacity: clickable || isSwapFirst ? 1 : 0.35,
                    transition: 'all 0.15s',
                    boxShadow: isSwapFirst ? `0 0 14px ${actionColor}88` : clickable ? `0 0 8px ${actionColor}44` : 'none',
                  }}>
                    {team ? qqGetAvatar(team.avatarId).emoji : ''}
                  </div>
                );
              })
            )}
          </div>
          <button onClick={() => { setSelecting(false); setSwapFirst(null); }} style={{
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
    // After choosing comeback action, the game transitions to PLACEMENT phase
    // PLACE_2 and STEAL_1 are handled by PlacementCard
    // SWAP_2 needs its own interactive grid here
    if (s.comebackAction === 'SWAP_2' && s.phase === 'COMEBACK_CHOICE') {
      return (
        <CozyCard borderColor="#8B5CF6">
          <div style={{ fontWeight: 800, color: '#e2e8f0', textAlign: 'center', fontSize: 17 }}>
            🔄 Tausch wird vorbereitet…
          </div>
        </CozyCard>
      );
    }
    return (
      <CozyCard borderColor="#F59E0B">
        <div style={{ fontWeight: 800, color: '#e2e8f0', textAlign: 'center', fontSize: 17 }}>
          {s.comebackAction === 'PLACE_2' && '📍 Wähle 2 freie Felder'}
          {s.comebackAction === 'STEAL_1' && '⚡ Klau ein fremdes Feld'}
          {s.comebackAction === 'SWAP_2'  && '🔄 Wähle 2 gegnerische Felder zum Tauschen'}
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
      border: `1px solid ${borderColor ? borderColor + '55' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 20, padding: '20px 18px', marginBottom: 14,
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
      width: '100%', padding: '16px', borderRadius: 14, fontFamily: 'inherit', fontWeight: 900, fontSize: 17,
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
  width: '100%', padding: '14px 16px', borderRadius: 12, marginBottom: 12,
  border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)',
  color: '#F1F5F9', fontFamily: 'inherit', fontSize: 17, fontWeight: 700,
  boxSizing: 'border-box', outline: 'none',
};
