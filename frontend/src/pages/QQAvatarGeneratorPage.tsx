// 2026-05-03 — Avatar-Generator Spielwiese
// Mix & Match SVG-Avatare in den 8 CozyQuiz-Team-Farben.
// Ohne Backend, ohne Persistenz — reine Stil-Werkstatt.
// Erreichbar unter /testpage; im /menü → Extras verlinkt.

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

// ─── Feature-Kataloge (alles SVG, keine externen Assets) ───────────────────
type Feature = 'ears' | 'eyes' | 'mouth' | 'accessory' | 'cheeks' | 'pattern';

const EARS = [
  { id: 'round',  label: 'Rund' },     // klassisch (Bär/Panda)
  { id: 'pointy', label: 'Spitz' },    // Katze/Fuchs
  { id: 'floppy', label: 'Hänge' },    // Hund/Hase
  { id: 'long',   label: 'Lang' },     // Hase
  { id: 'horns',  label: 'Hörner' },   // Kuh/Giraffe
  { id: 'beak',   label: 'Schnabel' }, // Pinguin
  { id: 'none',   label: 'Keine' },
];

const EYES = [
  { id: 'dots',    label: 'Punkte' },
  { id: 'happy',   label: 'Glücklich' },
  { id: 'sparkle', label: 'Sparkle' },
  { id: 'wide',    label: 'Wach' },
  { id: 'heart',   label: 'Herz' },
  { id: 'sleepy',  label: 'Verschlafen' },
];

const MOUTH = [
  { id: 'smile',   label: 'Lächeln' },
  { id: 'open',    label: 'Offen' },
  { id: 'tongue',  label: 'Zunge' },
  { id: 'o',       label: 'O' },
  { id: 'smirk',   label: 'Smirk' },
  { id: 'flat',    label: 'Neutral' },
];

const ACCESSORY = [
  { id: 'none',       label: 'Nichts' },
  { id: 'party',      label: 'Partyhut' },
  { id: 'crown',      label: 'Krone' },
  { id: 'glasses',    label: 'Brille' },
  { id: 'shades',     label: 'Sonnenbrille' },
  { id: 'headphones', label: 'Kopfhörer' },
  { id: 'bowtie',     label: 'Fliege' },
  { id: 'flower',     label: 'Blume' },
];

const CHEEKS = [
  { id: 'pink', label: 'Rosa' },
  { id: 'none', label: 'Keine' },
];

const PATTERN = [
  { id: 'solid',  label: 'Einfarbig' },
  { id: 'ring',   label: 'Ring' },
  { id: 'dots',   label: 'Punkte' },
  { id: 'rays',   label: 'Strahlen' },
];

type AvatarConfig = {
  colorIdx: number;
  ears: string;
  eyes: string;
  mouth: string;
  accessory: string;
  cheeks: string;
  pattern: string;
};

function randomConfig(): AvatarConfig {
  const pick = <T extends { id: string }>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)].id;
  return {
    colorIdx: Math.floor(Math.random() * PALETTE.length),
    ears: pick(EARS),
    eyes: pick(EYES),
    mouth: pick(MOUTH),
    accessory: pick(ACCESSORY),
    cheeks: pick(CHEEKS),
    pattern: pick(PATTERN),
  };
}

// ─── SVG-Renderer ──────────────────────────────────────────────────────────
// Coordinate system: 200x200, head ~ 60-r-circle at center, ears outside.
function AvatarSVG({ cfg, size = 200 }: { cfg: AvatarConfig; size?: number }) {
  const c = PALETTE[cfg.colorIdx];
  const ring = c.ring;
  const skin = '#FAF3E7';      // warm off-white face
  const skinShade = '#E9DBC4'; // for ears inner
  const ink = '#1F1B16';       // outline / mouth
  const blush = '#F5A6B8';

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
      {/* Hintergrund nach pattern */}
      <defs>
        <radialGradient id="rays" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={ring} stopOpacity="0.0" />
          <stop offset="100%" stopColor={ring} stopOpacity="0.45" />
        </radialGradient>
        <pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="7" cy="7" r="1.6" fill="#ffffff" opacity="0.35" />
        </pattern>
      </defs>

      {/* Background circle (full-bleed) */}
      <circle cx="100" cy="100" r="100" fill={ring} />
      {cfg.pattern === 'ring' && (
        <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="3" />
      )}
      {cfg.pattern === 'dots' && (
        <circle cx="100" cy="100" r="100" fill="url(#dots)" />
      )}
      {cfg.pattern === 'rays' && (
        <circle cx="100" cy="100" r="100" fill="url(#rays)" />
      )}

      {/* Ears — gezeichnet HINTER dem Kopf */}
      <Ears type={cfg.ears} ring={ring} skinShade={skinShade} ink={ink} />

      {/* Kopf */}
      <circle cx="100" cy="106" r="58" fill={skin} stroke={ink} strokeWidth="2.5" />

      {/* Wangen */}
      {cfg.cheeks === 'pink' && (
        <>
          <ellipse cx="72"  cy="120" rx="9" ry="5" fill={blush} opacity="0.85" />
          <ellipse cx="128" cy="120" rx="9" ry="5" fill={blush} opacity="0.85" />
        </>
      )}

      {/* Augen */}
      <Eyes type={cfg.eyes} ink={ink} />

      {/* Mund */}
      <Mouth type={cfg.mouth} ink={ink} />

      {/* Accessory — über allem */}
      <Accessory type={cfg.accessory} ring={ring} hoodie={c.hoodie} ink={ink} />
    </svg>
  );
}

// ─── Sub-Renderer ──────────────────────────────────────────────────────────
function Ears({ type, ring, skinShade, ink }: { type: string; ring: string; skinShade: string; ink: string }) {
  const stroke = { stroke: ink, strokeWidth: 2.5, strokeLinejoin: 'round' as const };
  switch (type) {
    case 'round':
      return (
        <>
          <circle cx="56"  cy="62" r="18" fill={skinShade} {...stroke} />
          <circle cx="144" cy="62" r="18" fill={skinShade} {...stroke} />
        </>
      );
    case 'pointy':
      return (
        <>
          <polygon points="46,72 70,30 86,68"   fill={skinShade} {...stroke} />
          <polygon points="154,72 130,30 114,68" fill={skinShade} {...stroke} />
        </>
      );
    case 'floppy':
      return (
        <>
          <ellipse cx="50"  cy="92" rx="14" ry="32" fill={skinShade} {...stroke} />
          <ellipse cx="150" cy="92" rx="14" ry="32" fill={skinShade} {...stroke} />
        </>
      );
    case 'long':
      return (
        <>
          <ellipse cx="76"  cy="38" rx="10" ry="32" fill={skinShade} {...stroke} />
          <ellipse cx="124" cy="38" rx="10" ry="32" fill={skinShade} {...stroke} />
        </>
      );
    case 'horns':
      return (
        <>
          <path d="M70 58 Q56 38 64 30 Q72 36 78 56 Z"   fill="#F2E0B8" {...stroke} />
          <path d="M130 58 Q144 38 136 30 Q128 36 122 56 Z" fill="#F2E0B8" {...stroke} />
        </>
      );
    case 'beak':
      return (
        <polygon points="100,98 84,118 116,118" fill="#F59E0B" {...stroke} />
      );
    case 'none':
    default:
      return null;
  }
}

function Eyes({ type, ink }: { type: string; ink: string }) {
  const lx = 80, rx = 120, y = 102;
  switch (type) {
    case 'dots':
      return (
        <>
          <circle cx={lx} cy={y} r="5" fill={ink} />
          <circle cx={rx} cy={y} r="5" fill={ink} />
        </>
      );
    case 'happy':
      return (
        <>
          <path d={`M${lx-7} ${y+2} Q${lx} ${y-7} ${lx+7} ${y+2}`} fill="none" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
          <path d={`M${rx-7} ${y+2} Q${rx} ${y-7} ${rx+7} ${y+2}`} fill="none" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
        </>
      );
    case 'sparkle':
      return (
        <>
          <circle cx={lx} cy={y} r="7" fill={ink} />
          <circle cx={rx} cy={y} r="7" fill={ink} />
          <circle cx={lx-2} cy={y-3} r="2.2" fill="#fff" />
          <circle cx={rx-2} cy={y-3} r="2.2" fill="#fff" />
        </>
      );
    case 'wide':
      return (
        <>
          <circle cx={lx} cy={y} r="9" fill="#fff" stroke={ink} strokeWidth="2.5" />
          <circle cx={rx} cy={y} r="9" fill="#fff" stroke={ink} strokeWidth="2.5" />
          <circle cx={lx} cy={y+1} r="4" fill={ink} />
          <circle cx={rx} cy={y+1} r="4" fill={ink} />
        </>
      );
    case 'heart':
      return (
        <>
          {[lx, rx].map(cx => (
            <path
              key={cx}
              d={`M${cx} ${y+5} L${cx-7} ${y-2} A4 4 0 0 1 ${cx} ${y-3} A4 4 0 0 1 ${cx+7} ${y-2} Z`}
              fill="#EF4444"
              stroke={ink}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          ))}
        </>
      );
    case 'sleepy':
      return (
        <>
          <path d={`M${lx-7} ${y} Q${lx} ${y+5} ${lx+7} ${y}`} fill="none" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
          <path d={`M${rx-7} ${y} Q${rx} ${y+5} ${rx+7} ${y}`} fill="none" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
        </>
      );
    default:
      return null;
  }
}

function Mouth({ type, ink }: { type: string; ink: string }) {
  const x = 100, y = 130;
  switch (type) {
    case 'smile':
      return <path d={`M${x-12} ${y} Q${x} ${y+10} ${x+12} ${y}`} fill="none" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />;
    case 'open':
      return (
        <>
          <path d={`M${x-13} ${y-1} Q${x} ${y+13} ${x+13} ${y-1} Z`} fill={ink} />
          <path d={`M${x-9} ${y+4} Q${x} ${y+10} ${x+9} ${y+4}`} fill="#EF4444" />
        </>
      );
    case 'tongue':
      return (
        <>
          <path d={`M${x-12} ${y} Q${x} ${y+10} ${x+12} ${y}`} fill="none" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
          <path d={`M${x-3} ${y+5} Q${x+1} ${y+13} ${x+5} ${y+5} Z`} fill="#EF4444" stroke={ink} strokeWidth="1.5" />
        </>
      );
    case 'o':
      return <ellipse cx={x} cy={y+3} rx="5" ry="6" fill={ink} />;
    case 'smirk':
      return <path d={`M${x-10} ${y} Q${x-2} ${y+8} ${x+12} ${y-2}`} fill="none" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />;
    case 'flat':
      return <line x1={x-10} y1={y+3} x2={x+10} y2={y+3} stroke={ink} strokeWidth="3.5" strokeLinecap="round" />;
    default:
      return null;
  }
}

function Accessory({ type, hoodie, ink }: { type: string; ring: string; hoodie: string; ink: string }) {
  const stroke = { stroke: ink, strokeWidth: 2.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  switch (type) {
    case 'party':
      return (
        <>
          <polygon points="100,18 80,68 120,68" fill={hoodie} {...stroke} />
          <circle cx="100" cy="18" r="5" fill="#FBBF24" stroke={ink} strokeWidth="2" />
          <circle cx="86"  cy="58" r="3" fill="#fff" />
          <circle cx="114" cy="58" r="3" fill="#fff" />
        </>
      );
    case 'crown':
      return (
        <>
          <path d="M70 60 L78 36 L92 56 L100 30 L108 56 L122 36 L130 60 Z" fill="#FBBF24" {...stroke} />
          <circle cx="100" cy="42" r="3.5" fill="#EF4444" stroke={ink} strokeWidth="1.5" />
        </>
      );
    case 'glasses':
      return (
        <>
          <circle cx="80"  cy="102" r="14" fill="none" stroke={ink} strokeWidth="3" />
          <circle cx="120" cy="102" r="14" fill="none" stroke={ink} strokeWidth="3" />
          <line x1="94"  y1="102" x2="106" y2="102" stroke={ink} strokeWidth="3" />
        </>
      );
    case 'shades':
      return (
        <>
          <rect x="64" y="92" width="32" height="18" rx="4" fill={ink} />
          <rect x="104" y="92" width="32" height="18" rx="4" fill={ink} />
          <line x1="96"  y1="101" x2="104" y2="101" stroke={ink} strokeWidth="3" />
          <rect x="68" y="94" width="10" height="4" fill="#fff" opacity="0.4" />
          <rect x="108" y="94" width="10" height="4" fill="#fff" opacity="0.4" />
        </>
      );
    case 'headphones':
      return (
        <>
          <path d="M44 100 Q44 50 100 50 Q156 50 156 100" fill="none" stroke={ink} strokeWidth="6" strokeLinecap="round" />
          <rect x="36"  y="92" width="20" height="32" rx="6" fill={hoodie} {...stroke} />
          <rect x="144" y="92" width="20" height="32" rx="6" fill={hoodie} {...stroke} />
        </>
      );
    case 'bowtie':
      return (
        <>
          <polygon points="80,168 100,158 80,148" fill={hoodie} {...stroke} />
          <polygon points="120,168 100,158 120,148" fill={hoodie} {...stroke} />
          <rect x="96" y="153" width="8" height="10" rx="2" fill={hoodie} {...stroke} />
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
              fill="#F472B6"
              stroke={ink}
              strokeWidth="1.5"
            />
          ))}
          <circle cx="0" cy="0" r="5" fill="#FBBF24" stroke={ink} strokeWidth="1.5" />
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
  const [cfg, setCfg] = useState<AvatarConfig>(() => randomConfig());
  const svgRef = useRef<HTMLDivElement>(null);
  const accent = PALETTE[cfg.colorIdx].ring;

  const setField = <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) =>
    setCfg(prev => ({ ...prev, [key]: value }));

  const shuffle = useCallback(() => setCfg(randomConfig()), []);

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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 14,
            padding: 18,
            marginBottom: 14,
          }}>
            <AvatarSVG cfg={cfg} size={300} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button
              type="button"
              onClick={shuffle}
              style={{
                flex: 1,
                padding: '11px 14px',
                borderRadius: 12,
                border: `1px solid ${accent}55`,
                background: `${accent}22`,
                color: '#f8fafc',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              🎲 Würfeln
            </button>
            <button
              type="button"
              onClick={downloadPNG}
              style={{
                flex: 1,
                padding: '11px 14px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)',
                color: '#f8fafc',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
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
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 6,
          }}>
            {teamRow.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setField('colorIdx', i)}
                title={PALETTE[i].name}
                style={{
                  padding: 4,
                  borderRadius: 10,
                  border: `1.5px solid ${i === cfg.colorIdx ? PALETTE[i].ring : 'rgba(255,255,255,0.08)'}`,
                  background: 'rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
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
                      width: 44, height: 44,
                      borderRadius: 12,
                      background: p.ring,
                      border: active ? '3px solid #fff' : '2px solid rgba(255,255,255,0.10)',
                      boxShadow: active ? `0 0 0 2px ${p.ring}, 0 4px 12px ${p.ring}55` : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  />
                );
              })}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
              {PALETTE[cfg.colorIdx].name} · <span style={{ fontFamily: 'monospace' }}>{PALETTE[cfg.colorIdx].ring}</span>
            </div>
          </Field>

          <Field label="Ohren / Form">
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

          <Field label="Wangen">
            <ChipRow options={CHEEKS} value={cfg.cheeks} onChange={v => setField('cheeks', v)} accent={accent} />
          </Field>

          <Field label="Hintergrund-Pattern">
            <ChipRow options={PATTERN} value={cfg.pattern} onChange={v => setField('pattern', v)} accent={accent} />
          </Field>

          <div style={{
            marginTop: 8,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.08)',
            fontSize: 11,
            color: '#64748b',
            lineHeight: 1.5,
          }}>
            Spielwiese — keine Persistenz, kein Sync zu echten Teams. PNG-Download (1024×1024) speichert die aktuelle Vorschau.
          </div>
        </div>
      </div>
    </div>
  );
};

export default QQAvatarGeneratorPage;
