import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QQ_COLORS } from '../../../shared/qqColors';

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

const StatsPage: React.FC = () => {
  // 2026-07-08 (Wolf): toter Cozy-60-Tab entfernt — nur noch die lebenden
  // CozyQuiz-Spiele (= zugleich die Recap-Übersicht, klick → /recap/:id).
  const [qqResults, setQqResults] = useState<QQResult[]>([]);
  const [qqLoading, setQqLoading] = useState(false);
  const [qqError, setQqError] = useState<string | null>(null);

  useEffect(() => {
    setQqLoading(true);
    fetch('/api/qq/results')
      .then(r => r.json())
      .then(data => setQqResults(Array.isArray(data) ? data : []))
      .catch(() => setQqError('CozyQuiz-Ergebnisse konnten nicht geladen werden'))
      .finally(() => setQqLoading(false));
  }, []);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: '#f8fafc', padding: 20, fontFamily: 'var(--font)' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: 16 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: QQ_COLORS.slate300 }}>
            Stats & Recap
          </div>
          <h1 style={{ margin: '6px 0 4px' }}>Spiele-Auswertung</h1>
        </div>

        {/* ── Spiele & Recap ── */}
        <>
            {qqLoading && <div style={{ color: QQ_COLORS.slate400, padding: 20 }}>Lädt …</div>}
            {qqError && <div style={{ color: QQ_COLORS.red300, padding: 12 }}>{qqError}</div>}
            {!qqLoading && !qqError && qqResults.length === 0 && (
              <div style={{ ...card, color: QQ_COLORS.slate500, textAlign: 'center', padding: 32 }}>
                Noch keine CozyQuiz Spiele gespeichert.<br />
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
                        <span style={{ color: QQ_COLORS.amber500, fontWeight: 800 }}>{wins}× 🏆</span>
                      </div>
                    ))}
                  </div>
                  <div style={card}>
                    <div style={{ fontWeight: 800, marginBottom: 10 }}>📊 Überblick</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: QQ_COLORS.blue500 }}>{qqResults.length}</div>
                        <div style={{ fontSize: 12, color: QQ_COLORS.slate500, fontWeight: 700 }}>Spiele gespielt</div>
                      </div>
                      <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: QQ_COLORS.amber500 }}>{Object.keys(winCounts).length}</div>
                        <div style={{ fontSize: 12, color: QQ_COLORS.slate500, fontWeight: 700 }}>verschiedene Sieger</div>
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
                            <div style={{ fontSize: 11, color: QQ_COLORS.slate600, marginTop: 2 }}>
                              {new Date(r.playedAt).toLocaleString('de-DE')} · Raum {r.roomCode} · {r.phases} Runden · {r.language}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            {r.winner && (
                              <div style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 800, color: QQ_COLORS.amber500, whiteSpace: 'nowrap' }}>
                                🏆 {r.winner}
                              </div>
                            )}
                            <Link
                              to={`/recap/${r.id}`}
                              style={{
                                background: 'rgba(167,139,250,0.15)',
                                border: '1px solid rgba(167,139,250,0.4)',
                                borderRadius: 8,
                                padding: '4px 10px',
                                fontSize: 12,
                                fontWeight: 800,
                                color: QQ_COLORS.violet400,
                                whiteSpace: 'nowrap',
                                textDecoration: 'none',
                              }}
                            >
                              📊 Recap
                            </Link>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {sorted.map((t, i) => (
                            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: `1px solid ${t.color}44` }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                              <span style={{ fontSize: 12, fontWeight: i === 0 ? 800 : 600, color: i === 0 ? QQ_COLORS.slate200 : QQ_COLORS.slate400 }}>{t.name}</span>
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
      </div>
    </main>
  );
};

export default StatsPage;
