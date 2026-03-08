import { useTypingTimer } from './useTypingTimer'
import { useKeyboardStartListener } from './useKeyboardStartListener'
import { useTypingHotkeys } from './useTypingHotkeys'
import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect } from 'react'
import {
  isImmersiveModeAtom,
  isTypingAtom,
  setIsTypingAtom,
  toggleImmersiveModeAtom,
} from '../store/atoms/index'

export function useTypingPageBase() {
  const isTyping = useAtomValue(isTypingAtom)
  const isImmersiveMode = useAtomValue(isImmersiveModeAtom)
  const toggleImmersiveMode = useSetAtom(toggleImmersiveModeAtom)
  const setIsTyping = useSetAtom(setIsTypingAtom)

  useTypingTimer(isTyping)
  useKeyboardStartListener(isTyping, false)
  useTypingHotkeys()

  useEffect(() => {
    const handleModeChange = () => {
      const windowMode = window.getMode()
      if (windowMode === 'conceal' || windowMode === 'moyu') {
        toggleImmersiveMode(true)
      } else {
        toggleImmersiveMode(false)
      }
    }

    handleModeChange()
    window.addEventListener('utools-mode-change', handleModeChange)
    return () => {
      window.removeEventListener('utools-mode-change', handleModeChange)
    }
  }, [toggleImmersiveMode])

  useEffect(() => {
    const onBlur = () => {
      setIsTyping(false)
    }
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('blur', onBlur)
    }
  }, [setIsTyping])

  return {
    isTyping,
    isImmersiveMode,
    toggleImmersiveMode,
    setIsTyping,
  }
}
