import { TypingContext, TypingStateActionType } from '../store'
import { isLegal } from '@/utils'
import { useContext, useEffect } from 'react'

export function useKeyboardStartListener(isTyping: boolean, isLoading: boolean) {
  const typingContext = useContext(TypingContext)
  const dispatch = typingContext?.dispatch

  useEffect(() => {
    if (isTyping) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (!dispatch) return
      if (!isLoading && e.key !== 'Enter' && (isLegal(e.key) || e.key === ' ') && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: true })
      }
    }
    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isTyping, isLoading, dispatch])
}
