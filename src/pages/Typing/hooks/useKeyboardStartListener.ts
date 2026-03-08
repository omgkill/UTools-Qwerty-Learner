import { isLegal } from '@/utils'
import { useEffect } from 'react'
import { useSetAtom } from 'jotai'
import { setIsTypingAtom } from '../store'

export function useKeyboardStartListener(isTyping: boolean, isLoading: boolean) {
  const setIsTyping = useSetAtom(setIsTypingAtom)

  useEffect(() => {
    if (isTyping) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isLoading && e.key !== 'Enter' && (isLegal(e.key) || e.key === ' ') && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setIsTyping(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isTyping, isLoading, setIsTyping])
}
