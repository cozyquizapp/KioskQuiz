import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useQQSocket } from '../hooks/useQQSocket';
import {
  QQStateUpdate, QQ_CATEGORY_LABELS, qqGetAvatar, QQCategory,
  QQQuestionImage,
  QQSlideTemplates,
} from '../../../shared/quarterQuizTypes';
import { CustomSlide } from '../components/QQCustomSlide';
import {
  resumeAudio, setVolume, setSoundConfig, playFanfare, playReveal, playCorrect,
  playWrong, playTick, playUrgentTick, playTimesUp, playScoreUp,
  startTimerLoop, stopTimerLoop, playFieldPlaced, playSteal, playGameOver,
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
const CAT_CUTOUTS: Record<string, CutoutSpec[]> = {
  SCHAETZCHEN:   [{ emoji:'🍯', top:'6%',  right:'11%', size:80, rot:-12 },{ emoji:'✨', bottom:'14%', left:'7%',  size:50, rot:8  },{ emoji:'💛', top:'30%', right:'5%',  size:40, rot:16, alt:true }],
  MUCHO:         [{ emoji:'🤔', top:'8%',  right:'13%', size:76, rot:-8  },{ emoji:'💡', bottom:'18%', left:'6%',  size:54, rot:12 },{ emoji:'🅰️', top:'38%', right:'6%',  size:44, rot:-14, alt:true }],
  BUNTE_TUETE:   [{ emoji:'🎁', top:'7%',  right:'10%', size:84, rot:-10 },{ emoji:'🎲', bottom:'16%', left:'8%',  size:56, rot:14 },{ emoji:'⭐', top:'42%', right:'5%',  size:42, rot:20 }],
  ZEHN_VON_ZEHN: [{ emoji:'🔟', top:'10%', right:'12%', size:72, rot:-6  },{ emoji:'✅', bottom:'20%', left:'7%',  size:50, rot:10 },{ emoji:'📊', top:'32%', right:'7%',  size:46, rot:-12, alt:true }],
  CHEESE:        [{ emoji:'🧀', top:'9%',  right:'11%', size:78, rot:-11 },{ emoji:'🎭', bottom:'15%', left:'7%',  size:52, rot:8  },{ emoji:'👑', top:'36%', right:'6%',  size:44, rot:-9, alt:true }],
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
    descs: { de: ['', 'Felder besetzen', 'Setzen oder Klauen', 'Comeback-Phase', 'Alles aufs Spiel'],
             en: ['', 'Claim fields', 'Place or steal', 'Comeback phase', 'All in'] },
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
  const { state, connected, emit } = useQQSocket(roomCode);

  // Disable Cozy gradient mesh on QQ pages
  useEffect(() => {
    document.body.classList.add('qq-active');
    return () => { document.body.classList.remove('qq-active'); };
  }, []);

  useEffect(() => {
    if (!connected || joined) return;
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
  return <BeamerView state={state} slideTemplates={slideTemplates} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Beamer view — top-level router
// ═══════════════════════════════════════════════════════════════════════════════

function BeamerView({ state: s, slideTemplates }: { state: QQStateUpdate; slideTemplates: QQSlideTemplates }) {
  const cat = s.currentQuestion?.category;
  const bg = s.theme?.bgColor ?? (cat ? (CAT_BG[cat] ?? '#0D0A06') : '#0D0A06');
  const textCol = s.theme?.textColor ?? '#e2e8f0';
  const accent = s.theme?.accentColor ?? '#F59E0B';
  const cardBg = s.theme?.cardBg ?? '#1B1510';
  const fontFam = s.theme?.fontFamily ? `'${s.theme.fontFamily}', 'Nunito', system-ui, sans-serif` : "'Nunito', system-ui, sans-serif";

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
    if (s.phase !== 'QUESTION_ACTIVE' && s.phase !== 'QUESTION_REVEAL') {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      return;
    }
    if (audioRef.current?.src?.endsWith(url)) {
      audioRef.current.volume = s.musicMuted ? 0 : Math.min(1, s.volume * 0.5);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const a = new Audio(url);
    a.loop = true;
    a.volume = s.musicMuted ? 0 : Math.min(1, s.volume * 0.5);
    a.play().catch(() => {});
    audioRef.current = a;
    return () => { a.pause(); };
  }, [s.currentQuestion?.musicUrl, s.phase, s.musicMuted, s.volume]);

  // Fullscreen toggle
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
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
  const builtinOnly = s.phase === 'LOBBY' || s.phase === 'RULES' || s.phase === 'PLACEMENT';
  // Per-question override takes priority over category template
  const perQKey = !builtinOnly && s.currentQuestion ? `q-${s.currentQuestion.id}` : null;
  const rawPerQ = perQKey ? slideTemplates[perQKey] : undefined;
  const rawCategoryTemplate = !builtinOnly && templateType ? slideTemplates[templateType] : undefined;
  const rawActiveTemplate = rawPerQ?.elements?.length ? rawPerQ : rawCategoryTemplate;
  // Only use custom template if it has actual elements to render
  const activeTemplate = rawActiveTemplate?.elements?.length ? rawActiveTemplate : undefined;

  return (
    <div style={{
      minHeight: '100vh', width: '100vw',
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
              <PlacementView state={placementFlash.state} flashCell={placementFlash.cell} />
            </div>
          )}
        </>
      ) : (
        /* No template: built-in views */
        <>
          {s.phase === 'LOBBY'           && <LobbyView state={s} />}
          {s.phase === 'RULES'           && <RulesView state={s} />}
          {s.phase === 'PHASE_INTRO'     && <PhaseIntroView state={s} />}
          {(s.phase === 'QUESTION_ACTIVE' || s.phase === 'QUESTION_REVEAL') && !placementFlash && (
            <QuestionView key={s.currentQuestion?.id} state={s} revealed={s.phase !== 'QUESTION_ACTIVE'} hideCutouts={false} />
          )}
          {s.phase === 'PLACEMENT'       && <PlacementView state={s} />}
          {/* Placement flash: briefly show PlacementView with highlighted cell after placing */}
          {placementFlash && (
            <PlacementView state={placementFlash.state} flashCell={placementFlash.cell} />
          )}
          {s.phase === 'COMEBACK_CHOICE' && <ComebackView state={s} />}
          {s.phase === 'GAME_OVER'       && <GameOverView state={s} />}
        </>
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

const RULES_SLIDES_DE = [
  {
    icon: '🗺️',
    title: 'Das Ziel',
    color: '#3B82F6',
    lines: [
      'Beantwortet Fragen und erobert Felder auf dem Gitter.',
      'Wer die größte zusammenhängende Fläche hat, gewinnt!',
    ],
  },
  {
    icon: '1️⃣',
    title: 'Runde 1 — Besetzen',
    color: '#3B82F6',
    lines: [
      'Richtige Antwort = 1 Feld besetzen.',
      'Tipp: Baut eine zusammenhängende Fläche auf.',
    ],
    extra: '⭐ 2×2-Block → Joker-Bonus!',
  },
  {
    icon: '2️⃣',
    title: 'Runde 2 — Klauen',
    color: '#F59E0B',
    lines: [
      'Solange freie Felder da sind: 2 Felder besetzen.',
      'Wenn alles besetzt ist: 1 Feld klauen!',
    ],
    extra: '⚠️ Geklautes Feld zählt für euch.',
  },
  {
    icon: '3️⃣',
    title: 'Runde 3 — Taktik',
    color: '#EF4444',
    lines: [
      '2 Felder besetzen  —  oder  —  1 Feld klauen',
      '1 eigenes Feld einfrieren (❄️ 1 Frage lang geschützt)',
    ],
    extra: 'Richtig kombinieren macht den Unterschied!',
  },
  {
    icon: '4️⃣',
    title: 'Runde 4 — Finale',
    color: '#10B981',
    lines: [
      'Wie Runde 3, plus zwei neue Aktionen:',
      '🔄 Tauschen — 1 eigenes + 1 feindliches Feld wechseln',
      '📌 Stapeln — Plus-Form aus eigenen Feldern → Mittelpunkt einfrieren (2 Punkte!)',
    ],
    extra: '📌 Stapeln nur möglich wenn alle 4 Nachbarn euch gehören.',
  },
  {
    icon: '🏆',
    title: 'Wertung',
    color: '#F59E0B',
    lines: [
      'Größte zusammenhängende Fläche gewinnt.',
      'Gestapelte Felder (📌) zählen doppelt.',
      'Joker-Felder (⭐) sehen schön aus — kein Extra-Punkt.',
    ],
    extra: 'Viel Spaß & Quartier-Glück! 🎉',
  },
];

const RULES_SLIDES_EN = [
  {
    icon: '🗺️',
    title: 'The Goal',
    color: '#3B82F6',
    lines: [
      'Answer questions and claim cells on the grid.',
      'The team with the largest connected territory wins!',
    ],
  },
  {
    icon: '1️⃣',
    title: 'Round 1 — Claim',
    color: '#3B82F6',
    lines: [
      'Correct answer = claim 1 cell.',
      'Tip: Build a connected territory.',
    ],
    extra: '⭐ 2×2 block → Joker bonus!',
  },
  {
    icon: '2️⃣',
    title: 'Round 2 — Steal',
    color: '#F59E0B',
    lines: [
      'While free cells exist: claim 2 cells.',
      'When the grid is full: steal 1 enemy cell!',
    ],
    extra: '⚠️ Stolen cell counts for you.',
  },
  {
    icon: '3️⃣',
    title: 'Round 3 — Tactics',
    color: '#EF4444',
    lines: [
      'Claim 2 cells  —  or  —  steal 1 cell',
      'Freeze 1 own cell (❄️ protected for 1 question)',
    ],
    extra: 'Smart combos make the difference!',
  },
  {
    icon: '4️⃣',
    title: 'Round 4 — Final',
    color: '#10B981',
    lines: [
      'Same as Round 3, plus two new actions:',
      '🔄 Swap — exchange 1 own + 1 enemy cell',
      '📌 Stack — plus-shape of own cells → freeze center (2 pts!)',
    ],
    extra: '📌 Stack only if all 4 neighbours are yours.',
  },
  {
    icon: '🏆',
    title: 'Scoring',
    color: '#F59E0B',
    lines: [
      'Largest connected territory wins.',
      'Stacked cells (📌) count double.',
      'Joker cells (⭐) look nice — no extra point.',
    ],
    extra: 'Good luck & have fun! 🎉',
  },
];

export function RulesView({ state: s }: { state: QQStateUpdate }) {
  const lang = useLangFlip(s.language);
  const slides = lang === 'en' ? RULES_SLIDES_EN : RULES_SLIDES_DE;
  const totalSlides = s.totalPhases === 3 ? slides.length - 1 : slides.length; // skip Round 4 slide if 3-phase game
  const idx = Math.min(s.rulesSlideIndex ?? 0, totalSlides - 1);
  const slide = slides[idx];
  const fontFam = s.theme?.fontFamily ? `'${s.theme.fontFamily}', 'Nunito', system-ui, sans-serif` : "'Nunito', system-ui, sans-serif";
  const isLast = idx === totalSlides - 1;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', fontFamily: fontFam,
    }}>
      <Fireflies />

      {/* Slide counter */}
      <div style={{
        position: 'absolute', top: 20, right: 24,
        display: 'flex', gap: 6, zIndex: 10,
      }}>
        {Array.from({ length: totalSlides }).map((_, i) => (
          <div key={i} style={{
            width: i === idx ? 24 : 8, height: 8, borderRadius: 4,
            background: i === idx ? slide.color : 'rgba(255,255,255,0.18)',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>

      {/* Card */}
      <div key={idx} style={{
        position: 'relative', zIndex: 5,
        maxWidth: 780, width: '90%',
        background: 'rgba(15,12,9,0.82)',
        border: `2px solid ${slide.color}44`,
        borderRadius: 28,
        padding: '44px 52px',
        boxShadow: `0 0 80px ${slide.color}22, 0 8px 32px rgba(0,0,0,0.5)`,
        animation: 'phasePop 0.5s cubic-bezier(0.34,1.4,0.64,1) both',
        backdropFilter: 'blur(8px)',
      }}>
        {/* Icon + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
          <span style={{ fontSize: 'clamp(40px,6vw,72px)', lineHeight: 1 }}>{slide.icon}</span>
          <div>
            <div style={{
              fontSize: 'clamp(10px,1.1vw,14px)', fontWeight: 800, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: `${slide.color}99`, marginBottom: 4,
            }}>
              {lang === 'de' ? `Folie ${idx + 1} / ${totalSlides}` : `Slide ${idx + 1} / ${totalSlides}`}
            </div>
            <div style={{
              fontSize: 'clamp(28px,4.5vw,56px)', fontWeight: 900, lineHeight: 1.05,
              color: slide.color,
              textShadow: `0 0 40px ${slide.color}44`,
            }}>
              {slide.title}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{
          width: '100%', height: 2, borderRadius: 1,
          background: `linear-gradient(90deg, ${slide.color}88, transparent)`,
          marginBottom: 28,
        }} />

        {/* Lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {slide.lines.map((line, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              animation: `contentReveal 0.4s ease ${0.1 + i * 0.1}s both`,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: slide.color, marginTop: 8, flexShrink: 0,
              }} />
              <span style={{
                fontSize: 'clamp(16px,2.2vw,28px)', fontWeight: 700,
                color: '#e2e8f0', lineHeight: 1.4,
              }}>{line}</span>
            </div>
          ))}
        </div>

        {/* Extra callout */}
        {slide.extra && (
          <div style={{
            marginTop: 28, padding: '14px 20px', borderRadius: 14,
            background: `${slide.color}18`, border: `1px solid ${slide.color}33`,
            fontSize: 'clamp(14px,1.8vw,22px)', fontWeight: 800,
            color: slide.color,
            animation: 'contentReveal 0.5s ease 0.4s both',
          }}>
            {slide.extra}
          </div>
        )}

        {/* Last slide: "Los geht's!" hint */}
        {isLast && (
          <div style={{
            marginTop: 24, textAlign: 'center',
            fontSize: 'clamp(13px,1.6vw,20px)', fontWeight: 700,
            color: 'rgba(255,255,255,0.35)',
            animation: 'contentReveal 0.5s ease 0.6s both',
          }}>
            {lang === 'de' ? '← Moderator startet das Spiel →' : '← Moderator starts the game →'}
          </div>
        )}
      </div>

      {/* Navigation hint at bottom */}
      <div style={{
        position: 'absolute', bottom: 20, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 40,
        zIndex: 10, opacity: 0.4, fontSize: 13, fontWeight: 700, color: '#94a3b8',
        letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>
        {idx > 0 && <span>◀ {lang === 'de' ? 'Zurück' : 'Back'}</span>}
        <span>{lang === 'de' ? 'Moderator steuert' : 'Moderator controls'}</span>
        {!isLast && <span>{lang === 'de' ? 'Weiter' : 'Next'} ▶</span>}
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

  // Leaderboard + fun stats
  type LeaderEntry = { name: string; wins: number; games: number };
  type RecentGame = { winner: string; teams: { name: string; score: number }[]; playedAt: number; draftTitle: string };
  type FunStats = {
    highestScore: { teamName: string; score: number; draftTitle: string } | null;
    closestGame: { teams: string[]; gap: number; draftTitle: string } | null;
    winStreak: { teamName: string; streak: number } | null;
    mostGames: { teamName: string; games: number } | null;
    fastestAnswer: { teamName: string; text: string; questionText: string; ms: number } | null;
    funnyAnswers: Array<{ teamName: string; text: string; questionText: string }>;
  };
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [_recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [totalGames, setTotalGames] = useState(0);
  const [funStats, setFunStats] = useState<FunStats | null>(null);
  useEffect(() => {
    const API = (import.meta as any).env?.VITE_API_BASE ?? '/api';
    fetch(`${API}/qq/leaderboard`).then(r => r.json()).then(data => {
      if (data.leaderboard) setLeaderboard(data.leaderboard);
      if (data.recent) setRecentGames(data.recent);
      if (data.totalGames) setTotalGames(data.totalGames);
      if (data.funStats) setFunStats(data.funStats);
    }).catch(() => {});
  }, []);

  // Build rotating panels: leaderboard + each fun stat that exists
  const panels: Array<{ key: string; node: React.ReactNode }> = [];
  // Panel 0: Leaderboard
  if (leaderboard.length > 0) {
    panels.push({ key: 'leaderboard', node: (
      <div>
        <div style={{ fontSize: 'clamp(18px, 2vw, 26px)', fontWeight: 900, color: '#e2e8f0', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          🏆 {de ? 'Bestenliste' : 'Leaderboard'}
          {totalGames > 0 && <span style={{ fontSize: 'clamp(13px, 1.4vw, 17px)', fontWeight: 600, color: '#475569' }}>({totalGames} {de ? 'Spiele' : 'games'})</span>}
        </div>
        {leaderboard.slice(0, 5).map((entry, i) => (
          <div key={entry.name} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0',
            borderBottom: i < Math.min(leaderboard.length, 5) - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}>
            <span style={{ fontSize: 'clamp(22px, 2.4vw, 32px)', width: 36, textAlign: 'center' }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
            </span>
            <span style={{ flex: 1, fontWeight: 800, fontSize: 'clamp(17px, 1.8vw, 24px)', color: '#e2e8f0' }}>{entry.name}</span>
            <span style={{ fontSize: 'clamp(15px, 1.6vw, 20px)', fontWeight: 700, color: '#F59E0B' }}>{entry.wins} {de ? 'Siege' : 'wins'}</span>
            <span style={{ fontSize: 'clamp(12px, 1.2vw, 16px)', color: '#64748b' }}>{entry.games} {de ? 'Spiele' : 'games'}</span>
          </div>
        ))}
      </div>
    )});
  }
  // Panel: Records (highest score + closest game + win streak + most games)
  if (funStats) {
    const records: React.ReactNode[] = [];
    if (funStats.highestScore) {
      records.push(
        <div key="hs" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0' }}>
          <span style={{ fontSize: 'clamp(26px, 2.8vw, 36px)' }}>🔥</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 'clamp(16px, 1.7vw, 22px)', color: '#e2e8f0' }}>
              {de ? 'Höchster Score' : 'Highest Score'}
            </div>
            <div style={{ fontSize: 'clamp(14px, 1.5vw, 19px)', color: '#94a3b8' }}>
              <strong style={{ color: '#F59E0B' }}>{funStats.highestScore.teamName}</strong> — {funStats.highestScore.score} {de ? 'Punkte' : 'points'}
            </div>
          </div>
        </div>
      );
    }
    if (funStats.closestGame) {
      records.push(
        <div key="cg" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0' }}>
          <span style={{ fontSize: 'clamp(26px, 2.8vw, 36px)' }}>⚔️</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 'clamp(16px, 1.7vw, 22px)', color: '#e2e8f0' }}>
              {de ? 'Knappster Sieg' : 'Closest Game'}
            </div>
            <div style={{ fontSize: 'clamp(14px, 1.5vw, 19px)', color: '#94a3b8' }}>
              {funStats.closestGame.teams[0]} vs {funStats.closestGame.teams[1]} — {de ? `nur ${funStats.closestGame.gap} Pkt.` : `only ${funStats.closestGame.gap} pts apart`}
            </div>
          </div>
        </div>
      );
    }
    if (funStats.winStreak) {
      records.push(
        <div key="ws" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0' }}>
          <span style={{ fontSize: 'clamp(26px, 2.8vw, 36px)' }}>🔥</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 'clamp(16px, 1.7vw, 22px)', color: '#e2e8f0' }}>
              {de ? 'Siegesserie' : 'Win Streak'}
            </div>
            <div style={{ fontSize: 'clamp(14px, 1.5vw, 19px)', color: '#94a3b8' }}>
              <strong style={{ color: '#F59E0B' }}>{funStats.winStreak.teamName}</strong> — {funStats.winStreak.streak}x {de ? 'in Folge' : 'in a row'}
            </div>
          </div>
        </div>
      );
    }
    if (funStats.mostGames) {
      records.push(
        <div key="mg" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0' }}>
          <span style={{ fontSize: 'clamp(26px, 2.8vw, 36px)' }}>🎮</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 'clamp(16px, 1.7vw, 22px)', color: '#e2e8f0' }}>
              {de ? 'Meiste Spiele' : 'Most Games'}
            </div>
            <div style={{ fontSize: 'clamp(14px, 1.5vw, 19px)', color: '#94a3b8' }}>
              <strong style={{ color: '#F59E0B' }}>{funStats.mostGames.teamName}</strong> — {funStats.mostGames.games} {de ? 'Spiele' : 'games'}
            </div>
          </div>
        </div>
      );
    }
    if (funStats.fastestAnswer) {
      const secs = (funStats.fastestAnswer.ms / 1000).toFixed(1);
      records.push(
        <div key="fa" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0' }}>
          <span style={{ fontSize: 'clamp(26px, 2.8vw, 36px)' }}>⚡</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 'clamp(16px, 1.7vw, 22px)', color: '#e2e8f0' }}>
              {de ? 'Schnellste Antwort' : 'Fastest Answer'}
            </div>
            <div style={{ fontSize: 'clamp(14px, 1.5vw, 19px)', color: '#94a3b8' }}>
              <strong style={{ color: '#F59E0B' }}>{funStats.fastestAnswer.teamName}</strong> — {secs}s {de ? 'Vorsprung' : 'ahead'}
            </div>
          </div>
        </div>
      );
    }
    if (records.length > 0) {
      panels.push({ key: 'records', node: (
        <div>
          <div style={{ fontSize: 'clamp(18px, 2vw, 26px)', fontWeight: 900, color: '#e2e8f0', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            📊 {de ? 'Rekorde' : 'Records'}
          </div>
          {records}
        </div>
      )});
    }
  }
  // Panel: Funny answers
  if (funStats?.funnyAnswers && funStats.funnyAnswers.length > 0) {
    panels.push({ key: 'funny', node: (
      <div>
        <div style={{ fontSize: 'clamp(18px, 2vw, 26px)', fontWeight: 900, color: '#e2e8f0', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          😂 {de ? 'Lustigste Antworten' : 'Funniest Answers'}
        </div>
        {funStats.funnyAnswers.map((fa, i) => (
          <div key={i} style={{ padding: '8px 0', borderBottom: i < funStats.funnyAnswers.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
            <div style={{ fontSize: 'clamp(17px, 1.8vw, 24px)', fontWeight: 700, color: '#FBBF24' }}>„{fa.text}"</div>
            <div style={{ fontSize: 'clamp(13px, 1.4vw, 18px)', color: '#64748b', marginTop: 3 }}>— {fa.teamName}</div>
          </div>
        ))}
      </div>
    )});
  }

  // Auto-rotate panels
  const [panelIdx, setPanelIdx] = useState(0);
  useEffect(() => {
    if (panels.length <= 1) return;
    const id = setInterval(() => setPanelIdx(p => (p + 1) % panels.length), 10000);
    return () => clearInterval(id);
  }, [panels.length]);

  const activePanel = panels[panelIdx % Math.max(panels.length, 1)];

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      padding: '48px 56px 40px', position: 'relative', overflow: 'hidden',
    }}>
      <Fireflies />

      {/* ── Top: Title centered ── */}
      <div style={{
        textAlign: 'center', position: 'relative', zIndex: 5,
        animation: 'phasePop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.1s both',
      }}>
        <div style={{
          fontFamily: fontFam,
          fontSize: 'clamp(56px, 9vw, 120px)', fontWeight: 900, lineHeight: 1,
          background: 'linear-gradient(135deg, #e2e8f0 40%, #94a3b8)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em',
        }}>
          {de ? 'Quartier Quiz' : 'Quarter Quiz'}
        </div>
      </div>

      {/* ── Middle: QR + rotating stats side by side ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 'clamp(40px, 6vw, 100px)', position: 'relative', zIndex: 5,
        width: '100%', maxWidth: 1200,
      }}>
        {/* QR Code */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          flexShrink: 0,
          animation: 'phasePop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both',
        }}>
          <div style={{
            background: '#ffffff', borderRadius: 24, padding: 24,
            animation: 'qrGlow 3s ease-in-out infinite',
            boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
          }}>
            <QRCodeSVG value={joinUrl} size={320} bgColor="#ffffff" fgColor="#0D0A06" level="M" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(16px, 1.8vw, 22px)', color: '#e2e8f0', fontWeight: 800, marginBottom: 4 }}>
              {de ? 'Jetzt mitspielen' : 'Join now'}
            </div>
            <div style={{
              fontSize: 'clamp(14px, 1.4vw, 18px)', color: '#64748b', fontFamily: 'monospace',
              background: cardBg, padding: '8px 18px', borderRadius: 10,
            }}>
              {joinUrl.replace('https://', '').replace('http://', '')}
            </div>
          </div>
        </div>

        {/* Rotating stats/records panels — big center */}
        {activePanel && (
          <div style={{
            flex: 1, maxWidth: 520,
            animation: 'contentReveal 0.5s ease both',
          }}>
            <div style={{
              background: cardBg, borderRadius: 20, padding: 'clamp(20px, 2.5vw, 32px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}>
              {activePanel.node}
              {panels.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14 }}>
                  {panels.map((_, i) => (
                    <div key={i} style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: i === panelIdx % panels.length ? '#e2e8f0' : 'rgba(255,255,255,0.15)',
                      transition: 'background 0.3s',
                    }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom: Teams row + status ── */}
      <div style={{ position: 'relative', zIndex: 5, textAlign: 'center', width: '100%' }}>
        {s.teams.length === 0 ? (
          <div style={{ color: '#475569', fontSize: 'clamp(18px, 2vw, 26px)', fontWeight: 700 }}>
            {de ? 'Warte auf Teams…' : 'Waiting for teams…'}
          </div>
        ) : (
          <>
            <div style={{
              display: 'flex', gap: 'clamp(12px, 1.5vw, 20px)', justifyContent: 'center', flexWrap: 'wrap',
              marginBottom: 14,
            }}>
              {s.teams.map((t, i) => (
                <div key={t.id} style={{
                  padding: 'clamp(12px, 1.4vw, 20px) clamp(18px, 2vw, 30px)', borderRadius: 18,
                  background: cardBg,
                  border: `2px solid ${t.color}55`,
                  boxShadow: `0 6px 24px rgba(0,0,0,0.4), 0 0 20px ${t.color}18`,
                  display: 'flex', alignItems: 'center', gap: 'clamp(10px, 1.2vw, 16px)',
                  animation: `teamCardIn 0.5s cubic-bezier(0.34,1.2,0.64,1) ${0.4 + i * 0.08}s both`,
                }}>
                  <span style={{ fontSize: 'clamp(32px, 4vw, 48px)', lineHeight: 1 }}>{qqGetAvatar(t.avatarId).emoji}</span>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 'clamp(16px, 2vw, 24px)', color: t.color }}>{t.name}</div>
                    <div style={{ fontSize: 'clamp(11px, 1.2vw, 14px)', fontWeight: 700, color: t.connected ? '#22C55E' : '#475569' }}>
                      {t.connected ? (de ? '● verbunden' : '● connected') : (de ? '○ wartend' : '○ waiting')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ color: '#64748b', fontSize: 'clamp(14px, 1.6vw, 20px)', fontWeight: 700 }}>
              {s.teams.length < 2
                ? (de ? 'Mindestens 2 Teams benötigt' : 'At least 2 teams needed')
                : (de ? 'Moderator startet das Spiel' : 'Moderator starts the game')}
            </div>
          </>
        )}
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

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <Fireflies />

      {isFirstOfRound && s.introStep === 0 ? (
        /* ── Step 0: Round announcement (first question only) ── */
        <>
          <div style={{
            fontFamily: fontFam,
            fontSize: 'clamp(90px, 16vw, 220px)', fontWeight: 900, lineHeight: 0.9,
            color,
            textShadow: `0 0 120px ${color}44, 0 12px 0 ${color}33`,
            textAlign: 'center',
            animation: 'phasePop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.15s both, floatNum 3.5s ease-in-out 1s infinite',
            position: 'relative', zIndex: 5,
          }}>
            {phaseName}
          </div>

          <div style={{
            width: 'clamp(240px, 35vw, 500px)', height: 5, borderRadius: 3,
            background: color, marginTop: 28, marginBottom: 28,
            transformOrigin: 'center',
            animation: 'phaseLineGrow 0.6s cubic-bezier(0.34,1.2,0.64,1) 0.5s both',
            position: 'relative', zIndex: 5,
          }} />

          <div style={{
            fontFamily: "'Caveat', cursive",
            fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 700,
            color: `${color}88`,
            animation: 'phasePop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.6s both',
            position: 'relative', zIndex: 5,
          }}>
            {phaseDesc}
          </div>
        </>
      ) : (
        /* ── Category reveal (step 1 for first Q, step 0 for Q2+) ── */
        <>
          <div style={{
            fontFamily: "'Caveat', cursive",
            fontSize: 'clamp(22px, 2.8vw, 36px)', fontWeight: 700,
            color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase',
            marginBottom: 20,
            animation: 'phasePop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both',
            position: 'relative', zIndex: 5,
          }}>
            {lang === 'de' ? `Frage ${questionInPhase}` : `Question ${questionInPhase}`}
          </div>

          {cat && (
            <>
              <div style={{
                fontSize: 'clamp(72px, 12vw, 150px)',
                animation: 'phasePop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.25s both',
                position: 'relative', zIndex: 5,
              }}>{catEmoji}</div>

              <div style={{
                fontFamily: fontFam,
                fontSize: 'clamp(60px, 11vw, 160px)', fontWeight: 900, lineHeight: 1,
                color: catColor,
                textShadow: `0 0 80px ${catColor}44, 0 8px 0 ${catColor}33`,
                marginTop: 12,
                animation: 'phasePop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.4s both, floatNum 3.5s ease-in-out 1.2s infinite',
                position: 'relative', zIndex: 5,
                textAlign: 'center',
              }}>{catLabel}</div>
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

      {/* MUCHO / ZEHN: who chose which option */}
      {(q.category === 'MUCHO' || q.category === 'ZEHN_VON_ZEHN') && q.options && (
        <div style={{ animation: 'contentReveal 0.5s ease 0.1s both' }}>
          {q.options.map((_, optIdx) => {
            const voters = s.answers
              .filter(a => a.text === String(optIdx))
              .sort((a, b) => a.submittedAt - b.submittedAt)
              .map(a => s.teams.find(t => t.id === a.teamId))
              .filter(Boolean);
            if (!voters.length) return null;
            const isCorrect = optIdx === q.correctOptionIndex;
            const MUCHO_COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#22C55E'];
            const optColor = q.category === 'MUCHO' ? MUCHO_COLORS[optIdx] : (isCorrect ? '#22C55E' : '#475569');
            return (
              <div key={optIdx} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 12px', borderRadius: 10, marginBottom: 4,
                background: isCorrect ? 'rgba(34,197,94,0.10)' : 'rgba(255,255,255,0.04)',
                border: isCorrect ? '1.5px solid rgba(34,197,94,0.25)' : '1px solid rgba(255,255,255,0.06)',
                animation: `contentReveal 0.4s ease ${0.1 + optIdx * 0.07}s both`,
              }}>
                <span style={{ width: 26, height: 26, borderRadius: 7, background: optColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(12px, 1.3vw, 15px)', fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                  {q.category === 'MUCHO' ? ['A','B','C','D'][optIdx] : optIdx + 1}
                </span>
                {voters.map((t, vi) => (
                  <span key={t!.id} style={{ display: 'flex', alignItems: 'center', gap: 5, animation: `contentReveal 0.3s ease ${vi * 0.08}s both` }}>
                    <span style={{ fontSize: 'clamp(18px, 2.2vw, 28px)' }}>{qqGetAvatar(t!.avatarId).emoji}</span>
                    <span style={{ fontSize: 'clamp(13px, 1.4vw, 18px)', fontWeight: 800, color: t!.color }}>{t!.name}</span>
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* CHEESE: speed-ranked */}
      {q.category === 'CHEESE' && (
        <div style={{ animation: 'contentReveal 0.5s ease 0.1s both' }}>
          {[...s.answers].sort((a, b) => a.submittedAt - b.submittedAt).map((a, i) => {
            const team = s.teams.find(t => t.id === a.teamId);
            const isWinner = a.teamId === s.correctTeamId;
            return (
              <div key={a.teamId} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 14px', borderRadius: 10, marginBottom: 4,
                background: isWinner ? 'rgba(34,197,94,0.10)' : 'rgba(255,255,255,0.03)',
                border: isWinner ? '1.5px solid rgba(34,197,94,0.30)' : '1px solid rgba(255,255,255,0.06)',
                animation: `contentReveal 0.4s ease ${0.1 + i * 0.08}s both`,
              }}>
                <span style={{ fontSize: 'clamp(12px, 1.2vw, 16px)', fontWeight: 900, color: '#475569', width: 22 }}>#{i + 1}</span>
                {team && <span style={{ fontSize: 'clamp(18px, 2.2vw, 28px)' }}>{qqGetAvatar(team.avatarId).emoji}</span>}
                <span style={{ fontWeight: 800, color: team?.color ?? '#e2e8f0', flex: 1, fontSize: 'clamp(13px, 1.4vw, 18px)' }}>{team?.name}</span>
                <span style={{ fontSize: 'clamp(13px, 1.4vw, 18px)', fontWeight: 800, color: '#e2e8f0' }}>{a.text}</span>
                {isWinner && <span style={{ color: '#4ade80' }}>✓</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* BUNTE TÜTE top5 */}
      {q.category === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'top5' && (() => {
        const btt = q.bunteTuete as any;
        const correctDE: string[] = (btt.answers ?? []).map((s: string) => s.trim().toLowerCase()).filter(Boolean);
        const correctEN: string[] = (btt.answersEn ?? []).map((s: string) => s.trim().toLowerCase()).filter(Boolean);
        const allCorrect = new Set([...correctDE, ...correctEN]);
        const scored = [...s.answers].map(a => {
          const parts = a.text.split('|').map((p: string) => p.trim()).filter(Boolean);
          const hits = parts.filter((p: string) => [...allCorrect].some(c => c && (p.toLowerCase() === c || p.toLowerCase().includes(c) || c.includes(p.toLowerCase()))));
          return { ...a, parts, hits: hits.length };
        }).sort((a, b) => b.hits - a.hits || a.submittedAt - b.submittedAt);
        return scored.map((a, i) => {
          const team = s.teams.find(t => t.id === a.teamId);
          const isWinner = a.teamId === s.correctTeamId;
          return (
            <div key={a.teamId} style={{
              padding: '7px 12px', borderRadius: 10, marginBottom: 4,
              background: isWinner ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
              border: isWinner ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.05)',
              animation: `contentReveal 0.4s ease ${0.1 + i * 0.08}s both`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: '#475569', width: 20 }}>#{i + 1}</span>
                {team && <span style={{ fontSize: 16 }}>{qqGetAvatar(team.avatarId).emoji}</span>}
                <span style={{ fontWeight: 800, color: team?.color ?? '#e2e8f0', flex: 1, fontSize: 13 }}>{team?.name}</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: isWinner ? '#4ade80' : '#475569' }}>{a.hits}/{correctDE.length || 5} {lang === 'en' ? 'hits' : 'Treffer'}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, paddingLeft: 28 }}>
                {a.parts.map((p: string, pi: number) => {
                  const hit = [...allCorrect].some(c => c && (p.toLowerCase() === c || p.toLowerCase().includes(c) || c.includes(p.toLowerCase())));
                  return <span key={pi} style={{ padding: '1px 6px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: hit ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)', color: hit ? '#4ade80' : '#64748b' }}>{hit ? '✓ ' : ''}{p}</span>;
                })}
              </div>
            </div>
          );
        });
      })()}

      {/* BUNTE TÜTE order */}
      {q.category === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'order' && (() => {
        const btt = q.bunteTuete as any;
        const items: string[] = btt.items ?? [];
        const correctOrder: number[] = btt.correctOrder ?? items.map((_: any, i: number) => i);
        const correctSeq = correctOrder.map((idx: number) => (items[idx] ?? '').trim().toLowerCase());
        const scored = [...s.answers].map(a => {
          const parts = a.text.split('|').map((p: string) => p.trim().toLowerCase()).filter(Boolean);
          const score = parts.filter((p: string, i: number) => p === correctSeq[i]).length;
          return { ...a, parts, score };
        }).sort((a, b) => b.score - a.score || a.submittedAt - b.submittedAt);
        return scored.map((a, i) => {
          const team = s.teams.find(t => t.id === a.teamId);
          const isWinner = a.teamId === s.correctTeamId;
          return (
            <div key={a.teamId} style={{
              padding: '7px 12px', borderRadius: 10, marginBottom: 4,
              background: isWinner ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
              border: isWinner ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.05)',
              animation: `contentReveal 0.4s ease ${0.1 + i * 0.08}s both`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: '#475569', width: 20 }}>#{i + 1}</span>
                {team && <span style={{ fontSize: 16 }}>{qqGetAvatar(team.avatarId).emoji}</span>}
                <span style={{ fontWeight: 800, color: team?.color ?? '#e2e8f0', flex: 1, fontSize: 13 }}>{team?.name}</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: isWinner ? '#4ade80' : '#475569' }}>{a.score}/{correctSeq.length} {lang === 'en' ? 'correct' : 'richtig'}</span>
              </div>
            </div>
          );
        });
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

  // ── CHEESE staged flow ──────────────────────────────────────────────────
  // Phase 1: question text visible, no image
  // Phase 2 (imageRevealed): fullscreen image, question text hidden
  // Phase 3 (revealed): image as side panel, answer + grid visible
  const cheeseFullscreen = isCheese && hasImg && s.imageRevealed && !revealed;
  // In CHEESE reveal: treat image as a proper window-right panel (not absolute clip)
  const isCheeseReveal = isCheese && hasImg && revealed;

  // Auto-size: shorter fontSize for long questions
  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';
  const qFontSize = revealed
    ? (qText.length > 200 ? 'clamp(20px, 2.4vw, 34px)'
      : qText.length > 120 ? 'clamp(24px, 3vw, 44px)'
      : 'clamp(28px, 3.5vw, 52px)')
    : qText.length > 200 ? 'clamp(28px, 3.2vw, 48px)'
    : qText.length > 120 ? 'clamp(32px, 4vw, 60px)'
    : qText.length > 60 ? 'clamp(38px, 5vw, 76px)'
    : 'clamp(44px, 6vw, 92px)'; // big short questions fill the space

  // Category intro overlay removed — category is already shown in PHASE_INTRO

  return (
    <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
      {/* Fullscreen background image (explicit fullscreen layout OR CHEESE staged reveal — not CHEESE reveal which uses window panel) */}
      {((hasImg && img.layout === 'fullscreen') || cheeseFullscreen) && !isCheeseReveal && (
        <>
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            backgroundImage: `url(${img!.url})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            clipPath: revealed ? 'inset(8% 8% 8% 52% round 18px)' : undefined,
            animation: cheeseFullscreen
              ? 'fsExpand 1.0s cubic-bezier(0.4,0,0.2,1) both'
              : (revealed ? undefined : 'fsExpand 1.2s cubic-bezier(0.4,0,0.2,1) 0.2s both'),
            transition: 'clip-path 0.8s cubic-bezier(0.4,0,0.2,1)',
            transform: `translate(${img!.offsetX ?? 0}%, ${img!.offsetY ?? 0}%) scale(${img!.scale ?? 1}) rotate(${img!.rotation ?? 0}deg)`,
            opacity: img!.opacity ?? 1,
            filter: imgFilter(img!),
          }} />
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2,
            background: [
              'linear-gradient(90deg, rgba(13,10,6,0.92) 0%, rgba(13,10,6,0.78) 45%, rgba(13,10,6,0.45) 100%)',
              'linear-gradient(180deg, rgba(13,10,6,0.5) 0%, transparent 25%, transparent 70%, rgba(13,10,6,0.6) 100%)',
            ].join(', '),
            opacity: revealed ? 0.4 : 1,
            transition: 'opacity 0.8s ease',
          }} />
        </>
      )}

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

      {/* Main content */}
      {/* CHEESE: hide when fullscreen image is showing (imageRevealed but not yet revealed) */}
      <div style={{
        flex: 1, display: 'flex', gap: 0,
        flexDirection: hasImg && img.layout === 'window-left' ? 'row-reverse' : 'row',
        animation: 'contentReveal 0.35s ease both',
        visibility: cheeseFullscreen ? 'hidden' : undefined,
      }}>
        {/* ── Main content — full width, centered ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 64px', justifyContent: 'center', alignItems: 'center', position: 'relative', zIndex: 5, overflowY: 'auto' }}>

          {/* Timer — large, centered (active only) */}
          {!revealed && s.timerEndsAt && (
            <div style={{ marginBottom: 24 }}>
              <BeamerTimer endsAt={s.timerEndsAt} durationSec={s.timerDurationSec} accent={accent} />
            </div>
          )}

          {/* Question card — centered, full width */}
          <div style={{
            background: cardBg,
            border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: 24,
            boxShadow: `0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)`,
            padding: '40px 56px',
            marginBottom: 28,
            width: '100%', maxWidth: 1400,
            textAlign: 'center',
          }}>
            <div key={lang} style={{
              fontSize: qFontSize, fontWeight: 900, lineHeight: 1.22,
              color: '#F1F5F9',
              animation: 'langFadeIn 0.4s ease both',
            }}>
              {qText}
            </div>
          </div>

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
                    border: isCorrect ? '3px solid #22C55E' : `2px solid ${optColor}55`,
                    boxShadow: isCorrect ? '0 0 24px rgba(34,197,94,0.3)' : `0 4px 16px rgba(0,0,0,0.3)`,
                    display: 'flex', alignItems: 'center', gap: 16,
                    minHeight: optImg?.url ? 100 : 84,
                    transition: 'all 0.3s ease',
                    animation: `contentReveal 0.4s ease ${0.1 + i * 0.08}s both`,
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
                      background: isCorrect ? '#22C55E' : optColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 28, fontWeight: 900, color: '#fff', flexShrink: 0,
                      boxShadow: `0 2px 8px ${(isCorrect ? '#22C55E' : optColor)}66`,
                    }}>{isCorrect ? '✓' : label}</div>
                    <div style={{
                      position: 'relative', zIndex: 1,
                      fontSize: 'clamp(26px, 3.2vw, 44px)', fontWeight: 800,
                      color: '#F1F5F9', lineHeight: 1.3,
                      textShadow: optImg?.url ? '0 2px 8px rgba(0,0,0,0.8)' : 'none',
                    }}>{optText}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Answer reveal (skip for MUCHO/ZEHN_VON_ZEHN — already visible in option cards) */}
          {revealed && s.revealedAnswer && q.category !== 'MUCHO' && q.category !== 'ZEHN_VON_ZEHN' && (
            <div style={{
              padding: '28px 48px', borderRadius: 24,
              background: 'rgba(34,197,94,0.10)',
              border: '2px solid rgba(34,197,94,0.40)',
              boxShadow: '0 0 40px rgba(34,197,94,0.16)',
              fontSize: 'clamp(34px, 5vw, 68px)', fontWeight: 900,
              color: '#4ade80', marginBottom: 24,
              width: '100%', maxWidth: 1400, textAlign: 'center',
              animation: 'contentReveal 0.4s ease both',
            }}>
              ✓ {lang === 'en' && q.answerEn ? q.answerEn : s.revealedAnswer}
            </div>
          )}

          {/* Correct team — full-width winner banner */}
          {revealed && s.correctTeamId && (() => {
            const team = s.teams.find(t => t.id === s.correctTeamId);
            if (!team) return null;
            const cat = q.category;
            const isEn = lang === 'en';
            const winMsg = cat === 'SCHAETZCHEN'
              ? (isEn ? 'war am nächsten dran!' : 'war am nächsten dran!')
              : cat === 'CHEESE'
                ? (isEn ? 'hat es erkannt!' : 'hat es erkannt!')
                : cat === 'BUNTE_TUETE'
                  ? (isEn ? 'gewinnt die Runde!' : 'gewinnt die Runde!')
                  : (isEn ? 'richtig!' : 'richtig!');
            return (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28,
                padding: '28px 44px', borderRadius: 28, marginBottom: 12,
                width: '100%', maxWidth: 1400,
                background: `linear-gradient(135deg, ${team.color}22, ${team.color}0a)`,
                border: `2px solid ${team.color}66`,
                boxShadow: `0 0 40px ${team.color}22, 0 8px 24px rgba(0,0,0,0.4)`,
                animation: 'winnerSlideIn 0.5s cubic-bezier(0.34,1.4,0.64,1) both',
              }}>
                <span style={{ fontSize: 'clamp(64px, 8vw, 110px)', lineHeight: 1, flexShrink: 0 }}>
                  {qqGetAvatar(team.avatarId).emoji}
                </span>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 'clamp(36px, 5vw, 72px)', color: team.color, lineHeight: 1.1 }}>
                    {team.name}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 'clamp(18px, 2.4vw, 32px)', fontWeight: 700, marginTop: 6 }}>
                    {winMsg}
                  </div>
                </div>
              </div>
            );
          })()}
          {/* Confetti overlay on correct answer */}
          {revealed && s.correctTeamId && <ConfettiOverlay />}

          {/* Bottom: team answer status (active questions only) */}
          {!revealed && s.teams.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
              marginTop: 'auto', paddingTop: 20,
            }}>
              {s.teams.map(t => {
                const answered = s.answers.some(a => a.teamId === t.id);
                return (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 18px', borderRadius: 999,
                    background: answered ? `${t.color}22` : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${answered ? t.color + '55' : 'rgba(255,255,255,0.08)'}`,
                    transition: 'all 0.4s ease',
                    opacity: answered ? 1 : 0.45,
                  }}>
                    <span style={{ fontSize: 28, lineHeight: 1 }}>{qqGetAvatar(t.avatarId).emoji}</span>
                    <span style={{
                      fontSize: 18, fontWeight: 900, color: answered ? t.color : '#475569',
                    }}>
                      {answered ? '✓' : '…'}
                    </span>
                  </div>
                );
              })}
              {s.allAnswered && (
                <div style={{
                  padding: '8px 20px', borderRadius: 999,
                  background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.35)',
                  fontSize: 18, fontWeight: 800, color: '#86EFAC',
                  animation: 'contentReveal 0.4s ease both',
                }}>
                  Alle Teams haben geantwortet
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Image window panel (window-left / window-right / CHEESE reveal) ── */}
        {(isWindow || isCheeseReveal) && (
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

export function PlacementView({ state: s, flashCell }: { state: QQStateUpdate; flashCell?: { row: number; col: number; teamId: string } | null }) {
  const lang = useLangFlip(s.language);
  const team = s.teams.find(tm => tm.id === (flashCell?.teamId ?? s.pendingFor));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <Fireflies />

      {/* Top banner — team + action info */}
      <div style={{
        padding: '16px 44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
        position: 'relative', zIndex: 5,
        background: 'rgba(13,10,6,0.6)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        {team && (
          <>
            <span style={{ fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1 }}>{qqGetAvatar(team.avatarId).emoji}</span>
            <span style={{ fontWeight: 900, fontSize: 'clamp(24px, 3vw, 44px)', color: team.color }}>{team.name}</span>
          </>
        )}
        <span style={{
          fontSize: 'clamp(14px, 1.6vw, 22px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
          color: '#94a3b8',
        }}>
          {actionVerb(s.pendingAction, lang)}
        </span>
        {team && s.teamPhaseStats[team.id] && (
          <span style={{ color: '#64748b', fontSize: 'clamp(13px, 1.4vw, 18px)', fontWeight: 700 }}>
            {actionDesc(s.pendingAction, s.teamPhaseStats[team.id], lang)}
          </span>
        )}
      </div>

      {/* Center: large grid centered with score below */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 44px', position: 'relative', zIndex: 5, gap: 20 }}>
        <GridDisplay state={s} maxSize={Math.min(700, typeof window !== 'undefined' ? window.innerHeight * 0.65 : 600)} highlightTeam={flashCell?.teamId ?? s.pendingFor} showJoker flashCellKey={flashCell ? `${flashCell.row}-${flashCell.col}` : null} />
        <ScoreBar teams={s.teams} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMEBACK VIEW
// ═══════════════════════════════════════════════════════════════════════════════

export function ComebackView({ state: s }: { state: QQStateUpdate }) {
  const lang = useLangFlip(s.language);
  const accent = s.theme?.accentColor ?? '#F59E0B';
  const cardBg = s.theme?.cardBg ?? '#1B1510';
  const textCol = s.theme?.textColor ?? '#e2e8f0';
  const team = s.teams.find(tm => tm.id === s.comebackTeamId);

  return (
    <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
      <Fireflies />

      {/* Left content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '48px 44px', justifyContent: 'center', position: 'relative', zIndex: 5 }}>
        <div style={{
          fontFamily: "'Caveat', cursive",
          fontSize: 'clamp(16px, 2vw, 26px)', color: accent, fontWeight: 700,
          marginBottom: 20, letterSpacing: '0.06em',
        }}>
          {bt.comeback.title[lang]}
        </div>

        {team && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
              <span style={{ fontSize: 'clamp(48px, 7vw, 80px)', lineHeight: 1 }}>{qqGetAvatar(team.avatarId).emoji}</span>
              <div style={{
                fontSize: 'clamp(28px, 4vw, 56px)', fontWeight: 900, color: team.color,
                textShadow: `0 0 40px ${team.color}44`,
              }}>{team.name}</div>
            </div>

            {!s.comebackAction ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <ComebackOption icon="📍" label={bt.comeback.place2[lang]} desc={bt.comeback.place2desc[lang]} color="#22C55E" cardBg={cardBg} />
                <ComebackOption icon="⚡" label={bt.comeback.steal1[lang]}   desc={bt.comeback.steal1desc[lang]}   color="#EF4444" cardBg={cardBg} />
                <ComebackOption icon="🔄" label={bt.comeback.swap2[lang]} desc={bt.comeback.swap2desc[lang]} color="#8B5CF6" cardBg={cardBg} />
              </div>
            ) : (
              <div style={{
                padding: '22px 28px', borderRadius: 20,
                background: cardBg, border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                fontSize: 'clamp(20px, 2.4vw, 32px)', fontWeight: 900, color: textCol,
              }}>
                {s.comebackAction === 'PLACE_2' && bt.comeback.chosenPlace2[lang]}
                {s.comebackAction === 'STEAL_1' && bt.comeback.chosenSteal1[lang]}
                {s.comebackAction === 'SWAP_2'  && bt.comeback.chosenSwap2[lang]}
              </div>
            )}
          </>
        )}
      </div>

      {/* Right: grid */}
      <div style={{ width: 480, flexShrink: 0, padding: '28px 28px 28px 16px', display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center', position: 'relative', zIndex: 5 }}>
        <GridDisplay state={s} maxSize={440} highlightTeam={s.comebackTeamId} showJoker />
        <ScoreBar teams={s.teams} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME OVER — Notebook style
// ═══════════════════════════════════════════════════════════════════════════════

export function GameOverView({ state: s }: { state: QQStateUpdate }) {
  const lang = useLangFlip(s.language);
  const accent = s.theme?.accentColor ?? '#F59E0B';
  const sorted = [...s.teams].sort((a, b) => b.largestConnected - a.largestConnected);
  const winner = sorted[0];

  return (
    <div style={{
      flex: 1, display: 'flex', position: 'relative', overflow: 'hidden',
      background: [
        'repeating-linear-gradient(transparent, transparent 39px, rgba(234,179,8,0.03) 39px, rgba(234,179,8,0.03) 40px)',
        'radial-gradient(ellipse at 50% 0%, rgba(180,83,9,0.18) 0%, transparent 50%)',
        '#0D0A06',
      ].join(','),
    }}>
      {/* Confetti overlay */}
      <ConfettiOverlay />

      {/* Notebook margin line */}
      <div style={{ position: 'absolute', left: 68, top: 0, bottom: 0, width: 1, background: 'rgba(234,179,8,0.07)', pointerEvents: 'none', zIndex: 1 }} />

      {/* Spiral rings */}
      <div style={{ position: 'absolute', left: 16, top: 20, bottom: 20, display: 'flex', flexDirection: 'column', gap: 28, alignItems: 'center', zIndex: 5 }}>
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} style={{ width: 20, height: 20, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.03)' }} />
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '28px 44px 28px 90px', gap: 20, position: 'relative', zIndex: 2 }}>

        {/* Title */}
        <div style={{
          fontFamily: "'Caveat', cursive", fontWeight: 700,
          fontSize: 'clamp(36px, 5.5vw, 68px)', color: '#FEF3C7',
          borderBottom: '3px solid rgba(234,179,8,0.2)', paddingBottom: 10,
        }}>
          {bt.gameOver.title[lang]}
        </div>

        {/* Rankings */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0 }}>
          {sorted.map((tm, i) => (
            <div key={tm.id} style={{
              display: 'flex', alignItems: 'center', gap: 20,
              padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
              ['--del' as string]: `${i * 0.12}s`,
              animation: `nbSlide 0.5s cubic-bezier(0.34,1.2,0.64,1) var(--del,0s) both`,
            }}>
              <div style={{
                fontFamily: "'Caveat', cursive", fontSize: 34, fontWeight: 700, width: 44,
                color: i === 0 ? accent : 'rgba(255,255,255,0.18)',
              }}>#{i + 1}</div>
              <div style={{ width: 14, height: 44, borderRadius: 7, background: tm.color, flexShrink: 0 }} />
              <span style={{ fontSize: 32, lineHeight: 1 }}>{qqGetAvatar(tm.avatarId).emoji}</span>
              <div style={{ fontFamily: "'Caveat', cursive", fontSize: 'clamp(24px, 3vw, 38px)', fontWeight: 700, color: '#fff', flex: 1 }}>
                {tm.name}
                {i === 0 && <span style={{ marginLeft: 8 }}>⭐</span>}
              </div>
              <div style={{ fontFamily: "'Caveat', cursive", fontSize: 22, color: i === 0 ? accent : 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
                {tm.largestConnected} {bt.gameOver.connected[lang]}
              </div>
              <div style={{ fontFamily: "'Caveat', cursive", fontSize: 18, color: '#475569', fontWeight: 600, minWidth: 80, textAlign: 'right' }}>
                {tm.totalCells} {bt.gameOver.total[lang]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: final grid */}
      <div style={{ width: 480, flexShrink: 0, padding: '28px 28px 28px 16px', display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center', position: 'relative', zIndex: 5 }}>
        {winner && (
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 72, lineHeight: 1, animation: 'winnerPulse 2s ease-in-out infinite, celebShake 0.6s ease 0.3s both' }}>
              {qqGetAvatar(winner.avatarId).emoji}
            </div>
            <div style={{ fontWeight: 900, fontSize: 22, color: winner.color, marginTop: 6, textShadow: `0 0 20px ${winner.color}44` }}>
              {winner.name}
            </div>
          </div>
        )}
        <GridDisplay state={s} maxSize={440} showJoker={false} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

export function BeamerTimer({ endsAt, durationSec, accent }: { endsAt: number; durationSec: number; accent: string }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, (endsAt - Date.now()) / 1000));
  const urgent = remaining <= 5;
  const critical = remaining <= 3;

  useEffect(() => {
    const iv = setInterval(() => {
      const r = Math.max(0, (endsAt - Date.now()) / 1000);
      setRemaining(r);
      if (r === 0) clearInterval(iv);
    }, 100);
    return () => clearInterval(iv);
  }, [endsAt]);

  const pct = Math.min(100, (remaining / durationSec) * 100);
  const color = urgent ? '#EF4444' : accent;
  const secs = Math.ceil(remaining);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{
        fontWeight: 900, fontSize: 'clamp(40px, 5vw, 64px)', minWidth: 70, textAlign: 'center',
        color, textShadow: urgent ? '0 0 24px rgba(239,68,68,0.6)' : `0 0 16px ${color}44`,
        fontVariantNumeric: 'tabular-nums',
        animation: critical && secs > 0 ? 'timerUrgent 0.5s ease-in-out infinite' : undefined,
      }}>
        {secs}
      </div>
      <div style={{ width: 200, height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 6, background: color,
          width: `${pct}%`, transition: 'width 0.1s linear',
          boxShadow: `0 0 12px ${color}88`,
        }} />
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

  // Track newly placed cells for pop animation (#5)
  const prevGridRef = useRef<string>('');
  const newCellsRef = useRef<Set<string>>(new Set());
  const gridKey = s.grid.flatMap(row => row.map(c => `${c.ownerId ?? ''}`)).join(',');
  if (gridKey !== prevGridRef.current) {
    const newSet = new Set<string>();
    s.grid.forEach((row, r) => row.forEach((cell, c) => {
      const prevOwner = prevGridRef.current.split(',')[(r * s.gridSize) + c];
      if (cell.ownerId && prevOwner === '') newSet.add(`${r}-${c}`);
    }));
    newCellsRef.current = newSet;
    prevGridRef.current = gridKey;
    // Clear new-cell markers after animation completes
    if (newSet.size > 0) setTimeout(() => { newCellsRef.current = new Set(); }, 1200);
  }

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        {s.gridSize}×{s.gridSize} {bt.grid.label[lang]}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${s.gridSize}, ${cellSize}px)`,
        gap,
        background: 'rgba(255,255,255,0.03)',
        padding: 8, borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        {s.grid.flatMap((row, r) =>
          row.map((cell, c) => {
            const team = s.teams.find(t => t.id === cell.ownerId);
            const isHighlighted = highlightTeam && team?.id === highlightTeam;
            const isNew = newCellsRef.current.has(`${r}-${c}`);
            const isFlash = flashCellKey === `${r}-${c}`;
            const isAccent = isNew || isFlash;
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
              }}>
                {/* Empty cell base */}
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: cellRadius,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }} />
                {/* Team color layer — ink fill for new cells */}
                {team && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: cellRadius,
                    background: isStuck
                      ? `linear-gradient(135deg, ${team.color}ff, ${team.color}bb)`
                      : `linear-gradient(135deg, ${team.color}${isHighlighted || isAccent ? 'ff' : '99'}, ${team.color}${isHighlighted || isAccent ? 'cc' : '66'})`,
                    border: isStuck
                      ? '2px solid rgba(251,191,36,0.95)'
                      : showStar
                        ? '2px solid rgba(251,191,36,0.9)'
                        : isFrozen
                          ? '2px solid rgba(147,210,255,0.9)'
                          : `1px solid ${team.color}${isHighlighted || isAccent ? 'ff' : '55'}`,
                    animation: isNew ? 'cellInkFill 0.9s cubic-bezier(0.22,1,0.36,1) both' : undefined,
                    boxShadow: isStuck
                      ? `0 0 14px rgba(251,191,36,0.7), 0 0 6px rgba(251,191,36,0.4)`
                      : isAccent
                        ? `0 0 ${isFlash ? 28 : 24}px ${team.color}bb`
                        : showStar
                          ? '0 0 10px rgba(251,191,36,0.5)'
                          : isFrozen
                            ? `0 0 10px rgba(147,210,255,0.5)`
                            : isHighlighted
                              ? `0 0 12px ${team.color}66`
                              : 'none',
                    transition: 'box-shadow 0.4s ease',
                  }} />
                )}
                {/* Frozen overlay — ice tint */}
                {isFrozen && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: cellRadius,
                    background: 'rgba(147,210,255,0.18)',
                    pointerEvents: 'none', zIndex: 1,
                  }} />
                )}
                {/* Stuck overlay — golden shimmer */}
                {isStuck && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: cellRadius,
                    background: 'linear-gradient(135deg, rgba(251,191,36,0.22), rgba(251,191,36,0.08))',
                    pointerEvents: 'none', zIndex: 1,
                  }} />
                )}
                {/* Shockwave rings on new cells */}
                {isNew && (
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
                {isNew && [0, 1, 2, 3, 4, 5].map(i => {
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
                  position: 'relative', zIndex: 2,
                  animation: isNew ? 'cellEmojiDrop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both' : undefined,
                  fontSize: (isFrozen || isStuck) ? Math.max(8, cellSize * 0.52) : undefined,
                }}>
                  {isStuck ? '📌' : isFrozen ? '❄️' : showStar ? '⭐' : (team && qqGetAvatar(team.avatarId).emoji)}
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

export function ScoreBar({ teams }: { teams: QQStateUpdate['teams'] }) {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sorted.map((t, i) => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          animation: poppedIds.has(t.id) ? 'scorePop 0.5s ease both' : undefined,
        }}>
          <span style={{ fontSize: 22, width: 30, textAlign: 'center', lineHeight: 1 }}>{qqGetAvatar(t.avatarId).emoji}</span>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: t.color }}>{t.name}</span>
              <span style={{ fontSize: 16, color: '#64748b', fontWeight: 700 }}>
                {t.largestConnected}<span style={{ opacity: 0.5 }}> / {t.totalCells}</span>
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4,
                background: `linear-gradient(90deg, ${t.color}cc, ${t.color})`,
                width: `${Math.min(100, (t.largestConnected / maxCells) * 100)}%`,
                transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: i === 0 ? `0 0 8px ${t.color}66` : 'none',
              }} />
            </div>
            {/* Float +N */}
            {floaters.filter(f => f.teamId === t.id).map(f => (
              <div key={f.id} style={{
                position: 'absolute', right: 0, top: -4,
                fontWeight: 900, fontSize: 18, color: t.color,
                animation: 'scoreFloat 1.0s ease-out both',
                pointerEvents: 'none',
                textShadow: `0 0 8px ${t.color}66`,
              }}>+{f.diff}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Fireflies() {
  return (
    <>
      {FF.map((f, i) => (
        <div key={i} style={{
          position: 'absolute', pointerEvents: 'none', zIndex: 2,
          left: `${f.x}%`, top: `${f.y}%`,
          width: 5, height: 5, borderRadius: '50%',
          background: '#FEF08A',
          boxShadow: '0 0 6px 2px rgba(254,240,138,0.7)',
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
      display: 'flex', alignItems: 'center', gap: 16, padding: '16px 22px', borderRadius: 16,
      background: bg ?? '#1B1510',
      border: `1px solid ${color}33`,
      boxShadow: `0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)`,
    }}>
      <span style={{ fontSize: 28, lineHeight: 1 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 900, color, fontSize: 17 }}>{label}</div>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 15, color: '#64748b', marginTop: 2 }}>{desc}</div>
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
