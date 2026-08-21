import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QQDraft } from '../../../shared/quarterQuizTypes';
import { exportHostCheatsheet } from './qqHostCheatsheet';
import PrepWorkspaceHeader from '../components/PrepWorkspaceHeader';

// ── /host-sheets — Übersicht aller Drafts, ein Klick druckt das Host-Sheet ──
export default function QQHostSheetsPage() {
  const [drafts, setDrafts] = useState<QQDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    fetch('/api/qq/drafts')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setDrafts(data); })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const filtered = drafts
    .filter(d => !search.trim() || d.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

  return (
    <div className="qq-host-sheets-page" style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: '#e2e8f0',
      fontFamily: 'var(--font)',
      padding: '24px 20px 60px',
    }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <PrepWorkspaceHeader
          eyebrow="Bauen & vorbereiten"
          title="Host-Sheets"
          description="Drucke für den Spielabend einen klaren Moderator-Spickzettel mit Fragen, Antworten, Notizen und Fun Facts."
          actions={<Link to="/menu/quizze" style={{ textDecoration: 'none', color: '#FCE7F3', fontWeight: 800, fontSize: 13 }}>Quiz wählen →</Link>}
        />
      </div>
      {/* Search */}
      <div style={{ maxWidth: 920, margin: '0 auto 16px' }}>
        <label htmlFor="host-sheet-search" style={{ display: 'block', marginBottom: 7, color: '#CBD5E1', fontSize: 13, fontWeight: 800 }}>
          Fragensatz suchen
        </label>
        <input
          id="host-sheet-search"
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Fragensatz suchen…"
          aria-describedby="host-sheet-search-hint"
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
            color: '#e2e8f0', fontFamily: 'inherit', fontSize: 14, outline: 'none',
          }}
        />
        <div id="host-sheet-search-hint" style={{ marginTop: 6, color: '#94a3b8', fontSize: 12 }}>
          Zeigt deine zuletzt bearbeiteten Quizze zuerst.
        </div>
      </div>

      {/* List */}
      <div style={{ maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Lädt…</div>}
        {!loading && loadError && (
          <div role="alert" style={{ padding: 18, borderRadius: 12, color: '#FECACA', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)' }}>
            Quizze konnten nicht geladen werden. Prüfe die Verbindung und lade die Seite erneut.
          </div>
        )}
        {!loading && !loadError && filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            Keine Fragensätze gefunden.
          </div>
        )}
        {filtered.map(draft => {
          const total = (draft.phases ?? 3) * 5;
          const filled = draft.questions.filter(q => q.text.trim().length > 0).length;
          const withFact = draft.questions.filter(q => (q as any).funFact?.trim()).length;
          const withNote = draft.questions.filter(q => q.hostNote?.trim()).length;
          const isPrinting = printingId === draft.id;
          const openSheet = async () => {
            if (printingId) return;
            setPrintingId(draft.id);
            try {
              await exportHostCheatsheet(draft);
              setNotice(`Host-Sheet für ${draft.title || 'dieses Quiz'} wurde geöffnet.`);
            } catch {
              setNotice('Das Host-Sheet konnte nicht geöffnet werden. Bitte erneut versuchen.');
            } finally { setPrintingId(null); }
          };
          return (
            <div
              key={draft.id}
              className="qq-host-sheet-row"
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
                type="button"
                onClick={() => { void openSheet(); }}
                disabled={!!printingId}
                style={{
                  padding: '8px 14px', borderRadius: 8, border: 'none',
                  background: '#F59E0B', color: '#0f172a', fontFamily: 'inherit',
                  fontWeight: 900, fontSize: 13, cursor: printingId ? 'wait' : 'pointer', flexShrink: 0,
                  opacity: printingId && !isPrinting ? 0.55 : 1,
                }}
              >
                {isPrinting ? 'PDF wird geöffnet…' : '📄 PDF öffnen'}
              </button>
            </div>
          );
        })}
      </div>
      <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }}>{notice}</div>
      <style>{`
        .qq-host-sheets-page input:focus-visible, .qq-host-sheets-page button:focus-visible, .qq-host-sheets-page a:focus-visible { outline: 3px solid #F9A8D4; outline-offset: 3px; }
        .qq-host-sheet-row { transition: border-color .16s ease, background .16s ease; }
        .qq-host-sheet-row:hover { border-color: rgba(249,168,212,.45) !important; background: rgba(255,255,255,.055) !important; }
        @media (prefers-reduced-motion: reduce) { .qq-host-sheet-row { transition: none; } }
        @media (forced-colors: active) { .qq-host-sheets-page input:focus-visible, .qq-host-sheets-page button:focus-visible, .qq-host-sheets-page a:focus-visible { outline-color: Highlight; } }
      `}</style>
    </div>
  );
}
