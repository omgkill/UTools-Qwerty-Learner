import type { IDailyRecord, IWordProgress } from './progress'
import { DailyRecord, WordProgress } from './progress'
import type { IWordRecord, LetterMistakes } from './record'
import { WordRecord } from './record'
import type { ITypingState } from './typingState'
import { TypingState } from './typingState'
import type { Table } from 'dexie'
import Dexie from 'dexie'

class RecordDB extends Dexie {
  wordRecords!: Table<IWordRecord, number>
  wordProgress!: Table<IWordProgress, number>
  dailyRecords!: Table<IDailyRecord, number>
  typingStates!: Table<ITypingState, number>

  constructor() {
    super('RecordDB')
    this.version(7).stores({
      wordRecords: '++id,word,timeStamp,dict,[dict+timeStamp]',
      wordProgress: '++id,word,dict,masteryLevel,nextReviewTime,lastReviewTime,[dict+word],[dict+masteryLevel]',
      dailyRecords: '++id,dict,date,[dict+date]',
      typingStates: '++id,dict,date,[dict+date]',
    })
  }
}

export const db = new RecordDB()

db.wordRecords.mapToClass(WordRecord)
db.wordProgress.mapToClass(WordProgress)
db.dailyRecords.mapToClass(DailyRecord)
db.typingStates.mapToClass(TypingState)

export const resolveDictId = (dictId: string) => {
  if (dictId) return dictId
  if (typeof window === 'undefined') return dictId
  const utoolsDb = window.utools?.db
  if (!utoolsDb) return dictId
  const doc = utoolsDb.get('currentWordBank')
  return typeof doc?.data === 'string' && doc.data ? doc.data : dictId
}

export type WordKeyLogger = {
  letterTimeArray: number[]
  letterMistake: LetterMistakes
}

/**
 * 旧的 useSaveLearningRecord 已删除
 * 原因：不再需要区分学习会话，learningRecords 表已被删除
 */
export function useSaveLearningRecord() {
  return () => Promise.resolve()
}

export type { ITypingState }
