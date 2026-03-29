import { useState, useEffect, useRef } from 'react';
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function QQSlideEditorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const draftId = searchParams.get('draft');

  const [draft, setDraft] = useState<QQDraft | null>(null);
  const [templates, setTemplates] = useState<QQSlideTemplates>({});
  const [activeType, setActiveType] = useState<QQSlideTemplateType>('LOBBY');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!draftId) { setLoading(false); return; }
    fetch(`/api/qq/drafts/${draftId}`)
      .then(r => r.json())
      .then((d: QQDraft) => { setDraft(d); setTemplates(d.slideTemplates ?? {}); })
      .finally(() => setLoading(false));
  }, [draftId]);

  const activeTemplate: QQSlideTemplate = templates[activeType] ?? makeDefault(activeType);

  function patchTemplate(t: QQSlideTemplate) {
    setTemplates(prev => ({ ...prev, [activeType]: t }));
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
    setSelectedId(newEl.id);
  }

  function deleteSelected() {
    if (!selectedId) return;
    patchTemplate({ ...activeTemplate, elements: activeTemplate.elements.filter(e => e.id !== selectedId) });
    setSelectedId(null);
  }

  function duplicateSelected() {
    if (!selectedId) return;
    const el = activeTemplate.elements.find(e => e.id === selectedId);
    if (!el) return;
    const copy = { ...el, id: eid(), x: el.x + 3, y: el.y + 3, zIndex: (el.zIndex ?? 1) + 1 };
    patchTemplate({ ...activeTemplate, elements: [...activeTemplate.elements, copy] });
    setSelectedId(copy.id);
  }

  function resetTemplate() {
    if (!confirm('Folie auf Standard zurücksetzen?')) return;
    patchTemplate(makeDefault(activeType));
    setSelectedId(null);
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
      `}</style>

      {/* ── Header ── */}
      <div style={{ padding: '8px 20px', background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={() => navigate(`/qq-builder`)} style={btn('#475569')}>← Builder</button>
        <div style={{ fontSize: 15, fontWeight: 900 }}>{draft.title}</div>
        <div style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>Folien-Editor</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={resetTemplate} style={btn('#475569', true)}>↩ Zurücksetzen</button>
          <button onClick={duplicateSelected} disabled={!selectedId} style={btn('#6366F1', true)}>⎘ Duplizieren</button>
          <button onClick={deleteSelected} disabled={!selectedId} style={btn('#EF4444', true)}>🗑 Löschen</button>
          <button onClick={save} disabled={saving} style={btn('#22C55E')}>{saving ? '…' : '💾 Speichern'}</button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left: slide list */}
        <div style={{ width: 196, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.07)', background: '#080c14', overflowY: 'auto' }}>
          {GROUPS.map(group => {
            const specs = TEMPLATE_SPECS.filter(s => s.group === group);
            return (
              <div key={group}>
                <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{group}</div>
                {specs.map(s => {
                  const isActive = activeType === s.type;
                  const isCustom = !!templates[s.type];
                  return (
                    <button key={s.type} onClick={() => { setActiveType(s.type); setSelectedId(null); }} style={{ width: '100%', padding: '9px 14px', background: isActive ? s.color + '20' : 'transparent', border: 'none', borderLeft: `3px solid ${isActive ? s.color : 'transparent'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', textAlign: 'left' }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: isActive ? 900 : 600, color: isActive ? s.color : '#64748b', lineHeight: 1.2 }}>{s.label}</div>
                        {isCustom && <div style={{ fontSize: 9, color: '#22C55E', fontWeight: 700 }}>✓ angepasst</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
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

          {/* Canvas area */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#060a10', overflow: 'hidden' }}
            onClick={() => setSelectedId(null)}>
            <SlideCanvas
              template={activeTemplate}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onUpdate={(id, patch) => patchTemplate({ ...activeTemplate, elements: activeTemplate.elements.map(e => e.id === id ? { ...e, ...patch } : e) })}
            />
          </div>
        </div>

        {/* Right: properties */}
        <div style={{ width: 290, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.07)', background: '#1e293b', overflowY: 'auto' }}>
          {selectedEl ? (
            <PropertiesPanel element={selectedEl} onChange={patchElement} onDelete={deleteSelected} onDuplicate={duplicateSelected} />
          ) : (
            <EmptyProperties onAdd={addElement} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── SlideCanvas ───────────────────────────────────────────────────────────────
function SlideCanvas({ template, selectedId, onSelect, onUpdate }: {
  template: QQSlideTemplate;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<QQSlideElement>) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasW, setCanvasW] = useState(800);
  const canvasH = canvasW / CANVAS_RATIO;

  const dragRef = useRef<{ id: string; startMX: number; startMY: number; startX: number; startY: number } | null>(null);
  const resizeRef = useRef<{ id: string; handle: string; startMX: number; startMY: number; startX: number; startY: number; startW: number; startH: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      setCanvasW(w);
    });
    obs.observe(canvasRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cw = rect.width, ch = rect.height;
      if (dragRef.current) {
        const { id, startMX, startMY, startX, startY } = dragRef.current;
        const dx = ((e.clientX - startMX) / cw) * 100;
        const dy = ((e.clientY - startMY) / ch) * 100;
        onUpdate(id, { x: Math.max(0, Math.min(97, startX + dx)), y: Math.max(0, Math.min(97, startY + dy)) });
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
    }
    function onUp() { dragRef.current = null; resizeRef.current = null; }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [onUpdate]);

  const sorted = [...template.elements].sort((a, b) => (a.zIndex ?? 1) - (b.zIndex ?? 1));

  return (
    <div ref={canvasRef}
      style={{ width: '100%', maxWidth: `${canvasH * CANVAS_RATIO}px`, aspectRatio: `${CANVAS_RATIO}`, position: 'relative', overflow: 'hidden', background: template.background, borderRadius: 10, boxShadow: '0 0 60px rgba(0,0,0,0.8)', userSelect: 'none' }}
      onClick={e => { if (e.target === e.currentTarget) onSelect(null); }}>
      {sorted.map(el => (
        <CanvasElement key={el.id} el={el} canvasW={canvasW} selected={selectedId === el.id}
          onSelect={() => onSelect(el.id)}
          onDragStart={e => { e.stopPropagation(); onSelect(el.id); dragRef.current = { id: el.id, startMX: e.clientX, startMY: e.clientY, startX: el.x, startY: el.y }; }}
          onResizeStart={(e, handle) => { e.stopPropagation(); resizeRef.current = { id: el.id, handle, startMX: e.clientX, startMY: e.clientY, startX: el.x, startY: el.y, startW: el.w, startH: el.h }; }}
        />
      ))}
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

function CanvasElement({ el, canvasW, selected, onSelect, onDragStart, onResizeStart }: {
  el: QQSlideElement; canvasW: number; selected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onResizeStart: (e: React.MouseEvent, handle: string) => void;
}) {
  const isPh = el.type.startsWith('ph_');
  const fs = el.fontSize ? `${(el.fontSize / 100) * canvasW}px` : undefined;

  return (
    <div className="qqse-elem"
      style={{
        position: 'absolute', left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%`,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        zIndex: el.zIndex ?? 1, opacity: el.opacity ?? 1,
        cursor: 'move', boxSizing: 'border-box', overflow: 'hidden',
        background: el.background ?? (isPh ? 'rgba(139,92,246,0.10)' : 'transparent'),
        borderRadius: el.borderRadius != null ? `${el.borderRadius}px` : undefined,
        border: selected ? '2px solid #3B82F6' : (isPh ? '1.5px dashed rgba(139,92,246,0.4)' : (el.border ?? undefined)),
        outline: selected ? '1px solid rgba(59,130,246,0.3)' : undefined,
        outlineOffset: selected ? '3px' : undefined,
      }}
      onClick={e => { e.stopPropagation(); onSelect(); }}
      onMouseDown={e => { onSelect(); onDragStart(e); }}>

      {/* Text content */}
      {el.type === 'text' && (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', padding: '2px 6px', boxSizing: 'border-box', justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start' }}>
          <span style={{ fontSize: fs, fontWeight: el.fontWeight ?? 700, color: el.color ?? '#fff', textAlign: el.textAlign, lineHeight: el.lineHeight ?? 1.3, letterSpacing: el.letterSpacing != null ? `${el.letterSpacing}em` : undefined, wordBreak: 'break-word', width: '100%' }}>
            {el.text || '…'}
          </span>
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

function PropertiesPanel({ element: el, onChange, onDelete, onDuplicate }: {
  element: QQSlideElement;
  onChange: (p: Partial<QQSlideElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const isPh = el.type.startsWith('ph_');

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
          <Field label="Darstellung">
            <div style={{ display: 'flex', gap: 4 }}>
              {(['cover', 'contain'] as const).map(f => (
                <button key={f} onClick={() => onChange({ objectFit: f })} style={{ flex: 1, padding: '5px', borderRadius: 6, border: 'none', cursor: 'pointer', background: (el.objectFit ?? 'contain') === f ? '#3B82F6' : 'rgba(255,255,255,0.06)', color: (el.objectFit ?? 'contain') === f ? '#fff' : '#64748b', fontFamily: 'inherit', fontSize: 12, fontWeight: 800 }}>{f}</button>
              ))}
            </div>
          </Field>
        </Section>
      )}

      {/* Animation */}
      <Section label="Einblend-Animation">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
          {ANIM_IN_OPTIONS.map(a => (
            <button key={String(a)} onClick={() => onChange({ animIn: a })}
              style={{ padding: '5px 3px', borderRadius: 6, border: 'none', cursor: 'pointer', background: el.animIn === a ? '#F59E0B22' : 'rgba(255,255,255,0.04)', color: el.animIn === a ? '#F59E0B' : '#64748b', fontFamily: 'inherit', fontSize: 10, fontWeight: 800, outline: el.animIn === a ? '1px solid #F59E0B55' : 'none' }}>
              {a ?? 'none'}
            </button>
          ))}
        </div>
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
        Klicke auf ein Element im Canvas um es zu bearbeiten.<br />
        Drag = verschieben · Ecken = Größe ändern · Doppelklick = nächste Ebene
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
