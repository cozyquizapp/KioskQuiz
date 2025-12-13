const controls = [
  'Layouts pro Slide-Typ (Frage, Antwort, Kategorie-Bumper, Intro/Regeln)',
  'Farben & Hintergründe (Bilder, Videos, Verläufe)',
  'Schriften & Größen pro Slot',
  'Animationen/Transitions und Dauer',
  'Overlay-Elemente (Logo, Timer, Punkteanzeige)',
]

export default function Presentation() {
  return (
    <div className="page">
      <h1>Präsentation</h1>
      <p>Beamer-Layouts, Animationen und Branding pro Quiz speichern.</p>

      <div className="grid">
        {controls.map((item) => (
          <div className="card" key={item}>
            <h3>{item}</h3>
            <p className="muted">Direkt anpassbar im Präsentations-Creator.</p>
          </div>
        ))}
      </div>

      <div className="section-title">Preview & Export</div>
      <div className="stack">
        <div className="pill">Live-Preview im Browser</div>
        <div className="pill">PNG/PDF Export für Offline/Whiteboard</div>
        <div className="pill">Themen speichern & wiederverwenden</div>
      </div>
    </div>
  )
}
