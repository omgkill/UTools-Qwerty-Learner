import type { DailyRecord } from '@/types'
import { getTodayDate } from '@/utils/timeService'

const DAILY_KEY_PREFIX = 'daily:'

function getKey(dictId: string, date: string): string {
  return `${DAILY_KEY_PREFIX}${dictId}:${date}`
}

export function getDailyRecord(dictId: string, date: string): DailyRecord | null {
  if (typeof window === 'undefined' || !window.utools?.db) return null
  const key = getKey(dictId, date)
  const doc = window.utools.db.get(key)
  if (!doc || !doc.data) return null
  return doc.data as DailyRecord
}

export function setDailyRecord(record: DailyRecord): void {
  if (typeof window === 'undefined' || !window.utools?.db) return
  const key = getKey(record.dict, record.date)
  const doc = window.utools.db.get(key)
  window.utools.db.put({
    _id: key,
    data: record,
    _rev: doc ? doc._rev : undefined,
  })
}

export function getOrCreateDailyRecord(dictId: string, date: string): DailyRecord {
  const existing = getDailyRecord(dictId, date)
  if (existing) return existing
  return {
    dict: dictId,
    date,
    learnedCount: 0,
    reviewedCount: 0,
    masteredCount: 0,
    todayWords: [],
    wordTypes: {},
  }
}

export function getTodayRecord(dictId: string): DailyRecord {
  return getOrCreateDailyRecord(dictId, getTodayDate())
}

export function addLearnedWord(dictId: string, word: string, isNew: boolean): DailyRecord {
  const record = getTodayRecord(dictId)

  if (!record.todayWords.includes(word)) {
    record.todayWords.push(word)
  }

  // 存储单词的学习类型
  record.wordTypes[word] = isNew ? 'new' : 'review'

  if (isNew) {
    record.learnedCount++
  } else {
    record.reviewedCount++
  }

  setDailyRecord(record)
  return record
}

export function addMasteredWord(dictId: string): DailyRecord {
  const record = getTodayRecord(dictId)
  record.masteredCount++
  setDailyRecord(record)
  return record
}

export function getDailyRecords(dictId: string): DailyRecord[] {
  if (typeof window === 'undefined' || !window.utools?.db) return []
  
  const allDocs = window.utools.db.allDocs()
  const prefix = `${DAILY_KEY_PREFIX}${dictId}:`
  
  const results: DailyRecord[] = []
  for (const doc of allDocs) {
    if (doc._id && doc._id.startsWith(prefix) && doc.data) {
      results.push(doc.data as DailyRecord)
    }
  }
  
  return results.sort((a, b) => b.date.localeCompare(a.date))
}

export function getTodayWords(dictId: string): string[] {
  const record = getTodayRecord(dictId)
  return record.todayWords
}

export function hasLearnedToday(dictId: string, word: string): boolean {
  const record = getTodayRecord(dictId)
  return record.todayWords.includes(word)
}
