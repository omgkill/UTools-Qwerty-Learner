import type { Word } from '@/typings'
import type { WordState } from './useWordState'
import { TypingContext, TypingStateActionType, initialState } from '@/pages/Typing/store'
import { useDailyRecord, useWordProgress } from '@/utils/db/useProgress'
import { useSaveWordRecord } from '@/utils/db'
import { useMixPanelWordLogUploader } from '@/utils'
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
  const wordLogUploader = useMixPanelWordLogUploader(state)
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

      dispatch({ type: TypingStateActionType.SET_IS_SAVING_RECORD, payload: true })

      wordLogUploader({
        headword: word.name,
        timeStart: wordState.startTime,
        timeEnd: wordState.endTime,
        countInput: wordState.correctCount + wordState.wrongCount,
        countCorrect: wordState.correctCount,
        countTypo: wordState.wrongCount,
      })
      saveWordRecord({
        word: word.name,
        wrongCount: wordState.wrongCount,
        letterTimeArray: wordState.letterTimeArray,
        letterMistake: wordState.letterMistake,
      })

      const isCorrect = !wordState.hasMadeInputWrong
      updateWordProgress(word.name, isCorrect, wordState.wrongCount)
        .then((progress) => {
          // 重复学习模式不计入统计
          if (isRepeatLearning) {
            return
          }
          const isNewWord = progress.reps === 1
          if (isNewWord) {
            incrementLearned()
          } else {
            incrementReviewed(isExtraReview)
          }
        })
        .catch((e) => {
          console.error('Failed to update word progress:', e)
        })

      onFinish()
    }
  }, [
    wordState.isFinished,
    wordState.hasMadeInputWrong,
    wordState.startTime,
    wordState.endTime,
    wordState.correctCount,
    wordState.wrongCount,
    wordState.letterTimeArray,
    wordState.letterMistake,
    wordState.wordName,
    word.name,
    dispatch,
    wordLogUploader,
    saveWordRecord,
    updateWordProgress,
    incrementLearned,
    incrementReviewed,
    onFinish,
    isExtraReview,
    isRepeatLearning,
  ])
}
