import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  QQDraft, QQQuestion, QQCategory,
  QQ_CATEGORY_LABELS, QQ_CATEGORY_COLORS,
  QQBunteTueteKind, QQ_BUNTE_TUETE_LABELS,
  QQ_TOPICS,
} from '../../../shared/quarterQuizTypes';
import { QQ_COLORS } from '../../../shared/qqColors';

// ── Types ────────────────────────────────────────────────────────────────────
type DraftStatus = 'all' | 'draft' | 'complete' | 'incomplete';
type ViewMode = 'drafts' | 'questions';
type UseFilter = 'all' | 'unused' | 'rare' | 'recent';
type SourceFilter = 'all' | 'mine' | 'pool';

type ImportStatus = {
  running: boolean;
  startedAt: number;
  finishedAt: number | null;
  fetchedTotal: number;
  importedTotal: number;
  translatedTotal: number;
  errors: string[];
  lastBatch: number;
  targetTotal: number;
};

type UsageEntry = {
  usageCount: number;
  firstUsedAt: number;
  lastUsedAt: number;
  recentUses: Array<{ roomCode: string; draftId: string; draftTitle: string; venue?: string; playedAt: number }>;
};
type UsageMap = Record<string, UsageEntry>;

// ── Helpers ──────────────────────────────────────────────────────────────────
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

function formatRelative(ts: number): string {
  if (!ts) return '–';
  const diff = Date.now() - ts;
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return 'heute';
  if (diff < 2 * day) return 'gestern';
  if (diff < 30 * day) return `vor ${Math.floor(diff / day)} Tagen`;
  if (diff < 365 * day) return `vor ${Math.floor(diff / (30 * day))} Mon`;
  return `vor ${Math.floor(diff / (365 * day))} J`;
}

const SORT_OPTIONS = [
  { value: 'updated', label: 'Zuletzt bearbeitet' },
  { value: 'created', label: 'Erstelldatum' },
  { value: 'title', label: 'Titel A-Z' },
  { value: 'progress', label: 'Fortschritt' },
] as const;
type SortKey = typeof SORT_OPTIONS[number]['value'];

const Q_SORT_OPTIONS = [
  { value: 'unused', label: 'Selten gespielt zuerst' },
  { value: 'oldest', label: 'Lang nicht gespielt' },
  { value: 'recent', label: 'Zuletzt gespielt' },
  { value: 'most',   label: 'Am häufigsten gespielt' },
  { value: 'draft',  label: 'Nach Quiz-Titel' },
] as const;
type QSortKey = typeof Q_SORT_OPTIONS[number]['value'];

const PAGE_SIZE = 200;

// ── Component ────────────────────────────────────────────────────────────────
export default function QQLibraryPage() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<QQDraft[]>([]);
  const [poolItems, setPoolItems] = useState<any[]>([]);
  const [poolTotal, setPoolTotal] = useState(0);
  const [usageMap, setUsageMap] = useState<UsageMap>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DraftStatus>('all');
  const [sortBy, setSortBy] = useState<SortKey>('updated');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('questions');
  const [catFilter, setCatFilter] = useState<QQCategory | 'all'>('all');
  const [phaseFilter, setPhaseFilter] = useState<number | 'all'>('all');
  const [mechFilter, setMechFilter] = useState<QQBunteTueteKind | 'all'>('all');
  const [topicFilter, setTopicFilter] = useState<string | 'all'>('all');
  const [useFilter, setUseFilter] = useState<UseFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  // 2026-07-08 (Wolf): Location-Filter — '' = aus. Gesetzt zeigt NUR Fragen, die
  // an diesem Ort noch NICHT liefen (baue frisch fuer einen Stammort ohne Wdh.).
  const [venueFilter, setVenueFilter] = useState<string>('');
  const [qSortBy, setQSortBy] = useState<QSortKey>('unused');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  // Ziel-Draft für "Kopieren"
  const [targetDraftId, setTargetDraftId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // 2026-05-11 (Audit P0): Multi-Select für Mass-Copy. Quiz-Aufbau = oft
  // 15-30 Fragen ziehen. Checkbox pro Row + Floating-Action-Bar unten.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  // TriviaDB-Import (Admin)
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [showImportPanel, setShowImportPanel] = useState(false);

  // ── Server-Pagination für Pool-Items (Audit P0): bei 10k+ Items reicht
  // client-cap=500 nicht mehr. Backend unterstützt source/topic/category/
  // search/limit/offset — wir fetchen filter-aware in 500er-Chunks und
  // laden nach wenn Wolf scrollt.
  const POOL_BATCH = 500;
  const buildPoolUrl = (offset: number, limit: number) => {
    const p = new URLSearchParams();
    p.set('limit', String(limit));
    p.set('offset', String(offset));
    if (search.trim())       p.set('search', search.trim());
    if (catFilter !== 'all') p.set('category', catFilter);
    if (topicFilter !== 'all') p.set('topic', topicFilter);
    // sourceFilter: 'mine' = nur drafts → poolFetch komplett skippen,
    // 'pool' = nur Pool → kein category-Filter via source nötig
    // 'all'  = beide → Pool laden ohne source-Param
    return `/api/qq/library/items?${p.toString()}`;
  };

  // Initial load: drafts + usage + pool parallel
  useEffect(() => {
    Promise.all([
      fetch('/api/qq/drafts').then(r => r.json()).catch(() => []),
      fetch('/api/qq/library/usage').then(r => r.json()).catch(() => ({})),
      fetch(buildPoolUrl(0, POOL_BATCH)).then(r => r.json()).catch(() => ({ items: [], total: 0 })),
    ]).then(([draftsData, usageData, poolData]) => {
      if (Array.isArray(draftsData)) setDrafts(draftsData);
      if (usageData && typeof usageData === 'object') setUsageMap(usageData);
      if (poolData && Array.isArray(poolData.items)) {
        setPoolItems(poolData.items);
        setPoolTotal(poolData.total ?? poolData.items.length);
      }
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch wenn filter-relevante Inputs ändern (search/category/topic).
  // Andere Filter (useFilter/phaseFilter/mechFilter/sourceFilter) sind
  // client-side auf das aktuell-geladene Set.
  // Debounce 250ms für search damit nicht bei jedem Tastenanschlag fetchen.
  useEffect(() => {
    const debounce = setTimeout(() => {
      fetch(buildPoolUrl(0, POOL_BATCH)).then(r => r.json()).then(poolData => {
        if (poolData && Array.isArray(poolData.items)) {
          setPoolItems(poolData.items);
          setPoolTotal(poolData.total ?? poolData.items.length);
        }
      }).catch(() => {});
    }, 250);
    return () => clearTimeout(debounce);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, catFilter, topicFilter]);

  async function loadMorePool() {
    try {
      const data = await fetch(buildPoolUrl(poolItems.length, POOL_BATCH)).then(r => r.json());
      if (data && Array.isArray(data.items)) {
        setPoolItems(prev => [...prev, ...data.items]);
        setPoolTotal(data.total ?? poolItems.length + data.items.length);
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // Poll Import-Status während Lauf
  useEffect(() => {
    if (!importStatus?.running) return;
    const t = setInterval(async () => {
      try {
        const r = await fetch('/api/qq/library/import-status');
        const data = await r.json();
        setImportStatus(data);
        // Re-fetch Pool wenn Import läuft (alle 5s sehen wir neue Items)
        const poolRes = await fetch('/api/qq/library/items?limit=500').then(r => r.json()).catch(() => null);
        if (poolRes?.items) {
          setPoolItems(poolRes.items);
          setPoolTotal(poolRes.total ?? poolRes.items.length);
        }
        if (!data.running) clearInterval(t);
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(t);
  }, [importStatus?.running]);

  async function startTriviaDbImport(pin: string, targetCount: number) {
    try {
      const res = await fetch('/api/qq/library/import-triviadb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, targetCount, translate: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast(data.error ?? 'Fehler beim Import-Start');
        return;
      }
      setImportStatus(data.status);
      setToast(`Import gestartet — Ziel: ${targetCount} Fragen`);
    } catch {
      setToast('Fehler beim Import-Start');
    }
  }

  async function recategorizeTriviaDb(pin: string) {
    try {
      const res = await fetch('/api/qq/library/recategorize-triviadb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast(data.error ?? 'Fehler bei Re-Kategorisierung');
        return;
      }
      setToast(`✓ ${data.converted}/${data.scanned} Items zu Schätzchen konvertiert`);
      const poolRes = await fetch('/api/qq/library/items?limit=500').then(r => r.json()).catch(() => null);
      if (poolRes?.items) {
        setPoolItems(poolRes.items);
        setPoolTotal(poolRes.total ?? poolRes.items.length);
      }
    } catch {
      setToast('Fehler bei Re-Kategorisierung');
    }
  }

  async function testDeepl(pin: string) {
    try {
      const res = await fetch('/api/qq/library/test-deepl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.ok) {
        setToast(`✓ DeepL (${data.keyType}) OK: „Hello world" → „${data.sample}"`);
      } else {
        setToast(`✗ DeepL (${data.keyType}): ${data.status ?? ''} ${data.error?.slice(0, 80) ?? 'Fehler'}`);
      }
    } catch {
      setToast('Fehler beim DeepL-Test');
    }
  }

  async function startRetranslate(pin: string) {
    try {
      const res = await fetch('/api/qq/library/retranslate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, maxItems: 5000 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast(data.error ?? 'Fehler beim Re-Translate-Start');
        return;
      }
      setToast(`Re-Translate gestartet — läuft im Hintergrund`);
      // Poll status
      const poll = setInterval(async () => {
        try {
          const sRes = await fetch('/api/qq/library/retranslate-status').then(r => r.json());
          if (!sRes.running) {
            clearInterval(poll);
            setToast(`✓ Re-Translate fertig: ${sRes.translated}/${sRes.scanned} übersetzt`);
            const poolRes = await fetch('/api/qq/library/items?limit=500').then(r => r.json()).catch(() => null);
            if (poolRes?.items) {
              setPoolItems(poolRes.items);
              setPoolTotal(poolRes.total ?? poolRes.items.length);
            }
          }
        } catch { /* ignore */ }
      }, 5000);
    } catch {
      setToast('Fehler beim Re-Translate-Start');
    }
  }

  // Reset Pagination when filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, catFilter, phaseFilter, mechFilter, topicFilter, useFilter, sourceFilter, venueFilter, qSortBy, viewMode]);

  // Drafts-View filter+sort
  const filtered = useMemo(() => {
    let list = [...drafts];
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(d =>
        d.title.toLowerCase().includes(s) ||
        d.questions.some(q => q.text.toLowerCase().includes(s) || q.answer.toLowerCase().includes(s))
      );
    }
    if (statusFilter !== 'all') {
      list = list.filter(d => getDraftStatus(d) === statusFilter);
    }
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

  // Flat-Questions-View — vereint Draft-Fragen + Pool-Library-Items
  type FlatQ = QQQuestion & { draftTitle: string; draftId: string; usage: UsageEntry; source: 'mine' | 'pool' };
  const flatQuestions = useMemo<FlatQ[]>(() => {
    const all: FlatQ[] = [];
    const emptyUsage: UsageEntry = { usageCount: 0, firstUsedAt: 0, lastUsedAt: 0, recentUses: [] };
    // 1. Eigene Fragen aus allen Drafts
    if (sourceFilter !== 'pool') {
      for (const d of drafts) {
        for (const q of d.questions) {
          if (!q.text.trim()) continue;
          all.push({ ...q, draftTitle: d.title, draftId: d.id, usage: usageMap[q.id] ?? emptyUsage, source: 'mine' });
        }
      }
    }
    // 2. Pool-Library-Items — Fallback auf textEn wenn DE leer (TriviaDB hat
    //    oft keine DE-Übersetzung, wenn DeepL-Quota erschöpft war).
    if (sourceFilter !== 'mine') {
      for (const it of poolItems) {
        const hasText = (it.text && it.text.trim()) || (it.textEn && it.textEn.trim());
        if (!hasText) continue;
        const label = it.source === 'triviadb' ? '🌐 TriviaDB Pool'
                    : it.source === 'seed' ? '📚 CozyLibrary Pool'
                    : it.source === 'ai' ? '✨ AI-generiert'
                    : '📚 Pool';
        const hasDe = (it.text && it.text.trim().length > 0);
        const displayText = hasDe ? it.text : (it.textEn ?? '');
        const displayAnswer = (it.answer && it.answer.trim()) ? it.answer : (it.answerEn ?? '');
        all.push({
          ...it,
          text: displayText,
          answer: displayAnswer,
          draftTitle: label,
          draftId: `__pool__${it.id}`,
          usage: usageMap[it.id] ?? emptyUsage,
          source: 'pool',
          _onlyEn: !hasDe,
        });
      }
    }
    let list = all;
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(q =>
        q.text.toLowerCase().includes(s) ||
        q.answer.toLowerCase().includes(s) ||
        q.draftTitle.toLowerCase().includes(s) ||
        (q.topic ?? '').toLowerCase().includes(s) ||
        ((q as any).funFact ?? '').toLowerCase().includes(s)
      );
    }
    if (catFilter !== 'all') list = list.filter(q => q.category === catFilter);
    if (phaseFilter !== 'all') list = list.filter(q => q.phaseIndex === phaseFilter && q.source === 'mine');
    if (mechFilter !== 'all') list = list.filter(q => q.bunteTuete?.kind === mechFilter);
    if (topicFilter !== 'all') {
      list = list.filter(q => (q.topic ?? '').trim().toLowerCase() === topicFilter.toLowerCase());
    }
    if (useFilter === 'unused') list = list.filter(q => q.usage.usageCount === 0);
    else if (useFilter === 'rare') list = list.filter(q => q.usage.usageCount > 0 && q.usage.usageCount <= 2);
    else if (useFilter === 'recent') {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      list = list.filter(q => q.usage.lastUsedAt > cutoff);
    }
    // 2026-07-08 (Wolf): Location-Filter — nur Fragen, die am gewaehlten Ort noch
    // NICHT liefen. So baut Wolf fuer einen Stammort frisch, ohne Wiederholung.
    if (venueFilter) {
      list = list.filter(q => !q.usage.recentUses.some(u => u.venue === venueFilter));
    }
    list.sort((a, b) => {
      switch (qSortBy) {
        case 'unused': return a.usage.usageCount - b.usage.usageCount || a.usage.lastUsedAt - b.usage.lastUsedAt;
        case 'oldest': {
          const al = a.usage.lastUsedAt || 0;
          const bl = b.usage.lastUsedAt || 0;
          if (al === 0 && bl === 0) return 0;
          if (al === 0) return -1;
          if (bl === 0) return 1;
          return al - bl;
        }
        case 'recent': return b.usage.lastUsedAt - a.usage.lastUsedAt;
        case 'most':   return b.usage.usageCount - a.usage.usageCount;
        case 'draft':  return a.draftTitle.localeCompare(b.draftTitle);
      }
    });
    return list;
  }, [drafts, poolItems, usageMap, search, catFilter, phaseFilter, mechFilter, topicFilter, useFilter, sourceFilter, venueFilter, qSortBy]);

  // 2026-07-08 (Wolf): Distinct-Orte aus der Usage-Historie fuer das Location-Dropdown.
  const availableVenues = useMemo(() => {
    const set = new Set<string>();
    for (const u of Object.values(usageMap)) {
      for (const r of u.recentUses ?? []) {
        if (r.venue && r.venue.trim()) set.add(r.venue.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
  }, [usageMap]);

  // Topic-Liste aus allen vorhandenen Fragen aggregieren (Custom-Topics behalten)
  const availableTopics = useMemo(() => {
    const set = new Set<string>();
    for (const d of drafts) for (const q of d.questions) {
      const t = (q.topic ?? '').trim();
      if (t) set.add(t);
    }
    for (const it of poolItems) {
      const t = (it.topic ?? '').trim();
      if (t) set.add(t);
    }
    // QQ_TOPICS-Defaults dazu — egal ob vorhanden, damit Wolf sie zum Erst-Tag-en kann
    for (const t of QQ_TOPICS) set.add(t);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [drafts, poolItems]);

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
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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
          method: 'POST', headers: { 'Content-Type': 'application/json' },
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
      // Bug-Fix 2026-05-23: Slot muss zur Kategorie passen + Slot-Koordinaten
      // (phaseIndex/questionIndexInPhase/category) behalten. Sonst landet das
      // Item unsichtbar in Phase 1 (Default aus dem Library-Seed).
      const slotIndex = draft.questions.findIndex(q =>
        !q.text.trim() && q.category === (question as any).category
      );
      if (slotIndex === -1) {
        setToast(`Kein leerer ${(question as any).category}-Slot im Draft`);
        return;
      }
      const slot = draft.questions[slotIndex];
      const updatedQuestions = [...draft.questions];
      updatedQuestions[slotIndex] = {
        ...question,
        id: slot.id,
        phaseIndex: slot.phaseIndex,
        questionIndexInPhase: slot.questionIndexInPhase,
        category: slot.category,
      };
      const putRes = await fetch(`/api/qq/drafts/${targetDraftId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, questions: updatedQuestions, updatedAt: Date.now() }),
      });
      setToast(putRes.ok ? `✓ Eingefügt in Phase ${slot.phaseIndex}/${slot.category}` : 'Fehler beim Speichern');
    } catch {
      setToast('Fehler beim Kopieren');
    }
  }

  // 2026-05-11 (Audit P0): Bulk-Copy aller selectedIds in den Ziel-Draft.
  // Macht 2 Roundtrips total (GET + PUT) statt 2N. Bei Slot-Mangel füllt sich
  // bis voll, gibt Status zurück wie viele eingefügt wurden.
  async function bulkCopyToDraft() {
    if (!targetDraftId || selectedIds.size === 0) return;
    try {
      const res = await fetch(`/api/qq/drafts/${targetDraftId}`);
      if (!res.ok) { setToast('Fehler: Draft nicht gefunden'); return; }
      const draft: QQDraft = await res.json();
      // Alle ausgewählten Fragen aus poolItems/Draft-Fragen sammeln
      const questionsToInsert: QQQuestion[] = [];
      for (const id of selectedIds) {
        const fromPool = poolItems.find(p => p.id === id);
        if (fromPool) { questionsToInsert.push(fromPool as any); continue; }
        for (const d of drafts) {
          const q = d.questions.find(qq => qq.id === id);
          if (q) { questionsToInsert.push(q); break; }
        }
      }
      const updatedQuestions = [...draft.questions];
      let inserted = 0;
      // Bug-Fix 2026-05-23: pro Kategorie passenden leeren Slot finden,
      // Slot-Koordinaten behalten. Sonst landen Items unsichtbar in Phase 1.
      for (const q of questionsToInsert) {
        const slotIndex = updatedQuestions.findIndex(s =>
          !s.text.trim() && s.category === (q as any).category
        );
        if (slotIndex === -1) continue; // kein passender freier Slot → skip
        const slot = updatedQuestions[slotIndex];
        updatedQuestions[slotIndex] = {
          ...q,
          id: slot.id,
          phaseIndex: slot.phaseIndex,
          questionIndexInPhase: slot.questionIndexInPhase,
          category: slot.category,
        };
        inserted++;
      }
      const putRes = await fetch(`/api/qq/drafts/${targetDraftId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, questions: updatedQuestions, updatedAt: Date.now() }),
      });
      if (putRes.ok) {
        if (inserted < selectedIds.size) {
          setToast(`✓ ${inserted}/${selectedIds.size} eingefügt — Draft voll`);
        } else {
          setToast(`✓ ${inserted} Fragen eingefügt`);
        }
        setSelectedIds(new Set());
      } else {
        setToast('Fehler beim Speichern');
      }
    } catch {
      setToast('Fehler beim Bulk-Kopieren');
    }
  }

  // Stats
  const totalDrafts = drafts.length;
  const completeDrafts = drafts.filter(d => getDraftStatus(d) === 'complete').length;
  const totalQuestions = drafts.reduce((sum, d) => sum + d.questions.filter(q => q.text.trim()).length, 0);
  const playedQuestions = Object.keys(usageMap).length;
  const unusedQuestions = totalQuestions - playedQuestions;
  const poolCount = poolTotal || poolItems.length;

  return (
    <div style={{ minHeight: '100vh', background: QQ_COLORS.slate900, color: QQ_COLORS.slate200, fontFamily: "'Nunito', system-ui, sans-serif" }}>
      {/* 2026-05-11 (Audit P0): Floating Action Bar bei Multi-Select aktiv.
          Bottom-zentriert, zeigt Anzahl + Bulk-Copy + Auswahl-Reset. */}
      {selectedIds.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 24, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 20px', borderRadius: 999,
          background: 'rgba(15,23,42,0.95)',
          border: '1.5px solid rgba(59,130,246,0.5)',
          boxShadow: '0 12px 36px rgba(0,0,0,0.55), 0 0 24px rgba(59,130,246,0.35)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 1000,
          fontSize: 13, fontWeight: 800, color: QQ_COLORS.slate100, fontFamily: 'inherit',
        }}>
          <span style={{ color: QQ_COLORS.blue400 }}>✓ {selectedIds.size} Fragen ausgewählt</span>
          <button
            onClick={bulkCopyToDraft}
            disabled={!targetDraftId}
            title={targetDraftId ? `In Ziel-Draft kopieren` : 'Erst Ziel-Draft oben auswählen'}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              cursor: targetDraftId ? 'pointer' : 'not-allowed',
              fontWeight: 900, fontSize: 13, fontFamily: 'inherit',
              background: targetDraftId ? QQ_COLORS.blue500 : 'rgba(255,255,255,0.06)',
              color: targetDraftId ? '#fff' : QQ_COLORS.slate600,
            }}
          >📋 In Draft kopieren</button>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{
              padding: '8px 12px', borderRadius: 8, border: 'none',
              cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
              background: 'rgba(255,255,255,0.06)', color: QQ_COLORS.slate400,
            }}
          >✕ Auswahl löschen</button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: QQ_COLORS.green500, color: '#fff', fontWeight: 800, fontSize: 14,
          padding: '10px 24px', borderRadius: 10, zIndex: 9999,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)', pointerEvents: 'none',
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '20px 24px', background: QQ_COLORS.slate800, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/menu')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: 'rgba(255,255,255,0.07)', color: QQ_COLORS.slate400 }}>← Menü</button>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>📚 CozyLibrary</h1>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setShowImportPanel(p => !p)} style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13,
              background: showImportPanel ? QQ_COLORS.violet400 : 'rgba(168,139,250,0.18)',
              color: showImportPanel ? '#fff' : QQ_COLORS.violet400,
            }}>
              ⬇️ Pool erweitern (TriviaDB)
            </button>
            <button onClick={importDraft} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: QQ_COLORS.blue500, color: '#fff' }}>📥 Draft importieren</button>
            <button onClick={() => navigate('/builder')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: QQ_COLORS.green500, color: '#fff' }}>+ Neuer Fragensatz</button>
          </div>
        </div>

        {/* TriviaDB-Import-Panel */}
        {showImportPanel && (
          <ImportPanel
            status={importStatus}
            onStart={startTriviaDbImport}
            onRecategorize={recategorizeTriviaDb}
            onTestDeepl={testDeepl}
            onRetranslate={startRetranslate}
          />
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: QQ_COLORS.slate500 }}><span style={{ fontWeight: 900, color: QQ_COLORS.slate200, fontSize: 18 }}>{totalDrafts}</span> Fragensätze</div>
          <div style={{ fontSize: 13, color: QQ_COLORS.slate500 }}><span style={{ fontWeight: 900, color: QQ_COLORS.green500, fontSize: 18 }}>{completeDrafts}</span> komplett</div>
          <div style={{ fontSize: 13, color: QQ_COLORS.slate500 }}><span style={{ fontWeight: 900, color: QQ_COLORS.blue500, fontSize: 18 }}>{totalQuestions}</span> in meinen Quizzen</div>
          <div style={{ fontSize: 13, color: QQ_COLORS.slate500 }}><span style={{ fontWeight: 900, color: QQ_COLORS.violet400, fontSize: 18 }}>{poolCount}</span> 📚 Pool-Fragen</div>
          <div style={{ fontSize: 13, color: QQ_COLORS.slate500 }}><span style={{ fontWeight: 900, color: QQ_COLORS.brandPink, fontSize: 18 }}>{playedQuestions}</span> schon gespielt</div>
          <div style={{ fontSize: 13, color: QQ_COLORS.slate500 }}><span style={{ fontWeight: 900, color: QQ_COLORS.amber500, fontSize: 18 }}>{unusedQuestions}</span> noch frisch</div>
        </div>

        {/* Ziel-Draft Selektor */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: QQ_COLORS.slate400 }}>📋 In Draft kopieren:</span>
          <select
            value={targetDraftId ?? ''}
            onChange={e => setTargetDraftId(e.target.value || null)}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: QQ_COLORS.slate200, fontFamily: 'inherit', fontSize: 13, minWidth: 220 }}
          >
            <option value="">Ziel-Draft wählen…</option>
            {drafts.map(d => (
              <option key={d.id} value={d.id}>{d.title || 'Ohne Titel'}</option>
            ))}
          </select>
          {targetDraftId && (
            <span style={{ fontSize: 12, color: QQ_COLORS.slate500 }}>Klick auf 📋 Kopieren bei einer Frage unten</span>
          )}
        </div>
      </div>

      {/* View Toggle + Filters */}
      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, width: 'fit-content' }}>
          {([['questions', '🔍 Alle Fragen'], ['drafts', '📋 Fragensätze']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setViewMode(v)} style={{
              padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
              background: viewMode === v ? QQ_COLORS.blue500 : 'transparent',
              color: viewMode === v ? '#fff' : QQ_COLORS.slate500,
            }}>{label}</button>
          ))}
        </div>

        {/* 2026-05-11 (Audit P0): Active-Filter-Bar — zeigt aktive Filter
            kompakt + Reset-Button. Vorher musste Wolf bei 5 aktiven Filtern
            jede Filter-Reihe einzeln zurücksetzen. */}
        {viewMode === 'questions' && (sourceFilter !== 'all' || useFilter !== 'all' || topicFilter !== 'all' || catFilter !== 'all' || phaseFilter !== 'all' || mechFilter !== 'all' || search.trim() !== '') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '6px 10px', borderRadius: 8, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: QQ_COLORS.blue400, letterSpacing: '0.05em' }}>AKTIV:</span>
            {search.trim() && <span style={{ fontSize: 11, color: QQ_COLORS.slate300 }}>„{search.trim()}"</span>}
            {sourceFilter !== 'all' && <span style={{ fontSize: 11, color: QQ_COLORS.slate300 }}>{sourceFilter === 'mine' ? '📋 Meine' : '📚 Pool'}</span>}
            {useFilter !== 'all' && <span style={{ fontSize: 11, color: QQ_COLORS.slate300 }}>{useFilter}</span>}
            {topicFilter !== 'all' && <span style={{ fontSize: 11, color: QQ_COLORS.slate300 }}>{topicFilter}</span>}
            {catFilter !== 'all' && <span style={{ fontSize: 11, color: QQ_COLORS.slate300 }}>{catFilter}</span>}
            {phaseFilter !== 'all' && <span style={{ fontSize: 11, color: QQ_COLORS.slate300 }}>R{phaseFilter}</span>}
            {mechFilter !== 'all' && <span style={{ fontSize: 11, color: QQ_COLORS.slate300 }}>{mechFilter}</span>}
            <button
              onClick={() => {
                setSearch(''); setSourceFilter('all'); setUseFilter('all');
                setTopicFilter('all'); setCatFilter('all'); setPhaseFilter('all'); setMechFilter('all');
              }}
              style={{
                marginLeft: 'auto', padding: '4px 10px', borderRadius: 6, border: 'none',
                background: 'rgba(239,68,68,0.18)', color: QQ_COLORS.red300,
                fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >✕ Filter zurücksetzen</button>
          </div>
        )}

        {/* Search + draft-level filters */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={viewMode === 'drafts' ? '🔍 Suchen (Titel, Frage, Antwort)…' : '🔍 Frage, Antwort, Topic, Quiz-Titel (auch EN)…'}
            style={{ flex: 1, minWidth: 200, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: QQ_COLORS.slate200, fontFamily: 'inherit', fontSize: 14 }}
          />
          {viewMode === 'drafts' && (
            <>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as DraftStatus)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: QQ_COLORS.slate200, fontFamily: 'inherit', fontSize: 13 }}>
                <option value="all">Alle Status</option>
                <option value="complete">✅ Komplett</option>
                <option value="incomplete">⏳ In Arbeit</option>
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: QQ_COLORS.slate200, fontFamily: 'inherit', fontSize: 13 }}>
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </>
          )}
          {viewMode === 'questions' && (
            <select value={qSortBy} onChange={e => setQSortBy(e.target.value as QSortKey)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: QQ_COLORS.slate200, fontFamily: 'inherit', fontSize: 13 }}>
              {Q_SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
        </div>

        {/* Question-level filters */}
        {viewMode === 'questions' && (
          <>
            {/* Source-Filter (Hauptdimension für Wolf "meine Fragen vs. Pool") */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: QQ_COLORS.slate500, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>Quelle:</span>
              {([
                ['all',  'Alle',                QQ_COLORS.slate600],
                ['mine', '📋 Meine Quizze',     QQ_COLORS.blue500],
                ['pool', '📚 CozyLibrary Pool', QQ_COLORS.violet400],
              ] as const).map(([v, label, color]) => {
                const active = sourceFilter === v;
                return (
                  <button key={v} onClick={() => setSourceFilter(v as SourceFilter)} style={{
                    padding: '4px 12px', borderRadius: 6, border: `1px solid ${active ? color : 'transparent'}`,
                    cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
                    background: active ? color + '22' : 'rgba(255,255,255,0.05)',
                    color: active ? color : QQ_COLORS.slate400,
                  }}>{label}</button>
                );
              })}
            </div>

            {/* Use-Filter (Hauptdimension für Wolf "was hab ich noch nicht gespielt") */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: QQ_COLORS.slate500, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>Häufigkeit:</span>
              {([
                ['all',    'Alle',          QQ_COLORS.slate600],
                ['unused', 'Nie gespielt',  QQ_COLORS.amber500],
                ['rare',   '1–2× gespielt', QQ_COLORS.violet400],
                ['recent', 'In letzten 30 T', QQ_COLORS.brandPink],
              ] as const).map(([v, label, color]) => {
                const active = useFilter === v;
                return (
                  <button key={v} onClick={() => setUseFilter(v as UseFilter)} style={{
                    padding: '4px 12px', borderRadius: 6, border: `1px solid ${active ? color : 'transparent'}`,
                    cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
                    background: active ? color + '22' : 'rgba(255,255,255,0.05)',
                    color: active ? color : QQ_COLORS.slate400,
                  }}>{label}</button>
                );
              })}
            </div>

            {/* 📍 Location-Filter — nur wenn Orte getaggt sind. Aktiv = zeigt NUR
                Fragen, die an diesem Ort noch nie liefen (frisch bauen ohne Wdh.). */}
            {availableVenues.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: QQ_COLORS.slate500, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>📍 Ort:</span>
                <button onClick={() => setVenueFilter('')} style={{
                  padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
                  background: venueFilter === '' ? QQ_COLORS.slate600 : 'rgba(255,255,255,0.05)',
                  color: venueFilter === '' ? '#fff' : QQ_COLORS.slate500,
                }}>Alle</button>
                {availableVenues.map(v => {
                  const active = venueFilter === v;
                  return (
                    <button key={v} onClick={() => setVenueFilter(active ? '' : v)} style={{
                      padding: '4px 10px', borderRadius: 6, border: `1px solid ${active ? QQ_COLORS.brandPink : 'transparent'}`, cursor: 'pointer',
                      fontWeight: 700, fontSize: 11, fontFamily: 'inherit',
                      background: active ? QQ_COLORS.brandPink + '22' : 'rgba(255,255,255,0.04)',
                      color: active ? QQ_COLORS.brandPink : QQ_COLORS.slate400,
                    }}>{v}</button>
                  );
                })}
                {venueFilter && (
                  <span style={{ fontSize: 11, color: QQ_COLORS.brandPink, fontWeight: 700 }}>
                    → nur Fragen, die bei „{venueFilter}" noch nie liefen
                  </span>
                )}
              </div>
            )}

            {/* Topic-Filter */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: QQ_COLORS.slate500, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>Topic:</span>
              <button onClick={() => setTopicFilter('all')} style={{
                padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
                background: topicFilter === 'all' ? QQ_COLORS.slate600 : 'rgba(255,255,255,0.05)',
                color: topicFilter === 'all' ? '#fff' : QQ_COLORS.slate500,
              }}>Alle</button>
              {availableTopics.map(t => {
                const active = topicFilter === t;
                return (
                  <button key={t} onClick={() => setTopicFilter(active ? 'all' : t)} style={{
                    padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: 11, fontFamily: 'inherit',
                    background: active ? '#0EA5E9' + '22' : 'rgba(255,255,255,0.04)',
                    color: active ? '#7DD3FC' : QQ_COLORS.slate400,
                  }}>{t}</button>
                );
              })}
            </div>

            {/* Kategorie + Phase + Mechanik */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: QQ_COLORS.slate500, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>Mechanik:</span>
              <button onClick={() => setCatFilter('all')} style={{
                padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
                background: catFilter === 'all' ? QQ_COLORS.slate600 : 'rgba(255,255,255,0.05)',
                color: catFilter === 'all' ? '#fff' : QQ_COLORS.slate500,
              }}>Alle</button>
              {(['SCHAETZCHEN', 'MUCHO', 'BUNTE_TUETE', 'ZEHN_VON_ZEHN', 'CHEESE'] as QQCategory[]).map(cat => {
                const l = QQ_CATEGORY_LABELS[cat];
                const c = QQ_CATEGORY_COLORS[cat];
                const active = catFilter === cat;
                return (
                  <button key={cat} onClick={() => setCatFilter(active ? 'all' : cat)} style={{
                    padding: '4px 12px', borderRadius: 6, border: `1px solid ${active ? c : 'transparent'}`,
                    cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
                    background: active ? c + '22' : 'rgba(255,255,255,0.05)',
                    color: active ? c : QQ_COLORS.slate400,
                  }}>{l.emoji} {l.de}</button>
                );
              })}
              <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)' }} />
              {[1, 2, 3].map(p => (
                <button key={p} onClick={() => setPhaseFilter(phaseFilter === p ? 'all' : p)} style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
                  background: phaseFilter === p ? '#6366F1' + '33' : 'rgba(255,255,255,0.05)',
                  color: phaseFilter === p ? '#818CF8' : QQ_COLORS.slate500,
                }}>R{p}</button>
              ))}
              {(catFilter === 'BUNTE_TUETE' || catFilter === 'all') && (
                <>
                  <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)' }} />
                  {(['hotPotato', 'top5', 'oneOfEight', 'order', 'map', 'onlyConnect', 'bluff'] as QQBunteTueteKind[]).map(mk => {
                    const ml = QQ_BUNTE_TUETE_LABELS[mk];
                    const active = mechFilter === mk;
                    return (
                      <button key={mk} onClick={() => setMechFilter(active ? 'all' : mk)} style={{
                        padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                        fontWeight: 700, fontSize: 11, fontFamily: 'inherit',
                        background: active ? QQ_COLORS.red500 + '22' : 'rgba(255,255,255,0.04)',
                        color: active ? '#F87171' : QQ_COLORS.slate600,
                      }}>{ml.emoji} {ml.de}</button>
                    );
                  })}
                </>
              )}
              <div style={{ marginLeft: 'auto', fontSize: 12, color: QQ_COLORS.slate500, fontWeight: 700 }}>
                {flatQuestions.length} Frage{flatQuestions.length !== 1 ? 'n' : ''}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ═══ DRAFTS VIEW ═══ */}
      {viewMode === 'drafts' && (
      <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: QQ_COLORS.slate600 }}>Lade…</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: QQ_COLORS.slate600 }}>
            {search || statusFilter !== 'all' ? 'Keine Ergebnisse' : 'Noch keine Fragensätze vorhanden'}
          </div>
        )}
        {filtered.map(d => {
          const stats = getDraftStats(d);
          const status = getDraftStatus(d);
          const isExpanded = expandedId === d.id;
          const progress = stats.total > 0 ? stats.filled / stats.total : 0;
          return (
            <div key={d.id} style={{ background: QQ_COLORS.slate800, borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', transition: 'all 0.15s' }}>
              <div onClick={() => setExpandedId(isExpanded ? null : d.id)} style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 24 }}>{status === 'complete' ? '✅' : '📝'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 16, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{d.title || 'Ohne Titel'}</div>
                  <div style={{ fontSize: 12, color: QQ_COLORS.slate500, marginTop: 2 }}>
                    {d.phases} Runden · {stats.filled}/{stats.total} Fragen · {d.language.toUpperCase()} · {new Date(d.updatedAt).toLocaleDateString('de-DE')}
                  </div>
                </div>
                <div style={{ width: 100, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                  <div style={{ width: `${progress * 100}%`, height: '100%', borderRadius: 3, background: progress >= 1 ? QQ_COLORS.green500 : QQ_COLORS.blue500, transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: progress >= 1 ? QQ_COLORS.green500 : QQ_COLORS.slate500, minWidth: 40, textAlign: 'right' }}>{Math.round(progress * 100)}%</div>
                <div style={{ fontSize: 16, color: QQ_COLORS.slate600, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</div>
              </div>
              {isExpanded && (
                <div style={{ padding: '0 20px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
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
                      <div style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', fontSize: 11, fontWeight: 700, color: QQ_COLORS.slate400 }}>
                        🖼 {stats.withImage} Bilder
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 12, maxHeight: 300, overflow: 'auto' }}>
                    {d.questions.filter(q => q.text.trim()).map((q) => {
                      const usage = usageMap[q.id];
                      return (
                        <div key={q.id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: 8, fontSize: 12, alignItems: 'center' }}>
                          <span style={{ color: QQ_CATEGORY_COLORS[q.category], fontWeight: 800, minWidth: 20 }}>{QQ_CATEGORY_LABELS[q.category].emoji}</span>
                          <span style={{ color: QQ_COLORS.slate400, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{q.text}</span>
                          {usage && usage.usageCount > 0 && (
                            <span title={`Zuletzt: ${formatRelative(usage.lastUsedAt)}`} style={{ padding: '1px 6px', borderRadius: 4, background: 'rgba(236,72,153,0.15)', fontSize: 10, fontWeight: 800, color: QQ_COLORS.brandPinkMid }}>{usage.usageCount}×</span>
                          )}
                          <span style={{ color: QQ_COLORS.green500, fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 150 }}>{q.answer}</span>
                          <button onClick={(e) => { e.stopPropagation(); copyQuestionToDraft(q); }} disabled={!targetDraftId} title={targetDraftId ? 'In Ziel-Draft kopieren' : 'Erst Ziel-Draft auswählen'} style={{
                            padding: '3px 10px', borderRadius: 6, border: 'none', cursor: targetDraftId ? 'pointer' : 'not-allowed',
                            fontWeight: 700, fontSize: 11, flexShrink: 0,
                            background: targetDraftId ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.04)',
                            color: targetDraftId ? QQ_COLORS.blue400 : QQ_COLORS.slate600, fontFamily: 'inherit',
                          }}>📋 Kopieren</button>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                    <button onClick={() => navigate('/builder')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: QQ_COLORS.blue500, color: '#fff' }}>✏️ Bearbeiten</button>
                    <button onClick={() => duplicateDraft(d)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: 'rgba(255,255,255,0.07)', color: QQ_COLORS.slate400 }}>📋 Duplizieren</button>
                    <button onClick={() => exportDraft(d)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: 'rgba(255,255,255,0.07)', color: QQ_COLORS.slate400 }}>📤 Export JSON</button>
                    <button onClick={() => deleteDraft(d.id)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: 'rgba(239,68,68,0.15)', color: QQ_COLORS.red500 }}>🗑 Löschen</button>
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
        {loading && <div style={{ textAlign: 'center', padding: 40, color: QQ_COLORS.slate600 }}>Lade…</div>}
        {!loading && flatQuestions.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: QQ_COLORS.slate600 }}>Keine Fragen gefunden</div>
        )}
        {flatQuestions.slice(0, visibleCount).map((q, i) => {
          const isExp = expandedQuestionId === q.id;
          const uc = q.usage.usageCount;
          const usedColor = uc === 0 ? QQ_COLORS.amber500 : uc <= 2 ? QQ_COLORS.violet400 : uc <= 5 ? QQ_COLORS.brandPink : QQ_COLORS.red500;
          const isSelected = selectedIds.has(q.id);
          return (
            <div key={`${q.draftId}-${q.id}`} style={{
              background: isSelected ? 'rgba(59,130,246,0.15)' : i % 2 === 0 ? QQ_COLORS.slate800 : '#1a2332',
              borderRadius: 8, padding: '8px 14px',
              display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12,
              border: isSelected ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.04)',
              transition: 'background 0.15s, border-color 0.15s',
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {/* 2026-05-11: Multi-Select-Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(q.id)}
                  title="Auswählen für Bulk-Kopie"
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: QQ_COLORS.blue500, flexShrink: 0 }}
                />
                <span style={{ color: QQ_CATEGORY_COLORS[q.category], fontWeight: 800, fontSize: 16, minWidth: 22 }}>
                  {QQ_CATEGORY_LABELS[q.category].emoji}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* 2026-05-11 (Audit P0): 2-Zeilen-Layout statt nowrap-ellipsis.
                      Vorher wurden Fragen auf 40% Breite gestaucht weil 9 Badges
                      rechts Platz fraßen. Jetzt darf Frage 2 Zeilen brechen — Wolf
                      kann tatsächlich lesen was er ranzieht. */}
                  <div style={{
                    color: QQ_COLORS.slate200, fontWeight: 600,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const,
                    overflow: 'hidden',
                    lineHeight: 1.3,
                  }}>{q.text}</div>
                  <div style={{ color: QQ_COLORS.green500, fontSize: 11, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', marginTop: 2 }}>✓ {q.answer}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  {/* Topic-Badge */}
                  {q.topic && (
                    <span style={{ padding: '2px 7px', borderRadius: 4, background: 'rgba(14,165,233,0.15)', fontSize: 10, fontWeight: 800, color: '#7DD3FC' }}>
                      {q.topic}
                    </span>
                  )}
                  {/* Use-Count-Badge */}
                  <button
                    onClick={() => setExpandedQuestionId(isExp ? null : q.id)}
                    title={uc === 0 ? 'Noch nie gespielt' : `Zuletzt: ${formatRelative(q.usage.lastUsedAt)} · Klick für Verlauf`}
                    style={{
                      padding: '2px 8px', borderRadius: 4, border: 'none',
                      background: uc === 0 ? 'rgba(245,158,11,0.18)' : `${usedColor}22`,
                      fontSize: 10, fontWeight: 900, color: usedColor,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {uc === 0 ? '✨ NEU' : `${uc}×`}
                  </button>
                  {q.usage.lastUsedAt > 0 && (
                    <span style={{ fontSize: 10, color: QQ_COLORS.slate500, minWidth: 60 }}>{formatRelative(q.usage.lastUsedAt)}</span>
                  )}
                  {q.source === 'mine' && (
                    <span style={{ padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', fontSize: 10, fontWeight: 800, color: QQ_COLORS.slate500 }}>R{q.phaseIndex}</span>
                  )}
                  {q.source === 'pool' && (
                    <span style={{ padding: '2px 7px', borderRadius: 4, background: 'rgba(168,139,250,0.15)', fontSize: 10, fontWeight: 800, color: QQ_COLORS.violet400 }}>📚 Pool</span>
                  )}
                  {/* EN-Badge wenn Frage nur englischen Text hat (TriviaDB ohne DeepL-Quota) */}
                  {(q as any)._onlyEn && (
                    <span title="Nur Englisch — beim Import in deinen Quiz mit Translate-Button übersetzen" style={{ padding: '2px 7px', borderRadius: 4, background: 'rgba(251,146,60,0.15)', fontSize: 10, fontWeight: 800, color: '#FB923C' }}>🌐 EN</span>
                  )}
                  {q.category === 'BUNTE_TUETE' && q.bunteTuete?.kind && (
                    <span style={{ padding: '2px 7px', borderRadius: 4, background: 'rgba(168,85,247,0.15)', fontSize: 10, fontWeight: 800, color: '#a855f7' }}>
                      {QQ_BUNTE_TUETE_LABELS[q.bunteTuete.kind]?.emoji}
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: QQ_COLORS.slate600, maxWidth: 110, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }} title={q.draftTitle}>
                    📄 {q.draftTitle}
                  </span>
                  <button onClick={() => copyQuestionToDraft(q)} disabled={!targetDraftId} title={targetDraftId ? 'In Ziel-Draft kopieren' : 'Erst Ziel-Draft auswählen'} style={{
                    padding: '3px 10px', borderRadius: 6, border: 'none', cursor: targetDraftId ? 'pointer' : 'not-allowed',
                    fontWeight: 700, fontSize: 11, flexShrink: 0,
                    background: targetDraftId ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.04)',
                    color: targetDraftId ? QQ_COLORS.blue400 : QQ_COLORS.slate600, fontFamily: 'inherit',
                  }}>📋</button>
                </div>
              </div>

              {/* Expanded: Fun-Fact + recent-uses Liste */}
              {isExp && (
                <div style={{ paddingLeft: 32, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(q as any).funFact && (
                    <div style={{ fontSize: 12, color: QQ_COLORS.slate300, lineHeight: 1.5, padding: '8px 12px', borderRadius: 6, background: 'rgba(168,139,250,0.08)', border: '1px solid rgba(168,139,250,0.2)' }}>
                      <span style={{ fontWeight: 800, color: QQ_COLORS.violet400, marginRight: 6 }}>💡 Fun-Fact:</span>
                      {(q as any).funFact}
                    </div>
                  )}
                  {q.usage.recentUses.length > 0 && (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 800, color: QQ_COLORS.slate400, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>
                        Letzte {Math.min(q.usage.recentUses.length, 10)} Einsätze:
                      </div>
                      {q.usage.recentUses.slice(-10).reverse().map((u, idx) => (
                        <div key={idx} style={{ fontSize: 11, color: QQ_COLORS.slate500, display: 'flex', gap: 8 }}>
                          <span style={{ minWidth: 80 }}>{new Date(u.playedAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          <span style={{ color: QQ_COLORS.slate400 }}>{u.draftTitle || '(unbekanntes Quiz)'}</span>
                          {u.roomCode && <span style={{ color: QQ_COLORS.slate600 }}>· Room {u.roomCode}</span>}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Mehr-Laden-Buttons: client-side (mehr aus geladenem Set rendern) +
            server-side (nächsten 500er-Chunk vom Backend holen). 2 separate
            Buttons damit Wolf sieht WAS passiert. */}
        {!loading && flatQuestions.length > visibleCount && (
          <button onClick={() => setVisibleCount(c => c + PAGE_SIZE)} style={{
            margin: '12px auto 0', padding: '8px 24px', borderRadius: 8, border: 'none',
            background: QQ_COLORS.blue500, color: '#fff', fontWeight: 800, fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            +{Math.min(PAGE_SIZE, flatQuestions.length - visibleCount)} weitere Fragen anzeigen
          </button>
        )}
        {!loading && poolItems.length < poolTotal && sourceFilter !== 'mine' && (
          <button onClick={loadMorePool} style={{
            margin: '6px auto', padding: '8px 24px', borderRadius: 8, border: 'none',
            background: 'rgba(168,139,250,0.18)', color: QQ_COLORS.violet400,
            fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            📚 {poolTotal - poolItems.length} Pool-Fragen vom Server nachladen
          </button>
        )}
      </div>
      )}
    </div>
  );
}

// ── ImportPanel — Admin TriviaDB-Import ─────────────────────────────────────
function ImportPanel({
  status,
  onStart,
  onRecategorize,
  onTestDeepl,
  onRetranslate,
}: {
  status: ImportStatus | null;
  onStart: (pin: string, targetCount: number) => void;
  onRecategorize: (pin: string) => void;
  onTestDeepl: (pin: string) => void;
  onRetranslate: (pin: string) => void;
}) {
  const [translationStats, setTranslationStats] = useState<{ total: number; withDe: number; withoutDe: number; deeplKeyPresent: boolean; deeplKeyType: string } | null>(null);
  useEffect(() => {
    fetch('/api/qq/library/translation-stats').then(r => r.json()).then(setTranslationStats).catch(() => {});
  }, []);
  const [pin, setPin] = useState('');
  const [targetCount, setTargetCount] = useState(500);
  const running = status?.running ?? false;
  const progressPct = status?.targetTotal ? Math.min(100, Math.round((status.importedTotal / status.targetTotal) * 100)) : 0;

  return (
    <div style={{
      marginTop: 14, padding: '14px 16px', borderRadius: 10,
      background: 'rgba(168,139,250,0.08)', border: '1px solid rgba(168,139,250,0.25)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: QQ_COLORS.violet400 }}>📚 Pool erweitern — OpenTriviaDB-Import</span>
        <span style={{ fontSize: 11, color: QQ_COLORS.slate500 }}>
          Lädt frei lizenzierte Trivia-Fragen (CC BY-SA), übersetzt via DeepL
        </span>
      </div>

      {/* Translation-Stats */}
      {translationStats && translationStats.total > 0 && (
        <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 6, background: 'rgba(0,0,0,0.2)', fontSize: 12, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: QQ_COLORS.slate500 }}>TriviaDB-Items:</span>
          <span><b style={{ color: QQ_COLORS.violet400 }}>{translationStats.total}</b> gesamt</span>
          <span><b style={{ color: QQ_COLORS.green500 }}>{translationStats.withDe}</b> DE übersetzt</span>
          <span><b style={{ color: '#FB923C' }}>{translationStats.withoutDe}</b> 🌐 nur EN</span>
          <span style={{ marginLeft: 'auto', color: QQ_COLORS.slate500 }}>
            DeepL-Key: {translationStats.deeplKeyPresent
              ? <b style={{ color: translationStats.deeplKeyType === 'pro' ? '#0EA5E9' : QQ_COLORS.violet400 }}>{translationStats.deeplKeyType.toUpperCase()}</b>
              : <b style={{ color: QQ_COLORS.red500 }}>FEHLT</b>}
          </span>
        </div>
      )}

      {!running && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="Admin-PIN"
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: QQ_COLORS.slate200, fontFamily: 'inherit', fontSize: 13, width: 140 }}
          />
          <select
            value={targetCount}
            onChange={e => setTargetCount(parseInt(e.target.value, 10))}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: QQ_COLORS.slate200, fontFamily: 'inherit', fontSize: 13 }}
          >
            <option value={500}>500 Fragen (~5 Min)</option>
            <option value={1000}>1.000 Fragen (~10 Min)</option>
            <option value={2500}>2.500 Fragen (~25 Min)</option>
            <option value={5000}>5.000 Fragen (~50 Min)</option>
          </select>
          <button
            onClick={() => onStart(pin, targetCount)}
            disabled={!pin}
            style={{
              padding: '7px 16px', borderRadius: 8, border: 'none',
              cursor: pin ? 'pointer' : 'not-allowed',
              fontWeight: 800, fontSize: 13, fontFamily: 'inherit',
              background: pin ? QQ_COLORS.violet400 : 'rgba(255,255,255,0.04)',
              color: pin ? '#fff' : QQ_COLORS.slate600,
            }}
          >
            ⬇️ Import starten
          </button>
          <button
            onClick={() => onRecategorize(pin)}
            disabled={!pin}
            title="Bestehende TriviaDB-Items mit Zahlen-Antworten zu Schätzchen-Fragen konvertieren"
            style={{
              padding: '7px 16px', borderRadius: 8, border: 'none',
              cursor: pin ? 'pointer' : 'not-allowed',
              fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
              background: pin ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.04)',
              color: pin ? QQ_COLORS.amber500 : QQ_COLORS.slate600,
            }}
          >
            🔄 Re-kategorisieren (Schätzchen erkennen)
          </button>
          <button
            onClick={() => onTestDeepl(pin)}
            disabled={!pin}
            title="Prüft ob DeepL-Key funktioniert (1 Test-Übersetzung)"
            style={{
              padding: '7px 16px', borderRadius: 8, border: 'none',
              cursor: pin ? 'pointer' : 'not-allowed',
              fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
              background: pin ? 'rgba(14,165,233,0.18)' : 'rgba(255,255,255,0.04)',
              color: pin ? '#0EA5E9' : QQ_COLORS.slate600,
            }}
          >
            🩺 DeepL-Test
          </button>
          <button
            onClick={() => onRetranslate(pin)}
            disabled={!pin}
            title="Versucht alle EN-only Items via DeepL ins Deutsche zu übersetzen (rate-limited)"
            style={{
              padding: '7px 16px', borderRadius: 8, border: 'none',
              cursor: pin ? 'pointer' : 'not-allowed',
              fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
              background: pin ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.04)',
              color: pin ? QQ_COLORS.green500 : QQ_COLORS.slate600,
            }}
          >
            🌐 Re-Translate (DeepL)
          </button>
          {status?.finishedAt && (
            <span style={{ fontSize: 11, color: QQ_COLORS.slate500 }}>
              Letzter Lauf: {status.importedTotal} importiert, {status.translatedTotal} übersetzt
              {status.errors.length > 0 && ` · ${status.errors.length} Fehler`}
            </span>
          )}
        </div>
      )}

      {running && status && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
            <span style={{ fontWeight: 800, color: QQ_COLORS.violet400 }}>
              ⏳ Läuft… {status.importedTotal} / {status.targetTotal} importiert ({progressPct}%)
            </span>
            <span style={{ color: QQ_COLORS.slate500 }}>
              {status.translatedTotal} übersetzt · Batch: {status.lastBatch} · seit {Math.round((Date.now() - status.startedAt) / 1000)}s
            </span>
          </div>
          <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>
            <div style={{ width: `${progressPct}%`, height: '100%', borderRadius: 4, background: QQ_COLORS.violet400, transition: 'width 0.5s' }} />
          </div>
          {status.errors.length > 0 && (
            <div style={{ fontSize: 11, color: '#F87171' }}>
              ⚠ {status.errors.length} Fehler — letzter: {status.errors[status.errors.length - 1]?.slice(0, 100)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
