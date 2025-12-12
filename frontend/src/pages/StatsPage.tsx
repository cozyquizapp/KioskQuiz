import React, { useEffect, useState } from 'react';
import { fetchLeaderboard, fetchQuestionStat } from '../api';

type RunEntry = { quizId: string; date: string; winners: string[]; scores?: Record<string, number> };

const card: React.CSSProperties = {
  background: 'rgba(16,20,31,0.82)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 18,
  padding: 16,
  boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
};

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.15)',
  background: '#0f141d',
  color: '#f8fafc',
  width: '100%'
};

const StatsPage: React.FC = () => {
  const [runs, setRuns] = useState<RunEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [questionId, setQuestionId] = useState('');
  const [questionStat, setQuestionStat] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchLeaderboard()
      .then((res) => setRuns(res.runs || []))
      .catch(() => setError('Leaderboard konnte nicht geladen werden'))
      .finally(() => setLoading(false));
  }, []);

  const loadQuestionStat = async () => {
    if (!questionId.trim()) return;
    try {
      const res = await fetchQuestionStat(questionId.trim());
      setQuestionStat(res.stat ?? null);
      setError(null);
    } catch {
      setError('Stat konnte nicht geladen werden');
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 20% 20%, rgba(111,142,255,0.16), transparent 40%), radial-gradient(circle at 80% 10%, rgba(248,180,0,0.12), transparent 42%), #0c111a',
        color: '#f8fafc',
        padding: 20
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: 16 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#cbd5e1' }}>
            Stats & Leaderboard
          </div>
          <h1 style={{ margin: '6px 0 4px' }}>Quiz Auswertung</h1>
          <p style={{ margin: 0, color: '#94a3b8' }}>Letzte Läufe und Antwortverteilungen pro Frage.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 12, alignItems: 'start' }}>
          <div style={card}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Letzte Läufe</div>
            {loading && <div style={{ color: '#cbd5e1' }}>Lädt ...</div>}
            {!loading && runs.length === 0 && <div style={{ color: '#94a3b8' }}>Keine Einträge.</div>}
            {!loading &&
              runs.map((run, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)',
                    marginBottom: 8
                  }}
                >
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
                        <div
                          key={team}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.12)',
                            background: 'rgba(255,255,255,0.05)'
                          }}
                        >
                          {team}: {score}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>

          <div style={card}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Frage-Statistik</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                style={inputStyle}
                value={questionId}
                onChange={(e) => setQuestionId(e.target.value)}
                placeholder="Fragen-ID"
              />
              <button
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.16)',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#f8fafc',
                  cursor: 'pointer'
                }}
                onClick={loadQuestionStat}
              >
                Laden
              </button>
            </div>
            {error && <div style={{ color: '#fca5a5', marginBottom: 6 }}>{error}</div>}
            {questionStat && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)'
                }}
              >
                <div style={{ fontWeight: 800 }}>Frage: {questionStat.questionId}</div>
                <div style={{ color: '#cbd5e1', marginTop: 4, fontSize: 13 }}>
                  Total: {questionStat.total ?? 0} · Korrekt: {questionStat.correct ?? 0}
                </div>
                {questionStat.breakdown && (
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {Object.entries(questionStat.breakdown).map(([key, val]) => (
                      <div
                        key={key}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 10,
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: 'rgba(0,0,0,0.18)',
                          color: '#e2e8f0',
                          fontSize: 13
                        }}
                      >
                        {key}: {val}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {!questionStat && !error && <div style={{ color: '#94a3b8', fontSize: 13 }}>Bitte Frage-ID eingeben und laden.</div>}
          </div>
        </div>
      </div>
    </main>
  );
};

export default StatsPage;
