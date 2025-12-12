import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PrimaryButton, Pill } from '../components/uiPrimitives';
import { theme } from '../theme';

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
    if (selectedId && blocks.find((b) => b.id === selectedId)) return;
    setSelectedId(blocks[0]?.id ?? null);
  }, [blocks, selectedId]);

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedId) ?? blocks[0],
    [blocks, selectedId]
  );

  const updateBlock = (id: string, patch: Partial<PresentationBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#cbd5e1' }}>
              Präsentations Creator
            </div>
            <h1 style={{ margin: '6px 0 4px' }}>Layout & Animations</h1>
            <p style={{ margin: 0, color: '#94a3b8' }}>
              Fenster positionieren, Größe, Farbe, Animation, Beschriftung & Schrift steuern. Preview nutzt das Beamer/Team-Design.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <PrimaryButton style={{ width: 'auto', minWidth: 180 }} onClick={addBlock}>
              Neues Fenster
            </PrimaryButton>
            {selectedBlock && (
              <button
                style={{
                  ...controlCard,
                  padding: '12px 14px',
                  minWidth: 140,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderRadius: 14
                }}
                onClick={() => duplicateBlock(selectedBlock.id)}
              >
                Duplizieren
              </button>
            )}
          </div>
        </div>

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
      </div>
    </main>
  );
};

export default PresentationCreatorPage;
