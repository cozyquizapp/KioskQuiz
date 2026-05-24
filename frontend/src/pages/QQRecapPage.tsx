/**
 * QQRecapPage — Mod-Only Detail-Recap pro gespieltem Quiz.
 *
 * 2026-05-24 (Wolf-Live-Test #9): Wolf-Reflexions-Tool. Zeigt pro Spiel
 * Q-by-Q-History, Team-Stats, Sieger, Awards, Funny-Answers. Lebt unter
 * /recap/:gameId (PinGate-gated). Summary bleibt clean fuer Teams.
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QQTeamAvatar } from '../components/QQTeamAvatar';

type Answer = {
  teamId: string;
  text: string;
  submittedAt: number;
};

type QH = {
  _qIndex?: number;
  questionText?: string;
  category?: string;
  bunteTueteKind?: string;
  answers?: Answer[];
  correctTeamId?: string | null;
  correctTeamIds?: string[];
  startedAt?: number | null;
};

type TeamX = {
  id: string;
  name: string;
  color: string;
  avatarId: string;
  emoji?: string;
  totalCells?: number;
  largestConnected?: number;
  score?: number;
  correct?: number;
  answered?: number;
  jokersEarned?: number;
  stealsUsed?: number;
};

type Recap = {
  id: string;
  roomCode: string;
  playedAt: number;
  draftTitle: string;
  winner: string | null;
  phases: number;
  teams: TeamX[];
  questionHistory: QH[];
  funnyAnswers: Array<{ teamName?: string; text?: string; category?: string }>;
  endAwards: { underdog?: string | null; meisterklauer?: string | null; speedy?: string | null } | null;
};

const CAT_LABELS: Record<string, string> = {
  SCHAETZCHEN: '🎯 Schätzchen',
  MUCHO: '🅰️ Mu-Cho',
  BUNTE_TUETE: '🎁 Bunte Tüte',
  ZEHN_VON_ZEHN: '🔟 10v10',
  CHEESE: '🧀 Cheese',
};

export default function QQRecapPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [recap, setRecap] = useState<Recap | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;
    fetch(`/api/qq/recap/${encodeURIComponent(gameId)}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((data: Recap) => setRecap(data))
      .catch(err => setError(String(err)));
  }, [gameId]);

  if (error) return <div style={{ padding: 32, color: '#FCA5A5', fontFamily: 'Inter, sans-serif' }}>Fehler: {error}</div>;
  if (!recap) return <div style={{ padding: 32, color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>⏳ Lade Recap…</div>;

  const teamMap = new Map(recap.teams.map(t => [t.id, t]));
  const dateStr = new Date(recap.playedAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div style={{
      minHeight: '100vh', background: '#0f172a', color: '#F1F5F9',
      fontFamily: 'Inter, "Nunito", system-ui, sans-serif',
      padding: '32px 24px', maxWidth: 1200, margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Link to="/admin" style={{ color: '#A78BFA', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>← Admin</Link>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginTop: 8, marginBottom: 4 }}>📊 Recap — {recap.draftTitle}</h1>
        <div style={{ fontSize: 14, color: '#94a3b8' }}>
          {dateStr} · Room <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: 4 }}>{recap.roomCode}</code>
          {' · '}{recap.phases} Phasen
          {recap.winner && <> · 🏆 Sieger: <strong style={{ color: '#FBCFE8' }}>{recap.winner}</strong></>}
        </div>
      </div>

      {/* Team-Stats-Cards */}
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, color: '#F9A8D4' }}>Teams</h2>
      <div style={{
        display: 'grid', gap: 12, marginBottom: 32,
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
      }}>
        {recap.teams.map(t => (
          <div key={t.id} style={{
            padding: '14px 16px', borderRadius: 12,
            background: `linear-gradient(135deg, ${t.color}22, ${t.color}08)`,
            border: `1.5px solid ${t.color}55`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <QQTeamAvatar avatarId={t.avatarId} teamEmoji={t.emoji} size={36} />
              <div style={{ fontSize: 16, fontWeight: 900, color: t.color }}>{t.name}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12, color: '#cbd5e1' }}>
              <div>Score: <strong style={{ color: '#F1F5F9' }}>{t.largestConnected ?? 0}</strong></div>
              <div>Total: <strong style={{ color: '#F1F5F9' }}>{t.totalCells ?? 0}</strong></div>
              <div>Korrekt: <strong style={{ color: '#86EFAC' }}>{t.correct ?? 0}/{t.answered ?? 0}</strong></div>
              <div>Joker: <strong style={{ color: '#FCD34D' }}>{t.jokersEarned ?? 0}</strong></div>
              <div>Klau: <strong style={{ color: '#F87171' }}>{t.stealsUsed ?? 0}</strong></div>
            </div>
          </div>
        ))}
      </div>

      {/* End-Awards */}
      {recap.endAwards && (recap.endAwards.underdog || recap.endAwards.meisterklauer || recap.endAwards.speedy) && (
        <>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, color: '#F9A8D4' }}>🏅 End-Awards</h2>
          <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
            {recap.endAwards.underdog && (
              <div style={{ padding: '10px 14px', background: '#1e293b', borderRadius: 8, fontSize: 13 }}>
                🐺 <strong>Underdog:</strong> {teamMap.get(recap.endAwards.underdog)?.name ?? recap.endAwards.underdog}
              </div>
            )}
            {recap.endAwards.meisterklauer && (
              <div style={{ padding: '10px 14px', background: '#1e293b', borderRadius: 8, fontSize: 13 }}>
                🦝 <strong>Meisterklauer:</strong> {teamMap.get(recap.endAwards.meisterklauer)?.name ?? recap.endAwards.meisterklauer}
              </div>
            )}
            {recap.endAwards.speedy && (
              <div style={{ padding: '10px 14px', background: '#1e293b', borderRadius: 8, fontSize: 13 }}>
                ⚡ <strong>Speedy Gonzales:</strong> {teamMap.get(recap.endAwards.speedy)?.name ?? recap.endAwards.speedy}
              </div>
            )}
          </div>
        </>
      )}

      {/* Question-by-Question History */}
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, color: '#F9A8D4' }}>
        ❓ Fragen-Verlauf ({recap.questionHistory.length})
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
        {recap.questionHistory.map((qh, idx) => {
          const correctSet = new Set([
            ...(qh.correctTeamIds ?? []),
            ...(qh.correctTeamId ? [qh.correctTeamId] : []),
          ]);
          // 2026-05-24 (Härtung 0.0s-Bug): nimm das frueheste von startedAt
          // und allen submittedAt, statt nur Fallback auf min(submittedAt).
          const baseline = Math.min(
            qh.startedAt ?? Number.POSITIVE_INFINITY,
            ...(qh.answers ?? []).map(a => a.submittedAt),
          );
          return (
            <div key={idx} style={{
              padding: '12px 16px', borderRadius: 8,
              background: '#1e293b', border: '1px solid #334155',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#F1F5F9' }}>
                  {qh.category && CAT_LABELS[qh.category]} · Q{(qh._qIndex ?? idx) + 1}
                  {qh.bunteTueteKind && <span style={{ marginLeft: 6, color: '#94a3b8' }}>· {qh.bunteTueteKind}</span>}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {qh.answers?.length ?? 0} Antworten
                </div>
              </div>
              {qh.questionText && (
                <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 8, fontStyle: 'italic' }}>
                  → {qh.questionText}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(qh.answers ?? []).slice().sort((a, b) => a.submittedAt - b.submittedAt).map((a, i) => {
                  const team = teamMap.get(a.teamId);
                  const isCorrect = correctSet.has(a.teamId);
                  const deltaMs = a.submittedAt - baseline;
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
                      padding: '4px 8px', borderRadius: 4,
                      background: isCorrect ? 'rgba(34,197,94,0.12)' : 'transparent',
                    }}>
                      <span style={{ color: isCorrect ? '#86EFAC' : '#64748b', fontWeight: 800, minWidth: 16 }}>
                        {isCorrect ? '✓' : '·'}
                      </span>
                      <span style={{ color: team?.color ?? '#94a3b8', fontWeight: 700, minWidth: 100 }}>
                        {team?.name ?? a.teamId}
                      </span>
                      <span style={{ flex: 1, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.text}
                      </span>
                      <span style={{ color: '#64748b', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
                        +{(deltaMs / 1000).toFixed(1)}s
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Funny Answers */}
      {recap.funnyAnswers.length > 0 && (
        <>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, color: '#F9A8D4' }}>
            😂 Funny Answers ({recap.funnyAnswers.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 32 }}>
            {recap.funnyAnswers.map((fa, i) => (
              <div key={i} style={{ padding: '8px 12px', background: '#1e293b', borderRadius: 6, fontSize: 13 }}>
                <strong style={{ color: '#FBCFE8' }}>{fa.teamName ?? '?'}</strong>
                {fa.category && <span style={{ color: '#64748b', marginLeft: 6 }}>· {fa.category}</span>}
                <span style={{ marginLeft: 8, color: '#cbd5e1' }}>„{fa.text}"</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
