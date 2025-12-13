import { useRef, useState } from 'react'
import { loadPlayDraft, savePlayDraft, type PlayDraft } from '../utils/draft'

function parseFile(file: File): Promise<PlayDraft> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        resolve(data as PlayDraft)
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

export default function DraftImportPage() {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<PlayDraft | null>(loadPlayDraft())

  const handleFile = async (file?: File) => {
    if (!file) return
    try {
      const draft = await parseFile(file)
      savePlayDraft(draft)
      setLoaded(draft)
      setStatus('Draft importiert und gespeichert.')
    } catch (e) {
      console.error(e)
      setStatus('Import fehlgeschlagen. Bitte JSON prüfen.')
    }
  }

  return (
    <div className="page" style={{ padding: 20 }}>
      <h1>Draft importieren</h1>
      <p>Studio-Export (JSON) laden, damit Moderator/Beamer darauf zugreifen können.</p>

      <div style={{ marginTop: 12 }}>
        <button onClick={() => fileRef.current?.click()}>JSON wählen</button>
        <input
          type="file"
          accept="application/json"
          ref={fileRef}
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {status && <div style={{ marginTop: 8 }}>{status}</div>}
      </div>

      {loaded && (
        <div style={{ marginTop: 16 }}>
          <div>Name: {loaded.name}</div>
          <div>Kategorien: {loaded.structure.categories.length}</div>
          <div>Fragen gesamt: {loaded.structure.categories.reduce((s, c) => s + c.questions, 0)}</div>
          <div>Modus: {loaded.structure.mode}</div>
          <div>Theme: {loaded.theme.font} / {loaded.theme.animation}</div>
        </div>
      )}
    </div>
  )
}
