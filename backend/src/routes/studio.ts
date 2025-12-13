import { Router, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { QuizDraft } from '../types/studio'

const DATA_DIR = path.join(__dirname, '..', 'data')
const STORE_PATH = path.join(DATA_DIR, 'studioDrafts.json')

let drafts: QuizDraft[] = []

const loadDrafts = () => {
  try {
    if (fs.existsSync(STORE_PATH)) {
      drafts = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'))
    }
  } catch {
    drafts = []
  }
}

const persistDrafts = () => {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(STORE_PATH, JSON.stringify(drafts, null, 2), 'utf-8')
  } catch {
    // ignore
  }
}

loadDrafts()

const router = Router()

router.post('/quizzes', (req: Request, res: Response) => {
  const draft = req.body as QuizDraft
  if (!draft?.id) {
    return res.status(400).json({ ok: false, message: 'Missing id' })
  }
  const existing = drafts.find((d) => d.id === draft.id)
  if (existing) {
    Object.assign(existing, draft)
  } else {
    drafts.push(draft)
  }
  persistDrafts()
  return res.json({ ok: true, id: draft.id, updatedAt: Date.now() })
})

router.get('/quizzes/:id', (req: Request, res: Response) => {
  const draft = drafts.find((d) => d.id === req.params.id)
  if (!draft) return res.status(404).json({ ok: false, message: 'Not found' })
  return res.json({ ok: true, draft })
})

router.get('/quizzes', (_req: Request, res: Response) => {
  return res.json({ ok: true, drafts })
})

export default router
