/**
 * CozyQuizQuestionView — Frage-Card + alle Frage-Reveals (Bug-Hot-Spot #1).
 *
 * Zentrale View für QUESTION_ACTIVE + QUESTION_REVEAL Phasen. Routes pro
 * Kategorie zu spezialisierten Reveal-Sub-Components:
 * - SCHAETZCHEN → SchaetzchenReveal
 * - MUCHO → MuchoOptionsReveal (re-imported aus QQBeamerPage)
 * - ZEHN_VON_ZEHN → eigene inline-Logik
 * - CHEESE → CozyGuessrReveal (auch fuer Map-Picture-Quiz)
 * - BUNTE_TUETE (verschiedene) → Bluff*, Top5Reveal, OrderReveal,
 *   OnlyConnectBeamerView, HotPotatoBeamerView (re-imported)
 *
 * Plus: BluffTimer, BluffWriteScreen, BluffReviewScreen, BluffVoteWaitingScreen,
 * BluffVoteScreen, BluffRevealHero, Top5Reveal, OrderReveal,
 * SchaetzchenReveal, CozyGuessrReveal, OnlyConnectBeamerView.
 *
 * Map-Wrapper (QQFitBoundsOnTrigger, QQInitialTargetZoom, QQMapResizer)
 * fuer Leaflet-React-Map in CozyGuessr-Quizzes.
 *
 * Extrahiert aus QQBeamerPage.tsx 2026-05-13 (Refactor Phase 6, Bug-Hot-Spot).
 * ~6.273 Zeilen Code — der GROESSTE Single-Extract bisher.
 * 7 externe Importer.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { QQStateUpdate, QQCategory } from '../../../shared/quarterQuizTypes';
import { QQ_CATEGORY_LABELS, qqGetAvatar, teamDisplayName, qqMegaFactionSlug, qqMegaFactionName } from '../../../shared/quarterQuizTypes';
import { getAvatarDisplay } from '../avatarSets';
import { isThemed, isQuietMotion } from '../qqTheme';
import { SkinDeco } from './SkinDeco';
import {
  useLangFlip, bt, formatRevealedAnswer, imgAnim, imgFilter,
  CAT_ACCENT, CAT_BADGE_BG, CAT_GLOW, CAT_CUTOUTS, COZY_CARD_BG,
  qqCapOption,
} from '../cozyQuizShared';
import { Fireflies } from './CozyQuizAmbient';
import { ConfettiOverlay } from './CozyQuizConfettiOverlay';
import { BeamerTimer } from './CozyQuizBeamerTimer';
import { getServerNow } from '../utils/serverTime';
import { QQTeamAvatar } from './QQTeamAvatar';
import { QQEmojiIcon } from './QQIcon';
import { TeamNameLabel } from './TeamNameLabel';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  HotPotatoBeamerView, MuchoOptionsReveal,
} from '../pages/QQBeamerPage';
import {
  playAvatarCascadeNote, playClimaxFinish, playRevealHighlight,
  playTick, playWinnerCardReveal,
} from '../utils/sounds';
// 2026-05-24 (Refactor #5): Reveals in components/reveals/ extrahiert.
import { SchaetzchenReveal } from './reveals/SchaetzchenReveal';
import { Top5Reveal } from './reveals/Top5Reveal';
import { CrowdTopReveal } from './reveals/CrowdTopReveal';
import { CrowdEstimateReveal } from './reveals/CrowdEstimateReveal';
import { OrderReveal } from './reveals/OrderReveal';
import { CozyGuessrReveal } from './reveals/CozyGuessrReveal';
import { OnlyConnectBeamerView } from './reveals/OnlyConnectBeamerView';
import {
  BluffBeamerView, BluffRevealHero, BluffTimer,
  BluffWriteScreen, BluffReviewScreen, BluffVoteWaitingScreen, BluffVoteScreen,
} from './reveals/Bluff';
import { QQ_COLORS } from '../../../shared/qqColors';
import { qqFactionBuckets } from '../qqShared';


// 2026-05-24 (Refactor #5): Reveals + Helpers in components/reveals/ extrahiert:
//   - #5.1 SchaetzchenReveal       — components/reveals/SchaetzchenReveal.tsx
//   - #5.2 Top5Reveal              — components/reveals/Top5Reveal.tsx
//   - #5.3 OrderReveal             — components/reveals/OrderReveal.tsx
//   - #5.4 CozyGuessrReveal        — components/reveals/CozyGuessrReveal.tsx
//                                     (mit Map-Wrappern QQFitBoundsOnTrigger,
//                                      QQInitialTargetZoom, QQMapResizer)
//   - #5.5 OnlyConnectBeamerView   — components/reveals/OnlyConnectBeamerView.tsx
//   - #5.6 Bluff-Familie (7 Sub-Components: BluffBeamerView, BluffRevealHero,
//          BluffTimer, BluffWriteScreen, BluffReviewScreen, BluffVoteWaitingScreen,
//          BluffVoteScreen) — components/reveals/Bluff.tsx


// ═══════════════════════════════════════════════════════════════════════════════
// QUESTION VIEW (active + reveal)
// ═══════════════════════════════════════════════════════════════════════════════

export function QuestionView({ state: s, revealed, hideCutouts }: { state: QQStateUpdate; revealed: boolean; hideCutouts?: boolean }) {
  const q = s.currentQuestion;
  if (!q) return null;
  const cat = q.category as QQCategory;
  const catLabel = QQ_CATEGORY_LABELS[cat];
  const accent = CAT_ACCENT[cat] ?? QQ_COLORS.slate200;
  const badgeBg = CAT_BADGE_BG[cat] ?? '#374151';
  const glow = CAT_GLOW[cat] ?? 'transparent';
  // Dekorative Corner-Emojis pro Kategorie — aktuell ausgeblendet (Tester fanden sie
  // verwirrend: "was macht das?"). Zum Reaktivieren: SHOW_CAT_CUTOUTS auf true setzen.
  const SHOW_CAT_CUTOUTS = false;
  const cutouts = SHOW_CAT_CUTOUTS ? (CAT_CUTOUTS[cat] ?? []) : [];
  // Per-question emoji override: replace default cutout emojis
  const effectiveCutouts = q.emojis?.length
    ? cutouts.map((c, i) => q.emojis![i] ? { ...c, emoji: q.emojis![i] } : c)
    : cutouts;
  const cardBg = s.theme?.cardBg ?? COZY_CARD_BG;
  const img = q.image;
  // For CHEESE (Picture This): show image even with layout='none' — it's the main visual
  const isCheese = cat === 'CHEESE';
  const hasImg = img && img.url && (isCheese || img.layout !== 'none');
  const isWindow = hasImg && !isCheese && (img.layout === 'window-left' || img.layout === 'window-right');
  const lang = useLangFlip(s.language);

  // 2026-05-05 (Wolf): CozyGuessr-Active mit Bild = Cheese-Landscape-Layout.
  // Bild fullscreen + Frosted Card unten + Timer + Avatar-Progress.
  // Reveal greift frueher (isMapReveal -> CozyGuessrReveal), daher nur Active-Phase.
  const isMapKind = cat === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'map';
  const useMapPicture = isMapKind && !!hasImg && !revealed;

  // 2026-04-30 v3 (User-Wunsch): Cheese Portrait → 2-Spalten-Layout.
  // Image links voll Top-to-Bottom, Question-Card rechts vertikal mittig.
  // Detection via natural-dimensions preload — kein Backend-Feld noetig.
  // 2026-05-05: gilt auch fuer CozyGuessr-Active mit Bild.
  // 2026-05-05 v2 (Wolf-Bug 'bei cheese sieht man kurz etwas bevor die seite
  // angeordnet erscheint, wirkt unruhig'): imgReady hält das Cheese-Layout
  // unsichtbar bis Portrait-Detection durch ist — sonst rendert der Container
  // mit isCheesePortrait=false (Default) und shifted dann sichtbar wenn ein
  // Portrait erkannt wurde.
  // 2026-05-10 (Wolf-Wunsch): img.cheeseLayout-Override gewinnt vor Auto-
  // Detection. Damit Wolf bei Edge-Cases (quadratische Bilder, fast-Quadrat
  // Karten) explizit forcen kann was er will.
  const [isCheesePortrait, setIsCheesePortrait] = useState(false);
  const [imgReady, setImgReady] = useState(false);
  useEffect(() => {
    if ((!isCheese && !useMapPicture) || !img?.url) {
      setIsCheesePortrait(false);
      setImgReady(true); // kein Bild → kein Detection-Bedarf
      return;
    }
    // Manueller Override per Builder gewinnt vor Auto-Detection.
    if (img.cheeseLayout === 'portrait') {
      setIsCheesePortrait(true);
      setImgReady(true);
      return;
    }
    if (img.cheeseLayout === 'landscape') {
      setIsCheesePortrait(false);
      setImgReady(true);
      return;
    }
    setImgReady(false);
    const tester = new globalThis.Image();
    tester.onload = () => {
      setIsCheesePortrait(tester.naturalHeight > tester.naturalWidth * 1.05); // 5% Toleranz
      setImgReady(true);
    };
    tester.onerror = () => { setIsCheesePortrait(false); setImgReady(true); };
    tester.src = img.url;
  }, [isCheese, useMapPicture, img?.url, img?.cheeseLayout]);

  // 2026-05-04 v3 (Wolf): Timer-Outro-Animation klappt nicht bei Frueh-Abbruch
  // (alle abgegeben → Backend reveal → s.timerEndsAt wird null → Component
  // unmountet sofort → keine Outro-Anim). Loesung: stickyTimer haelt das letzte
  // gueltige endsAt ~1s nach Verschwinden, sodass die qqTimerOutro-Anim 0.85s
  // sauber durchlaufen kann. expireNow=true wird gesetzt sobald das Original-
  // Prop weg ist ODER revealed=true.
  const [stickyTimer, setStickyTimer] = useState<{ endsAt: number; duration: number } | null>(
    s.timerEndsAt ? { endsAt: s.timerEndsAt, duration: s.timerDurationSec } : null
  );
  useEffect(() => {
    if (s.timerEndsAt) {
      setStickyTimer({ endsAt: s.timerEndsAt, duration: s.timerDurationSec });
    }
  }, [s.timerEndsAt, s.timerDurationSec]);
  useEffect(() => {
    if (!s.timerEndsAt && stickyTimer) {
      const t = window.setTimeout(() => setStickyTimer(null), 1000);
      return () => window.clearTimeout(t);
    }
  }, [s.timerEndsAt, stickyTimer]);
  const timerExpiring = stickyTimer !== null && (!s.timerEndsAt || revealed);

  // ── CHEESE Cascade-Audit (2026-05-01): vorher fielen alle Treffer-Avatare
  // gleichzeitig + stumm rein. Jetzt 850ms-Stagger pro Avatar (CSS) + synchron
  // Pentatonik-Cascade-Toene wie Top5/Order. Spannung-Score 1/5 → 4/5.
  const cheeseCorrectCount = useMemo(() => {
    if (cat !== 'CHEESE' || !revealed) return 0;
    // 2026-05-02: Backend-Truth via currentQuestionWinners (war vorher strict-
    // Match, hat Schreibfehler-Akzeptanzen ignoriert).
    const winners = s.currentQuestionWinners ?? (s.correctTeamId ? [s.correctTeamId] : []);
    return winners.length;
  }, [cat, revealed, s.currentQuestionWinners, s.correctTeamId]);

  useEffect(() => {
    if (cat !== 'CHEESE' || !revealed || cheeseCorrectCount === 0) return;
    if (s.sfxMuted) return;
    // 2026-05-06 (Wolf 'letzter Sound der Cascade passiert ohne Animation auf
    // dem Screen, reveal-Reihenfolge tauschen von langsamster zu schnellster
    // Winner und besonderen Sound auf den schnellsten'):
    // Reihenfolge slow→fast Winner. Letzter (= schnellster Winner = Climax)
    // bekommt playRevealHighlight statt Pentatonik-Note (= 'Lösung aufgedeckt'-
    // Sound aus MUCHO/ZvZ). Avatar-Stagger im JSX matched (850ms statt 160ms),
    // damit jedes Sound-Event eine sichtbare Avatar-Drop-Animation hat.
    const cascadeTotal = cheeseCorrectCount + 1;
    const handles: number[] = [];
    for (let i = 0; i < cheeseCorrectCount; i++) {
      const delay = i * 850 - 60; // 60ms Vorlauf fuer psychoakustische Sync
      const isLast = i === cheeseCorrectCount - 1;
      handles.push(window.setTimeout(() => {
        try {
          if (isLast) playRevealHighlight();
          else playAvatarCascadeNote(i, cascadeTotal);
        } catch {}
      }, Math.max(0, delay)));
    }
    return () => handles.forEach(h => window.clearTimeout(h));
  }, [cat, revealed, cheeseCorrectCount, s.sfxMuted]);

  // ── MUCHO: Winner-Card erst nach Jäger-Lock zeigen ──────────────────────
  // Spiegelt die Akt-2-Timing aus MuchoOptionsReveal (hop + lock + speedrun).
  // Solange Winner-Card verborgen ist bleibt die Spannungskurve intakt.
  const muchoNonEmpty = useMemo(() => {
    if (cat !== 'MUCHO' || !q.options) return 0;
    let n = 0;
    for (let i = 0; i < q.options.length; i++) {
      if (s.answers.some(a => a.text === String(i))) n++;
    }
    return n;
  }, [cat, q.options, s.answers]);
  const muchoLockStep = muchoNonEmpty + 1;
  const muchoLocked = cat === 'MUCHO' && revealed && (s.muchoRevealStep ?? 0) >= muchoLockStep;
  // Winner-Card erscheint nach dem Doppelblink (1.1s Animation + 100ms Puffer).
  const [muchoAkt3Ready, setMuchoAkt3Ready] = useState(false);
  useEffect(() => {
    if (!muchoLocked) { setMuchoAkt3Ready(false); return; }
    const t = window.setTimeout(() => setMuchoAkt3Ready(true), 1200);
    return () => window.clearTimeout(t);
  }, [muchoLocked]);

  // ── ZEHN_VON_ZEHN: Step-Reveal — Bet-Cascade + Doppelblink ──────────────
  // Step 0: alle Chips sichtbar AUSSER höchste(r) Bet(s) pro Option; kein Grün, keine Winner-Card.
  // Step 1: höchste Bets kaskadieren pro Option (leere Optionen überspringen).
  // Step 2: Doppelblink auf korrekte Option → Grün + Winner-Card (analog MUCHO).
  // ── CozyArena (Mega): 10v10-Reveal auf Fraktionen bündeln ────────────────
  // Statt bis zu 24 Sub-Team-Bet-Pills zeigen wir 8 Fraktionen mit element-
  // weise summierten Einsätzen. Wir bauen synthetische „Fraktions-Teams" +
  // -Answers und schleusen sie NUR in die ZvZ-Pfade — alle bestehende Mechanik
  // (Highest-per-Option, Winner, Top-/Sub-Bets, Zeit-Pillen) läuft unverändert.
  // submittedAt = frühester Sub-Team-Submit (schnellstes Handy der Fraktion).
  // Nicht-Mega: zvzAnswers/zvzTeams === s.answers/s.teams → byte-identisch.
  const isMegaTeams = useMemo(
    () => new Set(s.teams.map(t => t.avatarId)).size < s.teams.length,
    [s.teams]
  );
  const zvzFactionAgg = useMemo(() => {
    if (cat !== 'ZEHN_VON_ZEHN' || !isMegaTeams || !q.options) return null;
    const nOpt = q.options.length;
    const buckets = qqFactionBuckets(s.teams, lang !== 'en');
    const answers: QQStateUpdate['answers'] = [];
    const teams: QQStateUpdate['teams'] = [];
    for (const b of buckets) {
      const sum = new Array<number>(nOpt).fill(0);
      let earliest = Infinity;
      let seedAnswer: QQStateUpdate['answers'][number] | undefined;
      for (const m of b.members) {
        const a = s.answers.find(x => x.teamId === m.id);
        if (!a) continue;
        const pts = String(a.text ?? '').split(',').map(x => parseInt(x.trim(), 10));
        if (pts.length !== nOpt || pts.some(Number.isNaN)) continue;
        seedAnswer = seedAnswer ?? a;
        for (let i = 0; i < nOpt; i++) sum[i] += pts[i] || 0;
        if (a.submittedAt < earliest) earliest = a.submittedAt;
      }
      if (!seedAnswer) continue;
      const synthId = `faction-${b.avatarId}`;
      const rep = b.members[0];
      teams.push({ ...rep, id: synthId, avatarId: b.avatarId, emoji: b.slug ?? rep.emoji, name: b.name, color: b.color });
      answers.push({ ...seedAnswer, teamId: synthId, text: sum.join(','), submittedAt: earliest });
    }
    return { answers, teams };
  }, [cat, isMegaTeams, q.options, s.teams, s.answers, lang]);
  const zvzAnswers = zvzFactionAgg?.answers ?? s.answers;
  const zvzTeams = zvzFactionAgg?.teams ?? s.teams;

  const zvzStep = s.zvzRevealStep ?? 0;
  const zvzHighestPerOption = useMemo(() => {
    if (cat !== 'ZEHN_VON_ZEHN' || !q.options) return [] as Array<{ maxPts: number; teamIds: string[]; isEmpty: boolean }>;
    const parsed = zvzAnswers
      .map(a => ({ teamId: a.teamId, pts: String(a.text ?? '').split(',').map(x => parseInt(x.trim(), 10)) }))
      .filter(p => p.pts.length === q.options!.length && !p.pts.some(Number.isNaN));
    return q.options!.map((_, i) => {
      const entries = parsed.map(p => ({ teamId: p.teamId, pts: p.pts[i] ?? 0 })).filter(e => e.pts > 0);
      if (entries.length === 0) return { maxPts: 0, teamIds: [], isEmpty: true };
      const maxPts = Math.max(...entries.map(e => e.pts));
      return { maxPts, teamIds: entries.filter(e => e.pts === maxPts).map(e => e.teamId), isEmpty: false };
    });
  }, [cat, q.options, zvzAnswers]);
  const zvzNonEmptyOptions = useMemo(() => zvzHighestPerOption.map((h, i) => (h.isEmpty ? -1 : i)).filter(i => i >= 0), [zvzHighestPerOption]);
  const [zvzRevealed, setZvzRevealed] = useState<Set<number>>(new Set());
  useEffect(() => {
    if (cat !== 'ZEHN_VON_ZEHN' || !revealed) { setZvzRevealed(new Set()); return; }
    if (zvzStep === 0) { setZvzRevealed(new Set()); return; }
    // Step 2+ (Lock): alle Top-Bets bleiben stationaer sichtbar — KEIN Reset
    // und keine neue Cascade, sonst "erscheinen" die Chips nochmal obwohl
    // sie schon da sind.
    if (zvzStep >= 2) {
      setZvzRevealed(new Set(zvzNonEmptyOptions));
      return;
    }
    // Step 1: Kaskade pro Option (200ms Initial + 550ms pro Option).
    const timers: number[] = [];
    setZvzRevealed(new Set());
    zvzNonEmptyOptions.forEach((optIdx, i) => {
      timers.push(window.setTimeout(() => {
        setZvzRevealed(prev => {
          const next = new Set(prev); next.add(optIdx); return next;
        });
        // 2026-05-05 (Wolf-Bug 'mehrere sounds gleichzeitig'): playTick
        // entfernt — Avatar-Cascade-Note (line 1435) liefert schon den
        // hoerbaren Cascade-Effekt, Tick legte sich oben drauf und matschte.
      }, 200 + i * 550));
    });
    return () => timers.forEach(t => window.clearTimeout(t));
  }, [cat, revealed, zvzStep, zvzNonEmptyOptions.join(','), s.sfxMuted]); // eslint-disable-line react-hooks/exhaustive-deps
  // Lock-Phase (Step 2): Doppelblink auf korrekte Option, Winner-Card nach 1.2s
  const zvzLocked = cat === 'ZEHN_VON_ZEHN' && revealed && zvzStep >= 2 && q.correctOptionIndex != null;
  const [zvzWinnerReady, setZvzWinnerReady] = useState(false);
  useEffect(() => {
    if (!zvzLocked) { setZvzWinnerReady(false); return; }
    const t = window.setTimeout(() => setZvzWinnerReady(true), 1200);
    return () => window.clearTimeout(t);
  }, [zvzLocked]);
  const zvzAkt3Ready = cat === 'ZEHN_VON_ZEHN' ? zvzWinnerReady : true;

  // ── CHEESE: Lösung sofort gruen + Avatare cascadieren (850ms Stagger).
  // 2026-05-01: Cascade-Audit — vorher fielen alle Avatare gleichzeitig rein,
  // WinnerCard erschien direkt = "alles auf einmal"-Gefuehl. Jetzt: Avatare
  // staffeln sich, WinnerCard wartet bis Cascade fertig ist.
  const cheeseShowGreen = true;
  const cheeseShowAvatars = true;
  const [cheeseCascadeDone, setCheeseCascadeDone] = useState(false);
  useEffect(() => {
    if (cat !== 'CHEESE' || !revealed) { setCheeseCascadeDone(false); return; }
    if (cheeseCorrectCount === 0) { setCheeseCascadeDone(true); return; }
    const totalMs = cheeseCorrectCount * 850 + 200;
    const t = window.setTimeout(() => setCheeseCascadeDone(true), totalMs);
    return () => window.clearTimeout(t);
  }, [cat, revealed, cheeseCorrectCount]);

  const showMuchoWinner = cat !== 'MUCHO' || muchoAkt3Ready;
  const showZvzWinner = cat !== 'ZEHN_VON_ZEHN' || zvzAkt3Ready;
  const showCheeseWinner = cat !== 'CHEESE' || cheeseCascadeDone;
  // Mega Event: kein Einzel-Team-Gewinner-Banner — es zählt die Farbe, und die
  // Punkte-Verteilung kommt in Akt 3 (Standings). Die Kategorie-Reveals (MUCHO-
  // Optionen, 10v10-Verteilung, Schätzchen-Zahlenstrahl) laufen separat weiter.
  const showUnifiedWinner = showMuchoWinner && showZvzWinner && showCheeseWinner && !(s as any).largeGroupMode;
  // 2026-07-07 (Wolf-Livetest 'unteres Ergebnisfeld laesst die Seite springen'):
  // Der Unified-Winner-Slot wird jetzt fuer die zutreffenden Kategorien IMMER
  // reserviert (auch waehrend der aktiven Frage) — mit fester Hoehe + absolut
  // positioniertem Inhalt. Dadurch aendert sich das Layout beim Reveal nicht
  // (kein Mount, kein Wachstum ueber minHeight) → kein Shift, und weil der Slot
  // transparent ist, auch kein sichtbarer/starrer Rand. HotPotato (eigene View),
  // Schaetzchen (eigener Chip) und Arena (kein Einzelsieger) sind ausgenommen.
  const isHotPotatoCat = cat === 'BUNTE_TUETE' && (q as any).bunteTuete?.kind === 'hotPotato';
  // 2026-07-08 (Audit B1): Hot Potato reserviert den Winner-Slot jetzt AUCH — so
  // bekommt die Auflösung eine Gewinner-/Überlebenden-Feier statt „Keiner hatte
  // Recht!". Waehrend der aktiven Frage bleibt der Slot fuer HP aber auf Hoehe 0
  // (siehe unten), damit die Potato-Ansicht nicht nach unten geschoben wird.
  const reservesWinnerSlot = cat !== 'SCHAETZCHEN' && !(s as any).largeGroupMode;

  // 2026-04-30: Sound bei Sieger-Card-Einblendung (false→true Transition).
  // Synchron zur Animation: revealWinnerIn nutzt bannerDelay=0.7s, davor ist
  // die Card auf scaleY(0)/opacity:0 — der Sound MUSS auch 700ms warten,
  // sonst kommt er vor dem sichtbaren Banner (User-Feedback: 'sound kommt
  // etwas früh'). 60ms Vorlauf damit Ton minimal vor dem Pop einsetzt =
  // psychoakustisch synchron.
  // 2026-04-30 v3 (User-Wunsch climax IMMER bei WinnerCard): Beim Pop
  // der WinnerCard layern wir Cascade-Top-Ton + Climax-Finish-Akkord
  // gemeinsam — fuer alle Kategorien. So gibt's einheitlich den
  // „Yeah!"-Moment beim Erscheinen der Sieger-Karte. playWinnerCardReveal
  // bleibt als zusaetzlicher Bell-Layer (User kann es im Sound-Panel mute'n).
  const prevShowWinnerRef = useRef(false);
  useEffect(() => {
    const prev = prevShowWinnerRef.current;
    prevShowWinnerRef.current = showUnifiedWinner;
    // 2026-05-05 (Wolf-Bug 'cheese reveal sound passt nicht, gewinnercard fehlt'):
    // Bei CHEESE mit mehreren Winnern ist correctTeamId oft null/leer — nur
    // currentQuestionWinners ist gefuellt.
    // 2026-05-05 v2 (Wolf-Bug 'cheese sound fuer winnercard, aber keine card'):
    // hasWinner muss zusaetzlich pruefen ob die Winner-IDs auch wirklich in
    // s.teams existieren — sonst spielt der Sound aber Render fellt auf das
    // 'team not found → return null'-Branch und Card erscheint nicht.
    const winnerIds = s.currentQuestionWinners ?? (s.correctTeamId ? [s.correctTeamId] : []);
    const hasRenderableWinner = !!s.teams.find(t => t.id === s.correctTeamId)
      || winnerIds.some(id => s.teams.find(t => t.id === id));
    const earlyCat = s.currentQuestion?.category;
    // 2026-05-17 P4 (Wolf 'kein sound am ende bei schätzchen'): Parent-Climax
    // bei SCHAETZCHEN suppressen — die SchaetzchenReveal-Cascade feuert ihren
    // eigenen Climax beim Top-Row-Reveal, parent-640ms-Climax wäre zu früh
    // (Cascade dauert ~7s, fired-bei-Reveal-Start verpufft).
    if (!s.sfxMuted && showUnifiedWinner && !prev && revealed && hasRenderableWinner && earlyCat !== 'SCHAETZCHEN') {
      const cat = s.currentQuestion?.category;
      const subKind = (s.currentQuestion?.bunteTuete as { kind?: string } | undefined)?.kind;
      const isCascadeCategory =
        cat === 'MUCHO' ||
        cat === 'ZEHN_VON_ZEHN' ||
        (cat === 'BUNTE_TUETE' && (subKind === 'top5' || subKind === 'order'));
      const handle = window.setTimeout(() => {
        try {
          // v3 round 11 (User-Bug 'mehrere parallele sounds'): Vorher fired
          // immer climaxFinish + (cascade-top ODER winnerCardReveal). Jetzt
          // nur climaxFinish — der ist schon ein 6-Layer-Akkord, weitere
          // Layer machen es matschig statt klimaktisch.
          playClimaxFinish();
        } catch {}
        // isCascadeCategory referenziert, eslint-friendly
        void isCascadeCategory;
      }, 640);
      return () => window.clearTimeout(handle);
    }
  }, [showUnifiedWinner, revealed, s.correctTeamId, s.currentQuestionWinners, s.sfxMuted, s.currentQuestion?.category, s.currentQuestion?.bunteTuete]);

  // ── CozyGuessr (map) full-screen reveal ─────────────────────────────────
  const isMapReveal = revealed
    && q.category === 'BUNTE_TUETE'
    && (q.bunteTuete as any)?.kind === 'map';
  if (isMapReveal) {
    return <CozyGuessrReveal state={s} lang={lang} />;
  }

  // ── Top-5 two-column reveal ─────────────────────────────────────────────
  const isTop5Reveal = revealed
    && q.category === 'BUNTE_TUETE'
    && (q.bunteTuete as any)?.kind === 'top5';
  if (isTop5Reveal) {
    return <Top5Reveal state={s} lang={lang} />;
  }

  // ── Top-Antworten / Family Feud: Tafel-Reveal ───────────────────────────
  const isCrowdTopReveal = revealed
    && q.category === 'BUNTE_TUETE'
    && (q.bunteTuete as any)?.kind === 'crowdTop';
  if (isCrowdTopReveal) {
    return <CrowdTopReveal state={s} lang={lang} />;
  }

  // ── Schwarm-Schätzen: Zahlenstrahl-Reveal ───────────────────────────────
  const isCrowdEstimateReveal = revealed
    && q.category === 'BUNTE_TUETE'
    && (q.bunteTuete as any)?.kind === 'crowdEstimate';
  if (isCrowdEstimateReveal) {
    return <CrowdEstimateReveal state={s} lang={lang} />;
  }

  // ── 4 gewinnt / Only Connect: eigene Layout-Komponente für active + reveal ──
  const isOnlyConnect = q.category === 'BUNTE_TUETE'
    && (q.bunteTuete as any)?.kind === 'onlyConnect';
  if (isOnlyConnect) {
    return <OnlyConnectBeamerView state={s} lang={lang} revealed={revealed} />;
  }

  // ── Bluff: eigene 3-Phasen-Layout-Komponente ─────────────────────────────
  const isBluff = q.category === 'BUNTE_TUETE'
    && (q.bunteTuete as any)?.kind === 'bluff';
  if (isBluff) {
    return <BluffBeamerView state={s} lang={lang} revealed={revealed} />;
  }

  // ── Order two-column reveal (Lucky Bag: bring in correct order) ────────
  const isOrderReveal = revealed
    && q.category === 'BUNTE_TUETE'
    && (q.bunteTuete as any)?.kind === 'order';
  if (isOrderReveal) {
    return <OrderReveal state={s} lang={lang} />;
  }

  // ── Schätzchen two-column reveal (Frage + Lösung oben, Winner + Rangliste) ──
  const isSchaetzReveal = revealed && q.category === 'SCHAETZCHEN';
  if (isSchaetzReveal) {
    return <SchaetzchenReveal state={s} lang={lang} />;
  }

  // ── CHEESE / Picture-Active "Overlay" layout ────────────────────────────
  // Image stays fullscreen. Frosted card overlays with question/answer.
  // No separate "image only" phase — question + image appear together.
  // Active: fullscreen image + frosted question card + timer + avatar-progress
  // Reveal (CHEESE only): fullscreen image + frosted answer card + winner.
  //   CozyGuessr-Reveal hat seinen eigenen Pfad (CozyGuessrReveal — siehe oben).
  // Hinweis: CHEESE-Overlay-UI (Antwort-Card, Team-Avatare, Reveal) MUSS auch ohne Bild
  // rendern — sonst ist die Frage unspielbar. Nur der fullscreen-Image-Layer wird ausgeblendet.
  const cheeseOverlay = isCheese || useMapPicture;
  const cheeseWithQuestion = cheeseOverlay && !revealed;
  const isCheeseReveal = isCheese && revealed; // map-reveal laeuft via CozyGuessrReveal
  const cheeseFullscreen = cheeseOverlay && !!hasImg;

  // Auto-size: shorter fontSize for long questions (no size change on reveal — prevents reflow)
  const qText = (lang === 'en' && q.textEn ? q.textEn : q.text) ?? '';
  const isOrderBt = q.category === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'order';
  // 2026-04-28-v3 (User: 'fragecards die kleiner werden zappelig — könnten
  // wir die cards nicht von Anfang an etwas kleiner machen?'). Wir wählen
  // jetzt EINE moderate Größe für ALLE Phasen (Question + Reveal). Kein
  // shrink mehr → kein zappeln. Sizing knapp aber lesbar; Reveal-Phase
  // dimmt nur opacity statt zu shrinken.
  // 2026-05-04 (Wolf #3): Beamer-Schrift +15-20% damit aus 8m Distanz lesbar.
  // 2026-05-13 (Wolf 'esc-host-venue-by-audience-capacity-Frage, 66 chars,
  // 4 Zeilen, Winner-Card fiel unten raus'): zusaetzlicher Bucket bei >55
  // chars. Vorher fielen 41-80 char-Fragen alle in einen Bucket mit max 76px
  // — bei breiter Card (~1160px) reichte das fuer 14-15 chars/line, 66 chars
  // = 5 Zeilen. Neuer 56-80er Bucket mit max 60px = ~18 chars/line, 66 chars
  // in 3 Zeilen → Winner-Card unten hat wieder Platz.
  // 2026-07-04 (Wolf 'aktiv/Reveal nutzt den Platz nicht, alles zu klein'):
  // cqh-Faktoren + Deckel moderat hoch (~+15%). Der min(cqw,cqh)-Cap bleibt und
  // verhindert weiter Vertikal-Ueberlauf (langer Text waechst nicht ins Layout).
  const qFontSize = qText.length > 200 ? 'clamp(28px, min(3.4cqw, 5.2cqh), 52px)'
    : qText.length > 120 ? 'clamp(34px, min(4.2cqw, 6.5cqh), 66px)'
    : qText.length > 80  ? 'clamp(40px, min(5cqw, 7.3cqh), 80px)'
    : qText.length > 55  ? 'clamp(40px, min(4.6cqw, 6.8cqh), 72px)'
    : qText.length > 40  ? 'clamp(46px, min(5.4cqw, 7.8cqh), 88px)'
    : 'clamp(50px, min(6.2cqw, 8.4cqh), 104px)';

  // Category intro overlay removed — category is already shown in PHASE_INTRO

  return (
    <div style={{
      flex: 1, display: 'flex', position: 'relative',
      // 2026-06-23 (Skin): Schrift-Family vom aktiven Skin — vererbt sich auf
      // alle Texte der View. Layout-neutral (nur Glyph-Form, fixe Schriftgrössen).
      fontFamily: 'var(--qq-font)',
      // 2026-05-12 (Glow-Audit): hidden → visible. Frage-Card + Option-Cards
      // haben dicke Glows (boxShadow 0 0 36-48px) — die wurden hier am
      // QuestionView-Rand abgeschnitten. SlideStage outer clipMargin (120px)
      // faengt sie sauber am echten Bildschirmrand.
      overflow: 'visible',
      // Journey-Endbeat (Claude-Design-Handoff #3): die Frage materialisiert beim
      // Mount aus der Bildmitte (scale .28→1 + Fade) — sie „kommt aus dem
      // Kategorie-Emoji". Kein fill-mode → endet ohne Rest-Transform (kein
      // Stacking-Risiko für fixed/absolute Children danach).
      transformOrigin: 'center',
      animation: 'qqQuestionMaterialize 0.55s cubic-bezier(0.34, 1.3, 0.5, 1)',
      willChange: 'transform, opacity',
    }}>
      <SkinDeco />
      {/* I1 Kategorie-Partikel (fliegende Zahlen/Buchstaben) entfernt —
          lenkten vom Fragentext ab. Stattdessen faerben wir die Fireflies
          weiter unten in der Kategorie-Farbe. */}
      {/* CHEESE ohne Bild: dezenter Placeholder im Hintergrund (Gradient + 📸-Icon),
          damit die Frage spielbar bleibt aber visuell klar ist „hier sollte ein Bild sein".
          position:absolute (NICHT fixed) — fixed wird durch BeamerFrame-Transform-Stacking-Context geclippt. */}
      {isCheese && !hasImg && (
        <div style={{
          // Mono/Themes (Wolf 2026-06-25): wo KEIN Bild liegt, eine solide weiße
          // Card-Fläche statt dunkel-lila — damit Timer + Frage (eigene weiße
          // Cards) auf einheitlichem Weiß sitzen statt auf dunklem Placeholder.
          position: 'absolute', inset: 0, zIndex: 1,
          background: isThemed()
            ? 'var(--qq-card-bg)'
            : 'radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.18), transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(168,85,247,0.10), transparent 50%), #0A0814',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 14,
          pointerEvents: 'none',
        }}>
          <div style={{
            fontSize: 'clamp(120px, 18cqw, 240px)', opacity: isThemed() ? 0.12 : 0.18,
            animation: 'cfloat 4s ease-in-out infinite',
          }}>📸</div>
          <div style={{
            fontSize: 'clamp(14px, 1.4cqw, 18px)', fontWeight: 900,
            color: isThemed() ? 'var(--qq-text-muted)' : QQ_COLORS.violet400,
            letterSpacing: '0.1em', textTransform: 'uppercase', opacity: isThemed() ? 0.8 : 0.55,
          }}>
            {lang === 'de' ? 'Bild fehlt, Frage trotzdem spielbar' : 'No image, question still playable'}
          </div>
        </div>
      )}
      {/* Fullscreen background image: non-overlay fullscreen layout OR CHEESE/Map-Picture overlay.
          2026-05-05 v2 (Wolf-Bug 'kurz etwas vor anordnung sichtbar'): cheeseFullscreen
          wartet auf imgReady (Portrait-Detection durch) damit kein Layout-Shift sichtbar ist. */}
      {((hasImg && img.layout === 'fullscreen' && !cheeseOverlay) || (cheeseFullscreen && imgReady)) && (() => {
        // CHEESE: 3-Schicht-Aufbau gegen Aspect-Ratio-Crop.
        // 1) Blurred cover backdrop — füllt 16:9-Beamer, kein schwarzer Rand
        // 2) Sharp CONTAIN foreground — komplettes Bild sichtbar (Mona Lisas Kopf bleibt drin)
        // 3) Dunkler Vignette-Overlay — Lesbarkeit der Antwort-Card
        // offsetX/Y/scale wirken auf Layer 2; scale=1 (default) zeigt vollständiges Bild.
        const cheeseOX = img!.offsetX ?? 0;
        const cheeseOY = img!.offsetY ?? 0;
        const cheeseZoom = img!.scale ?? 1;
        const cheesePosX = 50 + cheeseOX / 2;
        const cheesePosY = 50 + cheeseOY / 2;
        return (
        <>
          {/* 2026-04-30 v3 (User-Wunsch): Bei Portrait-Foto in CHEESE clippen
              wir alle Bild-Layer auf die LINKE Bildschirm-Haelfte. Question-
              Card-Overlay wandert in den rechten Streifen (siehe Overlay
              weiter unten). Nicht-Cheese und Landscape bleiben unveraendert. */}
          {/* Layer 1: blurred cover backdrop (CHEESE only).
              2026-04-30 v3: Bei Portrait fuellt diese ueberall (full-screen),
              damit der rechte Streifen (Card) nicht schwarz/leer wirkt. Sharp
              Foreground (Layer 2) bleibt nur links — rechts sieht man also
              das Bild als sanft-blurred Backdrop hinter der Card.
              v3 round 5 (User-Bug 'fliegt aus mitte nach links'): fsExpand
              clip-path ersetzt durch reinen opacity-Fade. Das clip-path-
              Expand wirkte wie 'aus Mitte rauslaufen'. */}
          {cheeseFullscreen && (
            <div style={{
              position: 'fixed', inset: 0,
              zIndex: 49,
              backgroundImage: `url(${img!.url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              filter: 'blur(36px) brightness(0.45) saturate(1.1)',
              transform: 'scale(1.15)',
              transformOrigin: 'center',
              animation: 'contentReveal 0.6s var(--qq-ease-pop-fast) both',
            }} />
          )}
          {/* Layer 2: sharp foreground (contain für CHEESE, cover für legacy fullscreen).
              2026-05-04 (Wolf): bei cheeseFullscreen sitzt das Bild jetzt in
              einem Wrapper mit overflow:hidden + borderRadius matching Rahmen,
              damit es niemals ueber den Bilderrahmen hinausragt — auch nicht
              bei transform: scale(zoom). */}
          {cheeseFullscreen ? (
            <div style={{
              position: 'fixed',
              top: 'clamp(10px, 1.4cqh, 22px)',
              bottom: 'clamp(10px, 1.4cqh, 22px)',
              left: 'clamp(12px, 1.6cqw, 28px)',
              right: isCheesePortrait
                ? `calc(50% + clamp(6px, 0.8cqw, 14px))`
                : 'clamp(12px, 1.6cqw, 28px)',
              zIndex: 50,
              borderRadius: isThemed() ? 'var(--qq-card-radius)' : 22,
              overflow: 'hidden',
              clipPath: (revealed && !cheeseOverlay) ? 'inset(8% 8% 8% 52% round 18px)' : undefined,
              animation: 'contentReveal 0.7s var(--qq-ease-pop-fast) both',
              transition: 'clip-path 0.8s var(--qq-ease-smooth), right 0.5s ease',
            }}>
              {/* 2026-05-04 v4 (Wolf-Bug 'graue Raender im Rahmen'): vorher
                  backgroundSize:contain → Letterbox-Bars wenn Bild-Aspect nicht
                  zum Rahmen-Aspect passt. Die dahinter liegende Blur-Backdrop
                  ist mit brightness(0.45) so dunkel, dass die Bars als „grau"
                  rauskommen. Jetzt: cover + center (mod kann via offsetX/Y
                  feintunen). Bild fuellt den Rahmen vollstaendig. */}
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `url(${img!.url})`,
                backgroundSize: 'cover',
                backgroundPosition: `${cheesePosX}% ${cheesePosY}%`,
                backgroundRepeat: 'no-repeat',
                transform: `scale(${cheeseZoom})${img!.rotation ? ` rotate(${img!.rotation}deg)` : ''}`,
                transformOrigin: `${cheesePosX}% ${cheesePosY}%`,
                opacity: img!.opacity ?? 1,
                filter: imgFilter(img!),
                transition: 'background-position 0.4s ease, transform 0.4s ease',
              }} />
            </div>
          ) : (
            <div style={{
              position: 'absolute',
              top: 0, bottom: 0,
              left: 0,
              right: 0,
              zIndex: 1,
              backgroundImage: `url(${img!.url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              clipPath: (revealed && !cheeseOverlay) ? 'inset(8% 8% 8% 52% round 18px)' : undefined,
              animation: (revealed && !cheeseOverlay) ? undefined : 'fsExpand 1.2s var(--qq-ease-smooth) 0.2s both',
              transition: 'clip-path 0.8s var(--qq-ease-smooth), background-position 0.4s ease, transform 0.4s ease, right 0.5s ease',
              transform: `translate(${img!.offsetX ?? 0}%, ${img!.offsetY ?? 0}%) scale(${img!.scale ?? 1}) rotate(${img!.rotation ?? 0}deg)`,
              transformOrigin: 'center',
              opacity: img!.opacity ?? 1,
              filter: imgFilter(img!),
            }} />
          )}
          {/* Layer 3: vignette overlay.
              2026-04-30 v3: Portrait → vignette FULL-screen (statt left-half),
              damit der rechte Streifen denselben warmen dunklen Wash bekommt
              wie der linke Bildbereich. Sharp Foreground bleibt nur links.
              v3 round 5 (User-Bug 'Bild oben/unten minimal abgeschnitten'):
              Top/Bottom-Vignette deutlich reduziert (0.35/0.40 → 0.15/0.20),
              damit das Bild bis an die Kanten sichtbar bleibt. */}
          <div style={{
            position: cheeseFullscreen ? 'fixed' : 'absolute',
            inset: 0,
            zIndex: cheeseFullscreen ? 51 : 2,
            background: cheeseFullscreen
              ? 'linear-gradient(180deg, rgba(13,10,6,0.15) 0%, rgba(13,10,6,0.06) 30%, rgba(13,10,6,0.06) 70%, rgba(13,10,6,0.20) 100%)'
              : [
                'linear-gradient(90deg, rgba(13,10,6,0.92) 0%, rgba(13,10,6,0.78) 45%, rgba(13,10,6,0.45) 100%)',
                'linear-gradient(180deg, rgba(13,10,6,0.5) 0%, transparent 25%, transparent 70%, rgba(13,10,6,0.6) 100%)',
              ].join(', '),
            opacity: (revealed && !cheeseOverlay) ? 0.4 : 1,
            transition: 'opacity 0.8s ease',
          }} />
          {/* Layer 4: Bilderrahmen in Kategorie-Farbe (Wolf-Wunsch 2026-05-04).
              Dezenter Innen-Rahmen (kein full-bleed Border-Strich) um das Bild,
              damit es als „eingerahmtes Foto" liest statt zu bleeden. Bei
              Portrait-CHEESE umrahmt er nur die linke Bildhaelfte. */}
          {cheeseFullscreen && (
            <div aria-hidden style={{
              position: 'fixed',
              top: 'clamp(10px, 1.4cqh, 22px)',
              bottom: 'clamp(10px, 1.4cqh, 22px)',
              left: 'clamp(12px, 1.6cqw, 28px)',
              right: isCheesePortrait
                ? `calc(50% + clamp(6px, 0.8cqw, 14px))`
                : 'clamp(12px, 1.6cqw, 28px)',
              borderRadius: isThemed() ? 'var(--qq-card-radius)' : 22,
              border: `4px solid ${accent}`,
              boxShadow: `0 0 32px ${accent}55, inset 0 0 0 2px rgba(0,0,0,0.45), inset 0 0 20px rgba(0,0,0,0.35)`,
              pointerEvents: 'none',
              zIndex: 52,
              animation: 'contentReveal 0.7s var(--qq-ease-pop-fast) 0.15s both',
            }} />
          )}
        </>
        );
      })()}


      {/* Cutout floating image (bg-removed) */}
      {hasImg && img.layout === 'cutout' && (
        <img
          src={img.bgRemovedUrl || img.url}
          alt={isCheese ? (q.text || 'Question image') : ''}
          style={{
            position: 'absolute', zIndex: 3, pointerEvents: 'none',
            right: '8%', top: '15%',
            maxWidth: '35%', maxHeight: '70%',
            objectFit: 'contain',
            filter: `drop-shadow(0 16px 40px rgba(0,0,0,0.6))${imgFilter(img) ? ' ' + imgFilter(img) : ''}`,
            animation: imgAnim(img.animation, 'cutout', img.animDelay, img.animDuration),
            transform: `translate(${img.offsetX ?? 0}%, ${img.offsetY ?? 0}%) scale(${img.scale ?? 1}) rotate(${img.rotation ?? 0}deg)`,
            opacity: img.opacity ?? 1,
          }}
        />
      )}
      {/* Cutout emojis — hidden when template overlay handles them */}
      {!hideCutouts && effectiveCutouts.map((c, i) => (
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

      {/* Fireflies in Kategorie-Farbe — subtile Stimmung passend zum Thema */}
      <Fireflies color={`${accent}99`} />

      {/* ── CHEESE overlay cards (Phase 2 + Reveal) ── */}
      {/* 2026-05-05 v2 (Wolf-Bug): Cards warten auf imgReady damit Portrait-Layout
          nicht erst landscape-aligned reinpoppt und dann nach rechts springt. */}
      {(cheeseWithQuestion || isCheeseReveal) && imgReady && (
        <div style={{
          // 2026-04-30 v3: Bei Portrait-Foto wandert der Card-Container in den
          // rechten Bildschirm-Streifen (50% breit) und Card sitzt dort vertikal
          // mittig. Bei Landscape klassisch fullscreen + Card am unteren Rand.
          position: 'fixed',
          top: 0, bottom: 0,
          left: isCheesePortrait ? '50%' : 0,
          right: 0,
          zIndex: 52,
          display: 'flex', flexDirection: 'column',
          justifyContent: isCheesePortrait ? 'center' : 'flex-end',
          alignItems: 'center',
          // 2026-05-04 (Wolf): kleinere Raender auf der Schau-Mal-Seite
          // damit das Bild mehr Bildflaeche bekommt. Vorher: 40-92px Padding.
          padding: isCheesePortrait
            ? 'clamp(12px, 2cqh, 24px) clamp(12px, 1.6cqw, 24px)'
            : (revealed ? '20px 24px 16px' : '20px 24px clamp(28px, 4cqh, 48px)'),
          transition: 'padding 0.55s var(--qq-ease-bounce), left 0.5s ease',
          pointerEvents: 'none',
        }}>
          {/* 2026-05-12 (Slide-Boundary-System): Doppel-Badge weg. Das CHEESE-
              spezifische top-left-Badge ist entfernt — das globale Bottom-Left-
              Badge des QuestionView-Wrappers rendert sich auch im CHEESE-
              Kontext darueber (zIndex 60, sichtbar ueber Cheese-Overlay zIndex
              52). Konsistente Position auf allen Slides. */}
          {/* Timer ring — top right (matches non-CHEESE layout), fade out on reveal.
              v3 round 8 (User-Bug 'timer auch bei hellem hintergrund schwer
              sichtbar'): zusaetzlicher dunkler Kreis-Backdrop hinter dem
              Timer-Ring fuer Kontrast auf hellen Fotos. */}
          {stickyTimer && (
            <div style={{
              // 2026-05-12 (Slide-Boundary-System): clamps → --qq-safe-margin Token.
              position: 'fixed', top: 'var(--qq-safe-margin)', right: 'var(--qq-safe-margin)', zIndex: 70,
              animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.3s both',
              pointerEvents: revealed ? 'none' : 'auto',
              // Mono/Themes: solider weißer Backdrop mit Card-Rahmen (statt dunklem
              // Kreis) — der Timer liest sich sonst schwarz-auf-dunkel unlesbar.
              padding: 12, borderRadius: isThemed() ? 'var(--qq-card-radius)' : '50%',
              background: isThemed() ? 'var(--qq-card-bg)' : 'radial-gradient(circle, rgba(13,10,6,0.82) 55%, rgba(13,10,6,0.55) 78%, transparent 100%)',
              border: isThemed() ? 'var(--qq-card-border)' : undefined,
              backdropFilter: isThemed() ? 'none' : 'blur(8px)',
              WebkitBackdropFilter: isThemed() ? 'none' : 'blur(8px)',
              boxShadow: isThemed() ? 'var(--qq-card-shadow)' : `0 4px 22px rgba(0,0,0,0.45)`,
            }}>
              <BeamerTimer endsAt={stickyTimer.endsAt} durationSec={stickyTimer.duration} accent={accent} expireNow={timerExpiring} />
            </div>
          )}

          {/* Frosted question/answer card — bottom.
              POP-Transition: minHeight waechst dynamisch beim Reveal.
              Beim Reveal: Border + Glow in der Farbe des SCHNELLSTEN korrekten
              Teams (User-Wunsch 2026-04-28: konsistent mit Mucho/ZvZ wo der
              Sieger-Frame bunt ist). Wenn niemand richtig: Standard-Akzent. */}
          {(() => {
            // Schnellstes korrektes Team finden (für Reveal-Glow)
            const fastestColor = (() => {
              if (!isCheeseReveal) return null;
              // 2026-07-08 Konsistenz #15: Backend-Gewinner nutzen (currentQuestionWinners
              // in Placement-Reihenfolge, fastest zuerst) — der String-Match unten
              // faerbte bei Fuzzy-Tippfehlern das falsche Team. Fallback = alter
              // Match, falls das Feld (alter Backend/stale State) fehlt.
              const winnerId = s.currentQuestionWinners?.[0];
              if (winnerId) return s.teams.find(t => t.id === winnerId)?.color ?? null;
              const correctDE = (q.answer ?? '').trim().toLowerCase();
              const correctEN = (q.answerEn ?? '').trim().toLowerCase();
              const correctSet = [correctDE, correctEN].filter(Boolean);
              if (correctSet.length === 0) return null;
              const matchesAns = (sub: string) => {
                const ss = sub.trim().toLowerCase();
                if (ss.length < 2) return false;
                return correctSet.some(c => c === ss || ss.includes(c) || (c.length > 3 && c.includes(ss) && ss.length >= 3));
              };
              const earliest = [...s.answers]
                .filter(a => matchesAns(a.text))
                .sort((a, b) => a.submittedAt - b.submittedAt)[0];
              if (!earliest) return null;
              return s.teams.find(t => t.id === earliest.teamId)?.color ?? null;
            })();
            const revealGlowColor = fastestColor ?? QQ_COLORS.green500;
            return (
          <div style={{
            position: 'relative',
            // 2026-04-30: Bei Reveal width:auto -> Card schrumpft auf Inhalt
            // (Antwort-Text + Avatare). User-Feedback: 'cheese reveal feld
            // dynamisch breit an text angepasst (ist extra breit aber da steht
            // nichts)'. Vor-Reveal weiter full-width fuer die Frage.
            // 2026-04-30 v3: Portrait-Mode → Card sitzt im rechten 50%-Streifen,
            // also schon eingeschraenkt im Container. width:100% reicht dort.
            // 2026-05-12 (Wolf 'in cheese mit horizont bild, wo fragecard
            // unten ist, mach die fragecard schmaler dass sie nicht mit badge
            // überlappt'): Bei Cheese-Landscape sitzt das Badge jetzt bottom-
            // left und die Frage-Card sitzt direkt darueber/daneben unten in
            // der Slide. maxWidth reduziert auf 1200 (war 1600) damit links
            // und rechts genug Platz fuer das Badge bleibt; marginInline:auto
            // haelt die Card horizontal zentriert wie bisher.
            width: isCheesePortrait ? '100%' : (isCheeseReveal ? 'auto' : 'calc(100% - clamp(40px, 6cqw, 96px))'),
            minWidth: isCheeseReveal && !isCheesePortrait ? 'clamp(360px, 50cqw, 720px)' : undefined,
            maxWidth: isCheesePortrait ? '100%' : (isCheeseReveal ? 'min(calc(100% - clamp(40px, 6cqw, 96px)), 1100px)' : 1200),
            marginInline: 'auto',
            // 2026-04-29 (User-Feedback): Reveal-Card ~25% flacher — vorher
            // verdeckte sie ~60% der Bildflaeche bei Picture-This-Bildern.
            minHeight: revealed
              ? (hasImg ? 'clamp(240px, 30cqh, 360px)' : 'clamp(180px, 22cqh, 260px)')
              : (hasImg ? 'clamp(120px, 16cqh, 200px)' : 'clamp(110px, 14cqh, 170px)'),
            // Mono/Themes: solide weiße Card (card-bg) statt dunkel-frosted —
            // sonst liest sich der schwarze card-text unsichtbar. Reveal behält
            // den Team-Farb-Rahmen als Sieger-Signal (Farb-Pop auf weiß).
            background: isThemed() ? 'var(--qq-card-bg)' : 'rgba(13,10,6,0.38)',
            backdropFilter: isThemed() ? 'none' : 'blur(18px) saturate(1.25)',
            WebkitBackdropFilter: isThemed() ? 'none' : 'blur(18px) saturate(1.25)',
            // Vor Reveal: kräftiger Kategorie-Glow wie bei MUCHO/ZvZ. (User-Wunsch
            // 2026-04-28: 'bei cheese darf die frage vor reveal umrandet sein
            // von kategorie farben glow wie bei anderen').
            border: isCheeseReveal
              ? `3px solid ${revealGlowColor}cc`
              : (isThemed() ? 'var(--qq-card-border)' : `2.5px solid ${accent}88`),
            borderRadius: isThemed() ? 'var(--qq-card-radius)' : 24,
            // Reveal-Padding kompakter (20 statt 28) damit das Bild oben mehr Platz behaelt.
            padding: isCheeseReveal ? '20px 48px' : '36px 56px',
            boxShadow: isThemed()
              ? (isCheeseReveal ? `0 0 0 2px ${revealGlowColor}, var(--qq-card-shadow)` : 'var(--qq-card-shadow)')
              : isCheeseReveal
              ? `0 0 0 1px ${revealGlowColor}55, 0 0 80px ${revealGlowColor}55, 0 0 32px ${revealGlowColor}88, 0 24px 80px rgba(0,0,0,0.5)`
              : `0 0 0 1px ${accent}33, 0 0 80px ${accent}33, 0 0 32px ${accent}55, 0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`,
            // 2026-05-05 (Wolf 'Cheese-Reveal-Card wiggelt beim Auftauchen,
            // wirkt chaotisch'): revealAnswerBam (scale+wiggle) entfernt —
            // die Card ist beim Reveal eh schon sichtbar (war im Question-
            // Mode bereits da), nur Inhalt aendert sich. Kein Pop-Effekt
            // nötig, Border-Color-Transition reicht als Reveal-Marker.
            // 2026-05-06 v6 (Wolf 'Cheese-Reveal: Card wiggelt heftig beim
            // Reveal-Start'): min-height + transform Transitions auf
            // ease-bounce sprangen ueber — die min-height-Aenderung
            // (~+120px beim Reveal) mit Bounce hat die Card sichtbar
            // wackeln lassen. Beide auf ease-smooth.
            animation: cheeseWithQuestion ? (isQuietMotion() ? 'langFadeIn 0.4s ease both' : 'bQuestionIn 0.5s var(--qq-ease-bounce) 0.1s both') : 'none',
            transform: revealed ? 'scale(1)' : 'scale(0.985)',
            transformOrigin: 'center',
            transition: 'padding 0.7s var(--qq-ease-smooth), border-color 0.55s ease, min-height 0.7s var(--qq-ease-smooth), transform 0.7s var(--qq-ease-smooth), width 0.7s var(--qq-ease-smooth), min-width 0.7s var(--qq-ease-smooth), max-width 0.7s var(--qq-ease-smooth)',
            pointerEvents: 'auto',
            textAlign: 'center',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            {/* Avatar-Reihe wurde 2026-05-04 v3 (Wolf-Feedback) RAUS aus der
                Card verlegt — sitzt jetzt als Flex-Sibling unter der Card im
                Overlay-Container. Damit landen die Avatare in der rechten
                Bildschirmhaelfte direkt unter der Fragecard (Portrait) bzw.
                unter der Card am unteren Rand (Landscape) statt halb in der
                Card-Unterkante zu kleben. Code: siehe direkt nach diesem
                Card-IIFE im Overlay-Container. */}

            {/* Category pill IN der Card entfernt — die Pill sitzt jetzt
                konsistent oben links wie bei den anderen Kategorien. */}

            {/* Question text — vor Reveal voll, beim Reveal kleiner + gedimmt
                (2026-04-29: damit Reveal-Card flacher wird und das Bild
                oberhalb sichtbar bleibt).
                2026-05-07 v2 (Wolf 'Buchstaben wiggeln sichtbar zwischen
                Question und Reveal'): font-size + margin-bottom in der
                Transition liessen den Text waehrend des Uebergangs neu
                fliessen → jeder Frame andere Letter-Positionen = Wiggle.
                Fix: key enthaelt jetzt isCheeseReveal → Re-Mount bei
                Reveal-Start, neuer Element mit neuer font-size sofort,
                kein animiertes Resize mehr. Transition raus, nur
                langFadeIn als Entry-Animation. */}
            <div key={`cheese-${lang}-${isCheeseReveal ? 'rev' : 'q'}`} style={{
              fontSize: isCheeseReveal
                ? 'clamp(20px, 2.6cqw, 36px)'
                : (qText.length > 120 ? 'clamp(32px, 4cqw, 60px)' : 'clamp(42px, 5.8cqw, 84px)'),
              fontWeight: 900, lineHeight: 1.22,
              color: 'var(--qq-card-text)',
              marginBottom: isCheeseReveal ? 8 : 0,
              animation: 'langFadeIn 0.4s ease both',
              opacity: isCheeseReveal ? 0.55 : 1,
            }}>
              {lang === 'en' && q.textEn ? q.textEn : q.text}
            </div>

            {/* Revealed answer.
                2026-05-06 v6 (Wolf 'Cheese-Reveal: Buchstaben wiggeln stark
                beim Reveal-Start, sieht unprofessionell aus'): revealAnswerBam
                (scale 0.8→1.04→0.98→1, bouncy) durch langFadeIn ersetzt — nur
                opacity + 8px translateY, kein Wiggle. Konsistent zum Question-
                Text drueber, der bereits langFadeIn nutzt. */}
            {isCheeseReveal && s.revealedAnswer && (
              <div style={{
                position: 'relative', overflow: 'hidden',
                fontSize: 'clamp(28px, 3.8cqw, 56px)', fontWeight: 900,
                color: QQ_COLORS.green400,
                animation: 'langFadeIn 0.5s var(--qq-ease-out-cubic) 0.15s both',
                textShadow: '0 0 30px rgba(34,197,94,0.4)',
                marginBottom: 6,
              }}>
                <div style={{
                  position: 'absolute', top: 0, width: '60%', height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
                  animation: 'revealShimmer 0.8s ease 0.5s both',
                  pointerEvents: 'none',
                }} />
                {s.revealedAnswer}
              </div>
            )}

            {/* Alle richtigen Teams mit Zeit — analog zu MUCHO/ZEHN_VON_ZEHN */}
            {/* 2026-05-02 (Phone-Beamer-Sync-Audit): strict-Match durch
                Backend-Truth (currentQuestionWinners) ersetzt - sonst fehlten
                Schreibfehler-akzeptierte Avatare in der Frosted-Card. */}
            {isCheeseReveal && (() => {
              const winnerSet = new Set(s.currentQuestionWinners ?? (s.correctTeamId ? [s.correctTeamId] : []));
              const correctAnswers = [...s.answers]
                .filter(a => winnerSet.has(a.teamId))
                .sort((a, b) => a.submittedAt - b.submittedAt);
              if (correctAnswers.length === 0) {
                return (
                  <div style={{
                    marginTop: 14,
                    fontSize: 'clamp(16px, 1.9cqw, 24px)', fontWeight: 900,
                    color: 'var(--qq-text-muted)',
                    animation: 'revealWinnerIn 0.5s ease 0.4s both',
                  }}>
                    {lang === 'en' ? 'No team got it right.' : 'Kein Team hatte die richtige Antwort.'}
                  </div>
                );
              }
              // 2026-07-09 (Wolf 'Reveal-Timer 0.0'): currentQuestionStartedAt zuerst
              // (timerEndsAt ist beim Reveal null → sonst 0.0 fürs schnellste Team).
              const t0 = (s as any).currentQuestionStartedAt
                ?? (s.timerEndsAt
                  ? s.timerEndsAt - (s.timerDurationSec * 1000)
                  : (correctAnswers[0].submittedAt));
              const winnerTeam = s.teams.find(t => t.id === correctAnswers[0].teamId);
              const multiCorrect = correctAnswers.length > 1;
              const winMsg = multiCorrect
                ? (lang === 'en' ? 'recognized it fastest!' : 'hat es am schnellsten erkannt!')
                : (lang === 'en' ? 'got it right!' : 'hat es erkannt!');
              return (
                <>
                <div style={{
                  marginTop: 8,
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                  gap: 12, flexWrap: 'wrap', width: '100%',
                }}>
                  {correctAnswers.map((a, i) => {
                    const team = s.teams.find(t => t.id === a.teamId);
                    if (!team) return null;
                    const timeSec = Math.max(0, (a.submittedAt - t0) / 1000);
                    const isFastest = i === 0;
                    // 2026-05-06 (Wolf 'schnellstes Team als letztes — habe das
                    // schon 2x als Aufgabe geschrieben'): Cheese-Overlay-IIFE
                    // hatte popDelay = i*850+200 (fastest first). Umgedreht:
                    // (N-1-i)*850+200 → slowest dropt zuerst, fastest zuletzt.
                    // Synchron zur Sound-Cascade (letzte Note = playRevealHighlight
                    // auf fastest team) und zur WinnerCard-Slam-Animation.
                    const popDelay = (correctAnswers.length - 1 - i) * 850 + 200;
                    return (
                      <div key={a.teamId} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        animation: `top5RowSlideIn 0.55s var(--qq-ease-out-cubic) ${popDelay}ms both`,
                      }}>
                        <div style={{
                          position: 'relative',
                          display: 'inline-block',
                          animation: isFastest ? `celebShake 0.6s ease ${popDelay + 600}ms both` : 'none',
                        }}>
                          <QQTeamAvatar
                            avatarId={team.avatarId} teamEmoji={team.emoji}
                            // 2026-04-29: Avatare bei Reveal etwas kleiner — Card flacher.
                            size={isFastest ? 'clamp(60px, 6.8cqw, 92px)' : 'clamp(46px, 5.2cqw, 70px)'}
                            style={{
                              border: isFastest ? '4px solid var(--qq-accent)' : 'none',
                              boxShadow: isFastest
                                ? '0 0 28px rgba(var(--qq-accent-rgb),0.65), 0 4px 14px rgba(0,0,0,0.45)'
                                : '0 4px 12px rgba(0,0,0,0.4)',
                            }}
                          />
                        </div>
                        <span style={{
                          padding: '3px 10px', borderRadius: 'var(--qq-pill-radius)',
                          background: isFastest ? 'rgba(var(--qq-accent-rgb),0.22)' : (isThemed() ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.55)'),
                          border: isFastest ? '1.5px solid rgba(var(--qq-accent-rgb),0.7)' : '1px solid var(--qq-hairline)',
                          // Mono: kein brandPink (Pink-Leak) — Akzent-Token; non-fastest dunkler Text auf hellem Chip.
                          color: isFastest ? (isThemed() ? 'var(--qq-accent)' : QQ_COLORS.brandPink) : (isThemed() ? 'var(--qq-card-text)' : 'var(--qq-text-muted)'),
                          fontWeight: 900,
                          fontSize: 'clamp(15px, 1.6cqw, 20px)',
                          whiteSpace: 'nowrap',
                        }}>
                          {timeSec.toFixed(1)}s
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* 2026-05-06 v3 (Wolf 'gewinnercard ausserhalb der avatar
                    card unten drunter'): Cheese-WinnerCard wurde aus der
                    frosted-card heraus genommen und als Sibling unter dem
                    cheese-overlay-Container plaziert (siehe weiter unten,
                    nach dem Frosted-Card-IIFE). */}
                </>
              );
            })()}

          </div>
            );
          })()}

          {/* Cheese WinnerCard — Sibling UNTER der Frosted-Card.
              2026-05-06 v3 (Wolf 'gewinnercard ausserhalb der avatar card
              unten drunter, sound an die card anpassen ton kommt zu spaet
              bzw card zu frueh').
              Timing-Sync: Climax-Sound feuert bei N×850 + 840ms. Card-Anim
              ist 0.6s; Anim-Peak (max scale/glow ~70%) ist bei card-start
              + 420ms. Damit Card-Peak und Sound zusammenfallen:
                card-start = sound-time − 420 = N×850 + 420ms.
              Card faded leicht ein, knallt im Peak mit dem Climax-Sound. */}
          {isCheeseReveal && (() => {
            const winnerSet = new Set(s.currentQuestionWinners ?? (s.correctTeamId ? [s.correctTeamId] : []));
            const correctAnswers = [...s.answers]
              .filter(a => winnerSet.has(a.teamId))
              .sort((a, b) => a.submittedAt - b.submittedAt);
            if (correctAnswers.length === 0) return null;
            const winnerTeam = s.teams.find(t => t.id === correctAnswers[0].teamId);
            if (!winnerTeam) return null;
            const multiCorrect = correctAnswers.length > 1;
            const winMsg = multiCorrect
              ? (lang === 'en' ? 'recognized it fastest!' : 'hat es am schnellsten erkannt!')
              : (lang === 'en' ? 'got it right!' : 'hat es erkannt!');
            const cardDelaySec = (correctAnswers.length * 850 + 420) / 1000;
            return (
              <div style={{
                pointerEvents: 'auto',
                marginTop: 'clamp(10px, 1.4cqh, 18px)',
                display: 'inline-flex', alignItems: 'center',
                gap: 'clamp(12px, 1.6cqw, 20px)',
                padding: 'clamp(10px, 1.4cqh, 16px) clamp(20px, 2.4cqw, 32px)',
                borderRadius: 'var(--qq-pill-radius)',
                background: `linear-gradient(135deg, ${winnerTeam.color}33, ${winnerTeam.color}10)`,
                border: `2.5px solid ${winnerTeam.color}aa`,
                boxShadow: `0 0 36px ${winnerTeam.color}55, 0 4px 14px rgba(0,0,0,0.45)`,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                animation: `revealWinnerIn 0.6s var(--qq-ease-bounce) ${cardDelaySec}s both`,
              }}>
                {/* 2026-05-13 (Wolf 'in cheese ist im gewinnerbadge ein pokal,
                    das ist sonst nie, fuer konsistenz weg'): freistehender 🏆-
                    Glyph direkt vor dem Avatar entfernt. Andere Modi nutzen den
                    Pokal hoechstens als Eyebrow-Label-Praefix ("🏆 Rundensieger"),
                    nicht als eigenes Element in der Winner-Pille. */}
                <QQTeamAvatar
                  avatarId={winnerTeam.avatarId}
                  teamEmoji={winnerTeam.emoji}
                  size={'clamp(40px, 4cqw, 56px)'}
                  style={{ flexShrink: 0, boxShadow: `0 0 18px ${winnerTeam.color}88` }}
                />
                <div style={{
                  fontSize: 'clamp(22px, 2.4cqw, 32px)', fontWeight: 900,
                  color: winnerTeam.color, lineHeight: 1.1,
                  textShadow: `0 0 18px ${winnerTeam.color}55`,
                }}>
                  {teamDisplayName(winnerTeam.name, true)}
                </div>
                <div style={{
                  fontSize: 'clamp(15px, 1.6cqw, 22px)', fontWeight: 800,
                  color: 'var(--qq-text-muted)', lineHeight: 1.2,
                }}>
                  {winMsg}
                </div>
              </div>
            );
          })()}

          {/* Avatar-Progress-Reihe — 2026-05-04 v3 (Wolf-Feedback):
              RAUS aus der Card als Flex-/Absolute-Sibling im Overlay-Container.
              - PORTRAIT (Bild links, Card rechts): Flex-Flow-Sibling unter dem Card.
                Parent ist flexCol+justify-center → Card + Avatars werden als Block
                vertikal mittig zentriert, Avatare sitzen direkt UNTER der Card im
                rechten Bildschirmstreifen.
              - LANDSCAPE (Card unten am Rand): absolute oben mittig — sonst wuerden
                Avatare unter der bottom-aligned Card aus dem Bildschirm fallen. */}
          {/* 2026-07-03 (Wolf 'gesammelt-Status soll auch im Reveal bleiben'):
              Früher `!revealed` → Reihe verschwand im CHEESE-Reveal. Jetzt auch
              während des Reveals sichtbar (Container ist ohnehin CHEESE-only), damit
              der Wappen-Status durchgehend stehen bleibt. */}
          {s.teams.length > 0 && (() => {
            const tc = s.teams.length;
            // 2026-05-05 (Wolf 'Cheese-Portrait Avatare zu klein, fast unter
            // ganze Frage-Card passen lassen'): Portrait-Sizes fast verdoppelt
            // (40/46/52 → 60/72/84) damit sie aus Beamer-Distanz erkennbar
            // sind und die rechte Halbflaeche unter der Frage-Card sinnvoll
            // ausnutzen.
            // 2026-05-13 (Wolf 'Cheese horizontal: avatare gleich gross wie
            // bei normalen Questions, nur Position bleibt'): Landscape-Sizes
            // (48/54/60) waren kleiner als Question-Footer (80/88/96) →
            // angeglichen. Cheese-Portrait bleibt anders, weil Card+Avatare
            // dort einen rechten Bildschirmstreifen teilen.
            const av = isCheesePortrait
              ? (tc > 6 ? 60 : tc > 4 ? 72 : 84)
              : (tc > 6 ? 80 : tc > 4 ? 88 : 96);
            // 2026-05-09 (Wolf 'Footer-Avatare zu eng'): Gap vergrössert
            // damit grüner Glow sichtbar atmet, nicht ineinander fließt.
            const gap = isCheesePortrait
              ? (tc > 6 ? 14 : tc > 4 ? 18 : 22)
              : (tc > 6 ? 12 : tc > 4 ? 15 : 18);
            const portraitFlow = {
              marginTop: 'clamp(10px, 1.6cqh, 22px)' as const,
            };
            const landscapeAbs = {
              position: 'absolute' as const,
              top: 'clamp(28px, 4cqh, 60px)' as const,
              left: 0, right: 0,
            };
            return (
              <div style={{
                ...(isCheesePortrait ? portraitFlow : landscapeAbs),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap, flexWrap: 'wrap',
                pointerEvents: 'none', zIndex: 65,
                animation: 'contentReveal 0.45s var(--qq-ease-pop-fast) 0.4s both',
              }}>
                {/* Mini-Progress-Text "X/Y TEAMS" zwischen Card-Unterkante und
                    Avataren. 2026-07-12 (Wolf 'rechte Spalte verschiebt sich bei
                    Timer-Ende'): NICHT mehr entfernen wenn alle dran/Timer aus —
                    das entfernte volle-Breite-Element ließ die Wappen-Reihe
                    springen. Stattdessen Platz reservieren (visibility:hidden).
                    Systemische Regel: dynamische Elemente ändern nie ihre Box. */}
                {(
                  <div style={{ width: '100%', textAlign: 'center', marginBottom: -2, visibility: s.allAnswered ? 'hidden' : 'visible' }}>
                    <span style={{
                      display: 'inline-block',
                      fontSize: 'clamp(11px, 1.1cqw, 14px)', fontWeight: 900,
                      letterSpacing: '0.04em', textTransform: 'uppercase',
                      // Mono/Themes (Wolf 2026-06-25 'zahl der teams grau auf weiß'):
                      // als solider Chip rendern → lesbar auf weißer Card UND auf Bild.
                      // Cozy bleibt der nackte helle Text auf dunklem Foto.
                      ...(isThemed()
                        ? {
                            padding: '2px 12px', borderRadius: 'var(--qq-pill-radius)',
                            background: 'var(--qq-card-bg)', border: '1.5px solid var(--qq-hairline)',
                            color: 'var(--qq-card-text)',
                          }
                        : { color: 'rgba(226,232,240,0.85)' }),
                    }}>
                      {(s as any).nestedTeams
                        ? `${s.answers.length}/${s.teams.length} ${lang === 'en' ? 'submitted' : 'Abgaben'}`
                        : `${s.answers.length}/${s.teams.length} Teams`}
                    </span>
                  </div>
                )}
                {(() => {
                  // 2026-07-03 (Wolf-Audit): In CozyArena (nestedTeams) NICHT 25
                  // Sub-Team-Avatare zeigen — auf 8 Fraktions-Wappen mit x/n-Badge
                  // gruppieren (wie die normale Footer-Reihe). Normal-Modus unverändert.
                  const nested = !!(s as any).nestedTeams;
                  if (nested) {
                    // 2026-07-12 (Wolf): im Arena-Modus sind es nur 8 Fraktions-
                    // Wappen (nicht bis zu 40 Handys) → deutlich größer für Distanz-
                    // Lesbarkeit + mehr Spannung beim Abgabe-Tracker. Badge mit.
                    const navSize = isCheesePortrait ? 96 : 124;
                    const groups = new Map<string, { rep: typeof s.teams[number]; total: number; answered: number }>();
                    const order: string[] = [];
                    for (const tm of s.teams) {
                      let g = groups.get(tm.avatarId);
                      if (!g) { g = { rep: tm, total: 0, answered: 0 }; groups.set(tm.avatarId, g); order.push(tm.avatarId); }
                      g.total++;
                      if (s.answers.some(a => a.teamId === tm.id)) g.answered++;
                    }
                    return order.map(id => {
                      const g = groups.get(id)!;
                      const done = g.answered >= g.total;
                      const some = g.answered > 0;
                      return (
                        <div key={id} style={{
                          position: 'relative', padding: 6, borderRadius: '50%',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          background: done ? 'rgba(34,197,94,0.18)' : 'transparent',
                          border: done ? '3px solid #22C55E' : some ? '3px solid rgba(34,197,94,0.45)' : '3px solid transparent',
                          boxShadow: done ? '0 0 20px rgba(34,197,94,0.5), 0 0 40px rgba(34,197,94,0.18)' : 'none',
                          opacity: some ? 1 : 0.55, filter: some ? 'none' : 'grayscale(0.4)',
                          transition: 'all 0.45s ease',
                        }}>
                          <QQTeamAvatar avatarId={g.rep.avatarId} teamEmoji={g.rep.emoji} size={navSize} />
                          <div style={{
                            position: 'absolute', bottom: -2, right: -2, minWidth: 28, height: 28, padding: '0 6px',
                            borderRadius: 999, background: done ? '#22C55E' : 'rgba(10,8,20,0.92)',
                            border: '2px solid rgba(255,255,255,0.18)', color: '#fff', fontSize: 15, fontWeight: 900,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                          }}>{g.answered}/{g.total}</div>
                        </div>
                      );
                    });
                  }
                  return s.teams.map(tm => {
                    const answered = s.answers.some(a => a.teamId === tm.id);
                    return (
                      <div key={tm.id} style={{
                        position: 'relative',
                        padding: 5, borderRadius: '50%',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        background: answered ? 'rgba(34,197,94,0.18)' : 'transparent',
                        border: answered ? '3px solid #22C55E' : '3px solid transparent',
                        boxShadow: answered ? '0 0 18px rgba(34,197,94,0.5), 0 0 36px rgba(34,197,94,0.2)' : 'none',
                        opacity: answered ? 1 : 0.55,
                        filter: answered ? 'none' : 'grayscale(0.4)',
                        transition: 'all 0.45s ease',
                      }}>
                        <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={av} />
                      </div>
                    );
                  });
                })()}
              </div>
            );
          })()}
        </div>
      )}

      {/* Main content (non-CHEESE or hidden during CHEESE overlay) */}
      <div style={{
        flex: 1, display: cheeseOverlay ? 'none' : 'flex', gap: 0,
        flexDirection: (hasImg && img.layout === 'window-left') ? 'row-reverse' : 'row',
        animation: 'contentReveal 0.35s var(--qq-ease-pop-fast) both',
      }}>
        {/* ── Main content — full width, vertically distributed ──
            Final approach (2026-04-28-v4):
            - space-between für MUCHO/ZvZ Reveal: Frage-Card top-anchored,
              Winner-Card (last item) bottom-anchored, dazwischen verteilen
              sich Options/Voter-Reihe natürlich.
            - Hinzu kommt ein <Spacer flex:1/> zwischen Voter-Avataren und
              Winner-Card → der Spacer absorbiert Layout-Änderungen, sodass
              upper Cards stabil stehen wenn Winner erscheint.
            - Bei nicht-revealed (active) center bleibt für saubere Mitte.
            Vertikales overflow visible erlaubt, dass Card-Glow + Winner-Border
            nicht durch overflow:hidden geclipped werden. */}
        {(() => {
          // 2026-04-29 (User-Feedback): Bei HotPotato mit vielen genannten
          // Antworten kollidiert das Chip-Layout (bottom:16, wrap-up) mit der
          // mittig-zentrierten Frage-Card. Ab 12 Chips Frage hochschieben
          // (justifyContent: flex-start) damit unten Platz für den Chip-Block
          // bleibt. Chips skalieren ihrerseits in HotPotatoBeamerView.
          const isHotPotatoActive = q.category === 'BUNTE_TUETE'
            && q.bunteTuete?.kind === 'hotPotato' && !revealed
            && !(s as any).largeGroupMode; // Mega Event: Hot Potato = normale Frage
          const hpUsedCount = (s.hotPotatoUsedAnswers?.length ?? 0);
          // 2026-04-30 v2 (User-Feedback): Trigger 12->16 fuer ruhigeres
          // mid-game-Layout (selteneres Snap-down). Transition wird in der
          // Card-Style 0.4s -> 0.7s entspannter.
          const hpCompact = isHotPotatoActive && hpUsedCount > 16;
          // 2026-05-05 v3 (Wolf-Bug 'Luecke zwischen Card und Chips'): Chips
          // sitzen jetzt im natuerlichen Flex-Flow direkt unter der Card
          // (HotPotatoBeamerView ohne position:absolute). Card + Chip-Block
          // werden als 1 Block vertikal mittig zentriert, mit definiertem Gap
          // dazwischen. Keine Luecke mehr, kein Snap, kein paddingBottom-Hack.
          // 2026-05-12 (Wolf 'komisch ueberlappend' in HP-Active):
          // innerJustify center erzeugte symmetrischen Overflow wenn HP-
          // Content zu hoch war — Q-Card oben + Chips + Active-Card-Slot +
          // Eliminated wuchsen in beide Richtungen, Chips klebten an Q-Card-
          // Bottom. Bei HotPotato Active jetzt flex-start: Q-Card pinned oben,
          // Chips folgen mit gap, Active-Card-Slot weiter unten. Kein
          // symmetrisches Overspill mehr. Andere Kategorien bleiben bei
          // center weil sie weniger vertikale Stacks haben.
          const innerJustify = isHotPotatoActive ? 'flex-start' : 'center';
          const innerGap = isHotPotatoActive ? 'clamp(24px, 3.2cqh, 44px)' : 0;
          return (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          // 2026-05-12 (Wolf 'kategorie-badge nach links UNTEN, fragecard oben');
          // 2026-05-12 v2 (Wolf 'safe-margin im ganzen quiz'): jede Achse
          // floor() auf var(--qq-safe-margin) um Mindest-Rand zu garantieren.
          padding: isHotPotatoActive
            ? 'max(var(--qq-safe-margin), clamp(36px, 5cqh, 64px)) max(var(--qq-safe-margin), clamp(28px, 4cqw, 64px)) max(var(--qq-safe-margin), clamp(70px, 8cqh, 100px))'
            : 'max(var(--qq-safe-margin), clamp(40px, 5.5cqh, 70px)) max(var(--qq-safe-margin), clamp(28px, 4cqw, 64px)) max(var(--qq-safe-margin), clamp(70px, 8cqh, 100px))',
          alignItems: 'center', position: 'relative', zIndex: 5,
          // 2026-05-05 (Wolf-Bug 'Scrollbar rechts auf /beamer'): overflow
          // hart auf hidden — Beamer darf NIE scrollen, lieber Inhalt clippen
          // (overflowY:visible konnte vorher Body-Level-Scroll triggern wenn
          // Card+Voters+Winner zusammen ueber 100cqh wuchsen).
          overflow: 'hidden',
        }}>

          {/* 2026-05-12 (Wolf 'kategorie badge nach links unten, fragecard
              oben'): Top-Bar getrennt — Timer oben-rechts (unveraendert),
              Badge in eigene Bottom-Left-Container (siehe unten am Ende von
              dem Wrapper). Vorher saßen beide in einer absoluten Top-Bar.
              Diese Wrapper-Div haelt jetzt nur noch den Top-Right Timer. */}
          <div style={{
            position: 'absolute',
            // 2026-07-07 (Wolf-Livetest 'timer hängt halb übers fragefeld'):
            // Timer-Inset von der Content-Margin ENTKOPPELT — eigener enger
            // Eck-Abstand rueckt den Timer rechts an der (maxWidth:1400,
            // zentrierten) Frage-Karte vorbei, statt mit ihr zu ueberlappen.
            top: 'clamp(14px, 1.6vh, 26px)',
            left: 'clamp(14px, 1.6vh, 26px)',
            right: 'clamp(14px, 1.6vh, 26px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
            gap: 16,
            zIndex: 60,
            pointerEvents: 'none',
          }}>
            {/* Timer auf der rechten Seite — versteckt fuer HotPotato (eigener
                per-Turn-Timer in HotPotatoBeamerView).
                2026-05-12: Badge ist aus dieser Top-Bar raus (jetzt unten links). */}
            {stickyTimer && !(q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato' && !(s as any).largeGroupMode) && (
              <div style={{
                pointerEvents: revealed ? 'none' : 'auto',
                flexShrink: 0,
              }}>
                {/* 2026-05-04 v3 (Wolf): stickyTimer haelt das letzte gueltige
                    endsAt ~1s nachdem das Backend timerEndsAt nullt — sonst
                    unmountet die Component bevor qqTimerOutro durchlaeuft.
                    timerExpiring=true sobald Original-Prop weg ODER revealed. */}
                <BeamerTimer endsAt={stickyTimer.endsAt} durationSec={stickyTimer.duration} accent={accent} expireNow={timerExpiring} />
              </div>
            )}
          </div>
          {/* 2026-05-12 v3 (Wolf 'kartoffel unten links — ganz weglassen die
              badge'): Kategorie-Badge in QuestionView komplett entfernt.
              Kategorie wird via PhaseIntro vor jeder Frage prominent
              gezeigt (Title + Sub-Line). Question-Card-Border ist
              zusaetzlich in Kategorie-Farbe. Kein redundantes Badge im
              QuestionView mehr. */}

          {/* 2026-04-30: Inner-Content-Wrapper mit flex:1.
              2026-05-12 (Audit-C 'AutoFit entsorgt'): AutoFitContent war
              eine fragile Zwischenloesung — CSS zoom-Property liest
              scrollHeight bereits skaliert zurueck, Force-Reflow half nicht
              zuverlaessig, nested zoom+SlideStage transform produzierte
              Browser-Quirks. Single-Source-of-Truth ist jetzt SlideStage
              (Phase 1 Option A, ?stage=1). Bei Stage AUS: Layout-Content
              im Standard-Flex-Flow mit min-height:0 + overflow:hidden.
              Bei Stage AN: SlideStage haelt Layout immer in 1080px Canvas. */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            justifyContent: innerJustify,
            gap: innerGap,
            alignItems: 'center', width: '100%',
            minHeight: 0,
            overflow: 'hidden',
          }}>

          {/* Question card — KEIN Resize mehr zwischen Question und Reveal
              (User-Feedback 2026-04-28: 'cards zappelig beim kleiner werden').
              Card und Text behalten ihre Größe, nur Opacity dimmt (1 → 0.45)
              und Padding bleibt konstant. So gibt's GAR keine Resize-Bewegung
              mehr — der Reveal-Indikator ist allein das Dimmen + die neuen
              Avatar/Answer-Cards die darunter erscheinen.
              2026-04-29 (User-Feedback): Bei HotPotato mit vielen Chips
              (hpCompact) wird die Card flacher + Text kleiner, damit unten
              Platz fuer den Chip-Block bleibt. */}
          {(() => {
            // 2026-05-07 (Layout-Audit): horizontal-padding clamp(110-180) →
            // clamp(60-120). Vorher: Card 1400 breit aber bis 360 Innen-Padding
            // → nur 1040px Textbreite, Frage wirkte klein. Jetzt 240px max
            // Innen-Padding → ~1160px Text bei voller Breite.
            const cardPadding = hpCompact
              ? 'clamp(10px, 1.4cqh, 18px) clamp(60px, 8cqw, 120px) clamp(10px, 1.4cqh, 18px)'
              : 'clamp(18px, 2.6cqh, 32px) clamp(60px, 8cqw, 120px) clamp(18px, 2.6cqh, 32px)';
            const cardMarginBottom = hpCompact ? 'clamp(8px, 1.2cqh, 16px)' : 'clamp(16px, 2.2cqh, 32px)';
            // v3 round 11 (User-Wunsch 'textgroesse muss nicht zwangsweise
            // kleiner werden'): Font-Size bleibt voll, nur Padding/Margin
            // werden im hpCompact-Modus kleiner. Card-Shift uebernimmt das
            // Platzproblem.
            const cardFontSize = qFontSize;
            // 2026-05-12 (Audit-A 'Dead-Code chipShiftVh entfernt'): die
            // chipShiftVh-Variable war seit 2026-05-07 immer 0 (Comment
            // beschrieb Legacy aus 2026-04-29 als Chips position:absolute
            // waren). Plus 'vh'-Einheit nach cqh-Migration uebersehen.
            // Komplett raus — kein conditional transform, keine Transition,
            // keine willChange. Vereinfacht den Wrapper.
            return (
              <div style={{
                width: '100%', maxWidth: 1400,
                flexShrink: 0,
              }}>
                <div style={{
                  background: cardBg,
                  // Skin: Treatment-Tokens (dicker Rand/harter Schatten etc.).
                  // Cozy (isThemed=false): unveraendert der kategorie-gefaerbte Glow.
                  border: isThemed() ? 'var(--qq-card-border)' : `2.5px solid ${revealed ? `${accent}55` : `${accent}88`}`,
                  borderRadius: isThemed() ? 'var(--qq-card-radius)' : 24,
                  boxShadow: isThemed()
                    ? 'var(--qq-card-shadow)'
                    : (revealed
                      ? `0 0 0 1px ${accent}22, 0 0 50px ${accent}22, 0 0 22px ${accent}33, 0 8px 28px rgba(0,0,0,0.4)`
                      : `0 0 0 1px ${accent}33, 0 0 80px ${accent}33, 0 0 32px ${accent}55, 0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`),
                  padding: cardPadding,
                  marginBottom: cardMarginBottom,
                  width: '100%',
                  textAlign: 'center',
                  animation: 'bQuestionIn 0.5s var(--qq-ease-bounce) both',
                  // 2026-04-30 v2: padding/margin-Transition 0.4s -> 0.7s
                  // entspannt, damit hpCompact-Snap weniger hektisch wirkt.
                  // 2026-05-02 (App-Designer-Audit B4): opacity-Dim mit 0.45s Delay,
                  // damit zuerst die Voter-Cascade rausschwingen kann (laeuft 0.5s)
                  // bevor die Frage-Card transparent wird.
                  transition: 'box-shadow 0.55s ease, border-color 0.55s ease, opacity 0.4s ease 0.45s, padding 0.7s var(--qq-ease-smooth), margin-bottom 0.7s var(--qq-ease-smooth)',
                  opacity: revealed ? 0.55 : 1,
                }}>
                  {/* 2026-05-07 (Audit P0): font-size-transition liess Buchstaben
                      bei qFontSize/hpCompact-Wechsel sichtbar wandern. Key-Remount
                      macht den Wechsel atomic, langFadeIn als saubere Entry-Anim. */}
                  <div key={`${lang}-${cardFontSize}`} style={{
                    fontSize: cardFontSize,
                    fontWeight: 900, lineHeight: 1.22,
                    color: 'var(--qq-card-text)',
                    animation: 'langFadeIn 0.4s ease both',
                  }}>
                    {qText}
                  </div>
                </div>
              </div>
            );
          })()}


          {/* Mobile-Hint („📱 Antwort auf dem Handy") entfernt 2026-04-26:
              Teams haben bereits die Eingabe-UI auf ihren Geraeten — der
              Beamer-Hint zielte auf niemanden, der ihn lesen muss. Die
              Avatare-mit-Haekchen-Reihe (z.B. bei Cheese) zeigt die
              Antwort-Progress visueller. */}

          {/* BUNTE_TÜTE order — Items während QUESTION_ACTIVE sichtbar
              (Teams sortieren am Handy, Publikum muss wissen worum es geht) */}
          {!revealed && q.category === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'order' && (() => {
            const btt = q.bunteTuete as any;
            const items: string[] = (lang === 'en' && btt.itemsEn?.length) ? btt.itemsEn : (btt.items ?? []);
            const criteria: string | undefined = (lang === 'en' && btt.criteriaEn) ? btt.criteriaEn : btt.criteria;
            if (items.length === 0) return null;
            const cols = Math.min(items.length, items.length <= 4 ? items.length : items.length === 5 ? 5 : 3);
            return (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 14,
                width: '100%', maxWidth: 1400, marginBottom: 16,
                animation: 'contentReveal 0.35s var(--qq-ease-pop-fast) 0.1s both',
              }}>
                {criteria && (
                  <div style={{
                    fontSize: 'clamp(14px, 1.5cqw, 22px)', fontWeight: 900,
                    color: 'var(--qq-accent)', letterSpacing: '0.1em', textTransform: 'uppercase',
                    textAlign: 'center',
                  }}>
                    {lang === 'en' ? `Sort ${criteria}` : `Sortiert ${criteria}`}
                  </div>
                )}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  gap: 14,
                }}>
                  {items.map((item, i) => (
                    <div key={i} style={{
                      borderRadius: isThemed() ? 'var(--qq-card-radius)' : 16, padding: '22px 24px',
                      background: cardBg,
                      border: '2px solid rgba(var(--qq-accent-rgb),0.4)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.04)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 'clamp(20px, 2.4cqw, 34px)', fontWeight: 900, color: 'var(--qq-card-text)',
                      textAlign: 'center', lineHeight: 1.25,
                      minHeight: 80,
                      animation: `contentReveal 0.4s var(--qq-ease-pop-fast) ${0.1 + i * 0.06}s both`,
                    }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* MUCHO: 2-Akt-Reveal (Akt 1 Voter-Steps, Akt 2 Lock via Doppelblink) */}
          {q.options && q.category === 'MUCHO' && (
            <MuchoOptionsReveal
              options={q.options}
              optionsEn={q.optionsEn}
              correctOptionIndex={q.correctOptionIndex}
              optionImages={q.optionImages}
              answers={s.answers}
              teams={s.teams}
              lang={lang}
              cardBg={cardBg}
              timerEndsAt={s.timerEndsAt}
              timerDurationSec={s.timerDurationSec}
              currentQuestionStartedAt={(s as any).currentQuestionStartedAt}
              revealStep={revealed ? s.muchoRevealStep : 0}
            />
          )}

          {/* ZEHN_VON_ZEHN: Options-Grid. Top-Bet-Chips haengen an der unteren
              Card-Linie (analog MUCHO-Reveal) — nicht mehr im Card-Inhalt. */}
          {q.options && q.category === 'ZEHN_VON_ZEHN' && (() => {
            // Fallback auf frueheste submittedAt, weil timerEndsAt zum Reveal
            // bereits null ist → ohne Fallback keine Zeit-Anzeige.
            const earliestSubmit = zvzAnswers.length > 0
              ? Math.min(...zvzAnswers.map(a => a.submittedAt))
              : null;
            const t0 = (s as any).currentQuestionStartedAt
              ?? (s.timerEndsAt && s.timerDurationSec
                ? s.timerEndsAt - s.timerDurationSec * 1000
                : earliestSubmit);
            // Analog Mucho: kompakt waehrend QUESTION_ACTIVE, Rows ziehen sich
            // smooth auseinander sobald Top-Bet-Chips einfliegen (zvzStep>=1).
            const expandedLayout = zvzStep >= 1;
            // Wenn auf einer Option viele Top-Bets liegen (4+ Teams gleicher
            // Höchstwert), brauchen wir mehr Platz unter den Cards damit die
            // Avatare nicht in die nächste Reihe rutschen.
            const maxChips = Math.max(0, ...zvzHighestPerOption.map(h => h?.teamIds?.length ?? 0));
            const heavyChips = maxChips >= 4;
            // Gewinner = höchster Einsatz auf der korrekten Option (Tie → schnellste
            // Einreichung). Beat 5: Konfetti in Team-Farbe + Pink, sobald gelockt.
            const zvzWinnerTeam = (zvzLocked && q.correctOptionIndex != null)
              ? (() => {
                  const ci = q.correctOptionIndex;
                  const bets = zvzAnswers
                    .map(a => {
                      const team = zvzTeams.find(t => t.id === a.teamId);
                      const pts = (a.text.split(',').map(n => Number(n) || 0))[ci] ?? 0;
                      return team && pts > 0 ? { team, pts, submittedAt: a.submittedAt } : null;
                    })
                    .filter((x): x is { team: NonNullable<ReturnType<typeof zvzTeams.find>>; pts: number; submittedAt: number } => !!x);
                  if (bets.length === 0) return undefined;
                  const maxPts = Math.max(...bets.map(b => b.pts));
                  return bets.filter(b => b.pts === maxPts).sort((a, b) => a.submittedAt - b.submittedAt)[0]?.team;
                })()
              : undefined;
            return (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              columnGap: 18,
              // 2026-04-30 v3 (User-Bug): Avatare am Voter-Grid-Tile-Boden
              // wurden abgeschnitten weil paddingBottom zu knapp. Werte
              // raufgesetzt: heavyChips 96→140, leicht 62→100. Avatare
              // (Hängen unter dem Tile) brauchen genug Luft.
              rowGap: expandedLayout ? (heavyChips ? 'clamp(140px, 17cqh, 200px)' : 'clamp(100px, 12cqh, 140px)') : 18,
              paddingBottom: expandedLayout ? (heavyChips ? 'clamp(130px, 14cqh, 180px)' : 'clamp(100px, 11cqh, 140px)') : 0,
              // 2026-05-10 (Wolf-Live-Test L9 '10v10 unten viel Platz, Cards
              // nach oben gequetscht'): minHeight + paddingTop damit Cards
              // vertikal-mittig statt top-aligned sitzen. Nutzt verfügbaren
              // Platz unter der Question-Card aus.
              minHeight: 'clamp(280px, 38cqh, 460px)',
              alignContent: 'center',
              marginTop: 16,
              marginBottom: 16,
              width: '100%', maxWidth: 1400,
              animation: 'contentReveal 0.35s var(--qq-ease-pop-fast) 0.1s both',
              // 2026-04-30 v2: 0.6s → 0.9s entspanntes Easing analog MUCHO.
              transition: 'row-gap 0.9s var(--qq-ease-smooth), padding-bottom 0.9s var(--qq-ease-smooth)',
            }}>
              {q.options.map((opt, i) => {
                const optImg = q.optionImages?.[i];
                const isCorrect = zvzLocked && i === q.correctOptionIndex;
                const isWrong = zvzLocked && i !== q.correctOptionIndex;
                // 2026-05-09 v2 (Wolf): Plain-Number als großer Text in
                // Option-Color statt Box+Keycap-Emoji.
                const label = `${i + 1}`;
                const optColor = accent;
                const optText = qqCapOption(lang === 'en' && q.optionsEn?.[i] ? q.optionsEn[i] : opt);
                const highestForOpt = zvzHighestPerOption[i];
                const highestIdsForOpt = new Set(highestForOpt?.teamIds ?? []);
                // Top-Bets inkl. submittedAt fuer Tiebreaker-Anzeige
                const highestBets = zvzAnswers
                  .map(a => {
                    const team = zvzTeams.find(t => t.id === a.teamId);
                    if (!team || !highestIdsForOpt.has(team.id)) return null;
                    const pts = (a.text.split(',').map(n => Number(n) || 0))[i] ?? 0;
                    return pts > 0 ? { team, pts, submittedAt: a.submittedAt } : null;
                  })
                  .filter((x): x is { team: NonNullable<ReturnType<typeof zvzTeams.find>>; pts: number; submittedAt: number } => !!x)
                  .sort((a, b) => a.submittedAt - b.submittedAt);
                const highestVisibleOpt = zvzStep >= 1 && zvzRevealed.has(i);
                // Blitz + Zeit NUR bei Tiebreak (mehrere Top-Bets mit gleichen Hoechstpunkten
                // auf der korrekten Option). Solo-Top-Bet braucht keinen Speed-Indikator —
                // der Chip mit Goldrand reicht.
                const showTimePills = isCorrect && highestBets.length > 1;
                return (
                  <div key={i} style={{ position: 'relative', display: 'flex', height: '100%' }}>
                    <div style={{
                      position: 'relative', overflow: 'hidden',
                      // 2026-04-28: User-Wunsch — alle 3 ZvZ-Cards gleich hoch.
                      // Wenn eine Option 2-zeilig wird, soll der Rest mitwachsen,
                      // sonst wirken die Cards inkonsistent. flex:1 + height:100%
                      // zwingt die Inner-Card auf Row-Höhe.
                      flex: 1,
                      // 2026-05-09 (Wolf 'Mini-Sprung'): box-sizing border-box
                      // + einheitliche 3px-Border verhindert Layout-Shift wenn
                      // Sieger-Card kommt (war 2/3/2 = +2px höher → andere Cards
                      // schoben mit).
                      boxSizing: 'border-box',
                      borderRadius: isThemed() ? 'var(--qq-card-radius)' : 24, padding: '20px 24px',
                      background: isCorrect ? 'rgba(34,197,94,0.2)' : cardBg,
                      // 2026-06-24 (Wolf 'option-rahmen auch schwarz'): bei Skin die
                      // Card-Behandlung (Mono=schwarzer Rand+Hard-Shadow) statt Akzent-Rand.
                      border: isCorrect ? '3px solid #22C55E' : isWrong ? `3px solid var(--qq-hairline)` : (isThemed() ? 'var(--qq-card-border)' : `3px solid ${optColor}55`),
                      boxShadow: isCorrect
                        ? '0 0 40px rgba(34,197,94,0.35), 0 0 80px rgba(34,197,94,0.15)'
                        : (isThemed() ? 'var(--qq-card-shadow)' : `0 4px 16px rgba(0,0,0,0.3)`),
                      display: 'flex', alignItems: 'center', gap: 16,
                      transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
                      animation: isCorrect
                        // 2026-07-09 (Motion-Audit B2): Blink allein war ein flacher
                        // Aha. + revealCorrectPop (scale-frei, nur box-shadow → keine
                        // Width-Drift in der Sibling-Row) gibt den Grün-Glow-Pulse.
                        // Ohne 'both' → Card settlet danach in ihren statischen Doppel-Glow.
                        ? 'revealDoubleBlink 1.1s ease both, revealCorrectPop 0.6s var(--qq-ease-bounce)'
                        : isWrong
                          ? 'revealWrongDim 0.4s ease 0.15s both'
                          : `contentReveal 0.4s var(--qq-ease-pop-fast) ${0.1 + i * 0.08}s both`,
                    }}>
                      {optImg?.url && (
                        <img src={optImg.url} alt="" style={{
                          position: 'absolute', inset: 0, width: '100%', height: '100%',
                          objectFit: optImg.fit ?? 'cover', opacity: optImg.opacity ?? 0.4,
                          pointerEvents: 'none',
                        }} />
                      )}
                      {optImg?.url && (
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 100%)', pointerEvents: 'none' }} />
                      )}
                      {/* 2026-05-09 v2 (Wolf): Box weg, große Zahl in
                          Option-Color statt Container-Box. Bei isCorrect
                          grün, bei isWrong gedimmt grau, sonst optColor.
                          2026-05-19 (Wolf-Live 'bei 10v10 geht 1/2/3 unter'):
                          Größe drastisch erhöht (fontSize 56→clamp 7cqw, bis
                          124px) + kräftigerer Glow, damit die Zahl auf dem
                          Beamer dominanter als der Option-Text wirkt. */}
                      <div style={{
                        position: 'relative', zIndex: 1,
                        minWidth: 'clamp(64px, 7cqw, 110px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 'clamp(72px, 8cqw, 124px)', fontWeight: 900, flexShrink: 0,
                        lineHeight: 1,
                        color: isCorrect ? QQ_COLORS.green500 : isWrong ? QQ_COLORS.slate600 : optColor,
                        textShadow: isCorrect
                          ? '0 0 28px rgba(34,197,94,0.75), 0 0 60px rgba(34,197,94,0.35)'
                          : `0 0 22px ${optColor}88, 0 0 50px ${optColor}44`,
                        letterSpacing: '-0.04em',
                        transition: 'all 0.3s ease',
                      }}>{label}</div>
                      <div style={{
                        position: 'relative', zIndex: 1,
                        flex: 1, minWidth: 0,
                        fontSize: 'clamp(24px, 2.8cqw, 40px)', fontWeight: 900,
                        color: isWrong ? QQ_COLORS.slate600 : 'var(--qq-card-text)', lineHeight: 1.25,
                        textShadow: optImg?.url ? '0 2px 8px rgba(0,0,0,0.8)' : 'none',
                        transition: 'color 0.3s ease',
                      }}>{optText}</div>
                    </div>
                    {/* Top-Bet-Chips: haengen UNTER der Card (nur ein kleiner Lip
                        ueberlappt den Card-Rand). ZvZ-Cards sind flach → wenn
                        Chips mittig auf der Linie sitzen, ueberdecken sie das Label. */}
                    {highestVisibleOpt && highestBets.length > 0 && (() => {
                      const cnt = highestBets.length;
                      // Chip-Tiers nach Anzahl gleichplatzierter Top-Bets pro Option:
                      // bei 4+ massiv schrumpfen, sonst rutschen Chips in 2. Reihe und
                      // ueberlagern die naechste Card-Zeile.
                      const tier: 'lg' | 'md' | 'sm' | 'xs' =
                        cnt >= 5 ? 'xs' : cnt >= 4 ? 'sm' : cnt >= 3 ? 'md' : 'lg';
                      const avSz =
                        tier === 'xs' ? 'clamp(28px, 2.8cqw, 40px)' :
                        tier === 'sm' ? 'clamp(36px, 3.6cqw, 52px)' :
                        tier === 'md' ? 'clamp(44px, 4.6cqw, 64px)' :
                                        'clamp(52px, 5.4cqw, 76px)';
                      const ptsFs =
                        tier === 'xs' ? 'clamp(14px, 1.5cqw, 20px)' :
                        tier === 'sm' ? 'clamp(16px, 1.8cqw, 24px)' :
                        tier === 'md' ? 'clamp(18px, 2cqw, 28px)' :
                                        'clamp(20px, 2.2cqw, 30px)';
                      const padR = tier === 'xs' ? 10 : tier === 'sm' ? 12 : tier === 'md' ? 14 : 18;
                      const innerGap = tier === 'xs' ? 4 : tier === 'sm' ? 6 : 8;
                      const outerGap = cnt >= 4 ? 4 : cnt > 2 ? 6 : 10;
                      return (
                      <div style={{
                        position: 'absolute', left: 8, right: 8, bottom: 0,
                        transform: 'translateY(72%)',
                        display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start',
                        justifyContent: 'center',
                        gap: outerGap,
                        pointerEvents: 'none', zIndex: 5,
                      }}>
                        {highestBets.map(({ team: tm, pts, submittedAt }, bi) => {
                          const timeSec = t0 ? Math.max(0, (submittedAt - t0) / 1000) : null;
                          const isFastest = showTimePills && bi === 0;
                          // Sieger-Chip = höchster Bet auf korrekter Option (auch solo,
                          // unabhängig vom Tie-Speed-Indikator) → bekommt die Krone.
                          const isWinnerChip = isCorrect && bi === 0;
                          // Dim-Logik bewusst entfernt (User-Feedback): ZvZ-Voter-Chips
                          // bleiben voll opak auf allen Optionen, Falsch-Markierung
                          // laeuft nur ueber die Card selbst (Rand + Text gedimmt).
                          return (
                            <div key={tm.id} title={`${tm.name}: ${pts}`} style={{
                              position: 'relative',
                              display: 'flex', alignItems: 'center', gap: innerGap,
                              // 2026-05-12 (Wolf-Bug 'low-number bets cropped'):
                              // vertikales Padding 2px → 6px. Mit nur 2px Top/Bottom
                              // konnte die Bet-Zahl (font-descender + ascender bei
                              // line-height normal ~1.2) unten in den Pill-Rand
                              // ragen — visuell "abgeschnitten" am border-radius:999.
                              padding: `6px ${padR}px 6px 2px`,
                              borderRadius: 'var(--qq-pill-radius)',
                              background: 'var(--qq-overlay)',
                              border: isFastest ? '3px solid var(--qq-accent)' : `2px solid ${tm.color}`,
                              boxShadow: isFastest
                                ? '0 0 22px rgba(var(--qq-accent-rgb),0.55), 0 6px 14px rgba(0,0,0,0.55)'
                                : `0 6px 14px rgba(0,0,0,0.55), 0 0 14px ${tm.color}55`,
                              animation: `muchoVoterDrop 0.55s var(--qq-ease-bounce) ${0.1 + bi * 0.08}s both`,
                            }}>
                              {/* Beat 5 — Sieger-Krönung: Krone bouncet auf den
                                  höchsten Bet der korrekten Option. */}
                              {isWinnerChip && (
                                /* 2026-06-29 (Wolf 'krone oft offset'): Lift in einen
                                   statischen Wrapper — der muchoVoterDrop-100%-Frame
                                   (transform reset, fill both) hatte sonst die
                                   translateY(-72%)-Hebung gekillt → Krone fiel auf den
                                   Chip. Glyph drinnen animiert, Wrapper hält den Lift. */
                                <span aria-hidden style={{
                                  position: 'absolute', top: 0, left: 'clamp(10px, 1.4cqw, 20px)',
                                  transform: 'translateY(-78%)',
                                  pointerEvents: 'none', zIndex: 3,
                                }}>
                                  <span style={{
                                    display: 'inline-block',
                                    fontSize: 'clamp(22px, 2.6cqw, 38px)', lineHeight: 1,
                                    filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.55))',
                                    animation: 'muchoVoterDrop 0.6s var(--qq-ease-bounce) 0.3s both',
                                  }}><QQEmojiIcon emoji="👑" size="1em" /></span>
                                </span>
                              )}
                              <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={avSz} />
                              <span style={{
                                fontSize: ptsFs,
                                fontWeight: 900,
                                // 2026-05-12 (Wolf-Bug 'low-number bets cropped'):
                                // lineHeight 1 statt browser-default. Verhindert
                                // dass font-ascent/descent die Pill-Hoehe sprengt.
                                lineHeight: 1,
                                color: tm.color, fontVariantNumeric: 'tabular-nums',
                                textShadow: '0 0 12px rgba(var(--qq-accent-rgb),0.45), 0 1px 2px rgba(0,0,0,0.6)',
                              }}>{pts}</span>
                              {/* Zeit-Pill immer auf korrekter Option (konsistent mit Mucho/Cheese) */}
                              {showTimePills && timeSec != null && (
                                <span style={{
                                  position: 'absolute',
                                  left: '50%', bottom: -8,
                                  transform: 'translate(-50%, 50%)',
                                  padding: '2px 9px', borderRadius: 'var(--qq-pill-radius)',
                                  background: isFastest ? 'rgba(var(--qq-accent-rgb),0.95)' : 'rgba(15,23,42,0.95)',
                                  border: isFastest ? '1.5px solid rgba(var(--qq-accent-rgb),1)' : `1.5px solid ${tm.color}`,
                                  color: isFastest ? '#0A0814' : 'var(--qq-card-text)',
                                  fontWeight: 900,
                                  fontSize: 'clamp(11px, 1.2cqw, 15px)',
                                  whiteSpace: 'nowrap',
                                  boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                                  lineHeight: 1.1,
                                }}>
                                  {timeSec.toFixed(1)}s
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      );
                    })()}
                  </div>
                );
              })}
              {/* Beat 5 — Konfetti in Gewinner-Team-Farbe + Pink, sobald die
                  korrekte Option lockt und es einen Sieger gibt. Fixed-Overlay
                  (entkommt dem Grid), feuert genau einmal. */}
              {zvzWinnerTeam && (
                <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 60, overflow: 'hidden' }}>
                  <ConfettiOverlay accent={zvzWinnerTeam.color} />
                </div>
              )}
            </div>
            );
          })()}

          {/* ZEHN_VON_ZEHN: Unter-Bets (alle außer Top-Bets) — Top-Bets werden
              direkt auf der Option oben eingeblendet. Hier also nur die restlichen
              Tipps pro Option, von Anfang an in einheitlicher Größe.
              Sobald die Korrektheit gelockt ist (zvzLocked), gleiten die Sub-Bets
              nach unten weg + fade — clean Spotlight auf die richtige Option. */}
          {revealed && q.category === 'ZEHN_VON_ZEHN' && q.options && (
            <div style={{
              width: '100%', maxWidth: 1400,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 18,
              marginBottom: zvzLocked ? 0 : 16,
              maxHeight: zvzLocked ? 0 : 600,
              overflow: 'hidden',
              opacity: zvzLocked ? 0 : 1,
              transform: zvzLocked ? 'translateY(20px)' : 'translateY(0)',
              transition: 'opacity 0.55s ease 0.2s, transform 0.55s ease 0.2s, max-height 0.55s ease 0.2s, margin-bottom 0.55s ease 0.2s',
              pointerEvents: zvzLocked ? 'none' : 'auto',
            }}>
              {q.options.map((_, i) => {
                const bets = zvzAnswers.map(a => {
                  const pts = a.text.split(',').map(n => Number(n) || 0);
                  return { team: zvzTeams.find(t => t.id === a.teamId), pts: pts[i] ?? 0 };
                }).filter((b): b is { team: NonNullable<typeof b.team>; pts: number } => !!b.team && b.pts > 0);
                const highest = zvzHighestPerOption[i];
                const highestIds = new Set(highest?.teamIds ?? []);
                const otherBets = bets.filter(b => !highestIds.has(b.team.id));
                return (
                  <div key={`bets-${i}`} style={{
                    display: 'flex', flexWrap: 'wrap', gap: 6,
                    justifyContent: 'center', alignItems: 'center',
                    minHeight: 'clamp(40px, 5cqw, 56px)',
                  }}>
                    {otherBets.length === 0 ? (
                      <span style={{ fontSize: 'clamp(13px, 1.4cqw, 18px)', color: 'var(--qq-text-muted)', fontStyle: 'italic' }}>—</span>
                    ) : otherBets.map(({ team: tm, pts }) => (
                      <div key={tm.id} title={`${tm.name}: ${pts}`} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '3px 12px 3px 3px',
                        borderRadius: 'var(--qq-pill-radius)',
                        background: 'var(--qq-overlay)',
                        border: `2px solid ${tm.color}`,
                        boxShadow: `0 3px 10px rgba(0,0,0,0.5), 0 0 8px ${tm.color}44`,
                      }}>
                        <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={'clamp(28px, 3cqw, 40px)'} />
                        <span style={{
                          fontSize: 'clamp(14px, 1.6cqw, 22px)',
                          fontWeight: 900,
                          color: tm.color, fontVariantNumeric: 'tabular-nums',
                          textShadow: '0 0 10px rgba(var(--qq-accent-rgb),0.4), 0 1px 2px rgba(0,0,0,0.6)',
                        }}>{pts}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Answer reveal (skip for MUCHO/ZEHN_VON_ZEHN + Hot Potato — handled separately).
              Rechts im Feld: Avatare der Teams, die das Richtige getippt haben,
              sortiert nach Reaktionszeit (schnellster mit <QQEmojiIcon emoji="⚡"/>-Krone).
              CHEESE: step-based — erst bei cheeseShowGreen (Step 1) sichtbar; Avatare kaskadieren bei Step 2. */}
          {revealed && s.revealedAnswer && q.category !== 'MUCHO' && q.category !== 'ZEHN_VON_ZEHN'
            && !(q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato') && (() => {
              // CHEESE: Box immer sichtbar (Layout fix), Inhalt erst bei Step 1.
              const cheeseHideContent = q.category === 'CHEESE' && !cheeseShowGreen;
              // 2026-05-02 (Wolfs Bug 'CHEESE-Cascade nicht nacheinander wie sonst'):
              // Vorher Frontend-strict-Match - Schreibfehler-akzeptierte Antworten
              // (Backend similarityScore>=0.8) wurden NICHT als korrekt erkannt,
              // betroffene Avatare fehlten in der Cascade. Jetzt Backend-Truth via
              // currentQuestionWinners. Bei SCHAETZCHEN bleibt's leer (Zeitstrahl
              // uebernimmt). Sortierung weiterhin nach submittedAt.
              const isSchaetz = q.category === 'SCHAETZCHEN';
              const winnerIdSet = new Set(s.currentQuestionWinners ?? (s.correctTeamId ? [s.correctTeamId] : []));
              const correctTeams = isSchaetz ? [] : [...s.answers]
                .filter(a => winnerIdSet.has(a.teamId))
                .sort((a, b) => a.submittedAt - b.submittedAt)
                .map(a => {
                  const team = s.teams.find(t => t.id === a.teamId);
                  return team ? { team, submittedAt: a.submittedAt } : null;
                })
                .filter((x): x is { team: NonNullable<ReturnType<typeof s.teams.find>>; submittedAt: number } => !!x);
              const t0 = (s as any).currentQuestionStartedAt
                ?? (s.timerEndsAt && s.timerDurationSec
                  ? s.timerEndsAt - s.timerDurationSec * 1000
                  : correctTeams[0]?.submittedAt);
              // CozyArena: bis zu 24 Sub-Team-Avatare → auf 8 Fraktionen bündeln.
              // Vertreter je Fraktion = schnellstes richtiges Handy (correctTeams
              // ist nach submittedAt sortiert → erster Treffer je avatarId), + ×Zähler.
              // Optik (schnellster groß + Zeit-Pillen + Cascade) bleibt erhalten.
              const correctDisplay: Array<{ team: (typeof correctTeams)[number]['team']; submittedAt: number; count: number }> =
                isMegaTeams
                  ? (() => {
                      const byAv = new Map<string, { team: (typeof correctTeams)[number]['team']; submittedAt: number; count: number }>();
                      for (const ct of correctTeams) {
                        const ex = byAv.get(ct.team.avatarId);
                        if (ex) ex.count++;
                        else byAv.set(ct.team.avatarId, { team: ct.team, submittedAt: ct.submittedAt, count: 1 });
                      }
                      return [...byAv.values()].sort((a, b) => a.submittedAt - b.submittedAt);
                    })()
                  : correctTeams.map(ct => ({ team: ct.team, submittedAt: ct.submittedAt, count: 1 }));
              return (
                <div style={{
                  position: 'relative', overflow: 'hidden',
                  padding: 'clamp(16px, 2cqh, 32px) clamp(24px, 3cqw, 52px)', borderRadius: isThemed() ? 'var(--qq-card-radius)' : 24,
                  background: cheeseHideContent ? 'rgba(34,197,94,0.06)' : 'rgba(34,197,94,0.12)',
                  border: cheeseHideContent ? '3px dashed rgba(34,197,94,0.22)' : '3px solid rgba(34,197,94,0.50)',
                  boxShadow: cheeseHideContent ? 'none' : '0 0 60px rgba(34,197,94,0.25), 0 0 120px rgba(34,197,94,0.1)',
                  marginBottom: 'clamp(8px, 1.2cqh, 24px)',
                  width: '100%', maxWidth: 1400,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 'clamp(10px, 1.4cqh, 18px)',
                  // 2026-05-07 (Audit P1): Cheese hat oben schon Frage-Card-
                  // Animation + Step-Cascade — der scale-bounce hier bringt
                  // die Card doppelt in Bewegung. Cheese bekommt langFadeIn,
                  // andere Kategorien behalten den Standard-Bam.
                  animation: cheeseHideContent
                    ? undefined
                    : (q.category === 'CHEESE'
                        ? 'langFadeIn 0.5s ease both'
                        : 'revealAnswerBam 0.6s var(--qq-ease-out-cubic) 0.15s both'),
                  transition: 'background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease',
                }}>
                  {/* Shimmer sweep */}
                  <div style={{
                    position: 'absolute', top: 0, width: '60%', height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                    animation: 'revealShimmer 0.8s ease 0.5s both',
                    pointerEvents: 'none',
                  }} />
                  <span style={{
                    fontSize: 'clamp(28px, 4cqw, 64px)', fontWeight: 900, color: QQ_COLORS.green400,
                    flexShrink: 1, minWidth: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    position: 'relative', zIndex: 1,
                    visibility: cheeseHideContent ? 'hidden' : 'visible',
                  }}>
                    {formatRevealedAnswer(lang, s.revealedAnswer ?? q.answer, q.answerEn)}
                  </span>
                  {correctDisplay.length > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                      gap: 12, flexWrap: 'wrap',
                      flexShrink: 0, width: '100%',
                      position: 'relative', zIndex: 1,
                      // Bei CHEESE vor Step 2: Platz reserviert, Inhalt unsichtbar — verhindert Card-Dehnung
                      visibility: (q.category === 'CHEESE' && !cheeseShowAvatars) ? 'hidden' : 'visible',
                    }}>
                      {correctDisplay.map((ct, vi) => {
                        const timeSec = t0 ? Math.max(0, (ct.submittedAt - t0) / 1000) : null;
                        const isFastest = vi === 0;
                        // CHEESE: 850ms-Stagger pro Avatar synchron zur Pentatonik-
                        // Cascade (siehe useEffect oben). Vorher 160ms war zu schnell
                        // und unspannend ("alle auf einmal"-Gefuehl).
                        const isCheeseCascade = q.category === 'CHEESE' && cheeseShowAvatars;
                        // 2026-07-09 (Motion-Audit B1): Nicht-CHEESE-Reveals (v.a.
                        // MUCHO/Schätzchen) poppten alle Avatare synchron bei 0.6s.
                        // Jetzt gestaffelt wie ZvZ/Top5 (0.45s + vi*0.09s) → der
                        // 'wer war richtig'-Moment kaskadiert statt flach zu landen.
                        const cascadeDelay = isCheeseCascade ? vi * 0.85 : 0.45 + vi * 0.09;
                        const avatarAnim = isCheeseCascade
                          ? `muchoVoterDrop 0.55s var(--qq-ease-bounce) ${cascadeDelay}s both`
                          : `revealAnswerBam 0.5s var(--qq-ease-bounce) ${cascadeDelay}s both`;
                        const avSize = isFastest ? 'clamp(78px, 8.6cqw, 116px)' : 'clamp(58px, 6.4cqw, 88px)';
                        return (
                          <div key={ct.team.id} style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                            animation: avatarAnim,
                          }}>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <QQTeamAvatar
                                avatarId={ct.team.avatarId}
                                teamEmoji={isMegaTeams ? qqMegaFactionSlug(ct.team.avatarId) : undefined}
                                size={avSize}
                                style={{
                                  border: isFastest ? '4px solid var(--qq-accent)' : 'none',
                                  boxShadow: isFastest
                                    ? `0 0 28px rgba(var(--qq-accent-rgb),0.65), 0 4px 14px rgba(0,0,0,0.45)`
                                    : '0 4px 12px rgba(0,0,0,0.4)',
                                }}
                              />
                              {/* CozyArena: wie viele Handys dieser Fraktion richtig lagen */}
                              {ct.count > 1 && (
                                <span style={{
                                  position: 'absolute', right: -6, bottom: -6, minWidth: 22, height: 22, padding: '0 5px',
                                  borderRadius: 11, background: '#0A0814', border: `2px solid ${ct.team.color}`,
                                  color: '#fff', fontSize: 13, fontWeight: 900, lineHeight: 1,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontVariantNumeric: 'tabular-nums',
                                }}>×{ct.count}</span>
                              )}
                            </div>
                            {timeSec != null && (
                              <span style={{
                                padding: '3px 10px', borderRadius: 'var(--qq-pill-radius)',
                                background: isFastest ? 'rgba(var(--qq-accent-rgb),0.22)' : 'rgba(0,0,0,0.55)',
                                border: isFastest ? '1.5px solid rgba(var(--qq-accent-rgb),0.7)' : '1px solid var(--qq-hairline)',
                                color: isFastest ? QQ_COLORS.brandPink : 'var(--qq-text-muted)',
                                fontWeight: 900,
                                fontSize: 'clamp(15px, 1.6cqw, 20px)',
                                whiteSpace: 'nowrap',
                              }}>
                                {timeSec.toFixed(1)}s
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

          {/* Hot Potato reveal: show full answer list as chips, mark which were named */}
          {revealed && q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato' && (() => {
            const raw = (lang === 'en' && q.answerEn ? q.answerEn : q.answer) ?? '';
            const allAnswers = raw.split(/[,;]/).map(a => a.replace(/[…\.]+$/, '').trim()).filter(Boolean);
            const used = s.hotPotatoUsedAnswers ?? [];
            const authors = s.hotPotatoAnswerAuthors ?? [];
            const usedNorm = used.map((u: string) => u.toLowerCase().trim());
            // Map each revealed answer (from q.answer) → authoring team (if any)
            const findAuthor = (a: string): string | null => {
              const aLower = a.toLowerCase().trim();
              for (let i = 0; i < usedNorm.length; i++) {
                const u = usedNorm[i];
                if (u === aLower || u.includes(aLower) || aLower.includes(u)) return authors[i] ?? null;
              }
              return null;
            };
            // Density-Skalierung: bei vielen Antworten Pills/Font kompakter,
            // sonst sprengen sie den Beamer. 2026-05-09 v3 (Wolf 'all possible
            // answers immer noch zu klein, dynamisch hochziehen wenn Platz'):
            // neue 'xxl'-Stufe für ≤4 Antworten + xl/lg deutlich vergrößert.
            // Schwellen großzügiger: xl bis 8 (war 6), lg bis 16 (war 12).
            const N = allAnswers.length;
            // 2026-05-12 (Wolf 'gewinnercard aus dem slide draußen, lösungen
            // zu groß'): Tier-Schwellen DEUTLICH zurueck. Bei 19 Antworten
            // war vorher lg (38px Font, 5 Reihen, ~485px Grid) → klemmt
            // Survivor-Card unter den Slide. Neue Schwellen drücken 19 in
            // tier=md (26px Font, ~290px Grid) → Survivor-Card hat wieder
            // Platz unten. Gewinn pro Stufe: ~60% Grid-Hoehe.
            const tier =
              N <= 4  ? 'xxl'
              : N <= 8  ? 'xl'   // war ≤12
              : N <= 16 ? 'lg'   // war ≤24
              : N <= 28 ? 'md'   // war ≤40
              : N <= 50 ? 'sm'   // war ≤80
              : 'xs';
            // 2026-05-06 (Wolf 'keine Cascade-Animation bei Hot Potato, aber
            // Cascade-Sound schon — Animation anpassen'): Stagger deutlich
            // langsamer (war 50/25/12/8ms), jetzt sichtbar als Cascade-Effekt.
            // Sync zur Sound-Cascade (Pentatonik-Notes pro qualified Team).
            // 2026-05-11 (Wolf 'lesbar von weiten, Platz nutzen'): font-sizes
            // ausgewogener — kein steiler Drop mehr von lg auf md. md geht von
            // 13/1.4/18 → 17/1.85/26, sm von 11/1.2/15 → 14/1.5/20, xs 10/1/13 → 12/1.2/16.
            const tierStyles = {
              xxl: { fontSize: 'clamp(40px, 4.4cqw, 72px)', pad: '20px 40px', padAvatar: '12px 36px 12px 12px', avatarSize: 'clamp(60px, 6cqw, 88px)',   gap: 22, headerFs: 'clamp(36px, 4cqw, 60px)', containerPad: '40px 44px', stagger: 0.28 },
              xl:  { fontSize: 'clamp(30px, 3.4cqw, 52px)', pad: '15px 32px', padAvatar: '9px 30px 9px 9px',    avatarSize: 'clamp(48px, 4.8cqw, 68px)', gap: 18, headerFs: 'clamp(30px, 3.4cqw, 50px)', containerPad: '30px 34px', stagger: 0.22 },
              lg:  { fontSize: 'clamp(24px, 2.6cqw, 38px)', pad: '12px 26px', padAvatar: '7px 24px 7px 7px',    avatarSize: 'clamp(40px, 4cqw, 56px)',   gap: 14, headerFs: 'clamp(26px, 3cqw, 42px)',  containerPad: '24px 28px', stagger: 0.16 },
              md:  { fontSize: 'clamp(17px, 1.85cqw, 26px)', pad: '9px 18px', padAvatar: '5px 16px 5px 5px',    avatarSize: 'clamp(28px, 2.8cqw, 38px)', gap: 9,  headerFs: 'clamp(20px, 2.2cqw, 30px)', containerPad: '16px 20px', stagger: 0.09 },
              sm:  { fontSize: 'clamp(14px, 1.5cqw, 20px)', pad: '6px 14px',  padAvatar: '4px 12px 4px 4px',    avatarSize: 'clamp(22px, 2.2cqw, 30px)', gap: 6,  headerFs: 'clamp(16px, 1.8cqw, 24px)', containerPad: '12px 16px', stagger: 0.05 },
              xs:  { fontSize: 'clamp(12px, 1.2cqw, 16px)', pad: '4px 10px',  padAvatar: '3px 10px 3px 3px',    avatarSize: 'clamp(18px, 1.8cqw, 24px)', gap: 4,  headerFs: 'clamp(14px, 1.5cqw, 20px)', containerPad: '10px 14px', stagger: 0.03 },
            }[tier];
            return (
              <div style={{
                width: '100%', maxWidth: 1400,
                marginBottom: 'clamp(8px, 1.2cqh, 24px)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: tier === 'xxl' ? 22 : tier === 'xl' ? 18 : tier === 'lg' ? 14 : tier === 'md' ? 10 : 8,
                // 2026-05-07 (Audit P2): revealAnswerBam (scale-bounce) auf dem
                // Container sprang mit den Chip-Cascades durch — alle Chips
                // huepften synchron mit dem Container-Scale, plus jeder Chip
                // hat seine eigene contentReveal. langFadeIn als ruhige
                // Container-Entry, die Chip-Cascade traegt allein die Energie.
                animation: 'langFadeIn 0.5s ease 0.15s both',
              }}>
                <div style={{
                  fontSize: tierStyles.headerFs, fontWeight: 900,
                  color: QQ_COLORS.green300, letterSpacing: 0.5,
                }}>
                  <QQEmojiIcon emoji="🥔"/> {lang === 'en' ? 'All possible answers' : 'Alle möglichen Antworten'}
                  <span style={{ marginLeft: 8, fontSize: '0.7em', opacity: 0.7 }}>· {N}</span>
                </div>
                <div style={{
                  display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
                  gap: tierStyles.gap,
                  padding: tierStyles.containerPad, borderRadius: isThemed() ? 'var(--qq-card-radius)' : 24,
                  background: 'rgba(34,197,94,0.08)',
                  border: '2px solid rgba(34,197,94,0.3)',
                  // 2026-05-12 v2 (Audit-A): 58cqh → 52cqh. Survivor-Card
                  // hatte rechnerisch Platz (~897px bei 1080p, 934px verfuegbar),
                  // aber Edge-Cases (groesseres Question-Card, kleinere Beamer)
                  // druckten sie raus. 52cqh gibt 30-35% garantierten Bottom-
                  // Platz fuer Survivor-Card.
                  maxHeight: 'clamp(340px, 52cqh, 620px)', overflow: 'hidden',
                }}>
                  {allAnswers.map((a, i) => {
                    const authorId = findAuthor(a);
                    const named = authorId !== null || usedNorm.some((u: string) =>
                      u === a.toLowerCase().trim() || u.includes(a.toLowerCase().trim()) || a.toLowerCase().trim().includes(u)
                    );
                    const authorTeam = authorId ? s.teams.find(t => t.id === authorId) : null;
                    // Bei xs/sm-Density: Avatare nur bei genannten Antworten anzeigen
                    const showAvatar = !!authorTeam && (tier !== 'xs');
                    return (
                      // 2026-05-12 (Audit-B 'Chip-Cascade Dauerschleife'):
                      // Key auf reinen Answer-Text reduziert (war ${a}-${i}).
                      // Mit Index drift bei IIFE-Re-Eval konnten gleiche Texte
                      // andere Keys bekommen → React-Remount → Animation neu.
                      // Reiner Text ist stabil (allAnswers ist deterministisch
                      // aus q.answer abgeleitet, keine Duplikate erwartet).
                      <div key={a} style={{
                        display: 'inline-flex', alignItems: 'center', gap: tier === 'xxl' ? 14 : tier === 'xl' ? 12 : tier === 'lg' ? 8 : 4,
                        padding: showAvatar ? tierStyles.padAvatar : tierStyles.pad,
                        borderRadius: 'var(--qq-pill-radius)',
                        fontSize: tierStyles.fontSize, fontWeight: 900,
                        background: named ? 'rgba(34,197,94,0.22)' : 'rgba(15,23,42,0.5)',
                        border: `${tier === 'xs' ? 1 : 2}px solid ${authorTeam ? authorTeam.color : (named ? QQ_COLORS.green500 : 'rgba(148,163,184,0.25)')}`,
                        color: named ? QQ_COLORS.green300 : 'var(--qq-text-muted)',
                        animation: `contentReveal 0.4s var(--qq-ease-pop-fast) ${0.2 + i * tierStyles.stagger}s both`,
                        boxShadow: authorTeam && tier !== 'xs' ? `0 0 8px ${authorTeam.color}44` : 'none',
                      }}>
                        {showAvatar && authorTeam && (
                          <QQTeamAvatar avatarId={authorTeam.avatarId} teamEmoji={authorTeam.emoji} size={tierStyles.avatarSize} title={authorTeam.name} style={{
                            flexShrink: 0,
                          }} />
                        )}
                        {/* 2026-05-17 (Wolf): ✓-Häkchen raus — Avatar + grüne
                            Farbe + Border zeigen schon klar dass die Antwort
                            genannt wurde. Redundantes Symbol-Lärm reduziert. */}
                        <span>{a}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Background flash on reveal */}
          {revealed && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
              background: s.correctTeamId
                ? `radial-gradient(ellipse at center, rgba(34,197,94,0.3) 0%, transparent 70%)`
                : `radial-gradient(ellipse at center, rgba(239,68,68,0.2) 0%, transparent 70%)`,
              animation: 'revealFlash 1.2s ease-out both',
            }} />
          )}

          {/* Schätzchen: number-line visualization (above leaderboard) */}
          {revealed && q.category === 'SCHAETZCHEN' && s.answers.length > 0 && q.targetValue != null && (() => {
            const target = q.targetValue as number;
            const parsed = s.answers
              .map(a => {
                const num = Number(a.text.replace(/[^0-9.,\-]/g, '').replace(',', '.'));
                const team = s.teams.find(t => t.id === a.teamId);
                return { teamId: a.teamId, num, team, text: a.text };
              })
              .filter(p => Number.isFinite(p.num) && p.team);
            if (parsed.length === 0) return null;
            const values = [target, ...parsed.map(p => p.num)];
            const rawMin = Math.min(...values);
            const rawMax = Math.max(...values);
            const rawSpan = rawMax - rawMin;
            // Padding 10% auf beiden Seiten, mindestens 10% relativ zum Target.
            const pad = Math.max(rawSpan * 0.1, Math.abs(target) * 0.05, 1);
            const axMin = rawMin - pad;
            const axMax = rawMax + pad;
            const axSpan = Math.max(axMax - axMin, 1);
            const pctOf = (v: number) => ((v - axMin) / axSpan) * 100;
            // Worst → best für Animation-Reihenfolge (Trommelwirbel bis Gewinner)
            const sorted = [...parsed].sort((a, b) =>
              Math.abs(b.num - target) - Math.abs(a.num - target)
            );
            // 2026-05-11 (Wolf-Bug: bei Target 14, Antworten 13 + 15 wurde nur
            // EIN Team als Winner highlighted obwohl beide distance=1 haben.
            // Root-Cause: isWinner verglich nur mit sorted[length-1].teamId.
            // Fix: alle Teams mit minimaler Distanz sind Winner.
            const minDistance = Math.min(...parsed.map(p => Math.abs(p.num - target)));
            const isWinnerTeam = (teamId: string) => {
              const p = parsed.find(x => x.teamId === teamId);
              return p ? Math.abs(p.num - target) === minDistance : false;
            };
            // 4-Slot-Kollisionssystem: Avatare werden auf die erste freie Reihe
            // gelegt, die genug horizontalen Abstand hat. Reihenfolge der Reihen:
            // 0=oben nah, 1=unten nah, 2=oben weit, 3=unten weit.
            // MIN_DIST_PCT = minimaler X-Abstand in % für dieselbe Reihe.
            // Avatar 72px bei ~1400px Breite ≈ 5.2%, + 2% Luft = 7.2% → 8%.
            const pinRows = new Map<string, number>();
            const pinXNudge = new Map<string, number>();
            const MIN_DIST_PCT = 8;
            const rowLastPct: number[] = [-Infinity, -Infinity, -Infinity, -Infinity];
            const sortedByPos = [...parsed].sort((a, b) => a.num - b.num);
            sortedByPos.forEach((p) => {
              const pct = pctOf(p.num);
              // Probiere die 4 Reihen in bevorzugter Reihenfolge durch
              const preferredOrder = [0, 1, 2, 3];
              let chosen = 3; // Fallback = weit-unten
              for (const row of preferredOrder) {
                if (pct - rowLastPct[row] >= MIN_DIST_PCT) {
                  chosen = row;
                  break;
                }
              }
              pinRows.set(p.teamId, chosen);
              rowLastPct[chosen] = pct;
            });

            // ═══════════════════════════════════════════════════════════════
            // DYNAMIC CHIP PLACEMENT mit echter Kollisionserkennung.
            // Pixel-basiert auf einer virtuellen Bühne von 1400px Breite.
            // Für jeden Pin werden 4 Chip-Kandidaten geprüft (below, above,
            // right, left relativ zum Avatar) und der erste freie gewählt.
            // Geprüft wird gegen ALLE bereits platzierten Avatare & Chips.
            // Die Chip-Offsets werden dann per CSS-Var an den Chip gereicht.
            // ═══════════════════════════════════════════════════════════════
            type Rect = { x: number; y: number; w: number; h: number };
            const STAGE_W = 1400;
            const rectsOverlap = (a: Rect, b: Rect, pad = 4) =>
              !(a.x + a.w + pad <= b.x ||
                b.x + b.w + pad <= a.x ||
                a.y + a.h + pad <= b.y ||
                b.y + b.h + pad <= a.y);
            const placedRects: Rect[] = [];
            // Zielmarker sitzt jetzt ALS Pill direkt AUF der Rail —
            // nur ein schmales Rect in Rail-Höhe sperren, damit Avatar-Chips
            // oben/unten drumherum frei platziert werden können.
            const targetPx = (pctOf(target) / 100) * STAGE_W;
            placedRects.push({ x: targetPx - 50, y: -16, w: 100, h: 32 });
            // Alle Pin-Avatare als Rects für Kollision vormerken.
            parsed.forEach((p) => {
              const r = pinRows.get(p.teamId) ?? 0;
              const isWinner = isWinnerTeam(p.teamId);
              const isTop = r === 0 || r === 2;
              const gap = r === 0 || r === 1 ? 110 : 180;
              const wrapperY = isTop ? -gap : gap;
              const aSize = isWinner ? 86 : 72;
              const px = (pctOf(p.num) / 100) * STAGE_W;
              placedRects.push({
                x: px - aSize / 2, y: wrapperY - aSize / 2,
                w: aSize, h: aSize,
              });
            });
            // Chip-Offsets pro Team berechnen.
            const pinChipOffset = new Map<string, { dx: number; dy: number; side: 'below' | 'above' | 'right' | 'left' }>();
            // In Reihenfolge der sortierten Enthüllung (sorted = worst→best),
            // damit Gewinner zuletzt platziert wird und freie Plätze wählt.
            // Aber bessere Verteilung: erst die engsten Cluster (mittlere Pcts)
            // durchgehen — wir gehen links→rechts, das klappt in der Praxis.
            [...parsed].sort((a, b) => a.num - b.num).forEach((p) => {
              const r = pinRows.get(p.teamId) ?? 0;
              const isWinner = isWinnerTeam(p.teamId);
              const isTop = r === 0 || r === 2;
              const gap = r === 0 || r === 1 ? 110 : 180;
              const wrapperY = isTop ? -gap : gap;
              const aSize = isWinner ? 86 : 72;
              const px = (pctOf(p.num) / 100) * STAGE_W;
              const chipW = isWinner ? 140 : 100;
              const chipH = isWinner ? 64 : 48;
              // Kandidaten relativ zum Avatar-Wrapper-Zentrum (px-Koordinaten).
              // Primär: Richtung "Rail" (zur Mitte hin) bleibt erhalten —
              // unten-Avatare → Chip nach oben, oben-Avatare → Chip nach unten.
              // Dann Fallbacks: außen, rechts, links.
              const primaryBelow = !isTop; // !isTop = Avatar unten der Rail → Chip über dem Avatar (Richtung Rail)
              const candidates: Array<{ dx: number; dy: number; side: 'below' | 'above' | 'right' | 'left' }> = [];
              // Rail-zugewandt (primär)
              if (primaryBelow) {
                candidates.push({ dx: 0, dy: -aSize / 2 - 6 - chipH, side: 'above' });
              } else {
                candidates.push({ dx: 0, dy: aSize / 2 + 6, side: 'below' });
              }
              // Rail-abgewandt (sekundär)
              if (primaryBelow) {
                candidates.push({ dx: 0, dy: aSize / 2 + 6, side: 'below' });
              } else {
                candidates.push({ dx: 0, dy: -aSize / 2 - 6 - chipH, side: 'above' });
              }
              // Rechts / links vom Avatar
              candidates.push({ dx: aSize / 2 + 8, dy: -chipH / 2, side: 'right' });
              candidates.push({ dx: -aSize / 2 - 8 - chipW, dy: -chipH / 2, side: 'left' });
              // Weitere Fallbacks: weiter oben/unten
              candidates.push({ dx: 0, dy: -aSize / 2 - 6 - chipH - 28, side: 'above' });
              candidates.push({ dx: 0, dy: aSize / 2 + 6 + 28, side: 'below' });

              let picked = candidates[0];
              for (const c of candidates) {
                const chipRect: Rect = {
                  x: px + c.dx - chipW / 2 + (c.side === 'right' || c.side === 'left' ? chipW / 2 : 0),
                  y: wrapperY + c.dy,
                  w: chipW, h: chipH,
                };
                // Für side=right/left: dx bereits inkl. Chip-Breite gesetzt.
                if (c.side === 'right' || c.side === 'left') {
                  chipRect.x = px + c.dx;
                } else {
                  chipRect.x = px + c.dx - chipW / 2;
                }
                const collides = placedRects.some(r2 => rectsOverlap(chipRect, r2));
                if (!collides) {
                  placedRects.push(chipRect);
                  picked = c;
                  break;
                }
              }
              // Falls alle kollidieren → trotzdem primary nehmen, platzieren.
              if (!picked) picked = candidates[0];
              pinChipOffset.set(p.teamId, picked);
            });
            const targetPct = pctOf(target);
            const unitStrInline = (lang === 'en' && q.unitEn ? q.unitEn : q.unit) ?? '';
            const looksLikeYearI = (n: number) => Number.isInteger(n) && n >= 1000 && n <= 2100;
            const isYearUnitInline = !!q.isYearAnswer || /jahr|year/i.test(unitStrInline) || (target != null && looksLikeYearI(target));
            const fmt = (n: number) => {
              const abs = Math.abs(n);
              if (isYearUnitInline) return String(Math.round(n));
              if (abs >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
              if (abs >= 10000) return (n / 1000).toFixed(0) + 'k';
              if (abs >= 1000) return n.toLocaleString(lang === 'en' ? 'en-US' : 'de-DE');
              return n % 1 === 0 ? String(n) : n.toFixed(1);
            };
            return (
              <div style={{
                width: '100%', maxWidth: 1400,
                // Oben/unten: weit-Row (180 + Avatar 41 + Chip 36 ≈ 250). Target sitzt jetzt ON-Rail.
                padding: '235px clamp(24px, 3cqw, 48px) 235px',
                marginBottom: 'clamp(8px, 1cqh, 16px)',
                position: 'relative',
                background: 'var(--qq-surface)',
                border: '1.5px solid var(--qq-hairline)',
                borderRadius: isThemed() ? 'var(--qq-card-radius)' : 24,
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                animation: 'contentReveal 0.5s var(--qq-ease-pop-fast) 0.3s both',
              }}>
                {/* Axis line — mittig im Container, genug Luft oben/unten für die Pins */}
                <div style={{
                  position: 'relative', height: 4,
                }}>
                  {/* Rail */}
                  <div style={{
                    position: 'absolute', left: 0, right: 0, top: '50%',
                    height: 4, borderRadius: 2,
                    background: 'linear-gradient(90deg, rgba(148,163,184,0.15), rgba(148,163,184,0.35), rgba(148,163,184,0.15))',
                    transform: 'translateY(-50%)',
                  }} />
                  {/* Axis endpoints labels */}
                  <div style={{
                    position: 'absolute', left: 0, top: 'calc(50% + 22px)',
                    fontSize: 'clamp(18px, 1.8cqw, 26px)', color: 'var(--qq-text-muted)', fontWeight: 900,
                  }}>{fmt(axMin)}</div>
                  <div style={{
                    position: 'absolute', right: 0, top: 'calc(50% + 22px)',
                    fontSize: 'clamp(18px, 1.8cqw, 26px)', color: 'var(--qq-text-muted)', fontWeight: 900,
                  }}>{fmt(axMax)}</div>

                  {/* Target marker — kompakte Pille direkt AUF der Rail.
                      Etwas kleiner, damit nahe Avatare nicht verdeckt werden. */}
                  <div style={{
                    position: 'absolute', left: `${targetPct}%`, top: '50%',
                    transform: 'translate(-50%, -50%)',
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 11px 4px 7px',
                    borderRadius: 'var(--qq-pill-radius)',
                    background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                    boxShadow: '0 0 14px rgba(34,197,94,0.55), 0 2px 8px rgba(0,0,0,0.38)',
                    border: '2px solid var(--qq-hairline)',
                    animation: 'pinRevealIn 0.55s var(--qq-ease-bounce) 0.5s both',
                    ['--pin-x' as any]: '0px',
                    ['--pin-y' as any]: '0px',
                    zIndex: 30,
                    whiteSpace: 'nowrap',
                  }}>
                    <span style={{
                      fontSize: 'clamp(16px, 1.7cqw, 22px)', lineHeight: 1,
                    }}><QQEmojiIcon emoji="🎯"/></span>
                    <span style={{
                      color: 'var(--qq-card-text)', fontWeight: 900,
                      fontSize: 'clamp(14px, 1.6cqw, 20px)', lineHeight: 1,
                      textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }}>{fmt(target)}</span>
                  </div>

                  {/* Team pins — Avatar und Wert-Chip liegen als stack klar ÜBER bzw.
                      UNTER der Rail. Bei "oben" (negative yOffset) kommt der Chip
                      über den Avatar, die Verbindungslinie zieht unterhalb des
                      Avatars Richtung Rail. Bei "unten" (positive yOffset) steht der
                      Avatar unter der Rail, der Chip darunter. Dadurch sind Avatare
                      eindeutig nicht mehr "auf der Linie". */}
                  {parsed.map((p) => {
                    const pct = pctOf(p.num);
                    const r = pinRows.get(p.teamId) ?? 0;
                    const xNudge = pinXNudge.get(p.teamId) ?? 0;
                    const isWinner = isWinnerTeam(p.teamId);
                    const orderIdx = sorted.findIndex(x => x.teamId === p.teamId);
                    const delay = 0.7 + orderIdx * 0.18;
                    const tColor = p.team!.color;
                    // r: 0 = oben nah, 1 = unten nah, 2 = oben weit, 3 = unten weit.
                    const isTop = r === 0 || r === 2;
                    // gap = Entfernung Rail ↔ Avatar-Mittelpunkt — kompakter, aber Avatare klar von der Rail getrennt.
                    // Nah: 110, Weit: 180 (zweite Reihe bei Kollision)
                    const gap = r === 0 || r === 1 ? 110 : 180;
                    const avatarSize = isWinner ? 86 : 72;
                    // Nudge/Animation-Deltas (Gewinner hüpft Richtung Ziel)
                    const nudgePctDelta = targetPct - pct;
                    const nudgeXPx = Math.max(-160, Math.min(160, nudgePctDelta * 12));
                    const nudgeDelay = delay + 0.8;
                    // Das äußere Wrapper-Div wird per translate auf Rail-Ebene
                    // bzw. Avatar-Ebene zentriert — isTop: nach oben, sonst nach
                    // unten. Wrapper ist ein Punkt; die Kinder werden relativ
                    // zum Avatar-Zentrum absolut positioniert.
                    const wrapperY = isTop ? -gap : gap;
                    return (
                      <div key={p.teamId} style={{
                        position: 'absolute', left: `${pct}%`, top: '50%',
                        width: 0, height: 0,
                        // CSS-Vars für pinRevealIn + winnerNudge — Wrapper-Position
                        // bleibt erhalten (nicht von animation overschrieben).
                        ['--pin-x' as any]: `${xNudge}px`,
                        ['--pin-y' as any]: `${wrapperY}px`,
                        ['--base-x' as any]: `${xNudge}px`,
                        ['--nudge-x' as any]: `${nudgeXPx}px`,
                        ['--nudge-y' as any]: `${wrapperY}px`,
                        transform: `translate(calc(-50% + ${xNudge}px), calc(-50% + ${wrapperY}px))`,
                        animation: isWinner
                          ? `pinRevealIn 0.55s var(--qq-ease-bounce) ${delay}s both, winnerNudge 1.4s var(--qq-ease-bounce) ${nudgeDelay}s 1 both`
                          : `pinRevealIn 0.55s var(--qq-ease-bounce) ${delay}s both`,
                        zIndex: isWinner ? 20 : 10,
                      }}>
                        {/* Verbindungslinie vom Avatar zur Rail (in Richtung Rail) */}
                        <div style={{
                          position: 'absolute', left: '50%',
                          top: isTop ? `${avatarSize / 2}px` : `${-gap}px`,
                          width: 2, height: gap - avatarSize / 2,
                          background: `${tColor}88`,
                          transform: 'translateX(-50%)',
                          zIndex: -1,
                        }} />
                        {/* Avatar pin (zentriert auf Wrapper-Punkt) */}
                        <QQTeamAvatar avatarId={p.team!.avatarId} teamEmoji={p.team!.emoji} size={isWinner ? 'clamp(72px, 7cqw, 96px)' : 'clamp(60px, 6cqw, 82px)'} style={{
                          position: 'absolute', left: '50%', top: 0,
                          transform: 'translate(-50%, -50%)',
                          border: isWinner ? '3px solid var(--qq-accent)' : 'none',
                          boxShadow: isWinner
                            ? `0 0 24px ${tColor}aa, 0 0 44px rgba(var(--qq-accent-rgb),0.5)`
                            : `0 4px 12px rgba(0,0,0,0.5)`,
                        }} />
                        {/* Value-Chip mit DYNAMISCHER Kollisionsvermeidung.
                            Der Chip wird relativ zum Avatar-Zentrum in eine der
                            4 Richtungen gelegt (oben/unten/rechts/links), je
                            nachdem wo Platz frei ist. Position kam aus
                            pinChipOffset (px-basierte Kollisionserkennung). */}
                        {(() => {
                          const off = pinChipOffset.get(p.teamId) ?? { dx: 0, dy: avatarSize / 2 + 10, side: 'below' as const };
                          const isChipTopOfAvatar = off.dy < 0;
                          // Connector-Linie vom Avatar zum Chip (Team-Farbe),
                          // damit Zuordnung klar bleibt wenn Chip seitlich sitzt.
                          const connectorH = off.side === 'above'
                            ? Math.abs(off.dy) - avatarSize / 2
                            : off.side === 'below'
                              ? off.dy - avatarSize / 2
                              : 0;
                          return (
                            <>
                              {/* Connector (nur oben/unten, seitlich nicht nötig da Chip direkt am Avatar) */}
                              {(off.side === 'above' || off.side === 'below') && connectorH > 2 && (
                                <div style={{
                                  position: 'absolute', left: '50%',
                                  top: isChipTopOfAvatar ? `${-(avatarSize / 2 + connectorH)}px` : `${avatarSize / 2}px`,
                                  width: 2, height: connectorH,
                                  background: `${tColor}99`,
                                  transform: 'translateX(-50%)',
                                  zIndex: 0,
                                }} />
                              )}
                              <div style={{
                                position: 'absolute',
                                left: off.side === 'right'
                                  ? `${off.dx}px`
                                  : off.side === 'left'
                                    ? `${off.dx}px`
                                    : '50%',
                                top: `${off.dy}px`,
                                transform: off.side === 'right' || off.side === 'left'
                                  ? 'translate(0, 0)'
                                  : 'translate(-50%, 0)',
                                // 2026-05-05 (Wolf 'low-bets zu klein, groesser'):
                                // Loser-Bet 24-34 → 30-44, Winner-Bet 32-46 → 38-56.
                                // Padding entsprechend hoch.
                                padding: isWinner ? '11px 26px' : '9px 22px',
                                borderRadius: isThemed() ? 'var(--qq-card-radius)' : 16,
                                background: 'var(--qq-overlay)',
                                border: `2px solid ${tColor}`,
                                color: 'var(--qq-card-text)', fontWeight: 900,
                                fontSize: isWinner ? 'clamp(38px, 4cqw, 56px)' : 'clamp(30px, 3.2cqw, 44px)',
                                whiteSpace: 'nowrap',
                                boxShadow: `0 4px 12px rgba(0,0,0,0.6)`,
                                zIndex: 1,
                              }}>
                                {fmt(p.num)}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Schätzchen: schlanker Gewinner-Chip unter dem Zeitstrahl (kein redundantes Riesen-Panel,
              Avatare/Werte sind am Strahl bereits sichtbar).
              Bei Distanz-Gleichstand entscheidet die Reaktionszeit — dann zeigt der Chip
              zusätzlich „und am schnellsten!". */}
          {revealed && q.category === 'SCHAETZCHEN' && s.answers.length > 0 && (() => {
            const ranked = s.answers
              .map(a => {
                const num = Number(a.text.replace(/[^0-9.,\-]/g, '').replace(',', '.'));
                const team = s.teams.find(t => t.id === a.teamId);
                const distance = Number.isNaN(num) || q.targetValue == null ? Infinity : Math.abs(num - q.targetValue);
                return { ...a, num, distance, team };
              })
              // Primär Distanz, sekundär Speed — so gewinnt bei gleichem Abstand der schnellste.
              .sort((a, b) => (a.distance - b.distance) || (a.submittedAt - b.submittedAt));
            const w = ranked[0];
            if (!w || w.distance === Infinity || !w.team) return null;
            const tColor = w.team.color;
            // Gleichstand auf der Distanz → Speed war der Tiebreaker.
            const distanceTied = ranked.filter(r => r.distance === w.distance).length > 1;
            return (
              <div style={{
                display: 'flex', justifyContent: 'center', width: '100%',
                animation: 'revealWinnerIn 0.55s var(--qq-ease-bounce) 0.9s both',
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 18,
                  padding: '14px 30px', borderRadius: 'var(--qq-pill-radius)',
                  background: `linear-gradient(135deg, ${tColor}2a, ${tColor}0a)`,
                  border: `2px solid ${tColor}55`,
                  boxShadow: `0 0 32px ${tColor}44`,
                }}>
                  <span style={{ fontSize: 'clamp(26px, 2.8cqw, 36px)', lineHeight: 1 }}><QQEmojiIcon emoji="🏆"/></span>
                  <QQTeamAvatar avatarId={w.team.avatarId} teamEmoji={w.team.emoji} size={'clamp(28px, 3cqw, 40px)'} style={{ flexShrink: 0 }} />
                  <span style={{
                    fontWeight: 900, fontSize: 'clamp(22px, 2.4cqw, 32px)', color: tColor, lineHeight: 1.1,
                  }}>{w.team.name}</span>
                  <span style={{
                    color: 'var(--qq-text-muted)', fontSize: 'clamp(19px, 2.1cqw, 28px)', fontWeight: 700, lineHeight: 1.1,
                  }}>
                    {distanceTied
                      ? (lang === 'en' ? 'was closest, and fastest! ⚡' : 'war am nächsten dran, und am schnellsten! ⚡')
                      : (lang === 'en' ? 'was closest!' : 'war am nächsten dran!')}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Correct team — winner banner (non-Schätzchen).
              2026-05-05 v2 (Wolf 'zvz cards rutschen runter beim low-bet-out
              und wieder hoch wenn winner-card kommt'): Slot-Hoehe wird jetzt
              SOFORT bei revealed=true reserviert (nicht erst wenn showUnified-
              Winner). Damit gibt es keinen Layout-Shift mehr zwischen
              Bet-Cascade-Step 1 (low-bets out) und Step 2 (winner-card pop) —
              der Slot ist die ganze Zeit da, nur der Inhalt fadet rein.
              MUCHO/CHEESE/HotPotato profitieren auch. */}
          {reservesWinnerSlot && (
            <div style={{
              // 2026-07-07: FESTE Hoehe (nicht minHeight) + immer gerendert →
              // reserviert den Platz in aktiver Frage UND Reveal identisch, damit
              // beim Erscheinen der Winner-Card nichts springt. Inhalt liegt
              // absolut drin, kann die Slot-Hoehe also nie ueber diesen Wert
              // hinaus wachsen. Transparent = kein Rand.
              position: 'relative',
              width: '100%', maxWidth: 1400,
              // HP: waehrend aktiver Frage 0 (nichts reservieren), erst bei Reveal
              // die volle Slot-Hoehe fuer die Ueberlebenden-/Sieger-Card.
              height: (isHotPotatoCat && !revealed) ? 0 : 'clamp(150px, 16cqh, 210px)',
              marginBottom: (isHotPotatoCat && !revealed) ? 0 : 12,
              pointerEvents: 'none',
            }}>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: (revealed && showUnifiedWinner) ? 1 : 0,
                transform: (revealed && showUnifiedWinner) ? 'scale(1)' : 'scale(0.96)',
                transformOrigin: 'center center',
                transition: 'opacity 0.7s var(--qq-ease-out-cubic), transform 0.7s var(--qq-ease-bounce)',
              }}>
              {revealed && showUnifiedWinner && (s.correctTeamId || (s.currentQuestionWinners?.length ?? 0) > 0 || isHotPotatoCat) && (() => {
            const isEn = lang === 'en';
            const bannerDelay = 0.7;
            const avatarDelay = 1.1;

            // ZEHN_VON_ZEHN: Tie-Info ermitteln, damit Text stimmt, wenn mehrere Teams
            // die gleiche Höchstpunktzahl auf die richtige Antwort gesetzt haben
            // (Reihenfolge per Schnelligkeit). Bei echtem Zeit-Gleichstand → alle als Co-Sieger.
            let allInTie: {
              maxPointsTied: boolean;  // mehrere Teams mit Höchstpunkten
              speedTied: string[];     // Team-IDs mit max Punkten UND schnellstem Submit
              winnerPts: number;
            } | null = null;
            if (cat === 'ZEHN_VON_ZEHN' && q.correctOptionIndex != null && q.options) {
              const correctIdx = q.correctOptionIndex;
              const onCorrect = zvzAnswers
                .map(a => {
                  const parts = a.text.split(',').map(n => parseInt(n.trim(), 10));
                  const pts = parts[correctIdx] ?? 0;
                  return { teamId: a.teamId, pts, submittedAt: a.submittedAt };
                })
                .filter(x => x.pts > 0);
              if (onCorrect.length > 0) {
                const maxPts = Math.max(...onCorrect.map(x => x.pts));
                const atMax = onCorrect.filter(x => x.pts === maxPts);
                const minT  = Math.min(...atMax.map(x => x.submittedAt));
                const atMaxAndFastest = atMax.filter(x => x.submittedAt === minT);
                allInTie = {
                  maxPointsTied: atMax.length > 1,
                  speedTied: atMaxAndFastest.map(x => x.teamId),
                  winnerPts: maxPts,
                };
              }
            }

            // ZvZ nutzt zvzTeams (in CozyArena = Fraktions-Synth-Teams, sonst
            // === s.teams) damit die speedTied-IDs (Fraktions-IDs) auflösbar sind.
            const coWinners = allInTie && allInTie.speedTied.length > 1
              ? (cat === 'ZEHN_VON_ZEHN' ? zvzTeams : s.teams).filter(t => allInTie!.speedTied.includes(t.id))
              : null;

            // Single-team Banner (Default-Fall)
            // 2026-05-05 (Wolf-Bug 'cheese keine gewinnercard'): Fallback auf
            // ersten Winner aus currentQuestionWinners — bei CHEESE ohne fastest
            // ist correctTeamId leer, aber wir haben trotzdem Sieger.
            const winnerIds = s.currentQuestionWinners ?? (s.correctTeamId ? [s.correctTeamId] : []);
            // CozyArena (ZvZ): Sieger = Fraktion mit dem höchsten summierten Einsatz
            // auf der korrekten Option (allInTie.speedTied[0]) — konsistent mit der
            // Krone auf den Karten. Sonst der Backend-Truth-Sieger (Sub-Team).
            const rawWinner = s.teams.find(t => t.id === s.correctTeamId)
                  ?? s.teams.find(t => t.id === winnerIds[0]);
            let team = (cat === 'ZEHN_VON_ZEHN' && isMegaTeams && allInTie?.speedTied.length)
              ? zvzTeams.find(t => t.id === allInTie!.speedTied[0])
              : rawWinner;
            // CozyArena (MUCHO/CHEESE/Bunte-Tüte): den Sub-Team-Sieger auf seine
            // FRAKTION mappen (Name/Wappen), sonst nennt der Sieger-Hero ein
            // einzelnes Sub-Team statt der Fraktion (Arena-Audit 2026-07-04).
            // Farbe = Slot-Farbe des Reps bleibt (konsistent zur Avatar-Kaskade).
            if (isMegaTeams && cat !== 'ZEHN_VON_ZEHN' && rawWinner) {
              team = { ...rawWinner, name: qqMegaFactionName(rawWinner.avatarId, lang), emoji: qqMegaFactionSlug(rawWinner.avatarId) ?? rawWinner.emoji };
            }
            if (!coWinners && !team) return null;

            const muchoSpeedWin = cat === 'MUCHO' && q.correctOptionIndex != null
              && s.answers.filter(a => a.text === String(q.correctOptionIndex)).length > 1;
            const allInTied = allInTie?.maxPointsTied ?? false;

            // CHEESE: Wenn mehrere Teams richtig geraten haben, ist „am schnellsten"
            // die entscheidende Info. 2026-05-02 (Audit): Backend-Truth statt
            // strict-Match - sonst zaehlte Schreibfehler-Akzeptanzen nicht.
            const cheeseCorrectCount = cat === 'CHEESE'
              ? (s.currentQuestionWinners ?? (s.correctTeamId ? [s.correctTeamId] : [])).length
              : 0;
            const cheeseSpeedWin = cat === 'CHEESE' && cheeseCorrectCount > 1;

            const winMsg = cat === 'CHEESE'
              ? (cheeseSpeedWin
                  ? (isEn ? 'recognized it fastest!' : 'hat es am schnellsten erkannt!')
                  : (isEn ? 'got it right!' : 'hat es erkannt!'))
              : cat === 'BUNTE_TUETE'
                ? (isEn ? 'wins the round!' : 'gewinnt die Runde!')
                : cat === 'ZEHN_VON_ZEHN'
                  ? (allInTied
                      ? (isEn ? 'had the most points, and was fastest!' : 'hatte die meisten Punkte, und war am schnellsten!')
                      : (isEn ? 'bet the most points on the correct answer!' : 'hat die meisten Punkte auf die richtige Antwort gesetzt!'))
                  : muchoSpeedWin
                    ? (isEn ? 'fastest & correct!' : 'am schnellsten & richtig!')
                    : (isEn ? 'correct!' : 'richtig!');

            // Hot Potato: bei pool-exhausted (>=2 Ueberlebende) haben alle
            // Ueberlebenden gewonnen und ein Feld bekommen. Zeige sie alle an,
            // sonst wirkt die Folie wie "Harald gewinnt allein".
            let hpCoWinners: typeof s.teams | null = null;
            if (cat === 'BUNTE_TUETE' && (q.bunteTuete as any)?.kind === 'hotPotato') {
              const eliminated = new Set((s.hotPotatoEliminated ?? []) as string[]);
              const alive = s.teams.filter(t => !eliminated.has(t.id));
              // 2026-07-08 (Audit B1): Ohne klaren Einzel-Sieger (correctTeamId) sind
              // ALLE Ueberlebenden Gewinner (pool-exhausted) → Ueberlebenden-Card.
              // Mit correctTeamId laeuft der normale Single-Winner-Banner.
              if (!s.correctTeamId && alive.length >= 1) hpCoWinners = alive;
            }
            if (hpCoWinners) {
              const survivorCount = hpCoWinners.length;
              const totalCount = s.teams.length;
              const everyoneSurvived = survivorCount === totalCount;
              const hpMsg = isEn
                ? (everyoneSurvived
                    ? 'all survived, each gets an action!'
                    : survivorCount === 1
                      ? 'survived, gets an action!'
                      : `${survivorCount} survived — each gets an action!`)
                : (everyoneSurvived
                    ? 'alle überlebt, jedes Team bekommt eine Aktion!'
                    : survivorCount === 1
                      ? 'überlebt, bekommt eine Aktion!'
                      : `${survivorCount} haben überlebt — jedes Team bekommt eine Aktion!`);
              return (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  // 2026-05-12 (Wolf 'gewinnercard ausserhalb slide'): Survivor-
                  // Card kompakter — gap/padding/Avatar/Font alle runter, dann
                  // passt sie auch wenn Answer-Grid voll ist.
                  gap: 'clamp(6px, 0.8cqh, 12px)',
                  padding: 'clamp(10px, 1.2cqh, 18px) clamp(18px, 2.4cqw, 36px)',
                  borderRadius: isThemed() ? 'var(--qq-card-radius)' : 20,
                  width: '100%', maxWidth: 1400,
                  background: 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,197,94,0.05))',
                  border: '2px solid rgba(34,197,94,0.55)',
                  boxShadow: '0 0 60px rgba(34,197,94,0.25), 0 8px 24px rgba(0,0,0,0.4)',
                  animation: `revealWinnerIn 0.65s var(--qq-ease-bounce) ${bannerDelay}s both`,
                }}>
                  {/* Zeile 1: Kartoffel + alle Team-Chips (wrappt bei vielen Teams) */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 'clamp(10px, 1.2cqw, 16px)', flexWrap: 'wrap',
                  }}>
                    <span style={{ fontSize: 'clamp(26px, 3.2cqw, 44px)', lineHeight: 1 }}><QQEmojiIcon emoji="🥔"/></span>
                    {hpCoWinners.map((tm, i) => (
                      <div key={tm.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={'clamp(40px, 4.4cqw, 62px)'} style={{
                          flexShrink: 0, boxShadow: `0 0 18px ${tm.color}55`,
                          animation: `celebShake 0.6s ease ${avatarDelay + i * 0.1}s both`,
                        }} />
                        <TeamNameLabel
                          name={tm.name}
                          maxLines={1}
                          shrinkAfter={16}
                          color={tm.color}
                          fontWeight={900}
                          fontSize="clamp(16px, 2cqw, 26px)"
                          style={{
                            textShadow: `0 0 24px ${tm.color}44`,
                            maxWidth: 200,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  {/* Zeile 2: Message — eigene Zeile, immer zentriert */}
                  <div style={{
                    color: QQ_COLORS.green300, fontSize: 'clamp(14px, 1.7cqw, 22px)', fontWeight: 900, lineHeight: 1.2,
                    textAlign: 'center',
                  }}>
                    {hpMsg}
                  </div>
                </div>
              );
            }

            // Echter Zeit-Gleichstand (gleiche max Punkte + gleiche ms) → mehrere Sieger
            if (coWinners && coWinners.length > 1) {
              const coMsg = isEn
                ? `all tied on points & speed${allInTie ? ` (+${allInTie.winnerPts})` : ''}!`
                : `gleich viele Punkte und gleich schnell${allInTie ? ` (+${allInTie.winnerPts})` : ''}!`;
              return (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22,
                  padding: '22px 38px', borderRadius: isThemed() ? 'var(--qq-card-radius)' : 24,
                  width: '100%', maxWidth: 1400, flexWrap: 'wrap',
                  background: 'linear-gradient(135deg, rgba(var(--qq-accent-rgb),0.15), rgba(var(--qq-accent-rgb),0.05))',
                  border: '2px solid rgba(var(--qq-accent-rgb),0.55)',
                  boxShadow: '0 0 60px rgba(var(--qq-accent-rgb),0.25), 0 8px 24px rgba(0,0,0,0.4)',
                  animation: `revealWinnerIn 0.65s var(--qq-ease-bounce) ${bannerDelay}s both`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {coWinners.map((tm, i) => (
                      <div key={tm.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={'clamp(64px, 7cqw, 96px)'} style={{
                          flexShrink: 0, boxShadow: `0 0 24px ${tm.color}55`,
                          animation: `celebShake 0.6s ease ${avatarDelay + i * 0.1}s both`,
                        }} />
                        <div style={{
                          fontWeight: 900, fontSize: 'clamp(26px, 3.4cqw, 48px)', color: tm.color, lineHeight: 1.1,
                          textShadow: `0 0 24px ${tm.color}44`,
                        }}>{tm.name}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{
                    color: 'var(--qq-accent)', fontSize: 'clamp(18px, 2.4cqw, 30px)', fontWeight: 900, lineHeight: 1.2,
                  }}>
                    {coMsg}
                  </div>
                </div>
              );
            }

            // Single-winner Banner — Team-Farben-Card (User-Feedback:
            // Gewinner-Card unten in Team-Farbe statt nur am Loesungsfeld oben).
            // 2026-05-10 (Wolf-Live-Test L8 'Mu-Cho untere Card abgeschnitten'):
            // Avatar 8vw→7cqw, font 5vw→4.2cqw, padding 2vh→1.6cqh, sub-margin
            // 6→4 — Banner ~15-20% kompakter damit Reveal bei Mu-Cho mit 4 Optionen
            // + Frage nicht den viewport-Bottom verlässt (overflow:hidden global).
            return (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 'clamp(16px, 2cqw, 30px)',
                padding: 'clamp(12px, 1.6cqh, 22px) clamp(20px, 2.6cqw, 36px)',
                width: '100%', maxWidth: 1400,
                borderRadius: isThemed() ? 'var(--qq-card-radius)' : 22,
                background: `linear-gradient(135deg, ${team!.color}26, ${team!.color}08)`,
                border: `3px solid ${team!.color}88`,
                boxShadow: `0 0 60px ${team!.color}33, 0 8px 24px rgba(0,0,0,0.4)`,
                animation: `revealWinnerIn 0.65s var(--qq-ease-bounce) ${bannerDelay}s both`,
              }}>
                <QQTeamAvatar avatarId={team!.avatarId} teamEmoji={team!.emoji} size={'clamp(56px, 7cqw, 92px)'} style={{
                  flexShrink: 0,
                  boxShadow: `0 0 24px ${team!.color}88`,
                  animation: `celebShake 0.6s ease ${avatarDelay}s both`,
                }} />
                <div style={{ minWidth: 0 }}>
                  <TeamNameLabel
                    name={team!.name}
                    maxLines={2}
                    shrinkAfter={18}
                    color={team!.color}
                    fontWeight={900}
                    fontSize="clamp(30px, 4.2cqw, 60px)"
                    style={{
                      textShadow: `0 0 24px ${team!.color}55`,
                      padding: '0 0.3em',
                    }}
                  />
                  <div style={{
                    color: 'var(--qq-text-muted)', fontSize: 'clamp(17px, 2.4cqw, 30px)', fontWeight: 900, marginTop: 4, lineHeight: 1.2,
                  }}>
                    {winMsg}
                  </div>
                </div>
              </div>
            );
          })()}
              {/* Nobody got it right — im selben reservierten Slot (absolut
                  zentriert), damit auch dieser Fall nicht springt.
                  2026-07-08 (Audit B1): NICHT fuer Hot Potato — dort gibt es immer
                  Ueberlebende, die Card oben zeigt sie. */}
              {revealed && !s.correctTeamId && (s.currentQuestionWinners?.length ?? 0) === 0 && !isHotPotatoCat && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
                  padding: '24px 44px', borderRadius: isThemed() ? 'var(--qq-card-radius)' : 24,
                  width: '100%', maxWidth: 1400,
                  background: 'rgba(239,68,68,0.08)',
                  border: '2px solid rgba(239,68,68,0.30)',
                  boxShadow: '0 0 40px rgba(239,68,68,0.15)',
                }}>
                  <span style={{ fontSize: 'clamp(48px, 6cqw, 80px)', lineHeight: 1 }}>
                    {s.answers.length === 0 ? '⏱' : <QQEmojiIcon emoji="❌"/>}
                  </span>
                  <div style={{
                    fontSize: 'clamp(24px, 3.5cqw, 48px)', fontWeight: 900,
                    color: s.answers.length === 0 ? QQ_COLORS.slate400 : '#f87171',
                  }}>
                    {s.answers.length === 0
                      ? (lang === 'en' ? 'No answers!' : 'Keine Antworten!')
                      : (lang === 'en' ? 'Nobody got it right!' : 'Keiner hatte Recht!')}
                  </div>
                </div>
              )}
              </div>
            </div>
          )}

          {/* Confetti overlay on correct answer (delayed to sync with winner) */}
          {revealed && s.correctTeamId && showUnifiedWinner && (
            <div style={{ animation: 'contentReveal 0.01s var(--qq-ease-pop-fast) 0.8s both' }}>
              <ConfettiOverlay eurovisionMode={s.theme?.eurovisionMode} />
            </div>
          )}

          {/* Nobody got it right banner — nur fuer Kategorien OHNE reservierten
              Slot (z.B. Schaetzchen); MUCHO/ZvZ/CHEESE/BunteTuete zeigen den
              Nobody-Fall oben im reservierten Slot (shift-frei). */}
          {revealed && !s.correctTeamId && !reservesWinnerSlot && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
              padding: '24px 44px', borderRadius: isThemed() ? 'var(--qq-card-radius)' : 24, marginBottom: 12,
              width: '100%', maxWidth: 1400,
              background: 'rgba(239,68,68,0.08)',
              border: '2px solid rgba(239,68,68,0.30)',
              boxShadow: '0 0 40px rgba(239,68,68,0.15)',
              animation: 'revealWinnerIn 0.5s var(--qq-ease-bounce) 0.5s both',
            }}>
              <span style={{ fontSize: 'clamp(48px, 6cqw, 80px)', lineHeight: 1 }}>
                {s.answers.length === 0 ? '⏱' : <QQEmojiIcon emoji="❌"/>}
              </span>
              <div style={{
                fontSize: 'clamp(24px, 3.5cqw, 48px)', fontWeight: 900,
                color: s.answers.length === 0 ? QQ_COLORS.slate400 : '#f87171',
              }}>
                {s.answers.length === 0
                  ? (lang === 'en' ? 'No answers!' : 'Keine Antworten!')
                  : (lang === 'en' ? 'Nobody got it right!' : 'Keiner hatte Recht!')}
              </div>
            </div>
          )}

          {/* Bottom: team answer progress — Hot Potato has its own indicator below */}
          {!revealed && s.teams.length > 0 && !(q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato' && !(s as any).largeGroupMode) && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              position: 'absolute', bottom: 16, left: 0, right: 0,
            }}>
              {/* Progress text — verschwindet wenn alle dran sind (Avatare mit ✓ zeigen's eh) */}
              {!s.allAnswered && (
                <div style={{
                  fontSize: 'clamp(14px, 1.5cqw, 20px)', fontWeight: 900,
                  color: 'var(--qq-text-muted)',
                }}>
                  {(s as any).nestedTeams
                    ? `${s.answers.length}/${s.teams.length} ${lang === 'en' ? 'submitted' : 'Abgaben'}`
                    : `${s.answers.length}/${s.teams.length} Teams`}
                </div>
              )}
              {/* Avatar row.
                  2026-05-12 (Wolf 'footer-avatare vereinheitlichen, Glow weg
                  damit sie sich nicht ueberlappen, etwas groesser'): von
                  68/76/84 auf 80/88/96 hochgezogen (Platz haben wir, footer
                  ist full-width). drop-shadow-Glow entfernt — der gruene Ring
                  via boxShadow zeigt 'submitted' eindeutig, der Glow erzeugte
                  Bleed der bei dicht stehenden Avataren ueberlappte. */}
              {(() => {
                // 2026-07-02 (Wolf Mega-Event): 24 Sub-Team-Avatare in einer Reihe =
                // zu lang + unübersichtlich. Genestet → nach avatarId zu 8 Eltern-
                // Avataren gruppieren, je mit x/n-Badge (wie viele Sub-Teams
                // abgegeben haben). Grüner Ring = alle dran. Normal-Modus unverändert.
                const nested = !!(s as any).nestedTeams;
                if (nested) {
                  const groups = new Map<string, { rep: typeof s.teams[number]; total: number; answered: number }>();
                  const order: string[] = [];
                  for (const tm of s.teams) {
                    let g = groups.get(tm.avatarId);
                    if (!g) { g = { rep: tm, total: 0, answered: 0 }; groups.set(tm.avatarId, g); order.push(tm.avatarId); }
                    g.total++;
                    if (s.answers.some(a => a.teamId === tm.id)) g.answered++;
                  }
                  const gc = order.length;
                  const av = gc > 6 ? 84 : gc > 4 ? 92 : 100;
                  const gap = gc > 6 ? 16 : 20;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap, maxWidth: '100%' }}>
                      {order.map(id => {
                        const g = groups.get(id)!;
                        const done = g.answered >= g.total;
                        const some = g.answered > 0;
                        return (
                          <div key={id} style={{
                            position: 'relative', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: some ? 1 : 0.42, filter: some ? 'none' : 'grayscale(0.5)',
                            transition: 'opacity 0.4s ease, filter 0.4s ease',
                          }}>
                            <div style={{
                              borderRadius: '50%',
                              boxShadow: done ? '0 0 0 3px #22C55E' : some ? '0 0 0 3px rgba(34,197,94,0.45)' : 'none',
                              transition: 'box-shadow 0.45s ease', display: 'inline-flex',
                            }}>
                              <QQTeamAvatar avatarId={g.rep.avatarId} teamEmoji={g.rep.emoji} size={av} />
                            </div>
                            <div style={{
                              position: 'absolute', bottom: -4, right: -4,
                              minWidth: 24, height: 24, padding: '0 6px', borderRadius: 999,
                              background: done ? '#22C55E' : 'rgba(10,8,20,0.92)',
                              border: '2px solid rgba(255,255,255,0.18)',
                              color: '#fff', fontSize: 13, fontWeight: 900,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                            }}>{g.answered}/{g.total}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                const tc = s.teams.length;
                const av = tc > 6 ? 80 : tc > 4 ? 88 : 96;
                const gap = tc > 6 ? 12 : tc > 4 ? 15 : 18;
                return (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap,
                    maxWidth: '100%',
                  }}>
                    {s.teams.map(tm => {
                      const answered = s.answers.some(a => a.teamId === tm.id);
                      return (
                        <div key={tm.id} style={{
                          position: 'relative',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'opacity 0.4s ease, filter 0.4s ease',
                          opacity: answered ? 1 : 0.4,
                          filter: answered ? 'none' : 'grayscale(0.5)',
                        }}>
                          <div style={{
                            borderRadius: '50%',
                            boxShadow: answered ? '0 0 0 3px #22C55E' : 'none',
                            transition: 'box-shadow 0.45s ease',
                            display: 'inline-flex',
                          }}>
                            <QQTeamAvatar avatarId={tm.avatarId} teamEmoji={tm.emoji} size={av} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── HOT POTATO: active team + turn timer + used answers ── */}
          {q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind === 'hotPotato' && !(s as any).largeGroupMode && (
            <HotPotatoBeamerView state={s} lang={lang} revealed={revealed} />
          )}
          </div>{/* /Inner-Content-Wrapper */}
        </div>
          );
        })()}

        {/* ── Image window panel (window-left / window-right — NOT CHEESE, which uses overlay) ── */}
        {isWindow && (
          <div style={{
            width: '35%', flexShrink: 0, position: 'relative', zIndex: 5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}>
            {/* Ambient blur glow behind image */}
            <img
              src={img.bgRemovedUrl || img.url}
              alt="" aria-hidden
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'contain',
                filter: 'blur(60px) saturate(1.8) brightness(0.5)',
                opacity: 0.5, pointerEvents: 'none',
                transform: 'scale(1.15)',
              }}
            />
            {/* Main image */}
            <img
              src={img.bgRemovedUrl || img.url}
              alt={isCheese ? (q.text || 'Question image') : 'Question image'}
              style={{
                position: 'relative', zIndex: 1,
                maxWidth: '100%', maxHeight: '80cqh',
                borderRadius: img.bgRemovedUrl ? 0 : 22,
                objectFit: 'contain',
                boxShadow: img.bgRemovedUrl
                  ? 'none'
                  : `0 12px 48px rgba(0,0,0,0.6), 0 0 32px ${glow}`,
                filter: img.bgRemovedUrl
                  ? `drop-shadow(0 16px 40px rgba(0,0,0,0.7))${imgFilter(img) ? ' ' + imgFilter(img) : ''}`
                  : imgFilter(img),
                animation: imgAnim(img.animation, img.layout, img.animDelay, img.animDuration),
                transform: `translate(${img.offsetX ?? 0}%, ${img.offsetY ?? 0}%) scale(${img.scale ?? 1}) rotate(${img.rotation ?? 0}deg)`,
                opacity: img.opacity ?? 1,
              }}
            />
            {/* Dark vignette frame to blend white-bg images into dark theme */}
            {!img.bgRemovedUrl && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
                borderRadius: isThemed() ? 'var(--qq-card-radius)' : 24,
                background: 'radial-gradient(ellipse at center, transparent 55%, rgba(13,10,6,0.7) 100%)',
              }} />
            )}
          </div>
        )}

        {/* No right panel — everything centered in main area */}
      </div>
    </div>
  );
}
