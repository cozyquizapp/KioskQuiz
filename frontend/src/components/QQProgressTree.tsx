import type { QQStateUpdate, QQScheduleEntry, QQGamePhaseIndex } from '../../../shared/quarterQuizTypes';
import { QQ_CATEGORY_LABELS, QQ_CATEGORY_COLORS, QQ_BUNTE_TUETE_LABELS } from '../../../shared/quarterQuizTypes';

type Variant = 'hero' | 'inline' | 'panel';

interface Props {
  state: QQStateUpdate;
  variant?: Variant; // hero = groß zentriert (PHASE_INTRO/Rules), inline = Overlay (QUESTION_ACTIVE), panel = Pausen-Rotation
  title?: string;
}

const PHASE_LABELS_DE: Record<QQGamePhaseIndex, string> = {
  1: 'Runde 1',
  2: 'Runde 2',
  3: 'Runde 3',
  4: 'Finale',
};
const PHASE_LABELS_EN: Record<QQGamePhaseIndex, string> = {
  1: 'Round 1',
  2: 'Round 2',
  3: 'Round 3',
  4: 'Finale',
};

export default function QQProgressTree({ state, variant = 'hero', title }: Props) {
  const schedule = state.schedule ?? [];
  if (schedule.length === 0) return null;

  const lang = state.language === 'en' ? 'en' : 'de';
  const phaseLabels = lang === 'en' ? PHASE_LABELS_EN : PHASE_LABELS_DE;
  const totalPhases = state.totalPhases || 4;

  // Gruppiere Schedule-Einträge nach Phase
  const byPhase = new Map<QQGamePhaseIndex, QQScheduleEntry[]>();
  schedule.forEach((e) => {
    const list = byPhase.get(e.phase) ?? [];
    list.push(e);
    byPhase.set(e.phase, list);
  });

  const currentIdx = state.questionIndex;

  // Skalen je nach Variant
  const scale = variant === 'hero' ? 1 : variant === 'panel' ? 0.8 : 0.95;
  const titleSize = variant === 'hero' ? 34 : variant === 'panel' ? 22 : 20;
  const phaseNameSize = variant === 'hero' ? 22 : variant === 'panel' ? 16 : 18;
  const dotSize = Math.round(34 * scale);
  const dotGap = Math.round(12 * scale);
  const phaseGap = Math.round(56 * scale);

  const phases: QQGamePhaseIndex[] = [];
  for (let p = 1 as QQGamePhaseIndex; p <= totalPhases; p = (p + 1) as QQGamePhaseIndex) phases.push(p);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: variant === 'hero' ? 22 : 14,
        padding: variant === 'hero' ? '28px 40px' : variant === 'inline' ? '20px 36px' : '16px 24px',
        borderRadius: 20,
        background: variant === 'inline'
          ? 'linear-gradient(180deg, rgba(15,23,42,0.92), rgba(15,23,42,0.82))'
          : 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.92))',
        color: variant === 'inline' ? '#f8fafc' : '#0f172a',
        boxShadow: '0 10px 32px rgba(15,23,42,0.18)',
        border: variant === 'inline' ? '1px solid rgba(148,163,184,0.3)' : '2px solid #e2e8f0',
        maxWidth: variant === 'hero' ? 1200 : variant === 'inline' ? 1400 : 920,
        fontFamily: "'Nunito', system-ui, sans-serif",
      }}
    >
      {title && (
        <div style={{ fontSize: titleSize, fontWeight: 900, letterSpacing: 0.5 }}>
          {title}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: phaseGap,
          flexWrap: 'nowrap',
          maxWidth: '100%',
        }}
      >
        {phases.map((p, pi) => {
          const entries = byPhase.get(p) ?? [];
          const phaseStartIdx = schedule.findIndex((e) => e.phase === p);
          const isCurrentPhase = state.gamePhaseIndex === p;
          return (
            <div key={p} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    fontSize: phaseNameSize,
                    fontWeight: 800,
                    color: isCurrentPhase
                      ? (variant === 'inline' ? '#fbbf24' : '#b45309')
                      : (variant === 'inline' ? '#94a3b8' : '#64748b'),
                    letterSpacing: 0.3,
                    textTransform: 'uppercase',
                  }}
                >
                  {phaseLabels[p]}
                </div>
                <div style={{ display: 'flex', gap: dotGap, alignItems: 'center' }}>
                  {entries.map((e, i) => {
                    const globalIdx = phaseStartIdx + i;
                    const isPast = globalIdx < currentIdx;
                    const isCurrent = globalIdx === currentIdx;
                    const color = QQ_CATEGORY_COLORS[e.category];
                    const label = QQ_CATEGORY_LABELS[e.category];
                    const emoji = e.bunteTueteKind
                      ? QQ_BUNTE_TUETE_LABELS[e.bunteTueteKind].emoji
                      : label.emoji;
                    return (
                      <div
                        key={i}
                        title={`${phaseLabels[p]} · ${label[lang]}`}
                        style={{
                          width: dotSize,
                          height: dotSize,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: Math.round(dotSize * 0.55),
                          fontWeight: 800,
                          background: isCurrent
                            ? color
                            : isPast
                              ? (variant === 'inline' ? 'rgba(148,163,184,0.35)' : '#cbd5e1')
                              : (variant === 'inline' ? 'rgba(71,85,105,0.55)' : '#f1f5f9'),
                          color: isCurrent ? '#fff' : isPast ? '#fff' : (variant === 'inline' ? '#cbd5e1' : '#64748b'),
                          border: isCurrent ? `3px solid #fff` : `2px solid ${isPast ? 'transparent' : (variant === 'inline' ? 'rgba(148,163,184,0.3)' : '#e2e8f0')}`,
                          boxShadow: isCurrent
                            ? `0 0 0 4px ${color}55, 0 6px 14px ${color}66`
                            : 'none',
                          transform: isCurrent ? 'scale(1.15)' : 'scale(1)',
                          transition: 'transform 200ms ease, box-shadow 200ms ease',
                          animation: isCurrent ? 'qqTreePulse 1.6s ease-in-out infinite' : 'none',
                        }}
                      >
                        {isPast ? '✓' : emoji}
                      </div>
                    );
                  })}
                </div>
              </div>
              {pi < phases.length - 1 && (
                <div
                  style={{
                    width: phaseGap * 0.8,
                    height: 2,
                    background: variant === 'inline' ? 'rgba(148,163,184,0.35)' : '#cbd5e1',
                    marginTop: phaseNameSize + 16 + dotSize / 2,
                    marginLeft: -phaseGap * 0.4,
                    marginRight: -phaseGap * 0.4,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes qqTreePulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(251,191,36,0.35), 0 6px 14px rgba(0,0,0,0.2); }
          50%      { box-shadow: 0 0 0 10px rgba(251,191,36,0.10), 0 6px 14px rgba(0,0,0,0.2); }
        }
      `}</style>
    </div>
  );
}
