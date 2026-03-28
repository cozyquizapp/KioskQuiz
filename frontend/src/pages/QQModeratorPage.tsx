import { useState, useEffect, useCallback, useRef } from 'react';
import { useQQSocket } from '../hooks/useQQSocket';
import {
  QQQuestion, QQLanguage, QQ_CATEGORY_LABELS, QQ_CATEGORY_COLORS,
  qqGetAvatar, QQStateUpdate,
} from '../../../shared/quarterQuizTypes';

const QQ_ROOM = 'default';

interface DraftSummary {
  id: string;
  title: string;
  date: string | null;
  updatedAt: number;
  questionCount: number;
}

export default function QQModeratorPage() {
  const roomCode = QQ_ROOM;
  const [language, setLanguage] = useState<QQLanguage>('both');
  const [phases, setPhases] = useState<3 | 4>(3);
  const [joined, setJoined]     = useState(false);
  const [timerInput, setTimerInput] = useState(30);
  const [drafts, setDrafts]         = useState<DraftSummary[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string>('__default__');
  const { state, connected, emit } = useQQSocket(roomCode);

  // Auto-join
  useEffect(() => {
    if (!connected || joined) return;
    emit('qq:joinModerator', { roomCode }).then(ack => {
      if (ack.ok) setJoined(true);
    });
  }, [connected]);

  // Sync timer input from state
  useEffect(() => {
    if (state) setTimerInput(state.timerDurationSec);
  }, [state?.timerDurationSec]);

  // Load available drafts once (Cozy60 + QQ Builder)
  useEffect(() => {
    Promise.all([
      fetch('/api/studio/cozy60').then(r => r.json()).catch(() => ({ drafts: [] })),
      fetch('/api/qq/drafts').then(r => r.json()).catch(() => []),
    ]).then(([cozyData, qqDrafts]) => {
      const cozy: DraftSummary[] = Array.isArray(cozyData.drafts)
        ? cozyData.drafts.map((d: any) => ({ ...d, id: d.id, source: 'cozy' }))
        : [];
      const qq: DraftSummary[] = Array.isArray(qqDrafts)
        ? qqDrafts.map((d: any) => ({
            id: `qq:${d.id}`,
            title: `🎯 ${d.title}`,
            date: null,
            updatedAt: d.updatedAt ?? 0,
            questionCount: d.questions?.length ?? 0,
          }))
        : [];
      setDrafts([...qq, ...cozy].sort((a, b) => b.updatedAt - a.updatedAt));
    });
  }, []);

  async function startGame() {
    let questions: QQQuestion[];
    if (selectedDraftId === '__default__') {
      const res = await fetch('/api/qq/questions/default');
      if (!res.ok) { alert('Standard-Fragen konnten nicht geladen werden'); return; }
      questions = await res.json();
    } else if (selectedDraftId.startsWith('qq:')) {
      // QQ Builder draft — questions already in QQ format
      const qqId = selectedDraftId.slice(3);
      const res = await fetch(`/api/qq/drafts/${encodeURIComponent(qqId)}`);
      if (!res.ok) { alert('QQ-Draft nicht gefunden'); return; }
      const draft = await res.json();
      questions = draft.questions ?? [];
      if (questions.length === 0) { alert('Draft hat keine Fragen'); return; }
    } else {
      const res = await fetch(`/api/qq/questions/from-draft/${encodeURIComponent(selectedDraftId)}?phases=${phases}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        alert(`Fehler: ${err.error}`);
        return;
      }
      questions = await res.json();
    }
    await emit('qq:startGame', { roomCode, questions, language, phases });
  }

  function applyTimer() {
    emit('qq:setTimer', { roomCode, durationSec: timerInput });
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  const emitRef = useRef(emit);
  emitRef.current = emit;
  const stateRef = useRef(state);
  stateRef.current = state;

  const handleKey = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target?.tagName && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const s = stateRef.current;
    if (!s) return;

    // Space — smart next step (mirrors CozyQuiz Space behavior)
    if (e.code === 'Space') {
      e.preventDefault();
      if (s.phase === 'LOBBY')                                           startGame();
      else if (s.phase === 'PHASE_INTRO')                                emitRef.current('qq:activateQuestion', { roomCode });
      else if (s.phase === 'QUESTION_ACTIVE')                            emitRef.current('qq:revealAnswer', { roomCode });
      else if (s.phase === 'QUESTION_REVEAL' && s.correctTeamId && !s.pendingFor) emitRef.current('qq:nextQuestion', { roomCode });
      return;
    }

    // R — Reveal answer (mirrors CozyQuiz R)
    if (e.code === 'KeyR') {
      e.preventDefault();
      if (s.phase === 'QUESTION_ACTIVE') emitRef.current('qq:revealAnswer', { roomCode });
      return;
    }

    // N — Next question (mirrors CozyQuiz N)
    if (e.code === 'KeyN') {
      e.preventDefault();
      if (s.phase === 'QUESTION_REVEAL' && s.correctTeamId && !s.pendingFor)
        emitRef.current('qq:nextQuestion', { roomCode });
      return;
    }

    // ArrowRight — Next question (extra StreamDeck option)
    if (e.code === 'ArrowRight') {
      e.preventDefault();
      if (s.phase === 'QUESTION_REVEAL' && s.correctTeamId && !s.pendingFor)
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
      if (s.phase === 'LOBBY')                                                    startGame();
      else if (s.phase === 'PHASE_INTRO')                                         emitRef.current('qq:activateQuestion', { roomCode });
      else if (s.phase === 'QUESTION_ACTIVE')                                     emitRef.current('qq:revealAnswer', { roomCode });
      else if (s.phase === 'QUESTION_REVEAL' && s.correctTeamId && !s.pendingFor) emitRef.current('qq:nextQuestion', { roomCode });
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

    // F17 — Nächste Frage (= N)
    if (e.code === 'F17') {
      e.preventDefault();
      if (s.phase === 'QUESTION_REVEAL' && s.correctTeamId && !s.pendingFor)
        emitRef.current('qq:nextQuestion', { roomCode });
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

  return (
    <div style={page}>
      {/* ── Header ── */}
      <div style={header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={badgeStyle('#3B82F6')}>Quartier Quiz</span>
          <span style={{ fontWeight: 900, fontSize: 18 }}>Moderator</span>
          {s?.phase && <span style={phasePillStyle(s.phase)}>{s.phase}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            Raum: <b style={{ color: '#94a3b8' }}>{roomCode}</b>
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
            F13/Space · F15/R · F17/N · F14/1–5 · F16/Esc
          </span>
          <span style={{ fontSize: 13, fontWeight: 800, color: connected ? '#22C55E' : '#EF4444' }}>
            {connected ? '● Verbunden' : '○ Getrennt'}
          </span>
        </div>
      </div>

      {!joined && connected && (
        <div style={card}><div style={{ color: '#64748b', fontSize: 14 }}>Verbinde als Moderator…</div></div>
      )}

      {joined && s && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 14 }}>

          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Status + timer */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Pill label={`Phase ${s.gamePhaseIndex}/${s.totalPhases}`} color="#3B82F6" />
              <Pill label={`Frage ${(s.questionIndex % 5) + 1}/5`} color="#6366f1" />
              <Pill label={`Global ${s.questionIndex + 1}/${s.totalPhases * 5}`} color="#475569" />
              {s.pendingFor && (
                <Pill label={`⏳ ${teamList.find(t => t.id === s.pendingFor)?.name ?? s.pendingFor}`} color="#F59E0B" />
              )}
              {s.timerEndsAt && <TimerPill endsAt={s.timerEndsAt} />}
            </div>

            {/* Main action controls */}
            <div style={card}>
              <div style={sectionLabel}>Spielsteuerung</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>

                {s.phase === 'LOBBY' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Runden:</span>
                      {([3, 4] as const).map(n => (
                        <button key={n} onClick={() => setPhases(n)} style={{
                          padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                          fontWeight: 800, fontSize: 12,
                          background: phases === n ? '#3B82F6' : 'rgba(255,255,255,0.05)',
                          color: phases === n ? '#fff' : '#64748b',
                        }}>{n}</button>
                      ))}
                    </div>
                    <select value={language} onChange={e => setLanguage(e.target.value as QQLanguage)} style={selectStyle}>
                      <option value="both">DE + EN</option>
                      <option value="de">Deutsch</option>
                      <option value="en">English</option>
                    </select>
                    <select
                      value={selectedDraftId}
                      onChange={e => setSelectedDraftId(e.target.value)}
                      style={selectStyle}
                    >
                      <option value="__default__">📋 Standard-Testfragen</option>
                      {drafts.map(d => (
                        <option key={d.id} value={d.id}>
                          📄 {d.title}{d.date ? ` (${d.date})` : ''}
                        </option>
                      ))}
                    </select>
                    <Btn color="#22C55E" onClick={startGame}>▶ Spiel starten</Btn>
                  </>
                )}

                {s.phase === 'PHASE_INTRO' && (
                  <Btn color="#22C55E" onClick={() => emit('qq:activateQuestion', { roomCode })}>
                    ▶ Frage aktivieren
                  </Btn>
                )}

                {s.phase === 'QUESTION_ACTIVE' && (
                  <Btn color="#F59E0B" onClick={() => emit('qq:revealAnswer', { roomCode })}>
                    Antwort aufdecken
                  </Btn>
                )}

                {/* Hot Potato controls (Bunte Tüte) */}
                {s.phase === 'QUESTION_ACTIVE' && s.currentQuestion?.category === 'BUNTE_TUETE' && (
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
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Btn color="#22C55E" onClick={() => emit('qq:hotPotatoCorrect', { roomCode })}>
                            ✓ Richtig
                          </Btn>
                          <Btn color="#EF4444" onClick={() => emit('qq:hotPotatoWrong', { roomCode })}>
                            ✗ Falsch / Zu langsam
                          </Btn>
                        </div>
                        {s.hotPotatoEliminated.length > 0 && (
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>
                            Raus: {s.hotPotatoEliminated.map(id => s.teams.find(t => t.id === id)?.name).filter(Boolean).join(', ')}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {s.phase === 'QUESTION_REVEAL' && !s.correctTeamId && (
                  <span style={{ fontSize: 12, color: '#475569' }}>↓ Antwort bestätigen in Team-Liste</span>
                )}

                {s.phase === 'PLACEMENT' && s.pendingAction && (
                  <PlacementControls state={s} roomCode={roomCode} emit={emit} />
                )}

                {s.phase === 'QUESTION_REVEAL' && s.correctTeamId && !s.pendingFor && (
                  <Btn color="#22C55E" onClick={() => emit('qq:nextQuestion', { roomCode })}>
                    → Nächste Frage
                  </Btn>
                )}

                {s.phase === 'COMEBACK_CHOICE' && (
                  <ComebackControls state={s} roomCode={roomCode} emit={emit} />
                )}

                {s.phase === 'GAME_OVER' && (
                  <div style={{ fontSize: 14, color: '#64748b' }}>🏆 Spiel beendet</div>
                )}

                <Btn color="#EF4444" outline onClick={() => emit('qq:resetRoom', { roomCode })}>
                  ↺ Reset
                </Btn>
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
                        <span style={{ fontSize: 20 }}>{qqGetAvatar(team.avatarId).emoji}</span>
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

            {/* Team join info */}
            {s.phase === 'LOBBY' && (
              <div style={card}>
                <div style={sectionLabel}>Teams einladen</div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${window.location.origin}/quarterquiz-team?room=${roomCode}`)}&bgcolor=1B1510&color=e2e8f0&margin=4`}
                    alt="QR Code"
                    style={{ borderRadius: 8, width: 90, height: 90 }}
                  />
                  <div>
                    <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>Team-URL:</div>
                    <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#e2e8f0', background: 'rgba(255,255,255,0.06)', padding: '4px 8px', borderRadius: 6, marginBottom: 8 }}>
                      /quarterquiz-team?room={roomCode}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569' }}>
                      Teams öffnen diese URL auf ihrem Handy.<br />
                      Beamer: <span style={{ fontFamily: 'monospace' }}>/quarterquiz-beamer?room={roomCode}</span>
                    </div>
                  </div>
                </div>
              </div>
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
                  return (
                    <div key={t.id} style={{
                      padding: '10px 12px', borderRadius: 10,
                      border: `2px solid ${s.pendingFor === t.id ? t.color : s.correctTeamId === t.id ? `${t.color}88` : 'rgba(255,255,255,0.07)'}`,
                      background: s.correctTeamId === t.id ? `${t.color}18` : 'rgba(255,255,255,0.03)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#475569', fontWeight: 800, width: 16 }}>{i + 1}</span>
                        <span style={{ fontSize: 20 }}>{qqGetAvatar(t.avatarId).emoji}</span>
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
                      {/* Live answer */}
                      {isActive && answer && (
                        <div style={{
                          marginTop: 8, padding: '6px 10px', borderRadius: 8,
                          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                          fontSize: 14, fontWeight: 700, color: '#e2e8f0',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                        }}>
                          <span>„{answer.text}"</span>
                          {s.phase === 'QUESTION_REVEAL' && !s.correctTeamId && (
                            <Btn small color={t.color} onClick={() => emit('qq:markCorrect', { roomCode, teamId: t.id })}>
                              ✓ Richtig
                            </Btn>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Niemand-Button wenn alle geantwortet haben */}
              {s.phase === 'QUESTION_REVEAL' && !s.correctTeamId && (
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

            {/* Settings */}
            <div style={card}>
              <div style={sectionLabel}>Einstellungen</div>

              {/* Timer */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>⏱ Timer (Sekunden)</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number" min={5} max={120}
                    value={timerInput}
                    onChange={e => setTimerInput(Number(e.target.value))}
                    style={{ ...inputStyle, width: 70 }}
                  />
                  <Btn small color="#3B82F6" onClick={applyTimer}>Setzen</Btn>
                  {[15, 20, 30, 45, 60].map(t => (
                    <button key={t} onClick={() => { setTimerInput(t); emit('qq:setTimer', { roomCode, durationSec: t }); }}
                      style={{
                        padding: '4px 8px', borderRadius: 6, border: `1px solid ${s.timerDurationSec === t ? '#3B82F6' : 'rgba(255,255,255,0.1)'}`,
                        background: s.timerDurationSec === t ? 'rgba(59,130,246,0.2)' : 'transparent',
                        color: s.timerDurationSec === t ? '#3B82F6' : '#64748b',
                        cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                      }}>{t}s</button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>🌐 Sprache</div>
                <select value={s.language}
                  onChange={e => emit('qq:setLanguage', { roomCode, language: e.target.value as QQLanguage })}
                  style={selectStyle}>
                  <option value="both">DE + EN</option>
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                </select>
              </div>

              {/* Avatars */}
              <div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>🐾 Avatar-Auswahl</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    onClick={() => emit('qq:setAvatars', { roomCode, enabled: !s.avatarsEnabled })}
                    style={{
                      padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                      fontWeight: 800, fontSize: 13,
                      border: `1px solid ${s.avatarsEnabled ? '#22C55E' : 'rgba(255,255,255,0.1)'}`,
                      background: s.avatarsEnabled ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                      color: s.avatarsEnabled ? '#22C55E' : '#64748b',
                    }}>
                    {s.avatarsEnabled ? '✓ Avatare aktiviert' : '○ Avatare deaktiviert'}
                  </button>
                  <span style={{ fontSize: 11, color: '#475569' }}>
                    {s.avatarsEnabled ? 'Teams wählen selbst' : 'Zufällig zugewiesen'}
                  </span>
                </div>
              </div>
            </div>

            {/* Grid */}
            {s.grid && (
              <div style={card}>
                <div style={sectionLabel}>Grid {s.gridSize}×{s.gridSize}</div>
                <MiniGrid state={s} />
              </div>
            )}

            {/* Rangliste */}
            <div style={card}>
              <div style={sectionLabel}>Rangliste</div>
              {[...teamList].sort((a, b) => b.largestConnected - a.largestConnected).map((t, i) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#475569', width: 16 }}>#{i + 1}</span>
                  <span>{qqGetAvatar(t.avatarId).emoji}</span>
                  <span style={{ flex: 1, fontWeight: 800, color: t.color, fontSize: 13 }}>{t.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#94a3b8' }}>{t.largestConnected}</span>
                </div>
              ))}
            </div>
          </div>
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

function PlacementControls({ state: s, roomCode, emit }: any) {
  const team = s.teams.find((t: any) => t.id === s.pendingFor);
  if (!team) return null;
  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'center',
      padding: '8px 12px', borderRadius: 10,
      background: `${team.color}18`, border: `1px solid ${team.color}44`,
    }}>
      <span style={{ fontSize: 18 }}>{qqGetAvatar(team.avatarId).emoji}</span>
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
      {s.gamePhaseIndex >= 2 && s.pendingAction === 'STEAL_1' && (
        <Btn small color="#3B82F6" onClick={() => emit('qq:chooseFreeAction', { roomCode, teamId: team.id, action: 'PLACE' })}>
          → Setzen
        </Btn>
      )}
    </div>
  );
}

function ComebackControls({ state: s, roomCode, emit }: any) {
  const team = s.teams.find((t: any) => t.id === s.comebackTeamId);
  if (!team || s.comebackAction) return null;
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 18 }}>{qqGetAvatar(team.avatarId).emoji}</span>
      <span style={{ fontWeight: 800, color: team.color }}>{team.name} — Comeback:</span>
      <Btn small color="#22C55E" onClick={() => emit('qq:comebackChoice', { roomCode, teamId: team.id, action: 'PLACE_2' })}>📍 2 Felder</Btn>
      <Btn small color="#EF4444" onClick={() => emit('qq:comebackChoice', { roomCode, teamId: team.id, action: 'STEAL_1' })}>⚡ Klauen</Btn>
      <Btn small color="#8B5CF6" onClick={() => emit('qq:comebackChoice', { roomCode, teamId: team.id, action: 'SWAP_2' })}>🔄 Tauschen</Btn>
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
              {cell.jokerFormed ? '⭐' : (team ? qqGetAvatar(team.avatarId).emoji : '')}
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
    LOBBY: '#475569', PHASE_INTRO: '#3B82F6', QUESTION_ACTIVE: '#22C55E',
    QUESTION_REVEAL: '#F59E0B', PLACEMENT: '#EF4444',
    COMEBACK_CHOICE: '#8B5CF6', GAME_OVER: '#64748b',
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
