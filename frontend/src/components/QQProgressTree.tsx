import { useEffect, useState } from 'react';
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

  // Wolf-Hop: bei Wechsel des currentIdx kurz auf altem Dot stehen bleiben,
  // dann nach kurzem Delay zum neuen Dot springen (parallel zur Page-Entrance).
  const [displayIdx, setDisplayIdx] = useState(currentIdx);
  const [hopping, setHopping] = useState(false);
  useEffect(() => {
    if (displayIdx === currentIdx) return;
    setHopping(false);
    const t1 = setTimeout(() => {
      setDisplayIdx(currentIdx);
      setHopping(true);
    }, 220);
    const t2 = setTimeout(() => setHopping(false), 220 + 620);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx]);

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

  // Progress: von Center des ersten Dots bis Center des Wolf-Dots (displayIdx).
  const firstCenter = dotCenters[0] ?? 0;
  const lastCenter = dotCenters[dotCenters.length - 1] ?? 0;
  const wolfDotIdx = Math.max(0, Math.min(displayIdx, dotCenters.length - 1));
  const currentCenter = dotCenters[wolfDotIdx] ?? firstCenter;
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

          {/* Dots — Flex-Layout, genau mit Berechnung oben synchron.
              Current = unsichtbarer Platzhalter (Wolf sitzt drauf).
              Past = ausgegrautes Kategorie-Emoji (kein altbackenes ✓ mehr).
              Future = dunkler Slot mit Kategorie-Emoji. */}
          {phases.map((p, pi) => {
            const entries = byPhase.get(p) ?? [];
            const phaseStartIdx = schedule.findIndex((e) => e.phase === p);
            return (
              <div key={p} style={{ display: 'flex', gap: dotGap, alignItems: 'center', position: 'relative', zIndex: 2 }}>
                {entries.map((e, i) => {
                  const globalIdx = phaseStartIdx + i;
                  const isPast = globalIdx < displayIdx;
                  const isCurrent = globalIdx === displayIdx;
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
                          ? 'transparent'
                          : isPast
                            ? ((variant === 'inline' || isMini) ? 'rgba(148,163,184,0.18)' : '#e2e8f0')
                            : ((variant === 'inline' || isMini) ? 'rgba(30,41,59,0.85)' : '#f1f5f9'),
                        color: isPast
                          ? ((variant === 'inline' || isMini) ? '#94a3b8' : '#94a3b8')
                          : ((variant === 'inline' || isMini) ? '#cbd5e1' : '#64748b'),
                        border: isCurrent
                          ? 'none'
                          : isPast
                            ? 'none'
                            : ((variant === 'inline' || isMini) ? '1.5px solid rgba(148,163,184,0.35)' : '2px solid #e2e8f0'),
                        boxShadow: 'none',
                        opacity: isCurrent ? 0 : isPast ? 0.55 : 1,
                        filter: isPast ? 'grayscale(1)' : 'none',
                        transition: 'opacity 320ms ease, filter 320ms ease, background 320ms ease',
                      }}
                    >
                      {emoji}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Wolf-Avatar — sitzt auf dem aktuellen Dot, springt bei Wechsel
              im Bogen zum neuen Dot (gleiche Geste wie RoundMiniTree). */}
          {dotCenters.length > 0 && (() => {
            const currentSchedule = schedule[wolfDotIdx];
            const wolfColor = currentSchedule ? QQ_CATEGORY_COLORS[currentSchedule.category] : '#FBBF24';
            const wolfSize = Math.round(dotSize * 1.35);
            return (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: currentCenter,
                width: wolfSize,
                height: wolfSize,
                borderRadius: '50%',
                background: '#fff',
                backgroundImage: 'url(/logo.png)',
                backgroundSize: '100%',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                border: `${isMini ? 2 : 3}px solid ${wolfColor}`,
                boxShadow: `0 0 0 ${isMini ? 3 : 4}px ${wolfColor}40, 0 6px 16px ${wolfColor}66`,
                transform: 'translate(-50%, -50%)',
                transition: 'left 620ms cubic-bezier(0.34, 1.25, 0.64, 1), border-color 400ms ease, box-shadow 400ms ease',
                animation: hopping ? 'roundMiniHop 620ms cubic-bezier(0.4,0,0.2,1) both' : undefined,
                zIndex: 3,
                pointerEvents: 'none',
              }} />
            );
          })()}
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
