export type ApiConfig = {
  baseUrl: string
  token?: string
}

const KEY = 'kiosk-quiz-api-config'

export function loadApiConfig(): ApiConfig | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ApiConfig) : null
  } catch (e) {
    console.error('API Config konnte nicht geladen werden', e)
    return null
  }
}

export function saveApiConfig(config: ApiConfig) {
  try {
    localStorage.setItem(KEY, JSON.stringify(config))
    return config
  } catch (e) {
    console.error('API Config konnte nicht gespeichert werden', e)
    return null
  }
}

export async function uploadDraft(draft: unknown) {
  const cfg = loadApiConfig()
  if (!cfg?.baseUrl) {
    return { ok: false, message: 'Kein API-Endpoint gesetzt' }
  }
  try {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/api/studio/quizzes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {}),
      },
      body: JSON.stringify(draft),
      signal: AbortSignal.timeout(5000) // 5s timeout, damit es nicht ewig hängt
    })
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, message: `Fehler: ${res.status} ${text}` }
    }
    const json = await res.json()
    return { ok: true, data: json }
  } catch (e) {
    console.error('Upload fehlgeschlagen', e)
    return { ok: false, message: 'Upload fehlgeschlagen (Server offline?)', offline: true }
  }
}

export type QuestionSummary = {
  id: string
  category: string
  text: string
  hasImage?: boolean
  lastUsedAt?: string | null
}

export async function fetchQuestionsApi(): Promise<{ ok: boolean; questions: QuestionSummary[] }> {
  const cfg = loadApiConfig()
  if (!cfg?.baseUrl) {
    return { ok: false, questions: [] }
  }
  try {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/api/questions`, {
      signal: AbortSignal.timeout(5000)
    })
    if (!res.ok) throw new Error('failed')
    const data = await res.json()
    return { ok: true, questions: data.questions ?? [] }
  } catch (e) {
    console.error('Fragen konnten nicht geladen werden (Server offline?)', e)
    return { ok: false, questions: [] }
  }
}

/** Cozy60 Drafts vom Backend laden (mit Offline-Fallback auf LocalStorage) */
export async function fetchCozyDraftsApi(): Promise<{ drafts: any[]; offline?: boolean }> {
  const cfg = loadApiConfig()
  if (!cfg?.baseUrl) {
    return { drafts: [], offline: true }
  }
  try {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/api/studio/cozy60`, {
      signal: AbortSignal.timeout(5000)
    })
    if (!res.ok) throw new Error('failed')
    const data = await res.json()
    // Speichere die Drafts lokal, falls Backend später offline geht
    if (data.drafts?.length) {
      localStorage.setItem('cozy-drafts-backup', JSON.stringify(data.drafts))
    }
    return { drafts: data.drafts ?? [] }
  } catch (e) {
    console.error('Drafts von Backend fehlgeschlagen, nutze lokalen Cache', e)
    // Fallback auf lokal gespeicherte Drafts
    const backup = localStorage.getItem('cozy-drafts-backup')
    return { drafts: backup ? JSON.parse(backup) : [], offline: true }
  }
}
