export interface SavedProgress {
  index: number
  wordNames: string[]
  dictId: string
}

const SESSION_KEY_PREFIX = 'session:'

function getKey(key: string, dictId: string): string {
  return `${SESSION_KEY_PREFIX}${key}:${dictId}`
}

export function saveSessionProgress(key: string, dictId: string, index: number, wordNames: string[]): void {
  if (typeof window === 'undefined' || !window.utools?.db) return
  const fullKey = getKey(key, dictId)
  const doc = window.utools.db.get(fullKey)
  window.utools.db.put({
    _id: fullKey,
    data: { index, wordNames, dictId },
    _rev: doc ? doc._rev : undefined,
  })
}

export function loadSessionProgress(key: string, dictId: string): SavedProgress {
  if (typeof window === 'undefined' || !window.utools?.db) {
    return { index: 0, wordNames: [], dictId }
  }
  const fullKey = getKey(key, dictId)
  const doc = window.utools.db.get(fullKey)
  if (doc && doc.data) {
    return doc.data as SavedProgress
  }
  return { index: 0, wordNames: [], dictId }
}
