import type { WordWithIndex } from '@/typings'
import { TypingContext, TypingStateActionType } from '../store'
import { useContext, useEffect, useRef } from 'react'

export function useWordSync(
  words: WordWithIndex[] | undefined,
  isTyping: boolean,
  skipSync: boolean = false,
  initialIndex?: number
) {
  const typingContext = useContext(TypingContext)
  const dispatch = typingContext?.dispatch
  const wordsContentRef = useRef<string>('')
  const initialIndexRef = useRef<number | undefined>(undefined)
  const hasPendingInitialIndexRef = useRef(false)

  useEffect(() => {
    if (initialIndex !== undefined) {
      initialIndexRef.current = initialIndex
      hasPendingInitialIndexRef.current = true
    }
  }, [initialIndex])

  useEffect(() => {
    if (words === undefined) return
    if (!dispatch) return

    const wordNames = words.map((w) => w.name).join(',')
    const prevWordNames = wordsContentRef.current

    const hasPendingInitialIndex = hasPendingInitialIndexRef.current

    if (skipSync && !hasPendingInitialIndex) return

    if (wordNames === prevWordNames && !hasPendingInitialIndex) return
    if (isTyping && prevWordNames !== '' && !hasPendingInitialIndex) return

    const isFirstLoad = prevWordNames === ''
    wordsContentRef.current = wordNames

    const indexToUse = initialIndexRef.current
    initialIndexRef.current = undefined
    hasPendingInitialIndexRef.current = false

    dispatch({
      type: TypingStateActionType.SET_WORDS,
      payload: { words, initialIndex: indexToUse },
    })

    if (isFirstLoad) {
      dispatch({
        type: TypingStateActionType.SET_IS_TYPING,
        payload: true,
      })
    }
  }, [words, dispatch, isTyping, skipSync])
}
