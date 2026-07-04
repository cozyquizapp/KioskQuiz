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
import { useState, useEffect, useLayoutEffect, useMemo, useRef, Fragment } from 'react';
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
  // 2026-06-29 (Wolf): Wolf wandert jetzt ÜBER der Linie (Pin nach unten) statt
  // auf dem aktuellen Dot zu sitzen — so bleibt das Kategorie-Emoji sichtbar,
  // in das als Nächstes gezoomt wird.
  // 2026-07-04 (Wolf 'runden-mini-tree groesser fuer Beamer/TV-Sofa-Lesbarkeit').
  const DOT = 96;
  const GAP = 34;
  const WOLF = DOT - 4;        // Marker über der Linie (etwas kleiner als ein Dot)
  const POINTER = 11;          // Pfeil-Spitze nach unten auf den aktuellen Dot
  const VGAP = 6;              // Abstand Pfeil → Dot-Oberkante
  const DOT_TOP = WOLF + POINTER + VGAP;          // Dot-Reihe sitzt unter der Wolf-Zone
  const totalWidth = phaseEntries.length * DOT + (phaseEntries.length - 1) * GAP;
  const wolfLeft = displayIdx * (DOT + GAP) + DOT / 2;
  const progressWidth = displayIdx === 0 ? 0 : displayIdx * (DOT + GAP);
  const dotCenterY = DOT_TOP + DOT / 2;

  // Skin: Discs bleiben RUND (Wolf-Entscheid 2026-06-25 — Editorial-Kontrast wie
  // die Avatare), aber die Kategorie-Farbe (catColor) der Linie/des Wolf-Rings
  // weicht im Skin dem neutralen Akzent-Token (Mono: schwarz statt lila).
  const themed = isThemed();
  const lineCol = themed ? 'var(--qq-accent)' : catColor;

  return (
    <div style={{
      position: 'relative', width: totalWidth, height: DOT_TOP + DOT,
    }}>
      {/* Track (grau) + Progress — auf Dot-Mittelhöhe (unter der Wolf-Zone) */}
      <div style={{
        position: 'absolute', top: dotCenterY, left: DOT / 2,
        width: totalWidth - DOT, height: 3,
        background: 'rgba(148,163,184,0.28)',
        transform: 'translateY(-50%)', borderRadius: 2,
      }} />
      {progressWidth > 0 && (
        <div style={{
          position: 'absolute', top: dotCenterY, left: DOT / 2,
          width: progressWidth, height: 3,
          // 2026-05-04 (Wolf): Strich nimmt aktuelle Kategorie-Farbe (catColor)
          // statt immer Gold. Auf Cat-Seiten matcht er damit den Wolf-Avatar.
          background: themed ? lineCol : `linear-gradient(90deg, ${catColor}, ${catColor})`,
          transform: 'translateY(-50%)', borderRadius: 2,
          boxShadow: themed ? '0 0 10px rgba(var(--qq-accent-rgb),0.4)' : `0 0 10px ${catColor}99`,
          transition: 'width 540ms var(--qq-ease-smooth), background 400ms ease, box-shadow 400ms ease',
        }} />
      )}

      {/* Dots — aktueller Dot bleibt SICHTBAR (Emoji), bekommt nur einen
          Highlight-Ring; der Wolf schwebt darüber statt drauf zu sitzen. */}
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
            position: 'absolute', top: DOT_TOP, left: dotLeft,
            width: DOT, height: DOT, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: Math.round(DOT * 0.55),
            background: isPast ? 'rgba(148,163,184,0.18)'
              : isCurrent ? (themed ? 'rgba(255,255,255,0.05)' : `${catColor}1f`)
              : 'rgba(30,41,59,0.55)',
            border: isCurrent ? `2.5px solid ${lineCol}` : '1.5px solid rgba(148,163,184,0.35)',
            boxShadow: isCurrent
              ? (themed ? '0 0 18px rgba(var(--qq-accent-rgb),0.5)' : `0 0 18px ${catColor}88`)
              : 'none',
            filter: isPast ? 'grayscale(1)' : 'none',
            opacity: isPast ? 0.55 : 1,
            transition: 'opacity 320ms ease, filter 320ms ease, background 320ms ease, border-color 320ms ease, box-shadow 320ms ease',
            zIndex: 1,
          }}>
            {iconSlug
              ? <QQIcon slug={iconSlug} size={iconSize} alt={label.de} />
              : emojiFallback}
          </div>
        );
      })}

      {/* Pfeil-Spitze (zeigt vom Wolf nach unten auf den aktuellen Dot) — slidet
          horizontal mit dem Wolf mit. */}
      <div aria-hidden style={{
        position: 'absolute', top: WOLF - 1, left: wolfLeft,
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: `${POINTER}px solid transparent`,
        borderRight: `${POINTER}px solid transparent`,
        borderTop: `${POINTER}px solid ${lineCol}`,
        filter: themed ? 'none' : `drop-shadow(0 2px 4px ${catColor}66)`,
        transition: 'left 560ms cubic-bezier(0.34, 1.25, 0.64, 1), border-top-color 400ms ease',
        zIndex: 3,
      }} />

      {/* Wolf-Avatar — schwebt ÜBER der Linie und slidet horizontal zum nächsten
          Dot (Pin-Kopf). Innen wackelt der Kopf subtil (qqWolfHeadBob). */}
      <div style={{
        position: 'absolute', top: 0, left: wolfLeft,
        width: WOLF, height: WOLF, borderRadius: '50%',
        background: themed ? 'var(--qq-surface)' : 'rgba(20,16,31,0.92)',
        border: themed ? '3px solid var(--qq-accent)' : `3px solid ${catColor}`,
        boxShadow: themed
          ? '0 0 0 4px rgba(var(--qq-accent-rgb),0.18), 0 6px 14px rgba(var(--qq-accent-rgb),0.28)'
          : `0 0 0 4px ${catColor}40, 0 6px 16px ${catColor}66`,
        transform: 'translateX(-50%)',
        transition: 'left 560ms cubic-bezier(0.34, 1.25, 0.64, 1), border-color 400ms ease, box-shadow 400ms ease',
        zIndex: 4,
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

// 2026-06-30 (Wolf 'Zoom von Progress-Tree auf Kategorie-Emoji sehe ich nicht'):
// Der Kategorie-Hero soll sichtbar AUS dem Runden-Tree-Dot herauszoomen statt
// nur generisch aus der Mitte aufzuploppen. FLIP: beim Mount (Step 2) wird der
// Hero auf die Bildschirm-Position+Größe des fokussierten Tree-Dots gesetzt
// (kein Transition) und dann smooth auf seine natürliche Spalten-Position
// animiert. `dotScreen` = Dot-Position relativ zum Kamera-Viewport (vpRef).
// Fallback (kein dotScreen, z.B. Fragen 2–5 ohne sichtbaren Tree): qqCatZoomIn.
function CategoryHeroFlip({ dotScreen, vpRef, style, children }: {
  dotScreen: { sx: number; sy: number; size: number } | null;
  vpRef: React.RefObject<HTMLDivElement | null>;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!dotScreen || !vpRef.current) {
      el.style.animation = 'qqCatZoomIn 0.7s cubic-bezier(0.16,1,0.3,1) 0.05s both';
      return;
    }
    const vp = vpRef.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.width === 0) {
      el.style.animation = 'qqCatZoomIn 0.7s cubic-bezier(0.16,1,0.3,1) 0.05s both';
      return;
    }
    const heroCx = r.left + r.width / 2;
    const heroCy = r.top + r.height / 2;
    const dotX = vp.left + dotScreen.sx;
    const dotY = vp.top + dotScreen.sy;
    const scale = Math.max(0.05, dotScreen.size / r.width);
    const dx = dotX - heroCx;
    const dy = dotY - heroCy;
    el.style.transformOrigin = 'center center';
    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    el.style.opacity = '0.9';
    void el.offsetWidth; // reflow → Startzustand festschreiben
    const id = requestAnimationFrame(() => {
      el.style.transition = 'transform 0.9s cubic-bezier(0.66,0,0.34,1), opacity 0.45s ease';
      el.style.transform = 'translate(0px, 0px) scale(1)';
      el.style.opacity = '1';
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dotScreen]);
  return (
    <div ref={ref} style={{ lineHeight: 0, willChange: 'transform', ...style }}>
      {/* Innerer Bob-Wrapper: schwebt sanft nach dem Einrasten (Delay > Flip-
          Dauer), einheitlich fuer ALLE Kategorien (Wolf: 'alle sollen hovern'). */}
      <div style={{ animation: 'qqCatHeroBob 3.8s ease-in-out 1.2s infinite' }}>{children}</div>
    </div>
  );
}

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
  // 2026-07-02 (Wolf Mega): kein Grid → Mission-Subtitle nicht „Erobert das
  // Spielfeld!"/„Klaut Felder!" (jede Runde), sondern grid-freie Punkte-Ansage.
  const phaseDesc = (s as any).largeGroupMode
    ? (lang === 'de' ? 'Sammelt Punkte für euer Team!' : 'Score points for your team!')
    : phaseDescsRaw[s.gamePhaseIndex];

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
    crowdTop: {
      emoji: '🗳️',
      de: { name:    getRuleText('bunte.crowdTop.name',    'de', 'Umfrage'),
            explain: getRuleText('bunte.crowdTop.explain', 'de', 'Jedes Handy tippt EIN Stichwort — nennt, was die meisten nennen.') },
      en: { name:    getRuleText('bunte.crowdTop.name',    'en', 'Survey'),
            explain: getRuleText('bunte.crowdTop.explain', 'en', 'Each phone types ONE word — name what most people name.') },
    },
    crowdEstimate: {
      emoji: '🧠',
      de: { name:    getRuleText('bunte.crowdEstimate.name',    'de', 'Schwarmintelligenz'),
            explain: getRuleText('bunte.crowdEstimate.explain', 'de', 'Jedes Handy schätzt eine Zahl — gemeinsam liegt der Schwarm goldrichtig.') },
      en: { name:    getRuleText('bunte.crowdEstimate.name',    'en', 'Hive Mind'),
            explain: getRuleText('bunte.crowdEstimate.explain', 'en', 'Each phone guesses a number — together the swarm nails it.') },
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

  // Kategorie-Hero-Icon (Lift & Center, Wolf 2026-06-29): EXAKT dieselbe Quelle
  // wie die Tree-Dots — Bunte-Tüte-Sub bevorzugt (qqSubSlug, kann null sein →
  // dann Emoji-Fallback), sonst die Quiz-Kategorie (qqCatSlug). Wird in beiden
  // Step-2-Branches als zentriertes Hero-Overlay gerendert (catEmoji = Fallback).
  const heroIconSlug: QQIconSlug | null = bunteKind
    ? qqSubSlug(bunteKind)
    : (cat ? qqCatSlug(cat) : null);

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
  const roundRules = (s as any).largeGroupMode
    // 2026-07-02 (Wolf Mega-Event): kein Grid → keine Aktions-/Feld-Regeln.
    // Einfache, einheitliche Punkte-Ansage für alle Runden.
    ? {
        emoji: '⚡',
        de: ['Sammelt Punkte für euer Team!',
             'Je mehr richtig — und je schneller — desto mehr Punkte!'],
        en: ['Score points for your team!',
             'The more correct — and the faster — the more points!'],
      }
    : (s.totalPhases === 2 && s.gamePhaseIndex === 2)
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
  // Mega: alle Runden nutzen denselben grid-freien Subtitle → auch beim
  // Runden-Übergang keine „Klaut Felder!"-Zeile einblenden.
  const prevPhaseDesc = (s as any).largeGroupMode ? phaseDesc : (prevIdx < 1 ? phaseDesc : phaseDescsRaw[prevIdx]);

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

  // ── Journey-Zoom: persistente Welt-Kamera (Claude-Design-Handoff #3, Kern) ──
  // EIN persistenter Tree als „Welt", EINE Kamera-Transform, die per introStep
  // ihr Ziel ändert und smooth einrastet (kein key-Remount). Stationen liegen
  // weiter als Overlays darüber (werden in einer späteren Iteration verankert).
  // Koordinaten kommen aus QQProgressTree.onLayout (Tree-eigener Pixel-Frame);
  // PAD_* gleichen das Outer-Padding des Tree-Wrappers aus (tunebar).
  // 2026-06-29 (Wolf 'progress tree nicht mittig'): der Welt-Tree läuft IMMER
  // im `bare`-Modus → Wrapper-Padding = 0. Die alten 24/16 schoben jedes
  // Zoom-Ziel um ~24px·S nach links + ~16px·S nach oben (3. Kategorie nicht
  // exakt mittig). Daher hier 0.
  const PAD_L = 0, PAD_T = 0;
  const [treeMetrics, setTreeMetrics] = useState<{
    phaseCenters: number[]; dotCenters: number[]; phaseWidths: number[];
    totalWidth: number; dotRowHeight: number;
  } | null>(null);
  const camViewportRef = useRef<HTMLDivElement | null>(null);
  const [camVp, setCamVp] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = camViewportRef.current;
    if (!el) return;
    const measure = () => setCamVp({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Entry: der Tree fliegt einmalig von LINKS rein (gleiche Höhe wie Endpunkt,
  // nicht diagonal von links-oben). Erst auf left-Start ohne Transition setzen,
  // dann per rAF auf das Ziel transitionen.
  const [worldEntered, setWorldEntered] = useState(false);
  useEffect(() => {
    if (!treeMetrics || camVp.w === 0 || worldEntered) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setWorldEntered(true)));
    return () => cancelAnimationFrame(id);
  }, [treeMetrics, camVp.w, worldEntered]);
  // Kamera-Ziel pro introStep: 0 = ganzer Tree, 1 = aktueller Runden-Cluster,
  // >=2 = aktuelle Kategorie-Kachel. Welt bleibt durchgehend sichtbar (kein
  // Crossfade), Kamera zoomt kontinuierlich rein.
  const camWorldStyle = useMemo(() => {
    if (!treeMetrics || camVp.w === 0) return { transform: 'translate(0px,0px) scale(1)' };
    const { phaseCenters, dotCenters, phaseWidths, totalWidth, dotRowHeight } = treeMetrics;
    const dotSize = dotRowHeight / 1.3;
    // Bei Fragen 2–5 (kein Runden-Intro) gibt es keine introStep-Reise → direkt
    // auf die Kategorie-Kachel zoomen (Step 2) statt den ganzen Tree zu zeigen.
    const step = isFirstOfRound ? (s.introStep ?? 0) : 2;
    const pi = Math.max(0, (displayGpi ?? 1) - 1);
    const ty = dotRowHeight / 2 + PAD_T;
    let tx = totalWidth / 2 + PAD_L;
    let S = 1;
    // 2026-06-29 v4 (Wolf-Idee = Claude-Design-Referenz): EINE Welt, durchgehend
    // sichtbar, Kamera zoomt kontinuierlich rein (kein Crossfade). Fokussiertes
    // Element vertikal ~mittig; die Text-Overlays liegen per space-between oben/
    // unten drum herum, daher kollidieren sie nicht mit dem Cluster/der Kachel.
    // Step 0 (Gesamt-Tree) etwas tiefer, dort ist die Station noch klassisch
    // zentriert (Titel oben, Subtitle unter dem Tree).
    // Step 0 (Übersicht): Tree tiefer (~Spacer-Mitte), damit der Wolf-Pin (sitzt
    // ÜBER der Linie) + der Titel-Glow den großen „Runde N"-Titel nicht mehr
    // touchieren (Wolf 2026-06-30 'Unterschrift hängt im Tree').
    // 2026-07-04 (Wolf '3-Band': Titel oben, Untertitel Mitte, Tree unten):
    // Step-0-Normal-Tree klar in die untere Zone (war 0.62 → touchierte den
    // mittig gesetzten Untertitel). Titel+Untertitel werden per Trailing-Spacer
    // nach oben gehoben (s. Render), der Tree bekommt so ein eigenes Band unten.
    let vAnchor = 0.76;
    // 2026-07-02 (Wolf Mega): im Groß-Modus fehlt der Aktions-Block unter dem
    // Tree → viel Dead-Space bei Step 0. Tree etwas größer ziehen + vertikal
    // mittiger anlegen, damit der Ausschnitt die Fläche besser füllt. Nur Mega
    // + Step 0 (Normal-Journey bleibt exakt wie getunt).
    if (step === 0 && (s as any).largeGroupMode) {
      // 2026-07-03 (Wolf 'Deadspace Bild 3' → danach 'überlappt immernoch mit
      // Schrift'): Der grosse „Runde N"-Titel steht flex-zentriert in der Mitte.
      // vAnchor 0.5 legte die Journey-Linie GENAU durch den Titel. Journey daher
      // in die untere Hälfte (klar UNTER den Titel) legen; moderater Zoom füllt
      // die Fläche ohne die untere Tagline zu touchieren.
      S = 1.18;
      vAnchor = 0.72;
    }
    if (step >= 1) {
      // Step 1: auf den aktuellen Runden-Cluster. tx = phaseCenters[pi] = Mitte
      // der 5-Dot-Gruppe (horizontal mittig). 2026-06-30 (Wolf 'oben
      // abgeschnitten'): KLEINERER Zoom als zuvor — der Wolf-Pin sitzt hoch über
      // der Linie und wird mit S skaliert; bei starkem Zoom ragte er über den
      // oberen Rand. vAnchor dynamisch: gerade so tief, dass die Pin-Oberkante
      // ~9% vom Rand bleibt (`wolfClearVAnchor`), aber gedeckelt (≤0.44), damit
      // der Aktions-Block (NEU+Label+Cards) unten nicht touchiert wird.
      tx = (phaseCenters[pi] ?? totalWidth / 2) + PAD_L;
      S = Math.min(2.3, Math.max(1.6, (camVp.w * 0.56) / (phaseWidths[pi] || camVp.w)));
      const wolfClearVAnchor = 0.09 + (2.1 * dotSize * S) / camVp.h;
      // 2026-07-04 (Wolf 'Mini-Tree zu viel Deadspace → Cluster mittiger'):
      // Cluster tiefer/mittiger (war 0.37–0.44 = zu weit oben, grosse Luecke zum
      // Aktions-Block) → 0.42–0.50, naeher an die Mitte. Aktions-Block sitzt
      // absolut ganz unten, bleibt frei.
      vAnchor = Math.min(0.5, Math.max(0.42, wolfClearVAnchor));
      // 2026-07-03 (Wolf 'Deadspace Bild 4'): In Cozy Arena fehlt der Aktions-
      // Block unter dem Tree → Cluster größer ziehen UND vertikal mittiger legen
      // (0.4 → ~0.5), damit der leere Bereich unten verschwindet. Wolf-Pin bleibt
      // dank des höheren vAnchor (Linie tiefer) trotzdem frei vom oberen Rand.
      if ((s as any).largeGroupMode) {
        // 2026-07-04 (Wolf 'hier waere noch etwas Platz'): Arena hat KEINE
        // Action-Cards → grosser Leerraum zwischen Cluster und NEU/Text-Block.
        // Cluster etwas groesser + tiefer ziehen; der NEU/Text-Block wird
        // parallel nach oben gehoben (s. BOTTOM-Block bottom-Offset).
        S = Math.min(2.9, Math.max(2.1, (camVp.w * 0.7) / (phaseWidths[pi] || camVp.w)));
        const megaClear = 0.09 + (2.1 * dotSize * S) / camVp.h;
        vAnchor = Math.min(0.6, Math.max(0.52, megaClear));
      }
    }
    // Step >= 2 (Kategorie-Seite): KEIN weiterer Dive in den Mini-Dot mehr.
    // Der Dot-Zoom schleifte Linie + Nachbar-Kacheln + Ring ins Bild und das
    // Emoji landete schief (Wolf 2026-06-29 'nur Kategorie-Emoji mittig').
    // Stattdessen „Lift & Center": die Kamera HÄLT das Runden-Cluster-Framing
    // (Step-1-Werte), der Welt-Tree fadet aus (opacity → 0 bei zoomStep>=2) und
    // das Kategorie-Emoji wird als eigenes, exakt zentriertes Hero-Overlay
    // gerendert (qqCatLiftCenter). dotSize bleibt referenziert für Layout-Hooks.
    void dotSize;
    const camTx = camVp.w / 2 - tx * S;
    const camTy = camVp.h * vAnchor - ty * S;
    if (!worldEntered) {
      // Start: links daneben, SELBE Höhe (camTy) → reiner Horizontal-Einflug.
      return {
        transform: `translate(${camTx - camVp.w * 0.55}px, ${camTy}px) scale(${S})`,
        transition: 'none',
      };
    }
    return {
      transform: `translate(${camTx}px, ${camTy}px) scale(${S})`,
      transition: 'transform 0.9s cubic-bezier(0.66,0,0.34,1)',
    };
  }, [treeMetrics, camVp, s.introStep, s.questionIndex, displayGpi, worldEntered, isFirstOfRound]);

  // Effektiver Zoom-Schritt für Welt-Opacity/Wolf/Fokus (s. camWorldStyle):
  // Fragen 2–5 ohne Runden-Intro sind direkt auf Kategorie-Zoom (Step 2).
  const zoomStep = isFirstOfRound ? (s.introStep ?? 0) : 2;

  // Bildschirm-Position+Größe des fokussierten Kategorie-Dots im Step-1-Framing
  // (Runden-Cluster). Der Kategorie-Hero zoomt beim B→C-Übergang sichtbar aus
  // genau diesem Dot heraus (CategoryHeroFlip). Nur im Runden-Intro-Pfad
  // (isFirstOfRound) — bei Fragen 2–5 ist kein Tree sichtbar → null = Fallback.
  const dotScreen = useMemo(() => {
    if (!treeMetrics || camVp.w === 0 || !isFirstOfRound) return null;
    const { phaseCenters, dotCenters, phaseWidths, dotRowHeight } = treeMetrics;
    const pi = Math.max(0, (displayGpi ?? 1) - 1);
    const qi = s.questionIndex;
    if (dotCenters[qi] == null) return null;
    const S1 = Math.min(2.3, Math.max(1.6, (camVp.w * 0.56) / (phaseWidths[pi] || camVp.w)));
    const dotSize = dotRowHeight / 1.3;
    // gleiche dynamische vAnchor wie camWorldStyle Step 1 → FLIP startet exakt
    // an der echten Dot-Position.
    const wolfClearVAnchor = 0.09 + (2.1 * dotSize * S1) / camVp.h;
    const vA = Math.min(0.44, Math.max(0.37, wolfClearVAnchor));
    const sx = camVp.w / 2 + (dotCenters[qi] - (phaseCenters[pi] ?? 0)) * S1;
    const sy = camVp.h * vA;
    return { sx, sy, size: dotSize * S1 };
  }, [treeMetrics, camVp, displayGpi, s.questionIndex, isFirstOfRound]);

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
        /* Journey-Zoom-Kern: die Station selbst zoomt NICHT mehr (sonst doppelt
           es mit der Welt-Kamera) — sie fadet nur sanft ein. */
        @keyframes qqStationFade {
          0%   { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        /* Step 3 (tiefster Kategorie-Zoom): Station fadet aus, damit nur noch das
           gezoomte Kategorie-Emoji im Welt-Backdrop steht. */
        @keyframes qqStationFadeOut {
          0%   { opacity: 1; }
          55%  { opacity: 1; }
          100% { opacity: 0; }
        }
        /* Beat 2 (Wolf 2026-06-29): die Kategorie-Ansicht ZOOMT rein (scale-up
           aus der Mitte), damit der Übergang Mini-Tree → Kategorie-Emoji ein
           sichtbarer Reinzoom ist statt nur ein Einblenden. */
        @keyframes qqCatZoomIn {
          0%   { opacity: 0; transform: scale(0.30); }
          55%  { opacity: 1; }
          100% { opacity: 1; transform: scale(1); }
        }
        /* „Lift & Center" (Wolf 2026-06-29): das Kategorie-Emoji löst sich aus
           dem (gleichzeitig ausfadenden) Tree, hebt sich leicht an und wächst in
           die exakte Bildmitte. Reines Hero-Overlay — kein Liniengewirr mehr. */
        @keyframes qqCatLiftCenter {
          0%   { opacity: 0; transform: translate(-50%, -34%) scale(0.32); }
          60%  { opacity: 1; }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        /* Sanftes Schweben des Hero-Emojis nachdem es eingerastet ist. */
        @keyframes qqCatHeroFloat {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50%      { transform: translate(-50%, -50%) translateY(-10px); }
        }
        /* Reiner translateY-Bob fuer den Hero-Inner-Wrapper — kollidiert NICHT
           mit dem Flip-/Zoom-Transform des Outers. Wolf 2026-07-04: alle
           Kategorie-Emojis sollen einheitlich schweben (vorher gar keins). */
        @keyframes qqCatHeroBob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-12px); }
        }
      `}</style>

      {/* 2026-06-29 (Journey-Zoom KERN): persistente Welt-Kamera als Backdrop.
          EIN Tree = die Welt, EINE Kamera (camWorldStyle) zoomt per introStep
          (Tree → Runden-Cluster → Kategorie-Kachel) und rastet smooth ein —
          kein key-Remount mehr, also bleiben Wolf-Hop + Digit-Flip intakt.
          Stationen liegen als Overlays (zIndex 2) darüber; deren Verankerung in
          der Welt folgt in der nächsten Iteration. */}
      <div ref={camViewportRef} aria-hidden style={{
        position: 'absolute', inset: 0, overflow: 'hidden',
        zIndex: 1, pointerEvents: 'none',
        // 2026-06-29 v4 (Wolf-Idee): Welt bleibt durchgehend sichtbar — der Zoom
        // ist eine echte Kamerafahrt, kein Crossfade. Der „nackte" Tree (bare:
        // kein Container-BG, nur Symbole+Linie) + Fokus-Dimming sorgen für den
        // cleanen Look. Beim großen Dive (Step 3) fadet sie sanft, danach
        // übernimmt die Frage.
        // 2026-06-29 (Lift & Center): Tree fadet schon bei Step 2 (Kategorie-
        // Seite) aus — danach steht nur noch das zentrierte Hero-Emoji.
        opacity: zoomStep >= 2 ? 0 : 1,
        transition: 'opacity 0.55s ease',
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, transformOrigin: '0 0',
          willChange: 'transform',
          ...camWorldStyle,
        }}>
          <QQProgressTree
            state={displayTreeState}
            variant="inline"
            bigIcons
            bare
            onLayout={setTreeMetrics}
            wolfAbove
            wolfHidden={zoomStep >= 2}
            focusPhaseIdx={zoomStep >= 1 ? Math.max(0, (displayGpi ?? 1) - 1) : null}
          />
        </div>
      </div>

      {/* Stations-Overlays (Roadmap-Titel → Runde+Aktion → Kategorie → Frage).
          Liegen über der Welt-Kamera; Inhalt wechselt weiterhin per introStep.
          Das Crossfade-Remount bleibt vorerst (key) — nur die Welt dahinter ist
          jetzt die durchgehende Kamerafahrt. */}
      <div key={`qq-zoomstage-${s.gamePhaseIndex}-${s.introStep}`} style={{
        flex: 1, width: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 2,
        // 2026-06-29 v4: Die Station ist nur noch Positionierungs-Kontext für die
        // oben/unten angepinnten Overlays (Titel/Aktion/Kategorie-Name), die ihre
        // eigene Einblendung mitbringen. Container selbst ohne Fade (sonst doppelt).
        willChange: 'opacity, transform',
      }}>
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

          {/* 2026-06-30 (Wolf 'der Unterstrich verdeckt'): Die glühende Divider-
              Shimmer-Linie lag genau auf der Tree-Reihe (Wolf-Pin/Linie) und
              verdeckte sie. Seit dem Journey-Redesign IST der Tree das Struktur-
              Element unter dem Titel → Linie raus. Nur ein kleiner Atem-Abstand. */}
          <div style={{ height: 'clamp(16px, 2.4cqh, 36px)' }} aria-hidden />

          {/* Tree-Zone-Spacer: reserviert den vertikalen Raum, in dem der
              persistente Welt-Backdrop-Tree liegt. Der Subtitle kommt DANACH →
              er steht unter dem Tree (Wolf 2026-06-29).
              2026-07-04 (Wolf '3-Band': Untertitel mittig unter den Titel, Tree
              unten): Zwischen-Spacer klein → Untertitel hugged den Titel (nicht
              mehr den Tree). Ein Trailing-Spacer NACH dem Untertitel (s. unten)
              hebt Titel+Untertitel ins obere/mittlere Band, der Tree (vAnchor
              0.76) bekommt das untere Band für sich. */}
          <div style={{ height: 'clamp(12px, 1.8cqh, 32px)' }} aria-hidden />

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

          {/* Trailing-Spacer: hebt Titel+Untertitel (im zentrierten Block) ins
              obere/mittlere Band, damit der Tree unten (vAnchor 0.76) ein eigenes
              Band bekommt — 3-Band-Layout (Wolf 2026-07-04). */}
          <div style={{ height: 'clamp(150px, 22cqh, 320px)' }} aria-hidden />
        </>
      ) : isFirstOfRound && s.introStep === 1 ? (
        /* ── Step 1: Rule reminder — space-between: Titel oben, Aktion unten,
           der zoomende Welt-Cluster (Runde N, bare Tree) liegt mittig dahinter.
           RoundMiniTree entfernt (Wolf-Idee 2026-06-29 v4): die durchgehend
           sichtbare Welt-Kamera IST der Runden-Tree, kein separater Mini-Tree. */
        <>
          {/* TOP: Runden-Titel oben angepinnt */}
          <div style={{
            position: 'absolute', top: 'clamp(34px, 6cqh, 84px)', left: 0, right: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            zIndex: 5, pointerEvents: 'none',
            animation: 'qqStationFade 0.5s ease 0.2s both',
          }}>
            <div style={{
              padding: '6px 20px', borderRadius: 'var(--qq-pill-radius)',
              background: isThemed() ? 'var(--qq-surface)' : `${color}15`,
              border: isThemed() ? '1.5px solid var(--qq-hairline)' : `1.5px solid ${color}33`,
              fontSize: 'clamp(14px, 1.5cqw, 20px)', fontWeight: 900,
              color: isThemed() ? 'var(--qq-accent)' : `${color}aa`, letterSpacing: '0.04em',
            }}>
              {phaseName}
            </div>
          </div>

          {/* BOTTOM: NEU-Badge + Aktion unten angepinnt. In Cozy Arena (keine
              Action-Cards) hoeher angesetzt, damit NEU+Text naeher an den Cluster
              ruecken und der Leerraum dazwischen verschwindet (Wolf 2026-07-04). */}
          <div style={{
            position: 'absolute',
            bottom: (s as any).largeGroupMode ? 'clamp(78px, 12cqh, 180px)' : 'clamp(26px, 5cqh, 72px)',
            left: 0, right: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            zIndex: 5, boxSizing: 'border-box',
            animation: 'qqStationFade 0.5s ease 0.3s both',
          }}>
          {/* "NEU" badge (skip for round 1) */}
          {s.gamePhaseIndex > 1 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 22px', borderRadius: 'var(--qq-pill-radius)',
              background: isThemed() ? 'var(--qq-surface)' : `${color}25`,
              border: isThemed() ? '2px solid var(--qq-accent)' : `2px solid ${color}55`,
              fontSize: 'clamp(18px, 2cqw, 28px)', fontWeight: 900,
              color: isThemed() ? 'var(--qq-accent)' : color, letterSpacing: '0.1em', textTransform: 'uppercase',
              marginTop: 2, marginBottom: 4,
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
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            marginTop: s.gamePhaseIndex === 1 ? 8 : 4,
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
              // Mega Event: kein Grid → keine Platzieren/Klauen/Stapeln-Action-
              // Cards. Die Runden-Regel oben ist bereits auf „Punkte für eure
              // Farbe" umgestellt (roundRules largeGroupMode-Zweig).
              if ((s as any).largeGroupMode) return null;
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
                  marginTop: 'clamp(4px, 0.8cqh, 14px)',
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
          </div>{/* /BOTTOM-Wrapper */}
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
            'BUNTE_TUETE:crowdTop': {
              emoji: '🗳️', title: { de: 'Umfrage', en: 'Survey' },
              lines: {
                de: ['Jedes Handy tippt EIN Stichwort — nennt, was die meisten nennen.'],
                en: ['Each phone types ONE word — name what most people name.'],
              },
            },
            'BUNTE_TUETE:crowdEstimate': {
              emoji: '🧠', title: { de: 'Schwarmintelligenz', en: 'Hive Mind' },
              lines: {
                de: ['Jedes Handy schätzt eine Zahl — gemeinsam liegt der Schwarm goldrichtig.'],
                en: ['Each phone guesses a number — together the swarm nails it.'],
              },
            },
          };

          const key = cat === 'BUNTE_TUETE' && btKind ? `BUNTE_TUETE:${btKind}` : (cat ?? '');
          const info = CAT_INTRO[key] ?? CAT_INTRO[cat ?? ''];
          if (!info) return null;

          return (
            <>
              {/* TOP: Runde/Frage-Pille oben angepinnt. Der Welt-Backdrop zoomt
                  ins Kategorie-Emoji (= Hero in der Mitte), drum herum liegen
                  Eyebrow oben + Name/Satz unten (Wolf-Idee 2026-06-29 v4). */}
              <div style={{
                position: 'absolute', top: 'clamp(26px, 5cqh, 72px)', left: 0, right: 0,
                display: 'flex', justifyContent: 'center', zIndex: 5, pointerEvents: 'none',
                animation: 'qqStationFade 0.5s ease 0.15s both',
              }}>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: '8px 22px',
                  borderRadius: isThemed() ? 'var(--qq-card-radius)' : 16,
                  background: isThemed() ? 'var(--qq-surface)' : `${catColor}15`,
                  border: isThemed() ? '1.5px solid var(--qq-hairline)' : `1.5px solid ${catColor}33`,
                  color: isThemed() ? 'var(--qq-text-muted)' : `${catColor}aa`, letterSpacing: '0.04em',
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
              </div>

              {/* Zentrierte Spalte: Hero-Emoji + Name + Erklärung (+ ZvZ-
                  Beispiel). 2026-06-30 (Wolf 'überlappt bei allen Kategorien'):
                  Hero + Texte als EINE zentrierte Flex-Spalte statt absolut
                  positioniertem Hero + bottom-angepinntem Text — lange Inhalte
                  (ZvZ-Beispiel) floaten so nie ins Emoji. Tree fadet ohnehin aus. */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 'clamp(6px, 1.2cqh, 16px)',
                width: '100%', maxWidth: 1500,
                paddingInline: 'var(--qq-safe-margin)', boxSizing: 'border-box',
                animation: 'qqStationFade 0.5s ease 0.2s both',
              }}>
                {/* HERO — Kategorie-Emoji (Quelle = Tree-Dots, Emoji-Fallback).
                    Zoomt sichtbar aus dem Runden-Tree-Dot heraus (CategoryHeroFlip). */}
                <CategoryHeroFlip dotScreen={dotScreen} vpRef={camViewportRef} style={{
                  filter: isThemed()
                    ? 'drop-shadow(0 16px 28px rgba(0,0,0,0.45))'
                    : `drop-shadow(0 0 46px ${catColor}66) drop-shadow(0 16px 28px rgba(0,0,0,0.5))`,
                }}>
                  {heroIconSlug
                    ? <QQIcon slug={heroIconSlug} size="clamp(120px, 15cqw, 240px)" alt={info.title[lang]} />
                    : <div style={{ fontSize: 'clamp(110px, 14cqw, 220px)', lineHeight: 1 }}>{info.emoji}</div>}
                </CategoryHeroFlip>
              {/* Category/mechanic name — 3D-Stack-Look + smoothe per-Buchstabe
                  Wave (Wolf-Wunsch 2026-05-04). Wave statt qqCatTitleBreathe-
                  scale: einzelne Buchstaben in Span-Wrappern, 0.07s Stagger
                  ergibt die klassische Ocean-Wave-Geste. */}
              <div style={{
                fontFamily: fontFam,
                fontSize: 'clamp(48px, 8.5cqw, 130px)', fontWeight: 900, lineHeight: 1,
                color: isThemed() ? 'var(--qq-title)' : catColor,
                textShadow: isThemed()
                  ? 'none'
                  : `0 0 14px ${catColor}99, ` +
                    `0 0 40px ${catColor}55, ` +
                    `0 0 96px ${catColor}33, ` +
                    `0 5px 0 rgba(0,0,0,0.45), ` +
                    `0 14px 28px rgba(0,0,0,0.55)`,
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
                  marginTop: 'clamp(4px, 0.8cqh, 14px)', position: 'relative', zIndex: 5,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
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
              </div>{/* /BOTTOM-Wrapper */}
            </>
          );
        })()
      ) : (
        /* ── Category reveal (no explanation needed — already seen) ──
           space-between: Runde/Frage oben, Name+Satz unten, Welt-Emoji mittig. */
        <>
          {/* TOP: Runde + Fragen-Fortschritt oben angepinnt */}
          <div style={{
            position: 'absolute', top: 'clamp(26px, 5cqh, 72px)', left: 0, right: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            zIndex: 5, pointerEvents: 'none',
            animation: 'qqStationFade 0.5s ease 0.15s both',
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

          {/* Zentrierte Spalte: Hero-Emoji + Name + Satz. 2026-06-30 (Wolf
              'überlappt bei allen Kategorien'): EINE zentrierte Flex-Spalte
              statt absolutem Hero + bottom-Text → keine Kollision. */}
          {cat && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 'clamp(8px, 1.4cqh, 20px)',
              width: '100%', maxWidth: 1500,
              paddingInline: 'var(--qq-safe-margin)', boxSizing: 'border-box',
              animation: 'qqStationFade 0.5s ease 0.2s both',
            }}>
              {/* HERO — zoomt sichtbar aus dem Runden-Tree-Dot heraus. */}
              <CategoryHeroFlip dotScreen={dotScreen} vpRef={camViewportRef} style={{
                filter: isThemed()
                  ? 'drop-shadow(0 16px 28px rgba(0,0,0,0.45))'
                  : `drop-shadow(0 0 46px ${catColor}66) drop-shadow(0 16px 28px rgba(0,0,0,0.5))`,
              }}>
                {heroIconSlug
                  ? <QQIcon slug={heroIconSlug} size="clamp(140px, 17cqw, 280px)" alt={catLabel} />
                  : <div style={{ fontSize: 'clamp(130px, 16cqw, 260px)', lineHeight: 1 }}>{catEmoji}</div>}
              </CategoryHeroFlip>
              {/* Category name — per-Buchstabe Wave */}
              <div style={{
                fontFamily: fontFam,
                fontSize: 'clamp(52px, 9cqw, 140px)', fontWeight: 900, lineHeight: 1,
                color: isThemed() ? 'var(--qq-title)' : catColor,
                textShadow: isThemed() ? 'none' : `0 0 80px ${catColor}44`,
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

              {/* Category explanation — 1 line. */}
              {catExplain && (
                <div style={{
                  fontSize: 'clamp(22px, 2.6cqw, 36px)', fontWeight: 700,
                  color: isThemed() ? 'var(--qq-text-muted)' : `${catColor}cc`,
                  letterSpacing: '0.02em',
                  marginTop: 14,
                  textAlign: 'center',
                }}>
                  {catExplain}
                </div>
              )}
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}
