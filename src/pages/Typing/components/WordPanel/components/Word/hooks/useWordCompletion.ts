import type { WordState } from './useWordState'
import { useWordPanelRuntime } from '../../../runtime'
import type { WordWithIndex } from '@/typings'
import { useEffect, useRef } from 'react'

export function useWordCompletion(
  word: WordWithIndex,
  wordState: WordState,
  onFinish: (params: { isCorrect: boolean; wrongCount: number }) => Promise<void> | void,
  isRepeatLearning = false,
) {
  const { actions } = useWordPanelRuntime()
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
        actions.reportCorrectWord(word.index)
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
    word.index,
    actions,
    onFinish,
    isRepeatLearning,
  ])
}
