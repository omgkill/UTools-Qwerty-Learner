import type { Word } from '@/typings'
import type { WordState } from './useWordState'
import { TypingContext, TypingStateActionType, initialState } from '@/pages/Typing/store'
import { useDailyRecord, useWordProgress } from '@/utils/db/useProgress'
import { useSaveWordRecord } from '@/utils/db'
import { useCallback, useContext, useEffect, useRef } from 'react'

export function useWordCompletion(
  word: Word,
  wordState: WordState,
  onFinish: () => void,
  isExtraReview: boolean,
  isRepeatLearning = false,
) {
  const typingContext = useContext(TypingContext)
  const state = typingContext?.state ?? initialState
  const rawDispatch = typingContext?.dispatch
  const dispatch = useCallback(
    (action: Parameters<NonNullable<typeof rawDispatch>>[0]) => {
      if (rawDispatch) {
        rawDispatch(action)
      }
    },
    [rawDispatch],
  )
  const onFinishCalledRef = useRef(false)
  const saveWordRecord = useSaveWordRecord()
  const { updateWordProgress } = useWordProgress()
  const { incrementReviewed, incrementLearned } = useDailyRecord()

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

      const isCorrect = true
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
          updateWordProgress(word.name, isCorrect, wordState.wrongCount).then((progress) => {
            console.log(`[DB] updateWordProgress done in ${performance.now() - startTime}ms`)
            return progress
          }),
        ])
          .then(([, progress]) => {
            if (progress) {
              const isNewWord = progress.reps === 1
              if (isNewWord) {
                return incrementLearned()
              } else {
                return incrementReviewed(isExtraReview)
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
    updateWordProgress,
    incrementLearned,
    incrementReviewed,
    onFinish,
    isExtraReview,
    isRepeatLearning,
  ])
}
