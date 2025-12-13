import { useEffect, useState } from 'react'
import { loadApiConfig, saveApiConfig } from '../services/api'

export default function Settings() {
  const [baseUrl, setBaseUrl] = useState('')
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    const cfg = loadApiConfig()
    if (cfg?.baseUrl) setBaseUrl(cfg.baseUrl)
    if (cfg?.token) setToken(cfg.token)
  }, [])

  return (
    <div className="page">
      <h1>Einstellungen</h1>
      <p>API-Ziel für Publish/Sync setzen (optional).</p>

      <div className="form-grid">
        <div className="field">
          <label>API Base URL</label>
          <input
            placeholder="https://play.cozyquiz.app"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Token (optional)</label>
          <input
            placeholder="Bearer Token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <span className="muted-small">Wird als Authorization Header gesendet.</span>
        </div>
      </div>

      <div className="actions">
        <button
          className="btn primary"
          onClick={() => {
            const saved = saveApiConfig({ baseUrl, token: token || undefined })
            setStatus(saved ? 'Gespeichert.' : 'Speichern fehlgeschlagen')
          }}
        >
          Speichern
        </button>
        {status && <div className="pill">{status}</div>}
      </div>
    </div>
  )
}
