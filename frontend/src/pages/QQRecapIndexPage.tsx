/**
 * QQRecapIndexPage — Mod-only Index aller gespielten Quizze.
 *
 * 2026-05-24 (Wolf-Wunsch): eigene Menü-Page fuer Recap-Browsing statt
 * Umweg ueber /stats. Klick auf Spiel → /recap/:gameId (Detail-View).
 *
 * Lebt unter /recap (PinGate-gated). Detail-Page weiterhin /recap/:gameId.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QQ_AVATARS } from '../../../shared/quarterQuizTypes';

// Mega Event erkennen: mehrere Teams teilen dieselbe Slot-Farbe (im Normal-Modus
// ist jede Farbe exklusiv). Dann auf 8 Farben aggregieren (Name per Farb-Reverse-
// Lookup aus QQ_AVATARS), sonst nach Score sortiert durchreichen.
function groupPillsIfNested(teams: Array<{ id: string; name: string; color: string; score: number }>) {
  const seen = new Set<string>();
  let nested = false;
  for (const t of teams) { if (seen.has(t.color)) { nested = true; break; } seen.add(t.color); }
  if (!nested) return [...teams].sort((a, b) => b.score - a.score);
  const groups = new Map<string, { id: string; name: string; color: string; score: number }>();
  for (const t of teams) {
    let g = groups.get(t.color);
    if (!g) { g = { id: `grp-${t.color}`, name: QQ_AVATARS.find(a => a.color === t.color)?.label ?? t.name, color: t.color, score: 0 }; groups.set(t.color, g); }
    g.score += t.score ?? 0;
  }
  return [...groups.values()].sort((a, b) => b.score - a.score);
}

type QQResult = {
  id: string;
  draftTitle: string;
  roomCode: string;
  playedAt: number;
  winner: string | null;
  phases: number;
  language: string;
  teams: Array<{ id: string; name: string; color: string; score: number }>;
};

export default function QQRecapIndexPage() {
  const [results, setResults] = useState<QQResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch('/api/qq/results')
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((data: QQResult[]) => setResults(Array.isArray(data) ? data : []))
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter.trim()
    ? results.filter(r =>
        r.draftTitle.toLowerCase().includes(filter.toLowerCase())
        || r.roomCode.toLowerCase().includes(filter.toLowerCase())
        || r.teams.some(t => t.name.toLowerCase().includes(filter.toLowerCase()))
        || (r.winner ?? '').toLowerCase().includes(filter.toLowerCase()))
    : results;

  return (
    <div style={{
      minHeight: '100vh', background: '#0f172a', color: '#F1F5F9',
      fontFamily: 'Inter, "Nunito", system-ui, sans-serif',
      padding: '32px 24px', maxWidth: 1200, margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link to="/menu" style={{ color: '#A78BFA', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>← Menü</Link>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginTop: 8, marginBottom: 4 }}>📊 Recap-Übersicht</h1>
        <div style={{ fontSize: 14, color: '#94a3b8' }}>
          Mod-Reflexions-Tool. Klick auf ein Spiel → Detail-View mit Q-by-Q-History, Awards, Funny-Answers.
        </div>
      </div>

      {/* Filter */}
      <input
        type="text"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="🔍 Filter: Quiz-Titel, Room-Code, Team-Name, Sieger…"
        style={{
          width: '100%', maxWidth: 540, marginBottom: 24,
          padding: '10px 14px', borderRadius: 10,
          background: '#1e293b', border: '1px solid #334155',
          color: '#F1F5F9', fontSize: 14, fontFamily: 'inherit',
          boxSizing: 'border-box',
        }}
      />

      {/* Loading / Error / Empty States */}
      {loading && <div style={{ color: '#94a3b8', fontSize: 14 }}>⏳ Lade Spiele…</div>}
      {error && <div style={{ color: '#FCA5A5', fontSize: 14 }}>⚠ Fehler: {error}</div>}
      {!loading && !error && results.length === 0 && (
        <div style={{ color: '#94a3b8', fontSize: 15, fontStyle: 'italic', padding: '40px 0', textAlign: 'center' }}>
          Noch keine Spiele gespielt. Spielst du das erste Quiz, taucht es hier auf.
        </div>
      )}
      {!loading && !error && results.length > 0 && filtered.length === 0 && (
        <div style={{ color: '#94a3b8', fontSize: 14, fontStyle: 'italic', padding: '20px 0' }}>
          Kein Spiel passt zum Filter „{filter}".
        </div>
      )}

      {/* Spiele-Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(r => {
          const sortedTeams = groupPillsIfNested(r.teams ?? []);
          return (
            <Link
              key={r.id}
              to={`/recap/${r.id}`}
              style={{
                textDecoration: 'none', color: 'inherit',
                padding: '14px 18px', borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(167,139,250,0.08), rgba(167,139,250,0.02))',
                border: '1px solid rgba(167,139,250,0.25)',
                display: 'flex', flexDirection: 'column', gap: 10,
                transition: 'transform 0.15s, border-color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(167,139,250,0.05))';
                e.currentTarget.style.borderColor = 'rgba(167,139,250,0.55)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(167,139,250,0.08), rgba(167,139,250,0.02))';
                e.currentTarget.style.borderColor = 'rgba(167,139,250,0.25)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#F1F5F9', marginBottom: 4 }}>
                    {r.draftTitle}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    {new Date(r.playedAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
                    {' · '}Room <code style={{ background: '#1e293b', padding: '1px 6px', borderRadius: 4 }}>{r.roomCode}</code>
                    {' · '}{r.phases} Runden
                    {' · '}{r.language}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {r.winner && (
                    <div style={{
                      background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                      borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 800,
                      color: '#F59E0B', whiteSpace: 'nowrap',
                    }}>
                      🏆 {r.winner}
                    </div>
                  )}
                  <div style={{
                    background: 'rgba(167,139,250,0.20)', border: '1px solid rgba(167,139,250,0.5)',
                    borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 800,
                    color: '#A78BFA', whiteSpace: 'nowrap',
                  }}>
                    📊 Detail →
                  </div>
                </div>
              </div>
              {/* Team-Pillen */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {sortedTeams.map((t, i) => (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${t.color}44`,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: i === 0 ? 800 : 600, color: i === 0 ? '#e2e8f0' : '#94a3b8' }}>
                      {t.name}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: t.color }}>{t.score}</span>
                  </div>
                ))}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer-Info */}
      {!loading && !error && results.length > 0 && (
        <div style={{
          marginTop: 24, paddingTop: 16,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: 12, color: '#64748b', textAlign: 'center',
        }}>
          {filtered.length} von {results.length} Spielen
          {' · '}Recap zeigt: Q-by-Q-History · Team-Stats · End-Awards · Funny-Answers
        </div>
      )}
    </div>
  );
}
