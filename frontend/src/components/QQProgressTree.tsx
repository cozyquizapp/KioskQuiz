import { useEffect, useState } from 'react';
import type { QQStateUpdate, QQScheduleEntry, QQGamePhaseIndex } from '../../../shared/quarterQuizTypes';
import { QQ_CATEGORY_LABELS, QQ_CATEGORY_COLORS, QQ_BUNTE_TUETE_LABELS } from '../../../shared/quarterQuizTypes';
import { QQ_PHASE_COLORS, getRoundColor } from '../qqDesignTokens';
import { QQ_COLORS } from '../../../shared/qqColors';
import { isThemed, getActiveTheme } from '../qqTheme';
import { QQIcon, qqCatSlug, qqSubSlug } from './QQIcon';

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

  // Showcase-Sweep „Option B" (Wolf 2026-05-17): pro Dot ein Sub-Step.
  // Wolf wandert durch JEDEN Dot der aktuellen Phase (~650ms/Dot), macht bei
  // Phase-Wechsel einen Bogen-Sprung (translateY-Arc via qqWolfBowHop), und
  // stoppt länger an Spezial-Knoten (CG/Bid/Finale) damit deren Pulse atmen
  // kann. State + Helpers werden weiter unten gebaut (nach byPhase/phases/
  // Toggle-Deklarationen) — hier nur der useState-Pin damit Hook-Order stabil
  // bleibt. `showcaseStepMs` ist seit Option B nur noch Fallback-Hinweis.
  const [showcasePhaseIdx, setShowcasePhaseIdx] = useState<number>(-1);

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

  // ── Toggles (Bid/Finale/CozyGames) — vorgezogen, weil subSteps + Layout
  // beide darauf basieren. `=== true` statt `!== false`, sonst leakt
  // undefined-State (vor erstem State-Update) als „sichtbar" (Wolf 2026-05-11).
  const showBidding = state.finalWagerEnabled === true;
  const showFinale  = state.connectionsEnabled === true;
  // 2026-05-17 (Wolf-Feature CozyGames): Knoten nach JEDER Non-Final-Runde
  // (Wolf-Spec "nach jeder Runde"). Bei 4-Phasen: nach 1, 2, 3.
  const showCozyGames = !!(state as any).cozyGamesEnabled
    && Array.isArray((state as any).cozyGamesPool)
    && (state as any).cozyGamesPool.length > 0;
  const DEFAULT_DOTS_PER_PHASE = 5;

  // ── Showcase-Sweep „Option B" (Wolf 2026-05-17): per-Dot SubSteps ────────
  // Vorher: 1 Step pro Phase, Wolf hopt jeweils nur ans Phasen-Ende.
  // Jetzt: pro Dot ein Step, Wolf wandert smooth durch die Phase und macht
  // bei Phase-/Block-Wechsel einen Bogen-Sprung (translateY-Arc).
  //
  // SubStep-Reihenfolge (4-Phasen + cg+bid+finale):
  //   Phase 0: 5× dot
  //   → cg (zwischen Runde 1 und 2)
  //   Phase 1: 5× dot
  //   → cg
  //   Phase 2: 5× dot
  //   → cg
  //   → bid (vor letzter Runde, nur wenn showBidding)
  //   Phase 3: 5× dot
  //   → finale (nur wenn showFinale)
  type SubStep =
    | { kind: 'dot'; phaseIdx: number; globalDotIdx: number }
    | { kind: 'cg'; pi: number }     // pi = Key in cozyGameCentersByPi (zw. Phase pi-1 und pi)
    | { kind: 'bid' }
    | { kind: 'finale' };

  const subSteps: SubStep[] = [];
  phases.forEach((p, pIdx) => {
    if (showCozyGames && pIdx >= 1) {
      subSteps.push({ kind: 'cg', pi: pIdx });
    }
    if (showBidding && pIdx === phases.length - 1 && pIdx > 0) {
      subSteps.push({ kind: 'bid' });
    }
    const entries = byPhase.get(p) ?? [];
    const renderCount = entries.length > 0 ? entries.length : DEFAULT_DOTS_PER_PHASE;
    const phaseStart = schedule.findIndex(e => e.phase === p);
    for (let i = 0; i < renderCount; i++) {
      subSteps.push({
        kind: 'dot',
        phaseIdx: pIdx,
        globalDotIdx: phaseStart >= 0 ? phaseStart + i : -1,
      });
    }
  });
  if (showFinale) subSteps.push({ kind: 'finale' });
  const subStepCount = subSteps.length;

  useEffect(() => {
    if (!showcaseMode) return;
    if (subStepCount === 0) return;
    setShowcasePhaseIdx(-1);
    let step = -1;
    let id: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      step += 1;
      if (step >= subStepCount) {
        // Nach komplettem Durchgang: Wolf bleibt am letzten Step stehen.
        setShowcasePhaseIdx(subStepCount - 1);
        return;
      }
      setShowcasePhaseIdx(step);
      const cur = subSteps[step];
      const nxt = step + 1 < subStepCount ? subSteps[step + 1] : null;
      const isHopNext = nxt ? (() => {
        if (cur.kind !== 'dot' || nxt.kind !== 'dot') return true;
        return cur.phaseIdx !== nxt.phaseIdx;
      })() : false;
      let duration: number;
      if (cur.kind === 'dot') {
        // Letzter Dot der Phase: kurz halten vor Bogen-Sprung damit der Hop
        // visuell als eigener Beat wirkt. Sonst flotter Slide zum nächsten Dot.
        // 2026-05-23: Wolf-Feedback „springt etwas schnell" — alle Timings
        // um ~55% verlängert damit der Tree besser lesbar ist.
        duration = isHopNext ? 1050 : 650;
      } else {
        // CG/Bid/Finale: lange genug, damit Pulse-Animation atmet.
        duration = 1400;
      }
      id = setTimeout(tick, duration);
    };
    // Initial-Pause damit Rules-Slide eingeblendet bevor Wolf startet.
    id = setTimeout(tick, 800);
    return () => { if (id !== null) clearTimeout(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showcaseMode, subStepCount]);

  const currentSubStep: SubStep | null = (showcasePhaseIdx >= 0 && showcasePhaseIdx < subStepCount)
    ? subSteps[showcasePhaseIdx]
    : null;
  const prevSubStep: SubStep | null = (showcasePhaseIdx > 0)
    ? subSteps[showcasePhaseIdx - 1]
    : null;
  // Hop = Wechsel in einen anderen Block (Phase-Wechsel oder zu/von Spezial-
  // Knoten). Triggert qqWolfBowHop-Animation (Bogen via translateY-Arc).
  const isHopping = (() => {
    if (!currentSubStep || !prevSubStep) return false;
    if (currentSubStep.kind !== prevSubStep.kind) return true;
    if (currentSubStep.kind === 'dot' && prevSubStep.kind === 'dot') {
      return currentSubStep.phaseIdx !== prevSubStep.phaseIdx;
    }
    return true;
  })();

  const showcaseOnBidding  = showcaseMode && currentSubStep?.kind === 'bid';
  const showcaseOnFinale   = showcaseMode && currentSubStep?.kind === 'finale';
  const showcaseOnCozyGame = showcaseMode && currentSubStep?.kind === 'cg';
  const showcaseActiveCgPi = (currentSubStep && currentSubStep.kind === 'cg') ? currentSubStep.pi : 0;

  // Map SubStep-Idx → Phase-Idx (für Label-Highlights + Pan-Target). CG bleibt
  // visuell auf vorheriger Phase (pi-1). Bid/Finale: keine Phase highlighted
  // (haben eigene Labels).
  const subStepPhaseIdx = (step: number): number => {
    if (step < 0 || step >= subStepCount) return -1;
    const s = subSteps[step];
    if (s.kind === 'dot') return s.phaseIdx;
    if (s.kind === 'cg') return s.pi - 1;
    return -1;
  };

  // Berechne exakte x-Positionen aller Dots (für Progress-Track)
  // + phaseCenters für die Showcase-Pan-Animation (Camera fliegt zu Phase).
  // 2026-05-12 (Wolf-Bug 'Runde 4 fehlt im Tree, nur Bieten zu sehen'):
  // Wenn schedule keine Entries für eine Phase hat (z.B. weil Backend
  // noch nicht alle Fragen geladen, oder schedule kaputt), war phaseWidth=0
  // → Label unsichtbar → Phase fiel komplett raus aus dem Tree.
  // Fix: bei leerer Phase 5 Placeholder-Dots simulieren (= Default
  // QQ_QUESTIONS_PER_PHASE), damit Label + Layout-Slot erhalten bleiben.
  // Placeholder-Dots werden später als graue Slots ohne Schedule-Entry
  // gerendert (siehe entries-Loop unten).
  // (DEFAULT_DOTS_PER_PHASE / showBidding / showCozyGames / showFinale sind
  // jetzt oben deklariert — werden vom SubStep-Sweep + Layout beide gebraucht.)
  const dotCenters: number[] = [];
  const phaseWidths: number[] = [];
  const phaseCenters: number[] = [];
  // Bieten-Knoten (Final-Wager-Tipp-Phase): wird VOR der letzten Quiz-Runde
  // eingefuegt (nicht nach), weil das Bid-Phase BEFORE Phase N stattfindet
  // (qqBeginPhase line 3239: phaseIndex===totalPhases triggert FINAL_BETTING).
  // Wolf 2026-05-12 'bid muss auf progress tree genau vor finalrunde
  // angezeigt werden'.
  const biddingDotSize = Math.round(dotSize * 1.2);
  const cozyGameDotSize = Math.round(dotSize * 1.2);
  let biddingCenter = 0;
  // Pro Phase-Übergang ein eigener CG-Center. Index = Phase-Index VOR dem CG.
  // Z.B. cozyGameCentersByPi[1] = CG zwischen Phase 0 und Phase 1 (= nach Runde 1).
  const cozyGameCentersByPi = new Map<number, number>();
  let cursor = 0;
  phases.forEach((p, pIdx) => {
    // CG-Knoten zwischen Runde N-1 und N (vor jedem Phase-Render außer dem ersten).
    // pIdx > 0 = wir sind ab Phase 1 (2. Runde). Bei `pIdx === phases.length - 1`
    // (= vor Final) kommt CG zuerst, dann Bidding, dann Final-Phase.
    if (showCozyGames && pIdx >= 1) {
      cursor += phaseGap;
      cozyGameCentersByPi.set(pIdx, cursor + cozyGameDotSize / 2);
      cursor += cozyGameDotSize;
    }
    // Vor der letzten Phase: Bieten-Dot einfuegen (nur wenn showBidding).
    if (showBidding && pIdx === phases.length - 1 && pIdx > 0) {
      cursor += phaseGap;
      biddingCenter = cursor + biddingDotSize / 2;
      cursor += biddingDotSize;
    }
    if (pIdx > 0) cursor += phaseGap;
    const entries = byPhase.get(p) ?? [];
    const renderCount = entries.length > 0 ? entries.length : DEFAULT_DOTS_PER_PHASE;
    const phaseStart = cursor;
    for (let i = 0; i < renderCount; i++) {
      if (i > 0) cursor += dotGap;
      dotCenters.push(cursor + dotSize / 2);
      cursor += dotSize;
    }
    phaseWidths.push(cursor - phaseStart);
    phaseCenters.push(phaseStart + (cursor - phaseStart) / 2);
  });
  // Finale-Knoten am Ende: 35% größeres Dot — Trenner-Linie 2026-04-28
  // entfernt (User-Wunsch: 'den - hintendran weg'). Dot sitzt jetzt mittig
  // unter dem FINALE-Label. (showFinale oben deklariert.)
  const finaleDotSize = Math.round(dotSize * 1.35);
  let finaleCenter = 0;
  if (showFinale) {
    cursor += phaseGap;
    finaleCenter = cursor + finaleDotSize / 2;
    cursor += finaleDotSize;
  }
  const totalWidth = cursor;
  const treeCenter = totalWidth / 2;

  // Showcase-Pan: bringt die hervorgehobene Phase (oder Bieten/Finale) ins
  // Viewport-Zentrum. -1 (Pause-Step) zeigt erstmal Phase 0 zentriert.
  // 2026-05-17 (Option B): nutzt subStepPhaseIdx (per-Dot-Sweep statt
  // per-Phase-Sweep), Pan-Target bleibt jedoch auf Phase-Granularität.
  const showcaseTargetPhase = showcaseMode
    ? (() => {
        const p = subStepPhaseIdx(showcasePhaseIdx);
        return p >= 0 ? p : 0; // Bid/Finale → fallback auf Phase 0 fuer Pan-Default
      })()
    : -1;
  const showcaseTargetCenter = isShowcase
    ? (showcaseOnFinale ? finaleCenter
        : showcaseOnBidding ? biddingCenter
        : showcaseOnCozyGame ? (cozyGameCentersByPi.get(showcaseActiveCgPi) ?? null)
        : phaseCenters[showcaseTargetPhase] ?? null)
    : null;
  const panOffset = (showcaseTargetCenter != null)
    ? treeCenter - showcaseTargetCenter
    : 0;

  // Progress: von Center des ersten Dots bis Center des Wolf-Dots (displayIdx).
  const firstCenter = dotCenters[0] ?? 0;
  const lastCenter = dotCenters[dotCenters.length - 1] ?? 0;

  // Showcase-Wolf-Idx (Option B 2026-05-17): pro SubStep direkt aus
  // currentSubStep.globalDotIdx ableiten. Auf CG/Bid/Finale-Steps bleibt der
  // Dot-Idx beim letzten erreichten Dot stehen (für Progress-Color-Picking
  // — der visuelle Wolf-Center sitzt eh auf dem Spezial-Knoten via
  // wolfOn*-Branches weiter unten).
  const showcaseWolfIdx = (() => {
    if (!showcaseMode || !currentSubStep) return 0;
    if (currentSubStep.kind === 'dot') {
      return currentSubStep.globalDotIdx >= 0 ? currentSubStep.globalDotIdx : 0;
    }
    for (let i = showcasePhaseIdx - 1; i >= 0; i--) {
      const s = subSteps[i];
      if (s.kind === 'dot' && s.globalDotIdx >= 0) return s.globalDotIdx;
    }
    return 0;
  })();
  const effectiveDisplayIdx = showcaseMode ? showcaseWolfIdx : displayIdx;
  const wolfDotIdx = Math.max(0, Math.min(effectiveDisplayIdx, dotCenters.length - 1));
  // Wolf-Position: explizite Phase→Target-Map (statt Fallthrough-Hierarchie),
  // damit Endphasen NIE auf einen frueheren Step zuruecksacken.
  //
  // 2026-05-13 (Wolf 'progress treee wolf springt immernoch nach runde 3 auf
  // bieten zurueck dann wieder auf ende runde 3 in einem quiz mit nur 3
  // runden'): Bei (Bid=on, Finale=off) Quiz lief der Sprung:
  //   - State=FINAL_BETTING/_REVEAL  → wolfOnBidding=true  → Bid-Knoten
  //   - State=GAME_OVER/THANKS       → wolfOnFinale=false (kein 4×4) und
  //                                    wolfOnBidding=false (Phase nicht in
  //                                    Liste) → Fallback auf currentIdx
  //                                    = letzter Quiz-Dot → wirkte wie Rueck-
  //                                    sprung auf "ende runde N".
  // Fix: wolfPhaseTarget definiert pro Phase explizit, wo der Wolf hingehoert.
  // Bei Spielende ohne 4×4 bleibt er strukturell am Bid (letzter erreichter
  // Step). Bei Spielende ohne Bid UND ohne 4×4 am letzten Quiz-Dot (kein
  // Sprung moeglich, da nichts dahinter).
  const wolfPhaseTarget: 'quiz' | 'bidding' | 'finale' | 'cozyGame' = (() => {
    if (state.phase === 'COZY_GAME') {
      return showCozyGames ? 'cozyGame' : 'quiz';
    }
    if (state.phase === 'FINAL_BETTING' || state.phase === 'FINAL_REVEAL') {
      return showBidding ? 'bidding' : 'quiz';
    }
    if (state.phase === 'CONNECTIONS_4X4') {
      return showFinale ? 'finale' : 'quiz';
    }
    if (state.phase === 'GAME_OVER' || state.phase === 'THANKS') {
      if (showFinale) return 'finale';
      if (showBidding) return 'bidding';
      return 'quiz';
    }
    return 'quiz';
  })();
  const wolfOnFinale = showFinale && (showcaseOnFinale || wolfPhaseTarget === 'finale');
  const wolfOnBidding = !wolfOnFinale && showBidding && (showcaseOnBidding || wolfPhaseTarget === 'bidding');
  // 2026-05-17 (Wolf-Bug 'wolf überspringt minigame im showcase'):
  // showcaseOnCozyGame muss Wolf-Pos auch auf den CG-Knoten setzen, nicht nur
  // den Pan. Vorher: Wolf-Pos sprang von Phase 0 direkt zu Phase 1 (= übersprang CG).
  const wolfOnCozyGame = !wolfOnFinale && !wolfOnBidding && showCozyGames
    && (showcaseOnCozyGame || wolfPhaseTarget === 'cozyGame');
  // Aktiver CG-Knoten:
  // - Showcase-Mode (Rules-Roadmap): nutze showcaseActiveCgPi (cgStepToPi)
  // - Live-Mode: CG-Knoten zwischen aktueller Phase und nächster (state.gamePhaseIndex)
  const activeCozyGameCenter = wolfOnCozyGame
    ? (showcaseOnCozyGame
        ? (cozyGameCentersByPi.get(showcaseActiveCgPi) ?? cozyGameCentersByPi.values().next().value ?? 0)
        : (cozyGameCentersByPi.get(state.gamePhaseIndex) ?? cozyGameCentersByPi.values().next().value ?? 0))
    : 0;
  const currentCenter = wolfOnFinale ? finaleCenter
    : wolfOnBidding ? biddingCenter
    : wolfOnCozyGame ? activeCozyGameCenter
    : (dotCenters[wolfDotIdx] ?? firstCenter);
  const trackStart = firstCenter;
  const trackEnd = wolfOnFinale ? finaleCenter
    : wolfOnBidding ? biddingCenter
    : wolfOnCozyGame ? activeCozyGameCenter
    : lastCenter;
  const progressEnd = Math.max(trackStart, Math.min(currentCenter, trackEnd));

  const trackBg = variant === 'inline' ? 'rgba(148,163,184,0.28)' : 'rgba(148,163,184,0.35)';
  // 2026-05-09 (Wolf 'tree noch bunt'): Progress-Strich + Dots nutzen jetzt
  // Pink-Eskalation pro Phase (getRoundColor) statt Kategorie-Farben — bleibt
  // Brand-konsistent. Kategorien werden weiter durch Emojis erkannt (groß im
  // Dot). Finale-Dot bleibt Lila als Highlight.
  const wolfDotIdxForColor = Math.max(0, Math.min(showcaseMode ? showcaseWolfIdx : displayIdx, dotCenters.length - 1));
  const currentScheduleEntry = schedule[wolfDotIdxForColor];
  // Skin: alle Runden-Palette-Farben (Linie/Dots/Wolf-Ring) ziehen den Skin-
  // Akzent-Hex (Hex noetig, weil im Baum ueberall Alpha angehaengt wird: ${c}99).
  const skinAccentHex = isThemed() ? getActiveTheme().brand.accentHex : null;
  const progressColor = skinAccentHex ?? (wolfOnFinale
    ? QQ_COLORS.violet400
    : (currentScheduleEntry ? getRoundColor(currentScheduleEntry.phase, totalPhases) : QQ_COLORS.brandPink));
  const progressColorEnd = progressColor;

  // 2026-05-05 (Wolf 'progress tree mit rundenfarbe + glow'): inline + hero
  // Varianten bekommen Border + Glow in der aktuellen Runden-Farbe (gleicher
  // Token wie das 'Runde N'-Label oben), 3-Cycle damit Runde 4 = Runde 1-Farbe.
  const roundColor = skinAccentHex ?? getRoundColor(state.gamePhaseIndex ?? 1, totalPhases);
  const useRoundAccent = variant === 'inline' || variant === 'hero';

  // 2026-06-24 (Skin): dunkler Navy-Balken auf hellen Skins → Skin-Card.
  const wrapperBg = isShowcase
    ? 'transparent'
    : isThemed()
      ? 'var(--qq-card-bg)'
    : isMini
      ? 'rgba(15,23,42,0.55)'
      : variant === 'inline'
        ? 'linear-gradient(180deg, rgba(15,23,42,0.92), rgba(15,23,42,0.82))'
        : 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.92))';
  // Skin: Runden-Akzent-Rahmen/Glow nutzt den Skin-Akzent statt Pink
  // (sonst rosa Rand auf Mono/SoftPop/Neo). Mini/Showcase unveraendert.
  const wrapperBorder = isShowcase
    ? 'none'
    : isMini
      ? '1px solid rgba(148,163,184,0.18)'
      : isThemed()
        ? (useRoundAccent ? '2px solid var(--qq-accent)' : 'var(--qq-card-border)')
      : useRoundAccent
        ? `2px solid ${roundColor}aa`
        : '2px solid #e2e8f0';
  const wrapperBoxShadow = isShowcase
    ? 'none'
    : isMini
      ? '0 4px 12px rgba(0,0,0,0.35)'
      : isThemed()
        ? (useRoundAccent
            ? '0 0 36px rgba(var(--qq-accent-rgb),0.33), 0 0 14px rgba(var(--qq-accent-rgb),0.20), var(--qq-card-shadow)'
            : 'var(--qq-card-shadow)')
      : useRoundAccent
        ? `0 0 36px ${roundColor}55, 0 0 14px ${roundColor}33, 0 10px 32px rgba(15,23,42,0.18)`
        : '0 10px 32px rgba(15,23,42,0.18)';
  const wrapperColor = isThemed()
    ? 'var(--qq-card-text)'
    : (isMini || variant === 'inline' || isShowcase) ? '#f8fafc' : QQ_COLORS.slate900;

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
        boxShadow: wrapperBoxShadow,
        border: wrapperBorder,
        // Soft transition damit Runden-Farb-Wechsel (Phase 1→2→3→4) smooth durchfaerbt.
        transition: 'border-color 0.6s ease, box-shadow 0.6s ease',
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
        {/* Phasen-Labels — jeweils über ihrer Dot-Gruppe zentriert (nicht im mini-Mode).
            2026-05-12 (Wolf 'bid vor finalrunde'): Bieten-Label wird zwischen
            den letzten zwei Phase-Labels eingeschoben statt am Ende. */}
        {showLabels && (
        <div style={{ display: 'flex', gap: phaseGap, width: totalWidth }}>
          {(() => {
            const items: React.ReactNode[] = [];
            const isBiddingActive = state.phase === 'FINAL_BETTING' || state.phase === 'FINAL_REVEAL' || showcaseOnBidding;
            const biddingLabelColor = isBiddingActive
              ? (skinAccentHex ?? (isShowcase ? QQ_COLORS.brandPink : variant === 'inline' ? QQ_COLORS.brandPink : '#A21247'))
              : (isShowcase ? '#6b6555' : variant === 'inline' ? QQ_COLORS.slate400 : QQ_COLORS.slate500);
            phases.forEach((p, pi) => {
              // 2026-05-17 (Wolf v3): CG-Label IMMER als Spacer-Slot — in
              // Rules-Showcase UND im Live-Tree. Bug "COZYGAMBIETEN"-Verschmelzung
              // entsteht weil flex-Gap zwischen Bieten + CG-Label zu klein ist.
              // Label komplett raus, nur Spacer wahrt Spalten-Sync zur Dot-Row.
              if (showCozyGames && pi >= 1) {
                items.push(<div key={`cg-label-spacer-${pi}`} style={{ width: cozyGameDotSize, flexShrink: 0 }} />);
              }
              // Vor letzter Phase: Bieten-Label einfuegen.
              if (showBidding && pi === phases.length - 1 && pi > 0) {
                items.push(
                  <div key="bieten" style={{
                    width: biddingDotSize,
                    textAlign: 'center',
                    fontSize: phaseNameSize,
                    fontWeight: 900,
                    color: biddingLabelColor,
                    // 2026-05-13 (Wolf 'BIETEN nicht mittig ueber Dot'): letterSpacing
                    // entfernt — wirkt auch trailing nach dem letzten Buchstaben und
                    // shiftet textAlign:center-Text leicht nach rechts.
                    textTransform: 'uppercase',
                    flexShrink: 0,
                    padding: 0,
                    textShadow: (!isThemed() && isShowcase && isBiddingActive) ? '0 0 18px rgba(236,72,153,0.6)' : 'none',
                    transform: (isShowcase && isBiddingActive) ? 'translateY(-2px)' : 'translateY(0)',
                    transition: 'all 0.4s var(--qq-ease-out-cubic)',
                  }}>
                    {lang === 'de' ? 'Bieten' : 'Bid'}
                  </div>
                );
              }
              const isCurrentPhase = showcaseMode
                ? pi === subStepPhaseIdx(showcasePhaseIdx)
                : state.gamePhaseIndex === p;
              items.push(
                <div
                  key={p}
                  style={{
                    width: phaseWidths[pi],
                    textAlign: 'center',
                    fontSize: phaseNameSize,
                    fontWeight: 900,
                    color: isCurrentPhase
                      ? (skinAccentHex ?? (isShowcase ? QQ_COLORS.brandPink : variant === 'inline' ? QQ_COLORS.brandPink : '#A21247'))
                      : (isShowcase ? '#6b6555' : variant === 'inline' ? QQ_COLORS.slate400 : QQ_COLORS.slate500),
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                    flexShrink: 0,
                    textShadow: (!isThemed() && isShowcase && isCurrentPhase) ? '0 0 18px rgba(236,72,153,0.6)' : 'none',
                    transform: (isShowcase && isCurrentPhase) ? 'translateY(-2px)' : 'translateY(0)',
                    transition: 'all 0.4s var(--qq-ease-out-cubic)',
                  }}
                >
                  {phaseLabels[p]}
                </div>
              );
            });
            return items;
          })()}

          {/* Finale-Label — über dem Finale-Knoten. Spalten-Breite muss exakt
              der Finale-Block-Breite (Trenner + gap + Dot) entsprechen, damit
              der Text mittig über dem Dot landet. (User-Wunsch 2026-04-28:
              'über finale auch finale schreiben wie bei runde') */}
          {showFinale && (() => {
            const isFinaleActive = state.phase === 'CONNECTIONS_4X4' || showcaseOnFinale;
            const finaleLabelColor = isFinaleActive
              ? (skinAccentHex ?? (isShowcase ? QQ_COLORS.brandPink : variant === 'inline' ? QQ_COLORS.brandPink : '#A21247'))
              : (isShowcase ? '#6b6555' : variant === 'inline' ? QQ_COLORS.slate400 : QQ_COLORS.slate500);
            return (
              <div style={{
                width: finaleDotSize,
                textAlign: 'center',
                fontSize: phaseNameSize,
                fontWeight: 900,
                color: finaleLabelColor,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                flexShrink: 0,
                textShadow: (!isThemed() && isShowcase && isFinaleActive) ? '0 0 18px rgba(236,72,153,0.6)' : 'none',
                transform: (isShowcase && isFinaleActive) ? 'translateY(-2px)' : 'translateY(0)',
                transition: 'all 0.4s var(--qq-ease-out-cubic)',
              }}>
                {lang === 'de' ? 'Finale' : 'Finale'}
              </div>
            );
          })()}
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
          {/* Progress: nimmt aktuelle Kategorie-Farbe (Wolf-Wunsch 2026-05-04
              — vorher immer gold). Color + Box-Shadow mit transition damit der
              Wechsel beim Wolf-Hop smooth durchfaerbt. */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: trackStart,
            width: Math.max(0, progressEnd - trackStart),
            height: isMini ? 2 : 3,
            background: `linear-gradient(90deg, ${progressColor}, ${progressColorEnd})`,
            borderRadius: 2,
            transform: 'translateY(-50%)',
            boxShadow: isThemed() ? 'none' : `0 0 10px ${progressColor}99`,
            transition: 'width 600ms var(--qq-ease-smooth), background 500ms ease, box-shadow 500ms ease',
            zIndex: 1,
          }} />

          {/* Dots — Flex-Layout, genau mit Berechnung oben synchron.
              Current = unsichtbarer Platzhalter (Wolf sitzt drauf).
              Past = ausgegrautes Kategorie-Emoji (kein altbackenes ✓ mehr).
              Future = dunkler Slot mit Kategorie-Emoji.
              2026-05-12 (Wolf 'bid vor finalrunde'): Bieten-Knoten wird zwischen
              den letzten zwei Phasen-Groups eingeschoben statt am Ende. */}
          {phases.flatMap((p, pi) => {
            const entries = byPhase.get(p) ?? [];
            const phaseStartIdx = schedule.findIndex((e) => e.phase === p);
            const isShowcasedPhase = showcaseMode && pi === subStepPhaseIdx(showcasePhaseIdx);
            // 2026-05-12: Placeholder-Dots wenn keine Schedule-Entries für
            // diese Phase (siehe Comment oben bei cursor-Berechnung).
            const renderEntries: Array<QQScheduleEntry | null> = entries.length > 0
              ? entries
              : Array(DEFAULT_DOTS_PER_PHASE).fill(null);
            // Vor letzter Phase: Bieten-Knoten einschieben.
            const insertBiddingHere = showBidding && pi === phases.length - 1 && pi > 0;
            const biddingColor = skinAccentHex ?? QQ_COLORS.brandPink;
            const isBiddingActive = state.phase === 'FINAL_BETTING' || state.phase === 'FINAL_REVEAL' || showcaseOnBidding;
            const isBiddingPast = (state.phase === 'CONNECTIONS_4X4' || state.phase === 'GAME_OVER' || state.phase === 'THANKS') && !isBiddingActive;
            // CozyGame-Knoten — vor jedem pi >= 1 (= zwischen Runde N-1 und N).
            // Wolf-Spec: nach JEDER Runde ein CG (außer der letzten = Final).
            const insertCozyGameHere = showCozyGames && pi >= 1;
            const cozyGameColor = skinAccentHex ?? QQ_COLORS.brandPink;
            // Active = state.phase=COZY_GAME UND der Slot zwischen aktueller
            // Phase und nächster (= pi === state.gamePhaseIndex).
            // 2026-05-17 (Option B): auch im Showcase aktivieren wenn Wolf auf
            // diesem CG-Knoten sitzt, damit Pulse-Animation in der Rules-Roadmap
            // mitspielt (vorher nur live highlighted).
            const isCozyGameActive = (state.phase === 'COZY_GAME' && pi === state.gamePhaseIndex)
              || (showcaseOnCozyGame && showcaseActiveCgPi === pi);
            // "Past" = der CG-Slot vor pi wurde bereits gespielt
            // (state.cozyGamesPlayedAfterPhases enthält die Phase-Indizes vor diesem Slot).
            const playedSlots = (state as any).cozyGamesPlayedAfterPhases ?? [];
            const isCozyGamePast = !isCozyGameActive && playedSlots.includes(pi);
            const cozyGameNode = insertCozyGameHere ? (
              <div key={`cg-knoten-${pi}`} style={{
                width: cozyGameDotSize,
                flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', zIndex: 2,
              }}>
                <div
                  title={lang === 'de' ? 'CozyGame — analoges Mini-Spiel' : 'CozyGame — analog mini-game'}
                  style={{
                    width: cozyGameDotSize,
                    height: cozyGameDotSize,
                    borderRadius: isThemed() ? 'var(--qq-card-radius)' : '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: Math.round(cozyGameDotSize * 0.55),
                    background: isCozyGameActive
                      ? cozyGameColor
                      : isCozyGamePast
                        ? (isThemed() ? 'var(--qq-card-bg)' : 'rgba(148,163,184,0.18)')
                        : (isThemed() ? 'var(--qq-card-bg)' : 'rgba(30,41,59,0.85)'),
                    border: isCozyGameActive
                      ? '2.5px solid #fff'
                      : isCozyGamePast
                        ? 'none'
                        : (isThemed() ? '1.5px solid var(--qq-hairline)' : '1.5px solid rgba(148,163,184,0.35)'),
                    boxShadow: isCozyGameActive
                      ? `0 0 0 4px ${cozyGameColor}55, 0 6px 14px ${cozyGameColor}88, 0 0 28px ${cozyGameColor}aa`
                      : 'none',
                    opacity: isCozyGamePast ? 0.55 : 1,
                    filter: isCozyGamePast ? 'grayscale(1)' : 'none',
                    animation: isCozyGameActive ? 'qqTreePulse 1.6s ease-in-out infinite' : undefined,
                    transition: 'all 0.45s var(--qq-ease-out-cubic)',
                  }}
                >🪅</div>
              </div>
            ) : null;
            const biddingNode = insertBiddingHere ? (
              <div key="bid-knoten" style={{
                // 2026-05-13 (Wolf 'BIETEN nicht mittig ueber Dot'): explizite
                // width matcht Labels-Row-Spalte (gleicher biddingDotSize) damit
                // beide Rows exakt dieselbe Spalten-Mid-X-Position haben.
                width: biddingDotSize,
                flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', zIndex: 2,
              }}>
                <div
                  title={lang === 'de' ? 'Bieten — Tipp auf anderes Team' : 'Bid — guess another team'}
                  style={{
                    width: biddingDotSize,
                    height: biddingDotSize,
                    borderRadius: isThemed() ? 'var(--qq-card-radius)' : '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: Math.round(biddingDotSize * 0.55),
                    // 2026-05-13 (Wolf-Bug 'pinke Umrandung dauerhaft auf Bieten'):
                    // Bieten-Dot hatte selbst im default-state pinken Border +
                    // pink Glow → wirkte permanent "active". Jetzt: neutraler
                    // Ring wie bei den anderen Phase-Dots im default-state,
                    // pink wird nur waehrend isBiddingActive ausgespielt.
                    background: isBiddingActive
                      ? biddingColor
                      : isBiddingPast
                        ? (isThemed() ? 'var(--qq-card-bg)' : 'rgba(148,163,184,0.18)')
                        : (isThemed() ? 'var(--qq-card-bg)' : 'rgba(30,41,59,0.85)'),
                    border: isBiddingActive
                      ? '2.5px solid #fff'
                      : isBiddingPast
                        ? 'none'
                        : (isThemed() ? '1.5px solid var(--qq-hairline)' : '1.5px solid rgba(148,163,184,0.35)'),
                    boxShadow: isBiddingActive
                      ? `0 0 0 4px ${biddingColor}55, 0 6px 14px ${biddingColor}88, 0 0 28px ${biddingColor}aa`
                      : 'none',
                    opacity: isBiddingPast ? 0.55 : 1,
                    filter: isBiddingPast ? 'grayscale(1)' : 'none',
                    animation: isBiddingActive ? 'qqTreePulse 1.6s ease-in-out infinite' : undefined,
                    transition: 'all 0.45s var(--qq-ease-out-cubic)',
                  }}
                >🪙</div>
              </div>
            ) : null;
            const phaseElem = (
              <div key={p} style={{ display: 'flex', gap: dotGap, alignItems: 'center', position: 'relative', zIndex: 2 }}>
                {renderEntries.map((e, i) => {
                  const globalIdx = phaseStartIdx >= 0 ? phaseStartIdx + i : -1;
                  const isPast = !showcaseMode && globalIdx >= 0 && globalIdx < displayIdx;
                  const isCurrent = globalIdx >= 0 && globalIdx === effectiveDisplayIdx;
                  // 2026-05-09 (Wolf 'tree noch bunt'): Phasen-Farbe statt Kategorie-Farbe
                  const color = skinAccentHex ?? getRoundColor(p, totalPhases);
                  // Bei Placeholder (e=null): graues Dot ohne Emoji
                  const label = e ? QQ_CATEGORY_LABELS[e.category] : null;
                  const emoji = e
                    ? (e.bunteTueteKind ? QQ_BUNTE_TUETE_LABELS[e.bunteTueteKind].emoji : label!.emoji)
                    : '';
                  // 2026-06-28 (Wolf 'progress tree hat noch alte avatare'): die
                  // Dots zeigten rohe OS-Kategorie-Emoji statt der neuen cozy3d-
                  // Kategorie-Icons (PNG). Slug holen (Sub-Mechanik bevorzugt),
                  // Fallback = Emoji wenn kein Icon existiert (z.B. deaktivierte Subs).
                  const catSlug = e
                    ? (e.bunteTueteKind ? qqSubSlug(e.bunteTueteKind) : qqCatSlug(e.category))
                    : null;
                  const isPlaceholder = e === null;
                  return (
                    <div
                      key={i}
                      title={e ? `${phaseLabels[p]} · ${label![lang]}` : `${phaseLabels[p]} · (wird noch geladen)`}
                      style={{
                        width: dotSize,
                        height: dotSize,
                        borderRadius: isThemed() ? 'var(--qq-card-radius)' : '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: Math.round(dotSize * 0.55),
                        fontWeight: 800,
                        // Skin: inaktive/zukuenftige Dots nutzen Skin-Surface +
                        // Hairline statt Dunkel-Navy (sah auf hellen Skins wie
                        // schwere graue Kloetze aus — Wolf 2026-06-24).
                        background: isCurrent
                          ? 'transparent'
                          : isShowcasedPhase
                            ? `${color}33`
                            : isPast
                              ? ((variant === 'inline' || isMini) ? (isThemed() ? 'var(--qq-card-bg)' : 'rgba(148,163,184,0.18)') : QQ_COLORS.slate200)
                              : ((variant === 'inline' || isMini || isShowcase) ? (isThemed() ? 'var(--qq-card-bg)' : 'rgba(30,41,59,0.85)') : QQ_COLORS.slate100),
                        color: isShowcasedPhase
                          ? '#fef3c7'
                          : isPast
                            ? QQ_COLORS.slate400
                            : ((variant === 'inline' || isMini || isShowcase) ? (isThemed() ? 'var(--qq-text-muted)' : QQ_COLORS.slate300) : QQ_COLORS.slate500),
                        border: isCurrent
                          ? 'none'
                          : isShowcasedPhase
                            ? `2px solid ${color}`
                            : isPast
                              ? 'none'
                              : ((variant === 'inline' || isMini || isShowcase) ? (isThemed() ? '1.5px solid var(--qq-hairline)' : '1.5px solid rgba(148,163,184,0.35)') : '2px solid #e2e8f0'),
                        boxShadow: isShowcasedPhase
                          ? `0 0 18px ${color}88, 0 0 36px ${color}44`
                          : 'none',
                        opacity: isCurrent ? 0 : isPast ? 0.55 : isPlaceholder ? 0.5 : 1,
                        filter: isPast ? 'grayscale(1)' : 'none',
                        transform: isShowcasedPhase ? 'scale(1.18)' : 'scale(1)',
                        transition: 'all 0.45s var(--qq-ease-out-cubic)',
                      }}
                    >
                      {catSlug
                        ? <QQIcon slug={catSlug} size={Math.round(dotSize * 0.62)} alt={label ? label[lang] : undefined} />
                        : emoji}
                    </div>
                  );
                })}
              </div>
            );
            // Bieten-Node VOR der Phase einfuegen wenn diese die letzte ist
            // Render-Reihenfolge: ggf. Bid-Knoten + CozyGame-Knoten + Phase
            // CozyGame ist VOR Phase 1 (zwischen Runde 1 und Runde 2),
            // Bid ist VOR letzter Phase. Beide vor der Phase rendern.
            const nodes: React.ReactNode[] = [];
            if (cozyGameNode) nodes.push(cozyGameNode);
            if (biddingNode) nodes.push(biddingNode);
            nodes.push(phaseElem);
            return nodes;
          })}

          {/* Großes Finale (4×4 Connections) — separater Bonus-Knoten am
              Tree-Ende. Goldenes 🧩-Dot mit Glow, größer als Quiz-Dots
              (klare Hierarchie: das ist DAS Highlight).
              User-Wunsch 2026-04-28-v2: Trenner-Strich raus, Dot mittig
              unter dem 'FINALE'-Label. */}
          {state.connectionsEnabled === true && (() => {
            const finaleSize = Math.round(dotSize * 1.35);
            const finaleColor = QQ_COLORS.violet400;
            // Aktiv = real während CONNECTIONS_4X4 ODER Showcase-Last-Step.
            const isFinaleActive = state.phase === 'CONNECTIONS_4X4' || showcaseOnFinale;
            const isFinalePast = state.phase === 'GAME_OVER' || state.phase === 'THANKS';
            return (
              <div style={{
                // 2026-04-28: marginLeft entfernt — Parent-Container hat schon
                // gap:phaseGap zwischen Items. Doppelter Abstand verschob den
                // Finale-Dot um phaseGap nach rechts → Label saß nicht mittig
                // drüber. Jetzt spacing exakt = ein phaseGap (gleich wie
                // zwischen den Phase-Groups, gleich wie zwischen Labels).
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', zIndex: 2,
              }}>
                <div
                  title={lang === 'de' ? 'Großes Finale (4×4)' : 'Grand Finale (4×4)'}
                  style={{
                    width: finaleSize,
                    height: finaleSize,
                    borderRadius: isThemed() ? 'var(--qq-card-radius)' : '50%',
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
                    transition: 'all 0.45s var(--qq-ease-out-cubic)',
                  }}
                >🧩</div>
              </div>
            );
          })()}

          {/* Wolf-Avatar — sitzt auf dem aktuellen Dot, slidet horizontal
              zwischen Dots derselben Phase, macht bei Phase-/Block-Wechsel
              einen Bogen-Sprung (Option B 2026-05-17).
              Struktur:
              - outer-positioner: position+left+top+transition (slidet horizontal)
              - hop-wrapper (key remounted on jeder Hop-Step → bowHop-Animation
                triggert sich neu): translateY-Arc nur bei Hop
              - wolf-circle: rounded border, overflow hidden für die Wolf-Img.
              2026-05-09 (Wolf-Wunsch): pink.png statt logo.png (3D-Wolf vom
              Desktop), continuous Bounce-Loop des Kopfes via qqWolfHeadBob. */}
          {dotCenters.length > 0 && (() => {
            const currentSchedule = schedule[wolfDotIdx];
            // 2026-05-09: Phasen-Farbe statt Kategorie-Farbe (Brand-konsistent).
            const wolfColor = skinAccentHex ?? (currentSchedule ? getRoundColor(currentSchedule.phase, totalPhases) : QQ_COLORS.brandPink);
            const wolfSize = Math.round(dotSize * 1.35);
            return (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: currentCenter,
                width: wolfSize,
                height: wolfSize,
                transform: 'translate(-50%, -50%)',
                transition: 'left 620ms cubic-bezier(0.34, 1.25, 0.64, 1)',
                zIndex: 3,
                pointerEvents: 'none',
              }}>
                <div
                  key={isHopping ? `hop-${showcasePhaseIdx}` : 'rest'}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: isThemed() ? 'var(--qq-card-radius)' : '50%',
                    background: 'transparent',
                    border: `${isMini ? 2 : 3}px solid ${wolfColor}`,
                    boxShadow: `0 0 0 ${isMini ? 3 : 4}px ${wolfColor}40, 0 6px 16px ${wolfColor}66`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                    animation: isHopping ? 'qqWolfBowHop 0.65s cubic-bezier(0.5, 0, 0.5, 1)' : undefined,
                  }}
                >
                  <img
                    src="/avatars/cozywolf/pink.png"
                    alt=""
                    draggable={false}
                    style={{
                      width: '94%', height: '94%', objectFit: 'contain',
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.55))',
                      animation: 'qqWolfHeadBob 1.6s ease-in-out infinite',
                    }}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <style>{`
        @keyframes qqTreePulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(var(--qq-accent-rgb),0.35), 0 6px 14px rgba(0,0,0,0.2); }
          50%      { box-shadow: 0 0 0 10px rgba(var(--qq-accent-rgb),0.10), 0 6px 14px rgba(0,0,0,0.2); }
        }
        /* Bogen-Sprung des Wolf bei Phase-/Block-Wechsel im Showcase-Sweep
           (Option B 2026-05-17). Wolf-Circle wird per key-Remount neu-getriggert,
           daher fest 0% → 45% → 100% statt fade-loop. translateY peakt etwas
           später als 50% damit der Landungs-Anteil weicher wirkt. */
        @keyframes qqWolfBowHop {
          0%   { transform: translateY(0); }
          45%  { transform: translateY(-26px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
