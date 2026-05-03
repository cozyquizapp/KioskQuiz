// 2026-05-03 — Avatar-Generator v3 „Soft-3D Plastilin"
// Wolf-Referenz-Bild: Karten-Galerie, Pixel-Augen, Kopf in Team-Farbe
// mit innerem Hell/Dunkel-Gradient (Plastilin), Topper (Bommel/Antenne),
// Schulter-Cap, Karten-Glow. Default ist der „Modern-Mascot"-Look.

import { useCallback, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { QQ_AVATARS } from '@shared/quarterQuizTypes';

// ─── Palette: die 8 Team-Farben aus QQ_AVATARS ─────────────────────────────
const PALETTE = QQ_AVATARS.map(a => ({
  id: a.id,
  name: a.label,
  ring: a.color,
  hoodie: a.hoodie,
})) as { id: string; name: string; ring: string; hoodie: string }[];

// ─── Color Helpers (HSL-Roundtrip) ────────────────────────────────────────
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}
function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r = l, g = l, b = l;
  if (s !== 0) {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function adjustColor(hex: string, opts: { sat?: number; light?: number }): string {
  const [h, s, l] = hexToHsl(hex);
  const newS = Math.max(0, Math.min(1, s + (opts.sat ?? 0)));
  const newL = Math.max(0, Math.min(1, l + (opts.light ?? 0)));
  return hslToHex(h, newS, newL);
}

// ─── Feature-Kataloge ──────────────────────────────────────────────────────
const FINISH = [
  { id: 'soft3d', label: 'Soft-3D' },
  { id: 'flat',   label: 'Flat' },
];

const TONE = [
  { id: 'muted',   label: 'Muted' },
  { id: 'vibrant', label: 'Vibrant' },
];

const SHAPE = [
  { id: 'circle',  label: 'Kreis' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'capsule', label: 'Kapsel' },
  { id: 'drop',    label: 'Tropfen' },
  { id: 'hex',     label: 'Hexagon' },
  { id: 'blob',    label: 'Blob' },
  { id: 'pebble',  label: 'Pebble' },
];

const TOPPER = [
  { id: 'none',         label: 'Keine' },
  { id: 'bommel',       label: 'Bommel' },
  { id: 'antenna',      label: 'Antenne' },
  { id: 'antennaBall',  label: 'Antenne-Kugel' },
  { id: 'antennaFlag',  label: 'Antenne-Flagge' },
  { id: 'visor',        label: 'Visor-Maske' },
  { id: 'leaf',         label: 'Blättchen' },
];

const BODY = [
  { id: 'none',         label: 'Keine' },
  { id: 'shoulders',    label: 'Schultern' },
  { id: 'shouldersWide', label: 'Schultern (weit)' },
];

const EARS = [
  { id: 'none',   label: 'Keine' },
  { id: 'round',  label: 'Rund' },
  { id: 'pointy', label: 'Spitz' },
  { id: 'floppy', label: 'Hänge' },
  { id: 'long',   label: 'Lang' },
  { id: 'horns',  label: 'Hörner' },
];

const EYES = [
  { id: 'pixel',     label: 'Pixel' },
  { id: 'pixelTall', label: 'Pixel (lang)' },
  { id: 'line',      label: 'Strich' },
  { id: 'asym',      label: 'Asym' },
  { id: 'micro',     label: 'Mikro' },
  { id: 'happy',     label: 'Glücklich' },
  { id: 'sleepy',    label: 'Verschlafen' },
  { id: 'wide',      label: 'Wach' },
  { id: 'sparkle',   label: 'Sparkle' },
];

const MOUTH = [
  { id: 'none',    label: 'Keiner' },
  { id: 'dot',     label: 'Dot' },
  { id: 'dash',    label: 'Dash' },
  { id: 'flat',    label: 'Flat' },
  { id: 'smirk',   label: 'Smirk' },
  { id: 'smile',   label: 'Lächeln' },
];

const ACCESSORY = [
  { id: 'none',       label: 'Nichts' },
  { id: 'glasses',    label: 'Brille' },
  { id: 'shades',     label: 'Sonnenbrille' },
  { id: 'headphones', label: 'Kopfhörer' },
];

type AvatarConfig = {
  colorIdx: number;
  finish: string;
  tone: string;
  shape: string;
  topper: string;
  body: string;
  ears: string;
  eyes: string;
  mouth: string;
  accessory: string;
};

function defaultConfig(): AvatarConfig {
  return {
    colorIdx: 2,         // Pinguin-Blau
    finish: 'soft3d',
    tone: 'muted',
    shape: 'circle',
    topper: 'bommel',
    body: 'shoulders',
    ears: 'none',
    eyes: 'pixel',
    mouth: 'none',
    accessory: 'none',
  };
}

function randomConfig(): AvatarConfig {
  const pick = <T extends { id: string }>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)].id;
  return {
    colorIdx: Math.floor(Math.random() * PALETTE.length),
    finish: pick(FINISH),
    tone: pick(TONE),
    shape: pick(SHAPE),
    topper: pick(TOPPER),
    body: pick(BODY),
    ears: pick(EARS),
    eyes: pick(EYES),
    mouth: pick(MOUTH),
    accessory: pick(ACCESSORY),
  };
}

// ─── SVG-Renderer ──────────────────────────────────────────────────────────
// Coordinate system: 200x200, Kopf-Bounding ~ Center (100, 100), R≈58.
// Bei finish=soft3d: Karten-Hintergrund kommt vom umgebenden div, das SVG
// rendert nur den Avatar (Kopf + Topper + Body) auf transparentem Grund.
// Bei finish=flat: voller Ring-Hintergrund (legacy v2-Look).
function AvatarSVG({ cfg, size = 200 }: { cfg: AvatarConfig; size?: number }) {
  const c = PALETTE[cfg.colorIdx];

  const ring = cfg.tone === 'muted'
    ? adjustColor(c.ring, { sat: -0.18, light: -0.04 })
    : c.ring;

  const isSoft = cfg.finish === 'soft3d';

  // Soft-3D Farbpalette
  const lightTint = adjustColor(ring, { light: +0.16 });
  const darkTint  = adjustColor(ring, { light: -0.18 });
  const veryDark  = adjustColor(ring, { sat: -0.05, light: -0.36 });

  // IDs müssen pro Render eindeutig sein, damit Galerie-Karten nicht den
  // gleichen Gradient teilen (sonst zeigt Capybara den Pinguin-Verlauf).
  const uid = useMemo(() => Math.random().toString(36).slice(2, 9), []);
  const headGradId   = `head-${uid}`;
  const bodyGradId   = `body-${uid}`;
  const visorGradId  = `visor-${uid}`;

  // Feature-Inks
  const featureInk = isSoft ? veryDark : adjustColor(ring, { sat: -0.1, light: -0.42 });

  // Flat-Modus Skin
  const skin      = '#F7EFE0';
  const skinShade = adjustColor(skin, { light: -0.07 });
  const flatStroke = adjustColor(ring, { sat: -0.1, light: -0.42 });

  // Head-Fill: bei Soft-3D ist es der Gradient, bei Flat das skin-Off-White
  const headFill = isSoft ? `url(#${headGradId})` : skin;
  const headStroke = isSoft ? null : flatStroke;
  const headStrokeWidth = isSoft ? 0 : 2;

  // Body-Fill: bei Soft-3D Gradient, bei Flat eine etwas dunklere Ring-Tönung
  const bodyFill = isSoft ? `url(#${bodyGradId})` : ring;

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
      <defs>
        {/* Soft-3D: heller Highlight oben-links → Mid Ring → dunklerer Schatten unten-rechts */}
        <radialGradient id={headGradId} cx="32%" cy="26%" r="82%">
          <stop offset="0%"   stopColor={lightTint} />
          <stop offset="55%"  stopColor={ring} />
          <stop offset="100%" stopColor={darkTint} />
        </radialGradient>
        <linearGradient id={bodyGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={ring} />
          <stop offset="100%" stopColor={darkTint} />
        </linearGradient>
        <linearGradient id={visorGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1a1614" />
          <stop offset="100%" stopColor="#0d0b0a" />
        </linearGradient>
      </defs>

      {/* Body / Schulter-Cap (geclipped am unteren Rand) */}
      <Body type={cfg.body} fill={bodyFill} stroke={headStroke} strokeWidth={headStrokeWidth} />

      {/* Topper hinter dem Kopf (Bommel/Antenne ragt von hinten raus) */}
      <TopperBack type={cfg.topper} fill={headFill} stroke={headStroke} strokeWidth={headStrokeWidth} ink={featureInk} />

      {/* Ohren */}
      <Ears type={cfg.ears} fill={isSoft ? darkTint : skinShade} stroke={headStroke} strokeWidth={headStrokeWidth} />

      {/* Kopf-Silhouette */}
      <HeadShape type={cfg.shape} fill={headFill} stroke={headStroke} strokeWidth={headStrokeWidth} />

      {/* Visor (deckt Augen-Bereich ab — ersetzt klassische Augen) */}
      {cfg.topper === 'visor' ? (
        <Visor gradId={visorGradId} />
      ) : (
        <>
          <Eyes type={cfg.eyes} ink={featureInk} />
          <Mouth type={cfg.mouth} ink={featureInk} />
        </>
      )}

      {/* Accessoire */}
      <Accessory type={cfg.accessory} ink={featureInk} />

      {/* Topper vor dem Kopf (z.B. Antennen-Strich) */}
      <TopperFront type={cfg.topper} ink={featureInk} />
    </svg>
  );
}

// ─── HeadShape ─────────────────────────────────────────────────────────────
function HeadShape({
  type, fill, stroke, strokeWidth,
}: { type: string; fill: string; stroke: string | null; strokeWidth: number }) {
  const sp = stroke ? { stroke, strokeWidth, strokeLinejoin: 'round' as const } : { stroke: 'none' };
  switch (type) {
    case 'rounded':
      return <rect x="44" y="46" width="112" height="116" rx="32" ry="32" fill={fill} {...sp} />;
    case 'capsule':
      return <rect x="50" y="44" width="100" height="124" rx="50" ry="50" fill={fill} {...sp} />;
    case 'drop':
      // Tropfen: oben spitz, unten breit — wie Team 3 im Referenzbild
      return (
        <path
          d="M 100 38 C 130 60 150 96 150 124 C 150 158 124 174 100 174 C 76 174 50 158 50 124 C 50 96 70 60 100 38 Z"
          fill={fill}
          {...sp}
        />
      );
    case 'hex':
      return <polygon points="100,42 152,72 152,140 100,170 48,140 48,72" fill={fill} {...sp} />;
    case 'blob':
      return (
        <path
          d="M 100 42 C 148 42 158 76 156 114 C 154 150 132 168 100 168 C 70 168 48 154 44 116 C 40 76 52 42 100 42 Z"
          fill={fill}
          {...sp}
        />
      );
    case 'pebble':
      return <ellipse cx="100" cy="106" rx="56" ry="62" fill={fill} {...sp} />;
    case 'circle':
    default:
      return <circle cx="100" cy="104" r="58" fill={fill} {...sp} />;
  }
}

// ─── Body / Schulter-Cap (unten am SVG-Rand abgeschnitten) ─────────────────
function Body({
  type, fill, stroke, strokeWidth,
}: { type: string; fill: string; stroke: string | null; strokeWidth: number }) {
  if (type === 'none') return null;
  const sp = stroke ? { stroke, strokeWidth, strokeLinejoin: 'round' as const } : { stroke: 'none' };
  switch (type) {
    case 'shoulders':
      return (
        <path
          d="M 60 168 Q 60 152 100 150 Q 140 152 140 168 L 140 200 L 60 200 Z"
          fill={fill}
          {...sp}
        />
      );
    case 'shouldersWide':
      return (
        <path
          d="M 44 172 Q 44 154 100 150 Q 156 154 156 172 L 156 200 L 44 200 Z"
          fill={fill}
          {...sp}
        />
      );
    default:
      return null;
  }
}

// ─── Topper (Aufsatz oben) ─────────────────────────────────────────────────
// TopperBack: Teile, die hinter dem Kopf liegen (Bommel-Halbkugel teilweise)
// TopperFront: Teile, die über dem Kopf liegen (Antennen-Linie, Flagge)
function TopperBack({
  type, fill, stroke, strokeWidth, ink,
}: { type: string; fill: string; stroke: string | null; strokeWidth: number; ink: string }) {
  const sp = stroke ? { stroke, strokeWidth, strokeLinejoin: 'round' as const } : { stroke: 'none' };
  switch (type) {
    case 'bommel':
      // Kleine Halbkugel auf dem Kopf — sitzt hinter dem Kopf, schaut oben raus
      return <circle cx="100" cy="40" r="14" fill={fill} {...sp} />;
    case 'leaf':
      // kleines Blättchen
      return (
        <path d="M 100 24 Q 114 30 110 44 Q 102 42 96 36 Q 94 28 100 24 Z" fill={fill} {...sp} />
      );
    case 'antennaBall':
      // Kugel oben am Antennen-Ende (Linie kommt im Front-Layer)
      return <circle cx="100" cy="22" r="7" fill={fill} {...sp} />;
    case 'antennaFlag':
      // dreieckige Fähnchen am Ende der Antenne
      return (
        <polygon points="100,18 122,26 100,32" fill={fill} stroke={ink} strokeWidth="1.2" />
      );
    case 'visor':
    case 'antenna':
    case 'none':
    default:
      return null;
  }
}

function TopperFront({ type, ink }: { type: string; ink: string }) {
  switch (type) {
    case 'antenna':
      return <line x1="100" y1="46" x2="100" y2="22" stroke={ink} strokeWidth="3" strokeLinecap="round" />;
    case 'antennaBall':
      return <line x1="100" y1="46" x2="100" y2="30" stroke={ink} strokeWidth="3" strokeLinecap="round" />;
    case 'antennaFlag':
      return <line x1="100" y1="46" x2="100" y2="20" stroke={ink} strokeWidth="3" strokeLinecap="round" />;
    default:
      return null;
  }
}

// ─── Visor-Maske (ersetzt Augen, Team-1-Look aus dem Bild) ────────────────
function Visor({ gradId }: { gradId: string }) {
  return (
    <>
      <rect x="50" y="86" width="100" height="34" rx="17" ry="17" fill={`url(#${gradId})`} />
      {/* Zwei kleine helle Pixel-Augen im Visor */}
      <rect x="76"  y="98" width="6" height="10" rx="3" fill="#fff" opacity="0.95" />
      <rect x="118" y="98" width="6" height="10" rx="3" fill="#fff" opacity="0.95" />
    </>
  );
}

// ─── Ears ──────────────────────────────────────────────────────────────────
function Ears({
  type, fill, stroke, strokeWidth,
}: { type: string; fill: string; stroke: string | null; strokeWidth: number }) {
  const sp = stroke ? { stroke, strokeWidth, strokeLinejoin: 'round' as const } : { stroke: 'none' };
  switch (type) {
    case 'round':
      return (
        <>
          <circle cx="56"  cy="62" r="18" fill={fill} {...sp} />
          <circle cx="144" cy="62" r="18" fill={fill} {...sp} />
        </>
      );
    case 'pointy':
      return (
        <>
          <polygon points="46,72 70,30 86,68"     fill={fill} {...sp} />
          <polygon points="154,72 130,30 114,68"  fill={fill} {...sp} />
        </>
      );
    case 'floppy':
      return (
        <>
          <ellipse cx="50"  cy="92" rx="14" ry="32" fill={fill} {...sp} />
          <ellipse cx="150" cy="92" rx="14" ry="32" fill={fill} {...sp} />
        </>
      );
    case 'long':
      return (
        <>
          <ellipse cx="76"  cy="38" rx="10" ry="32" fill={fill} {...sp} />
          <ellipse cx="124" cy="38" rx="10" ry="32" fill={fill} {...sp} />
        </>
      );
    case 'horns':
      return (
        <>
          <path d="M70 58 Q56 38 64 30 Q72 36 78 56 Z"     fill="#EFD9A6" {...sp} />
          <path d="M130 58 Q144 38 136 30 Q128 36 122 56 Z" fill="#EFD9A6" {...sp} />
        </>
      );
    case 'none':
    default:
      return null;
  }
}

// ─── Eyes ──────────────────────────────────────────────────────────────────
function Eyes({ type, ink }: { type: string; ink: string }) {
  const lx = 80, rx = 120, y = 108;
  const stroke = (w = 3) => ({ stroke: ink, strokeWidth: w, strokeLinecap: 'round' as const, fill: 'none' });

  switch (type) {
    case 'pixel':
      // Vertikale Capsules — DER Look aus dem Referenz-Bild
      return (
        <>
          <rect x={lx - 3.5} y={y - 7} width="7" height="14" rx="3.5" fill={ink} />
          <rect x={rx - 3.5} y={y - 7} width="7" height="14" rx="3.5" fill={ink} />
        </>
      );
    case 'pixelTall':
      return (
        <>
          <rect x={lx - 3} y={y - 10} width="6" height="20" rx="3" fill={ink} />
          <rect x={rx - 3} y={y - 10} width="6" height="20" rx="3" fill={ink} />
        </>
      );
    case 'line':
      return (
        <>
          <line x1={lx - 7} y1={y} x2={lx + 7} y2={y} {...stroke(3.2)} />
          <line x1={rx - 7} y1={y} x2={rx + 7} y2={y} {...stroke(3.2)} />
        </>
      );
    case 'asym':
      return (
        <>
          <line x1={lx - 7} y1={y} x2={lx + 7} y2={y} {...stroke(3)} />
          <circle cx={rx} cy={y} r="2.6" fill={ink} />
        </>
      );
    case 'micro':
      return (
        <>
          <circle cx={lx} cy={y} r="2.6" fill={ink} />
          <circle cx={rx} cy={y} r="2.6" fill={ink} />
        </>
      );
    case 'happy':
      return (
        <>
          <path d={`M${lx - 7} ${y + 2} Q${lx} ${y - 5} ${lx + 7} ${y + 2}`} {...stroke(3.2)} />
          <path d={`M${rx - 7} ${y + 2} Q${rx} ${y - 5} ${rx + 7} ${y + 2}`} {...stroke(3.2)} />
        </>
      );
    case 'sleepy':
      return (
        <>
          <path d={`M${lx - 7} ${y - 2} Q${lx} ${y + 4} ${lx + 7} ${y - 2}`} {...stroke(3.2)} />
          <path d={`M${rx - 7} ${y - 2} Q${rx} ${y + 4} ${rx + 7} ${y - 2}`} {...stroke(3.2)} />
        </>
      );
    case 'wide':
      return (
        <>
          <circle cx={lx} cy={y} r="7" fill="#fff" stroke={ink} strokeWidth="2" />
          <circle cx={rx} cy={y} r="7" fill="#fff" stroke={ink} strokeWidth="2" />
          <circle cx={lx} cy={y + 1} r="3" fill={ink} />
          <circle cx={rx} cy={y + 1} r="3" fill={ink} />
        </>
      );
    case 'sparkle':
      return (
        <>
          <circle cx={lx} cy={y} r="5" fill={ink} />
          <circle cx={rx} cy={y} r="5" fill={ink} />
          <circle cx={lx - 1.5} cy={y - 2} r="1.6" fill="#fff" />
          <circle cx={rx - 1.5} cy={y - 2} r="1.6" fill="#fff" />
        </>
      );
    default:
      return null;
  }
}

// ─── Mouth ─────────────────────────────────────────────────────────────────
function Mouth({ type, ink }: { type: string; ink: string }) {
  const x = 100, y = 134;
  const stroke = (w = 2.6) => ({ stroke: ink, strokeWidth: w, strokeLinecap: 'round' as const, fill: 'none' });

  switch (type) {
    case 'none':
      return null;
    case 'dot':
      return <circle cx={x} cy={y} r="2.2" fill={ink} />;
    case 'dash':
      return <line x1={x - 6} y1={y} x2={x + 6} y2={y} {...stroke(2.6)} />;
    case 'flat':
      return <line x1={x - 9} y1={y} x2={x + 9} y2={y} {...stroke(2.6)} />;
    case 'smirk':
      return <path d={`M${x - 8} ${y + 1} Q${x - 1} ${y + 5} ${x + 9} ${y - 2}`} {...stroke(2.8)} />;
    case 'smile':
      return <path d={`M${x - 9} ${y - 1} Q${x} ${y + 5} ${x + 9} ${y - 1}`} {...stroke(2.6)} />;
    default:
      return null;
  }
}

// ─── Accessory ─────────────────────────────────────────────────────────────
function Accessory({ type, ink }: { type: string; ink: string }) {
  switch (type) {
    case 'glasses':
      return (
        <>
          <circle cx="80"  cy="108" r="13" fill="none" stroke={ink} strokeWidth="2.4" />
          <circle cx="120" cy="108" r="13" fill="none" stroke={ink} strokeWidth="2.4" />
          <line x1="93"  y1="108" x2="107" y2="108" stroke={ink} strokeWidth="2.4" />
        </>
      );
    case 'shades':
      return (
        <>
          <rect x="64"  y="98" width="32" height="18" rx="4" fill={ink} />
          <rect x="104" y="98" width="32" height="18" rx="4" fill={ink} />
          <line x1="96"  y1="107" x2="104" y2="107" stroke={ink} strokeWidth="2.4" />
        </>
      );
    case 'headphones':
      return (
        <>
          <path d="M44 100 Q44 50 100 50 Q156 50 156 100" fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" />
          <rect x="36"  y="92" width="20" height="32" rx="6" fill={ink} />
          <rect x="144" y="92" width="20" height="32" rx="6" fill={ink} />
        </>
      );
    case 'none':
    default:
      return null;
  }
}

// ─── Karten-Wrapper (Galerie-Look aus dem Referenz-Bild) ───────────────────
function AvatarCard({
  cfg, label, size = 200, onClick, active,
}: {
  cfg: AvatarConfig;
  label?: string;
  size?: number;
  onClick?: () => void;
  active?: boolean;
}) {
  const c = PALETTE[cfg.colorIdx];
  const ring = cfg.tone === 'muted'
    ? adjustColor(c.ring, { sat: -0.18, light: -0.04 })
    : c.ring;
  const cardBg = adjustColor(ring, { sat: -0.2, light: -0.42 });
  const labelColor = adjustColor(ring, { light: +0.05 });

  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? ('button' as const) : undefined}
      onClick={onClick}
      style={{
        position: 'relative',
        borderRadius: 22,
        background: `radial-gradient(ellipse 60% 55% at 50% 42%, ${ring}55 0%, ${cardBg} 70%, #0a0a0a 100%)`,
        border: active
          ? `2px solid ${ring}`
          : '1px solid rgba(255,255,255,0.05)',
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        aspectRatio: '3 / 4',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s, transform 0.15s',
        overflow: 'hidden',
        fontFamily: 'inherit',
      }}
    >
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginTop: 4,
      }}>
        <AvatarSVG cfg={cfg} size={size} />
      </div>
      {label && (
        <div style={{
          marginTop: 6,
          fontSize: 13,
          fontWeight: 900,
          letterSpacing: '0.12em',
          color: labelColor,
          textTransform: 'uppercase',
        }}>
          {label}
        </div>
      )}
    </Tag>
  );
}

// ─── UI-Bausteine ──────────────────────────────────────────────────────────
function ChipRow<T extends { id: string; label: string }>({
  options, value, onChange, accent,
}: { options: T[]; value: string; onChange: (id: string) => void; accent: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(o => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            style={{
              padding: '7px 12px',
              borderRadius: 999,
              border: `1px solid ${active ? accent : 'rgba(255,255,255,0.10)'}`,
              background: active ? `${accent}22` : 'rgba(255,255,255,0.03)',
              color: active ? '#f8fafc' : '#cbd5e1',
              fontSize: 12,
              fontWeight: active ? 800 : 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 11, fontWeight: 800, color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: 8,
      }}>{label}</div>
      {children}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────
const QQAvatarGeneratorPage = () => {
  const [cfg, setCfg] = useState<AvatarConfig>(defaultConfig);
  const svgRef = useRef<HTMLDivElement>(null);
  const accent = PALETTE[cfg.colorIdx].ring;

  const setField = <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) =>
    setCfg(prev => ({ ...prev, [key]: value }));

  const shuffle = useCallback(() => setCfg(randomConfig()), []);
  const reset   = useCallback(() => setCfg(defaultConfig()), []);

  const downloadPNG = useCallback(async () => {
    const node = svgRef.current?.querySelector('svg');
    if (!node) return;
    const xml = new XMLSerializer().serializeToString(node);
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    const dataUri = `data:image/svg+xml;base64,${svg64}`;
    const img = new Image();
    img.onload = () => {
      const size = 1024;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, size, size);
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `cozy-avatar-${PALETTE[cfg.colorIdx].id}-${Date.now()}.png`;
      a.click();
    };
    img.src = dataUri;
  }, [cfg.colorIdx]);

  // 8 Karten in jeder Team-Farbe (mit der aktuellen Konfig sonst)
  const gallery = useMemo(
    () => PALETTE.map((_, i) => ({ ...cfg, colorIdx: i })),
    [cfg],
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: '#e2e8f0',
      fontFamily: 'var(--font)',
      padding: '0 0 80px',
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '22px 28px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <Link to="/alt/menu" style={{
          fontSize: 13, color: '#64748b', textDecoration: 'none',
          padding: '6px 12px', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.08)',
        }}>← Menü</Link>
        <div>
          <div style={{ fontWeight: 900, fontSize: 22, color: '#f8fafc', lineHeight: 1.1 }}>
            Avatar-Generator
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
            Soft-3D-Plastilin · 8 CozyQuiz-Team-Farben · Spielwiese
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '24px',
        display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24,
      }}>
        {/* ─── Editor-Spalte ─────────────────────────────────────── */}
        <div style={{
          background: 'rgba(255,255,255,0.025)',
          border: `1px solid ${accent}30`,
          borderRadius: 18,
          padding: 20,
          alignSelf: 'start',
          position: 'sticky',
          top: 16,
        }}>
          <div ref={svgRef} style={{ marginBottom: 14 }}>
            <AvatarCard cfg={cfg} label={`TEAM ${cfg.colorIdx + 1}`} size={260} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button
              type="button"
              onClick={shuffle}
              style={{
                flex: 1, padding: '11px 14px', borderRadius: 12,
                border: `1px solid ${accent}55`, background: `${accent}22`,
                color: '#f8fafc', fontWeight: 800, fontSize: 14,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              🎲 Würfeln
            </button>
            <button
              type="button"
              onClick={reset}
              title="Auf Soft-3D-Default zurücksetzen"
              style={{
                padding: '11px 14px', borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.04)',
                color: '#cbd5e1', fontWeight: 700, fontSize: 13,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ↺
            </button>
            <button
              type="button"
              onClick={downloadPNG}
              style={{
                flex: 1, padding: '11px 14px', borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)',
                color: '#f8fafc', fontWeight: 800, fontSize: 14,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ⬇ PNG
            </button>
          </div>

          <Field label="Team-Farbe">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PALETTE.map((p, i) => {
                const active = i === cfg.colorIdx;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setField('colorIdx', i)}
                    title={`Team ${i + 1} · ${p.name}`}
                    style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: p.ring,
                      border: active ? '3px solid #fff' : '2px solid rgba(255,255,255,0.10)',
                      boxShadow: active ? `0 0 0 2px ${p.ring}, 0 4px 10px ${p.ring}55` : 'none',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  />
                );
              })}
            </div>
          </Field>
        </div>

        {/* ─── Controls + Galerie ───────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Galerie 4×2 wie das Referenz-Bild */}
          <div style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 18,
            padding: 18,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 800, color: '#94a3b8',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              marginBottom: 12,
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            }}>
              <span>Galerie · alle 8 Teams</span>
              <span style={{ color: '#475569', fontWeight: 600, letterSpacing: '0.04em' }}>
                Klick = Farbe wählen
              </span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 10,
            }}>
              {gallery.map((g, i) => (
                <AvatarCard
                  key={i}
                  cfg={g}
                  label={`TEAM ${i + 1}`}
                  size={140}
                  active={i === cfg.colorIdx}
                  onClick={() => setField('colorIdx', i)}
                />
              ))}
            </div>
          </div>

          {/* Feature-Controls */}
          <div style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 18,
            padding: 22,
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 18,
            }}>
              <div>
                <Field label="Finish">
                  <ChipRow options={FINISH} value={cfg.finish} onChange={v => setField('finish', v)} accent={accent} />
                </Field>
                <Field label="Tone">
                  <ChipRow options={TONE} value={cfg.tone} onChange={v => setField('tone', v)} accent={accent} />
                </Field>
                <Field label="Form">
                  <ChipRow options={SHAPE} value={cfg.shape} onChange={v => setField('shape', v)} accent={accent} />
                </Field>
                <Field label="Topper">
                  <ChipRow options={TOPPER} value={cfg.topper} onChange={v => setField('topper', v)} accent={accent} />
                </Field>
                <Field label="Body">
                  <ChipRow options={BODY} value={cfg.body} onChange={v => setField('body', v)} accent={accent} />
                </Field>
              </div>
              <div>
                <Field label="Augen">
                  <ChipRow options={EYES} value={cfg.eyes} onChange={v => setField('eyes', v)} accent={accent} />
                </Field>
                <Field label="Mund">
                  <ChipRow options={MOUTH} value={cfg.mouth} onChange={v => setField('mouth', v)} accent={accent} />
                </Field>
                <Field label="Ohren">
                  <ChipRow options={EARS} value={cfg.ears} onChange={v => setField('ears', v)} accent={accent} />
                </Field>
                <Field label="Accessoire">
                  <ChipRow options={ACCESSORY} value={cfg.accessory} onChange={v => setField('accessory', v)} accent={accent} />
                </Field>
              </div>
            </div>

            <div style={{
              marginTop: 4, padding: '10px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.08)',
              fontSize: 11, color: '#64748b', lineHeight: 1.5,
            }}>
              Default: <strong style={{ color: '#cbd5e1' }}>Soft-3D · Kreis · Bommel · Schultern · Pixel-Augen · kein Mund</strong> — der Mascot-Look. Visor ersetzt automatisch Augen + Mund.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QQAvatarGeneratorPage;
