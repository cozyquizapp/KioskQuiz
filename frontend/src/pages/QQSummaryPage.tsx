// Public Team-Summary-Seite — Spieler scannen nach dem Spiel den QR-Code
// auf dem Beamer, landen hier, wählen ihr Team, sehen eigene Stats + Feedback-
// Formular + nächste Quiz-Termine.

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { qqGetAvatar } from '../../../shared/quarterQuizTypes';
import { API_BASE } from '../api';

type SummaryTeam = {
  id: string;
  name: string;
  color: string;
  avatarId: string;
  score: number;
  totalCells: number;
  largestConnected: number;
  correct: number;
  answered: number;
  jokersEarned: number;
  stealsUsed: number;
};

type Summary = {
  id: string;
  roomCode: string;
  playedAt: number;
  draftTitle: string;
  winner: string | null;
  phases: number;
  teams: SummaryTeam[];
  funnyAnswers: Array<{ teamId: string; teamName: string; text: string; questionText: string }>;
};

type UpcomingEvent = {
  id: string;
  date: string;
  time?: string;
  location: string;
  city?: string;
  link?: string;
  note?: string;
};

export default function QQSummaryPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) return;
    let cancelled = false;
    (async () => {
      try {
        const [sRes, uRes] = await Promise.all([
          fetch(`${API_BASE}/qq/summary/${encodeURIComponent(roomCode)}`),
          fetch(`${API_BASE}/qq/upcoming`).catch(() => null),
        ]);
        if (!sRes.ok) {
          if (!cancelled) setError('Dieses Spiel konnten wir nicht finden. Vielleicht war es zu lange her?');
          return;
        }
        const s: Summary = await sRes.json();
        if (!cancelled) setSummary(s);
        if (uRes && uRes.ok) {
          const u: UpcomingEvent[] = await uRes.json();
          if (!cancelled) setUpcoming(u);
        }
      } catch {
        if (!cancelled) setError('Oha, da ist was beim Laden schiefgegangen. Versuch es nochmal in ein paar Minuten.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [roomCode]);

  const selectedTeam = useMemo(
    () => summary?.teams.find(t => t.id === selectedTeamId) ?? null,
    [summary, selectedTeamId]
  );

  const ranking = useMemo(() => {
    if (!summary) return [];
    return [...summary.teams].sort(
      (a, b) => b.largestConnected - a.largestConnected || b.totalCells - a.totalCells || b.score - a.score
    );
  }, [summary]);

  if (loading) {
    return <Shell><Loading /></Shell>;
  }

  if (error || !summary) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤷</div>
          <h2 style={{ margin: 0, marginBottom: 8 }}>Kein Ergebnis gefunden</h2>
          <p style={{ color: '#94a3b8' }}>{error ?? 'Unbekannter Fehler.'}</p>
        </div>
      </Shell>
    );
  }

  // Auswahl-Screen
  if (!selectedTeam) {
    return (
      <Shell>
        <Hero draftTitle={summary.draftTitle} winner={summary.winner} playedAt={summary.playedAt} />
        <Section title="Welches Team seid ihr?">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {ranking.map((t, i) => {
              const av = qqGetAvatar(t.avatarId);
              return (
                <button key={t.id} onClick={() => setSelectedTeamId(t.id)}
                  style={{
                    padding: 14, borderRadius: 16,
                    background: t.color + '22', border: `2px solid ${t.color}`,
                    cursor: 'pointer', color: '#fff', fontFamily: 'inherit',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  }}>
                  <div style={{ fontSize: 48, lineHeight: 1 }}>{av.emoji}</div>
                  <div style={{ fontSize: 15, fontWeight: 900 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: '#cbd5e1' }}>
                    Platz {i + 1} · {t.largestConnected} Felder
                  </div>
                </button>
              );
            })}
          </div>
        </Section>
        <FeedbackForm roomCode={summary.roomCode} />
        <PartnerCTA />
        <UpcomingEvents events={upcoming} />
        <Footer />
      </Shell>
    );
  }

  // Team-Detail-Screen
  const place = ranking.findIndex(t => t.id === selectedTeam.id) + 1;
  const av = qqGetAvatar(selectedTeam.avatarId);
  const placeLabel = place === 1 ? '🥇 1. Platz' : place === 2 ? '🥈 2. Platz' : place === 3 ? '🥉 3. Platz' : `🎖️ ${place}. Platz`;
  const myFunny = summary.funnyAnswers.find(f => f.teamId === selectedTeam.id);
  const accuracy = selectedTeam.answered > 0 ? Math.round((selectedTeam.correct / selectedTeam.answered) * 100) : null;

  return (
    <Shell>
      <div style={{
        background: `linear-gradient(135deg, ${selectedTeam.color}33 0%, rgba(15,23,42,0) 60%)`,
        padding: '28px 20px 22px', borderRadius: 20, marginBottom: 18,
        border: `1px solid ${selectedTeam.color}55`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center',
      }}>
        <div style={{
          width: 112, height: 112, borderRadius: '50%',
          background: selectedTeam.color,
          border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 10px 30px ${selectedTeam.color}66`,
          fontSize: 64, lineHeight: 1,
        }}>{av.emoji}</div>
        <div style={{ fontSize: 13, fontWeight: 900, color: '#fbbf24', letterSpacing: 0.3, textTransform: 'uppercase' }}>
          {placeLabel}
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#f8fafc' }}>{selectedTeam.name}</div>
        <button onClick={() => setSelectedTeamId(null)}
          style={{
            marginTop: 6, fontSize: 12, color: '#94a3b8', background: 'transparent',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 999,
            padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit',
          }}>↩ anderes Team wählen</button>
      </div>

      <Section title="Eure Zahlen">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          <Stat label="Größtes Gebiet" value={selectedTeam.largestConnected} suffix="Felder" accent={selectedTeam.color} />
          <Stat label="Felder gesamt" value={selectedTeam.totalCells} suffix="Stück" accent={selectedTeam.color} />
          <Stat label="Richtig" value={selectedTeam.correct} suffix={`/ ${selectedTeam.answered}`} accent="#22C55E" />
          <Stat label="Trefferquote" value={accuracy != null ? `${accuracy}%` : '—'} accent="#22C55E" />
          <Stat label="Joker verdient" value={selectedTeam.jokersEarned} accent="#EAB308" />
          <Stat label="Geklaut" value={selectedTeam.stealsUsed} suffix="mal" accent="#EF4444" />
        </div>
      </Section>

      {myFunny && (
        <Section title="Euer Moment">
          <div style={{
            background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: 12, padding: '12px 14px',
          }}>
            <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 }}>
              😂 Lustige Antwort
            </div>
            <div style={{ fontSize: 14, color: '#f8fafc', fontWeight: 700, marginBottom: 4 }}>
              „{myFunny.text}"
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              Frage: {myFunny.questionText}
            </div>
          </div>
        </Section>
      )}

      <Section title="Endstand">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ranking.map((t, i) => {
            const tAv = qqGetAvatar(t.avatarId);
            const isMe = t.id === selectedTeam.id;
            return (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 10,
                background: isMe ? t.color + '22' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isMe ? t.color : 'rgba(255,255,255,0.06)'}`,
              }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8', width: 22 }}>{i + 1}.</span>
                <span style={{ fontSize: 24, lineHeight: 1 }}>{tAv.emoji}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: isMe ? t.color : '#e2e8f0' }}>{t.name}</span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  {t.largestConnected} <span style={{ fontSize: 10 }}>Felder</span>
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      <FeedbackForm roomCode={summary.roomCode} teamName={selectedTeam.name} />
      <PartnerCTA />
      <UpcomingEvents events={upcoming} />
      <Footer />
    </Shell>
  );
}

// ── Helpers & Subcomponents ───────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0b0f1e 0%, #0f172a 100%)',
      color: '#e2e8f0',
      fontFamily: "'Nunito', system-ui, sans-serif",
      padding: '20px 16px 40px',
    }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>{children}</div>
    </div>
  );
}

function Hero({ draftTitle, winner, playedAt }: { draftTitle: string; winner: string | null; playedAt: number }) {
  const date = new Date(playedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return (
    <div style={{
      padding: '24px 20px', borderRadius: 20, marginBottom: 18, textAlign: 'center',
      background: 'radial-gradient(ellipse at top, rgba(251,191,36,0.15), transparent 70%)',
      border: '1px solid rgba(251,191,36,0.2)',
    }}>
      <div style={{ fontSize: 11, letterSpacing: 0.3, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
        Quarter Quiz · {date}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#f8fafc', marginTop: 4 }}>{draftTitle}</div>
      {winner && (
        <div style={{ marginTop: 10, fontSize: 14, color: '#fbbf24', fontWeight: 800 }}>
          🏆 Sieger: {winner}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 13, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.3, margin: '0 0 10px', fontWeight: 900 }}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Stat({ label, value, suffix, accent }: { label: string; value: number | string; suffix?: string; accent: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12, padding: '10px 12px',
    }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: accent, lineHeight: 1.1, marginTop: 2 }}>
        {value} {suffix && <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🎲</div>
      <div style={{ color: '#94a3b8' }}>Lade eure Stats…</div>
    </div>
  );
}

function FeedbackForm({ roomCode, teamName }: { roomCode: string; teamName?: string }) {
  const [rating, setRating] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [contact, setContact] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!text.trim()) { setErr('Ein paar Zeilen wären super.'); return; }
    setSending(true); setErr(null);
    try {
      const res = await fetch(`${API_BASE}/qq/feedback`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, teamName, rating, text, contact }),
      });
      if (!res.ok) throw new Error('Server mochte das Feedback nicht.');
      setSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Konnte nicht senden.');
    } finally { setSending(false); }
  }

  if (sent) {
    return (
      <Section title="Feedback & Bugs">
        <div style={{
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 12, padding: '14px 16px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#86efac' }}>
            Danke! Ist angekommen.
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section title="Feedback & Bugs">
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, padding: 14,
      }}>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
          Wie fandet ihr's? Bugs, Wünsche, Lobhudelei — alles willkommen.
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => setRating(n)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8,
                background: rating && rating >= n ? '#fbbf24' : 'rgba(255,255,255,0.06)',
                color: rating && rating >= n ? '#1e293b' : '#94a3b8',
                border: 'none', cursor: 'pointer', fontSize: 18, fontFamily: 'inherit',
              }}>★</button>
          ))}
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={2000}
          placeholder="Euer Feedback…"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '8px 10px', color: '#e2e8f0',
            fontSize: 14, fontFamily: 'inherit', resize: 'vertical',
          }} />
        <input value={contact} onChange={e => setContact(e.target.value)} maxLength={200}
          placeholder="Mail oder Instagram (optional — falls ich antworten soll)"
          style={{
            width: '100%', boxSizing: 'border-box', marginTop: 8,
            background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '8px 10px', color: '#e2e8f0',
            fontSize: 13, fontFamily: 'inherit',
          }} />
        {err && <div style={{ marginTop: 8, fontSize: 12, color: '#fca5a5' }}>⚠️ {err}</div>}
        <button onClick={submit} disabled={sending}
          style={{
            marginTop: 10, width: '100%', padding: '10px',
            background: '#22C55E', color: '#0f172a', fontWeight: 900,
            border: 'none', borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
            cursor: sending ? 'default' : 'pointer', opacity: sending ? 0.6 : 1,
          }}>
          {sending ? 'Sende…' : 'Absenden'}
        </button>
      </div>
    </Section>
  );
}

function UpcomingEvents({ events }: { events: UpcomingEvent[] }) {
  if (!events.length) return null;
  return (
    <Section title="Nächste Quizze">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {events.map(e => {
          const d = e.date ? new Date(e.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '';
          return (
            <a key={e.id} href={e.link || '#'}
              onClick={ev => { if (!e.link) ev.preventDefault(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#e2e8f0', textDecoration: 'none',
              }}>
              <div style={{
                width: 52, textAlign: 'center',
                fontSize: 12, fontWeight: 900, color: '#fbbf24',
                lineHeight: 1.2,
              }}>{d}{e.time && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{e.time}</div>}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 900 }}>{e.location}</div>
                {(e.city || e.note) && (
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    {[e.city, e.note].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
              {e.link && <div style={{ fontSize: 16, color: '#94a3b8' }}>→</div>}
            </a>
          );
        })}
      </div>
    </Section>
  );
}

function PartnerCTA() {
  return (
    <Section title="Quiz bei euch?">
      <div style={{
        background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(236,72,153,0.08))',
        border: '1px solid rgba(251,191,36,0.3)',
        borderRadius: 14, padding: '16px 16px 14px',
      }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#fbbf24', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          🐺 Ihr wollt Quarter Quiz bei euch haben?
        </div>
        <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 12 }}>
          Ob Kneipe, Event, Geburtstag oder Firmenfeier — ich komme mit Beamer, Stimme und guter Laune. Schreibt mir, ich mach euch ein Angebot.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <a href="mailto:hallo@cozywolf.de" style={ctaButton('#fbbf24', '#1e293b')}>
            ✉️ Mail
          </a>
          <a href="https://cozywolf.de" target="_blank" rel="noreferrer" style={ctaButton('rgba(251,191,36,0.15)', '#fbbf24', 'rgba(251,191,36,0.4)')}>
            🌐 cozywolf.de
          </a>
          <a href="https://instagram.com/cozywolf.events" target="_blank" rel="noreferrer" style={{ ...ctaButton('rgba(236,72,153,0.15)', '#f0abfc', 'rgba(236,72,153,0.4)'), gridColumn: '1 / -1' }}>
            📸 @cozywolf.events
          </a>
        </div>
      </div>
    </Section>
  );
}

function ctaButton(bg: string, color: string, border?: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '10px 12px', borderRadius: 10,
    background: bg, color,
    fontSize: 13, fontWeight: 900, fontFamily: 'inherit',
    textDecoration: 'none',
    border: border ? `1px solid ${border}` : 'none',
  };
}

function Footer() {
  return (
    <div style={{
      marginTop: 28, paddingTop: 18,
      borderTop: '1px solid rgba(255,255,255,0.06)',
      textAlign: 'center', fontSize: 11, color: '#64748b',
    }}>
      <div>Quarter Quiz by <b style={{ color: '#94a3b8' }}>cozywolf</b></div>
      <div style={{ marginTop: 4, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        <a href="https://play.cozyquiz.app" style={{ color: '#94a3b8', textDecoration: 'none' }}>play.cozyquiz.app</a>
        <span style={{ opacity: 0.4 }}>·</span>
        <a href="https://cozywolf.de" target="_blank" rel="noreferrer" style={{ color: '#94a3b8', textDecoration: 'none' }}>cozywolf.de</a>
      </div>
    </div>
  );
}
