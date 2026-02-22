import type { WordWithIndex } from '@/typings'
import { TypingContext, TypingStateActionType } from '../store'
import { useContext, useEffect, useRef } from 'react'

export function useWordSync(words: WordWithIndex[] | undefined, isTyping: boolean) {
  const typingContext = useContext(TypingContext)
  const dispatch = typingContext?.dispatch
  const wordsContentRef = useRef<string>('')

  useEffect(() => {
    if (words === undefined) return

    if (!dispatch) return
    const wordNames = words.map((w) => w.name).join(',')
    const prevWordNames = wordsContentRef.current

    if (wordNames === prevWordNames) return
    if (isTyping && prevWordNames !== '') return

    wordsContentRef.current = wordNames
    dispatch({
      type: TypingStateActionType.SET_WORDS,
      payload: { words },
    })
  }, [words, dispatch, isTyping])
}
