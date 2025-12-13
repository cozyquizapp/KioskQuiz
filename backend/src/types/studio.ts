export type QuizDraft = {
  id: string
  name: string
  description?: string
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
  updatedAt: number
}
