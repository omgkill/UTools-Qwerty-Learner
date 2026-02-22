import { TypingContext, TypingStateActionType } from '../store'
import { isLegal } from '@/utils'
import { useContext, useEffect } from 'react'

export function useKeyboardStartListener(isTyping: boolean, isLoading: boolean) {
  const { dispatch } = useContext(TypingContext)!

  useEffect(() => {
    if (isTyping) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isLoading && e.key !== 'Enter' && (isLegal(e.key) || e.key === ' ') && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: true })
      }
    }
    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isTyping, isLoading, dispatch])
}
