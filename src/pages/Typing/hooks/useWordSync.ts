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

    const isFirstLoad = prevWordNames === ''
    wordsContentRef.current = wordNames

    // SET_WORDS 只负责设置词库，不再隐式改动 isTyping
    dispatch({
      type: TypingStateActionType.SET_WORDS,
      payload: { words },
    })

    // 只有首次加载词库时才自动开始打字；后续词库更新（如复习词到期）不打断用户
    if (isFirstLoad) {
      dispatch({
        type: TypingStateActionType.SET_IS_TYPING,
        payload: true,
      })
    }
  }, [words, dispatch, isTyping])
}
