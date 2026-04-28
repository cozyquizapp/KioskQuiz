import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, memo, Fragment } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQQSocket } from '../hooks/useQQSocket';
import {
  QQStateUpdate, QQ_CATEGORY_LABELS, QQ_CATEGORY_COLORS, QQ_BUNTE_TUETE_LABELS,
  qqGetAvatar, QQCategory,
  QQQuestionImage,
  QQOptionImage,
  QQSlideTemplates,
  QQLanguage,
  QQSoundSlot,
  QQ_MAX_JOKERS_PER_GAME,
} from '../../../shared/quarterQuizTypes';
import { CustomSlide } from '../components/QQCustomSlide';
import { QQ3DGrid } from '../components/QQ3DGrid';
import QQProgressTree from '../components/QQProgressTree';
import { QQTeamAvatar } from '../components/QQTeamAvatar';
import { QQIcon, QQEmojiIcon, qqCatSlug, qqSubSlug } from '../components/QQIcon';
import {
  resumeAudio, setVolume, setSoundConfig, playFanfare, playReveal, playCorrect,
  playWrong, playTick, playUrgentTick, playTimesUp, playScoreUp,
  startTimerLoop, stopTimerLoop, playFieldPlaced, playSteal, playGameOver,
  playTeamReveal, playQuestionStart, playRoundStart,
  setMusicDucked, getMusicDuckFactor, fadeOutAudio,
  startLobbyLoop, stopLobbyLoop,
  playShieldActivate, playStapelStamp, playSanduhrFlip, playTeamJoin, playSwapActivate,
  playCorrectFor, playWrongFor, playRevealFor, playQuestionStartFor,
  playWolfHowl, playAvatarJingle, startCampfireLoop, stopCampfireLoop,
} from '../utils/sounds';

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? '/api';

// ── Cozy-Card-Default ─────────────────────────────────────────────────────────
// Standard-Card-Hintergrund für ALLE Beamer-Cards (Frage, Antwort-Reveal,
// Stat-Panel, Game-Over, Comeback, Pause). Subtiler Top-zu-Bottom-Gradient
// gibt der Card visuelle Tiefe (oben „beleuchtet", unten „grounded") statt
// flachem `#1B1510`. Themes mit eigenem `cardBg` überschreiben das (s.theme
// gewinnt überall via `s.theme?.cardBg ?? COZY_CARD_BG`).
export const COZY_CARD_BG = 'linear-gradient(180deg, #1f1610, #150e08)';

// ── CSS keyframes ─────────────────────────────────────────────────────────────
import { QQ_BEAMER_CSS, QQ_CAT_BADGE_BG, QQ_CAT_ACCENT } from '../qqShared';
import { loadUsedFonts } from '../utils/fonts';

export const BEAMER_CSS = QQ_BEAMER_CSS;
export const CAT_BADGE_BG = QQ_CAT_BADGE_BG;
export const CAT_ACCENT = QQ_CAT_ACCENT;

// Beamer-Namen bei 8 Teams / langen Team-Namen nicht reißen lassen.
function truncName(name: string, max = 14): string {
  if (!name) return '';
  return name.length > max ? name.slice(0, max - 1) + '…' : name;
}

// ── Category themes ───────────────────────────────────────────────────────────
const CAT_BG: Record<string, string> = {
  SCHAETZCHEN:   ['radial-gradient(ellipse at 18% 68%, rgba(133,77,14,0.42) 0%, transparent 55%)','radial-gradient(ellipse at 80% 20%, rgba(234,179,8,0.13) 0%, transparent 52%)','#0D0A06'].join(','),
  MUCHO:         ['radial-gradient(ellipse at 70% 28%, rgba(29,78,216,0.28) 0%, transparent 55%)','radial-gradient(ellipse at 20% 78%, rgba(59,130,246,0.10) 0%, transparent 50%)','#0D0A06'].join(','),
  BUNTE_TUETE:   ['radial-gradient(ellipse at 50% 55%, rgba(185,28,28,0.25) 0%, transparent 58%)','radial-gradient(ellipse at 14% 18%, rgba(220,38,38,0.11) 0%, transparent 45%)','#0D0A06'].join(','),
  ZEHN_VON_ZEHN: ['repeating-linear-gradient(transparent, transparent 39px, rgba(52,211,153,0.03) 39px, rgba(52,211,153,0.03) 40px)','radial-gradient(ellipse at 28% 42%, rgba(6,78,59,0.32) 0%, transparent 55%)','#0D0A06'].join(','),
  CHEESE:        ['radial-gradient(ellipse at 30% 40%, rgba(91,33,182,0.30) 0%, transparent 55%)','radial-gradient(ellipse at 80% 72%, rgba(139,92,246,0.12) 0%, transparent 50%)','#0D0A06'].join(','),
};
// (CAT_BADGE_BG and CAT_ACCENT removed — now imported from qqShared)
const CAT_GLOW: Record<string, string> = {
  SCHAETZCHEN:   'rgba(234,179,8,0.45)',
  MUCHO:         'rgba(37,99,235,0.45)',
  BUNTE_TUETE:   'rgba(220,38,38,0.45)',
  ZEHN_VON_ZEHN: 'rgba(5,150,105,0.42)',
  CHEESE:        'rgba(124,58,237,0.45)',
};
// (CAT_ACCENT removed — now imported from qqShared)

// SpeedBoltMarker: goldener Blitz-Badge fuer „schnellster Voter". Inline-SVG statt
// Unicode-⚡ — sonst rendert das Browser-Emoji-Fallback je nach OS als gelbes
// Polygon mit eigenem Hintergrund (Apple Color Emoji etc).
function SpeedBoltMarker({ top, right }: { top: number; right: number }) {
  return (
    <span style={{
      position: 'absolute', top, right,
      width: 'clamp(22px, 2.4vw, 32px)', height: 'clamp(22px, 2.4vw, 32px)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '50%',
      background: 'radial-gradient(circle at 30% 28%, #FEF3C7 0%, #FBBF24 55%, #B45309 100%)',
      boxShadow: '0 0 14px rgba(251,191,36,0.55), 0 4px 8px rgba(0,0,0,0.4)',
      border: '2px solid #FDE68A',
      animation: 'revealCorrectPop 0.45s cubic-bezier(0.34,1.4,0.64,1) both',
      pointerEvents: 'none',
    }} aria-label="Schnellster">
      <svg viewBox="0 0 24 24" width="62%" height="62%" aria-hidden style={{ display: 'block' }}>
        <path d="M13.5 2L4 14h6l-1 8 9-12h-6l1-8z" fill="#7C2D12" stroke="#FFFBEB" strokeWidth="0.8" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}

interface CutoutSpec { emoji: string; top?: string; bottom?: string; left?: string; right?: string; size: number; rot: number; alt?: boolean }
// Positions avoid the top-right timer (at top:16px right:48px) and top-left category pill.
// Decorations stay on the sides (mid-height) and near the bottom, where nothing else sits.
const CAT_CUTOUTS: Record<string, CutoutSpec[]> = {
  SCHAETZCHEN:   [{ emoji:'🎯', top:'10%', left:'1.5%',  size:64, rot:-12 },{ emoji:'✨', bottom:'6%', left:'2%',  size:48, rot:8  },{ emoji:'🔮', bottom:'6%', right:'1.5%',  size:52, rot:16, alt:true }],
  MUCHO:         [{ emoji:'🅰️', top:'12%', left:'1.5%',  size:60, rot:-8  },{ emoji:'💡', bottom:'6%', left:'2%',  size:50, rot:12 },{ emoji:'🤔', bottom:'6%', right:'1.5%',  size:54, rot:-14, alt:true }],
  BUNTE_TUETE:   [{ emoji:'🎁', top:'10%', left:'1.5%',  size:66, rot:-10 },{ emoji:'🎲', bottom:'6%', left:'2%',  size:54, rot:14 },{ emoji:'⭐', bottom:'6%', right:'1.5%',  size:54, rot:20 }],
  ZEHN_VON_ZEHN: [{ emoji:'🎰', top:'10%', left:'1.5%',  size:58, rot:-6  },{ emoji:'⚡', bottom:'6%', left:'2%',  size:48, rot:10 },{ emoji:'💪', bottom:'6%', right:'1.5%',  size:54, rot:-12, alt:true }],
  CHEESE:        [{ emoji:'📸', top:'10%', left:'1.5%',  size:64, rot:-11 },{ emoji:'🔍', bottom:'6%', left:'2%',  size:50, rot:8  },{ emoji:'👁️', bottom:'6%', right:'1.5%',  size:54, rot:-9, alt:true }],
};

// ── Static firefly positions ──────────────────────────────────────────────────
const FF = [
  { x:14, y:72, dx: 62,  dy:-84,  dur:5.4, del:0   },
  { x:82, y:28, dx:-44,  dy:-68,  dur:7.1, del:0.8 },
  { x:47, y:83, dx: 80,  dy:-96,  dur:6.2, del:1.5 },
  { x:22, y:44, dx:-72,  dy:-54,  dur:8.0, del:2.1 },
  { x:68, y:62, dx: 52,  dy:-72,  dur:5.8, del:0.4 },
  { x:38, y:18, dx:-58,  dy:-44,  dur:6.7, del:1.9 },
  { x:91, y:74, dx:-82,  dy:-60,  dur:7.5, del:0.2 },
  { x:56, y:42, dx: 42,  dy:-88,  dur:5.2, del:2.6 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const QQ_ROOM = 'default';

// ── Time-Travel-Recorder (Module-Level) ──
// Backend trackt Frage-Gewinner nicht historisch, also recorden wir live
// im Frontend. Module-Level damit Recorder-State und Replay-Component
// dieselben Maps lesen.
type RecordedQuestion = { winnerId: string | null; category: string; idx: number };
const recordedQuestions = new Map<string, RecordedQuestion>();
const recordedSteals = new Set<string>();

/** In 'both' mode, alternate between de and en with a fade transition.
 *  Intervall war frueher 8s — fuehlte sich hektisch an, weil DE und EN oft
 *  unterschiedlich lange Texte sind und der Container bei jedem Wechsel
 *  resized. 12s gibt mehr Lese-Zeit pro Sprache und reduziert die Frequenz
 *  der Layout-Shifts entsprechend. */
function useLangFlip(serverLang: string): 'de' | 'en' {
  const [flip, setFlip] = useState(false);
  useEffect(() => {
    if (serverLang !== 'both') {
      setFlip(false);
      return;
    }
    setFlip(false); // always start with DE on new slide
    const iv = setInterval(() => setFlip(f => !f), 12000);
    return () => clearInterval(iv);
  }, [serverLang]);
  if (serverLang === 'de') return 'de';
  if (serverLang === 'en') return 'en';
  return flip ? 'en' : 'de';
}
// ── Beamer translations ───────────────────────────────────────────────────────
const bt = {
  action: {
    steal: { de: '⚡ Klauen', en: '⚡ Steal' },
    comeback: { de: '⚡ Comeback', en: '⚡ Comeback' },
    place: { de: '📍 Setzen', en: '📍 Place' },
    choose1: { de: '1 Feld wählen', en: 'Choose 1 field' },
    choose2: { de: '2 Felder wählen ({n} übrig)', en: 'Choose 2 fields ({n} left)' },
    stealDesc: { de: '1 fremdes Feld klauen', en: 'Steal 1 opponent field' },
    freeDesc: { de: 'Setzen oder Klauen', en: 'Place or steal' },
  },
  phase: {
    // Quiz-Runden heißen immer „Runde N". Das echte „Finale" ist seit
    // Connections-Einführung das 4×4-Mini-Game (eigene Phase, eigener Header).
    names: { de: ['', 'Runde 1', 'Runde 2', 'Runde 3', 'Runde 4'], en: ['', 'Round 1', 'Round 2', 'Round 3', 'Round 4'] },
    descs: { de: ['', 'Erobert das Spielfeld!', 'Klaut euren Gegnern Felder!', 'Stapeln freigeschaltet!', 'Letzte Quiz-Runde!'],
             en: ['', 'Conquer the grid!', 'Steal from your rivals!', 'Stack unlocked!', 'Last quiz round!'] },
    of: { de: 'Phase {a} von {b}', en: 'Phase {a} of {b}' },
    fields: { de: 'Felder', en: 'fields' },
  },
  question: {
    introLabel: { de: 'Frage {n} von 5', en: 'Question {n} of 5' },
    counter: { de: 'Phase {p}/{t} · Frage {q}/5', en: 'Phase {p}/{t} · Q {q}/5' },
    hits: { de: 'Treffer', en: 'hits' },
    correct: { de: 'richtig', en: 'correct' },
    imposterTitle: { de: '🕵️ Imposter — wählt eine Aussage', en: '🕵️ Imposter — choose a statement' },
    statementsLeft: { de: 'Aussage(n) übrig', en: 'statement(s) left' },
    out: { de: 'Raus', en: 'Out' },
    answers: { de: 'Antworten', en: 'Answers' },
  },
  comeback: {
    title: { de: '⚡ Comeback-Chance!', en: '⚡ Comeback chance!' },
    place2: { de: '2 Felder setzen', en: 'Place 2 fields' },
    place2desc: { de: 'Platziere 2 freie Felder deiner Wahl', en: 'Place 2 empty fields of your choice' },
    steal1: { de: '1 Feld klauen', en: 'Steal 1 field' },
    steal1desc: { de: 'Nimm ein fremdes Feld', en: 'Take an opponent\'s field' },
    swap2: { de: '2 Felder tauschen', en: 'Swap 2 fields' },
    swap2desc: { de: 'Tausche je ein Feld von zwei Gegnern', en: 'Swap 1 field each of two opponents' },
    chosenPlace2: { de: '📍 2 Felder werden gesetzt…', en: '📍 Placing 2 fields…' },
    chosenSteal1: { de: '⚡ 1 Feld wird geklaut…', en: '⚡ Stealing 1 field…' },
    chosenSwap2: { de: '🔄 Felder werden getauscht…', en: '🔄 Swapping fields…' },
  },
  grid: { label: { de: 'Quartier', en: 'Quarter' } },
  gameOver: {
    title: { de: 'Spielende! 🎉', en: 'Game over! 🎉' },
    connected: { de: 'verbunden', en: 'connected' },
    total: { de: 'gesamt', en: 'total' },
  },
  loading: {
    room: { de: 'Raum', en: 'Room' },
    waiting: { de: '● Warte auf Spielzustand…', en: '● Waiting for game state…' },
    connecting: { de: '○ Verbinde…', en: '○ Connecting…' },
  },
};

function actionVerb(a: string | null, lang: 'de' | 'en' = 'de') {
  if (a === 'STEAL_1') return bt.action.steal[lang];
  if (a === 'COMEBACK') return bt.action.comeback[lang];
  return bt.action.place[lang];
}
function actionDesc(a: string | null, stats: any, lang: 'de' | 'en' = 'de') {
  if (a === 'PLACE_1') return bt.action.choose1[lang];
  if (a === 'PLACE_2') return bt.action.choose2[lang].replace('{n}', String(stats?.placementsLeft ?? 2));
  if (a === 'STEAL_1') return bt.action.stealDesc[lang];
  if (a === 'FREE')    return bt.action.freeDesc[lang];
  return '';
}

function imgAnim(anim: string, layout?: string, delay?: number, duration?: number): string | undefined {
  const d = duration ?? undefined;
  const del = delay ?? 0;
  if (anim === 'float')    return `imgFloat ${d ?? 4}s ease-in-out ${del}s infinite`;
  if (anim === 'zoom-in')  return `imgZoomIn ${d ?? 0.8}s ease ${del}s both`;
  if (anim === 'reveal')   return `imgReveal ${d ?? 1}s ease ${del}s both`;
  if (anim === 'slide-in') return layout === 'window-left' ? `imgSlideL ${d ?? 0.7}s ease ${del}s both` : `imgSlideR ${d ?? 0.7}s ease ${del}s both`;
  return undefined;
}

function imgFilter(img: { brightness?: number; contrast?: number; blur?: number }): string | undefined {
  const parts: string[] = [];
  if (img.brightness !== undefined && img.brightness !== 100) parts.push(`brightness(${img.brightness}%)`);
  if (img.contrast !== undefined && img.contrast !== 100) parts.push(`contrast(${img.contrast}%)`);
  if (img.blur) parts.push(`blur(${img.blur}px)`);
  return parts.length ? parts.join(' ') : undefined;
}

/**
 * Formatiert die aufgelöste Antwort für den Beamer.
 * - lang='de': nur DE
 * - lang='en' + DE existiert separat: 'EN / DE' (damit Spieler die DE auf
 *   ihren Phones spielen die Lösung wiedererkennen, auch wenn der Beamer
 *   auf EN steht)
 * - lang='en' + nur EN: nur EN
 */
function formatRevealedAnswer(
  lang: 'de' | 'en',
  de: string | null | undefined,
  en: string | null | undefined,
): string {
  const deTrim = (de ?? '').trim();
  const enTrim = (en ?? '').trim();
  if (lang === 'de') return deTrim || enTrim;
  // EN-Modus
  if (enTrim && deTrim && enTrim.toLowerCase() !== deTrim.toLowerCase()) {
    return `${enTrim} / ${deTrim}`;
  }
  return enTrim || deTrim;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main page
// ═══════════════════════════════════════════════════════════════════════════════

export default function QQBeamerPage() {
  const roomCode = QQ_ROOM;
  const [joined, setJoined] = useState(false);
  const [slideTemplates, setSlideTemplates] = useState<QQSlideTemplates>({});
  const fetchedDraftId = useRef<string | null>(null);
  const { state, connected, emit, socketRef } = useQQSocket(roomCode);

  // Disable Cozy gradient mesh on QQ pages
  useEffect(() => {
    document.body.classList.add('qq-active');
    return () => { document.body.classList.remove('qq-active'); };
  }, []);

  // Beamer-Fullscreen: erkennt sowohl JS-API (document.fullscreenElement) als
  // auch natives F11 (window.innerHeight === screen.height), damit die Nudge
  // verschwindet wenn der User schon per F11 im Vollbild ist und kein erneutes
  // requestFullscreen noetig (das wuerde an verbrauchter User-Geste scheitern).
  const detectFS = (): boolean => {
    if (typeof document === 'undefined') return false;
    if (!!document.fullscreenElement) return true;
    if (typeof window !== 'undefined' && typeof screen !== 'undefined') {
      // ±2px Toleranz fuer Rundungsdifferenzen bei skaliertem Display
      return Math.abs(window.innerHeight - screen.height) < 3;
    }
    return false;
  };
  const [isFullscreen, setIsFullscreen] = useState<boolean>(detectFS);
  useEffect(() => {
    const onChange = () => setIsFullscreen(detectFS());
    document.addEventListener('fullscreenchange', onChange);
    window.addEventListener('resize', onChange);
    onChange();
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      window.removeEventListener('resize', onChange);
    };
  }, []);
  const requestFS = useCallback(async () => {
    // AudioContext bei diesem User-Klick entstummen — vermeidet
    // "AudioContext was not allowed to start" Console-Warnings, sobald
    // beim ersten Reveal Sounds spielen sollen.
    try { resumeAudio(); } catch { /* noop */ }
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) {
        await el.requestFullscreen();
      }
    } catch { /* user cancelled or not supported */ }
  }, []);
  // (Kein globaler once-Listener mehr — der konnte requestFullscreen aus
  //  Pointerdown-Events feuern, die der Browser nicht als "transient
  //  activation" akzeptiert, was die Console-Errors „API can only be
  //  initiated by a user gesture" produzierte. Der Vollbild-Button
  //  rechts oben ist der saubere Trigger.)

  // Remote-Flyover vom Moderator: simuliere F-Taste, damit interner Listener feuert
  useEffect(() => {
    const sock = socketRef.current;
    if (!sock) return;
    const onFlyover = () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));
    };
    const onToggleView = () => {
      window.dispatchEvent(new CustomEvent('qq:toggleView'));
    };
    sock.on('qq:flyover', onFlyover);
    sock.on('qq:toggleView', onToggleView);
    return () => {
      sock.off('qq:flyover', onFlyover);
      sock.off('qq:toggleView', onToggleView);
    };
  }, [connected]);

  // Live-Reactions von Phones — kommt als qq:reactionBurst-Event mit
  // {teamId, emoji, ts}. Sammelt aktive Reactions in einer State-Liste,
  // jede mit eigener Float-Animation; Auto-Cleanup nach 3.2s.
  const [reactionFloats, setReactionFloats] = useState<Array<{
    id: string; emoji: string; teamId: string; xPct: number; delaySec: number;
  }>>([]);
  useEffect(() => {
    const sock = socketRef.current;
    if (!sock) return;
    const onBurst = (payload: { teamId: string; emoji: string; ts: number }) => {
      const id = `${payload.ts}-${Math.random().toString(36).slice(2, 7)}`;
      // Random X-Position 5%-95% damit Reactions nicht alle in derselben Spalte fliegen
      const xPct = 5 + Math.random() * 90;
      setReactionFloats(prev => [...prev, { id, emoji: payload.emoji, teamId: payload.teamId, xPct, delaySec: 0 }]);
      window.setTimeout(() => {
        setReactionFloats(prev => prev.filter(r => r.id !== id));
      }, 3500);
    };
    sock.on('qq:reactionBurst', onBurst);
    return () => { sock.off('qq:reactionBurst', onBurst); };
  }, [connected]);

  useEffect(() => {
    if (!connected) { setJoined(false); return; }
    if (joined) return;
    emit('qq:joinBeamer', { roomCode }).then(ack => { if (ack.ok) setJoined(true); });
  }, [connected]);

  // Use slide templates from state (sent inline with startGame payload)
  useEffect(() => {
    if (state?.slideTemplates && Object.keys(state.slideTemplates).length > 0) {
      setSlideTemplates(state.slideTemplates);
      // Load any Google Fonts used in slide elements
      const fonts = Object.values(state.slideTemplates)
        .flatMap(t => (t?.elements ?? []).map(el => el.fontFamily));
      loadUsedFonts(fonts);
    }
  }, [state?.slideTemplates]);

  // Fallback: fetch slide templates from server if not in state
  useEffect(() => {
    const draftId = state?.draftId;
    if (!draftId || fetchedDraftId.current === draftId) return;
    // Skip fetch if we already have templates from state
    if (state?.slideTemplates && Object.keys(state.slideTemplates).length > 0) {
      fetchedDraftId.current = draftId;
      return;
    }
    fetchedDraftId.current = draftId;
    fetch(`${API_BASE}/qq/drafts/${encodeURIComponent(draftId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(draft => {
        if (draft?.slideTemplates) {
          setSlideTemplates(draft.slideTemplates);
          const fonts = Object.values(draft.slideTemplates as QQSlideTemplates)
            .flatMap((t: any) => (t?.elements ?? []).map((el: any) => el.fontFamily));
          loadUsedFonts(fonts);
        }
      })
      .catch(() => {/* ignore — fallback to hardcoded components */});
  }, [state?.draftId]);

  if (!state) return <LoadingScreen roomCode={roomCode} connected={connected} />;
  return (
    <>
      <BeamerView state={state} slideTemplates={slideTemplates} roomCode={roomCode} />
      {!isFullscreen && <FullscreenNudge onClick={requestFS} />}
      {/* Time-Travel-Replay deaktiviert (Wolfs Wunsch) — die separate Card
          überlagerte die GameOver-Komposition und wirkte fragmentiert.
          Code in ReplayOverlay bleibt drin falls später wieder gewünscht. */}
      {/* {state.phase === 'GAME_OVER' && <ReplayOverlay state={state} />} */}
      {/* Live-Reactions Overlay — Mini-Bursts schweben von unten nach oben.
          Pointer-events: none → blockt nichts darunter. zIndex: 9000 → über
          allem (auch Cell-Animationen) aber unter Fehlermeldungen. */}
      {reactionFloats.length > 0 && (
        <div aria-hidden style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9000,
          overflow: 'hidden',
        }}>
          {reactionFloats.map(r => (
            <span key={r.id} style={{
              position: 'absolute',
              left: `${r.xPct}%`,
              bottom: 0,
              fontSize: 'clamp(36px, 4.4vw, 64px)',
              animation: 'reactionFloat 3.2s cubic-bezier(0.22,0.7,0.35,1) both',
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
              transform: 'translateX(-50%)',
              willChange: 'transform, opacity',
            }}>
              {r.emoji}
            </span>
          ))}
          <style>{`
            @keyframes reactionFloat {
              0%   { transform: translate(-50%, 0)        scale(0.6); opacity: 0; }
              12%  { transform: translate(-50%, -8vh)     scale(1.15); opacity: 1; }
              80%  { transform: translate(-50%, -78vh)    scale(1); opacity: 1; }
              100% { transform: translate(-50%, -100vh)   scale(0.85); opacity: 0; }
            }
          `}</style>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ReplayOverlay — Time-Travel-Recap am Spielende.
// Erscheint 5.5s nach GAME_OVER-Entry, läuft 15 Sek durch alle geloggten
// Fragen (1 Sek pro Frage). Pro Slot: Frage-Index + Avatar des Winners +
// Kategorie-Akzent. Ein Slot pro Frage in einem 5×3-Grid (15 Fragen total).
// Steal-Highlights blinken rot beim Auftauchen (wasSteal-Flag aus Recorder).
// Auto-fade-out nach Replay; bleibt dann sichtbar als Mini-Strip am unteren
// Bildschirmrand.
// ─────────────────────────────────────────────────────────────────────────

function ReplayOverlay({ state }: { state: QQStateUpdate }) {
  const [visible, setVisible] = useState(false);
  const [revealedIdx, setRevealedIdx] = useState(-1);
  const [phase, setPhase] = useState<'hidden' | 'intro' | 'replay' | 'done'>('hidden');

  useEffect(() => {
    // 5.5s nach GAME_OVER-Mount sichtbar machen, dann in 15s durchspielen.
    const tIntro = window.setTimeout(() => { setVisible(true); setPhase('intro'); }, 5500);
    const tReplay = window.setTimeout(() => { setPhase('replay'); }, 5500 + 1200);
    return () => { window.clearTimeout(tIntro); window.clearTimeout(tReplay); };
  }, []);

  // Replay-Tick: ein Slot pro Sekunde
  useEffect(() => {
    if (phase !== 'replay') return;
    const total = Math.min(15, recordedQuestions.size);
    if (total === 0) { setPhase('done'); return; }
    let i = 0;
    setRevealedIdx(0);
    const id = window.setInterval(() => {
      i++;
      if (i >= total) {
        window.clearInterval(id);
        setRevealedIdx(total - 1);
        window.setTimeout(() => setPhase('done'), 1200);
      } else {
        setRevealedIdx(i);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  if (!visible) return null;

  // Sortiere Recorded-Questions nach idx
  const entries = Array.from(recordedQuestions.values()).sort((a, b) => a.idx - b.idx).slice(0, 15);
  if (entries.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 8500,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
      paddingBottom: 'clamp(40px, 6vh, 80px)',
      animation: phase === 'done' ? undefined : 'replayBackdrop 0.6s ease both',
    }}>
      <style>{`
        @keyframes replayBackdrop {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes replaySlotIn {
          0%   { transform: scale(0.5) translateY(20px); opacity: 0; filter: blur(6px); }
          50%  { transform: scale(1.18) translateY(-2px); opacity: 1; filter: blur(0); }
          100% { transform: scale(1) translateY(0); opacity: 1; filter: blur(0); }
        }
        @keyframes replayStealRing {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.9); }
          50%  { box-shadow: 0 0 0 6px rgba(239,68,68,0.4), 0 0 24px rgba(239,68,68,0.7); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
      `}</style>
      <div style={{
        background: 'rgba(13,10,6,0.92)',
        borderRadius: 24,
        padding: 'clamp(20px, 2.4vh, 32px) clamp(28px, 3vw, 48px)',
        border: '1.5px solid rgba(251,191,36,0.4)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 80px rgba(251,191,36,0.15)',
        backdropFilter: 'blur(14px)',
        maxWidth: 1100, width: '92%',
      }}>
        <div style={{
          fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 800,
          color: '#FBBF24', letterSpacing: '0.16em', textTransform: 'uppercase',
          textAlign: 'center', marginBottom: 14,
          textShadow: '0 0 18px rgba(251,191,36,0.55)',
        }}>
          ⏱ Spielverlauf · Recap
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 'clamp(8px, 1vw, 14px)',
        }}>
          {entries.map((e, i) => {
            const team = e.winnerId ? state.teams.find(t => t.id === e.winnerId) : null;
            const teamColor = team?.color ?? '#475569';
            const catColor = QQ_CAT_ACCENT[e.category] ?? '#94a3b8';
            const wasSteal = team
              ? Array.from(recordedSteals).some(key => key.endsWith(`-${team.id}`))
              : false;
            void wasSteal; // grobe Heuristik — nicht jeder Steal ist 1:1 dieser Frage zuordenbar
            const shown = i <= revealedIdx;
            return (
              <div key={i} style={{
                position: 'relative',
                aspectRatio: '1 / 1',
                borderRadius: 14,
                background: shown && team
                  ? `linear-gradient(135deg, ${teamColor}88, ${teamColor}33)`
                  : 'rgba(255,255,255,0.04)',
                border: shown
                  ? `2px solid ${team ? teamColor : '#475569'}`
                  : '1px solid rgba(255,255,255,0.08)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 4,
                opacity: shown ? 1 : 0.25,
                animation: shown ? 'replaySlotIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both' : undefined,
                overflow: 'hidden',
              }}>
                {/* Frage-Index oben links */}
                <span style={{
                  position: 'absolute', top: 4, left: 6,
                  fontSize: 'clamp(9px, 0.9vw, 12px)', fontWeight: 800,
                  color: catColor, letterSpacing: '0.08em',
                  opacity: shown ? 1 : 0,
                }}>
                  {e.idx + 1}
                </span>
                {/* Avatar des Winners (oder leer) */}
                {shown && team ? (
                  <QQTeamAvatar avatarId={team.avatarId} size={'min(8vh, 6vw)'} />
                ) : shown ? (
                  <span style={{ fontSize: 'min(5vh, 3vw)', opacity: 0.4 }}>?</span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FullscreenNudge({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Beamer auf Vollbild schalten (F11)"
      style={{
        position: 'fixed', top: 14, right: 14, zIndex: 99999,
        padding: '8px 14px', borderRadius: 10,
        border: '1px solid rgba(251,191,36,0.5)',
        background: 'rgba(15,23,42,0.85)', color: '#FBBF24',
        fontFamily: "'Nunito', system-ui, sans-serif",
        fontWeight: 900, fontSize: 13, cursor: 'pointer',
        boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
        animation: 'fsNudgePulse 2.4s ease-in-out infinite',
        pointerEvents: 'auto',
      }}
    >⛶ Vollbild (F11)</button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Beamer view — top-level router
// ═══════════════════════════════════════════════════════════════════════════════

function BeamerView({ state: s, slideTemplates, roomCode }: { state: QQStateUpdate; slideTemplates: QQSlideTemplates; roomCode: string }) {
  const cat = s.currentQuestion?.category;
  // Drei Overlay-Stufen vor den Regel-Folien:
  //   -2 = Willkommens-Screen ("Willkommen beim BLOCK QUIZ")
  //   -1 = Regel-Intro ("Jetzt kommen die Regeln — gut aufpassen!")
  //    0..= normale Regel-Folien (RulesView)
  // Crossfade zwischen -2 → -1 → Regeln via opacity transition.
  const rulesIdx = s.rulesSlideIndex ?? 0;
  const welcomeActive = s.phase === 'RULES' && rulesIdx === -2;
  const rulesIntroActive = s.phase === 'RULES' && rulesIdx === -1;
  // Pause-/Wartescreen: cozy-warm Look passend zum Quiz, mit weichen Blob-Akzenten.
  // Pre-Game (gold/amber, „Lagerfeuer entfacht sich") und Paused (lavender/rose,
  // „kurze Atempause") teilen sich den warmen Cozy-Untergrund.
  const isPreGame = s.phase === 'LOBBY' && !s.setupDone;
  const isPaused = s.phase === 'PAUSED';
  const pauseBg = isPreGame
    ? [
        'radial-gradient(ellipse at 22% 28%, rgba(251,191,36,0.30) 0%, transparent 55%)',
        'radial-gradient(ellipse at 78% 72%, rgba(249,115,22,0.24) 0%, transparent 55%)',
        'radial-gradient(ellipse at 50% 105%, rgba(244,114,182,0.16) 0%, transparent 60%)',
        '#0D0A06',
      ].join(',')
    : isPaused
    ? [
        'radial-gradient(ellipse at 28% 32%, rgba(167,139,250,0.26) 0%, transparent 55%)',
        'radial-gradient(ellipse at 78% 70%, rgba(244,114,182,0.20) 0%, transparent 55%)',
        'radial-gradient(ellipse at 55% 8%, rgba(251,191,36,0.14) 0%, transparent 55%)',
        '#0D0A06',
      ].join(',')
    : null;
  const bg = pauseBg ?? s.theme?.bgColor ?? (cat ? (CAT_BG[cat] ?? '#0D0A06') : '#0D0A06');
  const textCol = s.theme?.textColor ?? '#e2e8f0';
  const accent = s.theme?.accentColor ?? '#F59E0B';
  // Cozy-warmer Card-Hintergrund (passend zum In-Game) statt kühlem Navy.
  // PreGame/Paused nutzen denselben Default wie In-Game (COZY_CARD_BG),
  // damit der ganze Beamer eine konsistente Card-Optik hat.
  const cardBg = (isPreGame || isPaused)
    ? COZY_CARD_BG
    : (s.theme?.cardBg ?? COZY_CARD_BG);
  const fontFam = s.theme?.fontFamily ? `'${s.theme.fontFamily}', 'Nunito', system-ui, sans-serif` : "'Nunito', system-ui, sans-serif";

  // ── 3D grid toggle (beamer-local) ──
  // Not persisted: each new question restarts in 2D so the cinematic "Fahrt"
  // (flat → isometric) plays again. Toggle is only a per-question override.
  const [use3D, setUse3D] = useState(false);
  const toggle3D = useCallback(() => { setUse3D(v => !v); }, []);
  useEffect(() => {
    const onToggle = () => toggle3D();
    window.addEventListener('qq:toggleView', onToggle);
    return () => window.removeEventListener('qq:toggleView', onToggle);
  }, [toggle3D]);

  // Auto-reset to 2D whenever the question changes, so the Fahrt can replay
  const use3DQIdxRef = useRef(s.questionIndex);
  useEffect(() => {
    if (use3DQIdxRef.current !== s.questionIndex) {
      use3DQIdxRef.current = s.questionIndex;
      setUse3D(false);
    }
  }, [s.questionIndex]);

  // ── Slide transition: gameshow-style flash-sweep between phase groups ──
  // Bis 2026-04-23 wurden QUESTION_ACTIVE + QUESTION_REVEAL zusammengruppiert
  // ("reveal ist keine neue Slide"). Das fuehlte sich beim Uebergang aber als
  // harter Cut an. Active→Reveal feuert KEIN Flash mehr (User-Feedback): die
  // QuestionView bleibt gemountet, der Inhalt aendert sich nur leicht (Antwort
  // wird gruen, Avatare/Top-Bets erscheinen) — eine zusaetzliche Bildschirm-
  // Pulsanimation wirkt unnoetig "ueber" einem fast identischen Screen.
  // RULES sub-steps (Welcome -2 / RulesIntro -1 / Regel-Folie 0..) zaehlen als
  // eigene Slides, damit der Flash-Sweep auch bei diesen Uebergaengen feuert.
  const phaseGroup = (s.phase === 'QUESTION_ACTIVE' || s.phase === 'QUESTION_REVEAL')
    ? `Q-${s.currentQuestion?.id ?? s.questionIndex}`
    : s.phase === 'PLACEMENT'
      ? `PLACE-${s.questionIndex}`
      : s.phase === 'RULES'
        ? `RULES-${s.rulesSlideIndex ?? 0}`
        : s.phase;
  const [flashKey, setFlashKey] = useState(0);
  const prevGroupRef = useRef(phaseGroup);
  useEffect(() => {
    if (prevGroupRef.current !== phaseGroup) {
      prevGroupRef.current = phaseGroup;
      setFlashKey(k => k + 1);
    }
  }, [phaseGroup]);

  // ── Placement cell flash: when PLACEMENT→QUESTION_REVEAL, keep showing
  // PlacementView briefly with the just-placed cell highlighted (#2)
  const prevPhaseRef = useRef(s.phase);
  const [placementFlash, setPlacementFlash] = useState<{ cell: { row: number; col: number; teamId: string; wasSteal?: boolean }; state: QQStateUpdate } | null>(null);

  useEffect(() => {
    if (prevPhaseRef.current === 'PLACEMENT' && s.phase === 'QUESTION_REVEAL' && s.lastPlacedCell) {
      setPlacementFlash({ cell: s.lastPlacedCell, state: s });
      const t = setTimeout(() => setPlacementFlash(null), 1800);
      prevPhaseRef.current = s.phase;
      return () => clearTimeout(t);
    }
    prevPhaseRef.current = s.phase;
  }, [s.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Get-Ready Countdown: PAUSED → andere Phase oder RULES → PHASE_INTRO ──
  // (User-Wunsch 2026-04-28: 'nach pause weiter drücken vlt mit timer starten,
  // bei quiz start nach regeln vor runde 1 auch ein timer'). 3-2-1-Overlay
  // gibt den Spielern Zeit zum Handy-Schnappen / Aufmerksamkeit-Sammeln.
  // 2026-04-28-Update: Während Countdown wird der ALTE Bildschirm gefreezed
  // (PausedView / RulesView) — User-Wunsch 'pause darf keinen bug auslösen'.
  // Sonst rendert die neue Phase schon hinter dem Backdrop-Blur und
  // animiert/spielt durch.
  const prevReadyPhaseRef = useRef(s.phase);
  const [getReady, setGetReady] = useState<{ id: number; reason: 'resume' | 'start' } | null>(null);
  // Snapshot-Ref: hält den State-Stand vom Moment des Phase-Wechsels — wird
  // während des Countdowns gerendert statt des Live-States.
  const frozenStateRef = useRef<QQStateUpdate | null>(null);
  useEffect(() => {
    const prev = prevReadyPhaseRef.current;
    prevReadyPhaseRef.current = s.phase;
    // 1) Resume nach Pause — egal in welche Phase wir zurückkehren
    if (prev === 'PAUSED' && s.phase !== 'PAUSED' && s.phase !== 'LOBBY') {
      // Wir frieren den letzten PausedView-State (mit phase=PAUSED) — der ist
      // im aktuellen `s` allerdings schon überschrieben. Workaround:
      // erzeugen einen Pseudo-State der phase erzwingt.
      frozenStateRef.current = { ...s, phase: 'PAUSED' as any };
      setGetReady({ id: Date.now(), reason: 'resume' });
      const t = window.setTimeout(() => {
        frozenStateRef.current = null;
        setGetReady(null);
      }, 3200);
      return () => window.clearTimeout(t);
    }
    // 2) Quiz-Start nach Regeln → erste Runde
    if (prev === 'RULES' && s.phase === 'PHASE_INTRO' && s.gamePhaseIndex === 1) {
      frozenStateRef.current = { ...s, phase: 'RULES' as any };
      setGetReady({ id: Date.now(), reason: 'start' });
      const t = window.setTimeout(() => {
        frozenStateRef.current = null;
        setGetReady(null);
      }, 3200);
      return () => window.clearTimeout(t);
    }
  }, [s.phase, s.gamePhaseIndex]);
  // Während Countdown rendern wir den frozen-Snapshot statt des Live-States.
  const renderState: QQStateUpdate = (getReady && frozenStateRef.current) ? frozenStateRef.current : s;

  // ── Sound: sync volume & config from server state ──
  // Volume only applies to SFX (music has its own volume handling)
  useEffect(() => {
    setVolume(s.sfxMuted ? 0 : s.volume);
  }, [s.sfxMuted, s.volume]);

  useEffect(() => {
    setSoundConfig(s.soundConfig);
  }, [s.soundConfig]);

  // ── Sound: phase-based SFX ──
  const prevSfxPhaseRef = useRef(s.phase);
  const prevSfxQuestionIdRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevSfxPhaseRef.current;
    prevSfxPhaseRef.current = s.phase;
    if (s.sfxMuted) return;
    resumeAudio();
    if (s.phase === 'PHASE_INTRO' && prev !== 'PHASE_INTRO') {
      playRoundStart();
      playFanfare();
    }
    if (s.phase === 'QUESTION_REVEAL' && prev === 'QUESTION_ACTIVE') {
      // Mucho + ZvZ haben Multi-Step-Reveals (Step 0 = Pause, Step 1 = Avatar-
      // Cascade, Step 2 = Lock-Green). Phase-Wechsel ist visuell nur eine
      // dezente Question-Fade — Reveal-Sound wäre hier zu früh. Stattdessen
      // beim ersten muchoRevealStep/zvzRevealStep getriggert (siehe unten).
      const cat = s.currentQuestion?.category;
      const skipPhaseSound = cat === 'MUCHO' || cat === 'ZEHN_VON_ZEHN';
      if (!skipPhaseSound) {
        playRevealFor(cat);
      }
    }
    if (s.phase === 'PLACEMENT' && prev === 'QUESTION_REVEAL') {
      const cat = s.currentQuestion?.category;
      if (s.correctTeamId) playCorrectFor(cat);
      else playWrongFor(cat);
    }
    if (s.phase === 'GAME_OVER' && prev !== 'GAME_OVER') {
      playGameOver();
      // Cozy-Wolf-Stinger: ein einzelner ferner Howl ~600ms nach Fanfare,
      // wirkt wie ein Signaturmoment statt generischem End-Beep.
      window.setTimeout(() => { try { playWolfHowl(); } catch {} }, 700);
    }
  }, [s.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Time-Travel-Recorder ──
  // Wir loggen während des Spiels Frage für Frage wer gewonnen hat —
  // das Backend trackt das nicht historisch (nur live in correctTeamId).
  // Beim GAME_OVER spielen wir das als 15-Sek-Recap ab.
  // Steal-Events kommen aus lastPlacedCell.wasSteal.
  // Module-Level-Refs (siehe oben), damit die Replay-Component beim Mount
  // im Render-Tree dieselben Refs sieht.
  useEffect(() => {
    if (s.phase === 'QUESTION_REVEAL' && s.currentQuestion) {
      const qid = s.currentQuestion.id;
      if (!recordedQuestions.has(qid)) {
        recordedQuestions.set(qid, {
          winnerId: s.correctTeamId ?? null,
          category: s.currentQuestion.category,
          idx: s.questionIndex,
        });
      } else if (s.correctTeamId) {
        const ex = recordedQuestions.get(qid)!;
        if (!ex.winnerId) ex.winnerId = s.correctTeamId;
      }
    }
  }, [s.phase, s.currentQuestion?.id, s.correctTeamId, s.questionIndex]);

  useEffect(() => {
    const lp = s.lastPlacedCell;
    if (lp && lp.wasSteal) {
      recordedSteals.add(`${lp.row}-${lp.col}-${lp.teamId}`);
    }
  }, [s.lastPlacedCell?.row, s.lastPlacedCell?.col, s.lastPlacedCell?.teamId, s.lastPlacedCell?.wasSteal]);

  // Reset Recordings beim Game-Restart (LOBBY → erneut aktivieren)
  useEffect(() => {
    if (s.phase === 'LOBBY') {
      recordedQuestions.clear();
      recordedSteals.clear();
    }
  }, [s.phase]);

  // Lagerfeuer-Loop deaktiviert (User-Wunsch 2026-04-28: hat zu sehr gestört).
  // Code bleibt stehen falls wir's später als optionales Toggle wieder aktivieren.
  useEffect(() => { stopCampfireLoop(); return () => stopCampfireLoop(); }, []);

  // Avatar-Jingle wenn ein neues Team joint — pro Avatar eigenes Mini-Timbre.
  // Erkennt frische Joins via teamIds-Diff (gleiche Logik wie Wave-Anim in
  // LobbyView). Spielt nur wenn SFX aktiv und neues Team echt neu (nicht
  // beim initialen Mount mit existierenden Teams).
  const prevTeamIdsForJingleRef = useRef<Set<string>>(new Set(s.teams.map(t => t.id)));
  useEffect(() => {
    if (s.sfxMuted) {
      prevTeamIdsForJingleRef.current = new Set(s.teams.map(t => t.id));
      return;
    }
    const cur = new Set(s.teams.map(t => t.id));
    const prev = prevTeamIdsForJingleRef.current;
    const fresh = s.teams.filter(t => !prev.has(t.id));
    prevTeamIdsForJingleRef.current = cur;
    // Nur jinglen wenn vorher schon Teams da waren (kein Mass-Jingle beim Beamer-Mount).
    if (fresh.length > 0 && prev.size > 0 && s.phase === 'LOBBY') {
      // Stagger: pro Avatar ~250ms versetzt
      fresh.forEach((t, i) => {
        window.setTimeout(() => { try { playAvatarJingle(t.avatarId); } catch {} }, i * 250);
      });
    }
  }, [s.teams, s.sfxMuted, s.phase]);

  // Neuer Frage-Cue bei jeder neuen Question-ID.
  useEffect(() => {
    if (s.sfxMuted) return;
    const qid = s.currentQuestion?.id ?? null;
    if (!qid) return;
    if (qid === prevSfxQuestionIdRef.current) return;
    prevSfxQuestionIdRef.current = qid;
    if (s.phase === 'QUESTION_ACTIVE') {
      resumeAudio();
      playQuestionStartFor(s.currentQuestion?.category);
    }
  }, [s.currentQuestion?.id, s.phase, s.sfxMuted]);

  // ── Music: timer loop (game-show music while question is active) ──
  // Normalfall: laeuft solange ein Frage-Timer aktiv ist (s.timerEndsAt).
  // Hot Potato: hat keinen Frage-Timer, sondern pro-Team-Turn-Timer der mit
  //   jedem Team-Wechsel neu gesetzt wird. Frueher hing die Musik an
  //   `s.hotPotatoTurnEndsAt` → Loop startete bei jedem Team-Switch neu (Cut!).
  //   Jetzt ist sie an die Frage selbst gekoppelt: einmal Start beim Aktivieren,
  //   bis die Phase wechselt (Winner declared / Reveal).
  // Pro-Kategorie-Musik (seit 2026-04-23): currentQuestion.category waehlt
  //   den passenden catMusic*-Slot — wenn dort eine URL gesetzt ist, wird
  //   sie geladen, sonst Fallback auf timerLoop.
  useEffect(() => {
    const bt: { kind?: string } | undefined = s.currentQuestion?.bunteTuete as any;
    const isHotPotato = s.currentQuestion?.category === 'BUNTE_TUETE' && bt?.kind === 'hotPotato';
    const hasNormalTimer = !!s.timerEndsAt;
    const shouldLoop =
      !s.musicMuted
      && s.phase === 'QUESTION_ACTIVE'
      && !s.currentQuestion?.musicUrl
      && (hasNormalTimer || isHotPotato);
    if (!shouldLoop) {
      stopTimerLoop();
      return;
    }
    const cat = s.currentQuestion?.category;
    const catSlot: QQSoundSlot | undefined =
      cat === 'SCHAETZCHEN'   ? 'catMusicSchaetzchen'
      : cat === 'MUCHO'         ? 'catMusicMucho'
      : cat === 'BUNTE_TUETE'   ? 'catMusicBunteTuete'
      : cat === 'ZEHN_VON_ZEHN' ? 'catMusicZehnVonZehn'
      : cat === 'CHEESE'        ? 'catMusicCheese'
      : undefined;
    startTimerLoop(catSlot);
    return () => stopTimerLoop();
    // hotPotatoTurnEndsAt ABSICHTLICH NICHT in deps — sonst springt der Loop
    // bei jedem Team-Wechsel an. Die Musik laeuft fuer die gesamte HP-Runde.
  }, [s.timerEndsAt, s.phase, s.musicMuted, s.currentQuestion?.id, s.currentQuestion?.musicUrl, s.currentQuestion?.category]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Music: Lobby-Loop in Lobby / Welcome / RULES / Pause / FINALE ──
  // Erweitert auf alle RULES-Slides (vorher nur Welcome bei -2), damit
  // der Regel-Walkthrough nicht in komplett stillem Raum stattfindet.
  // 2026-04-28: CONNECTIONS_4X4 (Großes Finale) bekommt auch Hintergrund-Musik
  // (User-Wunsch: 'während Finale keine Musik und keine Sounds' war Bug).
  useEffect(() => {
    const inRules = s.phase === 'RULES';
    const inFinale = s.phase === 'CONNECTIONS_4X4';
    const shouldLoop = !s.musicMuted && (s.phase === 'LOBBY' || s.phase === 'PAUSED' || inRules || inFinale);
    if (shouldLoop) {
      resumeAudio();
      startLobbyLoop();
    } else {
      stopLobbyLoop();
    }
    return () => stopLobbyLoop();
  }, [s.phase, s.musicMuted]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Audio-Unlock: Browser blockiert Autoplay bis zur ersten User-Interaktion
  // im Tab. Der Beamer-Tab bekommt aber selten echte Klicks (Moderator ist
  // meist im Moderator-Tab). Wir haengen einmalige Unlock-Listener auf
  // click/keydown/touchend — sobald irgendwas im Beamer-Tab passiert, wird
  // Audio-Context entsperrt und der Lobby-Loop (falls aktiv) neu gestartet.
  useEffect(() => {
    const stateSnapshot = { phase: s.phase, musicMuted: s.musicMuted };
    // Ref zu aktuellen state-Werten via snapshot, der bei jedem Render refresht wird.
    const unlock = () => {
      resumeAudio();
      const inRules = stateSnapshot.phase === 'RULES';
      const shouldLoop = !stateSnapshot.musicMuted && (stateSnapshot.phase === 'LOBBY' || stateSnapshot.phase === 'PAUSED' || inRules);
      if (shouldLoop) startLobbyLoop();
    };
    const opts: AddEventListenerOptions = { once: true };
    window.addEventListener('click', unlock, opts);
    window.addEventListener('keydown', unlock, opts);
    window.addEventListener('touchend', unlock, opts);
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchend', unlock);
    };
  }, [s.phase, s.rulesSlideIndex, s.musicMuted]);

  // ── Music Duck: während PAUSE wird alle Musik auf ~20% gedämpft (500ms fade) ──
  useEffect(() => {
    setMusicDucked(s.phase === 'PAUSED');
  }, [s.phase]);

  // ── Duck auf question-musicUrl anwenden (tickt, weil getMusicDuckFactor global ist) ──
  const [duckFactor, setDuckFactor] = useState(1);
  useEffect(() => {
    if (s.phase !== 'PAUSED' && duckFactor === 1) return;
    // während Fade: alle 30ms nachziehen, bis Ziel erreicht
    const iv = setInterval(() => {
      const f = getMusicDuckFactor();
      setDuckFactor(f);
      if ((s.phase === 'PAUSED' && f <= 0.21) || (s.phase !== 'PAUSED' && f >= 0.99)) {
        clearInterval(iv);
      }
    }, 30);
    return () => clearInterval(iv);
  }, [s.phase, duckFactor]);

  // ── Sound: timer ticks (SFX — not music) ──
  useEffect(() => {
    if (s.sfxMuted || !s.timerEndsAt || s.phase !== 'QUESTION_ACTIVE') return;
    const iv = setInterval(() => {
      const rem = Math.max(0, (s.timerEndsAt! - Date.now()) / 1000);
      if (rem <= 0) { stopTimerLoop(); playTimesUp(); clearInterval(iv); return; }
      if (rem <= 5) playUrgentTick();
      else if (rem <= 10) playTick();
    }, 1000);
    return () => clearInterval(iv);
  }, [s.timerEndsAt, s.phase, s.sfxMuted]);

  // D1-D3 Marker-Sounds: Shield / Stapel / Sanduhr beim ersten Setzen.
  // Wir diffen die Grid-Cell-Flags: neues shielded/stuck/sandLockTtl>0 → Sound.
  // F1 Team-Join-Sound wird hier auch angehaengt (neue Team-IDs).
  // Swap-Sound: wenn zwischen zwei States zwei Cells gleichzeitig den Owner
  // wechseln UND ihre neuen Owner zu ihren vorherigen Gegner passen (= Swap).
  const prevFlagsRef = useRef<{ shield: string; stuck: string; sand: string; teamIds: string; owners: string }>({
    shield: '', stuck: '', sand: '', teamIds: '', owners: '',
  });
  useEffect(() => {
    if (s.sfxMuted) return;
    const shieldKey = s.grid.flatMap((row, r) => row.map((c, ci) => c.shielded ? `${r}-${ci}` : '')).filter(Boolean).join(',');
    const stuckKey = s.grid.flatMap((row, r) => row.map((c, ci) => c.stuck ? `${r}-${ci}` : '')).filter(Boolean).join(',');
    const sandKey = s.grid.flatMap((row, r) => row.map((c, ci) => (c.sandLockTtl ?? 0) > 0 ? `${r}-${ci}` : '')).filter(Boolean).join(',');
    const teamIdsKey = s.teams.map(t => t.id).sort().join(',');
    const ownersKey = s.grid.flatMap(row => row.map(c => c.ownerId ?? '')).join('|');
    const prev = prevFlagsRef.current;
    const grew = (a: string, b: string) => b.split(',').filter(Boolean).length > a.split(',').filter(Boolean).length;
    if (prev.shield && grew(prev.shield, shieldKey)) playShieldActivate();
    if (prev.stuck  && grew(prev.stuck,  stuckKey))  playStapelStamp();
    if (prev.sand   && grew(prev.sand,   sandKey))   playSanduhrFlip();
    if (prev.teamIds && grew(prev.teamIds, teamIdsKey) && s.phase === 'LOBBY') playTeamJoin();
    // Swap-Detect: zwei Cells gleichzeitig Owner-Wechsel + Gegenseitig.
    if (prev.owners && prev.owners !== ownersKey) {
      const prevArr = prev.owners.split('|');
      const size = s.gridSize;
      const changes: Array<{ idx: number; from: string; to: string }> = [];
      for (let i = 0; i < size * size; i++) {
        const from = prevArr[i] ?? '';
        const to = s.grid[Math.floor(i / size)][i % size].ownerId ?? '';
        if (from !== to && from !== '' && to !== '') changes.push({ idx: i, from, to });
      }
      // Klassischer Swap: genau 2 Cells, Owner kreuzen sich (A↔B).
      if (changes.length === 2 && changes[0].from === changes[1].to && changes[1].from === changes[0].to) {
        playSwapActivate();
      }
    }
    prevFlagsRef.current = { shield: shieldKey, stuck: stuckKey, sand: sandKey, teamIds: teamIdsKey, owners: ownersKey };
  }, [s.grid, s.teams, s.phase, s.sfxMuted]); // eslint-disable-line react-hooks/exhaustive-deps

  // H2 First-Steal-Badge: beim ersten Klau der Partie ein „Steal unlocked!"-
  // Moment. Trigger via lastPlacedCell.wasSteal zum ersten Mal true.
  const firstStealSeenRef = useRef(false);
  const [firstStealBadge, setFirstStealBadge] = useState<string | null>(null);
  useEffect(() => {
    if (firstStealSeenRef.current) return;
    if (s.lastPlacedCell?.wasSteal) {
      firstStealSeenRef.current = true;
      const t = s.teams.find(tm => tm.id === s.lastPlacedCell?.teamId);
      setFirstStealBadge(t?.name ?? 'Team');
      setTimeout(() => setFirstStealBadge(null), 2800);
    }
  }, [s.lastPlacedCell]);

  // G1 Round-End-Overlay + H1 Perfect-Round-Detection.
  // Tracken: pro Team, wie oft es in der aktuellen Runde correctTeamId war.
  // Bei Runden-Wechsel (gamePhaseIndex++): Zeige Overlay, prüfe auf 5/5 Perfect.
  const roundCorrectsRef = useRef<Record<string, number>>({});
  const prevGamePhaseRef = useRef(s.gamePhaseIndex);
  const prevCorrectTeamIdRef = useRef<string | null>(null);
  const prevQidRef = useRef<string | null>(null);
  const [roundEndOverlay, setRoundEndOverlay] = useState<{
    phase: number;
    winner: typeof s.teams[number] | null;
    perfectTeams: typeof s.teams;
  } | null>(null);

  useEffect(() => {
    const qid = s.currentQuestion?.id ?? null;
    const cur = s.correctTeamId ?? null;
    // Nur einmal pro Question counten — wechsel der Question-ID reset prevCorrect.
    if (qid !== prevQidRef.current) {
      prevQidRef.current = qid;
      prevCorrectTeamIdRef.current = null;
    }
    if (cur && cur !== prevCorrectTeamIdRef.current) {
      prevCorrectTeamIdRef.current = cur;
      roundCorrectsRef.current[cur] = (roundCorrectsRef.current[cur] ?? 0) + 1;
    }
  }, [s.correctTeamId, s.currentQuestion?.id]);

  useEffect(() => {
    const prev = prevGamePhaseRef.current;
    prevGamePhaseRef.current = s.gamePhaseIndex;
    if (s.gamePhaseIndex > prev && prev >= 1) {
      const leader = [...s.teams].sort((a, b) =>
        b.largestConnected - a.largestConnected || b.totalCells - a.totalCells
      )[0] ?? null;
      // H1: wer hatte 5/5 in der gerade beendeten Runde?
      const perfect = s.teams.filter(t => (roundCorrectsRef.current[t.id] ?? 0) >= 5);
      setRoundEndOverlay({ phase: prev, winner: leader, perfectTeams: perfect });
      setTimeout(() => setRoundEndOverlay(null), 3600);
      // Reset fuer neue Runde.
      roundCorrectsRef.current = {};
    }
  }, [s.gamePhaseIndex, s.teams]);

  // C3 Timer-Urgency-Vignette: roter Inset-Pulse am Screen-Rand bei <=5s.
  // Separater State, damit wir im Render-Baum die Vignette zeigen koennen
  // (der Sound-Tick-Hook oben setzt keinen State).
  const [timerUrgent, setTimerUrgent] = useState(false);
  useEffect(() => {
    if (!s.timerEndsAt || s.phase !== 'QUESTION_ACTIVE') {
      setTimerUrgent(false);
      return;
    }
    const tick = () => {
      const rem = Math.max(0, (s.timerEndsAt! - Date.now()) / 1000);
      setTimerUrgent(rem > 0 && rem <= 5);
    };
    tick();
    const iv = setInterval(tick, 250);
    return () => clearInterval(iv);
  }, [s.timerEndsAt, s.phase]);

  // ── Sound: Timer-End auch wenn alle Teams vor Ablauf geantwortet haben ──
  const prevAllAnsweredRef = useRef(false);
  useEffect(() => {
    const justAllAnswered =
      s.phase === 'QUESTION_ACTIVE' && s.allAnswered && !prevAllAnsweredRef.current;
    prevAllAnsweredRef.current = s.allAnswered;
    if (justAllAnswered && !s.sfxMuted) {
      stopTimerLoop();
      playTimesUp();
    }
  }, [s.allAnswered, s.phase, s.sfxMuted]);

  // ── Sound: placement → score up (SFX) ──
  const prevCorrectRef = useRef(s.correctTeamId);
  useEffect(() => {
    if (s.correctTeamId && !prevCorrectRef.current && !s.sfxMuted) playScoreUp();
    prevCorrectRef.current = s.correctTeamId;
  }, [s.correctTeamId, s.sfxMuted]);

  // ── Sound: pro Einzel-Placement (nicht pro Phase-Wechsel)
  // In Multi-Placement-Runden (PLACE_2 etc.) bleibt das Backend in der PLACEMENT-Phase
  // bis alle Steine gesetzt sind — wir verlassen uns deshalb auf lastPlacedCell, das pro
  // einzelnem Placement auf dem Backend aktualisiert wird.
  const prevPlacementKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const c = s.lastPlacedCell;
    if (!c) { prevPlacementKeyRef.current = null; return; }
    const key = `${c.row}-${c.col}-${c.teamId}`;
    if (key === prevPlacementKeyRef.current) return;
    prevPlacementKeyRef.current = key;
    if (s.sfxMuted) return;
    if (c.wasSteal) playSteal();
    else playFieldPlaced();
  }, [s.lastPlacedCell, s.sfxMuted]);

  // ── Sound: Reveal-Step Plopps (Avatare auf Optionen / Map-Pins / Lösungs-Highlight)
  // Bei MUCHO/ZehnvonZehn/Cheese/CozyGuessr werden im REVEAL pro Moderator-Klick
  // sukzessive Avatare oder Pins eingespielt. Pro Step ein „Plopp", beim finalen
  // Lösungs-Step (z.B. MUCHO grünes Feld) ein satterer Bestätigungs-Sound.
  //
  // Alter Code hatte einen separaten Reset-useEffect der BAUM die frisch gesetzte
  // Baseline direkt wieder auf null ueberschrieb → jeder erste Step einer Frage
  // hatte kein Audio. Jetzt konsolidiert in einem Hook + prevQidRef:
  // - Frage-Wechsel (qid neu): prevSteps auf curr setzen, KEIN Sound.
  // - Sonst: curr mit prev vergleichen, Sound pro Step-Inkrement.
  const prevRevealStepsRef = useRef({ mucho: 0, zvz: 0, cheese: 0, map: 0 });
  const prevRevealQidRef = useRef<string | null>(null);
  useEffect(() => {
    const qid = s.currentQuestion?.id ?? null;
    const curr = {
      mucho:  s.muchoRevealStep  ?? 0,
      zvz:    s.zvzRevealStep    ?? 0,
      cheese: s.cheeseRevealStep ?? 0,
      map:    s.mapRevealStep    ?? 0,
    };
    // Question wechselt → Baseline neu setzen, kein Sound.
    if (qid !== prevRevealQidRef.current) {
      prevRevealQidRef.current = qid;
      prevRevealStepsRef.current = curr;
      return;
    }
    const prev = prevRevealStepsRef.current;
    prevRevealStepsRef.current = curr;
    if (s.phase !== 'QUESTION_REVEAL' || s.sfxMuted) return;

    // MUCHO: Akt-1-Steps → Plopp; Lock-Step (Lösung grün) → Bestätigungs-Sound.
    if (curr.mucho > prev.mucho) {
      const q = s.currentQuestion;
      if (q?.category === 'MUCHO') {
        const distinctVoterOptions = new Set(s.answers.map(a => a.text)).size;
        const lockStep = distinctVoterOptions + 1;
        // Beim ersten Step (Avatar-Cascade) den verschobenen Reveal-Sound
        // nachholen — vorher feuerte er beim Phase-Wechsel ohne sichtbares
        // Event. Beim Lock-Step regulärer Bestätigungs-Sound.
        if (curr.mucho >= lockStep) playCorrect();
        else if (prev.mucho === 0) playRevealFor('MUCHO');
        else playFieldPlaced();
      }
    }
    // ZEHN_VON_ZEHN: Cascade-Step → Plopp, Final → Fanfare.
    if (curr.zvz > prev.zvz) {
      if (curr.zvz >= 2) playFanfare();
      else if (prev.zvz === 0) playRevealFor('ZEHN_VON_ZEHN');
      else playFieldPlaced();
    }
    // CHEESE: Step 1 = Lösung grün, Step 2 = Avatare auf den Treffern.
    if (curr.cheese > prev.cheese) {
      if (curr.cheese === 1) playReveal();
      else playFieldPlaced();
    }
    // CozyGuessr (BUNTE_TUETE Map): jeder neue Pin = Plopp.
    if (curr.map > prev.map) {
      playFieldPlaced();
    }
  }, [s.muchoRevealStep, s.zvzRevealStep, s.cheeseRevealStep, s.mapRevealStep, s.phase, s.sfxMuted, s.currentQuestion?.id, s.answers]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Bunte-Tüte-Sub-Mechanik-Sounds: HotPotato / OnlyConnect / Bluff ────────
  // Diese Mechaniken hatten bisher kein Audio — Beamer war stumm während die
  // Action lief. Tracking via Refs damit jeder State-Sprung genau 1× klingt.
  const prevHpEliminatedRef = useRef(0);
  const prevHpActiveTeamRef = useRef<string | null>(null);
  const prevOcGuessCountRef = useRef(0);
  const prevBluffPhaseRef = useRef<string | null>(null);
  const prevBluffSubmitCountRef = useRef(0);
  const prevBluffVoteCountRef = useRef(0);
  const prevSubMechQidRef = useRef<string | null>(null);
  useEffect(() => {
    const qid = s.currentQuestion?.id ?? null;
    // Frage-Wechsel: alle Baselines reset, kein Sound.
    if (qid !== prevSubMechQidRef.current) {
      prevSubMechQidRef.current = qid;
      prevHpEliminatedRef.current = (s.hotPotatoEliminated ?? []).length;
      prevHpActiveTeamRef.current = s.hotPotatoActiveTeamId ?? null;
      prevOcGuessCountRef.current = (s.onlyConnectGuesses ?? []).length;
      prevBluffPhaseRef.current = s.bluffPhase ?? null;
      prevBluffSubmitCountRef.current = Object.values(s.bluffSubmissions ?? {}).filter(t => t?.trim()).length;
      prevBluffVoteCountRef.current = Object.keys(s.bluffVotes ?? {}).length;
      return;
    }
    if (s.sfxMuted) {
      // Werte trotzdem nachziehen, damit nach Unmute kein Riesensprung kommt.
      prevHpEliminatedRef.current = (s.hotPotatoEliminated ?? []).length;
      prevHpActiveTeamRef.current = s.hotPotatoActiveTeamId ?? null;
      prevOcGuessCountRef.current = (s.onlyConnectGuesses ?? []).length;
      prevBluffPhaseRef.current = s.bluffPhase ?? null;
      prevBluffSubmitCountRef.current = Object.values(s.bluffSubmissions ?? {}).filter(t => t?.trim()).length;
      prevBluffVoteCountRef.current = Object.keys(s.bluffVotes ?? {}).length;
      return;
    }

    // HotPotato: neues Team eliminiert → playWrong.
    const hpElim = (s.hotPotatoEliminated ?? []).length;
    if (hpElim > prevHpEliminatedRef.current) {
      try { playWrong(); } catch {}
    }
    prevHpEliminatedRef.current = hpElim;
    // HotPotato: aktives Team wechselt → playTick (Zug weitergegeben).
    const hpActive = s.hotPotatoActiveTeamId ?? null;
    if (hpActive && hpActive !== prevHpActiveTeamRef.current && prevHpActiveTeamRef.current != null) {
      try { playTick(); } catch {}
    }
    prevHpActiveTeamRef.current = hpActive;

    // OnlyConnect: neuer Tipp eingegangen → richtig=playCorrect, falsch=playWrong.
    const ocGuesses = s.onlyConnectGuesses ?? [];
    if (ocGuesses.length > prevOcGuessCountRef.current) {
      const newGuess = ocGuesses[ocGuesses.length - 1];
      if (newGuess?.correct) { try { playCorrect(); } catch {} }
      else { try { playWrong(); } catch {} }
    }
    prevOcGuessCountRef.current = ocGuesses.length;

    // Bluff: Phase-Übergänge.
    const bp = s.bluffPhase ?? null;
    if (bp !== prevBluffPhaseRef.current) {
      if (bp === 'review' || bp === 'vote') { try { playFieldPlaced(); } catch {} }
      else if (bp === 'reveal') { try { playFanfare(); } catch {} }
    }
    prevBluffPhaseRef.current = bp;
    // Bluff: jeder neue Submit/Vote = leiser Plopp.
    const bSubmits = Object.values(s.bluffSubmissions ?? {}).filter(t => t?.trim()).length;
    if (bSubmits > prevBluffSubmitCountRef.current) {
      try { playTick(); } catch {}
    }
    prevBluffSubmitCountRef.current = bSubmits;
    const bVotes = Object.keys(s.bluffVotes ?? {}).length;
    if (bVotes > prevBluffVoteCountRef.current) {
      try { playTick(); } catch {}
    }
    prevBluffVoteCountRef.current = bVotes;
  }, [
    s.hotPotatoEliminated, s.hotPotatoActiveTeamId,
    s.onlyConnectGuesses,
    s.bluffPhase, s.bluffSubmissions, s.bluffVotes,
    s.sfxMuted, s.currentQuestion?.id,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Finale (CONNECTIONS_4X4) Sounds ─────────────────────────────────────────
  // (User-Wunsch 2026-04-28: 'während Finale keine Musik und keine Sounds').
  // Music siehe oben (lobby-loop in CONNECTIONS_4X4 phase). SFX tracken hier
  // das Connections-State für Group-Found / Phase-Wechsel.
  const prevConnPhaseRef = useRef<string | null>(null);
  const prevConnFoundCountsRef = useRef<Record<string, number>>({});
  useEffect(() => {
    const c = s.connections;
    if (!c) {
      prevConnPhaseRef.current = null;
      prevConnFoundCountsRef.current = {};
      return;
    }
    if (s.sfxMuted) {
      prevConnPhaseRef.current = c.phase;
      Object.keys(c.teamProgress).forEach(id => {
        prevConnFoundCountsRef.current[id] = c.teamProgress[id]?.foundGroupIds.length ?? 0;
      });
      return;
    }
    // Phase-Wechsel
    if (c.phase !== prevConnPhaseRef.current) {
      if (c.phase === 'active' && prevConnPhaseRef.current === 'intro') {
        try { playQuestionStart(); } catch {}
      } else if (c.phase === 'reveal') {
        try { playFanfare(); } catch {}
      }
      prevConnPhaseRef.current = c.phase;
    }
    // Pro neu gefundener Gruppe pro Team einen playCorrect-Klick
    Object.entries(c.teamProgress).forEach(([id, tp]) => {
      const now = tp?.foundGroupIds.length ?? 0;
      const before = prevConnFoundCountsRef.current[id] ?? 0;
      if (now > before) {
        try { playCorrect(); } catch {}
      }
      prevConnFoundCountsRef.current[id] = now;
    });
  }, [s.connections, s.sfxMuted]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Comeback H/L Sounds — bisher komplett stumm ─────────────────────────────
  // - phase 'question' (start) → playQuestionStart
  // - phase 'reveal'           → playReveal (Drama-Moment)
  // - jede neue Antwort         → tick
  const prevHlPhaseRef = useRef<string | null>(null);
  const prevHlAnsweredCountRef = useRef(0);
  const prevHlRoundRef = useRef<number>(-1);
  useEffect(() => {
    const hl = s.comebackHL;
    if (!hl) {
      prevHlPhaseRef.current = null;
      prevHlAnsweredCountRef.current = 0;
      prevHlRoundRef.current = -1;
      return;
    }
    if (s.sfxMuted) {
      prevHlPhaseRef.current = hl.phase;
      prevHlAnsweredCountRef.current = (hl.answeredThisRound ?? []).length;
      prevHlRoundRef.current = hl.round;
      return;
    }
    // Neue Runde → reset answered-count baseline
    if (hl.round !== prevHlRoundRef.current) {
      prevHlAnsweredCountRef.current = 0;
      prevHlRoundRef.current = hl.round;
    }
    // Phase-Wechsel
    if (hl.phase !== prevHlPhaseRef.current) {
      if (hl.phase === 'question') {
        try { playQuestionStart(); } catch {}
      } else if (hl.phase === 'reveal') {
        try { playReveal(); } catch {}
        // Kurz danach: Fanfare wenn jemand richtig lag
        if ((hl.correctThisRound ?? []).length > 0) {
          window.setTimeout(() => { try { playCorrect(); } catch {} }, 600);
        } else {
          window.setTimeout(() => { try { playWrong(); } catch {} }, 600);
        }
      } else if (hl.phase === 'steal') {
        try { playFieldPlaced(); } catch {}
      }
      prevHlPhaseRef.current = hl.phase;
    }
    // Answers-Tick: jeder neue Submit klick'.
    const ansN = (hl.answeredThisRound ?? []).length;
    if (ansN > prevHlAnsweredCountRef.current) {
      try { playTick(); } catch {}
    }
    prevHlAnsweredCountRef.current = ansN;
  }, [s.comebackHL, s.sfxMuted]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Music: play question musicUrl ──
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const url = s.currentQuestion?.musicUrl;
    if (!url) {
      if (audioRef.current) { fadeOutAudio(audioRef.current, 600); audioRef.current = null; }
      return;
    }
    // Während PAUSE nicht stoppen — nur runterducken (Musik bleibt im Hintergrund).
    if (s.phase !== 'QUESTION_ACTIVE' && s.phase !== 'QUESTION_REVEAL' && s.phase !== 'PAUSED') {
      if (audioRef.current) { fadeOutAudio(audioRef.current, 600); audioRef.current = null; }
      return;
    }
    const effVol = s.musicMuted ? 0 : Math.min(1, s.volume * 0.5 * duckFactor);
    if (audioRef.current?.src?.endsWith(url)) {
      audioRef.current.volume = effVol;
      return;
    }
    if (audioRef.current) fadeOutAudio(audioRef.current, 400);
    const a = new Audio(url);
    a.loop = true;
    a.volume = effVol;
    a.play().catch(() => {});
    audioRef.current = a;
    return () => { fadeOutAudio(a, 500); };
  }, [s.currentQuestion?.musicUrl, s.phase, s.musicMuted, s.volume, duckFactor]);

  // (Vollbild-Button wird zentral vom QQBeamerPage-Parent gerendert (FullscreenNudge),
  //  hier kein zweiter Button mehr — vermeidet Stacking-/Klick-Konflikte oben rechts.)

  // Resolve slide template type for current phase
  const templateType = resolveTemplateType(s);
  // These phases always use built-in views — custom templates not supported
  const builtinOnly = s.phase === 'LOBBY' || s.phase === 'RULES' || s.phase === 'TEAMS_REVEAL' || s.phase === 'PLACEMENT' || s.phase === 'THANKS';
  // Sub-Mechaniken mit dedizierten Beamer-Views NIE durch Custom-Templates
  // überschreiben — weder per-Frage (`q-${q.id}`) noch per-Kategorie. Welle 5
  // hat nur den Category-Pfad gegated, der per-Frage-Pfad überschrieb die
  // dedizierte View aber weiterhin → leerer BG mit Fireflies. User-Bug
  // 4 gewinnt durch 6 Welle-Iterationen unbehoben — Plan-Agent fand die
  // Lücke 2026-04-28.
  const subKindForGate = s.currentQuestion?.bunteTuete?.kind;
  const hasDedicatedView = s.currentQuestion?.category === 'BUNTE_TUETE' && (
    subKindForGate === 'onlyConnect' || subKindForGate === 'bluff' ||
    subKindForGate === 'hotPotato' || subKindForGate === 'top5' ||
    subKindForGate === 'order' || subKindForGate === 'map' ||
    subKindForGate === 'oneOfEight'
  );
  const allowCustomTemplate = !builtinOnly && !hasDedicatedView;
  // Per-question override takes priority over category template
  const perQKey = allowCustomTemplate && s.currentQuestion ? `q-${s.currentQuestion.id}` : null;
  const rawPerQ = perQKey ? slideTemplates[perQKey] : undefined;
  const rawCategoryTemplate = allowCustomTemplate && templateType ? slideTemplates[templateType] : undefined;
  const rawActiveTemplate = rawPerQ?.elements?.length ? rawPerQ : rawCategoryTemplate;
  // Only use custom template if it has actual elements to render
  const activeTemplate = rawActiveTemplate?.elements?.length ? rawActiveTemplate : undefined;

  // I2 Team-Farbwelt Accent: wenn ein Team gerade aktiv ist (pendingFor oder
  // correctTeamId), subtil team-farbigen radial-Accent in den Hintergrund.
  const accentTeamId = s.pendingFor ?? s.correctTeamId ?? null;
  const accentTeam = accentTeamId ? s.teams.find(t => t.id === accentTeamId) : null;
  const teamTintColor = accentTeam?.color ?? null;

  return (
    <div style={{
      height: '100vh', width: '100vw',
      background: activeTemplate ? (activeTemplate.background || bg) : bg,
      fontFamily: fontFam,
      color: textCol, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative',
      // Kein Wrapper-Padding — der eingebaute Sicherheitsrand zeichnete
      // sich optisch sichtbar ab. Inneres Padding handhaben die Views selber.
      transition: 'background 0.8s ease',
    }}>
      {/* CSS keyframes */}
      <style>{BEAMER_CSS}</style>

      {/* I2 Team-Farbwelt-Accent: radial-gradient in Team-Farbe,
          nur sichtbar wenn Team aktiv. Sehr subtil (~8% alpha), damit
          es nicht mit Kategorie-BG kollidiert. */}
      {teamTintColor && (
        <div aria-hidden style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1,
          background: `radial-gradient(ellipse at 50% 50%, ${teamTintColor}14 0%, transparent 55%)`,
          transition: 'opacity 0.7s ease',
        }} />
      )}

      {/* Grain overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9990,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        opacity: 0.04, mixBlendMode: 'overlay',
      }} />

      {activeTemplate ? (
        /* Custom template: render only Fireflies + CustomSlide (no overlayOnly — ph_* positions apply) */
        <>
          <Fireflies />
          <div style={{ position: 'absolute', inset: 0 }}>
            <CustomSlide template={activeTemplate} state={s} />
          </div>
          {/* Placement flash overlay for custom template mode */}
          {placementFlash && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
              <PlacementView key={`flash-${s.questionIndex}`} state={placementFlash.state} flashCell={placementFlash.cell} use3D={use3D} enable3DTransition={s.enable3DTransition} />
            </div>
          )}
        </>
      ) : (
        /* No template: built-in views, wrapped in transition container */
        <div
          key={phaseGroup}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
            animation: 'qqSlideIn 420ms cubic-bezier(0.34,1.2,0.64,1) both',
            willChange: 'transform, opacity, filter',
          }}
        >
          {/* Während Countdown: renderState ist Snapshot der vorherigen Phase
              (PausedView / RulesView bleiben sichtbar und gefreezed). Nach
              Countdown schwenkt automatisch zum Live-State. */}
          {renderState.phase === 'LOBBY' && !renderState.setupDone && <PausedView state={renderState} mode="preGame" />}
          {renderState.phase === 'LOBBY' && renderState.setupDone  && <LobbyView state={renderState} />}
          {renderState.phase === 'RULES'           && <RulesView state={renderState} />}
          {renderState.phase === 'TEAMS_REVEAL'    && <TeamsRevealView state={renderState} />}
          {renderState.phase === 'PHASE_INTRO'     && <PhaseIntroView state={renderState} />}
          {(renderState.phase === 'QUESTION_ACTIVE' || renderState.phase === 'QUESTION_REVEAL') && !placementFlash && (
            <QuestionView key={renderState.currentQuestion?.id} state={renderState} revealed={renderState.phase !== 'QUESTION_ACTIVE'} hideCutouts={false} />
          )}
          {renderState.phase === 'PLACEMENT'       && <PlacementView key={`place-${renderState.questionIndex}`} state={renderState} use3D={use3D} enable3DTransition={renderState.enable3DTransition} />}
          {/* Placement flash: briefly show PlacementView with highlighted cell after placing */}
          {placementFlash && (
            <PlacementView key={`flash-${s.questionIndex}`} state={placementFlash.state} flashCell={placementFlash.cell} use3D={use3D} enable3DTransition={s.enable3DTransition} />
          )}
          {renderState.phase === 'COMEBACK_CHOICE' && <ComebackView state={renderState} />}
          {renderState.phase === 'CONNECTIONS_4X4' && <ConnectionsBeamerView state={renderState} />}
          {renderState.phase === 'PAUSED'          && <PausedView state={renderState} />}
          {renderState.phase === 'GAME_OVER'       && <GameOverView state={renderState} roomCode={roomCode} />}
          {renderState.phase === 'THANKS'          && <ThanksView state={renderState} roomCode={roomCode} />}
        </div>
      )}

      {/* Willkommens-Overlay (rulesSlideIndex === -2). Crossfade raus beim
          Übergang zum Regel-Intro. */}
      <QuizIntroOverlay language={s.language} visible={welcomeActive} />
      {/* Regel-Intro-Overlay (rulesSlideIndex === -1). Crossfade zwischen
          Willkommen und erster Regel-Folie. */}
      <RulesIntroOverlay language={s.language} visible={rulesIntroActive} />

      {/* C3 Timer-Urgency-Vignette: pulsierender roter Screen-Rand bei <=5s,
          zusaetzlich zum bestehenden Timer-Pill-Shake. */}
      {timerUrgent && (
        <div aria-hidden style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9990,
          animation: 'timerVignettePulse 0.8s ease-in-out infinite',
        }} />
      )}

      {/* G1/H1/H2 Toast-Overlays entfernt (User-Feedback): wirkten nebenbei,
          Phase-Wechsel ist ohnehin visuell klar. Perfect-Round-Info bleibt
          via roundCorrectsRef gespeichert — kann spaeter in PhaseIntro
          oder Summary als Badge eingebaut werden wenn gewuenscht. */}

      {/* Get-Ready-Countdown — 3-2-1 Vor Quiz-Start oder nach Pause-Resume.
          User-Wunsch 2026-04-28: Spielern kurz Zeit geben Handys zu greifen
          / Aufmerksamkeit zu sammeln statt direkt in die nächste Frage zu
          springen. CSS-only countdown via 3 Spans + Timing — kein JS-Tick
          nötig, das Overlay verschwindet komplett nach 3.2s. */}
      {getReady && (
        <div
          key={getReady.id}
          aria-hidden
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 18,
            background: 'radial-gradient(ellipse at center, rgba(13,10,6,0.92) 0%, rgba(13,10,6,0.78) 60%, rgba(13,10,6,0.55) 100%)',
            backdropFilter: 'blur(14px) saturate(1.1)',
            WebkitBackdropFilter: 'blur(14px) saturate(1.1)',
            pointerEvents: 'none',
            animation: 'qqGetReadyOverlay 3.2s ease both',
          }}
        >
          <div style={{
            fontFamily: fontFam,
            fontSize: 'clamp(18px, 1.8vw, 26px)', fontWeight: 900,
            color: '#FBBF24', letterSpacing: '0.32em', textTransform: 'uppercase',
            textShadow: '0 0 18px rgba(251,191,36,0.6)',
            animation: 'qqGetReadyEyebrow 0.6s ease 0.1s both',
          }}>
            {getReady.reason === 'start'
              ? (s.language === 'en' ? '🐺 Get ready' : '🐺 Macht euch bereit')
              : (s.language === 'en' ? '🐺 Back in' : '🐺 Weiter geht\'s in')}
          </div>
          <div style={{
            position: 'relative',
            width: 'clamp(180px, 22vw, 320px)',
            height: 'clamp(180px, 22vw, 320px)',
          }}>
            {[3, 2, 1].map((n, i) => (
              <div key={n} style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: fontFam,
                fontSize: 'clamp(140px, 18vw, 240px)', fontWeight: 900, lineHeight: 1,
                color: '#FFEFC9',
                textShadow:
                  '0 0 24px rgba(251,191,36,0.8), ' +
                  '0 0 60px rgba(251,191,36,0.5), ' +
                  '0 0 120px rgba(251,191,36,0.3), ' +
                  '0 6px 0 rgba(0,0,0,0.5), ' +
                  '0 18px 32px rgba(0,0,0,0.6)',
                animation: `qqGetReadyCount 1s cubic-bezier(0.34,1.56,0.64,1) ${0.25 + i * 0.95}s both`,
                opacity: 0,
              }}>
                {n}
              </div>
            ))}
          </div>
          <div style={{
            fontFamily: fontFam,
            fontSize: 'clamp(20px, 2.2vw, 32px)', fontWeight: 800,
            color: '#cbd5e1', letterSpacing: '0.04em',
            animation: 'qqGetReadyEyebrow 0.6s ease 0.3s both',
          }}>
            {getReady.reason === 'start'
              ? (s.language === 'en' ? 'First round starts!' : 'Runde 1 startet!')
              : (s.language === 'en' ? 'We\'re back!' : 'Es geht weiter!')}
          </div>
        </div>
      )}

      {/* Soft-Zoom transition overlay — sanfter Blur/Scale-Puls zwischen Slides */}
      {flashKey > 0 && (
        <div
          key={flashKey}
          style={{
            position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9995,
            overflow: 'hidden',
          }}
        >
          {/* Dezenter Dim als Tiefen-Anker */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.06) 65%, transparent 100%)',
            animation: 'qqFlashDim 520ms ease-out both',
          }} />
          {/* Soft-Zoom: heller Blur-Schleier pulst kurz auf */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.08) 45%, transparent 75%)',
            animation: 'qqSoftZoom 520ms cubic-bezier(0.4,0,0.2,1) both',
            transformOrigin: 'center center',
          }} />
        </div>
      )}
    </div>
  );
}

// ─── Template type resolver ────────────────────────────────────────────────────
function resolveTemplateType(s: QQStateUpdate): import('../../../shared/quarterQuizTypes').QQSlideTemplateType | null {
  switch (s.phase) {
    case 'LOBBY':           return 'LOBBY';
    case 'PHASE_INTRO': {
      const idx = s.gamePhaseIndex as number;
      if (idx === 1) return 'PHASE_INTRO_1';
      if (idx === 2) return 'PHASE_INTRO_2';
      return 'PHASE_INTRO_3';
    }
    case 'QUESTION_ACTIVE':
    case 'QUESTION_REVEAL': {
      const cat = s.currentQuestion?.category;
      if (cat === 'SCHAETZCHEN')   return 'QUESTION_SCHAETZCHEN';
      if (cat === 'MUCHO')         return 'QUESTION_MUCHO';
      if (cat === 'BUNTE_TUETE') {
        // Sub-Mechaniken mit eigenen dedizierten Beamer-Views (OnlyConnect,
        // Bluff, HotPotato, Top5, Order, Map, Imposter) NICHT durch Custom-
        // Template überschreiben — sonst rendert nur ein leerer BG mit
        // Fireflies (Template kennt keine ph_-Slots für diese Layouts).
        const kind = s.currentQuestion?.bunteTuete?.kind;
        const hasDedicatedView = kind === 'onlyConnect' || kind === 'bluff'
          || kind === 'hotPotato' || kind === 'top5' || kind === 'order'
          || kind === 'map' || kind === 'oneOfEight';
        return hasDedicatedView ? null : 'QUESTION_BUNTE_TUETE';
      }
      if (cat === 'ZEHN_VON_ZEHN') return 'QUESTION_ZEHN';
      if (cat === 'CHEESE')        return 'QUESTION_CHEESE';
      return null;
    }
    case 'PLACEMENT':       return 'PLACEMENT';
    case 'COMEBACK_CHOICE': return 'COMEBACK_CHOICE';
    case 'GAME_OVER':       return 'GAME_OVER';
    default:                return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOT POTATO BEAMER VIEW — active team, per-turn timer, used answers
// ═══════════════════════════════════════════════════════════════════════════════

function HotPotatoBeamerView({ state: s, lang, revealed }: {
  state: any; lang: 'de' | 'en'; revealed: boolean;
}) {
  // Live countdown for per-turn timer
  const [remaining, setRemaining] = useState<number | null>(() =>
    s.hotPotatoTurnEndsAt ? Math.max(0, Math.ceil((s.hotPotatoTurnEndsAt - Date.now()) / 1000)) : null
  );
  useEffect(() => {
    if (!s.hotPotatoTurnEndsAt) { setRemaining(null); return; }
    const tick = () => setRemaining(Math.max(0, Math.ceil((s.hotPotatoTurnEndsAt! - Date.now()) / 1000)));
    tick();
    const iv = setInterval(tick, 200);
    return () => clearInterval(iv);
  }, [s.hotPotatoTurnEndsAt]);

  // C1 Track new eliminations — dramatisches Ausscheide-Moment (Shake-Red +
  // Kartoffel-Drop + fade-to-grey). Ein Team gleichzeitig ist normal, bei
  // Last-Team-Wins koennen am Ende auch 2+ fast simultan eliminiert werden.
  const prevElimRef = useRef<string[]>([]);
  const [justEliminated, setJustEliminated] = useState<Set<string>>(new Set());
  useEffect(() => {
    const cur: string[] = s.hotPotatoEliminated ?? [];
    const prev = prevElimRef.current;
    const newOnes = cur.filter(id => !prev.includes(id));
    prevElimRef.current = cur;
    if (newOnes.length > 0) {
      setJustEliminated(new Set(newOnes));
      setTimeout(() => setJustEliminated(new Set()), 1400);
    }
  }, [s.hotPotatoEliminated]);

  const activeTeam = s.teams.find((t: any) => t.id === s.hotPotatoActiveTeamId);
  const urgent = remaining !== null && remaining <= 5;
  const used: string[] = s.hotPotatoUsedAnswers ?? [];

  if (revealed) return null;

  return (
    <div style={{
      position: 'absolute', bottom: 16, left: 0, right: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      pointerEvents: 'none',
    }}>
      {/* Used answers list — prominent über dem Active-Team-Pill */}
      {used.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10,
          maxWidth: 'min(94vw, 1500px)',
        }}>
          {used.map((a, i) => (
            <div key={`${a}-${i}`} style={{
              padding: 'clamp(8px, 1vh, 14px) clamp(16px, 1.6vw, 26px)',
              borderRadius: 999,
              background: 'linear-gradient(135deg, rgba(34,197,94,0.22), rgba(22,163,74,0.10))',
              border: '2px solid rgba(34,197,94,0.55)',
              boxShadow: '0 4px 14px rgba(34,197,94,0.18)',
              color: '#86efac', fontSize: 'clamp(20px, 2.2vw, 32px)', fontWeight: 800,
              letterSpacing: 0.2,
              animation: 'contentReveal 0.4s ease both',
            }}>
              {a}
            </div>
          ))}
        </div>
      )}

      {/* Active team pill + turn timer */}
      {activeTeam ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '10px 22px', borderRadius: 999,
          background: `linear-gradient(135deg, ${activeTeam.color}33, ${activeTeam.color}11)`,
          border: `2px solid ${activeTeam.color}`,
          boxShadow: `0 0 32px ${activeTeam.color}55`,
          animation: 'tcpulse 1.4s ease-in-out infinite',
        }}>
          <QQTeamAvatar avatarId={activeTeam.avatarId} size={36} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: '#94a3b8' }}>
              <QQEmojiIcon emoji="🥔"/> {lang === 'en' ? 'Hot Potato' : 'Heiße Kartoffel'}
            </span>
            <span title={activeTeam.name} style={{ fontSize: 'clamp(22px, 2.6vw, 34px)', fontWeight: 900, color: activeTeam.color }}>
              {truncName(activeTeam.name, 18)} {lang === 'en' ? 'is up!' : 'ist dran!'}
            </span>
          </div>
          {remaining !== null && (
            <div style={{
              marginLeft: 8, padding: '6px 16px', borderRadius: 999,
              background: urgent ? 'rgba(239,68,68,0.25)' : 'rgba(15,23,42,0.5)',
              border: `2px solid ${urgent ? '#EF4444' : '#475569'}`,
              color: urgent ? '#fca5a5' : '#e2e8f0',
              fontSize: 'clamp(20px, 2.4vw, 30px)', fontWeight: 900,
              minWidth: 68, textAlign: 'center',
              animation: urgent ? 'tcpulse 0.5s ease infinite alternate' : 'none',
            }}>
              ⏱ {remaining}s
            </div>
          )}
        </div>
      ) : (
        <div style={{
          padding: '8px 18px', borderRadius: 999,
          background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.25)',
          color: '#94a3b8', fontSize: 15, fontWeight: 700,
        }}>
          <QQEmojiIcon emoji="🥔"/> {lang === 'en' ? 'Waiting for start…' : 'Bereit für Start…'}
        </div>
      )}

      {/* Eliminated teams. Frisch eliminierte Teams:
          C1 Shake-Red + Kartoffel-Drop 🥔 + fade-to-grey. */}
      {s.hotPotatoEliminated && s.hotPotatoEliminated.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap',
          gap: 'clamp(10px, 1.4vw, 18px)',
          fontSize: 'clamp(18px, 2vw, 28px)', color: '#94a3b8', fontWeight: 800,
        }}>
          <span style={{ fontSize: 'clamp(20px, 2.2vw, 30px)' }}>
            <QQEmojiIcon emoji="❌"/> {lang === 'en' ? 'Out:' : 'Raus:'}
          </span>
          {s.hotPotatoEliminated.map((id: string) => {
            const t = s.teams.find((tm: any) => tm.id === id);
            if (!t) return null;
            const fresh = justEliminated.has(id);
            return (
              <span key={id} style={{
                color: t.color, opacity: fresh ? 1 : 0.75,
                display: 'inline-flex', alignItems: 'center', gap: 8,
                position: 'relative',
                animation: fresh ? 'hpEliminate 1.2s ease-out both' : undefined,
              }}>
                <QQTeamAvatar avatarId={t.avatarId} size={'clamp(28px, 3vw, 42px)'} />
                <span style={{ fontSize: 'clamp(16px, 1.8vw, 24px)' }}>{t.name}</span>
                {fresh && (
                  <span aria-hidden style={{
                    position: 'absolute', top: -32, left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: 36, lineHeight: 1, pointerEvents: 'none',
                    filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.7))',
                    animation: 'hpPotatoDrop 1.3s cubic-bezier(0.4,1.4,0.6,1) both',
                    zIndex: 5,
                  }}><QQEmojiIcon emoji="🥔"/></span>
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFETTI OVERLAY
// ═══════════════════════════════════════════════════════════════════════════════

const CONFETTI_COLORS = ['#F59E0B', '#EF4444', '#3B82F6', '#22C55E', '#A78BFA', '#F472B6', '#FCD34D', '#34D399'];
const CONFETTI_COUNT = 50;

function ConfettiOverlay() {
  const [particles] = useState(() =>
    Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 0.8,
      duration: 1.8 + Math.random() * 1.4,
      size: 6 + Math.random() * 6,
      rotation: 360 + Math.random() * 720,
      startY: -(20 + Math.random() * 60),
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    }))
  );

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50, overflow: 'hidden' }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.x}%`,
          width: p.shape === 'rect' ? p.size : p.size * 0.8,
          height: p.shape === 'rect' ? p.size * 0.6 : p.size * 0.8,
          borderRadius: p.shape === 'circle' ? '50%' : 2,
          background: p.color,
          ['--cy' as string]: `${p.startY}px`,
          ['--cr' as string]: `${p.rotation}deg`,
          animation: `confettiFall ${p.duration}s ease-in ${p.delay}s both`,
        }} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULES PRESENTATION
// ═══════════════════════════════════════════════════════════════════════════════

type AbilityBadge = {
  /** PNG-Slug aus QQIcon, falls vorhanden — sonst nur Emoji. */
  slug?: 'marker-shield' | 'marker-sanduhr' | 'marker-swap';
  emoji: string;
  label: string;
  accent: string;
};
type RulesSlide = {
  icon: string;
  title: string;
  color: string;
  lines: string[];
  extra?: string;
  /** Mini grid example: 2D array — 'A' = team A, 'B' = team B, '⭐' = joker star, '🏯' = stacked, null = empty */
  grid?: { cells: (string | null)[][]; colorA: string; colorB: string; label?: string };
  /** Rendert stattdessen den Fortschrittsbaum (Phasen + Fragen-Punkte). */
  showTree?: boolean;
  /** Eigene Folie: Tree riesig + Phasen-Sweep-Animation (Roadmap-Vorstellung). */
  treeShowcase?: boolean;
  /** Zeigt Ability-Badges (Bann, Schild, Tauschen, Stapeln) als Icon-Strip unter den Lines. */
  abilities?: AbilityBadge[];
};

function buildRulesSlidesDe(totalPhases: 3 | 4): RulesSlide[] {
  const abilityLines = totalPhases === 3
    ? [
        'Runde 2: Klauen freigeschaltet',
        'Runde 3: Stapeln — sichert euer Feld dauerhaft + 1 Bonus-Punkt',
      ]
    : [
        'Runde 2: Klauen freigeschaltet',
        'Runde 3: Stapeln — Feld dauerhaft sichern + 1 Bonus-Punkt',
        'Runde 4: alles bleibt — letzte Quiz-Runde',
      ];
  return [
    {
      icon: '🏆',
      title: 'Das Ziel',
      color: '#3B82F6',
      lines: [
        'Größtes zusammenhängendes Gebiet gewinnt',
      ],
    },
    {
      icon: '⚡',
      title: 'So läuft\'s',
      color: '#8B5CF6',
      lines: [
        `${totalPhases} Runden · 5 Kategorien`,
        'Richtige Antwort → Feld setzen',
        'Tempo entscheidet bei Gleichstand',
      ],
    },
    {
      icon: '🗺',
      title: 'Dein Weg durchs Quiz',
      color: '#FBBF24',
      lines: [],
      treeShowcase: true,
    },
    {
      // Joker explizit eigene Folie mit Mini-Grid-Beispiel.
      icon: '⭐',
      title: 'Joker-Bonus',
      color: '#FBBF24',
      lines: [
        '2×2-Block oder 4 in einer Reihe = 1 Bonus-Feld',
        'Max. 2 Joker pro Team',
      ],
      grid: {
        cells: [
          ['A', 'A', null, 'A'],
          ['A', 'A', null, 'A'],
          [null, null, null, 'A'],
          [null, null, null, 'A'],
        ],
        colorA: '#3B82F6', colorB: '#EF4444',
        label: 'Beide Muster zählen',
      },
    },
    {
      icon: '🔓',
      title: 'Neue Fähigkeiten',
      color: '#F59E0B',
      lines: abilityLines,
      abilities: [
        { emoji: '⚡', label: 'Klauen',  accent: '#EF4444' },
        { emoji: '🏯', label: 'Stapeln', accent: '#06B6D4' },
      ],
    },
    {
      icon: '🎁',
      title: 'Bunte Tüte',
      color: '#EF4444',
      lines: [
        'Eine Kategorie pro Runde ist eine Überraschung',
        '4 gewinnt · Bluff · Hot Potato · Top 5 · Reihenfolge · CozyGuessr',
      ],
      extra: 'Regeln werden vor jeder Frage kurz erklärt',
    },
    {
      icon: '🔄',
      title: 'Comeback',
      color: '#10B981',
      lines: [
        'Letztes Team holt vor dem Finale auf',
        '„Mehr oder Weniger?" — Treffer klaut Feld vom 1. Platz',
      ],
    },
    {
      icon: '🧩',
      title: 'Großes Finale',
      color: '#A78BFA',
      lines: [
        '16 Begriffe · 4 Gruppen finden',
        'Pro Gruppe = 1 Aktion auf dem Spielfeld',
      ],
      extra: '🏆 Größtes Gebiet danach gewinnt',
    },
  ];
}

function buildRulesSlidesEn(totalPhases: 3 | 4): RulesSlide[] {
  const abilityLines = totalPhases === 3
    ? [
        'Round 2: Steal unlocked',
        'Round 3: Stack — lock your tile + 1 bonus pt',
      ]
    : [
        'Round 2: Steal unlocked',
        'Round 3: Stack — lock your tile + 1 bonus pt',
        'Round 4: everything stays — last quiz round',
      ];
  return [
    {
      icon: '🏆',
      title: 'The Goal',
      color: '#3B82F6',
      lines: [
        'Largest connected area wins',
      ],
    },
    {
      icon: '⚡',
      title: 'How It Works',
      color: '#8B5CF6',
      lines: [
        `${totalPhases} rounds · 5 categories`,
        'Right answer → place a cell',
        'Speed decides ties',
      ],
    },
    {
      icon: '🗺',
      title: 'Your Quiz Roadmap',
      color: '#FBBF24',
      lines: [],
      treeShowcase: true,
    },
    {
      icon: '⭐',
      title: 'Joker Bonus',
      color: '#FBBF24',
      lines: [
        '2×2 block or 4 in a row = 1 bonus tile',
        'Max 2 jokers per team',
      ],
      grid: {
        cells: [
          ['A', 'A', null, 'A'],
          ['A', 'A', null, 'A'],
          [null, null, null, 'A'],
          [null, null, null, 'A'],
        ],
        colorA: '#3B82F6', colorB: '#EF4444',
        label: 'Both patterns count',
      },
    },
    {
      icon: '🔓',
      title: 'New Abilities',
      color: '#F59E0B',
      lines: abilityLines,
      abilities: [
        { emoji: '⚡', label: 'Steal', accent: '#EF4444' },
        { emoji: '🏯', label: 'Stack', accent: '#06B6D4' },
      ],
    },
    {
      icon: '🎁',
      title: 'Lucky Bag',
      color: '#EF4444',
      lines: [
        'One category per round is a surprise',
        'Connect 4 · Bluff · Hot Potato · Top 5 · Order · CozyGuessr',
      ],
      extra: 'Rules explained before each question',
    },
    {
      icon: '🔄',
      title: 'Comeback',
      color: '#10B981',
      lines: [
        'Last-place team catches up before the finale',
        '"Higher or Lower?" — each hit steals from the leader',
      ],
    },
    {
      icon: '🧩',
      title: 'Grand Finale',
      color: '#A78BFA',
      lines: [
        '16 terms · find 4 hidden groups',
        'Each group = 1 action on the board',
      ],
      extra: '🏆 Largest area after wins',
    },
  ];
}

/** Mini grid example for rules slides */
function RulesMiniGrid({ grid, slideColor }: { grid: NonNullable<RulesSlide['grid']>; slideColor: string }) {
  const rows = grid.cells.length;
  const cols = grid.cells[0].length;
  const cellSz = Math.min(84, Math.floor(340 / Math.max(rows, cols)));
  const gap = 5;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      animation: 'contentReveal 0.5s ease 0.35s both',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${cellSz}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellSz}px)`,
        gap,
      }}>
        {grid.cells.flatMap((row, r) => row.map((cell, c) => {
          const isTeamA = cell === 'A';
          const isStar = cell === '⭐';
          const isPin = cell === '🏯';
          const filled = isTeamA || isStar || isPin;
          const bg = isStar
            ? `linear-gradient(135deg, ${grid.colorA}cc, #F59E0Bcc)`
            : isPin
              ? `linear-gradient(135deg, ${grid.colorA}cc, #10B981cc)`
              : isTeamA
                ? `${grid.colorA}aa`
                : 'rgba(255,255,255,0.06)';
          return (
            <div key={`${r}-${c}`} style={{
              width: cellSz, height: cellSz,
              borderRadius: Math.max(4, cellSz * 0.18),
              background: bg,
              border: filled ? `2px solid ${isStar ? '#F59E0B' : isPin ? '#10B981' : grid.colorA}` : '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: cellSz * 0.5,
              boxShadow: filled ? `0 0 12px ${isStar ? '#F59E0B44' : isPin ? '#10B98144' : grid.colorA + '44'}` : 'none',
              animation: filled ? `gridCellIn 0.4s ease ${0.3 + (r * cols + c) * 0.06}s both` : undefined,
            }}>
              {isStar ? <QQEmojiIcon emoji="⭐"/> : isPin ? <QQEmojiIcon emoji="🏯"/> : ''}
            </div>
          );
        }))}
      </div>
      {grid.label && (
        <div style={{
          fontSize: 'clamp(18px,2.2vw,30px)', fontWeight: 800,
          color: slideColor, letterSpacing: '0.02em',
        }}>{grid.label}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AnimatedCozyWolf — 4-Posen-Sequenz (Augen auf/zu × Mund auf/zu).
// Idle-Blink + Mund-Flap waehrend gesprochen wird. Alle 4 PNGs werden auf
// Mount geladen und per opacity-Toggle umgeschaltet → kein Image-Reload-Flackern.
// ─────────────────────────────────────────────────────────────────────────────
function AnimatedCozyWolf({ widthCss, speaking }: { widthCss: string; speaking: boolean }) {
  const [eyesOpen, setEyesOpen] = useState(true);
  const [mouthOpen, setMouthOpen] = useState(false);

  // Idle-Blink: alle 3-5s einmal kurz die Augen zu (~130ms)
  useEffect(() => {
    let alive = true;
    let timer: number | undefined;
    const scheduleBlink = () => {
      timer = window.setTimeout(() => {
        if (!alive) return;
        setEyesOpen(false);
        timer = window.setTimeout(() => {
          if (!alive) return;
          setEyesOpen(true);
          scheduleBlink();
        }, 130);
      }, 3000 + Math.random() * 2200);
    };
    scheduleBlink();
    return () => { alive = false; if (timer) window.clearTimeout(timer); };
  }, []);

  // Mund-Flap: nur waehrend speaking. Sprechpausen alle ~2.5s fuer ~1.5s,
  // damit es nicht wie ein Maschinengewehr aussieht.
  useEffect(() => {
    if (!speaking) { setMouthOpen(false); return; }
    let alive = true;
    let timer: number | undefined;
    let phase: 'speak' | 'pause' = 'speak';
    let phaseUntil = Date.now() + 2200 + Math.random() * 1200;
    const tick = () => {
      if (!alive) return;
      const now = Date.now();
      if (now >= phaseUntil) {
        if (phase === 'speak') {
          phase = 'pause';
          setMouthOpen(false);
          phaseUntil = now + 1100 + Math.random() * 900;
          timer = window.setTimeout(tick, phaseUntil - now);
          return;
        } else {
          phase = 'speak';
          phaseUntil = now + 2000 + Math.random() * 1500;
        }
      }
      if (phase === 'speak') {
        setMouthOpen(m => !m);
        timer = window.setTimeout(tick, 200 + Math.random() * 80);
      } else {
        timer = window.setTimeout(tick, 200);
      }
    };
    tick();
    return () => { alive = false; if (timer) window.clearTimeout(timer); };
  }, [speaking]);

  const poses: Array<{ eyes: 'auf' | 'zu'; mouth: 'auf' | 'zu' }> = [
    { eyes: 'auf', mouth: 'zu' },
    { eyes: 'auf', mouth: 'auf' },
    { eyes: 'zu',  mouth: 'zu' },
    { eyes: 'zu',  mouth: 'auf' },
  ];

  return (
    <div style={{
      position: 'relative',
      width: widthCss,
      aspectRatio: '1 / 1',
      filter: 'drop-shadow(0 10px 30px rgba(251,191,36,0.45))',
      transformOrigin: 'bottom center',
      animation: 'qqIntroWolfBreathe 4.2s ease-in-out infinite',
    }}>
      {poses.map(p => {
        const visible = (p.eyes === 'auf') === eyesOpen && (p.mouth === 'auf') === mouthOpen;
        const file = `augen${p.eyes}.mund${p.mouth}.png`;
        return (
          <img
            key={file}
            src={`/avatars/cozywolf/${file}`}
            alt=""
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'contain',
              display: 'block',
              opacity: visible ? 1 : 0,
              pointerEvents: 'none',
            }}
          />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MuchoOptionsReveal — 2-Akt-Choreografie für MUCHO:
//   Akt 1 (moderator-gesteuert via revealStep): pro Klick poppen die Voter einer
//         nicht-leeren Option rein. Leere Options werden übersprungen — der
//         Backend-Handler „qq:muchoRevealStep" zählt nur Optionen mit ≥1 Voter.
//   Akt 2 (moderator-gesteuert, revealStep = nonEmpty+1): Doppelblink auf die
//         richtige Option → permanent grün + Speedrun-Highlight (⚡ Goldrand).
// ─────────────────────────────────────────────────────────────────────────────
function MuchoOptionsReveal({
  options, optionsEn, correctOptionIndex, optionImages, answers, teams, lang,
  cardBg, timerEndsAt, timerDurationSec, revealStep,
}: {
  options: string[];
  optionsEn?: string[];
  correctOptionIndex?: number;
  optionImages?: Array<QQOptionImage | null | undefined>;
  answers: Array<{ teamId: string; text: string; submittedAt: number }>;
  teams: Array<{ id: string; name: string; avatarId: string; color?: string }>;
  lang: 'de' | 'en';
  cardBg: string;
  timerEndsAt: number | null;
  timerDurationSec: number;
  revealStep: number;
}) {
  const N = options.length;
  // Nicht-leere Optionen in Reihenfolge (identisch zur Backend-Zählung).
  const nonEmptyOrdered = useMemo(() => {
    const res: number[] = [];
    for (let i = 0; i < N; i++) {
      if (answers.some(a => a.text === String(i))) res.push(i);
    }
    return res;
  }, [answers, N]);
  const akt1Max = nonEmptyOrdered.length;
  const lockStep = akt1Max + 1;
  const locked = revealStep >= lockStep && correctOptionIndex != null && N > 0;
  // Auto-Stagger ab 2026-04-26: Backend springt bei Klick 1 direkt auf akt1Max,
  // Frontend zaehlt intern hoch (auto-Reveal jeder Option im 750ms-Takt) damit
  // die Voter nacheinander einfliegen statt alle gleichzeitig.
  const [autoCap, setAutoCap] = useState(0);
  useEffect(() => {
    if (revealStep <= 0) {
      setAutoCap(0);
      return;
    }
    const target = Math.min(revealStep, akt1Max);
    if (autoCap >= target) return;
    const t = setTimeout(() => setAutoCap(prev => Math.min(prev + 1, target)), 750);
    return () => clearTimeout(t);
  }, [revealStep, autoCap, akt1Max]);
  const shownVoterSet = useMemo(() => {
    const cap = Math.min(autoCap, akt1Max);
    return new Set(nonEmptyOrdered.slice(0, cap));
  }, [autoCap, akt1Max, nonEmptyOrdered]);

  const showLock = locked;
  const akt3On = locked;
  const MUCHO_COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#22C55E'];
  const muchoLabels = ['A', 'B', 'C', 'D'];

  // Waehrend QUESTION_ACTIVE (revealStep=0): kompaktes Layout, keine Luecken
  // zwischen A/B und C/D. Erst wenn Voter-Avatare einfliegen (revealStep>=1)
  // ziehen die Rows smooth auseinander, damit die Chips Platz unter der Card
  // bekommen ohne die naechste Card zu verdecken.
  const expandedLayout = revealStep >= 1;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      columnGap: 18,
      rowGap: expandedLayout ? 'clamp(80px, 10vh, 120px)' : 18,
      paddingBottom: expandedLayout ? 'clamp(70px, 8.5vh, 110px)' : 0,
      marginBottom: 'clamp(14px, 1.8vh, 28px)',
      width: '100%', maxWidth: 1400,
      animation: 'contentReveal 0.35s ease 0.1s both',
      transition: 'row-gap 0.6s cubic-bezier(0.34,1.4,0.64,1), padding-bottom 0.6s cubic-bezier(0.34,1.4,0.64,1), margin-bottom 0.6s ease',
    }}>
      {options.map((opt, i) => {
        const optImg = optionImages?.[i];
        const isCorrect = showLock && i === correctOptionIndex;
        const isWrong = showLock && i !== correctOptionIndex;
        const optColor = MUCHO_COLORS[i] ?? '#64748B';
        const optText = lang === 'en' && optionsEn?.[i] ? optionsEn[i] : opt;
        const voterShow = shownVoterSet.has(i);
        // Voter pro Option vorberechnen — wir brauchen sie ausserhalb der Card
        const voters = answers
          .filter(a => a.text === String(i))
          .sort((a, b) => a.submittedAt - b.submittedAt)
          .map(a => {
            const team = teams.find(t => t.id === a.teamId);
            return team ? { team, submittedAt: a.submittedAt } : null;
          })
          .filter((x): x is { team: NonNullable<ReturnType<typeof teams.find>>; submittedAt: number } => !!x);
        const t0 = timerEndsAt && timerDurationSec
          ? timerEndsAt - timerDurationSec * 1000
          : voters[0]?.submittedAt;
        return (
          // Wrapper: Card oben, Avatar-Reihe absolut darunter (sitzt auf der unteren Card-Linie)
          <div key={i} style={{ position: 'relative' }}>
            <div style={{
              position: 'relative', overflow: 'hidden',
              borderRadius: 20, padding: '24px 28px',
              background: isCorrect ? 'rgba(34,197,94,0.22)' : cardBg,
              border: isCorrect ? '3px solid #22C55E'
                : isWrong ? '2px solid rgba(255,255,255,0.06)'
                : `2px solid ${optColor}55`,
              boxShadow: isCorrect ? '0 0 44px rgba(34,197,94,0.48), 0 0 90px rgba(34,197,94,0.18)'
                : '0 4px 16px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', gap: 16,
              transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
              animation: isCorrect
                ? 'revealDoubleBlink 1.1s ease both, revealCorrectPop 0.6s cubic-bezier(0.34,1.4,0.64,1) both'
                : isWrong
                  ? 'revealWrongDim 0.5s ease 0.1s both'
                  : undefined,
            }}>
              {optImg?.url && (
                <img src={optImg.url} alt="" style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: optImg.fit ?? 'cover', opacity: optImg.opacity ?? 0.4,
                  pointerEvents: 'none',
                }} />
              )}
              {optImg?.url && (
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 100%)', pointerEvents: 'none' }} />
              )}
              <div style={{
                position: 'relative', zIndex: 1,
                width: 56, height: 56, borderRadius: 16,
                background: isCorrect ? '#22C55E' : isWrong ? '#374151' : optColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isCorrect ? 32 : 28, fontWeight: 900, color: '#fff', flexShrink: 0,
                boxShadow: isCorrect
                  ? '0 0 16px rgba(34,197,94,0.6)'
                  : `0 2px 8px ${optColor}44`,
                transition: 'background 0.3s ease, box-shadow 0.3s ease',
              }}>{muchoLabels[i]}</div>
              <div style={{
                position: 'relative', zIndex: 1,
                flex: 1, minWidth: 0,
                fontSize: 'clamp(26px, 3.2vw, 44px)', fontWeight: 800,
                color: isWrong ? '#475569' : '#F1F5F9', lineHeight: 1.3,
                textShadow: optImg?.url ? '0 2px 8px rgba(0,0,0,0.8)' : 'none',
                transition: 'color 0.3s ease',
              }}>{optText}</div>
            </div>
            {/* Voter-Reihe: haengt unter der Card (Avatare 80% rausragend, nur
                der obere Top-Edge scrapt die Card-Unterkante) damit der
                Antwort-Text nicht verdeckt wird. Zeit-Pill direkt unter dem
                Avatar-Kreis. justifyContent:center damit einzelne Avatare
                unter der Card zentriert stehen. */}
            {voterShow && voters.length > 0 && (
              <div style={{
                position: 'absolute', left: 8, right: 8, bottom: 0,
                transform: 'translateY(80%)',
                display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start',
                justifyContent: 'center',
                gap: voters.length > 4 ? 6 : 10,
                pointerEvents: 'none', zIndex: 5,
              }}>
                {voters.map((v, vi) => {
                  const tm = v.team;
                  const timeSec = t0 ? Math.max(0, (v.submittedAt - t0) / 1000) : null;
                  const isFastest = akt3On && isCorrect && vi === 0;
                  const voterDelay = vi * 0.18;
                  // Viele Voter (>4) = etwas kleinere Avatare, damit sie in eine Reihe passen
                  const many = voters.length > 4;
                  const avatarSz = isFastest
                    ? (many ? 'clamp(56px, 6vw, 80px)' : 'clamp(64px, 7vw, 92px)')
                    : (many ? 'clamp(44px, 4.8vw, 64px)' : 'clamp(52px, 5.6vw, 76px)');
                  // Wrong-Option-Voter: dezent dimmen (Grayscale + Opacity) →
                  // signalisiert visuell „haben falsch geraten".
                  const dim = isWrong;
                  return (
                    <div key={tm.id} style={{
                      position: 'relative',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      animation: `muchoVoterDrop 0.55s cubic-bezier(0.34,1.5,0.64,1) ${voterDelay}s both`,
                      opacity: dim ? 0.55 : 1,
                      filter: dim ? 'grayscale(0.6)' : 'none',
                      transition: 'opacity 0.4s ease, filter 0.4s ease',
                    }}>
                      <div title={tm.name} style={{ position: 'relative', display: 'inline-block' }}>
                        <QQTeamAvatar
                          avatarId={tm.avatarId}
                          size={avatarSz}
                          style={{
                            // Kein Doppel-Rand mehr: das Avatar-Artwork hat eh
                            // einen farbigen Kapuzen-/Kreis-Rim. Nur der schnellste
                            // Voter bekommt den Gold-Ring als Winner-Indikator.
                            border: isFastest ? '4px solid #FBBF24' : 'none',
                            boxShadow: isFastest
                              ? '0 0 22px rgba(251,191,36,0.6), 0 6px 14px rgba(0,0,0,0.55)'
                              : `0 6px 14px rgba(0,0,0,0.55), 0 0 10px ${tm.color}55`,
                            background: '#0d0a06',
                          }}
                        />
                        {isFastest && (
                          <SpeedBoltMarker top={-12} right={-8} />
                        )}
                        {/* Zeit-Pill: direkt unter dem Kreis, zentriert, leicht ueberlappend */}
                        {timeSec != null && isCorrect && akt3On && (
                          <span style={{
                            position: 'absolute',
                            left: '50%', bottom: -8,
                            transform: 'translate(-50%, 50%)',
                            padding: '2px 9px', borderRadius: 999,
                            background: isFastest ? 'rgba(251,191,36,0.95)' : 'rgba(15,23,42,0.95)',
                            border: isFastest ? '1.5px solid rgba(251,191,36,1)' : `1.5px solid ${tm.color}`,
                            color: isFastest ? '#0d0a06' : '#e2e8f0',
                            fontWeight: 900,
                            fontSize: 'clamp(11px, 1.2vw, 15px)',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                            lineHeight: 1.1,
                          }}>
                            {timeSec.toFixed(1)}s
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QuizIntroOverlay — epische Begrüßungs-Folie "Willkommen beim BLOCK QUIZ
// / QUARTER QUIZ by cozywolf". Spielt einmal pro Session beim ersten Wechsel
// in RULES-Phase und blendet dann in die Rules-Ansicht über.
// ─────────────────────────────────────────────────────────────────────────────
function QuizIntroOverlay({ language, visible }: { language: QQLanguage; visible: boolean }) {
  const lang = useLangFlip(language);
  const title = 'CozyQuiz';
  const welcome = lang === 'en' ? 'Welcome to' : 'Willkommen beim';
  const greeting = lang === 'en'
    ? 'Get comfy — here we go!'
    : 'Macht\'s euch bequem – gleich geht\'s los!';
  // Keine Auto-Dismiss: Moderator steuert das Weiterschalten per "Weiter"-Button.
  // Elemente animieren einmalig ein und behalten dann sanfte Loop-Animationen,
  // damit die Folie nicht einfriert wenn der Moderator 30s wartet.
  // Fireflies deterministisch via index (kein Math.random → kein Re-Render-Springen).
  // Reduziert auf 6 + dezenter, damit's nicht nach Splash-Screen aussieht.
  const fireflies = Array.from({ length: 6 }, (_, i) => ({
    left: 12 + ((i * 79) % 76),
    top: 18 + ((i * 47) % 64),
    dur: 6 + (i % 3) * 0.8,
    delay: (i * 0.5) % 3,
    size: 3 + (i % 2),
  }));
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9990,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      // Slate-Hintergrund wie Rest des Quiz (kein warmer Goldgradient mehr)
      background: 'radial-gradient(ellipse at center, #0f172a 0%, #0a0f1c 55%, #050810 100%)',
      overflow: 'hidden',
      fontFamily: "'Nunito', system-ui, sans-serif",
      opacity: visible ? 1 : 0,
      transform: visible ? 'scale(1)' : 'scale(1.04)',
      transition: 'opacity 0.55s ease, transform 0.65s cubic-bezier(0.4,0,0.2,1)',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      {/* Ambient Glow — nur lokal um den Wolf-Bereich, dezent statt überdominant */}
      <div style={{
        position: 'absolute', left: '50%', top: '62%',
        width: '70vmin', height: '70vmin',
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(251,191,36,0.18) 0%, rgba(249,115,22,0.08) 38%, transparent 65%)',
        filter: 'blur(18px)',
        animation: 'qqIntroGlowPulse 6s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      {/* Entry-Sweep — einmal diagonal, dezenter */}
      <div style={{
        position: 'absolute', left: '-20%', top: 0, width: '40%', height: '100%',
        background: 'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)',
        animation: 'qqIntroSweep 2.6s ease-out 0.2s both',
        pointerEvents: 'none',
      }} />
      {/* Fireflies — wenige, dezent, weiterhin warm-golden als Marken-Akzent */}
      {fireflies.map((f, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${f.left}%`, top: `${f.top}%`,
          width: f.size, height: f.size, borderRadius: '50%',
          background: i % 2 ? '#fbbf24' : '#fde68a',
          boxShadow: '0 0 10px rgba(251,191,36,0.55), 0 0 2px rgba(255,255,255,0.4)',
          opacity: 0.65,
          animation: `qqIntroFireflyDrift ${f.dur}s ease-in-out ${f.delay}s infinite`,
          pointerEvents: 'none',
        }} />
      ))}
      {/* Content-Stack */}
      <div style={{
        position: 'relative', zIndex: 5,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 'clamp(8px, 1.2vh, 18px)',
        textAlign: 'center',
        padding: '0 6vw',
      }}>
        {/* Welcome label — kleiner, dezenter Akzent in Marken-Gold */}
        <div style={{
          fontSize: 'clamp(13px, 1.3vw, 20px)', fontWeight: 800,
          letterSpacing: '0.32em', textTransform: 'uppercase',
          color: '#fbbf24',
          opacity: 0.88,
          animation: 'qqIntroWelcome 0.9s cubic-bezier(0.2,0.8,0.4,1) 0.2s both',
        }}>{welcome}</div>
        {/* Title — Nunito weiss statt Goldgradient-Logo, mit feiner Akzentlinie drunter */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'clamp(8px, 1vh, 14px)',
          animation: 'qqIntroTitleIn 1.2s cubic-bezier(0.2,0.9,0.3,1.1) 0.5s both',
        }}>
          <div style={{
            fontSize: 'clamp(56px, 8vw, 130px)', fontWeight: 900,
            letterSpacing: '0.01em',
            lineHeight: 0.96,
            color: '#f8fafc',
            textShadow: '0 0 40px rgba(251,191,36,0.22), 0 4px 24px rgba(0,0,0,0.5)',
          }}>{title}</div>
          {/* Akzentlinie — Marken-Gold-Highlight unter dem Titel */}
          <div style={{
            width: 'clamp(60px, 7vw, 110px)', height: 3, borderRadius: 999,
            background: 'linear-gradient(90deg, transparent, #fbbf24 50%, transparent)',
            boxShadow: '0 0 12px rgba(251,191,36,0.5)',
            animation: 'qqIntroAccentIn 0.8s ease 1.0s both',
          }} />
        </div>
        {/* Wolf + Sprechblase — Wolf bleibt das Logo-Zentrum, Sprechblase im Cozy-Card-Stil */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 'clamp(12px, 1.8vw, 28px)',
          marginTop: 'clamp(12px, 1.6vh, 24px)',
          animation: 'qqIntroStackIn 0.9s cubic-bezier(0.2,0.9,0.3,1.1) 1.3s both',
        }}>
          <AnimatedCozyWolf widthCss="clamp(130px, 15vw, 220px)" speaking={visible} />

          <div style={{
            position: 'relative',
            padding: 'clamp(14px, 1.8vh, 24px) clamp(22px, 2.6vw, 38px)',
            borderRadius: 22,
            // Glassmorph-Card statt cremiger Comic-Bubble
            background: 'linear-gradient(180deg, rgba(15,23,42,0.78) 0%, rgba(11,16,28,0.78) 100%)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '2px solid rgba(251,191,36,0.55)',
            boxShadow: '0 10px 32px rgba(0,0,0,0.5), 0 0 0 3px rgba(251,191,36,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
            color: '#f1f5f9',
            fontSize: 'clamp(18px, 2vw, 30px)', fontWeight: 800,
            maxWidth: '60vw',
            lineHeight: 1.28,
            animation: 'qqIntroBubbleBob 5s ease-in-out infinite',
          }}>
            {/* Tail — zeigt nach links auf den Wolf, in Card-Farben */}
            <div style={{
              position: 'absolute', left: -13, top: '50%',
              width: 0, height: 0,
              transform: 'translateY(-50%)',
              borderTop: '11px solid transparent',
              borderBottom: '11px solid transparent',
              borderRight: '14px solid rgba(251,191,36,0.55)',
            }} />
            <div style={{
              position: 'absolute', left: -10, top: '50%',
              width: 0, height: 0,
              transform: 'translateY(-50%)',
              borderTop: '9px solid transparent',
              borderBottom: '9px solid transparent',
              borderRight: '12px solid rgba(15,23,42,0.85)',
            }} />
            {greeting}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes qqIntroGlowPulse {
          0%, 100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
          50%      { opacity: 1.0; transform: translate(-50%, -50%) scale(1.06); }
        }
        @keyframes qqIntroSweep {
          0%   { transform: translateX(0); opacity: 0; }
          30%  { opacity: 1; }
          100% { transform: translateX(360%); opacity: 0; }
        }
        @keyframes qqIntroFireflyDrift {
          0%, 100% { opacity: 0.35; transform: translate(0, 0) scale(0.9); }
          25%      { opacity: 1;    transform: translate(8px, -10px) scale(1.1); }
          50%      { opacity: 0.6;  transform: translate(-6px, -18px) scale(1); }
          75%      { opacity: 0.9;  transform: translate(10px, -8px) scale(1.05); }
        }
        @keyframes qqIntroWelcome {
          0%   { opacity: 0; transform: translateY(10px); letter-spacing: 0.5em; }
          100% { opacity: 1; transform: translateY(0);    letter-spacing: 0.32em; }
        }
        @keyframes qqIntroTitleIn {
          0%   { opacity: 0; transform: translateY(30px) scale(0.85); filter: blur(12px); }
          60%  { filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes qqIntroAccentIn {
          0%   { opacity: 0; transform: scaleX(0.2); }
          100% { opacity: 1; transform: scaleX(1); }
        }
        @keyframes qqIntroStackIn {
          0%   { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes qqIntroWolfBreathe {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50%      { transform: scale(1.03) rotate(-1deg); }
        }
        @keyframes qqIntroBubbleBob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

// ─── RulesIntroOverlay ──────────────────────────────────────────────────────
// Zwischen-Folie: "Jetzt kommen die Regeln — gut aufpassen!"
// Aktiv bei rulesSlideIndex === -1. Crossfade vom Willkommen rein, in die
// erste Regel-Folie raus. Kühlere Palette (blau/violett) als Kontrast zum
// warmen Welcome, damit der Übergang auch farblich spürbar ist.
function RulesIntroOverlay({ language, visible }: { language: QQLanguage; visible: boolean }) {
  const lang = useLangFlip(language);
  const headline = lang === 'en' ? 'Now the rules' : 'Jetzt kommen die Regeln';
  const sub = lang === 'en' ? 'Pay close attention!' : 'Gut aufpassen!';
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9988,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #102033 0%, #0a1424 55%, #050912 100%)',
      overflow: 'hidden',
      fontFamily: "'Nunito', system-ui, sans-serif",
      opacity: visible ? 1 : 0,
      transform: visible ? 'scale(1)' : 'scale(0.98)',
      transition: 'opacity 0.55s ease, transform 0.65s cubic-bezier(0.4,0,0.2,1)',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      {/* Hintergrund-Glow — kühles blau/violett */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        width: '140vmin', height: '140vmin',
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, rgba(139,92,246,0.14) 40%, transparent 65%)',
        filter: 'blur(10px)',
        animation: visible ? 'qqRulesIntroGlow 3.6s ease-out both' : 'none',
        pointerEvents: 'none',
      }} />
      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 5,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 'clamp(18px, 3vh, 36px)', textAlign: 'center', padding: '0 6vw',
      }}>
        <div style={{
          fontSize: 'clamp(72px, 9vw, 140px)', lineHeight: 1,
          animation: visible ? 'qqRulesIntroIcon 1.1s cubic-bezier(0.2,0.9,0.3,1.3) 0.2s both' : 'none',
          filter: 'drop-shadow(0 6px 24px rgba(139,92,246,0.55))',
        }}>📖</div>
        <div style={{
          fontSize: 'clamp(56px, 7.5vw, 120px)', fontWeight: 900,
          lineHeight: 1.05, letterSpacing: '-0.01em',
          background: 'linear-gradient(180deg, #fff 0%, #c7d2fe 45%, #a5b4fc 75%, #818cf8 100%)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 60px rgba(139,92,246,0.35)',
          animation: visible ? 'qqRulesIntroHeadline 0.9s cubic-bezier(0.2,0.9,0.3,1.1) 0.5s both' : 'none',
        }}>{headline}</div>
        <div style={{
          fontSize: 'clamp(28px, 3.2vw, 52px)', fontWeight: 700,
          letterSpacing: '0.08em',
          color: '#fbbf24',
          textShadow: '0 0 18px rgba(251,191,36,0.55), 0 2px 12px rgba(0,0,0,0.4)',
          animation: visible ? 'qqRulesIntroSub 0.8s cubic-bezier(0.2,0.8,0.4,1) 0.95s both' : 'none',
        }}>{sub}</div>
      </div>
      <style>{`
        @keyframes qqRulesIntroGlow {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          60% { opacity: 1; transform: translate(-50%, -50%) scale(1.0); }
          100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.08); }
        }
        @keyframes qqRulesIntroIcon {
          0% { opacity: 0; transform: translateY(18px) scale(0.6) rotate(-8deg); }
          65% { transform: translateY(-4px) scale(1.08) rotate(3deg); }
          100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
        }
        @keyframes qqRulesIntroHeadline {
          0% { opacity: 0; transform: translateY(24px) scale(0.92); filter: blur(8px); }
          55% { filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes qqRulesIntroSub {
          0% { opacity: 0; transform: translateY(10px); letter-spacing: 0.22em; }
          100% { opacity: 1; transform: translateY(0); letter-spacing: 0.08em; }
        }
      `}</style>
    </div>
  );
}

export function RulesView({ state: s }: { state: QQStateUpdate }) {
  const lang = useLangFlip(s.language);
  const totalPhases = (s.totalPhases ?? 4) as 3 | 4;
  const slides = lang === 'en' ? buildRulesSlidesEn(totalPhases) : buildRulesSlidesDe(totalPhases);
  const totalSlides = slides.length;
  const rawIdx = s.rulesSlideIndex ?? 0;
  // idx<0 = Overlay-Phase (Willkommen/Regel-Intro). Nichts rendern, damit der
  // Crossfade der Overlays nicht die erste Regel-Folie im Hintergrund zeigt.
  if (rawIdx < 0) return null;
  const idx = Math.max(0, Math.min(rawIdx, totalSlides - 1));
  const slide = slides[idx];
  const fontFam = s.theme?.fontFamily ? `'${s.theme.fontFamily}', 'Nunito', system-ui, sans-serif` : "'Nunito', system-ui, sans-serif";
  const isLast = idx === totalSlides - 1;
  const hasGrid = !!slide.grid;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', fontFamily: fontFam,
    }}>
      <Fireflies />

      {/* Main card — full-width for beamer readability */}
      <div key={idx} style={{
        position: 'relative', zIndex: 5,
        maxWidth: 1200, width: '94%', maxHeight: '92vh', overflow: 'hidden',
        background: 'rgba(15,12,9,0.85)',
        border: `2px solid ${slide.color}44`,
        borderRadius: 36,
        padding: `clamp(24px, 4vh, ${hasGrid ? 52 : 60}px) clamp(32px, 5vw, ${hasGrid ? 64 : 72}px)`,
        boxShadow: `0 0 120px ${slide.color}22, 0 16px 48px rgba(0,0,0,0.6)`,
        animation: 'phasePop 0.5s cubic-bezier(0.34,1.4,0.64,1) both',
        backdropFilter: 'blur(10px)',
      }}>
        {/* Icon + title — beides zentriert, Icon über Titel. Klassischer
            Stage-Look statt links-rechts-Layout. */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'clamp(8px, 1vh, 14px)', marginBottom: 'clamp(16px, 2.5vh, 28px)',
          textAlign: 'center',
        }}>
          <span style={{
            fontSize: 'clamp(64px,9vw,110px)', lineHeight: 1,
            filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))',
          }}><QQEmojiIcon emoji={slide.icon}/></span>
          <div style={{
            fontSize: 'clamp(13px,1.4vw,18px)', fontWeight: 800, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: `${slide.color}88`,
          }}>
            {lang === 'de' ? `Spielregeln` : `Game Rules`}
          </div>
          <div style={{
            fontSize: 'clamp(44px,7vw,88px)', fontWeight: 900, lineHeight: 1.05,
            color: slide.color,
            textShadow: `0 0 60px ${slide.color}44, 0 3px 0 rgba(0,0,0,0.3)`,
          }}>
            {slide.title}
          </div>
        </div>

        {/* Divider */}
        <div style={{
          width: '100%', height: 3, borderRadius: 2,
          background: `linear-gradient(90deg, ${slide.color}aa, ${slide.color}22, transparent)`,
          marginBottom: 'clamp(16px, 2.5vh, 32px)',
        }} />

        {/* Content: text left, grid right (if grid exists) */}
        <div style={{
          display: 'flex', gap: 'clamp(24px, 3vw, 48px)',
          alignItems: (slide.showTree || slide.treeShowcase) ? 'stretch' : 'center',
          flexDirection: (slide.showTree || slide.treeShowcase) ? 'column' : (hasGrid ? 'row' : 'column'),
        }}>
          {/* Fortschrittsbaum (Inline-Variante in Abilities-Slide) */}
          {slide.showTree && (
            <div style={{ display: 'flex', justifyContent: 'center', animation: 'contentReveal 0.5s ease 0.05s both' }}>
              <QQProgressTree state={s} variant="inline" />
            </div>
          )}

          {/* TREE SHOWCASE — eigene Slide, Tree groß + Phasen-Sweep */}
          {slide.treeShowcase && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 'clamp(20px, 3vh, 40px)',
              animation: 'contentReveal 0.6s ease 0.1s both',
              padding: 'clamp(8px, 1.5vh, 24px) 0',
            }}>
              <QQProgressTree state={s} variant="showcase" showcaseMode showcaseStepMs={2800} />
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                fontSize: 'clamp(18px, 2vw, 28px)', fontWeight: 700,
                color: '#a8a395', letterSpacing: '0.04em',
                animation: 'contentReveal 0.6s ease 0.5s both',
              }}>
                <span style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                  background: '#FBBF24', boxShadow: '0 0 12px rgba(251,191,36,0.65)',
                  animation: 'qqShowcaseHintPulse 1.6s ease-in-out infinite',
                }} />
                {lang === 'de'
                  ? '5 Kategorien pro Runde — jede mit eigenem Twist'
                  : '5 categories per round — each with its own twist'}
              </div>
              <style>{`
                @keyframes qqShowcaseHintPulse {
                  0%, 100% { opacity: 0.5; transform: scale(0.85); }
                  50% { opacity: 1; transform: scale(1.15); }
                }
              `}</style>
            </div>
          )}

          {/* Text lines — zentriert für Quiz-Event-Look (kein Bullet-Liste-
              Eindruck, klare Stage-Präsentation). */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            gap: 'clamp(10px, 1.5vh, 20px)', flex: 1,
            alignItems: 'center', textAlign: 'center',
          }}>
            {slide.lines.map((line, i) => (
              <div key={i} style={{
                animation: `contentReveal 0.4s ease ${0.1 + i * 0.12}s both`,
                maxWidth: 920,
              }}>
                <span style={{
                  fontSize: 'clamp(22px,3vw,40px)', fontWeight: 700,
                  color: '#e2e8f0', lineHeight: 1.3,
                }}>{line}</span>
              </div>
            ))}
            {/* Ability-Badges (Bann, Schild, Tauschen, …) als Icon-Strip */}
            {slide.abilities && slide.abilities.length > 0 && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
                gap: 'clamp(10px, 1.4vw, 20px)', marginTop: 'clamp(10px, 1.6vh, 22px)',
              }}>
                {slide.abilities.map((b, i) => (
                  <div key={`${b.label}-${i}`} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: 'clamp(10px, 1.2vh, 16px) clamp(14px, 1.6vw, 22px)', borderRadius: 16,
                    background: `${b.accent}1a`, border: `2px solid ${b.accent}55`,
                    boxShadow: `0 0 18px ${b.accent}33`, minWidth: 'clamp(96px, 11vw, 140px)',
                    animation: `contentReveal 0.4s ease ${0.4 + i * 0.08}s both`,
                  }}>
                    {b.slug
                      ? <QQIcon slug={b.slug} size={'clamp(40px, 5.5vw, 72px)'} alt={b.label} />
                      : <span style={{ fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 1 }}><QQEmojiIcon emoji={b.emoji}/></span>}
                    <div style={{
                      fontSize: 'clamp(14px, 1.6vw, 22px)', fontWeight: 900,
                      color: b.accent, letterSpacing: '0.04em',
                    }}>{b.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mini grid example */}
          {slide.grid && <RulesMiniGrid grid={slide.grid} slideColor={slide.color} />}
        </div>

        {/* Extra callout — zentriert */}
        {slide.extra && (
          <div style={{
            marginTop: 'clamp(16px, 2.5vh, 32px)', padding: 'clamp(12px, 1.8vh, 20px) clamp(18px, 2.2vw, 28px)', borderRadius: 18,
            background: `${slide.color}15`, border: `2px solid ${slide.color}33`,
            fontSize: 'clamp(18px,2.4vw,34px)', fontWeight: 800,
            color: slide.color,
            animation: 'contentReveal 0.5s ease 0.4s both',
            textShadow: `0 0 24px ${slide.color}33`,
            textAlign: 'center',
          }}>
            {slide.extra}
          </div>
        )}

        {/* Last slide hint */}
        {isLast && (
          <div style={{
            marginTop: 'clamp(16px, 2.5vh, 32px)', textAlign: 'center',
            fontSize: 'clamp(20px,2.8vw,36px)', fontWeight: 800,
            color: slide.color,
            animation: 'contentReveal 0.5s ease 0.6s both',
            textShadow: `0 0 24px ${slide.color}33`,
          }}>
            {lang === 'de' ? '🎬 Los geht\'s!' : '🎬 Let\'s go!'}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOBBY
// ═══════════════════════════════════════════════════════════════════════════════

export function LobbyView({ state: s }: { state: QQStateUpdate }) {
  const cardBg = s.theme?.cardBg ?? COZY_CARD_BG;
  const fontFam = s.theme?.fontFamily ? `'${s.theme.fontFamily}', 'Nunito', system-ui, sans-serif` : "'Nunito', system-ui, sans-serif";
  const joinUrl = `${window.location.origin}/team`;
  const [de, setDe] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setDe(p => !p), 8000);
    return () => clearInterval(id);
  }, []);

  // F1 Team-Join-Wave: tracke frisch dazugekommene Teams, Card bekommt
  // zusaetzlich zur Entry-Animation einen Wink-Shake + Glow-Burst.
  const prevTeamIdsRef = useRef<Set<string>>(new Set());
  // „seen" = schon mal in dieser Lobby-Session gemountet. Verhindert dass
  // beim Wave-Ende die teamCardIn-Animation erneut feuert (sonst flackert
  // die Karte: einblenden → kurz weg → wieder da).
  const seenTeamIdsRef = useRef<Set<string>>(new Set());
  const [waveIds, setWaveIds] = useState<Set<string>>(new Set());
  // Welcome-Banner: zeigt 'Willkommen, {Team}!' kurz prominent in der Mitte
  // wenn ein neues Team joint (User-Wunsch 2026-04-28). Banner overlayt — Lobby
  // bleibt im Hintergrund sichtbar.
  const [welcomeTeamId, setWelcomeTeamId] = useState<string | null>(null);
  const welcomeTimerRef = useRef<number | null>(null);
  useEffect(() => {
    const curIds = new Set(s.teams.map(t => t.id));
    const prev = prevTeamIdsRef.current;
    const newJoins: string[] = [];
    for (const id of curIds) if (!prev.has(id)) newJoins.push(id);
    prevTeamIdsRef.current = curIds;
    if (newJoins.length > 0 && prev.size > 0) {
      // Nur als „wave" markieren wenn Lobby schon bestand (sonst sind alle
      // initialen Teams „neu" und der Glow-Burst waere ueberfluessig).
      setWaveIds(new Set(newJoins));
      setTimeout(() => setWaveIds(new Set()), 1400);
      // Welcome-Banner für den letzten neuen Join (bei Mehrfach-Join nur einer
      // sichtbar, sonst stapelt sich's). Re-trigger durch clearTimeout möglich.
      const lastJoin = newJoins[newJoins.length - 1];
      setWelcomeTeamId(lastJoin);
      if (welcomeTimerRef.current) window.clearTimeout(welcomeTimerRef.current);
      welcomeTimerRef.current = window.setTimeout(() => setWelcomeTeamId(null), 3200);
    }
  }, [s.teams]);
  useEffect(() => () => { if (welcomeTimerRef.current) window.clearTimeout(welcomeTimerRef.current); }, []);
  const welcomedTeam = welcomeTeamId ? s.teams.find(t => t.id === welcomeTeamId) : null;
  // Nach jedem Render alle aktuellen Teams als „seen" markieren — fortan
  // bekommen sie KEIN teamCardIn mehr (würde sonst beim Wave-End-Re-Render
  // erneut feuern).
  useEffect(() => {
    for (const t of s.teams) seenTeamIdsRef.current.add(t.id);
  }, [s.teams]);

  // Dynamic status text
  const teamCount = s.teams.length;
  const connectedCount = s.teams.filter(t => t.connected).length;

  // QR size responsive to viewport height (avoid clipping on laptops)
  const qrSize = 'min(44vh, 420px)';

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: 'clamp(16px, 2.5vh, 32px) clamp(24px, 3vw, 56px)',
      position: 'relative', overflow: 'hidden',
      gap: 'clamp(10px, 1.5vh, 20px)',
      // Cozy-warmer Hintergrund (User-Wunsch 2026-04-28: nicht so schwarz, an
      // Setup-Look angleichen). Doppelter Radial-Gradient: oben-mitte amber-Glow,
      // unten-rechts indigo-Glow auf #0D0A06-Base — exakt wie QQModeratorPage.
      background:
        'radial-gradient(ellipse at 50% -10%, rgba(245,158,11,0.10), transparent 55%), ' +
        'radial-gradient(ellipse at 85% 110%, rgba(99,102,241,0.08), transparent 55%), ' +
        'radial-gradient(ellipse at 15% 80%, rgba(244,114,182,0.05), transparent 50%), ' +
        '#0D0A06',
    }}>
      <Fireflies />

      {/* Welcome-Team-Banner — overlayt zentral wenn neues Team joint */}
      {welcomedTeam && (
        <div style={{
          position: 'absolute', top: '38%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 50,
          padding: 'clamp(20px, 2.6vh, 36px) clamp(36px, 5vw, 72px)',
          borderRadius: 28,
          background: 'linear-gradient(180deg, rgba(26,19,12,0.96), rgba(15,12,9,0.98))',
          border: `3px solid ${welcomedTeam.color}`,
          boxShadow: `0 0 60px ${welcomedTeam.color}99, 0 14px 44px rgba(0,0,0,0.6)`,
          animation: 'qqWelcomeBanner 3.2s cubic-bezier(0.22,1,0.36,1) both',
          pointerEvents: 'none',
          display: 'flex', alignItems: 'center', gap: 'clamp(16px, 2vw, 28px)',
          maxWidth: '80vw',
        }}>
          <QQTeamAvatar avatarId={welcomedTeam.avatarId} size={'clamp(64px, 8vw, 110px)'} style={{
            boxShadow: `0 0 24px ${welcomedTeam.color}88`,
            flexShrink: 0,
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <div style={{
              fontSize: 'clamp(13px, 1.3vw, 18px)', fontWeight: 900,
              color: welcomedTeam.color, letterSpacing: '0.22em', textTransform: 'uppercase',
              textShadow: `0 0 14px ${welcomedTeam.color}66`,
            }}>
              {de ? '✨ Willkommen' : '✨ Welcome'}
            </div>
            <div style={{
              fontFamily: fontFam,
              fontSize: 'clamp(34px, 4.6vw, 72px)', fontWeight: 900,
              color: '#FFEFC9', lineHeight: 1.05,
              letterSpacing: '-0.005em',
              whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: '60vw',
              textShadow: `0 0 28px ${welcomedTeam.color}66, 0 2px 0 rgba(0,0,0,0.4)`,
            }}>
              {welcomedTeam.name}!
            </div>
          </div>
        </div>
      )}

      {/* ── Top: Title (compact, centered) — CozyWolf-Branding nur noch unter QR ── */}
      <div style={{
        textAlign: 'center', position: 'relative', zIndex: 5, flexShrink: 0,
        animation: 'phasePop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.1s both',
        paddingTop: 'clamp(6px, 1vh, 14px)',
      }}>
        <div style={{
          fontFamily: fontFam,
          fontSize: 'clamp(44px, 7vw, 96px)', fontWeight: 900, lineHeight: 1,
          background: 'linear-gradient(135deg, #FDE68A 40%, #FBBF24)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em',
          textShadow: '0 0 40px rgba(251,191,36,0.18)',
        }}>
          CozyQuiz
        </div>
      </div>

      {/* ── Center: 2-column layout — QR left, Teams right.
          Symmetrische Ränder: QR bündig links, Teams-Grid bündig rechts,
          gleicher Abstand zum Viewport-Rand auf beiden Seiten. ── */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        alignItems: 'center',
        columnGap: 'clamp(24px, 3vw, 48px)',
        position: 'relative', zIndex: 5,
        width: '100%',
        padding: '0 clamp(24px, 4vw, 80px)',
        minHeight: 0,
      }}>
        {/* Left: QR Code */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(10px, 1.5vh, 18px)',
          flexShrink: 0, justifySelf: 'start',
          animation: 'phasePop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both',
        }}>
          <div style={{
            background: '#ffffff', borderRadius: 28, padding: 'clamp(14px, 2vh, 24px)',
            // C5 „Scan-me"-Breath: sanftes gruenes Box-Shadow-Puls signalisiert Interaktivitaet.
            animation: 'qrScanBreath 2.4s ease-in-out infinite, qrGlow 3s ease-in-out infinite',
            boxShadow: '0 16px 64px rgba(0,0,0,0.5), 0 0 50px rgba(255,255,255,0.1)',
            width: qrSize, height: qrSize, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <QRCodeSVG value={joinUrl} size={256} bgColor="#ffffff" fgColor="#0D0A06" level="M"
              style={{ width: '100%', height: '100%' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 'clamp(18px, 2vw, 28px)', color: '#e2e8f0', fontWeight: 900, marginBottom: 4,
            }}>
              {de ? 'Scannen & mitspielen!' : 'Scan & join!'}
            </div>
            <div style={{
              fontSize: 'clamp(13px, 1.4vw, 18px)', color: '#94a3b8', fontFamily: 'monospace',
              background: cardBg, padding: '6px 16px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'inline-block',
            }}>
              {joinUrl.replace('https://', '').replace('http://', '')}
            </div>
          </div>
          {/* CozyWolf Branding — prominent unterhalb des QR-Codes */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 18px', borderRadius: 999,
            background: 'linear-gradient(135deg, rgba(251,191,36,0.16), rgba(245,158,11,0.10))',
            border: '1.5px solid rgba(251,191,36,0.35)',
            boxShadow: '0 4px 18px rgba(0,0,0,0.35), 0 0 18px rgba(251,191,36,0.12)',
          }}>
            <img
              src="/logo.png"
              alt=""
              style={{ width: 28, height: 28, objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}
            />
            <span style={{
              fontSize: 'clamp(12px, 1.1vw, 15px)', fontWeight: 800,
              color: '#cbd5e1', letterSpacing: '0.06em',
            }}>
              {de ? 'präsentiert von' : 'presented by'}
            </span>
            <span style={{
              fontSize: 'clamp(14px, 1.4vw, 18px)', fontWeight: 900,
              color: '#FBBF24', letterSpacing: '0.04em',
              textShadow: '0 1px 2px rgba(0,0,0,0.6)',
            }}>
              CozyWolf
            </span>
          </div>
        </div>

        {/* Right: Teams + status — nimmt verfügbare Breite voll aus */}
        <div style={{
          minWidth: 0, width: '100%',
          display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 1.5vh, 18px)',
          alignItems: 'stretch', justifyContent: 'center',
        }}>
          <div style={{
            fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 800,
            color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase',
            textAlign: 'center', opacity: 0.7,
          }}>
            {de ? 'Angemeldete Teams' : 'Joined Teams'} · {teamCount}
          </div>

          {teamCount === 0 ? (
            <div style={{
              color: '#94a3b8', fontSize: 'clamp(18px, 2vw, 26px)', fontWeight: 700,
              animation: 'lobbyPulse 2.5s ease-in-out infinite', textAlign: 'center',
              padding: 'clamp(20px, 3vh, 40px) 20px',
              border: '2px dashed rgba(148,163,184,0.2)', borderRadius: 18,
            }}>
              {de ? 'Warte auf Teams…' : 'Waiting for teams…'}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              // Immer 2-spaltig: 1-2 Teams = 2 Spalten (eine Zeile), 3-4 = 2×2,
              // 5-8 = 2×3 / 2×4. Hält Karten schön breit statt quetschig-schmal.
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: teamCount > 6 ? 6 : 'clamp(8px, 1.2vw, 14px)',
            }}>
              {s.teams.map((t, i) => {
                const compact = teamCount > 6;
                const isFreshJoin = waveIds.has(t.id);
                // Schon mal gerendert? Dann KEINE Entry-Animation mehr feuern,
                // sonst flackert die Karte beim Wave-End (Animation-Property
                // wechselt von teamJoinWave → teamCardIn → opacity:0-Frame).
                const wasSeen = seenTeamIdsRef.current.has(t.id);
                return (
                  <div key={t.id} style={{
                    padding: compact
                      ? 'clamp(16px, 2vh, 24px) clamp(20px, 2.2vw, 28px)'
                      : 'clamp(18px, 2.2vh, 26px) clamp(22px, 2.4vw, 30px)',
                    borderRadius: compact ? 18 : 22,
                    background: cardBg,
                    border: `2px solid ${isFreshJoin ? t.color : t.color + '55'}`,
                    boxShadow: isFreshJoin
                      ? `0 8px 28px rgba(0,0,0,0.4), 0 0 60px ${t.color}99, 0 0 30px ${t.color}66`
                      : `0 8px 28px rgba(0,0,0,0.4), 0 0 24px ${t.color}22`,
                    display: 'flex', alignItems: 'center',
                    gap: compact ? 'clamp(14px, 1.5vw, 20px)' : 'clamp(14px, 1.6vw, 20px)',
                    // F1: frisch joinende Teams kriegen wink-Shake + Glow-Burst.
                    // Bereits gesehene Teams (wasSeen) bekommen KEINE Animation
                    // mehr — sonst spielt teamCardIn nach Wave-Ende erneut und
                    // die Karte flackert (out → in).
                    animation: isFreshJoin
                      ? 'teamJoinWave 1.2s cubic-bezier(0.34,1.56,0.64,1) both'
                      : wasSeen
                        ? undefined
                        : `teamCardIn 0.5s cubic-bezier(0.34,1.2,0.64,1) ${0.4 + i * 0.06}s both`,
                    transition: 'box-shadow 0.6s ease, border-color 0.6s ease',
                    minWidth: 0,
                    position: 'relative',
                  }}>
                    <QQTeamAvatar avatarId={t.avatarId} size={compact ? 'clamp(56px, 5.4vw, 76px)' : 'clamp(64px, 6vw, 88px)'} style={{ flexShrink: 0 }} />
                    {isFreshJoin && (
                      <span aria-hidden style={{
                        position: 'absolute', top: -16, right: -10,
                        fontSize: 30, lineHeight: 1,
                        animation: 'teamJoinHi 1.1s cubic-bezier(0.34,1.5,0.64,1) both',
                        filter: `drop-shadow(0 0 8px ${t.color}cc)`,
                      }}>👋</span>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontWeight: 900,
                        fontSize: compact ? 'clamp(18px, 1.9vw, 26px)' : 'clamp(20px, 2.1vw, 30px)',
                        color: t.color,
                        lineHeight: 1.1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }} title={t.name}>
                        {t.name.length > 12 ? t.name.slice(0, 11) + '…' : t.name}
                      </div>
                      <div style={{
                        fontSize: compact ? 'clamp(13px, 1.2vw, 16px)' : 'clamp(13px, 1.25vw, 17px)',
                        fontWeight: 700, color: t.connected ? '#22C55E' : '#94a3b866',
                        marginTop: 4,
                      }}>
                        {t.connected ? '● bereit' : '○ offline'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Dynamic status */}
          <div style={{
            fontSize: 'clamp(16px, 1.8vw, 24px)', fontWeight: 800, textAlign: 'center',
            color: teamCount < 2 ? '#F59E0B' : '#22C55E',
            animation: teamCount >= 2 ? 'lobbyPulse 2.5s ease-in-out infinite' : undefined,
          }}>
            {teamCount === 0
              ? (de ? '📱 Scannt den Code um beizutreten' : '📱 Scan to join')
              : teamCount < 2
                ? (de ? '⏳ Noch 1 Team fehlt!' : '⏳ 1 more team needed!')
                : teamCount >= 5
                  ? (de ? `🔥 ${teamCount} Teams sind dabei!` : `🔥 ${teamCount} teams are in!`)
                  : connectedCount === teamCount
                    ? (de ? `🚀 Gleich geht's los!` : `🚀 Let's go!`)
                    : (de ? `${connectedCount}/${teamCount} verbunden` : `${connectedCount}/${teamCount} connected`)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEAMS REVEAL — einmalige epische Team-Vorstellung nach Rules, vor Phase 1
// ═══════════════════════════════════════════════════════════════════════════════

export function TeamsRevealView({ state: s }: { state: QQStateUpdate }) {
  const lang = useLangFlip(s.language);
  const fontFam = s.theme?.fontFamily ? `'${s.theme.fontFamily}', 'Nunito', system-ui, sans-serif` : "'Nunito', system-ui, sans-serif";
  const teams = s.teams.filter(t => t.connected).length > 0
    ? s.teams.filter(t => t.connected)
    : s.teams;
  // Animation start anchor — fallback auf "jetzt" falls Backend-Feld fehlt
  const anchor = s.teamsRevealStartedAt ?? Date.now();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 250);
    return () => clearInterval(id);
  }, []);
  void tick;
  const elapsed = Date.now() - anchor;

  // Timing: 0.8s Titel → pro Team 0.9s stagger → 1.2s Outro-Grid mit "VIEL GLÜCK!"
  const titleDelay = 0;
  const titleDur = 800;
  const perTeamDelay = 900;
  const revealedCount = Math.max(0, Math.min(teams.length, Math.floor((elapsed - titleDur) / perTeamDelay) + 1));
  const goodLuckDelay = titleDur + teams.length * perTeamDelay + 400;
  const showGoodLuck = elapsed >= goodLuckDelay;

  // Sounds triggern pro Team (nur einmal je Index) — respektiert globalen SFX-Mute
  const playedRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (s.sfxMuted) return;
    for (let i = 0; i < revealedCount; i++) {
      if (!playedRef.current.has(i)) {
        playedRef.current.add(i);
        try { playTeamReveal(); } catch {}
      }
    }
    if (showGoodLuck && !playedRef.current.has(-1)) {
      playedRef.current.add(-1);
      try { playFanfare(); } catch {}
    }
  }, [revealedCount, showGoodLuck, s.sfxMuted]);

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: 'radial-gradient(ellipse at center, #1e293b 0%, #0f172a 55%, #020617 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: fontFam, overflow: 'hidden',
    }}>
      <Fireflies />
      <style>{`
        @keyframes qqTrTitle {
          0%   { opacity: 0; transform: translateY(-30px) scale(0.8); letter-spacing: 0.5em; }
          100% { opacity: 1; transform: translateY(0)     scale(1);   letter-spacing: 0.12em; }
        }
        @keyframes qqTrSlam {
          0%   { opacity: 0; transform: translateY(-80vh) scale(2) rotate(-18deg); filter: blur(6px); }
          55%  { opacity: 1; transform: translateY(8%)    scale(1.15) rotate(3deg); filter: blur(0); }
          75%  { transform: translateY(-2%) scale(0.96) rotate(-1deg); }
          100% { transform: translateY(0)    scale(1) rotate(0deg); }
        }
        @keyframes qqTrFlash {
          0%   { opacity: 0; }
          10%  { opacity: 0.9; }
          100% { opacity: 0; }
        }
        @keyframes qqTrGood {
          0%   { opacity: 0; transform: scale(0.7); }
          60%  { opacity: 1; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes qqTrPulse {
          0%,100% { transform: scale(1); }
          50%     { transform: scale(1.04); }
        }
      `}</style>

      {/* Backdrop spotlight */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 40%, rgba(251,191,36,0.12) 0%, transparent 55%)',
        pointerEvents: 'none',
      }} />

      {/* Title */}
      <div style={{
        fontSize: 'clamp(36px, 5.2vw, 82px)', fontWeight: 900, color: '#f8fafc',
        textTransform: 'uppercase', letterSpacing: '0.12em',
        animation: `qqTrTitle ${titleDur}ms cubic-bezier(.2,.8,.2,1) ${titleDelay}ms both`,
        textShadow: '0 4px 20px rgba(251,191,36,0.25)',
        marginBottom: 'clamp(24px, 3vw, 48px)',
      }}>
        🎬 {lang === 'en' ? 'Tonight\u2019s teams\u2026' : 'Heute spielen\u2026'}
      </div>

      {/* Teams grid — feste Reihen, damit 8 als 2×4 statt 7+1 erscheint */}
      {(() => {
        const n = teams.length;
        // Ausgewogene Reihen: 7→4+3, 8→4+4, 9→5+4, 10→5+5, ≥11 dynamisch
        const rowSizes: number[] =
          n <= 6 ? [n]
          : n === 7 ? [4, 3]
          : n === 8 ? [4, 4]
          : n === 9 ? [5, 4]
          : n === 10 ? [5, 5]
          : (() => {
              const rows = Math.ceil(n / 4);
              const base = Math.floor(n / rows);
              const extra = n - base * rows;
              return Array.from({ length: rows }, (_, i) => base + (i < extra ? 1 : 0));
            })();
        const many = n > 5;
        const multiRow = rowSizes.length > 1;
        // Bei mehreren Reihen kleiner skalieren, damit beides in die Bühne passt
        const discSize = multiRow
          ? 'clamp(110px, 11vw, 180px)'
          : many ? 'clamp(130px, 13vw, 210px)' : 'clamp(160px, 17vw, 260px)';
        const discFont = multiRow
          ? 'clamp(52px, 6.2vw, 100px)'
          : many ? 'clamp(62px, 7.8vw, 118px)' : 'clamp(78px, 10vw, 140px)';
        const nameFont = multiRow ? 'clamp(20px, 2.4vw, 32px)' : 'clamp(22px, 2.6vw, 36px)';
        let cursor = 0;
        return (
          <div style={{
            display: 'flex', flexDirection: 'column',
            gap: 'clamp(18px, 2.4vw, 36px)',
            alignItems: 'center', maxWidth: '92vw',
          }}>
            {rowSizes.map((size, rIdx) => {
              const slice = teams.slice(cursor, cursor + size);
              const startI = cursor;
              cursor += size;
              return (
                <div key={rIdx} style={{
                  display: 'flex', gap: 'clamp(12px, 2vw, 28px)',
                  justifyContent: 'center', flexWrap: 'nowrap',
                }}>
                  {slice.map((t, j) => {
                    const i = startI + j;
                    const shown = i < revealedCount;
                    const slamDelay = titleDur + i * perTeamDelay;
                    return (
                      <div key={t.id} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 10,
                        opacity: shown ? 1 : 0,
                        animation: shown ? `qqTrSlam 900ms cubic-bezier(.2,.9,.2,1) 0ms both` : 'none',
                        animationDelay: shown ? '0ms' : `${slamDelay}ms`,
                      }}>
                        {/* Avatar-Disc — Ring ist im PNG eingebrannt, nur Glow drumherum */}
                        <QQTeamAvatar avatarId={t.avatarId} size={discSize} style={{
                          boxShadow: `0 12px 40px ${t.color}88, 0 0 60px ${t.color}66`,
                          animation: shown ? 'qqTrPulse 2.2s ease-in-out infinite' : 'none',
                        }} />
                        {/* Flash overlay on slam */}
                        {shown && (
                          <div style={{
                            position: 'absolute',
                            width: discSize,
                            height: discSize,
                            borderRadius: '50%',
                            background: '#fff',
                            pointerEvents: 'none',
                            animation: 'qqTrFlash 600ms ease-out both',
                          }} />
                        )}
                        {/* Team name */}
                        <div title={t.name} style={{
                          padding: '6px 16px', borderRadius: 14,
                          background: t.color,
                          color: '#fff', fontWeight: 900,
                          fontSize: nameFont,
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                          boxShadow: `0 4px 12px rgba(0,0,0,0.3)`,
                          whiteSpace: 'nowrap',
                          maxWidth: multiRow ? '22vw' : '18vw',
                          overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {truncName(t.name, multiRow ? 14 : 16)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* "Viel Glück!" — reserve space from the start to prevent layout jump when it fades in */}
      <div style={{
        marginTop: 'clamp(32px, 4vw, 64px)',
        height: 'clamp(38px, 5.2vw, 80px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontSize: 'clamp(28px, 4vw, 64px)', fontWeight: 900,
          color: '#fbbf24',
          textTransform: 'uppercase', letterSpacing: '0.15em',
          textShadow: '0 4px 24px rgba(251,191,36,0.5)',
          opacity: showGoodLuck ? 1 : 0,
          transform: showGoodLuck ? 'scale(1)' : 'scale(0.7)',
          animation: showGoodLuck ? 'qqTrGood 900ms cubic-bezier(.2,.8,.2,1) both' : 'none',
        }}>
          <QQEmojiIcon emoji="✨"/> {lang === 'en' ? 'Good luck!' : 'Viel Glück!'} <QQEmojiIcon emoji="✨"/>
        </div>
      </div>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUND MINI TREE — 5 Kategorie-Dots der aktuellen Runde, Wolf auf aktuellem Dot.
// Bei Fragewechsel gleitet der Wolf durch CSS-transition zum neuen Dot.
// ═══════════════════════════════════════════════════════════════════════════════

function RoundMiniTree({ state: s, catColor }: { state: QQStateUpdate; catColor: string }) {
  const schedule = s.schedule ?? [];
  const phase = s.gamePhaseIndex;
  const firstIdx = schedule.findIndex(e => e.phase === phase);
  const phaseEntries = schedule.filter(e => e.phase === phase);

  const currentInPhase = phaseEntries.length === 0 || firstIdx < 0
    ? 0
    : Math.max(0, Math.min(s.questionIndex - firstIdx, phaseEntries.length - 1));

  // Wolf startet auf Vorgänger-Dot, springt nach Seiten-Entrance (~1s) zum aktuellen Dot.
  const [displayIdx, setDisplayIdx] = useState(Math.max(0, currentInPhase - 1));
  const [hopping, setHopping] = useState(false);

  useEffect(() => {
    if (currentInPhase === 0) {
      setDisplayIdx(0);
      setHopping(false);
      return;
    }
    setDisplayIdx(Math.max(0, currentInPhase - 1));
    setHopping(false);
    const t1 = setTimeout(() => {
      setDisplayIdx(currentInPhase);
      setHopping(true);
    }, 1000);
    const t2 = setTimeout(() => setHopping(false), 1000 + 560);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [currentInPhase]);

  if (phaseEntries.length === 0 || firstIdx < 0) return null;

  // User-Wunsch 2026-04-28: Mini-Tree unter „Runde N" darf größer sein.
  // 60→84 ergibt ~40% größere Dots, der Wolf wandert ebenfalls größer mit.
  const DOT = 84;
  const GAP = 32;
  const WOLF = DOT + 14;
  const totalWidth = phaseEntries.length * DOT + (phaseEntries.length - 1) * GAP;
  const wolfLeft = displayIdx * (DOT + GAP) + DOT / 2;
  const progressWidth = displayIdx === 0 ? 0 : displayIdx * (DOT + GAP);

  return (
    <div style={{
      position: 'relative', width: totalWidth, height: WOLF + 4,
      display: 'flex', alignItems: 'center',
    }}>
      {/* Track (grau) + Progress (amber) — auf Dot-Mittelhöhe */}
      <div style={{
        position: 'absolute', top: '50%', left: DOT / 2,
        width: totalWidth - DOT, height: 3,
        background: 'rgba(148,163,184,0.28)',
        transform: 'translateY(-50%)', borderRadius: 2,
      }} />
      {progressWidth > 0 && (
        <div style={{
          position: 'absolute', top: '50%', left: DOT / 2,
          width: progressWidth, height: 3,
          background: 'linear-gradient(90deg, #FBBF24, #F59E0B)',
          transform: 'translateY(-50%)', borderRadius: 2,
          boxShadow: '0 0 10px rgba(251,191,36,0.6)',
          transition: 'width 540ms cubic-bezier(0.4,0,0.2,1)',
        }} />
      )}

      {/* Dots — bei current bleibt der Dot leer, der Wolf sitzt drauf */}
      {phaseEntries.map((e, i) => {
        const label = QQ_CATEGORY_LABELS[e.category];
        const subSlug = e.bunteTueteKind ? qqSubSlug(e.bunteTueteKind) : null;
        const catSlug = qqCatSlug(e.category);
        const iconSlug = subSlug ?? catSlug;
        const emojiFallback = e.bunteTueteKind ? QQ_BUNTE_TUETE_LABELS[e.bunteTueteKind].emoji : label.emoji;
        const isPast = i < displayIdx;
        const isCurrent = i === displayIdx;
        const dotLeft = i * (DOT + GAP);
        const iconSize = Math.round(DOT * 0.78);
        return (
          <div key={i} style={{
            position: 'absolute', top: '50%', left: dotLeft,
            width: DOT, height: DOT, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: Math.round(DOT * 0.55),
            background: isPast ? 'rgba(148,163,184,0.18)'
              : isCurrent ? 'transparent'
              : 'rgba(30,41,59,0.55)',
            border: isCurrent ? 'none' : '1.5px solid rgba(148,163,184,0.35)',
            filter: isPast ? 'grayscale(1)' : 'none',
            opacity: isPast ? 0.55 : isCurrent ? 0 : 1,
            transform: 'translateY(-50%)',
            transition: 'opacity 320ms ease, filter 320ms ease, background 320ms ease',
            zIndex: 1,
          }}>
            {iconSlug
              ? <QQIcon slug={iconSlug} size={iconSize} alt={label.de} />
              : emojiFallback}
          </div>
        );
      })}

      {/* Wolf-Avatar — wartet auf Seiten-Entrance, springt dann in einem Bogen zum neuen Dot */}
      <div style={{
        position: 'absolute', top: '50%', left: wolfLeft,
        width: WOLF, height: WOLF, borderRadius: '50%',
        background: '#1a1209',
        backgroundImage: 'url(/logo.png)',
        backgroundSize: '88%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        border: `3px solid ${catColor}`,
        boxShadow: `0 0 0 4px ${catColor}40, 0 6px 14px ${catColor}55`,
        transform: 'translate(-50%, -50%)',
        transition: 'left 560ms cubic-bezier(0.34, 1.25, 0.64, 1), border-color 400ms ease, box-shadow 400ms ease',
        animation: hopping ? 'roundMiniHop 560ms cubic-bezier(0.4,0,0.2,1) both' : undefined,
        zIndex: 2,
      }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE INTRO
// ═══════════════════════════════════════════════════════════════════════════════

export function PhaseIntroView({ state: s }: { state: QQStateUpdate }) {
  const lang = useLangFlip(s.language);
  const fontFam = s.theme?.fontFamily ? `'${s.theme.fontFamily}', 'Nunito', system-ui, sans-serif` : "'Nunito', system-ui, sans-serif";
  const phaseColors = ['#3B82F6', '#F59E0B', '#EF4444'];
  const color = phaseColors[(s.gamePhaseIndex - 1) % 3];
  const phaseNamesRaw = bt.phase.names[lang];
  const phaseDescsRaw = bt.phase.descs[lang];
  // „Finale" ist seit Connections-Einführung das 4×4-Mini-Game, NICHT mehr die
  // letzte Quiz-Runde. Quiz-Runden werden immer als „Runde N" angezeigt — auch
  // die letzte. Falls Connections deaktiviert ist und die letzte Quiz-Runde
  // gleichzeitig das Spielende ist, behält sie trotzdem ihren „Runde N"-Titel
  // (das echte Finale-Drama liegt bei der Connections-Phase).
  const phaseName = phaseNamesRaw[s.gamePhaseIndex];
  const phaseDesc = phaseDescsRaw[s.gamePhaseIndex];

  const questionInPhase = (s.questionIndex % 5) + 1;
  const isFirstOfRound = questionInPhase === 1;

  // Category info for upcoming question
  const cat = s.currentQuestion?.category as QQCategory | undefined;
  const catInfo = cat ? QQ_CATEGORY_LABELS[cat] : undefined;
  const CAT_COLORS: Record<string, string> = {
    SCHAETZCHEN: '#EAB308', MUCHO: '#3B82F6', BUNTE_TUETE: '#EF4444',
    ZEHN_VON_ZEHN: '#10B981', CHEESE: '#8B5CF6',
  };
  const catColor = (cat && CAT_COLORS[cat]) || color;

  // Category explanations — 1 line to clarify for audience
  const CAT_EXPLAIN: Record<string, { de: string; en: string }> = {
    SCHAETZCHEN:   { de: 'Wer schätzt am nächsten dran?', en: 'Who can guess the closest?' },
    MUCHO:         { de: 'Wählt die richtige Antwort', en: 'Pick the right answer' },
    BUNTE_TUETE:   { de: 'Überraschungs-Mechanik — seid bereit!', en: 'Surprise mechanic — be ready!' },
    ZEHN_VON_ZEHN: { de: '3 Antworten, 10 Punkte vergeben', en: '3 answers, distribute 10 points' },
    CHEESE:        { de: 'Was ist das?', en: 'What is this?' },
  };

  // BUNTE_TUETE: pro Sub-Mechanik eigene Vorstellung (Name, Emoji, 1-Zeiler).
  // Sonst sähe „4 gewinnt" und „Bluff" und „Hot Potato" alle gleich aus
  // („Bunte Tüte · Überraschungs-Mechanik") — dem Publikum entgeht der Reiz
  // der jeweiligen Mechanik komplett.
  const BUNTE_SUB_INTRO: Record<string, { de: { name: string; explain: string }; en: { name: string; explain: string }; emoji: string }> = {
    onlyConnect: {
      emoji: '🧩',
      de: { name: '4 gewinnt',     explain: '4 Hinweise, eine Lösung — wer früher tippt, holt mehr Punkte.' },
      en: { name: 'Only Connect',  explain: '4 clues, one answer — guess earlier for more points.' },
    },
    bluff: {
      emoji: '🎭',
      de: { name: 'Bluff',         explain: 'Erfindet plausible Falsch-Antworten und ratet die echte.' },
      en: { name: 'Bluff',         explain: 'Make up plausible fake answers and find the real one.' },
    },
    hotPotato: {
      emoji: '🔥',
      de: { name: 'Heiße Kartoffel', explain: 'Reihum Begriffe nennen — wer hängt, verliert.' },
      en: { name: 'Hot Potato',    explain: 'Take turns naming items — first to stall loses.' },
    },
    top5: {
      emoji: '🏆',
      de: { name: 'Top 5',         explain: 'Nennt die häufigsten Antworten — je oben, desto mehr Punkte.' },
      en: { name: 'Top 5',         explain: 'Guess the most common answers — higher rank, more points.' },
    },
    oneOfEight: {
      emoji: '🕵️',
      de: { name: 'Imposter',      explain: 'Findet die EINE falsche Aussage zwischen 7 wahren.' },
      en: { name: 'Imposter',      explain: 'Spot the ONE false statement among 7 true ones.' },
    },
    order: {
      emoji: '📋',
      de: { name: 'Reihenfolge',   explain: 'Sortiert in der richtigen Reihenfolge.' },
      en: { name: 'Order',         explain: 'Sort in the correct order.' },
    },
    map: {
      emoji: '🗺️',
      de: { name: 'CozyGuessr',    explain: 'Errate den Ort auf der Karte — je näher, desto mehr Punkte.' },
      en: { name: 'CozyGuessr',    explain: 'Guess the location on the map — closer means more points.' },
    },
  };
  const bunteKind = cat === 'BUNTE_TUETE'
    ? (s.currentQuestion?.bunteTuete?.kind as keyof typeof BUNTE_SUB_INTRO | undefined)
    : undefined;
  const bunteSub = bunteKind ? BUNTE_SUB_INTRO[bunteKind] : undefined;

  const catLabel = bunteSub
    ? bunteSub[lang].name
    : (catInfo ? catInfo[lang] : '');
  const catEmoji = bunteSub
    ? bunteSub.emoji
    : (catInfo?.emoji ?? '');
  const catExplain = bunteSub
    ? bunteSub[lang].explain
    : (cat ? (CAT_EXPLAIN[cat]?.[lang] ?? '') : '');

  // ── Rule reminders per round ──
  // Subtitle ueber den Action-Cards. Beschreibt knapp wie die Wahl funktioniert,
  // die exakte Anzahl pro Aktion steht direkt auf den Cards (× N).
  const ROUND_RULES: Record<number, { de: string[]; en: string[]; emoji: string }> = {
    1: {
      emoji: '🏁',
      de: ['Eure Aktion diese Runde:', 'Sichert euch eure ersten Felder!'],
      en: ['Your action this round:', 'Claim your first cells!'],
    },
    2: {
      emoji: '⚔️',
      de: ['Pro richtige Antwort wählt eine Aktion:', 'Klauen jetzt möglich!'],
      en: ['Per correct answer choose one action:', 'Stealing now possible!'],
    },
    3: {
      emoji: '🏯',
      de: ['Pro richtige Antwort wählt eine Aktion:', 'Stapeln freigeschaltet — Felder dauerhaft sichern + 1 Punkt extra!'],
      en: ['Per correct answer choose one action:', 'Stack unlocked — lock your tile + 1 extra point!'],
    },
    4: {
      emoji: '🏯',
      de: s.connectionsEnabled !== false
        ? ['Pro richtige Antwort wählt eine Aktion:', 'Letzte Quiz-Runde — danach kommt das Finale!']
        : ['Pro richtige Antwort wählt eine Aktion:', 'Letzte Runde — alles bleibt verfügbar!'],
      en: s.connectionsEnabled !== false
        ? ['Per correct answer choose one action:', 'Last quiz round — finale follows!']
        : ['Per correct answer choose one action:', 'Final round — everything stays available!'],
    },
  };
  const roundRules = ROUND_RULES[s.gamePhaseIndex] ?? ROUND_RULES[3];

  // ── Round Self-Transition ──
  // Beim Mount der Slide (ab Runde 2) zeigen wir kurz den Look der vorherigen
  // Runde, dann faden wir Farben, Label & Tree auf die neue Runde. Der
  // Ziffer-Flip im Titel ist die zentrale Geste.
  const hasRoundTransition = isFirstOfRound && s.introStep === 0 && s.gamePhaseIndex > 1;
  const [transitioning, setTransitioning] = useState(hasRoundTransition);
  // Choreografie: Wolf hüpft ZUERST, danach rollt die Ziffer.
  // - treeShowsPrev: hält den Tree kurz auf Runde N-1, swappt nach 220ms auf
  //   Runde N → QQProgressTree triggert internen Hop (220ms Delay + 620ms Anim).
  // - Wolf landet ca. bei 1100ms (220 + 220 + 620 + Puffer).
  // - Digit-Fall startet 1150ms, Roll 1650ms, Wort-Sweep 1100ms — alles NACH dem Hop.
  // - transitioning endet bei 2500ms.
  const [treeShowsPrev, setTreeShowsPrev] = useState(hasRoundTransition);
  useEffect(() => {
    if (!hasRoundTransition) { setTransitioning(false); setTreeShowsPrev(false); return; }
    setTransitioning(true);
    setTreeShowsPrev(true);
    const tTree = setTimeout(() => setTreeShowsPrev(false), 220);
    const tEnd  = setTimeout(() => setTransitioning(false), 2500);
    return () => { clearTimeout(tTree); clearTimeout(tEnd); };
  }, [s.gamePhaseIndex, hasRoundTransition]);

  const prevIdx = s.gamePhaseIndex - 1;
  const prevColor = phaseColors[Math.max(0, prevIdx - 1) % 3];
  const prevPhaseName = prevIdx < 1 ? phaseName : phaseNamesRaw[prevIdx];
  const prevPhaseDesc = prevIdx < 1 ? phaseDesc : phaseDescsRaw[prevIdx];

  const displayColor = transitioning ? prevColor : color;
  const displayPhaseDesc = transitioning ? prevPhaseDesc : phaseDesc;
  const displayGpi = transitioning ? prevIdx : s.gamePhaseIndex;

  // Ziffer-Flip: nur möglich wenn beide Titel "Runde N" / "Round N" sind
  const digitRe = /^(Runde|Round)\s+(\d+)$/;
  const prevTitleMatch = prevPhaseName.match(digitRe);
  const newTitleMatch = phaseName.match(digitRe);
  const canDigitFlip = hasRoundTransition && !!prevTitleMatch && !!newTitleMatch;
  const titleWord = newTitleMatch ? newTitleMatch[1] : (lang === 'de' ? 'Runde' : 'Round');
  const prevDigit = prevTitleMatch ? prevTitleMatch[2] : '';
  const newDigit  = newTitleMatch  ? newTitleMatch[2]  : '';

  // Finale-Roll-Animation deaktiviert seit „Finale" jetzt das 4×4-Connections-
  // Mini-Game ist und Quiz-Runden immer „Runde N" heißen. Variablen bleiben
  // als no-op für die Render-Pfade unten.
  const isFinaleTransition = false;
  const finaleWord = lang === 'de' ? 'FINALE' : 'FINAL';
  const prevRoundFull = prevTitleMatch ? `${prevTitleMatch[1]} ${prevTitleMatch[2]}` : '';

  // Tree-State zu Beginn der Transition: letzter Dot der vorherigen Phase
  // (Wolf sitzt dort). Sobald treeShowsPrev kippt, swappt der Tree auf die
  // neue Phase und der Wolf hüpft (gesteuert in QQProgressTree).
  const displayTreeState: QQStateUpdate = useMemo(() => {
    if (!treeShowsPrev || prevIdx < 1) return s;
    const sched = s.schedule ?? [];
    let lastIdx = -1;
    for (let i = 0; i < sched.length; i++) if (sched[i].phase === prevIdx) lastIdx = i;
    return { ...s, gamePhaseIndex: prevIdx as any, questionIndex: lastIdx >= 0 ? lastIdx : s.questionIndex };
  }, [treeShowsPrev, s, prevIdx]);

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <Fireflies color={isFirstOfRound && s.introStep <= 1 ? `${displayColor}88` : `${catColor ?? color}88`} />

      {isFirstOfRound && s.introStep === 0 ? (
        /* ── Step 0: Round announcement (first question only) ── */
        <>
          {/* Round progress pill — Farbe + Text transitionen von prev auf new */}
          <div style={{
            padding: '8px 24px', borderRadius: 999,
            background: `${displayColor}18`, border: `2px solid ${displayColor}44`,
            fontSize: 'clamp(16px, 1.8vw, 24px)', fontWeight: 800,
            color: `${displayColor}cc`, letterSpacing: '0.08em',
            marginBottom: 28,
            animation: hasRoundTransition ? undefined : 'contentReveal 0.4s ease 0.1s both',
            transition: 'background 500ms ease, border-color 500ms ease, color 500ms ease',
            position: 'relative', zIndex: 5,
          }}>
            {lang === 'de'
              ? `Runde ${displayGpi} von ${s.totalPhases}`
              : `Round ${displayGpi} of ${s.totalPhases}`}
          </div>

          {/* Shockwave burst behind title — nur beim klassischen BAM, nicht während Transition (stört sonst) */}
          <div style={{ position: 'relative', zIndex: 5 }}>
            {!hasRoundTransition && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                width: 200, height: 200, marginLeft: -100, marginTop: -100,
                borderRadius: '50%',
                border: `3px solid ${displayColor}66`,
                animation: 'roundShockwave 0.8s cubic-bezier(0,0,0.2,1) 0.2s both',
                pointerEvents: 'none',
              }} />
            )}
            {/* Round name — Ziffer-Flip / Finale-Wort-Roll / BAM.
                overflow:hidden nur waehrend der Transition, sonst bleibt
                ein sichtbares Clip-Rechteck um das FINALE-Wort stehen. */}
            {isFinaleTransition ? (
              <div style={{
                fontFamily: fontFam,
                fontSize: 'clamp(80px, 14vw, 200px)', fontWeight: 900, lineHeight: 1,
                textAlign: 'center',
                position: 'relative', display: 'inline-block',
                overflow: transitioning ? 'hidden' : 'visible',
                // Padding-x fängt Drop-Shadow + letterSpacing-Breite des FINALE-Worts ab,
                // sonst wird das letzte 'E' rechts abgeschnitten.
                padding: '0 0.18em 0.18em',
                animation: 'roundBreathe 4s ease-in-out 2s infinite',
              }}>
                {/* Sizer (unsichtbar) – trägt Breite/Baseline des FINALE-Worts.
                    MUSS dasselbe letterSpacing wie der animierte Span haben, sonst
                    kollabiert der Container. */}
                <span style={{ visibility: 'hidden', letterSpacing: '0.04em' }}>{finaleWord}</span>
                {/* Alte "Runde N" fällt – synchron zur Subtitle-Fall-Animation */}
                <span style={{
                  position: 'absolute', left: 0, top: 0, right: 0, textAlign: 'center',
                  color: prevColor,
                  textShadow: `0 0 120px ${prevColor}33`,
                  animation: 'roundDigitFall 760ms cubic-bezier(0.4, 0, 0.6, 1) 1150ms both',
                }}>{prevRoundFull}</span>
                {/* FINALE rollt von oben – mit Gold-Gradient */}
                <span style={{
                  position: 'absolute', left: 0, top: 0, right: 0, textAlign: 'center',
                  backgroundImage: 'linear-gradient(180deg, #FDE68A 0%, #F59E0B 45%, #D97706 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent',
                  letterSpacing: '0.04em',
                  textShadow: `0 0 80px #F59E0B55`,
                  filter: 'drop-shadow(0 12px 0 rgba(180,83,9,0.35))',
                  animation: 'roundDigitRoll 820ms cubic-bezier(0.16, 1, 0.3, 1) 1650ms both',
                }}>{finaleWord}</span>
              </div>
            ) : canDigitFlip ? (
              <div style={{
                fontFamily: fontFam,
                fontSize: 'clamp(100px, 18vw, 260px)', fontWeight: 900, lineHeight: 1,
                textShadow: `0 0 120px ${color}33`,
                textAlign: 'center',
                display: 'inline-flex', alignItems: 'baseline', justifyContent: 'center',
                gap: '0.18em',
                animation: 'roundBreathe 4s ease-in-out 2s infinite',
              }}>
                {/* Wort "Runde": Farb-Sweep von Grau auf Kategorie-Farbe (parallel zur Ziffer) */}
                <span style={{
                  display: 'inline-block',
                  backgroundImage: `linear-gradient(90deg, ${color} 0%, ${color} 35%, #94a3b8 65%, #94a3b8 100%)`,
                  backgroundSize: '300% 100%',
                  backgroundPosition: '100% 0',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent',
                  animation: 'roundWordSweep 1100ms cubic-bezier(0.65, 0, 0.35, 1) 1100ms both',
                }}>{titleWord}</span>
                {/* Ziffern-Flip-Container — startet NACH dem Wolf-Hop (Hop landet ~1100ms).
                    overflow:hidden nur waehrend der Transition — sonst bleibt ein
                    sichtbares Clip-Rechteck um die Ziffer stehen. */}
                <span style={{
                  position: 'relative', display: 'inline-block',
                  overflow: transitioning ? 'hidden' : 'visible',
                  paddingBottom: '0.15em',
                  lineHeight: 1,
                  color: color,
                  transition: 'color 600ms ease',
                }}>
                  {/* Unsichtbarer Sizer — trägt die Baseline + Breite des neuen Digits */}
                  <span style={{ visibility: 'hidden' }}>{newDigit}</span>
                  {/* Alte Ziffer fällt — startet, sobald der Wolf gelandet ist */}
                  <span style={{
                    position: 'absolute', left: 0, top: 0, right: 0, textAlign: 'center',
                    color: prevColor,
                    animation: 'roundDigitFall 760ms cubic-bezier(0.4, 0, 0.6, 1) 1150ms both',
                  }}>{prevDigit}</span>
                  {/* Neue Ziffer rollt von oben */}
                  <span style={{
                    position: 'absolute', left: 0, top: 0, right: 0, textAlign: 'center',
                    animation: 'roundDigitRoll 820ms cubic-bezier(0.16, 1, 0.3, 1) 1650ms both',
                  }}>{newDigit}</span>
                </span>
              </div>
            ) : (
              <div style={{
                fontFamily: fontFam,
                fontSize: 'clamp(100px, 18vw, 260px)', fontWeight: 900, lineHeight: 0.9,
                color,
                textShadow: `0 0 120px ${color}44`,
                textAlign: 'center',
                animation: 'roundBam 0.65s cubic-bezier(0.22,1,0.36,1) 0.15s both, roundBreathe 4s ease-in-out 1.2s infinite',
              }}>
                {phaseName}
              </div>
            )}
          </div>

          {/* Divider line with glow + shimmer */}
          <div style={{
            width: 'clamp(240px, 35vw, 500px)', height: 5, borderRadius: 3,
            background: `linear-gradient(90deg, transparent, ${displayColor}, transparent)`,
            backgroundSize: '200% 100%',
            marginTop: 28, marginBottom: 28,
            transformOrigin: 'center',
            animation: hasRoundTransition
              ? 'lineShimmer 3s linear 1.5s infinite'
              : 'roundLineGlow 0.7s cubic-bezier(0.34,1.2,0.64,1) 0.5s both, lineShimmer 3s linear 1.5s infinite',
            boxShadow: `0 0 20px ${displayColor}55, 0 0 40px ${displayColor}22`,
            transition: 'box-shadow 500ms ease',
            position: 'relative', zIndex: 5,
          }} />

          {/* Mission subtitle — bei Round-Transition rollt der alte Text raus und der neue rein (synchron zur Ziffer).
              overflow:hidden nur waehrend der Transition, sonst bleibt ein
              Clip-Rechteck um den Subtitle stehen. */}
          {hasRoundTransition ? (
            <div style={{
              fontFamily: fontFam,
              fontSize: 'clamp(36px, 5vw, 68px)', fontWeight: 900,
              textShadow: `0 0 30px ${color}33`,
              position: 'relative', zIndex: 5,
              textAlign: 'center',
              display: 'inline-block',
              overflow: transitioning ? 'hidden' : 'visible',
              paddingBottom: '0.2em',
            }}>
              {/* Sizer (unsichtbar) — trägt die Baseline + Breite des neuen Subtitle */}
              <span style={{ visibility: 'hidden' }}>{phaseDesc}</span>
              {/* Alter Subtitle fällt — synchron zur alten Ziffer */}
              <span style={{
                position: 'absolute', left: 0, right: 0, top: 0, textAlign: 'center',
                color: `${prevColor}dd`,
                animation: 'roundDigitFall 760ms cubic-bezier(0.4, 0, 0.6, 1) 1150ms both',
              }}>{prevPhaseDesc}</span>
              {/* Neuer Subtitle rollt von oben — synchron zur neuen Ziffer */}
              <span style={{
                position: 'absolute', left: 0, right: 0, top: 0, textAlign: 'center',
                color: `${color}dd`,
                animation: 'roundDigitRoll 820ms cubic-bezier(0.16, 1, 0.3, 1) 1650ms both',
              }}>{phaseDesc}</span>
            </div>
          ) : (
            <div style={{
              fontFamily: fontFam,
              fontSize: 'clamp(36px, 5vw, 68px)', fontWeight: 900,
              color: `${displayColor}dd`,
              textShadow: `0 0 30px ${displayColor}33`,
              animation: 'subtitleSlide 0.55s cubic-bezier(0.34,1.4,0.64,1) 0.7s both',
              transition: 'color 500ms ease, text-shadow 500ms ease',
              position: 'relative', zIndex: 5,
              textAlign: 'center',
            }}>
              {displayPhaseDesc}
            </div>
          )}

          {/* Fortschrittsbaum — während Transition zeigt er den letzten Dot der
              vorherigen Runde, nach ~450ms swappt er auf die neue Runde →
              Amber-Linie wächst smooth zum ersten Dot rüber. */}
          <div style={{
            marginTop: 36,
            animation: hasRoundTransition ? undefined : 'contentReveal 0.6s ease 1.0s both',
            position: 'relative', zIndex: 5,
          }}>
            <QQProgressTree state={displayTreeState} variant="inline" />
          </div>
        </>
      ) : isFirstOfRound && s.introStep === 1 ? (
        /* ── Step 1: Rule reminder (what's new this round) ── */
        <>
          {/* Round pill — smaller context */}
          <div style={{
            padding: '6px 20px', borderRadius: 999,
            background: `${color}15`, border: `1.5px solid ${color}33`,
            fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 800,
            color: `${color}aa`, letterSpacing: '0.06em',
            marginBottom: 24,
            animation: 'contentReveal 0.4s ease 0.1s both',
            position: 'relative', zIndex: 5,
          }}>
            {phaseName}
          </div>

          {/* Big emoji — R3+R4 zeigen Stapel-Pin als Highlight (Trinity-Mechanik) */}
          <div style={{
            fontSize: 'clamp(72px, 12vw, 140px)',
            animation: 'phasePop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.15s both, cfloat 4s ease-in-out 1s infinite',
            position: 'relative', zIndex: 5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {(s.gamePhaseIndex === 3 || s.gamePhaseIndex === 4) ? (
              <QQEmojiIcon emoji="🏯" />
            ) : (
              roundRules.emoji
            )}
          </div>

          {/* "NEU" badge (skip for round 1) */}
          {s.gamePhaseIndex > 1 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 22px', borderRadius: 999,
              background: `${color}25`, border: `2px solid ${color}55`,
              fontSize: 'clamp(18px, 2vw, 28px)', fontWeight: 900,
              color, letterSpacing: '0.12em', textTransform: 'uppercase',
              marginTop: 20, marginBottom: 8,
              animation: 'phasePop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.3s both',
              position: 'relative', zIndex: 5,
            }}>
              {lang === 'de' ? '✨ NEU' : '✨ NEW'}
            </div>
          )}

          {/* Aktionen-Bereich — kleiner Header, dann Karten als Hauptinhalt.
              Vorher: zwei dicke Textzeilen mit redundanter Wiederholung der
              Action-Card-Subtexte. Jetzt: Cards sprechen fuer sich. */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            marginTop: s.gamePhaseIndex === 1 ? 24 : 12,
            position: 'relative', zIndex: 5,
          }}>
            {/* Schlankes Label statt riesiger Regel-Texte */}
            <div style={{
              fontSize: 'clamp(13px, 1.4vw, 20px)', fontWeight: 800,
              color: `${color}cc`, letterSpacing: '0.18em', textTransform: 'uppercase',
              textAlign: 'center',
              animation: 'phasePop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.4s both',
            }}>
              {(() => {
                // Erste Regel-Zeile als Untertitel — sie beschreibt das Was kompakt.
                const lead = (lang === 'en' ? roundRules.en : roundRules.de)[0];
                return lead;
              })()}
            </div>
            {/* Action-Cards mit explizitem Counter (×N) pro Aktion. Cards werden je
                nach Runde dynamisch zusammengestellt — eine Wahl pro richtige
                Antwort. Limits (max X pro Runde / Spiel) als Footer-Pill je Card. */}
            {(() => {
              type ActionCardData = {
                count: number;
                emoji?: string;
                slug?: 'marker-sanduhr' | 'marker-shield' | 'marker-swap';
                label: string;
                limit?: string;
                accent: string;
              };
              const ph = s.gamePhaseIndex;
              const cards: ActionCardData[] =
                ph === 1
                  ? [
                      { count: 1, emoji: '📍', label: lang === 'en' ? 'Place' : 'Platzieren', accent: color },
                    ]
                  : ph === 2
                  ? [
                      { count: 2, emoji: '📍', label: lang === 'en' ? 'Place' : 'Platzieren', accent: color },
                      { count: 1, emoji: '⚡', label: lang === 'en' ? 'Steal' : 'Klauen',
                        limit: lang === 'en' ? 'max 2x per round' : 'max 2x pro Runde',
                        accent: '#F59E0B' },
                    ]
                  : (ph === 3 || ph === 4)
                  ? [
                      { count: 2, emoji: '📍', label: lang === 'en' ? 'Place' : 'Platzieren',
                        limit: lang === 'en' ? 'while free cells' : 'wenn Feld frei',
                        accent: color },
                      { count: 1, emoji: '⚡', label: lang === 'en' ? 'Steal' : 'Klauen', accent: '#F59E0B' },
                      { count: 1, emoji: '🏯', label: lang === 'en' ? 'Stack' : 'Stapeln',
                        limit: lang === 'en' ? '+1 pt · max 3 per game' : '+1 Pkt · max 3 pro Spiel',
                        accent: '#06B6D4' },
                    ]
                  : [];
              // Cards alle gleich gross + mittig + prominent. Statt 'compact-Modus'
              // bei vielen Cards behalten wir EINE Groesse und lassen flex die Breite
              // gleich verteilen. align-items: stretch sorgt fuer gleiche Hoehen.
              const oder = lang === 'en' ? 'or' : 'oder';
              const cardCount = cards.length;
              // Single-Card → zentriert mit max-Breite, multi → flex evenly
              return (
                <div style={{
                  flex: 1, minHeight: 0,
                  marginTop: 'clamp(20px, 3vh, 40px)',
                  display: 'flex', flexDirection: 'row', flexWrap: 'wrap',
                  alignItems: 'stretch', justifyContent: 'center',
                  gap: 'clamp(10px, 1.6vw, 24px)',
                  width: '100%', maxWidth: 1700,
                  animation: 'phasePop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.85s both',
                }}>
                  {cards.map((c, i) => {
                    const iconSize = 'clamp(72px, 8.5vw, 132px)';
                    const iconNode = c.slug
                      ? <QQIcon slug={c.slug} size={iconSize} alt={c.label} />
                      : <QQEmojiIcon emoji={c.emoji ?? '?'} />;
                    return (
                      <Fragment key={i}>
                        {i > 0 && (
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 'clamp(15px, 1.6vw, 22px)',
                            fontWeight: 900, color: '#94a3b8',
                            letterSpacing: '0.1em', textTransform: 'uppercase',
                            flex: '0 0 auto',
                          }}>{oder}</div>
                        )}
                        <div style={{
                          flex: cardCount === 1 ? '0 1 auto' : '1 1 0',
                          minWidth: cardCount === 1 ? 280 : 200,
                          maxWidth: cardCount === 1 ? 480 : 360,
                          display: 'flex', flexDirection: 'column', alignItems: 'center',
                          justifyContent: 'center',
                          gap: 'clamp(8px, 1.2vh, 16px)',
                          padding: 'clamp(20px, 2.4vh, 36px) clamp(20px, 2vw, 32px)',
                          borderRadius: 24,
                          background: `linear-gradient(180deg, ${c.accent}28, ${c.accent}10)`,
                          border: `3px solid ${c.accent}aa`,
                          boxShadow: `0 0 40px ${c.accent}44, 0 8px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)`,
                        }}>
                          {/* Icon — gross + drop-shadow als Fokus-Element */}
                          <div style={{
                            fontSize: iconSize,
                            lineHeight: 1,
                            filter: `drop-shadow(0 6px 18px ${c.accent}66)`,
                          }}>{iconNode}</div>
                          {/* Counter + Label kombiniert — das Hauptinfo-Token */}
                          <div style={{
                            display: 'flex', alignItems: 'baseline',
                            gap: 'clamp(6px, 0.8vw, 12px)',
                            fontWeight: 900, lineHeight: 1,
                            flexWrap: 'wrap', justifyContent: 'center',
                          }}>
                            <span style={{
                              fontSize: 'clamp(36px, 4.2vw, 64px)',
                              color: c.accent,
                              fontVariantNumeric: 'tabular-nums',
                              textShadow: `0 0 22px ${c.accent}77, 0 2px 0 rgba(0,0,0,0.3)`,
                            }}>{c.count}x</span>
                            <span style={{
                              fontSize: 'clamp(28px, 3.2vw, 48px)',
                              color: '#F1F5F9',
                              letterSpacing: '0.01em',
                            }}>{c.label}</span>
                          </div>
                          {/* Sub-Zeile */}
                          <div style={{
                            fontSize: 'clamp(13px, 1.4vw, 19px)',
                            fontWeight: 700, color: '#cbd5e1',
                            textAlign: 'center', lineHeight: 1.25,
                            opacity: 0.85,
                          }}>
                            {lang === 'en' ? 'per correct answer' : 'pro richtige Antwort'}
                          </div>
                          {c.limit && (
                            <div style={{
                              marginTop: 4,
                              padding: '5px 14px', borderRadius: 999,
                              background: 'rgba(15,23,42,0.6)',
                              border: `1.5px solid ${c.accent}66`,
                              fontSize: 'clamp(11px, 1.15vw, 15px)',
                              fontWeight: 800, color: '#e2e8f0',
                              whiteSpace: 'nowrap',
                              boxShadow: `0 2px 8px ${c.accent}22`,
                            }}>
                              {c.limit}
                            </div>
                          )}
                        </div>
                      </Fragment>
                    );
                  })}
                </div>
              );
            })()}
            {/* (per-Runde Card-Bloecke entfernt — werden durch unified IIFE oben generiert) */}
          </div>
        </>
      ) : s.categoryIsNew ? (
        /* ── Category explanation (first time this category/mechanic appears) ── */
        (() => {
          // Detailed explanations per category (and BUNTE_TUETE sub-kinds)
          const btKind = s.currentQuestion?.bunteTuete?.kind;
          const CAT_INTRO: Record<string, { emoji: string; title: { de: string; en: string }; lines: { de: string[]; en: string[] } }> = {
            SCHAETZCHEN: {
              emoji: catEmoji, title: { de: 'Schätzchen', en: 'Close Call' },
              lines: {
                de: ['Wer am nächsten dran liegt, gewinnt — knapp dran zählt auch.'],
                en: ['Closest guess wins — near misses also count.'],
              },
            },
            MUCHO: {
              emoji: catEmoji, title: { de: 'Mu-Cho', en: 'Mu-Cho' },
              lines: {
                de: ['4 Antworten, 1 richtige. Speed entscheidet.'],
                en: ['4 options, 1 right. Speed decides.'],
              },
            },
            ZEHN_VON_ZEHN: {
              emoji: catEmoji, title: { de: '10 von 10', en: 'All In' },
              lines: {
                de: ['Verteilt 10 Punkte auf 3 Antworten.'],
                en: ['Spread 10 points across 3 answers.'],
              },
            },
            CHEESE: {
              emoji: catEmoji, title: { de: 'Picture This', en: 'Picture This' },
              lines: {
                de: ['Erkennt das Bild — tippt die Antwort ins Handy.'],
                en: ['Spot the image — type your answer.'],
              },
            },
            // BUNTE_TUETE sub-mechanics
            'BUNTE_TUETE:top5': {
              emoji: '🏆', title: { de: 'Top 5', en: 'Top 5' },
              lines: {
                de: ['Bis zu 5 Antworten — meiste Treffer gewinnt.'],
                en: ['Up to 5 answers — most hits wins.'],
              },
            },
            'BUNTE_TUETE:oneOfEight': {
              emoji: '🕵️', title: { de: 'Imposter', en: 'Imposter' },
              lines: {
                de: ['Unter 8 Aussagen ist eine falsch. Findet sie.'],
                en: ['One of 8 statements is false. Find it.'],
              },
            },
            'BUNTE_TUETE:order': {
              emoji: '📊', title: { de: 'Reihenfolge', en: 'Order' },
              lines: {
                de: ['Sortiert richtig — meiste Treffer gewinnt.'],
                en: ['Sort correctly — most hits wins.'],
              },
            },
            'BUNTE_TUETE:map': {
              emoji: '🗺️', title: { de: 'CozyGuessr', en: 'CozyGuessr' },
              lines: {
                de: ['Tippt den Ort auf der Karte — nächstes Team gewinnt.'],
                en: ['Pin the spot on the map — closest team wins.'],
              },
            },
            'BUNTE_TUETE:hotPotato': {
              emoji: '🥔', title: { de: 'Heiße Kartoffel', en: 'Hot Potato' },
              lines: {
                de: ['Reihum antworten — wer hängt verliert'],
                en: ['Take turns — first to stall is out'],
              },
            },
            'BUNTE_TUETE:onlyConnect': {
              emoji: '🧩', title: { de: '4 gewinnt', en: 'Only Connect' },
              lines: {
                de: ['4 Hinweise, eine Lösung — wer früher tippt, holt mehr Punkte.'],
                en: ['4 clues, one answer — guess earlier for more points.'],
              },
            },
            'BUNTE_TUETE:bluff': {
              emoji: '🎭', title: { de: 'Bluff', en: 'Bluff' },
              lines: {
                de: ['Erfindet plausible Falsch-Antworten und ratet die echte.'],
                en: ['Invent plausible fake answers — then spot the real one.'],
              },
            },
          };

          const key = cat === 'BUNTE_TUETE' && btKind ? `BUNTE_TUETE:${btKind}` : (cat ?? '');
          const info = CAT_INTRO[key] ?? CAT_INTRO[cat ?? ''];
          if (!info) return null;

          return (
            <>
              {/* Category pill — zwei Zeilen: Runde + Fragen-Fortschritt */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '8px 22px', borderRadius: 18,
                background: `${catColor}15`, border: `1.5px solid ${catColor}33`,
                color: `${catColor}aa`, letterSpacing: '0.06em',
                marginBottom: 16,
                animation: 'contentReveal 0.4s ease 0.1s both',
                position: 'relative', zIndex: 5,
              }}>
                <div style={{
                  fontSize: 'clamp(11px, 1.2vw, 16px)', fontWeight: 800,
                  opacity: 0.8, textTransform: 'uppercase',
                }}>
                  {lang === 'de' ? `Runde ${s.gamePhaseIndex}` : `Round ${s.gamePhaseIndex}`}
                </div>
                <div style={{
                  fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 800,
                }}>
                  {lang === 'de' ? `Frage ${questionInPhase} von 5` : `Question ${questionInPhase} of 5`}
                </div>
              </div>

              {/* Runden-Mini-Tree mit Wolf-Hop — zeigt Position innerhalb der aktuellen Runde */}
              <div style={{
                marginBottom: 20,
                animation: 'phasePop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.12s both',
                position: 'relative', zIndex: 5,
              }}>
                <RoundMiniTree state={s} catColor={catColor} />
              </div>

              {/* Big emoji/icon — bevorzugt PNG, sonst Emoji-Fallback */}
              <div style={{
                fontSize: 'clamp(72px, 12vw, 140px)', lineHeight: 1,
                animation: 'phasePop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.15s both, cfloat 4s ease-in-out 1s infinite',
                position: 'relative', zIndex: 5,
              }}>
                {(() => {
                  const subSlug = btKind ? qqSubSlug(btKind) : null;
                  const catSlug = cat ? qqCatSlug(cat as string) : null;
                  const slug = subSlug ?? catSlug;
                  return slug
                    ? <QQIcon slug={slug} size={'clamp(110px, 16vw, 200px)'} alt={info.title.de} />
                    : info.emoji;
                })()}
              </div>

              {/* Category/mechanic name — 3D-Stack-Look mit layered glow.
                  (User-Wunsch 2026-04-28: 'kategorie intro text mit nicem
                  Glow oder 3D'). Mehrere textShadow-Layer ergeben:
                  - Inner-Glow (kräftig, scharf um den Buchstaben)
                  - Mid-Glow (weicher, bunt)
                  - Ambient (dezenter Schein in den Hintergrund)
                  - 3D-Drop (harte schwarze Kante darunter = Tiefe)
                  - Soft-Drop (weiche Schattenwolke = Räumlichkeit) */}
              <div style={{
                fontFamily: fontFam,
                fontSize: 'clamp(56px, 10vw, 160px)', fontWeight: 900, lineHeight: 1,
                color: catColor,
                textShadow:
                  `0 0 14px ${catColor}99, ` +
                  `0 0 40px ${catColor}66, ` +
                  `0 0 96px ${catColor}33, ` +
                  `0 5px 0 rgba(0,0,0,0.45), ` +
                  `0 14px 28px rgba(0,0,0,0.55)`,
                marginTop: 12,
                animation: 'phasePop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.3s both, qqCatTitleBreathe 4.5s ease-in-out 1.2s infinite',
                position: 'relative', zIndex: 5,
                textAlign: 'center',
                letterSpacing: '-0.005em',
                willChange: 'text-shadow, transform',
              }}>{info.title[lang]}</div>

              {/* Explanation lines */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                marginTop: 24, position: 'relative', zIndex: 5,
              }}>
                {info.lines[lang].map((line, i) => (
                  <div key={i} style={{
                    fontSize: i === 0 ? 'clamp(26px, 3.5vw, 48px)' : 'clamp(20px, 2.5vw, 36px)',
                    fontWeight: i === 0 ? 800 : 600,
                    color: i === 0 ? '#F1F5F9' : `${catColor}99`,
                    textAlign: 'center',
                    animation: `phasePop 0.6s cubic-bezier(0.34,1.56,0.64,1) ${0.5 + i * 0.15}s both`,
                  }}>
                    {line}
                  </div>
                ))}
              </div>

              {/* User-Wunsch 2026-04-28: 'Antwort auf dem Handy' Hint überall
                  raus — auf dem Beamer redundant, auf dem Handy doppelt. */}
            </>
          );
        })()
      ) : (
        /* ── Category reveal (no explanation needed — already seen) ── */
        <>
          {/* Question progress: "Frage 2 von 5" + Runden-Mini-Tree mit Wolf */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            marginBottom: 28,
            animation: 'phasePop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both',
            position: 'relative', zIndex: 5,
          }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
              <div style={{
                fontSize: 'clamp(13px, 1.6vw, 20px)', fontWeight: 800,
                color: `${catColor}99`, letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                {lang === 'de' ? `Runde ${s.gamePhaseIndex}` : `Round ${s.gamePhaseIndex}`}
              </div>
              <div style={{
                fontSize: 'clamp(22px, 2.8vw, 36px)', fontWeight: 800,
                color: catColor, letterSpacing: '0.08em',
              }}>
                {lang === 'de' ? `Frage ${questionInPhase} von 5` : `Question ${questionInPhase} of 5`}
              </div>
            </div>
            <RoundMiniTree state={s} catColor={catColor} />
          </div>

          {cat && (
            <>
              {/* Emoji/Icon — float idle. Bei BUNTE_TUETE: Sub-Mechanik-Icon
                  (sonst sähen 4 gewinnt, Bluff, Hot Potato … alle gleich aus). */}
              <div style={{
                fontSize: 'clamp(80px, 14vw, 180px)', lineHeight: 1,
                animation: 'phasePop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.25s both, cfloat 4s ease-in-out 1s infinite',
                position: 'relative', zIndex: 5,
              }}>
                {(() => {
                  const subSlug = bunteKind ? qqSubSlug(bunteKind) : null;
                  const slug = subSlug ?? qqCatSlug(cat as string);
                  if (slug) return <QQIcon slug={slug} size={'clamp(120px, 18vw, 240px)'} alt={catLabel} />;
                  return catEmoji;
                })()}
              </div>

              {/* Category name — glow pulse idle */}
              <div style={{
                fontFamily: fontFam,
                fontSize: 'clamp(68px, 13vw, 200px)', fontWeight: 900, lineHeight: 1,
                color: catColor,
                textShadow: `0 0 80px ${catColor}44`,
                marginTop: 12,
                animation: 'phasePop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.4s both, qqGlow 3s ease-in-out 1.2s infinite',
                position: 'relative', zIndex: 5,
                textAlign: 'center',
              }}>{catLabel}</div>

              {/* Category explanation — 1 line */}
              {catExplain && (
                <div style={{
                  fontFamily: "'Caveat', cursive",
                  fontSize: 'clamp(28px, 3.5vw, 48px)', fontWeight: 700,
                  color: `${catColor}88`,
                  marginTop: 16,
                  animation: 'phasePop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.65s both',
                  position: 'relative', zIndex: 5,
                  textAlign: 'center',
                }}>
                  {catExplain}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEAM ANSWER REVEAL — shared block rendered in right panel
// ═══════════════════════════════════════════════════════════════════════════════
function TeamAnswerReveal({ s, q, lang, cardBg, accent }: {
  s: QQStateUpdate; q: NonNullable<QQStateUpdate['currentQuestion']>;
  lang: 'de' | 'en'; cardBg: string; accent: string;
}) {
  if (!s.answers.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Schätzchen — target banner + estimates with delta bars */}
      {q.category === 'SCHAETZCHEN' && (() => {
        const scored = [...s.answers].map(a => {
          const num = Number(a.text.replace(/[^0-9.,\-]/g, '').replace(',', '.'));
          const team = s.teams.find(t => t.id === a.teamId);
          const distance = Number.isNaN(num) || q.targetValue == null ? Infinity : Math.abs(num - q.targetValue);
          return { ...a, num, distance, team };
        }).sort((a, b) => a.distance - b.distance);
        const maxDistance = Math.max(1, ...scored.filter(s => Number.isFinite(s.distance)).map(s => s.distance));
        const unitStr = (q as any).unit ?? '';
        // Jahreszahlen ohne Tausenderpunkt — sonst sieht 1500 wie 1,5 aus.
        const isYearUnit = /jahr|year/i.test(unitStr);
        const targetStr = q.targetValue != null
          ? (isYearUnit ? String(Math.round(q.targetValue)) : q.targetValue.toLocaleString('de-DE'))
          : '—';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'contentReveal 0.5s ease 0.1s both' }}>
            {/* Target banner */}
            <div style={{
              padding: '14px 20px', borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(251,191,36,0.22), rgba(245,158,11,0.10))',
              border: '2px solid rgba(251,191,36,0.55)',
              boxShadow: '0 0 0 3px rgba(251,191,36,0.12), 0 8px 24px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
              animation: 'revealAnswerBam 0.55s cubic-bezier(0.22,1,0.36,1) both',
            }}>
              <span style={{ fontSize: 'clamp(22px, 2.6vw, 34px)' }}><QQEmojiIcon emoji="🎯"/></span>
              <span style={{
                fontSize: 'clamp(14px, 1.4vw, 18px)', fontWeight: 900,
                color: '#FDE68A', letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>{lang === 'en' ? 'Target' : 'Lösung'}</span>
              <span style={{
                fontSize: 'clamp(30px, 4vw, 56px)', fontWeight: 900,
                color: '#FBBF24',
                textShadow: '0 2px 12px rgba(251,191,36,0.45)',
              }}>
                {targetStr}{unitStr ? ` ${unitStr}` : ''}
              </span>
            </div>

            {/* Estimates list with delta bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {scored.map((a, i) => {
                const isWinner = i === 0;
                const pct = Number.isFinite(a.distance) ? (a.distance / maxDistance) * 100 : 100;
                const distStr = Number.isFinite(a.distance)
                  ? `Δ ${isYearUnit ? String(Math.round(a.distance)) : a.distance.toLocaleString('de-DE')}${unitStr ? ` ${unitStr}` : ''}`
                  : '—';
                return (
                  <div key={a.teamId} style={{
                    position: 'relative', overflow: 'hidden',
                    padding: '10px 14px', borderRadius: 12,
                    background: isWinner
                      ? 'linear-gradient(135deg, rgba(34,197,94,0.14), rgba(22,163,74,0.06))'
                      : 'rgba(255,255,255,0.035)',
                    border: isWinner ? '2px solid rgba(34,197,94,0.55)' : '1.5px solid rgba(255,255,255,0.08)',
                    boxShadow: isWinner ? '0 0 0 3px rgba(34,197,94,0.12)' : 'none',
                    animation: `contentReveal 0.4s ease ${0.2 + i * 0.08}s both`,
                  }}>
                    {/* Distance bar (background) */}
                    {Number.isFinite(a.distance) && (
                      <div style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: `${100 - pct}%`,
                        background: isWinner
                          ? 'linear-gradient(90deg, rgba(34,197,94,0.22), rgba(34,197,94,0.04))'
                          : `linear-gradient(90deg, ${a.team?.color ?? '#64748b'}30, transparent)`,
                        transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
                      }} />
                    )}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{
                        width: 'clamp(26px, 2.8vw, 34px)', height: 'clamp(26px, 2.8vw, 34px)',
                        borderRadius: 8,
                        background: isWinner ? 'linear-gradient(135deg,#FBBF24,#F59E0B)' : 'rgba(100,116,139,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 'clamp(12px, 1.3vw, 16px)', fontWeight: 900, color: '#fff',
                        flexShrink: 0,
                      }}>
                        {isWinner ? <QQEmojiIcon emoji="🥇"/> : `#${i + 1}`}
                      </span>
                      {a.team && (
                        <QQTeamAvatar avatarId={a.team.avatarId} size={'clamp(28px, 3vw, 38px)'} style={{ flexShrink: 0 }} />
                      )}
                      <span style={{
                        fontWeight: 900, fontSize: 'clamp(14px, 1.5vw, 20px)',
                        color: a.team?.color ?? '#e2e8f0', flex: '0 1 auto',
                      }}>{a.team?.name ?? a.teamId}</span>
                      <span style={{
                        flex: 1, textAlign: 'right',
                        fontSize: 'clamp(18px, 2.2vw, 30px)', fontWeight: 900,
                        color: isWinner ? '#4ade80' : '#e2e8f0',
                      }}>
                        {a.text}{unitStr ? ` ${unitStr}` : ''}
                      </span>
                      <span style={{
                        minWidth: 'clamp(64px, 8vw, 110px)', textAlign: 'right',
                        fontFamily: "'Caveat', cursive",
                        fontSize: 'clamp(14px, 1.5vw, 20px)',
                        color: isWinner ? '#86efac' : '#64748b', fontWeight: 700,
                      }}>
                        {distStr}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* MUCHO: who chose which option */}
      {q.category === 'MUCHO' && q.options && (() => {
        const correctVoters = q.correctOptionIndex != null
          ? s.answers
              .filter(a => a.text === String(q.correctOptionIndex))
              .sort((a, b) => a.submittedAt - b.submittedAt)
          : [];
        const showSpeedRank = correctVoters.length > 1;
        const speedRank: Record<string, number> = {};
        correctVoters.forEach((a, i) => { speedRank[a.teamId] = i + 1; });
        const t0 = s.timerEndsAt ? s.timerEndsAt - (s.timerDurationSec * 1000) : (correctVoters[0]?.submittedAt ?? 0);
        const MUCHO_COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#22C55E'];

        return (
          <div style={{ animation: 'contentReveal 0.5s ease 0.1s both', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {q.options!.map((optText, optIdx) => {
              const voters = s.answers
                .filter(a => a.text === String(optIdx))
                .sort((a, b) => a.submittedAt - b.submittedAt)
                .map(a => ({ team: s.teams.find(t => t.id === a.teamId), answer: a }))
                .filter((v): v is { team: NonNullable<typeof v.team>; answer: typeof v.answer } => !!v.team);
              const isCorrect = optIdx === q.correctOptionIndex;
              const optColor = MUCHO_COLORS[optIdx] ?? '#475569';
              return (
                <div key={optIdx} style={{
                  display: 'flex', alignItems: 'stretch', gap: 0,
                  borderRadius: 14, overflow: 'hidden',
                  background: isCorrect ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.035)',
                  border: isCorrect ? '2px solid rgba(34,197,94,0.55)' : '1.5px solid rgba(255,255,255,0.08)',
                  boxShadow: isCorrect ? '0 0 0 3px rgba(34,197,94,0.12)' : 'none',
                  animation: `contentReveal 0.4s ease ${0.1 + optIdx * 0.07}s both`,
                  minHeight: 54,
                }}>
                  <div style={{
                    width: 'clamp(44px, 5vw, 64px)', background: optColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'clamp(18px, 2.2vw, 28px)', fontWeight: 900, color: '#fff',
                    flexShrink: 0,
                  }}>
                    {['A','B','C','D'][optIdx] ?? optIdx + 1}
                  </div>
                  <div style={{
                    flex: 1, padding: '8px 14px',
                    display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                  }}>
                    <span style={{
                      fontSize: 'clamp(14px, 1.6vw, 20px)', fontWeight: 800,
                      color: isCorrect ? '#86efac' : '#cbd5e1',
                      minWidth: 0, flex: '0 1 auto',
                    }}>
                      {optText}
                    </span>
                    {voters.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' }}>
                        {voters.map(({ team: tm }, vi) => (
                          <div key={tm.id} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '4px 10px 4px 4px', borderRadius: 999,
                            background: 'rgba(0,0,0,0.28)',
                            border: `1.5px solid ${tm.color}`,
                            animation: `contentReveal 0.3s ease ${vi * 0.08}s both`,
                          }}>
                            <QQTeamAvatar avatarId={tm.avatarId} size={'clamp(26px, 3vw, 36px)'} />
                            <span style={{ fontSize: 'clamp(12px, 1.3vw, 16px)', fontWeight: 800, color: tm.color }}>{tm.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Speed ranking row for correct voters (ties) */}
            {showSpeedRank && (
              <div style={{
                marginTop: 6, padding: '10px 14px', borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(234,179,8,0.06))',
                border: '1.5px solid rgba(251,191,36,0.35)',
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                animation: `contentReveal 0.4s ease ${0.1 + q.options!.length * 0.07 + 0.1}s both`,
              }}>
                <span style={{
                  fontSize: 'clamp(12px, 1.2vw, 15px)', fontWeight: 900,
                  color: '#FBBF24', letterSpacing: '0.05em', textTransform: 'uppercase',
                }}><QQEmojiIcon emoji="⚡"/> Schnellster zuerst</span>
                {correctVoters.map((a, i) => {
                  const tm = s.teams.find(t => t.id === a.teamId);
                  if (!tm) return null;
                  const timeSec = t0 ? ((a.submittedAt - t0) / 1000).toFixed(1) : null;
                  const rank = i + 1;
                  return (
                    <div key={tm.id} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '4px 10px', borderRadius: 999,
                      background: rank === 1 ? 'rgba(251,191,36,0.22)' : 'rgba(0,0,0,0.28)',
                      border: rank === 1 ? '1.5px solid rgba(251,191,36,0.6)' : `1.5px solid ${tm.color}`,
                    }}>
                      <span style={{
                        fontSize: 'clamp(12px, 1.2vw, 15px)', fontWeight: 900,
                        color: rank === 1 ? '#FBBF24' : '#cbd5e1',
                      }}>#{rank}</span>
                      <QQTeamAvatar avatarId={tm.avatarId} size={'clamp(16px, 1.9vw, 22px)'} />
                      <span style={{ fontSize: 'clamp(12px, 1.3vw, 16px)', fontWeight: 800, color: tm.color }}>{tm.name}</span>
                      {timeSec && (
                        <span style={{ fontSize: 'clamp(11px, 1.1vw, 14px)', fontWeight: 700, color: '#94a3b8' }}>{timeSec}s</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ZEHN_VON_ZEHN (All-In): stacked bar per option — who put how many points */}
      {q.category === 'ZEHN_VON_ZEHN' && q.options && (() => {
        const ALLIN_COLORS = ['#3B82F6','#22C55E','#EF4444'];
        // Parse each answer to per-option point arrays
        const parsed = s.answers.map(a => {
          const pts = String(a.text ?? '').split(',').map(x => parseInt(x.trim(), 10));
          return { teamId: a.teamId, pts, submittedAt: a.submittedAt };
        }).filter(p => p.pts.length === q.options!.length && !p.pts.some(Number.isNaN));
        // Total points per option across all teams
        const totalsPerOption = q.options!.map((_, i) => parsed.reduce((sum, p) => sum + (p.pts[i] ?? 0), 0));
        const globalMax = Math.max(1, ...totalsPerOption);

        // Gewinner-Bestimmung: höchster Einsatz auf der korrekten Option, bei Tie → schnellste Einreichung gewinnt.
        const correctIdx = q.correctOptionIndex;
        let winner: { team: (typeof s.teams)[number]; pts: number; submittedAt: number; hasTie: boolean; correctOptText: string } | null = null;
        if (correctIdx != null) {
          const onCorrect = parsed
            .map(p => ({ team: s.teams.find(t => t.id === p.teamId), pts: p.pts[correctIdx] ?? 0, submittedAt: p.submittedAt }))
            .filter((x): x is { team: (typeof s.teams)[number]; pts: number; submittedAt: number } => !!x.team && x.pts > 0);
          if (onCorrect.length > 0) {
            const maxPts = Math.max(...onCorrect.map(x => x.pts));
            const topPts = onCorrect.filter(x => x.pts === maxPts);
            topPts.sort((a, b) => a.submittedAt - b.submittedAt);
            winner = {
              team: topPts[0].team,
              pts: topPts[0].pts,
              submittedAt: topPts[0].submittedAt,
              hasTie: topPts.length > 1,
              correctOptText: q.options![correctIdx] ?? '',
            };
          }
        }

        return (
          <div style={{ animation: 'contentReveal 0.5s ease 0.1s both', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {winner && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: 'clamp(10px, 1.2vh, 16px) clamp(14px, 1.6vw, 22px)',
                borderRadius: 16,
                background: `linear-gradient(135deg, ${winner.team.color}22, rgba(34,197,94,0.18))`,
                border: `2px solid ${winner.team.color}66`,
                boxShadow: `0 0 0 3px ${winner.team.color}22`,
                animation: 'revealWinnerIn 0.6s cubic-bezier(0.34,1.4,0.64,1) both',
              }}>
                <QQTeamAvatar avatarId={winner.team.avatarId} size={'clamp(44px, 4.5vw, 60px)'} style={{ flexShrink: 0, boxShadow: `0 0 20px ${winner.team.color}66` }} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{
                    fontSize: 'clamp(11px, 1vw, 14px)', fontWeight: 900, color: '#94a3b8',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>
                    <QQEmojiIcon emoji="🏆"/> {lang === 'en' ? 'Round winner' : 'Rundensieger'}
                  </div>
                  <div style={{
                    fontSize: 'clamp(16px, 1.9vw, 26px)', fontWeight: 900,
                    color: '#F1F5F9', lineHeight: 1.2,
                  }}>
                    <span style={{ color: winner.team.color }}>{winner.team.name}</span>{' '}
                    {winner.hasTie
                      ? (lang === 'en'
                          ? <>has the most points on <b>{winner.correctOptText}</b> <span style={{ color: '#4ade80' }}>(+{winner.pts})</span> and was fastest.</>
                          : <>hat die meisten Punkte auf <b>{winner.correctOptText}</b> <span style={{ color: '#4ade80' }}>(+{winner.pts})</span> und war am schnellsten.</>)
                      : (lang === 'en'
                          ? <>has the most points on <b>{winner.correctOptText}</b> <span style={{ color: '#4ade80' }}>(+{winner.pts})</span>.</>
                          : <>hat die meisten Punkte auf <b>{winner.correctOptText}</b> <span style={{ color: '#4ade80' }}>(+{winner.pts})</span>.</>)}
                  </div>
                </div>
              </div>
            )}
            {q.options!.map((optText, optIdx) => {
              const isCorrectLocked = optIdx === q.correctOptionIndex;
              const isHunterHere = false;
              const showGreen = isCorrectLocked || isHunterHere;
              const color = showGreen ? '#22C55E' : (ALLIN_COLORS[optIdx] ?? '#64748b');
              const highestTeamIds = new Set<string>();
              const highestHidden = false;
              // Team contributions on this option (only teams with >0 pts), sorted desc
              const contribs = parsed
                .map(p => ({ team: s.teams.find(t => t.id === p.teamId), pts: p.pts[optIdx] ?? 0 }))
                .filter((c): c is { team: NonNullable<typeof c.team>; pts: number } => !!c.team && c.pts > 0)
                .sort((a, b) => b.pts - a.pts);
              const totalPts = totalsPerOption[optIdx];
              // Visible contribs (vor Cascade: höchste Bets sind noch versteckt)
              const visibleContribs = highestHidden
                ? contribs.filter(c => !highestTeamIds.has(c.team.id))
                : contribs;
              const visibleTotal = visibleContribs.reduce((s, c) => s + c.pts, 0);
              const displayTotal = highestHidden ? visibleTotal : totalPts;
              const barPct = (displayTotal / globalMax) * 100;
              return (
                <div key={optIdx} style={{
                  borderRadius: 14, overflow: 'hidden',
                  background: isCorrectLocked ? 'rgba(34,197,94,0.22)'
                    : isHunterHere ? 'rgba(34,197,94,0.14)'
                    : 'rgba(255,255,255,0.035)',
                  border: showGreen ? '2px solid #22C55E' : '1.5px solid rgba(255,255,255,0.08)',
                  boxShadow: isCorrectLocked ? '0 0 44px rgba(34,197,94,0.48), 0 0 90px rgba(34,197,94,0.18)'
                    : isHunterHere ? '0 0 28px rgba(34,197,94,0.45)'
                    : 'none',
                  transform: isHunterHere ? 'scale(1.015)' : 'scale(1)',
                  transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease',
                  animation: isCorrectLocked
                    ? 'revealCorrectPop 0.6s cubic-bezier(0.34,1.4,0.64,1) both'
                    : `contentReveal 0.4s ease ${0.1 + optIdx * 0.08}s both`,
                }}>
                  {/* Row 1: label + total */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
                    <span style={{
                      width: 'clamp(36px, 4vw, 52px)', height: 'clamp(36px, 4vw, 52px)',
                      borderRadius: 10, background: color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 'clamp(16px, 1.9vw, 24px)', fontWeight: 900, color: '#fff',
                      flexShrink: 0,
                      boxShadow: showGreen ? '0 0 16px rgba(34,197,94,0.6)' : 'none',
                      transition: 'background 0.3s ease, box-shadow 0.3s ease',
                    }}>
                      {optIdx + 1}
                    </span>
                    <span style={{
                      flex: 1,
                      fontSize: 'clamp(15px, 1.7vw, 22px)', fontWeight: 800,
                      color: isCorrectLocked ? '#86efac' : '#e2e8f0',
                    }}>
                      {optText}
                    </span>
                    <span style={{
                      fontSize: 'clamp(18px, 2.2vw, 30px)', fontWeight: 900,
                      color: isCorrectLocked ? '#4ade80' : color,
                      minWidth: 56, textAlign: 'right',
                      transition: 'color 0.3s ease',
                    }}>
                      💰 {displayTotal}
                    </span>
                  </div>
                  {/* Row 2: stacked bar — each segment = one team's contribution */}
                  <div style={{
                    height: 28, position: 'relative', margin: '0 14px 10px',
                    borderRadius: 8, overflow: 'hidden',
                    background: 'rgba(0,0,0,0.35)',
                    width: `${barPct}%`,
                    transition: 'width 0.7s cubic-bezier(0.22,1,0.36,1)',
                    display: 'flex',
                  }}>
                    {contribs.map((c, ci) => {
                      const isHighest = highestTeamIds.has(c.team.id);
                      const hidden = highestHidden && isHighest;
                      const segPct = displayTotal > 0 ? (c.pts / displayTotal) * 100 : 0;
                      if (hidden) return null;
                      const justRevealed = isHighest;
                      return (
                        <div key={c.team.id} style={{
                          width: `${segPct}%`,
                          background: c.team.color,
                          borderRight: ci < contribs.length - 1 ? '2px solid rgba(0,0,0,0.4)' : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: 4, minWidth: 0, overflow: 'hidden',
                          fontSize: 'clamp(11px, 1.1vw, 14px)', fontWeight: 900, color: '#fff',
                          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                          animation: justRevealed
                            ? 'muchoVoterDrop 0.55s cubic-bezier(0.34,1.5,0.64,1) both'
                            : `contentReveal 0.5s ease ${0.2 + optIdx * 0.08 + ci * 0.05}s both`,
                        }}>
                          <QQTeamAvatar avatarId={c.team.avatarId} size={'clamp(14px, 1.5vw, 18px)'} />
                          <span>{c.pts}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Legend: teams */}
            {parsed.length > 0 && (
              <div style={{
                marginTop: 2, padding: '8px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                animation: `contentReveal 0.4s ease ${0.1 + q.options!.length * 0.08 + 0.1}s both`,
              }}>
                <span style={{
                  fontSize: 'clamp(11px, 1vw, 13px)', fontWeight: 900, color: '#64748b',
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                }}>Teams</span>
                {s.teams.map(tm => {
                  const p = parsed.find(x => x.teamId === tm.id);
                  const earned = p && q.correctOptionIndex != null ? (p.pts[q.correctOptionIndex] ?? 0) : 0;
                  return (
                    <div key={tm.id} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '3px 10px', borderRadius: 999,
                      background: 'rgba(0,0,0,0.28)',
                      border: `1.5px solid ${tm.color}`,
                    }}>
                      <QQTeamAvatar avatarId={tm.avatarId} size={22} />
                      <span style={{ fontSize: 'clamp(11px, 1.1vw, 14px)', fontWeight: 800, color: tm.color }}>{tm.name}</span>
                      <span style={{
                        fontSize: 'clamp(11px, 1.1vw, 14px)', fontWeight: 900,
                        color: earned > 0 ? '#4ade80' : '#64748b',
                      }}>+{earned}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* CHEESE: typed answers with speed for ties — step-based reveal */}
      {q.category === 'CHEESE' && (() => {
        const sorted = [...s.answers].sort((a, b) => a.submittedAt - b.submittedAt);
        const t0 = s.timerEndsAt ? s.timerEndsAt - (s.timerDurationSec * 1000) : (sorted[0]?.submittedAt ?? 0);
        const winners = sorted.filter(a => a.teamId === s.correctTeamId);
        const hasTie = winners.length > 1 || sorted.filter(a => {
          if (!s.correctTeamId) return false;
          const winAns = sorted.find(x => x.teamId === s.correctTeamId)?.text?.trim().toLowerCase();
          return winAns && a.text?.trim().toLowerCase() === winAns;
        }).length > 1;
        return (
          <div style={{ animation: 'contentReveal 0.5s ease 0.1s both', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sorted.map((a, i) => {
              const team = s.teams.find(t => t.id === a.teamId);
              const isWinner = a.teamId === s.correctTeamId;
              const timeSec = t0 ? ((a.submittedAt - t0) / 1000).toFixed(1) : null;
              if (!team) return null;
              const greenOn = isWinner;
              const avatarsOn = true;
              const avatarDelay = avatarsOn ? i * 0.16 : 0;
              return (
                <div key={a.teamId} style={{
                  display: 'flex', alignItems: 'stretch', gap: 0,
                  borderRadius: 14, overflow: 'hidden',
                  background: greenOn ? 'rgba(34,197,94,0.14)' : 'rgba(255,255,255,0.035)',
                  border: greenOn ? '2px solid rgba(34,197,94,0.55)' : '1.5px solid rgba(255,255,255,0.08)',
                  boxShadow: greenOn ? '0 0 0 3px rgba(34,197,94,0.12)' : 'none',
                  animation: `contentReveal 0.45s ease ${0.1 + i * 0.08}s both`,
                  minHeight: 60,
                  transition: 'background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease',
                  position: 'relative',
                }}>
                  {/* Shimmer overlay bei Grün-Enthüllung */}
                  {greenOn && (
                    <div aria-hidden style={{
                      position: 'absolute', inset: 0, pointerEvents: 'none',
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.28) 50%, transparent 100%)',
                      animation: 'revealShimmer 1s ease 0.05s 1 both',
                    }} />
                  )}
                  <div style={{
                    width: 'clamp(60px, 6.5vw, 90px)',
                    background: greenOn ? 'linear-gradient(135deg,#22C55E,#16A34A)' : `${team.color}30`,
                    borderRight: `2px solid ${greenOn ? 'rgba(34,197,94,0.5)' : team.color + '50'}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, gap: 2,
                    transition: 'background 0.35s ease, border-color 0.35s ease',
                  }}>
                    {avatarsOn
                      ? (
                        <div style={{ animation: `muchoVoterDrop 0.55s cubic-bezier(0.34,1.5,0.64,1) ${avatarDelay}s both` }}>
                          <QQTeamAvatar avatarId={team.avatarId} size={'clamp(22px, 2.6vw, 34px)'} />
                        </div>
                      )
                      : (
                        <span style={{
                          width: 'clamp(22px, 2.6vw, 34px)', height: 'clamp(22px, 2.6vw, 34px)',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1.5px dashed rgba(255,255,255,0.22)',
                        }} />
                      )
                    }
                    <span style={{ fontSize: 'clamp(10px, 1vw, 13px)', fontWeight: 900, color: greenOn ? '#fff' : team.color, letterSpacing: 0.3 }}>
                      {team.name}
                    </span>
                  </div>
                  <div style={{
                    flex: 1, padding: '10px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    position: 'relative',
                  }}>
                    <span style={{
                      flex: 1,
                      fontSize: 'clamp(18px, 2.4vw, 32px)', fontWeight: 900,
                      color: greenOn ? '#86efac' : '#e2e8f0',
                      lineHeight: 1.2,
                      transition: 'color 0.35s ease',
                    }}>
                      {a.text || '—'}
                    </span>
                    {hasTie && timeSec && avatarsOn && (
                      <span style={{
                        padding: '4px 10px', borderRadius: 999,
                        background: i === 0 && isWinner ? 'rgba(251,191,36,0.22)' : 'rgba(0,0,0,0.28)',
                        border: i === 0 && isWinner ? '1.5px solid rgba(251,191,36,0.6)' : '1px solid rgba(255,255,255,0.1)',
                        fontSize: 'clamp(11px, 1.1vw, 14px)', fontWeight: 800,
                        color: i === 0 && isWinner ? '#FBBF24' : '#94a3b8',
                        whiteSpace: 'nowrap',
                        animation: `contentReveal 0.3s ease ${avatarDelay + 0.2}s both`,
                      }}>
                        {i === 0 && isWinner ? '⚡ ' : ''}{timeSec}s
                      </span>
                    )}
                    {greenOn && (
                      <span style={{
                        fontSize: 'clamp(20px, 2.4vw, 30px)', color: '#4ade80', fontWeight: 900,
                        animation: 'revealCorrectPop 0.45s cubic-bezier(0.34,1.4,0.64,1) both',
                      }}>✓</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* BUNTE TÜTE top5 — answer-centric: list correct answers, pin teams who had each */}
      {q.category === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'top5' && (() => {
        const btt = q.bunteTuete as any;
        const correctListDE: string[] = (btt.answers ?? []).map((s: string) => s.trim()).filter(Boolean);
        const correctListEN: string[] = (btt.answersEn ?? []).map((s: string) => s.trim()).filter(Boolean);
        const correctList = lang === 'en' && correctListEN.length ? correctListEN : correctListDE;
        // Set of ALL accepted variants (DE+EN) lowercased for matching
        const acceptedLower = new Set<string>([
          ...correctListDE.map(x => x.toLowerCase()),
          ...correctListEN.map(x => x.toLowerCase()),
        ]);
        // Build: per accepted answer, which teams had it
        const matches = (p: string, c: string) =>
          p.toLowerCase() === c.toLowerCase() || p.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(p.toLowerCase());
        const teamAnswers = s.answers.map(a => ({
          teamId: a.teamId,
          parts: a.text.split('|').map(p => p.trim()).filter(Boolean),
        }));
        // For each correct answer: list of teams that hit it
        const perAnswer = correctList.map((correct, ci) => {
          const correctDELower = correctListDE[ci]?.toLowerCase() ?? '';
          const correctENLower = correctListEN[ci]?.toLowerCase() ?? '';
          const hitters = teamAnswers
            .filter(ta => ta.parts.some(p => (correctDELower && matches(p, correctDELower)) || (correctENLower && matches(p, correctENLower))))
            .map(ta => s.teams.find(t => t.id === ta.teamId))
            .filter((t): t is NonNullable<typeof t> => !!t);
          return { correct, hitters };
        });
        // Hit-count + ranking summary per team
        const teamScore = teamAnswers.map(ta => {
          const hits = ta.parts.filter(p => {
            return [...acceptedLower].some(c => c && matches(p, c));
          }).length;
          return { teamId: ta.teamId, hits };
        }).sort((a, b) => b.hits - a.hits);

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'contentReveal 0.5s ease 0.1s both' }}>
            {/* The 5 correct answers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {perAnswer.map(({ correct, hitters }, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 12,
                  background: hitters.length > 0
                    ? 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(22,163,74,0.06))'
                    : 'rgba(255,255,255,0.035)',
                  border: hitters.length > 0 ? '1.5px solid rgba(34,197,94,0.4)' : '1.5px solid rgba(255,255,255,0.08)',
                  animation: `contentReveal 0.4s ease ${0.1 + i * 0.08}s both`,
                }}>
                  <span style={{
                    width: 'clamp(32px, 3.5vw, 44px)', height: 'clamp(32px, 3.5vw, 44px)',
                    borderRadius: 10,
                    background: hitters.length > 0 ? 'linear-gradient(135deg,#FBBF24,#F59E0B)' : 'rgba(100,116,139,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'clamp(15px, 1.6vw, 20px)', fontWeight: 900, color: '#fff',
                    flexShrink: 0,
                  }}>
                    #{i + 1}
                  </span>
                  <span style={{
                    flex: 1,
                    fontSize: 'clamp(16px, 1.9vw, 26px)', fontWeight: 900,
                    color: '#F1F5F9',
                  }}>
                    {correct}
                  </span>
                  {hitters.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {hitters.map((tm, hi) => (
                        <div key={tm.id} style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '3px 10px 3px 3px', borderRadius: 999,
                          background: 'rgba(0,0,0,0.28)',
                          border: `1.5px solid ${tm.color}`,
                          animation: `contentReveal 0.3s ease ${0.2 + i * 0.08 + hi * 0.05}s both`,
                        }}>
                          <QQTeamAvatar avatarId={tm.avatarId} size={'clamp(24px, 2.8vw, 32px)'} />
                          <span style={{ fontSize: 'clamp(11px, 1.2vw, 14px)', fontWeight: 800, color: tm.color }}>{tm.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: 'clamp(12px, 1.2vw, 15px)', fontWeight: 700, color: '#64748b', fontStyle: 'italic' }}>
                      {lang === 'en' ? 'nobody' : 'niemand'}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Team score summary */}
            <div style={{
              marginTop: 4, padding: '8px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              animation: `contentReveal 0.4s ease ${0.1 + correctList.length * 0.08 + 0.1}s both`,
            }}>
              <span style={{
                fontSize: 'clamp(11px, 1vw, 13px)', fontWeight: 900, color: '#64748b',
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}><QQEmojiIcon emoji="🏆"/> Treffer</span>
              {teamScore.map(ts => {
                const tm = s.teams.find(t => t.id === ts.teamId);
                if (!tm) return null;
                const isWinner = ts.teamId === s.correctTeamId;
                return (
                  <div key={tm.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '3px 10px', borderRadius: 999,
                    background: isWinner ? 'rgba(34,197,94,0.18)' : 'rgba(0,0,0,0.28)',
                    border: isWinner ? '1.5px solid rgba(34,197,94,0.6)' : `1.5px solid ${tm.color}`,
                  }}>
                    <QQTeamAvatar avatarId={tm.avatarId} size={'clamp(14px, 1.5vw, 18px)'} />
                    <span style={{ fontSize: 'clamp(11px, 1.1vw, 14px)', fontWeight: 800, color: tm.color }}>{tm.name}</span>
                    <span style={{
                      fontSize: 'clamp(12px, 1.2vw, 15px)', fontWeight: 900,
                      color: isWinner ? '#4ade80' : '#cbd5e1',
                    }}>{ts.hits}/{correctList.length}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* BUNTE TÜTE order — correct sequence big, per-position stats + team summary */}
      {q.category === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'order' && (() => {
        const btt = q.bunteTuete as any;
        const items: string[] = btt.items ?? [];
        const correctOrder: number[] = btt.correctOrder ?? items.map((_: any, i: number) => i);
        const correctSeq = correctOrder.map((idx: number) => (items[idx] ?? '').trim());
        const correctSeqLower = correctSeq.map(x => x.toLowerCase());
        // Parse each team's ordering
        const teamOrderings = s.answers.map(a => ({
          teamId: a.teamId,
          parts: a.text.split('|').map(p => p.trim()),
        }));
        // Per-position: how many teams got this right
        const perPositionHits = correctSeq.map((_, posIdx) => {
          const hitters = teamOrderings
            .filter(to => (to.parts[posIdx] ?? '').toLowerCase() === correctSeqLower[posIdx])
            .map(to => s.teams.find(t => t.id === to.teamId))
            .filter((t): t is NonNullable<typeof t> => !!t);
          return { hitters, total: teamOrderings.length };
        });
        // Per-team: how many positions correct
        const teamScores = teamOrderings.map(to => {
          const score = to.parts.filter((p, i) => p.toLowerCase() === correctSeqLower[i]).length;
          return { teamId: to.teamId, score };
        }).sort((a, b) => b.score - a.score);

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'contentReveal 0.5s ease 0.1s both' }}>
            {/* Correct sequence as numbered chain */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {correctSeq.map((item, pi) => {
                const { hitters, total } = perPositionHits[pi];
                const allRight = hitters.length === total && total > 0;
                const noneRight = hitters.length === 0;
                return (
                  <div key={pi} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 12,
                    background: allRight
                      ? 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(22,163,74,0.08))'
                      : noneRight ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
                    border: allRight
                      ? '1.5px solid rgba(34,197,94,0.55)'
                      : noneRight ? '1.5px solid rgba(239,68,68,0.3)' : '1.5px solid rgba(255,255,255,0.08)',
                    animation: `contentReveal 0.4s ease ${0.1 + pi * 0.08}s both`,
                  }}>
                    <span style={{
                      width: 'clamp(32px, 3.5vw, 44px)', height: 'clamp(32px, 3.5vw, 44px)',
                      borderRadius: 10,
                      background: 'linear-gradient(135deg,#F59E0B,#EA580C)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 'clamp(15px, 1.6vw, 20px)', fontWeight: 900, color: '#fff',
                      flexShrink: 0,
                    }}>
                      {pi + 1}
                    </span>
                    <span style={{
                      flex: 1,
                      fontSize: 'clamp(16px, 1.9vw, 26px)', fontWeight: 900,
                      color: '#F1F5F9',
                    }}>
                      {item}
                    </span>
                    {/* Team avatars who got this position right */}
                    {hitters.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {hitters.map((tm, hi) => (
                          <QQTeamAvatar key={tm.id} avatarId={tm.avatarId} size={'clamp(24px, 2.6vw, 32px)'} title={tm.name} style={{
                            marginLeft: hi > 0 ? -6 : 0,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                            animation: `contentReveal 0.3s ease ${0.2 + pi * 0.08 + hi * 0.04}s both`,
                          }} />
                        ))}
                      </div>
                    )}
                    <span style={{
                      minWidth: 44, textAlign: 'right',
                      fontSize: 'clamp(13px, 1.4vw, 17px)', fontWeight: 900,
                      color: allRight ? '#4ade80' : noneRight ? '#f87171' : '#94a3b8',
                    }}>
                      {hitters.length}/{total}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Team summary bar */}
            <div style={{
              marginTop: 4, padding: '8px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              animation: `contentReveal 0.4s ease ${0.1 + correctSeq.length * 0.08 + 0.1}s both`,
            }}>
              <span style={{
                fontSize: 'clamp(11px, 1vw, 13px)', fontWeight: 900, color: '#64748b',
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}><QQEmojiIcon emoji="🎯"/> Richtige Positionen</span>
              {teamScores.map(ts => {
                const tm = s.teams.find(t => t.id === ts.teamId);
                if (!tm) return null;
                const isWinner = ts.teamId === s.correctTeamId;
                return (
                  <div key={tm.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '3px 10px', borderRadius: 999,
                    background: isWinner ? 'rgba(34,197,94,0.18)' : 'rgba(0,0,0,0.28)',
                    border: isWinner ? '1.5px solid rgba(34,197,94,0.6)' : `1.5px solid ${tm.color}`,
                  }}>
                    <QQTeamAvatar avatarId={tm.avatarId} size={'clamp(14px, 1.5vw, 18px)'} />
                    <span style={{ fontSize: 'clamp(11px, 1.1vw, 14px)', fontWeight: 800, color: tm.color }}>{tm.name}</span>
                    <span style={{
                      fontSize: 'clamp(12px, 1.2vw, 15px)', fontWeight: 900,
                      color: isWinner ? '#4ade80' : '#cbd5e1',
                    }}>{ts.score}/{correctSeq.length}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* BUNTE TÜTE map */}
      {q.category === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'map' && (() => {
        const btt = q.bunteTuete as any;
        const tLat: number = btt.lat; const tLng: number = btt.lng;
        const scored = [...s.answers].map(a => {
          const parts = a.text.split(',');
          const lat = parseFloat(parts[0]); const lng = parseFloat(parts[1]);
          if (Number.isNaN(lat) || Number.isNaN(lng)) return { ...a, distKm: null };
          const R = 6371;
          const dLat = (lat - tLat) * Math.PI / 180;
          const dLng = (lng - tLng) * Math.PI / 180;
          const aa = Math.sin(dLat / 2) ** 2 + Math.cos(tLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
          return { ...a, distKm: R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa)) };
        }).sort((a, b) => (a.distKm === null ? 1 : b.distKm === null ? -1 : a.distKm - b.distKm));
        return scored.map((a, i) => {
          const team = s.teams.find(t => t.id === a.teamId);
          const isWinner = a.teamId === s.correctTeamId;
          const distStr = a.distKm === null ? '—' : a.distKm < 1 ? `${Math.round(a.distKm * 1000)} m` : `${a.distKm.toFixed(1)} km`;
          return (
            <div key={a.teamId} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 12px', borderRadius: 10, marginBottom: 4,
              background: isWinner ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
              border: isWinner ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.05)',
              animation: `contentReveal 0.4s ease ${0.1 + i * 0.08}s both`,
            }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: i === 0 ? '#60A5FA' : '#475569', width: 20 }}>#{i + 1}</span>
              {team && <QQTeamAvatar avatarId={team.avatarId} size={18} />}
              <span style={{ fontWeight: 800, color: team?.color ?? '#e2e8f0', flex: 1, fontSize: 13 }}>{team?.name}</span>
              <span style={{ fontFamily: "'Caveat', cursive", fontSize: 15, color: isWinner ? '#4ade80' : '#64748b' }}><QQEmojiIcon emoji="📍"/> {distStr}</span>
            </div>
          );
        });
      })()}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CozyGuessr Reveal — progressive map reveal (moderator steuert step-by-step)
// ═══════════════════════════════════════════════════════════════════════════════

const QQFitBoundsOnTrigger: React.FC<{ bounds: L.LatLngBounds; trigger: number }> = ({ bounds, trigger }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds.isValid()) {
      // flyToBounds = smoother Cinematic-Zoom (vs. fitBounds = harter Sprung).
      // padding etwas grosszuegiger + duration 1.4s damit die Bewegung als
      // bewusster Move zum Ziel erkennbar ist (Geoguessr-style).
      map.flyToBounds(bounds, { padding: [100, 100], maxZoom: 8, duration: 1.4 });
    }
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

// Slow-Zoom-Intro: beim ersten Reveal-Step (showTarget) auf den Zielbereich
// zoomen — startet typischerweise von einem weiten Default-Zoom und gleitet
// rein, wie GeoGuessr-Round-End. Nur einmal beim Mount.
const QQInitialTargetZoom: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    const t = window.setTimeout(() => {
      map.flyTo([lat, lng] as any, 6, { duration: 2.0 });
    }, 200);
    return () => window.clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

const QQMapResizer: React.FC<{ trigger: boolean }> = ({ trigger }) => {
  const map = useMap();
  useEffect(() => {
    const t = window.setTimeout(() => map.invalidateSize(), 60);
    return () => window.clearTimeout(t);
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

/**
 * 4 gewinnt / Only Connect — Beamer-Layout für active + reveal.
 *
 * Active:
 *   - Frage oben (z.B. „Was verbindet diese Begriffe?")
 *   - 4 Hint-Slots: aufgedeckte Hinweise farblich, kommende verschleiert
 *   - Aktuell sichtbarer Hint pulsiert leicht
 *   - Team-Status-Reihe unten (✓ wenn correct, ✕ wenn locked, sonst dim)
 *
 * Reveal:
 *   - Antwort prominent in Gold
 *   - Winner-Team mit Avatar + atHintIdx-Badge
 *   - Alle 4 Hints sichtbar
 */
/**
 * Bluff — Beamer-Layout für die 3 Phasen + Reveal.
 *  write:  Frage + „Teams schreiben Bluffs" + Submission-Counter + Avatare ✓
 *  review: Frage + Bluffs in einer Liste + ✕-Buttons (Moderator filtert)
 *  vote:   Frage + Optionen mit Vote-Counter pro Option
 *  reveal: Echte Antwort hervorgehoben + per-Option Avatare die gewählt haben
 *          + per-Bluff-Box wer den Bluff geschrieben hat + Punktevergabe
 */
function BluffBeamerView({ state: s, lang, revealed }: {
  state: QQStateUpdate; lang: 'de' | 'en'; revealed: boolean;
}) {
  const q = s.currentQuestion!;
  const bt = q.bunteTuete as import('../../../shared/quarterQuizTypes').QQBunteTueteBluff;
  const phase = s.bluffPhase;
  const accent = '#F472B6'; // pink
  const realText = formatRevealedAnswer(lang, bt.realAnswer, bt.realAnswerEn);

  const submitCount = Object.keys(s.bluffSubmissions ?? {}).filter(id => s.bluffSubmissions[id]?.trim()).length;
  const totalActive = s.teams.filter(t => t.connected).length;
  const voteCount = Object.keys(s.bluffVotes ?? {}).length;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      gap: 'clamp(14px, 2vh, 24px)',
      padding: 'clamp(20px, 2.5vh, 36px) clamp(24px, 3vw, 48px) clamp(16px, 2vh, 28px)',
      position: 'relative',
    }}>
      <Fireflies color={`${accent}55`} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 16, position: 'relative', zIndex: 5,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '8px 22px', borderRadius: 999,
          background: `${accent}22`, border: `2px solid ${accent}44`,
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          animation: 'contentReveal 0.35s ease both',
        }}>
          <span style={{ fontSize: 'clamp(20px, 2.2vw, 30px)', lineHeight: 1 }}>🎭</span>
          <span style={{
            fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 900,
            color: accent, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>{lang === 'de' ? 'Bluff' : 'Bluff'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!revealed && phase && (
            <div style={{
              padding: '8px 16px', borderRadius: 999,
              background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.12)',
              fontSize: 'clamp(13px, 1.4vw, 18px)', fontWeight: 900, color: '#cbd5e1',
            }}>
              {phase === 'write' && (lang === 'de' ? `📝 Bluffs schreiben (${submitCount}/${totalActive})` : `📝 Writing (${submitCount}/${totalActive})`)}
              {phase === 'review' && (lang === 'de' ? `👮 Moderator-Check` : `👮 Moderator check`)}
              {phase === 'vote' && (lang === 'de' ? `🗳 Abstimmen (${voteCount}/${totalActive})` : `🗳 Voting (${voteCount}/${totalActive})`)}
              {phase === 'reveal' && (lang === 'de' ? `🎉 Auflösung` : `🎉 Reveal`)}
            </div>
          )}
          {phase === 'write' && s.bluffWriteEndsAt && <BluffTimer endsAt={s.bluffWriteEndsAt} accent={accent} />}
          {phase === 'vote' && s.bluffVoteEndsAt && <BluffTimer endsAt={s.bluffVoteEndsAt} accent={accent} />}
        </div>
      </div>

      {/* Frage */}
      <div style={{
        textAlign: 'center', position: 'relative', zIndex: 5,
        animation: 'contentReveal 0.5s ease 0.1s both',
      }}>
        <div style={{
          fontSize: 'clamp(28px, 3.4vw, 52px)', fontWeight: 900,
          color: '#F1F5F9', lineHeight: 1.2, maxWidth: 1100, margin: '0 auto',
        }}>
          {lang === 'en' && q.textEn ? q.textEn : q.text}
        </div>
      </div>

      {/* Phase-spezifischer Inhalt */}
      {phase === 'write' && <BluffWriteScreen state={s} accent={accent} lang={lang} />}
      {phase === 'review' && <BluffReviewScreen state={s} accent={accent} lang={lang} />}
      {phase === 'vote' && <BluffVoteWaitingScreen state={s} accent={accent} lang={lang} />}
      {phase === 'reveal' && <BluffVoteScreen state={s} accent={accent} lang={lang} revealed={true} />}

      {/* Reveal: Echte Antwort prominent + Top-Punkte */}
      {phase === 'reveal' && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          padding: 'clamp(14px, 1.8vh, 24px)',
          borderRadius: 22,
          background: 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,197,94,0.05))',
          border: '2px solid rgba(34,197,94,0.45)',
          boxShadow: '0 0 40px rgba(34,197,94,0.25)',
          animation: 'revealAnswerBam 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s both',
          position: 'relative', zIndex: 5,
        }}>
          <div style={{
            fontSize: 'clamp(11px, 1vw, 13px)', fontWeight: 900,
            color: '#86EFAC', letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>
            {lang === 'de' ? 'Echte Antwort' : 'Real answer'}
          </div>
          <div style={{
            fontSize: 'clamp(32px, 4.5vw, 64px)', fontWeight: 900,
            color: '#22C55E', textShadow: '0 0 30px rgba(34,197,94,0.4)',
            textAlign: 'center', lineHeight: 1.1,
          }}>
            {realText}
          </div>
        </div>
      )}
    </div>
  );
}

function BluffTimer({ endsAt, accent }: { endsAt: number; accent: string }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, (endsAt - Date.now()) / 1000));
  useEffect(() => {
    const iv = setInterval(() => setRemaining(Math.max(0, (endsAt - Date.now()) / 1000)), 250);
    return () => clearInterval(iv);
  }, [endsAt]);
  const sec = Math.ceil(remaining);
  const urgent = sec <= 10;
  return (
    <div style={{
      padding: '8px 18px', borderRadius: 999,
      background: urgent ? 'rgba(239,68,68,0.22)' : `${accent}22`,
      border: `2px solid ${urgent ? '#EF4444' : `${accent}55`}`,
      fontSize: 'clamp(18px, 2vw, 26px)', fontWeight: 900,
      color: urgent ? '#FCA5A5' : '#F8FAFC', fontVariantNumeric: 'tabular-nums',
      animation: urgent ? 'pulse 0.8s ease-in-out infinite alternate' : undefined,
    }}>
      ⏱ {sec}s
    </div>
  );
}

function BluffWriteScreen({ state: s, accent, lang }: {
  state: QQStateUpdate; accent: string; lang: 'de' | 'en';
}) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24,
      position: 'relative', zIndex: 5,
    }}>
      <div style={{
        fontSize: 'clamp(60px, 8vw, 110px)',
        animation: 'cfloat 4s ease-in-out infinite',
      }}>📝</div>
      <div style={{
        fontSize: 'clamp(22px, 2.4vw, 34px)', fontWeight: 900,
        color: '#fde68a', textAlign: 'center', lineHeight: 1.3, maxWidth: 1000,
      }}>
        {lang === 'de'
          ? 'Erfindet eine plausible Falsch-Antwort auf eurem Handy!'
          : 'Make up a plausible wrong answer on your phone!'}
      </div>
      {/* Avatar-Reihe — wer hat schon submitted? */}
      <div style={{
        display: 'flex', gap: 'clamp(12px, 1.6vw, 22px)', flexWrap: 'wrap',
        justifyContent: 'center', marginTop: 12,
      }}>
        {s.teams.map(tm => {
          const submitted = !!(s.bluffSubmissions ?? {})[tm.id]?.trim();
          return (
            <div key={tm.id} title={tm.name} style={{
              position: 'relative',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              opacity: submitted ? 1 : 0.55,
              filter: submitted ? 'none' : 'grayscale(0.4)',
              transition: 'opacity 0.4s ease, filter 0.4s ease',
            }}>
              <QQTeamAvatar avatarId={tm.avatarId} size={'clamp(56px, 6vw, 84px)'} style={{
                background: '#0d0a06',
                boxShadow: submitted
                  ? `0 0 0 2px ${accent}, 0 0 16px ${accent}77, 0 4px 10px rgba(0,0,0,0.55)`
                  : `0 0 0 2px ${tm.color}66, 0 4px 10px rgba(0,0,0,0.55)`,
              }} />
              {submitted && (
                <div style={{
                  position: 'absolute', bottom: -4, right: -4,
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#22C55E', border: '2px solid #0D0A06',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 900, color: '#fff',
                  animation: 'bAnswerCheck 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
                }}>✓</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BluffReviewScreen({ state: s, accent, lang }: {
  state: QQStateUpdate; accent: string; lang: 'de' | 'en';
}) {
  void accent;
  const submissions = Object.entries(s.bluffSubmissions ?? {}).filter(([, t]) => t?.trim());
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 14,
      position: 'relative', zIndex: 5,
      padding: 'clamp(16px, 2vh, 28px)',
    }}>
      <div style={{
        fontSize: 'clamp(18px, 2vw, 26px)', fontWeight: 800,
        color: '#94a3b8', textAlign: 'center',
      }}>
        {lang === 'de'
          ? '👮 Moderator prüft die Bluffs… Bluffs werden für die Spieler nicht angezeigt.'
          : '👮 Moderator reviewing bluffs… not visible to players.'}
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 10, width: '100%', maxWidth: 1100,
      }}>
        {submissions.map(([teamId, text]) => {
          const tm = s.teams.find(t => t.id === teamId);
          const rejected = (s.bluffRejected ?? []).includes(teamId);
          return (
            <div key={teamId} style={{
              padding: '10px 14px', borderRadius: 12,
              background: rejected ? 'rgba(239,68,68,0.10)' : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${rejected ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
              opacity: rejected ? 0.6 : 1,
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {tm && <QQTeamAvatar avatarId={tm.avatarId} size={20} />}
                <span style={{
                  fontSize: 11, fontWeight: 900, color: tm?.color ?? '#94a3b8',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>{tm?.name ?? teamId}</span>
                {rejected && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: '#FCA5A5', fontWeight: 800 }}>
                    {lang === 'de' ? 'abgelehnt' : 'rejected'}
                  </span>
                )}
              </div>
              <div style={{
                fontSize: 14, fontWeight: 700,
                color: rejected ? '#FCA5A5' : '#F1F5F9',
                textDecoration: rejected ? 'line-through' : undefined,
                wordBreak: 'break-word',
              }}>{text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Vote-Phase auf dem Beamer: KEINE Optionen anzeigen (jedes Team sieht ein
 * eigenes Random-4-Subset auf seinem Phone). Stattdessen großes Voting-
 * Spannungs-Banner + Avatare mit ✓-Status pro Submit.
 */
function BluffVoteWaitingScreen({ state: s, accent, lang }: {
  state: QQStateUpdate; accent: string; lang: 'de' | 'en';
}) {
  const totalActive = s.teams.filter(t => t.connected).length;
  const voted = Object.keys(s.bluffVotes ?? {}).length;
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24,
      position: 'relative', zIndex: 5,
    }}>
      <div style={{
        fontSize: 'clamp(60px, 8vw, 110px)',
        animation: 'cfloat 4s ease-in-out infinite',
      }}>🗳</div>
      <div style={{
        fontSize: 'clamp(22px, 2.4vw, 34px)', fontWeight: 900,
        color: '#fde68a', textAlign: 'center', lineHeight: 1.3, maxWidth: 1000,
      }}>
        {lang === 'de'
          ? 'Welche Antwort ist die echte? Tippt auf eurem Handy!'
          : 'Which answer is real? Tap on your phone!'}
      </div>
      <div style={{
        padding: '8px 22px', borderRadius: 999,
        background: `${accent}22`, border: `2px solid ${accent}66`,
        fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 900, color: '#fbcfe8',
      }}>
        {lang === 'de' ? `${voted} / ${totalActive} Teams haben gewählt` : `${voted} / ${totalActive} teams voted`}
      </div>
      {/* Avatar-Reihe — wer hat schon gewählt? */}
      <div style={{
        display: 'flex', gap: 'clamp(12px, 1.6vw, 22px)', flexWrap: 'wrap',
        justifyContent: 'center', marginTop: 12,
      }}>
        {s.teams.map(tm => {
          const voted = !!(s.bluffVotes ?? {})[tm.id];
          return (
            <div key={tm.id} title={tm.name} style={{
              position: 'relative',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              opacity: voted ? 1 : 0.55,
              filter: voted ? 'none' : 'grayscale(0.4)',
              transition: 'opacity 0.4s ease, filter 0.4s ease',
            }}>
              <QQTeamAvatar avatarId={tm.avatarId} size={'clamp(56px, 6vw, 84px)'} style={{
                background: '#0d0a06',
                boxShadow: voted
                  ? `0 0 0 2px ${accent}, 0 0 16px ${accent}77, 0 4px 10px rgba(0,0,0,0.55)`
                  : `0 0 0 2px ${tm.color}66, 0 4px 10px rgba(0,0,0,0.55)`,
              }} />
              {voted && (
                <div style={{
                  position: 'absolute', bottom: -4, right: -4,
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#22C55E', border: '2px solid #0D0A06',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 900, color: '#fff',
                  animation: 'bAnswerCheck 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
                }}>✓</div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{
        fontSize: 'clamp(11px, 1vw, 13px)', fontWeight: 700,
        color: '#94a3b8', textAlign: 'center', marginTop: 8, opacity: 0.8,
        maxWidth: 700, lineHeight: 1.5,
      }}>
        {lang === 'de'
          ? 'Jedes Team sieht 4 zufällige Antworten — auch die echte. Kein Spickeln vom Beamer!'
          : 'Each team sees 4 random answers — including the real one. No peeking!'}
      </div>
    </div>
  );
}

function BluffVoteScreen({ state: s, accent, lang, revealed }: {
  state: QQStateUpdate; accent: string; lang: 'de' | 'en'; revealed: boolean;
}) {
  void accent;
  const opts = s.bluffOptions ?? [];
  // pro Option: welche Teams haben gewählt?
  const votersByOption: Record<string, string[]> = {};
  for (const [teamId, optId] of Object.entries(s.bluffVotes ?? {})) {
    if (!votersByOption[optId]) votersByOption[optId] = [];
    votersByOption[optId].push(teamId);
  }

  return (
    <div style={{
      flex: 1, display: 'grid',
      gridTemplateColumns: opts.length > 4 ? 'repeat(2, 1fr)' : '1fr',
      gap: 'clamp(8px, 1vw, 14px)',
      maxWidth: 1100, width: '100%', margin: '0 auto',
      position: 'relative', zIndex: 5,
      animation: 'contentReveal 0.5s ease 0.15s both',
    }}>
      {opts.map((opt, i) => {
        const isReal = opt.source === 'real';
        const showAsReal = revealed && isReal;
        const voters = votersByOption[opt.id] ?? [];
        const contributors = opt.source === 'team' ? opt.contributors : [];
        return (
          <div key={opt.id} style={{
            padding: 'clamp(12px, 1.4vh, 18px) clamp(14px, 1.6vw, 22px)',
            borderRadius: 14,
            background: showAsReal
              ? 'linear-gradient(135deg, rgba(34,197,94,0.22), rgba(34,197,94,0.06))'
              : 'rgba(255,255,255,0.04)',
            border: showAsReal
              ? '2px solid #22C55E'
              : '1.5px solid rgba(255,255,255,0.10)',
            boxShadow: showAsReal ? '0 0 26px rgba(34,197,94,0.35)' : 'none',
            display: 'flex', flexDirection: 'column', gap: 8,
            transition: 'all 0.4s ease',
            animation: revealed ? `phasePop 0.55s cubic-bezier(0.34,1.56,0.64,1) ${0.3 + i * 0.1}s both` : undefined,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%',
                background: showAsReal ? '#22C55E' : 'rgba(255,255,255,0.08)',
                color: showAsReal ? '#0a1f0d' : '#94a3b8',
                fontSize: 13, fontWeight: 900,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>{String.fromCharCode(65 + i)}</span>
              <span style={{
                flex: 1, fontSize: 'clamp(18px, 2vw, 28px)', fontWeight: 900,
                color: showAsReal ? '#22C55E' : '#F1F5F9', wordBreak: 'break-word',
              }}>{opt.text}</span>
              {showAsReal && (
                <span style={{
                  padding: '4px 10px', borderRadius: 999,
                  background: 'rgba(34,197,94,0.25)', border: '1.5px solid #22C55E',
                  fontSize: 11, fontWeight: 900, color: '#86EFAC',
                  whiteSpace: 'nowrap',
                }}>
                  ✓ {lang === 'de' ? 'echt' : 'real'}
                </span>
              )}
            </div>
            {/* Voter-Avatare (nur im Reveal anzeigen) */}
            {revealed && voters.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: 4 }}>
                  {lang === 'de' ? 'Wählten' : 'Voted'}
                </span>
                {voters.map(vid => {
                  const tm = s.teams.find(t => t.id === vid);
                  if (!tm) return null;
                  return (
                    <QQTeamAvatar key={vid} avatarId={tm.avatarId} size={26} style={{
                      boxShadow: `0 0 0 1.5px ${tm.color}99`,
                    }} />
                  );
                })}
              </div>
            )}
            {/* Bluff-Author-Avatare (nur im Reveal, nur bei team-bluffs) */}
            {revealed && contributors.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: 4 }}>
                  🎭 {lang === 'de' ? 'Bluff von' : 'Bluffed by'}
                </span>
                {contributors.map(cid => {
                  const tm = s.teams.find(t => t.id === cid);
                  if (!tm) return null;
                  return (
                    <QQTeamAvatar key={cid} avatarId={tm.avatarId} size={26} style={{
                      boxShadow: `0 0 0 1.5px ${tm.color}99`,
                    }} />
                  );
                })}
              </div>
            )}
            {/* Vote-Counter (während aktivem Vote, ohne Avatare) */}
            {!revealed && voters.length > 0 && (
              <div style={{
                fontSize: 11, fontWeight: 800, color: '#94a3b8',
                letterSpacing: '0.06em',
              }}>
                {voters.length} {lang === 'de' ? 'Stimme(n)' : 'vote(s)'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function OnlyConnectBeamerView({ state: s, lang, revealed }: {
  state: QQStateUpdate; lang: 'de' | 'en'; revealed: boolean;
}) {
  const q = s.currentQuestion!;
  const bt = q.bunteTuete as import('../../../shared/quarterQuizTypes').QQBunteTueteOnlyConnect;
  const hintsAll = (lang === 'en' && bt.hintsEn?.length === 4 ? bt.hintsEn : bt.hints) ?? [];
  const answer = formatRevealedAnswer(lang, bt.answer, bt.answerEn);
  // Per-Team-Modell: Beamer zeigt MIN(...indices) damit kein Spoiler.
  // Teams die mehr Hinweise haben sehen sie nur auf eigenem /team.
  const hintIndicesArr = Object.values(s.onlyConnectHintIndices ?? {});
  const hintIdx = revealed
    ? 3
    : (hintIndicesArr.length > 0 ? Math.min(...hintIndicesArr) : 0);
  const lockedSet = new Set(s.onlyConnectLockedTeams ?? []);
  const accent = '#A78BFA';
  // Multi-Winner: alle korrekten Teams sortiert nach (atHintIdx ASC, submittedAt ASC)
  const correctSorted = (s.onlyConnectGuesses ?? [])
    .filter(g => g.correct)
    .slice()
    .sort((a, b) => (a.atHintIdx - b.atHintIdx) || (a.submittedAt - b.submittedAt));
  const winnerSet = new Set(correctSorted.map(g => g.teamId));
  const winnerByTeam: Record<string, { atHintIdx: number; submittedAt: number; rank: number }> = {};
  correctSorted.forEach((g, idx) => { winnerByTeam[g.teamId] = { atHintIdx: g.atHintIdx, submittedAt: g.submittedAt, rank: idx + 1 }; });

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      gap: 'clamp(14px, 2vh, 24px)',
      padding: 'clamp(20px, 2.5vh, 36px) clamp(24px, 3vw, 48px) clamp(16px, 2vh, 28px)',
      position: 'relative',
    }}>
      <Fireflies color={`${accent}55`} />

      {/* Header — Pill links, Status/Timer rechts (genau wie 4×4-Header) */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 16, position: 'relative', zIndex: 5,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '8px 22px', borderRadius: 999,
          background: `${accent}22`, border: `2px solid ${accent}44`,
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          animation: 'contentReveal 0.35s ease both',
        }}>
          <span style={{ fontSize: 'clamp(20px, 2.2vw, 30px)', lineHeight: 1 }}>🧩</span>
          <span style={{
            fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 900,
            color: accent, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>{lang === 'de' ? '4 gewinnt' : 'Connect 4'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!revealed && (
            <div style={{
              padding: '8px 16px', borderRadius: 999,
              background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.12)',
              fontSize: 'clamp(13px, 1.4vw, 18px)', fontWeight: 900, color: '#cbd5e1',
            }}>
              {lang === 'de' ? `Hinweis ${hintIdx + 1} / 4` : `Clue ${hintIdx + 1} / 4`}
            </div>
          )}
          {revealed && (
            <div style={{
              padding: '8px 18px', borderRadius: 999,
              background: 'rgba(251,191,36,0.18)', border: '2px solid rgba(251,191,36,0.5)',
              fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 900, color: '#fde68a',
              letterSpacing: '0.06em',
            }}>
              {lang === 'de' ? 'Auflösung' : 'Reveal'}
            </div>
          )}
        </div>
      </div>

      {/* Frage oben mittig */}
      <div style={{
        textAlign: 'center', position: 'relative', zIndex: 5,
        animation: 'contentReveal 0.5s ease 0.1s both',
      }}>
        <div style={{
          fontSize: 'clamp(26px, 3vw, 44px)', fontWeight: 900,
          color: '#F1F5F9', lineHeight: 1.2, maxWidth: 1100, margin: '0 auto',
        }}>
          {lang === 'en' && q.textEn ? q.textEn : (q.text || (lang === 'de' ? 'Was verbindet diese Hinweise?' : 'What connects these clues?'))}
        </div>
      </div>

      {/* 4 Hint-Slots, jeweils horizontal nebeneinander */}
      <div style={{
        flex: 1,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 'clamp(10px, 1.4vw, 22px)',
        alignItems: 'stretch', position: 'relative', zIndex: 5,
        maxWidth: 1280, width: '100%', margin: '0 auto',
      }}>
        {[0, 1, 2, 3].map(i => {
          const isVisible = revealed || i <= hintIdx;
          const isCurrent = !revealed && i === hintIdx;
          const isPast = !revealed && i < hintIdx;
          const hintText = hintsAll[i] ?? `Hinweis ${i + 1}`;
          const hintColor = i === 0 ? '#FBBF24' : i === 1 ? '#22C55E' : i === 2 ? '#60A5FA' : '#A78BFA';
          return (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: 'clamp(18px, 2vh, 28px) clamp(10px, 1vw, 16px)',
              borderRadius: 18,
              background: isVisible
                ? `linear-gradient(180deg, ${hintColor}28, ${hintColor}10)`
                : 'rgba(255,255,255,0.03)',
              border: isVisible
                ? `2px solid ${hintColor}${isCurrent ? 'cc' : '88'}`
                : '2px dashed rgba(255,255,255,0.10)',
              boxShadow: isCurrent
                ? `0 0 28px ${hintColor}66`
                : isVisible ? `0 0 14px ${hintColor}33` : 'none',
              opacity: isVisible ? 1 : 0.55,
              transition: 'all 0.5s ease',
              animation: isCurrent ? 'activeTeamGlow 2.4s ease-in-out infinite' : undefined,
              minHeight: 'clamp(140px, 22vh, 220px)',
              justifyContent: 'center', textAlign: 'center',
            }}>
              <div style={{
                fontSize: 'clamp(11px, 1.1vw, 14px)', fontWeight: 900,
                color: isVisible ? hintColor : '#475569',
                letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12,
              }}>
                {lang === 'de' ? `Hinweis ${i + 1}` : `Clue ${i + 1}`}
                {isPast && <span style={{ marginLeft: 6 }}>✓</span>}
              </div>
              <div style={{
                fontSize: 'clamp(20px, 2.4vw, 36px)', fontWeight: 900,
                color: isVisible ? '#F1F5F9' : 'transparent',
                lineHeight: 1.2,
                animation: isCurrent ? 'revealAnswerBam 0.55s cubic-bezier(0.22,1,0.36,1) both' : undefined,
              }}>
                {isVisible ? hintText : '?'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reveal: Antwort + Winner */}
      {revealed && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          padding: 'clamp(16px, 2vh, 28px)',
          borderRadius: 22,
          background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(251,191,36,0.05))',
          border: '2px solid rgba(251,191,36,0.45)',
          boxShadow: '0 0 40px rgba(251,191,36,0.25)',
          animation: 'revealAnswerBam 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s both',
          position: 'relative', zIndex: 5,
        }}>
          <div style={{
            fontSize: 'clamp(11px, 1vw, 13px)', fontWeight: 900,
            color: '#FDE68A', letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.85,
          }}>
            {lang === 'de' ? 'Lösung' : 'Answer'}
          </div>
          <div style={{
            fontSize: 'clamp(36px, 5vw, 72px)', fontWeight: 900,
            color: '#FBBF24', textShadow: '0 0 30px rgba(251,191,36,0.35)',
            textAlign: 'center', lineHeight: 1.1,
          }}>
            {answer}
          </div>
          {correctSorted.length > 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            }}>
              <div style={{
                fontSize: 'clamp(11px, 1vw, 13px)', fontWeight: 900,
                color: '#86EFAC', letterSpacing: '0.14em', textTransform: 'uppercase',
              }}>
                {lang === 'de' ? `🏆 ${correctSorted.length} richtig` : `🏆 ${correctSorted.length} correct`}
              </div>
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
              }}>
                {correctSorted.map((g, idx) => {
                  const tm = s.teams.find(t => t.id === g.teamId);
                  if (!tm) return null;
                  const pts = Math.max(1, 4 - g.atHintIdx);
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                  return (
                    <div key={g.teamId} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 14px', borderRadius: 999,
                      background: `${tm.color}22`, border: `2px solid ${tm.color}`,
                      animation: `phasePop 0.55s cubic-bezier(0.34,1.56,0.64,1) ${0.5 + idx * 0.1}s both`,
                    }}>
                      <span style={{ fontSize: 14, lineHeight: 1 }}>{medal}</span>
                      <QQTeamAvatar avatarId={tm.avatarId} size={32} style={{
                        boxShadow: `0 0 0 2px ${tm.color}, 0 0 8px ${tm.color}77`,
                      }} />
                      <span style={{
                        fontSize: 'clamp(13px, 1.4vw, 18px)', fontWeight: 900, color: tm.color,
                      }}>{tm.name}</span>
                      <span style={{
                        padding: '2px 8px', borderRadius: 999,
                        background: 'rgba(34,197,94,0.18)', border: '1.5px solid rgba(34,197,94,0.4)',
                        fontSize: 11, fontWeight: 800, color: '#86EFAC',
                        whiteSpace: 'nowrap',
                      }}>
                        {lang === 'de' ? `H${g.atHintIdx + 1} · ${pts} Pkt` : `H${g.atHintIdx + 1} · ${pts} pts`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Team-Status-Reihe (analog CHEESE/4×4) */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 'clamp(10px, 1.6vw, 22px)', flexWrap: 'wrap',
        position: 'relative', zIndex: 5,
        animation: 'contentReveal 0.45s ease 0.2s both',
      }}>
        {s.teams.map((tm) => {
          const isLocked = lockedSet.has(tm.id);
          const isWinner = winnerSet.has(tm.id);
          const dim = !isLocked && !isWinner;
          return (
            <div key={tm.id} title={tm.name} style={{
              position: 'relative',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              opacity: dim ? 0.55 : 1,
              filter: dim ? 'grayscale(0.4)' : 'none',
              transition: 'opacity 0.4s ease, filter 0.4s ease',
            }}>
              <QQTeamAvatar avatarId={tm.avatarId} size={'clamp(48px, 5vw, 72px)'} style={{
                background: '#0d0a06',
                boxShadow: isWinner
                  ? '0 0 0 3px #FBBF24, 0 0 18px #FBBF2477, 0 4px 10px rgba(0,0,0,0.55)'
                  : `0 0 0 2px ${tm.color}66, 0 4px 10px rgba(0,0,0,0.55)`,
              }} />
              {isWinner && (
                <div style={{
                  position: 'absolute', bottom: -4, right: -4,
                  width: 26, height: 26, borderRadius: '50%',
                  background: '#FBBF24', border: '2px solid #0D0A06',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, lineHeight: 1,
                  boxShadow: '0 0 12px rgba(251,191,36,0.55)',
                  animation: 'bAnswerCheck 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
                }}>🏆</div>
              )}
              {isLocked && !isWinner && (
                <div style={{
                  position: 'absolute', bottom: -4, right: -4,
                  width: 26, height: 26, borderRadius: '50%',
                  background: '#EF4444', border: '2px solid #0D0A06',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 900, color: '#fff', lineHeight: 1,
                  animation: 'bAnswerCheck 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
                }}>✕</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Top-5 Reveal: zweispaltige Show-Seite.
 * Links: Frage + Gewinner-Block. Rechts: Top-5-Liste die sequentiell 5→1 aufdeckt.
 * Nach jeder Antwort erscheinen Avatare (oder X-Kreis wenn niemand) mit Pop-Animation.
 */
function Top5Reveal({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const q = s.currentQuestion!;
  const btt = q.bunteTuete as any;
  const correctListDE: string[] = (btt.answers ?? []).map((x: string) => x.trim()).filter(Boolean);
  const correctListEN: string[] = (btt.answersEn ?? []).map((x: string) => x.trim()).filter(Boolean);
  const correctList = lang === 'en' && correctListEN.length ? correctListEN : correctListDE;
  const n = correctList.length;

  // Match-Logik:
  // 1. Normalisieren: lowercase, Sonderzeichen raus, Whitespace-trim
  // 2. Direkter String-Match ODER Multiword-Korrektantwort als Bag-of-Tokens
  //    Substring-Match nur noch bei sehr kurzen Antworten (<=2 Tokens) verhindert,
  //    dass "brot" auf "Mischbrot/Toastbrot/Vollkornbrot" matcht.
  const norm = (x: string) =>
    x.toLowerCase()
      .replace(/[^a-z0-9äöüß\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const matches = (p: string, c: string) => {
    const np = norm(p);
    const nc = norm(c);
    if (!np || !nc) return false;
    if (np === nc) return true;
    // Für korrekte Antworten aus mehreren Wörtern: Spielerantwort muss alle
    // Tokens enthalten (robust gegen Umstellung, aber nicht gegen Substrings).
    const cTokens = nc.split(' ').filter(t => t.length >= 2);
    if (cTokens.length >= 2) {
      const pTokens = np.split(' ');
      return cTokens.every(ct => pTokens.includes(ct));
    }
    // Kurze Antworten: Wort-Boundary-Match (nicht "brot" in "Mischbrot")
    const re = new RegExp(`\\b${nc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    return re.test(np);
  };

  // perAnswer in Original-Reihenfolge (Platz 1 = Index 0).
  const perAnswer = useMemo(() => {
    const teamAnswers = s.answers.map(a => ({
      teamId: a.teamId,
      parts: a.text.split('|').map(p => p.trim()).filter(Boolean),
    }));
    return correctList.map((correct, ci) => {
      const de = correctListDE[ci] ?? '';
      const en = correctListEN[ci] ?? '';
      const hitters = teamAnswers
        .filter(ta => ta.parts.some(p => (de && matches(p, de)) || (en && matches(p, en))))
        .map(ta => s.teams.find(t => t.id === ta.teamId))
        .filter((t): t is NonNullable<typeof t> => !!t);
      return { correct, hitters };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.answers, s.teams, correctList, correctListDE, correctListEN]);

  // Treffer pro Team — für Winner-Block. Jeder korrekten Antwort darf pro Team
  // nur EINMAL getroffen werden (sonst könnte derselbe Part auf mehrere matchen).
  const teamScore = useMemo(() => {
    const accepted = correctListDE.map((de, i) => ({ de, en: correctListEN[i] ?? '' }));
    return s.answers.map(a => {
      const parts = a.text.split('|').map(p => p.trim()).filter(Boolean);
      const hitIdx = new Set<number>();
      parts.forEach(p => {
        accepted.forEach((c, i) => {
          if (hitIdx.has(i)) return;
          if ((c.de && matches(p, c.de)) || (c.en && matches(p, c.en))) hitIdx.add(i);
        });
      });
      return { teamId: a.teamId, hits: hitIdx.size };
    }).sort((x, y) => y.hits - x.hits);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.answers, correctListDE, correctListEN]);

  const topHits = teamScore[0]?.hits ?? 0;
  const winners = teamScore.filter(t => t.hits === topHits && topHits > 0);

  // Sequentielles Reveal: Start mit -1 (noch nichts), dann 5, 4, 3, 2, 1 (Indizes: n-1 … 0).
  // revealedMinIdx ist der kleinste Index, der bereits aufgedeckt wurde.
  // Start: n (keiner), Ende: 0 (alle).
  const [revealedMinIdx, setRevealedMinIdx] = useState<number>(n);
  const STEP_MS = 2400;
  const INITIAL_DELAY_MS = 600;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < n; i++) {
      const targetIdx = n - 1 - i; // Erst Platz n (höchster Index), dann runter
      const t = setTimeout(() => {
        setRevealedMinIdx(targetIdx);
        // Sound: jeder Reveal ein sanfter Tick; letzter (Platz 1) eine Fanfare
        if (!s.sfxMuted) {
          if (targetIdx === 0) playFanfare(); else playReveal();
        }
      }, INITIAL_DELAY_MS + i * STEP_MS);
      timers.push(t);
    }
    return () => { timers.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      gap: 'clamp(14px, 1.8vh, 22px)',
      padding: 'clamp(16px, 2vh, 28px) clamp(20px, 3vw, 48px) clamp(54px, 7vh, 80px)',
      animation: 'contentReveal 0.45s ease both',
      minHeight: 0,
    }}>
      {/* ── Top row: Full-width question card ─────────────────── */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '2px solid rgba(255,255,255,0.08)',
        borderRadius: 26,
        padding: 'clamp(16px, 2vh, 26px) clamp(24px, 2.8vw, 42px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        animation: 'bQuestionIn 0.5s cubic-bezier(0.34,1.4,0.64,1) both',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 'clamp(11px, 1vw, 14px)', fontWeight: 900, color: '#F59E0B',
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
        }}>
          🎁 {lang === 'en' ? 'Top 5 — Reveal' : 'Top 5 — Auflösung'}
        </div>
        <div key={lang} style={{
          fontSize: qText.length > 120 ? 'clamp(22px, 2.3vw, 34px)' : 'clamp(26px, 2.8vw, 44px)',
          fontWeight: 900, lineHeight: 1.18, color: '#F1F5F9',
          animation: 'langFadeIn 0.4s ease both',
        }}>
          {qText}
        </div>
      </div>

      {/* ── Bottom row: Winners (left) + Top-5 list (right) ───── */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 7fr)',
        gap: 'clamp(16px, 2.5vw, 36px)',
        minHeight: 0,
      }}>
        {/* Winner card — Team-Farben-Frame bei Einzelsieger, Gold bei mehreren. */}
        {(() => {
          const singleColor = winners.length === 1
            ? s.teams.find(t => t.id === winners[0].teamId)?.color ?? null
            : null;
          const cardBgGrad = winners.length === 0
            ? 'transparent'
            : singleColor
              ? `linear-gradient(135deg, ${singleColor}1f, ${singleColor}07)`
              : 'linear-gradient(135deg, rgba(251,191,36,0.14), rgba(251,191,36,0.04))';
          const cardBorder = winners.length === 0
            ? 'none'
            : singleColor
              ? `3px solid ${singleColor}88`
              : '3px solid rgba(251,191,36,0.55)';
          const cardShadow = winners.length === 0
            ? 'none'
            : singleColor
              ? `0 0 48px ${singleColor}33, 0 8px 24px rgba(0,0,0,0.4)`
              : '0 0 48px rgba(251,191,36,0.22), 0 8px 24px rgba(0,0,0,0.4)';
          return (
        <div style={{
          height: '100%',
          background: cardBgGrad,
          border: cardBorder,
          borderRadius: 26,
          padding: 'clamp(18px, 2.4vh, 32px) clamp(14px, 1.8vw, 28px)',
          boxShadow: cardShadow,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          gap: 14, minHeight: 0,
          opacity: revealedMinIdx === 0 ? 1 : 0.12,
          filter: revealedMinIdx === 0 ? 'none' : 'blur(18px) saturate(0.4)',
          transition: 'opacity 0.7s ease, filter 0.7s ease',
        }}>
          <div style={{
            fontSize: 'clamp(11px, 1vw, 14px)', fontWeight: 900, color: '#94a3b8',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            <QQEmojiIcon emoji="🏆"/> {winners.length > 1
              ? (lang === 'en' ? 'Round winners' : 'Rundensieger')
              : (lang === 'en' ? 'Round winner' : 'Rundensieger')}
          </div>
          {winners.length === 0 ? (
            <div style={{ fontSize: 'clamp(20px, 2.2vw, 32px)', fontWeight: 900, color: '#f87171' }}>
              {lang === 'en' ? 'Nobody scored.' : 'Niemand hat getroffen.'}
            </div>
          ) : (() => {
            // Skaliere Größen je nach Anzahl Sieger — wenig Sieger = deutlich größer.
            const wn = winners.length;
            // Ab 5 Siegern 2 Spalten (4-4 bei 8) damit unten nichts abgeschnitten wird
            const twoCol = wn >= 5;
            const avatarSize =
              wn === 1 ? 'clamp(130px, 14vw, 210px)'
              : wn === 2 ? 'clamp(112px, 11.5vw, 172px)'
              : wn === 3 ? 'clamp(96px, 9.8vw, 144px)'
              : wn === 4 ? 'clamp(84px, 8.6vw, 124px)'
              : wn <= 6 ? 'clamp(70px, 6.4vw, 100px)'
              : 'clamp(64px, 5.8vw, 92px)';
            const nameSize =
              wn === 1 ? 'clamp(40px, 4.6vw, 76px)'
              : wn === 2 ? 'clamp(34px, 3.8vw, 60px)'
              : wn === 3 ? 'clamp(30px, 3.4vw, 52px)'
              : wn === 4 ? 'clamp(26px, 3vw, 44px)'
              : wn <= 6 ? 'clamp(20px, 2.1vw, 30px)'
              : 'clamp(18px, 1.95vw, 28px)';
            const subSize =
              wn === 1 ? 'clamp(18px, 1.9vw, 30px)'
              : wn === 2 ? 'clamp(16px, 1.7vw, 26px)'
              : wn === 3 ? 'clamp(15px, 1.6vw, 24px)'
              : wn === 4 ? 'clamp(14px, 1.5vw, 22px)'
              : 'clamp(12px, 1.3vw, 18px)';
            const rowGap = wn <= 2 ? 18 : wn === 3 ? 14 : wn === 4 ? 12 : 10;
            const itemGap = wn <= 2 ? 20 : wn === 3 ? 18 : wn === 4 ? 16 : twoCol ? 10 : 14;
            return (
              <div style={{
                display: 'grid',
                gridTemplateColumns: twoCol ? '1fr 1fr' : '1fr',
                gap: twoCol ? `${rowGap}px 18px` : `${rowGap}px`,
                minHeight: 0, overflow: 'hidden',
              }}>
                {winners.map(w => {
                  const tm = s.teams.find(t => t.id === w.teamId);
                  if (!tm) return null;
                  return (
                    <div key={tm.id} style={{
                      display: 'flex', alignItems: 'center', gap: itemGap, minWidth: 0,
                      animation: revealedMinIdx === 0 ? 'revealWinnerIn 0.6s cubic-bezier(0.34,1.4,0.64,1) 0.2s both' : 'none',
                    }}>
                      <QQTeamAvatar avatarId={tm.avatarId} size={avatarSize} style={{
                        flexShrink: 0,
                        animation: revealedMinIdx === 0 ? 'celebShake 0.6s ease 0.6s both' : 'none',
                      }} />
                      <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                        <div style={{
                          fontSize: nameSize, fontWeight: 900, color: tm.color, lineHeight: 1.1,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>{tm.name}</div>
                        <div style={{
                          fontSize: subSize, fontWeight: 800, color: '#cbd5e1', marginTop: 2,
                        }}>
                          {w.hits}/{n} {lang === 'en' ? 'correct' : 'richtig'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
          );
        })()}

      {/* ── Right column: Top-5 List (bottom-up reveal, fills column) ─────── */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.2vh, 14px)',
        justifyContent: 'space-between',
        minHeight: 0, height: '100%',
      }}>
        {perAnswer.map(({ correct, hitters }, idx) => {
          const rank = idx + 1;
          const isVisible = idx >= revealedMinIdx;
          const hasHits = hitters.length > 0;
          const rankGradient = rank === 1
            ? 'linear-gradient(135deg,#FBBF24,#F59E0B)'
            : rank === 2
              ? 'linear-gradient(135deg,#E2E8F0,#94A3B8)'
              : rank === 3
                ? 'linear-gradient(135deg,#F97316,#B45309)'
                : 'linear-gradient(135deg,#475569,#334155)';
          return (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                alignItems: 'center',
                gap: 'clamp(10px, 1.2vw, 18px)',
                padding: 'clamp(10px, 1.4vh, 18px) clamp(14px, 1.6vw, 22px)',
                borderRadius: 18,
                background: hasHits
                  ? 'linear-gradient(135deg, rgba(34,197,94,0.14), rgba(22,163,74,0.06))'
                  : 'rgba(148,163,184,0.06)',
                border: hasHits
                  ? '2px solid rgba(34,197,94,0.4)'
                  : '2px solid rgba(148,163,184,0.15)',
                visibility: isVisible ? 'visible' : 'hidden',
                animation: isVisible
                  ? `top5RowSlideIn 0.55s cubic-bezier(0.22,1,0.36,1) both, top5RowGlow 1.2s ease 0.3s both`
                  : 'none',
                flex: 1,
                minHeight: 'clamp(64px, 8vh, 92px)',
              }}
            >
              {/* Rank badge */}
              <div style={{
                width: 'clamp(52px, 5vw, 72px)', height: 'clamp(52px, 5vw, 72px)',
                borderRadius: 16,
                background: rankGradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'clamp(24px, 2.8vw, 40px)', fontWeight: 900, color: '#fff',
                flexShrink: 0,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                animation: isVisible ? 'top5RankPop 0.55s cubic-bezier(0.34,1.4,0.64,1) 0.1s both' : 'none',
                boxShadow: rank === 1 ? '0 0 20px rgba(251,191,36,0.5)' : 'none',
              }}>
                #{rank}
              </div>

              {/* Answer text */}
              <div style={{
                fontSize: 'clamp(20px, 2.3vw, 34px)', fontWeight: 900,
                color: hasHits ? '#86efac' : '#cbd5e1',
                lineHeight: 1.2,
                minWidth: 0, wordBreak: 'break-word',
              }}>
                {hasHits ? '✓ ' : ''}{correct}
              </div>

              {/* Hitters / No-hit X */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                flexShrink: 0,
              }}>
                {hasHits ? (
                  hitters.map((tm, hi) => (
                    <QQTeamAvatar
                      key={tm.id}
                      avatarId={tm.avatarId}
                      size={'clamp(52px, 5.4vw, 78px)'}
                      title={tm.name}
                      style={{
                        boxShadow: `0 0 16px ${tm.color}66`,
                        animation: isVisible
                          ? `top5AvatarPop 0.5s cubic-bezier(0.34,1.6,0.64,1) ${0.35 + hi * 0.09}s both`
                          : 'none',
                      }}
                    />
                  ))
                ) : (
                  <div style={{
                    width: 'clamp(52px, 5.4vw, 78px)', height: 'clamp(52px, 5.4vw, 78px)',
                    borderRadius: '50%',
                    background: 'rgba(148,163,184,0.15)',
                    border: '2px dashed rgba(148,163,184,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'clamp(20px, 2.2vw, 28px)', fontWeight: 900, color: '#94a3b8',
                    animation: isVisible
                      ? `top5AvatarPop 0.5s cubic-bezier(0.34,1.6,0.64,1) 0.35s both`
                      : 'none',
                  }}>
                    ✕
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OrderReveal — Bunte-Tüte "order" reveal, Top5-Style mit 2-Spalten-Layout
// ═══════════════════════════════════════════════════════════════════════════════
function OrderReveal({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const q = s.currentQuestion!;
  const btt = q.bunteTuete as any;
  const itemsDE: string[] = (btt.items ?? []) as string[];
  const itemsEN: string[] = (btt.itemsEn ?? []) as string[];
  const itemValues: string[] = (btt.itemValues ?? []) as string[];
  const correctOrder: number[] = (btt.correctOrder ?? []) as number[];
  const items = lang === 'en' && itemsEN.length ? itemsEN : itemsDE;
  const n = correctOrder.length;

  const criteriaTxt = lang === 'en' && btt.criteriaEn ? btt.criteriaEn : btt.criteria;

  // Antworten sind meistens Item-Texte ("text1|text2|..."), manchmal noch Indizes
  // ("0|1|2"). Wir normalisieren pro Position auf den Item-Index, indem wir zuerst
  // als Zahl probieren und dann über DE/EN-Item-Listen matchen.
  const parsedAnswers = useMemo(() => {
    const deLc = itemsDE.map(s => (s ?? '').trim().toLowerCase());
    const enLc = itemsEN.map(s => (s ?? '').trim().toLowerCase());
    return s.answers.map(a => {
      const parts = String(a.text ?? '').split('|').map(p => p.trim()).filter(Boolean);
      const order: number[] = parts.map(p => {
        const asNum = Number(p);
        if (Number.isFinite(asNum) && asNum >= 0 && asNum < itemsDE.length) return asNum;
        const pLc = p.toLowerCase();
        const di = deLc.indexOf(pLc);
        if (di >= 0) return di;
        const ei = enLc.indexOf(pLc);
        if (ei >= 0) return ei;
        return -1;
      });
      return { teamId: a.teamId, order };
    });
  }, [s.answers, itemsDE, itemsEN]);

  // Pro Position: welche Teams haben hier den richtigen Item-Index gesetzt?
  const perPosition = useMemo(() => {
    return correctOrder.map((correctIdx, posIdx) => {
      const hitters = parsedAnswers
        .filter(pa => pa.order[posIdx] === correctIdx)
        .map(pa => s.teams.find(t => t.id === pa.teamId))
        .filter((t): t is NonNullable<typeof t> => !!t);
      return { correctIdx, hitters };
    });
  }, [parsedAnswers, correctOrder, s.teams]);

  // Treffer pro Team (Anzahl korrekter Positionen).
  const teamScore = useMemo(() => {
    return parsedAnswers.map(pa => {
      let hits = 0;
      for (let i = 0; i < n; i++) {
        if (pa.order[i] === correctOrder[i]) hits++;
      }
      return { teamId: pa.teamId, hits };
    }).sort((x, y) => y.hits - x.hits);
  }, [parsedAnswers, correctOrder, n]);

  const topHits = teamScore[0]?.hits ?? 0;
  const winners = teamScore.filter(t => t.hits === topHits && topHits > 0);

  // Bottom-up reveal: Start mit n (keiner), dann n-1, ..., 0.
  const [revealedMinIdx, setRevealedMinIdx] = useState<number>(n);
  const STEP_MS = 2000;
  const INITIAL_DELAY_MS = 500;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < n; i++) {
      const targetIdx = n - 1 - i;
      const t = setTimeout(() => {
        setRevealedMinIdx(targetIdx);
        if (!s.sfxMuted) {
          if (targetIdx === 0) playFanfare(); else playReveal();
        }
      }, INITIAL_DELAY_MS + i * STEP_MS);
      timers.push(t);
    }
    return () => { timers.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      gap: 'clamp(14px, 1.8vh, 22px)',
      padding: 'clamp(16px, 2vh, 28px) clamp(20px, 3vw, 48px) clamp(54px, 7vh, 80px)',
      animation: 'contentReveal 0.45s ease both',
      minHeight: 0,
    }}>
      {/* ── Top: Frage ─────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '2px solid rgba(255,255,255,0.08)',
        borderRadius: 26,
        padding: 'clamp(16px, 2vh, 26px) clamp(24px, 2.8vw, 42px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        animation: 'bQuestionIn 0.5s cubic-bezier(0.34,1.4,0.64,1) both',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 'clamp(11px, 1vw, 14px)', fontWeight: 900, color: '#F59E0B',
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
        }}>
          🎁 {lang === 'en' ? 'Lucky Bag — Order' : 'Bunte Tüte — Reihenfolge'}
        </div>
        <div key={lang} style={{
          fontSize: qText.length > 120 ? 'clamp(22px, 2.3vw, 34px)' : 'clamp(26px, 2.8vw, 44px)',
          fontWeight: 900, lineHeight: 1.18, color: '#F1F5F9',
          animation: 'langFadeIn 0.4s ease both',
        }}>
          {qText}
        </div>
        {criteriaTxt && (
          <div style={{
            marginTop: 8, fontSize: 'clamp(14px, 1.4vw, 20px)', fontWeight: 700,
            color: '#FDE68A', fontStyle: 'italic',
          }}>
            ↕ {criteriaTxt}
          </div>
        )}
      </div>

      {/* ── Mitte: Antwort-Liste full-width, von oben nach unten ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minHeight: 0,
      }}>
        {/* Antwort-Liste — bottom-up enthuellt */}
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.2vh, 14px)',
          justifyContent: 'space-between',
          minHeight: 0,
        }}>
          {perPosition.map(({ correctIdx, hitters }, idx) => {
            const rank = idx + 1;
            const isVisible = idx >= revealedMinIdx;
            const hasHits = hitters.length > 0;
            const rankGradient = rank === 1
              ? 'linear-gradient(135deg,#FBBF24,#F59E0B)'
              : rank === 2
                ? 'linear-gradient(135deg,#E2E8F0,#94A3B8)'
                : rank === 3
                  ? 'linear-gradient(135deg,#F97316,#B45309)'
                  : 'linear-gradient(135deg,#475569,#334155)';
            const itemText = items[correctIdx] ?? '';
            return (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  alignItems: 'center',
                  gap: 'clamp(10px, 1.2vw, 18px)',
                  padding: 'clamp(10px, 1.4vh, 18px) clamp(14px, 1.6vw, 22px)',
                  borderRadius: 18,
                  background: hasHits
                    ? 'linear-gradient(135deg, rgba(34,197,94,0.14), rgba(22,163,74,0.06))'
                    : 'rgba(148,163,184,0.06)',
                  border: hasHits
                    ? '2px solid rgba(34,197,94,0.4)'
                    : '2px solid rgba(148,163,184,0.15)',
                  visibility: isVisible ? 'visible' : 'hidden',
                  animation: isVisible
                    ? `top5RowSlideIn 0.55s cubic-bezier(0.22,1,0.36,1) both, top5RowGlow 1.2s ease 0.3s both`
                    : 'none',
                  flex: 1,
                  minHeight: 'clamp(64px, 8vh, 92px)',
                }}
              >
                <div style={{
                  width: 'clamp(52px, 5vw, 72px)', height: 'clamp(52px, 5vw, 72px)',
                  borderRadius: 16,
                  background: rankGradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'clamp(24px, 2.8vw, 40px)', fontWeight: 900, color: '#fff',
                  flexShrink: 0,
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  animation: isVisible ? 'top5RankPop 0.55s cubic-bezier(0.34,1.4,0.64,1) 0.1s both' : 'none',
                  boxShadow: rank === 1 ? '0 0 20px rgba(251,191,36,0.5)' : 'none',
                }}>
                  #{rank}
                </div>

                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: 'clamp(8px, 1vw, 14px)',
                  flexWrap: 'wrap', minWidth: 0,
                }}>
                  <div style={{
                    fontSize: 'clamp(20px, 2.3vw, 34px)', fontWeight: 900,
                    color: hasHits ? '#86efac' : '#cbd5e1',
                    lineHeight: 1.2,
                    minWidth: 0, wordBreak: 'break-word',
                  }}>
                    {hasHits ? '✓ ' : ''}{itemText}
                  </div>
                  {itemValues[correctIdx] && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '3px 12px', borderRadius: 999,
                      background: hasHits ? 'rgba(34,197,94,0.22)' : 'rgba(148,163,184,0.16)',
                      border: hasHits ? '1.5px solid rgba(34,197,94,0.55)' : '1.5px solid rgba(148,163,184,0.3)',
                      color: hasHits ? '#86efac' : '#cbd5e1',
                      fontWeight: 800,
                      fontSize: 'clamp(14px, 1.5vw, 22px)',
                      whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {itemValues[correctIdx]}
                    </span>
                  )}
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  flexShrink: 0,
                }}>
                  {hasHits ? (
                    hitters.map((tm, hi) => (
                      <QQTeamAvatar
                        key={tm.id}
                        avatarId={tm.avatarId}
                        size={'clamp(36px, 3.8vw, 54px)'}
                        title={tm.name}
                        style={{
                          boxShadow: `0 0 14px ${tm.color}66`,
                          animation: isVisible
                            ? `top5AvatarPop 0.5s cubic-bezier(0.34,1.6,0.64,1) ${0.35 + hi * 0.09}s both`
                            : 'none',
                        }}
                      />
                    ))
                  ) : (
                    <div style={{
                      width: 'clamp(36px, 3.8vw, 54px)', height: 'clamp(36px, 3.8vw, 54px)',
                      borderRadius: '50%',
                      background: 'rgba(148,163,184,0.15)',
                      border: '2px dashed rgba(148,163,184,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 'clamp(20px, 2.2vw, 28px)', fontWeight: 900, color: '#94a3b8',
                      animation: isVisible
                        ? `top5AvatarPop 0.5s cubic-bezier(0.34,1.6,0.64,1) 0.35s both`
                        : 'none',
                    }}>
                      ✕
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sieger-Footer — horizontale Pill-Reihe, skaliert bis 8 Teams */}
        <div style={{
          marginTop: 'clamp(10px, 1.4vh, 18px)',
          padding: 'clamp(10px, 1.4vh, 16px) clamp(14px, 1.8vw, 24px)',
          borderRadius: 18,
          background: winners.length > 0
            ? 'linear-gradient(135deg, rgba(251,191,36,0.10), rgba(245,158,11,0.04))'
            : 'rgba(148,163,184,0.06)',
          border: winners.length > 0
            ? '2px solid rgba(251,191,36,0.35)'
            : '2px solid rgba(148,163,184,0.15)',
          display: 'flex', alignItems: 'center',
          gap: 'clamp(12px, 1.6vw, 22px)',
          flexShrink: 0, minHeight: 0,
          opacity: revealedMinIdx === 0 ? 1 : 0.18,
          filter: revealedMinIdx === 0 ? 'none' : 'blur(8px) saturate(0.4)',
          transition: 'opacity 0.6s ease, filter 0.6s ease',
        }}>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 2,
            flexShrink: 0, minWidth: 0,
            paddingRight: 'clamp(8px, 1vw, 16px)',
            borderRight: '2px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{
              fontSize: 'clamp(11px, 1vw, 14px)', fontWeight: 900, color: '#FBBF24',
              letterSpacing: '0.16em', textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}>
              <QQEmojiIcon emoji="🏆"/> {winners.length > 1
                ? (lang === 'en' ? 'Round winners' : 'Rundensieger')
                : (lang === 'en' ? 'Round winner' : 'Rundensieger')}
            </div>
            {winners.length > 0 && (
              <div style={{
                fontSize: 'clamp(13px, 1.2vw, 18px)', fontWeight: 800, color: '#cbd5e1',
                whiteSpace: 'nowrap',
              }}>
                {winners[0].hits}/{n} {lang === 'en' ? 'correct' : 'richtig'}
              </div>
            )}
          </div>

          {winners.length === 0 ? (
            <div style={{
              fontSize: 'clamp(18px, 2vw, 28px)', fontWeight: 900, color: '#f87171',
            }}>
              {lang === 'en' ? 'Nobody scored.' : 'Niemand hat getroffen.'}
            </div>
          ) : (() => {
            const wn = winners.length;
            // Avatar + Name als Pill, skaliert je nach Anzahl Sieger
            const avatarSize = wn <= 2 ? 'clamp(54px, 5.6vw, 78px)'
              : wn <= 4 ? 'clamp(46px, 4.8vw, 66px)'
              : wn <= 6 ? 'clamp(40px, 4.2vw, 56px)'
              : 'clamp(36px, 3.8vw, 50px)';
            const nameSize = wn <= 2 ? 'clamp(20px, 2.2vw, 32px)'
              : wn <= 4 ? 'clamp(17px, 1.9vw, 26px)'
              : wn <= 6 ? 'clamp(15px, 1.7vw, 22px)'
              : 'clamp(14px, 1.5vw, 19px)';
            const pillGap = wn <= 4 ? 'clamp(10px, 1.2vw, 18px)' : 'clamp(8px, 0.9vw, 12px)';
            return (
              <div style={{
                display: 'flex', alignItems: 'center', flexWrap: 'wrap',
                gap: pillGap,
                flex: 1, minWidth: 0,
              }}>
                {winners.map((w, wi) => {
                  const tm = s.teams.find(t => t.id === w.teamId);
                  if (!tm) return null;
                  return (
                    <div key={tm.id} style={{
                      display: 'flex', alignItems: 'center', gap: 'clamp(6px, 0.8vw, 12px)',
                      padding: 'clamp(4px, 0.6vh, 8px) clamp(10px, 1.1vw, 16px) clamp(4px, 0.6vh, 8px) clamp(4px, 0.5vh, 6px)',
                      borderRadius: 999,
                      background: `linear-gradient(135deg, ${tm.color}26, ${tm.color}0a)`,
                      border: `2px solid ${tm.color}66`,
                      animation: revealedMinIdx === 0
                        ? `revealWinnerIn 0.55s cubic-bezier(0.34,1.4,0.64,1) ${0.2 + wi * 0.08}s both`
                        : 'none',
                      minWidth: 0,
                    }}>
                      <QQTeamAvatar avatarId={tm.avatarId} size={avatarSize} style={{
                        flexShrink: 0,
                        boxShadow: `0 0 14px ${tm.color}66`,
                      }} />
                      <div style={{
                        fontSize: nameSize, fontWeight: 900, color: tm.color, lineHeight: 1.1,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        minWidth: 0,
                      }}>{tm.name}</div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SchaetzchenReveal — Top5-Style:
// oben Frage (volle Breite), darunter links Lösung+Gewinner, rechts Top 5 Teams
// (max 5, am nächsten dran). Bottom-up Enthüllung bis zum Gewinner.
// ═══════════════════════════════════════════════════════════════════════════════
function SchaetzchenReveal({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const q = s.currentQuestion!;
  const target = q.targetValue as number;

  // Jahreszahlen (Unit enthaelt "Jahr"/"year") OHNE Tausenderpunkt formatieren —
  // sonst stehen Werte wie 1500 als '1.500' da, was wie 1.5 aussieht und falsch ist.
  const unitStr = (lang === 'en' && q.unitEn ? q.unitEn : q.unit) ?? '';
  const isYearUnit = /jahr|year/i.test(unitStr);

  const fmt = (n: number) => {
    const abs = Math.abs(n);
    if (isYearUnit) return String(Math.round(n));
    if (abs >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (abs >= 10000) return (n / 1000).toFixed(0) + 'k';
    if (abs >= 1000) return n.toLocaleString(lang === 'en' ? 'en-US' : 'de-DE');
    return n % 1 === 0 ? String(n) : n.toFixed(1);
  };

  // Parse + Distanz. Sort: bester (geringste |Δ|) zuerst, bei Delta-Tie → schnellste Einreichung gewinnt.
  const ranked = useMemo(() => {
    return s.answers
      .map(a => {
        const num = Number(String(a.text).replace(/[^0-9.,\-]/g, '').replace(',', '.'));
        const team = s.teams.find(t => t.id === a.teamId);
        if (!team || !Number.isFinite(num)) return null;
        return { teamId: a.teamId, num, team, delta: Math.abs(num - target), submittedAt: a.submittedAt };
      })
      .filter((x): x is { teamId: string; num: number; team: NonNullable<ReturnType<typeof s.teams.find>>; delta: number; submittedAt: number } => !!x)
      .sort((a, b) => a.delta - b.delta || a.submittedAt - b.submittedAt);
  }, [s.answers, s.teams, target]);

  // Max 5 Teams rechts; Bottom-up Enthüllung (#5 → #4 → … → #1).
  const top5 = ranked.slice(0, 5);
  const n = top5.length;
  const winner = ranked[0] ?? null;

  const [revealedMinIdx, setRevealedMinIdx] = useState<number>(n);
  const STEP_MS = 1600;
  const INITIAL_DELAY_MS = 500;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < n; i++) {
      const targetIdx = n - 1 - i;
      const t = setTimeout(() => {
        setRevealedMinIdx(targetIdx);
        if (!s.sfxMuted) {
          if (targetIdx === 0) playFanfare(); else playReveal();
        }
      }, INITIAL_DELAY_MS + i * STEP_MS);
      timers.push(t);
    }
    return () => { timers.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      gap: 'clamp(12px, 1.6vh, 20px)',
      padding: 'clamp(14px, 1.8vh, 24px) clamp(20px, 3vw, 48px)',
      animation: 'contentReveal 0.45s ease both',
      minHeight: 0,
    }}>
      {/* ── Zeile 1: Frage über ganze Breite (Top-5-Style) ── */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '2px solid rgba(255,255,255,0.08)',
        borderRadius: 26,
        padding: 'clamp(14px, 1.8vh, 22px) clamp(22px, 2.6vw, 42px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        animation: 'bQuestionIn 0.5s cubic-bezier(0.34,1.4,0.64,1) both',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        flexShrink: 0, overflow: 'hidden',
      }}>
        <div style={{
          fontSize: 'clamp(11px, 1vw, 14px)', fontWeight: 900, color: '#EAB308',
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6,
        }}>
          <QQEmojiIcon emoji="🎯"/> {lang === 'en' ? 'Guess It — Reveal' : 'Schätzchen — Auflösung'}
        </div>
        <div key={lang} style={{
          fontSize: qText.length > 120 ? 'clamp(22px, 2.2vw, 34px)' : 'clamp(26px, 2.8vw, 44px)',
          fontWeight: 900, lineHeight: 1.18, color: '#F1F5F9',
          textAlign: 'center', minWidth: 0,
          animation: 'langFadeIn 0.4s ease both',
        }}>
          {qText}
        </div>
      </div>

      {/* ── Zeile 2: Grid — links Lösung + Gewinner, rechts Top 5 ── */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: 'clamp(16px, 2.4vw, 32px)',
        minHeight: 0,
      }}>
        {/* Linke Spalte: 2 separate Cards — Lösung (gruen umrandet) oben,
            Gewinner (in Teamfarbe umrandet) unten. War vorher eine unified
            Card mit nur grünem Rand und Winner als Footer — User wollte die
            Winner-Hälfte deutlich in Team-Farbe abgesetzt sehen. */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          gap: 'clamp(10px, 1.4vh, 18px)',
          minHeight: 0, minWidth: 0,
        }}>
          {/* Loesung — obere Card, gruen umrandet */}
          <div style={{
            flex: '1 1 0', minHeight: 0,
            borderRadius: 24,
            background: 'radial-gradient(circle at 50% 35%, rgba(34,197,94,0.18), rgba(22,163,74,0.04) 70%)',
            border: '3px solid rgba(34,197,94,0.6)',
            boxShadow: '0 0 50px rgba(34,197,94,0.25), inset 0 0 26px rgba(34,197,94,0.08)',
            animation: 'revealAnswerBam 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s both',
            padding: 'clamp(14px, 1.8vh, 24px) clamp(18px, 2vw, 30px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Shimmer-Sweep */}
            <div style={{
              position: 'absolute', top: 0, width: '60%', height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
              animation: 'revealShimmer 0.9s ease 0.55s both',
              pointerEvents: 'none',
            }} />
            <div style={{
              fontSize: 'clamp(12px, 1.2vw, 18px)', fontWeight: 900, color: '#86efac',
              letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.82,
              position: 'relative', zIndex: 1,
            }}>
              {lang === 'en' ? 'Answer' : 'Lösung'}
            </div>
            <div style={{
              fontSize: 'clamp(64px, 8vw, 140px)',
              fontWeight: 900, color: '#86efac', lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              textShadow: '0 0 40px rgba(34,197,94,0.5)',
              position: 'relative', zIndex: 1,
            }}>
              {fmt(target)}
            </div>
          </div>

          {/* Winner — untere Card, in Teamfarbe umrandet */}
          {winner && (
            <div style={{
              flex: '1 1 0', minHeight: 0,
              borderRadius: 24,
              border: `3px solid ${winner.team.color}`,
              background: `linear-gradient(180deg, ${winner.team.color}26, ${winner.team.color}08)`,
              boxShadow: `0 0 44px ${winner.team.color}44, inset 0 0 26px ${winner.team.color}11`,
              padding: 'clamp(14px, 1.8vh, 24px) clamp(18px, 2.2vw, 32px)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 'clamp(8px, 1.2vh, 16px)',
              minWidth: 0,
              opacity: revealedMinIdx === 0 ? 1 : 0.12,
              filter: revealedMinIdx === 0 ? 'none' : 'blur(18px) saturate(0.4)',
              transition: 'opacity 0.7s ease, filter 0.7s ease',
              position: 'relative',
            }}>
              {/* Trophy-Label oben, klein und mittig */}
              <span style={{
                fontSize: 'clamp(10px, 0.9vw, 13px)', fontWeight: 900,
                color: winner.team.color, letterSpacing: '0.16em', textTransform: 'uppercase',
                opacity: 0.92, whiteSpace: 'nowrap',
              }}>
                <QQEmojiIcon emoji="🏆"/> {lang === 'en' ? 'Closest' : 'Am nächsten dran'}
              </span>

              {/* Mega-Zahl — gleiche Groesse + zentriert wie Loesung darueber */}
              <div style={{
                fontSize: 'clamp(64px, 8vw, 140px)',
                fontWeight: 900, color: winner.team.color, lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                textShadow: `0 0 40px ${winner.team.color}66`,
                animation: revealedMinIdx === 0 ? 'revealWinnerIn 0.6s cubic-bezier(0.34,1.4,0.64,1) 0.3s both' : 'none',
              }}>
                {fmt(winner.num)}
              </div>

              {/* Team-Info-Reihe: Avatar | Name | Delta-Pill */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 'clamp(10px, 1.2vw, 18px)',
                flexWrap: 'wrap', minWidth: 0,
              }}>
                <QQTeamAvatar avatarId={winner.team.avatarId} size={'clamp(48px, 5vw, 72px)'} style={{
                  flexShrink: 0,
                  boxShadow: `0 0 22px ${winner.team.color}77`,
                  animation: revealedMinIdx === 0 ? 'celebShake 0.6s ease 0.6s both' : 'none',
                }} />
                <div style={{
                  fontSize: 'clamp(20px, 2.2vw, 36px)', fontWeight: 900, color: winner.team.color,
                  lineHeight: 1.05,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  maxWidth: 'min(40vw, 360px)',
                  textShadow: `0 0 22px ${winner.team.color}55`,
                }}>{winner.team.name}</div>
                <div style={{
                  display: 'inline-flex', alignItems: 'baseline', gap: 6,
                  padding: '6px 16px',
                  borderRadius: 999,
                  background: winner.delta === 0 ? 'rgba(34,197,94,0.22)' : `${winner.team.color}22`,
                  border: winner.delta === 0 ? '2px solid rgba(34,197,94,0.6)' : `2px solid ${winner.team.color}66`,
                  fontSize: 'clamp(16px, 1.7vw, 26px)', fontWeight: 900,
                  color: winner.delta === 0 ? '#86efac' : '#e2e8f0',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.02em',
                }}>
                  {winner.delta === 0
                    ? (lang === 'en' ? '✨ exact!' : '✨ genau!')
                    : `Δ ${fmt(winner.delta)}`}
                </div>
              </div>
            </div>
          )}
          {!winner && (
            <div style={{
              flex: '1 1 0', minHeight: 0,
              borderRadius: 24,
              border: '2px solid rgba(239,68,68,0.4)',
              padding: 'clamp(14px, 1.8vh, 24px) clamp(18px, 2.2vw, 32px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'clamp(20px, 2.2vw, 32px)', fontWeight: 900, color: '#f87171',
            }}>
              {lang === 'en' ? 'No valid guesses.' : 'Keine gültigen Schätzungen.'}
            </div>
          )}
        </div>

        {/* Rechte Spalte: Top 5 Ranking (bottom-up enthüllt) */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.2vh, 14px)',
          minHeight: 0, minWidth: 0,
        }}>
          {top5.map((r, idx) => {
            const rank = idx + 1;
            const isVisible = idx >= revealedMinIdx;
            const isTop = rank === 1;
            // Cozy-Range: 2nd-Place ist Co-Winner wenn er in `currentQuestionWinners`
            // ist (Backend hat das beim eval bestimmt). Visuell als '+1 Feld'-Pille
            // markiert, damit klar ist 'der hat auch was bekommen'.
            const isInRangeWinner = !isTop && (s.currentQuestionWinners ?? []).includes(r.teamId);
            const rankGradient = rank === 1
              ? 'linear-gradient(135deg,#FBBF24,#F59E0B)'
              : rank === 2
                ? 'linear-gradient(135deg,#E2E8F0,#94A3B8)'
                : rank === 3
                  ? 'linear-gradient(135deg,#F97316,#B45309)'
                  : 'linear-gradient(135deg,#475569,#334155)';
            return (
              <div
                key={r.teamId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto auto 1fr auto',
                  alignItems: 'center',
                  gap: 'clamp(10px, 1.2vw, 18px)',
                  padding: 'clamp(10px, 1.4vh, 18px) clamp(14px, 1.6vw, 22px)',
                  borderRadius: 18,
                  background: isTop
                    ? `linear-gradient(135deg, ${r.team.color}22, ${r.team.color}08)`
                    : isInRangeWinner
                      ? `linear-gradient(135deg, ${r.team.color}1a, ${r.team.color}05)`
                      : 'rgba(148,163,184,0.06)',
                  border: isTop
                    ? `2px solid ${r.team.color}66`
                    : isInRangeWinner
                      ? `2px solid ${r.team.color}55`
                      : '2px solid rgba(148,163,184,0.15)',
                  visibility: isVisible ? 'visible' : 'hidden',
                  animation: isVisible
                    ? `top5RowSlideIn 0.55s cubic-bezier(0.22,1,0.36,1) both, top5RowGlow 1.2s ease 0.3s both`
                    : 'none',
                  flex: 1,
                  minHeight: 'clamp(72px, 9vh, 110px)',
                  boxShadow: isTop
                    ? `0 0 28px ${r.team.color}33`
                    : isInRangeWinner ? `0 0 18px ${r.team.color}22` : 'none',
                }}
              >
                <div style={{
                  width: 'clamp(52px, 5vw, 72px)', height: 'clamp(52px, 5vw, 72px)',
                  borderRadius: 16,
                  background: rankGradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'clamp(24px, 2.8vw, 40px)', fontWeight: 900, color: '#fff',
                  flexShrink: 0,
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  animation: isVisible ? 'top5RankPop 0.55s cubic-bezier(0.34,1.4,0.64,1) 0.1s both' : 'none',
                  boxShadow: rank === 1 ? '0 0 20px rgba(251,191,36,0.5)' : 'none',
                }}>
                  #{rank}
                </div>
                <QQTeamAvatar avatarId={r.team.avatarId} size={'clamp(44px, 4.4vw, 62px)'} style={{
                  boxShadow: `0 0 14px ${r.team.color}66`,
                  flexShrink: 0,
                  animation: isVisible ? `top5AvatarPop 0.5s cubic-bezier(0.34,1.6,0.64,1) 0.35s both` : 'none',
                }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{
                      fontSize: 'clamp(16px, 1.7vw, 24px)', fontWeight: 800,
                      color: isTop || isInRangeWinner ? r.team.color : '#cbd5e1',
                      lineHeight: 1.1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{r.team.name}</span>
                    {isInRangeWinner && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 999,
                        background: `${r.team.color}26`,
                        border: `1.5px solid ${r.team.color}66`,
                        fontSize: 'clamp(11px, 1.1vw, 15px)', fontWeight: 900,
                        color: r.team.color,
                        whiteSpace: 'nowrap',
                      }}>
                        🎯 {lang === 'en' ? 'in range · +1' : 'in Range · +1'}
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 'clamp(24px, 2.6vw, 40px)', fontWeight: 900,
                    color: isTop ? '#FDE68A' : '#f1f5f9', marginTop: 4,
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                    textShadow: isTop ? '0 0 16px rgba(251,191,36,0.35)' : 'none',
                  }}>
                    {fmt(r.num)}
                  </div>
                </div>
                <div style={{
                  padding: '8px 18px', borderRadius: 999,
                  background: isTop ? 'rgba(250,204,21,0.22)' : 'rgba(15,23,42,0.7)',
                  border: isTop ? '2px solid rgba(250,204,21,0.55)' : '1.5px solid rgba(148,163,184,0.3)',
                  fontSize: 'clamp(18px, 1.9vw, 28px)', fontWeight: 900,
                  color: isTop ? '#FDE68A' : '#e2e8f0',
                  fontVariantNumeric: 'tabular-nums',
                  flexShrink: 0,
                  animation: isVisible ? `top5AvatarPop 0.5s cubic-bezier(0.34,1.6,0.64,1) 0.45s both` : 'none',
                }}>
                  {r.delta === 0 ? '🎯 0' : `Δ ${fmt(r.delta)}`}
                </div>
              </div>
            );
          })}
          {top5.length === 0 && (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#64748b', fontSize: 'clamp(18px, 2vw, 28px)', fontWeight: 700,
            }}>
              {lang === 'en' ? 'No valid guesses.' : 'Keine gültigen Schätzungen.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CozyGuessrReveal({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const q = s.currentQuestion!;
  const btt = (q.bunteTuete as any);
  const tLat: number = btt.lat;
  const tLng: number = btt.lng;
  const step = s.mapRevealStep ?? 0;

  // Distanzen + Sortierung worst→best (für dramatisches Aufdecken)
  const scored = useMemo(() => {
    return [...s.answers].map(a => {
      const parts = String(a.text ?? '').split(',');
      const lat = Number(parts[0]); const lng = Number(parts[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { ...a, lat: null as any, lng: null as any, distKm: null as any };
      const R = 6371;
      const dLat = (lat - tLat) * Math.PI / 180;
      const dLng = (lng - tLng) * Math.PI / 180;
      const aa = Math.sin(dLat/2)**2 + Math.cos(tLat*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLng/2)**2;
      return { ...a, lat, lng, distKm: R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa)) };
    }).filter(a => a.distKm !== null);
  }, [s.answers, tLat, tLng]);

  const worstFirst = useMemo(() => [...scored].sort((a, b) => (b.distKm ?? 0) - (a.distKm ?? 0)), [scored]);
  const bestFirst  = useMemo(() => [...scored].sort((a, b) => (a.distKm ?? 0) - (b.distKm ?? 0)), [scored]);

  // Cluster-Spread: Pins, die sehr nah beieinander stehen (z.B. alle in Australien),
  // würden sich auf dem Beamer verdecken. Greedy-Clustering nach Großkreis-Distanz,
  // dann werden Duplikate kreisförmig um den Anker verteilt.
  // WICHTIG: Spread-Radius skaliert mit der Map-Spannweite, sonst verdecken sich Pins
  // bei weit auseinander liegenden Antworten (FitBounds zoomt raus → 1° = wenige Pixel).
  // displayLat/displayLng werden für das Map-Icon benutzt, lat/lng bleiben echt
  // (Distanz-Berechnung + Bounds verwenden die echten Positionen).
  const displayPos = useMemo(() => {
    const valid = scored.filter(p => p.lat != null && p.lng != null);
    // Spannweite aller Antworten + Target → Spread proportional dazu wählen.
    const allLats = [tLat, ...valid.map(p => p.lat)];
    const allLngs = [tLng, ...valid.map(p => p.lng)];
    const spanLat = Math.max(...allLats) - Math.min(...allLats);
    const spanLng = Math.max(...allLngs) - Math.min(...allLngs);
    const span = Math.max(spanLat, spanLng, 1); // mind. 1° (sonst Division-Probleme)
    // Merge-Schwelle: 4% der Spannweite, Floor 0.3° (≈ 33km).
    // Vorher Floor 2.5° (≈ 280km!) → bei Hamburg-Quiz mit teams in DE wurde
    // ein 250m-naher Pin mit 200km-Pins in einem Cluster zusammengelegt und
    // dann kreisfoermig verteilt — dadurch landete der eigentlich nahe Pin
    // weit weg vom Target. Mit 0.3° bleiben enge Pins separat, weit verstreute
    // Quizze (z.B. „weltweit") clustern weiterhin sinnvoll.
    const MERGE_DEG = Math.max(0.3, span * 0.04);

    const clusters: Array<typeof scored> = [];
    for (const p of valid) {
      let placed = false;
      for (const cl of clusters) {
        const avgLat = cl.reduce((s, q) => s + q.lat, 0) / cl.length;
        const avgLng = cl.reduce((s, q) => s + q.lng, 0) / cl.length;
        const dLat = p.lat - avgLat;
        const dLng = (p.lng - avgLng) * Math.cos(avgLat * Math.PI / 180);
        if (Math.hypot(dLat, dLng) < MERGE_DEG) {
          cl.push(p);
          placed = true;
          break;
        }
      }
      if (!placed) clusters.push([p]);
    }
    const out = new Map<string, { lat: number; lng: number }>();
    for (const list of clusters) {
      if (list.length === 1) {
        const p = list[0];
        out.set(p.teamId, { lat: p.lat, lng: p.lng });
        continue;
      }
      const avgLat = list.reduce((s, p) => s + p.lat, 0) / list.length;
      const avgLng = list.reduce((s, p) => s + p.lng, 0) / list.length;
      // Spread-Radius: 5% der Spannweite + Bonus pro Pin, Floor 0.4°
      // (vorher Floor 2.0° = 220km, was bei DE-Quiz absurd weit war).
      const radiusDeg = Math.max(0.4, span * 0.05 + list.length * 0.25);
      list.forEach((p, i) => {
        const angle = (i / list.length) * Math.PI * 2 - Math.PI / 2;
        const dLat = radiusDeg * Math.sin(angle);
        const dLng = radiusDeg * Math.cos(angle) / Math.max(0.3, Math.cos(avgLat * Math.PI / 180));
        out.set(p.teamId, { lat: avgLat + dLat, lng: avgLng + dLng });
      });
    }
    return out;
  }, [scored, tLat, tLng]);

  const showTarget  = step >= 1;
  const revealedCnt = Math.max(0, step - 1); // Step 2 = 1 Pin, Step 3 = 2 Pins, ...
  const revealedPins = worstFirst.slice(0, revealedCnt);
  const validCount = scored.length;
  const showRanking = step >= (1 + validCount + 1);

  // FitBounds bounds — aber Cap auf max. 2500km Pin-Distanz vom Ziel. Sehr
  // weit entfernte Pins (z.B. „Penguin-Team in Argentinien" bei einem
  // Hamburg-Quiz) wuerden sonst die Map auf Welt-Level rauszoomen, sodass
  // alle nahen Pins als Pixel verschmelzen. Diese „Off-Map"-Pins werden in
  // einer Leiste unter der Karte separat mit Distanz angezeigt.
  const FIT_MAX_KM = 2500;
  const onMapPins = useMemo(
    () => revealedPins.filter(p => (p.distKm ?? 0) <= FIT_MAX_KM),
    [revealedPins]
  );
  const offMapPins = useMemo(
    () => revealedPins.filter(p => (p.distKm ?? 0) > FIT_MAX_KM),
    [revealedPins]
  );
  const bounds = useMemo(() => {
    const b = L.latLngBounds([] as any);
    if (showTarget) b.extend([tLat, tLng]);
    for (const p of onMapPins) {
      const dp = displayPos.get(p.teamId);
      const lat = dp?.lat ?? p.lat;
      const lng = dp?.lng ?? p.lng;
      b.extend([lat, lng]);
    }
    if (!b.isValid()) b.extend([tLat, tLng]);
    return b;
  }, [showTarget, onMapPins, tLat, tLng, displayPos]);

  const targetIcon = useMemo(() => L.divIcon({
    className: 'qq-target-pin',
    html: `<div style="
      width: 72px; height: 72px; border-radius: 50%;
      background: radial-gradient(circle, #FDE68A 0%, #FBBF24 60%, #B45309 100%);
      border: 4px solid #FEF3C7;
      box-shadow: 0 0 0 8px rgba(251,191,36,0.25), 0 0 40px rgba(251,191,36,0.85), 0 8px 24px rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      animation: mapTargetDrop 0.75s cubic-bezier(0.34,1.56,0.64,1) both, qqTargetPulse 2.1s ease-in-out 0.8s infinite;
      position: relative;
    ">
      <div style="position:absolute; inset:14px; border-radius:50%; border:3px solid #78350F;"></div>
      <div style="position:absolute; left:50%; top:6px; bottom:6px; width:3px; background:#78350F; transform:translateX(-50%);"></div>
      <div style="position:absolute; top:50%; left:6px; right:6px; height:3px; background:#78350F; transform:translateY(-50%);"></div>
      <div style="width:14px; height:14px; border-radius:50%; background:#78350F; z-index:1;"></div>
    </div>`,
    iconSize: [72, 72] as any,
    iconAnchor: [36, 36] as any,
  }), []);

  const makeTeamIcon = (color: string, imageUrl: string, emojiFallback: string) => L.divIcon({
    className: 'qq-team-pin',
    html: `<div style="
      width: 48px; height: 48px; border-radius: 50%;
      background: #0f172a;
      border: 4px solid ${color};
      box-shadow: 0 0 0 2px rgba(15,23,42,0.9), 0 6px 20px rgba(0,0,0,0.6), 0 0 22px ${color}66;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
      animation: qqTeamPinDrop 0.55s cubic-bezier(0.34,1.56,0.64,1) both;
    ">
      <img src="${imageUrl}" alt="" draggable="false"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
        style="width:100%;height:100%;object-fit:cover;display:block;border-radius:50%;" />
      <span style="display:none;align-items:center;justify-content:center;width:100%;height:100%;font-size:26px;line-height:1;">${emojiFallback}</span>
    </div>`,
    iconSize: [48, 48] as any,
    iconAnchor: [24, 24] as any,
  });

  const title = (lang === 'en' ? 'Where on the map?' : 'Wo auf der Karte?');

  return (
    <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden', background: '#0D0A06' }}>
      {/* Karte */}
      <div style={{ flex: 1, position: 'relative', transition: 'flex 0.7s cubic-bezier(0.4,0,0.2,1)' }}>
        <MapContainer
          center={[tLat, tLng] as any}
          zoom={3}
          zoomControl={false}
          attributionControl={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          dragging={false}
          touchZoom={false}
          style={{ width: '100%', height: '100%', background: '#0a1120' }}
        >
          {/* CartoDB Voyager — bunte, freundliche Karte mit Labels darueber.
              War vorher 'dark_all' (grau-schwarz) — User wollte was Schoeneres. */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains={['a', 'b', 'c', 'd']}
          />
          {/* Geoguessr-Style: erst Welt-Level (zoom 3), dann smoothes Reinzoomen
              auf den Zielbereich beim ersten Reveal-Schritt. */}
          <QQInitialTargetZoom lat={tLat} lng={tLng} />
          <QQMapResizer trigger={showRanking} />
          <QQFitBoundsOnTrigger bounds={bounds} trigger={step} />
          {showTarget && (
            <Marker position={[tLat, tLng] as any} icon={targetIcon} />
          )}
          {onMapPins.map(p => {
            const team = s.teams.find(t => t.id === p.teamId);
            if (!team) return null;
            const dp = displayPos.get(p.teamId);
            const lat = dp?.lat ?? p.lat;
            const lng = dp?.lng ?? p.lng;
            return (
              <Marker
                key={p.teamId}
                position={[lat, lng] as any}
                icon={makeTeamIcon(team.color, qqGetAvatar(team.avatarId).image, qqGetAvatar(team.avatarId).emoji)}
              />
            );
          })}
        </MapContainer>

        {/* Off-Map Indikator: Pins die >2500km vom Ziel weg sind, werden auf
            der Map nicht eingerahmt (sonst zoomt sie auf Welt-Level raus).
            Stattdessen hier kompakt mit Distanz-Pfeil. */}
        {offMapPins.length > 0 && (
          <div style={{
            position: 'absolute', top: 88, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            padding: '8px 16px', borderRadius: 999,
            background: 'rgba(13,10,6,0.85)',
            border: '1.5px solid rgba(251,191,36,0.35)',
            zIndex: 1000, maxWidth: 'calc(100% - 80px)', justifyContent: 'center',
          }}>
            <span style={{
              fontSize: 13, fontWeight: 800, color: '#FDE68A',
              letterSpacing: 0.3, textTransform: 'uppercase',
            }}>
              {lang === 'en' ? '✈ Far away' : '✈ Weit weg'}
            </span>
            {offMapPins.map(p => {
              const team = s.teams.find(t => t.id === p.teamId);
              if (!team) return null;
              return (
                <span key={p.teamId} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px 4px 4px', borderRadius: 999,
                  background: 'rgba(15,23,42,0.6)',
                  border: `1.5px solid ${team.color}66`,
                }}>
                  <QQTeamAvatar avatarId={team.avatarId} size={28} />
                  <span style={{
                    fontWeight: 800, color: team.color, fontSize: 13,
                    fontVariantNumeric: 'tabular-nums', letterSpacing: 0.2,
                  }}>
                    {(p.distKm ?? 0) >= 1000 ? `${((p.distKm ?? 0) / 1000).toFixed(1)} Mm` : `${Math.round(p.distKm ?? 0)} km`}
                  </span>
                </span>
              );
            })}
          </div>
        )}

        {/* Title-Overlay oben */}
        <div style={{
          position: 'absolute', top: 28, left: '50%', transform: 'translateX(-50%)',
          padding: '12px 28px', borderRadius: 999,
          background: 'rgba(15,23,42,0.85)', border: '2px solid rgba(251,191,36,0.4)',
          color: '#FDE68A', fontWeight: 900, fontSize: 'clamp(20px, 2.4vw, 32px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 28px rgba(251,191,36,0.25)',
          zIndex: 1000, letterSpacing: 0.3,
        }}>
          <QQEmojiIcon emoji="🌍"/> {title}
        </div>

        {/* Antwort-Label unten (wenn Target sichtbar) — dunkler Pill mit
            gold-gruenem Text, damit er auf der hellblauen Leaflet-Voyager-Map
            kontrastreich lesbar ist. */}
        {showTarget && q.answer && (
          <div style={{
            position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
            padding: '14px 32px', borderRadius: 18,
            background: 'rgba(13,10,6,0.92)',
            border: '2.5px solid rgba(34,197,94,0.7)',
            color: '#86efac', fontWeight: 900, fontSize: 'clamp(22px, 2.8vw, 38px)',
            boxShadow: '0 0 50px rgba(34,197,94,0.35), 0 8px 24px rgba(0,0,0,0.45)',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            animation: 'revealAnswerBam 0.6s cubic-bezier(0.22,1,0.36,1) both',
            zIndex: 1000,
          }}>
            {formatRevealedAnswer(lang, q.answer, q.answerEn)}
          </div>
        )}
      </div>

      {/* Ranking-Panel rechts (slide-in) — Sizing so dass min. 8 Teams reinpassen */}
      {showRanking && (
        <div style={{
          flex: '0 0 38%', padding: '34px 22px 22px',
          background: 'linear-gradient(180deg, rgba(15,23,42,0.96), rgba(13,10,6,0.96))',
          borderLeft: '2px solid rgba(251,191,36,0.2)',
          boxShadow: '-12px 0 40px rgba(0,0,0,0.5)',
          animation: 'qqMapRankSlideIn 0.7s cubic-bezier(0.22,1,0.36,1) both',
          display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto',
        }}>
          <div style={{
            fontWeight: 900, fontSize: 'clamp(22px, 2.4vw, 32px)',
            color: '#FDE68A', marginBottom: 6, textAlign: 'center', letterSpacing: 0.4,
          }}>
            <QQEmojiIcon emoji="🏆"/> {lang === 'en' ? 'Closest to target' : 'Am nächsten dran'}
          </div>
          {(() => {
            // Tie-Erkennung: Teams mit (gerundet) gleicher Distanz — dann entscheidet Speed.
            // Gruppen nach Distanz-Bucket (auf Anzeige-Präzision, also ganze Meter bzw. 0.1 km).
            const bucket = (km: number | null): string => {
              if (km == null) return '—';
              return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
            };
            const tieGroups: Record<string, number> = {};
            bestFirst.forEach(p => { const k = bucket(p.distKm); tieGroups[k] = (tieGroups[k] ?? 0) + 1; });
            const groupEarliest: Record<string, number> = {};
            bestFirst.forEach(p => {
              const k = bucket(p.distKm);
              const at = p.submittedAt ?? 0;
              if (groupEarliest[k] == null || at < groupEarliest[k]) groupEarliest[k] = at;
            });
            return bestFirst.map((p, i) => {
              const team = s.teams.find(t => t.id === p.teamId);
              if (!team) return null;
              const medal = i === 0 ? <QQEmojiIcon emoji="🥇"/> : i === 1 ? <QQEmojiIcon emoji="🥈"/> : i === 2 ? <QQEmojiIcon emoji="🥉"/> : `#${i+1}`;
              const dist = p.distKm == null ? '—' : p.distKm < 1 ? `${Math.round(p.distKm * 1000)} m` : `${p.distKm.toFixed(1)} km`;
              const isTop = i === 0;
              const key = bucket(p.distKm);
              const isTied = (tieGroups[key] ?? 0) > 1;
              const deltaMs = isTied && p.submittedAt ? p.submittedAt - (groupEarliest[key] ?? p.submittedAt) : 0;
              const timeLabel = isTied ? (deltaMs === 0 ? '⚡ zuerst' : `+${(deltaMs / 1000).toFixed(1)}s`) : null;
              return (
                <div key={p.teamId} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 14,
                  background: isTop ? `linear-gradient(90deg, ${team.color}22, ${team.color}0a)` : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${isTop ? team.color + '88' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: isTop ? `0 0 24px ${team.color}44` : 'none',
                  animation: `contentReveal 0.45s ease ${0.15 + i * 0.08}s both`,
                }}>
                  <span style={{ fontSize: 'clamp(26px, 2.8vw, 38px)', width: 52, textAlign: 'center', fontWeight: 900, fontFamily: "'Nunito', system-ui, sans-serif", color: isTop ? '#FDE68A' : '#cbd5e1' }}>{medal}</span>
                  <QQTeamAvatar avatarId={team.avatarId} size={'clamp(36px, 3.8vw, 54px)'} />
                  <span title={team.name} style={{ flex: 1, minWidth: 0, fontWeight: 900, fontSize: 'clamp(20px, 2.2vw, 30px)', color: team.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</span>
                  {timeLabel && (
                    <span style={{
                      fontWeight: 800, fontSize: 'clamp(14px, 1.3vw, 18px)',
                      padding: '3px 10px', borderRadius: 999,
                      background: deltaMs === 0 ? 'rgba(250,204,21,0.18)' : 'rgba(148,163,184,0.12)',
                      color: deltaMs === 0 ? '#FDE68A' : '#94a3b8',
                      border: `1px solid ${deltaMs === 0 ? 'rgba(250,204,21,0.4)' : 'rgba(148,163,184,0.25)'}`,
                    }}>{timeLabel}</span>
                  )}
                  <span style={{ fontWeight: 900, fontSize: 'clamp(19px, 1.9vw, 26px)', color: isTop ? '#86efac' : '#94a3b8', fontFamily: "'Nunito', system-ui, sans-serif" }}><QQEmojiIcon emoji="📍"/> {dist}</span>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUESTION VIEW (active + reveal)
// ═══════════════════════════════════════════════════════════════════════════════

export function QuestionView({ state: s, revealed, hideCutouts }: { state: QQStateUpdate; revealed: boolean; hideCutouts?: boolean }) {
  const q = s.currentQuestion;
  if (!q) return null;
  const cat = q.category as QQCategory;
  const catLabel = QQ_CATEGORY_LABELS[cat];
  const accent = CAT_ACCENT[cat] ?? '#e2e8f0';
  const badgeBg = CAT_BADGE_BG[cat] ?? '#374151';
  const glow = CAT_GLOW[cat] ?? 'transparent';
  // Dekorative Corner-Emojis pro Kategorie — aktuell ausgeblendet (Tester fanden sie
  // verwirrend: "was macht das?"). Zum Reaktivieren: SHOW_CAT_CUTOUTS auf true setzen.
  const SHOW_CAT_CUTOUTS = false;
  const cutouts = SHOW_CAT_CUTOUTS ? (CAT_CUTOUTS[cat] ?? []) : [];
  // Per-question emoji override: replace default cutout emojis
  const effectiveCutouts = q.emojis?.length
    ? cutouts.map((c, i) => q.emojis![i] ? { ...c, emoji: q.emojis![i] } : c)
    : cutouts;
  const cardBg = s.theme?.cardBg ?? COZY_CARD_BG;
  const img = q.image;
  // For CHEESE (Picture This): show image even with layout='none' — it's the main visual
  const isCheese = cat === 'CHEESE';
  const hasImg = img && img.url && (isCheese || img.layout !== 'none');
  const isWindow = hasImg && !isCheese && (img.layout === 'window-left' || img.layout === 'window-right');
  const lang = useLangFlip(s.language);

  // ── MUCHO: Winner-Card erst nach Jäger-Lock zeigen ──────────────────────
  // Spiegelt die Akt-2-Timing aus MuchoOptionsReveal (hop + lock + speedrun).
  // Solange Winner-Card verborgen ist bleibt die Spannungskurve intakt.
  const muchoNonEmpty = useMemo(() => {
    if (cat !== 'MUCHO' || !q.options) return 0;
    let n = 0;
    for (let i = 0; i < q.options.length; i++) {
      if (s.answers.some(a => a.text === String(i))) n++;
    }
    return n;
  }, [cat, q.options, s.answers]);
  const muchoLockStep = muchoNonEmpty + 1;
  const muchoLocked = cat === 'MUCHO' && revealed && (s.muchoRevealStep ?? 0) >= muchoLockStep;
  // Winner-Card erscheint nach dem Doppelblink (1.1s Animation + 100ms Puffer).
  const [muchoAkt3Ready, setMuchoAkt3Ready] = useState(false);
  useEffect(() => {
    if (!muchoLocked) { setMuchoAkt3Ready(false); return; }
    const t = window.setTimeout(() => setMuchoAkt3Ready(true), 1200);
    return () => window.clearTimeout(t);
  }, [muchoLocked]);

  // ── ZEHN_VON_ZEHN: Step-Reveal — Bet-Cascade + Doppelblink ──────────────
  // Step 0: alle Chips sichtbar AUSSER höchste(r) Bet(s) pro Option; kein Grün, keine Winner-Card.
  // Step 1: höchste Bets kaskadieren pro Option (leere Optionen überspringen).
  // Step 2: Doppelblink auf korrekte Option → Grün + Winner-Card (analog MUCHO).
  const zvzStep = s.zvzRevealStep ?? 0;
  const zvzHighestPerOption = useMemo(() => {
    if (cat !== 'ZEHN_VON_ZEHN' || !q.options) return [] as Array<{ maxPts: number; teamIds: string[]; isEmpty: boolean }>;
    const parsed = s.answers
      .map(a => ({ teamId: a.teamId, pts: String(a.text ?? '').split(',').map(x => parseInt(x.trim(), 10)) }))
      .filter(p => p.pts.length === q.options!.length && !p.pts.some(Number.isNaN));
    return q.options!.map((_, i) => {
      const entries = parsed.map(p => ({ teamId: p.teamId, pts: p.pts[i] ?? 0 })).filter(e => e.pts > 0);
      if (entries.length === 0) return { maxPts: 0, teamIds: [], isEmpty: true };
      const maxPts = Math.max(...entries.map(e => e.pts));
      return { maxPts, teamIds: entries.filter(e => e.pts === maxPts).map(e => e.teamId), isEmpty: false };
    });
  }, [cat, q.options, s.answers]);
  const zvzNonEmptyOptions = useMemo(() => zvzHighestPerOption.map((h, i) => (h.isEmpty ? -1 : i)).filter(i => i >= 0), [zvzHighestPerOption]);
  const [zvzRevealed, setZvzRevealed] = useState<Set<number>>(new Set());
  useEffect(() => {
    if (cat !== 'ZEHN_VON_ZEHN' || !revealed) { setZvzRevealed(new Set()); return; }
    if (zvzStep === 0) { setZvzRevealed(new Set()); return; }
    // Step 2+ (Lock): alle Top-Bets bleiben stationaer sichtbar — KEIN Reset
    // und keine neue Cascade, sonst "erscheinen" die Chips nochmal obwohl
    // sie schon da sind.
    if (zvzStep >= 2) {
      setZvzRevealed(new Set(zvzNonEmptyOptions));
      return;
    }
    // Step 1: Kaskade pro Option (200ms Initial + 550ms pro Option).
    const timers: number[] = [];
    setZvzRevealed(new Set());
    zvzNonEmptyOptions.forEach((optIdx, i) => {
      timers.push(window.setTimeout(() => {
        setZvzRevealed(prev => {
          const next = new Set(prev); next.add(optIdx); return next;
        });
        if (!s.sfxMuted) { try { playTick(); } catch {} }
      }, 200 + i * 550));
    });
    return () => timers.forEach(t => window.clearTimeout(t));
  }, [cat, revealed, zvzStep, zvzNonEmptyOptions.join(','), s.sfxMuted]); // eslint-disable-line react-hooks/exhaustive-deps
  // Lock-Phase (Step 2): Doppelblink auf korrekte Option, Winner-Card nach 1.2s
  const zvzLocked = cat === 'ZEHN_VON_ZEHN' && revealed && zvzStep >= 2 && q.correctOptionIndex != null;
  const [zvzWinnerReady, setZvzWinnerReady] = useState(false);
  useEffect(() => {
    if (!zvzLocked) { setZvzWinnerReady(false); return; }
    const t = window.setTimeout(() => setZvzWinnerReady(true), 1200);
    return () => window.clearTimeout(t);
  }, [zvzLocked]);
  const zvzAkt3Ready = cat === 'ZEHN_VON_ZEHN' ? zvzWinnerReady : true;

  // ── CHEESE: Reveal sofort vollständig (keine Step-Gating mehr).
  // Frueher: step 0/1/2 haben Loesung+Avatare progressiv gezeigt. Das fuehrte
  // dazu dass der Reveal "nicht funktionierte" wenn die Steps nicht weitergeklickt
  // wurden. Jetzt: sobald revealed → sofort gruene Loesung + Avatare + Winner.
  const cheeseShowGreen = true;
  const cheeseShowAvatars = true;

  const showMuchoWinner = cat !== 'MUCHO' || muchoAkt3Ready;
  const showZvzWinner = cat !== 'ZEHN_VON_ZEHN' || zvzAkt3Ready;
  const showCheeseWinner = cat !== 'CHEESE' || cheeseShowAvatars;
  const showUnifiedWinner = showMuchoWinner && showZvzWinner && showCheeseWinner;

  // ── CozyGuessr (map) full-screen reveal ─────────────────────────────────
  const isMapReveal = revealed
    && q.category === 'BUNTE_TUETE'
    && (q.bunteTuete as any)?.kind === 'map';
  if (isMapReveal) {
    return <CozyGuessrReveal state={s} lang={lang} />;
  }

  // ── Top-5 two-column reveal ─────────────────────────────────────────────
  const isTop5Reveal = revealed
    && q.category === 'BUNTE_TUETE'
    && (q.bunteTuete as any)?.kind === 'top5';
  if (isTop5Reveal) {
    return <Top5Reveal state={s} lang={lang} />;
  }

  // ── 4 gewinnt / Only Connect: eigene Layout-Komponente für active + reveal ──
  const isOnlyConnect = q.category === 'BUNTE_TUETE'
    && (q.bunteTuete as any)?.kind === 'onlyConnect';
  if (isOnlyConnect) {
    return <OnlyConnectBeamerView state={s} lang={lang} revealed={revealed} />;
  }

  // ── Bluff: eigene 3-Phasen-Layout-Komponente ─────────────────────────────
  const isBluff = q.category === 'BUNTE_TUETE'
    && (q.bunteTuete as any)?.kind === 'bluff';
  if (isBluff) {
    return <BluffBeamerView state={s} lang={lang} revealed={revealed} />;
  }

  // ── Order two-column reveal (Lucky Bag: bring in correct order) ────────
  const isOrderReveal = revealed
    && q.category === 'BUNTE_TUETE'
    && (q.bunteTuete as any)?.kind === 'order';
  if (isOrderReveal) {
    return <OrderReveal state={s} lang={lang} />;
  }

  // ── Schätzchen two-column reveal (Frage + Lösung oben, Winner + Rangliste) ──
  const isSchaetzReveal = revealed && q.category === 'SCHAETZCHEN';
  if (isSchaetzReveal) {
    return <SchaetzchenReveal state={s} lang={lang} />;
  }

  // ── CHEESE "Overlay" layout ─────────────────────────────────────────────
  // Image stays fullscreen. Frosted card overlays with question/answer.
  // No separate "image only" phase — question + image appear together.
  // Active: fullscreen image + frosted question card + timer
  // Reveal: fullscreen image + frosted answer card + winner
  // Hinweis: CHEESE-Overlay-UI (Antwort-Card, Team-Avatare, Reveal) MUSS auch ohne Bild
  // rendern — sonst ist die Frage unspielbar. Nur der fullscreen-Image-Layer wird ausgeblendet.
  const cheeseOverlay = isCheese;
  const cheeseWithQuestion = cheeseOverlay && !revealed;
  const isCheeseReveal = cheeseOverlay && revealed;
  const cheeseFullscreen = isCheese && hasImg;

  // Auto-size: shorter fontSize for long questions (no size change on reveal — prevents reflow)
  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';
  const isOrderBt = q.category === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'order';
  // Order-BunteTüte hat in der Question-Phase keine Items am Beamer (Phone-Eingabe),
  // deshalb gleiche Größen wie normale Kategorien. Nur im Reveal wird geshrunken
  // (qFontSizeShrunk weiter unten), damit die Rangfolge darunter passt.
  // min(vw, vh) verhindert Overflow nach oben/unten auf niedrigen Displays.
  // 2026-04-28: User-Wunsch 'unten ist noch Platz, lass den Text größer' — vw+vh
  // Caps angehoben + min/max der clamps großzügiger. Lange Texte (>200) bleiben
  // moderat klein, kurze Fragen wirken jetzt richtig satt am Beamer.
  const qFontSize = qText.length > 200 ? 'clamp(28px, min(3.4vw, 5vh), 50px)'
    : qText.length > 120 ? 'clamp(36px, min(4.4vw, 6.8vh), 68px)'
    : qText.length > 80  ? 'clamp(42px, min(5.4vw, 8vh), 86px)'
    : qText.length > 40  ? 'clamp(50px, min(6.4vw, 9vh), 104px)'
    : 'clamp(58px, min(7.6vw, 10vh), 124px)';

  // Category intro overlay removed — category is already shown in PHASE_INTRO

  return (
    <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
      {/* I1 Kategorie-Partikel (fliegende Zahlen/Buchstaben) entfernt —
          lenkten vom Fragentext ab. Stattdessen faerben wir die Fireflies
          weiter unten in der Kategorie-Farbe. */}
      {/* CHEESE ohne Bild: dezenter Placeholder im Hintergrund (Gradient + 📸-Icon),
          damit die Frage spielbar bleibt aber visuell klar ist „hier sollte ein Bild sein".
          position:absolute (NICHT fixed) — fixed wird durch BeamerFrame-Transform-Stacking-Context geclippt. */}
      {isCheese && !hasImg && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.18), transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(168,85,247,0.10), transparent 50%), #0d0a06',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 14,
          pointerEvents: 'none',
        }}>
          <div style={{
            fontSize: 'clamp(120px, 18vw, 240px)', opacity: 0.18,
            animation: 'cfloat 4s ease-in-out infinite',
          }}>📸</div>
          <div style={{
            fontSize: 'clamp(14px, 1.4vw, 18px)', fontWeight: 800,
            color: '#a78bfa', letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.55,
          }}>
            {lang === 'de' ? 'Bild fehlt — Frage trotzdem spielbar' : 'No image — question still playable'}
          </div>
        </div>
      )}
      {/* Fullscreen background image: non-CHEESE fullscreen layout OR CHEESE overlay (all phases) */}
      {((hasImg && img.layout === 'fullscreen' && !isCheese) || cheeseFullscreen) && (() => {
        // CHEESE: 3-Schicht-Aufbau gegen Aspect-Ratio-Crop.
        // 1) Blurred cover backdrop — füllt 16:9-Beamer, kein schwarzer Rand
        // 2) Sharp CONTAIN foreground — komplettes Bild sichtbar (Mona Lisas Kopf bleibt drin)
        // 3) Dunkler Vignette-Overlay — Lesbarkeit der Antwort-Card
        // offsetX/Y/scale wirken auf Layer 2; scale=1 (default) zeigt vollständiges Bild.
        const cheeseOX = img!.offsetX ?? 0;
        const cheeseOY = img!.offsetY ?? 0;
        const cheeseZoom = img!.scale ?? 1;
        const cheesePosX = 50 + cheeseOX / 2;
        const cheesePosY = 50 + cheeseOY / 2;
        return (
        <>
          {/* Layer 1: blurred cover backdrop (CHEESE only) */}
          {cheeseFullscreen && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 49,
              backgroundImage: `url(${img!.url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              filter: 'blur(36px) brightness(0.45) saturate(1.1)',
              transform: 'scale(1.15)',
              transformOrigin: 'center',
              animation: 'fsExpand 1.0s cubic-bezier(0.4,0,0.2,1) both',
            }} />
          )}
          {/* Layer 2: sharp foreground (contain für CHEESE, cover für legacy fullscreen) */}
          <div style={{
            position: cheeseFullscreen ? 'fixed' : 'absolute', inset: 0, zIndex: cheeseFullscreen ? 50 : 1,
            backgroundImage: `url(${img!.url})`,
            backgroundSize: cheeseFullscreen ? 'contain' : 'cover',
            backgroundPosition: cheeseFullscreen ? `${cheesePosX}% ${cheesePosY}%` : 'center',
            backgroundRepeat: 'no-repeat',
            clipPath: (revealed && !cheeseOverlay) ? 'inset(8% 8% 8% 52% round 18px)' : undefined,
            animation: cheeseFullscreen
              ? 'fsExpand 1.0s cubic-bezier(0.4,0,0.2,1) both'
              : ((revealed && !cheeseOverlay) ? undefined : 'fsExpand 1.2s cubic-bezier(0.4,0,0.2,1) 0.2s both'),
            transition: 'clip-path 0.8s cubic-bezier(0.4,0,0.2,1), background-position 0.4s ease, transform 0.4s ease',
            transform: cheeseFullscreen
              ? `scale(${cheeseZoom})${img!.rotation ? ` rotate(${img!.rotation}deg)` : ''}`
              : `translate(${img!.offsetX ?? 0}%, ${img!.offsetY ?? 0}%) scale(${img!.scale ?? 1}) rotate(${img!.rotation ?? 0}deg)`,
            transformOrigin: cheeseFullscreen ? `${cheesePosX}% ${cheesePosY}%` : 'center',
            opacity: img!.opacity ?? 1,
            filter: imgFilter(img!),
          }} />
          {/* Layer 3: vignette overlay */}
          <div style={{
            position: cheeseFullscreen ? 'fixed' : 'absolute', inset: 0, zIndex: cheeseFullscreen ? 51 : 2,
            background: cheeseFullscreen
              ? 'linear-gradient(180deg, rgba(13,10,6,0.35) 0%, rgba(13,10,6,0.20) 40%, rgba(13,10,6,0.20) 60%, rgba(13,10,6,0.40) 100%)'
              : [
                'linear-gradient(90deg, rgba(13,10,6,0.92) 0%, rgba(13,10,6,0.78) 45%, rgba(13,10,6,0.45) 100%)',
                'linear-gradient(180deg, rgba(13,10,6,0.5) 0%, transparent 25%, transparent 70%, rgba(13,10,6,0.6) 100%)',
              ].join(', '),
            opacity: (revealed && !cheeseOverlay) ? 0.4 : 1,
            transition: 'opacity 0.8s ease',
          }} />
        </>
        );
      })()}


      {/* Cutout floating image (bg-removed) */}
      {hasImg && img.layout === 'cutout' && (
        <img
          src={img.bgRemovedUrl || img.url}
          alt={isCheese ? (q.text || 'Question image') : ''}
          style={{
            position: 'absolute', zIndex: 3, pointerEvents: 'none',
            right: '8%', top: '15%',
            maxWidth: '35%', maxHeight: '70%',
            objectFit: 'contain',
            filter: `drop-shadow(0 16px 40px rgba(0,0,0,0.6))${imgFilter(img) ? ' ' + imgFilter(img) : ''}`,
            animation: imgAnim(img.animation, 'cutout', img.animDelay, img.animDuration),
            transform: `translate(${img.offsetX ?? 0}%, ${img.offsetY ?? 0}%) scale(${img.scale ?? 1}) rotate(${img.rotation ?? 0}deg)`,
            opacity: img.opacity ?? 1,
          }}
        />
      )}
      {/* Cutout emojis — hidden when template overlay handles them */}
      {!hideCutouts && effectiveCutouts.map((c, i) => (
        <div key={i} style={{
          position: 'absolute', pointerEvents: 'none', zIndex: 3,
          top: c.top, bottom: c.bottom, left: c.left, right: c.right,
          fontSize: c.size, lineHeight: 1, userSelect: 'none',
          filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.5))',
          ['--r' as string]: `${c.rot}deg`,
          animation: c.alt ? `cfloata ${4 + i}s ease-in-out infinite` : `cfloat ${4 + i * 0.7}s ease-in-out infinite`,
        }}>
          {c.emoji}
        </div>
      ))}

      {/* Fireflies in Kategorie-Farbe — subtile Stimmung passend zum Thema */}
      <Fireflies color={`${accent}99`} />

      {/* ── CHEESE overlay cards (Phase 2 + Reveal) ── */}
      {(cheeseWithQuestion || isCheeseReveal) && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 52,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'flex-end', alignItems: 'center',
          // Bottom-Padding dynamisch:
          //   - während QUESTION_ACTIVE: Platz unter der Card für die hängenden
          //     Voter-Avatare (~50-60px)
          //   - beim Reveal: zurück auf normales Padding, damit die Card
          //     dichter am Bildrand sitzt und weniger vom Foto verdeckt
          // Smooth transition zwischen beiden Zuständen.
          padding: revealed ? '40px 48px 32px' : '40px 48px clamp(58px, 7vh, 92px)',
          transition: 'padding 0.55s cubic-bezier(0.34,1.4,0.64,1)',
          pointerEvents: 'none',
        }}>
          {/* Konsistente Kategorie-Pill oben links — bleibt im Reveal sichtbar
              (User-Wunsch 2026-04-28: Kategorie-Identität nicht verlieren). */}
          <div style={{
            position: 'absolute', top: 20, left: 48, zIndex: 10,
            animation: 'contentReveal 0.35s ease both',
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '8px 22px', borderRadius: 999,
              background: `${accent}22`, border: `2px solid ${accent}44`,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}>
              {(() => {
                const slug = qqCatSlug(cat as string);
                return slug
                  ? <QQIcon slug={slug} size={'clamp(22px, 2.4vw, 32px)'} alt={catLabel.de} />
                  : <span style={{ fontSize: 'clamp(18px, 2vw, 26px)' }}>{catLabel.emoji}</span>;
              })()}
              <span style={{
                fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 900,
                color: accent, letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>{lang === 'en' ? catLabel.en : catLabel.de}</span>
            </div>
          </div>
          {/* Timer ring — top right (matches non-CHEESE layout), fade out on reveal */}
          {s.timerEndsAt && (
            <div style={{
              position: 'absolute', top: 16, right: 48, zIndex: 10,
              animation: 'contentReveal 0.5s ease 0.3s both',
              pointerEvents: revealed ? 'none' : 'auto',
              opacity: revealed ? 0 : 1,
              transition: 'opacity 0.35s ease',
            }}>
              <BeamerTimer endsAt={s.timerEndsAt} durationSec={s.timerDurationSec} accent={accent} />
            </div>
          )}

          {/* Frosted question/answer card — bottom.
              POP-Transition: minHeight waechst dynamisch beim Reveal.
              Beim Reveal: Border + Glow in der Farbe des SCHNELLSTEN korrekten
              Teams (User-Wunsch 2026-04-28: konsistent mit Mucho/ZvZ wo der
              Sieger-Frame bunt ist). Wenn niemand richtig: Standard-Akzent. */}
          {(() => {
            // Schnellstes korrektes Team finden (für Reveal-Glow)
            const fastestColor = (() => {
              if (!isCheeseReveal) return null;
              const correctDE = (q.answer ?? '').trim().toLowerCase();
              const correctEN = (q.answerEn ?? '').trim().toLowerCase();
              const correctSet = [correctDE, correctEN].filter(Boolean);
              if (correctSet.length === 0) return null;
              const matchesAns = (sub: string) => {
                const ss = sub.trim().toLowerCase();
                if (ss.length < 2) return false;
                return correctSet.some(c => c === ss || ss.includes(c) || (c.length > 3 && c.includes(ss) && ss.length >= 3));
              };
              const earliest = [...s.answers]
                .filter(a => matchesAns(a.text))
                .sort((a, b) => a.submittedAt - b.submittedAt)[0];
              if (!earliest) return null;
              return s.teams.find(t => t.id === earliest.teamId)?.color ?? null;
            })();
            const revealGlowColor = fastestColor ?? '#22C55E';
            return (
          <div style={{
            position: 'relative',
            width: '100%', maxWidth: 900,
            minHeight: revealed
              ? (hasImg ? 'clamp(380px, 44vh, 500px)' : 'clamp(220px, 28vh, 320px)')
              : (hasImg ? 'clamp(140px, 18vh, 220px)' : 'clamp(120px, 16vh, 180px)'),
            background: 'rgba(13,10,6,0.38)',
            backdropFilter: 'blur(18px) saturate(1.25)',
            WebkitBackdropFilter: 'blur(18px) saturate(1.25)',
            // Vor Reveal: kräftiger Kategorie-Glow wie bei MUCHO/ZvZ. (User-Wunsch
            // 2026-04-28: 'bei cheese darf die frage vor reveal umrandet sein
            // von kategorie farben glow wie bei anderen').
            border: `${isCheeseReveal ? 3 : 2.5}px solid ${isCheeseReveal ? `${revealGlowColor}cc` : `${accent}88`}`,
            borderRadius: 28,
            padding: isCheeseReveal ? '28px 48px' : '36px 56px',
            boxShadow: isCheeseReveal
              ? `0 0 0 1px ${revealGlowColor}55, 0 0 80px ${revealGlowColor}66, 0 0 32px ${revealGlowColor}88, 0 24px 80px rgba(0,0,0,0.5)`
              : `0 0 0 1px ${accent}33, 0 0 80px ${accent}33, 0 0 32px ${accent}55, 0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`,
            animation: cheeseWithQuestion ? 'bQuestionIn 0.5s cubic-bezier(0.34,1.4,0.64,1) 0.1s both'
              : 'revealAnswerBam 0.5s cubic-bezier(0.22,1,0.36,1) both',
            transform: revealed ? 'scale(1)' : 'scale(0.985)',
            transformOrigin: 'center',
            transition: 'padding 0.4s ease, border-color 0.4s ease, min-height 0.5s cubic-bezier(0.34,1.56,0.64,1), transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
            pointerEvents: 'auto',
            textAlign: 'center',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            {/* Team-Answer-Progress — Avatare haengen UNTER der Card, halb
                ueberlappend mit der Card-Unterkante (obere Haelfte in der
                Card, untere haengt darunter raus). Kein Strip-Bg → Avatare
                „kleben" direkt an der Edge. Schwarzer Avatar-Bg innerhalb
                des Kreises (wie Mucho-Voter) damit sie auch auf hellem
                Foto-Hintergrund lesbar sind. */}
            {!revealed && s.teams.length > 0 && (
              <>
                {/* Klein-Text Progress am unteren Card-Rand innen — verschwindet
                    wenn alle dran sind (Avatare mit ✓ zeigen das eh schon). */}
                {!s.allAnswered && (
                  <div style={{
                    position: 'absolute',
                    bottom: 8, left: 0, right: 0,
                    textAlign: 'center',
                    fontSize: 'clamp(11px, 1.1vw, 14px)', fontWeight: 800,
                    color: 'rgba(226,232,240,0.85)',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    pointerEvents: 'none', zIndex: 8,
                    animation: 'contentReveal 0.45s ease 0.35s both',
                  }}>
                    {`${s.answers.length}/${s.teams.length} Teams`}
                  </div>
                )}
                {/* Avatar-Reihe */}
                {(() => {
                  const tc = s.teams.length;
                  const av = tc > 6 ? 56 : tc > 4 ? 64 : 72;
                  const gap = tc > 6 ? 10 : tc > 4 ? 13 : 16;
                  return (
                    <div style={{
                      position: 'absolute',
                      top: '100%', left: 0, right: 0,
                      transform: 'translateY(-50%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap, flexWrap: 'wrap',
                      pointerEvents: 'none', zIndex: 9,
                      animation: 'contentReveal 0.45s ease 0.4s both',
                    }}>
                      {s.teams.map(tm => {
                        const answered = s.answers.some(a => a.teamId === tm.id);
                        return (
                          <div key={tm.id} style={{
                            position: 'relative',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            opacity: answered ? 1 : 0.55,
                            filter: answered ? 'none' : 'grayscale(0.4)',
                            transition: 'opacity 0.4s ease, filter 0.4s ease',
                          }}>
                            <QQTeamAvatar
                              avatarId={tm.avatarId}
                              size={av}
                              style={{
                                background: '#0d0a06',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.55)',
                              }}
                            />
                            {answered && (
                              <div style={{
                                position: 'absolute', bottom: -2, right: -2,
                                width: 24, height: 24, borderRadius: '50%',
                                background: '#22C55E', border: '2px solid #0D0A06',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 13, fontWeight: 900, color: '#fff',
                                animation: 'bAnswerCheck 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
                              }}>✓</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            )}

            {/* Category pill IN der Card entfernt — die Pill sitzt jetzt
                konsistent oben links wie bei den anderen Kategorien. */}

            {/* Question text — no font-size change on reveal to prevent reflow */}
            <div key={`cheese-${lang}`} style={{
              fontSize: qText.length > 120 ? 'clamp(28px, 3.5vw, 52px)' : 'clamp(36px, 5vw, 72px)',
              fontWeight: 900, lineHeight: 1.22,
              color: '#F1F5F9',
              marginBottom: isCheeseReveal ? 16 : 0,
              animation: 'langFadeIn 0.4s ease both',
              transition: 'opacity 0.4s ease, margin-bottom 0.3s ease',
              opacity: isCheeseReveal ? 0.55 : 1,
            }}>
              {lang === 'en' && q.textEn ? q.textEn : q.text}
            </div>

            {/* Revealed answer */}
            {isCheeseReveal && s.revealedAnswer && (
              <div style={{
                position: 'relative', overflow: 'hidden',
                fontSize: 'clamp(32px, 4.5vw, 72px)', fontWeight: 900,
                color: '#4ADE80',
                animation: 'revealAnswerBam 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both',
                textShadow: '0 0 30px rgba(34,197,94,0.4)',
                marginBottom: 8,
              }}>
                <div style={{
                  position: 'absolute', top: 0, width: '60%', height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
                  animation: 'revealShimmer 0.8s ease 0.5s both',
                  pointerEvents: 'none',
                }} />
                {s.revealedAnswer}
              </div>
            )}

            {/* Alle richtigen Teams mit Zeit — analog zu MUCHO/ZEHN_VON_ZEHN */}
            {isCheeseReveal && (() => {
              const correctDE = (q.answer ?? '').trim().toLowerCase();
              const correctEN = (q.answerEn ?? '').trim().toLowerCase();
              const correctSet = [correctDE, correctEN].filter(Boolean);
              const matches = (submitted: string) => {
                const s2 = submitted.trim().toLowerCase();
                if (s2.length < 2) return false;
                return correctSet.some(c => c === s2 || s2.includes(c) || (c.length > 3 && c.includes(s2) && s2.length >= 3));
              };
              const correctAnswers = [...s.answers]
                .filter(a => matches(a.text))
                .sort((a, b) => a.submittedAt - b.submittedAt);
              if (correctAnswers.length === 0) {
                return (
                  <div style={{
                    marginTop: 14,
                    fontSize: 'clamp(16px, 1.9vw, 24px)', fontWeight: 800,
                    color: '#94a3b8',
                    animation: 'revealWinnerIn 0.5s ease 0.4s both',
                  }}>
                    {lang === 'en' ? 'No team got it right.' : 'Kein Team hatte die richtige Antwort.'}
                  </div>
                );
              }
              const t0 = s.timerEndsAt
                ? s.timerEndsAt - (s.timerDurationSec * 1000)
                : (correctAnswers[0].submittedAt);
              const winnerTeam = s.teams.find(t => t.id === correctAnswers[0].teamId);
              const multiCorrect = correctAnswers.length > 1;
              const winMsg = multiCorrect
                ? (lang === 'en' ? 'recognized it fastest!' : 'hat es am schnellsten erkannt!')
                : (lang === 'en' ? 'got it right!' : 'hat es erkannt!');
              return (
                <>
                <div style={{
                  marginTop: 14,
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                  gap: 12, flexWrap: 'wrap', width: '100%',
                  animation: 'revealAnswerBam 0.5s cubic-bezier(0.34,1.4,0.64,1) 0.45s both',
                }}>
                  {correctAnswers.map((a, i) => {
                    const team = s.teams.find(t => t.id === a.teamId);
                    if (!team) return null;
                    const timeSec = Math.max(0, (a.submittedAt - t0) / 1000);
                    const isFastest = i === 0;
                    return (
                      <div key={a.teamId} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      }}>
                        <div style={{
                          position: 'relative',
                          display: 'inline-block',
                          animation: isFastest ? 'celebShake 0.6s ease 0.9s both' : 'none',
                        }}>
                          <QQTeamAvatar
                            avatarId={team.avatarId}
                            size={isFastest ? 'clamp(76px, 8.4vw, 116px)' : 'clamp(58px, 6.4vw, 88px)'}
                            style={{
                              border: isFastest ? '4px solid #FBBF24' : 'none',
                              boxShadow: isFastest
                                ? '0 0 28px rgba(251,191,36,0.65), 0 4px 14px rgba(0,0,0,0.45)'
                                : '0 4px 12px rgba(0,0,0,0.4)',
                            }}
                          />
                          {isFastest && (
                            <SpeedBoltMarker top={-12} right={-12} />
                          )}
                        </div>
                        <span style={{
                          padding: '3px 10px', borderRadius: 999,
                          background: isFastest ? 'rgba(251,191,36,0.22)' : 'rgba(0,0,0,0.55)',
                          border: isFastest ? '1.5px solid rgba(251,191,36,0.7)' : '1px solid rgba(255,255,255,0.15)',
                          color: isFastest ? '#FBBF24' : '#cbd5e1',
                          fontWeight: 900,
                          fontSize: 'clamp(15px, 1.6vw, 20px)',
                          whiteSpace: 'nowrap',
                        }}>
                          {timeSec.toFixed(1)}s
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* Winner-Banner fuer Cheese — das Main-Content-Winner-Banner
                    ist bei cheeseOverlay display:none. Darum hier explizit:
                    „X hat es erkannt!" / „X hat es am schnellsten erkannt!" */}
                {winnerTeam && (
                  <div style={{
                    marginTop: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
                    animation: 'revealWinnerIn 0.6s cubic-bezier(0.34,1.4,0.64,1) 0.85s both',
                  }}>
                    <div style={{
                      fontSize: 'clamp(22px, 2.6vw, 38px)', fontWeight: 900,
                      color: winnerTeam.color, lineHeight: 1.1,
                      textShadow: `0 0 24px ${winnerTeam.color}55`,
                    }}>
                      {winnerTeam.name}
                    </div>
                    <div style={{
                      fontSize: 'clamp(16px, 1.8vw, 24px)', fontWeight: 800,
                      color: '#94a3b8', lineHeight: 1.2,
                    }}>
                      {winMsg}
                    </div>
                  </div>
                )}
                </>
              );
            })()}

          </div>
            );
          })()}
        </div>
      )}

      {/* Main content (non-CHEESE or hidden during CHEESE overlay) */}
      <div style={{
        flex: 1, display: cheeseOverlay ? 'none' : 'flex', gap: 0,
        flexDirection: (hasImg && img.layout === 'window-left') ? 'row-reverse' : 'row',
        animation: 'contentReveal 0.35s ease both',
      }}>
        {/* ── Main content — full width, vertically + horizontally distributed ──
            User-Feedback 2026-04-28: Beim Reveal 'kleben' alle Cards in der
            oberen Hälfte, untere Hälfte leer. Lösung: space-around statt
            flex-start für MUCHO/ZvZ — verteilt Frage / Antwort / Avatar-Reihe /
            Winner-Card gleichmäßig über die volle Höhe.
            Vorher war flex-start gewählt damit Winner-Card unten nicht clippt;
            mit space-around + gemeinsamem padding-bottom (clamp 16-40px) bleibt
            das ebenso sicher und füllt den unteren Halbraum sinnvoll. */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          padding: 'clamp(12px, 1.5vh, 24px) clamp(28px, 4vw, 64px) clamp(16px, 2vh, 40px)',
          justifyContent: revealed && (q.category === 'MUCHO' || q.category === 'ZEHN_VON_ZEHN') ? 'space-around' : 'center',
          alignItems: 'center', position: 'relative', zIndex: 5, overflow: 'hidden',
        }}>

          {/* Category badge — top left corner. Bleibt auch im Reveal sichtbar
              (User-Wunsch 2026-04-28: Kategorie-Identität nicht verlieren). */}
          <div style={{
            position: 'absolute', top: 20, left: 48, zIndex: 10,
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '8px 22px', borderRadius: 999,
              background: `${accent}18`, border: `2px solid ${accent}44`,
              animation: 'contentReveal 0.35s ease both',
            }}>
              {(() => {
                const slug = qqCatSlug(cat as string);
                return slug
                  ? <QQIcon slug={slug} size={'clamp(22px, 2.4vw, 32px)'} alt={catLabel.de} />
                  : <span style={{ fontSize: 'clamp(18px, 2vw, 26px)' }}>{catLabel.emoji}</span>;
              })()}
              <span style={{
                fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 900,
                color: accent, letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                {lang === 'en' ? catLabel.en : catLabel.de}
              </span>
            </div>
          </div>

          {/* Timer — top right corner (hidden for Hot Potato, which uses per-turn timer) */}
          {s.timerEndsAt && !(q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato') && (
            <div style={{
              position: 'absolute', top: 16, right: 48, zIndex: 10,
              opacity: revealed ? 0 : 1,
              transition: 'opacity 0.3s ease',
              pointerEvents: revealed ? 'none' : 'auto',
            }}>
              <BeamerTimer endsAt={s.timerEndsAt} durationSec={s.timerDurationSec} accent={accent} />
            </div>
          )}

          {/* Question card — Text schrumpft beim Reveal generell, damit mehr
              Platz für Antwort-Card + Avatar-Cascade + Winner-Card bleibt.
              User-Wunsch 2026-04-28: 'Fragetext im Reveal nur sekundär,
              kann kleiner sein'. Vorher nur bei Schätzchen geschrumpft.
              SHRINK-METHODE 2026-04-28: vorher font-size-Animation, die führte
              zu Re-Wrap während der Transition (Buchstaben 'zappeln'). Jetzt:
              key-Re-Mount auf das innere Span — Text fadet kurz durch (langFadeIn)
              statt während des Resize zu hüpfen. Card-Padding fadet sich
              gleichzeitig schmaler — wirkt wie ein gemeinsamer 'collapse'. */}
          {(() => {
            const shrinkOnReveal = revealed;
            // Gleiche Größen-Staffelung wie qFontSize, nur kleiner — Text fließt gleich um
            const qFontSizeShrunk = isOrderBt
              ? (qText.length > 120 ? 'clamp(14px, 1.4vw, 22px)'
                : qText.length > 60 ? 'clamp(16px, 1.8vw, 26px)'
                : 'clamp(18px, 2vw, 30px)')
              : qText.length > 200 ? 'clamp(20px, 2.4vw, 36px)'
              : qText.length > 120 ? 'clamp(26px, 3.2vw, 48px)'
              : qText.length > 60  ? 'clamp(32px, 4vw, 60px)'
              : 'clamp(38px, 4.8vw, 72px)';
            return (
              <div style={{
                background: cardBg,
                // Frage-Card kriegt Kategorie-Farbe als Border + sanfter Glow.
                // User-Wunsch 2026-04-28: bleibt auch im Reveal sichtbar (vorher
                // verblasste die Border zu rgba weak — wirkte als wäre die
                // Kategorie weg). Im Reveal nur dezent gedimmt.
                border: `2.5px solid ${revealed ? `${accent}55` : `${accent}88`}`,
                borderRadius: 28,
                boxShadow: revealed
                  ? `0 0 0 1px ${accent}22, 0 0 50px ${accent}22, 0 0 22px ${accent}33, 0 8px 28px rgba(0,0,0,0.4)`
                  : `0 0 0 1px ${accent}33, 0 0 80px ${accent}33, 0 0 32px ${accent}55, 0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`,
                padding: shrinkOnReveal
                  ? 'clamp(10px, 1.4vh, 18px) clamp(20px, 2.5vw, 40px)'
                  // Aktive Frage: paddingLeft großzügig genug, dass die
                  // Kategorie-Pille (top:20, left:48, ~~50-180px breit) den
                  // Fragetext nicht überlappt. Vorher: clamp(28px, 4vw, 64px)
                  // → bei langem Text rutschten die ersten Worte unter die Pill.
                  : 'clamp(28px, 4vh, 56px) clamp(140px, 14vw, 220px) clamp(22px, 3vh, 48px)',
                marginBottom: 'clamp(20px, 2.8vh, 44px)',
                width: '100%', maxWidth: 1400,
                textAlign: 'center',
                animation: 'bQuestionIn 0.5s cubic-bezier(0.34,1.4,0.64,1) both',
                transition: 'box-shadow 0.5s ease, border-color 0.5s ease, opacity 0.5s ease, filter 0.5s ease, padding 0.55s cubic-bezier(0.34,1.4,0.64,1)',
                opacity: revealed ? 0.45 : 1,
              }}>
                {/* Cross-Fade zwischen großem (Frage) und kleinem (Reveal) Text.
                    User-Feedback 2026-04-28: 'Wechsel zu heftig' beim alten
                    key-Re-Mount. Jetzt: Grid-Stack mit beiden Versionen, eine
                    fadet aus während die andere mit kurzem Versatz reinfadet.
                    Der Container nimmt die Größe der jeweils sichtbaren Version
                    durch grid-template-rows-Trick — kein Snap, sauberer Übergang. */}
                <div key={lang} style={{
                  display: 'grid',
                  gridTemplateAreas: '"q"',
                  width: '100%',
                  animation: 'langFadeIn 0.4s ease both',
                }}>
                  <div style={{
                    gridArea: 'q',
                    fontSize: qFontSize,
                    fontWeight: 900, lineHeight: 1.22,
                    color: '#F1F5F9',
                    opacity: shrinkOnReveal ? 0 : 1,
                    transform: shrinkOnReveal ? 'scale(0.96)' : 'scale(1)',
                    transition: 'opacity 0.35s ease, transform 0.45s cubic-bezier(0.4,0,0.2,1)',
                    pointerEvents: shrinkOnReveal ? 'none' : 'auto',
                  }}>
                    {qText}
                  </div>
                  <div style={{
                    gridArea: 'q',
                    fontSize: qFontSizeShrunk,
                    fontWeight: 900, lineHeight: 1.22,
                    color: '#F1F5F9',
                    opacity: shrinkOnReveal ? 1 : 0,
                    transform: shrinkOnReveal ? 'scale(1)' : 'scale(1.04)',
                    transition: 'opacity 0.45s ease 0.1s, transform 0.5s cubic-bezier(0.4,0,0.2,1) 0.05s',
                    pointerEvents: shrinkOnReveal ? 'auto' : 'none',
                    alignSelf: 'center', justifySelf: 'center',
                  }}>
                    {qText}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Mobile-Hint („📱 Antwort auf dem Handy") entfernt 2026-04-26:
              Teams haben bereits die Eingabe-UI auf ihren Geraeten — der
              Beamer-Hint zielte auf niemanden, der ihn lesen muss. Die
              Avatare-mit-Haekchen-Reihe (z.B. bei Cheese) zeigt die
              Antwort-Progress visueller. */}

          {/* BUNTE_TÜTE order — Items während QUESTION_ACTIVE sichtbar
              (Teams sortieren am Handy, Publikum muss wissen worum es geht) */}
          {!revealed && q.category === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'order' && (() => {
            const btt = q.bunteTuete as any;
            const items: string[] = (lang === 'en' && btt.itemsEn?.length) ? btt.itemsEn : (btt.items ?? []);
            const criteria: string | undefined = (lang === 'en' && btt.criteriaEn) ? btt.criteriaEn : btt.criteria;
            if (items.length === 0) return null;
            const cols = Math.min(items.length, items.length <= 4 ? items.length : items.length === 5 ? 5 : 3);
            return (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 14,
                width: '100%', maxWidth: 1400, marginBottom: 16,
                animation: 'contentReveal 0.35s ease 0.1s both',
              }}>
                {criteria && (
                  <div style={{
                    fontSize: 'clamp(14px, 1.5vw, 22px)', fontWeight: 800,
                    color: '#F59E0B', letterSpacing: '0.08em', textTransform: 'uppercase',
                    textAlign: 'center',
                  }}>
                    {lang === 'en' ? `Sort ${criteria}` : `Sortiert ${criteria}`}
                  </div>
                )}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  gap: 14,
                }}>
                  {items.map((item, i) => (
                    <div key={i} style={{
                      borderRadius: 18, padding: '22px 24px',
                      background: cardBg,
                      border: '2px solid rgba(245,158,11,0.4)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.04)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 'clamp(20px, 2.4vw, 34px)', fontWeight: 800, color: '#F1F5F9',
                      textAlign: 'center', lineHeight: 1.25,
                      minHeight: 80,
                      animation: `contentReveal 0.4s ease ${0.1 + i * 0.06}s both`,
                    }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* MUCHO: 2-Akt-Reveal (Akt 1 Voter-Steps, Akt 2 Lock via Doppelblink) */}
          {q.options && q.category === 'MUCHO' && (
            <MuchoOptionsReveal
              options={q.options}
              optionsEn={q.optionsEn}
              correctOptionIndex={q.correctOptionIndex}
              optionImages={q.optionImages}
              answers={s.answers}
              teams={s.teams}
              lang={lang}
              cardBg={cardBg}
              timerEndsAt={s.timerEndsAt}
              timerDurationSec={s.timerDurationSec}
              revealStep={revealed ? s.muchoRevealStep : 0}
            />
          )}

          {/* ZEHN_VON_ZEHN: Options-Grid. Top-Bet-Chips haengen an der unteren
              Card-Linie (analog MUCHO-Reveal) — nicht mehr im Card-Inhalt. */}
          {q.options && q.category === 'ZEHN_VON_ZEHN' && (() => {
            // Fallback auf frueheste submittedAt, weil timerEndsAt zum Reveal
            // bereits null ist → ohne Fallback keine Zeit-Anzeige.
            const earliestSubmit = s.answers.length > 0
              ? Math.min(...s.answers.map(a => a.submittedAt))
              : null;
            const t0 = s.timerEndsAt && s.timerDurationSec
              ? s.timerEndsAt - s.timerDurationSec * 1000
              : earliestSubmit;
            // Analog Mucho: kompakt waehrend QUESTION_ACTIVE, Rows ziehen sich
            // smooth auseinander sobald Top-Bet-Chips einfliegen (zvzStep>=1).
            const expandedLayout = zvzStep >= 1;
            // Wenn auf einer Option viele Top-Bets liegen (4+ Teams gleicher
            // Höchstwert), brauchen wir mehr Platz unter den Cards damit die
            // Avatare nicht in die nächste Reihe rutschen.
            const maxChips = Math.max(0, ...zvzHighestPerOption.map(h => h?.teamIds?.length ?? 0));
            const heavyChips = maxChips >= 4;
            return (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              columnGap: 18,
              rowGap: expandedLayout ? (heavyChips ? 'clamp(110px, 14vh, 160px)' : 'clamp(80px, 10vh, 120px)') : 18,
              paddingBottom: expandedLayout ? (heavyChips ? 'clamp(96px, 11vh, 140px)' : 'clamp(62px, 7.5vh, 96px)') : 0,
              marginBottom: 16,
              width: '100%', maxWidth: 1400,
              animation: 'contentReveal 0.35s ease 0.1s both',
              transition: 'row-gap 0.6s cubic-bezier(0.34,1.4,0.64,1), padding-bottom 0.6s cubic-bezier(0.34,1.4,0.64,1)',
            }}>
              {q.options.map((opt, i) => {
                const optImg = q.optionImages?.[i];
                const isCorrect = zvzLocked && i === q.correctOptionIndex;
                const isWrong = zvzLocked && i !== q.correctOptionIndex;
                const label = `${i + 1}`;
                const optColor = accent;
                const optText = lang === 'en' && q.optionsEn?.[i] ? q.optionsEn[i] : opt;
                const highestForOpt = zvzHighestPerOption[i];
                const highestIdsForOpt = new Set(highestForOpt?.teamIds ?? []);
                // Top-Bets inkl. submittedAt fuer Tiebreaker-Anzeige
                const highestBets = s.answers
                  .map(a => {
                    const team = s.teams.find(t => t.id === a.teamId);
                    if (!team || !highestIdsForOpt.has(team.id)) return null;
                    const pts = (a.text.split(',').map(n => Number(n) || 0))[i] ?? 0;
                    return pts > 0 ? { team, pts, submittedAt: a.submittedAt } : null;
                  })
                  .filter((x): x is { team: NonNullable<ReturnType<typeof s.teams.find>>; pts: number; submittedAt: number } => !!x)
                  .sort((a, b) => a.submittedAt - b.submittedAt);
                const highestVisibleOpt = zvzStep >= 1 && zvzRevealed.has(i);
                // Blitz + Zeit NUR bei Tiebreak (mehrere Top-Bets mit gleichen Hoechstpunkten
                // auf der korrekten Option). Solo-Top-Bet braucht keinen Speed-Indikator —
                // der Chip mit Goldrand reicht.
                const showTimePills = isCorrect && highestBets.length > 1;
                return (
                  <div key={i} style={{ position: 'relative' }}>
                    <div style={{
                      position: 'relative', overflow: 'hidden',
                      borderRadius: 20, padding: '20px 24px',
                      background: isCorrect ? 'rgba(34,197,94,0.2)' : cardBg,
                      border: isCorrect ? '3px solid #22C55E' : isWrong ? `2px solid rgba(255,255,255,0.06)` : `2px solid ${optColor}55`,
                      boxShadow: isCorrect
                        ? '0 0 40px rgba(34,197,94,0.35), 0 0 80px rgba(34,197,94,0.15)'
                        : `0 4px 16px rgba(0,0,0,0.3)`,
                      display: 'flex', alignItems: 'center', gap: 16,
                      transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
                      animation: isCorrect
                        ? 'revealDoubleBlink 1.1s ease both'
                        : isWrong
                          ? 'revealWrongDim 0.4s ease 0.15s both'
                          : `contentReveal 0.4s ease ${0.1 + i * 0.08}s both`,
                    }}>
                      {optImg?.url && (
                        <img src={optImg.url} alt="" style={{
                          position: 'absolute', inset: 0, width: '100%', height: '100%',
                          objectFit: optImg.fit ?? 'cover', opacity: optImg.opacity ?? 0.4,
                          pointerEvents: 'none',
                        }} />
                      )}
                      {optImg?.url && (
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 100%)', pointerEvents: 'none' }} />
                      )}
                      <div style={{
                        position: 'relative', zIndex: 1,
                        width: 56, height: 56, borderRadius: 16,
                        background: isCorrect ? '#22C55E' : isWrong ? '#374151' : optColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: isCorrect ? 32 : 28, fontWeight: 900, color: '#fff', flexShrink: 0,
                        boxShadow: isCorrect ? '0 0 16px rgba(34,197,94,0.6)' : `0 2px 8px ${optColor}44`,
                        transition: 'all 0.3s ease',
                      }}>{label}</div>
                      <div style={{
                        position: 'relative', zIndex: 1,
                        flex: 1, minWidth: 0,
                        fontSize: 'clamp(24px, 2.8vw, 40px)', fontWeight: 800,
                        color: isWrong ? '#475569' : '#F1F5F9', lineHeight: 1.25,
                        textShadow: optImg?.url ? '0 2px 8px rgba(0,0,0,0.8)' : 'none',
                        transition: 'color 0.3s ease',
                      }}>{optText}</div>
                    </div>
                    {/* Top-Bet-Chips: haengen UNTER der Card (nur ein kleiner Lip
                        ueberlappt den Card-Rand). ZvZ-Cards sind flach → wenn
                        Chips mittig auf der Linie sitzen, ueberdecken sie das Label. */}
                    {highestVisibleOpt && highestBets.length > 0 && (() => {
                      const cnt = highestBets.length;
                      // Chip-Tiers nach Anzahl gleichplatzierter Top-Bets pro Option:
                      // bei 4+ massiv schrumpfen, sonst rutschen Chips in 2. Reihe und
                      // ueberlagern die naechste Card-Zeile.
                      const tier: 'lg' | 'md' | 'sm' | 'xs' =
                        cnt >= 5 ? 'xs' : cnt >= 4 ? 'sm' : cnt >= 3 ? 'md' : 'lg';
                      const avSz =
                        tier === 'xs' ? 'clamp(28px, 2.8vw, 40px)' :
                        tier === 'sm' ? 'clamp(36px, 3.6vw, 52px)' :
                        tier === 'md' ? 'clamp(44px, 4.6vw, 64px)' :
                                        'clamp(52px, 5.4vw, 76px)';
                      const ptsFs =
                        tier === 'xs' ? 'clamp(14px, 1.5vw, 20px)' :
                        tier === 'sm' ? 'clamp(16px, 1.8vw, 24px)' :
                        tier === 'md' ? 'clamp(18px, 2vw, 28px)' :
                                        'clamp(20px, 2.2vw, 30px)';
                      const padR = tier === 'xs' ? 10 : tier === 'sm' ? 12 : tier === 'md' ? 14 : 18;
                      const innerGap = tier === 'xs' ? 4 : tier === 'sm' ? 6 : 8;
                      const outerGap = cnt >= 4 ? 4 : cnt > 2 ? 6 : 10;
                      return (
                      <div style={{
                        position: 'absolute', left: 8, right: 8, bottom: 0,
                        transform: 'translateY(72%)',
                        display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start',
                        justifyContent: 'center',
                        gap: outerGap,
                        pointerEvents: 'none', zIndex: 5,
                      }}>
                        {highestBets.map(({ team: tm, pts, submittedAt }, bi) => {
                          const timeSec = t0 ? Math.max(0, (submittedAt - t0) / 1000) : null;
                          const isFastest = showTimePills && bi === 0;
                          // Dim-Logik bewusst entfernt (User-Feedback): ZvZ-Voter-Chips
                          // bleiben voll opak auf allen Optionen, Falsch-Markierung
                          // laeuft nur ueber die Card selbst (Rand + Text gedimmt).
                          return (
                            <div key={tm.id} title={`${tm.name}: ${pts}`} style={{
                              position: 'relative',
                              display: 'flex', alignItems: 'center', gap: innerGap,
                              padding: `2px ${padR}px 2px 2px`,
                              borderRadius: 999,
                              background: 'rgba(0,0,0,0.7)',
                              border: isFastest ? '3px solid #FBBF24' : `2px solid ${tm.color}`,
                              boxShadow: isFastest
                                ? '0 0 22px rgba(251,191,36,0.55), 0 6px 14px rgba(0,0,0,0.55)'
                                : `0 6px 14px rgba(0,0,0,0.55), 0 0 14px ${tm.color}66`,
                              animation: `muchoVoterDrop 0.55s cubic-bezier(0.34,1.5,0.64,1) ${0.1 + bi * 0.08}s both`,
                            }}>
                              <QQTeamAvatar avatarId={tm.avatarId} size={avSz} />
                              <span style={{
                                fontSize: ptsFs,
                                fontWeight: 900,
                                // Bet-Zahl in Team-Farbe (sofort erkennbar wer wo gesetzt
                                // hat) + Gold-Text-Shadow als gemeinsamer Akzent.
                                color: tm.color, fontVariantNumeric: 'tabular-nums',
                                textShadow: '0 0 12px rgba(251,191,36,0.45), 0 1px 2px rgba(0,0,0,0.6)',
                              }}>{pts}</span>
                              {isFastest && (
                                <SpeedBoltMarker top={-12} right={-8} />
                              )}
                              {/* Zeit-Pill immer auf korrekter Option (konsistent mit Mucho/Cheese) */}
                              {showTimePills && timeSec != null && (
                                <span style={{
                                  position: 'absolute',
                                  left: '50%', bottom: -8,
                                  transform: 'translate(-50%, 50%)',
                                  padding: '2px 9px', borderRadius: 999,
                                  background: isFastest ? 'rgba(251,191,36,0.95)' : 'rgba(15,23,42,0.95)',
                                  border: isFastest ? '1.5px solid rgba(251,191,36,1)' : `1.5px solid ${tm.color}`,
                                  color: isFastest ? '#0d0a06' : '#e2e8f0',
                                  fontWeight: 900,
                                  fontSize: 'clamp(11px, 1.2vw, 15px)',
                                  whiteSpace: 'nowrap',
                                  boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                                  lineHeight: 1.1,
                                }}>
                                  {timeSec.toFixed(1)}s
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
            );
          })()}

          {/* ZEHN_VON_ZEHN: Unter-Bets (alle außer Top-Bets) — Top-Bets werden
              direkt auf der Option oben eingeblendet. Hier also nur die restlichen
              Tipps pro Option, von Anfang an in einheitlicher Größe.
              Sobald die Korrektheit gelockt ist (zvzLocked), gleiten die Sub-Bets
              nach unten weg + fade — clean Spotlight auf die richtige Option. */}
          {revealed && q.category === 'ZEHN_VON_ZEHN' && q.options && (
            <div style={{
              width: '100%', maxWidth: 1400,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 18,
              marginBottom: zvzLocked ? 0 : 16,
              maxHeight: zvzLocked ? 0 : 600,
              overflow: 'hidden',
              opacity: zvzLocked ? 0 : 1,
              transform: zvzLocked ? 'translateY(20px)' : 'translateY(0)',
              transition: 'opacity 0.55s ease 0.2s, transform 0.55s ease 0.2s, max-height 0.55s ease 0.2s, margin-bottom 0.55s ease 0.2s',
              pointerEvents: zvzLocked ? 'none' : 'auto',
            }}>
              {q.options.map((_, i) => {
                const bets = s.answers.map(a => {
                  const pts = a.text.split(',').map(n => Number(n) || 0);
                  return { team: s.teams.find(t => t.id === a.teamId), pts: pts[i] ?? 0 };
                }).filter((b): b is { team: NonNullable<typeof b.team>; pts: number } => !!b.team && b.pts > 0);
                const highest = zvzHighestPerOption[i];
                const highestIds = new Set(highest?.teamIds ?? []);
                const otherBets = bets.filter(b => !highestIds.has(b.team.id));
                return (
                  <div key={`bets-${i}`} style={{
                    display: 'flex', flexWrap: 'wrap', gap: 6,
                    justifyContent: 'center', alignItems: 'center',
                    minHeight: 'clamp(40px, 5vw, 56px)',
                  }}>
                    {otherBets.length === 0 ? (
                      <span style={{ fontSize: 'clamp(13px, 1.4vw, 18px)', color: '#475569', fontStyle: 'italic' }}>—</span>
                    ) : otherBets.map(({ team: tm, pts }) => (
                      <div key={tm.id} title={`${tm.name}: ${pts}`} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '3px 12px 3px 3px',
                        borderRadius: 999,
                        background: 'rgba(0,0,0,0.55)',
                        border: `2px solid ${tm.color}`,
                        boxShadow: `0 3px 10px rgba(0,0,0,0.5), 0 0 8px ${tm.color}44`,
                      }}>
                        <QQTeamAvatar avatarId={tm.avatarId} size={'clamp(28px, 3vw, 40px)'} />
                        <span style={{
                          fontSize: 'clamp(14px, 1.6vw, 22px)',
                          fontWeight: 900,
                          color: tm.color, fontVariantNumeric: 'tabular-nums',
                          textShadow: '0 0 10px rgba(251,191,36,0.4), 0 1px 2px rgba(0,0,0,0.6)',
                        }}>{pts}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Answer reveal (skip for MUCHO/ZEHN_VON_ZEHN + Hot Potato — handled separately).
              Rechts im Feld: Avatare der Teams, die das Richtige getippt haben,
              sortiert nach Reaktionszeit (schnellster mit <QQEmojiIcon emoji="⚡"/>-Krone).
              CHEESE: step-based — erst bei cheeseShowGreen (Step 1) sichtbar; Avatare kaskadieren bei Step 2. */}
          {revealed && s.revealedAnswer && q.category !== 'MUCHO' && q.category !== 'ZEHN_VON_ZEHN'
            && !(q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato') && (() => {
              // CHEESE: Box immer sichtbar (Layout fix), Inhalt erst bei Step 1.
              const cheeseHideContent = q.category === 'CHEESE' && !cheeseShowGreen;
              // Korrekte Teams: wir nehmen alle, deren Antwort mit revealedAnswer (oder answerEn)
              // fuzzy matcht (lowercase, whitespace-trim). Bei SCHAETZCHEN gibt's nichts zu matchen →
              // leeres Array, dort macht die Zeitstrahl-Darstellung den Job.
              const corrList: string[] = [];
              if (s.revealedAnswer) corrList.push(s.revealedAnswer.toLowerCase().trim());
              if (q.answerEn) corrList.push(String(q.answerEn).toLowerCase().trim());
              const isSchaetz = q.category === 'SCHAETZCHEN';
              const correctTeams = isSchaetz ? [] : [...s.answers]
                .filter(a => {
                  const t = (a.text ?? '').toLowerCase().trim();
                  if (!t) return false;
                  return corrList.some(c => c === t || (c.length > 2 && (t.includes(c) || c.includes(t))));
                })
                .sort((a, b) => a.submittedAt - b.submittedAt)
                .map(a => {
                  const team = s.teams.find(t => t.id === a.teamId);
                  return team ? { team, submittedAt: a.submittedAt } : null;
                })
                .filter((x): x is { team: NonNullable<ReturnType<typeof s.teams.find>>; submittedAt: number } => !!x);
              const t0 = s.timerEndsAt && s.timerDurationSec
                ? s.timerEndsAt - s.timerDurationSec * 1000
                : correctTeams[0]?.submittedAt;
              return (
                <div style={{
                  position: 'relative', overflow: 'hidden',
                  padding: 'clamp(16px, 2vh, 32px) clamp(24px, 3vw, 52px)', borderRadius: 28,
                  background: cheeseHideContent ? 'rgba(34,197,94,0.06)' : 'rgba(34,197,94,0.12)',
                  border: cheeseHideContent ? '3px dashed rgba(34,197,94,0.22)' : '3px solid rgba(34,197,94,0.50)',
                  boxShadow: cheeseHideContent ? 'none' : '0 0 60px rgba(34,197,94,0.25), 0 0 120px rgba(34,197,94,0.1)',
                  marginBottom: 'clamp(8px, 1.2vh, 24px)',
                  width: '100%', maxWidth: 1400,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 'clamp(10px, 1.4vh, 18px)',
                  animation: cheeseHideContent ? undefined : 'revealAnswerBam 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both',
                  transition: 'background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease',
                }}>
                  {/* Shimmer sweep */}
                  <div style={{
                    position: 'absolute', top: 0, width: '60%', height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                    animation: 'revealShimmer 0.8s ease 0.5s both',
                    pointerEvents: 'none',
                  }} />
                  <span style={{
                    fontSize: 'clamp(28px, 4vw, 64px)', fontWeight: 900, color: '#4ade80',
                    flexShrink: 1, minWidth: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    position: 'relative', zIndex: 1,
                    visibility: cheeseHideContent ? 'hidden' : 'visible',
                  }}>
                    {formatRevealedAnswer(lang, s.revealedAnswer ?? q.answer, q.answerEn)}
                  </span>
                  {correctTeams.length > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                      gap: 12, flexWrap: 'wrap',
                      flexShrink: 0, width: '100%',
                      position: 'relative', zIndex: 1,
                      // Bei CHEESE vor Step 2: Platz reserviert, Inhalt unsichtbar — verhindert Card-Dehnung
                      visibility: (q.category === 'CHEESE' && !cheeseShowAvatars) ? 'hidden' : 'visible',
                    }}>
                      {correctTeams.map((ct, vi) => {
                        const timeSec = t0 ? Math.max(0, (ct.submittedAt - t0) / 1000) : null;
                        const isFastest = vi === 0;
                        // CHEESE: jedes Team poppt zeitgesteuert (160ms Versatz); andere Kategorien bleiben bei bisheriger Animation.
                        const isCheeseCascade = q.category === 'CHEESE' && cheeseShowAvatars;
                        const cascadeDelay = isCheeseCascade ? vi * 0.16 : 0.6;
                        const avatarAnim = isCheeseCascade
                          ? `muchoVoterDrop 0.55s cubic-bezier(0.34,1.5,0.64,1) ${cascadeDelay}s both`
                          : `revealAnswerBam 0.5s cubic-bezier(0.34,1.4,0.64,1) ${cascadeDelay}s both`;
                        return (
                          <div key={ct.team.id} style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                            animation: avatarAnim,
                          }}>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <QQTeamAvatar
                                avatarId={ct.team.avatarId}
                                size={isFastest ? 'clamp(78px, 8.6vw, 116px)' : 'clamp(58px, 6.4vw, 88px)'}
                                style={{
                                  border: isFastest ? '4px solid #FBBF24' : 'none',
                                  boxShadow: isFastest
                                    ? `0 0 28px rgba(251,191,36,0.65), 0 4px 14px rgba(0,0,0,0.45)`
                                    : '0 4px 12px rgba(0,0,0,0.4)',
                                }}
                              />
                              {isFastest && (
                                <SpeedBoltMarker top={-12} right={-12} />
                              )}
                            </div>
                            {timeSec != null && (
                              <span style={{
                                padding: '3px 10px', borderRadius: 999,
                                background: isFastest ? 'rgba(251,191,36,0.22)' : 'rgba(0,0,0,0.55)',
                                border: isFastest ? '1.5px solid rgba(251,191,36,0.7)' : '1px solid rgba(255,255,255,0.15)',
                                color: isFastest ? '#FBBF24' : '#cbd5e1',
                                fontWeight: 900,
                                fontSize: 'clamp(15px, 1.6vw, 20px)',
                                whiteSpace: 'nowrap',
                              }}>
                                {timeSec.toFixed(1)}s
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

          {/* Hot Potato reveal: show full answer list as chips, mark which were named */}
          {revealed && q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato' && (() => {
            const raw = (lang === 'en' && q.answerEn ? q.answerEn : q.answer) ?? '';
            const allAnswers = raw.split(/[,;]/).map(a => a.replace(/[…\.]+$/, '').trim()).filter(Boolean);
            const used = s.hotPotatoUsedAnswers ?? [];
            const authors = s.hotPotatoAnswerAuthors ?? [];
            const usedNorm = used.map((u: string) => u.toLowerCase().trim());
            // Map each revealed answer (from q.answer) → authoring team (if any)
            const findAuthor = (a: string): string | null => {
              const aLower = a.toLowerCase().trim();
              for (let i = 0; i < usedNorm.length; i++) {
                const u = usedNorm[i];
                if (u === aLower || u.includes(aLower) || aLower.includes(u)) return authors[i] ?? null;
              }
              return null;
            };
            // Density-Skalierung: bei vielen Antworten Pills/Font kompakter, sonst sprengen sie den Beamer.
            const N = allAnswers.length;
            const tier =
              N <= 12 ? 'lg'
              : N <= 25 ? 'md'
              : N <= 50 ? 'sm'
              : 'xs';
            const tierStyles = {
              lg: { fontSize: 'clamp(16px, 1.8vw, 24px)', pad: '8px 18px', padAvatar: '4px 16px 4px 4px', avatarSize: 'clamp(30px, 3vw, 40px)', gap: 10, headerFs: 'clamp(20px, 2.4vw, 32px)', containerPad: '18px 22px', stagger: 0.05 },
              md: { fontSize: 'clamp(13px, 1.4vw, 18px)', pad: '5px 12px', padAvatar: '3px 12px 3px 3px', avatarSize: 'clamp(22px, 2.2vw, 30px)', gap: 6, headerFs: 'clamp(16px, 1.8vw, 24px)', containerPad: '12px 16px', stagger: 0.025 },
              sm: { fontSize: 'clamp(11px, 1.2vw, 15px)', pad: '3px 9px', padAvatar: '2px 9px 2px 2px', avatarSize: 'clamp(18px, 1.8vw, 24px)', gap: 4, headerFs: 'clamp(14px, 1.5vw, 20px)', containerPad: '10px 14px', stagger: 0.012 },
              xs: { fontSize: 'clamp(10px, 1vw, 13px)', pad: '2px 7px', padAvatar: '2px 7px 2px 2px', avatarSize: 'clamp(14px, 1.4vw, 18px)', gap: 3, headerFs: 'clamp(13px, 1.4vw, 18px)', containerPad: '8px 12px', stagger: 0.008 },
            }[tier];
            return (
              <div style={{
                width: '100%', maxWidth: 1400,
                marginBottom: 'clamp(8px, 1.2vh, 24px)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: tier === 'lg' ? 14 : tier === 'md' ? 10 : 8,
                animation: 'revealAnswerBam 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both',
              }}>
                <div style={{
                  fontSize: tierStyles.headerFs, fontWeight: 900,
                  color: '#86efac', letterSpacing: 0.5,
                }}>
                  <QQEmojiIcon emoji="🥔"/> {lang === 'en' ? 'All possible answers' : 'Alle möglichen Antworten'}
                  <span style={{ marginLeft: 8, fontSize: '0.7em', opacity: 0.7 }}>· {N}</span>
                </div>
                <div style={{
                  display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
                  gap: tierStyles.gap,
                  padding: tierStyles.containerPad, borderRadius: 22,
                  background: 'rgba(34,197,94,0.08)',
                  border: '2px solid rgba(34,197,94,0.3)',
                  // Höhe begrenzen damit Beamer-Layout nicht überläuft
                  maxHeight: 'clamp(220px, 32vh, 380px)', overflow: 'hidden',
                }}>
                  {allAnswers.map((a, i) => {
                    const authorId = findAuthor(a);
                    const named = authorId !== null || usedNorm.some((u: string) =>
                      u === a.toLowerCase().trim() || u.includes(a.toLowerCase().trim()) || a.toLowerCase().trim().includes(u)
                    );
                    const authorTeam = authorId ? s.teams.find(t => t.id === authorId) : null;
                    // Bei xs/sm-Density: Avatare nur bei genannten Antworten anzeigen
                    const showAvatar = !!authorTeam && (tier !== 'xs');
                    return (
                      <div key={`${a}-${i}`} style={{
                        display: 'inline-flex', alignItems: 'center', gap: tier === 'lg' ? 8 : 4,
                        padding: showAvatar ? tierStyles.padAvatar : tierStyles.pad,
                        borderRadius: 999,
                        fontSize: tierStyles.fontSize, fontWeight: 800,
                        background: named ? 'rgba(34,197,94,0.22)' : 'rgba(15,23,42,0.5)',
                        border: `${tier === 'xs' ? 1 : 2}px solid ${authorTeam ? authorTeam.color : (named ? '#22C55E' : 'rgba(148,163,184,0.25)')}`,
                        color: named ? '#86efac' : '#94a3b8',
                        animation: `contentReveal 0.4s ease ${0.2 + i * tierStyles.stagger}s both`,
                        boxShadow: authorTeam && tier !== 'xs' ? `0 0 8px ${authorTeam.color}44` : 'none',
                      }}>
                        {showAvatar && authorTeam && (
                          <QQTeamAvatar avatarId={authorTeam.avatarId} size={tierStyles.avatarSize} title={authorTeam.name} style={{
                            flexShrink: 0,
                          }} />
                        )}
                        <span>{named ? (tier === 'xs' || tier === 'sm' ? '✓' : '✓ ') : ''}{a}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Background flash on reveal */}
          {revealed && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
              background: s.correctTeamId
                ? `radial-gradient(ellipse at center, rgba(34,197,94,0.3) 0%, transparent 70%)`
                : `radial-gradient(ellipse at center, rgba(239,68,68,0.2) 0%, transparent 70%)`,
              animation: 'revealFlash 1.2s ease-out both',
            }} />
          )}

          {/* Schätzchen: number-line visualization (above leaderboard) */}
          {revealed && q.category === 'SCHAETZCHEN' && s.answers.length > 0 && q.targetValue != null && (() => {
            const target = q.targetValue as number;
            const parsed = s.answers
              .map(a => {
                const num = Number(a.text.replace(/[^0-9.,\-]/g, '').replace(',', '.'));
                const team = s.teams.find(t => t.id === a.teamId);
                return { teamId: a.teamId, num, team, text: a.text };
              })
              .filter(p => Number.isFinite(p.num) && p.team);
            if (parsed.length === 0) return null;
            const values = [target, ...parsed.map(p => p.num)];
            const rawMin = Math.min(...values);
            const rawMax = Math.max(...values);
            const rawSpan = rawMax - rawMin;
            // Padding 10% auf beiden Seiten, mindestens 10% relativ zum Target.
            const pad = Math.max(rawSpan * 0.1, Math.abs(target) * 0.05, 1);
            const axMin = rawMin - pad;
            const axMax = rawMax + pad;
            const axSpan = Math.max(axMax - axMin, 1);
            const pctOf = (v: number) => ((v - axMin) / axSpan) * 100;
            // Worst → best für Animation-Reihenfolge (Trommelwirbel bis Gewinner)
            const sorted = [...parsed].sort((a, b) =>
              Math.abs(b.num - target) - Math.abs(a.num - target)
            );
            // 4-Slot-Kollisionssystem: Avatare werden auf die erste freie Reihe
            // gelegt, die genug horizontalen Abstand hat. Reihenfolge der Reihen:
            // 0=oben nah, 1=unten nah, 2=oben weit, 3=unten weit.
            // MIN_DIST_PCT = minimaler X-Abstand in % für dieselbe Reihe.
            // Avatar 72px bei ~1400px Breite ≈ 5.2%, + 2% Luft = 7.2% → 8%.
            const pinRows = new Map<string, number>();
            const pinXNudge = new Map<string, number>();
            const MIN_DIST_PCT = 8;
            const rowLastPct: number[] = [-Infinity, -Infinity, -Infinity, -Infinity];
            const sortedByPos = [...parsed].sort((a, b) => a.num - b.num);
            sortedByPos.forEach((p) => {
              const pct = pctOf(p.num);
              // Probiere die 4 Reihen in bevorzugter Reihenfolge durch
              const preferredOrder = [0, 1, 2, 3];
              let chosen = 3; // Fallback = weit-unten
              for (const row of preferredOrder) {
                if (pct - rowLastPct[row] >= MIN_DIST_PCT) {
                  chosen = row;
                  break;
                }
              }
              pinRows.set(p.teamId, chosen);
              rowLastPct[chosen] = pct;
            });

            // ═══════════════════════════════════════════════════════════════
            // DYNAMIC CHIP PLACEMENT mit echter Kollisionserkennung.
            // Pixel-basiert auf einer virtuellen Bühne von 1400px Breite.
            // Für jeden Pin werden 4 Chip-Kandidaten geprüft (below, above,
            // right, left relativ zum Avatar) und der erste freie gewählt.
            // Geprüft wird gegen ALLE bereits platzierten Avatare & Chips.
            // Die Chip-Offsets werden dann per CSS-Var an den Chip gereicht.
            // ═══════════════════════════════════════════════════════════════
            type Rect = { x: number; y: number; w: number; h: number };
            const STAGE_W = 1400;
            const rectsOverlap = (a: Rect, b: Rect, pad = 4) =>
              !(a.x + a.w + pad <= b.x ||
                b.x + b.w + pad <= a.x ||
                a.y + a.h + pad <= b.y ||
                b.y + b.h + pad <= a.y);
            const placedRects: Rect[] = [];
            // Zielmarker sitzt jetzt ALS Pill direkt AUF der Rail —
            // nur ein schmales Rect in Rail-Höhe sperren, damit Avatar-Chips
            // oben/unten drumherum frei platziert werden können.
            const targetPx = (pctOf(target) / 100) * STAGE_W;
            placedRects.push({ x: targetPx - 50, y: -16, w: 100, h: 32 });
            // Alle Pin-Avatare als Rects für Kollision vormerken.
            parsed.forEach((p) => {
              const r = pinRows.get(p.teamId) ?? 0;
              const isWinner = p.teamId === sorted[sorted.length - 1].teamId;
              const isTop = r === 0 || r === 2;
              const gap = r === 0 || r === 1 ? 110 : 180;
              const wrapperY = isTop ? -gap : gap;
              const aSize = isWinner ? 86 : 72;
              const px = (pctOf(p.num) / 100) * STAGE_W;
              placedRects.push({
                x: px - aSize / 2, y: wrapperY - aSize / 2,
                w: aSize, h: aSize,
              });
            });
            // Chip-Offsets pro Team berechnen.
            const pinChipOffset = new Map<string, { dx: number; dy: number; side: 'below' | 'above' | 'right' | 'left' }>();
            // In Reihenfolge der sortierten Enthüllung (sorted = worst→best),
            // damit Gewinner zuletzt platziert wird und freie Plätze wählt.
            // Aber bessere Verteilung: erst die engsten Cluster (mittlere Pcts)
            // durchgehen — wir gehen links→rechts, das klappt in der Praxis.
            [...parsed].sort((a, b) => a.num - b.num).forEach((p) => {
              const r = pinRows.get(p.teamId) ?? 0;
              const isWinner = p.teamId === sorted[sorted.length - 1].teamId;
              const isTop = r === 0 || r === 2;
              const gap = r === 0 || r === 1 ? 110 : 180;
              const wrapperY = isTop ? -gap : gap;
              const aSize = isWinner ? 86 : 72;
              const px = (pctOf(p.num) / 100) * STAGE_W;
              const chipW = isWinner ? 140 : 100;
              const chipH = isWinner ? 64 : 48;
              // Kandidaten relativ zum Avatar-Wrapper-Zentrum (px-Koordinaten).
              // Primär: Richtung "Rail" (zur Mitte hin) bleibt erhalten —
              // unten-Avatare → Chip nach oben, oben-Avatare → Chip nach unten.
              // Dann Fallbacks: außen, rechts, links.
              const primaryBelow = !isTop; // !isTop = Avatar unten der Rail → Chip über dem Avatar (Richtung Rail)
              const candidates: Array<{ dx: number; dy: number; side: 'below' | 'above' | 'right' | 'left' }> = [];
              // Rail-zugewandt (primär)
              if (primaryBelow) {
                candidates.push({ dx: 0, dy: -aSize / 2 - 6 - chipH, side: 'above' });
              } else {
                candidates.push({ dx: 0, dy: aSize / 2 + 6, side: 'below' });
              }
              // Rail-abgewandt (sekundär)
              if (primaryBelow) {
                candidates.push({ dx: 0, dy: aSize / 2 + 6, side: 'below' });
              } else {
                candidates.push({ dx: 0, dy: -aSize / 2 - 6 - chipH, side: 'above' });
              }
              // Rechts / links vom Avatar
              candidates.push({ dx: aSize / 2 + 8, dy: -chipH / 2, side: 'right' });
              candidates.push({ dx: -aSize / 2 - 8 - chipW, dy: -chipH / 2, side: 'left' });
              // Weitere Fallbacks: weiter oben/unten
              candidates.push({ dx: 0, dy: -aSize / 2 - 6 - chipH - 28, side: 'above' });
              candidates.push({ dx: 0, dy: aSize / 2 + 6 + 28, side: 'below' });

              let picked = candidates[0];
              for (const c of candidates) {
                const chipRect: Rect = {
                  x: px + c.dx - chipW / 2 + (c.side === 'right' || c.side === 'left' ? chipW / 2 : 0),
                  y: wrapperY + c.dy,
                  w: chipW, h: chipH,
                };
                // Für side=right/left: dx bereits inkl. Chip-Breite gesetzt.
                if (c.side === 'right' || c.side === 'left') {
                  chipRect.x = px + c.dx;
                } else {
                  chipRect.x = px + c.dx - chipW / 2;
                }
                const collides = placedRects.some(r2 => rectsOverlap(chipRect, r2));
                if (!collides) {
                  placedRects.push(chipRect);
                  picked = c;
                  break;
                }
              }
              // Falls alle kollidieren → trotzdem primary nehmen, platzieren.
              if (!picked) picked = candidates[0];
              pinChipOffset.set(p.teamId, picked);
            });
            const targetPct = pctOf(target);
            const unitStrInline = (lang === 'en' && q.unitEn ? q.unitEn : q.unit) ?? '';
            const isYearUnitInline = /jahr|year/i.test(unitStrInline);
            const fmt = (n: number) => {
              const abs = Math.abs(n);
              if (isYearUnitInline) return String(Math.round(n));
              if (abs >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
              if (abs >= 10000) return (n / 1000).toFixed(0) + 'k';
              if (abs >= 1000) return n.toLocaleString(lang === 'en' ? 'en-US' : 'de-DE');
              return n % 1 === 0 ? String(n) : n.toFixed(1);
            };
            return (
              <div style={{
                width: '100%', maxWidth: 1400,
                // Oben/unten: weit-Row (180 + Avatar 41 + Chip 36 ≈ 250). Target sitzt jetzt ON-Rail.
                padding: '235px clamp(24px, 3vw, 48px) 235px',
                marginBottom: 'clamp(8px, 1vh, 16px)',
                position: 'relative',
                background: 'rgba(255,255,255,0.03)',
                border: '1.5px solid rgba(255,255,255,0.08)',
                borderRadius: 20,
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                animation: 'contentReveal 0.5s ease 0.3s both',
              }}>
                {/* Axis line — mittig im Container, genug Luft oben/unten für die Pins */}
                <div style={{
                  position: 'relative', height: 4,
                }}>
                  {/* Rail */}
                  <div style={{
                    position: 'absolute', left: 0, right: 0, top: '50%',
                    height: 4, borderRadius: 2,
                    background: 'linear-gradient(90deg, rgba(148,163,184,0.15), rgba(148,163,184,0.35), rgba(148,163,184,0.15))',
                    transform: 'translateY(-50%)',
                  }} />
                  {/* Axis endpoints labels */}
                  <div style={{
                    position: 'absolute', left: 0, top: 'calc(50% + 22px)',
                    fontSize: 'clamp(18px, 1.8vw, 26px)', color: '#94a3b8', fontWeight: 800,
                  }}>{fmt(axMin)}</div>
                  <div style={{
                    position: 'absolute', right: 0, top: 'calc(50% + 22px)',
                    fontSize: 'clamp(18px, 1.8vw, 26px)', color: '#94a3b8', fontWeight: 800,
                  }}>{fmt(axMax)}</div>

                  {/* Target marker — kompakte Pille direkt AUF der Rail.
                      Etwas kleiner, damit nahe Avatare nicht verdeckt werden. */}
                  <div style={{
                    position: 'absolute', left: `${targetPct}%`, top: '50%',
                    transform: 'translate(-50%, -50%)',
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 11px 4px 7px',
                    borderRadius: 999,
                    background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                    boxShadow: '0 0 14px rgba(34,197,94,0.55), 0 2px 8px rgba(0,0,0,0.38)',
                    border: '2px solid rgba(255,255,255,0.9)',
                    animation: 'pinRevealIn 0.55s cubic-bezier(0.34,1.4,0.64,1) 0.5s both',
                    ['--pin-x' as any]: '0px',
                    ['--pin-y' as any]: '0px',
                    zIndex: 30,
                    whiteSpace: 'nowrap',
                  }}>
                    <span style={{
                      fontSize: 'clamp(16px, 1.7vw, 22px)', lineHeight: 1,
                    }}><QQEmojiIcon emoji="🎯"/></span>
                    <span style={{
                      color: '#fff', fontWeight: 900,
                      fontSize: 'clamp(14px, 1.6vw, 20px)', lineHeight: 1,
                      textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }}>{fmt(target)}</span>
                  </div>

                  {/* Team pins — Avatar und Wert-Chip liegen als stack klar ÜBER bzw.
                      UNTER der Rail. Bei "oben" (negative yOffset) kommt der Chip
                      über den Avatar, die Verbindungslinie zieht unterhalb des
                      Avatars Richtung Rail. Bei "unten" (positive yOffset) steht der
                      Avatar unter der Rail, der Chip darunter. Dadurch sind Avatare
                      eindeutig nicht mehr "auf der Linie". */}
                  {parsed.map((p) => {
                    const pct = pctOf(p.num);
                    const r = pinRows.get(p.teamId) ?? 0;
                    const xNudge = pinXNudge.get(p.teamId) ?? 0;
                    const isWinner = p.teamId === sorted[sorted.length - 1].teamId;
                    const orderIdx = sorted.findIndex(x => x.teamId === p.teamId);
                    const delay = 0.7 + orderIdx * 0.18;
                    const tColor = p.team!.color;
                    // r: 0 = oben nah, 1 = unten nah, 2 = oben weit, 3 = unten weit.
                    const isTop = r === 0 || r === 2;
                    // gap = Entfernung Rail ↔ Avatar-Mittelpunkt — kompakter, aber Avatare klar von der Rail getrennt.
                    // Nah: 110, Weit: 180 (zweite Reihe bei Kollision)
                    const gap = r === 0 || r === 1 ? 110 : 180;
                    const avatarSize = isWinner ? 86 : 72;
                    // Nudge/Animation-Deltas (Gewinner hüpft Richtung Ziel)
                    const nudgePctDelta = targetPct - pct;
                    const nudgeXPx = Math.max(-160, Math.min(160, nudgePctDelta * 12));
                    const nudgeDelay = delay + 0.8;
                    // Das äußere Wrapper-Div wird per translate auf Rail-Ebene
                    // bzw. Avatar-Ebene zentriert — isTop: nach oben, sonst nach
                    // unten. Wrapper ist ein Punkt; die Kinder werden relativ
                    // zum Avatar-Zentrum absolut positioniert.
                    const wrapperY = isTop ? -gap : gap;
                    return (
                      <div key={p.teamId} style={{
                        position: 'absolute', left: `${pct}%`, top: '50%',
                        width: 0, height: 0,
                        // CSS-Vars für pinRevealIn + winnerNudge — Wrapper-Position
                        // bleibt erhalten (nicht von animation overschrieben).
                        ['--pin-x' as any]: `${xNudge}px`,
                        ['--pin-y' as any]: `${wrapperY}px`,
                        ['--base-x' as any]: `${xNudge}px`,
                        ['--nudge-x' as any]: `${nudgeXPx}px`,
                        ['--nudge-y' as any]: `${wrapperY}px`,
                        transform: `translate(calc(-50% + ${xNudge}px), calc(-50% + ${wrapperY}px))`,
                        animation: isWinner
                          ? `pinRevealIn 0.55s cubic-bezier(0.34,1.4,0.64,1) ${delay}s both, winnerNudge 1.4s cubic-bezier(0.34,1.4,0.64,1) ${nudgeDelay}s 1 both`
                          : `pinRevealIn 0.55s cubic-bezier(0.34,1.4,0.64,1) ${delay}s both`,
                        zIndex: isWinner ? 20 : 10,
                      }}>
                        {/* Verbindungslinie vom Avatar zur Rail (in Richtung Rail) */}
                        <div style={{
                          position: 'absolute', left: '50%',
                          top: isTop ? `${avatarSize / 2}px` : `${-gap}px`,
                          width: 2, height: gap - avatarSize / 2,
                          background: `${tColor}88`,
                          transform: 'translateX(-50%)',
                          zIndex: -1,
                        }} />
                        {/* Avatar pin (zentriert auf Wrapper-Punkt) */}
                        <QQTeamAvatar avatarId={p.team!.avatarId} size={isWinner ? 'clamp(72px, 7vw, 96px)' : 'clamp(60px, 6vw, 82px)'} style={{
                          position: 'absolute', left: '50%', top: 0,
                          transform: 'translate(-50%, -50%)',
                          border: isWinner ? '3px solid #FBBF24' : 'none',
                          boxShadow: isWinner
                            ? `0 0 24px ${tColor}aa, 0 0 44px rgba(251,191,36,0.5)`
                            : `0 4px 12px rgba(0,0,0,0.5)`,
                        }} />
                        {/* Value-Chip mit DYNAMISCHER Kollisionsvermeidung.
                            Der Chip wird relativ zum Avatar-Zentrum in eine der
                            4 Richtungen gelegt (oben/unten/rechts/links), je
                            nachdem wo Platz frei ist. Position kam aus
                            pinChipOffset (px-basierte Kollisionserkennung). */}
                        {(() => {
                          const off = pinChipOffset.get(p.teamId) ?? { dx: 0, dy: avatarSize / 2 + 10, side: 'below' as const };
                          const isChipTopOfAvatar = off.dy < 0;
                          // Connector-Linie vom Avatar zum Chip (Team-Farbe),
                          // damit Zuordnung klar bleibt wenn Chip seitlich sitzt.
                          const connectorH = off.side === 'above'
                            ? Math.abs(off.dy) - avatarSize / 2
                            : off.side === 'below'
                              ? off.dy - avatarSize / 2
                              : 0;
                          return (
                            <>
                              {/* Connector (nur oben/unten, seitlich nicht nötig da Chip direkt am Avatar) */}
                              {(off.side === 'above' || off.side === 'below') && connectorH > 2 && (
                                <div style={{
                                  position: 'absolute', left: '50%',
                                  top: isChipTopOfAvatar ? `${-(avatarSize / 2 + connectorH)}px` : `${avatarSize / 2}px`,
                                  width: 2, height: connectorH,
                                  background: `${tColor}99`,
                                  transform: 'translateX(-50%)',
                                  zIndex: 0,
                                }} />
                              )}
                              <div style={{
                                position: 'absolute',
                                left: off.side === 'right'
                                  ? `${off.dx}px`
                                  : off.side === 'left'
                                    ? `${off.dx}px`
                                    : '50%',
                                top: `${off.dy}px`,
                                transform: off.side === 'right' || off.side === 'left'
                                  ? 'translate(0, 0)'
                                  : 'translate(-50%, 0)',
                                padding: isWinner ? '9px 22px' : '7px 18px',
                                borderRadius: 14,
                                background: 'rgba(0,0,0,0.88)',
                                border: `2px solid ${tColor}`,
                                color: '#fff', fontWeight: 900,
                                fontSize: isWinner ? 'clamp(32px, 3.4vw, 46px)' : 'clamp(24px, 2.6vw, 34px)',
                                whiteSpace: 'nowrap',
                                boxShadow: `0 4px 12px rgba(0,0,0,0.6)`,
                                zIndex: 1,
                              }}>
                                {fmt(p.num)}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Schätzchen: schlanker Gewinner-Chip unter dem Zeitstrahl (kein redundantes Riesen-Panel,
              Avatare/Werte sind am Strahl bereits sichtbar).
              Bei Distanz-Gleichstand entscheidet die Reaktionszeit — dann zeigt der Chip
              zusätzlich „und am schnellsten!". */}
          {revealed && q.category === 'SCHAETZCHEN' && s.answers.length > 0 && (() => {
            const ranked = s.answers
              .map(a => {
                const num = Number(a.text.replace(/[^0-9.,\-]/g, '').replace(',', '.'));
                const team = s.teams.find(t => t.id === a.teamId);
                const distance = Number.isNaN(num) || q.targetValue == null ? Infinity : Math.abs(num - q.targetValue);
                return { ...a, num, distance, team };
              })
              // Primär Distanz, sekundär Speed — so gewinnt bei gleichem Abstand der schnellste.
              .sort((a, b) => (a.distance - b.distance) || (a.submittedAt - b.submittedAt));
            const w = ranked[0];
            if (!w || w.distance === Infinity || !w.team) return null;
            const tColor = w.team.color;
            // Gleichstand auf der Distanz → Speed war der Tiebreaker.
            const distanceTied = ranked.filter(r => r.distance === w.distance).length > 1;
            return (
              <div style={{
                display: 'flex', justifyContent: 'center', width: '100%',
                animation: 'revealWinnerIn 0.55s cubic-bezier(0.34,1.4,0.64,1) 0.9s both',
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 18,
                  padding: '14px 30px', borderRadius: 999,
                  background: `linear-gradient(135deg, ${tColor}2a, ${tColor}0a)`,
                  border: `2px solid ${tColor}66`,
                  boxShadow: `0 0 32px ${tColor}44`,
                }}>
                  <span style={{ fontSize: 'clamp(26px, 2.8vw, 36px)', lineHeight: 1 }}><QQEmojiIcon emoji="🏆"/></span>
                  <QQTeamAvatar avatarId={w.team.avatarId} size={'clamp(28px, 3vw, 40px)'} style={{ flexShrink: 0 }} />
                  <span style={{
                    fontWeight: 900, fontSize: 'clamp(22px, 2.4vw, 32px)', color: tColor, lineHeight: 1.1,
                  }}>{w.team.name}</span>
                  <span style={{
                    color: '#cbd5e1', fontSize: 'clamp(19px, 2.1vw, 28px)', fontWeight: 700, lineHeight: 1.1,
                  }}>
                    {distanceTied
                      ? (lang === 'en' ? 'was closest — and fastest! ⚡' : 'war am nächsten dran — und am schnellsten! ⚡')
                      : (lang === 'en' ? 'was closest!' : 'war am nächsten dran!')}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Correct team — winner banner (non-Schätzchen).
              POP-Transition: max-height 0 → voll beim showUnifiedWinner,
              statt Platz dauerhaft zu reservieren. Gilt für MUCHO / ZvZ.
              HotPotato-Co-Winner: bei vielen Teams (6+) kann die Card 2-3 Zeilen
              hoch werden — 360 war zu knapp. 560 clipt praktisch nie. */}
          {revealed && s.correctTeamId && q.category !== 'SCHAETZCHEN' && (
            <div style={{
              width: '100%', maxWidth: 1400,
              maxHeight: showUnifiedWinner ? 560 : 0,
              overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: showUnifiedWinner ? 12 : 0,
              transition: 'max-height 0.55s cubic-bezier(0.34,1.56,0.64,1), margin-bottom 0.4s ease',
            }}>
              {showUnifiedWinner && (() => {
            const isEn = lang === 'en';
            const bannerDelay = 0.7;
            const avatarDelay = 1.1;

            // ZEHN_VON_ZEHN: Tie-Info ermitteln, damit Text stimmt, wenn mehrere Teams
            // die gleiche Höchstpunktzahl auf die richtige Antwort gesetzt haben
            // (Reihenfolge per Schnelligkeit). Bei echtem Zeit-Gleichstand → alle als Co-Sieger.
            let allInTie: {
              maxPointsTied: boolean;  // mehrere Teams mit Höchstpunkten
              speedTied: string[];     // Team-IDs mit max Punkten UND schnellstem Submit
              winnerPts: number;
            } | null = null;
            if (cat === 'ZEHN_VON_ZEHN' && q.correctOptionIndex != null && q.options) {
              const correctIdx = q.correctOptionIndex;
              const onCorrect = s.answers
                .map(a => {
                  const parts = a.text.split(',').map(n => parseInt(n.trim(), 10));
                  const pts = parts[correctIdx] ?? 0;
                  return { teamId: a.teamId, pts, submittedAt: a.submittedAt };
                })
                .filter(x => x.pts > 0);
              if (onCorrect.length > 0) {
                const maxPts = Math.max(...onCorrect.map(x => x.pts));
                const atMax = onCorrect.filter(x => x.pts === maxPts);
                const minT  = Math.min(...atMax.map(x => x.submittedAt));
                const atMaxAndFastest = atMax.filter(x => x.submittedAt === minT);
                allInTie = {
                  maxPointsTied: atMax.length > 1,
                  speedTied: atMaxAndFastest.map(x => x.teamId),
                  winnerPts: maxPts,
                };
              }
            }

            const coWinners = allInTie && allInTie.speedTied.length > 1
              ? s.teams.filter(t => allInTie!.speedTied.includes(t.id))
              : null;

            // Single-team Banner (Default-Fall)
            const team = s.teams.find(t => t.id === s.correctTeamId);
            if (!coWinners && !team) return null;

            const muchoSpeedWin = cat === 'MUCHO' && q.correctOptionIndex != null
              && s.answers.filter(a => a.text === String(q.correctOptionIndex)).length > 1;
            const allInTied = allInTie?.maxPointsTied ?? false;

            // CHEESE: Wenn mehrere Teams richtig geraten haben, ist „am schnellsten"
            // die entscheidende Info. Match-Logik spiegelt evalCheese im Backend.
            const cheeseCorrectCount = cat === 'CHEESE'
              ? (() => {
                  const correctList = [q.answer, q.answerEn]
                    .map(x => (x ?? '').trim().toLowerCase())
                    .filter(Boolean);
                  if (correctList.length === 0) return 0;
                  return s.answers.filter(a => {
                    const sub = a.text.trim().toLowerCase();
                    if (sub.length < 2) return false;
                    return correctList.some(c =>
                      sub === c || sub.includes(c) || (c.length > 3 && c.includes(sub) && sub.length >= 3)
                    );
                  }).length;
                })()
              : 0;
            const cheeseSpeedWin = cat === 'CHEESE' && cheeseCorrectCount > 1;

            const winMsg = cat === 'CHEESE'
              ? (cheeseSpeedWin
                  ? (isEn ? 'recognized it fastest!' : 'hat es am schnellsten erkannt!')
                  : (isEn ? 'got it right!' : 'hat es erkannt!'))
              : cat === 'BUNTE_TUETE'
                ? (isEn ? 'wins the round!' : 'gewinnt die Runde!')
                : cat === 'ZEHN_VON_ZEHN'
                  ? (allInTied
                      ? (isEn ? 'had the most points — and was fastest!' : 'hatte die meisten Punkte — und war am schnellsten!')
                      : (isEn ? 'bet the most points on the correct answer!' : 'hat die meisten Punkte auf die richtige Antwort gesetzt!'))
                  : muchoSpeedWin
                    ? (isEn ? 'fastest & correct!' : 'am schnellsten & richtig!')
                    : (isEn ? 'correct!' : 'richtig!');

            // Hot Potato: bei pool-exhausted (>=2 Ueberlebende) haben alle
            // Ueberlebenden gewonnen und ein Feld bekommen. Zeige sie alle an,
            // sonst wirkt die Folie wie "Harald gewinnt allein".
            let hpCoWinners: typeof s.teams | null = null;
            if (cat === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'hotPotato') {
              const eliminated = new Set((s.hotPotatoEliminated ?? []) as string[]);
              const alive = s.teams.filter(t => !eliminated.has(t.id));
              if (alive.length >= 2) hpCoWinners = alive;
            }
            if (hpCoWinners) {
              const survivorCount = hpCoWinners.length;
              const totalCount = s.teams.length;
              const everyoneSurvived = survivorCount === totalCount;
              const hpMsg = isEn
                ? (everyoneSurvived
                    ? 'all survived — each gets an action!'
                    : `${survivorCount} survived — each gets an action!`)
                : (everyoneSurvived
                    ? 'alle überlebt — jedes Team bekommt eine Aktion!'
                    : `${survivorCount} haben überlebt — jedes Team bekommt eine Aktion!`);
              return (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 'clamp(10px, 1.4vh, 18px)',
                  padding: 'clamp(16px, 2vh, 26px) clamp(22px, 3vw, 42px)',
                  borderRadius: 28,
                  width: '100%', maxWidth: 1400,
                  background: 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,197,94,0.05))',
                  border: '2px solid rgba(34,197,94,0.55)',
                  boxShadow: '0 0 60px rgba(34,197,94,0.25), 0 8px 24px rgba(0,0,0,0.4)',
                  animation: `revealWinnerIn 0.65s cubic-bezier(0.34,1.4,0.64,1) ${bannerDelay}s both`,
                }}>
                  {/* Zeile 1: Kartoffel + alle Team-Chips (wrappt bei vielen Teams) */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 'clamp(12px, 1.5vw, 20px)', flexWrap: 'wrap',
                  }}>
                    <span style={{ fontSize: 'clamp(34px, 4.2vw, 56px)', lineHeight: 1 }}><QQEmojiIcon emoji="🥔"/></span>
                    {hpCoWinners.map((tm, i) => (
                      <div key={tm.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <QQTeamAvatar avatarId={tm.avatarId} size={'clamp(52px, 5.6vw, 78px)'} style={{
                          flexShrink: 0, boxShadow: `0 0 22px ${tm.color}66`,
                          animation: `celebShake 0.6s ease ${avatarDelay + i * 0.1}s both`,
                        }} />
                        <div title={tm.name} style={{
                          fontWeight: 900, fontSize: 'clamp(20px, 2.6vw, 34px)', color: tm.color, lineHeight: 1.1,
                          textShadow: `0 0 24px ${tm.color}44`,
                          maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{truncName(tm.name, 14)}</div>
                      </div>
                    ))}
                  </div>
                  {/* Zeile 2: Message — eigene Zeile, immer zentriert, nie geclippt */}
                  <div style={{
                    color: '#86efac', fontSize: 'clamp(18px, 2.3vw, 30px)', fontWeight: 800, lineHeight: 1.2,
                    textAlign: 'center',
                  }}>
                    {hpMsg}
                  </div>
                </div>
              );
            }

            // Echter Zeit-Gleichstand (gleiche max Punkte + gleiche ms) → mehrere Sieger
            if (coWinners && coWinners.length > 1) {
              const coMsg = isEn
                ? `all tied on points & speed${allInTie ? ` (+${allInTie.winnerPts})` : ''}!`
                : `gleich viele Punkte und gleich schnell${allInTie ? ` (+${allInTie.winnerPts})` : ''}!`;
              return (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22,
                  padding: '22px 38px', borderRadius: 28,
                  width: '100%', maxWidth: 1400, flexWrap: 'wrap',
                  background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.05))',
                  border: '2px solid rgba(251,191,36,0.55)',
                  boxShadow: '0 0 60px rgba(251,191,36,0.25), 0 8px 24px rgba(0,0,0,0.4)',
                  animation: `revealWinnerIn 0.65s cubic-bezier(0.34,1.4,0.64,1) ${bannerDelay}s both`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {coWinners.map((tm, i) => (
                      <div key={tm.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <QQTeamAvatar avatarId={tm.avatarId} size={'clamp(64px, 7vw, 96px)'} style={{
                          flexShrink: 0, boxShadow: `0 0 24px ${tm.color}66`,
                          animation: `celebShake 0.6s ease ${avatarDelay + i * 0.1}s both`,
                        }} />
                        <div style={{
                          fontWeight: 900, fontSize: 'clamp(26px, 3.4vw, 48px)', color: tm.color, lineHeight: 1.1,
                          textShadow: `0 0 24px ${tm.color}44`,
                        }}>{tm.name}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{
                    color: '#fbbf24', fontSize: 'clamp(18px, 2.4vw, 30px)', fontWeight: 800, lineHeight: 1.2,
                  }}>
                    {coMsg}
                  </div>
                </div>
              );
            }

            // Single-winner Banner — Team-Farben-Card (User-Feedback:
            // Gewinner-Card unten in Team-Farbe statt nur am Loesungsfeld oben).
            return (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 'clamp(20px, 2.4vw, 36px)',
                padding: 'clamp(16px, 2vh, 26px) clamp(24px, 3vw, 42px)',
                width: '100%', maxWidth: 1400,
                borderRadius: 28,
                background: `linear-gradient(135deg, ${team!.color}26, ${team!.color}08)`,
                border: `3px solid ${team!.color}88`,
                boxShadow: `0 0 60px ${team!.color}33, 0 8px 24px rgba(0,0,0,0.4)`,
                animation: `revealWinnerIn 0.65s cubic-bezier(0.34,1.4,0.64,1) ${bannerDelay}s both`,
              }}>
                <QQTeamAvatar avatarId={team!.avatarId} size={'clamp(64px, 8vw, 110px)'} style={{
                  flexShrink: 0,
                  boxShadow: `0 0 28px ${team!.color}77`,
                  animation: `celebShake 0.6s ease ${avatarDelay}s both`,
                }} />
                <div style={{ minWidth: 0 }}>
                  <div title={team!.name} style={{
                    fontWeight: 900, fontSize: 'clamp(36px, 5vw, 72px)', color: team!.color, lineHeight: 1.1,
                    textShadow: `0 0 30px ${team!.color}55`,
                    maxWidth: '100%',
                    padding: '0 0.3em',
                    whiteSpace: 'nowrap',
                  }}>
                    {truncName(team!.name, 20)}
                  </div>
                  <div style={{
                    color: '#cbd5e1', fontSize: 'clamp(20px, 2.8vw, 36px)', fontWeight: 800, marginTop: 6, lineHeight: 1.2,
                  }}>
                    {winMsg}
                  </div>
                </div>
              </div>
            );
          })()}
            </div>
          )}

          {/* Confetti overlay on correct answer (delayed to sync with winner) */}
          {revealed && s.correctTeamId && showUnifiedWinner && (
            <div style={{ animation: 'contentReveal 0.01s ease 0.8s both' }}>
              <ConfettiOverlay />
            </div>
          )}

          {/* Nobody got it right banner */}
          {revealed && !s.correctTeamId && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
              padding: '24px 44px', borderRadius: 28, marginBottom: 12,
              width: '100%', maxWidth: 1400,
              background: 'rgba(239,68,68,0.08)',
              border: '2px solid rgba(239,68,68,0.30)',
              boxShadow: '0 0 40px rgba(239,68,68,0.15)',
              animation: 'revealWinnerIn 0.5s cubic-bezier(0.34,1.4,0.64,1) 0.5s both',
            }}>
              <span style={{ fontSize: 'clamp(48px, 6vw, 80px)', lineHeight: 1 }}>
                {s.answers.length === 0 ? '⏱' : <QQEmojiIcon emoji="❌"/>}
              </span>
              <div style={{
                fontSize: 'clamp(24px, 3.5vw, 48px)', fontWeight: 900,
                color: s.answers.length === 0 ? '#94a3b8' : '#f87171',
              }}>
                {s.answers.length === 0
                  ? (lang === 'en' ? 'No answers!' : 'Keine Antworten!')
                  : (lang === 'en' ? 'Nobody got it right!' : 'Keiner hatte Recht!')}
              </div>
            </div>
          )}

          {/* Bottom: team answer progress — Hot Potato has its own indicator below */}
          {!revealed && s.teams.length > 0 && !(q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato') && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              position: 'absolute', bottom: 16, left: 0, right: 0,
            }}>
              {/* Progress text — verschwindet wenn alle dran sind (Avatare mit ✓ zeigen's eh) */}
              {!s.allAnswered && (
                <div style={{
                  fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 800,
                  color: '#64748b',
                }}>
                  {`${s.answers.length}/${s.teams.length} Teams`}
                </div>
              )}
              {/* Avatar row */}
              {(() => {
                const tc = s.teams.length;
                const av = tc > 6 ? 68 : tc > 4 ? 76 : 84;
                const gap = tc > 6 ? 10 : tc > 4 ? 13 : 16;
                return (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap,
                    maxWidth: '100%',
                  }}>
                    {s.teams.map(tm => {
                      const answered = s.answers.some(a => a.teamId === tm.id);
                      return (
                        <div key={tm.id} style={{
                          position: 'relative',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'opacity 0.4s ease, filter 0.4s ease',
                          opacity: answered ? 1 : 0.4,
                          filter: answered ? `drop-shadow(0 0 12px ${tm.color}55)` : 'grayscale(0.5)',
                        }}>
                          <QQTeamAvatar avatarId={tm.avatarId} size={av} />
                          {answered && (
                            <div style={{
                              position: 'absolute', bottom: -4, right: -4,
                              width: 26, height: 26, borderRadius: '50%',
                              background: '#22C55E', border: '2px solid #0D0A06',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 14, fontWeight: 900, color: '#fff',
                              animation: 'bAnswerCheck 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
                            }}>✓</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── HOT POTATO: active team + turn timer + used answers ── */}
          {q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato' && (
            <HotPotatoBeamerView state={s} lang={lang} revealed={revealed} />
          )}
        </div>

        {/* ── Image window panel (window-left / window-right — NOT CHEESE, which uses overlay) ── */}
        {isWindow && (
          <div style={{
            width: '35%', flexShrink: 0, position: 'relative', zIndex: 5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}>
            {/* Ambient blur glow behind image */}
            <img
              src={img.bgRemovedUrl || img.url}
              alt="" aria-hidden
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'contain',
                filter: 'blur(60px) saturate(1.8) brightness(0.5)',
                opacity: 0.5, pointerEvents: 'none',
                transform: 'scale(1.15)',
              }}
            />
            {/* Main image */}
            <img
              src={img.bgRemovedUrl || img.url}
              alt={isCheese ? (q.text || 'Question image') : 'Question image'}
              style={{
                position: 'relative', zIndex: 1,
                maxWidth: '100%', maxHeight: '80vh',
                borderRadius: img.bgRemovedUrl ? 0 : 22,
                objectFit: 'contain',
                boxShadow: img.bgRemovedUrl
                  ? 'none'
                  : `0 12px 48px rgba(0,0,0,0.6), 0 0 32px ${glow}`,
                filter: img.bgRemovedUrl
                  ? `drop-shadow(0 16px 40px rgba(0,0,0,0.7))${imgFilter(img) ? ' ' + imgFilter(img) : ''}`
                  : imgFilter(img),
                animation: imgAnim(img.animation, img.layout, img.animDelay, img.animDuration),
                transform: `translate(${img.offsetX ?? 0}%, ${img.offsetY ?? 0}%) scale(${img.scale ?? 1}) rotate(${img.rotation ?? 0}deg)`,
                opacity: img.opacity ?? 1,
              }}
            />
            {/* Dark vignette frame to blend white-bg images into dark theme */}
            {!img.bgRemovedUrl && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
                borderRadius: 22,
                background: 'radial-gradient(ellipse at center, transparent 55%, rgba(13,10,6,0.7) 100%)',
              }} />
            )}
          </div>
        )}

        {/* No right panel — everything centered in main area */}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLACEMENT VIEW
// ═══════════════════════════════════════════════════════════════════════════════

export function PlacementView({ state: s, flashCell, use3D = false, enable3DTransition = false }: {
  state: QQStateUpdate;
  flashCell?: { row: number; col: number; teamId: string; wasSteal?: boolean } | null;
  use3D?: boolean;
  enable3DTransition?: boolean;
}) {
  const lang = useLangFlip(s.language);

  // Sticky Placer: Nachdem ein Team gesetzt hat, bleibt der Highlight noch
  // ~1.2s auf diesem Team (sonst springt die Markierung schon zum naechsten
  // Team, waehrend die Zell-Fuell-Animation des vorherigen Teams noch laeuft).
  const [stickyPlacer, setStickyPlacer] = useState<string | null>(null);
  const prevPlacedKey = useRef<string | null>(null);
  useEffect(() => {
    const lp = s.lastPlacedCell;
    const key = lp ? `${lp.row}-${lp.col}-${lp.teamId}` : null;
    if (!key) return;
    if (key === prevPlacedKey.current) return;
    prevPlacedKey.current = key;
    setStickyPlacer(lp!.teamId);
    const t = setTimeout(() => setStickyPlacer(cur => (cur === lp!.teamId ? null : cur)), 1200);
    return () => clearTimeout(t);
  }, [s.lastPlacedCell?.row, s.lastPlacedCell?.col, s.lastPlacedCell?.teamId]);

  // Aufloesungsreihenfolge: Flash > Sticky Placer > pendingFor.
  // Comeback-Steal-Pause: pendingFor ist null, also Fallback auf comebackTeamId,
  // damit das aktive Team in der ScoreBar markiert bleibt waehrend wir auf
  // Moderator-Space warten.
  const isComebackStealActive =
    !!s.comebackHL && s.comebackHL.phase === 'steal' && !!s.comebackTeamId;
  const activeTeamId = flashCell?.teamId
    ?? stickyPlacer
    ?? s.pendingFor
    ?? (isComebackStealActive ? s.comebackTeamId : null);
  const team = s.teams.find(tm => tm.id === activeTeamId);
  const teamColor = team?.color ?? '#94a3b8';

  // ── 3D transition state machine ──
  // 'flat' = show 2D grid
  // 'transitioning' = 2D→3D camera animation in progress
  // '3d' = fully in 3D mode
  const [viewMode, setViewMode] = useState<'flat' | 'transitioning' | '3d'>(() => {
    // If use3D (instant toggle) is on, start in 3D directly
    if (use3D) return '3d';
    return 'flat';
  });
  const hasTransitioned = useRef(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When the beamer instant toggle changes, update immediately
  useEffect(() => {
    if (use3D) {
      setViewMode('3d');
      hasTransitioned.current = true;
    } else {
      setViewMode('flat');
      hasTransitioned.current = false;
    }
  }, [use3D]);

  // Track lastPlacedCell changes — only trigger on NEW placements, not stale values from mount
  const cellTrigger = flashCell || s.lastPlacedCell;
  const cellKey = cellTrigger ? `${cellTrigger.row}-${cellTrigger.col}-${cellTrigger.teamId}` : null;
  const prevCellKey = useRef<string | null>(cellKey); // capture initial value to skip on mount

  useEffect(() => {
    // Skip if nothing changed (including initial mount with stale lastPlacedCell)
    if (cellKey === prevCellKey.current) return;
    prevCellKey.current = cellKey;

    if (!enable3DTransition || use3D || hasTransitioned.current || !cellTrigger) return;
    // First cell placed this round → start 2D→3D transition
    hasTransitioned.current = true;
    setViewMode('transitioning');
    // After transition animation completes (~1.2s), switch to full 3D
    transitionTimer.current = setTimeout(() => {
      setViewMode('3d');
    }, 1200);
    return () => { if (transitionTimer.current) clearTimeout(transitionTimer.current); };
  }, [cellKey, enable3DTransition, use3D]);

  // Reset transition state when entering a fresh placement round (questionIndex changes)
  const prevQIdx = useRef(s.questionIndex);
  useEffect(() => {
    if (prevQIdx.current !== s.questionIndex) {
      prevQIdx.current = s.questionIndex;
      hasTransitioned.current = false;
      if (!use3D) setViewMode('flat');
    }
  }, [s.questionIndex, use3D]);

  const show3D = viewMode === '3d' || viewMode === 'transitioning';
  // 2-spaltiges Layout: Grid links darf nicht zu groß werden, sonst bleibt rechts
  // kein Platz für die Team-Liste bei 8 Teams.
  const gridMaxSize = typeof window !== 'undefined'
    ? Math.min(720, window.innerHeight * 0.72, window.innerWidth * 0.48)
    : 600;

  // Manual flyover hotkey (F): trigger a cinematic orbit over the grid
  const [flyoverSignal, setFlyoverSignal] = useState(0);
  useEffect(() => {
    if (viewMode !== '3d') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        // Avoid triggering if user is typing in an input
        const tgt = e.target as HTMLElement | null;
        if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
        setFlyoverSignal(v => v + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewMode]);

  // G2 Entry-Sweep beim Mount einer neuen Question-Placement-Phase.
  // Ein heller Streifen laeuft einmalig von links nach rechts uebers Grid.
  // Key bindet an questionIndex, damit React beim Phase-Re-Mount die
  // Animation neu triggert.
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <Fireflies color={`${teamColor}77`} />

      {/* G2 Placement-Sweep — weicher Licht-Streak nach Phase-Entry. */}
      <div key={`sweep-${s.questionIndex}`} aria-hidden style={{
        position: 'absolute', top: 12, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none', zIndex: 4, overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          width: '40%',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 45%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0.18) 55%, transparent 100%)',
          animation: 'placementSweep 1.1s cubic-bezier(0.4,0,0.2,1) 0.15s both',
        }} />
      </div>

      {/* Top banner — schrumpft auf 0 wenn Team aktiv. Das aktive Team wird
          stattdessen rechts in der ScoreBar prominent markiert (inkl. Aktions-Pill).
          Feste 12px Abstand bleibt damit das Grid nicht an den Viewport-Rand rutscht. */}
      <div style={{
        height: 12, flexShrink: 0,
        position: 'relative', zIndex: 5,
      }} />

      {/* Center: 2-spaltig — Grid links, ScoreBar rechts (Platz für 8 Teams ohne Scroll).
          Beide Spalten bekommen height = gridMaxSize (fix quadratisches Grid) damit
          die Team-Liste exakt so hoch ist wie das Grid — nicht länger. */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        padding: '12px 36px', position: 'relative', zIndex: 5, gap: 32,
        minHeight: 0,
      }}>
        <div style={{
          width: gridMaxSize, height: gridMaxSize,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {show3D ? (
            <QQ3DGrid
              state={s}
              maxSize={gridMaxSize}
              animateCell={cellTrigger ? { row: cellTrigger.row, col: cellTrigger.col, teamId: cellTrigger.teamId, wasSteal: cellTrigger.wasSteal } : null}
              interactive={viewMode === '3d'}
              entering={viewMode === 'transitioning'}
              flyoverSignal={flyoverSignal}
            />
          ) : (
            <GridDisplay state={s} maxSize={gridMaxSize} highlightTeam={activeTeamId} showJoker={true} flashCellKey={flashCell ? `${flashCell.row}-${flashCell.col}` : null} />
          )}
        </div>
        <div style={{
          // Fixe Breite statt flex:1 + maxWidth — sonst verschiebt sich der Grid-
          // Container, sobald ein Team-Name die intrinsische Spaltenbreite ändert.
          // Höhe = gridMaxSize sorgt dafür dass die Liste exakt Grid-Höhe hat.
          width: 540, height: gridMaxSize, flexShrink: 0,
          display: 'flex', alignItems: 'stretch', justifyContent: 'flex-start',
        }}>
          <ScoreBar
            teams={s.teams}
            activeTeamId={activeTeamId}
            teamPhaseStats={s.teamPhaseStats}
            correctTeamId={s.correctTeamId}
            activeActionLabel={(() => {
              if (!team) return undefined;
              // Comeback-Klau-Phase: nur knappes Label „Klauen" — keine
              // „Weiter mit Space"-/„Mehr-oder-Weniger"-Inline-Texte mehr,
              // die hatten den Beamer-Header zu voll gemacht.
              if (s.comebackHL && s.comebackHL.phase === 'steal' && s.comebackHL.currentStealer === team.id) {
                return lang === 'en' ? '⚡ Steal' : '⚡ Klauen';
              }
              return actionVerb(s.pendingAction, lang);
            })()}
            activeActionDesc={undefined /* User-Feedback: lange Beschreibung
              ('Wähle 2 freie Felder') war in der Team-Liste neben dem Grid zu
              klein zum Lesen. Verb-Label oben („📍 Setzen") reicht — die exakte
              Aktion sieht das Team auf seinem /team-Device. */}
          />
        </div>
      </div>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SlotMachineNumber — Slot-Machine-Roll-Animation für H/L-Reveal.
// Pro Digit rollt ein Roller mit Random-Ziffern (~70ms/frame). Stoppt
// staggered von links nach rechts auf der Zielziffer mit kurzem Bounce-Pulse.
// Trennzeichen (.,/) bleiben statisch. Total ~1.4-1.8s je nach Stellenzahl.
// ═══════════════════════════════════════════════════════════════════════════════
function SlotMachineNumber({ value, fontSize, color, glow, isYear }: {
  value: number;
  fontSize: string;
  color: string;
  glow?: string;
  isYear?: boolean;
}) {
  // Jahreszahlen ohne Tausendertrennzeichen (z.B. „1900"), sonst „1.500.000".
  const targetStr = isYear ? String(Math.round(value)) : value.toLocaleString('de-DE');
  const chars = useMemo(() => targetStr.split(''), [targetStr]);
  const digitPositions = useMemo(() => chars.map((c, i) => /\d/.test(c) ? i : -1).filter(i => i >= 0), [chars]);

  // Globale Tick-Counter für die Roller — alle Digits rollen synchron, aber
  // jeder Digit "stoppt" nacheinander bei einem bestimmten Tick-Threshold.
  const [tick, setTick] = useState(0);
  // Wieviele Digits sind schon "gelandet" (von links).
  const [landed, setLanded] = useState(0);
  const totalDigits = digitPositions.length;

  useEffect(() => {
    // Roller-Frequenz: 70ms pro Tick → flackernde Random-Ziffer
    const rollId = setInterval(() => setTick(t => t + 1), 70);
    return () => clearInterval(rollId);
  }, []);

  useEffect(() => {
    // Staggered Stop: erster Digit landet nach 800ms, dann jeder weitere nach +280ms.
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < totalDigits; i++) {
      timeouts.push(setTimeout(() => setLanded(i + 1), 800 + i * 280));
    }
    return () => { timeouts.forEach(clearTimeout); };
  }, [totalDigits]);

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'baseline', gap: 0,
      fontVariantNumeric: 'tabular-nums', lineHeight: 1,
    }}>
      {chars.map((char, idx) => {
        const isDigit = /\d/.test(char);
        if (!isDigit) {
          // Trennzeichen statisch
          return (
            <span key={idx} style={{
              fontSize, fontWeight: 900, color, textShadow: glow ? `0 0 28px ${glow}` : undefined,
            }}>{char}</span>
          );
        }
        const digitOrderIdx = digitPositions.indexOf(idx);
        const stopped = digitOrderIdx < landed;
        const display = stopped ? char : String((tick + idx * 7) % 10);
        return (
          <span
            key={`${idx}-${stopped ? 'l' : 'r'}`}
            style={{
              fontSize, fontWeight: 900, color, textShadow: glow ? `0 0 28px ${glow}` : undefined,
              display: 'inline-block',
              animation: stopped ? 'slotMachineStop 0.36s cubic-bezier(0.34,1.56,0.64,1) both' : undefined,
            }}
          >{display}</span>
        );
      })}
      <style>{`
        @keyframes slotMachineStop {
          0%   { transform: translateY(-30%) scale(0.85); opacity: 0.4; filter: blur(2px); }
          55%  { transform: translateY(6%)  scale(1.18); opacity: 1;   filter: blur(0); }
          100% { transform: translateY(0)   scale(1);    opacity: 1;   filter: blur(0); }
        }
      `}</style>
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMEBACK VIEW
// ═══════════════════════════════════════════════════════════════════════════════

export function ComebackView({ state: s }: { state: QQStateUpdate }) {
  const lang = useLangFlip(s.language);
  const cardBg = s.theme?.cardBg ?? COZY_CARD_BG;
  const hl = s.comebackHL;
  // H/L: alle tied-letzten Teams. Ohne H/L: Fallback auf altes 1-Team-Verhalten.
  const hlTeams = hl ? hl.teamIds.map(id => s.teams.find(tm => tm.id === id)).filter(Boolean) as typeof s.teams : [];
  const team = s.teams.find(tm => tm.id === s.comebackTeamId);
  const teamColor = team?.color ?? '#F59E0B';
  const step = s.comebackIntroStep ?? 0;
  const targets = s.comebackStealTargets ?? [];
  const leaderTeams = targets.map(id => s.teams.find(tm => tm.id === id)).filter(Boolean) as typeof s.teams;
  const showTeam = step >= 1;
  // Step 1+2 zusammengelegt: bei step >= 1 zeigen wir Team UND Action zusammen.
  const showAction = step >= 1;

  const actionTextDe = hl
    ? `„Mehr oder Weniger" — pro richtige Antwort klaut ihr 1 Feld vom aktuellen 1. Platz.`
    : (leaderTeams.length === 1
        ? `Klaut 2 Felder von ${leaderTeams[0]?.name ?? 'dem Führenden'}.`
        : `Klaut je 1 Feld von jedem der ${leaderTeams.length} Führenden.`);
  const actionTextEn = hl
    ? `"More or Less" — each correct answer steals 1 cell from the current leader.`
    : (leaderTeams.length === 1
        ? `Steals 2 cells from ${leaderTeams[0]?.name ?? 'the leader'}.`
        : `Steals 1 cell from each of the ${leaderTeams.length} leaders.`);

  // Nummer kompakt formatieren: 3800000 → 3,8M | 15000 → 15k | 300 → 300
  // Bei Jahreszahlen kein Tausendertrennzeichen (1900 statt 1.900).
  const isYearUnitHL = /jahr|year/i.test(hl?.currentPair?.unit ?? '');
  const fmtHL = (n: number) => {
    if (isYearUnitHL) return String(Math.round(n));
    const abs = Math.abs(n);
    if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + ' Mrd.';
    if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' Mio.';
    if (abs >= 10_000) return Math.round(n / 1000) + 'k';
    if (abs >= 1000) return n.toLocaleString(lang === 'en' ? 'en-US' : 'de-DE');
    return n % 1 === 0 ? String(n) : n.toFixed(1);
  };

  // ── H/L UNIFIED Frage- und Reveal-Ansicht ──────────────────────────────
  // Question und Reveal teilen sich exakt dieselbe Composition. Beim Wechsel
  // wird KEINE neue Folie eingeblendet — nur die Subject-Wert-Stelle (??? →
  // Slot-Machine-Roll), der Direction-Indikator (? → MEHR ↑ / WENIGER ↓) und
  // die Avatar-Status-Layer (Tipp-Status → richtig/falsch + Winnings) wechseln
  // smooth in-place.
  if (hl && (hl.phase === 'question' || hl.phase === 'reveal') && hl.currentPair) {
    const pair = hl.currentPair;
    const isReveal = hl.phase === 'reveal';
    const correctChoice = pair.subjectValue > pair.anchorValue ? 'higher' : 'lower';
    const correctText = correctChoice === 'higher'
      ? (lang === 'en' ? 'HIGHER ↑' : 'MEHR ↑')
      : (lang === 'en' ? 'LOWER ↓' : 'WENIGER ↓');
    const correctIds = new Set(hl.correctThisRound);
    // Frage-Text: bei Format-B customQuestion direkt, bei Format-A auto-generieren
    // („Hat München mehr oder weniger Einwohner als Berlin?"). Macht den Quiz-Show-
    // Moment deutlich starker als nur zwei Cards mit Zahlen.
    const questionText = pair.customQuestion
      ? pair.customQuestion
      : (lang === 'en'
          ? `Does ${pair.subjectLabel} have more or less ${pair.unit} than ${pair.anchorLabel}?`
          : `Hat ${pair.subjectLabel} mehr oder weniger ${pair.unit} als ${pair.anchorLabel}?`);
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(16px, 2.4vh, 36px) clamp(28px, 3.5vw, 56px)',
        gap: 'clamp(12px, 1.6vh, 22px)',
        position: 'relative', overflow: 'hidden',
        minHeight: 0,
      }}>
        <Fireflies color="#FBBF2455" />
        {/* Header: Game-Name + Runden-Indikator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'clamp(14px, 1.8vw, 24px)', flexWrap: 'wrap',
          justifyContent: 'center',
          animation: 'contentReveal 0.35s ease both',
        }}>
          <div style={{
            padding: '10px 22px', borderRadius: 999,
            background: isReveal ? 'rgba(34,197,94,0.18)' : 'rgba(251,191,36,0.14)',
            border: isReveal ? '2px solid rgba(34,197,94,0.5)' : '2px solid rgba(251,191,36,0.45)',
            color: isReveal ? '#86efac' : '#FDE68A',
            fontWeight: 900,
            fontSize: 'clamp(16px, 1.8vw, 24px)', letterSpacing: '0.08em', textTransform: 'uppercase',
            transition: 'background 0.4s ease, border-color 0.4s ease, color 0.4s ease',
          }}>
            <QQEmojiIcon emoji={isReveal ? '✅' : '⚡'}/> {isReveal
              ? (lang === 'en' ? 'Reveal' : 'Auflösung')
              : (lang === 'en' ? 'More or Less' : 'Mehr oder Weniger')}
          </div>
          <div style={{
            padding: '10px 20px', borderRadius: 14,
            background: 'rgba(15,23,42,0.6)', border: '1.5px solid rgba(255,255,255,0.1)',
            color: '#e2e8f0', fontWeight: 800, fontSize: 'clamp(15px, 1.6vw, 22px)',
          }}>
            {lang === 'en' ? 'Round' : 'Runde'} {hl.round + 1} {lang === 'en' ? 'of' : 'von'} {hl.rounds}
          </div>
        </div>

        {/* Frage-Text — Format-B custom, Format-A auto-generiert.
            User-Wunsch 2026-04-28: Beim Rundenwechsel soll NUR der Frage-Text
            sich austauschen, nicht die ganze Card neu animieren ('keine neue
            Folie'). Inner-key auf hl.round → smoother Cross-Fade nur des
            Texts. Reservierte minHeight verhindert Card-Hop bei kürzeren
            Fragen. */}
        <div style={{
          minHeight: 'clamp(58px, 7vh, 96px)',
          maxWidth: 1200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div
            key={`hlq-${hl.round}`}
            style={{
              fontSize: 'clamp(22px, 2.6vw, 38px)', fontWeight: 800, color: '#F1F5F9',
              textAlign: 'center', lineHeight: 1.3,
              animation: 'qqHlQuestionFade 0.6s ease both',
            }}
          >
            {questionText}
          </div>
        </div>

        {/* Anchor + Subject - zwei Karten nebeneinander */}
        <div style={{
          display: 'flex', gap: 'clamp(16px, 2.2vw, 36px)', alignItems: 'stretch',
          justifyContent: 'center', flexWrap: 'wrap', maxWidth: 1400, width: '100%',
          animation: 'contentReveal 0.45s ease 0.15s both',
        }}>
          {/* Anchor-Card: bekannter Wert */}
          <div style={{
            flex: '1 1 0', maxWidth: 560, minWidth: 260,
            padding: 'clamp(22px, 3vh, 36px) clamp(22px, 3vw, 40px)', borderRadius: 26,
            background: 'linear-gradient(135deg, rgba(34,197,94,0.14), rgba(34,197,94,0.04))',
            border: '2px solid rgba(34,197,94,0.42)',
            boxShadow: '0 0 40px rgba(34,197,94,0.18), 0 8px 28px rgba(0,0,0,0.4)',
            textAlign: 'center',
            display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center',
          }}>
            <div style={{
              fontSize: 'clamp(14px, 1.6vw, 22px)', fontWeight: 900,
              color: '#86efac', letterSpacing: '0.14em', textTransform: 'uppercase',
              opacity: 0.8,
            }}>{pair.anchorLabel}</div>
            <div style={{
              fontSize: 'clamp(44px, 6vw, 92px)', fontWeight: 900, color: '#86efac',
              fontVariantNumeric: 'tabular-nums', lineHeight: 1,
              textShadow: '0 0 28px rgba(34,197,94,0.35)',
            }}>{fmtHL(pair.anchorValue)}</div>
            <div style={{
              fontSize: 'clamp(14px, 1.4vw, 20px)', fontWeight: 700, color: '#cbd5e1', opacity: 0.7,
            }}>{pair.unit}</div>
          </div>

          {/* Vergleichs-Icon — bei Reveal smooth swap zu MEHR↑/WENIGER↓.
              minWidth fest damit „?" → „MEHR ↑" KEIN Layout-Shift verursacht
              (sonst rutschen Anchor- und Subject-Card seitlich, was wie eine
              komplette Page-Transition wirkt). */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, color: '#FBBF24',
            textShadow: '0 0 20px rgba(251,191,36,0.5)',
            letterSpacing: '0.08em',
            // Feste Box damit Question→Reveal kein Wackeln verursacht (Cards
            // links/rechts blieben sonst trotz minWidth durch Höhen-Reflow
            // versetzt).
            minWidth: 'clamp(140px, 14vw, 200px)',
            height: 'clamp(80px, 9vw, 130px)',
            // Font-Size konstant: Reveal-Text ist länger (MEHR ↑ vs ?) — wenn
            // wir font-size shrinken sieht es zwar passend aus, schiebt aber
            // visuell. Stattdessen feste mittlere Größe für beide States.
            fontSize: 'clamp(34px, 4.2vw, 60px)',
          }}>
            <span
              key={isReveal ? 'reveal' : 'q'}
              style={{
                // Sanfter Cross-Fade ohne Scale — vorher revealAnswerBam mit
                // scale 0.8→1.04→1 bouncte den Text. User-Wunsch 2026-04-28:
                // 'nur die Zahl wechselt sich, kein Wackeln drumherum'.
                animation: isReveal ? 'comebackHLFadeIn 0.5s ease 0.25s both' : undefined,
                display: 'inline-block',
              }}
            >
              {isReveal ? correctText : '?'}
            </span>
          </div>

          {/* Subject-Card: 100 % statisches Layout — Border, Background,
              Glow ALLES KONSTANT zwischen Question und Reveal. Nur die
              ??? → Zahl-Stelle innen wechselt via Cross-Fade. User-Wunsch
              2026-04-28: 'Cards sollen sich nicht verändern, richte gleich
              so aus dass es passt'. */}
          <div style={{
            flex: '1 1 0', maxWidth: 560, minWidth: 260,
            padding: 'clamp(22px, 3vh, 36px) clamp(22px, 3vw, 40px)', borderRadius: 26,
            background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(251,191,36,0.05))',
            border: '3px solid rgba(251,191,36,0.7)',
            boxShadow: '0 0 44px rgba(251,191,36,0.28), 0 8px 28px rgba(0,0,0,0.4)',
            textAlign: 'center',
            display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center',
          }}>
            <div style={{
              fontSize: 'clamp(14px, 1.6vw, 22px)', fontWeight: 900,
              color: '#FDE68A', letterSpacing: '0.14em', textTransform: 'uppercase',
              opacity: 0.9,
            }}>{pair.subjectLabel}</div>
            <div style={{
              lineHeight: 1, height: 'clamp(44px, 6vw, 92px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              {/* Unsichtbarer Platzhalter mit dem ECHTEN Wert reserviert die
                  Breite schon in der Frage-Phase. Sonst springt die Card beim
                  Reveal von „???" (~3em) auf z.B. „1.500.000" (~12em) →
                  ganzes Grid reflowt → wirkt wie eine neue Folie. */}
              <span aria-hidden style={{
                fontSize: 'clamp(44px, 6vw, 92px)', fontWeight: 900,
                fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                visibility: 'hidden', whiteSpace: 'nowrap',
              }}>{fmtHL(pair.subjectValue)}</span>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {/* Beide Spans übereinander gerendert; opacity flippt smooth.
                    Slot-Machine-Drop entfernt — User-Wunsch: 'nur die Zahl
                    wechselt, kein Wackeln'. */}
                <span style={{
                  position: 'absolute',
                  fontSize: 'clamp(44px, 6vw, 92px)', fontWeight: 900, color: '#FBBF24',
                  fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                  textShadow: '0 0 28px rgba(251,191,36,0.45)',
                  opacity: isReveal ? 0 : 1,
                  transition: 'opacity 0.5s ease',
                  animation: isReveal ? undefined : 'timerVignettePulse 1.2s ease-in-out infinite',
                }}>???</span>
                <span style={{
                  position: 'absolute',
                  fontSize: 'clamp(44px, 6vw, 92px)', fontWeight: 900, color: '#FBBF24',
                  fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                  textShadow: '0 0 32px rgba(251,191,36,0.55)',
                  opacity: isReveal ? 1 : 0,
                  transition: 'opacity 0.5s ease 0.15s',
                  whiteSpace: 'nowrap',
                }}>{fmtHL(pair.subjectValue)}</span>
              </div>
            </div>
            <div style={{
              fontSize: 'clamp(14px, 1.4vw, 20px)', fontWeight: 700, color: '#cbd5e1', opacity: 0.7,
            }}>{pair.unit}</div>
          </div>
        </div>

        {/* Team-Progress: gleiche Avatare-Reihe in beiden Phasen.
            Nur das Status-Badge (✓ answered → ✓ correct / ✕ wrong) und
            die optionale Winnings-Pill ergaenzen sich beim Reveal. */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          animation: 'contentReveal 0.5s ease 0.25s both',
        }}>
          <div style={{
            fontSize: 'clamp(15px, 1.6vw, 22px)', fontWeight: 800,
            color: isReveal ? '#cbd5e1' : '#94a3b8',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            transition: 'color 0.4s ease',
          }}>
            {isReveal
              ? (lang === 'en' ? 'Who got it right?' : 'Wer lag richtig?')
              : (lang === 'en' ? 'Last teams vote on their phone' : 'Letzte Teams tippen am Handy')}
          </div>
          <div style={{ display: 'flex', gap: 'clamp(14px, 1.8vw, 24px)', flexWrap: 'wrap', justifyContent: 'center' }}>
            {hlTeams.map(tm => {
              const answered = hl.answeredThisRound.includes(tm.id);
              const correct = correctIds.has(tm.id);
              const teamWin = hl.winnings[tm.id] ?? 0;
              // Im Reveal: dim if wrong; Glow if correct.
              const dim = isReveal && !correct;
              return (
                <div key={tm.id} style={{
                  position: 'relative',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  opacity: dim ? 0.55 : (answered || isReveal ? 1 : 0.55),
                  filter: dim
                    ? 'grayscale(0.4)'
                    : (answered || isReveal ? `drop-shadow(0 0 14px ${tm.color}88)` : 'grayscale(0.4)'),
                  transition: 'opacity 0.4s ease, filter 0.4s ease',
                }}>
                  <QQTeamAvatar avatarId={tm.avatarId} size={'clamp(70px, 7.5vw, 110px)'} style={{
                    boxShadow: (correct || (answered && !isReveal))
                      ? `0 0 22px ${tm.color}88`
                      : '0 0 14px rgba(148,163,184,0.18)',
                    transition: 'box-shadow 0.4s ease',
                  }} />
                  {/* Status-Badge: in question = ✓ answered, in reveal = ✓/✕ */}
                  {(isReveal ? true : answered) && (
                    <div style={{
                      position: 'absolute', bottom: -6, right: -6,
                      width: 32, height: 32, borderRadius: '50%',
                      background: isReveal ? (correct ? '#22C55E' : '#EF4444') : '#22C55E',
                      border: '2.5px solid #0D0A06',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 900, color: '#fff',
                      animation: isReveal
                        ? 'revealCorrectPop 0.5s cubic-bezier(0.34,1.4,0.64,1) 0.5s both'
                        : 'bAnswerCheck 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
                    }}>{isReveal ? (correct ? '✓' : '✕') : '✓'}</div>
                  )}
                  <div style={{
                    fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 900, color: tm.color,
                    maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{truncName(tm.name, 10)}</div>
                  {/* Winnings-Slot mit RESERVIERTER Höhe — gleich groß in question und
                      reveal, damit das Avatar-Grid nicht um die Pill-Höhe nach unten
                      wächst und die Anchor/Subject-Cards re-zentriert werden. */}
                  <div style={{
                    minHeight: 'clamp(22px, 2.6vw, 30px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isReveal && teamWin > 0 && (
                      <div style={{
                        padding: '3px 10px', borderRadius: 999,
                        background: 'rgba(251,191,36,0.2)', border: '1.5px solid rgba(251,191,36,0.55)',
                        fontSize: 'clamp(12px, 1.3vw, 16px)', fontWeight: 900, color: '#FDE68A',
                        fontVariantNumeric: 'tabular-nums',
                        animation: 'revealCorrectPop 0.5s cubic-bezier(0.34,1.4,0.64,1) 0.7s both',
                      }}>
                        <QQEmojiIcon emoji="⚡"/> {teamWin} {teamWin === 1
                          ? (lang === 'en' ? 'cell' : 'Feld')
                          : (lang === 'en' ? 'cells' : 'Felder')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timer-Pill unten rechts — nur in question phase */}
        {!isReveal && hl.timerEndsAt != null && (
          <div style={{
            position: 'absolute', bottom: 32, right: 48, zIndex: 8,
          }}>
            <BeamerTimer endsAt={hl.timerEndsAt} durationSec={s.comebackHLTimerSec ?? 10} accent="#FBBF24" />
          </div>
        )}
      </div>
    );
  }

  // ── (alter separater Reveal-Block entfernt — jetzt unified mit question) ─

  // B1 BAM-Entry: nur beim initialen Mount + beim Step 0 spielen. Bei spaeteren
  // Steps (1, 2) soll die Folie ruhig bleiben, sonst reissen wir den User raus.
  const bamActive = step === 0;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      padding: 'clamp(20px, 2.6vh, 40px) clamp(32px, 4vw, 64px)',
      gap: 'clamp(12px, 1.8vh, 22px)',
      minHeight: 0,
      animation: bamActive ? 'comebackShake 0.65s ease 0.1s both' : undefined,
    }}>
      <Fireflies color={`${teamColor}55`} />

      {/* B1 Screen-Flash: weisser Puls ueber dem ganzen Screen (0.6s). */}
      {bamActive && (
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(255,247,220,0.95) 0%, rgba(251,191,36,0.55) 45%, transparent 80%)',
          animation: 'comebackFlash 0.6s ease-out both',
          pointerEvents: 'none', zIndex: 20,
        }} />
      )}

      {/* B1 Lightning-Bolts: 6 gelbe Streifen fallen schraeg durchs Bild. */}
      {bamActive && [
        { left: '8%',  rot: -12, size: 64, delay: 0.05 },
        { left: '22%', rot: 8,   size: 44, delay: 0.22 },
        { left: '38%', rot: -6,  size: 52, delay: 0.14 },
        { left: '58%', rot: 10,  size: 48, delay: 0.30 },
        { left: '74%', rot: -14, size: 60, delay: 0.18 },
        { left: '88%', rot: 4,   size: 40, delay: 0.38 },
      ].map((b, i) => (
        <div key={i} aria-hidden style={{
          position: 'absolute', left: b.left, top: 0,
          fontSize: b.size, lineHeight: 1,
          color: '#FDE047',
          filter: `drop-shadow(0 0 14px rgba(253,224,71,0.9)) drop-shadow(0 0 28px rgba(251,191,36,0.6))`,
          ['--bolt-rot' as string]: `${b.rot}deg`,
          animation: `comebackBoltFall 1.1s cubic-bezier(0.4,0,0.6,1) ${b.delay}s both`,
          pointerEvents: 'none', zIndex: 6,
        }}><QQEmojiIcon emoji="⚡"/></div>
      ))}

      <div style={{
        fontSize: bamActive ? 'clamp(68px, 9vw, 128px)' : 'clamp(28px, 3.6vw, 50px)',
        fontWeight: 900,
        color: '#F59E0B', textAlign: 'center',
        textShadow: '0 0 50px rgba(234,179,8,0.55), 0 6px 0 rgba(180,83,9,0.35)',
        letterSpacing: bamActive ? '0.04em' : 'normal',
        animation: bamActive
          ? 'comebackSlam 1s cubic-bezier(0.34,1.56,0.64,1) both'
          : 'roundBam 0.6s cubic-bezier(0.22,1,0.36,1) both',
        transition: 'font-size 0.5s cubic-bezier(0.34,1.4,0.64,1)',
        position: 'relative', zIndex: 7,
      }}>
        <QQEmojiIcon emoji="⚡"/> {lang === 'en' ? 'COMEBACK!' : 'COMEBACK!'}
      </div>
      {/* Sub-Header nur bei Step 0, kleiner (darunter), wenn schon bei Step 1+ */}
      {bamActive && (
        <div style={{
          fontSize: 'clamp(18px, 2.2vw, 32px)', fontWeight: 800,
          color: '#fde68a', textAlign: 'center', letterSpacing: '0.12em',
          textTransform: 'uppercase',
          animation: 'subtitleSlide 0.55s cubic-bezier(0.34,1.4,0.64,1) 0.7s both',
          position: 'relative', zIndex: 7,
        }}>
          {lang === 'en' ? 'Last becomes first' : 'Die Letzten werden die Ersten'}
        </div>
      )}

      {/* Step 0: Was ist Comeback */}
      {step === 0 && (
        <>
          {/* Slogan-Hero — biblisches Bonmot dramatisch über der Erklär-Card.
              (User-Wunsch 2026-04-28: 'comeback text, die letzten werden die
              ersten?'). Layered-Glow + 3D-Drop wie das Kategorie-Intro. */}
          <div key="intro0-slogan" style={{
            fontFamily: 'Nunito, system-ui, sans-serif',
            fontSize: 'clamp(40px, 6vw, 96px)', fontWeight: 900, lineHeight: 1.05,
            color: '#FBBF24',
            textAlign: 'center',
            letterSpacing: '-0.005em',
            textShadow:
              '0 0 14px rgba(251,191,36,0.65), ' +
              '0 0 40px rgba(251,191,36,0.45), ' +
              '0 0 96px rgba(251,191,36,0.25), ' +
              '0 5px 0 rgba(0,0,0,0.45), ' +
              '0 14px 28px rgba(0,0,0,0.55)',
            animation: 'phasePop 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.1s both, qqCatTitleBreathe 4.5s ease-in-out 1.2s infinite',
            position: 'relative', zIndex: 5,
            marginBottom: 8,
          }}>
            {lang === 'en' ? 'The last shall be first.' : 'Die Letzten werden die Ersten sein.'}
          </div>
          <div key="intro0" style={{
            maxWidth: 1100, textAlign: 'center',
            padding: '36px 48px', borderRadius: 28,
            background: 'rgba(251,191,36,0.08)',
            border: '2px solid rgba(251,191,36,0.35)',
            boxShadow: '0 0 60px rgba(251,191,36,0.15), 0 8px 32px rgba(0,0,0,0.4)',
            animation: 'contentReveal 0.5s ease 0.4s both',
            position: 'relative', zIndex: 5,
          }}>
            <div style={{ fontSize: 'clamp(22px, 2.6vw, 34px)', lineHeight: 1.45, color: '#fde68a', fontWeight: 800, marginBottom: 18 }}>
              {lang === 'en'
                ? 'Last place gets a Comeback-Boost.'
                : 'Letzter Platz bekommt einen Comeback-Boost.'}
            </div>
            <div style={{ fontSize: 'clamp(18px, 2vw, 26px)', color: '#fef3c7', opacity: 0.85, lineHeight: 1.5 }}>
              {lang === 'en'
                ? 'Steal cells from the leader.'
                : 'Klauen beim Führenden.'}
            </div>
          </div>
        </>
      )}

      {/* Step 1+: Team hero — bei H/L mit Tied-Last mehrere Teams zeigen,
          sonst Fallback auf Einzel-Team (Legacy-Comeback). */}
      {showTeam && (hl ? hlTeams.length > 0 : !!team) && (
        <div key="team" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          animation: 'contentReveal 0.5s ease both',
          position: 'relative', zIndex: 5,
        }}>
          {hl && hlTeams.length > 1 ? (
            <>
              <div style={{ display: 'flex', gap: 'clamp(18px, 2.4vw, 32px)', flexWrap: 'wrap', justifyContent: 'center' }}>
                {hlTeams.map(tm => (
                  <div key={tm.id} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  }}>
                    {/* Avatar direkt mit Glow — kein Halo-Wrapper, der einen
                        zweiten Ring um den ohnehin gerimten Avatar erzeugt. */}
                    <QQTeamAvatar avatarId={tm.avatarId} size={'clamp(120px, 12vw, 180px)'} style={{
                      boxShadow: `0 0 34px ${tm.color}77, 0 0 80px ${tm.color}33`,
                    }} />
                    <div title={tm.name} style={{
                      fontSize: 'clamp(22px, 2.4vw, 34px)', fontWeight: 900, color: tm.color,
                      textShadow: `0 0 22px ${tm.color}55`,
                      maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{truncName(tm.name, 14)}</div>
                  </div>
                ))}
              </div>
              {step === 1 && (
                <div style={{
                  marginTop: 8, padding: '14px 28px', borderRadius: 18,
                  background: 'rgba(251,191,36,0.12)', border: '2px solid rgba(251,191,36,0.42)',
                  fontSize: 'clamp(20px, 2.2vw, 30px)', fontWeight: 800, color: '#e2e8f0',
                  maxWidth: 1000, textAlign: 'center',
                }}>
                  {lang === 'en'
                    ? `${hlTeams.length} teams tied for last place — they all play together.`
                    : `${hlTeams.length} Teams sind gleichauf auf dem letzten Platz — sie spielen gemeinsam.`}
                </div>
              )}
            </>
          ) : team && (
            <>
              {/* Avatar direkt mit Pulse-Glow — kein Halo-Wrapper. */}
              <QQTeamAvatar avatarId={team.avatarId} size={'clamp(110px, 11vw, 170px)'} style={{
                boxShadow: `0 0 42px ${teamColor}77, 0 0 100px ${teamColor}33`,
                animation: 'activeTeamGlow 2s ease-in-out infinite',
                ['--team-color' as any]: `${teamColor}55`,
              }} />
              <div title={team.name} style={{
                fontSize: 'clamp(26px, 3.4vw, 50px)', fontWeight: 900, color: teamColor,
                textShadow: `0 0 28px ${teamColor}55`,
                maxWidth: '80vw',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{truncName(team.name, 20)}</div>
              {step === 1 && (
                <div style={{
                  marginTop: 4, padding: '10px 22px', borderRadius: 16,
                  background: `${teamColor}14`, border: `2px solid ${teamColor}44`,
                  fontSize: 'clamp(15px, 1.7vw, 22px)', fontWeight: 700, color: '#e2e8f0',
                  maxWidth: 900, textAlign: 'center',
                  animation: 'contentReveal 0.45s ease 0.15s both',
                }}>
                  {lang === 'en'
                    ? `${team.name} is in last place — strike back!`
                    : `${team.name} liegt auf dem letzten Platz — schlag zurück!`}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Step 2: Aktion (H/L-Regeln + Leader-Anzeige) */}
      {showAction && (hl ? hlTeams.length > 0 : !!team) && (
        <div style={{
          width: '100%', maxWidth: 1100,
          animation: 'contentReveal 0.5s ease both',
          position: 'relative', zIndex: 5,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'clamp(8px, 1.2vh, 14px)',
        }}>
          {/* Round-Counter kompakt: Label + Zahl + Dots inline. */}
          {hl && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'clamp(8px, 1vw, 14px)',
            }}>
              <span style={{
                fontSize: 'clamp(12px, 1.3vw, 16px)', fontWeight: 900,
                color: '#94a3b8', letterSpacing: '0.14em', textTransform: 'uppercase',
              }}>
                {lang === 'en' ? 'In this run' : 'Durchgang'}
              </span>
              <span style={{
                fontSize: 'clamp(36px, 4.4vw, 64px)', fontWeight: 900,
                color: '#FBBF24', lineHeight: 1,
                textShadow: '0 0 30px rgba(251,191,36,0.5)',
                fontVariantNumeric: 'tabular-nums',
              }}>{hl.rounds}</span>
              <span style={{
                fontSize: 'clamp(16px, 1.8vw, 24px)', fontWeight: 900, color: '#FDE68A',
              }}>
                {hl.rounds === 1
                  ? (lang === 'en' ? 'Runde' : 'Runde')
                  : (lang === 'en' ? 'Runden' : 'Runden')}
              </span>
              {/* Dots inline */}
              <span style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
                {Array.from({ length: hl.rounds }).map((_, i) => (
                  <span key={i} style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: '#FBBF24', boxShadow: '0 0 8px rgba(251,191,36,0.5)',
                  }} />
                ))}
              </span>
            </div>
          )}
          <div style={{
            padding: 'clamp(12px, 1.6vh, 18px) clamp(20px, 2.4vw, 32px)', borderRadius: 18,
            textAlign: 'center',
            background: cardBg,
            border: hl ? '2px solid rgba(251,191,36,0.55)' : `2px solid #EF444455`,
            boxShadow: hl
              ? '0 0 32px rgba(251,191,36,0.22), 0 6px 18px rgba(0,0,0,0.4)'
              : `0 0 32px rgba(239,68,68,0.2), 0 6px 18px rgba(0,0,0,0.4)`,
            fontSize: 'clamp(16px, 2vw, 26px)', fontWeight: 900,
            color: hl ? '#fde68a' : '#fecaca',
            maxWidth: 1000,
            lineHeight: 1.3,
          }}>
            <QQEmojiIcon emoji={hl ? "🎯" : "⚡"}/> {lang === 'en' ? actionTextEn : actionTextDe}
          </div>
          {leaderTeams.length > 0 && (
            <>
              <div style={{
                fontSize: 'clamp(13px, 1.4vw, 18px)', fontWeight: 800, color: '#94a3b8',
                letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: -4,
              }}>
                {leaderTeams.length === 1
                  ? (lang === 'en' ? 'Current leader' : 'Aktueller 1. Platz')
                  : (lang === 'en' ? 'Current leaders' : 'Aktuelle 1. Plätze')}
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                {leaderTeams.map(lt => (
                  <div key={lt.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 14px', borderRadius: 14,
                    background: `${lt.color}18`, border: `2px solid ${lt.color}66`,
                    boxShadow: `0 0 16px ${lt.color}22`,
                  }}>
                    <QQTeamAvatar avatarId={lt.avatarId} size={36} />
                    <span style={{ fontSize: 'clamp(15px, 1.7vw, 20px)', fontWeight: 900, color: lt.color }}>{truncName(lt.name, 12)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAUSED — Records / Leaderboard display
// ═══════════════════════════════════════════════════════════════════════════════

type LeaderEntry = { name: string; wins: number; games: number };
type FunStats = {
  highestScore: { teamName: string; score: number; draftTitle: string } | null;
  closestGame: { teams: string[]; gap: number; draftTitle: string } | null;
  winStreak: { teamName: string; streak: number } | null;
  mostGames: { teamName: string; games: number } | null;
  fastestAnswer: { teamName: string; text: string; questionText: string; ms: number } | null;
  funnyAnswers: Array<{ teamName: string; text: string; questionText: string }>;
  // Erweiterte Stats
  jokerKing?: { teamName: string; total: number } | null;
  stealMaster?: { teamName: string; total: number } | null;
  potatoBoss?: { teamName: string; total: number } | null;
  comebackKing?: { teamName: string; total: number } | null;
  underdog?: { teamName: string; games: number; wins: number } | null;
  speedDemon?: { teamName: string; avgRank: number; samples: number } | null;
  categoryMasters?: Array<{ teamName: string; category: string; count: number }>;
  perfectRounds?: Array<{ teamName: string; draftTitle: string }>;
  todayStats?: {
    games: number;
    topScore: { teamName: string; score: number; draftTitle: string } | null;
    topWinner: { teamName: string; wins: number } | null;
  } | null;
};

// Brand-Loop für PreGame: AnimatedCozyWolf + zyklischer Slogan
// Wichtig (User-Wunsch): Wolf-Position, Card-Größe und Text-Position bleiben STABIL
// beim Wechsel — nur der Text-Inhalt fadet weich aus/ein. Reservierte Höhe + absolute
// Positionierung des Slogans verhindern Layout-Shift bei unterschiedlichen Slogan-Längen.
function BrandLoopPanel({ slogans, de }: { slogans: string[]; de: boolean }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (slogans.length <= 1) return;
    const id = setInterval(() => setIdx(p => (p + 1) % slogans.length), 4500);
    return () => clearInterval(id);
  }, [slogans.length]);
  const current = slogans[idx % slogans.length];
  return (
    // Grid-Layout statt flex+justifyContent:center — verhindert Layout-Shift,
    // wenn die intrinsische Breite der Text-Spalte sich ändert. Wolf-Spalte hat
    // exakt Wolf-Breite, Text-Spalte hat FESTE Breite (clamp). Beide Spalten ändern
    // ihre Größe nicht, wenn der Slogan-Text wechselt → Wolf bleibt 100% an Ort.
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'auto auto',
      alignItems: 'center',
      columnGap: 28,
      padding: '8px 4px',
      // Pinnt das Grid horizontal in die Panel-Mitte
      justifyContent: 'center',
    }}>
      <AnimatedCozyWolf widthCss="clamp(110px, 12vw, 180px)" speaking={true} />
      <div style={{
        // Feste Breite — egal wie kurz/lang der Slogan ist
        width: 'clamp(260px, 38vw, 540px)',
        // Feste Höhe — Eyebrow + Slogan-Box ohne Atmen
        minHeight: 'clamp(96px, 11vw, 144px)',
        display: 'flex', flexDirection: 'column', gap: 8,
        justifyContent: 'center',
      }}>
        <div style={{
          fontSize: 'clamp(11px, 1.1vw, 14px)', fontWeight: 900,
          color: '#FBBF24',
          letterSpacing: '0.32em', textTransform: 'uppercase',
        }}>
          Cozy Quiz
        </div>
        {/* Slogan-Box mit fester Höhe + absoluter Positionierung → Text fadet nur, Layout fix */}
        <div style={{
          position: 'relative',
          minHeight: 'clamp(56px, 7vw, 100px)',
        }}>
          <div
            key={current}
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center',
              fontSize: 'clamp(28px, 3.4vw, 48px)', fontWeight: 900,
              color: '#FFEFC9',
              lineHeight: 1.1,
              letterSpacing: '-0.005em',
              textShadow: '0 2px 0 rgba(0,0,0,0.4), 0 0 24px rgba(251,191,36,0.2)',
              animation: 'qqSloganFade 0.7s ease-in-out both',
              willChange: 'opacity',
            }}
          >
            {current}
          </div>
        </div>
      </div>
    </div>
  );
}

// Kategorie-Akzente fürs Panel-Design (konsistent mit Beamer-Quiz)
const PAUSE_CAT_ACCENT: Record<string, { color: string; emoji: string; label: string }> = {
  SCHAETZCHEN:   { color: '#EAB308', emoji: '🎯', label: 'Schätzchen' },
  MUCHO:         { color: '#3B82F6', emoji: '🔤', label: 'Mucho Choice' },
  BUNTE_TUETE:   { color: '#EF4444', emoji: '🎁', label: 'Bunte Tüte' },
  ZEHN_VON_ZEHN: { color: '#10B981', emoji: '🎲', label: '10 von 10' },
  CHEESE:        { color: '#8B5CF6', emoji: '📸', label: 'Cheese!' },
};

export function PausedView({ state: s, mode = 'pause' }: { state: QQStateUpdate; mode?: 'pause' | 'preGame' }) {
  // Cozy-warmer Card-Hintergrund (passend zu In-Game-Cards)
  const cardBg = COZY_CARD_BG;
  // Mode-spezifische Akzentfarbe — preGame: Lagerfeuer-Gold, Pause: Cozy-Lavender
  const modeAccent = mode === 'preGame' ? '#FBBF24' : '#A78BFA';
  const modeAccentDim = mode === 'preGame' ? 'rgba(251,191,36,0.38)' : 'rgba(167,139,250,0.42)';
  const modeGlow = mode === 'preGame' ? 'rgba(251,191,36,0.28)' : 'rgba(167,139,250,0.28)';
  const [de, setDe] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setDe(p => !p), 8000);
    return () => clearInterval(id);
  }, []);

  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [totalGames, setTotalGames] = useState(0);
  const [funStats, setFunStats] = useState<FunStats | null>(null);
  useEffect(() => {
    const API = (import.meta as any).env?.VITE_API_BASE ?? '/api';
    fetch(`${API}/qq/leaderboard`).then(r => r.json()).then(data => {
      if (data.leaderboard) setLeaderboard(data.leaderboard);
      if (data.totalGames) setTotalGames(data.totalGames);
      if (data.funStats) setFunStats(data.funStats);
    }).catch(() => {});
  }, []);

  // Build rotating panels
  const panels: Array<{ key: string; node: React.ReactNode }> = [];

  // ── Brand-Loop & How-To — nur in PreGame (füllen leeren Vor-Spiel-State) ──
  if (mode === 'preGame') {
    // Rotierende Sprüche im Brand-Panel (Index zyklisch in der Komponente unten)
    const brandSlogans = de
      ? [
          'Heute Abend: Quiz.',
          'Snacks bereit?',
          'Lehn dich zurück.',
          'Augen auf — gleich geht’s los.',
          'Kein Druck. Nur Spaß.',
        ]
      : [
          'Tonight: Quiz.',
          'Snacks ready?',
          'Settle in.',
          'Eyes up — starting soon.',
          'No pressure. Just fun.',
        ];

    panels.push({ key: 'brandLoop', node: (
      <BrandLoopPanel slogans={brandSlogans} de={de} />
    )});

    // Wie funktioniert's — 4 Mini-Cards
    const howItems = de
      ? [
          { icon: '📱', title: 'Auf dem Handy', desc: 'Jedes Team spielt am eigenen Smartphone.' },
          { icon: '🎯', title: '4 Runden + Finale', desc: 'Verschiedene Spielmodi auf dem Brett — wer am Ende führt, gewinnt.' },
          { icon: '🃏', title: 'Joker sammeln', desc: 'Volle Reihe? Joker freigespielt — einsetzen für Mut oder Schutz.' },
          { icon: '🦊', title: 'Brett erobern', desc: 'Felder gehören dem Team, das die Frage gewinnt.' },
        ]
      : [
          { icon: '📱', title: 'On your phone', desc: 'Each team plays on their own smartphone.' },
          { icon: '🎯', title: '4 rounds + finale', desc: 'Different modes on the grid — leader at the end wins.' },
          { icon: '🃏', title: 'Earn jokers', desc: 'Full row? Joker unlocked — bet bold or shield up.' },
          { icon: '🦊', title: 'Conquer the grid', desc: 'Cells belong to the team that wins the question.' },
        ];

    panels.push({ key: 'howItWorks', node: (
      <div>
        <div style={{ fontSize: 'clamp(24px, 2.8vw, 36px)', fontWeight: 900, color: '#e2e8f0', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.25s both' }}>📖</span>
          {de ? 'Wie funktioniert’s?' : 'How it works'}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 14,
        }}>
          {howItems.map((it, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              padding: '14px 16px',
              borderRadius: 16,
              background: 'rgba(255,235,200,0.04)',
              border: '1px solid rgba(255,235,200,0.10)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
              animation: `panelSlideIn 0.6s cubic-bezier(0.22,1,0.36,1) ${0.08 * i}s both`,
            }}>
              <span style={{ fontSize: 'clamp(28px, 3vw, 40px)', lineHeight: 1, flexShrink: 0 }}>{it.icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 'clamp(17px, 1.9vw, 24px)', color: '#FBBF24', marginBottom: 4 }}>{it.title}</div>
                <div style={{ fontSize: 'clamp(14px, 1.5vw, 19px)', color: '#cbd5e1', lineHeight: 1.4 }}>{it.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )});
  }

  // ── Pause-Wolf-Sprüche — witzige Pause-Begleiter (User-Wunsch 2026-04-28) ──
  // CozyWolf checkt regelmäßig ein während die Spieler ne Pause machen. Kein
  // Spruch ist aufdringlich — alles freundlich-fürsorglich-spielerisch.
  if (mode === 'pause') {
    const pauseSlogans = de
      ? [
          'Habt ihr noch Getränke?',
          'Muss noch jemand aufs Klo?',
          'Strecken erlaubt — gleich geht\'s weiter!',
          'Schon ein Snack besorgt?',
          'Kurz die Beine vertreten?',
          'Wer hat den nächsten Sieg im Kopf?',
          'Schaut mal kurz nach den anderen.',
        ]
      : [
          'Anyone need a drink?',
          'Bathroom break time?',
          'Stretch a bit — back soon!',
          'Snacks topped up?',
          'Quick walk before round 2?',
          'Who\'s plotting the next win?',
          'Check on the others while we\'re paused.',
        ];
    panels.push({ key: 'pauseWolf', node: (
      <BrandLoopPanel slogans={pauseSlogans} de={de} />
    )});
  }

  // Aktuelle Runde — kompakt (User-Feedback 2026-04-28: 'die ganze progress
  // bar ist zu lang, zeige am besten nur die aktuelle Runde'). Statt der
  // vollen Tree-Übersicht jetzt: Runden-Pille + Frage-Fortschritt + RoundMiniTree
  // (nur Dots der aktuellen Runde) — passt in einer Card-Zeile.
  if (mode === 'pause' && (s.schedule?.length ?? 0) > 0) {
    const phaseColors = ['#3B82F6', '#F59E0B', '#EF4444'];
    const roundColor = phaseColors[((s.gamePhaseIndex ?? 1) - 1) % 3];
    const questionInPhase = (s.questionIndex % 5) + 1;
    panels.push({ key: 'progress', node: (
      <div>
        <div style={{ fontSize: 'clamp(28px, 3.2vw, 42px)', fontWeight: 900, color: '#e2e8f0', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.25s both' }}><QQEmojiIcon emoji="🗺️"/></span>
          {de ? 'Wo sind wir?' : 'Where are we?'}
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
        }}>
          {/* Big Round Pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 14,
            padding: '14px 32px', borderRadius: 999,
            background: `${roundColor}20`,
            border: `2.5px solid ${roundColor}`,
            boxShadow: `0 0 28px ${roundColor}55, inset 0 1px 0 rgba(255,255,255,0.06)`,
          }}>
            <span style={{
              fontSize: 'clamp(36px, 4.5vw, 64px)', fontWeight: 900,
              color: roundColor, lineHeight: 1,
              textShadow: `0 0 16px ${roundColor}88`,
            }}>{s.gamePhaseIndex}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, lineHeight: 1.1 }}>
              <span style={{
                fontSize: 'clamp(12px, 1.2vw, 16px)', fontWeight: 900,
                color: `${roundColor}cc`, letterSpacing: '0.18em', textTransform: 'uppercase',
              }}>
                {de ? `Runde ${s.gamePhaseIndex} von ${s.totalPhases}` : `Round ${s.gamePhaseIndex} of ${s.totalPhases}`}
              </span>
              <span style={{
                fontSize: 'clamp(18px, 2vw, 26px)', fontWeight: 800,
                color: '#e2e8f0',
              }}>
                {de ? `Frage ${questionInPhase} von 5` : `Question ${questionInPhase} of 5`}
              </span>
            </div>
          </div>
          {/* Mini-Tree der aktuellen Runde */}
          <RoundMiniTree state={s} catColor={roundColor} />
        </div>
      </div>
    )});

    // Aktuelles Grid als eigener Slide (User-Wunsch 2026-04-28: 'gerne das
    // aktuelle grid auf einem der slides'). Reuse MiniGrid mit großzügiger Größe.
    panels.push({ key: 'currentGrid', node: (
      <div>
        <div style={{ fontSize: 'clamp(28px, 3.2vw, 42px)', fontWeight: 900, color: '#e2e8f0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.25s both' }}><QQEmojiIcon emoji="🗺️"/></span>
          {de ? 'Aktuelles Brett' : 'Current Board'}
        </div>
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: 'clamp(14px, 2vw, 28px)',
        }}>
          <MiniGrid state={s} size={420} />
        </div>
        {/* Mini-Legende: Team-Avatare mit Cell-Counts unter dem Grid */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12,
          marginTop: 14,
        }}>
          {[...s.teams].sort((a, b) => b.totalCells - a.totalCells).map(t => (
            <div key={t.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 12px', borderRadius: 999,
              background: `${t.color}15`,
              border: `1.5px solid ${t.color}55`,
            }}>
              <QQTeamAvatar avatarId={t.avatarId} size={28} />
              <span style={{ fontWeight: 900, color: t.color, fontSize: 14 }}>{t.totalCells}</span>
            </div>
          ))}
        </div>
      </div>
    )});
  }

  // Current game standings — bei >=5 Teams 2-spaltig, damit nichts überläuft
  const sortedTeams = [...s.teams].sort((a, b) => b.totalCells - a.totalCells);
  if (sortedTeams.length > 0) {
    const twoCol = sortedTeams.length >= 5;
    const rankSize = twoCol ? 'clamp(22px, 2.4vw, 32px)' : 'clamp(28px, 3.2vw, 42px)';
    const avSize   = twoCol ? 'clamp(26px, 2.8vw, 38px)' : 'clamp(32px, 3.6vw, 48px)';
    const nameSize = twoCol ? 'clamp(18px, 2vw, 26px)'  : 'clamp(22px, 2.6vw, 32px)';
    const valSize  = twoCol ? 'clamp(18px, 2vw, 26px)'  : 'clamp(22px, 2.6vw, 32px)';
    const unitSize = twoCol ? 'clamp(12px, 1.3vw, 16px)' : 'clamp(14px, 1.6vw, 20px)';
    panels.push({ key: 'standings', node: (
      <div>
        <div style={{ fontSize: 'clamp(24px, 2.8vw, 36px)', fontWeight: 900, color: '#e2e8f0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.25s both' }}><QQEmojiIcon emoji="📊"/></span> {de ? 'Aktueller Stand' : 'Current Standings'}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: twoCol ? '1fr 1fr' : '1fr',
          columnGap: 32, rowGap: 0,
        }}>
          {sortedTeams.map((t, i) => {
            // Border-bottom nur wenn es innerhalb der Spalte noch einen Nachfolger gibt
            const nextInCol = twoCol ? (i + 2 < sortedTeams.length) : (i < sortedTeams.length - 1);
            return (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: twoCol ? 12 : 18, padding: twoCol ? '8px 0' : '12px 0',
                borderBottom: nextInCol ? '1px solid rgba(255,255,255,0.06)' : 'none',
                minWidth: 0,
              }}>
                <span style={{ fontSize: rankSize, width: twoCol ? 36 : 48, textAlign: 'center', flexShrink: 0 }}>
                  {i === 0 ? <QQEmojiIcon emoji="🥇"/> : i === 1 ? <QQEmojiIcon emoji="🥈"/> : i === 2 ? <QQEmojiIcon emoji="🥉"/> : `${i + 1}.`}
                </span>
                <QQTeamAvatar avatarId={t.avatarId} size={avSize} style={{ flexShrink: 0 }} />
                <span style={{
                  flex: 1, fontWeight: 800, fontSize: nameSize, color: t.color,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
                }}>{t.name}</span>
                <span style={{ fontSize: valSize, fontWeight: 900, color: '#F59E0B', flexShrink: 0 }}>{t.totalCells}</span>
                <span style={{ fontSize: unitSize, color: '#64748b', flexShrink: 0 }}>{de ? 'Felder' : 'cells'}</span>
              </div>
            );
          })}
        </div>
      </div>
    )});
  }

  // All-time leaderboard (nur echte Siege) — Design-Upgrade: Avatare aus Session-Teams
  // gemappt (wo möglich), Siege als Subway-Stationen (max 8 sichtbar), Dark-Pills.
  const realLeaderboard = leaderboard.filter(e => e.wins > 0);
  if (realLeaderboard.length > 0) {
    const maxVisibleWins = 8;
    const maxWins = Math.max(...realLeaderboard.slice(0, 5).map(e => e.wins));
    panels.push({ key: 'leaderboard', node: (
      <div>
        <div style={{ fontSize: 'clamp(24px, 2.8vw, 36px)', fontWeight: 900, color: '#e2e8f0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.25s both' }}><QQEmojiIcon emoji="🏆"/></span> {de ? 'Bestenliste' : 'Leaderboard'}
          {totalGames > 0 && <span style={{ fontSize: 'clamp(16px, 1.8vw, 22px)', fontWeight: 600, color: '#475569' }}>({totalGames} {de ? 'Spiele' : 'games'})</span>}
        </div>
        {realLeaderboard.slice(0, 5).map((entry, i) => {
          const sessionTeam = s.teams.find(t => t.name === entry.name);
          const teamColor = sessionTeam?.color ?? (i === 0 ? '#FBBF24' : i === 1 ? '#CBD5E1' : i === 2 ? '#F97316' : '#94A3B8');
          const shown = Math.min(entry.wins, maxVisibleWins);
          const overflow = entry.wins - shown;
          return (
          <div key={entry.name} style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0',
            borderBottom: i < Math.min(realLeaderboard.length, 5) - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}>
            <span style={{ fontSize: 'clamp(26px, 3vw, 38px)', width: 46, textAlign: 'center', flexShrink: 0 }}>
              {i === 0 ? <QQEmojiIcon emoji="🥇"/> : i === 1 ? <QQEmojiIcon emoji="🥈"/> : i === 2 ? <QQEmojiIcon emoji="🥉"/> : `${i + 1}.`}
            </span>
            {sessionTeam
              ? <QQTeamAvatar avatarId={sessionTeam.avatarId} size={'clamp(38px, 4vw, 54px)'} style={{ flexShrink: 0, boxShadow: `0 0 14px ${teamColor}44` }} />
              : <span style={{ width: 'clamp(38px, 4vw, 54px)', height: 'clamp(38px, 4vw, 54px)', borderRadius: '50%', background: '#241a10', flexShrink: 0 }} />
            }
            <span style={{
              flex: 1, fontWeight: 800, fontSize: 'clamp(20px, 2.4vw, 30px)', color: teamColor,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
            }}>{entry.name}</span>
            {/* Subway-Stationen: ein Dot pro Sieg, skaliert relativ zum Maximum */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, minWidth: 0 }}>
              {Array.from({ length: shown }).map((_, k) => (
                <span key={k} style={{
                  width: 'clamp(8px, 1vw, 12px)', height: 'clamp(8px, 1vw, 12px)',
                  borderRadius: '50%',
                  background: teamColor,
                  boxShadow: `0 0 8px ${teamColor}88`,
                  opacity: 0.4 + 0.6 * ((k + 1) / maxWins),
                }} />
              ))}
              {overflow > 0 && (
                <span style={{ color: teamColor, fontWeight: 900, fontSize: 'clamp(13px, 1.4vw, 18px)', marginLeft: 4 }}>+{overflow}</span>
              )}
            </div>
            {/* Dark-Pill mit Siegen */}
            <span style={{
              padding: '4px 12px', borderRadius: 999,
              background: 'linear-gradient(180deg, #241a10, #1a120a)',
              border: `1.5px solid ${teamColor}66`,
              color: teamColor, fontWeight: 900, fontSize: 'clamp(15px, 1.7vw, 21px)',
              flexShrink: 0,
              boxShadow: `0 0 14px ${teamColor}22, inset 0 1px 0 rgba(255,255,255,0.05)`,
            }}>{entry.wins} {de ? 'Siege' : 'wins'}</span>
          </div>
          );
        })}
      </div>
    )});
  }

  // Records — nur Einträge mit echten Werten zeigen (0-Records sind irreführend)
  if (funStats) {
    const records: React.ReactNode[] = [];
    if (funStats.highestScore && funStats.highestScore.score > 0) {
      records.push(
        <div key="hs" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '12px 0' }}>
          <span style={{ fontSize: 'clamp(32px, 3.6vw, 48px)' }}><QQEmojiIcon emoji="🔥"/></span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 'clamp(20px, 2.4vw, 28px)', color: '#e2e8f0' }}>{de ? 'Höchster Score' : 'Highest Score'}</div>
            <div style={{ fontSize: 'clamp(18px, 2vw, 24px)', color: '#94a3b8' }}>
              <strong style={{ color: '#F59E0B' }}>{funStats.highestScore.teamName}</strong> — {funStats.highestScore.score} {de ? 'Punkte' : 'points'}
            </div>
          </div>
        </div>
      );
    }
    if (funStats.closestGame && funStats.closestGame.gap > 0) {
      records.push(
        <div key="cg" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '12px 0' }}>
          <span style={{ fontSize: 'clamp(32px, 3.6vw, 48px)' }}>⚔️</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 'clamp(20px, 2.4vw, 28px)', color: '#e2e8f0' }}>{de ? 'Knappster Sieg' : 'Closest Game'}</div>
            <div style={{ fontSize: 'clamp(18px, 2vw, 24px)', color: '#94a3b8' }}>
              {funStats.closestGame.teams[0]} vs {funStats.closestGame.teams[1]} — {de ? `nur ${funStats.closestGame.gap} Pkt.` : `only ${funStats.closestGame.gap} pts apart`}
            </div>
          </div>
        </div>
      );
    }
    if (funStats.winStreak && funStats.winStreak.streak >= 2) {
      records.push(
        <div key="ws" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '12px 0' }}>
          <span style={{ fontSize: 'clamp(32px, 3.6vw, 48px)' }}><QQEmojiIcon emoji="🔥"/></span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 'clamp(20px, 2.4vw, 28px)', color: '#e2e8f0' }}>{de ? 'Siegesserie' : 'Win Streak'}</div>
            <div style={{ fontSize: 'clamp(18px, 2vw, 24px)', color: '#94a3b8' }}>
              <strong style={{ color: '#F59E0B' }}>{funStats.winStreak.teamName}</strong> — {funStats.winStreak.streak}x {de ? 'in Folge' : 'in a row'}
            </div>
          </div>
        </div>
      );
    }
    if (funStats.fastestAnswer && funStats.fastestAnswer.ms >= 100) {
      const secs = (funStats.fastestAnswer.ms / 1000).toFixed(1);
      records.push(
        <div key="fa" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '12px 0' }}>
          <span style={{ fontSize: 'clamp(32px, 3.6vw, 48px)' }}><QQEmojiIcon emoji="⚡"/></span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 'clamp(20px, 2.4vw, 28px)', color: '#e2e8f0' }}>{de ? 'Schnellste Antwort' : 'Fastest Answer'}</div>
            <div style={{ fontSize: 'clamp(18px, 2vw, 24px)', color: '#94a3b8' }}>
              <strong style={{ color: '#F59E0B' }}>{funStats.fastestAnswer.teamName}</strong> — {secs}s {de ? 'Vorsprung' : 'ahead'}
            </div>
          </div>
        </div>
      );
    }
    if (records.length > 0) {
      panels.push({ key: 'records', node: (
        <div>
          <div style={{ fontSize: 'clamp(24px, 2.8vw, 36px)', fontWeight: 900, color: '#e2e8f0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.25s both' }}>🏅</span> {de ? 'Rekorde' : 'Records'}
          </div>
          {records}
        </div>
      )});
    }
  }

  // ── Style-Helpers für die neuen Stat-Panels ──────────────────────────────
  // Stat-Title in gleichem Look wie die bestehenden Panels
  const statTitle = (icon: string, titleDe: string, titleEn: string, accentColor?: string) => (
    <div style={{
      fontSize: 'clamp(24px, 2.8vw, 36px)', fontWeight: 900,
      color: accentColor ?? '#e2e8f0',
      marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.25s both' }}><QQEmojiIcon emoji={icon}/></span>
      {de ? titleDe : titleEn}
    </div>
  );

  // Dark-Pill im Cozy-Header-Style (warmer card-bg + Akzent-Border)
  const statPill = (value: string | number, label: string, accent = '#FBBF24') => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '8px 18px', borderRadius: 999,
      background: 'linear-gradient(180deg, #241a10, #1a120a)',
      border: `1.5px solid ${accent}66`,
      color: '#fff',
      fontSize: 'clamp(18px, 2vw, 26px)', fontWeight: 900,
      boxShadow: `0 0 18px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.06)`,
    }}>
      <span style={{ color: accent, fontSize: 'clamp(22px, 2.4vw, 30px)', lineHeight: 1 }}>{value}</span>
      <span style={{ color: '#cbd5e1', fontSize: 'clamp(13px, 1.3vw, 17px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
    </span>
  );

  // Big-Team-Line: Avatar + Name (farblich akzentuiert)
  const teamLine = (name: string, color?: string, avatarId?: string | null) => {
    const team = s.teams.find(t => t.name === name);
    const c = color ?? team?.color ?? '#FBBF24';
    const av = avatarId ?? team?.avatarId;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        {av && <QQTeamAvatar avatarId={av} size={'clamp(46px, 5vw, 68px)'} style={{ flexShrink: 0, boxShadow: `0 0 20px ${c}55` }} />}
        <span style={{ fontWeight: 900, fontSize: 'clamp(26px, 3vw, 42px)', color: c, textShadow: `0 0 18px ${c}44` }}>{name}</span>
      </div>
    );
  };

  // #01 Hot-Streak live — aktueller Session-Leader + Abstand
  if (sortedTeams.length >= 2 && mode === 'pause') {
    const leader = sortedTeams[0];
    const runnerUp = sortedTeams[1];
    const gap = leader.totalCells - runnerUp.totalCells;
    if (gap > 0) {
      panels.push({ key: 'hotStreak', node: (
        <div>
          {statTitle('🔥', 'Heiße Phase', 'Hot Streak', '#F97316')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {teamLine(leader.name, leader.color, leader.avatarId)}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {statPill(`+${gap}`, de ? 'Felder Vorsprung' : 'cells lead', '#F97316')}
              <span style={{ color: '#94a3b8', fontSize: 'clamp(17px, 1.9vw, 24px)', fontWeight: 700 }}>
                {de ? `vor ${runnerUp.name}` : `ahead of ${runnerUp.name}`}
              </span>
            </div>
          </div>
        </div>
      )});
    }
  }

  // #02 Joker-König (all-time)
  if (funStats?.jokerKing && funStats.jokerKing.total >= 2) {
    panels.push({ key: 'jokerKing', node: (
      <div>
        {statTitle('🃏', 'Joker-König', 'Joker King', '#A855F7')}
        {teamLine(funStats.jokerKing.teamName)}
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {statPill(funStats.jokerKing.total, de ? 'Joker gesichert' : 'jokers earned', '#A855F7')}
        </div>
      </div>
    )});
  }

  // #03 Comeback-King
  if (funStats?.comebackKing && funStats.comebackKing.total >= 1) {
    panels.push({ key: 'comebackKing', node: (
      <div>
        {statTitle('🦅', 'Comeback-King', 'Comeback King', '#38BDF8')}
        {teamLine(funStats.comebackKing.teamName)}
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {statPill(funStats.comebackKing.total, de ? 'Aufholsiege' : 'comeback wins', '#38BDF8')}
          <span style={{ color: '#94a3b8', fontSize: 'clamp(15px, 1.7vw, 20px)' }}>
            {de ? 'vom Letzten zum Gewinner' : 'from last place to winner'}
          </span>
        </div>
      </div>
    )});
  }

  // #04 Steal-Master
  if (funStats?.stealMaster && funStats.stealMaster.total >= 2) {
    panels.push({ key: 'stealMaster', node: (
      <div>
        {statTitle('🗡️', 'Steal-Master', 'Steal Master', '#EF4444')}
        {teamLine(funStats.stealMaster.teamName)}
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {statPill(funStats.stealMaster.total, de ? 'Felder geklaut' : 'cells stolen', '#EF4444')}
        </div>
      </div>
    )});
  }

  // #05 Underdog (wenige Spiele, aber Siege)
  if (funStats?.underdog) {
    panels.push({ key: 'underdog', node: (
      <div>
        {statTitle('🐺', 'Underdog', 'Underdog', '#22D3EE')}
        {teamLine(funStats.underdog.teamName)}
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {statPill(funStats.underdog.wins, de ? 'Siege' : 'wins', '#22D3EE')}
          {statPill(funStats.underdog.games, de ? 'Spiele' : 'games', '#64748B')}
          <span style={{ color: '#94a3b8', fontSize: 'clamp(14px, 1.6vw, 18px)', alignSelf: 'center' }}>
            {de ? 'frisch & gefährlich' : 'fresh & dangerous'}
          </span>
        </div>
      </div>
    )});
  }

  // #06 Kategorie-Meister (Top-3 Teams mit bester Kategorie)
  if (funStats?.categoryMasters && funStats.categoryMasters.length > 0) {
    panels.push({ key: 'catMasters', node: (
      <div>
        {statTitle('👑', 'Kategorie-Meister', 'Category Masters', '#FBBF24')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {funStats.categoryMasters.map((cm, i) => {
            const catMeta = PAUSE_CAT_ACCENT[cm.category] ?? { color: '#FBBF24', emoji: '🎯', label: cm.category };
            const team = s.teams.find(t => t.name === cm.teamName);
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px',
                borderRadius: 16, background: `${catMeta.color}12`,
                border: `1.5px solid ${catMeta.color}44`,
              }}>
                <span style={{ fontSize: 'clamp(28px, 3vw, 40px)', lineHeight: 1 }}>{catMeta.emoji}</span>
                {team && <QQTeamAvatar avatarId={team.avatarId} size={'clamp(36px, 4vw, 52px)'} style={{ flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 'clamp(18px, 2vw, 26px)', color: team?.color ?? '#e2e8f0' }}>{cm.teamName}</div>
                  <div style={{ fontSize: 'clamp(13px, 1.4vw, 18px)', color: catMeta.color, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{catMeta.label}</div>
                </div>
                {statPill(cm.count, de ? 'richtig' : 'correct', catMeta.color)}
              </div>
            );
          })}
        </div>
      </div>
    )});
  }

  // #07 Perfekte Runden
  if (funStats?.perfectRounds && funStats.perfectRounds.length > 0) {
    panels.push({ key: 'perfectRounds', node: (
      <div>
        {statTitle('💯', 'Perfekte Runden', 'Perfect Rounds', '#22C55E')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {funStats.perfectRounds.slice(0, 5).map((pr, i) => {
            const team = s.teams.find(t => t.name === pr.teamName);
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px',
                borderRadius: 14, background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.3)',
              }}>
                <span style={{ fontSize: 'clamp(24px, 2.6vw, 34px)' }}><QQEmojiIcon emoji="✨"/></span>
                {team && <QQTeamAvatar avatarId={team.avatarId} size={'clamp(34px, 3.6vw, 46px)'} />}
                <span style={{ fontWeight: 800, fontSize: 'clamp(18px, 2vw, 26px)', color: team?.color ?? '#e2e8f0' }}>{pr.teamName}</span>
                {pr.draftTitle && (
                  <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: 'clamp(13px, 1.5vw, 18px)', fontStyle: 'italic' }}>„{pr.draftTitle}"</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    )});
  }

  // #08 Speed-Demon
  if (funStats?.speedDemon && funStats.speedDemon.samples >= 5) {
    panels.push({ key: 'speedDemon', node: (
      <div>
        {statTitle('⚡', 'Schnellste Minute', 'Speed Demon', '#FACC15')}
        {teamLine(funStats.speedDemon.teamName)}
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {statPill(funStats.speedDemon.avgRank.toFixed(2), de ? 'Ø Rang' : 'avg rank', '#FACC15')}
          <span style={{ color: '#94a3b8', fontSize: 'clamp(15px, 1.7vw, 20px)' }}>
            {de ? `bei ${funStats.speedDemon.samples} Treffern` : `over ${funStats.speedDemon.samples} hits`}
          </span>
        </div>
      </div>
    )});
  }

  // #09 Bunte-Tüte-Boss (Hot-Potato)
  if (funStats?.potatoBoss && funStats.potatoBoss.total >= 2) {
    const btColor = PAUSE_CAT_ACCENT.BUNTE_TUETE.color;
    panels.push({ key: 'potatoBoss', node: (
      <div>
        {statTitle('🥔', 'Bunte-Tüte-Boss', 'Lucky Bag Boss', btColor)}
        {teamLine(funStats.potatoBoss.teamName)}
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {statPill(funStats.potatoBoss.total, de ? 'Heiße-Kartoffel-Treffer' : 'Hot Potato hits', btColor)}
        </div>
      </div>
    )});
  }

  // #10 Heute-Stats — nur wenn mindestens 1 Spiel heute
  if (funStats?.todayStats && funStats.todayStats.games >= 1) {
    panels.push({ key: 'today', node: (
      <div>
        {statTitle('📅', 'Heute', 'Today', '#60A5FA')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {statPill(funStats.todayStats.games, de ? 'Spiele heute' : 'games today', '#60A5FA')}
          {funStats.todayStats.topScore && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 'clamp(24px, 2.6vw, 34px)' }}>🏅</span>
              <div>
                <div style={{ fontWeight: 900, fontSize: 'clamp(18px, 2vw, 26px)', color: '#e2e8f0' }}>
                  {funStats.todayStats.topScore.teamName}
                </div>
                <div style={{ fontSize: 'clamp(14px, 1.6vw, 20px)', color: '#94a3b8' }}>
                  {funStats.todayStats.topScore.score} {de ? 'Punkte' : 'points'}
                </div>
              </div>
            </div>
          )}
          {funStats.todayStats.topWinner && funStats.todayStats.topWinner.wins >= 2 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 'clamp(24px, 2.6vw, 34px)' }}><QQEmojiIcon emoji="🔥"/></span>
              <div>
                <div style={{ fontWeight: 900, fontSize: 'clamp(18px, 2vw, 26px)', color: '#e2e8f0' }}>
                  {funStats.todayStats.topWinner.teamName}
                </div>
                <div style={{ fontSize: 'clamp(14px, 1.6vw, 20px)', color: '#94a3b8' }}>
                  {funStats.todayStats.topWinner.wins}× {de ? 'heute gewonnen' : 'wins today'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )});
  }

  // "Gegen dich" — wenn ein All-Time-Top-Team als Team in der aktuellen Session ist,
  // aber nicht vorne liegt, ein kleines Revenge-Panel anzeigen
  const rivalName = realLeaderboard.length > 0
    ? realLeaderboard.find(e => s.teams.some(t => t.name === e.name) && sortedTeams[0]?.name !== e.name)?.name
    : null;
  if (rivalName && mode === 'pause') {
    const rival = realLeaderboard.find(e => e.name === rivalName)!;
    const rivalTeam = s.teams.find(t => t.name === rivalName);
    panels.push({ key: 'rival', node: (
      <div>
        {statTitle('⚔️', 'Offene Rechnung', 'Unfinished Business', '#F472B6')}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          {rivalTeam && <QQTeamAvatar avatarId={rivalTeam.avatarId} size={'clamp(50px, 5.5vw, 72px)'} />}
          <div>
            <div style={{ fontWeight: 900, fontSize: 'clamp(22px, 2.6vw, 32px)', color: rivalTeam?.color ?? '#F472B6' }}>{rivalName}</div>
            <div style={{ fontSize: 'clamp(15px, 1.7vw, 22px)', color: '#94a3b8' }}>
              {de ? `hat schon ${rival.wins}× gewonnen — wer dreht heute das Spiel?` : `already won ${rival.wins}× — who flips the script today?`}
            </div>
          </div>
        </div>
      </div>
    )});
  }

  // Funny answers
  if (funStats?.funnyAnswers && funStats.funnyAnswers.length > 0) {
    panels.push({ key: 'funny', node: (
      <div>
        <div style={{ fontSize: 'clamp(24px, 2.8vw, 36px)', fontWeight: 900, color: '#e2e8f0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.25s both' }}>😂</span> {de ? 'Lustigste Antworten' : 'Funniest Answers'}
        </div>
        {funStats.funnyAnswers.map((fa, i) => (
          <div key={i} style={{ padding: '12px 0', borderBottom: i < funStats.funnyAnswers.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
            <div style={{ fontSize: 'clamp(22px, 2.6vw, 30px)', fontWeight: 700, color: '#FBBF24' }}>„{fa.text}"</div>
            <div style={{ fontSize: 'clamp(16px, 1.8vw, 22px)', color: '#64748b', marginTop: 4 }}>— {fa.teamName}</div>
          </div>
        ))}
      </div>
    )});
  }

  const [panelIdx, setPanelIdx] = useState(0);
  useEffect(() => {
    if (panels.length <= 1) return;
    const id = setInterval(() => setPanelIdx(p => (p + 1) % panels.length), 8000);
    return () => clearInterval(id);
  }, [panels.length]);

  const activePanel = panels[panelIdx % Math.max(panels.length, 1)];

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 64px 56px', position: 'relative', overflow: 'hidden',
      gap: 28,
      // Cozy-warmer Hintergrund (User-Wunsch 2026-04-28: PreGame/Pause weniger
      // schwarz, an Setup-Look angleichen). Mode-Akzent ergänzt das mit dem
      // großen Glow-Ring weiter unten.
      background:
        `radial-gradient(ellipse at 50% -10%, ${modeAccent}1A, transparent 55%), ` +
        `radial-gradient(ellipse at 85% 110%, rgba(99,102,241,0.08), transparent 55%), ` +
        `radial-gradient(ellipse at 15% 80%, rgba(244,114,182,0.05), transparent 50%), ` +
        '#0D0A06',
    }}>
      <Fireflies />

      {/* Ambient ring-light hinter dem Hero — pulsiert in Mode-Farbe */}
      <div style={{
        position: 'absolute',
        top: '14%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(720px, 70vw)',
        height: 'min(720px, 70vw)',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${modeGlow} 0%, transparent 65%)`,
        opacity: 0.65,
        animation: 'qqPauseAura 7s ease-in-out infinite',
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* Hero — Eyebrow + Big Title + Subtitle */}
      <div style={{
        position: 'relative', zIndex: 5,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        animation: 'panelSlideIn 0.7s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        {/* Eyebrow-Pill (Mode-Tag) */}
        <div style={{
          fontSize: 'clamp(11px, 1.1vw, 14px)', fontWeight: 900,
          color: modeAccent,
          letterSpacing: '0.32em', textTransform: 'uppercase',
          padding: '5px 16px', borderRadius: 999,
          background: `linear-gradient(180deg, ${modeAccent}22, ${modeAccent}0c)`,
          border: `1px solid ${modeAccentDim}`,
          boxShadow: `0 0 18px ${modeGlow}, inset 0 1px 0 rgba(255,255,255,0.08)`,
          animation: 'qqPauseEyebrowFloat 4s ease-in-out infinite',
        }}>
          {mode === 'preGame' ? '✨ Bereit zum Start' : '⏸ Atempause'}
        </div>

        {/* Big Title — größer, mit breathe-Glow */}
        <div style={{
          fontSize: 'clamp(48px, 6.4vw, 96px)', fontWeight: 900,
          color: modeAccent,
          letterSpacing: '-0.01em',
          lineHeight: 1.05,
          textShadow: `0 0 32px ${modeGlow}, 0 0 72px ${modeGlow}`,
          animation: 'qqPauseTitleBreathe 4.5s ease-in-out infinite',
          whiteSpace: 'nowrap',
        }}>
          {mode === 'preGame'
            ? (de ? "Gleich geht's los" : 'Starting soon')
            : (de ? 'Kurze Pause' : 'Short Break')}
        </div>
      </div>

      {/* Records panel — mit Slide-In pro Panel-Wechsel */}
      {activePanel && (
        <div style={{
          width: '100%', maxWidth: 920, position: 'relative', zIndex: 5,
        }}>
          <div key={activePanel.key} style={{
            background: cardBg,
            borderRadius: 26,
            padding: 'clamp(28px, 3.5vw, 48px)',
            border: `1px solid ${modeAccentDim}`,
            boxShadow:
              `0 14px 48px rgba(0,0,0,0.55),` +
              `0 0 64px ${modeGlow},` +
              `0 0 0 1px rgba(255,235,200,0.04) inset,` +
              `0 -3px 0 ${modeAccent} inset`,
            animation: 'panelSlideIn 0.6s cubic-bezier(0.22,1,0.36,1) both',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Akzent-Streifen oben (animated shimmer) */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: `linear-gradient(90deg, transparent, ${modeAccent}, transparent)`,
              animation: 'qqPauseShimmer 6s linear infinite',
              backgroundSize: '200% 100%',
            }} />
            {/* Subtle Inner-Glow oben-rechts */}
            <div style={{
              position: 'absolute', top: -120, right: -120, width: 320, height: 320,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${modeAccent}1c 0%, transparent 70%)`,
              pointerEvents: 'none',
            }} />
            <div style={{ position: 'relative' }}>{activePanel.node}</div>
          </div>
          {panels.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 22 }}>
              {panels.map((_, i) => {
                const isActive = i === panelIdx % panels.length;
                return (
                  <div key={i} style={{
                    width: isActive ? 32 : 10,
                    height: 10,
                    borderRadius: 999,
                    background: isActive
                      ? `linear-gradient(90deg, ${modeAccent}, ${modeAccent}aa)`
                      : 'rgba(255,235,200,0.16)',
                    boxShadow: isActive ? `0 0 10px ${modeGlow}` : 'none',
                    transition: 'all 0.4s cubic-bezier(0.22,1,0.36,1)',
                  }} />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Hint mit Lagerfeuer-Sparkle — nur im Pause-Mode (im PreGame redundant zum großen Titel) */}
      {mode === 'pause' && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          fontSize: 'clamp(15px, 1.6vw, 22px)', color: '#a8a395', fontWeight: 700,
          position: 'relative', zIndex: 5,
          letterSpacing: '0.04em',
        }}>
          <span style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
            background: modeAccent, boxShadow: `0 0 10px ${modeGlow}`,
            animation: 'qqPauseDot 1.6s ease-in-out infinite',
          }} />
          {de ? "Gleich geht's weiter…" : 'Continuing soon…'}
          <span style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
            background: modeAccent, boxShadow: `0 0 10px ${modeGlow}`,
            animation: 'qqPauseDot 1.6s ease-in-out 0.3s infinite',
          }} />
        </div>
      )}

      <style>{`
        @keyframes qqPauseAura {
          0%, 100% { opacity: 0.55; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.8; transform: translateX(-50%) scale(1.06); }
        }
        @keyframes qqPauseTitleBreathe {
          0%, 100% { letter-spacing: -0.01em; filter: brightness(1); }
          50% { letter-spacing: 0.005em; filter: brightness(1.08); }
        }
        @keyframes qqPauseEyebrowFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes qqPauseShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes qqPauseDot {
          0%, 100% { opacity: 0.4; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        /* Slogan-Wechsel im BrandLoopPanel — reines Cross-Fade ohne Bewegung,
           damit Wolf und Card-Größe stabil bleiben (User-Wunsch). */
        @keyframes qqSloganFade {
          0%   { opacity: 0; }
          25%  { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4×4 CONNECTIONS — Finalrunde (Beamer)
// ═══════════════════════════════════════════════════════════════════════════════

const CONNECTIONS_GROUP_COLORS = ['#FBBF24', '#22C55E', '#60A5FA', '#A78BFA']; // gelb, grün, blau, lila

export function ConnectionsBeamerView({ state: s }: { state: QQStateUpdate }) {
  const lang = useLangFlip(s.language);
  const c = s.connections;
  if (!c) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        {lang === 'de' ? '4×4 wird vorbereitet…' : '4×4 is loading…'}
      </div>
    );
  }

  // Bug-Fix 2026-04-28 (10-prompt-old): Während c.phase === 'placement' soll
  // das TERRITORY-GRID gezeigt werden (wo die Teams setzen), nicht das 4×4-
  // Items-Grid. Das 4×4 hat seine Funktion erfüllt — jetzt ist Placement
  // wichtig, sonst sieht man "Setzen läuft" ohne Grid zum Setzen. Wir
  // delegieren an PlacementView (gleiches Look wie nach normaler Runde).
  if (c.phase === 'placement') {
    return <PlacementView state={s} />;
  }

  const showBoard = c.phase === 'active' || c.phase === 'reveal';

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'stretch',
      gap: 'clamp(10px, 1.4vh, 18px)',
      padding: 'clamp(16px, 2vh, 28px) clamp(20px, 2.5vw, 40px)',
      position: 'relative',
    }}>
      <Fireflies color="rgba(251,191,36,0.30)" />
      <ConnectionsHeader state={s} />
      {c.phase === 'intro' && <ConnectionsIntro state={s} />}
      {showBoard && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}>
          <ConnectionsGrid state={s} />
        </div>
      )}
      {showBoard && <ConnectionsAnswerStatus state={s} />}
    </div>
  );
}

/**
 * Header — gleicher Stil wie bei Mucho/Cheese-Fragen:
 * - Kategorie-Pill oben links (Icon + Name + Akzent-Border)
 * - Timer/Phase-Status oben rechts
 * Statt absolute-Positionierung ein flex-row, weil ConnectionsBeamerView
 * bereits einen padded container hat.
 */
function ConnectionsHeader({ state: s }: { state: QQStateUpdate }) {
  const lang = useLangFlip(s.language);
  const c = s.connections!;
  const accent = '#FBBF24';
  // Event-Wording — kurz und groß auf der Bühne. „Großes Finale" griffig
  // genug für Live-Quiz, vermeidet das technische „4×4 Connections".
  const labelDe = 'Großes Finale';
  const labelEn = 'Grand Finale';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 16, position: 'relative', zIndex: 5,
    }}>
      {/* Kategorie-Pill links — gleiche Optik wie bei den anderen Fragen */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '8px 22px', borderRadius: 999,
        background: `${accent}22`, border: `2px solid ${accent}44`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'contentReveal 0.35s ease both',
      }}>
        <span style={{ fontSize: 'clamp(20px, 2.2vw, 30px)', lineHeight: 1 }}>🔗</span>
        <span style={{
          fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 900,
          color: accent, letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>{lang === 'de' ? labelDe : labelEn}</span>
      </div>

      {/* Status / Timer rechts */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        animation: 'contentReveal 0.5s ease 0.2s both',
      }}>
        {c.phase === 'active' && <ConnectionsTimer endsAt={c.endsAt} />}
        {c.phase === 'reveal' && (
          <div style={{
            padding: '8px 18px', borderRadius: 999,
            background: 'rgba(251,191,36,0.18)', border: '2px solid rgba(251,191,36,0.5)',
            fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 900, color: '#fde68a',
            letterSpacing: '0.06em',
          }}>
            {lang === 'de' ? 'Auflösung' : 'Reveal'}
          </div>
        )}
        {c.phase === 'placement' && (
          <div style={{
            padding: '8px 18px', borderRadius: 999,
            background: 'rgba(34,197,94,0.18)', border: '2px solid rgba(34,197,94,0.5)',
            fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 900, color: '#86EFAC',
            letterSpacing: '0.06em',
          }}>
            {lang === 'de' ? 'Setzen läuft' : 'Placement'}
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectionsTimer({ endsAt }: { endsAt: number }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, (endsAt - Date.now()) / 1000));
  useEffect(() => {
    const iv = setInterval(() => {
      const r = Math.max(0, (endsAt - Date.now()) / 1000);
      setRemaining(r);
    }, 250);
    return () => clearInterval(iv);
  }, [endsAt]);
  const m = Math.floor(remaining / 60);
  const sec = Math.floor(remaining % 60);
  const urgent = remaining <= 30;
  return (
    <div style={{
      padding: '10px 18px', borderRadius: 14,
      background: urgent ? 'rgba(239,68,68,0.22)' : 'rgba(251,191,36,0.15)',
      border: `2px solid ${urgent ? '#EF4444' : 'rgba(251,191,36,0.45)'}`,
      fontSize: 'clamp(22px, 2.4vw, 32px)', fontWeight: 900,
      color: urgent ? '#FCA5A5' : '#FDE68A', fontVariantNumeric: 'tabular-nums',
      animation: urgent ? 'pulse 0.8s ease-in-out infinite alternate' : undefined,
    }}>
      ⏱ {String(m).padStart(2, '0')}:{String(sec).padStart(2, '0')}
    </div>
  );
}

function ConnectionsIntro({ state: s }: { state: QQStateUpdate }) {
  const lang = useLangFlip(s.language);
  const c = s.connections!;
  // 2026-04-28 Resize: User-Feedback 'so riesig und nicht so wie der rest'.
  // Card-Wrapper raus → free-floating Elements wie in PhaseIntroView. Sizing
  // angeglichen: Title in 3D-Layered-Glow-Stil wie Cat-Titles, Pills bleiben.
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 20, position: 'relative', zIndex: 5,
      padding: 'clamp(12px, 2vh, 24px) clamp(16px, 3vw, 40px)',
      animation: 'contentReveal 0.5s ease 0.15s both',
    }}>
      <div style={{
        fontSize: 'clamp(72px, 12vw, 140px)', lineHeight: 1,
        animation: 'phasePop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.15s both, cfloat 4s ease-in-out 1s infinite',
        filter: 'drop-shadow(0 4px 18px rgba(251,191,36,0.45))',
      }}>🧩</div>
      <div style={{
        fontFamily: "'Nunito', system-ui, sans-serif",
        fontSize: 'clamp(56px, 10vw, 160px)', fontWeight: 900, lineHeight: 1,
        color: '#FBBF24',
        textAlign: 'center',
        letterSpacing: '-0.005em',
        textShadow:
          '0 0 14px rgba(251,191,36,0.65), ' +
          '0 0 40px rgba(251,191,36,0.45), ' +
          '0 0 96px rgba(251,191,36,0.25), ' +
          '0 5px 0 rgba(0,0,0,0.45), ' +
          '0 14px 28px rgba(0,0,0,0.55)',
        animation: 'phasePop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.3s both, qqCatTitleBreathe 4.5s ease-in-out 1.2s infinite',
      }}>
        {lang === 'de' ? 'Großes Finale' : 'Grand Finale'}
      </div>
      <div style={{
        fontSize: 'clamp(22px, 2.7vw, 38px)', fontWeight: 800,
        color: '#fde68aee', textAlign: 'center', lineHeight: 1.3, maxWidth: 1100,
        textShadow: '0 0 22px rgba(251,191,36,0.3)',
        animation: 'phasePop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.5s both',
      }}>
        {lang === 'de'
          ? 'Findet 4 Gruppen — gewinnt Felder fürs Spielfeld.'
          : 'Find 4 groups — earn cells on the board.'}
      </div>
      <div style={{
        display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 1100,
        animation: 'phasePop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.7s both',
      }}>
        <ConnectionsRulePill emoji="🎯" text={lang === 'de' ? '4 Begriffe → abgeben' : '4 terms → submit'} />
        <ConnectionsRulePill emoji="🏆" text={lang === 'de' ? '1 Gruppe = 1 Aktion' : '1 group = 1 action'} />
        <ConnectionsRulePill emoji="❌" text={lang === 'de' ? `${c.maxFailedAttempts} Fehler → raus` : `${c.maxFailedAttempts} fails → out`} />
        <ConnectionsRulePill emoji="⏱" text={lang === 'de' ? `${Math.floor(c.durationSec / 60)} Min` : `${Math.floor(c.durationSec / 60)} min`} />
      </div>
    </div>
  );
}

function ConnectionsRulePill({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 22px', borderRadius: 999,
      background: 'rgba(255,255,255,0.04)',
      border: '1.5px solid rgba(251,191,36,0.32)',
      fontSize: 'clamp(16px, 1.7vw, 22px)', fontWeight: 800, color: '#e2e8f0',
    }}>
      <span style={{ fontSize: 'clamp(20px, 2vw, 28px)' }}>{emoji}</span>
      <span>{text}</span>
    </div>
  );
}

function ConnectionsGrid({ state: s }: {
  state: QQStateUpdate;
}) {
  const c = s.connections!;
  const lang = useLangFlip(s.language);
  const isReveal = c.phase === 'reveal' || c.phase === 'placement';
  // SPOILER-SAFE: Auf dem Beamer wird NUR im Reveal eingefärbt. Während Active
  // bleibt alles neutral, sonst könnten Teams die noch tippen die Lösung
  // anderer Teams direkt auf dem Beamer ablesen.
  const itemToGroup = new Map<string, { id: string; idx: number; name: string; color: string }>();
  c.payload.groups.forEach((g, i) => {
    g.items.forEach(it => {
      itemToGroup.set(it, { id: g.id, idx: i, name: lang === 'de' ? g.name : (g.nameEn ?? g.name), color: CONNECTIONS_GROUP_COLORS[i] });
    });
  });

  // Bei reveal: gruppieren wir die items zeilenweise nach group-Reihenfolge
  let displayOrder = c.itemOrder;
  if (isReveal) {
    displayOrder = c.payload.groups.flatMap(g => g.items);
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 'clamp(8px, 1vw, 14px)',
      width: '100%', maxWidth: 1200, margin: '0 auto',
      position: 'relative', zIndex: 5,
    }}>
      {displayOrder.map((item, i) => {
        const grp = itemToGroup.get(item);
        const showColored = isReveal && !!grp;
        return (
          <div key={`${item}-${i}`} style={{
            padding: 'clamp(14px, 1.8vw, 22px) clamp(8px, 1vw, 14px)',
            borderRadius: 14,
            textAlign: 'center',
            fontSize: 'clamp(18px, 2vw, 28px)', fontWeight: 900,
            background: showColored && grp
              ? `linear-gradient(135deg, ${grp.color}38, ${grp.color}18)`
              : 'rgba(255,255,255,0.05)',
            border: showColored && grp
              ? `2px solid ${grp.color}`
              : '2px solid rgba(255,255,255,0.10)',
            color: showColored && grp ? '#fff' : '#e2e8f0',
            boxShadow: showColored && grp ? `0 0 18px ${grp.color}33` : 'none',
            minHeight: 'clamp(60px, 8vh, 100px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.3s ease',
            animation: isReveal ? `contentReveal 0.4s ease ${i * 0.04}s both` : undefined,
          }}>
            {item}
          </div>
        );
      })}
      {isReveal && (() => {
        // Spannungskurve: Avatare werden in REVERSE-Placement-Order eingeblendet
        // (letztes Team zuerst, top-Team zuletzt). Pro Team alle gefundenen
        // Gruppen GLEICHZEITIG poppen, dann nächstes Team. Pro Team-Step ~1s
        // damit man sieht wer gerade dran ist.
        // placementOrder ist sortiert nach (foundCount DESC, finishedAt ASC) —
        // also platzieren-Reihenfolge. Wir reversen für Spannung („und auf
        // Platz N kommt …, auf Platz N-1 kommt …, und auf Platz 1 …").
        const teamRevealSteps = [...c.placementOrder].reverse();
        // Teams die NICHT in placementOrder sind (0 Gruppen gefunden) kommen
        // zu Beginn (schwächste).
        const teamsWithGroups = new Set(c.placementOrder);
        const noGroupTeams = s.teams.filter(t => !teamsWithGroups.has(t.id) && c.teamProgress[t.id]).map(t => t.id);
        const fullRevealOrder = [...noGroupTeams, ...teamRevealSteps];
        // Pro Team: 1.0s Stepping-Delay + 0.4s Animation
        const teamStepMs = 1000;
        const baseDelay = 0.6; // nach Group-Cell-Reveal
        const teamRevealDelay = (teamId: string): number => {
          const idx = fullRevealOrder.indexOf(teamId);
          if (idx < 0) return baseDelay;
          return baseDelay + idx * (teamStepMs / 1000);
        };
        return (
          <div style={{
            gridColumn: '1 / -1',
            marginTop: 'clamp(8px, 1vh, 14px)',
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 'clamp(8px, 1vw, 14px)',
          }}>
            {c.payload.groups.map((g, i) => {
              const finders = s.teams.filter(t =>
                c.teamProgress[t.id]?.foundGroupIds.includes(g.id)
              );
              finders.sort((a, b) => {
                const ia = c.placementOrder.indexOf(a.id);
                const ib = c.placementOrder.indexOf(b.id);
                if (ia === -1 && ib === -1) return 0;
                if (ia === -1) return 1;
                if (ib === -1) return -1;
                return ia - ib;
              });
              const color = CONNECTIONS_GROUP_COLORS[i];
              return (
                <div key={g.id} style={{
                  padding: '10px 14px 14px', borderRadius: 12,
                  background: `${color}22`,
                  border: `1.5px solid ${color}`,
                  color: '#fff', fontWeight: 800, fontSize: 'clamp(13px, 1.3vw, 18px)',
                  textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  animation: `contentReveal 0.5s ease ${i * 0.06}s both`,
                }}>
                  <div style={{ lineHeight: 1.2 }}>
                    {lang === 'de' ? g.name : (g.nameEn ?? g.name)}
                  </div>
                  {finders.length > 0 && (
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
                      gap: 'clamp(4px, 0.5vw, 8px)',
                    }}>
                      {finders.map(tm => (
                        <div key={tm.id} title={tm.name} style={{
                          position: 'relative',
                          // Suspense: pro Team eigener Delay (worst→best),
                          // ALLE Gruppen eines Teams ploppen gleichzeitig.
                          animation: `phasePop 0.55s cubic-bezier(0.34,1.56,0.64,1) ${teamRevealDelay(tm.id)}s both`,
                        }}>
                          <QQTeamAvatar avatarId={tm.avatarId} size={'clamp(36px, 3.4vw, 52px)'} style={{
                            boxShadow: `0 0 0 2px ${tm.color}, 0 0 14px ${color}88`,
                          }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

/**
 * Antwort-Status-Reihe unten — gleicher Stil wie CHEESE/MUCHO/etc.:
 * Avatar mit kleinem Status-Badge unten rechts.
 *  - Aktiv aber noch keine Submit: dim
 *  - Mind. 1 Submit (Treffer ODER Fehler): grüner ✓
 *  - Lockout: roter ✕ mit Fail-Count
 *  - Sieger (4 Gruppen): goldener 🏁
 *  - Active Setz-Team in placement: grüner ×N-Badge
 */
function ConnectionsAnswerStatus({ state: s }: { state: QQStateUpdate }) {
  const c = s.connections!;
  const isPlacement = c.phase === 'placement';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 'clamp(10px, 1.6vw, 22px)', flexWrap: 'wrap',
      padding: 'clamp(8px, 1vh, 14px) clamp(12px, 1.4vw, 20px)',
      position: 'relative', zIndex: 5,
      animation: 'contentReveal 0.45s ease 0.2s both',
    }}>
      {s.teams.map((tm) => {
        const tp = c.teamProgress[tm.id];
        const found = tp?.foundGroupIds.length ?? 0;
        const fails = tp?.failedAttempts ?? 0;
        const locked = tp?.isLockedOut ?? false;
        const finished = (tp?.finishedAt ?? null) != null;
        const isWinner = found >= 4;
        const hasActivity = found > 0 || fails > 0;
        const isActiveTeam = isPlacement && c.placementOrder[c.placementCursor] === tm.id;
        // Dim wenn weder Aktivität noch fertig
        const dim = !hasActivity && !finished;
        return (
          <div key={tm.id} title={tm.name} style={{
            position: 'relative',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            opacity: dim ? 0.55 : 1,
            filter: dim ? 'grayscale(0.4)' : (locked ? 'grayscale(0.2)' : 'none'),
            transition: 'opacity 0.4s ease, filter 0.4s ease',
            animation: isActiveTeam ? 'activeTeamGlow 2s ease-in-out infinite' : undefined,
          }}>
            <QQTeamAvatar avatarId={tm.avatarId} size={'clamp(56px, 6vw, 84px)'} style={{
              background: '#0d0a06',
              boxShadow: isWinner
                ? '0 0 0 3px #FBBF24, 0 0 18px #FBBF2477, 0 4px 10px rgba(0,0,0,0.55)'
                : isActiveTeam
                  ? `0 0 0 2px ${tm.color}, 0 0 16px ${tm.color}aa`
                  : `0 0 0 2px ${tm.color}66, 0 4px 10px rgba(0,0,0,0.55)`,
            }} />
            {/* Status-Badge unten rechts */}
            {isWinner && (
              <div style={{
                position: 'absolute', bottom: -4, right: -4,
                width: 28, height: 28, borderRadius: '50%',
                background: '#FBBF24', border: '2px solid #0D0A06',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 900, lineHeight: 1,
                boxShadow: '0 0 14px rgba(251,191,36,0.55)',
                animation: 'bAnswerCheck 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
              }}>🏁</div>
            )}
            {!isWinner && locked && (
              <div style={{
                position: 'absolute', bottom: -4, right: -4,
                minWidth: 28, height: 28, padding: '0 6px', borderRadius: 14,
                background: '#EF4444', border: '2px solid #0D0A06',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 900, color: '#fff', lineHeight: 1,
                animation: 'bAnswerCheck 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
              }}>✕{fails}</div>
            )}
            {!isWinner && !locked && hasActivity && (
              <div style={{
                position: 'absolute', bottom: -4, right: -4,
                width: 28, height: 28, borderRadius: '50%',
                background: '#22C55E', border: '2px solid #0D0A06',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 900, color: '#fff', lineHeight: 1,
                animation: 'bAnswerCheck 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
              }}>✓</div>
            )}
            {/* Setz-×N-Pille während Placement */}
            {isActiveTeam && (
              <div style={{
                position: 'absolute', top: -10, left: '50%',
                transform: 'translateX(-50%)',
                padding: '2px 8px', borderRadius: 999,
                background: '#22C55E', color: '#0a1f0d',
                fontSize: 11, fontWeight: 900, letterSpacing: 0.4,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(34,197,94,0.55)',
              }}>×{c.placementRemaining}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME OVER — Notebook style
// ═══════════════════════════════════════════════════════════════════════════════

export function GameOverView({ state: s }: { state: QQStateUpdate; roomCode?: string }) {
  const lang = useLangFlip(s.language);
  // Tiebreak: bei Gleichstand auf largestConnected entscheidet totalCells;
  // ist auch das gleich, bleibt der Array-Order stabil (extrem unwahrscheinlich).
  const sorted = [...s.teams].sort((a, b) =>
    b.largestConnected - a.largestConnected
    || b.totalCells - a.totalCells
  );
  const winner = sorted[0];
  const winnerColor = winner?.color ?? '#F59E0B';

  // Layout: Variante B — 2-Spalten "Awards-Look".
  // Links: Grid riesig (volle Bildhoehe). Rechts: schmaler Side-Panel mit
  // Title, Hero (Trophy/Avatar/Name/Score) und alle anderen Teams in EINER
  // horizontalen Reihe darunter.
  return (
    <div style={{
      flex: 1, display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) clamp(360px, 32vw, 520px)',
      alignItems: 'stretch', gap: 'clamp(16px, 2vw, 36px)',
      position: 'relative', overflow: 'hidden',
      padding: 'clamp(16px, 2vh, 28px) clamp(20px, 2.5vw, 40px) clamp(20px, 2.5vh, 36px)',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 25% 50%, ${winnerColor}28 0%, transparent 55%), radial-gradient(ellipse at 80% 90%, rgba(234,179,8,0.10) 0%, transparent 50%)`,
      }} />

      {/* Confetti */}
      <ConfettiOverlay />
      <Fireflies color={`${winnerColor}55`} />

      {/* ── LINKE SPALTE: Grid riesig, full-height ─────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 5,
        animation: 'finaleWinner 0.9s cubic-bezier(0.22,1,0.36,1) 0.6s both',
        minWidth: 0,
      }}>
        <div style={{
          padding: 16, borderRadius: 26,
          background: 'rgba(255,255,255,0.03)',
          border: `2px solid ${winnerColor}55`,
          boxShadow: `0 0 60px ${winnerColor}33, 0 12px 40px rgba(0,0,0,0.5)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <GridDisplay
            state={s}
            maxSize={typeof window !== 'undefined'
              ? Math.min(window.innerHeight * 0.82, window.innerWidth * 0.55)
              : 700}
            highlightTeam={winner?.id ?? null}
            showJoker
          />
        </div>
      </div>

      {/* ── RECHTE SPALTE: Title + Hero + Rankings vertikal ────────────── */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-start',
        gap: 'clamp(8px, 1.2vh, 16px)',
        position: 'relative', zIndex: 5,
        minWidth: 0, paddingTop: 'clamp(8px, 1.5vh, 20px)',
      }}>
        {/* Title — klein, oben */}
        <div style={{
          fontSize: 'clamp(14px, 1.4vw, 18px)', fontWeight: 800,
          color: '#94a3b8', letterSpacing: '0.18em', textTransform: 'uppercase',
          animation: 'contentReveal 0.6s ease both',
        }}>
          {lang === 'en' ? 'Game Over' : 'Spielende'}
        </div>

        {/* Hero — Trophy + Avatar + Name + Score.
            User-Wunsch 2026-04-28: 'auflösen letztes team, dann vorletztes usw
            bis zum Sieger (den als letztes)'. Winner-Hero bekommt einen
            gestaffelten Delay basierend auf Anzahl Teams: jedes andere Team
            wird zuerst revealed, dann erst der Sieger. */}
        {winner && (() => {
          const otherCount = sorted.length - 1;
          // Pro anderem Team ~0.9s reveal-step, plus 0.6s Initial-Pause.
          const winnerHeroDelay = 0.6 + otherCount * 0.9;
          const trophyDelay = winnerHeroDelay + 0.5;
          const sparkleStartDelay = winnerHeroDelay + 1.0;
          const nameGlowDelay = winnerHeroDelay + 0.7;
          const scoreCountDelay = winnerHeroDelay + 0.9;
          const avatarShakeDelay = winnerHeroDelay + 0.4;
          const avatarBreatheDelay = winnerHeroDelay + 1.1;
          return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          animation: `finaleWinner 0.8s cubic-bezier(0.22,1,0.36,1) ${winnerHeroDelay}s both`,
        }}>
          <div style={{
            fontSize: 'clamp(28px, 3vw, 42px)',
            animation: `finaleStarBurst 0.5s ease ${trophyDelay}s both, finaleTrophyFloat 3.4s ease-in-out ${trophyDelay + 0.6}s infinite`,
          }}><QQEmojiIcon emoji="🏆"/></div>

          <div style={{ position: 'relative', display: 'inline-block', marginTop: 2 }}>
            <QQTeamAvatar avatarId={winner.avatarId} size={'clamp(80px, 8vw, 120px)'} style={{
              boxShadow: `0 0 60px ${winnerColor}66, 0 0 120px ${winnerColor}33`,
              animation: `celebShake 0.6s ease ${avatarShakeDelay}s both, finaleAvatarBreathe 4s ease-in-out ${avatarBreatheDelay}s infinite`,
            }} />
            {([
              { top: '-8%',  left: '12%', delay: 0.0, dur: 2.8, size: 'clamp(14px, 1.5vw, 22px)' },
              { top: '18%',  left: '-10%', delay: 0.6, dur: 3.2, size: 'clamp(12px, 1.3vw, 18px)' },
              { top: '60%',  left: '-6%', delay: 1.3, dur: 2.6, size: 'clamp(10px, 1.1vw, 16px)' },
              { top: '92%',  left: '32%', delay: 0.2, dur: 3.0, size: 'clamp(12px, 1.4vw, 20px)' },
              { top: '88%',  left: '78%', delay: 0.9, dur: 2.8, size: 'clamp(14px, 1.6vw, 22px)' },
              { top: '56%',  left: '102%', delay: 1.5, dur: 2.4, size: 'clamp(10px, 1.2vw, 16px)' },
              { top: '14%',  left: '96%', delay: 0.4, dur: 3.4, size: 'clamp(12px, 1.4vw, 18px)' },
              { top: '-6%',  left: '74%', delay: 1.1, dur: 2.6, size: 'clamp(14px, 1.5vw, 22px)' },
            ]).map((sp, i) => (
              <span key={i} style={{
                position: 'absolute',
                top: sp.top, left: sp.left,
                width: sp.size, height: sp.size,
                fontSize: sp.size,
                lineHeight: 1,
                color: '#FBBF24',
                textShadow: `0 0 12px ${winnerColor}, 0 0 4px rgba(255,255,255,0.6)`,
                animation: `finaleSparklePop ${sp.dur}s ease-in-out ${sparkleStartDelay + sp.delay}s infinite`,
                pointerEvents: 'none',
                zIndex: 6,
              }}>✦</span>
            ))}
          </div>

          <div title={winner.name} style={{
            fontSize: 'clamp(24px, 2.6vw, 38px)', fontWeight: 900,
            color: winnerColor,
            animation: `finaleGlow 3s ease-in-out ${nameGlowDelay}s infinite`,
            marginTop: 6,
            maxWidth: '90%',
            padding: '0 0.5em',
            whiteSpace: 'nowrap',
          }}>
            {truncName(winner.name, 16)}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            animation: `finaleScoreCount 0.7s cubic-bezier(0.34,1.4,0.64,1) ${scoreCountDelay}s both`,
          }}>
            <span style={{
              fontSize: 'clamp(13px, 1.4vw, 18px)', fontWeight: 900,
              color: '#EAB308',
              textShadow: '0 0 18px rgba(234,179,8,0.45)',
            }}>
              {winner.largestConnected} {lang === 'de' ? 'verbundene Felder' : 'connected fields'}
            </span>
          </div>
        </div>
          );
        })()}

        {/* Rankings — alle anderen Teams.
            User-Wunsch 2026-04-28:
            (1) Reveal-Reihenfolge: letztes Team zuerst, dann aufsteigend bis
                zum 2. Platz (Sieger erscheint als Climax danach via
                winnerHeroDelay). Index-basierte Animation reverse'd:
                letztes Team-Card animiert bei 0.6s, vorletzte bei 1.5s, etc.
            (2) Bei wenigen Teams (≤3 andere = 4 Teams insgesamt): vertikale
                Spalte unter dem Sieger statt horizontaler Row. */}
        {sorted.length > 1 && (() => {
          const others = sorted.slice(1);
          const wn = others.length;
          const useColumn = wn <= 3;
          // Avatar-Größe abhängig von Team-Zahl, damit alles in eine Reihe passt
          const avatarSize = useColumn ? 'clamp(50px, 4.6vw, 72px)'
                            : wn <= 5 ? 'clamp(40px, 3.6vw, 56px)'
                            : wn <= 7 ? 'clamp(34px, 3vw, 46px)'
                                       : 'clamp(28px, 2.4vw, 38px)';
          const nameFs   = useColumn ? 'clamp(13px, 1.4vw, 18px)' : wn <= 5 ? 'clamp(11px, 1.1vw, 14px)' : 'clamp(10px, 0.95vw, 12px)';
          const scoreFs  = useColumn ? 'clamp(16px, 1.7vw, 22px)' : wn <= 5 ? 'clamp(14px, 1.5vw, 20px)' : 'clamp(12px, 1.25vw, 16px)';
          const cardPad  = useColumn ? '10px 14px' : wn <= 5 ? '8px 6px' : '6px 4px';
          // Reverse-Reveal: letztes (höchster Index) zuerst, niedrigster (Silver) zuletzt.
          // Pro Team-Step ~0.9s.
          const revealStep = 0.9;
          return (
            <div style={{
              display: 'flex',
              flexDirection: useColumn ? 'column' : 'row',
              flexWrap: 'nowrap',
              alignItems: 'stretch',
              justifyContent: 'center',
              gap: useColumn ? 'clamp(6px, 1vh, 10px)' : (wn <= 4 ? 'clamp(8px, 1vw, 14px)' : 'clamp(4px, 0.6vw, 8px)'),
              width: '100%',
              marginTop: 'clamp(6px, 1vh, 14px)',
            }}>
              {others.map((tm, i) => {
                const rank = i + 2;
                const medal = rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
                // Reveal-Order: letztes Team zuerst (höchster i = niedrigster rank)
                const revealOrderIdx = (others.length - 1) - i;
                const revealDelay = 0.6 + revealOrderIdx * revealStep;
                return (
                  <div key={tm.id} style={{
                    flex: useColumn ? '0 0 auto' : '1 1 0',
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: useColumn ? 'row' : 'column',
                    alignItems: 'center',
                    gap: useColumn ? 12 : 4,
                    padding: cardPad,
                    borderRadius: 12,
                    background: `linear-gradient(${useColumn ? '90deg' : '180deg'}, ${tm.color}1a, ${tm.color}08)`,
                    border: `1.5px solid ${tm.color}55`,
                    boxShadow: `0 4px 14px rgba(0,0,0,0.35)`,
                    animation: `finaleRank 0.55s cubic-bezier(0.34,1.2,0.64,1) ${revealDelay}s both`,
                  }}>
                    <span style={{
                      fontSize: 'clamp(11px, 1.1vw, 14px)',
                      fontWeight: 900,
                      color: rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#94a3b8',
                      lineHeight: 1,
                    }}>
                      {medal ? <QQEmojiIcon emoji={medal}/> : `#${rank}`}
                    </span>
                    <QQTeamAvatar avatarId={tm.avatarId} size={avatarSize} />
                    <span title={tm.name} style={{
                      fontSize: nameFs,
                      fontWeight: 900, color: tm.color, lineHeight: 1.1,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      maxWidth: '100%',
                    }}>{tm.name}</span>
                    <span style={{
                      fontSize: scoreFs,
                      fontWeight: 900, color: '#FDE68A',
                      fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                    }}>
                      {tm.largestConnected}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export function ThanksView({ state: s, roomCode }: { state: QQStateUpdate; roomCode?: string }) {
  const lang = useLangFlip(s.language);
  const summaryUrl = typeof window !== 'undefined' && roomCode
    ? `${window.location.origin}/summary/${encodeURIComponent(roomCode)}`
    : '';
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '48px 64px', position: 'relative',
    }}>
      <Fireflies color="rgba(234,179,8,0.35)" />
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28,
        padding: '56px 72px', borderRadius: 36,
        background: 'linear-gradient(135deg, rgba(20,16,10,0.92), rgba(13,10,6,0.96))',
        border: '2px solid rgba(251,191,36,0.4)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 120px rgba(234,179,8,0.2), inset 0 1px 0 rgba(251,191,36,0.15)',
        maxWidth: 900,
        animation: 'contentReveal 0.6s ease both',
      }}>
        <div style={{
          fontSize: 'clamp(36px, 4.5vw, 64px)', fontWeight: 900,
          color: '#FBBF24', textAlign: 'center', lineHeight: 1.1,
          textShadow: '0 0 40px rgba(251,191,36,0.4)',
        }}>
          <QQEmojiIcon emoji="🎉"/> {lang === 'de' ? 'Wir hoffen, ihr hattet Spaß!' : 'We hope you had fun!'}
        </div>
        <div style={{
          fontSize: 'clamp(18px, 1.9vw, 24px)', fontWeight: 600,
          color: '#cbd5e1', textAlign: 'center', lineHeight: 1.45,
          maxWidth: 680,
        }}>
          {lang === 'de'
            ? '📣 Erzählt euren Freunden vom CozyQuiz — und scannt den Code für eure Team-Stats 🎁'
            : '📣 Tell your friends about CozyQuiz — and scan the code for your team stats 🎁'}
        </div>
        {summaryUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 36, marginTop: 4 }}>
            <div style={{
              padding: 14, borderRadius: 18,
              background: '#ffffff',
              boxShadow: '0 0 32px rgba(251,191,36,0.35), 0 4px 16px rgba(0,0,0,0.4)',
            }}>
              <QRCodeSVG value={summaryUrl} size={240} bgColor="#ffffff" fgColor="#0D0A06" level="M" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 340 }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#F8FAFC' }}>
                <QQEmojiIcon emoji="📱"/> {lang === 'de' ? 'Scannt euer Ergebnis' : 'Scan your result'}
              </div>
              <div style={{ fontSize: 17, color: '#94a3b8', lineHeight: 1.55, whiteSpace: 'pre-line' }}>
                {lang === 'de'
                  ? '• Eure Team-Stats\n• Feedback & Bugs\n• Nächste Quiz-Termine'
                  : '• Your team stats\n• Feedback & bugs\n• Upcoming events'}
              </div>
            </div>
          </div>
        )}
        {/* Prominent CozyWolf Signatur */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 22px', borderRadius: 999,
          background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(245,158,11,0.12))',
          border: '1.5px solid rgba(251,191,36,0.4)',
          boxShadow: '0 4px 18px rgba(0,0,0,0.4), 0 0 24px rgba(251,191,36,0.15)',
          marginTop: 4,
        }}>
          <img
            src="/logo.png"
            alt=""
            style={{ width: 32, height: 32, objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}
          />
          <span style={{
            fontSize: 16, fontWeight: 800, color: '#cbd5e1', letterSpacing: '0.06em',
          }}>
            {lang === 'de' ? 'ein' : 'a'}
          </span>
          <span style={{
            fontSize: 20, fontWeight: 900, color: '#FBBF24',
            letterSpacing: '0.04em',
            textShadow: '0 1px 2px rgba(0,0,0,0.6)',
          }}>
            CozyWolf
          </span>
          <span style={{
            fontSize: 16, fontWeight: 800, color: '#cbd5e1', letterSpacing: '0.06em',
          }}>
            {lang === 'de' ? 'Erlebnis' : 'experience'}
          </span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', justifyContent: 'center',
          fontSize: 15, color: 'rgba(251,191,36,0.75)', fontWeight: 800,
          letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>
          <span>play.cozyquiz.app</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>📸</span>
            @cozywolf.events
          </span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🐺</span>
            cozywolf.de
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

export function BeamerTimer({ endsAt, durationSec, accent }: { endsAt: number; durationSec: number; accent: string }) {
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
  const secs = Math.ceil(remaining);

  // Urgency levels
  const isAlert   = remaining <= 10 && remaining > 5;
  const isWarning = remaining <= 5 && remaining > 3;
  const isCritical = remaining <= 3;
  const isUrgent = remaining <= 10;

  const color = isCritical ? '#EF4444'
    : isWarning ? '#F97316'
    : isAlert ? '#F59E0B'
    : accent;

  // Hero timer: big ring
  const radius = 80;
  const stroke = isCritical ? 12 : isWarning ? 10 : 8;
  const sz = radius * 2 + stroke * 2 + 20; // extra for glow
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct / 100);

  const glowSize = isCritical ? 28 : isWarning ? 20 : isUrgent ? 14 : 8;
  const pulseAnim = isCritical ? 'bTimerPulse 0.5s ease-in-out infinite'
    : isWarning ? 'bTimerPulse 0.8s ease-in-out infinite'
    : undefined;

  return (
    <div style={{
      position: 'relative', width: sz, height: sz,
      animation: pulseAnim,
    }}>
      {/* Outer glow ring */}
      {isUrgent && (
        <div style={{
          position: 'absolute', inset: -8,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
          animation: 'bTimerGlow 1.5s ease-in-out infinite',
        }} />
      )}
      {/* SVG ring */}
      <svg width={sz} height={sz}
        style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
        {/* Background ring */}
        <circle cx={sz / 2} cy={sz / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        {/* Progress ring */}
        <circle cx={sz / 2} cy={sz / 2} r={radius}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s ease',
            filter: `drop-shadow(0 0 ${glowSize}px ${color}aa)`,
          }}
        />
      </svg>
      {/* Number in center */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900,
        fontSize: isCritical ? 'clamp(56px, 7vw, 88px)' : 'clamp(48px, 6vw, 76px)',
        color,
        textShadow: isUrgent ? `0 0 24px ${color}88` : `0 0 12px ${color}44`,
        fontVariantNumeric: 'tabular-nums',
        transition: 'font-size 0.3s ease, color 0.3s ease',
      }}>
        {secs}
      </div>
    </div>
  );
}

export function GridDisplay({ state: s, maxSize = 320, highlightTeam, showJoker = true, flashCellKey }: {
  state: QQStateUpdate; maxSize?: number; highlightTeam?: string | null; showJoker?: boolean; flashCellKey?: string | null;
}) {
  const lang = useLangFlip(s.language);
  const gap = 4;
  const cellSize = Math.floor((maxSize - (s.gridSize - 1) * gap) / s.gridSize);
  const activeTeam = s.teams.find(t => t.id === highlightTeam);
  const activeColor = activeTeam?.color ?? '#fff';

  // Track newly placed cells for pop animation (#5) + stolen cells + neighbor reactions + board shake
  const gridKey = s.grid.flatMap(row => row.map(c => `${c.ownerId ?? ''}`)).join(',');
  // Joker-formation-Diff: trackt cells die GERADE jokerFormed=true geworden sind,
  // damit sie kurz pulsieren (User-Wunsch 2026-04-28: Joker sichtbarer machen).
  const jokerKey = s.grid.flatMap(row => row.map(c => c.jokerFormed ? '1' : '0')).join('');
  const prevJokerKeyRef = useRef<string>(jokerKey);
  const justFormedJokerRef = useRef<Set<string>>(new Set());
  if (jokerKey !== prevJokerKeyRef.current) {
    const fresh = new Set<string>();
    s.grid.forEach((row, r) => row.forEach((cell, c) => {
      const idx = r * s.gridSize + c;
      const prevWas1 = prevJokerKeyRef.current[idx] === '1';
      if (cell.jokerFormed && !prevWas1) fresh.add(`${r}-${c}`);
    }));
    if (fresh.size > 0) {
      justFormedJokerRef.current = fresh;
      setTimeout(() => { justFormedJokerRef.current = new Set(); }, 2200);
    }
    prevJokerKeyRef.current = jokerKey;
  }
  // Initial-Snapshot = aktueller Stand, damit beim Mount KEIN Diff feuert
  // (sonst wuerde Zelle (0,0) als „neu" erkannt, weil ''.split(',') nur ein Element ergibt).
  const prevGridRef = useRef<string>(gridKey);
  const newCellsRef = useRef<Set<string>>(new Set());
  const stolenCellsRef = useRef<Set<string>>(new Set());
  const neighborCellsRef = useRef<Set<string>>(new Set());
  const [shakeTick, setShakeTick] = useState(0);
  if (gridKey !== prevGridRef.current) {
    const newSet = new Set<string>();
    const stolenSet = new Set<string>();
    const neighborSet = new Set<string>();
    const prevOwners = prevGridRef.current.split(',');
    s.grid.forEach((row, r) => row.forEach((cell, c) => {
      const prevOwner = prevOwners[(r * s.gridSize) + c];
      // Nur diffen wenn prevOwner definiert ist (sonst gab's im vorherigen
      // Snapshot diese Zelle gar nicht → kein echtes „neu gesetzt").
      if (prevOwner === undefined) return;
      if (cell.ownerId && prevOwner === '') newSet.add(`${r}-${c}`);
      else if (cell.ownerId && prevOwner && prevOwner !== cell.ownerId) stolenSet.add(`${r}-${c}`);
    }));
    // Collect 4-neighbors of any changed cell
    const changed = new Set<string>([...newSet, ...stolenSet]);
    for (const key of changed) {
      const [r, c] = key.split('-').map(Number);
      [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([nr, nc]) => {
        if (nr >= 0 && nr < s.gridSize && nc >= 0 && nc < s.gridSize && !changed.has(`${nr}-${nc}`)) {
          neighborSet.add(`${nr}-${nc}`);
        }
      });
    }
    newCellsRef.current = newSet;
    stolenCellsRef.current = stolenSet;
    neighborCellsRef.current = neighborSet;
    prevGridRef.current = gridKey;
    if (newSet.size > 0 || stolenSet.size > 0) {
      setShakeTick(t => t + 1);
      setTimeout(() => {
        newCellsRef.current = new Set();
        stolenCellsRef.current = new Set();
        neighborCellsRef.current = new Set();
      }, 1200);
    }
  }

  // Idle pulse: pick 2 random empty cells to softly pulse
  const [idleCells, setIdleCells] = useState<Set<string>>(new Set());
  useEffect(() => {
    const iv = setInterval(() => {
      const emptyCells: string[] = [];
      s.grid.forEach((row, r) => row.forEach((cell, c) => {
        if (!cell.ownerId) emptyCells.push(`${r}-${c}`);
      }));
      if (emptyCells.length === 0) { setIdleCells(new Set()); return; }
      const picked = new Set<string>();
      for (let i = 0; i < Math.min(2, emptyCells.length); i++) {
        const idx = Math.floor(Math.random() * emptyCells.length);
        picked.add(emptyCells.splice(idx, 1)[0]);
      }
      setIdleCells(picked);
    }, 2500);
    return () => clearInterval(iv);
  }, [s.grid]);

  return (
    <div style={{ animation: shakeTick > 0 ? 'boardShake 0.45s ease-out' : undefined }} key={`shake-${shakeTick}`}>
      {/* Grid — Border + Glow in Team-Farbe wenn ein Team gerade dran ist
          (PLACEMENT-Phase). User-Wunsch 2026-04-28: 'Grid soll die Glow-Farbe
          am Rand haben welches Team gerade setzt'. */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${s.gridSize}, ${cellSize}px)`,
        gap,
        background: 'rgba(255,255,255,0.03)',
        padding: 10, borderRadius: 18,
        border: `3px solid ${highlightTeam ? `${activeColor}cc` : 'rgba(255,255,255,0.06)'}`,
        boxShadow: highlightTeam
          ? `0 0 0 1px ${activeColor}66, 0 0 80px ${activeColor}55, 0 0 32px ${activeColor}88, inset 0 1px 0 rgba(255,255,255,0.04)`
          : '0 0 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
        animation: highlightTeam
          ? 'gridActiveTeamGlow 2.4s ease-in-out infinite'
          : 'gridIdle 4s ease-in-out infinite',
        transition: 'border-color 0.5s ease, box-shadow 0.5s ease',
        // CSS-Var für Animation-Pulse (Team-Color als Pulse-Farbe).
        ['--active-team-color' as any]: activeColor || 'transparent',
      }}>
        {s.grid.flatMap((row, r) =>
          row.map((cell, c) => {
            const team = s.teams.find(t => t.id === cell.ownerId);
            const isHighlighted = highlightTeam && team?.id === highlightTeam;
            const isNew = newCellsRef.current.has(`${r}-${c}`);
            const isStolen = stolenCellsRef.current.has(`${r}-${c}`);
            const isNeighbor = neighborCellsRef.current.has(`${r}-${c}`);
            const isFlash = flashCellKey === `${r}-${c}`;
            const isAccent = isNew || isStolen || isFlash;
            const showStar = showJoker && cell.jokerFormed;
            // Joker GERADE geformt → 2.2s Goldglow-Pulse als Beamer-Highlight.
            const isJustFormedJoker = justFormedJokerRef.current.has(`${r}-${c}`);
            const isFrozen = cell.frozen;
            const isStuck = cell.stuck;
            const isShielded = !!cell.shielded && !cell.stuck;
            const sandTtl = cell.sandLockTtl ?? 0;
            const isSandLocked = sandTtl > 0;
            const cellRadius = Math.max(4, cellSize * 0.16);
            return (
              <div key={`${r}-${c}`} style={{
                position: 'relative', overflow: 'visible',
                width: cellSize, height: cellSize, borderRadius: cellRadius,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: Math.max(8, cellSize * 0.42),
                zIndex: isJustFormedJoker ? 6 : (isAccent ? 5 : isStuck ? 4 : 1),
                // 3D-Lift fuer Stapel: Cell wird um 3px gehoben + bekommt einen
                // tiefen Drop-Shadow → wirkt physisch hoeher als die Nachbarn.
                transform: isStuck ? 'translateY(-3px)' : undefined,
                filter: isStuck
                  ? 'drop-shadow(0 5px 6px rgba(0,0,0,0.55)) drop-shadow(0 0 8px rgba(251,191,36,0.45))'
                  : undefined,
                transition: 'transform 0.4s cubic-bezier(0.34,1.4,0.64,1), filter 0.4s ease',
                animation: isJustFormedJoker
                  ? 'jokerCellPulse 2.2s cubic-bezier(0.4,0,0.2,1) both'
                  : isNeighbor ? 'cellNeighborDuck 0.45s ease-out 0.1s both' : undefined,
              }}>
                {/* Empty cell base — with idle pulse for alive feel */}
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: cellRadius,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  animation: !team && idleCells.has(`${r}-${c}`) ? 'cellIdlePulse 2.5s ease-in-out both' : undefined,
                }} />
                {/* Team color layer — ink fill for new cells, dim non-active teams */}
                {team && (() => {
                  const isActiveTeam = team.id === highlightTeam;
                  const isDimmed = highlightTeam && !isActiveTeam && !isAccent;
                  // Territorium-Fusion: gleiche Team-Nachbarn ermitteln
                  const tid = team.id;
                  const nTop    = s.grid[r - 1]?.[c]?.ownerId === tid;
                  const nRight  = s.grid[r]?.[c + 1]?.ownerId === tid;
                  const nBottom = s.grid[r + 1]?.[c]?.ownerId === tid;
                  const nLeft   = s.grid[r]?.[c - 1]?.ownerId === tid;
                  // Ecken eckig, wo eine anliegende Kante fusioniert (sonst cellRadius)
                  const rTL = (nTop    || nLeft ) ? 0 : cellRadius;
                  const rTR = (nTop    || nRight) ? 0 : cellRadius;
                  const rBR = (nBottom || nRight) ? 0 : cellRadius;
                  const rBL = (nBottom || nLeft ) ? 0 : cellRadius;
                  // Spezial-Cells (stuck/frozen/joker) behalten runde Kanten für eigenes Styling
                  const specialBorder = isStuck || isFrozen || isShielded || showStar;
                  const fusedRadius = specialBorder
                    ? cellRadius
                    : `${rTL}px ${rTR}px ${rBR}px ${rBL}px` as any;
                  // Default-Alpha auf nahezu voll deckend hochgezogen — vorher war
                  // ein Gradient mit max. 60% Alpha (color99 → color66), wodurch die
                  // Team-Farben auf dem dunklen BG durchscheinend pastellig wirkten
                  // und sich z.B. Pink / Rot / Orange kaum voneinander unterscheiden
                  // ließen. Jetzt: voll deckende Farbe mit minimalem Tonwert-Shading.
                  // Dimmed: Alpha leicht abgesenkt (statt 66/44 jetzt cc/a6),
                  // damit Team-Farben klar erkennbar bleiben. Zusätzlicher
                  // brightness/saturate-Filter wurde komplett entfernt.
                  const hexA = isHighlighted || isAccent ? 'ff' : isDimmed ? 'cc' : 'ff';
                  const hexB = isHighlighted || isAccent ? 'cc' : isDimmed ? 'a6' : 'd9';
                  const bridgeBg = `linear-gradient(135deg, ${team.color}${hexA}, ${team.color}${hexB})`;
                  const bridgeSpan = Math.max(6, cellSize - cellRadius * 2);
                  const bridgeOffset = cellRadius;
                  return (
                  <>
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: fusedRadius,
                    background: isStuck
                      ? `linear-gradient(135deg, ${team.color}ff, ${team.color}bb)`
                      : `linear-gradient(135deg, ${team.color}${hexA}, ${team.color}${hexB})`,
                    border: isStuck
                      ? '2px solid rgba(251,191,36,0.95)'
                      : showStar
                        ? '2px solid rgba(251,191,36,0.9)'
                        : isFrozen
                          ? 'none'
                          : `1px solid ${team.color}${isHighlighted || isAccent ? 'ff' : isDimmed ? '33' : '55'}`,
                    animation: (isNew || isStolen) ? 'cellInkFill 0.9s cubic-bezier(0.22,1,0.36,1) both' : undefined,
                    boxShadow: isStuck
                      ? `0 0 14px rgba(251,191,36,0.7), 0 0 6px rgba(251,191,36,0.4)`
                      : isAccent
                        ? `0 0 ${isFlash ? 28 : 24}px ${team.color}bb`
                        : showStar
                          ? '0 0 10px rgba(251,191,36,0.5)'
                          : isHighlighted
                              ? `0 0 14px ${team.color}88`
                              : 'none',
                    transition: 'box-shadow 0.4s ease, background 0.4s ease, border-color 0.4s ease',
                  }} />
                  {/* Territorium-Bridges: füllen den Grid-Gap zu gleichfarbigen
                      Nachbarn, damit „verbundene Felder" als eine Fläche wirken. */}
                  {nRight && (
                    <div style={{
                      position: 'absolute',
                      right: -gap - 1, top: bridgeOffset,
                      width: gap + 2, height: bridgeSpan,
                      background: bridgeBg,
                      zIndex: 2, pointerEvents: 'none',
                    }} />
                  )}
                  {nBottom && (
                    <div style={{
                      position: 'absolute',
                      bottom: -gap - 1, left: bridgeOffset,
                      height: gap + 2, width: bridgeSpan,
                      background: bridgeBg,
                      zIndex: 2, pointerEvents: 'none',
                    }} />
                  )}
                  </>
                  );
                })()}
                {/* Frozen overlay — ice tint + shimmer + frost corners */}
                {isFrozen && (
                  <>
                    {/* Base ice tint */}
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: cellRadius,
                      background: 'rgba(147,210,255,0.22)',
                      border: '2px solid rgba(147,210,255,0.8)',
                      animation: 'frostPulse 2.5s ease-in-out infinite',
                      pointerEvents: 'none', zIndex: 2,
                    }} />
                    {/* Shimmer streak */}
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: cellRadius,
                      background: 'linear-gradient(105deg, transparent 30%, rgba(200,230,255,0.35) 45%, rgba(255,255,255,0.45) 50%, rgba(200,230,255,0.35) 55%, transparent 70%)',
                      backgroundSize: '200% 100%',
                      animation: 'frostShimmer 3s ease-in-out infinite',
                      pointerEvents: 'none', zIndex: 3,
                    }} />
                    {/* Frost corner accents */}
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: cellRadius,
                      background: `
                        radial-gradient(circle at 10% 10%, rgba(200,230,255,0.5) 0%, transparent 35%),
                        radial-gradient(circle at 90% 10%, rgba(200,230,255,0.4) 0%, transparent 30%),
                        radial-gradient(circle at 10% 90%, rgba(200,230,255,0.4) 0%, transparent 30%),
                        radial-gradient(circle at 90% 90%, rgba(200,230,255,0.5) 0%, transparent 35%)
                      `,
                      pointerEvents: 'none', zIndex: 3,
                    }} />
                    {/* Frost-PNG badge top-right */}
                    <div style={{
                      position: 'absolute', top: -4, right: -4,
                      zIndex: 5, lineHeight: 0,
                      animation: 'frostCrystal 3s ease-in-out infinite',
                      filter: 'drop-shadow(0 0 3px rgba(147,210,255,0.8))',
                    }}>
                      <QQIcon slug="marker-frost" size={Math.max(14, cellSize * 0.42)} alt="Frost" />
                    </div>
                  </>
                )}
                {/* Stuck overlay — golden shimmer + ×2 chip top-right.
                    Chip droppt mit Bounce + Dust-Ring beim ersten Mount. */}
                {isStuck && (
                  <>
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: cellRadius,
                      background: 'linear-gradient(135deg, rgba(251,191,36,0.22), rgba(251,191,36,0.08))',
                      pointerEvents: 'none', zIndex: 1,
                    }} />
                    {/* Dust-Ring expandiert einmalig beim Setzen. */}
                    <div style={{
                      position: 'absolute', inset: -6, borderRadius: cellRadius + 6,
                      border: '2.5px solid rgba(245,158,11,0.8)',
                      animation: 'stapelDustRing 0.6s ease-out 0.1s both',
                      pointerEvents: 'none', zIndex: 3,
                    }} />
                    {/* ×2-Chip oben rechts — dezenter Marker. Pagoda mittig
                        war zu aufdringlich (klebte am Avatar); der Chip am
                        Cell-Rand laesst die Avatare frei und signalisiert
                        Wert + Schutz im Zusammenspiel mit dem 3D-Lift +
                        Gold-Border + Glow. */}
                    <div style={{
                      position: 'absolute', top: -4, right: -4,
                      minWidth: Math.max(16, cellSize * 0.32),
                      height: Math.max(16, cellSize * 0.32),
                      padding: `0 ${Math.max(3, cellSize * 0.05)}px`,
                      borderRadius: '999px',
                      background: 'linear-gradient(135deg, #FBBF24, #D97706)',
                      border: '2px solid #422006',
                      color: '#1c1304',
                      fontSize: Math.max(9, cellSize * 0.20),
                      fontWeight: 900,
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.35), 0 0 8px rgba(251,191,36,0.6)',
                      zIndex: 6,
                      fontVariantNumeric: 'tabular-nums',
                      animation: 'stapelDrop 0.6s cubic-bezier(0.34,1.56,0.64,1) both',
                    }}>×2</div>
                  </>
                )}
                {/* Bann-Overlay — purple tint + Sanduhr-PNG + Countdown auf der Zelle.
                    C7: Sanduhr droppt rein + tickt kontinuierlich. */}
                {isSandLocked && (
                  <>
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: cellRadius,
                      border: '2px solid rgba(168,85,247,0.85)',
                      background: 'linear-gradient(135deg, rgba(168,85,247,0.22), rgba(126,34,206,0.12))',
                      boxShadow: 'inset 0 0 16px rgba(168,85,247,0.4)',
                      animation: 'frostPulse 2.5s ease-in-out infinite',
                      pointerEvents: 'none', zIndex: 2,
                    }} />
                    {/* Sanduhr-PNG zentriert — Drop-Anim beim Mount + dauer-Tick. */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      pointerEvents: 'none', zIndex: 4,
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.45))',
                      animation: 'sanduhrDrop 0.65s cubic-bezier(0.34,1.56,0.64,1) both, sanduhrTick 2.5s ease-in-out 0.7s infinite',
                      transformOrigin: 'center',
                    }}>
                      <QQIcon slug="marker-sanduhr" size={Math.max(20, cellSize * 0.7)} alt="Bann" />
                    </div>
                    {/* Countdown-Chip oben rechts */}
                    <div style={{
                      position: 'absolute', top: -4, right: -4,
                      minWidth: Math.max(16, cellSize * 0.32),
                      height: Math.max(16, cellSize * 0.32),
                      padding: `0 ${Math.max(3, cellSize * 0.05)}px`,
                      borderRadius: '999px',
                      background: 'linear-gradient(135deg, #A855F7, #6B21A8)',
                      border: '2px solid #2E1065',
                      color: '#FFFFFF',
                      fontSize: Math.max(10, cellSize * 0.22),
                      fontWeight: 900,
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.35), 0 0 8px rgba(168,85,247,0.6)',
                      zIndex: 6,
                      fontVariantNumeric: 'tabular-nums',
                    }}>{sandTtl}</div>
                  </>
                )}
                {/* Shield overlay — goldener Ring mit shieldGlow-Puls.
                    Deutlich sichtbar aus Beamer-Distanz, Strategie klar. */}
                {isShielded && (
                  <>
                    <div style={{
                      position: 'absolute', inset: -2, borderRadius: cellRadius + 2,
                      border: '2.5px solid rgba(251,191,36,0.9)',
                      background: 'rgba(251,191,36,0.14)',
                      animation: 'shieldGlow 2s ease-in-out infinite',
                      pointerEvents: 'none', zIndex: 2,
                    }} />
                    <div style={{
                      position: 'absolute', top: -5, right: -5,
                      zIndex: 5, lineHeight: 0,
                      filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.9))',
                    }}>
                      <QQIcon slug="marker-shield" size={Math.max(16, cellSize * 0.48)} alt="Schild" />
                    </div>
                  </>
                )}
                {/* Steal shatter — flying shards from stolen cell */}
                {isStolen && [0, 1, 2, 3, 4, 5, 6, 7].map(i => {
                  const angle = i * 45 + Math.random() * 20;
                  const dist = cellSize * (0.7 + Math.random() * 0.5);
                  const shx = `${Math.cos(angle * Math.PI / 180) * dist}px`;
                  const shy = `${Math.sin(angle * Math.PI / 180) * dist}px`;
                  const shr = `${(Math.random() * 360 - 180).toFixed(0)}deg`;
                  return (
                    <div key={`sh-${i}`} style={{
                      position: 'absolute',
                      width: Math.max(4, cellSize * 0.14), height: Math.max(4, cellSize * 0.14),
                      borderRadius: 2,
                      background: team?.color ?? '#fff',
                      top: '50%', left: '50%',
                      marginTop: -Math.max(2, cellSize * 0.07),
                      marginLeft: -Math.max(2, cellSize * 0.07),
                      ['--shx' as string]: shx, ['--shy' as string]: shy, ['--shr' as string]: shr,
                      animation: `cellShard 0.7s ease-out ${0.05 + i * 0.02}s both`,
                      pointerEvents: 'none', zIndex: 6,
                      boxShadow: `0 0 8px ${team?.color ?? '#fff'}`,
                    }} />
                  );
                })}
                {/* Shockwave rings on new cells */}
                {(isNew || isStolen) && (
                  <>
                    <div style={{
                      position: 'absolute', inset: -6, borderRadius: cellRadius + 6,
                      border: `2.5px solid ${team?.color ?? '#fff'}88`,
                      animation: 'cellShockwave 0.7s ease-out both',
                      pointerEvents: 'none',
                    }} />
                    <div style={{
                      position: 'absolute', inset: -4, borderRadius: cellRadius + 4,
                      border: `1.5px solid ${team?.color ?? '#fff'}44`,
                      animation: 'cellShockwave 0.9s ease-out 0.15s both',
                      pointerEvents: 'none',
                    }} />
                  </>
                )}
                {/* Sparkle particles on new cells */}
                {(isNew || isStolen) && [0, 1, 2, 3, 4, 5].map(i => {
                  const angle = i * 60;
                  const dist = cellSize * 0.6;
                  const sx = `${Math.cos(angle * Math.PI / 180) * dist}px`;
                  const sy = `${Math.sin(angle * Math.PI / 180) * dist}px`;
                  return (
                    <div key={`sp-${i}`} style={{
                      position: 'absolute',
                      width: 4, height: 4, borderRadius: '50%',
                      background: team?.color ?? '#fff',
                      top: '50%', left: '50%', marginTop: -2, marginLeft: -2,
                      ['--sx' as string]: sx, ['--sy' as string]: sy,
                      animation: `cellSparkle 0.6s ease-out ${0.1 + i * 0.04}s both`,
                      pointerEvents: 'none', zIndex: 3,
                    }} />
                  );
                })}
                {/* Flash ring */}
                {isFlash && !isNew && (
                  <div style={{
                    position: 'absolute', inset: -4, borderRadius: cellRadius + 3,
                    border: `2px solid ${team?.color ?? '#fff'}88`,
                    animation: 'cellShockwave 1s ease-out 2',
                    pointerEvents: 'none',
                  }} />
                )}
                {/* Emoji / star content */}
                <div style={{
                  position: 'relative', zIndex: 4,
                  animation: (isNew || isStolen) ? 'cellEmojiDrop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both' : undefined,
                  opacity: isFrozen ? 0.55 : undefined,
                  filter: isFrozen ? 'saturate(0.4) brightness(1.2)' : undefined,
                }}>
                  {showStar ? <QQEmojiIcon emoji="⭐"/> : (team && (() => {
                    const avSize = Math.max(8, cellSize * 0.86);
                    const discSize = Math.max(10, cellSize * 0.92);
                    // Stuck → Doppel-Ring in Gold um die Avatar-Scheibe (×2 Indikator).
                    const stuckRing = isStuck
                      ? '0 0 0 2px rgba(251,191,36,0.95), 0 0 0 4px #0b1220, 0 0 0 6px rgba(251,191,36,0.85), inset 0 0 0 1px rgba(0,0,0,0.55)'
                      : 'inset 0 0 0 1px rgba(0,0,0,0.55)';
                    return (
                      <div style={{
                        position: 'relative', width: discSize, height: discSize,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {/* Dunkle Scheibe hinter dem Avatar — sorgt für Kontrast,
                            damit transparente Bereiche im PNG nicht in die Teamfarbe
                            verschwimmen. Square-Ecken bleiben teamfarbig. */}
                        <div style={{
                          position: 'absolute', inset: 0, borderRadius: '50%',
                          background: '#0b1220',
                          boxShadow: stuckRing,
                        }} />
                        <div style={{ position: 'relative', zIndex: 1 }}>
                          <QQTeamAvatar avatarId={team.avatarId} size={avSize} />
                        </div>
                      </div>
                    );
                  })())}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function MiniGrid({ state: s, size }: { state: QQStateUpdate; size: number }) {
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

export function ScoreBar({ teams, activeTeamId, teamPhaseStats, correctTeamId, activeActionLabel, activeActionDesc }: {
  teams: QQStateUpdate['teams'];
  activeTeamId?: string | null;
  teamPhaseStats?: QQStateUpdate['teamPhaseStats'];
  correctTeamId?: string | null;
  activeActionLabel?: string;
  activeActionDesc?: string;
}) {
  const sorted = [...teams].sort((a, b) => b.largestConnected - a.largestConnected);
  const prevScores = useRef<Record<string, number>>({});
  const prevJokers = useRef<Record<string, number>>({});
  const prevRanks = useRef<Record<string, number>>({});
  const [poppedIds, setPoppedIds] = useState<Set<string>>(new Set());
  const [floaters, setFloaters] = useState<{ id: string; teamId: string; diff: number }[]>([]);
  // F2: Rank-Change-Indikator (up/down Pfeil pro Team).
  const [rankChanges, setRankChanges] = useState<Record<string, 'up' | 'down'>>({});
  // FLIP-Animation für Row-Reorder (User-Wunsch 2026-04-28: 'Swap zu schnell,
  // smoother darstellen'). Snapshotted Positionen vor dem Re-Render → nach
  // dem Re-Render Inverse-Transform anwenden, dann zur Identität animieren.
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevRowPositions = useRef<Record<string, number>>({});
  useLayoutEffect(() => {
    const els = rowRefs.current;
    Object.entries(els).forEach(([id, el]) => {
      if (!el) return;
      const newTop = el.offsetTop;
      const oldTop = prevRowPositions.current[id];
      if (oldTop != null && oldTop !== newTop) {
        const dy = oldTop - newTop;
        // Inverse-Transform sofort, ohne Transition, dann zur Identität animieren
        el.style.transition = 'none';
        el.style.transform = `translateY(${dy}px)`;
        // Zwei rAFs → erlaubt dem Browser den initialen Stil zu setzen,
        // bevor die Transition aktiviert wird (verhindert dass die Animation
        // weggesnappt wird).
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.style.transition = 'transform 0.7s cubic-bezier(0.34,1.05,0.5,1)';
            el.style.transform = 'translateY(0)';
          });
        });
      }
      prevRowPositions.current[id] = newTop;
    });
  });
  useEffect(() => {
    const next: Record<string, 'up' | 'down'> = {};
    sorted.forEach((t, i) => {
      const prevIdx = prevRanks.current[t.id];
      if (prevIdx != null && prevIdx !== i) {
        next[t.id] = prevIdx > i ? 'up' : 'down';
      }
      prevRanks.current[t.id] = i;
    });
    if (Object.keys(next).length > 0) {
      setRankChanges(next);
      setTimeout(() => setRankChanges({}), 1200);
    }
  }, [sorted.map(t => t.id).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  // B2: Teams mit gerade verdientem Joker — triggert Stern-Flug-Animation
  const [jokerEarners, setJokerEarners] = useState<Set<string>>(new Set());
  // C2: Streak-Counter pro Team (wie oft hintereinander correctTeamId).
  // Wechselt der correctTeamId auf ein neues nicht-null Team: dessen Counter++
  // und alle anderen → 0. Null (niemand richtig) tastet keine Counter.
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const prevCorrectRef = useRef<string | null>(null);
  useEffect(() => {
    const cur = correctTeamId ?? null;
    if (!cur) return;
    if (cur === prevCorrectRef.current) return;
    prevCorrectRef.current = cur;
    setStreaks(s => {
      const next: Record<string, number> = {};
      for (const t of teams) next[t.id] = t.id === cur ? (s[t.id] ?? 0) + 1 : 0;
      return next;
    });
  }, [correctTeamId, teams]);

  useEffect(() => {
    const newPopped = new Set<string>();
    const newFloaters: typeof floaters = [];
    for (const t of teams) {
      const prev = prevScores.current[t.id] ?? 0;
      if (t.largestConnected > prev && prev > 0) {
        newPopped.add(t.id);
        newFloaters.push({ id: `${t.id}-${Date.now()}`, teamId: t.id, diff: t.largestConnected - prev });
      }
      prevScores.current[t.id] = t.largestConnected;
    }
    if (newPopped.size > 0) {
      setPoppedIds(newPopped);
      setFloaters(f => [...f, ...newFloaters]);
      setTimeout(() => setPoppedIds(new Set()), 500);
      setTimeout(() => setFloaters(f => f.filter(fl => !newFloaters.includes(fl))), 1200);
    }
  }, [teams]);

  // B2: jokersEarned tracking pro Team. Beim Anstieg: Stern fliegt auf Avatar.
  useEffect(() => {
    if (!teamPhaseStats) return;
    const newEarners = new Set<string>();
    for (const t of teams) {
      const now = teamPhaseStats[t.id]?.jokersEarned ?? 0;
      const before = prevJokers.current[t.id] ?? 0;
      if (now > before) newEarners.add(t.id);
      prevJokers.current[t.id] = now;
    }
    if (newEarners.size > 0) {
      setJokerEarners(newEarners);
      setTimeout(() => setJokerEarners(new Set()), 1600);
    }
  }, [teams, teamPhaseStats]);

  // Bei vielen Teams (≥6) kompakter, sonst passen 8 Zeilen nicht nebeneinander.
  // Balken ist raus — Info steckt in der Zahl. Dafür Name + Wert deutlich größer.
  const dense = sorted.length >= 6;
  const avatarSize = dense ? 64 : 78;
  const avatarBox = dense ? 76 : 92;
  const nameFs = dense ? 34 : 42;
  const valFs = dense ? 42 : 54;
  const unitFs = dense ? 18 : 22;

  // Medaillen-Style für Top 3 (nur wenn Wert > 0 und eindeutig).
  const medalFor = (i: number, val: number): string | null => {
    if (val === 0) return null;
    if (i === 0) return '🥇';
    if (i === 1 && sorted[1].largestConnected < sorted[0].largestConnected) return '🥈';
    if (i === 2 && sorted[2].largestConnected < (sorted[1]?.largestConnected ?? 0)) return '🥉';
    return null;
  };

  // Bei 8 Teams: space-between, damit alle Zeilen in die Grid-Höhe passen.
  // Bei ≤6 Teams: mittig zentriert wie eine Rangliste, mit festem Row-Gap
  // statt auseinandergezogen — wirkt sonst wie fehlende Daten.
  const many = sorted.length >= 7;
  const rowGap = dense ? 18 : 26;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      justifyContent: many ? 'space-between' : 'center',
      gap: many ? 0 : rowGap,
      width: '100%', maxWidth: 560, height: '100%',
      paddingTop: dense ? 4 : 8, paddingBottom: dense ? 4 : 8,
    }}>
      {sorted.map((t, i) => {
        const isLeader = i === 0 && t.largestConnected > 0;
        const isActive = t.id === activeTeamId;
        const medal = medalFor(i, t.largestConnected);
        return (
        <div
          key={t.id}
          ref={el => { rowRefs.current[t.id] = el; }}
          style={{
          display: 'flex', alignItems: 'center', gap: dense ? 14 : 18,
          animation: poppedIds.has(t.id) ? 'scorePop 0.5s ease both' : undefined,
          opacity: activeTeamId && !isActive ? 0.42 : 1,
          // Aktives Team: prominenter Box-Ring + Puls, wegen Banner-Wegfall.
          padding: isActive ? (dense ? '6px 10px' : '8px 14px') : '0',
          borderRadius: isActive ? 16 : 0,
          background: isActive ? `linear-gradient(135deg, ${t.color}22, ${t.color}08)` : 'transparent',
          border: isActive ? `2px solid ${t.color}` : '2px solid transparent',
          boxShadow: isActive ? `0 0 28px ${t.color}55, 0 0 60px ${t.color}22, inset 0 0 12px ${t.color}18` : 'none',
          // transition: nur opacity/padding/background/box-shadow — die transform-
          // transition wird im FLIP-Hook on-the-fly gesetzt.
          transition: 'opacity 0.3s ease, padding 0.3s ease, background 0.3s ease, box-shadow 0.4s ease',
          position: 'relative', overflow: 'visible',
          willChange: 'transform',
        }}>
          {/* Hot-Seat-Spotlight wurde entfernt (Wolfs Wunsch) — der Box-Ring
              + Border am Container reichen als visueller Anker für das aktive
              Team. Animationen `hotSeatFlicker` / `hotSeatGlitter` bleiben in
              der CSS, falls später wieder gewünscht. */}
          <div style={{ width: avatarBox, textAlign: 'center', flexShrink: 0 }}>
            <span style={{
              position: 'relative', display: 'inline-block',
              // B2 Impact-Pulse: wenn Team gerade Joker verdient hat, Avatar pulsiert 1x
              animation: jokerEarners.has(t.id)
                ? 'jokerImpactPulse 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.85s both'
                : undefined,
              borderRadius: '50%',
            }}>
              <QQTeamAvatar avatarId={t.avatarId} size={avatarSize} />
              {isLeader && (
                <span style={{
                  position: 'absolute',
                  top: dense ? -12 : -16,
                  left: '50%',
                  transform: 'translateX(-50%) rotate(-14deg)',
                  fontSize: dense ? 24 : 30,
                  pointerEvents: 'none',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                }}>👑</span>
              )}
              {/* B2 Joker-Badge (persistent): ⭐{n} unten rechts am Avatar.
                  Zeigt VERFÜGBARE Joker (REMAINING), nicht earned-counter — sonst
                  bleibt der Stern selbst nach Verbrauch sichtbar und User denkt
                  "ich hab noch Joker". jokersEarned ist game-wide-cap (max 2),
                  jeder earned-Joker wird sofort als Bonus-Placement konsumiert.
                  Im Team-View werden 2 Slots gezeigt mit gray-out — auf dem Beamer
                  reicht "wieviele sind noch verfügbar". */}
              {(() => {
                const earned = teamPhaseStats?.[t.id]?.jokersEarned ?? 0;
                const remaining = QQ_MAX_JOKERS_PER_GAME - earned;
                if (remaining <= 0) return null;
                return (
                  <span style={{
                    position: 'absolute',
                    bottom: dense ? -4 : -6,
                    right: dense ? -6 : -8,
                    padding: '2px 7px',
                    borderRadius: 999,
                    background: '#0d0a06',
                    border: '2px solid #FBBF24',
                    fontSize: dense ? 13 : 16,
                    fontWeight: 900,
                    color: '#FBBF24',
                    lineHeight: 1,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.55), 0 0 12px rgba(251,191,36,0.5)',
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    pointerEvents: 'none',
                  }}><QQEmojiIcon emoji="⭐"/>{remaining}</span>
                );
              })()}
              {/* B2 Stern-Flug: fliegt von oben rein auf Avatar wenn gerade verdient */}
              {jokerEarners.has(t.id) && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: 0, left: '50%',
                    transform: 'translate(-50%, -30px)',
                    fontSize: dense ? 36 : 44,
                    lineHeight: 1,
                    pointerEvents: 'none',
                    filter: 'drop-shadow(0 0 12px rgba(251,191,36,0.9)) drop-shadow(0 0 24px rgba(251,191,36,0.5))',
                    ['--jk-dx' as string]: '0px',
                    ['--jk-dy' as string]: '40px',
                    animation: 'jokerStarFly 0.9s cubic-bezier(0.34,1.5,0.64,1) both',
                    zIndex: 10,
                  }}
                ><QQEmojiIcon emoji="⭐"/></span>
              )}
              {/* C2 Streak: Feuer-Emoji links oben ab 3 richtigen in Folge. */}
              {(streaks[t.id] ?? 0) >= 3 && (
                <span aria-hidden style={{
                  position: 'absolute',
                  top: dense ? -10 : -14,
                  left: dense ? -6 : -8,
                  fontSize: dense ? 22 : 28,
                  pointerEvents: 'none',
                  filter: 'drop-shadow(0 0 8px rgba(251,146,60,0.9)) drop-shadow(0 0 14px rgba(239,68,68,0.5))',
                  animation: 'streakFlameWobble 0.7s ease-in-out infinite',
                  zIndex: 9,
                }} title={`${streaks[t.id]}x in Folge`}><QQEmojiIcon emoji="🔥"/></span>
              )}
              {/* F2 Rank-Change-Pfeile entfernt 2026-04-28 (User-Wunsch:
                  "die kleinen pfeile sind weird"). Der Swap selber
                  läuft jetzt smooth via FLIP-Animation auf der Row (siehe
                  useLayoutEffect rowRefs unten) — das vermittelt die
                  Rang-Änderung visuell ohne extra Indikator. */}
              {false && rankChanges[t.id] && (
                <span aria-hidden style={{
                  position: 'absolute',
                  top: '50%',
                  right: dense ? -18 : -22,
                  transform: 'translateY(-50%)',
                  fontSize: dense ? 18 : 22, fontWeight: 900,
                  color: rankChanges[t.id] === 'up' ? '#22C55E' : '#EF4444',
                  pointerEvents: 'none',
                  filter: `drop-shadow(0 0 6px ${rankChanges[t.id] === 'up' ? 'rgba(34,197,94,0.8)' : 'rgba(239,68,68,0.7)'})`,
                  animation: 'voterSlotDrop 1.2s cubic-bezier(0.34,1.56,0.64,1) both',
                  zIndex: 9,
                }}>{rankChanges[t.id] === 'up' ? '▲' : '▼'}</span>
              )}
            </span>
          </div>
          {/* Name + (nur beim aktiven Team) Aktions-Pill darunter — ersetzt den
              weggefallenen Placement-Banner. */}
          <div style={{
            flex: 1, minWidth: 0,
            display: 'flex', flexDirection: 'column', gap: isActive && activeActionLabel ? 4 : 0,
          }}>
            <span style={{
              fontSize: nameFs, fontWeight: 900, color: t.color,
              textShadow: isActive ? `0 0 16px ${t.color}66` : 'none',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{t.name}</span>
            {isActive && activeActionLabel && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                alignSelf: 'flex-start',
                padding: '3px 10px', borderRadius: 999,
                background: 'rgba(0,0,0,0.45)',
                border: `1.5px solid ${t.color}88`,
                fontSize: dense ? 14 : 16, fontWeight: 900,
                color: '#fde68a',
                animation: 'tcpulse 1.6s ease-in-out infinite',
                ['--c' as string]: `${t.color}66`,
              }}>
                <span>{activeActionLabel}</span>
                {activeActionDesc && (
                  <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: dense ? 12 : 13 }}>
                    {activeActionDesc}
                  </span>
                )}
              </div>
            )}
          </div>
          {/* Wert — prominent rechts mit Medaille für Top 3 */}
          <div style={{
            position: 'relative',
            display: 'flex', alignItems: 'baseline', gap: 10,
            flexShrink: 0,
          }}>
            {/* Medal-Slot mit fixer Breite — ohne Medaille trotzdem Platzhalter,
                damit die Zahlen-Spalte rechts fuer ALLE Teams gleich ausgerichtet ist. */}
            <span style={{
              width: dense ? 32 : 38,
              flexShrink: 0,
              textAlign: 'center',
              fontSize: dense ? 22 : 28, lineHeight: 1,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>{medal ? <QQEmojiIcon emoji={medal}/> : null}</span>
            <span style={{
              fontSize: valFs, color: isLeader ? '#FBBF24' : '#F1F5F9', fontWeight: 900,
              textShadow: isLeader ? '0 0 18px rgba(251,191,36,0.55)' : 'none',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
              // Zahlen-Spalte breit genug fuer 2-stellige Werte (10+) — vorher
              // floss die '0' optisch ins Wort 'Felder' rein, weil die Spalte
              // (38/48px) bei zweistelliger Zahl ueberlief und der Text in den
              // Folge-Slot reinragte. Jetzt 56/72 → beide Stellen passen rein,
              // gap auf 10 sichert weiter Abstand zum Wort.
              width: dense ? 56 : 72,
              textAlign: 'right',
              flexShrink: 0,
            }}>
              {t.largestConnected}
            </span>
            {/* Unit-Slot mit fester Breite → „Feld" (Singular) und „Felder" (Plural)
                starten beide an derselben linken Kante. Ohne das wackelt die
                Zahlen-Spalte rechts bei 1 Feld vs. 6 Felder. */}
            <span style={{
              opacity: 0.5, fontSize: unitFs, fontWeight: 700, color: '#94a3b8',
              flexShrink: 0,
              minWidth: dense ? 62 : 78,
              textAlign: 'left',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {t.largestConnected === 1 ? 'Feld' : 'Felder'}
            </span>
            {/* Float +N — knapp über der Zahl */}
            {floaters.filter(f => f.teamId === t.id).map(f => (
              <div key={f.id} style={{
                position: 'absolute', right: 0, top: -28,
                fontWeight: 900, fontSize: dense ? 22 : 28, color: t.color,
                animation: 'scoreFloat 1.0s ease-out both',
                pointerEvents: 'none',
                textShadow: `0 0 10px ${t.color}88`,
              }}>+{f.diff}</div>
            ))}
          </div>
        </div>
        );
      })}
    </div>
  );
}

// I1 Kategorie-Partikel: subtile Emoji-Glyphen-Drift pro Kategorie.
// Nur in QUESTION_ACTIVE sichtbar, laeuft mit ffmove-Animation.
const CAT_PARTICLE_GLYPHS: Record<string, string[]> = {
  SCHAETZCHEN:   ['1', '2', '3', '?', '∞'],
  MUCHO:         ['A', 'B', 'C', 'D'],
  BUNTE_TUETE:   ['🎲', '🎁', '⭐'],
  ZEHN_VON_ZEHN: ['5', '10', '⚡'],
  CHEESE:        ['📸', '🔍'],
};
export const CategoryParticles = memo(function CategoryParticles({ category, color }: { category?: string; color?: string }) {
  const glyphs = category ? CAT_PARTICLE_GLYPHS[category] : undefined;
  if (!glyphs) return null;
  const c = color ?? '#FEF08A';
  return (
    <>
      {FF.slice(0, 10).map((f, i) => {
        const glyph = glyphs[i % glyphs.length];
        return (
          <div key={`${category}-${i}`} aria-hidden style={{
            position: 'absolute', pointerEvents: 'none', zIndex: 2,
            left: `${f.x}%`, top: `${f.y}%`,
            fontSize: 22, fontWeight: 900,
            color: c, opacity: 0.12,
            textShadow: `0 0 12px ${c}66`,
            ['--dx' as string]: `${f.dx}px`,
            ['--dy' as string]: `${f.dy}px`,
            ['--dur' as string]: `${f.dur * 1.5}s`,
            ['--del' as string]: `${f.del}s`,
            animation: `ffmove var(--dur,8s) ease-in-out var(--del,0s) infinite`,
            willChange: 'transform, opacity',
          }}>{glyph}</div>
        );
      })}
    </>
  );
});

export const Fireflies = memo(function Fireflies({ color }: { color?: string } = {}) {
  const c = color ?? '#FEF08A';
  return (
    <>
      {FF.map((f, i) => (
        <div key={i} style={{
          position: 'absolute', pointerEvents: 'none', zIndex: 2,
          left: `${f.x}%`, top: `${f.y}%`,
          width: 5, height: 5, borderRadius: '50%',
          background: c,
          boxShadow: `0 0 6px 2px ${c}bb`,
          ['--dx' as string]: `${f.dx}px`,
          ['--dy' as string]: `${f.dy}px`,
          ['--dur' as string]: `${f.dur}s`,
          ['--del' as string]: `${f.del}s`,
          animation: `ffmove var(--dur,6s) ease-in-out var(--del,0s) infinite`,
          willChange: 'transform, opacity',
        }} />
      ))}
    </>
  );
});

function ComebackOption({ icon, label, desc, color, cardBg: bg }: { icon: string; label: string; desc: string; color: string; cardBg?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 24, padding: '28px 36px', borderRadius: 22,
      background: bg ?? '#1B1510',
      border: `2px solid ${color}44`,
      boxShadow: `0 6px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04), 0 0 30px ${color}12`,
      flex: '1 1 0', minWidth: 200,
    }}>
      <span style={{ fontSize: 48, lineHeight: 1 }}><QQEmojiIcon emoji={icon}/></span>
      <div>
        <div style={{ fontWeight: 900, color, fontSize: 'clamp(22px, 2.5vw, 30px)' }}>{label}</div>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 'clamp(17px, 1.8vw, 22px)', color: '#94a3b8', marginTop: 4 }}>{desc}</div>
      </div>
    </div>
  );
}

function LoadingScreen({ roomCode, connected }: { roomCode: string; connected: boolean }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#0D0A06',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Nunito', system-ui, sans-serif", color: '#e2e8f0',
    }}>
      <style>{BEAMER_CSS}</style>
      <Fireflies />
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 5 }}>
        <div style={{
          fontFamily: "'Nunito', sans-serif",
          fontSize: 32, fontWeight: 900, marginBottom: 8,
          background: 'linear-gradient(135deg, #e2e8f0, #94a3b8)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          CozyQuiz
        </div>
        <div style={{ color: '#334155', marginBottom: 16, fontWeight: 700 }}>{bt.loading.room.de}: {roomCode}</div>
        <div style={{ fontSize: 13, color: connected ? '#22C55E' : '#EF4444', fontWeight: 700 }}>
          {connected ? bt.loading.waiting.de : bt.loading.connecting.de}
        </div>
      </div>
    </div>
  );
}
