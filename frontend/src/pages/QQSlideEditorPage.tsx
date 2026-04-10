import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CustomSlide, makePreviewState } from '../components/QQCustomSlide';
import { QQBuiltinSlide } from '../components/QQBuiltinSlide';
import { Fireflies } from './QQBeamerPage';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  QQDraft, QQSlideElement, QQSlideTemplate, QQSlideTemplateType, QQSlideTemplates,
  QQSlideElementType, QQQuestion, QQThemePreset, QQ_THEME_PRESETS,
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
  ph_question:       'Fragetext',
  ph_options:        'Antwort-Optionen',
  ph_category:       'Kategorie-Badge',
  ph_timer:          'Timer',
  ph_teams:          'Teams-Liste',
  ph_grid:           'Territoriums-Grid',
  ph_answer:         'Aufgelöste Antwort',
  ph_winner:         'Gewinner-Team',
  ph_phase_name:     'Phasen-Name',
  ph_phase_desc:     'Phasen-Beschreibung',
  ph_room_code:      'Raum-Code',
  ph_team_answers:   'Team-Antworten',
  ph_question_image: 'Frage-Bild',
  ph_comeback_cards: 'Comeback-Karten',
  ph_game_rankings:  'Endrangliste',
  ph_qr_code:        'QR-Code',
  ph_counter:        'Frage-Zähler',
  ph_hot_potato:     'Hot Potato (aktiv)',
  ph_imposter:       'Imposter (aktiv)',
  ph_answer_count:   'Antwort-Indikator',
  ph_mini_grid:      'Mini-Grid (Vorschau)',
  ph_phase_scores:   'Phasen-Scores',
  ph_placement_banner: 'Platzierung-Banner',
};

const GROUPS: string[] = ['Start', 'Phasen', 'Fragen', 'Ablauf'];

// Helpful style hints per placeholder type
const PH_STYLE_HINTS: Partial<Record<QQSlideElementType, string>> = {
  ph_question:       '🎨 Stil-Einstellungen: Schrift-Größe, -Gewicht, -Farbe und Ausrichtung werden auf den Fragetext angewendet.',
  ph_options:        '🎨 Stil-Einstellungen: Schrift-Größe steuert die Antwort-Texte. Im Abschnitt "Antwort-Optionen" kannst du Spalten, Eckenradius und Farbschema anpassen.',
  ph_category:       '🎨 Stil-Einstellungen: Farbe = Badge-Textfarbe; Hintergrund = Badge-Hintergundfarbe (überschreibt Kategoriefarbe); Eckenradius = Badge-Rundung.',
  ph_answer:         '🎨 Stil-Einstellungen: Schrift-Größe und -Farbe steuern den Auflösungstext.',
  ph_winner:         '🎨 Stil-Einstellungen: Schrift-Größe und -Farbe steuern den Gewinnernamen.',
  ph_phase_name:     '🎨 Stil-Einstellungen: Schrift-Größe und -Farbe steuern den Phasennamen.',
  ph_room_code:      '🎨 Stil-Einstellungen: Schrift-Größe, -Farbe und Hintergrund steuern die Code-Anzeige.',
  ph_teams:          'Zeigt alle Teams mit Punkten. Position & Größe sind editierbar.',
  ph_grid:           'Zeigt das Territoriums-Grid. Position & Größe sind editierbar.',
  ph_timer:          'Zeigt den Countdown-Timer. Position & Größe sind editierbar.',
  ph_qr_code:        'Zeigt den QR-Code für den Raumcode. Position & Größe sind editierbar.',
  ph_question_image: 'Zeigt das Fragebild aus dem Builder. Layout (Vollbild/Fenster/Cutout) wird im Builder gesetzt.',
};

// Required placeholders per template type — warn when user tries to delete these
const REQUIRED_PH: Partial<Record<QQSlideTemplateType, QQSlideElementType[]>> = {
  LOBBY:                ['ph_qr_code', 'ph_room_code'],
  PHASE_INTRO_1:        ['ph_phase_name'],
  PHASE_INTRO_2:        ['ph_phase_name'],
  PHASE_INTRO_3:        ['ph_phase_name'],
  QUESTION_SCHAETZCHEN: ['ph_question', 'ph_timer'],
  QUESTION_MUCHO:       ['ph_question', 'ph_options', 'ph_timer'],
  QUESTION_BUNTE_TUETE: ['ph_question', 'ph_timer'],
  QUESTION_ZEHN:        ['ph_question', 'ph_options', 'ph_timer'],
  QUESTION_CHEESE:      ['ph_question', 'ph_timer'],
  REVEAL:               ['ph_answer', 'ph_winner'],
  PLACEMENT:            ['ph_grid', 'ph_placement_banner'],
  COMEBACK_CHOICE:      ['ph_comeback_cards', 'ph_grid'],
  GAME_OVER:            ['ph_game_rankings'],
};

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
        { id: eid(), type: 'ph_teams', x: 5, y: 51, w: 58, h: 44, zIndex: 2 },
        { id: eid(), type: 'ph_qr_code', x: 68, y: 51, w: 28, h: 44, zIndex: 2 },
      ],
    };
    case 'PHASE_INTRO_1': return phaseIntro(type, '#3B82F6', 'Runde 1');
    case 'PHASE_INTRO_2': return phaseIntro(type, '#F59E0B', 'Runde 2');
    case 'PHASE_INTRO_3': return phaseIntro(type, '#EF4444', 'Runde 3');
    case 'PHASE_INTRO_4': return phaseIntro(type, '#10B981', 'Finale');
    case 'QUESTION_SCHAETZCHEN': return questionTpl(type, '#F59E0B', false, 'SCHAETZCHEN');
    case 'QUESTION_MUCHO':       return questionTpl(type, '#3B82F6', true,  'MUCHO');
    case 'QUESTION_BUNTE_TUETE': return questionTpl(type, '#EF4444', false, 'BUNTE_TUETE');
    case 'QUESTION_ZEHN':        return questionTpl(type, '#22C55E', true,  'ZEHN_VON_ZEHN');
    case 'QUESTION_CHEESE':      return questionTpl(type, '#8B5CF6', false, 'CHEESE');
    case 'REVEAL': return {
      type, background: bg,
      elements: [
        { id: eid(), type: 'ph_category', x: 2, y: 2, w: 24, h: 10, zIndex: 2 },
        { id: eid(), type: 'ph_question', x: 4, y: 14, w: 92, h: 16, fontSize: 2.8, fontWeight: 900, color: '#94a3b8', textAlign: 'center', zIndex: 2 },
        { id: eid(), type: 'ph_question_image', x: 70, y: 14, w: 26, h: 16, zIndex: 1, opacity: 0.85 },
        { id: eid(), type: 'ph_answer', x: 8, y: 34, w: 84, h: 24, fontSize: 5.5, fontWeight: 900, color: '#22C55E', textAlign: 'center', zIndex: 2, animIn: 'pop', animDelay: 0.3 },
        { id: eid(), type: 'ph_team_answers', x: 4, y: 60, w: 92, h: 30, fontSize: 1.2, zIndex: 2, animIn: 'fadeUp', animDelay: 0.5 },
        { id: eid(), type: 'ph_winner', x: 8, y: 63, w: 84, h: 14, fontSize: 3, fontWeight: 800, color: '#F59E0B', textAlign: 'center', zIndex: 2, animIn: 'fadeUp', animDelay: 0.5 },
      ],
    };
    case 'PLACEMENT': return {
      type, background: bg,
      elements: [
        { id: eid(), type: 'ph_placement_banner', x: 0, y: 0, w: 100, h: 14, zIndex: 3 },
        { id: eid(), type: 'ph_grid', x: 3, y: 17, w: 58, h: 78, zIndex: 2 },
        { id: eid(), type: 'ph_teams', x: 64, y: 17, w: 34, h: 78, zIndex: 2 },
      ],
    };
    case 'COMEBACK_CHOICE': return {
      type, background: bg,
      elements: [
        { id: eid(), type: 'rect', x: 0, y: 0, w: 100, h: 100, background: 'radial-gradient(ellipse at 50% 50%, rgba(249,115,22,0.2) 0%, transparent 65%)', zIndex: 0 },
        { id: eid(), type: 'text', x: 10, y: 6, w: 80, h: 16, text: '⚡ Comeback!', fontSize: 8, fontWeight: 900, color: '#F97316', textAlign: 'center', zIndex: 2, animIn: 'pop' },
        { id: eid(), type: 'ph_comeback_cards', x: 10, y: 24, w: 46, h: 72, fontSize: 1.4, zIndex: 2, animIn: 'fadeUp', animDelay: 0.2 },
        { id: eid(), type: 'ph_grid', x: 58, y: 24, w: 40, h: 56, zIndex: 2, animIn: 'fadeIn', animDelay: 0.3 },
        { id: eid(), type: 'ph_teams', x: 58, y: 82, w: 40, h: 16, zIndex: 2 },
      ],
    };
    case 'GAME_OVER': return {
      type, background: bg,
      elements: [
        { id: eid(), type: 'rect', x: 0, y: 0, w: 100, h: 100, background: 'radial-gradient(ellipse at 50% 30%, rgba(245,158,11,0.25) 0%, transparent 55%)', zIndex: 0 },
        { id: eid(), type: 'text', x: 10, y: 4, w: 80, h: 16, text: '🏆 Spielende!', fontSize: 7.5, fontWeight: 900, color: '#F59E0B', textAlign: 'center', zIndex: 2, animIn: 'pop' },
        { id: eid(), type: 'ph_game_rankings', x: 3, y: 22, w: 55, h: 74, fontSize: 1.4, zIndex: 2, animIn: 'fadeUp', animDelay: 0.3 },
        { id: eid(), type: 'ph_grid', x: 58, y: 22, w: 40, h: 54, zIndex: 2, animIn: 'fadeIn', animDelay: 0.5 },
        { id: eid(), type: 'ph_teams', x: 58, y: 78, w: 40, h: 18, zIndex: 2 },
      ],
    };
    default: return { type: type as QQSlideTemplateType, background: bg, elements: [] };
  }
}

function phaseIntro(type: QQSlideTemplateType, color: string, label: string): QQSlideTemplate {
  return {
    type, background: '#0D0A06',
    elements: [
      { id: eid(), type: 'rect', x: 0, y: 0, w: 100, h: 100, background: `radial-gradient(ellipse at 50% 50%, ${color}33 0%, transparent 65%)`, zIndex: 0 },
      { id: eid(), type: 'text', x: 10, y: 10, w: 80, h: 10, text: `Phase`, fontSize: 1.8, fontWeight: 700, color: `${color}99`, textAlign: 'center', letterSpacing: 0.14, zIndex: 2, animIn: 'fadeIn', animDelay: 0.1 },
      { id: eid(), type: 'text', x: 10, y: 16, w: 80, h: 24, text: label, fontSize: 11, fontWeight: 900, color, textAlign: 'center', zIndex: 2, animIn: 'pop', animDelay: 0.2 },
      { id: eid(), type: 'ph_phase_name', x: 10, y: 44, w: 80, h: 10, fontSize: 3.2, fontWeight: 800, color: '#e2e8f0', textAlign: 'center', zIndex: 2, animIn: 'fadeUp', animDelay: 0.3 },
      { id: eid(), type: 'ph_phase_desc', x: 15, y: 55, w: 70, h: 7, fontSize: 2, fontWeight: 600, color: '#64748b', textAlign: 'center', zIndex: 2, animIn: 'fadeIn', animDelay: 0.5 },
      { id: eid(), type: 'ph_mini_grid', x: 35, y: 66, w: 30, h: 18, zIndex: 2, opacity: 0.5, animIn: 'fadeIn', animDelay: 0.9 },
      { id: eid(), type: 'ph_phase_scores', x: 10, y: 86, w: 80, h: 10, zIndex: 2, animIn: 'fadeIn', animDelay: 1.1 },
    ],
  };
}

interface CutoutSpec { text: string; top?: number; bottom?: number; left?: number; right?: number; rot: number; alt?: boolean }

const CAT_CUTOUT_ELEMENTS: Record<string, CutoutSpec[]> = {
  SCHAETZCHEN:   [{ text: '🍯', top: 6,  right: 11, rot: -12 }, { text: '✨', bottom: 14, left: 7,  rot: 8   }, { text: '💛', top: 30, right: 5,  rot: 16  }],
  MUCHO:         [{ text: '🤔', top: 8,  right: 13, rot: -8  }, { text: '💡', bottom: 18, left: 6,  rot: 12  }, { text: '🅰️', top: 38, right: 6,  rot: -14, alt: true }],
  BUNTE_TUETE:   [{ text: '🎁', top: 7,  right: 10, rot: -10 }, { text: '🎲', bottom: 16, left: 8,  rot: 14  }, { text: '⭐', top: 42, right: 5,  rot: 20  }],
  ZEHN_VON_ZEHN: [{ text: '🔟', top: 10, right: 12, rot: -6  }, { text: '✅', bottom: 20, left: 7,  rot: 10  }, { text: '📊', top: 32, right: 7,  rot: -12, alt: true }],
  CHEESE:        [{ text: '🧀', top: 9,  right: 11, rot: -11 }, { text: '🎭', bottom: 15, left: 7,  rot: 8   }, { text: '👑', top: 36, right: 6,  rot: -9,  alt: true }],
};

function cutoutElements(cat: string): QQSlideElement[] {
  const specs = CAT_CUTOUT_ELEMENTS[cat] ?? [];
  return specs.map((c, i) => ({
    id: eid(),
    type: 'animatedAvatar' as const,
    text: c.text,
    x: c.left ?? (100 - (c.right ?? 10) - 8),
    y: c.top !== undefined ? c.top : (100 - (c.bottom ?? 15) - 14),
    w: 8, h: 14,
    rotation: c.rot,
    fontSize: 6,
    zIndex: 3,
    animType: (c.alt ? 'bounce' : 'wiggle') as 'bounce' | 'wiggle',
    avatarAnimDuration: 4 + i * 0.7,
    avatarAnimDelay: i * 0.5,
  }));
}

function questionTpl(type: QQSlideTemplateType, color: string, hasOptions = false, cat?: string): QQSlideTemplate {
  return {
    type, background: '#0D0A06',
    elements: [
      { id: eid(), type: 'rect',              x: 0,  y: 0,  w: 100, h: 100, background: `radial-gradient(ellipse at 50% 0%, ${color}18 0%, transparent 50%)`, zIndex: 0 },
      { id: eid(), type: 'ph_category',       x: 2,  y: 2,  w: 24,  h: 10,  zIndex: 2 },
      { id: eid(), type: 'ph_counter',        x: 30, y: 2,  w: 22,  h: 8,   fontSize: 1.5, color: 'rgba(255,255,255,0.3)', textAlign: 'center', zIndex: 2 },
      { id: eid(), type: 'ph_timer',          x: 76, y: 2,  w: 22,  h: 10,  zIndex: 2 },
      { id: eid(), type: 'ph_question',       x: 5,  y: 15, w: 90,  h: hasOptions ? 20 : 28, fontSize: hasOptions ? 3.2 : 4, fontWeight: 900, color: '#e2e8f0', textAlign: 'center', zIndex: 2, animIn: 'fadeUp', animDelay: 0.2 },
      { id: eid(), type: 'ph_question_image', x: 60, y: 15, w: 36,  h: hasOptions ? 20 : 28, zIndex: 1, opacity: 0.9 },
      { id: eid(), type: 'ph_options',        x: 4,  y: hasOptions ? 40 : 48, w: 92, h: hasOptions ? 46 : 38, zIndex: 2 },
      { id: eid(), type: 'ph_answer_count',   x: 4,  y: hasOptions ? 88 : 88, w: 30, h: 8,   zIndex: 2 },
      { id: eid(), type: 'ph_hot_potato',     x: 62, y: hasOptions ? 88 : 88, w: 34, h: 10,  zIndex: 3 },
      { id: eid(), type: 'ph_imposter',       x: 62, y: hasOptions ? 88 : 88, w: 34, h: 10,  zIndex: 3 },
      ...(cat ? cutoutElements(cat) : []),
    ],
  };
}


// ── SlidePreview (thumbnail showing real built-in view) ──────────────────────
function SlidePreview({ template }: { template: QQSlideTemplate }) {
  const elements = template.elements ?? [];
  return (
    <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 4, overflow: 'hidden', background: '#0D0A06', flexShrink: 0, position: 'relative' }}>
      <QQBuiltinSlide templateType={template.type} />
      {elements.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <CustomSlide template={{ ...template, elements }} overlayOnly />
        </div>
      )}
    </div>
  );
}

// ── Design Presets ────────────────────────────────────────────────────────────
interface DesignPreset {
  id: string;
  label: string;
  icon: string;
  bg: string;
  accent: string;
  textColor: string;
  cardBg: string;
  animIn: QQSlideElement['animIn'];
  animLoop?: QQSlideElement['animLoop'];
}

const DESIGN_PRESETS: DesignPreset[] = [
  {
    id: 'dark-default',
    label: 'Dark Classic',
    icon: '🌑',
    bg: '#0D0A06',
    accent: '#F59E0B',
    textColor: '#e2e8f0',
    cardBg: '#1B1510',
    animIn: 'fadeUp',
  },
  {
    id: 'neon-glow',
    label: 'Neon Glow',
    icon: '💜',
    bg: '#0a0014',
    accent: '#A855F7',
    textColor: '#f0e6ff',
    cardBg: '#1a0033',
    animIn: 'pop',
    animLoop: 'pulse',
  },
  {
    id: 'ocean-deep',
    label: 'Ocean Deep',
    icon: '🌊',
    bg: 'linear-gradient(160deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    accent: '#22D3EE',
    textColor: '#e0f7fa',
    cardBg: '#0e3d52',
    animIn: 'slideLeft',
  },
  {
    id: 'retro-arcade',
    label: 'Retro Arcade',
    icon: '🕹️',
    bg: 'linear-gradient(180deg, #1a0000 0%, #0d0012 100%)',
    accent: '#FF2D55',
    textColor: '#fff',
    cardBg: '#200010',
    animIn: 'slotDrop',
  },
  {
    id: 'gradient-pop',
    label: 'Gradient Pop',
    icon: '🌈',
    bg: 'linear-gradient(135deg, #1a0533 0%, #0d1a3d 50%, #001a2e 100%)',
    accent: '#F97316',
    textColor: '#fef3c7',
    cardBg: '#1a0c30',
    animIn: 'bounceIn',
  },
  {
    id: 'forest-night',
    label: 'Forest Night',
    icon: '🌲',
    bg: 'linear-gradient(180deg, #0a1408 0%, #0f2010 100%)',
    accent: '#4ADE80',
    textColor: '#dcfce7',
    cardBg: '#0d1f0d',
    animIn: 'swingIn',
  },
];

/**
 * Applies a design preset to a template: replaces background and recolors text/rect elements
 * while preserving all placeholder positions and layout.
 */
function applyDesignPreset(template: QQSlideTemplate, preset: DesignPreset): QQSlideTemplate {
  const recolored = template.elements.map(el => {
    const base: Partial<QQSlideElement> = {};
    // Apply entrance animation to all elements
    if (el.animIn && el.animIn !== 'none') {
      base.animIn = preset.animIn;
    }
    // Recolor text elements that use white/default colors
    if (el.type === 'text') {
      if (!el.color || el.color === '#e2e8f0' || el.color === '#ffffff') {
        base.color = preset.textColor;
      }
      // Accent color: elements with yellow/orange/primary color get the new accent
      if (el.color && /^#F59E0B|#EAB308|#F97316|#A855F7|#22D3EE|#FF2D55|#4ADE80/.test(el.color)) {
        base.color = preset.accent;
      }
    }
    // Recolor rect backgrounds
    if (el.type === 'rect' && el.background) {
      if (el.background.includes('rgba(245,158,11') || el.background.includes('rgba(249,115,22')) {
        base.background = el.background.replace(/rgba\(\d+,\d+,\d+/,
          `rgba(${parseInt(preset.accent.slice(1,3),16)},${parseInt(preset.accent.slice(3,5),16)},${parseInt(preset.accent.slice(5,7),16)}`
        );
      }
    }
    // Loop animation on accent text elements
    if (preset.animLoop && el.type === 'text' && el.fontWeight && el.fontWeight >= 800 && (el.fontSize ?? 0) > 5) {
      base.animLoop = preset.animLoop;
    }
    return { ...el, ...base };
  });

  return {
    ...template,
    background: preset.bg,
    elements: recolored,
  };
}

// ── Shared tab bar (identical to Builder) ────────────────────────────────────
function QQEditorTabs({ active, draftId, onSave }: { active: 'builder' | 'editor'; draftId?: string; onSave?: () => void }) {
  const navigate = useNavigate();
  const tabs = [
    { id: 'builder', label: '📋 Fragen',  path: '/qq-builder' },
    { id: 'editor',  label: '🎨 Design',  path: `/qq-slides?draft=${draftId}` },
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function QQSlideEditorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const draftId = searchParams.get('draft');
  const focusQuestionId = searchParams.get('focusQuestion');

  const [draft, setDraft] = useState<QQDraft | null>(null);
  const [templates, setTemplates] = useState<QQSlideTemplates>({});
  const [activeType, setActiveType] = useState<QQSlideTemplateType>('LOBBY');
  // editingKey: actual key in templates being edited — either category type or 'q-${id}'
  const [editingKey, setEditingKey] = useState<string>('LOBBY');
  // Multi-select: array, selectedIds[0] is the "primary" for properties panel
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [snapLines, setSnapLines] = useState<{ x?: number; y?: number }>({});
  const [previewMode, setPreviewMode] = useState(false);
  const [showThemeColors, setShowThemeColors] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<QQQuestion | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightSection, setRightSection] = useState<'add' | 'props' | 'layers' | 'presets'>('props');
  const historyRef = useRef<QQSlideTemplates[]>([{}]);
  const histIdxRef = useRef(0);
  const clipboardRef = useRef<QQSlideElement[]>([]);

  // Derived: primary selected id (for properties panel)
  const selectedId = selectedIds[0] ?? null;

  useEffect(() => {
    if (!draftId) { setLoading(false); return; }
    fetch(`/api/qq/drafts/${draftId}`)
      .then(r => r.json())
      .then((d: QQDraft) => {
        setDraft(d);
        const tpls = d.slideTemplates ?? {};
        setTemplates(tpls);
        // If focusQuestion param is set, jump to that question's step
        if (focusQuestionId) {
          const q = d.questions.find(q => q.id === focusQuestionId);
          if (q) {
            const cat = q.category;
            const typeMap: Record<string, QQSlideTemplateType> = {
              SCHAETZCHEN: 'QUESTION_SCHAETZCHEN', MUCHO: 'QUESTION_MUCHO',
              BUNTE_TUETE: 'QUESTION_BUNTE_TUETE', ZEHN_VON_ZEHN: 'QUESTION_ZEHN',
              CHEESE: 'QUESTION_CHEESE',
            };
            const type = typeMap[cat] ?? 'QUESTION_MUCHO';
            const perQKey = `q-${q.id}`;
            const key = tpls[perQKey]?.elements?.length ? perQKey : type;
            setActiveType(type);
            setEditingKey(key);
            setPreviewQuestion(q);
          }
        }
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  const rawTemplate = templates[editingKey] ?? makeDefault(activeType) ?? { type: activeType, background: '#0D0A06', elements: [] as QQSlideElement[] };
  const activeTemplate: QQSlideTemplate = { ...rawTemplate, elements: rawTemplate.elements ?? [] };

  // Is the current question using a per-question override?
  const isIndividual = previewQuestion ? Boolean(templates[`q-${previewQuestion.id}`]?.elements?.length) : false;

  function patchTemplate(t: QQSlideTemplate) {
    setTemplates(prev => {
      const next = { ...prev, [editingKey]: t };
      historyRef.current = historyRef.current.slice(0, histIdxRef.current + 1);
      historyRef.current.push(next);
      histIdxRef.current = historyRef.current.length - 1;
      return next;
    });
  }

  function patchElement(patch: Partial<QQSlideElement>) {
    if (!selectedId) return;
    patchTemplate({ ...activeTemplate, elements: (activeTemplate.elements || []).map(e => e.id === selectedId ? { ...e, ...patch } : e) });
  }

  function addElement(type: QQSlideElementType) {
    const newEl: QQSlideElement = {
          id: eid(), type, x: 20, y: 20, w: 20, h: 35, zIndex: 5,
      ...(type === 'text'  ? { text: 'Text', fontSize: 3, fontWeight: 700, color: '#ffffff', textAlign: 'center' } : {}),
      ...(type === 'rect'  ? { background: 'rgba(30,41,59,0.8)', borderRadius: 12 } : {}),
      ...(type === 'image' ? { imageUrl: '', objectFit: 'contain' as const } : {}),
          ...(type === 'animatedAvatar' ? { avatarId: 'avatar1', animType: 'wiggle', avatarAnimDuration: 1.2, avatarAnimDelay: 0 } : {}),
    };
    patchTemplate({ ...activeTemplate, elements: [...(activeTemplate.elements || []), newEl] });
    setSelectedIds([newEl.id]);
  }

  function deleteSelected() {
    if (selectedIds.length === 0) return;
    const ids = new Set(selectedIds);
    const toDelete = (activeTemplate.elements || []).filter(e => ids.has(e.id));
    const requiredTypes = REQUIRED_PH[activeType] ?? [];
    const deletingRequired = toDelete.filter(e => requiredTypes.includes(e.type as QQSlideElementType));
    if (deletingRequired.length > 0) {
      const names = deletingRequired.map(e => PH_LABELS[e.type as QQSlideElementType] ?? e.type).join(', ');
      if (!window.confirm(`⚠️ ${names} ${deletingRequired.length === 1 ? 'ist ein wichtiger' : 'sind wichtige'} Platzhalter für dieses Template.\nOhne ${deletingRequired.length === 1 ? 'ihn' : 'sie'} wird der Beamer dort nichts anzeigen.\n\nTrotzdem löschen?`)) return;
    }
    patchTemplate({ ...activeTemplate, elements: (activeTemplate.elements || []).filter(e => !ids.has(e.id)) });
    setSelectedIds([]);
  }

  function duplicateSelected() {
    if (selectedIds.length === 0) return;
    const ids = new Set(selectedIds);
    const els = (activeTemplate.elements || []).filter(e => ids.has(e.id));
    if (els.length === 0) return;
    const copies = els.map(el => ({ ...el, id: eid(), x: el.x + 3, y: el.y + 3, zIndex: (el.zIndex ?? 1) + 1 }));
    patchTemplate({ ...activeTemplate, elements: [...(activeTemplate.elements || []), ...copies] });
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

  /** Copy category template to per-question override so this question gets its own unique design */
  function individualizeQuestion() {
    if (!previewQuestion) return;
    const perQKey = `q-${previewQuestion.id}`;
    const base = templates[activeType] ?? makeDefault(activeType);
    const copy = { ...base, type: activeType };
    setTemplates(prev => {
      const next = { ...prev, [perQKey]: copy };
      historyRef.current = historyRef.current.slice(0, histIdxRef.current + 1);
      historyRef.current.push(next);
      histIdxRef.current = historyRef.current.length - 1;
      return next;
    });
    setEditingKey(perQKey);
  }

  /** Remove per-question override → falls back to category template */
  function resetToCategory() {
    if (!previewQuestion) return;
    if (!confirm('Individuelles Design löschen? Die Frage verwendet dann wieder das Kategorie-Template.')) return;
    const perQKey = `q-${previewQuestion.id}`;
    setTemplates(prev => {
      const next = { ...prev };
      delete next[perQKey];
      historyRef.current = historyRef.current.slice(0, histIdxRef.current + 1);
      historyRef.current.push(next);
      histIdxRef.current = historyRef.current.length - 1;
      return next;
    });
    setEditingKey(activeType);
  }

  // Game-flow step sequence for sidebar + slideshow preview
  const getQTemplateType = useCallback((q: QQQuestion): QQSlideTemplateType => {
    switch (q.category) {
      case 'SCHAETZCHEN': return 'QUESTION_SCHAETZCHEN';
      case 'MUCHO': return 'QUESTION_MUCHO';
      case 'BUNTE_TUETE': return 'QUESTION_BUNTE_TUETE';
      case 'ZEHN_VON_ZEHN': return 'QUESTION_ZEHN';
      case 'CHEESE': return 'QUESTION_CHEESE';
      default: return 'QUESTION_SCHAETZCHEN';
    }
  }, []);

  type StepItem = { key: string; label: string; type: QQSlideTemplateType; question?: QQQuestion; phase?: number; icon?: string; color?: string };
  const gameSteps: StepItem[] = useMemo(() => {
    if (!draft) return [];
    const steps: StepItem[] = [];
    steps.push({ key: 'lobby', label: 'Lobby', type: 'LOBBY', icon: '🏠', color: '#3B82F6' });
    for (let p = 1; p <= draft.phases; p++) {
      const phaseColor = p === 1 ? '#3B82F6' : p === 2 ? '#F59E0B' : p === 3 ? '#EF4444' : '#10B981';
      steps.push({ key: `phase-intro-${p}`, label: `Runde ${p} Intro`, type: `PHASE_INTRO_${p}` as QQSlideTemplateType, icon: `${p}️⃣`, color: phaseColor, phase: p });
      const qs = draft.questions.filter(q => q.phaseIndex === p);
      for (const q of qs) {
        const ttype = getQTemplateType(q);
        const spec = TEMPLATE_SPECS.find(s => s.type === ttype);
        steps.push({ key: `q-${q.id}`, label: `${spec?.label || q.category} (${q.text?.slice(0, 18)})`, type: ttype, question: q, icon: spec?.icon, color: spec?.color, phase: p });
        steps.push({ key: `reveal-${q.id}`, label: 'Auflösung', type: 'REVEAL', icon: '✅', color: '#22C55E', question: q, phase: p });
        steps.push({ key: `placement-${q.id}`, label: 'Platzierung', type: 'PLACEMENT', icon: '🗺️', color: '#6366F1', question: q, phase: p });
      }
      if (p === 2) steps.push({ key: 'comeback', label: 'Comeback', type: 'COMEBACK_CHOICE', icon: '⚡', color: '#F97316', phase: p });
    }
    steps.push({ key: 'game-over', label: 'Spielende', type: 'GAME_OVER', icon: '🏆', color: '#F59E0B' });
    return steps;
  }, [draft, getQTemplateType]);

  const currentStepIdx = gameSteps.findIndex(s => s.type === activeType);
  function goStep(dir: number) {
    const i = currentStepIdx + dir;
    if (i >= 0 && i < gameSteps.length) {
      setActiveType(gameSteps[i].type);
    }
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
    const els = (activeTemplate.elements || []).filter(e => selectedIds.includes(e.id));
    if (els.length === 0) return;

    // Bounding box of selection
    const minX = Math.min(...els.map(e => e.x));
    const minY = Math.min(...els.map(e => e.y));
    const maxX = Math.max(...els.map(e => e.x + e.w));
    const maxY = Math.max(...els.map(e => e.y + e.h));
    const selW = maxX - minX;
    const selH = maxY - minY;

    const idSet = new Set(selectedIds);
    const newEls = (activeTemplate.elements || []).map(el => {
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
    // Normalize to unique sequential z-indices first (fixes swap no-op when values are equal)
    const sorted = [...activeTemplate.elements].sort((a, b) => (a.zIndex ?? 1) - (b.zIndex ?? 1));
    const zMap = new Map<string, number>();
    sorted.forEach((el, i) => zMap.set(el.id, i));
    const idx = sorted.findIndex(e => e.id === id);
    if (idx === -1) return;
    if (dir === 'up' && idx < sorted.length - 1) {
      const aId = sorted[idx].id, bId = sorted[idx + 1].id;
      const az = zMap.get(aId)!, bz = zMap.get(bId)!;
      zMap.set(aId, bz);
      zMap.set(bId, az);
    } else if (dir === 'down' && idx > 0) {
      const aId = sorted[idx].id, bId = sorted[idx - 1].id;
      const az = zMap.get(aId)!, bz = zMap.get(bId)!;
      zMap.set(aId, bz);
      zMap.set(bId, az);
    } else {
      return;
    }
    patchTemplate({ ...activeTemplate, elements: activeTemplate.elements.map(e => ({ ...e, zIndex: zMap.get(e.id) ?? (e.zIndex ?? 1) })) });
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
      if (target.isContentEditable) return;
      // Preview mode: arrow keys navigate slides
      if (previewMode) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goStep(-1); return; }
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); goStep(1); return; }
        if (e.key === 'Escape') { setPreviewMode(false); return; }
        return;
      }
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
      if (e.key === 'ArrowLeft')  { e.preventDefault(); patchTemplate({ ...activeTemplate, elements: (activeTemplate.elements ?? []).map(el => ids.has(el.id) ? { ...el, x: Math.max(0, Math.min(97, el.x - nudge)) } : el) }); }
      if (e.key === 'ArrowRight') { e.preventDefault(); patchTemplate({ ...activeTemplate, elements: (activeTemplate.elements ?? []).map(el => ids.has(el.id) ? { ...el, x: Math.max(0, Math.min(97, el.x + nudge)) } : el) }); }
      if (e.key === 'ArrowUp')    { e.preventDefault(); patchTemplate({ ...activeTemplate, elements: (activeTemplate.elements ?? []).map(el => ids.has(el.id) ? { ...el, y: Math.max(0, Math.min(97, el.y - nudge)) } : el) }); }
      if (e.key === 'ArrowDown')  { e.preventDefault(); patchTemplate({ ...activeTemplate, elements: (activeTemplate.elements ?? []).map(el => ids.has(el.id) ? { ...el, y: Math.max(0, Math.min(97, el.y + nudge)) } : el) }); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, editingId, activeTemplate, activeType, previewMode, currentStepIdx]);

  const selectedEl = (activeTemplate.elements ?? []).find(e => e.id === selectedId) ?? null;
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

      {/* ── Shared tab bar ── */}
      <QQEditorTabs active="editor" draftId={draftId ?? undefined} onSave={() => void save()} />

      {/* ── Header ── */}
      <div style={{ padding: '8px 20px', background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={() => navigate(`/qq-builder`)} style={btn('#475569')}>← Builder</button>
        <div style={{ fontSize: 15, fontWeight: 900 }}>{draft.title}</div>
        <div style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>Folien-Editor</div>
        {/* Theme preset swatches */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 16 }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginRight: 2 }}>Theme:</span>
          {(Object.keys(QQ_THEME_PRESETS) as Exclude<QQThemePreset, 'custom'>[]).map(t => {
            const th = QQ_THEME_PRESETS[t];
            const active = (draft.theme?.preset ?? 'default') === t;
            return (
              <button
                key={t}
                title={t.charAt(0).toUpperCase() + t.slice(1)}
                onClick={() => setDraft({ ...draft, theme: { ...th }, updatedAt: Date.now() })}
                style={{
                  width: active ? 26 : 20, height: active ? 26 : 20,
                  borderRadius: '50%', border: active ? '2px solid #fff' : '2px solid transparent',
                  background: `linear-gradient(135deg, ${th.bgColor}, ${th.accentColor})`,
                  cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                }}
              />
            );
          })}
          <button
            title="Farben anpassen"
            onClick={() => setShowThemeColors(p => !p)}
            style={{
              width: 22, height: 22, borderRadius: '50%', border: showThemeColors ? '2px solid #fff' : '2px solid transparent',
              background: 'conic-gradient(#EF4444, #F59E0B, #22C55E, #3B82F6, #8B5CF6, #EF4444)',
              cursor: 'pointer', flexShrink: 0, marginLeft: 4,
            }}
          />
        </div>
        {/* Custom color pickers */}
        {showThemeColors && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginLeft: 8 }}>
            {([
              { key: 'bgColor', label: 'BG', fallback: '#0D0A06' },
              { key: 'accentColor', label: 'Akzent', fallback: '#F59E0B' },
              { key: 'textColor', label: 'Text', fallback: '#e2e8f0' },
              { key: 'cardBg', label: 'Karte', fallback: '#1B1510' },
            ] as const).map(({ key, label, fallback }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>
                {label}
                <input
                  type="color"
                  value={(draft.theme as any)?.[key] ?? fallback}
                  onChange={e => setDraft({ ...draft, theme: { ...(draft.theme ?? { preset: 'custom' as const }), preset: 'custom' as const, [key]: e.target.value }, updatedAt: Date.now() })}
                  style={{ width: 22, height: 22, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent', padding: 0 }}
                />
              </label>
            ))}
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Per-question design controls */}
          {previewQuestion && (
            isIndividual ? (
              <button onClick={resetToCategory} title="Zurück zum Kategorie-Standard"
                style={{ ...btn('#8B5CF6', true), fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                ✦ Individuell <span style={{ opacity: 0.6, fontSize: 10 }}>× zurücksetzen</span>
              </button>
            ) : (
              <button onClick={individualizeQuestion} title="Eigenes Design für diese Frage erstellen"
                style={{ ...btn('#A78BFA', true), fontSize: 11 }}>
                ✦ Individualisieren
              </button>
            )
          )}
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', alignSelf: 'center' }} />
          <button onClick={undo} disabled={histIdxRef.current <= 0} title="Rückgängig (Ctrl+Z)" style={btn('#475569', true)}>↩</button>
          <button onClick={redo} disabled={histIdxRef.current >= historyRef.current.length - 1} title="Wiederholen (Ctrl+Y)" style={btn('#475569', true)}>↪</button>
          <button onClick={resetTemplate} style={btn('#475569', true)}>↺</button>
          <button onClick={duplicateSelected} disabled={selectedIds.length === 0} title="Duplizieren (Ctrl+D)" style={btn('#6366F1', true)}>⎘</button>
          <button onClick={deleteSelected} disabled={selectedIds.length === 0} title="Löschen (Entf)" style={btn('#EF4444', true)}>🗑</button>
          <button onClick={save} disabled={saving} title="Speichern (Ctrl+S)" style={btn('#22C55E')}>{saving ? '…' : '💾 Speichern'}</button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left: slide list — collapsible */}
        <div style={{ width: leftOpen ? 180 : 0, flexShrink: 0, borderRight: leftOpen ? '1px solid rgba(255,255,255,0.07)' : 'none', background: '#080c14', overflowY: leftOpen ? 'auto' : 'hidden', overflowX: 'hidden', transition: 'width 0.2s ease', position: 'relative' }}>
          <div style={{ width: 180 }}>
            <div style={{ padding: '8px 10px 4px', fontSize: 9, fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ablauf</div>
            {gameSteps.map((step) => {
              const isActive = editingKey === step.type || (step.question && editingKey === `q-${step.question.id}`);
              const hasIndividual = step.question ? Boolean(templates[`q-${step.question.id}`]?.elements?.length) : false;
              const previewTpl = hasIndividual && step.question
                ? templates[`q-${step.question.id}`]!
                : (templates[step.type] ?? makeDefault(step.type));
              return (
                <button key={step.key}
                  onClick={() => {
                    const perQKey = step.question ? `q-${step.question.id}` : null;
                    const key = perQKey && templates[perQKey]?.elements?.length ? perQKey : step.type;
                    setActiveType(step.type);
                    setEditingKey(key);
                    setPreviewQuestion(step.question ?? null);
                    const newEls = (templates[key]?.elements ?? makeDefault(step.type).elements) || [];
                    setSelectedIds(newEls.length > 0 ? [newEls[0].id] : []);
                  }}
                  style={{ width: '100%', padding: '6px 8px', background: isActive ? (step.color || '#64748b') + '18' : 'transparent', border: 'none', borderLeft: `3px solid ${isActive ? (step.color || '#64748b') : 'transparent'}`, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'inherit', textAlign: 'left' }}>
                  <SlidePreview template={previewTpl} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 12, flexShrink: 0 }}>{step.icon}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: isActive ? 900 : 600, color: isActive ? (step.color || '#64748b') : '#64748b', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{step.label}</div>
                    </div>
                    {hasIndividual && (
                      <div style={{ fontSize: 8, fontWeight: 900, color: '#A78BFA', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 4, padding: '1px 4px', flexShrink: 0 }}>✦</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
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
            <span style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>Übergang:</span>
            <select value={activeTemplate.transitionIn || ''} onChange={e => patchTemplate({ ...activeTemplate, transitionIn: (e.target.value || undefined) as any })}
              style={{ ...input, width: 90, fontSize: 11, padding: '3px 6px' }}>
              <option value="">Keiner</option>
              <option value="fade">Einblenden</option>
              <option value="slideUp">Hochschieben</option>
              <option value="zoom">Zoom</option>
            </select>
            {activeTemplate.transitionIn && (
              <>
                <span style={{ fontSize: 10, color: '#475569' }}>Dauer:</span>
                <input type="number" min={0.1} max={2} step={0.1} value={activeTemplate.transitionDuration ?? 0.5}
                  onChange={e => patchTemplate({ ...activeTemplate, transitionDuration: parseFloat(e.target.value) || 0.5 })}
                  style={{ ...input, width: 52, fontSize: 11, padding: '3px 6px', textAlign: 'center' }} />
                <span style={{ fontSize: 10, color: '#475569' }}>s</span>
              </>
            )}
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

          {/* Canvas area with edit/preview toggle */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 16px', background: '#060a10', overflow: 'hidden', position: 'relative' }}>
            {/* Left sidebar toggle button */}
            <button onClick={() => setLeftOpen(p => !p)}
              title={leftOpen ? 'Sidebar ausblenden' : 'Sidebar einblenden'}
              style={{ position: 'absolute', left: leftOpen ? -1 : 6, top: 8, zIndex: 10, padding: '4px 6px', borderRadius: '0 6px 6px 0', border: '1px solid rgba(255,255,255,0.1)', borderLeft: leftOpen ? 'none' : undefined, background: '#1e293b', color: '#64748b', cursor: 'pointer', fontSize: 12, lineHeight: 1, fontFamily: 'inherit', fontWeight: 900 }}>
              {leftOpen ? '◀' : '▶'}
            </button>
            <div style={{ alignSelf: 'flex-end', marginBottom: 8 }}>
              <button
                onClick={() => setPreviewMode((prev) => !prev)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 8,
                  border: '1px solid #64748b',
                  background: previewMode ? '#334155' : '#1e293b',
                  color: previewMode ? '#fbbf24' : '#e2e8f0',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  marginBottom: 4,
                  marginRight: 4,
                  transition: 'background 0.2s, color 0.2s',
                }}
                title={previewMode ? 'Zurück zur Bearbeitung' : 'Vorschau anzeigen'}
              >
                {previewMode ? '🖉 Bearbeiten' : '👁 Vorschau'}
              </button>
            </div>
            <div style={{ flex: 1, width: '100%', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedIds([])}>
              {previewMode ? (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: '100%', aspectRatio: '16/9', position: 'relative', background: activeTemplate.background || '#0D0A06', borderRadius: 10, overflow: 'hidden', fontFamily: "'Nunito', system-ui, sans-serif", color: '#e2e8f0' }}>
                    <Fireflies />
                    {/* Grain overlay (matches beamer) */}
                    <div style={{
                      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9990,
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
                      opacity: 0.04, mixBlendMode: 'overlay',
                    }} />
                    <CustomSlide template={activeTemplate} previewState={makePreviewState(activeType, draft.questions, previewQuestion ?? undefined)} />
                  </div>
                  {/* Slideshow navigation */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => goStep(-1)} disabled={currentStepIdx <= 0}
                      style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: currentStepIdx <= 0 ? 'not-allowed' : 'pointer', background: 'rgba(255,255,255,0.08)', color: currentStepIdx <= 0 ? '#334155' : '#e2e8f0', fontWeight: 800, fontSize: 14, fontFamily: 'inherit' }}>
                      ◀ Zurück
                    </button>
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700, minWidth: 80, textAlign: 'center' }}>
                      {currentStepIdx + 1} / {gameSteps.length}
                    </span>
                    <button onClick={() => goStep(1)} disabled={currentStepIdx >= gameSteps.length - 1}
                      style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: currentStepIdx >= gameSteps.length - 1 ? 'not-allowed' : 'pointer', background: 'rgba(255,255,255,0.08)', color: currentStepIdx >= gameSteps.length - 1 ? '#334155' : '#e2e8f0', fontWeight: 800, fontSize: 14, fontFamily: 'inherit' }}>
                      Weiter ▶
                    </button>
                  </div>
                </div>
              ) : (
                <SlideCanvas
                  template={activeTemplate}
                  templateType={activeType}
                  bgColor={draft.theme?.bgColor ?? '#0D0A06'}
                  questions={draft.questions}
                  previewQuestion={previewQuestion}
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
                  onDelete={deleteSelected}
                  onDuplicate={duplicateSelected}
                  onDropFile={async (file, x, y) => {
                    if (file.size > 2 * 1024 * 1024) { alert('Bild zu groß (max 2 MB)'); return; }
                    const fd = new FormData();
                    fd.append('file', file);
                    const res = await fetch('/api/upload/question-image', { method: 'POST', body: fd });
                    if (!res.ok) { alert('Upload fehlgeschlagen'); return; }
                    const { imageUrl } = await res.json() as { imageUrl: string };
                    const newEl: QQSlideElement = { id: eid(), type: 'image', x: Math.max(0, x - 15), y: Math.max(0, y - 15), w: 30, h: 30, zIndex: 5, imageUrl, objectFit: 'contain' };
                    patchTemplate({ ...activeTemplate, elements: [...activeTemplate.elements, newEl] });
                    setSelectedIds([newEl.id]);
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right: accordion panel */}
        <div style={{ width: 270, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.07)', background: '#131c2e', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
            {(['add', 'props', 'layers', 'presets'] as const).map(s => {
              const labels = { add: '+ Hinzufügen', props: '⚙ Eigenschaften', layers: '⬡ Ebenen', presets: '✨ Presets' };
              const isActive = rightSection === s;
              return (
                <button key={s} onClick={() => setRightSection(s)}
                  style={{ flex: 1, padding: '8px 2px', background: isActive ? '#1e293b' : 'transparent', border: 'none', borderBottom: isActive ? '2px solid #3B82F6' : '2px solid transparent', color: isActive ? '#e2e8f0' : '#475569', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: 9, transition: 'all 0.15s' }}>
                  {labels[s]}
                </button>
              );
            })}
          </div>

          {/* Panel content */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {rightSection === 'add' && <EmptyProperties onAdd={addElement} />}

            {rightSection === 'props' && (
              selectedEl
                ? <PropertiesPanel element={selectedEl} onChange={patchElement} onDelete={deleteSelected} onDuplicate={duplicateSelected}
                    onSetAsBackground={url => patchTemplate({ ...activeTemplate, background: `url(${url}) center/cover no-repeat` })} />
                : <div style={{ padding: 16, fontSize: 12, color: '#334155', fontWeight: 700, textAlign: 'center', marginTop: 24 }}>
                    Kein Element ausgewählt.<br />
                    <span style={{ fontSize: 11, color: '#1e293b' }}>Element auf der Folie anklicken.</span>
                  </div>
            )}

            {rightSection === 'presets' && (
              <div style={{ padding: '10px 10px 16px' }}>
                <div style={{ fontSize: 9, fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Design-Presets</div>
                <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, marginBottom: 12, lineHeight: 1.5 }}>
                  Wähle ein fertiges Design als Startpunkt. Dein aktuelles Layout bleibt erhalten — nur Farben &amp; Hintergrund werden angepasst.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {DESIGN_PRESETS.map(preset => (
                    <button key={preset.id}
                      onClick={() => {
                        const based = makeDefault(activeType);
                        const current = activeTemplate.elements.length > 0 ? activeTemplate : based;
                        patchTemplate(applyDesignPreset(current, preset));
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    >
                      {/* Color swatch */}
                      <div style={{ width: 36, height: 28, borderRadius: 6, flexShrink: 0, overflow: 'hidden', background: preset.bg, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 16, height: 4, borderRadius: 2, background: preset.accent, opacity: 0.9 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0' }}>{preset.icon} {preset.label}</div>
                        <div style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>Eingang: {preset.animIn}{preset.animLoop ? ` · Schleife: ${preset.animLoop}` : ''}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 12, padding: '8px 10px', borderRadius: 8, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', fontSize: 11, color: '#A78BFA', fontWeight: 600, lineHeight: 1.5 }}>
                  Tipp: Nach dem Anwenden kannst du alles im Eigenschaften-Tab weiter anpassen.
                </div>
              </div>
            )}

            {rightSection === 'layers' && (
              <div style={{ padding: '6px 6px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <div style={{ padding: '4px 8px 6px', fontSize: 9, fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Ebenen</span>
                  <span style={{ color: '#1e3a5f' }}>{activeTemplate.elements.length}</span>
                </div>
                {[...activeTemplate.elements]
                  .sort((a, b) => (b.zIndex ?? 1) - (a.zIndex ?? 1))
                  .map(el => {
                    const isPh = el.type.startsWith('ph_');
                    const isSelected = selectedIds.includes(el.id);
                    const icon = el.type === 'animatedAvatar' ? '🕺' : isPh ? '⬡' : el.type === 'text' ? '📝' : el.type === 'image' ? '🖼' : '⬛';
                    const label = isPh ? (PH_LABELS[el.type as QQSlideElementType] ?? el.type) : el.type === 'text' ? (el.text?.slice(0, 18) ?? 'Text') : el.type;
                    return (
                      <div key={el.id} className={`qqse-layer-row${isSelected ? ' selected' : ''}`}
                        onClick={() => { setSelectedIds([el.id]); setRightSection('props'); }}>
                        <span style={{ fontSize: 11, flexShrink: 0 }}>{icon}</span>
                        <span style={{ flex: 1, fontSize: 10, color: isSelected ? '#93C5FD' : '#64748b', fontWeight: isSelected ? 800 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                        <span style={{ fontSize: 9, color: '#334155', fontWeight: 700, flexShrink: 0, marginRight: 2 }}>{el.zIndex ?? 1}</span>
                        <button onClick={e => { e.stopPropagation(); changeZ(el.id, 'up'); }} title="Vorne"
                          style={{ padding: '1px 4px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit', lineHeight: 1 }}>↑</button>
                        <button onClick={e => { e.stopPropagation(); changeZ(el.id, 'down'); }} title="Hinten"
                          style={{ padding: '1px 4px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit', lineHeight: 1 }}>↓</button>
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

function SlideCanvas({ template, templateType, bgColor, questions, previewQuestion, selectedIds, editingId, snapLines, onSnapLinesChange, onSelect, onMultiSelect, onClearSelect, onUpdate, onUpdateMulti, onStartEdit, onEndEdit, onDelete, onDuplicate, onDropFile }: {
  template: QQSlideTemplate;
  templateType: QQSlideTemplateType;
  bgColor: string;
  questions?: QQQuestion[];
  previewQuestion?: QQQuestion | null;
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
  onDelete: () => void;
  onDuplicate: () => void;
  onDropFile?: (file: File, x: number, y: number) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasW, setCanvasW] = useState(800);

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

  const mockState = makePreviewState(templateType, questions, previewQuestion ?? undefined);

  return (
    <div ref={canvasRef}
      style={{ width: '100%', maxWidth: '100%', maxHeight: '100%', aspectRatio: `${CANVAS_RATIO}`, position: 'relative', overflow: 'hidden', background: bgColor, borderRadius: 10, boxShadow: '0 0 60px rgba(0,0,0,0.8)', userSelect: 'none' }}
      onMouseDown={e => {
        if (e.target !== e.currentTarget) return;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = ((e.clientX - rect.left) / rect.width) * 100;
        const my = ((e.clientY - rect.top) / rect.height) * 100;
        marqueeRef.current = { startX: mx, startY: my, curX: mx, curY: my };
        onClearSelect();
      }}
      onClick={e => { if (e.target === e.currentTarget) onClearSelect(); }}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
      onDrop={e => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (!file || !file.type.startsWith('image/') || !onDropFile) return;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        onDropFile(file, x, y);
      }}>

      {/* Render all elements (incl. ph_*) with mock data — non-interactive visual layer */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <CustomSlide template={template} previewState={mockState} />
      </div>

      {/* Transparent interactive overlays for drag/select/resize — one per element */}
      {sorted.map(el => (
        <CanvasElement key={el.id} el={el} canvasW={canvasW}
          selected={selectedIds.includes(el.id)}
          editing={editingId === el.id}
          onSelect={(shift) => onSelect(el.id, shift)}
          onDragStart={(e) => {
            e.stopPropagation();
            onSelect(el.id, e.shiftKey);
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
          onDelete={() => { onSelect(el.id, false); onDelete(); }}
          onDuplicate={() => { onSelect(el.id, false); onDuplicate(); }}
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

function CanvasElement({ el, canvasW, selected, editing, onSelect, onDragStart, onResizeStart, onDblClick, onEndEdit, onDelete, onDuplicate }: {
  el: QQSlideElement; canvasW: number; selected: boolean; editing: boolean;
  onSelect: (shift: boolean) => void;
  onDragStart: (e: React.MouseEvent) => void;
  onResizeStart: (e: React.MouseEvent, handle: string) => void;
  onDblClick: () => void;
  onEndEdit: (text: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const isPh = el.type.startsWith('ph_');
  const isAvatar = el.type === 'animatedAvatar';
  const fs = el.fontSize ? `${(el.fontSize / 100) * canvasW}px` : undefined;
  const fontFamily = el.fontFamily;
  const editRef = useRef<HTMLDivElement>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!ctxMenu) return;
    function close() { setCtxMenu(null); }
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    return () => { window.removeEventListener('click', close); window.removeEventListener('contextmenu', close); };
  }, [ctxMenu]);

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

  const label = isPh ? (PH_LABELS[el.type] ?? el.type) : isAvatar ? (el.text ?? '✨') : el.type;

  return (
    <div className="qqse-elem"
      style={{
        position: 'absolute', left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%`,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        zIndex: (el.zIndex ?? 1) + 1000, // always above CustomSlide render layer
        opacity: editing ? 1 : undefined,
        cursor: editing ? 'text' : 'move', boxSizing: 'border-box',
        // Transparent overlay — visual is provided by CustomSlide below
        background: editing ? (el.background ?? 'rgba(13,10,6,0.95)') : 'transparent',
        borderRadius: el.borderRadius != null ? `${el.borderRadius}px` : undefined,
        border: editing ? '2px solid #F59E0B' : selected ? '2px solid #3B82F6' : 'none',
        outline: selected && !editing ? '1.5px dashed rgba(59,130,246,0.6)' : 'none',
        outlineOffset: '2px',
      }}
      onClick={e => { e.stopPropagation(); onSelect(e.shiftKey); }}
      onDoubleClick={e => { e.stopPropagation(); onDblClick(); }}
      onMouseDown={e => { if (!editing) { onDragStart(e); } }}
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onSelect(false); setCtxMenu({ x: e.clientX, y: e.clientY }); }}>

      {/* In-place text editing (only shown when actively editing) */}
      {el.type === 'text' && editing && (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', padding: '2px 6px', boxSizing: 'border-box', justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start' }}>
          <div
            ref={editRef}
            contentEditable
            suppressContentEditableWarning
            style={{ fontSize: fs, fontWeight: el.fontWeight ?? 700, fontStyle: el.fontStyle ?? 'normal', color: el.color ?? '#fff', textAlign: el.textAlign, lineHeight: el.lineHeight ?? 1.3, letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined, wordBreak: 'break-word', width: '100%', outline: 'none', whiteSpace: 'pre-wrap', minHeight: '1em', fontFamily: fontFamily ?? "'Nunito', sans-serif" }}
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

      {/* Resize handles (selected only) */}
      {selected && HANDLES.map(h => (
        <div key={h} className="qqse-handle" style={{ ...HANDLE_STYLE[h] }}
          onMouseDown={e => { e.stopPropagation(); onResizeStart(e, h); }} />
      ))}

      {/* Selected label */}
      {selected && (
        <div style={{ position: 'absolute', bottom: '-18px', left: 0, fontSize: 9, color: '#3B82F6', fontWeight: 700, whiteSpace: 'nowrap', background: '#0f172a', padding: '1px 4px', borderRadius: 3 }}>
          {label} · {Math.round(el.x)},{Math.round(el.y)} · {Math.round(el.w)}×{Math.round(el.h)}
        </div>
      )}

      {/* Context menu */}
      {ctxMenu && (
        <div style={{
          position: 'fixed', left: ctxMenu.x, top: ctxMenu.y, zIndex: 999999,
          background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)', padding: '4px 0', minWidth: 150,
          fontFamily: "'Nunito', sans-serif",
        }} onClick={e => e.stopPropagation()}>
          {[
            { label: '⎘ Duplizieren', action: () => { setCtxMenu(null); onDuplicate(); } },
            { label: '🗑 Löschen', action: () => { setCtxMenu(null); onDelete(); } },
          ].map(item => (
            <button key={item.label} onClick={item.action} style={{
              display: 'block', width: '100%', padding: '7px 14px', background: 'transparent',
              border: 'none', color: '#e2e8f0', fontFamily: 'inherit', fontSize: 12,
              fontWeight: 700, textAlign: 'left', cursor: 'pointer',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >{item.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── PropertiesPanel ───────────────────────────────────────────────────────────
const ANIM_IN_OPTIONS: Array<{ value: QQSlideElement['animIn']; label: string }> = [
  { value: 'none',       label: 'Keiner' },
  { value: 'fadeIn',     label: 'Einblenden' },
  { value: 'fadeUp',     label: 'Von unten einblenden' },
  { value: 'pop',        label: 'Pop (aufploppen)' },
  { value: 'slideLeft',  label: 'Von links schieben' },
  { value: 'slideRight', label: 'Von rechts schieben' },
  { value: 'cardFlip',   label: 'Karte umdrehen' },
  { value: 'bounceIn',   label: 'Reinspringen' },
  { value: 'slotDrop',   label: 'Slot-Machine Drop' },
  { value: 'swingIn',    label: 'Einschwingen' },
  { value: 'typewriter', label: 'Schreibmaschine (Text)' },
];
const ANIM_LOOP_OPTIONS: Array<{ value: QQSlideElement['animLoop']; label: string }> = [
  { value: 'none',   label: 'Keiner' },
  { value: 'pulse',  label: 'Pulsieren' },
  { value: 'bounce', label: 'Hüpfen' },
  { value: 'wiggle', label: 'Wackeln' },
  { value: 'shake',  label: 'Zittern' },
  { value: 'float',  label: 'Schweben' },
];
const FONT_OPTIONS = [
  { value: "'Nunito', sans-serif", label: 'Nunito (Standard)' },
  { value: 'Georgia, serif',       label: 'Georgia (Serif)' },
  { value: 'monospace',            label: 'Monospace' },
  { value: "'Impact', sans-serif", label: 'Impact' },
];
// Avatar/Animation options for animatedAvatar
const AVATAR_OPTIONS = [
  { id: 'avatar1', label: 'Avatar 1', icon: '🧑' },
  { id: 'avatar2', label: 'Avatar 2', icon: '👩' },
  { id: 'avatar3', label: 'Avatar 3', icon: '🧔' },
  { id: 'avatar4', label: 'Avatar 4', icon: '🧑‍🦱' },
];
const ANIM_TYPE_OPTIONS = [
  { value: 'wiggle', label: 'Wackeln' },
  { value: 'walk', label: 'Gehen' },
  { value: 'bounce', label: 'Hüpfen' },
];

function PropertiesPanel({ element: el, onChange, onDelete, onDuplicate, onSetAsBackground }: {
  element: QQSlideElement;
  onChange: (p: Partial<QQSlideElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSetAsBackground?: (url: string) => void;
}) {
  const isPh = el.type.startsWith('ph_');
  const uploadRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const fontFamily = el.fontFamily ?? '';

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload/question-image', { method: 'POST', body: fd });
      if (res.ok) {
        const { imageUrl } = await res.json() as { imageUrl: string };
        onChange({ imageUrl } as Partial<QQSlideElement>);
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
          {isPh ? `[${PH_LABELS[el.type]}]` : el.type === 'text' ? '📝 Text' : el.type === 'image' ? '🖼 Bild' : el.type === 'animatedAvatar' ? '🕺 Avatar' : '⬛ Form'}
        </div>
        <button onClick={onDuplicate} style={{ ...btn('#6366F1', true), padding: '2px 7px', fontSize: 11 }}>⎘</button>
        <button onClick={onDelete} style={{ ...btn('#EF4444', true), padding: '2px 7px', fontSize: 11 }}>✕</button>
      </div>

      {/* Animated Avatar Eigenschaften */}
      {el.type === 'animatedAvatar' && (
        <Section label="Avatar-Eigenschaften">
          <Field label="Avatar">
            <div style={{ display: 'flex', gap: 6 }}>
              {AVATAR_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => onChange({ avatarId: opt.id })} style={{
                  padding: '6px 10px', borderRadius: 7, border: el.avatarId === opt.id ? '2px solid #3B82F6' : '1px solid #64748b', background: el.avatarId === opt.id ? '#3B82F6' : 'rgba(59,130,246,0.06)', color: el.avatarId === opt.id ? '#fff' : '#64748b', fontWeight: 800, fontSize: 18, cursor: 'pointer', fontFamily: 'inherit',
                }}>{opt.icon}</button>
              ))}
            </div>
          </Field>
          <Field label="Animationstyp">
            <select value={el.animType ?? 'wiggle'} onChange={e => onChange({ animType: e.target.value as any })} style={{ ...input, padding: '4px 7px' }}>
              {ANIM_TYPE_OPTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <Field label="Dauer (s)">
              <input type="number" value={el.avatarAnimDuration ?? 1.2} step={0.1} min={0.1} onChange={e => onChange({ avatarAnimDuration: Number(e.target.value) })} style={{ ...input, padding: '4px 7px' }} />
            </Field>
            <Field label="Verzögerung (s)">
              <input type="number" value={el.avatarAnimDelay ?? 0} step={0.1} min={0} onChange={e => onChange({ avatarAnimDelay: Number(e.target.value) })} style={{ ...input, padding: '4px 7px' }} />
            </Field>
          </div>
        </Section>
      )}

      {isPh && (
        <div style={{ padding: '7px 9px', borderRadius: 7, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', fontSize: 11, color: '#8b7cf8', lineHeight: 1.5 }}>
          {PH_STYLE_HINTS[el.type as QQSlideElementType] ?? 'Zeigt Live-Daten im Beamer. Position und Größe sind hier editierbar.'}
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
            <select value={fontFamily} onChange={e => onChange({ fontFamily: e.target.value })} style={{ ...input, padding: '4px 7px' }}>
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
              <button onClick={() => onChange({ fontStyle: el.fontStyle === 'italic' ? 'normal' : 'italic' })} style={{ padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: el.fontStyle === 'italic' ? '#3B82F6' : 'rgba(255,255,255,0.06)', color: el.fontStyle === 'italic' ? '#fff' : '#64748b', fontFamily: 'Georgia, serif', fontSize: 13, fontWeight: 800, fontStyle: 'italic' }}>
                I
              </button>
            </div>
          </Field>
          <div style={{ display: 'flex', gap: 6 }}>
            <Field label="Zeilenabstand">
              <input type="number" value={el.lineHeight ?? 1.3} step={0.1} onChange={e => onChange({ lineHeight: Number(e.target.value) })} style={{ ...input, padding: '4px 7px' }} />
            </Field>
            <Field label="Zeichenabstand">
              <input type="number" value={el.letterSpacing ?? 0} step={0.5} onChange={e => onChange({ letterSpacing: Number(e.target.value) })} style={{ ...input, padding: '4px 7px' }} />
            </Field>
          </div>
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

      {/* ph_options specific */}
      {el.type === 'ph_options' && (
        <Section label="Antwort-Optionen">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <Field label="Spalten">
              <input type="number" value={el.columns ?? ''} min={1} max={5} step={1}
                placeholder="auto"
                onChange={e => onChange({ columns: e.target.value ? Number(e.target.value) : undefined })}
                style={{ ...input, padding: '4px 7px' }} />
            </Field>
            <Field label="Eckenradius (px)">
              <input type="number" value={el.optionRadius ?? 14} min={0} max={50} step={2}
                onChange={e => onChange({ optionRadius: Number(e.target.value) })}
                style={{ ...input, padding: '4px 7px' }} />
            </Field>
          </div>
          <Field label="Farbschema">
            <select value={el.optionColorScheme ?? 'category'} onChange={e => onChange({ optionColorScheme: e.target.value as any })} style={{ ...input, padding: '4px 7px' }}>
              <option value="category">Kategorie (Standard)</option>
              <option value="mono">Einheitlich (Akzentfarbe)</option>
              <option value="dark">Dunkel</option>
            </select>
          </Field>
          {(el.optionColorScheme === 'mono') && (
            <Field label="Akzentfarbe">
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="color" value={el.color ?? '#3B82F6'} onChange={e => onChange({ color: e.target.value })} style={{ width: 30, height: 28, borderRadius: 5, border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }} />
                <input value={el.color ?? '#3B82F6'} onChange={e => onChange({ color: e.target.value })} style={{ ...input, flex: 1, padding: '4px 7px', fontFamily: 'monospace', fontSize: 12 }} />
              </div>
            </Field>
          )}
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
          {el.imageUrl && onSetAsBackground && (
            <button onClick={() => onSetAsBackground(el.imageUrl!)}
              style={{ ...btn('#475569', true), width: '100%', fontSize: 11, padding: '5px 10px', textAlign: 'center' }}>
              🖼 Als Folienhintergrund setzen
            </button>
          )}
        </Section>
      )}

      {/* Animation & Effekte */}
      <Section label="Animation & Effekte">
        <Field label="Eingang">
          <select value={el.animIn ?? 'none'} onChange={e => onChange({ animIn: e.target.value as QQSlideElement['animIn'] })} style={{ ...input, padding: '4px 7px' }}>
            {ANIM_IN_OPTIONS.map(a => <option key={String(a.value)} value={String(a.value)}>{a.label}</option>)}
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
        <Field label="Endlosschleife">
          <select value={el.animLoop ?? 'none'} onChange={e => onChange({ animLoop: e.target.value as QQSlideElement['animLoop'] })} style={{ ...input, padding: '4px 7px' }}>
            {ANIM_LOOP_OPTIONS.map(a => <option key={String(a.value)} value={String(a.value)}>{a.label}</option>)}
          </select>
        </Field>
        {el.animLoop && el.animLoop !== 'none' && (
          <Field label="Schleifendauer (s)">
            <input type="number" value={el.animLoopDuration ?? 2} step={0.1} min={0.2} onChange={e => onChange({ animLoopDuration: Number(e.target.value) })} style={{ ...input, padding: '4px 7px' }} />
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
          {([['text', '📝 Text — statischer Text'], ['image', '🖼 Bild — URL oder hochladen'], ['rect', '⬛ Form — Hintergrund, Overlay'], ['animatedAvatar', '🕺 Avatar — animiert']] as const).map(([t, label]) => (
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
