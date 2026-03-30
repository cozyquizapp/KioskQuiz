import { useState, useEffect, useRef } from 'react';
import {
  QQStateUpdate, QQ_CATEGORY_LABELS, qqGetAvatar, QQCategory,
  QQSlideTemplate, QQSlideElement, QQSlideTemplateType,
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

const SLIDE_ANIM_KEYFRAMES = `
  @keyframes csElFadeUp    { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
  @keyframes csElFadeIn    { from{opacity:0} to{opacity:1} }
  @keyframes csElPop       { from{opacity:0;transform:scale(0.6)} to{opacity:1;transform:scale(1)} }
  @keyframes csElSlideLeft { from{opacity:0;transform:translateX(-40px)} to{opacity:1;transform:translateX(0)} }
  @keyframes csElSlideRight{ from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
`;

// ── Category themes ───────────────────────────────────────────────────────────
const CAT_BADGE_BG: Record<string, string> = {
  SCHAETZCHEN:   'linear-gradient(135deg, #A16207, #EAB308)',
  MUCHO:         'linear-gradient(135deg, #1E3A8A, #2563EB)',
  BUNTE_TUETE:   'linear-gradient(135deg, #991B1B, #DC2626)',
  ZEHN_VON_ZEHN: 'linear-gradient(135deg, #065F46, #059669)',
  CHEESE:        'linear-gradient(135deg, #4C1D95, #7C3AED)',
};

const CAT_ACCENT: Record<string, string> = {
  SCHAETZCHEN:   '#EAB308',
  MUCHO:         '#60A5FA',
  BUNTE_TUETE:   '#F87171',
  ZEHN_VON_ZEHN: '#34D399',
  CHEESE:        '#A78BFA',
};

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
  };
  const kf = map[el.animIn];
  if (!kf) return undefined;
  return `${kf} ${dur}s ease ${del}s both`;
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
  avatarsEnabled: true,
  totalPhases: 3,
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
 */
export function makePreviewState(templateType: QQSlideTemplateType): Partial<QQStateUpdate> {
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
      };

    case 'PLACEMENT':
      return {
        phase: 'PLACEMENT',
        currentQuestion: { ...MOCK_QUESTION_BASE, category: 'MUCHO' },
        correctTeamId: 't1',
        teams: MOCK_TEAMS,
        grid: MOCK_GRID,
        gridSize: MOCK_GRID_SIZE,
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
  el, state: s, canvasW, lang,
}: {
  el: QQSlideElement;
  state: QQStateUpdate;
  canvasW: number;
  lang: 'de' | 'en';
}) {
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left:   `${el.x}%`,
    top:    `${el.y}%`,
    width:  `${el.w}%`,
    height: `${el.h}%`,
    zIndex: el.zIndex ?? 1,
    opacity: el.opacity ?? 1,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    animation: elementAnimation(el),
    boxSizing: 'border-box',
  };

  const q = s.currentQuestion;
  const cat = q?.category;
  const accent = cat ? (CAT_ACCENT[cat] ?? '#e2e8f0') : '#e2e8f0';

  switch (el.type) {
    case 'text':
      return (
        <div style={{
          ...baseStyle,
          fontSize:      `${(el.fontSize ?? 2) * canvasW / 100}px`,
          fontWeight:    el.fontWeight ?? 700,
          color:         el.color ?? '#e2e8f0',
          textAlign:     el.textAlign ?? 'left',
          letterSpacing: el.letterSpacing ? `${el.letterSpacing}em` : undefined,
          lineHeight:    el.lineHeight ?? 1.3,
          display:       'flex', alignItems: 'center',
          padding:       '4px 8px',
          whiteSpace:    'pre-wrap',
          wordBreak:     'break-word',
        }}>
          {el.text ?? ''}
        </div>
      );

    case 'image':
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
      const phaseNames: Record<number, string> = { 1: 'Runde 1', 2: 'Runde 2', 3: 'Finale' };
      return (
        <div style={{
          ...baseStyle,
          fontSize:   `${(el.fontSize ?? 8) * canvasW / 100}px`,
          fontWeight: el.fontWeight ?? 900,
          color:      el.color ?? '#e2e8f0',
          textAlign:  el.textAlign ?? 'center',
          display:    'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {phaseNames[s.gamePhaseIndex] ?? `Phase ${s.gamePhaseIndex}`}
        </div>
      );
    }

    case 'ph_phase_desc': {
      const phaseDescs: Record<number, string> = { 1: 'Felder besetzen', 2: 'Setzen oder Klauen', 3: 'Alles aufs Spiel' };
      return (
        <div style={{
          ...baseStyle,
          fontSize:   `${(el.fontSize ?? 2.5) * canvasW / 100}px`,
          fontWeight: el.fontWeight ?? 700,
          color:      el.color ?? 'rgba(255,255,255,0.6)',
          textAlign:  el.textAlign ?? 'center',
          display:    'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {phaseDescs[s.gamePhaseIndex] ?? ''}
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

    case 'ph_options': {
      if (!q?.options) return null;
      const muchoLabels  = ['A', 'B', 'C', 'D'];
      const MUCHO_COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#22C55E'];
      const cols = cat === 'MUCHO' ? 2 : 3;
      return (
        <div style={{
          ...baseStyle,
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 10, padding: 8,
          alignContent: 'start',
        }}>
          {q.options.map((opt, i) => {
            const optImg    = q.optionImages?.[i];
            const isCorrect = s.phase === 'QUESTION_REVEAL' && i === q.correctOptionIndex;
            const label     = cat === 'MUCHO' ? muchoLabels[i] : `${i + 1}`;
            const optColor  = cat === 'MUCHO' ? MUCHO_COLORS[i] : accent;
            const optText   = lang === 'en' && q.optionsEn?.[i] ? q.optionsEn[i] : opt;
            return (
              <div key={i} style={{
                position: 'relative', overflow: 'hidden',
                borderRadius: 14, padding: '12px 16px',
                background: isCorrect ? 'rgba(34,197,94,0.2)' : '#1B1510',
                border: isCorrect ? '2px solid #22C55E' : `2px solid ${optColor}44`,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                {optImg?.url && (
                  <img src={optImg.url} alt="" style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    objectFit: optImg.fit ?? 'cover', opacity: optImg.opacity ?? 0.4, pointerEvents: 'none',
                  }} />
                )}
                <div style={{
                  position: 'relative', zIndex: 1,
                  width: 30, height: 30, borderRadius: 8,
                  background: isCorrect ? '#22C55E' : optColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 900, color: '#fff', flexShrink: 0,
                }}>{isCorrect ? '✓' : label}</div>
                <div style={{
                  position: 'relative', zIndex: 1,
                  fontSize: `${(el.fontSize ?? 1.6) * canvasW / 100}px`,
                  fontWeight: 800, color: '#F1F5F9', lineHeight: 1.3,
                }}>{optText}</div>
              </div>
            );
          })}
        </div>
      );
    }

    case 'animatedAvatar': {
      const emoji = el.text ?? '✨';
      const animName = el.animType === 'bounce' ? 'cfloata' : 'cfloat';
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

  const visibleElements = overlayOnly
    ? template.elements.filter(el => !el.type.startsWith('ph_'))
    : template.elements;

  return (
    <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', width: '100%', height: '100%' }}>
      <style>{BEAMER_CSS + SLIDE_ANIM_KEYFRAMES}</style>
      {visibleElements.map(el => (
        <CustomSlideElement key={el.id} el={el} state={effectiveState} canvasW={canvasW} lang={lang} />
      ))}
    </div>
  );
}
