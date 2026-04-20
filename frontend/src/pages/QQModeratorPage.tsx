import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useQQSocket } from '../hooks/useQQSocket';
import {
  QQQuestion, QQLanguage, QQ_CATEGORY_LABELS, QQ_CATEGORY_COLORS,
  QQStateUpdate, QQSoundConfig,
} from '../../../shared/quarterQuizTypes';
import { QQSoundPanel } from '../components/QQSoundPanel';
import { QQTeamAvatar } from '../components/QQTeamAvatar';

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
  const [phases, setPhases] = useState<3 | 4>(3);
  const [joined, setJoined]     = useState(false);
  const [timerInput, setTimerInput] = useState(30);
  const [drafts, setDrafts]         = useState<DraftSummary[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string>('');
  const [showSoundPanel, setShowSoundPanel] = useState(false);
  const [localSoundConfig, setLocalSoundConfig] = useState<QQSoundConfig>({});
  const startingRef = useRef(false); // prevent double-fire on startGame

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

  // Auto-sync phases when user selects a draft (take draft's own phases, or derive from questionCount)
  useEffect(() => {
    if (!selectedDraftId) return;
    const d = drafts.find(x => x.id === selectedDraftId);
    if (!d) return;
    // Prefer draft's saved phases; else derive from question count (15 → 3, 20 → 4)
    const derived = d.phases ?? (d.questionCount === 20 ? 4 : d.questionCount === 15 ? 3 : null);
    if (derived && derived !== phases) setPhases(derived);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDraftId, drafts]);

  // Load available drafts once (Cozy60 + QQ Builder)
  useEffect(() => {
    fetch('/api/qq/drafts').then(r => r.json()).catch(() => []).then((qqDrafts: any[]) => {
      const qq: DraftSummary[] = Array.isArray(qqDrafts)
        ? qqDrafts.map((d: any) => ({
            id: `qq:${d.id}`,
            title: `🎯 ${d.title}`,
            date: null,
            updatedAt: d.updatedAt ?? 0,
            questionCount: d.questions?.length ?? 0,
            phases: (d.phases === 4 ? 4 : 3) as 3 | 4,
          }))
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
    // Preflight: phases * 5 must match the draft's question count
    const summary = drafts.find(d => d.id === selectedDraftId);
    if (summary && summary.questionCount !== phases * 5) {
      const suggest = summary.questionCount === 20 ? 4 : summary.questionCount === 15 ? 3 : null;
      alert(
        `Das Set hat ${summary.questionCount} Fragen, aber ${phases} Runden brauchen ${phases * 5}.` +
        (suggest ? `\n\nTipp: Stelle die Runden auf ${suggest}.` : '\n\nBitte Set prüfen oder Runden anpassen.')
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
    const qqDraftId = qqId;
    const qqDraftTitle = qqDraftId ? (drafts.find(d => d.id === qqDraftId)?.title ?? undefined) : undefined;
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

  const handleKey = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target?.tagName && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
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
    const cheeseRevealInProgress = isCheeseReveal && (s.cheeseRevealStep ?? 0) < 2;

    // Space — smart next step (mirrors CozyQuiz Space behavior)
    if (e.code === 'Space') {
      e.preventDefault();
      if (s.phase === 'RULES') {
        const totalSlides = 5;
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
        // Steps 0/1 erklären, Step 2 zeigt die Aktion, nächster Space startet
        // automatisch den Klau-Flow (Backend entscheidet per comebackIntroStep).
        emitRef.current('qq:comebackIntroStep', { roomCode });
      }
      // PLACEMENT: grid shown, teams are placing — Space moves to next question (PHASE_INTRO)
      else if (s.phase === 'PLACEMENT' && !s.pendingFor)
        emitRef.current('qq:nextQuestion', { roomCode });
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
        const totalSlides = 5;
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
        // Steps 0/1 erklären, Step 2 zeigt die Aktion, nächster Space startet
        // automatisch den Klau-Flow (Backend entscheidet per comebackIntroStep).
        emitRef.current('qq:comebackIntroStep', { roomCode });
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
      case 'PAUSED': return { text: '⏸ PAUSE', color: '#F59E0B' };
      case 'GAME_OVER': return { text: '🏆 SPIEL BEENDET', color: '#64748b' };
      case 'THANKS': return { text: '🙏 DANKE-FOLIE', color: '#F59E0B', sub: 'QR-Code für Summary' };
      default: return { text: s.phase, color: '#475569' };
    }
  }

  return (
    <div style={page}>
      {/* ── Header ── */}
      <div style={header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => {
              const hasGame = s && s.phase !== 'LOBBY';
              if (hasGame && !window.confirm('Zurück zum Hauptmenü? Laufendes Spiel wird nicht gespeichert.')) return;
              window.location.href = '/menu';
            }}
            style={{
              padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)', color: '#cbd5e1', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 700, fontSize: 13,
            }}
            title="Zurück zum Hauptmenü"
          >⌂ Menü</button>
          <span style={badgeStyle('#3B82F6')}>CozyQuiz</span>
          <span style={{ fontWeight: 900, fontSize: 18 }}>Moderator</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: connected ? '#22C55E' : '#EF4444' }}>
            {connected ? '● Verbunden' : '○ Getrennt'}
          </span>
        </div>
      </div>

      {!joined && connected && (
        <div style={card}><div style={{ color: '#64748b', fontSize: 14 }}>Verbinde als Moderator…</div></div>
      )}

      {!connected && (
        <div style={{
          margin: '14px auto', maxWidth: 520,
          padding: '18px 22px', borderRadius: 14,
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.35)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          color: '#fecaca', fontSize: 14, fontWeight: 700, textAlign: 'center',
        }}>
          <div style={{ fontSize: 16, fontWeight: 900 }}>○ Verbindung zum Server weg</div>
          <div style={{ color: '#cbd5e1', fontWeight: 500 }}>
            Versuche automatisch neu zu verbinden… Dein Spielstand läuft serverseitig weiter.
          </div>
          <button
            onClick={() => reconnect()}
            style={{
              padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
              background: '#3B82F6', color: '#fff', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 800, fontSize: 14,
            }}
          >Jetzt neu verbinden</button>
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
              <div style={{
                background: `${status.color}15`, border: `2px solid ${status.color}44`,
                borderRadius: 16, padding: '14px 24px', marginBottom: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    fontSize: 22, fontWeight: 900, color: status.color,
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                  }}>{status.text}</div>
                  {status.sub && <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 700 }}>{status.sub}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Answer progress bar */}
                  {showProgress && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 120, height: 8, borderRadius: 4,
                        background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${(answeredCount / connectedTeams) * 100}%`,
                          height: '100%', borderRadius: 4,
                          background: answeredCount >= connectedTeams ? '#22C55E' : '#F59E0B',
                          transition: 'width 0.3s, background 0.3s',
                        }} />
                      </div>
                      <span style={{
                        fontSize: 13, fontWeight: 800,
                        color: answeredCount >= connectedTeams ? '#22C55E' : '#F59E0B',
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
                        🕵️ Imposter starten
                      </Btn>
                    ) : (
                      <>
                        <div style={{ fontSize: 13, color: '#fff', background: s.teams.find(t => t.id === s.imposterActiveTeamId)?.color ?? '#666', padding: '4px 10px', borderRadius: 8, textAlign: 'center' }}>
                          🕵️ {s.teams.find(t => t.id === s.imposterActiveTeamId)?.name ?? '?'} wählt
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          {((s.currentQuestion?.bunteTuete as any)?.statements?.length ?? 8) - s.imposterChosenIndices.length} Aussagen übrig
                          {s.imposterEliminated.length > 0 && (
                            <> · Raus: {s.imposterEliminated.map(id => s.teams.find(t => t.id === id)?.name).filter(Boolean).join(', ')}</>
                          )}
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
                          🥔 {s.teams.find(t => t.id === s.hotPotatoActiveTeamId)?.name ?? '?'}
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
                      </>
                    )}
                  </div>
                )}

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
                  // ── CHEESE: Lösung grün → Avatare cascaded ──
                  const isCheese = qRev?.category === 'CHEESE';
                  const cheeseStep = s.cheeseRevealStep ?? 0;
                  const cheeseInProgress = isCheese && cheeseStep < 2;
                  if (cheeseInProgress) {
                    const label = cheeseStep === 0 ? '✅ Lösung grün aufdecken' : '👥 Antworten einblenden';
                    const helper = cheeseStep === 0
                      ? 'Markiert die richtige Antwort grün'
                      : 'Team-Avatare erscheinen nacheinander';
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <PrimaryBtn color="#3B82F6" onClick={() => emit('qq:cheeseRevealStep', { roomCode })} hotkey="Space">
                          {label}
                        </PrimaryBtn>
                        <span style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>{helper}</span>
                      </div>
                    );
                  }
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
                    return (
                      <PrimaryBtn color="#22C55E" onClick={() => emit('qq:startPlacement', { roomCode })} hotkey="Space">
                        📍 Felder setzen
                      </PrimaryBtn>
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
                  const isGameOver = isEndOfPhase && s.gamePhaseIndex >= s.totalPhases;
                  const isBeforeFinal = isEndOfPhase && (s.gamePhaseIndex + 1) === s.totalPhases;
                  const label = isGameOver
                    ? '🏆 Spielende'
                    : isBeforeFinal
                      ? '⚡ Comeback-Phase'
                      : isEndOfPhase
                        ? `→ Runde ${s.gamePhaseIndex + 1}`
                        : '→ Nächste Frage';
                  return (
                    <PrimaryBtn color="#22C55E" onClick={() => emit('qq:nextQuestion', { roomCode })} hotkey="Space">
                      {label}
                    </PrimaryBtn>
                  );
                })()}

                {/* ── COMEBACK ── */}
                {s.phase === 'COMEBACK_CHOICE' && (
                  <ComebackControls state={s} roomCode={roomCode} emit={emit} />
                )}

                {/* ── GAME OVER ── */}
                {s.phase === 'GAME_OVER' && (
                  <>
                    <div style={{ fontSize: 15, color: '#94a3b8', fontWeight: 800 }}>🏆 Spiel beendet</div>
                    <PrimaryBtn color="#F59E0B" onClick={() => emit('qq:showThanks', { roomCode })} hotkey="Space">
                      ▶ Danke-Folie & QR
                    </PrimaryBtn>
                  </>
                )}

                {/* ── THANKS ── */}
                {s.phase === 'THANKS' && (
                  <div style={{ fontSize: 15, color: '#94a3b8', fontWeight: 800 }}>🙏 Danke-Folie läuft</div>
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
                <div style={sectionLabel}>⚡ Buzz-Reihenfolge</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {s.buzzQueue.map((b, i) => {
                    const team = teamList.find(t => t.id === b.teamId);
                    if (!team) return null;
                    return (
                      <div key={b.teamId} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 14px', borderRadius: 10,
                        background: i === 0 ? `${team.color}30` : 'rgba(255,255,255,0.04)',
                        border: `2px solid ${i === 0 ? team.color : 'rgba(255,255,255,0.1)'}`,
                      }}>
                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 800 }}>#{i + 1}</span>
                        <QQTeamAvatar avatarId={team.avatarId} size={30} />
                        <span style={{ fontWeight: 800, color: team.color, fontSize: 14 }}>{team.name}</span>
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
                    fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 999,
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
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6, color: '#e2e8f0' }}>
                  {s.currentQuestion.text}
                </div>
                {s.currentQuestion.textEn && (
                  <div style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>{s.currentQuestion.textEn}</div>
                )}
                {s.revealedAnswer && (
                  <div style={{
                    marginTop: 8, padding: '8px 12px', borderRadius: 8,
                    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                    color: '#4ade80', fontWeight: 800,
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
                  return (
                    <div key={t.id} style={{
                      padding: '10px 12px', borderRadius: 10,
                      border: `2px solid ${s.pendingFor === t.id ? t.color : s.correctTeamId === t.id ? `${t.color}88` : 'rgba(255,255,255,0.07)'}`,
                      background: s.correctTeamId === t.id ? `${t.color}18` : 'rgba(255,255,255,0.03)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#475569', fontWeight: 800, width: 16 }}>{i + 1}</span>
                        <QQTeamAvatar avatarId={t.avatarId} size={30} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 800, color: t.color }}>{t.name}</span>
                            <span style={{ fontSize: 11, color: t.connected ? '#22C55E' : '#EF4444' }}>
                              {t.connected ? '●' : '○'}
                            </span>
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
                        {/* Kick button */}
                        <button
                          onClick={() => emit('qq:kickTeam', { roomCode, teamId: t.id })}
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
                        cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 800,
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
                      fontWeight: 800, fontSize: 13,
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
                      fontWeight: 800, fontSize: 12,
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
                      fontWeight: 800, fontSize: 12,
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
                    fontWeight: 800, fontSize: 11,
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
                    background: 'rgba(0,0,0,0.25)', borderRadius: 10,
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
                  <span style={{ flex: 1, fontWeight: 800, color: t.color, fontSize: 13 }}>{t.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#94a3b8' }}>{t.largestConnected}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        </>
      )}
    </div>
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
      borderRadius: 10,
      padding: '10px 14px',
      marginBottom: 12,
      fontSize: 13,
      lineHeight: 1.5,
      color: '#e5e7eb',
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: '#FBBF24',
        marginBottom: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span>🎙️ Moderator-Tipp</span>
        <span style={{ opacity: 0.6, fontWeight: 600 }}>· {baseNote.title}</span>
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
          <span style={{ fontWeight: 800, fontStyle: 'normal', color: '#FBBF24' }}>Frage-Notiz: </span>
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
            fontWeight: 800,
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

function SchaetzRanking({ answers, teams, targetValue, correctTeamId, phase, roomCode, emit }: {
  answers: any[]; teams: any[]; targetValue: number; correctTeamId: string | null;
  phase: string; roomCode: string; emit: any;
}) {
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
        <div style={sectionLabel}>🍯 Schätzchen — Zielwert: <span style={{ color: '#F59E0B', fontWeight: 900 }}>{targetValue.toLocaleString('de-DE')}</span></div>
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
              padding: '8px 12px', borderRadius: 10,
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
                  {i === 0 ? '🥇' : `#${i + 1}`}
                </span>
                <QQTeamAvatar avatarId={r.team?.avatarId ?? 'fox'} size={26} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 800, color: r.team?.color ?? '#94a3b8' }}>{r.team?.name ?? r.teamId}</span>
                  <span style={{ marginLeft: 10, fontSize: 15, fontWeight: 900, color: '#e2e8f0' }}>
                    {r.parsed !== Infinity && !Number.isNaN(r.parsed) ? r.parsed.toLocaleString('de-DE') : r.text}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {r.distance !== Infinity ? (
                    <span style={{ fontSize: 12, color: isWinner ? '#4ade80' : '#64748b', fontWeight: 700 }}>
                      {r.distance === 0 ? '✓ Exakt' : `±${r.distance.toLocaleString('de-DE')}`}
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
  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'center',
      padding: '8px 12px', borderRadius: 10,
      background: `${team.color}18`, border: `1px solid ${team.color}44`,
    }}>
      <QQTeamAvatar avatarId={team.avatarId} size={26} />
      <span style={{ fontWeight: 800, color: team.color }}>{team.name}</span>
      <span style={{ fontSize: 12, color: '#94a3b8' }}>{actionLabel(s.pendingAction, s.teamPhaseStats[team.id])}</span>
      {s.pendingAction === 'FREE' && (
        <>
          <Btn small color="#3B82F6" onClick={() => emit('qq:chooseFreeAction', { roomCode, teamId: team.id, action: 'PLACE' })}>
            📍 Setzen
          </Btn>
          <Btn small color="#EF4444" onClick={() => emit('qq:chooseFreeAction', { roomCode, teamId: team.id, action: 'STEAL' })}>
            ⚡ Klauen
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
  const step = s.comebackIntroStep ?? 0;
  const targets: string[] = s.comebackStealTargets ?? [];
  const stealCount = targets.length === 1 ? 2 : targets.length;
  const labels = ['▶ Team zeigen', '▶ Aktion zeigen', `⚡ Klau starten (${stealCount} Feld${stealCount === 1 ? '' : 'er'})`];
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <QQTeamAvatar avatarId={team.avatarId} size={26} />
      <span style={{ fontWeight: 800, color: team.color }}>{team.name}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: '#8B5CF6' }}>
        📖 Schritt {step + 1}/3
      </span>
      <PrimaryBtn color="#8B5CF6" onClick={() => emit('qq:comebackIntroStep', { roomCode })} hotkey="Space">
        {labels[Math.min(step, 2)]}
      </PrimaryBtn>
    </div>
  );
}

function RulesControls({ state: s, roomCode, emit, onStartGame }: {
  state: QQStateUpdate; roomCode: string; emit: any; onStartGame: () => void;
}) {
  const totalSlides = 5;
  const idx = s.rulesSlideIndex ?? 0;
  const isWelcome = idx === -2;
  const isRulesIntro = idx === -1;
  const isFirst = idx <= -2;
  const isLast = idx >= totalSlides - 1;
  const label = isWelcome
    ? '🎬 Willkommen'
    : isRulesIntro
      ? '📣 Regel-Intro'
      : `📖 Folie ${idx + 1} / ${totalSlides}`;
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: '#8B5CF6' }}>
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
              {cell.jokerFormed ? '⭐' : (team ? <QQTeamAvatar avatarId={team.avatarId} size={Math.max(18, Math.floor(cellSize * 0.88))} /> : '')}
            </div>
          );
        })
      )}
    </div>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <div style={{
      padding: '4px 12px', borderRadius: 999,
      background: `${color}18`, border: `1px solid ${color}44`,
      color, fontSize: 12, fontWeight: 800,
    }}>
      {label}
    </div>
  );
}

function Btn({ children, color, onClick, outline = false, small = false }: {
  children: React.ReactNode; color: string; onClick: () => void;
  outline?: boolean; small?: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      padding: small ? '5px 12px' : '8px 18px',
      borderRadius: 8, border: `1px solid ${color}`,
      background: outline ? 'transparent' : `${color}22`,
      color, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800,
      fontSize: small ? 12 : 13,
      display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      {children}
    </button>
  );
}

/** Big primary action button — the "do the next thing" button */
function PrimaryBtn({ children, color, onClick, hotkey }: {
  children: React.ReactNode; color: string; onClick: () => void; hotkey?: string;
}) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 24px', borderRadius: 10,
      border: `2px solid ${color}`,
      background: `${color}30`,
      color, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900,
      fontSize: 15,
      display: 'inline-flex', alignItems: 'center', gap: 8,
      boxShadow: `0 0 16px ${color}22`,
    }}>
      {children}
      {hotkey && <span style={{ fontSize: 10, opacity: 0.5, fontWeight: 700 }}>{hotkey}</span>}
    </button>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function actionLabel(action: string, stats: any): string {
  if (action === 'PLACE_1') return '1 Feld setzen';
  if (action === 'PLACE_2') return `2 Felder (${stats?.placementsLeft ?? 2} übrig)`;
  if (action === 'STEAL_1') return '1 Feld klauen';
  if (action === 'FREE')    return 'Setzen oder Klauen';
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
    color: c, fontSize: 11, fontWeight: 800,
    textTransform: 'uppercase', letterSpacing: '0.06em',
  };
}

function badgeStyle(color: string): React.CSSProperties {
  return {
    padding: '4px 12px', borderRadius: 999,
    background: `${color}18`, border: `1px solid ${color}44`,
    color, fontSize: 11, fontWeight: 800,
    textTransform: 'uppercase', letterSpacing: '0.08em',
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
          color: '#EF4444', fontFamily: 'inherit', fontWeight: 800, fontSize: 12,
        }}
        title="Reset-Aktionen"
      >⋯ Reset</button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 20,
          background: '#1B1510', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 10, padding: 6, minWidth: 260,
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
  cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 800,
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
    letterSpacing: '0.02em',
  };

  const fieldLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 800, color: '#64748b',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em',
  };

  // Warm selector pill (Gold-Akzent statt blau)
  const pillBtn = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
    fontWeight: 800, fontSize: 13, fontFamily: 'inherit',
    background: active ? GOLD : 'rgba(255,255,255,0.05)',
    color: active ? '#1a1206' : '#94a3b8',
    boxShadow: active ? '0 3px 10px rgba(245,158,11,0.35)' : 'none',
    transition: 'all 0.15s',
  });

  const toggleBtn = (active: boolean, activeColor = '#22C55E'): React.CSSProperties => ({
    padding: '9px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
    fontWeight: 800, fontSize: 13, width: '100%', textAlign: 'left' as const,
    border: `1px solid ${active ? activeColor : 'rgba(255,255,255,0.09)'}`,
    background: active ? `${activeColor}1a` : 'rgba(255,255,255,0.03)',
    color: active ? activeColor : '#94a3b8',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 100 }}>

      {/* ── Hero ── */}
      <div style={{
        textAlign: 'center', padding: '16px 0 8px',
      }}>
        <div style={{ fontSize: 32, marginBottom: 4 }}>🐺</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.01em' }}>
          Quiz-Abend vorbereiten
        </div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
          Stell alles ein, bevor die Teams den QR scannen.
        </div>
      </div>

      {/* ── Fragensatz-Auswahl (Hero-Card) ── */}
      <div style={{
        ...sectionCard,
        background: `linear-gradient(180deg, ${GOLD_SOFT}, rgba(245,158,11,0.03))`,
        border: `1px solid ${GOLD_BORDER}`,
      }}>
        <div style={sectionTitle}>📚 Fragensatz</div>
        <select
          value={selectedDraftId}
          onChange={e => setSelectedDraftId(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(0,0,0,0.35)', color: '#f8fafc',
            fontFamily: 'inherit', fontSize: 16, fontWeight: 700,
            cursor: 'pointer', outline: 'none',
          }}
        >
          {drafts.length === 0 && <option value="">— keine Drafts —</option>}
          {drafts.map(d => (
            <option key={d.id} value={d.id}>
              {d.title} · {d.questionCount} Fragen
            </option>
          ))}
        </select>
        {selectedDraft && (
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
            Ausgewählt: <strong style={{ color: GOLD }}>{selectedDraft.title}</strong> · {selectedDraft.questionCount} Fragen
          </div>
        )}
      </div>

      {/* Teams-Lobby + QR + Dev-Fill wandern in die LobbyView (nach "Setup abschließen") */}

      {/* ── Zwei-Spalten-Grid: Spielregeln | Show-Feel ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>

        {/* Spielregeln */}
        <div style={sectionCard}>
          <div style={sectionTitle}>🎮 Spielregeln</div>

          <div style={{ marginBottom: 14 }}>
            <div style={fieldLabel}>Runden</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {([3, 4] as const).map(n => (
                <button key={n} onClick={() => setPhases(n)} style={pillBtn(phases === n)}>{n}</button>
              ))}
              {(() => {
                const d = drafts.find(x => x.id === selectedDraftId);
                if (!d) return null;
                const needed = phases * 5;
                if (d.questionCount === needed) {
                  return (
                    <span style={{ fontSize: 11, color: '#22C55E', fontWeight: 700, marginLeft: 4 }}>
                      ✓ {d.questionCount} Fragen passen
                    </span>
                  );
                }
                return (
                  <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 700, marginLeft: 4 }}>
                    ⚠ {d.questionCount}/{needed} Fragen — Set hat {d.questionCount === 20 ? '4' : d.questionCount === 15 ? '3' : '?'} Runden
                  </span>
                );
              })()}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={fieldLabel}>Timer-Default</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[15, 30, 45, 60, 90].map(t => (
                <button
                  key={t}
                  onClick={() => { setTimerInput(t); emit('qq:setTimer', { roomCode, durationSec: t }); }}
                  style={pillBtn(s.timerDurationSec === t)}
                >{t}s</button>
              ))}
            </div>
          </div>

          <div>
            <div style={fieldLabel}>Sprache</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['de', 'en', 'both'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => emit('qq:setLanguage', { roomCode, language: lang })}
                  style={{
                    ...pillBtn(s.language === lang),
                    fontSize: 22, padding: '6px 14px',
                  }}
                >{lang === 'de' ? '🇩🇪' : lang === 'en' ? '🇬🇧' : '🌐'}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Show-Feel */}
        <div style={sectionCard}>
          <div style={sectionTitle}>🎨 Show-Feel</div>

          <div>
            <div style={fieldLabel}>3D-Grid-Transition</div>
            <button
              onClick={() => emit('qq:setEnable3D', { roomCode, enabled: !s.enable3DTransition })}
              style={toggleBtn(s.enable3DTransition)}
            >
              {s.enable3DTransition ? '✓ 2D → 3D Fahrt beim Placement' : '○ Nur 2D Grid'}
            </button>
          </div>
        </div>

      </div>

      {/* ── Sound-Card (volle Breite) ── */}
      <div style={sectionCard}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div style={sectionTitle}>
            🔊 Sounds
            {selectedDraft && <span style={{ color: '#64748b', fontWeight: 600, fontSize: 11 }}>für {selectedDraft.title}</span>}
            {savingSound && <span style={{ fontSize: 10, color: GOLD, fontWeight: 700 }}>• speichert…</span>}
          </div>
          {qqDraftId && (
            <button
              onClick={applySoundsToAllDrafts}
              disabled={savingSound}
              style={{
                padding: '6px 12px', borderRadius: 8, cursor: savingSound ? 'wait' : 'pointer',
                border: `1px solid ${GOLD_BORDER}`, background: GOLD_SOFT,
                color: GOLD, fontSize: 11, fontWeight: 800, fontFamily: 'inherit',
              }}
              title="Diese Sounds auf alle Fragensätze übernehmen"
            >📋 Auf alle Fragensätze übernehmen</button>
          )}
        </div>

        {/* Master-Steuerung */}
        <div style={{
          display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
          padding: '10px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.2)',
          marginBottom: 14, border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <button
            onClick={() => emit('qq:setMusicMuted', { roomCode, muted: !s.musicMuted })}
            style={{
              padding: '7px 13px', borderRadius: 8, fontFamily: 'inherit', fontWeight: 800, fontSize: 12, cursor: 'pointer',
              border: `1px solid ${s.musicMuted ? '#EF4444' : '#22C55E'}`,
              background: s.musicMuted ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
              color: s.musicMuted ? '#EF4444' : '#22C55E',
            }}>{s.musicMuted ? '🔇 Musik' : '🎵 Musik'}</button>
          <button
            onClick={() => emit('qq:setSfxMuted', { roomCode, muted: !s.sfxMuted })}
            style={{
              padding: '7px 13px', borderRadius: 8, fontFamily: 'inherit', fontWeight: 800, fontSize: 12, cursor: 'pointer',
              border: `1px solid ${s.sfxMuted ? '#EF4444' : '#22C55E'}`,
              background: s.sfxMuted ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
              color: s.sfxMuted ? '#EF4444' : '#22C55E',
            }}>{s.sfxMuted ? '🔇 SFX' : '🔉 SFX'}</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 180 }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Lautstärke</span>
            <input
              type="range" min={0} max={100} step={5}
              value={Math.round((s.volume ?? 0.8) * 100)}
              onChange={e => emit('qq:setVolume', { roomCode, volume: Number(e.target.value) / 100 })}
              style={{ flex: 1, accentColor: GOLD }}
            />
            <span style={{ fontSize: 11, color: '#94a3b8', minWidth: 30, fontWeight: 700 }}>
              {Math.round((s.volume ?? 0.8) * 100)}%
            </span>
          </div>
        </div>

        <button
          onClick={() => setCustomSoundsOpen(v => !v)}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)', color: '#94a3b8',
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <span>🎵 Custom Sounds pro Slot (Timer-Loop, Korrekt, Falsch …)</span>
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
      </div>

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
              letterSpacing: '0.02em',
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
    borderRadius: 14, padding: 20, marginBottom: 14,
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: 13, fontWeight: 900, color: '#e2e8f0', marginBottom: 12,
    letterSpacing: '0.04em', textTransform: 'uppercase',
    display: 'flex', alignItems: 'center', gap: 8,
  };
  const fieldLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 800, color: '#94a3b8',
    letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6,
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
            padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 800,
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
            background: '#fff', padding: 14, borderRadius: 14,
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
                padding: '16px 12px', borderRadius: 10,
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
                      padding: '8px 10px', borderRadius: 10,
                      background: t.connected ? `${t.color}18` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${t.connected ? `${t.color}66` : 'rgba(255,255,255,0.08)'}`,
                      opacity: t.connected ? 1 : 0.55,
                    }}>
                      <QQTeamAvatar avatarId={t.avatarId} size={44} style={{ flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 900,
                          color: t.connected ? '#e2e8f0' : '#64748b',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{t.name}</div>
                        <div style={{
                          fontSize: 10, fontWeight: 700,
                          color: t.connected ? '#22C55E' : '#EF4444',
                        }}>
                          {t.connected ? '● bereit' : '○ offline'}
                        </div>
                      </div>
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
            {true && (
              <div style={{
                marginTop: 12, padding: '10px 12px', borderRadius: 8,
                background: 'rgba(245,158,11,0.08)',
                border: '1px dashed rgba(245,158,11,0.35)',
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: 10, color: '#F59E0B', fontWeight: 900, letterSpacing: '0.08em' }}>
                  🧪 TEST
                </span>
                <button
                  onClick={async () => {
                    const r = await fetch(`/api/qq/${encodeURIComponent(roomCode)}/dev/fillTeams`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ count: 8 }),
                    });
                    if (!r.ok) {
                      const d = await r.json().catch(() => ({}));
                      alert(`Fehler: ${d.error ?? r.statusText}`);
                    }
                  }}
                  style={{
                    padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                    border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.15)',
                    color: '#F59E0B', fontFamily: 'inherit', fontWeight: 800, fontSize: 12,
                  }}
                >+ 8 Dummy-Teams joinen</button>
              </div>
            )}
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
            letterSpacing: '0.02em', cursor: 'pointer', color: '#fff',
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
      padding: '8px 14px', borderRadius: 10,
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
      display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
    }}>
      <span style={{ color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10 }}>
        {label}
      </span>
      <span style={{ color: '#e2e8f0', fontWeight: 900 }}>{value}</span>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const page: React.CSSProperties = {
  minHeight: '100vh', background: '#0D0A06', color: '#e2e8f0',
  fontFamily: "'Nunito', system-ui, sans-serif", padding: 20,
};

const header: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18,
};

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 14, padding: 16,
};

const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, color: '#475569',
  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10,
};

const selectStyle: React.CSSProperties = {
  padding: '7px 12px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.15)',
  background: '#1a1a2e', color: '#e2e8f0',
  fontFamily: 'inherit', fontSize: 13,
};

const inputStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.06)', color: '#e2e8f0',
  fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
};
