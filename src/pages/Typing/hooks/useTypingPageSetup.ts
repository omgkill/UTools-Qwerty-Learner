import { useTypingInitializer } from './useTypingInitializer'
import { useTypingPageBase, type UseTypingPageBaseResult } from './useTypingPageBase'
import type { WordBank } from '@/types'

export interface UseTypingPageSetupResult extends UseTypingPageBaseResult {
  isInitialized: boolean
  currentWordBank: WordBank | null
}

/**
 * 统一的学习页面初始化 hook
 * 整合了所有页面共用的初始化逻辑
 */
export function useTypingPageSetup(): UseTypingPageSetupResult {
  const { isInitialized, currentWordBank } = useTypingInitializer()
  const pageBase = useTypingPageBase()

  return {
    ...pageBase,
    isInitialized,
    currentWordBank,
  }
}