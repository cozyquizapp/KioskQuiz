const pipelines = [
  'Duplicate & Edit: sichere Varianten für unterschiedliche Kategorien',
  'Bild- und Medien-Check: Pflichtfelder erzwingen pro Mechanik',
  'Frische-Flag: markiere alte Fragen (z. B. >90 Tage) für Austausch',
  'Tagging: Kategorie, Schwierigkeit, Mechanik, Sprache',
]

export default function QuestionEditor() {
  return (
    <div className="page">
      <h1>Fragenbank</h1>
      <p>Suche, filtere und poliere Fragen, bevor sie in neue Quizze wandern.</p>

      <div className="grid">
        {pipelines.map((item) => (
          <div className="card" key={item}>
            <h3>{item}</h3>
            <p className="muted">Workflow-Schritt vorbereiten.</p>
          </div>
        ))}
      </div>

      <div className="section-title">Geplante Checks</div>
      <div className="stack">
        <div className="pill">MC/Mechanik gesetzt</div>
        <div className="pill">Bilder/Audio vorhanden (falls benötigt)</div>
        <div className="pill">Keine Duplikate im aktuellen Quiz</div>
        <div className="pill">Tags & Schwierigkeitsgrad gepflegt</div>
      </div>
    </div>
  )
}
