import type { WordState } from './useWordState'
import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'
import type { Word } from '@/typings'
import { useCallback, useContext, useEffect, useRef } from 'react'

export function useWordCompletion(
  word: Word,
  wordState: WordState,
  onFinish: (params: { isCorrect: boolean; wrongCount: number }) => Promise<void> | void,
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
  const onFinishCalledRef = useRef(false)

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
        dispatch({ type: TypingStateActionType.REPORT_CORRECT_WORD, payload: word.index })
      }

      const isCorrect = !wordState.hasMadeInputWrong
      void onFinish({
        isCorrect: isRepeatLearning ? true : isCorrect,
        wrongCount: wordState.wrongCount,
      })
    }
  }, [
    wordState.isFinished,
    wordState.hasMadeInputWrong,
    wordState.wordName,
    wordState.wrongCount,
    word.name,
    dispatch,
    onFinish,
    isRepeatLearning,
  ])
}
