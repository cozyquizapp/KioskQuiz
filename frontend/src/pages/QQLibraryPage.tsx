import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  QQDraft, QQQuestion, QQCategory,
  QQ_CATEGORY_LABELS, QQ_CATEGORY_COLORS,
} from '../../../shared/quarterQuizTypes';

type DraftStatus = 'all' | 'draft' | 'complete' | 'incomplete';

function getDraftStatus(d: QQDraft): 'complete' | 'incomplete' {
  const filled = d.questions.filter(q => q.text.trim().length > 0).length;
  return filled >= d.phases * 5 ? 'complete' : 'incomplete';
}

function getDraftStats(d: QQDraft) {
  const total = d.phases * 5;
  const filled = d.questions.filter(q => q.text.trim().length > 0).length;
  const withAnswer = d.questions.filter(q => q.answer.trim().length > 0).length;
  const withImage = d.questions.filter(q => q.image?.url).length;
  const categories: Record<string, number> = {};
  for (const q of d.questions) {
    if (q.text.trim()) categories[q.category] = (categories[q.category] || 0) + 1;
  }
  return { total, filled, withAnswer, withImage, categories };
}

const SORT_OPTIONS = [
  { value: 'updated', label: 'Zuletzt bearbeitet' },
  { value: 'created', label: 'Erstelldatum' },
  { value: 'title', label: 'Titel A-Z' },
  { value: 'progress', label: 'Fortschritt' },
] as const;

type SortKey = typeof SORT_OPTIONS[number]['value'];

export default function QQLibraryPage() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<QQDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DraftStatus>('all');
  const [sortBy, setSortBy] = useState<SortKey>('updated');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/qq/drafts')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setDrafts(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = [...drafts];

    // Search
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(d =>
        d.title.toLowerCase().includes(s) ||
        d.questions.some(q => q.text.toLowerCase().includes(s) || q.answer.toLowerCase().includes(s))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter(d => getDraftStatus(d) === statusFilter);
    }

    // Sort
    list.sort((a, b) => {
      switch (sortBy) {
        case 'updated': return b.updatedAt - a.updatedAt;
        case 'created': return b.createdAt - a.createdAt;
        case 'title': return a.title.localeCompare(b.title);
        case 'progress': {
          const pa = getDraftStats(a).filled / getDraftStats(a).total;
          const pb = getDraftStats(b).filled / getDraftStats(b).total;
          return pb - pa;
        }
      }
    });

    return list;
  }, [drafts, search, statusFilter, sortBy]);

  async function deleteDraft(id: string) {
    if (!confirm('Fragensatz endgültig löschen?')) return;
    await fetch(`/api/qq/drafts/${id}`, { method: 'DELETE' });
    setDrafts(prev => prev.filter(d => d.id !== id));
  }

  async function duplicateDraft(d: QQDraft) {
    const copy: QQDraft = {
      ...d,
      id: `qq-draft-${Date.now().toString(36)}`,
      title: `${d.title} (Kopie)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const res = await fetch('/api/qq/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(copy),
    });
    if (res.ok) {
      const saved = await res.json();
      setDrafts(prev => [saved, ...prev]);
    }
  }

  function exportDraft(d: QQDraft) {
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${d.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importDraft() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text) as QQDraft;
        if (!data.questions || !Array.isArray(data.questions)) {
          alert('Ungültiges Format');
          return;
        }
        const imported: QQDraft = {
          ...data,
          id: `qq-draft-${Date.now().toString(36)}`,
          title: data.title || 'Import',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const res = await fetch('/api/qq/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(imported),
        });
        if (res.ok) {
          const saved = await res.json();
          setDrafts(prev => [saved, ...prev]);
        }
      } catch {
        alert('Fehler beim Importieren');
      }
    };
    input.click();
  }

  const totalDrafts = drafts.length;
  const completeDrafts = drafts.filter(d => getDraftStatus(d) === 'complete').length;
  const totalQuestions = drafts.reduce((sum, d) => sum + d.questions.filter(q => q.text.trim()).length, 0);

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: "'Nunito', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/menu')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: 'rgba(255,255,255,0.07)', color: '#94a3b8' }}>← Menü</button>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>📚 QQ Fragebibliothek</h1>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={importDraft} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: '#3B82F6', color: '#fff' }}>📥 Importieren</button>
            <button onClick={() => navigate('/qq-builder')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: '#22C55E', color: '#fff' }}>+ Neuer Fragensatz</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
          <div style={{ fontSize: 13, color: '#64748b' }}><span style={{ fontWeight: 900, color: '#e2e8f0', fontSize: 18 }}>{totalDrafts}</span> Fragensätze</div>
          <div style={{ fontSize: 13, color: '#64748b' }}><span style={{ fontWeight: 900, color: '#22C55E', fontSize: 18 }}>{completeDrafts}</span> komplett</div>
          <div style={{ fontSize: 13, color: '#64748b' }}><span style={{ fontWeight: 900, color: '#3B82F6', fontSize: 18 }}>{totalQuestions}</span> Fragen gesamt</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '16px 24px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Suchen (Titel, Frage, Antwort)..."
          style={{ flex: 1, minWidth: 200, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 14 }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as DraftStatus)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 13 }}>
          <option value="all">Alle Status</option>
          <option value="complete">✅ Komplett</option>
          <option value="incomplete">⏳ In Arbeit</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 13 }}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Draft list */}
      <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#475569' }}>Lade…</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>
            {search || statusFilter !== 'all' ? 'Keine Ergebnisse' : 'Noch keine Fragensätze vorhanden'}
          </div>
        )}
        {filtered.map(d => {
          const stats = getDraftStats(d);
          const status = getDraftStatus(d);
          const isExpanded = expandedId === d.id;
          const progress = stats.total > 0 ? stats.filled / stats.total : 0;

          return (
            <div key={d.id} style={{ background: '#1e293b', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', transition: 'all 0.15s' }}>
              {/* Card header */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : d.id)}
                style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
              >
                <div style={{ fontSize: 24 }}>{status === 'complete' ? '✅' : '📝'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 16, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{d.title || 'Ohne Titel'}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {d.phases} Runden · {stats.filled}/{stats.total} Fragen · {d.language.toUpperCase()} · {new Date(d.updatedAt).toLocaleDateString('de-DE')}
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ width: 100, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                  <div style={{ width: `${progress * 100}%`, height: '100%', borderRadius: 3, background: progress >= 1 ? '#22C55E' : '#3B82F6', transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: progress >= 1 ? '#22C55E' : '#64748b', minWidth: 40, textAlign: 'right' }}>
                  {Math.round(progress * 100)}%
                </div>
                <div style={{ fontSize: 16, color: '#475569', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div style={{ padding: '0 20px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {/* Category breakdown */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                    {(['SCHAETZCHEN', 'MUCHO', 'BUNTE_TUETE', 'ZEHN_VON_ZEHN', 'CHEESE'] as QQCategory[]).map(cat => {
                      const count = stats.categories[cat] || 0;
                      const label = QQ_CATEGORY_LABELS[cat];
                      const color = QQ_CATEGORY_COLORS[cat];
                      return (
                        <div key={cat} style={{ padding: '4px 10px', borderRadius: 6, background: color + '22', border: `1px solid ${color}44`, fontSize: 11, fontWeight: 800, color }}>
                          {label.emoji} {count}/{d.phases}
                        </div>
                      );
                    })}
                    {stats.withImage > 0 && (
                      <div style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>
                        🖼 {stats.withImage} Bilder
                      </div>
                    )}
                  </div>

                  {/* Question preview list */}
                  <div style={{ marginTop: 12, maxHeight: 200, overflow: 'auto' }}>
                    {d.questions.filter(q => q.text.trim()).map((q, i) => (
                      <div key={q.id} style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: 8, fontSize: 12 }}>
                        <span style={{ color: QQ_CATEGORY_COLORS[q.category], fontWeight: 800, minWidth: 20 }}>{QQ_CATEGORY_LABELS[q.category].emoji}</span>
                        <span style={{ color: '#94a3b8', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{q.text}</span>
                        <span style={{ color: '#22C55E', fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 150 }}>{q.answer}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                    <button onClick={() => navigate('/qq-builder')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: '#3B82F6', color: '#fff' }}>✏️ Bearbeiten</button>
                    <button onClick={() => duplicateDraft(d)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: 'rgba(255,255,255,0.07)', color: '#94a3b8' }}>📋 Duplizieren</button>
                    <button onClick={() => exportDraft(d)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: 'rgba(255,255,255,0.07)', color: '#94a3b8' }}>📤 Export JSON</button>
                    <button onClick={() => deleteDraft(d.id)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>🗑 Löschen</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
