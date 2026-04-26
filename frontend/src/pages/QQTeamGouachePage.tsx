// QQ Team Gouache — Phone-View im Aquarell-Look (Phase 2 der Migration).
//
// Strikt parallel zur produktiven `/team` (QQTeamPage.tsx). Selber
// Socket-Room ('default'), selbe localStorage-teamId — d.h. wer auf
// dieser Variante joint, ist im echten Spiel mit drin und tauscht den
// Avatar 1:1 mit der Cozy-Team-Page.
//
// MVP-Scope:
//   - Setup (Avatar + Team-Name) → echtes qq:joinTeam
//   - Lobby/Wait (post-join, vor Spielstart)
//   - QUESTION_ACTIVE:
//       SCHAETZCHEN  → number-input
//       MUCHO        → 4-Option-Buttons (A/B/C/D)
//       CHEESE       → free text input
//       (Hot Potato/Top5/Order/Map/Imposter/ZvZ → freundlicher Hinweis,
//        dafür weiter /team nutzen — UX dort ist komplex)
//   - QUESTION_REVEAL → warst-du-richtig-Feedback
//   - GAME_OVER → Sieger-Plakette
//   - Sonst → atmosphärische "warte"-Ansicht
//
// Antworten werden via `qq:submitAnswer` an dieselbe Backend-Pipeline
// geschickt wie die produktive Page.

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQQSocket } from '../hooks/useQQSocket';
import {
  QQ_AVATARS, QQStateUpdate, QQTeam, QQQuestion,
  qqGetAvatar, qqAvatarLabel,
} from '../../../shared/quarterQuizTypes';
import {
  PALETTE, F_HAND, F_BODY, softTeamColor,
  GouacheFilters, PaintedKeyframes, usePaintFonts,
  PaperCard, BlockCapsHeading,
  PaintedAvatar,
  PaintedHills, PaintedStars, PaintedMoon, PaintedBird,
} from '../gouache';

const QQ_ROOM = 'default';

// ─────────────────────────────────────────────────────────────────────────────
// teamId — geteilt mit der produktiven Page (gleicher localStorage-Key)
// ─────────────────────────────────────────────────────────────────────────────
function getOrCreateTeamId(): string {
  const key = 'qq_teamId';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `team-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function QQTeamGouachePage() {
  usePaintFonts();
  const roomCode = QQ_ROOM;
  const [teamId] = useState(getOrCreateTeamId);
  const { state, connected, emit } = useQQSocket(roomCode);

  const [avatarId, setAvatarId] = useState<string>(() => sessionStorage.getItem('qq_avatarId') ?? 'fox');
  const [teamName, setTeamName] = useState<string>(() => sessionStorage.getItem('qq_teamName') ?? '');
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-Rejoin wenn wir einen gespeicherten Namen haben
  useEffect(() => {
    if (joined || !connected) return;
    const storedName = sessionStorage.getItem('qq_teamName');
    if (storedName) {
      emit('qq:joinTeam', { roomCode, teamId, teamName: storedName, avatarId }).then((ack: any) => {
        if (ack?.ok) setJoined(true);
      });
    }
  }, [connected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset joined bei disconnect → Auto-Rejoin feuert beim reconnect
  useEffect(() => {
    if (!connected && joined) setJoined(false);
  }, [connected, joined]);

  // Live: blockierte Avatare aus dem State entfernen
  const takenAvatarIds = (state?.teams ?? []).filter(t => t.id !== teamId).map(t => t.avatarId);
  useEffect(() => {
    if (joined) return;
    if (takenAvatarIds.includes(avatarId)) {
      const free = QQ_AVATARS.find(a => !takenAvatarIds.includes(a.id));
      if (free) setAvatarId(free.id);
    }
  }, [takenAvatarIds.join(','), joined, avatarId]);

  async function handleJoin(name: string, ava: string) {
    if (!name.trim()) return;
    setError(null);
    sessionStorage.setItem('qq_teamName', name.trim());
    sessionStorage.setItem('qq_avatarId', ava);
    const ack: any = await emit('qq:joinTeam', { roomCode, teamId, teamName: name.trim(), avatarId: ava });
    if (ack?.ok) setJoined(true);
    else setError(ack?.error ?? 'Beitritt fehlgeschlagen');
  }

  const myTeam = state?.teams.find(t => t.id === teamId) ?? null;

  return (
    <PageShell myTeam={myTeam} avatarId={avatarId}>
      {!joined ? (
        <SetupView
          avatarId={avatarId}
          setAvatarId={setAvatarId}
          teamName={teamName}
          setTeamName={setTeamName}
          takenAvatarIds={takenAvatarIds}
          connected={connected}
          error={error}
          onJoin={() => handleJoin(teamName, avatarId)}
        />
      ) : !state ? (
        <ConnectingCard connected={connected} />
      ) : !myTeam ? (
        <RejoinFailCard onClear={() => {
          sessionStorage.removeItem('qq_teamName');
          sessionStorage.removeItem('qq_avatarId');
          setJoined(false);
        }} />
      ) : (
        <GameRouter
          state={state}
          myTeam={myTeam}
          myTeamId={teamId}
          emit={emit}
          roomCode={roomCode}
        />
      )}
    </PageShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PageShell — Aquarell-Hintergrund, Header, Footer, Phone-Container
// ─────────────────────────────────────────────────────────────────────────────

function PageShell({
  myTeam, avatarId, children,
}: { myTeam: QQTeam | null; avatarId: string; children: React.ReactNode }) {
  const headerColor = myTeam ? softTeamColor(myTeam.avatarId) : softTeamColor(avatarId);
  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      background: `linear-gradient(180deg, ${PALETTE.inkDeep} 0%, ${PALETTE.inkSoft} 50%, ${PALETTE.sage} 100%)`,
      position: 'relative', overflow: 'hidden',
      fontFamily: F_BODY, color: PALETTE.cream,
      paddingBottom: 'calc(env(safe-area-inset-bottom) + 28px)',
    }}>
      <GouacheFilters />
      <PaintedKeyframes />

      {/* Atmosphäre — sparsam für Mobile */}
      <PaintedStars count={18} />
      <div style={{ position: 'absolute', top: 14, right: 22, zIndex: 1 }}>
        <PaintedMoon size={48} />
      </div>
      <PaintedBird x="76%" y="6%" size={20} />

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 1, pointerEvents: 'none' }}>
        <PaintedHills width={1200} height={140} />
      </div>

      <div style={{
        position: 'relative', zIndex: 5,
        maxWidth: 460, margin: '0 auto',
        padding: 'calc(env(safe-area-inset-top) + 18px) 18px 12px',
        display: 'flex', flexDirection: 'column', gap: 18, minHeight: '100vh',
      }}>
        <Header myTeam={myTeam} headerColor={headerColor} />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {children}
        </main>
        <Footer />
      </div>

      <PageStyles />
    </div>
  );
}

function Header({ myTeam, headerColor }: { myTeam: QQTeam | null; headerColor: string }) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '4px 4px 0',
    }}>
      <div>
        <div style={{
          fontFamily: F_BODY, fontSize: 10, letterSpacing: '0.28em',
          color: PALETTE.cream, opacity: 0.78, textTransform: 'uppercase',
        }}>
          a cozy wolf production
        </div>
        <div style={{
          fontFamily: F_HAND, fontSize: 36, color: PALETTE.cream,
          fontWeight: 700, lineHeight: 1, marginTop: 2,
          textShadow: '0 4px 14px rgba(0,0,0,0.45)',
        }}>
          CozyQuiz
        </div>
      </div>
      {myTeam && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px 6px 6px', borderRadius: 999,
          background: `${PALETTE.cream}1f`,
          border: `1px solid ${headerColor}aa`,
          maxWidth: 220,
        }}>
          <PaintedAvatar slug={qqGetAvatar(myTeam.avatarId).slug} size={36} color={headerColor} withGrain={false} />
          <div style={{
            fontFamily: F_HAND, fontSize: 22, color: PALETTE.cream,
            lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 140,
          }} title={myTeam.name}>
            {myTeam.name}
          </div>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      gap: 10, fontFamily: F_BODY, fontSize: 11,
      color: `${PALETTE.cream}aa`, letterSpacing: '0.06em',
    }}>
      <span>Aquarell-Lab · echte Sockets</span>
      <Link to="/team" style={{
        color: PALETTE.cream, textDecoration: 'none',
        padding: '4px 10px', borderRadius: 999,
        background: `${PALETTE.cream}14`, border: `1px solid ${PALETTE.cream}33`,
      }}>
        Cozy-Team →
      </Link>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SetupView — Avatar-Grid + Name → Join
// ─────────────────────────────────────────────────────────────────────────────

function SetupView({
  avatarId, setAvatarId, teamName, setTeamName, takenAvatarIds,
  connected, error, onJoin,
}: {
  avatarId: string;
  setAvatarId: (id: string) => void;
  teamName: string;
  setTeamName: (n: string) => void;
  takenAvatarIds: string[];
  connected: boolean;
  error: string | null;
  onJoin: () => void;
}) {
  const canJoin = connected && teamName.trim().length > 0 && !takenAvatarIds.includes(avatarId);
  const myColor = softTeamColor(avatarId);
  return (
    <>
      <PaperCard washColor={PALETTE.cream} padding={20}>
        <SectionHeading n="01" title="Wähle deinen Avatar" sub="Jedes Team trägt seine Farbe" />
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 16,
        }}>
          {QQ_AVATARS.map(a => {
            const taken = takenAvatarIds.includes(a.id);
            const sel = avatarId === a.id;
            const color = softTeamColor(a.id);
            return (
              <button
                key={a.id}
                onClick={() => !taken && setAvatarId(a.id)}
                disabled={taken}
                aria-pressed={sel}
                aria-label={qqAvatarLabel(a.id, 'de')}
                style={{
                  position: 'relative',
                  padding: 6, borderRadius: 14,
                  background: sel ? `${color}26` : `${PALETTE.cream}88`,
                  border: `2px solid ${sel ? color : `${PALETTE.inkSoft}33`}`,
                  cursor: taken ? 'not-allowed' : 'pointer',
                  opacity: taken ? 0.35 : 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  fontFamily: 'inherit',
                  transition: 'all 0.18s ease',
                  boxShadow: sel ? `0 6px 18px ${color}66` : 'none',
                }}
              >
                <PaintedAvatar slug={a.slug} size={56} color={color} withGrain={false} />
                <div style={{
                  fontFamily: F_HAND, fontSize: 16, color: PALETTE.inkDeep, lineHeight: 1,
                  fontWeight: 700,
                }}>
                  {qqAvatarLabel(a.id, 'de')}
                </div>
                {taken && (
                  <div style={{
                    position: 'absolute', top: 4, right: 4,
                    padding: '2px 6px', borderRadius: 999,
                    fontFamily: F_BODY, fontSize: 9, fontWeight: 700,
                    background: PALETTE.inkDeep, color: PALETTE.cream,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>
                    vergeben
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </PaperCard>

      <PaperCard washColor={PALETTE.cream} padding={20}>
        <SectionHeading n="02" title="Team-Name" sub="Wie sollen wir euch rufen?" />
        <input
          type="text"
          value={teamName}
          onChange={e => setTeamName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && canJoin) onJoin(); }}
          placeholder="z.B. Die Wilden"
          autoComplete="off"
          maxLength={24}
          style={{
            width: '100%', boxSizing: 'border-box', marginTop: 14,
            padding: '14px 16px', borderRadius: 12,
            border: `2px solid ${teamName ? myColor : `${PALETTE.inkSoft}55`}`,
            background: PALETTE.cream,
            fontFamily: F_HAND, fontSize: 26, color: PALETTE.inkDeep,
            outline: 'none', transition: 'all 0.2s',
            boxShadow: teamName ? `0 4px 14px ${myColor}33` : 'none',
          }}
        />
        {error && (
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 10,
            background: `${PALETTE.terracotta}22`, color: PALETTE.terracotta,
            fontFamily: F_BODY, fontSize: 13, fontWeight: 600,
          }}>
            {error}
          </div>
        )}
        <button
          onClick={onJoin}
          disabled={!canJoin}
          style={{
            width: '100%', marginTop: 16,
            padding: '14px 20px', borderRadius: 999,
            background: canJoin ? PALETTE.terracotta : `${PALETTE.terracotta}55`,
            color: PALETTE.cream,
            border: 'none', cursor: canJoin ? 'pointer' : 'not-allowed',
            fontFamily: F_HAND, fontSize: 26, fontWeight: 700,
            letterSpacing: '0.02em',
            boxShadow: canJoin ? '0 8px 22px rgba(224,122,95,0.42), inset 0 -3px 0 rgba(0,0,0,0.12)' : 'none',
            filter: canJoin ? 'url(#paintFrame)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {connected ? 'Spiel beitreten' : 'Verbinde …'}
        </button>
      </PaperCard>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// In-Game Router
// ─────────────────────────────────────────────────────────────────────────────

function GameRouter({
  state, myTeam, myTeamId, emit, roomCode,
}: {
  state: QQStateUpdate; myTeam: QQTeam; myTeamId: string;
  emit: any; roomCode: string;
}) {
  const phase = state.phase;
  if (phase === 'LOBBY')          return <LobbyWaitCard state={state} myTeam={myTeam} />;
  if (phase === 'GAME_OVER')      return <GameOverCard state={state} myTeam={myTeam} />;
  if (phase === 'QUESTION_ACTIVE') return <ActiveQuestionCard state={state} myTeam={myTeam} myTeamId={myTeamId} emit={emit} roomCode={roomCode} />;
  if (phase === 'QUESTION_REVEAL') return <RevealCard state={state} myTeam={myTeam} myTeamId={myTeamId} />;
  if (phase === 'PLACEMENT')       return <PlacementInteractionCard state={state} myTeam={myTeam} myTeamId={myTeamId} emit={emit} roomCode={roomCode} />;
  if (phase === 'COMEBACK_CHOICE') return <ComebackInteractionCard state={state} myTeam={myTeam} myTeamId={myTeamId} emit={emit} roomCode={roomCode} />;
  return <WaitingPhaseCard state={state} myTeam={myTeam} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Connecting / Rejoin / Lobby Wait
// ─────────────────────────────────────────────────────────────────────────────

function ConnectingCard({ connected }: { connected: boolean }) {
  return (
    <PaperCard washColor={PALETTE.cream} padding={28}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: F_HAND, fontSize: 32, color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1.05 }}>
          {connected ? 'Lade Spielzustand …' : 'Suche Verbindung …'}
        </div>
        <div style={{ fontFamily: F_BODY, fontSize: 14, color: PALETTE.inkSoft, marginTop: 12, fontStyle: 'italic' }}>
          Bei einem frisch aufwachenden Server kann das einen Moment dauern.
        </div>
      </div>
    </PaperCard>
  );
}

function RejoinFailCard({ onClear }: { onClear: () => void }) {
  return (
    <PaperCard washColor={PALETTE.cream} padding={24}>
      <div style={{ fontFamily: F_HAND, fontSize: 28, color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1.1 }}>
        Dein Team ist nicht mehr im Spiel
      </div>
      <div style={{ fontFamily: F_BODY, fontSize: 14, color: PALETTE.inkSoft, marginTop: 10, fontStyle: 'italic' }}>
        Wahrscheinlich wurde die Lobby zurückgesetzt. Tippe unten, um neu beizutreten.
      </div>
      <button
        onClick={onClear}
        style={{
          marginTop: 18, padding: '12px 18px', borderRadius: 999,
          background: PALETTE.terracotta, color: PALETTE.cream,
          border: 'none', cursor: 'pointer',
          fontFamily: F_HAND, fontSize: 22, fontWeight: 700,
          boxShadow: '0 6px 18px rgba(224,122,95,0.4)',
        }}
      >
        Neu beitreten
      </button>
    </PaperCard>
  );
}

function LobbyWaitCard({ state, myTeam }: { state: QQStateUpdate; myTeam: QQTeam }) {
  const teamCount = state.teams.length;
  const ready = teamCount >= 2;
  const myColor = softTeamColor(myTeam.avatarId);
  return (
    <PaperCard washColor={PALETTE.cream} padding={24}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'inline-block', position: 'relative' }}>
          <PaintedAvatar slug={qqGetAvatar(myTeam.avatarId).slug} size={108} color={myColor} withGrain={false} />
        </div>
        <div style={{
          fontFamily: F_BODY, fontSize: 11, letterSpacing: '0.24em',
          color: PALETTE.terracotta, fontWeight: 700, textTransform: 'uppercase',
          marginTop: 18,
        }}>
          {ready ? 'bereit · gleich geht’s los' : 'warteraum'}
        </div>
        <div style={{
          fontFamily: F_HAND, fontSize: 36, color: PALETTE.inkDeep,
          fontWeight: 700, lineHeight: 1.05, marginTop: 4,
        }}>
          {ready ? `Hallo, ${myTeam.name}!` : `Warte auf weitere Teams …`}
        </div>
        <div style={{
          fontFamily: F_BODY, fontSize: 14, color: PALETTE.inkSoft,
          marginTop: 10, fontStyle: 'italic',
        }}>
          {teamCount} {teamCount === 1 ? 'Team' : 'Teams'} im Raum.
        </div>
      </div>

      {/* Mit-Teams kleine Avatar-Reihe */}
      {state.teams.length > 1 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center',
          marginTop: 22, paddingTop: 18,
          borderTop: `1px dashed ${PALETTE.inkSoft}44`,
        }}>
          {state.teams.map(t => {
            const isMe = t.id === myTeam.id;
            const color = softTeamColor(t.avatarId);
            return (
              <div key={t.id} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                opacity: t.connected ? 1 : 0.45,
              }}>
                <PaintedAvatar slug={qqGetAvatar(t.avatarId).slug} size={42} color={color} withGrain={false} />
                <div style={{
                  fontFamily: F_BODY, fontSize: 10,
                  color: isMe ? color : PALETTE.inkSoft, fontWeight: isMe ? 700 : 500,
                  maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }} title={t.name}>
                  {t.name}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PaperCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Question Active
// ─────────────────────────────────────────────────────────────────────────────

function ActiveQuestionCard({
  state, myTeam, myTeamId, emit, roomCode,
}: {
  state: QQStateUpdate; myTeam: QQTeam; myTeamId: string;
  emit: any; roomCode: string;
}) {
  const q = state.currentQuestion;
  const myAnswer = state.answers.find(a => a.teamId === myTeamId);
  const myColor = softTeamColor(myTeam.avatarId);

  if (!q) {
    return <NeutralCard title="Bereit machen …" body="Die Frage wird gleich gestellt." />;
  }

  if (myAnswer) {
    return <SubmittedCard text={myAnswer.text} state={state} question={q} />;
  }

  async function submitText(text: string) {
    if (!text.trim()) return;
    if (navigator.vibrate) navigator.vibrate(40);
    await emit('qq:submitAnswer', { roomCode, teamId: myTeamId, answer: text.trim() });
  }

  if (q.category === 'SCHAETZCHEN') {
    return <SchaetzchenCard q={q} onSubmit={submitText} myColor={myColor} />;
  }
  if (q.category === 'MUCHO') {
    return <MuchoCard q={q} onSubmit={submitText} myColor={myColor} />;
  }
  if (q.category === 'CHEESE') {
    return <CheeseCard q={q} onSubmit={submitText} myColor={myColor} />;
  }
  if (q.category === 'ZEHN_VON_ZEHN') {
    return <AllInCard q={q} onSubmit={submitText} myColor={myColor} />;
  }
  if (q.category === 'BUNTE_TUETE') {
    const kind = q.bunteTuete?.kind;
    if (kind === 'top5') {
      return <Top5Card q={q} onSubmit={submitText} myColor={myColor} />;
    }
    if (kind === 'order') {
      return <FixItCard q={q} onSubmit={submitText} myColor={myColor} />;
    }
    if (kind === 'oneOfEight') {
      return <ImposterCard q={q} state={state} myTeamId={myTeamId} emit={emit} roomCode={roomCode} myColor={myColor} />;
    }
    if (kind === 'hotPotato') {
      return <HotPotatoCard q={q} state={state} myTeamId={myTeamId} emit={emit} roomCode={roomCode} myColor={myColor} />;
    }
    if (kind === 'map') {
      return <PinItCard q={q} onSubmit={submitText} myColor={myColor} />;
    }
  }
  return <UnsupportedCategoryCard q={q} />;
}

function QuestionTopline({ q, color }: { q: QQQuestion; color: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      marginBottom: 12, gap: 8, flexWrap: 'wrap',
    }}>
      <div style={{
        fontFamily: F_BODY, fontSize: 11, letterSpacing: '0.22em',
        color: color, fontWeight: 700, textTransform: 'uppercase',
      }}>
        {q.category} · Frage {q.questionIndexInPhase + 1} / 5
      </div>
      <div style={{
        fontFamily: F_BODY, fontSize: 11, color: PALETTE.inkSoft, fontStyle: 'italic',
      }}>
        Phase {q.phaseIndex}
      </div>
    </div>
  );
}

function QuestionText({ text, sub }: { text: string; sub?: string }) {
  return (
    <>
      <div style={{
        fontFamily: F_HAND, fontSize: 'clamp(28px, 7vw, 38px)',
        color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1.1,
      }}>
        {text}
      </div>
      {sub && (
        <div style={{
          fontFamily: F_BODY, fontSize: 14, color: PALETTE.inkSoft,
          marginTop: 6, fontStyle: 'italic',
        }}>
          {sub}
        </div>
      )}
    </>
  );
}

function SchaetzchenCard({ q, onSubmit, myColor }: { q: QQQuestion; onSubmit: (s: string) => Promise<void>; myColor: string }) {
  const [val, setVal] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => ref.current?.focus({ preventScroll: true }), 80); }, []);
  const canSubmit = val.trim().length > 0 && !isNaN(Number(val));
  return (
    <PaperCard washColor={PALETTE.cream} padding={20}>
      <QuestionTopline q={q} color={PALETTE.terracotta} />
      <QuestionText text={q.text} sub={q.unit ? `in ${q.unit}` : undefined} />
      <input
        ref={ref}
        type="number"
        inputMode="decimal"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && canSubmit) onSubmit(val); }}
        placeholder="Deine Schätzung"
        style={{
          width: '100%', boxSizing: 'border-box', marginTop: 18,
          padding: '14px 16px', borderRadius: 12,
          border: `2px solid ${val ? myColor : `${PALETTE.inkSoft}55`}`,
          background: PALETTE.cream,
          fontFamily: F_HAND, fontSize: 32, color: PALETTE.inkDeep,
          outline: 'none', textAlign: 'center',
          boxShadow: val ? `0 4px 14px ${myColor}33` : 'none',
        }}
      />
      <SubmitButton disabled={!canSubmit} myColor={myColor} onClick={() => onSubmit(val)}>
        Schätzung abschicken
      </SubmitButton>
    </PaperCard>
  );
}

function MuchoCard({ q, onSubmit, myColor }: { q: QQQuestion; onSubmit: (s: string) => Promise<void>; myColor: string }) {
  const [pickIdx, setPickIdx] = useState<number | null>(null);
  const opts = q.options ?? [];
  const letters = ['A', 'B', 'C', 'D'];
  // Wir feuern die Antwort beim Tippen direkt ab — UX-Pattern wie auf der
  // produktiven Page (kein zweiter Klick nötig).
  async function pick(i: number) {
    if (pickIdx !== null) return;
    setPickIdx(i);
    if (navigator.vibrate) navigator.vibrate(30);
    await onSubmit(String(i));
  }
  return (
    <PaperCard washColor={PALETTE.cream} padding={20}>
      <QuestionTopline q={q} color={PALETTE.terracotta} />
      <QuestionText text={q.text} />
      <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
        {opts.map((opt, i) => {
          const sel = pickIdx === i;
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={pickIdx !== null}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', borderRadius: 14,
                background: sel ? `${myColor}26` : `${PALETTE.cream}d0`,
                border: `2px solid ${sel ? myColor : `${PALETTE.inkSoft}33`}`,
                cursor: pickIdx !== null ? 'default' : 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
                transition: 'all 0.2s',
                boxShadow: sel ? `0 6px 18px ${myColor}55` : 'none',
                opacity: pickIdx !== null && !sel ? 0.45 : 1,
              }}
            >
              <span style={{
                width: 36, height: 36, borderRadius: '50%',
                background: sel ? myColor : `${PALETTE.inkDeep}eb`,
                color: PALETTE.cream,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: F_HAND, fontSize: 22, fontWeight: 700,
                flexShrink: 0,
              }}>
                {letters[i] ?? i + 1}
              </span>
              <span style={{
                fontFamily: F_HAND, fontSize: 22, color: PALETTE.inkDeep,
                lineHeight: 1.15, fontWeight: 700,
              }}>
                {opt}
              </span>
            </button>
          );
        })}
      </div>
    </PaperCard>
  );
}

function CheeseCard({ q, onSubmit, myColor }: { q: QQQuestion; onSubmit: (s: string) => Promise<void>; myColor: string }) {
  const [val, setVal] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => ref.current?.focus({ preventScroll: true }), 80); }, []);
  const canSubmit = val.trim().length > 0;
  return (
    <PaperCard washColor={PALETTE.cream} padding={20}>
      <QuestionTopline q={q} color={PALETTE.terracotta} />
      <QuestionText text={q.text} />
      <input
        ref={ref}
        type="text"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && canSubmit) onSubmit(val); }}
        placeholder="Antwort eingeben …"
        autoComplete="off"
        style={{
          width: '100%', boxSizing: 'border-box', marginTop: 18,
          padding: '14px 16px', borderRadius: 12,
          border: `2px solid ${val ? myColor : `${PALETTE.inkSoft}55`}`,
          background: PALETTE.cream,
          fontFamily: F_HAND, fontSize: 26, color: PALETTE.inkDeep,
          outline: 'none',
          boxShadow: val ? `0 4px 14px ${myColor}33` : 'none',
        }}
      />
      <SubmitButton disabled={!canSubmit} myColor={myColor} onClick={() => onSubmit(val)}>
        Antwort abschicken
      </SubmitButton>
    </PaperCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Top5 — free text input (gleicher Submit-Pfad wie Schätzchen)
// ─────────────────────────────────────────────────────────────────────────
function Top5Card({ q, onSubmit, myColor }: { q: QQQuestion; onSubmit: (s: string) => Promise<void>; myColor: string }) {
  const [val, setVal] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => ref.current?.focus({ preventScroll: true }), 80); }, []);
  const canSubmit = val.trim().length > 0;
  return (
    <PaperCard washColor={PALETTE.cream} padding={20}>
      <QuestionTopline q={q} color={PALETTE.terracotta} />
      <QuestionText text={q.text} sub="🏆 Top 5 — eine Antwort reicht" />
      <input
        ref={ref}
        type="text"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && canSubmit) onSubmit(val); }}
        placeholder="Deine Antwort"
        autoComplete="off"
        style={{
          width: '100%', boxSizing: 'border-box', marginTop: 18,
          padding: '14px 16px', borderRadius: 12,
          border: `2px solid ${val ? myColor : `${PALETTE.inkSoft}55`}`,
          background: PALETTE.cream,
          fontFamily: F_HAND, fontSize: 26, color: PALETTE.inkDeep,
          outline: 'none',
          boxShadow: val ? `0 4px 14px ${myColor}33` : 'none',
        }}
      />
      <SubmitButton disabled={!canSubmit} myColor={myColor} onClick={() => onSubmit(val)}>
        Antwort abschicken
      </SubmitButton>
    </PaperCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// AllIn (10 von 10) — verteile 10 Punkte auf 3 Optionen
// Submit-Format: "p1,p2,p3"
// ─────────────────────────────────────────────────────────────────────────
function AllInCard({ q, onSubmit, myColor }: { q: QQQuestion; onSubmit: (s: string) => Promise<void>; myColor: string }) {
  const opts = q.options ?? [];
  const [pts, setPts] = useState<number[]>(() => opts.map(() => 0));
  const total = pts.reduce((s, p) => s + p, 0);
  const remaining = 10 - total;
  const canSubmit = total === 10;
  function adjust(i: number, delta: number) {
    setPts(prev => {
      const next = [...prev];
      const newVal = Math.max(0, Math.min(10, next[i] + delta));
      const otherSum = next.reduce((s, p, j) => j === i ? s : s + p, 0);
      if (newVal + otherSum > 10) return prev;
      next[i] = newVal;
      return next;
    });
  }
  return (
    <PaperCard washColor={PALETTE.cream} padding={20}>
      <QuestionTopline q={q} color={PALETTE.terracotta} />
      <QuestionText text={q.text} sub="🎰 Verteile 10 Punkte" />
      <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
        {opts.map((opt, i) => (
          <div key={i} style={{
            padding: '12px 14px', borderRadius: 14,
            background: pts[i] > 0 ? `${myColor}1f` : `${PALETTE.cream}d0`,
            border: `2px solid ${pts[i] > 0 ? myColor : `${PALETTE.inkSoft}33`}`,
            display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto',
            alignItems: 'center', gap: 10,
          }}>
            <span style={{
              width: 32, height: 32, borderRadius: '50%',
              background: PALETTE.inkDeep, color: PALETTE.cream,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: F_HAND, fontSize: 18, fontWeight: 700, flexShrink: 0,
            }}>
              {i + 1}
            </span>
            <span style={{
              fontFamily: F_HAND, fontSize: 18, color: PALETTE.inkDeep, lineHeight: 1.2, fontWeight: 700,
            }}>
              {opt}
            </span>
            <button onClick={() => adjust(i, -1)} disabled={pts[i] === 0} style={tinyBtn(myColor, pts[i] === 0)}>−</button>
            <span style={{
              fontFamily: F_HAND, fontSize: 26, color: myColor, fontWeight: 700, minWidth: 32, textAlign: 'center',
            }}>
              {pts[i]}
            </span>
            <button onClick={() => adjust(i, +1)} disabled={remaining === 0} style={tinyBtn(myColor, remaining === 0)}>+</button>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 12, padding: '6px 14px', borderRadius: 999,
        background: canSubmit ? `${PALETTE.sage}26` : `${PALETTE.ochre}22`,
        border: `1.5px solid ${canSubmit ? PALETTE.sage : PALETTE.ochre}88`,
        fontFamily: F_BODY, fontSize: 13, color: PALETTE.inkDeep, textAlign: 'center',
      }}>
        {canSubmit ? '10 / 10 verteilt' : `Noch ${remaining} Punkte verteilen`}
      </div>
      <SubmitButton disabled={!canSubmit} myColor={myColor} onClick={() => onSubmit(pts.join(','))}>
        Wette abschicken
      </SubmitButton>
    </PaperCard>
  );
}

function tinyBtn(color: string, disabled: boolean): React.CSSProperties {
  return {
    width: 36, height: 36, borderRadius: 10,
    background: disabled ? `${PALETTE.inkSoft}22` : color,
    color: disabled ? PALETTE.inkSoft : PALETTE.cream,
    border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: F_HAND, fontSize: 22, fontWeight: 700,
    flexShrink: 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Imposter (oneOfEight) — tap auf eine der 8 Aussagen
// Eigener Socket-Event: qq:imposterChoose
// ─────────────────────────────────────────────────────────────────────────
function ImposterCard({ q, state, myTeamId, emit, roomCode, myColor }: {
  q: QQQuestion; state: QQStateUpdate; myTeamId: string; emit: any; roomCode: string; myColor: string;
}) {
  const bt = q.bunteTuete as any;
  const statements: string[] = bt?.statements ?? [];
  const chosen = new Set(state.imposterChosenIndices ?? []);
  const eliminated = (state.imposterEliminated ?? []).includes(myTeamId);
  const isMyTurn = state.imposterActiveTeamId === myTeamId;
  const activeName = state.imposterActiveTeamId
    ? state.teams.find(t => t.id === state.imposterActiveTeamId)?.name : null;

  if (eliminated) {
    return (
      <PaperCard washColor={PALETTE.cream} padding={24}>
        <div style={{ textAlign: 'center' }}>
          <BlockCapsHeading size="md" color={PALETTE.terracotta}>Du bist raus</BlockCapsHeading>
          <div style={{ fontFamily: F_BODY, fontSize: 14, color: PALETTE.inkSoft, marginTop: 12, fontStyle: 'italic' }}>
            Falsche Aussage erwischt. Schau auf den Beamer wer als nächstes dran ist.
          </div>
        </div>
      </PaperCard>
    );
  }

  async function pick(i: number) {
    if (!isMyTurn) return;
    if (navigator.vibrate) navigator.vibrate(30);
    await emit('qq:imposterChoose', { roomCode, teamId: myTeamId, statementIndex: i });
  }

  return (
    <PaperCard washColor={PALETTE.cream} padding={20}>
      <QuestionTopline q={q} color={PALETTE.terracotta} />
      <QuestionText text={q.text} sub="🕵️ Welche Aussage ist falsch?" />
      {!isMyTurn && (
        <div style={{
          marginTop: 14, padding: '10px 14px', borderRadius: 12,
          background: `${PALETTE.ochre}22`, border: `1.5px dashed ${PALETTE.ochre}`,
          fontFamily: F_BODY, fontSize: 14, color: PALETTE.inkDeep, textAlign: 'center',
        }}>
          {activeName ? `${activeName} wählt gerade …` : 'Warte auf das nächste Team …'}
        </div>
      )}
      <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
        {statements.map((s, i) => {
          const wasChosen = chosen.has(i);
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={!isMyTurn || wasChosen}
              style={{
                display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 12,
                background: wasChosen ? `${PALETTE.inkSoft}22` : `${PALETTE.cream}d0`,
                border: `2px solid ${wasChosen ? PALETTE.inkSoft : (isMyTurn ? myColor + '88' : PALETTE.inkSoft + '33')}`,
                cursor: isMyTurn && !wasChosen ? 'pointer' : 'not-allowed',
                opacity: wasChosen ? 0.5 : 1,
                fontFamily: 'inherit', textAlign: 'left',
              }}
            >
              <span style={{
                width: 28, height: 28, borderRadius: '50%',
                background: PALETTE.inkDeep, color: PALETTE.cream,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: F_HAND, fontSize: 16, fontWeight: 700,
              }}>{i + 1}</span>
              <span style={{ fontFamily: F_HAND, fontSize: 18, color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1.15 }}>
                {s}
              </span>
            </button>
          );
        })}
      </div>
    </PaperCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// HotPotato — Round-Robin: nur active-Team eingibt; eigener Event
// ─────────────────────────────────────────────────────────────────────────
function HotPotatoCard({ q, state, myTeamId, emit, roomCode, myColor }: {
  q: QQQuestion; state: QQStateUpdate; myTeamId: string; emit: any; roomCode: string; myColor: string;
}) {
  const isMyTurn = state.hotPotatoActiveTeamId === myTeamId;
  const eliminated = state.hotPotatoEliminated.includes(myTeamId);
  const activeName = state.hotPotatoActiveTeamId
    ? state.teams.find(t => t.id === state.hotPotatoActiveTeamId)?.name : null;
  const [val, setVal] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const [secs, setSecs] = useState<number | null>(null);
  useEffect(() => {
    if (!state.hotPotatoTurnEndsAt) { setSecs(null); return; }
    const tick = () => setSecs(Math.max(0, Math.ceil((state.hotPotatoTurnEndsAt! - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [state.hotPotatoTurnEndsAt]);
  useEffect(() => {
    if (isMyTurn && !eliminated) setTimeout(() => ref.current?.focus({ preventScroll: true }), 80);
  }, [isMyTurn, eliminated]);

  if (eliminated) {
    return (
      <PaperCard washColor={PALETTE.cream} padding={24}>
        <div style={{ textAlign: 'center' }}>
          <BlockCapsHeading size="md" color={PALETTE.terracotta}>Du bist raus</BlockCapsHeading>
          <div style={{ fontFamily: F_BODY, fontSize: 14, color: PALETTE.inkSoft, marginTop: 12, fontStyle: 'italic' }}>
            Schau auf den Beamer — vielleicht ist beim nächsten Mal wieder Glück dabei.
          </div>
        </div>
      </PaperCard>
    );
  }

  async function submit() {
    if (!val.trim() || !isMyTurn) return;
    if (navigator.vibrate) navigator.vibrate(40);
    await emit('qq:hotPotatoAnswer', { roomCode, teamId: myTeamId, answer: val.trim() });
    setVal('');
    setTimeout(() => ref.current?.focus({ preventScroll: true }), 60);
  }

  return (
    <PaperCard washColor={PALETTE.cream} padding={20}>
      <QuestionTopline q={q} color={PALETTE.terracotta} />
      <QuestionText text={q.text} sub="🥔 Heiße Kartoffel" />
      {!isMyTurn ? (
        <div style={{
          marginTop: 18, padding: '14px 16px', borderRadius: 12,
          background: `${PALETTE.ochre}22`, border: `1.5px dashed ${PALETTE.ochre}`,
          fontFamily: F_BODY, fontSize: 14, color: PALETTE.inkDeep, textAlign: 'center',
        }}>
          {activeName ? `${activeName} ist dran …` : 'Warte auf den Start …'}
        </div>
      ) : (
        <>
          {secs !== null && (
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <span style={{
                fontFamily: F_HAND, fontSize: 36, fontWeight: 700,
                color: secs <= 5 ? PALETTE.terracotta : PALETTE.inkDeep,
                animation: secs <= 5 ? 'gTwinkle 0.6s ease-in-out infinite' : undefined,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {secs}s
              </span>
            </div>
          )}
          <input
            ref={ref}
            type="text"
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && val.trim()) submit(); }}
            placeholder="Deine Antwort"
            autoComplete="off"
            style={{
              width: '100%', boxSizing: 'border-box', marginTop: 12,
              padding: '14px 16px', borderRadius: 12,
              border: `2px solid ${val ? myColor : `${PALETTE.inkSoft}55`}`,
              background: PALETTE.cream,
              fontFamily: F_HAND, fontSize: 24, color: PALETTE.inkDeep,
              outline: 'none',
              boxShadow: val ? `0 4px 14px ${myColor}33` : 'none',
            }}
          />
          <SubmitButton disabled={!val.trim()} myColor={myColor} onClick={submit}>
            Schnell — abschicken!
          </SubmitButton>
        </>
      )}
    </PaperCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// FixIt (Order) — Items in korrekte Reihenfolge bringen via Up/Down-Buttons
// Submit: indices als Komma-String
// ─────────────────────────────────────────────────────────────────────────
function FixItCard({ q, onSubmit, myColor }: { q: QQQuestion; onSubmit: (s: string) => Promise<void>; myColor: string }) {
  const bt = q.bunteTuete as any;
  const items: string[] = bt?.items ?? [];
  const [order, setOrder] = useState<number[]>(() => items.map((_, i) => i));
  function move(idx: number, delta: number) {
    const target = idx + delta;
    if (target < 0 || target >= order.length) return;
    setOrder(prev => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }
  return (
    <PaperCard washColor={PALETTE.cream} padding={20}>
      <QuestionTopline q={q} color={PALETTE.terracotta} />
      <QuestionText text={q.text} sub={bt?.criteria ? `🔀 ${bt.criteria}` : '🔀 Reihenfolge bringen'} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        {order.map((origIdx, i) => (
          <div key={origIdx} style={{
            display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 12,
            background: `${PALETTE.cream}d0`,
            border: `2px solid ${myColor}55`,
          }}>
            <span style={{
              width: 32, height: 32, borderRadius: '50%',
              background: PALETTE.inkDeep, color: PALETTE.cream,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: F_HAND, fontSize: 18, fontWeight: 700, flexShrink: 0,
            }}>
              {i + 1}
            </span>
            <span style={{
              fontFamily: F_HAND, fontSize: 18, color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1.15,
            }}>
              {items[origIdx]}
            </span>
            <button onClick={() => move(i, -1)} disabled={i === 0} style={tinyBtn(myColor, i === 0)}>↑</button>
            <button onClick={() => move(i, +1)} disabled={i === order.length - 1} style={tinyBtn(myColor, i === order.length - 1)}>↓</button>
          </div>
        ))}
      </div>
      <SubmitButton disabled={false} myColor={myColor} onClick={() => onSubmit(order.join(','))}>
        Reihenfolge abschicken
      </SubmitButton>
    </PaperCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PinIt (Map) — Lat/Lng-Eingabe via simple Leaflet-Map (Tap auf Karte)
// Submit-Format: "lat,lng"
// ─────────────────────────────────────────────────────────────────────────
function PinItCard({ q, onSubmit, myColor }: { q: QQQuestion; onSubmit: (s: string) => Promise<void>; myColor: string }) {
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  return (
    <PaperCard washColor={PALETTE.cream} padding={20}>
      <QuestionTopline q={q} color={PALETTE.terracotta} />
      <QuestionText text={q.text} sub="📍 Tippe auf die Karte" />
      <div style={{ marginTop: 14 }}>
        <PinItMap onPick={setPin} pin={pin} />
      </div>
      {pin && (
        <div style={{
          marginTop: 10, padding: '6px 12px', borderRadius: 999,
          background: `${myColor}22`, border: `1.5px solid ${myColor}88`,
          fontFamily: 'ui-monospace, monospace', fontSize: 13,
          color: PALETTE.inkDeep, textAlign: 'center',
        }}>
          {pin.lat.toFixed(3)}, {pin.lng.toFixed(3)}
        </div>
      )}
      <SubmitButton disabled={!pin} myColor={myColor}
        onClick={() => pin && onSubmit(`${pin.lat},${pin.lng}`)}>
        Pin abschicken
      </SubmitButton>
    </PaperCard>
  );
}

function PinItMap({ onPick, pin }: { onPick: (p: { lat: number; lng: number }) => void; pin: { lat: number; lng: number } | null }) {
  // Leaflet dynamisch importieren um Bundle-Size zu sparen
  const [mods, setMods] = useState<{ MapContainer: any; TileLayer: any; Marker: any; useMapEvents: any; L: any } | null>(null);
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import('react-leaflet'),
      import('leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(([rl, leaflet]) => {
      if (cancelled) return;
      const L = leaflet.default;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      setMods({ MapContainer: rl.MapContainer, TileLayer: rl.TileLayer, Marker: rl.Marker, useMapEvents: rl.useMapEvents, L });
    });
    return () => { cancelled = true; };
  }, []);

  if (!mods) {
    return (
      <div style={{
        height: 280, borderRadius: 12,
        background: `${PALETTE.inkSoft}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: F_BODY, fontSize: 13, color: PALETTE.inkSoft, fontStyle: 'italic',
      }}>
        Karte wird geladen …
      </div>
    );
  }
  const { MapContainer, TileLayer, Marker, useMapEvents } = mods;

  function ClickHandler() {
    useMapEvents({ click(e: any) { onPick({ lat: e.latlng.lat, lng: e.latlng.lng }); } });
    return null;
  }

  return (
    <div style={{
      height: 320, borderRadius: 14, overflow: 'hidden',
      border: `2px solid ${PALETTE.inkSoft}33`,
    }}>
      <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap' />
        <ClickHandler />
        {pin && <Marker position={[pin.lat, pin.lng]} />}
      </MapContainer>
    </div>
  );
}

function UnsupportedCategoryCard({ q }: { q: QQQuestion }) {
  return (
    <PaperCard washColor={PALETTE.cream} padding={20}>
      <QuestionTopline q={q} color={PALETTE.terracotta} />
      <QuestionText text={q.text} />
      <div style={{
        marginTop: 18, padding: '14px 16px', borderRadius: 12,
        background: `${PALETTE.ochre}22`, border: `1.5px dashed ${PALETTE.ochre}`,
        fontFamily: F_BODY, fontSize: 14, color: PALETTE.inkDeep, lineHeight: 1.5,
      }}>
        <div style={{ fontFamily: F_HAND, fontSize: 22, color: PALETTE.inkDeep, fontWeight: 700, marginBottom: 4 }}>
          Diese Kategorie ist im Aquarell-Test noch nicht da.
        </div>
        Öffne fix{' '}
        <Link to="/team" style={{ color: PALETTE.terracotta, fontWeight: 700, textDecoration: 'underline' }}>/team</Link>
        {' '}im Browser — dort kannst du diese Frage normal mitspielen.
      </div>
    </PaperCard>
  );
}

function SubmitButton({
  disabled, myColor, onClick, children,
}: { disabled: boolean; myColor: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', marginTop: 16,
        padding: '14px 20px', borderRadius: 999,
        background: disabled ? `${myColor}55` : myColor,
        color: PALETTE.cream,
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: F_HAND, fontSize: 24, fontWeight: 700,
        letterSpacing: '0.02em',
        boxShadow: disabled ? 'none' : `0 8px 22px ${myColor}66, inset 0 -3px 0 rgba(0,0,0,0.12)`,
        filter: disabled ? 'none' : 'url(#paintFrame)',
        transition: 'all 0.2s',
      }}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Submitted / Reveal / GameOver / Waiting
// ─────────────────────────────────────────────────────────────────────────────

function SubmittedCard({ text, state, question }: { text: string; state: QQStateUpdate; question: QQQuestion }) {
  const totalTeams = state.teams.length;
  const answered = state.answers.length;
  let displayText = text;
  if (question.category === 'MUCHO' && question.options) {
    const idx = parseInt(text, 10);
    if (!isNaN(idx) && question.options[idx]) {
      displayText = `${['A', 'B', 'C', 'D'][idx] ?? idx + 1}. ${question.options[idx]}`;
    }
  }
  return (
    <PaperCard washColor={PALETTE.cream} padding={24}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: F_BODY, fontSize: 11, letterSpacing: '0.24em',
          color: PALETTE.sage, fontWeight: 700, textTransform: 'uppercase',
        }}>
          ✓ abgegeben
        </div>
        <div style={{
          fontFamily: F_HAND, fontSize: 38, color: PALETTE.inkDeep,
          fontWeight: 700, lineHeight: 1.05, marginTop: 6,
        }}>
          {displayText}
        </div>
        <div style={{
          marginTop: 16, padding: '10px 16px',
          display: 'inline-block', borderRadius: 999,
          background: `${PALETTE.sage}26`, border: `1.5px solid ${PALETTE.sage}88`,
          fontFamily: F_BODY, fontSize: 13, color: PALETTE.inkDeep,
        }}>
          {answered} / {totalTeams} haben geantwortet
        </div>
        <div style={{
          fontFamily: F_BODY, fontSize: 13, color: PALETTE.inkSoft,
          marginTop: 14, fontStyle: 'italic',
        }}>
          Lehn dich zurück — der Beamer zeigt die Auflösung.
        </div>
      </div>
    </PaperCard>
  );
}

function RevealCard({ state, myTeam, myTeamId }: { state: QQStateUpdate; myTeam: QQTeam; myTeamId: string }) {
  const winners = state.currentQuestionWinners ?? (state.correctTeamId ? [state.correctTeamId] : []);
  const isWinner = winners.includes(myTeamId);
  const isFastest = winners[0] === myTeamId;
  const myColor = softTeamColor(myTeam.avatarId);
  const accent = isWinner ? PALETTE.sage : PALETTE.inkSoft;
  return (
    <PaperCard washColor={PALETTE.cream} padding={24}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: F_BODY, fontSize: 11, letterSpacing: '0.24em',
          color: accent, fontWeight: 700, textTransform: 'uppercase',
        }}>
          {isWinner ? (isFastest ? 'fast & richtig' : 'richtig') : 'auflösung'}
        </div>
        <div style={{
          fontFamily: F_HAND, fontSize: 40, color: PALETTE.inkDeep,
          fontWeight: 700, lineHeight: 1.05, marginTop: 6,
        }}>
          {isWinner ? (isFastest ? 'Du warst die schnellste Hand!' : 'Richtig getippt!') : 'Diesmal nicht ihr.'}
        </div>
        {state.revealedAnswer && (
          <div style={{
            marginTop: 18, padding: '12px 16px', borderRadius: 12,
            background: `${PALETTE.cream}d0`, border: `1.5px solid ${myColor}55`,
          }}>
            <div style={{ fontFamily: F_BODY, fontSize: 11, letterSpacing: '0.18em', color: PALETTE.inkSoft, textTransform: 'uppercase' }}>
              Lösung
            </div>
            <div style={{ fontFamily: F_HAND, fontSize: 30, color: PALETTE.inkDeep, fontWeight: 700, marginTop: 2 }}>
              {state.revealedAnswer}
            </div>
          </div>
        )}
        <div style={{
          fontFamily: F_BODY, fontSize: 13, color: PALETTE.inkSoft,
          marginTop: 18, fontStyle: 'italic',
        }}>
          {isWinner
            ? 'Gleich darfst du auf den Beamer schauen — ihr setzt ein Feld.'
            : 'Sammelt euch für die nächste Runde.'}
        </div>
      </div>
    </PaperCard>
  );
}

function GameOverCard({ state, myTeam }: { state: QQStateUpdate; myTeam: QQTeam }) {
  const sorted = [...state.teams].sort((a, b) => b.largestConnected - a.largestConnected || b.totalCells - a.totalCells);
  const winner = sorted[0];
  const iWon = winner?.id === myTeam.id;
  const myRank = sorted.findIndex(t => t.id === myTeam.id) + 1;
  const myColor = softTeamColor(myTeam.avatarId);
  return (
    <PaperCard washColor={PALETTE.cream} padding={24}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: F_BODY, fontSize: 11, letterSpacing: '0.32em',
          color: PALETTE.terracotta, fontWeight: 700, textTransform: 'uppercase',
        }}>
          spielende
        </div>
        <div style={{
          fontFamily: F_HAND, fontSize: 44, color: PALETTE.inkDeep,
          fontWeight: 700, lineHeight: 1.05, marginTop: 6,
        }}>
          {iWon ? 'Ihr habt gewonnen!' : winner ? `${winner.name} gewinnt.` : 'Schönes Spiel.'}
        </div>
        <div style={{
          marginTop: 18, padding: '12px 16px', borderRadius: 12,
          background: `${myColor}22`, border: `1.5px solid ${myColor}88`,
          display: 'inline-flex', alignItems: 'center', gap: 12,
        }}>
          <PaintedAvatar slug={qqGetAvatar(myTeam.avatarId).slug} size={56} color={myColor} withGrain={false} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: F_HAND, fontSize: 24, color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1 }}>
              Platz {myRank} für {myTeam.name}
            </div>
            <div style={{ fontFamily: F_BODY, fontSize: 12, color: PALETTE.inkSoft, marginTop: 2 }}>
              {myTeam.largestConnected} zusammenhängend · {myTeam.totalCells} Felder gesamt
            </div>
          </div>
        </div>
      </div>
    </PaperCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PLACEMENT Interaction — wenn pendingFor === me, tap-bares Mini-Grid
// + Action-Wahl. Sonst: read-only Grid mit "X wählt gerade …"-Header.
// ─────────────────────────────────────────────────────────────────────────

type FreeAction = 'place' | 'steal' | 'sandLock' | 'shield' | 'stapel';

function PlacementInteractionCard({
  state, myTeam, myTeamId, emit, roomCode,
}: {
  state: QQStateUpdate; myTeam: QQTeam; myTeamId: string; emit: any; roomCode: string;
}) {
  const myColor = softTeamColor(myTeam.avatarId);
  const isMyTurn = state.pendingFor === myTeamId;
  const action = state.pendingAction;
  const pendingTeam = state.pendingFor ? state.teams.find(t => t.id === state.pendingFor) : null;
  const [freeMode, setFreeMode] = useState<FreeAction | null>(null);

  // Reset freeMode bei pending-Wechsel
  useEffect(() => { if (!isMyTurn) setFreeMode(null); }, [isMyTurn, action]);

  if (!isMyTurn) {
    return (
      <PaperCard washColor={PALETTE.cream} padding={20}>
        <div style={{ textAlign: 'center' }}>
          <BlockCapsHeading size="md" color={PALETTE.terracotta}>
            Platzierung
          </BlockCapsHeading>
          <div style={{
            fontFamily: F_HAND, fontSize: 28, color: PALETTE.inkDeep,
            fontWeight: 700, marginTop: 6, lineHeight: 1.05,
          }}>
            {pendingTeam ? `${pendingTeam.name} ist dran` : 'Warte auf das nächste Team'}
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <MiniGrid state={state} myTeamId={myTeamId} onPick={null} mode="readonly" />
        </div>
      </PaperCard>
    );
  }

  // FREE-Action benötigt erst Wahl, sonst direkt Grid-Tap
  if (action === 'FREE' && !freeMode) {
    return (
      <FreeActionPicker state={state} myColor={myColor} onPick={setFreeMode} />
    );
  }

  const effectiveAction: FreeAction | null = (() => {
    if (action === 'PLACE_1' || action === 'PLACE_2') return 'place';
    if (action === 'STEAL_1') return 'steal';
    if (action === 'SANDUHR_1') return 'sandLock';
    if (action === 'SHIELD_1') return 'shield';
    if (action === 'STAPEL_1') return 'stapel';
    if (action === 'FREE') return freeMode;
    return null;
  })();

  if (action === 'SWAP_1') {
    return (
      <PaperCard washColor={PALETTE.cream} padding={20}>
        <div style={{ textAlign: 'center' }}>
          <BlockCapsHeading size="md" color={PALETTE.terracotta}>Tauschen</BlockCapsHeading>
          <div style={{ fontFamily: F_BODY, fontSize: 14, color: PALETTE.inkSoft, marginTop: 12, fontStyle: 'italic' }}>
            Diese Aktion (zwei Felder tauschen) läuft im Aquarell-Test noch nicht.
            Öffne kurz <a href="/team" style={{ color: PALETTE.terracotta, fontWeight: 700 }}>/team</a> dafür.
          </div>
        </div>
      </PaperCard>
    );
  }

  async function handlePick(r: number, c: number) {
    if (!effectiveAction) return;
    if (navigator.vibrate) navigator.vibrate(40);
    const evt: Record<FreeAction, string> = {
      place:    'qq:placeCell',
      steal:    'qq:stealCell',
      sandLock: 'qq:sandLockCell',
      shield:   'qq:shieldCell',
      stapel:   'qq:stapelCell',
    };
    await emit(evt[effectiveAction], { roomCode, teamId: myTeamId, row: r, col: c });
  }

  return (
    <PaperCard washColor={PALETTE.cream} padding={20}>
      <div style={{ textAlign: 'center' }}>
        <BlockCapsHeading size="md" color={myColor} glow>
          Du bist dran
        </BlockCapsHeading>
        <div style={{
          fontFamily: F_HAND, fontSize: 26, color: PALETTE.inkDeep,
          fontWeight: 700, marginTop: 6, lineHeight: 1.05,
        }}>
          {actionTitle(effectiveAction, action)}
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <MiniGrid
          state={state}
          myTeamId={myTeamId}
          onPick={handlePick}
          mode={effectiveAction}
        />
      </div>
      {action === 'FREE' && freeMode && (
        <button onClick={() => setFreeMode(null)} style={{
          width: '100%', marginTop: 12, padding: '10px 18px', borderRadius: 999,
          background: 'transparent', color: PALETTE.inkSoft,
          border: `1.5px solid ${PALETTE.inkSoft}66`, cursor: 'pointer',
          fontFamily: F_HAND, fontSize: 18, fontWeight: 700,
        }}>
          ← andere Aktion wählen
        </button>
      )}
    </PaperCard>
  );
}

function actionTitle(eff: FreeAction | null, raw: string | null): string {
  if (eff === 'place')    return raw === 'PLACE_2' ? '📍 Tippe auf 2 freie Felder' : '📍 Tippe auf ein freies Feld';
  if (eff === 'steal')    return '⚡ Tippe auf ein gegnerisches Feld';
  if (eff === 'sandLock') return '⏳ Bann: tippe ein Feld zum Sperren';
  if (eff === 'shield')   return '🛡 Schütze ein eigenes Feld';
  if (eff === 'stapel')   return '🪨 Stapeln: tippe ein eigenes Feld';
  return 'Wähle ein Feld';
}

function FreeActionPicker({ state, myColor, onPick }: {
  state: QQStateUpdate; myColor: string; onPick: (a: FreeAction) => void;
}) {
  const phase = state.gamePhaseIndex ?? 1;
  // Phase 3 typisch: place / steal / sanduhr ; Phase 4: steal / swap / stapel
  const opts: Array<{ key: FreeAction; emoji: string; label: string }> = phase >= 4
    ? [
      { key: 'steal',  emoji: '⚡', label: 'Klauen' },
      { key: 'stapel', emoji: '🪨', label: 'Stapeln' },
    ]
    : [
      { key: 'place',    emoji: '📍', label: 'Setzen' },
      { key: 'steal',    emoji: '⚡', label: 'Klauen' },
      { key: 'sandLock', emoji: '⏳', label: 'Bann' },
    ];
  return (
    <PaperCard washColor={PALETTE.cream} padding={20}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <BlockCapsHeading size="md" color={myColor} glow>Du bist dran</BlockCapsHeading>
        <div style={{
          fontFamily: F_HAND, fontSize: 24, color: PALETTE.inkDeep,
          fontWeight: 700, marginTop: 6, lineHeight: 1.1,
        }}>
          Wähle deine Aktion
        </div>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {opts.map(o => (
          <button key={o.key} onClick={() => onPick(o.key)} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 18px', borderRadius: 14,
            background: `${myColor}1f`, border: `2.5px solid ${myColor}88`,
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            boxShadow: `0 6px 18px ${myColor}33`,
          }}>
            <span style={{ fontSize: 32 }}>{o.emoji}</span>
            <span style={{
              fontFamily: F_HAND, fontSize: 24,
              color: PALETTE.inkDeep, fontWeight: 700,
            }}>
              {o.label}
            </span>
          </button>
        ))}
      </div>
    </PaperCard>
  );
}

// MiniGrid — kompakte Cell-Matrix für Phone (tap auf Feld)
function MiniGrid({
  state, myTeamId, onPick, mode,
}: {
  state: QQStateUpdate;
  myTeamId: string;
  onPick: ((r: number, c: number) => void) | null;
  mode: FreeAction | 'readonly' | null;
}) {
  const grid = state.grid;
  const size = state.gridSize;
  // Tap-Validation
  function canTap(cell: { row: number; col: number; ownerId: string | null; stuck?: boolean; shielded?: boolean; sandLockTtl?: number }): boolean {
    if (!onPick) return false;
    const isOwn = cell.ownerId === myTeamId;
    const isEmpty = cell.ownerId == null;
    const isOpp = !isEmpty && !isOwn;
    const locked = (cell.sandLockTtl ?? 0) > 0;
    if (locked) return false;
    if (mode === 'place')    return isEmpty;
    if (mode === 'steal')    return isOpp && !cell.shielded && !cell.stuck;
    if (mode === 'sandLock') return !isOwn && !cell.stuck && !cell.shielded;
    if (mode === 'shield')   return isOwn && !cell.shielded && !cell.stuck;
    if (mode === 'stapel')   return isOwn && !cell.stuck;
    return false;
  }
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${size}, 1fr)`,
      gap: 4, padding: 8, borderRadius: 14,
      background: `${PALETTE.inkSoft}11`,
      border: `1.5px dashed ${PALETTE.inkSoft}33`,
    }}>
      {grid.flat().map(cell => {
        const team = cell.ownerId ? state.teams.find(t => t.id === cell.ownerId) : null;
        const color = team ? softTeamColor(team.avatarId) : null;
        const tappable = canTap(cell);
        const isMine = cell.ownerId === myTeamId;
        return (
          <button
            key={`${cell.row}-${cell.col}`}
            onClick={() => tappable && onPick && onPick(cell.row, cell.col)}
            disabled={!tappable}
            style={{
              aspectRatio: '1 / 1',
              borderRadius: 8,
              background: color ? `${color}33` : `${PALETTE.cream}d0`,
              border: `2px solid ${
                tappable ? PALETTE.terracotta
                  : color ? color + 'aa' : PALETTE.inkSoft + '33'
              }`,
              cursor: tappable ? 'pointer' : 'default',
              animation: tappable ? 'gTwinkle 1.4s ease-in-out infinite' : undefined,
              padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
              fontFamily: F_HAND, fontSize: 12, fontWeight: 700,
              color: PALETTE.inkDeep,
            }}
            title={isMine ? 'mein Feld' : team?.name ?? 'leer'}
          >
            {team && (
              <span style={{
                width: '70%', height: '70%', borderRadius: '50%',
                background: `${color}aa`, opacity: cell.stuck ? 1 : 0.85,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: PALETTE.cream, fontSize: 10,
              }}>
                {team.name[0]?.toUpperCase()}
              </span>
            )}
            {cell.jokerFormed && (
              <span style={{
                position: 'absolute', top: 1, right: 2,
                color: PALETTE.amberGlow, fontSize: 10, lineHeight: 1,
                textShadow: `0 0 4px ${PALETTE.amberGlow}`,
              }}>★</span>
            )}
            {cell.stuck && (
              <span style={{
                position: 'absolute', bottom: 1, right: 2,
                fontSize: 8, color: PALETTE.inkDeep, fontWeight: 700,
              }}>×2</span>
            )}
            {(cell.sandLockTtl ?? 0) > 0 && (
              <span style={{ position: 'absolute', top: 1, left: 2, fontSize: 10 }}>⏳</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// COMEBACK_CHOICE — H/L-Game-Antwort (höher/tiefer) oder Aktion-Wahl
// ─────────────────────────────────────────────────────────────────────────

function ComebackInteractionCard({
  state, myTeam, myTeamId, emit, roomCode,
}: {
  state: QQStateUpdate; myTeam: QQTeam; myTeamId: string; emit: any; roomCode: string;
}) {
  const myColor = softTeamColor(myTeam.avatarId);
  const isCbTeam = state.comebackTeamId === myTeamId
    || (state.comebackHL?.teamIds ?? []).includes(myTeamId);

  if (!isCbTeam) {
    const cbTeam = state.comebackTeamId ? state.teams.find(t => t.id === state.comebackTeamId) : null;
    return (
      <PaperCard washColor={PALETTE.cream} padding={20}>
        <div style={{ textAlign: 'center' }}>
          <BlockCapsHeading size="md" color={PALETTE.terracotta}>Comeback läuft</BlockCapsHeading>
          <div style={{
            fontFamily: F_HAND, fontSize: 24, color: PALETTE.inkDeep,
            fontWeight: 700, marginTop: 8, lineHeight: 1.05,
          }}>
            {cbTeam ? `${cbTeam.name} bekommt eine zweite Chance` : 'Das letzte Team bekommt eine zweite Chance'}
          </div>
          <div style={{
            fontFamily: F_BODY, fontSize: 14, color: PALETTE.inkSoft,
            marginTop: 12, fontStyle: 'italic',
          }}>
            Schau auf den Beamer — gleich geht's weiter.
          </div>
        </div>
      </PaperCard>
    );
  }

  // H/L-Game aktiv
  if (state.comebackHL) {
    return <HLChoiceCard state={state} myTeamId={myTeamId} emit={emit} roomCode={roomCode} myColor={myColor} hl={state.comebackHL} />;
  }

  // Sonst: Action-Wahl (PLACE_2 / STEAL_1) — sehr selten in der Trinity-Mechanik
  return (
    <PaperCard washColor={PALETTE.cream} padding={20}>
      <div style={{ textAlign: 'center' }}>
        <BlockCapsHeading size="md" color={myColor} glow>Deine Comeback-Chance</BlockCapsHeading>
        <div style={{
          fontFamily: F_HAND, fontSize: 22, color: PALETTE.inkDeep,
          fontWeight: 700, marginTop: 8, lineHeight: 1.1,
        }}>
          Wähle deine Aktion
        </div>
      </div>
      <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
        <button onClick={async () => {
          if (navigator.vibrate) navigator.vibrate(40);
          await emit('qq:comebackChoice', { roomCode, teamId: myTeamId, action: 'PLACE_2' });
        }} style={comebackOptStyle(myColor)}>
          <span style={{ fontSize: 28 }}>📍</span>
          <span><strong style={{ fontFamily: F_HAND, fontSize: 22 }}>2 Felder setzen</strong>
            <div style={{ fontFamily: F_BODY, fontSize: 12, color: PALETTE.inkSoft, marginTop: 2 }}>
              Platziere 2 freie Felder
            </div>
          </span>
        </button>
        <button onClick={async () => {
          if (navigator.vibrate) navigator.vibrate(40);
          await emit('qq:comebackChoice', { roomCode, teamId: myTeamId, action: 'STEAL_1' });
        }} style={comebackOptStyle(myColor)}>
          <span style={{ fontSize: 28 }}>⚡</span>
          <span><strong style={{ fontFamily: F_HAND, fontSize: 22 }}>1 Feld klauen</strong>
            <div style={{ fontFamily: F_BODY, fontSize: 12, color: PALETTE.inkSoft, marginTop: 2 }}>
              Nimm ein fremdes Feld
            </div>
          </span>
        </button>
      </div>
    </PaperCard>
  );
}

function comebackOptStyle(color: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 18px', borderRadius: 14,
    background: `${color}1f`, border: `2.5px solid ${color}88`,
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
    color: PALETTE.inkDeep,
    boxShadow: `0 6px 18px ${color}33`,
  };
}

function HLChoiceCard({
  state, myTeamId, emit, roomCode, myColor, hl,
}: {
  state: QQStateUpdate; myTeamId: string; emit: any; roomCode: string;
  myColor: string;
  hl: NonNullable<QQStateUpdate['comebackHL']>;
}) {
  const pair = hl.currentPair;
  const myAns = hl.answers[myTeamId];
  const phase = hl.phase;
  const correctThis = hl.correctThisRound.includes(myTeamId);
  const wins = hl.winnings[myTeamId] ?? 0;
  const [secs, setSecs] = useState<number | null>(null);
  useEffect(() => {
    if (!hl.timerEndsAt) { setSecs(null); return; }
    const tick = () => setSecs(Math.max(0, Math.ceil((hl.timerEndsAt! - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [hl.timerEndsAt]);

  async function answer(choice: 'higher' | 'lower') {
    if (myAns) return;
    if (navigator.vibrate) navigator.vibrate(40);
    await emit('qq:comebackHLAnswer', { roomCode, teamId: myTeamId, choice });
  }

  return (
    <PaperCard washColor={PALETTE.cream} padding={20}>
      <div style={{ textAlign: 'center' }}>
        <BlockCapsHeading size="md" color={PALETTE.amberGlow} glow>Höher oder Tiefer</BlockCapsHeading>
        <div style={{
          fontFamily: F_BODY, fontSize: 12, letterSpacing: '0.18em',
          color: PALETTE.inkSoft, fontWeight: 700, textTransform: 'uppercase', marginTop: 6,
        }}>
          Runde {hl.round + 1} von {hl.rounds} {wins > 0 && ` · ⭐ ${wins}`}
        </div>
      </div>

      {pair && (
        <div style={{
          marginTop: 16, padding: '14px 16px', borderRadius: 14,
          background: `${PALETTE.cream}d0`,
          border: `2px solid ${PALETTE.inkSoft}33`,
          textAlign: 'center',
        }}>
          {pair.customQuestion ? (
            <div style={{
              fontFamily: F_HAND, fontSize: 22, color: PALETTE.inkDeep,
              fontWeight: 700, lineHeight: 1.1,
            }}>
              {pair.customQuestion}
            </div>
          ) : (
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center', gap: 10,
            }}>
              <div>
                <div style={{ fontFamily: F_HAND, fontSize: 18, color: PALETTE.inkDeep, fontWeight: 700 }}>
                  {pair.anchorLabel}
                </div>
                <div style={{ fontFamily: F_HAND, fontSize: 28, color: PALETTE.terracotta, fontWeight: 700 }}>
                  {pair.anchorValue.toLocaleString('de-DE')}
                </div>
                <div style={{ fontFamily: F_BODY, fontSize: 11, color: PALETTE.inkSoft }}>{pair.unit}</div>
              </div>
              <span style={{ fontFamily: F_HAND_CAPS, fontSize: 14, color: PALETTE.inkSoft, letterSpacing: '0.06em' }}>vs.</span>
              <div>
                <div style={{ fontFamily: F_HAND, fontSize: 18, color: PALETTE.inkDeep, fontWeight: 700 }}>
                  {pair.subjectLabel}
                </div>
                <div style={{
                  fontFamily: F_HAND, fontSize: 28,
                  color: phase === 'reveal' ? PALETTE.terracotta : PALETTE.inkSoft, fontWeight: 700,
                }}>
                  {phase === 'reveal' ? pair.subjectValue.toLocaleString('de-DE') : '???'}
                </div>
                <div style={{ fontFamily: F_BODY, fontSize: 11, color: PALETTE.inkSoft }}>{pair.unit}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {secs !== null && phase === 'question' && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <span style={{
            fontFamily: F_HAND, fontSize: 30, fontWeight: 700,
            color: secs <= 3 ? PALETTE.terracotta : PALETTE.inkDeep,
            animation: secs <= 3 ? 'gTwinkle 0.6s ease-in-out infinite' : undefined,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {secs}s
          </span>
        </div>
      )}

      {phase === 'question' && !myAns && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
          <button onClick={() => answer('higher')} style={hlBtnStyle(PALETTE.sage)}>↑ Höher</button>
          <button onClick={() => answer('lower')} style={hlBtnStyle(PALETTE.lavenderDusk)}>↓ Tiefer</button>
        </div>
      )}

      {myAns && phase === 'question' && (
        <div style={{
          marginTop: 14, padding: '10px 14px', borderRadius: 12,
          background: `${myColor}26`, border: `1.5px solid ${myColor}88`,
          textAlign: 'center', fontFamily: F_HAND, fontSize: 18, color: PALETTE.inkDeep, fontWeight: 700,
        }}>
          ✓ Du hast {myAns === 'higher' ? '↑ Höher' : '↓ Tiefer'} gewählt
        </div>
      )}

      {phase === 'reveal' && (
        <div style={{
          marginTop: 14, padding: '14px 16px', borderRadius: 12,
          background: correctThis ? `${PALETTE.sage}26` : `${PALETTE.terracotta}22`,
          border: `2px solid ${correctThis ? PALETTE.sage : PALETTE.terracotta}88`,
          textAlign: 'center',
        }}>
          <BlockCapsHeading size="md" color={correctThis ? PALETTE.sage : PALETTE.terracotta} glow={correctThis}>
            {correctThis ? 'Richtig!' : 'Daneben'}
          </BlockCapsHeading>
        </div>
      )}
    </PaperCard>
  );
}

function hlBtnStyle(color: string): React.CSSProperties {
  return {
    padding: '16px 18px', borderRadius: 14,
    background: color, color: PALETTE.cream,
    border: 'none', cursor: 'pointer',
    fontFamily: F_HAND, fontSize: 22, fontWeight: 700,
    boxShadow: `0 8px 22px ${color}66, inset 0 -3px 0 rgba(0,0,0,0.12)`,
    filter: 'url(#paintFrame)',
  };
}

function WaitingPhaseCard({ state, myTeam }: { state: QQStateUpdate; myTeam: QQTeam }) {
  const isPending = state.pendingFor === myTeam.id;
  return (
    <PaperCard washColor={PALETTE.cream} padding={24}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: F_BODY, fontSize: 11, letterSpacing: '0.24em',
          color: PALETTE.terracotta, fontWeight: 700, textTransform: 'uppercase',
        }}>
          {humanPhaseLabel(state.phase)}
        </div>
        <div style={{
          fontFamily: F_HAND, fontSize: 36, color: PALETTE.inkDeep,
          fontWeight: 700, lineHeight: 1.05, marginTop: 6,
        }}>
          {isPending ? 'Ihr seid dran!' : 'Schaut auf den Beamer'}
        </div>
        {isPending ? (
          <div style={{
            marginTop: 16, padding: '12px 14px', borderRadius: 12,
            background: `${PALETTE.terracotta}22`, border: `1.5px dashed ${PALETTE.terracotta}`,
            fontFamily: F_BODY, fontSize: 14, color: PALETTE.inkDeep,
          }}>
            Diese Phase (Feld setzen / klauen / stapeln) läuft im Aquarell-Test noch nicht.
            Tippt kurz auf <Link to="/team" style={{ color: PALETTE.terracotta, fontWeight: 700 }}>/team</Link> —
            der Cozy-Beamer-Pfad führt euch durch.
          </div>
        ) : (
          <div style={{
            fontFamily: F_BODY, fontSize: 14, color: PALETTE.inkSoft,
            marginTop: 12, fontStyle: 'italic',
          }}>
            Sobald die nächste Frage kommt, wacht das Phone wieder auf.
          </div>
        )}
      </div>
    </PaperCard>
  );
}

function NeutralCard({ title, body }: { title: string; body: string }) {
  return (
    <PaperCard washColor={PALETTE.cream} padding={24}>
      <div style={{ fontFamily: F_HAND, fontSize: 30, color: PALETTE.inkDeep, fontWeight: 700, lineHeight: 1.1 }}>
        {title}
      </div>
      <div style={{ fontFamily: F_BODY, fontSize: 14, color: PALETTE.inkSoft, marginTop: 8, fontStyle: 'italic' }}>
        {body}
      </div>
    </PaperCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeading({ n, title, sub }: { n: string; title: string; sub: string }) {
  return (
    <div>
      <div style={{
        fontFamily: F_BODY, fontSize: 10, letterSpacing: '0.22em',
        color: PALETTE.terracotta, fontWeight: 700, textTransform: 'uppercase',
      }}>
        Schritt {n}
      </div>
      <div style={{
        fontFamily: F_HAND, fontSize: 30, color: PALETTE.inkDeep,
        marginTop: 2, lineHeight: 1, fontWeight: 700,
      }}>
        {title}
      </div>
      <div style={{
        fontFamily: F_BODY, fontSize: 12, color: PALETTE.inkSoft,
        marginTop: 4, fontStyle: 'italic',
      }}>
        {sub}
      </div>
    </div>
  );
}

function humanPhaseLabel(phase: string): string {
  switch (phase) {
    case 'RULES':            return 'spielregeln';
    case 'TEAMS_REVEAL':     return 'team-vorstellung';
    case 'PHASE_INTRO':      return 'neue runde startet';
    case 'PLACEMENT':        return 'platzierung';
    case 'COMEBACK_CHOICE':  return 'comeback';
    case 'PAUSED':           return 'kurze pause';
    case 'THANKS':           return 'danke fürs spielen';
    default:                 return phase.toLowerCase();
  }
}

function PageStyles() {
  return (
    <style>{`
      html, body, #root { background: ${PALETTE.inkDeep}; }
      input::placeholder { color: ${PALETTE.inkSoft}88; font-style: italic; font-family: ${F_BODY}; font-size: 18px; }
      button:focus-visible, input:focus-visible {
        outline: 2px solid ${PALETTE.ochre};
        outline-offset: 2px;
      }
    `}</style>
  );
}
