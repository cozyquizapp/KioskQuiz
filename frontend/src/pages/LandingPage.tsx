export default function LandingPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg)',
      color: '#e2e8f0',
      fontFamily: 'var(--font)',
      position: 'relative'
    }}>
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Hero Section */}
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '100px 20px 80px' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <img 
              src="/logo.png" 
              alt="CozyQuiz Logo"
              style={{
                height: 180,
                marginBottom: 40,
                display: 'block',
                marginLeft: 'auto',
                marginRight: 'auto',
                filter: 'drop-shadow(0 6px 20px rgba(34, 211, 238, 0.4))',
                animation: 'float-parallax 6s ease-in-out infinite'
              }}
            />
            <h1 style={{ 
              fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', 
              fontWeight: 800, 
              marginBottom: 24,
              lineHeight: 1.2
            }}>
              CozyQuiz
            </h1>
            <p style={{ 
              fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)', 
              opacity: 0.95, 
              maxWidth: 700, 
              margin: '0 auto 48px',
              lineHeight: 1.5,
              color: '#e2e8f0'
            }}>
              Das interaktive Live-Quiz für dein Café oder deinen Space.<br/>
              Deine Gäste spielen mit – wir moderieren.
            </p>
          </div>

          {/* Quick Features */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
            gap: 20,
            marginBottom: 60
          }}>
            <div className="card-tilt" style={{
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: 12,
              padding: 24,
              border: '1px solid rgba(148, 163, 184, 0.2)',
              textAlign: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#22d3ee' }}>Live & Interaktiv</h3>
              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>Teams spielen auf Smartphones, Beamer zeigt live Ergebnisse</p>
            </div>
            <div className="card-tilt" style={{
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: 12,
              padding: 24,
              border: '1px solid rgba(148, 163, 184, 0.2)',
              textAlign: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🎤</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#22d3ee' }}>Mit Moderator</h3>
              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>Wir bringen die Stimmung und führen durchs Quiz</p>
            </div>
            <div className="card-tilt" style={{
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: 12,
              padding: 24,
              border: '1px solid rgba(148, 163, 184, 0.2)',
              textAlign: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✨</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#22d3ee' }}>Unvergesslich</h3>
              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>Gäste bleiben länger, kommen wieder, erzählen weiter</p>
            </div>
          </div>

          {/* Upcoming Events Section */}
          <div className="card-tilt" style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(74, 222, 128, 0.3)',
            borderRadius: 16,
            padding: 48,
            marginBottom: 60,
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ 
              fontSize: 'clamp(1.5rem, 3vw, 2rem)', 
              marginBottom: 24,
              fontWeight: 700,
              color: '#4ade80',
              textAlign: 'center'
            }}>
              🎯 Nächste Quiz-Events
            </h2>
            <p style={{
              fontSize: 16,
              color: '#cbd5e1',
              marginBottom: 32,
              lineHeight: 1.6,
              textAlign: 'center'
            }}>
              Checke hier ab, wo das nächste CozyQuiz stattfindet!
            </p>
            
            {/* Event Example */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.5)',
              borderRadius: 12,
              padding: 32,
              border: '1px solid rgba(148, 163, 184, 0.2)'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: 24,
                alignItems: 'center'
              }}>
                <div style={{
                  fontSize: 48,
                  lineHeight: 1
                }}>📍</div>
                <div>
                  <h3 style={{
                    fontSize: 20,
                    fontWeight: 700,
                    marginBottom: 8,
                    color: '#e2e8f0'
                  }}>
                    Demnächst verfügbar
                  </h3>
                  <p style={{
                    fontSize: 14,
                    color: '#94a3b8',
                    marginBottom: 4
                  }}>
                    📅 Termin wird bekannt gegeben
                  </p>
                  <p style={{
                    fontSize: 14,
                    color: '#94a3b8'
                  }}>
                    📌 Location wird bekannt gegeben
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '2px solid rgba(34, 211, 238, 0.3)',
            borderRadius: 16,
            padding: 48,
            textAlign: 'center'
          }}>
            <h2 style={{ 
              fontSize: 'clamp(1.5rem, 3vw, 2rem)', 
              marginBottom: 16,
              fontWeight: 700,
              color: '#22d3ee'
            }}>
              Bring CozyQuiz in deine Location
            </h2>
            <p style={{
              fontSize: 16,
              color: '#cbd5e1',
              marginBottom: 32,
              lineHeight: 1.6
            }}>
              Interessiert? Wir beraten dich gerne und finden den perfekten Quiz-Termin für deinen Space.
            </p>
            <a 
              href="mailto:cozyquiz.app@gmail.com"
              style={{
                display: 'inline-block',
                padding: '16px 48px',
                background: '#22d3ee',
                color: '#0b0d14',
                textDecoration: 'none',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 18,
                boxShadow: '0 8px 24px rgba(34, 211, 238, 0.4)',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              📧 cozyquiz.app@gmail.com
            </a>
          </div>
        </div>


      </div>
    </div>
  );
}
