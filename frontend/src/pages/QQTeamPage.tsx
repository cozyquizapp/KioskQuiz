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
  QQTeam, qqGetAvatar, QQ_BUNTE_TUETE_LABELS, getFunnyTeamNames,
} from '../../../shared/quarterQuizTypes';
import { QQ_CAT_ACCENT } from '../qqShared';
import { getRoundColor } from '../qqDesignTokens';
import { QQTeamAvatar } from '../components/QQTeamAvatar';
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
import { useExpiry } from '../hooks/useExpiry';
import {
  resumeAudio, setVolume, setSoundConfig, setSfxMuted,
} from '../utils/sounds';
import { haptic } from '../utils/haptics';
import { broadcastAckError } from '../utils/qqTeamAckBus';
import type { QQAck } from '../../../shared/quarterQuizTypes';

// ── Server-Ack-Error-Mapping ─────────────────────────────────────────────────
// safeEmit() wrappt emit() und broadcastet ein window-Event bei !ack.ok via
// qqTeamAckBus.broadcastAckError. AckErrorToast (in CozyQuizTeamOverlays.tsx)
// lauscht und zeigt 3 Sek lang ein Toast.

const ACK_ERROR_MESSAGES_DE: Record<string, string> = {
  TIMER_EXPIRED:   '⏰ Zu spät — Phase ist gerade vorbei',
  WRONG_PHASE:     '⏰ Antwort kam nicht durch — Phase wechselt gerade',
  NOT_YOUR_TURN:   '🚫 Nicht dein Zug',
  ALREADY_ANSWERED:'✓ Antwort wurde bereits gespeichert',
  RATE_LIMITED:    '⏳ Zu schnell, kurz Pause',
  NOT_CONNECTED:   '📡 Keine Verbindung — versuch nochmal',
  TIMEOUT:         '📡 Server-Antwort dauerte zu lang',
  '*':             '❌ Aktion fehlgeschlagen',
};
const ACK_ERROR_MESSAGES_EN: Record<string, string> = {
  TIMER_EXPIRED:   '⏰ Too late — phase just ended',
  WRONG_PHASE:     '⏰ Submit missed — phase is changing',
  NOT_YOUR_TURN:   '🚫 Not your turn',
  ALREADY_ANSWERED:'✓ Already submitted',
  RATE_LIMITED:    '⏳ Slow down — short cooldown',
  NOT_CONNECTED:   '📡 No connection — try again',
  TIMEOUT:         '📡 Server took too long',
  '*':             '❌ Action failed',
};

async function safeEmit(
  emitFn: (event: string, payload?: unknown) => Promise<QQAck>,
  event: string,
  payload: unknown,
  lang: 'de' | 'en' = 'de',
): Promise<QQAck> {
  const ack = await emitFn(event, payload);
  if (!ack.ok) {
    const map = lang === 'de' ? ACK_ERROR_MESSAGES_DE : ACK_ERROR_MESSAGES_EN;
    const code = ack.code ?? 'UNKNOWN';
    const msg = map[code] ?? map['*'] ?? ack.error ?? 'Fehler';
    broadcastAckError(msg);
  }
  return ack;
}

// ── Übersetzungen ─────────────────────────────────────────────────────────────
const t = {
  header: { de: 'CozyQuiz', en: 'CozyQuiz' },
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
  @keyframes tcCorrectFlash {
    0%   { opacity: 0; }
    18%  { opacity: 1; }
    55%  { opacity: 0.85; }
    100% { opacity: 0; }
  }
  /* 2026-05-10 (Audit P0-1): AckErrorToast Entry-Animation. */
  @keyframes tcAckToastIn {
    0%   { opacity: 0; transform: translateX(-50%) translateY(-16px); }
    100% { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  /* 2026-05-12 (Lobby-Audit P0 #3): Auto-Switch-Toast Entry-Animation. */
  @keyframes qqToastIn {
    0%   { opacity: 0; transform: translateX(-50%) translateY(-12px) scale(0.96); }
    60%  { opacity: 1; transform: translateX(-50%) translateY(2px) scale(1.02); }
    100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  }
  @keyframes qqTeamPinDrop {
    0%   { transform: translateY(-40px) scale(0.6); opacity: 0; }
    60%  { transform: translateY(4px) scale(1.08); opacity: 1; }
    80%  { transform: translateY(-2px) scale(0.96); }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }
  @keyframes tcbtnpop  { 0%{transform:scale(0.96)} 60%{transform:scale(1.04)} 100%{transform:scale(1)} }
  @keyframes tcsuccess { 0%{transform:scale(1)} 30%{transform:scale(1.06)} 60%{transform:scale(0.98)} 100%{transform:scale(1)} }
  @keyframes tcoptIn   { from{opacity:0;transform:translateY(18px) scale(0.94)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes tcwheelslide { from{transform:translateY(var(--from,0px));opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes tccheckpop { from{transform:scale(0)} to{transform:scale(1)} }
  @keyframes tcsuccessGlow {
    0%, 100% { box-shadow: 0 0 36px rgba(34,197,94,0.18), 0 6px 20px rgba(0,0,0,0.4); }
    50%      { box-shadow: 0 0 52px rgba(34,197,94,0.4), 0 0 100px rgba(34,197,94,0.15), 0 6px 20px rgba(0,0,0,0.4); }
  }
  @keyframes tcStolenToast {
    0%   { transform: translate(-50%, -120%); opacity: 0; }
    10%  { transform: translate(-50%, 0); opacity: 1; }
    80%  { transform: translate(-50%, 0); opacity: 1; }
    100% { transform: translate(-50%, -40%); opacity: 0; }
  }
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
  @keyframes tccellPendingPulse {
    0%, 100% { transform: scale(1.04); filter: brightness(1.05); }
    50%      { transform: scale(1.10); filter: brightness(1.18); }
  }
  @keyframes tcTimerPulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50%      { transform: scale(1.12); opacity: 0.85; }
  }
  @keyframes frostPulse {
    0%, 100% { box-shadow: 0 0 6px rgba(147,210,255,0.3), inset 0 0 4px rgba(147,210,255,0.1); border-color: rgba(147,210,255,0.6); }
    50%      { box-shadow: 0 0 12px rgba(147,210,255,0.6), inset 0 0 8px rgba(147,210,255,0.25); border-color: rgba(147,210,255,1); }
  }
  @keyframes tcCellClaim {
    0%   { transform: scale(0.5); opacity: 0; }
    40%  { transform: scale(1.15); opacity: 1; }
    70%  { transform: scale(0.95); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes tcffmove {
    0%   { transform: translate(0,0) scale(1); opacity: 0; }
    10%  { opacity: 0.7; }
    45%  { transform: translate(var(--dx,20px), var(--dy,-30px)) scale(1.2); opacity: 0.5; }
    90%  { opacity: 0.6; }
    100% { transform: translate(0,0) scale(1); opacity: 0; }
  }
  @keyframes tcCellGlow {
    0%   { box-shadow: 0 0 0 rgba(255,255,255,0); }
    50%  { box-shadow: 0 0 14px var(--cell-color, rgba(255,255,255,0.5)); }
    100% { box-shadow: 0 0 4px var(--cell-color, rgba(255,255,255,0.2)); }
  }
  @keyframes tcAvatarPick {
    0%   { transform: scale(1) translateY(0) rotate(0deg); }
    12%  { transform: scale(1.38) translateY(-10px) rotate(-14deg); }
    28%  { transform: scale(0.82) translateY(6px) rotate(11deg); }
    44%  { transform: scale(1.20) translateY(-6px) rotate(-7deg); }
    60%  { transform: scale(0.94) translateY(2px) rotate(4deg); }
    78%  { transform: scale(1.06) translateY(0) rotate(-2deg); }
    100% { transform: scale(1) translateY(0) rotate(0deg); }
  }
  @keyframes tcAvatarGlow {
    0%   { filter: drop-shadow(0 0 0 transparent); }
    20%  { filter: drop-shadow(0 0 14px var(--g, rgba(255,255,255,0.9))) drop-shadow(0 0 24px var(--g, rgba(255,255,255,0.5))); }
    100% { filter: drop-shadow(0 0 0 transparent); }
  }
  @keyframes tcAvatarRing {
    0%   { transform: scale(0.5); opacity: 1; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes tcAvatarSpark {
    0%   { transform: translate(0,0) scale(1); opacity: 1; }
    100% { transform: translate(var(--sx,10px), var(--sy,-20px)) scale(0); opacity: 0; }
  }
  @keyframes tcAvatarHi {
    0%   { opacity: 0; transform: scale(0.3) translate(-6px, 8px) rotate(-18deg); }
    18%  { opacity: 1; transform: scale(1.25) translate(0, 0) rotate(10deg); }
    32%  { transform: scale(0.92) rotate(-4deg); }
    48%  { transform: scale(1.06) rotate(2deg); }
    64%  { transform: scale(1) rotate(0deg); }
    85%  { opacity: 1; transform: scale(1) translate(0, -2px); }
    100% { opacity: 0; transform: scale(0.8) translate(3px, -12px) rotate(4deg); }
  }
  @keyframes tcRowPulse {
    0%, 100% { box-shadow: 0 0 6px var(--cell-color, rgba(255,255,255,0.3)); }
    50%      { box-shadow: 0 0 16px var(--cell-color, rgba(255,255,255,0.6)); }
  }
  /* Identity-Banner: slides down from top after successful join */
  @keyframes tcIdentityIn {
    0%   { opacity: 0; transform: translateY(-40px) scale(0.85); }
    50%  { opacity: 1; transform: translateY(8px) scale(1.04); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes tcIdentityOut {
    0%   { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-30px) scale(0.9); }
  }
  /* Your-Turn fullscreen pulse (Hot Potato + Imposter) */
  @keyframes tcYourTurnPulse {
    0%   { opacity: 0; transform: scale(1.2); }
    18%  { opacity: 1; transform: scale(0.96); }
    30%  { opacity: 1; transform: scale(1.02); }
    75%  { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.04); }
  }
  @keyframes tcYourTurnGlow {
    0%, 100% { box-shadow: inset 0 0 120px 40px var(--turn-color, #EF4444); }
    50%      { box-shadow: inset 0 0 180px 60px var(--turn-color, #EF4444); }
  }
  /* Red-glow on QuestionCard during critical countdown (last 3s) */
  @keyframes tcCriticalGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.55); }
    50%      { box-shadow: 0 0 36px 4px rgba(239,68,68,0.75); }
  }
  /* Trost-Message nach falscher Antwort */
  @keyframes tcTrostIn {
    0%   { opacity: 0; transform: translateY(10px) scale(0.95); }
    60%  { opacity: 1; transform: translateY(-2px) scale(1.02); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  /* Bottom-Sheet Menu — Backdrop fade + Sheet slide-up (iOS-spring) */
  @keyframes tcMenuBackdrop {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes tcMenuSlideUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  /* Joker-Earned-Toast — slide-down von oben, halt, fade-out */
  @keyframes tcJokerBanner {
    0%   { opacity: 0; transform: translate(-50%, -120%) scale(0.85); }
    14%  { opacity: 1; transform: translate(-50%, 0) scale(1.05); }
    22%  { transform: translate(-50%, 0) scale(1); }
    78%  { opacity: 1; transform: translate(-50%, 0) scale(1); }
    100% { opacity: 0; transform: translate(-50%, -40%) scale(0.92); }
  }

  button:focus-visible, input:focus-visible {
    outline: 2px solid #EC4899;
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
// 2026-05-08 (Aurora-Vivid): Card-BG aufs Beamer-Niveau angeglichen
// (#1F1A2E → #14101F = Indigo-Hoodie-Gradient). Fuehlt sich auf Phone
// genauso premium-vivid an wie der Beamer.
const COZY_CARD_BG = 'linear-gradient(180deg, #1F1A2E, #14101F)';

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

// 2026-05-02 (Stamm-Team-Code): teamId hat Format `team-abc123`. Wir
// formatieren das als `T-ABC123` fuer die Anzeige + akzeptieren das beim
// Eingeben (case-insensitive, mit/ohne Bindestrich). Andere Eingaben werden
// trotzdem normalisiert versucht (User koennte z.B. "ABC123" tippen).
function formatStammCode(teamId: string): string {
  const suffix = teamId.replace(/^team-/i, '').toUpperCase();
  return suffix ? `T-${suffix}` : teamId.toUpperCase();
}
function parseStammCodeToTeamId(input: string): string {
  const cleaned = input.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  // Entferne fuehrendes "t" (T-Prefix).
  const suffix = cleaned.replace(/^t/, '');
  if (suffix.length < 4) return ''; // zu kurz, ignorieren
  return `team-${suffix}`;
}

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

  // Reset joined on disconnect so auto-rejoin fires on reconnect
  useEffect(() => {
    if (!connected && joined) setJoined(false);
  }, [connected]);

  // Auto-rejoin if we have a stored session — aber nicht wenn wir gerade
  // gekickt wurden (sonst rejoint man sich endlos selbst zurueck).
  useEffect(() => {
    if (joined || !connected || kicked) return;
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
  }, [connected, kicked]);

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
    if (ack.ok) setJoined(true);
    else setError(ack.error ?? 'error');
  }

  // Identity-Banner nur bei frischem Join anzeigen, nicht bei Auto-Rejoin.
  const [showIdentityBanner, setShowIdentityBanner] = useState(false);

  async function joinRoom() {
    if (!teamName.trim()) return;
    setError(null);
    localStorage.setItem('qq_teamName', teamName.trim());
    localStorage.setItem('qq_avatarId', avatarId);
    if (chosenEmoji) localStorage.setItem('qq_emoji', chosenEmoji);
    else localStorage.removeItem('qq_emoji');
    const ack = await safeEmit(emit, 'qq:joinTeam', {
      roomCode, teamId, teamName: teamName.trim(), avatarId, emoji: chosenEmoji,
    });
    if (ack.ok) {
      setJoined(true); setShowIdentityBanner(true);
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
  const takenAvatarIds = (state?.teams ?? []).map(t => t.avatarId);
  const takenEmojis = (state?.teams ?? []).map(t => t.emoji).filter(Boolean) as string[];
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
    return (
      <AvatarSetProvider value={setId} emojis={state?.avatarSetEmojis}>
        <SetupFlow step={step} setStep={setStep}
          avatarId={avatarId} setAvatarId={setAvatarId}
          chosenEmoji={chosenEmoji} setChosenEmoji={setChosenEmoji}
          teamName={teamName} setTeamName={setTeamName}
          connected={connected} error={error} onJoin={joinRoom}
          lang={lang} onFlagClick={handleFlagClick} flagFlip={flagFlip}
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
  takenAvatarIds, takenEmojis, takenTeamNamesLower, serverEmojis,
  resumeTeam, onResume, onStammLookup, stammResult, stammStatus,
  eurovisionMode, escBgUrl, autoSwitchToast }: {
  step: string; setStep: (s: any) => void; avatarId: string; setAvatarId: (a: string) => void;
  chosenEmoji: string | undefined; setChosenEmoji: (e: string | undefined) => void;
  teamName: string; setTeamName: (n: string) => void; connected: boolean; error: string | null;
  onJoin: () => void; lang: 'de' | 'en'; onFlagClick: () => void; flagFlip: boolean;
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
  const trimmedNameLower = teamName.trim().toLowerCase();
  const nameTaken = trimmedNameLower.length > 0 && takenTeamNamesLower.includes(trimmedNameLower);
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
  const slotColor = slot?.color ?? '#EC4899';
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
      background: setupPageBg,
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
              color: '#cbd5e1', letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}>cozywolf</span>
            <span style={{
              width: 3, height: 3, borderRadius: '50%',
              background: 'rgba(203,213,225,0.4)',
            }} />
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: '#94a3b8', letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}>live quiz</span>
          </div>
          <div style={{ fontSize: 38, fontWeight: 900, color: '#F1F5F9', letterSpacing: '-0.02em' }}>
            {t.header[lang]}
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
              const items = [
                { label: lang === 'de' ? '1. Avatar' : '1. Avatar', active: isAvatarStep, past: isNameStep },
                { label: lang === 'de' ? '2. Name'   : '2. Name',   active: isNameStep,   past: false      },
                { label: lang === 'de' ? '3. Los'    : '3. Go',     active: false,        past: false      },
              ];
              return items.map((s, i) => {
                const color = s.active ? '#EC4899' : (s.past ? '#A78BFA' : '#475569');
                return (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <div style={{ width: 18, height: 2, background: '#334155', borderRadius: 1 }} />
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
          <CozyCard anim borderColor={resumeTeam.color || '#EC4899'}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '6px 0 14px',
            }}>
              <QQTeamAvatar avatarId={resumeTeam.avatarId} teamEmoji={resumeTeam.emoji} size={56} style={{
                animation: 'tcfloat 3s ease-in-out infinite',
                filter: `drop-shadow(0 0 12px ${resumeTeam.color}55)`,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#94A3B8', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 2 }}>
                  {lang === 'de' ? 'Du warst dabei' : 'You were here'}
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: resumeTeam.color || '#F1F5F9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {resumeTeam.name}
                </div>
              </div>
            </div>
            <CozyBtn color={resumeTeam.color || '#EC4899'} onClick={onResume}>
              {lang === 'de' ? `Wieder dabei als ${resumeTeam.name}` : `Resume as ${resumeTeam.name}`}
            </CozyBtn>
            <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#64748B' }}>
              {lang === 'de' ? 'oder unten neues Team anlegen' : 'or set up a new team below'}
            </div>
          </CozyCard>
        )}
        {step === 'COLOR' && (
          <CozyCard anim borderColor="#EC4899">
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
            />
            {/* Name-Input direkt in derselben Card. Live-Strip „Team "-Prefix
                verhindert „Team Team Regenbogen" beim spaeteren Display. */}
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
                  color: '#FBCFE8', fontSize: 18,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >🎲</button>
            </div>
            <div style={{
              fontSize: 11, color: '#64748b', fontWeight: 700,
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
                <CozyBtn color="#22C55E" onClick={onJoin} disabled={!canJoin}>
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
                    color: '#94a3b8', fontSize: 12, fontWeight: 700,
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
          <CozyCard borderColor="#EC4899">
            {!stammExpanded && !stammResult && (
              <button
                onClick={() => setStammExpanded(true)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  border: '1px dashed rgba(236,72,153,0.45)',
                  background: 'rgba(236,72,153,0.06)',
                  color: '#FBCFE8', fontWeight: 900, fontSize: 13,
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
                <div style={{ fontSize: 11, fontWeight: 900, color: '#EC4899', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
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
                      background: 'rgba(0,0,0,0.3)', color: '#FBCFE8',
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
                      background: stammStatus === 'searching' ? '#475569' : '#EC4899',
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
                  <div style={{ fontSize: 11, color: '#EF4444', fontWeight: 700 }}>
                    {lang === 'de' ? 'Code nicht gefunden — neu spielen geht trotzdem.' : 'Code not found — you can still play normally.'}
                  </div>
                )}
                <button
                  onClick={() => { setStammExpanded(false); setStammInput(''); }}
                  style={{
                    background: 'none', border: 'none', color: '#64748b',
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
                <div style={{ fontSize: 11, fontWeight: 900, color: '#22C55E', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  ✓ {lang === 'de' ? 'Stamm-Team gefunden' : 'Regular team found'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <QQTeamAvatar avatarId={stammResult.avatarId} size={48} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#FBCFE8' }}>
                      {stammResult.teamName || '—'}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>
                      {lang === 'de'
                        ? `${stammResult.wins} Sieg${stammResult.wins === 1 ? '' : 'e'} · ${stammResult.gamesPlayed} Spiel${stammResult.gamesPlayed === 1 ? '' : 'e'}`
                        : `${stammResult.wins} win${stammResult.wins === 1 ? '' : 's'} · ${stammResult.gamesPlayed} game${stammResult.gamesPlayed === 1 ? '' : 's'}`}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
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
              <CozyCard anim borderColor="#EC4899">
                <StepLabel>{lang === 'de' ? 'Avatar' : 'Avatar'}</StepLabel>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <QQTeamAvatar avatarId={avatarId} size={120} />
                  <div style={{ marginTop: 14, fontSize: 14, color: '#94A3B8', fontWeight: 700 }}>
                    {lang === 'de' ? 'CozyCast-Avatar — fix zur Farbe' : 'CozyCast avatar — fixed to color'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <CozyBtn color="#94A3B8" onClick={() => setStep('COLOR')}>{lang === 'de' ? '← Zurück' : '← Back'}</CozyBtn>
                  <CozyBtn color="#EC4899" onClick={() => setStep('NAME')}>{t.setup.next[lang]}</CozyBtn>
                </div>
              </CozyCard>
            );
          }
          return (
            <CozyCard anim borderColor="#EC4899">
              <StepLabel>{lang === 'de' ? 'Wähle einen Avatar' : 'Pick an avatar'}</StepLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                {pool.map((em, i) => {
                  const taken = takenEmojis.includes(em);
                  const sel = chosenEmoji === em;
                  const myColor = QQ_AVATARS.find(a => a.id === avatarId)?.color ?? '#EC4899';
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
                      }}
                    >
                      {em}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <CozyBtn color="#94A3B8" onClick={() => setStep('COLOR')}>{lang === 'de' ? '← Zurück' : '← Back'}</CozyBtn>
                <CozyBtn
                  color="#EC4899"
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
          <CozyCard anim borderColor="#EC4899">
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
                  color: '#FBCFE8', fontSize: 18,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >🎲</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <CozyBtn color="#94A3B8" onClick={() => setStep('AVATAR')}>{lang === 'de' ? '← Zurück' : '← Back'}</CozyBtn>
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
            <CozyBtn color="#22C55E" onClick={onJoin} disabled={!teamName.trim() || nameTaken}>
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
  const teamColor     = myTeam?.color ?? '#3B82F6';

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
    : s.phase === 'GAME_OVER' ? '#EC4899'
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
  const myTeamColor = myTeam?.color ?? '#EC4899';
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
    <div style={{ ...darkPage, background: finalPageBg, transition: 'background 0.8s ease' }} className="qq-team-page">
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
                color: '#E2E8F0', cursor: 'pointer',
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
            background: '#7F1D1D', border: '1px solid #EF4444', color: '#FCA5A5',
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
              color: '#FCA5A5', animation: 'tcbtnpop 0.3s ease both',
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
              <PlacementCard state={s} myTeamId={myTeamId} isMyTurn={isMyTurn} emit={emit} roomCode={roomCode} lang={lang} />
            )}
          </>
        )}
        {s.phase === 'COMEBACK_CHOICE' && (
          <ComebackCard state={s} myTeamId={myTeamId} isMine={isComebackTeam} emit={emit} roomCode={roomCode} lang={lang} />
        )}
        {s.phase === 'CONNECTIONS_4X4' && (() => {
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
          <FinalRevealCard state={s} myTeamId={myTeamId} lang={lang} />
        )}
        {s.phase === 'PAUSED' && <PausedCard state={s} myTeamId={myTeamId} lang={lang} />}
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
              <StatChip label={`⚡ ${s.teamPhaseStats[myTeamId].stealsUsed} ${t.stats.stolen[lang]}`} color="#EF4444" />
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
            color: '#94a3b8', textTransform: 'uppercase',
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
          jokersAvailable={Math.max(0, 2 - (s.teamPhaseStats[myTeamId]?.jokersEarned ?? 0))}
          jokersTotal={2}
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

// ── Identity Banner: fullscreen welcome after successful join ────────────────
function IdentityBanner({ team, lang }: { team: QQTeam; lang: 'de' | 'en' }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
      // Voll opaker Backdrop + sanfter Team-Color-Glow obendrauf — verhindert
      // dass die TeamView-UI durchscheint und mit dem Welcome-Banner verschwimmt.
      background: `radial-gradient(ellipse at 50% 50%, ${team.color}33 0%, transparent 70%), rgba(13,10,6,0.96)`,
      backdropFilter: 'blur(10px) saturate(1.1)',
      WebkitBackdropFilter: 'blur(10px) saturate(1.1)',
      animation: 'tcIdentityOut 0.45s ease 2.15s both',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        // 2026-05-04 (UI-Audit P0-3): responsive padding statt fix '32px 44px'
        // damit's auf 320px-iPhone-SE-Schirm nicht ueberlaeuft.
        padding: 'clamp(20px, 5vw, 32px) clamp(28px, 7vw, 44px)',
        maxWidth: 'min(360px, 90vw)',
        borderRadius: 24,
        // Card jetzt opak: dunkler Card-Background mit dezentem Team-Color-Tint,
        // damit der Inhalt klar gegen den Hintergrund steht.
        background: `linear-gradient(180deg, rgba(28,22,16,0.96), rgba(15,12,8,0.96)), linear-gradient(180deg, ${team.color}1f, ${team.color}10)`,
        backgroundBlendMode: 'normal, normal',
        border: `2.5px solid ${team.color}`,
        boxShadow: `0 18px 56px rgba(0,0,0,0.65), 0 0 80px ${team.color}55, inset 0 1px 0 rgba(255,255,255,0.12)`,
        animation: 'tcIdentityIn 0.7s var(--qq-ease-bounce) both',
      }}>
        <div style={{
          fontSize: 13, fontWeight: 900, letterSpacing: '0.1em',
          color: `${team.color}dd`, textTransform: 'uppercase',
        }}>
          {lang === 'de' ? 'Willkommen!' : 'Welcome!'}
        </div>
        <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={96} style={{
          filter: `drop-shadow(0 0 24px ${team.color}aa)`,
          animation: 'tcfloat 2.6s ease-in-out infinite',
        }} />
        <div style={{
          fontSize: 14, fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.04em',
        }}>
          {lang === 'de' ? 'Ihr seid' : 'You are'}
        </div>
        <div style={{
          fontSize: 40, fontWeight: 900, color: team.color, letterSpacing: '-0.01em',
          textShadow: `0 0 30px ${team.color}aa`, textAlign: 'center',
          lineHeight: 1.05, wordBreak: 'break-word', maxWidth: 360,
        }}>
          {team.name}
        </div>
      </div>
    </div>
  );
}

// ── Your-Turn Alert: fullscreen pulse for Hot Potato / Imposter ──────────────
function YourTurnAlert({ kind, team, lang }: { kind: 'hotPotato' | 'imposter'; team: QQTeam; lang: 'de' | 'en' }) {
  const emoji = kind === 'hotPotato' ? '🥔' : '🕵️';
  const title = lang === 'de' ? 'JETZT BIST DU DRAN!' : 'YOUR TURN NOW!';
  return (
    <div
      aria-live="assertive"
      style={{
        position: 'fixed', inset: 0, zIndex: 2000, pointerEvents: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        animation: 'tcYourTurnPulse 1.5s ease both',
        ['--turn-color' as string]: team.color,
      }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        animation: 'tcYourTurnGlow 0.7s ease-in-out infinite',
      }} />
      <div style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        padding: '28px 42px', borderRadius: 24,
        background: `${team.color}22`,
        border: `3px solid ${team.color}`,
        boxShadow: `0 0 60px ${team.color}aa, inset 0 0 30px ${team.color}33`,
      }}>
        <div style={{ fontSize: 72, lineHeight: 1, animation: 'tcwobble 0.35s ease-in-out infinite' }}><QQEmojiIcon emoji={emoji}/></div>
        <div style={{
          fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '0.04em',
          textShadow: `0 0 16px ${team.color}`,
          textAlign: 'center',
        }}>
          {title}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Phase cards
// ═══════════════════════════════════════════════════════════════════════════════

function LobbyCard({ state: s, myTeam, lang }: { state: QQStateUpdate; myTeam: QQTeam | null; lang: 'de' | 'en' }) {
  const de = lang === 'de';
  const opponents = s.teams.filter(t => t.id !== myTeam?.id);

  // Pulsing ready dot
  const [pulse, setPulse] = React.useState(true);
  React.useEffect(() => {
    const id = setInterval(() => setPulse(p => !p), 1200);
    return () => clearInterval(id);
  }, []);

  if (!myTeam) {
    // Not yet joined — simple waiting view
    return (
      <CozyCard>
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 10, animation: 'tcfloat 2.5s ease-in-out infinite' }}>🎮</div>
          <div style={{ fontWeight: 900, fontSize: 22, color: '#F1F5F9', marginBottom: 6 }}>
            {de ? 'Warteraum' : 'Waiting room'}
          </div>
          <div style={{ fontSize: 14, color: '#64748b' }}>
            {s.teams.length === 0 ? (de ? 'Noch keine Teams' : 'No teams yet') : `${s.teams.length} Teams`}
          </div>
        </div>
      </CozyCard>
    );
  }

  return (
    <CozyCard borderColor="#EC4899" pulse>
      <div style={{ textAlign: 'center', padding: '4px 0' }}>
        {/* Own team — hero display */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, marginBottom: 8,
        }}>
          <QQTeamAvatar avatarId={myTeam.avatarId} teamEmoji={myTeam.emoji} size={56} style={{
            margin: '0 auto',
            animation: 'tcfloat 3s ease-in-out infinite',
            filter: `drop-shadow(0 0 12px ${myTeam.color}44)`,
          }} />
          <div style={{ fontWeight: 900, fontSize: 22, color: myTeam.color, marginTop: 4 }}>
            {myTeam.name}
          </div>
          {/* Pulsing ready indicator */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 16px', borderRadius: 999, marginTop: 4,
            background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#22C55E',
              boxShadow: pulse ? '0 0 8px #22C55E' : '0 0 2px #22C55E',
              transition: 'box-shadow 0.6s ease',
            }} />
            <span style={{ fontSize: 13, fontWeight: 900, color: '#4ade80', letterSpacing: '0.04em' }}>
              {de ? 'BEREIT' : 'READY'}
            </span>
          </div>
        </div>

        {/* VS separator */}
        {opponents.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0',
          }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <div style={{
              fontWeight: 900, fontSize: 20, color: '#EF4444',
              textShadow: '0 0 14px rgba(239,68,68,0.4)',
              letterSpacing: '0.15em',
            }}>VS</div>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>
        )}

        {/* Opponents */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {opponents.map(t => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 14px', borderRadius: 16,
              background: `${t.color}08`,
              border: `1px solid ${t.color}22`,
            }}>
              <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={28} />
              <span style={{ fontWeight: 900, fontSize: 16, color: t.color }}>{t.name}</span>
            </div>
          ))}
          {opponents.length === 0 && (
            <div style={{ fontSize: 14, color: '#64748b', fontStyle: 'italic', padding: '8px 0' }}>
              {de ? 'Warte auf Gegner…' : 'Waiting for opponents…'}
            </div>
          )}
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

function TeamsRevealCard({ myTeam, lang }: { myTeam: QQTeam | null; lang: 'de' | 'en' }) {
  if (!myTeam) return null;
  const av = qqGetAvatar(myTeam.avatarId);
  const color = myTeam.color;
  return (
    <CozyCard borderColor={`${color}cc`} pulse>
      <style>{`
        @keyframes tcTeamPop {
          0% { opacity: 0; transform: scale(0.5) rotate(-12deg); }
          55% { opacity: 1; transform: scale(1.1) rotate(4deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes tcFloat {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes tcGlow {
          0%,100% { box-shadow: 0 0 0 0 ${color}55, 0 10px 36px ${color}44; }
          50%     { box-shadow: 0 0 0 14px ${color}00, 0 10px 36px ${color}88; }
        }
        @keyframes tcSparkle {
          0%,100% { opacity: 0.5; transform: scale(1); }
          50%     { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 22, padding: '18px 8px 10px', position: 'relative',
      }}>
        {/* Top label */}
        <div style={{
          fontSize: 12, fontWeight: 900, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: '#F9A8D4',
          animation: 'tcreveal 0.4s ease both',
        }}>
          🎬 {lang === 'en' ? "Today's players" : 'Heute spielen'}
        </div>

        {/* Big avatar disc — Wolf-Badge hat eigenen Inner-BG + Ring, daher kein Wrapper-Disc mehr */}
        <QQTeamAvatar avatarId={myTeam.avatarId} teamEmoji={myTeam.emoji} size={160} style={{
          animation: 'tcTeamPop 0.7s var(--qq-ease-bounce) both, tcFloat 3s ease-in-out 0.9s infinite, tcGlow 2.4s ease-in-out 0.9s infinite',
          boxShadow: `0 0 32px ${color}55`,
        }} />

        {/* Team name banner */}
        <div style={{
          padding: '10px 22px', borderRadius: 16,
          background: color, color: '#fff',
          fontSize: 26, fontWeight: 900, letterSpacing: '0.04em',
          textTransform: 'uppercase',
          boxShadow: `0 6px 20px ${color}88`,
          animation: 'tcTeamPop 0.6s var(--qq-ease-bounce) 0.15s both',
        }}>
          {myTeam.name}
        </div>

        {/* Motivational line */}
        <div style={{
          fontSize: 22, fontWeight: 900,
          color: '#EC4899', textAlign: 'center',
          letterSpacing: '0.04em',
          textShadow: '0 2px 14px rgba(236,72,153,0.4)',
          animation: 'tcreveal 0.5s ease 0.4s both',
        }}>
          <QQEmojiIcon emoji="✨"/> {lang === 'en' ? 'Good luck!' : 'Viel Glück!'} <QQEmojiIcon emoji="✨"/>
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: 14, fontWeight: 700, color: '#94a3b8', textAlign: 'center',
          fontStyle: 'italic', lineHeight: 1.5, maxWidth: 280,
          animation: 'tcreveal 0.5s ease 0.55s both',
        }}>
          {lang === 'en'
            ? 'Phones at the ready — here we go!'
            : 'Handy bereithalten — gleich geht\'s los!'}
        </div>

        {/* Sparkles */}
        <div style={{
          position: 'absolute', top: 12, left: 16, fontSize: 20,
          animation: 'tcSparkle 1.8s ease-in-out infinite',
        }}><QQEmojiIcon emoji="✨"/></div>
        <div style={{
          position: 'absolute', top: 40, right: 18, fontSize: 16,
          animation: 'tcSparkle 2.2s ease-in-out 0.4s infinite',
        }}><QQEmojiIcon emoji="⭐"/></div>
        <div style={{
          position: 'absolute', bottom: 30, left: 22, fontSize: 16,
          animation: 'tcSparkle 2s ease-in-out 0.8s infinite',
        }}><QQEmojiIcon emoji="⭐"/></div>
      </div>
    </CozyCard>
  );
}

function PhaseIntroCard({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  // 2026-05-09 (Wolf 'team-Farben noch alt'): nutzt Brand-Pink-Eskalation
  // (QQ_PHASE_COLORS via getRoundColor) statt buntes Blue/Pink/Red/Purple-
  // Mapping. Letzte Phase = Magenta (#A21247).
  const totalPhases = (s.totalPhases ?? 4) as number;
  const color = getRoundColor(s.gamePhaseIndex, totalPhases);
  // Quiz-Runden heißen immer „Runde N". Das echte „Finale" ist seit
  // Connections-Einführung das 4×4-Mini-Game.
  const names  = { de: ['', 'Runde 1', 'Runde 2', 'Runde 3', 'Runde 4'], en: ['', 'Round 1', 'Round 2', 'Round 3', 'Round 4'] };
  // Synchron mit Beamer ROUND_RULES (QQBeamerPage). Bann/Schild/Tauschen sind
  // gedroppt — aktuelle Mechaniken sind Setzen/Klauen/Stapeln + 4×4-Finale.
  const descs  = { de: ['', 'Erobert das Spielfeld!', 'Klauen jetzt möglich!', 'Stapeln freigeschaltet — Felder dauerhaft sichern!', 'Quiz-Buddy-Punkte sammeln — danach Stapel-Bonus im Finale!'],
                   en: ['', 'Conquer the grid!', 'Stealing now possible!', 'Stack unlocked — lock your tile permanently!', 'Collect quiz buddy points — stack-bonus finale follows!'] };

  const questionInPhase = (s.questionIndex % 5) + 1;
  const isFirstOfRound = questionInPhase === 1;
  const showRules    = isFirstOfRound && s.introStep === 1;
  const showCategory = !isFirstOfRound || s.introStep >= 2;
  const phaseName = names[lang][s.gamePhaseIndex];
  const phaseDesc = descs[lang][s.gamePhaseIndex];

  const cat = s.currentQuestion?.category;
  const catInfo = cat ? QQ_CATEGORY_LABELS[cat] : undefined;
  const catColor = cat ? (QQ_CAT_ACCENT[cat] ?? QQ_CATEGORY_COLORS[cat]) : color;
  // Synchron mit Beamer (QQBeamerPage CAT_EXPLAIN + BUNTE_SUB_INTRO).
  // User-Wunsch 2026-04-28: Texte auf /team mit Beamer abgleichen.
  const CAT_EXPLAIN: Record<string, { de: string; en: string }> = {
    SCHAETZCHEN:   { de: 'Wer schätzt am nächsten dran?', en: 'Who can guess the closest?' },
    MUCHO:         { de: 'Wählt die richtige Antwort', en: 'Pick the right answer' },
    BUNTE_TUETE:   { de: 'Überraschungs-Mechanik — seid bereit!', en: 'Surprise mechanic — be ready!' },
    ZEHN_VON_ZEHN: { de: '3 Antworten, 10 Punkte vergeben', en: '3 answers, distribute 10 points' },
    CHEESE:        { de: 'Was ist das?', en: 'What is this?' },
  };
  // Pro BUNTE_TUETE-Sub-Mechanik eigener 1-Zeiler (sonst stand bei 4 gewinnt
  // und Bluff nur das generische „Überraschungs-Mechanik").
  const BUNTE_SUB_INTRO: Record<string, { name: { de: string; en: string }; explain: { de: string; en: string }; emoji: string }> = {
    onlyConnect: {
      emoji: '🧩',
      name:    { de: '4 gewinnt',     en: 'Only Connect' },
      explain: { de: '4 Begriffe — was verbindet sie? Ein Tipp pro Team, schnellste richtige Antwort gewinnt zuerst.',
                 en: '4 terms — what connects them? One guess per team, fastest correct answer wins first.' },
    },
    bluff: {
      emoji: '🎭',
      name:    { de: 'Bluff',         en: 'Bluff' },
      explain: { de: 'Erfindet plausible Falsch-Antworten und ratet die echte.',
                 en: 'Make up plausible fake answers and find the real one.' },
    },
    hotPotato: {
      emoji: '🔥',
      name:    { de: 'Heiße Kartoffel', en: 'Hot Potato' },
      explain: { de: 'Reihum antworten — keine Antwort vor Zeitende = raus.',
                 en: 'Take turns — no answer before time runs out = out.' },
    },
    top5: {
      emoji: '🏆',
      name:    { de: 'Top 5',         en: 'Top 5' },
      explain: { de: 'Bis zu 5 Antworten — meiste Treffer gewinnt.',
                 en: 'Up to 5 answers — most hits wins.' },
    },
    oneOfEight: {
      emoji: '🕵️',
      name:    { de: 'Imposter',      en: 'Imposter' },
      explain: { de: 'Findet die EINE falsche Aussage zwischen 7 wahren.',
                 en: 'Spot the ONE false statement among 7 true ones.' },
    },
    order: {
      emoji: '📋',
      name:    { de: 'Reihenfolge',   en: 'Order' },
      explain: { de: 'Sortiert in der richtigen Reihenfolge.',
                 en: 'Sort in the correct order.' },
    },
    map: {
      emoji: '🗺️',
      name:    { de: 'CozyGuessr',    en: 'CozyGuessr' },
      explain: { de: 'Errate den Ort auf der Karte — nächstes Team gewinnt.',
                 en: 'Guess the location on the map — closest team wins.' },
    },
  };
  const bunteKind = cat === 'BUNTE_TUETE' ? (s.currentQuestion?.bunteTuete?.kind as string | undefined) : undefined;
  const bunteSub = bunteKind ? BUNTE_SUB_INTRO[bunteKind] : undefined;

  // Card border — round color for round intro, category color for category steps
  const introBorder = showCategory ? catColor : color;

  return (
    <CozyCard borderColor={introBorder}>
      <div style={{ textAlign: 'center', padding: '8px 0', animation: 'tcreveal 0.5s ease both' }}>
        {!showCategory && !showRules ? (
          /* Round announcement */
          <>
            <div style={{ fontSize: 14, color: '#64748b', marginBottom: 6 }}>
              {lang === 'de' ? 'Nächste Phase' : 'Next phase'}
            </div>
            <div style={{ fontSize: 52, fontWeight: 900, color, textShadow: `0 0 30px ${color}44`,
              animation: 'tcfloat 3s ease-in-out infinite' }}>
              {phaseName ?? `${lang === 'de' ? 'Runde' : 'Round'} ${s.gamePhaseIndex}`}
            </div>
            <div style={{ fontSize: 17, color: `${color}88`, marginTop: 8 }}>
              {phaseDesc ?? ''}
            </div>
          </>
        ) : showRules ? (
          /* Rule reminder */
          (() => {
            // Synchron mit Beamer ROUND_RULES. Bann/Schild/Tauschen sind raus,
            // aktuelle Trinity ist Setzen/Klauen/Stapeln.
            const RULES: Record<number, { de: string[]; en: string[]; emoji: string }> = {
              1: { emoji: '🏁', de: ['1 Feld setzen', 'Sichert euch eure ersten Felder!'], en: ['Place 1 tile', 'Claim your first cells!'] },
              2: { emoji: '⚔️', de: ['2 Felder oder klauen', 'Pro richtige Antwort wählen'], en: ['2 tiles or steal', 'Per correct answer'] },
              3: { emoji: '🏯', de: ['Stapeln freigeschaltet', 'Felder dauerhaft sichern + 1 Pkt extra'], en: ['Stack unlocked', 'Lock tile + 1 extra pt'] },
              4: { emoji: '🏯', de: ['Quiz-Buddy-Punkte', 'danach Stapel-Bonus im Finale'], en: ['Quiz buddy points', 'stack-bonus finale follows'] },
            };
            const r = RULES[s.gamePhaseIndex] ?? RULES[3];
            return (
              <>
                <div style={{ fontSize: 13, fontWeight: 900, color, letterSpacing: '0.04em', marginBottom: 6 }}>
                  {phaseName}
                </div>
                <div style={{ fontSize: 44, marginBottom: 4, animation: 'tcfloat 3s ease-in-out infinite', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44 }}>
                  {s.gamePhaseIndex === 3 ? (
                    <QQIcon slug="marker-sanduhr" size={44} alt="Bann" />
                  ) : s.gamePhaseIndex === 4 ? (
                    <QQIcon slug="marker-swap" size={44} alt="Swap" />
                  ) : (
                    r.emoji
                  )}
                </div>
                {s.gamePhaseIndex > 1 && (
                  <div style={{
                    display: 'inline-block', padding: '3px 14px', borderRadius: 999,
                    background: `${color}22`, border: `1px solid ${color}44`,
                    fontSize: 13, fontWeight: 900, color, letterSpacing: '0.1em',
                    marginBottom: 6,
                  }}>
                    {lang === 'de' ? '✨ NEU' : '✨ NEW'}
                  </div>
                )}
                {(lang === 'en' ? r.en : r.de).map((line, i) => (
                  <div key={i} style={{
                    fontSize: i === 0 ? 22 : 16, fontWeight: i === 0 ? 900 : 700,
                    color: i === 0 ? '#F1F5F9' : `${color}aa`,
                    marginTop: i === 0 ? 4 : 2,
                  }}>{line}</div>
                ))}
              </>
            );
          })()
        ) : s.categoryIsNew ? (
          /* Category explanation — first time this category/mechanic appears */
          (() => {
            const btKind = s.currentQuestion?.bunteTuete?.kind;
            const TC_INTRO: Record<string, { emoji: string; title: { de: string; en: string }; lines: { de: string[]; en: string[] } }> = {
              SCHAETZCHEN:          { emoji: catInfo?.emoji ?? '🎯', title: { de: 'Schätzchen', en: 'Close Call' }, lines: { de: ['Wer am nächsten dran liegt, gewinnt', 'Knapp dran zählt auch'], en: ['Closest guess wins', 'Near misses also count'] } },
              MUCHO:                { emoji: catInfo?.emoji ?? '🔥', title: { de: 'Mu-Cho', en: 'Mu-Cho' }, lines: { de: ['4 Optionen — 1 ist richtig', '⚡ Schnelligkeit entscheidet!'], en: ['4 options — 1 is correct', '⚡ Speed decides!'] } },
              ZEHN_VON_ZEHN:        { emoji: catInfo?.emoji ?? '🎰', title: { de: '10 von 10', en: 'All In' }, lines: { de: ['10 Punkte auf 3 Antworten verteilen'], en: ['Distribute 10 points across 3 answers'] } },
              CHEESE:               { emoji: catInfo?.emoji ?? '📸', title: { de: 'Schau mal!', en: 'Picture This' }, lines: { de: ['Erkennt das Bild — tippt die Antwort ins Handy.'], en: ['Spot the image — type your answer.'] } },
              'BUNTE_TUETE:top5':       { emoji: '🏆', title: { de: 'Top 5', en: 'Top 5' }, lines: { de: ['Bis zu 5 Antworten', 'Meiste Treffer gewinnt'], en: ['Up to 5 answers', 'Most hits wins'] } },
              'BUNTE_TUETE:oneOfEight': { emoji: '🕵️', title: { de: 'Imposter', en: 'Imposter' }, lines: { de: ['Findet die EINE falsche Aussage', 'unter 7 wahren'], en: ['Spot the ONE false statement', 'among 7 true ones'] } },
              'BUNTE_TUETE:order':      { emoji: '📋', title: { de: 'Reihenfolge', en: 'Order' }, lines: { de: ['Sortiert in der richtigen Reihenfolge'], en: ['Sort in the correct order'] } },
              'BUNTE_TUETE:map':        { emoji: '🗺️', title: { de: 'CozyGuessr', en: 'CozyGuessr' }, lines: { de: ['Errate den Ort auf der Karte', 'Nächstes Team gewinnt'], en: ['Guess the location on the map', 'Closest team wins'] } },
              'BUNTE_TUETE:hotPotato':  { emoji: '🔥', title: { de: 'Heiße Kartoffel', en: 'Hot Potato' }, lines: { de: ['Reihum antworten', 'Keine Antwort vor Zeitende = raus'], en: ['Take turns', 'No answer before time runs out = out'] } },
              'BUNTE_TUETE:onlyConnect':{ emoji: '🧩', title: { de: '4 gewinnt', en: 'Only Connect' }, lines: { de: ['4 Begriffe — was verbindet sie?', '1 Tipp · schnellste richtig zuerst'], en: ['4 terms — what connects them?', '1 guess · fastest correct first'] } },
              'BUNTE_TUETE:bluff':      { emoji: '🎭', title: { de: 'Bluff', en: 'Bluff' }, lines: { de: ['Erfindet plausible Falsch-Antworten', 'und ratet die echte'], en: ['Make up plausible fake answers', 'and find the real one'] } },
            };
            const key = cat === 'BUNTE_TUETE' && btKind ? `BUNTE_TUETE:${btKind}` : (cat ?? '');
            const info = TC_INTRO[key] ?? TC_INTRO[cat ?? ''];
            if (!info) return null;
            return (
              <>
                <div style={{ fontSize: 13, fontWeight: 900, color: catColor, letterSpacing: '0.04em', marginBottom: 8 }}>
                  {lang === 'de' ? `Frage ${questionInPhase} von 5` : `Question ${questionInPhase} of 5`}
                </div>
                <div style={{ fontSize: 44, marginBottom: 4, animation: 'tcfloat 3s ease-in-out infinite' }}><QQEmojiIcon emoji={info.emoji}/></div>
                <div style={{ fontSize: 28, fontWeight: 900, color: catColor, textShadow: `0 0 20px ${catColor}44` }}>
                  {info.title[lang]}
                </div>
                {info.lines[lang].map((line, i) => (
                  <div key={i} style={{
                    fontSize: 15, fontWeight: 700, color: i === 0 ? '#F1F5F9' : `${catColor}88`,
                    marginTop: i === 0 ? 8 : 2,
                  }}>{line}</div>
                ))}
                {/* User-Wunsch 2026-04-28: 'Antwort auf dem Handy' war redundant
                    auf dem Handy selbst. Komplett raus. */}
              </>
            );
          })()
        ) : (
          /* Category reveal — already seen, compact */
          <>
            <div style={{ fontSize: 13, fontWeight: 900, color: catColor, letterSpacing: '0.04em', marginBottom: 6 }}>
              {lang === 'de' ? `Frage ${questionInPhase} von 5` : `Question ${questionInPhase} of 5`}
            </div>
            {/* Progress dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} style={{
                  width: n === questionInPhase ? 18 : 8,
                  height: 8, borderRadius: 4,
                  background: n < questionInPhase ? `${catColor}55` : n === questionInPhase ? catColor : 'rgba(255,255,255,0.1)',
                  transition: 'all 0.3s ease',
                }} />
              ))}
            </div>
            {catInfo && (
              <>
                <div style={{ fontSize: 44, marginBottom: 4, lineHeight: 1, animation: 'tcfloat 3s ease-in-out infinite' }}>
                  {(() => {
                    // 2026-05-11 (Wolf): bei Bunte-Tüte-Sub-Mechanik das
                    // spezifische Sub-Icon/Emoji nutzen statt generisches 🎁.
                    const btKind = s.currentQuestion?.category === 'BUNTE_TUETE'
                      ? s.currentQuestion?.bunteTuete?.kind
                      : undefined;
                    const subSlug = btKind ? qqSubSlug(btKind) : null;
                    const slug = btKind ? subSlug : (cat ? qqCatSlug(cat as string) : null);
                    const fallback = btKind ? QQ_BUNTE_TUETE_LABELS[btKind].emoji : catInfo.emoji;
                    return slug
                      ? <QQIcon slug={slug} size={56} alt={catInfo[lang]} />
                      : fallback;
                  })()}
                </div>
                <div style={{
                  fontSize: 32, fontWeight: 900, color: catColor,
                  textShadow: `0 0 20px ${catColor}44`,
                }}>
                  {catInfo[lang]}
                </div>
                {cat && CAT_EXPLAIN[cat] && (
                  <div style={{ fontSize: 15, color: `${catColor}88`, marginTop: 6, fontWeight: 700 }}>
                    {CAT_EXPLAIN[cat][lang]}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </CozyCard>
  );
}

function QuestionCard({ state: s, myTeamId, emit, roomCode, lang }: {
  state: QQStateUpdate; myTeamId: string; emit: any; roomCode: string; lang: 'de' | 'en';
}) {
  const q = s.currentQuestion;
  // Critical-Glow: letzte 3s auf dem Question-Card — rot pulsierend.
  const [isCritical, setIsCritical] = useState(false);
  useEffect(() => {
    if (!s.timerEndsAt || s.phase !== 'QUESTION_ACTIVE') { setIsCritical(false); return; }
    const iv = setInterval(() => {
      const secs = Math.ceil(Math.max(0, (s.timerEndsAt! - Date.now()) / 1000));
      setIsCritical(secs >= 1 && secs <= 3);
      if (secs === 0) clearInterval(iv);
    }, 120);
    return () => clearInterval(iv);
  }, [s.timerEndsAt, s.phase]);

  if (!q) return null;
  const catColor = QQ_CATEGORY_COLORS[q.category];
  const catAccent = QQ_CAT_ACCENT[q.category] ?? catColor;
  const catLabel = QQ_CATEGORY_LABELS[q.category];
  // Wolfs Feedback 2026-05-01: Phone darf Reveal nicht vor Beamer zeigen
  // (sonst kennen Teams die Antwort schon, Spannung weg). Beamer hat
  // Aufdeck-Animationen die ~1.5-2s dauern; Phone wartet daher nach Phase-
  // Wechsel auf QUESTION_REVEAL bis der Beamer-Reveal sichtbar ist.
  const phaseIsReveal = s.phase === 'QUESTION_REVEAL';
  const [revealUnlocked, setRevealUnlocked] = useState(false);
  useEffect(() => {
    if (phaseIsReveal) {
      // 2026-05-03 v4 (Wolf-Bug 'Reveal /team async zu /beamer'): Lock-Duration
      // matcht jetzt tatsaechliche Beamer-Cascade-Dauer pro Kategorie.
      // 2026-05-05 (Wolf-Test 'reveal /team immernoch deutlich frueher'):
      // Base-Werte um +1500ms erhoeht (default 3500→5000) damit Beamer-
      // Cascade garantiert vor Phone-Reveal abgelaufen ist. Caps angepasst.
      const btKind = q.bunteTuete?.kind ?? '';
      const teamCount = Math.max(1, s.teams.length);
      const lockMs = (() => {
        if (q.category === 'MUCHO') return Math.min(12500, 3000 + teamCount * 250);
        if (q.category === 'ZEHN_VON_ZEHN') return Math.min(13500, 4000 + teamCount * 800);
        if (q.category === 'CHEESE') return Math.min(12500, 3000 + teamCount * 850);
        if (q.category === 'SCHAETZCHEN') return Math.min(12500, 3500 + Math.min(5, teamCount) * 1600);
        if (q.category === 'BUNTE_TUETE' && btKind === 'top5') return Math.min(15500, 4000 + Math.min(5, teamCount) * 2400);
        if (q.category === 'BUNTE_TUETE' && btKind === 'order') return Math.min(13500, 3000 + Math.min(5, teamCount) * 2000);
        if (q.category === 'BUNTE_TUETE' && btKind === 'onlyConnect') return 5500;
        if (q.category === 'BUNTE_TUETE' && btKind === 'bluff') return 5500;
        // 2026-05-05 (Wolf-Bug 'cozyguessr reveal table /team viel frueher'):
        // Map-Reveal hat lange Cascade — Target-Pin-Drop (0.75s) + Team-Pin-
        // Drops gestaffelt + Polylines-Tweening + mapRevealStep schrittweise.
        // Plus Mod kann zoomen/schwenken. Auf jeden Fall lange Lock.
        if (q.category === 'BUNTE_TUETE' && btKind === 'map') return Math.min(16000, 5500 + teamCount * 1200);
        return 5000; // single-winner default (hotPotato, oneOfEight)
      })();
      const t = setTimeout(() => setRevealUnlocked(true), lockMs);
      return () => clearTimeout(t);
    } else {
      setRevealUnlocked(false);
    }
  }, [phaseIsReveal, q.category, q.bunteTuete?.kind, s.teams.length]);
  const isRevealed = phaseIsReveal && revealUnlocked;
  // 2026-05-06 (Wolf 'in mucho kommt loesung auf /team teilweise immernoch
  // vor reveal auf beamer, das darf nirgendwo passieren — Spoiler kaputt
  // die Spannung'): solutionVisible gated alle Loesung-zeigenden Bloecke
  // (revealedAnswer, Winner/Loser-Banner, eigene-Antwort-Korrektheit) auf
  // den TATSAECHLICHEN Beamer-Reveal-Step, nicht nur den Phone-Timer.
  // Phone-Timer (revealUnlocked) ist Fallback fuer Kategorien ohne Multi-
  // Step-Reveal; bei MUCHO/ZvZ/Map zaehlt der Backend-Step.
  const solutionVisible = (() => {
    if (!isRevealed) return false;
    if (q.category === 'MUCHO') {
      // 2026-05-07 (Wolf 'Mucho-Reveal kommt auf /team deutlich frueher als
      // auf /beamer — komplett spoilert'): vorher >= 2 hardcoded, was nur
      // bei 2-Optionen-MUCHO funktioniert. Bei 4 Optionen ist Step 2 erst
      // der zweite Avatar-Pop, der Lock-Step (= Korrekt-Reveal) ist
      // nonEmpty+1. Jetzt: berechne Lock-Step aus tatsaechlicher Anzahl
      // nicht-leerer Optionen, gate solutionVisible auf >= Lock-Step.
      const nonEmpty = (q.options ?? []).filter((_: unknown, i: number) =>
        s.answers.some(a => a.text === String(i))
      ).length;
      const lockStep = Math.max(2, nonEmpty + 1);
      return (s.muchoRevealStep ?? 0) >= lockStep;
    }
    if (q.category === 'ZEHN_VON_ZEHN') return (s.zvzRevealStep ?? 0) >= 2;
    if (q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'map') {
      // Map-Reveal: erst nach Closeup-Zoom (= step 1+validCount+1) ist
      // der Beamer-Reveal komplett. Vorher waeren Pins noch nicht gesetzt.
      const validCount = s.answers.filter(a => {
        const parts = String(a.text ?? '').split(',');
        return Number.isFinite(Number(parts[0])) && Number.isFinite(Number(parts[1]));
      }).length;
      return (s.mapRevealStep ?? 0) >= 1 + validCount + 1;
    }
    return true;
  })();
  const iWon = s.correctTeamId === myTeamId;
  const iSubmitted = !!s.answers.find(a => a.teamId === myTeamId);
  const isCheese = q.category === 'CHEESE';
  const hasCheeseImg = isCheese && q.image?.url;

  // Phase-specific card styling — accent color for glow matching beamer
  const cardBorder = isRevealed
    ? (iWon ? '#22C55E' : '#EF4444')
    : catAccent;

  return (
    <div style={{
      borderRadius: 24,
      animation: isCritical && !isRevealed ? 'tcCriticalGlow 0.7s ease-in-out infinite' : undefined,
    }}>
    <CozyCard key={q.id} borderColor={cardBorder} pulse={!isRevealed}>
      {/* Category pill */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 14,
        padding: '6px 16px', borderRadius: 999,
        background: `${catAccent}18`, border: `2px solid ${catAccent}44`,
        color: catAccent, fontSize: 15, fontWeight: 900, letterSpacing: '0.04em',
        boxShadow: `0 0 16px ${catAccent}22`,
      }}>
        {(() => {
          // 2026-05-11 (Wolf): Bunte-Tüte-Sub-Icon statt 🎁.
          const btKind = q.category === 'BUNTE_TUETE' ? q.bunteTuete?.kind : undefined;
          const subSlug = btKind ? qqSubSlug(btKind) : null;
          const slug = btKind ? subSlug : qqCatSlug(q.category as string);
          const fallback = btKind ? QQ_BUNTE_TUETE_LABELS[btKind].emoji : catLabel.emoji;
          return slug
            ? <QQIcon slug={slug} size={20} alt={catLabel.de} />
            : <span style={{ fontSize: 16 }}><QQEmojiIcon emoji={fallback}/></span>;
        })()}
        {(() => {
          const btKind = q.category === 'BUNTE_TUETE' ? q.bunteTuete?.kind : undefined;
          if (btKind) {
            return lang === 'en' ? QQ_BUNTE_TUETE_LABELS[btKind].en : QQ_BUNTE_TUETE_LABELS[btKind].de;
          }
          return lang === 'en' ? catLabel.en : catLabel.de;
        })()}
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
          padding: '12px 16px', borderRadius: 16, textAlign: 'center',
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
          padding: '8px 14px', borderRadius: 16, textAlign: 'center',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          fontSize: 14, color: '#64748b', marginBottom: 8,
        }}>
          <QQEmojiIcon emoji="🥔"/> {s.teams.find(tm => tm.id === s.hotPotatoActiveTeamId)?.name ?? '?'} {lang === 'en' ? 'is up' : 'ist dran'}
        </div>
      )}
      {!isRevealed && s.hotPotatoEliminated.includes(myTeamId) && (
        <div style={{
          padding: '8px 14px', borderRadius: 16, textAlign: 'center',
          background: 'rgba(239,68,68,0.1)', fontSize: 14, color: '#f87171', marginBottom: 8,
        }}>
          {t.potato.out[lang]}
        </div>
      )}
      {!isRevealed && (
        <AnswerInput state={s} myTeamId={myTeamId} emit={emit} roomCode={roomCode} catColor={catColor} lang={lang} />
      )}

      {/* Team answer progress (shown when not yet submitted & others answering) */}
      {!isRevealed && !s.answers.find(a => a.teamId === myTeamId) && s.answers.length > 0 && s.teams.length > 1 && (
        <div style={{
          marginTop: 6, textAlign: 'center', fontSize: 13, color: '#94a3b8', fontWeight: 700,
          animation: 'tcreveal 0.3s ease both',
        }}>
          {s.answers.length}/{s.teams.length} Teams {lang === 'de' ? 'haben schon geantwortet' : 'already answered'}
        </div>
      )}

      {/* Revealed answer */}
      {solutionVisible && s.revealedAnswer && (
        <div style={{
          marginTop: 8, padding: '12px 16px', borderRadius: 16,
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

      {solutionVisible && s.correctTeamId && !!(s.pendingFor || s.pendingAction) && (() => {
        const winnerTeam = s.teams.find(t => t.id === s.correctTeamId);
        const cat = q.category;
        const isEn = lang === 'en';
        const muchoSpeedWin = cat === 'MUCHO' && q.correctOptionIndex != null
          && s.answers.filter(a => a.text === String(q.correctOptionIndex)).length > 1;
        if (iWon) {
          const winMsg = cat === 'SCHAETZCHEN'
            ? (isEn ? '🎯 You were closest! Choose a field.' : '🎯 Ihr wart am nächsten dran! Wählt ein Feld.')
            : cat === 'CHEESE'
              ? (isEn ? '📸 Correct! Choose a field.' : '📸 Erkannt! Wählt ein Feld.')
              : cat === 'BUNTE_TUETE'
                ? (isEn ? '🎁 You win this round! Choose a field.' : '🎁 Ihr gewinnt die Runde! Wählt ein Feld.')
                : cat === 'ZEHN_VON_ZEHN'
                  ? (isEn ? '💰 Most points on the right answer! Choose a field.' : '💰 Die meisten Punkte auf die richtige Antwort! Wählt ein Feld.')
                  : muchoSpeedWin
                    ? (isEn ? '⚡ Fastest & correct! Choose a field.' : '⚡ Am schnellsten & richtig! Wählt ein Feld.')
                    : (isEn ? '🎉 Correct! You may choose a field.' : '🎉 Richtig! Ihr dürft ein Feld wählen.');
          return (
            <div style={{
              marginTop: 8, padding: '10px 14px', borderRadius: 16,
              background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)',
              fontSize: 15, fontWeight: 900, color: '#4ade80', textAlign: 'center',
              animation: 'tcwinBounce 0.6s var(--qq-ease-bounce) both',
              boxShadow: '0 0 20px rgba(34,197,94,0.25)',
            }}>
              {winMsg}
            </div>
          );
        } else if (winnerTeam) {
          // Eigene Antwort auf Korrektheit prüfen (unabhängig vom Schnellsten):
          // Bei MUCHO/CHEESE koennen mehrere Teams richtig liegen. Der Platzierungs-
          // Rang ergibt sich aus submittedAt; das Backend queued die langsameren
          // richtigen Teams ueber _placementQueue.
          const myAnswer = s.answers.find(a => a.teamId === myTeamId);
          // 2026-05-02 (Phone-Beamer-Audit): Backend-Truth via currentQuestionWinners
          // statt strict-Match. CHEESE Schreibfehler-akzeptierte Antworten waren
          // sonst nicht als 'auch richtig' erkannt -> falscher LoseMsg-Banner.
          const winnerIdSet = new Set(s.currentQuestionWinners ?? (s.correctTeamId ? [s.correctTeamId] : []));
          const iWasAlsoCorrect = winnerIdSet.has(myTeamId);

          // Rang unter allen richtigen Antworten (1 = schnellstes richtiges Team = Gewinner)
          let myRank = 0;
          if (iWasAlsoCorrect && myAnswer) {
            const correctSorted = s.answers
              .filter(a => winnerIdSet.has(a.teamId))
              .sort((a, b) => a.submittedAt - b.submittedAt);
            myRank = correctSorted.findIndex(a => a.teamId === myTeamId) + 1;
          }

          // Wenn man auch richtig war — egal welcher Rang — kriegt man eine
          // Aktion via Placement-Queue. Nachricht macht klar: ihr seid dran,
          // nur eben nach den schnelleren richtigen Teams.
          const loseMsg = iWasAlsoCorrect
            ? (myRank >= 2
                ? (isEn
                    ? `✓ Also correct! You place #${myRank} — coming up right after.`
                    : `✓ Auch richtig! Ihr platziert als Nr. ${myRank} — gleich seid ihr dran.`)
                : (isEn
                    ? `✓ Correct! Placement coming up right after ${winnerTeam.name}.`
                    : `✓ Richtig! Ihr setzt gleich nach ${winnerTeam.name}.`))
            : cat === 'SCHAETZCHEN'
              ? (isEn ? `😔 ${winnerTeam.name} was closer.` : `😔 Leider war ${winnerTeam.name} näher dran.`)
              : (isEn ? `😔 ${winnerTeam.name} got it right.` : `😔 ${winnerTeam.name} hatte Recht.`);
          return (
            <div style={{
              marginTop: 8, padding: '10px 14px', borderRadius: 16,
              background: iWasAlsoCorrect ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${iWasAlsoCorrect ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.08)'}`,
              fontSize: 14, fontWeight: 900, color: iWasAlsoCorrect ? '#4ade80' : '#64748b', textAlign: 'center',
              animation: 'tcreveal 0.4s ease 0.2s both',
            }}>
              {loseMsg}
            </div>
          );
        }
        return null;
      })()}

      {/* Eigene Antwort (Schätzchen / Mucho / Cheese) — "Was hatten wir nochmal?".
          2026-05-06 (Wolf-Spoiler-Audit): Gate auf zentralen `solutionVisible`
          gezogen — vorher nur MUCHO mit muchoRevealStep>=2 explizit gegated,
          jetzt automatisch fuer alle Multi-Step-Kategorien (MUCHO/ZvZ/Map). */}
      {solutionVisible
        && (q.category === 'SCHAETZCHEN' || q.category === 'MUCHO' || q.category === 'CHEESE') && (() => {
        const myAns = s.answers.find(a => a.teamId === myTeamId);
        if (!myAns) return null;
        let displayText = myAns.text;
        let isCorrect: boolean | null = null;
        // Rang unter den richtigen Antworten (nur MUCHO/CHEESE — bei SCHAETZCHEN
        // gibt's nur einen Sieger). Wird im Status-Text als „N. schnellstes Team"
        // genutzt statt nacktem ✓.
        let rankAmongCorrect: number | null = null;
        if (q.category === 'MUCHO' && q.options) {
          const idx = parseInt(myAns.text, 10);
          if (!isNaN(idx) && q.options[idx]) {
            const optText = lang === 'en' && q.optionsEn?.[idx] ? q.optionsEn[idx] : q.options[idx];
            displayText = `${['A','B','C','D'][idx] ?? idx + 1}. ${optText}`;
          }
          isCorrect = q.correctOptionIndex != null && myAns.text === String(q.correctOptionIndex);
          if (isCorrect && q.correctOptionIndex != null) {
            const correctSorted = s.answers
              .filter(a => a.text === String(q.correctOptionIndex))
              .sort((a, b) => a.submittedAt - b.submittedAt);
            rankAmongCorrect = correctSorted.findIndex(a => a.teamId === myTeamId) + 1;
          }
        } else if (q.category === 'SCHAETZCHEN') {
          isCorrect = myAns.teamId === s.correctTeamId;
        } else if (q.category === 'CHEESE') {
          // CHEESE: 2026-05-02 Wolfs Bug - Frontend strict-Match war inkonsistent
          // mit Backend similarityScore>=0.8. Bei „f statt g" Schreibfehler: Backend
          // akzeptierte (Punkt vergeben), Frontend zeigte X. Fix: Backend ist
          // Single Source of Truth. Wenn ich in currentQuestionWinners stehe → ich
          // war richtig (egal ob exakter Match oder Schreibfehler-akzeptiert).
          const winners = s.currentQuestionWinners ?? (s.correctTeamId ? [s.correctTeamId] : []);
          isCorrect = winners.includes(myTeamId);
          if (isCorrect) {
            // Rang basierend auf Submit-Zeit unter ALLEN Winnern (Backend-Truth).
            const correctSorted = s.answers
              .filter(a => winners.includes(a.teamId))
              .sort((a, b) => a.submittedAt - b.submittedAt);
            rankAmongCorrect = correctSorted.findIndex(a => a.teamId === myTeamId) + 1;
          }
        }
        // Status-Text: bei SCHAETZCHEN-Falsch entschärfen (es gibt keine objektiv
        // falsche Schätzung, nur „weniger nah"). Bei MUCHO/CHEESE-Richtig den
        // Rang anzeigen (z.B. „1. schnellstes Team", „2nd fastest").
        const ordinalDe = (n: number) => `${n}.`;
        const ordinalEn = (n: number) => {
          const s2 = n % 100;
          if (s2 >= 11 && s2 <= 13) return `${n}th`;
          const last = n % 10;
          if (last === 1) return `${n}st`;
          if (last === 2) return `${n}nd`;
          if (last === 3) return `${n}rd`;
          return `${n}th`;
        };
        let statusText: string | null = null;
        if (isCorrect === true) {
          if (q.category === 'SCHAETZCHEN') {
            statusText = lang === 'en' ? 'Closest estimate!' : 'Beste Schätzung!';
          } else if (rankAmongCorrect && rankAmongCorrect > 0) {
            statusText = lang === 'en'
              ? `Correct — ${ordinalEn(rankAmongCorrect)} fastest team`
              : `Richtig — ${ordinalDe(rankAmongCorrect)} schnellstes Team`;
          } else {
            statusText = lang === 'en' ? 'Correct!' : 'Richtig!';
          }
        } else if (isCorrect === false) {
          if (q.category === 'SCHAETZCHEN') {
            // 2026-05-03 (Wolf-Bug 'doppelter Rueckmeldungstext'): Bei SCHAETZCHEN
            // wird "Ein anderes Team war näher" schon in der Sieger-Card oben
            // gezeigt (loseMsg). Hier keinen Doublet — nur die eigene Antwort
            // recap'n ohne wiederholten Status-Text.
            statusText = null;
          } else {
            statusText = lang === 'en' ? 'Not correct' : 'Nicht richtig';
          }
        }
        return (
          <div style={{
            marginTop: 10,
            padding: '10px 14px', borderRadius: 16,
            background: isCorrect === true ? 'rgba(34,197,94,0.10)'
              : isCorrect === false ? 'rgba(255,255,255,0.04)'
              : 'rgba(255,255,255,0.04)',
            border: `1px solid ${isCorrect === true ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.08)'}`,
            animation: 'tcreveal 0.35s ease 0.15s both',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', letterSpacing: 0.4, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                {lang === 'en' ? 'Your answer' : 'Eure Antwort'}
              </span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 900, color: isCorrect === true ? '#4ade80' : '#e2e8f0', wordBreak: 'break-word' }}>
                {displayText || '—'}
              </span>
              {isCorrect !== null && (
                <span style={{ fontSize: 18, fontWeight: 900, color: isCorrect ? '#4ade80' : '#f87171', flexShrink: 0 }}>
                  {isCorrect ? '✓' : '✗'}
                </span>
              )}
            </div>
            {statusText && (
              <div style={{
                fontSize: 12, fontWeight: 700,
                color: isCorrect ? '#86efac' : '#94a3b8',
                paddingLeft: 2,
              }}>
                {statusText}
              </div>
            )}
          </div>
        );
      })()}

      {/* All-In: Punkteverteilung der eigenen Tipps */}
      {solutionVisible && q.category === 'ZEHN_VON_ZEHN' && q.options && (() => {
        const myAns = s.answers.find(a => a.teamId === myTeamId);
        if (!myAns) return null;
        const parts = String(myAns.text ?? '').split(',').map(x => parseInt(x.trim(), 10));
        if (parts.length !== q.options.length || parts.some(Number.isNaN)) return null;
        const correctIdx = q.correctOptionIndex;
        const earned = correctIdx != null ? (parts[correctIdx] ?? 0) : 0;
        const maxPts = Math.max(...parts, 1);
        const ALLIN_COLORS = ['#3B82F6','#22C55E','#EF4444'];
        return (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8', marginBottom: 2, letterSpacing: 0.3, display: 'flex', justifyContent: 'space-between' }}>
              <span>💰 {lang === 'en' ? 'Your bets' : 'Eure Punkte'}</span>
              <span style={{ color: earned > 0 ? '#4ade80' : '#94a3b8' }}>
                {lang === 'en' ? `+${earned} pts` : `+${earned} Pkt`}
              </span>
            </div>
            {q.options.map((opt, i) => {
              const pts = parts[i] ?? 0;
              const isCorrect = i === correctIdx;
              const color = ALLIN_COLORS[i] ?? catColor;
              const pct = (pts / maxPts) * 100;
              return (
                <div key={i} style={{
                  position: 'relative', overflow: 'hidden',
                  padding: '8px 10px', borderRadius: 8,
                  background: isCorrect ? 'rgba(34,197,94,0.10)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isCorrect ? 'rgba(34,197,94,0.45)' : 'rgba(255,255,255,0.08)'}`,
                  animation: `tcreveal 0.35s ease ${0.1 + i * 0.06}s both`,
                }}>
                  {/* Bar */}
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: `${pct}%`, background: `${color}22`,
                    transition: 'width 0.6s ease',
                  }} />
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, width: 22, textAlign: 'center' }}>
                      {isCorrect ? '✓' : ''}
                    </span>
                    <span style={{ flex: 1, fontWeight: 900, fontSize: 13, color: isCorrect ? '#4ade80' : '#e2e8f0' }}>
                      {opt}
                    </span>
                    <span style={{
                      fontWeight: 900, fontSize: 14,
                      color: pts === 0 ? '#475569' : isCorrect ? '#4ade80' : color,
                      minWidth: 28, textAlign: 'right',
                    }}>
                      {pts}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Reihenfolge: eigene Sortierung mit ✓/✗ pro Position */}
      {/* 2026-05-02: Backend-Truth via orderHitsByTeam (similarityScore>=0.8 fuzzy). */}
      {solutionVisible && q.category === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'order' && (() => {
        const btt = q.bunteTuete as any;
        const items: string[] = btt.items ?? [];
        const correctOrder: number[] = btt.correctOrder ?? items.map((_: any, i: number) => i);
        const correctSeq = correctOrder.map((idx: number) => (items[idx] ?? '').trim());
        const myAns = s.answers.find(a => a.teamId === myTeamId);
        if (!myAns) return null;
        const mine = String(myAns.text ?? '').split('|').map(x => x.trim()).filter(Boolean);
        const myHits: boolean[] = s.orderHitsByTeam?.[myTeamId] ?? mine.map(() => false);
        const hits = myHits.filter(Boolean).length;
        return (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8', marginBottom: 2, letterSpacing: 0.3, display: 'flex', justifyContent: 'space-between' }}>
              <span><QQEmojiIcon emoji="📊"/> {lang === 'en' ? 'Your order' : 'Eure Reihenfolge'}</span>
              <span style={{ color: hits === correctSeq.length ? '#4ade80' : '#94a3b8' }}>
                {hits}/{correctSeq.length} {lang === 'en' ? 'correct' : 'richtig'}
              </span>
            </div>
            {mine.map((g, i) => {
              const correct = correctSeq[i] ?? '';
              const ok = !!myHits[i];
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 8,
                  background: ok ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${ok ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.25)'}`,
                  animation: `tcreveal 0.35s ease ${0.1 + i * 0.06}s both`,
                }}>
                  <span style={{ fontSize: 12, width: 22, textAlign: 'center', fontWeight: 900, color: '#64748b' }}>#{i+1}</span>
                  <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{ok ? '✓' : '✗'}</span>
                  <span style={{ flex: 1, fontWeight: 900, fontSize: 13, color: ok ? '#4ade80' : '#f87171' }}>{g}</span>
                  {!ok && correct && (
                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>
                      → {correct}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Top-5: eigene Antworten mit ✓/✗ + Team-Badges wer es auch hatte */}
      {solutionVisible && q.category === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'top5' && (() => {
        // 2026-05-02: Backend-Truth via top5HitsByTeam (similarityScore>=0.8 fuzzy).
        // Vorher strict-Match mit substring/equals - Schreibfehler-akzeptierte
        // Treffer wurden nicht angezeigt obwohl Backend Punkte vergab.
        const myAns = s.answers.find(a => a.teamId === myTeamId);
        if (!myAns) return null;
        const mine = String(myAns.text ?? '').split('|').map(x => x.trim()).filter(Boolean);
        const myHits = s.top5HitsByTeam?.[myTeamId] ?? [];
        // Map: welche meiner Tipps hat welchen correctAll-Index getroffen?
        // Backend matched in eval-Reihenfolge; wir rekonstruieren index-per-Tipp.
        // Einfache Heuristik: erste N Tipps haben Hits (sortiert), Rest ✗.
        // Fuer das UI reicht "wie viele richtig" + welche correctAll-Indizes.
        const myHitSet = new Set(myHits);
        // Andere Teams die einen bestimmten correctIdx auch getroffen haben:
        const teamsForCorrectIdx = (idx: number): Array<{ id: string; color: string; avatarId: string; name: string }> => {
          const out: Array<{ id: string; color: string; avatarId: string; name: string }> = [];
          for (const a of s.answers) {
            if (a.teamId === myTeamId) continue;
            const otherHits = s.top5HitsByTeam?.[a.teamId] ?? [];
            if (otherHits.includes(idx)) {
              const tm = s.teams.find(t => t.id === a.teamId);
              if (tm) out.push({ id: tm.id, color: tm.color, avatarId: tm.avatarId, name: tm.name });
            }
          }
          return out;
        };
        return (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8', marginBottom: 2, letterSpacing: 0.3, display: 'flex', justifyContent: 'space-between' }}>
              <span>📝 {lang === 'en' ? 'Your answers' : 'Eure Tipps'}</span>
              <span style={{ color: myHits.length > 0 ? '#4ade80' : '#94a3b8' }}>
                {myHits.length}/{mine.length} {lang === 'en' ? 'hit' : 'Treffer'}
              </span>
            </div>
            {mine.map((g, i) => {
              // Heuristik: ersten myHits.length Tipps gelten als hits, in Reihenfolge.
              // (Backend matchet greedy in submitted-order, also deckt sich das normalerweise.)
              const isHit = i < myHits.length;
              const correctIdxForThis = isHit ? myHits[i] : -1;
              const others = correctIdxForThis >= 0 ? teamsForCorrectIdx(correctIdxForThis) : [];
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 8,
                  background: isHit ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${isHit ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.25)'}`,
                  animation: `tcreveal 0.35s ease ${0.1 + i * 0.06}s both`,
                }}>
                  <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{isHit ? '✓' : '✗'}</span>
                  <span style={{ flex: 1, fontWeight: 900, fontSize: 13, color: isHit ? '#4ade80' : '#f87171' }}>{g}</span>
                  {others.length > 0 && (
                    <div style={{ display: 'flex', gap: 3 }}>
                      {others.map(o => (
                        <QQTeamAvatar key={o.id} avatarId={o.avatarId} size={22} title={o.name} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* CozyGuessr: Distanz-Ranking */}
      {solutionVisible && q.category === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'map' && (() => {
        const btt = q.bunteTuete as any;
        const tLat: number = btt.lat; const tLng: number = btt.lng;
        const scored = [...s.answers].map(a => {
          const parts = String(a.text ?? '').split(',');
          const lat = Number(parts[0]); const lng = Number(parts[1]);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { ...a, distKm: null as number | null };
          const R = 6371;
          const dLat = (lat - tLat) * Math.PI / 180;
          const dLng = (lng - tLng) * Math.PI / 180;
          const aa = Math.sin(dLat/2)**2 + Math.cos(tLat*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLng/2)**2;
          return { ...a, distKm: R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa)) };
        }).sort((a, b) => (a.distKm === null ? 1 : b.distKm === null ? -1 : a.distKm - b.distKm));
        if (scored.length === 0) return null;
        return (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8', marginBottom: 2, letterSpacing: 0.3 }}>
              <QQEmojiIcon emoji="🏆"/> {lang === 'en' ? 'Closest to target' : 'Am nächsten dran'}
            </div>
            {scored.map((a, i) => {
              const team = s.teams.find(t => t.id === a.teamId);
              const isMe = a.teamId === myTeamId;
              const medal = i === 0 ? <QQEmojiIcon emoji="🥇"/> : i === 1 ? <QQEmojiIcon emoji="🥈"/> : i === 2 ? <QQEmojiIcon emoji="🥉"/> : `#${i+1}`;
              const dist = a.distKm == null ? '—' : a.distKm < 1 ? `${Math.round(a.distKm * 1000)} m` : `${a.distKm.toFixed(1)} km`;
              return (
                <div key={a.teamId} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 8,
                  background: isMe ? `${team?.color ?? '#3b82f6'}22` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isMe ? (team?.color ?? '#3b82f6') + '88' : 'rgba(255,255,255,0.08)'}`,
                  animation: `tcreveal 0.35s ease ${0.1 + i * 0.06}s both`,
                }}>
                  <span style={{ fontSize: 14, width: 28, textAlign: 'center', fontWeight: 900 }}>{medal}</span>
                  {team && <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={18} />}
                  <span style={{ flex: 1, fontWeight: 900, fontSize: 13, color: team?.color ?? '#e2e8f0' }}>{team?.name ?? a.teamId}</span>
                  <span style={{ fontWeight: 900, fontSize: 13, color: i === 0 ? '#4ade80' : '#94a3b8', fontFamily: "'Caveat', cursive" }}><QQEmojiIcon emoji="📍"/> {dist}</span>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Hot Potato: Eure-Runde-Zusammenfassung beim Reveal */}
      {solutionVisible && q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato' && (() => {
        const eliminated = s.hotPotatoEliminated.includes(myTeamId);
        return (
          <div style={{
            marginTop: 10, padding: '10px 14px', borderRadius: 16,
            background: eliminated ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.10)',
            border: `1px solid ${eliminated ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.35)'}`,
            display: 'flex', alignItems: 'center', gap: 10,
            animation: 'tcreveal 0.35s ease 0.15s both',
          }}>
            <span style={{ fontSize: 20 }}>{eliminated ? <QQEmojiIcon emoji="🥔"/> : <QQEmojiIcon emoji="🏆"/>}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 900, color: eliminated ? '#f87171' : '#4ade80' }}>
              {eliminated
                ? (lang === 'de' ? 'Ausgeschieden' : 'Eliminated')
                : (lang === 'de' ? 'Überlebt!' : 'Survived!')}
            </span>
          </div>
        );
      })()}

      {/* Imposter: Eure-Runde-Zusammenfassung beim Reveal */}
      {solutionVisible && q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'oneOfEight' && (() => {
        const eliminated = s.imposterEliminated.includes(myTeamId);
        return (
          <div style={{
            marginTop: 10, padding: '10px 14px', borderRadius: 16,
            background: eliminated ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.10)',
            border: `1px solid ${eliminated ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.35)'}`,
            display: 'flex', alignItems: 'center', gap: 10,
            animation: 'tcreveal 0.35s ease 0.15s both',
          }}>
            <span style={{ fontSize: 20 }}>{eliminated ? <QQEmojiIcon emoji="🕵️"/> : '✓'}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 900, color: eliminated ? '#f87171' : '#4ade80' }}>
              {eliminated
                ? (lang === 'de' ? 'Imposter erwischt — ausgeschieden' : 'Caught the imposter — eliminated')
                : (lang === 'de' ? 'Wahre Aussage gewählt' : 'Picked a true statement')}
            </span>
          </div>
        );
      })()}

      {/* Nobody got it right */}
      {solutionVisible && !s.correctTeamId && (
        <div style={{
          marginTop: 8, padding: '10px 14px', borderRadius: 16, textAlign: 'center',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          fontSize: 14, fontWeight: 900, color: '#f87171',
          animation: 'tcreveal 0.4s ease 0.2s both',
        }}>
          {s.answers.length === 0
            ? (lang === 'de' ? '⏱ Keine Antworten eingegangen' : '⏱ No answers received')
            : (lang === 'de' ? '❌ Keiner hatte Recht' : '❌ Nobody got it right')}
        </div>
      )}

      {/* Result-Message:
          - korrekt + nicht erster: „Auch richtig — als 2./3./..." (kein Shaming!)
          - falsch: zufällige Trost-Message (kein Shaming, nur Ermutigung)
          Nicht zeigen wenn man die Runde komplett gewonnen hat (eigener Erfolg
          wird woanders gefeiert). */}
      {solutionVisible && !iWon && iSubmitted && (() => {
        const winners = s.currentQuestionWinners ?? (s.correctTeamId ? [s.correctTeamId] : []);
        const myWinPosition = winners.indexOf(myTeamId); // -1 = nicht in den Gewinnern
        // 2026-05-05 (Wolf-Bug 'doppelt gemoppelt'): Auch-richtig-Box entfernt.
        // Die Info „Richtig — N. schnellstes Team" steht bereits in der oberen
        // Eure-Antwort-Card (statusText). Hier nur noch Falsch-Trost-Message.
        if (myWinPosition > 0) return null;
        // Falsch — B10 (2026-04-29): User-Wunsch 'Leider falsch, naechstes
        // Mal schafft ihr es'-Stil. Klare 2-zeilige Mitteilung: erst die
        // Aussage 'Leider falsch', dann ermutigende Trost-Message.
        // 2026-05-03 (Wolf-Bug): bei SCHAETZCHEN gibt's kein objektiv 'falsch' —
        // nur 'nicht am naehesten'. Headline entsprechend angepasst.
        const isSchaetz = q.category === 'SCHAETZCHEN';
        const msgs = lang === 'de'
          ? ['Nächstes Mal schafft ihr es!', 'Knapp daneben — bleibt dran!', 'Fast erwischt — weiter so!', 'Nicht aufgeben — der nächste Punkt wartet!', 'Schade — aber gleich kommt eure Chance!']
          : ["You'll get it next time!", 'So close — stay in it!', 'Almost there — keep going!', "Don't give up — your point is waiting!", 'Tough one — your chance is coming!'];
        const pick = msgs[Math.abs(hashString(q.id)) % msgs.length];
        const headline = isSchaetz
          ? (lang === 'de' ? '🤏 Knapp daneben' : '🤏 Not quite in range')
          : (lang === 'de' ? '😕 Leider falsch' : '😕 Sadly wrong');
        return (
          <div style={{
            marginTop: 8, padding: '12px 16px', borderRadius: 16, textAlign: 'center',
            background: 'rgba(148,163,184,0.10)',
            border: '1px dashed rgba(148,163,184,0.35)',
            animation: 'tcTrostIn 0.5s ease 0.45s both',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#fca5a5' }}>
              {headline}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1' }}>
              <QQEmojiIcon emoji="✨"/> {pick}
            </div>
          </div>
        );
      })()}
    </CozyCard>
    </div>
  );
}

// Kleine Hash-Helper-Funktion (nur für deterministische Auswahl, kein Crypto).
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

// ── Main AnswerInput router ───────────────────────────────────────────────────
function AnswerInput({ state: s, myTeamId, emit, roomCode, catColor, lang }: {
  state: QQStateUpdate; myTeamId: string; emit: any; roomCode: string; catColor: string; lang: 'de' | 'en';
}) {
  const q = s.currentQuestion;
  const myAnswer = s.answers.find(a => a.teamId === myTeamId);

  // 2026-05-05 (Wolf-Bug 'CHEESE Timer-Ablauf, dann kommt Eingabefeld wieder
  // kurz'): sticky-Flag im Frontend. Sobald `timerExpired===true` einmal
  // gesehen wurde und ich noch nicht geantwortet hatte, bleibt der „Zeit
  // vorbei"-Banner sichtbar bis zur naechsten Frage. Damit Race-Conditions
  // (Backend reset timerExpired vor Phase-Wechsel) keinen Input-Flicker mehr
  // erzeugen.
  const [stickyExpired, setStickyExpired] = useState(false);
  useEffect(() => {
    if ((s as any).timerExpired === true && !myAnswer && s.phase === 'QUESTION_ACTIVE') {
      setStickyExpired(true);
    }
  }, [(s as any).timerExpired, !!myAnswer, s.phase]);
  useEffect(() => {
    setStickyExpired(false);
  }, [q?.text]); // reset bei neuer Frage

  async function submitText(text: string) {
    if (!text.trim()) return;
    // 2026-05-11 (Audit P0): Submit-Vibe verstärkt von 40ms-Single auf
    // Burst [30,40,80] — kurz-pause-langer Confirm-Buzz. Spieler im lauten
    // Pub merkt jetzt klar dass der Tap gelandet ist.
    if (navigator.vibrate) navigator.vibrate([30, 40, 80]);
    await safeEmit(emit, 'qq:submitAnswer', { roomCode, teamId: myTeamId, answer: text.trim() });
  }

  // 2026-05-02 (Wolfs Bug 'Timer abgelaufen ohne Antwort - Phone zeigt nichts'):
  // Wenn der Timer regulaer abgelaufen ist + ich noch nicht geantwortet habe,
  // zeige einen 'leider zu langsam'-Banner statt des offen bleibenden Inputs.
  // timerExpired-Flag kommt vom Backend (true nach Timer-Ablauf, reset bei
  // Reveal/Stop/neuer Frage).
  // 2026-05-05: zusaetzlich stickyExpired (oben) damit Banner nicht
  // wegflickert wenn Backend kurz reset.
  // 2026-05-06 (Wolf-Bug 'bei Cheese zu spaet, danach kommt Eingabefeld nochmal'):
  // Phase-Gate erweitert auf QUESTION_REVEAL. Vorher: Phase wechselt zu REVEAL
  // bevor parent's revealUnlocked-Timer (3-12s) ablaeuft → Banner-Gate
  // (ACTIVE-only) failt → falls through zum Input-Render fuer ein paar
  // Sekunden bis AnswerInput unmounted. Jetzt: Banner bleibt bis Parent
  // den Reveal sichtbar macht.
  if (!myAnswer && (stickyExpired || (s as any).timerExpired === true)
      && (s.phase === 'QUESTION_ACTIVE' || s.phase === 'QUESTION_REVEAL')) {
    return (
      <div style={{
        padding: '20px 22px', borderRadius: 16, textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(239,68,68,0.18), rgba(239,68,68,0.06))',
        border: '2px solid rgba(239,68,68,0.45)',
        boxShadow: '0 0 30px rgba(239,68,68,0.18), 0 6px 18px rgba(0,0,0,0.4)',
        animation: 'tcreveal 0.3s ease both',
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
      }}>
        <span style={{ fontSize: 36, lineHeight: 1 }}>⏰</span>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#f87171' }}>
          {lang === 'de' ? 'Zeit vorbei!' : 'Time\'s up!'}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fca5a5', maxWidth: 260, lineHeight: 1.4 }}>
          {lang === 'de'
            ? 'Diesmal wart ihr leider zu langsam. Beim nächsten Mal — wir glauben an euch.'
            : 'You were a bit too slow this time. Next round you got this!'}
        </div>
      </div>
    );
  }

  if (myAnswer) {
    let displayText = myAnswer.text;
    // MUCHO: answer is option index ("0","1",...) — resolve to actual option text
    if (q && q.category === 'MUCHO' && q.options) {
      const idx = parseInt(myAnswer.text, 10);
      if (!isNaN(idx) && q.options[idx]) {
        const optText = lang === 'en' && q.optionsEn?.[idx] ? q.optionsEn[idx] : q.options[idx];
        displayText = `${['A','B','C','D'][idx] ?? idx + 1}. ${optText}`;
      }
    }
    // CozyGuessr map: raw coordinates are meaningless to players — show friendly confirmation
    if (q && q.category === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'map') {
      displayText = lang === 'de' ? '📍 Pin auf Karte gesetzt' : '📍 Pin placed on map';
    }
    // E2: Liste der Teams, die noch keine Antwort abgegeben haben.
    const answeredIds = new Set(s.answers.map(a => a.teamId));
    const pendingTeams = s.teams.filter(t => !answeredIds.has(t.id));
    // E1: Rang = Position der eigenen Antwort in submit-order (1-based).
    const sortedAnswers = [...s.answers].sort((a, b) => a.submittedAt - b.submittedAt);
    const myRank = sortedAnswers.findIndex(a => a.teamId === myTeamId) + 1;
    return <SubmittedBadge
      text={displayText}
      lang={lang}
      answeredCount={s.answers.length}
      totalTeams={s.teams.length}
      pendingTeams={pendingTeams}
      myRank={myRank > 0 ? myRank : undefined}
    />;
  }
  if (!q) return null;

  // Hot Potato — team text input (only active team, not eliminated)
  if (q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato') {
    return <HotPotatoInput state={s} myTeamId={myTeamId} emit={emit} roomCode={roomCode} catColor={catColor} lang={lang} />;
  }

  // Route by category
  // B7: alle Standard-Inputs bekommen `timerEndsAt` für Auto-Submit on Expire.
  const tEnd = s.timerEndsAt ?? null;
  if (q.category === 'MUCHO') return <MuchoInput question={q} catColor={catColor} onSubmit={submitText} lang={lang} timerEndsAt={tEnd} />;
  if (q.category === 'ZEHN_VON_ZEHN') return <AllInInput question={q} catColor={catColor} onSubmit={submitText} lang={lang} timerEndsAt={tEnd} />;
  if (q.category === 'SCHAETZCHEN') {
    const unit = lang === 'en' && q.unitEn ? q.unitEn : q.unit;
    // 2026-05-07 (Wolf): Jahreszahl-Mode → eigener Placeholder, kein Unit.
    const placeholder = q.isYearAnswer
      ? (lang === 'de' ? 'Jahr (z.B. 1989)' : 'Year (e.g. 1989)')
      : unit
      ? (lang === 'de' ? `Deine Schätzung (${unit})` : `Your estimate (${unit})`)
      : (lang === 'de' ? 'Deine Schätzung' : 'Your estimate');
    return <TextInput catColor={catColor} onSubmit={submitText} numeric placeholder={placeholder} lang={lang} timerEndsAt={tEnd} />;
  }
  if (q.category === 'CHEESE') return <TextInput catColor={catColor} onSubmit={submitText} placeholder={t.answer.enterAnswer[lang]} lang={lang} timerEndsAt={tEnd} />;
  if (q.category === 'BUNTE_TUETE') {
    const kind = q.bunteTuete?.kind;
    if (kind === 'top5') return <Top5Input catColor={catColor} onSubmit={submitText} lang={lang} timerEndsAt={tEnd} />;
    if (kind === 'oneOfEight') return <ImposterInput question={q} catColor={catColor} state={s} myTeamId={myTeamId} emit={emit} roomCode={roomCode} lang={lang} />;
    if (kind === 'order') return <FixItInput question={q} catColor={catColor} onSubmit={submitText} lang={lang} timerEndsAt={tEnd} />;
    if (kind === 'map') return <PinItInput question={q} catColor={catColor} onSubmit={submitText} lang={lang} timerEndsAt={tEnd} myTeam={s.teams.find(tm => tm.id === myTeamId) ?? null} />;
    if (kind === 'onlyConnect') return <OnlyConnectInput state={s} myTeamId={myTeamId} emit={emit} roomCode={roomCode} catColor={catColor} lang={lang} />;
    if (kind === 'bluff') return <BluffInput state={s} myTeamId={myTeamId} emit={emit} roomCode={roomCode} catColor={catColor} lang={lang} />;
  }
  // Fallback
  return <TextInput catColor={catColor} onSubmit={submitText} placeholder={t.answer.enterAnswer[lang]} lang={lang} timerEndsAt={tEnd} />;
}

// ── Hot Potato team input with countdown ──────────────────────────────────────
function HotPotatoInput({ state: s, myTeamId, emit, roomCode, catColor, lang = 'de' }: {
  state: QQStateUpdate; myTeamId: string; emit: any; roomCode: string; catColor: string; lang?: 'de' | 'en';
}) {
  const isMyTurn = s.hotPotatoActiveTeamId === myTeamId;
  const eliminated = s.hotPotatoEliminated.includes(myTeamId);
  // B1 (2026-04-29): Im 'no strikes'-Modell (Commit c4d0404e) bleibt das Team
  // nach falschem/duplikaten Submit aktiv und darf weiter tippen — Backend
  // setzt nur lastAnswer als Feedback. Wir zeigen das als Hinweis-Chip über
  // dem Input statt SubmittedBadge, sonst sperrt sich der Spieler selbst aus.
  // Bei Treffer rotiert das Backend via qqHotPotatoNext und cleart lastAnswer
  // (isMyTurn wird false -> Komponente blendet sich raus).
  const lastAttempt = isMyTurn ? (s.hotPotatoLastAnswer || '') : '';
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

  // Auto-focus when it becomes your turn.
  // preventScroll: true verhindert, dass Mobile-Browser den Header weg-scrollen.
  useEffect(() => {
    if (isMyTurn) {
      setVal('');
      setTimeout(() => ref.current?.focus({ preventScroll: true }), 120);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
  }, [isMyTurn]);

  // B7: Auto-Submit beim HotPotato-Turn-Ende — sonst geht eingetippte Antwort
  // verloren (Backend eliminiert das Team bei Timer-Ablauf). Fire 250ms vor
  // Deadline, damit der Submit ankommt bevor der Eliminate-Callback feuert.
  const expired = useExpiry(isMyTurn ? (s.hotPotatoTurnEndsAt ?? null) : null);
  const valRef = useRef(val); valRef.current = val;
  const firedRef = useRef(false);
  useEffect(() => { firedRef.current = false; }, [s.hotPotatoActiveTeamId, s.hotPotatoTurnEndsAt]);
  useEffect(() => {
    if (expired && isMyTurn && !firedRef.current) {
      firedRef.current = true;
      const text = valRef.current.trim();
      if (text.length >= 1) {
        // 2026-05-11 (Audit P0): Submit-Vibe verstärkt von 40ms-Single auf
    // Burst [30,40,80] — kurz-pause-langer Confirm-Buzz. Spieler im lauten
    // Pub merkt jetzt klar dass der Tap gelandet ist.
    if (navigator.vibrate) navigator.vibrate([30, 40, 80]);
        safeEmit(emit, 'qq:hotPotatoAnswer', { roomCode, teamId: myTeamId, answer: text });
        setVal('');
      }
    }
  }, [expired, isMyTurn, emit, roomCode, myTeamId]);

  if (eliminated) return null; // eliminated teams see the status badge above, not the input
  if (!isMyTurn) return null;  // not your turn — status shown in the main view above

  // 2026-05-06 (Wolf-Wunsch 'Slot-Machine vor erstem HP-Zug'): Solange der
  // Slot dreht, ist zwar isMyTurn=true, aber Antwortfeld wird ausgeblendet —
  // sonst koennte man tippen waehrend die Animation laeuft (und der Timer
  // ist eh noch nicht gestartet). Wir zeigen ein Wartefeld mit Slot-Hinweis.
  if ((s as any).hotPotatoSlotState === 'rolling') {
    return (
      <div style={{
        marginTop: 4, padding: '14px 16px', borderRadius: 12,
        background: 'rgba(236,72,153,0.10)',
        border: `1.5px dashed ${catColor}`,
        textAlign: 'center', color: '#FBCFE8', fontSize: 14, fontWeight: 800,
        animation: 'tcpulse 1.5s ease-in-out infinite',
      }}>
        🎰 {lang === 'de' ? 'Slot dreht — gleich geht es los!' : 'Slot is spinning — get ready!'}
      </div>
    );
  }

  async function submit() {
    if (!val.trim() || expired) return;
    // 2026-05-11 (Audit P0): Submit-Vibe verstärkt von 40ms-Single auf
    // Burst [30,40,80] — kurz-pause-langer Confirm-Buzz. Spieler im lauten
    // Pub merkt jetzt klar dass der Tap gelandet ist.
    if (navigator.vibrate) navigator.vibrate([30, 40, 80]);
    await safeEmit(emit, 'qq:hotPotatoAnswer', { roomCode, teamId: myTeamId, answer: val.trim() });
    setVal('');
    setTimeout(() => ref.current?.focus({ preventScroll: true }), 60);
  }

  const urgency = secondsLeft !== null && secondsLeft <= 5;

  return (
    <div style={{ marginTop: 4 }}>
      {/* Countdown bar */}
      {secondsLeft !== null && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          marginBottom: 8, padding: '6px 12px', borderRadius: 8,
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
      {/* B1: Letzte nicht akzeptierte Antwort als Hinweis-Chip — Team darf
          weiter tippen (continuous typing seit c4d0404e). */}
      {lastAttempt && (
        <div style={{
          marginBottom: 8, padding: '8px 12px', borderRadius: 8,
          background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)',
          fontSize: 13, fontWeight: 700, color: '#fca5a5', textAlign: 'center',
          animation: 'tcpulse 0.4s ease-out',
        }}>
          {lang === 'de' ? `Nicht akzeptiert: „${lastAttempt}" — versuch's nochmal!` : `Not accepted: "${lastAttempt}" — try again!`}
        </div>
      )}
      <StandardInput
        ref={ref}
        value={val}
        onChange={setVal}
        onEnter={() => val.trim() && submit()}
        catColor={catColor}
        placeholder={t.answer.enterAnswer[lang]}
        ariaLabel={lang === 'de' ? 'Antwort eingeben' : 'Enter your answer'}
        disabled={expired}
        urgency={urgency}
      />
      <SubmitBtn onSubmit={submit} canSubmit={!expired && !!val.trim()} submitted={false} catColor={catColor} />
    </div>
  );
}

// TextInput / MuchoInput / AllInInput / Top5Input / FixItInput jetzt in
// '../components/CozyQuizTeamQuestionInputs'. useExpiry in '../hooks/useExpiry'.

// (Block extrahiert — siehe Notiz oben.)

// ── 4 gewinnt / Only Connect: progressive Hinweise + Freitext-Tipp ────────────
// ── Bluff: 3-Phasen-Team-Input ────────────────────────────────────────────────
function BluffInput({ state: s, myTeamId, emit, roomCode, catColor, lang }: {
  state: QQStateUpdate; myTeamId: string; emit: any; roomCode: string; catColor: string; lang: 'de' | 'en';
}) {
  const phase = s.bluffPhase;
  const myBluff = (s.bluffSubmissions ?? {})[myTeamId] ?? '';
  const myVote = (s.bluffVotes ?? {})[myTeamId];
  const myPoints = (s.bluffPoints ?? {})[myTeamId];
  const [val, setVal] = useState(myBluff);
  const [submitted, setSubmitted] = useState(!!myBluff);

  // Sync state from server (e.g. when other teams join)
  useEffect(() => {
    if (myBluff && !submitted) {
      setSubmitted(true);
      setVal(myBluff);
    }
  }, [myBluff, submitted]);

  // B7: Auto-Submit beim Ablauf der Write-Phase (falls Text vorhanden).
  const writeExpired = useExpiry(phase === 'write' ? (s.bluffWriteEndsAt ?? null) : null);
  const valRef = useRef(val); valRef.current = val;
  const submittedRef = useRef(submitted); submittedRef.current = submitted;
  const firedRef = useRef(false);
  useEffect(() => {
    if (writeExpired && !firedRef.current && !submittedRef.current) {
      firedRef.current = true;
      const text = valRef.current.trim();
      if (text.length >= 1) {
        safeEmit(emit, 'qq:bluffSubmit', { roomCode, teamId: myTeamId, text });
        setSubmitted(true);
      }
    }
  }, [writeExpired, emit, roomCode, myTeamId]);

  const submit = () => {
    if (submitted || writeExpired) return;
    const text = val.trim();
    if (text.length < 1) return;
    safeEmit(emit, 'qq:bluffSubmit', { roomCode, teamId: myTeamId, text });
    setSubmitted(true);
  };

  const vote = (optId: string) => {
    if (myVote) return;
    safeEmit(emit, 'qq:bluffVote', { roomCode, teamId: myTeamId, optionId: optId });
  };

  // ── Write Phase ─────────────────────────────────────────────────────────
  if (phase === 'write' || !phase) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          padding: '10px 14px', borderRadius: 16,
          background: 'rgba(244,114,182,0.12)', border: '1px solid rgba(244,114,182,0.3)',
          fontSize: 13, color: '#fbcfe8', fontWeight: 700, lineHeight: 1.4,
        }}>
          {lang === 'de'
            ? '🎭 Erfindet eine plausibel klingende Falsch-Antwort. Andere Teams werden dafür stimmen — wer reinfällt, bringt euch Punkte!'
            : '🎭 Make up a plausible-sounding wrong answer. Other teams will vote — fooling them earns you points!'}
        </div>
        <StandardInput
          value={val}
          onChange={setVal}
          onEnter={submit}
          catColor={catColor}
          placeholder={lang === 'de' ? 'Erfundene Antwort…' : 'Your made-up answer…'}
          disabled={submitted || writeExpired}
          maxLength={200}
          submitted={submitted}
        />
        <SubmitBtn
          onSubmit={submit}
          canSubmit={!writeExpired && val.trim().length >= 1}
          submitted={submitted}
          catColor={catColor}
          label={lang === 'de' ? '✓ Bluff abgeben' : '✓ Submit bluff'}
          submittedLabel={lang === 'de' ? 'Eingereicht — andere warten' : 'Submitted — waiting on others'}
          lang={lang}
        />
        {submitted && (
          <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', fontWeight: 700, lineHeight: 1.4 }}>
            {lang === 'de' ? 'Sobald alle eingereicht haben, geht\'s zum Voting.' : 'Once everyone\'s in, voting starts.'}
          </div>
        )}
      </div>
    );
  }

  // ── Review Phase ────────────────────────────────────────────────────────
  if (phase === 'review') {
    return (
      <div style={{
        padding: '14px 16px', borderRadius: 16,
        background: 'rgba(244,114,182,0.10)', border: '1px solid rgba(244,114,182,0.3)',
        textAlign: 'center', fontSize: 14, color: '#fbcfe8', fontWeight: 700,
      }}>
        {lang === 'de' ? '👮 Moderator prüft die Bluffs… gleich geht\'s weiter.' : '👮 Moderator reviewing bluffs… one moment.'}
      </div>
    );
  }

  // ── Vote Phase ──────────────────────────────────────────────────────────
  if (phase === 'vote') {
    // Per-Team Subset: jedes Team sieht real + 3 zufällige andere Bluffs.
    // Fallback auf globalen Pool falls Subset noch nicht da ist (race).
    const opts = (s.bluffOptionsByTeam ?? {})[myTeamId] ?? s.bluffOptions ?? [];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{
          padding: '10px 14px', borderRadius: 16,
          background: 'rgba(244,114,182,0.12)', border: '1px solid rgba(244,114,182,0.3)',
          fontSize: 13, color: '#fbcfe8', fontWeight: 700, lineHeight: 1.4,
        }}>
          {lang === 'de'
            ? `🗳 Welche Antwort ist die ECHTE? (${myVote ? '✓ Gewählt' : 'Bitte wählen'})`
            : `🗳 Which answer is REAL? (${myVote ? '✓ Voted' : 'Pick one'})`}
        </div>
        {opts.map((opt, i) => {
          const isOwn = opt.source === 'team' && opt.contributors.includes(myTeamId);
          const chosen = myVote === opt.id;
          const disabled = isOwn || !!myVote;
          return (
            <button
              key={opt.id}
              onClick={() => !disabled && vote(opt.id)}
              disabled={disabled}
              style={{
                padding: '14px 16px', borderRadius: 16, border: 'none',
                textAlign: 'left',
                background: chosen ? `${catColor}30`
                  : isOwn ? 'rgba(255,255,255,0.02)'
                  : 'rgba(255,255,255,0.05)',
                border_: undefined,
                outline: chosen ? `2px solid ${catColor}` : `1px solid ${isOwn ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.10)'}`,
                color: isOwn ? '#475569' : '#F1F5F9',
                fontFamily: 'inherit', fontSize: 16, fontWeight: 900,
                cursor: disabled ? 'default' : 'pointer',
                opacity: isOwn ? 0.5 : 1,
                display: 'flex', alignItems: 'center', gap: 10,
                transition: 'all 0.18s',
                animation: `tcoptIn 0.4s var(--qq-ease-bounce) ${i * 0.07}s both`,
              } as any}
            >
              <span style={{
                width: 26, height: 26, borderRadius: '50%',
                background: chosen ? catColor : 'rgba(255,255,255,0.08)',
                color: chosen ? '#fff' : '#94a3b8',
                fontSize: 13, fontWeight: 900,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>{String.fromCharCode(65 + i)}</span>
              <span style={{ flex: 1, wordBreak: 'break-word' }}>{opt.text}</span>
              {isOwn && (
                <span style={{ fontSize: 10, color: '#475569', fontWeight: 900 }}>
                  {lang === 'de' ? 'dein Bluff' : 'your bluff'}
                </span>
              )}
            </button>
          );
        })}
        {myVote && (
          <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', fontWeight: 700 }}>
            {lang === 'de' ? 'Stimme abgegeben — wartet auf den Rest.' : 'Voted — waiting on others.'}
          </div>
        )}
      </div>
    );
  }

  // ── Reveal Phase ────────────────────────────────────────────────────────
  if (phase === 'reveal') {
    const total = myPoints?.total ?? 0;
    const breakdown: string[] = [];
    if ((myPoints?.foundReal ?? 0) > 0) breakdown.push(lang === 'de' ? `+${myPoints!.foundReal} Echt erkannt` : `+${myPoints!.foundReal} found real`);
    if ((myPoints?.blufferBonus ?? 0) > 0) breakdown.push(lang === 'de' ? `+${myPoints!.blufferBonus} Reingefallen` : `+${myPoints!.blufferBonus} fooled others`);
    if ((myPoints?.truthAccident ?? 0) > 0) breakdown.push(lang === 'de' ? `+${myPoints!.truthAccident} Zufall die Wahrheit getippt!` : `+${myPoints!.truthAccident} accidental truth!`);
    return (
      <div style={{
        padding: '16px 18px', borderRadius: 16,
        background: total > 0 ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)',
        border: total > 0 ? '1px solid rgba(34,197,94,0.45)' : '1px solid rgba(255,255,255,0.10)',
        display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'center',
      }}>
        <div style={{ fontSize: 14, color: '#94a3b8', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {lang === 'de' ? 'Eure Teilpunkte' : 'Your points'}
        </div>
        <div style={{
          fontSize: 32, fontWeight: 900,
          color: total > 0 ? '#86EFAC' : '#94a3b8',
        }}>{total}</div>
        {breakdown.length > 0 && (
          <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
            {breakdown.join(' · ')}
          </div>
        )}
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
          {lang === 'de' ? 'Schau auf den Beamer — Auflösung läuft.' : 'Check the beamer — reveal in progress.'}
        </div>
      </div>
    );
  }

  return null;
}

// 2026-05-09 v2 (Wolf-Reform): Connect 4 vereinfacht.
// - Alle 4 Hints sofort sichtbar (kein progressives Freischalten mehr).
// - 1 Tipp pro Team. Richtig → Aktion. Falsch → gelockt.
// - Reihenfolge der Aktionen nach Speed (submittedAt) wie sonst auch.
function OnlyConnectInput({ state: s, myTeamId, emit, roomCode, catColor, lang }: {
  state: QQStateUpdate; myTeamId: string; emit: any; roomCode: string; catColor: string; lang: 'de' | 'en';
}) {
  const q = s.currentQuestion!;
  const bt = q.bunteTuete as import('../../../shared/quarterQuizTypes').QQBunteTueteOnlyConnect;
  const hintsAll = (lang === 'en' && bt.hintsEn?.length === 4 ? bt.hintsEn : bt.hints) ?? [];
  const isLocked = (s.onlyConnectLockedTeams ?? []).includes(myTeamId);
  const isMyWin = (s.onlyConnectGuesses ?? []).some(g => g.teamId === myTeamId && g.correct);
  const alreadyAnswered = isMyWin || isLocked;
  const [val, setVal] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!alreadyAnswered) ref.current?.focus(); }, [alreadyAnswered]);

  const expired = useExpiry(s.timerEndsAt ?? null);
  const valRef = useRef(val); valRef.current = val;
  const firedRef = useRef(false);
  useEffect(() => {
    if (expired && !firedRef.current && !alreadyAnswered) {
      firedRef.current = true;
      const text = valRef.current.trim();
      if (text.length >= 1) {
        safeEmit(emit, 'qq:onlyConnectGuess', { roomCode, teamId: myTeamId, text });
        setVal('');
      }
    }
  }, [expired, alreadyAnswered, emit, roomCode, myTeamId]);

  const submit = () => {
    if (alreadyAnswered || expired) return;
    const text = val.trim();
    if (text.length < 1) return;
    safeEmit(emit, 'qq:onlyConnectGuess', { roomCode, teamId: myTeamId, text });
    setVal('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!alreadyAnswered && (
        <div style={{
          fontSize: 12, color: '#94A3B8', textAlign: 'center', fontWeight: 700,
          lineHeight: 1.4, padding: '0 4px',
        }}>
          {lang === 'de'
            ? 'Was verbindet diese 4 Begriffe? 1 Tipp pro Team.'
            : 'What connects these 4 terms? 1 guess per team.'}
        </div>
      )}

      {/* 4 Hint-Slots — ALLE sofort sichtbar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[0, 1, 2, 3].map(i => {
          const hintColor = i === 0 ? '#EC4899' : i === 1 ? '#22C55E' : i === 2 ? '#60A5FA' : '#A78BFA';
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px', borderRadius: 10,
              background: `${hintColor}18`,
              border: `1px solid ${hintColor}55`,
              fontFamily: 'inherit', textAlign: 'left',
              width: '100%', minHeight: 44,
              animation: `tcoptIn 0.4s var(--qq-ease-bounce) ${i * 0.06}s both`,
            }}>
              <span style={{
                fontSize: 11, fontWeight: 900,
                color: hintColor,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                width: 32, textAlign: 'center', flexShrink: 0,
              }}>{lang === 'de' ? `H${i+1}` : `C${i+1}`}</span>
              <span style={{
                fontSize: 16, fontWeight: 900, color: '#F1F5F9', flex: 1,
              }}>{hintsAll[i]}</span>
            </div>
          );
        })}
      </div>

      {isMyWin && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, textAlign: 'center',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
          fontSize: 14, fontWeight: 900, color: '#CBD5E1',
        }}>
          {lang === 'de' ? '✓ Tipp eingegangen — wartest auf Auflösung' : '✓ Tip submitted — waiting for reveal'}
        </div>
      )}
      {isLocked && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, textAlign: 'center',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
          fontSize: 13, fontWeight: 900, color: '#94A3B8',
        }}>
          {lang === 'de' ? 'Tipp abgegeben — wartest auf Auflösung' : 'Tip submitted — waiting for reveal'}
        </div>
      )}

      {!alreadyAnswered && (
        <>
          <StandardInput
            ref={ref}
            value={val}
            onChange={setVal}
            onEnter={submit}
            catColor={catColor}
            placeholder={lang === 'de' ? 'Verbindung tippen…' : 'Your guess…'}
            disabled={expired}
          />
          <SubmitBtn
            onSubmit={submit}
            canSubmit={!expired && val.trim().length >= 1}
            submitted={false}
            catColor={catColor}
            label={lang === 'de' ? '✓ Tipp abgeben' : '✓ Submit guess'}
            lang={lang}
          />
          <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center', fontWeight: 700 }}>
            {lang === 'de' ? '1 Versuch — schnellste richtige Antwort gewinnt zuerst' : '1 try — fastest correct answer wins first'}
          </div>
        </>
      )}
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
    // 2026-05-11 (Audit P0): Submit-Vibe verstärkt von 40ms-Single auf
    // Burst [30,40,80] — kurz-pause-langer Confirm-Buzz. Spieler im lauten
    // Pub merkt jetzt klar dass der Tap gelandet ist.
    if (navigator.vibrate) navigator.vibrate([30, 40, 80]);
    setSubmitted(true);
    await safeEmit(emit, 'qq:imposterChoose', { roomCode, teamId: myTeamId, statementIndex: current.idx });
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
      <div style={{ padding: '12px 16px', borderRadius: 16, textAlign: 'center', background: 'rgba(255,255,255,0.04)', color: '#64748b', fontSize: 14, fontWeight: 700 }}>
        {t.imposter.waiting[lang]}
      </div>
    );
  }
  // Eliminated
  if (isEliminated) {
    return (
      <div style={{ padding: '12px 16px', borderRadius: 16, textAlign: 'center', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 15, fontWeight: 900 }}>
        {t.imposter.eliminated[lang]}
      </div>
    );
  }
  // Waiting for other team
  if (!isMyTurn) {
    return (
      <div style={{ padding: '12px 16px', borderRadius: 16, textAlign: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', fontSize: 14, fontWeight: 700 }}>
        <QQEmojiIcon emoji="🕵️"/> {activeTeam?.name ?? '?'} {lang === 'en' ? 'is choosing' : 'wählt gerade'}<AnimatedDots />
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{available.length} {lang === 'en' ? `statement${available.length !== 1 ? 's' : ''} left` : `Aussage${available.length !== 1 ? 'n' : ''} übrig`}</div>
      </div>
    );
  }
  // Already submitted this turn
  if (submitted) {
    return (
      <div style={{ padding: '12px 16px', borderRadius: 16, textAlign: 'center', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80', fontSize: 15, fontWeight: 900 }}>
        {t.imposter.chosen[lang]}
      </div>
    );
  }

  if (!available.length) return <div style={{ color: '#64748b', fontSize: 14, textAlign: 'center', padding: 12 }}>{t.imposter.allChosen[lang]}</div>;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
        <QQEmojiIcon emoji="🕵️"/> {lang === 'en' ? 'Your turn — which is false?' : 'Du bist dran — welche ist falsch?'}
      </div>

      {/* Drum wheel */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          borderRadius: 16, height: SLOT_H * 3, overflow: 'hidden', position: 'relative',
          background: 'rgba(10,15,35,0.97)', border: '1px solid rgba(148,163,184,0.15)',
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
          borderTop: '1px solid rgba(148,45,89,0.5)',
          borderBottom: '1px solid rgba(148,45,89,0.5)',
          fontSize: 'clamp(14px,3.8vw,17px)', fontWeight: 900, color: '#ffe4f2',
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

// FixItInput jetzt in '../components/CozyQuizTeamQuestionInputs'.

// ── Pin It: simple coordinate input (no leaflet dep needed for basic version) ──
function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function PinItInput({ question: q, catColor, onSubmit, lang = 'de', timerEndsAt, myTeam }: { question: any; catColor: string; onSubmit: (v: string) => void; lang?: 'de' | 'en'; timerEndsAt?: number | null; myTeam?: QQTeam | null }) {
  const bt = q?.bunteTuete;
  // 2026-05-05 (Wolf 'Map zeigt aktuell das Zielgebiet vorgezoomt = Hinweis,
  // bitte neutrale Ansicht'): Default-Center jetzt mittig auf der Welt (0,0)
  // statt auf bt.lat/lng (= Lösungs-Position!). Zoom 2 = Welt-Übersicht.
  // Falls die Frage explizit `bt.zoom` setzt, wird das honoriert (z.B. wenn
  // Mod absichtlich auf eine Region beschränken will).
  const centerLat = 20;       // grob Mittel-Welt-Latitude
  const centerLng = 0;        // Greenwich
  const zoom = bt?.zoom ?? 2; // Welt-Level
  const [pin, setPin] = useState<[number, number] | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // 2026-05-07 (Wolf 'map+pin etwas haesslich'): Custom-Pin im Beamer-Stil —
  // Avatar in Team-Farbe + dunkler Schaft, statt Default-Leaflet-Marker
  // (blau-roter PNG der bei jedem zweiten Quiz auffaellt). Voyager-Tiles
  // statt Default-OSM (warmer + cleaner Cozy-Look).
  const teamColor = myTeam?.color ?? catColor;
  const teamEmoji = (myTeam as any)?.emoji ?? '📍';
  const customPinIcon = useMemo(() => L.divIcon({
    className: 'qq-team-pin-mobile',
    html: `<div style="
      position: relative; width: 48px; height: 64px;
      animation: qqTeamPinDrop 0.5s cubic-bezier(0.34, 1.5, 0.64, 1) both;
      transform-origin: 50% 100%;
      filter: drop-shadow(0 5px 7px rgba(0,0,0,0.55));
    ">
      <div style="
        position: absolute; left: 50%; top: 32px;
        transform: translateX(-50%);
        width: 0; height: 0;
        border-left: 7px solid transparent;
        border-right: 7px solid transparent;
        border-top: 32px solid #1A1A1A;
        z-index: 1;
      "></div>
      <div style="
        position: absolute; left: 4px; top: 0;
        width: 40px; height: 40px; border-radius: 50%;
        background: ${teamColor};
        border: 2px solid #1A1A1A;
        box-shadow: 0 0 18px ${teamColor}66, inset 0 -3px 5px rgba(0,0,0,0.18), inset 0 2px 3px rgba(255,255,255,0.22);
        display: flex; align-items: center; justify-content: center;
        z-index: 2;
        font-size: 24px; line-height: 1;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
      ">${teamEmoji}</div>
    </div>`,
    iconSize: [48, 64] as any,
    iconAnchor: [24, 60] as any,
  }), [teamColor, teamEmoji]);

  // B7: Auto-Submit on Timer-End wenn Pin gesetzt; sonst nur Lock.
  const expired = useExpiry(timerEndsAt ?? null);
  const pinRef = useRef(pin); pinRef.current = pin;
  const firedRef = useRef(false);
  useEffect(() => {
    if (expired && !firedRef.current) {
      firedRef.current = true;
      const p = pinRef.current;
      if (p && !submitted) {
        setSubmitted(true);
        onSubmit(`${p[0]},${p[1]}`);
      }
    }
  }, [expired, submitted, onSubmit]);

  function handleSubmit() {
    if (!pin || expired) return;
    setSubmitted(true);
    onSubmit(`${pin[0]},${pin[1]}`);
  }

  // 2026-05-05 v2 (Wolf 'Bild auf /team muss nicht angezeigt werden, nimmt
  // den Platz für die Karte'): Bild-Block entfernt — Bild sieht der Spieler
  // auf dem Beamer eh in voller Pracht. Auf /team brauchen wir die Karte
  // groß damit der Pin präzise gesetzt werden kann. Map nutzt jetzt wieder
  // volle 48vh-Höhe.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
      <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', fontWeight: 700 }}>
        {t.pinIt.tap[lang]}
      </div>
      <div style={{
        borderRadius: 18, overflow: 'hidden',
        border: `2px solid ${pin ? catColor : 'rgba(255,255,255,0.12)'}`,
        height: 'clamp(280px, 48vh, 480px)',
        position: 'relative',
        // 2026-05-07: leichter Inset-Shadow + Aussen-Drop fuer Tiefe.
        boxShadow: pin
          ? `0 0 22px ${catColor}33, inset 0 1px 0 rgba(255,255,255,0.04), 0 6px 18px rgba(0,0,0,0.4)`
          : 'inset 0 1px 0 rgba(255,255,255,0.04), 0 6px 18px rgba(0,0,0,0.4)',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
      }}>
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={zoom}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
          attributionControl={false}
        >
          {/* 2026-05-07 (Wolf): CartoDB Voyager statt Default-OSM. Warmer,
              kuratierter Look — passt zum Cozy-Branding und ist clean genug
              dass die Pin-Position lesbar bleibt. */}
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png" />
          <MapClickHandler onPick={(lat, lng) => { if (!expired) setPin([lat, lng]); }} />
          {pin && <Marker position={pin} icon={customPinIcon} />}
        </MapContainer>
      </div>
      {pin
        ? <div style={{ fontSize: 12, color: catColor, textAlign: 'center', fontWeight: 900 }}><QQEmojiIcon emoji="📍"/> {pin[0].toFixed(4)}, {pin[1].toFixed(4)}</div>
        : <div style={{ fontSize: 11, color: '#475569', textAlign: 'center' }}>{t.pinIt.noPin[lang]}</div>
      }
      <SubmitBtn onSubmit={handleSubmit} canSubmit={!expired && !!pin} submitted={submitted} catColor={catColor} />
    </div>
  );
}

type FreeAction = 'PLACE' | 'STEAL' | 'SHIELD' | 'SWAP' | 'STAPEL' | 'SANDUHR';

function PlacementCard({ state: s, myTeamId, isMyTurn, emit, roomCode, lang = 'de' }: {
  state: QQStateUpdate; myTeamId: string; isMyTurn: boolean; emit: any; roomCode: string; lang?: 'de' | 'en';
}) {
  const [selecting, setSelecting] = useState(false);
  const [freeMode, setFreeMode] = useState<FreeAction | null>(null);
  const [swapFirst, setSwapFirst] = useState<{ r: number; c: number } | null>(null);
  const [tappedCell, setTappedCell] = useState<string | null>(null);
  // Pending-Pick: erst Tap → Highlight + Bestaetigen-Button. Verhindert Misstaps
  // auf grossem Grid (8x8). Greift fuer alle Single-Cell-Aktionen.
  type PendingKind = 'place' | 'steal' | 'ban' | 'shield' | 'stapel';
  const [pendingPick, setPendingPick] = useState<{ r: number; c: number; kind: PendingKind } | null>(null);
  // 2026-05-07 (Wolf-Live-Test): Nach Place-Confirm springt /team sofort
  // auf "Team X waehlt"-Wartesicht — Spieler sieht das eigene Feld nicht
  // gesetzt (auf /beamer schon mit Animation). myRecentPlace haelt fuer
  // ~900ms statt der Wartesicht das Mini-Grid mit Cell-Glow + Banner.
  const [myRecentPlace, setMyRecentPlace] = useState<{ r: number; c: number; kind: PendingKind } | null>(null);
  useEffect(() => {
    if (!myRecentPlace) return;
    const t = window.setTimeout(() => setMyRecentPlace(null), 900);
    return () => window.clearTimeout(t);
  }, [myRecentPlace]);
  // Comeback-Steal-Pause: pendingFor=null, comebackTeamId zeigt aber das aktive Team.
  // Damit andere Teams nicht „Spielfeld" sehen (so als waere die Klau-Phase fertig),
  // sondern weiterhin das klauende Team mit „wartet auf Moderator".
  const isComebackStealActive =
    !!s.comebackHL && s.comebackHL.phase === 'steal' && !!s.comebackTeamId;
  const pendingTeam = s.teams.find(t => t.id === s.pendingFor)
    ?? (isComebackStealActive ? s.teams.find(t => t.id === s.comebackTeamId) : undefined);
  const isComebackStealPause = isComebackStealActive && !!s.comebackStealPaused && !s.pendingFor;

  const pa = s.pendingAction;
  const phase = s.gamePhaseIndex;
  const hasFreeCell = s.grid.some(row => row.some(cell => cell.ownerId === null));
  const myStats = s.teamPhaseStats?.[myTeamId];
  const hasOwnCell = s.grid.some(row => row.some(cell => cell.ownerId === myTeamId));
  // 2026-05-05 (Wolf-Konzept): bei STAPEL_BONUS (Connections-Finale) ist
  // Multi-Stack auf gleichem Feld erlaubt → cell.stuck blockt nicht.
  const isStapelBonusMode = s.pendingAction === 'STAPEL_BONUS';
  const hasStapable = s.grid.some(row => row.some(cell =>
    cell.ownerId === myTeamId && (isStapelBonusMode || !cell.stuck)
  ));
  const hasSandTarget = s.grid.some(row => row.some(cell =>
    !(cell.sandLockTtl && cell.sandLockTtl > 0) && (
      cell.ownerId === null
      || (cell.ownerId !== myTeamId && !cell.stuck && !cell.shielded)
    )));
  const shieldsUsed = myStats?.shieldsUsed ?? 0;
  const shieldsLeft = Math.max(0, 2 - shieldsUsed);
  const stapelsUsed = myStats?.stapelsUsed ?? 0;
  const stapelsLeft = Math.max(0, 3 - stapelsUsed);

  // Derived mode flags
  const isFree      = pa === 'FREE';
  // 2026-04-28: Connections-Placement (nach 4×4-Finale) nutzt auch PLACE_1 —
  // das ist aber KEIN Joker-Bonus, sondern eine reguläre Setz-Aktion pro
  // gefundener Gruppe. (User-Wunsch: 'nach finale soll normale aktion sein,
  // nicht joker, 4 oberbegriffe = 4 aktionen'.)
  const isConnectionsPlacement = s.phase === 'CONNECTIONS_4X4';
  // 2026-05-10 (Live-Test-Bug Wolf 2026-05-07: '/team zeigt Joker obwohl
  // keiner gewonnen wurde'): Pragma-Patch — zusätzliche Gate auf
  // myStats.jokersThisPhase > 0. Schließt false-positive aus (PLACE_1 ohne
  // legitimen Joker → keine Joker-UI), blockiert aber den ersten Joker einer
  // Runde NICHT (Backend setzt jokersThisPhase BEFORE pa=PLACE_1, also liest
  // das Frontend bereits 1 wenn der pa-Switch ankommt). Vorher: rein
  // pa-basiert, was bei timing-Edge-Cases falsch positiv wurde.
  const myJokersThisPhase = (myStats as any)?.jokersThisPhase ?? 0;
  const isJoker     = pa === 'PLACE_1' && phase >= 2 && !isConnectionsPlacement && myJokersThisPhase > 0; // Joker bonus placement
  const isShield    = pa === 'SHIELD_1' || (isFree && freeMode === 'SHIELD');
  const isSwapOne   = pa === 'SWAP_1'   || (isFree && freeMode === 'SWAP');
  // 2026-05-05 (Wolf-Konzept): STAPEL_BONUS = Connections-Finale-Stack-Mode.
  // Selber Cell-Picker wie regulaeres Stapeln, Multi-Stack erlaubt (Backend
  // entscheidet via pendingAction, Frontend nutzt einheitlichen Picker).
  const isStuck     = pa === 'STAPEL_1' || pa === 'STAPEL_BONUS' || (isFree && freeMode === 'STAPEL');
  const isSandLock  = pa === 'SANDUHR_1' || (isFree && freeMode === 'SANDUHR');
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

  // Track newly claimed cells for animation
  const prevGridRef = useRef<string>('');
  const [newCells, setNewCells] = useState<Set<string>>(new Set());
  const [stolenCells, setStolenCells] = useState<Set<string>>(new Set());
  const gridKey = s.grid.flatMap(row => row.map(c => c.ownerId ?? '')).join(',');
  useEffect(() => {
    if (prevGridRef.current && gridKey !== prevGridRef.current) {
      const prevArr = prevGridRef.current.split(',');
      const claimed = new Set<string>();
      const stolen = new Set<string>();
      s.grid.forEach((row, r) => row.forEach((cell, c) => {
        const prevOwner = prevArr[(r * s.gridSize) + c];
        if (cell.ownerId && prevOwner === '') claimed.add(`${r}-${c}`);
        // Owner gewechselt (nicht leer → nicht leer) = Klau
        else if (cell.ownerId && prevOwner && cell.ownerId !== prevOwner) stolen.add(`${r}-${c}`);
      }));
      if (claimed.size > 0) {
        setNewCells(claimed);
        setTimeout(() => setNewCells(new Set()), 1000);
      }
      if (stolen.size > 0) {
        setStolenCells(stolen);
        setTimeout(() => setStolenCells(new Set()), 900);
      }
    }
    prevGridRef.current = gridKey;
  }, [gridKey]);

  useEffect(() => {
    if (!isMyTurn) { setSelecting(false); setFreeMode(null); setSwapFirst(null); setPendingPick(null); }
  }, [isMyTurn]);

  // 2026-05-02: Wolfs Bug 'nach 1. Aktion gabs kein Auswahlmenue mehr, ich war in
  // Stapel-Modus gefangen'. Bei Multi-Slot-Joker-Bonus (placementsLeft > 0) setzt
  // Backend pendingAction nach jeder Aktion zurueck auf 'FREE' (jokerBonusAction).
  // Frontend musste freeMode auch zuruecksetzen damit das Auswahlmenu wieder
  // erscheint. Tracke pendingAction-Wechsel: wenn von einem konkreten Mode
  // (STAPEL_1/STEAL_1/PLACE_1/PLACE_2) zurueck auf 'FREE' → reset.
  const prevPendingActionRef = useRef<string | null | undefined>(pa);
  useEffect(() => {
    const prev = prevPendingActionRef.current;
    prevPendingActionRef.current = pa;
    const wasConcreteMode = prev === 'STAPEL_1' || prev === 'STEAL_1'
      || prev === 'PLACE_1' || prev === 'SANDUHR_1' || prev === 'SHIELD_1' || prev === 'SWAP_1';
    if (wasConcreteMode && pa === 'FREE') {
      setFreeMode(null);
      setSelecting(false);
      setPendingPick(null);
    }
  }, [pa]);

  // Pending-Pick zuruecksetzen wenn der Aktions-Kontext (pendingAction / freeMode)
  // sich aendert oder das Grid neu geladen wird (anderes Team dran etc.).
  useEffect(() => {
    setPendingPick(null);
  }, [s.pendingAction, freeMode, s.questionIndex]);

  // Auto-skip: wenn nur eine einzige Aktion übrig ist (kein Phase-2 Multi-Choice,
  // kein FREE-Menü), direkt ins Grid springen statt den Zwischenbutton zu zeigen.
  useEffect(() => {
    if (!isMyTurn) return;
    if (isPhase2Choice) return;       // Phase-2 place/steal Wahl nötig
    if (isFree && !freeMode) return;  // FREE-Menü noch offen
    if (selecting) return;
    setSelecting(true);
  }, [isMyTurn, isPhase2Choice, isFree, freeMode, selecting]);

  async function chooseFreeAction(action: FreeAction) {
    setFreeMode(action);
    await safeEmit(emit, 'qq:chooseFreeAction', { roomCode, teamId: myTeamId, action });
    // SHIELD: frueher Auto-Apply auf groesstes Cluster, jetzt 1-Feld-Pick
    // (analog SANDUHR/STAPEL) — also einfach Grid oeffnen.
    setSelecting(true);
  }

  async function handleCell(r: number, c: number) {
    if (!isMyTurn || !selecting) return;
    const cell = s.grid[r][c];
    const cellKey = `${r}-${c}`;
    setTappedCell(cellKey);
    setTimeout(() => setTappedCell(null), 300);
    if (typeof navigator.vibrate === 'function') navigator.vibrate(20);

    // 2-Tap-Bestaetigung: zweiter Tap auf dasselbe pending-Feld → direkt
    // confirmen. Tap auf ein anderes Feld unten in der jeweiligen Branch
    // ersetzt das pendingPick (Cancel implizit).
    if (pendingPick && pendingPick.r === r && pendingPick.c === c) {
      await confirmPendingPick();
      return;
    }

    // COMEBACK SWAP_2: two opponent cells from different teams
    if (isSwapComeback) {
      if (!cell.ownerId || cell.ownerId === myTeamId) return;
      if (!swapFirst) { setSwapFirst({ r, c }); return; }
      if (r === swapFirst.r && c === swapFirst.c) return;
      const firstCell = s.grid[swapFirst.r][swapFirst.c];
      if (firstCell.ownerId === cell.ownerId) return;
      await safeEmit(emit, 'qq:swapCells', { roomCode, teamId: myTeamId, rowA: swapFirst.r, colA: swapFirst.c, rowB: r, colB: c });
      if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 50]);
      setSelecting(false); setSwapFirst(null); return;
    }

    // Phase 4 SWAP_1: pick own cell first, then enemy
    if (isSwapOne) {
      if (!swapFirst) {
        if (cell.ownerId !== myTeamId) return;
        setSwapFirst({ r, c });
        await safeEmit(emit, 'qq:swapOneCell', { roomCode, teamId: myTeamId, row: r, col: c });
        return;
      } else {
        if (!cell.ownerId || cell.ownerId === myTeamId) return;
        await safeEmit(emit, 'qq:swapOneCell', { roomCode, teamId: myTeamId, row: r, col: c });
        setSelecting(false); setSwapFirst(null); return;
      }
    }

    // BANN: lock enemy or empty cell for 3 questions
    if (isSandLock) {
      if (cell.sandLockTtl && cell.sandLockTtl > 0) return;
      if (cell.ownerId === myTeamId) return;
      if (cell.stuck || cell.shielded) return;
      setPendingPick({ r, c, kind: 'ban' });
      return;
    }

    // STAPEL: any own non-stuck cell. Bei STAPEL_BONUS (Connections-Finale)
    // ist Multi-Stack erlaubt — stuck-Block entfaellt.
    if (isStuck) {
      if (cell.ownerId !== myTeamId) return;
      if (cell.stuck && !isStapelBonusMode) return;
      setPendingPick({ r, c, kind: 'stapel' });
      return;
    }

    // SCHILD: 1 eigenes Feld auswaehlen (nicht bereits geschuetzt)
    if (isShield) {
      if (cell.ownerId !== myTeamId || cell.shielded) return;
      setPendingPick({ r, c, kind: 'shield' });
      return;
    }

    // STEAL
    if (isSteal) {
      if (!cell.ownerId || cell.ownerId === myTeamId || cell.frozen || cell.stuck || cell.shielded) return;
      setPendingPick({ r, c, kind: 'steal' });
      return;
    }

    // PLACE
    if (cell.ownerId) return;
    setPendingPick({ r, c, kind: 'place' });
  }

  // Bestaetigung des Pending-Picks → emit an Backend, dann Cleanup.
  async function confirmPendingPick() {
    if (!pendingPick) return;
    const { r, c, kind } = pendingPick;
    if (kind === 'ban') {
      await safeEmit(emit, 'qq:sandLockCell', { roomCode, teamId: myTeamId, row: r, col: c });
      if (navigator.vibrate) navigator.vibrate([60, 30, 60, 30, 60]);
    } else if (kind === 'stapel') {
      await safeEmit(emit, 'qq:stapelCell', { roomCode, teamId: myTeamId, row: r, col: c });
      if (navigator.vibrate) navigator.vibrate([40, 20, 40]);
    } else if (kind === 'shield') {
      await safeEmit(emit, 'qq:shieldCell', { roomCode, teamId: myTeamId, row: r, col: c });
      if (navigator.vibrate) navigator.vibrate([30, 20, 30, 20, 60]);
    } else if (kind === 'steal') {
      await safeEmit(emit, 'qq:stealCell', { roomCode, teamId: myTeamId, row: r, col: c });
      if (navigator.vibrate) navigator.vibrate([60, 30, 60]);
    } else if (kind === 'place') {
      await safeEmit(emit, 'qq:placeCell', { roomCode, teamId: myTeamId, row: r, col: c });
      if (navigator.vibrate) navigator.vibrate([40, 20, 40]);
    }
    // 2026-05-07 (Wolf-Live-Test): Eigene Setz-Geste sichtbar halten — der
    // Backend-State-Update kippt isMyTurn auf false, /team wuerde sofort auf
    // Wartesicht springen. myRecentPlace ueberschreibt das fuer 900ms.
    setMyRecentPlace({ r, c, kind });
    setPendingPick(null);
    setSelecting(false);
  }

  function cancelPendingPick() {
    setPendingPick(null);
    if (navigator.vibrate) navigator.vibrate(15);
  }

  // Detect adjacency: cells with 2+ same-team neighbors in a row/col
  function hasAdjacentStreak(r: number, c: number, ownerId: string | null): boolean {
    if (!ownerId) return false;
    let hCount = 1;
    for (let cc = c - 1; cc >= 0 && s.grid[r][cc].ownerId === ownerId; cc--) hCount++;
    for (let cc = c + 1; cc < s.gridSize && s.grid[r][cc].ownerId === ownerId; cc++) hCount++;
    if (hCount >= 2) return true;
    let vCount = 1;
    for (let rr = r - 1; rr >= 0 && s.grid[rr][c].ownerId === ownerId; rr--) vCount++;
    for (let rr = r + 1; rr < s.gridSize && s.grid[rr][c].ownerId === ownerId; rr++) vCount++;
    return vCount >= 2;
  }

  if (!isMyTurn) {
    // miniCellSize nur noch für Avatar- und Font-Approximation; das Grid selbst
    // füllt die Card-Breite per 1fr + aspect-ratio.
    const miniCellSize = Math.min(48, Math.floor(320 / s.gridSize));
    const myTeam = s.teams.find(tm => tm.id === myTeamId);
    // 2026-05-07 (Wolf-Live-Test): Wenn ich gerade gesetzt habe, zeige fuer
    // ~900ms Mini-Grid mit Cell-Highlight statt Avatar+"waehlt" — sonst sieht
    // der Spieler die eigene Setzung gar nicht.
    const showRecentPlaceFlash = myRecentPlace !== null;
    const showPendingTeamView = pendingTeam && !showRecentPlaceFlash;

    return (
      <CozyCard borderColor={myTeam?.color}>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          {showPendingTeamView ? (
            <>
              <QQTeamAvatar avatarId={pendingTeam.avatarId} teamEmoji={pendingTeam.emoji} size={40} style={{
                margin: '0 auto 8px',
                animation: 'tcfloat 2s ease-in-out infinite',
              }} />
              <div style={{ fontWeight: 900, color: pendingTeam.color, fontSize: 17 }}>{pendingTeam.name}</div>
              <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 4, fontWeight: 700 }}>
                {isComebackStealPause
                  ? (pendingTeam.id === myTeamId
                      ? (lang === 'de' ? '✓ Geklaut — warte auf Moderator' : '✓ Stolen — waiting for moderator')
                      : (lang === 'de' ? 'wartet auf Moderator' : 'waiting for moderator'))
                  : (lang === 'de' ? 'wählt ein Feld' : 'is choosing a field')}
                <AnimatedDots />
              </div>
            </>
          ) : (
            /* Placement done — show mini grid + score summary.
               2026-05-07: Banner kippt auf "✓ Gesetzt!" wenn ich gerade
               selbst gesetzt habe (myRecentPlace) — gibt der eigenen
               Setzung 900ms sichtbares Eigen-Feedback bevor die normale
               Wartesicht uebernimmt. */
            <>
              <div style={{
                fontSize: 14, fontWeight: 900,
                color: showRecentPlaceFlash ? (myTeam?.color ?? '#22C55E') : '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12,
                animation: showRecentPlaceFlash ? 'tcCellClaim 0.5s var(--qq-ease-bounce) both' : undefined,
              }}>
                {showRecentPlaceFlash
                  ? (lang === 'de' ? '✓ Gesetzt!' : '✓ Placed!')
                  : (lang === 'de' ? '🎮 Spielfeld' : '🎮 Game Board')}
              </div>
              <div style={{
                // 2026-05-09 v3: square-grid-pattern wie selecting-mode für
                // konsistente Zell-Größen.
                display: 'grid',
                gridTemplateColumns: `repeat(${s.gridSize}, 1fr)`,
                gridTemplateRows: `repeat(${s.gridSize}, 1fr)`,
                aspectRatio: '1 / 1',
                gap: 3, width: '100%', marginBottom: 6,
                padding: 6, borderRadius: 8,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxSizing: 'border-box',
              }}>
                {s.grid.flatMap((row, r) =>
                  row.map((cell, c) => {
                    const cellTeam = s.teams.find(tm => tm.id === cell.ownerId);
                    const isMine = cell.ownerId === myTeamId;
                    const inStreak = cellTeam ? hasAdjacentStreak(r, c, cell.ownerId) : false;
                    const isNew = newCells.has(`${r}-${c}`);
                    const isStuckCell = !!cell.stuck;
                    return (
                      <div key={`${r}-${c}`} style={{
                        // 2026-05-09 v4 (Wolf 'reicht nur bg ohne den kreis'):
                        // Linear-Gradient raus — solid Team-Color BG, kein
                        // Kreis-Eindruck mehr durch diagonalen Verlauf.
                        // aspectRatio raus — Grid garantiert square via 1fr rows.
                        minWidth: 0, minHeight: 0, borderRadius: 4,
                        background: cellTeam ? cellTeam.color : 'rgba(255,255,255,0.04)',
                        border: cellTeam
                          ? (isStuckCell
                              ? `1.5px solid rgba(236,72,153,0.9)`
                              : `1px solid ${cellTeam.color}`)
                          : '1px solid rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: Math.max(10, miniCellSize * 0.45),
                        ['--cell-color' as string]: cellTeam?.color ?? 'transparent',
                        position: 'relative' as const,
                        boxShadow: cellTeam
                          ? [
                              'inset 0 1px 0 rgba(255,255,255,0.22)',
                              'inset 0 -1.5px 0 rgba(0,0,0,0.20)',
                              '1px 1.5px 0 rgba(0,0,0,0.35)',
                              isStuckCell ? '0 0 6px rgba(236,72,153,0.5)' :
                              isNew ? `0 0 10px ${cellTeam.color}aa` :
                              inStreak ? `0 0 6px ${cellTeam.color}55` : '',
                            ].filter(Boolean).join(', ')
                          : 'none',
                        animation: isNew ? 'tcCellClaim 0.5s var(--qq-ease-bounce) both'
                          : inStreak ? 'tcRowPulse 2.5s ease-in-out infinite' : undefined,
                        transition: 'all 0.3s ease',
                      }}>
                        {/* 2026-05-09 v2 (Wolf TODO 1): gestackte Felder zeigen
                            🔒-Schloss statt Avatar — klarer „nicht klaubar"-
                            Eindruck. BG-Teamfarbe bleibt (Eigentum erkennbar).
                            Vorher: Avatar + Pink-Ring (semi-gut erkennbar). */}
                        {cellTeam ? (
                          isStuckCell ? (
                            <div style={{
                              fontSize: Math.max(12, Math.floor(miniCellSize * 0.7)),
                              lineHeight: 1,
                              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))',
                            }}>🔒</div>
                          ) : (
                            <QQTeamAvatar
                              avatarId={cellTeam.avatarId}
                              teamEmoji={cellTeam.emoji}
                              size={Math.max(16, Math.floor(miniCellSize * 0.85))}
                            />
                          )
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </CozyCard>
    );
  }

  const actionColor = isSwapComeback || isSwapOne ? '#8B5CF6'
    : isShield   ? '#06B6D4'
    : isStuck    ? '#EC4899'
    : isSandLock ? '#A855F7'
    : isSteal    ? '#EF4444'
    : isJoker    ? '#EC4899'
    : '#22C55E';

  // Cell clickability per mode
  function isCellClickable(r: number, c: number): boolean {
    const cell = s.grid[r][c];
    if (isSwapComeback) return !!cell.ownerId && cell.ownerId !== myTeamId && (!swapFirst || s.grid[swapFirst.r][swapFirst.c].ownerId !== cell.ownerId);
    if (isSwapOne) return swapFirst ? (!!cell.ownerId && cell.ownerId !== myTeamId && !cell.shielded) : cell.ownerId === myTeamId;
    if (isStuck)    return cell.ownerId === myTeamId && (isStapelBonusMode || !cell.stuck);
    if (isShield)   return cell.ownerId === myTeamId && !cell.shielded;
    if (isSandLock) return !(cell.sandLockTtl && cell.sandLockTtl > 0)
      && cell.ownerId !== myTeamId && !cell.stuck && !cell.shielded;
    if (isSteal)    return !!cell.ownerId && cell.ownerId !== myTeamId && !cell.frozen && !cell.stuck && !cell.shielded;
    return !cell.ownerId;
  }

  const phaseLabel: React.ReactNode = (() => {
    const wrap = (slug: 'marker-swap' | 'marker-shield' | 'marker-sanduhr', text: string) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <QQIcon slug={slug} size={22} alt={text} />
        {text}
      </span>
    );
    if (isSwapComeback || isSwapOne) return wrap('marker-swap', lang === 'de' ? 'Tauschen' : 'Swap');
    if (isShield)   return wrap('marker-shield', lang === 'de' ? 'Schild' : 'Shield');
    if (isStuck)    return lang === 'de' ? '🏯 Stapeln' : '🏯 Stack';
    if (isSandLock) return wrap('marker-sanduhr', lang === 'de' ? 'Bann' : 'Ban');
    if (isSteal)  return t.placement.titleSteal[lang];
    if (isPhase2Choice) return t.placement.titlePhase2[lang];
    if (isJoker) return lang === 'de' ? '⭐ Joker!' : '⭐ Joker!';
    return t.placement.titlePlace[lang];
  })();

  const instructionText = (() => {
    if (isSwapComeback) return swapFirst ? t.placement.swap2nd[lang] : t.placement.tapOpponent12[lang];
    if (isSwapOne) return swapFirst
      ? (lang === 'de' ? 'Jetzt ein Gegner-Feld tippen' : 'Now tap an opponent\'s cell')
      : (lang === 'de' ? 'Erst ein eigenes Feld tippen' : 'First tap one of your own cells');
    if (isStuck) return isStapelBonusMode
      ? (lang === 'de' ? 'Eigenes Feld tippen (Bonus-Stapel, +1 Pkt — gleiches Feld mehrfach erlaubt)' : 'Tap one of your cells (bonus stack, +1 pt — same cell allowed multiple times)')
      : (lang === 'de' ? 'Eigenes Feld tippen (wird gestapelt, 2 Punkte)' : 'Tap one of your cells (stacked, 2 pts)');
    if (isShield) return lang === 'de'
      ? 'Eigenes Feld tippen — wird bis Spielende geschützt'
      : 'Tap one of your cells — shielded till end of game';
    if (isSandLock) return lang === 'de'
      ? 'Feld tippen (Gegner oder leer) — 3 Fragen gebannt'
      : 'Tap a cell (enemy or empty) — banned for 3 questions';
    if (isSteal) return t.placement.tapOpponent[lang];
    if (isJoker) return lang === 'de' ? '⭐ Bonus! Tippe auf ein freies Feld' : '⭐ Bonus! Tap an empty field';
    return t.placement.tapEmpty[lang];
  })();

  // Undo-available: Comeback action gewählt, aber noch nichts ausgeführt
  const myComebackStats = s.teamPhaseStats?.[myTeamId];
  const canUndoComeback = isMyTurn
    && pa === 'COMEBACK'
    && !!s.comebackAction
    && !swapFirst
    && !freeMode
    && !(s.comebackAction === 'PLACE_2' && myComebackStats && myComebackStats.placementsLeft < 2);

  // "Richtig, aber nicht schnellstes Team" — Hinweis, wenn dieses Team in der
  // Gewinner-Reihenfolge nicht der erste war (nur sinnvoll bei normalen
  // Platzierungen, nicht bei Comeback/FREE-Menü/Phase-2-Wahl).
  const winners = s.currentQuestionWinners ?? [];
  const myWinPosition = winners.indexOf(myTeamId);
  const showNotFastestHint = isMyTurn
    && pa !== 'COMEBACK'
    && myWinPosition > 0;
  const positionLabel = (() => {
    if (myWinPosition < 0) return '';
    const n = myWinPosition + 1;
    if (lang === 'de') return n === 2 ? '2.' : n === 3 ? '3.' : `${n}.`;
    const en = n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
    return en;
  })();

  return (
    <CozyCard borderColor={actionColor}>
      <div style={{ fontWeight: 900, fontSize: 18, color: actionColor, marginBottom: 12, textAlign: 'center' }}>
        {phaseLabel}
      </div>

      {showNotFastestHint && (
        <div style={{
          background: 'rgba(236, 72, 153, 0.12)',
          border: '1px solid rgba(236, 72, 153, 0.35)',
          borderRadius: 8,
          padding: '10px 12px',
          marginBottom: 12,
          fontSize: 13,
          lineHeight: 1.4,
          color: '#FBCFE8',
          textAlign: 'center',
        }}>
          {lang === 'de'
            ? <><QQEmojiIcon emoji="✅"/> Auch richtig! Ihr setzt jetzt — als <b>{positionLabel}</b>.</>
            : <><QQEmojiIcon emoji="✅"/> Also correct! You're placing now — in <b>{positionLabel}</b>.</>}
        </div>
      )}

      {/* Phase 2: place 2 OR steal 1 */}
      {isPhase2Choice && !selecting && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          <CozyBtn color="#22C55E" onClick={() => chooseFreeAction('PLACE')}>{t.placement.place2[lang]}</CozyBtn>
          <CozyBtn color="#EF4444" onClick={() => chooseFreeAction('STEAL')}>{t.placement.steal1[lang]}</CozyBtn>
        </div>
      )}

      {/* Phase 3/4 FREE: action menu — saubere Trinity Place/Steal/Stapel.
          Bann, Schild, Tauschen wurden gedroppt zugunsten klarerer Klimakurve. */}
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
          {/* Bann + Schild + Tauschen entfernt — Trinity Place/Steal/Stapel
              ist die finale Mechanik-Auswahl. */}
          {phase >= 3 && hasStapable && stapelsLeft > 0 && (
            <CozyBtn color="#06B6D4" onClick={() => chooseFreeAction('STAPEL')}>
              {lang === 'de'
                ? `🏯 Stapeln (+1 Punkt · ${stapelsLeft}/3 übrig)`
                : `🏯 Stack (+1 point · ${stapelsLeft}/3 left)`}
            </CozyBtn>
          )}
        </div>
      )}

      {/* Confirm button before grid appears */}
      {!showFreeMenu && !isPhase2Choice && !selecting && (
        <CozyBtn color={actionColor} onClick={() => setSelecting(true)}>
          {isSwapComeback || isSwapOne ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <QQIcon slug="marker-swap" size={24} alt="Swap" />
              {lang === 'de' ? 'Felder wählen' : 'Choose fields'}
            </span>
          ) : isStuck ? (lang === 'de' ? '🏯 Feld auswählen' : '🏯 Select cell to stack')
            : isShield ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <QQIcon slug="marker-shield" size={24} alt="Schild" />
                {lang === 'de' ? 'Feld zum Schützen wählen' : 'Select cell to shield'}
              </span>
            )
            : isSandLock ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <QQIcon slug="marker-sanduhr" size={24} alt="Bann" />
                {lang === 'de' ? 'Feld zum Bannen wählen' : 'Select cell to ban'}
              </span>
            )
            : isSteal    ? t.placement.confirmSteal[lang]
            : isJoker    ? (lang === 'de' ? '⭐ Jokerfeld setzen' : '⭐ Place joker cell')
            : t.placement.confirmPlace[lang]}
        </CozyBtn>
      )}

      {/* Grid. 2026-05-09 (Wolf-Bug 'grid springt beim setzen größer/kleiner'):
          gridTemplateColumns auf 1fr-minmax umgestellt — Mini-Status-Grid
          (Wartesicht) und Selecting-Grid haben jetzt EINE gemeinsame Maße,
          kein Layout-Shift mehr beim Wechsel zwischen den beiden Modi. */}
      {selecting && (
        <>
          <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 12 }}>
            {instructionText}
          </div>
          <div style={{
            // 2026-05-09 v3 (Wolf 'überlappen total — clickable + filled
            // unterschiedlich groß'): aspectRatio auf den GRID-Container statt
            // auf die Cells. Grid ist quadratisch, gridTemplateRows: 1fr +
            // gridTemplateColumns: 1fr → jede Cell garantiert quadratisch
            // (Cell = 1fr × 1fr eines square Grids). aspectRatio auf Cells
            // funktionierte vorher nicht zuverlässig — Browser ließen empty
            // Cells zur Row-Höhe stretchen.
            display: 'grid',
            gridTemplateColumns: `repeat(${s.gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${s.gridSize}, 1fr)`,
            aspectRatio: '1 / 1',
            gap: 3, width: '100%',
            padding: 6, borderRadius: 8,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxSizing: 'border-box',
          }}>
            {s.grid.flatMap((row, r) =>
              row.map((cell, c) => {
                const team = s.teams.find(t => t.id === cell.ownerId);
                const isSwapSelected = swapFirst && swapFirst.r === r && swapFirst.c === c;
                const isPending = pendingPick && pendingPick.r === r && pendingPick.c === c;
                // Wenn pendingPick existiert: andere Cells sind quasi 'gelocked'
                // (nur die pending Cell + ggf. Cancel-Button reagieren).
                const clickable = isCellClickable(r, c) && (!pendingPick || isPending === true);
                const isFrozenCell = cell.frozen && !cell.stuck;
                const isStuckCell = cell.stuck;
                const isShieldedCell = !!cell.shielded && !cell.stuck;
                const justStolen = stolenCells.has(`${r}-${c}`);
                const isStuckCandidate = isStuck && cell.ownerId === myTeamId && !cell.stuck;
                const isMine = cell.ownerId === myTeamId;
                const sandTtl = cell.sandLockTtl ?? 0;
                const isSandLocked = sandTtl > 0;
                // Wolf 2026-05-05 (Klaerung): team.color ist die EINE Farbe
                // pro Team, ueberall in der App identisch. 3D-Plaettchen-Look
                // bleibt (Inset-Highlight + Inset-Shadow + Hard-Edge-Drop + Soft-Drop).
                const tColor = team?.color ?? null;
                // 2026-05-09 v4 (Wolf 'reicht nur bg ohne den kreis'): Cell-
                // Styling weiter vereinfacht — Linear-Gradient raus (machte
                // diagonalen Hell/Dunkel-Verlauf der visuell wie "Disc innen"
                // wirkte), nur solid Team-Color BG. Inset-Highlight + Bottom-
                // Drop-Shadow bleiben minimal für leichten 3D-Effekt.
                const ownerShadow = tColor
                  ? [
                      'inset 0 1px 0 rgba(255,255,255,0.18)',
                      'inset 0 -1.5px 0 rgba(0,0,0,0.18)',
                      '1px 1.5px 0 rgba(0,0,0,0.30)',
                    ].join(', ')
                  : '';
                return (
                  <div key={`${r}-${c}`} role={clickable ? 'button' : undefined} tabIndex={clickable ? 0 : undefined}
                    aria-label={`${lang === 'de' ? 'Feld' : 'Cell'} ${r+1},${c+1}${team ? ` (${team.name})` : ''}${isFrozenCell ? ` (${lang === 'de' ? 'eingefroren' : 'frozen'})` : ''}${isPending ? ` (${lang === 'de' ? 'ausgewählt — Bestätigen' : 'selected — confirm'})` : ''}`}
                    onClick={() => handleCell(r, c)} onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleCell(r, c); } : undefined} style={{
                    // aspectRatio raus — Grid garantiert square cells via gridTemplateRows: 1fr
                    minWidth: 0, minHeight: 0, borderRadius: 4,
                    background: isPending ? `${actionColor}88`
                      : isSwapSelected ? `${actionColor}55`
                      : tColor ? tColor : 'rgba(255,255,255,0.04)',
                    border: isPending ? `2px dashed ${actionColor}`
                      : isSwapSelected ? `2px solid ${actionColor}`
                      : isStuckCell ? `1.5px solid rgba(236,72,153,0.9)`
                      : cell.jokerFormed ? `1.5px solid #EC4899`
                      : isStuckCandidate ? `1.5px solid #EC4899`
                      : clickable ? `1.5px solid ${actionColor}`
                      : tColor ? `1px solid ${tColor}`
                      : '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: Math.max(10, cellSize * 0.38),
                    cursor: clickable || isSwapSelected ? 'pointer' : 'default',
                    opacity: team ? 1 : (clickable || isSwapSelected ? 1 : 0.3),
                    transition: 'all 0.15s, box-shadow 0.4s ease, background 0.4s ease, border-color 0.4s ease',
                    boxShadow: isPending ? `0 0 0 3px ${actionColor}55, 0 0 16px ${actionColor}aa`
                      : isSwapSelected ? `0 0 12px ${actionColor}88${ownerShadow ? `, ${ownerShadow}` : ''}`
                      : isStuckCandidate ? `0 0 10px #EC489988${ownerShadow ? `, ${ownerShadow}` : ''}`
                      : isStuckCell
                        ? `${ownerShadow}, 0 0 10px rgba(236,72,153,0.55)`
                        : isFrozenCell ? `${ownerShadow}, 0 0 8px rgba(147,210,255,0.5)`
                        : isMine && tColor ? `${ownerShadow}, 0 0 8px ${tColor}77`
                        : team ? ownerShadow
                        : clickable ? `0 0 6px ${actionColor}44` : 'none',
                    animation: isPending ? 'tccellPendingPulse 1.2s ease-in-out infinite'
                      : justStolen ? 'stealFlash 0.8s ease-out both'
                      : tappedCell === `${r}-${c}` ? 'tccellTap 0.25s ease both' : undefined,
                    // Andere Cells gedimmt waehrend Pending-Pick aktiv ist, damit
                    // der Fokus auf der Auswahl bleibt.
                    ...(pendingPick && !isPending ? { opacity: team ? 0.55 : 0.22 } : {}),
                    position: 'relative' as const, overflow: 'visible' as const,
                  }}>
                    {isFrozenCell && (
                      <>
                        <div style={{
                          position: 'absolute', inset: 0, borderRadius: 6,
                          border: '2px solid rgba(147,210,255,0.7)',
                          background: 'rgba(147,210,255,0.2)',
                          animation: 'frostPulse 2.5s ease-in-out infinite',
                          pointerEvents: 'none', zIndex: 1,
                        }} />
                        <div style={{
                          position: 'absolute', top: -3, right: -3,
                          zIndex: 3, lineHeight: 0,
                        }}>
                          <QQIcon slug="marker-frost" size={Math.max(18, cellSize * 0.42)} alt="Frost" />
                        </div>
                      </>
                    )}
                    {isShieldedCell && (
                      <>
                        <div style={{
                          position: 'absolute', inset: -2, borderRadius: 8,
                          border: '2px solid rgba(236,72,153,0.85)',
                          background: 'rgba(236,72,153,0.12)',
                          animation: 'shieldGlow 2s ease-in-out infinite',
                          pointerEvents: 'none', zIndex: 1,
                        }} />
                        <div style={{
                          position: 'absolute', top: -4, right: -4,
                          zIndex: 3, lineHeight: 0,
                          filter: 'drop-shadow(0 0 6px rgba(236,72,153,0.7))',
                        }}>
                          <QQIcon slug="marker-shield" size={Math.max(18, cellSize * 0.44)} alt="Schild" />
                        </div>
                      </>
                    )}
                    {isSandLocked && (
                      <>
                        <div style={{
                          position: 'absolute', inset: 0, borderRadius: 6,
                          border: '2px solid rgba(168,85,247,0.85)',
                          background: 'linear-gradient(135deg, rgba(168,85,247,0.22), rgba(126,34,206,0.12))',
                          boxShadow: 'inset 0 0 10px rgba(168,85,247,0.4)',
                          animation: 'frostPulse 2.5s ease-in-out infinite',
                          pointerEvents: 'none', zIndex: 1,
                        }} />
                        <div style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          pointerEvents: 'none', zIndex: 3,
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.45))',
                          // C7: Sanduhr droppt + tickt kontinuierlich.
                          animation: 'sanduhrDrop 0.6s var(--qq-ease-bounce) both, sanduhrTick 2.5s ease-in-out 0.65s infinite',
                          transformOrigin: 'center',
                        }}>
                          <QQIcon slug="marker-sanduhr" size={Math.max(20, cellSize * 0.6)} alt="Bann" />
                        </div>
                        <div style={{
                          position: 'absolute', top: -4, right: -4,
                          minWidth: Math.max(14, cellSize * 0.34),
                          height: Math.max(14, cellSize * 0.34),
                          padding: `0 ${Math.max(2, cellSize * 0.04)}px`,
                          borderRadius: '999px',
                          background: 'linear-gradient(135deg, #A855F7, #6B21A8)',
                          border: '2px solid #2E1065',
                          color: '#FFFFFF',
                          fontSize: Math.max(9, cellSize * 0.22),
                          fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.35), 0 0 6px rgba(168,85,247,0.6)',
                          zIndex: 5, fontVariantNumeric: 'tabular-nums',
                        }}>{sandTtl}</div>
                      </>
                    )}
                    <span style={{
                      position: 'relative', zIndex: 2,
                      opacity: isFrozenCell ? 0.5 : undefined,
                      filter: isFrozenCell ? 'saturate(0.4) brightness(1.2)' : undefined,
                      display: 'inline-block',
                      animation: isStuckCell
                        ? 'stapelDrop 0.6s var(--qq-ease-bounce) both'
                        : justStolen
                          ? 'stealCrashIn 0.55s var(--qq-ease-bounce) both'
                          : undefined,
                    }}>
                      {/* 2026-05-05 (Wolf-Bug 'runde felder'): flat-Prop —
                          Avatar-Disc-BG raus, nur Emoji-Glyph. Cell selbst
                          traegt schon die Team-Farbe als BG. Plus Emoji
                          groesser (0.82 → 0.95) wie auf /beamer.
                          2026-05-07 (Live-Test-Bug): Joker-Cells (cell.jokerFormed)
                          zeigten auf /team nichts, /beamer aber schon. Vorrang:
                          Stack > Joker > Avatar (Stack-Bonus auf Joker-Cell
                          ueberschreibt visuell, weil 🏯 die staerkere Aussage ist). */}
                      {/* 2026-05-09 v2 (Wolf TODO 1 'gestackte Felder besser
                          markieren'): 🏯 (Burg = Verb) → 🔒 (Schloss = Resultat
                          „lock = nicht klaubar"). BG-Teamfarbe bleibt — semantisch
                          klarer als das Action-Verb. */}
                      {isStuckCell
                        ? <QQEmojiIcon emoji="🔒"/>
                        : cell.jokerFormed
                          ? <JokerIcon i={r + c} size={Math.max(24, Math.floor(cellSize * 0.95))} alt="Joker" eurovisionMode={!!s.theme?.eurovisionMode} square />
                          : team
                            ? <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={Math.max(24, Math.floor(cellSize * 0.95))} flat />
                            : null}
                    </span>
                    {/* Stapel-Dust-Ring: expandiert einmalig beim Stuck-Mount. */}
                    {isStuckCell && (
                      <div style={{
                        position: 'absolute', inset: -4, borderRadius: 8,
                        border: '2px solid rgba(236,72,153,0.7)',
                        animation: 'stapelDustRing 0.55s ease-out 0.1s both',
                        pointerEvents: 'none', zIndex: 4,
                      }} />
                    )}
                    {/* Steal-Burst: roter Ring platzt beim Klau nach aussen. */}
                    {justStolen && (
                      <div style={{
                        position: 'absolute', inset: 0, borderRadius: 6,
                        border: '3px solid rgba(239,68,68,0.9)',
                        animation: 'stealBurst 0.6s ease-out both',
                        pointerEvents: 'none', zIndex: 4,
                      }} />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pending-Pick Hint — Bottom-Buttons entfernt zugunsten 2-Tap-
              Confirm direkt am Grid (Wolfs Wunsch). Hint-Text macht den
              Flow transparent. */}
          {pendingPick && (
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 16,
              background: `linear-gradient(135deg, ${actionColor}1a, ${actionColor}08)`,
              border: `1px solid ${actionColor}55`,
              fontSize: 14, fontWeight: 900, color: '#e2e8f0', textAlign: 'center',
              lineHeight: 1.4,
              animation: 'tcfloat 1.6s ease-in-out infinite',
            }}>
              <div style={{ marginBottom: 4 }}>
                {pendingPick.kind === 'place'  ? (lang === 'de' ? '👉 Hier setzen?' : '👉 Place here?')
                : pendingPick.kind === 'steal' ? (lang === 'de' ? '👉 Dieses Feld klauen?' : '👉 Steal this cell?')
                : pendingPick.kind === 'ban'   ? (lang === 'de' ? '👉 Dieses Feld bannen?' : '👉 Ban this cell?')
                : pendingPick.kind === 'shield'? (lang === 'de' ? '👉 Dieses Feld schützen?' : '👉 Shield this cell?')
                :                                (lang === 'de' ? '👉 Dieses Feld stapeln?' : '👉 Stack this cell?')}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>
                {lang === 'de'
                  ? 'Tippe nochmal zum Bestätigen — oder ein anderes Feld zum Wechseln.'
                  : 'Tap again to confirm — or another cell to switch.'}
              </div>
            </div>
          )}

          <button onClick={() => { setSelecting(false); setSwapFirst(null); setFreeMode(null); setPendingPick(null); }} style={{
            marginTop: 12, width: '100%', padding: '8px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
            color: '#475569', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
          }}>
            {t.placement.cancel[lang]}
          </button>
        </>
      )}

      {canUndoComeback && (
        <button
          onClick={() => { setSelecting(false); setSwapFirst(null); setFreeMode(null); emit('qq:comebackUndo', { roomCode, teamId: myTeamId }); }}
          style={{
            marginTop: 14, width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid rgba(148,163,184,0.35)', background: 'rgba(148,163,184,0.08)',
            color: '#cbd5e1', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
          }}>
          🔙 {lang === 'de' ? 'Andere Comeback-Aktion wählen' : 'Choose different comeback action'}
        </button>
      )}

      {/* Aktion-Abbrechen wenn freeMode gesetzt aber Grid noch nicht offen
          ist. Sonst war der einzige Cancel-Button im Grid-Subtree → User kam
          nach Free-Mode-Wahl nicht mehr zurück ins Action-Menü ohne erst
          selecting zu starten. */}
      {isMyTurn && (isFree || pa === 'PLACE_2') && freeMode && !selecting && (
        <button
          onClick={() => { setFreeMode(null); setSwapFirst(null); setPendingPick(null); }}
          style={{
            marginTop: 12, width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid rgba(148,163,184,0.35)', background: 'rgba(148,163,184,0.08)',
            color: '#cbd5e1', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
          }}>
          🔙 {lang === 'de' ? 'Andere Aktion wählen' : 'Choose different action'}
        </button>
      )}
    </CozyCard>
  );
}

function ComebackCard({ state: s, myTeamId, isMine, emit, roomCode, lang = 'de' }: {
  state: QQStateUpdate; myTeamId: string; isMine: boolean; emit: any; roomCode: string; lang?: 'de' | 'en';
}) {
  const comebackTeam = s.teams.find(t => t.id === s.comebackTeamId);
  const hl = s.comebackHL;
  const myTeam = s.teams.find(t => t.id === myTeamId);
  const isYearUnitHL = /jahr|year/i.test(hl?.currentPair?.unit ?? '');
  const fmtHL = (n: number) => {
    if (isYearUnitHL) return String(Math.round(n));
    const abs = Math.abs(n);
    // 2026-05-10 (Wolf 'EN-Mode zeigt DE-Suffix'): Mrd./Mio. nur bei DE.
    const isEn = lang === 'en';
    if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + (isEn ? ' bn' : ' Mrd.');
    if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + (isEn ? ' M' : ' Mio.');
    if (abs >= 10_000) return Math.round(n / 1000) + 'k';
    if (abs >= 1000) return n.toLocaleString(isEn ? 'en-US' : 'de-DE');
    return n % 1 === 0 ? String(n) : n.toFixed(1);
  };

  // ── H/L-Phase: Frage oder Warten ────────────────────────────────────────
  if (hl && (hl.phase === 'question' || hl.phase === 'reveal') && hl.currentPair && isMine) {
    const pair = hl.currentPair;
    const myAnswer = hl.answers[myTeamId];
    const answered = myAnswer != null;
    const isReveal = hl.phase === 'reveal';
    const correctChoice = pair.subjectValue > pair.anchorValue ? 'higher' : 'lower';
    const myCorrect = isReveal && myAnswer === correctChoice;
    const teamColor = myTeam?.color ?? '#EC4899';
    const submit = (choice: 'higher' | 'lower') => {
      if (answered) return;
      safeEmit(emit, 'qq:comebackHLAnswer', { roomCode, teamId: myTeamId, choice });
    };
    return (
      <CozyCard borderColor={isReveal ? (myCorrect ? '#22C55E' : '#EF4444') : teamColor}>
        {/* Header */}
        <div style={{
          fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: '#FBCFE8', textAlign: 'center', marginBottom: 10,
        }}>
          ⚡ {lang === 'en' ? 'More or Less' : 'Mehr oder Weniger'} — {lang === 'en' ? 'Round' : 'Runde'} {hl.round + 1}/{hl.rounds}
        </div>

        {/* Frage-Text — Format-B custom, Format-A auto-generiert.
            2026-05-10 (Wolf-Bug 'EN-Spiel zeigt DE-Frage'): Fallback auf
            *En-Felder wenn lang='en'. */}
        {(() => null)()}
        <div style={{
          fontSize: 14, fontWeight: 700, color: '#cbd5e1', textAlign: 'center',
          marginBottom: 12, lineHeight: 1.4,
        }}>
          {(() => {
            const isEn = lang === 'en';
            const pAnchor = isEn ? (pair.anchorLabelEn ?? pair.anchorLabel) : pair.anchorLabel;
            const pSubject = isEn ? (pair.subjectLabelEn ?? pair.subjectLabel) : pair.subjectLabel;
            const pUnit = isEn ? (pair.unitEn ?? pair.unit) : pair.unit;
            const pCustom = isEn ? (pair.customQuestionEn ?? pair.customQuestion) : pair.customQuestion;
            return pCustom
              ? pCustom
              : (isEn
                  ? `Does ${pSubject} have more or less ${pUnit} than ${pAnchor}?`
                  : `Hat ${pSubject} mehr oder weniger ${pUnit} als ${pAnchor}?`);
          })()}
        </div>

        {/* Anchor-Info */}
        <div style={{
          padding: '12px 14px', borderRadius: 16,
          background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.38)',
          textAlign: 'center', marginBottom: 10,
        }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#86efac', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
            {lang === 'en' ? (pair.anchorLabelEn ?? pair.anchorLabel) : pair.anchorLabel}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#86efac', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {fmtHL(pair.anchorValue)}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#cbd5e1', opacity: 0.7, marginTop: 2 }}>
            {lang === 'en' ? (pair.unitEn ?? pair.unit) : pair.unit}
          </div>
        </div>

        {/* Subject */}
        <div style={{
          padding: '12px 14px', borderRadius: 16,
          background: isReveal ? 'rgba(236,72,153,0.18)' : 'rgba(236,72,153,0.1)',
          border: isReveal ? '2px solid #EC4899' : '1px dashed rgba(236,72,153,0.5)',
          textAlign: 'center', marginBottom: 14,
        }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#FBCFE8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
            {lang === 'en' ? (pair.subjectLabelEn ?? pair.subjectLabel) : pair.subjectLabel}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#EC4899', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {isReveal ? fmtHL(pair.subjectValue) : '???'}
          </div>
          {!isReveal && (
            <div style={{ fontSize: 11, fontWeight: 700, color: '#cbd5e1', opacity: 0.7, marginTop: 2 }}>
              {lang === 'en' ? 'Higher or lower?' : 'Mehr oder weniger?'}
            </div>
          )}
          {isReveal && (
            <div style={{
              marginTop: 6, padding: '4px 12px', borderRadius: 999,
              background: correctChoice === 'higher' ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.22)',
              border: `1px solid ${correctChoice === 'higher' ? '#22C55E' : '#EF4444'}`,
              fontSize: 12, fontWeight: 900, color: '#fff',
              display: 'inline-block',
            }}>
              {correctChoice === 'higher'
                ? (lang === 'en' ? 'HIGHER ↑' : 'MEHR ↑')
                : (lang === 'en' ? 'LOWER ↓' : 'WENIGER ↓')}
            </div>
          )}
        </div>

        {/* Action: Buttons (question) oder Ergebnis (reveal) */}
        {!isReveal && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              onClick={() => submit('higher')}
              disabled={answered}
              style={{
                padding: '16px 10px', borderRadius: 16,
                background: myAnswer === 'higher' ? '#22C55E' : 'rgba(34,197,94,0.15)',
                border: `2px solid ${myAnswer === 'higher' ? '#22C55E' : 'rgba(34,197,94,0.5)'}`,
                color: myAnswer === 'higher' ? '#fff' : '#86efac',
                fontSize: 20, fontWeight: 900, fontFamily: 'inherit',
                cursor: answered ? 'default' : 'pointer',
                opacity: answered && myAnswer !== 'higher' ? 0.35 : 1,
                transition: 'all 0.2s ease',
              }}
            >↑<br/>{lang === 'en' ? 'MORE' : 'MEHR'}</button>
            <button
              onClick={() => submit('lower')}
              disabled={answered}
              style={{
                padding: '16px 10px', borderRadius: 16,
                background: myAnswer === 'lower' ? '#EF4444' : 'rgba(239,68,68,0.15)',
                border: `2px solid ${myAnswer === 'lower' ? '#EF4444' : 'rgba(239,68,68,0.5)'}`,
                color: myAnswer === 'lower' ? '#fff' : '#fca5a5',
                fontSize: 20, fontWeight: 900, fontFamily: 'inherit',
                cursor: answered ? 'default' : 'pointer',
                opacity: answered && myAnswer !== 'lower' ? 0.35 : 1,
                transition: 'all 0.2s ease',
              }}
            >↓<br/>{lang === 'en' ? 'LESS' : 'WENIGER'}</button>
          </div>
        )}
        {!isReveal && answered && (
          <div style={{
            marginTop: 12, padding: '8px 12px', borderRadius: 8,
            background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.4)',
            fontSize: 13, fontWeight: 900, color: '#FBCFE8', textAlign: 'center',
          }}>
            ⏳ {lang === 'en' ? 'Waiting for other teams…' : 'Warte auf andere Teams…'}
          </div>
        )}
        {isReveal && (
          <div style={{
            padding: '12px 14px', borderRadius: 16, textAlign: 'center',
            background: myCorrect ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.18)',
            border: `2px solid ${myCorrect ? '#22C55E' : '#EF4444'}`,
            fontSize: 16, fontWeight: 900,
            color: myCorrect ? '#86efac' : '#fca5a5',
          }}>
            {myCorrect
              ? (lang === 'en' ? '✓ Correct! +1 cell to steal' : '✓ Richtig! +1 Feld zum Klauen')
              : (lang === 'en' ? '✕ Wrong this round' : '✕ Diese Runde daneben')}
            {(hl.winnings[myTeamId] ?? 0) > 0 && (
              <div style={{ fontSize: 12, fontWeight: 900, marginTop: 4, opacity: 0.85 }}>
                {lang === 'en' ? 'Total so far: ' : 'Insgesamt bisher: '}
                {hl.winnings[myTeamId]} {hl.winnings[myTeamId] === 1
                  ? (lang === 'en' ? 'cell' : 'Feld')
                  : (lang === 'en' ? 'cells' : 'Felder')}
              </div>
            )}
          </div>
        )}
      </CozyCard>
    );
  }

  // ── H/L-Intro-Phase: Kurze Info für tied-last Team ───────────────────────
  if (hl && hl.phase === 'intro' && isMine) {
    return (
      <CozyCard borderColor="#EC4899">
        <div style={{ textAlign: 'center', padding: '6px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>⚡</div>
          <div style={{ fontWeight: 900, color: '#FBCFE8', fontSize: 17, marginBottom: 10 }}>
            {lang === 'en' ? 'Comeback!' : 'Comeback!'}
          </div>
          {/* Prominenter Rundenzaehler fuer das Team */}
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6,
            marginBottom: 8,
          }}>
            <span style={{
              fontSize: 44, fontWeight: 900, color: '#EC4899', lineHeight: 1,
              textShadow: '0 0 20px rgba(236,72,153,0.55)',
              fontVariantNumeric: 'tabular-nums',
            }}>{hl.rounds}</span>
            <span style={{
              fontSize: 15, fontWeight: 900, color: '#FBCFE8',
            }}>
              {hl.rounds === 1
                ? (lang === 'en' ? 'Round' : 'Runde')
                : (lang === 'en' ? 'Rounds' : 'Runden')}
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', lineHeight: 1.4 }}>
            {lang === 'en'
              ? `"More or Less" — each correct = 1 cell stolen from the leader.`
              : `„Mehr oder Weniger" — pro Richtig = 1 Feld vom 1. Platz.`}
          </div>
        </div>
      </CozyCard>
    );
  }

  // ── Zuschauer (nicht tied-last Team) ─────────────────────────────────────
  if (!isMine) {
    return (
      <CozyCard>
        <div style={{ textAlign: 'center', padding: '4px 0' }}>
          {comebackTeam && (
            <>
              <QQTeamAvatar avatarId={comebackTeam.avatarId} teamEmoji={comebackTeam.emoji} size={40} style={{
                margin: '0 auto',
                animation: 'tcfloat 2s ease-in-out infinite',
              }} />
              <div style={{ fontWeight: 900, color: comebackTeam.color, marginTop: 6 }}>{comebackTeam.name}</div>
            </>
          )}
          <div style={{ fontSize: 14, color: '#EC4899', fontWeight: 700, marginTop: 8 }}>{t.comeback.otherTeam[lang]}</div>
          {hl && hl.teamIds.length > 1 && (
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              {lang === 'en'
                ? `${hl.teamIds.length} teams play "More or Less"`
                : `${hl.teamIds.length} Teams spielen „Mehr oder Weniger"`}
            </div>
          )}
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
          <div style={{ fontWeight: 900, color: '#e2e8f0', textAlign: 'center', fontSize: 17 }}>
            {lang === 'de' ? '🔄 Tausch wird vorbereitet…' : '🔄 Preparing swap…'}
          </div>
        </CozyCard>
      );
    }
    return (
      <CozyCard borderColor="#EC4899">
        <div style={{ fontWeight: 900, color: '#e2e8f0', textAlign: 'center', fontSize: 17 }}>
          {s.comebackAction === 'PLACE_2' && t.comeback.activePlace[lang]}
          {s.comebackAction === 'STEAL_1' && t.comeback.activeSteal[lang]}
          {s.comebackAction === 'SWAP_2'  && t.comeback.activeSwap[lang]}
        </div>
      </CozyCard>
    );
  }

  // First-time choice or returning after undo — show options
  /* fallthrough to return below */

  // Availability check — only offer comeback actions that can actually be executed
  const freeCellCount = s.grid.reduce((sum, row) => sum + row.filter(c => c.ownerId === null).length, 0);
  const opponentCells: Record<string, number> = {};
  for (const row of s.grid) {
    for (const c of row) {
      if (c.ownerId && c.ownerId !== myTeamId) {
        opponentCells[c.ownerId] = (opponentCells[c.ownerId] ?? 0) + 1;
      }
    }
  }
  const opponentTotal = Object.values(opponentCells).reduce((s, n) => s + n, 0);
  const distinctOpponents = Object.keys(opponentCells).length;

  const canPlace2 = freeCellCount >= 2;
  const canSteal1 = opponentTotal >= 1;
  const canSwap2  = opponentTotal >= 2 && distinctOpponents >= 2;

  const options: Array<{ action: string; icon: string; iconSlug?: 'marker-swap'; label: string; desc: string; color: string; available: boolean; reason: string }> = [
    { action: 'PLACE_2', icon: '📍', label: t.comeback.place2[lang], desc: t.comeback.place2desc[lang], color: '#22C55E', available: canPlace2, reason: lang === 'de' ? 'zu wenig freie Felder' : 'not enough free cells' },
    { action: 'STEAL_1', icon: '⚡', label: t.comeback.steal1[lang], desc: t.comeback.steal1desc[lang], color: '#EF4444', available: canSteal1, reason: lang === 'de' ? 'keine gegnerischen Felder' : 'no opponent cells' },
    { action: 'SWAP_2',  icon: '🔄', iconSlug: 'marker-swap', label: t.comeback.swap2[lang], desc: t.comeback.swap2desc[lang], color: '#8B5CF6', available: canSwap2,  reason: lang === 'de' ? 'weniger als 2 gegnerische Teams' : 'fewer than 2 opposing teams' },
  ];
  const anyAvailable = options.some(o => o.available);

  return (
    <CozyCard borderColor="#EC4899">
      <div style={{ fontWeight: 900, fontSize: 18, color: '#EC4899', marginBottom: 16, textAlign: 'center' }}>
        {t.comeback.title[lang]}
      </div>
      {!anyAvailable && (
        <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 12, fontStyle: 'italic' }}>
          {lang === 'de' ? 'Keine Aktion möglich — warte auf Moderator.' : 'No action possible — wait for moderator.'}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map(opt => {
          const disabled = !opt.available;
          return (
            <button key={opt.action} disabled={disabled}
              onClick={() => {
                if (disabled) return;
                if (navigator.vibrate) navigator.vibrate(30);
                safeEmit(emit, 'qq:comebackChoice', { roomCode, teamId: myTeamId, action: opt.action });
              }}
              style={{
                padding: '14px 16px', borderRadius: 16,
                cursor: disabled ? 'not-allowed' : 'pointer',
                background: COZY_CARD_BG,
                border: `2px solid ${disabled ? 'rgba(255,255,255,0.08)' : opt.color + '44'}`,
                textAlign: 'left', fontFamily: 'inherit',
                display: 'flex', gap: 12, alignItems: 'center',
                transition: 'all 0.15s',
                opacity: disabled ? 0.4 : 1,
                filter: disabled ? 'grayscale(0.7)' : undefined,
              }}>
              {opt.iconSlug
                ? <QQIcon slug={opt.iconSlug} size={32} alt={opt.label} />
                : <span style={{ fontSize: 28, lineHeight: 1 }}><QQEmojiIcon emoji={opt.icon}/></span>}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, color: disabled ? '#64748b' : opt.color, fontSize: 15 }}>{opt.label}</div>
                <div style={{ fontFamily: "'Caveat', cursive", fontSize: 13, color: disabled ? '#475569' : '#475569', marginTop: 2 }}>
                  {disabled ? `🚫 ${opt.reason}` : opt.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </CozyCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4×4 CONNECTIONS — Team-Card (Multi-Select + Submit)
// ═══════════════════════════════════════════════════════════════════════════════
const CONN_GROUP_COLORS = ['#EC4899', '#22C55E', '#60A5FA', '#A78BFA'];

function ConnectionsTeamCard({ state: s, myTeamId, emit, roomCode, lang = 'de' }: {
  state: QQStateUpdate;
  myTeamId: string;
  emit: (event: string, payload?: unknown) => Promise<QQAck>;
  roomCode: string;
  lang?: 'de' | 'en';
}) {
  const de = lang === 'de';
  const c = s.connections;
  const myTeam = s.teams.find(t => t.id === myTeamId);
  const teamColor = myTeam?.color ?? '#EC4899';

  if (!c) {
    return (
      <CozyCard borderColor="#EC4899">
        <div style={{ padding: 18, textAlign: 'center', color: '#94a3b8' }}>
          {de ? '4×4 wird vorbereitet…' : 'Loading…'}
        </div>
      </CozyCard>
    );
  }

  const tp = c.teamProgress[myTeamId];
  const found = tp?.foundGroupIds.length ?? 0;
  const fails = tp?.failedAttempts ?? 0;
  const locked = tp?.isLockedOut ?? false;
  const isFinished = (tp?.finishedAt ?? null) != null;
  const selected = tp?.selectedItems ?? [];
  // Items aus eigenen gefundenen Gruppen
  const myFoundItems = new Set<string>();
  (tp?.foundGroupIds ?? []).forEach(gid => {
    const g = c.payload.groups.find(gg => gg.id === gid);
    g?.items.forEach(it => myFoundItems.add(it));
  });
  // Map item → meine gefundene Gruppe (für Färbung)
  const itemToMyGroup = new Map<string, { idx: number; color: string }>();
  (tp?.foundGroupIds ?? []).forEach(gid => {
    const g = c.payload.groups.find(gg => gg.id === gid);
    if (!g) return;
    const idx = c.payload.groups.findIndex(gg => gg.id === gid);
    g.items.forEach(it => itemToMyGroup.set(it, { idx, color: CONN_GROUP_COLORS[idx] }));
  });

  // Phase-spezifische Hauptansicht
  if (c.phase === 'intro') {
    return (
      <CozyCard borderColor="#EC4899">
        <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>🧩</div>
          {/* Synchron mit Beamer-Header: 'Großes Finale' / 'Grand Finale'. */}
          <div style={{ fontSize: 26, fontWeight: 900, color: '#FBCFE8', textShadow: '0 0 20px rgba(236,72,153,0.4)' }}>
            {de ? 'Großes Finale' : 'Grand Finale'}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.4 }}>
            {de
              ? 'Findet 4 Gruppen — gewinnt Felder fürs Spielfeld.'
              : 'Find 4 groups — earn cells on the board.'}
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 6,
            fontSize: 13, color: '#cbd5e1', lineHeight: 1.4,
          }}>
            <div>🎯 {de ? '4 Begriffe wählen → abgeben' : 'Pick 4 → submit'}</div>
            <div>🏯 {de ? '1 Gruppe = 1 Stapel-Bonus (+1 Pkt)' : '1 group = 1 stack-bonus (+1 pt)'}</div>
            <div>❌ {de ? `${c.maxFailedAttempts} Fehler erlaubt` : `${c.maxFailedAttempts} fails allowed`}</div>
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            {de ? 'Wartet aufs Startsignal…' : 'Waiting for moderator…'}
          </div>
        </div>
      </CozyCard>
    );
  }

  if (c.phase === 'reveal' || c.phase === 'placement' || c.phase === 'done') {
    return (
      <CozyCard borderColor={teamColor}>
        <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: teamColor }}>
              {myTeam?.name}
            </span>
            <span style={{
              padding: '4px 12px', borderRadius: 999,
              background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.5)',
              fontSize: 12, fontWeight: 900, color: '#86EFAC',
            }}>
              {found} {de ? 'Gruppen' : 'groups'} {found > 0 ? `→ ×${found} ${de ? 'Stapel' : 'stacks'}` : ''}
            </span>
          </div>
          {locked && (
            <div style={{ fontSize: 13, color: '#FCA5A5', fontWeight: 900, textAlign: 'center' }}>
              {de ? `Ausgeschieden nach ${fails} Fehlversuchen` : `Out after ${fails} fails`}
            </div>
          )}
          {/* 2026-05-07 (Wolf-Bug): waehrend Connections-Placement (Stapel-
              Phase nach Finale) zeigt /team jetzt das aktive Team statt nur
              "Setzen laeuft" — analog zur normalen PlacementCard-Wartesicht. */}
          {c.phase === 'placement' && (() => {
            const placingTeam = s.teams.find(t => t.id === s.pendingFor);
            if (!placingTeam) {
              return (
                <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                  {de ? 'Schaut auf den Beamer — Setzen läuft.' : 'Watch the beamer — placement in progress.'}
                </div>
              );
            }
            const isMine = placingTeam.id === myTeamId;
            return (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 12,
                background: `${placingTeam.color}14`,
                border: `1px solid ${placingTeam.color}55`,
              }}>
                <QQTeamAvatar avatarId={placingTeam.avatarId} teamEmoji={placingTeam.emoji} size={36} style={{
                  animation: 'tcfloat 2s ease-in-out infinite',
                }} />
                <div style={{ fontSize: 14, fontWeight: 900, color: placingTeam.color }}>
                  {isMine ? (de ? 'Du bist dran!' : 'Your turn!') : placingTeam.name}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>
                  {isMine
                    ? (de ? 'Stapel-Feld waehlen' : 'Pick a stack cell')
                    : (de ? 'stapelt gerade' : 'is stacking')}
                  <AnimatedDots />
                </div>
              </div>
            );
          })()}
          {c.phase === 'reveal' && (
            <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
              {de ? 'Auflösung läuft…' : 'Reveal in progress…'}
            </div>
          )}
          {c.phase === 'done' && (
            <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
              {de ? 'Finale beendet — Punkte werden vergeben' : 'Finale done — scoring'}
            </div>
          )}
        </div>
      </CozyCard>
    );
  }

  // c.phase === 'active' → Spielzeit
  return (
    <CozyCard borderColor={teamColor}>
      <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Header: Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[0,1,2,3].map(i => (
              <span key={i} style={{
                width: 14, height: 14, borderRadius: 4,
                background: i < found ? '#22C55E' : 'rgba(255,255,255,0.10)',
                border: i < found ? '1px solid #16A34A' : '1px solid rgba(255,255,255,0.18)',
              }} />
            ))}
          </div>
          <ConnectionsTeamTimer endsAt={c.endsAt} />
          <span style={{
            padding: '3px 10px', borderRadius: 999,
            background: fails > 0 ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${fails > 0 ? '#EF4444' : 'rgba(255,255,255,0.12)'}`,
            fontSize: 11, fontWeight: 900,
            color: fails > 0 ? '#FCA5A5' : '#94a3b8',
          }}>
            {de ? 'Fehler' : 'Fails'} {fails}/{c.maxFailedAttempts}
          </span>
        </div>

        {locked || isFinished ? (
          <div style={{
            padding: 14, textAlign: 'center', borderRadius: 16,
            background: locked ? 'rgba(239,68,68,0.10)' : 'rgba(34,197,94,0.10)',
            border: `1px solid ${locked ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)'}`,
            color: locked ? '#FCA5A5' : '#86EFAC',
            fontWeight: 900, fontSize: 14,
          }}>
            {locked
              ? (de ? `🚫 Ausgeschieden — wartet auf Auflösung.` : `🚫 Out — wait for reveal.`)
              : (de ? `✓ Alle 4 Gruppen gefunden! Wartet aufs Auflösen.` : `✓ All 4 groups found! Wait for reveal.`)}
          </div>
        ) : (
          <>
            {/* 4×4 Grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 6, width: '100%',
            }}>
              {c.itemOrder.map((item, i) => {
                const isMyFound = myFoundItems.has(item);
                const myGroupColor = itemToMyGroup.get(item)?.color;
                const isSelected = selected.includes(item);
                const disabled = isMyFound;
                return (
                  <button
                    key={`${item}-${i}`}
                    disabled={disabled}
                    onClick={() => safeEmit(emit, 'qq:connectionsSelectItem', { roomCode, teamId: myTeamId, item })}
                    style={{
                      padding: '8px 2px', borderRadius: 8,
                      background: isMyFound && myGroupColor
                        ? `linear-gradient(135deg, ${myGroupColor}38, ${myGroupColor}15)`
                        : isSelected
                          ? `${teamColor}30`
                          : 'rgba(255,255,255,0.04)',
                      border: isMyFound && myGroupColor
                        ? `2px solid ${myGroupColor}`
                        : isSelected
                          ? `2px solid ${teamColor}`
                          : '2px solid rgba(255,255,255,0.10)',
                      color: isMyFound ? '#fff' : isSelected ? '#fff' : '#e2e8f0',
                      fontSize: 'clamp(10px, 3vw, 13px)',
                      fontWeight: 900, lineHeight: 1.1,
                      cursor: disabled ? 'default' : 'pointer',
                      minHeight: 56,
                      opacity: disabled ? 0.7 : 1,
                      transition: 'all 0.18s ease',
                      fontFamily: 'inherit',
                      // Bricht NUR ein Wort, das länger als die Spalte ist (kein Char-by-Char-Stacking).
                      overflowWrap: 'break-word',
                      wordBreak: 'normal',
                      hyphens: 'auto',
                    }}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            {/* Submit-Button */}
            <button
              disabled={selected.length !== 4}
              onClick={() => safeEmit(emit, 'qq:connectionsSubmit', { roomCode, teamId: myTeamId })}
              style={{
                padding: '14px 18px', borderRadius: 16,
                border: 'none',
                background: selected.length === 4
                  ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                  : 'rgba(255,255,255,0.06)',
                color: selected.length === 4 ? '#0a1f0d' : '#64748b',
                fontSize: 16, fontWeight: 900,
                cursor: selected.length === 4 ? 'pointer' : 'not-allowed',
                boxShadow: selected.length === 4 ? '0 4px 14px rgba(34,197,94,0.4)' : 'none',
                fontFamily: 'inherit',
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}
            >
              {selected.length === 4
                ? (de ? '✓ Gruppe abgeben' : '✓ Submit group')
                : (de ? `${selected.length}/4 ausgewählt` : `${selected.length}/4 selected`)}
            </button>
          </>
        )}
      </div>
    </CozyCard>
  );
}

function ConnectionsTeamTimer({ endsAt }: { endsAt: number }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, (endsAt - Date.now()) / 1000));
  useEffect(() => {
    const iv = setInterval(() => {
      setRemaining(Math.max(0, (endsAt - Date.now()) / 1000));
    }, 500);
    return () => clearInterval(iv);
  }, [endsAt]);
  const m = Math.floor(remaining / 60);
  const sec = Math.floor(remaining % 60);
  const urgent = remaining <= 30;
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 999,
      background: urgent ? 'rgba(239,68,68,0.18)' : 'rgba(236,72,153,0.15)',
      border: `1px solid ${urgent ? '#EF4444' : 'rgba(236,72,153,0.4)'}`,
      fontSize: 13, fontWeight: 900, color: urgent ? '#FCA5A5' : '#FBCFE8',
      fontVariantNumeric: 'tabular-nums',
    }}>
      ⏱ {String(m).padStart(2, '0')}:{String(sec).padStart(2, '0')}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Final-Wager-Mechanik (Wolf 2026-05-09):
// Vor der letzten Spiel-Phase tippen Teams Felder als Wetten auf andere
// Teams (oder sich selbst). Cap: max floor(eigene_Felder / 2).
// Reveal nach Final-Phase als Bonus-Coins (Score-Cascade auf Beamer).
// ─────────────────────────────────────────────────────────────────────────
// 2026-05-09 (Final-Wager Refactor): Tipp-Variante. KEINE Cell-Selection mehr —
// das Team wählt 1 Tipp aus der Team-Liste. Bonus = N Final-Kat-Wins des
// getippten Teams (0-5), +1 Sympathie-Bonus bei Mutual-Pair (A→B && B→A).
// KEIN Verlust, kein Cell-Removal. Self-Tipp erlaubt (kein Sympathie möglich).
function FinalBettingCard({
  state: s, myTeamId, emit, roomCode, lang,
}: {
  state: QQStateUpdate; myTeamId: string;
  emit: any; roomCode: string; lang: 'de' | 'en';
}) {
  const de = lang === 'de';
  const myTeam = s.teams.find(t => t.id === myTeamId);
  const myColor = myTeam?.color ?? '#EC4899';
  const [pickedTargetId, setPickedTargetId] = React.useState<string | null>(null);
  const submitted = !!s.finalBettingSubmitted?.[myTeamId];
  const totalSubmitted = Object.values(s.finalBettingSubmitted ?? {}).filter(Boolean).length;
  const totalTeams = s.teams.length;

  const handleSubmit = () => {
    if (!pickedTargetId) {
      safeEmit(emit, 'qq:submitFinalBet', { roomCode, teamId: myTeamId, bet: null });
    } else {
      safeEmit(emit, 'qq:submitFinalBet', { roomCode, teamId: myTeamId, bet: { targetTeamId: pickedTargetId } });
    }
    if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
  };

  if (submitted) {
    const myBet = s.finalBets?.[myTeamId];
    const targetTeam = myBet ? s.teams.find(t => t.id === myBet.targetTeamId) : null;
    return (
      <CozyCard borderColor={myColor}>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: 38, marginBottom: 8 }}>🎲</div>
          <div style={{ fontWeight: 900, fontSize: 19, color: myColor, marginBottom: 6 }}>
            {de ? 'Tipp abgegeben!' : 'Tip placed!'}
          </div>
          {targetTeam && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 999,
              background: `${targetTeam.color}1a`,
              border: `1.5px solid ${targetTeam.color}66`,
              marginBottom: 12,
            }}>
              <span style={{ fontSize: 12, color: '#94A3B8' }}>{de ? 'Du tippst auf' : 'You tip'}</span>
              <QQTeamAvatar avatarId={targetTeam.avatarId} teamEmoji={targetTeam.emoji} size={24} />
              <span style={{ fontWeight: 900, color: targetTeam.color }}>{targetTeam.name}</span>
            </div>
          )}
          {!targetTeam && (
            <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 12, fontStyle: 'italic' }}>
              {de ? 'Kein Tipp abgegeben (0 Bonus möglich)' : 'No tip placed (0 bonus possible)'}
            </div>
          )}
          <div style={{ fontSize: 14, color: '#94A3B8', marginBottom: 12 }}>
            {de
              ? `${totalSubmitted} von ${totalTeams} Teams haben getippt`
              : `${totalSubmitted} of ${totalTeams} teams tipped`}
          </div>
          <div style={{
            padding: '12px 14px', borderRadius: 12,
            background: `${myColor}14`, border: `1px solid ${myColor}33`,
            fontSize: 13, color: '#CBD5E1', lineHeight: 1.4,
          }}>
            {de
              ? 'Schau jetzt auf den Beamer — die Final-Runde startet gleich.'
              : 'Watch the beamer — the final round starts soon.'}
          </div>
        </div>
      </CozyCard>
    );
  }

  return (
    <CozyCard borderColor={myColor} pulse>
      <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
          {de ? '🪙 Final-Tipp' : '🪙 Final tip'}
        </div>
        <div style={{ fontWeight: 900, fontSize: 22, color: '#F1F5F9', marginBottom: 4, letterSpacing: '-0.01em' }}>
          {de ? 'Auf wen tippst du?' : 'Who do you bet on?'}
        </div>
        <div style={{ fontSize: 13, color: '#CBD5E1', marginBottom: 14, lineHeight: 1.45 }}>
          {/* 2026-05-09 (Wolf): Sympathie-Bonus bewusst nicht erwähnt — bleibt
              Überraschung beim End-Reveal. */}
          {de
            ? 'Pro gewonnene Final-Kategorie deines Tipps = +1 Bonus. Kein Verlust!'
            : 'For each final-category win of your tip = +1 bonus. No loss!'}
        </div>
      </div>

      {/* Team-Liste als Picker. Tap = pick (toggle off bei zweitem Tap). */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {s.teams.map(t => {
          const isMe = t.id === myTeamId;
          const isPicked = pickedTargetId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setPickedTargetId(isPicked ? null : t.id);
                if (navigator.vibrate) navigator.vibrate(isPicked ? 8 : 15);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px',
                borderRadius: 14,
                background: isPicked ? `${t.color}33` : `${t.color}14`,
                border: isPicked ? `2.5px solid ${t.color}` : `1.5px solid ${t.color}55`,
                color: '#F1F5F9', cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 15, fontWeight: 800,
                textAlign: 'left',
                transition: 'transform 0.14s, background 0.18s, border 0.18s, box-shadow 0.18s',
                boxShadow: isPicked ? `0 0 24px ${t.color}88, 0 4px 12px rgba(0,0,0,0.3)` : 'none',
                transform: isPicked ? 'scale(1.02)' : 'scale(1)',
              }}
              onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
              onTouchEnd={(e) => { e.currentTarget.style.transform = isPicked ? 'scale(1.02)' : 'scale(1)'; }}
            >
              <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={42} />
              <span style={{ flex: 1, color: t.color, fontSize: 17 }}>{t.name}</span>
              {isMe && (
                <span style={{
                  fontSize: 10, fontWeight: 900,
                  padding: '3px 8px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.10)', color: '#F1F5F9',
                  letterSpacing: 0.4,
                }}>{de ? 'ICH' : 'ME'}</span>
              )}
              {isPicked && (
                <span style={{
                  fontSize: 18, lineHeight: 1,
                }}>✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Submit-Btn */}
      <CozyBtn color={pickedTargetId ? myColor : '#64748B'} onClick={handleSubmit}>
        {pickedTargetId
          ? (de ? 'Tipp bestätigen' : 'Confirm tip')
          : (de ? 'Ohne Tipp abgeben (0 Bonus)' : 'Submit no tip (0 bonus)')}
      </CozyBtn>
    </CozyCard>
  );
}

// 2026-05-09 v3 (Wolf 'während recap auf /team einen hinweis statt voller
// tabelle'): kompakte Card die zwischen Final-Fragen erscheint. Zeigt
// das eigene Tipp-Target + Wins-Status, und führt Spieler-Blick zum
// Beamer fürs vollständige Standing.
function FinalRecapHintCard({
  state: s, myTeamId, lang,
}: {
  state: QQStateUpdate; myTeamId: string; lang: 'de' | 'en';
}) {
  const de = lang === 'de';
  const myBet = (s.finalBets ?? {})[myTeamId];
  const targetTeam = myBet?.targetTeamId ? s.teams.find(t => t.id === myBet.targetTeamId) : null;
  const targetWins = targetTeam ? ((s.finalPhaseWins ?? {})[targetTeam.id] ?? 0) : 0;
  const myTeam = s.teams.find(t => t.id === myTeamId);
  const myColor = myTeam?.color ?? '#EC4899';
  return (
    <CozyCard borderColor={myColor}>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 36, marginBottom: 6 }}>📊</div>
        <div style={{
          fontSize: 11, fontWeight: 900, color: '#94A3B8',
          textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8,
        }}>
          {de ? '🪙 Zwischenstand' : '🪙 Standings'}
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#F1F5F9', lineHeight: 1.4, marginBottom: 14 }}>
          {de ? 'Schau auf den Beamer — wie steht dein Tipp?' : 'Check the screen — how\'s your tip doing?'}
        </div>
        {targetTeam ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            padding: '12px 16px', borderRadius: 16,
            background: `${targetTeam.color}1a`,
            border: `1.5px solid ${targetTeam.color}66`,
          }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {de ? 'Dein Tipp' : 'Your tip'}
            </span>
            <QQTeamAvatar avatarId={targetTeam.avatarId} teamEmoji={targetTeam.emoji} size={36} />
            <span style={{ fontWeight: 900, color: targetTeam.color, fontSize: 16, flex: 1, textAlign: 'left' }}>
              {targetTeam.name}
            </span>
            <span style={{
              fontSize: 22, fontWeight: 900, color: '#FBBF24',
              fontVariantNumeric: 'tabular-nums',
              textShadow: '0 0 12px rgba(251,191,36,0.5)',
            }}>{targetWins} 🏆</span>
          </div>
        ) : (
          <div style={{
            fontSize: 13, color: '#94A3B8', fontStyle: 'italic',
            padding: '10px 14px', borderRadius: 12,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          }}>
            {de ? 'Du hattest keinen Tipp abgegeben.' : 'You placed no tip.'}
          </div>
        )}
      </div>
    </CozyCard>
  );
}

// 2026-05-09: TeamPickerModal entfernt — FinalBettingCard zeigt die Team-Liste
// jetzt direkt inline (Tipp-Variante, kein separates Modal mehr nötig).

// 2026-05-09 (Final-Wager Refactor): Tipp-Variante. Zeigt mein Tipp-Ergebnis:
// targetTeam · N Wins · Sympathie-Bonus · Total-Bonus.
function FinalRevealCard({
  state: s, myTeamId, lang,
}: {
  state: QQStateUpdate; myTeamId: string; lang: 'de' | 'en';
}) {
  const de = lang === 'de';
  const myTeam = s.teams.find(t => t.id === myTeamId);
  const myColor = myTeam?.color ?? '#EC4899';
  const myResolution = s.finalBetResolution?.[myTeamId];
  const targetTeam = myResolution?.targetTeamId ? s.teams.find(t => t.id === myResolution.targetTeamId) : null;
  const mutualPartner = myResolution?.mutualWith ? s.teams.find(t => t.id === myResolution.mutualWith) : null;

  return (
    <CozyCard borderColor={myColor}>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 38, marginBottom: 8 }}>🏆</div>
        <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
          {de ? 'Final-Auflösung' : 'Final reveal'}
        </div>
        {!myResolution || !targetTeam ? (
          <div style={{ fontSize: 14, color: '#94A3B8', fontStyle: 'italic', padding: '14px 0' }}>
            {de ? 'Du hattest keinen Tipp abgegeben — kein Bonus.' : 'You placed no tip — no bonus.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
            {/* Mein Tipp */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 14,
              background: `${targetTeam.color}1a`,
              border: `1.5px solid ${targetTeam.color}66`,
            }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>
                {de ? 'Tipp' : 'Tip'}
              </span>
              <QQTeamAvatar avatarId={targetTeam.avatarId} teamEmoji={targetTeam.emoji} size={32} />
              <span style={{ flex: 1, fontWeight: 900, color: targetTeam.color, fontSize: 15, textAlign: 'left' }}>{targetTeam.name}</span>
              <span style={{ fontSize: 22, fontWeight: 900, color: targetTeam.color }}>
                {myResolution.targetWins}× 🏆
              </span>
            </div>
            {/* Sympathie-Bonus 💞 wenn mutual */}
            {mutualPartner && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(244,114,182,0.18), rgba(236,72,153,0.10))',
                border: '1.5px solid rgba(244,114,182,0.55)',
                boxShadow: '0 0 18px rgba(244,114,182,0.35)',
              }}>
                <span style={{ fontSize: 22 }}>💞</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#FBCFE8', textAlign: 'left' }}>
                  {de
                    ? `Sympathie-Bonus mit ${mutualPartner.name}`
                    : `Sympathy bonus with ${mutualPartner.name}`}
                </span>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#FBCFE8' }}>+1</span>
              </div>
            )}
            {/* Total */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 16px', borderRadius: 14,
              background: 'rgba(34,197,94,0.12)',
              border: '2px solid rgba(34,197,94,0.45)',
              marginTop: 4,
            }}>
              <span style={{ fontSize: 14, color: '#86EFAC', fontWeight: 800 }}>
                {de ? '✨ Dein Bonus' : '✨ Your bonus'}
              </span>
              <span style={{ fontSize: 26, fontWeight: 900, color: '#22C55E' }}>
                +{myResolution.totalBonus}
              </span>
            </div>
          </div>
        )}
        <div style={{ marginTop: 14, fontSize: 13, color: '#94A3B8', lineHeight: 1.4 }}>
          {de ? 'Schau auf den Beamer für die End-Awards!' : 'Watch the beamer for the end-awards!'}
        </div>
      </div>
    </CozyCard>
  );
}

function PausedCard({ state: s, myTeamId, lang = 'de' }: { state: QQStateUpdate; myTeamId: string; lang?: 'de' | 'en' }) {
  const de = lang === 'de';
  const sorted = [...s.teams].sort((a, b) => b.totalCells - a.totalCells);
  const myTeam = s.teams.find(t => t.id === myTeamId);
  const myRank = sorted.findIndex(t => t.id === myTeamId) + 1;

  return (
    <CozyCard>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#94a3b8' }}>
          ⏸ {de ? 'Kurze Pause' : 'Short Break'}
        </div>

        {myTeam && (
          <div style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: '14px 18px',
            border: `2px solid ${myTeam.color}44`,
          }}>
            <div style={{ fontSize: 14, color: '#64748b', fontWeight: 700, marginBottom: 6 }}>
              {de ? 'Dein Stand' : 'Your Position'}
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: myTeam.color }}>
              #{myRank}
            </div>
            <div style={{ fontSize: 16, color: '#94a3b8', fontWeight: 700 }}>
              {myTeam.totalCells} {de ? (myTeam.totalCells === 1 ? 'Feld' : 'Felder') : (myTeam.totalCells === 1 ? 'cell' : 'cells')}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.map((t, i) => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
              borderRadius: 8,
              background: t.id === myTeamId ? 'rgba(255,255,255,0.06)' : 'transparent',
            }}>
              <span style={{ fontSize: 16, width: 24, textAlign: 'center', color: '#64748b', fontWeight: 900 }}>
                {i === 0 ? <QQEmojiIcon emoji="🥇"/> : i === 1 ? <QQEmojiIcon emoji="🥈"/> : i === 2 ? <QQEmojiIcon emoji="🥉"/> : `${i + 1}.`}
              </span>
              <span style={{ flex: 1, fontWeight: 900, fontSize: 15, color: t.color }}>{t.name}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#EC4899' }}>{t.totalCells}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 14, color: '#475569', fontWeight: 700 }}>
          {de ? 'Gleich geht\'s weiter…' : 'Continuing soon…'}
        </div>
      </div>
    </CozyCard>
  );
}

function GameOverCard({ state: s, myTeamId, lang = 'de', roomCode }: { state: QQStateUpdate; myTeamId: string; lang?: 'de' | 'en'; roomCode?: string }) {
  const sorted  = [...s.teams].sort((a, b) => b.largestConnected - a.largestConnected);
  const myRank  = sorted.findIndex(t => t.id === myTeamId) + 1;
  const myTeam  = sorted.find(t => t.id === myTeamId);
  const winner  = sorted[0];
  const iWon = myRank === 1;
  // 2026-05-02 (Stamm-Team-Code): teamId als lesbarer Code formatiert (T-ABC123).
  // Wird beim naechsten Pub-Besuch im Setup eingegeben → Win-Streak wird angezeigt.
  const stammCode = formatStammCode(myTeamId);

  return (
    <CozyCard borderColor={iWon ? '#EC4899' : undefined}>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        {/* Hero section */}
        <div style={{ animation: 'tcwinBounce 0.7s ease both' }}>
          {iWon ? (
            <div style={{ fontSize: 52, marginBottom: 4 }}><QQEmojiIcon emoji="🏆"/></div>
          ) : (
            <QQTeamAvatar avatarId={winner.avatarId} teamEmoji={winner.emoji} size={52} style={{ margin: '0 auto 4px' }} />
          )}
          {iWon ? (
            <div style={{ fontSize: 26, fontWeight: 900, color: myTeam?.color, marginBottom: 4 }}>
              {t.gameOver.won[lang]}
            </div>
          ) : (
            <>
              <div style={{ fontWeight: 900, color: winner.color, fontSize: 22, marginBottom: 2 }}>
                {t.gameOver.wins[lang].replace('{name}', winner.name)}
              </div>
              <div style={{
                display: 'inline-block', padding: '4px 14px', borderRadius: 999,
                background: `${myTeam?.color ?? '#64748b'}18`,
                border: `1px solid ${myTeam?.color ?? '#64748b'}44`,
                fontSize: 14, fontWeight: 900, color: myTeam?.color ?? '#94a3b8',
              }}>
                {lang === 'de' ? `Ihr: Platz ${myRank}` : `You: #${myRank}`}
              </div>
            </>
          )}
        </div>

        {/* Rankings */}
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.map((tm, i) => {
            const cellCount = s.grid.flatMap(row => row.filter(c => c.ownerId === tm.id)).length;
            // 2026-05-05 (Wolf 'team color = team id'): tm.color ist seit
            // Backend-Fix automatisch die Brett-Palette-Farbe.
            const tmColor = tm.color;
            return (
              <div key={tm.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 16,
                background: tm.id === myTeamId ? `${tmColor}18` : 'rgba(255,255,255,0.03)',
                border: tm.id === myTeamId ? `2px solid ${tmColor}44` : '1px solid rgba(255,255,255,0.06)',
                animation: `tcreveal 0.5s ease ${0.3 + i * 0.12}s both`,
              }}>
                <span style={{ fontSize: 16, width: 24, fontWeight: 900,
                  color: i === 0 ? '#EAB308' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#475569',
                }}>{i === 0 ? <QQEmojiIcon emoji="🥇"/> : i === 1 ? <QQEmojiIcon emoji="🥈"/> : i === 2 ? <QQEmojiIcon emoji="🥉"/> : `#${i + 1}`}</span>
                <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={24} />
                <span style={{ fontWeight: 900, color: tmColor, flex: 1, fontSize: 15 }}>{tm.name}</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: i === 0 ? '#EAB308' : '#94a3b8' }}>
                    {tm.largestConnected} {t.gameOver.connected[lang]}
                  </div>
                  <div style={{ fontSize: 11, color: '#475569' }}>{cellCount} {lang === 'de' ? 'gesamt' : 'total'}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 2026-05-02 (Stamm-Team-Code): zeige meinen Code als Wiederkommer-Anker.
            Sichtbar in GAME_OVER und THANKS — Spieler kann ihn abfotografieren. */}
        <div style={{
          marginTop: 14, padding: '10px 14px', borderRadius: 16,
          background: 'rgba(236,72,153,0.08)',
          border: '1px solid rgba(236,72,153,0.30)',
          textAlign: 'center',
          animation: 'tcreveal 0.5s ease 0.4s both',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 900, color: '#EC4899',
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4,
          }}>
            {lang === 'de' ? '🔖 Dein Stamm-Code' : '🔖 Your regular code'}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginTop: 2, marginBottom: 4,
          }}>
            <div style={{
              fontSize: 22, fontWeight: 900, color: '#FBCFE8',
              fontFamily: 'monospace', letterSpacing: '0.04em',
              userSelect: 'all',
            }}>
              {stammCode}
            </div>
            {/* 2026-05-03: Copy-Button — Wolf-Wunsch. Code soll nicht abgeschrieben
                werden muessen, sondern in Notes/WhatsApp pasten koennen. */}
            <CopyButton text={stammCode} lang={lang} />
          </div>
          <div style={{
            fontSize: 11, color: '#94a3b8', fontWeight: 700,
            marginTop: 4, lineHeight: 1.35,
          }}>
            {lang === 'de'
              ? 'Beim nächsten Mal eingeben — deine Sieg-Streak zählt mit.'
              : 'Enter it next time — your win streak carries over.'}
          </div>
        </div>

        {/* Thanks message + summary link — only on THANKS phase */}
        {s.phase === 'THANKS' && (
          <div style={{
            marginTop: 18,
            animation: 'tcreveal 0.5s ease 0.5s both',
          }}>
            <div style={{
              fontSize: 17, fontWeight: 900, color: '#FBCFE8',
              textAlign: 'center', marginBottom: 4, lineHeight: 1.35,
            }}>
              {lang === 'en' ? '✨ Thanks for playing! ✨' : '✨ Danke fürs Mitspielen! ✨'}
            </div>
            <div style={{
              fontSize: 14, fontWeight: 700, color: '#94a3b8',
              textAlign: 'center', marginBottom: 14,
            }}>
              {lang === 'en' ? 'We hope you had fun — see you next round!' : 'Wir hoffen, ihr hattet Spaß — bis zum nächsten Mal!'}
            </div>
            {roomCode && (
              <a
                href={`/summary/${encodeURIComponent(roomCode)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block', padding: '14px 16px',
                  borderRadius: 16, textAlign: 'center',
                  background: 'linear-gradient(135deg, #EC4899, #EC4899)',
                  color: '#0A0814', fontWeight: 900, fontSize: 16,
                  textDecoration: 'none',
                  boxShadow: '0 4px 0 #A21247, 0 0 24px rgba(236,72,153,0.35)',
                  animation: 'tcreveal 0.5s ease 0.7s both',
                }}
              >
                {lang === 'en' ? '📊 View full results' : '📊 Zur Ergebnisseite'}
              </a>
            )}
          </div>
        )}
      </div>
    </CozyCard>
  );
}

// ─── Waiting screen ────────────────────────────────────────────────────────────
// 2026-05-06 (Wolf 'das quiz laeuft schon — option mit wieder einsteigen'):
// Mid-Game-Reconnect-Page. Wird angezeigt wenn /team waehrend laufendem Quiz
// geladen wird (phase != LOBBY) und der Spieler noch nicht joined ist.
//   - Team noch im Room → Avatar + Name + Big-Button "Wieder einsteigen"
//   - Team NICHT im Room → Hinweis "Du bist nicht angemeldet, warte auf
//     naechstes Quiz / Pause"
// Verhindert dass Spieler nach Browser-Wechsel den vollen SetupFlow mit
// Avatar-Editor sehen — der waere sinnlos, weil das Quiz schon laeuft.
function MidGameRejoinView({ roomCode, connected, lang, existingTeam, onResume, onFlagClick, flagFlip }: {
  roomCode: string;
  connected: boolean;
  lang: 'de' | 'en';
  existingTeam: import('../../../shared/quarterQuizTypes').QQTeam | null;
  onResume: () => void;
  onFlagClick: () => void;
  flagFlip: boolean;
}) {
  return (
    <div style={darkPage}>
      <style>{TEAM_CSS}</style>
      <div style={grainOverlay} />
      <MobileFireflies color="#F9A8D444" />
      <div style={{ width: '100%', maxWidth: 440, margin: '0 auto', padding: '32px 20px', position: 'relative', zIndex: 5 }}>
        {/* Sprache-Flag oben rechts */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button
            onClick={onFlagClick}
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 28, padding: 6, borderRadius: 999,
              transition: 'transform 0.2s ease',
              transform: flagFlip ? 'rotateY(90deg)' : 'rotateY(0)',
            }}
            aria-label="language"
            title={lang === 'de' ? 'Sprache wechseln' : 'Switch language'}
          >
            {lang === 'de' ? '🇩🇪' : '🇬🇧'}
          </button>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 52, marginBottom: 8, animation: 'tcfloat 3s ease-in-out infinite', display: 'inline-block' }}>🎮</div>
          <div style={{
            fontSize: 28, fontWeight: 900, color: '#F1F5F9',
            marginBottom: 4,
          }}>
            {lang === 'de' ? 'Quiz laeuft schon!' : 'Quiz already running!'}
          </div>
          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 16, color: '#94a3b8' }}>
            {lang === 'de' ? 'Raum' : 'Room'}: {roomCode}
          </div>
        </div>

        {/* Verbindungs-Status (kompakt) */}
        <div style={{
          textAlign: 'center', marginBottom: 18,
          fontSize: 12, fontWeight: 700,
          color: connected ? '#22C55E' : '#EF4444',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? '#22C55E' : '#EF4444',
            boxShadow: connected ? '0 0 6px #22C55E' : '0 0 6px #EF4444',
            animation: 'tcpulse 1.5s infinite',
          }} />
          {connected
            ? (lang === 'de' ? 'Verbunden' : 'Connected')
            : (lang === 'de' ? 'Verbinde…' : 'Connecting…')}
        </div>

        {existingTeam ? (
          // ── Team noch im Room: Reconnect-CTA ────────────────────────────
          <div style={{
            background: COZY_CARD_BG, borderRadius: 24, padding: '24px 20px',
            border: `2px solid ${existingTeam.color}55`,
            boxShadow: `0 0 32px ${existingTeam.color}33, 0 8px 24px rgba(0,0,0,0.4)`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          }}>
            <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {lang === 'de' ? 'Du warst dabei als' : 'You were playing as'}
            </div>
            <QQTeamAvatar
              avatarId={existingTeam.avatarId}
              teamEmoji={existingTeam.emoji}
              size={120}
              style={{ boxShadow: `0 0 32px ${existingTeam.color}66` }}
            />
            <div style={{
              fontSize: 22, fontWeight: 900, color: existingTeam.color,
              textAlign: 'center', maxWidth: '100%',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {existingTeam.name}
            </div>
            <button
              onClick={onResume}
              disabled={!connected}
              style={{
                width: '100%', padding: '16px 18px', borderRadius: 14,
                border: 'none',
                background: connected
                  ? `linear-gradient(135deg, ${existingTeam.color}, ${existingTeam.color}dd)`
                  : 'rgba(100,116,139,0.4)',
                color: '#fff', fontSize: 17, fontWeight: 900,
                letterSpacing: '0.05em',
                cursor: connected ? 'pointer' : 'not-allowed',
                boxShadow: connected ? `0 4px 14px ${existingTeam.color}66` : 'none',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              {lang === 'de' ? '→ Wieder einsteigen' : '→ Rejoin'}
            </button>
          </div>
        ) : (
          // ── Team NICHT im Room: nicht teilnahmeberechtigt ───────────────
          <div style={{
            background: COZY_CARD_BG, borderRadius: 24, padding: '28px 20px',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            <div style={{ fontSize: 36 }}>⏳</div>
            <div style={{
              fontSize: 18, fontWeight: 800, color: '#F1F5F9', textAlign: 'center',
            }}>
              {lang === 'de'
                ? 'Du bist nicht angemeldet'
                : 'You are not registered'}
            </div>
            <div style={{
              fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5,
            }}>
              {lang === 'de'
                ? 'Das Quiz hat schon angefangen. Warte auf eine Pause oder die naechste Lobby — dann kannst du als neues Team einsteigen.'
                : 'The quiz has already started. Wait for a break or the next lobby — then you can join as a new team.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WaitingScreen({ roomCode, connected, lang = 'de' }: { roomCode: string; connected: boolean; lang?: 'de' | 'en' }) {
  // 2026-05-06 (Wolf 'kein autoconnect, leerer Screen'): nach 8s ohne State
  // bieten wir einen manuellen Reload-Button + Hinweis. Backend (Render free)
  // wacht aus dem Schlaf manchmal in 30s+ auf — damit der Spieler sieht
  // 'es passiert was', nicht nur Skelett.
  const [showStuckHint, setShowStuckHint] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShowStuckHint(true), 8000);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div style={darkPage}>
      <style>{TEAM_CSS}{`
        @keyframes tcShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
      <div style={grainOverlay} />
      <MobileFireflies color="#F9A8D444" />
      <div style={{ width: '100%', maxWidth: 440, margin: '0 auto', padding: '32px 20px', position: 'relative', zIndex: 5 }}>
        {/* Header skeleton */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 42, marginBottom: 8, animation: 'tcfloat 3s ease-in-out infinite', display: 'inline-block' }}>🎮</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#F1F5F9' }}>CozyQuiz</div>
          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 15, color: '#64748b', margin: '8px 0' }}>
            {t.waiting.room[lang]}: {roomCode}
          </div>
        </div>
        {/* Skeleton card */}
        <div style={{
          background: COZY_CARD_BG, borderRadius: 24, padding: '24px 18px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: i === 1 ? 18 : 14, borderRadius: 8,
              marginBottom: i < 3 ? 12 : 0,
              width: i === 1 ? '70%' : i === 2 ? '100%' : '55%',
              background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
              backgroundSize: '200% 100%',
              animation: `tcShimmer 1.8s ease-in-out ${i * 0.15}s infinite`,
            }} />
          ))}
        </div>
        {/* Connection status */}
        <div style={{
          textAlign: 'center', marginTop: 20,
          fontSize: 13, fontWeight: 700,
          color: connected ? '#22C55E' : '#EF4444',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? '#22C55E' : '#EF4444',
            boxShadow: connected ? '0 0 6px #22C55E' : '0 0 6px #EF4444',
            animation: 'tcpulse 1.5s infinite',
          }} />
          {connected ? t.waiting.loading[lang] : t.waiting.connecting[lang]}
        </div>
        {/* Stuck-Hint nach 8s — manueller Reload + Mitspieler-Hinweis */}
        {showStuckHint && (
          <div style={{
            marginTop: 20, padding: '14px 16px', borderRadius: 14,
            background: 'rgba(236,72,153,0.08)',
            border: '1.5px dashed rgba(236,72,153,0.4)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, color: '#FBCFE8', fontWeight: 700, marginBottom: 8 }}>
              {lang === 'de'
                ? 'Dauert lange? Server schlaeft eventuell — bitte warten oder neu laden.'
                : 'Taking long? Server may be waking up — wait or reload.'}
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 18px', borderRadius: 10,
                border: '1px solid rgba(236,72,153,0.5)',
                background: 'rgba(236,72,153,0.15)',
                color: '#FBCFE8', fontSize: 13, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {lang === 'de' ? '↻ Neu laden' : '↻ Reload'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

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
function TeamBottomSheetMenu({
  lang, setLang, onClose, onLeaveRequest,
  jokersAvailable, jokersTotal, eurovisionMode,
  state, myTeamId,
}: {
  lang: 'de' | 'en';
  setLang: (l: 'de' | 'en') => void;
  onClose: () => void;
  onLeaveRequest: () => void;
  jokersAvailable: number;
  jokersTotal: number;
  eurovisionMode: boolean;
  state: QQStateUpdate;
  myTeamId: string;
}) {
  const [helpOpen, setHelpOpen] = React.useState(false);
  const myTeam = state.teams.find(t => t.id === myTeamId);
  const myColor = myTeam?.color ?? '#EC4899';

  // 2026-05-11 (Wolf-Wunsch 'swipe-down zum Schließen wie iOS Bottom Sheet'):
  // Drag-Handle bekommt touch-gesture. Sheet bewegt sich mit dem Finger nach
  // unten, schließt bei threshold (>120px ODER velocity >0.5 px/ms) — sonst
  // snap-back via CSS-transition.
  // Touch-Handler werden auch auf den Header-Bereich (über STATS) gelegt, damit
  // Wolf intuitiv überall im oberen Drittel runter-swipen kann. Body bleibt
  // scrollbar via overflow:auto, der Drag greift nur am oberen Hotspot.
  const [dragY, setDragY] = React.useState(0);
  const dragStateRef = React.useRef<{ startY: number; startT: number; dy: number } | null>(null);
  const handleDragStart = (clientY: number) => {
    dragStateRef.current = { startY: clientY, startT: Date.now(), dy: 0 };
  };
  const handleDragMove = (clientY: number) => {
    if (!dragStateRef.current) return;
    const delta = clientY - dragStateRef.current.startY;
    const dy = Math.max(0, delta);  // nur nach unten ziehen
    dragStateRef.current.dy = dy;
    setDragY(dy);
  };
  const handleDragEnd = () => {
    if (!dragStateRef.current) return;
    const { startT, dy } = dragStateRef.current;
    const duration = Math.max(1, Date.now() - startT);
    const velocity = dy / duration;
    const shouldClose = dy > 120 || velocity > 0.5;
    dragStateRef.current = null;
    if (shouldClose) {
      // Visuell die letzten Pixel runterrutschen lassen während onClose feuert
      setDragY(window.innerHeight);
      window.setTimeout(() => { setDragY(0); onClose(); }, 180);
    } else {
      setDragY(0);
    }
  };
  const dragHandleProps = {
    onTouchStart: (e: React.TouchEvent) => handleDragStart(e.touches[0].clientY),
    onTouchMove:  (e: React.TouchEvent) => handleDragMove(e.touches[0].clientY),
    onTouchEnd:   handleDragEnd,
    onTouchCancel: handleDragEnd,
    // Pointer-Events für Desktop-Test (Drag mit Maus)
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === 'touch') return;  // touch wird oben behandelt
      handleDragStart(e.clientY);
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (e.pointerType === 'touch' || !dragStateRef.current) return;
      handleDragMove(e.clientY);
    },
    onPointerUp:    (e: React.PointerEvent) => { if (e.pointerType !== 'touch') handleDragEnd(); },
    onPointerCancel:(e: React.PointerEvent) => { if (e.pointerType !== 'touch') handleDragEnd(); },
  };
  // Compute live stats
  const totalPhases = state.totalPhases ?? 4;
  const currentPhase = (state.gamePhaseIndex ?? 0) + 1;
  const teamScores = state.teams.map(t => {
    let count = 0;
    for (let r = 0; r < state.gridSize; r++) {
      for (let c = 0; c < state.gridSize; c++) {
        if (state.grid[r]?.[c]?.ownerId === t.id) count++;
      }
    }
    return { id: t.id, name: t.name, count };
  }).sort((a, b) => b.count - a.count);
  const myPosition = teamScores.findIndex(t => t.id === myTeamId) + 1;
  const myCellsCount = teamScores.find(t => t.id === myTeamId)?.count ?? 0;
  const totalTeams = state.teams.length;
  const itemBase: React.CSSProperties = {
    width: '100%',
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 16px',
    borderRadius: 16,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#F1F5F9',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 15, fontWeight: 700,
    textAlign: 'left',
    transition: 'background 0.15s, transform 0.12s',
  };
  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 998,
          animation: 'tcMenuBackdrop 0.22s ease both',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={lang === 'de' ? 'Menü' : 'Menu'}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0,
          paddingBottom: 'max(20px, calc(env(safe-area-inset-bottom) + 8px))',
          paddingLeft: 18, paddingRight: 18, paddingTop: 0,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          background: 'rgba(20, 16, 31, 0.85)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          borderTop: '1px solid rgba(236,72,153,0.32)',
          boxShadow: '0 -16px 48px rgba(0,0,0,0.55)',
          zIndex: 999,
          animation: dragY === 0 ? 'tcMenuSlideUp 0.32s cubic-bezier(0.32, 0.72, 0, 1) both' : 'none',
          maxHeight: '85vh',
          overflowY: 'auto',
          // 2026-05-11 (Wolf): Sheet bewegt sich beim Drag mit Finger; snap-back
          // wenn losgelassen ohne threshold zu erreichen.
          transform: `translateY(${dragY}px)`,
          transition: dragStateRef.current ? 'none' : 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)',
          touchAction: 'pan-y',
        }}
      >
        {/* Drag-Handle + Header-Hotspot — swipe-down schließt das Menü.
            2026-05-11 (Wolf): X-Button entfernt, Handle ist jetzt die einzige
            Schließ-Geste (Tap ODER Swipe-down). Plus expliziter Header-Bereich
            darunter ist auch drag-fähig — so kann Wolf intuitiv im ganzen
            oberen Drittel runterswipen. */}
        <div
          {...dragHandleProps}
          onClick={(e) => {
            // Tap-on-Handle schließt (wenn nicht gerade dragging)
            if (!dragStateRef.current && dragY === 0) onClose();
            e.stopPropagation();
          }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            paddingTop: 12, paddingBottom: 4,
            cursor: 'grab', touchAction: 'none',
            userSelect: 'none', WebkitUserSelect: 'none',
          }}
        >
          <span aria-label={lang === 'de' ? 'Menü schließen (ziehen oder tippen)' : 'Close menu (drag or tap)'}
            style={{
              display: 'inline-block',
              width: 44, height: 5,
              background: dragY > 0 ? 'rgba(236,72,153,0.85)' : 'rgba(255,255,255,0.32)',
              borderRadius: 999,
              transition: 'background 0.15s',
            }} />
        </div>

        {/* Header-Row: Title links — kein X-Button mehr, Swipe-Handle reicht. */}
        <div
          {...dragHandleProps}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12, padding: '6px 4px 4px',
            touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
            cursor: 'grab',
          }}
        >
          <div style={{
            fontSize: 12, fontWeight: 900, color: '#94A3B8',
            textTransform: 'uppercase', letterSpacing: '0.12em',
          }}>
            {lang === 'de' ? 'Menü' : 'Menu'}
          </div>
          <div style={{
            fontSize: 10, fontWeight: 700, color: '#64748b',
            letterSpacing: '0.08em',
          }}>
            {lang === 'de' ? '↓ runterziehen zum schließen' : '↓ swipe down to close'}
          </div>
        </div>

        {/* STATS-Row — Phase, Position, Zellen kompakt */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
          marginBottom: 12,
        }}>
          {[
            {
              label: lang === 'de' ? 'Phase' : 'Phase',
              value: `${currentPhase}/${totalPhases}`,
              accent: '#EC4899',
            },
            {
              label: lang === 'de' ? 'Position' : 'Position',
              value: totalTeams > 0 ? `#${myPosition}` : '–',
              accent: myColor,
            },
            {
              label: lang === 'de' ? 'Zellen' : 'Cells',
              value: String(myCellsCount),
              accent: '#22C55E',
            },
          ].map((stat) => (
            <div key={stat.label} style={{
              padding: '10px 8px', borderRadius: 14,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 10, fontWeight: 900, color: '#94A3B8',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                marginBottom: 4,
              }}>{stat.label}</div>
              <div style={{
                fontSize: 19, fontWeight: 900, color: stat.accent,
                letterSpacing: '-0.02em', lineHeight: 1,
              }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* MEIN BRETT — Mini-Grid mit eigenen Zellen highlighted */}
        {state.gridSize > 0 && (
          <div style={{
            padding: '12px 12px 14px',
            borderRadius: 14,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: 12,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 900, color: '#94A3B8',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              marginBottom: 8, display: 'flex', justifyContent: 'space-between',
            }}>
              <span>{lang === 'de' ? 'Mein Brett' : 'My board'}</span>
              <span style={{ color: myColor, fontWeight: 900 }}>{myCellsCount}× <span style={{ opacity: 0.7 }}>{lang === 'de' ? 'mein' : 'mine'}</span></span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${state.gridSize}, 1fr)`,
              gap: 3,
              maxWidth: 220, margin: '0 auto',
            }}>
              {Array.from({ length: state.gridSize }).flatMap((_, r) =>
                Array.from({ length: state.gridSize }).map((__, c) => {
                  const cell = state.grid[r]?.[c];
                  const isMine = cell?.ownerId === myTeamId;
                  const ownerTeam = cell?.ownerId ? state.teams.find(t => t.id === cell.ownerId) : null;
                  const ownerColor = ownerTeam?.color ?? null;
                  const ownerEmoji = ownerTeam?.emoji ?? null;
                  const isStacked = !!cell?.stuck;
                  const isShielded = !!cell?.shielded;
                  return (
                    <div
                      key={`${r}-${c}`}
                      style={{
                        // Solid backgrounds (statt glassy) — Lesbarkeit > Style
                        // bei kleinen Grid-Cells. Matcht /beamer-Grid-Logic.
                        aspectRatio: '1 / 1',
                        borderRadius: 4,
                        background: isMine
                          ? myColor
                          : ownerColor
                            ? ownerColor
                            : '#1a1424',
                        border: isMine
                          ? `1.5px solid ${myColor}`
                          : ownerColor
                            ? `1px solid ${ownerColor}`
                            : '1px solid rgba(255,255,255,0.10)',
                        boxShadow: isMine ? `0 0 6px ${myColor}88` : 'none',
                        position: 'relative',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Owner-Emoji als Identifier (Farbschwäche-tauglich) */}
                      {ownerEmoji && (
                        <span style={{
                          fontSize: 12, lineHeight: 1,
                          opacity: isMine ? 0.95 : 0.75,
                          filter: isMine ? 'drop-shadow(0 0 2px rgba(0,0,0,0.5))' : 'none',
                        }}>{ownerEmoji}</span>
                      )}
                      {/* Stacked/Shielded-Marker als kleines Overlay top-right */}
                      {isMine && isStacked && (
                        <span style={{
                          position: 'absolute', top: 0, right: 1,
                          fontSize: 8, color: '#fff', lineHeight: 1,
                          textShadow: '0 0 3px rgba(0,0,0,0.8)',
                        }}>★</span>
                      )}
                      {isMine && isShielded && !isStacked && (
                        <span style={{
                          position: 'absolute', top: 0, right: 1,
                          fontSize: 7, color: '#fff', lineHeight: 1,
                          textShadow: '0 0 3px rgba(0,0,0,0.8)',
                        }}>🛡</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Sprache */}
        <button
          onClick={() => {
            setLang(lang === 'de' ? 'en' : 'de');
            if (navigator.vibrate) navigator.vibrate(8);
          }}
          style={{ ...itemBase, marginBottom: 10 }}
          onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
          onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <span style={{ fontSize: 26, lineHeight: 1 }}>{lang === 'de' ? '🇩🇪' : '🇬🇧'}</span>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>
              {lang === 'de' ? 'Sprache · Deutsch' : 'Language · English'}
            </span>
            <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
              {lang === 'de' ? 'Tippen zum Wechseln auf Englisch' : 'Tap to switch to German'}
            </span>
          </span>
          <span style={{
            fontSize: 11, fontWeight: 900, color: '#EC4899',
            padding: '4px 10px', borderRadius: 999,
            background: 'rgba(236,72,153,0.12)',
            border: '1px solid rgba(236,72,153,0.35)',
            letterSpacing: 0.4,
          }}>
            {lang === 'de' ? 'EN' : 'DE'}
          </span>
        </button>

        {/* Joker-Counter — read-only Info, nicht klickbar */}
        <div style={{
          ...itemBase,
          cursor: 'default',
          marginBottom: 10,
          background: 'rgba(255,255,255,0.02)',
        }}>
          <span style={{ display: 'inline-flex', gap: 4 }}>
            {Array.from({ length: jokersTotal }).map((_, i) => {
              const used = i >= jokersAvailable;
              return (
                <JokerIcon
                  key={i}
                  i={i}
                  size={26}
                  eurovisionMode={eurovisionMode}
                  alt=""
                  style={{
                    width: 26, height: 26,
                    opacity: used ? 0.32 : 1,
                    filter: used ? 'grayscale(1) brightness(0.7)' : undefined,
                  }}
                />
              );
            })}
          </span>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>
              {lang === 'de' ? 'Joker' : 'Jokers'}
            </span>
            <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
              {lang === 'de'
                ? `${jokersAvailable} von ${jokersTotal} verfügbar`
                : `${jokersAvailable} of ${jokersTotal} available`}
            </span>
          </span>
        </div>

        {/* Hilfe / Kurz-Regeln */}
        <button
          onClick={() => { setHelpOpen(true); if (navigator.vibrate) navigator.vibrate(8); }}
          style={{ ...itemBase, marginBottom: 10 }}
          onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
          onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>❓</span>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>
              {lang === 'de' ? 'Hilfe · Kurz-Regeln' : 'Help · Quick rules'}
            </span>
            <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
              {lang === 'de' ? 'Wie spielt man CozyQuiz?' : 'How to play CozyQuiz'}
            </span>
          </span>
        </button>

        {/* Quiz verlassen */}
        <button
          onClick={() => { onLeaveRequest(); if (navigator.vibrate) navigator.vibrate(12); }}
          style={{
            ...itemBase,
            background: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.30)',
            color: '#FCA5A5',
            marginBottom: 14,
          }}
          onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
          onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>🚪</span>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>
              {lang === 'de' ? 'Quiz verlassen' : 'Leave quiz'}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(252,165,165,0.7)', fontWeight: 600 }}>
              {lang === 'de'
                ? 'Team-Identität wird zurückgesetzt'
                : 'Team identity will be reset'}
            </span>
          </span>
        </button>

        {/* Schliessen */}
        <button
          onClick={onClose}
          style={{
            ...itemBase,
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            fontSize: 14,
            fontWeight: 800,
            padding: '12px 16px',
          }}
        >
          {lang === 'de' ? 'Schließen' : 'Close'}
        </button>
      </div>

      {/* Hilfe-Overlay (innerhalb des Menüs gerendert, schliesst sich separat) */}
      {helpOpen && <HelpModal lang={lang} onClose={() => setHelpOpen(false)} />}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// HelpModal — kompakte Quick-Reference. 4-5 Bullet-Points, kein Slide-System.
// ─────────────────────────────────────────────────────────────────────────
// ── Styles ─────────────────────────────────────────────────────────────────────
const darkPage: React.CSSProperties = {
  minHeight: '100vh', background: '#0A0814', color: '#e2e8f0',
  fontFamily: "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif",
};
const grainOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
  opacity: 0.04, mixBlendMode: 'overlay',
};
const cozyInput: React.CSSProperties = {
  width: '100%', padding: '14px 16px', borderRadius: 16, marginBottom: 12,
  border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)',
  color: '#F1F5F9', fontFamily: 'inherit', fontSize: 17, fontWeight: 700,
  boxSizing: 'border-box',
  // 2026-05-04 (UI-Audit P0-2): outline:none entfernt — Browser-Default-Outline
  // bleibt beim Focus sichtbar (Tab-Navigation lesbar). focusring im /team-CSS
  // (qq-team-input) hat zusaetzlich einen amber-Outline mit offset 2px.
};

// AckErrorToast lebt jetzt in '../components/CozyQuizTeamOverlays'.
// safeEmit() oben broadcastet via qqTeamAckBus.broadcastAckError → AckErrorToast lauscht.
