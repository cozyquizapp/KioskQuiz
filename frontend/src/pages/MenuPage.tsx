import { Link } from 'react-router-dom';

type LinkItem = { path: string; label: string; note?: string; badge?: string };

const liveLinks: LinkItem[] = [
  { path: '/beamer', label: 'Beamer (Anzeige)', note: 'Publikum, Fragen & Slots zeigen' },
  { path: '/team', label: 'Team (Mitspielen)', note: 'Teilnehmer-View / Antworten', badge: 'QR unten' },
  { path: '/moderator', label: 'Moderator (Steuerung)', note: 'Timer, Slot, Frage starten' },
  { path: '/intro', label: 'Intro & Regeln', note: 'Pre-Show Slides / Regeln' },
  { path: '/admin', label: 'Admin (Legacy)', note: 'Nur falls Moderator nicht genutzt wird' }
];

const creationFlow: LinkItem[] = [
  { path: '/creator-wizard', label: 'Creator Wizard', note: 'Schritt 1/4 · 25 Fragen wählen' },
  { path: '/creator', label: 'Creator', note: 'Schritt 2/4 · Meta, Timer, Sprache' },
  { path: '/question-editor', label: 'Question Editor', note: 'Schritt 3/4 · Bilder, Layout, Antworten' },
  { path: '/presentation-creator', label: 'Presentation Creator', note: 'Schritt 4/4 · Slides/Hintergrund/Offsets' }
];

const getTeamUrl = () => {
  if (typeof window !== 'undefined') return `${window.location.origin}/team`;
  return 'https://play.cozyquiz.app/team';
};

const MenuPage = () => {
  const teamUrl = getTeamUrl();

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
            Cozy Kiosk Quiz | Navigation
          </div>
          <h1 style={{ margin: '10px 0 6px' }}>Schnellzugriff</h1>
          <p style={{ margin: '0 0 6px', color: '#94a3b8' }}>Waehle den Bereich, den du oeffnen willst.</p>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: 13 }}>
            Falls direkte URLs nicht laden: erst diese Seite oeffnen und hier auf den gewuenschten Link klicken
            (SPA-Routing).
          </p>
        </div>
        <div
          style={{
            marginBottom: 20,
            padding: '14px 16px',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap'
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Team-Link & QR</div>
            <div style={{ color: '#cbd5e1', fontSize: 13 }}>
              Diesen QR koennen Teams scannen, um direkt zur Team-Seite zu kommen (ohne Menü).
            </div>
            <div style={{ marginTop: 6, color: '#94a3b8', fontSize: 13 }}>{teamUrl}</div>
          </div>
          <div
            style={{
              marginLeft: 'auto',
              minWidth: 160,
              display: 'flex',
              justifyContent: 'flex-end'
            }}
          >
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(teamUrl)}`}
              alt="QR-Code fuer /team"
              style={{
                width: 140,
                height: 140,
                borderRadius: 10,
                background: 'white',
                padding: 8,
                boxShadow: '0 12px 26px rgba(0,0,0,0.35)'
              }}
            />
          </div>
        </div>
        <div style={{ display: 'grid', gap: 18 }}>
          <div
            style={{
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.03)',
              padding: '14px 16px',
              boxShadow: '0 16px 30px rgba(0,0,0,0.35)'
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Live spielen</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {liveLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: 14,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(0,0,0,0.18)',
                      boxShadow: '0 16px 30px rgba(0,0,0,0.35)',
                      transition: 'transform 0.2s ease, border-color 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{link.label}</div>
                      {link.badge && (
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: 999,
                            border: '1px solid rgba(255,255,255,0.18)',
                            fontSize: 11,
                            letterSpacing: '0.04em'
                          }}
                        >
                          {link.badge}
                        </span>
                      )}
                    </div>
                    {link.note && <div style={{ marginTop: 4, color: '#cbd5e1', fontSize: 13 }}>{link.note}</div>}
                    <div style={{ marginTop: 6, color: '#94a3b8', fontSize: 13 }}>{link.path}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div
            style={{
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.03)',
              padding: '14px 16px',
              boxShadow: '0 16px 30px rgba(0,0,0,0.35)'
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Erstellen (Flow)</div>
            <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>Empfohlene Reihenfolge 1 → 4</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {creationFlow.map((link, idx) => (
                <Link
                  key={link.path}
                  to={link.path}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: 14,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(0,0,0,0.18)',
                      boxShadow: '0 16px 30px rgba(0,0,0,0.35)',
                      transition: 'transform 0.2s ease, border-color 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{link.label}</div>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: 999,
                          border: '1px solid rgba(255,255,255,0.18)',
                          fontSize: 11,
                          letterSpacing: '0.04em'
                        }}
                      >
                        Schritt {idx + 1}/4
                      </span>
                    </div>
                    {link.note && <div style={{ marginTop: 4, color: '#cbd5e1', fontSize: 13 }}>{link.note}</div>}
                    <div style={{ marginTop: 6, color: '#94a3b8', fontSize: 13 }}>{link.path}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuPage;
