// 2026-05-02 — Polish-Vergleichsseite fuer App-Designer-Audit
// Zeigt B2 (lange Frage), B3 (Top-Bar Kategorie-Pill + Round-Counter),
// M2 (Mit-Gewinner-Buttons) jeweils im Vorher/Nachher-Vergleich, damit
// Wolf vor der Implementation visuell entscheiden kann.

import { useState } from 'react';
import { QQTeamAvatar } from '../components/QQTeamAvatar';

const BG = '#0d0a06';
const TEXT = '#F1F5F9';
const MUTED = '#94a3b8';

const LONG_QUESTION = 'Welcher deutsche Filmemacher gewann 2014 als erster nicht-amerikanischer Regisseur seit 1973 den Oscar fuer den besten fremdsprachigen Film, mit einem Werk, das im damals vom Krieg gezeichneten Sarajevo der spaeten 1990er-Jahre angesiedelt ist und das Schicksal einer Familie zwischen Heimatverlust und Hoffnung erzaehlt?';

function Section({ title, sev, aufwand, children }: { title: string; sev: string; aufwand: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 64 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#FBBF24' }}>{title}</h2>
        <span style={{
          fontSize: 11, fontWeight: 800, color: '#FBBF24',
          background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.4)',
          padding: '3px 10px', borderRadius: 999,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>{sev}</span>
        <span style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>Aufwand {aufwand}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {children}
      </div>
    </section>
  );
}

function Variant({ label, current, children }: { label: string; current?: boolean; children: React.ReactNode }) {
  return (
    <div style={{
      border: `2px solid ${current ? '#475569' : '#22C55E'}`,
      borderRadius: 16, padding: 16,
      background: current ? 'rgba(255,255,255,0.02)' : 'rgba(34,197,94,0.05)',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 900, marginBottom: 12,
        color: current ? '#94a3b8' : '#22C55E',
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        {current ? '⏵ Aktuell' : '✦ Vorschlag'} — {label}
      </div>
      {children}
    </div>
  );
}

// ─── B2 — Lange Frage Schrift-Min ──────────────────────────────────────────
function B2Preview({ minPx }: { minPx: number }) {
  return (
    <div style={{
      background: '#1a1410', borderRadius: 14, padding: 24,
      border: '1.5px solid rgba(251,191,36,0.25)',
      minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        fontSize: `clamp(${minPx}px, 2.6vw, 38px)`,
        fontWeight: 900, lineHeight: 1.22,
        color: TEXT, textAlign: 'center', maxWidth: '100%',
      }}>
        {LONG_QUESTION}
      </div>
    </div>
  );
}

// ─── B3 — Top-Bar Kategorie-Pill + Round-Counter ───────────────────────────
function B3Preview({ variant }: { variant: 'current' | 'opaque' | 'opaqueWithCounter' }) {
  const accent = '#FBBF24';
  const bg = variant === 'current' ? `${accent}18` : '#0d0a06';
  const border = variant === 'current' ? `1px solid ${accent}55` : `1px solid ${accent}aa`;
  const fontSize = variant === 'current' ? 'clamp(14px, 1.6vw, 20px)' : 'clamp(18px, 2vw, 26px)';
  return (
    <div style={{
      background: '#1a1410', borderRadius: 14, padding: '24px 32px',
      minHeight: 120, position: 'relative',
      border: '1.5px solid rgba(251,191,36,0.15)',
    }}>
      {/* Linker Pill */}
      <div style={{
        position: 'absolute', top: 16, left: 16,
        display: 'inline-flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          fontSize, fontWeight: 900, color: accent,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          padding: '8px 16px', borderRadius: 12,
          background: bg,
          border,
        }}>
          🟡 CHEESE
        </span>
        {variant === 'opaqueWithCounter' && (
          <span style={{
            fontSize: 'clamp(14px, 1.4vw, 18px)', fontWeight: 800, color: '#cbd5e1',
            padding: '6px 14px', borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}>
            Frage 3/5
          </span>
        )}
      </div>
      {/* Rechter Timer-Mock */}
      <div style={{
        position: 'absolute', top: 8, right: 12,
        width: 80, height: 80, borderRadius: '50%',
        border: `4px solid ${accent}88`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32, fontWeight: 900, color: accent,
      }}>
        24
      </div>
      <div style={{ paddingTop: 80, fontSize: 13, color: MUTED, fontStyle: 'italic' }}>
        Aus 10m: Pill-Text + Counter visuell pruefen
      </div>
    </div>
  );
}

// ─── M2 — Mit-Gewinner Buttons ─────────────────────────────────────────────
const MOCK_TEAMS = [
  { id: 't1', name: 'Schweinefuesse', avatarId: 'fox', color: '#22C55E' },
  { id: 't2', name: 'Quizmasters', avatarId: 'owl', color: '#3B82F6' },
  { id: 't3', name: 'Bier-Brigade', avatarId: 'bear', color: '#F59E0B' },
  { id: 't4', name: 'Wolves', avatarId: 'wolf', color: '#EF4444' },
  { id: 't5', name: 'Phoenix', avatarId: 'cat', color: '#A855F7' },
  { id: 't6', name: 'Tisch 7', avatarId: 'rabbit', color: '#EC4899' },
  { id: 't7', name: 'Underdogs', avatarId: 'dog', color: '#06B6D4' },
];

function M2Current() {
  return (
    <div style={{
      background: '#1a1410', borderRadius: 14, padding: 16,
      border: '1.5px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 800, marginBottom: 8 }}>
        🏆 Sieger: Schweinefuesse
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginRight: 4 }}>
            ⇄ Gewinner ändern:
          </span>
          {MOCK_TEAMS.slice(1).map(t => (
            <button key={t.id} style={{
              padding: '3px 10px', borderRadius: 8,
              border: `1.5px solid ${t.color}88`,
              background: `${t.color}15`, color: t.color,
              fontFamily: 'inherit', fontWeight: 800, fontSize: 12,
              cursor: 'pointer',
            }}>{t.name}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginRight: 4 }}>
            + Mit-Gewinner:
          </span>
          {MOCK_TEAMS.slice(1).map(t => (
            <button key={`co-${t.id}`} style={{
              padding: '3px 10px', borderRadius: 8,
              border: `1.5px dashed ${t.color}66`,
              background: 'transparent', color: t.color,
              fontFamily: 'inherit', fontWeight: 800, fontSize: 12,
              cursor: 'pointer',
            }}>+ {t.name}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function M2Proposed() {
  return (
    <div style={{
      background: '#1a1410', borderRadius: 14, padding: 16,
      border: '1.5px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 800, marginBottom: 12 }}>
        🏆 Sieger: Schweinefuesse
      </div>
      {/* Eigene Card-Sektion fuer "Gewinner aendern" */}
      <div style={{
        marginBottom: 10, padding: 10, borderRadius: 10,
        background: 'rgba(59,130,246,0.06)',
        border: '1px solid rgba(59,130,246,0.25)',
      }}>
        <div style={{ fontSize: 11, color: '#60A5FA', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
          ⇄ Gewinner austauschen
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {MOCK_TEAMS.slice(1).map(t => (
            <button key={t.id} style={{
              minHeight: 36, padding: '8px 14px', borderRadius: 10,
              border: `1.5px solid ${t.color}88`,
              background: `${t.color}18`, color: t.color,
              fontFamily: 'inherit', fontWeight: 800, fontSize: 14,
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <QQTeamAvatar avatarId={t.avatarId} size={20} />
              {t.name}
            </button>
          ))}
        </div>
      </div>
      {/* Eigene Card-Sektion fuer "Mit-Gewinner" mit klar abgesetztem Tint */}
      <div style={{
        padding: 10, borderRadius: 10,
        background: 'rgba(34,197,94,0.06)',
        border: '1px solid rgba(34,197,94,0.25)',
      }}>
        <div style={{ fontSize: 11, color: '#4ADE80', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
          + Mit-Gewinner hinzufügen
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {MOCK_TEAMS.slice(1).map(t => (
            <button key={`co-${t.id}`} style={{
              minHeight: 36, padding: '8px 14px', borderRadius: 10,
              border: `1.5px dashed ${t.color}99`,
              background: 'rgba(255,255,255,0.02)', color: t.color,
              fontFamily: 'inherit', fontWeight: 800, fontSize: 14,
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <QQTeamAvatar avatarId={t.avatarId} size={20} />
              + {t.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function QQPolishTestPage() {
  const [b3Variant, setB3Variant] = useState<'current' | 'opaque' | 'opaqueWithCounter'>('current');

  return (
    <div style={{
      background: BG, color: TEXT,
      minHeight: '100vh',
      fontFamily: "'Nunito', system-ui, sans-serif",
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 64px' }}>
        <header style={{ marginBottom: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: MUTED, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            App-Designer-Audit · 2026-05-02
          </div>
          <h1 style={{ margin: 0, fontSize: 40, fontWeight: 900, color: '#FDE68A' }}>
            Polish-Vergleich
          </h1>
          <div style={{ marginTop: 12, fontSize: 14, color: MUTED, maxWidth: 720, margin: '12px auto 0' }}>
            B2/B3/M2 — visuelle Optionen, die Wolf entscheidet. Top-3 + mittlere Liga sind schon live.
          </div>
        </header>

        {/* ── B2 ── */}
        <Section title="B2 — Lange Frage Schrift-Minimum" sev="Wichtig" aufwand="S">
          <Variant label="Min 22px (jetzt)" current>
            <B2Preview minPx={22} />
            <p style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>
              Bei sehr langen Fragen (&gt;200 Zeichen) schrumpft die Schrift bis 22px. Auf einem 1080p-Beamer aus 10m physikalisch ~3-4mm.
            </p>
          </Variant>
          <Variant label="Min 32px (Vorschlag)">
            <B2Preview minPx={32} />
            <p style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>
              Schrift bleibt aus 10m lesbar. Trade-off: bei langen Fragen mehr Zeilen, Card waechst evtl. etwas in der Hoehe.
            </p>
          </Variant>
        </Section>

        {/* ── B3 ── */}
        <Section title="B3 — Top-Bar Kategorie-Pill + Round-Counter" sev="Wichtig" aufwand="M">
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, marginBottom: 8 }}>
            <button onClick={() => setB3Variant('current')} style={{
              padding: '8px 16px', borderRadius: 8,
              border: `2px solid ${b3Variant === 'current' ? '#FBBF24' : '#475569'}`,
              background: b3Variant === 'current' ? 'rgba(251,191,36,0.12)' : 'transparent',
              color: b3Variant === 'current' ? '#FBBF24' : '#94a3b8',
              fontFamily: 'inherit', fontWeight: 800, cursor: 'pointer',
            }}>Aktuell</button>
            <button onClick={() => setB3Variant('opaque')} style={{
              padding: '8px 16px', borderRadius: 8,
              border: `2px solid ${b3Variant === 'opaque' ? '#FBBF24' : '#475569'}`,
              background: b3Variant === 'opaque' ? 'rgba(251,191,36,0.12)' : 'transparent',
              color: b3Variant === 'opaque' ? '#FBBF24' : '#94a3b8',
              fontFamily: 'inherit', fontWeight: 800, cursor: 'pointer',
            }}>Opake Pill (kein Counter)</button>
            <button onClick={() => setB3Variant('opaqueWithCounter')} style={{
              padding: '8px 16px', borderRadius: 8,
              border: `2px solid ${b3Variant === 'opaqueWithCounter' ? '#FBBF24' : '#475569'}`,
              background: b3Variant === 'opaqueWithCounter' ? 'rgba(251,191,36,0.12)' : 'transparent',
              color: b3Variant === 'opaqueWithCounter' ? '#FBBF24' : '#94a3b8',
              fontFamily: 'inherit', fontWeight: 800, cursor: 'pointer',
            }}>Opake Pill + Round-Counter</button>
          </div>
          <Variant label={
            b3Variant === 'current' ? 'jetzt: Pill auf accent-18% bg, kein Counter' :
            b3Variant === 'opaque' ? 'Vorschlag A: Pill bg auf solid #0d0a06, groessere Schrift' :
            'Vorschlag B: Opake Pill + Frage 3/5-Counter rechts daneben'
          } current={b3Variant === 'current'}>
            <B3Preview variant={b3Variant} />
            <p style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>
              {b3Variant === 'current' && 'Pill verschwimmt aus 10m — gelb auf 8%-gelb hat zu wenig Kontrast. Counter fehlt — Publikum weiss nie wo es im Spiel ist.'}
              {b3Variant === 'opaque' && 'Solid-Background trennt klar vom Hintergrund. Schrift groesser. Aber: kein Round-Counter — Publikum weiss weiterhin nicht "wo sind wir?".'}
              {b3Variant === 'opaqueWithCounter' && 'Opake Pill + Frage 3/5-Counter rechts daneben — beide Probleme geloest. Trade-off: leicht mehr horizontaler Platz noetig.'}
            </p>
          </Variant>
          <div />
        </Section>

        {/* ── M2 ── */}
        <Section title="M2 — Mit-Gewinner-Buttons im Mod-Panel" sev="Wichtig" aufwand="M">
          <Variant label="12px Inline-Pills (jetzt)" current>
            <M2Current />
            <p style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>
              Bei 7-8 Teams baut das eine 2-zeilige Wand kleiner Buttons. Solid vs dashed-Trennung sehr subtil — Mod kann sich vergreifen.
            </p>
          </Variant>
          <Variant label="36px-Buttons in zwei klar getrennten Cards (Vorschlag)">
            <M2Proposed />
            <p style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>
              Eigene Card pro Aktion mit Tint-Farbe (blau / gruen). Buttons mit Avatar-Icon, 36px hoch, klare visuelle Trennung. Kostet ein wenig vertikalen Platz.
            </p>
          </Variant>
        </Section>

        {/* ── Decision-helper ── */}
        <section style={{
          marginTop: 64, padding: 24, borderRadius: 16,
          background: 'rgba(251,191,36,0.06)',
          border: '1px solid rgba(251,191,36,0.25)',
        }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 900, color: '#FBBF24' }}>
            ✦ Wenn du dich entschieden hast
          </h2>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: '#e5e7eb' }}>
            Sag mir z.B.:
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              <li><strong>B2:</strong> 32px / 28px / lassen</li>
              <li><strong>B3:</strong> opaque mit Counter / opaque ohne Counter / lassen</li>
              <li><strong>M2:</strong> Vorschlag uebernehmen / lassen / anders (was)</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
