import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

const SLOGANS = [
  'Das Quiz für den Kiosk um die Ecke',
  'Vier Teams. Ein Grid. Null Gnade.',
  'Live. Laut. Lokal.',
  'Wissen, Glück und ein bisschen Chaos.',
];

export default function QQLandingPage() {
  const [slogan, setSlogan] = useState(SLOGANS[0]);

  useEffect(() => {
    setSlogan(SLOGANS[Math.floor(Math.random() * SLOGANS.length)]);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, #1e293b 0%, #0b0d14 55%, #050712 100%)',
      color: '#e2e8f0',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px',
      fontFamily: "'Nunito', system-ui, sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Subtle glow dots */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background:
          'radial-gradient(circle at 20% 30%, rgba(245,158,11,0.12) 0%, transparent 35%),' +
          'radial-gradient(circle at 80% 70%, rgba(59,130,246,0.10) 0%, transparent 35%),' +
          'radial-gradient(circle at 50% 90%, rgba(234,88,12,0.08) 0%, transparent 40%)',
      }} />

      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
        textAlign: 'center', maxWidth: 640,
        animation: 'fadeInUp 0.6s ease both',
      }}>
        {/* Logo */}
        <img
          src="/logo.png"
          alt="CozyWolf"
          style={{ width: 96, height: 96, objectFit: 'contain', filter: 'drop-shadow(0 8px 20px rgba(245,158,11,0.3))' }}
        />

        {/* Title */}
        <div>
          <h1 style={{
            margin: 0,
            fontSize: 'clamp(42px, 7vw, 72px)',
            fontWeight: 900,
            lineHeight: 1.05,
            background: 'linear-gradient(135deg, #F59E0B 0%, #EAB308 50%, #F97316 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}>
            Quarter Quiz
          </h1>
          <div style={{
            fontSize: 'clamp(14px, 1.8vw, 18px)',
            color: '#94a3b8',
            marginTop: 8,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}>
            by cozywolf
          </div>
        </div>

        {/* Slogan */}
        <p style={{
          margin: 0,
          fontSize: 'clamp(18px, 2.3vw, 24px)',
          color: '#cbd5e1',
          fontWeight: 600,
          lineHeight: 1.4,
        }}>
          {slogan}
        </p>

        {/* CTA */}
        <Link
          to="/team"
          style={{
            marginTop: 12,
            padding: '16px 36px',
            borderRadius: 999,
            background: 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)',
            color: '#0b0d14',
            fontSize: 18,
            fontWeight: 900,
            textDecoration: 'none',
            boxShadow: '0 10px 30px rgba(245,158,11,0.4), inset 0 2px 0 rgba(255,255,255,0.3)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            display: 'inline-flex', alignItems: 'center', gap: 10,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
          }}
        >
          🎮 Als Team beitreten
        </Link>

        {/* Info row */}
        <div style={{
          marginTop: 32,
          display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center',
          fontSize: 14, color: '#64748b', fontWeight: 600,
        }}>
          <span>🏆 Live im Kiosk</span>
          <span>📱 Mit dem Handy spielen</span>
          <span>🎬 6 Kategorien</span>
        </div>

        {/* Footnote */}
        <div style={{
          marginTop: 24, fontSize: 12, color: '#475569',
          maxWidth: 460, lineHeight: 1.5,
        }}>
          Quarter Quiz läuft live bei Events. Wenn du gerade nicht auf einer
          Veranstaltung bist, passiert auf der Team-Seite nichts — außer du
          hast eine Raumnummer vom Moderator.
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
