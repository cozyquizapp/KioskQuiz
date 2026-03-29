import React, { useEffect, useState } from 'react';
import { fetchLeaderboard, fetchQuestionStat } from '../api';

type RunEntry = { quizId: string; date: string; winners: string[]; scores?: Record<string, number> };
type AllTimeTeamStat = { teamName: string; wins: number; games: number; totalScore: number; avgScore: number | null };
type QQResult = {
  id: string; draftTitle: string; roomCode: string; playedAt: number;
  winner: string | null; phases: number; language: string;
  teams: Array<{ id: string; name: string; color: string; score: number }>;
};

const card: React.CSSProperties = {
  background: 'rgba(15,23,42,0.6)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 18,
  padding: 16,
  boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
  backdropFilter: 'blur(16px)',
};
const inputStyle: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(15,23,42,0.6)', color: '#f8fafc',
  width: '100%', backdropFilter: 'blur(10px)',
};

const StatsPage: React.FC = () => {
  const [tab, setTab] = useState<'cozy' | 'qq'>('cozy');

  // CozyQuiz state
  const [runs, setRuns] = useState<RunEntry[]>([]);
  const [allTime, setAllTime] = useState<{ topTeams: AllTimeTeamStat[]; funnyAnswers: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [questionId, setQuestionId] = useState('');
  const [questionStat, setQuestionStat] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // QQ state
  const [qqResults, setQqResults] = useState<QQResult[]>([]);
  const [qqLoading, setQqLoading] = useState(false);
  const [qqError, setQqError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchLeaderboard()
      .then(res => { setRuns(res.runs || []); setAllTime(res.allTime || null); })
      .catch(() => setError('Leaderboard konnte nicht geladen werden'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== 'qq' || qqResults.length > 0) return;
    setQqLoading(true);
    fetch('/api/qq/results')
      .then(r => r.json())
      .then(data => setQqResults(Array.isArray(data) ? data : []))
      .catch(() => setQqError('QQ Ergebnisse konnten nicht geladen werden'))
      .finally(() => setQqLoading(false));
  }, [tab]);

  const loadQuestionStat = async () => {
    if (!questionId.trim()) return;
    try {
      const res = await fetchQuestionStat(questionId.trim());
      setQuestionStat(res.stat ?? null);
      setError(null);
    } catch { setError('Stat konnte nicht geladen werden'); }
  };

  const tabBtn = (t: 'cozy' | 'qq', label: string) => (
    <button onClick={() => setTab(t)} style={{
      padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
      fontFamily: 'inherit', fontWeight: 800, fontSize: 13,
      background: tab === t ? (t === 'qq' ? '#3B82F6' : '#6366F1') : 'rgba(255,255,255,0.06)',
      color: tab === t ? '#fff' : '#64748b',
    }}>{label}</button>
  );

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: '#f8fafc', padding: 20, fontFamily: 'var(--font)' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: 16 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#cbd5e1' }}>
            Stats & Leaderboard
          </div>
          <h1 style={{ margin: '6px 0 4px' }}>Quiz Auswertung</h1>
        </div>

        {/* Tab Switch */}
        <div style={{ display: 'flex', gap: 8 }}>
          {tabBtn('cozy', '🐺 CozyQuiz 60')}
          {tabBtn('qq', '🗺️ Quarter Quiz')}
        </div>

        {/* ── CozyQuiz Tab ── */}
        {tab === 'cozy' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 12, alignItems: 'start' }}>
              <div style={card}>
                <div style={{ fontWeight: 800, marginBottom: 10 }}>🏆 AllTime Top Teams</div>
                {loading && <div style={{ color: '#cbd5e1' }}>Lädt …</div>}
                {!loading && !allTime?.topTeams?.length && <div style={{ color: '#94a3b8' }}>Keine AllTime-Daten.</div>}
                {!loading && allTime?.topTeams?.map((team, idx) => (
                  <div key={idx} style={{ padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>#{idx + 1} {team.teamName}</div>
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>{team.wins} Siege · {team.games} Spiele{team.avgScore !== null ? ` · Ø ${team.avgScore} Pkt` : ''}</div>
                    </div>
                    <div style={{ fontWeight: 800, color: '#c7f9cc', fontSize: 18 }}>{team.wins}</div>
                  </div>
                ))}
              </div>
              <div style={card}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>😂 AllTime Funny Answers</div>
                {loading && <div style={{ color: '#cbd5e1', fontSize: 13 }}>Lädt …</div>}
                {!loading && !allTime?.funnyAnswers?.length && <div style={{ color: '#94a3b8', fontSize: 13 }}>Keine Einträge.</div>}
                {!loading && allTime?.funnyAnswers?.slice(0, 5).map((entry, idx) => (
                  <div key={idx} style={{ padding: 8, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', marginBottom: 6, fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: '#fbbf24' }}>{entry.teamName}</div>
                    <div style={{ color: '#cbd5e1', marginTop: 2 }}>"{entry.answer}"</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 12, alignItems: 'start' }}>
              <div style={card}>
                <div style={{ fontWeight: 800, marginBottom: 10 }}>Letzte Läufe</div>
                {loading && <div style={{ color: '#cbd5e1' }}>Lädt …</div>}
                {!loading && runs.length === 0 && <div style={{ color: '#94a3b8' }}>Keine Einträge.</div>}
                {!loading && runs.map((run, idx) => (
                  <div key={idx} style={{ padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>{run.quizId}</div>
                        <div style={{ color: '#94a3b8', fontSize: 12 }}>{new Date(run.date).toLocaleString()}</div>
                      </div>
                      {run.winners && run.winners.length > 0 && (
                        <div style={{ color: '#c7f9cc', fontWeight: 800 }}>{run.winners.join(', ')}</div>
                      )}
                    </div>
                    {run.scores && (
                      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, color: '#cbd5e1', fontSize: 13 }}>
                        {Object.entries(run.scores).map(([team, score]) => (
                          <div key={team} style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)' }}>{team}: {score}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={card}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Frage-Statistik</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input style={inputStyle} value={questionId} onChange={e => setQuestionId(e.target.value)} placeholder="Fragen-ID" />
                  <button style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.16)', background: 'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(56,189,248,0.35))', color: '#f8fafc', backdropFilter: 'blur(10px)', cursor: 'pointer' }} onClick={loadQuestionStat}>Laden</button>
                </div>
                {error && <div style={{ color: '#fca5a5', marginBottom: 6 }}>{error}</div>}
                {questionStat && (
                  <div style={{ padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
                    <div style={{ fontWeight: 800 }}>Frage: {questionStat.questionId}</div>
                    <div style={{ color: '#cbd5e1', marginTop: 4, fontSize: 13 }}>Total: {questionStat.total ?? 0} · Korrekt: {questionStat.correct ?? 0}</div>
                    {questionStat.breakdown && (
                      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {Object.entries(questionStat.breakdown).map(([key, val]) => (
                          <div key={key} style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.18)', color: '#e2e8f0', fontSize: 13 }}>{key}: {String(val)}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {!questionStat && !error && <div style={{ color: '#94a3b8', fontSize: 13 }}>Bitte Frage-ID eingeben und laden.</div>}
              </div>
            </div>
          </>
        )}

        {/* ── Quarter Quiz Tab ── */}
        {tab === 'qq' && (
          <>
            {qqLoading && <div style={{ color: '#94a3b8', padding: 20 }}>Lädt …</div>}
            {qqError && <div style={{ color: '#fca5a5', padding: 12 }}>{qqError}</div>}
            {!qqLoading && !qqError && qqResults.length === 0 && (
              <div style={{ ...card, color: '#64748b', textAlign: 'center', padding: 32 }}>
                Noch keine Quarter Quiz Spiele gespeichert.<br />
                <span style={{ fontSize: 12, marginTop: 6, display: 'block' }}>Ergebnisse werden automatisch nach dem Spielende gespeichert.</span>
              </div>
            )}

            {/* QQ Summary row */}
            {!qqLoading && qqResults.length > 0 && (() => {
              const winCounts: Record<string, number> = {};
              qqResults.forEach(r => { if (r.winner) winCounts[r.winner] = (winCounts[r.winner] ?? 0) + 1; });
              const topWinners = Object.entries(winCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={card}>
                    <div style={{ fontWeight: 800, marginBottom: 10 }}>🏆 QQ Top Gewinner</div>
                    {topWinners.map(([name, wins], i) => (
                      <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700 }}>#{i + 1} {name}</span>
                        <span style={{ color: '#F59E0B', fontWeight: 800 }}>{wins}× 🏆</span>
                      </div>
                    ))}
                  </div>
                  <div style={card}>
                    <div style={{ fontWeight: 800, marginBottom: 10 }}>📊 Überblick</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#3B82F6' }}>{qqResults.length}</div>
                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Spiele gespielt</div>
                      </div>
                      <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#F59E0B' }}>{Object.keys(winCounts).length}</div>
                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>verschiedene Sieger</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* QQ Results list */}
            {!qqLoading && qqResults.length > 0 && (
              <div style={card}>
                <div style={{ fontWeight: 800, marginBottom: 12 }}>Alle Spiele</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {qqResults.map(r => {
                    const sorted = [...(r.teams ?? [])].sort((a, b) => b.score - a.score);
                    return (
                      <div key={r.id} style={{ padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 14 }}>{r.draftTitle}</div>
                            <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                              {new Date(r.playedAt).toLocaleString('de-DE')} · Raum {r.roomCode} · {r.phases} Runden · {r.language}
                            </div>
                          </div>
                          {r.winner && (
                            <div style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 800, color: '#F59E0B', whiteSpace: 'nowrap' }}>
                              🏆 {r.winner}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {sorted.map((t, i) => (
                            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: `1px solid ${t.color}44` }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                              <span style={{ fontSize: 12, fontWeight: i === 0 ? 800 : 600, color: i === 0 ? '#e2e8f0' : '#94a3b8' }}>{t.name}</span>
                              <span style={{ fontSize: 12, fontWeight: 800, color: t.color }}>{t.score}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default StatsPage;
