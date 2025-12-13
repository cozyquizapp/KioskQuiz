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

export function saveDraft(
  partial: Partial<QuizDraft> & { structure: StructureState; filters: string[]; theme: ThemeSettings; name: string },
) {
  const existing = loadDraft()
  const draft: QuizDraft = {
    id: existing?.id ?? 'draft-1',
    name: partial.name ?? existing?.name ?? 'Neues Quiz',
    description: partial.description ?? existing?.description,
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

export function exportDraftFile(draft: QuizDraft) {
  try {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${draft.name || 'quiz-draft'}.json`
    link.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('Export fehlgeschlagen', e)
  }
}
