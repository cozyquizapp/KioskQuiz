import { useState, useEffect, useMemo } from 'react';

/**
 * CozyWolf Garden — Pitch / Mockup-Page
 *
 * Konzept-Demo fuer Mass-Quiz-Modus (100+ Personen). Statt 8x8-Grid
 * mit Felder-Setzen ein lebendiger "Garten" auf einem geteilten Canvas:
 * jedes Team hat einen farbigen Blob in einer Ecke der zeitlich + pro
 * richtiger Antwort waechst. Am Ende ist visuell sichtbar wer wieviel
 * Raum eingenommen hat.
 *
 * Diese Seite ist KEIN spielbares Quiz — nur eine Pitch-/Demo-Seite mit
 * Live-Animation um das Konzept zu zeigen.
 */

// ── Demo-Teams (Mock) ──────────────────────────────────────────────────────
type DemoTeam = {
  id: string;
  name: string;
  color: string;
  // Position als Prozent vom Canvas (Ecken/Raender)
  x: number;
  y: number;
  // Wachstumsrate (0..1, wie schnell wachsen Sie pro Tick)
  growth: number;
};

const DEMO_TEAMS: DemoTeam[] = [
  { id: 'a', name: 'Wolfsrudel', color: '#3B82F6',  x: 14, y: 18, growth: 0.85 },
  { id: 'b', name: 'Pinguine',   color: '#10B981',  x: 86, y: 18, growth: 0.72 },
  { id: 'c', name: 'Faultiere',  color: '#F59E0B',  x: 14, y: 82, growth: 0.95 },
  { id: 'd', name: 'Koalas',     color: '#A855F7',  x: 86, y: 82, growth: 0.65 },
  { id: 'e', name: 'Giraffen',   color: '#EC4899',  x: 50, y: 12, growth: 0.78 },
  { id: 'f', name: 'Waschbären', color: '#06B6D4',  x: 50, y: 88, growth: 0.55 },
  { id: 'g', name: 'Füchse',     color: '#EF4444',  x: 22, y: 50, growth: 0.88 },
  { id: 'h', name: 'Eulen',      color: '#FBBF24',  x: 78, y: 50, growth: 0.42 },
];

// ── Page ────────────────────────────────────────────────────────────────────
export default function QQGardenPitchPage() {
  const [tick, setTick] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setTick(t => t + 1), 100);
    return () => clearInterval(iv);
  }, [running]);

  // Reset alle 30s (Loop fuer Demo)
  useEffect(() => {
    if (tick > 280) {
      const t = setTimeout(() => setTick(0), 2200);
      return () => clearTimeout(t);
    }
  }, [tick]);

  // Pro Team: aktueller Blob-Radius (in % vom Canvas-min-side)
  // wachst von 1 auf max ~22 abhaengig von growth-rate * elapsed.
  const blobs = useMemo(() => {
    return DEMO_TEAMS.map(t => {
      const r = Math.min(22, 1 + (tick * t.growth) / 14);
      return { ...t, r };
    });
  }, [tick]);

  // Periodische Sun-Zone (Bonus-Multiplier-Idee)
  const sunZone = useMemo(() => {
    if (tick < 80 || tick > 220) return null;
    const angle = (tick - 80) * 0.04;
    return {
      x: 50 + Math.cos(angle) * 22,
      y: 50 + Math.sin(angle) * 18,
      r: 14,
      pulse: Math.sin(tick * 0.18) * 0.3 + 0.7,
    };
  }, [tick]);

  return (
    <div style={{
      minHeight: '100vh', background: 'radial-gradient(ellipse at center, #0F1B2A 0%, #060A12 70%)',
      color: '#F1F5F9', fontFamily: 'Nunito, system-ui, sans-serif',
      padding: '40px 20px',
    }}>
      <style>{`
        @keyframes pitchFadeIn { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }
        @keyframes pitchPulse  { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
        @keyframes shimmer     { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 36, animation: 'pitchFadeIn 0.6s ease both' }}>
          <div style={{
            display: 'inline-block', padding: '6px 18px', borderRadius: 999,
            background: 'rgba(34,197,94,0.15)', border: '1.5px solid rgba(34,197,94,0.4)',
            fontSize: 13, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase',
            color: '#86EFAC', marginBottom: 14,
          }}>
            🌱 Pitch · Variante A · Mass-Mode
          </div>
          <h1 style={{
            fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 900, margin: '0 0 10px',
            background: 'linear-gradient(135deg, #86EFAC, #6EE7B7, #34D399)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}>
            CozyWolf Garden
          </h1>
          <p style={{
            fontSize: 'clamp(15px, 1.5vw, 19px)', color: '#94A3B8', margin: '0 auto', maxWidth: 720,
            lineHeight: 1.5,
          }}>
            Mass-Quiz-Modus für 100+ Personen. Statt Felder-Grid wächst pro richtiger Antwort
            ein leuchtender Team-Blob auf der geteilten Karte. Am Ende sieht man visuell, wer
            wie viel Raum eingenommen hat — kein Klauen, kein Druck, nur Wachstum.
          </p>
        </div>

        {/* Live-Demo Canvas */}
        <div style={{
          position: 'relative', maxWidth: 1100, margin: '0 auto 28px',
          aspectRatio: '16/9',
          borderRadius: 24,
          background: 'radial-gradient(ellipse at 50% 50%, #1A2A3F 0%, #0A1322 80%)',
          border: '2px solid rgba(34,197,94,0.18)',
          boxShadow: '0 0 80px rgba(34,197,94,0.10), 0 20px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          animation: 'pitchFadeIn 0.7s ease 0.1s both',
        }}>
          {/* Stars-Backdrop */}
          {[...Array(40)].map((_, i) => {
            const x = (i * 37) % 100;
            const y = (i * 71) % 100;
            const size = 1 + (i % 3);
            const opacity = 0.2 + (i % 5) * 0.12;
            return (
              <div key={i} aria-hidden style={{
                position: 'absolute', left: `${x}%`, top: `${y}%`,
                width: size, height: size, borderRadius: '50%',
                background: '#fff', opacity,
                boxShadow: `0 0 ${size * 3}px rgba(255,255,255,${opacity})`,
              }} />
            );
          })}

          {/* Sun-Zone (Bonus-Multiplier) */}
          {sunZone && (
            <div style={{
              position: 'absolute',
              left: `${sunZone.x}%`, top: `${sunZone.y}%`,
              width: `${sunZone.r * 2}%`, height: `${sunZone.r * 2 * (16 / 9)}%`,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(251,191,36,${0.30 * sunZone.pulse}) 0%, rgba(251,191,36,${0.10 * sunZone.pulse}) 50%, transparent 80%)`,
              pointerEvents: 'none',
              zIndex: 1,
            }}>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, animation: 'pitchPulse 1.6s ease-in-out infinite',
              }}>
                ☀️
              </div>
            </div>
          )}

          {/* Team-Blobs */}
          {blobs.map(b => (
            <div key={b.id} style={{
              position: 'absolute',
              left: `${b.x}%`, top: `${b.y}%`,
              width: `${b.r * 2}%`, height: `${b.r * 2 * (16 / 9)}%`,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${b.color}cc 0%, ${b.color}88 30%, ${b.color}33 60%, transparent 80%)`,
              boxShadow: `0 0 ${b.r * 1.5}px ${b.color}66`,
              transition: 'width 0.3s ease, height 0.3s ease',
              zIndex: 2,
              filter: 'blur(0.5px)',
            }}>
              {/* Team-Center-Marker */}
              {b.r > 4 && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: 2,
                  pointerEvents: 'none',
                }}>
                  <div style={{
                    fontSize: Math.min(20, b.r * 1.2), fontWeight: 900, color: '#fff',
                    textShadow: '0 2px 6px rgba(0,0,0,0.7)',
                    letterSpacing: '0.04em',
                  }}>{b.name}</div>
                  <div style={{
                    fontSize: Math.min(14, b.r * 0.7), fontWeight: 700, color: '#fff',
                    opacity: 0.85,
                    textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                  }}>+{Math.floor(b.r * 4)} Antworten</div>
                </div>
              )}
            </div>
          ))}

          {/* HUD */}
          <div style={{
            position: 'absolute', top: 14, left: 18,
            padding: '6px 14px', borderRadius: 999,
            background: 'rgba(13,10,6,0.7)', border: '1.5px solid rgba(34,197,94,0.35)',
            fontSize: 12, fontWeight: 800, color: '#86EFAC',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            backdropFilter: 'blur(6px)',
          }}>
            🌱 Garden · Runde {Math.floor(tick / 30) + 1}
          </div>

          <div style={{
            position: 'absolute', top: 14, right: 18,
            padding: '6px 14px', borderRadius: 999,
            background: 'rgba(13,10,6,0.7)', border: '1.5px solid rgba(255,255,255,0.18)',
            fontSize: 12, fontWeight: 800, color: '#cbd5e1',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            backdropFilter: 'blur(6px)',
          }}>
            👥 8 Teams · 102 Spieler
          </div>

          {/* Bottom Hint */}
          {sunZone && (
            <div style={{
              position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
              padding: '6px 16px', borderRadius: 999,
              background: 'rgba(251,191,36,0.18)', border: '1.5px solid rgba(251,191,36,0.5)',
              fontSize: 12, fontWeight: 800, color: '#FDE68A',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              animation: 'pitchPulse 1.2s ease-in-out infinite',
            }}>
              ☀️ Sonnen-Bonus aktiv — schnellstes Team verdoppelt Wachstum!
            </div>
          )}
        </div>

        {/* Demo-Controls */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <button
            onClick={() => { setTick(0); setRunning(true); }}
            style={{
              padding: '10px 22px', borderRadius: 999,
              background: 'rgba(34,197,94,0.18)',
              border: '1.5px solid rgba(34,197,94,0.5)',
              color: '#86EFAC', fontSize: 14, fontWeight: 800,
              cursor: 'pointer', letterSpacing: '0.06em',
            }}
          >
            ▶ Demo neu starten
          </button>
          <button
            onClick={() => setRunning(r => !r)}
            style={{
              marginLeft: 10,
              padding: '10px 22px', borderRadius: 999,
              background: 'rgba(255,255,255,0.05)',
              border: '1.5px solid rgba(255,255,255,0.18)',
              color: '#cbd5e1', fontSize: 14, fontWeight: 800,
              cursor: 'pointer', letterSpacing: '0.06em',
            }}
          >
            {running ? '⏸ Pause' : '▶ Weiter'}
          </button>
        </div>

        {/* Wie es funktioniert */}
        <Section title="🌱 Wie es funktioniert" delay="0.2s">
          <BulletList items={[
            '8-12 Teams (10-20 Personen pro Team) — jeder Mitspieler tippt eigenständig auf seinem Handy',
            'Jede richtige Antwort eines Team-Mitglieds = der Team-Blob wächst sichtbar',
            'Engagement zählt: bei 10/10 richtig wächst der Blob 10x so stark wie bei 1/10',
            'Keine Felder, kein Klauen — nur sichtbares organisches Wachstum',
            'Am Ende der Spielzeit: das Team mit dem größten Blob (= meiste richtige Antworten) gewinnt',
          ]} />
        </Section>

        {/* Tension-Elemente */}
        <Section title="🎭 Tension-Mechaniken (gegen Langeweile)" delay="0.3s">
          <div style={{ display: 'grid', gap: 12 }}>
            <Card emoji="☀️" title="Sonnen-Zonen (Bonus-Multiplier)" desc="Periodisch erscheint eine Sonnen-Zone an Random-Position. Erstes Team das eine Antwort dort 'platziert' (= mehrheitlich richtig hat) verdoppelt sein Wachstum bis zur nächsten Frage." />
            <Card emoji="🌗" title="Saisons" desc="Spiel hat 4 Phasen (Frühling → Sommer → Herbst → Winter). Jede Saison verändert Look + Gameplay-Modifier (z. B. 'Winter: nur größte Teams wachsen weiter')." />
            <Card emoji="✨" title="Spotlight-Question" desc="Alle 5 Fragen eine 'Doppelte Wachstums-Frage' mit Drama-Build-up. Macht den Sieg umkämpft bis zur letzten Sekunde." />
            <Card emoji="🌧️" title="Schrumpfen bei Inaktivität" desc="Wenn ein Team 2 Fragen in Folge keine Antworten gibt, schrumpft der Blob leicht. Verhindert dass Teams nach Vorsprung 'aussteigen'." />
          </div>
        </Section>

        {/* Pro/Con */}
        <Section title="⚖️ Pro / Con" delay="0.4s">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            <ProConCard tone="pro" title="Pro" items={[
              'Skaliert bis 200+ Personen ohne Architekturänderung',
              'Visuell wow — perfekt für Großevents (Galas, Schul-Events, Festivals)',
              'Cozy-Brand: friedlich + ästhetisch statt aggressiv-kompetitiv',
              'Jede einzelne Antwort zählt sichtbar (auch im 20er-Team)',
              'Neuer USP — kaum andere Quiz-Apps haben sowas',
            ]} />
            <ProConCard tone="con" title="Con" items={[
              'Weniger Strategie als das klassische Grid (Kein Klauen, Stapeln, Joker)',
              'Risiko: Führendes Team baut Vorsprung aus → Schluss-Spannung leidet',
              'Bedarf neuem Mod-Panel + Beamer-View (mittlerer Dev-Aufwand)',
              'Balancing zwischen "Quantität (mehr Spieler)" vs "Qualität (% richtig)" muss stimmen',
            ]} />
          </div>
        </Section>

        {/* Verwendungs-Szenarien */}
        <Section title="🎪 Wo CozyWolf Garden glänzt" delay="0.5s">
          <BulletList items={[
            'Hochzeiten / Geburtstage mit 80-150 Gästen (statt klassisches Pub-Quiz)',
            'Firmen-Galas + Weihnachtsfeiern (200+ Personen, kein 8-Teams-Cap)',
            'Schul-Events (Klassen-Battle, Schulfest, Abi-Ball)',
            'Vereinsabende (Sport-Saisonabschluss, Feuerwehr, Karneval)',
            'Festivals / Pre-Show-Entertainment (Warmup-Mode für Events)',
          ]} />
        </Section>

        {/* CTA */}
        <div style={{
          marginTop: 40, padding: '24px 32px', borderRadius: 20,
          background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))',
          border: '1.5px solid rgba(34,197,94,0.3)',
          textAlign: 'center', animation: 'pitchFadeIn 0.6s ease 0.6s both',
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.16em', color: '#86EFAC', textTransform: 'uppercase', marginBottom: 8 }}>
            Status · Pitch / Mockup
          </div>
          <div style={{ fontSize: 16, color: '#cbd5e1', lineHeight: 1.6, maxWidth: 700, margin: '0 auto' }}>
            Diese Seite zeigt nur das KONZEPT. Die Mechanik existiert noch nicht im Code.
            Geschätzter Dev-Aufwand: <b style={{ color: '#FDE68A' }}>~5-7 Tage</b> für Backend
            (Team-Score-Tracking, Sun-Zones), Beamer-View (animierter Garden),
            Team-Page-Anpassung (gleiches UI, aber Mass-Mode).
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section + Helper ───────────────────────────────────────────────────────
function Section({ title, delay, children }: { title: string; delay: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28, animation: `pitchFadeIn 0.6s ease ${delay} both` }}>
      <h2 style={{
        fontSize: 'clamp(20px, 2vw, 28px)', fontWeight: 900,
        margin: '0 0 14px', color: '#F1F5F9',
        letterSpacing: '-0.01em',
      }}>{title}</h2>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul style={{
      listStyle: 'none', padding: 0, margin: 0,
      display: 'grid', gap: 8,
    }}>
      {items.map((it, i) => (
        <li key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '10px 16px', borderRadius: 12,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          fontSize: 14, lineHeight: 1.5, color: '#cbd5e1',
        }}>
          <span style={{ color: '#86EFAC', fontWeight: 900, flexShrink: 0 }}>›</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function Card({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div style={{
      padding: '14px 18px', borderRadius: 14,
      background: 'rgba(34,197,94,0.06)',
      border: '1.5px solid rgba(34,197,94,0.18)',
      display: 'flex', gap: 14, alignItems: 'flex-start',
    }}>
      <div style={{ fontSize: 28, flexShrink: 0 }}>{emoji}</div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#86EFAC', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

function ProConCard({ tone, title, items }: { tone: 'pro' | 'con'; title: string; items: string[] }) {
  const isPro = tone === 'pro';
  const accent = isPro ? '#86EFAC' : '#FCA5A5';
  const bg = isPro ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.06)';
  const border = isPro ? 'rgba(34,197,94,0.30)' : 'rgba(239,68,68,0.25)';
  return (
    <div style={{
      padding: '16px 20px', borderRadius: 16,
      background: bg, border: `1.5px solid ${border}`,
    }}>
      <div style={{
        fontSize: 14, fontWeight: 900, letterSpacing: '0.16em',
        textTransform: 'uppercase', color: accent, marginBottom: 12,
      }}>
        {isPro ? '✓ ' : '✕ '}{title}
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
        {items.map((it, i) => (
          <li key={i} style={{
            fontSize: 13, color: '#cbd5e1', lineHeight: 1.5,
            paddingLeft: 14, position: 'relative',
          }}>
            <span style={{
              position: 'absolute', left: 0, color: accent, fontWeight: 900,
            }}>•</span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
