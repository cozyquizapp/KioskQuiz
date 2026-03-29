import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  QQDraft, QQSlideElement, QQSlideTemplate, QQSlideTemplateType, QQSlideTemplates,
  QQSlideElementType,
} from '../../../shared/quarterQuizTypes';

// ── Constants ──────────────────────────────────────────────────────────────────
const CANVAS_RATIO = 16 / 9;

interface TemplateSpec {
  type: QQSlideTemplateType;
  label: string;
  icon: string;
  color: string;
  group: string;
}

const TEMPLATE_SPECS: TemplateSpec[] = [
  { type: 'LOBBY',                label: 'Lobby',          icon: '🏠', color: '#3B82F6', group: 'Start' },
  { type: 'PHASE_INTRO_1',        label: 'Runde 1 Intro',  icon: '1️⃣', color: '#3B82F6', group: 'Phasen' },
  { type: 'PHASE_INTRO_2',        label: 'Runde 2 Intro',  icon: '2️⃣', color: '#F59E0B', group: 'Phasen' },
  { type: 'PHASE_INTRO_3',        label: 'Finale Intro',   icon: '3️⃣', color: '#EF4444', group: 'Phasen' },
  { type: 'QUESTION_SCHAETZCHEN', label: 'Schätzchen',     icon: '🍯', color: '#F59E0B', group: 'Fragen' },
  { type: 'QUESTION_MUCHO',       label: 'Mu-Cho',         icon: '🎵', color: '#3B82F6', group: 'Fragen' },
  { type: 'QUESTION_BUNTE_TUETE', label: 'Bunte Tüte',    icon: '🎁', color: '#EF4444', group: 'Fragen' },
  { type: 'QUESTION_ZEHN',        label: 'All In',         icon: '🎰', color: '#22C55E', group: 'Fragen' },
  { type: 'QUESTION_CHEESE',      label: 'Picture This',   icon: '📸', color: '#8B5CF6', group: 'Fragen' },
  { type: 'REVEAL',               label: 'Auflösung',      icon: '✅', color: '#22C55E', group: 'Ablauf' },
  { type: 'PLACEMENT',            label: 'Platzierung',    icon: '🗺️',  color: '#6366F1', group: 'Ablauf' },
  { type: 'COMEBACK_CHOICE',      label: 'Comeback',       icon: '⚡', color: '#F97316', group: 'Ablauf' },
  { type: 'GAME_OVER',            label: 'Spielende',      icon: '🏆', color: '#F59E0B', group: 'Ablauf' },
];

const PH_LABELS: Partial<Record<QQSlideElementType, string>> = {
  ph_question:   'Fragetext',
  ph_options:    'Antwort-Optionen',
  ph_category:   'Kategorie-Badge',
  ph_timer:      'Timer',
  ph_teams:      'Teams-Liste',
  ph_grid:       'Territoriums-Grid',
  ph_answer:     'Aufgelöste Antwort',
  ph_winner:     'Gewinner-Team',
  ph_phase_name: 'Phasen-Name',
  ph_phase_desc: 'Phasen-Beschreibung',
  ph_room_code:  'Raum-Code',
};

const GROUPS: string[] = ['Start', 'Phasen', 'Fragen', 'Ablauf'];

// ── Element ID generator ──────────────────────────────────────────────────────
let _n = 0;
function eid() { return `el-${++_n}-${Math.random().toString(36).slice(2, 6)}`; }

// ── Default templates ─────────────────────────────────────────────────────────
function makeDefault(type: QQSlideTemplateType): QQSlideTemplate {
  const bg = '#0D0A06';
  switch (type) {
    case 'LOBBY': return {
      type, background: bg,
      elements: [
        { id: eid(), type: 'rect', x: 0, y: 0, w: 100, h: 100, background: 'radial-gradient(ellipse at 50% 100%, rgba(245,158,11,0.15) 0%, transparent 65%)', zIndex: 0 },
        { id: eid(), type: 'text', x: 15, y: 8, w: 70, h: 20, text: 'Quarter Quiz', fontSize: 7, fontWeight: 900, color: '#F59E0B', textAlign: 'center', zIndex: 2, animIn: 'pop', animDelay: 0.1 },
        { id: eid(), type: 'text', x: 20, y: 27, w: 60, h: 7, text: 'Warte auf alle Teams…', fontSize: 2.2, fontWeight: 700, color: '#64748b', textAlign: 'center', zIndex: 2 },
        { id: eid(), type: 'ph_room_code', x: 28, y: 35, w: 44, h: 12, fontSize: 4.5, fontWeight: 900, color: '#ffffff', textAlign: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: 14, zIndex: 2 },
        { id: eid(), type: 'ph_teams', x: 5, y: 51, w: 90, h: 44, zIndex: 2 },
      ],
    };
    case 'PHASE_INTRO_1': return phaseIntro(type, '#3B82F6', 'Runde 1');
    case 'PHASE_INTRO_2': return phaseIntro(type, '#F59E0B', 'Runde 2');
    case 'PHASE_INTRO_3': return phaseIntro(type, '#EF4444', 'Finale');
    case 'QUESTION_SCHAETZCHEN': return questionTpl(type, '#F59E0B');
    case 'QUESTION_MUCHO':       return questionTpl(type, '#3B82F6', true);
    case 'QUESTION_BUNTE_TUETE': return questionTpl(type, '#EF4444');
    case 'QUESTION_ZEHN':        return questionTpl(type, '#22C55E', true);
    case 'QUESTION_CHEESE':      return questionTpl(type, '#8B5CF6');
    case 'REVEAL': return {
      type, background: bg,
      elements: [
        { id: eid(), type: 'ph_category', x: 2, y: 2, w: 24, h: 10, zIndex: 2 },
        { id: eid(), type: 'ph_question', x: 4, y: 14, w: 92, h: 16, fontSize: 2.8, fontWeight: 900, color: '#94a3b8', textAlign: 'center', zIndex: 2 },
        { id: eid(), type: 'ph_answer', x: 8, y: 34, w: 84, h: 24, fontSize: 5.5, fontWeight: 900, color: '#22C55E', textAlign: 'center', zIndex: 2, animIn: 'pop', animDelay: 0.3 },
        { id: eid(), type: 'ph_winner', x: 8, y: 63, w: 84, h: 14, fontSize: 3, fontWeight: 800, color: '#F59E0B', textAlign: 'center', zIndex: 2, animIn: 'fadeUp', animDelay: 0.5 },
      ],
    };
    case 'PLACEMENT': return {
      type, background: bg,
      elements: [
        { id: eid(), type: 'text', x: 4, y: 3, w: 50, h: 8, text: 'Feld wählen', fontSize: 2.8, fontWeight: 900, color: '#e2e8f0', textAlign: 'left', zIndex: 2 },
        { id: eid(), type: 'ph_winner', x: 4, y: 10, w: 50, h: 7, fontSize: 2, fontWeight: 800, color: '#F59E0B', textAlign: 'left', zIndex: 2 },
        { id: eid(), type: 'ph_grid', x: 3, y: 19, w: 58, h: 76, zIndex: 2 },
        { id: eid(), type: 'ph_teams', x: 64, y: 3, w: 34, h: 92, zIndex: 2 },
      ],
    };
    case 'COMEBACK_CHOICE': return {
      type, background: bg,
      elements: [
        { id: eid(), type: 'rect', x: 0, y: 0, w: 100, h: 100, background: 'radial-gradient(ellipse at 50% 50%, rgba(249,115,22,0.2) 0%, transparent 65%)', zIndex: 0 },
        { id: eid(), type: 'text', x: 10, y: 12, w: 80, h: 20, text: '⚡ Comeback!', fontSize: 8, fontWeight: 900, color: '#F97316', textAlign: 'center', zIndex: 2, animIn: 'pop' },
        { id: eid(), type: 'ph_winner', x: 15, y: 38, w: 70, h: 10, fontSize: 3.2, fontWeight: 800, color: '#e2e8f0', textAlign: 'center', zIndex: 2, animIn: 'fadeUp', animDelay: 0.3 },
        { id: eid(), type: 'text', x: 15, y: 52, w: 70, h: 8, text: 'Wählt euren Comeback-Vorteil', fontSize: 2, fontWeight: 600, color: '#64748b', textAlign: 'center', zIndex: 2 },
      ],
    };
    case 'GAME_OVER': return {
      type, background: bg,
      elements: [
        { id: eid(), type: 'rect', x: 0, y: 0, w: 100, h: 100, background: 'radial-gradient(ellipse at 50% 30%, rgba(245,158,11,0.25) 0%, transparent 55%)', zIndex: 0 },
        { id: eid(), type: 'text', x: 10, y: 4, w: 80, h: 16, text: '🏆 Spielende!', fontSize: 7.5, fontWeight: 900, color: '#F59E0B', textAlign: 'center', zIndex: 2, animIn: 'pop' },
        { id: eid(), type: 'ph_winner', x: 10, y: 23, w: 80, h: 14, fontSize: 4.5, fontWeight: 900, color: '#ffffff', textAlign: 'center', zIndex: 2, animIn: 'pop', animDelay: 0.4 },
        { id: eid(), type: 'ph_grid', x: 3, y: 44, w: 55, h: 52, zIndex: 2 },
        { id: eid(), type: 'ph_teams', x: 61, y: 44, w: 36, h: 52, zIndex: 2 },
      ],
    };
  }
}

function phaseIntro(type: QQSlideTemplateType, color: string, label: string): QQSlideTemplate {
  return {
    type, background: '#0D0A06',
    elements: [
      { id: eid(), type: 'rect', x: 0, y: 0, w: 100, h: 100, background: `radial-gradient(ellipse at 50% 50%, ${color}33 0%, transparent 65%)`, zIndex: 0 },
      { id: eid(), type: 'text', x: 10, y: 16, w: 80, h: 24, text: label, fontSize: 11, fontWeight: 900, color, textAlign: 'center', zIndex: 2, animIn: 'pop', animDelay: 0.1 },
      { id: eid(), type: 'ph_phase_name', x: 10, y: 52, w: 80, h: 10, fontSize: 3.2, fontWeight: 800, color: '#e2e8f0', textAlign: 'center', zIndex: 2, animIn: 'fadeUp', animDelay: 0.3 },
      { id: eid(), type: 'ph_phase_desc', x: 15, y: 65, w: 70, h: 7, fontSize: 2, fontWeight: 600, color: '#64748b', textAlign: 'center', zIndex: 2, animIn: 'fadeIn', animDelay: 0.5 },
    ],
  };
}

function questionTpl(type: QQSlideTemplateType, color: string, hasOptions = false): QQSlideTemplate {
  return {
    type, background: '#0D0A06',
    elements: [
      { id: eid(), type: 'rect', x: 0, y: 0, w: 100, h: 100, background: `radial-gradient(ellipse at 50% 0%, ${color}18 0%, transparent 50%)`, zIndex: 0 },
      { id: eid(), type: 'ph_category', x: 2, y: 2, w: 24, h: 10, zIndex: 2 },
      { id: eid(), type: 'ph_timer', x: 76, y: 2, w: 22, h: 10, zIndex: 2 },
      { id: eid(), type: 'ph_question', x: 5, y: 15, w: 90, h: hasOptions ? 20 : 28, fontSize: hasOptions ? 3.2 : 4, fontWeight: 900, color: '#e2e8f0', textAlign: 'center', zIndex: 2, animIn: 'fadeUp', animDelay: 0.2 },
      { id: eid(), type: 'ph_options', x: 4, y: hasOptions ? 40 : 48, w: 92, h: hasOptions ? 54 : 44, zIndex: 2 },
    ],
  };
}

// ── SlideThumbnail ─────────────────────────────────────────────────────────────
function SlideThumbnail({ template }: { template: QQSlideTemplate }) {
  const sorted = [...template.elements].sort((a, b) => (a.zIndex ?? 1) - (b.zIndex ?? 1));
  return (
    <div style={{
      width: '100%', aspectRatio: '16/9', position: 'relative', overflow: 'hidden',
      background: template.background, borderRadius: 4, flexShrink: 0,
    }}>
      {sorted.map(el => {
        const isPh = el.type.startsWith('ph_');
        if (el.type === 'rect') {
          return (
            <div key={el.id} style={{
              position: 'absolute', left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%`,
              background: el.background ?? 'transparent', borderRadius: el.borderRadius ? `${el.borderRadius * 0.2}px` : undefined,
              zIndex: el.zIndex ?? 1,
            }} />
          );
        }
        if (el.type === 'text') {
          return (
            <div key={el.id} style={{
              position: 'absolute', left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%`,
              zIndex: el.zIndex ?? 1, display: 'flex', alignItems: 'center',
              justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start',
              overflow: 'hidden',
            }}>
              <span style={{
                fontSize: `${(el.fontSize ?? 3) * 0.14}px`,
                fontWeight: el.fontWeight ?? 700, color: el.color ?? '#fff',
                textAlign: el.textAlign, lineHeight: 1.2, wordBreak: 'break-word', width: '100%',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{el.text || ''}</span>
            </div>
          );
        }
        if (isPh) {
          return (
            <div key={el.id} style={{
              position: 'absolute', left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%`,
              zIndex: el.zIndex ?? 1, background: 'rgba(139,92,246,0.15)',
              border: '1px dashed rgba(139,92,246,0.4)', borderRadius: 2, display: 'flex',
              alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              <span style={{ fontSize: '4px', color: '#A78BFA', fontWeight: 700 }}>{PH_LABELS[el.type]?.slice(0, 8)}</span>
            </div>
          );
        }
        if (el.type === 'image') {
          return (
            <div key={el.id} style={{
              position: 'absolute', left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%`,
              zIndex: el.zIndex ?? 1, background: 'rgba(255,255,255,0.08)', borderRadius: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {el.imageUrl
                ? <img src={el.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: el.objectFit ?? 'contain' }} />
                : <span style={{ fontSize: '5px' }}>🖼</span>}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function QQSlideEditorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const draftId = searchParams.get('draft');

  const [draft, setDraft] = useState<QQDraft | null>(null);
  const [templates, setTemplates] = useState<QQSlideTemplates>({});
  const [activeType, setActiveType] = useState<QQSlideTemplateType>('LOBBY');
  // Multi-select: array, selectedIds[0] is the "primary" for properties panel
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [layerPanelOpen, setLayerPanelOpen] = useState(true);
  const [snapLines, setSnapLines] = useState<{ x?: number; y?: number }>({});
  const historyRef = useRef<QQSlideTemplates[]>([{}]);
  const histIdxRef = useRef(0);
  const clipboardRef = useRef<QQSlideElement[]>([]);

  // Derived: primary selected id (for properties panel)
  const selectedId = selectedIds[0] ?? null;

  useEffect(() => {
    if (!draftId) { setLoading(false); return; }
    fetch(`/api/qq/drafts/${draftId}`)
      .then(r => r.json())
      .then((d: QQDraft) => { setDraft(d); setTemplates(d.slideTemplates ?? {}); })
      .finally(() => setLoading(false));
  }, [draftId]);

  const activeTemplate: QQSlideTemplate = templates[activeType] ?? makeDefault(activeType);

  function patchTemplate(t: QQSlideTemplate) {
    setTemplates(prev => {
      const next = { ...prev, [activeType]: t };
      historyRef.current = historyRef.current.slice(0, histIdxRef.current + 1);
      historyRef.current.push(next);
      histIdxRef.current = historyRef.current.length - 1;
      return next;
    });
  }

  function patchElement(patch: Partial<QQSlideElement>) {
    if (!selectedId) return;
    patchTemplate({ ...activeTemplate, elements: activeTemplate.elements.map(e => e.id === selectedId ? { ...e, ...patch } : e) });
  }

  function addElement(type: QQSlideElementType) {
    const newEl: QQSlideElement = {
      id: eid(), type, x: 20, y: 20, w: 40, h: 20, zIndex: 5,
      ...(type === 'text'  ? { text: 'Text', fontSize: 3, fontWeight: 700, color: '#ffffff', textAlign: 'center' } : {}),
      ...(type === 'rect'  ? { background: 'rgba(30,41,59,0.8)', borderRadius: 12 } : {}),
      ...(type === 'image' ? { imageUrl: '', objectFit: 'contain' as const } : {}),
    };
    patchTemplate({ ...activeTemplate, elements: [...activeTemplate.elements, newEl] });
    setSelectedIds([newEl.id]);
  }

  function deleteSelected() {
    if (selectedIds.length === 0) return;
    const ids = new Set(selectedIds);
    patchTemplate({ ...activeTemplate, elements: activeTemplate.elements.filter(e => !ids.has(e.id)) });
    setSelectedIds([]);
  }

  function duplicateSelected() {
    if (selectedIds.length === 0) return;
    const ids = new Set(selectedIds);
    const els = activeTemplate.elements.filter(e => ids.has(e.id));
    if (els.length === 0) return;
    const copies = els.map(el => ({ ...el, id: eid(), x: el.x + 3, y: el.y + 3, zIndex: (el.zIndex ?? 1) + 1 }));
    patchTemplate({ ...activeTemplate, elements: [...activeTemplate.elements, ...copies] });
    setSelectedIds(copies.map(c => c.id));
  }

  function undo() {
    if (histIdxRef.current <= 0) return;
    histIdxRef.current--;
    setTemplates(historyRef.current[histIdxRef.current]);
    setSelectedIds([]);
    setEditingId(null);
  }
  function redo() {
    if (histIdxRef.current >= historyRef.current.length - 1) return;
    histIdxRef.current++;
    setTemplates(historyRef.current[histIdxRef.current]);
  }

  function resetTemplate() {
    if (!confirm('Folie auf Standard zurücksetzen?')) return;
    patchTemplate(makeDefault(activeType));
    setSelectedIds([]);
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const updated = { ...draft, slideTemplates: templates, updatedAt: Date.now() };
      const res = await fetch(`/api/qq/drafts/${draft.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated),
      });
      if (res.ok) setDraft(await res.json());
    } finally { setSaving(false); }
  }

  // ── Alignment helpers ─────────────────────────────────────────────────────
  function alignElements(action: string) {
    if (selectedIds.length === 0) return;
    const els = activeTemplate.elements.filter(e => selectedIds.includes(e.id));
    if (els.length === 0) return;

    // Bounding box of selection
    const minX = Math.min(...els.map(e => e.x));
    const minY = Math.min(...els.map(e => e.y));
    const maxX = Math.max(...els.map(e => e.x + e.w));
    const maxY = Math.max(...els.map(e => e.y + e.h));
    const selW = maxX - minX;
    const selH = maxY - minY;

    const idSet = new Set(selectedIds);
    const newEls = activeTemplate.elements.map(el => {
      if (!idSet.has(el.id)) return el;
      let { x, y, w, h } = el;
      switch (action) {
        case 'left':    x = els.length === 1 ? 0 : minX; break;
        case 'centerH': x = els.length === 1 ? 50 - w / 2 : minX + (selW - w) / 2; break;
        case 'right':   x = els.length === 1 ? 100 - w : maxX - w; break;
        case 'top':     y = els.length === 1 ? 0 : minY; break;
        case 'centerV': y = els.length === 1 ? 50 - h / 2 : minY + (selH - h) / 2; break;
        case 'bottom':  y = els.length === 1 ? 100 - h : maxY - h; break;
        case 'distH': {
          if (els.length < 3) break;
          const sorted = [...els].sort((a, b) => a.x - b.x);
          const totalW = sorted.reduce((sum, e) => sum + e.w, 0);
          const gap = (maxX - minX - totalW) / (sorted.length - 1);
          let cx = minX;
          const positions: Record<string, number> = {};
          sorted.forEach(e => { positions[e.id] = cx; cx += e.w + gap; });
          x = positions[el.id] ?? x;
          break;
        }
        case 'distV': {
          if (els.length < 3) break;
          const sorted = [...els].sort((a, b) => a.y - b.y);
          const totalH = sorted.reduce((sum, e) => sum + e.h, 0);
          const gap = (maxY - minY - totalH) / (sorted.length - 1);
          let cy = minY;
          const positions: Record<string, number> = {};
          sorted.forEach(e => { positions[e.id] = cy; cy += e.h + gap; });
          y = positions[el.id] ?? y;
          break;
        }
      }
      return { ...el, x, y };
    });
    patchTemplate({ ...activeTemplate, elements: newEls });
  }

  // ── Layer z-order ─────────────────────────────────────────────────────────
  function changeZ(id: string, dir: 'up' | 'down') {
    const els = [...activeTemplate.elements].sort((a, b) => (a.zIndex ?? 1) - (b.zIndex ?? 1));
    const idx = els.findIndex(e => e.id === id);
    if (idx === -1) return;
    if (dir === 'up' && idx < els.length - 1) {
      const a = els[idx], b = els[idx + 1];
      const az = a.zIndex ?? 1, bz = b.zIndex ?? 1;
      patchTemplate({ ...activeTemplate, elements: activeTemplate.elements.map(e => e.id === a.id ? { ...e, zIndex: bz } : e.id === b.id ? { ...e, zIndex: az } : e) });
    }
    if (dir === 'down' && idx > 0) {
      const a = els[idx], b = els[idx - 1];
      const az = a.zIndex ?? 1, bz = b.zIndex ?? 1;
      patchTemplate({ ...activeTemplate, elements: activeTemplate.elements.map(e => e.id === a.id ? { ...e, zIndex: bz } : e.id === b.id ? { ...e, zIndex: az } : e) });
    }
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
      if (target.isContentEditable) return;
      if (e.key === 'Escape') { setSelectedIds([]); setEditingId(null); return; }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); void save(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); duplicateSelected(); return; }
      // Ctrl+C: copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedIds.length > 0) {
          const ids = new Set(selectedIds);
          clipboardRef.current = activeTemplate.elements.filter(el => ids.has(el.id));
        }
        return;
      }
      // Ctrl+V: paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        if (clipboardRef.current.length > 0) {
          const copies = clipboardRef.current.map(el => ({ ...el, id: eid(), x: el.x + 3, y: el.y + 3 }));
          patchTemplate({ ...activeTemplate, elements: [...activeTemplate.elements, ...copies] });
          setSelectedIds(copies.map(c => c.id));
        }
        return;
      }
      if (selectedIds.length === 0) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); return; }
      const nudge = e.shiftKey ? 2 : 0.5;
      const ids = new Set(selectedIds);
      if (e.key === 'ArrowLeft')  { e.preventDefault(); patchTemplate({ ...activeTemplate, elements: activeTemplate.elements.map(el => ids.has(el.id) ? { ...el, x: Math.max(0, Math.min(97, el.x - nudge)) } : el) }); }
      if (e.key === 'ArrowRight') { e.preventDefault(); patchTemplate({ ...activeTemplate, elements: activeTemplate.elements.map(el => ids.has(el.id) ? { ...el, x: Math.max(0, Math.min(97, el.x + nudge)) } : el) }); }
      if (e.key === 'ArrowUp')    { e.preventDefault(); patchTemplate({ ...activeTemplate, elements: activeTemplate.elements.map(el => ids.has(el.id) ? { ...el, y: Math.max(0, Math.min(97, el.y - nudge)) } : el) }); }
      if (e.key === 'ArrowDown')  { e.preventDefault(); patchTemplate({ ...activeTemplate, elements: activeTemplate.elements.map(el => ids.has(el.id) ? { ...el, y: Math.max(0, Math.min(97, el.y + nudge)) } : el) }); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, editingId, activeTemplate, activeType]);

  const selectedEl = activeTemplate.elements.find(e => e.id === selectedId) ?? null;
  const spec = TEMPLATE_SPECS.find(s => s.type === activeType)!;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: "'Nunito', sans-serif", fontSize: 18, fontWeight: 800 }}>Lädt…</div>
  );
  if (!draftId || !draft) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: "'Nunito', sans-serif", color: '#e2e8f0' }}>
      <div style={{ fontSize: 18, fontWeight: 800 }}>Kein Fragensatz ausgewählt</div>
      <button onClick={() => navigate('/qq-builder')} style={btn('#3B82F6')}>← QQ Builder</button>
    </div>
  );

  return (
    <div style={{ height: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: "'Nunito', system-ui, sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        .qqse-elem:hover { outline: 1px solid rgba(59,130,246,0.5) !important; }
        .qqse-handle { position: absolute; width: 9px; height: 9px; background: #3B82F6; border: 2px solid #fff; border-radius: 2px; z-index: 9999; }
        .qqse-align-btn { padding: 5px 7px; border-radius: 5px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: #94a3b8; cursor: pointer; font-size: 13px; font-family: inherit; font-weight: 800; line-height: 1; }
        .qqse-align-btn:hover { background: rgba(59,130,246,0.2); color: #93C5FD; border-color: rgba(59,130,246,0.4); }
        .qqse-layer-row { display: flex; align-items: center; gap: 6px; padding: 5px 8px; border-radius: 6px; cursor: pointer; }
        .qqse-layer-row:hover { background: rgba(255,255,255,0.04); }
        .qqse-layer-row.selected { background: rgba(59,130,246,0.12); }
      `}</style>

      {/* ── Header ── */}
      <div style={{ padding: '8px 20px', background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={() => navigate(`/qq-builder`)} style={btn('#475569')}>← Builder</button>
        <div style={{ fontSize: 15, fontWeight: 900 }}>{draft.title}</div>
        <div style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>Folien-Editor</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={undo} disabled={histIdxRef.current <= 0} title="Rückgängig (Ctrl+Z)" style={btn('#475569', true)}>↩</button>
          <button onClick={redo} disabled={histIdxRef.current >= historyRef.current.length - 1} title="Wiederholen (Ctrl+Y)" style={btn('#475569', true)}>↪</button>
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', alignSelf: 'center' }} />
          <button onClick={resetTemplate} style={btn('#475569', true)}>Zurücksetzen</button>
          <button onClick={duplicateSelected} disabled={selectedIds.length === 0} title="Duplizieren (Ctrl+D)" style={btn('#6366F1', true)}>⎘ Duplizieren</button>
          <button onClick={deleteSelected} disabled={selectedIds.length === 0} title="Löschen (Entf)" style={btn('#EF4444', true)}>🗑 Löschen</button>
          <button onClick={save} disabled={saving} title="Speichern (Ctrl+S)" style={btn('#22C55E')}>{saving ? '…' : '💾 Speichern'}</button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left: slide list with all actual steps */}
        <div style={{ width: 240, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.07)', background: '#080c14', overflowY: 'auto' }}>
          {/* Build the real beamer/game step sequence for this draft */}
          {draft && (() => {
            // Helper to get template type for a question
            const getQuestionTemplateType = (q: QQQuestion) => {
              switch (q.category) {
                case 'SCHAETZCHEN': return 'QUESTION_SCHAETZCHEN';
                case 'MUCHO': return 'QUESTION_MUCHO';
                case 'BUNTE_TUETE': return 'QUESTION_BUNTE_TUETE';
                case 'ZEHN_VON_ZEHN': return 'QUESTION_ZEHN';
                case 'CHEESE': return 'QUESTION_CHEESE';
                default: return 'QUESTION_SCHAETZCHEN';
              }
            };
            // Build the step list
            const steps: Array<{
              key: string;
              label: string;
              type: QQSlideTemplateType;
              question?: QQQuestion;
              phase?: number;
              icon?: string;
              color?: string;
            }> = [];
            // Lobby
            steps.push({ key: 'lobby', label: 'Lobby', type: 'LOBBY', icon: '🏠', color: '#3B82F6' });
            // For each phase
            for (let p = 1; p <= draft.phases; p++) {
              steps.push({ key: `phase-intro-${p}`, label: `Runde ${p} Intro`, type: `PHASE_INTRO_${p}` as QQSlideTemplateType, icon: `${p}️⃣`, color: p === 1 ? '#3B82F6' : p === 2 ? '#F59E0B' : '#EF4444', phase: p });
              // All questions in this phase
              const qs = draft.questions.filter(q => q.phaseIndex === p);
              for (const q of qs) {
                const ttype = getQuestionTemplateType(q);
                const spec = TEMPLATE_SPECS.find(s => s.type === ttype);
                steps.push({
                  key: `q-${q.id}`,
                  label: `${spec?.label || q.category} (${q.text?.slice(0, 18)})`,
                  type: ttype,
                  question: q,
                  icon: spec?.icon,
                  color: spec?.color,
                  phase: p,
                });
                // Reveal
                steps.push({ key: `reveal-${q.id}`, label: 'Auflösung', type: 'REVEAL', icon: '✅', color: '#22C55E', question: q, phase: p });
                // Placement
                steps.push({ key: `placement-${q.id}`, label: 'Platzierung', type: 'PLACEMENT', icon: '🗺️', color: '#6366F1', question: q, phase: p });
              }
              // After phase 2, add Comeback
              if (p === 2) steps.push({ key: 'comeback', label: 'Comeback', type: 'COMEBACK_CHOICE', icon: '⚡', color: '#F97316', phase: p });
            }
            // Game over
            steps.push({ key: 'game-over', label: 'Spielende', type: 'GAME_OVER', icon: '🏆', color: '#F59E0B' });

            // Render the step list
            return (
              <div>
                <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ablauf</div>
                {steps.map((step, idx) => {
                  const isActive = activeType === step.type && (!step.question || (selectedIds[0] === step.key));
                  // For per-question slides, allow unique selection by key
                  return (
                    <button key={step.key}
                      onClick={() => {
                        setActiveType(step.type);
                        // For per-question slides, use question id as selectedId to allow unique editing
                        if (step.question) setSelectedIds([step.key]);
                        else setSelectedIds([]);
                      }}
                      style={{ width: '100%', padding: '8px 10px', background: isActive ? (step.color || '#64748b') + '18' : 'transparent', border: 'none', borderLeft: `3px solid ${isActive ? (step.color || '#64748b') : 'transparent'}`, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 5, fontFamily: 'inherit', textAlign: 'left' }}>
                      {/* Thumbnail */}
                      <SlideThumbnail template={templates[step.type] ?? makeDefault(step.type)} />
                      {/* Label row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 13, flexShrink: 0 }}>{step.icon}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: isActive ? 900 : 600, color: isActive ? (step.color || '#64748b') : '#64748b', lineHeight: 1.2 }}>{step.label}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Center: canvas + toolbar */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Toolbar */}
          <div style={{ padding: '7px 14px', background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18 }}>{spec.icon}</span>
            <span style={{ fontWeight: 900, fontSize: 13, color: spec.color }}>{spec.label}</span>
            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>Hintergrund:</span>
            <input type="color" value={activeTemplate.background.startsWith('#') ? activeTemplate.background : '#0d0a06'}
              onChange={e => patchTemplate({ ...activeTemplate, background: e.target.value })}
              style={{ width: 28, height: 22, borderRadius: 5, border: 'none', cursor: 'pointer', padding: 0 }} />
            <input value={activeTemplate.background} onChange={e => patchTemplate({ ...activeTemplate, background: e.target.value })}
              style={{ ...input, width: 260, fontSize: 11, padding: '4px 8px' }} placeholder="#000 oder CSS gradient…" />
            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)' }} />
            {/* Add static elements */}
            {(['text', 'image', 'rect'] as const).map(t => (
              <button key={t} onClick={() => addElement(t)} style={btn('#3B82F6', true)}>
                + {t === 'text' ? '📝 Text' : t === 'image' ? '🖼 Bild' : '⬛ Form'}
              </button>
            ))}
            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)' }} />
            {/* Add placeholder elements (compact) */}
            {(Object.entries(PH_LABELS) as [QQSlideElementType, string][]).map(([t, label]) => (
              <button key={t} onClick={() => addElement(t)} title={`Platzhalter: ${label}`}
                style={{ padding: '4px 7px', borderRadius: 6, border: '1px solid rgba(139,92,246,0.35)', background: 'rgba(139,92,246,0.08)', color: '#A78BFA', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: 700 }}>
                + {label.split('-')[0].split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Alignment toolbar (visible when selection exists) */}
          {selectedIds.length > 0 && (
            <div style={{ padding: '5px 14px', background: '#162032', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: '#475569', fontWeight: 800, marginRight: 4 }}>Ausrichten:</span>
              {[
                { action: 'left',    icon: '⬛←', title: 'Linksbündig' },
                { action: 'centerH', icon: '↔',  title: 'Horizontal zentrieren' },
                { action: 'right',   icon: '→⬛', title: 'Rechtsbündig' },
                { action: 'top',     icon: '⬛↑', title: 'Oben ausrichten' },
                { action: 'centerV', icon: '↕',  title: 'Vertikal zentrieren' },
                { action: 'bottom',  icon: '↓⬛', title: 'Unten ausrichten' },
                { action: 'distH',   icon: '⫞⫟', title: 'Horizontal verteilen' },
                { action: 'distV',   icon: '⫠⫡', title: 'Vertikal verteilen' },
              ].map(({ action, icon, title }) => (
                <button key={action} className="qqse-align-btn" onClick={() => alignElements(action)} title={title}>{icon}</button>
              ))}
            </div>
          )}

          {/* Canvas area */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#060a10', overflow: 'hidden' }}
            onClick={() => setSelectedIds([])}>
            <SlideCanvas
              template={activeTemplate}
              selectedIds={selectedIds}
              editingId={editingId}
              snapLines={snapLines}
              onSnapLinesChange={setSnapLines}
              onSelect={(id, shift) => {
                if (shift) {
                  setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [id, ...prev.filter(x => x !== id)]);
                } else {
                  setSelectedIds([id]);
                }
                if (!shift) setEditingId(null);
              }}
              onMultiSelect={ids => setSelectedIds(ids)}
              onClearSelect={() => setSelectedIds([])}
              onUpdate={(id, patch) => patchTemplate({ ...activeTemplate, elements: activeTemplate.elements.map(e => e.id === id ? { ...e, ...patch } : e) })}
              onUpdateMulti={(patches) => {
                const patchMap = new Map(patches.map(p => [p.id, p.patch]));
                patchTemplate({ ...activeTemplate, elements: activeTemplate.elements.map(e => patchMap.has(e.id) ? { ...e, ...patchMap.get(e.id) } : e) });
              }}
              onStartEdit={setEditingId}
              onEndEdit={(id, text) => {
                patchTemplate({ ...activeTemplate, elements: activeTemplate.elements.map(e => e.id === id ? { ...e, text } : e) });
                setEditingId(null);
              }}
            />
          </div>
        </div>

        {/* Right: properties + layer panel */}
        <div style={{ width: 290, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.07)', background: '#1e293b', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>
            {selectedEl ? (
              <PropertiesPanel element={selectedEl} onChange={patchElement} onDelete={deleteSelected} onDuplicate={duplicateSelected} />
            ) : (
              <EmptyProperties onAdd={addElement} />
            )}
          </div>

          {/* Layer Panel */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
            <button onClick={() => setLayerPanelOpen(p => !p)}
              style={{ width: '100%', padding: '8px 14px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', color: '#94a3b8', fontWeight: 800, fontSize: 11 }}>
              <span style={{ fontSize: 10 }}>{layerPanelOpen ? '▼' : '▶'}</span>
              Ebenen
              <span style={{ marginLeft: 'auto', fontSize: 9, color: '#475569' }}>{activeTemplate.elements.length}</span>
            </button>
            {layerPanelOpen && (
              <div style={{ padding: '4px 6px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[...activeTemplate.elements]
                  .sort((a, b) => (b.zIndex ?? 1) - (a.zIndex ?? 1))
                  .map(el => {
                    const isPh = el.type.startsWith('ph_');
                    const isSelected = selectedIds.includes(el.id);
                    const icon = isPh ? '⬡' : el.type === 'text' ? '📝' : el.type === 'image' ? '🖼' : '⬛';
                    const label = isPh ? (PH_LABELS[el.type] ?? el.type) : (el.type === 'text' ? (el.text?.slice(0, 16) ?? 'Text') : el.type);
                    return (
                      <div key={el.id}
                        className={`qqse-layer-row${isSelected ? ' selected' : ''}`}
                        onClick={() => setSelectedIds([el.id])}>
                        <span style={{ fontSize: 11, flexShrink: 0 }}>{icon}</span>
                        <span style={{ flex: 1, fontSize: 10, color: isSelected ? '#93C5FD' : '#64748b', fontWeight: isSelected ? 800 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                        <span style={{ fontSize: 9, color: '#334155', fontWeight: 700, flexShrink: 0, marginRight: 2 }}>{el.zIndex ?? 1}</span>
                        <button onClick={e => { e.stopPropagation(); changeZ(el.id, 'up'); }}
                          style={{ padding: '1px 4px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit', lineHeight: 1 }} title="Ebene nach vorne">↑</button>
                        <button onClick={e => { e.stopPropagation(); changeZ(el.id, 'down'); }}
                          style={{ padding: '1px 4px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit', lineHeight: 1 }} title="Ebene nach hinten">↓</button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SlideCanvas ───────────────────────────────────────────────────────────────
const SNAP_THRESHOLD = 1.5; // percent

function SlideCanvas({ template, selectedIds, editingId, snapLines, onSnapLinesChange, onSelect, onMultiSelect, onClearSelect, onUpdate, onUpdateMulti, onStartEdit, onEndEdit }: {
  template: QQSlideTemplate;
  selectedIds: string[];
  editingId: string | null;
  snapLines: { x?: number; y?: number };
  onSnapLinesChange: (lines: { x?: number; y?: number }) => void;
  onSelect: (id: string, shift: boolean) => void;
  onMultiSelect: (ids: string[]) => void;
  onClearSelect: () => void;
  onUpdate: (id: string, patch: Partial<QQSlideElement>) => void;
  onUpdateMulti: (patches: Array<{ id: string; patch: Partial<QQSlideElement> }>) => void;
  onStartEdit: (id: string) => void;
  onEndEdit: (id: string, text: string) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasW, setCanvasW] = useState(800);
  const canvasH = canvasW / CANVAS_RATIO;

  // dragRef stores per-element start positions for multi-drag
  const dragRef = useRef<{ ids: string[]; startMX: number; startMY: number; starts: Array<{ id: string; x: number; y: number }> } | null>(null);
  const resizeRef = useRef<{ id: string; handle: string; startMX: number; startMY: number; startX: number; startY: number; startW: number; startH: number } | null>(null);
  const marqueeRef = useRef<{ startX: number; startY: number; curX: number; curY: number } | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      setCanvasW(w);
    });
    obs.observe(canvasRef.current);
    return () => obs.disconnect();
  }, []);

  const applySnap = useCallback((elId: string, rawX: number, rawY: number, elW: number, elH: number) => {
    let x = rawX, y = rawY;
    const newSnap: { x?: number; y?: number } = {};

    // Horizontal snaps
    const cx = x + elW / 2;
    if (Math.abs(cx - 50) < SNAP_THRESHOLD) { x = 50 - elW / 2; newSnap.x = 50; }
    else if (Math.abs(x) < SNAP_THRESHOLD) { x = 0; newSnap.x = 0; }
    else if (Math.abs(x + elW - 100) < SNAP_THRESHOLD) { x = 100 - elW; newSnap.x = 100; }

    // Vertical snaps
    const cy = y + elH / 2;
    if (Math.abs(cy - 50) < SNAP_THRESHOLD) { y = 50 - elH / 2; newSnap.y = 50; }
    else if (Math.abs(y) < SNAP_THRESHOLD) { y = 0; newSnap.y = 0; }
    else if (Math.abs(y + elH - 100) < SNAP_THRESHOLD) { y = 100 - elH; newSnap.y = 100; }

    onSnapLinesChange(newSnap);
    return { x, y };
  }, [onSnapLinesChange]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cw = rect.width, ch = rect.height;

      if (dragRef.current) {
        const { ids, startMX, startMY, starts } = dragRef.current;
        const dx = ((e.clientX - startMX) / cw) * 100;
        const dy = ((e.clientY - startMY) / ch) * 100;

        // For single element drag, apply snap
        if (ids.length === 1) {
          const s = starts[0];
          const el = template.elements.find(el => el.id === s.id);
          if (el) {
            const rawX = Math.max(0, Math.min(97, s.x + dx));
            const rawY = Math.max(0, Math.min(97, s.y + dy));
            const { x, y } = applySnap(s.id, rawX, rawY, el.w, el.h);
            onUpdate(s.id, { x, y });
          }
        } else {
          // Multi-drag: move all without snap
          const patches = starts.map(s => ({
            id: s.id,
            patch: {
              x: Math.max(0, Math.min(97, s.x + dx)),
              y: Math.max(0, Math.min(97, s.y + dy)),
            },
          }));
          onUpdateMulti(patches);
        }
      }

      if (resizeRef.current) {
        const { id, handle, startMX, startMY, startX, startY, startW, startH } = resizeRef.current;
        const dx = ((e.clientX - startMX) / cw) * 100;
        const dy = ((e.clientY - startMY) / ch) * 100;
        const patch: Partial<QQSlideElement> = {};
        if (handle.includes('e')) patch.w = Math.max(4, startW + dx);
        if (handle.includes('w')) { patch.x = Math.max(0, startX + dx); patch.w = Math.max(4, startW - dx); }
        if (handle.includes('s')) patch.h = Math.max(3, startH + dy);
        if (handle.includes('n')) { patch.y = Math.max(0, startY + dy); patch.h = Math.max(3, startH - dy); }
        onUpdate(id, patch);
      }

      if (marqueeRef.current) {
        const mx = ((e.clientX - rect.left) / cw) * 100;
        const my = ((e.clientY - rect.top) / ch) * 100;
        marqueeRef.current.curX = mx;
        marqueeRef.current.curY = my;
        const { startX, startY } = marqueeRef.current;
        setMarqueeRect({
          x: Math.min(startX, mx),
          y: Math.min(startY, my),
          w: Math.abs(mx - startX),
          h: Math.abs(my - startY),
        });
      }
    }

    function onUp(e: MouseEvent) {
      if (marqueeRef.current) {
        const { startX, startY, curX, curY } = marqueeRef.current;
        const x1 = Math.min(startX, curX), x2 = Math.max(startX, curX);
        const y1 = Math.min(startY, curY), y2 = Math.max(startY, curY);
        if (Math.abs(x2 - x1) > 1 || Math.abs(y2 - y1) > 1) {
          const selected = template.elements.filter(el => {
            const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
            return cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2;
          });
          if (selected.length > 0) onMultiSelect(selected.map(el => el.id));
        }
        marqueeRef.current = null;
        setMarqueeRect(null);
      }
      dragRef.current = null;
      resizeRef.current = null;
      onSnapLinesChange({});
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [onUpdate, onUpdateMulti, onMultiSelect, onSnapLinesChange, applySnap, template.elements]);

  const sorted = [...template.elements].sort((a, b) => (a.zIndex ?? 1) - (b.zIndex ?? 1));

  return (
    <div ref={canvasRef}
      style={{ width: '100%', maxWidth: `${canvasH * CANVAS_RATIO}px`, aspectRatio: `${CANVAS_RATIO}`, position: 'relative', overflow: 'hidden', background: template.background, borderRadius: 10, boxShadow: '0 0 60px rgba(0,0,0,0.8)', userSelect: 'none' }}
      onMouseDown={e => {
        if (e.target !== e.currentTarget) return;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = ((e.clientX - rect.left) / rect.width) * 100;
        const my = ((e.clientY - rect.top) / rect.height) * 100;
        marqueeRef.current = { startX: mx, startY: my, curX: mx, curY: my };
        onClearSelect();
      }}
      onClick={e => { if (e.target === e.currentTarget) onClearSelect(); }}>

      {sorted.map(el => (
        <CanvasElement key={el.id} el={el} canvasW={canvasW}
          selected={selectedIds.includes(el.id)}
          editing={editingId === el.id}
          onSelect={(shift) => onSelect(el.id, shift)}
          onDragStart={(e) => {
            e.stopPropagation();
            onSelect(el.id, e.shiftKey);
            // Build multi-drag starts: include all currently selected + this element
            const ids = selectedIds.includes(el.id) ? selectedIds : [el.id];
            const starts = ids.map(id => {
              const found = template.elements.find(x => x.id === id);
              return { id, x: found?.x ?? 0, y: found?.y ?? 0 };
            });
            dragRef.current = { ids, startMX: e.clientX, startMY: e.clientY, starts };
          }}
          onResizeStart={(e, handle) => { e.stopPropagation(); resizeRef.current = { id: el.id, handle, startMX: e.clientX, startMY: e.clientY, startX: el.x, startY: el.y, startW: el.w, startH: el.h }; }}
          onDblClick={() => { if (el.type === 'text') { onSelect(el.id, false); onStartEdit(el.id); } }}
          onEndEdit={text => onEndEdit(el.id, text)}
        />
      ))}

      {/* Marquee selection rect */}
      {marqueeRect && (
        <div style={{
          position: 'absolute',
          left: `${marqueeRect.x}%`, top: `${marqueeRect.y}%`,
          width: `${marqueeRect.w}%`, height: `${marqueeRect.h}%`,
          border: '1px solid #3B82F6', background: 'rgba(59,130,246,0.08)',
          pointerEvents: 'none', zIndex: 99999,
        }} />
      )}

      {/* Snap lines */}
      {snapLines.x !== undefined && (
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${snapLines.x}%`, width: 1, background: '#3B82F6', opacity: 0.7, pointerEvents: 'none', zIndex: 99998 }} />
      )}
      {snapLines.y !== undefined && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: `${snapLines.y}%`, height: 1, background: '#3B82F6', opacity: 0.7, pointerEvents: 'none', zIndex: 99998 }} />
      )}
    </div>
  );
}

// ── CanvasElement ─────────────────────────────────────────────────────────────
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
const HANDLE_STYLE: Record<string, React.CSSProperties> = {
  nw: { top: '-5px', left: '-5px',                    cursor: 'nw-resize' },
  n:  { top: '-5px', left: 'calc(50% - 4px)',          cursor: 'n-resize' },
  ne: { top: '-5px', left: 'calc(100% - 4px)',         cursor: 'ne-resize' },
  e:  { top: 'calc(50% - 4px)', left: 'calc(100% - 4px)', cursor: 'e-resize' },
  se: { top: 'calc(100% - 4px)', left: 'calc(100% - 4px)', cursor: 'se-resize' },
  s:  { top: 'calc(100% - 4px)', left: 'calc(50% - 4px)', cursor: 's-resize' },
  sw: { top: 'calc(100% - 4px)', left: '-5px',         cursor: 'sw-resize' },
  w:  { top: 'calc(50% - 4px)', left: '-5px',          cursor: 'w-resize' },
};

function CanvasElement({ el, canvasW, selected, editing, onSelect, onDragStart, onResizeStart, onDblClick, onEndEdit }: {
  el: QQSlideElement; canvasW: number; selected: boolean; editing: boolean;
  onSelect: (shift: boolean) => void;
  onDragStart: (e: React.MouseEvent) => void;
  onResizeStart: (e: React.MouseEvent, handle: string) => void;
  onDblClick: () => void;
  onEndEdit: (text: string) => void;
}) {
  const isPh = el.type.startsWith('ph_');
  const fs = el.fontSize ? `${(el.fontSize / 100) * canvasW}px` : undefined;
  const editRef = useRef<HTMLDivElement>(null);
  const fontFamily = (el as QQSlideElement & { fontFamily?: string }).fontFamily;

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(editRef.current);
      range.collapse(false);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }
  }, [editing]);

  return (
    <div className="qqse-elem"
      style={{
        position: 'absolute', left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%`,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        zIndex: el.zIndex ?? 1, opacity: el.opacity ?? 1,
        cursor: editing ? 'text' : 'move', boxSizing: 'border-box', overflow: 'hidden',
        background: el.background ?? (isPh ? 'rgba(139,92,246,0.10)' : 'transparent'),
        borderRadius: el.borderRadius != null ? `${el.borderRadius}px` : undefined,
        border: editing ? '2px solid #F59E0B' : (selected ? '2px solid #3B82F6' : (isPh ? '1.5px dashed rgba(139,92,246,0.4)' : (el.border ?? undefined))),
        outline: selected && !editing ? '1px solid rgba(59,130,246,0.3)' : undefined,
        outlineOffset: selected ? '3px' : undefined,
      }}
      onClick={e => { e.stopPropagation(); onSelect(e.shiftKey); }}
      onDoubleClick={e => { e.stopPropagation(); onDblClick(); }}
      onMouseDown={e => { if (!editing) { onDragStart(e); } }}>

      {/* Text content */}
      {el.type === 'text' && !editing && (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', padding: '2px 6px', boxSizing: 'border-box', justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start' }}>
          <span style={{ fontSize: fs, fontWeight: el.fontWeight ?? 700, color: el.color ?? '#fff', textAlign: el.textAlign, lineHeight: el.lineHeight ?? 1.3, letterSpacing: el.letterSpacing != null ? `${el.letterSpacing}em` : undefined, wordBreak: 'break-word', width: '100%', fontFamily: fontFamily ?? "'Nunito', sans-serif" }}>
            {el.text || '…'}
          </span>
        </div>
      )}

      {/* In-place text editing */}
      {el.type === 'text' && editing && (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', padding: '2px 6px', boxSizing: 'border-box', justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start' }}>
          <div
            ref={editRef}
            contentEditable
            suppressContentEditableWarning
            style={{ fontSize: fs, fontWeight: el.fontWeight ?? 700, color: el.color ?? '#fff', textAlign: el.textAlign, lineHeight: el.lineHeight ?? 1.3, wordBreak: 'break-word', width: '100%', outline: 'none', whiteSpace: 'pre-wrap', minHeight: '1em', fontFamily: fontFamily ?? "'Nunito', sans-serif" }}
            onBlur={e => onEndEdit(e.currentTarget.innerText)}
            onKeyDown={e => {
              e.stopPropagation();
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.target as HTMLElement).blur(); }
              if (e.key === 'Escape') { (e.target as HTMLElement).blur(); }
            }}
            onClick={e => e.stopPropagation()}
          >
            {el.text}
          </div>
        </div>
      )}

      {/* Image */}
      {el.type === 'image' && el.imageUrl && (
        <img src={el.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: el.objectFit ?? 'contain', display: 'block', pointerEvents: 'none' }} />
      )}
      {el.type === 'image' && !el.imageUrl && (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', fontSize: Math.max(9, canvasW * 0.012), color: '#334155' }}>🖼</div>
      )}

      {/* Placeholder */}
      {isPh && (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: 4, boxSizing: 'border-box' }}>
          <div style={{ fontSize: Math.max(8, canvasW * 0.013), fontWeight: 800, color: '#A78BFA', textAlign: 'center', lineHeight: 1.3 }}>[{PH_LABELS[el.type]}]</div>
          {el.fontSize && <div style={{ fontSize: Math.max(7, canvasW * 0.009), color: '#475569', fontWeight: 600 }}>{el.fontSize}vw</div>}
        </div>
      )}

      {/* Shape: just background, no text */}
      {el.type === 'rect' && !el.background && (
        <div style={{ width: '100%', height: '100%' }} />
      )}

      {/* Resize handles (selected only) */}
      {selected && HANDLES.map(h => (
        <div key={h} className="qqse-handle" style={{ ...HANDLE_STYLE[h] }}
          onMouseDown={e => { e.stopPropagation(); onResizeStart(e, h); }} />
      ))}

      {/* Selected label */}
      {selected && (
        <div style={{ position: 'absolute', bottom: '-18px', left: 0, fontSize: 9, color: '#3B82F6', fontWeight: 700, whiteSpace: 'nowrap', background: '#0f172a', padding: '1px 4px', borderRadius: 3 }}>
          {isPh ? PH_LABELS[el.type] : el.type} · {Math.round(el.x)},{Math.round(el.y)} · {Math.round(el.w)}×{Math.round(el.h)}
        </div>
      )}
    </div>
  );
}

// ── PropertiesPanel ───────────────────────────────────────────────────────────
const ANIM_IN_OPTIONS: Array<QQSlideElement['animIn']> = ['none', 'fadeIn', 'fadeUp', 'pop', 'slideLeft', 'slideRight'];
const FONT_OPTIONS = [
  { value: "'Nunito', sans-serif", label: 'Nunito (Standard)' },
  { value: 'Georgia, serif',       label: 'Georgia (Serif)' },
  { value: 'monospace',            label: 'Monospace' },
  { value: "'Impact', sans-serif", label: 'Impact' },
];

function PropertiesPanel({ element: el, onChange, onDelete, onDuplicate }: {
  element: QQSlideElement;
  onChange: (p: Partial<QQSlideElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const isPh = el.type.startsWith('ph_');
  const uploadRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const fontFamily = (el as QQSlideElement & { fontFamily?: string }).fontFamily ?? '';

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/upload/question-image', { method: 'POST', body: fd });
      if (res.ok) {
        const { url } = await res.json() as { url: string };
        onChange({ imageUrl: url } as Partial<QQSlideElement>);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <div style={{ flex: 1, fontSize: 12, fontWeight: 900, color: isPh ? '#A78BFA' : '#93C5FD' }}>
          {isPh ? `[${PH_LABELS[el.type]}]` : el.type === 'text' ? '📝 Text' : el.type === 'image' ? '🖼 Bild' : '⬛ Form'}
        </div>
        <button onClick={onDuplicate} style={{ ...btn('#6366F1', true), padding: '2px 7px', fontSize: 11 }}>⎘</button>
        <button onClick={onDelete} style={{ ...btn('#EF4444', true), padding: '2px 7px', fontSize: 11 }}>✕</button>
      </div>

      {/* Emoji/Icon */}
      <Section label="Emoji / Icon">
        <Field label="Emoji/Icon (optional)">
          <input value={el.emoji ?? ''} onChange={e => onChange({ emoji: e.target.value })} style={{ ...input, fontSize: 22, width: 60, textAlign: 'center' }} maxLength={2} placeholder="z.B. 🎉" />
        </Field>
      </Section>

      {isPh && (
        <div style={{ padding: '7px 9px', borderRadius: 7, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', fontSize: 11, color: '#8b7cf8', lineHeight: 1.5 }}>
          Zeigt Live-Daten im Beamer. Position und Größe sind hier editierbar.
        </div>
      )}

      {/* Position & Size */}
      <Section label="Position & Größe">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {(['x', 'y', 'w', 'h'] as const).map(k => (
            <Field key={k} label={`${k.toUpperCase()} %`}>
              <input type="number" value={parseFloat(el[k].toFixed(1))} step={0.5} onChange={e => onChange({ [k]: Number(e.target.value) })} style={{ ...input, padding: '4px 7px' }} />
            </Field>
          ))}
          <Field label="Z-Ebene">
            <input type="number" value={el.zIndex ?? 1} step={1} onChange={e => onChange({ zIndex: Number(e.target.value) })} style={{ ...input, padding: '4px 7px' }} />
          </Field>
          <Field label="Drehung °">
            <input type="number" value={el.rotation ?? 0} step={1} onChange={e => onChange({ rotation: Number(e.target.value) })} style={{ ...input, padding: '4px 7px' }} />
          </Field>
        </div>
        <Field label={`Deckkraft (${((el.opacity ?? 1) * 100).toFixed(0)}%)`}>
          <input type="range" min={0} max={100} value={(el.opacity ?? 1) * 100} onChange={e => onChange({ opacity: Number(e.target.value) / 100 })} style={{ width: '100%' }} />
        </Field>
      </Section>

      {/* Text */}
      {(el.type === 'text' || isPh) && (
        <Section label="Text-Stil">
          {el.type === 'text' && (
            <textarea value={el.text ?? ''} onChange={e => onChange({ text: e.target.value })}
              style={{ ...input, resize: 'vertical', minHeight: 52, marginBottom: 6 }} placeholder="Text…" />
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <Field label="Schrift (vw)">
              <input type="number" value={el.fontSize ?? 3} step={0.2} onChange={e => onChange({ fontSize: Number(e.target.value) })} style={{ ...input, padding: '4px 7px' }} />
            </Field>
            <Field label="Stärke">
              <select value={el.fontWeight ?? 700} onChange={e => onChange({ fontWeight: Number(e.target.value) })} style={{ ...input, padding: '4px 7px' }}>
                {[400, 600, 700, 800, 900].map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Schriftart">
            <select value={fontFamily} onChange={e => onChange({ fontFamily: e.target.value } as Partial<QQSlideElement>)} style={{ ...input, padding: '4px 7px' }}>
              <option value="">Standard (Nunito)</option>
              {FONT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Farbe">
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="color" value={el.color ?? '#ffffff'} onChange={e => onChange({ color: e.target.value })} style={{ width: 30, height: 28, borderRadius: 5, border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }} />
              <input value={el.color ?? '#ffffff'} onChange={e => onChange({ color: e.target.value })} style={{ ...input, flex: 1, padding: '4px 7px', fontFamily: 'monospace', fontSize: 12 }} />
            </div>
          </Field>
          <Field label="Ausrichtung">
            <div style={{ display: 'flex', gap: 4 }}>
              {(['left', 'center', 'right'] as const).map(a => (
                <button key={a} onClick={() => onChange({ textAlign: a })} style={{ flex: 1, padding: '5px', borderRadius: 6, border: 'none', cursor: 'pointer', background: el.textAlign === a ? '#3B82F6' : 'rgba(255,255,255,0.06)', color: el.textAlign === a ? '#fff' : '#64748b', fontFamily: 'inherit', fontSize: 13, fontWeight: 800 }}>
                  {a === 'left' ? '⬅' : a === 'center' ? '↔' : '➡'}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Zeilenabstand">
            <input type="number" value={el.lineHeight ?? 1.3} step={0.1} onChange={e => onChange({ lineHeight: Number(e.target.value) })} style={{ ...input, padding: '4px 7px' }} />
          </Field>
        </Section>
      )}

      {/* Background / shape */}
      {(el.type === 'rect' || isPh) && (
        <Section label="Hintergrund">
          <Field label="CSS-Farbe / Gradient">
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {(el.background ?? '').startsWith('#') && (
                <input type="color" value={el.background ?? '#1e293b'} onChange={e => onChange({ background: e.target.value })} style={{ width: 30, height: 28, borderRadius: 5, border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }} />
              )}
              <input value={el.background ?? ''} onChange={e => onChange({ background: e.target.value })} style={{ ...input, flex: 1, padding: '4px 7px', fontFamily: 'monospace', fontSize: 11 }} placeholder="#1e293b oder gradient…" />
            </div>
          </Field>
          <Field label="Eckenradius (px)">
            <input type="number" value={el.borderRadius ?? 0} step={2} onChange={e => onChange({ borderRadius: Number(e.target.value) })} style={{ ...input, padding: '4px 7px' }} />
          </Field>
        </Section>
      )}

      {/* Image */}
      {el.type === 'image' && (
        <Section label="Bild">
          <Field label="URL">
            <input value={el.imageUrl ?? ''} onChange={e => onChange({ imageUrl: e.target.value })} style={{ ...input, padding: '4px 7px', fontFamily: 'monospace', fontSize: 11 }} placeholder="https://…" />
          </Field>
          <Field label="Hochladen">
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                onClick={() => uploadRef.current?.click()}
                disabled={uploading}
                style={{ ...btn('#3B82F6', true), padding: '5px 10px', fontSize: 11 }}>
                {uploading ? '⏳ Lädt…' : '📤 Hochladen'}
              </button>
              <input
                ref={uploadRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) void handleUpload(f); e.target.value = ''; }}
              />
              {el.imageUrl && (
                <img src={el.imageUrl} alt="" style={{ width: 36, height: 24, objectFit: 'cover', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }} />
              )}
            </div>
          </Field>
          <Field label="Darstellung">
            <div style={{ display: 'flex', gap: 4 }}>
              {(['cover', 'contain'] as const).map(f => (
                <button key={f} onClick={() => onChange({ objectFit: f })} style={{ flex: 1, padding: '5px', borderRadius: 6, border: 'none', cursor: 'pointer', background: (el.objectFit ?? 'contain') === f ? '#3B82F6' : 'rgba(255,255,255,0.06)', color: (el.objectFit ?? 'contain') === f ? '#fff' : '#64748b', fontFamily: 'inherit', fontSize: 12, fontWeight: 800 }}>{f}</button>
              ))}
            </div>
          </Field>
        </Section>
      )}

      {/* Animation & Effekte */}
      <Section label="Animation & Effekte">
        <Field label="Animationstyp">
          <select value={el.animIn ?? 'none'} onChange={e => onChange({ animIn: e.target.value })} style={{ ...input, padding: '4px 7px' }}>
            {ANIM_IN_OPTIONS.map(a => <option key={String(a)} value={a}>{a ?? 'none'}</option>)}
          </select>
        </Field>
        {el.animIn && el.animIn !== 'none' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 4 }}>
            <Field label="Verzögerung (s)">
              <input type="number" value={el.animDelay ?? 0} step={0.1} min={0} onChange={e => onChange({ animDelay: Number(e.target.value) })} style={{ ...input, padding: '4px 7px' }} />
            </Field>
            <Field label="Dauer (s)">
              <input type="number" value={el.animDuration ?? 0.5} step={0.1} min={0.1} onChange={e => onChange({ animDuration: Number(e.target.value) })} style={{ ...input, padding: '4px 7px' }} />
            </Field>
          </div>
        )}
        <Field label="Spezialeffekt">
          <select value={el.effect ?? ''} onChange={e => onChange({ effect: e.target.value })} style={{ ...input, padding: '4px 7px' }}>
            <option value="">Keiner</option>
            <option value="glow">Glow</option>
            <option value="pulse">Pulse</option>
            <option value="shake">Shake</option>
            <option value="custom">Custom (CSS)</option>
          </select>
        </Field>
        {el.effect === 'custom' && (
          <Field label="Custom CSS-Klasse">
            <input value={el.effectClass ?? ''} onChange={e => onChange({ effectClass: e.target.value })} style={{ ...input, padding: '4px 7px' }} placeholder="z.B. my-special-effect" />
          </Field>
        )}
      </Section>
    </div>
  );
}

// ── EmptyProperties ───────────────────────────────────────────────────────────
function EmptyProperties({ onAdd }: { onAdd: (t: QQSlideElementType) => void }) {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Element hinzufügen</div>
      <div style={{ fontSize: 11, color: '#475569', marginBottom: 8, fontWeight: 700 }}>Statische Elemente:</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
        {([['text', '📝 Text — statischer Text'], ['image', '🖼 Bild — URL oder hochladen'], ['rect', '⬛ Form — Hintergrund, Overlay']] as const).map(([t, label]) => (
          <button key={t} onClick={() => onAdd(t)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.06)', color: '#93C5FD', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, textAlign: 'left' }}>{label}</button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: '#475569', marginBottom: 8, fontWeight: 700 }}>Dynamische Platzhalter (Live-Daten):</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
        {(Object.entries(PH_LABELS) as [QQSlideElementType, string][]).map(([t, label]) => (
          <button key={t} onClick={() => onAdd(t)} style={{ padding: '6px 8px', borderRadius: 7, border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.06)', color: '#A78BFA', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, fontWeight: 700, textAlign: 'left' }}>+ {label}</button>
        ))}
      </div>
      <div style={{ marginTop: 14, padding: '10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', fontSize: 11, color: '#334155', lineHeight: 1.6 }}>
        Klicke auf ein Element zum Bearbeiten.<br />
        Shift+Klick = Mehrfachauswahl · Drag leer = Marquee<br />
        Drag = verschieben · Ecken = Größe ändern<br />
        Doppelklick auf Text = direkt bearbeiten<br />
        <strong style={{ color: '#475569' }}>Tastatur:</strong> Entf = löschen · Pfeile = nudgen · Shift+Pfeile = groß nudgen<br />
        Ctrl+Z/Y = Undo/Redo · Ctrl+D = duplizieren · Ctrl+S = speichern<br />
        Ctrl+C/V = Kopieren/Einfügen
      </div>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, marginBottom: 3 }}>{label}</div>
      {children}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
function btn(color: string, outline = false): React.CSSProperties {
  return { padding: '6px 13px', borderRadius: 7, border: outline ? `1px solid ${color}44` : 'none', cursor: 'pointer', fontWeight: 800, fontSize: 12, background: outline ? 'transparent' : color, color: outline ? color : '#fff', fontFamily: 'inherit' };
}
const input: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '7px 10px', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 13, boxSizing: 'border-box' };
