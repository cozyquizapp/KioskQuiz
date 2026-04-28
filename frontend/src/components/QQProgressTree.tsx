import { useEffect, useState } from 'react';
import type { QQStateUpdate, QQScheduleEntry, QQGamePhaseIndex } from '../../../shared/quarterQuizTypes';
import { QQ_CATEGORY_LABELS, QQ_CATEGORY_COLORS, QQ_BUNTE_TUETE_LABELS } from '../../../shared/quarterQuizTypes';

type Variant = 'hero' | 'inline' | 'panel' | 'mini' | 'showcase';

interface Props {
  state: QQStateUpdate;
  variant?: Variant; // hero = groß zentriert (PHASE_INTRO/Rules), inline = Overlay (QUESTION_ACTIVE), panel = Pausen-Rotation, showcase = Roadmap-Vorstellung mit Phasen-Sweep
  title?: string;
  /** Wenn true: zeigt Spotlight-Sweep über alle Phasen statt der state.questionIndex-Position. */
  showcaseMode?: boolean;
  /** Sweep-Geschwindigkeit pro Phase in ms (default 2200). */
  showcaseStepMs?: number;
}

// Quiz-Runden heißen immer „Runde N". Das echte Finale ist seit Connections
// das 4×4-Mini-Game — wird separat als Bonus-Knoten am Tree-Ende gerendert.
const PHASE_LABELS_DE: Record<QQGamePhaseIndex, string> = {
  1: 'Runde 1',
  2: 'Runde 2',
  3: 'Runde 3',
  4: 'Runde 4',
};
const PHASE_LABELS_EN: Record<QQGamePhaseIndex, string> = {
  1: 'Round 1',
  2: 'Round 2',
  3: 'Round 3',
  4: 'Round 4',
};

export default function QQProgressTree({
  state,
  variant = 'hero',
  title,
  showcaseMode = false,
  showcaseStepMs = 2200,
}: Props) {
  const schedule = state.schedule ?? [];
  if (schedule.length === 0) return null;

  const lang = state.language === 'en' ? 'en' : 'de';
  const phaseLabels = lang === 'en' ? PHASE_LABELS_EN : PHASE_LABELS_DE;
  const totalPhases = state.totalPhases || 4;

  // Showcase-Sweep: cycelt durch alle Phasen + Finale, hebt jede ~2.2s lang
  // hervor. Index -1 = Pause, 0..totalPhases-1 = Quiz-Phase, totalPhases =
  // Großes Finale (falls connectionsEnabled).
  const showcaseHasFinale = state.connectionsEnabled !== false;
  const showcaseStepCount = totalPhases + (showcaseHasFinale ? 1 : 0);
  const [showcasePhaseIdx, setShowcasePhaseIdx] = useState<number>(-1);
  useEffect(() => {
    if (!showcaseMode) return;
    let i = -1;
    const tick = () => {
      i = (i + 1) % (showcaseStepCount + 1); // +1 für initialen Pause-Step
      setShowcasePhaseIdx(i - 1); // -1 = Pause, 0..n-1 = Phase / Finale
    };
    tick();
    const id = setInterval(tick, showcaseStepMs);
    return () => clearInterval(id);
  }, [showcaseMode, totalPhases, showcaseHasFinale, showcaseStepCount, showcaseStepMs]);
  const showcaseOnFinale = showcaseMode && showcaseHasFinale && showcasePhaseIdx === totalPhases;

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
  const isShowcase = variant === 'showcase';

  // Skalen je nach Variant
  const scale = isShowcase ? 2.4
    : variant === 'hero' ? 1
    : variant === 'panel' ? 0.8
    : isMini ? 0.42
    : 0.95;
  const titleSize = isShowcase ? 44 : variant === 'hero' ? 34 : variant === 'panel' ? 22 : 20;
  const phaseNameSize = isShowcase ? 34 : variant === 'hero' ? 18 : variant === 'panel' ? 14 : 15;
  const dotSize = Math.round(34 * scale);
  const dotGap = isMini ? 4 : Math.round(12 * scale);
  const phaseGap = isMini ? 14 : Math.round(40 * scale);
  const showLabels = !isMini;

  const phases: QQGamePhaseIndex[] = [];
  for (let p = 1 as QQGamePhaseIndex; p <= totalPhases; p = (p + 1) as QQGamePhaseIndex) phases.push(p);

  // Berechne exakte x-Positionen aller Dots (für Progress-Track)
  // + phaseCenters für die Showcase-Pan-Animation (Camera fliegt zu Phase).
  const dotCenters: number[] = [];
  const phaseWidths: number[] = [];
  const phaseCenters: number[] = [];
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
    phaseCenters.push(phaseStart + (cursor - phaseStart) / 2);
  });
  // Finale-Knoten am Ende: 35% größeres Dot + Trenner-Linie davor.
  const showFinale = state.connectionsEnabled !== false;
  const finaleDotSize = Math.round(dotSize * 1.35);
  const finaleConnectorWidth = Math.round(dotSize * 0.4);
  let finaleCenter = 0;
  if (showFinale) {
    cursor += phaseGap;
    cursor += finaleConnectorWidth;
    cursor += 6; // gap zwischen Connector und Finale-Knoten (siehe JSX)
    finaleCenter = cursor + finaleDotSize / 2;
    cursor += finaleDotSize;
  }
  const totalWidth = cursor;
  const treeCenter = totalWidth / 2;

  // Showcase-Pan: bringt die hervorgehobene Phase (oder Finale) ins Viewport-
  // Zentrum. -1 (Pause-Step) zeigt erstmal Phase 0 zentriert.
  const showcaseTargetPhase = showcaseMode
    ? (showcasePhaseIdx >= 0 ? showcasePhaseIdx : 0)
    : -1;
  const showcaseTargetCenter = isShowcase
    ? (showcaseOnFinale ? finaleCenter : phaseCenters[showcaseTargetPhase] ?? null)
    : null;
  const panOffset = (showcaseTargetCenter != null)
    ? treeCenter - showcaseTargetCenter
    : 0;

  // Progress: von Center des ersten Dots bis Center des Wolf-Dots (displayIdx).
  const firstCenter = dotCenters[0] ?? 0;
  const lastCenter = dotCenters[dotCenters.length - 1] ?? 0;

  // Im Showcase-Mode wandert der Wolf MIT der Phasen-Highlight-Sweep mit:
  // pro highlighteter Phase steht er am LETZTEN Dot dieser Phase.
  const showcaseWolfIdx = (() => {
    if (!showcaseMode || showcasePhaseIdx < 0) return 0;
    let cum = 0;
    for (let pi = 0; pi <= showcasePhaseIdx; pi++) {
      const phaseEntries = byPhase.get(phases[pi]) ?? [];
      cum += phaseEntries.length;
    }
    return Math.max(0, cum - 1);
  })();
  const effectiveDisplayIdx = showcaseMode ? showcaseWolfIdx : displayIdx;
  const wolfDotIdx = Math.max(0, Math.min(effectiveDisplayIdx, dotCenters.length - 1));
  // Wolf-Position: bei CONNECTIONS_4X4 (oder GAME_OVER nach Finale) UND im
  // Showcase-Last-Step sitzt der Wolf auf dem Finale-Knoten. Sonst auf
  // dem aktuellen Quiz-Dot.
  const wolfOnFinale = showFinale && (showcaseOnFinale
    || state.phase === 'CONNECTIONS_4X4' || state.phase === 'GAME_OVER' || state.phase === 'THANKS');
  const currentCenter = wolfOnFinale ? finaleCenter : (dotCenters[wolfDotIdx] ?? firstCenter);
  const trackStart = firstCenter;
  const trackEnd = wolfOnFinale ? finaleCenter : lastCenter;
  const progressEnd = Math.max(trackStart, Math.min(currentCenter, trackEnd));

  const trackBg = variant === 'inline' ? 'rgba(148,163,184,0.28)' : 'rgba(148,163,184,0.35)';
  const progressColor = '#FBBF24'; // Amber — markiert Fortschritt

  const wrapperBg = isShowcase
    ? 'transparent'
    : isMini
      ? 'rgba(15,23,42,0.55)'
      : variant === 'inline'
        ? 'linear-gradient(180deg, rgba(15,23,42,0.92), rgba(15,23,42,0.82))'
        : 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.92))';
  const wrapperBorder = isShowcase
    ? 'none'
    : isMini
      ? '1px solid rgba(148,163,184,0.18)'
      : variant === 'inline'
        ? '1px solid rgba(148,163,184,0.3)'
        : '2px solid #e2e8f0';
  const wrapperColor = (isMini || variant === 'inline' || isShowcase) ? '#f8fafc' : '#0f172a';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: isShowcase ? 32 : variant === 'hero' ? 22 : isMini ? 0 : 14,
        // Showcase: kein horizontales Padding — der Pan-Container nimmt
        // die volle Breite ein und cliped durch overflow:hidden.
        padding: isShowcase ? '20px 0'
          : variant === 'hero' ? '28px 40px'
          : variant === 'inline' ? '20px 36px'
          : isMini ? '6px 14px'
          : '16px 24px',
        borderRadius: isMini ? 999 : 20,
        background: wrapperBg,
        color: wrapperColor,
        boxShadow: isShowcase ? 'none' : isMini ? '0 4px 12px rgba(0,0,0,0.35)' : '0 10px 32px rgba(15,23,42,0.18)',
        border: wrapperBorder,
        // Showcase: volle Container-Breite (Pan-Camera fliegt smooth durch).
        width: isShowcase ? '100%' : undefined,
        maxWidth: isShowcase ? '100%' : variant === 'hero' ? 1200 : variant === 'inline' ? 1400 : isMini ? 720 : 920,
        // Showcase: outer cliped damit gepannte Tree-Teile außerhalb verschwinden.
        overflow: isShowcase ? 'hidden' : undefined,
        fontFamily: "'Nunito', system-ui, sans-serif",
        backdropFilter: isMini ? 'blur(8px)' : undefined,
      }}
    >
      {title && (
        <div style={{ fontSize: titleSize, fontWeight: 900, letterSpacing: 0.5 }}>
          {title}
        </div>
      )}

      {/* Container mit exakter Gesamtbreite — Labels + Timeline teilen sie sich.
          Im Showcase-Mode wird zusätzlich translateX gesetzt, damit der Tree
          smooth zur hervorgehobenen Phase gepant wird (Camera-Fly-Through). */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: isMini ? 0 : 10,
        width: totalWidth,
        maxWidth: isShowcase ? 'none' : '100%',
        transform: isShowcase ? `translateX(${panOffset}px)` : undefined,
        transition: isShowcase ? 'transform 1.4s cubic-bezier(0.65, 0, 0.35, 1)' : undefined,
        willChange: isShowcase ? 'transform' : undefined,
      }}>
        {/* Phasen-Labels — jeweils über ihrer Dot-Gruppe zentriert (nicht im mini-Mode) */}
        {showLabels && (
        <div style={{ display: 'flex', gap: phaseGap, width: totalWidth }}>
          {phases.map((p, pi) => {
            const isCurrentPhase = showcaseMode
              ? pi === showcasePhaseIdx
              : state.gamePhaseIndex === p;
            return (
              <div
                key={p}
                style={{
                  width: phaseWidths[pi],
                  textAlign: 'center',
                  fontSize: phaseNameSize,
                  fontWeight: 900,
                  color: isCurrentPhase
                    ? (isShowcase ? '#FBBF24' : variant === 'inline' ? '#FBBF24' : '#b45309')
                    : (isShowcase ? '#6b6555' : variant === 'inline' ? '#94a3b8' : '#64748b'),
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                  flexShrink: 0,
                  textShadow: (isShowcase && isCurrentPhase) ? '0 0 18px rgba(251,191,36,0.6)' : 'none',
                  transform: (isShowcase && isCurrentPhase) ? 'translateY(-2px)' : 'translateY(0)',
                  transition: 'all 0.4s cubic-bezier(0.22,1,0.36,1)',
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
            const isShowcasedPhase = showcaseMode && pi === showcasePhaseIdx;
            return (
              <div key={p} style={{ display: 'flex', gap: dotGap, alignItems: 'center', position: 'relative', zIndex: 2 }}>
                {entries.map((e, i) => {
                  const globalIdx = phaseStartIdx + i;
                  const isPast = !showcaseMode && globalIdx < displayIdx;
                  const isCurrent = globalIdx === effectiveDisplayIdx;
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
                          : isShowcasedPhase
                            ? `${color}33`
                            : isPast
                              ? ((variant === 'inline' || isMini) ? 'rgba(148,163,184,0.18)' : '#e2e8f0')
                              : ((variant === 'inline' || isMini || isShowcase) ? 'rgba(30,41,59,0.85)' : '#f1f5f9'),
                        color: isShowcasedPhase
                          ? '#fef3c7'
                          : isPast
                            ? ((variant === 'inline' || isMini) ? '#94a3b8' : '#94a3b8')
                            : ((variant === 'inline' || isMini || isShowcase) ? '#cbd5e1' : '#64748b'),
                        border: isCurrent
                          ? 'none'
                          : isShowcasedPhase
                            ? `2px solid ${color}`
                            : isPast
                              ? 'none'
                              : ((variant === 'inline' || isMini || isShowcase) ? '1.5px solid rgba(148,163,184,0.35)' : '2px solid #e2e8f0'),
                        boxShadow: isShowcasedPhase
                          ? `0 0 18px ${color}88, 0 0 36px ${color}44`
                          : 'none',
                        opacity: isCurrent ? 0 : isPast ? 0.55 : 1,
                        filter: isPast ? 'grayscale(1)' : 'none',
                        transform: isShowcasedPhase ? 'scale(1.18)' : 'scale(1)',
                        transition: 'all 0.45s cubic-bezier(0.22,1,0.36,1)',
                      }}
                    >
                      {emoji}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Großes Finale (4×4 Connections) — separater Bonus-Knoten am
              Tree-Ende. Goldenes 🧩-Dot mit Glow, größer als Quiz-Dots
              (klare Hierarchie: das ist DAS Highlight). User-Wunsch
              2026-04-28: 'Finale soll im Progress-Tree sichtbar sein'. */}
          {state.connectionsEnabled !== false && (() => {
            const finaleSize = Math.round(dotSize * 1.35);
            const finaleColor = '#A78BFA';
            // Aktiv = real während CONNECTIONS_4X4 ODER Showcase-Last-Step.
            const isFinaleActive = state.phase === 'CONNECTIONS_4X4' || showcaseOnFinale;
            const isFinalePast = state.phase === 'GAME_OVER' || state.phase === 'THANKS';
            return (
              <div style={{
                marginLeft: phaseGap, // gleicher Abstand wie zwischen Phasen
                display: 'flex', alignItems: 'center', gap: 6,
                position: 'relative', zIndex: 2,
              }}>
                {/* Trenner-Strich vom letzten Dot zum Finale-Dot */}
                <div style={{
                  width: Math.round(dotSize * 0.4), height: 2,
                  background: 'linear-gradient(90deg, rgba(148,163,184,0.4), rgba(167,139,250,0.6))',
                  borderRadius: 2,
                }} />
                <div
                  title={lang === 'de' ? 'Großes Finale (4×4)' : 'Grand Finale (4×4)'}
                  style={{
                    width: finaleSize,
                    height: finaleSize,
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: Math.round(finaleSize * 0.55),
                    background: isFinaleActive
                      ? finaleColor
                      : isFinalePast
                        ? 'rgba(167,139,250,0.25)'
                        : `linear-gradient(135deg, ${finaleColor}33, ${finaleColor}11)`,
                    border: `2.5px solid ${isFinaleActive ? '#fff' : finaleColor}`,
                    boxShadow: isFinaleActive
                      ? `0 0 0 4px ${finaleColor}55, 0 6px 14px ${finaleColor}88, 0 0 28px ${finaleColor}aa`
                      : isFinalePast
                        ? 'none'
                        : `0 0 14px ${finaleColor}55`,
                    opacity: isFinalePast ? 0.55 : 1,
                    filter: isFinalePast ? 'grayscale(1)' : 'none',
                    animation: isFinaleActive ? 'qqTreePulse 1.6s ease-in-out infinite' : undefined,
                    transition: 'all 0.45s cubic-bezier(0.22,1,0.36,1)',
                  }}
                >🧩</div>
              </div>
            );
          })()}

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
                background: '#1a1209',
                backgroundImage: 'url(/logo.png)',
                backgroundSize: '112%',
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
