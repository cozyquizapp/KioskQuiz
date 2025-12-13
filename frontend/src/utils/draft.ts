const KEY = 'kiosk-quiz-play-draft'

export type PlayDraft = {
  id: string
  name: string
  structure: {
    rounds: number
    categories: { name: string; questions: number }[]
    introAt: 'start' | 'before-final' | 'off'
    rulesAt: 'start' | 'before-final' | 'off'
    mode: 'standard' | 'bingo' | 'mixed'
  }
  filters: string[]
  theme: {
    font: string
    color: string
    animation: string
    background?: string
    logoUrl?: string
  }
  description?: string
  updatedAt: number
}

export function loadPlayDraft(): PlayDraft | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as PlayDraft) : null
  } catch (e) {
    console.error('Draft konnte nicht geladen werden', e)
    return null
  }
}

export function savePlayDraft(draft: PlayDraft) {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft))
    return draft
  } catch (e) {
    console.error('Draft konnte nicht gespeichert werden', e)
    return null
  }
}
