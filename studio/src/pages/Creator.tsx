const phases = [
  {
    title: '1) Struktur',
    body: 'Kategorien, Rundenzahl, Fragenanzahl, Misch- vs. Bingo-Modus, Intro/Regeln an Position setzen.',
  },
  {
    title: '2) Fragen wählen',
    body: 'Aus Katalog picken, Tags/Schwierigkeit filtern, fehlende Mechaniken blocken, neue Fragen inline anlegen.',
  },
  {
    title: '3) Präsentation',
    body: 'Layouts, Farben, Schriften, Animationen, Medien und Reihenfolge pro Slide verfeinern.',
  },
  {
    title: '4) Publish',
    body: 'Quiz speichern, Version taggen, an Moderator/Beamer/Team freigeben, PDF/PNG Export optional.',
  },
]

const quickFilters = ['Frisch (letzte 60 Tage)', 'Bildpflicht für Bild-Runden', 'Mechanik gesetzt', 'Keine Duplikate']

export default function Creator() {
  return (
    <div className="page">
      <h1>Quiz Creator</h1>
      <p>Geführter Flow, damit das Bauen schnell und “satisfying” bleibt.</p>

      <div className="grid">
        {phases.map((phase) => (
          <div className="card" key={phase.title}>
            <h3>{phase.title}</h3>
            <p className="muted">{phase.body}</p>
          </div>
        ))}
      </div>

      <div className="section-title">Default-Checks</div>
      <div className="stack">
        {quickFilters.map((item) => (
          <div className="pill" key={item}>
            {item}
          </div>
        ))}
      </div>

      <div className="section-title">Nächste Aktionen</div>
      <div className="grid">
        <div className="card">
          <h3>Wizard starten</h3>
          <p className="muted">Mit Struktur beginnen und Schritt für Schritt geführt werden.</p>
        </div>
        <div className="card">
          <h3>Vorlage duplizieren</h3>
          <p className="muted">Bestehendes Quiz als Basis nutzen und nur Fragen austauschen.</p>
        </div>
        <div className="card">
          <h3>Live-Check</h3>
          <p className="muted">Intro & Regeln korrekt positioniert? Beamer/Team-Routen vorhanden?</p>
        </div>
      </div>
    </div>
  )
}
