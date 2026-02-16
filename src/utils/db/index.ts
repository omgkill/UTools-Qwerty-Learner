import type { IDailyRecord, IDictProgress, IWordProgress } from './progress'
import { DailyRecord, DictProgress, WordProgress } from './progress'
import type { IChapterRecord, IWordRecord, LetterMistakes } from './record'
import { ChapterRecord, WordRecord } from './record'
import type { TypingState } from '@/pages/Typing/store'
import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'
import { currentDictIdAtom } from '@/store'
import type { Table } from 'dexie'
import Dexie from 'dexie'
import { useAtomValue } from 'jotai'
import { useCallback, useContext } from 'react'

class RecordDB extends Dexie {
  wordRecords!: Table<IWordRecord, number>
  chapterRecords!: Table<IChapterRecord, number>
  wordProgress!: Table<IWordProgress, number>
  dictProgress!: Table<IDictProgress, number>
  dailyRecords!: Table<IDailyRecord, number>

  constructor() {
    super('RecordDB')
    this.version(3)
      .stores({
        wordRecords: '++id,word,timeStamp,dict,chapter,errorCount,[dict+chapter]',
        chapterRecords: '++id,timeStamp,dict,chapter,time,[dict+chapter]',
        wordProgress: '++id,word,dict,masteryLevel,nextReviewTime,lastReviewTime,[dict+word],[dict+masteryLevel]',
        dictProgress: '++id,dict',
        dailyRecords: '++id,dict,date,[dict+date]',
      })
      .upgrade((tx) => {
        tx.table('wordProgress').toCollection().modify((record: IWordProgress) => {
          if (record.easeFactor === undefined) {
            record.easeFactor = 2.5
          }
          if (record.reps === undefined) {
            record.reps = record.masteryLevel > 0 ? 1 : 0
          }
        })
      })
  }
}

export const db = new RecordDB()

db.wordRecords.mapToClass(WordRecord)
db.chapterRecords.mapToClass(ChapterRecord)
db.wordProgress.mapToClass(WordProgress)
db.dictProgress.mapToClass(DictProgress)
db.dailyRecords.mapToClass(DailyRecord)

export function useSaveChapterRecord() {
  const dictID = useAtomValue(currentDictIdAtom)

  const saveChapterRecord = useCallback(
    (typingState: TypingState) => {
      const {
        chapterData: { correctCount, wrongCount, wordCount, correctWordIndexes, words, wordRecordIds },
        timerData: { time },
      } = typingState

      const chapterRecord = new ChapterRecord(
        dictID,
        null,
        time,
        correctCount,
        wrongCount,
        wordCount,
        correctWordIndexes,
        words.length,
        wordRecordIds ?? [],
      )
      db.chapterRecords.add(chapterRecord)
    },
    [dictID],
  )

  return saveChapterRecord
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
    }) => {
      const timing = []
      for (let i = 1; i < letterTimeArray.length; i++) {
        const diff = letterTimeArray[i] - letterTimeArray[i - 1]
        timing.push(diff)
      }

      const wordRecord = new WordRecord(word, dictID, null, timing, wrongCount, letterMistake)

      let dbID = -1
      try {
        dbID = await db.wordRecords.add(wordRecord)
      } catch (e) {
        console.error(e)
      }
      if (dispatch) {
        dbID > 0 && dispatch({ type: TypingStateActionType.ADD_WORD_RECORD_ID, payload: dbID })
        dispatch({ type: TypingStateActionType.SET_IS_SAVING_RECORD, payload: false })
      }
    },
    [dictID, dispatch],
  )

  return saveWordRecord
}
