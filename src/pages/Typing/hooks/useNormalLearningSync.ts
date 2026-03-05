import { useEffect, useRef } from 'react'
import type { WordWithIndex } from '@/typings'
import type { TypingAction } from '../store'

interface UseNormalLearningSyncProps {
  isActive: boolean
  words: WordWithIndex[] | undefined
  isTyping: boolean
  dispatch: React.Dispatch<TypingAction>
}

export function useNormalLearningSync({
  isActive,
  words,
  isTyping,
  dispatch,
}: UseNormalLearningSyncProps) {
  const wordsContentRef = useRef<string>('')

  useEffect(() => {
    if (!isActive) return
    if (words === undefined) return
    if (!dispatch) return

    const wordNames = words.map((w) => w.name).join(',')
    const prevWordNames = wordsContentRef.current

    if (wordNames === prevWordNames) return
    if (isTyping && prevWordNames !== '') return

    const isFirstLoad = prevWordNames === ''
    wordsContentRef.current = wordNames

    dispatch({
      type: TypingStateActionType.SET_WORDS,
      payload: { words },
    })

    if (isFirstLoad) {
      dispatch({
        type: TypingStateActionType.SET_IS_TYPING,
        payload: true,
      })
    }
  }, [isActive, words, dispatch, isTyping])
}
