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
    })
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, message: `Fehler: ${res.status} ${text}` }
    }
    const json = await res.json()
    return { ok: true, data: json }
  } catch (e) {
    console.error('Upload fehlgeschlagen', e)
    return { ok: false, message: 'Upload fehlgeschlagen' }
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
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/api/questions`)
    if (!res.ok) throw new Error('failed')
    const data = await res.json()
    return { ok: true, questions: data.questions ?? [] }
  } catch (e) {
    console.error('Fragen konnten nicht geladen werden', e)
    return { ok: false, questions: [] }
  }
}
