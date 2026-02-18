const DRAFT_KEY = 'kioskquiz-play-draft'

export type PlayDraft = {
  id: string
  name: string
  structure: {
    rounds: number
    categories: { name: string; questions: number }[]
    introAt: string
    rulesAt: string
    introText: string
    rulesText: string
    mode: string
  }
  filters: unknown[]
  theme: {
    color: string
    background: string
    logoUrl: string
    font: string
    animation: string
  }
  updatedAt: number
}

export function loadPlayDraft(): PlayDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PlayDraft
  } catch {
    return null
  }
}

export function savePlayDraft(draft: PlayDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // storage full or unavailable
  }
}
