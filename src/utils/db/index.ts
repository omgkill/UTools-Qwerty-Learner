import type { IDailyRecord, IDictProgress, IWordProgress } from './progress'
import { DailyRecord, DictProgress, WordProgress } from './progress'
import type { ILearningRecord, IWordRecord, LetterMistakes } from './record'
import { LearningRecord, WordRecord } from './record'
import type { TypingState } from '@/pages/Typing/store'
import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'
import { currentDictIdAtom } from '@/store'
import { getUtoolsValue, setUtoolsValue } from '@/utils/utools'
import { now } from '@/utils/timeService'
import type { Table } from 'dexie'
import Dexie from 'dexie'
import { useAtomValue } from 'jotai'
import { useCallback, useContext } from 'react'

export type ITypingState = {
  id?: number
  dict: string
  date: string
  isRepeatLearning: boolean
  learningWords: unknown[]
  currentIndex: number
  version?: number
}

class RecordDB extends Dexie {
  wordRecords!: Table<IWordRecord, number>
  learningRecords!: Table<ILearningRecord, number>
  wordProgress!: Table<IWordProgress, number>
  dictProgress!: Table<IDictProgress, number>
  dailyRecords!: Table<IDailyRecord, number>
  typingStates!: Table<ITypingState, number>

  constructor() {
    super('RecordDB')
    this.version(5)
      .stores({
        wordRecords: '++id,word,timeStamp,dict,learning,errorCount,[dict+learning],[dict+timeStamp]',
        learningRecords: '++id,timeStamp,dict,learning,time,[dict+learning]',
        wordProgress: '++id,word,dict,masteryLevel,nextReviewTime,lastReviewTime,[dict+word],[dict+masteryLevel]',
        dictProgress: '++id,dict',
        dailyRecords: '++id,dict,date,[dict+date]',
        typingStates: '++id,dict,date,[dict+date]',
      })
    this.version(4)
      .stores({
        wordRecords: '++id,word,timeStamp,dict,learning,errorCount,[dict+learning],[dict+timeStamp]',
        learningRecords: '++id,timeStamp,dict,learning,time,[dict+learning]',
        wordProgress: '++id,word,dict,masteryLevel,nextReviewTime,lastReviewTime,[dict+word],[dict+masteryLevel]',
        dictProgress: '++id,dict',
        dailyRecords: '++id,dict,date,[dict+date]',
      })
    this.version(3)
      .stores({
        wordRecords: '++id,word,timeStamp,dict,learning,errorCount,[dict+learning]',
        learningRecords: '++id,timeStamp,dict,learning,time,[dict+learning]',
        wordProgress: '++id,word,dict,masteryLevel,nextReviewTime,lastReviewTime,[dict+word],[dict+masteryLevel]',
        dictProgress: '++id,dict',
        dailyRecords: '++id,dict,date,[dict+date]',
      })
      .upgrade((tx) => {
        tx.table('wordProgress').toCollection().modify((record: IWordProgress) => {
          if (record.reps === undefined) {
            record.reps = record.masteryLevel > 0 ? 1 : 0
          }
        })
      })
  }
}

export const db = new RecordDB()

db.wordRecords.mapToClass(WordRecord)
db.learningRecords.mapToClass(LearningRecord)
db.wordProgress.mapToClass(WordProgress)
db.dictProgress.mapToClass(DictProgress)
db.dailyRecords.mapToClass(DailyRecord)

export const resolveDictId = (dictId: string) => {
  if (dictId) return dictId
  if (typeof window === 'undefined') return dictId
  const utoolsDb = window.utools?.db
  if (!utoolsDb) return dictId
  const doc = utoolsDb.get('currentWordBank')
  return typeof doc?.data === 'string' && doc.data ? doc.data : dictId
}

export const BACKUP_META_KEY = 'utools-backup-meta'
export const LOCAL_WRITE_KEY = 'utools-local-write-at'

export type BackupMeta = {
  lastBackupAt: number
  lastBackupOk: boolean
  lastBackupError?: string | null
  lastBackupDurationMs?: number
}

const getBackupMeta = (): BackupMeta => {
  return getUtoolsValue<BackupMeta>(BACKUP_META_KEY, {
    lastBackupAt: 0,
    lastBackupOk: false,
  })
}

const setBackupMeta = (patch: Partial<BackupMeta>) => {
  const next = { ...getBackupMeta(), ...patch }
  setUtoolsValue(BACKUP_META_KEY, next)
}

export const markLocalWrite = () => {
  setUtoolsValue(LOCAL_WRITE_KEY, now())
}

export const recordDataWrite = () => {
  markLocalWrite()
  scheduleUtoolsBackup()
}

let backupTimer: number | null = null
let backupRunning = false

export const scheduleUtoolsBackup = () => {
  if (typeof window === 'undefined') return
  if (!window.utools || !window.exportDatabase2UTools) return
  if (backupTimer) {
    window.clearTimeout(backupTimer)
  }
  backupTimer = window.setTimeout(async () => {
    if (backupRunning) return
    backupRunning = true
    const startAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
    try {
      await window.exportDatabase2UTools?.()
      const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startAt
      setBackupMeta({
        lastBackupAt: now(),
        lastBackupOk: true,
        lastBackupError: null,
        lastBackupDurationMs: duration,
      })
    } catch (e) {
      setBackupMeta({
        lastBackupOk: false,
        lastBackupError: e instanceof Error ? e.message : String(e),
      })
    } finally {
      backupRunning = false
    }
  }, 1500)
}

export function useSaveLearningRecord() {
  const dictID = useAtomValue(currentDictIdAtom)

  const saveLearningRecord = useCallback(
    async (typingState: TypingState) => {
      const resolvedDictId = resolveDictId(dictID)
      if (!resolvedDictId) return
      const {
        statsData: { correctCount, wrongCount, wordCount, correctWordIndexes, wordRecordIds, timerData },
        wordListData: { words },
      } = typingState

      const learningRecord = new LearningRecord(
        resolvedDictId,
        null,
        timerData.time,
        correctCount,
        wrongCount,
        wordCount,
        correctWordIndexes,
        words.length,
        wordRecordIds ?? [],
      )
      try {
        await db.learningRecords.add(learningRecord)
        recordDataWrite()
      } catch (e) {
        console.error('Failed to save learning record:', e)
      }
    },
    [dictID],
  )

  return saveLearningRecord
}

export type WordKeyLogger = {
  letterTimeArray: number[]
  letterMistake: LetterMistakes
}

export function useSaveWordRecord() {
  const dictID = useAtomValue(currentDictIdAtom)

  const { dispatch } = useContext(TypingContext) ?? {}

  const saveWordRecord = useCallback(
    async ({
      word,
      wrongCount,
      letterTimeArray,
      letterMistake,
    }: {
      word: string
      wrongCount: number
      letterTimeArray: number[]
      letterMistake: LetterMistakes
    }): Promise<number> => {
      const resolvedDictId = resolveDictId(dictID)
      if (!resolvedDictId) {
        return -1
      }
      const timing = []
      for (let i = 1; i < letterTimeArray.length; i++) {
        const diff = letterTimeArray[i] - letterTimeArray[i - 1]
        timing.push(diff)
      }

      const wordRecord = new WordRecord(word, resolvedDictId, null, timing, wrongCount, letterMistake)

      let dbID = -1
      try {
        dbID = await db.wordRecords.add(wordRecord)
        recordDataWrite()
      } catch (e) {
        console.error('Failed to save word record:', e)
      }
      if (dispatch && dbID > 0) {
        dispatch({ type: TypingStateActionType.ADD_WORD_RECORD_ID, payload: dbID })
      }
      return dbID
    },
    [dictID, dispatch],
  )

  return saveWordRecord
}
