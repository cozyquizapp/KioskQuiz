export type Mode = 'standard' | 'bingo' | 'mixed'

export type CategoryBlock = {
  name: string
  questions: number
}

export type ThemeSettings = {
  font: string
  color: string
  animation: string
  background?: string
  logoUrl?: string
}

export type StructureState = {
  rounds: number
  categories: CategoryBlock[]
  introAt: 'start' | 'before-final' | 'off'
  rulesAt: 'start' | 'before-final' | 'off'
  mode: Mode
}

export type QuizDraft = {
  id: string
  name: string
  structure: StructureState
  filters: string[]
  theme: ThemeSettings
  description?: string
  updatedAt: number
}
