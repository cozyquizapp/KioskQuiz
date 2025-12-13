import { useRef, useState } from 'react'
import { loadDraft, saveDraft } from '../services/quizzes'
import type { QuizDraft } from '../types/quiz'

function parseFile(file: File): Promise<QuizDraft> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        resolve(data as QuizDraft)
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

export default function Import() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<QuizDraft | null>(loadDraft())

  const handleFile = async (file?: File) => {
    if (!file) return
    try {
      const draft = await parseFile(file)
      saveDraft({
        structure: draft.structure,
        filters: draft.filters,
        theme: draft.theme,
        name: draft.name,
        description: draft.description,
      })
      setLoaded(draft)
      setStatus('Import erfolgreich und als Draft gespeichert.')
    } catch (e) {
      console.error(e)
      setStatus('Import fehlgeschlagen. Bitte JSON prüfen.')
    }
  }

  return (
    <div className="page">
      <h1>Import</h1>
      <p>Lade einen gespeicherten Quiz-Draft (JSON), um weiterzubearbeiten oder im Creator zu öffnen.</p>

      <div className="card">
        <div className="actions">
          <button className="btn primary" onClick={() => inputRef.current?.click()}>
            JSON Datei wählen
          </button>
          <input
            type="file"
            accept="application/json"
            ref={inputRef}
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {status && <div className="pill">{status}</div>}
        </div>
        {loaded && (
          <div className="stack">
            <div className="pill">Name: {loaded.name}</div>
            <div className="pill">Kategorien: {loaded.structure.categories.length}</div>
            <div className="pill">Fragen (Summe): {loaded.structure.categories.reduce((s, c) => s + c.questions, 0)}</div>
          </div>
        )}
      </div>
    </div>
  )
}
