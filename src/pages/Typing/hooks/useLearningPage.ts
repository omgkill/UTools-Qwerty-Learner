import { useTypingInitializer } from './useTypingInitializer'
import { useTypingPageBase } from './useTypingPageBase'
import type { WordBank } from '@/types'

export type UseLearningPageResult = {
  isInitialized: boolean
  currentWordBank: WordBank | null
  isTyping: boolean
  isImmersiveMode: boolean
}

export function useLearningPage(): UseLearningPageResult {
  const { isInitialized, currentWordBank } = useTypingInitializer()
  const { isTyping, isImmersiveMode } = useTypingPageBase()

  return {
    isInitialized,
    currentWordBank,
    isTyping,
    isImmersiveMode,
  }
}
