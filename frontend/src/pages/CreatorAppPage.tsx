import { Link } from 'react-router-dom'

const tiles = [
  { to: '/creator-wizard', title: 'Wizard', desc: 'Struktur & Fragen auswählen' },
  { to: '/presentation-creator', title: 'Präsentation', desc: 'Slides, Hintergrund, Offsets' },
  { to: '/question-editor', title: 'Fragen-Editor', desc: 'Bilder, Layout, Antworten' },
  { to: '/draft-import', title: 'Draft Import', desc: 'Studio-Export laden (Theme/Struktur)' },
]

export default function CreatorAppPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.05), transparent 40%), #0d0f14',
        color: '#e2e8f0',
        padding: '36px 22px',
      }}
    >
      <div style={{ maxWidth: 860, margin: '0 auto', display: 'grid', gap: 18 }}>
        <div>
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
            Quiz Creator
          </div>
          <h1 style={{ margin: '10px 0 6px' }}>Bau dir ein Quiz in 4 Schritten</h1>
          <p style={{ margin: 0, color: '#94a3b8' }}>
            Struktur wählen → Präsentation stylen → Fragen polieren → Draft laden/spielen.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {tiles.map((tile) => (
            <Link key={tile.to} to={tile.to} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div
                style={{
                  padding: '16px 18px',
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(0,0,0,0.2)',
                  boxShadow: '0 18px 34px rgba(0,0,0,0.35)',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 18 }}>{tile.title}</div>
                <div style={{ color: '#cbd5e1', marginTop: 6 }}>{tile.desc}</div>
                <div style={{ marginTop: 10, color: '#94a3b8', fontSize: 13 }}>{tile.to}</div>
              </div>
            </Link>
          ))}
        </div>

        <div
          style={{
            padding: '14px 16px',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Empfohlener Flow</div>
          <div style={{ color: '#cbd5e1' }}>1) Wizard • 2) Präsentation • 3) Fragen-Editor • 4) Draft Import</div>
        </div>
      </div>
    </div>
  )
}
