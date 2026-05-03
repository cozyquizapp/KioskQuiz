// 2026-05-03 — Avatar-Generator Spielwiese (v2 „less cute, more design")
// Wolf-Feedback: Punktaugen + Smiley + schwarze Outline = Baby-Vibe.
// Fixes: getintete Outline (statt schwarz), Strich-Augen als Default,
// Dash/Dot-Mund, Shape-Optionen jenseits Tier-Kreis, Muted-Tone-Toggle.

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

// ─── Color Helpers (HSL-Roundtrip für Desaturieren / Abdunkeln) ───────────
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

// ─── Feature-Kataloge (alles SVG, keine externen Assets) ───────────────────
const TONE = [
  { id: 'muted',   label: 'Muted' },
  { id: 'vibrant', label: 'Vibrant' },
];

const SHAPE = [
  { id: 'circle',  label: 'Kreis' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'hex',     label: 'Hexagon' },
  { id: 'blob',    label: 'Blob' },
  { id: 'pebble',  label: 'Pebble' },
];

const OUTLINE = [
  { id: 'none',    label: 'Keine' },
  { id: 'tinted',  label: 'Getintet' },
  { id: 'soft',    label: 'Soft Grau' },
];

const EARS = [
  { id: 'none',   label: 'Keine' },
  { id: 'round',  label: 'Rund' },
  { id: 'pointy', label: 'Spitz' },
  { id: 'floppy', label: 'Hänge' },
  { id: 'long',   label: 'Lang' },
  { id: 'horns',  label: 'Hörner' },
  { id: 'beak',   label: 'Schnabel' },
];

const EYES = [
  { id: 'line',    label: 'Strich' },
  { id: 'asym',    label: 'Asym' },
  { id: 'micro',   label: 'Mikro' },
  { id: 'happy',   label: 'Glücklich' },
  { id: 'sleepy',  label: 'Verschlafen' },
  { id: 'wide',    label: 'Wach' },
  { id: 'sparkle', label: 'Sparkle' },
  { id: 'dots',    label: 'Punkt' },
];

const MOUTH = [
  { id: 'dash',    label: 'Dash' },
  { id: 'dot',     label: 'Dot' },
  { id: 'flat',    label: 'Flat' },
  { id: 'smirk',   label: 'Smirk' },
  { id: 'smile',   label: 'Lächeln' },
  { id: 'open',    label: 'Offen' },
  { id: 'o',       label: 'O' },
];

const ACCESSORY = [
  { id: 'none',       label: 'Nichts' },
  { id: 'glasses',    label: 'Brille' },
  { id: 'shades',     label: 'Sonnenbrille' },
  { id: 'headphones', label: 'Kopfhörer' },
  { id: 'crown',      label: 'Krone' },
  { id: 'bowtie',     label: 'Fliege' },
  { id: 'party',      label: 'Partyhut' },
  { id: 'flower',     label: 'Blume' },
];

const PATTERN = [
  { id: 'solid',  label: 'Einfarbig' },
  { id: 'ring',   label: 'Ring' },
  { id: 'dots',   label: 'Punkte' },
  { id: 'rays',   label: 'Strahlen' },
];

type AvatarConfig = {
  colorIdx: number;
  tone: string;
  shape: string;
  outline: string;
  ears: string;
  eyes: string;
  mouth: string;
  accessory: string;
  pattern: string;
};

function defaultConfig(): AvatarConfig {
  return {
    colorIdx: 2,         // Pinguin-Blau — ruhiger Default
    tone: 'muted',
    shape: 'circle',
    outline: 'tinted',
    ears: 'none',
    eyes: 'line',
    mouth: 'dash',
    accessory: 'none',
    pattern: 'solid',
  };
}

function randomConfig(): AvatarConfig {
  const pick = <T extends { id: string }>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)].id;
  return {
    colorIdx: Math.floor(Math.random() * PALETTE.length),
    tone: pick(TONE),
    shape: pick(SHAPE),
    outline: pick(OUTLINE),
    ears: pick(EARS),
    eyes: pick(EYES),
    mouth: pick(MOUTH),
    accessory: pick(ACCESSORY),
    pattern: pick(PATTERN),
  };
}

// ─── SVG-Renderer ──────────────────────────────────────────────────────────
// Coordinate system: 200x200, Kopf-Bounding ~ Center (100, 106), R≈58.
function AvatarSVG({ cfg, size = 200 }: { cfg: AvatarConfig; size?: number }) {
  const c = PALETTE[cfg.colorIdx];

  // Tone-Anpassung: muted = etwas weniger Sättigung + minimal dunkler
  const ring = cfg.tone === 'muted'
    ? adjustColor(c.ring, { sat: -0.18, light: -0.04 })
    : c.ring;
  const hoodie = cfg.tone === 'muted'
    ? adjustColor(c.hoodie, { sat: -0.18, light: -0.04 })
    : c.hoodie;

  // Skin = warm off-white, getöntes Inneres
  const skin = '#F7EFE0';
  const skinShade = adjustColor(skin, { light: -0.07 });

  // Outline-Logik: getintet = sehr dunkle Variante des Rings, soft = Neutral-Grau
  const inkTinted = adjustColor(ring, { sat: -0.1, light: -0.42 });
  const inkSoft = '#332e29';
  const featureInk = cfg.outline === 'soft' ? inkSoft : inkTinted;
  const bodyStroke = cfg.outline === 'none' ? null : featureInk;
  const bodyStrokeWidth = cfg.outline === 'none' ? 0 : 2;

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id="rays" cx="50%" cy="50%" r="60%">
          <stop offset="0%"   stopColor={ring} stopOpacity="0.0" />
          <stop offset="100%" stopColor={ring} stopOpacity="0.45" />
        </radialGradient>
        <pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="7" r="1.6" fill="#ffffff" opacity="0.32" />
        </pattern>
      </defs>

      {/* Hintergrund */}
      <circle cx="100" cy="100" r="100" fill={ring} />
      {cfg.pattern === 'ring' && (
        <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="2.5" />
      )}
      {cfg.pattern === 'dots' && <circle cx="100" cy="100" r="100" fill="url(#dots)" />}
      {cfg.pattern === 'rays' && <circle cx="100" cy="100" r="100" fill="url(#rays)" />}

      {/* Ohren (hinter dem Kopf) */}
      <Ears type={cfg.ears} skinShade={skinShade} stroke={bodyStroke} strokeWidth={bodyStrokeWidth} />

      {/* Kopf-Silhouette */}
      <HeadShape type={cfg.shape} fill={skin} stroke={bodyStroke} strokeWidth={bodyStrokeWidth} />

      {/* Augen */}
      <Eyes type={cfg.eyes} ink={featureInk} />

      {/* Mund */}
      <Mouth type={cfg.mouth} ink={featureInk} />

      {/* Accessoire */}
      <Accessory type={cfg.accessory} hoodie={hoodie} ink={featureInk} />
    </svg>
  );
}

// ─── HeadShape ─────────────────────────────────────────────────────────────
function HeadShape({
  type, fill, stroke, strokeWidth,
}: { type: string; fill: string; stroke: string | null; strokeWidth: number }) {
  const strokeProps = stroke
    ? { stroke, strokeWidth, strokeLinejoin: 'round' as const }
    : { stroke: 'none' };
  switch (type) {
    case 'rounded':
      return <rect x="42" y="48" width="116" height="116" rx="32" ry="32" fill={fill} {...strokeProps} />;
    case 'hex':
      return <polygon points="100,46 152,76 152,136 100,166 48,136 48,76" fill={fill} {...strokeProps} />;
    case 'blob':
      return (
        <path
          d="M 100 46 C 148 46 158 78 156 114 C 154 150 132 168 100 168 C 70 168 48 154 44 118 C 40 80 52 46 100 46 Z"
          fill={fill}
          {...strokeProps}
        />
      );
    case 'pebble':
      return <ellipse cx="100" cy="108" rx="56" ry="62" fill={fill} {...strokeProps} />;
    case 'circle':
    default:
      return <circle cx="100" cy="106" r="58" fill={fill} {...strokeProps} />;
  }
}

// ─── Ears ─────────────────────────────────────────────────────────────────
function Ears({
  type, skinShade, stroke, strokeWidth,
}: { type: string; skinShade: string; stroke: string | null; strokeWidth: number }) {
  const sp = stroke
    ? { stroke, strokeWidth, strokeLinejoin: 'round' as const }
    : { stroke: 'none' };
  switch (type) {
    case 'round':
      return (
        <>
          <circle cx="56"  cy="62" r="18" fill={skinShade} {...sp} />
          <circle cx="144" cy="62" r="18" fill={skinShade} {...sp} />
        </>
      );
    case 'pointy':
      return (
        <>
          <polygon points="46,72 70,30 86,68"     fill={skinShade} {...sp} />
          <polygon points="154,72 130,30 114,68"  fill={skinShade} {...sp} />
        </>
      );
    case 'floppy':
      return (
        <>
          <ellipse cx="50"  cy="92" rx="14" ry="32" fill={skinShade} {...sp} />
          <ellipse cx="150" cy="92" rx="14" ry="32" fill={skinShade} {...sp} />
        </>
      );
    case 'long':
      return (
        <>
          <ellipse cx="76"  cy="38" rx="10" ry="32" fill={skinShade} {...sp} />
          <ellipse cx="124" cy="38" rx="10" ry="32" fill={skinShade} {...sp} />
        </>
      );
    case 'horns':
      return (
        <>
          <path d="M70 58 Q56 38 64 30 Q72 36 78 56 Z"     fill="#EFD9A6" {...sp} />
          <path d="M130 58 Q144 38 136 30 Q128 36 122 56 Z" fill="#EFD9A6" {...sp} />
        </>
      );
    case 'beak':
      return <polygon points="100,98 84,118 116,118" fill="#E89A2C" {...sp} />;
    case 'none':
    default:
      return null;
  }
}

// ─── Eyes (modernisiert: Striche + asym + mikro statt Smiley-Punkte) ──────
function Eyes({ type, ink }: { type: string; ink: string }) {
  const lx = 80, rx = 120, y = 108;
  const stroke = (w = 3) => ({ stroke: ink, strokeWidth: w, strokeLinecap: 'round' as const, fill: 'none' });

  switch (type) {
    case 'line':
      // dünne, kurze horizontale Striche → reduzierter „UI"-Look
      return (
        <>
          <line x1={lx - 7} y1={y} x2={lx + 7} y2={y} {...stroke(3.2)} />
          <line x1={rx - 7} y1={y} x2={rx + 7} y2={y} {...stroke(3.2)} />
        </>
      );
    case 'asym':
      // links Strich, rechts kleiner Punkt → Charakter durch Asymmetrie
      return (
        <>
          <line x1={lx - 7} y1={y} x2={lx + 7} y2={y} {...stroke(3)} />
          <circle cx={rx} cy={y} r="2.6" fill={ink} />
        </>
      );
    case 'micro':
      // sehr kleine Punkte (3px) — reduzierter als alte „dots"
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
    case 'dots':
      return (
        <>
          <circle cx={lx} cy={y} r="4" fill={ink} />
          <circle cx={rx} cy={y} r="4" fill={ink} />
        </>
      );
    default:
      return null;
  }
}

// ─── Mouth (reduziert: Dash/Dot/Flat als Defaults) ────────────────────────
function Mouth({ type, ink }: { type: string; ink: string }) {
  const x = 100, y = 132;
  const stroke = (w = 2.6) => ({ stroke: ink, strokeWidth: w, strokeLinecap: 'round' as const, fill: 'none' });

  switch (type) {
    case 'dash':
      return <line x1={x - 6} y1={y} x2={x + 6} y2={y} {...stroke(2.6)} />;
    case 'dot':
      return <circle cx={x} cy={y} r="2.2" fill={ink} />;
    case 'flat':
      return <line x1={x - 9} y1={y} x2={x + 9} y2={y} {...stroke(2.6)} />;
    case 'smirk':
      return <path d={`M${x - 8} ${y + 1} Q${x - 1} ${y + 5} ${x + 9} ${y - 2}`} {...stroke(2.8)} />;
    case 'smile':
      return <path d={`M${x - 10} ${y - 1} Q${x} ${y + 6} ${x + 10} ${y - 1}`} {...stroke(2.8)} />;
    case 'open':
      return (
        <>
          <path d={`M${x - 11} ${y - 2} Q${x} ${y + 10} ${x + 11} ${y - 2} Z`} fill={ink} />
          <path d={`M${x - 7} ${y + 3} Q${x} ${y + 8} ${x + 7} ${y + 3}`} fill="#D14A48" />
        </>
      );
    case 'o':
      return <ellipse cx={x} cy={y + 2} rx="3.2" ry="4.2" fill={ink} />;
    default:
      return null;
  }
}

// ─── Accessory ────────────────────────────────────────────────────────────
function Accessory({
  type, hoodie, ink,
}: { type: string; hoodie: string; ink: string }) {
  const sp = { stroke: ink, strokeWidth: 1.8, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
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
          <rect x="68"  y="100" width="10" height="3" fill="#fff" opacity="0.35" />
          <rect x="108" y="100" width="10" height="3" fill="#fff" opacity="0.35" />
        </>
      );
    case 'headphones':
      return (
        <>
          <path d="M44 100 Q44 50 100 50 Q156 50 156 100" fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" />
          <rect x="36"  y="92" width="20" height="32" rx="6" fill={hoodie} {...sp} />
          <rect x="144" y="92" width="20" height="32" rx="6" fill={hoodie} {...sp} />
        </>
      );
    case 'crown':
      return (
        <>
          <path d="M70 60 L78 36 L92 56 L100 30 L108 56 L122 36 L130 60 Z" fill="#E2B43A" {...sp} />
          <circle cx="100" cy="42" r="3" fill="#C84B41" stroke={ink} strokeWidth="1.2" />
        </>
      );
    case 'bowtie':
      return (
        <>
          <polygon points="80,168 100,158 80,148" fill={hoodie} {...sp} />
          <polygon points="120,168 100,158 120,148" fill={hoodie} {...sp} />
          <rect x="96" y="153" width="8" height="10" rx="2" fill={hoodie} {...sp} />
        </>
      );
    case 'party':
      return (
        <>
          <polygon points="100,18 80,68 120,68" fill={hoodie} {...sp} />
          <circle cx="100" cy="18" r="4" fill="#E2B43A" stroke={ink} strokeWidth="1.5" />
          <circle cx="86"  cy="58" r="2.5" fill="#fff" />
          <circle cx="114" cy="58" r="2.5" fill="#fff" />
        </>
      );
    case 'flower':
      return (
        <g transform="translate(140 64)">
          {[0, 72, 144, 216, 288].map(deg => (
            <circle
              key={deg}
              cx={Math.cos((deg * Math.PI) / 180) * 8}
              cy={Math.sin((deg * Math.PI) / 180) * 8}
              r="6"
              fill="#E289A8"
              stroke={ink}
              strokeWidth="1.2"
            />
          ))}
          <circle cx="0" cy="0" r="5" fill="#E2B43A" stroke={ink} strokeWidth="1.2" />
        </g>
      );
    case 'none':
    default:
      return null;
  }
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

  // 8 Vorschau-Avatare in jeder Team-Farbe (mit der aktuellen Konfig sonst)
  const teamRow = useMemo(() => PALETTE.map((_, i) => ({ ...cfg, colorIdx: i })), [cfg]);

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
            Mix &amp; Match in den 8 CozyQuiz-Team-Farben — Spielwiese
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: 1100, margin: '0 auto', padding: '24px',
        display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24,
      }}>
        {/* ─── Preview-Spalte ────────────────────────────────────── */}
        <div style={{
          background: 'rgba(255,255,255,0.025)',
          border: `1px solid ${accent}30`,
          borderRadius: 18,
          padding: 20,
          alignSelf: 'start',
          position: 'sticky',
          top: 16,
        }}>
          <div ref={svgRef} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.25)', borderRadius: 14,
            padding: 18, marginBottom: 14,
          }}>
            <AvatarSVG cfg={cfg} size={300} />
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
              title="Auf modernen Default zurücksetzen"
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

          {/* Team-Farben Vorschau-Reihe */}
          <div style={{
            fontSize: 11, fontWeight: 800, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: 8,
          }}>In allen 8 Farben</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {teamRow.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setField('colorIdx', i)}
                title={PALETTE[i].name}
                style={{
                  padding: 4, borderRadius: 10,
                  border: `1.5px solid ${i === cfg.colorIdx ? PALETTE[i].ring : 'rgba(255,255,255,0.08)'}`,
                  background: 'rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <AvatarSVG cfg={t} size={64} />
              </button>
            ))}
          </div>
        </div>

        {/* ─── Controls-Spalte ──────────────────────────────────── */}
        <div style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 18,
          padding: 22,
        }}>
          <Field label="Team-Farbe">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PALETTE.map((p, i) => {
                const active = i === cfg.colorIdx;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setField('colorIdx', i)}
                    title={p.name}
                    style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: p.ring,
                      border: active ? '3px solid #fff' : '2px solid rgba(255,255,255,0.10)',
                      boxShadow: active ? `0 0 0 2px ${p.ring}, 0 4px 12px ${p.ring}55` : 'none',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  />
                );
              })}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
              {PALETTE[cfg.colorIdx].name} · <span style={{ fontFamily: 'monospace' }}>{PALETTE[cfg.colorIdx].ring}</span>
            </div>
          </Field>

          <Field label="Tone">
            <ChipRow options={TONE} value={cfg.tone} onChange={v => setField('tone', v)} accent={accent} />
          </Field>

          <Field label="Form">
            <ChipRow options={SHAPE} value={cfg.shape} onChange={v => setField('shape', v)} accent={accent} />
          </Field>

          <Field label="Outline">
            <ChipRow options={OUTLINE} value={cfg.outline} onChange={v => setField('outline', v)} accent={accent} />
          </Field>

          <Field label="Ohren">
            <ChipRow options={EARS} value={cfg.ears} onChange={v => setField('ears', v)} accent={accent} />
          </Field>

          <Field label="Augen">
            <ChipRow options={EYES} value={cfg.eyes} onChange={v => setField('eyes', v)} accent={accent} />
          </Field>

          <Field label="Mund">
            <ChipRow options={MOUTH} value={cfg.mouth} onChange={v => setField('mouth', v)} accent={accent} />
          </Field>

          <Field label="Accessoire">
            <ChipRow options={ACCESSORY} value={cfg.accessory} onChange={v => setField('accessory', v)} accent={accent} />
          </Field>

          <Field label="Hintergrund-Pattern">
            <ChipRow options={PATTERN} value={cfg.pattern} onChange={v => setField('pattern', v)} accent={accent} />
          </Field>

          <div style={{
            marginTop: 8, padding: '10px 12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.08)',
            fontSize: 11, color: '#64748b', lineHeight: 1.5,
          }}>
            Default: <strong style={{ color: '#cbd5e1' }}>Muted · Kreis · Tinted-Outline · Strich-Augen · Dash-Mund</strong> — der „Modern-App"-Look. ↺ setzt zurück, 🎲 würfelt frei.
          </div>
        </div>
      </div>
    </div>
  );
};

export default QQAvatarGeneratorPage;
