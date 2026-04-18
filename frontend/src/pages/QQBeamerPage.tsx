import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQQSocket } from '../hooks/useQQSocket';
import {
  QQStateUpdate, QQ_CATEGORY_LABELS, qqGetAvatar, QQCategory,
  QQQuestionImage,
  QQSlideTemplates,
  QQLanguage,
} from '../../../shared/quarterQuizTypes';
import { CustomSlide } from '../components/QQCustomSlide';
import { QQ3DGrid } from '../components/QQ3DGrid';
import QQProgressTree from '../components/QQProgressTree';
import {
  resumeAudio, setVolume, setSoundConfig, playFanfare, playReveal, playCorrect,
  playWrong, playTick, playUrgentTick, playTimesUp, playScoreUp,
  startTimerLoop, stopTimerLoop, playFieldPlaced, playSteal, playGameOver,
  setMusicDucked, getMusicDuckFactor, fadeOutAudio,
  startLobbyLoop, stopLobbyLoop,
} from '../utils/sounds';

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? '/api';

// ── CSS keyframes ─────────────────────────────────────────────────────────────
import { QQ_BEAMER_CSS, QQ_CAT_BADGE_BG, QQ_CAT_ACCENT } from '../qqShared';
import { loadUsedFonts } from '../utils/fonts';

export const BEAMER_CSS = QQ_BEAMER_CSS;
export const CAT_BADGE_BG = QQ_CAT_BADGE_BG;
export const CAT_ACCENT = QQ_CAT_ACCENT;

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

/** In 'both' mode, alternate between de and en every 8 s with a fade transition. */
function useLangFlip(serverLang: string): 'de' | 'en' {
  const [flip, setFlip] = useState(false);
  useEffect(() => {
    if (serverLang !== 'both') {
      setFlip(false);
      return;
    }
    setFlip(false); // always start with DE on new slide
    const iv = setInterval(() => setFlip(f => !f), 8000);
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
    names: { de: ['', 'Runde 1', 'Runde 2', 'Runde 3', 'Finale'], en: ['', 'Round 1', 'Round 2', 'Round 3', 'Final'] },
    descs: { de: ['', 'Erobert das Spielfeld!', 'Klaut euren Gegnern Felder!', 'Taktik & Freeze!', 'Alles auf eine Karte!'],
             en: ['', 'Conquer the grid!', 'Steal from your rivals!', 'Tactics & Freeze!', 'All or nothing!'] },
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
  return <BeamerView state={state} slideTemplates={slideTemplates} roomCode={roomCode} />;
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
  // Pause-/Wartescreen: statt Braun ein kühler Event-Look mit farbigen Blobs.
  // Pre-Game (warm, orange/gold) und Paused (cool, cyan/violett) kriegen
  // eigene Identitäten.
  const isPreGame = s.phase === 'LOBBY' && !s.setupDone;
  const isPaused = s.phase === 'PAUSED';
  const pauseBg = isPreGame
    ? [
        'radial-gradient(ellipse at 22% 30%, rgba(251,191,36,0.28) 0%, transparent 55%)',
        'radial-gradient(ellipse at 78% 70%, rgba(249,115,22,0.22) 0%, transparent 55%)',
        'radial-gradient(ellipse at 50% 100%, rgba(124,58,237,0.18) 0%, transparent 60%)',
        '#0b1020',
      ].join(',')
    : isPaused
    ? [
        'radial-gradient(ellipse at 25% 30%, rgba(6,182,212,0.24) 0%, transparent 55%)',
        'radial-gradient(ellipse at 80% 72%, rgba(139,92,246,0.26) 0%, transparent 55%)',
        'radial-gradient(ellipse at 55% 10%, rgba(236,72,153,0.14) 0%, transparent 55%)',
        '#0b1020',
      ].join(',')
    : null;
  const bg = pauseBg ?? s.theme?.bgColor ?? (cat ? (CAT_BG[cat] ?? '#0D0A06') : '#0D0A06');
  const textCol = s.theme?.textColor ?? '#e2e8f0';
  const accent = s.theme?.accentColor ?? '#F59E0B';
  const cardBg = (isPreGame || isPaused) ? '#141b2e' : (s.theme?.cardBg ?? '#1B1510');
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
  // Group QUESTION_ACTIVE + QUESTION_REVEAL together (reveal is not a "new slide")
  const phaseGroup = (s.phase === 'QUESTION_ACTIVE' || s.phase === 'QUESTION_REVEAL')
    ? `Q-${s.currentQuestion?.id ?? s.questionIndex}`
    : s.phase === 'PLACEMENT'
      ? `PLACE-${s.questionIndex}`
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
  useEffect(() => {
    const prev = prevSfxPhaseRef.current;
    prevSfxPhaseRef.current = s.phase;
    if (s.sfxMuted) return;
    resumeAudio();
    if (s.phase === 'PHASE_INTRO' && prev !== 'PHASE_INTRO') playFanfare();
    if (s.phase === 'QUESTION_REVEAL' && prev === 'QUESTION_ACTIVE') playReveal();
    if (s.phase === 'PLACEMENT' && prev === 'QUESTION_REVEAL') {
      if (s.correctTeamId) playCorrect();
      else playWrong();
    }
    if (s.phase === 'GAME_OVER' && prev !== 'GAME_OVER') playGameOver();
  }, [s.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Music: timer loop (game-show music while question is active) ──
  useEffect(() => {
    if (s.musicMuted || !s.timerEndsAt || s.phase !== 'QUESTION_ACTIVE' || s.currentQuestion?.musicUrl) {
      stopTimerLoop();
      return;
    }
    startTimerLoop();
    return () => stopTimerLoop();
  }, [s.timerEndsAt, s.phase, s.musicMuted, s.currentQuestion?.musicUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Music: Lobby-Loop in Lobby / Welcome-Folie / Pause ──
  useEffect(() => {
    const welcome = s.phase === 'RULES' && (s.rulesSlideIndex ?? 0) === -2;
    const shouldLoop = !s.musicMuted && (s.phase === 'LOBBY' || s.phase === 'PAUSED' || welcome);
    if (shouldLoop) {
      resumeAudio();
      startLobbyLoop();
    } else {
      stopLobbyLoop();
    }
    return () => stopLobbyLoop();
  }, [s.phase, s.rulesSlideIndex, s.musicMuted]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Sound: placement flash — stamp or steal sound (SFX) ──
  useEffect(() => {
    if (!placementFlash || s.sfxMuted) return;
    if (placementFlash.cell.wasSteal) playSteal();
    else playFieldPlaced();
  }, [placementFlash]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Fullscreen toggle — detect both JS Fullscreen API and F11/native fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const check = () => setIsFullscreen(!!document.fullscreenElement || window.innerHeight === screen.height);
    document.addEventListener('fullscreenchange', check);
    window.addEventListener('resize', check);
    check();
    return () => { document.removeEventListener('fullscreenchange', check); window.removeEventListener('resize', check); };
  }, []);
  const toggleFullscreen = () => {
    resumeAudio();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Resolve slide template type for current phase
  const templateType = resolveTemplateType(s);
  // These phases always use built-in views — custom templates not supported
  const builtinOnly = s.phase === 'LOBBY' || s.phase === 'RULES' || s.phase === 'TEAMS_REVEAL' || s.phase === 'PLACEMENT' || s.phase === 'THANKS';
  // Per-question override takes priority over category template
  const perQKey = !builtinOnly && s.currentQuestion ? `q-${s.currentQuestion.id}` : null;
  const rawPerQ = perQKey ? slideTemplates[perQKey] : undefined;
  const rawCategoryTemplate = !builtinOnly && templateType ? slideTemplates[templateType] : undefined;
  const rawActiveTemplate = rawPerQ?.elements?.length ? rawPerQ : rawCategoryTemplate;
  // Only use custom template if it has actual elements to render
  const activeTemplate = rawActiveTemplate?.elements?.length ? rawActiveTemplate : undefined;

  return (
    <div style={{
      height: '100vh', width: '100vw',
      background: activeTemplate ? (activeTemplate.background || bg) : bg,
      fontFamily: fontFam,
      color: textCol, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative',
      transition: 'background 0.8s ease',
    }}>
      {/* CSS keyframes */}
      <style>{BEAMER_CSS}</style>

      {/* Grain overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9990,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        opacity: 0.04, mixBlendMode: 'overlay',
      }} />

      {/* CozyWolf watermark — dezent unten links */}
      <div style={{
        position: 'fixed', bottom: 14, left: 16, zIndex: 9991,
        display: 'flex', alignItems: 'center', gap: 8,
        pointerEvents: 'none', userSelect: 'none',
        opacity: 0.35,
      }}>
        <img
          src="/logo.png"
          alt=""
          style={{ width: 22, height: 22, objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
        />
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
          color: '#cbd5e1', textTransform: 'uppercase',
          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
        }}>
          CozyWolf
        </span>
      </div>

      {/* Fullscreen toggle — hidden when already fullscreen */}
      {!isFullscreen && (
        <button
          onClick={toggleFullscreen}
          title="Vollbild"
          style={{
            position: 'fixed', top: 12, right: 12, zIndex: 9999,
            width: 36, height: 36, borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(13,17,23,0.72)',
            color: '#e2e8f0', fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(6px)',
          }}
        >⛶</button>
      )}

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
          {s.phase === 'LOBBY' && !s.setupDone && <PausedView state={s} mode="preGame" />}
          {s.phase === 'LOBBY' && s.setupDone  && <LobbyView state={s} />}
          {s.phase === 'RULES'           && <RulesView state={s} />}
          {s.phase === 'TEAMS_REVEAL'    && <TeamsRevealView state={s} />}
          {s.phase === 'PHASE_INTRO'     && <PhaseIntroView state={s} />}
          {(s.phase === 'QUESTION_ACTIVE' || s.phase === 'QUESTION_REVEAL') && !placementFlash && (
            <QuestionView key={s.currentQuestion?.id} state={s} revealed={s.phase !== 'QUESTION_ACTIVE'} hideCutouts={false} />
          )}
          {s.phase === 'PLACEMENT'       && <PlacementView key={`place-${s.questionIndex}`} state={s} use3D={use3D} enable3DTransition={s.enable3DTransition} />}
          {/* Placement flash: briefly show PlacementView with highlighted cell after placing */}
          {placementFlash && (
            <PlacementView key={`flash-${s.questionIndex}`} state={placementFlash.state} flashCell={placementFlash.cell} use3D={use3D} enable3DTransition={s.enable3DTransition} />
          )}
          {s.phase === 'COMEBACK_CHOICE' && <ComebackView state={s} />}
          {s.phase === 'PAUSED'          && <PausedView state={s} />}
          {s.phase === 'GAME_OVER'       && <GameOverView state={s} roomCode={roomCode} />}
          {s.phase === 'THANKS'          && <ThanksView state={s} roomCode={roomCode} />}
        </div>
      )}

      {/* Willkommens-Overlay (rulesSlideIndex === -2). Crossfade raus beim
          Übergang zum Regel-Intro. */}
      <QuizIntroOverlay language={s.language} visible={welcomeActive} />
      {/* Regel-Intro-Overlay (rulesSlideIndex === -1). Crossfade zwischen
          Willkommen und erster Regel-Folie. */}
      <RulesIntroOverlay language={s.language} visible={rulesIntroActive} />

      {/* Gameshow flash-sweep overlay — runs once per phase group change */}
      {flashKey > 0 && (
        <div
          key={flashKey}
          style={{
            position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9995,
            overflow: 'hidden',
          }}
        >
          {/* Darkening pulse behind the sweep */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)',
            animation: 'qqFlashDim 440ms ease-out both',
          }} />
          {/* Diagonal white sweep */}
          <div style={{
            position: 'absolute', top: '-20%', left: 0, width: '40%', height: '140%',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0.06) 70%, transparent 100%)',
            filter: 'blur(6px)',
            animation: 'qqFlashSweep 420ms cubic-bezier(0.55,0.05,0.3,0.95) both',
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
      if (cat === 'BUNTE_TUETE')   return 'QUESTION_BUNTE_TUETE';
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

  const activeTeam = s.teams.find((t: any) => t.id === s.hotPotatoActiveTeamId);
  const urgent = remaining !== null && remaining <= 5;
  const used: string[] = s.hotPotatoUsedAnswers ?? [];

  if (revealed) return null;

  return (
    <div style={{
      position: 'absolute', bottom: 16, left: 0, right: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      pointerEvents: 'none',
    }}>
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
          <span style={{ fontSize: 36, lineHeight: 1 }}>{qqGetAvatar(activeTeam.avatarId).emoji}</span>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: '#94a3b8' }}>
              🥔 {lang === 'en' ? 'Hot Potato' : 'Heiße Kartoffel'}
            </span>
            <span style={{ fontSize: 'clamp(22px, 2.6vw, 34px)', fontWeight: 900, color: activeTeam.color }}>
              {activeTeam.name} {lang === 'en' ? 'is up!' : 'ist dran!'}
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
          🥔 {lang === 'en' ? 'Waiting for start…' : 'Bereit für Start…'}
        </div>
      )}

      {/* Used answers list */}
      {used.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8,
          maxWidth: 'min(92vw, 1200px)',
        }}>
          {used.map((a, i) => (
            <div key={`${a}-${i}`} style={{
              padding: '6px 14px', borderRadius: 999,
              background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)',
              color: '#86efac', fontSize: 'clamp(13px, 1.3vw, 18px)', fontWeight: 700,
              animation: 'contentReveal 0.3s ease both',
            }}>
              ✓ {a}
            </div>
          ))}
        </div>
      )}

      {/* Eliminated teams (small, subtle) */}
      {s.hotPotatoEliminated && s.hotPotatoEliminated.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, color: '#64748b', fontWeight: 700,
        }}>
          <span>❌ {lang === 'en' ? 'Out:' : 'Raus:'}</span>
          {s.hotPotatoEliminated.map((id: string) => {
            const t = s.teams.find((tm: any) => tm.id === id);
            if (!t) return null;
            return (
              <span key={id} style={{ color: t.color, opacity: 0.7 }}>
                {qqGetAvatar(t.avatarId).emoji} {t.name}
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

type RulesSlide = {
  icon: string;
  title: string;
  color: string;
  lines: string[];
  extra?: string;
  /** Mini grid example: 2D array — 'A' = team A, 'B' = team B, '⭐' = joker star, '📌' = stacked, null = empty */
  grid?: { cells: (string | null)[][]; colorA: string; colorB: string; label?: string };
  /** Rendert stattdessen den Fortschrittsbaum (Phasen + Fragen-Punkte). */
  showTree?: boolean;
};

const RULES_SLIDES_DE: RulesSlide[] = [
  {
    icon: '🏆',
    title: 'Das Ziel',
    color: '#3B82F6',
    lines: [
      'Beantwortet Quizfragen und erobert Felder auf dem Spielfeld.',
      'Das Team mit dem größten zusammenhängenden Gebiet gewinnt!',
    ],
  },
  {
    icon: '⚡',
    title: 'So läuft es',
    color: '#8B5CF6',
    lines: [
      'Frage → alle Teams antworten gleichzeitig auf dem Handy.',
      'Jedes richtige Team darf ein Feld auf dem Spielfeld setzen.',
      'Bei Gleichstand entscheidet die Geschwindigkeit, wer zuerst wählt!',
    ],
  },
  {
    icon: '🗺️',
    title: 'Das Quiz im Überblick',
    color: '#06B6D4',
    lines: [
      'Das Quiz läuft in mehreren Runden mit verschiedenen Kategorien.',
      'Oben seht ihr den Fahrplan — so behaltet ihr den Überblick, wo wir gerade sind.',
    ],
    showTree: true,
  },
  {
    icon: '⭐',
    title: 'Joker — 2×2-Bonus',
    color: '#F59E0B',
    lines: [
      'Bildet ein 2×2-Quadrat in eurer Teamfarbe → ihr bekommt sofort ein Joker-Feld als Bonus-Platzierung.',
      'Das Joker-Feld zählt wie ein normales Feld für euer Gebiet.',
    ],
    extra: '⭐ 2×2 bilden = 1 Bonus-Feld dazu!',
    grid: {
      cells: [
        ['A','A',null,null],
        ['A','⭐',null,null],
        [null,null,null,null],
        [null,null,null,null],
      ],
      colorA: '#3B82F6', colorB: '#EF4444',
      label: '2×2 → ⭐ Bonus!',
    },
  },
  {
    icon: '🛡️',
    title: 'Gut zu wissen',
    color: '#10B981',
    lines: [
      'Gegnerische Felder könnt ihr klauen — auch Joker-Felder.',
      'Gestapelte Felder (doppelt gesetzt) sind geschützt und können nicht geklaut werden.',
      'Nur eure größte zusammenhängende Fläche zählt — einzelne Felder bringen nichts.',
    ],
  },
  {
    icon: '🔄',
    title: 'Comeback-Chance',
    color: '#8B5CF6',
    lines: [
      'Vor der letzten Runde bekommt das Team auf dem letzten Platz eine faire Aufholchance.',
      'Keine Sorge — die Details erklären wir, wenn es soweit ist!',
    ],
    extra: 'Viel Spaß und möge das beste Team gewinnen! 🎉',
  },
];

const RULES_SLIDES_EN: RulesSlide[] = [
  {
    icon: '🏆',
    title: 'The Goal',
    color: '#3B82F6',
    lines: [
      'Answer quiz questions and conquer cells on the grid.',
      'The team with the largest connected territory wins!',
    ],
  },
  {
    icon: '⚡',
    title: 'How It Works',
    color: '#8B5CF6',
    lines: [
      'Question → all teams answer on their phones at once.',
      'Every correct team places a cell on the grid.',
      'On a tie, speed decides who picks first!',
    ],
  },
  {
    icon: '🗺️',
    title: 'Quiz Overview',
    color: '#06B6D4',
    lines: [
      'The quiz runs in multiple rounds with different categories.',
      'Above you see the roadmap — so you always know where we are.',
    ],
    showTree: true,
  },
  {
    icon: '⭐',
    title: 'Joker — 2×2 Bonus',
    color: '#F59E0B',
    lines: [
      'Form a 2×2 square in your team color → you instantly get a Joker cell as a bonus placement.',
      'The Joker cell counts like a regular cell toward your territory.',
    ],
    extra: '⭐ Form a 2×2 = 1 bonus cell!',
    grid: {
      cells: [
        ['A','A',null,null],
        ['A','⭐',null,null],
        [null,null,null,null],
        [null,null,null,null],
      ],
      colorA: '#3B82F6', colorB: '#EF4444',
      label: '2×2 → ⭐ Bonus!',
    },
  },
  {
    icon: '🛡️',
    title: 'Good to Know',
    color: '#10B981',
    lines: [
      'You can steal opponent cells — including Joker cells.',
      'Stacked cells (placed twice) are protected and cannot be stolen.',
      'Only your largest connected area counts — isolated cells don\'t help.',
    ],
  },
  {
    icon: '🔄',
    title: 'Comeback Chance',
    color: '#8B5CF6',
    lines: [
      'Before the final round, the team in last place gets a fair catch-up chance.',
      "Don't worry — we'll explain the details when the time comes!",
    ],
    extra: 'Good luck and may the best team win! 🎉',
  },
];

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
          const isPin = cell === '📌';
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
              {isStar ? '⭐' : isPin ? '📌' : ''}
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
// QuizIntroOverlay — epische Begrüßungs-Folie "Willkommen beim BLOCK QUIZ
// / QUARTER QUIZ by cozywolf". Spielt einmal pro Session beim ersten Wechsel
// in RULES-Phase und blendet dann in die Rules-Ansicht über.
// ─────────────────────────────────────────────────────────────────────────────
function QuizIntroOverlay({ language, visible }: { language: QQLanguage; visible: boolean }) {
  const lang = useLangFlip(language);
  const title = 'CozyQuiz';
  const welcome = lang === 'en' ? 'Welcome to' : 'Willkommen beim';
  const tagline = lang === 'en' ? 'by cozywolf' : 'by cozywolf';
  // Keine Auto-Dismiss: Moderator steuert das Weiterschalten per "Weiter"-Button.
  // Die Intro-Elemente animieren einmalig ein und bleiben dann ruhig stehen.
  // visible=false → opacity 0 crossfade, pointer-events off, bleibt gemountet.
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9990,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, #1a1030 0%, #0b0618 55%, #050208 100%)',
      overflow: 'hidden',
      fontFamily: "'Nunito', system-ui, sans-serif",
      opacity: visible ? 1 : 0,
      transform: visible ? 'scale(1)' : 'scale(1.04)',
      transition: 'opacity 0.55s ease, transform 0.65s cubic-bezier(0.4,0,0.2,1)',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      {/* Hintergrund-Glow Pulse (warm amber) */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        width: '140vmin', height: '140vmin',
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(251,191,36,0.22) 0%, rgba(249,115,22,0.12) 35%, transparent 65%)',
        filter: 'blur(10px)',
        animation: 'qqIntroGlow 4.8s ease-out both',
        pointerEvents: 'none',
      }} />
      {/* Sweep-Strahl diagonal */}
      <div style={{
        position: 'absolute', left: '-20%', top: 0, width: '40%', height: '100%',
        background: 'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
        animation: 'qqIntroSweep 2.6s ease-out 0.2s both',
        pointerEvents: 'none',
      }} />
      {/* Partikel (kleine Stern-Punkte) */}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        const r = 260 + (i % 5) * 30;
        const dx = Math.cos(angle) * r;
        const dy = Math.sin(angle) * r;
        return (
          <div key={i} style={{
            position: 'absolute', left: '50%', top: '50%',
            width: 6, height: 6, borderRadius: '50%',
            background: i % 2 ? '#fbbf24' : '#fde68a',
            boxShadow: '0 0 14px rgba(251,191,36,0.9)',
            ['--dx' as any]: `${dx}px`,
            ['--dy' as any]: `${dy}px`,
            transform: 'translate(-50%, -50%)',
            animation: `qqIntroSpark 2.8s cubic-bezier(0.2, 0.8, 0.4, 1) ${0.4 + (i % 6) * 0.05}s both`,
            pointerEvents: 'none',
          }} />
        );
      })}
      {/* Content-Stack */}
      <div style={{
        position: 'relative', zIndex: 5,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 'clamp(12px, 2vh, 24px)',
        textAlign: 'center',
        padding: '0 6vw',
      }}>
        {/* Welcome label */}
        <div style={{
          fontSize: 'clamp(22px, 2.4vw, 36px)', fontWeight: 700,
          letterSpacing: '0.3em', textTransform: 'uppercase',
          color: '#fbbf24',
          textShadow: '0 0 18px rgba(251,191,36,0.6)',
          animation: 'qqIntroWelcome 0.9s cubic-bezier(0.2,0.8,0.4,1) 0.2s both',
        }}>{welcome}</div>
        {/* Logo */}
        <img
          src="/logo.png"
          alt="cozywolf"
          style={{
            width: 'clamp(120px, 14vw, 200px)', height: 'auto',
            filter: 'drop-shadow(0 6px 24px rgba(251,191,36,0.55))',
            animation: 'qqIntroLogoIn 1.1s cubic-bezier(0.2,0.9,0.3,1.3) 0.5s both',
          }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        {/* Title */}
        <div style={{
          fontSize: 'clamp(68px, 10vw, 160px)', fontWeight: 900,
          letterSpacing: '0.04em',
          lineHeight: 1.0,
          background: 'linear-gradient(180deg, #fff 0%, #fde68a 45%, #fbbf24 75%, #f97316 100%)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 60px rgba(251,191,36,0.4)',
          animation: 'qqIntroTitleIn 1.2s cubic-bezier(0.2,0.9,0.3,1.1) 0.8s both',
        }}>{title}</div>
        {/* Tagline */}
        <div style={{
          fontSize: 'clamp(20px, 2vw, 32px)', fontWeight: 600,
          letterSpacing: '0.22em',
          color: 'rgba(255,255,255,0.88)',
          textShadow: '0 2px 12px rgba(0,0,0,0.5)',
          animation: 'qqIntroTagline 0.9s cubic-bezier(0.2,0.8,0.4,1) 1.6s both',
        }}>{tagline}</div>
      </div>
      <style>{`
        @keyframes qqIntroFade {
          0% { opacity: 0; }
          6%, 85% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes qqIntroGlow {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
          30% { opacity: 1; transform: translate(-50%, -50%) scale(1.0); }
          100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.15); }
        }
        @keyframes qqIntroSweep {
          0% { transform: translateX(0); opacity: 0; }
          30% { opacity: 1; }
          100% { transform: translateX(360%); opacity: 0; }
        }
        @keyframes qqIntroSpark {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          30% { opacity: 1; }
          100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1); opacity: 0; }
        }
        @keyframes qqIntroWelcome {
          0% { opacity: 0; transform: translateY(10px); letter-spacing: 0.5em; }
          100% { opacity: 1; transform: translateY(0); letter-spacing: 0.3em; }
        }
        @keyframes qqIntroLogoIn {
          0% { opacity: 0; transform: scale(0.4) rotate(-12deg); }
          70% { transform: scale(1.08) rotate(3deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes qqIntroTitleIn {
          0% { opacity: 0; transform: translateY(30px) scale(0.85); filter: blur(12px); }
          60% { filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes qqIntroTagline {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
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
  const slides = lang === 'en' ? RULES_SLIDES_EN : RULES_SLIDES_DE;
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
        {/* Icon + title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(16px, 2vw, 28px)', marginBottom: 'clamp(16px, 2.5vh, 32px)' }}>
          <span style={{
            fontSize: 'clamp(64px,9vw,110px)', lineHeight: 1,
            filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))',
          }}>{slide.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 'clamp(13px,1.4vw,18px)', fontWeight: 800, letterSpacing: '0.16em',
              textTransform: 'uppercase', color: `${slide.color}88`, marginBottom: 6,
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
          alignItems: slide.showTree ? 'stretch' : 'center',
          flexDirection: slide.showTree ? 'column' : (hasGrid ? 'row' : 'column'),
        }}>
          {/* Fortschrittsbaum (wenn Flag gesetzt) — oben, volle Breite */}
          {slide.showTree && (
            <div style={{ display: 'flex', justifyContent: 'center', animation: 'contentReveal 0.5s ease 0.05s both' }}>
              <QQProgressTree state={s} variant="inline" />
            </div>
          )}

          {/* Text lines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 1.5vh, 20px)', flex: 1 }}>
            {slide.lines.map((line, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 'clamp(10px, 1.2vw, 18px)',
                animation: `contentReveal 0.4s ease ${0.1 + i * 0.12}s both`,
              }}>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: slide.color, marginTop: 10, flexShrink: 0,
                  boxShadow: `0 0 10px ${slide.color}66`,
                }} />
                <span style={{
                  fontSize: 'clamp(22px,3vw,42px)', fontWeight: 700,
                  color: '#e2e8f0', lineHeight: 1.3,
                }}>{line}</span>
              </div>
            ))}
          </div>

          {/* Mini grid example */}
          {slide.grid && <RulesMiniGrid grid={slide.grid} slideColor={slide.color} />}
        </div>

        {/* Extra callout */}
        {slide.extra && (
          <div style={{
            marginTop: 'clamp(16px, 2.5vh, 32px)', padding: 'clamp(12px, 1.8vh, 20px) clamp(18px, 2.2vw, 28px)', borderRadius: 18,
            background: `${slide.color}15`, border: `2px solid ${slide.color}33`,
            fontSize: 'clamp(18px,2.4vw,34px)', fontWeight: 800,
            color: slide.color,
            animation: 'contentReveal 0.5s ease 0.4s both',
            textShadow: `0 0 24px ${slide.color}33`,
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
  const cardBg = s.theme?.cardBg ?? '#1B1510';
  const fontFam = s.theme?.fontFamily ? `'${s.theme.fontFamily}', 'Nunito', system-ui, sans-serif` : "'Nunito', system-ui, sans-serif";
  const joinUrl = `${window.location.origin}/team`;
  const [de, setDe] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setDe(p => !p), 8000);
    return () => clearInterval(id);
  }, []);

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
    }}>
      <Fireflies />

      {/* ── Top: Logo + Title (compact, centered) ── */}
      <div style={{
        textAlign: 'center', position: 'relative', zIndex: 5, flexShrink: 0,
        animation: 'phasePop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.1s both',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          marginBottom: 4, opacity: 0.7,
        }}>
          <img
            src="/logo.png"
            alt=""
            style={{ width: 'clamp(22px, 2.5vh, 30px)', height: 'clamp(22px, 2.5vh, 30px)', objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))' }}
          />
          <span style={{
            fontSize: 'clamp(10px, 1.1vw, 14px)', fontWeight: 800, letterSpacing: '0.24em',
            color: '#94a3b8', textTransform: 'uppercase',
          }}>
            A CozyWolf Production
          </span>
        </div>
        <div style={{
          fontFamily: fontFam,
          fontSize: 'clamp(44px, 7vw, 96px)', fontWeight: 900, lineHeight: 1,
          background: 'linear-gradient(135deg, #e2e8f0 40%, #94a3b8)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em',
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
            animation: 'qrGlow 3s ease-in-out infinite',
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
                return (
                  <div key={t.id} style={{
                    padding: compact
                      ? 'clamp(16px, 2vh, 24px) clamp(20px, 2.2vw, 28px)'
                      : 'clamp(18px, 2.2vh, 26px) clamp(22px, 2.4vw, 30px)',
                    borderRadius: compact ? 18 : 22,
                    background: cardBg,
                    border: `2px solid ${t.color}55`,
                    boxShadow: `0 8px 28px rgba(0,0,0,0.4), 0 0 24px ${t.color}22`,
                    display: 'flex', alignItems: 'center',
                    gap: compact ? 'clamp(14px, 1.5vw, 20px)' : 'clamp(14px, 1.6vw, 20px)',
                    animation: `teamCardIn 0.5s cubic-bezier(0.34,1.2,0.64,1) ${0.4 + i * 0.06}s both`,
                    minWidth: 0,
                  }}>
                    <span style={{
                      fontSize: compact ? 'clamp(44px, 4.4vw, 60px)' : 'clamp(48px, 5vw, 68px)',
                      lineHeight: 1, flexShrink: 0,
                    }}>{qqGetAvatar(t.avatarId).emoji}</span>
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
  const allRevealed = revealedCount >= teams.length;
  const goodLuckDelay = titleDur + teams.length * perTeamDelay + 400;
  const showGoodLuck = elapsed >= goodLuckDelay;

  // Sounds triggern pro Team (nur einmal je Index) — respektiert globalen SFX-Mute
  const playedRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (s.sfxMuted) return;
    for (let i = 0; i < revealedCount; i++) {
      if (!playedRef.current.has(i)) {
        playedRef.current.add(i);
        try { playFieldPlaced(); } catch {}
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
        🎬 Heute spielen…
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
          ? 'clamp(74px, 8vw, 130px)'
          : many ? 'clamp(90px, 10vw, 160px)' : 'clamp(120px, 14vw, 200px)';
        const discFont = multiRow
          ? 'clamp(38px, 4.8vw, 74px)'
          : many ? 'clamp(46px, 6vw, 90px)' : 'clamp(60px, 8vw, 110px)';
        const nameFont = multiRow ? 'clamp(16px, 1.9vw, 26px)' : 'clamp(18px, 2.2vw, 32px)';
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
                    const av = qqGetAvatar(t.avatarId);
                    return (
                      <div key={t.id} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 10,
                        opacity: shown ? 1 : 0,
                        animation: shown ? `qqTrSlam 900ms cubic-bezier(.2,.9,.2,1) 0ms both` : 'none',
                        animationDelay: shown ? '0ms' : `${slamDelay}ms`,
                      }}>
                        {/* Avatar-Disc */}
                        <div style={{
                          width: discSize,
                          height: discSize,
                          borderRadius: '50%',
                          background: `radial-gradient(circle at 35% 30%, ${t.color} 0%, ${t.color}cc 45%, ${t.color}88 100%)`,
                          border: `5px solid ${t.color}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: `0 12px 40px ${t.color}88, 0 0 60px ${t.color}66, inset 0 -8px 20px rgba(0,0,0,0.25)`,
                          fontSize: discFont, lineHeight: 1,
                          animation: shown ? 'qqTrPulse 2.2s ease-in-out infinite' : 'none',
                        }}>
                          {av.emoji}
                        </div>
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
                        <div style={{
                          padding: '6px 16px', borderRadius: 14,
                          background: t.color,
                          color: '#fff', fontWeight: 900,
                          fontSize: nameFont,
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                          boxShadow: `0 4px 12px rgba(0,0,0,0.3)`,
                          whiteSpace: 'nowrap',
                        }}>
                          {t.name}
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
          ✨ Viel Glück! ✨
        </div>
      </div>

      {/* Skip-Hint */}
      <div style={{
        position: 'absolute', bottom: 20, left: 0, right: 0,
        textAlign: 'center', fontSize: 13, color: '#64748b', fontWeight: 700,
      }}>
        {allRevealed ? 'Moderator drückt weiter, sobald alle warm sind…' : 'Intro läuft…'}
      </div>
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
  const isFinal = s.gamePhaseIndex === s.totalPhases;
  const phaseName = isFinal ? (lang === 'de' ? 'Finale' : 'Final') : phaseNamesRaw[s.gamePhaseIndex];
  const phaseDesc = isFinal ? (lang === 'de' ? 'Alles aufs Spiel' : 'All in') : phaseDescsRaw[s.gamePhaseIndex];

  const questionInPhase = (s.questionIndex % 5) + 1;
  const isFirstOfRound = questionInPhase === 1;

  // Category info for upcoming question
  const cat = s.currentQuestion?.category as QQCategory | undefined;
  const catInfo = cat ? QQ_CATEGORY_LABELS[cat] : undefined;
  const catLabel = catInfo ? catInfo[lang] : '';
  const catEmoji = catInfo?.emoji ?? '';
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
    CHEESE:        { de: 'Erkennt ihr das Bild?', en: 'Can you identify the image?' },
  };
  const catExplain = cat ? (CAT_EXPLAIN[cat]?.[lang] ?? '') : '';

  // ── Rule reminders per round ──
  const ROUND_RULES: Record<number, { de: string[]; en: string[]; emoji: string }> = {
    1: {
      emoji: '🏁',
      de: ['1 Feld setzen nach richtiger Antwort', 'Baut euer Quartier auf!'],
      en: ['Place 1 tile after a correct answer', 'Build your quarter!'],
    },
    2: {
      emoji: '⚔️',
      de: ['2 Felder setzen pro Runde', 'Klauen jetzt möglich!'],
      en: ['Place 2 tiles per round', 'Stealing is now possible!'],
    },
    3: {
      emoji: '🧊',
      de: ['Wählt eure Aktion frei', 'Einfrieren freigeschaltet!'],
      en: ['Choose your action freely', 'Freezing unlocked!'],
    },
    4: {
      emoji: '🔄',
      de: ['Tauschen & Stucken freigeschaltet', 'Alle Aktionen verfügbar!'],
      en: ['Swap & Stack unlocked', 'All actions available!'],
    },
  };
  const roundRules = ROUND_RULES[s.gamePhaseIndex] ?? ROUND_RULES[3];

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <Fireflies color={isFirstOfRound && s.introStep <= 1 ? `${color}88` : `${catColor ?? color}88`} />

      {isFirstOfRound && s.introStep === 0 ? (
        /* ── Step 0: Round announcement (first question only) ── */
        <>
          {/* Round progress pill */}
          <div style={{
            padding: '8px 24px', borderRadius: 999,
            background: `${color}18`, border: `2px solid ${color}44`,
            fontSize: 'clamp(16px, 1.8vw, 24px)', fontWeight: 800,
            color: `${color}cc`, letterSpacing: '0.08em',
            marginBottom: 28,
            animation: 'contentReveal 0.4s ease 0.1s both',
            position: 'relative', zIndex: 5,
          }}>
            {lang === 'de'
              ? `Runde ${s.gamePhaseIndex} von ${s.totalPhases}`
              : `Round ${s.gamePhaseIndex} of ${s.totalPhases}`}
          </div>

          {/* Shockwave burst behind title */}
          <div style={{ position: 'relative', zIndex: 5 }}>
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              width: 200, height: 200, marginLeft: -100, marginTop: -100,
              borderRadius: '50%',
              border: `3px solid ${color}66`,
              animation: 'roundShockwave 0.8s cubic-bezier(0,0,0.2,1) 0.2s both',
              pointerEvents: 'none',
            }} />
            {/* Round name — BAM entrance */}
            <div style={{
              fontFamily: fontFam,
              fontSize: 'clamp(100px, 18vw, 260px)', fontWeight: 900, lineHeight: 0.9,
              color,
              textShadow: `0 0 120px ${color}44, 0 12px 0 ${color}33`,
              textAlign: 'center',
              animation: 'roundBam 0.65s cubic-bezier(0.22,1,0.36,1) 0.15s both, roundBreathe 4s ease-in-out 1.2s infinite',
            }}>
              {phaseName}
            </div>
          </div>

          {/* Divider line with glow + shimmer */}
          <div style={{
            width: 'clamp(240px, 35vw, 500px)', height: 5, borderRadius: 3,
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            backgroundSize: '200% 100%',
            marginTop: 28, marginBottom: 28,
            transformOrigin: 'center',
            animation: 'roundLineGlow 0.7s cubic-bezier(0.34,1.2,0.64,1) 0.5s both, lineShimmer 3s linear 1.5s infinite',
            boxShadow: `0 0 20px ${color}55, 0 0 40px ${color}22`,
            position: 'relative', zIndex: 5,
          }} />

          {/* Mission subtitle — bigger, bolder */}
          <div style={{
            fontFamily: fontFam,
            fontSize: 'clamp(36px, 5vw, 68px)', fontWeight: 900,
            color: `${color}dd`,
            textShadow: `0 0 30px ${color}33`,
            animation: 'subtitleSlide 0.55s cubic-bezier(0.34,1.4,0.64,1) 0.7s both',
            position: 'relative', zIndex: 5,
            textAlign: 'center',
          }}>
            {phaseDesc}
          </div>

          {/* Fortschrittsbaum — so sieht man was noch kommt */}
          <div style={{
            marginTop: 36,
            animation: 'contentReveal 0.6s ease 1.0s both',
            position: 'relative', zIndex: 5,
          }}>
            <QQProgressTree state={s} variant="inline" />
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

          {/* Big emoji */}
          <div style={{
            fontSize: 'clamp(72px, 12vw, 140px)',
            animation: 'phasePop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.15s both, cfloat 4s ease-in-out 1s infinite',
            position: 'relative', zIndex: 5,
          }}>{roundRules.emoji}</div>

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

          {/* Rule lines */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            marginTop: s.gamePhaseIndex === 1 ? 24 : 12,
            position: 'relative', zIndex: 5,
          }}>
            {(lang === 'en' ? roundRules.en : roundRules.de).map((rule, i) => (
              <div key={i} style={{
                fontSize: i === 0 ? 'clamp(32px, 4.5vw, 60px)' : 'clamp(24px, 3vw, 44px)',
                fontWeight: i === 0 ? 900 : 700,
                color: i === 0 ? '#F1F5F9' : `${color}cc`,
                textShadow: i === 0 ? `0 0 40px ${color}33` : 'none',
                textAlign: 'center',
                animation: `phasePop 0.6s cubic-bezier(0.34,1.56,0.64,1) ${0.4 + i * 0.15}s both`,
              }}>
                {rule}
              </div>
            ))}
            {/* Round 4: Plus-shape stacking example — showing the 5 plus-tiles + stacked tile */}
            {s.gamePhaseIndex === 4 && (() => {
              // Plus shape in a 3x3 grid: positions 1 (top), 3 (left), 4 (center), 5 (right), 7 (bottom)
              const plusPositions = new Set([1, 3, 4, 5, 7]);
              const stackTarget = 4; // center = the tile to stack on
              return (
                <div style={{
                  marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
                  animation: 'phasePop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.85s both',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    {/* Before: plus shape in team color */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 52px)', gap: 4 }}>
                      {[0,1,2,3,4,5,6,7,8].map(i => {
                        const isPlus = plusPositions.has(i);
                        return (
                          <div key={i} style={{
                            width: 52, height: 52, borderRadius: 9,
                            background: isPlus ? `linear-gradient(135deg, ${color}ff, ${color}bb)` : 'rgba(255,255,255,0.04)',
                            border: isPlus ? `1px solid ${color}` : '1px dashed rgba(255,255,255,0.08)',
                            boxShadow: isPlus ? `0 0 8px ${color}55` : 'none',
                          }} />
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 44, fontWeight: 900, color: `${color}cc` }}>+</div>
                    <div style={{ fontSize: 44 }}>📌</div>
                    <div style={{ fontSize: 44, fontWeight: 900, color: `${color}cc` }}>=</div>
                    {/* After: plus shape with center stacked/pinned */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 52px)', gap: 4 }}>
                      {[0,1,2,3,4,5,6,7,8].map(i => {
                        const isPlus = plusPositions.has(i);
                        const isStacked = i === stackTarget;
                        return (
                          <div key={i} style={{
                            position: 'relative',
                            width: 52, height: 52, borderRadius: 9,
                            background: isPlus ? `linear-gradient(135deg, ${color}ff, ${color}bb)` : 'rgba(255,255,255,0.04)',
                            border: isStacked ? '2.5px solid rgba(251,191,36,0.95)' : isPlus ? `1px solid ${color}` : '1px dashed rgba(255,255,255,0.08)',
                            boxShadow: isStacked ? '0 0 16px rgba(251,191,36,0.75)' : isPlus ? `0 0 8px ${color}55` : 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {isStacked && (
                              <>
                                {/* Stacked second tile (behind, slightly offset) */}
                                <div style={{
                                  position: 'absolute', inset: -4, borderRadius: 9,
                                  background: `linear-gradient(135deg, ${color}dd, ${color}88)`,
                                  border: `1px solid ${color}`,
                                  transform: 'translate(3px, -3px)',
                                  zIndex: -1,
                                }} />
                                <span style={{ fontSize: 24 }}>📌</span>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 'clamp(15px, 1.7vw, 20px)', fontWeight: 800,
                    color: `${color}aa`, textAlign: 'center', maxWidth: 720, lineHeight: 1.4,
                  }}>
                    {lang === 'en'
                      ? 'Place a second tile ON an existing one (Plus-shape) — stacked tiles can\'t be stolen or swapped'
                      : 'Zweiten Stein AUF einen bestehenden setzen (Plus-Form) — gestapelte Felder sind unklaubbar & untauschbar'}
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      ) : s.categoryIsNew ? (
        /* ── Category explanation (first time this category/mechanic appears) ── */
        (() => {
          // Detailed explanations per category (and BUNTE_TUETE sub-kinds)
          const btKind = s.currentQuestion?.bunteTuete?.kind;
          const CAT_INTRO: Record<string, { emoji: string; title: { de: string; en: string }; lines: { de: string[]; en: string[] } }> = {
            SCHAETZCHEN: {
              emoji: catEmoji, title: { de: 'Schätzchen', en: 'Guess It' },
              lines: {
                de: ['Gebt eine Zahl als Schätzung ein', 'Das Team mit der nächsten Antwort gewinnt!'],
                en: ['Enter a number as your estimate', 'The team closest to the answer wins!'],
              },
            },
            MUCHO: {
              emoji: catEmoji, title: { de: 'Mu-Cho', en: 'Mu-Cho' },
              lines: {
                de: ['4 Antwortmöglichkeiten, nur 1 ist richtig', '⚡ Schnelligkeit entscheidet bei Gleichstand!'],
                en: ['4 options, only 1 is correct', '⚡ Speed decides when tied!'],
              },
            },
            ZEHN_VON_ZEHN: {
              emoji: catEmoji, title: { de: '10 von 10', en: '10 of 10' },
              lines: {
                de: ['3 mögliche Antworten, 10 Punkte zu vergeben', 'Verteilt eure Punkte auf die Antworten!'],
                en: ['3 possible answers, 10 points to distribute', 'Spread your points across the answers!'],
              },
            },
            CHEESE: {
              emoji: catEmoji, title: { de: 'Picture This', en: 'Picture This' },
              lines: {
                de: ['Ein Bild erscheint auf dem Beamer', 'Tippt eure Antwort auf dem Handy ein!'],
                en: ['An image appears on screen', 'Type your answer on your phone!'],
              },
            },
            // BUNTE_TUETE sub-mechanics
            'BUNTE_TUETE:top5': {
              emoji: '🏆', title: { de: 'Top 5', en: 'Top 5' },
              lines: {
                de: ['Alle Teams gleichzeitig — bis zu 5 Antworten eintippen.', 'Wer die meisten Treffer hat, gewinnt die Runde.'],
                en: ['All teams at once — type up to 5 answers.', 'Most hits wins the round.'],
              },
            },
            'BUNTE_TUETE:oneOfEight': {
              emoji: '🕵️', title: { de: 'Imposter', en: 'Imposter' },
              lines: {
                de: ['8 Aussagen — eine davon ist falsch!', 'Findet den Imposter, ohne selbst rauszufliegen!'],
                en: ['8 statements — one is false!', 'Find the imposter without getting eliminated!'],
              },
            },
            'BUNTE_TUETE:order': {
              emoji: '📊', title: { de: 'Reihenfolge', en: 'Order' },
              lines: {
                de: ['Jedes Team sortiert eigenständig auf dem Handy.', 'Pro korrekter Position = 1 Punkt. Meiste Punkte gewinnt!'],
                en: ['Each team sorts independently on their phone.', '1 point per item in the correct position — most wins!'],
              },
            },
            'BUNTE_TUETE:map': {
              emoji: '🗺️', title: { de: 'CozyGuessr', en: 'CozyGuessr' },
              lines: {
                de: ['Markiert den Ort auf der Karte — nächstes Team gewinnt!', 'Bei gleicher Entfernung: alle gewinnen (Reihenfolge nach Speed).'],
                en: ['Pin the location — closest team wins!', 'On tie by distance: all win (order by speed).'],
              },
            },
            'BUNTE_TUETE:hotPotato': {
              emoji: '🥔', title: { de: 'Heiße Kartoffel', en: 'Hot Potato' },
              lines: {
                de: ['Reihum eine richtige Antwort tippen — Zeit läuft!', 'Keine richtige Antwort in der Zeit = raus.'],
                en: ['Take turns typing a correct answer — timer runs!', 'No correct answer in time = you\'re out.'],
              },
            },
          };

          const key = cat === 'BUNTE_TUETE' && btKind ? `BUNTE_TUETE:${btKind}` : (cat ?? '');
          const info = CAT_INTRO[key] ?? CAT_INTRO[cat ?? ''];
          if (!info) return null;

          return (
            <>
              {/* Category pill — context */}
              <div style={{
                padding: '6px 20px', borderRadius: 999,
                background: `${catColor}15`, border: `1.5px solid ${catColor}33`,
                fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 800,
                color: `${catColor}aa`, letterSpacing: '0.06em',
                marginBottom: 24,
                animation: 'contentReveal 0.4s ease 0.1s both',
                position: 'relative', zIndex: 5,
              }}>
                {lang === 'de' ? `Frage ${questionInPhase} von 5` : `Question ${questionInPhase} of 5`}
              </div>

              {/* Big emoji */}
              <div style={{
                fontSize: 'clamp(72px, 12vw, 140px)',
                animation: 'phasePop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.15s both, cfloat 4s ease-in-out 1s infinite',
                position: 'relative', zIndex: 5,
              }}>{info.emoji}</div>

              {/* Category/mechanic name */}
              <div style={{
                fontFamily: fontFam,
                fontSize: 'clamp(56px, 10vw, 160px)', fontWeight: 900, lineHeight: 1,
                color: catColor,
                textShadow: `0 0 80px ${catColor}44, 0 8px 0 ${catColor}33`,
                marginTop: 12,
                animation: 'phasePop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.3s both',
                position: 'relative', zIndex: 5,
                textAlign: 'center',
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

              {/* "So geht's" badge */}
              <div style={{
                marginTop: 28, padding: '6px 22px', borderRadius: 999,
                background: `${catColor}18`, border: `1.5px solid ${catColor}33`,
                fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 800,
                color: `${catColor}88`, letterSpacing: '0.06em',
                animation: 'phasePop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.8s both',
                position: 'relative', zIndex: 5,
              }}>
                {lang === 'de' ? '📱 Antwort auf dem Handy' : '📱 Answer on your phone'}
              </div>
            </>
          );
        })()
      ) : (
        /* ── Category reveal (no explanation needed — already seen) ── */
        <>
          {/* Question progress: "Frage 2 von 5" + dots */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            marginBottom: 28,
            animation: 'phasePop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both',
            position: 'relative', zIndex: 5,
          }}>
            <div style={{
              fontSize: 'clamp(22px, 2.8vw, 36px)', fontWeight: 800,
              color: catColor, letterSpacing: '0.08em',
            }}>
              {lang === 'de' ? `Frage ${questionInPhase} von 5` : `Question ${questionInPhase} of 5`}
            </div>
            {/* Progress dots */}
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} style={{
                  width: n === questionInPhase ? 28 : 12,
                  height: 12, borderRadius: 6,
                  background: n < questionInPhase ? `${catColor}55` : n === questionInPhase ? catColor : 'rgba(255,255,255,0.1)',
                  boxShadow: n === questionInPhase ? `0 0 12px ${catColor}66` : 'none',
                  transition: 'all 0.3s ease',
                }} />
              ))}
            </div>
          </div>

          {cat && (
            <>
              {/* Emoji — float idle */}
              <div style={{
                fontSize: 'clamp(80px, 14vw, 180px)',
                animation: 'phasePop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.25s both, cfloat 4s ease-in-out 1s infinite',
                position: 'relative', zIndex: 5,
              }}>{catEmoji}</div>

              {/* Category name — glow pulse idle */}
              <div style={{
                fontFamily: fontFam,
                fontSize: 'clamp(68px, 13vw, 200px)', fontWeight: 900, lineHeight: 1,
                color: catColor,
                textShadow: `0 0 80px ${catColor}44, 0 8px 0 ${catColor}33`,
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
        const targetStr = q.targetValue != null ? q.targetValue.toLocaleString('de-DE') : '—';
        const unitStr = (q as any).unit ?? '';
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
              <span style={{ fontSize: 'clamp(22px, 2.6vw, 34px)' }}>🎯</span>
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
                  ? `Δ ${a.distance.toLocaleString('de-DE')}${unitStr ? ` ${unitStr}` : ''}`
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
                        {isWinner ? '🥇' : `#${i + 1}`}
                      </span>
                      {a.team && (
                        <span style={{
                          width: 'clamp(28px, 3vw, 38px)', height: 'clamp(28px, 3vw, 38px)',
                          borderRadius: '50%', background: a.team.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 'clamp(16px, 1.8vw, 22px)',
                          flexShrink: 0,
                        }}>{qqGetAvatar(a.team.avatarId).emoji}</span>
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
                            <span style={{
                              width: 'clamp(26px, 3vw, 36px)', height: 'clamp(26px, 3vw, 36px)',
                              borderRadius: '50%', background: tm.color,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 'clamp(16px, 1.9vw, 22px)',
                            }}>{qqGetAvatar(tm.avatarId).emoji}</span>
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
                }}>⚡ Schnellster zuerst</span>
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
                      <span style={{ fontSize: 'clamp(16px, 1.9vw, 22px)' }}>{qqGetAvatar(tm.avatarId).emoji}</span>
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
                animation: 'contentReveal 0.5s ease 0.05s both',
              }}>
                <span style={{
                  width: 'clamp(44px, 4.5vw, 60px)', height: 'clamp(44px, 4.5vw, 60px)',
                  borderRadius: '50%', background: winner.team.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'clamp(22px, 2.6vw, 34px)', flexShrink: 0,
                  boxShadow: `0 0 20px ${winner.team.color}66`,
                }}>
                  {qqGetAvatar(winner.team.avatarId).emoji}
                </span>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{
                    fontSize: 'clamp(11px, 1vw, 14px)', fontWeight: 900, color: '#94a3b8',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>
                    🏆 {lang === 'en' ? 'Round winner' : 'Rundensieger'}
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
              const isCorrect = optIdx === q.correctOptionIndex;
              const color = isCorrect ? '#22C55E' : (ALLIN_COLORS[optIdx] ?? '#64748b');
              // Team contributions on this option (only teams with >0 pts), sorted desc
              const contribs = parsed
                .map(p => ({ team: s.teams.find(t => t.id === p.teamId), pts: p.pts[optIdx] ?? 0 }))
                .filter((c): c is { team: NonNullable<typeof c.team>; pts: number } => !!c.team && c.pts > 0)
                .sort((a, b) => b.pts - a.pts);
              const totalPts = totalsPerOption[optIdx];
              const barPct = (totalPts / globalMax) * 100;
              return (
                <div key={optIdx} style={{
                  borderRadius: 14, overflow: 'hidden',
                  background: isCorrect ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.035)',
                  border: isCorrect ? '2px solid rgba(34,197,94,0.55)' : '1.5px solid rgba(255,255,255,0.08)',
                  boxShadow: isCorrect ? '0 0 0 3px rgba(34,197,94,0.12)' : 'none',
                  animation: `contentReveal 0.4s ease ${0.1 + optIdx * 0.08}s both`,
                }}>
                  {/* Row 1: label + total */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
                    <span style={{
                      width: 'clamp(36px, 4vw, 52px)', height: 'clamp(36px, 4vw, 52px)',
                      borderRadius: 10, background: color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 'clamp(16px, 1.9vw, 24px)', fontWeight: 900, color: '#fff',
                      flexShrink: 0,
                    }}>
                      {isCorrect ? '✓' : optIdx + 1}
                    </span>
                    <span style={{
                      flex: 1,
                      fontSize: 'clamp(15px, 1.7vw, 22px)', fontWeight: 800,
                      color: isCorrect ? '#86efac' : '#e2e8f0',
                    }}>
                      {optText}
                    </span>
                    <span style={{
                      fontSize: 'clamp(18px, 2.2vw, 30px)', fontWeight: 900,
                      color: isCorrect ? '#4ade80' : color,
                      minWidth: 56, textAlign: 'right',
                    }}>
                      💰 {totalPts}
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
                      const segPct = totalPts > 0 ? (c.pts / totalPts) * 100 : 0;
                      return (
                        <div key={c.team.id} style={{
                          width: `${segPct}%`,
                          background: c.team.color,
                          borderRight: ci < contribs.length - 1 ? '2px solid rgba(0,0,0,0.4)' : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: 4, minWidth: 0, overflow: 'hidden',
                          fontSize: 'clamp(11px, 1.1vw, 14px)', fontWeight: 900, color: '#fff',
                          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                          animation: `contentReveal 0.5s ease ${0.2 + optIdx * 0.08 + ci * 0.05}s both`,
                        }}>
                          <span style={{ fontSize: 'clamp(14px, 1.5vw, 18px)' }}>{qqGetAvatar(c.team.avatarId).emoji}</span>
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
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%', background: tm.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14,
                      }}>{qqGetAvatar(tm.avatarId).emoji}</span>
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

      {/* CHEESE: typed answers with speed for ties */}
      {q.category === 'CHEESE' && (() => {
        const sorted = [...s.answers].sort((a, b) => a.submittedAt - b.submittedAt);
        const t0 = s.timerEndsAt ? s.timerEndsAt - (s.timerDurationSec * 1000) : (sorted[0]?.submittedAt ?? 0);
        const winners = sorted.filter(a => a.teamId === s.correctTeamId);
        const hasTie = winners.length > 1 || sorted.filter(a => {
          // Count teams with same answer as winner
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
              return (
                <div key={a.teamId} style={{
                  display: 'flex', alignItems: 'stretch', gap: 0,
                  borderRadius: 14, overflow: 'hidden',
                  background: isWinner ? 'rgba(34,197,94,0.14)' : 'rgba(255,255,255,0.035)',
                  border: isWinner ? '2px solid rgba(34,197,94,0.55)' : '1.5px solid rgba(255,255,255,0.08)',
                  boxShadow: isWinner ? '0 0 0 3px rgba(34,197,94,0.12)' : 'none',
                  animation: `contentReveal 0.45s ease ${0.1 + i * 0.08}s both`,
                  minHeight: 60,
                }}>
                  <div style={{
                    width: 'clamp(60px, 6.5vw, 90px)',
                    background: isWinner ? 'linear-gradient(135deg,#22C55E,#16A34A)' : `${team.color}30`,
                    borderRight: `2px solid ${isWinner ? 'rgba(34,197,94,0.5)' : team.color + '50'}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, gap: 2,
                  }}>
                    <span style={{ fontSize: 'clamp(22px, 2.6vw, 34px)', lineHeight: 1 }}>{qqGetAvatar(team.avatarId).emoji}</span>
                    <span style={{ fontSize: 'clamp(10px, 1vw, 13px)', fontWeight: 900, color: isWinner ? '#fff' : team.color, letterSpacing: 0.3 }}>
                      {team.name}
                    </span>
                  </div>
                  <div style={{
                    flex: 1, padding: '10px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <span style={{
                      flex: 1,
                      fontSize: 'clamp(18px, 2.4vw, 32px)', fontWeight: 900,
                      color: isWinner ? '#86efac' : '#e2e8f0',
                      lineHeight: 1.2,
                    }}>
                      {a.text || '—'}
                    </span>
                    {hasTie && timeSec && (
                      <span style={{
                        padding: '4px 10px', borderRadius: 999,
                        background: i === 0 && isWinner ? 'rgba(251,191,36,0.22)' : 'rgba(0,0,0,0.28)',
                        border: i === 0 && isWinner ? '1.5px solid rgba(251,191,36,0.6)' : '1px solid rgba(255,255,255,0.1)',
                        fontSize: 'clamp(11px, 1.1vw, 14px)', fontWeight: 800,
                        color: i === 0 && isWinner ? '#FBBF24' : '#94a3b8',
                        whiteSpace: 'nowrap',
                      }}>
                        {i === 0 && isWinner ? '⚡ ' : ''}{timeSec}s
                      </span>
                    )}
                    {isWinner && (
                      <span style={{ fontSize: 'clamp(20px, 2.4vw, 30px)', color: '#4ade80', fontWeight: 900 }}>✓</span>
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
                          <span style={{
                            width: 'clamp(24px, 2.8vw, 32px)', height: 'clamp(24px, 2.8vw, 32px)',
                            borderRadius: '50%', background: tm.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 'clamp(14px, 1.6vw, 18px)',
                          }}>{qqGetAvatar(tm.avatarId).emoji}</span>
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
              }}>🏆 Treffer</span>
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
                    <span style={{ fontSize: 'clamp(14px, 1.5vw, 18px)' }}>{qqGetAvatar(tm.avatarId).emoji}</span>
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
                          <span key={tm.id} title={tm.name} style={{
                            width: 'clamp(24px, 2.6vw, 32px)', height: 'clamp(24px, 2.6vw, 32px)',
                            borderRadius: '50%', background: tm.color,
                            border: '2px solid rgba(0,0,0,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 'clamp(13px, 1.5vw, 17px)',
                            marginLeft: hi > 0 ? -6 : 0,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                            animation: `contentReveal 0.3s ease ${0.2 + pi * 0.08 + hi * 0.04}s both`,
                          }}>{qqGetAvatar(tm.avatarId).emoji}</span>
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
              }}>🎯 Richtige Positionen</span>
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
                    <span style={{ fontSize: 'clamp(14px, 1.5vw, 18px)' }}>{qqGetAvatar(tm.avatarId).emoji}</span>
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
              {team && <span style={{ fontSize: 18 }}>{qqGetAvatar(team.avatarId).emoji}</span>}
              <span style={{ fontWeight: 800, color: team?.color ?? '#e2e8f0', flex: 1, fontSize: 13 }}>{team?.name}</span>
              <span style={{ fontFamily: "'Caveat', cursive", fontSize: 15, color: isWinner ? '#4ade80' : '#64748b' }}>📍 {distStr}</span>
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
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [80, 80], maxZoom: 9, animate: true, duration: 0.9 });
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps
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
        {/* Winner card — füllt volle Spaltenhöhe */}
        <div style={{
          height: '100%',
          background: 'transparent',
          border: 'none',
          borderRadius: 26,
          padding: 'clamp(18px, 2.4vh, 32px) clamp(8px, 1.4vw, 24px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          gap: 14, minHeight: 0,
          opacity: revealedMinIdx === 0 ? 1 : 0.35,
          filter: revealedMinIdx === 0 ? 'none' : 'blur(3px)',
          transition: 'opacity 0.7s ease, filter 0.7s ease',
        }}>
          <div style={{
            fontSize: 'clamp(11px, 1vw, 14px)', fontWeight: 900, color: '#94a3b8',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            🏆 {winners.length > 1
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
            const avatarSize =
              wn === 1 ? 'clamp(110px, 12vw, 180px)'
              : wn === 2 ? 'clamp(96px, 10vw, 150px)'
              : wn === 3 ? 'clamp(82px, 8.5vw, 124px)'
              : wn === 4 ? 'clamp(72px, 7.5vw, 108px)'
              : wn === 5 ? 'clamp(64px, 6.5vw, 92px)'
              : 'clamp(58px, 6vw, 84px)';
            const emojiSize =
              wn === 1 ? 'clamp(70px, 8vw, 120px)'
              : wn === 2 ? 'clamp(60px, 7vw, 100px)'
              : wn === 3 ? 'clamp(52px, 5.6vw, 84px)'
              : wn === 4 ? 'clamp(46px, 5vw, 72px)'
              : wn === 5 ? 'clamp(40px, 4.4vw, 62px)'
              : 'clamp(36px, 4vw, 56px)';
            const nameSize =
              wn === 1 ? 'clamp(40px, 4.6vw, 76px)'
              : wn === 2 ? 'clamp(34px, 3.8vw, 60px)'
              : wn === 3 ? 'clamp(30px, 3.4vw, 52px)'
              : wn === 4 ? 'clamp(26px, 3vw, 44px)'
              : wn === 5 ? 'clamp(24px, 2.7vw, 40px)'
              : 'clamp(22px, 2.5vw, 36px)';
            const subSize =
              wn === 1 ? 'clamp(18px, 1.9vw, 30px)'
              : wn === 2 ? 'clamp(16px, 1.7vw, 26px)'
              : wn === 3 ? 'clamp(15px, 1.6vw, 24px)'
              : wn === 4 ? 'clamp(14px, 1.5vw, 22px)'
              : wn === 5 ? 'clamp(13px, 1.4vw, 20px)'
              : 'clamp(13px, 1.3vw, 19px)';
            const rowGap = wn <= 2 ? 18 : wn === 3 ? 14 : wn === 4 ? 12 : wn === 5 ? 10 : 8;
            const itemGap = wn <= 2 ? 20 : wn === 3 ? 18 : wn === 4 ? 16 : 14;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: rowGap, minHeight: 0, overflow: 'hidden' }}>
                {winners.map(w => {
                  const tm = s.teams.find(t => t.id === w.teamId);
                  if (!tm) return null;
                  return (
                    <div key={tm.id} style={{
                      display: 'flex', alignItems: 'center', gap: itemGap, minWidth: 0,
                      animation: revealedMinIdx === 0 ? 'revealWinnerIn 0.6s cubic-bezier(0.34,1.4,0.64,1) 0.2s both' : 'none',
                    }}>
                      <span style={{
                        fontSize: emojiSize, lineHeight: 1,
                        width: avatarSize, height: avatarSize,
                        borderRadius: '50%', background: tm.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        animation: revealedMinIdx === 0 ? 'celebShake 0.6s ease 0.6s both' : 'none',
                      }}>
                        {qqGetAvatar(tm.avatarId).emoji}
                      </span>
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
                    <div
                      key={tm.id}
                      title={tm.name}
                      style={{
                        width: 'clamp(36px, 3.8vw, 54px)', height: 'clamp(36px, 3.8vw, 54px)',
                        borderRadius: '50%', background: tm.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 'clamp(20px, 2.2vw, 30px)',
                        border: '2px solid rgba(0,0,0,0.25)',
                        boxShadow: `0 0 14px ${tm.color}66`,
                        animation: isVisible
                          ? `top5AvatarPop 0.5s cubic-bezier(0.34,1.6,0.64,1) ${0.35 + hi * 0.09}s both`
                          : 'none',
                      }}
                    >
                      {qqGetAvatar(tm.avatarId).emoji}
                    </div>
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

      {/* ── Bottom: Winner + Rangliste ─────────────────────────── */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 7fr)',
        gap: 'clamp(16px, 2.5vw, 36px)',
        minHeight: 0,
      }}>
        {/* Winner */}
        <div style={{
          height: '100%',
          background: 'transparent',
          border: 'none',
          borderRadius: 26,
          padding: 'clamp(18px, 2.4vh, 32px) clamp(8px, 1.4vw, 24px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          gap: 14, minHeight: 0,
          opacity: revealedMinIdx === 0 ? 1 : 0.35,
          filter: revealedMinIdx === 0 ? 'none' : 'blur(3px)',
          transition: 'opacity 0.7s ease, filter 0.7s ease',
        }}>
          <div style={{
            fontSize: 'clamp(11px, 1vw, 14px)', fontWeight: 900, color: '#94a3b8',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            🏆 {winners.length > 1
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
            const avatarSize =
              wn === 1 ? 'clamp(110px, 12vw, 180px)'
              : wn === 2 ? 'clamp(96px, 10vw, 150px)'
              : wn === 3 ? 'clamp(82px, 8.5vw, 124px)'
              : wn === 4 ? 'clamp(72px, 7.5vw, 108px)'
              : wn === 5 ? 'clamp(64px, 6.5vw, 92px)'
              : 'clamp(58px, 6vw, 84px)';
            const emojiSize =
              wn === 1 ? 'clamp(70px, 8vw, 120px)'
              : wn === 2 ? 'clamp(60px, 7vw, 100px)'
              : wn === 3 ? 'clamp(52px, 5.6vw, 84px)'
              : wn === 4 ? 'clamp(46px, 5vw, 72px)'
              : wn === 5 ? 'clamp(40px, 4.4vw, 62px)'
              : 'clamp(36px, 4vw, 56px)';
            const nameSize =
              wn === 1 ? 'clamp(40px, 4.6vw, 76px)'
              : wn === 2 ? 'clamp(34px, 3.8vw, 60px)'
              : wn === 3 ? 'clamp(30px, 3.4vw, 52px)'
              : wn === 4 ? 'clamp(26px, 3vw, 44px)'
              : wn === 5 ? 'clamp(24px, 2.7vw, 40px)'
              : 'clamp(22px, 2.5vw, 36px)';
            const subSize =
              wn === 1 ? 'clamp(18px, 1.9vw, 30px)'
              : wn === 2 ? 'clamp(16px, 1.7vw, 26px)'
              : wn === 3 ? 'clamp(15px, 1.6vw, 24px)'
              : wn === 4 ? 'clamp(14px, 1.5vw, 22px)'
              : wn === 5 ? 'clamp(13px, 1.4vw, 20px)'
              : 'clamp(13px, 1.3vw, 19px)';
            const rowGap = wn <= 2 ? 18 : wn === 3 ? 14 : wn === 4 ? 12 : wn === 5 ? 10 : 8;
            const itemGap = wn <= 2 ? 20 : wn === 3 ? 18 : wn === 4 ? 16 : 14;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: rowGap, minHeight: 0, overflow: 'hidden' }}>
                {winners.map(w => {
                  const tm = s.teams.find(t => t.id === w.teamId);
                  if (!tm) return null;
                  return (
                    <div key={tm.id} style={{
                      display: 'flex', alignItems: 'center', gap: itemGap, minWidth: 0,
                      animation: revealedMinIdx === 0 ? 'revealWinnerIn 0.6s cubic-bezier(0.34,1.4,0.64,1) 0.2s both' : 'none',
                    }}>
                      <span style={{
                        fontSize: emojiSize, lineHeight: 1,
                        width: avatarSize, height: avatarSize,
                        borderRadius: '50%', background: tm.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        animation: revealedMinIdx === 0 ? 'celebShake 0.6s ease 0.6s both' : 'none',
                      }}>
                        {qqGetAvatar(tm.avatarId).emoji}
                      </span>
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

        {/* Right column: Ranking bottom-up */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.2vh, 14px)',
          justifyContent: 'space-between',
          minHeight: 0, height: '100%',
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
                  fontSize: 'clamp(20px, 2.3vw, 34px)', fontWeight: 900,
                  color: hasHits ? '#86efac' : '#cbd5e1',
                  lineHeight: 1.2,
                  minWidth: 0, wordBreak: 'break-word',
                }}>
                  {hasHits ? '✓ ' : ''}{itemText}
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  flexShrink: 0,
                }}>
                  {hasHits ? (
                    hitters.map((tm, hi) => (
                      <div
                        key={tm.id}
                        title={tm.name}
                        style={{
                          width: 'clamp(36px, 3.8vw, 54px)', height: 'clamp(36px, 3.8vw, 54px)',
                          borderRadius: '50%', background: tm.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 'clamp(20px, 2.2vw, 30px)',
                          border: '2px solid rgba(0,0,0,0.25)',
                          boxShadow: `0 0 14px ${tm.color}66`,
                          animation: isVisible
                            ? `top5AvatarPop 0.5s cubic-bezier(0.34,1.6,0.64,1) ${0.35 + hi * 0.09}s both`
                            : 'none',
                        }}
                      >
                        {qqGetAvatar(tm.avatarId).emoji}
                      </div>
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
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SchaetzchenReveal — Split-Screen (Top5-Style):
// oben Frage + Lösung, links Gewinner-Card, rechts Rangliste bottom-up.
// Ranking wird von schlechtester→bester Schätzung enthüllt (Trommelwirbel bis #1).
// ═══════════════════════════════════════════════════════════════════════════════
function SchaetzchenReveal({ state: s, lang }: { state: QQStateUpdate; lang: 'de' | 'en' }) {
  const q = s.currentQuestion!;
  const target = q.targetValue as number;

  const fmt = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (abs >= 10000) return (n / 1000).toFixed(0) + 'k';
    if (abs >= 1000) return n.toLocaleString(lang === 'en' ? 'en-US' : 'de-DE');
    return n % 1 === 0 ? String(n) : n.toFixed(1);
  };

  // Parse + Distanz. Sort: bester (geringste |Δ|) zuerst → letzter zuletzt.
  const ranked = useMemo(() => {
    return s.answers
      .map(a => {
        const num = Number(String(a.text).replace(/[^0-9.,\-]/g, '').replace(',', '.'));
        const team = s.teams.find(t => t.id === a.teamId);
        if (!team || !Number.isFinite(num)) return null;
        return { teamId: a.teamId, num, team, delta: Math.abs(num - target) };
      })
      .filter((x): x is { teamId: string; num: number; team: NonNullable<ReturnType<typeof s.teams.find>>; delta: number } => !!x)
      .sort((a, b) => a.delta - b.delta);
  }, [s.answers, s.teams, target]);

  const n = ranked.length;
  const winnerDelta = ranked[0]?.delta ?? Infinity;
  const winners = ranked.filter(r => r.delta === winnerDelta);

  // Bottom-up reveal: Start mit n (keiner sichtbar). Dann n-1, n-2, …, 0.
  // revealedMinIdx = kleinster Rank-Index (0-basiert), der bereits sichtbar ist.
  // Rank 0 = bester, Rank n-1 = schlechtester. Wir zeigen zuerst Rank n-1 (schlechtester)
  // und enthüllen dann nach oben bis #1 (bester).
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
      flex: 1, display: 'grid',
      gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 7fr)',
      gap: 'clamp(16px, 2.5vw, 36px)',
      padding: 'clamp(16px, 2vh, 28px) clamp(20px, 3vw, 48px)',
      animation: 'contentReveal 0.45s ease both',
      minHeight: 0,
    }}>
      {/* ── Linke Spalte: Frage oben, Winner-Card darunter ────── */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        gap: 'clamp(14px, 1.8vh, 22px)',
        minHeight: 0, minWidth: 0,
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '2px solid rgba(255,255,255,0.08)',
          borderRadius: 26,
          padding: 'clamp(16px, 2vh, 26px) clamp(20px, 2.4vw, 36px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
          animation: 'bQuestionIn 0.5s cubic-bezier(0.34,1.4,0.64,1) both',
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: 'clamp(11px, 1vw, 14px)', fontWeight: 900, color: '#EAB308',
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10,
          }}>
            🎯 {lang === 'en' ? 'Guess It — Reveal' : 'Schätzchen — Auflösung'}
          </div>
          <div key={lang} style={{
            display: 'flex', flexDirection: 'column', gap: 12,
            animation: 'langFadeIn 0.4s ease both',
          }}>
            <div style={{
              fontSize: qText.length > 120 ? 'clamp(20px, 1.9vw, 28px)' : 'clamp(22px, 2.2vw, 34px)',
              fontWeight: 900, lineHeight: 1.18, color: '#F1F5F9',
              minWidth: 0,
            }}>
              {qText}
            </div>
            <div style={{
              alignSelf: 'flex-start',
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '10px 22px', borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(34,197,94,0.22), rgba(22,163,74,0.08))',
              border: '2px solid rgba(34,197,94,0.55)',
              boxShadow: '0 0 32px rgba(34,197,94,0.25)',
              animation: 'revealAnswerBam 0.55s cubic-bezier(0.22,1,0.36,1) 0.25s both',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 'clamp(20px, 2vw, 28px)' }}>✓</span>
              <span style={{
                fontWeight: 900, color: '#86efac',
                fontSize: 'clamp(26px, 3vw, 44px)', lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}>{fmt(target)}</span>
            </div>
          </div>
        </div>

        {/* Winner-Card — füllt den Rest der linken Spalte */}
        <div style={{
          flex: 1,
          background: winners.length > 0
            ? `linear-gradient(135deg, ${winners[0].team.color}22, rgba(0,0,0,0.25))`
            : 'rgba(239,68,68,0.06)',
          border: winners.length > 0
            ? `2px solid ${winners[0].team.color}55`
            : '2px solid rgba(239,68,68,0.25)',
          borderRadius: 26,
          padding: 'clamp(18px, 2.4vh, 32px) clamp(20px, 2.4vw, 36px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          gap: 14, minHeight: 0,
          opacity: revealedMinIdx === 0 ? 1 : 0.35,
          filter: revealedMinIdx === 0 ? 'none' : 'blur(3px)',
          transition: 'opacity 0.7s ease, filter 0.7s ease',
          boxShadow: revealedMinIdx === 0 && winners.length > 0
            ? `0 0 60px ${winners[0].team.color}33`
            : 'none',
        }}>
          <div style={{
            fontSize: 'clamp(11px, 1vw, 14px)', fontWeight: 900, color: '#94a3b8',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            🏆 {winners.length > 1
              ? (lang === 'en' ? 'Closest (tie)' : 'Am nächsten (unentschieden)')
              : (lang === 'en' ? 'Closest' : 'Am nächsten dran')}
          </div>
          {winners.length === 0 ? (
            <div style={{ fontSize: 'clamp(20px, 2.2vw, 32px)', fontWeight: 900, color: '#f87171' }}>
              {lang === 'en' ? 'No valid guesses.' : 'Keine gültigen Schätzungen.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {winners.map(w => (
                <div key={w.teamId} style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  animation: revealedMinIdx === 0 ? 'revealWinnerIn 0.6s cubic-bezier(0.34,1.4,0.64,1) 0.2s both' : 'none',
                }}>
                  <span style={{
                    fontSize: 'clamp(48px, 6vw, 84px)', lineHeight: 1,
                    width: 'clamp(72px, 8vw, 110px)', height: 'clamp(72px, 8vw, 110px)',
                    borderRadius: '50%', background: w.team.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, boxShadow: `0 0 30px ${w.team.color}66`,
                    animation: revealedMinIdx === 0 ? 'celebShake 0.6s ease 0.6s both' : 'none',
                  }}>
                    {qqGetAvatar(w.team.avatarId).emoji}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: 'clamp(26px, 3.2vw, 50px)', fontWeight: 900, color: w.team.color,
                      textShadow: `0 0 20px ${w.team.color}44`, lineHeight: 1.1,
                    }}>{w.team.name}</div>
                    <div style={{
                      fontSize: 'clamp(14px, 1.5vw, 22px)', fontWeight: 800, color: '#cbd5e1', marginTop: 4,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {fmt(w.num)}
                      <span style={{ color: '#64748b', fontWeight: 700, marginLeft: 8 }}>
                        {w.delta === 0
                          ? (lang === 'en' ? '· exact!' : '· genau!')
                          : `· Δ ${fmt(w.delta)}`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Rechte Spalte: Ranking bottom-up (schlechtester zuerst, bester zuletzt) ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.2vh, 14px)',
        justifyContent: 'space-between',
        minHeight: 0, height: '100%',
      }}>
          {ranked.map((r, idx) => {
            const rank = idx + 1;
            const isVisible = idx >= revealedMinIdx;
            const isTop = rank === 1;
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
                    : 'rgba(148,163,184,0.06)',
                  border: isTop
                    ? `2px solid ${r.team.color}66`
                    : '2px solid rgba(148,163,184,0.15)',
                  visibility: isVisible ? 'visible' : 'hidden',
                  animation: isVisible
                    ? `top5RowSlideIn 0.55s cubic-bezier(0.22,1,0.36,1) both, top5RowGlow 1.2s ease 0.3s both`
                    : 'none',
                  flex: 1,
                  minHeight: 'clamp(64px, 8vh, 92px)',
                  boxShadow: isTop ? `0 0 28px ${r.team.color}33` : 'none',
                }}
              >
                {/* Rank-Badge */}
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
                {/* Avatar */}
                <div style={{
                  width: 'clamp(44px, 4.4vw, 62px)', height: 'clamp(44px, 4.4vw, 62px)',
                  borderRadius: '50%', background: r.team.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'clamp(24px, 2.6vw, 36px)',
                  border: '2px solid rgba(0,0,0,0.25)',
                  boxShadow: `0 0 14px ${r.team.color}66`,
                  flexShrink: 0,
                  animation: isVisible ? `top5AvatarPop 0.5s cubic-bezier(0.34,1.6,0.64,1) 0.35s both` : 'none',
                }}>
                  {qqGetAvatar(r.team.avatarId).emoji}
                </div>
                {/* Name + Schätzung */}
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 'clamp(18px, 2vw, 28px)', fontWeight: 900,
                    color: isTop ? r.team.color : '#e2e8f0',
                    lineHeight: 1.1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{r.team.name}</div>
                  <div style={{
                    fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 700,
                    color: '#94a3b8', marginTop: 2,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {fmt(r.num)}
                  </div>
                </div>
                {/* Delta-Pille */}
                <div style={{
                  padding: '6px 14px', borderRadius: 999,
                  background: isTop ? 'rgba(250,204,21,0.18)' : 'rgba(15,23,42,0.6)',
                  border: isTop ? '2px solid rgba(250,204,21,0.5)' : '1.5px solid rgba(148,163,184,0.25)',
                  fontSize: 'clamp(14px, 1.5vw, 22px)', fontWeight: 900,
                  color: isTop ? '#FDE68A' : '#cbd5e1',
                  fontVariantNumeric: 'tabular-nums',
                  flexShrink: 0,
                  animation: isVisible ? `top5AvatarPop 0.5s cubic-bezier(0.34,1.6,0.64,1) 0.45s both` : 'none',
                }}>
                  {r.delta === 0 ? '🎯 0' : `Δ ${fmt(r.delta)}`}
                </div>
              </div>
            );
          })}
          {ranked.length === 0 && (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#64748b', fontSize: 'clamp(18px, 2vw, 28px)', fontWeight: 700,
            }}>
              {lang === 'en' ? 'No valid guesses.' : 'Keine gültigen Schätzungen.'}
            </div>
          )}
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
    const span = Math.max(spanLat, spanLng, 10); // mind. 10° auch bei engem Zoom
    // Merge-Schwelle ~6% der Spannweite, mind. 2.5° (2 nah beieinander = ein Cluster).
    const MERGE_DEG = Math.max(2.5, span * 0.06);

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
      // Spread-Radius ~7% der Spannweite + Bonus pro Pin im Cluster.
      // Bei 3 Pins über 60° Span → ~5° Radius (statt früher 1.6°).
      const radiusDeg = Math.max(2.0, span * 0.07 + list.length * 0.4);
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

  // FitBounds bounds aus aktuell sichtbaren Punkten — display-Positionen verwenden,
  // damit fan-out-Pins nicht außerhalb der Map landen.
  const bounds = useMemo(() => {
    const b = L.latLngBounds([] as any);
    if (showTarget) b.extend([tLat, tLng]);
    for (const p of revealedPins) {
      const dp = displayPos.get(p.teamId);
      const lat = dp?.lat ?? p.lat;
      const lng = dp?.lng ?? p.lng;
      b.extend([lat, lng]);
    }
    if (!b.isValid()) b.extend([tLat, tLng]);
    return b;
  }, [showTarget, revealedPins, tLat, tLng, displayPos]);

  const targetIcon = useMemo(() => L.divIcon({
    className: 'qq-target-pin',
    html: `<div style="
      width: 72px; height: 72px; border-radius: 50%;
      background: radial-gradient(circle, #FDE68A 0%, #FBBF24 60%, #B45309 100%);
      border: 4px solid #FEF3C7;
      box-shadow: 0 0 0 8px rgba(251,191,36,0.25), 0 0 40px rgba(251,191,36,0.85), 0 8px 24px rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      animation: qqTargetPulse 2.1s ease-in-out infinite;
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

  const makeTeamIcon = (color: string, emoji: string) => L.divIcon({
    className: 'qq-team-pin',
    html: `<div style="
      width: 48px; height: 48px; border-radius: 50%;
      background: #0f172a;
      border: 4px solid ${color};
      box-shadow: 0 0 0 2px rgba(15,23,42,0.9), 0 6px 20px rgba(0,0,0,0.6), 0 0 22px ${color}66;
      display: flex; align-items: center; justify-content: center;
      font-size: 26px; line-height: 1;
      animation: qqTeamPinDrop 0.55s cubic-bezier(0.34,1.56,0.64,1) both;
    ">${emoji}</div>`,
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
          zoom={4}
          zoomControl={false}
          attributionControl={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          dragging={false}
          touchZoom={false}
          style={{ width: '100%', height: '100%', background: '#0a1120' }}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <QQMapResizer trigger={showRanking} />
          <QQFitBoundsOnTrigger bounds={bounds} trigger={step} />
          {showTarget && (
            <Marker position={[tLat, tLng] as any} icon={targetIcon} />
          )}
          {revealedPins.map(p => {
            const team = s.teams.find(t => t.id === p.teamId);
            if (!team) return null;
            const dp = displayPos.get(p.teamId);
            const lat = dp?.lat ?? p.lat;
            const lng = dp?.lng ?? p.lng;
            return (
              <Marker
                key={p.teamId}
                position={[lat, lng] as any}
                icon={makeTeamIcon(team.color, qqGetAvatar(team.avatarId).emoji)}
              />
            );
          })}
        </MapContainer>

        {/* Title-Overlay oben */}
        <div style={{
          position: 'absolute', top: 28, left: '50%', transform: 'translateX(-50%)',
          padding: '12px 28px', borderRadius: 999,
          background: 'rgba(15,23,42,0.85)', border: '2px solid rgba(251,191,36,0.4)',
          color: '#FDE68A', fontWeight: 900, fontSize: 'clamp(20px, 2.4vw, 32px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 28px rgba(251,191,36,0.25)',
          zIndex: 1000, letterSpacing: 0.3,
        }}>
          🌍 {title}
        </div>

        {/* Antwort-Label unten (wenn Target sichtbar) */}
        {showTarget && q.answer && (
          <div style={{
            position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
            padding: '14px 32px', borderRadius: 18,
            background: 'rgba(34,197,94,0.14)', border: '2.5px solid rgba(34,197,94,0.45)',
            color: '#86efac', fontWeight: 900, fontSize: 'clamp(22px, 2.8vw, 38px)',
            boxShadow: '0 0 50px rgba(34,197,94,0.25)',
            animation: 'revealAnswerBam 0.6s cubic-bezier(0.22,1,0.36,1) both',
            zIndex: 1000,
          }}>
            ✓ {lang === 'en' && q.answerEn ? q.answerEn : q.answer}
          </div>
        )}
      </div>

      {/* Ranking-Panel rechts (slide-in) */}
      {showRanking && (
        <div style={{
          flex: '0 0 36%', padding: '48px 28px 28px',
          background: 'linear-gradient(180deg, rgba(15,23,42,0.96), rgba(13,10,6,0.96))',
          borderLeft: '2px solid rgba(251,191,36,0.2)',
          boxShadow: '-12px 0 40px rgba(0,0,0,0.5)',
          animation: 'qqMapRankSlideIn 0.7s cubic-bezier(0.22,1,0.36,1) both',
          display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto',
        }}>
          <div style={{
            fontWeight: 900, fontSize: 'clamp(22px, 2.2vw, 30px)',
            color: '#FDE68A', marginBottom: 8, textAlign: 'center', letterSpacing: 0.4,
          }}>
            🏆 {lang === 'en' ? 'Closest to target' : 'Am nächsten dran'}
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
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;
              const dist = p.distKm == null ? '—' : p.distKm < 1 ? `${Math.round(p.distKm * 1000)} m` : `${p.distKm.toFixed(1)} km`;
              const isTop = i === 0;
              const key = bucket(p.distKm);
              const isTied = (tieGroups[key] ?? 0) > 1;
              const deltaMs = isTied && p.submittedAt ? p.submittedAt - (groupEarliest[key] ?? p.submittedAt) : 0;
              const timeLabel = isTied ? (deltaMs === 0 ? '⚡ zuerst' : `+${(deltaMs / 1000).toFixed(1)}s`) : null;
              return (
                <div key={p.teamId} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 16px', borderRadius: 14,
                  background: isTop ? `linear-gradient(90deg, ${team.color}22, ${team.color}0a)` : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${isTop ? team.color + '88' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: isTop ? `0 0 24px ${team.color}44` : 'none',
                  animation: `contentReveal 0.45s ease ${0.15 + i * 0.08}s both`,
                }}>
                  <span style={{ fontSize: 'clamp(22px, 2.4vw, 32px)', width: 44, textAlign: 'center' }}>{medal}</span>
                  <span style={{ fontSize: 'clamp(26px, 2.8vw, 38px)', lineHeight: 1 }}>{qqGetAvatar(team.avatarId).emoji}</span>
                  <span style={{ flex: 1, fontWeight: 900, fontSize: 'clamp(16px, 1.6vw, 22px)', color: team.color }}>{team.name}</span>
                  {timeLabel && (
                    <span style={{
                      fontWeight: 800, fontSize: 'clamp(12px, 1.1vw, 15px)',
                      padding: '3px 9px', borderRadius: 999,
                      background: deltaMs === 0 ? 'rgba(250,204,21,0.18)' : 'rgba(148,163,184,0.12)',
                      color: deltaMs === 0 ? '#FDE68A' : '#94a3b8',
                      border: `1px solid ${deltaMs === 0 ? 'rgba(250,204,21,0.4)' : 'rgba(148,163,184,0.25)'}`,
                    }}>{timeLabel}</span>
                  )}
                  <span style={{ fontWeight: 800, fontSize: 'clamp(15px, 1.4vw, 20px)', color: isTop ? '#86efac' : '#94a3b8', fontFamily: "'Caveat', cursive" }}>📍 {dist}</span>
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
  const cutouts = CAT_CUTOUTS[cat] ?? [];
  // Per-question emoji override: replace default cutout emojis
  const effectiveCutouts = q.emojis?.length
    ? cutouts.map((c, i) => q.emojis![i] ? { ...c, emoji: q.emojis![i] } : c)
    : cutouts;
  const cardBg = s.theme?.cardBg ?? '#1B1510';
  const img = q.image;
  // For CHEESE (Picture This): show image even with layout='none' — it's the main visual
  const isCheese = cat === 'CHEESE';
  const hasImg = img && img.url && (isCheese || img.layout !== 'none');
  const isWindow = hasImg && !isCheese && (img.layout === 'window-left' || img.layout === 'window-right');
  const lang = useLangFlip(s.language);

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
  const cheeseOverlay = isCheese && hasImg;
  const cheeseWithQuestion = cheeseOverlay && !revealed;
  const isCheeseReveal = cheeseOverlay && revealed;
  const cheeseFullscreen = cheeseOverlay;

  // Auto-size: shorter fontSize for long questions (no size change on reveal — prevents reflow)
  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';
  const isOrderBt = q.category === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'order';
  // Order-BunteTüte hat in der Question-Phase keine Items am Beamer (Phone-Eingabe),
  // deshalb gleiche Größen wie normale Kategorien. Nur im Reveal wird geshrunken
  // (qFontSizeShrunk weiter unten), damit die Rangfolge darunter passt.
  // min(vw, vh) verhindert Overflow nach oben/unten auf niedrigen Displays.
  const qFontSize = qText.length > 200 ? 'clamp(26px, min(3vw, 4.5vh), 44px)'
    : qText.length > 120 ? 'clamp(32px, min(3.8vw, 6vh), 58px)'
    : qText.length > 80  ? 'clamp(36px, min(4.5vw, 7vh), 72px)'
    : qText.length > 40  ? 'clamp(42px, min(5.2vw, 8vh), 84px)'
    : 'clamp(48px, min(6vw, 9vh), 96px)';

  // Category intro overlay removed — category is already shown in PHASE_INTRO

  return (
    <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
      {/* Fullscreen background image: non-CHEESE fullscreen layout OR CHEESE overlay (all phases) */}
      {((hasImg && img.layout === 'fullscreen' && !isCheese) || cheeseFullscreen) && (() => {
        // CHEESE Crop: offsetX/Y steuern background-position, scale steuert Zoom.
        // scale wird ≥1 geclampt damit das Bild IMMER das volle Beamer-Bild füllt
        // (keine schwarzen Ränder). backgroundSize 'cover' + positionX/Y = klassischer Crop.
        const cheeseOX = img!.offsetX ?? 0;
        const cheeseOY = img!.offsetY ?? 0;
        const cheeseZoom = Math.max(1, img!.scale ?? 1);
        // mappt -100..100 → 0..100% background-position (50 = center)
        const cheesePosX = 50 + cheeseOX / 2;
        const cheesePosY = 50 + cheeseOY / 2;
        return (
        <>
          <div style={{
            position: cheeseFullscreen ? 'fixed' : 'absolute', inset: 0, zIndex: cheeseFullscreen ? 50 : 1,
            backgroundImage: `url(${img!.url})`,
            backgroundSize: 'cover',
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

      {/* Fireflies */}
      <Fireflies />

      {/* ── CHEESE overlay cards (Phase 2 + Reveal) ── */}
      {(cheeseWithQuestion || isCheeseReveal) && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 52,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'flex-end', alignItems: 'center',
          padding: '40px 48px 48px',
          pointerEvents: 'none',
        }}>
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

          {/* Team-Answer-Progress (vor dem Reveal) — spiegelt non-CHEESE-Layout wider */}
          {!revealed && s.teams.length > 0 && (
            <div style={{
              position: 'absolute', top: 72, left: 0, right: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              pointerEvents: 'none', zIndex: 9,
              animation: 'contentReveal 0.45s ease 0.35s both',
            }}>
              <div style={{
                fontSize: 'clamp(13px, 1.3vw, 18px)', fontWeight: 800,
                color: s.allAnswered ? '#86EFAC' : 'rgba(226,232,240,0.75)',
                textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                transition: 'color 0.3s ease',
              }}>
                {s.allAnswered
                  ? (lang === 'en' ? '✅ All teams answered!' : '✅ Alle Teams haben geantwortet!')
                  : `${s.answers.length}/${s.teams.length} Teams`}
              </div>
              {(() => {
                const tc = s.teams.length;
                const av = tc > 6 ? 36 : tc > 4 ? 42 : 46;
                const gap = tc > 6 ? 8 : tc > 4 ? 10 : 12;
                const emoji = tc > 6 ? 20 : tc > 4 ? 23 : 26;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap }}>
                    {s.teams.map(tm => {
                      const answered = s.answers.some(a => a.teamId === tm.id);
                      return (
                        <div key={tm.id} style={{
                          position: 'relative',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: av, height: av, borderRadius: '50%',
                          background: answered ? `${tm.color}25` : 'rgba(0,0,0,0.35)',
                          border: `2.5px solid ${answered ? tm.color : 'rgba(255,255,255,0.18)'}`,
                          transition: 'all 0.4s ease',
                          opacity: answered ? 1 : 0.55,
                          boxShadow: answered ? `0 0 14px ${tm.color}66` : '0 2px 8px rgba(0,0,0,0.5)',
                          flexShrink: 0,
                        }}>
                          <span style={{ fontSize: emoji, lineHeight: 1 }}>{qqGetAvatar(tm.avatarId).emoji}</span>
                          {answered && (
                            <div style={{
                              position: 'absolute', bottom: -3, right: -3,
                              width: 18, height: 18, borderRadius: '50%',
                              background: '#22C55E', border: '2px solid #0D0A06',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 900, color: '#fff',
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

          {/* Frosted question/answer card — bottom */}
          <div style={{
            width: '100%', maxWidth: 900,
            background: 'rgba(13,10,6,0.38)',
            backdropFilter: 'blur(18px) saturate(1.25)',
            WebkitBackdropFilter: 'blur(18px) saturate(1.25)',
            border: `1px solid ${isCheeseReveal ? 'rgba(255,255,255,0.10)' : `${accent}2a`}`,
            borderRadius: 28,
            padding: isCheeseReveal ? '28px 48px' : '36px 56px',
            boxShadow: `0 24px 80px rgba(0,0,0,0.5), 0 0 40px ${accent}15`,
            animation: cheeseWithQuestion ? 'bQuestionIn 0.5s cubic-bezier(0.34,1.4,0.64,1) 0.1s both'
              : 'revealAnswerBam 0.5s cubic-bezier(0.22,1,0.36,1) both',
            transition: 'padding 0.4s ease, border-color 0.4s ease',
            pointerEvents: 'auto',
            textAlign: 'center',
          }}>
            {/* Category pill — fade out on reveal */}
            <div style={{
              overflow: 'hidden',
              maxHeight: revealed ? 0 : 60,
              opacity: revealed ? 0 : 1,
              marginBottom: revealed ? 0 : 14,
              transition: 'max-height 0.35s ease, opacity 0.25s ease, margin-bottom 0.35s ease',
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '6px 18px', borderRadius: 999,
                background: `${accent}22`, border: `1.5px solid ${accent}44`,
              }}>
                <span style={{ fontSize: 'clamp(16px, 1.8vw, 22px)' }}>{catLabel.emoji}</span>
                <span style={{
                  fontSize: 'clamp(13px, 1.4vw, 18px)', fontWeight: 900,
                  color: accent, letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>{lang === 'en' ? catLabel.en : catLabel.de}</span>
              </div>
            </div>

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
                ✓ {s.revealedAnswer}
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
              return (
                <div style={{
                  marginTop: 14,
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                  gap: 12, flexWrap: 'wrap', width: '100%',
                  animation: 'revealAnswerBam 0.5s cubic-bezier(0.34,1.4,0.64,1) 0.45s both',
                }}>
                  {correctAnswers.map((a, i) => {
                    const team = s.teams.find(t => t.id === a.teamId);
                    if (!team) return null;
                    const av = qqGetAvatar(team.avatarId);
                    const timeSec = Math.max(0, (a.submittedAt - t0) / 1000);
                    const isFastest = i === 0;
                    return (
                      <div key={a.teamId} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      }}>
                        <div style={{
                          position: 'relative',
                          width: 'clamp(44px, 5vw, 64px)',
                          height: 'clamp(44px, 5vw, 64px)',
                          borderRadius: '50%',
                          background: team.color,
                          border: isFastest ? '3px solid #FBBF24' : '2px solid rgba(255,255,255,0.5)',
                          boxShadow: isFastest
                            ? '0 0 20px rgba(251,191,36,0.55), 0 4px 12px rgba(0,0,0,0.4)'
                            : '0 4px 12px rgba(0,0,0,0.4)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 'clamp(22px, 2.6vw, 34px)',
                          animation: isFastest ? 'celebShake 0.6s ease 0.9s both' : 'none',
                        }}>
                          {av.emoji}
                          {isFastest && (
                            <span style={{
                              position: 'absolute', top: -10, right: -10,
                              fontSize: 'clamp(16px, 1.8vw, 22px)', lineHeight: 1,
                            }}>⚡</span>
                          )}
                        </div>
                        <span style={{
                          padding: '2px 8px', borderRadius: 999,
                          background: isFastest ? 'rgba(251,191,36,0.22)' : 'rgba(0,0,0,0.55)',
                          border: isFastest ? '1.5px solid rgba(251,191,36,0.7)' : '1px solid rgba(255,255,255,0.15)',
                          color: isFastest ? '#FBBF24' : '#cbd5e1',
                          fontWeight: 900,
                          fontSize: 'clamp(12px, 1.2vw, 15px)',
                          whiteSpace: 'nowrap',
                        }}>
                          {timeSec.toFixed(1)}s
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* Main content (non-CHEESE or hidden during CHEESE overlay) */}
      <div style={{
        flex: 1, display: cheeseOverlay ? 'none' : 'flex', gap: 0,
        flexDirection: (hasImg && img.layout === 'window-left') ? 'row-reverse' : 'row',
        animation: 'contentReveal 0.35s ease both',
      }}>
        {/* ── Main content — full width, vertically + horizontally centered ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 'clamp(12px, 1.5vh, 24px) clamp(28px, 4vw, 64px) clamp(16px, 2vh, 40px)', justifyContent: 'center', alignItems: 'center', position: 'relative', zIndex: 5, overflow: 'hidden' }}>

          {/* Category badge — top left corner */}
          <div style={{
            position: 'absolute', top: 20, left: 48, zIndex: 10,
            opacity: revealed ? 0 : 1,
            transition: 'opacity 0.3s ease',
            pointerEvents: revealed ? 'none' : 'auto',
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '8px 22px', borderRadius: 999,
              background: `${accent}18`, border: `2px solid ${accent}44`,
              animation: 'contentReveal 0.35s ease both',
            }}>
              <span style={{ fontSize: 'clamp(18px, 2vw, 26px)' }}>{catLabel.emoji}</span>
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

          {/* Question card — beim Schätzchen-Reveal schrumpft Text + Padding via transition, damit mehr Platz für den Zeitstrahl entsteht (kein Reflow / Umbruch) */}
          {(() => {
            const shrinkOnReveal = revealed && q.category === 'SCHAETZCHEN';
            // Gleiche Größen-Staffelung wie qFontSize, nur kleiner — Text fließt gleich um
            const qFontSizeShrunk = isOrderBt
              ? (qText.length > 120 ? 'clamp(14px, 1.4vw, 22px)'
                : qText.length > 60 ? 'clamp(16px, 1.8vw, 26px)'
                : 'clamp(18px, 2vw, 30px)')
              : qText.length > 200 ? 'clamp(18px, 2.1vw, 30px)'
              : qText.length > 120 ? 'clamp(22px, 2.7vw, 40px)'
              : qText.length > 60  ? 'clamp(26px, 3.6vw, 52px)'
              : 'clamp(32px, 4.2vw, 64px)';
            return (
              <div style={{
                background: cardBg,
                border: `2px solid ${revealed ? 'rgba(255,255,255,0.04)' : `${accent}22`}`,
                borderRadius: 28,
                boxShadow: revealed
                  ? '0 4px 16px rgba(0,0,0,0.3)'
                  : `0 0 60px ${accent}15, 0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`,
                padding: shrinkOnReveal
                  ? 'clamp(10px, 1.4vh, 18px) clamp(20px, 2.5vw, 40px)'
                  : 'clamp(20px, 3vh, 48px) clamp(28px, 4vw, 64px)',
                marginBottom: 'clamp(8px, 1.2vh, 20px)',
                width: '100%', maxWidth: 1400,
                textAlign: 'center',
                animation: 'bQuestionIn 0.5s cubic-bezier(0.34,1.4,0.64,1) both',
                transition: 'box-shadow 0.5s ease, border-color 0.5s ease, opacity 0.5s ease, filter 0.5s ease, padding 0.55s cubic-bezier(0.34,1.4,0.64,1)',
                opacity: revealed ? 0.45 : 1,
              }}>
                <div key={lang} style={{
                  fontSize: shrinkOnReveal ? qFontSizeShrunk : qFontSize,
                  fontWeight: 900, lineHeight: 1.22,
                  color: '#F1F5F9',
                  animation: 'langFadeIn 0.4s ease both',
                  transition: 'font-size 0.55s cubic-bezier(0.34,1.4,0.64,1)',
                }}>
                  {qText}
                </div>
              </div>
            );
          })()}

          {/* Mobile hint — fade out on reveal */}
          {(() => {
            const hints: Record<string, { de: string; en: string }> = {
              SCHAETZCHEN:   { de: '📱 Gebt eure Schätzung auf dem Handy ein', en: '📱 Enter your estimate on your phone' },
              MUCHO:         { de: '📱 Wählt die richtige Antwort auf dem Handy', en: '📱 Pick the right answer on your phone' },
              BUNTE_TUETE:   { de: '📱 Antwort jetzt auf dem Handy eingeben', en: '📱 Enter your answer on your phone' },
              ZEHN_VON_ZEHN: { de: '📱 Verteilt eure Punkte auf dem Handy', en: '📱 Distribute your points on your phone' },
              CHEESE:        { de: '📱 Antwort auf dem Handy eingeben', en: '📱 Enter your answer on your phone' },
            };
            const hint = hints[cat] ?? hints.BUNTE_TUETE;
            return (
              <div style={{
                fontSize: 'clamp(16px, 1.8vw, 24px)', fontWeight: 700,
                color: 'rgba(148,163,184,0.8)', letterSpacing: '0.02em',
                overflow: 'hidden',
                maxHeight: revealed ? 0 : 60,
                opacity: revealed ? 0 : 1,
                marginBottom: revealed ? 0 : 16,
                transition: 'max-height 0.4s ease, opacity 0.25s ease, margin-bottom 0.4s ease',
                animation: !revealed ? 'contentReveal 0.4s ease 0.3s both' : undefined,
              }}>
                {lang === 'en' ? hint.en : hint.de}
              </div>
            );
          })()}

          {/* MUCHO / ZEHN_VON_ZEHN option cards */}
          {q.options && (q.category === 'MUCHO' || q.category === 'ZEHN_VON_ZEHN') && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: q.category === 'MUCHO' ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 18, marginBottom: 16,
              width: '100%', maxWidth: 1400,
              animation: 'contentReveal 0.35s ease 0.1s both',
            }}>
              {q.options.map((opt, i) => {
                const optImg = q.optionImages?.[i];
                const isCorrect = revealed && i === q.correctOptionIndex;
                const isWrong = revealed && i !== q.correctOptionIndex;
                const muchoLabels = ['A', 'B', 'C', 'D'];
                const MUCHO_COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#22C55E'];
                const label = q.category === 'MUCHO' ? muchoLabels[i] : `${i + 1}`;
                const optColor = q.category === 'MUCHO' ? MUCHO_COLORS[i] : accent;
                const optText = lang === 'en' && q.optionsEn?.[i] ? q.optionsEn[i] : opt;
                return (
                  <div key={i} style={{
                    position: 'relative', overflow: 'hidden',
                    borderRadius: 20, padding: '24px 28px',
                    background: isCorrect ? 'rgba(34,197,94,0.2)' : cardBg,
                    border: isCorrect ? '3px solid #22C55E' : isWrong ? `2px solid rgba(255,255,255,0.06)` : `2px solid ${optColor}55`,
                    boxShadow: isCorrect ? '0 0 40px rgba(34,197,94,0.35), 0 0 80px rgba(34,197,94,0.15)' : `0 4px 16px rgba(0,0,0,0.3)`,
                    display: 'flex', alignItems: 'center', gap: 16,
                    minHeight: optImg?.url ? 100 : 84,
                    transition: 'all 0.3s ease',
                    animation: isCorrect
                      ? 'revealCorrectPop 0.55s cubic-bezier(0.34,1.4,0.64,1) 0.25s both'
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
                    }}>{isCorrect ? '✓' : label}</div>
                    <div style={{
                      position: 'relative', zIndex: 1,
                      flex: 1, minWidth: 0,
                      display: 'flex', flexDirection: 'column', gap: 10,
                    }}>
                      <div style={{
                        fontSize: 'clamp(26px, 3.2vw, 44px)', fontWeight: 800,
                        color: isWrong ? '#475569' : '#F1F5F9', lineHeight: 1.3,
                        textShadow: optImg?.url ? '0 2px 8px rgba(0,0,0,0.8)' : 'none',
                        transition: 'color 0.3s ease',
                      }}>{optText}</div>
                      {revealed && q.category === 'MUCHO' && (() => {
                        const voters = s.answers
                          .filter(a => a.text === String(i))
                          .sort((a, b) => a.submittedAt - b.submittedAt)
                          .map(a => {
                            const team = s.teams.find(t => t.id === a.teamId);
                            return team ? { team, submittedAt: a.submittedAt } : null;
                          })
                          .filter((x): x is { team: NonNullable<ReturnType<typeof s.teams.find>>; submittedAt: number } => !!x);
                        if (voters.length === 0) return null;
                        // Zeit-Anker: Timer-Start, sonst schnellster Voter als Fallback.
                        const t0 = s.timerEndsAt && s.timerDurationSec
                          ? s.timerEndsAt - s.timerDurationSec * 1000
                          : voters[0]?.submittedAt;
                        return (
                          <div style={{
                            display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 8,
                            animation: 'revealAnswerBam 0.5s cubic-bezier(0.34,1.4,0.64,1) 0.6s both',
                          }}>
                            {voters.map((v, vi) => {
                              const tm = v.team;
                              const timeSec = t0 ? Math.max(0, (v.submittedAt - t0) / 1000) : null;
                              const isFastest = isCorrect && vi === 0;
                              return (
                                <div key={tm.id} style={{
                                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                                }}>
                                  <div title={tm.name} style={{
                                    position: 'relative',
                                    width: 'clamp(36px, 4vw, 52px)',
                                    height: 'clamp(36px, 4vw, 52px)',
                                    borderRadius: '50%',
                                    background: tm.color,
                                    border: isFastest ? '3px solid #FBBF24' : '3px solid #fff',
                                    boxShadow: isFastest
                                      ? '0 0 18px rgba(251,191,36,0.55), 0 4px 12px rgba(0,0,0,0.5)'
                                      : '0 4px 12px rgba(0,0,0,0.5)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 'clamp(20px, 2.3vw, 30px)',
                                  }}>
                                    {qqGetAvatar(tm.avatarId).emoji}
                                    {isFastest && (
                                      <span style={{
                                        position: 'absolute', top: -8, right: -8,
                                        fontSize: 'clamp(14px, 1.6vw, 20px)', lineHeight: 1,
                                      }}>⚡</span>
                                    )}
                                  </div>
                                  {timeSec != null && isCorrect && (
                                    <span style={{
                                      padding: '1px 7px', borderRadius: 999,
                                      background: isFastest ? 'rgba(251,191,36,0.22)' : 'rgba(0,0,0,0.6)',
                                      border: isFastest ? '1.5px solid rgba(251,191,36,0.7)' : '1px solid rgba(255,255,255,0.15)',
                                      color: isFastest ? '#FBBF24' : '#e2e8f0',
                                      fontWeight: 900,
                                      fontSize: 'clamp(11px, 1.1vw, 14px)',
                                      whiteSpace: 'nowrap',
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
                  </div>
                );
              })}
            </div>
          )}

          {/* ZEHN_VON_ZEHN: Bet-Chips UNTER den Options-Cards (volle Breite, nicht
              über dem Antwort-Text). Eine Zeile pro Option, nur bei Treffern. */}
          {revealed && q.category === 'ZEHN_VON_ZEHN' && q.options && (
            <div style={{
              width: '100%', maxWidth: 1400,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 18, marginBottom: 16,
            }}>
              {q.options.map((_, i) => {
                const bets = s.answers.map(a => {
                  const pts = a.text.split(',').map(n => Number(n) || 0);
                  return { team: s.teams.find(t => t.id === a.teamId), pts: pts[i] ?? 0 };
                }).filter((b): b is { team: NonNullable<typeof b.team>; pts: number } => !!b.team && b.pts > 0);
                return (
                  <div key={`bets-${i}`} style={{
                    display: 'flex', flexWrap: 'wrap', gap: 6,
                    justifyContent: 'center', alignItems: 'center',
                    minHeight: 'clamp(36px, 4.5vw, 54px)',
                    animation: 'revealAnswerBam 0.5s cubic-bezier(0.34,1.4,0.64,1) 0.6s both',
                  }}>
                    {bets.length === 0 ? (
                      <span style={{ fontSize: 'clamp(13px, 1.4vw, 18px)', color: '#475569', fontStyle: 'italic' }}>—</span>
                    ) : bets.map(({ team: tm, pts }) => (
                      <div key={tm.id} title={`${tm.name}: ${pts}`} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '3px 12px 3px 3px', borderRadius: 999,
                        background: 'rgba(0,0,0,0.55)',
                        border: `2px solid ${tm.color}`,
                        boxShadow: `0 3px 10px rgba(0,0,0,0.5), 0 0 8px ${tm.color}44`,
                      }}>
                        <span style={{
                          width: 'clamp(28px, 3vw, 40px)', height: 'clamp(28px, 3vw, 40px)',
                          borderRadius: '50%', background: tm.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 'clamp(16px, 1.8vw, 24px)',
                        }}>{qqGetAvatar(tm.avatarId).emoji}</span>
                        <span style={{
                          fontSize: 'clamp(14px, 1.6vw, 22px)', fontWeight: 900,
                          color: '#FBBF24', fontVariantNumeric: 'tabular-nums',
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
              sortiert nach Reaktionszeit (schnellster mit ⚡-Krone). */}
          {revealed && s.revealedAnswer && q.category !== 'MUCHO' && q.category !== 'ZEHN_VON_ZEHN'
            && !(q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato') && (() => {
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
                  background: 'rgba(34,197,94,0.12)',
                  border: '3px solid rgba(34,197,94,0.50)',
                  boxShadow: '0 0 60px rgba(34,197,94,0.25), 0 0 120px rgba(34,197,94,0.1)',
                  marginBottom: 'clamp(8px, 1.2vh, 24px)',
                  width: '100%', maxWidth: 1400,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 'clamp(10px, 1.4vh, 18px)',
                  animation: 'revealAnswerBam 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both',
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
                  }}>
                    ✓ {lang === 'en' && q.answerEn ? q.answerEn : s.revealedAnswer}
                  </span>
                  {correctTeams.length > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                      gap: 12, flexWrap: 'wrap',
                      flexShrink: 0, width: '100%',
                      position: 'relative', zIndex: 1,
                      animation: 'revealAnswerBam 0.5s cubic-bezier(0.34,1.4,0.64,1) 0.6s both',
                    }}>
                      {correctTeams.map((ct, vi) => {
                        const timeSec = t0 ? Math.max(0, (ct.submittedAt - t0) / 1000) : null;
                        const isFastest = vi === 0;
                        return (
                          <div key={ct.team.id} style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                          }}>
                            <div style={{
                              position: 'relative',
                              width: 'clamp(44px, 5vw, 64px)',
                              height: 'clamp(44px, 5vw, 64px)',
                              borderRadius: '50%',
                              background: ct.team.color,
                              border: isFastest ? '3px solid #FBBF24' : '2px solid rgba(255,255,255,0.5)',
                              boxShadow: isFastest
                                ? `0 0 20px rgba(251,191,36,0.55), 0 4px 12px rgba(0,0,0,0.4)`
                                : '0 4px 12px rgba(0,0,0,0.4)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 'clamp(22px, 2.6vw, 34px)',
                            }}>
                              {qqGetAvatar(ct.team.avatarId).emoji}
                              {isFastest && (
                                <span style={{
                                  position: 'absolute', top: -10, right: -10,
                                  fontSize: 'clamp(16px, 1.8vw, 22px)', lineHeight: 1,
                                }}>⚡</span>
                              )}
                            </div>
                            {timeSec != null && (
                              <span style={{
                                padding: '2px 8px', borderRadius: 999,
                                background: isFastest ? 'rgba(251,191,36,0.22)' : 'rgba(0,0,0,0.55)',
                                border: isFastest ? '1.5px solid rgba(251,191,36,0.7)' : '1px solid rgba(255,255,255,0.15)',
                                color: isFastest ? '#FBBF24' : '#cbd5e1',
                                fontWeight: 900,
                                fontSize: 'clamp(12px, 1.2vw, 15px)',
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
            return (
              <div style={{
                width: '100%', maxWidth: 1400, marginBottom: 'clamp(8px, 1.2vh, 24px)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
                animation: 'revealAnswerBam 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both',
              }}>
                <div style={{
                  fontSize: 'clamp(20px, 2.4vw, 32px)', fontWeight: 900,
                  color: '#86efac', letterSpacing: 0.5,
                }}>
                  🥔 {lang === 'en' ? 'All possible answers' : 'Alle möglichen Antworten'}
                </div>
                <div style={{
                  display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10,
                  padding: '18px 22px', borderRadius: 22,
                  background: 'rgba(34,197,94,0.08)',
                  border: '2px solid rgba(34,197,94,0.3)',
                }}>
                  {allAnswers.map((a, i) => {
                    const authorId = findAuthor(a);
                    const named = authorId !== null || usedNorm.some((u: string) =>
                      u === a.toLowerCase().trim() || u.includes(a.toLowerCase().trim()) || a.toLowerCase().trim().includes(u)
                    );
                    const authorTeam = authorId ? s.teams.find(t => t.id === authorId) : null;
                    return (
                      <div key={`${a}-${i}`} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: authorTeam ? '4px 16px 4px 4px' : '8px 18px',
                        borderRadius: 999,
                        fontSize: 'clamp(16px, 1.8vw, 24px)', fontWeight: 800,
                        background: named ? 'rgba(34,197,94,0.22)' : 'rgba(15,23,42,0.5)',
                        border: `2px solid ${authorTeam ? authorTeam.color : (named ? '#22C55E' : 'rgba(148,163,184,0.25)')}`,
                        color: named ? '#86efac' : '#94a3b8',
                        animation: `contentReveal 0.4s ease ${0.2 + i * 0.05}s both`,
                        boxShadow: authorTeam ? `0 0 12px ${authorTeam.color}44` : 'none',
                      }}>
                        {authorTeam && (
                          <span title={authorTeam.name} style={{
                            width: 'clamp(30px, 3vw, 40px)', height: 'clamp(30px, 3vw, 40px)',
                            borderRadius: '50%', background: authorTeam.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 'clamp(16px, 1.8vw, 22px)', flexShrink: 0,
                            border: '2px solid rgba(0,0,0,0.25)',
                          }}>
                            {qqGetAvatar(authorTeam.avatarId).emoji}
                          </span>
                        )}
                        <span>{named ? '✓ ' : ''}{a}</span>
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
              const chipW = isWinner ? 100 : 70;
              const chipH = isWinner ? 40 : 30;
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
            const fmt = (n: number) => {
              const abs = Math.abs(n);
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
                    }}>🎯</span>
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
                        <div style={{
                          position: 'absolute', left: '50%', top: 0,
                          transform: 'translate(-50%, -50%)',
                          width: isWinner ? 'clamp(72px, 7vw, 96px)' : 'clamp(60px, 6vw, 82px)',
                          height: isWinner ? 'clamp(72px, 7vw, 96px)' : 'clamp(60px, 6vw, 82px)',
                          borderRadius: '50%', background: tColor,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: isWinner ? 'clamp(38px, 4vw, 54px)' : 'clamp(32px, 3.4vw, 46px)',
                          border: isWinner ? '3px solid #FBBF24' : '2px solid rgba(0,0,0,0.3)',
                          boxShadow: isWinner
                            ? `0 0 24px ${tColor}aa, 0 0 44px rgba(251,191,36,0.5)`
                            : `0 4px 12px rgba(0,0,0,0.5)`,
                        }}>
                          {qqGetAvatar(p.team!.avatarId).emoji}
                        </div>
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
                                padding: isWinner ? '7px 18px' : '5px 14px',
                                borderRadius: 12,
                                background: 'rgba(0,0,0,0.88)',
                                border: `2px solid ${tColor}`,
                                color: '#fff', fontWeight: 900,
                                fontSize: isWinner ? 'clamp(26px, 2.8vw, 36px)' : 'clamp(18px, 2vw, 26px)',
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
              Avatare/Werte sind am Strahl bereits sichtbar). */}
          {revealed && q.category === 'SCHAETZCHEN' && s.answers.length > 0 && (() => {
            const ranked = s.answers
              .map(a => {
                const num = Number(a.text.replace(/[^0-9.,\-]/g, '').replace(',', '.'));
                const team = s.teams.find(t => t.id === a.teamId);
                const distance = Number.isNaN(num) || q.targetValue == null ? Infinity : Math.abs(num - q.targetValue);
                return { ...a, num, distance, team };
              })
              .sort((a, b) => a.distance - b.distance);
            const w = ranked[0];
            if (!w || w.distance === Infinity || !w.team) return null;
            const tColor = w.team.color;
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
                  <span style={{ fontSize: 'clamp(26px, 2.8vw, 36px)', lineHeight: 1 }}>🏆</span>
                  <span style={{ fontSize: 'clamp(28px, 3vw, 40px)', lineHeight: 1, flexShrink: 0 }}>
                    {qqGetAvatar(w.team.avatarId).emoji}
                  </span>
                  <span style={{
                    fontWeight: 900, fontSize: 'clamp(22px, 2.4vw, 32px)', color: tColor, lineHeight: 1.1,
                  }}>{w.team.name}</span>
                  <span style={{
                    color: '#cbd5e1', fontSize: 'clamp(19px, 2.1vw, 28px)', fontWeight: 700, lineHeight: 1.1,
                  }}>
                    {lang === 'en' ? 'was closest!' : 'war am nächsten dran!'}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Correct team — winner banner (non-Schätzchen) */}
          {revealed && s.correctTeamId && q.category !== 'SCHAETZCHEN' && (() => {
            const cat = q.category;
            const isEn = lang === 'en';

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

            const winMsg = cat === 'CHEESE'
              ? (isEn ? 'got it right!' : 'hat es erkannt!')
              : cat === 'BUNTE_TUETE'
                ? (isEn ? 'wins the round!' : 'gewinnt die Runde!')
                : cat === 'ZEHN_VON_ZEHN'
                  ? (allInTied
                      ? (isEn ? 'had the most points — and was fastest!' : 'hatte die meisten Punkte — und war am schnellsten!')
                      : (isEn ? 'bet the most points on the correct answer!' : 'hat die meisten Punkte auf die richtige Antwort gesetzt!'))
                  : muchoSpeedWin
                    ? (isEn ? 'fastest & correct!' : 'am schnellsten & richtig!')
                    : (isEn ? 'correct!' : 'richtig!');

            // Echter Zeit-Gleichstand (gleiche max Punkte + gleiche ms) → mehrere Sieger
            if (coWinners && coWinners.length > 1) {
              const coMsg = isEn
                ? `all tied on points & speed${allInTie ? ` (+${allInTie.winnerPts})` : ''}!`
                : `gleich viele Punkte und gleich schnell${allInTie ? ` (+${allInTie.winnerPts})` : ''}!`;
              return (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22,
                  padding: '22px 38px', borderRadius: 28, marginBottom: 12,
                  width: '100%', maxWidth: 1400, flexWrap: 'wrap',
                  background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.05))',
                  border: '2px solid rgba(251,191,36,0.55)',
                  boxShadow: '0 0 60px rgba(251,191,36,0.25), 0 8px 24px rgba(0,0,0,0.4)',
                  animation: 'revealWinnerIn 0.65s cubic-bezier(0.34,1.4,0.64,1) 0.7s both',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {coWinners.map((tm, i) => (
                      <div key={tm.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          fontSize: 'clamp(42px, 5vw, 72px)', lineHeight: 1,
                          width: 'clamp(64px, 7vw, 96px)', height: 'clamp(64px, 7vw, 96px)',
                          borderRadius: '50%', background: tm.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, boxShadow: `0 0 24px ${tm.color}66`,
                          animation: `celebShake 0.6s ease ${1.1 + i * 0.1}s both`,
                        }}>
                          {qqGetAvatar(tm.avatarId).emoji}
                        </span>
                        <div style={{
                          fontWeight: 900, fontSize: 'clamp(26px, 3.4vw, 48px)', color: tm.color, lineHeight: 1.1,
                          textShadow: `0 0 24px ${tm.color}44`,
                        }}>{tm.name}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{
                    color: '#fbbf24', fontSize: 'clamp(18px, 2.4vw, 30px)', fontWeight: 800,
                  }}>
                    {coMsg}
                  </div>
                </div>
              );
            }

            // Single-winner Banner
            return (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28,
                padding: '28px 44px', borderRadius: 28, marginBottom: 12,
                width: '100%', maxWidth: 1400,
                background: `linear-gradient(135deg, ${team!.color}22, ${team!.color}0a)`,
                border: `2px solid ${team!.color}66`,
                boxShadow: `0 0 60px ${team!.color}33, 0 8px 24px rgba(0,0,0,0.4)`,
                animation: 'revealWinnerIn 0.65s cubic-bezier(0.34,1.4,0.64,1) 0.7s both',
              }}>
                <span style={{
                  fontSize: 'clamp(64px, 8vw, 110px)', lineHeight: 1, flexShrink: 0,
                  animation: 'celebShake 0.6s ease 1.1s both',
                }}>
                  {qqGetAvatar(team!.avatarId).emoji}
                </span>
                <div>
                  <div style={{
                    fontWeight: 900, fontSize: 'clamp(36px, 5vw, 72px)', color: team!.color, lineHeight: 1.1,
                    textShadow: `0 0 30px ${team!.color}44`,
                  }}>
                    {team!.name}
                  </div>
                  <div style={{
                    color: '#94a3b8', fontSize: 'clamp(20px, 2.8vw, 36px)', fontWeight: 800, marginTop: 6,
                  }}>
                    {winMsg}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Confetti overlay on correct answer (delayed to sync with winner) */}
          {revealed && s.correctTeamId && (
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
                {s.answers.length === 0 ? '⏱' : '❌'}
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
              {/* Progress text */}
              <div style={{
                fontSize: 'clamp(14px, 1.5vw, 20px)', fontWeight: 800,
                color: s.allAnswered ? '#86EFAC' : '#64748b',
                transition: 'color 0.3s ease',
              }}>
                {s.allAnswered
                  ? (lang === 'en' ? '✅ All teams answered!' : '✅ Alle Teams haben geantwortet!')
                  : `${s.answers.length}/${s.teams.length} Teams`}
              </div>
              {/* Avatar row */}
              {(() => {
                const tc = s.teams.length;
                const av = tc > 6 ? 40 : tc > 4 ? 46 : 52;
                const gap = tc > 6 ? 8 : tc > 4 ? 11 : 14;
                const emoji = tc > 6 ? 22 : tc > 4 ? 25 : 28;
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
                          width: av, height: av, borderRadius: '50%',
                          background: answered ? `${tm.color}25` : 'rgba(255,255,255,0.04)',
                          border: `3px solid ${answered ? tm.color : 'rgba(255,255,255,0.08)'}`,
                          transition: 'all 0.4s ease',
                          opacity: answered ? 1 : 0.4,
                          boxShadow: answered ? `0 0 16px ${tm.color}44` : 'none',
                          flexShrink: 0,
                        }}>
                          <span style={{ fontSize: emoji, lineHeight: 1 }}>{qqGetAvatar(tm.avatarId).emoji}</span>
                          {answered && (
                            <div style={{
                              position: 'absolute', bottom: -4, right: -4,
                              width: 22, height: 22, borderRadius: '50%',
                              background: '#22C55E', border: '2px solid #0D0A06',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 900, color: '#fff',
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

  // Aufloesungsreihenfolge: Flash > Sticky Placer > pendingFor
  const activeTeamId = flashCell?.teamId ?? stickyPlacer ?? s.pendingFor;
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

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <Fireflies color={`${teamColor}77`} />

      {/* Top banner — feste Höhe (auch wenn kein Team aktiv ist), sonst springt das
          Grid darunter, sobald die Leiste verschwindet/erscheint. */}
      <div style={{
        height: 112, flexShrink: 0,
        padding: '20px 44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
        position: 'relative', zIndex: 5,
        background: team ? `linear-gradient(180deg, rgba(13,10,6,0.8) 0%, rgba(13,10,6,0.4) 100%)` : 'transparent',
        borderBottom: team ? `2px solid ${teamColor}22` : '2px solid transparent',
        visibility: team ? 'visible' : 'hidden',
      }}>
        {team && (
          <>
            <div style={{
              position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 72, height: 72, borderRadius: '50%',
              background: `${teamColor}20`,
              border: `3px solid ${teamColor}88`,
              boxShadow: `0 0 20px ${teamColor}44`,
              animation: 'activeTeamGlow 2s ease-in-out infinite',
              ['--team-color' as string]: `${teamColor}55`,
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 44, lineHeight: 1 }}>{qqGetAvatar(team.avatarId).emoji}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{
                fontWeight: 900, fontSize: 'clamp(28px, 3.5vw, 52px)', color: teamColor,
                textShadow: `0 0 24px ${teamColor}44`,
              }}>{team.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  fontSize: 'clamp(16px, 2vw, 26px)', fontWeight: 800,
                  color: '#e2e8f0',
                }}>
                  {actionVerb(s.pendingAction, lang)}
                </span>
                {s.teamPhaseStats[team.id] && (
                  <span style={{
                    padding: '3px 12px', borderRadius: 999,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                    color: '#94a3b8', fontSize: 'clamp(13px, 1.4vw, 18px)', fontWeight: 700,
                  }}>
                    {actionDesc(s.pendingAction, s.teamPhaseStats[team.id], lang)}
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>

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
            <GridDisplay state={s} maxSize={gridMaxSize} highlightTeam={activeTeamId} showJoker={false} flashCellKey={flashCell ? `${flashCell.row}-${flashCell.col}` : null} />
          )}
        </div>
        <div style={{
          // Fixe Breite statt flex:1 + maxWidth — sonst verschiebt sich der Grid-
          // Container, sobald ein Team-Name die intrinsische Spaltenbreite ändert.
          // Höhe = gridMaxSize sorgt dafür dass die Liste exakt Grid-Höhe hat.
          width: 540, height: gridMaxSize, flexShrink: 0,
          display: 'flex', alignItems: 'stretch', justifyContent: 'flex-start',
        }}>
          <ScoreBar teams={s.teams} activeTeamId={activeTeamId} />
        </div>
      </div>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMEBACK VIEW
// ═══════════════════════════════════════════════════════════════════════════════

export function ComebackView({ state: s }: { state: QQStateUpdate }) {
  const lang = useLangFlip(s.language);
  const cardBg = s.theme?.cardBg ?? '#1B1510';
  const team = s.teams.find(tm => tm.id === s.comebackTeamId);
  const teamColor = team?.color ?? '#F59E0B';
  const step = s.comebackIntroStep ?? 0;
  // Wenn eine Aktion gewaehlt ist, immer die Bestaetigung zeigen (Step wird ignoriert)
  const showChosen = !!s.comebackAction;
  const showOptions = step >= 2 && !showChosen;
  const showTeam    = step >= 1 || showChosen;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      padding: '48px 64px', gap: 24,
    }}>
      <Fireflies color={`${teamColor}55`} />

      {/* Title — BAM entrance */}
      <div style={{
        fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 900,
        color: '#F59E0B', textAlign: 'center',
        textShadow: '0 0 40px rgba(234,179,8,0.35)',
        animation: 'roundBam 0.6s cubic-bezier(0.22,1,0.36,1) both',
        position: 'relative', zIndex: 5,
      }}>
        ⚡ {lang === 'en' ? 'Comeback Chance!' : 'Comeback-Chance!'}
      </div>

      {/* Step 0: Erklärung "Was ist Comeback" */}
      {step === 0 && !showChosen && (
        <div key="intro0" style={{
          maxWidth: 1100, textAlign: 'center',
          padding: '36px 48px', borderRadius: 28,
          background: 'rgba(251,191,36,0.08)',
          border: '2px solid rgba(251,191,36,0.35)',
          boxShadow: '0 0 60px rgba(251,191,36,0.15), 0 8px 32px rgba(0,0,0,0.4)',
          animation: 'contentReveal 0.5s ease 0.2s both',
          position: 'relative', zIndex: 5,
        }}>
          <div style={{ fontSize: 'clamp(22px, 2.6vw, 34px)', lineHeight: 1.45, color: '#fde68a', fontWeight: 800, marginBottom: 18 }}>
            {lang === 'en'
              ? 'Before the final round every team gets a fair chance: the team currently in last place receives a Comeback-Boost.'
              : 'Vor der letzten Runde bekommt jedes Team eine faire Chance: Das Team, das gerade auf dem letzten Platz liegt, erhält einen Comeback-Boost.'}
          </div>
          <div style={{ fontSize: 'clamp(18px, 2vw, 26px)', color: '#fef3c7', opacity: 0.85, lineHeight: 1.5 }}>
            {lang === 'en'
              ? 'Three options to catch up — place, steal or swap.'
              : 'Drei Optionen zum Aufholen — setzen, klauen oder tauschen.'}
          </div>
        </div>
      )}

      {/* Step 1+: Team hero */}
      {showTeam && team && (
        <div key="team" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          animation: 'contentReveal 0.5s ease both',
          position: 'relative', zIndex: 5,
        }}>
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            background: `${teamColor}20`, border: `3px solid ${teamColor}88`,
            boxShadow: `0 0 30px ${teamColor}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'activeTeamGlow 2s ease-in-out infinite',
            ['--team-color' as string]: `${teamColor}55`,
          }}>
            <span style={{ fontSize: 60, lineHeight: 1 }}>{qqGetAvatar(team.avatarId).emoji}</span>
          </div>
          <div style={{
            fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 900, color: teamColor,
            textShadow: `0 0 24px ${teamColor}44`,
          }}>{team.name}</div>
          {step === 1 && !showChosen && (
            <div style={{
              marginTop: 8, padding: '14px 28px', borderRadius: 18,
              background: `${teamColor}14`, border: `2px solid ${teamColor}44`,
              fontSize: 'clamp(20px, 2.2vw, 30px)', fontWeight: 800, color: '#e2e8f0',
              maxWidth: 900, textAlign: 'center',
              animation: 'contentReveal 0.45s ease 0.15s both',
            }}>
              {lang === 'en'
                ? `${team.name} is in last place right now and chooses one of three comeback moves.`
                : `${team.name} liegt aktuell auf dem letzten Platz und wählt jetzt einen von drei Comeback-Moves.`}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Options */}
      {showOptions && team && (
        <div style={{
          width: '100%', maxWidth: 1100,
          animation: 'contentReveal 0.5s ease both',
          position: 'relative', zIndex: 5,
        }}>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            <ComebackOption icon="📍" label={bt.comeback.place2[lang]} desc={bt.comeback.place2desc[lang]} color="#22C55E" cardBg={cardBg} />
            <ComebackOption icon="⚡" label={bt.comeback.steal1[lang]}   desc={bt.comeback.steal1desc[lang]}   color="#EF4444" cardBg={cardBg} />
            <ComebackOption icon="🔄" label={bt.comeback.swap2[lang]} desc={bt.comeback.swap2desc[lang]} color="#8B5CF6" cardBg={cardBg} />
          </div>
        </div>
      )}

      {/* Chosen action confirmation */}
      {showChosen && team && (
        <div style={{
          width: '100%', maxWidth: 1100,
          animation: 'contentReveal 0.5s ease both',
          position: 'relative', zIndex: 5,
        }}>
          <div style={{
            padding: '32px 48px', borderRadius: 24, textAlign: 'center',
            background: cardBg, border: `2px solid ${teamColor}44`,
            boxShadow: `0 0 50px ${teamColor}18, 0 8px 32px rgba(0,0,0,0.5)`,
            fontSize: 'clamp(28px, 3.5vw, 48px)', fontWeight: 900, color: '#e2e8f0',
            animation: 'bQuestionIn 0.4s cubic-bezier(0.34,1.4,0.64,1) both',
          }}>
            {s.comebackAction === 'PLACE_2' && bt.comeback.chosenPlace2[lang]}
            {s.comebackAction === 'STEAL_1' && bt.comeback.chosenSteal1[lang]}
            {s.comebackAction === 'SWAP_2'  && bt.comeback.chosenSwap2[lang]}
          </div>
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
};

export function PausedView({ state: s, mode = 'pause' }: { state: QQStateUpdate; mode?: 'pause' | 'preGame' }) {
  const cardBg = '#141b2e';
  // Mode-spezifische Akzentfarbe für Titel/Panel-Border/Chips
  const modeAccent = mode === 'preGame' ? '#FBBF24' : '#38BDF8';
  const modeAccentDim = mode === 'preGame' ? 'rgba(251,191,36,0.35)' : 'rgba(56,189,248,0.4)';
  const modeGlow = mode === 'preGame' ? 'rgba(251,191,36,0.25)' : 'rgba(56,189,248,0.25)';
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

  // Fortschrittsbaum — nur in Pause (nicht im Pre-Game, da kein Spiel läuft)
  if (mode === 'pause' && (s.schedule?.length ?? 0) > 0) {
    panels.push({ key: 'progress', node: (
      <div>
        <div style={{ fontSize: 'clamp(24px, 2.8vw, 36px)', fontWeight: 900, color: '#e2e8f0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.25s both' }}>🗺️</span>
          {de ? 'Wo sind wir?' : 'Where are we?'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <QQProgressTree state={s} variant="inline" />
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
          <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.25s both' }}>📊</span> {de ? 'Aktueller Stand' : 'Current Standings'}
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
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </span>
                <span style={{ fontSize: avSize, lineHeight: 1, flexShrink: 0 }}>{qqGetAvatar(t.avatarId).emoji}</span>
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

  // All-time leaderboard (nur echte Siege)
  const realLeaderboard = leaderboard.filter(e => e.wins > 0);
  if (realLeaderboard.length > 0) {
    panels.push({ key: 'leaderboard', node: (
      <div>
        <div style={{ fontSize: 'clamp(24px, 2.8vw, 36px)', fontWeight: 900, color: '#e2e8f0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'inline-block', animation: 'panelIconPop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.25s both' }}>🏆</span> {de ? 'Bestenliste' : 'Leaderboard'}
          {totalGames > 0 && <span style={{ fontSize: 'clamp(16px, 1.8vw, 22px)', fontWeight: 600, color: '#475569' }}>({totalGames} {de ? 'Spiele' : 'games'})</span>}
        </div>
        {realLeaderboard.slice(0, 5).map((entry, i) => (
          <div key={entry.name} style={{
            display: 'flex', alignItems: 'center', gap: 18, padding: '12px 0',
            borderBottom: i < Math.min(realLeaderboard.length, 5) - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}>
            <span style={{ fontSize: 'clamp(28px, 3.2vw, 42px)', width: 48, textAlign: 'center' }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
            </span>
            <span style={{ flex: 1, fontWeight: 800, fontSize: 'clamp(22px, 2.6vw, 32px)', color: '#e2e8f0' }}>{entry.name}</span>
            <span style={{ fontSize: 'clamp(20px, 2.4vw, 28px)', fontWeight: 700, color: '#F59E0B' }}>{entry.wins} {de ? 'Siege' : 'wins'}</span>
            <span style={{ fontSize: 'clamp(14px, 1.6vw, 20px)', color: '#64748b' }}>{entry.games} {de ? 'Spiele' : 'games'}</span>
          </div>
        ))}
      </div>
    )});
  }

  // Records — nur Einträge mit echten Werten zeigen (0-Records sind irreführend)
  if (funStats) {
    const records: React.ReactNode[] = [];
    if (funStats.highestScore && funStats.highestScore.score > 0) {
      records.push(
        <div key="hs" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '12px 0' }}>
          <span style={{ fontSize: 'clamp(32px, 3.6vw, 48px)' }}>🔥</span>
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
          <span style={{ fontSize: 'clamp(32px, 3.6vw, 48px)' }}>🔥</span>
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
          <span style={{ fontSize: 'clamp(32px, 3.6vw, 48px)' }}>⚡</span>
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
      padding: '48px 64px', position: 'relative', overflow: 'hidden',
      gap: 32,
    }}>
      <Fireflies />

      {/* Title mit Glow-Pulse in Mode-Farbe */}
      <div style={{
        fontSize: 'clamp(28px, 3.2vw, 48px)', fontWeight: 900,
        color: modeAccent,
        display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 5,
        animation: 'lobbyPulse 3s ease-in-out infinite',
        whiteSpace: 'nowrap',
        textShadow: `0 0 24px ${modeGlow}, 0 0 48px ${modeGlow}`,
        letterSpacing: '0.02em',
      }}>
        {mode === 'preGame'
          ? <>✨ {de ? 'Gleich geht\'s los' : 'Starting soon'}</>
          : <>⏸ {de ? 'Kurze Pause' : 'Short Break'}</>}
      </div>

      {/* Records panel — mit Slide-In pro Panel-Wechsel */}
      {activePanel && (
        <div style={{
          width: '100%', maxWidth: 900, position: 'relative', zIndex: 5,
        }}>
          <div key={activePanel.key} style={{
            background: cardBg, borderRadius: 24, padding: 'clamp(28px, 3.5vw, 48px)',
            border: `1px solid ${modeAccentDim}`,
            boxShadow: `0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 -2px 0 ${modeAccent} inset`,
            animation: 'panelSlideIn 0.55s cubic-bezier(0.22,1,0.36,1) both',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Akzent-Streifen oben */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: `linear-gradient(90deg, transparent, ${modeAccent}, transparent)`,
            }} />
            {activePanel.node}
          </div>
          {panels.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 18 }}>
              {panels.map((_, i) => (
                <div key={i} style={{
                  width: i === panelIdx % panels.length ? 22 : 10, height: 10,
                  borderRadius: 999,
                  background: i === panelIdx % panels.length ? modeAccent : 'rgba(255,255,255,0.15)',
                  transition: 'all 0.3s',
                }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hint */}
      <div style={{
        fontSize: 'clamp(16px, 1.8vw, 24px)', color: '#64748b', fontWeight: 700,
        position: 'relative', zIndex: 5,
        letterSpacing: '0.03em',
      }}>
        {de ? 'Gleich geht\'s weiter…' : 'Continuing soon…'}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME OVER — Notebook style
// ═══════════════════════════════════════════════════════════════════════════════

export function GameOverView({ state: s }: { state: QQStateUpdate; roomCode?: string }) {
  const lang = useLangFlip(s.language);
  const sorted = [...s.teams].sort((a, b) => b.largestConnected - a.largestConnected);
  const winner = sorted[0];
  const winnerColor = winner?.color ?? '#F59E0B';

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      padding: '32px 48px',
    }}>
      {/* Ambient glow behind winner */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 30% 35%, ${winnerColor}25 0%, transparent 55%), radial-gradient(ellipse at 50% 100%, rgba(234,179,8,0.10) 0%, transparent 50%)`,
      }} />

      {/* Confetti */}
      <ConfettiOverlay />
      <Fireflies color={`${winnerColor}55`} />

      {/* Stage 1: "Spielende!" title */}
      <div style={{
        fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 800,
        color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase',
        animation: 'contentReveal 0.6s ease both',
        position: 'relative', zIndex: 5, marginBottom: 20,
      }}>
        {lang === 'en' ? 'Game Over' : 'Spielende'}
      </div>

      {/* Two-column: left = winner + rankings, right = final grid.
          alignItems:flex-start + feste Breiten verhindern Overlap bei 8 Teams. */}
      <div style={{
        display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 'clamp(24px, 3vw, 56px)',
        width: '100%', maxWidth: 1600, justifyContent: 'center',
        position: 'relative', zIndex: 5,
      }}>
        {/* Left column — maxWidth verhindert dass er ins Grid läuft */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, flex: '1 1 0', minWidth: 0, maxWidth: 1050 }}>
      {/* Stage 2: Winner hero — big entrance */}
      {winner && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          animation: 'finaleWinner 0.8s cubic-bezier(0.22,1,0.36,1) 0.4s both',
          position: 'relative', zIndex: 5, marginBottom: 20,
        }}>
          {/* Crown */}
          <div style={{
            fontSize: 'clamp(40px, 5vw, 64px)',
            animation: 'finaleStarBurst 0.5s ease 0.9s both',
          }}>🏆</div>

          {/* Avatar with celebration ring */}
          <div style={{
            width: 'clamp(100px, 14vw, 160px)', height: 'clamp(100px, 14vw, 160px)',
            borderRadius: '50%',
            background: `${winnerColor}15`,
            border: `4px solid ${winnerColor}`,
            boxShadow: `0 0 60px ${winnerColor}44, 0 0 120px ${winnerColor}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'celebShake 0.6s ease 1.2s both',
          }}>
            <span style={{ fontSize: 'clamp(56px, 8vw, 96px)', lineHeight: 1 }}>
              {qqGetAvatar(winner.avatarId).emoji}
            </span>
          </div>

          {/* Winner name */}
          <div style={{
            fontSize: 'clamp(36px, 5.5vw, 72px)', fontWeight: 900,
            color: winnerColor,
            animation: 'finaleGlow 3s ease-in-out 1.5s infinite',
            marginTop: 8,
          }}>
            {winner.name}
          </div>

          {/* Score highlight */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, marginTop: 4,
            animation: 'contentReveal 0.5s ease 1.8s both',
          }}>
            <span style={{
              fontSize: 'clamp(20px, 2.5vw, 32px)', fontWeight: 900,
              color: '#EAB308',
            }}>
              {winner.largestConnected} {lang === 'de' ? 'verbundene Felder' : 'connected fields'}
            </span>
          </div>
        </div>
      )}

      {/* Stage 3: Rankings — slide in staggered. Bei vielen Teams kompakter. */}
      {sorted.length > 1 && (() => {
        const many = sorted.length > 5;
        return (
        <div style={{
          width: '100%', maxWidth: many ? 1000 : 640,
          display: 'grid',
          gridTemplateColumns: many ? '1fr 1fr' : '1fr',
          gap: 8,
        }}>
          {sorted.slice(1).map((tm, i) => {
            const rank = i + 2;
            const cellCount = s.grid.flatMap(row => row.filter(c => c.ownerId === tm.id)).length;
            return (
              <div key={tm.id} style={{
                display: 'flex', alignItems: 'center', gap: many ? 10 : 16,
                padding: many ? '8px 14px' : '12px 24px', borderRadius: 14,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                animation: `finaleRank 0.5s cubic-bezier(0.34,1.2,0.64,1) ${2.0 + i * 0.10}s both`,
                minWidth: 0,
              }}>
                <span style={{
                  fontSize: many ? 'clamp(16px, 1.6vw, 22px)' : 'clamp(20px, 2.2vw, 28px)',
                  fontWeight: 900, width: many ? 30 : 40, flexShrink: 0,
                  color: rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#475569',
                }}>
                  {rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                </span>
                <span style={{ fontSize: many ? 'clamp(22px, 2.2vw, 30px)' : 'clamp(28px, 3vw, 40px)', lineHeight: 1, flexShrink: 0 }}>
                  {qqGetAvatar(tm.avatarId).emoji}
                </span>
                <span style={{
                  flex: 1, minWidth: 0,
                  fontSize: many ? 'clamp(16px, 1.7vw, 22px)' : 'clamp(20px, 2.5vw, 32px)',
                  fontWeight: 900, color: tm.color,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{tm.name}</span>
                <span style={{
                  fontSize: many ? 'clamp(14px, 1.4vw, 18px)' : 'clamp(16px, 1.8vw, 22px)',
                  fontWeight: 800,
                  color: 'rgba(255,255,255,0.7)',
                  flexShrink: 0,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {tm.largestConnected}
                </span>
                <span style={{
                  fontSize: many ? 'clamp(11px, 1.1vw, 14px)' : 'clamp(13px, 1.4vw, 18px)',
                  color: '#475569', fontWeight: 600, flexShrink: 0,
                }}>
                  ({cellCount} {lang === 'de' ? 'ges.' : 'tot.'})
                </span>
              </div>
            );
          })}
        </div>
        );
      })()}
        </div>
        {/* Right column — final grid trophy */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          animation: 'finaleWinner 0.9s cubic-bezier(0.22,1,0.36,1) 1.4s both',
          flex: '0 0 auto',
        }}>
          <div style={{
            fontSize: 'clamp(14px, 1.4vw, 18px)', fontWeight: 800,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: '#94a3b8',
          }}>
            {lang === 'en' ? 'Final Territory' : 'Finales Territorium'}
          </div>
          <div style={{
            padding: 14, borderRadius: 20,
            background: 'rgba(255,255,255,0.03)',
            border: `2px solid ${winnerColor}44`,
            boxShadow: `0 0 40px ${winnerColor}33, 0 10px 40px rgba(0,0,0,0.4)`,
          }}>
            <GridDisplay state={s} maxSize={Math.min(440, typeof window !== 'undefined' ? window.innerHeight * 0.48 : 400)} highlightTeam={winner?.id ?? null} showJoker />
          </div>
        </div>
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
          🎉 {lang === 'de' ? 'Wir hoffen, ihr hattet Spaß!' : 'We hope you had fun!'}
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
                📱 {lang === 'de' ? 'Scannt euer Ergebnis' : 'Scan your result'}
              </div>
              <div style={{ fontSize: 17, color: '#94a3b8', lineHeight: 1.55, whiteSpace: 'pre-line' }}>
                {lang === 'de'
                  ? '• Eure Team-Stats\n• Feedback & Bugs\n• Nächste Quiz-Termine'
                  : '• Your team stats\n• Feedback & bugs\n• Upcoming events'}
              </div>
            </div>
          </div>
        )}
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
      {/* Grid — game board styling */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${s.gridSize}, ${cellSize}px)`,
        gap,
        background: 'rgba(255,255,255,0.03)',
        padding: 10, borderRadius: 18,
        border: `2px solid ${highlightTeam ? `${activeColor}22` : 'rgba(255,255,255,0.06)'}`,
        boxShadow: highlightTeam
          ? `0 0 40px ${activeColor}15, inset 0 1px 0 rgba(255,255,255,0.04)`
          : '0 0 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
        animation: 'gridIdle 4s ease-in-out infinite',
        transition: 'border-color 0.5s ease, box-shadow 0.5s ease',
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
            const isFrozen = cell.frozen;
            const isStuck = cell.stuck;
            const cellRadius = Math.max(4, cellSize * 0.16);
            return (
              <div key={`${r}-${c}`} style={{
                position: 'relative', overflow: 'visible',
                width: cellSize, height: cellSize, borderRadius: cellRadius,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: Math.max(8, cellSize * 0.42),
                zIndex: isAccent ? 5 : 1,
                animation: isNeighbor ? 'cellNeighborDuck 0.45s ease-out 0.1s both' : undefined,
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
                  return (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: cellRadius,
                    background: isStuck
                      ? `linear-gradient(135deg, ${team.color}ff, ${team.color}bb)`
                      : `linear-gradient(135deg, ${team.color}${isHighlighted || isAccent ? 'ff' : isDimmed ? '66' : '99'}, ${team.color}${isHighlighted || isAccent ? 'cc' : isDimmed ? '44' : '66'})`,
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
                    filter: isDimmed ? 'brightness(0.7) saturate(0.6)' : undefined,
                  }} />
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
                    {/* Small ❄️ badge top-right */}
                    <div style={{
                      position: 'absolute', top: -3, right: -3,
                      fontSize: Math.max(8, cellSize * 0.28),
                      zIndex: 5, lineHeight: 1,
                      animation: 'frostCrystal 3s ease-in-out infinite',
                      filter: 'drop-shadow(0 0 3px rgba(147,210,255,0.8))',
                    }}>❄️</div>
                  </>
                )}
                {/* Stuck overlay — golden shimmer */}
                {isStuck && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: cellRadius,
                    background: 'linear-gradient(135deg, rgba(251,191,36,0.22), rgba(251,191,36,0.08))',
                    pointerEvents: 'none', zIndex: 1,
                  }} />
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
                  fontSize: isStuck ? Math.max(8, cellSize * 0.52) : undefined,
                  opacity: isFrozen ? 0.55 : undefined,
                  filter: isFrozen ? 'saturate(0.4) brightness(1.2)' : undefined,
                }}>
                  {isStuck ? '📌' : showStar ? '⭐' : (team && qqGetAvatar(team.avatarId).emoji)}
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

export function ScoreBar({ teams, activeTeamId }: { teams: QQStateUpdate['teams']; activeTeamId?: string | null }) {
  const sorted = [...teams].sort((a, b) => b.largestConnected - a.largestConnected);
  const prevScores = useRef<Record<string, number>>({});
  const [poppedIds, setPoppedIds] = useState<Set<string>>(new Set());
  const [floaters, setFloaters] = useState<{ id: string; teamId: string; diff: number }[]>([]);

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

  // Bei vielen Teams (≥6) kompakter, sonst passen 8 Zeilen nicht nebeneinander.
  // Balken ist raus — Info steckt in der Zahl. Dafür Name + Wert deutlich größer.
  const dense = sorted.length >= 6;
  const avatarSize = dense ? 52 : 62;
  const avatarBox = dense ? 64 : 76;
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
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: dense ? 14 : 18,
          animation: poppedIds.has(t.id) ? 'scorePop 0.5s ease both' : undefined,
          opacity: activeTeamId && !isActive ? 0.55 : 1,
          transition: 'opacity 0.3s ease',
        }}>
          <div style={{ width: avatarBox, textAlign: 'center', flexShrink: 0 }}>
            <span style={{
              position: 'relative', display: 'inline-block',
              fontSize: avatarSize, lineHeight: 1,
            }}>
              {qqGetAvatar(t.avatarId).emoji}
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
            </span>
          </div>
          {/* Name — flex-1, darf wachsen */}
          <span style={{
            flex: 1, minWidth: 0,
            fontSize: nameFs, fontWeight: 900, color: t.color,
            textShadow: isActive ? `0 0 12px ${t.color}44` : 'none',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{t.name}</span>
          {/* Wert — prominent rechts mit Medaille für Top 3 */}
          <div style={{
            position: 'relative',
            display: 'flex', alignItems: 'baseline', gap: 6,
            flexShrink: 0,
          }}>
            {medal && (
              <span style={{ fontSize: dense ? 22 : 28, lineHeight: 1, marginRight: 2 }}>{medal}</span>
            )}
            <span style={{
              fontSize: valFs, color: isLeader ? '#FBBF24' : '#F1F5F9', fontWeight: 900,
              textShadow: isLeader ? '0 0 18px rgba(251,191,36,0.55)' : 'none',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}>
              {t.largestConnected}
            </span>
            <span style={{ opacity: 0.5, fontSize: unitFs, fontWeight: 700, color: '#94a3b8' }}>
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

export function Fireflies({ color }: { color?: string } = {}) {
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
        }} />
      ))}
    </>
  );
}

function ComebackOption({ icon, label, desc, color, cardBg: bg }: { icon: string; label: string; desc: string; color: string; cardBg?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 24, padding: '28px 36px', borderRadius: 22,
      background: bg ?? '#1B1510',
      border: `2px solid ${color}44`,
      boxShadow: `0 6px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04), 0 0 30px ${color}12`,
      flex: '1 1 0', minWidth: 200,
    }}>
      <span style={{ fontSize: 48, lineHeight: 1 }}>{icon}</span>
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
