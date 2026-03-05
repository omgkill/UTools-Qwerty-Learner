import type { Word } from '@/typings'
import type { WordState } from './useWordState'
import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'
import { getTodayDate, useSaveWordRecord } from '@/utils/db'
import { MASTERY_LEVELS, WordProgress, getNextReviewTime, updateMasteryLevel } from '@/utils/db/progress'
import { db } from '@/utils/db'
import { getTodayStartTime, now } from '@/utils/timeService'
import { useCallback, useContext, useEffect } from 'react'
import { currentDictIdAtom } from '@/store'
import { useAtomValue } from 'jotai'

const onFinishCalledRef = { current: false }

export function useWordCompletion(
  word: Word,
  wordState: WordState,
  onFinish: () => void,
  isExtraReview: boolean,
  isRepeatLearning = false,
) {
  const typingContext = useContext(TypingContext)
  const rawDispatch = typingContext?.dispatch
  const dispatch = useCallback(
    (action: Parameters<NonNullable<typeof rawDispatch>>[0]) => {
      if (rawDispatch) {
        rawDispatch(action)
      }
    },
    [rawDispatch],
  )
  const dictID = useAtomValue(currentDictIdAtom)

  const saveWordRecord = useSaveWordRecord()

  useEffect(() => {
    onFinishCalledRef.current = false
  }, [word.name])

  useEffect(() => {
    if (wordState.isFinished) {
      if (onFinishCalledRef.current) return
      if (wordState.wordName !== word.name) {
        return
      }
      onFinishCalledRef.current = true

      if (!wordState.hasMadeInputWrong) {
        dispatch({ type: TypingStateActionType.REPORT_CORRECT_WORD })
      }

      const isCorrect = !wordState.hasMadeInputWrong
      const startTime = performance.now()

      if (!isRepeatLearning) {
        Promise.all([
          saveWordRecord({
            word: word.name,
            wrongCount: wordState.wrongCount,
            letterTimeArray: wordState.letterTimeArray,
            letterMistake: wordState.letterMistake,
          }).then((id) => {
            console.log(`[DB] saveWordRecord done in ${performance.now() - startTime}ms, id=${id}`)
            return id
          }),
          updateWordProgress(dictID, word.name, isCorrect, wordState.wrongCount).then((progress) => {
            console.log(`[DB] updateWordProgress done in ${performance.now() - startTime}ms`)
            return progress
          }),
        ])
          .then(([, progress]) => {
            if (progress && dictID) {
              const isNewWord = progress.reps === 1
              // 只有输入正确时才计数
              if (isCorrect) {
                if (isNewWord) {
                  return incrementLearned(dictID)
                } else {
                  return incrementReviewed(dictID, isExtraReview)
                }
              }
            }
          })
          .then(() => {
            console.log(`[DB] All IndexedDB operations done in ${performance.now() - startTime}ms`)
          })
          .catch((e) => console.error('Failed to save word records:', e))
      }

      onFinish()
    }
  }, [
    wordState.isFinished,
    wordState.hasMadeInputWrong,
    wordState.letterTimeArray,
    wordState.letterMistake,
    wordState.wordName,
    wordState.wrongCount,
    word.name,
    dispatch,
    saveWordRecord,
    dictID,
    onFinish,
    isExtraReview,
    isRepeatLearning,
  ])
}

async function updateWordProgress(dictID: string, word: string, isCorrect: boolean, wrongCount: number): Promise<WordProgress | undefined> {
  if (!dictID) return undefined

  const progress = await db.wordProgress
    .where('[dict+word]')
    .equals([dictID, word])
    .first()

  const currentProgress = progress || new WordProgress(word, dictID)
  const { newLevel } = updateMasteryLevel(currentProgress.masteryLevel, isCorrect, wrongCount)

  currentProgress.masteryLevel = newLevel
  currentProgress.nextReviewTime = getNextReviewTime(newLevel)
  currentProgress.lastReviewTime = now()
  currentProgress.reps = (currentProgress.reps || 0) + 1

  if (currentProgress.reps === 1 && !isCorrect) {
    currentProgress.nextReviewTime = getTodayStartTime() + 24 * 60 * 60 * 1000
  }

  if (isCorrect) {
    currentProgress.correctCount++
    currentProgress.streak++
  } else {
    currentProgress.wrongCount++
    currentProgress.streak = 0
  }

  if (progress) {
    await db.wordProgress.update(progress.id || 0, currentProgress)
  } else {
    currentProgress.id = await db.wordProgress.add(currentProgress)
  }

  return currentProgress
}

async function incrementLearned(dictID: string): Promise<void> {
  if (!dictID) return

  const today = getTodayDate()
  let record = await db.dailyRecords.where('[dict+date]').equals([dictID, today]).first()

  if (!record) {
    record = { dict: dictID, date: today, reviewedCount: 0, learnedCount: 0, extraReviewedCount: 0, masteredCount: 0, lastUpdateTime: now() }
    record.id = await db.dailyRecords.add(record)
  } else {
    record.learnedCount++
    record.lastUpdateTime = now()
    await db.dailyRecords.update(record.id, record)
  }
}

async function incrementReviewed(dictID: string, isExtra = false): Promise<void> {
  if (!dictID) return

  const today = getTodayDate()
  let record = await db.dailyRecords.where('[dict+date]').equals([dictID, today]).first()

  if (!record) {
    record = { dict: dictID, date: today, reviewedCount: 0, learnedCount: 0, extraReviewedCount: 0, masteredCount: 0, lastUpdateTime: now() }
    record.id = await db.dailyRecords.add(record)
  } else {
    if (isExtra) {
      record.extraReviewedCount++
    } else {
      record.reviewedCount++
    }
    record.lastUpdateTime = now()
    await db.dailyRecords.update(record.id, record)
  }
}
