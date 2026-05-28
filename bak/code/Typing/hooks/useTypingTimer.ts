import { useEffect } from 'react'
import { useSetAtom } from 'jotai'
import { tickTimerAtom } from '../store'

export function useTypingTimer(isTyping: boolean) {
  const tickTimer = useSetAtom(tickTimerAtom)

  useEffect(() => {
    let intervalId: number
    if (isTyping) {
      intervalId = window.setInterval(() => {
        tickTimer()
      }, 1000)
    }
    return () => clearInterval(intervalId)
  }, [isTyping, tickTimer])
}
