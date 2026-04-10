import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Shared tab bar (Builder ↔ Editor) ─────────────────────────────────────────
function QQEditorTabs({ active, draftId, onSave }: { active: 'builder' | 'editor'; draftId?: string; onSave?: () => void }) {
  const navigate = useNavigate();
  const tabs = [
    { id: 'builder', label: '📋 Fragen',  path: '/builder' },
    { id: 'editor',  label: '🎨 Design',  path: `/slides?draft=${draftId}` },
  ] as const;
  return (
    <div style={{ display: 'flex', gap: 2, background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 16px', flexShrink: 0 }}>
      {tabs.map(t => {
        const isActive = t.id === active;
        return (
          <button key={t.id} onClick={() => { if (!isActive) { onSave?.(); navigate(t.path); } }}
            style={{ padding: '9px 18px', border: 'none', borderBottom: isActive ? '2px solid #3B82F6' : '2px solid transparent', background: 'transparent', color: isActive ? '#e2e8f0' : '#475569', fontFamily: 'inherit', fontWeight: 800, fontSize: 12, cursor: isActive ? 'default' : 'pointer', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
import {
  QQQuestion, QQCategory, QQLanguage, QQDraft,
  QQ_CATEGORY_LABELS, QQ_CATEGORY_COLORS,
  QQImageLayout, QQImageAnimation, QQQuestionImage,
  QQBunteTueteKind, QQ_BUNTE_TUETE_LABELS,
  QQBunteTuetePayload, QQOptionImage,
  QQThemePreset, QQ_THEME_PRESETS,
} from '../../../shared/quarterQuizTypes';

// ── Constants ──────────────────────────────────────────────────────────────────
const CATEGORIES: QQCategory[] = ['SCHAETZCHEN', 'MUCHO', 'BUNTE_TUETE', 'ZEHN_VON_ZEHN', 'CHEESE'];

const LAYOUT_LABELS: Record<QQImageLayout, string> = {
  'none': 'Kein Bild', 'fullscreen': 'Vollbild',
  'window-left': 'Links', 'window-right': 'Rechts', 'cutout': 'Freisteller',
};
const ANIM_LABELS: Record<QQImageAnimation, string> = {
  'none': 'Keine', 'float': 'Schweben', 'zoom-in': 'Zoom',
  'reveal': 'Aufdecken', 'slide-in': 'Einfahren',
};
const BUNTE_KINDS: QQBunteTueteKind[] = ['hotPotato', 'top5', 'oneOfEight', 'order', 'map'];

// ── Helpers ────────────────────────────────────────────────────────────────────
function makeEmptyQuestion(phaseIndex: number, questionIndexInPhase: number, category: QQCategory, draftId: string): QQQuestion {
  const base = {
    id: `${draftId}-p${phaseIndex}-q${questionIndexInPhase}`,
    category, phaseIndex: phaseIndex as any, questionIndexInPhase,
    text: '', textEn: '', answer: '', answerEn: '',
  };
  if (category === 'MUCHO' || category === 'ZEHN_VON_ZEHN') {
    return { ...base, options: ['', '', '', ...(category === 'MUCHO' ? [''] : [])], optionsEn: [], correctOptionIndex: 0 };
  }
  if (category === 'BUNTE_TUETE') {
    return { ...base, bunteTuete: { kind: 'hotPotato' } };
  }
  return base;
}

function makeSampleDraft(): QQDraft {
  const id = `qq-draft-sample-${Date.now().toString(36)}`;
  const questions: QQQuestion[] = [
    // ── Phase 1 ────────────────────────────────────────────────────────────────
    { id: `${id}-p1-0`, category: 'SCHAETZCHEN', phaseIndex: 1, questionIndexInPhase: 0,
      text: 'Wie viele Brücken hat Hamburg?',
      textEn: 'How many bridges does Hamburg have?',
      targetValue: 2500, unit: 'Brücken', unitEn: 'bridges',
      answer: 'Ca. 2.500 Brücken — mehr als Venedig!', answerEn: 'Around 2,500 bridges — more than Venice!' },
    { id: `${id}-p1-1`, category: 'MUCHO', phaseIndex: 1, questionIndexInPhase: 1,
      text: 'Welche Stadt hat mehr Einwohner als Hamburg?',
      textEn: 'Which city has more inhabitants than Hamburg?',
      options: ['Bremen', 'Hannover', 'München', 'Kiel'], optionsEn: ['Bremen', 'Hannover', 'Munich', 'Kiel'],
      correctOptionIndex: 2, answer: 'München', answerEn: 'Munich' },
    { id: `${id}-p1-2`, category: 'BUNTE_TUETE', phaseIndex: 1, questionIndexInPhase: 2,
      text: 'Nenne ein Hamburger Wahrzeichen — reihum!',
      textEn: 'Name a Hamburg landmark — one by one!',
      answer: 'Michel, Elbphilharmonie, Speicherstadt, Hafen…', answerEn: 'Michel, Elbphilharmonie, Speicherstadt, Port…',
      bunteTuete: { kind: 'hotPotato' } },
    { id: `${id}-p1-3`, category: 'ZEHN_VON_ZEHN', phaseIndex: 1, questionIndexInPhase: 3,
      text: 'Was war Hamburg bevor es Teil Deutschlands wurde?',
      textEn: 'What was Hamburg before becoming part of Germany?',
      options: ['Fürstentum', 'Freie Hansestadt', 'Königreich'],
      optionsEn: ['Principality', 'Free Hanseatic City', 'Kingdom'],
      correctOptionIndex: 1, answer: 'Freie Hansestadt', answerEn: 'Free Hanseatic City' },
    { id: `${id}-p1-4`, category: 'CHEESE', phaseIndex: 1, questionIndexInPhase: 4,
      text: 'Was ist auf diesem Bild zu sehen?',
      textEn: 'What can you see in this picture?',
      answer: 'Elbphilharmonie', answerEn: 'Elbphilharmonie' },
    // ── Phase 2 ────────────────────────────────────────────────────────────────
    { id: `${id}-p2-0`, category: 'SCHAETZCHEN', phaseIndex: 2, questionIndexInPhase: 0,
      text: 'In welchem Jahr wurde der Hamburger Hafen offiziell gegründet?',
      textEn: 'In which year was Hamburg\'s port officially founded?',
      targetValue: 1189, unit: '', unitEn: '',
      answer: '1189 — per Urkunde von Friedrich Barbarossa', answerEn: '1189 — by charter of Frederick Barbarossa' },
    { id: `${id}-p2-1`, category: 'MUCHO', phaseIndex: 2, questionIndexInPhase: 1,
      text: 'Welcher Hamburger Künstler gilt als „König von Hamburg"?',
      textEn: 'Which Hamburg artist is known as the "King of Hamburg"?',
      options: ['Fettes Brot', 'Jan Delay', 'Beginner', 'Samy Deluxe'], optionsEn: ['Fettes Brot', 'Jan Delay', 'Beginner', 'Samy Deluxe'],
      correctOptionIndex: 1, answer: 'Jan Delay', answerEn: 'Jan Delay' },
    { id: `${id}-p2-2`, category: 'BUNTE_TUETE', phaseIndex: 2, questionIndexInPhase: 2,
      text: '8 Aussagen über Hamburg — eine ist gelogen. Welche?',
      textEn: '8 facts about Hamburg — one is a lie. Which one?',
      answer: 'Hamburg hat keinen U-Bahn-Tunnel unter der Elbe (falsch — es gibt den Elbtunnel!)',
      answerEn: 'Hamburg has no subway tunnel under the Elbe (false — the Elbtunnel exists!)',
      bunteTuete: { kind: 'oneOfEight', falseIndex: 4,
        statements: [
          'Hamburg hat mehr Brücken als Venedig',
          'Der Hamburger Michel ist 132 Meter hoch',
          'Die Reeperbahn ist Deutschlands bekannteste Amüsiermeile',
          'Der Hamburger Hafen ist der drittgrößte in Europa',
          'In Hamburg gibt es keinen Tunnel unter der Elbe',
          'Der Hamburger SV wurde 1887 gegründet',
          'Die Speicherstadt steht auf der UNESCO-Welterbeliste',
          'Hamburg war Gründungsmitglied der Hanse',
        ],
        statementsEn: [
          'Hamburg has more bridges than Venice',
          'St. Michael\'s Church is 132 metres tall',
          'The Reeperbahn is Germany\'s most famous entertainment district',
          'Hamburg\'s port is the third largest in Europe',
          'There is no tunnel under the Elbe in Hamburg',
          'Hamburger SV was founded in 1887',
          'The Speicherstadt is on the UNESCO World Heritage list',
          'Hamburg was a founding member of the Hanseatic League',
        ] } },
    { id: `${id}-p2-3`, category: 'ZEHN_VON_ZEHN', phaseIndex: 2, questionIndexInPhase: 3,
      text: 'In welchem Jahr wurde die Elbphilharmonie eröffnet?',
      textEn: 'In which year was the Elbphilharmonie opened?',
      options: ['2015', '2017', '2019'], optionsEn: ['2015', '2017', '2019'],
      correctOptionIndex: 1, answer: '2017', answerEn: '2017' },
    { id: `${id}-p2-4`, category: 'CHEESE', phaseIndex: 2, questionIndexInPhase: 4,
      text: 'Was ist dieses typisch norddeutsche Gericht?',
      textEn: 'What is this typical North German dish?',
      answer: 'Labskaus', answerEn: 'Labskaus' },
    // ── Phase 3 ────────────────────────────────────────────────────────────────
    { id: `${id}-p3-0`, category: 'SCHAETZCHEN', phaseIndex: 3, questionIndexInPhase: 0,
      text: 'Wie viele Meter hoch ist die Elbphilharmonie (Dach)?',
      textEn: 'How many metres tall is the Elbphilharmonie (roof)?',
      targetValue: 110, unit: 'Meter', unitEn: 'metres',
      answer: '110 Meter (Firsthöhe)', answerEn: '110 metres (roof height)' },
    { id: `${id}-p3-1`, category: 'MUCHO', phaseIndex: 3, questionIndexInPhase: 1,
      text: 'Welches Hamburger Unternehmen ist für Kaffee weltweit bekannt?',
      textEn: 'Which Hamburg company is world-famous for coffee?',
      options: ['Jacobs', 'Dallmayr', 'Tchibo', 'Löwenbräu'], optionsEn: ['Jacobs', 'Dallmayr', 'Tchibo', 'Löwenbräu'],
      correctOptionIndex: 2, answer: 'Tchibo', answerEn: 'Tchibo' },
    { id: `${id}-p3-2`, category: 'BUNTE_TUETE', phaseIndex: 3, questionIndexInPhase: 2,
      text: 'Nenne 5 Hamburger Stadtteile!',
      textEn: 'Name 5 Hamburg districts!',
      answer: 'Altona, Eimsbüttel, Wandsbek, Bergedorf, Harburg, St. Pauli…',
      answerEn: 'Altona, Eimsbüttel, Wandsbek, Bergedorf, Harburg, St. Pauli…',
      bunteTuete: { kind: 'top5',
        answers: ['Altona', 'Eimsbüttel', 'Wandsbek', 'Bergedorf', 'Harburg'],
        answersEn: ['Altona', 'Eimsbüttel', 'Wandsbek', 'Bergedorf', 'Harburg'] } },
    { id: `${id}-p3-3`, category: 'ZEHN_VON_ZEHN', phaseIndex: 3, questionIndexInPhase: 3,
      text: 'Wie heißt der amtierende Hamburger Bürgermeister (2024)?',
      textEn: 'Who is the current Hamburg mayor (2024)?',
      options: ['Peter Tschentscher', 'Ole von Beust', 'Olaf Scholz'],
      optionsEn: ['Peter Tschentscher', 'Ole von Beust', 'Olaf Scholz'],
      correctOptionIndex: 0, answer: 'Peter Tschentscher', answerEn: 'Peter Tschentscher' },
    { id: `${id}-p3-4`, category: 'CHEESE', phaseIndex: 3, questionIndexInPhase: 4,
      text: 'Welches Hamburger Expressionismus-Gebäude ist das?',
      textEn: 'Which Hamburg Expressionist building is this?',
      answer: 'Chilehaus', answerEn: 'Chilehaus' },
  ];
  return { id, title: '🗺️ Hamburg Probekatalog', phases: 3, language: 'both', questions, createdAt: Date.now(), updatedAt: Date.now() };
}

function makeEmptyDraft(phases: 3 | 4): QQDraft {
  const id = `qq-draft-${Date.now().toString(36)}`;
  const questions: QQQuestion[] = [];
  for (let p = 1; p <= phases; p++) {
    CATEGORIES.forEach((cat, qi) => questions.push(makeEmptyQuestion(p, qi, cat, id)));
  }
  return { id, title: 'Neuer Fragensatz', phases, language: 'both', questions, createdAt: Date.now(), updatedAt: Date.now() };
}

function cellPreview(q: QQQuestion | undefined): { text: string; sub?: string; answer?: string } {
  if (!q) return { text: '' };
  if (q.category === 'BUNTE_TUETE' && q.bunteTuete) {
    const sub = QQ_BUNTE_TUETE_LABELS[q.bunteTuete.kind];
    return { text: q.text, sub: `${sub.emoji} ${sub.de}`, answer: q.answer };
  }
  if (q.category === 'MUCHO' && q.options) {
    const correct = q.options[q.correctOptionIndex ?? 0];
    return { text: q.text, answer: correct ? `✓ ${correct}` : undefined };
  }
  if (q.category === 'ZEHN_VON_ZEHN' && q.options) {
    const correct = q.options[q.correctOptionIndex ?? 0];
    return { text: q.text, answer: correct ? `✓ ${q.correctOptionIndex! + 1}: ${correct}` : undefined };
  }
  if (q.category === 'SCHAETZCHEN') {
    return { text: q.text, answer: q.targetValue != null ? `→ ${q.targetValue.toLocaleString('de-DE')}${q.unit ? ' ' + q.unit : ''}` : undefined };
  }
  return { text: q.text, answer: q.answer || undefined };
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function QQBuilderPage() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<QQDraft[]>([]);
  const [activeDraft, setActiveDraft] = useState<QQDraft | null>(null);
  const [activeQId, setActiveQId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [removingBgFor, setRemovingBgFor] = useState<string | null>(null);
  const [showRestore, setShowRestore] = useState<{ draft: QQDraft; savedAt: number } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [optionUploadTarget, setOptionUploadTarget] = useState<{ questionId: string; optionIndex: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const optionFileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auto-save: debounced localStorage backup ──
  useEffect(() => {
    if (!activeDraft) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(`qq-draft-backup-${activeDraft.id}`, JSON.stringify({ draft: activeDraft, savedAt: Date.now() }));
      } catch { /* quota exceeded */ }
    }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [activeDraft]);

  // ── Warn before leaving with unsaved changes ──
  useEffect(() => {
    if (!activeDraft) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [activeDraft]);

  // ── Check for unsaved local backup when opening a draft ──
  const origSetActiveDraft = useCallback((draft: QQDraft | null) => {
    if (draft) {
      try {
        const raw = localStorage.getItem(`qq-draft-backup-${draft.id}`);
        if (raw) {
          const backup = JSON.parse(raw) as { draft: QQDraft; savedAt: number };
          if (backup.draft.updatedAt > draft.updatedAt) {
            setShowRestore({ draft: backup.draft, savedAt: backup.savedAt });
            setActiveDraft(draft);
            return;
          }
          localStorage.removeItem(`qq-draft-backup-${draft.id}`);
        }
      } catch { /* ignore corrupt data */ }
    }
    setActiveDraft(draft);
  }, []);

  useEffect(() => {
    fetch('/api/qq/drafts').then(r => r.json()).then(data => { if (Array.isArray(data)) setDrafts(data); }).catch(() => {});
  }, []);

  function getQuestionsForCell(draft: QQDraft, phase: number, cat: QQCategory): QQQuestion[] {
    return draft.questions.filter(q => q.phaseIndex === phase && q.category === cat);
  }
  function updateQuestion(draft: QQDraft, updated: QQQuestion): QQDraft {
    return { ...draft, questions: draft.questions.map(q => q.id === updated.id ? updated : q), updatedAt: Date.now() };
  }
  function addQuestion(draft: QQDraft, phase: number, cat: QQCategory): QQDraft {
    const existing = draft.questions.filter(q => q.phaseIndex === phase && q.category === cat);
    const newQ = makeEmptyQuestion(phase, draft.questions.length, cat, draft.id);
    newQ.id = `${draft.id}-p${phase}-${cat}-${Date.now().toString(36)}`;
    return { ...draft, questions: [...draft.questions, newQ], updatedAt: Date.now() };
  }
  function deleteQuestion(draft: QQDraft, id: string): QQDraft {
    return { ...draft, questions: draft.questions.filter(q => q.id !== id), updatedAt: Date.now() };
  }
  function moveQuestion(draft: QQDraft, id: string, dir: 'up' | 'down'): QQDraft {
    const qs = [...draft.questions];
    const idx = qs.findIndex(q => q.id === id);
    if (idx < 0) return draft;
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= qs.length) return draft;
    // Only swap within same phase
    if (qs[idx].phaseIndex !== qs[swapIdx].phaseIndex) return draft;
    [qs[idx], qs[swapIdx]] = [qs[swapIdx], qs[idx]];
    return { ...draft, questions: qs, updatedAt: Date.now() };
  }

  async function createDraft(phases: 3 | 4) {
    const draft = makeEmptyDraft(phases);
    const res = await fetch('/api/qq/drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
    if (res.ok) { const saved = await res.json(); setDrafts(prev => [saved, ...prev]); setActiveDraft(saved); }
  }
  async function createSampleDraft() {
    const draft = makeSampleDraft();
    const res = await fetch('/api/qq/drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
    if (res.ok) { const saved = await res.json(); setDrafts(prev => [saved, ...prev]); setActiveDraft(saved); }
  }
  async function saveDraft(draft: QQDraft) {
    setSaving(true);
    try {
      const res = await fetch(`/api/qq/drafts/${draft.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      if (res.ok) {
        const saved = await res.json();
        setDrafts(prev => prev.map(d => d.id === saved.id ? saved : d));
        setActiveDraft(saved);
        try { localStorage.removeItem(`qq-draft-backup-${draft.id}`); } catch {}
      }
    } finally { setSaving(false); }
  }
  async function translateAllToEnglish() {
    if (!activeDraft || translating) return;
    setTranslating(true);
    try {
      async function tr(text: string): Promise<string> {
        if (!text?.trim()) return '';
        try {
          const res = await fetch('/api/translate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text.trim(), source: 'de', target: 'en' }),
          });
          if (!res.ok) return '';
          const data = await res.json();
          return (data.translatedText as string)?.trim() ?? '';
        } catch { return ''; }
      }

      const translatedQuestions = await Promise.all(activeDraft.questions.map(async (q) => {
        const updated = { ...q };
        // Core fields
        if (!q.textEn)   updated.textEn   = await tr(q.text);
        if (!q.answerEn) updated.answerEn = await tr(q.answer);
        // SCHAETZCHEN unit
        if (q.unit && !q.unitEn) updated.unitEn = await tr(q.unit);
        // Multiple choice options
        if (q.options?.length && (q.category === 'MUCHO' || q.category === 'ZEHN_VON_ZEHN')) {
          const optionsEn = [...(q.optionsEn ?? [])];
          await Promise.all(q.options.map(async (opt, i) => {
            if (!optionsEn[i] && opt) optionsEn[i] = await tr(opt);
          }));
          updated.optionsEn = optionsEn;
        }
        // BUNTE_TUETE sub-fields
        if (q.bunteTuete) {
          const bt = { ...q.bunteTuete } as any;
          if (bt.kind === 'oneOfEight' && bt.statements?.length) {
            const stEn = [...(bt.statementsEn ?? [])];
            await Promise.all(bt.statements.map(async (s: string, i: number) => {
              if (!stEn[i] && s) stEn[i] = await tr(s);
            }));
            bt.statementsEn = stEn;
          }
          if (bt.kind === 'top5' && bt.answers?.length) {
            const ansEn = [...(bt.answersEn ?? [])];
            await Promise.all(bt.answers.map(async (a: string, i: number) => {
              if (!ansEn[i] && a) ansEn[i] = await tr(a);
            }));
            bt.answersEn = ansEn;
          }
          if (bt.kind === 'order' && bt.items?.length) {
            const itemsEn = [...(bt.itemsEn ?? [])];
            await Promise.all(bt.items.map(async (item: string, i: number) => {
              if (!itemsEn[i] && item) itemsEn[i] = await tr(item);
            }));
            bt.itemsEn = itemsEn;
            if (bt.criteria && !bt.criteriaEn) bt.criteriaEn = await tr(bt.criteria);
          }
          updated.bunteTuete = bt;
        }
        return updated;
      }));

      const newDraft = { ...activeDraft, questions: translatedQuestions };
      setActiveDraft(newDraft);
      await saveDraft(newDraft);
    } finally {
      setTranslating(false);
    }
  }

  async function deleteDraft(id: string) {
    if (!confirm('Fragensatz löschen?')) return;
    await fetch(`/api/qq/drafts/${id}`, { method: 'DELETE' });
    setDrafts(prev => prev.filter(d => d.id !== id));
    if (activeDraft?.id === id) setActiveDraft(null);
  }

  async function uploadImage(questionId: string) {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !activeDraft) return;
    if (file.size > 2 * 1024 * 1024) { alert('Datei zu groß (max. 2 MB)'); if (fileInputRef.current) fileInputRef.current.value = ''; return; }
    setUploadingFor(questionId);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/upload/question-image', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const q = activeDraft.questions.find(q => q.id === questionId);
      if (!q) return;
      const updated = { ...q, image: { url: data.imageUrl, layout: q.image?.layout ?? 'fullscreen' as QQImageLayout, animation: q.image?.animation ?? 'none' as QQImageAnimation, bgRemovedUrl: undefined } };
      setActiveDraft(updateQuestion(activeDraft, updated));
    } finally { setUploadingFor(null); if (fileInputRef.current) fileInputRef.current.value = ''; }
  }

  async function removeBg(question: QQQuestion) {
    if (!activeDraft || !question.image?.url) return;
    setRemovingBgFor(question.id);
    try {
      const res = await fetch('/api/qq/remove-bg', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: question.image.url }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const updated = { ...question, image: { ...question.image!, bgRemovedUrl: data.bgRemovedUrl } };
      setActiveDraft(updateQuestion(activeDraft, updated));
    } catch { alert('Hintergrundentfernung fehlgeschlagen'); }
    finally { setRemovingBgFor(null); }
  }
  async function uploadOptionImage() {
    const file = optionFileInputRef.current?.files?.[0];
    if (!file || !activeDraft || !optionUploadTarget) return;
    if (file.size > 2 * 1024 * 1024) { alert('Datei zu groß (max. 2 MB)'); if (optionFileInputRef.current) optionFileInputRef.current.value = ''; return; }
    const { questionId, optionIndex } = optionUploadTarget;
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/upload/question-image', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const q = activeDraft.questions.find(q => q.id === questionId);
      if (!q) return;
      const imgs = [...(q.optionImages ?? [])];
      while (imgs.length <= optionIndex) imgs.push(null);
      imgs[optionIndex] = { url: data.imageUrl, fit: 'cover', opacity: 0.4 };
      setActiveDraft(updateQuestion(activeDraft, { ...q, optionImages: imgs }));
    } catch { alert('Upload fehlgeschlagen'); }
    finally { setOptionUploadTarget(null); if (optionFileInputRef.current) optionFileInputRef.current.value = ''; }
  }
  const activeQ = activeDraft && activeQId ? activeDraft.questions.find(q => q.id === activeQId) ?? null : null;

  if (!activeDraft) return <DraftListScreen drafts={drafts} onOpen={origSetActiveDraft} onCreate={createDraft} onCreateSample={createSampleDraft} onDelete={deleteDraft} />;

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: "'Nunito', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .qq-filmstrip-thumb:hover .qq-filmstrip-design-btn { opacity: 1 !important; }
        @media (max-width: 800px) {
          .qq-builder-body { flex-direction: column !important; }
          .qq-builder-grid { min-width: 0 !important; }
          .qq-builder-grid-inner { min-width: auto !important; grid-template-columns: 90px repeat(3, 1fr) !important; gap: 4px !important; font-size: 10px !important; }
          .qq-builder-editor { width: 100% !important; border-left: none !important; border-top: 1px solid rgba(255,255,255,0.07) !important; max-height: 55vh !important; overflow-y: auto !important; }
          .qq-builder-header { padding: 8px 12px !important; gap: 8px !important; }
        }
      `}</style>
      {/* Restore dialog */}
      {showRestore && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e293b', borderRadius: 16, padding: '28px 32px', maxWidth: 420, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>💾 Lokale Änderungen gefunden</div>
            <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.5, margin: '0 0 20px' }}>
              Es gibt ungespeicherte Änderungen vom {new Date(showRestore.savedAt).toLocaleString('de-DE')}. Wiederherstellen?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setActiveDraft(showRestore.draft); setShowRestore(null); }} style={{ ...btnStyle('#22C55E'), flex: 1 }}>✅ Wiederherstellen</button>
              <button onClick={() => { try { localStorage.removeItem(`qq-draft-backup-${showRestore.draft.id}`); } catch {} setShowRestore(null); }} style={{ ...btnStyle('#EF4444'), flex: 1 }}>🗑 Verwerfen</button>
            </div>
          </div>
        </div>
      )}
      {/* Preview modal */}
      {showPreview && activeQ && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowPreview(false)}>
          <div style={{ width: '80vw', maxWidth: 960, aspectRatio: '16/9', background: '#0f172a', borderRadius: 16, border: `3px solid ${QQ_CATEGORY_COLORS[activeQ.category]}`, boxShadow: `0 0 80px ${QQ_CATEGORY_COLORS[activeQ.category]}33`, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, position: 'relative' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ position: 'absolute', top: 12, right: 16, cursor: 'pointer', fontSize: 20, color: '#475569' }} onClick={() => setShowPreview(false)}>✕</div>
            <div style={{ padding: '6px 16px', borderRadius: 20, background: QQ_CATEGORY_COLORS[activeQ.category] + '33', border: `1px solid ${QQ_CATEGORY_COLORS[activeQ.category]}66`, fontSize: 14, fontWeight: 900, color: QQ_CATEGORY_COLORS[activeQ.category] }}>
              {QQ_CATEGORY_LABELS[activeQ.category].emoji} {QQ_CATEGORY_LABELS[activeQ.category].de}
            </div>
            {activeQ.image?.url && (
              <img src={activeQ.image.bgRemovedUrl || activeQ.image.url} alt="" style={{ maxHeight: '40%', maxWidth: '60%', objectFit: 'contain', borderRadius: 12, transform: `translate(${activeQ.image.offsetX ?? 0}%, ${activeQ.image.offsetY ?? 0}%) scale(${activeQ.image.scale ?? 1}) rotate(${activeQ.image.rotation ?? 0}deg)` }} />
            )}
            <div style={{ fontSize: 28, fontWeight: 900, textAlign: 'center', lineHeight: 1.3, maxWidth: '80%' }}>{activeQ.text || 'Kein Fragetext'}</div>
            {activeQ.textEn && <div style={{ fontSize: 18, color: '#64748b', textAlign: 'center', fontStyle: 'italic' }}>{activeQ.textEn}</div>}
            {activeQ.options && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                {activeQ.options.map((opt, i) => (
                  <div key={i} style={{ padding: '8px 20px', borderRadius: 10, background: i === activeQ.correctOptionIndex ? '#22C55E33' : 'rgba(255,255,255,0.06)', border: `2px solid ${i === activeQ.correctOptionIndex ? '#22C55E' : 'rgba(255,255,255,0.1)'}`, fontWeight: 800, fontSize: 16 }}>
                    {String.fromCharCode(65 + i)}: {opt}
                  </div>
                ))}
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 16, right: 20, fontSize: 12, color: '#334155' }}>Phase {activeQ.phaseIndex} · Slot {activeQ.questionIndexInPhase + 1}</div>
          </div>
        </div>
      )}
      {/* Shared tab bar */}
      <QQEditorTabs active="builder" draftId={activeDraft.id} onSave={() => saveDraft(activeDraft)} />

      {/* Header */}
      <div style={{ padding: '12px 24px', background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }} className="qq-builder-header">
        <button onClick={() => setActiveDraft(null)} style={btnStyle('#475569')}>← Zurück</button>
        <input value={activeDraft.title} onChange={e => setActiveDraft({ ...activeDraft, title: e.target.value, updatedAt: Date.now() })}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 14px', color: '#fff', fontWeight: 800, fontSize: 16, fontFamily: 'inherit', minWidth: 220 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Runden:</span>
          {([3, 4] as const).map(n => (
            <button key={n} onClick={() => {
              if (n === activeDraft.phases) return;
              if (!confirm(`Zu ${n} Runden wechseln?`)) return;
              const newDraft: QQDraft = { ...activeDraft, phases: n, questions: makeEmptyDraft(n).questions.map((eq, i) => activeDraft.questions[i] ?? eq), updatedAt: Date.now() };
              setActiveDraft(newDraft);
            }} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13, background: activeDraft.phases === n ? '#3B82F6' : 'rgba(255,255,255,0.07)', color: activeDraft.phases === n ? '#fff' : '#94a3b8' }}>{n}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Sprache:</span>
          <select value={activeDraft.language} onChange={e => setActiveDraft({ ...activeDraft, language: e.target.value as QQLanguage })}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '4px 8px', color: '#fff', fontFamily: 'inherit', fontSize: 13 }}>
            <option value="both">DE + EN</option>
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Theme:</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {(Object.keys(QQ_THEME_PRESETS) as Exclude<QQThemePreset, 'custom'>[]).map(t => {
              const th = QQ_THEME_PRESETS[t];
              const active = (activeDraft.theme?.preset ?? 'default') === t;
              return (
                <button key={t} onClick={() => setActiveDraft({ ...activeDraft, theme: { ...th }, updatedAt: Date.now() })}
                  title={t.charAt(0).toUpperCase() + t.slice(1)}
                  style={{ width: 22, height: 22, borderRadius: 6, border: active ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', background: `linear-gradient(135deg, ${th.bgColor}, ${th.accentColor})`, boxShadow: active ? `0 0 8px ${th.accentColor}66` : 'none' }} />
              );
            })}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={translateAllToEnglish} style={btnStyle('#0EA5E9')} disabled={translating || saving}>{translating ? '⏳ Übersetze…' : '🌐 EN befüllen'}</button>
          <button onClick={async () => { await saveDraft(activeDraft); navigate(`/slides?draft=${activeDraft.id}`); }} style={btnStyle('#6366F1')}>🎬 Folien-Editor</button>
          <button onClick={() => setShowPreview(true)} style={btnStyle('#8B5CF6')} disabled={!activeQ}>👁 Vorschau</button>
          <button onClick={() => saveDraft(activeDraft)} style={btnStyle('#22C55E')} disabled={saving}>{saving ? '…' : '💾 Speichern'}</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }} className="qq-builder-body">
        {/* Grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }} className="qq-builder-grid">
          <div style={{ display: 'grid', gridTemplateColumns: `140px repeat(${activeDraft.phases}, 1fr)`, gap: 6, minWidth: 560 }} className="qq-builder-grid-inner">
            {/* Header: blank + Phase labels */}
            <div />
            {Array.from({ length: activeDraft.phases }, (_, pi) => (
              <div key={pi} style={{ padding: '10px 8px', borderRadius: 8, textAlign: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 13, fontWeight: 900, color: '#64748b', letterSpacing: '0.06em' }}>
                Phase {pi + 1}
              </div>
            ))}
            {/* Category rows */}
            {CATEGORIES.map((cat) => [
              <div key={`cat-${cat}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px', borderRadius: 10, background: QQ_CATEGORY_COLORS[cat] + '11', border: `1px solid ${QQ_CATEGORY_COLORS[cat]}22`, alignSelf: 'start' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{QQ_CATEGORY_LABELS[cat].emoji}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: QQ_CATEGORY_COLORS[cat], lineHeight: 1.2 }}>{QQ_CATEGORY_LABELS[cat].de}</div>
                  <div style={{ fontSize: 10, color: '#475569', lineHeight: 1.2 }}>{QQ_CATEGORY_LABELS[cat].en}</div>
                </div>
              </div>,
              ...Array.from({ length: activeDraft.phases }, (_, pi) => {
                const phaseNum = pi + 1;
                const cellQs = getQuestionsForCell(activeDraft, phaseNum, cat);
                return (
                  <div key={`${phaseNum}-${cat}`} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {cellQs.map((q) => {
                      const isActive = activeQId === q.id;
                      const preview = cellPreview(q);
                      // find position in phase for move buttons
                      const phaseQs = activeDraft.questions.filter(x => x.phaseIndex === phaseNum);
                      const qIdx = phaseQs.findIndex(x => x.id === q.id);
                      return (
                        <div key={q.id} onClick={() => setActiveQId(q.id)} style={{
                          padding: '8px 10px', borderRadius: 10, cursor: 'pointer', minHeight: 60, position: 'relative',
                          background: isActive ? `${QQ_CATEGORY_COLORS[cat]}33` : preview.text ? '#1e293b' : 'rgba(255,255,255,0.03)',
                          border: `2px solid ${isActive ? QQ_CATEGORY_COLORS[cat] : preview.text ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
                          transition: 'all 0.15s',
                        }}>
                          {/* Move + delete controls */}
                          <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
                            <button title="Nach oben" onClick={() => setActiveDraft(moveQuestion(activeDraft, q.id, 'up'))}
                              style={{ padding: '1px 4px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)', color: qIdx === 0 ? '#1e293b' : '#64748b', cursor: qIdx === 0 ? 'default' : 'pointer', fontSize: 9, lineHeight: 1, fontFamily: 'inherit' }}>▲</button>
                            <button title="Nach unten" onClick={() => setActiveDraft(moveQuestion(activeDraft, q.id, 'down'))}
                              style={{ padding: '1px 4px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)', color: qIdx >= phaseQs.length - 1 ? '#1e293b' : '#64748b', cursor: qIdx >= phaseQs.length - 1 ? 'default' : 'pointer', fontSize: 9, lineHeight: 1, fontFamily: 'inherit' }}>▼</button>
                            <button title="Löschen" onClick={() => { if (confirm('Frage löschen?')) { setActiveDraft(deleteQuestion(activeDraft, q.id)); if (activeQId === q.id) setActiveQId(null); }}}
                              style={{ padding: '1px 4px', borderRadius: 3, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', cursor: 'pointer', fontSize: 9, lineHeight: 1, fontFamily: 'inherit' }}>✕</button>
                          </div>
                          {q.image?.url && <div style={{ position: 'absolute', top: 4, left: 8, fontSize: 11 }}>🖼</div>}
                          {preview.sub && <div style={{ fontSize: 10, fontWeight: 800, color: QQ_CATEGORY_COLORS[cat], marginBottom: 2, opacity: 0.8, paddingRight: 52 }}>{preview.sub}</div>}
                          <div style={{ fontSize: 11, color: preview.text ? '#94a3b8' : '#334155', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', paddingRight: 52 }}>
                            {preview.text || <span style={{ color: '#1e3a5f', fontStyle: 'italic' }}>Leer…</span>}
                          </div>
                          {preview.answer && <div style={{ marginTop: 3, fontSize: 10, color: '#22C55E', fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{preview.answer}</div>}
                        </div>
                      );
                    })}
                    {/* Add button */}
                    <button onClick={() => {
                      const newDraft = addQuestion(activeDraft, phaseNum, cat);
                      const newQ = newDraft.questions[newDraft.questions.length - 1];
                      setActiveDraft(newDraft);
                      setActiveQId(newQ.id);
                    }} style={{
                      padding: '6px 0', borderRadius: 8, border: `1px dashed ${QQ_CATEGORY_COLORS[cat]}44`,
                      background: 'transparent', color: QQ_CATEGORY_COLORS[cat] + '99', cursor: 'pointer',
                      fontSize: 13, fontFamily: 'inherit', fontWeight: 800, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = QQ_CATEGORY_COLORS[cat] + '15'; e.currentTarget.style.color = QQ_CATEGORY_COLORS[cat]; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = QQ_CATEGORY_COLORS[cat] + '99'; }}
                    >+ Frage</button>
                  </div>
                );
              }),
            ]).flat()}
          </div>

          {/* Slide filmstrip */}
          <div style={{ marginTop: 16, paddingBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              Reihenfolge ({activeDraft.questions.length} Fragen) — ◀▶ zum Verschieben
            </div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
              {activeDraft.questions.map((q, i) => {
                const cat = q.category;
                const isActive = activeQId === q.id;
                const th = activeDraft.theme ?? QQ_THEME_PRESETS.default;
                const phaseQs = activeDraft.questions.filter(x => x.phaseIndex === q.phaseIndex);
                const phaseIdx = phaseQs.findIndex(x => x.id === q.id);
                return (
                  <div key={q.id} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                    <div
                      onClick={() => setActiveQId(q.id)}
                      className="qq-filmstrip-thumb"
                      style={{ width: 128, height: 72, borderRadius: 8, cursor: 'pointer', position: 'relative', overflow: 'hidden',
                        background: th.bgColor ?? '#0D0A06', border: isActive ? `2px solid ${QQ_CATEGORY_COLORS[cat]}` : '2px solid rgba(255,255,255,0.08)',
                        boxShadow: isActive ? `0 0 12px ${QQ_CATEGORY_COLORS[cat]}44` : 'none', transition: 'all 0.15s',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 6 }}>
                      {q.image?.url && <img src={q.image.url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }} />}
                      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%' }}>
                        <div style={{ fontSize: 8, fontWeight: 900, color: QQ_CATEGORY_COLORS[cat], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {QQ_CATEGORY_LABELS[cat].emoji} P{q.phaseIndex}
                        </div>
                        <div style={{ fontSize: 8, color: th.textColor ?? '#e2e8f0', textAlign: 'center', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3, width: '100%' }}>
                          {q.text || '—'}
                        </div>
                      </div>
                      <div style={{ position: 'absolute', bottom: 2, right: 4, fontSize: 7, color: '#475569', fontWeight: 700 }}>#{i + 1}</div>
                      <div className="qq-filmstrip-design-btn"
                        onClick={async e => { e.stopPropagation(); await saveDraft(activeDraft); navigate(`/slides?draft=${activeDraft.id}&focusQuestion=${q.id}`); }}
                        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s', zIndex: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: '#fff', background: '#6366F1', padding: '3px 8px', borderRadius: 6 }}>🎨 Design</span>
                      </div>
                    </div>
                    {/* Move left/right within phase */}
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button title="In Phase früher" onClick={() => setActiveDraft(moveQuestion(activeDraft, q.id, 'up'))}
                        disabled={phaseIdx === 0}
                        style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: phaseIdx === 0 ? '#1e293b' : '#64748b', cursor: phaseIdx === 0 ? 'default' : 'pointer', fontSize: 10, fontFamily: 'inherit' }}>◀</button>
                      <button title="In Phase später" onClick={() => setActiveDraft(moveQuestion(activeDraft, q.id, 'down'))}
                        disabled={phaseIdx >= phaseQs.length - 1}
                        style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: phaseIdx >= phaseQs.length - 1 ? '#1e293b' : '#64748b', cursor: phaseIdx >= phaseQs.length - 1 ? 'default' : 'pointer', fontSize: 10, fontFamily: 'inherit' }}>▶</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Editor panel */}
        {activeQ && (
          <QuestionEditor
            question={activeQ}
            uploadingFor={uploadingFor}
            removingBgFor={removingBgFor}
            fileInputRef={fileInputRef}
            onUpload={() => uploadImage(activeQ.id)}
            onRemoveBg={() => removeBg(activeQ)}
            onChange={updated => setActiveDraft(updateQuestion(activeDraft, updated))}
            onDelete={() => { setActiveDraft(deleteQuestion(activeDraft, activeQ.id)); setActiveQId(null); }}
            onOptionImageUpload={(optIdx: number) => { setOptionUploadTarget({ questionId: activeQ.id, optionIndex: optIdx }); setTimeout(() => optionFileInputRef.current?.click(), 0); }}
          />
        )}
        {!activeQ && (
          <div className="qq-builder-editor" style={{ width: 480, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.07)', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: '#334155', fontSize: 14, textAlign: 'center' }}>← Slot auswählen</div>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={() => activeQ && uploadImage(activeQ.id)} />
      <input ref={optionFileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadOptionImage} />
    </div>
  );
}

// ── Question editor panel ──────────────────────────────────────────────────────
function QuestionEditor({ question: q, onChange, onUpload, onRemoveBg, onDelete, uploadingFor, removingBgFor, fileInputRef, onOptionImageUpload }: {
  question: QQQuestion; onChange: (q: QQQuestion) => void; onUpload: () => void; onRemoveBg: () => void; onDelete: () => void;
  uploadingFor: string | null; removingBgFor: string | null; fileInputRef: React.RefObject<HTMLInputElement>;
  onOptionImageUpload: (optIdx: number) => void;
}) {
  const catColor = QQ_CATEGORY_COLORS[q.category];
  const catLabel = QQ_CATEGORY_LABELS[q.category];
  const img = q.image;
  const showImage = q.category !== 'CHEESE'; // Picture This always shows image; others optional

  function setImg(patch: Partial<QQQuestionImage>) {
    onChange({ ...q, image: { ...(img ?? { url: '', layout: 'fullscreen', animation: 'none' }), ...patch } });
  }

  return (
    <div className="qq-builder-editor" style={{ width: 480, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.07)', background: '#1e293b', overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Category header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: catColor + '22', border: `1px solid ${catColor}44` }}>
        <span style={{ fontSize: 20 }}>{catLabel.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 14, color: catColor }}>{catLabel.de} <span style={{ color: '#475569', fontWeight: 400 }}>/ {catLabel.en}</span></div>
          <div style={{ fontSize: 11, color: '#475569' }}>Phase {q.phaseIndex}</div>
        </div>
        <button onClick={() => { if (confirm('Frage löschen?')) onDelete(); }}
          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 800 }}>
          🗑 Löschen
        </button>
      </div>

      {/* Question text DE/EN — always shown */}
      <div>
        <label style={labelStyle}>Frage (DE)</label>
        <textarea value={q.text} onChange={e => onChange({ ...q, text: e.target.value })} style={{ ...textareaStyle, borderColor: catColor + '44' }} rows={3} placeholder="Fragetext auf Deutsch…" />
      </div>
      <div>
        <label style={labelStyle}>Frage (EN) <span style={{ color: '#334155' }}>optional</span></label>
        <textarea value={q.textEn ?? ''} onChange={e => onChange({ ...q, textEn: e.target.value })} style={textareaStyle} rows={2} placeholder="Question text in English…" />
      </div>

      {/* ── Category-specific answer fields ── */}
      <CategoryFields question={q} onChange={onChange} catColor={catColor} onOptionImageUpload={onOptionImageUpload} />

      {/* ── Image section ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginBottom: 10 }}>
          🖼 Bild {q.category === 'CHEESE' ? '(Pflicht)' : '(optional)'}
        </div>

        {img?.url && (
          <div style={{ marginBottom: 10, borderRadius: 10, overflow: 'hidden', position: 'relative', background: '#0f172a', height: 140 }}>
            <img src={img.bgRemovedUrl ?? img.url} alt="" style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: (img.layout === 'cutout' || img.layout === 'window-left' || img.layout === 'window-right') ? 'contain' : 'cover',
              transform: `translate(${img.offsetX ?? 0}%, ${img.offsetY ?? 0}%) scale(${img.scale ?? 1}) rotate(${img.rotation ?? 0}deg)`,
            }} />
            <div style={{ position: 'absolute', bottom: 4, left: 6, fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 700, background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 4 }}>
              {img.layout === 'fullscreen' ? 'Vollbild' : img.layout === 'window-left' ? 'Links' : img.layout === 'window-right' ? 'Rechts' : img.layout === 'cutout' ? 'Freisteller' : 'Kein Bild'}
            </div>
            {img.bgRemovedUrl && <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(34,197,94,0.9)', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 800, color: '#fff' }}>✓ BG entfernt</div>}
          </div>
        )}

        <button onClick={() => fileInputRef.current?.click()} disabled={!!uploadingFor} style={{ ...btnStyle('#3B82F6'), width: '100%', marginBottom: 6 }}>
          {uploadingFor === q.id ? '⏳ Lädt hoch…' : img?.url ? '🔄 Bild ersetzen' : '📤 Bild hochladen'}
        </button>

        {img?.url && (
          <>
            <button onClick={onRemoveBg} disabled={!!removingBgFor} style={{ ...btnStyle('#8B5CF6'), width: '100%', marginBottom: 10 }}>
              {removingBgFor === q.id ? '⏳ Entferne Hintergrund…' : '✂️ Hintergrund entfernen'}
            </button>

            {/* Layout: visual icon buttons */}
            <label style={labelStyle}>Layout</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5, marginBottom: 10 }}>
              {(Object.keys(LAYOUT_LABELS) as QQImageLayout[]).map(l => (
                <button key={l} onClick={() => setImg({ layout: l })} title={LAYOUT_LABELS[l]}
                  style={{ padding: '7px 4px', borderRadius: 9, border: 'none', cursor: 'pointer', background: img.layout === l ? catColor + '33' : 'rgba(255,255,255,0.04)', outline: `2px solid ${img.layout === l ? catColor : 'transparent'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  {/* 16:9 mini icon */}
                  <div style={{ width: 38, height: 22, borderRadius: 3, background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                    {l === 'fullscreen' && <div style={{ position: 'absolute', inset: 0, background: catColor + '70' }} />}
                    {l === 'window-left' && <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '50%', background: catColor + '70' }} />}
                    {l === 'window-right' && <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '50%', background: catColor + '70' }} />}
                    {l === 'cutout' && <>
                      <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 10, height: 15, background: catColor + '90', borderRadius: '50% 50% 0 0' }} />
                      <div style={{ position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)', width: 6, height: 6, background: catColor + '90', borderRadius: '50%' }} />
                    </>}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 800, color: img.layout === l ? catColor : '#475569', lineHeight: 1, whiteSpace: 'nowrap' }}>{LAYOUT_LABELS[l]}</span>
                </button>
              ))}
            </div>

            {/* Animation: icon + label buttons */}
            <label style={labelStyle}>Animation</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5, marginBottom: 4 }}>
              {(Object.keys(ANIM_LABELS) as QQImageAnimation[]).map(a => {
                const icons: Record<QQImageAnimation, string> = { none: '—', float: '🌊', 'zoom-in': '🔍', reveal: '✨', 'slide-in': '➡️' };
                return (
                  <button key={a} onClick={() => setImg({ animation: a })}
                    style={{ padding: '7px 4px', borderRadius: 9, border: 'none', cursor: 'pointer', background: img.animation === a ? '#F59E0B33' : 'rgba(255,255,255,0.04)', outline: `2px solid ${img.animation === a ? '#F59E0B' : 'transparent'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <span style={{ fontSize: 14 }}>{icons[a]}</span>
                    <span style={{ fontSize: 9, fontWeight: 800, color: img.animation === a ? '#F59E0B' : '#475569', lineHeight: 1, whiteSpace: 'nowrap' }}>{ANIM_LABELS[a]}</span>
                  </button>
                );
              })}
            </div>

            {/* Animation timeline visualization */}
            {img.animation !== 'none' && (
              <div style={{ background: '#0a0f1a', borderRadius: 10, padding: '10px 14px', marginBottom: 4, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 10, color: '#475569', fontWeight: 800, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>⏱ Animation Timeline</div>
                {(() => {
                  const delay = img.animDelay ?? 0;
                  const dur = img.animDuration ?? 1;
                  const total = Math.max(4, delay + dur + 0.5);
                  const delayPct = (delay / total) * 100;
                  const durPct = (dur / total) * 100;
                  return (
                    <div style={{ position: 'relative', marginBottom: 22 }}>
                      {/* track */}
                      <div style={{ height: 24, background: 'rgba(255,255,255,0.04)', borderRadius: 6, position: 'relative', overflow: 'visible' }}>
                        {/* delay zone */}
                        {delay > 0 && (
                          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${delayPct}%`, background: 'rgba(255,255,255,0.04)', borderRadius: '6px 0 0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 8, color: '#334155', fontWeight: 700, whiteSpace: 'nowrap' }}>warten</span>
                          </div>
                        )}
                        {/* animation segment */}
                        <div style={{ position: 'absolute', top: 2, bottom: 2, left: `${delayPct}%`, width: `${durPct}%`, background: 'linear-gradient(90deg, #F59E0B, #FBBF24)', borderRadius: 4, minWidth: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 9, color: '#000', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', padding: '0 4px' }}>{ANIM_LABELS[img.animation]}</span>
                        </div>
                      </div>
                      {/* time labels */}
                      <div style={{ position: 'absolute', top: 28, left: 0, fontSize: 9, color: '#475569', fontWeight: 700 }}>0s</div>
                      {delay > 0 && (
                        <div style={{ position: 'absolute', top: 28, left: `${delayPct}%`, fontSize: 9, color: '#94a3b8', fontWeight: 700, transform: 'translateX(-50%)' }}>{delay.toFixed(1)}s</div>
                      )}
                      <div style={{ position: 'absolute', top: 28, left: `${delayPct + durPct}%`, fontSize: 9, color: '#94a3b8', fontWeight: 700, transform: 'translateX(-50%)' }}>{(delay + dur).toFixed(1)}s</div>
                      <div style={{ position: 'absolute', top: 28, right: 0, fontSize: 9, color: '#334155', fontWeight: 700 }}>{total.toFixed(1)}s</div>
                    </div>
                  );
                })()}
                <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
                  Einblenden nach <b style={{ color: '#e2e8f0' }}>{(img.animDelay ?? 0).toFixed(1)}s</b> · Dauer <b style={{ color: '#e2e8f0' }}>{(img.animDuration ?? 1).toFixed(1)}s</b>
                </div>
              </div>
            )}

            {/* Image position & scale controls — drag canvas */}
            <label style={{ ...labelStyle, marginTop: 8 }}>Position & Größe <span style={{ fontSize: 10, color: '#334155', fontWeight: 400 }}>Drag = verschieben · Scroll = Zoom</span></label>
            <div style={{ background: '#0f172a', borderRadius: 10, padding: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
              {/* 16:9 interactive drag preview */}
              <div
                style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden', cursor: 'grab', background: '#000', marginBottom: 8, border: '1px solid rgba(255,255,255,0.1)' }}
                onMouseDown={e => {
                  e.preventDefault();
                  const startX = e.clientX, startY = e.clientY;
                  const startOX = img.offsetX ?? 0, startOY = img.offsetY ?? 0;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const onMove = (ev: MouseEvent) => {
                    const dx = ((ev.clientX - startX) / rect.width) * 200;
                    const dy = ((ev.clientY - startY) / rect.height) * 200;
                    setImg({ offsetX: Math.round(Math.max(-100, Math.min(100, startOX + dx))), offsetY: Math.round(Math.max(-100, Math.min(100, startOY + dy))) });
                  };
                  const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                  window.addEventListener('mousemove', onMove);
                  window.addEventListener('mouseup', onUp);
                }}
                onWheel={e => {
                  e.preventDefault();
                  const cur = img.scale ?? 1;
                  const delta = e.deltaY > 0 ? -0.05 : 0.05;
                  setImg({ scale: Math.round(Math.max(0.1, Math.min(3, cur + delta)) * 100) / 100 });
                }}
                onTouchStart={e => {
                  if (e.touches.length !== 1) return;
                  const t = e.touches[0];
                  const startX = t.clientX, startY = t.clientY;
                  const startOX = img.offsetX ?? 0, startOY = img.offsetY ?? 0;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const onMove = (ev: TouchEvent) => {
                    ev.preventDefault();
                    const ct = ev.touches[0];
                    const dx = ((ct.clientX - startX) / rect.width) * 200;
                    const dy = ((ct.clientY - startY) / rect.height) * 200;
                    setImg({ offsetX: Math.round(Math.max(-100, Math.min(100, startOX + dx))), offsetY: Math.round(Math.max(-100, Math.min(100, startOY + dy))) });
                  };
                  const onEnd = () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd); };
                  window.addEventListener('touchmove', onMove, { passive: false });
                  window.addEventListener('touchend', onEnd);
                }}
              >
                <img src={img.bgRemovedUrl ?? img.url} alt="" style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                  transform: `translate(${img.offsetX ?? 0}%, ${img.offsetY ?? 0}%) scale(${img.scale ?? 1}) rotate(${img.rotation ?? 0}deg)`,
                  pointerEvents: 'none', transition: 'transform 0.05s',
                }} />
                {/* Crosshair */}
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.15)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.15)', pointerEvents: 'none' }} />
                {/* Position indicator */}
                <div style={{ position: 'absolute', bottom: 4, right: 6, fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: 4 }}>
                  X:{img.offsetX ?? 0} Y:{img.offsetY ?? 0} · {((img.scale ?? 1) * 100).toFixed(0)}%
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#475569', marginBottom: 3 }}>Zoom ({((img.scale ?? 1) * 100).toFixed(0)}%)</div>
                  <input type="range" min={10} max={300} value={(img.scale ?? 1) * 100} onChange={e => setImg({ scale: Number(e.target.value) / 100 })} style={{ width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#475569', marginBottom: 3 }}>Drehung ({img.rotation ?? 0}°)</div>
                  <input type="range" min={0} max={360} value={img.rotation ?? 0} onChange={e => setImg({ rotation: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
              </div>
              {(img.offsetX || img.offsetY || (img.scale && img.scale !== 1) || img.rotation) && (
                <button onClick={() => setImg({ offsetX: 0, offsetY: 0, scale: 1, rotation: 0 })} style={{ ...btnStyle('#475569'), width: '100%', marginTop: 8, fontSize: 11 }}>↩ Zurücksetzen</button>
              )}
            </div>

            {/* Visual adjustments */}
            <label style={{ ...labelStyle, marginTop: 12 }}>Visuelle Anpassungen</label>
            <div style={{ background: '#0f172a', borderRadius: 10, padding: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#475569', marginBottom: 3 }}>Deckkraft ({((img.opacity ?? 1) * 100).toFixed(0)}%)</div>
                  <input type="range" min={0} max={100} value={(img.opacity ?? 1) * 100} onChange={e => setImg({ opacity: Number(e.target.value) / 100 })} style={{ width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#475569', marginBottom: 3 }}>Helligkeit ({img.brightness ?? 100}%)</div>
                  <input type="range" min={0} max={200} value={img.brightness ?? 100} onChange={e => setImg({ brightness: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#475569', marginBottom: 3 }}>Kontrast ({img.contrast ?? 100}%)</div>
                  <input type="range" min={0} max={200} value={img.contrast ?? 100} onChange={e => setImg({ contrast: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#475569', marginBottom: 3 }}>Weichzeichner ({img.blur ?? 0}px)</div>
                  <input type="range" min={0} max={20} value={img.blur ?? 0} onChange={e => setImg({ blur: Number(e.target.value) })} style={{ width: '100%' }} />
                </div>
              </div>
              {(img.opacity !== undefined && img.opacity !== 1) || (img.brightness !== undefined && img.brightness !== 100) || (img.contrast !== undefined && img.contrast !== 100) || img.blur ? (
                <button onClick={() => setImg({ opacity: 1, brightness: 100, contrast: 100, blur: 0 })} style={{ ...btnStyle('#475569'), width: '100%', marginTop: 8, fontSize: 11 }}>↩ Filter zurücksetzen</button>
              ) : null}
            </div>

            {/* Animation timing */}
            <label style={{ ...labelStyle, marginTop: 12 }}>Animation Timing</label>
            <div style={{ background: '#0f172a', borderRadius: 10, padding: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#475569', marginBottom: 3 }}>Verzögerung ({(img.animDelay ?? 0).toFixed(1)}s)</div>
                  <input type="range" min={0} max={50} value={(img.animDelay ?? 0) * 10} onChange={e => setImg({ animDelay: Number(e.target.value) / 10 })} style={{ width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#475569', marginBottom: 3 }}>Dauer ({(img.animDuration ?? 1).toFixed(1)}s)</div>
                  <input type="range" min={1} max={100} value={(img.animDuration ?? 1) * 10} onChange={e => setImg({ animDuration: Number(e.target.value) / 10 })} style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Floating Emojis (per-question override) ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginBottom: 8 }}>
          ✨ Deko-Emojis <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
        </div>
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 8 }}>
          Überschreibt die Standard-Emojis der Kategorie. Leer = Standard.
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2].map(i => (
            <input
              key={i}
              value={q.emojis?.[i] ?? ''}
              onChange={e => {
                const emojis = [...(q.emojis ?? ['', '', ''])];
                emojis[i] = e.target.value;
                // Clear array if all empty
                const hasAny = emojis.some(v => v.trim());
                onChange({ ...q, emojis: hasAny ? emojis : undefined });
              }}
              placeholder={['Emoji 1', 'Emoji 2', 'Emoji 3'][i]}
              style={{ ...inputStyle, flex: 1, textAlign: 'center', fontSize: 20, padding: '6px 4px' }}
              maxLength={4}
            />
          ))}
        </div>
      </div>

      {/* ── Music (per-question MP3) ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginBottom: 8 }}>
          🎵 Hintergrundmusik <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional, MP3)</span>
        </div>
        {q.musicUrl ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <audio src={q.musicUrl} controls style={{ height: 32, flex: 1 }} />
            <button onClick={() => onChange({ ...q, musicUrl: undefined })} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #EF4444', color: '#EF4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: 11 }}>✕</button>
          </div>
        ) : (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '1px dashed rgba(255,255,255,0.15)', cursor: 'pointer', fontSize: 12, color: '#64748b' }}>
            MP3 hochladen (max 10 MB)
            <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={async e => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 10 * 1024 * 1024) { alert('max 10 MB'); e.target.value = ''; return; }
              const fd = new FormData(); fd.append('file', file);
              try {
                const res = await fetch('/api/upload/question-audio', { method: 'POST', body: fd });
                if (!res.ok) throw new Error();
                const data = await res.json();
                onChange({ ...q, musicUrl: data.audioUrl });
              } catch { alert('Upload fehlgeschlagen'); }
              e.target.value = '';
            }} />
          </label>
        )}
      </div>
    </div>
  );
}

// ── Category-specific answer fields ───────────────────────────────────────────
function CategoryFields({ question: q, onChange, catColor, onOptionImageUpload }: { question: QQQuestion; onChange: (q: QQQuestion) => void; catColor: string; onOptionImageUpload: (optIdx: number) => void }) {

  // SCHAETZCHEN ────────────────────────────────────────────────────────────────
  if (q.category === 'SCHAETZCHEN') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: '#94a3b8' }}>
        Teams geben eine Zahl ein. Die nächste Zahl gewinnt automatisch.
      </div>
      <div>
        <label style={labelStyle}>Zielwert (Zahl)</label>
        <input type="number" value={q.targetValue ?? ''} onChange={e => onChange({ ...q, targetValue: e.target.value === '' ? undefined : Number(e.target.value) })}
          style={{ ...inputStyle, borderColor: 'rgba(245,158,11,0.4)' }} placeholder="z.B. 1989 oder 2500000" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={labelStyle}>Einheit (DE) <span style={{ color: '#334155' }}>opt.</span></label>
          <input value={q.unit ?? ''} onChange={e => onChange({ ...q, unit: e.target.value })} style={inputStyle} placeholder="z.B. Meter" />
        </div>
        <div>
          <label style={labelStyle}>Unit (EN) <span style={{ color: '#334155' }}>opt.</span></label>
          <input value={q.unitEn ?? ''} onChange={e => onChange({ ...q, unitEn: e.target.value })} style={inputStyle} placeholder="e.g. metres" />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Antwort-Text (DE) <span style={{ color: '#334155' }}>für Anzeige</span></label>
        <input value={q.answer} onChange={e => onChange({ ...q, answer: e.target.value })} style={inputStyle} placeholder="z.B. 1.989 Meter" />
      </div>
      <div>
        <label style={labelStyle}>Answer (EN) <span style={{ color: '#334155' }}>opt.</span></label>
        <input value={q.answerEn ?? ''} onChange={e => onChange({ ...q, answerEn: e.target.value })} style={inputStyle} placeholder="e.g. 1,989 metres" />
      </div>
    </div>
  );

  // MUCHO ──────────────────────────────────────────────────────────────────────
  if (q.category === 'MUCHO') {
    const opts = q.options ?? ['', '', '', ''];
    const optsEn = q.optionsEn ?? ['', '', '', ''];
    const correct = q.correctOptionIndex ?? 0;
    const labels = ['A', 'B', 'C', 'D'];
    const optImgs = q.optionImages ?? [];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', fontSize: 12, color: '#94a3b8' }}>
          4 Antwortoptionen — eine ist korrekt. Optional: Bilder pro Option.
        </div>
        {[0, 1, 2, 3].map(i => {
          const optImg = optImgs[i];
          return (
          <div key={i} style={{ padding: '10px 12px', borderRadius: 10, border: `2px solid ${correct === i ? '#22C55E' : 'rgba(255,255,255,0.07)'}`, background: correct === i ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.02)', position: 'relative', overflow: 'hidden' }}>
            {optImg?.url && <img src={optImg.url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: optImg.fit ?? 'cover', opacity: optImg.opacity ?? 0.15, pointerEvents: 'none' }} />}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: catColor + '33', border: `1px solid ${catColor}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: catColor, flexShrink: 0 }}>{labels[i]}</div>
                <button onClick={() => onChange({ ...q, correctOptionIndex: i, answer: opts[i], answerEn: optsEn[i] || undefined })}
                  style={{ padding: '3px 10px', borderRadius: 6, border: `1px solid ${correct === i ? '#22C55E' : 'rgba(255,255,255,0.1)'}`, background: correct === i ? 'rgba(34,197,94,0.15)' : 'transparent', color: correct === i ? '#22C55E' : '#475569', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 800 }}>
                  {correct === i ? '✓ Korrekt' : 'Als Antwort'}
                </button>
                <button onClick={() => onOptionImageUpload(i)} style={{ marginLeft: 'auto', padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: optImg?.url ? 'rgba(139,92,246,0.15)' : 'transparent', color: optImg?.url ? '#A78BFA' : '#475569', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: 800 }}>
                  {optImg?.url ? '🔄 Bild' : '🖼 Bild'}
                </button>
                {optImg?.url && (
                  <button onClick={() => { const imgs = [...optImgs]; imgs[i] = null; onChange({ ...q, optionImages: imgs }); }}
                    style={{ padding: '3px 6px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: '#EF4444', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: 800 }}>✕</button>
                )}
              </div>
              {optImg?.url && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: '#475569', fontWeight: 700 }}>Deckkraft:</span>
                  <input type="range" min={5} max={100} value={(optImg.opacity ?? 0.4) * 100} onChange={e => { const imgs = [...optImgs]; imgs[i] = { ...optImg, opacity: Number(e.target.value) / 100 }; onChange({ ...q, optionImages: imgs }); }}
                    style={{ flex: 1, height: 14 }} />
                  <span style={{ fontSize: 9, color: '#64748b', width: 28 }}>{((optImg.opacity ?? 0.4) * 100).toFixed(0)}%</span>
                </div>
              )}
              <input value={opts[i]} onChange={e => { const o = [...opts]; o[i] = e.target.value; onChange({ ...q, options: o, answer: correct === i ? e.target.value : q.answer }); }}
                style={inputStyle} placeholder={`Option ${labels[i]} (DE)…`} />
              <input value={optsEn[i] ?? ''} onChange={e => { const o = [...optsEn]; o[i] = e.target.value; onChange({ ...q, optionsEn: o, answerEn: correct === i ? e.target.value : q.answerEn }); }}
                style={{ ...inputStyle, marginTop: 5, fontSize: 12, opacity: 0.7 }} placeholder={`Option ${labels[i]} (EN, optional)…`} />
            </div>
          </div>
          );
        })}
      </div>
    );
  }

  // ZEHN_VON_ZEHN (All In) ─────────────────────────────────────────────────────
  if (q.category === 'ZEHN_VON_ZEHN') {
    const opts = q.options ?? ['', '', ''];
    const optsEn = q.optionsEn ?? ['', '', ''];
    const correct = q.correctOptionIndex ?? 0;
    const optImgs = q.optionImages ?? [];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 12, color: '#94a3b8' }}>
          3 Optionen (1 / 2 / 3) — Teams verteilen Punkte. Optional: Bilder pro Option.
        </div>
        {[0, 1, 2].map(i => {
          const optImg = optImgs[i];
          return (
          <div key={i} style={{ padding: '10px 12px', borderRadius: 10, border: `2px solid ${correct === i ? '#22C55E' : 'rgba(255,255,255,0.07)'}`, background: correct === i ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.02)', position: 'relative', overflow: 'hidden' }}>
            {optImg?.url && <img src={optImg.url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: optImg.fit ?? 'cover', opacity: optImg.opacity ?? 0.15, pointerEvents: 'none' }} />}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: catColor + '33', border: `1px solid ${catColor}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: catColor, flexShrink: 0 }}>{i + 1}</div>
                <button onClick={() => onChange({ ...q, correctOptionIndex: i, answer: opts[i], answerEn: optsEn[i] || undefined })}
                  style={{ padding: '3px 10px', borderRadius: 6, border: `1px solid ${correct === i ? '#22C55E' : 'rgba(255,255,255,0.1)'}`, background: correct === i ? 'rgba(34,197,94,0.15)' : 'transparent', color: correct === i ? '#22C55E' : '#475569', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 800 }}>
                  {correct === i ? '✓ Korrekt' : 'Als Antwort'}
                </button>
                <button onClick={() => onOptionImageUpload(i)} style={{ marginLeft: 'auto', padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: optImg?.url ? 'rgba(139,92,246,0.15)' : 'transparent', color: optImg?.url ? '#A78BFA' : '#475569', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: 800 }}>
                  {optImg?.url ? '🔄 Bild' : '🖼 Bild'}
                </button>
                {optImg?.url && (
                  <button onClick={() => { const imgs = [...optImgs]; imgs[i] = null; onChange({ ...q, optionImages: imgs }); }}
                    style={{ padding: '3px 6px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: '#EF4444', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: 800 }}>✕</button>
                )}
              </div>
              {optImg?.url && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: '#475569', fontWeight: 700 }}>Deckkraft:</span>
                  <input type="range" min={5} max={100} value={(optImg.opacity ?? 0.4) * 100} onChange={e => { const imgs = [...optImgs]; imgs[i] = { ...optImg, opacity: Number(e.target.value) / 100 }; onChange({ ...q, optionImages: imgs }); }}
                    style={{ flex: 1, height: 14 }} />
                  <span style={{ fontSize: 9, color: '#64748b', width: 28 }}>{((optImg.opacity ?? 0.4) * 100).toFixed(0)}%</span>
                </div>
              )}
              <input value={opts[i]} onChange={e => { const o = [...opts]; o[i] = e.target.value; onChange({ ...q, options: o, answer: correct === i ? e.target.value : q.answer }); }}
                style={inputStyle} placeholder={`Option ${i + 1} (DE)…`} />
              <input value={optsEn[i] ?? ''} onChange={e => { const o = [...optsEn]; o[i] = e.target.value; onChange({ ...q, optionsEn: o, answerEn: correct === i ? e.target.value : q.answerEn }); }}
                style={{ ...inputStyle, marginTop: 5, fontSize: 12, opacity: 0.7 }} placeholder={`Option ${i + 1} (EN, optional)…`} />
            </div>
          </div>
          );
        })}
      </div>
    );
  }

  // CHEESE / Picture This ──────────────────────────────────────────────────────
  if (q.category === 'CHEESE') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', fontSize: 12, color: '#94a3b8' }}>
        Ein Bild wird gezeigt. Teams tippen die Antwort als Freitext. Bild unten hochladen.
      </div>
      <div>
        <label style={labelStyle}>Antwort (DE)</label>
        <input value={q.answer} onChange={e => onChange({ ...q, answer: e.target.value })} style={{ ...inputStyle, borderColor: 'rgba(139,92,246,0.4)' }} placeholder="z.B. Jungfernstieg" />
      </div>
      <div>
        <label style={labelStyle}>Answer (EN) <span style={{ color: '#334155' }}>opt.</span></label>
        <input value={q.answerEn ?? ''} onChange={e => onChange({ ...q, answerEn: e.target.value })} style={inputStyle} placeholder="e.g. Jungfernstieg" />
      </div>
    </div>
  );

  // BUNTE_TUETE ────────────────────────────────────────────────────────────────
  if (q.category === 'BUNTE_TUETE') {
    const kind = q.bunteTuete?.kind ?? 'hotPotato';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Sub-mechanic picker */}
        <div>
          <label style={labelStyle}>🎁 Bunte-Tüte-Mechanik</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            {BUNTE_KINDS.map(k => {
              const lbl = QQ_BUNTE_TUETE_LABELS[k];
              const active = kind === k;
              return (
                <button key={k} onClick={() => {
                  let bt: QQBunteTuetePayload;
                  if (k === 'hotPotato') bt = { kind: 'hotPotato' };
                  else if (k === 'top5') bt = { kind: 'top5', answers: ['', '', '', '', ''] };
                  else if (k === 'oneOfEight') bt = { kind: 'oneOfEight', statements: ['', '', '', '', '', '', '', ''], falseIndex: 0 };
                  else if (k === 'order') bt = { kind: 'order', items: ['', '', ''], correctOrder: [0, 1, 2] };
                  else bt = { kind: 'map', lat: 53.55, lng: 10.0, targetLabel: '' };
                  onChange({ ...q, bunteTuete: bt });
                }} style={{ padding: '7px 8px', borderRadius: 8, border: `1px solid ${active ? catColor + '66' : 'rgba(255,255,255,0.08)'}`, background: active ? catColor + '22' : 'rgba(255,255,255,0.03)', color: active ? catColor : '#64748b', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 800, textAlign: 'left' }}>
                  {lbl.emoji} {lbl.de}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-mechanic specific fields */}
        <BunteTueteFields question={q} onChange={onChange} />
      </div>
    );
  }

  return null;
}

// ── Bunte Tüte sub-mechanic editors ───────────────────────────────────────────
function BunteTueteFields({ question: q, onChange }: { question: QQQuestion; onChange: (q: QQQuestion) => void }) {
  const bt = q.bunteTuete;
  if (!bt) return null;

  // HOT POTATO ─────────────────────────────────────────────────────────────────
  if (bt.kind === 'hotPotato') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: '#94a3b8' }}>
        🥔 Teams werden reihum gefragt. Wer falsch antwortet scheidet aus. Letztes Team gewinnt. Moderator bewertet jede Antwort live.
      </div>
      <div>
        <label style={labelStyle}>Antwort (für Moderator-Referenz, DE)</label>
        <input value={q.answer} onChange={e => onChange({ ...q, answer: e.target.value })} style={inputStyle} placeholder="Korrekte Antwort…" />
      </div>
      <div>
        <label style={labelStyle}>Answer (EN) <span style={{ color: '#334155' }}>opt.</span></label>
        <input value={q.answerEn ?? ''} onChange={e => onChange({ ...q, answerEn: e.target.value })} style={inputStyle} placeholder="Correct answer…" />
      </div>
    </div>
  );

  // TOP 5 ──────────────────────────────────────────────────────────────────────
  if (bt.kind === 'top5') {
    const ans = bt.answers ?? ['', '', '', '', ''];
    const ansEn = bt.answersEn ?? ['', '', '', '', ''];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', fontSize: 12, color: '#94a3b8' }}>
          🏆 Teams nennen bis zu 5 Antworten. Alle gültigen treffer zählen.
        </div>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ width: 22, flexShrink: 0, fontSize: 12, fontWeight: 900, color: '#475569', textAlign: 'center' }}>#{i + 1}</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <input value={ans[i] ?? ''} onChange={e => { const a = [...ans]; a[i] = e.target.value; onChange({ ...q, bunteTuete: { ...bt, answers: a }, answer: a.filter(Boolean).join(', ') }); }}
                style={inputStyle} placeholder={`Antwort ${i + 1} (DE)…`} />
              <input value={ansEn[i] ?? ''} onChange={e => { const a = [...ansEn]; a[i] = e.target.value; onChange({ ...q, bunteTuete: { ...bt, answersEn: a } }); }}
                style={{ ...inputStyle, fontSize: 12, opacity: 0.7 }} placeholder={`Answer ${i + 1} (EN, opt.)…`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ONE OF EIGHT / Imposter ────────────────────────────────────────────────────
  if (bt.kind === 'oneOfEight') {
    const stmts = bt.statements ?? Array(8).fill('');
    const stmtsEn = bt.statementsEn ?? Array(8).fill('');
    const falseIdx = bt.falseIndex ?? 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: '#94a3b8' }}>
          🕵️ 8 Aussagen, eine ist falsch (der Imposter). Teams raten welche.
        </div>
        {Array(8).fill(null).map((_, i) => {
          const isFalse = falseIdx === i;
          return (
            <div key={i} style={{ padding: '8px 10px', borderRadius: 10, border: `2px solid ${isFalse ? '#EF4444' : 'rgba(255,255,255,0.07)'}`, background: isFalse ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <div style={{ width: 22, height: 22, borderRadius: 5, background: isFalse ? '#EF444433' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: isFalse ? '#EF4444' : '#475569', flexShrink: 0 }}>{i + 1}</div>
                <button onClick={() => onChange({ ...q, bunteTuete: { ...bt, falseIndex: i }, answer: stmts[i] })}
                  style={{ padding: '2px 8px', borderRadius: 5, border: `1px solid ${isFalse ? '#EF4444' : 'rgba(255,255,255,0.1)'}`, background: isFalse ? 'rgba(239,68,68,0.15)' : 'transparent', color: isFalse ? '#EF4444' : '#475569', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: 800 }}>
                  {isFalse ? '🕵️ Imposter' : 'Als Imposter'}
                </button>
              </div>
              <input value={stmts[i] ?? ''} onChange={e => { const s = [...stmts]; s[i] = e.target.value; onChange({ ...q, bunteTuete: { ...bt, statements: s }, answer: falseIdx === i ? e.target.value : q.answer }); }}
                style={inputStyle} placeholder={`Aussage ${i + 1} (DE)…`} />
              <input value={stmtsEn[i] ?? ''} onChange={e => { const s = [...stmtsEn]; s[i] = e.target.value; onChange({ ...q, bunteTuete: { ...bt, statementsEn: s } }); }}
                style={{ ...inputStyle, marginTop: 4, fontSize: 12, opacity: 0.7 }} placeholder={`Statement ${i + 1} (EN, opt.)…`} />
            </div>
          );
        })}
      </div>
    );
  }

  // ORDER / Fix It ─────────────────────────────────────────────────────────────
  if (bt.kind === 'order') {
    const items = bt.items ?? ['', '', ''];
    const itemsEn = bt.itemsEn ?? [];
    const correctOrder = bt.correctOrder ?? items.map((_, i) => i);
    const btCriteria = bt.criteria;
    const btCriteriaEn = bt.criteriaEn;

    function patchOrder(newItems: string[], newOrder: number[], newItemsEn?: string[], criteria?: string, criteriaEn?: string) {
      onChange({ ...q, bunteTuete: { kind: 'order' as const, items: newItems, correctOrder: newOrder, itemsEn: newItemsEn ?? itemsEn, criteria: criteria ?? btCriteria, criteriaEn: criteriaEn ?? btCriteriaEn } });
    }
    function addItem() { patchOrder([...items, ''], [...correctOrder, items.length]); }
    function removeItem(i: number) {
      patchOrder(items.filter((_, idx) => idx !== i), correctOrder.filter(x => x !== i).map(x => x > i ? x - 1 : x));
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', fontSize: 12, color: '#94a3b8' }}>
          🔀 Teams bringen Elemente in die richtige Reihenfolge. Oben = Nummer 1.
        </div>
        <div>
          <label style={labelStyle}>Sortierkriterium (DE)</label>
          <input value={bt.criteria ?? ''} onChange={e => patchOrder(items, correctOrder, itemsEn, e.target.value, bt.criteriaEn)} style={inputStyle} placeholder="z.B. nach Größe (klein → groß)" />
          <input value={bt.criteriaEn ?? ''} onChange={e => patchOrder(items, correctOrder, itemsEn, bt.criteria, e.target.value)} style={{ ...inputStyle, marginTop: 5, fontSize: 12, opacity: 0.7 }} placeholder="e.g. by size (small → large)" />
        </div>
        <div>
          <label style={labelStyle}>Elemente <span style={{ color: '#334155', fontWeight: 400 }}>— in korrekter Reihenfolge eingeben</span></label>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5 }}>
              <div style={{ width: 22, flexShrink: 0, fontSize: 12, fontWeight: 900, color: '#3B82F6', textAlign: 'center' }}>#{i + 1}</div>
              <div style={{ flex: 1 }}>
                <input value={item} onChange={e => { const it = [...items]; it[i] = e.target.value; patchOrder(it, correctOrder); onChange({ ...q, answer: it.filter(Boolean).join(' → ') }); }}
                  style={inputStyle} placeholder={`Element ${i + 1} (DE)…`} />
                <input value={itemsEn[i] ?? ''} onChange={e => { const it = [...itemsEn]; it[i] = e.target.value; patchOrder(items, correctOrder, it); }}
                  style={{ ...inputStyle, marginTop: 4, fontSize: 12, opacity: 0.7 }} placeholder={`Element ${i + 1} (EN, opt.)…`} />
              </div>
              {items.length > 2 && (
                <button onClick={() => removeItem(i)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: 12 }}>✕</button>
              )}
            </div>
          ))}
          {items.length < 8 && (
            <button onClick={addItem} style={{ ...btnStyle('#3B82F6', true), marginTop: 4, width: '100%', fontSize: 12 }}>+ Element hinzufügen</button>
          )}
        </div>
      </div>
    );
  }

  // MAP / Pin It ───────────────────────────────────────────────────────────────
  if (bt.kind === 'map') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 12, color: '#94a3b8' }}>
        📍 Teams pinnen einen Ort auf der Weltkarte. Nähster Pin gewinnt.
      </div>
      <div>
        <label style={labelStyle}>Ort-Name (für Auflösung)</label>
        <input value={bt.targetLabel ?? ''} onChange={e => onChange({ ...q, bunteTuete: { ...bt, targetLabel: e.target.value }, answer: e.target.value })}
          style={inputStyle} placeholder="z.B. Jungfernstieg, Hamburg" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={labelStyle}>Breitengrad (Lat)</label>
          <input type="number" step="0.0001" value={bt.lat} onChange={e => onChange({ ...q, bunteTuete: { ...bt, lat: Number(e.target.value) } })}
            style={inputStyle} placeholder="z.B. 53.5503" />
        </div>
        <div>
          <label style={labelStyle}>Längengrad (Lng)</label>
          <input type="number" step="0.0001" value={bt.lng} onChange={e => onChange({ ...q, bunteTuete: { ...bt, lng: Number(e.target.value) } })}
            style={inputStyle} placeholder="z.B. 9.9922" />
        </div>
      </div>
      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 11, color: '#475569', lineHeight: 1.6 }}>
        💡 Koordinaten findest du auf Google Maps: rechtsklick → "Was ist hier?" → Lat/Lng kopieren
      </div>
    </div>
  );

  return null;
}

// ── Draft list screen ─────────────────────────────────────────────────────────
function DraftListScreen({ drafts, onOpen, onCreate, onCreateSample, onDelete }: { drafts: QQDraft[]; onOpen: (d: QQDraft) => void; onCreate: (phases: 3 | 4) => void; onCreateSample: () => void; onDelete: (id: string) => void }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: "'Nunito', system-ui, sans-serif", padding: 40, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Quarter Quiz</div>
        <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 8 }}>Fragensätze</div>
        <div style={{ fontSize: 14, color: '#475569', marginBottom: 20 }}>Erstelle einen neuen leeren Fragensatz oder lade den Hamburg Probekatalog als Beispiel.</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => onCreate(3)} style={btnStyle('#22C55E')}>+ Leer (3 Runden)</button>
          <button onClick={() => onCreate(4)} style={btnStyle('#3B82F6')}>+ Leer (4 Runden)</button>
          <button onClick={onCreateSample} style={{ ...btnStyle('#F59E0B'), display: 'flex', alignItems: 'center', gap: 6 }}>🗺️ Hamburg Probekatalog laden</button>
        </div>
      </div>
      {drafts.length === 0 ? (
        <div style={{ color: '#334155', fontSize: 16 }}>Noch keine Fragensätze — erstelle deinen ersten!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {drafts.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: '#1e293b', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 17 }}>{d.title}</div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{d.phases} Runden · {d.questions.length} Fragen · {new Date(d.updatedAt).toLocaleDateString('de-DE')}</div>
              </div>
              <button onClick={() => onOpen(d)} style={btnStyle('#3B82F6')}>Bearbeiten</button>
              <button onClick={() => onDelete(d.id)} style={btnStyle('#EF4444', true)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
function btnStyle(color: string, outline = false): React.CSSProperties {
  return { padding: '7px 16px', borderRadius: 8, border: outline ? `1px solid ${color}44` : 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13, background: outline ? 'transparent' : color, color: outline ? color : '#fff', fontFamily: 'inherit' };
}
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 };
const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 14, boxSizing: 'border-box' };
const textareaStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical' as const, lineHeight: 1.5 };
