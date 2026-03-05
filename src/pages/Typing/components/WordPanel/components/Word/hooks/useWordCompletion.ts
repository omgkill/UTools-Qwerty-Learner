import type { Word } from '@/typings'
import type { WordState } from './useWordState'
import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'
import { LearningService } from '@/services'
import { useSaveWordRecord } from '@/utils/db'
import { db } from '@/utils/db'
import { useCallback, useContext, useEffect, useMemo } from 'react'
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
  const learningService = useMemo(() => new LearningService(db), [])

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
          learningService?.updateProgress(word.name, isCorrect, wordState.wrongCount).then((progress) => {
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
                  return learningService?.incrementLearned(dictID)
                } else {
                  return learningService?.incrementReviewed(dictID, isExtraReview)
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
    learningService,
    dictID,
    onFinish,
    isExtraReview,
    isRepeatLearning,
  ])
}
