import { useEffect, useMemo, useState } from 'react';
import { API_BASE } from '../api';

// ── Types ────────────────────────────────────────────────────────────────────
type FeedbackType = 'feedback' | 'bug' | 'idea' | 'praise';
type PlayAgain = 'yes' | 'maybe' | 'no';
type LengthFeel = 'short' | 'ok' | 'long';
type ContactIntent = 'date' | 'booking' | 'response';

type FeedbackEntry = {
  id: string;
  submittedAt: number;
  roomCode: string | null;
  teamName: string | null;
  rating: number | null;
  text: string;
  contact: string | null;
  type?: FeedbackType;
  playAgain?: PlayAgain | null;
  favoriteCategory?: string | null;
  lengthFeel?: LengthFeel | null;
  surprise?: string | null;
  contactIntent?: ContactIntent[] | null;
};

// ── Static option tables (kept in sync with the form on QQSummaryPage) ──────
const TYPE_META: Record<FeedbackType, { emoji: string; label: string; color: string }> = {
  feedback: { emoji: '💬', label: 'Feedback', color: '#60a5fa' },
  bug:      { emoji: '🐛', label: 'Bug',      color: '#f87171' },
  idea:     { emoji: '💡', label: 'Idee',     color: '#fbbf24' },
  praise:   { emoji: '❤️', label: 'Lob',      color: '#f0abfc' },
};

const CATEGORY_META: Record<string, { emoji: string; label: string }> = {
  SCHAETZCHEN:   { emoji: '🎯', label: 'Schätzchen' },
  MUCHO:         { emoji: '🅰️', label: 'Mu-Cho' },
  BUNTE_TUETE:   { emoji: '🎁', label: 'Bunte Tüte' },
  ZEHN_VON_ZEHN: { emoji: '🎰', label: 'All In' },
  CHEESE:        { emoji: '📸', label: 'Picture This' },
};

const PLAY_AGAIN_META: Record<PlayAgain, { emoji: string; label: string }> = {
  yes:   { emoji: '🔥', label: 'Auf jeden' },
  maybe: { emoji: '🤔', label: 'Vielleicht' },
  no:    { emoji: '👋', label: 'Eher nicht' },
};

const LENGTH_META: Record<LengthFeel, { emoji: string; label: string }> = {
  short: { emoji: '⏱️', label: 'Zu kurz' },
  ok:    { emoji: '👌', label: 'Genau richtig' },
  long:  { emoji: '🐢', label: 'Zu lang' },
};

const INTENT_META: Record<ContactIntent, { emoji: string; label: string }> = {
  date:     { emoji: '📅', label: 'Termin planen' },
  booking:  { emoji: '🎪', label: 'Quiz buchen' },
  response: { emoji: '💌', label: 'Antwort ok' },
};

const BUG_KEYWORDS = [
  'bug', 'fehler', 'crash', 'absturz', 'hängt', 'hing', 'funktioniert nicht',
  'geht nicht', 'kaputt', 'broken', 'error', 'stuck', 'freeze', 'eingefroren',
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.round(diff / 1000);
  if (s < 60) return 'gerade eben';
  const m = Math.round(s / 60);
  if (m < 60) return `vor ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `vor ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `vor ${d} Tg`;
  return new Date(ts).toLocaleDateString('de-DE');
}

function absTime(ts: number): string {
  return new Date(ts).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

function isBugFlavored(text: string): boolean {
  const t = text.toLowerCase();
  return BUG_KEYWORDS.some(k => t.includes(k));
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCSV(entries: FeedbackEntry[]): string {
  const header = [
    'id', 'submittedAt', 'datetime', 'type', 'rating',
    'roomCode', 'teamName', 'playAgain', 'favoriteCategory', 'lengthFeel',
    'surprise', 'text', 'contact', 'contactIntent',
  ].join(',');
  const rows = entries.map(e => [
    e.id,
    e.submittedAt,
    new Date(e.submittedAt).toISOString(),
    e.type ?? 'feedback',
    e.rating ?? '',
    e.roomCode ?? '',
    e.teamName ?? '',
    e.playAgain ?? '',
    e.favoriteCategory ?? '',
    e.lengthFeel ?? '',
    e.surprise ?? '',
    e.text,
    e.contact ?? '',
    (e.contactIntent ?? []).join('|'),
  ].map(csvEscape).join(','));
  return [header, ...rows].join('\n');
}

function toMarkdown(e: FeedbackEntry): string {
  const t = (e.type ?? 'feedback') as FeedbackType;
  const typeLbl = TYPE_META[t].label;
  const stars = e.rating ? '⭐'.repeat(e.rating) : '—';
  const lines: string[] = [];
  lines.push(`**${TYPE_META[t].emoji} ${typeLbl}** · ${stars} · ${absTime(e.submittedAt)}`);
  if (e.roomCode || e.teamName) lines.push(`Room: ${e.roomCode ?? '—'} · Team: ${e.teamName ?? '—'}`);
  if (e.favoriteCategory && CATEGORY_META[e.favoriteCategory]) {
    lines.push(`Lieblings-Kategorie: ${CATEGORY_META[e.favoriteCategory].emoji} ${CATEGORY_META[e.favoriteCategory].label}`);
  }
  if (e.playAgain) lines.push(`Nochmal spielen: ${PLAY_AGAIN_META[e.playAgain].emoji} ${PLAY_AGAIN_META[e.playAgain].label}`);
  if (e.lengthFeel) lines.push(`Länge: ${LENGTH_META[e.lengthFeel].emoji} ${LENGTH_META[e.lengthFeel].label}`);
  if (e.surprise) lines.push(`Überraschung: ${e.surprise}`);
  lines.push('');
  lines.push(e.text);
  if (e.contact) {
    lines.push('');
    lines.push(`Kontakt: ${e.contact}`);
    if (e.contactIntent?.length) {
      lines.push(`Intent: ${e.contactIntent.map(i => INTENT_META[i].label).join(', ')}`);
    }
  }
  return lines.join('\n');
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Filter state ─────────────────────────────────────────────────────────────
type TypeFilter = 'all' | FeedbackType;
type TimespanFilter = 'all' | '24h' | '7d' | '30d';
type RatingFilter = 'all' | 'low' | 'mid' | 'high';

const TIMESPAN_MS: Record<Exclude<TimespanFilter, 'all'>, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

// ── Page ─────────────────────────────────────────────────────────────────────
export default function QQFeedbackDashboard() {
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [timespan, setTimespan] = useState<TimespanFilter>('all');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/qq/feedback`);
        if (!res.ok) throw new Error('Laden fehlgeschlagen');
        const data = await res.json() as FeedbackEntry[];
        if (alive) setEntries(Array.isArray(data) ? data : []);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : 'Fehler');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // ── Derived: filtered list ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const now = Date.now();
    return entries.filter(e => {
      if (typeFilter !== 'all' && (e.type ?? 'feedback') !== typeFilter) return false;
      if (ratingFilter === 'low' && !(e.rating !== null && e.rating <= 2)) return false;
      if (ratingFilter === 'mid' && e.rating !== 3) return false;
      if (ratingFilter === 'high' && !(e.rating !== null && e.rating >= 4)) return false;
      if (timespan !== 'all' && now - e.submittedAt > TIMESPAN_MS[timespan]) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = [
          e.text, e.roomCode, e.teamName, e.contact, e.surprise,
          e.favoriteCategory ? CATEGORY_META[e.favoriteCategory]?.label : '',
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [entries, typeFilter, ratingFilter, timespan, search]);

  // ── Derived: stats (over all entries, not filtered — gives the big picture) ─
  const stats = useMemo(() => {
    const total = entries.length;
    const ratings = entries.map(e => e.rating).filter((r): r is number => typeof r === 'number');
    const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const fortnightAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const last7 = entries.filter(e => e.submittedAt >= weekAgo).length;
    const prev7 = entries.filter(e => e.submittedAt >= fortnightAgo && e.submittedAt < weekAgo).length;
    const delta = last7 - prev7;

    const catCounts = new Map<string, number>();
    for (const e of entries) {
      if (e.favoriteCategory) catCounts.set(e.favoriteCategory, (catCounts.get(e.favoriteCategory) ?? 0) + 1);
    }
    let topCat: string | null = null;
    let topCatCount = 0;
    for (const [k, v] of catCounts) {
      if (v > topCatCount) { topCat = k; topCatCount = v; }
    }

    const typeCounts: Record<FeedbackType, number> = { feedback: 0, bug: 0, idea: 0, praise: 0 };
    for (const e of entries) typeCounts[(e.type ?? 'feedback') as FeedbackType]++;

    const unread7d = entries.filter(e => e.submittedAt >= weekAgo && ((e.type ?? 'feedback') === 'bug' || (e.rating !== null && e.rating <= 2))).length;

    return { total, avg, last7, delta, topCat, topCatCount, typeCounts, unread7d };
  }, [entries]);

  // ── Actions ───────────────────────────────────────────────────────────────
  async function onDelete(id: string) {
    const pin = sessionStorage.getItem('qq_admin_pin') || '';
    if (!pin) { alert('Kein Admin-PIN in Session — bitte neu einloggen.'); return; }
    if (!confirm('Eintrag wirklich löschen?')) return;
    try {
      const res = await fetch(`${API_BASE}/qq/feedback/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const msg = res.status === 403 ? 'PIN falsch — bitte neu einloggen.' : 'Löschen fehlgeschlagen.';
        alert(msg);
        return;
      }
      setEntries(list => list.filter(e => e.id !== id));
    } catch {
      alert('Netzwerkfehler beim Löschen.');
    }
  }

  async function onCopyMd(e: FeedbackEntry) {
    try {
      await navigator.clipboard.writeText(toMarkdown(e));
      setCopiedId(e.id);
      setTimeout(() => setCopiedId(prev => (prev === e.id ? null : prev)), 1500);
    } catch {
      alert('Kopieren fehlgeschlagen.');
    }
  }

  function onExportCSV() {
    const name = `qq-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
    download(name, toCSV(filtered), 'text/csv;charset=utf-8');
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={shell}>
      <header style={headerBar}>
        <div>
          <div style={{ fontSize: 12, color: '#64748b', letterSpacing: '0.15em', fontWeight: 800 }}>COZYQUIZ · STAFF</div>
          <h1 style={{ margin: '2px 0 0', fontSize: 26, fontWeight: 900, color: '#e2e8f0' }}>Feedback-Dashboard</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={onExportCSV} disabled={!filtered.length} style={btnGhost}>📄 CSV exportieren</button>
          <button type="button" onClick={() => window.location.href = '/admin'} style={btnGhost}>← Admin</button>
        </div>
      </header>

      {loading && <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Lade Feedback…</div>}
      {err && <div style={{ padding: 20, color: '#f87171' }}>Fehler: {err}</div>}

      {!loading && !err && (
        <>
          <section style={statsRow}>
            <StatCard label="Einträge" value={String(stats.total)} hint={stats.last7 ? `+${stats.last7} in 7 Tg` : '—'} />
            <StatCard
              label="Ø Rating"
              value={stats.avg !== null ? stats.avg.toFixed(2) : '—'}
              hint={stats.avg !== null ? '⭐'.repeat(Math.round(stats.avg)) : 'keine Sterne'}
            />
            <StatCard
              label="Trend 7 Tg"
              value={stats.delta >= 0 ? `+${stats.delta}` : String(stats.delta)}
              hint={stats.delta > 0 ? '📈 mehr als Vorwoche' : stats.delta < 0 ? '📉 weniger als Vorwoche' : 'gleich'}
              accent={stats.delta > 0 ? '#22c55e' : stats.delta < 0 ? '#f87171' : undefined}
            />
            <StatCard
              label="Top-Kategorie"
              value={stats.topCat && CATEGORY_META[stats.topCat] ? `${CATEGORY_META[stats.topCat].emoji} ${CATEGORY_META[stats.topCat].label}` : '—'}
              hint={stats.topCatCount ? `${stats.topCatCount}× genannt` : 'noch keine Daten'}
            />
            <StatCard
              label="🚨 To-Review"
              value={String(stats.unread7d)}
              hint="Bugs + ≤2⭐ (7 Tg)"
              accent={stats.unread7d > 0 ? '#f87171' : undefined}
            />
          </section>

          <section style={filterBar}>
            <div style={filterGroup}>
              <FilterChip active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>Alle ({stats.total})</FilterChip>
              {(['feedback', 'bug', 'idea', 'praise'] as FeedbackType[]).map(t => (
                <FilterChip
                  key={t}
                  active={typeFilter === t}
                  color={TYPE_META[t].color}
                  onClick={() => setTypeFilter(t)}
                >
                  {TYPE_META[t].emoji} {TYPE_META[t].label} ({stats.typeCounts[t]})
                </FilterChip>
              ))}
            </div>

            <div style={filterGroup}>
              <FilterChip active={ratingFilter === 'all'} onClick={() => setRatingFilter('all')}>Alle Ratings</FilterChip>
              <FilterChip active={ratingFilter === 'low'} onClick={() => setRatingFilter('low')}>⭐⭐ oder weniger</FilterChip>
              <FilterChip active={ratingFilter === 'mid'} onClick={() => setRatingFilter('mid')}>⭐⭐⭐</FilterChip>
              <FilterChip active={ratingFilter === 'high'} onClick={() => setRatingFilter('high')}>⭐⭐⭐⭐+</FilterChip>
            </div>

            <div style={filterGroup}>
              <FilterChip active={timespan === 'all'} onClick={() => setTimespan('all')}>Ganze Zeit</FilterChip>
              <FilterChip active={timespan === '24h'} onClick={() => setTimespan('24h')}>24 h</FilterChip>
              <FilterChip active={timespan === '7d'} onClick={() => setTimespan('7d')}>7 Tg</FilterChip>
              <FilterChip active={timespan === '30d'} onClick={() => setTimespan('30d')}>30 Tg</FilterChip>
            </div>

            <input
              type="text"
              placeholder="Suche (Text, Room, Team, Kontakt…)"
              value={search}
              onChange={ev => setSearch(ev.target.value)}
              style={searchInput}
            />
          </section>

          <div style={{ padding: '6px 20px', color: '#64748b', fontSize: 13 }}>
            {filtered.length} von {entries.length} Einträgen
          </div>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 20px 60px' }}>
            {filtered.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b', background: '#0f1522', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)' }}>
                Keine Einträge mit diesen Filtern.
              </div>
            )}
            {filtered.map(e => (
              <FeedbackCard
                key={e.id}
                entry={e}
                onDelete={() => onDelete(e.id)}
                onCopyMd={() => onCopyMd(e)}
                copied={copiedId === e.id}
              />
            ))}
          </section>
        </>
      )}
    </div>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────────
function StatCard({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <div style={{
      flex: '1 1 180px',
      background: '#0f1522',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 14,
      padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 4,
      minWidth: 0,
    }}>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: accent ?? '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: '#94a3b8' }}>{hint}</div>}
    </div>
  );
}

function FilterChip({ children, active, onClick, color }: { children: React.ReactNode; active: boolean; onClick: () => void; color?: string }) {
  const accent = color ?? '#3b82f6';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 12px',
        borderRadius: 999,
        border: `1px solid ${active ? accent : 'rgba(255,255,255,0.1)'}`,
        background: active ? `${accent}22` : 'transparent',
        color: active ? '#e2e8f0' : '#94a3b8',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

function FeedbackCard({ entry, onDelete, onCopyMd, copied }: { entry: FeedbackEntry; onDelete: () => void; onCopyMd: () => void; copied: boolean }) {
  const type = (entry.type ?? 'feedback') as FeedbackType;
  const meta = TYPE_META[type];
  const isCritical = entry.rating !== null && entry.rating <= 2;
  const looksLikeBug = type !== 'bug' && isBugFlavored(entry.text);

  return (
    <div style={{
      background: '#0f1522',
      border: `1px solid ${isCritical ? 'rgba(248,113,113,0.35)' : 'rgba(255,255,255,0.06)'}`,
      borderLeft: `4px solid ${meta.color}`,
      borderRadius: 14,
      padding: 16,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Row 1: badges + time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ ...pill, background: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}55` }}>
          {meta.emoji} {meta.label}
        </span>
        {entry.rating !== null && (
          <span style={{ ...pill, background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.35)' }}>
            {'⭐'.repeat(entry.rating)}
          </span>
        )}
        {isCritical && (
          <span style={{ ...pill, background: 'rgba(248,113,113,0.15)', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.4)' }}>
            🚨 Kritisch
          </span>
        )}
        {looksLikeBug && (
          <span style={{ ...pill, background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px dashed rgba(248,113,113,0.3)' }}>
            🐛 riecht nach Bug
          </span>
        )}
        <span style={{ flex: 1 }} />
        <span title={absTime(entry.submittedAt)} style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>
          {relTime(entry.submittedAt)}
        </span>
      </div>

      {/* Row 2: context (room, team, category, length, play again) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
        {(entry.roomCode || entry.teamName) && (
          <span style={{ color: '#94a3b8' }}>
            {entry.teamName ? <strong style={{ color: '#e2e8f0' }}>{entry.teamName}</strong> : <em>kein Team</em>}
            {entry.roomCode && <span style={{ color: '#64748b' }}> · Room {entry.roomCode}</span>}
          </span>
        )}
        {entry.favoriteCategory && CATEGORY_META[entry.favoriteCategory] && (
          <span style={tag}>
            {CATEGORY_META[entry.favoriteCategory].emoji} {CATEGORY_META[entry.favoriteCategory].label}
          </span>
        )}
        {entry.playAgain && (
          <span style={tag}>{PLAY_AGAIN_META[entry.playAgain].emoji} {PLAY_AGAIN_META[entry.playAgain].label}</span>
        )}
        {entry.lengthFeel && (
          <span style={tag}>{LENGTH_META[entry.lengthFeel].emoji} {LENGTH_META[entry.lengthFeel].label}</span>
        )}
      </div>

      {/* Row 3: text */}
      <div style={{ color: '#e2e8f0', fontSize: 15, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{entry.text}</div>

      {/* Row 4: surprise */}
      {entry.surprise && (
        <div style={{
          background: 'rgba(251,191,36,0.08)',
          border: '1px solid rgba(251,191,36,0.25)',
          borderRadius: 10,
          padding: '8px 12px',
          fontSize: 13,
          color: '#fde68a',
        }}>
          💫 Überraschung: {entry.surprise}
        </div>
      )}

      {/* Row 5: contact + intent */}
      {entry.contact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
          <span style={{ color: '#94a3b8' }}>💌 Kontakt:</span>
          <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 6, color: '#e2e8f0', fontSize: 13 }}>{entry.contact}</code>
          {entry.contactIntent?.map(i => (
            <span key={i} style={tag}>{INTENT_META[i].emoji} {INTENT_META[i].label}</span>
          ))}
        </div>
      )}

      {/* Row 6: actions */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 2 }}>
        <button type="button" onClick={onCopyMd} style={btnGhostSm}>
          {copied ? '✓ kopiert' : '📋 Markdown'}
        </button>
        <button type="button" onClick={onDelete} style={{ ...btnGhostSm, color: '#fca5a5', borderColor: 'rgba(248,113,113,0.3)' }}>
          🗑 Löschen
        </button>
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const shell: React.CSSProperties = {
  minHeight: '100vh',
  background: '#0b0d14',
  color: '#e2e8f0',
  fontFamily: "'Nunito', 'Geist', system-ui, sans-serif",
};

const headerBar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  padding: '20px 20px 12px',
  flexWrap: 'wrap',
};

const statsRow: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  padding: '8px 20px 16px',
  flexWrap: 'wrap',
};

const filterBar: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  padding: '8px 20px 14px',
  flexWrap: 'wrap',
  alignItems: 'center',
};

const filterGroup: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
};

const searchInput: React.CSSProperties = {
  flex: '1 1 220px',
  minWidth: 200,
  padding: '8px 14px',
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.12)',
  background: '#0f1522',
  color: '#e2e8f0',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
};

const pill: React.CSSProperties = {
  padding: '3px 10px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.02em',
  whiteSpace: 'nowrap',
};

const tag: React.CSSProperties = {
  padding: '3px 10px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#cbd5e1',
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: 'nowrap',
};

const btnGhost: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  color: '#e2e8f0',
  fontSize: 14,
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const btnGhostSm: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  color: '#e2e8f0',
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
