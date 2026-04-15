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
} from '../../../shared/quarterQuizTypes';
import { CustomSlide } from '../components/QQCustomSlide';
import { QQ3DGrid } from '../components/QQ3DGrid';
import {
  resumeAudio, setVolume, setSoundConfig, playFanfare, playReveal, playCorrect,
  playWrong, playTick, playUrgentTick, playTimesUp, playScoreUp,
  startTimerLoop, stopTimerLoop, playFieldPlaced, playSteal, playGameOver,
  setMusicDucked, getMusicDuckFactor,
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
  SCHAETZCHEN:   [{ emoji:'🎯', top:'45%', left:'3%',  size:70, rot:-12 },{ emoji:'✨', bottom:'14%', left:'7%',  size:50, rot:8  },{ emoji:'🔮', top:'50%', right:'4%',  size:54, rot:16, alt:true }],
  MUCHO:         [{ emoji:'🅰️', top:'48%', left:'4%',  size:66, rot:-8  },{ emoji:'💡', bottom:'18%', left:'6%',  size:54, rot:12 },{ emoji:'🤔', top:'48%', right:'5%',  size:58, rot:-14, alt:true }],
  BUNTE_TUETE:   [{ emoji:'🎁', top:'46%', left:'3%',  size:72, rot:-10 },{ emoji:'🎲', bottom:'16%', left:'8%',  size:56, rot:14 },{ emoji:'⭐', top:'52%', right:'4%',  size:56, rot:20 }],
  ZEHN_VON_ZEHN: [{ emoji:'🎰', top:'48%', left:'4%',  size:62, rot:-6  },{ emoji:'⚡', bottom:'20%', left:'7%',  size:50, rot:10 },{ emoji:'💪', top:'48%', right:'5%',  size:58, rot:-12, alt:true }],
  CHEESE:        [{ emoji:'📸', top:'48%', left:'3%',  size:68, rot:-11 },{ emoji:'🔍', bottom:'15%', left:'7%',  size:52, rot:8  },{ emoji:'👁️', top:'48%', right:'5%',  size:56, rot:-9, alt:true }],
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
  const bg = s.theme?.bgColor ?? (cat ? (CAT_BG[cat] ?? '#0D0A06') : '#0D0A06');
  const textCol = s.theme?.textColor ?? '#e2e8f0';
  const accent = s.theme?.accentColor ?? '#F59E0B';
  const cardBg = s.theme?.cardBg ?? '#1B1510';
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
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      return;
    }
    // Während PAUSE nicht stoppen — nur runterducken (Musik bleibt im Hintergrund).
    if (s.phase !== 'QUESTION_ACTIVE' && s.phase !== 'QUESTION_REVEAL' && s.phase !== 'PAUSED') {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      return;
    }
    const effVol = s.musicMuted ? 0 : Math.min(1, s.volume * 0.5 * duckFactor);
    if (audioRef.current?.src?.endsWith(url)) {
      audioRef.current.volume = effVol;
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const a = new Audio(url);
    a.loop = true;
    a.volume = effVol;
    a.play().catch(() => {});
    audioRef.current = a;
    return () => { a.pause(); };
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
          {s.phase === 'LOBBY'           && <LobbyView state={s} />}
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
};

const RULES_SLIDES_DE: RulesSlide[] = [
  {
    icon: '🎮',
    title: 'Willkommen!',
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
      'Frage → alle antworten gleichzeitig auf dem Handy.',
      'Jedes richtige Team darf ein Feld setzen.',
      'Bei Gleichstand entscheidet die Geschwindigkeit, wer zuerst wählen darf!',
    ],
  },
  {
    icon: '⭐',
    title: 'Joker — 2×2 Bonus',
    color: '#F59E0B',
    lines: [
      'Bildet ein 2×2-Quadrat in Teamfarbe und erhaltet ein Joker-Feld.',
      'Joker-Felder geben Bonuspunkte am Ende!',
    ],
    extra: '⭐ 2×2-Quadrat bilden = Bonus-Jokerfeld!',
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
    icon: '🔄',
    title: 'Comeback-Chance',
    color: '#8B5CF6',
    lines: [
      'Vor der letzten Runde bekommt das Team auf dem letzten Platz eine faire Chance.',
      'Keine Sorge — wir erklären die Details, wenn es soweit ist!',
    ],
  },
  {
    icon: '🏆',
    title: 'Ziel',
    color: '#22C55E',
    lines: [
      'Baut das größte zusammenhängende Gebiet!',
      'Jokerfelder geben zusätzliche Bonuspunkte.',
    ],
    extra: 'Viel Spaß und möge das beste Team gewinnen! 🎉',
  },
];

const RULES_SLIDES_EN: RulesSlide[] = [
  {
    icon: '🎮',
    title: 'Welcome!',
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
      'Question → everyone answers on their phone at once.',
      'Every correct team places a cell on the grid.',
      'On a tie, speed decides who picks first!',
    ],
  },
  {
    icon: '⭐',
    title: 'Joker — 2×2 Bonus',
    color: '#F59E0B',
    lines: [
      'Form a 2×2 square in your team color to earn a Joker cell.',
      'Joker cells grant bonus points at the end!',
    ],
    extra: '⭐ Form a 2×2 square = bonus Joker cell!',
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
    icon: '🔄',
    title: 'Comeback Chance',
    color: '#8B5CF6',
    lines: [
      'Before the final round, the team in last place gets a fair chance.',
      "Don't worry — we'll explain the details when the time comes!",
    ],
  },
  {
    icon: '🏆',
    title: 'Goal',
    color: '#22C55E',
    lines: [
      'Build the largest connected territory!',
      'Joker cells grant extra bonus points.',
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

export function RulesView({ state: s }: { state: QQStateUpdate }) {
  const lang = useLangFlip(s.language);
  const slides = lang === 'en' ? RULES_SLIDES_EN : RULES_SLIDES_DE;
  const totalSlides = slides.length;
  const idx = Math.min(s.rulesSlideIndex ?? 0, totalSlides - 1);
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
          display: 'flex', gap: 'clamp(24px, 3vw, 48px)', alignItems: 'center',
          flexDirection: hasGrid ? 'row' : 'column',
        }}>
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
          {de ? 'Quartier Quiz' : 'Quarter Quiz'}
        </div>
      </div>

      {/* ── Center: 2-column layout — QR left, Teams right ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 'clamp(32px, 5vw, 80px)', position: 'relative', zIndex: 5,
        width: '100%', maxWidth: 1600, margin: '0 auto',
        minHeight: 0,
      }}>
        {/* Left: QR Code */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(10px, 1.5vh, 18px)',
          flexShrink: 0,
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

        {/* Right: Teams + status */}
        <div style={{
          flex: 1, minWidth: 0, maxWidth: 560,
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
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 'clamp(8px, 1.2vw, 14px)',
              maxHeight: '50vh', overflow: 'hidden',
            }}>
              {s.teams.map((t, i) => (
                <div key={t.id} style={{
                  padding: 'clamp(10px, 1.4vh, 16px) clamp(14px, 1.5vw, 20px)', borderRadius: 16,
                  background: cardBg,
                  border: `2px solid ${t.color}55`,
                  boxShadow: `0 6px 24px rgba(0,0,0,0.4), 0 0 20px ${t.color}18`,
                  display: 'flex', alignItems: 'center', gap: 'clamp(8px, 1vw, 12px)',
                  animation: `teamCardIn 0.5s cubic-bezier(0.34,1.2,0.64,1) ${0.4 + i * 0.08}s both`,
                  minWidth: 0,
                }}>
                  <span style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', lineHeight: 1, flexShrink: 0 }}>{qqGetAvatar(t.avatarId).emoji}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontWeight: 900, fontSize: 'clamp(16px, 1.8vw, 24px)', color: t.color,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{t.name}</div>
                    <div style={{ fontSize: 'clamp(10px, 1vw, 13px)', fontWeight: 700, color: t.connected ? '#22C55E' : '#94a3b866' }}>
                      {t.connected ? '● bereit' : '○ offline'}
                    </div>
                  </div>
                </div>
              ))}
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

      {/* Teams row */}
      <div style={{
        display: 'flex', gap: 'clamp(12px, 2vw, 28px)',
        flexWrap: 'wrap', justifyContent: 'center', maxWidth: '90vw',
      }}>
        {teams.map((t, i) => {
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
                width: 'clamp(120px, 14vw, 200px)',
                height: 'clamp(120px, 14vw, 200px)',
                borderRadius: '50%',
                background: `radial-gradient(circle at 35% 30%, ${t.color} 0%, ${t.color}cc 45%, ${t.color}88 100%)`,
                border: `5px solid ${t.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 12px 40px ${t.color}88, 0 0 60px ${t.color}66, inset 0 -8px 20px rgba(0,0,0,0.25)`,
                fontSize: 'clamp(60px, 8vw, 110px)', lineHeight: 1,
                animation: shown ? 'qqTrPulse 2.2s ease-in-out infinite' : 'none',
              }}>
                {av.emoji}
              </div>
              {/* Flash overlay on slam */}
              {shown && (
                <div style={{
                  position: 'absolute',
                  width: 'clamp(120px, 14vw, 200px)',
                  height: 'clamp(120px, 14vw, 200px)',
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
                fontSize: 'clamp(18px, 2.2vw, 32px)',
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

      {/* "Viel Glück!" */}
      {showGoodLuck && (
        <div style={{
          marginTop: 'clamp(32px, 4vw, 64px)',
          fontSize: 'clamp(28px, 4vw, 64px)', fontWeight: 900,
          color: '#fbbf24',
          textTransform: 'uppercase', letterSpacing: '0.15em',
          textShadow: '0 4px 24px rgba(251,191,36,0.5)',
          animation: 'qqTrGood 900ms cubic-bezier(.2,.8,.2,1) both',
        }}>
          ✨ Viel Glück! ✨
        </div>
      )}

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
      {/* Schätzchen */}
      {q.category === 'SCHAETZCHEN' && (
        <div style={{ animation: 'contentReveal 0.5s ease 0.1s both' }}>
          {[...s.answers]
            .map(a => {
              const num = Number(a.text.replace(/[^0-9.,\-]/g, '').replace(',', '.'));
              const team = s.teams.find(t => t.id === a.teamId);
              const distance = Number.isNaN(num) || q.targetValue == null ? Infinity : Math.abs(num - q.targetValue);
              return { ...a, num, distance, team };
            })
            .sort((a, b) => a.distance - b.distance)
            .map((a, i) => (
              <div key={a.teamId} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 14px', borderRadius: 12, marginBottom: 5,
                background: i === 0 ? 'rgba(234,179,8,0.14)' : 'rgba(255,255,255,0.04)',
                border: i === 0 ? '1.5px solid rgba(234,179,8,0.35)' : '1px solid rgba(255,255,255,0.07)',
                animation: `contentReveal 0.4s ease ${0.15 + i * 0.1}s both`,
              }}>
                <span style={{ fontSize: 'clamp(13px, 1.4vw, 18px)', fontWeight: 900, color: i === 0 ? '#EAB308' : '#475569', width: 24 }}>#{i + 1}</span>
                {a.team && <span style={{ fontSize: 'clamp(20px, 2.4vw, 32px)', lineHeight: 1 }}>{qqGetAvatar(a.team.avatarId).emoji}</span>}
                <span style={{ fontWeight: 800, fontSize: 'clamp(14px, 1.6vw, 22px)', color: a.team?.color ?? '#e2e8f0', flex: 1 }}>{a.team?.name ?? a.teamId}</span>
                <span style={{ fontSize: 'clamp(16px, 2vw, 26px)', fontWeight: 900, color: '#e2e8f0' }}>{a.text}</span>
                {q.targetValue != null && (
                  <span style={{ fontFamily: "'Caveat', cursive", fontSize: 'clamp(12px, 1.2vw, 16px)', color: '#64748b' }}>
                    {Number.isFinite(a.distance) ? `Δ ${a.distance.toLocaleString()}` : '—'}
                  </span>
                )}
              </div>
            ))}
        </div>
      )}

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

        return (
          <div style={{ animation: 'contentReveal 0.5s ease 0.1s both', display: 'flex', flexDirection: 'column', gap: 10 }}>
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

  const showTarget  = step >= 1;
  const revealedCnt = Math.max(0, step - 1); // Step 2 = 1 Pin, Step 3 = 2 Pins, ...
  const revealedPins = worstFirst.slice(0, revealedCnt);
  const validCount = scored.length;
  const showRanking = step >= (1 + validCount + 1);

  // FitBounds bounds aus aktuell sichtbaren Punkten
  const bounds = useMemo(() => {
    const b = L.latLngBounds([] as any);
    if (showTarget) b.extend([tLat, tLng]);
    for (const p of revealedPins) b.extend([p.lat, p.lng]);
    if (!b.isValid()) b.extend([tLat, tLng]);
    return b;
  }, [showTarget, revealedPins, tLat, tLng]);

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
            return (
              <Marker
                key={p.teamId}
                position={[p.lat, p.lng] as any}
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
          {bestFirst.map((p, i) => {
            const team = s.teams.find(t => t.id === p.teamId);
            if (!team) return null;
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;
            const dist = p.distKm == null ? '—' : p.distKm < 1 ? `${Math.round(p.distKm * 1000)} m` : `${p.distKm.toFixed(1)} km`;
            const isTop = i === 0;
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
                <span style={{ fontWeight: 800, fontSize: 'clamp(15px, 1.4vw, 20px)', color: isTop ? '#86efac' : '#94a3b8', fontFamily: "'Caveat', cursive" }}>📍 {dist}</span>
              </div>
            );
          })}
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
  const qFontSize = isOrderBt
    ? (qText.length > 120 ? 'clamp(22px, 2.4vw, 36px)'
      : qText.length > 60 ? 'clamp(26px, 3vw, 44px)'
      : 'clamp(30px, 3.4vw, 50px)')
    : qText.length > 200 ? 'clamp(30px, 3.5vw, 52px)'
    : qText.length > 120 ? 'clamp(36px, 4.5vw, 68px)'
    : qText.length > 60 ? 'clamp(44px, 6vw, 88px)'
    : 'clamp(52px, 7vw, 108px)';

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

            {/* Winner banner */}
            {isCheeseReveal && s.correctTeamId && (() => {
              const winner = s.teams.find(t => t.id === s.correctTeamId);
              if (!winner) return null;
              const av = qqGetAvatar(winner.avatarId);
              return (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
                  marginTop: 8,
                  animation: 'revealWinnerIn 0.5s ease 0.5s both',
                }}>
                  <span style={{ fontSize: 40, animation: 'celebShake 0.6s ease 0.9s both' }}>{av.emoji}</span>
                  <span style={{ fontSize: 'clamp(20px, 2.5vw, 32px)', fontWeight: 900, color: winner.color }}>
                    {winner.name}
                  </span>
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

          {/* Question card — stays same size on reveal, just dims + blurs */}
          <div style={{
            background: cardBg,
            border: `2px solid ${revealed ? 'rgba(255,255,255,0.04)' : `${accent}22`}`,
            borderRadius: 28,
            boxShadow: revealed
              ? '0 4px 16px rgba(0,0,0,0.3)'
              : `0 0 60px ${accent}15, 0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`,
            padding: 'clamp(20px, 3vh, 48px) clamp(28px, 4vw, 64px)',
            marginBottom: 'clamp(8px, 1.2vh, 20px)',
            width: '100%', maxWidth: 1400,
            textAlign: 'center',
            animation: 'bQuestionIn 0.5s cubic-bezier(0.34,1.4,0.64,1) both',
            transition: 'box-shadow 0.5s ease, border-color 0.5s ease, opacity 0.5s ease, filter 0.5s ease',
            opacity: revealed ? 0.45 : 1,
          }}>
            <div key={lang} style={{
              fontSize: qFontSize,
              fontWeight: 900, lineHeight: 1.22,
              color: '#F1F5F9',
              animation: 'langFadeIn 0.4s ease both',
            }}>
              {qText}
            </div>
          </div>

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
                      fontSize: 'clamp(26px, 3.2vw, 44px)', fontWeight: 800,
                      color: isWrong ? '#475569' : '#F1F5F9', lineHeight: 1.3,
                      textShadow: optImg?.url ? '0 2px 8px rgba(0,0,0,0.8)' : 'none',
                      transition: 'color 0.3s ease',
                    }}>{optText}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Answer reveal (skip for MUCHO/ZEHN_VON_ZEHN + Hot Potato — handled separately) */}
          {revealed && s.revealedAnswer && q.category !== 'MUCHO' && q.category !== 'ZEHN_VON_ZEHN'
            && !(q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato') && (
            <div style={{
              position: 'relative', overflow: 'hidden',
              padding: 'clamp(16px, 2vh, 32px) clamp(24px, 3vw, 52px)', borderRadius: 28,
              background: 'rgba(34,197,94,0.12)',
              border: '3px solid rgba(34,197,94,0.50)',
              boxShadow: '0 0 60px rgba(34,197,94,0.25), 0 0 120px rgba(34,197,94,0.1)',
              fontSize: 'clamp(28px, 4vw, 64px)', fontWeight: 900,
              color: '#4ade80', marginBottom: 'clamp(8px, 1.2vh, 24px)',
              width: '100%', maxWidth: 1400, textAlign: 'center',
              animation: 'revealAnswerBam 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both',
            }}>
              {/* Shimmer sweep */}
              <div style={{
                position: 'absolute', top: 0, width: '60%', height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                animation: 'revealShimmer 0.8s ease 0.5s both',
                pointerEvents: 'none',
              }} />
              ✓ {lang === 'en' && q.answerEn ? q.answerEn : s.revealedAnswer}
            </div>
          )}

          {/* Hot Potato reveal: show full answer list as chips, mark which were named */}
          {revealed && q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato' && (() => {
            const raw = (lang === 'en' && q.answerEn ? q.answerEn : q.answer) ?? '';
            const allAnswers = raw.split(/[,;]/).map(a => a.replace(/[…\.]+$/, '').trim()).filter(Boolean);
            const usedNorm = (s.hotPotatoUsedAnswers ?? []).map((u: string) => u.toLowerCase().trim());
            const wasNamed = (a: string) => usedNorm.some((u: string) =>
              u === a.toLowerCase().trim() || u.includes(a.toLowerCase().trim()) || a.toLowerCase().trim().includes(u)
            );
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
                    const named = wasNamed(a);
                    return (
                      <div key={`${a}-${i}`} style={{
                        padding: '8px 18px', borderRadius: 999,
                        fontSize: 'clamp(16px, 1.8vw, 24px)', fontWeight: 800,
                        background: named ? 'rgba(34,197,94,0.22)' : 'rgba(15,23,42,0.5)',
                        border: `2px solid ${named ? '#22C55E' : 'rgba(148,163,184,0.25)'}`,
                        color: named ? '#86efac' : '#94a3b8',
                        animation: `contentReveal 0.4s ease ${0.2 + i * 0.05}s both`,
                      }}>
                        {named ? '✓ ' : ''}{a}
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

          {/* Schätzchen: combined leaderboard with all estimates */}
          {revealed && q.category === 'SCHAETZCHEN' && s.answers.length > 0 && (() => {
            const ranked = s.answers
              .map(a => {
                const num = Number(a.text.replace(/[^0-9.,\-]/g, '').replace(',', '.'));
                const team = s.teams.find(t => t.id === a.teamId);
                const distance = Number.isNaN(num) || q.targetValue == null ? Infinity : Math.abs(num - q.targetValue);
                return { ...a, num, distance, team };
              })
              .sort((a, b) => a.distance - b.distance);
            return (
              <div style={{
                display: 'flex', gap: 'clamp(8px, 1.2vw, 16px)', width: '100%', maxWidth: 1400,
                animation: 'revealWinnerIn 0.65s cubic-bezier(0.34,1.4,0.64,1) 0.7s both',
                flexWrap: 'wrap', justifyContent: 'center',
              }}>
                {ranked.map((r, i) => {
                  const isWinner = i === 0 && r.distance !== Infinity;
                  const tColor = r.team?.color ?? '#94a3b8';
                  return (
                    <div key={r.teamId} style={{
                      flex: isWinner ? '1 1 100%' : '1 1 0',
                      minWidth: isWinner ? undefined : 'clamp(120px, 18vw, 220px)',
                      display: 'flex', alignItems: 'center', gap: isWinner ? 20 : 10,
                      padding: isWinner ? 'clamp(14px, 2vw, 24px) clamp(20px, 3vw, 40px)' : 'clamp(8px, 1vw, 14px) clamp(10px, 1.5vw, 18px)',
                      borderRadius: isWinner ? 24 : 16,
                      background: isWinner ? `linear-gradient(135deg, ${tColor}22, ${tColor}0a)` : 'rgba(255,255,255,0.04)',
                      border: isWinner ? `2px solid ${tColor}66` : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: isWinner ? `0 0 40px ${tColor}33` : 'none',
                      animation: `contentReveal 0.4s ease ${0.7 + i * 0.12}s both`,
                    }}>
                      <span style={{
                        fontSize: isWinner ? 'clamp(40px, 5vw, 72px)' : 'clamp(24px, 3vw, 38px)',
                        lineHeight: 1, flexShrink: 0,
                        animation: isWinner ? 'celebShake 0.6s ease 1.1s both' : undefined,
                      }}>
                        {r.team ? qqGetAvatar(r.team.avatarId).emoji : '?'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 900,
                          fontSize: isWinner ? 'clamp(22px, 3vw, 40px)' : 'clamp(13px, 1.5vw, 20px)',
                          color: tColor, lineHeight: 1.2,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{r.team?.name ?? r.teamId}</div>
                        <div style={{
                          fontWeight: 900,
                          fontSize: isWinner ? 'clamp(28px, 4vw, 52px)' : 'clamp(18px, 2.2vw, 30px)',
                          color: '#e2e8f0', lineHeight: 1.2,
                        }}>{r.text}</div>
                        {isWinner && (
                          <div style={{
                            color: '#94a3b8', fontSize: 'clamp(14px, 1.6vw, 22px)', fontWeight: 800, marginTop: 2,
                          }}>
                            {lang === 'en' ? 'was closest!' : 'war am nächsten dran!'}
                          </div>
                        )}
                      </div>
                      {!isWinner && r.distance !== Infinity && (
                        <div style={{
                          fontSize: 'clamp(10px, 1vw, 14px)', color: '#475569', fontWeight: 700, whiteSpace: 'nowrap',
                        }}>Δ {r.distance.toLocaleString()}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Correct team — winner banner (non-Schätzchen) */}
          {revealed && s.correctTeamId && q.category !== 'SCHAETZCHEN' && (() => {
            const team = s.teams.find(t => t.id === s.correctTeamId);
            if (!team) return null;
            const cat = q.category;
            const isEn = lang === 'en';
            const muchoSpeedWin = cat === 'MUCHO' && q.correctOptionIndex != null
              && s.answers.filter(a => a.text === String(q.correctOptionIndex)).length > 1;
            const winMsg = cat === 'CHEESE'
              ? (isEn ? 'got it right!' : 'hat es erkannt!')
              : cat === 'BUNTE_TUETE'
                ? (isEn ? 'wins the round!' : 'gewinnt die Runde!')
                : cat === 'ZEHN_VON_ZEHN'
                  ? (isEn ? 'bet the most points on the correct answer!' : 'hat die meisten Punkte auf die richtige Antwort gesetzt!')
                  : muchoSpeedWin
                    ? (isEn ? 'fastest & correct!' : 'am schnellsten & richtig!')
                    : (isEn ? 'correct!' : 'richtig!');
            return (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28,
                padding: '28px 44px', borderRadius: 28, marginBottom: 12,
                width: '100%', maxWidth: 1400,
                background: `linear-gradient(135deg, ${team.color}22, ${team.color}0a)`,
                border: `2px solid ${team.color}66`,
                boxShadow: `0 0 60px ${team.color}33, 0 8px 24px rgba(0,0,0,0.4)`,
                animation: 'revealWinnerIn 0.65s cubic-bezier(0.34,1.4,0.64,1) 0.7s both',
              }}>
                <span style={{
                  fontSize: 'clamp(64px, 8vw, 110px)', lineHeight: 1, flexShrink: 0,
                  animation: 'celebShake 0.6s ease 1.1s both',
                }}>
                  {qqGetAvatar(team.avatarId).emoji}
                </span>
                <div>
                  <div style={{
                    fontWeight: 900, fontSize: 'clamp(36px, 5vw, 72px)', color: team.color, lineHeight: 1.1,
                    textShadow: `0 0 30px ${team.color}44`,
                  }}>
                    {team.name}
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
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
              }}>
                {s.teams.map(tm => {
                  const answered = s.answers.some(a => a.teamId === tm.id);
                  return (
                    <div key={tm.id} style={{
                      position: 'relative',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 52, height: 52, borderRadius: '50%',
                      background: answered ? `${tm.color}25` : 'rgba(255,255,255,0.04)',
                      border: `3px solid ${answered ? tm.color : 'rgba(255,255,255,0.08)'}`,
                      transition: 'all 0.4s ease',
                      opacity: answered ? 1 : 0.4,
                      boxShadow: answered ? `0 0 16px ${tm.color}44` : 'none',
                    }}>
                      <span style={{ fontSize: 28, lineHeight: 1 }}>{qqGetAvatar(tm.avatarId).emoji}</span>
                      {/* Checkmark overlay */}
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
  const team = s.teams.find(tm => tm.id === (flashCell?.teamId ?? s.pendingFor));
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
    } else if (!enable3DTransition) {
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
  const gridMaxSize = Math.min(720, typeof window !== 'undefined' ? window.innerHeight * 0.55 : 600);

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

  // Claim toast state
  const [toast, setToast] = useState<{ text: string; color: string; key: number } | null>(null);
  const prevPendingRef = useRef(s.pendingFor);
  useEffect(() => {
    if (prevPendingRef.current && prevPendingRef.current !== s.pendingFor) {
      const prevTeam = s.teams.find(t => t.id === prevPendingRef.current);
      if (prevTeam) {
        const isSteal = s.pendingAction === 'STEAL_1';
        const msg = isSteal
          ? (lang === 'de' ? `⚡ ${prevTeam.name} hat ein Feld geklaut!` : `⚡ ${prevTeam.name} stole a field!`)
          : (lang === 'de' ? `✅ ${prevTeam.name} hat ein Feld gesetzt!` : `✅ ${prevTeam.name} placed a field!`);
        setToast({ text: msg, color: prevTeam.color, key: Date.now() });
        setTimeout(() => setToast(null), 2500);
      }
    }
    prevPendingRef.current = s.pendingFor;
  }, [s.pendingFor]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <Fireflies color={`${teamColor}77`} />

      {/* Top banner — hero status */}
      <div style={{
        padding: '20px 44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
        position: 'relative', zIndex: 5,
        background: `linear-gradient(180deg, rgba(13,10,6,0.8) 0%, rgba(13,10,6,0.4) 100%)`,
        borderBottom: `2px solid ${teamColor}22`,
      }}>
        {team && (
          <>
            {/* Avatar with glow ring */}
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
        {!team && (
          <span style={{ fontSize: 'clamp(18px, 2.2vw, 28px)', fontWeight: 800, color: '#64748b' }}>
            {lang === 'de' ? '⏳ Warte auf nächsten Zug…' : '⏳ Waiting for next move…'}
          </span>
        )}
      </div>

      {/* Center: large grid + score */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 44px', position: 'relative', zIndex: 5, gap: 20 }}>
        {show3D ? (
          <>
            <QQ3DGrid
              state={s}
              maxSize={gridMaxSize}
              animateCell={cellTrigger ? { row: cellTrigger.row, col: cellTrigger.col, teamId: cellTrigger.teamId, wasSteal: cellTrigger.wasSteal } : null}
              interactive={viewMode === '3d'}
              entering={viewMode === 'transitioning'}
              flyoverSignal={flyoverSignal}
            />
          </>
        ) : (
          <GridDisplay state={s} maxSize={gridMaxSize} highlightTeam={flashCell?.teamId ?? s.pendingFor} showJoker={false} flashCellKey={flashCell ? `${flashCell.row}-${flashCell.col}` : null} />
        )}
        <ScoreBar teams={s.teams} activeTeamId={flashCell?.teamId ?? s.pendingFor} />
      </div>

      {/* Claim toast */}
      {toast && (
        <div key={toast.key} style={{
          position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 20, padding: '14px 32px', borderRadius: 999,
          background: `${toast.color}22`, border: `2px solid ${toast.color}55`,
          boxShadow: `0 0 30px ${toast.color}33`,
          fontSize: 'clamp(18px, 2vw, 28px)', fontWeight: 900, color: '#e2e8f0',
          animation: 'claimToast 2.5s ease both',
          whiteSpace: 'nowrap',
        }}>
          {toast.text}
        </div>
      )}
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

export function PausedView({ state: s }: { state: QQStateUpdate }) {
  const cardBg = s.theme?.cardBg ?? '#1B1510';
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

  // Current game standings
  const sortedTeams = [...s.teams].sort((a, b) => b.totalCells - a.totalCells);
  if (sortedTeams.length > 0) {
    panels.push({ key: 'standings', node: (
      <div>
        <div style={{ fontSize: 'clamp(24px, 2.8vw, 36px)', fontWeight: 900, color: '#e2e8f0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          📊 {de ? 'Aktueller Stand' : 'Current Standings'}
        </div>
        {sortedTeams.map((t, i) => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 18, padding: '12px 0',
            borderBottom: i < sortedTeams.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}>
            <span style={{ fontSize: 'clamp(28px, 3.2vw, 42px)', width: 48, textAlign: 'center' }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
            </span>
            <span style={{ fontSize: 'clamp(32px, 3.6vw, 48px)', lineHeight: 1 }}>{qqGetAvatar(t.avatarId).emoji}</span>
            <span style={{ flex: 1, fontWeight: 800, fontSize: 'clamp(22px, 2.6vw, 32px)', color: t.color }}>{t.name}</span>
            <span style={{ fontSize: 'clamp(22px, 2.6vw, 32px)', fontWeight: 900, color: '#F59E0B' }}>{t.totalCells}</span>
            <span style={{ fontSize: 'clamp(14px, 1.6vw, 20px)', color: '#64748b' }}>{de ? 'Felder' : 'cells'}</span>
          </div>
        ))}
      </div>
    )});
  }

  // All-time leaderboard
  if (leaderboard.length > 0) {
    panels.push({ key: 'leaderboard', node: (
      <div>
        <div style={{ fontSize: 'clamp(24px, 2.8vw, 36px)', fontWeight: 900, color: '#e2e8f0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          🏆 {de ? 'Bestenliste' : 'Leaderboard'}
          {totalGames > 0 && <span style={{ fontSize: 'clamp(16px, 1.8vw, 22px)', fontWeight: 600, color: '#475569' }}>({totalGames} {de ? 'Spiele' : 'games'})</span>}
        </div>
        {leaderboard.slice(0, 5).map((entry, i) => (
          <div key={entry.name} style={{
            display: 'flex', alignItems: 'center', gap: 18, padding: '12px 0',
            borderBottom: i < Math.min(leaderboard.length, 5) - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
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

  // Records
  if (funStats) {
    const records: React.ReactNode[] = [];
    if (funStats.highestScore) {
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
    if (funStats.closestGame) {
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
    if (funStats.winStreak) {
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
    if (funStats.fastestAnswer) {
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
            🏅 {de ? 'Rekorde' : 'Records'}
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
          😂 {de ? 'Lustigste Antworten' : 'Funniest Answers'}
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

      {/* Title */}
      <div style={{
        fontSize: 'clamp(32px, 4vw, 56px)', fontWeight: 900, color: '#94a3b8',
        display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 5,
        animation: 'lobbyPulse 3s ease-in-out infinite',
      }}>
        ⏸ {de ? 'Kurze Pause' : 'Short Break'}
      </div>

      {/* Records panel */}
      {activePanel && (
        <div style={{
          width: '100%', maxWidth: 900, position: 'relative', zIndex: 5,
          animation: 'contentReveal 0.5s ease both',
        }}>
          <div key={activePanel.key} style={{
            background: cardBg, borderRadius: 24, padding: 'clamp(28px, 3.5vw, 48px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          }}>
            {activePanel.node}
          </div>
          {panels.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 18 }}>
              {panels.map((_, i) => (
                <div key={i} style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: i === panelIdx % panels.length ? '#e2e8f0' : 'rgba(255,255,255,0.15)',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hint */}
      <div style={{
        fontSize: 'clamp(16px, 1.8vw, 24px)', color: '#475569', fontWeight: 700,
        position: 'relative', zIndex: 5,
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

      {/* Two-column: left = winner + rankings, right = final grid */}
      <div style={{
        display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'clamp(24px, 3vw, 56px)',
        width: '100%', maxWidth: 1500, justifyContent: 'center',
        position: 'relative', zIndex: 5,
      }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, flex: '0 1 auto' }}>
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

      {/* Stage 3: Rankings — slide in staggered */}
      {sorted.length > 1 && (
        <div style={{
          width: '100%', maxWidth: 640,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {sorted.slice(1).map((tm, i) => {
            const rank = i + 2;
            const cellCount = s.grid.flatMap(row => row.filter(c => c.ownerId === tm.id)).length;
            return (
              <div key={tm.id} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '12px 24px', borderRadius: 16,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                animation: `finaleRank 0.5s cubic-bezier(0.34,1.2,0.64,1) ${2.0 + i * 0.15}s both`,
              }}>
                <span style={{
                  fontSize: 'clamp(20px, 2.2vw, 28px)', fontWeight: 900, width: 40,
                  color: rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#475569',
                }}>
                  {rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                </span>
                <span style={{ fontSize: 'clamp(28px, 3vw, 40px)', lineHeight: 1 }}>
                  {qqGetAvatar(tm.avatarId).emoji}
                </span>
                <span style={{
                  flex: 1, fontSize: 'clamp(20px, 2.5vw, 32px)', fontWeight: 900, color: tm.color,
                }}>{tm.name}</span>
                <span style={{
                  fontSize: 'clamp(16px, 1.8vw, 22px)', fontWeight: 700,
                  color: 'rgba(255,255,255,0.5)',
                }}>
                  {tm.largestConnected} {lang === 'de' ? 'verbunden' : 'connected'}
                </span>
                <span style={{
                  fontSize: 'clamp(13px, 1.4vw, 18px)', color: '#475569', fontWeight: 600,
                }}>
                  ({cellCount} {lang === 'de' ? 'gesamt' : 'total'})
                </span>
              </div>
            );
          })}
        </div>
      )}
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
            ? '📣 Erzählt euren Freunden vom Quarter Quiz — und scannt den Code für eure Team-Stats 🎁'
            : '📣 Tell your friends about Quarter Quiz — and scan the code for your team stats 🎁'}
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
          display: 'flex', alignItems: 'center', gap: 18,
          fontSize: 15, color: 'rgba(251,191,36,0.75)', fontWeight: 800,
          letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>
          <span>play.cozyquiz.app</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>📸</span>
            @cozywolf.events
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
  const prevGridRef = useRef<string>('');
  const newCellsRef = useRef<Set<string>>(new Set());
  const stolenCellsRef = useRef<Set<string>>(new Set());
  const neighborCellsRef = useRef<Set<string>>(new Set());
  const [shakeTick, setShakeTick] = useState(0);
  const gridKey = s.grid.flatMap(row => row.map(c => `${c.ownerId ?? ''}`)).join(',');
  if (gridKey !== prevGridRef.current) {
    const newSet = new Set<string>();
    const stolenSet = new Set<string>();
    const neighborSet = new Set<string>();
    const prevOwners = prevGridRef.current.split(',');
    s.grid.forEach((row, r) => row.forEach((cell, c) => {
      const prevOwner = prevOwners[(r * s.gridSize) + c];
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
  const maxCells = Math.max(1, ...sorted.map(t => t.largestConnected));
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 800 }}>
      {sorted.map((t, i) => {
        const isLeader = i === 0 && t.largestConnected > 0;
        const isActive = t.id === activeTeamId;
        return (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 14,
          animation: poppedIds.has(t.id) ? 'scorePop 0.5s ease both' : undefined,
          opacity: activeTeamId && !isActive ? 0.6 : 1,
          transition: 'opacity 0.3s ease',
        }}>
          <div style={{ position: 'relative', width: 44, textAlign: 'center' }}>
            <span style={{ fontSize: 34, lineHeight: 1 }}>{qqGetAvatar(t.avatarId).emoji}</span>
            {isLeader && <span style={{ position: 'absolute', top: -8, right: -4, fontSize: 16 }}>👑</span>}
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
              <span style={{
                fontSize: 24, fontWeight: 900, color: t.color,
                textShadow: isActive ? `0 0 12px ${t.color}44` : 'none',
              }}>{t.name}</span>
              <span style={{ fontSize: 22, color: '#e2e8f0', fontWeight: 900 }}>
                {t.largestConnected}
                <span style={{ opacity: 0.4, fontSize: 15, fontWeight: 700, marginLeft: 4 }}>
                  {t.largestConnected === 1 ? 'Feld' : 'Felder'}
                </span>
              </span>
            </div>
            <div style={{ height: 14, borderRadius: 7, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 7,
                background: `linear-gradient(90deg, ${t.color}cc, ${t.color})`,
                width: `${Math.min(100, (t.largestConnected / maxCells) * 100)}%`,
                transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: isLeader ? `0 0 12px ${t.color}88` : 'none',
              }} />
            </div>
            {/* Float +N */}
            {floaters.filter(f => f.teamId === t.id).map(f => (
              <div key={f.id} style={{
                position: 'absolute', right: 0, top: -6,
                fontWeight: 900, fontSize: 20, color: t.color,
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
          Quarter Quiz
        </div>
        <div style={{ color: '#334155', marginBottom: 16, fontWeight: 700 }}>{bt.loading.room.de}: {roomCode}</div>
        <div style={{ fontSize: 13, color: connected ? '#22C55E' : '#EF4444', fontWeight: 700 }}>
          {connected ? bt.loading.waiting.de : bt.loading.connecting.de}
        </div>
      </div>
    </div>
  );
}
