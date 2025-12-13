import type { QuizDraft, StructureState, ThemeSettings } from '../types/quiz'

const KEY = 'kiosk-quiz-studio-draft'

export function loadDraft(): QuizDraft | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (e) {
    console.error('Draft konnte nicht geladen werden', e)
    return null
  }
}

export function saveDraft(partial: Partial<QuizDraft> & { structure: StructureState; filters: string[]; theme: ThemeSettings }) {
  const existing = loadDraft()
  const draft: QuizDraft = {
    id: existing?.id ?? 'draft-1',
    name: existing?.name ?? 'Neues Quiz',
    updatedAt: Date.now(),
    structure: partial.structure,
    filters: partial.filters,
    theme: partial.theme,
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(draft))
  } catch (e) {
    console.error('Draft konnte nicht gespeichert werden', e)
  }
  return draft
}

export function publishDraft(draft: QuizDraft) {
  // Placeholder: hier später API-Call/Upload einbauen
  console.info('Publish Draft', draft)
  return { ok: true, id: draft.id }
}
