const metrics = [
  'Antwort-Verteilungen pro Frage (MC-Breakdown, richtig/falsch)',
  'Gewinner & Platzierungen pro Quiz',
  'Teilnahme-Rate / Abbruchstellen',
  'Fragen-Qualität (häufig falsch, zu leicht, Duplikate)',
]

export default function Stats() {
  return (
    <div className="page">
      <h1>Stats & Leaderboard</h1>
      <p>Automatisch aus Moderator/Beamer-Events gespeist, optional exportierbar.</p>

      <div className="grid">
        {metrics.map((item) => (
          <div className="card" key={item}>
            <h3>{item}</h3>
            <p className="muted">Messpunkt vormerken.</p>
          </div>
        ))}
      </div>

      <div className="section-title">Exports</div>
      <div className="stack">
        <div className="pill">CSV/JSON für Auswertungen</div>
        <div className="pill">PNG/PDF Highlight-Slides</div>
        <div className="pill">“Ewige Bestenliste” aus den letzten Quizzen</div>
      </div>
    </div>
  )
}
