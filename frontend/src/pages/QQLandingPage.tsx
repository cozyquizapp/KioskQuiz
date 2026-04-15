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
        maxWidth: 900, margin: '0 auto',
        padding: '56px 24px 80px',
        display: 'flex', flexDirection: 'column', gap: 56,
        animation: 'fadeInUp 0.6s ease both',
      }}>

        {/* ── Hero ── */}
        <section style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22,
          textAlign: 'center',
        }}>
          <img
            src="/logo.png"
            alt="CozyWolf"
            style={{ width: 128, height: 128, objectFit: 'contain', filter: 'drop-shadow(0 8px 20px rgba(245,158,11,0.3))' }}
          />

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

          <p style={{
            margin: 0,
            fontSize: 'clamp(18px, 2.3vw, 24px)',
            color: '#cbd5e1',
            fontWeight: 600,
            lineHeight: 1.4,
            maxWidth: 620,
          }}>
            {slogan}
          </p>

          <div style={{
            marginTop: 10,
            display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center',
            fontSize: 14, color: '#94a3b8', fontWeight: 700,
          }}>
            <Chip>🏆 Live-Quiz-Show</Chip>
            <Chip>📱 Teams spielen am Handy</Chip>
            <Chip>🎬 Individuelle Fragen</Chip>
          </div>
        </section>

        {/* ── What is it / For Partners ── */}
        <section style={cardStyle}>
          <SectionTitle>🎤 Für Veranstalter &amp; Partner</SectionTitle>
          <p style={paragraph}>
            <strong style={{ color: '#F1F5F9' }}>Quarter Quiz</strong> ist eine
            moderierte Live-Quiz-Show für Bars, Kioske, Firmenfeiern,
            Geburtstage, Tagungen — überall dort, wo 8–20 Leute zusammenkommen
            und einen Abend mit Tiefgang und Lachen wollen.
          </p>
          <p style={paragraph}>
            Ihr braucht nur einen Beamer oder großen Bildschirm. Ich bringe
            die Technik, die Fragen und die Moderation mit. Die Teams spielen
            mit ihrem eigenen Handy — keine App nötig, einfach QR-Code
            scannen und los geht's.
          </p>

          <div style={featureGrid}>
            <Feature emoji="🎯" title="Maßgeschneidert">
              Fragen zum Anlass, zum Betrieb, zum Geburtstagskind — auf Wunsch
              mit Insidern und Fotos.
            </Feature>
            <Feature emoji="🎮" title="6 Kategorien">
              Schätzchen, Mu-Cho, 10-von-10, Bunte Tüte (Top-5, Imposter,
              Reihenfolge, Karte), Picture-This — nie dieselbe Runde zweimal.
            </Feature>
            <Feature emoji="⚡" title="Plug &amp; Play">
              Ich komme eine Stunde vor Beginn, stelle auf, und in 90 Minuten
              ist alles gelaufen.
            </Feature>
            <Feature emoji="🏟️" title="Bis 5 Teams">
              Von der kleinen Runde bis zur ausgebuchten Bar — 2 bis 5 Teams.
            </Feature>
          </div>
        </section>

        {/* ── Next Event ── */}
        <section style={{ ...cardStyle, textAlign: 'center' }}>
          <SectionTitle>📅 Nächstes Event</SectionTitle>
          <div style={{
            padding: '28px 20px', borderRadius: 18,
            background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(249,115,22,0.08))',
            border: '1.5px dashed rgba(245,158,11,0.4)',
          }}>
            <div style={{
              fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 900,
              color: '#FBBF24', letterSpacing: '0.02em',
            }}>
              Bald verfügbar
            </div>
            <div style={{ marginTop: 10, fontSize: 15, color: '#cbd5e1', fontWeight: 600 }}>
              Termine für öffentliche Quiz-Abende werden hier und auf Instagram
              angekündigt.
            </div>
          </div>
        </section>

        {/* ── Contact ── */}
        <section style={cardStyle}>
          <SectionTitle>💌 Quiz buchen oder Hallo sagen</SectionTitle>
          <p style={paragraph}>
            Lust auf einen Quiz-Abend bei euch? Schreibt mir — gerne mit
            Datum, ungefährer Teamzahl und dem Anlass. Ich melde mich
            schnellstmöglich mit Details &amp; Preisen.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            <ContactRow
              href="mailto:cozyquiz.app@gmail.com"
              emoji="📧"
              label="E-Mail"
              value="cozyquiz.app@gmail.com"
            />
            <ContactRow
              href="https://instagram.com/cozywolf.events"
              emoji="📸"
              label="Instagram"
              value="@cozywolf.events"
            />
          </div>
        </section>

        {/* ── Footnote ── */}
        <div style={{
          textAlign: 'center', fontSize: 12, color: '#475569',
          maxWidth: 600, margin: '0 auto', lineHeight: 1.6,
        }}>
          Teams, die auf einer laufenden Veranstaltung spielen, erhalten den
          Beitritts-Link direkt vom Moderator.
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

/* ── small building blocks ────────────────────────────────────────────────── */

const cardStyle: React.CSSProperties = {
  padding: 'clamp(22px, 3.5vw, 36px)',
  borderRadius: 22,
  background: 'rgba(255,255,255,0.03)',
  border: '1.5px solid rgba(255,255,255,0.08)',
  boxShadow: '0 20px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)',
};

const paragraph: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: 'clamp(15px, 1.6vw, 17px)',
  color: '#cbd5e1',
  lineHeight: 1.6,
  fontWeight: 500,
};

const featureGrid: React.CSSProperties = {
  marginTop: 20,
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 14,
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      margin: '0 0 14px',
      fontSize: 'clamp(20px, 2.4vw, 26px)',
      fontWeight: 900,
      color: '#F1F5F9',
      letterSpacing: '-0.01em',
    }}>
      {children}
    </h2>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      padding: '6px 14px', borderRadius: 999,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      {children}
    </span>
  );
}

function Feature({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{
      padding: 16, borderRadius: 14,
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 8 }}>{emoji}</div>
      <div style={{ fontSize: 15, fontWeight: 900, color: '#F1F5F9', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13.5, color: '#94a3b8', fontWeight: 500, lineHeight: 1.5 }}>
        {children}
      </div>
    </div>
  );
}

function ContactRow({ href, emoji, label, value }: { href: string; emoji: string; label: string; value: string }) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 18px', borderRadius: 14,
        background: 'rgba(245,158,11,0.08)',
        border: '1.5px solid rgba(245,158,11,0.25)',
        textDecoration: 'none', color: '#F1F5F9',
        fontWeight: 700,
        transition: 'background 0.2s, border-color 0.2s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(245,158,11,0.14)';
        (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(245,158,11,0.5)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(245,158,11,0.08)';
        (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(245,158,11,0.25)';
      }}
    >
      <span style={{ fontSize: 24 }}>{emoji}</span>
      <span style={{ fontSize: 12, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 800 }}>
        {label}
      </span>
      <span style={{ marginLeft: 'auto', fontSize: 16, color: '#FBBF24', fontWeight: 800 }}>
        {value}
      </span>
    </a>
  );
}
