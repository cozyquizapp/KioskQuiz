import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  QQStateUpdate, QQ_CATEGORY_LABELS, qqGetAvatar, QQCategory,
  QQSlideTemplate, QQSlideElement, QQSlideTemplateType, QQQuestion,
} from '../../../shared/quarterQuizTypes';
import { QQ_BEAMER_CSS, QQ_CAT_BADGE_BG as CAT_BADGE_BG, QQ_CAT_ACCENT as CAT_ACCENT } from '../qqShared';

// ── CSS keyframes ─────────────────────────────────────────────────────────────
const BEAMER_CSS = QQ_BEAMER_CSS;

const SLIDE_ANIM_KEYFRAMES = `
  @keyframes csElFadeUp    { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
  @keyframes csElFadeIn    { from{opacity:0} to{opacity:1} }
  @keyframes csElPop       { from{opacity:0;transform:scale(0.6)} to{opacity:1;transform:scale(1)} }
  @keyframes csElSlideLeft { from{opacity:0;transform:translateX(-40px)} to{opacity:1;transform:translateX(0)} }
  @keyframes csElSlideRight{ from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
  @keyframes csElCardFlip  { from{opacity:0;transform:perspective(600px) rotateY(-90deg)} to{opacity:1;transform:perspective(600px) rotateY(0deg)} }
  @keyframes csElBounceIn  { 0%{opacity:0;transform:scale(0.3)} 50%{opacity:1;transform:scale(1.15)} 70%{transform:scale(0.92)} 100%{opacity:1;transform:scale(1)} }
  @keyframes csElSlotDrop  { 0%{opacity:0;transform:translateY(-60px) scaleY(0.4)} 60%{opacity:1;transform:translateY(6px) scaleY(1.05)} 80%{transform:translateY(-3px) scaleY(0.97)} 100%{opacity:1;transform:translateY(0) scaleY(1)} }
  @keyframes csElSwingIn   { 0%{opacity:0;transform:rotate(-15deg) translateX(-20px)} 60%{transform:rotate(4deg) translateX(4px)} 100%{opacity:1;transform:rotate(0deg) translateX(0)} }
  @keyframes csTransFade   { from{opacity:0} to{opacity:1} }
  @keyframes csTransSlideUp{ from{opacity:0;transform:translateY(60px)} to{opacity:1;transform:translateY(0)} }
  @keyframes csTransZoom   { from{opacity:0;transform:scale(0.7)} to{opacity:1;transform:scale(1)} }
  @keyframes csLoopPulse   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
  @keyframes csLoopBounce  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes csLoopWiggle  { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(-5deg)} 75%{transform:rotate(5deg)} }
  @keyframes csLoopShake   { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
  @keyframes csLoopFloat      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes csElTypewriter   { from{max-width:0;opacity:1} to{max-width:100%;opacity:1} }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function useLangFlip(serverLang: string): 'de' | 'en' {
  const [flip, setFlip] = useState(false);
  useEffect(() => {
    if (serverLang !== 'both') {
      setFlip(false);
      return;
    }
    setFlip(false);
    const iv = setInterval(() => setFlip(f => !f), 8000);
    return () => clearInterval(iv);
  }, [serverLang]);
  if (serverLang === 'de') return 'de';
  if (serverLang === 'en') return 'en';
  return flip ? 'en' : 'de';
}

function elementAnimation(el: QQSlideElement): string | undefined {
  if (!el.animIn || el.animIn === 'none') return undefined;
  const dur = el.animDuration ?? 0.5;
  const del = el.animDelay ?? 0;
  const map: Record<string, string> = {
    fadeUp:     'csElFadeUp',
    fadeIn:     'csElFadeIn',
    pop:        'csElPop',
    slideLeft:  'csElSlideLeft',
    slideRight: 'csElSlideRight',
    cardFlip:   'csElCardFlip',
    bounceIn:   'csElBounceIn',
    slotDrop:   'csElSlotDrop',
    swingIn:    'csElSwingIn',
    typewriter: 'csElTypewriter',
  };
  const kf = map[el.animIn];
  if (!kf) return undefined;
  if (el.animIn === 'typewriter') {
    const chars = Math.max(1, (el.text ?? '').length || 20);
    return `csElTypewriter ${dur}s steps(${chars}) ${del}s both`;
  }
  return `${kf} ${dur}s ease ${del}s both`;
}

function elementLoopAnimation(el: QQSlideElement): React.CSSProperties | undefined {
  if (!el.animLoop || el.animLoop === 'none') return undefined;
  const dur = el.animLoopDuration ?? 2;
  const map: Record<string, string> = {
    pulse:  'csLoopPulse',
    bounce: 'csLoopBounce',
    wiggle: 'csLoopWiggle',
    shake:  'csLoopShake',
    float:  'csLoopFloat',
  };
  const kf = map[el.animLoop];
  if (!kf) return undefined;
  const delay = el.animIn && el.animIn !== 'none' ? `${(el.animDelay ?? 0) + (el.animDuration ?? 0.5)}s` : '0s';
  return { animation: `${kf} ${dur}s ease-in-out ${delay} infinite` };
}

// ── Default mock state ────────────────────────────────────────────────────────

const MOCK_TEAMS: QQStateUpdate['teams'] = [
  { id: 't1', name: 'Team Adler', color: '#3B82F6', avatarId: 'eagle', connected: true, totalCells: 5, largestConnected: 4 },
  { id: 't2', name: 'Team Fuchs', color: '#EF4444', avatarId: 'fox', connected: true, totalCells: 3, largestConnected: 3 },
];

const MOCK_GRID_SIZE = 5;
const MOCK_GRID = Array.from({ length: MOCK_GRID_SIZE }, (_, r) =>
  Array.from({ length: MOCK_GRID_SIZE }, (_, c) => ({
    row: r, col: c,
    ownerId: r < 2 ? 't1' : r > 2 ? 't2' : null,
    jokerFormed: false,
    placedBy: null,
  }))
);

const MOCK_STATE_BASE: QQStateUpdate = {
  roomCode: 'DEMO',
  phase: 'LOBBY',
  gamePhaseIndex: 1,
  questionIndex: 0,
  gridSize: MOCK_GRID_SIZE,
  grid: MOCK_GRID,
  teams: MOCK_TEAMS,
  teamPhaseStats: {},
  currentQuestion: null,
  revealedAnswer: null,
  correctTeamId: null,
  pendingFor: null,
  pendingAction: null,
  comebackTeamId: null,
  comebackAction: null,
  swapFirstCell: null,
  language: 'de',
  timerDurationSec: 20,
  timerEndsAt: null,
  answers: [],
  buzzQueue: [],
  hotPotatoActiveTeamId: null,
  hotPotatoEliminated: [],
  hotPotatoLastAnswer: null,
  hotPotatoTurnEndsAt: null,
  hotPotatoUsedAnswers: [],
  imposterActiveTeamId: null,
  imposterChosenIndices: [],
  imposterEliminated: [],
  lastPlacedCell: null,
  imageRevealed: false,
  avatarsEnabled: true,
  totalPhases: 3,
  globalMuted: false,
  musicMuted: false,
  sfxMuted: false,
  volume: 0.8,
  frozenCells: [],
  stuckCandidates: [],
  rulesSlideIndex: 0,
};

const MOCK_QUESTION_BASE = {
  id: 'preview',
  category: 'MUCHO' as QQCategory,
  phaseIndex: 1 as const,
  questionIndexInPhase: 0,
  text: 'Beispielfrage: Was ist die Hauptstadt von Deutschland?',
  textEn: 'Sample question: What is the capital of Germany?',
  options: ['Berlin', 'Hamburg', 'München', 'Frankfurt'],
  optionsEn: ['Berlin', 'Hamburg', 'Munich', 'Frankfurt'],
  correctOptionIndex: 0,
  answer: 'Berlin',
  answerEn: 'Berlin',
};

/**
 * Returns a mock partial QQStateUpdate suitable for previewing each slide type.
 * - `questions`: all draft questions — used to find a real question per category
 * - `specificQuestion`: if provided, used directly as preview question (overrides category search)
 */
export function makePreviewState(templateType: QQSlideTemplateType, questions?: QQQuestion[], specificQuestion?: QQQuestion): Partial<QQStateUpdate> {
  const catMap: Record<string, QQCategory> = {
    QUESTION_SCHAETZCHEN: 'SCHAETZCHEN', QUESTION_MUCHO: 'MUCHO',
    QUESTION_BUNTE_TUETE: 'BUNTE_TUETE', QUESTION_ZEHN: 'ZEHN_VON_ZEHN', QUESTION_CHEESE: 'CHEESE',
  };
  const cat = catMap[templateType];

  // For question templates: use specific question, or first real question of that category
  if (cat) {
    const realQ = (specificQuestion?.category === cat ? specificQuestion : null)
      ?? questions?.find(q => q.category === cat);
    if (realQ) {
      return {
        phase: 'QUESTION_ACTIVE',
        currentQuestion: realQ,
        timerEndsAt: Date.now() + 20000,
        timerDurationSec: 20,
        teams: MOCK_TEAMS,
      };
    }
  }

  switch (templateType) {
    case 'LOBBY':
      return {
        phase: 'LOBBY',
        teams: MOCK_TEAMS,
        roomCode: 'DEMO',
      };

    case 'PHASE_INTRO_1':
      return { phase: 'PHASE_INTRO', gamePhaseIndex: 1 };
    case 'PHASE_INTRO_2':
      return { phase: 'PHASE_INTRO', gamePhaseIndex: 2 };
    case 'PHASE_INTRO_3':
      return { phase: 'PHASE_INTRO', gamePhaseIndex: 3 };

    case 'QUESTION_SCHAETZCHEN':
      return {
        phase: 'QUESTION_ACTIVE',
        currentQuestion: { ...MOCK_QUESTION_BASE, category: 'SCHAETZCHEN' as QQCategory, text: 'Wie viele Einwohner hat Berlin?', options: ['2 Mio', '3.7 Mio', '5 Mio', '1 Mio'], answer: '3.7 Mio', targetValue: 3700000 },
        timerEndsAt: Date.now() + 20000, timerDurationSec: 20,
        teams: MOCK_TEAMS,
      };
    case 'QUESTION_MUCHO':
      return {
        phase: 'QUESTION_ACTIVE',
        currentQuestion: { ...MOCK_QUESTION_BASE, category: 'MUCHO' },
        timerEndsAt: Date.now() + 20000, timerDurationSec: 20,
        teams: MOCK_TEAMS,
      };
    case 'QUESTION_BUNTE_TUETE':
      return {
        phase: 'QUESTION_ACTIVE',
        currentQuestion: { ...MOCK_QUESTION_BASE, category: 'BUNTE_TUETE', text: 'Was ist das? Bunte-Tüte-Frage!' },
        timerEndsAt: Date.now() + 20000, timerDurationSec: 20,
        teams: MOCK_TEAMS,
      };
    case 'QUESTION_ZEHN':
      return {
        phase: 'QUESTION_ACTIVE',
        currentQuestion: { ...MOCK_QUESTION_BASE, category: 'ZEHN_VON_ZEHN', text: 'Nenne 10 deutsche Städte!', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
        timerEndsAt: Date.now() + 20000, timerDurationSec: 20,
        teams: MOCK_TEAMS,
      };
    case 'QUESTION_CHEESE':
      return {
        phase: 'QUESTION_ACTIVE',
        currentQuestion: { ...MOCK_QUESTION_BASE, category: 'CHEESE', text: 'Was siehst du auf dem Bild?' },
        timerEndsAt: Date.now() + 20000, timerDurationSec: 20,
        teams: MOCK_TEAMS,
      };

    case 'REVEAL':
      return {
        phase: 'QUESTION_REVEAL',
        currentQuestion: { ...MOCK_QUESTION_BASE, category: 'MUCHO' },
        revealedAnswer: 'Berlin',
        correctTeamId: 't1',
        teams: MOCK_TEAMS,
        answers: [
          { teamId: 't1', text: '0', submittedAt: Date.now() - 3000 },
          { teamId: 't2', text: '2', submittedAt: Date.now() - 2000 },
        ],
      };

    case 'PLACEMENT':
      return {
        phase: 'PLACEMENT',
        currentQuestion: { ...MOCK_QUESTION_BASE, category: 'MUCHO' },
        correctTeamId: 't1',
        pendingFor: 't1',
        pendingAction: 'PLACE_1',
        revealedAnswer: 'Berlin',
        teams: MOCK_TEAMS,
        grid: MOCK_GRID,
        gridSize: MOCK_GRID_SIZE,
        teamPhaseStats: { t1: { stealsUsed: 0, jokersEarned: 0, placementsLeft: 1 }, t2: { stealsUsed: 0, jokersEarned: 0, placementsLeft: 0 } },
      };

    case 'COMEBACK_CHOICE':
      return {
        phase: 'COMEBACK_CHOICE',
        comebackTeamId: 't2',
        correctTeamId: 't2',
        teams: MOCK_TEAMS,
      };

    case 'GAME_OVER':
      return {
        phase: 'GAME_OVER',
        correctTeamId: 't1',
        teams: MOCK_TEAMS,
        grid: MOCK_GRID,
        gridSize: MOCK_GRID_SIZE,
      };

    default:
      return {};
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

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

function GridDisplay({ state: s, maxSize = 320 }: { state: QQStateUpdate; maxSize?: number }) {
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
            return (
              <div key={`${r}-${c}`} style={{
                width: cellSize, height: cellSize, borderRadius: Math.max(4, cellSize * 0.16),
                background: team
                  ? `linear-gradient(135deg, ${team.color}99, ${team.color}66)`
                  : 'rgba(255,255,255,0.04)',
                border: cell.jokerFormed
                  ? '2px solid rgba(251,191,36,0.9)'
                  : team
                    ? `1px solid ${team.color}55`
                    : '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: Math.max(8, cellSize * 0.42),
                transition: 'all 0.35s ease',
                boxShadow: cell.jokerFormed ? '0 0 10px rgba(251,191,36,0.5)' : 'none',
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

// ── CustomSlideElement ────────────────────────────────────────────────────────

function CustomSlideElement({
  el, state: s, canvasW, lang, isPreview,
}: {
  el: QQSlideElement;
  state: QQStateUpdate;
  canvasW: number;
  lang: 'de' | 'en';
  isPreview?: boolean;
}) {
  const cardBg = s.theme?.cardBg ?? '#1B1510';
  const themeAccent = s.theme?.accentColor ?? '#EAB308';
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left:   `${el.x}%`,
    top:    `${el.y}%`,
    width:  `${el.w}%`,
    height: `${el.h}%`,
    zIndex: el.zIndex ?? 1,
    opacity: el.opacity ?? 1,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    animation: [elementAnimation(el), elementLoopAnimation(el)?.animation].filter(Boolean).join(', ') || undefined,
    boxSizing: 'border-box',
  };

  const q = s.currentQuestion;
  const cat = q?.category;
  const accent = cat ? (CAT_ACCENT[cat] ?? '#e2e8f0') : '#e2e8f0';

  switch (el.type) {
    case 'text': {
      const isTypewriter = el.animIn === 'typewriter';
      return (
        <div style={{
          ...baseStyle,
          fontSize:      `${(el.fontSize ?? 2) * canvasW / 100}px`,
          fontWeight:    el.fontWeight ?? 700,
          fontFamily:    el.fontFamily ?? undefined,
          fontStyle:     el.fontStyle ?? undefined,
          color:         el.color ?? '#e2e8f0',
          textAlign:     el.textAlign ?? 'left',
          letterSpacing: el.letterSpacing ? `${el.letterSpacing}em` : undefined,
          lineHeight:    el.lineHeight ?? 1.3,
          display:       'flex', alignItems: 'center',
          padding:       '4px 8px',
          whiteSpace:    isTypewriter ? 'nowrap' : 'pre-wrap',
          wordBreak:     isTypewriter ? 'normal' : 'break-word',
          overflow:      isTypewriter ? 'hidden' : undefined,
        }}>
          {el.text ?? ''}
        </div>
      );
    }

    case 'image':
      if (!el.imageUrl && isPreview) {
        return (
          <div style={{
            ...baseStyle,
            border: '2px dashed rgba(59,130,246,0.4)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(59,130,246,0.06)',
            color: 'rgba(59,130,246,0.5)',
            fontSize: Math.max(10, canvasW * 0.012),
            fontWeight: 700,
          }}>
            🖼 Bild
          </div>
        );
      }
      return (
        <img
          src={el.imageUrl ?? ''}
          alt=""
          style={{
            ...baseStyle,
            objectFit: el.objectFit ?? 'cover',
          }}
        />
      );

    case 'rect':
      return (
        <div style={{
          ...baseStyle,
          background:    el.background ?? 'rgba(255,255,255,0.1)',
          borderRadius:  el.borderRadius ? `${el.borderRadius}px` : undefined,
          border:        el.border,
        }} />
      );

    case 'ph_question':
      return (
        <div style={{
          ...baseStyle,
          fontSize:   `${(el.fontSize ?? 3) * canvasW / 100}px`,
          fontWeight: el.fontWeight ?? 900,
          color:      el.color ?? '#F1F5F9',
          textAlign:  el.textAlign ?? 'left',
          lineHeight: el.lineHeight ?? 1.22,
          display:    'flex', alignItems: 'center',
          padding:    '8px 16px',
          wordBreak:  'break-word',
        }}>
          {lang === 'en' && q?.textEn ? q.textEn : (q?.text ?? '')}
        </div>
      );

    case 'ph_category': {
      if (!cat) return null;
      const catLabel = QQ_CATEGORY_LABELS[cat as QQCategory];
      const badgeBg  = CAT_BADGE_BG[cat] ?? '#374151';
      return (
        <div style={{
          ...baseStyle,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: badgeBg,
          borderRadius: el.borderRadius ? `${el.borderRadius}px` : 999,
          fontSize:   `${(el.fontSize ?? 1.4) * canvasW / 100}px`,
          fontWeight: el.fontWeight ?? 900,
          color:      el.color ?? '#fff',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          gap: 8,
        }}>
          <span>{catLabel?.emoji}</span>
          <span>{lang === 'en' ? catLabel?.en : catLabel?.de}</span>
        </div>
      );
    }

    case 'ph_timer':
      return s.timerEndsAt ? (
        <div style={{ ...baseStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BeamerTimer endsAt={s.timerEndsAt} durationSec={s.timerDurationSec} accent={accent} />
        </div>
      ) : null;

    case 'ph_teams':
      return (
        <div style={{ ...baseStyle, overflow: 'hidden' }}>
          <ScoreBar teams={s.teams} />
        </div>
      );

    case 'ph_grid':
      return (
        <div style={{ ...baseStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <GridDisplay state={s} maxSize={Math.min(el.w, el.h) * canvasW / 100 * 0.9} />
        </div>
      );

    case 'ph_answer':
      return s.revealedAnswer ? (
        <div style={{
          ...baseStyle,
          fontSize:   `${(el.fontSize ?? 2.5) * canvasW / 100}px`,
          fontWeight: el.fontWeight ?? 900,
          color:      el.color ?? '#4ade80',
          textAlign:  el.textAlign ?? 'left',
          display:    'flex', alignItems: 'center',
          padding:    '8px 16px',
        }}>
          ✓ {lang === 'en' && q?.answerEn ? q.answerEn : s.revealedAnswer}
        </div>
      ) : null;

    case 'ph_winner': {
      const winner = s.correctTeamId ? s.teams.find(t => t.id === s.correctTeamId) : null;
      return winner ? (
        <div style={{
          ...baseStyle,
          display:    'flex', alignItems: 'center', gap: 12,
          fontSize:   `${(el.fontSize ?? 2) * canvasW / 100}px`,
          fontWeight: el.fontWeight ?? 900,
          color:      el.color ?? winner.color,
          padding:    '8px 16px',
        }}>
          <span style={{ fontSize: `${(el.fontSize ?? 2.5) * canvasW / 100}px` }}>
            {qqGetAvatar(winner.avatarId).emoji}
          </span>
          <span>{winner.name}</span>
        </div>
      ) : null;
    }

    case 'ph_phase_name': {
      const isFinal = s.gamePhaseIndex === s.totalPhases;
      const phaseNames: Record<number, string> = { 1: 'Runde 1', 2: 'Runde 2', 3: 'Runde 3', 4: 'Runde 4' };
      const name = isFinal ? 'Finale' : (phaseNames[s.gamePhaseIndex] ?? `Phase ${s.gamePhaseIndex}`);
      return (
        <div style={{
          ...baseStyle,
          fontSize:   `${(el.fontSize ?? 8) * canvasW / 100}px`,
          fontWeight: el.fontWeight ?? 900,
          color:      el.color ?? '#e2e8f0',
          textAlign:  el.textAlign ?? 'center',
          display:    'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {name}
        </div>
      );
    }

    case 'ph_phase_desc': {
      const isFinalD = s.gamePhaseIndex === s.totalPhases;
      const phaseDescs: Record<number, string> = { 1: 'Felder besetzen', 2: 'Setzen oder Klauen', 3: 'Comeback-Phase', 4: 'Comeback-Phase' };
      const desc = isFinalD ? 'Alles aufs Spiel' : (phaseDescs[s.gamePhaseIndex] ?? '');
      return (
        <div style={{
          ...baseStyle,
          fontSize:   `${(el.fontSize ?? 2.5) * canvasW / 100}px`,
          fontWeight: el.fontWeight ?? 700,
          color:      el.color ?? 'rgba(255,255,255,0.6)',
          textAlign:  el.textAlign ?? 'center',
          display:    'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {desc}
        </div>
      );
    }

    case 'ph_room_code':
      return (
        <div style={{
          ...baseStyle,
          fontSize:      `${(el.fontSize ?? 2) * canvasW / 100}px`,
          fontWeight:    el.fontWeight ?? 900,
          color:         el.color ?? '#e2e8f0',
          textAlign:     el.textAlign ?? 'center',
          letterSpacing: el.letterSpacing ? `${el.letterSpacing}em` : '0.06em',
          display:       'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {s.roomCode}
        </div>
      );

    case 'ph_team_answers': {
      if (s.phase !== 'QUESTION_REVEAL' || !s.answers?.length || !q) return null;
      const fs = (el.fontSize ?? 1.2) * canvasW / 100;
      const rowStyle = (highlight: boolean): React.CSSProperties => ({
        display: 'flex', alignItems: 'center', gap: fs * 0.8,
        padding: `${fs * 0.5}px ${fs * 0.8}px`, borderRadius: fs * 0.7, marginBottom: fs * 0.3,
        background: highlight ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
        border: highlight ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.05)',
      });

      // SCHAETZCHEN: ranked answers by distance
      if (cat === 'SCHAETZCHEN' && q.targetValue != null) {
        const ranked = [...s.answers]
          .map(a => {
            const num = Number(a.text.replace(/[^0-9.,\-]/g, '').replace(',', '.'));
            const team = s.teams.find(t => t.id === a.teamId);
            return { ...a, num, distance: Number.isNaN(num) ? Infinity : Math.abs(num - q.targetValue!), team };
          })
          .sort((a, b) => a.distance - b.distance);
        return (
          <div style={{ ...baseStyle, overflow: 'auto', padding: 4 }}>
            {ranked.map((a, i) => (
              <div key={a.teamId} style={rowStyle(i === 0)}>
                <span style={{ fontSize: fs, fontWeight: 900, color: i === 0 ? themeAccent : '#475569', width: fs * 2 }}>#{i + 1}</span>
                {a.team && <span style={{ fontSize: fs * 1.4 }}>{qqGetAvatar(a.team.avatarId).emoji}</span>}
                <span style={{ fontWeight: 800, color: a.team?.color ?? '#e2e8f0', flex: 1, fontSize: fs }}>{a.team?.name ?? a.teamId}</span>
                <span style={{ fontSize: fs * 1.2, fontWeight: 900, color: '#e2e8f0' }}>{a.text}</span>
                <span style={{ fontSize: fs * 0.85, color: '#64748b' }}>
                  {Number.isFinite(a.distance) ? `Δ ${a.distance.toLocaleString()}` : '—'}
                </span>
              </div>
            ))}
          </div>
        );
      }

      // CHEESE: speed-ranked text answers
      if (cat === 'CHEESE') {
        const ranked = [...s.answers].sort((a, b) => a.submittedAt - b.submittedAt);
        return (
          <div style={{ ...baseStyle, overflow: 'auto', padding: 4 }}>
            {ranked.map((a, i) => {
              const team = s.teams.find(t => t.id === a.teamId);
              const isWinner = a.teamId === s.correctTeamId;
              return (
                <div key={a.teamId} style={rowStyle(isWinner)}>
                  <span style={{ fontSize: fs, fontWeight: 900, color: '#475569', width: fs * 2 }}>#{i + 1}</span>
                  {team && <span style={{ fontSize: fs * 1.4 }}>{qqGetAvatar(team.avatarId).emoji}</span>}
                  <span style={{ fontWeight: 800, color: team?.color ?? '#e2e8f0', flex: 1, fontSize: fs }}>{team?.name}</span>
                  <span style={{ fontSize: fs * 1.1, fontWeight: 800, color: '#e2e8f0' }}>{a.text}</span>
                  {isWinner && <span style={{ fontSize: fs, color: '#4ade80' }}>✓</span>}
                </div>
              );
            })}
          </div>
        );
      }

      // BUNTE_TUETE / top5
      if (cat === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'top5') {
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
          <div style={{ ...baseStyle, overflow: 'auto', padding: 4 }}>
            {scored.map((a, i) => {
              const team = s.teams.find(t => t.id === a.teamId);
              const isWinner = a.teamId === s.correctTeamId;
              return (
                <div key={a.teamId} style={{ ...rowStyle(isWinner), flexDirection: 'column', alignItems: 'stretch', gap: fs * 0.3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: fs * 0.6 }}>
                    <span style={{ fontSize: fs, fontWeight: 900, color: '#475569', width: fs * 2 }}>#{i + 1}</span>
                    {team && <span style={{ fontSize: fs * 1.3 }}>{qqGetAvatar(team.avatarId).emoji}</span>}
                    <span style={{ fontWeight: 800, color: team?.color ?? '#e2e8f0', flex: 1, fontSize: fs }}>{team?.name}</span>
                    <span style={{ fontSize: fs, fontWeight: 900, color: isWinner ? '#4ade80' : '#475569' }}>{a.hits}/{correctDE.length || 5}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: fs * 0.3, paddingLeft: fs * 2.5 }}>
                    {a.parts.map((p: string, pi: number) => {
                      const hit = [...allCorrect].some(c => c && (p.toLowerCase() === c || p.toLowerCase().includes(c) || c.includes(p.toLowerCase())));
                      return (
                        <span key={pi} style={{ padding: `${fs * 0.15}px ${fs * 0.5}px`, borderRadius: fs * 0.4, fontSize: fs * 0.85, fontWeight: 700, background: hit ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)', color: hit ? '#4ade80' : '#64748b', border: hit ? '1px solid rgba(34,197,94,0.3)' : '1px solid transparent' }}>
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
      }

      // BUNTE_TUETE / order
      if (cat === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'order') {
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
          <div style={{ ...baseStyle, overflow: 'auto', padding: 4 }}>
            {scored.map((a, i) => {
              const team = s.teams.find(t => t.id === a.teamId);
              const isWinner = a.teamId === s.correctTeamId;
              return (
                <div key={a.teamId} style={{ ...rowStyle(isWinner), flexDirection: 'column', alignItems: 'stretch', gap: fs * 0.3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: fs * 0.6 }}>
                    <span style={{ fontSize: fs, fontWeight: 900, color: '#475569', width: fs * 2 }}>#{i + 1}</span>
                    {team && <span style={{ fontSize: fs * 1.3 }}>{qqGetAvatar(team.avatarId).emoji}</span>}
                    <span style={{ fontWeight: 800, color: team?.color ?? '#e2e8f0', flex: 1, fontSize: fs }}>{team?.name}</span>
                    <span style={{ fontSize: fs, fontWeight: 900, color: isWinner ? '#4ade80' : '#475569' }}>{a.score}/{correctSeq.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: fs * 0.3, paddingLeft: fs * 2.5 }}>
                    {a.parts.map((p: string, pi: number) => {
                      const correct = p === correctSeq[pi];
                      return (
                        <span key={pi} style={{ padding: `${fs * 0.15}px ${fs * 0.5}px`, borderRadius: fs * 0.4, fontSize: fs * 0.85, fontWeight: 700, background: correct ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)', color: correct ? '#4ade80' : '#f87171', border: `1px solid ${correct ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.2)'}` }}>
                          <span style={{ color: '#475569', fontSize: fs * 0.7 }}>{pi + 1}.</span> {p}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      }

      // BUNTE_TUETE / map: distance ranking
      if (cat === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'map') {
        const bt = q.bunteTuete as any;
        const tLat: number = bt.lat; const tLng: number = bt.lng;
        const ranked = [...s.answers].map(a => {
          const parts = a.text.split(',');
          const lat = parseFloat(parts[0]); const lng = parseFloat(parts[1]);
          if (Number.isNaN(lat) || Number.isNaN(lng)) return { ...a, distKm: null as number | null };
          const R = 6371; const dLat = (lat - tLat) * Math.PI / 180; const dLng = (lng - tLng) * Math.PI / 180;
          const aa = Math.sin(dLat / 2) ** 2 + Math.cos(tLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
          return { ...a, distKm: R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa)) };
        }).sort((a, b) => {
          if (a.distKm === null) return 1; if (b.distKm === null) return -1;
          return a.distKm - b.distKm;
        });
        return (
          <div style={{ ...baseStyle, overflow: 'auto', padding: 4 }}>
            {ranked.map((a, i) => {
              const team = s.teams.find(t => t.id === a.teamId);
              const isWinner = a.teamId === s.correctTeamId;
              const distStr = a.distKm === null ? '—' : a.distKm < 1 ? `${Math.round(a.distKm * 1000)} m` : `${a.distKm.toFixed(1)} km`;
              return (
                <div key={a.teamId} style={rowStyle(isWinner)}>
                  <span style={{ fontSize: fs, fontWeight: 900, color: isWinner ? '#4ade80' : '#475569', width: fs * 2 }}>#{i + 1}</span>
                  {team && <span style={{ fontSize: fs * 1.4 }}>{qqGetAvatar(team.avatarId).emoji}</span>}
                  <span style={{ fontWeight: 800, color: team?.color ?? '#e2e8f0', flex: 1, fontSize: fs }}>{team?.name}</span>
                  <span style={{ fontSize: fs * 1.1, fontWeight: 800, color: '#e2e8f0' }}>{distStr}</span>
                </div>
              );
            })}
          </div>
        );
      }

      // MUCHO / ZEHN_VON_ZEHN: voter breakdown (handled by ph_options, but show here too as standalone)
      if (cat === 'MUCHO' || cat === 'ZEHN_VON_ZEHN') {
        if (!q.options) return null;
        const muchoLabels = ['A', 'B', 'C', 'D'];
        const MUCHO_COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#22C55E'];
        return (
          <div style={{ ...baseStyle, overflow: 'auto', padding: 4 }}>
            {q.options.map((_, optIdx) => {
              const voters = s.answers
                .filter(a => a.text === String(optIdx))
                .map(a => s.teams.find(t => t.id === a.teamId))
                .filter(Boolean);
              if (!voters.length) return null;
              const isCorrect = optIdx === q.correctOptionIndex;
              const optColor = cat === 'MUCHO' ? MUCHO_COLORS[optIdx] : (isCorrect ? '#22C55E' : '#475569');
              return (
                <div key={optIdx} style={rowStyle(isCorrect)}>
                  <span style={{ width: fs * 1.5, height: fs * 1.5, borderRadius: fs * 0.4, background: optColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fs * 0.8, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                    {cat === 'MUCHO' ? muchoLabels[optIdx] : optIdx + 1}
                  </span>
                  {voters.map(t => (
                    <span key={t!.id} style={{ display: 'flex', alignItems: 'center', gap: fs * 0.3 }}>
                      <span style={{ fontSize: fs * 1.3 }}>{qqGetAvatar(t!.avatarId).emoji}</span>
                      <span style={{ fontSize: fs, fontWeight: 800, color: t!.color }}>{t!.name}</span>
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        );
      }

      // Fallback: generic answer list
      return (
        <div style={{ ...baseStyle, overflow: 'auto', padding: 4 }}>
          {s.answers.map((a, i) => {
            const team = s.teams.find(t => t.id === a.teamId);
            return (
              <div key={a.teamId} style={rowStyle(a.teamId === s.correctTeamId)}>
                {team && <span style={{ fontSize: fs * 1.3 }}>{qqGetAvatar(team.avatarId).emoji}</span>}
                <span style={{ fontWeight: 800, color: team?.color ?? '#e2e8f0', flex: 1, fontSize: fs }}>{team?.name}</span>
                <span style={{ fontSize: fs, color: '#e2e8f0' }}>{a.text}</span>
              </div>
            );
          })}
        </div>
      );
    }

    case 'ph_options': {
      if (!q?.options) return null;
      const muchoLabels  = ['A', 'B', 'C', 'D'];
      const MUCHO_COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#22C55E'];
      const defaultCols = cat === 'MUCHO' ? 2 : 3;
      const cols = el.columns ?? defaultCols;
      const tileRadius = el.optionRadius ?? 14;
      const isRevealed = s.phase === 'QUESTION_REVEAL';
      const colorScheme = el.optionColorScheme ?? 'category';
      return (
        <div style={{
          ...baseStyle,
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridAutoRows: '1fr',
          gap: 10, padding: 8,
          alignItems: 'stretch',
        }}>
          {q.options.map((opt, i) => {
            const optImg    = q.optionImages?.[i];
            const isCorrect = isRevealed && i === q.correctOptionIndex;
            const label     = cat === 'MUCHO' ? muchoLabels[i] : `${i + 1}`;
            const rawColor  = cat === 'MUCHO' ? MUCHO_COLORS[i] : accent;
            const optColor  = colorScheme === 'mono' ? el.color ?? accent
                            : colorScheme === 'dark' ? '#374151'
                            : rawColor;
            const optText   = lang === 'en' && q.optionsEn?.[i] ? q.optionsEn[i] : opt;
            // Voter breakdown on reveal
            const voters = isRevealed && s.answers?.length
              ? s.answers.filter(a => a.text === String(i)).map(a => s.teams.find(t => t.id === a.teamId)).filter(Boolean)
              : [];
            return (
              <div key={i} style={{
                position: 'relative', overflow: 'hidden',
                borderRadius: tileRadius, padding: '12px 16px',
                background: isCorrect ? 'rgba(34,197,94,0.2)' : cardBg,
                border: isCorrect ? '2px solid #22C55E' : `2px solid ${optColor}44`,
                display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6,
              }}>
                {optImg?.url && (
                  <img src={optImg.url} alt="" style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    objectFit: optImg.fit ?? 'cover', opacity: optImg.opacity ?? 0.4, pointerEvents: 'none',
                  }} />
                )}
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: isCorrect ? '#22C55E' : optColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 900, color: '#fff', flexShrink: 0,
                  }}>{isCorrect ? '✓' : label}</div>
                  <div style={{
                    fontSize: `${(el.fontSize ?? 1.6) * canvasW / 100}px`,
                    fontWeight: 800, color: '#F1F5F9', lineHeight: 1.3,
                  }}>{optText}</div>
                </div>
                {voters.length > 0 && (
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 40 }}>
                    {voters.map(t => (
                      <span key={t!.id} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ fontSize: Math.max(12, canvasW * 0.014) }}>{qqGetAvatar(t!.avatarId).emoji}</span>
                        <span style={{ fontSize: Math.max(10, canvasW * 0.01), fontWeight: 800, color: t!.color }}>{t!.name}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    case 'animatedAvatar': {
      const emoji = el.text ?? '✨';
      const animName = (
        el.animType === 'bounce' ? 'cfloata' :
        el.animType === 'spin'   ? 'cavspin' :
        el.animType === 'pulse'  ? 'cavpulse' :
        el.animType === 'shake'  ? 'cavshake' :
        el.animType === 'dance'  ? 'cavdance' :
        el.animType === 'peek'   ? 'cavpeek' :
        el.animType === 'flip'   ? 'cavflip' :
        'cfloat' // float / wiggle / walk / default
      );
      const dur = el.avatarAnimDuration ?? 4;
      const del = el.avatarAnimDelay ?? 0;
      return (
        <div style={{
          ...baseStyle,
          fontSize: `${(el.fontSize ?? 6) * canvasW / 100}px`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1, userSelect: 'none',
          filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.5))',
          ['--r' as string]: `${el.rotation ?? 0}deg`,
          animation: `${animName} ${dur}s ease-in-out ${del}s infinite`,
        }}>
          {emoji}
        </div>
      );
    }

    case 'emojiStack': {
      const layers = el.emojiLayers ?? [];
      const baseSize = `${(el.fontSize ?? 6) * canvasW / 100}px`;
      const animMap: Record<string, string> = {
        float: 'cfloat', bounce: 'cfloata', spin: 'cavspin', pulse: 'cavpulse',
        shake: 'cavshake', wiggle: 'cfloat',
      };
      return (
        <div style={{ ...baseStyle, overflow: 'visible', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {layers.map((layer, i) => {
            const anim = layer.animType && layer.animType !== 'none' ? animMap[layer.animType] : undefined;
            return (
              <div key={i} style={{
                position: 'absolute',
                fontSize: `calc(${baseSize} * ${layer.scale ?? 1})`,
                transform: `translate(${layer.offsetX ?? 0}%, ${layer.offsetY ?? 0}%) rotate(${layer.rotation ?? 0}deg)`,
                lineHeight: 1, userSelect: 'none',
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
                ['--r' as string]: `${layer.rotation ?? 0}deg`,
                animation: anim ? `${anim} ${3 + i * 0.5}s ease-in-out ${i * 0.3}s infinite` : undefined,
              }}>
                {layer.emoji}
              </div>
            );
          })}
          {layers.length === 0 && (
            <div style={{ fontSize: baseSize, opacity: 0.3, userSelect: 'none' }}>🎭</div>
          )}
        </div>
      );
    }

    case 'ph_question_image': {
      const img = q?.image;
      // Editor preview: show placeholder box when no image or layout='none'
      if (!img?.url || img.layout === 'none') {
        if (isPreview) {
          // Show image preview even with layout='none' if URL exists
          if (img?.url) {
            return (
              <div style={{ ...baseStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                <img src={img.url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12, objectFit: 'contain', opacity: 0.85 }} />
              </div>
            );
          }
          return (
            <div style={{
              ...baseStyle,
              border: '2px dashed rgba(139,92,246,0.5)',
              borderRadius: 12,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              background: 'rgba(139,92,246,0.08)',
              color: 'rgba(139,92,246,0.6)',
              fontSize: Math.max(10, canvasW * 0.012),
              fontWeight: 700,
            }}>
              <span style={{ fontSize: '1.8em' }}>🖼</span>
              <span>Fragebild</span>
              <span style={{ fontSize: '0.75em', opacity: 0.6 }}>Bild im Builder hochladen</span>
            </div>
          );
        }
        return null;
      }
      const fs = (frac: number) => `${frac * canvasW / 100}px`;
      const imgTransform = `translate(${img.offsetX ?? 0}%, ${img.offsetY ?? 0}%) scale(${img.scale ?? 1}) rotate(${img.rotation ?? 0}deg)`;
      const imgFilterStr = (() => {
        const p: string[] = [];
        if (img.brightness !== undefined && img.brightness !== 100) p.push(`brightness(${img.brightness}%)`);
        if (img.contrast !== undefined && img.contrast !== 100) p.push(`contrast(${img.contrast}%)`);
        if (img.blur) p.push(`blur(${img.blur}px)`);
        return p.length ? p.join(' ') : undefined;
      })();
      if (img.layout === 'fullscreen') {
        const isRevealed = s.phase === 'QUESTION_REVEAL';
        return (
          <>
            <div style={{
              ...baseStyle,
              backgroundImage: `url(${img.url})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              clipPath: isRevealed ? 'inset(8% 8% 8% 52% round 18px)' : undefined,
              animation: isRevealed ? undefined : 'fsExpand 1.2s cubic-bezier(0.4,0,0.2,1) 2.4s both',
              transition: 'clip-path 0.8s cubic-bezier(0.4,0,0.2,1)',
              transform: imgTransform, opacity: img.opacity ?? 1, filter: imgFilterStr,
            }} />
            <div style={{
              ...baseStyle, zIndex: (el.zIndex ?? 1) + 1,
              background: [
                'linear-gradient(90deg, rgba(13,10,6,0.92) 0%, rgba(13,10,6,0.78) 45%, rgba(13,10,6,0.45) 100%)',
                'linear-gradient(180deg, rgba(13,10,6,0.5) 0%, transparent 25%, transparent 70%, rgba(13,10,6,0.6) 100%)',
              ].join(', '),
              opacity: isRevealed ? 0.4 : 1,
              transition: 'opacity 0.8s ease',
            }} />
          </>
        );
      }
      if (img.layout === 'cutout') {
        return (
          <img src={img.bgRemovedUrl || img.url} alt="" style={{
            ...baseStyle, objectFit: 'contain', pointerEvents: 'none',
            filter: `drop-shadow(0 16px 40px rgba(0,0,0,0.6))${imgFilterStr ? ' ' + imgFilterStr : ''}`,
            transform: imgTransform, opacity: img.opacity ?? 1,
          }} />
        );
      }
      // window-left / window-right
      return (
        <div style={{ ...baseStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <img src={img.url} alt="" style={{
            maxWidth: '100%', maxHeight: '100%', borderRadius: 22, objectFit: 'contain',
            boxShadow: `0 12px 48px rgba(0,0,0,0.6), 0 0 32px ${accent}44`,
            transform: imgTransform, opacity: img.opacity ?? 1, filter: imgFilterStr,
          }} />
        </div>
      );
    }

    case 'ph_comeback_cards': {
      const cTeam = s.comebackTeamId ? s.teams.find(t => t.id === s.comebackTeamId) : null;
      const fs = (el.fontSize ?? 1.4) * canvasW / 100;
      if (s.comebackAction) {
        const labels: Record<string, string> = {
          PLACE_2: '📍 2 Felder werden gesetzt…',
          STEAL_1: '⚡ 1 Feld wird geklaut…',
          SWAP_2:  '🔄 Felder werden getauscht…',
        };
        return (
          <div style={{
            ...baseStyle, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: fs * 1.4, fontWeight: 900, color: '#e2e8f0',
          }}>
            {labels[s.comebackAction] ?? s.comebackAction}
          </div>
        );
      }
      const cards = [
        { icon: '📍', label: '2 Felder setzen', desc: 'Platziere 2 freie Felder deiner Wahl', color: '#22C55E' },
        { icon: '⚡', label: '1 Feld klauen', desc: 'Nimm ein fremdes Feld', color: '#EF4444' },
        { icon: '🔄', label: '2 Felder tauschen', desc: 'Tausche je ein Feld von zwei Gegnern', color: '#8B5CF6' },
      ];
      return (
        <div style={{ ...baseStyle, display: 'flex', flexDirection: 'column', gap: fs * 0.7 }}>
          {cTeam && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: fs * 0.6, marginBottom: fs * 0.5 }}>
              <span style={{ fontSize: fs * 2 }}>{qqGetAvatar(cTeam.avatarId).emoji}</span>
              <span style={{ fontSize: fs * 1.5, fontWeight: 900, color: cTeam.color }}>{cTeam.name}</span>
            </div>
          )}
          {cards.map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: fs, padding: `${fs * 0.8}px ${fs}px`,
              borderRadius: fs * 0.7, background: cardBg,
              border: `1px solid ${c.color}33`,
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}>
              <span style={{ fontSize: fs * 1.4, lineHeight: 1 }}>{c.icon}</span>
              <div>
                <div style={{ fontWeight: 900, color: c.color, fontSize: fs }}>{c.label}</div>
                <div style={{ fontFamily: "'Caveat', cursive", fontSize: fs * 0.8, color: '#64748b', marginTop: 2 }}>{c.desc}</div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    case 'ph_game_rankings': {
      const sorted = [...s.teams].sort((a, b) => b.largestConnected - a.largestConnected);
      const fs = (el.fontSize ?? 1.4) * canvasW / 100;
      return (
        <div style={{ ...baseStyle, overflow: 'auto', padding: 4 }}>
          {sorted.map((t, i) => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: fs * 1.2,
              padding: `${fs * 0.8}px 0`,
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              animation: `nbSlide 0.5s cubic-bezier(0.34,1.2,0.64,1) ${i * 0.12}s both`,
            }}>
              <div style={{ fontFamily: "'Caveat', cursive", fontSize: fs * 2, fontWeight: 700, width: fs * 2.8, color: i === 0 ? themeAccent : 'rgba(255,255,255,0.18)' }}>
                #{i + 1}
              </div>
              <div style={{ width: fs * 0.8, height: fs * 2.5, borderRadius: fs * 0.4, background: t.color, flexShrink: 0 }} />
              <span style={{ fontSize: fs * 1.8, lineHeight: 1 }}>{qqGetAvatar(t.avatarId).emoji}</span>
              <div style={{ fontFamily: "'Caveat', cursive", fontSize: fs * 1.8, fontWeight: 700, color: '#fff', flex: 1 }}>
                {t.name}{i === 0 && <span style={{ marginLeft: 8 }}>⭐</span>}
              </div>
              <div style={{ fontFamily: "'Caveat', cursive", fontSize: fs * 1.2, color: i === 0 ? themeAccent : 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
                {t.largestConnected} verbunden
              </div>
              <div style={{ fontFamily: "'Caveat', cursive", fontSize: fs, color: '#475569', fontWeight: 600, minWidth: fs * 5, textAlign: 'right' as const }}>
                {t.totalCells} gesamt
              </div>
            </div>
          ))}
        </div>
      );
    }

    case 'ph_qr_code': {
      const joinUrl = `${window.location.origin}/team`;
      const qrSize = Math.min(el.w, el.h) * canvasW / 100 * 0.7;
      return (
        <div style={{ ...baseStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ background: '#ffffff', borderRadius: 16, padding: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>
            <QRCodeSVG value={joinUrl} size={Math.max(80, qrSize)} bgColor="#ffffff" fgColor="#0D0A06" level="M" />
          </div>
          <div style={{ textAlign: 'center' as const }}>
            <div style={{ fontSize: Math.max(10, canvasW * 0.008), color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>Jetzt mitspielen</div>
            <div style={{ fontSize: Math.max(9, canvasW * 0.007), color: '#475569', fontFamily: 'monospace', background: cardBg, padding: '4px 12px', borderRadius: 8 }}>
              {joinUrl.replace(/^https?:\/\//, '')}
            </div>
          </div>
        </div>
      );
    }

    case 'ph_counter': {
      return (
        <div style={{
          ...baseStyle,
          fontFamily: "'Caveat', cursive",
          fontSize: `${(el.fontSize ?? 1.5) * canvasW / 100}px`,
          fontWeight: el.fontWeight ?? 700,
          color: el.color ?? 'rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start',
          padding: '4px 8px',
        }}>
          Phase {s.gamePhaseIndex}/{s.totalPhases} · Frage {(s.questionIndex % 5) + 1}/5
        </div>
      );
    }

    case 'ph_hot_potato': {
      if (!s.hotPotatoActiveTeamId) return null;
      const activeTeam = s.teams.find(t => t.id === s.hotPotatoActiveTeamId);
      if (!activeTeam) return null;
      const isRevealed = s.phase === 'QUESTION_REVEAL';
      if (isRevealed) return null;
      return (
        <div style={{
          ...baseStyle,
          background: activeTeam.color, borderRadius: 16,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 32px ${activeTeam.color}88`,
          animation: 'imgFloat 2s ease-in-out infinite',
          padding: 12,
        }}>
          <div style={{ fontSize: `${(el.fontSize ?? 2.5) * canvasW / 100}px`, fontWeight: 900, color: '#fff' }}>
            🥔 {activeTeam.name}
          </div>
          {s.hotPotatoEliminated.length > 0 && (
            <div style={{ fontSize: `${(el.fontSize ?? 2.5) * canvasW / 100 * 0.5}px`, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
              Raus: {s.hotPotatoEliminated.map(id => s.teams.find(t => t.id === id)?.name).filter(Boolean).join(', ')}
            </div>
          )}
        </div>
      );
    }

    case 'ph_imposter': {
      if (!s.imposterActiveTeamId) return null;
      const activeTeam = s.teams.find(t => t.id === s.imposterActiveTeamId);
      if (!activeTeam) return null;
      const isRevealed = s.phase === 'QUESTION_REVEAL';
      if (isRevealed) return null;
      const totalStmts = (q?.bunteTuete as any)?.statements?.length ?? 8;
      const remaining = totalStmts - s.imposterChosenIndices.length;
      return (
        <div style={{
          ...baseStyle,
          borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: cardBg, border: `2px solid ${activeTeam.color}88`,
          boxShadow: `0 0 28px ${activeTeam.color}44`,
          padding: 12,
        }}>
          <div style={{ fontSize: Math.max(10, canvasW * 0.008), color: '#64748b', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6 }}>
            🕵️ Imposter — wählt eine Aussage
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <span style={{ fontSize: `${(el.fontSize ?? 2) * canvasW / 100}px` }}>{qqGetAvatar(activeTeam.avatarId).emoji}</span>
            <span style={{ fontWeight: 900, fontSize: `${(el.fontSize ?? 2) * canvasW / 100 * 0.75}px`, color: activeTeam.color }}>{activeTeam.name}</span>
          </div>
          <div style={{ fontSize: Math.max(10, canvasW * 0.008), color: '#64748b', marginTop: 6 }}>
            {remaining} Aussage{remaining !== 1 ? 'n' : ''} übrig
            {s.imposterEliminated.length > 0 && (
              <span> · Raus: {s.imposterEliminated.map(id => s.teams.find(t => t.id === id)?.name).filter(Boolean).join(', ')}</span>
            )}
          </div>
        </div>
      );
    }

    case 'ph_answer_count': {
      const isRevealed = s.phase === 'QUESTION_REVEAL';
      if (isRevealed || !s.answers?.length) return null;
      const dotSize = Math.max(8, canvasW * 0.008);
      return (
        <div style={{
          ...baseStyle,
          display: 'flex', alignItems: 'center', gap: dotSize * 0.8,
          background: cardBg, border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, padding: `${dotSize * 0.8}px ${dotSize * 1.5}px`,
        }}>
          <span style={{ fontSize: dotSize * 1.4, color: '#64748b', fontWeight: 700 }}>Antworten:</span>
          {s.teams.map(t => {
            const answered = s.answers.some(a => a.teamId === t.id);
            return (
              <span key={t.id} style={{
                width: dotSize, height: dotSize, borderRadius: '50%',
                background: answered ? t.color : 'rgba(255,255,255,0.1)',
                boxShadow: answered ? `0 0 6px ${t.color}` : 'none',
                display: 'inline-block', transition: 'all 0.3s',
              }} />
            );
          })}
        </div>
      );
    }

    // ── Phase-Intro mini grid ─────────────────────────────────────────────────
    case 'ph_mini_grid': {
      const cellPx = Math.floor(
        (Math.min(el.w, el.h) * canvasW / 100 * 0.9 - (s.gridSize - 1) * 2) / s.gridSize,
      );
      return (
        <div style={{
          ...baseStyle,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: el.opacity ?? 0.5,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${s.gridSize}, ${cellPx}px)`,
            gap: 2,
          }}>
            {s.grid.flatMap((row, r) =>
              row.map((cell, c) => {
                const team = s.teams.find(t => t.id === cell.ownerId);
                return (
                  <div key={`${r}-${c}`} style={{
                    width: cellPx, height: cellPx, borderRadius: 3,
                    background: team ? team.color : 'rgba(255,255,255,0.05)',
                  }} />
                );
              }),
            )}
          </div>
        </div>
      );
    }

    // ── Phase-Intro score chips ───────────────────────────────────────────────
    case 'ph_phase_scores': {
      const sorted = [...s.teams].sort((a, b) => b.largestConnected - a.largestConnected);
      return (
        <div style={{
          ...baseStyle,
          display: 'flex', flexWrap: 'wrap', gap: `${0.8 * canvasW / 100}px`,
          alignItems: 'center', justifyContent: el.textAlign ?? 'center',
        }}>
          {sorted.map(t => (
            <div key={t.id} style={{
              padding: `${0.5 * canvasW / 100}px ${1.2 * canvasW / 100}px`,
              borderRadius: 50,
              border: `2px solid ${t.color}66`,
              background: `${t.color}18`,
              display: 'flex', alignItems: 'center',
              gap: `${0.5 * canvasW / 100}px`,
            }}>
              <span style={{ fontSize: `${1.4 * canvasW / 100}px` }}>{qqGetAvatar(t.avatarId).emoji}</span>
              <span style={{ fontWeight: 800, color: t.color, fontSize: `${0.9 * canvasW / 100}px` }}>{t.name}</span>
              <span style={{ color: '#64748b', fontSize: `${0.75 * canvasW / 100}px`, fontWeight: 700 }}>{t.largestConnected} Felder</span>
            </div>
          ))}
        </div>
      );
    }

    // ── Placement action banner ───────────────────────────────────────────────
    case 'ph_placement_banner': {
      const team = s.pendingFor ? s.teams.find(t => t.id === s.pendingFor) : null;
      const actionVerb = (a: string | null) => {
        if (a === 'STEAL_1') return '⚡ Klauen';
        if (a === 'COMEBACK') return '⚡ Comeback';
        return '📍 Setzen';
      };
      const actionDesc = (a: string | null, stats: any) => {
        if (a === 'PLACE_1') return '1 Feld wählen';
        if (a === 'PLACE_2') return `2 Felder wählen (${stats?.placementsLeft ?? 2} übrig)`;
        if (a === 'STEAL_1') return '1 fremdes Feld klauen';
        if (a === 'FREE') return 'Setzen oder Klauen';
        return '';
      };
      return (
        <div style={{
          ...baseStyle,
          display: 'flex', alignItems: 'center',
          gap: `${1.2 * canvasW / 100}px`,
          padding: `${1.2 * canvasW / 100}px ${2.6 * canvasW / 100}px`,
          background: el.background ?? 'rgba(13,10,6,0.6)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <span style={{
            fontSize: `${0.85 * canvasW / 100}px`, fontWeight: 900,
            textTransform: 'uppercase', letterSpacing: '0.12em',
            color: '#475569',
          }}>
            {actionVerb(s.pendingAction)}
          </span>
          {team && (
            <>
              <span style={{ fontSize: `${2 * canvasW / 100}px`, lineHeight: 1 }}>{qqGetAvatar(team.avatarId).emoji}</span>
              <span style={{ fontWeight: 900, fontSize: `${1.8 * canvasW / 100}px`, color: team.color }}>{team.name}</span>
              <span style={{ color: '#475569', fontSize: `${0.9 * canvasW / 100}px`, fontWeight: 700 }}>
                {actionDesc(s.pendingAction, s.teamPhaseStats[team.id])}
              </span>
            </>
          )}
          {s.revealedAnswer && (
            <div style={{
              marginLeft: 'auto',
              padding: `${0.4 * canvasW / 100}px ${1 * canvasW / 100}px`,
              borderRadius: 10,
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.2)',
              fontSize: `${0.9 * canvasW / 100}px`,
              color: '#4ade80', fontWeight: 700,
            }}>
              ✓ {s.revealedAnswer}
            </div>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}

// ── CustomSlide (exported) ────────────────────────────────────────────────────

/**
 * Renders a QQ slide template with live or mock state.
 * - `state`: live QQStateUpdate (from socket)
 * - `previewState`: partial mock state merged with MOCK_STATE_BASE (for editor preview)
 */
export function CustomSlide({
  template,
  state,
  previewState,
  overlayOnly,
}: {
  template: QQSlideTemplate;
  state?: QQStateUpdate;
  previewState?: Partial<QQStateUpdate>;
  /** When true, only renders non-placeholder elements (text, image, rect, animatedAvatar).
   *  Use this when a built-in view is already rendering the dynamic content. */
  overlayOnly?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasW, setCanvasW] = useState(1920);
  const [transAnim, setTransAnim] = useState('');
  const tplType = template?.type;
  const prevTemplateType = useRef(tplType);

  // Trigger slide transition when template type changes
  useEffect(() => {
    if (prevTemplateType.current !== tplType) {
      prevTemplateType.current = tplType;
      const t = template?.transitionIn;
      if (t) {
        const dur = template?.transitionDuration ?? 0.5;
        const name = t === 'fade' ? 'csTransFade' : t === 'slideUp' ? 'csTransSlideUp' : 'csTransZoom';
        setTransAnim(`${name} ${dur}s ease-out both`);
        const timer = setTimeout(() => setTransAnim(''), dur * 1000 + 50);
        return () => clearTimeout(timer);
      }
    }
  }, [tplType, template?.transitionIn, template?.transitionDuration]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setCanvasW(entry.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Merge previewState into base mock, or use live state
  const effectiveState: QQStateUpdate = state ?? { ...MOCK_STATE_BASE, ...previewState };
  const lang = useLangFlip(effectiveState.language);
  const isPreview = !!previewState;

  const visibleElements = overlayOnly
    ? (template.elements ?? []).filter(el => !el.type.startsWith('ph_'))
    : (template.elements ?? []);

  return (
    <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', width: '100%', height: '100%', animation: transAnim || undefined }}>
      <style>{BEAMER_CSS + SLIDE_ANIM_KEYFRAMES}</style>
      {visibleElements.map(el => (
        <CustomSlideElement key={el.id} el={el} state={effectiveState} canvasW={canvasW} lang={lang} isPreview={isPreview} />
      ))}
    </div>
  );
}
