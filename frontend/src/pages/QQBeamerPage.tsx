import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useQQSocket } from '../hooks/useQQSocket';
import {
  QQStateUpdate, QQ_CATEGORY_LABELS, qqGetAvatar, QQCategory,
  QQQuestionImage,
  QQSlideTemplates,
} from '../../../shared/quarterQuizTypes';
import { CustomSlide } from '../components/QQCustomSlide';

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? '/api';

// ── CSS keyframes ─────────────────────────────────────────────────────────────
export const BEAMER_CSS = `
  @keyframes cfloat  { 0%,100%{transform:translateY(0) rotate(var(--r,0deg))} 50%{transform:translateY(-12px) rotate(var(--r,0deg))} }
  @keyframes cfloata { 0%,100%{transform:translateY(0) rotate(var(--r,0deg))} 50%{transform:translateY(10px)  rotate(var(--r,0deg))} }
  @keyframes ffmove {
    0%{transform:translate(0,0) scale(1);opacity:0}
    10%{opacity:0.85}
    45%{transform:translate(var(--dx,40px),var(--dy,-50px)) scale(1.3);opacity:0.6}
    90%{opacity:0.3}
    100%{transform:translate(calc(var(--dx,40px)*1.6),calc(var(--dy,-50px)*1.6)) scale(0.6);opacity:0}
  }
  @keyframes introBadgePop { from{opacity:0;transform:scale(0.45) translateY(48px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes introFadeOut  { to{opacity:0;pointer-events:none} }
  @keyframes contentReveal { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes floatNum { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-16px)} }
  @keyframes phasePop { from{opacity:0;transform:scale(0.6) translateY(40px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes phaseLineGrow { from{transform:scaleX(0)} to{transform:scaleX(1)} }
  @keyframes nbSlide { from{opacity:0;transform:translateX(-28px)} to{opacity:1;transform:translateX(0)} }
  @keyframes winnerPulse { 0%,100%{opacity:0.85;transform:scale(1)} 50%{opacity:1;transform:scale(1.04)} }
  @keyframes qqGlow { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.2)} }
  @keyframes gridCellIn { from{opacity:0;transform:scale(0.5)} to{opacity:1;transform:scale(1)} }
  @keyframes cellPlacedRing { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.5);opacity:0} }
  @keyframes toastUp { from{opacity:0;transform:translateY(16px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes imgFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
  @keyframes imgZoomIn { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
  @keyframes imgReveal { from{clip-path:inset(0 100% 0 0)} to{clip-path:inset(0 0 0 0)} }
  @keyframes imgSlideL { from{opacity:0;transform:translateX(-60px)} to{opacity:1;transform:translateX(0)} }
  @keyframes imgSlideR { from{opacity:0;transform:translateX(60px)} to{opacity:1;transform:translateX(0)} }
  @keyframes langFadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
`;

// ── Category themes ───────────────────────────────────────────────────────────
const CAT_BG: Record<string, string> = {
  SCHAETZCHEN:   ['radial-gradient(ellipse at 18% 68%, rgba(133,77,14,0.42) 0%, transparent 55%)','radial-gradient(ellipse at 80% 20%, rgba(234,179,8,0.13) 0%, transparent 52%)','#0D0A06'].join(','),
  MUCHO:         ['radial-gradient(ellipse at 70% 28%, rgba(29,78,216,0.28) 0%, transparent 55%)','radial-gradient(ellipse at 20% 78%, rgba(59,130,246,0.10) 0%, transparent 50%)','#0D0A06'].join(','),
  BUNTE_TUETE:   ['radial-gradient(ellipse at 50% 55%, rgba(185,28,28,0.25) 0%, transparent 58%)','radial-gradient(ellipse at 14% 18%, rgba(220,38,38,0.11) 0%, transparent 45%)','#0D0A06'].join(','),
  ZEHN_VON_ZEHN: ['repeating-linear-gradient(transparent, transparent 39px, rgba(52,211,153,0.03) 39px, rgba(52,211,153,0.03) 40px)','radial-gradient(ellipse at 28% 42%, rgba(6,78,59,0.32) 0%, transparent 55%)','#0D0A06'].join(','),
  CHEESE:        ['radial-gradient(ellipse at 30% 40%, rgba(91,33,182,0.30) 0%, transparent 55%)','radial-gradient(ellipse at 80% 72%, rgba(139,92,246,0.12) 0%, transparent 50%)','#0D0A06'].join(','),
};
export const CAT_BADGE_BG: Record<string, string> = {
  SCHAETZCHEN:   'linear-gradient(135deg, #A16207, #EAB308)',
  MUCHO:         'linear-gradient(135deg, #1E3A8A, #2563EB)',
  BUNTE_TUETE:   'linear-gradient(135deg, #991B1B, #DC2626)',
  ZEHN_VON_ZEHN: 'linear-gradient(135deg, #065F46, #059669)',
  CHEESE:        'linear-gradient(135deg, #4C1D95, #7C3AED)',
};
const CAT_GLOW: Record<string, string> = {
  SCHAETZCHEN:   'rgba(234,179,8,0.45)',
  MUCHO:         'rgba(37,99,235,0.45)',
  BUNTE_TUETE:   'rgba(220,38,38,0.45)',
  ZEHN_VON_ZEHN: 'rgba(5,150,105,0.42)',
  CHEESE:        'rgba(124,58,237,0.45)',
};
export const CAT_ACCENT: Record<string, string> = {
  SCHAETZCHEN:   '#EAB308',
  MUCHO:         '#60A5FA',
  BUNTE_TUETE:   '#F87171',
  ZEHN_VON_ZEHN: '#34D399',
  CHEESE:        '#A78BFA',
};
interface CutoutSpec { emoji: string; top?: string; bottom?: string; left?: string; right?: string; size: number; rot: number; alt?: boolean }
const CAT_CUTOUTS: Record<string, CutoutSpec[]> = {
  SCHAETZCHEN:   [{ emoji:'🍯', top:'6%',  right:'11%', size:80, rot:-12 },{ emoji:'✨', bottom:'14%', left:'7%',  size:50, rot:8  },{ emoji:'💛', top:'30%', right:'5%',  size:40, rot:16, alt:true }],
  MUCHO:         [{ emoji:'🎵', top:'8%',  right:'13%', size:76, rot:-8  },{ emoji:'🎶', bottom:'18%', left:'6%',  size:54, rot:12 },{ emoji:'🎸', top:'38%', right:'6%',  size:44, rot:-14, alt:true }],
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
function actionVerb(a: string | null) {
  if (a === 'STEAL_1') return '⚡ Klauen';
  if (a === 'COMEBACK') return '⚡ Comeback';
  return '📍 Setzen';
}
function actionDesc(a: string | null, stats: any) {
  if (a === 'PLACE_1') return '1 Feld wählen';
  if (a === 'PLACE_2') return `2 Felder wählen (${stats?.placementsLeft ?? 2} übrig)`;
  if (a === 'STEAL_1') return '1 fremdes Feld klauen';
  if (a === 'FREE')    return 'Setzen oder Klauen';
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

  useEffect(() => {
    if (!connected || joined) return;
    emit('qq:joinBeamer', { roomCode }).then(ack => { if (ack.ok) setJoined(true); });
  }, [connected]);

  // Inject Caveat font
  useEffect(() => {
    const id = 'qq-caveat-font';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id; link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&display=swap';
    document.head.appendChild(link);
  }, []);

  // Fetch slide templates when draftId becomes available
  useEffect(() => {
    const draftId = state?.draftId;
    if (!draftId || fetchedDraftId.current === draftId) return;
    fetchedDraftId.current = draftId;
    fetch(`${API_BASE}/qq/drafts/${encodeURIComponent(draftId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(draft => {
        if (draft?.slideTemplates) setSlideTemplates(draft.slideTemplates);
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

  // ── Placement cell flash: when PLACEMENT→QUESTION_REVEAL, keep showing
  // PlacementView briefly with the just-placed cell highlighted (#2)
  const prevPhaseRef = useRef(s.phase);
  const [placementFlash, setPlacementFlash] = useState<{ cell: { row: number; col: number; teamId: string }; state: QQStateUpdate } | null>(null);

  useEffect(() => {
    if (prevPhaseRef.current === 'PLACEMENT' && s.phase === 'QUESTION_REVEAL' && s.lastPlacedCell) {
      setPlacementFlash({ cell: s.lastPlacedCell, state: s });
      const t = setTimeout(() => setPlacementFlash(null), 1800);
      prevPhaseRef.current = s.phase;
      return () => clearTimeout(t);
    }
    prevPhaseRef.current = s.phase;
  }, [s.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve slide template type for current phase
  const templateType = resolveTemplateType(s);
  const activeTemplate = templateType ? slideTemplates[templateType] : undefined;

  return (
    <div style={{
      minHeight: '100vh', width: '100vw',
      background: activeTemplate ? (activeTemplate.background || bg) : bg,
      fontFamily: "'Nunito', system-ui, sans-serif",
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

      {activeTemplate ? (
        /* Custom template: render only Fireflies + CustomSlide (no overlayOnly — ph_* positions apply) */
        <>
          <Fireflies />
          <div style={{ position: 'absolute', inset: 0 }}>
            <CustomSlide template={activeTemplate} state={s} />
          </div>
        </>
      ) : (
        /* No template: built-in views */
        <>
          {s.phase === 'LOBBY'           && <LobbyView state={s} />}
          {s.phase === 'PHASE_INTRO'     && <PhaseIntroView state={s} />}
          {(s.phase === 'QUESTION_ACTIVE' || s.phase === 'QUESTION_REVEAL') && !placementFlash && (
            <QuestionView key={s.currentQuestion?.id} state={s} revealed={s.phase === 'QUESTION_REVEAL'} hideCutouts={false} />
          )}
          {/* Placement flash: briefly keep PlacementView after cell placed, then reveal */}
          {placementFlash && (
            <PlacementView state={placementFlash.state} flashCell={placementFlash.cell} />
          )}
          {s.phase === 'PLACEMENT' && !placementFlash && <PlacementView state={s} />}
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
// LOBBY
// ═══════════════════════════════════════════════════════════════════════════════

export function LobbyView({ state: s }: { state: QQStateUpdate }) {
  const joinUrl = `${window.location.origin}/quarterquiz-team`;
  const [de, setDe] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setDe(p => !p), 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'stretch', padding: '40px 48px', gap: 40, position: 'relative' }}>
      <Fireflies />

      {/* Left: title + teams */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 32, position: 'relative', zIndex: 5 }}>
        <div>
          <div style={{
            fontFamily: "'Nunito', sans-serif",
            fontSize: 'clamp(44px, 7vw, 96px)', fontWeight: 900, lineHeight: 1,
            background: 'linear-gradient(135deg, #e2e8f0 40%, #94a3b8)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
            transition: 'opacity 0.4s',
          }}>
            {de ? 'Quartier Quiz' : 'Quarter Quiz'}
          </div>
        </div>

        {/* Teams */}
        {s.teams.length === 0 ? (
          <div style={{ color: '#334155', fontSize: 18, fontWeight: 700 }}>
            {de ? 'Warte auf alle Teams…' : 'Waiting for all teams…'}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {s.teams.map(t => (
              <div key={t.id} style={{
                padding: '16px 22px', borderRadius: 20,
                background: '#1B1510',
                border: `2px solid ${t.color}55`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 24px ${t.color}22, inset 0 1px 0 rgba(255,255,255,0.04)`,
                textAlign: 'center', minWidth: 120,
              }}>
                <div style={{ fontSize: 44, marginBottom: 6, lineHeight: 1 }}>{qqGetAvatar(t.avatarId).emoji}</div>
                <div style={{ fontWeight: 900, fontSize: 18, color: t.color }}>{t.name}</div>
                <div style={{ fontSize: 11, marginTop: 4, fontWeight: 700, color: t.connected ? '#22C55E' : '#475569' }}>
                  {t.connected ? (de ? '● verbunden' : '● connected') : (de ? '○ wartend' : '○ waiting')}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ color: '#1e293b', fontSize: 14, fontWeight: 700 }}>
          {s.teams.length < 2
            ? (de ? 'Mindestens 2 Teams benötigt' : 'At least 2 teams needed')
            : (de ? 'Moderator startet das Spiel' : 'Moderator starts the game')}
        </div>
      </div>

      {/* Right: QR code */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 18, position: 'relative', zIndex: 5, flexShrink: 0,
      }}>
        <div style={{
          background: '#ffffff', borderRadius: 20, padding: 20,
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        }}>
          <QRCodeSVG value={joinUrl} size={200} bgColor="#ffffff" fgColor="#0D0A06" level="M" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>{de ? 'Jetzt mitspielen' : 'Join now'}</div>
          <div style={{
            fontSize: 13, color: '#475569', fontFamily: 'monospace',
            background: '#1B1510', padding: '6px 14px', borderRadius: 8,
          }}>
            {joinUrl.replace('https://', '').replace('http://', '')}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE INTRO
// ═══════════════════════════════════════════════════════════════════════════════

export function PhaseIntroView({ state: s }: { state: QQStateUpdate }) {
  const phaseColors = ['#3B82F6', '#F59E0B', '#EF4444'];
  const color = phaseColors[(s.gamePhaseIndex - 1) % 3];
  const phaseNames: Record<number, string> = { 1: 'Runde 1', 2: 'Runde 2', 3: 'Finale' };
  const phaseDescs: Record<number, string> = { 1: 'Felder besetzen', 2: 'Setzen oder Klauen', 3: 'Alles aufs Spiel' };

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <Fireflies />

      {/* Phase number large */}
      <div style={{
        fontFamily: "'Caveat', cursive",
        fontSize: 'clamp(16px, 1.8vw, 22px)',
        color: `${color}99`, fontWeight: 700,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        marginBottom: 8,
        animation: 'phasePop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s both',
        position: 'relative', zIndex: 5,
      }}>Phase {s.gamePhaseIndex} von {s.totalPhases}</div>

      <div style={{
        fontFamily: "'Nunito', sans-serif",
        fontSize: 'clamp(64px, 12vw, 156px)', fontWeight: 900, lineHeight: 0.95,
        color,
        textShadow: `0 0 80px ${color}44, 0 8px 0 ${color}33`,
        animation: 'phasePop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.2s both, floatNum 3.5s ease-in-out 1s infinite',
        position: 'relative', zIndex: 5,
      }}>
        {phaseNames[s.gamePhaseIndex]}
      </div>

      {/* Animated underline */}
      <div style={{
        width: 'clamp(200px, 28vw, 380px)', height: 4, borderRadius: 2,
        background: color, marginTop: 20, marginBottom: 20,
        transformOrigin: 'center',
        animation: 'phaseLineGrow 0.6s cubic-bezier(0.34,1.2,0.64,1) 0.5s both',
        position: 'relative', zIndex: 5,
      }} />

      <div style={{
        fontFamily: "'Caveat', cursive",
        fontSize: 'clamp(22px, 3vw, 40px)', fontWeight: 700,
        color: `${color}88`,
        animation: 'phasePop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.6s both',
        position: 'relative', zIndex: 5,
      }}>
        {phaseDescs[s.gamePhaseIndex]}
      </div>

      {/* Mini grid preview */}
      <div style={{ marginTop: 48, opacity: 0.5, position: 'relative', zIndex: 5, animation: 'contentReveal 0.6s ease 0.9s both' }}>
        <MiniGrid state={s} size={110} />
      </div>

      {/* Score chips */}
      {s.teams.length > 0 && (
        <div style={{
          display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center',
          position: 'relative', zIndex: 5,
          animation: 'contentReveal 0.6s ease 1.1s both',
        }}>
          {[...s.teams].sort((a, b) => b.largestConnected - a.largestConnected).map(t => (
            <div key={t.id} style={{
              padding: '8px 18px', borderRadius: 50,
              border: `2px solid ${t.color}66`,
              background: `${t.color}18`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 20 }}>{qqGetAvatar(t.avatarId).emoji}</span>
              <span style={{ fontWeight: 800, color: t.color, fontSize: 14 }}>{t.name}</span>
              <span style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>{t.largestConnected} Felder</span>
            </div>
          ))}
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
  const img = q.image;
  // For CHEESE (Picture This): show image even with layout='none' — it's the main visual
  const isCheese = cat === 'CHEESE';
  const hasImg = img && img.url && (isCheese || img.layout !== 'none');
  const lang = useLangFlip(s.language);

  // Intro overlay only during QUESTION_ACTIVE (first mount via key=q.id)
  const showIntro = !revealed;

  return (
    <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
      {/* Fullscreen background image */}
      {hasImg && img.layout === 'fullscreen' && (
        <>
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            backgroundImage: `url(${img.url})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            animation: imgAnim(img.animation, undefined, img.animDelay, img.animDuration),
            transform: `translate(${img.offsetX ?? 0}%, ${img.offsetY ?? 0}%) scale(${img.scale ?? 1}) rotate(${img.rotation ?? 0}deg)`,
            opacity: img.opacity ?? 1,
            filter: imgFilter(img),
          }} />
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2,
            background: 'linear-gradient(90deg, rgba(13,10,6,0.88) 0%, rgba(13,10,6,0.6) 50%, rgba(13,10,6,0.3) 100%)',
          }} />
        </>
      )}

      {/* Cutout floating image (bg-removed) */}
      {hasImg && img.layout === 'cutout' && (
        <img
          src={img.bgRemovedUrl || img.url}
          alt=""
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
      {!hideCutouts && cutouts.map((c, i) => (
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

      {/* Intro overlay — CSS-animated, fades out after 2s */}
      {showIntro && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
          background: `radial-gradient(ellipse at center, ${glow.replace('0.45', '0.55')} 0%, rgba(13,10,6,0.95) 65%)`,
          animation: 'introFadeOut 0.5s ease 2s forwards',
        }}>
          <div style={{
            padding: '14px 32px', borderRadius: 999,
            background: badgeBg,
            boxShadow: `0 0 48px ${glow}, 0 4px 16px rgba(0,0,0,0.5)`,
            fontSize: 'clamp(24px, 5vw, 60px)', fontWeight: 900,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff',
            animation: 'introBadgePop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.1s both',
          }}>
            {catLabel.emoji} {lang === 'en' ? catLabel.en : catLabel.de}
          </div>
          <div style={{
            fontFamily: "'Caveat', cursive",
            fontSize: 'clamp(18px, 2.5vw, 32px)', color: `${accent}88`, fontWeight: 700,
            animation: 'introBadgePop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.4s both',
          }}>
            Frage {(s.questionIndex % 5) + 1} von 5
          </div>
        </div>
      )}

      {/* Main content — revealed after intro */}
      <div style={{
        flex: 1, display: 'flex', gap: 0,
        flexDirection: hasImg && img.layout === 'window-left' ? 'row-reverse' : 'row',
        animation: showIntro ? 'contentReveal 0.6s ease 2.2s both' : 'contentReveal 0.35s ease both',
      }}>
        {/* ── Left: question ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '36px 44px', justifyContent: 'center', position: 'relative', zIndex: 5 }}>

          {/* Category badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '8px 22px', borderRadius: 999,
              background: badgeBg,
              boxShadow: `0 0 28px ${glow}, 0 4px 10px rgba(0,0,0,0.4)`,
              fontSize: 13, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff',
            }}>
              <span style={{ fontSize: 16 }}>{catLabel.emoji}</span>
              <span key={lang} style={{ animation: 'langFadeIn 0.4s ease both' }}>{lang === 'en' ? catLabel.en : catLabel.de}</span>
            </div>
            {s.language === 'both' && (
              <span key={`lang-pill-${lang}`} style={{
                padding: '4px 12px', borderRadius: 999,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.5)',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                animation: 'langFadeIn 0.4s ease both',
              }}>
                {lang === 'en' ? '🇬🇧 EN' : '🇩🇪 DE'}
              </span>
            )}
          </div>

          {/* Counter + timer row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
            <div style={{
              fontFamily: "'Caveat', cursive", fontSize: 18, color: 'rgba(255,255,255,0.3)',
            }}>
              Phase {s.gamePhaseIndex}/{s.totalPhases} · Frage {(s.questionIndex % 5) + 1}/5
            </div>
            {s.timerEndsAt && !revealed && (
              <BeamerTimer endsAt={s.timerEndsAt} durationSec={s.timerDurationSec} accent={accent} />
            )}
          </div>

          {/* Question card */}
          <div style={{
            background: '#1B1510',
            border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: 22,
            boxShadow: `0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)`,
            padding: '32px 40px',
            marginBottom: 20,
          }}>
            <div key={lang} style={{
              fontSize: 'clamp(26px, 3.6vw, 58px)', fontWeight: 900, lineHeight: 1.22,
              color: '#F1F5F9',
              animation: 'langFadeIn 0.4s ease both',
            }}>
              {lang === 'en' && q.textEn ? q.textEn : q.text}
            </div>
          </div>

          {/* CHEESE center-stage image — shown when not handled by existing window/fullscreen/cutout renderers */}
          {isCheese && hasImg && img && img.layout !== 'window-left' && img.layout !== 'window-right' && img.layout !== 'fullscreen' && img.layout !== 'cutout' && (
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              marginBottom: 20,
              animation: showIntro ? 'contentReveal 0.7s ease 2.3s both' : 'contentReveal 0.5s ease 0.1s both',
            }}>
              <img
                src={img.bgRemovedUrl || img.url}
                alt=""
                style={{
                  maxWidth: '55%', maxHeight: '70vh',
                  borderRadius: img.bgRemovedUrl ? 0 : 22,
                  objectFit: 'contain',
                  boxShadow: img.bgRemovedUrl
                    ? 'none'
                    : `0 16px 56px rgba(0,0,0,0.6), 0 0 40px ${glow}`,
                  filter: [
                    img.bgRemovedUrl ? 'drop-shadow(0 20px 48px rgba(0,0,0,0.7))' : '',
                    imgFilter(img) ?? '',
                  ].filter(Boolean).join(' ') || undefined,
                  animation: imgAnim(img.animation, 'center', img.animDelay, img.animDuration),
                  transform: `translate(${img.offsetX ?? 0}%, ${img.offsetY ?? 0}%) scale(${img.scale ?? 1}) rotate(${img.rotation ?? 0}deg)`,
                  opacity: img.opacity ?? 1,
                }}
              />
            </div>
          )}

          {/* MUCHO / ZEHN_VON_ZEHN option cards */}
          {q.options && (q.category === 'MUCHO' || q.category === 'ZEHN_VON_ZEHN') && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: q.category === 'MUCHO' ? '1fr 1fr' : '1fr 1fr 1fr',
              gap: 12, marginBottom: 16,
              animation: showIntro ? 'contentReveal 0.5s ease 2.5s both' : 'contentReveal 0.35s ease 0.15s both',
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
                    borderRadius: 16, padding: '16px 20px',
                    background: isCorrect ? 'rgba(34,197,94,0.2)' : '#1B1510',
                    border: isCorrect ? '3px solid #22C55E' : `2px solid ${optColor}44`,
                    boxShadow: isCorrect ? '0 0 24px rgba(34,197,94,0.3)' : `0 4px 16px rgba(0,0,0,0.3)`,
                    display: 'flex', alignItems: 'center', gap: 14,
                    minHeight: optImg?.url ? 90 : 60,
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
                      width: 36, height: 36, borderRadius: 10,
                      background: isCorrect ? '#22C55E' : optColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 900, color: '#fff', flexShrink: 0,
                      boxShadow: `0 2px 8px ${(isCorrect ? '#22C55E' : optColor)}66`,
                    }}>{isCorrect ? '✓' : label}</div>
                    <div style={{
                      position: 'relative', zIndex: 1,
                      fontSize: 'clamp(16px, 2vw, 28px)', fontWeight: 800,
                      color: '#F1F5F9', lineHeight: 1.3,
                      textShadow: optImg?.url ? '0 2px 8px rgba(0,0,0,0.8)' : 'none',
                    }}>{optText}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Answer reveal */}
          {revealed && s.revealedAnswer && (
            <div style={{
              padding: '18px 28px', borderRadius: 18,
              background: 'rgba(34,197,94,0.08)',
              border: '2px solid rgba(34,197,94,0.35)',
              boxShadow: '0 0 32px rgba(34,197,94,0.12)',
              fontSize: 'clamp(20px, 2.6vw, 40px)', fontWeight: 900,
              color: '#4ade80', marginBottom: 14,
              animation: 'contentReveal 0.4s ease both',
            }}>
              ✓ {lang === 'en' && q.answerEn ? q.answerEn : s.revealedAnswer}
            </div>
          )}

          {/* Schätzchen: ranked answers by distance */}
          {revealed && q.category === 'SCHAETZCHEN' && q.targetValue != null && s.answers.length > 0 && (
            <div style={{ marginBottom: 14, animation: 'contentReveal 0.5s ease 0.1s both' }}>
              {[...s.answers]
                .map(a => {
                  const num = Number(a.text.replace(/[^0-9.,\-]/g, '').replace(',', '.'));
                  const team = s.teams.find(t => t.id === a.teamId);
                  return { ...a, num, distance: Number.isNaN(num) ? Infinity : Math.abs(num - q.targetValue!), team };
                })
                .sort((a, b) => a.distance - b.distance)
                .map((a, i) => (
                  <div key={a.teamId} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 16px', borderRadius: 12, marginBottom: 4,
                    background: i === 0 ? 'rgba(234,179,8,0.12)' : 'rgba(255,255,255,0.03)',
                    border: i === 0 ? '1px solid rgba(234,179,8,0.3)' : '1px solid rgba(255,255,255,0.05)',
                    animation: `contentReveal 0.4s ease ${0.15 + i * 0.1}s both`,
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 900, color: i === 0 ? '#EAB308' : '#475569', width: 24 }}>#{i + 1}</span>
                    {a.team && <span style={{ fontSize: 22, lineHeight: 1 }}>{qqGetAvatar(a.team.avatarId).emoji}</span>}
                    <span style={{ fontWeight: 800, color: a.team?.color ?? '#e2e8f0', flex: 1 }}>{a.team?.name ?? a.teamId}</span>
                    <span style={{ fontSize: 'clamp(16px, 2vw, 24px)', fontWeight: 900, color: '#e2e8f0' }}>{a.text}</span>
                    <span style={{ fontFamily: "'Caveat', cursive", fontSize: 14, color: '#64748b' }}>
                      {Number.isFinite(a.distance) ? `Δ ${a.distance.toLocaleString()}` : '—'}
                    </span>
                  </div>
                ))
              }
            </div>
          )}

          {/* MUCHO / ZEHN_VON_ZEHN: who chose which option */}
          {revealed && s.answers.length > 0 && (q.category === 'MUCHO' || q.category === 'ZEHN_VON_ZEHN') && q.options && (
            <div style={{ marginBottom: 14, animation: 'contentReveal 0.5s ease 0.1s both' }}>
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
                    padding: '6px 14px', borderRadius: 10, marginBottom: 4,
                    background: isCorrect ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                    border: isCorrect ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.05)',
                    animation: `contentReveal 0.4s ease ${0.1 + optIdx * 0.07}s both`,
                  }}>
                    <span style={{ width: 22, height: 22, borderRadius: 6, background: optColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                      {q.category === 'MUCHO' ? ['A','B','C','D'][optIdx] : optIdx + 1}
                    </span>
                    {voters.map((t, vi) => (
                      <span key={t!.id} style={{ display: 'flex', alignItems: 'center', gap: 4, animation: `contentReveal 0.3s ease ${vi * 0.08}s both` }}>
                        <span style={{ fontSize: 18 }}>{qqGetAvatar(t!.avatarId).emoji}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: t!.color }}>{t!.name}</span>
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* CHEESE: speed-ranked text answers */}
          {revealed && s.answers.length > 0 && q.category === 'CHEESE' && (
            <div style={{ marginBottom: 14, animation: 'contentReveal 0.5s ease 0.1s both' }}>
              {[...s.answers].sort((a, b) => a.submittedAt - b.submittedAt).map((a, i) => {
                const team = s.teams.find(t => t.id === a.teamId);
                const isWinner = a.teamId === s.correctTeamId;
                return (
                  <div key={a.teamId} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '7px 14px', borderRadius: 10, marginBottom: 4,
                    background: isWinner ? 'rgba(34,197,94,0.10)' : 'rgba(255,255,255,0.03)',
                    border: isWinner ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(255,255,255,0.05)',
                    animation: `contentReveal 0.4s ease ${0.1 + i * 0.08}s both`,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#475569', width: 22 }}>#{i + 1}</span>
                    {team && <span style={{ fontSize: 20 }}>{qqGetAvatar(team.avatarId).emoji}</span>}
                    <span style={{ fontWeight: 800, color: team?.color ?? '#e2e8f0', flex: 1, fontSize: 14 }}>{team?.name}</span>
                    <span style={{ fontSize: 'clamp(13px, 1.6vw, 20px)', fontWeight: 800, color: '#e2e8f0' }}>{a.text}</span>
                    {isWinner && <span style={{ fontSize: 14, color: '#4ade80' }}>✓</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* BUNTE TÜTE — Top 5: show each team's hits vs correct list */}
          {revealed && s.answers.length > 0 && q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'top5' && (() => {
            const bt = q.bunteTuete as any;
            const correctDE: string[] = (bt.answers ?? []).map((s: string) => s.trim().toLowerCase()).filter(Boolean);
            const correctEN: string[] = (bt.answersEn ?? []).map((s: string) => s.trim().toLowerCase()).filter(Boolean);
            const allCorrect = new Set([...correctDE, ...correctEN]);
            const scored = [...s.answers].map(a => {
              const parts = a.text.split('|').map((p: string) => p.trim()).filter(Boolean);
              const hits = parts.filter((p: string) => [...allCorrect].some(c => c && (p.toLowerCase() === c || p.toLowerCase().includes(c) || c.includes(p.toLowerCase()))));
              return { ...a, parts, hits: hits.length };
            }).sort((a, b) => b.hits - a.hits || a.submittedAt - b.submittedAt);
            return (
              <div style={{ marginBottom: 14, animation: 'contentReveal 0.5s ease 0.1s both' }}>
                {scored.map((a, i) => {
                  const team = s.teams.find(t => t.id === a.teamId);
                  const isWinner = a.teamId === s.correctTeamId;
                  return (
                    <div key={a.teamId} style={{
                      padding: '8px 14px', borderRadius: 10, marginBottom: 5,
                      background: isWinner ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                      border: isWinner ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.05)',
                      animation: `contentReveal 0.4s ease ${0.1 + i * 0.08}s both`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 900, color: '#475569', width: 22 }}>#{i + 1}</span>
                        {team && <span style={{ fontSize: 18 }}>{qqGetAvatar(team.avatarId).emoji}</span>}
                        <span style={{ fontWeight: 800, color: team?.color ?? '#e2e8f0', flex: 1, fontSize: 14 }}>{team?.name}</span>
                        <span style={{ fontSize: 14, fontWeight: 900, color: isWinner ? '#4ade80' : '#475569' }}>{a.hits}/{correctDE.length || 5} Treffer</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 32 }}>
                        {a.parts.map((p: string, pi: number) => {
                          const hit = [...allCorrect].some(c => c && (p.toLowerCase() === c || p.toLowerCase().includes(c) || c.includes(p.toLowerCase())));
                          return (
                            <span key={pi} style={{ padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: hit ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)', color: hit ? '#4ade80' : '#64748b', border: hit ? '1px solid rgba(34,197,94,0.3)' : '1px solid transparent' }}>
                              {hit ? '✓ ' : ''}{p}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* BUNTE TÜTE — Fix It (order): show team ranking vs correct sequence */}
          {revealed && s.answers.length > 0 && q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'order' && (() => {
            const bt = q.bunteTuete as any;
            const items: string[] = bt.items ?? [];
            const correctOrder: number[] = bt.correctOrder ?? items.map((_: any, i: number) => i);
            const correctSeq = correctOrder.map((idx: number) => (items[idx] ?? '').trim().toLowerCase());
            const scored = [...s.answers].map(a => {
              const parts = a.text.split('|').map((p: string) => p.trim().toLowerCase()).filter(Boolean);
              const score = parts.filter((p: string, i: number) => p === correctSeq[i]).length;
              return { ...a, parts, score };
            }).sort((a, b) => b.score - a.score || a.submittedAt - b.submittedAt);
            return (
              <div style={{ marginBottom: 14, animation: 'contentReveal 0.5s ease 0.1s both' }}>
                {scored.map((a, i) => {
                  const team = s.teams.find(t => t.id === a.teamId);
                  const isWinner = a.teamId === s.correctTeamId;
                  return (
                    <div key={a.teamId} style={{
                      padding: '8px 14px', borderRadius: 10, marginBottom: 5,
                      background: isWinner ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                      border: isWinner ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.05)',
                      animation: `contentReveal 0.4s ease ${0.1 + i * 0.08}s both`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 900, color: '#475569', width: 22 }}>#{i + 1}</span>
                        {team && <span style={{ fontSize: 18 }}>{qqGetAvatar(team.avatarId).emoji}</span>}
                        <span style={{ fontWeight: 800, color: team?.color ?? '#e2e8f0', flex: 1, fontSize: 14 }}>{team?.name}</span>
                        <span style={{ fontSize: 14, fontWeight: 900, color: isWinner ? '#4ade80' : '#475569' }}>{a.score}/{correctSeq.length} richtig</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 32 }}>
                        {a.parts.map((p: string, pi: number) => {
                          const correct = p === correctSeq[pi];
                          return (
                            <span key={pi} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: correct ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)', color: correct ? '#4ade80' : '#f87171', border: `1px solid ${correct ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.2)'}` }}>
                              <span style={{ color: '#475569', fontSize: 10 }}>{pi + 1}.</span> {p}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* BUNTE TÜTE — Pin It (map): closest to target wins, show distance */}
          {revealed && s.answers.length > 0 && q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'map' && (() => {
            const bt = q.bunteTuete as any;
            const tLat: number = bt.lat;
            const tLng: number = bt.lng;
            const scored = [...s.answers].map(a => {
              const parts = a.text.split(',');
              const lat = parseFloat(parts[0]);
              const lng = parseFloat(parts[1]);
              if (Number.isNaN(lat) || Number.isNaN(lng)) return { ...a, distKm: null };
              // Haversine distance (km)
              const R = 6371;
              const dLat = (lat - tLat) * Math.PI / 180;
              const dLng = (lng - tLng) * Math.PI / 180;
              const aa = Math.sin(dLat / 2) ** 2 + Math.cos(tLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
              const distKm = R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
              return { ...a, distKm };
            }).sort((a, b) => {
              if (a.distKm === null) return 1;
              if (b.distKm === null) return -1;
              return a.distKm - b.distKm;
            });
            return (
              <div style={{ marginBottom: 14, animation: 'contentReveal 0.5s ease 0.1s both' }}>
                {scored.map((a, i) => {
                  const team = s.teams.find(t => t.id === a.teamId);
                  const isWinner = a.teamId === s.correctTeamId;
                  const distStr = a.distKm === null ? '—' : a.distKm < 1 ? `${Math.round(a.distKm * 1000)} m` : `${a.distKm.toFixed(1)} km`;
                  return (
                    <div key={a.teamId} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '7px 14px', borderRadius: 10, marginBottom: 4,
                      background: isWinner ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                      border: isWinner ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.05)',
                      animation: `contentReveal 0.4s ease ${0.1 + i * 0.08}s both`,
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 900, color: i === 0 ? '#60A5FA' : '#475569', width: 22 }}>#{i + 1}</span>
                      {team && <span style={{ fontSize: 20 }}>{qqGetAvatar(team.avatarId).emoji}</span>}
                      <span style={{ fontWeight: 800, color: team?.color ?? '#e2e8f0', flex: 1, fontSize: 14 }}>{team?.name}</span>
                      <span style={{ fontFamily: "'Caveat', cursive", fontSize: 16, color: isWinner ? '#4ade80' : '#64748b' }}>📍 {distStr}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Correct team */}
          {revealed && s.correctTeamId && (() => {
            const team = s.teams.find(t => t.id === s.correctTeamId);
            if (!team) return null;
            const cat = q.category;
            const isEn = lang === 'en';
            const winMsg = cat === 'SCHAETZCHEN'
              ? (isEn ? 'was closest!' : 'war am nächsten dran!')
              : cat === 'CHEESE'
                ? (isEn ? 'got it right!' : 'hat es erkannt!')
                : cat === 'BUNTE_TUETE'
                  ? (isEn ? 'wins this round!' : 'gewinnt die Runde!')
                  : (isEn ? 'answered correctly!' : 'antwortet richtig!');
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, animation: 'contentReveal 0.5s ease 0.15s both' }}>
                <span style={{ fontSize: 36, lineHeight: 1 }}>{qqGetAvatar(team.avatarId).emoji}</span>
                <span style={{ fontWeight: 900, fontSize: 22, color: team.color }}>{team.name}</span>
                <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>{winMsg}</span>
              </div>
            );
          })()}
        </div>

        {/* ── Image window panel (window-left / window-right) ── */}
        {hasImg && (img.layout === 'window-left' || img.layout === 'window-right') && (
          <div style={{
            width: '42%', flexShrink: 0, position: 'relative', zIndex: 5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 28,
          }}>
            <img
              src={img.url}
              alt=""
              style={{
                maxWidth: '100%', maxHeight: '80vh',
                borderRadius: 22, objectFit: 'contain',
                boxShadow: `0 12px 48px rgba(0,0,0,0.6), 0 0 32px ${glow}`,
                animation: imgAnim(img.animation, img.layout, img.animDelay, img.animDuration),
                transform: `translate(${img.offsetX ?? 0}%, ${img.offsetY ?? 0}%) scale(${img.scale ?? 1}) rotate(${img.rotation ?? 0}deg)`,
                opacity: img.opacity ?? 1,
                filter: imgFilter(img),
              }}
            />
          </div>
        )}

        {/* ── Right: grid + scores ── */}
        <div style={{
          width: hasImg && (img.layout === 'window-left' || img.layout === 'window-right') ? 0 : 480,
          overflow: 'hidden',
          flexShrink: 0, padding: hasImg && (img.layout === 'window-left' || img.layout === 'window-right') ? 0 : '28px 28px 28px 16px',
          display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center',
          position: 'relative', zIndex: 5,
          transition: 'width 0.3s',
        }}>
          {/* Imposter (oneOfEight): active team + remaining statements count */}
          {!revealed && s.imposterActiveTeamId && (() => {
            const activeTeam = s.teams.find(t => t.id === s.imposterActiveTeamId);
            if (!activeTeam) return null;
            const totalStmts = (s.currentQuestion?.bunteTuete as any)?.statements?.length ?? 8;
            const remaining = totalStmts - s.imposterChosenIndices.length;
            return (
              <div style={{
                borderRadius: 16, padding: '14px 20px', textAlign: 'center',
                background: '#1B1510', border: `2px solid ${activeTeam.color}88`,
                boxShadow: `0 0 28px ${activeTeam.color}44`,
                animation: 'contentReveal 0.4s ease both',
              }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  🕵️ Imposter — wählt eine Aussage
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <span style={{ fontSize: 28 }}>{qqGetAvatar(activeTeam.avatarId).emoji}</span>
                  <span style={{ fontWeight: 900, fontSize: 20, color: activeTeam.color }}>{activeTeam.name}</span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                  {remaining} Aussage{remaining !== 1 ? 'n' : ''} übrig
                  {s.imposterEliminated.length > 0 && (
                    <span> · Raus: {s.imposterEliminated.map(id => s.teams.find(t => t.id === id)?.name).filter(Boolean).join(', ')}</span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Hot Potato: active team highlight */}
          {!revealed && s.hotPotatoActiveTeamId && (() => {
            const activeTeam = s.teams.find(t => t.id === s.hotPotatoActiveTeamId);
            if (!activeTeam) return null;
            return (
              <div style={{
                background: activeTeam.color, borderRadius: 16,
                padding: '14px 24px', textAlign: 'center',
                boxShadow: `0 0 32px ${activeTeam.color}88`,
                animation: 'imgFloat 2s ease-in-out infinite',
              }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>🥔 {activeTeam.name}</div>
                {s.hotPotatoEliminated.length > 0 && (
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                    Raus: {s.hotPotatoEliminated.map(id => s.teams.find(t => t.id === id)?.name).filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            );
          })()}
          {/* Live answer count */}
          {!revealed && s.answers.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
              background: '#1B1510', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12, padding: '8px 16px',
            }}>
              <span style={{ fontSize: 14, color: '#64748b', fontWeight: 700 }}>Antworten:</span>
              {s.teams.map(t => {
                const answered = s.answers.some(a => a.teamId === t.id);
                return (
                  <span key={t.id} style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: answered ? t.color : 'rgba(255,255,255,0.1)',
                    boxShadow: answered ? `0 0 6px ${t.color}` : 'none',
                    display: 'inline-block',
                    transition: 'all 0.3s',
                  }} />
                );
              })}
            </div>
          )}
          {revealed && <GridDisplay state={s} maxSize={440} showJoker={false} />}
          <ScoreBar teams={s.teams} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLACEMENT VIEW
// ═══════════════════════════════════════════════════════════════════════════════

export function PlacementView({ state: s, flashCell }: { state: QQStateUpdate; flashCell?: { row: number; col: number; teamId: string } | null }) {
  const team = s.teams.find(t => t.id === (flashCell?.teamId ?? s.pendingFor));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <Fireflies />

      {/* Top banner */}
      <div style={{
        padding: '20px 44px', borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', gap: 20, position: 'relative', zIndex: 5,
        background: 'rgba(13,10,6,0.6)', backdropFilter: 'blur(12px)',
      }}>
        <div style={{
          fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em',
          color: '#475569',
        }}>
          {actionVerb(s.pendingAction)}
        </div>
        {team && (
          <>
            <span style={{ fontSize: 32, lineHeight: 1 }}>{qqGetAvatar(team.avatarId).emoji}</span>
            <span style={{ fontWeight: 900, fontSize: 'clamp(20px, 2.5vw, 32px)', color: team.color }}>{team.name}</span>
            <span style={{ color: '#475569', fontSize: 14, fontWeight: 700 }}>
              {actionDesc(s.pendingAction, s.teamPhaseStats[team.id])}
            </span>
          </>
        )}
        {/* Last answer reminder */}
        {s.revealedAnswer && (
          <div style={{
            marginLeft: 'auto', padding: '6px 16px', borderRadius: 10,
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
            fontSize: 14, color: '#4ade80', fontWeight: 700,
          }}>
            ✓ {s.revealedAnswer}
          </div>
        )}
      </div>

      {/* Center: large grid + scores */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48, padding: '20px 44px', position: 'relative', zIndex: 5 }}>
        <GridDisplay state={s} maxSize={600} highlightTeam={flashCell?.teamId ?? s.pendingFor} showJoker flashCellKey={flashCell ? `${flashCell.row}-${flashCell.col}` : null} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 240 }}>
          <ScoreBar teams={s.teams} />
        </div>
      </div>

      {/* Flash: cell placed notification */}
      {flashCell && team && (
        <div style={{
          position: 'absolute', bottom: 32, left: 0, right: 0,
          zIndex: 20, pointerEvents: 'none',
          display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            background: `linear-gradient(135deg, ${team.color}28, ${team.color}14)`,
            border: `2px solid ${team.color}88`,
            borderRadius: 18, padding: '14px 32px',
            display: 'flex', alignItems: 'center', gap: 14,
            boxShadow: `0 0 40px ${team.color}33, 0 8px 24px rgba(0,0,0,0.4)`,
            backdropFilter: 'blur(16px)',
            animation: 'toastUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
          }}>
            <span style={{ fontSize: 32, lineHeight: 1 }}>{qqGetAvatar(team.avatarId).emoji}</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: team.color }}>{team.name}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
                ✓ Feld {String.fromCharCode(65 + flashCell.col)}{flashCell.row + 1} gesetzt
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMEBACK VIEW
// ═══════════════════════════════════════════════════════════════════════════════

export function ComebackView({ state: s }: { state: QQStateUpdate }) {
  const team = s.teams.find(t => t.id === s.comebackTeamId);

  return (
    <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
      <Fireflies />

      {/* Left content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '48px 44px', justifyContent: 'center', position: 'relative', zIndex: 5 }}>
        <div style={{
          fontFamily: "'Caveat', cursive",
          fontSize: 'clamp(16px, 2vw, 26px)', color: '#F59E0B', fontWeight: 700,
          marginBottom: 20, letterSpacing: '0.06em',
        }}>
          ⚡ Comeback-Chance!
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
                <ComebackOption icon="📍" label="2 Felder setzen" desc="Platziere 2 freie Felder deiner Wahl" color="#22C55E" />
                <ComebackOption icon="⚡" label="1 Feld klauen"   desc="Nimm ein fremdes Feld"                color="#EF4444" />
                <ComebackOption icon="🔄" label="2 Felder tauschen" desc="Tausche je ein Feld von zwei Gegnern" color="#8B5CF6" />
              </div>
            ) : (
              <div style={{
                padding: '22px 28px', borderRadius: 20,
                background: '#1B1510', border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                fontSize: 'clamp(20px, 2.4vw, 32px)', fontWeight: 900, color: '#e2e8f0',
              }}>
                {s.comebackAction === 'PLACE_2' && '📍 2 Felder werden gesetzt…'}
                {s.comebackAction === 'STEAL_1' && '⚡ 1 Feld wird geklaut…'}
                {s.comebackAction === 'SWAP_2'  && '🔄 Felder werden getauscht…'}
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
          Spielende! 🎉
        </div>

        {/* Rankings */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0 }}>
          {sorted.map((t, i) => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 20,
              padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
              ['--del' as string]: `${i * 0.12}s`,
              animation: `nbSlide 0.5s cubic-bezier(0.34,1.2,0.64,1) var(--del,0s) both`,
            }}>
              <div style={{
                fontFamily: "'Caveat', cursive", fontSize: 34, fontWeight: 700, width: 44,
                color: i === 0 ? '#EAB308' : 'rgba(255,255,255,0.18)',
              }}>#{i + 1}</div>
              <div style={{ width: 14, height: 44, borderRadius: 7, background: t.color, flexShrink: 0 }} />
              <span style={{ fontSize: 32, lineHeight: 1 }}>{qqGetAvatar(t.avatarId).emoji}</span>
              <div style={{ fontFamily: "'Caveat', cursive", fontSize: 'clamp(24px, 3vw, 38px)', fontWeight: 700, color: '#fff', flex: 1 }}>
                {t.name}
                {i === 0 && <span style={{ marginLeft: 8 }}>⭐</span>}
              </div>
              <div style={{ fontFamily: "'Caveat', cursive", fontSize: 22, color: i === 0 ? '#EAB308' : 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
                {t.largestConnected} verbunden
              </div>
              <div style={{ fontFamily: "'Caveat', cursive", fontSize: 18, color: '#475569', fontWeight: 600, minWidth: 80, textAlign: 'right' }}>
                {t.totalCells} gesamt
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: final grid */}
      <div style={{ width: 480, flexShrink: 0, padding: '28px 28px 28px 16px', display: 'flex', flexDirection: 'column', gap: 20, justifyContent: 'center', position: 'relative', zIndex: 5 }}>
        {winner && (
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 56, lineHeight: 1, animation: 'winnerPulse 2s ease-in-out infinite' }}>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        fontWeight: 900, fontSize: 32, minWidth: 52, textAlign: 'center',
        color, textShadow: urgent ? '0 0 20px rgba(239,68,68,0.6)' : `0 0 12px ${color}44`,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {secs}
      </div>
      <div style={{ width: 140, height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 5, background: color,
          width: `${pct}%`, transition: 'width 0.1s linear',
          boxShadow: `0 0 8px ${color}88`,
        }} />
      </div>
    </div>
  );
}

export function GridDisplay({ state: s, maxSize = 320, highlightTeam, showJoker = true, flashCellKey }: {
  state: QQStateUpdate; maxSize?: number; highlightTeam?: string | null; showJoker?: boolean; flashCellKey?: string | null;
}) {
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
    if (newSet.size > 0) setTimeout(() => { newCellsRef.current = new Set(); }, 700);
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        {s.gridSize}×{s.gridSize} Quartier
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
            const cellRadius = Math.max(4, cellSize * 0.16);
            return (
              <div key={`${r}-${c}`} style={{
                position: 'relative', overflow: 'visible',
                width: cellSize, height: cellSize, borderRadius: cellRadius,
                background: team
                  ? `linear-gradient(135deg, ${team.color}${isHighlighted || isAccent ? 'ff' : '99'}, ${team.color}${isHighlighted || isAccent ? 'cc' : '66'})`
                  : 'rgba(255,255,255,0.04)',
                border: showStar
                  ? '2px solid rgba(251,191,36,0.9)'
                  : team
                    ? `1px solid ${team.color}${isHighlighted || isAccent ? 'ff' : '55'}`
                    : '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: Math.max(8, cellSize * 0.42),
                transition: isNew
                  ? 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1), background 0.35s ease, border 0.35s ease, box-shadow 0.35s ease'
                  : 'transform 0.4s ease, background 0.35s ease, border 0.35s ease, box-shadow 0.35s ease',
                transform: isNew ? 'scale(1.2)' : 'scale(1)',
                boxShadow: isAccent
                  ? `0 0 ${isFlash ? 28 : 20}px ${team?.color ?? '#fff'}aa`
                  : showStar
                    ? '0 0 10px rgba(251,191,36,0.5)'
                    : isHighlighted
                      ? `0 0 12px ${team?.color ?? '#fff'}66`
                      : 'none',
                zIndex: isAccent ? 5 : 1,
              }}>
                {isFlash && (
                  <div style={{
                    position: 'absolute', inset: -4, borderRadius: cellRadius + 3,
                    border: `2px solid ${team?.color ?? '#fff'}88`,
                    animation: 'cellPlacedRing 0.9s ease-out 2',
                    pointerEvents: 'none',
                  }} />
                )}
                {showStar && '⭐'}
                {!showStar && team && qqGetAvatar(team.avatarId).emoji}
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sorted.map((t, i) => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22, width: 30, textAlign: 'center', lineHeight: 1 }}>{qqGetAvatar(t.avatarId).emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: t.color }}>{t.name}</span>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>
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

function ComebackOption({ icon, label, desc, color }: { icon: string; label: string; desc: string; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16, padding: '16px 22px', borderRadius: 16,
      background: '#1B1510',
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
        <div style={{ color: '#334155', marginBottom: 16, fontWeight: 700 }}>Raum: {roomCode}</div>
        <div style={{ fontSize: 13, color: connected ? '#22C55E' : '#EF4444', fontWeight: 700 }}>
          {connected ? '● Warte auf Spielzustand…' : '○ Verbinde…'}
        </div>
      </div>
    </div>
  );
}
