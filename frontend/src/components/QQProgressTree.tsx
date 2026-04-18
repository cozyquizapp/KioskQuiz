import type { QQStateUpdate, QQScheduleEntry, QQGamePhaseIndex } from '../../../shared/quarterQuizTypes';
import { QQ_CATEGORY_LABELS, QQ_CATEGORY_COLORS, QQ_BUNTE_TUETE_LABELS } from '../../../shared/quarterQuizTypes';

type Variant = 'hero' | 'inline' | 'panel' | 'mini';

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

  const isMini = variant === 'mini';

  // Skalen je nach Variant
  const scale = variant === 'hero' ? 1
    : variant === 'panel' ? 0.8
    : isMini ? 0.42
    : 0.95;
  const titleSize = variant === 'hero' ? 34 : variant === 'panel' ? 22 : 20;
  const phaseNameSize = variant === 'hero' ? 18 : variant === 'panel' ? 14 : 15;
  const dotSize = Math.round(34 * scale);
  const dotGap = isMini ? 4 : Math.round(12 * scale);
  const phaseGap = isMini ? 14 : Math.round(40 * scale);
  const showLabels = !isMini;

  const phases: QQGamePhaseIndex[] = [];
  for (let p = 1 as QQGamePhaseIndex; p <= totalPhases; p = (p + 1) as QQGamePhaseIndex) phases.push(p);

  // Berechne exakte x-Positionen aller Dots (für Progress-Track)
  const dotCenters: number[] = [];
  const phaseWidths: number[] = [];
  let cursor = 0;
  phases.forEach((p, pIdx) => {
    if (pIdx > 0) cursor += phaseGap;
    const entries = byPhase.get(p) ?? [];
    const phaseStart = cursor;
    entries.forEach((_e, i) => {
      if (i > 0) cursor += dotGap;
      dotCenters.push(cursor + dotSize / 2);
      cursor += dotSize;
    });
    phaseWidths.push(cursor - phaseStart);
  });
  const totalWidth = cursor;

  // Progress: von Center des ersten Dots bis Center des aktuellen Dots
  const firstCenter = dotCenters[0] ?? 0;
  const lastCenter = dotCenters[dotCenters.length - 1] ?? 0;
  const currentCenter = dotCenters[Math.max(0, Math.min(currentIdx, dotCenters.length - 1))] ?? firstCenter;
  const trackStart = firstCenter;
  const trackEnd = lastCenter;
  const progressEnd = Math.max(trackStart, Math.min(currentCenter, trackEnd));

  const trackBg = variant === 'inline' ? 'rgba(148,163,184,0.28)' : 'rgba(148,163,184,0.35)';
  const progressColor = '#FBBF24'; // Amber — markiert Fortschritt

  const wrapperBg = isMini
    ? 'rgba(15,23,42,0.55)'
    : variant === 'inline'
      ? 'linear-gradient(180deg, rgba(15,23,42,0.92), rgba(15,23,42,0.82))'
      : 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.92))';
  const wrapperBorder = isMini
    ? '1px solid rgba(148,163,184,0.18)'
    : variant === 'inline'
      ? '1px solid rgba(148,163,184,0.3)'
      : '2px solid #e2e8f0';
  const wrapperColor = (isMini || variant === 'inline') ? '#f8fafc' : '#0f172a';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: variant === 'hero' ? 22 : isMini ? 0 : 14,
        padding: variant === 'hero' ? '28px 40px'
          : variant === 'inline' ? '20px 36px'
          : isMini ? '6px 14px'
          : '16px 24px',
        borderRadius: isMini ? 999 : 20,
        background: wrapperBg,
        color: wrapperColor,
        boxShadow: isMini ? '0 4px 12px rgba(0,0,0,0.35)' : '0 10px 32px rgba(15,23,42,0.18)',
        border: wrapperBorder,
        maxWidth: variant === 'hero' ? 1200 : variant === 'inline' ? 1400 : isMini ? 720 : 920,
        fontFamily: "'Nunito', system-ui, sans-serif",
        backdropFilter: isMini ? 'blur(8px)' : undefined,
      }}
    >
      {title && (
        <div style={{ fontSize: titleSize, fontWeight: 900, letterSpacing: 0.5 }}>
          {title}
        </div>
      )}

      {/* Container mit exakter Gesamtbreite — Labels + Timeline teilen sie sich */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMini ? 0 : 10, width: totalWidth, maxWidth: '100%' }}>
        {/* Phasen-Labels — jeweils über ihrer Dot-Gruppe zentriert (nicht im mini-Mode) */}
        {showLabels && (
        <div style={{ display: 'flex', gap: phaseGap, width: totalWidth }}>
          {phases.map((p, pi) => {
            const isCurrentPhase = state.gamePhaseIndex === p;
            return (
              <div
                key={p}
                style={{
                  width: phaseWidths[pi],
                  textAlign: 'center',
                  fontSize: phaseNameSize,
                  fontWeight: 800,
                  color: isCurrentPhase
                    ? (variant === 'inline' ? '#FBBF24' : '#b45309')
                    : (variant === 'inline' ? '#94a3b8' : '#64748b'),
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                  flexShrink: 0,
                }}
              >
                {phaseLabels[p]}
              </div>
            );
          })}
        </div>
        )}

        {/* Subway-Timeline — Track hinter allen Dots, Progress in Amber */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: phaseGap,
          width: totalWidth,
          height: Math.round(dotSize * 1.3), // Platz für Scale 1.15 + Glow
        }}>
          {/* Track: grau, von erstem bis letztem Dot-Center */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: trackStart,
            width: Math.max(0, trackEnd - trackStart),
            height: isMini ? 2 : 3,
            background: trackBg,
            borderRadius: 2,
            transform: 'translateY(-50%)',
            zIndex: 0,
          }} />
          {/* Progress: amber, bis aktuelles Dot-Center */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: trackStart,
            width: Math.max(0, progressEnd - trackStart),
            height: isMini ? 2 : 3,
            background: `linear-gradient(90deg, ${progressColor}, #F59E0B)`,
            borderRadius: 2,
            transform: 'translateY(-50%)',
            boxShadow: `0 0 10px ${progressColor}99`,
            transition: 'width 600ms cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 1,
          }} />

          {/* Dots — Flex-Layout, genau mit Berechnung oben synchron */}
          {phases.map((p, pi) => {
            const entries = byPhase.get(p) ?? [];
            const phaseStartIdx = schedule.findIndex((e) => e.phase === p);
            return (
              <div key={p} style={{ display: 'flex', gap: dotGap, alignItems: 'center', position: 'relative', zIndex: 2 }}>
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
                            ? ((variant === 'inline' || isMini) ? 'rgba(148,163,184,0.45)' : '#cbd5e1')
                            : ((variant === 'inline' || isMini) ? 'rgba(30,41,59,0.85)' : '#f1f5f9'),
                        color: isCurrent ? '#fff' : isPast ? '#fff' : ((variant === 'inline' || isMini) ? '#cbd5e1' : '#64748b'),
                        border: isCurrent
                          ? (isMini ? `2px solid #fff` : `3px solid #fff`)
                          : isPast
                            ? 'none'
                            : ((variant === 'inline' || isMini) ? '1.5px solid rgba(148,163,184,0.35)' : '2px solid #e2e8f0'),
                        boxShadow: isCurrent
                          ? (isMini ? `0 0 0 2px ${color}66` : `0 0 0 4px ${color}55, 0 6px 14px ${color}66`)
                          : isPast
                            ? '0 2px 6px rgba(0,0,0,0.15)'
                            : 'none',
                        transform: isCurrent ? (isMini ? 'scale(1.1)' : 'scale(1.15)') : 'scale(1)',
                        transition: 'transform 200ms ease, box-shadow 200ms ease',
                        animation: (isCurrent && !isMini) ? 'qqTreePulse 1.6s ease-in-out infinite' : 'none',
                      }}
                    >
                      {isPast ? '✓' : emoji}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
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
