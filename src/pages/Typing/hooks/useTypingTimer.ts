import { TypingContext, TypingStateActionType } from '../store'
import { useContext, useEffect } from 'react'

export function useTypingTimer(isTyping: boolean) {
  const { dispatch } = useContext(TypingContext)!

  useEffect(() => {
    let intervalId: number
    if (isTyping) {
      intervalId = window.setInterval(() => {
        dispatch({ type: TypingStateActionType.TICK_TIMER })
      }, 1000)
    }
    return () => clearInterval(intervalId)
  }, [isTyping, dispatch])
}
