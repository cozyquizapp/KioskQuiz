import { useState, useEffect, useRef } from 'react';
import { useQQSocket } from '../hooks/useQQSocket';
import {
  QQStateUpdate, QQ_CATEGORY_LABELS, qqGetAvatar, QQCategory,
  QQQuestionImage,
} from '../../../shared/quarterQuizTypes';

// ── CSS keyframes ─────────────────────────────────────────────────────────────
const BEAMER_CSS = `
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
const CAT_BADGE_BG: Record<string, string> = {
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
const CAT_ACCENT: Record<string, string> = {
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
    if (serverLang !== 'both') return;
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

function imgAnim(anim: string, layout?: string): string | undefined {
  if (anim === 'float')    return 'imgFloat 4s ease-in-out infinite';
  if (anim === 'zoom-in')  return 'imgZoomIn 0.8s ease both';
  if (anim === 'reveal')   return 'imgReveal 1s ease both';
  if (anim === 'slide-in') return layout === 'window-left' ? 'imgSlideL 0.7s ease both' : 'imgSlideR 0.7s ease both';
  return undefined;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main page
// ═══════════════════════════════════════════════════════════════════════════════

export default function QQBeamerPage() {
  const roomCode = QQ_ROOM;
  const [joined, setJoined] = useState(false);
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

  if (!state) return <LoadingScreen roomCode={roomCode} connected={connected} />;
  return <BeamerView state={state} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Beamer view — top-level router
// ═══════════════════════════════════════════════════════════════════════════════

function BeamerView({ state: s }: { state: QQStateUpdate }) {
  const cat = s.currentQuestion?.category;
  const bg = cat ? (CAT_BG[cat] ?? '#0D0A06') : '#0D0A06';

  return (
    <div style={{
      minHeight: '100vh', width: '100vw',
      background: bg,
      fontFamily: "'Nunito', system-ui, sans-serif",
      color: '#e2e8f0', display: 'flex', flexDirection: 'column',
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

      {s.phase === 'LOBBY'           && <LobbyView state={s} />}
      {s.phase === 'PHASE_INTRO'     && <PhaseIntroView state={s} />}
      {(s.phase === 'QUESTION_ACTIVE' || s.phase === 'QUESTION_REVEAL') && (
        <QuestionView key={s.currentQuestion?.id} state={s} revealed={s.phase === 'QUESTION_REVEAL'} />
      )}
      {s.phase === 'PLACEMENT'       && <PlacementView state={s} />}
      {s.phase === 'COMEBACK_CHOICE' && <ComebackView state={s} />}
      {s.phase === 'GAME_OVER'       && <GameOverView state={s} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOBBY
// ═══════════════════════════════════════════════════════════════════════════════

function LobbyView({ state: s }: { state: QQStateUpdate }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 40 }}>
      {/* Decorative fireflies */}
      <Fireflies />

      {/* Title */}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 5 }}>
        <div style={{
          fontFamily: "'Caveat', cursive", fontSize: 'clamp(18px, 2.2vw, 28px)',
          color: 'rgba(234,179,8,0.55)', marginBottom: 8, letterSpacing: '0.06em',
        }}>
          Quartier Quiz · Quarter Quiz
        </div>
        <div style={{
          fontFamily: "'Nunito', sans-serif",
          fontSize: 'clamp(52px, 8vw, 108px)', fontWeight: 900, lineHeight: 1,
          background: 'linear-gradient(135deg, #e2e8f0 40%, #94a3b8)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em',
        }}>
          Quarter Quiz
        </div>
        <div style={{ marginTop: 16, fontSize: 20, color: '#475569', fontWeight: 700 }}>
          Raum: <span style={{ color: '#e2e8f0', fontWeight: 900, letterSpacing: '0.06em' }}>{s.roomCode}</span>
        </div>
      </div>

      {/* Teams */}
      {s.teams.length === 0 ? (
        <div style={{ color: '#334155', fontSize: 18, fontWeight: 700, position: 'relative', zIndex: 5 }}>
          Warte auf Teams…
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', position: 'relative', zIndex: 5 }}>
          {s.teams.map(t => (
            <div key={t.id} style={{
              padding: '20px 28px', borderRadius: 22,
              background: '#1B1510',
              border: `2px solid ${t.color}55`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 24px ${t.color}22, inset 0 1px 0 rgba(255,255,255,0.04)`,
              textAlign: 'center', minWidth: 140,
            }}>
              <div style={{ fontSize: 52, marginBottom: 8, lineHeight: 1 }}>{qqGetAvatar(t.avatarId).emoji}</div>
              <div style={{ fontWeight: 900, fontSize: 20, color: t.color }}>{t.name}</div>
              <div style={{
                fontSize: 12, marginTop: 6, fontWeight: 700,
                color: t.connected ? '#22C55E' : '#475569',
              }}>
                {t.connected ? '● verbunden' : '○ wartend'}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ color: '#1e293b', fontSize: 15, fontWeight: 700, position: 'relative', zIndex: 5 }}>
        {s.teams.length < 2 ? 'Mindestens 2 Teams benötigt' : 'Moderator startet das Spiel'}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE INTRO
// ═══════════════════════════════════════════════════════════════════════════════

function PhaseIntroView({ state: s }: { state: QQStateUpdate }) {
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

function QuestionView({ state: s, revealed }: { state: QQStateUpdate; revealed: boolean }) {
  const q = s.currentQuestion;
  if (!q) return null;
  const cat = q.category as QQCategory;
  const catLabel = QQ_CATEGORY_LABELS[cat];
  const accent = CAT_ACCENT[cat] ?? '#e2e8f0';
  const badgeBg = CAT_BADGE_BG[cat] ?? '#374151';
  const glow = CAT_GLOW[cat] ?? 'transparent';
  const cutouts = CAT_CUTOUTS[cat] ?? [];
  const img = q.image;
  const hasImg = img && img.layout !== 'none' && img.url;
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
            animation: imgAnim(img.animation),
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
            filter: 'drop-shadow(0 16px 40px rgba(0,0,0,0.6))',
            animation: imgAnim(img.animation, 'cutout'),
          }}
        />
      )}
      {/* Cutout emojis */}
      {cutouts.map((c, i) => (
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

          {/* Correct team */}
          {revealed && s.correctTeamId && (() => {
            const team = s.teams.find(t => t.id === s.correctTeamId);
            if (!team) return null;
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, animation: 'contentReveal 0.5s ease 0.15s both' }}>
                <span style={{ fontSize: 36, lineHeight: 1 }}>{qqGetAvatar(team.avatarId).emoji}</span>
                <span style={{ fontWeight: 900, fontSize: 22, color: team.color }}>{team.name}</span>
                <span style={{ color: '#475569', fontSize: 16, fontWeight: 700 }}>antwortet richtig!</span>
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
                animation: imgAnim(img.animation, img.layout),
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
          <GridDisplay state={s} maxSize={440} />
          <ScoreBar teams={s.teams} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLACEMENT VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function PlacementView({ state: s }: { state: QQStateUpdate }) {
  const team = s.teams.find(t => t.id === s.pendingFor);

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
        <GridDisplay state={s} maxSize={600} highlightTeam={s.pendingFor} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 240 }}>
          <ScoreBar teams={s.teams} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMEBACK VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function ComebackView({ state: s }: { state: QQStateUpdate }) {
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
        <GridDisplay state={s} maxSize={440} highlightTeam={s.comebackTeamId} />
        <ScoreBar teams={s.teams} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME OVER — Notebook style
// ═══════════════════════════════════════════════════════════════════════════════

function GameOverView({ state: s }: { state: QQStateUpdate }) {
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
        <GridDisplay state={s} maxSize={440} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

function BeamerTimer({ endsAt, durationSec, accent }: { endsAt: number; durationSec: number; accent: string }) {
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

function GridDisplay({ state: s, maxSize = 320, highlightTeam }: { state: QQStateUpdate; maxSize?: number; highlightTeam?: string | null }) {
  const gap = 4;
  const cellSize = Math.floor((maxSize - (s.gridSize - 1) * gap) / s.gridSize);

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
            return (
              <div key={`${r}-${c}`} style={{
                width: cellSize, height: cellSize, borderRadius: Math.max(4, cellSize * 0.16),
                background: team
                  ? `linear-gradient(135deg, ${team.color}${isHighlighted ? 'ff' : '99'}, ${team.color}${isHighlighted ? 'cc' : '66'})`
                  : 'rgba(255,255,255,0.04)',
                border: cell.jokerFormed
                  ? '2px solid rgba(251,191,36,0.9)'
                  : team
                    ? `1px solid ${team.color}${isHighlighted ? 'ff' : '55'}`
                    : '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: Math.max(8, cellSize * 0.42),
                transition: 'all 0.35s ease',
                boxShadow: cell.jokerFormed
                  ? '0 0 10px rgba(251,191,36,0.5)'
                  : isHighlighted
                    ? `0 0 12px ${team?.color ?? '#fff'}66`
                    : 'none',
              }}>
                {cell.jokerFormed && '⭐'}
                {!cell.jokerFormed && team && qqGetAvatar(team.avatarId).emoji}
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

function ScoreBar({ teams }: { teams: QQStateUpdate['teams'] }) {
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

function Fireflies() {
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
