import type { WordProgress } from '@/types'
import { REVIEW_INTERVALS } from '@/types'
import { getTodayStartTime } from '@/utils/timeService'

const PROGRESS_KEY_PREFIX = 'progress:'

function getKey(dictId: string, word: string): string {
  return `${PROGRESS_KEY_PREFIX}${dictId}:${word}`
}

export function getProgress(dictId: string, word: string): WordProgress | null {
  if (typeof window === 'undefined' || !window.utools?.db) return null
  const key = getKey(dictId, word)
  const doc = window.utools.db.get(key)
  if (!doc || !doc.data) return null
  return doc.data as WordProgress
}

export function setProgress(progress: WordProgress): void {
  if (typeof window === 'undefined' || !window.utools?.db) return
  const key = getKey(progress.dict, progress.word)
  const doc = window.utools.db.get(key)
  window.utools.db.put({
    _id: key,
    data: progress,
    _rev: doc ? doc._rev : undefined,
  })
}

export function getOrCreateProgress(dictId: string, word: string): WordProgress {
  const existing = getProgress(dictId, word)
  if (existing) return existing
  return {
    word,
    dict: dictId,
    masteryLevel: 0,
    nextReviewTime: 0,
  }
}

function getNextReviewTime(masteryLevel: number): number {
  const days = REVIEW_INTERVALS[masteryLevel] ?? 1
  if (days === 0) return 0
  return getTodayStartTime() + days * 24 * 60 * 60 * 1000
}

export function updateProgress(dictId: string, word: string): WordProgress & { wasNew: boolean } {
  const progress = getOrCreateProgress(dictId, word)
  const wasNew = progress.masteryLevel === 0
  
  progress.masteryLevel = Math.min(progress.masteryLevel + 1, 7)
  progress.nextReviewTime = getNextReviewTime(progress.masteryLevel)
  
  setProgress(progress)
  
  return { ...progress, wasNew }
}

export function getAllProgress(dictId: string): WordProgress[] {
  if (typeof window === 'undefined' || !window.utools?.db) return []
  
  const allDocs = window.utools.db.allDocs()
  const prefix = `${PROGRESS_KEY_PREFIX}${dictId}:`
  
  const results: WordProgress[] = []
  for (const doc of allDocs) {
    if (doc._id && doc._id.startsWith(prefix) && doc.data) {
      results.push(doc.data as WordProgress)
    }
  }
  
  return results
}

export function getDueWords(dictId: string, wordList: string[], limit: number): string[] {
  const now = Date.now()
  const dueWords: string[] = []
  
  for (const word of wordList) {
    if (dueWords.length >= limit) break
    
    const progress = getProgress(dictId, word)
    if (progress && progress.masteryLevel > 0 && progress.masteryLevel < 7) {
      if (progress.nextReviewTime <= now) {
        dueWords.push(word)
      }
    }
  }
  
  return dueWords
}

export function getNewWords(dictId: string, wordList: string[], limit: number): string[] {
  const newWords: string[] = []
  
  for (const word of wordList) {
    if (newWords.length >= limit) break
    
    const progress = getProgress(dictId, word)
    if (!progress || progress.masteryLevel === 0) {
      newWords.push(word)
    }
  }
  
  return newWords
}

export function getProgressStats(dictId: string): {
  total: number
  learned: number
  mastered: number
  due: number
} {
  const allProgress = getAllProgress(dictId)
  const now = Date.now()
  
  let learned = 0
  let mastered = 0
  let due = 0
  
  for (const p of allProgress) {
    if (p.masteryLevel > 0) learned++
    if (p.masteryLevel === 7) mastered++
    if (p.masteryLevel > 0 && p.masteryLevel < 7 && p.nextReviewTime <= now) due++
  }
  
  return {
    total: allProgress.length,
    learned,
    mastered,
    due,
  }
}
