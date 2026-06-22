/**
 * QQShowroomPage — öffentlicher Auto-Play-Trailer „Was ist ein CozyQuiz?".
 *
 * 2026-06-22 (Wolf-Wunsch): Zwei Use-Cases — (1) unterwegs jemandem das iPhone
 * reichen und in ~30s zeigen, wie ein Quiz-Abend aussieht; (2) öffentliche
 * QR-Landing („was mache ich") für Visitenkarte/Flyer/Insta-Bio. Die echte
 * /beamer-View ist 16:9 → im Hochformat gequetscht; das hier ist eigens fürs
 * Portrait gebaut, mit Mock-Daten, loopt, mit CTA am Ende.
 *
 * Self-contained: keine schweren Imports (nicht die 16k-Beamer-Page). Route
 * /showroom, NICHT PIN-gegated.
 */
import { useState } from 'react';
import { QQ_COLORS } from '../../../shared/qqColors';
import { cozyCard, qqGlow } from '../qqStyleTokens';

const PINK = QQ_COLORS.brandPink;
const PINK_RGB = '236,72,153';

const TEAMS = [
  { name: 'Die Pinguine', emoji: '🐧', color: '#3b82f6' },
  { name: 'Faultier-Gang', emoji: '🦥', color: '#f59e0b' },
  { name: 'Koala Krew', emoji: '🐨', color: '#22c55e' },
  { name: 'Waschbären', emoji: '🦝', color: '#ec4899' },
];

const SCENES = ['intro', 'teams', 'frage', 'reveal', 'grid', 'sieger', 'cta'] as const;
const SCENE_MS = 4600;

export default function QQShowroomPage() {
  const [scene, setScene] = useState(0);
  const [paused, setPaused] = useState(false);

  const advance = () => setScene(s => (s + 1) % SCENES.length);

  return (
    <div
      onClick={() => setPaused(p => !p)}
      style={{
        position: 'fixed', inset: 0, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        fontFamily: "'Bricolage Grotesque', 'Inter', 'Nunito', system-ui, sans-serif",
        color: '#f8fafc',
        background:
          `radial-gradient(ellipse at 50% -10%, rgba(${PINK_RGB},0.16), transparent 55%), ` +
          `radial-gradient(ellipse at 85% 110%, rgba(99,102,241,0.10), transparent 55%), ` +
          `radial-gradient(ellipse at 12% 85%, rgba(${PINK_RGB},0.07), transparent 50%), ` +
          '#0A0814',
        cursor: 'pointer', userSelect: 'none',
      }}
    >
      <style>{`
        @keyframes srBarFill { from { width: 0%; } to { width: 100%; } }
        @keyframes srIn { from { opacity: 0; transform: translateY(18px) scale(0.98); } to { opacity: 1; transform: none; } }
        @keyframes srPop { 0% { opacity: 0; transform: scale(0.6); } 60% { transform: scale(1.08); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes srSlide { from { opacity: 0; transform: translateX(-26px); } to { opacity: 1; transform: none; } }
        @keyframes srFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes srConfetti { 0% { transform: translateY(-20px) rotate(0); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(120vh) rotate(540deg); opacity: 0; } }
        @keyframes srGlow { 0%,100% { box-shadow: 0 0 40px rgba(251,191,36,0.4); } 50% { box-shadow: 0 0 70px rgba(251,191,36,0.7); } }
      `}</style>

      {/* Stories-Fortschrittsbalken */}
      <div style={{
        position: 'relative', zIndex: 5,
        width: '100%', maxWidth: 460,
        display: 'flex', gap: 5,
        padding: '14px 14px 0',
      }}>
        {SCENES.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 999,
            background: 'rgba(255,255,255,0.18)', overflow: 'hidden',
          }}>
            <div
              key={`${i}-${scene}`}
              onAnimationEnd={i === scene ? advance : undefined}
              style={{
                height: '100%', borderRadius: 999, background: PINK,
                width: i < scene ? '100%' : i === scene ? '0%' : '0%',
                animation: i === scene ? `srBarFill ${SCENE_MS}ms linear forwards` : 'none',
                animationPlayState: paused ? 'paused' : 'running',
              }}
            />
          </div>
        ))}
      </div>

      {/* Szenen-Bühne (Portrait-Spalte, auf Desktop zentriert) */}
      <div style={{
        position: 'relative', zIndex: 4,
        flex: 1, width: '100%', maxWidth: 460,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '8px 22px 28px', minHeight: 0,
        textAlign: 'center',
      }}>
        <div key={scene} style={{ width: '100%', animation: 'srIn 0.6s cubic-bezier(0.22,1,0.36,1) both' }}>
          {renderScene(SCENES[scene])}
        </div>
      </div>

      {/* Pause-Hinweis */}
      <div style={{
        position: 'absolute', bottom: 14, zIndex: 6,
        fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)',
        letterSpacing: '0.02em',
      }}>
        {paused ? '▶ Tippen zum Fortsetzen' : 'CozyQuiz · tippen zum Pausieren'}
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 13, fontWeight: 900, letterSpacing: '0.22em',
      textTransform: 'uppercase', color: '#94a3b8', marginBottom: 12,
    }}>{children}</div>
  );
}

function renderScene(scene: typeof SCENES[number]) {
  switch (scene) {
    case 'intro':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <img
            src="/avatars/cozywolf/augenauf.mundauf.daumen.png"
            alt="CozyWolf"
            style={{ width: 'min(58vw, 230px)', filter: `drop-shadow(0 8px 28px rgba(${PINK_RGB},0.45))`, animation: 'srFloat 3.4s ease-in-out infinite' }}
          />
          <div style={{
            fontFamily: "'Stinger Fit', 'Bricolage Grotesque', system-ui, sans-serif",
            fontSize: 'clamp(44px, 13vw, 64px)', fontWeight: 400, letterSpacing: '0.05em',
            color: PINK, textTransform: 'uppercase', lineHeight: 0.95,
            textShadow: `0 2px 14px rgba(0,0,0,0.65), 0 0 32px rgba(${PINK_RGB},0.5)`,
          }}>CozyQuiz</div>
          <div style={{ fontSize: 'clamp(17px, 5vw, 22px)', fontWeight: 800, color: '#e2e8f0', maxWidth: 320 }}>
            Die Live-Quiz-Show für deinen Abend 🎉
          </div>
        </div>
      );

    case 'teams':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: '100%' }}>
          <Eyebrow>So läuft's</Eyebrow>
          <div style={{ fontSize: 'clamp(26px, 8vw, 36px)', fontWeight: 900, marginBottom: 6 }}>Bildet eure Teams 🎭</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 360 }}>
            {TEAMS.map((t, i) => (
              <div key={t.name} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 16px', borderRadius: 16,
                background: `${t.color}22`, border: `1.5px solid ${t.color}`,
                animation: `srSlide 0.5s cubic-bezier(0.22,1,0.36,1) ${i * 0.12}s both`,
              }}>
                <div style={{
                  width: 46, height: 46, borderRadius: '50%', background: t.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, flexShrink: 0,
                }}>{t.emoji}</div>
                <span style={{ fontSize: 19, fontWeight: 800 }}>{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'frage':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '7px 16px', borderRadius: 999, fontSize: 15, fontWeight: 900,
            background: 'rgba(139,92,246,0.18)', border: `1.5px solid ${QQ_COLORS.violet500}`,
            color: '#c4b5fd',
          }}>🌍 Geografie</div>
          <div style={{
            ...cozyCard({ bg: 'linear-gradient(180deg, #1F1A2E, #14101F)', accentHex: PINK, accentRgb: PINK_RGB }),
            padding: '28px 22px', width: '100%', maxWidth: 380,
          }}>
            <div style={{ fontSize: 'clamp(22px, 6.5vw, 30px)', fontWeight: 900, lineHeight: 1.2 }}>
              Wie hoch ist der<br />Eiffelturm?
            </div>
          </div>
          <div style={{
            width: 70, height: 70, borderRadius: '50%',
            border: `5px solid ${PINK}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 900, color: PINK, marginTop: 4,
            boxShadow: qqGlow(`rgba(${PINK_RGB},0.5)`, 28),
            animation: 'srPop 0.5s cubic-bezier(0.22,1,0.36,1) both',
          }}>20s</div>
          <div style={{ fontSize: 15, color: '#94a3b8', fontWeight: 700 }}>Jedes Team tippt am Handy ✍️</div>
        </div>
      );

    case 'reveal':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <Eyebrow>Auflösung</Eyebrow>
          <div style={{
            fontSize: 'clamp(48px, 15vw, 80px)', fontWeight: 900, color: QQ_COLORS.amber400,
            textShadow: '0 0 30px rgba(251,191,36,0.45)', lineHeight: 1,
            animation: 'srPop 0.6s cubic-bezier(0.22,1,0.36,1) both',
          }}>330 m</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 22px', borderRadius: 16,
            background: '#3b82f622', border: '2px solid #3b82f6',
            animation: 'srIn 0.5s 0.3s both',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: '#3b82f6',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
            }}>🐧</div>
            <span style={{ fontSize: 19, fontWeight: 900 }}>Die Pinguine</span>
            <span style={{ fontSize: 24, color: QQ_COLORS.green500 }}>✓</span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#22c55e' }}>am nächsten dran — Punkt! 🎯</div>
        </div>
      );

    case 'grid':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ fontSize: 'clamp(24px, 7.5vw, 34px)', fontWeight: 900 }}>Erobert das Spielfeld 🗺️</div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
            width: 'min(72vw, 300px)',
          }}>
            {GRID.map((cell, i) => (
              <div key={i} style={{
                aspectRatio: '1', borderRadius: 12,
                background: cell ? `${cell}` : 'rgba(255,255,255,0.06)',
                border: cell ? `2px solid ${cell}` : '2px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
                animation: cell ? `srPop 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.04}s both` : 'none',
                boxShadow: cell ? `0 0 16px ${cell}88` : 'none',
              }}>{cell ? GRID_EMOJI[cell] : ''}</div>
            ))}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#cbd5e1', maxWidth: 320 }}>
            Felder setzen · klauen · stapeln — das größte Gebiet gewinnt.
          </div>
        </div>
      );

    case 'sieger':
      return (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} aria-hidden style={{
              position: 'absolute', top: 0, left: `${(i * 7.3) % 100}%`,
              width: 8, height: 12, borderRadius: 2,
              background: [PINK, '#3b82f6', QQ_COLORS.amber400, '#22c55e'][i % 4],
              animation: `srConfetti ${2.2 + (i % 4) * 0.5}s linear ${(i * 0.18) % 2}s infinite`,
            }} />
          ))}
          <Eyebrow>🏆 Sieger</Eyebrow>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', top: -42, left: '50%', transform: 'translateX(-50%)', fontSize: 48, animation: 'srFloat 2.4s ease-in-out infinite' }}>👑</span>
            <div style={{
              width: 130, height: 130, borderRadius: '50%', background: '#3b82f6',
              border: '6px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 70, animation: 'srGlow 3s ease-in-out infinite',
            }}>🐧</div>
          </div>
          <div style={{ fontSize: 'clamp(28px, 8vw, 38px)', fontWeight: 900, color: '#60a5fa', textShadow: '0 0 22px rgba(59,130,246,0.5)' }}>
            Die Pinguine
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0' }}>haben das größte Reich! 🎉</div>
        </div>
      );

    case 'cta':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <img
            src="/avatars/cozywolf/augenauf.haendeueberrascht.png"
            alt="CozyWolf"
            style={{ width: 'min(42vw, 170px)', filter: `drop-shadow(0 8px 24px rgba(${PINK_RGB},0.4))`, animation: 'srFloat 3.4s ease-in-out infinite' }}
          />
          <div style={{ fontSize: 'clamp(26px, 8vw, 36px)', fontWeight: 900, lineHeight: 1.15 }}>
            Lust auf ein<br />CozyQuiz? 🦊
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#cbd5e1' }}>
            Pub-Quiz · Firmen-Events · Geburtstage
          </div>
          <div style={{
            ...cozyCard({ bg: 'linear-gradient(180deg, #1F1A2E, #14101F)', accentHex: PINK, accentRgb: PINK_RGB }),
            padding: '18px 26px', marginTop: 6,
            display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
          }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: PINK }}>cozywolf.de</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0' }}>📸 @cozywolf.events</div>
          </div>
        </div>
      );
  }
}

// Mock-Grid (4×4) — ein paar erorberte Felder pro Team-Farbe.
const GRID: (string | null)[] = [
  '#3b82f6', '#3b82f6', null, '#f59e0b',
  '#3b82f6', '#22c55e', '#f59e0b', '#f59e0b',
  null, '#22c55e', '#22c55e', '#ec4899',
  '#3b82f6', null, '#ec4899', '#ec4899',
];
const GRID_EMOJI: Record<string, string> = {
  '#3b82f6': '🐧', '#f59e0b': '🦥', '#22c55e': '🐨', '#ec4899': '🦝',
};
