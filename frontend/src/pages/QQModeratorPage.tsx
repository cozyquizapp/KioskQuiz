import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useQQSocket } from '../hooks/useQQSocket';
import {
  QQQuestion, QQLanguage, QQ_CATEGORY_LABELS, QQ_CATEGORY_COLORS,
  QQStateUpdate, QQSoundConfig,
} from '../../../shared/quarterQuizTypes';
import { QQSoundPanel } from '../components/QQSoundPanel';
import { QQTeamAvatar } from '../components/QQTeamAvatar';
import { QQEmojiIcon } from '../components/QQIcon';
import { AVATAR_SETS } from '../avatarSets';
import { AvatarSetProvider } from '../avatarSetContext';
import { TeamNameLabel } from '../components/TeamNameLabel';
import './qqModeratorTheme.css';

const QQ_ROOM = 'default';

interface DraftSummary {
  id: string;
  title: string;
  date: string | null;
  updatedAt: number;
  questionCount: number;
  phases?: 3 | 4;
}

export default function QQModeratorPage() {
  const roomCode = QQ_ROOM;
  const [phases, setPhases] = useState<3 | 4>(4);
  const [joined, setJoined]     = useState(false);
  const [timerInput, setTimerInput] = useState(30);
  const [drafts, setDrafts]         = useState<DraftSummary[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string>('');
  const [showSoundPanel, setShowSoundPanel] = useState(false);
  const [localSoundConfig, setLocalSoundConfig] = useState<QQSoundConfig>({});
  const startingRef = useRef(false); // prevent double-fire on startGame

  // ── Autoplay-Mode (lokaler Test-Modus, kein Backend-State) ────────────────
  // User-Wunsch: zum Testen ohne Space-Pressen. Setting in localStorage,
  // Pause-Button im Banner, Auto-Advance pro Phase nach festen Wartezeiten.
  const [autoplayEnabled, setAutoplayEnabledState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('qqAutoplayMode') === '1';
  });
  const [autoplayPaused, setAutoplayPaused] = useState(false);
  const setAutoplayEnabled = (v: boolean) => {
    setAutoplayEnabledState(v);
    try { window.localStorage.setItem('qqAutoplayMode', v ? '1' : '0'); } catch {}
    if (!v) setAutoplayPaused(false);
  };

  // Disable Cozy gradient mesh on QQ pages
  useEffect(() => {
    document.body.classList.add('qq-active');
    return () => { document.body.classList.remove('qq-active'); };
  }, []);
  const { state, connected, emit, reconnect } = useQQSocket(roomCode);

  // Setup/Lobby-Zweiteilung: Wert kommt aus dem server-state (via useQQSocket).
  // Fallback bis der erste State-Update da ist: false (= Setup anzeigen).
  const setupDone = state?.setupDone ?? false;
  const setSetupDone = (v: boolean) => {
    emit('qq:setSetupDone', { roomCode, value: v });
  };

  // J1 Moderator-Toast-System: stack-basiert, zeigt Phase-Wechsel + Mark-Events.
  type Toast = { id: number; msg: string; emoji: string; accent: string };
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const pushToast = (msg: string, emoji: string, accent = '#3B82F6') => {
    const id = ++toastIdRef.current;
    setToasts(ts => [...ts, { id, msg, emoji, accent }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 3000);
  };

  // Phase-Wechsel als Toast quittieren (nur wenn Game laeuft).
  const prevModPhaseRef = useRef<string | null>(null);
  const prevModCorrectRef = useRef<string | null>(null);
  useEffect(() => {
    if (!state) return;
    const prev = prevModPhaseRef.current;
    prevModPhaseRef.current = state.phase;
    if (!prev || prev === state.phase) return;
    if (state.phase === 'QUESTION_ACTIVE')    pushToast('Frage laeuft — Teams antworten', '⏱', '#22C55E');
    else if (state.phase === 'QUESTION_REVEAL') pushToast('Antworten aufgedeckt', '🔍', '#F59E0B');
    else if (state.phase === 'PLACEMENT')      pushToast('Platzierungs-Phase', '📍', '#EF4444');
    else if (state.phase === 'PHASE_INTRO')    pushToast(`Runde ${state.gamePhaseIndex} startet`, '🎬', '#8B5CF6');
    else if (state.phase === 'COMEBACK_CHOICE') pushToast('Comeback-Chance!', '⚡', '#F59E0B');
    else if (state.phase === 'GAME_OVER')      pushToast('Spiel beendet', '🏆', '#FBBF24');
    else if (state.phase === 'TEAMS_REVEAL')   pushToast('Team-Vorstellung laeuft', '🎭', '#F97316');
  }, [state?.phase, state?.gamePhaseIndex]);

  // Winner-Mark als Toast quittieren.
  useEffect(() => {
    if (!state) return;
    const prev = prevModCorrectRef.current;
    prevModCorrectRef.current = state.correctTeamId;
    if (state.correctTeamId && state.correctTeamId !== prev) {
      const team = state.teams.find(t => t.id === state.correctTeamId);
      if (team) pushToast(`${team.name} markiert`, '✓', team.color);
    }
  }, [state?.correctTeamId]);

  // Auto-join (and re-join after reconnect)
  useEffect(() => {
    if (!connected) { setJoined(false); return; }
    if (joined) return;
    emit('qq:joinModerator', { roomCode }).then(ack => {
      if (ack.ok) setJoined(true);
    });
  }, [connected]);

  // Sync timer input from state
  useEffect(() => {
    if (state) setTimerInput(state.timerDurationSec);
  }, [state?.timerDurationSec]);

  // Sync sound config from server state (e.g. after game start loads draft config)
  const prevSoundConfigRef = useRef<QQSoundConfig | undefined>(undefined);
  useEffect(() => {
    if (state?.soundConfig && state.soundConfig !== prevSoundConfigRef.current) {
      prevSoundConfigRef.current = state.soundConfig;
      setLocalSoundConfig(state.soundConfig);
    }
  }, [state?.soundConfig]);

  // Phases-Default: 4 Runden. Wenn der gewählte Draft nur 15 Fragen hat
  // (3-Runden-Set), fallen wir auf 3 zurück — sonst wäre 4 nicht spielbar.
  // Bei 20q-Drafts bleibt 4 stehen; User kann manuell auf 3 klicken (truncate).
  useEffect(() => {
    if (!selectedDraftId) return;
    const d = drafts.find(x => x.id === selectedDraftId);
    if (!d) return;
    const draftMaxPhases = d.phases ?? (d.questionCount >= 20 ? 4 : d.questionCount >= 15 ? 3 : null);
    if (draftMaxPhases === 3 && phases === 4) setPhases(3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDraftId, drafts]);

  // Load available drafts once (Cozy60 + QQ Builder)
  useEffect(() => {
    fetch('/api/qq/drafts').then(r => r.json()).catch(() => []).then((qqDrafts: any[]) => {
      const qq: DraftSummary[] = Array.isArray(qqDrafts)
        ? qqDrafts.map((d: any) => {
            const qCount = d.questions?.length ?? 0;
            // Bug-Fix 2026-04-28: Vorher wurden alle Drafts ohne explizites
            // `phases` auf 3 gemappt → User wählte 4 Runden, useEffect-Auto-
            // Downgrade fiel sofort auf 3 zurück → Display zeigte 'Runde X/3'.
            // Jetzt: explizites phases respektieren, sonst aus Question-Count.
            const phases = d.phases === 3 ? 3 : d.phases === 4 ? 4 : (qCount >= 20 ? 4 : 3);
            return {
              id: `qq:${d.id}`,
              title: `🎯 ${d.title}`,
              date: null,
              updatedAt: d.updatedAt ?? 0,
              questionCount: qCount,
              phases: phases as 3 | 4,
            };
          })
        : [];
      const sorted = qq.sort((a, b) => b.updatedAt - a.updatedAt);
      setDrafts(sorted);
      setSelectedDraftId(prev => prev || sorted[0]?.id || '');
    });
  }, []);

  async function startGame() {
    if (startingRef.current) return;
    if (!selectedDraftId) { alert('Bitte einen Fragensatz auswählen'); return; }
    const teamCount = state?.teams.length ?? 0;
    if (teamCount === 0 && !window.confirm('Noch keine Teams verbunden — wirklich starten?')) return;
    // Preflight: prüfe ob Draft genug Fragen für die gewählte Rundenzahl hat.
    // Mehr Fragen als nötig (20q-Draft + 3 Runden) → wir kürzen client-seitig auf phases*5.
    const summary = drafts.find(d => d.id === selectedDraftId);
    const needed = phases * 5;
    if (summary && summary.questionCount < needed) {
      alert(
        `Das Set hat nur ${summary.questionCount} Fragen — für ${phases} Runden bräuchte es ${needed}.\n\n` +
        `Stelle die Runden auf ${Math.floor(summary.questionCount / 5)} oder wähle ein größeres Set.`
      );
      return;
    }
    startingRef.current = true;
    let questions: QQQuestion[];
    let theme: undefined | import('../../../shared/quarterQuizTypes').QQTheme;
    let slideTemplates: undefined | import('../../../shared/quarterQuizTypes').QQSlideTemplates;
    let soundConfig: undefined | import('../../../shared/quarterQuizTypes').QQSoundConfig;
    // QQ Builder draft — questions already in QQ format
    const qqId = selectedDraftId.startsWith('qq:') ? selectedDraftId.slice(3) : selectedDraftId;
    const res = await fetch(`/api/qq/drafts/${encodeURIComponent(qqId)}`);
    if (!res.ok) { alert('QQ-Draft nicht gefunden'); return; }
    const draft = await res.json();
    questions = draft.questions ?? [];
    theme = draft.theme;
    slideTemplates = draft.slideTemplates;
    soundConfig = draft.soundConfig;
    if (questions.length === 0) { alert('Draft hat keine Fragen'); return; }
    // Truncate auf die gewählte Rundenzahl: nur Fragen aus phaseIndex 1..phases.
    if (questions.length > needed) {
      questions = questions.filter(q => (q.phaseIndex ?? 1) <= phases).slice(0, needed);
      if (questions.length !== needed) {
        // Fallback: nimm einfach die ersten N (sollte nie greifen wenn phaseIndex sauber gepflegt ist)
        questions = (draft.questions ?? []).slice(0, needed);
      }
    }
    const qqDraftId = qqId;
    // 2026-05-02 Bug-Fix (Wolfs 'Summary zeigt Unbekannt'): drafts-Liste hat
    // IDs mit 'qq:' Prefix (Line 148), aber qqDraftId ist ohne Prefix → find
    // matched nie → draftTitle=undefined → Backend speichert 'Unbekannt'.
    // Fix: nutze selectedDraftId (mit Prefix) fuer find und strippe den
    // Builder-'🎯 '-Prefix vom title fuer saubere Anzeige.
    const rawTitle = drafts.find(d => d.id === selectedDraftId)?.title;
    const qqDraftTitle = rawTitle ? rawTitle.replace(/^🎯\s*/, '') : undefined;
    const ack = await emit('qq:startGame', { roomCode, questions, language: state?.language ?? 'both', phases, theme, draftId: qqDraftId, draftTitle: qqDraftTitle, slideTemplates, soundConfig });
    if (!ack.ok) {
      alert(`Fehler beim Starten: ${ack.error ?? 'Unbekannt'}`);
    }
    // Keep lock for 1.5s so Space doesn't immediately trigger activateQuestion
    setTimeout(() => { startingRef.current = false; }, 1500);
  }

  function applyTimer() {
    emit('qq:setTimer', { roomCode, durationSec: timerInput });
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  const emitRef = useRef(emit);
  emitRef.current = emit;
  const stateRef = useRef(state);
  stateRef.current = state;
  const startGameRef = useRef(startGame);
  startGameRef.current = startGame;
  const setupDoneRef = useRef(setupDone);
  setupDoneRef.current = setupDone;
  const setSetupDoneRef = useRef(setSetupDone);
  setSetupDoneRef.current = setSetupDone;
  const cheatsheetOpenRef = useRef(false);

  // ── Autoplay-Tick: Auto-Advance pro Phase (wirkt nur lokal, simuliert Space) ─
  useEffect(() => {
    if (!autoplayEnabled || autoplayPaused) return;
    const s = state;
    if (!s) return;
    // Game-Over → Autoplay aus, Loop nicht endlos.
    if (s.phase === 'GAME_OVER' || s.phase === 'THANKS' || s.phase === 'LOBBY') return;

    const q = s.currentQuestion;
    const isMapReveal = q?.category === 'BUNTE_TUETE' && (q as any)?.bunteTuete?.kind === 'map';
    const mapValidPinCount = s.answers?.filter((a: any) => {
      const parts = String(a.text ?? '').split(',');
      return Number.isFinite(Number(parts[0])) && Number.isFinite(Number(parts[1]));
    }).length ?? 0;
    const mapMaxStep = 1 + mapValidPinCount + 1;
    const mapRevealInProgress = isMapReveal && (s.mapRevealStep ?? 0) < mapMaxStep;

    const isMuchoReveal = q?.category === 'MUCHO' && s.phase === 'QUESTION_REVEAL';
    let muchoNonEmptyKey = 0;
    if (isMuchoReveal && q?.options) {
      for (let i = 0; i < q.options.length; i++) {
        if (s.answers?.some((a: any) => a.text === String(i))) muchoNonEmptyKey++;
      }
    }
    const muchoRevealInProgress = isMuchoReveal && (s.muchoRevealStep ?? 0) < muchoNonEmptyKey + 1;
    const isZvZReveal = q?.category === 'ZEHN_VON_ZEHN' && s.phase === 'QUESTION_REVEAL';
    const zvzRevealInProgress = isZvZReveal && (s.zvzRevealStep ?? 0) < 2;
    const isCheeseReveal = q?.category === 'CHEESE' && s.phase === 'QUESTION_REVEAL';
    const cheeseRevealInProgress = false; // Cheese zeigt Reveal sofort komplett

    // Delays bewusst konservativ — Animationen und Lesezeit muessen rein.
    // PhaseIntro: FINALE-Roll ~2.5s, Subtitle-Drop, Tree-Animation.
    // Schaetzchen-Reveal: Top5-Cascade bottom-up mit 1.6s pro Team (max 5 Teams).
    // Mucho/ZvZ/Cheese: 2-Akt-Reveal mit Doppelblink ~1.1s + Winner-Card nach 1.2s.
    // Teams-Reveal: Slam-Down pro Team ~1.5s.
    let delayMs = 0;
    let action: (() => void) | null = null;
    switch (s.phase) {
      case 'RULES': {
        const rIdx = s.rulesSlideIndex ?? 0;
        // Slide 2 (Tree-Showcase) braucht länger wegen Pan-Sweep durch alle
        // Phasen (4 Phasen × 2.8s = 11.2s + initialer Pause + Lese-Puffer).
        delayMs = rIdx === 2 ? 16500 : 8000;
        const totalSlides = 8;
        action = () => {
          if ((s.rulesSlideIndex ?? 0) >= totalSlides - 1) emit('qq:rulesFinish', { roomCode });
          else emit('qq:rulesNext', { roomCode });
        };
        break;
      }
      case 'TEAMS_REVEAL':
        delayMs = 11000; // 8 Teams × Slam-Down (~1.4s each) + Finale-Puls
        action = () => emit('qq:teamsRevealFinish', { roomCode });
        break;
      case 'PHASE_INTRO': {
        // PHASE_INTRO hat mehrere Substeps (introStep 0-3), qq:activateQuestion
        // advanced sie im Backend sukzessive bevor am Ende QUESTION_ACTIVE kommt:
        //   0 = Round-Announcement (FINALE-Roll / BAM)
        //   1 = Rule-Reminder (neue Mechaniken)
        //   2 = Category-Reveal (Kategorie-Card)
        //   3 = Category-Explanation (nur bei neuer Kategorie)
        // Delays pro Substep, weil verschiedene Inhalte verschieden lang sind.
        const isFinal = s.gamePhaseIndex === s.totalPhases;
        const step = s.introStep ?? 0;
        if (step === 0) delayMs = isFinal ? 9500 : 7500;
        else if (step === 1) delayMs = 5500; // Rule-Reminder
        else if (step === 2) delayMs = s.categoryIsNew ? 4500 : 5000;
        else delayMs = 6500; // Category-Explanation
        action = () => emit('qq:activateQuestion', { roomCode });
        break;
      }
      case 'QUESTION_ACTIVE': {
        // Nur wenn alle Teams geantwortet haben — sonst Timer abwarten.
        if (s.allAnswered) {
          delayMs = 2500; // kurzer „Timesup"-Puls abwarten
          action = () => emit('qq:revealAnswer', { roomCode });
        }
        // 2026-04-30 v3 (User-Bug 'autoplay haengt nach connect-4 timer'):
        // OnlyConnect/Bluff/HotPotato/Imposter setzen `allAnswered` nicht (eigene
        // Submit-Pipelines). Nach Timer-Ablauf muessten wir trotzdem revealen,
        // sonst haengt die Phase.
        // 2026-05-03 (Wolf-Bug 'Connect-4 Autoplay haengt wieder'): Custom-
        // Pipelines pruefte `s.timerEndsAt && Date.now() >= s.timerEndsAt`,
        // aber Backend setzt `timerEndsAt = null` sobald Timer abgelaufen ist
        // (siehe qqStartTimer onExpire). Bedingung wurde damit nie true. Wir
        // nutzen jetzt das `timerExpired`-Flag wie bei Standard-Mechaniken.
        else {
          const subKind = (q?.bunteTuete as { kind?: string } | undefined)?.kind;
          const isCustomPipeline = q?.category === 'BUNTE_TUETE' &&
            (subKind === 'onlyConnect' || subKind === 'bluff' ||
             subKind === 'hotPotato' || subKind === 'oneOfEight');
          const expired = (s as any).timerExpired === true;
          if (isCustomPipeline && expired) {
            // OnlyConnect: 25s-Hard-Floor respektieren. Wenn der Question-Timer
            // >=25s gedauert hat (Standard 30s+), ist der Floor automatisch passe.
            // Bei <25s warten wir auf Backend's AutoFinish-Tick.
            const isOnlyConnect = subKind === 'onlyConnect';
            const timerWasShortForOC = (s.timerDurationSec ?? 30) < 25;
            if (isOnlyConnect && timerWasShortForOC) {
              // Hard-Floor noch nicht garantiert erreicht — Backend AutoFinish wartet.
            } else {
              // Timer abgelaufen — kurze Karenz, dann reveal
              delayMs = 2500;
              action = () => emit('qq:revealAnswer', { roomCode });
            }
          }
          // 2026-05-02 v2 (Wolfs Bug 'Beamer-Autoplay haengt nach Timer-Ablauf'):
          // Bei Standard-Mechaniken nach Timer-Ablauf 3s Karenz, dann reveal.
          else if (!isCustomPipeline && expired) {
            delayMs = 3000;
            action = () => emit('qq:revealAnswer', { roomCode });
          }
        }
        break;
      }
      case 'QUESTION_REVEAL': {
        const cat = q?.category;
        const bt: { kind?: string } | undefined = q?.bunteTuete as any;
        // Schaetzchen hat keine Steps — ganze Bottom-Up-Cascade muss durchlaufen
        // (500ms Initial + bis zu 5 × 1600ms Team-Reveal + Winner-Schuettel + Lesen).
        if (cat === 'SCHAETZCHEN') {
          delayMs = 11500;
          action = () => emit('qq:startPlacement', { roomCode });
        }
        // Map (CozyGuessr): pro Pin eigene Fit-Bounds-Zoom-Anim (~1.2s), dann Lesen.
        else if (mapRevealInProgress) {
          delayMs = 4500;
          action = () => emit('qq:mapRevealStep', { roomCode });
        }
        // Mucho/ZvZ/Cheese: Step-basierte Reveals mit Doppelblink + Winner-Card-Delay.
        // Der letzte In-Progress-Step ist der Lock-Step (Lösung grün). Er braucht
        // mehr Zeit, weil Doppelblink 1.1s + Winner-Card nach 1.2s läuft.
        else if (muchoRevealInProgress) {
          const willBeLockStep = (s.muchoRevealStep ?? 0) === muchoNonEmptyKey;
          delayMs = willBeLockStep ? 5500 : 4000;
          action = () => emit('qq:muchoRevealStep', { roomCode });
        }
        else if (zvzRevealInProgress) {
          // Step 1 = Bet-Cascade (~2.5s), Step 2 = Lock mit Doppelblink + Winner-Card.
          const willBeLockStep = (s.zvzRevealStep ?? 0) === 1;
          delayMs = willBeLockStep ? 5500 : 4500;
          action = () => emit('qq:zvzRevealStep', { roomCode });
        }
        // Cheese hat keine Moderator-Steps mehr (zeigt alles sofort beim Reveal)
        // → der cheeseRevealInProgress-Branch ist deaktiviert.
        // Hot Potato Reveal zeigt Antwort-Chips + Winner-Banner.
        else if (cat === 'BUNTE_TUETE' && bt?.kind === 'hotPotato') {
          delayMs = 8500;
          action = () => emit('qq:startPlacement', { roomCode });
        }
        // Top5 (Bunte Tüte): Bottom-Up-Cascade 600ms Initial + 5 × 2400ms +
        // Winner-Card-Reveal (~1.5s) + Lesen → ~16s.
        else if (cat === 'BUNTE_TUETE' && bt?.kind === 'top5') {
          delayMs = 16000;
          action = () => emit('qq:startPlacement', { roomCode });
        }
        // Order (Bunte Tüte): Bottom-Up-Cascade 500ms Initial + bis 5 × 2000ms +
        // Winner-Reveal + Lesen → ~13s.
        else if (cat === 'BUNTE_TUETE' && bt?.kind === 'order') {
          delayMs = 13000;
          action = () => emit('qq:startPlacement', { roomCode });
        }
        // Bluff-Reveal: Voting-Ergebnisse + Bluff-Auflockerung + Winner-Card
        // brauchen laenger als generischer Reveal. 2026-05-02 Wolfs Bug: lief
        // zu schnell durch in Autoplay. Erhoeht von 7s auf 12s.
        else if (cat === 'BUNTE_TUETE' && bt?.kind === 'bluff') {
          delayMs = 12000;
          action = () => emit('qq:startPlacement', { roomCode });
        }
        // Finaler Uebergang zu Placement (Winner-Banner ~1s spaet + Confetti + Lesen).
        else {
          delayMs = 7000;
          action = () => emit('qq:startPlacement', { roomCode });
        }
        break;
      }
      case 'PLACEMENT':
        // Auto-next nur wenn KEIN Team mehr was setzen muss (Animationen fertig).
        if (!s.pendingFor) {
          delayMs = 3500; // Slam-Down + Placement-Flash abwarten
          action = () => emit('qq:nextQuestion', { roomCode });
        } else {
          // 2026-05-03 (Wolf-Bug 'Comeback haengt'): wenn pendingFor offline ist
          // UND wir in einer Comeback-Steal-Phase sind, auto-skip nach 8s. Greift
          // wenn das Comeback-Team Maria entweder ein Phone-Tab geschlossen hat
          // ODER nie connected war (Solo-Test). Connected-Teams bleiben unbetroffen
          // — die duerfen in Ruhe nachdenken.
          const pendingTeam = s.teams.find(t => t.id === s.pendingFor);
          const isComeback = s.pendingAction === 'COMEBACK' || s.comebackTeamId === s.pendingFor;
          if (pendingTeam && !pendingTeam.connected && isComeback) {
            delayMs = 8000;
            action = () => emit('qq:skipCurrentTeam', { roomCode });
          }
        }
        break;
      case 'COMEBACK_CHOICE': {
        // Wenn H/L-Mini-Game aktiv: Autoplay steuert Frage/Reveal/Naechste-Runde.
        const hl = s.comebackHL;
        if (hl && hl.phase === 'question') {
          // Reveal kommt wenn alle geantwortet haben — hier nur Fallback bei Timer-Out.
          const allAnswered = hl.teamIds.every(id => hl.answers[id] != null);
          if (allAnswered) {
            delayMs = 1500; // Kurzer Puffer, dann Reveal
            action = () => emit('qq:comebackHLStep', { roomCode });
          } else {
            // Timer laeuft noch → warten (Backend aufloesen nach Timeout auf Server-Seite
            // faellt aus, daher hier: nichts tun; Moderator kann manuell Space druecken).
          }
        } else if (hl && hl.phase === 'reveal') {
          delayMs = 5500; // Reveal-Animation + Lesen, dann naechste Runde/Steal
          action = () => emit('qq:comebackHLStep', { roomCode });
        } else {
          delayMs = 6000; // Step-Erklaerung lesen + Einblende-Animation
          action = () => emit('qq:comebackIntroStep', { roomCode });
        }
        break;
      }
      case 'PAUSED':
        // Bei Pause-Phase nichts tun (Moderator muss aktiv resumen).
        break;
      case 'CONNECTIONS_4X4': {
        // 4×4-Finale durchspielen: Sub-Phasen via state.connections.phase steuern.
        // - intro:     Lesepause für die Mechanik-Erklärung, dann Spielzeit starten
        // - active:    nichts tun (Timer läuft, Dummies spielen, Auto-End wenn alle done)
        // - reveal:    Lesepause für Gruppen-Avatare (worst→best Spannungs-Cascade),
        //              dann Placement starten. Dauer skaliert mit Team-Anzahl
        //              (1s pro Team + 4s Buffer für Gruppen-Cells).
        // - placement: nichts (Dummies platzieren, qqConnectionsAfterPlacement schaltet weiter)
        // - done:      kurz Pause, dann nextQuestion → transitioniert zu GAME_OVER
        const cp = s.connections?.phase;
        if (cp === 'intro') {
          delayMs = 8000;
          action = () => emit('qq:connectionsBegin', { roomCode });
        } else if (cp === 'reveal') {
          const teamCount = s.teams.length;
          delayMs = 4000 + teamCount * 1000; // 4s Base + 1s pro Team-Reveal
          action = () => emit('qq:connectionsToPlacement', { roomCode });
        } else if (cp === 'done') {
          // 2026-04-30 v3 round 6 (User-Bug 'grid wird zu früh ausgeblendet,
          // leerer screen mit finale-badge'): 4s → 9s, damit das End-Grid
          // mit allen Team-Placements lange genug sichtbar bleibt bevor
          // GAME_OVER kommt.
          delayMs = 9000;
          action = () => emit('qq:nextQuestion', { roomCode });
        }
        // active / placement: kein Auto-Klick, läuft selbst-getrieben
        break;
      }
    }
    if (!action) return;
    const handle = window.setTimeout(action, delayMs);
    return () => window.clearTimeout(handle);
  }, [
    autoplayEnabled, autoplayPaused, roomCode, emit,
    state?.phase, state?.rulesSlideIndex, state?.allAnswered,
    state?.introStep, state?.categoryIsNew,
    state?.comebackIntroStep,
    state?.connections?.phase,
    state?.muchoRevealStep, state?.zvzRevealStep, state?.cheeseRevealStep, state?.mapRevealStep,
    state?.pendingFor, state?.currentQuestion?.id, state?.answers?.length,
    (state as any)?.timerExpired, // 2026-05-02 v2: trigger Autoplay neu wenn Timer abläuft
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKey = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target?.tagName && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

    // ? / Shift+/ — Hotkey-Cheatsheet toggle (auch waehrend Pause/Start erlaubt)
    if (e.key === '?' || (e.shiftKey && e.code === 'Slash')) {
      e.preventDefault();
      setCheatsheetOpen(v => !v);
      return;
    }
    if (e.code === 'Escape') {
      // Escape schliesst zuerst das Cheatsheet, falls offen — normale Esc-Logik bleibt darunter
      if (cheatsheetOpenRef.current) { setCheatsheetOpen(false); return; }
    }

    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const s = stateRef.current;
    if (!s) return;
    if (startingRef.current && e.code !== 'KeyM') return; // blocked during game start

    // CozyGuessr (map) reveal helpers — progressiv im QUESTION_REVEAL
    const q = s.currentQuestion;
    const isMapReveal = q?.category === 'BUNTE_TUETE' && (q as any)?.bunteTuete?.kind === 'map';
    const mapValidPinCount = s.answers?.filter((a: any) => {
      const parts = String(a.text ?? '').split(',');
      const lat = Number(parts[0]); const lng = Number(parts[1]);
      return Number.isFinite(lat) && Number.isFinite(lng);
    }).length ?? 0;
    const mapMaxStep = 1 + mapValidPinCount + 1;
    const mapRevealDone = isMapReveal && (s.mapRevealStep ?? 0) >= mapMaxStep;
    const mapRevealInProgress = isMapReveal && !mapRevealDone;
    // MUCHO Akt-1-Reveal (moderator deckt Voter pro Option auf)
    const isMuchoReveal = q?.category === 'MUCHO';
    let muchoNonEmptyKey = 0;
    if (isMuchoReveal && q?.options) {
      for (let i = 0; i < q.options.length; i++) {
        if (s.answers?.some((a: any) => a.text === String(i))) muchoNonEmptyKey++;
      }
    }
    const muchoRevealInProgress = isMuchoReveal && (s.muchoRevealStep ?? 0) < muchoNonEmptyKey + 1;
    // ZEHN_VON_ZEHN Step-Reveal (0→1 Bet-Cascade, 1→2 Jäger+Winner)
    const isZvZReveal = q?.category === 'ZEHN_VON_ZEHN' && s.phase === 'QUESTION_REVEAL';
    const zvzRevealInProgress = isZvZReveal && (s.zvzRevealStep ?? 0) < 2;
    // CHEESE Step-Reveal (0→1 Lösung grün, 1→2 Avatare+Winner)
    const isCheeseReveal = q?.category === 'CHEESE' && s.phase === 'QUESTION_REVEAL';
    const cheeseRevealInProgress = false; // Cheese zeigt Reveal sofort komplett

    // Space — smart next step (mirrors CozyQuiz Space behavior)
    if (e.code === 'Space') {
      e.preventDefault();
      if (s.phase === 'RULES') {
        // 4 Folien: Ziel / So läuft's / Neue Fähigkeiten / Comeback
        // (entspricht buildRulesSlidesDe/En in QQBeamerPage.tsx)
        const totalSlides = 8;
        if ((s.rulesSlideIndex ?? 0) >= totalSlides - 1) {
          emitRef.current('qq:rulesFinish', { roomCode });
        } else {
          emitRef.current('qq:rulesNext', { roomCode });
        }
        return;
      }
      if (s.phase === 'PAUSED')           emitRef.current('qq:resume', { roomCode });
      else if (s.phase === 'LOBBY') {
        // Zweistufig: erst Setup abschließen → in Lobby-Ansicht; dort dann Quiz starten.
        if (!setupDoneRef.current) setSetupDoneRef.current(true);
        else startGameRef.current();
      }
      else if (s.phase === 'TEAMS_REVEAL') emitRef.current('qq:teamsRevealFinish', { roomCode });
      else if (s.phase === 'PHASE_INTRO') emitRef.current('qq:activateQuestion', { roomCode });
      else if (s.phase === 'QUESTION_ACTIVE')
        emitRef.current('qq:revealAnswer', { roomCode });
      // QUESTION_REVEAL: bei CozyGuessr/MUCHO progressiv aufdecken, sonst direkt zum Grid
      else if (s.phase === 'QUESTION_REVEAL') {
        if (mapRevealInProgress) emitRef.current('qq:mapRevealStep', { roomCode });
        else if (muchoRevealInProgress) emitRef.current('qq:muchoRevealStep', { roomCode });
        else if (zvzRevealInProgress) emitRef.current('qq:zvzRevealStep', { roomCode });
        else if (cheeseRevealInProgress) emitRef.current('qq:cheeseRevealStep', { roomCode });
        else emitRef.current('qq:startPlacement', { roomCode });
      }
      // COMEBACK_CHOICE: Erklärung Step 0→1→2 progressiv aufdecken
      else if (s.phase === 'COMEBACK_CHOICE') {
        // Phase-Flow:
        //   introStep 0/1 → Erklärung „Was ist Comeback" / „warum DIESES Team"
        //   introStep 2   → Mini-Game-Regeln („Higher/Lower 1-3 mal, pro Richtig klauen")
        //   Space danach startet H/L-Runde 1 (phase 'question')
        //   H/L phase 'question' → Space = Reveal
        //   H/L phase 'reveal'   → Space = nächste Runde ODER Steal-Phase
        const hl = s.comebackHL;
        if (hl && (hl.phase === 'question' || hl.phase === 'reveal')) {
          emitRef.current('qq:comebackHLStep', { roomCode });
        } else {
          emitRef.current('qq:comebackIntroStep', { roomCode });
        }
      }
      // PLACEMENT: grid shown, teams are placing — Space moves to next question (PHASE_INTRO)
      else if (s.phase === 'PLACEMENT' && !s.pendingFor)
        emitRef.current('qq:nextQuestion', { roomCode });
      // CONNECTIONS_4X4 (Großes Finale) — Space je nach Sub-Phase weiterschalten.
      else if (s.phase === 'CONNECTIONS_4X4') {
        const cp = s.connections?.phase;
        if (cp === 'intro')          emitRef.current('qq:connectionsBegin', { roomCode });
        else if (cp === 'active')    emitRef.current('qq:connectionsForceReveal', { roomCode });
        else if (cp === 'reveal')    emitRef.current('qq:connectionsToPlacement', { roomCode });
        else if (cp === 'placement' && !s.pendingFor) {
          // Alle Setzungen durch — kann nur passieren wenn Auto-Flow fertig
          // ist. Falls qqConnectionsAfterPlacement nicht greift: hart auf done.
          emitRef.current('qq:connectionsToPlacement', { roomCode });
        }
        else if (cp === 'done')      emitRef.current('qq:nextQuestion', { roomCode });
      }
      else if (s.phase === 'GAME_OVER')
        emitRef.current('qq:showThanks', { roomCode });
      return;
    }

    // R — Reveal answer (mirrors CozyQuiz R)
    if (e.code === 'KeyR') {
      e.preventDefault();
      if (s.phase === 'QUESTION_ACTIVE') emitRef.current('qq:revealAnswer', { roomCode });
      return;
    }

    // N — Next question (only from PLACEMENT, not QUESTION_REVEAL)
    if (e.code === 'KeyN') {
      e.preventDefault();
      if (s.phase === 'PLACEMENT' && !s.pendingFor)
        emitRef.current('qq:nextQuestion', { roomCode });
      return;
    }

    // ArrowRight — Next question (extra StreamDeck option)
    if (e.code === 'ArrowRight') {
      e.preventDefault();
      if (s.phase === 'PLACEMENT' && !s.pendingFor)
        emitRef.current('qq:nextQuestion', { roomCode });
      return;
    }

    // Escape / Backspace — Niemand korrekt (mirrors CozyQuiz step-back feel)
    if (e.code === 'Escape' || e.code === 'Backspace') {
      if (s.phase === 'QUESTION_REVEAL' && !s.correctTeamId)
        emitRef.current('qq:markWrong', { roomCode });
      return;
    }

    // Number keys 1–5 → mark team correct (same as CozyQuiz)
    if (['Digit1','Digit2','Digit3','Digit4','Digit5'].includes(e.code)) {
      if (s.phase === 'QUESTION_REVEAL' && !s.correctTeamId) {
        const idx = parseInt(e.code.replace('Digit', '')) - 1;
        const team = s.teams[idx];
        if (team) emitRef.current('qq:markCorrect', { roomCode, teamId: team.id });
      }
      return;
    }

    // F13 — Nächste Aktion (= Space)
    if (e.code === 'F13') {
      e.preventDefault();
      if (s.phase === 'RULES') {
        const totalSlides = 8;
        if ((s.rulesSlideIndex ?? 0) >= totalSlides - 1) emitRef.current('qq:rulesFinish', { roomCode });
        else emitRef.current('qq:rulesNext', { roomCode });
        return;
      }
      if (s.phase === 'LOBBY') {
        if (!setupDoneRef.current) setSetupDoneRef.current(true);
        else startGameRef.current();
      }
      else if (s.phase === 'TEAMS_REVEAL') emitRef.current('qq:teamsRevealFinish', { roomCode });
      else if (s.phase === 'PHASE_INTRO') emitRef.current('qq:activateQuestion', { roomCode });
      else if (s.phase === 'QUESTION_ACTIVE')
        emitRef.current('qq:revealAnswer', { roomCode });
      else if (s.phase === 'QUESTION_REVEAL') {
        if (mapRevealInProgress) emitRef.current('qq:mapRevealStep', { roomCode });
        else if (muchoRevealInProgress) emitRef.current('qq:muchoRevealStep', { roomCode });
        else if (zvzRevealInProgress) emitRef.current('qq:zvzRevealStep', { roomCode });
        else if (cheeseRevealInProgress) emitRef.current('qq:cheeseRevealStep', { roomCode });
        else emitRef.current('qq:startPlacement', { roomCode });
      }
      else if (s.phase === 'COMEBACK_CHOICE') {
        // Phase-Flow:
        //   introStep 0/1 → Erklärung „Was ist Comeback" / „warum DIESES Team"
        //   introStep 2   → Mini-Game-Regeln („Higher/Lower 1-3 mal, pro Richtig klauen")
        //   Space danach startet H/L-Runde 1 (phase 'question')
        //   H/L phase 'question' → Space = Reveal
        //   H/L phase 'reveal'   → Space = nächste Runde ODER Steal-Phase
        const hl = s.comebackHL;
        if (hl && (hl.phase === 'question' || hl.phase === 'reveal')) {
          emitRef.current('qq:comebackHLStep', { roomCode });
        } else {
          emitRef.current('qq:comebackIntroStep', { roomCode });
        }
      }
      else if (s.phase === 'PLACEMENT' && !s.pendingFor)
        emitRef.current('qq:nextQuestion', { roomCode });
      else if (s.phase === 'GAME_OVER')
        emitRef.current('qq:showThanks', { roomCode });
      return;
    }

    // F14 — Team 1 korrekt (schnellster Buzz-Winner bestätigen)
    if (e.code === 'F14') {
      e.preventDefault();
      if (s.phase === 'QUESTION_REVEAL' && !s.correctTeamId && s.teams[0])
        emitRef.current('qq:markCorrect', { roomCode, teamId: s.teams[0].id });
      return;
    }

    // F15 — Antwort aufdecken (= R)
    if (e.code === 'F15') {
      e.preventDefault();
      if (s.phase === 'QUESTION_ACTIVE') emitRef.current('qq:revealAnswer', { roomCode });
      return;
    }

    // F16 — Niemand korrekt (= Esc)
    if (e.code === 'F16') {
      e.preventDefault();
      if (s.phase === 'QUESTION_REVEAL' && !s.correctTeamId)
        emitRef.current('qq:markWrong', { roomCode });
      return;
    }

    // F17 — Nächste Frage (= N) — only from PLACEMENT
    if (e.code === 'F17') {
      e.preventDefault();
      if (s.phase === 'PLACEMENT' && !s.pendingFor)
        emitRef.current('qq:nextQuestion', { roomCode });
      return;
    }

    // M — Toggle mute all (music + sfx)
    if (e.code === 'KeyM') {
      e.preventDefault();
      emitRef.current('qq:setMuted', { roomCode, muted: !(stateRef.current?.globalMuted ?? false) });
      return;
    }

    // P — Toggle pause
    if (e.code === 'KeyP') {
      e.preventDefault();
      if (s.phase === 'PAUSED') emitRef.current('qq:resume', { roomCode });
      else if (!['LOBBY', 'GAME_OVER', 'THANKS', 'RULES', 'TEAMS_REVEAL'].includes(s.phase))
        emitRef.current('qq:pause', { roomCode });
      return;
    }

    // F — Flyover (cinematic orbit on 3D beamer grid)
    if (e.code === 'KeyF') {
      e.preventDefault();
      emitRef.current('qq:flyover', { roomCode });
      return;
    }

    // V — 2D/3D Toggle auf dem Beamer
    if (e.code === 'KeyV') {
      e.preventDefault();
      emitRef.current('qq:toggleView', { roomCode });
      return;
    }

    // F18 — Reset (Notfall)
    // F20 — reserviert
  }, [roomCode]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const s = state;
  const teamList = s?.teams ?? [];
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  useEffect(() => { cheatsheetOpenRef.current = cheatsheetOpen; }, [cheatsheetOpen]);
  // Auto-collapse settings when game starts
  const prevPhaseRef = useRef(s?.phase);
  useEffect(() => {
    if (prevPhaseRef.current === 'LOBBY' && s?.phase && s.phase !== 'LOBBY') {
      setSettingsOpen(false);
    }
    prevPhaseRef.current = s?.phase;
  }, [s?.phase]);

  // Derive status text for the big banner
  function getStatusText(s: QQStateUpdate): { text: string; color: string; sub?: string } {
    const answeredCount = s.answers.length;
    const connectedTeams = s.teams.filter(t => t.connected).length;
    switch (s.phase) {
      case 'LOBBY': return { text: 'LOBBY', color: '#475569', sub: `${s.teams.length} Teams` };
      case 'RULES': {
        const r = s.rulesSlideIndex ?? 0;
        const sub = r === -2 ? 'Willkommen' : r === -1 ? 'Regel-Intro' : `Slide ${r + 1}`;
        return { text: 'REGELN', color: '#6366f1', sub };
      }
      case 'TEAMS_REVEAL': return { text: 'TEAM-REVEAL', color: '#F97316', sub: 'Epische Vorstellung läuft' };
      case 'PHASE_INTRO': return { text: `RUNDE ${s.gamePhaseIndex}`, color: '#3B82F6', sub: s.categoryIsNew ? 'Kategorie-Erklärung' : `Intro Step ${s.introStep}` };
      case 'QUESTION_ACTIVE': return { text: 'WARTET AUF ANTWORTEN', color: '#22C55E', sub: `${answeredCount}/${connectedTeams} Teams` };
      case 'QUESTION_REVEAL': return { text: s.correctTeamId ? 'ANTWORT AUFGEDECKT' : 'ANTWORT — KEIN GEWINNER', color: '#F59E0B', sub: s.correctTeamId ? `✓ ${teamList.find(t => t.id === s.correctTeamId)?.name}` : undefined };
      case 'PLACEMENT': return { text: s.pendingFor ? 'FELD SETZEN' : 'PLATZIERUNG FERTIG', color: '#EF4444', sub: s.pendingFor ? `${teamList.find(t => t.id === s.pendingFor)?.name} setzt` : undefined };
      case 'COMEBACK_CHOICE': return { text: 'COMEBACK', color: '#8B5CF6' };
      case 'CONNECTIONS_4X4': return { text: '🔗 4×4 — FINALE', color: '#FBBF24', sub: s.connections?.phase ?? '' };
      case 'PAUSED': return { text: '⏸ PAUSE', color: '#F59E0B' };
      case 'GAME_OVER': return { text: '🏆 SPIEL BEENDET', color: '#64748b' };
      case 'THANKS': return { text: '🙏 DANKE-FOLIE', color: '#F59E0B', sub: 'QR-Code für Summary' };
      default: return { text: s.phase, color: '#475569' };
    }
  }

  return (
    <AvatarSetProvider value={s?.avatarSetId} emojis={s?.avatarSetEmojis}>
    <div className="qq-mod-shell" style={page}>
      {/* ── Header ── */}
      <div style={header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => {
              const hasGame = s && s.phase !== 'LOBBY';
              if (hasGame && !window.confirm('Zurück zum Hauptmenü? Laufendes Spiel wird nicht gespeichert.')) return;
              window.location.href = '/menu';
            }}
            className="qm-ghost"
            title="Zurück zum Hauptmenü"
          >⌂ Menü</button>
          {/* Zurück zum Setup — nur sichtbar wenn Setup abgeschlossen aber
              noch in Lobby (vor Spielstart). Konsistent mit Menü-Button. */}
          {joined && s && s.phase === 'LOBBY' && s.setupDone && (
            <button
              onClick={() => setSetupDone(false)}
              className="qm-ghost"
              title="Zurück zum Setup (Fragenset, Runden, Timer)"
            >⚙ Setup</button>
          )}
          <span style={badgeStyle('#3B82F6')}>CozyQuiz</span>
          <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--qm-text)' }}>Moderator</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Autoplay Pause/Resume — sichtbar nur wenn aktiv und im Spiel */}
          {autoplayEnabled && joined && state && state.phase !== 'LOBBY' && state.phase !== 'GAME_OVER' && state.phase !== 'THANKS' && (
            <button
              onClick={() => setAutoplayPaused(v => !v)}
              title={autoplayPaused ? 'Autoplay fortsetzen' : 'Autoplay pausieren'}
              style={{
                padding: '6px 14px', borderRadius: 8,
                border: `1px solid ${autoplayPaused ? 'rgba(251,191,36,0.5)' : 'rgba(34,197,94,0.5)'}`,
                background: autoplayPaused ? 'rgba(251,191,36,0.18)' : 'rgba(34,197,94,0.14)',
                color: autoplayPaused ? '#FDE68A' : '#86efac', cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 900, fontSize: 13, lineHeight: 1,
                boxShadow: 'var(--qm-depth-sm)',
              }}
            >{autoplayPaused ? '▶ Autoplay' : '⏸ Autoplay'}</button>
          )}
          <button
            onClick={() => setCheatsheetOpen(v => !v)}
            title="Hotkey-Cheatsheet (?)"
            className="qm-ghost"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <span className="qm-kbd qm-kbd-sm">?</span>
            Hotkeys
          </button>
          <span className={connected ? 'qm-conn-online' : 'qm-conn-offline'} style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="qm-dot" />
            {connected ? 'Verbunden' : 'Getrennt'}
          </span>
        </div>
      </div>

      {cheatsheetOpen && (
        <HotkeyCheatsheet onClose={() => setCheatsheetOpen(false)} />
      )}

      {/* J1 Toast-Stack: unten rechts, stacken wenn mehrere. */}
      <div aria-live="polite" style={{
        position: 'fixed', bottom: 18, right: 18, zIndex: 10000,
        display: 'flex', flexDirection: 'column-reverse', gap: 8,
        pointerEvents: 'none',
      }}>
        {toasts.map(toast => (
          <div key={toast.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', borderRadius: 16,
            background: 'linear-gradient(180deg, rgba(26,19,12,0.96), rgba(15,12,9,0.96))',
            border: `1.5px solid ${toast.accent}`,
            boxShadow: `0 8px 22px rgba(0,0,0,0.55), 0 0 22px ${toast.accent}55`,
            fontFamily: 'inherit', fontSize: 13, fontWeight: 900,
            color: '#f1e8d8',
            animation: 'modToastSlide 3s ease-in-out both',
            maxWidth: 320,
            pointerEvents: 'none',
          }}>
            <span style={{ fontSize: 18 }}><QQEmojiIcon emoji={toast.emoji}/></span>
            <span>{toast.msg}</span>
          </div>
        ))}
      </div>

      {/* J2 Idle-Hint: wenn Moderator >15s auf einer Phase sitzt, sanfter
          Space-drueck-Reminder am unteren Rand. Space/Return dismissed ihn. */}
      {joined && state && <IdleHint state={state} />}

      {!joined && connected && (
        <div style={card}><div style={{ color: '#64748b', fontSize: 14 }}>Verbinde als Moderator…</div></div>
      )}

      {!connected && (
        <div className="qm-disconnect-banner">
          <div style={{ fontSize: 16, fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span className="qm-dot" style={{ color: 'var(--qm-tone-place)' }} />
            Verbindung zum Server weg
          </div>
          <div style={{ color: 'var(--qm-text-muted)', fontWeight: 500 }}>
            Versuche automatisch neu zu verbinden… Dein Spielstand läuft serverseitig weiter.
          </div>
          <button
            onClick={() => reconnect()}
            style={{
              padding: '10px 20px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(180deg, #3b82f6, #2563eb)', color: '#fff', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 900, fontSize: 14,
              boxShadow: '0 4px 0 #1e40af, 0 0 18px rgba(59,130,246,0.35)',
            }}
          >Jetzt neu verbinden</button>
        </div>
      )}

      {/* Autoplay-Toggle — IMMER sichtbar in LOBBY (Setup + Lobby-Subphase),
          damit der Test-Mode schon vor dem Setup-Abschluss aktivierbar ist. */}
      {joined && s && s.phase === 'LOBBY' && (
        <div
          className="qm-autoplay-banner"
          data-on={autoplayEnabled ? 'true' : 'false'}
        >
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
            <input
              type="checkbox"
              checked={autoplayEnabled}
              onChange={e => setAutoplayEnabled(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <span>🤖 Autoplay-Modus (Test ohne Space)</span>
          </label>
          {autoplayEnabled && (
            <span style={{ fontSize: 11, color: 'var(--qm-text-muted)', fontWeight: 700 }}>
              · läuft Phasen automatisch durch · Pause-Button erscheint im Banner während des Spiels
            </span>
          )}
        </div>
      )}

      {joined && s && s.phase === 'LOBBY' && !setupDone && (
        <SetupView
          s={s}
          drafts={drafts}
          selectedDraftId={selectedDraftId}
          setSelectedDraftId={setSelectedDraftId}
          phases={phases}
          setPhases={setPhases}
          timerInput={timerInput}
          setTimerInput={setTimerInput}
          applyTimer={applyTimer}
          localSoundConfig={localSoundConfig}
          setLocalSoundConfig={setLocalSoundConfig}
          roomCode={roomCode}
          emit={emit}
          finishSetup={() => setSetupDone(true)}
        />
      )}

      {joined && s && s.phase === 'LOBBY' && setupDone && (
        <>
          <LobbyView
            s={s}
            drafts={drafts}
            selectedDraftId={selectedDraftId}
            phases={phases}
            timerInput={timerInput}
            roomCode={roomCode}
            emit={emit}
            startGame={startGame}
            backToSetup={() => setSetupDone(false)}
          />
        </>
      )}

      {joined && s && s.phase !== 'LOBBY' && (
        <>
          {/* ══ BIG STATUS BANNER ══ */}
          {(() => {
            const status = getStatusText(s);
            const answeredCount = s.answers.length;
            const connectedTeams = s.teams.filter(t => t.connected).length;
            const showProgress = s.phase === 'QUESTION_ACTIVE' && connectedTeams > 0;
            return (
              <div className="qm-hero" style={{ ['--qm-hero-color' as any]: status.color }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div className="qm-hero-title">{status.text}</div>
                  {status.sub && <span className="qm-hero-sub">{status.sub}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Answer progress bar */}
                  {showProgress && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 120, height: 10, borderRadius: 5,
                        background: 'rgba(0,0,0,0.35)',
                        border: '1px solid var(--qm-border)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${(answeredCount / connectedTeams) * 100}%`,
                          height: '100%', borderRadius: 4,
                          background: answeredCount >= connectedTeams
                            ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                            : 'linear-gradient(90deg, #d97706, #f59e0b)',
                          boxShadow: answeredCount >= connectedTeams
                            ? '0 0 10px rgba(34,197,94,0.55)'
                            : '0 0 10px rgba(245,158,11,0.45)',
                          transition: 'width 0.3s, background 0.3s',
                        }} />
                      </div>
                      <span style={{
                        fontSize: 13, fontWeight: 900,
                        color: answeredCount >= connectedTeams ? 'var(--qm-tone-active)' : 'var(--qm-tone-reveal)',
                      }}>
                        {answeredCount}/{connectedTeams}
                      </span>
                    </div>
                  )}
                  <Pill label={`Runde ${s.gamePhaseIndex}/${s.totalPhases}`} color="#3B82F6" />
                  <Pill label={`Frage ${(s.questionIndex % 5) + 1}/5`} color="#6366f1" />
                  {s.timerEndsAt && <TimerPill endsAt={s.timerEndsAt} />}
                </div>
              </div>
            );
          })()}

          {/* ══ HOST NOTES — suggested talking points per phase ══ */}
          <HostNotes state={s} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 14 }}>

          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* ══ SHOW CONTROLS — primary actions ══ */}
            <div style={{
              ...card,
              border: '1px solid rgba(255,255,255,0.12)',
              padding: '12px 16px',
            }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>

                {/* ── RULES ── */}
                {s.phase === 'RULES' && (
                  <RulesControls
                    state={s}
                    roomCode={roomCode}
                    emit={emit}
                    onStartGame={startGame}
                  />
                )}

                {/* ── TEAMS REVEAL ── */}
                {s.phase === 'TEAMS_REVEAL' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                      🎬 Epische Team-Vorstellung läuft auf dem Beamer…
                    </div>
                    <PrimaryBtn color="#22C55E" onClick={() => emit('qq:teamsRevealFinish', { roomCode })} hotkey="Space">
                      ▶ Los geht's (Phase 1)
                    </PrimaryBtn>
                  </div>
                )}

                {/* ── PHASE INTRO ── */}
                {s.phase === 'PHASE_INTRO' && (() => {
                  const isFirstOfRound = (s.questionIndex % 5) === 0;
                  const catRevealStep = isFirstOfRound ? 2 : 0;
                  let label = '▶ Frage aktivieren';
                  if (isFirstOfRound && s.introStep === 0) label = '📋 Regeln zeigen';
                  else if (isFirstOfRound && s.introStep === 1) label = '🎯 Kategorie zeigen';
                  else if (s.introStep === catRevealStep && s.categoryIsNew) label = '💡 Kategorie erklären';
                  else if (s.categoryIsNew) label = '▶ Frage aktivieren';
                  return (
                    <PrimaryBtn color="#22C55E" onClick={() => { if (startingRef.current) return; emit('qq:activateQuestion', { roomCode }); }} hotkey="Space">
                      {label}
                    </PrimaryBtn>
                  );
                })()}

                {/* ── QUESTION ACTIVE ── */}
                {s.phase === 'QUESTION_ACTIVE' && (
                  <PrimaryBtn color="#F59E0B" onClick={() => emit('qq:revealAnswer', { roomCode })} hotkey="R">
                    👁 Antwort aufdecken
                  </PrimaryBtn>
                )}

                {/* Imposter (oneOfEight) controls */}
                {s.phase === 'QUESTION_ACTIVE' && s.currentQuestion?.bunteTuete?.kind === 'oneOfEight' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {!s.imposterActiveTeamId ? (
                      <Btn color="#8B5CF6" onClick={() => emit('qq:imposterStart', { roomCode })}>
                        <QQEmojiIcon emoji="🕵️"/> Imposter starten
                      </Btn>
                    ) : (
                      <>
                        <div style={{ fontSize: 13, color: '#fff', background: s.teams.find(t => t.id === s.imposterActiveTeamId)?.color ?? '#666', padding: '4px 10px', borderRadius: 8, textAlign: 'center' }}>
                          <QQEmojiIcon emoji="🕵️"/> {s.teams.find(t => t.id === s.imposterActiveTeamId)?.name ?? '?'} wählt
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          {((s.currentQuestion?.bunteTuete as any)?.statements?.length ?? 8) - s.imposterChosenIndices.length} Aussagen übrig
                          {s.imposterEliminated.length > 0 && (
                            <> · Raus: {s.imposterEliminated.map(id => s.teams.find(t => t.id === id)?.name).filter(Boolean).join(', ')}</>
                          )}
                        </div>
                        {/* Moderator force-eliminate: liste noch aktiver Teams mit ✕ */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                          {s.teams.filter(t => !s.imposterEliminated.includes(t.id)).map(t => (
                            <button
                              key={t.id}
                              onClick={() => {
                                if (confirm(`${t.name} aus Imposter-Runde ausschließen?`)) {
                                  emit('qq:imposterEliminateTeam', { roomCode, teamId: t.id });
                                }
                              }}
                              title={`${t.name} raus`}
                              style={{
                                padding: '2px 8px', borderRadius: 999, cursor: 'pointer',
                                border: `1px solid ${t.color}55`, background: 'transparent',
                                color: t.color, fontSize: 10, fontWeight: 900, fontFamily: 'inherit',
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                              }}>
                              {t.name} ✕
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Hot Potato controls (Bunte Tüte) */}
                {s.phase === 'QUESTION_ACTIVE' && s.currentQuestion?.bunteTuete?.kind === 'hotPotato' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {!s.hotPotatoActiveTeamId ? (
                      <Btn color="#EF4444" onClick={() => emit('qq:hotPotatoStart', { roomCode })}>
                        🎁 Hot Potato starten
                      </Btn>
                    ) : (
                      <>
                        <div style={{ fontSize: 13, color: '#fff', background: s.teams.find(t => t.id === s.hotPotatoActiveTeamId)?.color ?? '#666', padding: '4px 10px', borderRadius: 8, textAlign: 'center' }}>
                          <QQEmojiIcon emoji="🥔"/> {s.teams.find(t => t.id === s.hotPotatoActiveTeamId)?.name ?? '?'}
                        </div>
                        {s.hotPotatoLastAnswer ? (
                          <>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9', padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', textAlign: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
                              „{s.hotPotatoLastAnswer}"
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <Btn color="#22C55E" onClick={() => emit('qq:hotPotatoCorrect', { roomCode })}>
                                ✓ Richtig
                              </Btn>
                              <Btn color="#EF4444" onClick={() => emit('qq:hotPotatoWrong', { roomCode })}>
                                ✗ Falsch
                              </Btn>
                            </div>
                          </>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <Btn color="#EF4444" onClick={() => emit('qq:hotPotatoWrong', { roomCode })}>
                              ✗ Falsch / Zu langsam
                            </Btn>
                          </div>
                        )}
                        {s.hotPotatoEliminated.length > 0 && (
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>
                            Raus: {s.hotPotatoEliminated.map(id => s.teams.find(t => t.id === id)?.name).filter(Boolean).join(', ')}
                          </div>
                        )}
                        {s.hotPotatoUsedAnswers && s.hotPotatoUsedAnswers.length > 0 && (
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>
                            Genannt: {s.hotPotatoUsedAnswers.join(', ')}
                          </div>
                        )}
                        {/* Moderator force-eliminate */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                          {s.teams.filter(t => !s.hotPotatoEliminated.includes(t.id)).map(t => (
                            <button
                              key={t.id}
                              onClick={() => {
                                if (confirm(`${t.name} aus Hot-Potato-Runde ausschließen?`)) {
                                  emit('qq:hotPotatoEliminateTeam', { roomCode, teamId: t.id });
                                }
                              }}
                              title={`${t.name} raus`}
                              style={{
                                padding: '2px 8px', borderRadius: 999, cursor: 'pointer',
                                border: `1px solid ${t.color}55`, background: 'transparent',
                                color: t.color, fontSize: 10, fontWeight: 900, fontFamily: 'inherit',
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                              }}>
                              {t.name} ✕
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 4 gewinnt / Only Connect controls — Per-Team-Modell */}
                {s.phase === 'QUESTION_ACTIVE' && s.currentQuestion?.bunteTuete?.kind === 'onlyConnect' && (() => {
                  const hintIndices = s.onlyConnectHintIndices ?? {};
                  const allTeams = s.teams;
                  const correctCount = (s.onlyConnectGuesses ?? []).filter(g => g.correct).length;
                  const lockedSet = new Set(s.onlyConnectLockedTeams ?? []);
                  const wonSet = new Set((s.onlyConnectGuesses ?? []).filter(g => g.correct).map(g => g.teamId));
                  const indicesArr = allTeams.map(t => hintIndices[t.id] ?? 0);
                  const minIdx = indicesArr.length > 0 ? Math.min(...indicesArr) : 0;
                  const maxIdx = indicesArr.length > 0 ? Math.max(...indicesArr) : 0;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 13, color: '#fff', background: '#A78BFA',
                        padding: '4px 10px', borderRadius: 8, textAlign: 'center', fontWeight: 900,
                      }}>
                        🧩 Hinweise (Beamer) {Math.max(1, minIdx + 1)} / 4
                        {minIdx !== maxIdx && <> · max {maxIdx + 1}</>}
                        {correctCount > 0 && <> · 🏆 {correctCount}× richtig</>}
                      </div>
                      {/* Per-Team Hint-Status */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {allTeams.map(t => {
                          const idx = hintIndices[t.id] ?? 0;
                          const won = wonSet.has(t.id);
                          const locked = lockedSet.has(t.id);
                          return (
                            <div key={t.id} title={`${t.name}: Hinweis ${idx + 1}/4`} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '2px 8px', borderRadius: 999,
                              border: `1px solid ${t.color}55`,
                              background: won ? 'rgba(34,197,94,0.15)' : locked ? 'rgba(239,68,68,0.10)' : 'transparent',
                              color: t.color, fontSize: 10, fontWeight: 900,
                            }}>
                              {t.name} · {idx + 1}/4
                              {won && ' ✓'}
                              {locked && ' ✕'}
                            </div>
                          );
                        })}
                      </div>
                      <Btn color="#F59E0B" outline onClick={() => emit('qq:onlyConnectRevealAll', { roomCode })}>
                        ⏹ Alle Hinweise zeigen (Reveal)
                      </Btn>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        Teams schalten Hinweise selbst auf /team frei. Beamer zeigt MIN-Index.
                      </div>
                    </div>
                  );
                })()}

                {/* Bluff controls */}
                {s.phase === 'QUESTION_ACTIVE' && s.currentQuestion?.bunteTuete?.kind === 'bluff' && (() => {
                  const bp = s.bluffPhase;
                  const totalActive = s.teams.filter(t => t.connected).length;
                  const submitCount = Object.keys(s.bluffSubmissions ?? {}).filter(id => s.bluffSubmissions[id]?.trim()).length;
                  const voteCount = Object.keys(s.bluffVotes ?? {}).length;
                  const submissions = Object.entries(s.bluffSubmissions ?? {}).filter(([, t]) => t?.trim());
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{
                        fontSize: 13, color: '#fff', background: '#F472B6',
                        padding: '4px 10px', borderRadius: 8, textAlign: 'center', fontWeight: 900,
                      }}>
                        🎭 Bluff · {bp ?? '—'}
                        {bp === 'write' && ` · ${submitCount}/${totalActive} eingereicht`}
                        {bp === 'vote' && ` · ${voteCount}/${totalActive} gevotet`}
                      </div>
                      {bp === 'write' && (
                        <PrimaryBtn color="#F472B6" onClick={() => emit('qq:bluffForceAdvanceWrite', { roomCode })} hotkey="Space">
                          ⏹ Schreib-Phase beenden →
                        </PrimaryBtn>
                      )}
                      {bp === 'review' && (
                        <>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>
                            👮 Bluffs prüfen — ✕ klicken um zu zensieren
                          </div>
                          {submissions.map(([teamId, text]) => {
                            const tm = s.teams.find(t => t.id === teamId);
                            const rejected = (s.bluffRejected ?? []).includes(teamId);
                            return (
                              <div key={teamId} style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '6px 10px', borderRadius: 8,
                                background: rejected ? 'rgba(239,68,68,0.10)' : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${rejected ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                opacity: rejected ? 0.55 : 1,
                              }}>
                                <span style={{ fontSize: 11, fontWeight: 900, color: tm?.color ?? '#94a3b8', minWidth: 56 }}>
                                  {tm?.name ?? teamId}
                                </span>
                                <span style={{
                                  flex: 1, fontSize: 12, color: rejected ? '#FCA5A5' : '#e2e8f0',
                                  textDecoration: rejected ? 'line-through' : undefined,
                                  wordBreak: 'break-word',
                                }}>{text}</span>
                                <button onClick={() => emit('qq:bluffReject', { roomCode, teamId, rejected: !rejected })}
                                  style={{
                                    padding: '2px 8px', borderRadius: 6, cursor: 'pointer',
                                    border: '1px solid rgba(239,68,68,0.4)', background: rejected ? 'rgba(239,68,68,0.18)' : 'transparent',
                                    color: rejected ? '#fff' : '#FCA5A5', fontSize: 11, fontWeight: 900, fontFamily: 'inherit',
                                  }}>
                                  {rejected ? '↺' : '✕'}
                                </button>
                              </div>
                            );
                          })}
                          <PrimaryBtn color="#22C55E" onClick={() => emit('qq:bluffFinishReview', { roomCode })} hotkey="Space">
                            ▶ Voting starten
                          </PrimaryBtn>
                        </>
                      )}
                      {bp === 'vote' && (
                        <PrimaryBtn color="#F472B6" onClick={() => emit('qq:bluffForceAdvanceVote', { roomCode })} hotkey="Space">
                          ⏹ Voting beenden →
                        </PrimaryBtn>
                      )}
                      {bp === 'reveal' && (
                        <div style={{ fontSize: 12, color: '#86EFAC' }}>✓ Reveal läuft — Space → nächste Frage</div>
                      )}
                    </div>
                  );
                })()}

                {/* ── QUESTION REVEAL ── */}
                {s.phase === 'QUESTION_REVEAL' && (() => {
                  const qRev = s.currentQuestion;
                  const isMap = qRev?.category === 'BUNTE_TUETE' && (qRev as any)?.bunteTuete?.kind === 'map';
                  const validPins = s.answers?.filter((a: any) => {
                    const [lat, lng] = String(a.text ?? '').split(',').map(Number);
                    return Number.isFinite(lat) && Number.isFinite(lng);
                  }).length ?? 0;
                  const maxStep = 1 + validPins + 1;
                  const step = s.mapRevealStep ?? 0;
                  const inProgress = isMap && step < maxStep;
                  // ── MUCHO: moderator-gesteuerter Akt-1-Voter-Reveal ──
                  const isMucho = qRev?.category === 'MUCHO';
                  let muchoNonEmpty = 0;
                  if (isMucho && qRev?.options) {
                    for (let i = 0; i < qRev.options.length; i++) {
                      if (s.answers?.some(a => a.text === String(i))) muchoNonEmpty++;
                    }
                  }
                  const muchoLockStep = muchoNonEmpty + 1;
                  const muchoStep = s.muchoRevealStep ?? 0;
                  const muchoInProgress = isMucho && muchoStep < muchoLockStep;
                  if (muchoInProgress) {
                    const isLockNext = muchoStep === muchoNonEmpty;
                    const label = isLockNext
                      ? '✅ Lösung aufdecken'
                      : muchoStep === 0
                        ? '👥 Teams pro Antwort zeigen'
                        : `👉 Nächste Antwort (${muchoStep + 1}/${muchoNonEmpty})`;
                    const helper = isLockNext
                      ? 'Doppelblink auf richtige Option (~1.1 s)'
                      : muchoNonEmpty === 0
                        ? 'Keine Teams haben geantwortet'
                        : `Voter-Gruppe ${muchoStep}/${muchoNonEmpty} gezeigt`;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <PrimaryBtn color="#3B82F6" onClick={() => emit('qq:muchoRevealStep', { roomCode })} hotkey="Space">
                          {label}
                        </PrimaryBtn>
                        <span style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>{helper}</span>
                      </div>
                    );
                  }
                  // ── ZEHN_VON_ZEHN: Bet-Cascade + Jäger ──
                  const isZvZ = qRev?.category === 'ZEHN_VON_ZEHN';
                  const zvzStep = s.zvzRevealStep ?? 0;
                  const zvzInProgress = isZvZ && zvzStep < 2;
                  if (zvzInProgress) {
                    const label = zvzStep === 0 ? '💰 Höchste Bets zeigen' : '✅ Lösung aufdecken';
                    const helper = zvzStep === 0
                      ? 'Zeigt die Top-Bets pro Option kaskadiert'
                      : 'Doppelblink auf richtige Option (~1.1 s)';
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <PrimaryBtn color="#3B82F6" onClick={() => emit('qq:zvzRevealStep', { roomCode })} hotkey="Space">
                          {label}
                        </PrimaryBtn>
                        <span style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>{helper}</span>
                      </div>
                    );
                  }
                  // CHEESE: Reveal zeigt Loesung + Avatare sofort komplett
                  // (cheeseShowGreen/cheeseShowAvatars sind in der BeamerView
                  // hardcoded auf true). Frueher gab's hier Step-Buttons fuer
                  // 'Loesung gruen' + 'Antworten einblenden' — beide haben aber
                  // visuell auf dem Beamer nichts ausgeloest, also entfernt.
                  // Moderator gibt direkt Space → naechste Frage / Platzierung.
                  if (inProgress) {
                    // Auto-Phase = Pins werden automatisch alle ~2.4s eingeblendet.
                    // Läuft zwischen step 1 (Target) und 1+validPins (alle Pins drauf).
                    const isAutoPhase = step >= 1 && step < 1 + validPins;
                    const label = step === 0
                      ? '🎯 Target zeigen'
                      : step < 1 + validPins
                        ? `⏩ Auto: Pin ${step}/${validPins} …`
                        : '🏆 Ranking zeigen';
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <PrimaryBtn
                          color={isAutoPhase ? '#64748b' : '#F59E0B'}
                          onClick={() => emit('qq:mapRevealStep', { roomCode })}
                          hotkey="Space"
                        >
                          {label}
                        </PrimaryBtn>
                        {isAutoPhase && (
                          <span style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
                            Klicken überspringt den nächsten Pin
                          </span>
                        )}
                      </div>
                    );
                  }
                  if (s.correctTeamId) {
                    const winnerTeam = s.teams.find(t => t.id === s.correctTeamId);
                    const otherTeams = s.teams.filter(t => t.id !== s.correctTeamId);
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <PrimaryBtn color="#22C55E" onClick={() => emit('qq:startPlacement', { roomCode })} hotkey="Space">
                            <QQEmojiIcon emoji="📍"/> Felder setzen
                          </PrimaryBtn>
                          <Btn small color="#475569" onClick={() => {
                            if (confirm(`Gewinner ${winnerTeam?.name ?? 'Team'} zurücknehmen?`)) {
                              emit('qq:undoMarkCorrect', { roomCode });
                            }
                          }}>
                            ↩ Rückgängig
                          </Btn>
                        </div>
                        {otherTeams.length > 0 && (() => {
                          const winnerSet = new Set(s.currentQuestionWinners ?? []);
                          // Bereits Mit-Gewinner = in Snapshot, aber nicht der primaere
                          const coWinners = otherTeams.filter(t => winnerSet.has(t.id));
                          const nonWinners = otherTeams.filter(t => !winnerSet.has(t.id));
                          // 2026-05-03 (App-Designer-Audit M2): Mit-Gewinner / Sieger-
                          // tausch in zwei klar getrennte Tint-Cards mit groesseren
                          // Buttons (36px hoch, Avatar-Icon, klare visuelle Trennung
                          // blau vs gruen).
                          // 2026-05-03 v2 (Wolf-Wunsch, Streamdeck-Setup): hinter Toggle
                          // einklappen ausser wenn Mit-Gewinner schon aktiv sind. Mod
                          // muss nicht standardmaessig durch die Sektion scrollen.
                          return (
                            <ModWinnerActionsToggle
                              forceOpen={coWinners.length > 0}
                              nonWinners={nonWinners}
                              coWinners={coWinners}
                              roomCode={roomCode}
                              emit={emit}
                            />
                          );
                        })()}
                      </div>
                    );
                  }
                  return (
                    <>
                      <span style={{ fontSize: 12, color: '#475569' }}>Kein Gewinner</span>
                      <Btn color="#64748b" onClick={() => emit('qq:startPlacement', { roomCode })}>
                        → Überspringen
                      </Btn>
                    </>
                  );
                })()}

                {/* ── PLACEMENT ── */}
                {s.phase === 'PLACEMENT' && s.pendingAction && (
                  <PlacementControls state={s} roomCode={roomCode} emit={emit} />
                )}
                {s.phase === 'PLACEMENT' && !s.pendingFor && (() => {
                  // Was kommt nach diesem qq:nextQuestion? Gleiche Logik wie im Backend.
                  const nextIdx = s.questionIndex + 1;
                  const QPP = 5;
                  const isEndOfPhase = nextIdx >= s.gamePhaseIndex * QPP;
                  const isLastPhase = isEndOfPhase && s.gamePhaseIndex >= s.totalPhases;
                  const goesToConnections = isLastPhase && s.connectionsEnabled !== false;
                  const isBeforeFinal = isEndOfPhase && (s.gamePhaseIndex + 1) === s.totalPhases;
                  const label = goesToConnections
                    ? '🔗 4×4 Finale starten'
                    : isLastPhase
                      ? '🏆 Spielende'
                      : isBeforeFinal
                        ? '⚡ Comeback-Phase'
                        : isEndOfPhase
                          ? `→ Runde ${s.gamePhaseIndex + 1}`
                          : '→ Nächste Frage';
                  return (
                    <PrimaryBtn color={goesToConnections ? '#FBBF24' : '#22C55E'} onClick={() => emit('qq:nextQuestion', { roomCode })} hotkey="Space">
                      {label}
                    </PrimaryBtn>
                  );
                })()}

                {/* ── COMEBACK ── */}
                {s.phase === 'COMEBACK_CHOICE' && (
                  <ComebackControls state={s} roomCode={roomCode} emit={emit} />
                )}

                {/* ── 4×4 CONNECTIONS ── */}
                {s.phase === 'CONNECTIONS_4X4' && (
                  <ConnectionsControls state={s} roomCode={roomCode} emit={emit} />
                )}

                {/* ── GAME OVER ── */}
                {s.phase === 'GAME_OVER' && (() => {
                  const tieCands = s.tieBreakerCandidates ?? [];
                  const tieResolved = !!s.tieBreakerWinnerId;
                  const tieActive = tieCands.length >= 2 && !tieResolved;
                  return (
                    <>
                      <div style={{ fontSize: 15, color: '#94a3b8', fontWeight: 900 }}><QQEmojiIcon emoji="🏆"/> Spiel beendet</div>
                      {tieActive && (
                        <div style={{
                          display: 'flex', flexDirection: 'column', gap: 6,
                          padding: '8px 12px', borderRadius: 8,
                          border: '1.5px solid #F59E0B88',
                          background: 'rgba(245,158,11,0.10)',
                        }}>
                          <div style={{ fontSize: 12, fontWeight: 900, color: '#FBBF24', letterSpacing: '0.04em' }}>
                            ⚠ STECHFRAGE — gleicher Endstand bei {tieCands.length} Teams
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, lineHeight: 1.35 }}>
                            Stell den Teams eine Schaetz-/Stichfrage. Sieger anklicken — er rueckt im Ranking auf Platz 1.
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {tieCands.map(id => {
                              const t = s.teams.find(x => x.id === id);
                              if (!t) return null;
                              return (
                                <button
                                  key={id}
                                  onClick={() => emit('qq:resolveTieBreaker', { roomCode, teamId: id })}
                                  style={{
                                    padding: '6px 14px', borderRadius: 8,
                                    border: `2px solid ${t.color}`,
                                    background: `${t.color}22`, color: t.color,
                                    fontFamily: 'inherit', fontWeight: 900, fontSize: 13,
                                    cursor: 'pointer',
                                  }}
                                  title={`${t.name} als Stechfrage-Sieger setzen`}
                                >
                                  🥇 {t.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {tieResolved && (
                        <div style={{
                          fontSize: 12, fontWeight: 900, color: '#FBBF24',
                          padding: '4px 10px', borderRadius: 8,
                          background: 'rgba(251,191,36,0.10)',
                        }}>
                          ✓ Stechfrage aufgeloest — {s.teams.find(t => t.id === s.tieBreakerWinnerId)?.name}
                        </div>
                      )}
                      <PrimaryBtn color="#F59E0B" onClick={() => emit('qq:showThanks', { roomCode })} hotkey="Space">
                        ▶ Danke-Folie & QR
                      </PrimaryBtn>
                      {/* 2026-05-02 (Event-Manager-Audit): Endstand exportieren.
                          Pub-Wirt will die Wochen-Tafel updaten — heute musste
                          er den Beamer abfotografieren. */}
                      <Btn small color="#94A3B8" onClick={() => downloadEndstandCSV(s, roomCode)}>
                        📄 Endstand CSV
                      </Btn>
                    </>
                  );
                })()}

                {/* ── THANKS ── */}
                {s.phase === 'THANKS' && (
                  <div style={{ fontSize: 15, color: '#94a3b8', fontWeight: 900 }}>🙏 Danke-Folie läuft</div>
                )}

                {/* ── PAUSED ── */}
                {s.phase === 'PAUSED' && (
                  <PrimaryBtn color="#22C55E" onClick={() => emit('qq:resume', { roomCode })} hotkey="Space">
                    ▶ Weiter
                  </PrimaryBtn>
                )}

                {/* ── Separator ── */}
                <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

                {/* ── Secondary: Pause ── */}
                {!['LOBBY', 'PAUSED', 'GAME_OVER', 'THANKS', 'RULES', 'TEAMS_REVEAL'].includes(s.phase) && (
                  <Btn color="#F59E0B" outline onClick={() => emit('qq:pause', { roomCode })}>
                    ⏸ Pause <span style={{ fontSize: 10, opacity: 0.6 }}>P</span>
                  </Btn>
                )}

                {/* ── Danger-Menu (Reset-Aktionen, weggedrückt) ── */}
                <DangerMenu
                  onRestart={() => {
                    if (!window.confirm('Quiz neu starten? Punkte & Grid werden zurückgesetzt, Teams bleiben verbunden.')) return;
                    emit('qq:resetRoom', { roomCode });
                  }}
                  onBackToSetup={() => {
                    if (!window.confirm('Zurück zum Setup? Alle Teams werden entfernt und alle Einstellungen können neu gewählt werden.')) return;
                    for (const t of teamList) emit('qq:kickTeam', { roomCode, teamId: t.id });
                    emit('qq:resetRoom', { roomCode });
                    setSetupDone(false);
                  }}
                  roomCode={roomCode}
                  phase={s.phase}
                />

              </div>
            </div>

            {/* Buzz queue */}
            {s.buzzQueue.length > 0 && (
              <div style={{ ...card, borderColor: 'rgba(251,191,36,0.3)' }}>
                <div style={sectionLabel}><QQEmojiIcon emoji="⚡"/> Buzz-Reihenfolge</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {s.buzzQueue.map((b, i) => {
                    const team = teamList.find(t => t.id === b.teamId);
                    if (!team) return null;
                    return (
                      <div key={b.teamId} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 14px', borderRadius: 8,
                        background: i === 0 ? `${team.color}30` : 'rgba(255,255,255,0.04)',
                        border: `2px solid ${i === 0 ? team.color : 'rgba(255,255,255,0.1)'}`,
                      }}>
                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 900 }}>#{i + 1}</span>
                        <QQTeamAvatar avatarId={team.avatarId} size={30} />
                        <span style={{ fontWeight: 900, color: team.color, fontSize: 14 }}>{team.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Current question */}
            {s.currentQuestion && (
              <div style={{ ...card, borderColor: `${QQ_CATEGORY_COLORS[s.currentQuestion.category]}44` }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 900, padding: '3px 10px', borderRadius: 999,
                    background: `${QQ_CATEGORY_COLORS[s.currentQuestion.category]}22`,
                    color: QQ_CATEGORY_COLORS[s.currentQuestion.category],
                    border: `1px solid ${QQ_CATEGORY_COLORS[s.currentQuestion.category]}44`,
                  }}>
                    {QQ_CATEGORY_LABELS[s.currentQuestion.category].emoji} {QQ_CATEGORY_LABELS[s.currentQuestion.category].de}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    Phase {s.currentQuestion.phaseIndex} · #{s.currentQuestion.questionIndexInPhase + 1}
                  </span>
                </div>
                <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 6, color: '#e2e8f0' }}>
                  {s.currentQuestion.text}
                </div>
                {s.currentQuestion.textEn && (
                  <div style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>{s.currentQuestion.textEn}</div>
                )}
                {s.revealedAnswer && (
                  <div style={{
                    marginTop: 8, padding: '8px 12px', borderRadius: 8,
                    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                    color: '#4ade80', fontWeight: 900,
                  }}>
                    ✓ {s.revealedAnswer}
                  </div>
                )}
              </div>
            )}

            {/* Schätzchen ranking — shown when it's a SCHAETZCHEN reveal */}
            {(s.phase === 'QUESTION_REVEAL' || s.phase === 'QUESTION_ACTIVE') &&
              s.currentQuestion?.category === 'SCHAETZCHEN' &&
              s.currentQuestion.targetValue != null && (
              <SchaetzRanking
                answers={s.answers}
                teams={s.teams}
                targetValue={s.currentQuestion.targetValue}
                unit={s.currentQuestion.unit}
                correctTeamId={s.correctTeamId}
                phase={s.phase}
                roomCode={roomCode}
                emit={emit}
              />
            )}

            {/* Teams + live answers */}
            <div style={card}>
              <div style={sectionLabel}>Teams ({teamList.length})</div>
              {teamList.length === 0 && (
                <div style={{ color: '#475569', fontSize: 13 }}>Noch keine Teams beigetreten</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {teamList.map((t, i) => {
                  const stats = s.teamPhaseStats[t.id];
                  const answer = s.answers.find(a => a.teamId === t.id);
                  const isActive = s.phase === 'QUESTION_ACTIVE' || s.phase === 'QUESTION_REVEAL';
                  const isSchaetz = s.currentQuestion?.category === 'SCHAETZCHEN';
                  const isOffline = !t.connected;
                  return (
                    <div key={t.id} style={{
                      padding: '10px 12px', borderRadius: 8,
                      border: `2px solid ${
                        s.pendingFor === t.id && isOffline ? '#EF4444'
                          : s.pendingFor === t.id ? t.color
                          : isOffline ? 'rgba(239,68,68,0.5)'
                          : s.correctTeamId === t.id ? `${t.color}88`
                          : 'rgba(255,255,255,0.07)'
                      }`,
                      background: isOffline ? 'rgba(239,68,68,0.08)'
                        : s.correctTeamId === t.id ? `${t.color}18`
                        : 'rgba(255,255,255,0.03)',
                      opacity: isOffline ? 0.85 : 1,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#475569', fontWeight: 900, width: 16 }}>{i + 1}</span>
                        <QQTeamAvatar avatarId={t.avatarId} size={30} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 900, color: t.color, textDecoration: isOffline ? 'line-through' : 'none' }}>{t.name}</span>
                            {isOffline ? (
                              <span style={{
                                fontSize: 10, fontWeight: 900, color: '#fff',
                                background: '#EF4444', padding: '1px 7px', borderRadius: 999,
                                letterSpacing: 0.3,
                              }}>⚠ OFFLINE</span>
                            ) : (
                              <span style={{ fontSize: 11, color: '#22C55E' }}>●</span>
                            )}
                            {s.correctTeamId === t.id && <span style={{ fontSize: 11, color: '#4ade80' }}>✓ richtig</span>}
                            {answer && <span style={{ fontSize: 11, color: '#FBBF24' }}>✎ abgegeben</span>}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                            {t.largestConnected} verbunden · {t.totalCells} Felder
                            {stats?.stealsUsed > 0 && ` · ⚡${stats.stealsUsed}/2`}
                            {stats?.jokersEarned > 0 && ` · ⭐${stats.jokersEarned}`}
                          </div>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: t.color }}>{t.largestConnected}</div>
                        {/* Rename */}
                        <button
                          onClick={() => {
                            const next = prompt(`Team „${t.name}" umbenennen:`, t.name);
                            if (next == null) return;
                            const trimmed = next.trim();
                            if (!trimmed || trimmed === t.name) return;
                            emit('qq:renameTeam', { roomCode, teamId: t.id, name: trimmed });
                          }}
                          title="Umbenennen"
                          style={{
                            padding: '3px 7px', borderRadius: 6, cursor: 'pointer',
                            border: '1px solid rgba(148,163,184,0.3)', background: 'transparent',
                            color: '#94a3b8', fontSize: 11, fontFamily: 'inherit',
                          }}>✎</button>
                        {/* Kick button */}
                        <button
                          onClick={() => {
                            if (!confirm(`Team „${t.name}" wirklich entfernen?`)) return;
                            emit('qq:kickTeam', { roomCode, teamId: t.id });
                          }}
                          title="Kick"
                          style={{
                            padding: '3px 7px', borderRadius: 6, cursor: 'pointer',
                            border: '1px solid rgba(239,68,68,0.3)', background: 'transparent',
                            color: '#64748b', fontSize: 11, fontFamily: 'inherit',
                          }}>✕</button>
                      </div>
                      {/* Live answer — hide for Schätzchen (shown in ranking above) */}
                      {isActive && answer && !isSchaetz && (
                        <div style={{
                          marginTop: 8, padding: '6px 10px', borderRadius: 8,
                          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                          fontSize: 14, fontWeight: 700, color: '#e2e8f0',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                        }}>
                          <span>„{(() => {
                            const q = s.currentQuestion;
                            if (!q) return answer.text;
                            // Mucho: map index to option text
                            if (q.category === 'MUCHO') {
                              const idx = parseInt(answer.text, 10);
                              const opts: string[] = (q as any).options ?? [];
                              if (Number.isFinite(idx) && opts[idx]) {
                                const letters = ['A','B','C','D'];
                                return `${letters[idx] ?? idx}: ${opts[idx]}`;
                              }
                            }
                            // Zehn von Zehn: map "3,4,3" to readable bet summary
                            if (q.category === 'ZEHN_VON_ZEHN' && answer.text.includes(',')) {
                              const bets = answer.text.split(',').map(Number);
                              const opts: string[] = (q as any).options ?? [];
                              return bets.map((b, i) => `${opts[i] ?? i + 1}: ${b}`).filter((_, i) => bets[i] > 0).join(', ');
                            }
                            return answer.text;
                          })()}"</span>
                          {s.phase === 'QUESTION_REVEAL' && !s.correctTeamId && (
                            <Btn small color={t.color} onClick={() => emit('qq:markCorrect', { roomCode, teamId: t.id })}>
                              ✓ Richtig
                            </Btn>
                          )}
                          {s.phase === 'QUESTION_REVEAL' && answer && (
                            <button
                              onClick={() => emit('qq:markFunny', { roomCode, teamId: t.id, text: answer.text })}
                              title="Lustige Antwort markieren"
                              style={{
                                padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
                                border: '1px solid rgba(251,191,36,0.3)', background: 'transparent',
                                fontSize: 16, lineHeight: 1, fontFamily: 'inherit',
                              }}>😂</button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Niemand-Button wenn alle geantwortet haben */}
              {s.phase === 'QUESTION_REVEAL' && !s.correctTeamId && s.currentQuestion?.category !== 'SCHAETZCHEN' && (
                <div style={{ marginTop: 8 }}>
                  <Btn color="#475569" onClick={() => emit('qq:markWrong', { roomCode })}>
                    ✗ Niemand korrekt
                  </Btn>
                </div>
              )}
            </div>
          </div>

          {/* ── Right column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* 2026-05-02 (Event-Manager-Audit + App-Designer-Audit): Frage-Panel
                fuer den Mod. Pub-Setup: Beamer steht hinter dem Mod, Mod kann
                Frage/Antwort am Beamer nicht ablesen. Hier ist Frage + erwartete
                Antwort + akzeptierte Schreibvarianten + sub-mechanik-spezifische
                Infos kompakt sichtbar. */}
            <ModQuestionPanel state={s} />

            {/* Settings — collapsible */}
            <div style={card}>
              <div
                onClick={() => setSettingsOpen(v => !v)}
                style={{ ...sectionLabel, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none' }}
              >
                <span style={{ fontSize: 10, transition: 'transform 0.2s', transform: settingsOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                Einstellungen
              </div>
              {settingsOpen && <>

              {/* Timer */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>⏱ Timer</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {[15, 30, 45, 60, 90].map(t => (
                    <button key={t} onClick={() => { setTimerInput(t); emit('qq:setTimer', { roomCode, durationSec: t }); }}
                      style={{
                        padding: '6px 12px', borderRadius: 6, border: `1px solid ${s.timerDurationSec === t ? '#3B82F6' : 'rgba(255,255,255,0.1)'}`,
                        background: s.timerDurationSec === t ? 'rgba(59,130,246,0.2)' : 'transparent',
                        color: s.timerDurationSec === t ? '#3B82F6' : '#64748b',
                        cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 900,
                      }}>{t}s</button>
                  ))}
                  <input
                    type="number" min={5} max={300}
                    value={timerInput}
                    onChange={e => setTimerInput(Number(e.target.value))}
                    onKeyDown={e => e.key === 'Enter' && applyTimer()}
                    placeholder="…s"
                    style={{ ...inputStyle, width: 58, textAlign: 'center' }}
                  />
                  <Btn small color="#3B82F6" onClick={applyTimer}>Setzen</Btn>
                </div>
              </div>

              {/* Language */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>🌐 Sprache</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    onClick={() => emit('qq:setLanguage', { roomCode, language: 'de' })}
                    style={{
                      border: s.language === 'de' ? '2px solid #3B82F6' : '1px solid #475569',
                      background: s.language === 'de' ? '#3B82F622' : 'transparent',
                      color: '#e2e8f0', fontSize: 22, borderRadius: 8, padding: '2px 10px', cursor: 'pointer', fontWeight: 900,
                      opacity: s.language === 'de' ? 1 : 0.7,
                      transition: 'all 0.15s',
                    }}
                    aria-label="Deutsch"
                  >🇩🇪</button>
                  <button
                    onClick={() => emit('qq:setLanguage', { roomCode, language: 'en' })}
                    style={{
                      border: s.language === 'en' ? '2px solid #3B82F6' : '1px solid #475569',
                      background: s.language === 'en' ? '#3B82F622' : 'transparent',
                      color: '#e2e8f0', fontSize: 22, borderRadius: 8, padding: '2px 10px', cursor: 'pointer', fontWeight: 900,
                      opacity: s.language === 'en' ? 1 : 0.7,
                      transition: 'all 0.15s',
                    }}
                    aria-label="Englisch"
                  >🇬🇧</button>
                  <button
                    onClick={() => emit('qq:setLanguage', { roomCode, language: 'both' })}
                    style={{
                      border: s.language === 'both' ? '2px solid #3B82F6' : '1px solid #475569',
                      background: s.language === 'both' ? '#3B82F622' : 'transparent',
                      color: '#e2e8f0', fontSize: 22, borderRadius: 8, padding: '2px 10px', cursor: 'pointer', fontWeight: 900,
                      opacity: s.language === 'both' ? 1 : 0.7,
                      transition: 'all 0.15s',
                    }}
                    aria-label="Beide Sprachen (Flip)"
                  >🌐</button>
                </div>
              </div>

              {/* 3D Grid */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>🏙️ 3D Grid</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    onClick={() => emit('qq:setEnable3D', { roomCode, enabled: !s.enable3DTransition })}
                    style={{
                      padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                      fontWeight: 900, fontSize: 13,
                      border: `1px solid ${s.enable3DTransition ? '#22C55E' : 'rgba(255,255,255,0.1)'}`,
                      background: s.enable3DTransition ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                      color: s.enable3DTransition ? '#22C55E' : '#64748b',
                    }}>
                    {s.enable3DTransition ? '✓ 3D Transition aktiv' : '○ 3D Transition aus'}
                  </button>
                  <span style={{ fontSize: 11, color: '#475569' }}>
                    {s.enable3DTransition ? '2D→3D Fahrt beim Placement' : 'Nur 2D Grid'}
                  </span>
                </div>
              </div>

              {/* Sound — mute buttons + volume + upload panel */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>🔊 Sound</div>

                {/* Row 1: Mute toggles + volume */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                  {/* Musik mute */}
                  <button
                    onClick={() => emit('qq:setMusicMuted', { roomCode, muted: !s.musicMuted })}
                    style={{
                      padding: '5px 11px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                      fontWeight: 900, fontSize: 12,
                      border: `1px solid ${s.musicMuted ? '#EF4444' : '#22C55E'}`,
                      background: s.musicMuted ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                      color: s.musicMuted ? '#EF4444' : '#22C55E',
                    }}>
                    {s.musicMuted ? '🔇 Musik' : '🎵 Musik'}
                  </button>
                  {/* SFX mute */}
                  <button
                    onClick={() => emit('qq:setSfxMuted', { roomCode, muted: !s.sfxMuted })}
                    style={{
                      padding: '5px 11px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                      fontWeight: 900, fontSize: 12,
                      border: `1px solid ${s.sfxMuted ? '#EF4444' : '#22C55E'}`,
                      background: s.sfxMuted ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                      color: s.sfxMuted ? '#EF4444' : '#22C55E',
                    }}>
                    {s.sfxMuted ? '🔇 SFX' : '🔉 SFX'}
                  </button>
                  {/* Volume slider */}
                  <input
                    type="range" min={0} max={100} step={5}
                    value={Math.round((s.volume ?? 0.8) * 100)}
                    onChange={e => emit('qq:setVolume', { roomCode, volume: Number(e.target.value) / 100 })}
                    style={{ flex: 1, maxWidth: 100, accentColor: '#3B82F6' }}
                  />
                  <span style={{ fontSize: 11, color: '#475569', minWidth: 28 }}>
                    {Math.round((s.volume ?? 0.8) * 100)}%
                  </span>
                </div>

                {/* Row 2: Sound upload toggle */}
                <button
                  onClick={() => setShowSoundPanel(v => !v)}
                  style={{
                    padding: '4px 10px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
                    fontWeight: 900, fontSize: 11,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: showSoundPanel ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                    color: showSoundPanel ? '#93c5fd' : '#64748b',
                  }}>
                  🎵 Custom Sounds {showSoundPanel ? '▲' : '▼'}
                </button>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>M-Taste = alles muten</div>

                {/* Sound upload panel */}
                {showSoundPanel && (
                  <div style={{
                    marginTop: 8, padding: 10,
                    background: 'rgba(0,0,0,0.25)', borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    <QQSoundPanel
                      config={localSoundConfig}
                      onChange={cfg => {
                        setLocalSoundConfig(cfg);
                        emit('qq:updateSoundConfig', { roomCode, soundConfig: cfg });
                      }}
                    />
                  </div>
                )}
              </div>
              </>}
            </div>

            {/* Grid — collapsible */}
            {s.grid && <CollapsibleGrid state={s} />}

            {/* Rangliste */}
            <div style={card}>
              <div style={sectionLabel}>Rangliste</div>
              {[...teamList].sort((a, b) => b.largestConnected - a.largestConnected).map((t, i) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#475569', width: 16 }}>#{i + 1}</span>
                  <QQTeamAvatar avatarId={t.avatarId} size={30} />
                  <span style={{ flex: 1, fontWeight: 900, color: t.color, fontSize: 13 }}>{t.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#94a3b8' }}>{t.largestConnected}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        </>
      )}
    </div>
    </AvatarSetProvider>
  );
}

// ── Host notes (suggested moderator talking points per phase) ────────────────

const HOST_NOTES_DE: Record<string, { title: string; text: string }> = {
  LOBBY: {
    title: 'Lobby — Teams einchecken',
    text: 'Begrüße dein Publikum. Weise Teams darauf hin, den QR-Code zu scannen, einen Avatar (inkl. Teamfarbe) und einen Teamnamen zu wählen. Warte, bis alle Teams bereit sind, bevor du startest.',
  },
  RULES: {
    title: 'Regeln erklären',
    text: 'Gehe die Regel-Folien kurz durch. Wichtig: Jedes Team, das richtig antwortet, darf ein Feld auf dem Gitter setzen. Bei Gleichstand entscheidet die Geschwindigkeit nur darüber, wer ZUERST wählen darf.',
  },
  PHASE_INTRO: {
    title: 'Kategorie-Intro',
    text: 'Stimme das Publikum auf die kommende Kategorie ein. Erwähne kurz, worum es geht — baue Spannung auf, bevor die erste Frage kommt.',
  },
  QUESTION_ACTIVE: {
    title: 'Frage läuft',
    text: 'Lies die Frage laut vor. Erinnere die Teams: "Alle gleichzeitig auf dem Handy antworten!" Beobachte den Timer und heize die Stimmung an.',
  },
  QUESTION_REVEAL: {
    title: 'Antwort aufdecken',
    text: 'Verkünde die richtige Antwort mit Nachdruck. Hebe knappe oder überraschende Antworten hervor. Erwähne, welche Teams richtig lagen.',
  },
  PLACEMENT: {
    title: 'Feld-Platzierung',
    text: 'Jedes richtige Team darf jetzt ein Feld setzen. Bei Gleichstand: Das schnellste Team wählt zuerst. Kommentiere strategische Züge ("ah, cleverer Block!").',
  },
  COMEBACK_CHOICE: {
    title: 'Comeback-Runde',
    text: 'Das zurückliegende Team darf einen Joker einsetzen. Erkläre kurz die Optionen und baue Spannung auf — das kann die Runde drehen!',
  },
  CONNECTIONS_4X4: {
    title: '4×4 — Finale',
    text: '16 Begriffe, 4 versteckte Gruppen. Teams jagen parallel und tippen 4 Items als Gruppen-Tipp. Pro gefundene Gruppe = 1 Aktion. Ranking: meiste Gruppen, schnellste zuerst bei Gleichstand. Heize an, achte auf den Timer.',
  },
  PAUSED: {
    title: 'Pause',
    text: 'Kurze Verschnaufpause. Nutze die Zeit für eine Anekdote, einen kurzen Überblick über den Spielstand oder um auf die nächste Runde einzustimmen.',
  },
  GAME_OVER: {
    title: 'Spielende',
    text: 'Verkünde den Gewinner! Bedanke dich bei allen Teams für ihre Teilnahme. Würdige besondere Momente oder Comebacks aus der Partie. Dann mit Space die Danke-Folie starten.',
  },
  THANKS: {
    title: 'Danke-Folie',
    text: 'Weise auf den QR-Code hin: Team-Stats, Feedback und nächste Quiz-Termine auf dem Handy. Social-Media-Push und Goodie.',
  },
};

function HostNotes({ state }: { state: QQStateUpdate }) {
  const phase = state.phase;
  const baseNote = HOST_NOTES_DE[phase] ?? { title: phase, text: 'Kein Hinweis für diese Phase.' };
  const customNote = state.currentQuestion?.hostNote?.trim();
  const funFact = state.currentQuestion?.funFact?.trim();
  const questionPhase = phase === 'QUESTION_ACTIVE' || phase === 'QUESTION_REVEAL' || phase === 'PLACEMENT';
  const showCustom = customNote && questionPhase;
  const showFunFact = funFact && questionPhase;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(251,191,36,0.03))',
      border: '1px solid rgba(251,191,36,0.35)',
      borderLeft: '4px solid #FBBF24',
      borderRadius: 8,
      padding: '10px 14px',
      marginBottom: 12,
      fontSize: 13,
      lineHeight: 1.5,
      color: '#e5e7eb',
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: '#FBBF24',
        marginBottom: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span>🎙️ Moderator-Tipp</span>
        <span style={{ opacity: 0.6, fontWeight: 700 }}>· {baseNote.title}</span>
      </div>
      <div style={{ color: '#d1d5db' }}>{baseNote.text}</div>
      {showCustom && (
        <div style={{
          marginTop: 8,
          paddingTop: 8,
          borderTop: '1px dashed rgba(251,191,36,0.3)',
          color: '#fef3c7',
          fontStyle: 'italic',
        }}>
          <span style={{ fontWeight: 900, fontStyle: 'normal', color: '#FBBF24' }}>Frage-Notiz: </span>
          {customNote}
        </div>
      )}
      {showFunFact && (
        <div style={{
          marginTop: 8,
          padding: '8px 10px',
          borderRadius: 8,
          background: 'rgba(168,85,247,0.10)',
          border: '1px solid rgba(168,85,247,0.35)',
          borderLeft: '3px solid #A855F7',
          color: '#ede9fe',
          fontSize: 12,
          lineHeight: 1.5,
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: '#A855F7',
            marginBottom: 3,
          }}>
            💡 Fun Fact (optional einwerfen)
          </div>
          <div>{funFact}</div>
        </div>
      )}
    </div>
  );
}

// ── Endstand-CSV-Export ──────────────────────────────────────────────────
// 2026-05-02 (Event-Manager-Audit): Pub-Wirt braucht den Endstand fuer die
// Wochen-Tafel im Pub. Browser-side CSV-Download, kein Backend noetig.
// ── Mit-Gewinner / Sieger-Tausch (Toggle) ──────────────────────────────────
// 2026-05-03 (Wolf-Wunsch, Streamdeck-Setup): Mod scrollt mit Streamdeck —
// scrollen nervt. Mit-Gewinner-Aktionen sind Edge-Case ('im weiteren Sinne
// richtig'-Faelle), nicht Standard-Flow. Daher hinter Toggle einklappen,
// ausser wenn schon Mit-Gewinner aktiv sind (forceOpen=true).
function ModWinnerActionsToggle({ forceOpen, nonWinners, coWinners, roomCode, emit }: {
  forceOpen: boolean;
  nonWinners: { id: string; name: string; color: string; avatarId: string }[];
  coWinners: { id: string; name: string; color: string; avatarId: string }[];
  roomCode: string;
  emit: (event: string, payload: any) => Promise<any>;
}) {
  const [open, setOpen] = useState(forceOpen);
  // Sync forceOpen — wenn Mit-Gewinner waehrend des Spiels hinzukommen, Panel automatisch oeffnen
  useEffect(() => { if (forceOpen) setOpen(true); }, [forceOpen]);
  if (nonWinners.length === 0 && coWinners.length === 0) return null;

  const toggleLabel = open ? '▼ Sieger anpassen' : '▶ Sieger anpassen';
  const summary = coWinners.length > 0
    ? `${coWinners.length} Mit-Gewinner aktiv`
    : 'Im weiteren Sinne richtig? Punkte korrigieren?';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '8px 12px', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.04)',
          color: '#cbd5e1', fontWeight: 900, fontSize: 13,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <span>{toggleLabel}</span>
        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>{summary}</span>
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Sieger austauschen */}
          {nonWinners.length > 0 && (
            <div style={{
              padding: 10, borderRadius: 8,
              background: 'rgba(59,130,246,0.06)',
              border: '1px solid rgba(59,130,246,0.25)',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 900, color: '#60A5FA',
                letterSpacing: '0.04em', textTransform: 'uppercase',
                marginBottom: 8,
              }}>
                ⇄ Gewinner austauschen
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {nonWinners.map(t => (
                  <button
                    key={t.id}
                    onClick={async () => {
                      if (!confirm(`Gewinner zu ${t.name} ändern?`)) return;
                      await emit('qq:undoMarkCorrect', { roomCode });
                      emit('qq:markCorrect', { roomCode, teamId: t.id });
                    }}
                    style={{
                      minHeight: 36, padding: '8px 14px', borderRadius: 8,
                      border: `1.5px solid ${t.color}88`,
                      background: `${t.color}18`, color: t.color,
                      fontFamily: 'inherit', fontWeight: 900, fontSize: 14,
                      cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}
                    title={`Gewinner zu ${t.name} ändern (Undo + Mark Correct)`}
                  >
                    <QQTeamAvatar avatarId={t.avatarId} size={20} />
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mit-Gewinner hinzufuegen */}
          {nonWinners.length > 0 && (
            <div style={{
              padding: 10, borderRadius: 8,
              background: 'rgba(34,197,94,0.06)',
              border: '1px solid rgba(34,197,94,0.25)',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 900, color: '#4ADE80',
                letterSpacing: '0.04em', textTransform: 'uppercase',
                marginBottom: 8,
              }}>
                + Mit-Gewinner hinzufügen
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {nonWinners.map(t => (
                  <button
                    key={`co-${t.id}`}
                    onClick={() => emit('qq:modAddCoWinner', { roomCode, teamId: t.id })}
                    style={{
                      minHeight: 36, padding: '8px 14px', borderRadius: 8,
                      border: `1.5px dashed ${t.color}99`,
                      background: 'rgba(255,255,255,0.02)', color: t.color,
                      fontFamily: 'inherit', fontWeight: 900, fontSize: 14,
                      cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}
                    title={`${t.name} als Mit-Gewinner hinzufuegen — setzt nach primaerem Sieger`}
                  >
                    <QQTeamAvatar avatarId={t.avatarId} size={20} />
                    + {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Aktive Mit-Gewinner zum Entfernen */}
          {coWinners.length > 0 && (
            <div style={{
              padding: 10, borderRadius: 8,
              background: 'rgba(34,197,94,0.10)',
              border: '1px solid rgba(34,197,94,0.45)',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 900, color: '#22C55E',
                letterSpacing: '0.04em', textTransform: 'uppercase',
                marginBottom: 8,
              }}>
                ✓ Mit-Gewinner aktiv (klick zum Entfernen)
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {coWinners.map(t => (
                  <button
                    key={`rm-${t.id}`}
                    onClick={() => {
                      if (!confirm(`${t.name} aus Mit-Gewinner entfernen?`)) return;
                      emit('qq:modRemoveWinner', { roomCode, teamId: t.id });
                    }}
                    style={{
                      minHeight: 36, padding: '8px 14px', borderRadius: 8,
                      border: `2px solid ${t.color}`,
                      background: `${t.color}25`, color: t.color,
                      fontFamily: 'inherit', fontWeight: 900, fontSize: 14,
                      cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}
                    title={`${t.name} entfernen`}
                  >
                    <QQTeamAvatar avatarId={t.avatarId} size={20} />
                    ✓ {t.name} ✕
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function downloadEndstandCSV(s: QQStateUpdate, roomCode: string): void {
  const tieWinnerId = s.tieBreakerWinnerId ?? null;
  const sorted = [...s.teams].sort((a, b) => {
    if (tieWinnerId) {
      if (a.id === tieWinnerId && b.id !== tieWinnerId) return -1;
      if (b.id === tieWinnerId && a.id !== tieWinnerId) return 1;
    }
    return b.largestConnected - a.largestConnected
      || b.totalCells - a.totalCells;
  });

  const escape = (val: string | number): string => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    'Platz', 'Team', 'Avatar', 'Groesste Insel', 'Felder gesamt', 'Joker', 'Klau-Aktionen', 'Stapel', 'Tiebreak-Sieger',
  ];

  const rows = sorted.map((t, idx) => {
    const stats = s.teamPhaseStats[t.id];
    const isTieWinner = tieWinnerId === t.id;
    return [
      idx + 1,
      t.name,
      t.avatarId,
      t.largestConnected,
      t.totalCells,
      stats?.jokersEarned ?? 0,
      stats?.stealsUsed ?? 0,
      stats?.stapelsUsed ?? 0,
      isTieWinner ? 'ja' : '',
    ].map(escape).join(',');
  });

  const date = new Date();
  const dateStr = date.toLocaleString('de-DE', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

  const csv = [
    `# CozyQuiz Endstand — Raum ${roomCode} — ${dateStr}`,
    headers.join(','),
    ...rows,
  ].join('\n');

  // Browser-Download via Blob + ObjectURL
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }); // BOM fuer Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fname = `cozyquiz-endstand-${roomCode}-${date.toISOString().slice(0, 10)}.csv`;
  a.href = url;
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Mod Question Panel (Frage + Antwort fuer Mod sichtbar) ──────────────────
// 2026-05-02 (Event-Manager-Audit + App-Designer-Audit): Im Pub steht der
// Beamer hinter dem Mod — er kann die laufende Frage und die erwartete Antwort
// nicht ablesen. Dieses Panel zeigt sie ihm im Mod-Tablet/Laptop an, plus
// kategorie-spezifische Extras (Schaetzchen-Range, MC-Korrekt, BunteTuete-Subkind-Details).
// Sichtbar in QUESTION_ACTIVE / QUESTION_REVEAL / PLACEMENT.
function ModQuestionPanel({ state: s }: { state: QQStateUpdate }) {
  const q = s.currentQuestion;
  if (!q) return null;
  const phase = s.phase;
  if (phase !== 'QUESTION_ACTIVE' && phase !== 'QUESTION_REVEAL' && phase !== 'PLACEMENT') return null;

  const lang: 'de' | 'en' = s.language === 'en' ? 'en' : 'de';
  const text = (lang === 'en' && q.textEn) ? q.textEn : q.text;
  const answer = (lang === 'en' && q.answerEn) ? q.answerEn : q.answer;

  // Kategorie-Badge-Farbe
  const catColor: Record<string, string> = {
    SCHAETZCHEN: '#3B82F6',
    MUCHO: '#22C55E',
    ZEHN_VON_ZEHN: '#A855F7',
    CHEESE: '#FBBF24',
    BUNTE_TUETE: '#EF4444',
    BUZZER: '#F97316',
    PICTURE_THIS: '#06B6D4',
  };
  const accent = catColor[q.category] ?? '#94A3B8';

  // Kategorie-Spezifik
  const extras: { label: string; value: string }[] = [];

  if (q.category === 'SCHAETZCHEN' && q.targetValue != null) {
    const unit = (lang === 'en' && q.unitEn) ? q.unitEn : (q.unit ?? '');
    extras.push({ label: 'Wert', value: `${q.targetValue}${unit ? ' ' + unit : ''}` });
    extras.push({ label: 'Akzept', value: 'Naechstes Team gewinnt (closest-wins)' });
  }
  if (q.category === 'MUCHO' && q.options && q.correctOptionIndex != null) {
    const opts = (lang === 'en' && q.optionsEn) ? q.optionsEn : q.options;
    extras.push({ label: `Option ${'ABCD'[q.correctOptionIndex] ?? q.correctOptionIndex + 1}`, value: opts[q.correctOptionIndex] ?? '?' });
  }
  if (q.category === 'ZEHN_VON_ZEHN' && q.options && q.correctOptionIndex != null) {
    const opts = (lang === 'en' && q.optionsEn) ? q.optionsEn : q.options;
    extras.push({ label: `Option ${q.correctOptionIndex + 1}`, value: opts[q.correctOptionIndex] ?? '?' });
  }
  if (q.category === 'CHEESE') {
    extras.push({ label: 'Akzept', value: 'fuzzy >=0.8 (Schreibfehler-Toleranz)' });
  }

  // BunteTuete sub-kind details
  const bt = q.bunteTuete;
  if (bt) {
    if (bt.kind === 'top5') {
      const ans = (lang === 'en' && bt.answersEn) ? bt.answersEn : bt.answers;
      extras.push({ label: 'Top5', value: ans.join(', ') });
      extras.push({ label: 'Akzept', value: 'fuzzy >=0.8' });
    }
    if (bt.kind === 'order') {
      const items = (lang === 'en' && bt.itemsEn) ? bt.itemsEn : bt.items;
      const sorted = bt.correctOrder.map(i => items[i]).join(' → ');
      extras.push({ label: 'Reihenfolge', value: sorted });
      const crit = (lang === 'en' && bt.criteriaEn) ? bt.criteriaEn : bt.criteria;
      if (crit) extras.push({ label: 'Kriterium', value: crit });
    }
    if (bt.kind === 'oneOfEight') {
      const stmts = (lang === 'en' && bt.statementsEn) ? bt.statementsEn : bt.statements;
      extras.push({ label: `Falsch (#${bt.falseIndex + 1})`, value: stmts[bt.falseIndex] ?? '?' });
    }
    if (bt.kind === 'hotPotato') {
      // q.answer enthaelt Komma-getrennte gueltige Antworten
      const valid = (q.answer || '').split(/[,;]/).map(a => a.trim()).filter(Boolean);
      extras.push({ label: `Antworten (${valid.length})`, value: valid.join(', ') });
      extras.push({ label: 'Akzept', value: 'fuzzy >=0.8 pro Antwort' });
    }
    if (bt.kind === 'onlyConnect') {
      const hints = (lang === 'en' && bt.hintsEn) ? bt.hintsEn : bt.hints;
      extras.push({ label: 'Hinweise', value: hints.map((h, i) => `${i + 1}. ${h}`).join(' · ') });
      const acc = (lang === 'en' && bt.acceptedAnswersEn) ? bt.acceptedAnswersEn : bt.acceptedAnswers;
      if (acc && acc.length > 0) {
        extras.push({ label: 'Auch ok', value: acc.join(', ') });
      }
    }
    if (bt.kind === 'bluff') {
      const real = (lang === 'en' && bt.realAnswerEn) ? bt.realAnswerEn : bt.realAnswer;
      extras.push({ label: 'Echte Antwort', value: real });
    }
  }

  // Sub-Kind Badge
  const subKind = bt?.kind ?? '';
  const subKindLabel: Record<string, string> = {
    top5: 'Top 5', order: 'Reihenfolge', oneOfEight: 'Imposter',
    hotPotato: 'Hot Potato', onlyConnect: '4-Connect', bluff: 'Bluff',
  };

  return (
    <div style={{
      ...card,
      borderTop: `3px solid ${accent}`,
      padding: 14,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 900, color: accent,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          padding: '2px 8px', borderRadius: 6,
          background: `${accent}18`, border: `1px solid ${accent}55`,
        }}>
          {q.category}{subKind ? ` · ${subKindLabel[subKind] ?? subKind}` : ''}
        </span>
        <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>
          Q {s.questionIndex + 1}
        </span>
      </div>

      {/* Frage-Text */}
      {/* 2026-05-02 (App-Designer-Audit M3): Schrift hochgezogen — das ist die
          Lebensader-Info des Panels (Pub-Live: Mod kuckt schnell hin zwischen
          Patter). 14px war zu klein fuer Tablet-Distanz. */}
      <div style={{
        fontSize: 17, fontWeight: 900, color: '#F1F5F9', lineHeight: 1.35,
        marginBottom: 10,
      }}>
        {text}
      </div>

      {/* Antwort */}
      <div style={{
        padding: '10px 12px', borderRadius: 8,
        background: 'rgba(34,197,94,0.12)',
        border: '1px solid rgba(34,197,94,0.4)',
        borderLeft: '4px solid #22C55E',
        marginBottom: extras.length > 0 ? 8 : 0,
      }}>
        <div style={{
          fontSize: 10, fontWeight: 900, color: '#22C55E',
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4,
        }}>
          ✓ Antwort
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#dcfce7', lineHeight: 1.3 }}>
          {answer || '—'}
        </div>
      </div>

      {/* Kategorie-spezifische Zusatzfelder */}
      {extras.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {extras.map((e, i) => (
            <div key={i} style={{
              fontSize: 11, lineHeight: 1.4, color: '#cbd5e1',
              display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8,
            }}>
              <span style={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.04em', alignSelf: 'start', paddingTop: 2 }}>
                {e.label}
              </span>
              <span style={{ color: '#e5e7eb', fontWeight: 700 }}>
                {e.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Timer pill (live countdown) ──────────────────────────────────────────────

function TimerPill({ endsAt }: { endsAt: number }) {
  const [remaining, setRemaining] = useState(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));

  useEffect(() => {
    const interval = setInterval(() => {
      const r = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(r);
      if (r === 0) clearInterval(interval);
    }, 200);
    return () => clearInterval(interval);
  }, [endsAt]);

  const urgent = remaining <= 5;
  return (
    <div style={{
      padding: '4px 14px', borderRadius: 999, fontWeight: 900, fontSize: 14,
      background: urgent ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.15)',
      border: `1px solid ${urgent ? '#EF4444' : '#FBBF24'}`,
      color: urgent ? '#EF4444' : '#FBBF24',
      minWidth: 52, textAlign: 'center',
      animation: urgent ? 'pulse 0.5s ease infinite alternate' : 'none',
    }}>
      ⏱ {remaining}s
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

// ── Schätzchen ranking ────────────────────────────────────────────────────────

function SchaetzRanking({ answers, teams, targetValue, unit, correctTeamId, phase, roomCode, emit }: {
  answers: any[]; teams: any[]; targetValue: number; unit?: string; correctTeamId: string | null;
  phase: string; roomCode: string; emit: any;
}) {
  // Jahreszahlen ohne Tausendertrennzeichen anzeigen (1900 statt 1.900).
  const isYearUnit = /jahr|year/i.test(unit ?? '');
  const fmtNum = (n: number) => isYearUnit ? String(Math.round(n)) : n.toLocaleString('de-DE');
  // Parse + rank answers by distance
  const ranked = answers
    .map(a => {
      const parsed = Number(a.text.replace(/[^0-9.,\-]/g, '').replace(',', '.'));
      const distance = Number.isNaN(parsed) ? Infinity : Math.abs(parsed - targetValue);
      const team = teams.find((t: any) => t.id === a.teamId);
      return { teamId: a.teamId, text: a.text, parsed, distance, team };
    })
    .sort((a, b) => a.distance - b.distance);

  const autoWinnerId = ranked[0]?.distance !== Infinity ? ranked[0]?.teamId : null;

  return (
    <div style={{ ...card, borderColor: 'rgba(245,158,11,0.35)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={sectionLabel}>🍯 Schätzchen — Zielwert: <span style={{ color: '#F59E0B', fontWeight: 900 }}>{fmtNum(targetValue)}</span></div>
        {phase === 'QUESTION_REVEAL' && !correctTeamId && autoWinnerId && (
          <span style={{ fontSize: 11, color: '#64748b' }}>Auto-Auswertung aktiv</span>
        )}
      </div>

      {ranked.length === 0 && (
        <div style={{ color: '#475569', fontSize: 13 }}>Noch keine Antworten eingegangen…</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ranked.map((r, i) => {
          const isWinner = r.teamId === (correctTeamId ?? autoWinnerId);
          const barWidth = r.distance === Infinity ? 0 : Math.max(4, 100 - Math.min(99, (r.distance / targetValue) * 100));
          return (
            <div key={r.teamId} style={{
              padding: '8px 12px', borderRadius: 8,
              border: `2px solid ${isWinner ? (r.team?.color ?? '#F59E0B') : 'rgba(255,255,255,0.07)'}`,
              background: isWinner ? `${r.team?.color ?? '#F59E0B'}14` : 'rgba(255,255,255,0.03)',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Distance bar */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, height: 2,
                width: `${barWidth}%`,
                background: isWinner ? (r.team?.color ?? '#F59E0B') : 'rgba(255,255,255,0.12)',
                transition: 'width 0.4s ease',
              }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: i === 0 ? '#F59E0B' : '#475569', width: 18 }}>
                  {i === 0 ? <QQEmojiIcon emoji="🥇"/> : `#${i + 1}`}
                </span>
                <QQTeamAvatar avatarId={r.team?.avatarId ?? 'fox'} size={26} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 900, color: r.team?.color ?? '#94a3b8' }}>{r.team?.name ?? r.teamId}</span>
                  <span style={{ marginLeft: 10, fontSize: 15, fontWeight: 900, color: '#e2e8f0' }}>
                    {r.parsed !== Infinity && !Number.isNaN(r.parsed) ? fmtNum(r.parsed) : r.text}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {r.distance !== Infinity ? (
                    <span style={{ fontSize: 12, color: isWinner ? '#4ade80' : '#64748b', fontWeight: 700 }}>
                      {r.distance === 0 ? '✓ Exakt' : `±${fmtNum(r.distance)}`}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: '#475569' }}>—</span>
                  )}
                </div>
                {phase === 'QUESTION_REVEAL' && !correctTeamId && r.team && (
                  <Btn small color={r.team.color} onClick={() => emit('qq:markCorrect', { roomCode, teamId: r.teamId })}>
                    ✓
                  </Btn>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {phase === 'QUESTION_REVEAL' && !correctTeamId && (
        <div style={{ marginTop: 8 }}>
          <Btn color="#475569" onClick={() => emit('qq:markWrong', { roomCode })}>
            ✗ Niemand korrekt
          </Btn>
        </div>
      )}
    </div>
  );
}

function PlacementControls({ state: s, roomCode, emit }: any) {
  const team = s.teams.find((t: any) => t.id === s.pendingFor);
  if (!team) return null;
  const offline = team.connected === false;
  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
      padding: '8px 12px', borderRadius: 8,
      background: offline ? 'rgba(239,68,68,0.18)' : `${team.color}18`,
      border: offline ? '2px solid #EF4444' : `1px solid ${team.color}44`,
      boxShadow: offline ? '0 0 0 3px rgba(239,68,68,0.35)' : undefined,
    }}>
      <QQTeamAvatar avatarId={team.avatarId} size={26} />
      <span style={{ fontWeight: 900, color: offline ? '#FCA5A5' : team.color }}>
        {team.name}
      </span>
      {offline && (
        <span style={{
          fontSize: 11, fontWeight: 900, color: '#fff',
          background: '#EF4444', padding: '2px 8px', borderRadius: 999,
          letterSpacing: 0.4,
        }}>
          ⚠ OFFLINE — bitte Skip
        </span>
      )}
      <span style={{ fontSize: 12, color: '#94a3b8' }}>{actionLabel(s.pendingAction, s.teamPhaseStats[team.id])}</span>
      {s.pendingAction === 'FREE' && (
        <>
          <Btn small color="#3B82F6" onClick={() => emit('qq:chooseFreeAction', { roomCode, teamId: team.id, action: 'PLACE' })}>
            <QQEmojiIcon emoji="📍"/> Setzen
          </Btn>
          <Btn small color="#EF4444" onClick={() => emit('qq:chooseFreeAction', { roomCode, teamId: team.id, action: 'STEAL' })}>
            <QQEmojiIcon emoji="⚡"/> Klauen
          </Btn>
        </>
      )}
      {s.gamePhaseIndex === 2 && s.pendingAction === 'PLACE_2' && (
        <Btn small color="#EF4444" onClick={() => emit('qq:chooseFreeAction', { roomCode, teamId: team.id, action: 'STEAL' })}>
          → Klauen
        </Btn>
      )}
      {s.gamePhaseIndex >= 2 && s.pendingAction === 'STEAL_1' && (() => {
        const gridFull = Array.isArray(s.grid) && s.grid.every((row: any[]) => row.every((c: any) => c.ownerId !== null));
        // Wenn Grid voll ist, gibt es nichts zu "setzen" — nur Klauen oder Skip.
        if (gridFull) return null;
        return (
          <Btn small color="#3B82F6" onClick={() => emit('qq:chooseFreeAction', { roomCode, teamId: team.id, action: 'PLACE' })}>
            → Setzen
          </Btn>
        );
      })()}
      {s.pendingAction === 'COMEBACK' && (
        <Btn
          small
          color="#8B5CF6"
          onClick={() => {
            if (confirm('Comeback-Klau zurücknehmen? Alle bereits geklauten Felder gehen zurück.')) {
              emit('qq:comebackUndo', { roomCode, teamId: team.id });
            }
          }}
        >
          ↩ Comeback zurück
        </Btn>
      )}
      <span title="Wenn Team nichts setzen/klauen kann oder will">
        <Btn
          small
          color="#64748b"
          onClick={() => {
            if (confirm(`${team.name} überspringen? Der Zug wird verworfen.`)) {
              emit('qq:skipCurrentTeam', { roomCode });
            }
          }}
        >
          ⏭ Skip
        </Btn>
      </span>
    </div>
  );
}

function ComebackControls({ state: s, roomCode, emit }: any) {
  const team = s.teams.find((t: any) => t.id === s.comebackTeamId);
  if (!team || s.comebackAction) return null;
  // Sobald H/L-Mini-Game aktiv (question/reveal/steal) wird der Flow ueber
  // qq:comebackHLStep gesteuert — die Intro-Step-Buttons hier wuerden sonst
  // versehentlich Legacy-Pfade triggern. Nur waehrend hl.phase === 'intro'
  // (oder wenn hl gar nicht existiert) sind die Buttons sinnvoll.
  const hlPhase = s.comebackHL?.phase;
  const inHLGame = hlPhase === 'question' || hlPhase === 'reveal' || hlPhase === 'steal';
  if (inHLGame) return null;
  const step = s.comebackIntroStep ?? 0;
  // 2 Intro-Steps insgesamt (0 + 1), danach startet das H/L-Mini-Game.
  const labels = [
    '▶ Team zeigen',
    '▶ Aktion zeigen',
    '⚡ H/L-Mini-Game starten',
  ];
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <QQTeamAvatar avatarId={team.avatarId} size={26} />
      <span style={{ fontWeight: 900, color: team.color }}>{team.name}</span>
      <span style={{ fontSize: 13, fontWeight: 900, color: '#8B5CF6' }}>
        📖 Schritt {Math.min(step + 1, 2)}/2
      </span>
      <PrimaryBtn color="#8B5CF6" onClick={() => emit('qq:comebackIntroStep', { roomCode })} hotkey="Space">
        {labels[Math.min(step, 2)]}
      </PrimaryBtn>
    </div>
  );
}

// 4×4 Connections — Moderator-Controls (Start/Begin/Force-Reveal/Placement)
function ConnectionsControls({ state: s, roomCode, emit }: any) {
  const c = s.connections;
  if (!c) return null;
  const phase = c.phase;
  // Live-Stats
  const teamIds = Object.keys(c.teamProgress ?? {});
  const totalTeams = teamIds.length;
  const finished = teamIds.filter((id: string) => (c.teamProgress[id]?.finishedAt ?? null) != null).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 13, fontWeight: 900, color: '#FBBF24', letterSpacing: 0.4, textTransform: 'uppercase' }}>
        🔗 4×4 · {phase}
      </span>
      {phase === 'intro' && (
        <PrimaryBtn color="#FBBF24" onClick={() => emit('qq:connectionsBegin', { roomCode })} hotkey="Space">
          ▶ Spielzeit starten ({c.durationSec}s)
        </PrimaryBtn>
      )}
      {phase === 'active' && (
        <>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            {finished}/{totalTeams} fertig
          </span>
          <PrimaryBtn color="#F59E0B" onClick={() => emit('qq:connectionsForceReveal', { roomCode })}>
            ⏹ Auflösen
          </PrimaryBtn>
        </>
      )}
      {phase === 'reveal' && (
        <PrimaryBtn color="#22C55E" onClick={() => emit('qq:connectionsToPlacement', { roomCode })} hotkey="Space">
          ▶ Setzen starten
        </PrimaryBtn>
      )}
      {phase === 'placement' && (
        <span style={{ fontSize: 12, color: '#94a3b8' }}>
          Setzen läuft — Cursor #{(c.placementCursor ?? 0) + 1}/{(c.placementOrder ?? []).length}, ×{c.placementRemaining}
        </span>
      )}
      {phase === 'done' && (
        <PrimaryBtn color="#22C55E" onClick={() => emit('qq:nextQuestion', { roomCode })} hotkey="Space">
          🏆 Spielende
        </PrimaryBtn>
      )}
      {/* Skip: 4×4 abbrechen und direkt zu Game Over springen — falls
          unterwegs etwas klemmt oder die Moderator-Person das Finale
          überspringen will. */}
      {phase !== 'done' && (
        <button onClick={() => {
          if (window.confirm('4×4 abbrechen und direkt zu Game Over?')) {
            emit('qq:connectionsSkipToGameOver', { roomCode });
          }
        }} style={{
          padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)',
          background: 'transparent', color: '#FCA5A5', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          marginLeft: 'auto',
        }} title="4×4 überspringen → Game Over">
          ⏭ Skip → Spielende
        </button>
      )}
    </div>

    {/* Team-Status-Übersicht: pro Team Avatar + Found-Groups + Fail-Counter.
        Damit der Mod das Finale-Geschehen verfolgen kann (sonst sieht er nur
        Phase + Buttons). User-Wunsch 2026-04-28. */}
    {(phase === 'active' || phase === 'reveal' || phase === 'placement') && (
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 6, padding: '8px 10px', borderRadius: 8,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {s.teams.map((tm: any) => {
          const tp = c.teamProgress?.[tm.id];
          if (!tp) return null;
          const foundCount = (tp.foundGroupIds ?? []).length;
          const fails = tp.failedAttempts ?? 0;
          const locked = tp.isLockedOut;
          const finished = tp.finishedAt != null;
          const isPlacing = phase === 'placement' && c.placementOrder?.[c.placementCursor ?? 0] === tm.id;
          const statusBg = isPlacing ? 'rgba(34,197,94,0.18)'
            : locked ? 'rgba(239,68,68,0.10)'
            : finished ? 'rgba(251,191,36,0.10)'
            : 'rgba(255,255,255,0.02)';
          const statusBorder = isPlacing ? 'rgba(34,197,94,0.55)'
            : locked ? 'rgba(239,68,68,0.4)'
            : finished ? 'rgba(251,191,36,0.4)'
            : tm.color + '44';
          return (
            <div key={tm.id} style={{
              padding: '6px 10px', borderRadius: 8,
              background: statusBg,
              border: `1.5px solid ${statusBorder}`,
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%', background: tm.color,
                  flexShrink: 0,
                }} />
                <TeamNameLabel
                  name={tm.name}
                  maxLines={1}
                  shrinkAfter={14}
                  fontSize={12}
                  color="#e2e8f0"
                  fontWeight={800}
                  style={{ flex: 1 }}
                />
                {isPlacing && <span style={{ fontSize: 10, fontWeight: 900, color: '#86efac' }}>SETZT</span>}
                {locked && <span style={{ fontSize: 10, fontWeight: 900, color: '#FCA5A5' }}>RAUS</span>}
                {finished && !locked && <span style={{ fontSize: 10, fontWeight: 900, color: '#FBBF24' }}>FERTIG</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                {/* Found-Groups als 4 Dots */}
                <div style={{ display: 'flex', gap: 2 }}>
                  {[0, 1, 2, 3].map(i => (
                    <span key={i} style={{
                      width: 8, height: 8, borderRadius: 2,
                      background: i < foundCount ? '#22C55E' : 'rgba(255,255,255,0.10)',
                      border: i < foundCount ? '1px solid #16A34A' : '1px solid rgba(255,255,255,0.18)',
                    }} />
                  ))}
                </div>
                <span style={{ color: '#94a3b8' }}>· Gruppen {foundCount}/4</span>
                {fails > 0 && <span style={{ color: '#FCA5A5', marginLeft: 'auto' }}>✕ {fails}/{c.maxFailedAttempts}</span>}
                {phase === 'placement' && tp && tp.placementRemaining != null && tp.placementRemaining > 0 && (
                  <span style={{ color: '#86efac', marginLeft: 'auto' }}>×{tp.placementRemaining}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    )}
    </div>
  );
}

// J2 IdleHint: zeigt nach 15s Inaktivitaet einen Space-drueck-Reminder.
// Reset bei Phase-Change. Nur in Phasen wo Space sinnvoll weitergehen wuerde.
function IdleHint({ state }: { state: QQStateUpdate }) {
  const [visible, setVisible] = useState(false);
  const phase = state.phase;
  const rulesIdx = state.rulesSlideIndex ?? 0;
  const stepKey = `${phase}|${rulesIdx}|${state.currentQuestion?.id ?? ''}|${state.comebackIntroStep ?? ''}|${state.muchoRevealStep ?? ''}|${state.zvzRevealStep ?? ''}|${state.cheeseRevealStep ?? ''}|${state.mapRevealStep ?? ''}`;
  useEffect(() => {
    setVisible(false);
    const relevantPhases = ['RULES', 'PHASE_INTRO', 'QUESTION_REVEAL', 'COMEBACK_CHOICE', 'TEAMS_REVEAL'];
    if (!relevantPhases.includes(phase)) return;
    const t = setTimeout(() => setVisible(true), 15000);
    return () => clearTimeout(t);
  }, [stepKey, phase]);
  if (!visible) return null;
  return (
    <div aria-hidden style={{
      position: 'fixed', bottom: 30, left: '50%',
      transform: 'translateX(-50%)', zIndex: 9500,
      pointerEvents: 'none',
      padding: '8px 20px', borderRadius: 999,
      background: 'rgba(15,12,9,0.88)',
      border: '1.5px solid rgba(251,191,36,0.5)',
      boxShadow: '0 6px 20px rgba(0,0,0,0.45), 0 0 18px rgba(251,191,36,0.25)',
      fontSize: 13, fontWeight: 900, color: '#FDE68A',
      display: 'flex', alignItems: 'center', gap: 10,
      animation: 'idleHintPulse 1.8s ease-in-out infinite',
    }}>
      <kbd style={{
        padding: '2px 10px', borderRadius: 6,
        background: 'rgba(251,191,36,0.2)', border: '1.5px solid rgba(251,191,36,0.6)',
        fontFamily: 'monospace', fontSize: 11, fontWeight: 900,
      }}>Space</kbd>
      <span>druecken um weiter</span>
    </div>
  );
}

function RulesControls({ state: s, roomCode, emit, onStartGame }: {
  state: QQStateUpdate; roomCode: string; emit: any; onStartGame: () => void;
}) {
  const totalSlides = 8;
  const idx = s.rulesSlideIndex ?? 0;
  const isWelcome = idx === -2;
  const isRulesIntro = idx === -1;
  const isFirst = idx <= -2;
  const isLast = idx >= totalSlides - 1;
  // Live-Spiegel der Regel-Folien (synchron mit buildRulesSlidesDe in
  // QQBeamerPage). Hilft dem Mod zu sehen WAS gerade auf dem Beamer steht.
  const slideTitles = [
    '🏆 Das Ziel',
    '⚡ So läuft\'s',
    '🗺 Roadmap',
    '⭐ Joker-Bonus',
    '🔓 Neue Fähigkeiten',
    '🎁 Bunte Tüte',
    '🔄 Comeback',
    '🧩 Großes Finale',
  ];
  const label = isWelcome
    ? '🎬 Willkommen'
    : isRulesIntro
      ? '📣 Regel-Intro'
      : `📖 ${slideTitles[idx] ?? `Folie ${idx + 1}`}  (${idx + 1}/${totalSlides})`;
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 13, fontWeight: 900, color: '#8B5CF6' }}>
        {label}
      </span>
      <Btn small color="#64748b" onClick={() => emit('qq:rulesPrev', { roomCode })} outline={isFirst}>
        ◀ Zurück
      </Btn>
      {!isLast ? (
        <Btn small color="#8B5CF6" onClick={() => emit('qq:rulesNext', { roomCode })}>
          Weiter ▶
        </Btn>
      ) : (
        <Btn small color="#22C55E" onClick={() => emit('qq:rulesFinish', { roomCode })}>
          ▶ Runde 1 starten
        </Btn>
      )}
      <Btn small color="#EF4444" outline onClick={() => emit('qq:rulesFinish', { roomCode })}>
        ⏭ Überspringen
      </Btn>
    </div>
  );
}

function CollapsibleGrid({ state: s }: { state: QQStateUpdate }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
          color: '#94a3b8', fontFamily: 'inherit',
        }}
      >
        <span style={sectionLabel}>Grid {s.gridSize}×{s.gridSize}</span>
        <span style={{ fontSize: 15, color: '#475569' }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px' }}>
          <MiniGrid state={s} />
        </div>
      )}
    </div>
  );
}

function MiniGrid({ state: s }: { state: QQStateUpdate }) {
  const cellSize = Math.min(44, Math.floor(316 / s.gridSize));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${s.gridSize}, ${cellSize}px)`, gap: 3 }}>
      {s.grid.flatMap((row, r) =>
        row.map((cell, c) => {
          const team = s.teams.find(t => t.id === cell.ownerId);
          return (
            <div key={`${r}-${c}`} style={{
              width: cellSize, height: cellSize, borderRadius: 5,
              background: team ? `${team.color}99` : 'rgba(255,255,255,0.05)',
              border: cell.jokerFormed
                ? '1px solid rgba(251,191,36,0.7)'
                : `1px solid ${team ? `${team.color}44` : 'rgba(255,255,255,0.06)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: Math.max(9, cellSize * 0.36),
            }}>
              {cell.jokerFormed ? <QQEmojiIcon emoji="🃏"/> : (team ? <QQTeamAvatar avatarId={team.avatarId} size={Math.max(18, Math.floor(cellSize * 0.88))} /> : '')}
            </div>
          );
        })
      )}
    </div>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <div className="qm-pill" style={{ ['--qm-pill-color' as any]: color }}>
      {label}
    </div>
  );
}

function Btn({ children, color, onClick, outline = false, small = false }: {
  children: React.ReactNode; color: string; onClick: () => void;
  outline?: boolean; small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="qm-btn"
      data-outline={outline ? 'true' : undefined}
      data-small={small ? 'true' : undefined}
      style={{ ['--qm-btn-color' as any]: color }}
    >
      {children}
    </button>
  );
}

/** Big primary action button — the "do the next thing" button */
function PrimaryBtn({ children, color, onClick, hotkey, pulse = false }: {
  children: React.ReactNode; color: string; onClick: () => void; hotkey?: string; pulse?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="qm-primary"
      data-pulse={pulse ? 'true' : undefined}
      style={{ ['--qm-btn-color' as any]: color }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{children}</span>
      {hotkey && <span className="qm-kbd qm-kbd-sm">{hotkey}</span>}
    </button>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function actionLabel(action: string, stats: any): string {
  if (action === 'PLACE_1')   return '1 Feld setzen';
  if (action === 'PLACE_2')   return `2 Felder (${stats?.placementsLeft ?? 2} übrig)`;
  if (action === 'STEAL_1')   return '1 Feld klauen';
  if (action === 'FREE')      return 'Setzen oder Klauen';
  if (action === 'SHIELD_1')  return '🛡️ Schild';
  if (action === 'STAPEL_1')  return '🏯 Stapeln';
  if (action === 'SWAP_1')    return '🔄 Tauschen';
  if (action === 'SANDUHR_1') return '⏳ Bann';
  return action;
}

function phasePillStyle(phase: string): React.CSSProperties {
  const colors: Record<string, string> = {
    LOBBY: '#475569', RULES: '#6366f1', PHASE_INTRO: '#3B82F6', QUESTION_ACTIVE: '#22C55E',
    QUESTION_REVEAL: '#F59E0B', PLACEMENT: '#EF4444',
    COMEBACK_CHOICE: '#8B5CF6', PAUSED: '#F59E0B', GAME_OVER: '#64748b',
  };
  const c = colors[phase] ?? '#475569';
  return {
    padding: '3px 10px', borderRadius: 999,
    background: `${c}22`, border: `1px solid ${c}44`,
    color: c, fontSize: 11, fontWeight: 900,
    textTransform: 'uppercase', letterSpacing: '0.04em',
  };
}

function badgeStyle(color: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center',
    padding: '4px 12px', borderRadius: 999,
    background: `linear-gradient(180deg, ${color}24, ${color}10)`,
    border: `1px solid ${color}55`,
    color, fontSize: 11, fontWeight: 900,
    textTransform: 'uppercase', letterSpacing: '0.1em',
    boxShadow: `0 0 12px ${color}22, inset 0 1px 0 rgba(255,255,255,0.08)`,
  };
}

// ── Danger-Menu (Reset-Aktionen) ──────────────────────────────────────────────

function DangerMenu({ onRestart, onBackToSetup, roomCode, phase }: {
  onRestart: () => void; onBackToSetup: () => void;
  roomCode: string; phase: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  // TEMP: auch in Production sichtbar für 8-Team-Test. Nach Test zurück auf `import.meta.env.DEV`.
  const devEnabled = true;
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  async function devFillTeams() {
    setBusy('fill');
    try {
      const r = await fetch(`/api/qq/${encodeURIComponent(roomCode)}/dev/fillTeams`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 8 }),
      });
      const data = await r.json();
      if (!r.ok) alert(`Fehler: ${data.error ?? 'unbekannt'}`);
    } finally { setBusy(null); }
  }
  return (
    <div ref={ref} style={{ position: 'relative', marginLeft: 'auto' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
          border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)',
          color: '#EF4444', fontFamily: 'inherit', fontWeight: 900, fontSize: 12,
        }}
        title="Reset-Aktionen"
      >⋯ Reset</button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 20,
          background: '#1B1510', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 8, padding: 6, minWidth: 260,
          boxShadow: '0 12px 28px rgba(0,0,0,0.6)',
        }}>
          <button
            onClick={() => { setOpen(false); onRestart(); }}
            style={menuItemStyle('#F59E0B')}
          >↺ Quiz neustarten
            <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Punkte & Grid reset, Teams bleiben</span>
          </button>
          <button
            onClick={() => { setOpen(false); onBackToSetup(); }}
            style={menuItemStyle('#EF4444')}
          >⎌ Zurück zum Setup
            <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Teams kicken, Einstellungen neu</span>
          </button>
          {devEnabled && (
            <>
              <div style={{
                marginTop: 6, padding: '4px 10px',
                fontSize: 9, color: '#64748b', fontWeight: 900, letterSpacing: '0.1em',
                textTransform: 'uppercase', borderTop: '1px solid rgba(255,255,255,0.05)',
              }}>🧪 Dev</div>
              <button
                disabled={phase !== 'LOBBY' || busy !== null}
                onClick={() => devFillTeams()}
                style={{
                  ...menuItemStyle('#22C55E'),
                  opacity: phase !== 'LOBBY' || busy !== null ? 0.4 : 1,
                  cursor: phase !== 'LOBBY' || busy !== null ? 'not-allowed' : 'pointer',
                }}
              >{busy === 'fill' ? '…' : '👥'} 8 Dummy-Teams
                <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>
                  {phase === 'LOBBY' ? 'Antworten + Platzieren passieren automatisch' : 'Nur in Lobby verfügbar'}
                </span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const menuItemStyle = (accent: string): React.CSSProperties => ({
  display: 'block', width: '100%', textAlign: 'left',
  padding: '8px 10px', borderRadius: 6, border: 'none',
  background: 'transparent', color: accent,
  cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 900,
});

// ── Setup View ────────────────────────────────────────────────────────────────

function SetupView({
  s, drafts, selectedDraftId, setSelectedDraftId, phases, setPhases,
  timerInput, setTimerInput, applyTimer, localSoundConfig, setLocalSoundConfig,
  roomCode, emit, finishSetup,
}: {
  s: QQStateUpdate;
  drafts: DraftSummary[];
  selectedDraftId: string;
  setSelectedDraftId: (v: string) => void;
  phases: 3 | 4;
  setPhases: (v: 3 | 4) => void;
  timerInput: number;
  setTimerInput: (v: number) => void;
  applyTimer: () => void;
  localSoundConfig: QQSoundConfig;
  setLocalSoundConfig: (v: QQSoundConfig) => void;
  roomCode: string;
  emit: (event: string, payload: any) => Promise<{ ok: boolean; error?: string }>;
  finishSetup: () => void;
}) {
  void emit; // stays in signature for future use, currently not needed after moving team-lobby out
  // Load the currently-selected draft's soundConfig (persistent per draft).
  const qqDraftId = selectedDraftId.startsWith('qq:') ? selectedDraftId.slice(3) : selectedDraftId;
  const [draftSoundConfig, setDraftSoundConfig] = useState<QQSoundConfig>({});
  const [savingSound, setSavingSound] = useState(false);
  const [customSoundsOpen, setCustomSoundsOpen] = useState(false);

  // Reload the draft's soundConfig whenever the selected draft changes.
  useEffect(() => {
    if (!qqDraftId) { setDraftSoundConfig({}); return; }
    let cancelled = false;
    fetch(`/api/qq/drafts/${encodeURIComponent(qqDraftId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d) setDraftSoundConfig(d.soundConfig ?? {}); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [qqDraftId]);

  // Save soundConfig back into the draft (PUT).
  async function persistDraftSoundConfig(cfg: QQSoundConfig) {
    if (!qqDraftId) return;
    setSavingSound(true);
    try {
      // GET current draft, patch soundConfig, PUT it back (preserve other fields).
      const res = await fetch(`/api/qq/drafts/${encodeURIComponent(qqDraftId)}`);
      if (!res.ok) return;
      const draft = await res.json();
      draft.soundConfig = cfg;
      await fetch(`/api/qq/drafts/${encodeURIComponent(qqDraftId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
    } finally { setSavingSound(false); }
  }

  // Apply current soundConfig to ALL drafts.
  async function applySoundsToAllDrafts() {
    if (!window.confirm(`Diese Sound-Einstellungen auf alle ${drafts.length} Fragensätze übernehmen?`)) return;
    setSavingSound(true);
    try {
      for (const d of drafts) {
        const id = d.id.startsWith('qq:') ? d.id.slice(3) : d.id;
        const res = await fetch(`/api/qq/drafts/${encodeURIComponent(id)}`);
        if (!res.ok) continue;
        const draft = await res.json();
        draft.soundConfig = draftSoundConfig;
        await fetch(`/api/qq/drafts/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        });
      }
      alert('Sounds auf alle Fragensätze übernommen.');
    } finally { setSavingSound(false); }
  }

  const selectedDraft = drafts.find(d => d.id === selectedDraftId);

  // ── Farb-Tokens für Setup (wärmer als der Live-Modus) ─────────────────────
  const GOLD = '#F59E0B';
  const GOLD_SOFT = 'rgba(245,158,11,0.15)';
  const GOLD_BORDER = 'rgba(245,158,11,0.45)';

  // Erweiterte Optionen (Comeback-Timer, Bestenliste-Reset, Apply-Sounds-All)
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const sectionCard: React.CSSProperties = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: 13, fontWeight: 900, color: '#e2e8f0',
    marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
    letterSpacing: '0.04em',
  };

  const fieldLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 900, color: '#64748b',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em',
  };

  // Warm selector pill (Gold-Akzent statt blau)
  const pillBtn = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontWeight: 900, fontSize: 13, fontFamily: 'inherit',
    background: active ? GOLD : 'rgba(255,255,255,0.05)',
    color: active ? '#1a1206' : '#94a3b8',
    boxShadow: active ? '0 3px 10px rgba(245,158,11,0.35)' : 'none',
    transition: 'all 0.15s',
  });

  const toggleBtn = (active: boolean, activeColor = '#22C55E'): React.CSSProperties => ({
    padding: '9px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
    fontWeight: 900, fontSize: 13, width: '100%', textAlign: 'left' as const,
    border: `1px solid ${active ? activeColor : 'rgba(255,255,255,0.09)'}`,
    background: active ? `${activeColor}1a` : 'rgba(255,255,255,0.03)',
    color: active ? activeColor : '#94a3b8',
    transition: 'all 0.15s',
  });

  // ── Helpers für die neue Pill-Row ─────────────────────────────────────────
  // Segmented-Group-Pill (warm cozy, gold-Akzent für aktive)
  const segPill = (active: boolean, accent = GOLD): React.CSSProperties => ({
    padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontWeight: 900, fontSize: 13, fontFamily: 'inherit',
    background: active ? accent : 'transparent',
    color: active ? '#1a1206' : '#a8a395',
    boxShadow: active ? `0 2px 0 rgba(0,0,0,0.35), 0 0 16px ${accent}55` : 'none',
    transition: 'all 0.15s',
    minWidth: 38,
  });
  const segGroup: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 2,
    padding: 4, borderRadius: 16,
    background: 'rgba(0,0,0,0.32)',
    border: '1px solid rgba(255,235,200,0.08)',
    boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.45)',
  };
  // Kompakter — User-Wunsch 2026-04-28: 'fühlt sich noch nicht so nice an'.
  // Vorher: padding 10px + minHeight 44. Jetzt 6/36 → ~30 % weniger Whitespace.
  const settingRow: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '6px 4px', minHeight: 36,
  };
  const settingLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 900, color: '#a8a395',
    letterSpacing: '0.1em', textTransform: 'uppercase',
    minWidth: 86, display: 'inline-flex', alignItems: 'center', gap: 6,
  };

  const draft = drafts.find(x => x.id === selectedDraftId);
  const fitNeeded = phases * 5;
  // OK = genug Fragen vorhanden (gleich oder mehr); bei mehr wird truncated.
  const fitOK = draft ? draft.questionCount >= fitNeeded : false;
  const fitTruncate = draft ? draft.questionCount > fitNeeded : false;

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 120, paddingTop: 8 }}>

      {/* ── HERO: Fragensatz als Karten-Grid (statt Dropdown) ── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        padding: '20px 24px 22px', borderRadius: 24,
        background:
          'radial-gradient(ellipse at 0% 0%, rgba(245,158,11,0.22), transparent 55%),' +
          'radial-gradient(ellipse at 100% 100%, rgba(244,114,182,0.14), transparent 60%),' +
          'linear-gradient(180deg, #1f1610, #150e08)',
        border: `1px solid ${GOLD_BORDER}`,
        boxShadow:
          '0 12px 36px rgba(0,0,0,0.5),' +
          '0 0 60px rgba(245,158,11,0.10),' +
          'inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 900, color: GOLD, marginBottom: 12,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <span>📚 Fragensatz wählen</span>
          {savingSound && <span style={{ fontSize: 10, color: GOLD, fontWeight: 700, opacity: 0.7 }}>• speichert…</span>}
        </div>
        {drafts.length === 0 ? (
          <div style={{ color: '#a8a395', fontSize: 14, fontStyle: 'italic', padding: '20px 0' }}>
            Keine Fragensätze gefunden. Im Builder anlegen oder importieren.
          </div>
        ) : (
          <div style={{
            display: 'grid', gap: 10,
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}>
            {drafts.map(d => {
              const sel = d.id === selectedDraftId;
              const draftFit = d.questionCount >= phases * 5;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDraftId(d.id)}
                  style={{
                    textAlign: 'left',
                    padding: '12px 14px', borderRadius: 16,
                    border: sel ? `2px solid ${GOLD}` : '1.5px solid rgba(255,220,180,0.12)',
                    background: sel
                      ? 'linear-gradient(180deg, rgba(245,158,11,0.18), rgba(245,158,11,0.06))'
                      : 'rgba(0,0,0,0.32)',
                    color: '#fef3c7', cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: sel
                      ? '0 6px 18px rgba(245,158,11,0.25), inset 0 1px 0 rgba(255,255,255,0.06)'
                      : 'inset 0 1px 0 rgba(0,0,0,0.4)',
                    transition: 'all 0.15s',
                    display: 'flex', flexDirection: 'column', gap: 6,
                  }}>
                  <div style={{
                    fontSize: 14, fontWeight: 900, lineHeight: 1.2,
                    color: sel ? '#fef3c7' : '#e2e8f0',
                  }}>{d.title}</div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                    fontSize: 11, fontWeight: 700, color: '#a8a395',
                  }}>
                    <span>{d.questionCount} Fragen</span>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span style={{
                      padding: '1px 8px', borderRadius: 999,
                      background: draftFit ? 'rgba(34,197,94,0.14)' : 'rgba(251,191,36,0.14)',
                      border: `1px solid ${draftFit ? 'rgba(34,197,94,0.32)' : 'rgba(251,191,36,0.32)'}`,
                      color: draftFit ? '#86efac' : '#fde68a',
                      fontWeight: 900,
                    }}>{draftFit ? `✓ ${phases} Rd.` : `⚠ ${Math.floor(d.questionCount / 5)} Rd.`}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {selectedDraft && fitTruncate && (
          <div style={{
            marginTop: 10, fontSize: 11, fontWeight: 700, color: '#fde68a',
            padding: '6px 12px', borderRadius: 8,
            background: 'rgba(251,191,36,0.10)',
            border: '1px solid rgba(251,191,36,0.25)',
          }}>
            ℹ Set hat {selectedDraft.questionCount} Fragen — nutze die ersten {fitNeeded} ({phases} Runden × 5)
          </div>
        )}
      </div>

      {/* ── SCHEDULE-VORSCHAU — was kommt in welcher Runde ── */}
      {selectedDraft && fitOK && (
        <SchedulePreview draftId={qqDraftId} phases={phases} />
      )}

      {/* ── QUICK-SETTINGS — alles auf einen Blick als Pill-Reihen ── */}
      <div style={{
        padding: '14px 20px',
        borderRadius: 16,
        background: 'linear-gradient(180deg, rgba(255,235,200,0.045), rgba(255,235,200,0.015))',
        border: '1px solid rgba(255,220,180,0.10)',
        boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 900, color: '#6b6555',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          marginBottom: 6,
        }}>⚡ Quick-Settings</div>

        {/* Runden */}
        <div style={settingRow}>
          <span style={settingLabel}>🎮 Runden</span>
          <div style={segGroup}>
            {([3, 4] as const).map(n => (
              <button key={n} onClick={() => setPhases(n)} style={segPill(phases === n)}>{n}</button>
            ))}
          </div>
        </div>

        {/* Timer */}
        <div style={settingRow}>
          <span style={settingLabel}>⏱ Timer</span>
          <div style={segGroup}>
            {[15, 30, 45, 60, 90].map(t => (
              <button
                key={t}
                onClick={() => { setTimerInput(t); emit('qq:setTimer', { roomCode, durationSec: t }); }}
                style={segPill(s.timerDurationSec === t)}
              >{t}s</button>
            ))}
          </div>
        </div>

        {/* Sprache */}
        <div style={settingRow}>
          <span style={settingLabel}>🌐 Sprache</span>
          <div style={segGroup}>
            {(['de', 'en', 'both'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => emit('qq:setLanguage', { roomCode, language: lang })}
                style={{ ...segPill(s.language === lang), fontSize: 18, padding: '4px 12px' }}
                title={lang === 'de' ? 'Deutsch' : lang === 'en' ? 'English' : 'Beide (Flip)'}
              >{lang === 'de' ? '🇩🇪' : lang === 'en' ? '🇬🇧' : '🌐'}</button>
            ))}
          </div>
        </div>

        {/* 3D-Grid-Transition */}
        <div style={settingRow}>
          <span style={settingLabel}>🏙 Grid</span>
          <div style={segGroup}>
            <button onClick={() => emit('qq:setEnable3D', { roomCode, enabled: false })} style={segPill(!s.enable3DTransition)}>2D</button>
            <button onClick={() => emit('qq:setEnable3D', { roomCode, enabled: true })} style={segPill(!!s.enable3DTransition, '#A78BFA')}>2D → 3D</button>
          </div>
          <span style={{ fontSize: 11, color: '#6b6555', fontWeight: 700, marginLeft: 4 }}>
            {s.enable3DTransition ? 'Cinematic Fahrt beim Placement' : 'Flat 2D, schneller'}
          </span>
        </div>

        {/* Finalrunde 4×4 Connections */}
        <div style={settingRow}>
          <span style={settingLabel}>🔗 Finale</span>
          <div style={segGroup}>
            <button onClick={() => emit('qq:setQuizOptions', { roomCode, connectionsEnabled: true })} style={segPill(s.connectionsEnabled !== false, '#FBBF24')}>An</button>
            <button onClick={() => emit('qq:setQuizOptions', { roomCode, connectionsEnabled: false })} style={segPill(s.connectionsEnabled === false)}>Aus</button>
          </div>
          <span style={{ fontSize: 11, color: '#6b6555', fontWeight: 700, marginLeft: 4 }}>
            {s.connectionsEnabled !== false ? '4×4 nach Runde 4' : 'Direkt zu Game Over nach Runde 4'}
          </span>
        </div>

        {/* Reihenfolge der Fragen innerhalb der Runde */}
        <div style={settingRow}>
          <span style={settingLabel}>🔀 Reihenfolge</span>
          <div style={segGroup}>
            <button onClick={() => emit('qq:setQuizOptions', { roomCode, shuffleQuestionsInRound: true })} style={segPill(s.shuffleQuestionsInRound !== false, '#A78BFA')}>Zufällig</button>
            <button onClick={() => emit('qq:setQuizOptions', { roomCode, shuffleQuestionsInRound: false })} style={segPill(s.shuffleQuestionsInRound === false)}>Aus Draft</button>
          </div>
          <span style={{ fontSize: 11, color: '#6b6555', fontWeight: 700, marginLeft: 4 }}>
            {s.shuffleQuestionsInRound !== false ? 'Kategorien werden in jeder Runde gemischt' : 'Reihenfolge wie im Draft'}
          </span>
        </div>

        {/* Bluff: Moderator-Review-Toggle */}
        <div style={settingRow}>
          <span style={settingLabel}>🎭 Bluff-Check</span>
          <div style={segGroup}>
            <button onClick={() => emit('qq:bluffSettings', { roomCode, modReview: false })} style={segPill(!s.bluffModeratorReview)}>Aus</button>
            <button onClick={() => emit('qq:bluffSettings', { roomCode, modReview: true })} style={segPill(!!s.bluffModeratorReview, '#F472B6')}>An</button>
          </div>
          <span style={{ fontSize: 11, color: '#6b6555', fontWeight: 700, marginLeft: 4 }}>
            {s.bluffModeratorReview ? 'Moderator filtert Bluffs vor dem Voting' : 'Bluffs gehen direkt ins Voting'}
          </span>
        </div>

        {/* 2026-05-04 — Avatar-Theme (Phase 1: nur State-Propagation) */}
        <div style={{ ...settingRow, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <span style={{ ...settingLabel, marginTop: 6 }}>🧑‍🎨 Avatar</span>
          <div
            style={{
              display: 'flex', gap: 6, flex: 1,
              overflowX: 'auto', padding: '2px 2px 6px',
              scrollbarWidth: 'thin',
              scrollSnapType: 'x mandatory',
            }}
            className="qq-mod-set-row"
          >
            {AVATAR_SETS.map(set => {
              const active = (s.avatarSetId ?? 'cozyAnimals') === set.id;
              return (
                <button
                  key={set.id}
                  type="button"
                  onClick={() => emit('qq:setAvatarSet', { roomCode, avatarSetId: set.id })}
                  style={{
                    flex: '0 0 auto',
                    scrollSnapAlign: 'start',
                    padding: '7px 12px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 900,
                    fontSize: 12,
                    fontFamily: 'inherit',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: active
                      ? `linear-gradient(135deg, ${set.tint}33, ${set.tint}11)`
                      : 'rgba(0,0,0,0.32)',
                    color: active ? '#fff' : '#a8a395',
                    boxShadow: active
                      ? `0 0 0 1.5px ${set.tint}, 0 0 14px ${set.tint}55`
                      : '0 0 0 1px rgba(255,235,200,0.06)',
                    transition: 'all 0.15s',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  title={set.label}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{set.leadEmoji}</span>
                  <span>{set.label}</span>
                </button>
              );
            })}
          </div>
          <span style={{ fontSize: 11, color: '#6b6555', fontWeight: 700, marginLeft: 4, width: '100%' }}>
            {(() => {
              const id = s.avatarSetId ?? 'all';
              if (id === 'all')         return 'Standard · Spieler wählen aus den 8 Default-Emojis (Cozy-Tiere)';
              if (id === 'cozyCast')    return 'CozyCast · klassische PNG-Avatare (alter Look)';
              if (id === 'cozyAnimals') return 'Cozy Animals · Tier-Emojis als Theme';
              const set = AVATAR_SETS.find(x => x.id === id);
              return set ? `${set.label}-Set · Spieler-Picker zeigt Theme-Emojis` : '';
            })()}
          </span>
        </div>

        {/* Sound: Mute + Volume + Custom-Toggle in einer Reihe */}
        <div style={{ ...settingRow, flexWrap: 'wrap' }}>
          <span style={settingLabel}>🔊 Sound</span>
          <div style={segGroup}>
            <button
              onClick={() => emit('qq:setMusicMuted', { roomCode, muted: !s.musicMuted })}
              style={segPill(!s.musicMuted, '#22C55E')}
              title="Musik an/aus"
            >{s.musicMuted ? '🔇 Musik' : '🎵 Musik'}</button>
            <button
              onClick={() => emit('qq:setSfxMuted', { roomCode, muted: !s.sfxMuted })}
              style={segPill(!s.sfxMuted, '#22C55E')}
              title="SFX an/aus"
            >{s.sfxMuted ? '🔇 SFX' : '🔉 SFX'}</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 160 }}>
            <input
              type="range" min={0} max={100} step={5}
              value={Math.round((s.volume ?? 0.8) * 100)}
              onChange={e => emit('qq:setVolume', { roomCode, volume: Number(e.target.value) / 100 })}
              style={{ flex: 1, accentColor: GOLD }}
            />
            <span style={{ fontSize: 12, color: '#fef3c7', minWidth: 36, fontWeight: 900, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
              {Math.round((s.volume ?? 0.8) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* ── ERWEITERTE OPTIONEN — collapsible ───────────────────────────── */}
      <div style={{
        borderRadius: 16,
        background: 'linear-gradient(180deg, rgba(255,235,200,0.025), rgba(255,235,200,0.008))',
        border: '1px solid rgba(255,220,180,0.08)',
      }}>
        <button
          onClick={() => setAdvancedOpen(v => !v)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 18px', borderRadius: 16,
            border: 'none', background: 'transparent',
            color: '#a8a395', fontFamily: 'inherit', fontWeight: 900, fontSize: 12,
            letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'inline-block', transition: 'transform 0.25s ease',
              transform: advancedOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            }}>▶</span>
            ⚙ Erweiterte Optionen
            {!advancedOpen && (
              <span style={{ fontSize: 10, color: '#6b6555', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'none' }}>
                · Comeback-Timer · Custom Sounds · Bestenliste-Reset
              </span>
            )}
          </span>
        </button>

        {advancedOpen && (
          <div style={{ padding: '4px 18px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Comeback Timer */}
            <div>
              <div style={fieldLabel}>⚡ Comeback „Mehr oder Weniger" — Timer pro Runde</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', maxWidth: 280 }}>
                <input
                  type="number"
                  min={3}
                  max={60}
                  value={s.comebackHLTimerSec ?? 10}
                  onChange={e => {
                    const v = Math.max(3, Math.min(60, Number(e.target.value) || 10));
                    emit('qq:comebackHLTimer', { roomCode, seconds: v });
                  }}
                  style={{
                    flex: 1, padding: '8px 14px', borderRadius: 8,
                    border: '1px solid rgba(255,220,180,0.18)',
                    background: 'rgba(0,0,0,0.4)', color: '#fef3c7',
                    fontSize: 14, fontWeight: 900, fontFamily: 'inherit',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 900, color: '#6b6555' }}>Sek</span>
              </div>
              <div style={{ fontSize: 10, color: '#6b6555', marginTop: 4 }}>
                Zeit pro H/L-Runde beim Comeback (3-60 s). Default: 10 s.
              </div>
            </div>

            {/* Custom Sounds Slot */}
            <div>
              <div style={fieldLabel}>🎵 Custom Sounds pro Slot</div>
              <button
                onClick={() => setCustomSoundsOpen(v => !v)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  border: '1px solid rgba(255,220,180,0.12)',
                  background: 'rgba(255,235,200,0.03)', color: '#a8a395',
                  cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900, fontSize: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <span>Timer-Loop, Korrekt, Falsch, Phase-Intro …</span>
                <span style={{ fontSize: 10, transition: 'transform 0.2s', transform: customSoundsOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
              </button>
              {customSoundsOpen && (
                <div style={{ marginTop: 10 }}>
                  <QQSoundPanel
                    config={draftSoundConfig}
                    onChange={cfg => {
                      setDraftSoundConfig(cfg);
                      setLocalSoundConfig(cfg);
                      emit('qq:updateSoundConfig', { roomCode, soundConfig: cfg });
                      persistDraftSoundConfig(cfg);
                    }}
                  />
                </div>
              )}
              {qqDraftId && (
                <button
                  onClick={applySoundsToAllDrafts}
                  disabled={savingSound}
                  style={{
                    marginTop: 8,
                    padding: '7px 14px', borderRadius: 8, cursor: savingSound ? 'wait' : 'pointer',
                    border: `1px solid ${GOLD_BORDER}`, background: GOLD_SOFT,
                    color: GOLD, fontSize: 11, fontWeight: 900, fontFamily: 'inherit',
                  }}
                  title="Diese Sounds auf alle Fragensätze übernehmen"
                >📋 Sounds auf alle Fragensätze übernehmen</button>
              )}
            </div>

            {/* Bestenliste leeren */}
            <div>
              <div style={fieldLabel}>🗑 Bestenliste (Lobby/Pause)</div>
              <button
                onClick={async () => {
                  if (!window.confirm('Wirklich ALLE gespeicherten Spiel-Ergebnisse loeschen? Die Bestenliste startet bei 0. Diese Aktion ist nicht ruekgaengig zu machen.')) return;
                  try {
                    const r = await fetch('/api/qq/gameresults', { method: 'DELETE' });
                    const d = await r.json();
                    if (d.ok) {
                      alert(`Bestenliste geloescht: ${d.deleted ?? 0} Eintraege entfernt.`);
                    } else {
                      alert('Fehler beim Loeschen.');
                    }
                  } catch {
                    alert('Netzwerkfehler beim Loeschen.');
                  }
                }}
                style={{
                  padding: '8px 14px', borderRadius: 8, fontFamily: 'inherit',
                  fontWeight: 900, fontSize: 12, cursor: 'pointer',
                  border: '1px solid rgba(239,68,68,0.4)',
                  background: 'rgba(239,68,68,0.08)',
                  color: '#fca5a5',
                }}
                title="Alle Spiel-Ergebnisse aus der Datenbank loeschen (Bestenliste-Reset)"
              >
                Bestenliste leeren (Dummy-Daten weg)
              </button>
              <div style={{ fontSize: 10, color: '#6b6555', marginTop: 4 }}>
                Loescht ALLE gespeicherten Spiele → Lobby-/Pause-Rotation zeigt danach keine Eintraege bis zum naechsten echten Spielende.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Start-Voraussetzungen-Check (vor dem Sticky-Button) ──
          User-Wunsch 2026-04-28: 'Vorbedingungen sichtbar machen vor dem
          Klick, statt Alert nach Klick'. Listet die Checks die noch fehlen. */}
      {(() => {
        const issues: string[] = [];
        if (!selectedDraftId) issues.push('Kein Fragensatz gewählt');
        else if (!fitOK) issues.push(`Fragensatz hat ${selectedDraft?.questionCount ?? 0} Fragen — für ${phases} Runden braucht es ${fitNeeded}`);
        const teamCount = s.teams.length;
        if (teamCount === 0) issues.push('Noch keine Teams beigetreten (Start trotzdem möglich, dann ohne Spieler)');
        if (issues.length === 0) return null;
        return (
          <div style={{
            padding: '10px 16px', borderRadius: 16,
            background: 'rgba(251,191,36,0.06)',
            border: '1px solid rgba(251,191,36,0.25)',
            marginBottom: 4, fontSize: 12, fontWeight: 700, color: '#fde68a',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fbbf24', marginBottom: 2 }}>
              Vor dem Start
            </div>
            {issues.map((iss, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ color: '#fbbf24' }}>•</span>
                <span>{iss}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Sticky Start-Footer ── */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
        background: 'linear-gradient(180deg, rgba(13,10,6,0) 0%, rgba(13,10,6,0.95) 40%, #0D0A06 100%)',
        padding: '20px 20px 18px', pointerEvents: 'none',
      }}>
        <div style={{
          maxWidth: 1000, margin: '0 auto', display: 'flex',
          justifyContent: 'center', alignItems: 'center', gap: 14, pointerEvents: 'auto',
        }}>
          <button
            onClick={finishSetup}
            disabled={!selectedDraftId}
            style={{
              padding: '18px 56px', borderRadius: 16,
              border: 'none', cursor: selectedDraftId ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit', fontWeight: 900, fontSize: 22,
              letterSpacing: '0.04em',
              background: selectedDraftId
                ? 'linear-gradient(180deg, #22C55E, #15803D)'
                : 'rgba(255,255,255,0.05)',
              color: selectedDraftId ? '#fff' : '#475569',
              boxShadow: selectedDraftId
                ? '0 10px 30px rgba(34,197,94,0.4), 0 0 0 1px rgba(255,255,255,0.1) inset'
                : 'none',
              transition: 'transform 0.12s, box-shadow 0.2s',
              transform: 'translateY(0)',
            }}
            onMouseEnter={e => { if (selectedDraftId) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
          >✓ Setup abschließen
            <span style={{
              fontSize: 11, marginLeft: 12, padding: '3px 8px', borderRadius: 6,
              background: 'rgba(0,0,0,0.25)', opacity: 0.85, fontWeight: 700,
            }}>SPACE</span>
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, color: '#475569', marginTop: 10, pointerEvents: 'none' }}>
          Danach öffnet sich die Lobby — Teams joinen per QR, du startest das Quiz.
        </div>
      </div>

    </div>
  );
}

// ── Schedule-Vorschau im Setup ──
// Zeigt pro Runde die Kategorien-Sequenz aus dem aktuell gewählten Draft.
// Hilft dem Mod schon vor dem Start zu sehen ob's gut verteilt ist.
function SchedulePreview({ draftId, phases }: { draftId: string; phases: 3 | 4 }) {
  const [questions, setQuestions] = useState<any[] | null>(null);
  useEffect(() => {
    if (!draftId) return;
    let cancelled = false;
    fetch(`/api/qq/drafts/${encodeURIComponent(draftId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d?.questions) setQuestions(d.questions); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [draftId]);
  if (!questions) return null;
  // Pro Phase 1..N die Fragen extrahieren
  const byPhase: Record<number, any[]> = {};
  for (const q of questions) {
    const p = q.phaseIndex;
    if (p < 1 || p > phases) continue;
    if (!byPhase[p]) byPhase[p] = [];
    byPhase[p].push(q);
  }
  const CAT_EMOJI: Record<string, string> = {
    SCHAETZCHEN: '🎯', MUCHO: '🅰️', BUNTE_TUETE: '🎁',
    ZEHN_VON_ZEHN: '🎰', CHEESE: '📸',
  };
  const SUB_EMOJI: Record<string, string> = {
    onlyConnect: '🧩', bluff: '🎭', hotPotato: '🔥',
    top5: '🏆', oneOfEight: '🕵️', order: '📋', map: '🗺️',
  };
  return (
    <div style={{
      padding: '14px 18px', borderRadius: 16,
      background: 'linear-gradient(180deg, rgba(255,235,200,0.04), rgba(255,235,200,0.012))',
      border: '1px solid rgba(255,220,180,0.10)',
      boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 900, color: '#6b6555',
        letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10,
      }}>🗺 Schedule-Vorschau</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: phases }, (_, i) => i + 1).map(p => {
          const entries = byPhase[p] ?? [];
          return (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                fontSize: 11, fontWeight: 900, color: '#fde68a',
                minWidth: 70, letterSpacing: '0.04em',
              }}>Runde {p}</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {entries.map((q, i) => {
                  const isBT = q.category === 'BUNTE_TUETE';
                  const sub = isBT ? q.bunteTuete?.kind : null;
                  const emoji = isBT && sub ? (SUB_EMOJI[sub] ?? '🎁') : (CAT_EMOJI[q.category] ?? '?');
                  const tip = isBT && sub
                    ? `${q.category} (${sub})`
                    : q.category;
                  return (
                    <span key={i} title={tip} style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28, borderRadius: 8,
                      background: 'rgba(255,235,200,0.06)',
                      border: '1px solid rgba(255,220,180,0.14)',
                      fontSize: 16,
                    }}>{emoji}</span>
                  );
                })}
                {entries.length === 0 && (
                  <span style={{ fontSize: 11, color: '#6b6555', fontStyle: 'italic' }}>— keine Fragen —</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Lobby View (nach "Setup abschließen" — Moderator wartet auf joinende Teams) ──

function LobbyView({
  s, drafts, selectedDraftId, phases, timerInput,
  roomCode, emit, startGame, backToSetup,
}: {
  s: QQStateUpdate;
  drafts: DraftSummary[];
  selectedDraftId: string;
  phases: 3 | 4;
  timerInput: number;
  roomCode: string;
  emit: (event: string, payload: any) => Promise<{ ok: boolean; error?: string }>;
  startGame: () => void;
  backToSetup: () => void;
}) {
  const GOLD = '#F59E0B';
  const lobbyCard: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 16, padding: 20, marginBottom: 14,
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: 13, fontWeight: 900, color: '#e2e8f0', marginBottom: 12,
    letterSpacing: '0.04em', textTransform: 'uppercase',
    display: 'flex', alignItems: 'center', gap: 8,
  };
  const fieldLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 900, color: '#94a3b8',
    letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6,
  };

  const draft = drafts.find(d => d.id === selectedDraftId);
  const connected = s.teams.filter(t => t.connected).length;
  const total = s.teams.length;
  const joinUrl = `${window.location.origin}/team?room=${roomCode}`;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Titel + Setup-Zurück */}
      <div style={{
        textAlign: 'center', marginBottom: 18,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '6px 14px', borderRadius: 999,
          background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
          fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', color: GOLD,
          textTransform: 'uppercase',
        }}>
          <span style={{ fontSize: 16 }}>🎭</span>
          Lobby — Teams joinen
        </div>
        <h1 style={{
          margin: '12px 0 6px', fontSize: 28, fontWeight: 900, color: '#fff',
        }}>Bereit zum Start</h1>
        <div style={{ fontSize: 13, color: '#94a3b8' }}>
          Sobald alle Teams dabei sind: <strong style={{ color: '#22C55E' }}>Quiz starten</strong> drücken (oder Space).
        </div>
      </div>

      {/* Read-only Config-Streifen */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 10,
        marginBottom: 14, justifyContent: 'center',
      }}>
        <ConfigChip label="Fragensatz" value={draft?.title ?? '—'} />
        <ConfigChip label="Fragen" value={draft ? `${draft.questionCount}` : '—'} />
        <ConfigChip label="Runden" value={`${phases}`} />
        <ConfigChip label="Timer" value={`${timerInput}s`} />
        <button
          onClick={backToSetup}
          style={{
            padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 900,
            border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)',
            color: '#EF4444', cursor: 'pointer', fontFamily: 'inherit',
          }}
          title="Zurück ins Setup"
        >⎌ Zurück zum Setup</button>
      </div>

      {/* QR + Teams */}
      <div style={lobbyCard}>
        <div style={sectionTitle}>
          <span>👥 Verbundene Teams</span>
          <span style={{
            marginLeft: 'auto', fontSize: 12, fontWeight: 900,
            color: connected > 0 ? '#22C55E' : '#64748b',
          }}>
            {connected}/{total} verbunden
          </span>
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {/* QR */}
          <div style={{
            background: '#fff', padding: 14, borderRadius: 16,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
          }}>
            <QRCodeSVG value={joinUrl} size={160} bgColor="#ffffff" fgColor="#0D0A06" />
            <div style={{
              marginTop: 10, fontFamily: 'monospace', fontSize: 11,
              color: '#0D0A06', fontWeight: 700,
            }}>/team?room={roomCode}</div>
          </div>

          {/* Teams-Grid */}
          <div style={{ flex: 1, minWidth: 320 }}>
            <div style={fieldLabel}>Teams</div>
            {total === 0 ? (
              <div style={{
                fontSize: 14, color: '#64748b', fontStyle: 'italic',
                padding: '16px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)',
              }}>
                Noch keine Teams beigetreten. QR scannen lassen — du kannst auch ohne Teams starten.
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                gap: 8,
              }}>
                {s.teams.map(t => {
                  return (
                    <div key={t.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 8,
                      background: t.connected ? `${t.color}18` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${t.connected ? `${t.color}55` : 'rgba(255,255,255,0.08)'}`,
                      opacity: t.connected ? 1 : 0.55,
                    }}>
                      <QQTeamAvatar avatarId={t.avatarId} size={44} style={{ flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <TeamNameLabel
                          name={t.name}
                          maxLines={1}
                          shrinkAfter={14}
                          fontSize={13}
                          color={t.connected ? '#e2e8f0' : '#64748b'}
                          fontWeight={900}
                        />
                        <div style={{
                          fontSize: 10, fontWeight: 700,
                          color: t.connected ? '#22C55E' : '#EF4444',
                        }}>
                          {t.connected ? '● bereit' : '○ offline'}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const next = prompt(`Team „${t.name}" umbenennen:`, t.name);
                          if (next == null) return;
                          const trimmed = next.trim();
                          if (!trimmed || trimmed === t.name) return;
                          emit('qq:renameTeam', { roomCode, teamId: t.id, name: trimmed });
                        }}
                        title="Team umbenennen"
                        style={{
                          width: 22, height: 22, borderRadius: '50%',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid rgba(148,163,184,0.35)',
                          background: 'rgba(148,163,184,0.08)', color: '#cbd5e1',
                          fontSize: 11, fontWeight: 900, cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >✎</button>
                      <button
                        onClick={() => {
                          if (!window.confirm(`Team "${t.name}" entfernen?`)) return;
                          emit('qq:kickTeam', { roomCode, teamId: t.id });
                        }}
                        title="Team entfernen"
                        style={{
                          width: 22, height: 22, borderRadius: '50%',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid rgba(239,68,68,0.35)',
                          background: 'rgba(239,68,68,0.08)', color: '#EF4444',
                          fontSize: 11, fontWeight: 900, cursor: 'pointer',
                          padding: 0, lineHeight: 1, fontFamily: 'inherit', flexShrink: 0,
                        }}
                      >✕</button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TEMP Dev-Fill: sichtbar in Production für 8-Team-Test */}
            {true && (() => {
              const dummyCount = teamList.filter(t => (t as any)._dummy).length;
              return (
              <div style={{
                marginTop: 12, padding: '10px 12px', borderRadius: 8,
                background: 'rgba(245,158,11,0.08)',
                border: '1px dashed rgba(245,158,11,0.35)',
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: 10, color: '#F59E0B', fontWeight: 900, letterSpacing: '0.1em' }}>
                  🧪 TEST
                </span>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {([1, 3, 5, 7, 8] as const).map(n => (
                    <button
                      key={n}
                      onClick={async () => {
                        const r = await fetch(`/api/qq/${encodeURIComponent(roomCode)}/dev/fillTeams`, {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ count: n }),
                        });
                        if (!r.ok) {
                          const d = await r.json().catch(() => ({}));
                          alert(`Fehler: ${d.error ?? r.statusText}`);
                        }
                      }}
                      style={{
                        padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                        border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.15)',
                        color: '#F59E0B', fontFamily: 'inherit', fontWeight: 900, fontSize: 12,
                      }}
                    >+ {n} {n === 1 ? 'Dummy' : 'Dummies'}</button>
                  ))}
                  {/* 2026-05-04 (Wolf): „Alle Bots raus" — eine Taste, kickt
                      alle Dummy-Teams (echte Spieler bleiben). */}
                  {dummyCount > 0 && (
                    <button
                      onClick={() => {
                        if (!window.confirm(`${dummyCount} ${dummyCount === 1 ? 'Bot' : 'Bots'} aus der Lobby entfernen?`)) return;
                        for (const t of teamList) {
                          if ((t as any)._dummy) emit('qq:kickTeam', { roomCode, teamId: t.id });
                        }
                      }}
                      style={{
                        padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                        border: '1px solid rgba(239,68,68,0.45)', background: 'rgba(239,68,68,0.15)',
                        color: '#EF4444', fontFamily: 'inherit', fontWeight: 900, fontSize: 12,
                      }}
                      title={`${dummyCount} Bots kicken`}
                    >🚪 Bots raus ({dummyCount})</button>
                  )}
                </div>
              </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Start-Button */}
      <div style={{
        position: 'sticky', bottom: 16,
        display: 'flex', justifyContent: 'center', marginTop: 20,
      }}>
        <button
          onClick={startGame}
          style={{
            padding: '20px 64px', borderRadius: 16, border: 'none',
            fontFamily: 'inherit', fontWeight: 900, fontSize: 26,
            letterSpacing: '0.04em', cursor: 'pointer', color: '#fff',
            background: 'linear-gradient(180deg, #22C55E, #15803D)',
            boxShadow: '0 14px 40px rgba(34,197,94,0.5), 0 0 0 1px rgba(255,255,255,0.1) inset',
            animation: 'qqStartPulse 2.2s ease-in-out infinite',
          }}
        >
          ▶ Quiz starten
          <span style={{
            fontSize: 12, marginLeft: 14, padding: '3px 10px', borderRadius: 6,
            background: 'rgba(0,0,0,0.25)', opacity: 0.9, fontWeight: 700,
          }}>SPACE</span>
        </button>
      </div>
      <style>{`
        @keyframes qqStartPulse {
          0%, 100% { box-shadow: 0 14px 40px rgba(34,197,94,0.5), 0 0 0 1px rgba(255,255,255,0.1) inset; }
          50% { box-shadow: 0 14px 48px rgba(34,197,94,0.75), 0 0 0 1px rgba(255,255,255,0.15) inset; }
        }
      `}</style>
    </div>
  );
}

function ConfigChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: '8px 14px', borderRadius: 8,
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
      display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
    }}>
      <span style={{ color: '#64748b', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 10 }}>
        {label}
      </span>
      <span style={{ color: '#e2e8f0', fontWeight: 900 }}>{value}</span>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const page: React.CSSProperties = {
  minHeight: '100vh',
  background:
    'radial-gradient(circle at 50% -20%, rgba(245,158,11,0.06), transparent 55%), ' +
    'radial-gradient(circle at 90% 110%, rgba(99,102,241,0.05), transparent 50%), ' +
    '#0D0A06',
  color: 'var(--qm-text)',
  fontFamily: "'Nunito', system-ui, sans-serif",
  padding: 20,
};

const header: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  marginBottom: 18,
  padding: '10px 14px',
  borderRadius: 16,
  background: 'linear-gradient(180deg, rgba(255,235,200,0.04), rgba(255,235,200,0.015))',
  border: '1px solid var(--qm-border)',
  boxShadow: 'var(--qm-depth-sm)',
};

const card: React.CSSProperties = {
  background:
    'linear-gradient(180deg, rgba(255,235,200,0.045), rgba(255,235,200,0.02))',
  border: '1px solid var(--qm-border)',
  borderRadius: 16,
  padding: 16,
  boxShadow: 'var(--qm-depth-sm)',
};

const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 900, color: 'var(--qm-text-subtle)',
  textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10,
};

const selectStyle: React.CSSProperties = {
  padding: '7px 12px', borderRadius: 8,
  border: '1px solid var(--qm-border-hi)',
  background: 'var(--qm-elev)', color: 'var(--qm-text)',
  fontFamily: 'inherit', fontSize: 13,
};

const inputStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 8,
  border: '1px solid var(--qm-border-hi)',
  background: 'rgba(255,235,200,0.05)', color: 'var(--qm-text)',
  fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
};

// ── Hotkey-Cheatsheet ────────────────────────────────────────────────────────

const HOTKEY_GROUPS: { title: string; rows: [string, string][] }[] = [
  {
    title: 'Ablauf',
    rows: [
      ['Space / F13', 'Nächster Schritt (Kontext-sensitiv)'],
      ['R / F15', 'Antwort aufdecken'],
      ['N / F17 / →', 'Nächste Frage (nur in PLACEMENT)'],
      ['P', 'Pause / Resume'],
    ],
  },
  {
    title: 'Team als korrekt markieren',
    rows: [
      ['1–5', 'Team 1–5 korrekt (im QUESTION_REVEAL)'],
      ['F14', 'Team 1 korrekt (Buzz-Winner)'],
      ['Esc / Backspace / F16', 'Niemand korrekt'],
    ],
  },
  {
    title: 'Beamer & Ton',
    rows: [
      ['M', 'Ton an/aus (Musik + SFX)'],
      ['V', '2D / 3D Grid-Toggle'],
      ['F', 'Flyover (3D-Grid Kamerafahrt)'],
    ],
  },
  {
    title: 'Hilfe',
    rows: [
      ['?', 'Dieses Cheatsheet öffnen/schließen'],
      ['Esc', 'Cheatsheet schließen'],
    ],
  },
];

function HotkeyCheatsheet({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="qq-mod-shell qm-cheatsheet-overlay"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="qm-cheatsheet-panel"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--qm-text-warm)' }}>⌨ Hotkey-Cheatsheet</h2>
          <button onClick={onClose} className="qm-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Schließen <span className="qm-kbd qm-kbd-sm">Esc</span>
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {HOTKEY_GROUPS.map(g => (
            <div key={g.title}>
              <div className="qm-eyebrow qm-eyebrow-bright" style={{ marginBottom: 8 }}>{g.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {g.rows.map(([key, desc]) => (
                  <div key={key} className="qm-cheatsheet-row" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="qm-kbd">{key}</span>
                    <span style={{ fontSize: 13, color: 'var(--qm-text-muted)' }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18, fontSize: 12, color: 'var(--qm-text-faint)', textAlign: 'center' }}>
          StreamDeck: F13–F17 spiegeln Space / #1 / R / Esc / N
        </div>
      </div>
    </div>
  );
}
