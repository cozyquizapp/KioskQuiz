import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useQQSocket } from '../hooks/useQQSocket';
import { useActionLock } from '../hooks/useActionLock';
import {
  QQQuestion, QQLanguage, QQ_CATEGORY_LABELS, QQ_CATEGORY_COLORS,
  QQStateUpdate, QQSoundConfig,
} from '../../../shared/quarterQuizTypes';
import { qqCategoryAccent } from '../../../shared/qqCategoryTheme';
import { QQSoundPanel } from '../components/QQSoundPanel';
import { CozyGameWinnerPicker } from '../components/CozyGameWinnerPicker';
import { QQTeamAvatar } from '../components/QQTeamAvatar';
import { QQEmojiIcon } from '../components/QQIcon';
import { AVATAR_SETS, MEGA_EMOJI_POOL, ESC_FLAG_POOL } from '../avatarSets';
import { AvatarSetProvider } from '../avatarSetContext';
import { TeamNameLabel } from '../components/TeamNameLabel';
import { JokerIcon } from '../components/JokerIcon';
import { playHotkeyFeedback } from '../utils/sounds';
import { compareTeamsForRanking } from '../utils/qqTeamRanking';
import { API_BASE } from '../api';
import './qqModeratorTheme.css';
import { QQ_COLORS } from '../../../shared/qqColors';

const QQ_ROOM = 'default';

interface DraftSummary {
  id: string;
  title: string;
  date: string | null;
  updatedAt: number;
  questionCount: number;
  phases?: 3 | 4;
}

export default function QQModeratorPage({ testMode = false }: { testMode?: boolean } = {}) {
  const roomCode = QQ_ROOM;
  const [phases, setPhases] = useState<3 | 4>(4);
  const [joined, setJoined]     = useState(false);
  const [timerInput, setTimerInput] = useState(30);
  const [drafts, setDrafts]         = useState<DraftSummary[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string>('');
  // 2026-05-24 (Wolf-Audit Cleanup): showSoundPanel + localSoundConfig waren
  // fuer Live-Sound-Card, ist jetzt nur im Setup/Advanced. localSoundConfig
  // bleibt fuer SetupView-Param-Signatur.
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

  // 2026-05-08: Doppelklick-Schutz fuer Mod-Aktionen die zweifach zu fruehen
  // Phasen-Wechseln fuehren koennen (Hot-Potato-Doppel-Fire-Klasse). 500 ms
  // Lock pro Key reicht fuer schnelle Doppel-Spaces ohne legitime Folge-Klicks
  // zu blockieren.
  const canFire = useActionLock(500);

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
  const pushToast = (msg: string, emoji: string, accent = QQ_COLORS.blue500) => {
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
    if (state.phase === 'QUESTION_ACTIVE')    pushToast('Frage laeuft — Teams antworten', '⏱', QQ_COLORS.green500);
    else if (state.phase === 'QUESTION_REVEAL') pushToast('Antworten aufgedeckt', '🔍', QQ_COLORS.brandPink);
    else if (state.phase === 'PLACEMENT')      pushToast('Platzierungs-Phase', '📍', QQ_COLORS.red500);
    else if (state.phase === 'PHASE_INTRO')    pushToast(`Runde ${state.gamePhaseIndex} startet`, '🎬', QQ_COLORS.violet500);
    else if (state.phase === 'COMEBACK_CHOICE') pushToast('Comeback-Chance!', '⚡', QQ_COLORS.brandPink);
    else if (state.phase === 'GAME_OVER')      pushToast('Spiel beendet', '🏆', QQ_COLORS.brandPink);
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

  // 2026-05-25 (Wolf 'mod-test-modus zum reveal-testen'): Auto-Setup im
  // Test-Modus. Beim ersten Mount sobald LOBBY + Drafts geladen:
  //   1. 5 Bots via /dev/fillTeams spawnen
  //   2. Setup als done markieren
  //   3. Spiel starten
  // Damit landet Wolf direkt in PHASE_INTRO Runde 1 mit gefüllter Lobby,
  // ohne durch den Setup-Flow klicken zu muessen. Autoplay defaultet auf
  // AN im Test-Modus (kein Klick nötig um durchzulaufen).
  const testSetupTriggeredRef = useRef(false);
  useEffect(() => {
    if (!testMode) return;
    if (testSetupTriggeredRef.current) return;
    if (!connected || !joined) return;
    if (drafts.length === 0 || !selectedDraftId) return;
    if (state?.phase !== 'LOBBY') return;
    testSetupTriggeredRef.current = true;
    (async () => {
      // Autoplay an damit Test-Quizze durchlaufen ohne Mod-Space
      setAutoplayEnabled(true);
      // Test-Mode-Flag setzen → Backend skipt persistGameResult
      try { await emit('qq:setTestMode', { roomCode, value: true }); } catch {}
      // 1. Bots spawnen (5 reichen für realistische Streuung)
      try {
        await fetch(`/api/qq/${roomCode}/dev/fillTeams`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count: 5 }),
        });
      } catch {}
      await new Promise(r => setTimeout(r, 400));
      // 2. Setup als done markieren
      try { await emit('qq:setSetupDone', { roomCode, value: true }); } catch {}
      await new Promise(r => setTimeout(r, 200));
      // 3. Spiel starten
      try { await startGameRef.current(); } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testMode, connected, joined, drafts.length, selectedDraftId, state?.phase]);

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
    // 2026-05-05 (Wolf-Builder): Connections-Custom-Set aus Draft mitgeben
    const draftConnections = draft.connections;
    const draftConnectionsDuration = draft.connectionsDurationSec;
    const draftConnectionsMaxFails = draft.connectionsMaxFails;
    // 2026-05-17: Mod-Quick-Setting-Toggle (in LOBBY vor Start) hat Vorrang vor
    // Draft-Setting. Wenn Wolf den Toggle aktiviert hat aber im Builder aus
    // war, nutzen wir den Mod-State + dessen Pool (vom Auto-Fill befüllt).
    const liveToggleOn = !!(state as any)?.cozyGamesEnabled;
    const liveToggledPool = Array.isArray((state as any)?.cozyGamesPool) ? (state as any).cozyGamesPool : [];
    // 2026-05-23 (Wolf-Bug 'minigames im moderator aus, aber im progress
    // tree drin'): Vorher hat OR-Logic den Live-Toggle ignoriert wenn der
    // Draft cozyGamesEnabled=true gespeichert hatte → Game startete mit
    // CG=true trotz Mod-Aus. Jetzt: Live-Toggle explizit-OFF wird respektiert
    // (selbes Pattern wie comebackEnabled darunter).
    const liveCozyToggle = (state as any)?.cozyGamesEnabled;
    const draftCozyGamesEnabled = typeof liveCozyToggle === 'boolean'
      ? liveCozyToggle
      : !!(draft as any).cozyGamesEnabled;
    const baseDraftPool = Array.isArray((draft as any).cozyGamesPool) ? (draft as any).cozyGamesPool : [];
    const draftCozyGamesPool = liveToggleOn && liveToggledPool.length > 0
      ? liveToggledPool
      : baseDraftPool;
    // 2026-05-17: Comeback-Toggle (Default an). Live-State hat Vorrang wenn gesetzt.
    const liveComebackToggle = (state as any)?.comebackEnabled;
    const draftComeback = (draft as any).comebackEnabled;
    const draftComebackEnabled = typeof liveComebackToggle === 'boolean'
      ? liveComebackToggle
      : (typeof draftComeback === 'boolean' ? draftComeback : true);
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
    const ack = await emit('qq:startGame', { roomCode, questions, language: state?.language ?? 'both', phases, theme, draftId: qqDraftId, draftTitle: qqDraftTitle, slideTemplates, soundConfig, connections: draftConnections, connectionsDurationSec: draftConnectionsDuration, connectionsMaxFails: draftConnectionsMaxFails, cozyGamesEnabled: draftCozyGamesEnabled, cozyGamesPool: draftCozyGamesPool, comebackEnabled: draftComebackEnabled });
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
  // 2026-05-07 (Wolf-Bug 'autoplay loest HP-Slot 3x aus'): Dedup-Key fuer
  // Autoplay-Effekt. Verhindert Mehrfach-Fires desselben Actions wenn
  // andere Deps sich aendern aber phase/slotState/questionId stabil sind.
  const autoplayLastFireKeyRef = useRef<string | null>(null);
  // 2026-05-09 v2 (Wolf-Bug 'autoplay langsam / hängt'): ref-stabiler Timer.
  // Vorher: bei jedem state-update der Effect-Deps anfasste (z.B. bots tippen
  // → answers.length++) → Cleanup → clearTimeout → Effect-Re-Run → neuer Timer.
  // Bei vielen Updates kollabierte der Timer und feuerte nie. Jetzt halten
  // wir Timer + zugehörigen fireKey im Ref. Wenn fireKey gleich bleibt zwischen
  // Effect-Re-Runs, Timer NICHT clearen sondern weiterlaufen lassen.
  const autoplayTimerRef = useRef<{ handle: number; fireKey: string } | null>(null);
  // 2026-05-08 (Wolf-Bug 'HP-slot-machine wird im autoplay mehrfach getriggert'):
  // Zusaetzliches HP-spezifisches Dedup. Vorher reichte autoplayLastFireKeyRef
  // nicht aus weil andere state-Felder (z. B. answers.length) sich aendern
  // koennen waehrend hotPotatoSlotState noch beim alten Wert ist. Beim Effect-
  // Re-Run mit neuem fireKey aber gleichem HP-State wuerde ein zweiter emit
  // fired. Jetzt: HP-Action nutzt eigenen Ref der nur HP-State + qId trackt.
  const lastHPFireKeyRef = useRef<string | null>(null);

  // ── Autoplay-Tick: Auto-Advance pro Phase (wirkt nur lokal, simuliert Space) ─
  useEffect(() => {
    if (!autoplayEnabled || autoplayPaused) return;
    const s = state;
    if (!s) return;
    // Game-Over → Autoplay aus, Loop nicht endlos.
    if (s.phase === 'GAME_OVER' || s.phase === 'THANKS' || s.phase === 'LOBBY') return;
    // 2026-05-09 v2 (Wolf-Klärung 'soll durchlaufen, kein Stop'): Final-Recap
    // (zwischen Final-Fragen) blockiert Autoplay NICHT mehr. Längerer Delay
    // im PLACEMENT-Case unten (siehe finalRecapStep-Branch) lässt die Score-
    // Cascade in Ruhe auslaufen, bevor automatisch weitergeschaltet wird.

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
        // 2026-05-07 (Wolf 'video laeuft, danach kommt direkt regelpage 2'):
        // ESC-Welcome (rIdx === -2) mit Video braucht ~10s Video + ~5s Cascade
        // = 15s. Default 8s clipt das Video / die Cascade. Bei ESC+Video also
        // 18s warten, sonst geht der Welcome-Wordmark unter.
        const escWelcomeWithVideo = rIdx === -2
          && !!s.theme?.eurovisionMode
          && !!s.theme?.welcomeVideoUrl;
        delayMs = rIdx === 2 ? 16500 : escWelcomeWithVideo ? 18000 : 8000;
        // 2026-05-09 (Wolf): Neue-Fähigkeiten-Slide raus → 9 statt 10 / 8 statt 9.
        // 2026-05-24 (Wolf 'connections raus'): Connections-Rules-Slide entfaellt.
        const totalSlides = 4 + ((s as any).cozyGamesEnabled ? 1 : 0);
        action = () => {
          if ((s.rulesSlideIndex ?? 0) >= totalSlides - 1) emit('qq:rulesFinish', { roomCode });
          else emit('qq:rulesNext', { roomCode });
        };
        break;
      }
      case 'TEAMS_REVEAL': {
        // 2026-05-09: neue Game-Show-Card-Sequenz (Slot M).
        // TITLE_HOLD 1.2s + N × PER_TEAM 3.6s + Good-Luck-Hold ~2s + Buffer 1s.
        // Bei 3 Teams ~14.5s, bei 8 Teams ~32.5s.
        delayMs = 1200 + s.teams.length * 3600 + 2500;
        action = () => emit('qq:teamsRevealFinish', { roomCode });
        break;
      }
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
        else if (step === 1) {
          // 2026-05-09 v2 (Wolf-Bug 'autoplay R3 card-drehung geskippt'):
          // Action-Card-Cascade hat pro-Phase unterschiedliche Längen.
          // - cardBaseMs (850) + i*cardStaggerMs (1500) ist der Start-Delay pro Card.
          // - Bei isNew (3D-Slam+Flip) extra +600ms Build-up + 2900ms Choreo
          //   (SLAM 1400 + SETTLE 500 + FLIP 1000).
          // - Sonst phasePop ~400ms.
          // Letzte-Card-Done-Time + ~1500ms Lese-Puffer:
          // R1 (Place isNew @0):     850 + 600 + 2900 = 4350 → +1500 = 5850ms
          // R2 (Steal isNew @1):     850 + 1500 + 600 + 2900 = 5850 → +1500 = 7350ms
          // R3 (Stack isNew @2):     850 + 3000 + 600 + 2900 = 7350 → +1500 = 8850ms
          // R4 (alle non-isNew):     850 + 3000 + 400 = 4250 → +1500 = 5750ms
          const ph = s.gamePhaseIndex;
          if (ph === 1) delayMs = 5850;
          else if (ph === 2) delayMs = 7350;
          else if (ph === 3) delayMs = 8850;
          else delayMs = 5750; // R4 (Final): keine isNew Action-Cards
        }
        else if (step === 2) delayMs = s.categoryIsNew ? 4500 : 5000;
        else delayMs = 6500; // Category-Explanation
        action = () => emit('qq:activateQuestion', { roomCode });
        break;
      }
      case 'QUESTION_ACTIVE': {
        // 2026-05-09: HP-Slot-Autoplay läuft jetzt in separatem useEffect
        // unten (mit minimalen Deps: phase, hps, qId). Dadurch keine
        // Mehrfach-Triggers mehr durch state-update-Re-Runs (answers.length etc).
        // Hier nur: bei rolling/landed nichts tun, weiter durchfallen.
        const sk = (q?.bunteTuete as { kind?: string } | undefined)?.kind;
        if (sk === 'hotPotato') {
          const hps = (s as any).hotPotatoSlotState;
          if (hps === 'rolling' || hps === 'landed') break;
        }
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
          // 2026-05-09 v2 (Wolf 'autoplay soll durchlaufen, nicht stoppen'):
          // Final-Recap (Step 1, zwischen Final-Fragen) zeigt 0B-Score-Cascade
          // mit Tickup + Position-Swap + Glow (~3s Anim + Lese-Zeit). Längerer
          // Delay als Standard-Placement, damit Standings lesbar sind, bevor
          // Autoplay zur nächsten Final-Frage weiterschaltet.
          // 2026-05-24 (Wolf-Live-Test): Comeback-Steal-Pause hat eigenen
          // kürzeren Delay (1.8s statt 3.5s), weil der Beamer den Steal-Effekt
          // schon zeigt und Mod nicht zwischen jedem Steal lange warten will.
          const inFinalRecap = (s as any).finalRecapStep === 1;
          const inComebackStealPause = !!(s as any).comebackStealPaused;
          delayMs = inFinalRecap ? 8000 : inComebackStealPause ? 1800 : 3500;
          action = () => emit('qq:nextQuestion', { roomCode });
        } else {
          // 2026-05-03 (Wolf-Bug 'Comeback haengt'): wenn pendingFor offline ist
          // UND wir in einer Comeback-Steal-Phase sind, auto-skip nach 8s. Greift
          // wenn das Comeback-Team Maria entweder ein Phone-Tab geschlossen hat
          // ODER nie connected war (Solo-Test). Connected-Teams bleiben unbetroffen
          // — die duerfen in Ruhe nachdenken.
          // 2026-05-05 (Phase-7 Bucket-2 BC-2): Auto-Skip auch fuer Standard-
          // Placement (nicht-Comeback) wenn pendingTeam offline. 12s Timeout
          // (laenger als Comeback weil Wolf vielleicht kurz manuell eingreifen
          // will). Verhindert Game-Stuck wenn Team waehrend Placement disconnects.
          const pendingTeam = s.teams.find(t => t.id === s.pendingFor);
          const isComeback = s.pendingAction === 'COMEBACK' || s.comebackTeamId === s.pendingFor;
          if (pendingTeam && !pendingTeam.connected) {
            // 2026-05-11 (Wolf-Bug 'Bot-Team hängt bei FREE-Auswahl nach
            // Stack'): bei pendingAction='FREE' UND offline-Team auto-choose
            // statt skip. Default = STEAL (Grid evtl. voll, PLACE würde
            // NO_FREE_CELL throwen). 4s Delay damit Wolf manuell eingreifen
            // kann wenn er will.
            if (s.pendingAction === 'FREE') {
              delayMs = 4000;
              action = () => emit('qq:chooseFreeAction', { roomCode, teamId: pendingTeam.id, action: 'STEAL' });
            } else {
              delayMs = isComeback ? 8000 : 12000;
              action = () => emit('qq:skipCurrentTeam', { roomCode });
            }
          } else if (pendingTeam && pendingTeam.connected && s.pendingAction === 'FREE') {
            // 2026-05-11 (Audit P0): bei online-Team mit FREE-Auswahl hängt
            // Autoplay stumm. Nach 25s pushToast als visuelles Warning —
            // Wolf weiß sofort dass das Team zögert und kann mit F18-Skip
            // eingreifen. Kein Auto-Choose (sonst nehmen wir dem Spieler die
            // Entscheidung).
            delayMs = 25000;
            action = () => {
              try { pushToast(`${pendingTeam.name}: wartet auf Setzen/Klauen — F18 = Skip`, '⏳', QQ_COLORS.amber500); } catch {}
            };
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
      case 'COZY_GAME': {
        // 2026-05-17 Autoplay-Handler für CozyGame-Sub-Phasen:
        // INTRO (1.8s) → Rad drehen
        // WHEEL_SPIN → 4s Auto-Stop läuft im Backend, nichts tun
        // WHEEL_RESULT (3s) → Spiel starten
        // GAME_ACTIVE parallel → 60s-Timer im Backend, Auto-Expire ruft StopGame
        // GAME_ACTIVE sequence → bei Timer=0 auto-advance Nächstes Team
        // WINNER_SELECT (1.2s) → Random Sieger aus connected real teams
        const cg = (s as any).cozyGame;
        if (!cg) break;
        if (cg.phase === 'INTRO') {
          delayMs = 1800;
          action = () => emit('qq:cozyGameAdvance', { roomCode });
        } else if (cg.phase === 'WHEEL_RESULT') {
          delayMs = 3000;
          action = () => emit('qq:cozyGameAdvance', { roomCode });
        } else if (cg.phase === 'GAME_ACTIVE' && cg.playMode === 'sequence') {
          // Bei sequence + abgelaufenem Timer: Auto-Nächstes-Team
          // (parallel: Backend auto-stops via onExpire)
          if (cg.gameEndsAt == null && (cg.timerPausedRemainingMs ?? 0) === 0) {
            delayMs = 1000;
            action = () => emit('qq:cozyGameNextSequenceTeam', { roomCode });
          }
        } else if (cg.phase === 'WINNER_SELECT') {
          const winnerIds: string[] = cg.winnerTeamIds ?? [];
          if (winnerIds.length === 0) {
            // Random Sieger aus connected echten Teams. Bei reiner Bot-Lobby
            // (alle disconnected) fallback auf alle Teams.
            const connectedReal = s.teams.filter((t: any) => t.connected);
            const pool = connectedReal.length > 0 ? connectedReal : s.teams;
            if (pool.length > 0) {
              const winner = pool[Math.floor(Math.random() * pool.length)];
              delayMs = 1200;
              action = () => emit('qq:cozyGameSelectWinner', { roomCode, teamIds: [winner.id] });
            }
          } else {
            // 2026-05-17 v9: Winner steht → kurze Reveal-Pause, dann auto-
            // advance zum Grid (entspricht „Weiter zum Grid"-Klick des Mods).
            delayMs = 2500;
            action = () => emit('qq:cozyGameAdvance', { roomCode });
          }
        }
        // WHEEL_SPIN + GAME_ACTIVE: keine Mod-Action nötig (Backend-Timer)
        break;
      }
      case 'FINAL_BETTING': {
        // 2026-05-24 (Wolf-Live-Test): wenn Intro-Slide noch nicht dismissed,
        // Space → Intro weg, dann zur Betting-View.
        // 2026-05-25 (Wolf 'final tip info vor bet nicht gesehen'): delayMs
        // war 0 → Autoplay dismissed das Intro instant, niemand konnte
        // lesen. Jetzt 6s Lese-Pause (~3s Wave-Stagger + Lese-Zeit), Mod
        // kann manuell mit Space frueher dismissen.
        if ((s as any).finalBettingIntroDone === false) {
          delayMs = 6000;
          action = () => emit('qq:finishFinalBettingIntro', { roomCode });
          break;
        }
        // Auto-Advance nur wenn alle Teams gesetzt haben — sonst auf Mod
        // warten (er will evtl noch warten oder manuell triggern).
        // 2026-05-09 (Wolf 'bet-phase wurde übersprungen'): Lese-Pause auf
        // 4.5s erhöht (war 2.2s) — bei 4 Bots die in 0.5-2.5s submitten
        // ist die Phase sonst nach ~3s vorbei und wirkt geskippt.
        const submitted = Object.values(s.finalBettingSubmitted ?? {}).filter(Boolean).length;
        const total = s.teams.length;
        if (total > 0 && submitted >= total) {
          delayMs = 4500;
          action = () => emit('qq:finishFinalBetting', { roomCode });
        }
        break;
      }
      case 'FINAL_REVEAL': {
        // Step-Mapping siehe shared/qqFinalReveal.ts (Single-Source-of-Truth).
        // Delays pro Phase sind unten im if-else definiert.
        const N = s.teams.length;
        const step = (s as any).finalRevealStep ?? 0;
        const betted = s.teams.filter(t => s.finalBetResolution?.[t.id]?.targetTeamId);
        const zeroExists = betted.some(t => (s.finalBetResolution?.[t.id]?.totalBonus ?? 0) === 0);
        const positiveCount = betted.filter(t => (s.finalBetResolution?.[t.id]?.totalBonus ?? 0) > 0).length;
        const betSlotsCount = positiveCount + (zeroExists ? 1 : 0);

        // 2026-05-24 v3 (Wolf 'awards-overview-Zwischenschritt raus'):
        //   step 0       = title (1.5s)
        //   step 1/2/3   = award-slot 0/1/2 (3s pro Slot wie Bet-Cards)
        //   step 4..B+3  = bet-slots (Zero-Group 4.5s, sonst 3s)
        //   step B+4     = race-final (12s Konfetti-Hold)
        if (step <= 0) {
          delayMs = 1500;
        } else if (step <= 3) {
          // award-slot 0/1/2: gleicher Rhythmus wie Bet-Slots.
          delayMs = 3000;
        } else if (step <= 3 + betSlotsCount) {
          const slotIdx = step - 4;
          const isZeroSlot = zeroExists && slotIdx === 0;
          delayMs = isZeroSlot ? 4500 : 3000;
        } else {
          // race-final (step === 4 + betSlotsCount). FinalEurovisionFinale
          // Crescendo-Choreo: worst → 2nd place mit 600ms-Stagger + 1.2s
          // Anticipation-Hold → Sieger-Explosion. Bei N=8 ~6s bis Sieger-
          // Reveal + ~7s Hold/Konfetti = 13s Auto-Delay.
          void N;
          delayMs = 13_000;
        }
        action = () => emit('qq:nextQuestion', { roomCode });
        break;
      }
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
    // 2026-05-07 (Wolf-Bug 'autoplay loest HP-Slot 3x aus'): Dedup-Guard via
    // ref. Wenn dieselbe action+state-Kombi schon emittet wurde und State
    // sich nicht relevant geaendert hat, NICHT erneut feuern.
    // 2026-05-07 v3: alle Sub-State-Felder die Autoplay-Branches treiben
    // muessen im Key sein, sonst dedup blockiert valid follow-up emits.
    // Vorher haengte z.B. PLACEMENT nach jeder Frage weil pendingFor-Wechsel
    // nicht im Key war, gleiches Problem bei allAnswered, timerExpired,
    // muchoRevealStep, comebackHL etc.
    const hlPhase = s.comebackHL?.phase ?? '-';
    const hlAnsweredCount = s.comebackHL ? Object.keys(s.comebackHL.answers ?? {}).length : 0;
    const fireKey = [
      s.phase,
      (s as any).hotPotatoSlotState ?? '-',
      q?.id ?? '-',
      s.introStep ?? '-',
      s.connections?.phase ?? '-',
      s.rulesSlideIndex ?? '-',
      s.questionIndex,
      s.pendingFor ?? '-',
      s.pendingAction ?? '-',
      s.allAnswered ? 'all' : 'some',
      (s as any).timerExpired ? 'exp' : 'run',
      s.muchoRevealStep ?? '-',
      s.zvzRevealStep ?? '-',
      s.cheeseRevealStep ?? '-',
      s.mapRevealStep ?? '-',
      s.comebackIntroStep ?? '-',
      hlPhase,
      hlAnsweredCount,
      s.answers?.length ?? 0,
      (s as any).finalRevealStep ?? 0, // 2026-05-09: Step in fireKey, sonst dedup blockt
    ].join(':');
    if (autoplayLastFireKeyRef.current === fireKey) return;
    // 2026-05-09 v2 (Wolf-Bug 'autoplay langsam'): ref-stabiler Timer.
    // Wenn schon ein Timer für DIESELBE fireKey läuft, weiter laufen lassen.
    // Verhindert Timer-Reset bei Bot-Antworten / state-Updates die fireKey
    // nicht ändern aber Effect-Deps anfassen.
    if (autoplayTimerRef.current?.fireKey === fireKey) return;
    // Anderer fireKey läuft → diesen abbrechen und neuen starten
    if (autoplayTimerRef.current) {
      window.clearTimeout(autoplayTimerRef.current.handle);
    }
    const handle = window.setTimeout(() => {
      autoplayLastFireKeyRef.current = fireKey;
      autoplayTimerRef.current = null;
      action!();
    }, delayMs) as unknown as number;
    autoplayTimerRef.current = { handle, fireKey };
  }, [
    autoplayEnabled, autoplayPaused, roomCode, emit,
    state?.phase, state?.rulesSlideIndex, state?.allAnswered,
    state?.introStep, state?.categoryIsNew,
    state?.comebackIntroStep,
    state?.connections?.phase,
    state?.muchoRevealStep, state?.zvzRevealStep, state?.cheeseRevealStep, state?.mapRevealStep,
    state?.pendingFor, state?.pendingAction, // 2026-05-07: PLACEMENT-Flow (action-Wechsel)
    state?.currentQuestion?.id, state?.answers?.length,
    (state as any)?.timerExpired, // 2026-05-02 v2: trigger Autoplay neu wenn Timer abläuft
    (state as any)?.hotPotatoSlotState, // 2026-05-07: HP 3-Phasen-Flow (rolling→landed→finished)
    state?.comebackHL?.phase, // 2026-05-07: H/L question→reveal Wechsel
    // comebackHL answers count via stringified key — Effect re-runt wenn Team antwortet
    state?.comebackHL ? Object.keys(state.comebackHL.answers ?? {}).length : 0,
    // 2026-05-09 (Wolf End-Flow): Multi-Step FINAL_REVEAL braucht Re-Trigger
    // bei jedem Step-Wechsel sonst hängt Autoplay nach erstem Step.
    (state as any)?.finalRevealStep,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── L11 Fix 2 (2026-05-10): Cleanup für laufenden Autoplay-Timer ──
  //
  // Vorher: der große Outer-Effect oben hat KEINEN useEffect-Return-Cleanup
  // (inline-Cleanup räumt nur bei fireKey-Wechsel auf). Folge — Wolf-Audit-
  // Findings (todo.md L11):
  //  A) Timer überlebt Unmount/Phase-Wechsel zu GAME_OVER/THANKS/LOBBY.
  //  B) Bei Pause läuft der vor-Pause-Timer weiter und feuert während Pause
  //     den nächsten Step (z.B. unbeabsichtigter qq:nextQuestion).
  //  C) Bei Reconnect/session:restarted bleibt der Timer-Ref besetzt.
  //
  // Lösung in 2 Effekten:
  //  - Reaktiv: Pause/Disable/Stop-Phase → laufenden Timer SOFORT canceln.
  //    `autoplayLastFireKeyRef` bleibt unverändert; beim Resume sieht der
  //    Outer-Effect einen NEUEN fireKey (state hat sich i.d.R. weitergedreht)
  //    und schedulet sauber neu. Falls fireKey identisch ist und schon
  //    gefeuert wurde, ist die Aktion ohnehin obsolet — kein Re-Fire wollen.
  //  - Unmount: vollständig — Timer kill + LastFireKey nullen.
  //
  // WICHTIG: NICHT in den Outer-Effect ein generisches `return () => clearTimeout`
  // bauen — das würde den ref-stabilen Timer bei jedem dep-change platt machen
  // und den Wolf-Bug „autoplay langsam" wieder reaktivieren (Memory v2-Fix).
  useEffect(() => {
    const stopPhase = state?.phase === 'GAME_OVER'
      || state?.phase === 'THANKS'
      || state?.phase === 'LOBBY';
    const inactive = !autoplayEnabled || autoplayPaused || stopPhase;
    if (inactive && autoplayTimerRef.current) {
      window.clearTimeout(autoplayTimerRef.current.handle);
      autoplayTimerRef.current = null;
    }
  }, [autoplayEnabled, autoplayPaused, state?.phase]);

  useEffect(() => {
    return () => {
      if (autoplayTimerRef.current) {
        window.clearTimeout(autoplayTimerRef.current.handle);
        autoplayTimerRef.current = null;
      }
      autoplayLastFireKeyRef.current = null;
    };
  }, []);

  // 2026-05-09 (Wolf-Bug): separater HP-Slot-Autoplay-Effect mit MINIMALEN
  // Deps. Vorher lief HP-Slot-Branch im großen Outer-Autoplay-Effect mit
  // ~15 state-Feldern als Deps — bei jedem state-update (answers.length etc.)
  // wurde der Timer neu gestartet, was zu Multi-Triggers führte trotz Dedup-Ref.
  // Dieser Effect re-runs NUR wenn (phase, hps, qId) sich ändert → sauber.
  // Flow: Slot rolling 3.4 s → emit finishSlot → Backend setzt landed →
  // Effect re-runs mit hps=landed → Timer 1.8 s → emit finishSlot → finished.
  useEffect(() => {
    if (!autoplayEnabled || autoplayPaused) return;
    const s = state;
    if (!s) return;
    if (s.phase !== 'QUESTION_ACTIVE') return;
    const sk = (s.currentQuestion?.bunteTuete as { kind?: string } | undefined)?.kind;
    if (sk !== 'hotPotato') return;
    const hps = (s as any).hotPotatoSlotState;
    if (hps !== 'rolling' && hps !== 'landed') return;
    const delay = hps === 'rolling' ? 3400 : 1800;
    const timer = window.setTimeout(() => {
      emitRef.current('qq:hotPotatoFinishSlot', { roomCode });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [
    autoplayEnabled, autoplayPaused, roomCode,
    state?.phase,
    state?.currentQuestion?.id,
    (state as any)?.hotPotatoSlotState,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKey = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target?.tagName && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

    // ? / Shift+/ — Hotkey-Cheatsheet toggle (auch waehrend Pause/Start erlaubt)
    if (e.key === '?' || (e.shiftKey && e.code === 'Slash')) {
      e.preventDefault(); playHotkeyFeedback();
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
      // 2026-05-10 (Audit-P0 State-Race): Globaler 350ms-Lock auf den Space-
      // Handler. Vorher konnte ein Doppel-Klick (Streamdeck-Bouncing oder
      // Wolfs Hand) WRONG_PHASE-Errors triggern wenn Backend mid-Phase-Switch
      // war: HP→Reveal, Comeback-Intro→H/L-Start, PHASE_INTRO→Activate.
      // Lock blockiert silent (kein Toast) — Wolf merkt's nicht, Backend
      // bleibt sauber.
      if (!canFire('space-advance')) return;
      playHotkeyFeedback();
      if (s.phase === 'RULES') {
        // 2026-05-09 (Audit): 9 oder 10 Folien je nach connectionsEnabled.
        // 2026-05-09 (Wolf): Neue-Fähigkeiten-Slide raus → 9 statt 10 / 8 statt 9.
        // 2026-05-24 (Wolf 'connections raus'): Connections-Rules-Slide entfaellt.
        const totalSlides = 4 + ((s as any).cozyGamesEnabled ? 1 : 0);
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
      else if (s.phase === 'QUESTION_ACTIVE') {
        // 2026-05-06 (Wolf-Wunsch 'Slot-Machine vor erstem HP-Zug'):
        // Bei Hot Potato im 'rolling'-State stoppt der zweite Space erst die
        // Slot-Machine (= startet Turn-Timer + gibt /team-Eingabe frei),
        // statt direkt zur Reveal-Phase zu springen.
        // 2026-05-07 (Wolf '3-Phasen-Flow'): jetzt zwei Spaces statt einem —
        // rolling→landed (Sieger steht, kein Timer) und landed→finished
        // (Timer startet). Beide triggern qq:hotPotatoFinishSlot, Backend
        // entscheidet anhand State.
        const subKindActive = (q?.bunteTuete as { kind?: string } | undefined)?.kind;
        const slotPending = (s as any).hotPotatoSlotState === 'rolling'
          || (s as any).hotPotatoSlotState === 'landed';
        if (subKindActive === 'hotPotato' && slotPending) {
          if (canFire('hp')) emitRef.current('qq:hotPotatoFinishSlot', { roomCode });
        } else {
          emitRef.current('qq:revealAnswer', { roomCode });
        }
      }
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
      // Final-Wager (2026-05-09): Space-Steuerung für die 2 neuen Phasen.
      // Start der Bet-Phase ist explizit Mod-Button — Space würde sonst
      // zwischen Phase 3 und 4 immer Bet-Phase einleiten, auch wenn nicht
      // gewünscht. FINAL_BETTING + FINAL_REVEAL haben dann normalen Space-Flow.
      // 2026-05-24 (Wolf-Live-Test): wenn Intro-Slide noch nicht dismissed,
      // Space → Intro weg statt finishFinalBetting.
      else if (s.phase === 'FINAL_BETTING') {
        if ((s as any).finalBettingIntroDone === false) {
          emitRef.current('qq:finishFinalBettingIntro', { roomCode });
        } else {
          emitRef.current('qq:finishFinalBetting', { roomCode });
        }
      }
      else if (s.phase === 'FINAL_REVEAL')
        emitRef.current('qq:nextQuestion', { roomCode });
      else if (s.phase === 'GAME_OVER')
        emitRef.current('qq:showThanks', { roomCode });
      return;
    }

    // R — Reveal answer (mirrors CozyQuiz R)
    if (e.code === 'KeyR') {
      e.preventDefault(); playHotkeyFeedback();
      if (s.phase === 'QUESTION_ACTIVE') {
        // Slot-Machine respektieren — sonst wuerde R die HP-Frage abrupt
        // skippen, ohne dass jemand antworten konnte.
        const subKindR = (q?.bunteTuete as { kind?: string } | undefined)?.kind;
        const slotPendingR = (s as any).hotPotatoSlotState === 'rolling'
          || (s as any).hotPotatoSlotState === 'landed';
        if (subKindR === 'hotPotato' && slotPendingR) {
          if (canFire('hp')) emitRef.current('qq:hotPotatoFinishSlot', { roomCode });
        } else {
          emitRef.current('qq:revealAnswer', { roomCode });
        }
      }
      return;
    }

    // N — Next question (only from PLACEMENT, not QUESTION_REVEAL)
    if (e.code === 'KeyN') {
      e.preventDefault(); playHotkeyFeedback();
      if (s.phase === 'PLACEMENT' && !s.pendingFor)
        emitRef.current('qq:nextQuestion', { roomCode });
      return;
    }

    // ArrowRight — Next question (extra StreamDeck option)
    if (e.code === 'ArrowRight') {
      e.preventDefault(); playHotkeyFeedback();
      if (s.phase === 'PLACEMENT' && !s.pendingFor)
        emitRef.current('qq:nextQuestion', { roomCode });
      return;
    }

    // Escape / Backspace — Niemand korrekt (mirrors CozyQuiz step-back feel)
    if (e.code === 'Escape' || e.code === 'Backspace') {
      if (s.phase === 'QUESTION_REVEAL' && !s.correctTeamId) {
        playHotkeyFeedback();
        emitRef.current('qq:markWrong', { roomCode });
      }
      return;
    }

    // Z — Undo Mark-Correct (Wolf 2026-05-10): falls Mod versehentlich falschen
    // Sieger markiert hat. Nur in QUESTION_REVEAL aktiv und nur wenn ein
    // correctTeamId gesetzt ist (sonst nichts zum Rückgängigmachen). Backend
    // setzt zurück auf 'kein Sieger', Mod kann dann neu markieren.
    if (e.code === 'KeyZ') {
      e.preventDefault();
      if (s.phase === 'QUESTION_REVEAL' && s.correctTeamId) {
        playHotkeyFeedback();
        emitRef.current('qq:undoMarkCorrect', { roomCode });
      }
      return;
    }

    // Number keys 1–8 → mark team correct. 2026-05-11 (Audit P0): von 1-5 auf
    // 1-8 erweitert. Wolf moderiert bis zu 8 Teams; Slot 6-8 brauchten vorher
    // Mausgriff. Streamdeck-Pad jetzt komplett abgedeckt.
    // 2026-05-19 (Cockpit-Audit M2): canFire('team-mark')-Lock — Streamdeck-Bounce
    // konnte vorher Doppel-Mark triggern bei eng beieinanderliegenden Keys.
    if (['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8'].includes(e.code)) {
      if (s.phase === 'QUESTION_REVEAL' && !s.correctTeamId) {
        const idx = parseInt(e.code.replace('Digit', '')) - 1;
        const team = s.teams[idx];
        if (team && canFire('team-mark')) {
          playHotkeyFeedback();
          emitRef.current('qq:markCorrect', { roomCode, teamId: team.id });
        }
      }
      return;
    }

    // F13 — Nächste Aktion (= Space)
    // 2026-05-19 (Reliability-Audit R1): canFire-Lock wie auf der Space/Enter-
    // Variante — sonst kann Streamdeck-Bounce auf F13 Doppel-Emits ausloesen
    // (z.B. qq:finishFinalBetting 2x). Backend wirft auf 2. Call WRONG_PHASE,
    // aber sauberer ist gar nicht erst doppelt zu emitten.
    if (e.code === 'F13') {
      e.preventDefault();
      if (!canFire('space-advance')) return;
      playHotkeyFeedback();
      if (s.phase === 'RULES') {
        // 2026-05-09 (Wolf): Neue-Fähigkeiten-Slide raus → 9 statt 10 / 8 statt 9.
        // 2026-05-24 (Wolf 'connections raus'): Connections-Rules-Slide entfaellt.
        const totalSlides = 4 + ((s as any).cozyGamesEnabled ? 1 : 0);
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
      else if (s.phase === 'QUESTION_ACTIVE') {
        // 2026-05-06 (Wolf-Wunsch 'Slot-Machine vor erstem HP-Zug'):
        // Bei Hot Potato im 'rolling'-State stoppt der zweite Space erst die
        // Slot-Machine (= startet Turn-Timer + gibt /team-Eingabe frei),
        // statt direkt zur Reveal-Phase zu springen.
        // 2026-05-07 (Wolf '3-Phasen-Flow'): jetzt zwei Spaces statt einem —
        // rolling→landed (Sieger steht, kein Timer) und landed→finished
        // (Timer startet). Beide triggern qq:hotPotatoFinishSlot, Backend
        // entscheidet anhand State.
        const subKindActive = (q?.bunteTuete as { kind?: string } | undefined)?.kind;
        const slotPending = (s as any).hotPotatoSlotState === 'rolling'
          || (s as any).hotPotatoSlotState === 'landed';
        if (subKindActive === 'hotPotato' && slotPending) {
          if (canFire('hp')) emitRef.current('qq:hotPotatoFinishSlot', { roomCode });
        } else {
          emitRef.current('qq:revealAnswer', { roomCode });
        }
      }
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

    // F14 — Team 1 korrekt (schnellster Buzz-Winner bestätigen).
    // 2026-05-19 (Cockpit-Audit M2): canFire-Lock wie bei Digit1-8.
    if (e.code === 'F14') {
      e.preventDefault(); playHotkeyFeedback();
      if (s.phase === 'QUESTION_REVEAL' && !s.correctTeamId && s.teams[0] && canFire('team-mark'))
        emitRef.current('qq:markCorrect', { roomCode, teamId: s.teams[0].id });
      return;
    }

    // F15 — Antwort aufdecken (= R)
    if (e.code === 'F15') {
      e.preventDefault(); playHotkeyFeedback();
      if (s.phase === 'QUESTION_ACTIVE') emitRef.current('qq:revealAnswer', { roomCode });
      return;
    }

    // F16 — Niemand korrekt (= Esc)
    if (e.code === 'F16') {
      e.preventDefault(); playHotkeyFeedback();
      if (s.phase === 'QUESTION_REVEAL' && !s.correctTeamId)
        emitRef.current('qq:markWrong', { roomCode });
      return;
    }

    // F17 — Nächste Frage (= N) — only from PLACEMENT
    if (e.code === 'F17') {
      e.preventDefault(); playHotkeyFeedback();
      if (s.phase === 'PLACEMENT' && !s.pendingFor)
        emitRef.current('qq:nextQuestion', { roomCode });
      return;
    }

    // F18 — Skip aktuelles Team (Wolf 2026-05-05, Live-Mod-Audit #9):
    // direkter Skip-Pfad fuer Streamdeck. Nur in PLACEMENT mit pendingFor —
    // umgeht den confirm()-Dialog des Skip-Buttons; Wolf bestaetigt via
    // bewusstem Hotkey-Druck.
    if (e.code === 'F18') {
      e.preventDefault(); playHotkeyFeedback();
      if (s.phase === 'PLACEMENT' && s.pendingFor)
        emitRef.current('qq:skipCurrentTeam', { roomCode });
      return;
    }

    // M — Toggle mute all (music + sfx)
    if (e.code === 'KeyM') {
      e.preventDefault(); playHotkeyFeedback();
      emitRef.current('qq:setMuted', { roomCode, muted: !(stateRef.current?.globalMuted ?? false) });
      return;
    }

    // P / F19 — Toggle pause (2026-05-08: F19 als Streamdeck-Mapping
    // ergänzt — Wolf-Audit hatte P ohne Streamdeck-Key gefunden).
    if (e.code === 'KeyP' || e.code === 'F19') {
      e.preventDefault(); playHotkeyFeedback();
      if (s.phase === 'PAUSED') emitRef.current('qq:resume', { roomCode });
      else if (!['LOBBY', 'GAME_OVER', 'THANKS', 'RULES', 'TEAMS_REVEAL'].includes(s.phase))
        emitRef.current('qq:pause', { roomCode });
      return;
    }

    // 2026-05-24 (Wolf-Live-Test #7): Universal Undo-Last-Action.
    // Ctrl+Z — macht den letzten Place/Steal rückgängig.
    // Backend speichert den Snapshot vor jeder Aktion automatisch.
    if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault(); playHotkeyFeedback();
      emitRef.current('qq:undoLastAction', { roomCode });
      return;
    }

    // 2026-05-24 (Wolf-Wunsch 'Back-Button als Gegensatz zum Weiter-Button'):
    // Shift+Space oder Backspace — Slide zurueck in slide-basierten Phasen
    // (RULES, PHASE_INTRO, FINAL_REVEAL, QUESTION_REVEAL-Steps, COMEBACK_INTRO).
    // Funktioniert nicht in PLACEMENT/QUESTION_ACTIVE (dort gilt Ctrl+Z fuer Undo).
    if ((e.code === 'Space' && e.shiftKey) || e.code === 'Backspace') {
      e.preventDefault(); playHotkeyFeedback();
      emitRef.current('qq:goBackSlide', { roomCode });
      return;
    }

    // F20 — Reset-Notfall (Wolf 2026-05-19, Cockpit-Audit M1):
    // direkter Streamdeck-Hotkey für qq:resetRoom. Mit window.confirm
    // damit kein Streamdeck-Bounce versehentlich das ganze Spiel killt.
    // Standard-Reset-Buttons im DangerMenu bleiben als Alternativen.
    if (e.code === 'F20') {
      e.preventDefault(); playHotkeyFeedback();
      if (window.confirm('🚨 Notfall-Reset: laufendes Spiel komplett zurücksetzen?\n\nAlle Teams müssen neu joinen, Score geht verloren.')) {
        emitRef.current('qq:resetRoom', { roomCode });
      }
      return;
    }
  }, [roomCode, canFire]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const s = state;
  const teamList = s?.teams ?? [];
  // 2026-05-08 (Wolf-Audit 'mod page total überladen'): Settings-Card
  // DEFAULT COLLAPSED. Vorher useState(true) → Settings nahmen 180+ px Höhe
  // weg während Live-Quiz. Jetzt: nur in LOBBY default offen, sonst zu.
  const [settingsOpen, setSettingsOpen] = useState(() => {
    return state?.phase === 'LOBBY';
  });
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  useEffect(() => { cheatsheetOpenRef.current = cheatsheetOpen; }, [cheatsheetOpen]);
  // Auto-collapse settings when game starts. Plus auto-open wenn zurück
  // in LOBBY (z. B. via 'Zurück zum Setup').
  const prevPhaseRef = useRef(s?.phase);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    if (prev === 'LOBBY' && s?.phase && s.phase !== 'LOBBY') {
      setSettingsOpen(false);
    } else if (prev !== 'LOBBY' && s?.phase === 'LOBBY') {
      setSettingsOpen(true);
    }
    prevPhaseRef.current = s?.phase;
  }, [s?.phase]);

  // Derive status text for the big banner
  function getStatusText(s: QQStateUpdate): { text: string; color: string; sub?: string } {
    const answeredCount = s.answers.length;
    const connectedTeams = s.teams.filter(t => t.connected).length;
    switch (s.phase) {
      case 'LOBBY': return { text: 'LOBBY', color: QQ_COLORS.slate600, sub: `${s.teams.length} Teams` };
      case 'RULES': {
        const r = s.rulesSlideIndex ?? 0;
        const sub = r === -2 ? 'Willkommen' : r === -1 ? 'Regel-Intro' : `Slide ${r + 1}`;
        return { text: 'REGELN', color: '#6366f1', sub };
      }
      case 'TEAMS_REVEAL': return { text: 'TEAM-REVEAL', color: '#F97316', sub: 'Epische Vorstellung läuft' };
      case 'PHASE_INTRO': return { text: `RUNDE ${s.gamePhaseIndex}`, color: QQ_COLORS.blue500, sub: s.categoryIsNew ? 'Kategorie-Erklärung' : `Intro Step ${s.introStep}` };
      case 'QUESTION_ACTIVE': return { text: 'WARTET AUF ANTWORTEN', color: QQ_COLORS.green500, sub: `${answeredCount}/${connectedTeams} Teams` };
      case 'QUESTION_REVEAL': return { text: s.correctTeamId ? 'ANTWORT AUFGEDECKT' : 'ANTWORT — KEIN GEWINNER', color: QQ_COLORS.brandPink, sub: s.correctTeamId ? `✓ ${teamList.find(t => t.id === s.correctTeamId)?.name}` : undefined };
      case 'PLACEMENT': return { text: s.pendingFor ? 'FELD SETZEN' : 'PLATZIERUNG FERTIG', color: QQ_COLORS.red500, sub: s.pendingFor ? `${teamList.find(t => t.id === s.pendingFor)?.name} setzt` : undefined };
      case 'COMEBACK_CHOICE': return { text: 'COMEBACK', color: QQ_COLORS.violet500 };
      case 'CONNECTIONS_4X4': return { text: '🔗 4×4 — FINALE', color: QQ_COLORS.brandPink, sub: s.connections?.phase ?? '' };
      case 'FINAL_BETTING': {
        const submitted = Object.values(s.finalBettingSubmitted ?? {}).filter(Boolean).length;
        return { text: '🪙 FINAL-WETTEN', color: QQ_COLORS.brandPinkMid, sub: `${submitted}/${s.teams.length} Teams gesetzt` };
      }
      case 'FINAL_REVEAL': return { text: '🏆 FINAL-AUFLÖSUNG', color: QQ_COLORS.amber400, sub: 'Score-Cascade am Beamer' };
      case 'COZY_GAME': {
        // 2026-05-19 (Wolf 'cozygames werden im moderator noch nicht beruecksichtigt'):
        // Pro Sub-Phase eigener Sub-Text damit das Mod-Panel den aktuellen
        // CozyGame-State zeigt statt des vorigen Quiz-Phase-Labels.
        const cg = (s as any).cozyGame;
        const subPhase: string = cg?.phase ?? '';
        const subMap: Record<string, string> = {
          'INTRO':         'Pinata-Intro · Glücksrad dreht gleich',
          'WHEEL_SPIN':    '🌀 Rad dreht …',
          'WHEEL_RESULT':  '🎯 Spiel ausgelost — Spiel starten',
          'GAME_ACTIVE':   cg?.playMode === 'sequence' ? '⏱ Sequenz-Modus · Team-Turn läuft' : '⏱ Alle Teams parallel · Timer läuft',
          'WINNER_SELECT': '🏆 Sieger auswählen',
        };
        return { text: '🪅 COZY-GAME', color: QQ_COLORS.brandPinkMid, sub: subMap[subPhase] ?? subPhase };
      }
      case 'PAUSED': return { text: '⏸ PAUSE', color: QQ_COLORS.brandPink };
      case 'GAME_OVER': return { text: '🏆 SPIEL BEENDET', color: QQ_COLORS.slate500 };
      case 'THANKS': return { text: '🙏 DANKE-FOLIE', color: QQ_COLORS.brandPink, sub: 'QR-Code für Summary' };
      default: return { text: s.phase, color: QQ_COLORS.slate600 };
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
          <span style={badgeStyle(QQ_COLORS.blue500)}>COZYQUIZ</span>
          <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--qm-text)' }}>Moderator</span>
          {/* 2026-05-25 (Wolf 'mod-test-modus'): roter Banner damit Wolf nie
              verwechselt ob er Live oder Test ist. */}
          {testMode && (
            <span style={{
              padding: '4px 12px', borderRadius: 999,
              background: 'rgba(239,68,68,0.18)',
              border: '1.5px solid rgba(239,68,68,0.55)',
              color: '#FCA5A5', fontWeight: 900, fontSize: 12,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              animation: 'pulse 2.4s ease-in-out infinite',
            }}>🧪 Test-Modus · keine echten Daten</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* 2026-05-25 (Wolf 'mod-test-modus skip-buttons'): nur im Test-Modus
              sichtbar. POST /api/qq/:room/dev/skipTo manipuliert State direkt:
              Grid teilweise gefuellt, phase = PHASE_INTRO/FINAL_BETTING/FINAL_REVEAL.
              Autoplay laeuft dann ab der gesprungenen Position weiter. */}
          {testMode && joined && state && state.phase !== 'LOBBY' && (
            <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
              {(['phase-2', 'phase-3', 'phase-4', 'final-bet', 'final-reveal'] as const).map(target => {
                const labels: Record<typeof target, string> = {
                  'phase-2': '→ R2',
                  'phase-3': '→ R3',
                  'phase-4': '→ R4',
                  'final-bet': '→ Bet',
                  'final-reveal': '→ Reveal',
                };
                return (
                  <button
                    key={target}
                    onClick={async () => {
                      await fetch(`/api/qq/${roomCode}/dev/skipTo`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ target }),
                      });
                    }}
                    title={`Test-Skip: ${target}`}
                    style={{
                      padding: '5px 10px', borderRadius: 6,
                      border: '1px solid rgba(239,68,68,0.45)',
                      background: 'rgba(239,68,68,0.12)',
                      color: '#FCA5A5', cursor: 'pointer',
                      fontFamily: 'inherit', fontWeight: 900, fontSize: 11, lineHeight: 1,
                    }}
                  >{labels[target]}</button>
                );
              })}
            </div>
          )}
          {/* Autoplay Pause/Resume — sichtbar nur wenn aktiv und im Spiel */}
          {autoplayEnabled && joined && state && state.phase !== 'LOBBY' && state.phase !== 'GAME_OVER' && state.phase !== 'THANKS' && (
            <button
              onClick={() => setAutoplayPaused(v => !v)}
              title={autoplayPaused ? 'Autoplay fortsetzen' : 'Autoplay pausieren'}
              style={{
                padding: '6px 14px', borderRadius: 8,
                border: `1px solid ${autoplayPaused ? 'rgba(236,72,153,0.5)' : 'rgba(34,197,94,0.5)'}`,
                background: autoplayPaused ? 'rgba(236,72,153,0.18)' : 'rgba(34,197,94,0.14)',
                color: autoplayPaused ? QQ_COLORS.brandPinkSoft : QQ_COLORS.green300, cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 900, fontSize: 13, lineHeight: 1,
                boxShadow: 'var(--qm-depth-sm)',
              }}
            >{autoplayPaused ? '▶ Autoplay' : '⏸ Autoplay'}</button>
          )}
          {/* 2026-05-24 (Wolf-Bug 'Bots laufen weiter wenn Autoplay pausiert'):
              Server-side Bot-Pause. Sichtbar wenn _dummy-Teams im Raum sind. */}
          {joined && state && state.teams?.some((t: any) => t._dummy) && state.phase !== 'LOBBY' && state.phase !== 'GAME_OVER' && state.phase !== 'THANKS' && (
            <button
              onClick={() => emit('qq:setBotsPaused', { roomCode, paused: !((state as any).botsPaused) })}
              title={(state as any).botsPaused ? 'Bot-Aktionen fortsetzen' : 'Bot-Aktionen serverseitig stoppen'}
              style={{
                padding: '6px 14px', borderRadius: 8,
                border: `1px solid ${(state as any).botsPaused ? 'rgba(251,191,36,0.5)' : 'rgba(148,163,184,0.4)'}`,
                background: (state as any).botsPaused ? 'rgba(251,191,36,0.18)' : 'rgba(148,163,184,0.10)',
                color: (state as any).botsPaused ? QQ_COLORS.yellow300 : QQ_COLORS.slate300, cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 900, fontSize: 13, lineHeight: 1,
                boxShadow: 'var(--qm-depth-sm)',
              }}
            >{(state as any).botsPaused ? '▶ Bots' : '⏸ Bots'}</button>
          )}
          {/* 2026-05-24 (Wolf 'A — persistente Forward + Back Pills'): Beide
              Buttons dauerhaft im Header sichtbar (sobald ein Spiel laeuft),
              mit disabled-Look wenn die aktuelle Phase keine Aktion erlaubt.
              Klick dispatched einen synthetic Keyboard-Event → laeuft durch
              den existierenden handleKey (alle Phase-Sub-Logik dort).
              Vorher: Forward war pro Phase im unteren Toolbar verstreut,
              Back nur conditional im Header — Wolf am Streamdeck sah ständig
              springende/verschwindende Buttons. */}
          {joined && state && state.phase !== 'LOBBY' && (() => {
            const canBack = (
              state.phase === 'RULES'
              || state.phase === 'PHASE_INTRO'
              || state.phase === 'FINAL_REVEAL'
              || state.phase === 'QUESTION_REVEAL'
              || (state.phase === 'COMEBACK_CHOICE' && ((state as any).comebackIntroStep ?? 0) > 0)
            );
            const canFwd = state.phase !== 'GAME_OVER' && state.phase !== 'THANKS';
            const fireKey = (code: string, shift: boolean) => {
              window.dispatchEvent(new KeyboardEvent('keydown', { code, shiftKey: shift, bubbles: true }));
            };
            const pillBase: React.CSSProperties = {
              padding: '6px 12px', borderRadius: 8,
              border: '1px solid rgba(148,163,184,0.35)',
              background: 'rgba(148,163,184,0.08)',
              color: QQ_COLORS.slate300, cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 900, fontSize: 13, lineHeight: 1,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              boxShadow: 'var(--qm-depth-sm)',
            };
            const pillDisabled: React.CSSProperties = {
              ...pillBase,
              opacity: 0.32, cursor: 'not-allowed',
              background: 'rgba(148,163,184,0.04)',
            };
            return (
              <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                <button
                  onClick={(e) => { e.currentTarget.blur(); if (canBack) fireKey('Space', true); }}
                  disabled={!canBack}
                  title={canBack ? 'Slide zurück (Shift+Space / Backspace)' : 'In dieser Phase kein Zurück'}
                  style={canBack ? pillBase : pillDisabled}
                >
                  <span style={{ fontSize: 15 }}>↩</span>
                  <span className="qm-kbd qm-kbd-sm" style={{ fontSize: 10 }}>⇧Space</span>
                </button>
                <button
                  onClick={(e) => { e.currentTarget.blur(); if (canFwd) fireKey('Space', false); }}
                  disabled={!canFwd}
                  title={canFwd ? 'Weiter (Space)' : 'Spiel-Ende — kein Weiter'}
                  style={canFwd
                    ? { ...pillBase, borderColor: 'rgba(34,197,94,0.45)', background: 'rgba(34,197,94,0.12)', color: QQ_COLORS.green300 }
                    : pillDisabled}
                >
                  <span style={{ fontSize: 15 }}>▶</span>
                  <span className="qm-kbd qm-kbd-sm" style={{ fontSize: 10 }}>Space</span>
                </button>
              </div>
            );
          })()}
          <button
            onClick={() => setCheatsheetOpen(v => !v)}
            title="Hotkey-Cheatsheet (?)"
            className="qm-ghost"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <span className="qm-kbd qm-kbd-sm">?</span>
            Hotkeys
          </button>
          {/* 2026-05-05 (Phase-7 Bucket-3 BC-3): Persistenter Mute-Badge im
              Header. Vorher zeigte M-Hotkey nur einen Toast — danach keine
              Indicator. Wolf weiss jetzt jederzeit ob Mute aktiv ist. */}
          {state?.globalMuted && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 999,
              background: 'rgba(239,68,68,0.18)',
              border: '1.5px solid rgba(239,68,68,0.6)',
              color: QQ_COLORS.red300, fontWeight: 900, fontSize: 12,
              letterSpacing: '0.04em',
            }} title="Globaler Mute aktiv (M zum Aufheben)">
              🔇 Stumm
            </span>
          )}
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
        <div style={card}><div style={{ color: QQ_COLORS.slate500, fontSize: 14 }}>Verbinde als Moderator…</div></div>
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
                            : '0 0 10px rgba(236,72,153,0.45)',
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
                  {/* 2026-05-17 (Wolf-Audit): Phase/Frage-Pills nur in Gameplay-
                      Phasen — sonst stehen veraltete „Runde 4 / Frage 5"-Werte
                      im Mod-Panel während THANKS/GAME_OVER/Final-Phasen. */}
                  {(s.phase === 'PHASE_INTRO' || s.phase === 'QUESTION_ACTIVE' || s.phase === 'QUESTION_REVEAL' || s.phase === 'PLACEMENT' || s.phase === 'COMEBACK_CHOICE') && (
                    <>
                      <Pill label={`Runde ${s.gamePhaseIndex}/${s.totalPhases}`} color={QQ_COLORS.blue500} />
                      <Pill label={`Frage ${(s.questionIndex % 5) + 1}/5`} color="#6366f1" />
                    </>
                  )}
                  {s.timerEndsAt && <TimerPill endsAt={s.timerEndsAt} />}
                </div>
              </div>
            );
          })()}

          {/* ══ STICKY ACTIVE-TEAM-STRIP — wer ist dran / wer hat geantwortet ══
              2026-05-11 (Senior-Audit P0): bei 8 Teams scrollte Wolf 600+px nach
              unten um zu sehen, wer den Flow blockiert. Jetzt direkt unter Hero
              sticky, zeigt:
              - PLACEMENT/COMEBACK_CHOICE: aktives Team groß + Skip-Hotkey-Hint
              - QUESTION_ACTIVE: 1-Dot pro Team (grün=geantwortet, grau=offen)
              - sonst: collapsed (nicht sichtbar) */}
          <ActiveTeamStrip state={s} />

          {/* ══ HOST NOTES — suggested talking points per phase ══ */}
          <HostNotes state={s} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 14 }}>

          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* ══ SHOW CONTROLS — primary actions ══
                2026-05-24 (Wolf 'buttons springen, space-button wird größer/
                kleiner und verändert position'): Container bekommt festes
                min-height (62px = PrimaryBtn-Höhe inkl. 4px box-shadow-bottom)
                damit der Slot nicht zwischen Phasen kollabiert/wächst. Die
                PrimaryBtn bekommt min-width via CSS damit der Text-Inhalt
                die Buttonbreite nicht mehr diktiert (gleiche Position im Slot
                über alle Phasen). */}
            <div style={{
              ...card,
              border: '1px solid rgba(255,255,255,0.12)',
              padding: '12px 16px',
              minHeight: 86, // 62 (Btn) + 24 (padding)
            }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', minHeight: 56 }}>

                {/* ── RULES ── */}
                {s.phase === 'RULES' && (
                  <RulesControls
                    state={s}
                    roomCode={roomCode}
                    emit={emit}
                    onStartGame={startGame}
                  />
                )}

                {/* ── FINAL_REVEAL (Space-Button) ──
                    2026-05-19 (Wolf 'ich habe nach dem race keine space taste mehr
                    im moderator'): waehrend FINAL_REVEAL gab's keinen sichtbaren
                    Mod-Button, nur das Info-Panel weiter unten. Space wurde global
                    durch line 992 emittiert, war aber visuell unsichtbar. */}
                {s.phase === 'FINAL_REVEAL' && (() => {
                  // 2026-05-24 v3 (Wolf 'awards-overview raus'): max = betSlotsCount + 4
                  // (title + 3 award-slots + bet-slots + race-final).
                  const betted = s.teams.filter(t => s.finalBetResolution?.[t.id]?.targetTeamId);
                  const zeroExists = betted.some(t => (s.finalBetResolution?.[t.id]?.totalBonus ?? 0) === 0);
                  const positiveCount = betted.filter(t => (s.finalBetResolution?.[t.id]?.totalBonus ?? 0) > 0).length;
                  const betSlotsCount = positiveCount + (zeroExists ? 1 : 0);
                  const step = (s as any).finalRevealStep ?? 0;
                  const max = betSlotsCount + 4;
                  const isLast = step >= max;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
                      <div style={{ fontSize: 11, color: QQ_COLORS.slate400, textAlign: 'center' }}>
                        🏆 Auflösung · Step {step}/{max}
                      </div>
                      <PrimaryBtn
                        color={isLast ? QQ_COLORS.green500 : QQ_COLORS.amber400}
                        onClick={() => emit('qq:nextQuestion', { roomCode })}
                        hotkey="Space"
                      >
                        {isLast ? '▶ Zur THANKS-Folie' : '▶ Nächster Step'}
                      </PrimaryBtn>
                    </div>
                  );
                })()}

                {/* ── TEAMS REVEAL ── */}
                {s.phase === 'TEAMS_REVEAL' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 12, color: QQ_COLORS.slate400, textAlign: 'center' }}>
                      🎬 Epische Team-Vorstellung läuft auf dem Beamer…
                    </div>
                    <PrimaryBtn color={QQ_COLORS.green500} onClick={() => emit('qq:teamsRevealFinish', { roomCode })} hotkey="Space">
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
                    <PrimaryBtn color={QQ_COLORS.green500} onClick={() => { if (startingRef.current) return; emit('qq:activateQuestion', { roomCode }); }} hotkey="Space">
                      {label}
                    </PrimaryBtn>
                  );
                })()}

                {/* ── QUESTION ACTIVE ── */}
                {/* 2026-05-07 (Wolf-Bug 'Antwort-aufdecken sichtbar waehrend
                    Slot rollt — Klick ueberspringt Slot komplett'): bei
                    HotPotato im rolling/landed-State diesen Button NICHT
                    zeigen — sonst kommt's zu Confusion mit den HP-eigenen
                    Slot-Stop/Timer-Start-Buttons. */}
                {s.phase === 'QUESTION_ACTIVE'
                  && !(s.currentQuestion?.bunteTuete?.kind === 'hotPotato'
                       && ((s as any).hotPotatoSlotState === 'rolling'
                           || (s as any).hotPotatoSlotState === 'landed')) && (
                  <PrimaryBtn color={QQ_COLORS.brandPink} onClick={() => emit('qq:revealAnswer', { roomCode })} hotkey="Space">
                    👁 Antwort aufdecken
                  </PrimaryBtn>
                )}

                {/* Imposter (oneOfEight) controls */}
                {s.phase === 'QUESTION_ACTIVE' && s.currentQuestion?.bunteTuete?.kind === 'oneOfEight' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {!s.imposterActiveTeamId ? (
                      <Btn color={QQ_COLORS.violet500} onClick={() => emit('qq:imposterStart', { roomCode })}>
                        <QQEmojiIcon emoji="🕵️"/> Imposter starten
                      </Btn>
                    ) : (
                      <>
                        <div style={{ fontSize: 13, color: '#fff', background: s.teams.find(t => t.id === s.imposterActiveTeamId)?.color ?? '#666', padding: '4px 10px', borderRadius: 8, textAlign: 'center' }}>
                          <QQEmojiIcon emoji="🕵️"/> {s.teams.find(t => t.id === s.imposterActiveTeamId)?.name ?? '?'} wählt
                        </div>
                        <div style={{ fontSize: 11, color: QQ_COLORS.slate400 }}>
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
                      <Btn color={QQ_COLORS.red500} onClick={() => emit('qq:hotPotatoStart', { roomCode })}>
                        🎁 Hot Potato starten
                      </Btn>
                    ) : (s as any).hotPotatoSlotState === 'rolling' ? (
                      // 2026-05-06: Slot-Machine dreht — Mod kann via Space (oder
                      // Button) den Roll stoppen → State 'landed' (kein Timer noch).
                      <>
                        <div style={{ fontSize: 12, color: QQ_COLORS.slate400, textAlign: 'center', fontWeight: 700 }}>
                          🎰 Slot dreht — Space stoppt
                        </div>
                        <div style={{ fontSize: 13, color: '#fff', background: s.teams.find(t => t.id === s.hotPotatoActiveTeamId)?.color ?? '#666', padding: '4px 10px', borderRadius: 8, textAlign: 'center' }}>
                          <QQEmojiIcon emoji="🥔"/> {s.teams.find(t => t.id === s.hotPotatoActiveTeamId)?.name ?? '?'}
                        </div>
                        <Btn color={QQ_COLORS.brandPink} onClick={() => { if (canFire('hp')) emit('qq:hotPotatoFinishSlot', { roomCode }); }}>
                          🎯 Sieger anzeigen (Space)
                        </Btn>
                      </>
                    ) : (s as any).hotPotatoSlotState === 'landed' ? (
                      // 2026-05-07 (Wolf '3-Phasen-Flow'): Sieger steht, Mod
                      // announciert muendlich, naechstes Space startet Timer.
                      <>
                        <div style={{ fontSize: 12, color: QQ_COLORS.yellow300, textAlign: 'center', fontWeight: 700 }}>
                          🎯 Sieger steht — Space startet Timer
                        </div>
                        <div style={{ fontSize: 13, color: '#fff', background: s.teams.find(t => t.id === s.hotPotatoActiveTeamId)?.color ?? '#666', padding: '4px 10px', borderRadius: 8, textAlign: 'center' }}>
                          <QQEmojiIcon emoji="🥔"/> {s.teams.find(t => t.id === s.hotPotatoActiveTeamId)?.name ?? '?'}
                        </div>
                        <Btn color={QQ_COLORS.green500} onClick={() => { if (canFire('hp')) emit('qq:hotPotatoFinishSlot', { roomCode }); }}>
                          ▶ Los geht's (Space)
                        </Btn>
                      </>
                    ) : (
                      <>
                        {/* 2026-05-07 (Wolf 'zwischen slot-ende und reveal
                            fehlt eine Zwischenbeschreibung wie Frage gestartet'):
                            Status-Header zeigt jetzt klar an dass die Frage
                            laeuft + Space-Hint zum Reveal. */}
                        <div style={{ fontSize: 12, color: QQ_COLORS.green300, textAlign: 'center', fontWeight: 700 }}>
                          ▶ Frage laeuft — Space deckt Antwort auf
                        </div>
                        <div style={{ fontSize: 13, color: '#fff', background: s.teams.find(t => t.id === s.hotPotatoActiveTeamId)?.color ?? '#666', padding: '4px 10px', borderRadius: 8, textAlign: 'center' }}>
                          <QQEmojiIcon emoji="🥔"/> {s.teams.find(t => t.id === s.hotPotatoActiveTeamId)?.name ?? '?'}
                        </div>
                        {s.hotPotatoLastAnswer ? (
                          <>
                            <div style={{ fontSize: 15, fontWeight: 700, color: QQ_COLORS.slate100, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', textAlign: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
                              „{s.hotPotatoLastAnswer}"
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <Btn color={QQ_COLORS.green500} onClick={() => emit('qq:hotPotatoCorrect', { roomCode })}>
                                ✓ Richtig
                              </Btn>
                              <Btn color={QQ_COLORS.red500} onClick={() => emit('qq:hotPotatoWrong', { roomCode })}>
                                ✗ Falsch
                              </Btn>
                            </div>
                          </>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <Btn color={QQ_COLORS.red500} onClick={() => emit('qq:hotPotatoWrong', { roomCode })}>
                              ✗ Falsch / Zu langsam
                            </Btn>
                          </div>
                        )}
                        {s.hotPotatoEliminated.length > 0 && (
                          <div style={{ fontSize: 11, color: QQ_COLORS.slate400 }}>
                            Raus: {s.hotPotatoEliminated.map(id => s.teams.find(t => t.id === id)?.name).filter(Boolean).join(', ')}
                          </div>
                        )}
                        {s.hotPotatoUsedAnswers && s.hotPotatoUsedAnswers.length > 0 && (
                          <div style={{ fontSize: 11, color: QQ_COLORS.slate400 }}>
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
                      <div style={{ fontSize: 13, color: '#fff', background: QQ_COLORS.violet400,
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
                      {/* 2026-05-13 (Wolf 'connect 4 mod-flow noch gefuehlt
                          alt, da steht hinweise aufdecken'): Button-Text auf
                          modernes Modell — Teams schalten selbst frei, Mod
                          beendet die Frage hier nur insgesamt. */}
                      <Btn color={QQ_COLORS.brandPink} outline onClick={() => emit('qq:onlyConnectRevealAll', { roomCode })}>
                        ⏩ Auflösen (Frage beenden)
                      </Btn>
                      <div style={{ fontSize: 11, color: QQ_COLORS.slate400 }}>
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
                        fontSize: 13, color: '#fff', background: QQ_COLORS.brandPinkMid,
                        padding: '4px 10px', borderRadius: 8, textAlign: 'center', fontWeight: 900,
                      }}>
                        🎭 Bluff · {bp ?? '—'}
                        {bp === 'write' && ` · ${submitCount}/${totalActive} eingereicht`}
                        {bp === 'vote' && ` · ${voteCount}/${totalActive} gevotet`}
                      </div>
                      {bp === 'write' && (
                        <PrimaryBtn color={QQ_COLORS.brandPinkMid} onClick={() => emit('qq:bluffForceAdvanceWrite', { roomCode })} hotkey="Space">
                          ⏹ Schreib-Phase beenden →
                        </PrimaryBtn>
                      )}
                      {bp === 'review' && (
                        <>
                          <div style={{ fontSize: 11, color: QQ_COLORS.slate400, marginBottom: 2 }}>
                            👮 Bluffs prüfen — ✕ klicken um zu zensieren
                          </div>
                          {/* 2026-05-19 (Cockpit-Audit MC2): bei vielen Submissions
                              scrollable Container (max 5 Rows à ~36px sichtbar,
                              ~180px Cap). Vorher: alle 8 Rows = ~256px push
                              den Voting-Button unter den Fold. */}
                          <div style={{
                            display: 'flex', flexDirection: 'column', gap: 4,
                            maxHeight: 200, overflowY: 'auto',
                            paddingRight: 4,
                          }}>
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
                                <span style={{ fontSize: 11, fontWeight: 900, color: tm?.color ?? QQ_COLORS.slate400, minWidth: 56 }}>
                                  {tm?.name ?? teamId}
                                </span>
                                <span style={{
                                  flex: 1, fontSize: 12, color: rejected ? QQ_COLORS.red300 : QQ_COLORS.slate200,
                                  textDecoration: rejected ? 'line-through' : undefined,
                                  wordBreak: 'break-word',
                                }}>{text}</span>
                                <button onClick={() => emit('qq:bluffReject', { roomCode, teamId, rejected: !rejected })}
                                  style={{
                                    padding: '2px 8px', borderRadius: 6, cursor: 'pointer',
                                    border: '1px solid rgba(239,68,68,0.4)', background: rejected ? 'rgba(239,68,68,0.18)' : 'transparent',
                                    color: rejected ? '#fff' : QQ_COLORS.red300, fontSize: 11, fontWeight: 900, fontFamily: 'inherit',
                                  }}>
                                  {rejected ? '↺' : '✕'}
                                </button>
                              </div>
                            );
                          })}
                          </div>
                          <PrimaryBtn color={QQ_COLORS.green500} onClick={() => emit('qq:bluffFinishReview', { roomCode })} hotkey="Space">
                            ▶ Voting starten
                          </PrimaryBtn>
                        </>
                      )}
                      {bp === 'vote' && (
                        <PrimaryBtn color={QQ_COLORS.brandPinkMid} onClick={() => emit('qq:bluffForceAdvanceVote', { roomCode })} hotkey="Space">
                          ⏹ Voting beenden →
                        </PrimaryBtn>
                      )}
                      {bp === 'reveal' && (
                        <div style={{ fontSize: 12, color: QQ_COLORS.green300 }}>✓ Reveal läuft — Space → nächste Frage</div>
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
                        <PrimaryBtn color={QQ_COLORS.blue500} onClick={() => emit('qq:muchoRevealStep', { roomCode })} hotkey="Space">
                          {label}
                        </PrimaryBtn>
                        <span style={{ fontSize: 11, color: QQ_COLORS.slate400, textAlign: 'center' }}>{helper}</span>
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
                        <PrimaryBtn color={QQ_COLORS.blue500} onClick={() => emit('qq:zvzRevealStep', { roomCode })} hotkey="Space">
                          {label}
                        </PrimaryBtn>
                        <span style={{ fontSize: 11, color: QQ_COLORS.slate400, textAlign: 'center' }}>{helper}</span>
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
                          color={isAutoPhase ? QQ_COLORS.slate500 : QQ_COLORS.brandPink}
                          onClick={() => emit('qq:mapRevealStep', { roomCode })}
                          hotkey="Space"
                        >
                          {label}
                        </PrimaryBtn>
                        {isAutoPhase && (
                          <span style={{ fontSize: 11, color: QQ_COLORS.slate400, textAlign: 'center' }}>
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
                          <PrimaryBtn color={QQ_COLORS.green500} onClick={() => emit('qq:startPlacement', { roomCode })} hotkey="Space">
                            <QQEmojiIcon emoji="📍"/> Felder setzen
                          </PrimaryBtn>
                          <Btn small color={QQ_COLORS.slate600} onClick={() => {
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
                      <span style={{ fontSize: 12, color: QQ_COLORS.slate600 }}>Kein Gewinner</span>
                      <Btn color={QQ_COLORS.slate500} onClick={() => emit('qq:startPlacement', { roomCode })}>
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
                  const isBeforeFinal = isEndOfPhase && (s.gamePhaseIndex + 1) === s.totalPhases;
                  // 2026-05-24 (Wolf 'connections raus'): kein 4×4-Branch mehr.
                  const label = isLastPhase
                    ? '🏆 Spielende'
                    : isBeforeFinal
                      ? '⚡ Comeback-Phase'
                      : isEndOfPhase
                        ? `→ Runde ${s.gamePhaseIndex + 1}`
                        : '→ Nächste Frage';
                  return (
                    <PrimaryBtn color={QQ_COLORS.green500} onClick={() => emit('qq:nextQuestion', { roomCode })} hotkey="Space">
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

                {/* ── FINAL_BETTING ── 2026-05-24 (Wolf-Bug 'Space-Button
                    fehlt sichtbar bei Place-Your-Bet'): expliziter PrimaryBtn
                    in der Toolbar. Drei Sub-Phases:
                     1. Intro-Slide aktiv (finalBettingIntroDone===false) →
                        'Bet-Phase starten' (= ehem. Final-Tipp-Erklär-Slide
                        aus Rules, jetzt als Mod-Flow vor Betting).
                     2. Submissions laufen, nicht alle eingereicht → Status-
                        Anzeige + 'Reveal starten' (Mod kann anyway weiter).
                     3. Alle Submissions da → 'Reveal starten' grün. */}
                {s.phase === 'FINAL_BETTING' && (() => {
                  const introActive = (s as any).finalBettingIntroDone === false;
                  const submitted = Object.values(s.finalBettingSubmitted ?? {}).filter(Boolean).length;
                  const total = s.teams.length;
                  const allIn = submitted >= total;
                  if (introActive) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
                        <div style={{ fontSize: 11, color: QQ_COLORS.slate400, textAlign: 'center' }}>
                          🎰 Final-Tipp-Erklärung
                        </div>
                        <PrimaryBtn
                          color={QQ_COLORS.brandPinkMid}
                          onClick={() => emit('qq:finishFinalBettingIntro', { roomCode })}
                          hotkey="Space"
                        >
                          ▶ Bet-Phase starten
                        </PrimaryBtn>
                      </div>
                    );
                  }
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
                      <div style={{ fontSize: 11, color: QQ_COLORS.slate400, textAlign: 'center' }}>
                        🪙 Wetten: {submitted}/{total}
                      </div>
                      <PrimaryBtn
                        color={allIn ? QQ_COLORS.green500 : QQ_COLORS.amber400}
                        onClick={() => emit('qq:finishFinalBetting', { roomCode })}
                        hotkey="Space"
                      >
                        {allIn ? '▶ Auflösung starten' : '▶ Trotzdem auflösen'}
                      </PrimaryBtn>
                    </div>
                  );
                })()}

                {/* ── GAME OVER ── */}
                {s.phase === 'GAME_OVER' && (() => {
                  const tieCands = s.tieBreakerCandidates ?? [];
                  const tieResolved = !!s.tieBreakerWinnerId;
                  const tieActive = tieCands.length >= 2 && !tieResolved;
                  return (
                    <>
                      <div style={{ fontSize: 15, color: QQ_COLORS.slate400, fontWeight: 900 }}><QQEmojiIcon emoji="🏆"/> Spiel beendet</div>
                      {tieActive && (
                        <div style={{
                          display: 'flex', flexDirection: 'column', gap: 6,
                          padding: '8px 12px', borderRadius: 8,
                          border: '1.5px solid #EC489988',
                          background: 'rgba(236,72,153,0.10)',
                        }}>
                          <div style={{ fontSize: 12, fontWeight: 900, color: QQ_COLORS.brandPink, letterSpacing: '0.04em' }}>
                            ⚠ STECHFRAGE — gleicher Endstand bei {tieCands.length} Teams
                          </div>
                          <div style={{ fontSize: 11, color: QQ_COLORS.slate400, fontWeight: 700, lineHeight: 1.35 }}>
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
                          fontSize: 12, fontWeight: 900, color: QQ_COLORS.brandPink,
                          padding: '4px 10px', borderRadius: 8,
                          background: 'rgba(236,72,153,0.10)',
                        }}>
                          ✓ Stechfrage aufgeloest — {s.teams.find(t => t.id === s.tieBreakerWinnerId)?.name}
                        </div>
                      )}
                      <PrimaryBtn color={QQ_COLORS.brandPink} onClick={() => emit('qq:showThanks', { roomCode })} hotkey="Space">
                        ▶ Danke-Folie & QR
                      </PrimaryBtn>
                      {/* 2026-05-02 (Event-Manager-Audit): Endstand exportieren.
                          Pub-Wirt will die Wochen-Tafel updaten — heute musste
                          er den Beamer abfotografieren. */}
                      <Btn small color={QQ_COLORS.slate400} onClick={() => downloadEndstandCSV(s, roomCode)}>
                        📄 Endstand CSV
                      </Btn>

                      {/* 2026-05-05 (Wolf-Wunsch B+γ): Team-Highlights als
                          „Spickzettel" beim Score-Durchlaufen. Pro Team Top-3
                          Fakten aus dem Quiz, sortiert nach Rang. Mod hat damit
                          immer was zu sagen statt sich alles selbst zu merken. */}
                      <div style={{
                        marginTop: 12, paddingTop: 12,
                        borderTop: '1.5px solid rgba(255,255,255,0.08)',
                        display: 'flex', flexDirection: 'column', gap: 10,
                        maxHeight: '52vh', overflowY: 'auto',
                        width: '100%',
                      }}>
                        <div style={{
                          fontSize: 11, fontWeight: 900, color: QQ_COLORS.slate400,
                          letterSpacing: '0.1em', textTransform: 'uppercase',
                          marginBottom: 2,
                        }}>
                          📋 Team-Highlights (Spickzettel)
                        </div>
                        {[...s.teams]
                          .sort((a, b) =>
                            b.largestConnected - a.largestConnected || b.totalCells - a.totalCells
                          )
                          .map((tm, idx) => {
                            const rank = idx + 1;
                            const highlights = computeTeamHighlights(s, tm.id);
                            return (
                              <div key={tm.id} style={{
                                padding: '8px 10px', borderRadius: 10,
                                background: `linear-gradient(135deg, ${tm.color}1a, ${tm.color}06)`,
                                border: `1.5px solid ${tm.color}55`,
                                display: 'flex', flexDirection: 'column', gap: 6,
                              }}>
                                <div style={{
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  fontSize: 12, fontWeight: 900,
                                }}>
                                  <span style={{
                                    minWidth: 22, textAlign: 'center',
                                    color: rank === 1 ? QQ_COLORS.brandPink : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : QQ_COLORS.slate400,
                                  }}>{rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}</span>
                                  <span style={{
                                    flex: 1, color: tm.color, lineHeight: 1.1,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}>{tm.name}</span>
                                  <span style={{
                                    fontSize: 11, color: QQ_COLORS.brandPinkSoft, fontWeight: 900,
                                    fontVariantNumeric: 'tabular-nums',
                                  }}>{tm.largestConnected} F</span>
                                </div>
                                {highlights.length === 0 ? (
                                  <div style={{ fontSize: 10, color: QQ_COLORS.slate500, fontStyle: 'italic' }}>
                                    keine besonderen Highlights
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {highlights.map((h, i) => (
                                      <div key={i} style={{
                                        display: 'flex', alignItems: 'baseline', gap: 6,
                                        fontSize: 11, lineHeight: 1.3,
                                      }}>
                                        <span style={{ flexShrink: 0, fontSize: 13 }}>{h.icon}</span>
                                        <span style={{ flexShrink: 0, fontWeight: 900, color: QQ_COLORS.slate300 }}>
                                          {h.label}:
                                        </span>
                                        <span style={{ color: QQ_COLORS.slate400 }}>{h.value}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </>
                  );
                })()}

                {/* ── THANKS ── */}
                {s.phase === 'THANKS' && (
                  <div style={{ fontSize: 15, color: QQ_COLORS.slate400, fontWeight: 900 }}>🙏 Danke-Folie läuft</div>
                )}

                {/* ── PAUSED ── */}
                {s.phase === 'PAUSED' && (
                  <>
                    <PrimaryBtn color={QQ_COLORS.green500} onClick={() => emit('qq:resume', { roomCode })} hotkey="Space">
                      ▶ Weiter
                    </PrimaryBtn>
                    {/* 2026-05-17 (P0): Auto-Flow triggert CozyGame nach Frage 5
                        automatisch. Manueller Start nur als Override (z.B. wenn
                        Mod mitten in Pause noch ein CG einschieben will). */}
                    {(s as any).cozyGamesEnabled && Array.isArray((s as any).cozyGamesPool) && (s as any).cozyGamesPool.length > 0 && (
                      <Btn color={QQ_COLORS.brandPink} outline onClick={() => emit('qq:cozyGameStart', { roomCode, slotKind: 'roundPause' })}>
                        🪅 CG einschieben
                      </Btn>
                    )}
                  </>
                )}

                {/* 2026-05-24 (Wolf-Wunsch): CozyGames An/Aus-Toggle aus der
                    Mod-Toolbar raus — Wolf braucht das nur im Setup, dort ist
                    es schon. Reduziert Toolbar-Noise. */}

                {/* ── COZY_GAME (Mini-Game-Phase, 2026-05-17) ── */}
                {s.phase === 'COZY_GAME' && (s as any).cozyGame && (() => {
                  const cg = (s as any).cozyGame;
                  if (cg.phase === 'INTRO') {
                    return (
                      <PrimaryBtn color={QQ_COLORS.brandPink} onClick={() => emit('qq:cozyGameAdvance', { roomCode })} hotkey="Space">
                        🎯 Rad drehen
                      </PrimaryBtn>
                    );
                  }
                  if (cg.phase === 'WHEEL_SPIN') {
                    return (
                      <div style={{ padding: '8px 16px', color: QQ_COLORS.slate400, fontSize: 13, fontWeight: 700 }}>
                        🌀 Rad dreht …
                      </div>
                    );
                  }
                  if (cg.phase === 'WHEEL_RESULT') {
                    return (
                      <PrimaryBtn color={QQ_COLORS.green500} onClick={() => emit('qq:cozyGameAdvance', { roomCode })} hotkey="Space">
                        ▶ Spiel starten (60s)
                      </PrimaryBtn>
                    );
                  }
                  if (cg.phase === 'GAME_ACTIVE') {
                    // 2026-05-17 (Wolf Sequence-Mode): unterschiedliche Mod-
                    // Controls je nach playMode + Timer-Controls (Pause/Resume/
                    // Reset/±10s) für beide Modes.
                    const isSequence = cg.playMode === 'sequence';
                    const isPaused = cg.gameEndsAt == null && (cg.timerPausedRemainingMs ?? 0) > 0;
                    const order: string[] = cg.sequenceOrder ?? [];
                    const curIdx: number = cg.sequenceCurrentIdx ?? 0;
                    const isLastTeam = isSequence && curIdx >= order.length - 1;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          {isSequence ? (
                            <PrimaryBtn
                              color={QQ_COLORS.green500}
                              onClick={() => emit('qq:cozyGameNextSequenceTeam', { roomCode })}
                              hotkey="Space"
                            >
                              {isLastTeam ? '▶ Sieger wählen' : `▶ Nächstes Team (${curIdx + 1}/${order.length})`}
                            </PrimaryBtn>
                          ) : (
                            <PrimaryBtn color={QQ_COLORS.red500} onClick={() => emit('qq:cozyGameAdvance', { roomCode })} hotkey="Space">
                              ⏹ Stop & Sieger wählen
                            </PrimaryBtn>
                          )}
                        </div>
                        {/* Timer-Controls: Pause/Resume/Reset/±10s */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', fontSize: 12 }}>
                          <span style={{ color: QQ_COLORS.slate400, fontWeight: 700, marginRight: 4 }}>Timer:</span>
                          {isPaused ? (
                            <Btn color={QQ_COLORS.green500} outline onClick={() => emit('qq:cozyGameTimerResume', { roomCode })}>
                              ▶ Resume
                            </Btn>
                          ) : (
                            <Btn color={QQ_COLORS.amber500} outline onClick={() => emit('qq:cozyGameTimerPause', { roomCode })}>
                              ⏸ Pause
                            </Btn>
                          )}
                          <Btn color={QQ_COLORS.slate400} outline onClick={() => emit('qq:cozyGameTimerReset', { roomCode })}>
                            ↻ Reset
                          </Btn>
                          <Btn color={QQ_COLORS.slate400} outline onClick={() => emit('qq:cozyGameTimerAdjust', { roomCode, deltaSec: -10 })}>
                            −10s
                          </Btn>
                          <Btn color={QQ_COLORS.slate400} outline onClick={() => emit('qq:cozyGameTimerAdjust', { roomCode, deltaSec: +10 })}>
                            +10s
                          </Btn>
                          {isSequence && !isLastTeam && (
                            <Btn color={QQ_COLORS.slate400} outline onClick={() => {
                              if (!window.confirm('Alle übrigen Teams überspringen und direkt zum Sieger-Pick?')) return;
                              emit('qq:cozyGameAdvance', { roomCode });
                            }}>
                              ⏭ Sieger-Pick (Rest überspringen)
                            </Btn>
                          )}
                        </div>
                      </div>
                    );
                  }
                  if (cg.phase === 'WINNER_SELECT') {
                    // 2026-05-17 v9 (Wolf 'erst Avatar zeigen, dann Mod-Weiter
                    // zum Grid'): Nach Winner-Pick erscheint statt des Pickers
                    // ein „Weiter zum Grid"-Button — gleicher Flow wie sonst
                    // im Quiz (Mod kontrolliert den Übergang manuell).
                    const winnerIds: string[] = cg.winnerTeamIds ?? [];
                    if (winnerIds.length > 0) {
                      return (
                        <PrimaryBtn color={QQ_COLORS.green500} onClick={() => emit('qq:cozyGameAdvance', { roomCode })} hotkey="Space">
                          ▶ Weiter zum Grid
                        </PrimaryBtn>
                      );
                    }
                    return (
                      <CozyGameWinnerPicker
                        teamList={teamList}
                        onSelect={ids => emit('qq:cozyGameSelectWinner', { roomCode, teamIds: ids })}
                      />
                    );
                  }
                  return null;
                })()}

                {/* ── COZY_GAME Cancel-Option ── */}
                {s.phase === 'COZY_GAME' && (
                  <Btn color={QQ_COLORS.slate400} outline onClick={() => {
                    if (!window.confirm('CozyGame abbrechen? Spiel zählt nicht als gespielt.')) return;
                    emit('qq:cozyGameCancel', { roomCode });
                  }}>
                    ✕ Abbrechen
                  </Btn>
                )}

                {/* 2026-05-24 (Wolf-Audit Cleanup): Separator-Line entfernt —
                    flex-gap reicht als visuelle Trennung. */}

                {/* ── Secondary: Pause ── */}
                {!['LOBBY', 'PAUSED', 'GAME_OVER', 'THANKS', 'RULES', 'TEAMS_REVEAL'].includes(s.phase) && (
                  <Btn color={QQ_COLORS.brandPink} outline onClick={() => emit('qq:pause', { roomCode })}>
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
                  avatarSetId={s.avatarSetId}
                />

              </div>
            </div>

            {/* Buzz queue */}
            {s.buzzQueue.length > 0 && (
              <div style={{ ...card, borderColor: 'rgba(236,72,153,0.3)' }}>
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
                        <span style={{ fontSize: 11, color: QQ_COLORS.slate500, fontWeight: 900 }}>#{i + 1}</span>
                        <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={30} />
                        <span style={{ fontWeight: 900, color: team.color, fontSize: 14 }}>{team.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Current question — 2026-05-17 (Wolf 'thanks zeigt noch schau mal
                frage aus runde 4'): Phase-Guard hinzugefügt damit die Frage-
                Card nur während aktiver Frage-Phasen rendert. Vorher: nur
                s.currentQuestion-Existenz-Check → letzte Frage hängte in
                END-Phasen (GAME_OVER, THANKS, FINAL_BETTING, FINAL_REVEAL,
                CONNECTIONS_4X4) noch im Mod-Panel. */}
            {s.currentQuestion && (s.phase === 'QUESTION_ACTIVE' || s.phase === 'QUESTION_REVEAL' || s.phase === 'PLACEMENT') && (
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
                  <span style={{ fontSize: 11, color: QQ_COLORS.slate500 }}>
                    Phase {s.currentQuestion.phaseIndex} · #{s.currentQuestion.questionIndexInPhase + 1}
                  </span>
                </div>
                <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 6, color: QQ_COLORS.slate200 }}>
                  {s.currentQuestion.text}
                </div>
                {s.currentQuestion.textEn && (
                  <div style={{ color: QQ_COLORS.slate500, fontSize: 13, marginBottom: 8 }}>{s.currentQuestion.textEn}</div>
                )}
                {s.revealedAnswer && (
                  <div style={{
                    marginTop: 8, padding: '8px 12px', borderRadius: 8,
                    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                    color: QQ_COLORS.green400, fontWeight: 900,
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
                unit={(s.language === 'en' && s.currentQuestion.unitEn) ? s.currentQuestion.unitEn : s.currentQuestion.unit}
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
                <div style={{ color: QQ_COLORS.slate600, fontSize: 13 }}>Noch keine Teams beigetreten</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {teamList.map((t, i) => {
                  const stats = s.teamPhaseStats[t.id];
                  const answer = s.answers.find(a => a.teamId === t.id);
                  const isActive = s.phase === 'QUESTION_ACTIVE' || s.phase === 'QUESTION_REVEAL';
                  const isSchaetz = s.currentQuestion?.category === 'SCHAETZCHEN';
                  const isOffline = !t.connected;
                  // 2026-05-17 (Wolf-Audit): pendingFor/correctTeamId-Highlight
                  // nur in Phasen wo das relevant ist (PLACEMENT + COMEBACK
                  // für pendingFor; QUESTION_ACTIVE/REVEAL für correctTeamId).
                  // Sonst hängt der Highlight von der letzten Runde noch in
                  // GAME_OVER/THANKS etc.
                  const showPendingHighlight = s.pendingFor === t.id
                    && (s.phase === 'PLACEMENT' || s.phase === 'COMEBACK_CHOICE' || s.phase === 'CONNECTIONS_4X4');
                  const showCorrectHighlight = s.correctTeamId === t.id
                    && (s.phase === 'QUESTION_ACTIVE' || s.phase === 'QUESTION_REVEAL' || s.phase === 'PLACEMENT');
                  return (
                    <div key={t.id} style={{
                      padding: '10px 12px', borderRadius: 8,
                      border: `2px solid ${
                        showPendingHighlight && isOffline ? QQ_COLORS.red500
                          : showPendingHighlight ? t.color
                          : isOffline ? 'rgba(239,68,68,0.5)'
                          : showCorrectHighlight ? `${t.color}88`
                          : 'rgba(255,255,255,0.07)'
                      }`,
                      background: isOffline ? 'rgba(239,68,68,0.08)'
                        : showCorrectHighlight ? `${t.color}18`
                        : 'rgba(255,255,255,0.03)',
                      opacity: isOffline ? 0.85 : 1,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: QQ_COLORS.slate600, fontWeight: 900, width: 16 }}>{i + 1}</span>
                        <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={30} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 900, color: t.color, textDecoration: isOffline ? 'line-through' : 'none' }}>{t.name}</span>
                            {isOffline ? (
                              <span style={{
                                fontSize: 10, fontWeight: 900, color: '#fff',
                                background: QQ_COLORS.red500, padding: '1px 7px', borderRadius: 999,
                                letterSpacing: 0.3,
                              }}>⚠ OFFLINE</span>
                            ) : (
                              <span style={{ fontSize: 11, color: QQ_COLORS.green500 }}>●</span>
                            )}
                            {s.correctTeamId === t.id && <span style={{ fontSize: 11, color: QQ_COLORS.green400 }}>✓ richtig</span>}
                            {answer && <span style={{ fontSize: 11, color: QQ_COLORS.brandPink }}>✎ abgegeben</span>}
                          </div>
                          <div style={{ fontSize: 11, color: QQ_COLORS.slate500, marginTop: 1 }}>
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
                            color: QQ_COLORS.slate400, fontSize: 11, fontFamily: 'inherit',
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
                            color: QQ_COLORS.slate500, fontSize: 11, fontFamily: 'inherit',
                          }}>✕</button>
                      </div>
                      {/* Live answer — hide for Schätzchen (shown in ranking above) */}
                      {isActive && answer && !isSchaetz && (
                        <div style={{
                          marginTop: 8, padding: '6px 10px', borderRadius: 8,
                          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                          fontSize: 14, fontWeight: 700, color: QQ_COLORS.slate200,
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
                                border: '1px solid rgba(236,72,153,0.3)', background: 'transparent',
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
                  <Btn color={QQ_COLORS.slate600} onClick={() => emit('qq:markWrong', { roomCode })}>
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

            {/* ── Final-Wager-Mechanik (Wolf 2026-05-09) ────────────────────
                Vor letzter Spiel-Phase: Bets setzen lassen
                In FINAL_BETTING: Submit-Status + Final-Phase starten
                In FINAL_REVEAL: nur Hinweis
                In QUESTION_REVEAL/PLACEMENT der letzten Phase: Resolve-Button. */}
            <FinalWagerControls state={s} emit={emit} roomCode={roomCode} />

            {/* 2026-05-24 (Wolf-Audit Setup-Cleanup):
                - Live-Settings-Card wird nur in Non-LOBBY-Phasen gemountet
                  (outer Bedingung Z. 1593 `s.phase !== 'LOBBY'`).
                - Volume-Slider raus (Setup/Advanced hat ihn, M-Taste for Mute).
                - Custom-Sounds-Panel raus (Setup hat Batch-Actions).
                Nur Timer + Sprache + Music/SFX-Mute bleiben fuer Live-Quiz. */}
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
                <div style={{ fontSize: 12, color: QQ_COLORS.slate500, marginBottom: 6 }}>⏱ Timer</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {[15, 30, 45, 60, 90].map(t => (
                    <button key={t} onClick={() => { setTimerInput(t); emit('qq:setTimer', { roomCode, durationSec: t }); }}
                      style={{
                        padding: '6px 12px', borderRadius: 6, border: `1px solid ${s.timerDurationSec === t ? QQ_COLORS.blue500 : 'rgba(255,255,255,0.1)'}`,
                        background: s.timerDurationSec === t ? 'rgba(59,130,246,0.2)' : 'transparent',
                        color: s.timerDurationSec === t ? QQ_COLORS.blue500 : QQ_COLORS.slate500,
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
                  <Btn small color={QQ_COLORS.blue500} onClick={applyTimer}>Setzen</Btn>
                </div>
              </div>

              {/* Language */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: QQ_COLORS.slate500, marginBottom: 6 }}>🌐 Sprache</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    onClick={() => emit('qq:setLanguage', { roomCode, language: 'de' })}
                    style={{
                      border: s.language === 'de' ? '2px solid #3B82F6' : '1px solid #475569',
                      background: s.language === 'de' ? '#3B82F622' : 'transparent',
                      color: QQ_COLORS.slate200, fontSize: 22, borderRadius: 8, padding: '2px 10px', cursor: 'pointer', fontWeight: 900,
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
                      color: QQ_COLORS.slate200, fontSize: 22, borderRadius: 8, padding: '2px 10px', cursor: 'pointer', fontWeight: 900,
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
                      color: QQ_COLORS.slate200, fontSize: 22, borderRadius: 8, padding: '2px 10px', cursor: 'pointer', fontWeight: 900,
                      opacity: s.language === 'both' ? 1 : 0.7,
                      transition: 'all 0.15s',
                    }}
                    aria-label="Beide Sprachen (Flip)"
                  >🌐</button>
                </div>
              </div>

              {/* Sound — nur Mute-Toggles (Volume + Custom-Sounds-Panel ist im Setup/Advanced) */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, color: QQ_COLORS.slate500, marginBottom: 6 }}>🔊 Sound</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => emit('qq:setMusicMuted', { roomCode, muted: !s.musicMuted })}
                    style={{
                      padding: '5px 11px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                      fontWeight: 900, fontSize: 12,
                      border: `1px solid ${s.musicMuted ? QQ_COLORS.red500 : QQ_COLORS.green500}`,
                      background: s.musicMuted ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                      color: s.musicMuted ? QQ_COLORS.red500 : QQ_COLORS.green500,
                    }}>
                    {s.musicMuted ? '🔇 Musik' : '🎵 Musik'}
                  </button>
                  <button
                    onClick={() => emit('qq:setSfxMuted', { roomCode, muted: !s.sfxMuted })}
                    style={{
                      padding: '5px 11px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                      fontWeight: 900, fontSize: 12,
                      border: `1px solid ${s.sfxMuted ? QQ_COLORS.red500 : QQ_COLORS.green500}`,
                      background: s.sfxMuted ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                      color: s.sfxMuted ? QQ_COLORS.red500 : QQ_COLORS.green500,
                    }}>
                    {s.sfxMuted ? '🔇 SFX' : '🔉 SFX'}
                  </button>
                </div>
                <div style={{ fontSize: 10, color: QQ_COLORS.slate600, marginTop: 6 }}>M-Taste = alles muten</div>
              </div>
              </>}
            </div>

            {/* Grid — collapsible */}
            {s.grid && <CollapsibleGrid state={s} />}

            {/* Rangliste — 2026-05-08: collapsible, default-collapsed während
                QUESTION_ACTIVE/REVEAL (Mod sieht nur Header), default-offen
                in PAUSED/PLACEMENT/COMEBACK/GAME_OVER (wo Rang relevant ist). */}
            <CollapsibleRanking teams={teamList} phase={s.phase} />
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
    text: '16 Begriffe, 4 versteckte Gruppen. Teams jagen parallel und tippen 4 Items als Gruppen-Tipp. Pro gefundene Gruppe = 1 Stapel-Bonus (+1 Pkt auf ein eigenes Feld, gleiches Feld mehrfach erlaubt). Ranking: meiste Gruppen, schnellste zuerst bei Gleichstand. Heize an, achte auf den Timer.',
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

// ── ActiveTeamStrip — Sticky unter Hero, zeigt wer dran ist / wer geantwortet hat ──
// 2026-05-11 (Senior-Audit P0): kein Scroll mehr nötig um zu sehen wer Wolfs
// nächste Aktion blockiert. Hotkeys:
//   F18 = Skip current pendingFor
//   1-8 = mark Team N als richtig (während QUESTION_REVEAL)
function ActiveTeamStrip({ state }: { state: QQStateUpdate }) {
  const phase = state.phase;
  const isPlacement = phase === 'PLACEMENT' || phase === 'COMEBACK_CHOICE';
  const isQuestion  = phase === 'QUESTION_ACTIVE';
  const isReveal    = phase === 'QUESTION_REVEAL';

  // Nur in relevanten Phases rendern — sonst kein Layout-Footprint
  if (!isPlacement && !isQuestion && !isReveal) return null;

  const teamList = state.teams;

  // PLACEMENT/COMEBACK: einzelnes aktives Team prominent
  if (isPlacement && state.pendingFor) {
    const pendingTeam = teamList.find(t => t.id === state.pendingFor);
    if (!pendingTeam) return null;
    const offline = !pendingTeam.connected;
    const action = state.pendingAction ?? '';
    return (
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '10px 16px', borderRadius: 12,
        background: `linear-gradient(90deg, ${pendingTeam.color}28, rgba(15,23,42,0.92))`,
        border: `2px solid ${pendingTeam.color}aa`,
        boxShadow: `0 0 24px ${pendingTeam.color}55, 0 4px 16px rgba(0,0,0,0.4)`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}>
        <div style={{
          fontSize: 10, fontWeight: 900, color: QQ_COLORS.slate400,
          textTransform: 'uppercase', letterSpacing: '0.12em',
        }}>Dran:</div>
        <QQTeamAvatar avatarId={pendingTeam.avatarId} teamEmoji={pendingTeam.emoji} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 18, fontWeight: 900, color: pendingTeam.color,
            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
          }}>{pendingTeam.name}</div>
          <div style={{ fontSize: 12, color: QQ_COLORS.slate400, fontWeight: 700 }}>
            {action}{offline ? ' · ⚠ offline' : ''}
          </div>
        </div>
        <div style={{
          padding: '4px 10px', borderRadius: 8,
          background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.4)',
          fontSize: 11, fontWeight: 900, color: QQ_COLORS.red300,
          letterSpacing: '0.06em',
        }}>F18 = Skip</div>
      </div>
    );
  }

  // QUESTION_ACTIVE / QUESTION_REVEAL: 1 Dot pro Team — grün = geantwortet, grau = offen
  if (isQuestion || isReveal) {
    const answeredIds = new Set(state.answers.map(a => a.teamId));
    return (
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 16px', borderRadius: 12,
        background: 'rgba(15,23,42,0.88)',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        flexWrap: 'wrap',
      }}>
        <div style={{
          fontSize: 10, fontWeight: 900, color: QQ_COLORS.slate400,
          textTransform: 'uppercase', letterSpacing: '0.12em', marginRight: 4,
        }}>{isReveal ? 'Antworten' : 'Status'}:</div>
        {teamList.map((t, i) => {
          const answered = answeredIds.has(t.id);
          const offline = !t.connected;
          const isCorrect = isReveal && state.correctTeamId === t.id;
          return (
            <div key={t.id} title={`${t.name}${offline ? ' (offline)' : ''}${answered ? ' — geantwortet' : ' — wartet'}`} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 8px', borderRadius: 999,
              background: isCorrect
                ? `${t.color}55`
                : answered
                  ? 'rgba(34,197,94,0.18)'
                  : 'rgba(255,255,255,0.04)',
              border: isCorrect
                ? `2px solid ${t.color}`
                : answered
                  ? '1px solid rgba(34,197,94,0.5)'
                  : '1px solid rgba(255,255,255,0.10)',
              opacity: offline ? 0.45 : 1,
            }}>
              <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={22} />
              <span style={{
                fontSize: 11, fontWeight: 800,
                color: isCorrect ? t.color : answered ? QQ_COLORS.green300 : QQ_COLORS.slate400,
              }}>{i + 1}</span>
            </div>
          );
        })}
        <div style={{ marginLeft: 'auto', fontSize: 11, color: QQ_COLORS.slate500, fontWeight: 700 }}>
          {answeredIds.size}/{teamList.length}
        </div>
      </div>
    );
  }

  return null;
}

function HostNotes({ state }: { state: QQStateUpdate }) {
  const phase = state.phase;
  const baseNote = HOST_NOTES_DE[phase] ?? { title: phase, text: 'Kein Hinweis für diese Phase.' };
  const customNote = state.currentQuestion?.hostNote?.trim();
  const funFact = state.currentQuestion?.funFact?.trim();
  const questionPhase = phase === 'QUESTION_ACTIVE' || phase === 'QUESTION_REVEAL' || phase === 'PLACEMENT';
  const showCustom = customNote && questionPhase;
  const showFunFact = funFact && questionPhase;

  // 2026-05-08 (Wolf-Audit-Followup 'mod überladen'): HostNotes default
  // collapsed während QUESTION_ACTIVE/REVEAL/PLACEMENT — Mod sieht nur den
  // 1-Zeilen-Header und kann bei Bedarf aufklappen. In anderen Phasen
  // (Lobby/Rules/Intro/etc) bleibt voll offen weil dort die Tipps relevant
  // zum Lesen sind. Bei Phase-Wechsel auto-reset auf Default-State.
  const [collapsed, setCollapsed] = useState(questionPhase);
  const lastPhaseRef = useRef(phase);
  useEffect(() => {
    if (lastPhaseRef.current !== phase) {
      lastPhaseRef.current = phase;
      setCollapsed(questionPhase);
    }
  }, [phase, questionPhase]);

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(236,72,153,0.08), rgba(236,72,153,0.03))',
      border: '1px solid rgba(236,72,153,0.35)',
      borderLeft: '4px solid #EC4899',
      borderRadius: 8,
      padding: collapsed ? '6px 14px' : '10px 14px',
      marginBottom: 12,
      fontSize: 13,
      lineHeight: 1.5,
      color: '#e5e7eb',
      cursor: 'pointer',
    }}
    onClick={() => setCollapsed(c => !c)}
    title={collapsed ? 'Tipp ausklappen' : 'Tipp einklappen'}
    >
      <div style={{
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: QQ_COLORS.brandPink,
        marginBottom: collapsed ? 0 : 4,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span>🎙️ Moderator-Tipp</span>
        <span style={{ opacity: 0.6, fontWeight: 700 }}>· {baseNote.title}</span>
        <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: 12 }}>{collapsed ? '▸' : '▾'}</span>
      </div>
      {!collapsed && <div style={{ color: '#d1d5db' }}>{baseNote.text}</div>}
      {!collapsed && showCustom && (
        <div style={{
          marginTop: 8,
          paddingTop: 8,
          borderTop: '1px dashed rgba(236,72,153,0.3)',
          color: '#fef3c7',
          fontStyle: 'italic',
        }}>
          <span style={{ fontWeight: 900, fontStyle: 'normal', color: QQ_COLORS.brandPink }}>Frage-Notiz: </span>
          {customNote}
        </div>
      )}
      {!collapsed && showFunFact && (
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
  nonWinners: { id: string; name: string; color: string; avatarId: string; emoji?: string }[];
  coWinners: { id: string; name: string; color: string; avatarId: string; emoji?: string }[];
  roomCode: string;
  emit: (event: string, payload: any) => Promise<any>;
}) {
  const [open, setOpen] = useState(forceOpen);
  // Sync forceOpen — wenn Mit-Gewinner waehrend des Spiels hinzukommen, Panel automatisch oeffnen
  useEffect(() => { if (forceOpen) setOpen(true); }, [forceOpen]);
  if (nonWinners.length === 0 && coWinners.length === 0) return null;
  // 2026-05-19 (Cockpit-Audit MC1): compact-Mode bei >5 Teams. Buttons
  // schmaler, Section-Headings weg, Avatar nur ohne Plus-Symbol-Text.
  // Verhindert 200px+ Scroll-Section auf 1080p bei 8 Teams.
  const compact = (nonWinners.length + coWinners.length) > 5;
  const btnMinH = compact ? 28 : 36;
  const btnPad = compact ? '4px 8px' : '8px 14px';
  const btnFs = compact ? 12 : 14;
  const avSize = compact ? 16 : 20;

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
          color: QQ_COLORS.slate300, fontWeight: 900, fontSize: 13,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <span>{toggleLabel}</span>
        <span style={{ fontSize: 11, color: QQ_COLORS.slate500, fontWeight: 700 }}>{summary}</span>
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
                fontSize: 11, fontWeight: 900, color: QQ_COLORS.blue400,
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
                      minHeight: btnMinH, padding: btnPad, borderRadius: 8,
                      border: `1.5px solid ${t.color}88`,
                      background: `${t.color}18`, color: t.color,
                      fontFamily: 'inherit', fontWeight: 900, fontSize: btnFs,
                      cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}
                    title={`Gewinner zu ${t.name} ändern (Undo + Mark Correct)`}
                  >
                    <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={avSize} />
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
                fontSize: 11, fontWeight: 900, color: QQ_COLORS.green400,
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
                      minHeight: btnMinH, padding: btnPad, borderRadius: 8,
                      border: `1.5px dashed ${t.color}99`,
                      background: 'rgba(255,255,255,0.02)', color: t.color,
                      fontFamily: 'inherit', fontWeight: 900, fontSize: btnFs,
                      cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}
                    title={`${t.name} als Mit-Gewinner hinzufuegen — setzt nach primaerem Sieger`}
                  >
                    <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={avSize} />
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
                fontSize: 11, fontWeight: 900, color: QQ_COLORS.green500,
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
                      minHeight: btnMinH, padding: btnPad, borderRadius: 8,
                      border: `2px solid ${t.color}`,
                      background: `${t.color}25`, color: t.color,
                      fontFamily: 'inherit', fontWeight: 900, fontSize: btnFs,
                      cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}
                    title={`${t.name} entfernen`}
                  >
                    <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={avSize} />
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
// 2026-05-09 (Wolf-Final-Wager-Mechanik): Live-Status während FINAL_BETTING/
// FINAL_REVEAL. Toggle ist in Quick-Settings; Phase-Übergänge passieren
// automatisch per Space (qqBeginPhase einleitet Bet-Phase, qqNextQuestion → Resolve).
function FinalWagerControls({ state: s }: { state: QQStateUpdate; emit: any; roomCode: string }) {
  const enabled = !!s.finalWagerEnabled;
  const submittedCount = Object.values(s.finalBettingSubmitted ?? {}).filter(Boolean).length;
  const totalTeams = s.teams.length;

  // Nur Live-Status sichtbar wenn finalWagerEnabled UND in betroffener Phase.
  const showLiveStatus = enabled && (s.phase === 'FINAL_BETTING' || s.phase === 'FINAL_REVEAL');
  if (!showLiveStatus) return null;

  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: 12,
      background: 'linear-gradient(135deg, rgba(236,72,153,0.10), rgba(162,18,71,0.08))',
      border: '1px solid rgba(236,72,153,0.32)',
      marginBottom: 12,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 900, color: QQ_COLORS.brandPinkMid,
        textTransform: 'uppercase', letterSpacing: '0.12em',
        marginBottom: 10,
      }}>🪙 Final-Wetten {s.phase === 'FINAL_BETTING' ? '· Bet-Phase' : '· Auflösung'}</div>

      {s.phase === 'FINAL_BETTING' && (
        <>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 12px', borderRadius: 8,
            background: 'rgba(255,255,255,0.04)',
            fontSize: 13,
            marginBottom: 10,
          }}>
            <span style={{ color: QQ_COLORS.slate400, fontWeight: 700 }}>Wetten gesetzt · Space → weiter</span>
            <span style={{ color: QQ_COLORS.brandPinkMid, fontWeight: 900, fontSize: 16 }}>
              {submittedCount} / {totalTeams}
            </span>
          </div>
          {/* Team-Liste mit Submit-Status + Tipp-Target (Tipp-Variante 2026-05-09).
              Zeigt: Team → tippt auf [Target] · grün wenn Mutual-Pair erkannt. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {s.teams.map(t => {
              const myBet = s.finalBets?.[t.id];
              const targetTeam = myBet ? s.teams.find(tt => tt.id === myBet.targetTeamId) : null;
              const submitted = !!s.finalBettingSubmitted?.[t.id];
              // Mutual erkennen: target tippt zurück auf t
              const reverseBet = myBet ? s.finalBets?.[myBet.targetTeamId] : null;
              const isMutual = !!(reverseBet && reverseBet.targetTeamId === t.id && myBet?.targetTeamId !== t.id);
              return (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 10px', borderRadius: 8,
                  background: submitted ? 'rgba(34,197,94,0.10)' : 'rgba(255,255,255,0.03)',
                  border: submitted ? '1px solid rgba(34,197,94,0.30)' : '1px solid rgba(255,255,255,0.06)',
                  fontSize: 12,
                }}>
                  <span style={{ fontSize: 16 }}>{(t as any).emoji ?? '🎯'}</span>
                  <span style={{ fontWeight: 800, color: t.color, minWidth: 90 }}>{t.name}</span>
                  {submitted ? (
                    <>
                      <span style={{ color: QQ_COLORS.green300, fontWeight: 900 }}>✓</span>
                      <span style={{ color: QQ_COLORS.slate400, fontSize: 11 }}>→</span>
                      {targetTeam ? (
                        <>
                          <span style={{ fontSize: 14 }}>{(targetTeam as any).emoji ?? '🎯'}</span>
                          <span style={{ color: targetTeam.color, fontWeight: 800 }}>{targetTeam.name}</span>
                          {isMutual && <span title="Mutual-Pick (Sympathie-Bonus)">💞</span>}
                        </>
                      ) : (
                        <span style={{ color: QQ_COLORS.slate500, fontStyle: 'italic' }}>kein Tipp</span>
                      )}
                    </>
                  ) : (
                    <span style={{ color: QQ_COLORS.slate500, fontWeight: 700, marginLeft: 'auto' }}>⏳ wartet</span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {s.phase === 'FINAL_REVEAL' && (() => {
        // 2026-05-24 v3 (Wolf 'awards-overview raus'):
        // title → award-0/1/2 (je Mod-Space) → bet-slots → race-final.
        const betted = s.teams.filter(t => s.finalBetResolution?.[t.id]?.targetTeamId);
        const zeroExists = betted.some(t => (s.finalBetResolution?.[t.id]?.totalBonus ?? 0) === 0);
        const positiveCount = betted.filter(t => (s.finalBetResolution?.[t.id]?.totalBonus ?? 0) > 0).length;
        const betSlotsCount = positiveCount + (zeroExists ? 1 : 0);
        const step = s.finalRevealStep ?? 0;
        const labelFor = (st: number): string => {
          if (st <= 0) return '0 · Title-Hold „Die Auflösung"';
          if (st === 1) return '1 · 🐢 Underdog-Reveal (Drumroll + Tabelle)';
          if (st === 2) return '2 · 🦝 Meisterklauer-Reveal (Drumroll + Tabelle)';
          if (st === 3) return '3 · ⚡ Speedy-Reveal (Drumroll + Tabelle)';
          if (st <= 3 + betSlotsCount) {
            const slotIdx = st - 4;
            const isZeroFirst = zeroExists && slotIdx === 0;
            if (isZeroFirst) return `${st} · 🎰 Bet-Zero-Group (0-Bonus-Tipps)`;
            return `${st} · 🎰 Bet-Reveal Slot ${slotIdx + 1}/${betSlotsCount} (Tabelle climbing)`;
          }
          return `${st} · 🏁 Eurovision-Finale (Sieger-Hero + Podium)`;
        };
        const max = betSlotsCount + 4;
        const isLast = step >= max;
        const next = isLast ? '→ THANKS' : labelFor(step + 1);
        return (
          <div style={{
            padding: '10px 12px', borderRadius: 8,
            background: 'rgba(251,191,36,0.10)',
            color: QQ_COLORS.amber400, fontSize: 12, fontWeight: 700,
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div>🏆 Final-Reveal · Step {step}/{max}</div>
            <div style={{ color: '#FCD34D', opacity: 0.92 }}>Jetzt: {labelFor(step)}</div>
            <div style={{ color: '#FCD34D', opacity: 0.65, fontSize: 11 }}>Space → {next}</div>
          </div>
        );
      })()}
    </div>
  );
}

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

  // 2026-05-24 (Refactor #4): kanonische Kategorie-Farben aus
  // shared/qqCategoryTheme.ts. Vorher inline-Map mit komplett anderen Farben
  // (SCHAETZCHEN war hier blau, ueberall sonst gold) → Mod sah andere Farbe
  // als Beamer fuer dieselbe Frage.
  const accent = qqCategoryAccent(q.category);

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
        <span style={{ fontSize: 10, color: QQ_COLORS.slate500, fontWeight: 700 }}>
          Q {s.questionIndex + 1}
        </span>
      </div>

      {/* Frage-Text */}
      {/* 2026-05-02 (App-Designer-Audit M3): Schrift hochgezogen — das ist die
          Lebensader-Info des Panels (Pub-Live: Mod kuckt schnell hin zwischen
          Patter). 14px war zu klein fuer Tablet-Distanz. */}
      <div style={{
        fontSize: 17, fontWeight: 900, color: QQ_COLORS.slate100, lineHeight: 1.35,
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
          fontSize: 10, fontWeight: 900, color: QQ_COLORS.green500,
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
              fontSize: 11, lineHeight: 1.4, color: QQ_COLORS.slate300,
              display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8,
            }}>
              <span style={{ color: QQ_COLORS.slate500, fontWeight: 700, textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.04em', alignSelf: 'start', paddingTop: 2 }}>
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
      background: urgent ? 'rgba(239,68,68,0.2)' : 'rgba(236,72,153,0.15)',
      border: `1px solid ${urgent ? QQ_COLORS.red500 : QQ_COLORS.brandPink}`,
      color: urgent ? QQ_COLORS.red500 : QQ_COLORS.brandPink,
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
    <div style={{ ...card, borderColor: 'rgba(236,72,153,0.35)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={sectionLabel}>🍯 Schätzchen — Zielwert: <span style={{ color: QQ_COLORS.brandPink, fontWeight: 900 }}>{fmtNum(targetValue)}</span></div>
        {phase === 'QUESTION_REVEAL' && !correctTeamId && autoWinnerId && (
          <span style={{ fontSize: 11, color: QQ_COLORS.slate500 }}>Auto-Auswertung aktiv</span>
        )}
      </div>

      {ranked.length === 0 && (
        <div style={{ color: QQ_COLORS.slate600, fontSize: 13 }}>Noch keine Antworten eingegangen…</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ranked.map((r, i) => {
          const isWinner = r.teamId === (correctTeamId ?? autoWinnerId);
          const barWidth = r.distance === Infinity ? 0 : Math.max(4, 100 - Math.min(99, (r.distance / targetValue) * 100));
          return (
            <div key={r.teamId} style={{
              padding: '8px 12px', borderRadius: 8,
              border: `2px solid ${isWinner ? (r.team?.color ?? QQ_COLORS.brandPink) : 'rgba(255,255,255,0.07)'}`,
              background: isWinner ? `${r.team?.color ?? QQ_COLORS.brandPink}14` : 'rgba(255,255,255,0.03)',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Distance bar */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, height: 2,
                width: `${barWidth}%`,
                background: isWinner ? (r.team?.color ?? QQ_COLORS.brandPink) : 'rgba(255,255,255,0.12)',
                transition: 'width 0.4s ease',
              }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: i === 0 ? QQ_COLORS.brandPink : QQ_COLORS.slate600, width: 18 }}>
                  {i === 0 ? <QQEmojiIcon emoji="🥇"/> : `#${i + 1}`}
                </span>
                <QQTeamAvatar avatarId={r.team?.avatarId ?? 'fox'} teamEmoji={r.team?.emoji} size={26} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 900, color: r.team?.color ?? QQ_COLORS.slate400 }}>{r.team?.name ?? r.teamId}</span>
                  <span style={{ marginLeft: 10, fontSize: 15, fontWeight: 900, color: QQ_COLORS.slate200 }}>
                    {r.parsed !== Infinity && !Number.isNaN(r.parsed) ? fmtNum(r.parsed) : r.text}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {r.distance !== Infinity ? (
                    <span style={{ fontSize: 12, color: isWinner ? QQ_COLORS.green400 : QQ_COLORS.slate500, fontWeight: 700 }}>
                      {r.distance === 0 ? '✓ Exakt' : `±${fmtNum(r.distance)}`}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: QQ_COLORS.slate600 }}>—</span>
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
          <Btn color={QQ_COLORS.slate600} onClick={() => emit('qq:markWrong', { roomCode })}>
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
      <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={26} />
      <span style={{ fontWeight: 900, color: offline ? QQ_COLORS.red300 : team.color }}>
        {team.name}
      </span>
      {offline && (
        <span style={{
          fontSize: 11, fontWeight: 900, color: '#fff',
          background: QQ_COLORS.red500, padding: '2px 8px', borderRadius: 999,
          letterSpacing: 0.4,
        }}>
          ⚠ OFFLINE — bitte Skip
        </span>
      )}
      <span style={{ fontSize: 12, color: QQ_COLORS.slate400 }}>{actionLabel(s.pendingAction, s.teamPhaseStats[team.id])}</span>
      {s.pendingAction === 'FREE' && (() => {
        // 2026-05-11 (Wolf-Bug 'wenn Grid voll, biete Mod kein Setzen-Btn an'):
        // PLACE fliegt im Backend mit NO_FREE_CELL — Frontend muss den
        // unmöglichen Button ausblenden, sonst klickt Wolf live ins Leere.
        const gridFull = Array.isArray(s.grid) && s.grid.every((row: any[]) => row.every((c: any) => c.ownerId !== null));
        return (
          <>
            {!gridFull && (
              <Btn small color={QQ_COLORS.blue500} onClick={() => emit('qq:chooseFreeAction', { roomCode, teamId: team.id, action: 'PLACE' })}>
                <QQEmojiIcon emoji="📍"/> Setzen
              </Btn>
            )}
            <Btn small color={QQ_COLORS.red500} onClick={() => emit('qq:chooseFreeAction', { roomCode, teamId: team.id, action: 'STEAL' })}>
              <QQEmojiIcon emoji="⚡"/> Klauen
            </Btn>
          </>
        );
      })()}
      {s.gamePhaseIndex === 2 && s.pendingAction === 'PLACE_2' && (
        <Btn small color={QQ_COLORS.red500} onClick={() => emit('qq:chooseFreeAction', { roomCode, teamId: team.id, action: 'STEAL' })}>
          → Klauen
        </Btn>
      )}
      {s.gamePhaseIndex >= 2 && s.pendingAction === 'STEAL_1' && (() => {
        const gridFull = Array.isArray(s.grid) && s.grid.every((row: any[]) => row.every((c: any) => c.ownerId !== null));
        // Wenn Grid voll ist, gibt es nichts zu "setzen" — nur Klauen oder Skip.
        if (gridFull) return null;
        return (
          <Btn small color={QQ_COLORS.blue500} onClick={() => emit('qq:chooseFreeAction', { roomCode, teamId: team.id, action: 'PLACE' })}>
            → Setzen
          </Btn>
        );
      })()}
      {s.pendingAction === 'COMEBACK' && (
        <Btn
          small
          color={QQ_COLORS.violet500}
          onClick={() => {
            if (confirm('Comeback-Klau zurücknehmen? Alle bereits geklauten Felder gehen zurück.')) {
              emit('qq:comebackUndo', { roomCode, teamId: team.id });
            }
          }}
        >
          ↩ Comeback zurück
        </Btn>
      )}
      {/* 2026-05-05 (Phase-7 Bucket-2 BC-2): Skip-Button visuell hervorgehoben
          wenn Team offline (rot statt grau) UND ohne confirm-Dialog. Offline =
          kein „Spieler-Beleidigungs"-Risiko + Wolf braucht schnellen Skip ohne
          Live-Stress-Klick. Online-Teams behalten confirm als Sicherheitsnetz. */}
      <span title={offline ? 'Team offline — direkter Skip' : 'Wenn Team nichts setzen/klauen kann oder will'}>
        <Btn
          small
          color={offline ? QQ_COLORS.red500 : QQ_COLORS.slate500}
          onClick={() => {
            // 2026-05-11 (Audit P0): kein Browser-confirm-Dialog mehr —
            // blockt Live-Flow im lauten Pub. Stattdessen sofort skippen
            // und Toast als visuelles Feedback. Wolf-Vorgabe: 3-Sek-
            // Entscheidung im Pub muss flüssig sein, Mod kann gegebenenfalls
            // im UI sehen was passiert ist via Active-Strip + Toast.
            emit('qq:skipCurrentTeam', { roomCode });
          }}
        >
          ⏭ {offline ? 'Skip (offline)' : 'Skip'}
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
  if (inHLGame) {
    // 2026-05-24 (Wolf-Bug 'Space-Button fehlt bei Comeback'): waehrend
    // HL-Mini-Game laeuft das Spiel automatisch durch — kein Mod-Space.
    // Trotzdem einen Status-Hint anzeigen damit Wolf sieht was passiert.
    const labels = {
      question: '⏳ H/L-Frage läuft (Bots/Teams antworten)',
      reveal:   '⏳ H/L-Auflösung läuft (auto)',
      steal:    '⏳ Steal läuft (auto)',
    } as const;
    return (
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        padding: '6px 12px', borderRadius: 8,
        background: 'rgba(167,139,250,0.10)',
        border: '1px solid rgba(167,139,250,0.30)',
        fontSize: 12, fontWeight: 700, color: QQ_COLORS.violet400,
      }}>
        <span>{labels[hlPhase as keyof typeof labels] ?? `⏳ ${hlPhase}`}</span>
      </div>
    );
  }
  const step = s.comebackIntroStep ?? 0;
  // 2 Intro-Steps insgesamt (0 + 1), danach startet das H/L-Mini-Game.
  const labels = [
    '▶ Team zeigen',
    '▶ Aktion zeigen',
    '⚡ H/L-Mini-Game starten',
  ];
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={26} />
      <span style={{ fontWeight: 900, color: team.color }}>{team.name}</span>
      <span style={{ fontSize: 13, fontWeight: 900, color: QQ_COLORS.violet500 }}>
        📖 Schritt {Math.min(step + 1, 2)}/2
      </span>
      <PrimaryBtn color={QQ_COLORS.violet500} onClick={() => emit('qq:comebackIntroStep', { roomCode })} hotkey="Space">
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
      <span style={{ fontSize: 13, fontWeight: 900, color: QQ_COLORS.brandPink, letterSpacing: 0.4, textTransform: 'uppercase' }}>
        🔗 4×4 · {phase}
      </span>
      {phase === 'intro' && (
        <PrimaryBtn color={QQ_COLORS.brandPink} onClick={() => emit('qq:connectionsBegin', { roomCode })} hotkey="Space">
          ▶ Spielzeit starten ({c.durationSec}s)
        </PrimaryBtn>
      )}
      {phase === 'active' && (
        <>
          <span style={{ fontSize: 12, color: QQ_COLORS.slate400 }}>
            {finished}/{totalTeams} fertig
          </span>
          <PrimaryBtn color={QQ_COLORS.brandPink} onClick={() => emit('qq:connectionsForceReveal', { roomCode })}>
            ⏹ Auflösen
          </PrimaryBtn>
        </>
      )}
      {phase === 'reveal' && (
        <PrimaryBtn color={QQ_COLORS.green500} onClick={() => emit('qq:connectionsToPlacement', { roomCode })} hotkey="Space">
          ▶ Setzen starten
        </PrimaryBtn>
      )}
      {phase === 'placement' && (
        <span style={{ fontSize: 12, color: QQ_COLORS.slate400 }}>
          Setzen läuft — Cursor #{(c.placementCursor ?? 0) + 1}/{(c.placementOrder ?? []).length}, ×{c.placementRemaining}
        </span>
      )}
      {phase === 'done' && (
        <PrimaryBtn color={QQ_COLORS.green500} onClick={() => emit('qq:nextQuestion', { roomCode })} hotkey="Space">
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
          background: 'transparent', color: QQ_COLORS.red300, fontSize: 12, fontWeight: 700, cursor: 'pointer',
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
            : finished ? 'rgba(236,72,153,0.10)'
            : 'rgba(255,255,255,0.02)';
          const statusBorder = isPlacing ? 'rgba(34,197,94,0.55)'
            : locked ? 'rgba(239,68,68,0.4)'
            : finished ? 'rgba(236,72,153,0.4)'
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
                  color={QQ_COLORS.slate200}
                  fontWeight={800}
                  style={{ flex: 1 }}
                />
                {isPlacing && <span style={{ fontSize: 10, fontWeight: 900, color: QQ_COLORS.green300 }}>SETZT</span>}
                {locked && <span style={{ fontSize: 10, fontWeight: 900, color: QQ_COLORS.red300 }}>RAUS</span>}
                {finished && !locked && <span style={{ fontSize: 10, fontWeight: 900, color: QQ_COLORS.brandPink }}>FERTIG</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                {/* Found-Groups als 4 Dots */}
                <div style={{ display: 'flex', gap: 2 }}>
                  {[0, 1, 2, 3].map(i => (
                    <span key={i} style={{
                      width: 8, height: 8, borderRadius: 2,
                      background: i < foundCount ? QQ_COLORS.green500 : 'rgba(255,255,255,0.10)',
                      border: i < foundCount ? '1px solid #16A34A' : '1px solid rgba(255,255,255,0.18)',
                    }} />
                  ))}
                </div>
                <span style={{ color: QQ_COLORS.slate400 }}>· Gruppen {foundCount}/4</span>
                {fails > 0 && <span style={{ color: QQ_COLORS.red300, marginLeft: 'auto' }}>✕ {fails}/{c.maxFailedAttempts}</span>}
                {phase === 'placement' && tp && tp.placementRemaining != null && tp.placementRemaining > 0 && (
                  <span style={{ color: QQ_COLORS.green300, marginLeft: 'auto' }}>×{tp.placementRemaining}</span>
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
      border: '1.5px solid rgba(236,72,153,0.5)',
      boxShadow: '0 6px 20px rgba(0,0,0,0.45), 0 0 18px rgba(236,72,153,0.25)',
      fontSize: 13, fontWeight: 900, color: QQ_COLORS.brandPinkSoft,
      display: 'flex', alignItems: 'center', gap: 10,
      animation: 'idleHintPulse 1.8s ease-in-out infinite',
    }}>
      <kbd style={{
        padding: '2px 10px', borderRadius: 6,
        background: 'rgba(236,72,153,0.2)', border: '1.5px solid rgba(236,72,153,0.6)',
        fontFamily: 'monospace', fontSize: 11, fontWeight: 900,
      }}>Space</kbd>
      <span>druecken um weiter</span>
    </div>
  );
}

function RulesControls({ state: s, roomCode, emit, onStartGame }: {
  state: QQStateUpdate; roomCode: string; emit: any; onStartGame: () => void;
}) {
  // 2026-05-09 (Rules-Audit): 2 neue Slides ergänzt (Final-Tipp + Fair Play).
  // 2026-05-09 (Wolf): Neue-Fähigkeiten-Slide raus → R2/R3-Abilities werden
  // beim Runden-Intro als Überraschung enthüllt.
  // 2026-05-24 (Wolf 'connections raus'): hasFinale entfaellt, kein 4×4-Slide.
  const hasCozyGames = !!(s as any).cozyGamesEnabled;
  // 2026-05-24 (Wolf): 'So lauefts'-Slide raus — Inhalt in Ziel + Roadmap
  // konsolidiert (Mechanik-Bullet 'richtig → 1 Feld' auf Ziel, '4 Runden ·
  // 5 Kategorien' auf Roadmap). Base = 4 (Ziel/Roadmap/Joker/Fairplay).
  const totalSlides = 4 + (hasCozyGames ? 1 : 0);
  const idx = s.rulesSlideIndex ?? 0;
  const isWelcome = idx === -2;
  const isRulesIntro = idx === -1;
  const isFirst = idx <= -2;
  const isLast = idx >= totalSlides - 1;
  // Live-Spiegel der Regel-Folien (synchron mit buildRulesSlidesDe in
  // CozyQuizRulesView).
  const slideTitles = [
    '🏆 Das Ziel',
    '🗺 Roadmap',
    '⭐ Joker-Bonus',
    ...(hasCozyGames ? ['🪅 CozyGame'] : []),
    '🤝 Fair Play',
  ];
  const label = isWelcome
    ? '🎬 Willkommen'
    : isRulesIntro
      ? '📣 Regel-Intro'
      : `📖 ${slideTitles[idx] ?? `Folie ${idx + 1}`}  (${idx + 1}/${totalSlides})`;
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 13, fontWeight: 900, color: QQ_COLORS.violet500 }}>
        {label}
      </span>
      <Btn small color={QQ_COLORS.slate500} onClick={() => emit('qq:rulesPrev', { roomCode })} outline={isFirst}>
        ◀ Zurück
      </Btn>
      {!isLast ? (
        <Btn small color={QQ_COLORS.violet500} onClick={() => emit('qq:rulesNext', { roomCode })}>
          Weiter ▶
        </Btn>
      ) : (
        <Btn small color={QQ_COLORS.green500} onClick={() => emit('qq:rulesFinish', { roomCode })}>
          ▶ Runde 1 starten
        </Btn>
      )}
      <Btn small color={QQ_COLORS.red500} outline onClick={() => emit('qq:rulesFinish', { roomCode })}>
        ⏭ Überspringen
      </Btn>
    </div>
  );
}

// 2026-05-08 (Wolf-Audit-Followup 'mod überladen'): Rangliste collapsible mit
// phase-aware default. In QUESTION_ACTIVE/REVEAL nur Header sichtbar (Mod
// fokussiert auf Antwort-Markierung), in PAUSED/PLACEMENT/COMEBACK/GAME_OVER
// default-offen (wo Rang relevant ist).
function CollapsibleRanking({ teams, phase }: { teams: QQStateUpdate['teams']; phase: QQStateUpdate['phase'] }) {
  const isFocusPhase = phase === 'QUESTION_ACTIVE' || phase === 'QUESTION_REVEAL';
  const [open, setOpen] = useState(!isFocusPhase);
  // Auto-toggle bei Phase-Wechsel auf den default für die neue Phase
  const lastPhaseRef = useRef(phase);
  useEffect(() => {
    if (lastPhaseRef.current !== phase) {
      lastPhaseRef.current = phase;
      setOpen(!(phase === 'QUESTION_ACTIVE' || phase === 'QUESTION_REVEAL'));
    }
  }, [phase]);
  const sorted = [...teams].sort(compareTeamsForRanking);
  const leader = sorted[0];
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
          color: QQ_COLORS.slate400, fontFamily: 'inherit',
        }}
      >
        <span style={sectionLabel}>Rangliste</span>
        {!open && leader && (
          <span style={{ fontSize: 11, color: QQ_COLORS.slate400, fontWeight: 700, marginLeft: 'auto', marginRight: 8 }}>
            #{1} <span style={{ color: leader.color }}>{leader.name}</span> · {leader.largestConnected}
          </span>
        )}
        <span style={{ fontSize: 15, color: QQ_COLORS.slate600 }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px' }}>
          {sorted.map((t, i) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: QQ_COLORS.slate600, width: 16 }}>#{i + 1}</span>
              <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={30} />
              <span style={{ flex: 1, fontWeight: 900, color: t.color, fontSize: 13 }}>{t.name}</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: QQ_COLORS.slate400 }}>{t.largestConnected}</span>
            </div>
          ))}
        </div>
      )}
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
          color: QQ_COLORS.slate400, fontFamily: 'inherit',
        }}
      >
        <span style={sectionLabel}>Grid {s.gridSize}×{s.gridSize}</span>
        <span style={{ fontSize: 15, color: QQ_COLORS.slate600 }}>{open ? '−' : '+'}</span>
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
                ? '1px solid rgba(236,72,153,0.7)'
                : `1px solid ${team ? `${team.color}44` : 'rgba(255,255,255,0.06)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: Math.max(9, cellSize * 0.36),
            }}>
              {cell.jokerFormed ? <JokerIcon i={r + c} size={Math.max(18, Math.floor(cellSize * 0.88))} eurovisionMode={!!s.theme?.eurovisionMode} square /> : (team ? <QQTeamAvatar avatarId={team.avatarId} teamEmoji={team.emoji} size={Math.max(18, Math.floor(cellSize * 0.88))} /> : '')}
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
  // 2026-05-25 (Wolf 'buttons doppelt — space oben rechts + unten links'):
  // Space-Keycap auf Phase-Buttons unterdrueckt — die persistente Header-
  // Pill ist Single-Source fuer den Space-Hotkey-Hint. Label-Text + Action
  // bleiben (Context-Anchor 'was kommt als Naechstes'). Andere Hotkeys
  // (P, ArrowRight, …) bleiben sichtbar, da nicht doppelt im Header.
  const showHotkey = hotkey && hotkey !== 'Space';
  return (
    <button
      onClick={onClick}
      className="qm-primary"
      data-pulse={pulse ? 'true' : undefined}
      style={{ ['--qm-btn-color' as any]: color }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{children}</span>
      {showHotkey && <span className="qm-kbd qm-kbd-sm">{hotkey}</span>}
    </button>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Team-Highlights fuer GameOver-Story-Karten (Wolf-Wunsch B+γ).
 *  Errechnet aus existierendem state die 3 spannendsten Fakten pro Team —
 *  damit Wolf beim Score-Durchlaufen pro Team etwas zu erzaehlen hat statt
 *  sich alles selbst merken zu muessen. Importance-Werte schichten die
 *  Highlights so dass Sieger-/Stapel-Master-/Bluff-Master-Achievements
 *  ueber den allgemeinen "hat gespielt"-Indikatoren landen. */
type ModTeamHighlight = { icon: string; label: string; value: string; importance: number };
function computeTeamHighlights(s: QQStateUpdate, teamId: string): ModTeamHighlight[] {
  const highlights: ModTeamHighlight[] = [];
  const team = s.teams.find(t => t.id === teamId);
  if (!team) return [];
  const stats = s.teamPhaseStats?.[teamId];

  // Final Position via sort
  const sorted = [...s.teams].sort((a, b) =>
    b.largestConnected - a.largestConnected || b.totalCells - a.totalCells
  );
  const rank = sorted.findIndex(t => t.id === teamId) + 1;
  if (rank === 1) highlights.push({ icon: '🥇', label: 'Sieger', value: 'Platz 1 — größtes Gebiet', importance: 100 });
  else if (rank === 2) highlights.push({ icon: '🥈', label: 'Vize-Sieger', value: 'Platz 2 — knapp am Sieg vorbei', importance: 75 });
  else if (rank === 3) highlights.push({ icon: '🥉', label: 'Bronze', value: 'Platz 3 — auf dem Treppchen', importance: 60 });

  // Joker
  const jokers = stats?.jokersEarned ?? 0;
  if (jokers >= 2) highlights.push({ icon: '🃏', label: 'Joker-Master', value: `${jokers} Joker verdient`, importance: 70 });
  else if (jokers === 1) highlights.push({ icon: '🃏', label: 'Joker', value: '1 Joker verdient', importance: 35 });

  // Steals
  const steals = stats?.stealsUsed ?? 0;
  if (steals >= 4) highlights.push({ icon: '⚔️', label: 'Räuber', value: `${steals}× Felder geklaut`, importance: 65 });
  else if (steals >= 2) highlights.push({ icon: '⚔️', label: 'Klau-Aktiv', value: `${steals}× geklaut`, importance: 40 });
  else if (steals === 1) highlights.push({ icon: '⚔️', label: 'Klau-Erstling', value: '1× geklaut', importance: 18 });

  // Stapel
  const stapels = stats?.stapelsUsed ?? 0;
  if (stapels >= 3) highlights.push({ icon: '🏯', label: 'Stapel-King', value: `${stapels}× gestapelt`, importance: 60 });
  else if (stapels >= 1) highlights.push({ icon: '🏯', label: 'Stapler', value: `${stapels}× gestapelt`, importance: 28 });

  // Connections-Gruppen
  const connectGroups = (s.connections?.teamProgress as any)?.[teamId]?.foundGroupIds?.length ?? 0;
  if (connectGroups >= 4) highlights.push({ icon: '🧩', label: 'Connections-Profi', value: 'alle 4 Gruppen gefunden', importance: 80 });
  else if (connectGroups >= 2) highlights.push({ icon: '🧩', label: 'Connections-Stark', value: `${connectGroups} Gruppen gefunden`, importance: 50 });
  else if (connectGroups === 1) highlights.push({ icon: '🧩', label: 'Connections', value: '1 Gruppe gefunden', importance: 22 });

  // Bluff-Erfolge
  const bluffPts = (s as any).bluffPoints?.[teamId];
  if (bluffPts) {
    if ((bluffPts.blufferBonus ?? 0) >= 4) highlights.push({ icon: '🎭', label: 'Bluff-Master', value: `${bluffPts.blufferBonus} Reinfälle ausgeloest`, importance: 70 });
    else if ((bluffPts.blufferBonus ?? 0) >= 2) highlights.push({ icon: '🎭', label: 'Bluff-Erfolg', value: `${bluffPts.blufferBonus} Reinfälle`, importance: 38 });
    if ((bluffPts.foundReal ?? 0) >= 3) highlights.push({ icon: '🔍', label: 'Wahrheits-Sucher', value: `${bluffPts.foundReal}× echte Antwort gefunden`, importance: 32 });
  }

  // Score-Stats (immer)
  const score = team.largestConnected ?? 0;
  if (score >= 12) highlights.push({ icon: '🏆', label: 'Mega-Gebiet', value: `${score} verbundene Felder`, importance: 55 });
  else if (score >= 8) highlights.push({ icon: '🏆', label: 'Großes Gebiet', value: `${score} verbundene Felder`, importance: 25 });
  else if (score === 0) highlights.push({ icon: '🌱', label: 'Mitspielen zählt', value: 'Hat tapfer durchgehalten', importance: 10 });

  // Total cells (Multitasker mit vielen unverbundenen)
  const totalCells = team.totalCells ?? 0;
  if (totalCells >= 12 && totalCells - score >= 4) highlights.push({ icon: '📦', label: 'Vielspieler', value: `${totalCells} Felder gesamt — verstreut`, importance: 30 });

  // Sort by importance desc, take top 3
  highlights.sort((a, b) => b.importance - a.importance);
  return highlights.slice(0, 3);
}

function actionLabel(action: string, stats: any): string {
  if (action === 'PLACE_1')   return '1 Feld setzen';
  if (action === 'PLACE_2')   return `2 Felder (${stats?.placementsLeft ?? 2} übrig)`;
  if (action === 'STEAL_1')   return '1 Feld klauen';
  if (action === 'FREE')      return 'Setzen oder Klauen';
  if (action === 'SHIELD_1')  return '🛡️ Schild';
  if (action === 'STAPEL_1')  return '🏯 Stapeln';
  if (action === 'STAPEL_BONUS') return '🏯 Stapel-Bonus (Finale)';
  if (action === 'SWAP_1')    return '🔄 Tauschen';
  if (action === 'SANDUHR_1') return '⏳ Bann';
  return action;
}

function phasePillStyle(phase: string): React.CSSProperties {
  const colors: Record<string, string> = {
    LOBBY: QQ_COLORS.slate600, RULES: '#6366f1', PHASE_INTRO: QQ_COLORS.blue500, QUESTION_ACTIVE: QQ_COLORS.green500,
    QUESTION_REVEAL: QQ_COLORS.brandPink, PLACEMENT: QQ_COLORS.red500,
    COMEBACK_CHOICE: QQ_COLORS.violet500, PAUSED: QQ_COLORS.brandPink, GAME_OVER: QQ_COLORS.slate500,
  };
  const c = colors[phase] ?? QQ_COLORS.slate600;
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

/** 2026-05-20: PIN-Holder fuer Dev-Endpoints in Production.
 *  Wolf gibt einmal pro Browser ein (localStorage), danach nie wieder bis
 *  Cache-Clear oder PIN-falsch (clearDevPin nach 403). Vorher sessionStorage
 *  → Tab-Refresh hat Cache geleert, Wolf musste mehrfach eingeben. */
const DEV_PIN_STORAGE_KEY = 'qq-admin-pin';

function hasDevPin(): boolean {
  return !!localStorage.getItem(DEV_PIN_STORAGE_KEY);
}

function getDevPin(): string | null {
  let pin = localStorage.getItem(DEV_PIN_STORAGE_KEY);
  if (pin) return pin;
  pin = window.prompt('Admin-PIN für Dev-Aktionen (Bots / Auto-Antworten):');
  if (!pin) return null;
  localStorage.setItem(DEV_PIN_STORAGE_KEY, pin);
  return pin;
}

function clearDevPin(): void {
  localStorage.removeItem(DEV_PIN_STORAGE_KEY);
}

function DangerMenu({ onRestart, onBackToSetup, roomCode, phase, avatarSetId }: {
  onRestart: () => void; onBackToSetup: () => void;
  roomCode: string; phase: string;
  avatarSetId?: string;
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
      // 2026-05-07 (Wolf-Bug 'dummys benutzen nicht das gewaehlte Set'):
      // Bot-Avatar-Pool aus aktivem Avatar-Set ableiten.
      const setId = avatarSetId ?? 'all';
      const set = AVATAR_SETS.find(s => s.id === setId);
      const setAvatars: string[] = setId === 'all'
        ? MEGA_EMOJI_POOL
        : setId === 'esc'
          ? ESC_FLAG_POOL
          : (set?.avatars ?? []);
      const pin = getDevPin();
      if (!pin) return;
      const r = await fetch(`${API_BASE}/qq/${encodeURIComponent(roomCode)}/dev/fillTeams`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 8, setAvatars, pin }),
      });
      const data = await r.json();
      if (r.status === 403) {
        clearDevPin();
        alert('PIN falsch — beim nächsten Klick erneut eingeben.');
      } else if (!r.ok) {
        alert(`Fehler: ${data.error ?? 'unbekannt'}`);
      }
    } finally { setBusy(null); }
  }
  return (
    <div ref={ref} style={{ position: 'relative', marginLeft: 'auto' }}>
      <button
        onClick={() => {
          const willOpen = !open;
          // 2026-05-20 (Wolf): PIN beim Oeffnen des Menues abfragen, damit
          // die Buttons drinnen direkt klickbar sind ohne Mid-Action-Prompt.
          if (willOpen && !hasDevPin()) {
            const pin = getDevPin();
            if (!pin) return; // User hat Prompt abgebrochen → Menue bleibt zu
          }
          setOpen(willOpen);
        }}
        style={{
          padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
          border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)',
          color: QQ_COLORS.red500, fontFamily: 'inherit', fontWeight: 900, fontSize: 12,
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
            style={menuItemStyle(QQ_COLORS.brandPink)}
          >↺ Quiz neustarten
            <span style={{ fontSize: 10, color: QQ_COLORS.slate500, display: 'block' }}>Punkte & Grid reset, Teams bleiben</span>
          </button>
          <button
            onClick={() => { setOpen(false); onBackToSetup(); }}
            style={menuItemStyle(QQ_COLORS.red500)}
          >⎌ Zurück zum Setup
            <span style={{ fontSize: 10, color: QQ_COLORS.slate500, display: 'block' }}>Teams kicken, Einstellungen neu</span>
          </button>
          {devEnabled && (
            <>
              <div style={{
                marginTop: 6, padding: '4px 10px',
                fontSize: 9, color: QQ_COLORS.slate500, fontWeight: 900, letterSpacing: '0.1em',
                textTransform: 'uppercase', borderTop: '1px solid rgba(255,255,255,0.05)',
              }}>🧪 Dev</div>
              <button
                disabled={phase !== 'LOBBY' || busy !== null}
                onClick={() => devFillTeams()}
                style={{
                  ...menuItemStyle(QQ_COLORS.green500),
                  opacity: phase !== 'LOBBY' || busy !== null ? 0.4 : 1,
                  cursor: phase !== 'LOBBY' || busy !== null ? 'not-allowed' : 'pointer',
                }}
              >{busy === 'fill' ? '…' : '👥'} 8 Dummy-Teams
                <span style={{ fontSize: 10, color: QQ_COLORS.slate500, display: 'block' }}>
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
  // 2026-05-07 (Wolf): Plus pro-Draft Avatar-Set-Praeferenz auto-anwenden
  // (z.B. Eurovision-Quiz wechselt automatisch auf 'esc'-Set, sodass Bots
  // ESC-Flaggen ziehen statt zufaelliger MEGA-Pool-Emojis). Wolf kann
  // danach immer noch manuell das Set ueberschreiben.
  useEffect(() => {
    if (!qqDraftId) { setDraftSoundConfig({}); return; }
    let cancelled = false;
    fetch(`/api/qq/drafts/${encodeURIComponent(qqDraftId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (cancelled || !d) return;
        setDraftSoundConfig(d.soundConfig ?? {});
        // 2026-05-07: Auto-Avatar-Set per Draft-Praeferenz. Fallback: bei
        // theme.eurovisionMode auch ohne explizites preferredAvatarSetId
        // auf 'esc' wechseln — deckt alte Demo-Drafts ab die VOR meinem
        // Template-Update via Button erstellt wurden.
        const preferredSet = d.theme?.preferredAvatarSetId
          || (d.theme?.eurovisionMode ? 'esc' : undefined);
        if (preferredSet && preferredSet !== s.avatarSetId) {
          emit('qq:setAvatarSet', { roomCode, avatarSetId: preferredSet });
        }
        // 2026-05-07 (Wolf-Bug 'normale Drafts sollen wieder all'-Set zeigen'):
        // Wenn neuer Draft keine Praeferenz hat ABER das aktuelle Set vom
        // vorherigen Eurovision-Draft auf 'esc' steht → zurueck auf 'all'.
        // Andere manuell gewaehlte Sets (halloween/pub/etc.) bleiben unangetastet.
        else if (!preferredSet && s.avatarSetId === 'esc') {
          emit('qq:setAvatarSet', { roomCode, avatarSetId: 'all' });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // 2026-05-07 (Wolf-Bug 'Eurovision-Lobby-Sound versehentlich auf alle Drafts
  // gepusht'): Strippt nur das lobbyWelcome-Feld aus allen Drafts. Andere
  // SoundConfig-Felder (timerLoop, fanfare, ...) bleiben erhalten. Beim
  // Lobby-Loop greift dann automatisch der Pool-Fallback (lobby-welcome-1..4
  // rotierend), weil startLobbyLoop bei leerem Custom-Url auf den Pool zurueck-
  // faellt.
  async function clearLobbySoundFromAllDrafts() {
    if (!window.confirm(`Den 'Lobby/Pause-Musik'-Slot aus allen ${drafts.length} Fragensätzen entfernen? Andere Sounds bleiben unangetastet.\n\nDanach laeuft im Lobby-Modus wieder der Standard-4-Track-Pool (lobby-welcome-1..4 geshuffelt).`)) return;
    setSavingSound(true);
    let touched = 0;
    try {
      for (const d of drafts) {
        const id = d.id.startsWith('qq:') ? d.id.slice(3) : d.id;
        const res = await fetch(`/api/qq/drafts/${encodeURIComponent(id)}`);
        if (!res.ok) continue;
        const draft = await res.json();
        const cfg = (draft.soundConfig ?? {}) as Record<string, any>;
        const had = typeof cfg.lobbyWelcome === 'string' && cfg.lobbyWelcome.length > 0;
        if (!had) continue; // nichts zu tun
        const { lobbyWelcome: _drop, ...rest } = cfg;
        draft.soundConfig = rest;
        await fetch(`/api/qq/drafts/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        });
        touched++;
      }
      alert(`Lobby-Sound aus ${touched} von ${drafts.length} Fragensaetzen entfernt. Pool-Fallback ist wieder aktiv.`);
    } finally { setSavingSound(false); }
  }

  const selectedDraft = drafts.find(d => d.id === selectedDraftId);

  // ── Farb-Tokens für Setup (wärmer als der Live-Modus) ─────────────────────
  const GOLD = QQ_COLORS.brandPink;
  const GOLD_SOFT = 'rgba(236,72,153,0.15)';
  const GOLD_BORDER = 'rgba(236,72,153,0.45)';

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
    fontSize: 13, fontWeight: 900, color: QQ_COLORS.slate200,
    marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
    letterSpacing: '0.04em',
  };

  const fieldLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 900, color: QQ_COLORS.slate500,
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em',
  };

  // Warm selector pill (Gold-Akzent statt blau)
  const pillBtn = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontWeight: 900, fontSize: 13, fontFamily: 'inherit',
    background: active ? GOLD : 'rgba(255,255,255,0.05)',
    color: active ? '#1a1206' : QQ_COLORS.slate400,
    boxShadow: active ? '0 3px 10px rgba(236,72,153,0.35)' : 'none',
    transition: 'all 0.15s',
  });

  const toggleBtn = (active: boolean, activeColor = QQ_COLORS.green500): React.CSSProperties => ({
    padding: '9px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
    fontWeight: 900, fontSize: 13, width: '100%', textAlign: 'left' as const,
    border: `1px solid ${active ? activeColor : 'rgba(255,255,255,0.09)'}`,
    background: active ? `${activeColor}1a` : 'rgba(255,255,255,0.03)',
    color: active ? activeColor : QQ_COLORS.slate400,
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
          'radial-gradient(ellipse at 0% 0%, rgba(236,72,153,0.22), transparent 55%),' +
          'radial-gradient(ellipse at 100% 100%, rgba(244,114,182,0.14), transparent 60%),' +
          'linear-gradient(180deg, #1f1610, #150e08)',
        border: `1px solid ${GOLD_BORDER}`,
        boxShadow:
          '0 12px 36px rgba(0,0,0,0.5),' +
          '0 0 60px rgba(236,72,153,0.10),' +
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
                      ? 'linear-gradient(180deg, rgba(236,72,153,0.18), rgba(236,72,153,0.06))'
                      : 'rgba(0,0,0,0.32)',
                    color: '#fef3c7', cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: sel
                      ? '0 6px 18px rgba(236,72,153,0.25), inset 0 1px 0 rgba(255,255,255,0.06)'
                      : 'inset 0 1px 0 rgba(0,0,0,0.4)',
                    transition: 'all 0.15s',
                    display: 'flex', flexDirection: 'column', gap: 6,
                  }}>
                  <div style={{
                    fontSize: 14, fontWeight: 900, lineHeight: 1.2,
                    color: sel ? '#fef3c7' : QQ_COLORS.slate200,
                  }}>{d.title}</div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                    fontSize: 11, fontWeight: 700, color: '#a8a395',
                  }}>
                    <span>{d.questionCount} Fragen</span>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span style={{
                      padding: '1px 8px', borderRadius: 999,
                      background: draftFit ? 'rgba(34,197,94,0.14)' : 'rgba(236,72,153,0.14)',
                      border: `1px solid ${draftFit ? 'rgba(34,197,94,0.32)' : 'rgba(236,72,153,0.32)'}`,
                      color: draftFit ? QQ_COLORS.green300 : QQ_COLORS.yellow300,
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
            marginTop: 10, fontSize: 11, fontWeight: 700, color: QQ_COLORS.yellow300,
            padding: '6px 12px', borderRadius: 8,
            background: 'rgba(236,72,153,0.10)',
            border: '1px solid rgba(236,72,153,0.25)',
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

        {/* Sprache — 2026-05-20 (Setup-Audit P0.1): Klartext-Labels neben
            Flaggen, weil reine Icons untergehen zwischen den anderen Toggles. */}
        <div style={settingRow}>
          <span style={settingLabel}>🌐 Sprache</span>
          <div style={segGroup}>
            {(['de', 'en', 'both'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => emit('qq:setLanguage', { roomCode, language: lang })}
                style={{ ...segPill(s.language === lang), fontSize: 13, padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                title={lang === 'de' ? 'Deutsch' : lang === 'en' ? 'English' : 'Beide Sprachen im Wechsel'}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>{lang === 'de' ? '🇩🇪' : lang === 'en' ? '🇬🇧' : '🌐'}</span>
                <span style={{ fontWeight: 900 }}>{lang === 'de' ? 'Deutsch' : lang === 'en' ? 'English' : 'Beide'}</span>
              </button>
            ))}
          </div>
        </div>


        {/* Sound — 2026-05-20 (Setup-Audit P0.3): nur Musik+SFX-Toggles in
            Quick-Settings. Volume-Slider in Advanced verlegt (90% der Mods
            nutzen 100% oder 0%, fein-tuning ist Edge-Case). */}
        <div style={settingRow}>
          <span style={settingLabel}>🔊 Sound</span>
          <div style={segGroup}>
            <button
              onClick={() => emit('qq:setMusicMuted', { roomCode, muted: !s.musicMuted })}
              style={segPill(!s.musicMuted, QQ_COLORS.green500)}
              title="Musik an/aus"
            >{s.musicMuted ? '🔇 Musik' : '🎵 Musik'}</button>
            <button
              onClick={() => emit('qq:setSfxMuted', { roomCode, muted: !s.sfxMuted })}
              style={segPill(!s.sfxMuted, QQ_COLORS.green500)}
              title="SFX an/aus"
            >{s.sfxMuted ? '🔇 SFX' : '🔉 SFX'}</button>
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
                · Spielmechanik · Reihenfolge · Avatar-Set · Sound-Volume · Bestenliste-Reset
              </span>
            )}
          </span>
        </button>

        {advancedOpen && (
          <div style={{ padding: '4px 18px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 2026-05-24 (Wolf 'connections nutze ich nicht mehr, kann raus'):
            Connections-4×4-Toggle entfernt. Backend ignoriert connectionsEnabled
            auch wenn aus altem Draft true (qqRooms.ts End-of-Phase-Logik). */}

        {/* 2026-05-24 (Wolf 'verdichten'): 3 Spielmechanik-Toggles (Final-
            Wetten, Comeback, CozyGames) in EINER Pill-Row statt 3 × 80px-
            Blocks. Tooltip per Hover zeigt die Erklaerung. Spart ~190px
            Vertikal-Hoehe im Advanced-Drawer. */}
        <div style={{ ...settingRow, alignItems: 'flex-start' }}>
          <span style={settingLabel}>🎲 Spielmechanik</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => emit('qq:setFinalWagerEnabled', { roomCode, enabled: !s.finalWagerEnabled })}
              style={segPill(!!s.finalWagerEnabled, QQ_COLORS.brandPinkMid)}
              title={s.finalWagerEnabled
                ? '🪙 Final-Wetten AN — Wager-Phase vor Final-Runde.\nKlick zum Deaktivieren.'
                : '🪙 Final-Wetten AUS.\nKlick zum Aktivieren: Wager-Phase vor Final-Runde.'}
            >🪙 Wager</button>
            <button
              onClick={() => emit('qq:setQuizOptions', { roomCode, comebackEnabled: !((s as any).comebackEnabled !== false) })}
              style={segPill((s as any).comebackEnabled !== false, QQ_COLORS.brandPinkMid)}
              title={(s as any).comebackEnabled !== false
                ? '🔄 Comeback AN — letztes Team kann via Mehr-oder-Weniger Felder klauen.\nKlick zum Deaktivieren.'
                : '🔄 Comeback AUS — direkt zur Final-Runde.\nKlick zum Aktivieren.'}
            >🔄 Comeback</button>
            <button
              onClick={() => emit('qq:setQuizOptions', { roomCode, cozyGamesEnabled: !(s as any).cozyGamesEnabled })}
              style={segPill(!!(s as any).cozyGamesEnabled, QQ_COLORS.brandPink)}
              title={(s as any).cozyGamesEnabled
                ? `🪅 CozyGames AN — ${((s as any).cozyGamesPool ?? []).length} Spiele im Rad, manueller Trigger via Pause-Button.\nKlick zum Deaktivieren.`
                : '🪅 CozyGames AUS.\nKlick zum Aktivieren: analoge Mini-Spiele zwischen Runden.'}
            >🪅 CozyGames</button>
          </div>
        </div>

        {/* Reihenfolge der Fragen innerhalb der Runde */}
        <div style={settingRow}>
          <span style={settingLabel}>🔀 Reihenfolge</span>
          <div style={segGroup}>
            <button onClick={() => emit('qq:setQuizOptions', { roomCode, shuffleQuestionsInRound: true })} style={segPill(s.shuffleQuestionsInRound !== false, QQ_COLORS.violet400)}>Zufällig</button>
            <button onClick={() => emit('qq:setQuizOptions', { roomCode, shuffleQuestionsInRound: false })} style={segPill(s.shuffleQuestionsInRound === false)}>Aus Draft</button>
          </div>
          <span style={{ fontSize: 11, color: '#6b6555', fontWeight: 700, marginLeft: 4 }}>
            {s.shuffleQuestionsInRound !== false ? 'Kategorien werden in jeder Runde gemischt' : 'Reihenfolge wie im Draft'}
          </span>
        </div>

        {/* 2026-05-25 (Wolf 'bluff ist ja raus, also bluff vorab pruefen auch
            aktuell unnoetig?'): Bluff-Toggle entfernt. Bluff-Fragen sind seit
            2026-05-24 aus aktiven Drafts raus (siehe scripts/fix-tonight-draft.mjs).
            Toggle hatte ohne Bluff-Fragen keinen Effekt. Backend-Handler
            qq:bluffSettings bleibt fuer Reaktivierung erhalten. */}

        {/* 2026-05-04 — Avatar-Theme (Phase 1: nur State-Propagation) */}
        {/* 2026-05-07 — Pill-Row → Dropdown (Wolf-Wunsch: kompakter, weniger visueller Lärm). */}
        <div style={{ ...settingRow, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <span style={{ ...settingLabel, marginTop: 6 }}>🧑‍🎨 Avatar</span>
          {(() => {
            const activeId = s.avatarSetId ?? 'cozyAnimals';
            const activeSet = AVATAR_SETS.find(x => x.id === activeId) ?? AVATAR_SETS[0];
            return (
              <select
                value={activeId}
                onChange={e => emit('qq:setAvatarSet', { roomCode, avatarSetId: e.target.value })}
                style={{
                  flex: 1,
                  padding: '7px 30px 7px 12px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 900,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  background:
                    `linear-gradient(135deg, ${activeSet.tint}26, ${activeSet.tint}0d) ` +
                    `no-repeat, rgba(0,0,0,0.32)`,
                  color: '#fff',
                  boxShadow: `0 0 0 1.5px ${activeSet.tint}, 0 0 14px ${activeSet.tint}40`,
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  backgroundImage:
                    `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='%23fff' d='M0 0l5 6 5-6z'/></svg>")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 10px center',
                  backgroundSize: '10px 6px',
                }}
                title={activeSet.label}
              >
                {AVATAR_SETS.map(set => (
                  <option key={set.id} value={set.id} style={{ background: '#1f1610', color: '#fff' }}>
                    {set.leadEmoji}  {set.label}
                  </option>
                ))}
              </select>
            );
          })()}
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

            {/* Volume-Slider — 2026-05-20 (Setup-Audit P0.3): aus Quick-
                Settings hierhin verlegt. Fein-Tuning ist Edge-Case, die
                meisten Mods nutzen 100% oder An/Aus. */}
            <div>
              <div style={fieldLabel}>🔊 Gesamt-Lautstärke</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 320 }}>
                <input
                  type="range" min={0} max={100} step={5}
                  value={Math.round((s.volume ?? 0.8) * 100)}
                  onChange={e => emit('qq:setVolume', { roomCode, volume: Number(e.target.value) / 100 })}
                  style={{ flex: 1, accentColor: GOLD }}
                />
                <span style={{ fontSize: 13, color: '#fef3c7', minWidth: 42, fontWeight: 900, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                  {Math.round((s.volume ?? 0.8) * 100)}%
                </span>
              </div>
            </div>

            {/* Comeback Timer */}
            <div>
              <div style={fieldLabel}>⚡ Comeback „Mehr oder Weniger" — Timer pro Runde</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', maxWidth: 280 }}>
                <input
                  type="number"
                  min={3}
                  max={60}
                  value={s.comebackHLTimerSec ?? 20}
                  onChange={e => {
                    const v = Math.max(3, Math.min(60, Number(e.target.value) || 20));
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
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  <button
                    onClick={applySoundsToAllDrafts}
                    disabled={savingSound}
                    style={{
                      padding: '7px 14px', borderRadius: 8, cursor: savingSound ? 'wait' : 'pointer',
                      border: `1px solid ${GOLD_BORDER}`, background: GOLD_SOFT,
                      color: GOLD, fontSize: 11, fontWeight: 900, fontFamily: 'inherit',
                    }}
                    title="Diese Sounds auf alle Fragensätze übernehmen"
                  >📋 Sounds auf alle Fragensätze übernehmen</button>
                  <button
                    onClick={clearLobbySoundFromAllDrafts}
                    disabled={savingSound}
                    style={{
                      padding: '7px 14px', borderRadius: 8, cursor: savingSound ? 'wait' : 'pointer',
                      border: '1px solid rgba(248,113,113,0.45)',
                      background: 'rgba(248,113,113,0.10)',
                      color: QQ_COLORS.red300, fontSize: 11, fontWeight: 900, fontFamily: 'inherit',
                    }}
                    title="Lobby/Pause-Musik aus allen Fragensätzen entfernen — Standard-Pool springt wieder ein"
                  >🔄 Lobby-Sound aus allen Sätzen entfernen</button>
                </div>
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
                  color: QQ_COLORS.red300,
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
            background: 'rgba(236,72,153,0.06)',
            border: '1px solid rgba(236,72,153,0.25)',
            marginBottom: 4, fontSize: 12, fontWeight: 700, color: QQ_COLORS.yellow300,
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: QQ_COLORS.brandPink, marginBottom: 2 }}>
              Vor dem Start
            </div>
            {issues.map((iss, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ color: QQ_COLORS.brandPink }}>•</span>
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
              color: selectedDraftId ? '#fff' : QQ_COLORS.slate600,
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
        <div style={{ textAlign: 'center', fontSize: 11, color: QQ_COLORS.slate600, marginTop: 10, pointerEvents: 'none' }}>
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
                fontSize: 11, fontWeight: 900, color: QQ_COLORS.yellow300,
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
  const GOLD = QQ_COLORS.brandPink;
  const lobbyCard: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 16, padding: 20, marginBottom: 14,
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: 13, fontWeight: 900, color: QQ_COLORS.slate200, marginBottom: 12,
    letterSpacing: '0.04em', textTransform: 'uppercase',
    display: 'flex', alignItems: 'center', gap: 8,
  };
  const fieldLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 900, color: QQ_COLORS.slate400,
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
          background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.3)',
          fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', color: GOLD,
          textTransform: 'uppercase',
        }}>
          <span style={{ fontSize: 16 }}>🎭</span>
          Lobby — Teams joinen
        </div>
        <h1 style={{
          margin: '12px 0 6px', fontSize: 28, fontWeight: 900, color: '#fff',
        }}>Bereit zum Start</h1>
        <div style={{ fontSize: 13, color: QQ_COLORS.slate400 }}>
          Sobald alle Teams dabei sind: <strong style={{ color: QQ_COLORS.green500 }}>Quiz starten</strong> drücken (oder Space).
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
            color: QQ_COLORS.red500, cursor: 'pointer', fontFamily: 'inherit',
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
            color: connected > 0 ? QQ_COLORS.green500 : QQ_COLORS.slate500,
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
                fontSize: 14, color: QQ_COLORS.slate500, fontStyle: 'italic',
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
                      <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={44} style={{ flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <TeamNameLabel
                          name={t.name}
                          maxLines={1}
                          shrinkAfter={14}
                          fontSize={13}
                          color={t.connected ? QQ_COLORS.slate200 : QQ_COLORS.slate500}
                          fontWeight={900}
                        />
                        <div style={{
                          fontSize: 10, fontWeight: 700,
                          color: t.connected ? QQ_COLORS.green500 : QQ_COLORS.red500,
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
                          background: 'rgba(148,163,184,0.08)', color: QQ_COLORS.slate300,
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
                          background: 'rgba(239,68,68,0.08)', color: QQ_COLORS.red500,
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
              const dummyCount = s.teams.filter(t => (t as any)._dummy).length;
              return (
              <div style={{
                marginTop: 12, padding: '10px 12px', borderRadius: 8,
                background: 'rgba(236,72,153,0.08)',
                border: '1px dashed rgba(236,72,153,0.35)',
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: 10, color: QQ_COLORS.brandPink, fontWeight: 900, letterSpacing: '0.1em' }}>
                  🧪 TEST
                </span>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {([1, 3, 5, 7, 8] as const).map(n => (
                    <button
                      key={n}
                      onClick={async () => {
                        // 2026-05-07 (Wolf): Bot-Avatare ans aktive Set anpassen.
                        const setId = s.avatarSetId ?? 'all';
                        const set = AVATAR_SETS.find(x => x.id === setId);
                        const setAvatars: string[] = setId === 'all'
                          ? MEGA_EMOJI_POOL
                          : setId === 'esc'
                            ? ESC_FLAG_POOL
                            : (set?.avatars ?? []);
                        const pin = getDevPin();
                        if (!pin) return;
                        const r = await fetch(`${API_BASE}/qq/${encodeURIComponent(roomCode)}/dev/fillTeams`, {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ count: n, setAvatars, pin }),
                        });
                        if (r.status === 403) {
                          clearDevPin();
                          alert('PIN falsch — beim nächsten Klick erneut eingeben.');
                        } else if (!r.ok) {
                          const d = await r.json().catch(() => ({}));
                          alert(`Fehler: ${d.error ?? r.statusText}`);
                        }
                      }}
                      style={{
                        padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                        border: '1px solid rgba(236,72,153,0.4)', background: 'rgba(236,72,153,0.15)',
                        color: QQ_COLORS.brandPink, fontFamily: 'inherit', fontWeight: 900, fontSize: 12,
                      }}
                    >+ {n} {n === 1 ? 'Dummy' : 'Dummies'}</button>
                  ))}
                  {/* 2026-05-04 (Wolf): „Alle Bots raus" — eine Taste, kickt
                      alle Dummy-Teams (echte Spieler bleiben). */}
                  {dummyCount > 0 && (
                    <button
                      onClick={() => {
                        if (!window.confirm(`${dummyCount} ${dummyCount === 1 ? 'Bot' : 'Bots'} aus der Lobby entfernen?`)) return;
                        for (const t of s.teams) {
                          if ((t as any)._dummy) emit('qq:kickTeam', { roomCode, teamId: t.id });
                        }
                      }}
                      style={{
                        padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                        border: '1px solid rgba(239,68,68,0.45)', background: 'rgba(239,68,68,0.15)',
                        color: QQ_COLORS.red500, fontFamily: 'inherit', fontWeight: 900, fontSize: 12,
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
      <span style={{ color: QQ_COLORS.slate500, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 10 }}>
        {label}
      </span>
      <span style={{ color: QQ_COLORS.slate200, fontWeight: 900 }}>{value}</span>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const page: React.CSSProperties = {
  minHeight: '100vh',
  background:
    'radial-gradient(circle at 50% -20%, rgba(236,72,153,0.06), transparent 55%), ' +
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
      ['F18', 'Skip aktuelles Team (PLACEMENT, ohne Confirm)'],
      ['P / F19', 'Pause / Resume'],
    ],
  },
  {
    title: 'Team als korrekt markieren',
    rows: [
      ['1–5', 'Team 1–5 korrekt (im QUESTION_REVEAL)'],
      ['F14', 'Team 1 korrekt (Buzz-Winner)'],
      ['Esc / Backspace / F16', 'Niemand korrekt'],
      ['Z', 'Letzten Mark-Correct rückgängig (im QUESTION_REVEAL)'],
    ],
  },
  {
    title: 'Beamer & Ton',
    rows: [
      ['M', 'Ton an/aus (Musik + SFX)'],
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
