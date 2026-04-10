import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  QQDraft, QQQuestion, QQCategory,
  QQ_CATEGORY_LABELS, QQ_CATEGORY_COLORS,
  QQBunteTueteKind, QQ_BUNTE_TUETE_LABELS,
} from '../../../shared/quarterQuizTypes';

type DraftStatus = 'all' | 'draft' | 'complete' | 'incomplete';
type ViewMode = 'drafts' | 'questions';

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
  const [viewMode, setViewMode] = useState<ViewMode>('drafts');
  const [catFilter, setCatFilter] = useState<QQCategory | 'all'>('all');
  const [phaseFilter, setPhaseFilter] = useState<number | 'all'>('all');
  const [mechFilter, setMechFilter] = useState<QQBunteTueteKind | 'all'>('all');

  // "In Draft kopieren" state
  const [targetDraftId, setTargetDraftId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/qq/drafts')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setDrafts(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Auto-clear toast after 2.5s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

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

  // Flat question list for "Alle Fragen" view
  const flatQuestions = useMemo(() => {
    type FlatQ = QQQuestion & { draftTitle: string; draftId: string };
    const all: FlatQ[] = [];
    for (const d of drafts) {
      for (const q of d.questions) {
        if (!q.text.trim()) continue;
        all.push({ ...q, draftTitle: d.title, draftId: d.id });
      }
    }
    let list = all;
    // Search
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(q =>
        q.text.toLowerCase().includes(s) || q.answer.toLowerCase().includes(s) || q.draftTitle.toLowerCase().includes(s)
      );
    }
    // Category
    if (catFilter !== 'all') list = list.filter(q => q.category === catFilter);
    // Phase
    if (phaseFilter !== 'all') list = list.filter(q => q.phaseIndex === phaseFilter);
    // Mechanic (BUNTE_TUETE sub-type)
    if (mechFilter !== 'all') list = list.filter(q => q.bunteTuete?.kind === mechFilter);
    return list;
  }, [drafts, search, catFilter, phaseFilter, mechFilter]);

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

  async function copyQuestionToDraft(question: QQQuestion) {
    if (!targetDraftId) return;
    try {
      const res = await fetch(`/api/qq/drafts/${targetDraftId}`);
      if (!res.ok) { setToast('Fehler: Draft nicht gefunden'); return; }
      const draft: QQDraft = await res.json();

      // Find first empty slot (question with no text)
      const slotIndex = draft.questions.findIndex(q => !q.text.trim());
      if (slotIndex === -1) {
        alert('Kein freier Slot im Ziel-Draft');
        return;
      }

      // Replace that slot with the source question (keep original id to avoid collisions, use new id)
      const updatedQuestions = [...draft.questions];
      updatedQuestions[slotIndex] = {
        ...question,
        id: `${question.id}-copy-${Date.now().toString(36)}`,
      };

      const putRes = await fetch(`/api/qq/drafts/${targetDraftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, questions: updatedQuestions, updatedAt: Date.now() }),
      });
      if (putRes.ok) {
        setToast(`✓ Eingefügt in Slot ${slotIndex + 1}`);
      } else {
        setToast('Fehler beim Speichern');
      }
    } catch {
      setToast('Fehler beim Kopieren');
    }
  }

  const totalDrafts = drafts.length;
  const completeDrafts = drafts.filter(d => getDraftStatus(d) === 'complete').length;
  const totalQuestions = drafts.reduce((sum, d) => sum + d.questions.filter(q => q.text.trim()).length, 0);

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: "'Nunito', system-ui, sans-serif" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#22C55E', color: '#fff', fontWeight: 800, fontSize: 14,
          padding: '10px 24px', borderRadius: 10, zIndex: 9999,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          pointerEvents: 'none',
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '20px 24px', background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/menu')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: 'rgba(255,255,255,0.07)', color: '#94a3b8' }}>← Menü</button>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>📚 QQ Fragebibliothek</h1>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={importDraft} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: '#3B82F6', color: '#fff' }}>📥 Importieren</button>
            <button onClick={() => navigate('/builder')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: '#22C55E', color: '#fff' }}>+ Neuer Fragensatz</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
          <div style={{ fontSize: 13, color: '#64748b' }}><span style={{ fontWeight: 900, color: '#e2e8f0', fontSize: 18 }}>{totalDrafts}</span> Fragensätze</div>
          <div style={{ fontSize: 13, color: '#64748b' }}><span style={{ fontWeight: 900, color: '#22C55E', fontSize: 18 }}>{completeDrafts}</span> komplett</div>
          <div style={{ fontSize: 13, color: '#64748b' }}><span style={{ fontWeight: 900, color: '#3B82F6', fontSize: 18 }}>{totalQuestions}</span> Fragen gesamt</div>
        </div>

        {/* Ziel-Draft Selektor */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>📋 In Draft kopieren:</span>
          <select
            value={targetDraftId ?? ''}
            onChange={e => setTargetDraftId(e.target.value || null)}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 13, minWidth: 220 }}
          >
            <option value="">Ziel-Draft wählen…</option>
            {drafts.map(d => (
              <option key={d.id} value={d.id}>{d.title || 'Ohne Titel'}</option>
            ))}
          </select>
          {targetDraftId && (
            <span style={{ fontSize: 12, color: '#64748b' }}>Klick auf 📋 Kopieren bei einer Frage unten</span>
          )}
        </div>
      </div>

      {/* View Toggle + Filters */}
      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* View toggle */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, width: 'fit-content' }}>
          {([['drafts', '📋 Fragensätze'], ['questions', '🔍 Alle Fragen']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setViewMode(v)} style={{
              padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
              background: viewMode === v ? '#3B82F6' : 'transparent',
              color: viewMode === v ? '#fff' : '#64748b',
            }}>{label}</button>
          ))}
        </div>

        {/* Search + draft-level filters */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={viewMode === 'drafts' ? '🔍 Suchen (Titel, Frage, Antwort)...' : '🔍 Suchen in allen Fragen…'}
            style={{ flex: 1, minWidth: 200, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 14 }}
          />
          {viewMode === 'drafts' && (
            <>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as DraftStatus)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 13 }}>
                <option value="all">Alle Status</option>
                <option value="complete">✅ Komplett</option>
                <option value="incomplete">⏳ In Arbeit</option>
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 13 }}>
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </>
          )}
        </div>

        {/* Question-level filters (only in "Alle Fragen" view) */}
        {viewMode === 'questions' && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Category chips */}
            <button onClick={() => setCatFilter('all')} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit', background: catFilter === 'all' ? '#475569' : 'rgba(255,255,255,0.05)', color: catFilter === 'all' ? '#fff' : '#64748b' }}>Alle</button>
            {(['SCHAETZCHEN', 'MUCHO', 'BUNTE_TUETE', 'ZEHN_VON_ZEHN', 'CHEESE'] as QQCategory[]).map(cat => {
              const l = QQ_CATEGORY_LABELS[cat];
              const c = QQ_CATEGORY_COLORS[cat];
              const active = catFilter === cat;
              return (
                <button key={cat} onClick={() => setCatFilter(active ? 'all' : cat)} style={{
                  padding: '4px 12px', borderRadius: 6, border: `1px solid ${active ? c : 'transparent'}`,
                  cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
                  background: active ? c + '22' : 'rgba(255,255,255,0.05)',
                  color: active ? c : '#94a3b8',
                }}>{l.emoji} {l.de}</button>
              );
            })}
            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)' }} />
            {/* Phase filter */}
            {[1, 2, 3].map(p => (
              <button key={p} onClick={() => setPhaseFilter(phaseFilter === p ? 'all' : p)} style={{
                padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
                background: phaseFilter === p ? '#6366F1' + '33' : 'rgba(255,255,255,0.05)',
                color: phaseFilter === p ? '#818CF8' : '#64748b',
              }}>R{p}</button>
            ))}
            {/* Mechanic filter (BUNTE_TUETE sub-types) */}
            {(catFilter === 'BUNTE_TUETE' || catFilter === 'all') && (
              <>
                <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)' }} />
                {(['hotPotato', 'top5', 'oneOfEight', 'order', 'map'] as QQBunteTueteKind[]).map(mk => {
                  const ml = QQ_BUNTE_TUETE_LABELS[mk];
                  const active = mechFilter === mk;
                  return (
                    <button key={mk} onClick={() => setMechFilter(active ? 'all' : mk)} style={{
                      padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      fontWeight: 700, fontSize: 11, fontFamily: 'inherit',
                      background: active ? '#EF4444' + '22' : 'rgba(255,255,255,0.04)',
                      color: active ? '#F87171' : '#475569',
                    }}>{ml.emoji} {ml.de}</button>
                  );
                })}
              </>
            )}
            <div style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b', fontWeight: 700 }}>
              {flatQuestions.length} Fragen
            </div>
          </div>
        )}
      </div>

      {/* ═══ DRAFTS VIEW ═══ */}
      {viewMode === 'drafts' && (
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
                  <div style={{ marginTop: 12, maxHeight: 300, overflow: 'auto' }}>
                    {d.questions.filter(q => q.text.trim()).map((q) => (
                      <div key={q.id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: 8, fontSize: 12, alignItems: 'center' }}>
                        <span style={{ color: QQ_CATEGORY_COLORS[q.category], fontWeight: 800, minWidth: 20 }}>{QQ_CATEGORY_LABELS[q.category].emoji}</span>
                        <span style={{ color: '#94a3b8', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{q.text}</span>
                        <span style={{ color: '#22C55E', fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 150 }}>{q.answer}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); copyQuestionToDraft(q); }}
                          disabled={!targetDraftId}
                          title={targetDraftId ? 'In Ziel-Draft kopieren' : 'Erst Ziel-Draft auswählen'}
                          style={{
                            padding: '3px 10px', borderRadius: 6, border: 'none', cursor: targetDraftId ? 'pointer' : 'not-allowed',
                            fontWeight: 700, fontSize: 11, flexShrink: 0,
                            background: targetDraftId ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.04)',
                            color: targetDraftId ? '#60a5fa' : '#475569',
                            fontFamily: 'inherit',
                          }}
                        >
                          📋 Kopieren
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                    <button onClick={() => navigate('/builder')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: '#3B82F6', color: '#fff' }}>✏️ Bearbeiten</button>
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
      )}

      {/* ═══ FLAT QUESTIONS VIEW ═══ */}
      {viewMode === 'questions' && (
      <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#475569' }}>Lade…</div>}
        {!loading && flatQuestions.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>Keine Fragen gefunden</div>
        )}
        {!loading && flatQuestions.length > 0 && (
          <div style={{ fontSize: 12, color: '#64748b', padding: '4px 0', fontWeight: 700 }}>{flatQuestions.length} Frage{flatQuestions.length !== 1 ? 'n' : ''}</div>
        )}
        {flatQuestions.map((q, i) => (
          <div key={`${q.draftId}-${q.id}`} style={{
            background: i % 2 === 0 ? '#1e293b' : '#1a2332',
            borderRadius: 8, padding: '8px 14px',
            display: 'flex', gap: 10, fontSize: 12, alignItems: 'center',
            border: '1px solid rgba(255,255,255,0.04)',
          }}>
            <span style={{ color: QQ_CATEGORY_COLORS[q.category], fontWeight: 800, fontSize: 16, minWidth: 22 }}>
              {QQ_CATEGORY_LABELS[q.category].emoji}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#e2e8f0', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontWeight: 600 }}>{q.text}</div>
              <div style={{ color: '#22C55E', fontSize: 11, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', marginTop: 2 }}>✓ {q.answer}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              <span style={{ padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', fontSize: 10, fontWeight: 800, color: '#64748b' }}>
                R{q.phaseIndex}
              </span>
              {q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind && (
                <span style={{ padding: '2px 7px', borderRadius: 4, background: 'rgba(168,85,247,0.15)', fontSize: 10, fontWeight: 800, color: '#a855f7' }}>
                  {QQ_BUNTE_TUETE_LABELS[q.bunteTuete.kind]?.emoji} {QQ_BUNTE_TUETE_LABELS[q.bunteTuete.kind]?.de}
                </span>
              )}
              <span style={{ fontSize: 10, color: '#475569', maxWidth: 100, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }} title={q.draftTitle}>
                📄 {q.draftTitle}
              </span>
              <button
                onClick={() => copyQuestionToDraft(q)}
                disabled={!targetDraftId}
                title={targetDraftId ? 'In Ziel-Draft kopieren' : 'Erst Ziel-Draft auswählen'}
                style={{
                  padding: '3px 10px', borderRadius: 6, border: 'none', cursor: targetDraftId ? 'pointer' : 'not-allowed',
                  fontWeight: 700, fontSize: 11, flexShrink: 0,
                  background: targetDraftId ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.04)',
                  color: targetDraftId ? '#60a5fa' : '#475569',
                  fontFamily: 'inherit',
                }}
              >
                📋 Kopieren
              </button>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
