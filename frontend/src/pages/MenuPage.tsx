import { Link } from 'react-router-dom'

type LinkItem = { path: string; label: string; note?: string }

const liveLinks: LinkItem[] = [
  { path: '/beamer', label: 'Beamer (Anzeige)', note: 'Publikum, Fragen & Slots zeigen' },
  { path: 'https://play.cozyquiz.app/team', label: 'Team (Mitspielen)', note: 'Teilnehmer-View / Antworten' },
  { path: '/moderator', label: 'Moderator (Steuerung)', note: 'Timer, Slot, Frage starten' },
  { path: '/intro', label: 'Intro & Regeln', note: 'Pre-Show Slides / Regeln' },
  { path: '/admin', label: 'Admin (Legacy)', note: 'Nur falls Moderator nicht genutzt wird' },
]

const creationFlow: LinkItem[] = [
  { path: '/baukasten', label: 'Baukasten', note: 'Alles in einem Flow (Struktur, Theme, Slides, Publish)' },
  { path: '/creator-canvas', label: 'Creator Canvas (alt)', note: 'Älterer Flow, falls gebraucht' },
]

const metaLinks: LinkItem[] = [{ path: '/stats', label: 'Stats & Leaderboard', note: 'Letzte Runs & Frage-Verteilungen' }]

const CardList = ({ title, subtitle, links }: { title: string; subtitle?: string; links: LinkItem[] }) => (
  <div
    style={{
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.12)',
      background: 'rgba(255,255,255,0.03)',
      padding: '14px 16px',
      boxShadow: '0 16px 30px rgba(0,0,0,0.35)',
    }}
  >
    <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
    {subtitle && (
      <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>
        {subtitle}
      </div>
    )}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
      {links.map((link) => (
        <Link key={link.path} to={link.path} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(0,0,0,0.18)',
              boxShadow: '0 16px 30px rgba(0,0,0,0.35)',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{link.label}</div>
            </div>
            {link.note && <div style={{ marginTop: 4, color: '#cbd5e1', fontSize: 13 }}>{link.note}</div>}
            <div style={{ marginTop: 6, color: '#94a3b8', fontSize: 13 }}>{link.path}</div>
          </div>
        </Link>
      ))}
    </div>
  </div>
)

const MenuPage = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.05), transparent 40%), #0d0f14',
        color: '#e2e8f0',
        padding: '40px 24px',
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
              fontSize: 12,
            }}
          >
            Cozy Kiosk Quiz | Navigation
          </div>
          <h1 style={{ margin: '10px 0 6px' }}>Schnellzugriff</h1>
          <p style={{ margin: '0 0 6px', color: '#94a3b8' }}>Waehle den Bereich, den du oeffnen willst.</p>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: 13 }}>
            Falls direkte URLs nicht laden: erst diese Seite oeffnen und hier auf den gewuenschten Link klicken (SPA-Routing).
          </p>
        </div>

        <div style={{ display: 'grid', gap: 18 }}>
          <CardList title="Live spielen" links={liveLinks} />
          <CardList title="Erstellen (Flow)" subtitle="Empfohlene Reihenfolge 1 -> 4" links={creationFlow} />
          <CardList title="Meta" subtitle="Auswertung & Zusatztools" links={metaLinks} />
        </div>
      </div>
    </div>
  )
}

export default MenuPage

