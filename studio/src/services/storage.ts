/**
 * Offline-fähiger Draft-Storage mit IndexedDB + LocalStorage Fallback
 * Ermöglicht Arbeiten am Builder auch wenn der Backend offline ist
 */

const DB_NAME = 'KioskQuizStudio'
const STORE_NAME = 'drafts'

export interface StoredDraft {
  id: string
  title: string
  meta?: { language?: string; date?: number; description?: string }
  questions: any[]
  potato?: any
  blitz?: any
  updatedAt: number
  createdAt: number
  synced?: boolean // wurde zum Backend synchronisiert
}

// IndexedDB öffnen
function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

/** Alle lokalen Drafts laden (IndexedDB oder LocalStorage Fallback) */
export async function getAllDrafts(): Promise<StoredDraft[]> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    })
  } catch (e) {
    // Fallback: LocalStorage
    console.warn('IndexedDB nicht verfügbar, nutze LocalStorage', e)
    const key = 'kiosk-quiz-drafts-backup'
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  }
}

/** Einen Draft speichern */
export async function saveDraft(draft: StoredDraft): Promise<boolean> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.put({ ...draft, updatedAt: Date.now() })
      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  } catch (e) {
    // Fallback: LocalStorage
    console.warn('IndexedDB Speichern fehlgeschlagen, nutze LocalStorage', e)
    const key = `kiosk-quiz-draft-${draft.id}`
    try {
      localStorage.setItem(key, JSON.stringify(draft))
      return true
    } catch {
      return false
    }
  }
}

/** Einen Draft laden */
export async function loadDraftById(id: string): Promise<StoredDraft | null> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(id)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
  } catch (e) {
    // Fallback: LocalStorage
    console.warn('IndexedDB Laden fehlgeschlagen, nutze LocalStorage', e)
    const key = `kiosk-quiz-draft-${id}`
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  }
}

/** Draft löschen */
export async function deleteDraft(id: string): Promise<boolean> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(id)
      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  } catch (e) {
    console.warn('IndexedDB Löschen fehlgeschlagen', e)
    localStorage.removeItem(`kiosk-quiz-draft-${id}`)
    return false
  }
}

/** Alle Drafts löschen (für Cleanup) */
export async function clearAllDrafts(): Promise<boolean> {
  try {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.clear()
      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  } catch (e) {
    console.warn('IndexedDB Clear fehlgeschlagen', e)
    // LocalStorage cleanup
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('kiosk-quiz-draft-'))
    keys.forEach((k) => localStorage.removeItem(k))
    return false
  }
}
