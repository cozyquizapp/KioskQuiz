/**
 * CozyQuizPhaseIntroView — Phasen-Intro vor jeder Runde (Bug-Hot-Spot #2).
 *
 * Großes 3-Akt-Spektakel zwischen Phasen:
 *  Akt 1: Round-Counter rollt rein (digit-fall + color-flip)
 *  Akt 2: Kategorie-Tree-Sweep (5 Kategorie-Dots, Wolf-Hop)
 *  Akt 3: Action-Card-Slot (Place/Steal/Stack mit 3D-Reveal fuer Neue)
 *
 * Mit-extrahiert: RoundMiniTree (auch von PausedView genutzt → re-exported),
 * PHASE_INTRO_TIMING (zentrale Timing-Tabelle).
 *
 * Extrahiert aus QQBeamerPage.tsx 2026-05-13 (Refactor Phase 6 FINAL).
 * Der GROESSTE Single-View bisher (~4.700 Z. ohne Helpers, ~1.200 mit
 * Helpers — wurde durch fruehere Extraktionen schon verkleinert).
 * 4 externe Importer.
 */
import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import type { QQStateUpdate, QQCategory } from '../../../shared/quarterQuizTypes';
import {
  QQ_CATEGORY_LABELS, QQ_BUNTE_TUETE_LABELS,
} from '../../../shared/quarterQuizTypes';
import { useLangFlip, bt } from '../cozyQuizShared';
import { isThemed, isQuietMotion } from '../qqTheme';
import { getRoundColor, QQ_PHASE_COLORS } from '../qqDesignTokens';
import { getRuleText, useRuleOverridesVersion } from '../qqRuleTexts';
import { Fireflies, EurovisionHearts } from './CozyQuizAmbient';
import { QQIcon, QQEmojiIcon, qqCatSlug, qqSubSlug, type QQIconSlug } from './QQIcon';
import { ActionCard, type ActionCardData } from './CozyQuizActionCard';
import QQProgressTree from './QQProgressTree';
import { AnimatedCozyWolf } from '../pages/QQBeamerPage';
import { playRevealHighlight, playTick } from '../utils/sounds';

export function RoundMiniTree({ state: s, catColor }: { state: QQStateUpdate; catColor: string }) {
  const schedule = s.schedule ?? [];
  const phase = s.gamePhaseIndex;
  const firstIdx = schedule.findIndex(e => e.phase === phase);
  const phaseEntries = schedule.filter(e => e.phase === phase);

  const currentInPhase = phaseEntries.length === 0 || firstIdx < 0
    ? 0
    : Math.max(0, Math.min(s.questionIndex - firstIdx, phaseEntries.length - 1));

  // Wolf startet auf Vorgänger-Dot, springt nach Seiten-Entrance (~1s) zum aktuellen Dot.
  const [displayIdx, setDisplayIdx] = useState(Math.max(0, currentInPhase - 1));
  const [hopping, setHopping] = useState(false);

  useEffect(() => {
    if (currentInPhase === 0) {
      setDisplayIdx(0);
      setHopping(false);
      return;
    }
    setDisplayIdx(Math.max(0, currentInPhase - 1));
    setHopping(false);
    const t1 = setTimeout(() => {
      setDisplayIdx(currentInPhase);
      setHopping(true);
    }, 1000);
    const t2 = setTimeout(() => setHopping(false), 1000 + 560);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [currentInPhase]);

  if (phaseEntries.length === 0 || firstIdx < 0) return null;

  // User-Wunsch 2026-04-28: Mini-Tree unter „Runde N" darf größer sein.
  // 60→84 ergibt ~40% größere Dots, der Wolf wandert ebenfalls größer mit.
  const DOT = 84;
  const GAP = 32;
  const WOLF = DOT + 14;
  const totalWidth = phaseEntries.length * DOT + (phaseEntries.length - 1) * GAP;
  const wolfLeft = displayIdx * (DOT + GAP) + DOT / 2;
  const progressWidth = displayIdx === 0 ? 0 : displayIdx * (DOT + GAP);

  // Skin: Discs bleiben RUND (Wolf-Entscheid 2026-06-25 — Editorial-Kontrast wie
  // die Avatare), aber die Kategorie-Farbe (catColor) der Linie/des Wolf-Rings
  // weicht im Skin dem neutralen Akzent-Token (Mono: schwarz statt lila).
  const themed = isThemed();
  const lineCol = themed ? 'var(--qq-accent)' : catColor;

  return (
    <div style={{
      position: 'relative', width: totalWidth, height: WOLF + 4,
      display: 'flex', alignItems: 'center',
    }}>
      {/* Track (grau) + Progress (amber) — auf Dot-Mittelhöhe */}
      <div style={{
        position: 'absolute', top: '50%', left: DOT / 2,
        width: totalWidth - DOT, height: 3,
        background: 'rgba(148,163,184,0.28)',
        transform: 'translateY(-50%)', borderRadius: 2,
      }} />
      {progressWidth > 0 && (
        <div style={{
          position: 'absolute', top: '50%', left: DOT / 2,
          width: progressWidth, height: 3,
          // 2026-05-04 (Wolf): Strich nimmt aktuelle Kategorie-Farbe (catColor)
          // statt immer Gold. Auf Cat-Seiten matcht er damit den Wolf-Avatar.
          background: themed ? lineCol : `linear-gradient(90deg, ${catColor}, ${catColor})`,
          transform: 'translateY(-50%)', borderRadius: 2,
          boxShadow: themed ? '0 0 10px rgba(var(--qq-accent-rgb),0.4)' : `0 0 10px ${catColor}99`,
          transition: 'width 540ms var(--qq-ease-smooth), background 400ms ease, box-shadow 400ms ease',
        }} />
      )}

      {/* Dots — bei current bleibt der Dot leer, der Wolf sitzt drauf */}
      {phaseEntries.map((e, i) => {
        const label = QQ_CATEGORY_LABELS[e.category];
        const subSlug = e.bunteTueteKind ? qqSubSlug(e.bunteTueteKind) : null;
        const catSlug = qqCatSlug(e.category);
        // 2026-05-11 (Wolf-Bug 'onlyConnect zeigt 🎁 statt 🧩'): bei Bunte-
        // Tüte-Subs OHNE eigenes PNG (onlyConnect, bluff, oneOfEight) NICHT
        // auf cat-bunte-tuete (= 🎁) fallback. Stattdessen Sub-Emoji nehmen
        // (passend zum Badge: 🧩 / 🎭 / 🕵️). Nur Quiz-Kategorien ohne Sub
        // dürfen catSlug nutzen.
        const iconSlug = e.bunteTueteKind ? subSlug : catSlug;
        const emojiFallback = e.bunteTueteKind ? QQ_BUNTE_TUETE_LABELS[e.bunteTueteKind].emoji : label.emoji;
        const isPast = i < displayIdx;
        const isCurrent = i === displayIdx;
        const dotLeft = i * (DOT + GAP);
        const iconSize = Math.round(DOT * 0.78);
        return (
          <div key={i} style={{
            position: 'absolute', top: '50%', left: dotLeft,
            width: DOT, height: DOT, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: Math.round(DOT * 0.55),
            background: isPast ? 'rgba(148,163,184,0.18)'
              : isCurrent ? 'transparent'
              : 'rgba(30,41,59,0.55)',
            border: isCurrent ? 'none' : '1.5px solid rgba(148,163,184,0.35)',
            filter: isPast ? 'grayscale(1)' : 'none',
            opacity: isPast ? 0.55 : isCurrent ? 0 : 1,
            transform: 'translateY(-50%)',
            transition: 'opacity 320ms ease, filter 320ms ease, background 320ms ease',
            zIndex: 1,
          }}>
            {iconSlug
              ? <QQIcon slug={iconSlug} size={iconSize} alt={label.de} />
              : emojiFallback}
          </div>
        );
      })}

      {/* Wolf-Avatar — sitzt fix auf der Linie, slidet horizontal zum nächsten
          Dot. 2026-05-09 v2 (Wolf 'kreis darf nicht bouncen, linie ist fix'):
          outer-Bounce/Hop entfernt; KOPF (innen) wackelt subtil. */}
      <div style={{
        position: 'absolute', top: '50%', left: wolfLeft,
        width: WOLF, height: WOLF, borderRadius: '50%',
        background: 'transparent',
        border: themed ? '3px solid var(--qq-accent)' : `3px solid ${catColor}`,
        boxShadow: themed
          ? '0 0 0 4px rgba(var(--qq-accent-rgb),0.18), 0 6px 14px rgba(var(--qq-accent-rgb),0.28)'
          : `0 0 0 4px ${catColor}40, 0 6px 14px ${catColor}55`,
        transform: 'translate(-50%, -50%)',
        transition: 'left 560ms cubic-bezier(0.34, 1.25, 0.64, 1), border-color 400ms ease, box-shadow 400ms ease',
        zIndex: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
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
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE INTRO
// ═══════════════════════════════════════════════════════════════════════════════

// 2026-05-12 (Bug-Fix nach 20 Iterationen): ActionCardReveal + plain-Card
// vollstaendig extrahiert nach ../components/QQActionCard.tsx. Single source
// of truth fuer Outer-Box-Geometrie — Drift zwischen "isNew Flip-Card" und
// plain Card ist jetzt strukturell unmoeglich. Aufrufstelle nutzt <ActionCard>.

// 2026-05-12 (Audit P0 #4 — Timeline-Sync): zentrale Timing-Tabelle fuer die
// PhaseIntro-Round-Transition. JS-Timer hier definiert, CSS-animation-delays
// in den Inline-Styles weiter unten muessen mit diesen Werten synchron bleiben
// (Querverweise jeweils per Inline-Kommentar). Vorher 7+ magic numbers
// verstreut.
const PHASE_INTRO_TIMING = {
  /** Tree-State swappt von prev auf neue Runde (triggert Wolf-Hop). */
  treeSwapMs: 220,
  /** Title-Farbe wechselt synchron mit Digit-Roll-In. */
  colorFlipMs: 1650,
  /** Endgueltig auf neue Runde umgeschaltet. */
  transitionEndMs: 2500,
  /** New-Digit faellt von oben rein. CSS: roundDigitFall 760ms ... 1150ms. */
  digitFallStartMs: 1150,
  digitFallDurMs: 760,
  /** Sub-Title slidet rein. */
  subtitleSlideStartMs: 700,
  subtitleSlideDurMs: 550,
} as const;

export function PhaseIntroView({ state: s }: { state: QQStateUpdate }) {
  useRuleOverridesVersion();
  const lang = useLangFlip(s.language);
  const fontFam = s.theme?.fontFamily ? `'${s.theme.fontFamily}', 'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif` : "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif";
  // 2026-05-07 (Wolf 'mehr Pink+Blau im ESC, Set B+F'): im eurovisionMode
  // alle PhaseIntro-Akzente (Title-Glow, Round-Pille, Phasen-Linie, Wolf-
  // Drop-Shadow, Fireflies) auf ESC-Pink ziehen statt der Phase-Standardfarbe
  // (gold/lila/grün rotierend). Dadurch wirkt 'Halbfinale 1/2/Finale'
  // konsistent in der ESC-Identitaet.
  const isEsc = !!s.theme?.eurovisionMode;
  const color = isEsc ? '#FF2D7B' : getRoundColor(s.gamePhaseIndex, s.totalPhases ?? 4);
  // 2026-05-07 (Wolf-Sidequest): Pro-Draft Phase-Namen Override.
  // Wenn theme.phaseNames gesetzt: ersetzen die Standard-Namen ('Runde 1' etc.).
  // ESC-Quiz nutzt 'Halbfinale 1', 'Halbfinale 2', 'Finale'.
  // Override-Array startet bei index 1 (Phase 1 = Index 1, Phase 0 ist
  // ungenutzt im bt.phase.names — ['', 'Runde 1', 'Runde 2', ...]).
  const phaseNamesDefault = bt.phase.names[lang];
  const phaseNamesOverride = lang === 'en'
    ? s.theme?.phaseNames?.en
    : s.theme?.phaseNames?.de;
  const phaseNamesRaw: string[] = phaseNamesOverride && phaseNamesOverride.length > 0
    ? ['', ...phaseNamesOverride, ...phaseNamesDefault.slice(phaseNamesOverride.length + 1)]
    : phaseNamesDefault;
  const phaseDescsRaw = bt.phase.descs[lang];
  // „Finale" ist seit Connections-Einführung das 4×4-Mini-Game, NICHT mehr die
  // letzte Quiz-Runde. Quiz-Runden werden immer als „Runde N" angezeigt — auch
  // die letzte. Falls Connections deaktiviert ist und die letzte Quiz-Runde
  // gleichzeitig das Spielende ist, behält sie trotzdem ihren „Runde N"-Titel
  // (das echte Finale-Drama liegt bei der Connections-Phase).
  const phaseName = phaseNamesRaw[s.gamePhaseIndex];
  const phaseDesc = phaseDescsRaw[s.gamePhaseIndex];

  const questionInPhase = (s.questionIndex % 5) + 1;
  const isFirstOfRound = questionInPhase === 1;

  // Category info for upcoming question
  const cat = s.currentQuestion?.category as QQCategory | undefined;
  const catInfo = cat ? QQ_CATEGORY_LABELS[cat] : undefined;
  const CAT_COLORS: Record<string, string> = {
    SCHAETZCHEN: '#EAB308', MUCHO: '#3B82F6', BUNTE_TUETE: '#EF4444',
    ZEHN_VON_ZEHN: '#10B981', CHEESE: '#8B5CF6',
  };
  const catColor = (cat && CAT_COLORS[cat]) || color;

  // Wolf 2026-05-05: Texte sind editierbar im /rules-editor.
  // Defaults bleiben hier als Fallback erhalten.
  const CAT_EXPLAIN: Record<string, { de: string; en: string }> = {
    SCHAETZCHEN:   { de: getRuleText('cat.SCHAETZCHEN.explain', 'de', 'Wer schätzt am nächsten dran?'),
                     en: getRuleText('cat.SCHAETZCHEN.explain', 'en', 'Who can guess the closest?') },
    MUCHO:         { de: getRuleText('cat.MUCHO.explain', 'de', 'Wählt die richtige Antwort'),
                     en: getRuleText('cat.MUCHO.explain', 'en', 'Pick the right answer') },
    BUNTE_TUETE:   { de: getRuleText('cat.BUNTE_TUETE.explain', 'de', 'Überraschungs-Mechanik — seid bereit!'),
                     en: getRuleText('cat.BUNTE_TUETE.explain', 'en', 'Surprise mechanic — be ready!') },
    ZEHN_VON_ZEHN: { de: getRuleText('cat.ZEHN_VON_ZEHN.explain', 'de', '3 Antworten, 10 Punkte vergeben'),
                     en: getRuleText('cat.ZEHN_VON_ZEHN.explain', 'en', '3 answers, distribute 10 points') },
    CHEESE:        { de: getRuleText('cat.CHEESE.explain', 'de', 'Was ist das?'),
                     en: getRuleText('cat.CHEESE.explain', 'en', 'What is this?') },
  };

  // BUNTE_TUETE: pro Sub-Mechanik eigene Vorstellung (Name, Emoji, 1-Zeiler).
  // Texte editierbar via /rules-editor — Defaults hier als Fallback.
  const BUNTE_SUB_INTRO: Record<string, { de: { name: string; explain: string }; en: { name: string; explain: string }; emoji: string }> = {
    onlyConnect: {
      emoji: '🧩',
      de: { name:    getRuleText('bunte.onlyConnect.name',    'de', '4 gewinnt'),
            explain: getRuleText('bunte.onlyConnect.explain', 'de', '4 Begriffe — was verbindet sie? Ein Tipp pro Team, schnellste richtige Antwort gewinnt zuerst.') },
      en: { name:    getRuleText('bunte.onlyConnect.name',    'en', 'Only Connect'),
            explain: getRuleText('bunte.onlyConnect.explain', 'en', '4 terms — what connects them? One guess per team, fastest correct answer wins first.') },
    },
    bluff: {
      emoji: '🎭',
      de: { name:    getRuleText('bunte.bluff.name',    'de', 'Bluff'),
            explain: getRuleText('bunte.bluff.explain', 'de', 'Erfindet plausible Falsch-Antworten und ratet die echte.') },
      en: { name:    getRuleText('bunte.bluff.name',    'en', 'Bluff'),
            explain: getRuleText('bunte.bluff.explain', 'en', 'Make up plausible fake answers and find the real one.') },
    },
    hotPotato: {
      emoji: '🔥',
      de: { name:    getRuleText('bunte.hotPotato.name',    'de', 'Heiße Kartoffel'),
            explain: getRuleText('bunte.hotPotato.explain', 'de', 'Reihum antworten — keine Antwort vor Zeitende = raus.') },
      en: { name:    getRuleText('bunte.hotPotato.name',    'en', 'Hot Potato'),
            explain: getRuleText('bunte.hotPotato.explain', 'en', 'Take turns — no answer before time runs out = out.') },
    },
    top5: {
      emoji: '🏆',
      de: { name:    getRuleText('bunte.top5.name',    'de', 'Top 5'),
            explain: getRuleText('bunte.top5.explain', 'de', 'Nennt die häufigsten Antworten — je oben, desto mehr Punkte.') },
      en: { name:    getRuleText('bunte.top5.name',    'en', 'Top 5'),
            explain: getRuleText('bunte.top5.explain', 'en', 'Guess the most common answers — higher rank, more points.') },
    },
    oneOfEight: {
      emoji: '🕵️',
      de: { name:    getRuleText('bunte.oneOfEight.name',    'de', 'Imposter'),
            explain: getRuleText('bunte.oneOfEight.explain', 'de', 'Findet die EINE falsche Aussage zwischen 7 wahren.') },
      en: { name:    getRuleText('bunte.oneOfEight.name',    'en', 'Imposter'),
            explain: getRuleText('bunte.oneOfEight.explain', 'en', 'Spot the ONE false statement among 7 true ones.') },
    },
    order: {
      emoji: '📋',
      de: { name:    getRuleText('bunte.order.name',    'de', 'Reihenfolge'),
            explain: getRuleText('bunte.order.explain', 'de', 'Sortiert in der richtigen Reihenfolge.') },
      en: { name:    getRuleText('bunte.order.name',    'en', 'Order'),
            explain: getRuleText('bunte.order.explain', 'en', 'Sort in the correct order.') },
    },
    map: {
      emoji: '🗺️',
      de: { name:    getRuleText('bunte.map.name',    'de', 'CozyGuessr'),
            explain: getRuleText('bunte.map.explain', 'de', 'Errate den Ort auf der Karte — nächstes Team gewinnt.') },
      en: { name:    getRuleText('bunte.map.name',    'en', 'CozyGuessr'),
            explain: getRuleText('bunte.map.explain', 'en', 'Guess the location on the map — closest team wins.') },
    },
  };
  const bunteKind = cat === 'BUNTE_TUETE'
    ? (s.currentQuestion?.bunteTuete?.kind as keyof typeof BUNTE_SUB_INTRO | undefined)
    : undefined;
  const bunteSub = bunteKind ? BUNTE_SUB_INTRO[bunteKind] : undefined;

  const catLabel = bunteSub
    ? bunteSub[lang].name
    : (catInfo ? catInfo[lang] : '');
  const catEmoji = bunteSub
    ? bunteSub.emoji
    : (catInfo?.emoji ?? '');
  const catExplain = bunteSub
    ? bunteSub[lang].explain
    : (cat ? (CAT_EXPLAIN[cat]?.[lang] ?? '') : '');

  // ── Rule reminders per round ──
  // Subtitle ueber den Action-Cards. Beschreibt knapp wie die Wahl funktioniert,
  // die exakte Anzahl pro Aktion steht direkt auf den Cards (× N).
  // Wolf 2026-05-05: Texte editierbar via /rules-editor — Defaults als Fallback.
  // 2026-05-17: bei aktiven CozyGames Hinweis dass nach Runde 1 das Mini-Spiel kommt.
  const cozyGamesActive = !!(s as any).cozyGamesEnabled
    && Array.isArray((s as any).cozyGamesPool)
    && (s as any).cozyGamesPool.length > 0;

  const ROUND_RULES: Record<number, { de: string[]; en: string[]; emoji: string }> = {
    1: {
      emoji: '🏁',
      de: cozyGamesActive
        ? [getRuleText('round.1.line1', 'de', 'Eure Aktion diese Runde:'),
           getRuleText('round.1.line2', 'de', 'Sichert euch eure ersten Felder!'),
           getRuleText('round.1.line3_cg', 'de', '🪅 Nach dieser Runde wartet ein CozyGame auf euch!')]
        : [getRuleText('round.1.line1', 'de', 'Eure Aktion diese Runde:'),
           getRuleText('round.1.line2', 'de', 'Sichert euch eure ersten Felder!')],
      en: cozyGamesActive
        ? [getRuleText('round.1.line1', 'en', 'Your action this round:'),
           getRuleText('round.1.line2', 'en', 'Claim your first cells!'),
           getRuleText('round.1.line3_cg', 'en', '🪅 After this round a CozyGame awaits you!')]
        : [getRuleText('round.1.line1', 'en', 'Your action this round:'),
           getRuleText('round.1.line2', 'en', 'Claim your first cells!')],
    },
    2: {
      emoji: '⚔️',
      de: [getRuleText('round.2.line1', 'de', 'Pro richtige Antwort wählt eine Aktion:'),
           getRuleText('round.2.line2', 'de', 'Klauen jetzt möglich!')],
      en: [getRuleText('round.2.line1', 'en', 'Per correct answer choose one action:'),
           getRuleText('round.2.line2', 'en', 'Stealing now possible!')],
    },
    3: {
      emoji: '🏯',
      de: [getRuleText('round.3.line1', 'de', 'Pro richtige Antwort wählt eine Aktion:'),
           getRuleText('round.3.line2', 'de', 'Stapeln freigeschaltet — Felder dauerhaft sichern + 1 Punkt extra!')],
      en: [getRuleText('round.3.line1', 'en', 'Per correct answer choose one action:'),
           getRuleText('round.3.line2', 'en', 'Stack unlocked — lock your tile + 1 extra point!')],
    },
    4: {
      emoji: '🏯',
      de: s.connectionsEnabled !== false
        ? [getRuleText('round.4.line1', 'de', 'Pro richtige Antwort wählt eine Aktion:'),
           getRuleText('round.4.line2_finale', 'de', 'Quiz-Buddy-Punkte sammeln — danach Stapel-Bonus im Finale!')]
        : [getRuleText('round.4.line1', 'de', 'Pro richtige Antwort wählt eine Aktion:'),
           getRuleText('round.4.line2_nofin', 'de', 'Quiz-Buddy-Punkte — alles bleibt verfügbar!')],
      en: s.connectionsEnabled !== false
        ? [getRuleText('round.4.line1', 'en', 'Per correct answer choose one action:'),
           getRuleText('round.4.line2_finale', 'en', 'Collect quiz buddy points — stack-bonus finale follows!')]
        : [getRuleText('round.4.line1', 'en', 'Per correct answer choose one action:'),
           getRuleText('round.4.line2_nofin', 'en', 'Quiz buddy points — everything stays available!')],
    },
  };
  // 2-Runden-Showcase: R2 ist die letzte Runde und schaltet Klauen UND Stapeln
  // gleichzeitig frei → kombinierte Ansage statt nur „Klauen jetzt möglich".
  const roundRules = (s.totalPhases === 2 && s.gamePhaseIndex === 2)
    ? {
        emoji: '⚔️',
        de: [getRuleText('round.2.line1', 'de', 'Pro richtige Antwort wählt eine Aktion:'),
             'Klauen UND Stapeln freigeschaltet!'],
        en: [getRuleText('round.2.line1', 'en', 'Per correct answer choose one action:'),
             'Steal AND stack unlocked!'],
      }
    : (ROUND_RULES[s.gamePhaseIndex] ?? ROUND_RULES[3]);

  // ── Round Self-Transition ──
  // 2026-05-12 (Audit P0 #4 — Timeline-Sync): Alle Timing-Konstanten dieser
  // Choreografie sind jetzt in PHASE_INTRO_TIMING zentral definiert. Vorher
  // mehrere magic numbers verstreut (220/1650/2500ms hier, CSS-animation-
  // delays in 6+ Inline-Styles unten). Wer Timing tweaked muss nur EINMAL
  // anfassen.
  //
  // Choreografie: Wolf hüpft ZUERST, danach rollt die Ziffer.
  // - treeSwapMs: hält den Tree kurz auf Runde N-1, swappt dann auf Runde N
  //   → QQProgressTree triggert internen Hop (220ms Delay + 620ms Anim).
  //   Wolf landet ca. bei 1100ms (220 + 220 + 620 + Puffer).
  // - colorFlipMs: Farb-Übergang im Title synchron mit New-Digit-Roll-In
  //   (1650ms), nicht mit Wolf-Hop. Verhindert Mismatch-Phase „neue
  //   Wort-Farbe + alter Digit-Farbe".
  // - digitFallStartMs/digitFallDurMs: New-Digit faellt von oben rein.
  //   Start ~1150ms, Dauer 760ms.
  // - transitionEndMs: Endgueltig auf neue Runde gewechselt (2500ms).
  // 2026-05-19 (Wolf-Audit P1.3 'cat-reveal/explain ohne sound'):
  // Sub-Step-Sounds bei step-Transitionen.
  // - step 2 (Cat-Reveal): playRevealHighlight — kurzer Auflösungs-Akkord
  //   markiert „Kategorie ist da", anstelle bisheriger Stille.
  // - step 3 (Cat-Explain): playTick — ganz dezenter Akzent zum Wechsel,
  //   damit Spieler-Aufmerksamkeit auf die Erklärung zieht.
  const prevIntroStepRef = useRef<number | null>(null);
  useEffect(() => {
    if (s.sfxMuted) { prevIntroStepRef.current = s.introStep; return; }
    const prev = prevIntroStepRef.current;
    const cur = s.introStep ?? 0;
    if (prev !== cur) {
      if (cur === 2 && prev !== null && prev < 2) {
        try { playRevealHighlight(); } catch {}
      } else if (cur === 3 && prev !== null && prev < 3) {
        try { playTick(); } catch {}
      }
      prevIntroStepRef.current = cur;
    }
  }, [s.introStep, s.sfxMuted]);

  const hasRoundTransition = isFirstOfRound && s.introStep === 0 && s.gamePhaseIndex > 1;
  const [transitioning, setTransitioning] = useState(hasRoundTransition);
  const [treeShowsPrev, setTreeShowsPrev] = useState(hasRoundTransition);
  const [colorTransitioning, setColorTransitioning] = useState(hasRoundTransition);
  useEffect(() => {
    if (!hasRoundTransition) {
      setTransitioning(false);
      setTreeShowsPrev(false);
      setColorTransitioning(false);
      return;
    }
    setTransitioning(true);
    setTreeShowsPrev(true);
    setColorTransitioning(true);
    const tTree  = setTimeout(() => setTreeShowsPrev(false),    PHASE_INTRO_TIMING.treeSwapMs);
    const tColor = setTimeout(() => setColorTransitioning(false), PHASE_INTRO_TIMING.colorFlipMs);
    const tEnd   = setTimeout(() => setTransitioning(false),      PHASE_INTRO_TIMING.transitionEndMs);
    return () => { clearTimeout(tTree); clearTimeout(tColor); clearTimeout(tEnd); };
  }, [s.gamePhaseIndex, hasRoundTransition]);

  const prevIdx = s.gamePhaseIndex - 1;
  // 2026-05-07: prevColor auch ESC-Pink, damit waehrend Round-Transition
  // kein Farbwechsel stattfindet (Phase-Color cycelt nicht im ESC-Mode).
  const prevColor = isEsc ? '#FF2D7B' : getRoundColor(Math.max(1, prevIdx), s.totalPhases ?? 4);
  // 2026-06-24 (Wolf 'schrift auch schwarz?'): Hero-„Runde N" auf dem Seiten-BG
  // → var(--qq-title) (Mono=Schwarz etc.) bei Skin. Cozy/ESC = Runden-Farbe.
  const titleColor = isThemed() ? 'var(--qq-title)' : color;
  const prevTitleColor = isThemed() ? 'var(--qq-title)' : prevColor;
  const prevPhaseName = prevIdx < 1 ? phaseName : phaseNamesRaw[prevIdx];
  const prevPhaseDesc = prevIdx < 1 ? phaseDesc : phaseDescsRaw[prevIdx];

  const displayColor = transitioning ? prevColor : color;
  const displayPhaseDesc = transitioning ? prevPhaseDesc : phaseDesc;
  const displayGpi = transitioning ? prevIdx : s.gamePhaseIndex;

  // Ziffer-Flip: nur möglich wenn beide Titel "Runde N" / "Round N" sind
  const digitRe = /^(Runde|Round)\s+(\d+)$/;
  const prevTitleMatch = prevPhaseName.match(digitRe);
  const newTitleMatch = phaseName.match(digitRe);
  const canDigitFlip = hasRoundTransition && !!prevTitleMatch && !!newTitleMatch;
  const titleWord = newTitleMatch ? newTitleMatch[1] : (lang === 'de' ? 'Runde' : 'Round');
  const prevDigit = prevTitleMatch ? prevTitleMatch[2] : '';
  const newDigit  = newTitleMatch  ? newTitleMatch[2]  : '';

  // Finale-Roll-Animation deaktiviert seit „Finale" jetzt das 4×4-Connections-
  // Mini-Game ist und Quiz-Runden immer „Runde N" heißen. Variablen bleiben
  // als no-op für die Render-Pfade unten.
  const isFinaleTransition = false;
  const finaleWord = lang === 'de' ? 'FINALE' : 'FINAL';
  const prevRoundFull = prevTitleMatch ? `${prevTitleMatch[1]} ${prevTitleMatch[2]}` : '';

  // Tree-State zu Beginn der Transition: letzter Dot der vorherigen Phase
  // (Wolf sitzt dort). Sobald treeShowsPrev kippt, swappt der Tree auf die
  // neue Phase und der Wolf hüpft (gesteuert in QQProgressTree).
  const displayTreeState: QQStateUpdate = useMemo(() => {
    if (!treeShowsPrev || prevIdx < 1) return s;
    const sched = s.schedule ?? [];
    let lastIdx = -1;
    for (let i = 0; i < sched.length; i++) if (sched[i].phase === prevIdx) lastIdx = i;
    return { ...s, gamePhaseIndex: prevIdx as any, questionIndex: lastIdx >= 0 ? lastIdx : s.questionIndex };
  }, [treeShowsPrev, s, prevIdx]);

  // 2026-05-04 (Wolf): Watermark-Wolf unten in PhaseIntro entfernt — er hopt
  // schon oben auf dem Progress-Tree, ein zweiter Wolf war redundant.
  const showWolfMark = false;

  // 2026-05-07 (Wolf-ESC): Pro-Draft PhaseIntro-BG-Bild (z.B. Eurovision-
  // Logo-BG hinter 'Halbfinale 1'). Fallback: lobbyBackgroundUrl.
  const phaseIntroBgUrl = s.theme?.phaseIntroBackgroundUrl ?? s.theme?.lobbyBackgroundUrl;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {phaseIntroBgUrl && (
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${phaseIntroBgUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            // 2026-05-07 (Wolf 'BG kaum sichtbar'): screen-Blend raus, 0.32 ->
            // 0.5. PhaseIntro hat groesseren Title drueber, BG darf etwas
            // dezenter bleiben als Lobby aber muss sichtbar sein.
            opacity: 0.5,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}
      <Fireflies color={isFirstOfRound && s.introStep <= 1 ? `${displayColor}88` : `${catColor ?? color}88`} />
      {s.theme?.eurovisionMode && <EurovisionHearts />}

      {showWolfMark && (
        <div style={{
          position: 'absolute',
          bottom: 'clamp(16px, 2.4cqh, 36px)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'clamp(54px, 6cqw, 92px)',
          opacity: 0,
          animation: 'qqPhaseIntroWolfFade 1.4s ease-out 1.4s forwards, qqPhaseIntroWolfBob 4.6s ease-in-out 2.8s infinite',
          filter: `drop-shadow(0 0 18px ${catColor ?? color}55) drop-shadow(0 0 6px ${catColor ?? color}33)`,
          pointerEvents: 'none',
          zIndex: 4,
        }} aria-hidden>
          <AnimatedCozyWolf
            widthCss="100%"
            mode={s.theme?.eurovisionMode ? 'flagge' : undefined}
            speaking={false}
          />
        </div>
      )}
      <style>{`
        @keyframes qqPhaseIntroWolfFade {
          0%   { opacity: 0; transform: translate(-50%, 12px); }
          100% { opacity: 0.7; transform: translate(-50%, 0); }
        }
        @keyframes qqPhaseIntroWolfBob {
          0%, 100% { transform: translate(-50%, 0); }
          50%      { transform: translate(-50%, -6px); }
        }
      `}</style>

      {isFirstOfRound && s.introStep === 0 ? (
        /* ── Step 0: Round announcement (first question only) ── */
        <>
          {/* Round progress pill — Farbe + Text transitionen von prev auf new.
              2026-05-07 (Wolf 'mehr Pink+Blau, Set F'): im ESC-Mode Pille mit
              Pink→Blau-Gradient-BG + zweifarbiger Border statt monochrom. */}
          <div style={{
            padding: '8px 24px', borderRadius: 'var(--qq-pill-radius)',
            background: isEsc
              ? 'linear-gradient(135deg, rgba(255,45,123,0.20) 0%, rgba(59,130,246,0.20) 100%)'
              : isThemed() ? 'var(--qq-surface)' : `${displayColor}18`,
            border: isEsc
              ? '2px solid rgba(255,45,123,0.55)'
              : isThemed() ? '2px solid var(--qq-hairline)' : `2px solid ${displayColor}44`,
            fontSize: 'clamp(16px, 1.8cqw, 24px)', fontWeight: 900,
            // 2026-05-13 Kontrast-Audit: #fde6f0 auf der hellen Seite des
            // Pink/Blau-Gradient-Pill-BG matschte. #FFFFFF + Dark-Halo trennt
            // den Round-Counter klar vom Pill-BG ohne den Look zu opfern.
            color: isEsc ? '#FFFFFF' : isThemed() ? 'var(--qq-text-muted)' : `${displayColor}cc`,
            textShadow: isEsc ? '0 1px 4px rgba(0,0,0,0.5)' : 'none',
            letterSpacing: '0.1em',
            marginBottom: 28,
            animation: hasRoundTransition ? undefined : 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.1s both',
            transition: 'background 500ms ease, border-color 500ms ease, color 500ms ease',
            position: 'relative', zIndex: 5,
            boxShadow: isEsc ? '0 0 18px rgba(255,45,123,0.25)' : 'none',
          }}>
            {lang === 'de'
              ? `Runde ${displayGpi} von ${s.totalPhases}`
              : `Round ${displayGpi} of ${s.totalPhases}`}
          </div>

          {/* Shockwave burst behind title — laeuft jetzt auch waehrend
              Round-Transition (Wolf 2026-05-04): in Runde 1 sah man eine
              animierte Welle unter dem Titel, in Runde 2/3/4 fehlte sie.
              Bei aktiver Transition: spaeteres Delay damit's nicht mit dem
              Digit-Flip kollidiert. */}
          <div style={{ position: 'relative', zIndex: 5 }}>
            {/* Shockwave-Ring (cozy-Effekt) — nur in Quiet-Motion (Mono)
                ausgeblendet: der Wellen-Ring wirkt im editorialen Look fehl am
                Platz. SoftPop/Neo behalten ihn (verspielt genug). */}
            {!isQuietMotion() && <div style={{
              position: 'absolute', top: '50%', left: '50%',
              width: 200, height: 200, marginLeft: -100, marginTop: -100,
              borderRadius: '50%',
              border: `3px solid ${displayColor}55`,
              animation: hasRoundTransition
                ? 'roundShockwave 0.8s cubic-bezier(0,0,0.2,1) 2.4s both'
                : 'roundShockwave 0.8s cubic-bezier(0,0,0.2,1) 0.2s both',
              pointerEvents: 'none',
            }} />}
            {/* Round name — Ziffer-Flip / Finale-Wort-Roll / BAM.
                overflow:hidden nur waehrend der Transition, sonst bleibt
                ein sichtbares Clip-Rechteck um das FINALE-Wort stehen. */}
            {isFinaleTransition ? (
              <div style={{
                fontFamily: fontFam,
                fontSize: 'clamp(80px, 14cqw, 200px)', fontWeight: 900, lineHeight: 1,
                textAlign: 'center',
                position: 'relative', display: 'inline-block',
                overflow: transitioning ? 'hidden' : 'visible',
                // Padding-x fängt Drop-Shadow + letterSpacing-Breite des FINALE-Worts ab,
                // sonst wird das letzte 'E' rechts abgeschnitten.
                padding: '0 0.18em 0.18em',
                animation: 'roundBreathe 4s ease-in-out 2s infinite',
              }}>
                {/* Sizer (unsichtbar) – trägt Breite/Baseline des FINALE-Worts.
                    MUSS dasselbe letterSpacing wie der animierte Span haben, sonst
                    kollabiert der Container. */}
                <span style={{ visibility: 'hidden', letterSpacing: '0.04em' }}>{finaleWord}</span>
                {/* Alte "Runde N" fällt – synchron zur Subtitle-Fall-Animation */}
                <span style={{
                  position: 'absolute', left: 0, top: 0, right: 0, textAlign: 'center',
                  color: prevColor,
                  textShadow: `0 0 120px ${prevColor}33`,
                  animation: 'roundDigitFall 760ms var(--qq-ease-smooth-out) 1150ms both',
                }}>{prevRoundFull}</span>
                {/* FINALE rollt von oben – mit Gold-Gradient */}
                <span style={{
                  position: 'absolute', left: 0, top: 0, right: 0, textAlign: 'center',
                  // Skin: solider Hero-Titel statt Pink-Amber-Gradient
                  backgroundImage: isThemed() ? 'none' : 'linear-gradient(180deg, #FBCFE8 0%, #EC4899 45%, #D97706 100%)',
                  WebkitBackgroundClip: isThemed() ? undefined : 'text',
                  backgroundClip: isThemed() ? undefined : 'text',
                  WebkitTextFillColor: isThemed() ? 'var(--qq-title)' : 'transparent',
                  color: isThemed() ? 'var(--qq-title)' : 'transparent',
                  letterSpacing: '0.04em',
                  textShadow: isThemed() ? 'none' : `0 0 80px #EC489955`,
                  filter: isThemed() ? undefined : 'drop-shadow(0 12px 0 rgba(180,83,9,0.35))',
                  animation: 'roundDigitRoll 820ms cubic-bezier(0.16, 1, 0.3, 1) 1650ms both',
                }}>{finaleWord}</span>
              </div>
            ) : canDigitFlip ? (
              <div style={{
                fontFamily: fontFam,
                fontSize: 'clamp(100px, 18cqw, 260px)', fontWeight: 900, lineHeight: 1,
                textShadow: `0 0 120px ${color}33`,
                textAlign: 'center',
                display: 'inline-flex', alignItems: 'baseline', justifyContent: 'center',
                gap: '0.18em',
                animation: 'roundBreathe 4s ease-in-out 2s infinite',
              }}>
                {/* Wort "Runde": 2026-05-04 v4 (Wolf-Bug) — Vorher Gradient-Sweep
                    von Grau→Color, ergab Mismatch-Phase wo Wort schon neue Farbe
                    hatte waehrend Digit noch alte Farbe zeigte. Jetzt: gleiche
                    Color-Logik wie Outer-Digit-Span (prevColor → color) mit 820ms
                    transition. Wort + Neuer Digit fluten IMMER synchron. */}
                <span style={{
                  display: 'inline-block',
                  color: colorTransitioning ? prevTitleColor : titleColor,
                  transition: 'color 820ms ease',
                }}>{titleWord}</span>
                {/* Ziffern-Flip-Container — startet NACH dem Wolf-Hop (Hop landet ~1100ms).
                    overflow:hidden nur waehrend der Transition — sonst bleibt ein
                    sichtbares Clip-Rechteck um die Ziffer stehen. */}
                <span style={{
                  position: 'relative', display: 'inline-block',
                  overflow: transitioning ? 'hidden' : 'visible',
                  paddingBottom: '0.15em',
                  lineHeight: 1,
                  // 2026-05-04 v4 (Wolf): Outer-Span color synchron mit New-Digit-
                  // Roll-In (1650-2470ms). colorTransitioning endet jetzt bei
                  // 1650ms, danach 820ms transition → bei 2470ms voll in neuer
                  // Farbe. Gleiches Timing wie Word "Runde" → kein Mismatch.
                  color: colorTransitioning ? prevTitleColor : titleColor,
                  transition: 'color 820ms ease',
                }}>
                  {/* Unsichtbarer Sizer — trägt die Baseline + Breite des neuen Digits */}
                  <span style={{ visibility: 'hidden' }}>{newDigit}</span>
                  {/* Alte Ziffer fällt — startet, sobald der Wolf gelandet ist */}
                  <span style={{
                    position: 'absolute', left: 0, top: 0, right: 0, textAlign: 'center',
                    color: prevColor,
                    animation: 'roundDigitFall 760ms var(--qq-ease-smooth-out) 1150ms both',
                  }}>{prevDigit}</span>
                  {/* Neue Ziffer rollt von oben */}
                  <span style={{
                    position: 'absolute', left: 0, top: 0, right: 0, textAlign: 'center',
                    animation: 'roundDigitRoll 820ms cubic-bezier(0.16, 1, 0.3, 1) 1650ms both',
                  }}>{newDigit}</span>
                </span>
              </div>
            ) : (
              <div style={{
                fontFamily: fontFam,
                fontSize: 'clamp(100px, 18cqw, 260px)', fontWeight: 900, lineHeight: 0.9,
                color: titleColor,
                // 2026-05-07 v12 (Wolf 'kontrast unleserlich'): bei ESC-Pink-
                // Title auf Pink/Lila/Heart-BG dunkler Halo dazu fuer Lesbarkeit.
                textShadow: isThemed()
                  ? 'none'
                  : isEsc
                  ? `0 4px 22px rgba(0,0,0,0.7), 0 0 120px ${color}44`
                  : `0 0 120px ${color}44`,
                textAlign: 'center',
                animation: 'roundBam 0.65s var(--qq-ease-out-cubic) 0.15s both, roundBreathe 4s ease-in-out 1.2s infinite',
              }}>
                {phaseName}
              </div>
            )}
          </div>

          {/* Divider line with glow + shimmer.
              2026-05-04 v4 (Wolf-Bug 'shimmer fehlt auch in Runde 3+4'):
              Vorher 3s Cycle + 1.0s Delay → bei schnellem Mod-Clicken durch
              Step-0 verpasste Wolf den Shimmer-Pass. Jetzt zwei-Layer-Ansatz:
              - Base-Layer: farbiger Bar (immer sichtbar, kein Shimmer)
              - Overlay-Layer (eigenes div): heller weisser Shimmer-Sweep, 1.8s
                Cycle, no delay → mind. 1 Pass schon waehrend der 2.5s Round-
                Transition garantiert sichtbar. */}
          <div style={{
            width: 'clamp(240px, 35cqw, 500px)', height: 5, borderRadius: 3,
            background: isThemed()
              ? 'linear-gradient(90deg, transparent, var(--qq-accent), transparent)'
              : `linear-gradient(90deg, transparent, ${displayColor}, transparent)`,
            marginTop: 28, marginBottom: 28,
            transformOrigin: 'center',
            // Quiet Motion (Mono): statische editoriale Linie — kein Bounce-In,
            // kein Glow, kein Shimmer-Sweep.
            animation: isQuietMotion() ? undefined : 'roundLineGlow 0.7s var(--qq-ease-bounce) 0.5s both',
            boxShadow: isQuietMotion()
              ? 'none'
              : isThemed()
                ? '0 0 20px rgba(var(--qq-accent-rgb),0.33), 0 0 40px rgba(var(--qq-accent-rgb),0.13)'
                : `0 0 20px ${displayColor}55, 0 0 40px ${displayColor}22`,
            transition: 'box-shadow 500ms ease',
            position: 'relative', zIndex: 5,
            overflow: 'hidden',
          }}>
            {/* Heller White-Shimmer-Sweep — laeuft kontinuierlich von links
                nach rechts. In Quiet Motion (Mono) aus (Wolfs „Hin-und-Her"). */}
            {!isQuietMotion() && <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, transparent 0%, transparent 30%, rgba(255,255,255,0.85) 50%, transparent 70%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'lineShimmer 1.8s linear 0.6s infinite',
              pointerEvents: 'none',
            }} />}
          </div>

          {/* Mission subtitle — bei Round-Transition rollt der alte Text raus und der neue rein (synchron zur Ziffer).
              overflow:hidden nur waehrend der Transition, sonst bleibt ein
              Clip-Rechteck um den Subtitle stehen. */}
          {hasRoundTransition ? (
            <div style={{
              fontFamily: fontFam,
              fontSize: 'clamp(36px, 5cqw, 68px)', fontWeight: 900,
              textShadow: isThemed() ? 'none' : `0 0 30px ${color}33`,
              position: 'relative', zIndex: 5,
              textAlign: 'center',
              display: 'inline-block',
              overflow: transitioning ? 'hidden' : 'visible',
              paddingBottom: '0.2em',
            }}>
              {/* Sizer (unsichtbar) — trägt die Baseline + Breite des neuen Subtitle */}
              <span style={{ visibility: 'hidden' }}>{phaseDesc}</span>
              {/* Alter Subtitle fällt — synchron zur alten Ziffer */}
              <span style={{
                position: 'absolute', left: 0, right: 0, top: 0, textAlign: 'center',
                color: isThemed() ? 'var(--qq-title)' : `${prevColor}dd`,
                animation: 'roundDigitFall 760ms var(--qq-ease-smooth-out) 1150ms both',
              }}>{prevPhaseDesc}</span>
              {/* Neuer Subtitle rollt von oben — synchron zur neuen Ziffer.
                  Farbe folgt dem Wolf-Avatar (colorTransitioning), genau wie
                  der Outer-Digit-Span — im Skin aber Hero-Titel-Farbe. */}
              <span style={{
                position: 'absolute', left: 0, right: 0, top: 0, textAlign: 'center',
                color: isThemed() ? 'var(--qq-title)' : (colorTransitioning ? `${prevColor}dd` : `${color}dd`),
                transition: 'color 600ms ease',
                animation: 'roundDigitRoll 820ms cubic-bezier(0.16, 1, 0.3, 1) 1650ms both',
              }}>{phaseDesc}</span>
            </div>
          ) : (
            <div style={{
              fontFamily: fontFam,
              fontSize: 'clamp(36px, 5cqw, 68px)', fontWeight: 900,
              color: isThemed() ? 'var(--qq-title)' : `${displayColor}dd`,
              textShadow: isThemed() ? 'none' : `0 0 30px ${displayColor}33`,
              animation: 'subtitleSlide 0.55s var(--qq-ease-bounce) 0.7s both',
              transition: 'color 500ms ease, text-shadow 500ms ease',
              position: 'relative', zIndex: 5,
              textAlign: 'center',
            }}>
              {displayPhaseDesc}
            </div>
          )}

          {/* Fortschrittsbaum — während Transition zeigt er den letzten Dot der
              vorherigen Runde, nach ~450ms swappt er auf die neue Runde →
              Amber-Linie wächst smooth zum ersten Dot rüber. */}
          <div style={{
            marginTop: 36,
            animation: hasRoundTransition ? undefined : 'contentReveal 0.6s var(--qq-ease-pop-fast) 1.0s both',
            position: 'relative', zIndex: 5,
          }}>
            <QQProgressTree state={displayTreeState} variant="inline" bigIcons />
          </div>
        </>
      ) : isFirstOfRound && s.introStep === 1 ? (
        /* ── Step 1: Rule reminder (what's new this round) ── */
        <>
          {/* Round pill — smaller context */}
          <div style={{
            padding: '6px 20px', borderRadius: 'var(--qq-pill-radius)',
            background: isThemed() ? 'var(--qq-surface)' : `${color}15`,
            border: isThemed() ? '1.5px solid var(--qq-hairline)' : `1.5px solid ${color}33`,
            fontSize: 'clamp(14px, 1.5cqw, 20px)', fontWeight: 900,
            color: isThemed() ? 'var(--qq-accent)' : `${color}aa`, letterSpacing: '0.04em',
            marginBottom: 24,
            animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.1s both',
            position: 'relative', zIndex: 5,
          }}>
            {phaseName}
          </div>

          {/* Big emoji — R3+R4 zeigen Stapel-Pin als Highlight (Trinity-Mechanik) */}
          <div style={{
            fontSize: 'clamp(72px, 12cqw, 140px)',
            animation: 'phasePop 0.6s var(--qq-ease-bounce) 0.15s both, cfloat 4s ease-in-out 1s infinite',
            position: 'relative', zIndex: 5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {(s.gamePhaseIndex === 3 || s.gamePhaseIndex === 4) ? (
              <QQEmojiIcon emoji="🏯" />
            ) : (
              roundRules.emoji
            )}
          </div>

          {/* "NEU" badge (skip for round 1) */}
          {s.gamePhaseIndex > 1 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 22px', borderRadius: 'var(--qq-pill-radius)',
              background: isThemed() ? 'var(--qq-surface)' : `${color}25`,
              border: isThemed() ? '2px solid var(--qq-accent)' : `2px solid ${color}55`,
              fontSize: 'clamp(18px, 2cqw, 28px)', fontWeight: 900,
              color: isThemed() ? 'var(--qq-accent)' : color, letterSpacing: '0.1em', textTransform: 'uppercase',
              marginTop: 20, marginBottom: 8,
              animation: 'phasePop 0.5s var(--qq-ease-bounce) 0.3s both',
              position: 'relative', zIndex: 5,
            }}>
              {lang === 'de' ? '✨ NEU' : '✨ NEW'}
            </div>
          )}

          {/* Aktionen-Bereich — kleiner Header, dann Karten als Hauptinhalt.
              Vorher: zwei dicke Textzeilen mit redundanter Wiederholung der
              Action-Card-Subtexte. Jetzt: Cards sprechen fuer sich. */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            marginTop: s.gamePhaseIndex === 1 ? 24 : 12,
            position: 'relative', zIndex: 5,
          }}>
            {/* Schlankes Label statt riesiger Regel-Texte */}
            <div style={{
              fontSize: 'clamp(13px, 1.4cqw, 20px)', fontWeight: 900,
              color: isThemed() ? 'var(--qq-accent)' : `${color}cc`, letterSpacing: '0.1em', textTransform: 'uppercase',
              textAlign: 'center',
              animation: 'phasePop 0.5s var(--qq-ease-bounce) 0.4s both',
            }}>
              {(() => {
                // Erste Regel-Zeile als Untertitel — sie beschreibt das Was kompakt.
                const lead = (lang === 'en' ? roundRules.en : roundRules.de)[0];
                return lead;
              })()}
            </div>
            {/* Action-Cards mit explizitem Counter (×N) pro Aktion. Cards werden je
                nach Runde dynamisch zusammengestellt — eine Wahl pro richtige
                Antwort. Limits (max X pro Runde / Spiel) als Footer-Pill je Card. */}
            {(() => {
              // ActionCardData-Typ aus '../components/QQActionCard' (s. Import oben).
              const ph = s.gamePhaseIndex;
              // 2026-04-28 (User-Wunsch): 'Platzieren'-Card nur anzeigen wenn
              // noch freie Felder im Grid existieren (sonst irreführend in
              // Runde 3/4 wenn Brett voll ist).
              const hasFreeCells = s.grid.some(row => row.some(c => !c.ownerId));
              const placeCard: ActionCardData | null = hasFreeCells
                ? (ph === 1
                    // 2026-05-09 (Wolf): Place ist in R1 brandneu für die Spieler →
                    // soll auch flippen wie die NEW-Cards in R2/R3.
                    ? { count: 1, emoji: '📍', label: lang === 'en' ? 'Place' : 'Platzieren', accent: color, isNew: true }
                    : ph === 2
                    ? { count: 2, emoji: '📍', label: lang === 'en' ? 'Place' : 'Platzieren', accent: color }
                    : { count: 2, emoji: '📍', label: lang === 'en' ? 'Place' : 'Platzieren',
                        limit: lang === 'en' ? 'while free cells' : 'wenn Feld frei',
                        accent: color })
                : null;
              const cards: ActionCardData[] = ph === 1
                ? (placeCard ? [placeCard] : [])
                : ph === 2
                ? [
                    ...(placeCard ? [placeCard] : []),
                    { count: 1, emoji: '⚡', label: lang === 'en' ? 'Steal' : 'Klauen',
                      limit: lang === 'en' ? 'max 2x per round' : 'max 2x pro Runde',
                      accent: '#EF4444', isNew: true },
                  ]
                : ph === 3
                ? [
                    ...(placeCard ? [placeCard] : []),
                    { count: 1, emoji: '⚡', label: lang === 'en' ? 'Steal' : 'Klauen', accent: '#EF4444' },
                    { count: 1, emoji: '🏯', label: lang === 'en' ? 'Stack' : 'Stapeln',
                      limit: lang === 'en' ? '+1 pt · max 3 per game' : '+1 Pkt · max 3 pro Spiel',
                      accent: '#06B6D4', isNew: true },
                  ]
                : ph === 4
                ? [
                    ...(placeCard ? [placeCard] : []),
                    { count: 1, emoji: '⚡', label: lang === 'en' ? 'Steal' : 'Klauen', accent: '#EF4444' },
                    { count: 1, emoji: '🏯', label: lang === 'en' ? 'Stack' : 'Stapeln',
                      limit: lang === 'en' ? '+1 pt · max 3 per game' : '+1 Pkt · max 3 pro Spiel',
                      accent: '#06B6D4' },
                  ]
                : [];
              // Cards alle gleich gross + mittig + prominent. Statt 'compact-Modus'
              // bei vielen Cards behalten wir EINE Groesse und lassen flex die Breite
              // gleich verteilen. align-items: stretch sorgt fuer gleiche Hoehen.
              const oder = lang === 'en' ? 'or' : 'oder';
              const cardCount = cards.length;
              // Single-Card → zentriert mit max-Breite, multi → flex evenly
              // 2026-04-30 v3 round 8 (User-Wunsch 'cards aufploppen nacheinander
              // damit ich moderieren kann'): pro Card gestaffelter Delay 1.5s,
              // erste Card bei 0.85s. „oder"-Separator pop'pt 100ms vor naechster
              // Card. Sound (playActionMenuReveal) pro Card synchron im
              // separaten useEffect (siehe oben am Beginn der Komponente).
              const cardStaggerMs = 1500;
              const cardBaseMs = 850;
              return (
                <div style={{
                  flex: 1, minHeight: 0,
                  marginTop: 'clamp(20px, 3cqh, 40px)',
                  display: 'flex', flexDirection: 'row', flexWrap: 'wrap',
                  alignItems: 'stretch', justifyContent: 'center',
                  gap: 'clamp(10px, 1.6cqw, 24px)',
                  width: '100%', maxWidth: 1700,
                  // 2026-05-12 (Wolf 'mind-abstand zum Rand auf jedem slide'):
                  // Action-Card-Row bekommt horizontalen Safe-Margin. Bei 3
                  // Cards a 480px + 2x oder-Separatoren konnten Cards bei
                  // schmaleren Beamer-Aufloesungen (1366x768) bis an die
                  // Screen-Kante reichen. Mit padding-x var(--qq-safe-margin)
                  // garantiert min 20-32px Abstand. BG-Layer (Fireflies,
                  // BG-image) stehen daneben auf View-Root-Level full-bleed.
                  paddingInline: 'var(--qq-safe-margin)',
                  boxSizing: 'border-box',
                }}>
                  {cards.map((c, i) => {
                    const iconSize = 'clamp(72px, 8.5cqw, 132px)';
                    // 2026-06-28 (Wolf): Platzieren/Klauen/Stapeln auf den Action-
                    // Cards nutzen jetzt die neuen cozy3d-Aktions-Icons (PNG) statt
                    // der OS-Emoji 📍/⚡/🏯. Das emoji-Feld bleibt fuer die Sound-
                    // Erkennung in ActionCardReveal erhalten.
                    const ACTION_SLUG: Record<string, QQIconSlug> = {
                      '📍': 'action-place', '⚡': 'action-steal', '🏯': 'action-stack',
                    };
                    const actionSlug = c.emoji ? ACTION_SLUG[c.emoji] : undefined;
                    const iconNode = c.slug
                      ? <QQIcon slug={c.slug} size={iconSize} alt={c.label} />
                      : actionSlug
                      ? <QQIcon slug={actionSlug} size={iconSize} alt={c.label} />
                      : <QQEmojiIcon emoji={c.emoji ?? '?'} />;
                    // Base-Delay pro Card-Position. Build-up fuer isNew (+600ms)
                    // wird intern in ActionCardReveal addiert.
                    const cardDelayMs = cardBaseMs + i * cardStaggerMs;
                    const sepDelayMs = cardDelayMs - 100;
                    return (
                      <Fragment key={i}>
                        {i > 0 && (
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 'clamp(15px, 1.6cqw, 22px)',
                            fontWeight: 900, color: 'var(--qq-text-muted)',
                            letterSpacing: '0.1em', textTransform: 'uppercase',
                            flex: '0 0 auto',
                            animation: `phasePop 0.4s var(--qq-ease-bounce) ${sepDelayMs / 1000}s both`,
                          }}>{oder}</div>
                        )}
                        <ActionCard
                          cardData={c}
                          iconNode={iconNode}
                          iconSize={iconSize}
                          cardCount={cardCount}
                          lang={lang}
                          delayMs={cardDelayMs}
                        />
                      </Fragment>
                    );
                  })}
                </div>
              );
            })()}
            {/* (per-Runde Card-Bloecke entfernt — werden durch unified IIFE oben generiert) */}
          </div>
        </>
      ) : s.categoryIsNew ? (
        /* ── Category explanation (first time this category/mechanic appears) ── */
        (() => {
          // Detailed explanations per category (and BUNTE_TUETE sub-kinds)
          const btKind = s.currentQuestion?.bunteTuete?.kind;
          const CAT_INTRO: Record<string, { emoji: string; title: { de: string; en: string }; lines: { de: string[]; en: string[] } }> = {
            SCHAETZCHEN: {
              emoji: catEmoji, title: { de: 'Schätzchen', en: 'Close Call' },
              lines: {
                de: ['Wer am nächsten dran liegt, gewinnt — knapp dran zählt auch.'],
                en: ['Closest guess wins — near misses also count.'],
              },
            },
            MUCHO: {
              emoji: catEmoji, title: { de: 'Mu-Cho', en: 'Mu-Cho' },
              lines: {
                de: ['4 Antworten, 1 richtige. Speed entscheidet.'],
                en: ['4 options, 1 right. Speed decides.'],
              },
            },
            ZEHN_VON_ZEHN: {
              emoji: catEmoji, title: { de: '10 von 10', en: 'All In' },
              lines: {
                de: ['Verteilt 10 Punkte auf 3 Antworten.'],
                en: ['Spread 10 points across 3 answers.'],
              },
            },
            CHEESE: {
              emoji: catEmoji, title: { de: 'Schau mal!', en: 'Picture This' },
              lines: {
                de: ['Erkennt das Bild — tippt die Antwort ins Handy.'],
                en: ['Spot the image — type your answer.'],
              },
            },
            // BUNTE_TUETE sub-mechanics
            'BUNTE_TUETE:top5': {
              emoji: '🏆', title: { de: 'Top 5', en: 'Top 5' },
              lines: {
                de: ['Bis zu 5 Antworten — meiste Treffer gewinnt.'],
                en: ['Up to 5 answers — most hits wins.'],
              },
            },
            'BUNTE_TUETE:oneOfEight': {
              emoji: '🕵️', title: { de: 'Imposter', en: 'Imposter' },
              lines: {
                de: ['Unter 8 Aussagen ist eine falsch. Findet sie.'],
                en: ['One of 8 statements is false. Find it.'],
              },
            },
            'BUNTE_TUETE:order': {
              emoji: '📊', title: { de: 'Reihenfolge', en: 'Order' },
              lines: {
                de: ['Sortiert richtig — meiste Treffer gewinnt.'],
                en: ['Sort correctly — most hits wins.'],
              },
            },
            'BUNTE_TUETE:map': {
              emoji: '🗺️', title: { de: 'CozyGuessr', en: 'CozyGuessr' },
              lines: {
                de: ['Tippt den Ort auf der Karte — nächstes Team gewinnt.'],
                en: ['Pin the spot on the map — closest team wins.'],
              },
            },
            'BUNTE_TUETE:hotPotato': {
              emoji: '🥔', title: { de: 'Heiße Kartoffel', en: 'Hot Potato' },
              lines: {
                de: ['Reihum antworten — keine Antwort vor Zeitende = raus'],
                en: ['Take turns — no answer before time runs out = out'],
              },
            },
            'BUNTE_TUETE:onlyConnect': {
              emoji: '🧩', title: { de: '4 gewinnt', en: 'Only Connect' },
              lines: {
                de: ['4 Begriffe — was verbindet sie? Ein Tipp pro Team, schnellste richtige Antwort gewinnt zuerst.'],
                en: ['4 terms — what connects them? One guess per team, fastest correct answer wins first.'],
              },
            },
            'BUNTE_TUETE:bluff': {
              emoji: '🎭', title: { de: 'Bluff', en: 'Bluff' },
              lines: {
                de: ['Erfindet plausible Falsch-Antworten und ratet die echte.'],
                en: ['Invent plausible fake answers — then spot the real one.'],
              },
            },
          };

          const key = cat === 'BUNTE_TUETE' && btKind ? `BUNTE_TUETE:${btKind}` : (cat ?? '');
          const info = CAT_INTRO[key] ?? CAT_INTRO[cat ?? ''];
          if (!info) return null;

          return (
            <>
              {/* Category pill — zwei Zeilen: Runde + Fragen-Fortschritt */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '8px 22px',
                borderRadius: isThemed() ? 'var(--qq-card-radius)' : 16,
                background: isThemed() ? 'var(--qq-surface)' : `${catColor}15`,
                border: isThemed() ? '1.5px solid var(--qq-hairline)' : `1.5px solid ${catColor}33`,
                color: isThemed() ? 'var(--qq-text-muted)' : `${catColor}aa`, letterSpacing: '0.04em',
                marginBottom: 16,
                animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.1s both',
                position: 'relative', zIndex: 5,
              }}>
                <div style={{
                  fontSize: 'clamp(11px, 1.2cqw, 16px)', fontWeight: 900,
                  opacity: 0.8, textTransform: 'uppercase',
                }}>
                  {lang === 'de' ? `Runde ${s.gamePhaseIndex}` : `Round ${s.gamePhaseIndex}`}
                </div>
                <div style={{
                  fontSize: 'clamp(14px, 1.5cqw, 20px)', fontWeight: 900,
                }}>
                  {lang === 'de' ? `Frage ${questionInPhase} von 5` : `Question ${questionInPhase} of 5`}
                </div>
              </div>

              {/* Runden-Mini-Tree mit Wolf-Hop — zeigt Position innerhalb der aktuellen Runde */}
              <div style={{
                marginBottom: 20,
                animation: 'phasePop 0.5s var(--qq-ease-bounce) 0.12s both',
                position: 'relative', zIndex: 5,
              }}>
                <RoundMiniTree state={s} catColor={catColor} />
              </div>

              {/* Big emoji/icon — bevorzugt PNG, sonst Emoji-Fallback */}
              <div style={{
                fontSize: 'clamp(72px, 12cqw, 140px)', lineHeight: 1,
                animation: 'phasePop 0.6s var(--qq-ease-bounce) 0.15s both, qqCatNameWave 2.8s ease-in-out 1.4s infinite',
                position: 'relative', zIndex: 5,
              }}>
                {(() => {
                  const subSlug = btKind ? qqSubSlug(btKind) : null;
                  const catSlug = cat ? qqCatSlug(cat as string) : null;
                  // 2026-05-11 (Wolf): bei Bunte-Tüte-Subs ohne PNG NICHT auf
                  // cat-bunte-tuete-PNG fallback (wäre 🎁), sondern Sub-Emoji
                  // aus info.emoji rendern.
                  const slug = btKind ? subSlug : catSlug;
                  return slug
                    ? <QQIcon slug={slug} size={'clamp(110px, 16cqw, 200px)'} alt={info.title.de} />
                    : info.emoji;
                })()}
              </div>

              {/* Category/mechanic name — 3D-Stack-Look + smoothe per-Buchstabe
                  Wave (Wolf-Wunsch 2026-05-04). Wave statt qqCatTitleBreathe-
                  scale: einzelne Buchstaben in Span-Wrappern, 0.07s Stagger
                  ergibt die klassische Ocean-Wave-Geste. */}
              <div style={{
                fontFamily: fontFam,
                fontSize: 'clamp(56px, 10cqw, 160px)', fontWeight: 900, lineHeight: 1,
                color: isThemed() ? 'var(--qq-title)' : catColor,
                textShadow: isThemed()
                  ? 'none'
                  : `0 0 14px ${catColor}99, ` +
                    `0 0 40px ${catColor}55, ` +
                    `0 0 96px ${catColor}33, ` +
                    `0 5px 0 rgba(0,0,0,0.45), ` +
                    `0 14px 28px rgba(0,0,0,0.55)`,
                marginTop: 12,
                animation: 'phasePop 0.7s var(--qq-ease-bounce) 0.3s both',
                position: 'relative', zIndex: 5,
                textAlign: 'center',
                letterSpacing: '-0.005em',
                willChange: 'text-shadow',
              }}>
                {Array.from(info.title[lang]).map((ch, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-block',
                      whiteSpace: ch === ' ' ? 'pre' : undefined,
                      // Wave startet erst NACH der Entry-Pop-Animation (~1.2s),
                      // damit phasePop-scale und Wave-translate sich nicht in
                      // die Quere kommen. Stagger pro Buchstabe von dort.
                      animation: 'qqCatNameWave 2.8s ease-in-out infinite',
                      animationDelay: `${1.2 + i * 0.07}s`,
                    }}
                  >{ch}</span>
                ))}
              </div>

              {/* Explanation lines */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                marginTop: 24, position: 'relative', zIndex: 5,
              }}>
                {info.lines[lang].map((line, i) => (
                  <div key={i} style={{
                    fontSize: i === 0 ? 'clamp(26px, 3.5cqw, 48px)' : 'clamp(20px, 2.5cqw, 36px)',
                    fontWeight: i === 0 ? 800 : 600,
                    color: isThemed()
                      ? (i === 0 ? 'var(--qq-text)' : 'var(--qq-text-muted)')
                      : (i === 0 ? '#F1F5F9' : `${catColor}99`),
                    textAlign: 'center',
                    animation: `phasePop 0.6s var(--qq-ease-bounce) ${0.5 + i * 0.15}s both`,
                  }}>
                    {line}
                  </div>
                ))}
              </div>

              {/* 2026-05-24 (Wolf-Live-Test #8): ZvZ Visual-Beispiel.
                  Wolfs Feedback: „die erste mit punkten verteilen war nicht
                  sofort klar". Mini-Mockup mit Beispiel-Verteilung 7/2/1
                  damit Teams sofort die Idee „10 Punkte gewichten" greifen. */}
              {cat === 'ZEHN_VON_ZEHN' && (
                <div style={{
                  marginTop: 32, position: 'relative', zIndex: 5,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  animation: 'phasePop 0.7s var(--qq-ease-bounce) 0.9s both',
                }}>
                  <div style={{
                    fontSize: 'clamp(14px, 1.4cqw, 20px)', fontWeight: 800,
                    color: 'var(--qq-text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase',
                  }}>
                    {lang === 'en' ? 'Example' : 'Beispiel'}
                  </div>
                  <div style={{
                    display: 'flex', gap: 16, alignItems: 'center',
                    flexWrap: 'wrap', justifyContent: 'center',
                  }}>
                    {[
                      { label: 'A', pts: 7, color: '#3B82F6' },
                      { label: 'B', pts: 2, color: '#22C55E' },
                      { label: 'C', pts: 1, color: '#EF4444' },
                    ].map((opt, idx) => (
                      <div key={opt.label} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        padding: 'clamp(12px, 1.5cqw, 22px) clamp(18px, 2.2cqw, 32px)',
                        borderRadius: 14,
                        background: `${opt.color}22`,
                        border: `2px solid ${opt.color}66`,
                        boxShadow: `0 0 22px ${opt.color}33`,
                        minWidth: 'clamp(80px, 9cqw, 130px)',
                        animation: `phasePop 0.5s var(--qq-ease-bounce) ${1.0 + idx * 0.12}s both`,
                      }}>
                        <span style={{
                          fontSize: 'clamp(20px, 2cqw, 32px)', fontWeight: 900,
                          color: opt.color, letterSpacing: '0.04em',
                        }}>{opt.label}</span>
                        <span style={{
                          fontSize: 'clamp(28px, 3.2cqw, 50px)', fontWeight: 900,
                          color: isThemed() ? 'var(--qq-text)' : '#F1F5F9', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                        }}>{opt.pts}</span>
                        <span style={{
                          fontSize: 'clamp(11px, 1.1cqw, 15px)', fontWeight: 700,
                          color: 'var(--qq-text-muted)',
                        }}>
                          {lang === 'en' ? 'pts' : 'Pkt'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{
                    fontSize: 'clamp(14px, 1.4cqw, 20px)', color: isThemed() ? 'var(--qq-text-muted)' : '#cbd5e1',
                    fontStyle: 'italic', textAlign: 'center', maxWidth: 700, lineHeight: 1.4,
                    animation: 'phasePop 0.6s var(--qq-ease-bounce) 1.4s both',
                  }}>
                    {lang === 'en'
                      ? 'Hoch wenn ihr sicher seid · gleichmäßig wenn unsicher'.replace('Hoch wenn ihr sicher seid · gleichmäßig wenn unsicher', 'High bet if you\'re sure · spread if unsure')
                      : 'Hoch wenn ihr sicher seid · gleichmäßig wenn unsicher'}
                  </div>
                </div>
              )}

              {/* User-Wunsch 2026-04-28: 'Antwort auf dem Handy' Hint überall
                  raus — auf dem Beamer redundant, auf dem Handy doppelt. */}
            </>
          );
        })()
      ) : (
        /* ── Category reveal (no explanation needed — already seen) ── */
        <>
          {/* Question progress: "Frage 2 von 5" + Runden-Mini-Tree mit Wolf */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            marginBottom: 28,
            animation: 'phasePop 0.5s var(--qq-ease-bounce) 0.1s both',
            position: 'relative', zIndex: 5,
          }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
              <div style={{
                fontSize: 'clamp(13px, 1.6cqw, 20px)', fontWeight: 900,
                color: isThemed() ? 'var(--qq-text-muted)' : `${catColor}99`, letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                {lang === 'de' ? `Runde ${s.gamePhaseIndex}` : `Round ${s.gamePhaseIndex}`}
              </div>
              <div style={{
                fontSize: 'clamp(22px, 2.8cqw, 36px)', fontWeight: 900,
                color: isThemed() ? 'var(--qq-title)' : catColor, letterSpacing: '0.1em',
              }}>
                {lang === 'de' ? `Frage ${questionInPhase} von 5` : `Question ${questionInPhase} of 5`}
              </div>
            </div>
            <RoundMiniTree state={s} catColor={catColor} />
          </div>

          {cat && (
            <>
              {/* Emoji/Icon — float idle. Bei BUNTE_TUETE: Sub-Mechanik-Icon
                  (sonst sähen 4 gewinnt, Bluff, Hot Potato … alle gleich aus). */}
              {/* 2026-05-05 (Wolf 'Bounce sync zum Wave'): cfloat 4s → qqCatNameWave
                  2.8s mit Delay 1.4s = Mitte der Title-Wave-Cascade. */}
              <div style={{
                fontSize: 'clamp(80px, 14cqw, 180px)', lineHeight: 1,
                animation: 'phasePop 0.7s var(--qq-ease-bounce) 0.25s both, qqCatNameWave 2.8s ease-in-out 1.4s infinite',
                position: 'relative', zIndex: 5,
              }}>
                {(() => {
                  const subSlug = bunteKind ? qqSubSlug(bunteKind) : null;
                  // 2026-05-11 (Wolf): bei Bunte-Tüte-Subs ohne PNG NICHT auf
                  // cat-bunte-tuete-PNG fallback. catEmoji ist hier bereits
                  // korrekt das Sub-Emoji (🧩/🎭/🕵️) via bunteSub.emoji.
                  const slug = bunteKind ? subSlug : qqCatSlug(cat as string);
                  if (slug) return <QQIcon slug={slug} size={'clamp(120px, 18cqw, 240px)'} alt={catLabel} />;
                  return catEmoji;
                })()}
              </div>

              {/* Category name — per-Buchstabe Wave (Wolf-Wunsch 2026-05-04:
                  Wave bei ALLEN Cat-Branches, nicht nur cat-intro). */}
              <div style={{
                fontFamily: fontFam,
                fontSize: 'clamp(68px, 13cqw, 200px)', fontWeight: 900, lineHeight: 1,
                color: isThemed() ? 'var(--qq-title)' : catColor,
                textShadow: isThemed() ? 'none' : `0 0 80px ${catColor}44`,
                marginTop: 12,
                animation: 'phasePop 0.7s var(--qq-ease-bounce) 0.4s both',
                position: 'relative', zIndex: 5,
                textAlign: 'center',
              }}>
                {Array.from(catLabel).map((ch, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-block',
                      whiteSpace: ch === ' ' ? 'pre' : undefined,
                      animation: 'qqCatNameWave 2.8s ease-in-out infinite',
                      animationDelay: `${1.3 + i * 0.07}s`,
                    }}
                  >{ch}</span>
                ))}
              </div>

              {/* Category explanation — 1 line.
                  2026-05-05 (Wolf 'Schriftart komisch, an restl. App anpassen'):
                  Caveat-Cursive raus → inherit (Nunito) für Konsistenz mit
                  Rest der App. Size/Weight angepasst auf Standard-Sub-Headline. */}
              {catExplain && (
                <div style={{
                  fontSize: 'clamp(22px, 2.6cqw, 36px)', fontWeight: 700,
                  color: isThemed() ? 'var(--qq-text-muted)' : `${catColor}cc`,
                  letterSpacing: '0.02em',
                  marginTop: 14,
                  animation: 'phasePop 0.6s var(--qq-ease-bounce) 0.65s both',
                  position: 'relative', zIndex: 5,
                  textAlign: 'center',
                }}>
                  {catExplain}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
