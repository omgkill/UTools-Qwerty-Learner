import type { WordState } from './useWordState'
import { useCompleteWord } from '@/features/typing/presentation/hooks/useCompleteWord'
import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'
import type { Word } from '@/typings'
import { useCallback, useContext, useEffect } from 'react'

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
  const completeWord = useCompleteWord()

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
        completeWord({
          word: word.name,
          isCorrect,
          wrongCount: wordState.wrongCount,
          isExtraReview,
        })
          .then(() => {
            console.log(`[DB] completeWord done in ${performance.now() - startTime}ms`)
          })
          .catch((e) => console.error('Failed to save word records:', e))
      }

      onFinish()
    }
  }, [
    wordState.isFinished,
    wordState.hasMadeInputWrong,
    wordState.wordName,
    wordState.wrongCount,
    word.name,
    dispatch,
    completeWord,
    onFinish,
    isExtraReview,
    isRepeatLearning,
  ])
}
