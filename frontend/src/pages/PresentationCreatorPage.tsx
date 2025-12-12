import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PrimaryButton, Pill } from '../components/uiPrimitives';
import { theme } from '../theme';
import { fetchQuizzes, fetchQuestions, setQuestionLayout, fetchQuizLayout, saveQuizLayout } from '../api';
import { AnyQuestion, QuizTemplate } from '@shared/quizTypes';
import { categoryColors } from '../categoryColors';
import { categoryIcons } from '../categoryAssets';
import { categoryLabels } from '../categoryLabels';
import QuizSlideControls from '../components/presentation/QuizSlideControls';
import { exportQuizPdf } from '../utils/pdfExport';

type AnimationPreset = 'none' | 'soft-fade' | 'slide-up' | 'pop' | 'float';

type PresentationBlock = {
  id: string;
  title: string;
  x: number; // percent
  y: number; // percent
  width: number; // percent
  height: number; // percent
  color: string;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  animation: AnimationPreset;
  opacity?: number;
};

const STORAGE_KEY = 'presentation-blocks-v1';
const QUIZ_BG_KEY = 'presentation-quiz-bg-v1';
const QUIZ_OVERRIDES_KEY = 'presentation-quiz-overrides-v1';

type SlideOffsets = {
  imageOffsetX?: number;
  imageOffsetY?: number;
  logoOffsetX?: number;
  logoOffsetY?: number;
  textSize?: number;
  textOffsetY?: number;
};

type RuleSlide = {
  kind: 'rule';
  mechanic?: string;
  description: string;
  title: string;
};

const palette = ['#fbbf24', '#f97316', '#22c55e', '#06b6d4', '#818cf8', '#e879f9', '#f43f5e', '#e5e7eb'];
const fontOptions = [
  { label: 'Manrope', value: "'Manrope', 'Space Grotesk', sans-serif" },
  { label: 'Space Grotesk', value: "'Space Grotesk', 'Manrope', sans-serif" },
  { label: 'Grotesk Mono', value: "'Space Grotesk', 'DM Mono', monospace" }
];

const defaultBlocks: PresentationBlock[] = [
  {
    id: 'welcome',
    title: 'Willkommen',
    x: 8,
    y: 10,
    width: 28,
    height: 24,
    color: 'rgba(251,191,36,0.82)',
    textColor: '#0d0f14',
    fontFamily: fontOptions[0].value,
    fontSize: 20,
    animation: 'soft-fade',
    opacity: 1
  },
  {
    id: 'agenda',
    title: 'Agenda',
    x: 42,
    y: 20,
    width: 34,
    height: 28,
    color: 'rgba(129,140,248,0.82)',
    textColor: '#0d0f14',
    fontFamily: fontOptions[1].value,
    fontSize: 18,
    animation: 'slide-up',
    opacity: 0.96
  }
];

const animationStyles: Record<AnimationPreset, string> = {
  none: 'none',
  'soft-fade': 'pres-fade 520ms ease',
  'slide-up': 'pres-slide 520ms ease',
  pop: 'pres-pop 520ms ease',
  float: 'pres-float 4s ease-in-out infinite alternate'
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const PresentationCreatorPage: React.FC = () => {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 960, h: 540 });
  const [mode, setMode] = useState<'custom' | 'quiz'>('custom');
  const [includeRuleSlides, setIncludeRuleSlides] = useState(true);
  const [blocks, setBlocks] = useState<PresentationBlock[]>(() => {
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as PresentationBlock[];
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {
          // ignore malformed data
        }
      }
    }
    return defaultBlocks;
  });
  const [selectedId, setSelectedId] = useState<string | null>(defaultBlocks[0]?.id ?? null);
  const [dragState, setDragState] = useState<{
    id: string;
    type: 'move' | 'resize';
    startX: number;
    startY: number;
    origin: { x: number; y: number; width: number; height: number };
    stage: { w: number; h: number };
  } | null>(null);
  const [quizzes, setQuizzes] = useState<QuizTemplate[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizStatus, setQuizStatus] = useState<string | null>(null);
  const [questions, setQuestions] = useState<AnyQuestion[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [includeIntroOutro, setIncludeIntroOutro] = useState(true);
  const [quizBackgrounds, setQuizBackgrounds] = useState<Record<string, { gradientA: string; gradientB: string; overlay: number }>>(() => {
    if (typeof window === 'undefined') return {};
    const raw = window.localStorage.getItem(QUIZ_BG_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  });
  const [slideOverrides, setSlideOverrides] = useState<Record<string, SlideOffsets>>(() => {
    if (typeof window === 'undefined') return {};
    const raw = window.localStorage.getItem(QUIZ_OVERRIDES_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const updateStage = () => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (rect) {
        setStageSize({ w: rect.width, h: rect.height });
      }
    };
    updateStage();
    window.addEventListener('resize', updateStage);
    return () => window.removeEventListener('resize', updateStage);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'presentation-anim';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.innerHTML = `
        @keyframes pres-fade { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes pres-slide { 0% { opacity: 0; transform: translateY(22px) scale(0.98); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes pres-pop { 0% { opacity: 0; transform: scale(0.9); } 70% { opacity: 1; transform: scale(1.03); } 100% { transform: scale(1); } }
        @keyframes pres-float { 0% { transform: translateY(0px); } 100% { transform: translateY(-10px); } }
      `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
  }, [blocks]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(QUIZ_BG_KEY, JSON.stringify(quizBackgrounds));
  }, [quizBackgrounds]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(QUIZ_OVERRIDES_KEY, JSON.stringify(slideOverrides));
  }, [slideOverrides]);

  useEffect(() => {
    setQuizLoading(true);
    Promise.all([fetchQuizzes().catch(() => ({ quizzes: [] })), fetchQuestions().catch(() => ({ questions: [] }))])
      .then(([quizRes, questionRes]) => {
        setQuizzes(quizRes.quizzes || []);
        setQuestions(questionRes.questions || []);
        if (!quizRes.quizzes || quizRes.quizzes.length === 0) {
          setQuizStatus('Keine Quizzes geladen');
        } else {
          setQuizStatus(null);
        }
        if (!selectedQuizId && quizRes.quizzes?.length) {
          setSelectedQuizId(quizRes.quizzes[0].id);
        }
      })
      .finally(() => setQuizLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedQuiz) return;
    fetchQuizLayout(selectedQuiz.id)
      .then((res) => {
        if (res.layout) {
          if (res.layout.backgrounds) {
            setQuizBackgrounds((prev) => ({ ...prev, [selectedQuiz.id]: res.layout.backgrounds }));
          }
          if (typeof res.layout.includeIntroOutro === 'boolean') setIncludeIntroOutro(res.layout.includeIntroOutro);
          if (typeof res.layout.includeRuleSlides === 'boolean') setIncludeRuleSlides(res.layout.includeRuleSlides);
          if (res.layout.overrides) setSlideOverrides(res.layout.overrides);
          setQuizStatus('Layout geladen (Server)');
        } else {
          setQuizStatus('Kein Layout gespeichert');
        }
      })
      .catch(() => setQuizStatus('Layout Laden fehlgeschlagen'));
  }, [selectedQuiz?.id]);

  useEffect(() => {
    if (selectedId && blocks.find((b) => b.id === selectedId)) return;
    setSelectedId(blocks[0]?.id ?? null);
  }, [blocks, selectedId]);

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedId) ?? blocks[0],
    [blocks, selectedId]
  );

  const selectedQuiz = useMemo(() => {
    if (!selectedQuizId) return quizzes[0];
    return quizzes.find((q) => q.id === selectedQuizId) ?? quizzes[0];
  }, [quizzes, selectedQuizId]);

  const getRuleSlide = (q: AnyQuestion): RuleSlide | null => {
    if (q.category !== 'GemischteTuete' || !q.mixedMechanic) return null;
    const map: Record<string, { title: string; description: string }> = {
      'sortieren': { title: 'Sortieren', description: 'Ordne die Items in die richtige Reihenfolge (z. B. Norden → Süden, Westen → Osten, Chronologie).' },
      'praezise-antwort': { title: 'Präzise Antwort', description: 'Wer am nächsten an der Zielzahl liegt, gewinnt die Punkte.' },
      'wer-bietet-mehr': { title: 'Wer bietet mehr?', description: 'Bietet eine Zahl, dann liefert – höhere Zahl gewinnt nur, wenn die Angabe stimmt.' },
      'eine-falsch': { title: 'Eine ist falsch', description: '8 Aussagen, 1 ist falsch – finde die falsche Aussage.' },
      'three-clue-race': { title: 'Three Clue Race', description: 'Bis zu 3 Hinweise; frühes Raten = mehr Risiko, aber schnell punkten.' },
      'vier-woerter-eins': { title: 'Vier Wörter – eins', description: 'Vier Begriffe haben einen gemeinsamen Ursprung – finde den Verbindungsterm.' }
    };
    const entry = map[q.mixedMechanic];
    if (!entry) return null;
    return { kind: 'rule', mechanic: q.mixedMechanic, title: entry.title, description: entry.description };
  };

  const quizSlides = useMemo(() => {
    if (!selectedQuiz) return [] as ({ kind: 'question'; data: AnyQuestion } | { kind: 'intro' } | { kind: 'outro' } | RuleSlide)[];
    const map = new Map<string, AnyQuestion>();
    questions.forEach((q) => map.set(q.id, q));
    const items: ({ kind: 'question'; data: AnyQuestion } | { kind: 'intro' } | { kind: 'outro' } | RuleSlide)[] = [];
    if (includeIntroOutro) items.push({ kind: 'intro' });
    selectedQuiz.questionIds.forEach((id) => {
      const q = map.get(id);
      if (!q) return;
      if (includeRuleSlides) {
        const ruleSlide = getRuleSlide(q);
        if (ruleSlide) items.push(ruleSlide);
      }
      items.push({ kind: 'question', data: q });
    });
    if (includeIntroOutro) items.push({ kind: 'outro' });
    return items;
  }, [questions, selectedQuiz, includeIntroOutro, includeRuleSlides]);

  useEffect(() => {
    setSelectedSlideIndex(0);
  }, [selectedQuiz?.id]);

  useEffect(() => {
    if (quizSlides.length === 0) return;
    if (selectedSlideIndex >= quizSlides.length) {
      setSelectedSlideIndex(Math.max(quizSlides.length - 1, 0));
    }
  }, [quizSlides.length, selectedSlideIndex]);

  const currentSlide = quizSlides[selectedSlideIndex] ?? quizSlides[0];
  const currentBg = useMemo(() => {
    if (!selectedQuiz) {
      return { gradientA: 'rgba(111,142,255,0.22)', gradientB: 'rgba(248,180,0,0.18)', overlay: 0.22 };
    }
    return (
      quizBackgrounds[selectedQuiz.id] ?? {
        gradientA: 'rgba(111,142,255,0.22)',
        gradientB: 'rgba(248,180,0,0.18)',
        overlay: 0.22
      }
    );
  }, [quizBackgrounds, selectedQuiz]);

  const updateBlock = (id: string, patch: Partial<PresentationBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const updateQuizBackground = (patch: Partial<{ gradientA: string; gradientB: string; overlay: number }>) => {
    if (!selectedQuiz) return;
    setQuizBackgrounds((prev) => ({
      ...prev,
      [selectedQuiz.id]: { ...(prev[selectedQuiz.id] ?? currentBg), ...patch }
    }));
  };

  const updateSlideOverride = (questionId: string, patch: SlideOffsets) => {
    setSlideOverrides((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] ?? {}), ...patch }
    }));
  };

  const exportLayout = () => {
    if (!selectedQuiz) return;
    const payload = {
      quizId: selectedQuiz.id,
      backgrounds: quizBackgrounds[selectedQuiz.id] ?? currentBg,
      includeIntroOutro,
      includeRuleSlides,
      overrides: slideOverrides
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-layout-${selectedQuiz.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importLayout = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data.backgrounds && selectedQuiz) {
          setQuizBackgrounds((prev) => ({ ...prev, [selectedQuiz.id]: data.backgrounds }));
        }
        if (typeof data.includeIntroOutro === 'boolean') setIncludeIntroOutro(data.includeIntroOutro);
        if (typeof data.includeRuleSlides === 'boolean') setIncludeRuleSlides(data.includeRuleSlides);
        if (data.overrides && typeof data.overrides === 'object') setSlideOverrides(data.overrides);
        setQuizStatus('Layout importiert (lokal)');
      } catch (e) {
        setQuizStatus('Import fehlgeschlagen');
      }
    };
    reader.readAsText(file);
  };

  const saveLayoutToServer = async () => {
    if (!selectedQuiz) return;
    try {
      await saveQuizLayout(selectedQuiz.id, {
        backgrounds: quizBackgrounds[selectedQuiz.id] ?? currentBg,
        includeIntroOutro,
        includeRuleSlides,
        overrides: slideOverrides
      });
      setQuizStatus('Layout gespeichert (Server)');
    } catch {
      setQuizStatus('Speichern fehlgeschlagen');
    }
  };

  const addBlock = () => {
    const newId = `block-${Date.now().toString(36)}`;
    const color = palette[Math.floor(Math.random() * palette.length)];
    const block: PresentationBlock = {
      id: newId,
      title: 'Neues Fenster',
      x: 12 + blocks.length * 4,
      y: 14 + blocks.length * 3,
      width: 26,
      height: 24,
      color: `${color}cc`,
      textColor: '#0d0f14',
      fontFamily: fontOptions[0].value,
      fontSize: 18,
      animation: 'soft-fade',
      opacity: 0.95
    };
    setBlocks((prev) => [...prev, block]);
    setSelectedId(block.id);
  };

  const duplicateBlock = (id: string) => {
    const base = blocks.find((b) => b.id === id);
    if (!base) return;
    const newId = `${id}-copy-${Date.now().toString(36)}`;
    const clone = { ...base, id: newId, x: clamp(base.x + 4, 0, 90), y: clamp(base.y + 3, 0, 90) };
    setBlocks((prev) => [...prev, clone]);
    setSelectedId(newId);
  };

  const deleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const startDrag = (event: React.MouseEvent, id: string, type: 'move' | 'resize') => {
    event.preventDefault();
    const block = blocks.find((b) => b.id === id);
    const rect = stageRef.current?.getBoundingClientRect();
    if (!block || !rect) return;
    setSelectedId(id);
    setDragState({
      id,
      type,
      startX: event.clientX,
      startY: event.clientY,
      origin: { x: block.x, y: block.y, width: block.width, height: block.height },
      stage: { w: rect.width, h: rect.height }
    });
  };

  useEffect(() => {
    if (!dragState) return;
    const handleMove = (event: MouseEvent) => {
      const dxPct = ((event.clientX - dragState.startX) / dragState.stage.w) * 100;
      const dyPct = ((event.clientY - dragState.startY) / dragState.stage.h) * 100;
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== dragState.id) return b;
          if (dragState.type === 'move') {
            const nextX = clamp(dragState.origin.x + dxPct, 0, 100 - b.width);
            const nextY = clamp(dragState.origin.y + dyPct, 0, 100 - b.height);
            return { ...b, x: nextX, y: nextY };
          }
          const nextWidth = clamp(dragState.origin.width + dxPct, 8, 100 - b.x);
          const nextHeight = clamp(dragState.origin.height + dyPct, 8, 100 - b.y);
          return { ...b, width: nextWidth, height: nextHeight };
        })
      );
    };
    const handleUp = () => setDragState(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragState]);

  const stageOverlay = (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage:
          'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.06), transparent 40%), radial-gradient(circle at 80% 10%, rgba(255,255,255,0.05), transparent 42%)',
        opacity: 0.45,
        pointerEvents: 'none'
      }}
    />
  );

  const grid = (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        opacity: 0.3,
        pointerEvents: 'none'
      }}
    />
  );

  const stage = (
    <div
      ref={stageRef}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        borderRadius: 22,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'linear-gradient(135deg, rgba(15,18,28,0.92), rgba(18,22,32,0.82))',
        boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
        isolation: 'isolate'
      }}
    >
      {stageOverlay}
      {grid}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: 18
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 10,
            borderRadius: 18,
            border: '1px solid rgba(255,255,255,0.05)',
            pointerEvents: 'none'
          }}
        />
        {blocks.map((block) => {
          const isActive = block.id === selectedBlock?.id;
          return (
            <div
              key={block.id}
              onMouseDown={(e) => startDrag(e, block.id, 'move')}
              onClick={() => setSelectedId(block.id)}
              style={{
                position: 'absolute',
                left: `${block.x}%`,
                top: `${block.y}%`,
                width: `${block.width}%`,
                height: `${block.height}%`,
                padding: 14,
                borderRadius: 16,
                background: block.color,
                color: block.textColor,
                fontFamily: block.fontFamily,
                fontSize: block.fontSize,
                fontWeight: 800,
                letterSpacing: '0.01em',
                boxShadow: isActive
                  ? `0 16px 30px rgba(0,0,0,0.35), 0 0 0 3px ${block.textColor}44`
                  : '0 16px 30px rgba(0,0,0,0.3)',
                cursor: 'move',
                userSelect: 'none',
                transition: 'transform 0.14s ease, box-shadow 0.14s ease',
                animation: animationStyles[block.animation],
                opacity: block.opacity ?? 1
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: block.fontSize + 2 }}>{block.title}</span>
                <Pill tone="neutral" style={{ background: 'rgba(0,0,0,0.16)', color: block.textColor }}>
                  {Math.round(block.width)}% × {Math.round(block.height)}%
                </Pill>
              </div>
              <div
                onMouseDown={(e) => startDrag(e, block.id, 'resize')}
                style={{
                  position: 'absolute',
                  right: 10,
                  bottom: 10,
                  width: 18,
                  height: 18,
                  borderRadius: 6,
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(0,0,0,0.28)',
                  cursor: 'nwse-resize',
                  display: 'grid',
                  placeItems: 'center'
                }}
              >
                ↘
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const controlCard: React.CSSProperties = {
    background: 'rgba(16,20,31,0.82)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 18,
    padding: 16,
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    backdropFilter: 'blur(14px)'
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 20% 20%, rgba(111,142,255,0.16), transparent 40%), radial-gradient(circle at 80% 10%, rgba(248,180,0,0.12), transparent 42%), #0c111a',
        color: '#f8fafc',
        padding: '24px 18px 32px'
      }}
    >
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#cbd5e1' }}>
              Präsentations Creator
            </div>
            <h1 style={{ margin: '6px 0 4px' }}>Layout & Animations</h1>
            <p style={{ margin: 0, color: '#94a3b8' }}>
              Freies Canvas oder Quiz-Slides mit auto-generierten Fragen, im Beamer/Team-Stil.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                border: mode === 'custom' ? '1px solid rgba(251,191,36,0.7)' : '1px solid rgba(255,255,255,0.16)',
                background: mode === 'custom' ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.06)',
                color: mode === 'custom' ? '#fbbf24' : '#f8fafc',
                fontWeight: 800,
                cursor: 'pointer'
              }}
              onClick={() => setMode('custom')}
            >
              Freies Layout
            </button>
            <button
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                border: mode === 'quiz' ? '1px solid rgba(129,140,248,0.7)' : '1px solid rgba(255,255,255,0.16)',
                background: mode === 'quiz' ? 'rgba(129,140,248,0.2)' : 'rgba(255,255,255,0.06)',
                color: mode === 'quiz' ? '#c7d2fe' : '#f8fafc',
                fontWeight: 800,
                cursor: 'pointer'
              }}
              onClick={() => setMode('quiz')}
            >
              Quiz Slides
            </button>
          </div>
        </div>

        {mode === 'custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 0.95fr', gap: 14, alignItems: 'start' }}>
            <div style={{ ...controlCard, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Pill tone="muted">Preview 16:9</Pill>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#cbd5e1', fontSize: 13 }}>
                  {blocks.length} Fenster · {Math.round(stageSize.w)}×{Math.round(stageSize.h)}px
                </div>
              </div>
              {stage}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={controlCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontWeight: 800 }}>Fenster</div>
                  <button
                    style={{
                      padding: '8px 10px',
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.16)',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#f8fafc',
                      cursor: 'pointer'
                    }}
                    onClick={addBlock}
                  >
                    + Hinzufügen
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {blocks.map((block) => (
                    <div
                      key={block.id}
                      onClick={() => setSelectedId(block.id)}
                      style={{
                        borderRadius: 12,
                        border: `1px solid ${block.id === selectedBlock?.id ? theme.colors.accent : 'rgba(255,255,255,0.08)'}`,
                        padding: 10,
                        background: block.id === selectedBlock?.id ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 6,
                            background: block.color,
                            border: '1px solid rgba(255,255,255,0.25)'
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 700 }}>{block.title}</div>
                          <div style={{ color: '#94a3b8', fontSize: 12 }}>
                            {Math.round(block.x)}%, {Math.round(block.y)}% · {Math.round(block.width)}×{Math.round(block.height)}%
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          style={{
                            padding: '6px 10px',
                            borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.16)',
                            background: 'rgba(255,255,255,0.06)',
                            color: '#f8fafc',
                            cursor: 'pointer'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateBlock(block.id);
                          }}
                        >
                          Kopie
                        </button>
                        <button
                          style={{
                            padding: '6px 10px',
                            borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.16)',
                            background: 'rgba(244,63,94,0.12)',
                            color: '#fca5a5',
                            cursor: 'pointer'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBlock(block.id);
                          }}
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedBlock && (
                <div style={controlCard}>
                  <div style={{ fontWeight: 800, marginBottom: 10 }}>Eigenschaften</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <label style={{ fontSize: 12, color: '#cbd5e1' }}>
                      Beschriftung
                      <input
                        value={selectedBlock.title}
                        onChange={(e) => updateBlock(selectedBlock.id, { title: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: '#0f141d',
                          color: '#f8fafc',
                          marginTop: 4
                        }}
                      />
                    </label>
                    <label style={{ fontSize: 12, color: '#cbd5e1' }}>
                      Animation
                      <select
                        value={selectedBlock.animation}
                        onChange={(e) => updateBlock(selectedBlock.id, { animation: e.target.value as AnimationPreset })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: '#0f141d',
                          color: '#f8fafc',
                          marginTop: 4
                        }}
                      >
                        <option value="soft-fade">Soft Fade</option>
                        <option value="slide-up">Slide Up</option>
                        <option value="pop">Pop</option>
                        <option value="float">Float</option>
                        <option value="none">Keine</option>
                      </select>
                    </label>

                    <label style={{ fontSize: 12, color: '#cbd5e1' }}>
                      X-Position (%)
                      <input
                        type="range"
                        min={0}
                        max={100 - selectedBlock.width}
                        value={selectedBlock.x}
                        onChange={(e) => updateBlock(selectedBlock.id, { x: Number(e.target.value) })}
                        style={{ width: '100%' }}
                      />
                    </label>
                    <label style={{ fontSize: 12, color: '#cbd5e1' }}>
                      Y-Position (%)
                      <input
                        type="range"
                        min={0}
                        max={100 - selectedBlock.height}
                        value={selectedBlock.y}
                        onChange={(e) => updateBlock(selectedBlock.id, { y: Number(e.target.value) })}
                        style={{ width: '100%' }}
                      />
                    </label>
                    <label style={{ fontSize: 12, color: '#cbd5e1' }}>
                      Breite (%)
                      <input
                        type="range"
                        min={10}
                        max={100 - selectedBlock.x}
                        value={selectedBlock.width}
                        onChange={(e) => updateBlock(selectedBlock.id, { width: Number(e.target.value) })}
                        style={{ width: '100%' }}
                      />
                    </label>
                    <label style={{ fontSize: 12, color: '#cbd5e1' }}>
                      Höhe (%)
                      <input
                        type="range"
                        min={8}
                        max={100 - selectedBlock.y}
                        value={selectedBlock.height}
                        onChange={(e) => updateBlock(selectedBlock.id, { height: Number(e.target.value) })}
                        style={{ width: '100%' }}
                      />
                    </label>

                    <label style={{ fontSize: 12, color: '#cbd5e1' }}>
                      Textgröße
                      <input
                        type="range"
                        min={12}
                        max={36}
                        value={selectedBlock.fontSize}
                        onChange={(e) => updateBlock(selectedBlock.id, { fontSize: Number(e.target.value) })}
                        style={{ width: '100%' }}
                      />
                    </label>
                    <label style={{ fontSize: 12, color: '#cbd5e1' }}>
                      Deckkraft
                      <input
                        type="range"
                        min={0.4}
                        max={1}
                        step={0.02}
                        value={selectedBlock.opacity ?? 1}
                        onChange={(e) => updateBlock(selectedBlock.id, { opacity: Number(e.target.value) })}
                        style={{ width: '100%' }}
                      />
                    </label>

                    <label style={{ fontSize: 12, color: '#cbd5e1' }}>
                      Fensterfarbe
                      <input
                        type="color"
                        value={selectedBlock.color.startsWith('#') ? selectedBlock.color : '#fbbf24'}
                        onChange={(e) => updateBlock(selectedBlock.id, { color: e.target.value })}
                        style={{ width: '100%', height: 42, borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: '#0f141d' }}
                      />
                    </label>
                    <label style={{ fontSize: 12, color: '#cbd5e1' }}>
                      Textfarbe
                      <input
                        type="color"
                        value={selectedBlock.textColor}
                        onChange={(e) => updateBlock(selectedBlock.id, { textColor: e.target.value })}
                        style={{ width: '100%', height: 42, borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: '#0f141d' }}
                      />
                    </label>

                    <label style={{ fontSize: 12, color: '#cbd5e1' }}>
                      Schriftart
                      <select
                        value={selectedBlock.fontFamily}
                        onChange={(e) => updateBlock(selectedBlock.id, { fontFamily: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: '#0f141d',
                          color: '#f8fafc',
                          marginTop: 4
                        }}
                      >
                        {fontOptions.map((font) => (
                          <option key={font.value} value={font.value}>
                            {font.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 6 }}>Schnellfarben</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {palette.map((c) => (
                        <button
                          key={c}
                          onClick={() => updateBlock(selectedBlock.id, { color: c })}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.18)',
                            background: c,
                            cursor: 'pointer'
                          }}
                          aria-label={`Set color ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {mode === 'quiz' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1.35fr', gap: 12, alignItems: 'start' }}>
              <div style={controlCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 800 }}>Quiz auswählen</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {quizLoading && <Pill tone="muted">Lädt ...</Pill>}
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#cbd5e1' }}>
                      <input type="checkbox" checked={includeRuleSlides} onChange={(e) => setIncludeRuleSlides(e.target.checked)} />
                      Mechanik-Regel-Slides
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#cbd5e1' }}>
                      <input type="checkbox" checked={includeIntroOutro} onChange={(e) => setIncludeIntroOutro(e.target.checked)} />
                      Intro & Outro hinzufügen
                    </label>
                  </div>
                </div>
                <select
                  value={selectedQuiz?.id ?? ''}
                  onChange={(e) => setSelectedQuizId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: '#0f141d',
                    color: '#f8fafc'
                  }}
                >
                  {quizzes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name}
                    </option>
                  ))}
                  {quizzes.length === 0 && <option>Keine Quizzes gefunden</option>}
                </select>
                <div style={{ marginTop: 8, color: '#94a3b8', fontSize: 13 }}>
                  {selectedQuiz ? `${selectedQuiz.questionIds.length} Fragen · ${selectedQuiz.mode}` : 'Kein Quiz ausgewählt'}
                </div>
                {quizStatus && <div style={{ marginTop: 8, color: '#c7f9cc' }}>{quizStatus}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <button
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.16)',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#f8fafc',
                      cursor: 'pointer'
                    }}
                    onClick={exportLayout}
                  >
                    Layout exportieren
                  </button>
                  <button
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.16)',
                      background: 'rgba(99,102,241,0.18)',
                      color: '#e5e7eb',
                      cursor: 'pointer'
                    }}
                    onClick={saveLayoutToServer}
                  >
                    Layout speichern (Server)
                  </button>
                  <label
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.16)',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#f8fafc',
                      cursor: 'pointer'
                    }}
                  >
                    Layout importieren
                    <input
                      type="file"
                      accept="application/json"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) importLayout(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>

              <div style={controlCard}>
                <div style={{ fontWeight: 800, marginBottom: 10 }}>Globaler Hintergrund (Quiz)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label style={{ fontSize: 12, color: '#cbd5e1' }}>
                    Gradient A
                    <input
                      type="color"
                      value={currentBg.gradientA.startsWith('#') ? currentBg.gradientA : '#6f8eff'}
                      onChange={(e) => updateQuizBackground({ gradientA: e.target.value })}
                      style={{ width: '100%', height: 42, borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: '#0f141d' }}
                    />
                  </label>
                  <label style={{ fontSize: 12, color: '#cbd5e1' }}>
                    Gradient B
                    <input
                      type="color"
                      value={currentBg.gradientB.startsWith('#') ? currentBg.gradientB : '#f8b400'}
                      onChange={(e) => updateQuizBackground({ gradientB: e.target.value })}
                      style={{ width: '100%', height: 42, borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: '#0f141d' }}
                    />
                  </label>
                  <label style={{ fontSize: 12, color: '#cbd5e1' }}>
                    Overlay-Stärke
                    <input
                      type="range"
                      min={0}
                      max={0.6}
                      step={0.02}
                      value={currentBg.overlay}
                      onChange={(e) => updateQuizBackground({ overlay: Number(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </label>
                  <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                    Vorschau nutzt Kategorie-Farben und Bild/Logo-Offsets pro Frage.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1.35fr', gap: 12, alignItems: 'start' }}>
              <div style={controlCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 800 }}>Slides ({quizSlides.length || 0})</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setSelectedSlideIndex((i) => Math.max(i - 1, 0))}
                      disabled={selectedSlideIndex <= 0}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.06)',
                        color: '#f8fafc',
                        cursor: selectedSlideIndex <= 0 ? 'not-allowed' : 'pointer',
                        opacity: selectedSlideIndex <= 0 ? 0.5 : 1
                      }}
                    >
                      Zurück
                    </button>
                    <button
                      onClick={() => setSelectedSlideIndex((i) => Math.min(i + 1, Math.max(quizSlides.length - 1, 0)))}
                      disabled={quizSlides.length === 0 || selectedSlideIndex >= quizSlides.length - 1}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.06)',
                        color: '#f8fafc',
                        cursor: quizSlides.length === 0 || selectedSlideIndex >= quizSlides.length - 1 ? 'not-allowed' : 'pointer',
                        opacity: quizSlides.length === 0 || selectedSlideIndex >= quizSlides.length - 1 ? 0.5 : 1
                      }}
                    >
                      Weiter
                    </button>
                  </div>
                  <Pill tone="muted">{selectedSlideIndex + 1}/{quizSlides.length || 1}</Pill>
                </div>
                <div style={{ maxHeight: 360, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {quizSlides.length === 0 && <div style={{ color: '#94a3b8' }}>Keine Slides vorhanden.</div>}
                  {quizSlides.map((slide, idx) => {
                    const isIntro = slide.kind === 'intro';
                    const isOutro = slide.kind === 'outro';
                    const isRule = slide.kind === 'rule';
                    const question = slide.kind === 'question' ? slide.data : null;
                    const cat = question?.category as keyof typeof categoryColors;
                    const catColor =
                      isIntro || isOutro
                        ? '#fbbf24'
                        : isRule
                        ? '#38bdf8'
                        : categoryColors[cat] ?? '#cbd5e1';
                    const title =
                      isIntro
                        ? 'Intro'
                        : isOutro
                        ? 'Outro'
                        : isRule
                        ? slide.title
                        : question?.question.slice(0, 90) + (question && question.question.length > 90 ? '…' : '');
                    return (
                      <button
                        key={
                          isIntro ? 'intro' : isOutro ? 'outro' : isRule ? `rule-${idx}` : question?.id ?? idx
                        }
                        onClick={() => setSelectedSlideIndex(idx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid ' + (idx === selectedSlideIndex ? catColor : 'rgba(255,255,255,0.08)'),
                          background: idx === selectedSlideIndex ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
                          color: '#f8fafc',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ fontWeight: 800, minWidth: 24 }}>{idx + 1}</span>
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 8,
                            background: catColor,
                            border: '1px solid rgba(255,255,255,0.25)'
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.35 }}>
                            {title}
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: 12 }}>
                            {isIntro
                              ? 'Intro Slide'
                              : isOutro
                              ? 'Outro Slide'
                              : isRule
                              ? 'Mechanik-Regeln'
                              : categoryLabels[cat]?.de ?? cat}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {currentSlide && (
                  <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10 }}>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>Slide-Feintuning</div>
                    {currentSlide.kind === 'question' ? (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <label style={{ fontSize: 12, color: '#cbd5e1' }}>
                            Bild X
                            <input
                              type="range"
                              min={-160}
                              max={160}
                              value={slideOverrides[currentSlide.data.id]?.imageOffsetX ?? (currentSlide.data as any)?.layout?.imageOffsetX ?? 0}
                              onChange={(e) => updateSlideOverride(currentSlide.data.id, { imageOffsetX: Number(e.target.value) })}
                              style={{ width: '100%' }}
                            />
                          </label>
                          <label style={{ fontSize: 12, color: '#cbd5e1' }}>
                            Bild Y
                            <input
                              type="range"
                              min={-160}
                              max={160}
                              value={slideOverrides[currentSlide.data.id]?.imageOffsetY ?? (currentSlide.data as any)?.layout?.imageOffsetY ?? 0}
                              onChange={(e) => updateSlideOverride(currentSlide.data.id, { imageOffsetY: Number(e.target.value) })}
                              style={{ width: '100%' }}
                            />
                          </label>
                          <label style={{ fontSize: 12, color: '#cbd5e1' }}>
                            Logo X
                            <input
                              type="range"
                              min={-120}
                              max={120}
                              value={slideOverrides[currentSlide.data.id]?.logoOffsetX ?? (currentSlide.data as any)?.layout?.logoOffsetX ?? 0}
                              onChange={(e) => updateSlideOverride(currentSlide.data.id, { logoOffsetX: Number(e.target.value) })}
                              style={{ width: '100%' }}
                            />
                          </label>
                          <label style={{ fontSize: 12, color: '#cbd5e1' }}>
                            Logo Y
                            <input
                              type="range"
                              min={-120}
                              max={120}
                              value={slideOverrides[currentSlide.data.id]?.logoOffsetY ?? (currentSlide.data as any)?.layout?.logoOffsetY ?? 0}
                              onChange={(e) => updateSlideOverride(currentSlide.data.id, { logoOffsetY: Number(e.target.value) })}
                              style={{ width: '100%' }}
                            />
                          </label>
                          <label style={{ fontSize: 12, color: '#cbd5e1' }}>
                            Textgröße
                            <input
                              type="range"
                              min={16}
                              max={30}
                              value={slideOverrides[currentSlide.data.id]?.textSize ?? 20}
                              onChange={(e) => updateSlideOverride(currentSlide.data.id, { textSize: Number(e.target.value) })}
                              style={{ width: '100%' }}
                            />
                          </label>
                          <label style={{ fontSize: 12, color: '#cbd5e1' }}>
                            Text Y-Offset
                            <input
                              type="range"
                              min={-60}
                              max={60}
                              value={slideOverrides[currentSlide.data.id]?.textOffsetY ?? 0}
                              onChange={(e) => updateSlideOverride(currentSlide.data.id, { textOffsetY: Number(e.target.value) })}
                              style={{ width: '100%' }}
                            />
                          </label>
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                          <button
                            style={{
                              padding: '10px 12px',
                              borderRadius: 12,
                              border: '1px solid rgba(255,255,255,0.16)',
                              background: 'rgba(255,255,255,0.06)',
                              color: '#f8fafc',
                              cursor: 'pointer'
                            }}
                            onClick={async () => {
                              const id = currentSlide.data.id;
                              const o = slideOverrides[id] ?? {};
                              try {
                                await setQuestionLayout(id, {
                                  imageOffsetX: o.imageOffsetX ?? (currentSlide.data as any)?.layout?.imageOffsetX,
                                  imageOffsetY: o.imageOffsetY ?? (currentSlide.data as any)?.layout?.imageOffsetY,
                                  logoOffsetX: o.logoOffsetX ?? (currentSlide.data as any)?.layout?.logoOffsetX,
                                  logoOffsetY: o.logoOffsetY ?? (currentSlide.data as any)?.layout?.logoOffsetY
                                });
                                setQuizStatus('Offsets gespeichert (Frage)');
                              } catch (err) {
                                setQuizStatus('Speichern fehlgeschlagen');
                              }
                            }}
                          >
                            Offsets global speichern
                          </button>
                          <button
                            style={{
                              padding: '10px 12px',
                              borderRadius: 12,
                              border: '1px solid rgba(255,255,255,0.16)',
                              background: 'rgba(244,63,94,0.12)',
                              color: '#fca5a5',
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              if (!currentSlide.data) return;
                              setSlideOverrides((prev) => {
                                const next = { ...prev };
                                delete next[currentSlide.data.id];
                                return next;
                              });
                            }}
                          >
                            Lokale Offsets zurücksetzen
                          </button>
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                          Änderungen werden lokal gespeichert. "Offsets global speichern" schreibt sie in das Frage-Layout (wirkt auf Beamer/Team).
                        </div>
                      </>
                    ) : (
                      <div style={{ color: '#94a3b8', fontSize: 13 }}>
                        Intro/Outro/Regel-Slides haben keine Offsets.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={controlCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                  <div style={{ fontWeight: 800 }}>Preview (Quiz Slide)</div>
                  {currentSlide && currentSlide.kind === 'question' && (
                    <Pill tone="neutral">{categoryLabels[currentSlide.data.category as keyof typeof categoryLabels]?.de ?? currentSlide.data.category}</Pill>
                  )}
                  {currentSlide && currentSlide.kind !== 'question' && <Pill tone="muted">{currentSlide.kind === 'intro' ? 'Intro' : 'Outro'}</Pill>}
                </div>
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '16 / 9',
                    borderRadius: 22,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: `linear-gradient(135deg, ${currentBg.gradientA}, ${currentBg.gradientB}), #0c111a`
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: `rgba(12,17,26,${currentBg.overlay})`
                    }}
                  />
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.06), transparent 40%)', opacity: 0.35 }} />
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '46px 46px', opacity: 0.3 }} />

                  {currentSlide ? (
                    <div style={{ position: 'absolute', inset: 16, borderRadius: 18, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)' }} />
                      <div style={{ position: 'relative', width: '100%', height: '100%', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '8px 12px',
                              borderRadius: 999,
                              background: 'rgba(0,0,0,0.35)',
                              border: '1px solid rgba(255,255,255,0.14)',
                              color: '#fff'
                            }}
                          >
                            {currentSlide.kind === 'question' && categoryIcons[currentSlide.data.category] && (
                              <img
                                src={categoryIcons[currentSlide.data.category]}
                                alt=""
                                style={{ width: 26, height: 26, objectFit: 'contain', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.25))' }}
                              />
                            )}
                            {currentSlide.kind === 'rule' && <span style={{ fontWeight: 900 }}>ℹ</span>}
                            <span style={{ fontWeight: 800 }}>
                              {currentSlide.kind === 'intro'
                                ? 'Intro'
                                : currentSlide.kind === 'outro'
                                ? 'Outro'
                                : currentSlide.kind === 'rule'
                                ? currentSlide.title
                                : categoryLabels[currentSlide.data.category as keyof typeof categoryLabels]?.de ?? currentSlide.data.category}
                            </span>
                          </div>
                          <Pill tone="muted">Quiz Preview</Pill>
                        </div>

                        <div style={{ position: 'relative', flex: 1, borderRadius: 16, background: 'rgba(0,0,0,0.25)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                          {currentSlide.kind === 'question' && currentSlide.data.imageUrl && (
                            <img
                              src={currentSlide.data.imageUrl}
                              alt=""
                              style={{
                                position: 'absolute',
                                width: '36%',
                                height: '70%',
                                objectFit: 'cover',
                                borderRadius: 16,
                                top: '12%',
                                left: '6%',
                                transform: `translate(${(slideOverrides[currentSlide.data.id]?.imageOffsetX ?? (currentSlide.data as any)?.layout?.imageOffsetX ?? 0)}px, ${(slideOverrides[currentSlide.data.id]?.imageOffsetY ?? (currentSlide.data as any)?.layout?.imageOffsetY ?? 0)}px)`,
                                border: '1px solid rgba(255,255,255,0.12)',
                                boxShadow: '0 18px 32px rgba(0,0,0,0.35)'
                              }}
                            />
                          )}
                          <div
                            style={{
                              position: 'absolute',
                              right: '6%',
                              top: '10%',
                              width: 52,
                              height: 52,
                              borderRadius: '50%',
                              background: '#0f141d',
                              border: `2px solid ${
                                currentSlide.kind === 'question'
                                  ? categoryColors[currentSlide.data.category as keyof typeof categoryColors] ?? '#cbd5e1'
                                  : '#cbd5e1'
                              }`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transform: `translate(${(slideOverrides[(currentSlide.kind === 'question' ? currentSlide.data.id : 'intro')]?.logoOffsetX ??
                                (currentSlide.kind === 'question' ? (currentSlide.data as any)?.layout?.logoOffsetX : 0) ??
                                0)}px, ${(slideOverrides[(currentSlide.kind === 'question' ? currentSlide.data.id : 'intro')]?.logoOffsetY ??
                                (currentSlide.kind === 'question' ? (currentSlide.data as any)?.layout?.logoOffsetY : 0) ??
                                0)}px)`,
                              boxShadow: `0 10px 20px ${
                                currentSlide.kind === 'question'
                                  ? (categoryColors[currentSlide.data.category as keyof typeof categoryColors] ?? '#cbd5e1')
                                  : '#cbd5e1'
                              }44`
                            }}
                          >
                          {currentSlide.kind === 'question' && categoryIcons[currentSlide.data.category] && (
                              <img src={categoryIcons[currentSlide.data.category]} alt="" style={{ width: 34, height: 34 }} />
                            )}
                            {currentSlide.kind !== 'question' && <span style={{ fontWeight: 800, fontSize: 12 }}>★</span>}
                          </div>
                          <div style={{ position: 'absolute', left: '48%', right: '6%', bottom: '14%', color: '#f8fafc' }}>
                            <div style={{ fontSize: 14, color: '#cbd5e1', marginBottom: 6 }}>
                              {currentSlide.kind === 'intro'
                                ? 'Willkommen'
                                : currentSlide.kind === 'outro'
                                ? 'Danke'
                                : currentSlide.kind === 'rule'
                                ? 'Mechanik'
                                : 'Frage'}
                            </div>
                            <div
                              style={{
                                fontSize:
                                  currentSlide.kind === 'question'
                                    ? slideOverrides[currentSlide.data.id]?.textSize ?? 20
                                    : 22,
                                lineHeight: 1.35,
                                fontWeight: 800,
                                transform:
                                  currentSlide.kind === 'question'
                                    ? `translateY(${slideOverrides[currentSlide.data.id]?.textOffsetY ?? 0}px)`
                                    : undefined
                              }}
                            >
                              {currentSlide.kind === 'intro'
                                ? `Quiz: ${selectedQuiz?.name ?? ''}`
                                : currentSlide.kind === 'outro'
                                ? 'Das war das Quiz – vielen Dank!'
                                : currentSlide.kind === 'rule'
                                ? currentSlide.description
                                : currentSlide.data.question}
                            </div>
                            {currentSlide.kind === 'question' && currentSlide.data.imageUrl && (
                              <div style={{ marginTop: 8, fontSize: 12, color: '#cbd5e1' }}>Bild kann per Offset verschoben werden.</div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: 12 }}>
                          <span>Slide {selectedSlideIndex + 1} / {quizSlides.length || 1}</span>
                          <span>Preview im Browser · Daten aus Quiz</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#94a3b8' }}>
                      Kein Slide ausgewählt.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default PresentationCreatorPage;
