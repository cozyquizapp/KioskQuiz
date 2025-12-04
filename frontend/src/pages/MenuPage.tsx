import { Link } from 'react-router-dom';

type LinkItem = { path: string; label: string; note?: string };

const links: LinkItem[] = [
  { path: '/admin', label: 'Admin', note: 'Quiz-Steuerung & Auswertung' },
  { path: '/moderator', label: 'Moderator (Mobile)', note: 'Remote: Timer, Slot, Frage-Sprung' },
  { path: '/beamer', label: 'Beamer', note: 'Anzeige fürs Publikum' },
  { path: '/team', label: 'Team', note: 'Teilnehmer-View / Antworten' },
  { path: '/intro', label: 'Intro & Regeln', note: 'Slides mit Begrüßung/Regeln' },
  { path: '/creator', label: 'Creator', note: 'Alle Features (Wizard, Bilder, Layout, Lösungen)' },
  { path: '/question-editor', label: 'Question Editor', note: 'Frage-Details, Bilder, Layout-Offsets' },
  { path: '/scoreboard', label: 'Scoreboard', note: 'Punkte & Bingo' }
];

const MenuPage = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.05), transparent 40%), #0d0f14',
        color: '#e2e8f0',
        padding: '40px 24px'
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '8px 14px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontSize: 12
            }}
          >
            Cozy Kiosk Quiz · Navigation
          </div>
          <h1 style={{ margin: '10px 0 6px' }}>Schnellzugriff</h1>
          <p style={{ margin: 0, color: '#94a3b8' }}>Wähle den Bereich, den du öffnen willst.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              style={{
                textDecoration: 'none',
                color: 'inherit'
              }}
            >
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.03)',
                  boxShadow: '0 16px 30px rgba(0,0,0,0.35)',
                  transition: 'transform 0.2s ease, border-color 0.2s ease'
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 16 }}>{link.label}</div>
                {link.note && <div style={{ marginTop: 4, color: '#cbd5e1', fontSize: 13 }}>{link.note}</div>}
                <div style={{ marginTop: 6, color: '#94a3b8', fontSize: 13 }}>{link.path}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MenuPage;
