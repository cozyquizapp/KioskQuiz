import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Fix leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png', iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png' });
import { useQQSocket } from '../hooks/useQQSocket';
import {
  QQ_AVATARS, QQStateUpdate, QQ_CATEGORY_COLORS, QQ_CATEGORY_LABELS,
  QQTeam, qqGetAvatar, QQ_BUNTE_TUETE_LABELS, getFunnyTeamNames, qqMegaFactionName, qqMegaFactionSlug,
} from '../../../shared/quarterQuizTypes';
import { QQ_CAT_ACCENT } from '../qqShared';
import { getRoundColor } from '../qqDesignTokens';
import { QQTeamAvatar, CountryFlagOrEmoji } from '../components/QQTeamAvatar';
import { TeamNameLabel } from '../components/TeamNameLabel';
import { AvatarKarussellEditor } from '../components/AvatarKarussellEditor';
import { JokerIcon } from '../components/JokerIcon';
import { AvatarSetProvider, useAvatarSet } from '../avatarSetContext';
import { AVATAR_SETS, getSet } from '../avatarSets';
import { QQIcon, QQEmojiIcon, qqCatSlug, qqSubSlug } from '../components/QQIcon';
import {
  CozyCard, CozyBtn, StepLabel, StatChip,
  AnimatedDots, CopyButton, MobileFireflies, TeamTimerBar,
} from '../components/CozyQuizTeamPrimitives';
import {
  StandardInput, SubmitBtn, SubmittedBadge,
} from '../components/CozyQuizTeamInputs';
import {
  HelpModal, LeaveQuizConfirm, ReactionPad,
  MobileEurovisionHearts, AckErrorToast,
} from '../components/CozyQuizTeamOverlays';
import {
  TextInput, MuchoInput, AllInInput, Top5Input, FixItInput,
} from '../components/CozyQuizTeamQuestionInputs';
import {
  HotPotatoInput, BluffInput, OnlyConnectInput,
  ImposterInput, PinItInput,
} from '../components/CozyQuizTeamEmitInputs';
import {
  LobbyCard, RulesCard, TeamsRevealCard, PhaseIntroCard,
  PausedCard, FinalBettingCard, FinalRecapHintCard, FinalRevealCard,
  FinalRevealStackPlacementCard,
  GameOverCard, CozyGameCard, TieBreakerCard,
} from '../components/CozyQuizTeamPhaseCards';
import { QuestionCard } from '../components/CozyQuizTeamQuestionCard';
import {
  PlacementCard, ComebackCard, ConnectionsTeamCard, MegaScoringCard,
} from '../components/CozyQuizTeamActionCards';
import { TeamBottomSheetMenu } from '../components/CozyQuizTeamBottomSheet';
import {
  IdentityBanner, YourTurnAlert, MidGameRejoinView, WaitingScreen, PreparingScreen,
} from '../components/CozyQuizTeamLifecycle';
import {
  TEAM_CSS, darkPage, grainOverlay, COZY_CARD_BG,
} from '../components/qqTeamStyles';
import { useExpiry } from '../hooks/useExpiry';
import {
  resumeAudio, setVolume, setSoundConfig, setSfxMuted,
} from '../utils/sounds';
import { haptic } from '../utils/haptics';
import { safeEmit } from '../utils/qqTeamAckBus';
import { formatStammCode, parseStammCodeToTeamId } from '../utils/qqStammCode';
import type { QQAck } from '../../../shared/quarterQuizTypes';
import { QQ_COLORS } from '../../../shared/qqColors';
import { setActiveThemeId, isThemed } from '../qqTheme';

// safeEmit + ACK_ERROR_MESSAGES_* + broadcastAckError jetzt in '../utils/qqTeamAckBus'.

// ── Übersetzungen ─────────────────────────────────────────────────────────────
const t = {
  header: { de: 'COZYQUIZ', en: 'COZYQUIZ' },
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
    submit: { de: 'Abgeben', en: 'Submit' },
    submitted: { de: 'Abgegeben', en: 'Submitted' },
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
};
// TEAM_CSS jetzt in '../components/qqTeamStyles'.

const QQ_ROOM = 'default';

// Beamer-Look fuer Phone-UI (User-Wunsch 2026-05-01: gleicher BG wie Beamer-
// Setup/Lobby + COZY_CARD_BG-Gradient statt flat #1B1510). Spiegelt die
// Konstanten in QQBeamerPage; bewusst dupliziert um Cross-Import auf den
// grossen Beamer-Modul zu vermeiden.
// 2026-05-08 (Aurora-Vivid-Refresh): Phone-BG jetzt analog zum Beamer-Pause-BG
// (Pink/Navy/Magenta) statt Amber/Indigo/Pink. Brand-Konsistenz CozyWolf-
// Theme zwischen Beamer und Team-Phone-View.
const BEAMER_LOBBY_BG =
  'radial-gradient(ellipse at 50% -10%, rgba(236,72,153,0.18), transparent 55%), ' +
  'radial-gradient(ellipse at 85% 110%, rgba(30,42,90,0.20), transparent 55%), ' +
  'radial-gradient(ellipse at 15% 80%, rgba(190,24,93,0.10), transparent 50%), ' +
  '#0A0814';
// COZY_CARD_BG jetzt in '../components/qqTeamStyles'.

// useExpiry-Hook jetzt in '../hooks/useExpiry'.

type SetupStep = 'COLOR' | 'AVATAR' | 'NAME';

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

// formatStammCode + parseStammCodeToTeamId jetzt in '../utils/qqStammCode'.

export default function QQTeamPage() {
  const roomCode = QQ_ROOM;
  // 2026-05-04: SetupFlow auf 3 Steps. avatarId = Color-Slot, emoji =
  // freier Pool-Pick aus aktivem Set, teamName = freier Pool-Pick oder Eingabe.
  const [step, setStep]         = useState<SetupStep>('COLOR');
  const [avatarId, setAvatarId] = useState(() => localStorage.getItem('qq_avatarId') ?? 'fox');
  const [chosenEmoji, setChosenEmoji] = useState<string | undefined>(() => localStorage.getItem('qq_emoji') ?? undefined);
  const [teamName, setTeamName] = useState(() => localStorage.getItem('qq_teamName') ?? '');
  const [teamId, setTeamId]     = useState(getOrCreateTeamId);
  const [joined, setJoined]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  // 2026-05-04 (Wolf): nach Kick darf das Team NICHT auto-rejoinen — sonst
  // ist Kicken sinnlos. Wenn wir hier auf 'kicked' setzen, wird der
  // Auto-Rejoin-Effekt geblockt und Setup-Flow neu gezeigt.
  const [kicked, setKicked] = useState(false);

  // 2026-05-02 (Stamm-Team-Code): Lookup-Status fuer "alten Code eingeben"-Feld.
  const [stammResult, setStammResult] = useState<{
    teamId: string; teamName: string; avatarId: string; wins: number; gamesPlayed: number;
  } | null>(null);
  const [stammStatus, setStammStatus] = useState<'idle' | 'searching' | 'notfound'>('idle');

  async function lookupStammCode(code: string): Promise<void> {
    const candidateTeamId = parseStammCodeToTeamId(code);
    if (!candidateTeamId) {
      setStammStatus('notfound');
      return;
    }
    setStammStatus('searching');
    setStammResult(null);
    const ack: any = await safeEmit(emit, 'qq:lookupRegularTeam', { roomCode, teamId: candidateTeamId });
    if (ack?.ok && ack.team) {
      // Match — switch localStorage + UI state auf den Stamm-Team-Code.
      localStorage.setItem('qq_teamId', candidateTeamId);
      setTeamId(candidateTeamId);
      setAvatarId(ack.team.avatarId ?? 'fox');
      setTeamName(ack.team.teamName ?? '');
      setStammResult({
        teamId: candidateTeamId,
        teamName: ack.team.teamName ?? '',
        avatarId: ack.team.avatarId ?? 'fox',
        wins: ack.team.wins ?? 0,
        gamesPlayed: ack.team.gamesPlayed ?? 0,
      });
      setStammStatus('idle');
    } else {
      setStammStatus('notfound');
      setStammResult(null);
    }
  }

  const { state, connected, emit, reconnect } = useQQSocket(roomCode);

  // Disable Cozy gradient mesh on QQ pages
  useEffect(() => {
    document.body.classList.add('qq-active');
    return () => { document.body.classList.remove('qq-active'); };
  }, []);

  // Skin/Theme: room.themeId vom Beamer-Setup uebernehmen (Default cozy →
  // byte-identisch). Tokens landen auf documentElement, /team-Komponenten
  // ziehen ueber var(--qq-*) mit. Re-Render via state-Update.
  useEffect(() => {
    setActiveThemeId(state?.themeId ?? 'cozy');
  }, [state?.themeId]);

  // Reset joined on disconnect so auto-rejoin fires on reconnect
  useEffect(() => {
    if (!connected && joined) setJoined(false);
  }, [connected]);

  // 2026-07-03 (Wolf 'bei beamer klappts, bei team nicht'): /team muss den Raum
  // schon VOR dem Team-Join abonnieren — sonst kommt kein qq:stateUpdate an und
  // `state` bleibt null. Folge: PreparingScreen-Gate (setupDone) und Fraktions-
  // Bindung (largeGroupMode) feuern nie, weil beide `state` voraussetzen. Der
  // Beamer subscribed genau so via qq:joinBeamer (read-only socket.join, setzt
  // KEINE Team-Daten, ist bereits als Public-Event whitelisted). Idempotent zum
  // späteren qq:joinTeam (socket.join im selben Raum). Rein Frontend, kein
  // Backend-Redeploy nötig.
  useEffect(() => {
    if (!connected) return;
    emit('qq:joinBeamer', { roomCode });
  }, [connected]);

  // Auto-rejoin if we have a stored session — aber nicht wenn wir gerade
  // gekickt wurden (sonst rejoint man sich endlos selbst zurueck).
  useEffect(() => {
    if (joined || !connected || kicked) return;
    // Cozy Arena: Auto-Rejoin darf NICHT den stale Funny-Namen aus localStorage
    // nehmen (Push „Willkommen Hirnsturm"). Name + Emoji sind an die Fraktion
    // gebunden → erzwingen. Erst joinen wenn State da ist, damit largeGroupMode
    // sicher bekannt ist (sonst Race: State noch null → Funny-Name).
    const largeGroup = !!(state as any)?.largeGroupMode;
    if (largeGroup) {
      if (!state) return; // auf State warten
      const storedName = localStorage.getItem('qq_teamName');
      if (!storedName) return; // kein Rejoin-Kandidat → Fraktions-Grid zeigen
      emit('qq:joinTeam', {
        roomCode, teamId,
        teamName: qqMegaFactionName(avatarId, lang),
        avatarId, emoji: qqMegaFactionSlug(avatarId),
      }).then((ack: any) => { if (ack.ok) setJoined(true); });
      return;
    }
    const storedName = localStorage.getItem('qq_teamName');
    if (storedName) {
      // 2026-05-04 (Wolf): Emoji bei Auto-Rejoin mitsenden — sonst zeigt
      // Beamer das Set-Default-Emoji (z.B. Wuerfel) statt das vom Spieler
      // gewaehlte (z.B. Giraffe).
      const storedEmoji = localStorage.getItem('qq_emoji') ?? undefined;
      emit('qq:joinTeam', { roomCode, teamId, teamName: storedName, avatarId, emoji: storedEmoji }).then((ack: any) => {
        if (ack.ok) setJoined(true);
      });
    }
  }, [connected, kicked, (state as any)?.largeGroupMode]);

  // 2026-05-04 (Wolf): Kick-Detection — wenn wir 'joined' waren und im
  // Lobby-State plötzlich nicht mehr in s.teams stehen, wurden wir gekickt.
  // Setup-Flow soll wieder erscheinen, sessionStorage wird geleert.
  useEffect(() => {
    if (!joined || !state) return;
    if (state.phase !== 'LOBBY') return;
    const stillInRoom = !!state.teams.find(t => t.id === teamId);
    if (!stillInRoom) {
      // Wurden gekickt → fresh Setup mit neuen Daten.
      setKicked(true);
      setJoined(false);
      localStorage.removeItem('qq_teamName');
      localStorage.removeItem('qq_avatarId');
      localStorage.removeItem('qq_emoji');
      setTeamName('');
      setStep('COLOR');
    }
  }, [state?.teams.map(t => t.id).join(','), state?.phase, joined, teamId]);

  // 2026-05-02: Late-Join "Wieder dabei als Team X" — wenn sessionStorage
  // weg ist (Tab geschlossen / Inkognito-Mode), aber localStorage teamId noch
  // existiert UND das Team im Room-State drin ist (typisch nach Mid-Game-
  // Reconnect), bieten wir explizit Resume an statt SetupFlow zu zeigen.
  // User-Wunsch 2026-05-02: "sollte es sowas geben wie zurück als team x"
  const existingTeamInRoom = state?.teams.find(t => t.id === teamId) ?? null;
  async function handleResume() {
    if (!existingTeamInRoom) return;
    localStorage.setItem('qq_teamName', existingTeamInRoom.name);
    localStorage.setItem('qq_avatarId', existingTeamInRoom.avatarId);
    setTeamName(existingTeamInRoom.name);
    setAvatarId(existingTeamInRoom.avatarId);
    const ack = await safeEmit(emit, 'qq:joinTeam', {
      roomCode,
      teamId,
      teamName: existingTeamInRoom.name,
      avatarId: existingTeamInRoom.avatarId,
      // 2026-05-04 (Wolf): emoji aus dem bestehenden Team-State uebernehmen,
      // sonst geht der vom Spieler gewaehlte Avatar beim Resume verloren.
      emoji: existingTeamInRoom.emoji ?? undefined,
    });
    // 2026-07-08 (Audit T1): erfolgreicher (Re)Join hebt den kicked-Zustand auf,
    // sonst bleibt Auto-Rejoin fuer den Tab nach einem Session-Restart tot.
    if (ack.ok) { setJoined(true); setKicked(false); }
    else setError(ack.error ?? 'error');
  }

  // Identity-Banner nur bei frischem Join anzeigen, nicht bei Auto-Rejoin.
  const [showIdentityBanner, setShowIdentityBanner] = useState(false);

  async function joinRoom() {
    // Cozy Arena: der Sub-Team-Name IST der Fraktions-Name (avatarId → Fraktion),
    // unabhängig vom Namensfeld/localStorage/Effect-Timing. Sonst blieb ein
    // Alt-Wert („Koala 3") stehen (Wolf 2026-07-03).
    const largeGroup = !!(state as any)?.largeGroupMode;
    const finalName = largeGroup ? qqMegaFactionName(avatarId, lang) : teamName.trim();
    if (!finalName) return;
    setError(null);
    localStorage.setItem('qq_teamName', finalName);
    localStorage.setItem('qq_avatarId', avatarId);
    if (chosenEmoji) localStorage.setItem('qq_emoji', chosenEmoji);
    else localStorage.removeItem('qq_emoji');
    const ack = await safeEmit(emit, 'qq:joinTeam', {
      roomCode, teamId, teamName: finalName, avatarId, emoji: chosenEmoji,
    });
    if (ack.ok) {
      setJoined(true); setShowIdentityBanner(true); setKicked(false);
      // 2026-05-12 (Lobby-Audit P0 #2): Flag setzen damit beim nächsten Visit
      // die Stamm-Code-Card prominent angezeigt wird (statt als Mini-Text-Link).
      try { localStorage.setItem('qq_hasJoinedBefore', '1'); } catch { /* ignore */ }
    }
    else setError(ack.error ?? 'error');
  }

  // Always allow local language override, even in lobby/setup
  const [localLang, setLocalLang] = useState<'de' | 'en'>(() => (localStorage.getItem('qq_lang') as 'de' | 'en') ?? 'de');
  const lang: 'de' | 'en' = localLang;
  const setLang = (l: 'de' | 'en') => { setLocalLang(l); localStorage.setItem('qq_lang', l); };
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

  // 2026-05-09 (Wolf-Mobile-Polish): Im Game-Header (TeamGameView) wandern
  // Sprache + Quiz-Verlassen in ein Bottom-Sheet-Menu. Setup-Flow + MidGame-
  // Rejoin behalten ihre eigene Flag-Toggle (eigenes UX-Pattern dort).
  const [menuOpen, setMenuOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  // 2026-05-11 (Audit P0): Wake-Lock damit Phone-Screen während 3h-Show
  // nicht in den Sleep-Modus geht. Browser-Support: Chrome/Edge/Safari 16.4+.
  // Re-Request bei visibilitychange falls Lock vom OS gelöst wurde.
  useEffect(() => {
    let wakeLock: any = null;
    const wakeLockApi: any = (navigator as any).wakeLock;
    if (!wakeLockApi || typeof wakeLockApi.request !== 'function') return;
    const requestLock = async () => {
      try {
        if (document.visibilityState !== 'visible') return;
        wakeLock = await wakeLockApi.request('screen');
        wakeLock?.addEventListener?.('release', () => { wakeLock = null; });
      } catch { /* Berechtigung verweigert oder OS blockt — silent */ }
    };
    requestLock();
    const onVisibility = () => { if (document.visibilityState === 'visible' && !wakeLock) requestLock(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      try { wakeLock?.release?.(); } catch { /* ignore */ }
      wakeLock = null;
    };
  }, []);
  const handleLeaveQuiz = () => {
    localStorage.removeItem('qq_teamName');
    localStorage.removeItem('qq_avatarId');
    localStorage.removeItem('qq_emoji');
    localStorage.removeItem('qq_teamId');
    if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
    window.location.reload();
  };

  const setId = state?.avatarSetId;
  // 2026-07-01: Groß-Modus (bis 25 Teams > 8 Avatar-Slots) → Slots wiederverwendbar,
  // also keine „belegt"-Sperre. Teams unterscheiden sich über Name + Tier.
  const takenAvatarIds = (state as any)?.largeGroupMode ? [] : (state?.teams ?? []).map(t => t.avatarId);
  // Cozy Arena: mehrere Handys teilen sich eine Fraktion (= gleiches Wappen/Emoji)
  // → keine „belegt"-Sperre auf Emojis, sonst könnte nur 1 Handy pro Fraktion rein.
  const takenEmojis = (state as any)?.largeGroupMode ? [] : (state?.teams ?? []).map(t => t.emoji).filter(Boolean) as string[];
  // Doppelten Team-Namen blocken (case-insensitive, getrimmt). Wenn dasselbe
  // Wort in der Lobby zweimal vorkommt, kann der Mod (und am Ende beim Reveal
  // selbst) nicht mehr unterscheiden wer gemeint ist.
  const takenTeamNamesLower = (state?.teams ?? []).map(t => (t.name ?? '').trim().toLowerCase());

  // 2026-05-12 (Lobby-Audit P0 #3): Auto-Switch-Feedback. Vorher silent
  // gewechselt → Spieler dachte „ich bin pink" und war plötzlich lila ohne
  // Hinweis. Jetzt: kurzer Toast + Vibration bei Auto-Switch.
  const [autoSwitchToast, setAutoSwitchToast] = useState<string | null>(null);
  useEffect(() => {
    if (!autoSwitchToast) return;
    const t = window.setTimeout(() => setAutoSwitchToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [autoSwitchToast]);

  // Auto-switch to a free avatar if current selection gets taken
  useEffect(() => {
    if (!joined && takenAvatarIds.includes(avatarId)) {
      const free = QQ_AVATARS.find(a => !takenAvatarIds.includes(a.id));
      if (free) {
        setAvatarId(free.id);
        // User-Feedback: Vibration + Toast (nur wenn nicht initial-random)
        if (didRandomInit.current) {
          if (navigator.vibrate) navigator.vibrate(40);
          setAutoSwitchToast(lang === 'de'
            ? '⚡ Farbe war weg — du hast jetzt eine neue!'
            : '⚡ Color was taken — picked a new one!');
        }
      }
    }
  }, [takenAvatarIds.join(',')]);

  // 2026-05-04: Beim ersten Mount mit Live-State -> random freie Color +
  // Emoji + Name Vorschlag setzen (wenn nichts in sessionStorage steht).
  // Nicht wenn schon eine sessionStorage-Auswahl vorliegt (Reload-Fall).
  const didRandomInit = useRef(false);
  useEffect(() => {
    if (didRandomInit.current) return;
    if (!state) return;   // warten bis State da ist
    didRandomInit.current = true;
    // Random Color, falls aktuelle ('fox' default) belegt ist oder nichts in storage stand
    const hasStoredColor = !!localStorage.getItem('qq_avatarId');
    if (!hasStoredColor || takenAvatarIds.includes(avatarId)) {
      const free = QQ_AVATARS.filter(a => !takenAvatarIds.includes(a.id));
      if (free.length > 0) {
        const pick = free[Math.floor(Math.random() * free.length)];
        setAvatarId(pick.id);
      }
    }
    // Random Name aus FUNNY_TEAM_NAMES (wenn nichts gespeichert)
    const hasStoredName = !!localStorage.getItem('qq_teamName');
    if (!hasStoredName) {
      const freeNames = getFunnyTeamNames(lang).filter(n => !takenTeamNamesLower.includes(n.trim().toLowerCase()));
      if (freeNames.length > 0) {
        setTeamName(freeNames[Math.floor(Math.random() * freeNames.length)]);
      }
    }
  }, [state, takenAvatarIds.join(','), takenTeamNamesLower.join(',')]);

  // 2026-05-04: Auto-switch fuer chosen emoji wenn ein anderer Spieler ihn nimmt.
  // Plus Random-Init: wenn noch kein Emoji gewaehlt, zieh den ersten freien
  // aus dem Set-Pool (sobald Set + Pool da sind).
  useEffect(() => {
    if (joined) return;
    // Cozy Arena: chosenEmoji ist an die Fraktion gebunden (Wappen-Slug, nicht im
    // cozy3d-Pool) → dieser Set-Pool-Auto-Switch würde es fälschlich zurücksetzen.
    if ((state as any)?.largeGroupMode) return;
    if (!setId) return;
    const set = AVATAR_SETS.find(s => s.id === setId);
    if (!set || set.source === 'png') return;
    const pool = (setId === 'all' && state?.avatarSetEmojis?.length === 8)
      ? state.avatarSetEmojis
      : (set.avatars ?? []);
    if (pool.length === 0) return;
    // Wenn aktueller Emoji belegt oder nicht aus dem Pool: switchen
    const myEmojiInvalid = chosenEmoji && (takenEmojis.includes(chosenEmoji) || !pool.includes(chosenEmoji));
    if (!chosenEmoji || myEmojiInvalid) {
      const freeList = pool.filter(e => !takenEmojis.includes(e));
      if (freeList.length > 0) {
        const pick = freeList[Math.floor(Math.random() * freeList.length)];
        setChosenEmoji(pick);
      }
    }
  }, [takenEmojis.join(','), setId, state?.avatarSetEmojis?.join(','), joined]);

  // setId ist oben schon deklariert; Provider-Branches nutzen ihn.

  if (!joined) {
    // 2026-07-03 (Wolf 'hard reload zeigt ~1s cozy-animals'): solange der erste
    // qq:stateUpdate noch nicht da ist, kennen wir das Format (largeGroupMode)
    // NICHT → NICHT den Default-Avatar-Setup (cozy-animals) raten, sonst blitzt
    // ~1s das falsche Set auf, bis Cozy Arena greift. Bis State da ist: neutraler
    // Branded-Screen (zeigt auch den Verbindungs-Status beim Aufwachen).
    if (!state) {
      return (
        <AvatarSetProvider value={setId}>
          <PreparingScreen
            roomCode={roomCode}
            connected={connected}
            lang={lang}
            onFlagClick={handleFlagClick}
            flagFlip={flagFlip}
          />
        </AvatarSetProvider>
      );
    }
    // 2026-05-06 (Wolf 'kannst du waehrend ein quiz laeuft die lobby in
    // team mit avatar editor und namensgebung ausstellen, sowas wie das
    // quiz laeuft schon — nur fuer reconnect die option mit wieder
    // einsteigen'): Bei laufendem Quiz (phase != LOBBY) wird der volle
    // SetupFlow ausgeblendet — Avatar-Editor + Namensgebung waeren eh
    // sinnlos, weil neue Teams erst zur naechsten Lobby zugelassen sind.
    // Stattdessen MidGameRejoinView: zeigt 'Quiz laeuft schon' + ggf.
    // Reconnect-Button wenn das Team noch im Room steckt.
    if (state && state.phase !== 'LOBBY') {
      return (
        <AvatarSetProvider value={setId} emojis={state.avatarSetEmojis}>
          <MidGameRejoinView
            roomCode={roomCode}
            connected={connected}
            lang={lang}
            existingTeam={existingTeamInRoom}
            onResume={handleResume}
            onFlagClick={handleFlagClick}
            flagFlip={flagFlip}
          />
        </AvatarSetProvider>
      );
    }
    // 2026-07-03 (Wolf 'wie lösen'): „Quiz wird vorbereitet" solange der Mod
    // vorbereitet — gekoppelt an setupDone (sein „Setup abschließen"-Klick),
    // symmetrisch zum Beamer (Neutral/Pre-Game → Lobby). Erst wenn setupDone,
    // ist das Format sicher gewählt → passender Join-Flow. Kein Lobby-Block:
    // die Handys treten NACH „Setup abschließen" bei (weiterhin vor Spielstart).
    // Startet der Mod ohne setupDone, verlässt die Phase die Lobby → Reconnect-
    // Pfad oben greift (kein Lock). Gilt für beide Formate (Wolf-Wahl).
    if (state && state.phase === 'LOBBY' && !state.setupDone) {
      return (
        <AvatarSetProvider value={setId} emojis={state.avatarSetEmojis}>
          <PreparingScreen
            roomCode={roomCode}
            connected={connected}
            lang={lang}
            onFlagClick={handleFlagClick}
            flagFlip={flagFlip}
          />
        </AvatarSetProvider>
      );
    }
    return (
      <AvatarSetProvider value={setId} emojis={state?.avatarSetEmojis}>
        <SetupFlow step={step} setStep={setStep}
          avatarId={avatarId} setAvatarId={setAvatarId}
          chosenEmoji={chosenEmoji} setChosenEmoji={setChosenEmoji}
          teamName={teamName} setTeamName={setTeamName}
          connected={connected} error={error} onJoin={joinRoom}
          lang={lang} onFlagClick={handleFlagClick} flagFlip={flagFlip}
          largeGroup={!!(state as any)?.largeGroupMode}
          takenAvatarIds={takenAvatarIds}
          takenEmojis={takenEmojis}
          takenTeamNamesLower={takenTeamNamesLower}
          serverEmojis={state?.avatarSetEmojis}
          resumeTeam={existingTeamInRoom}
          onResume={handleResume}
          onStammLookup={lookupStammCode}
          stammResult={stammResult}
          stammStatus={stammStatus}
          eurovisionMode={!!state?.theme?.eurovisionMode}
          escBgUrl={state?.theme?.eurovisionMode
            ? (state.theme.mobileBackgroundUrl ?? state.theme.lobbyBackgroundUrl)
            : null}
          autoSwitchToast={autoSwitchToast}
        />
      </AvatarSetProvider>
    );
  }
  if (!state) {
    return (
      <AvatarSetProvider value={setId}>
        <WaitingScreen roomCode={roomCode} connected={connected} lang={lang} />
      </AvatarSetProvider>
    );
  }
  const myTeam = state.teams.find(t => t.id === teamId);
  return (
    // 2026-05-05 (Wolf-Bug 'gelb: grid joker, tabelle geist, /team giraffe'):
    // emojis-prop war hier vergessen → AvatarSetContext.serverEmojis war
    // undefined → Fallback auf hardcoded Default-Set-Emoji statt vom Server
    // konfigurierte Mod-Custom-Emoji-Set. Beamer hatte das schon korrekt,
    // /team hat jetzt die gleiche Datenbasis.
    <AvatarSetProvider value={setId} emojis={state.avatarSetEmojis}>
      <TeamGameView state={state} myTeam={myTeam ?? null} myTeamId={teamId}
        emit={emit} roomCode={roomCode} lang={lang} setLang={setLang} connected={connected} reconnect={reconnect}
        menuOpen={menuOpen} setMenuOpen={setMenuOpen}
        leaveConfirmOpen={leaveConfirmOpen} setLeaveConfirmOpen={setLeaveConfirmOpen}
        onLeaveQuiz={handleLeaveQuiz}
        showIdentityBanner={showIdentityBanner} dismissIdentityBanner={() => setShowIdentityBanner(false)} />
    </AvatarSetProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETUP FLOW
// ═══════════════════════════════════════════════════════════════════════════════

function SetupFlow({ step, setStep, avatarId, setAvatarId,
  chosenEmoji, setChosenEmoji,
  teamName, setTeamName, connected, error, onJoin, lang, onFlagClick, flagFlip,
  largeGroup,
  takenAvatarIds, takenEmojis, takenTeamNamesLower, serverEmojis,
  resumeTeam, onResume, onStammLookup, stammResult, stammStatus,
  eurovisionMode, escBgUrl, autoSwitchToast }: {
  step: string; setStep: (s: any) => void; avatarId: string; setAvatarId: (a: string) => void;
  chosenEmoji: string | undefined; setChosenEmoji: (e: string | undefined) => void;
  teamName: string; setTeamName: (n: string) => void; connected: boolean; error: string | null;
  onJoin: () => void; lang: 'de' | 'en'; onFlagClick: () => void; flagFlip: boolean;
  /** Mega Event: kein Team-Name-Schritt — Sub-Team = Faktion + Nummer. */
  largeGroup?: boolean;
  takenAvatarIds: string[];
  takenEmojis: string[];
  takenTeamNamesLower: string[];
  serverEmojis?: string[];
  resumeTeam: import('../../../shared/quarterQuizTypes').QQTeam | null;
  onResume: () => void;
  onStammLookup: (code: string) => Promise<void>;
  stammResult: { teamId: string; teamName: string; avatarId: string; wins: number; gamesPlayed: number } | null;
  stammStatus: 'idle' | 'searching' | 'notfound';
  /** 2026-05-07 v15 (Wolf '/team kommt eurovision noch nicht an'): SetupFlow
   *  bekommt jetzt auch ESC-Theming, war vorher nur in TeamGameView (post-join). */
  eurovisionMode?: boolean;
  escBgUrl?: string | null;
  /** 2026-05-12 (Lobby-Audit P0 #3): Toast wenn Auto-Switch passierte. */
  autoSwitchToast?: string | null;
}) {
  const [stammInput, setStammInput] = useState('');
  const [stammExpanded, setStammExpanded] = useState(false);
  // Mega Event: kein Name-Schritt — Name automatisch = Faktions-Name (die
  // konkrete „Handy N"-Kennung vergibt die Anzeige nach Beitritts-Reihenfolge).
  useEffect(() => {
    if (largeGroup && avatarId) {
      setTeamName(qqMegaFactionName(avatarId, lang));
      // Cozy Arena: Wappen ist an die Fraktion (Farbe) gekoppelt — chosenEmoji
      // fest auf den Fraktions-Wappen-Slug binden, damit Farbe⟷Wappen kohärent
      // bleiben und keine cozy3d-Tier-Wahl reinrutscht.
      setChosenEmoji(qqMegaFactionSlug(avatarId));
    }
  }, [largeGroup, avatarId]); // eslint-disable-line react-hooks/exhaustive-deps
  const trimmedNameLower = teamName.trim().toLowerCase();
  // Mega Event: Sub-Teams teilen den Faktions-Namen → keine „Name vergeben"-Sperre.
  const nameTaken = !largeGroup && trimmedNameLower.length > 0 && takenTeamNamesLower.includes(trimmedNameLower);
  // Track which avatar was just picked for the burst animation
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [pickedGreeting, setPickedGreeting] = useState<string>('Hi!');
  const pickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 2026-05-04 (Wolf) — Karussell-Editor ist als eigene Komponente in
  // ./components/AvatarKarussellEditor.tsx ausgelagert (haelt Sheet + Touch-State).

  // 2026-05-04 — Avatar-Set aus Context. Bestimmt welches Label unter dem
  // Avatar-Tile gerendert wird: bei PNG-/Cozy-Tier-Sets das Tier-Label
  // ("Hund"/"Dog"), bei Theme-Sets nichts (Emoji ist selbsterklaerend).
  const activeSetId = useAvatarSet();
  const showTierLabel = activeSetId === 'cozyCast' || activeSetId === 'cozyAnimals';

  // 3 zufällige Begrüßungen, sprachabhängig
  const greetings = lang === 'de' ? ['Hi!', 'Hallo!', 'Hey!'] : ['Hi!', 'Hey!', 'Yo!'];

  function handleAvatarPick(id: string) {
    setAvatarId(id);
    setPickedId(id);
    setPickedGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
    if (pickTimer.current) clearTimeout(pickTimer.current);
    pickTimer.current = setTimeout(() => setPickedId(null), 1500);
  }

  // Spark positions for burst effect (8 particles radiating outward)
  const sparks = [
    { sx: '18px', sy: '-22px' }, { sx: '-18px', sy: '-22px' },
    { sx: '24px', sy: '0px' },  { sx: '-24px', sy: '0px' },
    { sx: '16px', sy: '18px' }, { sx: '-16px', sy: '18px' },
    { sx: '22px', sy: '-10px' },{ sx: '-22px', sy: '-10px' },
  ];

  // 2026-05-04 (Wolf): Page-BG nimmt jetzt aktuelle Slot-Farbe als sanften
  // Tint statt fixer goldbrauner Mix. Solange Setup/Lobby — sobald Quiz laeuft
  // (Kategorie-spezifischer BG) uebernimmt TC_CAT_BG. Glow-Lagen subtil
  // gemischt damit Page nicht 'monochrom' wirkt.
  const slot = QQ_AVATARS.find(a => a.id === avatarId);
  const slotColor = slot?.color ?? QQ_COLORS.brandPink;
  const teamTintBg =
    `radial-gradient(ellipse at 50% -10%, ${slotColor}28, transparent 55%), ` +
    `radial-gradient(ellipse at 85% 110%, ${slotColor}14, transparent 55%), ` +
    `radial-gradient(ellipse at 15% 80%, ${slotColor}10, transparent 50%), ` +
    `#0A0814`;
  // 2026-05-07 v15 (Wolf '/team kommt eurovision nicht an'): ESC-BG-Override
  // im Setup analog TeamGameView. ESC-Pink-Lila-Gradient + BG-Image-Layer +
  // Hearts. Cozy-Setup bleibt unveraendert wenn nicht ESC.
  const setupPageBg = eurovisionMode
    ? 'radial-gradient(ellipse at 50% -10%, rgba(255,45,123,0.18), transparent 55%), '
      + 'radial-gradient(ellipse at 85% 110%, rgba(59,130,246,0.10), transparent 55%), '
      + 'radial-gradient(ellipse at 15% 80%, rgba(168,85,247,0.10), transparent 50%), '
      + '#1f0f3d'
    : teamTintBg;

  return (
    <div style={{
      ...darkPage,
      // Skin uebernimmt die Flaeche (wie Beamer-Buehne); cozy behaelt die
      // Team-Tint-Personalisierung. ESC bleibt immer ESC.
      background: isThemed() && !eurovisionMode ? 'var(--qq-bg)' : setupPageBg,
      color: isThemed() ? 'var(--qq-text)' : darkPage.color,
      transition: 'background 800ms ease',
    }} className="qq-team-page">
      <style>{TEAM_CSS}</style>
      <AckErrorToast />
      {/* ESC-BG-Bild als Atmosphere-Layer */}
      {eurovisionMode && escBgUrl && (
        <div aria-hidden style={{
          position: 'fixed', inset: 0,
          backgroundImage: `url(${escBgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.35,
          pointerEvents: 'none',
          zIndex: 0,
        }} />
      )}
      {eurovisionMode && <MobileEurovisionHearts />}
      <div style={grainOverlay} />
      <MobileFireflies color={`${slotColor}66`} />
      <div style={{ width: '100%', maxWidth: 440, margin: '0 auto', padding: '32px 20px', position: 'relative', zIndex: 5 }}>
        <div style={{ textAlign: 'center', marginBottom: 32, position: 'relative' }}>
          {/* 2026-05-04 (Wolf): Brand-Strip moderner — Mini-Wolf-Glyph + clean
              wordmark statt Caveat-cursive '2003-Movie-Credits'-Look. */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '4px 12px', marginBottom: 10,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ fontSize: 12, lineHeight: 1 }}>🐺</span>
            <span style={{
              fontSize: 10, fontWeight: 900,
              color: QQ_COLORS.slate300, letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}>cozywolf</span>
            <span style={{
              width: 3, height: 3, borderRadius: '50%',
              background: 'rgba(203,213,225,0.4)',
            }} />
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: QQ_COLORS.slate400, letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}>live quiz</span>
          </div>
          {/* 2026-07-08 Konsistenz #2: Wordmark = Beamer-Look (League Spartan via
              --font-brand + Brand-Pink), und 'COZY ARENA' im largeGroupMode wie
              der Beamer (CozyQuizLobbyView). Vorher slate-weiss + Nunito. */}
          <div style={{
            fontSize: 40, fontWeight: 900,
            fontFamily: 'var(--font-brand)',
            color: '#EC4899', letterSpacing: '0.03em',
            textShadow: '0 2px 12px rgba(236,72,153,0.3)',
          }}>
            {largeGroup ? 'COZY ARENA' : t.header[lang]}
          </div>
          {/* Always show language flag in setup/lobby.
              2026-05-05 (Phase-8 Bucket-1 B-1): minWidth/minHeight 44 fuer
              TAP_TARGET-Compliance. Vorher ~24x24px Tap-Area, zu klein fuer
              Phone. Flag-Emoji bleibt klein (24px), aber Tap-Ziel ist jetzt
              fingerfreundlich. Konsistent mit Game-Phase-Flag (Phase-4 Bucket-3). */}
          <button
            onClick={onFlagClick}
            style={{
              border: 'none', background: 'none', cursor: 'pointer', padding: 0,
              marginLeft: 8, marginRight: 0, outline: 'none',
              fontSize: 24,
              minWidth: 44, minHeight: 44,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
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
        {/* 2026-05-12 (Lobby-Audit P0 #1): Mini Step-Indicator. Spieler sehen
            in einem Blick wo sie stehen — Avatar → Name → Beitreten. Aktueller
            Step pink, abgeschlossener pink+✓, kommender grau. Nur ohne Resume. */}
        {!resumeTeam && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, marginBottom: 18, fontSize: 11, fontWeight: 800,
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            {(() => {
              const isAvatarStep = step === 'COLOR' || step === 'AVATAR';
              const isNameStep = step === 'NAME';
              // Cozy Arena: Name ist an die Fraktion gebunden (fix) → kein
              // Name-Schritt. Stepper zeigt nur „Fraktion → Los".
              const items = largeGroup
                ? [
                    { label: lang === 'de' ? '1. Fraktion' : '1. Faction', active: isAvatarStep, past: false },
                    { label: lang === 'de' ? '2. Los'      : '2. Go',      active: false,        past: false },
                  ]
                : [
                    { label: lang === 'de' ? '1. Avatar' : '1. Avatar', active: isAvatarStep, past: isNameStep },
                    { label: lang === 'de' ? '2. Name'   : '2. Name',   active: isNameStep,   past: false      },
                    { label: lang === 'de' ? '3. Los'    : '3. Go',     active: false,        past: false      },
                  ];
              return items.map((s, i) => {
                const color = s.active ? QQ_COLORS.brandPink : (s.past ? QQ_COLORS.violet400 : QQ_COLORS.slate600);
                return (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <div style={{ width: 18, height: 2, background: QQ_COLORS.slate700, borderRadius: 1 }} />
                    )}
                    <span style={{ color, transition: 'color 200ms ease' }}>{s.label}</span>
                  </React.Fragment>
                );
              });
            })()}
          </div>
        )}
        {/* 2026-05-12 (Lobby-Audit P0 #3): Auto-Switch-Toast — Spieler bemerkt
            sofort wenn Farbe weg war + automatisch neue zugeteilt wurde. */}
        {autoSwitchToast && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: 'fixed', top: 12, left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 999,
              background: 'rgba(20, 12, 38, 0.92)',
              color: '#FEF3C7',
              border: '1.5px solid #EC4899',
              borderRadius: 14,
              padding: '10px 16px',
              fontSize: 13, fontWeight: 700,
              boxShadow: '0 8px 24px rgba(0,0,0,0.45), 0 0 16px rgba(236,72,153,0.35)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              animation: 'qqToastIn 280ms ease-out',
              maxWidth: 'calc(100vw - 32px)',
              textAlign: 'center',
            }}
          >
            {autoSwitchToast}
          </div>
        )}
        {/* 2026-05-04 (Wolf): Stammcode-Block ist nach UNTER den Avatar-Editor
            verschoben (war vorher zu prominent oben). Siehe weiter unten. */}
        {resumeTeam && (
          <CozyCard anim borderColor={resumeTeam.color || QQ_COLORS.brandPink}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '6px 0 14px',
            }}>
              <QQTeamAvatar avatarId={resumeTeam.avatarId} teamEmoji={resumeTeam.emoji} size={56} style={{
                animation: 'tcfloat 3s ease-in-out infinite',
                filter: `drop-shadow(0 0 12px ${resumeTeam.color}55)`,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: QQ_COLORS.slate400, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 2 }}>
                  {lang === 'de' ? 'Du warst dabei' : 'You were here'}
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: resumeTeam.color || QQ_COLORS.slate100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {resumeTeam.name}
                </div>
              </div>
            </div>
            <CozyBtn color={resumeTeam.color || QQ_COLORS.brandPink} onClick={onResume}>
              {lang === 'de' ? `Wieder dabei als ${resumeTeam.name}` : `Resume as ${resumeTeam.name}`}
            </CozyBtn>
            <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: QQ_COLORS.slate500 }}>
              {lang === 'de' ? 'oder unten neues Team anlegen' : 'or set up a new team below'}
            </div>
          </CozyCard>
        )}
        {step === 'COLOR' && (
          <CozyCard anim borderColor={QQ_COLORS.brandPink}>
            {/* 2026-05-04 (Wolf): Karussell-Avatar-Editor — Slot via Swipe/Pfeile,
                Emoji via Tap auf Hero (Bottom-Sheet), Lobby-voll-Empty-State. */}
            <AvatarKarussellEditor
              avatarId={avatarId}
              setAvatarId={setAvatarId}
              chosenEmoji={chosenEmoji}
              setChosenEmoji={setChosenEmoji}
              takenAvatarIds={takenAvatarIds}
              takenEmojis={takenEmojis}
              activeSetId={activeSetId}
              serverEmojis={serverEmojis}
              lang={lang}
              factionMode={largeGroup}
            />
            {/* Name-Input direkt in derselben Card. Live-Strip „Team "-Prefix
                verhindert „Team Team Regenbogen" beim spaeteren Display.
                Mega Event: ganzer Name-Schritt entfällt (Faktion + Nummer). */}
            {!largeGroup && (<>
            <StepLabel>{t.setup.teamName[lang]}</StepLabel>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input
                value={teamName}
                onChange={e => {
                  const stripped = e.target.value.replace(/^team\s+/i, '');
                  setTeamName(stripped);
                }}
                placeholder={t.setup.placeholder[lang]}
                style={{
                  ...cozyInput,
                  flex: 1,
                  border: nameTaken
                    ? '1px solid rgba(239,68,68,0.55)'
                    : '1px solid rgba(234,179,8,0.25)',
                  background: nameTaken
                    ? 'rgba(239,68,68,0.06)'
                    : 'rgba(234,179,8,0.06)',
                }}
                maxLength={20}
                onKeyDown={e => {
                  if (e.key !== 'Enter') return;
                  const set = getSet(activeSetId);
                  const isPng = (set?.source ?? 'emoji') === 'png';
                  const pool: string[] = isPng
                    ? []
                    : (activeSetId === 'all' && serverEmojis?.length === 8 ? serverEmojis : (set?.avatars ?? []));
                  const needsEmoji = !isPng && pool.length > 0;
                  const ok = !!avatarId && (!needsEmoji || !!chosenEmoji) && !!teamName.trim() && !nameTaken;
                  if (ok) onJoin();
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const free = getFunnyTeamNames(lang).filter(
                    n => !takenTeamNamesLower.includes(n.trim().toLowerCase())
                      && n !== teamName
                  );
                  if (free.length > 0) {
                    setTeamName(free[Math.floor(Math.random() * free.length)]);
                  }
                }}
                title={lang === 'de' ? 'Zufälligen Namen würfeln' : 'Roll a random name'}
                style={{
                  padding: '0 14px', borderRadius: 8,
                  background: 'rgba(234,179,8,0.18)',
                  border: '1px solid rgba(234,179,8,0.4)',
                  color: QQ_COLORS.brandPinkSoft, fontSize: 18,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >🎲</button>
            </div>
            <div style={{
              fontSize: 11, color: QQ_COLORS.slate500, fontWeight: 700,
              marginBottom: 12, letterSpacing: '0.02em',
            }}>
              {lang === 'de'
                ? 'Nur den Namen — „Team " kommt automatisch davor'
                : 'Just the name — "Team " is added automatically'}
            </div>
            {nameTaken && (
              <div style={{ color: '#F87171', fontSize: 13, marginBottom: 8, fontWeight: 700 }}>
                {/* 2026-05-12 (Lobby-Audit P0 #5): expliziter Hinweis auf 🎲-Btn.
                    Vorher saß der Würfel daneben, Verbindung 'Würfel = Lösung'
                    war im lauten Pub nicht offensichtlich. */}
                {lang === 'de'
                  ? '⚠ Dieser Name ist schon vergeben — tippe 🎲 für freien Namen.'
                  : '⚠ Name already taken — tap 🎲 for a free name.'}
              </div>
            )}
            </>)}
            {error && !nameTaken && (
              <div style={{ color: '#F87171', fontSize: 13, marginBottom: 8, fontWeight: 700 }}>{t.setup.error[lang]}</div>
            )}
            {(() => {
              // 2026-05-04 (Wolf-Bug): Caller-Logik konsistent zum
              // AvatarKarussellEditor — needsEmoji nur wenn Pool da ist.
              // Vorher: bei 'all'-Set ohne serverEmojis war pool=[] aber
              // needsEmoji=true → Beitreten ewig disabled.
              const allSlotsTaken = QQ_AVATARS.filter(a => !takenAvatarIds.includes(a.id)).length === 0;
              const set = getSet(activeSetId);
              const isPng = (set?.source ?? 'emoji') === 'png';
              const pool: string[] = isPng
                ? []
                : (activeSetId === 'all' && serverEmojis?.length === 8 ? serverEmojis : (set?.avatars ?? []));
              const needsEmoji = !isPng && pool.length > 0;
              const canJoin = !allSlotsTaken && !!avatarId && (!needsEmoji || !!chosenEmoji) && !!teamName.trim() && !nameTaken;
              return (
                <CozyBtn color={QQ_COLORS.green500} onClick={onJoin} disabled={!canJoin}>
                  {t.setup.join[lang]}
                </CozyBtn>
              );
            })()}
          </CozyCard>
        )}
        {/* Stammcode-Block — 2026-05-04 verschoben von oberhalb der Editor-
            Card (zu prominent) auf unter die Card (Wolf-Wunsch).
            2026-05-12 (Lobby-Audit P0 #2): bei Erstgästen Pink-Dashed-Card
            zu prominent → Pub-Erstbesucher klickten verloren rum. Jetzt:
            - Wenn `qq_hasJoinedBefore` Flag nicht in localStorage (= Erstgast)
              → Stamm-Code als kleiner Text-Link unter dem Beitreten-Btn,
              NICHT als eigene CozyCard.
            - Wenn schon mal gejoined → expandierte Card wie vorher (Stammgäste
              brauchen den Code-Eingabe leichter erreichbar). */}
        {!resumeTeam && step === 'COLOR' && (() => {
          const hasJoinedBefore = (() => {
            try { return localStorage.getItem('qq_hasJoinedBefore') === '1'; } catch { return false; }
          })();
          // Erstgast → mini Text-Link statt prominent Card
          if (!hasJoinedBefore && !stammExpanded && !stammResult) {
            return (
              <div style={{ textAlign: 'center', marginTop: -8, marginBottom: 4 }}>
                <button
                  onClick={() => setStammExpanded(true)}
                  style={{
                    background: 'transparent', border: 'none',
                    color: QQ_COLORS.slate400, fontSize: 12, fontWeight: 700,
                    textDecoration: 'underline', textDecorationStyle: 'dotted',
                    textDecorationColor: 'rgba(236,72,153,0.4)',
                    cursor: 'pointer', fontFamily: 'inherit',
                    padding: '4px 8px',
                  }}
                >
                  {lang === 'de' ? '🔖 Schon mal hier gewesen? Stamm-Code →' : '🔖 Been here before? Regular code →'}
                </button>
              </div>
            );
          }
          // Wiederkehrer ODER Erstgast hat „expandiert" geklickt → CozyCard rendern
          return (
          <CozyCard borderColor={QQ_COLORS.brandPink}>
            {!stammExpanded && !stammResult && (
              <button
                onClick={() => setStammExpanded(true)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  border: '1px dashed rgba(236,72,153,0.45)',
                  background: 'rgba(236,72,153,0.06)',
                  color: QQ_COLORS.brandPinkSoft, fontWeight: 900, fontSize: 13,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
                title={lang === 'de' ? 'Stamm-Code von letzter Woche eingeben' : 'Enter regular code'}
              >
                🔖 {lang === 'de' ? 'Stamm-Code von letzter Woche?' : 'Regular code from last time?'}
              </button>
            )}
            {stammExpanded && !stammResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: QQ_COLORS.brandPink, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  🔖 {lang === 'de' ? 'Stamm-Code eingeben' : 'Enter regular code'}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    value={stammInput}
                    onChange={e => setStammInput(e.target.value)}
                    placeholder="T-ABC123"
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: 8,
                      border: '1px solid rgba(236,72,153,0.4)',
                      background: 'rgba(0,0,0,0.3)', color: QQ_COLORS.brandPinkSoft,
                      fontFamily: 'monospace', fontSize: 16, fontWeight: 700,
                      letterSpacing: '0.04em',
                    }}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <button
                    onClick={() => onStammLookup(stammInput)}
                    disabled={stammStatus === 'searching' || stammInput.trim().length < 4}
                    style={{
                      padding: '10px 16px', borderRadius: 8,
                      border: 'none',
                      background: stammStatus === 'searching' ? QQ_COLORS.slate600 : QQ_COLORS.brandPink,
                      color: '#0A0814', fontWeight: 900, fontSize: 13,
                      cursor: stammStatus === 'searching' ? 'wait' : 'pointer',
                      fontFamily: 'inherit',
                      opacity: stammInput.trim().length < 4 ? 0.5 : 1,
                    }}
                  >
                    {stammStatus === 'searching' ? '…' : (lang === 'de' ? 'Suchen' : 'Search')}
                  </button>
                </div>
                {stammStatus === 'notfound' && (
                  <div style={{ fontSize: 11, color: QQ_COLORS.red500, fontWeight: 700 }}>
                    {lang === 'de' ? 'Code nicht gefunden — neu spielen geht trotzdem.' : 'Code not found — you can still play normally.'}
                  </div>
                )}
                <button
                  onClick={() => { setStammExpanded(false); setStammInput(''); }}
                  style={{
                    background: 'none', border: 'none', color: QQ_COLORS.slate500,
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'inherit', alignSelf: 'flex-start',
                  }}
                >
                  {lang === 'de' ? '← zurueck' : '← back'}
                </button>
              </div>
            )}
            {stammResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: QQ_COLORS.green500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  ✓ {lang === 'de' ? 'Stamm-Team gefunden' : 'Regular team found'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <QQTeamAvatar avatarId={stammResult.avatarId} size={48} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: QQ_COLORS.brandPinkSoft }}>
                      {stammResult.teamName || '—'}
                    </div>
                    <div style={{ fontSize: 12, color: QQ_COLORS.slate400, fontWeight: 700 }}>
                      {lang === 'de'
                        ? `${stammResult.wins} Sieg${stammResult.wins === 1 ? '' : 'e'} · ${stammResult.gamesPlayed} Spiel${stammResult.gamesPlayed === 1 ? '' : 'e'}`
                        : `${stammResult.wins} win${stammResult.wins === 1 ? '' : 's'} · ${stammResult.gamesPlayed} game${stammResult.gamesPlayed === 1 ? '' : 's'}`}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: QQ_COLORS.slate400 }}>
                  {lang === 'de' ? 'Avatar + Name sind eingestellt. Klick auf "Weiter".' : 'Avatar + name set. Click "Next".'}
                </div>
              </div>
            )}
          </CozyCard>
          );
        })()}
        {step === 'AVATAR' && (() => {
          // 2026-05-04 (Wolf): Pool aller Set-Emojis, taken-Filter, Random-Pick
          // wenn nichts gewaehlt. Bei 'all' nutzen wir die server-gewuerfelten
          // Emojis (avatarSetEmojis), sonst den Set-Default-Pool.
          const set = activeSetId === 'all' ? null : getSet(activeSetId);
          const isPng = (set?.source ?? 'emoji') === 'png';
          const pool: string[] = isPng
            ? []
            : (activeSetId === 'all' && serverEmojis?.length === 8 ? serverEmojis : (set?.avatars ?? []));
          // Wenn PNG-Set aktiv (cozyCast): kein Emoji-Picker — direkt zu NAME
          if (isPng) {
            // Beim ersten Mount auto-skip
            return (
              <CozyCard anim borderColor={QQ_COLORS.brandPink}>
                <StepLabel>{lang === 'de' ? 'Avatar' : 'Avatar'}</StepLabel>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <QQTeamAvatar avatarId={avatarId} size={120} />
                  <div style={{ marginTop: 14, fontSize: 14, color: QQ_COLORS.slate400, fontWeight: 700 }}>
                    {lang === 'de' ? 'CozyCast-Avatar — fix zur Farbe' : 'CozyCast avatar — fixed to color'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <CozyBtn color={QQ_COLORS.slate400} onClick={() => setStep('COLOR')}>{lang === 'de' ? '← Zurück' : '← Back'}</CozyBtn>
                  <CozyBtn color={QQ_COLORS.brandPink} onClick={() => setStep('NAME')}>{t.setup.next[lang]}</CozyBtn>
                </div>
              </CozyCard>
            );
          }
          return (
            <CozyCard anim borderColor={QQ_COLORS.brandPink}>
              <StepLabel>{lang === 'de' ? 'Wähle einen Avatar' : 'Pick an avatar'}</StepLabel>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16,
                // cozy3d-Pool ist gross (80) → Scroll-Container, damit „Weiter" erreichbar bleibt.
                maxHeight: pool.length > 16 ? '46vh' : undefined,
                overflowY: pool.length > 16 ? 'auto' : undefined,
                paddingRight: pool.length > 16 ? 4 : undefined,
              }}>
                {pool.map((em, i) => {
                  const taken = takenEmojis.includes(em);
                  const sel = chosenEmoji === em;
                  const myColor = QQ_AVATARS.find(a => a.id === avatarId)?.color ?? QQ_COLORS.brandPink;
                  return (
                    <button
                      key={`${em}-${i}`}
                      onClick={() => !taken && setChosenEmoji(em)}
                      disabled={taken}
                      style={{
                        padding: '14px 4px', borderRadius: 16,
                        cursor: taken ? 'not-allowed' : 'pointer',
                        background: taken
                          ? 'rgba(255,255,255,0.02)'
                          : sel
                            ? `linear-gradient(135deg, ${myColor}33, ${myColor}14)`
                            : 'rgba(255,255,255,0.04)',
                        border: `2px solid ${taken ? 'rgba(255,255,255,0.04)' : sel ? myColor : 'rgba(255,255,255,0.10)'}`,
                        opacity: taken ? 0.32 : 1,
                        fontSize: 36, lineHeight: 1,
                        fontFamily: 'inherit',
                        transition: 'all 0.18s',
                        boxShadow: sel ? `0 0 18px ${myColor}55` : 'none',
                        textDecoration: taken ? 'line-through' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <CountryFlagOrEmoji emoji={em} fontSize={36} />
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <CozyBtn color={QQ_COLORS.slate400} onClick={() => setStep('COLOR')}>{lang === 'de' ? '← Zurück' : '← Back'}</CozyBtn>
                <CozyBtn
                  color={QQ_COLORS.brandPink}
                  onClick={() => setStep('NAME')}
                  disabled={!chosenEmoji}
                >
                  {t.setup.next[lang]}
                </CozyBtn>
              </div>
            </CozyCard>
          );
        })()}
        {step === 'NAME' && (
          <CozyCard anim borderColor={QQ_COLORS.brandPink}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <QQTeamAvatar avatarId={avatarId} teamEmoji={chosenEmoji} size={64} style={{
                margin: '0 auto',
                animation: 'tcfloat 3s ease-in-out infinite',
                filter: 'drop-shadow(0 0 12px rgba(234,179,8,0.3))',
              }} />
            </div>
            <StepLabel>{t.setup.teamName[lang]}</StepLabel>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder={t.setup.placeholder[lang]}
                style={{
                  ...cozyInput,
                  flex: 1,
                  border: nameTaken
                    ? '1px solid rgba(239,68,68,0.55)'
                    : '1px solid rgba(234,179,8,0.25)',
                  background: nameTaken
                    ? 'rgba(239,68,68,0.06)'
                    : 'rgba(234,179,8,0.06)',
                }}
                autoFocus
                maxLength={20}
                onKeyDown={e => e.key === 'Enter' && teamName.trim() && !nameTaken && onJoin()}
              />
              <button
                type="button"
                onClick={() => {
                  // Random witzigen Namen aus dem freien Pool ziehen
                  const free = getFunnyTeamNames(lang).filter(
                    n => !takenTeamNamesLower.includes(n.trim().toLowerCase())
                      && n !== teamName
                  );
                  if (free.length > 0) {
                    setTeamName(free[Math.floor(Math.random() * free.length)]);
                  }
                }}
                title={lang === 'de' ? 'Zufälligen Namen würfeln' : 'Roll a random name'}
                style={{
                  padding: '0 14px', borderRadius: 8,
                  background: 'rgba(234,179,8,0.18)',
                  border: '1px solid rgba(234,179,8,0.4)',
                  color: QQ_COLORS.brandPinkSoft, fontSize: 18,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >🎲</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <CozyBtn color={QQ_COLORS.slate400} onClick={() => setStep('AVATAR')}>{lang === 'de' ? '← Zurück' : '← Back'}</CozyBtn>
            </div>
            {nameTaken && (
              <div style={{ color: '#F87171', fontSize: 13, marginBottom: 8, marginTop: 4, fontWeight: 700 }}>
                {lang === 'de'
                  ? '⚠ Dieser Name ist schon vergeben — bitte anderen wählen.'
                  : '⚠ Name already taken — please choose another.'}
              </div>
            )}
            {error && !nameTaken && (
              <div style={{ color: '#F87171', fontSize: 13, marginBottom: 8, fontWeight: 700 }}>{t.setup.error[lang]}</div>
            )}
            <CozyBtn color={QQ_COLORS.green500} onClick={onJoin} disabled={!teamName.trim() || nameTaken}>
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

function TeamGameView({
  state: s, myTeam, myTeamId, emit, roomCode, lang, setLang,
  connected, reconnect,
  menuOpen, setMenuOpen, leaveConfirmOpen, setLeaveConfirmOpen, onLeaveQuiz,
  showIdentityBanner, dismissIdentityBanner,
}: {
  state: QQStateUpdate; myTeam: QQTeam | null;
  myTeamId: string; emit: any; roomCode: string;
  lang: 'de' | 'en'; setLang: (l: 'de' | 'en') => void;
  connected: boolean; reconnect: () => void;
  menuOpen: boolean; setMenuOpen: (b: boolean) => void;
  leaveConfirmOpen: boolean; setLeaveConfirmOpen: (b: boolean) => void;
  onLeaveQuiz: () => void;
  showIdentityBanner: boolean; dismissIdentityBanner: () => void;
}) {
  const isMyTurn      = s.pendingFor === myTeamId;
  // Bei H/L-Comeback sind ggf. MEHRERE Teams beteiligt (alle tied-letzten).
  // Primary comebackTeamId = Anzeige-Team, comebackHL.teamIds = alle Spieler.
  const isComebackTeam = s.comebackTeamId === myTeamId
    || (s.comebackHL?.teamIds ?? []).includes(myTeamId);
  const teamColor     = myTeam?.color ?? QQ_COLORS.blue500;

  // ── Team sounds ──
  // 2026-05-04 (Wolf): /team-Sounds standardmaessig STUMM. Beamer-Sounds sind
  // die fuehrende Audio-Quelle im Pub; wenn jedes Phone gleichzeitig spielt,
  // ueberlagern sie sich und stoeren das Quiz. Volume hart auf 0 — Mute am
  // Beamer per s.sfxMuted bleibt natuerlich respektiert.
  useEffect(() => {
    setVolume(0);
  }, []);
  useEffect(() => {
    if (s.soundConfig) setSoundConfig(s.soundConfig);
  }, [s.soundConfig]);

  // 2026-05-05 (Wolf-Bug 'sounds auf /team aus, nur /beamer'): Team-Page
  // ist STUMM — Sounds gehoeren ausschliesslich auf den Beamer (zentrale
  // Live-Show). Phone darf vibrieren (haptic) als individuelles Feedback,
  // aber keine Audio-Cues. setSfxMuted ist Modul-global (pro Browser-Tab) —
  // /beamer und /moderator laufen in eigenen Tabs/Sessions, nicht betroffen.
  useEffect(() => {
    setSfxMuted(true);
  }, []);

  // 2026-05-07 (Wolf-Brainstorm 'gruener Glow im BG bei richtiger Antwort'):
  // Vollbild-Backdrop-Glow als Freude-Moment auf dem eigenen Phone, wenn
  // das Team beim Reveal richtig lag. Subtiler als der Beamer (dort ist die
  // grosse Aufdeckung), aber das Phone gibt jedem Team ein eigenes 'wir!'-
  // Signal — 1.8s Pulse, dann fade-out.
  const [correctFlashAt, setCorrectFlashAt] = useState<number | null>(null);
  useEffect(() => {
    if (correctFlashAt === null) return;
    const t = window.setTimeout(() => setCorrectFlashAt(null), 1800);
    return () => window.clearTimeout(t);
  }, [correctFlashAt]);

  const prevPhaseRef = useRef(s.phase);
  const prevQuestionIdRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = s.phase;
    if (s.phase === 'PHASE_INTRO' && prev !== 'PHASE_INTRO') {
      haptic('turn');
    }
    if (s.phase === 'QUESTION_ACTIVE' && s.currentQuestion && s.currentQuestion.id !== prevQuestionIdRef.current) {
      prevQuestionIdRef.current = s.currentQuestion.id;
      haptic('tap');
    }
    if (s.phase === 'QUESTION_REVEAL' && prev === 'QUESTION_ACTIVE') {
      const winners = s.currentQuestionWinners ?? (s.correctTeamId ? [s.correctTeamId] : []);
      const iAmWinner = s.correctTeamId === myTeamId || winners.includes(myTeamId);
      if (s.correctTeamId === myTeamId) {
        haptic('fastest');
      } else if (winners.includes(myTeamId)) {
        haptic('correct');
      } else {
        haptic('wrong');
      }
      if (iAmWinner) setCorrectFlashAt(Date.now());
    }
    if (s.phase === 'PLACEMENT' && prev === 'QUESTION_REVEAL' && s.correctTeamId === myTeamId) {
      haptic('turn');
    }
    if (s.phase === 'GAME_OVER' && prev !== 'GAME_OVER') {
      const sorted = [...s.teams].sort((a, b) =>
        b.largestConnected - a.largestConnected || b.totalCells - a.totalCells);
      if (sorted[0]?.id === myTeamId) {
        haptic('win');
      }
    }
  }, [s.phase, s.correctTeamId, s.currentQuestion?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Joker-Earned-Tracker: wenn jokersEarned für mein Team hochzählt, vibriert
  // das Phone fühlbar — der Joker ist eine eigene Belohnung jenseits der
  // normalen Punktzahl.
  // 2026-05-06 (Wolf 'auf /team nicht angezeigt wenn man einen Joker hat,
  // bitte wie auf /beamer anzeigen und dann wieder ausblenden'):
  // jokerFlashIdx triggert eine Star-Fly-In-Animation auf dem entsprechenden
  // Slot im Header (analog Beamer-jokerStarFly). Slot kippt danach in den
  // 'used'-Look (jokersEarned += 1 = earn UND consume gleichzeitig).
  const prevJokerCountRef = useRef<number>(s.teamPhaseStats[myTeamId]?.jokersEarned ?? 0);
  const [jokerFlashIdx, setJokerFlashIdx] = useState<number | null>(null);
  useEffect(() => {
    const now = s.teamPhaseStats[myTeamId]?.jokersEarned ?? 0;
    if (now > prevJokerCountRef.current) {
      haptic('jokerEarned');
      setJokerFlashIdx(now - 1); // Slot der gerade verbraucht/verdient wurde
    }
    prevJokerCountRef.current = now;
  }, [s.teamPhaseStats, myTeamId]);
  useEffect(() => {
    if (jokerFlashIdx == null) return;
    const t = window.setTimeout(() => setJokerFlashIdx(null), 1100);
    return () => window.clearTimeout(t);
  }, [jokerFlashIdx]);

  // E3 Klau-Toast: wenn ein eigenes Feld gerade geklaut wird.
  const [stolenToast, setStolenToast] = useState<{ id: number; by: string } | null>(null);
  const prevMyOwnedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    // Mega Event: kein Grid → kein Klau-Toast (Felder werden nie geklaut).
    if ((s as any).largeGroupMode) return;
    const myOwned = new Set<string>();
    const grid = s.grid;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c].ownerId === myTeamId) myOwned.add(`${r}-${c}`);
      }
    }
    const prev = prevMyOwnedRef.current;
    let stealer: string | null = null;
    for (const key of prev) {
      if (!myOwned.has(key)) {
        const [r, c] = key.split('-').map(Number);
        const nowOwner = grid[r]?.[c]?.ownerId;
        if (nowOwner && nowOwner !== myTeamId) {
          const t = s.teams.find(tm => tm.id === nowOwner);
          stealer = t?.name ?? '?';
          break;
        }
      }
    }
    prevMyOwnedRef.current = myOwned;
    if (stealer) {
      setStolenToast({ id: Date.now(), by: stealer });
      haptic('stolen');
      setTimeout(() => setStolenToast(null), 3200);
    }
  }, [s.grid, myTeamId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Your-Turn-Alert: beim Aktivwerden in Hot Potato / Imposter.
  const prevHotPotatoActiveRef = useRef<string | null>(null);
  const prevImposterActiveRef  = useRef<string | null>(null);
  const [yourTurnAlert, setYourTurnAlert] = useState<null | { kind: 'hotPotato' | 'imposter' }>(null);
  useEffect(() => {
    // 2026-05-06: Waehrend die Slot-Machine dreht, KEIN Your-Turn-Alert —
    // der feuert sonst sofort wenn der Random-Pick passiert. Wir aktualisieren
    // das prevRef WAEHREND rolling NICHT, sonst landet er auf myTeamId und
    // der spaetere 'finished'-Tick wuerde den Alert nie ausloesen.
    const slotState = (s as any).hotPotatoSlotState;
    if (slotState === 'rolling') return;
    const prevHP = prevHotPotatoActiveRef.current;
    prevHotPotatoActiveRef.current = s.hotPotatoActiveTeamId;
    if (s.hotPotatoActiveTeamId === myTeamId && prevHP !== myTeamId) {
      setYourTurnAlert({ kind: 'hotPotato' });
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
      setTimeout(() => setYourTurnAlert(null), 1500);
    }
  }, [s.hotPotatoActiveTeamId, (s as any).hotPotatoSlotState]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const prevIM = prevImposterActiveRef.current;
    prevImposterActiveRef.current = s.imposterActiveTeamId;
    if (s.imposterActiveTeamId === myTeamId && prevIM !== myTeamId) {
      setYourTurnAlert({ kind: 'imposter' });
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
      setTimeout(() => setYourTurnAlert(null), 1500);
    }
  }, [s.imposterActiveTeamId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Identity-Banner nach ~2.5s automatisch ausblenden.
  useEffect(() => {
    if (!showIdentityBanner) return;
    const h = setTimeout(() => dismissIdentityBanner(), 2600);
    return () => clearTimeout(h);
  }, [showIdentityBanner]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dynamic phase/category accent for glows — match beamer accent colors
  const cat = s.currentQuestion?.category;
  const catAccent = cat ? (QQ_CAT_ACCENT[cat] ?? QQ_CATEGORY_COLORS[cat] ?? '#F9A8D4') : '#F9A8D4';
  const catColor = cat ? (QQ_CATEGORY_COLORS[cat] ?? '#F9A8D4') : '#F9A8D4';
  // Gold for lobby/rules/intro (matches beamer's warm gold fireflies), category accent during questions
  const LOBBY_PINK = '#F9A8D4';
  const phaseAccent = (s.phase === 'QUESTION_ACTIVE' || s.phase === 'QUESTION_REVEAL') ? catAccent
    : s.phase === 'PLACEMENT' ? catAccent
    : s.phase === 'GAME_OVER' ? QQ_COLORS.brandPink
    : LOBBY_PINK;

  // Firefly color — uses accent for vibrant glow matching beamer
  const ffColor = `${phaseAccent}55`;

  // 2026-05-02 (Wolfs Wunsch 'team view immer an die farbe anpassen die gerade
  // auf dem beamer ist'): exakt die gleichen CAT_BG-Strings wie Beamer (siehe
  // QQBeamerPage.tsx CAT_BG). Phone ist schmaler, radial-gradients skalieren
  // mit %, also sieht's aehnlich aus.
  const TC_CAT_BG: Record<string, string> = {
    SCHAETZCHEN:   `radial-gradient(ellipse at 18% 68%, rgba(133,77,14,0.42) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(234,179,8,0.13) 0%, transparent 52%), #0A0814`,
    MUCHO:         `radial-gradient(ellipse at 70% 28%, rgba(29,78,216,0.28) 0%, transparent 55%), radial-gradient(ellipse at 20% 78%, rgba(59,130,246,0.10) 0%, transparent 50%), #0A0814`,
    BUNTE_TUETE:   `radial-gradient(ellipse at 50% 55%, rgba(185,28,28,0.25) 0%, transparent 58%), radial-gradient(ellipse at 14% 18%, rgba(220,38,38,0.11) 0%, transparent 45%), #0A0814`,
    ZEHN_VON_ZEHN: `repeating-linear-gradient(transparent, transparent 39px, rgba(52,211,153,0.03) 39px, rgba(52,211,153,0.03) 40px), radial-gradient(ellipse at 28% 42%, rgba(6,78,59,0.32) 0%, transparent 55%), #0A0814`,
    CHEESE:        `radial-gradient(ellipse at 30% 40%, rgba(91,33,182,0.30) 0%, transparent 55%), radial-gradient(ellipse at 80% 72%, rgba(139,92,246,0.12) 0%, transparent 50%), #0A0814`,
  };

  // Phase-Mapping: bei jeder Phase die Beamer-BG verwenden wenn Kategorie
  // bekannt ist. Sonst LOBBY_BG fallback (Setup/Lobby/Welcome ohne Kategorie).
  const usesBeamerCatBg = !!cat && (
    s.phase === 'QUESTION_ACTIVE' || s.phase === 'QUESTION_REVEAL' ||
    s.phase === 'PLACEMENT' || s.phase === 'PHASE_INTRO' ||
    s.phase === 'COMEBACK_CHOICE' || s.phase === 'CONNECTIONS_4X4'
  );
  // 2026-05-04 (Wolf): vor Quiz-Start (Lobby/Pre-Game) BG in Team-Farbe
  // statt fixer goldbrauner Mix. Sobald Kategorie aktiv ist, uebernimmt
  // TC_CAT_BG. GAME_OVER bleibt im Gold-Spotlight.
  const myTeamColor = myTeam?.color ?? QQ_COLORS.brandPink;
  const teamTintBg =
    `radial-gradient(ellipse at 50% -10%, ${myTeamColor}28, transparent 55%), ` +
    `radial-gradient(ellipse at 85% 110%, ${myTeamColor}14, transparent 55%), ` +
    `radial-gradient(ellipse at 15% 80%, ${myTeamColor}10, transparent 50%), ` +
    `#0A0814`;
  const pageBg = usesBeamerCatBg
    ? (TC_CAT_BG[cat] ?? teamTintBg)
    : s.phase === 'GAME_OVER'
    ? `radial-gradient(ellipse at 50% 30%, rgba(236,72,153,0.15) 0%, transparent 50%), #0A0814`
    : teamTintBg;

  // 2026-05-07 (Wolf 'wenn /team eurovision-spezifisch geht, gerne mit hearts +
  // bg + pink/blau'): Theme-Toggle wie auf dem Beamer — strikt gated ueber
  // s.theme?.eurovisionMode, normales /team bleibt cozy.
  const isEsc = !!s.theme?.eurovisionMode;
  const escBgUrl = isEsc
    ? (s.theme?.mobileBackgroundUrl ?? s.theme?.lobbyBackgroundUrl)
    : null;
  const escPageBg = isEsc
    ? 'radial-gradient(ellipse at 50% -10%, rgba(255,45,123,0.18), transparent 55%), '
      + 'radial-gradient(ellipse at 85% 110%, rgba(59,130,246,0.10), transparent 55%), '
      + 'radial-gradient(ellipse at 15% 80%, rgba(168,85,247,0.10), transparent 50%), '
      + '#1f0f3d'
    : pageBg;
  const finalPageBg = isEsc ? escPageBg : pageBg;

  return (
    <div style={{
      ...darkPage,
      background: isThemed() && !isEsc ? 'var(--qq-bg)' : finalPageBg,
      color: isThemed() ? 'var(--qq-text)' : darkPage.color,
      transition: 'background 0.8s ease',
    }} className="qq-team-page">
      <style>{TEAM_CSS}</style>
      <AckErrorToast />
      {/* 2026-05-07 (Wolf-ESC): Optional BG-Bild als zusaetzliche Atmosphaere-
          Layer hinter dem Gradient. object-fit cover macht 16:9-Asset auf
          portrait Phone zoomen — daher mobileBackgroundUrl-Override-Field. */}
      {isEsc && escBgUrl && (
        <div aria-hidden style={{
          position: 'fixed', inset: 0,
          backgroundImage: `url(${escBgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.35,
          pointerEvents: 'none',
          zIndex: 0,
        }} />
      )}
      {isEsc && <MobileEurovisionHearts />}
      <div style={grainOverlay} />
      <MobileFireflies color={ffColor} />

      {/* 2026-05-07: Gruener Glow-Overlay bei richtiger Antwort.
          radial-gradient von oben+unten + sanftes Pulsieren, 1.8s Anim.
          pointerEvents:none damit Tap-Targets durchgreifen. */}
      {correctFlashAt !== null && (
        <div
          aria-hidden
          key={correctFlashAt}
          style={{
            position: 'fixed', inset: 0,
            pointerEvents: 'none',
            zIndex: 50,
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.32) 0%, transparent 55%),' +
              'radial-gradient(ellipse at 50% 100%, rgba(34,197,94,0.22) 0%, transparent 55%)',
            animation: 'tcCorrectFlash 1.8s ease-out both',
          }}
        />
      )}

      {showIdentityBanner && myTeam && <IdentityBanner team={myTeam} lang={lang} />}
      {yourTurnAlert && myTeam && <YourTurnAlert kind={yourTurnAlert.kind} team={myTeam} lang={lang} />}

      {/* E3 Mobile-Toast: eigenes Feld wurde gerade geklaut. */}
      {stolenToast && (
        <div
          key={stolenToast.id}
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed', top: 14, left: '50%',
            zIndex: 1000,
            padding: '10px 16px', borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(185,28,28,0.95))',
            border: '2px solid rgba(254,202,202,0.6)',
            boxShadow: '0 8px 24px rgba(239,68,68,0.55), 0 0 32px rgba(239,68,68,0.3)',
            color: '#FEF2F2', fontWeight: 900, fontSize: 14,
            display: 'flex', alignItems: 'center', gap: 10,
            maxWidth: 'calc(100vw - 28px)',
            animation: 'tcStolenToast 3.2s ease-out both',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: 22 }}><QQEmojiIcon emoji="⚡"/></span>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
            <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 900, letterSpacing: 0.4 }}>
              {lang === 'de' ? 'FELD GEKLAUT' : 'FIELD STOLEN'}
            </span>
            <span>{stolenToast.by} {lang === 'de' ? 'hat dir ein Feld geklaut!' : 'stole a cell from you!'}</span>
          </div>
        </div>
      )}

      <div style={{
        width: '100%', maxWidth: 640, margin: '0 auto',
        padding: 'max(14px, env(safe-area-inset-top)) 14px max(28px, calc(env(safe-area-inset-bottom) + 12px)) 14px',
        position: 'relative', zIndex: 5,
      }}>

        {/* Team header — 2026-05-09 (Wolf-Mobile-Polish „Konzept A Premium Glass"):
            Schlanker Header mit Avatar + Teamname + ⋯-Menue-Button. Sprache + Quiz-
            Verlassen wandern in Bottom-Sheet-Menu. Joker werden NICHT mehr permanent
            angezeigt — nur als top-toast bei Earn-Flash. Frosted-Glass-BG via
            backdrop-filter. */}
        {myTeam && (
          <header style={{
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: 16,
            padding: '14px 16px',
            borderRadius: 22,
            background: 'rgba(31, 26, 46, 0.55)',
            backdropFilter: 'blur(20px) saturate(160%)',
            WebkitBackdropFilter: 'blur(20px) saturate(160%)',
            border: `1px solid ${myTeam.color}40`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
            position: 'relative',
          }}>
            <QQTeamAvatar avatarId={myTeam.avatarId} teamEmoji={myTeam.emoji} size={44} style={{ flexShrink: 0 }} />
            <TeamNameLabel
              name={myTeam.name}
              maxLines={1}
              shrinkAfter={14}
              fontSize={22}
              color={myTeam.color}
              fontWeight={900}
              style={{ flex: 1, minWidth: 0, textShadow: `0 0 16px ${myTeam.color}66`, letterSpacing: '-0.01em' }}
            />
            <button
              onClick={() => { setMenuOpen(true); if (navigator.vibrate) navigator.vibrate(8); }}
              aria-label={lang === 'de' ? 'Menü öffnen' : 'Open menu'}
              style={{
                flexShrink: 0,
                width: 44, height: 44, borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.10)',
                background: 'rgba(255,255,255,0.04)',
                color: QQ_COLORS.slate200, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s, transform 0.15s',
                fontFamily: 'inherit',
              }}
              onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.94)'; }}
              onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseDown={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
              onMouseUp={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                <line x1="3" y1="6.5" x2="19" y2="6.5" />
                <line x1="3" y1="11" x2="19" y2="11" />
                <line x1="3" y1="15.5" x2="19" y2="15.5" />
              </svg>
            </button>
          </header>
        )}

        {/* Joker-Earned-Toast — top-center, ~3s, dann weg. Ersetzt den permanenten
            Joker-Counter im Header (Wolf-Wunsch 2026-05-09: „Joker nerven mich"). */}
        {myTeam && jokerFlashIdx !== null && s.teamPhaseStats[myTeamId] && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: 'fixed',
              top: 'max(16px, calc(env(safe-area-inset-top) + 8px))',
              left: '50%',
              zIndex: 1001,
              padding: '12px 18px',
              borderRadius: 22,
              background: 'linear-gradient(135deg, rgba(236,72,153,0.95), rgba(162,18,71,0.95))',
              border: '1px solid rgba(252,231,243,0.55)',
              boxShadow: '0 16px 48px rgba(236,72,153,0.55), 0 0 32px rgba(236,72,153,0.30)',
              color: '#FDF2F8', fontWeight: 900, fontSize: 14,
              display: 'flex', alignItems: 'center', gap: 12,
              animation: 'tcJokerBanner 3s ease-out both',
              pointerEvents: 'none',
              maxWidth: 'calc(100vw - 32px)',
            }}
          >
            <JokerIcon i={jokerFlashIdx} size={32} eurovisionMode={!!s.theme?.eurovisionMode} alt="" style={{ width: 32, height: 32 }} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <span style={{ fontSize: 11, opacity: 0.85, letterSpacing: 0.5 }}>
                {lang === 'de' ? '+1 JOKER' : '+1 JOKER'}
              </span>
              <span>{lang === 'de' ? 'verfügbar' : 'available'}</span>
            </div>
          </div>
        )}

        {/* Disconnect banner with manual reconnect */}
        {!connected && (
          <div role="alert" style={{
            padding: '12px 16px', borderRadius: 16, marginBottom: 12, textAlign: 'center',
            background: '#7F1D1D', border: '1px solid #EF4444', color: QQ_COLORS.red300,
            fontWeight: 900, fontSize: 13,
          }}>
            <div style={{ marginBottom: 8, animation: 'tcpulse 2s infinite' }}>
              {lang === 'de' ? '⚠️ Verbindung unterbrochen — verbinde neu…' : '⚠️ Connection lost — reconnecting…'}
            </div>
            {/* 2026-05-05 (Phase-8 Bucket-1 B-2): minHeight 44 fuer TAP_TARGET.
                Vorher padding: '8px 20px' + 13px Font ergab ~32px Hoehe — zu
                klein fuer Phone, gerade im Disconnect-Stress. */}
            <button onClick={reconnect} style={{
              padding: '12px 22px', minHeight: 44, borderRadius: 8, fontFamily: 'inherit',
              fontWeight: 900, fontSize: 14, cursor: 'pointer',
              background: 'rgba(239,68,68,0.25)', border: '1px solid #EF4444',
              color: QQ_COLORS.red300, animation: 'tcbtnpop 0.3s ease both',
            }}>
              {lang === 'de' ? '🔄 Jetzt neu verbinden' : '🔄 Reconnect now'}
            </button>
          </div>
        )}

        {/* Phase content — 2026-05-11 (Audit P0): Cross-Fade pro Phase via
            key-basierter Re-Mount + tcreveal-Animation. Vorher hartes Unmount/
            Mount zwischen 11 Phase-Cards = ruckiger Wechsel ohne Übergang. */}
        <div aria-live="polite" aria-atomic="false"
          key={`phase-${s.phase}`}
          style={{ animation: 'tcreveal 0.32s ease both' }}>
        {s.phase === 'LOBBY'           && <LobbyCard state={s} myTeam={myTeam} lang={lang} />}
        {s.phase === 'RULES'           && <RulesCard lang={lang} />}
        {s.phase === 'TEAMS_REVEAL'    && <TeamsRevealCard myTeam={myTeam} lang={lang} />}
        {s.phase === 'PHASE_INTRO'     && <PhaseIntroCard state={s} lang={lang} />}
        {/* 2026-05-09 (Wolf): während Final-Recap (zwischen Final-Fragen)
            zeigt /team einen Hinweis-Text statt der normalen QuestionCard /
            PlacementCard. So bekommt der Spieler etwas Konkretes auf seinem
            Phone, während der Beamer die Standings zeigt. Nur wenn finalWager
            an UND wir in der Final-Phase sind. */}
        {(s as any).finalRecapStep === 1
          && s.finalWagerEnabled
          && s.gamePhaseIndex === s.totalPhases ? (
          <FinalRecapHintCard state={s} myTeamId={myTeamId} lang={lang} />
        ) : (
          <>
            {(s.phase === 'QUESTION_ACTIVE' || s.phase === 'QUESTION_REVEAL') && (
              <QuestionCard state={s} myTeamId={myTeamId} emit={emit} roomCode={roomCode} lang={lang} />
            )}
            {s.phase === 'PLACEMENT' && (
              // Mega Event: keine Grid-Aktion („eure Aktion" fällt weg) — statt
              // der PlacementCard die transparente Farb-Wertung fürs Sub-Team.
              (s as any).largeGroupMode
                ? <MegaScoringCard state={s} myTeamId={myTeamId} lang={lang} />
                : <PlacementCard state={s} myTeamId={myTeamId} isMyTurn={isMyTurn} emit={emit} roomCode={roomCode} lang={lang} />
            )}
          </>
        )}
        {/* 2026-07-03 (Wolf-Audit): Comeback + 4×4-Finale sind in Cozy Arena
            backend-seitig deaktiviert → defensiv gaten, damit kein Grid/Steal/
            Only-Connect-UI auf ein Arena-Handy gemalt werden kann. */}
        {!(s as any).largeGroupMode && s.phase === 'COMEBACK_CHOICE' && (
          <ComebackCard state={s} myTeamId={myTeamId} isMine={isComebackTeam} emit={emit} roomCode={roomCode} lang={lang} />
        )}
        {!(s as any).largeGroupMode && s.phase === 'CONNECTIONS_4X4' && (() => {
          // 4×4-Finale Sub-Phasen:
          // - active/reveal: ConnectionsTeamCard zeigt das 16-Items-Grid bzw. die
          //   Status-Card.
          // - placement + ich bin pendingFor: standard PlacementCard rendern,
          //   damit ich auf das echte Spielfeld tappen kann (sonst stand nur
          //   „Schaut auf den Beamer" da, Grid kam nie).
          if (s.connections?.phase === 'placement' && s.pendingFor === myTeamId) {
            return <PlacementCard state={s} myTeamId={myTeamId} isMyTurn={true} emit={emit} roomCode={roomCode} lang={lang} />;
          }
          return <ConnectionsTeamCard state={s} myTeamId={myTeamId} emit={emit} roomCode={roomCode} lang={lang} />;
        })()}
        {s.phase === 'FINAL_BETTING' && (
          <FinalBettingCard state={s} myTeamId={myTeamId} emit={emit} roomCode={roomCode} lang={lang} />
        )}
        {s.phase === 'FINAL_REVEAL' && (
          s.finalRevealPendingStacks?.teamId === myTeamId && (s.finalRevealPendingStacks?.kinds.length ?? 0) > 0
            ? <FinalRevealStackPlacementCard state={s} myTeamId={myTeamId} emit={emit} roomCode={roomCode} lang={lang} />
            : <FinalRevealCard state={s} myTeamId={myTeamId} lang={lang} />
        )}
        {s.phase === 'COZY_GAME' && (
          <CozyGameCard state={s} myTeamId={myTeamId} lang={lang} />
        )}
        {s.phase === 'PAUSED' && <PausedCard state={s} myTeamId={myTeamId} lang={lang} />}
        {s.phase === 'TIEBREAKER_QUESTION' && (
          <TieBreakerCard state={s} myTeamId={myTeamId} emit={emit} roomCode={roomCode} lang={lang} />
        )}
        {(s.phase === 'GAME_OVER' || s.phase === 'THANKS') && <GameOverCard state={s} myTeamId={myTeamId} lang={lang} roomCode={roomCode} />}
        </div>

        {/* Live-Reactions-Pad — sichtbar in passiven Beobachter-Phasen.
            Spieler tappen ein Emoji; das fliegt als Mini-Burst über den Beamer.
            Backend rate-limit (4 pro 5s pro Team) gegen Spam.
            2026-05-02 (App-Designer-Audit): PHASE_INTRO + TEAMS_REVEAL raus —
            das sind Show-Momente am Beamer, Phone-Reaktionen lenken davon ab.
            Reactions nur in echten Wartezustaenden (Reveal/Placement/Pause/Ende). */}
        {(s.phase === 'QUESTION_REVEAL' || s.phase === 'PLACEMENT'
          || s.phase === 'PAUSED' || s.phase === 'GAME_OVER' || s.phase === 'THANKS') && (
          <ReactionPad emit={emit} roomCode={roomCode} myTeamId={myTeamId} accent={phaseAccent} lang={lang} />
        )}

        {/* Phase stats */}
        {myTeam && s.teamPhaseStats[myTeamId] && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {s.teamPhaseStats[myTeamId].stealsUsed > 0 && (
              <StatChip label={`⚡ ${s.teamPhaseStats[myTeamId].stealsUsed} ${t.stats.stolen[lang]}`} color={QQ_COLORS.red500} />
            )}
            {/* Joker count moved to header as 2 star slots */}
          </div>
        )}

        {/* CozyWolf brand footer
            2026-05-05 (Wolf): borderTop entfernt — wirkte wie unsichtbare
            Linie ueber dem Copyright. Footer braucht kein Trenner, das
            margin reicht. */}
        <div style={{
          marginTop: 24, paddingTop: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: 0.4, userSelect: 'none',
        }}>
          <img
            src="/logo.png"
            alt=""
            style={{ width: 18, height: 18, objectFit: 'contain' }}
          />
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
            color: QQ_COLORS.slate400, textTransform: 'uppercase',
          }}>
            CozyWolf · © 2026
          </span>
        </div>
      </div>

      {/* Bottom-Sheet-Menu (Mobile-Native iOS-Stil) — Sprache + Quiz verlassen */}
      {menuOpen && (
        <TeamBottomSheetMenu
          lang={lang}
          setLang={setLang}
          onClose={() => setMenuOpen(false)}
          onLeaveRequest={() => { setMenuOpen(false); setLeaveConfirmOpen(true); }}
          jokersAvailable={(s as any).largeGroupMode ? 0 : Math.max(0, 2 - (s.teamPhaseStats[myTeamId]?.jokersEarned ?? 0))}
          jokersTotal={(s as any).largeGroupMode ? 0 : 2}
          eurovisionMode={!!s.theme?.eurovisionMode}
          state={s}
          myTeamId={myTeamId}
        />
      )}

      {/* Leave-Quiz-Confirm Dialog */}
      {leaveConfirmOpen && (
        <LeaveQuizConfirm
          lang={lang}
          onCancel={() => setLeaveConfirmOpen(false)}
          onConfirm={() => { setLeaveConfirmOpen(false); onLeaveQuiz(); }}
        />
      )}
    </div>
  );
}

// IdentityBanner + YourTurnAlert jetzt in '../components/CozyQuizTeamLifecycle'.

// ═══════════════════════════════════════════════════════════════════════════════
// Phase cards
// ═══════════════════════════════════════════════════════════════════════════════

// LobbyCard / RulesCard / TeamsRevealCard / PhaseIntroCard jetzt in
// '../components/CozyQuizTeamPhaseCards'.

// QuestionCard / AnswerInput / hashString jetzt in
// '../components/CozyQuizTeamQuestionCard'.


// HotPotatoInput / BluffInput / OnlyConnectInput / ImposterInput / MapClickHandler /
// PinItInput jetzt in '../components/CozyQuizTeamEmitInputs'.

// FreeAction type, PlacementCard, ComebackCard, ConnectionsTeamCard +
// ConnectionsTeamTimer jetzt in '../components/CozyQuizTeamActionCards'.


// FinalBettingCard / FinalRecapHintCard / FinalRevealCard / PausedCard /
// GameOverCard jetzt in '../components/CozyQuizTeamPhaseCards'.

// MidGameRejoinView + WaitingScreen jetzt in '../components/CozyQuizTeamLifecycle'.

// ═══════════════════════════════════════════════════════════════════════════════
// Shared UI primitives
// ═══════════════════════════════════════════════════════════════════════════════

// CozyCard jetzt in '../components/CozyQuizTeamPrimitives' (siehe Import oben).

// ─────────────────────────────────────────────────────────────────────────
// TeamBottomSheetMenu — iOS-style bottom-sheet mit Sprache + Quiz verlassen.
// 2026-05-09 (Wolf-Mobile-Polish „Konzept A"): zentrales Menue im Game-Header,
// loest die alte Inline-Sprach-Flag im Header ab. Joker-Counter optional als
// Read-Only-Sektion (Wolf wollte Joker NICHT permanent im Header — hier ist
// es als Info-Zeile ok, im Bottom-Sheet stoert es niemanden).
// ─────────────────────────────────────────────────────────────────────────
// TeamBottomSheetMenu jetzt in '../components/CozyQuizTeamBottomSheet'.


// ─────────────────────────────────────────────────────────────────────────
// HelpModal — kompakte Quick-Reference. 4-5 Bullet-Points, kein Slide-System.
// ─────────────────────────────────────────────────────────────────────────
// ── Styles ─────────────────────────────────────────────────────────────────────
// darkPage + grainOverlay jetzt in '../components/qqTeamStyles'.
const cozyInput: React.CSSProperties = {
  width: '100%', padding: '14px 16px', borderRadius: 16, marginBottom: 12,
  border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)',
  color: QQ_COLORS.slate100, fontFamily: 'inherit', fontSize: 17, fontWeight: 700,
  boxSizing: 'border-box',
  // 2026-05-04 (UI-Audit P0-2): outline:none entfernt — Browser-Default-Outline
  // bleibt beim Focus sichtbar (Tab-Navigation lesbar). focusring im /team-CSS
  // (qq-team-input) hat zusaetzlich einen amber-Outline mit offset 2px.
};

// AckErrorToast lebt jetzt in '../components/CozyQuizTeamOverlays'.
// safeEmit() oben broadcastet via qqTeamAckBus.broadcastAckError → AckErrorToast lauscht.
