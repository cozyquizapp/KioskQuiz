import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Fix leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png', iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png' });
import { useQQSocket } from '../hooks/useQQSocket';
import {
  QQ_AVATARS, QQStateUpdate, QQ_CATEGORY_COLORS, QQ_CATEGORY_LABELS,
  QQTeam, qqGetAvatar, QQ_BUNTE_TUETE_LABELS,
} from '../../../shared/quarterQuizTypes';
import {
  resumeAudio, playCorrect, playWrong, playFanfare, playScoreUp,
} from '../utils/sounds';

// ── Übersetzungen ─────────────────────────────────────────────────────────────
const t = {
  header: { de: 'Quartier Quiz', en: 'Quarter Quiz' },
  setup: {
    chooseAvatar: { de: 'Wähle deinen Avatar', en: 'Choose your avatar' },
    teamName: { de: 'Team-Name', en: 'Team name' },
    placeholder: { de: 'z.B. Die Wilden', en: 'e.g. The Wild Ones' },
    join: { de: '▶ Spiel beitreten', en: '▶ Join game' },
    next: { de: 'Weiter →', en: 'Next →' },
    error: { de: 'Fehler beim Beitreten', en: 'Join error' },
  },
  lobby: {
    ready: { de: 'Bereit!', en: 'Ready!' },
    waiting: { de: 'Warteraum', en: 'Waiting room' },
    waitingForMod: { de: 'Warte auf Moderator', en: 'Waiting for moderator' },
    teams: { de: 'Team', en: 'Team' },
  },
  phase: {
    next: { de: 'Nächste Phase', en: 'Next phase' },
    round: { de: 'Runde', en: 'Round' },
  },
  answer: {
    submit: { de: 'Abschicken', en: 'Submit' },
    submitted: { de: 'Abgeschickt', en: 'Submitted' },
    choose: { de: 'Wählen', en: 'Choose' },
    given: { de: '✓ Abgegeben', en: '✓ Submitted' },
    enterAnswer: { de: 'Antwort eingeben…', en: 'Enter answer…' },
    enterNumber: { de: 'Zahl eingeben…', en: 'Enter number…' },
  },
  correct: { de: '🎉 Richtig! Du darfst ein Feld wählen', en: '🎉 Correct! You may choose a field' },
  potato: {
    yourTurn: { de: '🥔 Du bist dran!', en: '🥔 Your turn!' },
    otherTurn: { de: '🥔 {name} ist dran', en: '🥔 {name} is up' },
    out: { de: '❌ Du bist raus', en: '❌ You are out' },
  },
  imposter: {
    waiting: { de: '🕵️ Warten auf Start…', en: '🕵️ Waiting for start…' },
    eliminated: { de: '❌ Falsche Aussage gewählt — du bist raus', en: '❌ Wrong statement — you are out' },
    chosen: { de: '✓ Gewählt — warte auf nächstes Team…', en: '✓ Chosen — waiting for next team…' },
    allChosen: { de: 'Alle Aussagen gewählt', en: 'All statements chosen' },
    otherPicking: { de: '{name} wählt gerade…', en: '{name} is choosing…' },
    remaining: { de: '{n} Aussage(n) übrig', en: '{n} statement(s) left' },
  },
  placement: {
    tapEmpty: { de: 'Tippe auf ein freies Feld', en: 'Tap an empty field' },
    tapOpponent: { de: 'Tippe auf ein fremdes Feld', en: 'Tap an opponent\'s field' },
    tapOpponent12: { de: 'Tippe auf ein gegnerisches Feld (1/2)', en: 'Tap an opponent field (1/2)' },
    swap2nd: { de: 'Jetzt das 2. Feld (anderes Team) wählen', en: 'Now choose the 2nd field (different team)' },
    otherChoosing: { de: 'wählt ein Feld…', en: 'is choosing a field…' },
    cancel: { de: 'Abbrechen', en: 'Cancel' },
    titlePlace: { de: '📍 Wähle ein Feld!', en: '📍 Choose a field!' },
    titleSteal: { de: '⚡ Klau ein fremdes Feld!', en: '⚡ Steal an opponent\'s field!' },
    titleSwap: { de: '🔄 Tausche 2 gegnerische Felder!', en: '🔄 Swap 2 opponent fields!' },
    titlePhase2: { de: '🏆 Runde 2 — Wähle deine Aktion!', en: '🏆 Round 2 — Choose your action!' },
    place2: { de: '📍 2 Felder setzen', en: '📍 Place 2 fields' },
    steal1: { de: '⚡ 1 Feld klauen', en: '⚡ Steal 1 field' },
    placeBtn: { de: '📍 Setzen', en: '📍 Place' },
    stealBtn: { de: '⚡ Klauen', en: '⚡ Steal' },
    swapBtn: { de: '🔄 Felder wählen', en: '🔄 Choose fields' },
    confirmPlace: { de: '📍 Feld wählen', en: '📍 Choose field' },
    confirmSteal: { de: '⚡ Klauen', en: '⚡ Steal' },
  },
  comeback: {
    title: { de: '⚡ Deine Comeback-Chance!', en: '⚡ Your comeback chance!' },
    otherTeam: { de: '⚡ Comeback-Aktion läuft…', en: '⚡ Comeback action in progress…' },
    place2: { de: '2 Felder setzen', en: 'Place 2 fields' },
    place2desc: { de: 'Platziere 2 freie Felder', en: 'Place 2 empty fields' },
    steal1: { de: '1 Feld klauen', en: 'Steal 1 field' },
    steal1desc: { de: 'Nimm ein fremdes Feld', en: 'Take an opponent\'s field' },
    swap2: { de: '2 Felder tauschen', en: 'Swap 2 fields' },
    swap2desc: { de: 'Tausche je 1 Feld zweier Gegner', en: 'Swap 1 field each of two opponents' },
    activePlace: { de: '📍 Wähle 2 freie Felder', en: '📍 Choose 2 empty fields' },
    activeSteal: { de: '⚡ Klau ein fremdes Feld', en: '⚡ Steal an opponent\'s field' },
    activeSwap: { de: '🔄 Wähle 2 gegnerische Felder zum Tauschen', en: '🔄 Choose 2 opponent fields to swap' },
  },
  gameOver: {
    won: { de: 'Gewonnen! 🎉', en: 'You won! 🎉' },
    wins: { de: '{name} gewinnt!', en: '{name} wins!' },
    rank: { de: 'Platz {n} für dich', en: 'You placed #{n}' },
    connected: { de: 'verbunden', en: 'connected' },
    total: { de: 'gesamt', en: 'total' },
  },
  stats: {
    stolen: { de: 'geklaut', en: 'stolen' },
    joker: { de: 'Joker', en: 'Joker' },
    connected: { de: 'verbunden', en: 'connected' },
    total: { de: 'gesamt', en: 'total' },
  },
  allIn: {
    distribute: { de: 'Punkte verteilen', en: 'Distribute points' },
    remaining: { de: '{n} übrig', en: '{n} left' },
    leftToDistribute: { de: 'Noch {n} Punkt(e) verteilen', en: '{n} point(s) left' },
  },
  pinIt: {
    tap: { de: '📍 Tippe auf die Karte um einen Pin zu setzen', en: '📍 Tap the map to place a pin' },
    noPin: { de: 'Noch kein Pin gesetzt', en: 'No pin placed yet' },
  },
  taken: { de: 'Vergeben', en: 'Taken' },
  waiting: {
    room: { de: 'Raum', en: 'Room' },
    loading: { de: '● Verbunden, lade Spielzustand…', en: '● Connected, loading game state…' },
    connecting: { de: '○ Verbinde…', en: '○ Connecting…' },
  },
};
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
  @keyframes tcwinBounce {
    0%   { transform: scale(0.5); opacity: 0; }
    40%  { transform: scale(1.15); opacity: 1; }
    60%  { transform: scale(0.92); }
    80%  { transform: scale(1.06); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes tcdotPulse {
    0%, 80%, 100% { opacity: 0.3; }
    40% { opacity: 1; }
  }
  @keyframes tccellTap {
    0%   { transform: scale(1); }
    50%  { transform: scale(0.88); }
    100% { transform: scale(1); }
  }

  button:focus-visible, input:focus-visible {
    outline: 2px solid #F59E0B;
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

const QQ_ROOM = 'default';

function AnimatedDots() {
  return (
    <span aria-hidden>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          animation: `tcdotPulse 1.4s ease-in-out ${i * 0.2}s infinite`,
          fontSize: 'inherit',
        }}>.</span>
      ))}
    </span>
  );
}

type SetupStep = 'AVATAR' | 'NAME';

function getOrCreateTeamId(): string {
  const key = 'qq_teamId';
  // Use localStorage so the same team ID persists across tabs
  let id = localStorage.getItem(key);
  if (!id) {
    id = `team-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(key, id);
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

  // Disable Cozy gradient mesh on QQ pages
  useEffect(() => {
    document.body.classList.add('qq-active');
    return () => { document.body.classList.remove('qq-active'); };
  }, []);

  // Reset joined on disconnect so auto-rejoin fires on reconnect
  useEffect(() => {
    if (!connected && joined) setJoined(false);
  }, [connected]);

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
    else setError(ack.error ?? 'error');
  }

  // Always allow local language override, even in lobby/setup
  const [localLang, setLocalLang] = useState<'de' | 'en'>(() => (sessionStorage.getItem('qq_lang') as 'de' | 'en') ?? 'de');
  const lang: 'de' | 'en' = localLang;
  const setLang = (l: 'de' | 'en') => { setLocalLang(l); sessionStorage.setItem('qq_lang', l); };
  const [flagFlip, setFlagFlip] = useState(false); // true = mid-flip (hidden at 90°)
  const flipLockRef = useRef(false);
  const handleFlagClick = () => {
    if (flipLockRef.current) return;
    flipLockRef.current = true;
    setFlagFlip(true);
    setTimeout(() => {
      setLang(lang === 'de' ? 'en' : 'de');
      setFlagFlip(false);
      setTimeout(() => { flipLockRef.current = false; }, 220);
    }, 200);
  };

  const takenAvatarIds = (state?.teams ?? []).map(t => t.avatarId);

  // Auto-switch to a free avatar if current selection gets taken
  useEffect(() => {
    if (!joined && takenAvatarIds.includes(avatarId)) {
      const free = QQ_AVATARS.find(a => !takenAvatarIds.includes(a.id));
      if (free) setAvatarId(free.id);
    }
  }, [takenAvatarIds.join(',')]);

  if (!joined) {
    return <SetupFlow step={step} setStep={setStep}
      avatarId={avatarId} setAvatarId={setAvatarId} teamName={teamName} setTeamName={setTeamName}
      connected={connected} error={error} onJoin={joinRoom}
      lang={lang} onFlagClick={handleFlagClick} flagFlip={flagFlip}
      takenAvatarIds={takenAvatarIds}
    />;
  }
  if (!state) {
    return <WaitingScreen roomCode={roomCode} connected={connected} lang={lang} />;
  }
  const myTeam = state.teams.find(t => t.id === teamId);
  return <TeamGameView state={state} myTeam={myTeam ?? null} myTeamId={teamId}
    emit={emit} roomCode={roomCode} lang={lang} onFlagClick={handleFlagClick} flagFlip={flagFlip} connected={connected} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETUP FLOW
// ═══════════════════════════════════════════════════════════════════════════════

function SetupFlow({ step, setStep, avatarId, setAvatarId,
  teamName, setTeamName, connected, error, onJoin, lang, onFlagClick, flagFlip, takenAvatarIds }: {
  step: string; setStep: (s: any) => void; avatarId: string; setAvatarId: (a: string) => void;
  teamName: string; setTeamName: (n: string) => void; connected: boolean; error: string | null;
  onJoin: () => void; lang: 'de' | 'en'; onFlagClick: () => void; flagFlip: boolean;
  takenAvatarIds: string[];
}) {
  return (
    <div style={darkPage}>
      <style>{TEAM_CSS}</style>
      <div style={grainOverlay} />
      <div style={{ width: '100%', maxWidth: 440, margin: '0 auto', padding: '32px 20px', position: 'relative', zIndex: 5 }}>
        <div style={{ textAlign: 'center', marginBottom: 32, position: 'relative' }}>
          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 17, color: 'rgba(234,179,8,0.55)', marginBottom: 4 }}>
            {t.header[lang]}
          </div>
          <div style={{ fontSize: 38, fontWeight: 900, color: '#F1F5F9', letterSpacing: '-0.02em' }}>
            {t.header[lang]}
          </div>
          {/* Always show language flag in setup/lobby */}
          <button
            onClick={onFlagClick}
            style={{
              border: 'none', background: 'none', cursor: 'pointer', padding: 0,
              marginLeft: 8, marginRight: 0, outline: 'none',
              fontSize: 24, display: 'inline-block',
              perspective: '400px',
              position: 'absolute', right: 0, top: 0,
            }}
            aria-label={lang === 'de' ? 'Sprache: Deutsch (klicken für Englisch)' : 'Language: English (click for German)'}
            title={lang === 'de' ? 'Deutsch (klicken für Englisch)' : 'English (click for German)'}
          >
            <span style={{
              display: 'inline-block',
              transition: 'transform 0.2s ease-in-out, opacity 0.2s',
              transform: flagFlip ? 'rotateY(90deg)' : 'rotateY(0deg)',
              opacity: flagFlip ? 0 : 1,
            }}>
              {lang === 'de' ? '🇩🇪' : '🇬🇧'}
            </span>
          </button>
        </div>
        {step === 'AVATAR' && (
          <CozyCard anim>
            <StepLabel>{t.setup.chooseAvatar[lang]}</StepLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
              {QQ_AVATARS.map((a, i) => {
                const sel = avatarId === a.id;
                const taken = takenAvatarIds.includes(a.id);
                return (
                  <button key={a.id} onClick={() => !taken && setAvatarId(a.id)} disabled={taken} style={{
                    padding: '12px 4px', borderRadius: 14, cursor: taken ? 'not-allowed' : 'pointer',
                    background: taken ? 'rgba(255,255,255,0.02)' : sel ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${taken ? 'rgba(255,255,255,0.04)' : sel ? '#3B82F6' : 'rgba(255,255,255,0.07)'}`,
                    opacity: taken ? 0.35 : 1,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    fontFamily: 'inherit', transition: 'all 0.15s',
                    boxShadow: sel ? '0 0 16px rgba(59,130,246,0.3)' : 'none',
                    ['--r' as string]: `${(i % 2 === 0 ? -1 : 1) * (5 + i * 2)}deg`,
                    animation: sel ? `tcfloat ${3.5 + i * 0.3}s ease-in-out infinite` : 'none',
                  }}>
                    <span style={{ fontSize: 34, lineHeight: 1, filter: taken ? 'grayscale(1)' : 'none' }}>{a.emoji}</span>
                    <span style={{ fontSize: 11, color: taken ? '#334155' : sel ? '#3B82F6' : '#475569', fontWeight: 800,
                      textDecoration: taken ? 'line-through' : 'none' }}>{taken ? t.taken[lang] : a.label}</span>
                  </button>
                );
              })}
            </div>
            <CozyBtn color="#3B82F6" onClick={() => setStep('NAME')}>{t.setup.next[lang]}</CozyBtn>
          </CozyCard>
        )}
        {step === 'NAME' && (
          <CozyCard anim>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 64, lineHeight: 1, display: 'block',
                animation: 'tcfloat 3s ease-in-out infinite' }}>
                {qqGetAvatar(avatarId).emoji}
              </span>
            </div>
            <StepLabel>{t.setup.teamName[lang]}</StepLabel>
            <input
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              placeholder={t.setup.placeholder[lang]}
              style={cozyInput}
              autoFocus
              maxLength={20}
              onKeyDown={e => e.key === 'Enter' && teamName.trim() && onJoin()}
            />
            {error && (
              <div style={{ color: '#F87171', fontSize: 13, marginBottom: 8, fontWeight: 700 }}>{t.setup.error[lang]}</div>
            )}
            <CozyBtn color="#22C55E" onClick={onJoin} disabled={!teamName.trim()}>
              {t.setup.join[lang]}
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

function TeamGameView({ state: s, myTeam, myTeamId, emit, roomCode, lang, flagFlip, onFlagClick, connected }: {
  state: QQStateUpdate; myTeam: QQTeam | null;
  myTeamId: string; emit: any; roomCode: string;
  lang: 'de' | 'en'; flagFlip: boolean; onFlagClick: () => void;
  connected: boolean;
}) {
  const isMyTurn      = s.pendingFor === myTeamId;
  const isComebackTeam = s.comebackTeamId === myTeamId;
  const teamColor     = myTeam?.color ?? '#3B82F6';

  // ── Team sounds ──
  const prevPhaseRef = useRef(s.phase);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = s.phase;
    resumeAudio();
    if (s.phase === 'PHASE_INTRO' && prev !== 'PHASE_INTRO') playFanfare();
    if (s.phase === 'QUESTION_REVEAL' && prev === 'QUESTION_ACTIVE') {
      if (s.correctTeamId === myTeamId) {
        playCorrect();
        if (typeof navigator.vibrate === 'function') navigator.vibrate([50, 30, 50]);
      } else {
        playWrong();
        if (typeof navigator.vibrate === 'function') navigator.vibrate([80, 40, 80, 40, 80]);
      }
    }
    if (s.phase === 'PLACEMENT' && prev === 'QUESTION_REVEAL' && s.correctTeamId === myTeamId) playScoreUp();
    if (s.phase === 'GAME_OVER' && prev !== 'GAME_OVER') playFanfare();
  }, [s.phase, s.correctTeamId]); // eslint-disable-line react-hooks/exhaustive-deps

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
              <div style={{ fontWeight: 900, fontSize: 20, color: teamColor, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {myTeam.name}
              </div>
            </div>
            {/* Language selector — always visible, always works */}
            <button
              onClick={onFlagClick}
              style={{
                border: 'none', background: 'none', cursor: 'pointer', padding: 0,
                marginLeft: 6, marginRight: 6, outline: 'none',
                fontSize: 24, display: 'inline-block',
                perspective: '400px',
              }}
              aria-label={lang === 'de' ? 'Sprache: Deutsch (klicken für Englisch)' : 'Language: English (click for German)'}
              title={lang === 'de' ? 'Deutsch (klicken für Englisch)' : 'English (click for German)'}
            >
              <span style={{
                display: 'inline-block',
                transition: 'transform 0.2s ease-in-out, opacity 0.2s',
                transform: flagFlip ? 'rotateY(90deg)' : 'rotateY(0deg)',
                opacity: flagFlip ? 0 : 1,
              }}>
                {lang === 'de' ? '🇩🇪' : '🇬🇧'}
              </span>
            </button>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#94a3b8', flexShrink: 0 }}>
              {lang === 'de' ? 'Frage' : 'Q'} {(s.questionIndex % 5) + 1}/5
            </div>
          </div>
        )}

        {/* Disconnect banner */}
        {!connected && (
          <div style={{
            padding: '10px 16px', borderRadius: 12, marginBottom: 12, textAlign: 'center',
            background: '#7F1D1D', border: '1px solid #EF4444', color: '#FCA5A5',
            fontWeight: 800, fontSize: 13, animation: 'tcpulse 2s infinite',
          }}>
            {lang === 'de' ? '⚠️ Verbindung unterbrochen — verbinde neu…' : '⚠️ Connection lost — reconnecting…'}
          </div>
        )}

        {/* Phase content */}
        {s.phase === 'LOBBY'           && <LobbyCard state={s} myTeam={myTeam} lang={lang} />}
        {s.phase === 'RULES'           && <RulesCard lang={lang} />}
        {s.phase === 'PHASE_INTRO'     && <PhaseIntroCard state={s} lang={lang} />}
        {(s.phase === 'QUESTION_ACTIVE' || s.phase === 'QUESTION_REVEAL') && (
          <QuestionCard state={s} myTeamId={myTeamId} emit={emit} roomCode={roomCode} lang={lang} />
        )}
        {s.phase === 'PLACEMENT' && (
          <PlacementCard state={s} myTeamId={myTeamId} isMyTurn={isMyTurn} emit={emit} roomCode={roomCode} lang={lang} />
        )}
        {s.phase === 'COMEBACK_CHOICE' && (
          <ComebackCard state={s} myTeamId={myTeamId} isMine={isComebackTeam} emit={emit} roomCode={roomCode} lang={lang} />
        )}
        {s.phase === 'GAME_OVER' && <GameOverCard state={s} myTeamId={myTeamId} lang={lang} />}

        {/* Phase stats */}
        {myTeam && s.teamPhaseStats[myTeamId] && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {s.teamPhaseStats[myTeamId].stealsUsed > 0 && (
              <StatChip label={`⚡ ${s.teamPhaseStats[myTeamId].stealsUsed} ${t.stats.stolen[lang]}`} color="#EF4444" />
            )}
            {s.teamPhaseStats[myTeamId].jokersEarned > 0 && (
              <StatChip label={`⭐ ${s.teamPhaseStats[myTeamId].jokersEarned} ${t.stats.joker[lang]}`} color="#FBBF24" />
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

function LobbyCard({ state: s, myTeam, lang }: { state: QQStateUpdate; myTeam: QQTeam | null; lang: 'de' | 'en' }) {
  return (
    <CozyCard>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 44, marginBottom: 10, animation: 'tcwobble 2s ease-in-out infinite' }}>🎮</div>
        <div style={{ fontWeight: 900, fontSize: 22, color: '#F1F5F9', marginBottom: 6 }}>
          {myTeam ? (lang === 'de' ? 'Bereit!' : 'Ready!') : (lang === 'de' ? 'Warteraum' : 'Waiting room')}
        </div>
        <div style={{ fontSize: 15, color: '#64748b', marginBottom: 16 }}>
          {s.teams.length} Team{s.teams.length !== 1 ? 's' : ''} · {lang === 'de' ? 'Warte auf Moderator' : 'Waiting for moderator'}
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

function RulesCard({ lang }: { lang: 'de' | 'en' }) {
  const [dot, setDot] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setDot(d => (d + 1) % 4), 500);
    return () => clearInterval(id);
  }, []);
  const dots = '.'.repeat(dot);

  return (
    <CozyCard>
      <div style={{ textAlign: 'center', padding: '12px 4px', animation: 'tcreveal 0.5s ease both' }}>
        <div style={{ fontSize: 48, marginBottom: 10, animation: 'tcwobble 1.4s ease-in-out infinite' }}>👂</div>
        <div style={{ fontWeight: 900, fontSize: 20, color: '#F1F5F9', marginBottom: 8 }}>
          {lang === 'de' ? 'Gut zuhören!' : 'Listen up!'}
        </div>
        <div style={{ fontSize: 15, color: '#94A3B8', lineHeight: 1.5 }}>
          {lang === 'de'
            ? 'Jetzt erklären wir die Regeln'
            : 'We are explaining the rules now'}
          <span style={{ display: 'inline-block', width: 24, textAlign: 'left' }}>{dots}</span>
        </div>
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 8 }}>
          {['📖', '🗺️', '⭐'].map((e, i) => (
            <div key={i} style={{
              fontSize: 22,
              animation: `tcwobble 2s ease-in-out ${i * 0.35}s infinite`,
            }}>{e}</div>
          ))}
        </div>
      </div>
    </CozyCard>
  );
}

function PhaseIntroCard({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const colors = ['#3B82F6', '#F59E0B', '#EF4444', '#A855F7'];
  const color  = colors[(s.gamePhaseIndex - 1) % 4];
  const names  = { de: ['', 'Runde 1', 'Runde 2', 'Runde 3', 'Finale'], en: ['', 'Round 1', 'Round 2', 'Round 3', 'Final'] };
  const descs  = { de: ['', '1 Feld pro Sieg', '2 Felder oder klauen', 'Comeback-Phase', 'Alles auf Spiel'],
                   en: ['', '1 field per win', '2 fields or steal', 'Comeback phase', 'All in'] };
  return (
    <CozyCard>
      <div style={{ textAlign: 'center', padding: '8px 0', animation: 'tcreveal 0.5s ease both' }}>
        <div style={{ fontSize: 14, color: '#64748b', marginBottom: 6 }}>
          {lang === 'de' ? 'Nächste Phase' : 'Next phase'}
        </div>
        <div style={{ fontSize: 52, fontWeight: 900, color, textShadow: `0 0 30px ${color}44`,
          animation: 'tcfloat 3s ease-in-out infinite' }}>
          {names[lang][s.gamePhaseIndex] ?? `Round ${s.gamePhaseIndex}`}
        </div>
        <div style={{ fontSize: 17, color: `${color}88`, marginTop: 8 }}>
          {descs[lang][s.gamePhaseIndex] ?? ''}
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
        color: catColor, fontSize: 15, fontWeight: 900, letterSpacing: '0.06em',
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
          {t.potato.yourTurn[lang]}
        </div>
      )}
      {!isRevealed && s.hotPotatoActiveTeamId && s.hotPotatoActiveTeamId !== myTeamId && (
        <div style={{
          padding: '8px 14px', borderRadius: 12, textAlign: 'center',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          fontSize: 14, color: '#64748b', marginBottom: 8,
        }}>
          🥔 {s.teams.find(tm => tm.id === s.hotPotatoActiveTeamId)?.name ?? '?'} {lang === 'en' ? 'is up' : 'ist dran'}
        </div>
      )}
      {!isRevealed && s.hotPotatoEliminated.includes(myTeamId) && (
        <div style={{
          padding: '8px 14px', borderRadius: 12, textAlign: 'center',
          background: 'rgba(239,68,68,0.1)', fontSize: 14, color: '#f87171', marginBottom: 8,
        }}>
          {t.potato.out[lang]}
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

      {isRevealed && s.correctTeamId && !!(s.pendingFor || s.pendingAction) && (() => {
        const winnerTeam = s.teams.find(t => t.id === s.correctTeamId);
        const cat = q.category;
        const isEn = lang === 'en';
        if (iWon) {
          const winMsg = cat === 'SCHAETZCHEN'
            ? (isEn ? '🎯 You were closest! Choose a field.' : '🎯 Ihr wart am nächsten dran! Wählt ein Feld.')
            : cat === 'CHEESE'
              ? (isEn ? '📸 Correct! Choose a field.' : '📸 Erkannt! Wählt ein Feld.')
              : cat === 'BUNTE_TUETE'
                ? (isEn ? '🎁 You win this round! Choose a field.' : '🎁 Ihr gewinnt die Runde! Wählt ein Feld.')
                : (isEn ? '🎉 Correct! You may choose a field.' : '🎉 Richtig! Ihr dürft ein Feld wählen.');
          return (
            <div style={{
              marginTop: 8, padding: '10px 14px', borderRadius: 12,
              background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)',
              fontSize: 15, fontWeight: 800, color: '#4ade80', textAlign: 'center',
              animation: 'tcwinBounce 0.6s cubic-bezier(0.34,1.56,0.64,1) both',
              boxShadow: '0 0 20px rgba(34,197,94,0.25)',
            }}>
              {winMsg}
            </div>
          );
        } else if (winnerTeam) {
          const loseMsg = cat === 'SCHAETZCHEN'
            ? (isEn ? `😔 ${winnerTeam.name} was closer.` : `😔 Leider war ${winnerTeam.name} näher dran.`)
            : (isEn ? `😔 ${winnerTeam.name} got it right.` : `😔 ${winnerTeam.name} hatte Recht.`);
          return (
            <div style={{
              marginTop: 8, padding: '10px 14px', borderRadius: 12,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              fontSize: 14, fontWeight: 700, color: '#64748b', textAlign: 'center',
              animation: 'tcreveal 0.4s ease 0.2s both',
            }}>
              {loseMsg}
            </div>
          );
        }
        return null;
      })()}
    </CozyCard>
  );
}

// ── Submit button (shared) ────────────────────────────────────────────────────
function SubmitBtn({ onSubmit, canSubmit, submitted, catColor, label, submittedLabel, lang = 'de' }: {
  onSubmit: () => void; canSubmit: boolean; submitted: boolean; catColor: string; label?: string; submittedLabel?: string; lang?: 'de' | 'en';
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
        ? <><span style={{ animation: 'tccheckpop 0.4s cubic-bezier(0.34,1.56,0.64,1) both', display: 'inline-block', fontSize: 20 }}>✓</span> {submittedLabel ?? t.answer.submitted[lang]}</>
        : label ?? t.answer.submit[lang]}
    </button>
  );
}

// ── Submitted state ───────────────────────────────────────────────────────────
function SubmittedBadge({ text, lang = 'de' }: { text: string; lang?: 'de' | 'en' }) {
  return (
    <div style={{
      padding: '12px 16px', borderRadius: 14, textAlign: 'center',
      background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.3)',
      fontSize: 15, fontWeight: 800, color: '#4ade80',
      animation: 'tcreveal 0.3s ease both',
    }}>
      {t.answer.given[lang]}: „{text}"
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

  if (myAnswer) return <SubmittedBadge text={myAnswer.text} lang={lang} />;
  if (!q) return null;

  // Hot Potato — team text input (only active team, not eliminated)
  if (q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato') {
    return <HotPotatoInput state={s} myTeamId={myTeamId} emit={emit} roomCode={roomCode} catColor={catColor} lang={lang} />;
  }

  // Route by category
  if (q.category === 'MUCHO') return <MuchoInput question={q} catColor={catColor} onSubmit={submitText} lang={lang} />;
  if (q.category === 'ZEHN_VON_ZEHN') return <AllInInput question={q} catColor={catColor} onSubmit={submitText} lang={lang} />;
  if (q.category === 'SCHAETZCHEN') return <TextInput catColor={catColor} onSubmit={submitText} numeric placeholder={q.unit ? `${t.answer.enterNumber[lang].replace('…','')} (${lang === 'en' && q.unitEn ? q.unitEn : q.unit})…` : t.answer.enterNumber[lang]} lang={lang} />;
  if (q.category === 'CHEESE') return <TextInput catColor={catColor} onSubmit={submitText} placeholder={t.answer.enterAnswer[lang]} lang={lang} />;
  if (q.category === 'BUNTE_TUETE') {
    const kind = q.bunteTuete?.kind;
    if (kind === 'top5') return <Top5Input catColor={catColor} onSubmit={submitText} lang={lang} />;
    if (kind === 'oneOfEight') return <ImposterInput question={q} catColor={catColor} state={s} myTeamId={myTeamId} emit={emit} roomCode={roomCode} lang={lang} />;
    if (kind === 'order') return <FixItInput question={q} catColor={catColor} onSubmit={submitText} lang={lang} />;
    if (kind === 'map') return <PinItInput question={q} catColor={catColor} onSubmit={submitText} lang={lang} />;
  }
  // Fallback
  return <TextInput catColor={catColor} onSubmit={submitText} placeholder={t.answer.enterAnswer[lang]} lang={lang} />;
}

// ── Hot Potato team input with countdown ──────────────────────────────────────
function HotPotatoInput({ state: s, myTeamId, emit, roomCode, catColor, lang = 'de' }: {
  state: QQStateUpdate; myTeamId: string; emit: any; roomCode: string; catColor: string; lang?: 'de' | 'en';
}) {
  const isMyTurn = s.hotPotatoActiveTeamId === myTeamId;
  const eliminated = s.hotPotatoEliminated.includes(myTeamId);
  const submitted = !!s.hotPotatoLastAnswer && isMyTurn;
  const [val, setVal] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Countdown timer synced to server deadline
  useEffect(() => {
    if (!s.hotPotatoTurnEndsAt) { setSecondsLeft(null); return; }
    const tick = () => {
      const left = Math.max(0, Math.ceil((s.hotPotatoTurnEndsAt! - Date.now()) / 1000));
      setSecondsLeft(left);
    };
    tick();
    const iv = setInterval(tick, 250);
    return () => clearInterval(iv);
  }, [s.hotPotatoTurnEndsAt]);

  // Auto-focus when it becomes your turn
  useEffect(() => {
    if (isMyTurn && !submitted) {
      setVal('');
      setTimeout(() => ref.current?.focus(), 120);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
  }, [isMyTurn, submitted]);

  if (eliminated) return null; // eliminated teams see the status badge above, not the input
  if (!isMyTurn) return null;  // not your turn — status shown in the main view above
  if (submitted) return <SubmittedBadge text={s.hotPotatoLastAnswer!} lang={lang} />;

  async function submit() {
    if (!val.trim()) return;
    if (navigator.vibrate) navigator.vibrate(40);
    await emit('qq:hotPotatoAnswer', { roomCode, teamId: myTeamId, answer: val.trim() });
  }

  const urgency = secondsLeft !== null && secondsLeft <= 5;

  return (
    <div style={{ marginTop: 4 }}>
      {/* Countdown bar */}
      {secondsLeft !== null && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          marginBottom: 8, padding: '6px 12px', borderRadius: 10,
          background: urgency ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${urgency ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
          transition: 'all 0.3s',
        }}>
          <span style={{
            fontSize: 22, fontWeight: 900, fontVariantNumeric: 'tabular-nums',
            color: urgency ? '#f87171' : '#94a3b8',
            animation: urgency ? 'tcpulse 0.6s ease-in-out infinite' : 'none',
          }}>
            {secondsLeft}s
          </span>
        </div>
      )}
      <input
        ref={ref}
        type="text"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && val.trim() && submit()}
        placeholder={t.answer.enterAnswer[lang]}
        autoComplete="off"
        style={{
          width: '100%', padding: '15px 16px', borderRadius: 14, boxSizing: 'border-box',
          border: `2px solid ${val ? catColor + '66' : urgency ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`,
          background: val ? `${catColor}10` : 'rgba(255,255,255,0.05)',
          color: '#F1F5F9', fontFamily: 'inherit', fontSize: 20, fontWeight: 700,
          outline: 'none', transition: 'all 0.2s',
          boxShadow: val ? `0 0 0 3px ${catColor}22` : 'none',
        }}
      />
      <SubmitBtn onSubmit={submit} canSubmit={!!val.trim()} submitted={false} catColor={catColor} />
    </div>
  );
}

// ── Text input (Schätzchen + Picture This fallback) ───────────────────────────
function TextInput({ catColor, onSubmit, placeholder, numeric, lang = 'de' }: {
  catColor: string; onSubmit: (v: string) => void; placeholder?: string; numeric?: boolean; lang?: 'de' | 'en';
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
        placeholder={placeholder ?? t.answer.enterAnswer[lang]}
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

function MuchoInput({ question: q, catColor, onSubmit, lang }: { question: any; catColor: string; onSubmit: (v: string) => void; lang: 'de' | 'en' }) {
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
        onSubmit={() => selected !== null && onSubmit(String(selected))}
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

function AllInInput({ question: q, catColor, onSubmit, lang }: { question: any; catColor: string; onSubmit: (v: string) => void; lang: 'de' | 'en' }) {
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
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>{t.allIn.distribute[lang]}</span>
        <div style={{
          padding: '3px 12px', borderRadius: 999, fontSize: 13, fontWeight: 900,
          background: `${pillColor}22`, border: `1px solid ${pillColor}55`, color: pillColor,
          animation: remaining === 0 ? 'tcsuccess 0.45s cubic-bezier(0.34,1.56,0.64,1) both' : undefined,
          transition: 'all 0.2s',
        }}>
          {remaining} {lang === 'en' ? 'left' : 'übrig'}
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
              width: 48, height: 48, borderRadius: 12, border: `1px solid ${pts > 0 ? color + '55' : 'rgba(255,255,255,0.1)'}`,
              background: pts > 0 ? `${color}18` : 'transparent', color: pts > 0 ? color : '#334155',
              cursor: pts > 0 ? 'pointer' : 'default', fontFamily: 'inherit', fontSize: 22, fontWeight: 900,
            }}>−</button>
            {/* Points */}
            <div style={{ width: 32, textAlign: 'center', fontWeight: 900, fontSize: 18, color: pts > 0 ? color : '#475569', fontVariantNumeric: 'tabular-nums' }}>
              {pts}
            </div>
            {/* + */}
            <button onClick={() => updateBet(i, 1)} disabled={remaining <= 0} style={{
              width: 48, height: 48, borderRadius: 12, border: `1px solid ${remaining > 0 ? color + '55' : 'rgba(255,255,255,0.1)'}`,
              background: remaining > 0 ? `${color}18` : 'transparent', color: remaining > 0 ? color : '#334155',
              cursor: remaining > 0 ? 'pointer' : 'default', fontFamily: 'inherit', fontSize: 22, fontWeight: 900,
            }}>+</button>
          </div>
        );
      })}
      <SubmitBtn
        onSubmit={() => onSubmit(bets.join(','))}
        canSubmit={remaining === 0}
        submitted={false}
        catColor={catColor}
        label={remaining === 0 ? t.answer.submit[lang] : t.allIn.leftToDistribute[lang].replace('{n}', String(remaining))}
      />
    </div>
  );
}

// ── Top 5 ─────────────────────────────────────────────────────────────────────
function Top5Input({ catColor, onSubmit, lang }: { catColor: string; onSubmit: (v: string) => void; lang: 'de' | 'en' }) {
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

// ── Imposter: Round-Robin (only active team picks) ────────────────────────────
function ImposterInput({ question: q, catColor, state: s, myTeamId, emit, roomCode, lang }: {
  question: any; catColor: string; state: QQStateUpdate; myTeamId: string;
  emit: any; roomCode: string; lang: 'de' | 'en';
}) {
  const bt = q.bunteTuete;
  const stmts: string[] = (lang === 'en' && bt?.statementsEn?.some((st: string) => st) ? bt.statementsEn : bt?.statements) ?? [];
  // Filter out already-chosen correct statements
  const available = stmts
    .map((text: string, i: number) => ({ text, idx: i }))
    .filter(x => x.text && !s.imposterChosenIndices.includes(x.idx));

  const [idx, setIdx] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const touchStartY = useRef(0);

  const isMyTurn = s.imposterActiveTeamId === myTeamId;

  // Reset submitted whenever the active team changes (new turn)
  useEffect(() => {
    setSubmitted(false);
  }, [s.imposterActiveTeamId]);
  const isEliminated = s.imposterEliminated.includes(myTeamId);
  const activeTeam = s.teams.find(t => t.id === s.imposterActiveTeamId);

  const clamped = Math.max(0, Math.min(idx, available.length - 1));
  const current = available[clamped];
  const canUp = clamped > 0;
  const canDown = clamped < available.length - 1;
  const SLOT_H = 100;

  async function handleConfirm() {
    if (!current || submitted || !isMyTurn) return;
    if (navigator.vibrate) navigator.vibrate(40);
    setSubmitted(true);
    await emit('qq:imposterChoose', { roomCode, teamId: myTeamId, statementIndex: current.idx });
  }

  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (delta > 30) setIdx(i => Math.min(i + 1, available.length - 1));
    if (delta < -30) setIdx(i => Math.max(i - 1, 0));
  };

  // Not yet started
  if (!s.imposterActiveTeamId && !isEliminated) {
    return (
      <div style={{ padding: '12px 16px', borderRadius: 12, textAlign: 'center', background: 'rgba(255,255,255,0.04)', color: '#64748b', fontSize: 14, fontWeight: 700 }}>
        {t.imposter.waiting[lang]}
      </div>
    );
  }
  // Eliminated
  if (isEliminated) {
    return (
      <div style={{ padding: '12px 16px', borderRadius: 12, textAlign: 'center', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 15, fontWeight: 800 }}>
        {t.imposter.eliminated[lang]}
      </div>
    );
  }
  // Waiting for other team
  if (!isMyTurn) {
    return (
      <div style={{ padding: '12px 16px', borderRadius: 12, textAlign: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', fontSize: 14, fontWeight: 700 }}>
        🕵️ {activeTeam?.name ?? '?'} {lang === 'en' ? 'is choosing' : 'wählt gerade'}<AnimatedDots />
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{available.length} {lang === 'en' ? `statement${available.length !== 1 ? 's' : ''} left` : `Aussage${available.length !== 1 ? 'n' : ''} übrig`}</div>
      </div>
    );
  }
  // Already submitted this turn
  if (submitted) {
    return (
      <div style={{ padding: '12px 16px', borderRadius: 12, textAlign: 'center', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80', fontSize: 15, fontWeight: 800 }}>
        {t.imposter.chosen[lang]}
      </div>
    );
  }

  if (!available.length) return <div style={{ color: '#64748b', fontSize: 14, textAlign: 'center', padding: 12 }}>{t.imposter.allChosen[lang]}</div>;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
        🕵️ {lang === 'en' ? 'Your turn — which is false?' : 'Du bist dran — welche ist falsch?'}
      </div>

      {/* Drum wheel */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          borderRadius: 16, height: SLOT_H * 3, overflow: 'hidden', position: 'relative',
          background: 'rgba(10,15,35,0.97)', border: '1.5px solid rgba(148,163,184,0.15)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          userSelect: 'none', touchAction: 'none',
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
          {canUp ? available[clamped - 1]?.text : ''}
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
          {canDown ? available[clamped + 1]?.text : ''}
        </div>

        {/* Arrow buttons */}
        {canUp && <div onClick={() => setIdx(i => i - 1)} style={{ position: 'absolute', top: 8, right: 12, color: '#64748b', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>▲</div>}
        {canDown && <div onClick={() => setIdx(i => i + 1)} style={{ position: 'absolute', bottom: 8, right: 12, color: '#64748b', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>▼</div>}
      </div>

      {/* Counter */}
      <div style={{ textAlign: 'center', fontSize: 13, color: '#64748b', fontWeight: 700, marginTop: 6 }}>
        {clamped + 1} / {available.length}
      </div>

      <SubmitBtn onSubmit={handleConfirm} canSubmit={!!current && !submitted} submitted={submitted} catColor="#942d59" label={t.answer.choose[lang]} lang={lang} />
    </div>
  );
}

// ── Fix It: sortable list (no dnd-kit dep, manual reorder via buttons) ─────────
function FixItInput({ question: q, catColor, onSubmit, lang }: { question: any; catColor: string; onSubmit: (v: string) => void; lang: 'de' | 'en' }) {
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
      <div style={{ fontSize: 13, color: '#64748b', textAlign: 'center' }}>
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
            <button onClick={() => move(i, -1)} disabled={i === 0} style={{ width: 40, height: 38, borderRadius: 8, border: `1px solid ${i > 0 ? catColor+'44' : 'rgba(255,255,255,0.06)'}`, background: 'transparent', color: i > 0 ? catColor : '#334155', cursor: i > 0 ? 'pointer' : 'default', fontSize: 15, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▲</button>
            <button onClick={() => move(i, 1)} disabled={i === items.length - 1} style={{ width: 40, height: 38, borderRadius: 8, border: `1px solid ${i < items.length-1 ? catColor+'44' : 'rgba(255,255,255,0.06)'}`, background: 'transparent', color: i < items.length-1 ? catColor : '#334155', cursor: i < items.length-1 ? 'pointer' : 'default', fontSize: 15, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▼</button>
          </div>
        </div>
      ))}
      <SubmitBtn onSubmit={() => onSubmit(items.join('|'))} canSubmit={items.length > 0} submitted={false} catColor={catColor} />
    </div>
  );
}

// ── Pin It: simple coordinate input (no leaflet dep needed for basic version) ──
function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function PinItInput({ question: q, catColor, onSubmit, lang = 'de' }: { question: any; catColor: string; onSubmit: (v: string) => void; lang?: 'de' | 'en' }) {
  const bt = q?.bunteTuete;
  const centerLat = bt?.lat ?? 51.1657;
  const centerLng = bt?.lng ?? 10.4515;
  const zoom = bt?.zoom ?? 5;
  const [pin, setPin] = useState<[number, number] | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (!pin) return;
    setSubmitted(true);
    onSubmit(`${pin[0]},${pin[1]}`);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
      <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', fontWeight: 700 }}>
        {t.pinIt.tap[lang]}
      </div>
      <div style={{ borderRadius: 14, overflow: 'hidden', border: `2px solid ${pin ? catColor : 'rgba(255,255,255,0.1)'}`, height: 260, position: 'relative' }}>
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={zoom}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClickHandler onPick={(lat, lng) => setPin([lat, lng])} />
          {pin && <Marker position={pin} />}
        </MapContainer>
      </div>
      {pin
        ? <div style={{ fontSize: 12, color: catColor, textAlign: 'center', fontWeight: 800 }}>📍 {pin[0].toFixed(4)}, {pin[1].toFixed(4)}</div>
        : <div style={{ fontSize: 11, color: '#475569', textAlign: 'center' }}>{t.pinIt.noPin[lang]}</div>
      }
      <SubmitBtn onSubmit={handleSubmit} canSubmit={!!pin} submitted={submitted} catColor={catColor} />
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
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Timer</span>
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

type FreeAction = 'PLACE' | 'STEAL' | 'FREEZE' | 'SWAP' | 'STAPEL';

function PlacementCard({ state: s, myTeamId, isMyTurn, emit, roomCode, lang = 'de' }: {
  state: QQStateUpdate; myTeamId: string; isMyTurn: boolean; emit: any; roomCode: string; lang?: 'de' | 'en';
}) {
  const [selecting, setSelecting] = useState(false);
  const [freeMode, setFreeMode] = useState<FreeAction | null>(null);
  const [swapFirst, setSwapFirst] = useState<{ r: number; c: number } | null>(null);
  const [tappedCell, setTappedCell] = useState<string | null>(null);
  const pendingTeam = s.teams.find(t => t.id === s.pendingFor);

  const pa = s.pendingAction;
  const phase = s.gamePhaseIndex;
  const hasFreeCell = s.grid.some(row => row.some(cell => cell.ownerId === null));
  const hasStuckCandidate = (s.stuckCandidates?.length ?? 0) > 0;

  // Derived mode flags
  const isFree      = pa === 'FREE';
  const isFreeze    = pa === 'FREEZE_1' || (isFree && freeMode === 'FREEZE');
  const isSwapOne   = pa === 'SWAP_1'   || (isFree && freeMode === 'SWAP');
  const isStuck     = pa === 'STAPEL_1' || (isFree && freeMode === 'STAPEL');
  const isSwapComeback = s.comebackAction === 'SWAP_2' && pa === 'COMEBACK';
  const isSteal     = pa === 'STEAL_1'
    || (pa === 'COMEBACK' && s.comebackAction === 'STEAL_1')
    || (isFree && freeMode === 'STEAL')
    || (pa === 'PLACE_2' && freeMode === 'STEAL');

  // Phase 2: show place/steal choice before choosing
  const isPhase2Choice = pa === 'PLACE_2' && phase === 2 && !freeMode;

  // Phase 3/4 FREE: show action menu before choosing
  const showFreeMenu = isFree && !freeMode && !selecting;

  const cellSize = Math.min(60, Math.floor(340 / s.gridSize));

  useEffect(() => {
    if (!isMyTurn) { setSelecting(false); setFreeMode(null); setSwapFirst(null); }
  }, [isMyTurn]);

  async function chooseFreeAction(action: FreeAction) {
    setFreeMode(action);
    if (action === 'FREEZE' || action === 'SWAP' || action === 'STAPEL') {
      await emit('qq:chooseFreeAction', { roomCode, teamId: myTeamId, action });
      setSelecting(true);
    } else {
      await emit('qq:chooseFreeAction', { roomCode, teamId: myTeamId, action });
    }
  }

  async function handleCell(r: number, c: number) {
    if (!isMyTurn || !selecting) return;
    const cell = s.grid[r][c];
    const cellKey = `${r}-${c}`;
    setTappedCell(cellKey);
    setTimeout(() => setTappedCell(null), 300);
    if (typeof navigator.vibrate === 'function') navigator.vibrate(20);

    // COMEBACK SWAP_2: two opponent cells from different teams
    if (isSwapComeback) {
      if (!cell.ownerId || cell.ownerId === myTeamId) return;
      if (!swapFirst) { setSwapFirst({ r, c }); return; }
      if (r === swapFirst.r && c === swapFirst.c) return;
      const firstCell = s.grid[swapFirst.r][swapFirst.c];
      if (firstCell.ownerId === cell.ownerId) return;
      await emit('qq:swapCells', { roomCode, teamId: myTeamId, rowA: swapFirst.r, colA: swapFirst.c, rowB: r, colB: c });
      setSelecting(false); setSwapFirst(null); return;
    }

    // Phase 4 SWAP_1: pick own cell first, then enemy
    if (isSwapOne) {
      if (!swapFirst) {
        if (cell.ownerId !== myTeamId) return;
        setSwapFirst({ r, c });
        await emit('qq:swapOneCell', { roomCode, teamId: myTeamId, row: r, col: c });
        return;
      } else {
        if (!cell.ownerId || cell.ownerId === myTeamId) return;
        await emit('qq:swapOneCell', { roomCode, teamId: myTeamId, row: r, col: c });
        setSelecting(false); setSwapFirst(null); return;
      }
    }

    // FREEZE: pick own cell
    if (isFreeze) {
      if (cell.ownerId !== myTeamId || cell.stuck) return;
      await emit('qq:freezeCell', { roomCode, teamId: myTeamId, row: r, col: c });
      setSelecting(false); return;
    }

    // STAPEL: pick a valid plus-center
    if (isStuck) {
      const isCandidate = s.stuckCandidates?.some(sc => sc.row === r && sc.col === c);
      if (!isCandidate) return;
      await emit('qq:stapelCell', { roomCode, teamId: myTeamId, row: r, col: c });
      setSelecting(false); return;
    }

    // STEAL
    if (isSteal) {
      if (!cell.ownerId || cell.ownerId === myTeamId || cell.frozen || cell.stuck) return;
      await emit('qq:stealCell', { roomCode, teamId: myTeamId, row: r, col: c });
      setSelecting(false); return;
    }

    // PLACE
    if (cell.ownerId) return;
    await emit('qq:placeCell', { roomCode, teamId: myTeamId, row: r, col: c });
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
              <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
                {t.placement.otherChoosing[lang].replace('…', '')}<AnimatedDots />
              </div>
            </>
          )}
        </div>
      </CozyCard>
    );
  }

  const actionColor = isSwapComeback || isSwapOne ? '#8B5CF6'
    : isFreeze ? '#60A5FA'
    : isStuck ? '#F59E0B'
    : isSteal  ? '#EF4444'
    : '#22C55E';

  // Cell clickability per mode
  function isCellClickable(r: number, c: number): boolean {
    const cell = s.grid[r][c];
    if (isSwapComeback) return !!cell.ownerId && cell.ownerId !== myTeamId && (!swapFirst || s.grid[swapFirst.r][swapFirst.c].ownerId !== cell.ownerId);
    if (isSwapOne) return swapFirst ? (!!cell.ownerId && cell.ownerId !== myTeamId) : cell.ownerId === myTeamId;
    if (isFreeze) return cell.ownerId === myTeamId && !cell.stuck;
    if (isStuck)  return !!(s.stuckCandidates?.some(sc => sc.row === r && sc.col === c));
    if (isSteal)  return !!cell.ownerId && cell.ownerId !== myTeamId && !cell.frozen && !cell.stuck;
    return !cell.ownerId;
  }

  const phaseLabel = (() => {
    if (isSwapComeback || isSwapOne) return lang === 'de' ? '🔄 Tauschen' : '🔄 Swap';
    if (isFreeze) return lang === 'de' ? '❄️ Einfrieren' : '❄️ Freeze';
    if (isStuck)  return lang === 'de' ? '📌 Stucken' : '📌 Stuck';
    if (isSteal)  return t.placement.titleSteal[lang];
    if (isPhase2Choice) return t.placement.titlePhase2[lang];
    return t.placement.titlePlace[lang];
  })();

  const instructionText = (() => {
    if (isSwapComeback) return swapFirst ? t.placement.swap2nd[lang] : t.placement.tapOpponent12[lang];
    if (isSwapOne) return swapFirst
      ? (lang === 'de' ? 'Jetzt ein Gegner-Feld tippen' : 'Now tap an opponent\'s cell')
      : (lang === 'de' ? 'Erst ein eigenes Feld tippen' : 'First tap one of your own cells');
    if (isFreeze) return lang === 'de' ? 'Eigenes Feld einfrieren (1 Frage)' : 'Freeze one of your cells (1 question)';
    if (isStuck) return lang === 'de' ? 'Plus-Zentrum wählen (📌 markiert)' : 'Select the plus center (📌 marked)';
    if (isSteal) return t.placement.tapOpponent[lang];
    return t.placement.tapEmpty[lang];
  })();

  return (
    <CozyCard borderColor={actionColor}>
      <div style={{ fontWeight: 900, fontSize: 18, color: actionColor, marginBottom: 12, textAlign: 'center' }}>
        {phaseLabel}
      </div>

      {/* Phase 2: place 2 OR steal 1 */}
      {isPhase2Choice && !selecting && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          <CozyBtn color="#22C55E" onClick={() => chooseFreeAction('PLACE')}>{t.placement.place2[lang]}</CozyBtn>
          <CozyBtn color="#EF4444" onClick={() => chooseFreeAction('STEAL')}>{t.placement.steal1[lang]}</CozyBtn>
        </div>
      )}

      {/* Phase 3/4 FREE: action menu */}
      {showFreeMenu && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {hasFreeCell && (
            <CozyBtn color="#22C55E" onClick={() => chooseFreeAction('PLACE')}>
              {lang === 'de' ? '📍 2 Felder setzen' : '📍 Place 2 cells'}
            </CozyBtn>
          )}
          <CozyBtn color="#EF4444" onClick={() => chooseFreeAction('STEAL')}>
            {lang === 'de' ? '⚡ Feld klauen' : '⚡ Steal a cell'}
          </CozyBtn>
          {phase >= 3 && (
            <CozyBtn color="#60A5FA" onClick={() => chooseFreeAction('FREEZE')}>
              {lang === 'de' ? '❄️ Einfrieren' : '❄️ Freeze a cell'}
            </CozyBtn>
          )}
          {phase >= 4 && (
            <CozyBtn color="#8B5CF6" onClick={() => chooseFreeAction('SWAP')}>
              {lang === 'de' ? '🔄 Tauschen' : '🔄 Swap cells'}
            </CozyBtn>
          )}
          {phase >= 4 && hasStuckCandidate && (
            <CozyBtn color="#F59E0B" onClick={() => chooseFreeAction('STAPEL')}>
              {lang === 'de' ? '📌 Stapeln!' : '📌 Stack!'}
            </CozyBtn>
          )}
        </div>
      )}

      {/* Confirm button before grid appears */}
      {!showFreeMenu && !isPhase2Choice && !selecting && (
        <CozyBtn color={actionColor} onClick={() => setSelecting(true)}>
          {isSwapComeback || isSwapOne ? t.placement.swapBtn[lang]
            : isFreeze ? (lang === 'de' ? '❄️ Feld auswählen' : '❄️ Select cell')
            : isStuck  ? (lang === 'de' ? '📌 Feld auswählen' : '📌 Select cell to stack')
            : isSteal  ? t.placement.confirmSteal[lang]
            : t.placement.confirmPlace[lang]}
        </CozyBtn>
      )}

      {/* Grid */}
      {selecting && (
        <>
          <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 12 }}>
            {instructionText}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${s.gridSize}, ${cellSize}px)`, gap: 4, justifyContent: 'center' }}>
            {s.grid.flatMap((row, r) =>
              row.map((cell, c) => {
                const team = s.teams.find(t => t.id === cell.ownerId);
                const isSwapSelected = swapFirst && swapFirst.r === r && swapFirst.c === c;
                const clickable = isCellClickable(r, c);
                const isFrozenCell = cell.frozen && !cell.stuck;
                const isStuckCell = cell.stuck;
                const isStuckCandidate = isStuck && s.stuckCandidates?.some(sc => sc.row === r && sc.col === c);
                return (
                  <div key={`${r}-${c}`} onClick={() => handleCell(r, c)} style={{
                    width: cellSize, height: cellSize, borderRadius: 6,
                    background: isSwapSelected ? `${actionColor}66`
                      : isStuckCell ? `${team?.color ?? '#F59E0B'}cc`
                      : team ? `${team.color}88` : 'rgba(255,255,255,0.05)',
                    border: isSwapSelected ? `3px solid ${actionColor}`
                      : isStuckCandidate ? `2px solid #F59E0B`
                      : clickable ? `2px solid ${actionColor}` : '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: Math.max(10, cellSize * 0.38),
                    cursor: clickable || isSwapSelected ? 'pointer' : 'default',
                    opacity: clickable || isSwapSelected ? 1 : 0.3,
                    transition: 'all 0.15s',
                    boxShadow: isSwapSelected ? `0 0 14px ${actionColor}88`
                      : isStuckCandidate ? '0 0 10px #F59E0B88'
                      : clickable ? `0 0 8px ${actionColor}44` : 'none',
                    animation: tappedCell === `${r}-${c}` ? 'tccellTap 0.25s ease both' : undefined,
                  }}>
                    {isStuckCell ? '📌' : isFrozenCell ? '❄️' : team ? qqGetAvatar(team.avatarId).emoji : ''}
                  </div>
                );
              })
            )}
          </div>
          <button onClick={() => { setSelecting(false); setSwapFirst(null); setFreeMode(null); }} style={{
            marginTop: 12, width: '100%', padding: '8px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
            color: '#475569', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
          }}>
            {t.placement.cancel[lang]}
          </button>
        </>
      )}
    </CozyCard>
  );
}

function ComebackCard({ state: s, myTeamId, isMine, emit, roomCode, lang = 'de' }: {
  state: QQStateUpdate; myTeamId: string; isMine: boolean; emit: any; roomCode: string; lang?: 'de' | 'en';
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
          <div style={{ fontSize: 14, color: '#F59E0B', fontWeight: 700, marginTop: 8 }}>{t.comeback.otherTeam[lang]}</div>
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
            {lang === 'de' ? '🔄 Tausch wird vorbereitet…' : '🔄 Preparing swap…'}
          </div>
        </CozyCard>
      );
    }
    return (
      <CozyCard borderColor="#F59E0B">
        <div style={{ fontWeight: 800, color: '#e2e8f0', textAlign: 'center', fontSize: 17 }}>
          {s.comebackAction === 'PLACE_2' && t.comeback.activePlace[lang]}
          {s.comebackAction === 'STEAL_1' && t.comeback.activeSteal[lang]}
          {s.comebackAction === 'SWAP_2'  && t.comeback.activeSwap[lang]}
        </div>
      </CozyCard>
    );
  }

  return (
    <CozyCard borderColor="#F59E0B">
      <div style={{ fontWeight: 900, fontSize: 18, color: '#F59E0B', marginBottom: 16, textAlign: 'center' }}>
        {t.comeback.title[lang]}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { action: 'PLACE_2', icon: '📍', label: t.comeback.place2[lang], desc: t.comeback.place2desc[lang], color: '#22C55E' },
          { action: 'STEAL_1', icon: '⚡', label: t.comeback.steal1[lang],   desc: t.comeback.steal1desc[lang],   color: '#EF4444' },
          { action: 'SWAP_2',  icon: '🔄', label: t.comeback.swap2[lang], desc: t.comeback.swap2desc[lang], color: '#8B5CF6' },
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

function GameOverCard({ state: s, myTeamId, lang = 'de' }: { state: QQStateUpdate; myTeamId: string; lang?: 'de' | 'en' }) {
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
            <div style={{ fontSize: 28, fontWeight: 900, color: myTeam?.color }}>{t.gameOver.won[lang]}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 48, marginBottom: 6 }}>{qqGetAvatar(winner.avatarId).emoji}</div>
            <div style={{ fontWeight: 800, color: winner.color, fontSize: 20 }}>{t.gameOver.wins[lang].replace('{name}', winner.name)}</div>
            <div style={{ fontFamily: "'Caveat', cursive", fontSize: 16, color: '#64748b', marginTop: 4 }}>
              {t.gameOver.rank[lang].replace('{n}', String(myRank))}
            </div>
          </>
        )}
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.map((tm, i) => (
            <div key={tm.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12,
              background: tm.id === myTeamId ? `${tm.color}18` : 'rgba(255,255,255,0.03)',
              border: tm.id === myTeamId ? `2px solid ${tm.color}44` : '1px solid rgba(255,255,255,0.06)',
              animation: `tcreveal 0.5s ease ${i * 0.1}s both`,
            }}>
              <span style={{ fontSize: 14, width: 22, color: i === 0 ? '#EAB308' : '#475569', fontWeight: 800 }}>#{i + 1}</span>
              <span style={{ fontSize: 24, lineHeight: 1 }}>{qqGetAvatar(tm.avatarId).emoji}</span>
              <span style={{ fontWeight: 900, color: tm.color, flex: 1 }}>{tm.name}</span>
              <span style={{ fontSize: 13, color: '#64748b' }}>{tm.largestConnected} {t.gameOver.connected[lang]}</span>
            </div>
          ))}
        </div>
      </div>
    </CozyCard>
  );
}

// ─── Waiting screen ────────────────────────────────────────────────────────────
function WaitingScreen({ roomCode, connected, lang = 'de' }: { roomCode: string; connected: boolean; lang?: 'de' | 'en' }) {
  return (
    <div style={{ ...darkPage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{TEAM_CSS}</style>
      <div style={{ textAlign: 'center', color: '#e2e8f0', position: 'relative', zIndex: 5 }}>
        <div style={{ fontSize: 42, marginBottom: 12, animation: 'tcspin 3s linear infinite', display: 'inline-block' }}>⏳</div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Quarter Quiz</div>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 15, color: '#64748b', margin: '8px 0' }}>{t.waiting.room[lang]}: {roomCode}</div>
        <div style={{ fontSize: 12, color: connected ? '#22C55E' : '#EF4444', fontWeight: 700 }}>
          {connected ? t.waiting.loading[lang] : t.waiting.connecting[lang]}
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
    <div style={{ fontSize: 13, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
      {children}
    </div>
  );
}

function StatChip({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ padding: '3px 10px', borderRadius: 999, background: `${color}18`, border: `1px solid ${color}33`, fontSize: 13, fontWeight: 800, color }}>
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
