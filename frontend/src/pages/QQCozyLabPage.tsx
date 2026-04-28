// QQ Cozy-Lab — Side-by-side Vergleich:
//   A) Aktueller Stand (cool slate)
//   B) Warm-Stone Color-Shift (#1)
//   C) Slow Tempo + Breath-Card (#2)
// Drei Question-Card-Mocks + ein Reveal-Trigger, damit man Easing/Timing live sieht.
// Plus eine Breath-Card-Demo zwischen den Runden.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// Token-Sets pro Variante
// ─────────────────────────────────────────────────────────────────────────────

type Tokens = {
  bg: string;            // page bg
  cardBg: string;        // question card bg
  cardBorder: string;    // question card border
  cardShadow: string;    // bottom shadow color
  text: string;          // primary text
  muted: string;         // secondary text
  pillBg: string;        // dark pill bg (header label, timer)
  pillText: string;      // pill text
  optBgFn: (n: number) => string;     // option tile bg per index
  optShadowFn: (n: number) => string; // option tile bottom shadow
  optText: string;       // option text color
  reveal: string;        // green for correct
  // Tempo
  fadeMs: number;
  fadeEasing: string;
  optionStaggerMs: number;
};

const COOL: Tokens = {
  bg: '#0d0a06',
  cardBg: 'rgba(15,12,9,0.85)',
  cardBorder: '#e2e8f0',
  cardShadow: '#cbd5e1',
  text: '#F1F5F9',
  muted: '#94A3B8',
  pillBg: '#111827',
  pillText: '#FFFFFF',
  optBgFn: (n) => ['#3B82F6', '#22C55E', '#EF4444', '#F97316'][n],
  optShadowFn: (n) => ['#1d4ed8', '#15803d', '#b91c1c', '#c2410c'][n],
  optText: '#FFFFFF',
  reveal: '#22C55E',
  fadeMs: 350,
  fadeEasing: 'ease',
  optionStaggerMs: 60,
};

const WARM_STONE: Tokens = {
  // Stone-toned: Slate-Grays → warmes Stone-Spektrum.
  bg: '#0d0a06',                         // bg unverändert (ist eh schon warm)
  cardBg: 'rgba(28,22,16,0.85)',         // wärmerer Card-Untergrund
  cardBorder: '#D6D3D1',                 // stone-300 statt slate-200
  cardShadow: '#A8A29E',                 // stone-400
  text: '#FAF5EB',                       // cream statt slate-100
  muted: '#A8A29E',                      // stone-400 statt slate-400
  pillBg: '#1C1917',                     // stone-900 statt slate-900
  pillText: '#FAF5EB',
  optBgFn: (n) => ['#3B82F6', '#22C55E', '#EF4444', '#F97316'][n], // Tile-Farben bleiben — sind die Identität
  optShadowFn: (n) => ['#1d4ed8', '#15803d', '#b91c1c', '#c2410c'][n],
  optText: '#FFFFFF',
  reveal: '#22C55E',
  fadeMs: 350,                            // Tempo wie Cool — nur Farbe testen
  fadeEasing: 'ease',
  optionStaggerMs: 60,
};

const SLOW_TEMPO: Tokens = {
  ...WARM_STONE,
  // Tempo verlangsamt — alles atmet
  fadeMs: 1100,
  fadeEasing: 'cubic-bezier(0.22,1,0.36,1)',
  optionStaggerMs: 180,
};

// ─────────────────────────────────────────────────────────────────────────────
// Mock-Frage
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_QUESTION = {
  text: 'Welcher Fluss durchquert die meisten Hauptstädte in Europa?',
  options: ['Rhein', 'Donau', 'Themse', 'Wolga'],
  correct: 1,
};

// ─────────────────────────────────────────────────────────────────────────────
// Question-Card Mock — eine Kachel pro Variante
// ─────────────────────────────────────────────────────────────────────────────

function QuestionCard({
  tokens, label, revealed, mounted,
}: { tokens: Tokens; label: string; revealed: boolean; mounted: boolean }) {
  const t = tokens;
  return (
    <div style={{
      flex: 1,
      display: 'flex', flexDirection: 'column',
      background: t.bg,
      borderRadius: 18,
      padding: 14,
      gap: 10,
      minHeight: 480,
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Lab-Label */}
      <div style={{
        fontSize: 11, fontWeight: 900, color: t.muted,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        marginBottom: 4,
      }}>{label}</div>

      {/* Beamer-Frame Mock */}
      <div style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        background: t.cardBg,
        border: `2px solid ${t.cardBorder}`,
        boxShadow: `0 4px 0 ${t.cardShadow}`,
        borderRadius: 14,
        padding: '14px 18px',
        gap: 12,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(12px)',
        transition: `opacity ${t.fadeMs}ms ${t.fadeEasing}, transform ${t.fadeMs}ms ${t.fadeEasing}`,
      }}>
        {/* Header-Pills */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{
            padding: '4px 12px', borderRadius: 999,
            background: t.pillBg, color: t.pillText,
            fontSize: 11, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>Schätzchen</span>
          <span style={{
            padding: '4px 12px', borderRadius: 999,
            background: t.pillBg, color: t.pillText,
            fontSize: 11, fontWeight: 900, fontVariantNumeric: 'tabular-nums',
          }}>⏱ 12s</span>
        </div>

        {/* Question Hero */}
        <div style={{
          padding: '14px 16px',
          borderRadius: 12,
          textAlign: 'center',
          fontSize: 22, fontWeight: 900, color: t.text, lineHeight: 1.2,
        }}>
          {MOCK_QUESTION.text}
        </div>

        {/* Options 2x2 */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
          marginTop: 'auto',
        }}>
          {MOCK_QUESTION.options.map((opt, i) => {
            const isCorrect = revealed && i === MOCK_QUESTION.correct;
            const tileDelay = mounted ? i * t.optionStaggerMs : 0;
            return (
              <div key={i} style={{
                padding: '10px 12px',
                background: isCorrect ? t.reveal : t.optBgFn(i),
                color: t.optText,
                fontWeight: 900, fontSize: 15, textAlign: 'center',
                borderRadius: 10,
                boxShadow: `0 4px 0 ${isCorrect ? '#15803d' : t.optShadowFn(i)}`,
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.97)',
                transition: `opacity ${t.fadeMs}ms ${t.fadeEasing} ${tileDelay}ms, transform ${t.fadeMs}ms ${t.fadeEasing} ${tileDelay}ms, background 0.4s ease`,
              }}>{opt}</div>
            );
          })}
        </div>

        {/* Footer mit gemuteter Subline */}
        <div style={{
          fontSize: 11, color: t.muted, fontWeight: 700,
          letterSpacing: '0.06em', textAlign: 'center',
          marginTop: 4,
        }}>
          {revealed ? '✓ richtige Antwort' : '4 Teams haben geantwortet'}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Breath-Card (zwischen Runden) — gehört zu Variante C
// ─────────────────────────────────────────────────────────────────────────────

function BreathCard({ tokens, active }: { tokens: Tokens; active: boolean }) {
  const t = tokens;
  // Sanfter 6 s Progress (kein roter „Hurry up"-Vibe)
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!active) { setProgress(0); return; }
    const start = Date.now();
    const total = 6000;
    const iv = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(1, elapsed / total);
      setProgress(p);
      if (p >= 1) clearInterval(iv);
    }, 50);
    return () => clearInterval(iv);
  }, [active]);

  return (
    <div style={{
      background: t.bg,
      borderRadius: 18, padding: 14,
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 900, color: t.muted,
        letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8,
      }}>Variante C — Breath-Card zwischen Runden</div>
      <div style={{
        background: t.cardBg,
        border: `2px solid ${t.cardBorder}`,
        boxShadow: `0 4px 0 ${t.cardShadow}`,
        borderRadius: 14,
        padding: '36px 28px',
        textAlign: 'center',
        opacity: active ? 1 : 0.4,
        transform: active ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.985)',
        transition: 'opacity 1.1s cubic-bezier(0.22,1,0.36,1), transform 1.1s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 900, color: t.muted,
          letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14,
        }}>Pause</div>
        <div style={{
          fontSize: 32, fontWeight: 900, color: t.text,
          lineHeight: 1.2, marginBottom: 12,
        }}>
          Runde 2 gleich los — <br />Schluck nehmen.
        </div>
        <div style={{
          fontSize: 14, color: t.muted, fontWeight: 700,
          letterSpacing: '0.04em', marginBottom: 28,
        }}>
          Atmen. Lachen. Es eilt nichts.
        </div>
        {/* Sanfter Fortschritts-Balken (kein Timer-Druck) */}
        <div style={{
          height: 4, background: 'rgba(255,255,255,0.06)',
          borderRadius: 999, overflow: 'hidden', maxWidth: 320, margin: '0 auto',
        }}>
          <div style={{
            height: '100%', width: `${progress * 100}%`,
            background: t.muted,
            transition: 'width 0.3s linear',
            opacity: 0.6,
          }} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function QQCozyLabPage() {
  const [revealed, setRevealed] = useState(false);
  const [breathActive, setBreathActive] = useState(false);
  const [mountKey, setMountKey] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Bei Mount-Reset einmal kurz off → on flippen, damit transition läuft
  useEffect(() => {
    setMounted(false);
    const id = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(id);
  }, [mountKey]);

  const reset = () => {
    setRevealed(false);
    setBreathActive(false);
    setMountKey(k => k + 1);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d0a06',
      color: '#F1F5F9',
      fontFamily: "'Nunito', 'Geist', system-ui, sans-serif",
      padding: '24px 28px',
      display: 'flex', flexDirection: 'column', gap: 18,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
            Cozy Lab — Color &amp; Tempo Comparison
          </h1>
          <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
            A: Status quo (cool slate) · B: Warm Stone (#1) · C: Warm Stone + Slow Tempo (#2)
          </div>
        </div>
        <Link to="/admin" style={{
          fontSize: 13, color: '#94A3B8', textDecoration: 'none',
          padding: '6px 12px', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.08)',
        }}>← Admin</Link>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
        padding: '10px 14px', borderRadius: 12,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <button onClick={reset} style={{
          padding: '8px 14px', borderRadius: 10, border: 'none',
          background: '#475569', color: '#fff',
          fontFamily: 'inherit', fontSize: 13, fontWeight: 800, cursor: 'pointer',
        }}>↻ Re-mount (Frage erscheint neu)</button>
        <button onClick={() => setRevealed(r => !r)} style={{
          padding: '8px 14px', borderRadius: 10, border: 'none',
          background: revealed ? '#15803d' : '#22C55E', color: '#fff',
          fontFamily: 'inherit', fontSize: 13, fontWeight: 800, cursor: 'pointer',
        }}>
          {revealed ? '✓ Reveal an' : '▶ Reveal an'}
        </button>
        <button onClick={() => setBreathActive(b => !b)} style={{
          padding: '8px 14px', borderRadius: 10, border: 'none',
          background: breathActive ? '#0e7490' : '#0891b2', color: '#fff',
          fontFamily: 'inherit', fontSize: 13, fontWeight: 800, cursor: 'pointer',
        }}>
          {breathActive ? '✓ Breath-Card sichtbar' : '▶ Breath-Card zeigen'}
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>
          Tipp: Re-mount drücken um die Entry-Animation neu zu sehen
        </span>
      </div>

      {/* 3-Spalten Vergleich */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
        flexWrap: 'wrap',
      }}>
        <QuestionCard tokens={COOL}        label="A · STATUS QUO (cool slate)"   revealed={revealed} mounted={mounted} />
        <QuestionCard tokens={WARM_STONE}  label="B · WARM STONE (#1)"            revealed={revealed} mounted={mounted} />
        <QuestionCard tokens={SLOW_TEMPO}  label="C · WARM + SLOW TEMPO (#1+#2)"  revealed={revealed} mounted={mounted} />
      </div>

      {/* Breath-Card unterhalb */}
      <BreathCard tokens={SLOW_TEMPO} active={breathActive} />

      {/* Token-Reference */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 8,
      }}>
        <TokenLegend label="B · Warm Stone" tokens={WARM_STONE} />
        <TempoLegend label="C · Slow Tempo" tokens={SLOW_TEMPO} />
      </div>
    </div>
  );
}

function TokenLegend({ label, tokens }: { label: string; tokens: Tokens }) {
  const rows: Array<[string, string, string]> = [
    ['Text', tokens.text, '#F1F5F9 (slate-100) → cream'],
    ['Muted', tokens.muted, '#94A3B8 (slate-400) → stone-400'],
    ['Card-Border', tokens.cardBorder, '#e2e8f0 → stone-300'],
    ['Card-Shadow', tokens.cardShadow, '#cbd5e1 → stone-400'],
    ['Pill BG', tokens.pillBg, '#111827 (gray-900) → stone-900'],
  ];
  return (
    <div style={{
      padding: 14, borderRadius: 12,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map(([name, color, note]) => (
            <tr key={name} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={{ padding: '4px 8px 4px 0', fontWeight: 800, color: '#cbd5e1', width: 110 }}>{name}</td>
              <td style={{ padding: '4px 8px' }}>
                <span style={{
                  display: 'inline-block', width: 14, height: 14, borderRadius: 4,
                  background: color, marginRight: 6, verticalAlign: 'middle',
                  border: '1px solid rgba(255,255,255,0.08)',
                }} />
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94A3B8' }}>{color}</span>
              </td>
              <td style={{ padding: '4px 0', color: '#64748b', fontSize: 11 }}>{note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TempoLegend({ label, tokens }: { label: string; tokens: Tokens }) {
  return (
    <div style={{
      padding: 14, borderRadius: 12,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <tbody>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <td style={{ padding: '4px 8px 4px 0', fontWeight: 800, color: '#cbd5e1', width: 110 }}>Fade</td>
            <td style={{ padding: '4px 0', color: '#94A3B8', fontFamily: 'monospace', fontSize: 11 }}>{tokens.fadeMs}ms · {tokens.fadeEasing}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <td style={{ padding: '4px 8px 4px 0', fontWeight: 800, color: '#cbd5e1' }}>Option-Stagger</td>
            <td style={{ padding: '4px 0', color: '#94A3B8', fontFamily: 'monospace', fontSize: 11 }}>{tokens.optionStaggerMs}ms zwischen Tiles</td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <td style={{ padding: '4px 8px 4px 0', fontWeight: 800, color: '#cbd5e1' }}>Breath-Card</td>
            <td style={{ padding: '4px 0', color: '#94A3B8', fontSize: 11 }}>6 s, sanfter Progress, kein roter Druck</td>
          </tr>
          <tr>
            <td style={{ padding: '4px 8px 4px 0', fontWeight: 800, color: '#cbd5e1' }}>Bei Mod off</td>
            <td style={{ padding: '4px 0', color: '#94A3B8', fontSize: 11 }}>fällt zurück auf 350 ms (für Power-Mods)</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
