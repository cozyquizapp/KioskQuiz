const steps = [
  'Struktur wählen (Kategorien, Runden, Frageanzahl)',
  'Fragen auswählen oder ergänzen',
  'Präsentation layouten und Branding setzen',
  'Speichern & an Moderator / Beamer / Team ausspielen',
]

export default function Home() {
  return (
    <div className="page">
      <h1>Kiosk Quiz Studio</h1>
      <p>Baue Quizze, pflege die Fragenbank und gestalte Präsentationen in klaren Phasen.</p>

      <div className="grid">
        <div className="card">
          <h3>Quiz Flow</h3>
          <p className="muted">Geführter Creator mit Struktur → Fragen → Layout → Publish.</p>
        </div>
        <div className="card">
          <h3>Fragenbank</h3>
          <p className="muted">Fragen suchen, duplizieren, taggen und schnell editieren.</p>
        </div>
        <div className="card">
          <h3>Präsentation</h3>
          <p className="muted">Layouts, Hintergründe, Animationen und Branding je Quiz speichern.</p>
        </div>
        <div className="card">
          <h3>Stats & Export</h3>
          <p className="muted">Antwort-Verteilungen, Gewinner, PDF/PNG Export für Offline-Modus.</p>
        </div>
      </div>

      <div className="section-title">Ablauf</div>
      <div className="stack">
        {steps.map((step) => (
          <div key={step} className="pill">
            {step}
          </div>
        ))}
      </div>

      <div className="section-title">Quick Actions</div>
      <div className="grid">
        <div className="card">
          <h3>Neues Quiz</h3>
          <p className="muted">Startet im Creator mit Grundstruktur.</p>
        </div>
        <div className="card">
          <h3>Fragen prüfen</h3>
          <p className="muted">Scanne auf fehlende Bilder, Mechaniken oder veraltete Daten.</p>
        </div>
        <div className="card">
          <h3>Präsentations-Thema</h3>
          <p className="muted">Setze Farben, Fonts, Animationen und sichere als Layout.</p>
        </div>
      </div>
    </div>
  )
}
