import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QQDraft } from '../../../shared/quarterQuizTypes';
import { exportHostCheatsheet } from './qqHostCheatsheet';

// ── /host-sheets — Übersicht aller Drafts, ein Klick druckt das Host-Sheet ──
export default function QQHostSheetsPage() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<QQDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/qq/drafts')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setDrafts(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = drafts
    .filter(d => !search.trim() || d.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: '#e2e8f0',
      fontFamily: 'var(--font)',
      padding: '24px 20px 60px',
    }}>
      {/* Header */}
      <div style={{ maxWidth: 920, margin: '0 auto 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => navigate('/menu')}
          style={{
            padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)', color: '#cbd5e1', fontFamily: 'inherit',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}
        >
          ← Menü
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 22, color: '#f8fafc' }}>🎙️ Host-Sheets</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            Druckbare Moderator-Spickzettel mit allen Fragen, Antworten, Notizen und Fun Facts
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ maxWidth: 920, margin: '0 auto 16px' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Fragensatz suchen…"
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
            color: '#e2e8f0', fontFamily: 'inherit', fontSize: 14, outline: 'none',
          }}
        />
      </div>

      {/* List */}
      <div style={{ maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Lädt…</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            Keine Fragensätze gefunden.
          </div>
        )}
        {filtered.map(draft => {
          const total = (draft.phases ?? 3) * 5;
          const filled = draft.questions.filter(q => q.text.trim().length > 0).length;
          const withFact = draft.questions.filter(q => (q as any).funFact?.trim()).length;
          const withNote = draft.questions.filter(q => q.hostNote?.trim()).length;
          return (
            <div
              key={draft.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 12,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#f1f5f9', marginBottom: 4 }}>
                  {draft.title || 'Unbenannt'}
                </div>
                <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#64748b', flexWrap: 'wrap' }}>
                  <span>{filled}/{total} Fragen</span>
                  <span style={{ color: withNote > 0 ? '#FBBF24' : '#475569' }}>🎙️ {withNote} Notizen</span>
                  <span style={{ color: withFact > 0 ? '#A855F7' : '#475569' }}>💡 {withFact} Fun Facts</span>
                </div>
              </div>
              <button
                onClick={() => exportHostCheatsheet(draft)}
                style={{
                  padding: '8px 14px', borderRadius: 8, border: 'none',
                  background: '#F59E0B', color: '#0f172a', fontFamily: 'inherit',
                  fontWeight: 900, fontSize: 13, cursor: 'pointer', flexShrink: 0,
                }}
              >
                📄 PDF öffnen
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
