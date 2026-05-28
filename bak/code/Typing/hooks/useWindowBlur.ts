import { useEffect } from 'react'
import { useSetAtom } from 'jotai'
import { setIsTypingAtom } from '../store'

export function useWindowBlur() {
  const setIsTyping = useSetAtom(setIsTypingAtom)

  useEffect(() => {
    const onBlur = () => setIsTyping(false)
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [setIsTyping])
}
